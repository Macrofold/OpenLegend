import { canStand, canWalkSegment, distance3D } from './geometry.js';
import {
  BODY_PROFILES,
  type BodyProfile,
  type RoutePlan,
  type SpatialMap,
  type SurfacePoint,
} from './types.js';

/** Navigation is required data, not synchronous graph construction inside a world mutation.
 * Direct segments need no worker. Detours enter one bounded Recast queue only after a native
 * action is admitted; previews never schedule work. See archive/07-technical-architecture/spatial-world-runtime.md#navigation-preparation.
 */
export function findSurfaceRoute(
  map: SpatialMap,
  from: SurfacePoint,
  to: SurfacePoint,
  body: BodyProfile = BODY_PROFILES.person,
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
    for (const seam of [
      { ...from, surfaceId: to.surfaceId },
      { ...to, surfaceId: from.surfaceId },
    ])
      if (canWalkSegment(map, from, seam, body) && canWalkSegment(map, seam, to, body))
        return {
          status: 'reached',
          path: [seam, { ...to }],
          length: distance3D(from, seam) + distance3D(seam, to),
          expanded: 0,
        };
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
