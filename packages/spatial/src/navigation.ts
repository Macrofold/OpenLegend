import {
  canStand,
  canWalkSegment,
  distance3D,
  finitePoint,
  surfaceById,
  surfaceContains,
  surfaceHeight,
  surfacesInBounds,
} from './geometry.js';
import {
  SPATIAL_LIMITS,
  type BodyProfile,
  type Bounds3,
  type RoutePlan,
  type SpatialMap,
  type SurfacePoint,
  type WalkableSurface,
  type WorldPoint,
} from './types.js';

/** The caller expands these foot-anchor bounds for its actual body/clearance.
 * This is a route goal, not a claim that the surrounding region is traversable. */
export function outsideNavigationBounds(point: WorldPoint, bounds: Bounds3): boolean {
  return (['x', 'y', 'z'] as const).some(
    (axis) => point[axis] < bounds.min[axis] || point[axis] > bounds.max[axis],
  );
}
export function validOutsideNavigationBounds(bounds: Bounds3): boolean {
  return (
    !!bounds &&
    finitePoint(bounds.min) &&
    finitePoint(bounds.max) &&
    (['x', 'y', 'z'] as const).every((axis) => bounds.min[axis] <= bounds.max[axis])
  );
}
/** Preparation remains with the existing host planner. No guessed perimeter
 * destinations can turn an unfinished search into a proof of no exit. */
export function findOutsideSurfaceRoute(
  map: SpatialMap,
  from: SurfacePoint,
  bounds: Bounds3,
  body: BodyProfile,
): RoutePlan {
  if (!validOutsideNavigationBounds(bounds) || !canStand(map, from, body))
    return { status: 'invalid-endpoint', path: [], expanded: 0 };
  if (outsideNavigationBounds(from, bounds))
    return { status: 'reached', path: [], length: 0, expanded: 0 };
  // A fully checked straight exit is already a complete positive proof. Failed
  // guesses never establish absence: the ordinary worker still searches the
  // whole reachable exterior when none of these cheap routes succeeds.
  const surface = surfaceById(map, from.surfaceId);
  if (surface) {
    for (const point of [
      { x: bounds.min.x - SPATIAL_LIMITS.epsilon, z: from.z },
      { x: bounds.max.x + SPATIAL_LIMITS.epsilon, z: from.z },
      { x: from.x, z: bounds.min.z - SPATIAL_LIMITS.epsilon },
      { x: from.x, z: bounds.max.z + SPATIAL_LIMITS.epsilon },
    ]) {
      const to = { ...point, y: surfaceHeight(surface, point.x, point.z), surfaceId: surface.id };
      if (!outsideNavigationBounds(to, bounds)) continue;
      const direct = findSurfaceRoute(map, from, to, body);
      if (direct.status === 'reached') return direct;
    }
  }
  return {
    status: 'pending',
    path: [],
    expanded: 0,
    request: {
      from: { ...from },
      destinations: [],
      outsideBounds: { min: { ...bounds.min }, max: { ...bounds.max } },
      body: { ...body },
      geometryRevision: map.spatial.revision,
    },
  };
}

/** A short straight walk follows support through coincident patch edges. Every segment and
 * support change uses ordinary body admission; it cannot jump a gap or choose another floor.
 * This is local steering geometry, not a detour search or a navigation-worker request. */
export function walkSurfaceLine(
  map: SpatialMap,
  from: SurfacePoint,
  x: number,
  z: number,
  body: BodyProfile,
): SurfacePoint[] | null {
  return surfaceLine(map, from, x, z, body);
}

/** Support topology for geometric exposure queries only. This proves neither
 * body clearance nor permission to move; walking still uses walkSurfaceLine. */
export function traceSupportLine(
  map: SpatialMap,
  from: SurfacePoint,
  x: number,
  z: number,
): SurfacePoint[] | null {
  return surfaceLine(map, from, x, z);
}

function surfaceLine(
  map: SpatialMap,
  from: SurfacePoint,
  x: number,
  z: number,
  body?: BodyProfile,
): SurfacePoint[] | null {
  const initial = surfaceById(map, from.surfaceId);
  if (!initial) return null;
  let surface: WalkableSurface = initial;
  const dx = x - from.x,
    dz = z - from.z;
  const exitAt = (s: WalkableSurface) =>
    Math.min(
      1,
      dx > 0 ? (s.maxX - from.x) / dx : dx < 0 ? (s.minX - from.x) / dx : Infinity,
      dz > 0 ? (s.maxZ - from.z) / dz : dz < 0 ? (s.minZ - from.z) / dz : Infinity,
    );
  const path: SurfacePoint[] = [];
  let start = from,
    fraction = 0;
  // Rectangular patches cannot be re-entered along a straight line. Bound work by admitted
  // geometry, and query only the supports touching each seam through the existing index.
  for (let i = 0; i < map.spatial.surfaces.length; i++) {
    const exit = Math.max(fraction, exitAt(surface));
    const px = from.x + dx * exit,
      pz = from.z + dz * exit;
    const end: SurfacePoint = {
      x: px,
      y: surfaceHeight(surface, px, pz),
      z: pz,
      surfaceId: surface.id,
    };
    if (body && !canWalkSegment(map, start, end, body)) return null;
    path.push(end);
    if (exit === 1) return path;
    const tolerance = SPATIAL_LIMITS.supportTolerance;
    const next = surfacesInBounds(map, {
      min: { x: px, y: end.y - tolerance, z: pz },
      max: { x: px, y: end.y + tolerance, z: pz },
    }).find((candidate) => {
      if (
        candidate.id === surface.id ||
        !surfaceContains(candidate, end) ||
        exitAt(candidate) <= exit
      )
        return false;
      return body
        ? canWalkSegment(
            map,
            end,
            { ...end, y: surfaceHeight(candidate, px, pz), surfaceId: candidate.id },
            body,
          )
        : Math.abs(surfaceHeight(candidate, px, pz) - end.y) <= tolerance;
    });
    if (!next) return body ? null : path;
    surface = next;
    fraction = exit;
    start = { ...end, y: surfaceHeight(next, px, pz), surfaceId: next.id };
    path.push(start);
  }
  return null;
}

/** Navigation is required data, not synchronous graph construction inside a world mutation.
 * Direct segments need no worker. Detours enter one bounded Recast queue only after a native
 * action is admitted; previews never schedule work. See archive/07-technical-architecture/spatial-world-runtime.md#navigation-preparation.
 */
export function findSurfaceRoute(
  map: SpatialMap,
  from: SurfacePoint,
  to: SurfacePoint,
  body: BodyProfile,
): RoutePlan {
  if (!canStand(map, from, body) || !canStand(map, to, body))
    return { status: 'invalid-endpoint', path: [], expanded: 0 };
  if (from.surfaceId === to.surfaceId && canWalkSegment(map, from, to, body))
    return {
      status: 'reached',
      path: distance3D(from, to) < 1e-7 ? [] : [{ ...to }],
      length: distance3D(from, to),
      expanded: 0,
    };
  if (from.surfaceId !== to.surfaceId) {
    // A ramp can start inside the ground patch. Try a supported switch at either endpoint
    // before following patch edges, which cannot discover that interior connection.
    for (const seam of [
      { ...from, surfaceId: to.surfaceId },
      { ...to, surfaceId: from.surfaceId },
    ]) {
      if (canWalkSegment(map, from, seam, body) && canWalkSegment(map, seam, to, body))
        return {
          status: 'reached',
          path: [seam, { ...to }],
          length: distance3D(from, seam) + distance3D(seam, to),
          expanded: 0,
        };
    }
    // Exact connected ground can be walkable where raster heights reject a corridor.
    // Reuse checked steering seams, but bind arrival to the requested support/floor.
    // docs/spatial-world.md#movement
    const path = walkSurfaceLine(map, from, to.x, to.z, body);
    // Replace the final same-support leg with the exact destination and validate it below;
    // keeping both would add a redundant waypoint and another movement check.
    if (path?.at(-1)?.surfaceId === to.surfaceId) path.pop();
    const end = path?.at(-1) ?? from;
    if (path && path.length < SPATIAL_LIMITS.maxPathPoints && canWalkSegment(map, end, to, body)) {
      path.push({ ...to });
      let previous = from,
        length = 0;
      for (const point of path) {
        length += distance3D(previous, point);
        previous = point;
      }
      return { status: 'reached', path, length, expanded: 0 };
    }
  }
  return {
    status: 'pending',
    path: [],
    expanded: 0,
    request: {
      from: { ...from },
      destinations: [{ ...to }],
      body: { ...body },
      geometryRevision: map.spatial.revision,
    },
  };
}

/** Bounded string pulling only within one support. Every shortcut checks the whole body;
 * explicit seam points survive, so interpolation cannot fly through a ramp or another floor.
 */
export function simplifySurfacePath(
  map: SpatialMap,
  from: SurfacePoint,
  path: readonly SurfacePoint[],
  body: BodyProfile,
): SurfacePoint[] {
  const out: SurfacePoint[] = [];
  let start = from;
  for (let i = 0; i < path.length; ) {
    let furthest = i;
    for (let j = i + 1; j < Math.min(path.length, i + 24); j++) {
      if (path[j]!.surfaceId !== start.surfaceId || path[j - 1]!.surfaceId !== start.surfaceId)
        break;
      if (canWalkSegment(map, start, path[j]!, body)) furthest = j;
    }
    const next = path[furthest]!;
    if (distance3D(start, next) > 1e-7 || start.surfaceId !== next.surfaceId) out.push({ ...next });
    start = next;
    i = furthest + 1;
  }
  return out;
}
