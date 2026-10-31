import { selectedExpressions } from '@open-legend/domain';
import { setImmediate as yieldScan } from 'node:timers/promises';
import { constructionHelpPlans } from './construction.js';
import { knownCeasefireConsequence } from '@open-legend/domain';
import { contributionWithdrawals } from './handover-actions.js';
import { prepareNativeInventoryActions } from '@open-legend/domain';
import { prepareManufactureChoices } from '@open-legend/domain';
import { recipeMechanicalPin } from '@open-legend/domain';
import { mealChoiceForItem } from '@open-legend/domain';
import { entityGet } from '@open-legend/domain';
import { nativeCommandKind } from './native-command-kind.js';
import {
  canonicalJson,
  nativeCommandSupported,
  preferredTargetEquipment,
  equippedTargetAction,
  reincarnationPolicy,
  replacementRest,
  installedActionMeaning,
  installedActionMeanings,
  rangedTargetAllowed,
  rangedPolicy,
  selectedContextActions,
  encounterPreferenceBinding,
  personalEncounter,
  canReachEntity,
  nativeGatherShortcut,
} from '@open-legend/domain';
import {
  isEquipped,
  guardChoiceLabel,
  BASE_GUARD_TEXT,
  rangedChoiceLabel,
  BASE_RANGED_TEXT,
  BASE_OUTING,
  outingInvitationProblem,
  BASE_COMBAT_HELP,
  activityRequestHost,
  activityRequestDescriptors,
  activityRequestChoices,
  observerDescription,
} from '@open-legend/domain';
import { outingActions, cooperationProposals, cooperativePurposeChoice } from './outing-view.js';
import { competenceOptions } from './competence-actions.js';
import { cookingOptions, fishingOptions, fishingTools } from './food-actions.js';
import { namePhrase } from '@open-legend/language';
import {
  accessiblePossession,
  inspectedRecipeRecords,
  worldSupport,
  worldPosition,
  strikeDefinition,
  nativeHuntCatalogueLabel,
  cookingPreparations,
  BASE_FOOD_ACTION_WORDING,
} from '@open-legend/domain';
import { itemFor, custodian } from '@open-legend/domain';
import { inventoryItemChoices } from './inventory-view.js';
import type { RequestScope } from './authority.js';
import { scopeKey } from './authority.js';
import { encounterControlReference, primaryActionReference } from './entity-references.js';
import { pickupActions } from './item-actions.js';
import { statusEffectActions } from './status-effect-actions.js';
import { learnedActivityCandidates } from './activity-context.js';
import { ammoFor, availableStrikes } from '@open-legend/domain';
import { attributeDefinition, readAttribute } from '@open-legend/domain';
import { canSpeak } from '@open-legend/domain';
import { nativeActionIcon } from '@open-legend/domain';
import { bodyPolicy } from '@open-legend/domain';
import { fireCareOptions, hearthPlacementOptions } from './fire-actions.js';
import { gateUseOptions, prepareBoundaryImpactOptions } from './construction.js';
import { handoverOptions } from './handover-actions.js';
import type {
  ActionCatalogue,
  ActionContext,
  CatalogueAction,
  ActionOption,
  CommandInput,
  ApiResult,
} from '@open-legend/protocol';
import type { WorldService } from './world-service.js';
import { ACTION_DESCRIPTIONS, actionDescriptions } from './action-descriptions.js';
import { digest } from './content-digest.js';
import { beginTiming, endTiming, countMetric } from './performance.js';

/** Safe selected-subject failures; other exceptions remain generic at the HTTP boundary. */
export class ActionCatalogueUnavailable extends Error {}

/** The shortcut selected an implicit default, unlike an explicit menu choice.
 * Recheck only at its serialized admission, after recovering any earlier receipt. */
export function primaryActionRefusal(
  service: WorldService,
  input: CommandInput,
  scope: RequestScope,
): ApiResult | undefined {
  // Confirming a lethal review explicitly chooses that bound attack; the native
  // review owner still checks the exact reviewed command, bodies and permission.
  if (!input.primaryAction || input.lethalReviewId) return;
  const stale: ApiResult = {
    ok: false,
    code: 'stale-primary-action',
    message: 'The preferred action for this object changed. Choose it again.',
  };
  let catalogue: ActionCatalogue;
  try {
    catalogue = actionCatalogue(service, { targetId: input.primaryAction.targetId }, scope);
  } catch (error) {
    if (error instanceof ActionCatalogueUnavailable) return stale;
    throw error;
  }
  const action = catalogue.actions.find((entry) => entry.id === catalogue.defaultActionId);
  if (
    action?.id !== input.primaryAction.actionId ||
    catalogue.primaryAction?.reference !== input.primaryAction.reference
  )
    return stale;
  const selected =
    action.intent.kind === 'command'
      ? action.intent.command
      : action.intent.kind === 'compose'
        ? action.intent.preference
        : undefined;
  if (!selected) return stale;
  const { primaryAction: _selection, lethalReviewId: _review, ...command } = input;
  // Compare the wire meaning: optional undefined fields disappear in transport,
  // and object property order must not change an otherwise identical choice.
  if (canonicalJson(command) !== canonicalJson(selected)) return stale;
  if (!action.enabled)
    return {
      ok: false,
      code: 'unavailable',
      message: action.reason ?? 'This action is unavailable now.',
    };
}

// Finite native family adapters remain here; INV-3 owns shared discovery/execution.
// See archive/07-technical-architecture/world-module-runtime.md#7-action-families-and-agency-integration.
/** Complete finite catalogue of learned techniques, possessions and perceived targets.
 * Queried only while browsing, not on every simulation tick. Previewing uses the
 * same rules as execution; its disposable effects/receipts never enter the save.
 */
export function actionCatalogue(
  service: WorldService,
  context: ActionContext,
  scope: RequestScope = service.localScope,
): ActionCatalogue {
  return finishCatalogue(catalogueForActor(service, context, scope, scope.actorId, false));
}

/** Creator inspection keeps the selected body distinct from the principal's native scope. */
export function operatorActionCatalogue(
  service: WorldService,
  context: ActionContext,
  actorId: string,
  scope: RequestScope = service.localScope,
): ActionCatalogue {
  return finishCatalogue(operatorCatalogue(service, context, actorId, scope));
}

function finishCatalogue(scan: Generator<void, ActionCatalogue>): ActionCatalogue {
  let step = scan.next();
  while (!step.done) step = scan.next();
  return step.value;
}

interface DeferredPreviews {
  commands: Map<CommandInput, () => ReturnType<WorldService['previewCommand']>>;
  actions: Map<string, () => ReturnType<WorldService['previewCommand']>>;
  descriptions: Map<CommandInput, () => string>;
  render: Map<CatalogueAction, () => string>;
}
function operatorCatalogue(
  service: WorldService,
  context: ActionContext,
  actorId: string,
  scope: RequestScope,
  deferred?: DeferredPreviews,
) {
  service.assertScope(scope, 'create');
  service.assertScope(scope, 'inspect');
  if (!service.mayInspectPrivate(actorId, scope))
    throw new ActionCatalogueUnavailable('This character is unavailable to the operator.');
  return catalogueForActor(service, context, scope, actorId, true, deferred);
}

/** Browse a bounded window before kernel previews. The permitted descriptor scan
 * remains explicit; unavailable-only windows may be empty with a next cursor. */
export async function operatorActionCataloguePage(
  service: WorldService,
  context: ActionContext,
  actorId: string,
  scope: RequestScope,
  options: { query?: string; cursor?: string; limit?: number; available?: boolean } = {},
) {
  const started = beginTiming();
  try {
    const limit = options.limit ?? 50;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)
      throw new ActionCatalogueUnavailable('Choose an action page size from 1 to 100.');
    const query = options.query?.trim().toLocaleLowerCase();
    const fingerprint = digest({
      revision: service.version,
      world: service.world.id,
      actorId,
      scope: scopeKey(scope),
      context,
      query,
      available: !!options.available,
    });
    let offset = 0;
    if (options.cursor) {
      let cursor: unknown;
      try {
        cursor = JSON.parse(Buffer.from(options.cursor, 'base64url').toString('utf8'));
      } catch {
        throw new ActionCatalogueUnavailable('Refresh this action page.');
      }
      if (
        !Array.isArray(cursor) ||
        cursor[0] !== fingerprint ||
        !Number.isSafeInteger(cursor[1]) ||
        cursor[1] < 0
      )
        throw new ActionCatalogueUnavailable(
          'The native action page changed. Refresh its first page.',
        );
      offset = cursor[1];
    }
    const deferred: DeferredPreviews = {
      commands: new Map(),
      actions: new Map(),
      descriptions: new Map(),
      render: new Map(),
    };
    const revision = service.version;
    const scan = operatorCatalogue(service, context, actorId, scope, deferred);
    const current = () => {
      service.assertScope(scope, 'create');
      service.assertScope(scope, 'inspect');
      if (service.version !== revision || !service.mayInspectPrivate(actorId, scope))
        throw new ActionCatalogueUnavailable(
          'The native action page changed. Refresh its first page.',
        );
    };
    const next = () => {
      const chunk = beginTiming();
      try {
        return scan.next();
      } finally {
        endTiming('actionCatalogue.scanChunk', chunk);
      }
    };
    let step = next();
    while (!step.done) {
      await yieldScan();
      countMetric('actionCatalogue.scanYields');
      current();
      step = next();
    }
    const catalogue = step.value;
    const candidates: CatalogueAction[] = [];
    let searched = 0;
    for (const action of catalogue.actions) {
      if (++searched % 32 === 0) {
        await yieldScan();
        current();
      }
      // Search native labels, keywords and exact bindings. Descriptions and
      // current refusals are projected only after selecting this window.
      if (
        !query ||
        JSON.stringify({
          id: action.id,
          label: action.label,
          keywords: action.keywords,
          intent: action.intent,
        })
          .toLocaleLowerCase()
          .includes(query)
      )
        candidates.push(action);
    }
    candidates.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    countMetric('actionCatalogue.candidates', candidates.length);
    const window = candidates.slice(offset, offset + limit);
    let previewed = 0;
    for (const action of window) {
      if (++previewed % 8 === 0) {
        await yieldScan();
        current();
      }
      const description = deferred.render.get(action);
      if (description) action.description = description();
      const check = deferred.actions.get(action.id);
      if (action.enabled && check) {
        const result = check();
        action.enabled = result.ok;
        if (!result.ok) action.reason = result.message;
      }
    }
    current();
    return {
      items: options.available
        ? window.filter((action) => action.enabled && action.intent.kind === 'command')
        : window,
      ...(offset + limit < candidates.length
        ? {
            nextCursor: Buffer.from(JSON.stringify([fingerprint, offset + limit])).toString(
              'base64url',
            ),
          }
        : {}),
    };
  } finally {
    endTiming('actionCatalogue.page', started);
  }
}

function* catalogueForActor(
  service: WorldService,
  context: ActionContext,
  scope: RequestScope,
  actorId: string,
  operator: boolean,
  deferred?: DeferredPreviews,
): Generator<void, ActionCatalogue> {
  const catalogue = yield* nativeActionCatalogue(
    service,
    context,
    scope,
    actorId,
    operator,
    deferred,
  );
  const policy = service.world.workBatchPolicy;
  const description = (action: CatalogueAction) =>
    deferred?.render.get(action)?.() ?? action.description;
  let projected = 0;
  if (deferred)
    for (const action of catalogue.actions) {
      if (++projected % 32 === 0) yield;
      if (action.intent.kind === 'command') {
        const check = deferred.commands.get(action.intent.command);
        if (check) deferred.actions.set(action.id, check);
        const render = deferred.descriptions.get(action.intent.command);
        if (render) deferred.render.set(action, render);
      }
    }
  for (const action of [...catalogue.actions]) {
    if (++projected % 32 === 0) yield;
    if (action.intent.kind !== 'command') continue;
    const choice = cooperativePurposeChoice(service.world, actorId, action.intent.command);
    if (!choice) continue;
    const id = JSON.stringify(['cooperative-purpose', choice.agreementId, action.id]);
    const check = deferred?.actions.get(action.id);
    if (check) deferred!.actions.set(id, check);
    const derived: CatalogueAction = {
      ...action,
      id,
      intent: { kind: 'command', command: choice.command },
      label: `${choice.label}: ${action.label}`,
      description: `${choice.description} ${action.description}`,
    };
    if (deferred) {
      const render = deferred.render.get(action) ?? (() => action.description);
      deferred.render.set(derived, () => `${choice.description} ${render()}`);
    }
    catalogue.actions.push(derived);
  }
  for (const action of catalogue.actions) {
    if (++projected % 32 === 0) yield;
    if (action.intent.kind !== 'command') continue;
    const command = action.intent.command,
      consequence = knownCeasefireConsequence(
        service.world,
        actorId,
        command.type,
        command.targetId,
      );
    if (consequence) {
      const render = deferred?.render.get(action);
      if (render) deferred!.render.set(action, () => `${render()} ${consequence}`);
      else action.description += ' ' + consequence;
    }
  }
  if (!policy) return catalogue;
  const actions: CatalogueAction[] = [];
  for (const action of catalogue.actions) {
    if (++projected % 32 === 0) yield;
    actions.push(action);
    if (action.intent.kind !== 'command' || action.intent.command.cooperation) continue;
    const command = action.intent.command,
      meal =
        command.type === 'eat' && command.itemId
          ? mealChoiceForItem(service.world, actorId, command.itemId)
          : undefined;
    const selection = meal
      ? meal.selection
      : command.type === 'gather' && policy.commands.includes('gather')
        ? {
            kind: 'gather' as const,
            targetId: command.targetId!,
            ...(command.itemId ? { itemId: command.itemId } : {}),
          }
        : command.type === 'craft' &&
            policy.commands.includes('craft') &&
            service.world.recipes[command.recipeId!]
          ? {
              kind: 'craft' as const,
              recipe: recipeMechanicalPin(service.world.recipes[command.recipeId!]!),
              ...(command.tools ? { tools: command.tools } : {}),
            }
          : undefined;
    if (selection) {
      const derived: CatalogueAction = {
        ...action,
        id: `repeat:${action.id}`,
        label:
          selection.kind === 'meal'
            ? meal!.label
            : `${policy.repeatLabel}: ${selection.kind === 'craft' ? service.world.recipes[selection.recipe.id]!.name : action.label}`,
        description: `${action.description} ${selection.kind === 'meal' ? meal!.description : policy.help}`,
        enabled: operator || service.currentScope(scope, 'play', true),
        reason: undefined,
        intent: { kind: 'work-batch' as const, selection },
      };
      if (deferred)
        deferred.render.set(
          derived,
          () =>
            `${description(action)} ${selection.kind === 'meal' ? meal!.description : policy.help}`,
        );
      actions.push(derived);
    }
  }
  return { ...catalogue, actions };
}
function* nativeActionCatalogue(
  service: WorldService,
  context: ActionContext,
  scope: RequestScope,
  actorId: string,
  operator: boolean,
  deferred?: DeferredPreviews,
): Generator<void, ActionCatalogue> {
  service.assertScope(scope, operator ? 'create' : 'play');
  const controlling = operator || service.currentScope(scope, 'play', true);
  const controlUnavailable = { ok: false, message: 'Take control of your character to act here.' };
  const selectedItem = context.itemId ? itemFor(service.world, context.itemId) : undefined;
  if (
    context.itemId &&
    (!selectedItem || !accessiblePossession(service.world, actorId, selectedItem.id))
  )
    throw new ActionCatalogueUnavailable('This possession is unavailable.');
  const observation = service.observe(actorId, { includeMemories: false })!;
  const descriptions = actionDescriptions(observation, service.world);
  const describe = (command: CommandInput) => {
    const render = () => {
      countMetric('actionCatalogue.descriptions');
      return descriptions.describe(command);
    };
    if (
      deferred &&
      context.catalogue &&
      !context.itemId &&
      !context.recipeId &&
      !context.equipped
    ) {
      deferred.descriptions.set(command, render);
      return '';
    }
    return render();
  };
  const actions: CatalogueAction[] = [];
  const unavailableCategories = new Set<string>();
  // All calls below share this unchanged synchronous world/control read. Reuse
  // each prepared choice's unchanged command object only here. Equivalent commands
  // created separately are checked separately; executing still checks afresh.
  // docs/action-capabilities.md#action-availability-and-temporary-execution
  const previews = new Map<CommandInput, ReturnType<WorldService['previewCommand']>>();
  const preview = (command: CommandInput) => {
    let result = previews.get(command);
    if (!result) {
      const check = () => {
        countMetric('actionCatalogue.previews');
        return operator
          ? service.previewOperatorCommand(command, actorId, scope)
          : service.previewCommand(command, scope);
      };
      if (deferred) {
        let prepared: ReturnType<WorldService['previewCommand']> | undefined;
        deferred.commands.set(command, () => (prepared ??= check()));
        result = { ok: true, code: 'prepared', message: '' };
      } else result = check();
      previews.set(command, result);
    }
    return result;
  };
  const world = service.world;
  const craftCommand = prepareManufactureChoices(world, actorId);
  const itemActions = prepareNativeInventoryActions(world, actorId);
  if (context.recipeId) {
    const recipe = observation.knownRecipes.find((entry) => entry.id === context.recipeId);
    if (!recipe) throw new ActionCatalogueUnavailable('This method is no longer known.');
    const command: CommandInput = craftCommand(recipe);
    const availability = controlling ? preview(command) : controlUnavailable;
    const choices: CatalogueAction[] = nativeCommandSupported(world, 'craft')
      ? [
          {
            id: `craft-${recipe.id}`,
            label: 'Craft one batch',
            category: 'Create',
            icon: nativeActionIcon(command.type),
            description: describe(command),
            facts: descriptions.facts(command),
            keywords: [recipe.name, 'craft'],
            enabled: availability.ok,
            ...(!availability.ok ? { reason: availability.message } : {}),
            intent: { kind: 'command', command },
          },
        ]
      : [];
    return {
      revision: service.version,
      actions: choices,
      categories: choices.length ? ['Create'] : [],
    };
  }
  if (context.equipped) {
    const equipment = preferredTargetEquipment(world, actorId);
    if (!equipment || equipment.id !== context.itemId)
      throw new ActionCatalogueUnavailable('The held item changed. Choose a target again.');
    const target = observation.visibleEntities.find((entry) => entry.id === context.targetId);
    if (!target || target.id === actorId)
      throw new ActionCatalogueUnavailable('That target is no longer in view.');
    const definition = world.itemDefinitions[equipment.definitionId]!;
    const commands: { id: string; label: string; category: string; command: CommandInput }[] = [];
    if (target.actor)
      for (const strike of availableStrikes(world, actorId, target))
        if (strike.weaponItemId === equipment.id)
          commands.push({
            id: `${strike.id}-${target.id}`,
            label: strike.label,
            category: 'Combat',
            command: {
              type: 'strike',
              definitionId: strike.id,
              itemId: equipment.id,
              targetId: target.id,
            },
          });
    // Retain this gesture's established first matching carried-lot choice. A
    // reserved first lot still refuses; selecting another projectile is a new choice.
    const ammunitionId = definition.rangedWeapon
      ? observation.inventory.find(
          (item) =>
            world.itemDefinitions[item.definitionId]?.ammunition?.kind ===
            definition.rangedWeapon!.ammunitionKind,
        )?.id
      : undefined;
    if (target.actor?.alive && definition.rangedWeapon)
      for (const type of ['aim', 'shoot-once'] as const)
        commands.push({
          id: `${type}:${target.id}:${equipment.id}`,
          label: rangedChoiceLabel(
            type,
            observerDescription(world, actorId, target.id),
            definition.name,
          ),
          category: 'Combat',
          command: { type, targetId: target.id, itemId: equipment.id, ammunitionId },
        });
    if (
      target.resource &&
      !target.resource.cast &&
      definition.gatheringTool?.resourceId === target.resource.definitionId
    )
      commands.push({
        id: `gather-${target.id}`,
        label: 'Gather',
        category: 'Gather',
        command: { type: 'gather', targetId: target.id, itemId: equipment.id },
      });
    if (rangedTargetAllowed(world, target) && definition.rangedWeapon)
      commands.push({
        id: `hunt-${target.id}`,
        label: rangedPolicy(world)!.actionLabel,
        category: 'Hunt',
        command: { type: 'hunt', targetId: target.id, itemId: equipment.id, ammunitionId },
      });
    for (const option of competenceOptions(world, actorId, target, [equipment]))
      if (option.command.type === 'practice-shot' && option.command.itemId === equipment.id)
        commands.push({ ...option, category: 'Practice' });
    const selected = equippedTargetAction(
      world,
      target,
      equipment,
      commands.filter((entry) =>
        nativeCommandSupported(world, nativeCommandKind(entry.command.type)),
      ),
    );
    if (!selected) return { revision: service.version, actions: [], categories: [] };
    const availability = controlling ? preview(selected.command) : controlUnavailable;
    return {
      revision: service.version,
      actions: [
        {
          id: selected.id,
          label: selected.label,
          category: selected.category,
          icon: nativeActionIcon(selected.command.type),
          description: describe(selected.command),
          facts: descriptions.facts(selected.command),
          keywords: [],
          targetId: target.id,
          enabled: availability.ok,
          ...(!availability.ok ? { reason: availability.message } : {}),
          intent: { kind: 'command', command: selected.command },
        },
      ],
      categories: [selected.category],
    };
  }
  const possessionAvailability = (option: ActionOption) =>
    option.enabled
      ? preview(option.command)
      : { ok: false, message: option.reason ?? controlUnavailable.message };
  if (selectedItem) {
    const item = selectedItem;
    const projected = inventoryItemChoices(service, scope, item, preview, itemActions, {
      actorId,
      controlling,
    });
    const options = projected.actions
      .filter((option) => !context.inventoryGroup || option.command.type !== 'split-item')
      .map(
        (option): ActionOption =>
          context.inventoryGroup && option.command.type === 'drop'
            ? {
                ...option,
                label: `Drop ${context.quantity ?? item.quantity} ${service.world.itemDefinitions[item.definitionId]!.name}`,
                command: {
                  ...option.command,
                  inventoryGroup: context.inventoryGroup,
                  quantity: context.quantity ?? item.quantity,
                },
              }
            : option,
      );
    if (context.destinationId) {
      const destination = entityGet(service.world.entities, context.destinationId);
      if (!destination || custodian(service.world, destination.id) !== actorId)
        throw new ActionCatalogueUnavailable('This destination is unavailable.');
      const command: CommandInput = {
        type: 'transfer-item',
        itemId: item.id,
        targetId: destination.id,
        quantity: context.quantity ?? item.quantity,
        ...(context.inventoryGroup ? { inventoryGroup: context.inventoryGroup } : {}),
        expectedRevision: item.revision,
        placementRevision: item.placementRevision,
        targetRevision: destination.inventoryRevision ?? 0,
      };
      const result = controlling ? preview(command) : controlUnavailable;
      options.push({
        id: `transfer-${item.id}-${destination.id}`,
        label: `Move to ${destination.name}`,
        command,
        enabled: result.ok,
        ...(!result.ok ? { reason: result.message } : {}),
      });
    }
    actions.push(
      ...options.map((option): CatalogueAction => {
        const availability = possessionAvailability(option);
        return {
          id: option.id,
          label: option.label,
          icon: option.icon ?? nativeActionIcon(option.command.type),
          category: 'Possessions',
          description: option.command.inventoryGroup
            ? `Move ${option.command.quantity} units from this stack.`
            : `${context.inventoryGroup ? `Uses one stack of ${item.quantity} units. ` : ''}${describe(option.command)}`,
          facts: option.command.inventoryGroup ? [] : descriptions.facts(option.command),
          keywords: [service.world.itemDefinitions[item.definitionId]!.name],
          enabled: availability.ok,
          ...(!availability.ok ? { reason: availability.message } : {}),
          intent: { kind: 'command', command: option.command },
        };
      }),
    );
  }
  const itemUses = selectedItem ? [selectedItem] : observation.inventory;
  const targets = observation.visibleEntities.filter((entity) => entity.id !== actorId);
  const targetById = new Map(targets.map((entity) => [entity.id, entity]));
  const selected =
    context.targetId === actorId
      ? entityGet(world.entities, actorId)
      : targetById.get(context.targetId ?? '');
  if (context.targetId && !selected)
    throw new ActionCatalogueUnavailable('That target is no longer in view.');
  const actionTargets = context.catalogue || context.itemId ? targets : selected ? [selected] : [];
  const personal = !!context.catalogue || selected?.id === actorId;
  const sites = selected ? [selected] : context.catalogue || context.itemId ? targets : [];
  const fires = sites.filter((entity) => entity.heat);
  const fishingSources = sites.filter((entity) => entity.resource?.cast);
  const contactExpressions = selectedExpressions(world, observation.actor).filter((d) => d.contact);
  const actionIds = new Set(actions.map((action) => action.id));
  let scanned = 0;
  function* add(
    id: string,
    label: string,
    category: string,
    command: CommandInput,
    keywords: string[] = [],
    targetId?: string,
    provided?: { availability: { ok: boolean; message: string }; description: string },
    icon = nativeActionIcon(command.type),
  ): Generator<void> {
    if (++scanned % 32 === 0) yield;
    if (actionIds.has(id) || !nativeCommandSupported(world, nativeCommandKind(command.type)))
      return;
    // Ground exposes chosen destination movement, including a short evasive step. Personal work belongs to self;
    // resource and social actions belong to the specifically selected target.
    if (context.itemId) {
      if (
        command.itemId !== context.itemId &&
        !(command.type === 'cook' && Object.values(command.inputs ?? {}).includes(context.itemId))
      )
        return;
    } else if (
      !context.catalogue &&
      !selected &&
      command.type !== 'move' &&
      command.type !== 'evade' &&
      command.type !== 'place-hearth'
    )
      return;
    if (
      !context.catalogue &&
      selected &&
      targetId !== selected.id &&
      !(selected.id === actorId && !targetId)
    )
      return;
    const result = controlling ? (provided?.availability ?? preview(command)) : controlUnavailable;
    actionIds.add(id);
    actions.push({
      id,
      label,
      icon,
      category,
      description: provided?.description ?? describe(command),
      facts: descriptions.facts(command),
      keywords,
      ...(targetId ? { targetId } : {}),
      enabled: result.ok,
      ...(!result.ok ? { reason: result.message } : {}),
      intent: { kind: 'command', command },
    });
  }
  for (const shield of (personal || context.itemId || actionTargets.length ? itemUses : []).filter(
    (item) => world.itemDefinitions[item.definitionId]?.contactDefense,
  )) {
    const definition = world.itemDefinitions[shield.definitionId]!;
    if (context.catalogue || selected?.id === actorId || context.itemId)
      yield* add(
        `guard:${shield.id}:facing`,
        guardChoiceLabel(definition.name),
        'Defense',
        {
          type: 'guard',
          itemId: shield.id,
          facing: observation.actor.spatial.heading,
          autoEquip: true,
        },
        BASE_GUARD_TEXT.keywords,
      );
    for (const target of actionTargets.filter((e) => e.actor?.alive))
      yield* add(
        `guard:${shield.id}:${target.id}`,
        guardChoiceLabel(definition.name, target.name),
        'Defense',
        { type: 'guard', itemId: shield.id, targetId: target.id, autoEquip: true },
        BASE_GUARD_TEXT.keywords,
        target.id,
      );
  }
  if (selected?.actor?.alive && selected.id !== actorId)
    yield* add(
      `follow:${selected.id}`,
      `Follow ${selected.name}`,
      'Movement',
      { type: 'follow', targetId: selected.id },
      ['follow', 'accompany'],
      selected.id,
    );
  const includeUnavailableCategory = (
    family: CommandInput['type'] | import('@open-legend/domain').Command['type'] | 'talk',
    category: string,
    targetId?: string,
    itemId?: string,
  ) => {
    if (family !== 'talk' && !nativeCommandSupported(world, nativeCommandKind(family)))
      return false;
    const personalFamily = [
      'cancel',
      'status-effect',
      'recover',
      'equip',
      'eat',
      'cook',
      'craft',
    ].includes(family);
    if (context.itemId) {
      if (itemId !== context.itemId) return false;
    } else if (!context.catalogue && !selected) return false;
    if (
      !context.itemId &&
      !context.catalogue &&
      targetId !== selected?.id &&
      !(selected?.id === actorId && !targetId && personalFamily)
    )
      return false;
    unavailableCategories.add(category);
    return true;
  };
  // These are concrete known uses with missing inputs, not generic family placeholders.
  const missing = (
    family: CommandInput['type'] | import('@open-legend/domain').Command['type'] | 'talk',
    label: string,
    category: string,
    reason: string,
    id: string,
    targetId?: string,
    itemId?: string,
  ) => {
    if (!includeUnavailableCategory(family, category, targetId, itemId)) return;
    actions.push({
      id,
      label,
      category,
      description:
        family === 'talk'
          ? ACTION_DESCRIPTIONS[family]!
          : (installedActionMeaning(world, nativeCommandKind(family))?.description ??
            ACTION_DESCRIPTIONS[family] ??
            'Choose a supported action.'),
      keywords: [],
      ...(targetId ? { targetId } : {}),
      enabled: false,
      reason,
      intent: { kind: 'unavailable' },
    });
  };
  const position = selected
    ? worldSupport(selected)
      ? { ...worldPosition(selected), surfaceId: worldSupport(selected)! }
      : undefined
    : context.position;
  // Evasion remains a native capability. Deliberate menu browsing is not its
  // player interaction; a future quick control will use the same native admission.
  if (position)
    yield* add(
      'move',
      'Walk here',
      'Movement',
      { type: 'move', position },
      ['move', 'go', 'travel'],
      selected?.id,
    );
  if (!selected && !context.itemId && context.position)
    for (const option of hearthPlacementOptions(world, actorId, context.position))
      yield* add(option.id, option.label, 'Create', option.command, [], undefined, {
        availability: controlling ? preview(option.command) : controlUnavailable,
        description: option.description,
      });
  for (const target of context.catalogue
    ? [observation.actor, ...targets]
    : selected
      ? [selected]
      : [])
    for (const option of statusEffectActions(world, entityGet(world.entities, actorId)!, target))
      yield* add(
        option.id,
        option.label,
        'States',
        option.command,
        [],
        target.id,
        undefined,
        option.icon,
      );
  const self = entityGet(world.entities, actorId)!.actor!;
  if (personal) {
    for (const option of learnedActivityCandidates(
      service,
      actorId,
      undefined,
      0,
      undefined,
      'complete',
    ))
      if (option.command)
        yield* add(option.id, option.description, 'Activities', option.command, [
          'learned',
          'activity',
        ]);
    const reincarnation = reincarnationPolicy(world),
      treatment = reincarnation?.treatment;
    if (reincarnation && treatment && observation.actor.actor?.alive) {
      const rest = targets.find(
        (entity) =>
          replacementRest(world, entity) &&
          Math.hypot(
            worldPosition(entity).x - worldPosition(observation.actor).x,
            worldPosition(entity).y - worldPosition(observation.actor).y,
            worldPosition(entity).z - worldPosition(observation.actor).z,
          ) <= treatment.reach,
      );
      if (rest)
        for (const scar of reincarnation.scars.filter(
          (entry) => observation.actor.actor!.scars?.[entry.id],
        )) {
          const command: CommandInput = { type: 'treat-scar', targetId: rest.id, scarId: scar.id };
          // These are personal choices even though their command names the permitted rest site.
          yield* add(
            `treat-${scar.id}`,
            `${reincarnation.treatmentLabel} ${scar.name}`,
            'Body',
            command,
            ['scar', 'treatment'],
          );
        }
    }
  }
  if (self.action?.ranged?.manual && self.action.targetId)
    yield* add(
      `release-shot:${self.action.id}`,
      BASE_RANGED_TEXT.shootingName,
      'Combat',
      { type: 'release-shot', aimId: self.action.id },
      BASE_RANGED_TEXT.keywords,
      self.action.targetId,
    );
  // Select carried tools/projectiles once for this immutable actor read, before
  // expanding their uses across perceived targets. Item browsing keeps only its tool.
  const tools = actionTargets.some((target) => target.actor)
    ? observation.inventory.filter(
        (item) =>
          (!context.itemId || item.id === context.itemId) &&
          (world.itemDefinitions[item.definitionId]?.rangedWeapon ||
            world.itemDefinitions[item.definitionId]?.melee) &&
          accessiblePossession(world, actorId, item.id),
      )
    : [];
  const rangedWeapons = tools.filter(
    (item) => world.itemDefinitions[item.definitionId]?.rangedWeapon,
  );
  const projectiles = new Map<string, string | undefined>();
  for (const item of tools) {
    const kind = world.itemDefinitions[item.definitionId]?.rangedWeapon?.ammunitionKind;
    if (kind && !projectiles.has(kind)) projectiles.set(kind, ammoFor(world, actorId, kind)?.id);
  }
  if (
    personal &&
    (self.action ||
      self.agency.suspended ||
      self.agency.plan?.status === 'active' ||
      self.agency.plan?.status === 'blocked')
  )
    yield* add('cancel', 'Stop current work', 'Movement', { type: 'cancel' }, ['cancel', 'stop']);
  else includeUnavailableCategory('cancel', 'Movement');
  const recovery = bodyPolicy(world)?.recovery;
  if (personal && recovery)
    yield* add('recover', recovery.label, 'Body', { type: 'recover' }, ['recovery']);
  const impactOptions = prepareBoundaryImpactOptions(world, actorId, itemUses);
  for (const target of actionTargets) {
    for (const option of impactOptions(target))
      yield* add(option.id, option.label, 'Build', option.command, [], target.id, {
        availability: controlling ? preview(option.command) : controlUnavailable,
        description: option.description,
      });
    if (!context.itemId)
      for (const option of gateUseOptions(world, target))
        yield* add(option.id, option.label, 'Build', option.command, [], target.id, {
          availability: controlling ? preview(option.command) : controlUnavailable,
          description: option.description,
        });
    if (context.catalogue && target.actor?.alive)
      yield* add(
        `follow:${target.id}`,
        `Follow ${target.name}`,
        'Movement',
        { type: 'follow', targetId: target.id },
        ['follow', 'accompany'],
        target.id,
      );
    if (context.catalogue && worldSupport(target))
      yield* add(
        `move:${target.id}`,
        `Walk to ${target.name}`,
        'Movement',
        { type: 'move', position: { ...worldPosition(target), surfaceId: worldSupport(target)! } },
        ['move', 'go', 'travel'],
        target.id,
      );
    for (const option of context.itemId
      ? []
      : pickupActions(world, observation.actor, target, preview))
      yield* add(
        option.id,
        option.label,
        'Pick Up',
        option.command,
        ['take', 'collect', option.description],
        target.id,
        { availability: option.availability, description: option.description },
      );
    if (target.actor && target.id !== actorId)
      for (const definition of [
        ...availableStrikes(world, actorId, target),
        ...tools.flatMap((item) => {
          if (isEquipped(world, actorId, item.id)) return [];
          const strike = strikeDefinition(item.definitionId, world, item.id, target);
          return strike ? [strike] : [];
        }),
      ])
        yield* add(
          `${definition.id}-${target.id}${definition.weaponItemId ? `:${definition.weaponItemId}` : ''}`,
          definition.label,
          'Combat',
          {
            type: 'strike',
            autoEquip: true,
            definitionId: definition.id,
            itemId: definition.weaponItemId,
            targetId: target.id,
          },
          ['punch', 'hit', 'melee', 'attack'],
          target.id,
        );

    if (!context.itemId && target.actor?.alive && target.id !== actorId)
      for (const definition of contactExpressions) {
        const command: CommandInput = { type: 'express', verb: definition.id, targetId: target.id };
        yield* add(
          `express:${definition.id}:${target.id}`,
          definition.label,
          'Social',
          command,
          [definition.label],
          target.id,
        );
      }

    if (target.replenisher) {
      const definition = attributeDefinition(world, target.replenisher.attributeId);
      if (
        definition?.reservoir &&
        readAttribute(world, observation.actor, definition) !== undefined
      )
        yield* add(
          `replenish-${target.id}`,
          definition.reservoir.actionLabel,
          'Survival',
          { type: 'replenish', targetId: target.id, attributeId: definition.id },
          [definition.name],
          target.id,
        );
    }
    if (target.resource && !target.resource.cast)
      yield* add(
        `gather-${target.id}`,
        nativeGatherShortcut(world, target.resource.definitionId)?.label ?? `Gather ${target.name}`,
        'Gather',
        { type: 'gather', targetId: target.id },
        [world.itemDefinitions[target.resource.definitionId]!.name, 'collect'],
        target.id,
      );
    if (rangedTargetAllowed(world, target) && target.id !== actorId)
      for (const item of rangedWeapons)
        for (const type of ['aim', 'shoot-once'] as const)
          yield* add(
            `${type}:${target.id}:${item.id}`,
            rangedChoiceLabel(type, target.name, world.itemDefinitions[item.definitionId]!.name),
            'Combat',
            {
              type,
              autoEquip: true,
              targetId: target.id,
              itemId: item.id,
              ammunitionId: projectiles.get(
                world.itemDefinitions[item.definitionId]!.rangedWeapon!.ammunitionKind,
              ),
            },
            BASE_RANGED_TEXT.keywords,
            target.id,
          );
    if (rangedTargetAllowed(world, target) && target.animal) {
      if (!rangedWeapons.length)
        yield* add(
          `hunt-${target.id}`,
          `${rangedPolicy(world)!.actionLabel} ${target.name}`,
          'Hunt',
          { type: 'hunt', autoEquip: true, targetId: target.id },
          ['shoot', 'attack', 'ranged'],
          target.id,
        );
      for (const item of rangedWeapons)
        yield* add(
          `hunt-${target.id}:${item.id}`,
          `${rangedPolicy(world)!.actionLabel} ${target.name} with ${world.itemDefinitions[item.definitionId]!.name}`,
          'Hunt',
          {
            type: 'hunt',
            autoEquip: true,
            targetId: target.id,
            itemId: item.id,
            ammunitionId: projectiles.get(
              world.itemDefinitions[item.definitionId]!.rangedWeapon!.ammunitionKind,
            ),
          },
          ['shoot', 'attack', 'ranged'],
          target.id,
        );
    }
    if (target.remains)
      yield* add(
        `harvest-${target.id}`,
        `Harvest ${target.name}`,
        'Gather',
        { type: 'harvest', targetId: target.id },
        ['butcher', 'meat', 'remains'],
        target.id,
      );
    if (!context.itemId && target.id !== actorId && canSpeak(target) && target.actor?.alive) {
      const binding = encounterPreferenceBinding(world, actorId, target.id),
        controls = bodyPolicy(world)?.combat?.encounters?.controls,
        pair = personalEncounter(world, actorId, target.id),
        preferSpeech = !!(
          pair &&
          (pair.own ||
            Object.keys(pair.active).length ||
            (pair.incomingUntil ?? -1) > world.simTime)
        );
      const preference: CommandInput | undefined = binding
        ? {
            type: 'encounter-preference',
            targetId: target.id,
            encounterPreference: {
              operation: 'speak',
              reference: encounterControlReference(scopeKey(scope), 'speak', binding),
            },
          }
        : undefined;
      // Opening remains read-only; the preference changes only after its exact
      // authenticated command receipt. No speech or physical cancellation occurs.
      actions.push({
        id: `talk-${target.id}`,
        label:
          preferSpeech && controls
            ? controls.speak.label
            : `Speak to ${namePhrase(target, 'definite')}`,
        category: 'Social',
        description:
          preferSpeech && controls
            ? controls.speak.description
            : `Open a conversation with ${namePhrase(target, 'definite')}. Ask about their experiences, discuss a plan, or offer a suggestion. You can edit your message before sending it.`,
        keywords: ['chat', 'speak', 'conversation'],
        targetId: target.id,
        enabled: true,
        intent: {
          kind: 'compose',
          mode: 'chat',
          npcId: target.id,
          ...(preference ? { preference } : {}),
        },
      });
      const control = controls?.stop;
      if (binding && control && pair?.own) {
        const command: CommandInput = {
          type: 'encounter-preference',
          targetId: target.id,
          encounterPreference: {
            operation: 'stop',
            reference: encounterControlReference(scopeKey(scope), 'stop', binding),
          },
        };
        yield* add(`stop-offense-${target.id}`, control.label, 'Combat', command, [], target.id, {
          availability: controlling ? preview(command) : controlUnavailable,
          description: control.description,
        });
      }
      for (const recipe of target.actor.controller === 'npc' ? observation.knownRecipes : [])
        yield* add(
          `teach-${target.id}-${recipe.id}`,
          `Teach ${target.name}: ${recipe.name}`,
          'Social',
          { type: 'teach', targetId: target.id, recipeId: recipe.id },
          ['learn', recipe.description],
          target.id,
        );
    }
  }

  for (const item of personal || context.itemId ? itemUses : []) {
    const definition = world.itemDefinitions[item.definitionId]!;
    if (context.catalogue) {
      const projected = inventoryItemChoices(service, scope, item, preview, itemActions, {
        actorId,
        controlling,
      });
      for (const option of projected.actions)
        if (!actionIds.has(option.id))
          yield* add(
            option.id,
            `${option.label} (${definition.name})`,
            'Possessions',
            option.command,
            [definition.name],
            undefined,
            {
              availability: possessionAvailability(option),
              description: describe(option.command),
            },
          );
    }
    if (definition.equipment && (context.catalogue || context.itemId))
      yield* add(
        `equip-${item.id}`,
        `Equip ${definition.name}`,
        'Equipment',
        { type: 'equip', itemId: item.id },
        ['weapon', 'ranged weapon'],
      );
    if (definition.nutrition && bodyPolicy(world)?.consumption)
      yield* add(
        `eat-${item.id}`,
        `${bodyPolicy(world)!.consumption!.label} ${definition.name}`,
        'Body',
        { type: 'eat', itemId: item.id },
        [],
      );
  }
  if (!context.itemId && activityRequestHost(world, BASE_OUTING.family, actorId)) {
    const cooperativeRequests = activityRequestDescriptors(world, actorId).filter(
      (request) =>
        request.presentation?.kind === 'cooperation-proposal' &&
        request.id !== BASE_COMBAT_HELP.family,
    );
    const cooperativeTargets = new Map<string, Set<string>>();
    for (const choice of activityRequestChoices(world, actorId, observation).choices) {
      for (const family of choice.requestIds ?? []) {
        const request = cooperativeRequests.find((entry) => entry.id === family);
        if (!request || !choice.roles.includes(request.presentation!.target)) continue;
        let targets = cooperativeTargets.get(family);
        if (!targets) cooperativeTargets.set(family, (targets = new Set()));
        targets.add(choice.id);
      }
    }
    const helpingPlans = constructionHelpPlans(
      world,
      actorId,
      observation.inventory,
      service.store.authority!.constructionPermissions(world.id),
      observation.visibleEntities,
    );
    for (const target of actionTargets) {
      if (!BASE_OUTING.participant(target) || target.id === actorId) continue;
      for (const request of cooperativeRequests) {
        const field = request.presentation!.target;
        if (!cooperativeTargets.get(request.id)?.has(target.id)) continue;
        actions.push({
          id: `activity:${request.id}:${target.id}`,
          label: request.label,
          category: 'Social',
          description: request.description,
          keywords: [],
          targetId: target.id,
          enabled: controlling,
          intent: { kind: 'activity', family: request.id, arguments: { [field]: target.id } },
        });
      }
      for (const choice of cooperationProposals(world, actorId, target.id, helpingPlans))
        yield* add(choice.id, choice.label, 'Social', choice.command, [], target.id, {
          description: choice.description,
          availability: preview(choice.command),
        });
      const helpRefused = outingInvitationProblem(world, actorId, target.id, 'combat-help');
      if (activityRequestHost(world, BASE_COMBAT_HELP.family, actorId))
        actions.push({
          id: `invite-help:${target.id}`,
          label: BASE_COMBAT_HELP.label,
          category: 'Social',
          description: BASE_COMBAT_HELP.description,
          keywords: [
            ...BASE_COMBAT_HELP.keywords,
            observerDescription(world, actorId, target.id, 'definite'),
          ],
          targetId: target.id,
          enabled: controlling && !helpRefused,
          ...(helpRefused ? { reason: helpRefused.message } : {}),
          intent: {
            kind: 'activity',
            family: BASE_COMBAT_HELP.family,
            arguments: { recipientId: target.id },
          },
        });
      const refused = outingInvitationProblem(world, actorId, target.id);
      actions.push({
        id: `invite-travel:${target.id}`,
        label: BASE_OUTING.label,
        category: 'Social',
        description: BASE_OUTING.description,
        keywords: ['travel', 'company', observerDescription(world, actorId, target.id, 'definite')],
        targetId: target.id,
        enabled: controlling && !refused,
        ...(refused ? { reason: refused.message } : {}),
        intent: {
          kind: 'activity',
          family: BASE_OUTING.family,
          arguments: { recipientId: target.id },
        },
      });
    }
    for (const choice of personal ? outingActions(world, actorId) : [])
      yield* add(
        choice.id,
        choice.label,
        'Social',
        choice.command,
        ['outing', 'travel'],
        undefined,
        {
          description: choice.description,
          availability: choice.received
            ? {
                ok: true,
                message:
                  'Attempt using your last received terms; current conditions are checked when you act.',
              }
            : preview(choice.command),
        },
      );
  }
  const preparations =
    fires.length || selectedItem
      ? cookingPreparations(world, observation.inventory, context.itemId)
      : [];
  const offeredPreparations = new Set<string>();
  if (selectedItem && !fires.length)
    for (const preparation of preparations)
      missing(
        'cook',
        preparation.definition.name,
        'Create',
        BASE_FOOD_ACTION_WORDING.cookingHeatRequiredText,
        `cook-${preparation.definition.id}`,
        undefined,
        selectedItem.id,
      );
  for (const fire of fires)
    for (const option of cookingOptions(preparations, fire.id)) {
      yield* add(
        option.id,
        `${option.label} at ${fire.name}`,
        'Create',
        option.command,
        ['food', 'meal', option.definition.description],
        fire.id,
      );
      if (actionIds.has(option.id)) offeredPreparations.add(option.definition.id);
    }
  const castTools = fishingSources.length ? fishingTools(world, itemUses) : new Map();
  for (const source of fishingSources)
    for (const option of fishingOptions(world, castTools, source))
      yield* add(
        option.id,
        option.label,
        'Gather',
        option.command,
        [source.name, option.description],
        source.id,
      );

  for (const option of contributionWithdrawals(
    world,
    actorId,
    service.store.authority!.constructionPermissions(world.id),
  ))
    yield* add(option.id, option.label, 'Social', option.command, [option.description]);
  // Each offer/reply binds its exact perceived person; the recipient alone can accept.
  for (const target of actionTargets) {
    for (const option of competenceOptions(world, actorId, target, itemUses))
      yield* add(
        option.id,
        option.label,
        target.practiceTarget ? 'Practice' : 'Social',
        option.command,
        [option.description],
        target.id,
      );
    for (const option of target.actor
      ? handoverOptions(
          world,
          actorId,
          itemUses,
          target,
          context.catalogue || context.itemId
            ? { maxLots: itemUses.length, includeNested: true }
            : {},
        )
      : [])
      yield* add(
        option.id,
        option.label,
        'Social',
        option.command,
        ['offer', 'give', 'share'],
        target.id,
        {
          availability: option.received
            ? {
                ok: true,
                message:
                  'Attempt your last received terms; current conditions are checked when you act.',
              }
            : preview(option.command),
          description: option.description,
        },
      );
    // Fire care binds the exact selected fire; one of light/put out applies to its current state.
    for (const option of target.heat
      ? fireCareOptions(world, itemUses, target, { eachLot: !!context.catalogue })
      : [])
      yield* add(option.id, option.label, 'Survival', option.command, ['fire'], target.id);
  }
  for (const { recipe, command, item } of context.catalogue || context.itemId || selected
    ? inspectedRecipeRecords(world, actorId)
    : [])
    yield* add(
      `learn-record-${item.id}`,
      `Learn ${recipe.name}`,
      'Knowledge',
      command,
      ['read', 'learn', recipe.name],
      item.ownerId,
    );
  for (const recipe of personal ? observation.knownRecipes : [])
    yield* add(`craft-${recipe.id}`, `Craft ${recipe.name}`, 'Create', craftCommand(recipe), [
      recipe.description,
      recipe.source.kind === 'family' ? recipe.source.candidate.family.id : recipe.name,
      'make',
    ]);

  if (selected?.heat)
    for (const preparation of Object.values(world.foodPreparations))
      if (!offeredPreparations.has(preparation.id))
        missing(
          'cook',
          `${preparation.name} at ${selected.name}`,
          'Create',
          `Carry the exact ingredients: ${preparation.inputs.map((input) => `${input.quantity} ${world.itemDefinitions[input.definitionId]?.name ?? 'ingredient'}`).join(', ')}.`,
          `cook-${preparation.id}`,
          selected.id,
        );
  if (selected?.resource?.cast && !actions.some((action) => action.id.startsWith('fish-')))
    missing(
      'fish',
      BASE_FOOD_ACTION_WORDING.fishingHereLabel,
      'Gather',
      world.castDefinitions[selected.resource.cast.definitionId]!.toolRequiredText,
      `fish-${selected.id}`,
      selected.id,
    );
  if (selected?.kind === 'npc' && selected.actor?.alive && !observation.knownRecipes.length)
    includeUnavailableCategory('teach', 'Social', selected.id);

  // Keep permitted categories visible without inventing an action to fill them.
  includeUnavailableCategory('equip', 'Equipment');
  if (bodyPolicy(world)?.consumption) includeUnavailableCategory('eat', 'Body');
  for (const [command, meaning] of installedActionMeanings(world)) {
    if (meaning.fallback) includeUnavailableCategory(command, meaning.fallback.category);
  }
  includeUnavailableCategory('talk', 'Social');
  // Prepare once per explicit catalogue request, never per frame or per offer.
  // The world ranks permitted exact choices; ordinary command dispatch still admits
  // the selected binding and obtains any required lethal confirmation.
  const present = selectedContextActions(world, actorId, selected?.id);
  let preferred: CatalogueAction | undefined;
  let preferredFacts: CatalogueAction['facts'];
  for (const action of actions) {
    if (++scanned % 32 === 0) yield;
    const intent = action.intent;
    const strikeTarget =
      intent.kind === 'command' && intent.command.type === 'strike'
        ? targetById.get(intent.command.targetId ?? '')
        : undefined;
    const strike =
      intent.kind === 'command' && intent.command.type === 'strike'
        ? strikeDefinition(intent.command.definitionId, world, intent.command.itemId, strikeTarget)
        : undefined;
    const presentation = present({
      ...(intent.kind === 'command'
        ? {
            command: nativeCommandKind(intent.command.type),
            definitionId: intent.command.definitionId,
            itemId: intent.command.itemId,
            ammoItemId: intent.command.ammunitionId,
          }
        : {}),
      speech: intent.kind === 'compose' && intent.mode === 'chat',
      label: action.label,
      facts: action.facts,
      approach: !!(
        strike?.autoMoveToRange &&
        strikeTarget &&
        !canReachEntity(
          world,
          observation.actor,
          strikeTarget,
          strike.approachRange ?? strike.range,
        )
      ),
    });
    if (presentation.label) action.label = presentation.label;
    action.priority = presentation.priority;
    if (
      selected &&
      presentation.primary &&
      (!preferred ||
        (action.priority ?? 0) > (preferred.priority ?? 0) ||
        (action.priority === preferred.priority && action.enabled && !preferred.enabled))
    ) {
      preferred = action;
      preferredFacts = presentation.bindingFacts;
    }
  }
  // Keep the menu's first concrete choice identical to the direct shortcut even
  // when equally ranked tools have different alphabetical labels.
  if (preferred) preferred.priority = (preferred.priority ?? 0) + 1;
  return {
    revision: service.version,
    actions,
    ...(preferred ? { defaultActionId: preferred.id } : {}),
    ...(preferred && selected
      ? {
          primaryAction: {
            targetId: selected.id,
            actionId: preferred.id,
            reference: primaryActionReference(
              scopeKey(scope),
              observation.actor,
              selected,
              encounterPreferenceBinding(world, actorId, selected.id),
              preferred,
              preferredFacts,
            ),
          },
        }
      : {}),
    categories: [
      ...new Set([...actions.map((action) => action.category), ...unavailableCategories]),
    ],
  };
}
