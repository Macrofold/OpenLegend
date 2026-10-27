import { namePhrase } from '@open-legend/language';
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
import {
  effectiveBodyProfile,
  setSpatialPosition,
  spatialMap,
  flightRouteDigest,
} from './spatial-state.js';
import { emit } from './events.js';
import { nativeResponseProfile, nativeResponseMovementFactor } from './native-response.js';
import { readNativeDangers, nativeDangersClearAt } from './native-response-danger.js';
import { TIME_EPSILON } from './simulation-time.js';
import { recordSemanticChange } from './dependencies.js';
import { chargeWork } from './work-budget.js';
import type { FlightRoute, FlightConnection } from './spatial-state.js';
import type { NativeFlightLocomotion } from './native-response.js';
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
  constructor(private readonly world: WorldState) {
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
    const body = effectiveBodyProfile(this.world, entity);
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
export const FALL_ACCELERATION = 0.04;
export const TERMINAL_FALL_SPEED = 3;
/** Closed-form displacement keeps falling independent of host interval size. */
export function fallingDisplacement(velocity: number, seconds: number): number {
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
function routineHeldForAlarm(entity: Entity): boolean {
  return !!(
    entity.animal?.episode &&
    entity.spatial.flight &&
    !entity.spatial.flight.nativeLocomotion &&
    worldSupport(entity) !== null
  );
}
function effectiveFlightSpeed(
  world: WorldState,
  entity: Entity,
  route: FlightRoute,
): { speed: number; climbSpeed: number } {
  const binding = entity.spatial.flight?.nativeLocomotion;
  if (!binding) return route;
  const profile = nativeResponseProfile(world, binding.profile);
  // A forecast can reach a later joined corridor before actual progress does.
  // The captured digest belongs to that actual current corridor until the join.
  const current = world.flightRoutes[entity.spatial.flight!.routeId];
  if (!profile || !current || binding.routeDigest !== flightRouteDigest(current))
    throw new Error('Changed admitted native flight definition.');
  const speed = profile.locomotion[binding.locomotion]?.flightEscape;
  if (speed === undefined) throw new Error('Missing admitted flight movement profile.');
  const factor = nativeResponseMovementFactor(world, entity, profile);
  return { speed: speed * factor, climbSpeed: route.climbSpeed * factor };
}
/** Stop the physical flight at this exact boundary before asking the one native
 * controller for a further finite leg. No preceding time belongs to that choice. */
function requestFlightChoice(world: WorldState, entity: Entity): void {
  const flight = entity.spatial.flight;
  if (!flight?.nativeLocomotion || flight.stopAtLanding) return;
  flight.awaitingChoice = true;
  const episode = entity.animal?.episode;
  if (episode && episode.id === flight.nativeLocomotion.episodeId) {
    episode.reviewAt = world.simTime;
    recordSemanticChange(world, { kind: 'state', entityId: entity.id, field: 'behavior' });
  }
}
/** Already airborne control changes retain movement only through the next real
 * landing. A supported body has no released flight to preserve. */
export function retireNativeFlight(world: WorldState, entity: Entity): void {
  const flight = entity.spatial.flight;
  if (!flight?.nativeLocomotion) return;
  if (flight.nativeLocomotion.physicalLife !== (entity.actor?.physicalLife ?? 0)) {
    recoverUnavailableNativeFlight(entity);
    return;
  }
  if (worldSupport(entity) !== null) {
    delete entity.spatial.flight;
    return;
  }
  flight.stopAtLanding = true;
  delete flight.awaitingChoice;
  delete flight.nativeLocomotion.stopAt;
  const route = world.flightRoutes[flight.routeId]!;
  const seen = new Set<string>();
  let cursor: { route: FlightRoute; next: number } | undefined = { route, next: flight.next },
    landing = false;
  while (cursor) {
    const key = JSON.stringify([cursor.route.id, cursor.next]);
    if (seen.has(key)) break;
    seen.add(key);
    if (cursor.route.points[cursor.next]!.landingSurfaceId) {
      landing = true;
      break;
    }
    cursor = flightSuccessor(world, cursor.route, cursor.next);
  }
  if (!landing) {
    delete entity.spatial.flight;
    entity.spatial.fallVelocity = 0;
  }
}
export function finishNativeFlightResponse(entity: Entity): void {
  if (entity.spatial.flight) delete entity.spatial.flight.nativeLocomotion;
}
/** A supported routine perch can be the safe settling place too. Preserve its
 * actual arrived waypoint so finishing a decorative wait cannot restart flight. */
export function holdNativeFlightPerch(world: WorldState, entity: Entity): void {
  const flight = entity.spatial.flight;
  if (!flight || flight.atRest || worldSupport(entity) === null) return;
  const route = world.flightRoutes[flight.routeId]!,
    arrived = (flight.next + route.points.length - 1) % route.points.length,
    point = route.points[arrived]!;
  if (
    point.landingSurfaceId !== worldSupport(entity) ||
    distance3D(point.position, worldPosition(entity)) > SPATIAL_LIMITS.epsilon
  )
    return;
  flight.next = arrived;
  flight.waitSeconds = 0;
  flight.atRest = true;
}
export function recoverUnavailableNativeFlight(entity: Entity): void {
  if (worldSupport(entity) !== null) delete entity.spatial.flight;
  else {
    delete entity.spatial.flight;
    entity.spatial.fallVelocity = 0;
  }
}
/** A completely prepared connection grants progress, never an immediate position
 * change. The ordinary flight owner performs takeoff and every later sweep. */
export function startNativeFlight(
  entity: Entity,
  connection: FlightConnection,
  binding: NativeFlightLocomotion,
): void {
  entity.spatial.flight = {
    routeId: connection.routeId,
    next: connection.next,
    waitSeconds: 0,
    nativeLocomotion: binding,
  };
}
/** A joined route can be faster within the same interval. Candidate envelopes
 * must cover that whole admitted continuation, not only the present leg. */
export function flightMaximumSpeed(world: WorldState, entity: Entity): number {
  const progress = entity.spatial.flight;
  if (!progress || progress.atRest || progress.awaitingChoice || routineHeldForAlarm(entity))
    return 0;
  const initial = world.flightRoutes[progress.routeId];
  if (!initial) throw new Error('Missing admitted native flight route.');
  if (progress.nativeLocomotion || initial.continuation.kind !== 'join')
    return effectiveFlightSpeed(world, entity, initial).speed;
  const seen = new Set<string>();
  let routeId = progress.routeId,
    maximum = 0;
  while (!seen.has(routeId)) {
    chargeWork({ tests: 1 });
    seen.add(routeId);
    const route = world.flightRoutes[routeId];
    if (!route) throw new Error('Missing admitted native flight route.');
    maximum = Math.max(maximum, route.speed);
    if (route.continuation.kind !== 'join') break;
    routeId = route.continuation.routeId;
  }
  return maximum;
}
/** Game seconds one lap of a route takes, visiting every waypoint once (waits excluded). */
const lapSeconds = new WeakMap<FlightRoute, number>();
export function routeLapSeconds(route: FlightRoute): number {
  if (route.continuation.kind !== 'loop') return Infinity;
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

/** The same admitted successor is used by prediction and execution. A join
 * changes only the route reference at its exact shared point, never position. */
function flightSuccessor(
  world: WorldState,
  route: FlightRoute,
  arrived: number,
): { route: FlightRoute; next: number } | undefined {
  if (arrived + 1 < route.points.length) return { route, next: arrived + 1 };
  const continuation = route.continuation;
  if (continuation.kind === 'loop') return { route, next: 0 };
  if (continuation.kind === 'join')
    return { route: world.flightRoutes[continuation.routeId]!, next: continuation.next };
  return undefined;
}
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
  if (progress.atRest || progress.awaitingChoice || routineHeldForAlarm(entity))
    return { stop: Infinity, landing: false, travel: Infinity };
  let route = world.flightRoutes[progress.routeId]!;
  let position = worldPosition(entity),
    next = progress.next,
    seconds = 0,
    path = 0;
  for (let hop = 0; hop < route.points.length * PATH_HOPS; hop++) {
    const waypoint = route.points[next]!;
    const distance = distance3D(position, waypoint.position);
    const speed = flightSpeed(
      position,
      waypoint.position,
      effectiveFlightSpeed(world, entity, route),
    );
    const travel =
      path + distance >= travelLimit ? seconds + (travelLimit - path) / speed : Infinity;
    seconds += distance / speed;
    if (
      waypoint.landingSurfaceId ||
      waypoint.waitSeconds > 0 ||
      progress.nativeLocomotion?.stopAt === next
    )
      return { stop: seconds, landing: !!waypoint.landingSurfaceId, travel, waypoint };
    if (travel !== Infinity) return { stop: Infinity, landing: false, travel };
    path += distance;
    position = waypoint.position;
    const successor = flightSuccessor(world, route, next);
    if (!successor) return { stop: seconds, landing: true, travel, waypoint };
    ({ route, next } = successor);
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
/** Sample the same piecewise path used by motion-boundary consumers. */
export function motionTrackPosition(track: MotionTrack, t: number): WorldPoint {
  let i = 1;
  while (i < track.at.length - 1 && track.at[i]! < t) i++;
  const a = track.at[i - 1]!,
    b = track.at[i]!;
  return b > a
    ? interpolate(track.pose[i - 1]!, track.pose[i]!, Math.min(1, Math.max(0, (t - a) / (b - a))))
    : track.pose[i]!;
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
    progress.atRest ||
    progress.awaitingChoice ||
    routineHeldForAlarm(entity) ||
    progress.waitSeconds > 0 ||
    entity.spatial.fallVelocity !== undefined ||
    !entity.actor?.alive ||
    !activelyParticipates(entity) ||
    entity.actor.incapacitated ||
    entity.actor.action
  )
    return undefined;
  let route = world.flightRoutes[progress.routeId]!;
  const map = spatialMap(world),
    body = effectiveBodyProfile(world, entity);
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
    const speed = flightSpeed(from, to, effectiveFlightSpeed(world, entity, route));
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
    if (
      fraction !== 1 ||
      waypoint.landingSurfaceId ||
      waypoint.waitSeconds > 0 ||
      progress.nativeLocomotion?.stopAt === next
    )
      break;
    const successor = flightSuccessor(world, route, next);
    if (!successor) break;
    ({ route, next } = successor);
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
    body = effectiveBodyProfile(world, entity);
  const landing = resolveSupport(map, waypoint.position, waypoint.landingSurfaceId);
  if (entity.spatial.flight?.nativeLocomotion && !entity.spatial.flight.stopAtLanding) {
    const episode = entity.animal?.episode;
    if (!episode) return null;
    const frame = readNativeDangers(world, entity, episode);
    if (
      frame.status !== 'complete' ||
      !nativeDangersClearAt(entity, waypoint.position, frame, world.simTime)
    )
      return null;
  }
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
    progress.atRest ||
    progress.awaitingChoice ||
    routineHeldForAlarm(entity) ||
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
    body = effectiveBodyProfile(world, entity);
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
      setSpatialPosition(world, entity, support, support.surfaceId, { continuity: 'physical' });
      delete state.fallVelocity;
      emitOccurrence(
        world,
        events,
        'landed',
        `${namePhrase(entity, 'definite', { capitalize: true })} came to rest on the surface below.`,
        entity,
      );
    } else {
      // The finite starter's ground always bounds its corridors. A missing support remains
      // a technical unsupported state; do not delete a body or fabricate a landing.
      if (destination.y < -16) throw new Error('Falling actor left the supported spatial world.');
      setSpatialPosition(world, entity, destination, null, { continuity: 'physical' });
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
  let route = world.flightRoutes[progress.routeId];
  if (!route) throw new Error('Missing admitted native flight route.');
  // An alarm chooses before an unreleased routine takeoff. Removing support
  // first would make its actual floor look like an obstacle to the new connector.
  if (routineHeldForAlarm(entity)) return;
  if (progress.atRest) {
    // Resume only at a start boundary; none of the preceding interval belongs
    // to this new departure. Active settling keeps the actual perch.
    if (
      seconds === 0 &&
      !entity.animal?.episode &&
      !progress.stopAtLanding &&
      entity.actor.controller === 'native'
    ) {
      if (route.continuation.kind !== 'land') {
        const successor = flightSuccessor(world, route, progress.next);
        if (
          !successor ||
          !admittedLanding(world, entity, route.points[progress.next]!, landingOccupancy)
        )
          return;
        progress.routeId = successor.route.id;
        progress.next = successor.next;
        delete progress.atRest;
        advanceFlight(world, entity, 0, events, landingOccupancy, emitOccurrence);
        return;
      }
      const resumeId = route.continuation.resumeRouteId;
      if (!resumeId) return;
      const resume = world.flightRoutes[resumeId],
        departure = resume?.points[0];
      if (
        !departure?.landingSurfaceId ||
        worldSupport(entity) !== departure.landingSurfaceId ||
        distance3D(worldPosition(entity), departure.position) > SPATIAL_LIMITS.epsilon ||
        !canStand(map, { ...departure.position, surfaceId: departure.landingSurfaceId }, body)
      )
        return;
      progress.routeId = resumeId;
      progress.next = 1;
      delete progress.atRest;
      advanceFlight(world, entity, 0, events, landingOccupancy, emitOccurrence);
    }
    return;
  }
  if (progress.awaitingChoice) return;
  if (progress.waitSeconds > 0) {
    const remaining = progress.waitSeconds - seconds;
    progress.waitSeconds = remaining > TIME_EPSILON ? remaining : 0;
    // The wait ends at this endpoint. Prepare departure now, without backdating
    // flight movement or depending on a floating-point sliver causing another slice.
    if (progress.waitSeconds === 0)
      advanceFlight(world, entity, 0, events, landingOccupancy, emitOccurrence);
    return;
  }
  // Continue through private mid-air turns within this slice; stop at any observable waypoint.
  let remaining = seconds;
  for (let hop = 0; hop < route.points.length * PATH_HOPS; hop++) {
    const waypoint = route.points[progress.next]!;
    const from = worldPosition(entity),
      to = waypoint.position;
    const separation = distance3D(from, to);
    const speed = flightSpeed(from, to, effectiveFlightSpeed(world, entity, route));
    // Do not advance an arbitrary prefix of a descent toward a landing already
    // known to be unavailable. Otherwise the refused pose depends on host slices.
    // This is current admission only: the footprint is checked again on arrival.
    if (waypoint.landingSurfaceId && !admittedLanding(world, entity, waypoint, landingOccupancy)) {
      if (progress.stopAtLanding) recoverUnavailableNativeFlight(entity);
      else requestFlightChoice(world, entity);
      return;
    }
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
        setSpatialPosition(world, entity, from, null, { continuity: 'physical' });
        emitOccurrence(
          world,
          events,
          'takeoff',
          `${namePhrase(entity, 'definite', { capitalize: true })} took flight.`,
          entity,
        );
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
    if (!canFlySegment(map, from, next, body, ignoredSupports)) {
      if (progress.stopAtLanding) {
        recoverUnavailableNativeFlight(entity);
        return;
      }
      requestFlightChoice(world, entity);
      return;
    }
    const landing =
      fraction === 1 ? admittedLanding(world, entity, waypoint, landingOccupancy) : null;
    if (waypoint.landingSurfaceId && fraction === 1 && !landing) {
      if (progress.stopAtLanding) {
        recoverUnavailableNativeFlight(entity);
        return;
      }
      requestFlightChoice(world, entity);
      return;
    }
    const wasGrounded = worldSupport(entity) !== null;
    setSpatialPosition(world, entity, next, landing?.surfaceId ?? null, { continuity: 'physical' });
    if (wasGrounded && !landing)
      emitOccurrence(
        world,
        events,
        'takeoff',
        `${namePhrase(entity, 'definite', { capitalize: true })} took flight.`,
        entity,
      );
    if (fraction !== 1) return;
    if (progress.nativeLocomotion?.stopAt === progress.next) {
      requestFlightChoice(world, entity);
      return;
    }
    if (landing && progress.stopAtLanding) {
      progress.atRest = true;
      progress.waitSeconds = 0;
      delete progress.nativeLocomotion;
    } else {
      const successor = flightSuccessor(world, route, progress.next);
      if (successor) {
        if (route.id !== successor.route.id)
          recordSemanticChange(world, { kind: 'state', entityId: entity.id, field: 'behavior' });
        route = successor.route;
        progress.routeId = route.id;
        progress.next = successor.next;
        if (progress.nativeLocomotion)
          progress.nativeLocomotion.routeDigest = flightRouteDigest(route);
      } else {
        progress.atRest = true;
      }
      progress.waitSeconds = waypoint.waitSeconds;
    }
    if (landing)
      emitOccurrence(
        world,
        events,
        'landed',
        `${namePhrase(entity, 'definite', { capitalize: true })} landed on ${namePhrase(surfaceById(map, landing.surfaceId)!, 'definite')}.`,
        entity,
      );
    if (waypoint.landingSurfaceId || waypoint.waitSeconds > 0) return;
    remaining -= separation <= 1e-8 ? 0 : separation / speed;
    if (remaining <= 1e-9) return;
  }
}
