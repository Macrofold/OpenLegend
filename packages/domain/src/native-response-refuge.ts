import {
  canStand,
  walkSurfaceLine,
  distance3D,
  findSurfaceRoute,
  horizontalDistance,
  quadraticRoots,
  sightSweep,
  SPATIAL_LIMITS,
  surfaceHeight,
  surfacesInBounds,
  traceSupportLine,
  type RoutePlan,
  type SurfacePoint,
  type WorldPoint,
} from '@open-legend/spatial';
import { pointVisionQuery, visionRadius } from './perception.js';
import { bodyProfile, spatialMap, supportedPosition, worldPosition } from './spatial-state.js';
import { chargeWork } from './work-budget.js';
import { countDomainWork } from './diagnostic-counters.js';
import { occupiedBodySweepReader } from './spatial.js';
import { nativeDangerSeparation, nativeRouteDangerSeparation } from './native-response-danger.js';
import type { NativeDangerFrame } from './native-response-danger.js';
import { nativeResponseProfile } from './native-response.js';
import type { NativeRefugeProposal, NativeResponseProfile } from './native-response.js';
import type { Entity, Position, WorldState } from './types.js';
import type { AcousticDirection } from './sound.js';

type CompleteDangers = Extract<NativeDangerFrame, { status: 'complete' }>;
type Candidate = NativeRefugeProposal['candidates'][number];
export interface NativeRefugeScore {
  candidate: { id: string; point: WorldPoint; retained?: true; preferred?: true };
  length: number;
  worsening: number;
  arrivalMargin: number;
}
export interface NativeRefugeRoute extends NativeRefugeScore {
  candidate: Candidate;
  path: SurfacePoint[];
}
export type NativeRefugeRouteResult =
  | { status: 'complete'; route: NativeRefugeRoute }
  | { status: 'pending'; request: Extract<RoutePlan, { status: 'pending' }>['request'] }
  | {
      status: 'refused';
      reason:
        | 'unsupported'
        | 'outside-planning-scope'
        | 'unreachable'
        | 'occupied'
        | 'unsafe-preferred';
    };

/** The first unseen interval matters, including an occluded middle with a visible
 * endpoint. Sight critical fractions and range roots share ordinary perception's
 * actual eye and point geometry; no fixed sampling density certifies a corridor. */
export function nativeTerrainExposure(world: WorldState, observer: Entity) {
  const sees = pointVisionQuery(world, observer),
    radius = visionRadius(world, observer),
    position = worldPosition(observer),
    eye = { ...position, y: position.y + bodyProfile(observer).eyeHeight },
    map = spatialMap(world);
  return {
    sees,
    prefix(from: Position, to: Position): number {
      const dx = to.x - from.x,
        dy = to.y - from.y,
        dz = to.z - from.z;
      const ox = from.x - position.x,
        oy = from.y - position.y,
        oz = from.z - position.z;
      const roots = sightSweep(map, eye, eye, from, to).fractions;
      quadraticRoots(
        dx * dx + dy * dy + dz * dz,
        2 * (ox * dx + oy * dy + oz * dz),
        ox * ox + oy * oy + oz * oz - radius * radius,
        roots,
      );
      const boundaries = [0, ...roots.filter((t) => t > 0 && t < 1), 1].sort((a, b) => a - b);
      for (let i = 1; i < boundaries.length; i++) {
        const start = boundaries[i - 1]!,
          end = boundaries[i]!;
        if (end - start <= Number.EPSILON) continue;
        chargeWork({ tests: 1 });
        const t = (start + end) / 2;
        if (!sees({ x: from.x + dx * t, y: from.y + dy * t, z: from.z + dz * t })) return start;
      }
      return sees(to) ? 1 : (boundaries.at(-2) ?? 0);
    },
  };
}

/** Choose a gap in observed threat bearings, not a globally optimal corridor.
 * Opposite threats leave two perpendicular gaps; only tied gaps need randomness. */
export function nativeEscapeBearing(
  observer: Entity,
  frame: CompleteDangers,
  draw: number,
): number {
  const from = worldPosition(observer),
    tau = 2 * Math.PI;
  const angles = frame.records
    .flatMap(({ danger }) => {
      const dx = danger.point.x - from.x,
        dz = danger.point.z - from.z;
      if (Math.hypot(dx, dz) > SPATIAL_LIMITS.epsilon) return [(Math.atan2(dz, dx) + tau) % tau];
      return danger.kind === 'region' && danger.incoming
        ? [(Math.atan2(danger.incoming.z, danger.incoming.x) + tau) % tau]
        : [];
    })
    .sort((a, b) => a - b);
  if (!angles.length) return draw * tau;
  const gaps = angles.map((angle, index) => {
    const next = angles[(index + 1) % angles.length]! + (index === angles.length - 1 ? tau : 0);
    return { size: next - angle, bearing: (next + angle) / 2 };
  });
  const widest = Math.max(...gaps.map((gap) => gap.size));
  const tied = gaps.filter((gap) => gap.size >= widest - SPATIAL_LIMITS.epsilon);
  return tied[Math.min(tied.length - 1, Math.floor(draw * tied.length))]!.bearing % tau;
}

/** One endpoint at a time. Prefer full distance (ordinary navigation may detour);
 * if its support is absent/occupied, shorten along the same bearing. These local
 * support probes never search paths or infer personal knowledge behind a wall. */
export function nativeRefugeCandidate(
  world: WorldState,
  observer: Entity,
  proposal: NativeRefugeProposal,
): Candidate | undefined {
  const search = proposal.search!,
    profile = nativeResponseProfile(world, observer.animal!.episode!.profilePin)!;
  const angle =
    search.bearing + (search.side * profile.candidates.angles[search.attempted]! * Math.PI) / 180;
  const map = spatialMap(world),
    body = bodyProfile(observer),
    from = proposal.origin;
  for (
    let distance = search.distance;
    distance >= profile.candidates.minimumAdvance;
    distance -= profile.candidates.minimumAdvance
  ) {
    const x = from.x + Math.cos(angle) * distance,
      z = from.z + Math.sin(angle) * distance;
    const points = surfacesInBounds(map, {
      min: { x, y: -Infinity, z },
      max: { x, y: Infinity, z },
    })
      .map((surface) => ({ x, y: surfaceHeight(surface, x, z), z, surfaceId: surface.id }))
      .sort(
        (a, b) =>
          Math.abs(a.y - from.y) - Math.abs(b.y - from.y) || a.surfaceId.localeCompare(b.surfaceId),
      );
    const point = points.find((point) => canStand(map, point, body));
    if (point) return { id: String(search.attempted), point };
  }
  return undefined;
}

/** A worker result is preparation, not authority. Recheck the complete route's
 * physical support through the ordinary movement owner before calling this
 * scorer; this function adds the animal's narrower personal planning scope. */
export function scoreNativeRefugeRoute(
  world: WorldState,
  observer: Entity,
  frame: CompleteDangers,
  candidate: Candidate,
  from: SurfacePoint,
  path: SurfacePoint[],
  length: number,
  sweeps?: ReturnType<typeof occupiedBodySweepReader>,
): NativeRefugeRouteResult {
  if (length > frame.profile.candidates.maximumRouteLength + SPATIAL_LIMITS.epsilon)
    return { status: 'refused', reason: 'outside-planning-scope' };
  const query = sweeps ?? occupiedBodySweepReader(world, observer);
  let previous = from;
  for (const point of path) {
    if (!query(previous, point).clear(point)) return { status: 'refused', reason: 'occupied' };
    previous = point;
  }
  return { status: 'complete', route: { candidate, path, length, worsening: 0, arrivalMargin: 0 } };
}

/** Ground and air use the same complete observed geometry and safety ordering.
 * The caller separately proves its actual walk/flight family's physical route. */
export function scoreNativeRefugeGeometry(
  world: WorldState,
  observer: Entity,
  frame: CompleteDangers,
  candidate: NativeRefugeScore['candidate'],
  from: WorldPoint,
  path: readonly WorldPoint[],
  length: number,
  sweeps = occupiedBodySweepReader(world, observer),
):
  | { status: 'complete'; score: Pick<NativeRefugeScore, 'worsening' | 'arrivalMargin'> }
  | Extract<NativeRefugeRouteResult, { status: 'refused' }> {
  const profile = frame.profile;
  let previousBodyPoint = from;
  for (const point of path) {
    if (!sweeps(previousBodyPoint, point).clear(point))
      return { status: 'refused', reason: 'occupied' };
    previousBodyPoint = point;
  }
  if (length > profile.candidates.maximumRouteLength + SPATIAL_LIMITS.epsilon)
    return { status: 'refused', reason: 'outside-planning-scope' };
  if (!candidate.retained) {
    const exposure = nativeTerrainExposure(world, observer);
    let previous = from;
    for (const point of path) {
      if (exposure.prefix(previous, point) < 1)
        return { status: 'refused', reason: 'outside-planning-scope' };
      previous = point;
    }
  }
  const clear = profile.avoidanceDistance + profile.clearanceMargin;
  let worsening = 0,
    arrivalMargin = profile.candidates.arrivalMarginCap;
  for (const { danger } of frame.records) {
    chargeWork({ tests: 1 });
    const start = nativeDangerSeparation(observer, from, danger, profile, world.simTime);
    const minimum = nativeRouteDangerSeparation(
      observer,
      from,
      path,
      danger,
      profile,
      world.simTime,
    );
    worsening = Math.max(
      worsening,
      Math.min(start, clear) - minimum - profile.candidates.worseningSlack,
    );
    arrivalMargin = Math.min(
      arrivalMargin,
      nativeDangerSeparation(observer, candidate.point, danger, profile, world.simTime) - clear,
    );
  }
  if (candidate.preferred && arrivalMargin < -SPATIAL_LIMITS.epsilon)
    return { status: 'refused', reason: 'unsafe-preferred' };
  return { status: 'complete', score: { worsening, arrivalMargin } };
}

/** A failed/long detour may still permit a useful shorter leg on this bearing.
 * Every probe checks the whole prefix from the same origin, not merely whether
 * its destination is walkable. */
export function nativeRefugePrefixRoute(
  world: WorldState,
  observer: Entity,
  frame: CompleteDangers,
  candidate: Candidate,
): NativeRefugeRoute | undefined {
  const from = supportedPosition(observer);
  if (!from) return;
  const body = bodyProfile(observer),
    map = spatialMap(world),
    sweeps = occupiedBodySweepReader(world, observer);
  // Escape needs useful progress, not a finely optimized obstruction boundary.
  // Largest-first probes preserve the 75%/50% admission bands and stop on success.
  for (const fraction of [0.875, 0.75, 0.5, 0.25, 0.125, 0.0625]) {
    const path = walkSurfaceLine(
      map,
      from,
      from.x + (candidate.point.x - from.x) * fraction,
      from.z + (candidate.point.z - from.z) * fraction,
      body,
    );
    const point = path?.at(-1);
    let previous = from,
      length = 0;
    for (const next of path ?? []) {
      length += distance3D(previous, next);
      previous = next;
    }
    const scored =
      point &&
      path &&
      scoreNativeRefugeRoute(
        world,
        observer,
        frame,
        { id: candidate.id, point },
        from,
        path,
        length,
        sweeps,
      );
    if (scored && scored.status === 'complete') {
      if (
        horizontalDistance(from, scored.route.candidate.point) >=
        frame.profile.candidates.minimumAdvance
      )
        return scored.route;
    }
  }
  return undefined;
}

export function prepareNativeRefugeRoute(
  world: WorldState,
  observer: Entity,
  frame: CompleteDangers,
  candidate: Candidate,
  sweeps?: ReturnType<typeof occupiedBodySweepReader>,
): NativeRefugeRouteResult {
  countDomainWork('nativeResponseGroundRoutePreparations');
  const from = supportedPosition(observer);
  if (!from) return { status: 'refused', reason: 'unsupported' };
  const route = findSurfaceRoute(spatialMap(world), from, candidate.point, bodyProfile(observer));
  if (route.status === 'pending') return { status: 'pending', request: route.request };
  if (route.status !== 'reached') return { status: 'refused', reason: 'unreachable' };
  return scoreNativeRefugeRoute(
    world,
    observer,
    frame,
    candidate,
    from,
    route.path,
    route.length,
    sweeps,
  );
}

/** Pure comparison. The native decision owner alone consumes one saved random
 * draw if this returns several alternatives; callbacks and previews never draw. */
export function nativeRefugeChoices<T extends NativeRefugeScore>(
  routes: readonly T[],
  profile: NativeResponseProfile,
  acoustic?: { origin: Position; direction: AcousticDirection | null; retain: boolean },
): T[] {
  if (!routes.length) return [];
  const epsilon = SPATIAL_LIMITS.epsilon;
  const best = [...routes].sort((a, b) =>
    Math.abs(a.worsening - b.worsening) > epsilon
      ? a.worsening - b.worsening
      : a.arrivalMargin >= -epsilon !== b.arrivalMargin >= -epsilon
        ? a.arrivalMargin >= -epsilon
          ? -1
          : 1
        : b.arrivalMargin - a.arrivalMargin,
  )[0]!;
  const retained = routes.find((route) => route.candidate.retained);
  if (retained && (!acoustic || acoustic.retain)) {
    if (best === retained) return [retained];
    const improvesClass =
      best.worsening < retained.worsening - epsilon ||
      (Math.abs(best.worsening - retained.worsening) <= epsilon &&
        best.arrivalMargin >= -epsilon &&
        retained.arrivalMargin < -epsilon);
    if (
      !improvesClass &&
      best.arrivalMargin <
        retained.arrivalMargin + profile.candidates.continuityImprovement - epsilon
    )
      return [retained];
  }
  let interchangeable = routes.filter(
    (route) =>
      (!route.candidate.retained || acoustic?.retain === false) &&
      Math.abs(route.worsening - best.worsening) <= epsilon &&
      route.arrivalMargin >= -epsilon === best.arrivalMargin >= -epsilon &&
      route.arrivalMargin >= best.arrivalMargin - profile.candidates.tieMargin - epsilon,
  );
  if (acoustic?.direction && interchangeable.length) {
    const angle = (acoustic.direction.sector * Math.PI) / 4;
    const progress = (route: T) =>
      -(route.candidate.point.x - acoustic.origin.x) * Math.cos(angle) -
      (route.candidate.point.z - acoustic.origin.z) * Math.sin(angle);
    const away = Math.max(...interchangeable.map(progress));
    interchangeable = interchangeable.filter((route) => progress(route) >= away - epsilon);
  }
  const preferred = interchangeable.find(
    (route) => route.candidate.preferred && route.arrivalMargin >= -epsilon,
  );
  return preferred ? [preferred] : interchangeable;
}
