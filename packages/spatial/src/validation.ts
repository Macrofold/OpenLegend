import { finitePoint, surfaceHeight } from './geometry.js';
import { SPATIAL_LIMITS, type SpatialMap } from './types.js';
const safeId = (v: unknown): v is string =>
  typeof v === 'string' &&
  /^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,119}$/.test(v) &&
  !['constructor', 'prototype', '__proto__'].includes(v);
/** Validate once at construction/load/mutation, never silently reinterpret invalid geometry as air. */
export function validateSpatialMap(map: SpatialMap): void {
  if (
    !map ||
    !Number.isInteger(map.width) ||
    !Number.isInteger(map.height) ||
    map.width < 2 ||
    map.height < 2 ||
    map.width > 128 ||
    map.height > 128 ||
    !Array.isArray(map.tiles) ||
    map.tiles.length !== map.height ||
    map.tiles.some(
      (row) =>
        !Array.isArray(row) ||
        row.length !== map.width ||
        row.some((tile) => !['grass', 'sand', 'water', 'rock'].includes(tile)),
    )
  )
    throw new Error('Invalid spatial terrain.');
  if (
    map.tiles.reduce((n, row) => n + row.filter((tile) => tile === 'rock').length, 0) +
      (map.spatial?.blockers?.length ?? 0) >
    SPATIAL_LIMITS.maxBlockers
  )
    throw new Error('Too many physical terrain blockers.');
  const layout = map.spatial;
  if (
    !layout ||
    layout.version !== 1 ||
    layout.disclosure !== 'public' ||
    !Number.isSafeInteger(layout.revision) ||
    layout.revision < 0 ||
    !Array.isArray(layout.surfaces) ||
    layout.surfaces.length < 1 ||
    layout.surfaces.length > SPATIAL_LIMITS.maxSurfaces ||
    !Array.isArray(layout.blockers) ||
    layout.blockers.length > SPATIAL_LIMITS.maxBlockers ||
    !Array.isArray(layout.levels) ||
    layout.levels.length < 1 ||
    layout.levels.length > 16
  )
    throw new Error('Unsupported spatial layout.');
  const ids = new Set<string>();
  const levels = new Set<string>();
  for (const level of layout.levels) {
    if (
      !safeId(level.id) ||
      levels.has(level.id) ||
      typeof level.name !== 'string' ||
      level.name.length > 80 ||
      !Number.isFinite(level.focusY) ||
      Math.abs(level.focusY) > SPATIAL_LIMITS.maxExtent
    )
      throw new Error('Invalid spatial level.');
    levels.add(level.id);
  }
  let nodes = 0;
  for (const s of layout.surfaces) {
    if (
      !safeId(s.id) ||
      s.id.startsWith('terrain-rock:') ||
      ids.has(s.id) ||
      !levels.has(s.levelId) ||
      typeof s.name !== 'string' ||
      s.name.length > 80 ||
      !['ground', 'timber', 'stone'].includes(s.material) ||
      ![
        s.minX,
        s.maxX,
        s.minZ,
        s.maxZ,
        s.y,
        s.slopeX,
        s.slopeZ,
        s.thickness,
        s.acousticTransmission,
      ].every(Number.isFinite) ||
      s.minX < 0 ||
      s.minZ < 0 ||
      s.maxX > map.width - 1 ||
      s.maxZ > map.height - 1 ||
      s.minX >= s.maxX ||
      s.minZ >= s.maxZ ||
      s.thickness <= 0 ||
      s.thickness > 32 ||
      Math.hypot(s.slopeX, s.slopeZ) > 1 ||
      s.acousticTransmission < 0 ||
      s.acousticTransmission > 1
    )
      throw new Error('Invalid spatial surface.');
    const ys = [
      surfaceHeight(s, s.minX, s.minZ),
      surfaceHeight(s, s.maxX, s.minZ),
      surfaceHeight(s, s.minX, s.maxZ),
      surfaceHeight(s, s.maxX, s.maxZ),
    ];
    if (
      ys.some((y) => Math.abs(y) > SPATIAL_LIMITS.maxExtent) ||
      (s.solidBase !== undefined &&
        (!Number.isFinite(s.solidBase) ||
          s.solidBase > Math.min(...ys) ||
          s.solidBase < -SPATIAL_LIMITS.maxExtent))
    )
      throw new Error('Invalid surface height or base.');
    nodes +=
      (Math.floor(s.maxX) - Math.ceil(s.minX) + 1) * (Math.floor(s.maxZ) - Math.ceil(s.minZ) + 1);
    ids.add(s.id);
  }
  if (nodes > SPATIAL_LIMITS.maxGraphNodes)
    throw new Error('Spatial graph exceeds its native node budget.');
  for (const b of layout.blockers) {
    if (
      !safeId(b.id) ||
      b.id.startsWith('terrain-rock:') ||
      ids.has(b.id) ||
      !b.bounds ||
      !finitePoint(b.bounds.min) ||
      !finitePoint(b.bounds.max) ||
      b.bounds.min.x >= b.bounds.max.x ||
      b.bounds.min.y >= b.bounds.max.y ||
      b.bounds.min.z >= b.bounds.max.z ||
      typeof b.movement !== 'boolean' ||
      typeof b.sight !== 'boolean' ||
      !['stone', 'timber'].includes(b.material) ||
      !Number.isFinite(b.acousticTransmission) ||
      b.acousticTransmission < 0 ||
      b.acousticTransmission > 1
    )
      throw new Error('Invalid spatial blocker.');
    ids.add(b.id);
  }
}
