import {
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
import { BoundsIndex, type BoundsQueryCursor } from './bounds-index.js';
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
/** Horizontal angular admission shared by native sight and its public guide. */
export function horizontalCone(origin: WorldPoint, heading: number, radians: number) {
  if (radians >= 2 * Math.PI) return (_point: WorldPoint) => true;
  const x = Math.sin(heading),
    z = Math.cos(heading),
    edge = Math.cos(radians / 2);
  return (point: WorldPoint) => {
    const dx = point.x - origin.x,
      dz = point.z - origin.z,
      length = Math.hypot(dx, dz);
    // The cone includes its boundary. Account only for arithmetic/trigonometric
    // rounding, not a world-authored angular or positional tolerance.
    const rounding = 8 * Number.EPSILON * (Math.abs(dx) + Math.abs(dz) + length);
    return dx * x + dz * z + rounding >= edge * length;
  };
}
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
  if (!surface.terrain) return true;
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
/** A disk can touch a cell boundary without occupying the square beyond it. */
export function surfaceSupportsDisk(
  map: SpatialMap,
  surface: WalkableSurface,
  centre: Pick<WorldPoint, 'x' | 'z'>,
  radius: number,
): boolean {
  if (!surfaceContains(surface, centre, radius)) return false;
  if (!surface.terrain) return true;
  if (
    centre.x - radius < 0 ||
    centre.z - radius < 0 ||
    centre.x + radius > map.width - 1 ||
    centre.z + radius > map.height - 1
  )
    return false;
  for (let z = Math.floor(centre.z - radius + 0.5); z < Math.ceil(centre.z + radius + 0.5); z++)
    for (let x = Math.floor(centre.x - radius + 0.5); x < Math.ceil(centre.x + radius + 0.5); x++) {
      const dx = Math.max(Math.abs(centre.x - x) - 0.5, 0);
      const dz = Math.max(Math.abs(centre.z - z) - 0.5, 0);
      if (dx * dx + dz * dz < radius * radius && !terrainWalkable(map, { x, y: 0, z }))
        return false;
    }
  return true;
}
export function surfaceById(map: SpatialMap, id: string): WalkableSurface | undefined {
  return preparedShapes(map).supportById.get(id);
}
export function terrainWalkable(map: SpatialMap, point: WorldPoint): boolean {
  if (point.x < 0 || point.z < 0 || point.x > map.width - 1 || point.z > map.height - 1)
    return false;
  const tile = map.tiles[Math.round(point.z)]?.[Math.round(point.x)];
  return tile !== undefined && map.terrain[tile]?.walkable === true;
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
      (!surface.terrain || terrainWalkable(map, point))
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
        (!surface.terrain || terrainWalkable(map, point))
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
/** Bounded preparation for physical-source producers. Exhaustion is an unfinished
 * candidate search, never a claim that the remaining surfaces are absent. */
export function querySurfacesInBounds(
  map: SpatialMap,
  bounds: Bounds3,
  allowance: number,
  cursor?: BoundsQueryCursor,
) {
  const result = preparedShapes(map).supportIndex.query(
    (b) =>
      b.min.x <= bounds.max.x + EPS &&
      b.max.x >= bounds.min.x - EPS &&
      b.min.y <= bounds.max.y + EPS &&
      b.max.y >= bounds.min.y - EPS &&
      b.min.z <= bounds.max.z + EPS &&
      b.max.z >= bounds.min.z - EPS,
    allowance,
    cursor,
  );
  return { ...result, values: result.values.map((entry) => entry.surface) };
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
  terrain: SpatialMap['terrain'];
  shapes: PreparedShape[];
  blockers: SpatialBlocker[];
  supports: WalkableSurface[];
  supportById: Map<string, WalkableSurface>;
  shapeIndex: BoundsIndex<PreparedShape>;
  supportIndex: BoundsIndex<SupportEntry>;
  stances: WeakMap<SurfacePoint, StanceMemo>;
  features?: { byId: Map<string, PhysicalFeature>; index: BoundsIndex<PhysicalFeature> };
}
/** Exact source-owned convex pieces, shared by all receivers. Source names and
 * hidden topology stay here; receivers disclose only certified local extents. */
export interface PhysicalFeature {
  id: string;
  sourceId: string;
  kind: 'support' | 'solid-face';
  vertices: [WorldPoint, WorldPoint, WorldPoint, WorldPoint];
  normal: WorldPoint;
  bounds: Bounds3;
}
function featureBounds(points: readonly WorldPoint[]): Bounds3 {
  return {
    min: {
      x: Math.min(...points.map((p) => p.x)),
      y: Math.min(...points.map((p) => p.y)),
      z: Math.min(...points.map((p) => p.z)),
    },
    max: {
      x: Math.max(...points.map((p) => p.x)),
      y: Math.max(...points.map((p) => p.y)),
      z: Math.max(...points.map((p) => p.z)),
    },
  };
}
function physicalFeatures(map: SpatialMap) {
  const prepared = preparedShapes(map);
  if (prepared.features) return prepared.features;
  const values: PhysicalFeature[] = [];
  const addSupport = (
    surface: WalkableSurface,
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
  ) => {
    if (maxX <= minX || maxZ <= minZ) return;
    const vertices = [
      [minX, minZ],
      [maxX, minZ],
      [maxX, maxZ],
      [minX, maxZ],
    ].map(([x, z]) => ({
      x: x!,
      z: z!,
      y: surfaceHeight(surface, x!, z!),
    })) as PhysicalFeature['vertices'];
    const length = Math.hypot(surface.slopeX, 1, surface.slopeZ);
    values.push({
      id: JSON.stringify(['support', surface.id, minX, maxX, minZ, maxZ]),
      sourceId: surface.id,
      kind: 'support',
      vertices,
      normal: { x: -surface.slopeX / length || 0, y: 1 / length, z: -surface.slopeZ / length || 0 },
      bounds: featureBounds(vertices),
    });
  };
  for (const surface of prepared.supports) {
    if (!surface.terrain) {
      addSupport(surface, surface.minX, surface.maxX, surface.minZ, surface.maxZ);
      continue;
    }
    // Merge compatible actual cell runs once. A hole or differing authored cell
    // remains a boundary; observers never independently subdivide the whole map.
    let active = new Map<string, { minX: number; maxX: number; minZ: number; maxZ: number }>();
    for (
      let z = Math.max(0, Math.floor(surface.minZ + 0.5));
      z <= Math.min(map.height - 1, Math.floor(surface.maxZ + 0.5));
      z++
    ) {
      const row = new Map<string, { minX: number; maxX: number; minZ: number; maxZ: number }>();
      let x = Math.max(0, Math.floor(surface.minX + 0.5));
      while (x <= Math.min(map.width - 1, Math.floor(surface.maxX + 0.5))) {
        const tile = map.tiles[z]?.[x];
        if (!tile || !map.terrain[tile]?.walkable) {
          x++;
          continue;
        }
        const start = x++;
        while (
          x <= Math.min(map.width - 1, Math.floor(surface.maxX + 0.5)) &&
          map.tiles[z]?.[x] === tile
        )
          x++;
        const minX = Math.max(surface.minX, start - 0.5, 0),
          maxX = Math.min(surface.maxX, x - 0.5, map.width - 1);
        const key = JSON.stringify([tile, minX, maxX]),
          old = active.get(key);
        const rectangle = {
          minX,
          maxX,
          minZ: old?.minZ ?? Math.max(surface.minZ, z - 0.5, 0),
          maxZ: Math.min(surface.maxZ, z + 0.5, map.height - 1),
        };
        row.set(key, rectangle);
        active.delete(key);
      }
      for (const rectangle of active.values())
        addSupport(surface, rectangle.minX, rectangle.maxX, rectangle.minZ, rectangle.maxZ);
      active = row;
    }
    for (const rectangle of active.values())
      addSupport(surface, rectangle.minX, rectangle.maxX, rectangle.minZ, rectangle.maxZ);
  }
  for (let shapeIndex = 0; shapeIndex < prepared.shapes.length; shapeIndex++) {
    const shape = prepared.shapes[shapeIndex]!;
    // Terrain's planar support is already represented above. Slab sides and
    // solid faces are useful finite context, never a disclosed hidden volume.
    for (let ordinal = 0; ordinal < shape.planes.length; ordinal++) {
      if (shape.kind === 'surface' && ordinal === 4) continue;
      const [a, b, c, d] = shape.planes[ordinal]!,
        length = Math.hypot(a, b, c),
        normal = { x: a / length, y: b / length, z: c / length };
      const points = shape.vertices.filter(
        (p, index, vertices) =>
          Math.abs(a * p.x + b * p.y + c * p.z - d) <= EPS * 4 &&
          !vertices.slice(0, index).some((other) => distance3D(p, other) <= EPS),
      );
      if (points.length !== 3 && points.length !== 4) continue;
      const centre = {
        x: points.reduce((n, p) => n + p.x, 0) / points.length,
        y: points.reduce((n, p) => n + p.y, 0) / points.length,
        z: points.reduce((n, p) => n + p.z, 0) / points.length,
      };
      const u = {
          x: points[0]!.x - centre.x,
          y: points[0]!.y - centre.y,
          z: points[0]!.z - centre.z,
        },
        v = cross(normal, u);
      const dot = (p: WorldPoint, q: WorldPoint) =>
        (p.x - centre.x) * q.x + (p.y - centre.y) * q.y + (p.z - centre.z) * q.z;
      points.sort((p, q) => Math.atan2(dot(p, v), dot(p, u)) - Math.atan2(dot(q, v), dot(q, u)));
      if (points.length === 3) points.push(points[2]!);
      values.push({
        id: JSON.stringify(['face', shape.kind, shape.id, shapeIndex, ordinal]),
        sourceId: shape.id,
        kind: 'solid-face',
        vertices: points as PhysicalFeature['vertices'],
        normal,
        bounds: featureBounds(points),
      });
    }
  }
  return (prepared.features = {
    byId: new Map(values.map((value) => [value.id, value])),
    index: new BoundsIndex(values.map((value) => ({ value, bounds: value.bounds }))),
  });
}
export function physicalFeatureById(map: SpatialMap, id: string): PhysicalFeature | undefined {
  return physicalFeatures(map).byId.get(id);
}
export function queryPhysicalFeatures(
  map: SpatialMap,
  bounds: Bounds3,
  allowance: number,
  cursor?: BoundsQueryCursor,
) {
  return physicalFeatures(map).index.query(
    (b) =>
      b.min.x <= bounds.max.x &&
      b.max.x >= bounds.min.x &&
      b.min.y <= bounds.max.y &&
      b.max.y >= bounds.min.y &&
      b.min.z <= bounds.max.z &&
      b.max.z >= bounds.min.z,
    allowance,
    cursor,
  );
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
  if (cached?.revision === map.spatial.revision && cached.terrain === map.terrain) return cached;
  const pieceCount = map.spatial.blockers.reduce(
    (count, blocker) => count + (blocker.boxes?.length ?? 1),
    0,
  );
  if (pieceCount > SPATIAL_LIMITS.maxBlockers)
    throw new Error('Spatial query geometry exceeds its complete-query budget.');
  // Keep one source identity across exact pieces. Ray contacts and ignored IDs
  // still name the real obstacle, while its enclosing bounds never fill a hole.
  const blockers: SpatialBlocker[] = [];
  for (const blocker of map.spatial.blockers) {
    if (!blocker.boxes) blockers.push(blocker);
    else {
      const { boxes, ...properties } = blocker;
      for (const bounds of boxes) blockers.push({ ...properties, bounds });
    }
  }

  const ground = map.spatial.surfaces.filter((surface) => surface.terrain);
  // Compile authored cell solids once with the map, never once per actor or query.
  const terrainNames = new Map<string, string>();
  for (let z = 0; z < map.height; z++)
    for (let x = 0; x < map.width; x++) {
      const tile = map.tiles[z]?.[x],
        solid = tile === undefined ? undefined : map.terrain[tile]?.solid;
      if (solid) {
        // Cell solids remain attached to raised ground, including a slope junction.
        const heights = [-0.5, 0.5].flatMap((dx) =>
          [-0.5, 0.5].map((dz) => {
            const px = Math.max(0, Math.min(map.width - 1, x + dx));
            const pz = Math.max(0, Math.min(map.height - 1, z + dz));
            const surface = ground.find((s) => surfaceContains(s, { x: px, z: pz }));
            return surface ? surfaceHeight(surface, px, pz) : 0;
          }),
        );
        const id = `terrain-solid:${x}:${z}`;
        terrainNames.set(id, solid.name);
        blockers.push({
          id,
          bounds: {
            min: { x: x - 0.5, y: Math.min(...heights), z: z - 0.5 },
            max: { x: x + 0.5, y: Math.max(...heights) + solid.height, z: z + 0.5 },
          },
          movement: solid.movement,
          sight: solid.sight,
          acousticTransmission: solid.acousticTransmission,
          material: solid.material,
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
      .filter((b) => terrainNames.has(b.id) && b.movement)
      .map(
        (b): WalkableSurface => ({
          id: b.id,
          name: terrainNames.get(b.id)!,
          levelId:
            map.spatial.surfaces.find((s) => s.terrain)?.levelId ?? map.spatial.levels[0]!.id,
          minX: b.bounds.min.x,
          maxX: b.bounds.max.x,
          minZ: b.bounds.min.z,
          maxZ: b.bounds.max.z,
          y: b.bounds.max.y,
          slopeX: 0,
          slopeZ: 0,
          thickness: b.bounds.max.y - b.bounds.min.y,
          acousticTransmission: b.acousticTransmission,
          material: b.material,
        }),
      ),
  ];
  const result: PreparedGeometry = {
    revision: map.spatial.revision,
    terrain: map.terrain,
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
/** Solid tops derive from the same authored cells as their collision volume; no second
 * writable terrain geometry is introduced. */
export function supportSurfaces(map: SpatialMap): readonly WalkableSurface[] {
  return preparedShapes(map).supports;
}
export function spatialBlockers(map: SpatialMap): readonly SpatialBlocker[] {
  return preparedShapes(map).blockers;
}
/** Conservative full-extent candidates from the existing physical shape index.
 * Exact overlap, range, visibility and disclosure remain with each caller. */
export function spatialBlockerCandidates(
  map: SpatialMap,
  bounds: Bounds3,
): Array<{ id: string; bounds: Bounds3 }> {
  const result: Array<{ id: string; bounds: Bounds3 }> = [];
  preparedShapes(map).shapeIndex.visit(
    (candidate) =>
      (['x', 'y', 'z'] as const).every(
        (axis) =>
          candidate.min[axis] <= bounds.max[axis] && candidate.max[axis] >= bounds.min[axis],
      ),
    (shape) => {
      if (shape.kind === 'blocker') result.push({ id: shape.id, bounds: shape.bounds });
      return false;
    },
  );
  return result;
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
// A surface or corner touched only at one point is visible; penetration still blocks.
// Direct and prepared sight queries must agree. docs/spatial-world.md#seeing-and-hearing-in-3d
const blocksSight = (interval: readonly [number, number] | null): boolean =>
  !!interval && interval[0] < interval[1];
interface SightRegion {
  from: Bounds3;
  to: Bounds3;
  bounds: Bounds3;
  shapes: readonly PreparedShape[];
  certain?: boolean;
}
const sightRegions = new WeakMap<object, Map<string, SightRegion>>();
const sightAnswers = new WeakMap<object, Map<string, boolean>>();
const sightKey = (from: WorldPoint, to: WorldPoint) =>
  JSON.stringify([from.x, from.y, from.z, to.x, to.y, to.z]);
function rememberSight(
  geometry: PreparedGeometry,
  from: WorldPoint,
  to: WorldPoint,
  seen: boolean,
) {
  let answers = sightAnswers.get(geometry);
  if (!answers) sightAnswers.set(geometry, (answers = new Map()));
  if (answers.size >= 8192) answers.delete(answers.keys().next().value!);
  answers.set(sightKey(from, to), seen);
}
export interface SightRay {
  from: WorldPoint;
  to: WorldPoint;
}
export interface WalkingSegment {
  from: SurfacePoint;
  to: SurfacePoint;
  body: BodyProfile;
}
export type GeometryBatch = { readonly map: SpatialMap } & (
  | { readonly kind: 'sight'; readonly queries: readonly SightRay[] }
  | { readonly kind: 'walking'; readonly queries: readonly WalkingSegment[] }
);
const pendingSight = new WeakMap<GeometryBatch, PreparedGeometry>();
/** Cheap region proofs finish locally. Only unresolved rays need host computation.
 * The immutable request owns exact geometry/points; no character knowledge crosses it. */
export function prepareSightBatch(
  map: SpatialMap,
  rays: readonly SightRay[],
): GeometryBatch | undefined {
  const geometry = preparedShapes(map),
    pending: SightRay[] = [],
    pendingKeys = new Set<string>();
  for (const ray of rays) {
    const key = sightKey(ray.from, ray.to);
    if (pendingKeys.has(key) || sightAnswers.get(geometry)?.has(key)) continue;
    const region = sightRegion(geometry, ray.from, ray.to);
    if (region && (region.certain !== undefined || region.shapes.length < 4)) {
      rememberSight(geometry, ray.from, ray.to, clearRegion(region, ray.from, ray.to));
      continue;
    }
    pendingKeys.add(key);
    pending.push(
      Object.freeze({ from: Object.freeze({ ...ray.from }), to: Object.freeze({ ...ray.to }) }),
    );
  }
  if (!pending.length) return;
  const batch = Object.freeze({ map, kind: 'sight' as const, queries: Object.freeze(pending) });
  pendingSight.set(batch, geometry);
  return batch;
}
export function evaluateGeometryBatch(batch: GeometryBatch): boolean[] {
  return batch.kind === 'sight'
    ? batch.queries.map((ray) => clearSegment(batch.map, ray.from, ray.to))
    : batch.queries.map((segment) =>
        canWalkSegment(batch.map, segment.from, segment.to, segment.body),
      );
}
/** Install results of the trusted geometry executor only for its unchanged request.
 * Public commands/model output never accept these host-owned preparations. */
export function completeGeometryBatch(batch: GeometryBatch, results?: readonly boolean[]): void {
  if (batch.kind === 'walking') {
    const geometry = pendingWalking.get(batch);
    if (!geometry) return;
    results ??= evaluateGeometryBatch(batch);
    if (
      geometry !== preparedShapes(batch.map) ||
      results.length !== batch.queries.length ||
      results.some((v) => typeof v !== 'boolean')
    )
      throw new Error('Walking preparation changed or is incomplete.');
    batch.queries.forEach((query, index) => rememberWalking(geometry, query, results![index]!));
    pendingWalking.delete(batch);
    return;
  }
  const geometry = pendingSight.get(batch);
  if (!geometry && results === undefined) return;
  results ??= evaluateGeometryBatch(batch);
  if (
    !geometry ||
    geometry !== preparedShapes(batch.map) ||
    results.length !== batch.queries.length ||
    results.some((value) => typeof value !== 'boolean')
  )
    throw new Error('Sight preparation changed or is incomplete.');
  batch.queries.forEach((ray, index) => rememberSight(geometry, ray.from, ray.to, results[index]!));
  pendingSight.delete(batch);
}
const regionBounds = (p: WorldPoint): Bounds3 => {
  const min = {
    x: Math.floor(p.x / 2) * 2,
    y: Math.floor(p.y * 8) / 8,
    z: Math.floor(p.z / 2) * 2,
  };
  return { min, max: { x: min.x + 2, y: min.y + 0.125, z: min.z + 2 } };
};
const boxCorners = (b: Bounds3): WorldPoint[] =>
  [b.min.x, b.max.x].flatMap((x) =>
    [b.min.y, b.max.y].flatMap((y) => [b.min.z, b.max.z].map((z) => ({ x, y, z }))),
  );
/** Every segment between the two cells crosses one interior plane of this solid.
 * Plane intersections are within the convex hull of the corner-pair intersections;
 * proving those inside the solid proves the entire family, not just sampled rays. */
function regionOccluded(region: SightRegion, shape: PreparedShape): boolean {
  for (const axis of ['x', 'y', 'z'] as const) {
    const plane = (shape.bounds.min[axis] + shape.bounds.max[axis]) / 2;
    if (
      !(
        (region.from.max[axis] < plane - EPS && region.to.min[axis] > plane + EPS) ||
        (region.to.max[axis] < plane - EPS && region.from.min[axis] > plane + EPS)
      )
    )
      continue;
    const first = boxCorners(region.from),
      second = boxCorners(region.to);
    let covered = true;
    outer: for (const a of first)
      for (const b of second) {
        const t = (plane - a[axis]) / (b[axis] - a[axis]);
        const p = interpolate(a, b, t);
        if (
          shape.planes.some(([x, y, z, limit]) => x * p.x + y * p.y + z * p.z > limit - 4 * EPS)
        ) {
          covered = false;
          break outer;
        }
      }
    if (covered) return true;
  }
  return false;
}
function sightRegion(
  geometry: PreparedGeometry,
  from: WorldPoint,
  to: WorldPoint,
): SightRegion | undefined {
  const a = regionBounds(from),
    b = regionBounds(to);
  const first = [a.min.x, a.min.y, a.min.z],
    second = [b.min.x, b.min.y, b.min.z];
  const key = JSON.stringify(
    JSON.stringify(first) < JSON.stringify(second) ? [first, second] : [second, first],
  );
  let regions = sightRegions.get(geometry);
  if (!regions) sightRegions.set(geometry, (regions = new Map()));
  const old = regions.get(key);
  if (old) return old;
  const bounds = {
    min: {
      x: Math.min(a.min.x, b.min.x),
      y: Math.min(a.min.y, b.min.y),
      z: Math.min(a.min.z, b.min.z),
    },
    max: {
      x: Math.max(a.max.x, b.max.x),
      y: Math.max(a.max.y, b.max.y),
      z: Math.max(a.max.z, b.max.z),
    },
  };
  const shapes: PreparedShape[] = [];
  const overflow = geometry.shapeIndex.visit(
    (v) =>
      v.min.x <= bounds.max.x &&
      v.max.x >= bounds.min.x &&
      v.min.y <= bounds.max.y &&
      v.max.y >= bounds.min.y &&
      v.min.z <= bounds.max.z &&
      v.max.z >= bounds.min.z,
    (shape) => {
      if (shape.sight) shapes.push(shape);
      return shapes.length > 64;
    },
  );
  // A diagonal region can enclose much more scenery than its actual ray. Stop
  // collecting before regional reuse costs a whole-neighborhood scan; the exact
  // indexed ray below remains authoritative, including for worker preparation.
  if (overflow) return;
  const region: SightRegion = { from: a, to: b, bounds, shapes };
  if (!shapes.length) region.certain = true;
  else if (shapes.some((shape) => regionOccluded(region, shape))) region.certain = false;
  if (region.certain !== undefined) region.shapes = [];
  if (regions.size >= 4096) regions.delete(regions.keys().next().value!);
  regions.set(key, region);
  return region;
}
export const clearSegment = (map: SpatialMap, from: WorldPoint, to: WorldPoint): boolean => {
  const geometry = preparedShapes(map);
  const prepared = sightAnswers.get(geometry)?.get(sightKey(from, to));
  if (prepared !== undefined) return prepared;
  const region = sightRegion(geometry, from, to);
  return region
    ? clearRegion(region, from, to)
    : !visitHits(map, from, to, 'sight', EMPTY_IDS, undefined, (_shape, interval) =>
        blocksSight(interval),
      );
};
function clearRegion(region: SightRegion, from: WorldPoint, to: WorldPoint): boolean {
  return (
    region.certain ??
    !region.shapes.some((shape) => blocksSight(clipSegment(from, to, shape.planes)))
  );
}
/** One bounded caller-owned sight probe for unchanged geometry. A clear convex box
 * certifies every contained segment; an old blocker can prove a negative directly.
 * Neither result supplies character knowledge. Replace the probe when the map changes. */
export interface SightProbe {
  (from: WorldPoint, to: WorldPoint): boolean;
  known(from: WorldPoint, to: WorldPoint): boolean | undefined;
}
export function createSightProbe(map: SpatialMap): SightProbe {
  let geometry = preparedShapes(map),
    blocker: PreparedShape | undefined,
    clear: Bounds3 | undefined;
  const inside = (point: WorldPoint, bounds: Bounds3) =>
    point.x >= bounds.min.x &&
    point.x <= bounds.max.x &&
    point.y >= bounds.min.y &&
    point.y <= bounds.max.y &&
    point.z >= bounds.min.z &&
    point.z <= bounds.max.z;
  const synchronize = () => {
    const latest = preparedShapes(map);
    if (latest !== geometry) {
      geometry = latest;
      blocker = undefined;
      clear = undefined;
    }
  };
  const known = (from: WorldPoint, to: WorldPoint): boolean | undefined => {
    synchronize();
    if (clear && inside(from, clear) && inside(to, clear)) return true;
    if (blocker && blocksSight(clipSegment(from, to, blocker.planes))) return false;
    return sightAnswers.get(geometry)?.get(sightKey(from, to));
  };
  const rememberOpen = (from: WorldPoint, to: WorldPoint) => {
    const bounds = {
      min: {
        x: Math.min(from.x, to.x) - 2,
        y: Math.min(from.y, to.y),
        z: Math.min(from.z, to.z) - 2,
      },
      max: {
        x: Math.max(from.x, to.x) + 2,
        y: Math.max(from.y, to.y),
        z: Math.max(from.z, to.z) + 2,
      },
    };
    if (
      !geometry.shapeIndex.visit(
        (b) =>
          b.min.x <= bounds.max.x &&
          b.max.x >= bounds.min.x &&
          b.min.y <= bounds.max.y &&
          b.max.y >= bounds.min.y &&
          b.min.z <= bounds.max.z &&
          b.max.z >= bounds.min.z,
        (shape) => shape.sight,
      )
    )
      clear = bounds;
  };
  const probe: SightProbe = (from, to) => {
    synchronize();
    if (clear && inside(from, clear) && inside(to, clear)) return true;
    if (blocker && blocksSight(clipSegment(from, to, blocker.planes))) return false;
    const prepared = sightAnswers.get(geometry)?.get(sightKey(from, to));
    if (prepared === true) {
      rememberOpen(from, to);
      return true;
    }
    const region = sightRegion(geometry, from, to);
    if (!region) {
      return !visitHits(map, from, to, 'sight', EMPTY_IDS, undefined, (shape, interval) => {
        if (!blocksSight(interval)) return false;
        blocker = shape;
        return true;
      });
    }
    if (region.certain !== undefined) {
      if (region.certain) clear = region.bounds;
      return region.certain;
    }
    // Establish the local blocker even after a worker's negative answer. Otherwise
    // each tiny movement would dispatch the same cheaply blocked pair again.
    for (const shape of region.shapes)
      if (blocksSight(clipSegment(from, to, shape.planes))) {
        blocker = shape;
        return false;
      }
    rememberOpen(from, to);
    return true;
  };
  probe.known = known;
  return probe;
}
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
  if (a.boxes) return a.boxes.some((bounds) => solidOverlap({ bounds }, b));
  if (b.boxes) return b.boxes.some((bounds) => solidOverlap(a, { bounds }));
  return solidsOverlap(solidGeometry(a), solidGeometry(b));
}
export function physicalIntersections(map: SpatialMap, solid: CollisionSolid) {
  const queries = solid.boxes?.map((bounds) => solidGeometry({ bounds })),
    query = queries ? undefined : solidGeometry(solid),
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
      if (
        shape.movement &&
        (queries
          ? queries.some((piece) => solidsOverlap(piece, shape))
          : solidsOverlap(query!, shape))
      )
        hits.push({ id: shape.id, kind: shape.kind, bounds: shape.bounds, panel: shape.panel });
      return false;
    },
  );
  return hits;
}
/** A shrunken sight polytope returned by sightSweep; opaque outside this module. */
export interface SightObstacle {
  readonly planes: readonly Plane[];
}
function separated(planes: readonly Plane[], points: readonly WorldPoint[]): boolean {
  for (let i = 0; i < planes.length; i++) {
    const plane = planes[i]!,
      a = plane[0],
      b = plane[1],
      c = plane[2],
      bound = plane[3];
    let outside = true;
    for (let j = 0; j < points.length; j++) {
      const p = points[j]!;
      if (!(a * p.x + b * p.y + c * p.z > bound - EPS)) {
        outside = false;
        break;
      }
    }
    if (outside) return true;
  }
  return false;
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
/** The ray-family edges and face axes are independent of the obstacle being tested. */
function prepareSightHull(points: readonly WorldPoint[]) {
  const edges: WorldPoint[] = [];
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++) edges.push(minus(points[j]!, points[i]!));
  const axes: WorldPoint[] = [];
  for (let i = 0; i < edges.length; i++)
    for (let j = i + 1; j < edges.length; j++) axes.push(cross(edges[i]!, edges[j]!));
  return { edges, axes };
}
/** Keep projection order and arithmetic exact without allocating a vector or iterator
 * for every ray-edge/obstacle-edge axis. All inputs belong to this one query. */
function hullAxisSeparated(
  shape: PreparedShape,
  points: readonly WorldPoint[],
  x: number,
  y: number,
  z: number,
): boolean {
  if (Math.abs(x) + Math.abs(y) + Math.abs(z) < 1e-12) return false;
  let low = Infinity,
    high = -Infinity,
    shapeLow = Infinity,
    shapeHigh = -Infinity;
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!,
      value = x * p.x + y * p.y + z * p.z;
    low = Math.min(low, value);
    high = Math.max(high, value);
  }
  for (let i = 0; i < shape.vertices.length; i++) {
    const p = shape.vertices[i]!,
      value = x * p.x + y * p.y + z * p.z;
    shapeLow = Math.min(shapeLow, value);
    shapeHigh = Math.max(shapeHigh, value);
  }
  return high < shapeLow || shapeHigh < low;
}
/** Separating-axis rejection of a ray family's hull (up to four points) from a shape: its
 * face planes, the hull's face normals and edge-by-edge cross products. The shape's unshrunk
 * corners make every rejection conservative for the shrunken polytope clipSegment tests. */
function hullSeparated(
  shape: PreparedShape,
  points: readonly WorldPoint[],
  hull: () => ReturnType<typeof prepareSightHull>,
): boolean {
  if (separated(shape.planes, points)) return true;
  const prepared = hull();
  for (let i = 0; i < prepared.axes.length; i++) {
    const axis = prepared.axes[i]!;
    if (hullAxisSeparated(shape, points, axis.x, axis.y, axis.z)) return true;
  }
  for (let i = 0; i < prepared.edges.length; i++) {
    const edge = prepared.edges[i]!;
    for (let j = 0; j < shape.edges.length; j++) {
      const direction = shape.edges[j]!;
      if (
        hullAxisSeparated(
          shape,
          points,
          edge.y * direction.z - edge.z * direction.y,
          edge.z * direction.x - edge.x * direction.z,
          edge.x * direction.y - edge.y * direction.x,
        )
      )
        return true;
    }
  }
  return false;
}
/** Shapes that may block a segment inside this ray family's hull. Face-plane and
 * separating-axis rejection conservatively exclude shapes that no such segment can enter. */
function sightObstacles(map: SpatialMap, points: readonly WorldPoint[]): readonly SightObstacle[] {
  const min = { x: Infinity, y: Infinity, z: Infinity },
    max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const p of points) {
    if (!finitePoint(p)) throw new Error('Invalid spatial ray.');
    min.x = Math.min(min.x, p.x - EPS);
    max.x = Math.max(max.x, p.x + EPS);
    min.y = Math.min(min.y, p.y - EPS);
    max.y = Math.max(max.y, p.y + EPS);
    min.z = Math.min(min.z, p.z - EPS);
    max.z = Math.max(max.z, p.z + EPS);
  }
  const shapes: PreparedShape[] = [];
  // One moving ray has one hull, regardless of how many nearby shapes are tested.
  // Delay preparation until a shape survives the cheaper face-plane rejection.
  let prepared: ReturnType<typeof prepareSightHull> | undefined;
  const hull = () => (prepared ??= prepareSightHull(points));
  preparedShapes(map).shapeIndex.visit(
    (b) =>
      b.min.x <= max.x &&
      b.max.x >= min.x &&
      b.min.y <= max.y &&
      b.max.y >= min.y &&
      b.min.z <= max.z &&
      b.max.z >= min.z,
    (shape) => {
      if (shape.sight && !hullSeparated(shape, points, hull)) shapes.push(shape);
      return false;
    },
  );
  return shapes;
}
/** Certify the WHOLE convex target, not only its corner rays. Any possible opaque
 * intersection inside the receptor/target hull conservatively rejects it. Shapes
 * behind the target are outside this hull. Producers may split a rejected region;
 * rejection itself supplies no boundary or negative spatial fact. */
export function clearConvexView(
  map: SpatialMap,
  from: WorldPoint,
  target: readonly WorldPoint[],
): boolean {
  if (
    !finitePoint(from) ||
    target.length < 1 ||
    target.length > 4 ||
    target.some((point) => !finitePoint(point))
  )
    throw new Error('Invalid convex sight target.');
  return sightObstacles(map, [from, ...target]).length === 0;
}
/** Bounded version for optional contextual acquisition. Exhaustion never grants
 * a visible interior; the caller may keep the unproved fringe unknown. */
export function queryConvexView(
  map: SpatialMap,
  from: WorldPoint,
  target: readonly WorldPoint[],
  allowance: number,
) {
  if (
    !finitePoint(from) ||
    target.length < 1 ||
    target.length > 4 ||
    target.some((point) => !finitePoint(point))
  )
    throw new Error('Invalid convex sight target.');
  const points = [from, ...target],
    bounds = featureBounds(points);
  const result = preparedShapes(map).shapeIndex.query(
    (b) =>
      b.min.x <= bounds.max.x + EPS &&
      b.max.x >= bounds.min.x - EPS &&
      b.min.y <= bounds.max.y + EPS &&
      b.max.y >= bounds.min.y - EPS &&
      b.min.z <= bounds.max.z + EPS &&
      b.max.z >= bounds.min.z - EPS,
    allowance,
  );
  let hull: ReturnType<typeof prepareSightHull> | undefined;
  const blocked = result.values.some(
    (shape) =>
      shape.sight && !hullSeparated(shape, points, () => (hull ??= prepareSightHull(points))),
  );
  return {
    visited: result.visited,
    complete: result.status === 'complete',
    clear: !blocked && result.status === 'complete',
  };
}
/** clearSegment for a segment inside the hull its obstacles were gathered from. */
export function clearOf(
  obstacles: readonly SightObstacle[],
  from: WorldPoint,
  to: WorldPoint,
): boolean {
  return !obstacles.some((obstacle) => blocksSight(clipSegment(from, to, obstacle.planes)));
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
 * inside the segment (only those can flip enter < exit). Between consecutive fractions the
 * answer is constant; callers classify each piece with clearOf, never from these roots.
 * docs/maintainers/simulation-boundaries.md#perception-sound-and-cognition */
function sightChangeFractions(
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
  for (const obstacle of obstacles) {
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
/** Exact changes and candidate shapes for one moving ray. Both calculations use the same
 * four-point hull, so accepted candidates need no second separating-axis test. The result
 * lives only for this query; classification still uses clearOf's exact segment predicate.
 */
export function sightSweep(
  map: SpatialMap,
  from0: WorldPoint,
  from1: WorldPoint,
  to0: WorldPoint,
  to1: WorldPoint,
) {
  const obstacles = sightObstacles(map, [from0, from1, to0, to1]);
  return {
    obstacles,
    fractions: obstacles.length ? sightChangeFractions(obstacles, from0, from1, to0, to1) : [],
  };
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

export function canStand(map: SpatialMap, point: SurfacePoint, body: BodyProfile): boolean {
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
const pendingWalking = new WeakMap<GeometryBatch, PreparedGeometry>();
const walkingAnswers = new WeakMap<PreparedGeometry, Map<string, boolean>>();
const walkingKey = (query: WalkingSegment) =>
  JSON.stringify([
    query.from.x,
    query.from.y,
    query.from.z,
    query.from.surfaceId,
    query.to.x,
    query.to.y,
    query.to.z,
    query.to.surfaceId,
    query.body.radius,
    query.body.height,
    query.body.maxSlope,
  ]);
function rememberWalking(geometry: PreparedGeometry, query: WalkingSegment, answer: boolean) {
  let answers = walkingAnswers.get(geometry);
  if (!answers) walkingAnswers.set(geometry, (answers = new Map()));
  if (answers.size >= 8192) answers.delete(answers.keys().next().value!);
  answers.set(walkingKey(query), answer);
}
/** Worker inputs contain static physical facts only. Exact geometry/body/endpoint
 * keys are checked again by canWalkSegment when the movement owner consumes them. */
export function prepareWalkingBatch(
  map: SpatialMap,
  segments: readonly WalkingSegment[],
): GeometryBatch | undefined {
  const geometry = preparedShapes(map),
    pending = new Map<string, WalkingSegment>();
  for (const query of segments) {
    const key = walkingKey(query);
    if (walkingAnswers.get(geometry)?.has(key)) continue;
    const corridor = knownWalkingCorridor(map, geometry, query.from, query.to, query.body);
    if (corridor !== undefined) {
      rememberWalking(geometry, query, corridor);
      continue;
    }
    pending.set(
      key,
      Object.freeze({
        from: Object.freeze({ ...query.from }),
        to: Object.freeze({ ...query.to }),
        body: Object.freeze({ ...query.body }),
      }),
    );
  }
  if (!pending.size) return;
  const batch = Object.freeze({
    map,
    kind: 'walking' as const,
    queries: Object.freeze([...pending.values()]),
  });
  pendingWalking.set(batch, geometry);
  return batch;
}
type WalkCorridor = { from: SurfacePoint; to: SurfacePoint };
const walkCorridors = new WeakMap<object, Map<string, WalkCorridor[]>>();
function corridorContains(corridor: WalkCorridor, point: SurfacePoint): boolean {
  const a = corridor.from,
    b = corridor.to;
  if (point.surfaceId !== a.surfaceId) return false;
  const dx = b.x - a.x,
    dy = b.y - a.y,
    dz = b.z - a.z;
  const axis = Math.abs(dx) >= Math.abs(dz) ? 'x' : 'z';
  const span = b[axis] - a[axis];
  if (span === 0) return point.x === a.x && point.y === a.y && point.z === a.z;
  const t = (point[axis] - a[axis]) / span;
  // Exact collinearity only: a positional tolerance is not a clearance proof.
  return (
    t >= 0 &&
    t <= 1 &&
    point.x === a.x + dx * t &&
    point.y === a.y + dy * t &&
    point.z === a.z + dz * t
  );
}
function knownWalkingCorridor(
  map: SpatialMap,
  geometry: PreparedGeometry,
  from: SurfacePoint,
  to: SurfacePoint,
  body: BodyProfile,
): boolean | undefined {
  if (from.surfaceId !== to.surfaceId) return;
  const key = JSON.stringify([from.surfaceId, body.radius, body.height, body.maxSlope]);
  if (
    walkCorridors
      .get(geometry)
      ?.get(key)
      ?.some((c) => corridorContains(c, from) && corridorContains(c, to))
  )
    return !surfaceById(map, from.surfaceId)?.terrain || terrainSegmentWalkable(map, from, to);
}
export function canWalkSegment(
  map: SpatialMap,
  from: SurfacePoint,
  to: SurfacePoint,
  body: BodyProfile,
): boolean {
  const geometry = preparedShapes(map);
  const prepared = walkingAnswers.get(geometry)?.get(walkingKey({ from, to, body }));
  if (prepared !== undefined) return prepared;
  let groups = walkCorridors.get(geometry);
  if (!groups) walkCorridors.set(geometry, (groups = new Map()));
  const key = JSON.stringify([from.surfaceId, body.radius, body.height, body.maxSlope]);
  const corridors = groups.get(key);
  const known = knownWalkingCorridor(map, geometry, from, to, body);
  if (known !== undefined) return known;
  if (!walkSegmentClear(map, from, to, body)) return false;
  if (from.surfaceId === to.surfaceId) {
    if (!corridors) {
      if (groups.size >= 256) groups.delete(groups.keys().next().value!);
      groups.set(key, []);
    }
    const current = groups.get(key)!;
    if (current.length >= 32) current.shift();
    current.push({ from: { ...from }, to: { ...to } });
  }
  return true;
}
function walkSegmentClear(
  map: SpatialMap,
  from: SurfacePoint,
  to: SurfacePoint,
  body: BodyProfile,
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
  return !a.terrain || terrainSegmentWalkable(map, from, to);
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
    return tile !== undefined && map.terrain[tile]?.walkable === true;
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
    if (surfaceContains(surface, point) && (!surface.terrain || terrainWalkable(map, point)))
      hits.push({ point, fraction: t });
  }
  return hits.sort(
    (a, b) => a.fraction - b.fraction || a.point.surfaceId.localeCompare(b.point.surfaceId),
  );
}

export function intersectBox(from: WorldPoint, to: WorldPoint, bounds: Bounds3): number | null {
  return clipSegment(from, to, boxPlanes(bounds))?.[0] ?? null;
}
