import {
  canStand,
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
} from '@open-legend/spatial';
import { pointVisionQuery, visionRadius } from './perception.js';
import { bodyProfile, spatialMap, supportedPosition, worldPosition } from './spatial-state.js';
import { chargeWork } from './work-budget.js';
import { nativeDangerSeparation, nativeRouteDangerSeparation } from './native-response-danger.js';
import type { NativeDangerFrame } from './native-response-danger.js';
import type { NativeRefugeProposal, NativeResponseProfile } from './native-response.js';
import type { Entity, Position, WorldState } from './types.js';

type CompleteDangers = Extract<NativeDangerFrame, { status: 'complete' }>;
type Candidate = NativeRefugeProposal['candidates'][number];
export interface NativeRefugeRoute {
  candidate: Candidate;
  path: SurfacePoint[];
  length: number;
  worsening: number;
  arrivalMargin: number;
}
export type NativeRefugeRouteResult =
  | { status: 'complete'; route: NativeRefugeRoute }
  | { status: 'pending'; request: Extract<RoutePlan, { status: 'pending' }>['request'] }
  | { status: 'refused'; reason: 'unsupported' | 'outside-planning-scope' | 'unreachable' };

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

/** Bounded authored bearings only propose real supported visible terrain. They
 * grant neither a route nor permission to move. The route owner still prepares
 * every independent corridor and the full corridor is checked below. */
export function nativeRefugeCandidates(
  world: WorldState,
  observer: Entity,
  frame: CompleteDangers,
  retained?: Candidate,
): { candidates: Candidate[]; omitted: Array<{ id: string; reason: string }> } {
  const from = supportedPosition(observer),
    map = spatialMap(world),
    body = bodyProfile(observer);
  const candidates: Candidate[] = retained ? [retained] : [],
    omitted: Array<{ id: string; reason: string }> = [];
  if (!from) return { candidates, omitted: [{ id: 'origin', reason: 'unsupported' }] };
  const exposure = nativeTerrainExposure(world, observer),
    profile = frame.profile;
  // Physical heading is measured from +Z; ring geometry uses atan2(Z, X).
  let bearing = Math.PI / 2 - observer.spatial.heading;
  let nearest: CompleteDangers['records'][number] | undefined,
    nearestSeparation = Infinity;
  for (const record of frame.records) {
    chargeWork({ tests: 1 });
    const separation = nativeDangerSeparation(
      observer,
      from,
      record.danger,
      profile,
      world.simTime,
    );
    if (
      separation < nearestSeparation ||
      (separation === nearestSeparation && (!nearest || record.key < nearest.key))
    ) {
      nearest = record;
      nearestSeparation = separation;
    }
  }
  if (nearest) {
    const danger = nearest.danger;
    const dx = from.x - danger.point.x,
      dz = from.z - danger.point.z;
    if (Math.hypot(dx, dz) > SPATIAL_LIMITS.epsilon) bearing = Math.atan2(dz, dx);
    else if (
      danger.kind === 'region' &&
      danger.incoming &&
      Math.hypot(danger.incoming.x, danger.incoming.z) > SPATIAL_LIMITS.epsilon
    )
      bearing = Math.atan2(-danger.incoming.z, -danger.incoming.x);
  }
  const sameEndpoint = (point: SurfacePoint) =>
    candidates.some(
      (candidate) =>
        candidate.point.surfaceId === point.surfaceId &&
        distance3D(candidate.point, point) <= SPATIAL_LIMITS.epsilon,
    );
  for (const [ringIndex, ring] of profile.candidates.rings.entries()) {
    for (let index = 0; index < ring.count; index++) {
      chargeWork({ tests: 1 });
      const id = JSON.stringify([ringIndex, index]),
        angle = bearing + (index * 2 * Math.PI) / ring.count;
      const x = from.x + Math.cos(angle) * ring.distance,
        z = from.z + Math.sin(angle) * ring.distance;
      // All supports at the proposed coordinate are actual geometry. Seeing one
      // does not make it reachable; the physical route must still prove that.
      const points = surfacesInBounds(map, {
        min: { x, y: -Infinity, z },
        max: { x, y: Infinity, z },
      })
        .map((surface) => ({ x, y: surfaceHeight(surface, x, z), z, surfaceId: surface.id }))
        .filter((point) => exposure.sees(point))
        .sort((a, b) =>
          a.surfaceId < b.surfaceId ? -1 : a.surfaceId > b.surfaceId ? 1 : a.y - b.y,
        );
      let point = points.find((point) => canStand(map, point, body));
      if (!point && points.length) {
        omitted.push({ id, reason: 'unsupported' });
        continue;
      }
      if (!point) {
        const line = traceSupportLine(map, from, x, z);
        let previous = from,
          visibleDistance = 0;
        for (const end of line ?? []) {
          const fraction = exposure.prefix(previous, end),
            length = horizontalDistance(previous, end);
          visibleDistance += length * fraction;
          if (fraction < 1) break;
          previous = end;
        }
        const advance = visibleDistance - body.radius - profile.candidates.frontierMargin;
        if (advance >= profile.candidates.minimumAdvance) {
          const frontier = traceSupportLine(
            map,
            from,
            from.x + Math.cos(angle) * advance,
            from.z + Math.sin(angle) * advance,
          )?.at(-1);
          if (frontier && canStand(map, frontier, body) && exposure.sees(frontier))
            point = frontier;
        }
      }
      if (!point) omitted.push({ id, reason: 'unsupported-or-unexposed' });
      else if (!sameEndpoint(point)) candidates.push({ id, point });
    }
  }
  return { candidates, omitted };
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
): NativeRefugeRouteResult {
  const profile = frame.profile;
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
  return { status: 'complete', route: { candidate, path, length, worsening, arrivalMargin } };
}

export function prepareNativeRefugeRoute(
  world: WorldState,
  observer: Entity,
  frame: CompleteDangers,
  candidate: Candidate,
): NativeRefugeRouteResult {
  const from = supportedPosition(observer);
  if (!from) return { status: 'refused', reason: 'unsupported' };
  const route = findSurfaceRoute(spatialMap(world), from, candidate.point, bodyProfile(observer));
  if (route.status === 'pending') return { status: 'pending', request: route.request };
  if (route.status !== 'reached') return { status: 'refused', reason: 'unreachable' };
  return scoreNativeRefugeRoute(world, observer, frame, candidate, from, route.path, route.length);
}

/** Pure comparison. The native decision owner alone consumes one saved random
 * draw if this returns several alternatives; callbacks and previews never draw. */
export function nativeRefugeChoices(
  routes: readonly NativeRefugeRoute[],
  profile: NativeResponseProfile,
): NativeRefugeRoute[] {
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
  if (retained) {
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
  return routes.filter(
    (route) =>
      !route.candidate.retained &&
      Math.abs(route.worsening - best.worsening) <= epsilon &&
      route.arrivalMargin >= -epsilon === best.arrivalMargin >= -epsilon &&
      route.arrivalMargin >= best.arrivalMargin - profile.candidates.tieMargin - epsilon,
  );
}
