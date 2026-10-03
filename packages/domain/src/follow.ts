import { seesEntity } from './perception.js';
import { canReachEntity, distance, findApproachPath, findPath, isWalkable } from './spatial.js';
import {
  bodyProfile,
  spatialMap,
  supportedPosition,
  worldPosition,
  worldSupport,
} from './spatial-state.js';
import { surfaceById, surfaceContains, surfaceHeight } from '@open-legend/spatial';
import { subjectReferenceCurrent } from './worlds/base/knowledge.js';
import { activelyParticipates } from './participation-state.js';
import { capabilityBlocked } from './status-capabilities.js';
import { rememberSighting } from './agency.js';
import type { SurfacePoint } from '@open-legend/spatial';
import type { Action, Command, Entity, WorldState } from './types.js';

import { FOLLOW_RULES } from './worlds/base/navigation.js';
export { FOLLOW_RULES } from './worlds/base/navigation.js';

/** Unit vectors in the right-handed, Y-up world frame for a heading measured from +Z
 * toward +X: facing +Z puts the right hand at -X.
 * docs/action-capabilities.md#102-entity-relative-navigation
 */
export function headingFrame(heading: number): {
  forward: { x: number; z: number };
  right: { x: number; z: number };
} {
  return {
    forward: { x: Math.sin(heading), z: Math.cos(heading) },
    right: { x: -Math.cos(heading), z: Math.sin(heading) },
  };
}

/** Initial controller state from the admitted command; the kernel owns the action. */
export function followState(
  world: WorldState,
  actor: Entity,
  command: Extract<Command, { type: 'follow' }>,
  separation: number,
): NonNullable<Action['follow']> {
  const state: NonNullable<Action['follow']> = { distance: separation, nextRepathAt: 0 };
  if (command.relation === 'behind') state.relation = 'behind';
  else if (command.relation) {
    state.relation = 'beside';
    const target = world.entities[command.targetId];
    // "Beside" keeps whichever side the follower starts on, judged from the visible pose.
    const { right } = headingFrame(target?.spatial.heading ?? 0);
    const from = target ? worldPosition(target) : worldPosition(actor);
    const here = worldPosition(actor);
    state.side =
      command.relation === 'left'
        ? -1
        : command.relation === 'right'
          ? 1
          : (here.x - from.x) * right.x + (here.z - from.z) * right.z < 0
            ? -1
            : 1;
  }
  if (command.onLost) state.onLost = command.onLost;
  if (command.until !== undefined) state.until = command.until;
  return state;
}

function perceived(world: WorldState, actor: Entity, action: Action): Entity | undefined {
  const target =
    action.targetId && Object.hasOwn(world.entities, action.targetId)
      ? world.entities[action.targetId]
      : undefined;
  // Check current evidence before reading a target transform: identity is not tracking permission.
  if (!target || !activelyParticipates(target) || !seesEntity(world, actor, target)) return;
  // After a disappearance, a new sighting is the same subject only through recognition,
  // never because the server knows it is the same entity.
  const episode = action.follow?.episode;
  return episode === undefined || subjectReferenceCurrent(world, actor.id, target.id, episode)
    ? target
    : undefined;
}

/** Follow owns only its path/hold state; the kernel remains the sole movement owner.
 * docs/architecture.md#native-follow-activity
 */
export function followUnavailable(world: WorldState, actor: Entity, action: Action): string | null {
  const follow = action.follow;
  if (!follow) return 'the followed target is no longer perceived.';
  if (capabilityBlocked(world, actor, 'actions') || capabilityBlocked(world, actor, 'locomotion'))
    return 'following is no longer available to this body.';
  if (!supportedPosition(actor)) return 'a supported ground stance is required.';
  const target = perceived(world, actor, action);
  // The disclosed loss policy moves only to the recorded sighting; nothing tracks the target.
  if (!target)
    return follow.onLost === 'last-seen' && follow.lastSeen
      ? null
      : 'the followed target is no longer perceived.';
  if (!target.actor?.alive) return 'the followed actor is no longer alive.';
  return null;
}

/** Record only what the follower sees now: position, support and travel direction. */
function observe(
  world: WorldState,
  actor: Entity,
  action: Action,
  target: Entity,
  recordSighting: boolean,
): void {
  const follow = action.follow!;
  const point = supportedPosition(target);
  if (!point) return;
  const previous = follow.lastSeen?.point;
  if (previous && distance(previous, point) >= FOLLOW_RULES.headingEvidence)
    follow.travelHeading = Math.atan2(point.x - previous.x, point.z - previous.z);
  if (!previous || distance(previous, point) >= FOLLOW_RULES.headingEvidence || !follow.lastSeen)
    follow.lastSeen = { point: { ...point }, at: world.simTime };
  else follow.lastSeen.at = world.simTime;
  follow.episode ??= world.perceptionEpisodes?.[actor.id]?.[target.id];
  if (recordSighting) rememberSighting(world, actor.id, target.id, follow.lastSeen.point);
}

/** Behind/beside need an observed travel direction; until one exists, or when that stance
 * is not usable ground, hold near instead. */
function relationSlot(
  world: WorldState,
  actor: Entity,
  action: Action,
  target: Entity,
): SurfacePoint | null {
  const follow = action.follow!;
  const base = supportedPosition(target);
  if (!follow.relation || follow.travelHeading === undefined || !base) return null;
  const { forward, right } = headingFrame(follow.travelHeading);
  const offset =
    follow.relation === 'behind'
      ? { x: -forward.x, z: -forward.z }
      : { x: right.x * (follow.side ?? 1), z: right.z * (follow.side ?? 1) };
  const x = base.x + offset.x * follow.distance,
    z = base.z + offset.z * follow.distance;
  const surface = surfaceById(spatialMap(world), base.surfaceId);
  if (!surface || !surfaceContains(surface, { x, z })) return null;
  const slot = { x, y: surfaceHeight(surface, x, z), z, surfaceId: surface.id };
  return isWalkable(world, slot, slot.surfaceId, bodyProfile(actor)) ? slot : null;
}

function routeTo(world: WorldState, actor: Entity, action: Action, point: SurfacePoint) {
  return findPath(
    world,
    worldPosition(actor),
    point,
    worldSupport(actor) ?? undefined,
    point.surfaceId,
    bodyProfile(actor),
  );
}

function pendingRouteCurrent(world: WorldState, actor: Entity, action: Action): boolean {
  const request = action.navigation?.request;
  const profile = bodyProfile(actor);
  return (
    !!request &&
    request.geometryRevision === world.map.spatial.revision &&
    request.body.radius === profile.radius &&
    request.body.height === profile.height &&
    request.body.maxSlope === profile.maxSlope &&
    request.from.surfaceId === worldSupport(actor) &&
    distance(request.from, worldPosition(actor)) < 1e-7
  );
}

/** Lost sight under the last-seen policy: walk to the recorded point, then stop honestly. */
function pursue(world: WorldState, actor: Entity, action: Action): string | null {
  const follow = action.follow!;
  const point = follow.lastSeen!.point;
  if (distance(worldPosition(actor), point) <= FOLLOW_RULES.resumeMargin)
    return 'reached where the target was last seen; it is not in view.';
  action.stage = 'approaching';
  if (action.navigation?.failure) return action.navigation.failure;
  if (action.navigation && pendingRouteCurrent(world, actor, action)) return null;
  delete action.navigation;
  if (!follow.pursuing || !action.path.length) {
    follow.pursuing = true;
    const path = routeTo(world, actor, action, point);
    if (!path || (path.status !== 'reached' && path.status !== 'pending'))
      return 'no supported route reaches where the target was last seen.';
    action.path = path.path;
    action.navigation = path.status === 'pending' ? { request: path.request } : undefined;
  }
  return null;
}

/** Admission may prepare a temporary path without recording a sighting in world history. */
export function updateFollowPath(
  world: WorldState,
  actor: Entity,
  action: Action,
  recordSighting = true,
): string | null {
  const unavailable = followUnavailable(world, actor, action);
  if (unavailable) return unavailable;
  const follow = action.follow!;
  const target = perceived(world, actor, action);
  if (!target) return pursue(world, actor, action);
  observe(world, actor, action, target, recordSighting);
  if (follow.pursuing) {
    // Reacquired through real sight: resume ordinary following from here.
    delete follow.pursuing;
    delete action.navigation;
    action.path = [];
  }
  const slot = relationSlot(world, actor, action, target);
  const holding = action.stage === 'working';
  const held = slot
    ? distance(worldPosition(actor), slot) <=
        FOLLOW_RULES.slotTolerance + (holding ? FOLLOW_RULES.resumeMargin : 0) &&
      canReachEntity(world, actor, target, follow.distance + FOLLOW_RULES.slotTolerance)
    : canReachEntity(
        world,
        actor,
        target,
        follow.distance + (holding ? FOLLOW_RULES.resumeMargin : 0),
      );
  if (held) {
    action.stage = 'working';
    delete action.navigation;
    if (action.path.length) action.path = [];
    return null;
  }
  action.stage = 'approaching';
  if (action.navigation?.failure) return action.navigation.failure;
  if (action.navigation) {
    if (pendingRouteCurrent(world, actor, action)) return null;
    delete action.navigation;
  }
  const moved =
    !follow.lastObservedPosition ||
    distance(follow.lastObservedPosition, worldPosition(target)) >= FOLLOW_RULES.targetDisplacement;
  if (!action.path.length || (moved && world.simTime >= follow.nextRepathAt)) {
    // A slot off supported ground falls back to ordinary proximity rather than failing.
    const path =
      (slot && routeTo(world, actor, action, slot)) ||
      findApproachPath(world, actor, target, follow.distance);
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
