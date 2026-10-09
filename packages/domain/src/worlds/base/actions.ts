import { WILDERNESS_NEEDS } from './needs.js';
import { PERCEPTION_RULES } from './senses.js';
import { scarFactor } from '../../reincarnation.js';

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
  shotSeconds: 18,
} as const;

/** Describe current carried capability, never a future invention's possible maximum.
 * Paged possessions disclose the missing tool knowledge. docs/worlds/base/actions.md */
export function gatheringDescription(
  targetName: string,
  materialName: string,
  quantity: number,
  available: number,
  workSeconds: number,
  completeInventory: boolean,
): string {
  return `Gather ${targetName}: ${completeInventory ? 'current' : 'inspected'} carried possessions support up to ${quantity} ${materialName} per batch (${available} currently available), ${workSeconds} work seconds after approach; target must remain perceived, reachable and nonempty. Yield is rechecked on completion.${completeInventory ? '' : ' Other carried possessions were omitted from this inventory page, so final yield may differ.'}`;
}

/** Facts about the bundled world's action families that engine code reads instead of
 * restating: which completed steps yield an item a later step may use, which command fields
 * name the tool a request chose, which families handle one unit per command, which cannot
 * pause once working. Cooking transformations are installed separately through
 * food preparation definitions. docs/worlds/base/actions.md */
export const BASE_FAMILY_FACTS = {
  /** Completed steps whose item a later step may use (harvest only through a named port). */
  itemOutputs: ['gather', 'prepare', 'craft', 'cook', 'fish', 'harvest'],
  /** Of those, the ones that record a single item receipt a plain later step can use. */
  singleItemReceipt: ['gather', 'prepare', 'craft', 'cook', 'fish'],
  toolFields: {
    strike: ['weaponItemId'],
    hunt: ['weaponItemId', 'ammoItemId'],
    equip: ['itemId'],
    fish: ['itemId'],
  } as Readonly<Record<string, readonly string[]>>,
  unitPerCommand: ['eat'],
  unpausableWhileWorking: ['strike', 'hunt', 'practice-shot', 'coaching'],
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
  world: import('../../types.js').WorldState,
  entity: import('../../types.js').Entity,
  fleeing = false,
): number {
  return (
    (fleeing
      ? BASE_ACTION_DEFAULTS.animalFleeTilesPerSecond
      : BASE_ACTION_DEFAULTS.movementTilesPerSecond) *
    (1 - (entity.actor?.body?.conditions.injury ?? 0) / 200) *
    (entity.threat?.policy.movementFactor ?? 1) *
    scarFactor(world, entity, 'movementFactor')
  );
}

export const BASE_EXPRESSION_VERBS = {
  nod: 'nod',
  smile: 'smile',
  frown: 'frown',
  wave: 'wave',
  shrug: 'shrug',
  shake_head: 'shake',
  slap: 'slap',
} as const;
