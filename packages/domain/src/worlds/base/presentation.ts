import { BASE_FOOD_ACTION_WORDING } from './action-views.js';
import { BASE_GUARD_TEXT } from './shield-defense.js';
import type { ItemInstance, WorldState } from '../../types.js';
import { prepareManufactureChoices } from '../../manufacture.js';
import type { AssemblyFamily } from '../../assembly-types.js';
import type { ItemArt } from '../../presentation-art.js';

const itemArt = (file: string): ItemArt => ({
  path: `apps/client/src/design-system/gildmoss/art/world/base/items/${file}.png`,
});
export const BASE_SHIELD_ART: ItemArt = {
  ...itemArt('wooden-shield'),
  detailPath: itemArt('wooden-shield-large').path,
};
export const BASE_POUCH_ART = itemArt('woven-gathering-pouch');
export const BASE_SLING_ART = itemArt('field-sling');
export const BASE_ARROW_ART = itemArt('field-arrow');

/** The initializer binds an authored method's actual returned definition ID.
 * Generated IDs are never guessed from output names or invention families. */
export function bindBaseItemArt(world: WorldState, definitionId: string, art: ItemArt): void {
  if (world.presentation)
    world.presentation.itemArt = { ...world.presentation.itemArt, [definitionId]: art };
}

/** Bundled appearance only; the construction mechanism does not require a
 * transparent covering, and render opacity changes no physical perception. */
export function baseAssemblyPresentation(family: AssemblyFamily) {
  return {
    postColor: family.presentation.postColor,
    coverColor: family.presentation.coverColor,
    coverOpacity: family.implementation === 'four-corner-flexible-bays' ? 0.64 : 1,
  };
}

/** Vocabulary belongs to the installed native capability, not to an inventory widget.
 * These adapters describe the bundled native families; they do not install effects. */
export const BASE_WORLD_PRESENTATION: NonNullable<WorldState['presentation']> = {
  worldName: 'The Wilderness',
  locationName: 'The first clearing',
  timeLabel: 'Time in the wilderness',
  calendar: {
    dayLabel: 'Day',
    historyTemplate:
      'Your time in this world began on {startDay}. You have been here for {elapsedDays} full days.',
  },
  daylight: { startTime: 'dawn', endTime: 'dusk', noonElevationDegrees: 60 },
  itemArt: {
    bone: itemArt('bone-fragment'),
    cooked_meat: itemArt('cooked-meat'),
    cooked_river_fish: itemArt('cooked-river-fish'),
    cord: itemArt('fiber-cord'),
    stone_tool: itemArt('flaked-cutting-stone'),
    knife: itemArt('knife'),
    travel_cloak: itemArt('large-travel-cloak'),
    canopy_post: itemArt('light-canopy-post'),
    prepared_fiber: itemArt('prepared-fibers'),
    raw_meat: itemArt('raw-meat'),
    raw_river_fish: itemArt('raw-river-fish'),
    raw_fiber: itemArt('reed-fibers'),
    stone: itemArt('small-stone'),
    weather_cloth: itemArt('spare-weather-cloth'),
    wood: itemArt('supple-branch'),
    canopy_tall_post: itemArt('tall-canopy-post'),
    tavins_sorting_note: itemArt('tavins-sorting-note'),
    torn_red_fastening: itemArt('torn-red-fastening'),
    berries: itemArt('wild-berries'),
    woven_bag: itemArt('woven-bag'),
  },
  portraits: {
    'study:mike-field-tunic': {
      path: 'apps/client/src/design-system/gildmoss/art/sample-characters/portrait-mike.png',
      headPath: 'apps/client/src/design-system/gildmoss/art/sample-characters/head-mike.png',
      figurePath:
        'apps/client/src/design-system/gildmoss/art/sample-characters/mike-fullbody-227x560@2x.png',
    },
    'study:mara-travel-coat': {
      path: 'apps/client/src/design-system/gildmoss/art/sample-characters/portrait-mara-reed.png',
      headPath: 'apps/client/src/design-system/gildmoss/art/sample-characters/head-mara-reed.png',
    },
  },
  mapArt: {
    path: 'apps/client/src/design-system/gildmoss/art/world/base/map-starting-land-parchment.jpg',
    // Exact full-image extent of the retained map construction, not live terrain sampling.
    bounds: { minX: -20, minZ: 0, maxX: 148, maxZ: 112 },
    northDegrees: 0,
    maxMarkers: 500,
    labelCharacters: 40,
    markerIcons: [
      { id: 'pin', label: 'Pin', icon: 'ui.map-marker' },
      { id: 'place', label: 'Place', icon: 'ui.places' },
      { id: 'camp', label: 'Camp', icon: 'structure.campfire' },
      { id: 'star', label: 'Star', icon: 'ui.special' },
      { id: 'warning', label: 'Warning', icon: 'ui.unavailable' },
    ],
  },
};

export const BASE_ACTION_DESCRIPTIONS = {
  gather:
    'Approach a resource and collect a small batch into your inventory. Supplies at each source are finite.',
  craft:
    'Make an item using a technique you know. Materials are consumed when work begins and are not refunded if you stop.',
  equip:
    'Select one individual tool from your inventory. A ranged tool needs compatible ammunition before you can fire.',
  hunt: 'Approach a living animal and attempt one shot with your equipped ranged tool. Each attempt consumes ammunition and can miss. A killed animal leaves harvestable remains.',
  harvest:
    'Use a cutting point to collect the remaining materials from animal remains. Each set of remains can be harvested once.',
  guard: BASE_GUARD_TEXT.description,
  cook: BASE_FOOD_ACTION_WORDING.cookingDescription,
  fish: BASE_FOOD_ACTION_WORDING.fishingDescription,
  'tend-fire':
    'Light a campfire that has fuel laid, add one piece of carried fuel, or put it out. Materials are used only when the work finishes; unburnt fuel stays in a fire that is put out.',
};

const actionIcons: Readonly<Partial<Record<string, string>>> = {
  move: 'action.walk',
  harvest: 'action.gather',
  cook: 'action.fire',
  'tend-fire': 'action.fire',
  'place-hearth': 'action.fire',
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
  'status-effect': 'ui.cognition',
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

/** One permitted method index and stock preparation per inventory/catalogue read. */
export function prepareNativeInventoryActions(world: WorldState, actorId: string) {
  const byInput = new Map<string, string[]>();
  for (const known of world.knowledge[actorId] ?? []) {
    const recipe = world.recipes[known.recipeId];
    if (!recipe) continue;
    for (const definitionId of new Set(recipe.inputs.map((input) => input.definitionId))) {
      const methods = byInput.get(definitionId) ?? [];
      methods.push(recipe.id);
      byInput.set(definitionId, methods);
    }
  }
  const craftCommand = prepareManufactureChoices(world, actorId);
  return (item: ItemInstance) =>
    (byInput.get(item.definitionId) ?? []).map((id) => {
      const recipe = world.recipes[id]!;
      return { id: `craft-${id}`, label: recipe.name, command: craftCommand(recipe) };
    });
}
