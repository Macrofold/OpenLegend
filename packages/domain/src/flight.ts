import {
  canFlySegment,
  canStand,
  distance3D,
  interpolate,
  resolveSupport,
  supportBelow,
  surfaceById,
} from '@open-legend/spatial';
import { bodyProfile, setSpatialPosition, spatialMap } from './spatial-state.js';
import { emit } from './events.js';
import type { Entity, WorldEvent, WorldState } from './types.js';

/** A small native locomotion family: explicit corridors, not free-flight physics or AI per frame.
 * docs/spatial-world.md#flying-creatures. Gravity is a game-time tuning value, not Earth physics. */
export function advanceFlight(
  world: WorldState,
  entity: Entity,
  seconds: number,
  events: WorldEvent[],
): void {
  const state = entity.spatial,
    map = spatialMap(world),
    body = bodyProfile(entity);
  if (
    state.supportSurfaceId === null &&
    state.flight &&
    (!entity.actor?.alive || entity.actor.incapacitated)
  ) {
    delete state.flight;
    state.fallVelocity = 0;
    if (entity.actor) entity.actor.action = null;
  }
  if (state.fallVelocity !== undefined) {
    const velocity = Math.max(-3, state.fallVelocity - 0.04 * seconds);
    const destination = { ...entity.position, y: entity.position.y + velocity * seconds };
    const support = supportBelow(map, entity.position);
    if (support && destination.y <= support.y) {
      setSpatialPosition(entity, support, support.surfaceId);
      delete state.fallVelocity;
      emit(world, events, 'landed', `${entity.name} came to rest on the surface below.`, entity);
    } else {
      // The finite starter's ground always bounds its corridors. A missing support remains
      // a technical unsupported state; do not delete a body or fabricate a landing.
      if (destination.y < -16) throw new Error('Falling actor left the supported spatial world.');
      setSpatialPosition(entity, destination, null);
      state.fallVelocity = velocity;
    }
    return;
  }
  const progress = state.flight;
  if (!progress || !entity.actor?.alive || entity.actor.incapacitated) return;
  if (entity.actor.action) return; // No second voluntary position writer while a native action owns the body.
  const route = world.flightRoutes[progress.routeId];
  if (!route) throw new Error('Missing admitted native flight route.');
  if (progress.waitSeconds > 0) {
    progress.waitSeconds = Math.max(0, progress.waitSeconds - seconds);
    return;
  }
  const waypoint = route.points[progress.next]!;
  const from = entity.position,
    to = waypoint.position;
  const separation = distance3D(from, to);
  const vertical = Math.abs(to.y - from.y);
  const speed =
    vertical > 1e-6
      ? Math.min(route.speed, (route.climbSpeed * separation) / vertical)
      : route.speed;
  const fraction = separation <= 1e-8 ? 1 : Math.min(1, (speed * seconds) / separation);
  const next = interpolate(from, to, fraction);
  const ignoredSupports = [state.supportSurfaceId, waypoint.landingSurfaceId].filter(
    (id): id is string => !!id,
  );
  if (!canFlySegment(map, from, next, body, ignoredSupports)) return;
  const landing =
    fraction === 1 && waypoint.landingSurfaceId
      ? resolveSupport(map, to, waypoint.landingSurfaceId)
      : null;
  if (waypoint.landingSurfaceId && fraction === 1 && (!landing || !canStand(map, landing, body)))
    return;
  // Reserve the landing footprint against actual current bodies, not a visual sprite rectangle.
  if (
    landing &&
    Object.values(world.entities).some(
      (other) =>
        other.id !== entity.id &&
        !!other.actor?.alive &&
        other.spatial.supportSurfaceId === landing.surfaceId &&
        distance3D(other.position, landing) < body.radius + bodyProfile(other).radius,
    )
  )
    return;
  const wasGrounded = state.supportSurfaceId !== null;
  setSpatialPosition(entity, next, landing?.surfaceId ?? null);
  if (wasGrounded && !landing)
    emit(world, events, 'takeoff', `${entity.name} took flight.`, entity);
  if (fraction === 1) {
    progress.next = (progress.next + 1) % route.points.length;
    progress.waitSeconds = waypoint.waitSeconds;
    if (landing)
      emit(
        world,
        events,
        'landed',
        `${entity.name} landed on ${surfaceById(map, landing.surfaceId)!.name.toLowerCase()}.`,
        entity,
      );
  }
}
