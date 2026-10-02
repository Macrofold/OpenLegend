import { worldRootEntities } from './entity-index.js';
import { activelyParticipates } from './participation-state.js';
import { worldPosition, worldSupport } from './spatial-state.js';
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
import type { FlightRoute } from './spatial-state.js';
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
    for (const entity of worldRootEntities(world)) this.update(entity);
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
    if (!old && (!entity.actor?.alive || !activelyParticipates(entity))) return;
    const p = worldPosition(entity);
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
    if (!entity.actor?.alive || !activelyParticipates(entity)) return;
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
const FALL_ACCELERATION = 0.04;
export const TERMINAL_FALL_SPEED = 3;
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
/** Game seconds one lap of a route takes, visiting every waypoint once (waits excluded). */
const lapSeconds = new WeakMap<FlightRoute, number>();
export function routeLapSeconds(route: FlightRoute): number {
  let seconds = lapSeconds.get(route);
  if (seconds === undefined) {
    seconds = 0;
    route.points.forEach((point, i) => {
      const next = route.points[(i + 1) % route.points.length]!.position;
      const separation = distance3D(point.position, next);
      if (separation > 0) seconds! += separation / flightSpeed(point.position, next, route);
    });
    lapSeconds.set(route, seconds);
  }
  return seconds;
}
/** Hops one private path may take; short circling routes can lap several times per slice. */
const PATH_HOPS = 64;
/** A mid-air corridor turn with no wait is a private motion deadline: nothing is emitted,
 * reserved or observed there. Only landing and hovering waypoints end the private path, so
 * a flock's staggered turns do not split every other entity's interval. The caller's
 * travel limit still caps path length for sampled perception. docs/worlds/base/time.md#spatial-fidelity */
export function flightPathSeconds(
  world: WorldState,
  entity: Entity,
  travelLimit: number,
): { stop: number; landing: boolean; travel: number; waypoint?: FlightRoute['points'][number] } {
  const progress = entity.spatial.flight!;
  const route = world.flightRoutes[progress.routeId]!;
  let position = worldPosition(entity),
    next = progress.next,
    seconds = 0,
    path = 0;
  for (let hop = 0; hop < route.points.length * PATH_HOPS; hop++) {
    const waypoint = route.points[next]!;
    const distance = distance3D(position, waypoint.position);
    const speed = flightSpeed(position, waypoint.position, route);
    const travel =
      path + distance >= travelLimit ? seconds + (travelLimit - path) / speed : Infinity;
    seconds += distance / speed;
    if (waypoint.landingSurfaceId || waypoint.waitSeconds > 0)
      return { stop: seconds, landing: !!waypoint.landingSurfaceId, travel, waypoint };
    if (travel !== Infinity) return { stop: Infinity, landing: false, travel };
    path += distance;
    position = waypoint.position;
    next = (next + 1) % route.points.length;
  }
  // A lap too short to reach the travel limit in PATH_HOPS hops ends the private path there.
  // Laps covering under a game second in total keep the flyer within millimetres; bounding
  // at them would force ever-smaller slices, so such a flyer holds after its hops instead.
  return { stop: Infinity, landing: false, travel: seconds >= 1 ? seconds : Infinity };
}
/** Piecewise-linear pose over a candidate slice: breakpoints `at` (from 0 to its end).
 * `until`, when present, is where the prediction stops; later poses only pad the track. */
export interface MotionTrack {
  at: number[];
  pose: WorldPoint[];
  until?: number;
}
/** The private path advanceFlight will follow over `seconds`, for sensory crossing checks.
 * A landing hop or a blocked sweep can leave the body at that hop's start, so both outcomes
 * are returned. Undefined means the flyer does not move during the slice. */
export function flightTracks(
  world: WorldState,
  entity: Entity,
  seconds: number,
): MotionTrack[] | undefined {
  const progress = entity.spatial.flight;
  if (
    !progress ||
    progress.waitSeconds > 0 ||
    entity.spatial.fallVelocity !== undefined ||
    !entity.actor?.alive ||
    !activelyParticipates(entity) ||
    entity.actor.incapacitated ||
    entity.actor.action
  )
    return undefined;
  const route = world.flightRoutes[progress.routeId]!;
  const map = spatialMap(world),
    body = bodyProfile(entity);
  const track: MotionTrack = { at: [0], pose: [{ ...worldPosition(entity) }] };
  const outcomes: MotionTrack[] = [track];
  const stay = (from: WorldPoint) =>
    outcomes.push({ at: [...track.at, seconds], pose: [...track.pose, from] });
  let next = progress.next,
    elapsed = 0;
  for (let hop = 0; hop < route.points.length * PATH_HOPS && elapsed < seconds; hop++) {
    const waypoint = route.points[next]!;
    const from = track.pose.at(-1)!,
      to = waypoint.position;
    const separation = distance3D(from, to);
    const speed = flightSpeed(from, to, route);
    const fraction =
      separation <= 1e-8 ? 1 : Math.min(1, (speed * (seconds - elapsed)) / separation);
    const end = interpolate(from, to, fraction);
    const departure = worldSupport(entity) ?? resolveSupport(map, from)?.surfaceId;
    const clear = canFlySegment(
      map,
      from,
      end,
      body,
      [hop ? resolveSupport(map, from)?.surfaceId : departure, waypoint.landingSurfaceId].filter(
        (id): id is string => !!id,
      ),
    );
    // A shorter actual slice may clear a blocked sweep, and a landing may be refused.
    if (!clear || (fraction === 1 && waypoint.landingSurfaceId)) stay(from);
    elapsed = fraction === 1 ? elapsed + (separation <= 1e-8 ? 0 : separation / speed) : seconds;
    track.at.push(Math.min(seconds, elapsed));
    track.pose.push(end);
    if (fraction !== 1 || waypoint.landingSurfaceId || waypoint.waitSeconds > 0) break;
    next = (next + 1) % route.points.length;
  }
  // Past a landing, hover or the hop cap the body's future is not predicted here.
  track.until = Math.min(seconds, elapsed);
  if (track.at.at(-1)! < seconds) {
    track.at.push(seconds);
    track.pose.push(track.pose.at(-1)!);
  }
  return outcomes;
}
/** One landing admission owner for movement and its interval bound: support, stance and
 * the footprint reserved against actual current bodies, not a visual sprite rectangle. */
export function admittedLanding(
  world: WorldState,
  entity: Entity,
  waypoint: FlightRoute['points'][number],
  landingOccupancy?: () => LandingOccupancy,
) {
  if (!waypoint.landingSurfaceId) return null;
  const map = spatialMap(world),
    body = bodyProfile(entity);
  const landing = resolveSupport(map, waypoint.position, waypoint.landingSurfaceId);
  return landing &&
    canStand(map, landing, body) &&
    !(landingOccupancy?.() ?? new LandingOccupancy(world)).blocked(entity.id, landing, body)
    ? landing
    : null;
}
/** Other moving bodies reach the occurrence time before landing footprints are reserved.
 * Simultaneous landing attempts then retain the caller's stable identity order. */
export function landingDue(world: WorldState, entity: Entity, seconds: number): boolean {
  if (entity.spatial.fallVelocity !== undefined) {
    const support = supportBelow(spatialMap(world), worldPosition(entity));
    return (
      !!support &&
      fallingDuration(
        entity.spatial.fallVelocity,
        Math.max(0, worldPosition(entity).y - support.y),
      ) <= seconds
    );
  }
  const progress = entity.spatial.flight;
  if (
    !progress ||
    progress.waitSeconds > 0 ||
    !entity.actor?.alive ||
    entity.actor.action ||
    entity.actor.incapacitated
  )
    return false;
  const path = flightPathSeconds(world, entity, Infinity);
  return path.landing && path.stop <= seconds + 1e-9;
}
export function advanceFlight(
  world: WorldState,
  entity: Entity,
  seconds: number,
  events: WorldEvent[],
  landingOccupancy?: () => LandingOccupancy,
  emitOccurrence: (...args: Parameters<typeof emit>) => void = emit,
): void {
  const state = entity.spatial;
  if (!state.flight && state.fallVelocity === undefined) return;
  const map = spatialMap(world),
    body = bodyProfile(entity);
  if (
    worldSupport(entity) === null &&
    state.flight &&
    (!entity.actor?.alive || !activelyParticipates(entity) || entity.actor.incapacitated)
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
      ...worldPosition(entity),
      y: worldPosition(entity).y - fallingDisplacement(state.fallVelocity, seconds),
    };
    const support = supportBelow(map, worldPosition(entity));
    if (support && destination.y <= support.y) {
      setSpatialPosition(world, entity, support, support.surfaceId);
      delete state.fallVelocity;
      emitOccurrence(
        world,
        events,
        'landed',
        `${entity.name} came to rest on the surface below.`,
        entity,
      );
    } else {
      // The finite starter's ground always bounds its corridors. A missing support remains
      // a technical unsupported state; do not delete a body or fabricate a landing.
      if (destination.y < -16) throw new Error('Falling actor left the supported spatial world.');
      setSpatialPosition(world, entity, destination, null);
      state.fallVelocity = velocity;
    }
    return;
  }
  const progress = state.flight;
  if (
    !progress ||
    !entity.actor?.alive ||
    !activelyParticipates(entity) ||
    entity.actor.incapacitated
  )
    return;
  if (entity.actor.action) return; // No second voluntary position writer while a native action owns the body.
  const route = world.flightRoutes[progress.routeId];
  if (!route) throw new Error('Missing admitted native flight route.');
  if (progress.waitSeconds > 0) {
    progress.waitSeconds = Math.max(0, progress.waitSeconds - seconds);
    return;
  }
  // Continue through private mid-air turns within this slice; stop at any observable waypoint.
  let remaining = seconds;
  for (let hop = 0; hop < route.points.length * PATH_HOPS; hop++) {
    const waypoint = route.points[progress.next]!;
    const from = worldPosition(entity),
      to = waypoint.position;
    const separation = distance3D(from, to);
    const speed = flightSpeed(from, to, route);
    if (seconds === 0 && separation > SPATIAL_LIMITS.epsilon) {
      // Taking off is a start-boundary transition, not backdated after movement.
      if (
        worldSupport(entity) !== null &&
        canFlySegment(
          map,
          from,
          interpolate(from, to, Math.min(1, 0.001 / separation)),
          body,
          [worldSupport(entity), waypoint.landingSurfaceId].filter((id): id is string => !!id),
        )
      ) {
        setSpatialPosition(world, entity, from, null);
        emitOccurrence(world, events, 'takeoff', `${entity.name} took flight.`, entity);
      }
      return;
    }
    const fraction = separation <= 1e-8 ? 1 : Math.min(1, (speed * remaining) / separation);
    const next = interpolate(from, to, fraction);
    // The start boundary marks takeoff before elapsed movement. Its first sweep still
    // touches the departure top; recover that exact contact, never an arbitrary floor.
    // canFlySegment permits top contact while continuing to reject underside crossings.
    const departureSupport = worldSupport(entity) ?? resolveSupport(map, from)?.surfaceId;
    const ignoredSupports = [departureSupport, waypoint.landingSurfaceId].filter(
      (id): id is string => !!id,
    );
    if (!canFlySegment(map, from, next, body, ignoredSupports)) return;
    const landing =
      fraction === 1 ? admittedLanding(world, entity, waypoint, landingOccupancy) : null;
    if (waypoint.landingSurfaceId && fraction === 1 && !landing) return;
    const wasGrounded = worldSupport(entity) !== null;
    setSpatialPosition(world, entity, next, landing?.surfaceId ?? null);
    if (wasGrounded && !landing)
      emitOccurrence(world, events, 'takeoff', `${entity.name} took flight.`, entity);
    if (fraction !== 1) return;
    progress.next = (progress.next + 1) % route.points.length;
    progress.waitSeconds = waypoint.waitSeconds;
    if (landing)
      emitOccurrence(
        world,
        events,
        'landed',
        `${entity.name} landed on ${surfaceById(map, landing.surfaceId)!.name.toLowerCase()}.`,
        entity,
      );
    if (waypoint.landingSurfaceId || waypoint.waitSeconds > 0) return;
    remaining -= separation <= 1e-8 ? 0 : separation / speed;
    if (remaining <= 1e-9) return;
  }
}
