import * as R from 'recast-navigation';
import { generateTiledNavMesh } from 'recast-navigation/generators';
import {
  BODY_PROFILES,
  MOVEMENT,
  SPATIAL_LIMITS,
  canStand,
  canWalkSegment,
  distance3D,
  interpolate,
  simplifySurfacePath,
  surfaceContains,
  surfaceHeight,
  surfacesInBounds,
  validateSpatialMap,
  type BodyProfile,
  type NavigationRequest,
  type NavigationResult,
  type SpatialMap,
  type SurfacePoint,
  type WorldPoint,
} from '@open-legend/spatial';
import { initializeCollisionRuntime } from '@open-legend/spatial/rapier';
import { navigationTriangles } from './geometry.js';

export async function initializeNavigationRuntime(): Promise<void> {
  await Promise.all([R.init(), initializeCollisionRuntime()]);
}
interface Prepared {
  mesh: R.NavMesh;
  query: R.NavMeshQuery;
}
/** Worker-owned, bounded derived state. Never persist polygon refs or run this constructor in
 * a domain transition. Whole-revision rebuilding is the initial policy; affected tiles remain
 * a measured expansion seam. archive/07-technical-architecture/spatial-world-runtime.md#navigation-preparation
 */
export class RecastPlanner {
  private readonly meshes = new Map<string, Prepared>();
  private readonly triangles: ReturnType<typeof navigationTriangles>;
  constructor(readonly map: SpatialMap) {
    validateSpatialMap(map);
    this.triangles = navigationTriangles(map);
  }
  prepare(body: BodyProfile = BODY_PROFILES.person): Prepared {
    const key = `${body.radius}:${body.height}:${body.maxSlope}`;
    let prepared = this.meshes.get(key);
    if (prepared) {
      this.meshes.delete(key);
      this.meshes.set(key, prepared);
      return prepared;
    }
    const { cellSize: cs, cellHeight: ch, skin } = MOVEMENT;
    const generated = generateTiledNavMesh(this.triangles.positions, this.triangles.indices, {
      cs,
      ch,
      tileSize: 64,
      walkableRadius: Math.ceil((body.radius + skin) / cs),
      walkableHeight: Math.ceil((body.height + 2 * skin) / ch),
      walkableSlopeAngle: (Math.atan(body.maxSlope) * 180) / Math.PI,
      // Raster stair allowance joins samples on a slope; it grants no physical step ability.
      walkableClimb: Math.max(3, Math.ceil((body.maxSlope * cs) / ch)),
      minRegionArea: 0,
      mergeRegionArea: 0,
      maxEdgeLen: 120,
      maxSimplificationError: MOVEMENT.contourError,
      maxVertsPerPoly: 6,
      detailSampleDist: 6,
      detailSampleMaxError: 1,
    });
    if (!generated.success) throw new Error('Recast could not prepare the admitted geometry.');
    prepared = {
      mesh: generated.navMesh,
      query: new R.NavMeshQuery(generated.navMesh, { maxNodes: 4096 }),
    };
    if (this.meshes.size >= 6) {
      const oldest = this.meshes.keys().next().value!;
      this.release(this.meshes.get(oldest)!);
      this.meshes.delete(oldest);
    }
    this.meshes.set(key, prepared);
    return prepared;
  }
  private release(p: Prepared) {
    const filter = p.query.defaultFilter;
    p.query.destroy();
    R.Raw.destroy(filter.raw);
    p.mesh.destroy();
  }
  destroy(): void {
    for (const p of this.meshes.values()) this.release(p);
    this.meshes.clear();
  }
  route(request: NavigationRequest): NavigationResult {
    if (
      request.geometryRevision !== this.map.spatial.revision ||
      !request.destinations.length ||
      request.destinations.length > 12
    )
      return { status: 'invalid-endpoint', path: [] };
    const { from, body } = request;
    if (!canStand(this.map, from, body)) return { status: 'invalid-endpoint', path: [] };
    const { query: q } = this.prepare(body);
    let last: NavigationResult = { status: 'no-route', path: [] };
    for (const to of request.destinations) {
      if (!canStand(this.map, to, body)) continue;
      // Small XYZ extents prevent "nearest" from silently finding another storey.
      const halfExtents = { x: 0.3, y: MOVEMENT.projectionTolerance, z: 0.3 };
      const start = q.findNearestPoly(from, { halfExtents }),
        end = q.findNearestPoly(to, { halfExtents });
      if (!start.success || !end.success || !start.nearestRef || !end.nearestRef) continue;
      const path = q.findPath(
        start.nearestRef,
        end.nearestRef,
        start.nearestPoint,
        end.nearestPoint,
        { maxPathPolys: SPATIAL_LIMITS.maxPathPoints },
      );
      const corridor = Array.from(path.polys.toTypedArray());
      path.polys.destroy();
      if ((path.status & (R.Detour.DT_OUT_OF_NODES | R.Detour.DT_BUFFER_TOO_SMALL)) !== 0) {
        last = { status: 'budget-exceeded', path: [] };
        continue;
      }
      if (
        !path.success ||
        corridor.at(-1) !== end.nearestRef ||
        (path.status & R.Detour.DT_PARTIAL_RESULT) !== 0
      )
        continue;
      const straight = q.findStraightPath(start.nearestPoint, end.nearestPoint, corridor, {
        maxStraightPathPoints: SPATIAL_LIMITS.maxPathPoints,
        straightPathOptions: R.Detour.DT_STRAIGHTPATH_ALL_CROSSINGS,
      });
      try {
        if (!straight.success || (straight.status & R.Detour.DT_BUFFER_TOO_SMALL) !== 0) {
          last = { status: 'budget-exceeded', path: [] };
          continue;
        }
        const raw = straight.straightPath.toTypedArray(),
          points: WorldPoint[] = [from];
        for (let i = 0; i < straight.straightPathCount * 3; i += 3)
          points.push({ x: raw[i]!, y: raw[i + 1]!, z: raw[i + 2]! });
        points.push(to);
        const projected = projectCorridor(this.map, points, from, to, body);
        if (!projected) {
          last = { status: 'unsafe-route', path: [] };
          continue;
        }
        let previous = from,
          length = 0;
        for (const p of projected) {
          length += distance3D(previous, p);
          previous = p;
        }
        return { status: 'reached', path: projected, length };
      } finally {
        straight.straightPath.destroy();
        straight.straightPathFlags.destroy();
        straight.straightPathRefs.destroy();
      }
    }
    return last;
  }
}

/** Recast's raster heights are guidance, not the physical foot location. Split at exact patch
 * boundaries, keep named supports and explicit zero-distance seams, then sweep every segment.
 * Increasing projection tolerance must never permit a discontinuous jump between floors.
 */
function projectCorridor(
  map: SpatialMap,
  points: WorldPoint[],
  from: SurfacePoint,
  to: SurfacePoint,
  body: BodyProfile,
): SurfacePoint[] | null {
  const out: SurfacePoint[] = [];
  let current = from;
  const append = (p: SurfacePoint): boolean => {
    if (distance3D(current, p) < 1e-7 && current.surfaceId === p.surfaceId) return true;
    if (out.length >= SPATIAL_LIMITS.maxPathPoints || !canWalkSegment(map, current, p, body))
      return false;
    out.push(p);
    current = p;
    return true;
  };
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!,
      b = points[i]!;
    if (Math.hypot(b.x - a.x, b.z - a.z) < 1e-7) continue;
    // Reuse the physical support index: remote floors cannot support this corridor segment.
    const padding = MOVEMENT.projectionTolerance + SPATIAL_LIMITS.epsilon;
    const candidates = surfacesInBounds(map, {
      min: {
        x: Math.min(a.x, b.x) - padding,
        y: Math.min(a.y, b.y) - padding,
        z: Math.min(a.z, b.z) - padding,
      },
      max: {
        x: Math.max(a.x, b.x) + padding,
        y: Math.max(a.y, b.y) + padding,
        z: Math.max(a.z, b.z) + padding,
      },
    });
    const times = [0, 1];
    for (const s of candidates)
      for (const [axis, edges] of [
        ['x', [s.minX, s.maxX]],
        ['z', [s.minZ, s.maxZ]],
      ] as const) {
        const delta = b[axis] - a[axis];
        if (Math.abs(delta) < 1e-9) continue;
        for (const edge of edges) {
          const t = (edge - a[axis]) / delta;
          if (t > 1e-7 && t < 1 - 1e-7) times.push(t);
        }
      }
    const cuts = [...new Set(times)].sort((x, y) => x - y);
    for (let j = 1; j < cuts.length; j++) {
      if (cuts[j]! - cuts[j - 1]! < 1e-7) continue;
      const first = interpolate(a, b, cuts[j - 1]!),
        last = interpolate(a, b, cuts[j]!),
        mid = interpolate(first, last, 0.5);
      const choices = candidates
        .filter(
          (s) =>
            surfaceContains(s, mid) &&
            Math.abs(surfaceHeight(s, mid.x, mid.z) - mid.y) <= MOVEMENT.projectionTolerance,
        )
        .sort(
          (s, t) =>
            Number(t.id === current.surfaceId) - Number(s.id === current.surfaceId) ||
            Math.abs(surfaceHeight(s, mid.x, mid.z) - mid.y) -
              Math.abs(surfaceHeight(t, mid.x, mid.z) - mid.y) ||
            s.id.localeCompare(t.id),
        );
      let connected = false;
      for (const s of choices) {
        const entry = {
          x: first.x,
          y: surfaceHeight(s, first.x, first.z),
          z: first.z,
          surfaceId: s.id,
        };
        const exit = { x: last.x, y: surfaceHeight(s, last.x, last.z), z: last.z, surfaceId: s.id };
        // Preview both legs before mutating output; a failed candidate cannot leave a stray seam.
        if (!canWalkSegment(map, current, entry, body) || !canWalkSegment(map, entry, exit, body))
          continue;
        if (!append(entry) || !append(exit)) return null;
        connected = true;
        break;
      }
      if (!connected) return null;
    }
  }
  if (!append({ ...to })) return null;
  return simplifySurfacePath(map, from, out, body);
}
