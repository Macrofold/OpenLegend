import {
  canFlySegment,
  canStand,
  distance3D,
  interpolate,
  resolveSupport,
  supportBelow,
  surfaceById,
  SPATIAL_LIMITS,
  type BodyProfile,
  type WorldPoint,
} from '@open-legend/spatial';
import { bodyProfile, setSpatialPosition, spatialMap } from './spatial-state.js';
import { emit } from './events.js';
import type { Entity, WorldEvent, WorldState } from './types.js';

/** Short-lived landing broad phase, created lazily after voluntary movement.
 * The caller updates it after each native animal/flyer move. Never cache a mutable step's
 * occupancy by world identity: a second bird must see the first bird's committed landing.
 */
export class LandingOccupancy {
  private cells = new Map<string, Set<string>>();
  private bodies = new Map<
    string,
    { position: WorldPoint; radius: number; height: number; keys: string[] }
  >();
  constructor(world: WorldState) {
    for (const entity of Object.values(world.entities)) this.update(entity);
  }
  private keys(position: WorldPoint, radius: number, height: number): string[] {
    const keys: string[] = [];
    for (
      let x = Math.floor((position.x - radius) / 4);
      x <= Math.floor((position.x + radius) / 4);
      x++
    )
      for (let y = Math.floor(position.y / 4); y <= Math.floor((position.y + height) / 4); y++)
        for (
          let z = Math.floor((position.z - radius) / 4);
          z <= Math.floor((position.z + radius) / 4);
          z++
        )
          keys.push(`${x},${y},${z}`);
    return keys;
  }
  update(entity: Entity): void {
    const old = this.bodies.get(entity.id);
    if (!old && !entity.actor?.alive) return;
    const p = entity.position;
    const body = bodyProfile(entity);
    if (
      old &&
      entity.actor?.alive &&
      old.radius === body.radius &&
      old.height === body.height &&
      old.position.x === p.x &&
      old.position.y === p.y &&
      old.position.z === p.z
    )
      return;
    if (old) {
      for (const key of old.keys) {
        const cell = this.cells.get(key)!;
        cell.delete(entity.id);
        if (!cell.size) this.cells.delete(key);
      }
      this.bodies.delete(entity.id);
    }
    if (!entity.actor?.alive) return;
    const keys = this.keys(p, body.radius, body.height);
    this.bodies.set(entity.id, {
      position: { ...p },
      radius: body.radius,
      height: body.height,
      keys,
    });
    for (const key of keys) {
      let cell = this.cells.get(key);
      if (!cell) this.cells.set(key, (cell = new Set()));
      cell.add(entity.id);
    }
  }
  blocked(id: string, position: WorldPoint, body: BodyProfile): boolean {
    const seen = new Set<string>([id]);
    for (const key of this.keys(position, body.radius, body.height))
      for (const otherId of this.cells.get(key) ?? []) {
        if (seen.has(otherId)) continue;
        seen.add(otherId);
        const other = this.bodies.get(otherId)!;
        const p = other.position;
        // Physical height/footprint, not equal surface IDs: coplanar patches may overlap.
        if (
          p.y < position.y + body.height - SPATIAL_LIMITS.epsilon &&
          p.y + other.height > position.y + SPATIAL_LIMITS.epsilon &&
          Math.hypot(p.x - position.x, p.z - position.z) < body.radius + other.radius
        )
          return true;
      }
    return false;
  }
}

/** A small native locomotion family: explicit corridors, not free-flight physics or AI per frame.
 * docs/spatial-world.md#flying-creatures. Gravity is a game-time tuning value, not Earth physics. */
const FALL_ACCELERATION = 0.04,
  TERMINAL_FALL_SPEED = 3;
/** Closed-form displacement keeps falling independent of host interval size. */
function fallingDisplacement(velocity: number, seconds: number): number {
  const v = Math.max(0, Math.min(TERMINAL_FALL_SPEED, -velocity));
  const accelerating = Math.min(seconds, (TERMINAL_FALL_SPEED - v) / FALL_ACCELERATION);
  return (
    v * accelerating +
    (FALL_ACCELERATION * accelerating * accelerating) / 2 +
    TERMINAL_FALL_SPEED * (seconds - accelerating)
  );
}
export function fallingDuration(velocity: number, distance: number): number {
  if (distance <= 0) return 0;
  const v = Math.max(0, Math.min(TERMINAL_FALL_SPEED, -velocity));
  const accelerationTime = (TERMINAL_FALL_SPEED - v) / FALL_ACCELERATION;
  const accelerationDistance = ((v + TERMINAL_FALL_SPEED) * accelerationTime) / 2;
  return distance <= accelerationDistance
    ? (Math.sqrt(v * v + 2 * FALL_ACCELERATION * distance) - v) / FALL_ACCELERATION
    : accelerationTime + (distance - accelerationDistance) / TERMINAL_FALL_SPEED;
}
export function flightSpeed(
  from: WorldPoint,
  to: WorldPoint,
  route: { speed: number; climbSpeed: number },
): number {
  const vertical = Math.abs(to.y - from.y),
    separation = distance3D(from, to);
  return vertical > 1e-6
    ? Math.min(route.speed, (route.climbSpeed * separation) / vertical)
    : route.speed;
}
export function advanceFlight(
  world: WorldState,
  entity: Entity,
  seconds: number,
  events: WorldEvent[],
  landingOccupancy?: () => LandingOccupancy,
): void {
  const state = entity.spatial;
  if (!state.flight && state.fallVelocity === undefined) return;
  const map = spatialMap(world),
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
    const velocity = Math.max(
      -TERMINAL_FALL_SPEED,
      state.fallVelocity - FALL_ACCELERATION * seconds,
    );
    const destination = {
      ...entity.position,
      y: entity.position.y - fallingDisplacement(state.fallVelocity, seconds),
    };
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
  const speed = flightSpeed(from, to, route);
  if (seconds === 0 && separation > SPATIAL_LIMITS.epsilon) {
    // Taking off is a start-boundary transition, not backdated after movement.
    if (
      state.supportSurfaceId !== null &&
      canFlySegment(
        map,
        from,
        interpolate(from, to, Math.min(1, 0.001 / separation)),
        body,
        [state.supportSurfaceId, waypoint.landingSurfaceId].filter((id): id is string => !!id),
      )
    ) {
      setSpatialPosition(entity, from, null);
      emit(world, events, 'takeoff', `${entity.name} took flight.`, entity);
    }
    return;
  }
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
    (landingOccupancy?.() ?? new LandingOccupancy(world)).blocked(entity.id, landing, body)
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
