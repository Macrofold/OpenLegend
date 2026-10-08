import type { ItemInstance, NativePreparation, WorldState } from '../../types.js';
import { BASE_FAMILY_FACTS } from './actions.js';
import { NATIVE_PREPARATIONS } from './items.js';

/** Vocabulary belongs to the installed native capability, not to an inventory widget.
 * These adapters describe the bundled native families; they do not install effects. */
export const BASE_WORLD_PRESENTATION: NonNullable<WorldState['presentation']> = {
  worldName: 'The first clearing',
  locationName: 'The first clearing',
  timeLabel: 'Time in the wilderness',
};

export const BASE_COOKING_PRESENTATION = {
  input: BASE_FAMILY_FACTS.cooking.input,
  label: 'Cook one',
  targetLabel: 'Cook meat at',
  familyLabel: 'Cook meat',
  missingInput: 'Carry raw meat to cook.',
  missingTarget: 'A visible lit campfire is needed.',
  unavailable: 'Carry raw meat and find a lit campfire.',
};

export const BASE_ACTION_DESCRIPTIONS = {
  gather:
    'Approach a resource and collect a small batch into your inventory. Supplies at each source are finite.',
  prepare: 'Turn gathered plant material into usable fibers or cord for crafting.',
  craft:
    'Make an item using a technique you know. Materials are consumed when work begins and are not refunded if you stop.',
  equip:
    'Select one individual tool from your inventory. A ranged tool needs compatible ammunition before you can fire.',
  hunt: 'Approach a living animal and attempt one shot with your equipped ranged tool. Each attempt consumes ammunition and can miss. A killed animal leaves harvestable remains.',
  harvest:
    'Use a cutting point to collect the remaining materials from animal remains. Each set of remains can be harvested once.',
  cook: 'Turn one portion of raw meat into cooked food at a lit campfire. The fire must stay lit until the work finishes.',
  'tend-fire':
    'Light a campfire that has fuel laid, add one piece of carried fuel, or put it out. Materials are used only when the work finishes; unburnt fuel stays in a fire that is put out.',
};

const actionIcons: Readonly<Partial<Record<string, string>>> = {
  move: 'action.walk',
  prepare: 'action.craft',
  harvest: 'action.gather',
  cook: 'action.fire',
  'tend-fire': 'action.fire',
  handover: 'ui.inventory',
  equip: 'ui.inventory',
  unequip: 'ui.inventory',
  pickup: 'ui.inventory',
  drop: 'ui.inventory',
  'transfer-item': 'ui.inventory',
  'split-item': 'ui.inventory',
  'merge-item': 'ui.inventory',
  cancel: 'ui.close',
  recover: 'meter.health',
  replenish: 'meter.energy',
  teach: 'action.talk',
};
export function nativeActionIcon(type: string): string {
  return (Object.hasOwn(actionIcons, type) ? actionIcons[type] : undefined) ?? `action.${type}`;
}

export function nativeGatherShortcut(world: WorldState, definitionId: string) {
  const definition = world.itemDefinitions[definitionId];
  if (!definition) return undefined;
  return {
    id: `gather-type:${definition.id}`,
    label: definition.gatherLabel ?? 'Gather this material',
    ...(definition.icon ? { icon: definition.icon } : {}),
  };
}

export function nativePreparationOptions(world: WorldState) {
  return (Object.keys(NATIVE_PREPARATIONS) as NativePreparation[]).flatMap((key) => {
    const preparation = NATIVE_PREPARATIONS[key];
    return world.itemDefinitions[preparation.input] && world.itemDefinitions[preparation.output]
      ? [{ key, ...preparation }]
      : [];
  });
}

type ItemAction = {
  id: string;
  label: string;
  command: { type: 'prepare'; preparation: NativePreparation };
};
export function nativeInventoryActions(world: WorldState, item: ItemInstance): ItemAction[] {
  const actions: ItemAction[] = [];
  for (const preparation of nativePreparationOptions(world))
    if (preparation.input === item.definitionId)
      actions.push({
        id: `prepare-${preparation.key}`,
        label: preparation.label,
        command: { type: 'prepare', preparation: preparation.key },
      });
  return actions;
}
