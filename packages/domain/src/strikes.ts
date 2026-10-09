import { namePhrase, type Named } from '@open-legend/language';
import { weaponStrikeWording } from './worlds/base/strikes.js';
import { itemFor } from './objects.js';
import { equippedItems } from './equipment.js';
import type { Entity, WorldState } from './types.js';
/** Trusted targeted-strike definitions; data selects only this finite native family.
 * docs/targeted-actions.md#targeted-strikes
 */
export interface StrikeDefinition {
  requiredBodyPlan?: import('./living.js').LivingBody['plan'];
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
  world: WorldState,
  weaponItemId?: string,
  target?: Named | string,
): StrikeDefinition | undefined {
  if (weaponItemId) {
    const item = itemFor(world, weaponItemId);
    const definition = item && world.itemDefinitions[item.definitionId];
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
  const definitions = world.nativeStrikes;
  const native = id && definitions && Object.hasOwn(definitions, id) ? definitions[id] : undefined;
  return native && target ? { ...native, label: `${native.label} ${namePhrase(target)}` } : native;
}
export function availableStrikes(
  world: WorldState,
  actorId: string,
  target?: Named | string,
): StrikeDefinition[] {
  const melee = equippedItems(world, actorId).flatMap((item) => {
    const definition = strikeDefinition(item.definitionId, world, item.id, target);
    return definition && supportsStrike(world.entities[actorId], definition) ? [definition] : [];
  });
  const native = Object.values(world.nativeStrikes ?? {})
    .filter((definition) => supportsStrike(world.entities[actorId], definition))
    .map((definition) =>
      target ? { ...definition, label: `${definition.label} ${namePhrase(target)}` } : definition,
    );
  return [...native, ...melee];
}
/** The same anatomical/capability requirement governs discovery, admission and impact. */
export function supportsStrike(actor: Entity | undefined, definition: StrikeDefinition): boolean {
  return (
    !!actor?.actor?.body &&
    (!definition.requiredBodyPlan || definition.requiredBodyPlan === actor.actor.body.plan) &&
    (actor.actor.body.plan === 'biped' || !!actor.actor.naturalStrikeIds?.includes(definition.id))
  );
}
export function validateNativeStrikes(world: WorldState): void {
  for (const [id, strike] of Object.entries(world.nativeStrikes ?? {}))
    if (
      strike.id !== id ||
      !Number.isSafeInteger(strike.version) ||
      strike.version < 1 ||
      ![strike.range, strike.workSeconds].every((n) => Number.isFinite(n) && n > 0) ||
      (strike.approachRange !== undefined &&
        (!Number.isFinite(strike.approachRange) ||
          strike.approachRange <= 0 ||
          strike.approachRange > strike.range)) ||
      !Number.isFinite(strike.damage) ||
      strike.damage < 0 ||
      (strike.recoverySeconds !== undefined &&
        (!Number.isFinite(strike.recoverySeconds) || strike.recoverySeconds <= 0)) ||
      (strike.accuracy !== undefined &&
        (!Number.isFinite(strike.accuracy) || strike.accuracy < 0 || strike.accuracy > 1)) ||
      (strike.requiredBodyPlan !== undefined &&
        !['biped', 'quadruped', 'avian'].includes(strike.requiredBodyPlan)) ||
      !['punch', 'melee'].includes(strike.animation) ||
      typeof strike.autoMoveToRange !== 'boolean' ||
      ![strike.label, strike.pastTense].every(
        (text) => typeof text === 'string' && text.length > 0 && text.length <= 256,
      )
    )
      throw new Error('Invalid installed native strike.');
  for (const entity of Object.values(world.entities))
    if (
      entity.actor?.naturalStrikeIds &&
      (new Set(entity.actor.naturalStrikeIds).size !== entity.actor.naturalStrikeIds.length ||
        entity.actor.naturalStrikeIds.some((id) => !world.nativeStrikes?.[id]))
    )
      throw new Error('Invalid natural strike capability.');
}
