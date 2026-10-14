import { canWalkSegment, distance3D, type SurfacePoint } from '@open-legend/spatial';
import { bodyPolicy } from './body-policy.js';
import { canonicalJson, contentLabel, outcome } from './events.js';
import { bodyProfile, spatialMap, supportedPosition } from './spatial-state.js';
import { occupiedBodySweepClear } from './spatial.js';
import { capabilityBlocked } from './status-capabilities.js';
import { hasRecordFields, isSafeRecordId } from './records.js';
import { TIME_EPSILON } from './simulation-time.js';
import { BASE_EVASION_TEXT } from './worlds/base/ranged-counterplay.js';
import type { Action, Entity, Outcome, WorldState } from './types.js';

export interface EvasionState {
  sourceLife: number;
  profile: string;
  startedAt: number;
  endsAt: number;
  repeatAt: number;
  speed: number;
}
export function prepareEvasion(
  world: WorldState,
  actor: Entity,
  id: string,
  destination: SurfacePoint,
): Action | Outcome {
  const profile = bodyPolicy(world)?.evasion,
    from = supportedPosition(actor);
  if (
    !profile ||
    !actor.actor?.body ||
    !profile.bodyPlans.includes(actor.actor.body.plan) ||
    !from ||
    capabilityBlocked(world, actor, 'locomotion')
  )
    return outcome(false, 'evasion-unavailable', BASE_EVASION_TEXT.unavailable);
  if ((actor.actor.evasionReadyAt ?? 0) > world.simTime)
    return outcome(
      false,
      'evasion-recovery',
      BASE_EVASION_TEXT.recovery(
        profile.label,
        Math.ceil(actor.actor.evasionReadyAt! - world.simTime),
      ),
    );
  const length = destination && distance3D(from, destination);
  if (
    !destination ||
    !Number.isFinite(length) ||
    length <= 1e-5 ||
    length > profile.maximumDistance + 1e-8
  )
    return outcome(false, 'evasion-distance', BASE_EVASION_TEXT.distance(profile.maximumDistance));
  // Freeze a direct, supported short path. Refusal never becomes a hidden detour or pursuit.
  if (
    !canWalkSegment(spatialMap(world), from, destination, bodyProfile(actor)) ||
    !occupiedBodySweepClear(world, actor, from, destination)
  )
    return outcome(false, 'evasion-blocked', BASE_EVASION_TEXT.blockedPath);
  return {
    id,
    type: 'evade',
    stage: 'approaching',
    path: [{ ...destination }],
    destination: { ...destination },
    totalSeconds: profile.seconds,
    remainingSeconds: profile.seconds,
    consumed: [],
    evasion: {
      sourceLife: actor.actor.physicalLife ?? 0,
      profile: contentLabel(canonicalJson(profile)),
      startedAt: world.simTime,
      endsAt: world.simTime + profile.seconds,
      repeatAt: world.simTime + profile.repeatSeconds,
      speed: length / profile.seconds,
    },
  };
}
export function validateEvasion(world: WorldState): void {
  const profile = bodyPolicy(world)?.evasion;
  const profileId = profile && contentLabel(canonicalJson(profile));
  for (const entity of Object.values(world.entities)) {
    if (
      entity.actor?.evasionReadyAt !== undefined &&
      (!Number.isFinite(entity.actor.evasionReadyAt) || entity.actor.evasionReadyAt < 0)
    )
      throw new Error('Invalid saved evasion readiness.');
    const action = entity.actor?.action;
    if (!action?.evasion && action?.type !== 'evade') continue;
    const e = action?.evasion;
    const from = supportedPosition(entity);
    if (
      !action ||
      action.type !== 'evade' ||
      !e ||
      !action.destination ||
      !from ||
      action.stage !== 'approaching' ||
      action.path.length !== 1 ||
      canonicalJson(action.path[0]) !== canonicalJson(action.destination) ||
      action.navigation ||
      !hasRecordFields(e, ['sourceLife', 'profile', 'startedAt', 'endsAt', 'repeatAt', 'speed']) ||
      !Number.isSafeInteger(e.sourceLife) ||
      e.sourceLife !== (entity.actor!.physicalLife ?? 0) ||
      !isSafeRecordId(e.profile) ||
      !profile ||
      !entity.actor?.body ||
      !profile.bodyPlans.includes(entity.actor.body.plan) ||
      e.profile !== profileId ||
      Math.abs(e.endsAt - e.startedAt - profile.seconds) > TIME_EPSILON ||
      Math.abs(e.repeatAt - e.startedAt - profile.repeatSeconds) > TIME_EPSILON ||
      action.totalSeconds !== profile.seconds ||
      ![e.startedAt, e.endsAt, e.repeatAt, e.speed].every(Number.isFinite) ||
      e.startedAt < 0 ||
      e.startedAt > world.simTime ||
      e.endsAt <= e.startedAt ||
      e.repeatAt <= e.startedAt ||
      e.speed <= 0 ||
      e.speed * profile.seconds > profile.maximumDistance + TIME_EPSILON ||
      Math.abs(action.remainingSeconds - (e.endsAt - world.simTime)) > TIME_EPSILON ||
      Math.abs(distance3D(from, action.destination) - e.speed * action.remainingSeconds) >
        TIME_EPSILON ||
      entity.actor!.evasionReadyAt !== e.repeatAt
    )
      throw new Error('Invalid saved evasive movement.');
  }
}
