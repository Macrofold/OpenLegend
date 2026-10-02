import {
  canWalkSegment,
  clearOf,
  surfaceById,
  surfaceHeight,
  distance3D,
  interpolate,
  quadraticRoots,
  sightChangeFractions,
  sightObstacles,
  SPATIAL_LIMITS,
  type SightObstacle,
  supportBelow,
  type WorldPoint,
} from '@open-legend/spatial';
import {
  admittedLanding,
  fallingDuration,
  flightPathSeconds,
  flightTracks,
  LandingOccupancy,
  routeLapSeconds,
  TERMINAL_FALL_SPEED,
  type MotionTrack,
} from './flight.js';
import { worldRootEntities } from './entity-index.js';
import { hasMemory } from './living.js';
import { activelyParticipates } from './participation-state.js';
import { sensesFor, visionRadius } from './perception.js';
import { sameSurfacePoint, spatialCandidates } from './spatial.js';
import { bodyProfile, spatialMap, worldPosition, worldSupport } from './spatial-state.js';
import { capabilityBlocked } from './status-capabilities.js';
import { TIME_EPSILON } from './simulation-time.js';
import { chargeWork } from './work-budget.js';
import { BASE_ACTION_DEFAULTS, nativeMovementSpeed } from './worlds/base/actions.js';
import { BASE_TIME_POLICY } from './worlds/base/time.js';
import type { Entity, WorldState } from './types.js';

/** An unavailable landing closer than this retries at the flyer's sensing cadence instead of
 * at its remaining gap, which an unrelated boundary can make arbitrarily small. */
const IMMINENT_LANDING_SECONDS = 1;

/** Conservative reach over one shared interval. Native decisions/actions are reconsidered
 * before a new interval; unsupported future movers must add their own bound here.
 */
function motionReach(world: WorldState, entity: Entity, seconds: number): number {
  if (capabilityBlocked(world, entity, 'locomotion')) return 0;
  if (entity.spatial.fallVelocity !== undefined) return TERMINAL_FALL_SPEED * seconds;
  if (!entity.actor?.alive || entity.actor.incapacitated) return 0;
  if (entity.actor.action)
    return entity.actor.action.stage === 'approaching'
      ? BASE_ACTION_DEFAULTS.movementTilesPerSecond * seconds
      : 0;
  if (entity.spatial.flight)
    return world.flightRoutes[entity.spatial.flight.routeId]!.speed * seconds;
  return entity.animal
    ? entity.animal.fleeSeconds > 0 && entity.animal.fleeFrom
      ? BASE_ACTION_DEFAULTS.animalFleeTilesPerSecond * seconds + 0.4
      : 0.4
    : 0;
}
/** A distant tiny sense must not split every flyer's travel. Reachable envelopes include
 * both moving participants and their extents; false positives only shorten a slice.
 * docs/worlds/base/time.md#spatial-fidelity */
export function motionTravelBounds(
  world: WorldState,
  seconds: number,
  actorIds: readonly string[],
  moverIds: readonly string[],
) {
  const observers = actorIds.flatMap((id) => {
    const entity = world.entities[id];
    if (!entity?.actor?.alive || entity.actor.incapacitated || !hasMemory(entity)) return [];
    const senses = sensesFor(world, entity).filter(
      (s): s is Extract<typeof s, { radius: number }> =>
        'radius' in s && s.radius > 0 && s.radius / 4 < BASE_TIME_POLICY.perceptionTravelMetres,
    );
    if (!senses.length) return [];
    const radius = Math.max(...senses.map((s) => s.radius));
    return [
      {
        position: { ...worldPosition(entity) },
        radius,
        reach: motionReach(world, entity, seconds) + bodyProfile(entity).height,
        travel: Math.min(
          BASE_TIME_POLICY.perceptionTravelMetres,
          ...senses.map((s) => s.radius / 4),
        ),
      },
    ];
  });
  if (!observers.length) return () => BASE_TIME_POLICY.perceptionTravelMetres;
  const near = spatialCandidates(observers);
  const maximum = observers.reduce(
    (max, observer) => Math.max(max, observer.radius + observer.reach),
    0,
  );
  const bounds = new Map<string, number>();
  for (const id of moverIds) {
    const entity = world.entities[id]!;
    const position = worldPosition(entity);
    const reach = motionReach(world, entity, seconds) + bodyProfile(entity).height;
    let travel: number = BASE_TIME_POLICY.perceptionTravelMetres;
    for (const observer of near(position, reach + maximum))
      if (distance3D(position, observer.position) <= reach + observer.reach + observer.radius)
        travel = Math.min(travel, observer.travel);
    bounds.set(id, travel);
  }
  return travelLookup(bounds, Math.min(...observers.map((observer) => observer.travel)));
}

/** The continuation holds only scalar bounds, never the draft used to derive them. */
function travelLookup(bounds: ReadonlyMap<string, number>, fallback: number) {
  return (id: string) => bounds.get(id) ?? fallback;
}

/** Private motion/sensing boundary; it does not require restarting unrelated native work. */
export function nativeMotionInterval(
  world: WorldState,
  requested: number,
  ambientIds: readonly string[],
  travelFor: (id: string) => number,
): number {
  let bound = requested;
  let occupancy: LandingOccupancy | undefined;
  for (const id of ambientIds) {
    const entity = world.entities[id];
    // Only falls, flight, fleeing and small-sense wander can bound a slice; check those first.
    if (
      !entity ||
      (entity.spatial.fallVelocity === undefined &&
        !entity.spatial.flight &&
        !(entity.animal && (entity.animal.fleeSeconds > 0 || travelFor(id) < 0.4))) ||
      capabilityBlocked(world, entity, 'locomotion')
    )
      continue;
    if (entity.spatial.fallVelocity !== undefined) {
      const travel = travelFor(id);
      const support = supportBelow(spatialMap(world), worldPosition(entity));
      bound = Math.min(
        bound,
        fallingDuration(
          entity.spatial.fallVelocity,
          Math.min(travel, support ? Math.max(0, worldPosition(entity).y - support.y) : travel),
        ),
      );
      continue;
    }
    if (!entity.actor?.alive || entity.actor.incapacitated || entity.actor.action) continue;
    const flight = entity.spatial.flight;
    if (flight) {
      if (flight.waitSeconds > 0) bound = Math.min(bound, flight.waitSeconds);
      else {
        const path = flightPathSeconds(world, entity, travelFor(id));
        const route = world.flightRoutes[flight.routeId]!;
        // A landing is reached exactly at arrival. A refused landing leaves the body where that
        // slice began, so it retries after the same gap. That gap can be arbitrarily small and a
        // departing occupant clears with no exact deadline, so an unavailable landing under one
        // game second away retries at the one-metre sensing cadence instead (PF13.16). So does
        // every landing on a route whose whole lap takes under a game second: such a flyer would
        // otherwise land again at every tiny slice. docs/worlds/base/time.md#spatial-fidelity
        const cadence = travelFor(id) / route.speed;
        const held =
          path.landing &&
          path.stop < Math.min(requested, IMMINENT_LANDING_SECONDS, cadence) &&
          (routeLapSeconds(route) < IMMINENT_LANDING_SECONDS ||
            !admittedLanding(
              world,
              entity,
              path.waypoint!,
              () => (occupancy ??= new LandingOccupancy(world)),
            ));
        bound = Math.min(bound, path.travel, held ? cadence : path.stop);
      }
    } else if (entity.animal) {
      const travel = travelFor(id);
      const animal = entity.animal;
      if (animal.fleeSeconds > 0 && animal.fleeFrom)
        bound = Math.min(bound, animal.fleeSeconds, travel / nativeMovementSpeed(entity, true));
      else if (travel < 0.4 && animal.wanderSeconds > TIME_EPSILON)
        bound = Math.min(bound, animal.wanderSeconds);
    }
  }
  return Math.min(requested, Math.max(TIME_EPSILON, bound));
}

/** Seam with perception.ts visionQuery: foot-to-foot range, eye height and these three body
 * sample fractions decide sight. Keep them equal; a sense change must update both owners. */
const SIGHT_FRACTIONS = [0.85, 0.5, 0.15] as const;
/** Runs shorter than this are floating-point tangency noise, not separable exposure. */
const MINIMUM_RUN_SECONDS = 1e-9;

function poseAt(track: MotionTrack, t: number): WorldPoint {
  let i = 1;
  while (i < track.at.length - 1 && track.at[i]! < t) i++;
  const a = track.at[i - 1]!,
    b = track.at[i]!;
  return b > a
    ? interpolate(track.pose[i - 1]!, track.pose[i]!, Math.min(1, Math.max(0, (t - a) / (b - a))))
    : track.pose[i]!;
}
const lift = (p: WorldPoint, y: number): WorldPoint => ({ x: p.x, y: p.y + y, z: p.z });

/** Approach along an unchanged fixed route; routes toward living targets can replan inside the
 * slice and keep the declared sampled bound. Sweeps can fail, so staying put is an outcome. */
function walkerTracks(entity: Entity, seconds: number): MotionTrack[] | 'sampled' | undefined {
  const action = entity.actor?.action;
  if (action?.stage !== 'approaching' || action.navigation || !action.path.length) return;
  if (action.type !== 'move') return 'sampled';
  const start = { ...worldPosition(entity) },
    point = action.path[0]!,
    speed = nativeMovementSpeed(entity);
  const delta = distance3D(start, point),
    travel = speed * seconds;
  const arrival = delta <= travel ? (delta > 0 ? delta / speed : 0) : seconds;
  const end =
    delta <= travel
      ? { x: point.x, y: point.y, z: point.z }
      : interpolate(start, point, travel / delta);
  return [
    { at: [0, arrival, seconds], pose: [start, end, end] },
    { at: [0, seconds], pose: [start, start] },
  ];
}
/** A flee step takes the first walkable of three directions; each and staying put are outcomes.
 * A shorter actual slice can make a direction walkable whose full step leaves the surface, so
 * every direction is predicted along its planar support. */
function fleeTracks(world: WorldState, entity: Entity, seconds: number): MotionTrack[] | undefined {
  const animal = entity.animal;
  if (!animal || !(animal.fleeSeconds > 0) || !animal.fleeFrom) return;
  const surface = surfaceById(spatialMap(world), worldSupport(entity) ?? '');
  const start = { ...worldPosition(entity) };
  let dx = start.x - animal.fleeFrom.x,
    dz = start.z - animal.fleeFrom.z;
  const length = Math.hypot(dx, dz) || 1;
  dx /= length;
  dz /= length;
  const step = nativeMovementSpeed(entity, true) * seconds;
  const outcomes: MotionTrack[] = [{ at: [0, seconds], pose: [start, start] }];
  if (!surface) return outcomes;
  for (const [x, z] of [
    [dx, dz],
    [-dz, dx],
    [dz, -dx],
  ] as const) {
    const end = { x: start.x + x * step, z: start.z + z * step };
    outcomes.push({
      at: [0, seconds],
      pose: [start, { ...end, y: surfaceHeight(surface, end.x, end.z) }],
    });
  }
  return outcomes;
}

interface Run {
  start: number;
  end: number;
  value: boolean;
}
/** Constant-predicate runs over [0, horizon]; `cuts` must hold every time it can change. */
function runsOf(horizon: number, cuts: number[], holds: (t: number) => boolean): Run[] {
  const times = [0, ...cuts.filter((t) => t > 0 && t < horizon).sort((a, b) => a - b), horizon];
  const runs: Run[] = [];
  for (let i = 0; i + 1 < times.length; i++) {
    const a = times[i]!,
      b = times[i + 1]!;
    if (b <= a) continue;
    const value = holds((a + b) / 2),
      last = runs.at(-1);
    if (last?.value === value) last.end = b;
    else runs.push({ start: a, end: b, value });
  }
  return runs;
}
/** The run holding `from` was sampled there. Return the midpoint of the first later run that
 * ends before `to`, which a sample only at `to` would skip, or Infinity. */
function interiorOf(runs: readonly Run[], from: number, to: number): number {
  for (const run of runs) {
    if (run.start <= from) continue;
    if (run.end >= to) return Infinity;
    if (run.end - run.start >= MINIMUM_RUN_SECONDS) return (run.start + run.end) / 2;
  }
  return Infinity;
}
function mergedCuts(first: MotionTrack, second: MotionTrack): number[] {
  return [...new Set([...first.at, ...second.at])].sort((a, b) => a - b);
}
function visionRuns(
  world: WorldState,
  observer: { track: MotionTrack; radius: number; eye: number },
  target: { track: MotionTrack; height: number },
  horizon: number,
): Run[] {
  const map = spatialMap(world);
  const pieces = mergedCuts(observer.track, target.track);
  const cuts = [...pieces];
  const heights = SIGHT_FRACTIONS.map((f) => target.height * f);
  // Obstacles per sample ray; each ray's own hull rejects far more shapes than their union.
  const blockers = heights.map((): SightObstacle[] => []);
  for (let i = 0; i + 1 < pieces.length; i++) {
    const a = pieces[i]!,
      b = pieces[i + 1]!;
    if (b <= a) continue;
    chargeWork({ tests: 1 });
    const f0 = poseAt(observer.track, a),
      f1 = poseAt(observer.track, b),
      p0 = poseAt(target.track, a),
      p1 = poseAt(target.track, b);
    const r0 = { x: p0.x - f0.x, y: p0.y - f0.y, z: p0.z - f0.z };
    const dv = { x: p1.x - f1.x - r0.x, y: p1.y - f1.y - r0.y, z: p1.z - f1.z - r0.z };
    const roots: number[] = [];
    quadraticRoots(
      dv.x * dv.x + dv.y * dv.y + dv.z * dv.z,
      2 * (r0.x * dv.x + r0.y * dv.y + r0.z * dv.z),
      r0.x * r0.x + r0.y * r0.y + r0.z * r0.z - observer.radius * observer.radius,
      roots,
    );
    const e0 = lift(f0, observer.eye),
      e1 = lift(f1, observer.eye);
    heights.forEach((h, k) => {
      const ray = [e0, e1, lift(p0, h), lift(p1, h)] as const;
      const near = sightObstacles(map, ray);
      if (!near.length) return;
      blockers[k]!.push(...near);
      roots.push(...sightChangeFractions(near, ...ray));
    });
    for (const u of roots) if (u > 0 && u < 1) cuts.push(a + u * (b - a));
  }
  return runsOf(horizon, cuts, (t) => {
    const f = poseAt(observer.track, t),
      p = poseAt(target.track, t);
    if (distance3D(f, p) > observer.radius) return false;
    const eye = lift(f, observer.eye);
    return heights.some((h, k) => clearOf(blockers[k]!, eye, lift(p, h)));
  });
}
/** Mirrors bodiesTouch and hasLineOfEffect: upright cylinders plus a clear interaction ray. */
function contactRuns(
  world: WorldState,
  first: { track: MotionTrack; entity: Entity },
  second: { track: MotionTrack; entity: Entity },
  horizon: number,
): Run[] {
  const map = spatialMap(world);
  const a = bodyProfile(first.entity),
    b = bodyProfile(second.entity);
  const tolerance = SPATIAL_LIMITS.epsilon,
    reach = a.radius + b.radius + tolerance;
  const pieces = mergedCuts(first.track, second.track);
  const cuts = [...pieces];
  const blockers: SightObstacle[] = [];
  for (let i = 0; i + 1 < pieces.length; i++) {
    const t0 = pieces[i]!,
      t1 = pieces[i + 1]!;
    if (t1 <= t0) continue;
    chargeWork({ tests: 1 });
    const f0 = poseAt(first.track, t0),
      f1 = poseAt(first.track, t1),
      s0 = poseAt(second.track, t0),
      s1 = poseAt(second.track, t1);
    const x0 = s0.x - f0.x,
      z0 = s0.z - f0.z,
      dx = s1.x - f1.x - x0,
      dz = s1.z - f1.z - z0;
    const roots: number[] = [];
    quadraticRoots(
      dx * dx + dz * dz,
      2 * (x0 * dx + z0 * dz),
      x0 * x0 + z0 * z0 - reach * reach,
      roots,
    );
    const y0 = s0.y - f0.y,
      dy = s1.y - f1.y - y0;
    if (dy) roots.push((-b.height - tolerance - y0) / dy, (a.height + tolerance - y0) / dy);
    const anchors = [
      lift(f0, a.interactionHeight),
      lift(f1, a.interactionHeight),
      lift(s0, b.interactionHeight),
      lift(s1, b.interactionHeight),
    ] as const;
    const near = sightObstacles(map, anchors);
    blockers.push(...near);
    roots.push(...sightChangeFractions(near, ...anchors));
    for (const u of roots) if (u > 0 && u < 1) cuts.push(t0 + u * (t1 - t0));
  }
  return runsOf(horizon, cuts, (t) => {
    const f = poseAt(first.track, t),
      s = poseAt(second.track, t);
    return (
      (f.x - s.x) ** 2 + (f.z - s.z) ** 2 <= reach ** 2 &&
      f.y <= s.y + b.height + tolerance &&
      s.y <= f.y + a.height + tolerance &&
      clearOf(blockers, lift(f, a.interactionHeight), lift(s, b.interactionHeight))
    );
  });
}

/** A track that holds for sure until `until` (absolute time) unless its body deviates. */
interface CertainTrack {
  at: number;
  until: number;
  track: MotionTrack;
}
/** Derived crossing runs reused across slices: never saved, and holding only copied scalars.
 * Tracks are checked against actual poses each slice; any deviation, local re-prediction or
 * global rebuild forgets them. */
export interface CrossingCache {
  tracks: Map<string, CertainTrack>;
  pairs: Map<string, { ids: readonly [string, string]; at: number; until: number; runs: Run[] }>;
  /** Runs of uncertain outcomes keyed by their exact track content, e.g. a held flyer's. */
  outcomes: Map<string, Run[]>;
}
export const crossingCache = (): CrossingCache => ({
  tracks: new Map(),
  pairs: new Map(),
  outcomes: new Map(),
});
export function forgetCrossings(cache: CrossingCache, ids: Iterable<string>): void {
  for (const id of ids) {
    if (!cache.tracks.delete(id)) continue;
    for (const [key, pair] of cache.pairs) if (pair.ids.includes(id)) cache.pairs.delete(key);
  }
}
/** The part of a certain track over [from, to], re-based to start at zero. */
function window(certain: CertainTrack, from: number, to: number): MotionTrack {
  const track = certain.track,
    start = from - certain.at,
    end = to - certain.at;
  const at = [0],
    pose = [poseAt(track, start)];
  for (let i = 0; i < track.at.length; i++)
    if (track.at[i]! > start && track.at[i]! < end) {
      at.push(track.at[i]! - start);
      pose.push(track.pose[i]!);
    }
  at.push(end - start);
  pose.push(poseAt(track, end));
  return { at, pose };
}
/** A route walker follows fixed, statically clear segments at a constant speed. */
function walkerCertainTrack(
  world: WorldState,
  entity: Entity,
  horizon: number,
): MotionTrack | undefined {
  const action = entity.actor?.action;
  if (action?.stage !== 'approaching' || action.type !== 'move' || action.navigation) return;
  const support = worldSupport(entity);
  if (!support) return;
  const map = spatialMap(world),
    body = bodyProfile(entity),
    speed = nativeMovementSpeed(entity);
  let from = { ...worldPosition(entity), surfaceId: support };
  const track: MotionTrack = { at: [0], pose: [{ x: from.x, y: from.y, z: from.z }] };
  for (const point of action.path) {
    const begin = track.at.at(-1)!;
    if (begin >= horizon) break;
    if (!canWalkSegment(map, from, point, body)) return;
    const arrival = begin + distance3D(from, point) / speed;
    const end = { x: point.x, y: point.y, z: point.z };
    track.at.push(Math.min(horizon, arrival));
    track.pose.push(
      arrival <= horizon
        ? end
        : interpolate(track.pose.at(-1)!, end, (horizon - begin) / (arrival - begin)),
    );
    from = point;
  }
  if (track.at.at(-1)! < horizon) {
    track.at.push(horizon);
    track.pose.push(track.pose.at(-1)!);
  }
  return track;
}
/** Forks of one continuation must not share mutable derived state. */
export function copyCrossings(cache: CrossingCache): CrossingCache {
  return {
    tracks: new Map(cache.tracks),
    pairs: new Map(cache.pairs),
    outcomes: new Map(cache.outcomes),
  };
}
const signatures = new WeakMap<MotionTrack, string>();
function signature(track: MotionTrack): string {
  let value = signatures.get(track);
  if (value === undefined)
    signatures.set(
      track,
      (value = `${track.at.join(',')}|${track.pose.map((p) => `${p.x},${p.y},${p.z}`).join(';')}`),
    );
  return value;
}

/** Exact fleeting sight/contact crossings (PF13.11). Predicts every predictable mover's pose
 * over the candidate slice and, for each observer/target pair that can change, ends the slice
 * inside any visibility or contact interval (or gap) that would otherwise fall strictly
 * between two samples. The unchanged sampler then records it; nothing here emits evidence.
 * Runs from certain tracks are reused across slices. Falls and routes toward living targets
 * keep the sampled one-metre bound. docs/worlds/base/time.md#spatial-fidelity */
export function sensoryCrossingBound(
  world: WorldState,
  seconds: number,
  actorIds: readonly string[],
  ambientIds: readonly string[],
  cache: CrossingCache,
): number {
  if (!(seconds > TIME_EPSILON)) return seconds;
  const now = world.simTime,
    horizon = Math.max(seconds, BASE_TIME_POLICY.idleHorizonSeconds);
  // A body that left its predicted track invalidates everything derived from it.
  for (const [id, certain] of cache.tracks) {
    const entity = world.entities[id];
    const expected = poseAt(certain.track, now - certain.at);
    const actual = entity && worldPosition(entity);
    if (
      !actual ||
      now > certain.until ||
      Math.abs(actual.x - expected.x) +
        Math.abs(actual.y - expected.y) +
        Math.abs(actual.z - expected.z) >
        1e-9
    )
      forgetCrossings(cache, [id]);
  }
  const certain = new Map<string, CertainTrack>(),
    outcomes = new Map<string, MotionTrack[]>();
  for (const id of new Set([...ambientIds, ...actorIds])) {
    const entity = world.entities[id];
    // Only flight, an approach or a flee can move a body continuously within the slice.
    if (
      !entity ||
      !(
        entity.spatial.flight ||
        entity.actor?.action?.stage === 'approaching' ||
        (entity.animal?.fleeSeconds ?? 0) > 0
      ) ||
      !entity.actor?.alive ||
      entity.actor.incapacitated ||
      !activelyParticipates(entity) ||
      capabilityBlocked(world, entity, 'locomotion')
    )
      continue;
    const cached = cache.tracks.get(id);
    if (cached && cached.until >= now + seconds && poseMoves(cached.track)) {
      certain.set(id, cached);
      continue;
    }
    if (entity.spatial.flight) {
      const ahead = flightTracks(world, entity, horizon);
      if (ahead?.length === 1 && poseMoves(ahead[0]!) && ahead[0]!.until! >= seconds)
        remember(id, ahead[0]!, ahead[0]!.until!);
      else if (ahead) outcomes.set(id, ahead);
    } else if (entity.actor.action) {
      const route = walkerCertainTrack(world, entity, horizon);
      if (route) remember(id, route, horizon);
      else {
        const tracks = walkerTracks(entity, horizon);
        if (tracks && tracks !== 'sampled') outcomes.set(id, tracks);
      }
    } else {
      const tracks = fleeTracks(world, entity, horizon);
      if (tracks) outcomes.set(id, tracks);
    }
  }
  function remember(id: string, track: MotionTrack, until: number) {
    forgetCrossings(cache, [id]);
    const entry = { at: now, until: now + until, track };
    cache.tracks.set(id, entry);
    certain.set(id, entry);
  }
  if (!certain.size && !outcomes.size) return seconds;
  const still = (entity: Entity): CertainTrack => {
    const cached = cache.tracks.get(entity.id);
    // A body that is not moving now (e.g. a flyer that just reached its hover) may still hold
    // the path that brought it here; only a stationary entry describes it.
    if (cached && !poseMoves(cached.track)) return cached;
    if (cached) forgetCrossings(cache, [entity.id]);
    const p = { ...worldPosition(entity) };
    // A waiting flyer stays put only until its wait ends; everything else until it deviates.
    const wait = entity.spatial.flight?.waitSeconds;
    const entry = {
      at: now,
      until: wait ? now + wait : Infinity,
      track: { at: [0, 0], pose: [p, p] },
    };
    cache.tracks.set(entity.id, entry);
    return entry;
  };
  const moving = (id: string) => certain.has(id) || outcomes.has(id);
  const observers = actorIds.flatMap((id) => {
    const entity = world.entities[id];
    if (
      !entity?.actor?.alive ||
      !hasMemory(entity) ||
      !activelyParticipates(entity) ||
      capabilityBlocked(world, entity, 'perception')
    )
      return [];
    const radius = visionRadius(world, entity);
    const touch = sensesFor(world, entity).some((s) => s.implementation === 'body-contact-v1');
    return radius > 0 || touch ? [{ entity, radius, touch }] : [];
  });
  if (!observers.length) return seconds;
  // Moving targets for every observer; static targets only matter to a moving observer.
  const targets = observers.some((o) => moving(o.entity.id))
    ? worldRootEntities(world).filter((e) => activelyParticipates(e))
    : [...certain.keys(), ...outcomes.keys()].map((id) => world.entities[id]!);
  // Outcomes span the horizon; only this slice's displacement widens the pair search.
  const reach = (id: string) => {
    const tracks =
      outcomes.get(id) ?? (certain.has(id) ? [window(certain.get(id)!, now, now + seconds)] : []);
    const start = tracks[0]?.pose[0];
    return start
      ? Math.max(
          0,
          ...tracks.flatMap((t) =>
            [...t.at.filter((at) => at <= seconds), seconds].map((at) =>
              distance3D(start, poseAt(t, at)),
            ),
          ),
        )
      : 0;
  };
  const index = spatialCandidates(
    targets.map((entity) => ({ entity, position: { ...worldPosition(entity) } })),
  );
  const maximumReach = Math.max(0, ...targets.map((t) => reach(t.id)));
  const maximumBody = Math.max(
    0,
    ...targets.map((t) => Math.max(bodyProfile(t).radius, bodyProfile(t).height)),
  );
  let bound = seconds;
  const constrain = (
    kind: 'sight' | 'contact',
    observer: Entity,
    target: Entity,
    evaluate: (first: MotionTrack, second: MotionTrack, horizon: number) => Run[],
  ) => {
    const own =
        certain.get(observer.id) ?? (outcomes.has(observer.id) ? undefined : still(observer)),
      other = certain.get(target.id) ?? (outcomes.has(target.id) ? undefined : still(target));
    if (own && other) {
      const key = `${kind}\0${observer.id}\0${target.id}`;
      let pair = cache.pairs.get(key);
      if (!pair || pair.until < now + bound) {
        const until = Math.min(own.until, other.until, now + horizon);
        pair = {
          ids: [observer.id, target.id],
          at: now,
          until,
          runs: evaluate(window(own, now, until), window(other, now, until), until - now),
        };
        cache.pairs.set(key, pair);
      }
      bound = Math.min(
        bound,
        interiorOf(pair.runs, now - pair.at, now - pair.at + bound) + pair.at - now,
      );
      return;
    }
    for (const first of own ? [window(own, now, now + horizon)] : outcomes.get(observer.id)!)
      for (const second of other ? [window(other, now, now + horizon)] : outcomes.get(target.id)!) {
        const key = `${kind}\0${observer.id}\0${target.id}\0${signature(first)}\0${signature(second)}`;
        let runs = cache.outcomes.get(key);
        if (!runs) {
          if (cache.outcomes.size >= 16384) cache.outcomes.clear();
          cache.outcomes.set(key, (runs = evaluate(first, second, horizon)));
        }
        bound = Math.min(bound, interiorOf(runs, 0, bound));
      }
  };
  for (const observer of observers) {
    const body = bodyProfile(observer.entity);
    const range =
      Math.max(observer.radius, body.radius + body.height + maximumBody) +
      reach(observer.entity.id) +
      maximumReach +
      maximumBody;
    const movingObserver = moving(observer.entity.id);
    for (const { entity: target } of index({ ...worldPosition(observer.entity) }, range)) {
      if (target.id === observer.entity.id || (!movingObserver && !moving(target.id))) continue;
      const alive = !!target.actor?.alive;
      const object = !target.actor && !target.animal;
      const height = bodyProfile(target).height;
      if (observer.radius > 0 && (alive || (object && movingObserver)))
        constrain('sight', observer.entity, target, (first, second, span) =>
          visionRuns(
            world,
            { track: first, radius: observer.radius, eye: body.eyeHeight },
            { track: second, height },
            span,
          ),
        );
      if (observer.touch)
        constrain('contact', observer.entity, target, (first, second, span) =>
          contactRuns(
            world,
            { track: first, entity: observer.entity },
            { track: second, entity: target },
            span,
          ),
        );
    }
  }
  return Math.max(TIME_EPSILON, bound);
}
function poseMoves(track: MotionTrack): boolean {
  return track.pose.some(
    (p) => p.x !== track.pose[0]!.x || p.y !== track.pose[0]!.y || p.z !== track.pose[0]!.z,
  );
}
