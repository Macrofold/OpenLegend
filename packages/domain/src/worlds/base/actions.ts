import { nativeResponseProfile, nativeResponseMovementFactor } from '../../native-response.js';
import { WILDERNESS_NEEDS } from './needs.js';
import { PERCEPTION_RULES } from './senses.js';
import { scarFactor } from '../../scar-effects.js';
import { readOnlyDraftView } from '../../draft.js';

// Bundled balance values consumed by the existing finite native adapters.
// docs/worlds/base/survival.md
export const BASE_ACTION_DEFAULTS = {
  movementTilesPerSecond: 0.11,
  sightRadius: PERCEPTION_RULES.sightRadius,
  interactionRadius: 1.6,
  ...WILDERNESS_NEEDS,
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
  itemOutputs: ['gather', 'craft', 'cook', 'fish', 'harvest'],
  /** Of those, the ones that record a single item receipt a plain later step can use. */
  singleItemReceipt: ['gather', 'cook', 'fish'],
  toolFields: {
    'impact-boundary': ['toolId'],
    strike: ['weaponItemId'],
    hunt: ['weaponItemId', 'ammoItemId'],
    aim: ['weaponItemId', 'ammoItemId'],
    'shoot-once': ['weaponItemId', 'ammoItemId'],
    equip: ['itemId'],
    fish: ['itemId'],
  } as Readonly<Record<string, readonly string[]>>,
  unitPerCommand: ['eat'],
  // Cancelling unreleased work releases its claims; a released projectile keeps
  // its independent contact and accounting owner after this activity ends.
  deadlineSafeCommands: ['hunt', 'shoot-once'],
  unpausableWhileWorking: ['strike', 'hunt', 'aim', 'shoot-once', 'practice-shot', 'coaching'],
} as const;

/** Native locomotion and deadline planning use the same authored speed. */
export function nativeMovementSpeed(
  world: import('../../types.js').WorldState,
  entity: import('../../types.js').Entity,
): number {
  entity = readOnlyDraftView(entity);
  if (entity.actor?.action?.evasion) return entity.actor.action.evasion.speed;
  const binding =
    entity.actor?.action?.strikeMotion?.locomotion ?? entity.actor?.action?.nativeLocomotion;
  const profile = binding && nativeResponseProfile(world, binding.profile);
  const nativeSpeed = binding && profile?.locomotion[binding.locomotion]?.[binding.mode];
  if (binding && nativeSpeed === undefined)
    throw new Error('Native movement lost its pinned locomotion definition.');
  return (
    (nativeSpeed ??
      BASE_ACTION_DEFAULTS.movementTilesPerSecond * (entity.threat?.policy.movementFactor ?? 1)) *
    (profile
      ? nativeResponseMovementFactor(world, entity, profile)
      : (1 - (entity.actor?.body?.conditions.injury ?? 0) / 200) *
        scarFactor(world, entity, 'movementFactor'))
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
