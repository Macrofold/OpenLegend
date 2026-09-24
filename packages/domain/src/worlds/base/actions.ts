import { WILDERNESS_NEEDS } from './needs.js';
import { PERCEPTION_RULES } from './senses.js';

// Bundled balance values consumed by the existing finite native adapters.
// docs/worlds/base/survival.md
export const BASE_GATHER_QUANTITY = 2;
export const BASE_ACTION_DEFAULTS = {
  movementTilesPerSecond: 0.11,
  sightRadius: PERCEPTION_RULES.sightRadius,
  interactionRadius: 1.6,
  animalFleeTilesPerSecond: 0.055,
  ...WILDERNESS_NEEDS,
  gatherQuantity: BASE_GATHER_QUANTITY,
  harvestSeconds: 84,
  cookSeconds: 90,
  shotSeconds: 18,
} as const;
