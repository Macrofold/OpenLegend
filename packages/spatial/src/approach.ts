import {
  canStand,
  clearSegment,
  distance3D,
  surfaceById,
  surfaceContains,
  surfaceHeight,
  surfacesInBounds,
} from './geometry.js';
import { findSurfaceRoute } from './navigation.js';
import type { BodyProfile, RoutePlan, SpatialMap, SurfacePoint, WorldPoint } from './types.js';

/** The physical preparation used by ordinary target approaches. Inputs contain
 * anchors and a body, never an entity, private state or action permission. */
export function findApproachRoute(
  map: SpatialMap,
  start: SurfacePoint,
  profile: BodyProfile,
  targetPosition: WorldPoint,
  targetSupport: SurfacePoint | null,
  reach: number,
  goal: WorldPoint,
  sweeps?: (from: WorldPoint, to: WorldPoint) => { clear(point: WorldPoint): boolean },
): RoutePlan | null {
  // Every candidate uses the same captured body and anchor; provider scheduling
  // cannot change the stances or their stable Source ordering.
  const anchor = (p: WorldPoint): WorldPoint => ({
    x: p.x,
    y: p.y + profile.interactionHeight,
    z: p.z,
  });
  const reaches = (p: WorldPoint): boolean => {
    const from = anchor(p);
    return distance3D(from, goal) <= reach && clearSegment(map, from, goal);
  };
  const candidates: SurfacePoint[] = [];
  if (targetSupport && canStand(map, targetSupport, profile) && reaches(targetSupport))
    candidates.push(targetSupport);
  const radius = Math.min(12, Math.max(1, reach));
  const footY = goal.y - profile.interactionHeight;
  for (const surface of surfacesInBounds(map, {
    min: {
      x: targetPosition.x - radius,
      y: footY - reach,
      z: targetPosition.z - radius,
    },
    max: {
      x: targetPosition.x + radius,
      y: footY + reach,
      z: targetPosition.z + radius,
    },
  })) {
    for (
      let z = Math.max(Math.ceil(surface.minZ), Math.ceil(targetPosition.z - radius));
      z <= Math.min(Math.floor(surface.maxZ), Math.floor(targetPosition.z + radius));
      z++
    ) {
      for (
        let x = Math.max(Math.ceil(surface.minX), Math.ceil(targetPosition.x - radius));
        x <= Math.min(Math.floor(surface.maxX), Math.floor(targetPosition.x + radius));
        x++
      ) {
        const p = { x, y: surfaceHeight(surface, x, z), z, surfaceId: surface.id };
        if (distance3D(anchor(p), goal) <= reach) candidates.push(p);
      }
    }
  }
  candidates.sort(
    (a, b) =>
      distance3D(start, a) - distance3D(start, b) ||
      a.surfaceId.localeCompare(b.surfaceId) ||
      a.z - b.z ||
      a.x - b.x,
  );
  const destinations: SurfacePoint[] = [];
  let occupiedRoutes = 0;
  for (const candidate of candidates) {
    if (!reaches(candidate) || !canStand(map, candidate, profile)) continue;
    if (sweeps && !sweeps(candidate, candidate).clear(candidate)) continue;
    if (destinations.length === 12) break;
    if (sweeps && occupiedRoutes++ === 12) break;
    const route = findSurfaceRoute(map, start, candidate, profile);
    if (route.status === 'reached') {
      // Different animals can approach the same food. A static route and a free
      // destination do not prove the body can pass its current neighbours.
      let from = start;
      const clear =
        !sweeps ||
        route.path.every((point) => {
          const result = sweeps(from, point).clear(point);
          from = point;
          return result;
        });
      if (clear) return route;
      continue;
    }
    destinations.push(candidate);
  }
  return destinations.length
    ? {
        status: 'pending',
        path: [],
        expanded: 0,
        request: {
          from: start,
          destinations,
          body: { ...profile },
          geometryRevision: map.spatial.revision,
        },
      }
    : null;
}

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

/** Project an actor-relative offset only onto its supplied current support.
 * Uses the same JS trigonometry and arithmetic order as ordinary invocation. */
export function relativeSurfacePoint(
  map: SpatialMap,
  from: SurfacePoint,
  heading: number,
  x: number,
  z: number,
): SurfacePoint | null {
  const { forward, right } = headingFrame(heading);
  const px = from.x + right.x * x + forward.x * z;
  const pz = from.z + right.z * x + forward.z * z;
  const surface = surfaceById(map, from.surfaceId);
  return surface && surfaceContains(surface, { x: px, z: pz })
    ? { x: px, y: surfaceHeight(surface, px, pz), z: pz, surfaceId: surface.id }
    : null;
}
