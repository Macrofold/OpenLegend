import { SPATIAL_LIMITS, type BodyProfile, type WorldPoint } from './types.js';

type Extent = Pick<BodyProfile, 'radius' | 'height'>;
interface Separation {
  x: number;
  y: number;
  z: number;
  dx: number;
  dy: number;
  dz: number;
  low: number;
  high: number;
  cylinder: number;
  round: number;
}

/** Upright movement shapes, without the movement skin: capsules when height is
 * at least the diameter, short cylinders otherwise. A zero extent represents a
 * geometric point, such as an observed hazard region, never a proxy entity. */
function separation(
  firstFrom: WorldPoint,
  firstTo: WorldPoint,
  first: Extent,
  secondFrom: WorldPoint,
  secondTo: WorldPoint,
  second: Extent,
): Separation {
  const a = first.height >= 2 * first.radius ? first.radius : 0;
  const b = second.height >= 2 * second.radius ? second.radius : 0;
  return {
    x: firstFrom.x - secondFrom.x,
    y: firstFrom.y - secondFrom.y,
    z: firstFrom.z - secondFrom.z,
    dx: firstTo.x - firstFrom.x - (secondTo.x - secondFrom.x),
    dy: firstTo.y - firstFrom.y - (secondTo.y - secondFrom.y),
    dz: firstTo.z - firstFrom.z - (secondTo.z - secondFrom.z),
    low: b - (first.height - a),
    high: second.height - b - a,
    cylinder: (a ? 0 : first.radius) + (b ? 0 : second.radius),
    round: a + b,
  };
}
function components(s: Separation, t: number) {
  const x = s.x + s.dx * t,
    y = s.y + s.dy * t,
    z = s.z + s.dz * t;
  const horizontal = Math.hypot(x, z);
  const radial = Math.max(0, horizontal - s.cylinder);
  const vertical = y < s.low ? y - s.low : y > s.high ? y - s.high : 0;
  return { x, z, horizontal, radial, vertical };
}
function distanceAt(s: Separation, t: number): number {
  const x = s.x + s.dx * t,
    y = s.y + s.dy * t,
    z = s.z + s.dz * t;
  return (
    Math.hypot(
      Math.max(0, Math.hypot(x, z) - s.cylinder),
      y < s.low ? y - s.low : y > s.high ? y - s.high : 0,
    ) - s.round
  );
}
function minimum(s: Separation, expansion = 0): number {
  const travel = Math.hypot(s.dx, s.dy, s.dz);
  if (!travel) return expansion > 0 ? 1 : 0;
  if (!s.dy && !expansion) {
    const horizontal = s.dx * s.dx + s.dz * s.dz;
    return horizontal ? Math.max(0, Math.min(1, -(s.x * s.dx + s.z * s.dz) / horizontal)) : 0;
  }
  if (!s.cylinder && !expansion) {
    // Capsule-axis distance is quadratic on each vertical overlap interval.
    const cuts = [0, 1];
    if (s.dy)
      for (const height of [s.low, s.high]) {
        const at = (height - s.y) / s.dy;
        if (at > 0 && at < 1) cuts.push(at);
      }
    cuts.sort((a, b) => a - b);
    let best = 0,
      value = distanceAt(s, 0);
    for (let i = 1; i < cuts.length; i++) {
      const low = cuts[i - 1]!,
        high = cuts[i]!;
      const y = s.y + (s.dy * (low + high)) / 2;
      const boundary = y < s.low ? s.low : y > s.high ? s.high : undefined;
      const a = s.dx * s.dx + s.dz * s.dz + (boundary === undefined ? 0 : s.dy * s.dy);
      const b = s.x * s.dx + s.z * s.dz + (boundary === undefined ? 0 : (s.y - boundary) * s.dy);
      const at = a ? Math.max(low, Math.min(high, -b / a)) : low;
      const candidate = distanceAt(s, at);
      if (candidate < value) {
        best = at;
        value = candidate;
      }
    }
    return best;
  }
  // Distance to this convex Minkowski shape has a monotone directional derivative.
  // Only mixed short-cylinder/rounded shapes on slopes, or a growing margin, need
  // this bounded search; ordinary upright capsule routes use the quadratic path.
  const derivative = (at: number) => {
    const c = components(s, at),
      length = Math.hypot(c.radial, c.vertical);
    return (
      (length
        ? (c.radial * (c.horizontal ? (c.x * s.dx + c.z * s.dz) / c.horizontal : 0) +
            c.vertical * s.dy) /
          length
        : 0) - expansion
    );
  };
  if (derivative(0) >= 0) return 0;
  if (derivative(1) <= 0) return 1;
  let low = 0,
    high = 1;
  for (let i = 0; i < 64 && (high - low) * travel > SPATIAL_LIMITS.epsilon / 128; i++) {
    const middle = (low + high) / 2;
    if (derivative(middle) < 0) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

export function bodySurfaceDistance(
  firstPoint: WorldPoint,
  first: Extent,
  secondPoint: WorldPoint,
  second: Extent,
): number {
  return Math.max(
    0,
    distanceAt(separation(firstPoint, firstPoint, first, secondPoint, secondPoint, second), 0),
  );
}

/** Minimum over the complete executed linear piece, including interior crossings. */
export function movingBodiesMinimumSeparation(
  firstFrom: WorldPoint,
  firstTo: WorldPoint,
  first: Extent,
  secondFrom: WorldPoint,
  secondTo: WorldPoint,
  second: Extent,
): number {
  const s = separation(firstFrom, firstTo, first, secondFrom, secondTo, second);
  return Math.max(0, distanceAt(s, minimum(s)));
}

/** First entry into a surface-distance band. A linearly growing threshold supports
 * uncertain observed regions; its cap/expiry remains the caller's temporal boundary. */
export function movingBodiesDistanceEntry(
  firstFrom: WorldPoint,
  firstTo: WorldPoint,
  first: Extent,
  secondFrom: WorldPoint,
  secondTo: WorldPoint,
  second: Extent,
  distanceFrom: number,
  distanceTo = distanceFrom,
): number | undefined {
  const s = separation(firstFrom, firstTo, first, secondFrom, secondTo, second);
  const expansion = distanceTo - distanceFrom;
  const gap = (at: number) => distanceAt(s, at) - distanceFrom - expansion * at;
  if (gap(0) <= 0) return 0;
  const closest = minimum(s, expansion);
  if (gap(closest) > 0) return;
  let low = 0,
    high = closest;
  const travel = Math.hypot(s.dx, s.dy, s.dz) + Math.abs(expansion);
  for (let i = 0; i < 64 && (high - low) * travel > SPATIAL_LIMITS.epsilon / 128; i++) {
    const middle = (low + high) / 2;
    if (gap(middle) > 0) low = middle;
    else high = middle;
  }
  return high;
}

/** The complete band interval on one executed piece. Reversing the same relative
 * motion finds its exit, including a short visit absent at both sampled endpoints. */
export function movingBodiesDistanceInterval(
  firstFrom: WorldPoint,
  firstTo: WorldPoint,
  first: Extent,
  secondFrom: WorldPoint,
  secondTo: WorldPoint,
  second: Extent,
  distanceFrom: number,
  distanceTo = distanceFrom,
): { enter: number; exit: number } | undefined {
  const enter = movingBodiesDistanceEntry(
    firstFrom,
    firstTo,
    first,
    secondFrom,
    secondTo,
    second,
    distanceFrom,
    distanceTo,
  );
  if (enter === undefined) return;
  const reverse = movingBodiesDistanceEntry(
    firstTo,
    firstFrom,
    first,
    secondTo,
    secondFrom,
    second,
    distanceTo,
    distanceFrom,
  );
  return reverse === undefined ? undefined : { enter, exit: 1 - reverse };
}
