import { namePhrase, type Named } from '@open-legend/language';
import { NATIVE_STRIKES, weaponStrikeWording } from './worlds/base/strikes.js';
import { itemFor } from './objects.js';
import type { WorldState } from './types.js';
export { NATIVE_STRIKES } from './worlds/base/strikes.js';
/** Trusted targeted-strike definitions; data selects only this finite native family.
 * docs/targeted-actions.md#targeted-strikes
 */
export interface StrikeDefinition {
  weaponItemId?: string;
  approachRange?: number;
  recoverySeconds?: number;
  accuracy?: number;
  readonly id: string;
  readonly version: number;
  readonly label: string;
  readonly pastTense: string;
  readonly range: number;
  readonly autoMoveToRange: boolean;
  readonly workSeconds: number;
  readonly damage: number;
  readonly animation: 'punch' | 'melee';
}
export interface MeleeProfile {
  damage: number;
  accuracy: number;
  range: number;
  approachRange: number;
  windupSeconds: number;
  recoverySeconds: number;
}

/** Nominal capability, not guaranteed damage or pursuit time. */
export function describeAttack(
  profile: Pick<
    StrikeDefinition,
    'damage' | 'range' | 'workSeconds' | 'recoverySeconds' | 'accuracy'
  >,
): string {
  return `${profile.damage} injury per hit; ${profile.workSeconds + (profile.recoverySeconds ?? 0)} game seconds plus approach; reach ${profile.range} m; ${Math.round((profile.accuracy ?? 1) * 100)}% base hit chance in reach.`;
}
export function validMelee(profile: MeleeProfile): boolean {
  return (
    !!profile &&
    Object.keys(profile).length === 6 &&
    Object.keys(profile).every((key) =>
      ['damage', 'accuracy', 'range', 'approachRange', 'windupSeconds', 'recoverySeconds'].includes(
        key,
      ),
    ) &&
    Object.values(profile).every((value) => typeof value === 'number' && Number.isFinite(value)) &&
    profile.damage >= 0 &&
    profile.accuracy >= 0 &&
    profile.accuracy <= 1 &&
    profile.range > 0 &&
    profile.approachRange > 0 &&
    profile.approachRange <= profile.range &&
    profile.windupSeconds > 0 &&
    profile.recoverySeconds > 0
  );
}
export function strikeDefinition(
  id: string | undefined,
  world?: WorldState,
  weaponItemId?: string,
  target?: Named | string,
): StrikeDefinition | undefined {
  if (weaponItemId) {
    const item = world && itemFor(world, weaponItemId);
    const definition = item && world!.itemDefinitions[item.definitionId];
    const profile = definition?.melee;
    if (!definition || definition.id !== id || !profile || !validMelee(profile)) return;
    return {
      id: definition.id,
      version: definition.version,
      ...weaponStrikeWording(definition, target),
      animation: 'melee',
      autoMoveToRange: true,
      damage: profile.damage,
      accuracy: profile.accuracy,
      range: profile.range,
      approachRange: profile.approachRange,
      workSeconds: profile.windupSeconds,
      recoverySeconds: profile.recoverySeconds,
      weaponItemId,
    };
  }
  const native = id && Object.hasOwn(NATIVE_STRIKES, id) ? NATIVE_STRIKES[id] : undefined;
  return native && target ? { ...native, label: `${native.label} ${namePhrase(target)}` } : native;
}
export function availableStrikes(
  world: WorldState,
  actorId: string,
  target?: Named | string,
): StrikeDefinition[] {
  const weaponItemId = world.entities[actorId]?.actor?.equippedItemId;
  const item = weaponItemId && itemFor(world, weaponItemId);
  const melee = item && strikeDefinition(item.definitionId, world, item.id, target);
  const native = Object.values(NATIVE_STRIKES).map((definition) =>
    target ? { ...definition, label: `${definition.label} ${namePhrase(target)}` } : definition,
  );
  return [...native, ...(melee ? [melee] : [])];
}
