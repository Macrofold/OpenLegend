import {
  BODY_PROFILES,
  MOVEMENT,
  SPATIAL_LIMITS,
  type BodyProfile,
  type Bounds3,
  type RayHit,
  type SpatialMap,
  type SurfacePoint,
  type WalkableSurface,
  type WorldPoint,
  type SpatialBlocker,
} from './types.js';
import { panelGeometry } from './finite-panel.js';
import { BoundsIndex } from './bounds-index.js';
import { bodyIntersects, type CollisionSolid } from './body-query.js';
import { segmentBoundsQuery } from './segment-bounds.js';
const EPS = SPATIAL_LIMITS.epsilon;
const EMPTY_IDS: ReadonlySet<string> = new Set();
export const distance3D = (a: WorldPoint, b: WorldPoint): number =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
export const horizontalDistance = (
  a: Pick<WorldPoint, 'x' | 'z'>,
  b: Pick<WorldPoint, 'x' | 'z'>,
): number => Math.hypot(a.x - b.x, a.z - b.z);
export function finitePoint(p: unknown): p is WorldPoint {
  if (!p || typeof p !== 'object') return false;
  const v = p as WorldPoint;
  return (
    Number.isFinite(v.x) &&
    Number.isFinite(v.y) &&
    Number.isFinite(v.z) &&
    Math.max(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z)) <= SPATIAL_LIMITS.maxExtent
  );
}
export function interpolate(a: WorldPoint, b: WorldPoint, t: number): WorldPoint {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
}
export function surfaceHeight(surface: WalkableSurface, x: number, z: number): number {
  return surface.y + (x - surface.minX) * surface.slopeX + (z - surface.minZ) * surface.slopeZ;
}
export function surfaceContains(
  surface: WalkableSurface,
  point: Pick<WorldPoint, 'x' | 'z'>,
  margin = 0,
): boolean {
  return (
    point.x >= surface.minX + margin - EPS &&
    point.x <= surface.maxX - margin + EPS &&
    point.z >= surface.minZ + margin - EPS &&
    point.z <= surface.maxZ - margin + EPS
  );
}
/** Complete rectangular support, including holes in raster ground between its corners.
 * Native surface/cell ownership remains here; consumers do not restate terrain laws. */
export function surfaceSupportsRectangle(
  map: SpatialMap,
  surface: WalkableSurface,
  footprint: Pick<WalkableSurface, 'minX' | 'maxX' | 'minZ' | 'maxZ'>,
): boolean {
  if (
    !surfaceContains(surface, { x: footprint.minX, z: footprint.minZ }) ||
    !surfaceContains(surface, { x: footprint.maxX, z: footprint.maxZ })
  )
    return false;
  if (surface.material !== 'ground') return true;
  if (
    footprint.minX < 0 ||
    footprint.minZ < 0 ||
    footprint.maxX > map.width - 1 ||
    footprint.maxZ > map.height - 1
  )
    return false;
  for (let z = Math.floor(footprint.minZ + 0.5); z < Math.ceil(footprint.maxZ + 0.5); z++)
    for (let x = Math.floor(footprint.minX + 0.5); x < Math.ceil(footprint.maxX + 0.5); x++)
      if (!terrainWalkable(map, { x, y: 0, z })) return false;
  return true;
}
export function surfaceById(map: SpatialMap, id: string): WalkableSurface | undefined {
  return preparedShapes(map).supportById.get(id);
}
export function terrainWalkable(map: SpatialMap, point: WorldPoint): boolean {
  if (point.x < 0 || point.z < 0 || point.x > map.width - 1 || point.z > map.height - 1)
    return false;
  const tile = map.tiles[Math.round(point.z)]?.[Math.round(point.x)];
  return tile === 'grass' || tile === 'sand';
}
/** Resolve exact support only. Never snap an unspecified point to a different floor. */
export function resolveSupport(
  map: SpatialMap,
  point: WorldPoint,
  surfaceId?: string,
): SurfacePoint | null {
  if (!finitePoint(point)) return null;
  if (surfaceId) {
    const surface = surfaceById(map, surfaceId);
    if (!surface || !surfaceContains(surface, point)) return null;
    const y = surfaceHeight(surface, point.x, point.z);
    return Math.abs(y - point.y) <= SPATIAL_LIMITS.supportTolerance &&
      (surface.material !== 'ground' || terrainWalkable(map, point))
      ? { x: point.x, y, z: point.z, surfaceId: surface.id }
      : null;
  }
  let best: SurfacePoint | null = null,
    bestOrder = Infinity;
  preparedShapes(map).supportIndex.visit(
    (bounds) =>
      columnIntersects(bounds, point) &&
      bounds.min.y <= point.y + SPATIAL_LIMITS.supportTolerance &&
      bounds.max.y >= point.y - SPATIAL_LIMITS.supportTolerance,
    ({ surface, order }) => {
      const y = surfaceHeight(surface, point.x, point.z);
      if (
        order < bestOrder &&
        Math.abs(y - point.y) <= SPATIAL_LIMITS.supportTolerance &&
        (surface.material !== 'ground' || terrainWalkable(map, point))
      ) {
        best = { x: point.x, y, z: point.z, surfaceId: surface.id };
        bestOrder = order;
      }
      return false;
    },
  );
  return best;
}
function columnIntersects(bounds: Bounds3, point: WorldPoint): boolean {
  return (
    point.x >= bounds.min.x - EPS &&
    point.x <= bounds.max.x + EPS &&
    point.z >= bounds.min.z - EPS &&
    point.z <= bounds.max.z + EPS
  );
}
export function supportBelow(map: SpatialMap, point: WorldPoint): SurfacePoint | null {
  let best: SurfacePoint | null = null,
    bestOrder = Infinity;
  preparedShapes(map).supportIndex.visit(
    (bounds) => columnIntersects(bounds, point) && bounds.min.y <= point.y + EPS,
    ({ surface, order }) => {
      const y = surfaceHeight(surface, point.x, point.z);
      if (y <= point.y + EPS && (!best || y > best.y || (y === best.y && order < bestOrder))) {
        best = { x: point.x, y, z: point.z, surfaceId: surface.id };
        bestOrder = order;
      }
      return false;
    },
  );
  return best;
}
/** Candidate support patches; callers still check plane height, stance and exact reach. */
export function surfacesInBounds(map: SpatialMap, bounds: Bounds3): WalkableSurface[] {
  const found: Array<{ surface: WalkableSurface; order: number }> = [];
  preparedShapes(map).supportIndex.visit(
    (b) =>
      b.min.x <= bounds.max.x + EPS &&
      b.max.x >= bounds.min.x - EPS &&
      b.min.y <= bounds.max.y + EPS &&
      b.max.y >= bounds.min.y - EPS &&
      b.min.z <= bounds.max.z + EPS &&
      b.max.z >= bounds.min.z - EPS,
    (entry) => {
      found.push(entry);
      return false;
    },
  );
  return found.sort((a, b) => a.order - b.order).map((entry) => entry.surface);
}
// Halfspaces ax + by + cz <= d allow the same finite slabs/wedges to serve rays and body sweeps.
type Plane = readonly [number, number, number, number];
function boxPlanes(bounds: Bounds3): Plane[] {
  return [
    [1, 0, 0, bounds.max.x],
    [-1, 0, 0, -bounds.min.x],
    [0, 1, 0, bounds.max.y],
    [0, -1, 0, -bounds.min.y],
    [0, 0, 1, bounds.max.z],
    [0, 0, -1, -bounds.min.z],
  ];
}
function surfacePlanes(s: WalkableSurface): Plane[] {
  const intercept = s.y - s.minX * s.slopeX - s.minZ * s.slopeZ;
  return [
    [1, 0, 0, s.maxX],
    [-1, 0, 0, -s.minX],
    [0, 0, 1, s.maxZ],
    [0, 0, -1, -s.minZ],
    [-s.slopeX, 1, -s.slopeZ, intercept],
    s.solidBase === undefined
      ? [s.slopeX, -1, s.slopeZ, s.thickness - intercept]
      : [0, -1, 0, -s.solidBase],
  ];
}
function clipSegment(
  from: WorldPoint,
  to: WorldPoint,
  planes: readonly Plane[],
  body?: BodyProfile,
): [number, number] | null {
  let enter = 0,
    exit = 1;
  for (const [a, b, c, bound] of planes) {
    // Minkowski expansion for an upright conservative box with a foot-level anchor.
    const expansion = body
      ? (body.radius + MOVEMENT.skin) * (Math.abs(a) + Math.abs(c)) +
        Math.max(0, -b * body.height) +
        Math.abs(b) * MOVEMENT.skin
      : 0;
    const origin = a * from.x + b * from.y + c * from.z;
    const delta = a * (to.x - from.x) + b * (to.y - from.y) + c * (to.z - from.z);
    const limit = bound + expansion - EPS;
    if (Math.abs(delta) < EPS) {
      if (origin > limit) return null;
      continue;
    }
    const t = (limit - origin) / delta;
    if (delta < 0) enter = Math.max(enter, t);
    else exit = Math.min(exit, t);
    if (enter > exit) return null;
  }
  return enter <= 1 && exit >= 0 ? [Math.max(0, enter), Math.min(1, exit)] : null;
}
interface PreparedShape {
  panel?: SpatialBlocker['panel'];
  surface?: WalkableSurface;
  id: string;
  kind: 'surface' | 'blocker';
  planes: Plane[];
  /** Unshrunk corners and edge directions for exact separating-axis rejection. */
  vertices: WorldPoint[];
  edges: WorldPoint[];
  bounds: Bounds3;
  movement: boolean;
  sight: boolean;
  transmission: number;
}
interface SupportEntry {
  surface: WalkableSurface;
  order: number;
}
interface StanceMemo {
  radius: number;
  height: number;
  maxSlope: number;
  allowed: boolean;
}
interface PreparedGeometry {
  revision: number;
  shapes: PreparedShape[];
  blockers: SpatialBlocker[];
  supports: WalkableSurface[];
  supportById: Map<string, WalkableSurface>;
  shapeIndex: BoundsIndex<PreparedShape>;
  supportIndex: BoundsIndex<SupportEntry>;
  stances: WeakMap<SurfacePoint, StanceMemo>;
}
const shapeCache = new WeakMap<SpatialMap, PreparedGeometry>();
function surfaceHull(s: WalkableSurface): { vertices: WorldPoint[]; edges: WorldPoint[] } {
  const vertices: WorldPoint[] = [];
  for (const x of [s.minX, s.maxX])
    for (const z of [s.minZ, s.maxZ]) {
      const top = surfaceHeight(s, x, z);
      vertices.push({ x, y: top, z }, { x, y: s.solidBase ?? top - s.thickness, z });
    }
  return {
    vertices,
    edges: [
      { x: 1, y: s.slopeX, z: 0 },
      { x: 0, y: s.slopeZ, z: 1 },
      { x: 0, y: 1, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 0, z: 1 },
    ],
  };
}
function surfaceBounds(s: WalkableSurface, topOnly = false): Bounds3 {
  const ys = [
    surfaceHeight(s, s.minX, s.minZ),
    surfaceHeight(s, s.maxX, s.minZ),
    surfaceHeight(s, s.minX, s.maxZ),
    surfaceHeight(s, s.maxX, s.maxZ),
  ];
  return {
    min: {
      x: s.minX,
      y: topOnly ? Math.min(...ys) : (s.solidBase ?? Math.min(...ys) - s.thickness),
      z: s.minZ,
    },
    max: { x: s.maxX, y: Math.max(...ys), z: s.maxZ },
  };
}
function preparedShapes(map: SpatialMap) {
  const cached = shapeCache.get(map);
  if (cached?.revision === map.spatial.revision) return cached;
  const blockers: SpatialBlocker[] = [...map.spatial.blockers];
  const ground = map.spatial.surfaces.filter((surface) => surface.material === 'ground');
  // Rock geometry derives from the canonical terrain cells, not a second writable rock store.
  for (let z = 0; z < map.height; z++)
    for (let x = 0; x < map.width; x++) {
      if (map.tiles[z]?.[x] === 'rock') {
        // Terrain rocks remain attached to raised ground, including a slope junction.
        const heights = [-0.5, 0.5].flatMap((dx) =>
          [-0.5, 0.5].map((dz) => {
            const px = Math.max(0, Math.min(map.width - 1, x + dx));
            const pz = Math.max(0, Math.min(map.height - 1, z + dz));
            const surface = ground.find((s) => surfaceContains(s, { x: px, z: pz }));
            return surface ? surfaceHeight(surface, px, pz) : 0;
          }),
        );
        blockers.push({
          id: `terrain-rock:${x}:${z}`,
          bounds: {
            min: { x: x - 0.5, y: Math.min(...heights), z: z - 0.5 },
            max: { x: x + 0.5, y: Math.max(...heights) + 2, z: z + 0.5 },
          },
          movement: true,
          sight: true,
          acousticTransmission: 0.15,
          material: 'stone',
        });
      }
    }
  if (
    blockers.length > SPATIAL_LIMITS.maxBlockers ||
    map.spatial.surfaces.length > SPATIAL_LIMITS.maxSurfaces
  )
    throw new Error('Spatial query geometry exceeds its complete-query budget.');
  const shapes: PreparedShape[] = map.spatial.surfaces.map((surface) => ({
    id: surface.id,
    surface,
    kind: 'surface',
    planes: surfacePlanes(surface),
    ...surfaceHull(surface),
    bounds: surfaceBounds(surface),
    movement: true,
    sight: true,
    transmission: surface.acousticTransmission,
  }));
  shapes.push(
    ...blockers.map(
      (b): PreparedShape => ({
        id: b.id,
        kind: 'blocker',
        panel: b.panel,
        ...solidGeometry(b),
        bounds: b.bounds,
        movement: b.movement,
        sight: b.sight,
        transmission: b.acousticTransmission,
      }),
    ),
  );
  const supports = [
    ...map.spatial.surfaces,
    ...blockers
      .filter((b) => b.id.startsWith('terrain-rock:'))
      .map(
        (b): WalkableSurface => ({
          id: b.id,
          name: 'Rock top',
          levelId:
            map.spatial.surfaces.find((s) => s.material === 'ground')?.levelId ??
            map.spatial.levels[0]!.id,
          minX: b.bounds.min.x,
          maxX: b.bounds.max.x,
          minZ: b.bounds.min.z,
          maxZ: b.bounds.max.z,
          y: b.bounds.max.y,
          slopeX: 0,
          slopeZ: 0,
          thickness: b.bounds.max.y - b.bounds.min.y,
          acousticTransmission: b.acousticTransmission,
          material: 'stone',
        }),
      ),
  ];
  const result: PreparedGeometry = {
    revision: map.spatial.revision,
    stances: new WeakMap(),
    shapes,
    blockers,
    supports,
    supportById: new Map(supports.map((s) => [s.id, s])),
    shapeIndex: new BoundsIndex(shapes.map((s) => ({ value: s, bounds: s.bounds }))),
    supportIndex: new BoundsIndex(
      supports.map((surface, order) => ({
        value: { surface, order },
        bounds: surfaceBounds(surface, true),
      })),
    ),
  };
  shapeCache.set(map, result);
  return result;
}
/** Rock tops are semantic supports derived from the same canonical cells as their solid volume.
 * No duplicate geometry or second writable rock-top store is introduced. */
export function supportSurfaces(map: SpatialMap): readonly WalkableSurface[] {
  return preparedShapes(map).supports;
}
export function spatialBlockers(map: SpatialMap): readonly SpatialBlocker[] {
  return preparedShapes(map).blockers;
}
function visitHits(
  map: SpatialMap,
  from: WorldPoint,
  to: WorldPoint,
  channel: 'sight' | 'sound' | 'movement',
  ignore: ReadonlySet<string>,
  body: BodyProfile | undefined,
  visit: (shape: PreparedShape, interval: [number, number]) => boolean,
): boolean {
  if (!finitePoint(from) || !finitePoint(to)) throw new Error('Invalid spatial ray.');
  return preparedShapes(map).shapeIndex.visit(segmentBoundsQuery(from, to, body), (shape) => {
    if (
      ignore.has(shape.id) ||
      (channel === 'sight' && !shape.sight) ||
      (channel === 'movement' && !shape.movement)
    )
      return false;
    const interval = clipSegment(from, to, shape.planes, body);
    return !!interval && visit(shape, interval);
  });
}
export function rayHits(
  map: SpatialMap,
  from: WorldPoint,
  to: WorldPoint,
  channel: 'sight' | 'sound' | 'movement' = 'sight',
  ignore: ReadonlySet<string> = EMPTY_IDS,
  body?: BodyProfile,
): RayHit[] {
  const hits: RayHit[] = [];
  visitHits(map, from, to, channel, ignore, body, (shape, interval) => {
    hits.push({
      id: shape.id,
      kind: shape.kind,
      fraction: interval[0],
      exitFraction: interval[1],
      point: interpolate(from, to, interval[0]),
      transmission: shape.transmission,
    });
    return false;
  });
  return hits.sort((a, b) => a.fraction - b.fraction || a.id.localeCompare(b.id));
}
export const clearSegment = (map: SpatialMap, from: WorldPoint, to: WorldPoint): boolean =>
  !visitHits(map, from, to, 'sight', EMPTY_IDS, undefined, () => true);
/** Physical work cannot reach through a transparent movement blocker. End-face
 * contact uses the same shrunken planes as ordinary rays, without ignoring a part. */
export const clearPhysicalSegment = (map: SpatialMap, from: WorldPoint, to: WorldPoint): boolean =>
  !visitHits(map, from, to, 'movement', EMPTY_IDS, undefined, () => true);

function boxHull(bounds: Bounds3) {
  return {
    vertices: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({
      x: i & 1 ? bounds.max.x : bounds.min.x,
      y: i & 2 ? bounds.max.y : bounds.min.y,
      z: i & 4 ? bounds.max.z : bounds.min.z,
    })),
    edges: [
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 0, z: 1 },
    ],
  };
}
function solidGeometry(solid: CollisionSolid) {
  return solid.panel
    ? panelGeometry(solid.panel)
    : solid.surface
      ? { planes: surfacePlanes(solid.surface), ...surfaceHull(solid.surface) }
      : { planes: boxPlanes(solid.bounds), ...boxHull(solid.bounds) };
}
function solidsOverlap(
  a: ReturnType<typeof solidGeometry>,
  b: ReturnType<typeof solidGeometry>,
): boolean {
  const axes = [...a.planes, ...b.planes].map(([x, y, z]) => ({ x, y, z }));
  for (const left of a.edges) for (const right of b.edges) axes.push(cross(left, right));
  for (const axis of axes) {
    const length = Math.hypot(axis.x, axis.y, axis.z);
    if (length < 1e-12) continue;
    let aMin = Infinity,
      aMax = -Infinity,
      bMin = Infinity,
      bMax = -Infinity;
    for (const p of a.vertices) {
      const value = axis.x * p.x + axis.y * p.y + axis.z * p.z;
      aMin = Math.min(aMin, value);
      aMax = Math.max(aMax, value);
    }
    for (const p of b.vertices) {
      const value = axis.x * p.x + axis.y * p.y + axis.z * p.z;
      bMin = Math.min(bMin, value);
      bMax = Math.max(bMax, value);
    }
    if (Math.min(aMax, bMax) - Math.max(aMin, bMin) <= EPS * length) return false;
  }
  return true;
}
/** Positive-volume exact overlap. Contact qualification remains with the caller's
 * admitted family; bounds only prune candidates and never supply that permission. */
export function solidOverlap(a: CollisionSolid, b: CollisionSolid): boolean {
  return solidsOverlap(solidGeometry(a), solidGeometry(b));
}
export function physicalIntersections(map: SpatialMap, solid: CollisionSolid) {
  const query = solidGeometry(solid),
    hits: Array<{
      id: string;
      kind: 'surface' | 'blocker';
      bounds: Bounds3;
      panel?: SpatialBlocker['panel'];
    }> = [];
  preparedShapes(map).shapeIndex.visit(
    (b) =>
      b.min.x < solid.bounds.max.x &&
      b.max.x > solid.bounds.min.x &&
      b.min.y < solid.bounds.max.y &&
      b.max.y > solid.bounds.min.y &&
      b.min.z < solid.bounds.max.z &&
      b.max.z > solid.bounds.min.z,
    (shape) => {
      if (shape.movement && solidsOverlap(query, shape))
        hits.push({ id: shape.id, kind: shape.kind, bounds: shape.bounds, panel: shape.panel });
      return false;
    },
  );
  return hits;
}
/** A shrunken sight polytope returned by sightObstacles; opaque outside this module. */
export interface SightObstacle {
  readonly planes: readonly Plane[];
}
function separated(planes: readonly Plane[], points: readonly WorldPoint[]): boolean {
  return planes.some(([a, b, c, bound]) =>
    points.every((p) => a * p.x + b * p.y + c * p.z > bound - EPS),
  );
}
const cross = (u: WorldPoint, v: WorldPoint): WorldPoint => ({
  x: u.y * v.z - u.z * v.y,
  y: u.z * v.x - u.x * v.z,
  z: u.x * v.y - u.y * v.x,
});
const minus = (u: WorldPoint, v: WorldPoint): WorldPoint => ({
  x: u.x - v.x,
  y: u.y - v.y,
  z: u.z - v.z,
});
/** Separating-axis rejection of a ray family's hull (up to four points) from a shape: its
 * face planes, the hull's face normals and edge-by-edge cross products. The shape's unshrunk
 * corners make every rejection conservative for the shrunken polytope clipSegment tests. */
function hullSeparated(shape: PreparedShape, points: readonly WorldPoint[]): boolean {
  if (separated(shape.planes, points)) return true;
  const edges: WorldPoint[] = [];
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++) edges.push(minus(points[j]!, points[i]!));
  const axes: WorldPoint[] = [];
  for (let i = 0; i < edges.length; i++)
    for (let j = i + 1; j < edges.length; j++) axes.push(cross(edges[i]!, edges[j]!));
  for (const edge of edges) for (const direction of shape.edges) axes.push(cross(edge, direction));
  return axes.some((axis) => {
    if (Math.abs(axis.x) + Math.abs(axis.y) + Math.abs(axis.z) < 1e-12) return false;
    let low = Infinity,
      high = -Infinity,
      shapeLow = Infinity,
      shapeHigh = -Infinity;
    for (const p of points) {
      const v = axis.x * p.x + axis.y * p.y + axis.z * p.z;
      low = Math.min(low, v);
      high = Math.max(high, v);
    }
    for (const p of shape.vertices) {
      const v = axis.x * p.x + axis.y * p.y + axis.z * p.z;
      shapeLow = Math.min(shapeLow, v);
      shapeHigh = Math.max(shapeHigh, v);
    }
    return high < shapeLow || shapeHigh < low;
  });
}
/** Sight shapes that may block some segment inside the hull of the given points. A shape is
 * skipped exactly when one of its shrunken face planes has every point strictly outside: any
 * segment in their hull then misses it under clipSegment's rules, including the parallel rule. */
export function sightObstacles(
  map: SpatialMap,
  points: readonly WorldPoint[],
): readonly SightObstacle[] {
  const min = { x: Infinity, y: Infinity, z: Infinity },
    max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const p of points) {
    if (!finitePoint(p)) throw new Error('Invalid spatial ray.');
    for (const axis of ['x', 'y', 'z'] as const) {
      min[axis] = Math.min(min[axis], p[axis] - EPS);
      max[axis] = Math.max(max[axis], p[axis] + EPS);
    }
  }
  const shapes: PreparedShape[] = [];
  preparedShapes(map).shapeIndex.visit(
    (b) =>
      b.min.x <= max.x &&
      b.max.x >= min.x &&
      b.min.y <= max.y &&
      b.max.y >= min.y &&
      b.min.z <= max.z &&
      b.max.z >= min.z,
    (shape) => {
      if (shape.sight && !hullSeparated(shape, points)) shapes.push(shape);
      return false;
    },
  );
  return shapes;
}
/** clearSegment for a segment inside the hull its obstacles were gathered from. */
export function clearOf(
  obstacles: readonly SightObstacle[],
  from: WorldPoint,
  to: WorldPoint,
): boolean {
  return !obstacles.some((obstacle) => clipSegment(from, to, obstacle.planes));
}
/** Real roots of a·t² + b·t + c, appended; cancellation-free form, linear when a vanishes. */
export function quadraticRoots(a: number, b: number, c: number, roots: number[]): void {
  if (Math.abs(a) <= 1e-12 * (Math.abs(b) + Math.abs(c))) {
    if (b !== 0) roots.push(-c / b);
    return;
  }
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return;
  const q = -0.5 * (b + (b < 0 ? -1 : 1) * Math.sqrt(discriminant));
  roots.push(q / a);
  if (q !== 0) roots.push(c / q);
}
/** Fractions in (0, 1) where clearSegment's answer can change while both segment endpoints
 * move linearly (from0→from1, to0→to1), against obstacles gathered for a hull containing all
 * four points. They are the roots of the comparisons clipSegment makes: parallel-rule switches,
 * crossings of a segment end, and an entered plane's crossing fraction meeting an exited one's
 * inside the segment (only those can flip enter ≤ exit). Between consecutive fractions the
 * answer is constant; callers classify each piece with clearOf, never from these roots.
 * docs/maintainers/simulation-boundaries.md#perception-sound-and-cognition */
export function sightChangeFractions(
  obstacles: readonly SightObstacle[],
  from0: WorldPoint,
  from1: WorldPoint,
  to0: WorldPoint,
  to1: WorldPoint,
): number[] {
  const roots: number[] = [],
    candidates: number[] = [];
  const linear = (value: number, slope: number) => {
    if (slope !== 0) roots.push(-value / slope);
  };
  const dot = (a: number, b: number, c: number, p: WorldPoint) => a * p.x + b * p.y + c * p.z;
  const points = [from0, from1, to0, to1];
  for (const obstacle of obstacles) {
    if (hullSeparated(obstacle as PreparedShape, points)) continue;
    const shape = obstacle.planes;
    // origin(t) = o + o'·t, delta(t) = d + d'·t, remaining(t) = limit - origin(t) = p + q·t.
    const planes = shape.map(([a, b, c, bound]) => {
      const o = dot(a, b, c, from0),
        slope = dot(a, b, c, from1) - o,
        d = dot(a, b, c, to0) - o,
        dSlope = dot(a, b, c, to1) - o - slope - d;
      return { p: bound - EPS - o, q: -slope, d, dSlope };
    });
    for (const { p, q, d, dSlope } of planes) {
      linear(d - EPS, dSlope);
      linear(d + EPS, dSlope);
      linear(-p, -q);
      linear(d - p, dSlope - q);
    }
    for (let i = 0; i < planes.length; i++)
      for (let j = i + 1; j < planes.length; j++) {
        const u = planes[i]!,
          v = planes[j]!;
        // Equal crossing fractions: remaining_i·delta_j - remaining_j·delta_i = 0.
        candidates.length = 0;
        quadraticRoots(
          u.q * v.dSlope - v.q * u.dSlope,
          u.p * v.dSlope + u.q * v.d - v.p * u.dSlope - v.q * u.d,
          u.p * v.d - v.p * u.d,
          candidates,
        );
        for (const t of candidates) {
          const du = u.d + u.dSlope * t,
            dv = v.d + v.dSlope * t;
          if (Math.abs(du) < EPS || Math.abs(dv) < EPS || du * dv > 0) continue;
          const at = (u.p + u.q * t) / du;
          if (at >= -1e-9 && at <= 1 + 1e-9) roots.push(t);
        }
      }
  }
  return roots.filter((t) => t > 0 && t < 1).sort((a, b) => a - b);
}
/** Exact ordered transmission, or null once attenuation proves this threshold impossible.
 * Every admitted factor is in [0,1]: a single weaker crossing can reject before the remaining
 * tree/ray work. Successful answers retain canonical multiplication order and full precision.
 * docs/performance.md#eight-times-spatial-and-sensory-budget
 */
export function soundTransmissionAtLeast(
  map: SpatialMap,
  from: WorldPoint,
  to: WorldPoint,
  minimum: number,
): number | null {
  if (!Number.isFinite(minimum) || minimum < 0 || minimum > 1)
    throw new Error('Invalid sound transmission threshold.');
  const hits: { id: string; fraction: number; transmission: number }[] = [];
  if (
    visitHits(map, from, to, 'sound', EMPTY_IDS, undefined, (shape, interval) => {
      if (shape.transmission < minimum) return true;
      hits.push({ id: shape.id, fraction: interval[0], transmission: shape.transmission });
      return false;
    })
  )
    return null;
  hits.sort((a, b) => a.fraction - b.fraction || a.id.localeCompare(b.id));
  const value = hits.reduce((total, hit) => total * hit.transmission, 1);
  return value < minimum ? null : value;
}
/** Broadband energy ratio for the pinned hearing policy, not pressure amplitude.
 * docs/hearing-and-speech.md#3-geometry-attenuation-and-noise */
export function soundTransmission(map: SpatialMap, from: WorldPoint, to: WorldPoint): number {
  // Attenuation needs no display points or exit fractions. Preserve canonical multiplication
  // order for non-neutral crossings; an opaque crossing makes every ordering exactly zero.
  // docs/hearing-and-speech.md#performance-and-invalidation
  const crossings: Pick<RayHit, 'id' | 'fraction' | 'transmission'>[] = [];
  const blocked = visitHits(map, from, to, 'sound', EMPTY_IDS, undefined, (shape, interval) => {
    if (shape.transmission === 0) return true;
    if (shape.transmission !== 1)
      crossings.push({ id: shape.id, fraction: interval[0], transmission: shape.transmission });
    return false;
  });
  if (blocked) return 0;
  crossings.sort((a, b) => a.fraction - b.fraction || a.id.localeCompare(b.id));
  return crossings.reduce((value, hit) => value * hit.transmission, 1);
}

function onlySupportContact(
  map: SpatialMap,
  shape: PreparedShape,
  interval: readonly [number, number],
  from: SurfacePoint,
  to: SurfacePoint,
  body: BodyProfile,
): boolean {
  if (shape.kind !== 'surface') return false;
  // A whole slab below both foot anchors cannot intrude above the supported chord.
  if (shape.bounds.max.y <= Math.min(from.y, to.y) + SPATIAL_LIMITS.supportTolerance) return true;
  const s = surfaceById(map, shape.id)!;
  const support = surfaceById(map, from.surfaceId)!;
  const toeAllowance = body.radius * Math.hypot(support.slopeX, support.slopeZ);
  return aboveSurfaceDuringContact(s, from, to, interval, toeAllowance);
}
function aboveSurfaceDuringContact(
  s: WalkableSurface,
  from: WorldPoint,
  to: WorldPoint,
  interval: readonly [number, number],
  allowance = 0,
): boolean {
  const times = [...interval];
  // Clamping to patch bounds makes this piecewise linear; include every change of slope.
  for (const [a, b, min, max] of [
    [from.x, to.x, s.minX, s.maxX],
    [from.z, to.z, s.minZ, s.maxZ],
  ]) {
    if (Math.abs(b! - a!) < EPS) continue;
    for (const boundary of [min!, max!]) {
      const t = (boundary - a!) / (b! - a!);
      if (t > interval[0] && t < interval[1]) times.push(t);
    }
  }
  return times.every((t) => {
    const p = interpolate(from, to, t);
    return (
      p.y + allowance + SPATIAL_LIMITS.supportTolerance >=
      surfaceHeight(
        s,
        Math.max(s.minX, Math.min(s.maxX, p.x)),
        Math.max(s.minZ, Math.min(s.maxZ, p.z)),
      )
    );
  });
}

export function canStand(
  map: SpatialMap,
  point: SurfacePoint,
  body: BodyProfile = BODY_PROFILES.person,
): boolean {
  // Navigation reuses immutable points for many adjacent edges. Cache their exact stance,
  // not a guessed clearance class. Mutable positions always take the complete query path.
  // The owning map/revision invalidates these weak entries with all other derived geometry.
  // archive/07-technical-architecture/spatial-world-runtime.md#initial-native-provider
  const memo = Object.isFrozen(point) ? preparedShapes(map).stances : undefined;
  const prior = memo?.get(point);
  if (
    prior &&
    prior.radius === body.radius &&
    prior.height === body.height &&
    prior.maxSlope === body.maxSlope
  )
    return prior.allowed;
  const support = resolveSupport(map, point, point.surfaceId);
  const surface = surfaceById(map, point.surfaceId);
  if (!support || !surface || Math.hypot(surface.slopeX, surface.slopeZ) > body.maxSlope)
    return false;
  // Stance/clearance are boolean queries; do not allocate and sort a complete hit list.
  const allowed = !visitHits(
    map,
    point,
    point,
    'movement',
    new Set([point.surfaceId]),
    body,
    (shape, interval) =>
      !onlySupportContact(map, shape, interval, point, point, body) &&
      bodyIntersects(shape, point, point, body),
  );
  memo?.set(point, { radius: body.radius, height: body.height, maxSlope: body.maxSlope, allowed });
  return allowed;
}
export function canWalkSegment(
  map: SpatialMap,
  from: SurfacePoint,
  to: SurfacePoint,
  body: BodyProfile = BODY_PROFILES.person,
): boolean {
  if (
    from.surfaceId !== to.surfaceId &&
    (horizontalDistance(from, to) > EPS ||
      Math.abs(from.y - to.y) > SPATIAL_LIMITS.supportTolerance)
  )
    return false;
  if (!canStand(map, from, body) || !canStand(map, to, body)) return false;
  const a = surfaceById(map, from.surfaceId)!,
    b = surfaceById(map, to.surfaceId)!;
  const ignored = new Set([from.surfaceId, to.surfaceId]);
  // Supported patches are convex planes: the chord stays on its admitted surface. Different
  // supports connect only at a coincident seam, never through a wall or between floors.
  if (from.surfaceId === to.surfaceId && (!surfaceContains(a, to) || !surfaceContains(b, from)))
    return false;
  if (
    visitHits(
      map,
      from,
      to,
      'movement',
      ignored,
      body,
      (shape, interval) =>
        !onlySupportContact(map, shape, interval, from, to, body) &&
        bodyIntersects(shape, from, to, body),
    )
  )
    return false;
  return a.material !== 'ground' || terrainSegmentWalkable(map, from, to);
}
/** Visit crossed terrain cells exactly instead of sampling every 25 cm. Short diagonal
 * water crossings must not disappear between samples; this is not position quantization.
 * docs/spatial-world.md#movement
 */
function terrainSegmentWalkable(map: SpatialMap, from: WorldPoint, to: WorldPoint): boolean {
  let x = Math.round(from.x),
    z = Math.round(from.z);
  const dx = to.x - from.x,
    dz = to.z - from.z;
  const sx = Math.sign(dx),
    sz = Math.sign(dz);
  const stepX = dx === 0 ? Infinity : 1 / Math.abs(dx);
  const stepZ = dz === 0 ? Infinity : 1 / Math.abs(dz);
  let tx = dx === 0 ? Infinity : (x + sx * 0.5 - from.x) / dx;
  let tz = dz === 0 ? Infinity : (z + sz * 0.5 - from.z) / dz;
  const allowed = (cx: number, cz: number): boolean => {
    const tile = map.tiles[cz]?.[cx];
    return tile === 'grass' || tile === 'sand';
  };
  while (true) {
    if (!allowed(x, z)) return false;
    const next = Math.min(tx, tz);
    if (next >= 1) return terrainWalkable(map, to);
    // An exact corner cannot squeeze between two non-walkable cells.
    if (tx === tz && (!allowed(x + sx, z) || !allowed(x, z + sz))) return false;
    if (tx === next) {
      x += sx;
      tx += stepX;
    }
    if (tz === next) {
      z += sz;
      tz += stepZ;
    }
  }
}
export function canFlySegment(
  map: SpatialMap,
  from: WorldPoint,
  to: WorldPoint,
  body: BodyProfile,
  supportIds: string[] = [],
): boolean {
  // Landing/takeoff may touch a named support's top, never pass through its underside.
  // Ignoring the whole landing slab would allow a vertical route up through a ceiling.
  return !visitHits(map, from, to, 'movement', EMPTY_IDS, body, (shape, interval) => {
    if (!bodyIntersects(shape, from, to, body)) return false;
    if (shape.kind !== 'surface' || !supportIds.includes(shape.id)) return true;
    const surface = surfaceById(map, shape.id)!;
    return !aboveSurfaceDuringContact(surface, from, to, interval);
  });
}
/** Camera picking hits physical top faces. Focus filters presentation only, not collision. */
export function pickSurfaces(
  map: SpatialMap,
  from: WorldPoint,
  to: WorldPoint,
  levelId: string | null,
): Array<{ point: SurfacePoint; fraction: number }> {
  const hits: Array<{ point: SurfacePoint; fraction: number }> = [];
  const candidates: WalkableSurface[] = [];
  preparedShapes(map).supportIndex.visit(segmentBoundsQuery(from, to), ({ surface }) => {
    candidates.push(surface);
    return false;
  });
  for (const surface of candidates) {
    if (levelId && surface.levelId !== levelId) continue;
    const dy = to.y - from.y - surface.slopeX * (to.x - from.x) - surface.slopeZ * (to.z - from.z);
    if (Math.abs(dy) < EPS) continue;
    const t = (surfaceHeight(surface, from.x, from.z) - from.y) / dy;
    if (t < 0 || t > 1) continue;
    const point = { ...interpolate(from, to, t), surfaceId: surface.id };
    if (
      surfaceContains(surface, point) &&
      (surface.material !== 'ground' || terrainWalkable(map, point))
    )
      hits.push({ point, fraction: t });
  }
  return hits.sort(
    (a, b) => a.fraction - b.fraction || a.point.surfaceId.localeCompare(b.point.surfaceId),
  );
}

export function intersectBox(from: WorldPoint, to: WorldPoint, bounds: Bounds3): number | null {
  return clipSegment(from, to, boxPlanes(bounds))?.[0] ?? null;
}
