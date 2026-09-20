import { NATIVE_PREPARATIONS } from '@open-legend/domain';
import type {
  ActionCatalogue,
  ActionContext,
  CatalogueAction,
  CommandInput,
} from '@open-legend/protocol';
import type { WorldService } from './world-service.js';
import { ACTION_DESCRIPTIONS, describeCommand } from './action-descriptions.js';

/** Complete finite catalogue of learned techniques, possessions and perceived targets.
 * Queried only while browsing, not on every simulation tick. Previewing uses the
 * same rules as execution; its disposable effects/receipts never enter the save.
 */
export function actionCatalogue(service: WorldService, context: ActionContext): ActionCatalogue {
  const observation = service.observe('player')!;
  const world = service.world;
  const targets = observation.visibleEntities.filter((entity) => entity.id !== 'player');
  const selected =
    context.targetId === 'player'
      ? world.entities['player']
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
  ) => {
    // Ground exposes destination movement only. Personal work belongs to self;
    // resource and social actions belong to the specifically selected target.
    if (!selected && command.type !== 'move') return;
    if (selected && targetId !== selected.id && !(selected.id === 'player' && !targetId)) return;
    const result = service.previewCommand(command);
    actions.push({
      id,
      label,
      category,
      description: describeCommand(command, observation),
      keywords,
      ...(targetId ? { targetId } : {}),
      enabled: result.ok,
      ...(!result.ok ? { reason: result.message } : {}),
      intent: { kind: 'command', command },
    });
  };
  const missing = (
    family: keyof typeof ACTION_DESCRIPTIONS,
    label: string,
    category: string,
    reason: string,
    id: string = family,
    targetId?: string,
  ) => {
    const personalFamily = ['cancel', 'rest', 'recover', 'equip', 'eat', 'cook', 'craft'].includes(
      family,
    );
    if (!selected) return;
    if (targetId !== selected.id && !(selected.id === 'player' && !targetId && personalFamily))
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
  const position = selected?.position ?? context.position;
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
  add('rest', 'Rest', 'Survival', { type: 'rest' }, ['sleep', 'energy']);
  if (world.entities['player']!.actor!.action)
    add('cancel', 'Stop current work', 'Movement', { type: 'cancel' }, ['cancel', 'stop']);
  else missing('cancel', 'Stop current work', 'Movement', 'No work to stop.');
  add('recover', 'Recover at camp', 'Survival', { type: 'recover' }, ['revive', 'recovery']);
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
    if (target.resource)
      add(
        `gather-${target.id}`,
        `Gather ${target.name}`,
        'Gather',
        { type: 'gather', targetId: target.id },
        [world.itemDefinitions[target.resource.definitionId]!.name, 'collect'],
        target.id,
      );
    if (target.animal?.alive)
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
    if (target.kind === 'npc' && target.actor?.alive) {
      // Opening a composer is read-only, including while paused or AI is unconfigured.
      actions.push({
        id: `talk-${target.id}`,
        label: `Talk to ${target.name}`,
        category: 'Social',
        description: `Open a conversation with ${target.name}. Ask about their experiences, discuss a plan, or offer a suggestion. You can edit your message before sending it.`,
        keywords: ['chat', 'speak', 'conversation'],
        targetId: target.id,
        enabled: true,
        intent: { kind: 'compose', mode: 'chat', npcId: target.id },
      });
      for (const recipe of observation.knownRecipes)
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
    if (definition.launcher)
      add(
        `equip-${item.id}`,
        `Equip ${definition.name}`,
        'Equipment',
        { type: 'equip', itemId: item.id },
        ['weapon', 'launcher'],
      );
    if (definition.nutrition)
      add(
        `eat-${item.id}`,
        `Eat ${definition.name}`,
        'Survival',
        { type: 'eat', itemId: item.id },
        ['food', 'meal'],
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
  for (const recipe of observation.knownRecipes)
    add(
      `craft-${recipe.id}`,
      `Craft ${recipe.name}`,
      'Create',
      { type: 'craft', recipeId: recipe.id },
      [recipe.description, recipe.output.kind, 'make'],
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
  family('equip', 'Equip a launcher', 'Equipment', 'Craft or acquire a ranged tool.');
  family('eat', 'Eat food', 'Survival', 'Gather or cook edible food.');
  family('cook', 'Cook meat', 'Create', 'Carry raw meat and find a lit campfire.');
  family('craft', 'Craft a known recipe', 'Create', 'Invent or learn a recipe first.');
  family('teach', 'Teach a technique', 'Social', 'Learn a recipe and find a nearby listener.');
  family('talk', 'Talk to someone', 'Social', 'Move within sight of a living person.');
  return { revision: service.version, actions };
}
