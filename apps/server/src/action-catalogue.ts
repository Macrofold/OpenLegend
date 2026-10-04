import { namePhrase } from '@open-legend/language';
import { worldSupport, worldPosition } from '@open-legend/domain';
import { itemFor, custodian } from '@open-legend/domain';
import { inventoryItemView } from './inventory-view.js';
import type { RequestScope } from './authority.js';
import { pickupActions } from './item-actions.js';
import { statusEffectActions } from './status-effect-actions.js';
import { availableStrikes } from '@open-legend/domain';
import { attributeDefinition, readAttribute } from '@open-legend/domain';
import { canSpeak } from '@open-legend/domain';
import { NATIVE_PREPARATIONS } from '@open-legend/domain';
import { bodyPolicy } from '@open-legend/domain';
import { fireCareOptions } from './fire-actions.js';
import { handoverOptions } from './handover-actions.js';
import type {
  ActionCatalogue,
  ActionContext,
  CatalogueAction,
  CommandInput,
} from '@open-legend/protocol';
import type { WorldService } from './world-service.js';
import { ACTION_DESCRIPTIONS, describeCommand, commandFacts } from './action-descriptions.js';

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
  if (context.itemId) {
    const item = itemFor(service.world, context.itemId);
    if (!item || custodian(service.world, item.id) !== scope.actorId)
      throw new Error('This possession is unavailable.');
    const observation = service.observe(scope.actorId, { includeMemories: false })!;
    const projected = inventoryItemView(service, scope, item),
      options = [...projected.actions];
    if (context.destinationId) {
      const destination = service.world.entities[context.destinationId];
      if (!destination || custodian(service.world, destination.id) !== scope.actorId)
        throw new Error('This destination is unavailable.');
      const command: CommandInput = {
        type: 'transfer-item',
        itemId: item.id,
        targetId: destination.id,
        quantity: context.quantity ?? item.quantity,
        expectedRevision: item.revision,
        placementRevision: item.placementRevision,
        targetRevision: destination.inventoryRevision ?? 0,
      };
      const result = controlling
        ? service.previewCommand(command, scope.actorId)
        : controlUnavailable;
      options.push({
        id: `transfer-${item.id}-${destination.id}`,
        label: `Move to ${destination.name}`,
        command,
        enabled: result.ok,
        ...(!result.ok ? { reason: result.message } : {}),
      });
    }
    return {
      revision: service.version,
      actions: options.map((option) => ({
        id: option.id,
        label: option.label,
        category: 'Possessions',
        description: describeCommand(option.command, observation, service.world),
        facts: commandFacts(option.command, observation),
        keywords: [projected.name],
        enabled: option.enabled,
        ...(option.reason ? { reason: option.reason } : {}),
        intent: { kind: 'command', command: option.command },
      })),
    };
  }
  const observation = service.observe(scope.actorId, { includeMemories: false })!;
  const world = service.world;
  const targets = observation.visibleEntities.filter((entity) => entity.id !== scope.actorId);
  const selected =
    context.targetId === scope.actorId
      ? world.entities[scope.actorId]
      : targets.find((entity) => entity.id === context.targetId);
  if (context.targetId && !selected) throw new Error('That target is no longer in view.');
  const actions: CatalogueAction[] = [];
  const add = (
    id: string,
    label: string,
    category: string,
    command: CommandInput,
    keywords: string[] = [],
    targetId?: string,
    provided?: { availability: { ok: boolean; message: string }; description: string },
  ) => {
    // Ground exposes destination movement only. Personal work belongs to self;
    // resource and social actions belong to the specifically selected target.
    if (!selected && command.type !== 'move') return;
    if (selected && targetId !== selected.id && !(selected.id === scope.actorId && !targetId))
      return;
    const result = controlling
      ? (provided?.availability ?? service.previewCommand(command, scope.actorId))
      : controlUnavailable;
    actions.push({
      id,
      label,
      category,
      description: provided?.description ?? describeCommand(command, observation, world),
      facts: commandFacts(command, observation),
      keywords,
      ...(targetId ? { targetId } : {}),
      enabled: result.ok,
      ...(!result.ok ? { reason: result.message } : {}),
      intent: { kind: 'command', command },
    });
  };
  if (selected?.actor?.alive && selected.id !== scope.actorId)
    add(
      `follow:${selected.id}`,
      `Follow ${selected.name}`,
      'Movement',
      { type: 'follow', targetId: selected.id },
      ['follow', 'accompany'],
      selected.id,
    );
  const missing = (
    family: keyof typeof ACTION_DESCRIPTIONS,
    label: string,
    category: string,
    reason: string,
    id: string = family,
    targetId?: string,
  ) => {
    const personalFamily = [
      'cancel',
      'status-effect',
      'recover',
      'equip',
      'eat',
      'cook',
      'craft',
    ].includes(family);
    if (!selected) return;
    if (targetId !== selected.id && !(selected.id === scope.actorId && !targetId && personalFamily))
      return;
    actions.push({
      id,
      label,
      category,
      description: ACTION_DESCRIPTIONS[family],
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
  if (position)
    add(
      'move',
      'Walk here',
      'Movement',
      { type: 'move', position },
      ['move', 'go', 'travel'],
      selected?.id,
    );
  else missing('move', 'Walk', 'Movement', 'Right-click a destination in the world.');
  if (selected)
    for (const option of statusEffectActions(world, world.entities[scope.actorId]!, selected))
      add(option.id, option.label, 'States', option.command, [], selected.id);
  const self = world.entities[scope.actorId]!.actor!;
  if (
    self.action ||
    self.agency.suspended ||
    self.agency.plan?.status === 'active' ||
    self.agency.plan?.status === 'blocked'
  )
    add('cancel', 'Stop current work', 'Movement', { type: 'cancel' }, ['cancel', 'stop']);
  else missing('cancel', 'Stop current work', 'Movement', 'No work to stop.');
  const recovery = bodyPolicy(world)?.recovery;
  if (recovery) add('recover', recovery.label, 'Body', { type: 'recover' }, ['recovery']);
  for (const key of Object.keys(NATIVE_PREPARATIONS) as Array<keyof typeof NATIVE_PREPARATIONS>) {
    add(
      `prepare-${key}`,
      key === 'fiber' ? 'Clean fibers' : 'Twist cord',
      'Create',
      { type: 'prepare', preparation: key },
      ['prepare', 'craft', key, 'binding'],
    );
  }

  for (const target of selected ? [selected] : []) {
    for (const option of pickupActions(world, observation.actor, target, (command) =>
      service.previewCommand(command, scope.actorId),
    ))
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
      for (const definition of availableStrikes(service.world, scope.actorId, target))
        add(
          `${definition.id}-${target.id}`,
          definition.label,
          'Combat',
          {
            type: 'strike',
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
    if (target.resource)
      add(
        `gather-${target.id}`,
        `Gather ${target.name}`,
        'Gather',
        { type: 'gather', targetId: target.id },
        [world.itemDefinitions[target.resource.definitionId]!.name, 'collect'],
        target.id,
      );
    if (target.animal && target.actor?.alive)
      add(
        `hunt-${target.id}`,
        `Hunt ${target.name}`,
        'Hunt',
        { type: 'hunt', targetId: target.id },
        ['shoot', 'attack', 'ranged'],
        target.id,
      );
    if (target.remains)
      add(
        `harvest-${target.id}`,
        `Harvest ${target.name}`,
        'Gather',
        { type: 'harvest', targetId: target.id },
        ['butcher', 'meat', 'remains'],
        target.id,
      );
    if (canSpeak(target) && target.actor?.alive) {
      // Opening a composer is read-only, including while paused or AI is unconfigured.
      actions.push({
        id: `talk-${target.id}`,
        label: `Talk to ${namePhrase(target, 'definite')}`,
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

  const fires = (selected ? [selected] : targets).filter((entity) => entity.heat);
  for (const item of observation.inventory) {
    const definition = world.itemDefinitions[item.definitionId]!;
    if (definition.launcher || definition.melee || definition.gatheringTool)
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
        `${bodyPolicy(world)!.consumption!.label} · ${definition.name}`,
        'Body',
        { type: 'eat', itemId: item.id },
        [],
      );
    if (item.definitionId === 'raw_meat') {
      for (const fire of fires)
        add(
          `cook-${item.id}-${fire.id}`,
          `Cook meat at ${fire.name}`,
          'Create',
          { type: 'cook', itemId: item.id, targetId: fire.id },
          ['food', 'meal', 'fire'],
          fire.id,
        );
      if (!fires.length)
        missing(
          'cook',
          'Cook meat',
          'Create',
          'A visible lit campfire is needed.',
          `cook-${item.id}`,
        );
    }
  }
  // Offers and replies involve only the selected person; the recipient alone can accept.
  for (const option of selected?.actor
    ? handoverOptions(world, scope.actorId, observation.inventory, selected)
    : [])
    add(
      option.id,
      option.label,
      'Social',
      option.command,
      ['offer', 'give', 'share'],
      selected!.id,
    );
  // Fire care binds the exact selected fire; one of light/put out applies to its current state.
  for (const option of selected?.heat
    ? fireCareOptions(world, observation.inventory, selected)
    : [])
    add(option.id, option.label, 'Survival', option.command, ['fire'], selected!.id);
  for (const recipe of observation.knownRecipes)
    add(
      `craft-${recipe.id}`,
      `Craft ${recipe.name}`,
      'Create',
      { type: 'craft', recipeId: recipe.id },
      [recipe.description, recipe.sourceCandidate.family.id, 'make'],
    );

  if (selected?.heat && !observation.inventory.some((item) => item.definitionId === 'raw_meat'))
    missing(
      'cook',
      `Cook meat at ${selected.name}`,
      'Create',
      'Carry raw meat to cook.',
      'cook',
      selected.id,
    );
  if (selected?.kind === 'npc' && selected.actor?.alive && !observation.knownRecipes.length)
    missing(
      'teach',
      `Teach ${selected.name} a technique`,
      'Social',
      'Learn a recipe first.',
      'teach',
      selected.id,
    );

  // Missing prerequisites must not erase an entire supported action family.
  const family = (
    prefix: keyof typeof ACTION_DESCRIPTIONS,
    label: string,
    category: string,
    reason: string,
  ) => {
    if (!actions.some((action) => action.id.startsWith(`${prefix}-`)))
      missing(prefix, label, category, reason);
  };
  family('gather', 'Gather resources', 'Gather', 'Move within sight of a resource.');
  family('hunt', 'Hunt an animal', 'Hunt', 'Move within sight of a living animal.');
  family('harvest', 'Harvest remains', 'Gather', 'Find animal remains to harvest.');
  family('equip', 'Equip a tool', 'Equipment', 'Carry a supported tool or weapon.');
  const consumption = bodyPolicy(world)?.consumption;
  if (consumption) family('eat', consumption.label, 'Body', consumption.unavailableText);
  family('cook', 'Cook meat', 'Create', 'Carry raw meat and find a lit campfire.');
  family(
    'tend-fire',
    'Tend a campfire',
    'Survival',
    'Select a campfire to light, fuel or put out.',
  );
  family('craft', 'Craft a known recipe', 'Create', 'Invent or learn a recipe first.');
  family('teach', 'Teach a technique', 'Social', 'Learn a recipe and find a nearby listener.');
  family('talk', 'Talk to someone', 'Social', 'Move within sight of a living person.');
  return { revision: service.version, actions };
}
