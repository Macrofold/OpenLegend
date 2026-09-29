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

/** Wind-up safety margin shared by ranged admission and the offered description. */
export function rangedApproachRange(range: number): number {
  return Math.max(
    0.5,
    range - BASE_ACTION_DEFAULTS.animalFleeTilesPerSecond * BASE_ACTION_DEFAULTS.shotSeconds - 0.25,
  );
}

/** Native locomotion and deadline planning use the same authored speed. */
export function nativeMovementSpeed(
  entity: import('../../types.js').Entity,
  fleeing = false,
): number {
  return (
    (fleeing
      ? BASE_ACTION_DEFAULTS.animalFleeTilesPerSecond
      : BASE_ACTION_DEFAULTS.movementTilesPerSecond) *
    (1 - (entity.actor?.body?.conditions.injury ?? 0) / 200)
  );
}
