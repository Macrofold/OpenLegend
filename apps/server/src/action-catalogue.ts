import { nativeCommandKind } from './native-command-kind.js';
import {
  canonicalJson,
  nativeCommandSupported,
  installedActionMeaning,
  installedActionMeanings,
  rangedTargetAllowed,
  rangedPolicy,
  selectedContextActions,
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
  observerDescription,
} from '@open-legend/domain';
import { outingActions } from './outing-view.js';
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
import { pickupActions } from './item-actions.js';
import { statusEffectActions } from './status-effect-actions.js';
import { ammoFor, availableStrikes } from '@open-legend/domain';
import { attributeDefinition, readAttribute } from '@open-legend/domain';
import { canSpeak } from '@open-legend/domain';
import { nativePreparationOptions, nativeActionIcon } from '@open-legend/domain';
import { bodyPolicy } from '@open-legend/domain';
import { fireCareOptions } from './fire-actions.js';
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
import { awarenessBindsSubject } from './entity-references.js';

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
  if (action?.id !== input.primaryAction.actionId || action.intent.kind !== 'command') return stale;
  const { primaryAction: _selection, lethalReviewId: _review, ...command } = input;
  // Compare the wire meaning: optional undefined fields disappear in transport,
  // and object property order must not change an otherwise identical choice.
  if (canonicalJson(command) !== canonicalJson(action.intent.command)) return stale;
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
  service.assertScope(scope);
  const controlling = service.currentScope(scope, 'play', true);
  const controlUnavailable = { ok: false, message: 'Take control of your character to act here.' };
  const selectedItem = context.itemId ? itemFor(service.world, context.itemId) : undefined;
  if (
    context.itemId &&
    (!selectedItem || !accessiblePossession(service.world, scope.actorId, selectedItem.id))
  )
    throw new ActionCatalogueUnavailable('This possession is unavailable.');
  const observation = service.observe(scope.actorId, { includeMemories: false })!;
  const descriptions = actionDescriptions(observation, service.world);
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
      result = service.previewCommand(command, scope.actorId);
      previews.set(command, result);
    }
    return result;
  };
  const possessionAvailability = (option: ActionOption) =>
    option.enabled
      ? preview(option.command)
      : { ok: false, message: option.reason ?? controlUnavailable.message };
  if (selectedItem) {
    const item = selectedItem;
    const projected = inventoryItemChoices(service, scope, item, preview);
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
      const destination = service.world.entities[context.destinationId];
      if (!destination || custodian(service.world, destination.id) !== scope.actorId)
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
            : `${context.inventoryGroup ? `Uses one stack of ${item.quantity} units. ` : ''}${descriptions.describe(option.command)}`,
          facts: option.command.inventoryGroup ? [] : descriptions.facts(option.command),
          keywords: [service.world.itemDefinitions[item.definitionId]!.name],
          enabled: availability.ok,
          ...(!availability.ok ? { reason: availability.message } : {}),
          intent: { kind: 'command', command: option.command },
        };
      }),
    );
  }
  const world = service.world;
  const itemUses = selectedItem ? [selectedItem] : observation.inventory;
  const targets = observation.visibleEntities.filter((entity) => entity.id !== scope.actorId);
  const selected =
    context.targetId === scope.actorId
      ? world.entities[scope.actorId]
      : targets.find((entity) => entity.id === context.targetId);
  if (context.targetId && !selected)
    throw new ActionCatalogueUnavailable('That target is no longer in view.');
  const actionTargets = context.catalogue || context.itemId ? targets : selected ? [selected] : [];
  const personal = !!context.catalogue || selected?.id === scope.actorId;
  const sites = selected ? [selected] : context.catalogue || context.itemId ? targets : [];
  const fires = sites.filter((entity) => entity.heat);
  const fishingSources = sites.filter((entity) => entity.resource?.cast);
  const actionIds = new Set(actions.map((action) => action.id));
  const add = (
    id: string,
    label: string,
    category: string,
    command: CommandInput,
    keywords: string[] = [],
    targetId?: string,
    provided?: { availability: { ok: boolean; message: string }; description: string },
    icon = nativeActionIcon(command.type),
  ) => {
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
      command.type !== 'evade'
    )
      return;
    if (
      !context.catalogue &&
      selected &&
      targetId !== selected.id &&
      !(selected.id === scope.actorId && !targetId)
    )
      return;
    const result = controlling ? (provided?.availability ?? preview(command)) : controlUnavailable;
    actionIds.add(id);
    actions.push({
      id,
      label,
      icon,
      category,
      description: provided?.description ?? descriptions.describe(command),
      facts: descriptions.facts(command),
      keywords,
      ...(targetId ? { targetId } : {}),
      enabled: result.ok,
      ...(!result.ok ? { reason: result.message } : {}),
      intent: { kind: 'command', command },
    });
  };
  for (const shield of (personal || context.itemId || actionTargets.length ? itemUses : []).filter(
    (item) => world.itemDefinitions[item.definitionId]?.contactDefense,
  )) {
    const definition = world.itemDefinitions[shield.definitionId]!;
    if (context.catalogue || selected?.id === scope.actorId || context.itemId)
      add(
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
      add(
        `guard:${shield.id}:${target.id}`,
        guardChoiceLabel(definition.name, target.name),
        'Defense',
        { type: 'guard', itemId: shield.id, targetId: target.id, autoEquip: true },
        BASE_GUARD_TEXT.keywords,
        target.id,
      );
  }
  if (selected?.actor?.alive && selected.id !== scope.actorId)
    add(
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
      !(selected?.id === scope.actorId && !targetId && personalFamily)
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
    add(
      'move',
      'Walk here',
      'Movement',
      { type: 'move', position },
      ['move', 'go', 'travel'],
      selected?.id,
    );
  for (const target of context.catalogue
    ? [observation.actor, ...targets]
    : selected
      ? [selected]
      : [])
    for (const option of statusEffectActions(world, world.entities[scope.actorId]!, target))
      add(option.id, option.label, 'States', option.command, [], target.id, undefined, option.icon);
  const self = world.entities[scope.actorId]!.actor!;
  if (self.action?.ranged?.manual && self.action.targetId)
    add(
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
          (world.itemDefinitions[item.definitionId]?.launcher ||
            world.itemDefinitions[item.definitionId]?.melee) &&
          accessiblePossession(world, scope.actorId, item.id),
      )
    : [];
  const launchers = tools.filter((item) => world.itemDefinitions[item.definitionId]?.launcher);
  const projectiles = new Map<string, string | undefined>();
  for (const item of tools) {
    const kind = world.itemDefinitions[item.definitionId]?.launcher?.ammunitionKind;
    if (kind && !projectiles.has(kind))
      projectiles.set(kind, ammoFor(world, scope.actorId, kind)?.id);
  }
  if (
    personal &&
    (self.action ||
      self.agency.suspended ||
      self.agency.plan?.status === 'active' ||
      self.agency.plan?.status === 'blocked')
  )
    add('cancel', 'Stop current work', 'Movement', { type: 'cancel' }, ['cancel', 'stop']);
  else includeUnavailableCategory('cancel', 'Movement');
  const recovery = bodyPolicy(world)?.recovery;
  if (personal && recovery)
    add('recover', recovery.label, 'Body', { type: 'recover' }, ['recovery']);
  for (const { key, label } of personal ? nativePreparationOptions(world) : []) {
    add(`prepare-${key}`, label, 'Create', { type: 'prepare', preparation: key }, [
      'prepare',
      'craft',
      key,
      'binding',
    ]);
  }

  for (const target of actionTargets) {
    if (context.catalogue && target.actor?.alive)
      add(
        `follow:${target.id}`,
        `Follow ${target.name}`,
        'Movement',
        { type: 'follow', targetId: target.id },
        ['follow', 'accompany'],
        target.id,
      );
    if (context.catalogue && worldSupport(target))
      add(
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
      add(
        option.id,
        option.label,
        'Pick Up',
        option.command,
        ['take', 'collect', option.description],
        target.id,
        { availability: option.availability, description: option.description },
      );
    if (target.actor && target.id !== scope.actorId)
      for (const definition of [
        ...availableStrikes(world, scope.actorId, target),
        ...tools.flatMap((item) => {
          if (isEquipped(world, scope.actorId, item.id)) return [];
          const strike = strikeDefinition(item.definitionId, world, item.id, target);
          return strike ? [strike] : [];
        }),
      ])
        add(
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

    if (target.replenisher) {
      const definition = attributeDefinition(world, target.replenisher.attributeId);
      if (
        definition?.reservoir &&
        readAttribute(observation.actor.actor!, definition) !== undefined
      )
        add(
          `replenish-${target.id}`,
          definition.reservoir.actionLabel,
          'Survival',
          { type: 'replenish', targetId: target.id, attributeId: definition.id },
          [definition.name],
          target.id,
        );
    }
    if (target.resource && !target.resource.cast)
      add(
        `gather-${target.id}`,
        nativeGatherShortcut(world, target.resource.definitionId)?.label ?? `Gather ${target.name}`,
        'Gather',
        { type: 'gather', targetId: target.id },
        [world.itemDefinitions[target.resource.definitionId]!.name, 'collect'],
        target.id,
      );
    if (rangedTargetAllowed(world, target) && target.id !== scope.actorId)
      for (const item of launchers)
        for (const type of ['aim', 'shoot-once'] as const)
          add(
            `${type}:${target.id}:${item.id}`,
            rangedChoiceLabel(type, target.name, world.itemDefinitions[item.definitionId]!.name),
            'Combat',
            {
              type,
              autoEquip: true,
              targetId: target.id,
              itemId: item.id,
              ammunitionId: projectiles.get(
                world.itemDefinitions[item.definitionId]!.launcher!.ammunitionKind,
              ),
            },
            BASE_RANGED_TEXT.keywords,
            target.id,
          );
    if (rangedTargetAllowed(world, target) && target.animal) {
      if (!launchers.length)
        add(
          `hunt-${target.id}`,
          `${rangedPolicy(world)!.actionLabel} ${target.name}`,
          'Hunt',
          { type: 'hunt', autoEquip: true, targetId: target.id },
          ['shoot', 'attack', 'ranged'],
          target.id,
        );
      for (const item of launchers)
        add(
          `hunt-${target.id}:${item.id}`,
          `${rangedPolicy(world)!.actionLabel} ${target.name} with ${world.itemDefinitions[item.definitionId]!.name}`,
          'Hunt',
          {
            type: 'hunt',
            autoEquip: true,
            targetId: target.id,
            itemId: item.id,
            ammunitionId: projectiles.get(
              world.itemDefinitions[item.definitionId]!.launcher!.ammunitionKind,
            ),
          },
          ['shoot', 'attack', 'ranged'],
          target.id,
        );
    }
    if (target.remains)
      add(
        `harvest-${target.id}`,
        `Harvest ${target.name}`,
        'Gather',
        { type: 'harvest', targetId: target.id },
        ['butcher', 'meat', 'remains'],
        target.id,
      );
    if (!context.itemId && target.id !== scope.actorId && canSpeak(target) && target.actor?.alive) {
      // Opening a composer is read-only, including while paused or AI is unconfigured.
      actions.push({
        id: `talk-${target.id}`,
        label: `Speak to ${namePhrase(target, 'definite')}`,
        category: 'Social',
        description: `Open a conversation with ${namePhrase(target, 'definite')}. Ask about their experiences, discuss a plan, or offer a suggestion. You can edit your message before sending it.`,
        keywords: ['chat', 'speak', 'conversation'],
        targetId: target.id,
        enabled: true,
        intent: { kind: 'compose', mode: 'chat', npcId: target.id },
      });
      for (const recipe of target.actor.controller === 'npc' ? observation.knownRecipes : [])
        add(
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
      const projected = inventoryItemChoices(service, scope, item, preview);
      for (const option of projected.actions)
        if (!actionIds.has(option.id))
          add(
            option.id,
            `${option.label} (${definition.name})`,
            'Possessions',
            option.command,
            [definition.name],
            undefined,
            {
              availability: possessionAvailability(option),
              description: descriptions.describe(option.command),
            },
          );
    }
    if (definition.equipment && (context.catalogue || context.itemId))
      add(
        `equip-${item.id}`,
        `Equip ${definition.name}`,
        'Equipment',
        { type: 'equip', itemId: item.id },
        ['weapon', 'launcher'],
      );
    if (definition.nutrition && bodyPolicy(world)?.consumption)
      add(
        `eat-${item.id}`,
        `${bodyPolicy(world)!.consumption!.label} ${definition.name}`,
        'Body',
        { type: 'eat', itemId: item.id },
        [],
      );
  }
  if (!context.itemId && activityRequestHost(world, BASE_OUTING.family)) {
    for (const target of actionTargets) {
      if (!BASE_OUTING.participant(target) || target.id === scope.actorId) continue;
      const helpRefused = outingInvitationProblem(world, scope.actorId, target.id, 'combat-help');
      if (activityRequestHost(world, BASE_COMBAT_HELP.family))
        actions.push({
          id: `invite-help:${target.id}`,
          label: BASE_COMBAT_HELP.label,
          category: 'Social',
          description: BASE_COMBAT_HELP.description,
          keywords: [
            ...BASE_COMBAT_HELP.keywords,
            observerDescription(world, scope.actorId, target.id, 'definite'),
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
      const refused = outingInvitationProblem(world, scope.actorId, target.id);
      actions.push({
        id: `invite-travel:${target.id}`,
        label: BASE_OUTING.label,
        category: 'Social',
        description: BASE_OUTING.description,
        keywords: [
          'travel',
          'company',
          observerDescription(world, scope.actorId, target.id, 'definite'),
        ],
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
    for (const choice of personal ? outingActions(world, scope.actorId) : [])
      add(choice.id, choice.label, 'Social', choice.command, ['outing', 'travel'], undefined, {
        description: choice.description,
        availability: preview(choice.command),
      });
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
      add(
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
      add(
        option.id,
        option.label,
        'Gather',
        option.command,
        [source.name, option.description],
        source.id,
      );

  // Each offer/reply binds its exact perceived person; the recipient alone can accept.
  for (const target of actionTargets) {
    for (const option of competenceOptions(world, scope.actorId, target, itemUses))
      add(
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
          scope.actorId,
          itemUses,
          target,
          context.catalogue || context.itemId
            ? { maxLots: itemUses.length, includeNested: true }
            : {},
        )
      : [])
      add(
        option.id,
        option.label,
        'Social',
        option.command,
        ['offer', 'give', 'share'],
        target.id,
        {
          availability: preview(option.command),
          description: option.description,
        },
      );
    // Fire care binds the exact selected fire; one of light/put out applies to its current state.
    for (const option of target.heat
      ? fireCareOptions(world, itemUses, target, { eachLot: !!context.catalogue })
      : [])
      add(option.id, option.label, 'Survival', option.command, ['fire'], target.id);
  }
  for (const { recipe, command, item } of context.catalogue || context.itemId || selected
    ? inspectedRecipeRecords(world, scope.actorId)
    : [])
    add(
      `learn-record-${item.id}`,
      `Learn ${recipe.name}`,
      'Knowledge',
      command,
      ['read', 'learn', recipe.name],
      item.ownerId,
    );
  for (const recipe of personal ? observation.knownRecipes : [])
    add(
      `craft-${recipe.id}`,
      `Craft ${recipe.name}`,
      'Create',
      { type: 'craft', recipeId: recipe.id },
      [recipe.description, recipe.sourceCandidate.family.id, 'make'],
    );

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
  // Active flight alone cannot identify a shooter the character never witnessed.
  // Reuse the bounded resident evidence tail and its continuous-recognition guard.
  const observedLaunches = new Set<number>();
  if (selected?.actor)
    for (const aware of world.experience?.awareness[scope.actorId] ?? [])
      if (
        aware.eventType === 'shot-released' &&
        aware.sourceId === selected.id &&
        aware.targetId === scope.actorId &&
        awarenessBindsSubject(world, scope.actorId, aware, selected.id)
      )
        observedLaunches.add(aware.at);
  const present = selectedContextActions(world, scope.actorId, selected?.id, observedLaunches);
  let preferred: CatalogueAction | undefined;
  for (const action of actions) {
    const intent = action.intent;
    const presentation = present({
      ...(intent.kind === 'command'
        ? {
            command: nativeCommandKind(intent.command.type),
            definitionId: intent.command.definitionId,
            itemId: intent.command.itemId,
          }
        : {}),
      speech: intent.kind === 'compose' && intent.mode === 'chat',
    });
    action.priority = presentation.priority;
    if (
      selected &&
      presentation.primary &&
      (!preferred ||
        (action.priority ?? 0) > (preferred.priority ?? 0) ||
        (action.priority === preferred.priority && action.enabled && !preferred.enabled))
    )
      preferred = action;
  }
  // Keep the menu's first concrete choice identical to the direct shortcut even
  // when equally ranked tools have different alphabetical labels.
  if (preferred) preferred.priority = (preferred.priority ?? 0) + 1;
  return {
    revision: service.version,
    actions,
    ...(preferred ? { defaultActionId: preferred.id } : {}),
    categories: [
      ...new Set([...actions.map((action) => action.category), ...unavailableCategories]),
    ],
  };
}
