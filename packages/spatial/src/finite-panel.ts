import type { Bounds3, FinitePanel, WorldPoint } from './types.js';

export type HalfSpace = readonly [number, number, number, number];
const subtract = (a: WorldPoint, b: WorldPoint): WorldPoint => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
});
const cross = (a: WorldPoint, b: WorldPoint): WorldPoint => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const unit = (a: WorldPoint): WorldPoint => {
  const length = Math.hypot(a.x, a.y, a.z);
  return { x: a.x / length, y: a.y / length, z: a.z / length };
};
const plane = (normal: WorldPoint, point: WorldPoint): HalfSpace => [
  normal.x,
  normal.y,
  normal.z,
  normal.x * point.x + normal.y * point.y + normal.z * point.z,
];
/** One geometry owner serves physical rays, round-body collision, navigation and rendering.
 * docs/spatial-world.md#physical-interaction-design-checks */
const prepared = new WeakMap<FinitePanel, ReturnType<typeof prepare>>();
function prepare(panel: FinitePanel) {
  const [a, b, , d] = panel.corners;
  const u = subtract(b, a),
    v = subtract(d, a),
    normal = unit(cross(u, v));
  const down = { x: -normal.x, y: -normal.y, z: -normal.z };
  const vertices = [
    ...panel.corners,
    ...panel.corners.map((p) => ({
      x: p.x + down.x * panel.thickness,
      y: p.y + down.y * panel.thickness,
      z: p.z + down.z * panel.thickness,
    })),
  ];
  const planes: HalfSpace[] = [plane(normal, a), plane(down, vertices[4]!)];
  for (let i = 0; i < 4; i++)
    planes.push(
      plane(
        unit(cross(subtract(panel.corners[(i + 1) % 4]!, panel.corners[i]!), normal)),
        panel.corners[i]!,
      ),
    );
  const bounds: Bounds3 = {
    min: { x: Infinity, y: Infinity, z: Infinity },
    max: { x: -Infinity, y: -Infinity, z: -Infinity },
  };
  for (const p of vertices)
    for (const axis of ['x', 'y', 'z'] as const) {
      bounds.min[axis] = Math.min(bounds.min[axis], p[axis]);
      bounds.max[axis] = Math.max(bounds.max[axis], p[axis]);
    }
  return { vertices, edges: [u, v, down], planes, normal, bounds };
}
export function immutablePanel(panel: FinitePanel): boolean {
  return (
    Object.isFrozen(panel) && Object.isFrozen(panel.corners) && panel.corners.every(Object.isFrozen)
  );
}
export function panelGeometry(panel: FinitePanel) {
  // A containing map's revision cannot invalidate a cache keyed by an in-place
  // edited panel. Mutable providers recompute; owned immutable shapes reuse it.
  if (!immutablePanel(panel)) return prepare(panel);
  let geometry = prepared.get(panel);
  if (!geometry) {
    geometry = prepare(panel);
    prepared.set(panel, geometry);
  }
  return geometry;
}
export const PANEL_TRIANGLES = [
  0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4,
  3, 4, 0,
] as const;
/** Ray against the actual uninflated finite shape. Picking shares the physical geometry. */
export function panelRayFraction(
  panel: FinitePanel,
  from: WorldPoint,
  to: WorldPoint,
): number | undefined {
  let enter = 0,
    exit = 1;
  for (const [a, b, c, d] of panelGeometry(panel).planes) {
    const origin = a * from.x + b * from.y + c * from.z;
    const delta = a * (to.x - from.x) + b * (to.y - from.y) + c * (to.z - from.z);
    if (Math.abs(delta) < 1e-12) {
      if (origin > d) return;
      continue;
    }
    const t = (d - origin) / delta;
    if (delta < 0) enter = Math.max(enter, t);
    else exit = Math.min(exit, t);
    if (enter > exit) return;
  }
  return enter;
}
