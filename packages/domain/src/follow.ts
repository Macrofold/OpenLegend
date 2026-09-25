import { seesEntity } from './perception.js';
import { canReachEntity, distance, findApproachPath } from './spatial.js';
import { supportedPosition } from './spatial-state.js';
import type { Action, Entity, WorldState } from './types.js';

import { FOLLOW_RULES } from './worlds/base/navigation.js';
export { FOLLOW_RULES } from './worlds/base/navigation.js';

/** Follow owns only its path/hold state; the kernel remains the sole movement owner.
 * docs/architecture.md#native-follow-activity
 */
export function updateFollowPath(world: WorldState, actor: Entity, action: Action): string | null {
  const follow = action.follow;
  const target =
    action.targetId && Object.hasOwn(world.entities, action.targetId)
      ? world.entities[action.targetId]
      : undefined;
  // Check current evidence before reading a target transform: identity is not tracking permission.
  if (!follow || !target || !seesEntity(world, actor, target))
    return 'the followed target is no longer perceived.';
  if (!target.actor?.alive) return 'the followed actor is no longer alive.';
  if (!supportedPosition(actor)) return 'a supported ground stance is required.';
  const stopDistance =
    follow.distance + (action.stage === 'working' ? FOLLOW_RULES.resumeMargin : 0);
  if (canReachEntity(world, actor, target, stopDistance)) {
    action.stage = 'working';
    if (action.path.length) action.path = [];
    return null;
  }
  action.stage = 'approaching';
  const moved =
    !follow.lastObservedPosition ||
    distance(follow.lastObservedPosition, target.position) >= FOLLOW_RULES.targetDisplacement;
  if (!action.path.length || (moved && world.simTime >= follow.nextRepathAt)) {
    const path = findApproachPath(world, actor, target, follow.distance);
    if (!path) return 'no supported route to the perceived target remains.';
    action.path = path;
    follow.lastObservedPosition = { ...target.position };
    follow.nextRepathAt = world.simTime + FOLLOW_RULES.repathSeconds;
  }
  return null;
}
