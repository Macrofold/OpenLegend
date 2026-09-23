import {
  BODY_PROFILES,
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
const EPS = SPATIAL_LIMITS.epsilon;
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
export function surfaceById(map: SpatialMap, id: string): WalkableSurface | undefined {
  return supportSurfaces(map).find((surface) => surface.id === id);
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
  const surfaces = surfaceId
    ? [surfaceById(map, surfaceId)].filter((s): s is WalkableSurface => !!s)
    : supportSurfaces(map);
  for (const surface of surfaces) {
    if (!surfaceContains(surface, point)) continue;
    const y = surfaceHeight(surface, point.x, point.z);
    if (Math.abs(y - point.y) > SPATIAL_LIMITS.supportTolerance) continue;
    if (surface.material === 'ground' && !terrainWalkable(map, point)) continue;
    return { x: point.x, y, z: point.z, surfaceId: surface.id };
  }
  return null;
}
export function supportBelow(map: SpatialMap, point: WorldPoint): SurfacePoint | null {
  let best: SurfacePoint | null = null;
  for (const surface of supportSurfaces(map)) {
    if (!surfaceContains(surface, point)) continue;
    const y = surfaceHeight(surface, point.x, point.z);
    if (y <= point.y + EPS && (!best || y > best.y))
      best = { x: point.x, y, z: point.z, surfaceId: surface.id };
  }
  return best;
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
  planes: Plane[],
  body?: BodyProfile,
): [number, number] | null {
  let enter = 0,
    exit = 1;
  for (const [a, b, c, bound] of planes) {
    // Minkowski expansion for an upright conservative box with a foot-level anchor.
    const expansion = body
      ? body.radius * (Math.abs(a) + Math.abs(c)) + Math.max(0, -b * body.height)
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
  id: string;
  kind: 'surface' | 'blocker';
  planes: Plane[];
  movement: boolean;
  sight: boolean;
  transmission: number;
}
const shapeCache = new WeakMap<
  SpatialMap,
  {
    revision: number;
    shapes: PreparedShape[];
    blockers: SpatialBlocker[];
    supports: WalkableSurface[];
  }
>();
function preparedShapes(map: SpatialMap) {
  const cached = shapeCache.get(map);
  if (cached?.revision === map.spatial.revision) return cached;
  const blockers: SpatialBlocker[] = [...map.spatial.blockers];
  // Rock geometry derives from the canonical terrain cells, not a second writable rock store.
  for (let z = 0; z < map.height; z++)
    for (let x = 0; x < map.width; x++) {
      if (map.tiles[z]?.[x] === 'rock')
        blockers.push({
          id: `terrain-rock:${x}:${z}`,
          bounds: { min: { x: x - 0.5, y: 0, z: z - 0.5 }, max: { x: x + 0.5, y: 2, z: z + 0.5 } },
          movement: true,
          sight: true,
          acousticTransmission: 0.15,
          material: 'stone',
        });
    }
  if (
    blockers.length > SPATIAL_LIMITS.maxBlockers ||
    map.spatial.surfaces.length > SPATIAL_LIMITS.maxSurfaces
  )
    throw new Error('Spatial query geometry exceeds its complete-query budget.');
  const shapes: PreparedShape[] = map.spatial.surfaces.map((surface) => ({
    id: surface.id,
    kind: 'surface',
    planes: surfacePlanes(surface),
    movement: true,
    sight: true,
    transmission: surface.acousticTransmission,
  }));
  shapes.push(
    ...blockers.map(
      (b): PreparedShape => ({
        id: b.id,
        kind: 'blocker',
        planes: boxPlanes(b.bounds),
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
  const result = { revision: map.spatial.revision, shapes, blockers, supports };
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
export function rayHits(
  map: SpatialMap,
  from: WorldPoint,
  to: WorldPoint,
  channel: 'sight' | 'sound' | 'movement' = 'sight',
  ignore: ReadonlySet<string> = new Set(),
  body?: BodyProfile,
): RayHit[] {
  if (!finitePoint(from) || !finitePoint(to)) throw new Error('Invalid spatial ray.');
  const hits: RayHit[] = [];
  for (const shape of preparedShapes(map).shapes) {
    if (
      ignore.has(shape.id) ||
      (channel === 'sight' && !shape.sight) ||
      (channel === 'movement' && !shape.movement)
    )
      continue;
    const interval = clipSegment(from, to, shape.planes, body);
    if (interval)
      hits.push({
        id: shape.id,
        kind: shape.kind,
        fraction: interval[0],
        exitFraction: interval[1],
        point: interpolate(from, to, interval[0]),
        transmission: shape.transmission,
      });
  }
  return hits.sort((a, b) => a.fraction - b.fraction || a.id.localeCompare(b.id));
}
export const clearSegment = (map: SpatialMap, from: WorldPoint, to: WorldPoint): boolean =>
  rayHits(map, from, to).length === 0;
export function soundTransmission(map: SpatialMap, from: WorldPoint, to: WorldPoint): number {
  // One contribution per physical slab/blocker, not one attenuation per triangle or entry/exit face.
  return rayHits(map, from, to, 'sound').reduce((value, hit) => value * hit.transmission, 1);
}
function onlySupportContact(
  map: SpatialMap,
  hit: RayHit,
  from: SurfacePoint,
  to: SurfacePoint,
  body: BodyProfile,
): boolean {
  if (hit.kind !== 'surface') return false;
  const s = surfaceById(map, hit.id)!;
  const support = surfaceById(map, from.surfaceId)!;
  const toeAllowance = body.radius * Math.hypot(support.slopeX, support.slopeZ);
  const times = [hit.fraction, hit.exitFraction];
  // A body's conservative box may brush a sloping support at a seam. Allow the
  // contact only while the foot stays above its top; never ignore the entire ramp.
  for (const [a, b, min, max] of [
    [from.x, to.x, s.minX, s.maxX],
    [from.z, to.z, s.minZ, s.maxZ],
  ]) {
    if (Math.abs(b! - a!) < EPS) continue;
    for (const boundary of [min!, max!]) {
      const t = (boundary - a!) / (b! - a!);
      if (t > hit.fraction && t < hit.exitFraction) times.push(t);
    }
  }
  return times.every((t) => {
    const p = interpolate(from, to, t);
    return (
      p.y + toeAllowance + SPATIAL_LIMITS.supportTolerance >=
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
  const support = resolveSupport(map, point, point.surfaceId);
  const surface = surfaceById(map, point.surfaceId);
  if (!support || !surface || Math.hypot(surface.slopeX, surface.slopeZ) > body.maxSlope)
    return false;
  return rayHits(map, point, point, 'movement', new Set([point.surfaceId]), body).every((hit) =>
    onlySupportContact(map, hit, point, point, body),
  );
}
export function canWalkSegment(
  map: SpatialMap,
  from: SurfacePoint,
  to: SurfacePoint,
  body: BodyProfile = BODY_PROFILES.person,
): boolean {
  if (!canStand(map, from, body) || !canStand(map, to, body)) return false;
  const a = surfaceById(map, from.surfaceId)!,
    b = surfaceById(map, to.surfaceId)!;
  if (
    from.surfaceId !== to.surfaceId &&
    (horizontalDistance(from, to) > EPS ||
      Math.abs(from.y - to.y) > SPATIAL_LIMITS.supportTolerance)
  )
    return false;
  const ignored = new Set([from.surfaceId, to.surfaceId]);
  // Supported patches are convex planes: the chord stays on its admitted surface. Different
  // supports connect only at a coincident seam, never through a wall or between floors.
  if (from.surfaceId === to.surfaceId && (!surfaceContains(a, to) || !surfaceContains(b, from)))
    return false;
  if (
    rayHits(map, from, to, 'movement', ignored, body).some(
      (hit) => !onlySupportContact(map, hit, from, to, body),
    )
  )
    return false;
  if (a.material === 'ground') {
    const samples = Math.max(1, Math.ceil(horizontalDistance(from, to) * 4));
    for (let i = 0; i <= samples; i++)
      if (!terrainWalkable(map, interpolate(from, to, i / samples))) return false;
  }
  return true;
}
export function canFlySegment(
  map: SpatialMap,
  from: WorldPoint,
  to: WorldPoint,
  body: BodyProfile,
  supportIds: string[] = [],
): boolean {
  return rayHits(map, from, to, 'movement', new Set(supportIds), body).length === 0;
}
/** Camera picking hits physical top faces. Focus filters presentation only, not collision. */
export function pickSurfaces(
  map: SpatialMap,
  from: WorldPoint,
  to: WorldPoint,
  levelId: string | null,
): Array<{ point: SurfacePoint; fraction: number }> {
  const hits: Array<{ point: SurfacePoint; fraction: number }> = [];
  for (const surface of supportSurfaces(map)) {
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
