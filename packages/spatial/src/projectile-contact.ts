import type { BodyProfile, WorldPoint } from './types.js';

type Interval = [number, number];
/** The interval in which a squared distance is within the admitted radius. */
function within(a: number, b: number, c: number): Interval | undefined {
  if (a < 1e-20) return c <= 0 ? [0, 1] : undefined;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return;
  const root = Math.sqrt(discriminant);
  const start = Math.max(0, (-b - root) / (2 * a));
  const end = Math.min(1, (-b + root) / (2 * a));
  return start <= end ? [start, end] : undefined;
}
function slab(start: number, travel: number, low: number, high: number): Interval | undefined {
  if (Math.abs(travel) < 1e-12) return start >= low && start <= high ? [0, 1] : undefined;
  const first = (low - start) / travel,
    second = (high - start) / travel;
  const enter = Math.max(0, Math.min(first, second));
  const exit = Math.min(1, Math.max(first, second));
  return enter <= exit ? [enter, exit] : undefined;
}
/** First contact of a point segment with an upright body moving linearly over the same
 * interval. Relative motion preserves crossings even when neither endpoint overlaps.
 * Short bodies use the movement owner's cylinder; taller bodies use its capsule. */
export function movingBodyContact(
  from: WorldPoint,
  to: WorldPoint,
  bodyFrom: WorldPoint,
  bodyTo: WorldPoint,
  body: Pick<BodyProfile, 'radius' | 'height'>,
): number | undefined {
  const p = { x: from.x - bodyFrom.x, y: from.y - bodyFrom.y, z: from.z - bodyFrom.z };
  const d = {
    x: to.x - bodyTo.x - p.x,
    y: to.y - bodyTo.y - p.y,
    z: to.z - bodyTo.z - p.z,
  };
  const r = body.radius,
    h = body.height;
  const candidates: number[] = [];
  const horizontal = within(
    d.x * d.x + d.z * d.z,
    2 * (p.x * d.x + p.z * d.z),
    p.x * p.x + p.z * p.z - r * r,
  );
  const vertical = slab(p.y, d.y, h > 2 * r ? r : 0, h > 2 * r ? h - r : h);
  if (horizontal && vertical) {
    const enter = Math.max(horizontal[0], vertical[0]);
    if (enter <= Math.min(horizontal[1], vertical[1])) candidates.push(enter);
  }
  if (h > 2 * r)
    for (const center of [r, h - r]) {
      const y = p.y - center;
      const sphere = within(
        d.x * d.x + d.y * d.y + d.z * d.z,
        2 * (p.x * d.x + y * d.y + p.z * d.z),
        p.x * p.x + y * y + p.z * p.z - r * r,
      );
      if (sphere) candidates.push(sphere[0]);
    }
  return candidates.length ? Math.min(...candidates) : undefined;
}
