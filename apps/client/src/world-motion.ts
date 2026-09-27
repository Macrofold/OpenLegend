import {
  distance3D,
  interpolate,
  surfaceById,
  surfaceContains,
  surfaceHeight,
  SPATIAL_LIMITS,
  type SpatialMap,
  type WorldPoint,
} from '@open-legend/spatial';

/** Display interpolation may lag a support change. Cross only a common physical seam;
 * never drop onto the underlying terrain just because it contains the interpolated XZ.
 * Missing intermediate movement after a large network jump snaps to authorized state rather
 * than inventing a path through a floor. docs/world-presentation.md#motion-and-depth
 */
export function interpolateVisualFoot(
  map: SpatialMap,
  from: WorldPoint,
  to: WorldPoint,
  fromSupport: string | null,
  toSupport: string | null,
  fraction: number,
): { point: WorldPoint; support: string | null } {
  const p = interpolate(from, to, Math.max(0, Math.min(1, fraction)));
  if (!fromSupport || !toSupport) {
    return { point: p, support: distance3D(p, to) < 1e-5 ? toSupport : null };
  }
  const a = surfaceById(map, fromSupport),
    b = surfaceById(map, toSupport);
  const snap = () => ({ point: { ...to }, support: toSupport });
  if (!a || !b) return snap();
  if (fromSupport !== toSupport) {
    const startDelta = surfaceHeight(a, from.x, from.z) - surfaceHeight(b, from.x, from.z);
    const endDelta = surfaceHeight(a, to.x, to.z) - surfaceHeight(b, to.x, to.z);
    if (Math.abs(startDelta - endDelta) > 1e-7) {
      const t = startDelta / (startDelta - endDelta),
        seam = interpolate(from, to, t);
      if (t < -1e-5 || t > 1 + 1e-5 || !surfaceContains(a, seam) || !surfaceContains(b, seam))
        return snap();
      const s = fraction < t ? a : b;
      if (!surfaceContains(s, p)) return snap();
      return { point: { ...p, y: surfaceHeight(s, p.x, p.z) }, support: s.id };
    }
    if (Math.abs(startDelta) > SPATIAL_LIMITS.supportTolerance) return snap();
  }
  const s = surfaceContains(b, p) ? b : surfaceContains(a, p) ? a : undefined;
  return s ? { point: { ...p, y: surfaceHeight(s, p.x, p.z) }, support: s.id } : snap();
}
