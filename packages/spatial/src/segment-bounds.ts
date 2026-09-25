import { SPATIAL_LIMITS, type BodyProfile, type Bounds3, type WorldPoint } from './types.js';

/** Bind one ray/sweep, not one tree node. Scalar axes avoid repeated dynamic property
 * lookup and body/parallel checks in the measured sensory broad phase. Keep the same
 * division and epsilon arithmetic; exact halfspaces still decide physical intersections.
 * docs/performance.md#simulation-cpu-and-growing-history */
export function segmentBoundsQuery(
  from: WorldPoint,
  to: WorldPoint,
  body?: BodyProfile,
): (bounds: Bounds3) => boolean {
  const epsilon = SPATIAL_LIMITS.epsilon;
  const x = from.x,
    y = from.y,
    z = from.z;
  const dx = to.x - x,
    dy = to.y - y,
    dz = to.z - z;
  const parallelX = Math.abs(dx) < epsilon;
  const parallelY = Math.abs(dy) < epsilon;
  const parallelZ = Math.abs(dz) < epsilon;
  const radius = body?.radius ?? 0,
    height = body?.height ?? 0;
  return (bounds) => {
    let enter = 0,
      exit = 1;
    const minX = bounds.min.x - radius,
      maxX = bounds.max.x + radius;
    if (parallelX) {
      if (x < minX - epsilon || x > maxX + epsilon) return false;
    } else {
      const a = (minX - epsilon - x) / dx,
        b = (maxX + epsilon - x) / dx;
      enter = Math.max(enter, Math.min(a, b));
      exit = Math.min(exit, Math.max(a, b));
      if (enter > exit) return false;
    }
    const minY = bounds.min.y - height,
      maxY = bounds.max.y;
    if (parallelY) {
      if (y < minY - epsilon || y > maxY + epsilon) return false;
    } else {
      const a = (minY - epsilon - y) / dy,
        b = (maxY + epsilon - y) / dy;
      enter = Math.max(enter, Math.min(a, b));
      exit = Math.min(exit, Math.max(a, b));
      if (enter > exit) return false;
    }
    const minZ = bounds.min.z - radius,
      maxZ = bounds.max.z + radius;
    if (parallelZ) {
      if (z < minZ - epsilon || z > maxZ + epsilon) return false;
    } else {
      const a = (minZ - epsilon - z) / dz,
        b = (maxZ + epsilon - z) / dz;
      enter = Math.max(enter, Math.min(a, b));
      exit = Math.min(exit, Math.max(a, b));
      if (enter > exit) return false;
    }
    return true;
  };
}
