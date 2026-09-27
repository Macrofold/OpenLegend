import { seesEntity } from './perception.js';
import { canReachEntity, distance, findApproachPath } from './spatial.js';
import { bodyProfile, supportedPosition, worldPosition, worldSupport } from './spatial-state.js';
import { activelyParticipates } from './participation-state.js';
import { capabilityBlocked } from './status-capabilities.js';
import type { Action, Entity, WorldState } from './types.js';

import { FOLLOW_RULES } from './worlds/base/navigation.js';
export { FOLLOW_RULES } from './worlds/base/navigation.js';

/** Follow owns only its path/hold state; the kernel remains the sole movement owner.
 * docs/architecture.md#native-follow-activity
 */
export function followUnavailable(world: WorldState, actor: Entity, action: Action): string | null {
  const follow = action.follow;
  const target =
    action.targetId && Object.hasOwn(world.entities, action.targetId)
      ? world.entities[action.targetId]
      : undefined;
  // Check current evidence before reading a target transform: identity is not tracking permission.
  if (!follow || !target || !activelyParticipates(target) || !seesEntity(world, actor, target))
    return 'the followed target is no longer perceived.';
  if (capabilityBlocked(world, actor, 'actions') || capabilityBlocked(world, actor, 'locomotion'))
    return 'following is no longer available to this body.';
  if (!target.actor?.alive) return 'the followed actor is no longer alive.';
  if (!supportedPosition(actor)) return 'a supported ground stance is required.';
  return null;
}

export function updateFollowPath(world: WorldState, actor: Entity, action: Action): string | null {
  const unavailable = followUnavailable(world, actor, action);
  if (unavailable) return unavailable;
  const follow = action.follow!;
  const target = world.entities[action.targetId!]!;
  const stopDistance =
    follow.distance + (action.stage === 'working' ? FOLLOW_RULES.resumeMargin : 0);
  if (canReachEntity(world, actor, target, stopDistance)) {
    action.stage = 'working';
    delete action.navigation;
    if (action.path.length) action.path = [];
    return null;
  }
  action.stage = 'approaching';
  if (action.navigation?.failure) return action.navigation.failure;
  if (action.navigation) {
    const request = action.navigation.request;
    const profile = bodyProfile(actor);
    if (
      request.geometryRevision === world.map.spatial.revision &&
      request.body.radius === profile.radius &&
      request.body.height === profile.height &&
      request.body.maxSlope === profile.maxSlope &&
      request.from.surfaceId === worldSupport(actor) &&
      distance(request.from, worldPosition(actor)) < 1e-7
    )
      return null;
    delete action.navigation;
  }
  const moved =
    !follow.lastObservedPosition ||
    distance(follow.lastObservedPosition, worldPosition(target)) >= FOLLOW_RULES.targetDisplacement;
  if (!action.path.length || (moved && world.simTime >= follow.nextRepathAt)) {
    const path = findApproachPath(world, actor, target, follow.distance);
    if (!path || (path.status !== 'reached' && path.status !== 'pending'))
      return path?.status === 'budget-exceeded'
        ? 'the follow route exceeds the current navigation budget.'
        : 'no supported route to the perceived target remains.';
    action.path = path.path;
    action.navigation = path.status === 'pending' ? { request: path.request } : undefined;
    follow.lastObservedPosition = { ...worldPosition(target) };
    follow.nextRepathAt = world.simTime + FOLLOW_RULES.repathSeconds;
  }
  return null;
}
