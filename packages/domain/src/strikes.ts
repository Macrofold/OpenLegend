import { TIME_EPSILON } from './simulation-time.js';
import {
  bodySurfaceDistance,
  resolveSupport,
  SPATIAL_LIMITS,
  type SurfacePoint,
} from '@open-legend/spatial';
import {
  effectiveBodyProfile,
  supportedPosition,
  worldPosition,
  spatialMap,
} from './spatial-state.js';
import { hasLineOfEffect } from './spatial.js';
import { definitionPin } from './world-modules.js';
import { hasRecordFields, isSafeRecordId } from './records.js';
import { finitePoint } from '@open-legend/spatial';
import { nativeResponseProfile } from './native-response.js';
import { entityGet, entityValues } from './entity-collection.js';
import { namePhrase, type Named } from '@open-legend/language';
import { weaponStrikeWording } from './worlds/base/strikes.js';
import { itemFor } from './objects.js';
import { equippedItems } from './equipment.js';
import type { Action, Entity, WorldState } from './types.js';
/** Trusted targeted-strike definitions; data selects only this finite native family.
 * docs/targeted-actions.md#targeted-strikes
 */
export interface StrikeDefinition {
  preparationMotion?: {
    kind: 'pursue-observed-target';
    startRange: number;
    standOffRange: number;
    locomotionProfileId: string;
  };
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
  const melee = equippedItems(world, actorId, 'melee').flatMap((item) => {
    const definition = strikeDefinition(item.definitionId, world, item.id, target);
    return definition && supportsStrike(entityGet(world.entities, actorId), definition)
      ? [definition]
      : [];
  });
  const native = Object.values(world.nativeStrikes ?? {})
    .filter((definition) => supportsStrike(entityGet(world.entities, actorId), definition))
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
      (strike.preparationMotion !== undefined &&
        (strike.preparationMotion.kind !== 'pursue-observed-target' ||
          ![strike.preparationMotion.startRange, strike.preparationMotion.standOffRange].every(
            (n) => Number.isFinite(n) && n > 0,
          ) ||
          strike.preparationMotion.startRange < strike.range ||
          strike.preparationMotion.standOffRange >= strike.range ||
          !strike.recoverySeconds ||
          !strikeLocomotion(world, strike))) ||
      !['punch', 'melee'].includes(strike.animation) ||
      typeof strike.autoMoveToRange !== 'boolean' ||
      ![strike.label, strike.pastTense].every(
        (text) => typeof text === 'string' && text.length > 0 && text.length <= 256,
      )
    )
      throw new Error('Invalid installed native strike.');
  for (const entity of entityValues(world.entities))
    if (
      entity.actor?.naturalStrikeIds &&
      (new Set(entity.actor.naturalStrikeIds).size !== entity.actor.naturalStrikeIds.length ||
        entity.actor.naturalStrikeIds.some((id) => !world.nativeStrikes?.[id]))
    )
      throw new Error('Invalid natural strike capability.');
}

/** A preparation keeps the ordinary action's single physical path. Generic
 * actors can use it without an animal or hunt controller. */
export function actionHasMotion(action: Action | null | undefined): boolean {
  return (
    !!action &&
    (action.stage === 'approaching' || (!!action.strikeMotion && action.strikePhase === 'windup'))
  );
}
export function strikeLocomotion(
  world: WorldState,
  definition: StrikeDefinition,
): import('./native-response.js').NativeLocomotion | undefined {
  const id = definition.preparationMotion?.locomotionProfileId;
  if (!id) return;
  const profiles = Object.values(world.nativeResponseProfiles ?? {}).filter(
    (profile) => profile.locomotion[id],
  );
  if (!profiles.length) return;
  const first = profiles[0]!;
  if (profiles.some((profile) => profile.locomotion[id]!.travel !== first.locomotion[id]!.travel))
    return;
  return { profile: definitionPin(first), locomotion: id, mode: 'travel' };
}
export function validateStrikeMotion(world: WorldState, entity: Entity): void {
  const action = entity.actor?.action,
    motion = action?.strikeMotion;
  const definition = action && strikeDefinition(action.definitionId, world, action.weaponItemId);
  if (!motion) {
    if (
      action?.type === 'strike' &&
      action.stage === 'working' &&
      action.strikePhase === 'windup' &&
      definition?.preparationMotion
    )
      throw new Error('Moving strike preparation lost its physical continuation.');
    return;
  }
  const locomotion = motion.locomotion;
  if (
    !action ||
    action.type !== 'strike' ||
    action.stage !== 'working' ||
    action.strikePhase !== 'windup' ||
    !definition?.preparationMotion ||
    !hasRecordFields(motion, ['locomotion', 'releaseAt', 'observed']) ||
    !Number.isFinite(motion.releaseAt) ||
    motion.releaseAt < 0 ||
    motion.releaseAt < world.simTime - TIME_EPSILON ||
    action.totalSeconds !== definition.workSeconds ||
    !Number.isFinite(action.remainingSeconds) ||
    action.remainingSeconds < 0 ||
    action.remainingSeconds > definition.workSeconds + TIME_EPSILON ||
    Math.abs(action.remainingSeconds - Math.max(0, motion.releaseAt - world.simTime)) >
      TIME_EPSILON ||
    !hasRecordFields(motion.observed, ['point', 'at']) ||
    !finitePoint(motion.observed.point) ||
    !isSafeRecordId(motion.observed.point.surfaceId) ||
    !Number.isFinite(motion.observed.at) ||
    motion.observed.at < 0 ||
    motion.observed.at > world.simTime ||
    !locomotion ||
    !hasRecordFields(locomotion, ['profile', 'locomotion', 'mode']) ||
    locomotion.mode !== 'travel' ||
    locomotion.locomotion !== definition.preparationMotion.locomotionProfileId ||
    !nativeResponseProfile(world, locomotion.profile)?.locomotion[locomotion.locomotion] ||
    action.targetLife === undefined
  )
    throw new Error('Invalid saved moving strike preparation.');
}

/** Moving contact definitions name surface separation, unlike ordinary interaction
 * anchors. Prediction, stances, admission and contact must use this same meaning. */
export function movingStrikeInReach(
  world: WorldState,
  actor: Entity,
  target: Entity,
  reach: number,
  origin = worldPosition(actor),
): boolean {
  return (
    bodySurfaceDistance(
      origin,
      effectiveBodyProfile(world, actor),
      worldPosition(target),
      effectiveBodyProfile(world, target),
    ) <=
      reach + SPATIAL_LIMITS.epsilon && hasLineOfEffect(world, actor, target, origin)
  );
}
export function movingStrikeStance(
  world: WorldState,
  actor: Entity,
  target: Entity,
  standOff: number,
): SurfacePoint | undefined {
  const from = supportedPosition(actor),
    targetPoint = supportedPosition(target);
  if (!from || !targetPoint) return;
  const dx = from.x - targetPoint.x,
    dz = from.z - targetPoint.z,
    length = Math.hypot(dx, dz),
    radius =
      effectiveBodyProfile(world, actor).radius +
      effectiveBodyProfile(world, target).radius +
      standOff,
    angle = length > 0 ? Math.atan2(dz, dx) : actor.spatial.heading;
  return (
    resolveSupport(
      spatialMap(world),
      {
        x: targetPoint.x + Math.cos(angle) * radius,
        y: targetPoint.y,
        z: targetPoint.z + Math.sin(angle) * radius,
      },
      targetPoint.surfaceId,
    ) ?? undefined
  );
}
