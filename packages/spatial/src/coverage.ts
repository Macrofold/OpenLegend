import { immutablePanel, panelGeometry } from './finite-panel.js';
import type { Bounds3, FinitePanel } from './types.js';

/** Finite horizontal or axis-aligned sloping material, never a supporting floor. */
export interface CoverPanel {
  id: string;
  bounds: Bounds3;
  panel?: FinitePanel;
  transmission: number;
}
export interface ExposureFootprint {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  y: number;
  ownPanelId?: string;
  /** Actual planar material height; y remains its conservative upper bound. */
  heightPlane?: { slopeX: number; slopeZ: number; intercept: number };
  /** Only constant-height ordering uses this interval midpoint at zero-duration crossings. */
  orderingY?: number;
}
type Plane2 = readonly [number, number, number];
const EPS = 1e-10;
const models = new WeakMap<
  FinitePanel,
  { projection: Plane2[]; upper: readonly (readonly [number, number, number, number])[] }
>();
function shadowModel(panel: FinitePanel) {
  let model = immutablePanel(panel) ? models.get(panel) : undefined;
  if (model) return model;
  const planes = panelGeometry(panel).planes;
  const upper = planes.filter((p) => p[1] > EPS),
    lower = planes.filter((p) => p[1] < -EPS);
  const projection: Plane2[] = planes
    .filter((p) => Math.abs(p[1]) <= EPS)
    .map(([a, , c, d]) => [a, c, d]);
  // Eliminate vertical y exactly: every upper limit must be above every lower limit.
  // This includes the finite normal-thickness rim, not just the cloth's upper rectangle.
  for (const [a, b, c, d] of upper)
    for (const [e, f, g, h] of lower)
      projection.push([a / b - e / f, c / b - g / f, d / b - h / f]);
  model = { projection, upper };
  if (immutablePanel(panel)) models.set(panel, model);
  return model;
}
export function footprintMinimumHeight(f: ExposureFootprint): number {
  const p = f.heightPlane;
  return p
    ? Math.min(
        ...[f.minX, f.maxX].flatMap((x) =>
          [f.minZ, f.maxZ].map((z) => p.intercept + p.slopeX * x + p.slopeZ * z),
        ),
      )
    : f.y;
}
/** The exposed upper face, separate from the finite normal-thickness rain shadow. */
export function coverFootprint(cover: CoverPanel): ExposureFootprint {
  const panel = cover.panel;
  if (!panel)
    return {
      minX: cover.bounds.min.x,
      maxX: cover.bounds.max.x,
      minZ: cover.bounds.min.z,
      maxZ: cover.bounds.max.z,
      y: cover.bounds.max.y,
      ownPanelId: cover.id,
    };
  const [a, b, c, d] = panelGeometry(panel).planes[0]!;
  return {
    minX: Math.min(...panel.corners.map((p) => p.x)),
    maxX: Math.max(...panel.corners.map((p) => p.x)),
    minZ: Math.min(...panel.corners.map((p) => p.z)),
    maxZ: Math.max(...panel.corners.map((p) => p.z)),
    heightPlane: { slopeX: -a / b, slopeZ: -c / b, intercept: d / b },
    y: cover.bounds.max.y,
    ownPanelId: cover.id,
  };
}
function overlapsFootprint(p: CoverPanel, f: ExposureFootprint): boolean {
  return (
    p.id !== f.ownPanelId &&
    p.bounds.max.x > f.minX &&
    p.bounds.min.x < f.maxX &&
    p.bounds.max.z > f.minZ &&
    p.bounds.min.z < f.maxZ
  );
}
function shadowPlanes(p: CoverPanel, f: ExposureFootprint): Plane2[] {
  const height = f.heightPlane ?? { slopeX: 0, slopeZ: 0, intercept: f.y };
  const model = p.panel
    ? shadowModel(p.panel)
    : {
        projection: [
          [1, 0, p.bounds.max.x],
          [-1, 0, -p.bounds.min.x],
          [0, 1, p.bounds.max.z],
          [0, -1, -p.bounds.min.z],
        ] as Plane2[],
        upper: [[0, 1, 0, p.bounds.max.y]] as const,
      };
  return [
    ...model.projection,
    ...model.upper.map(
      ([a, b, c, d]): Plane2 => [
        a + b * height.slopeX,
        c + b * height.slopeZ,
        d - b * height.intercept,
      ],
    ),
  ];
}
/** Qualify both exposed faces before admitting a new panel. Individually axial
 * slopes can still produce a diagonal relative-height cut when they overlap.
 * The rectangular integrator cannot represent that cut; unrelated separated
 * panels remain supported. docs/spatial-world.md#physical-interaction-design-checks */
export function coverExposureSupported(cover: CoverPanel, panels: readonly CoverPanel[]): boolean {
  const footprint = coverFootprint(cover);
  const supported = (p: CoverPanel, f: ExposureFootprint) =>
    !overlapsFootprint(p, f) ||
    shadowPlanes(p, f).every(([a, c]) => Math.abs(a) <= EPS || Math.abs(c) <= EPS);
  return panels.every(
    (other) =>
      other.id === cover.id ||
      other.bounds.max.x <= cover.bounds.min.x ||
      other.bounds.min.x >= cover.bounds.max.x ||
      other.bounds.max.z <= cover.bounds.min.z ||
      other.bounds.min.z >= cover.bounds.max.z ||
      (supported(other, footprint) && supported(cover, coverFootprint(other))),
  );
}
function shadowRectangle(p: CoverPanel, f: ExposureFootprint) {
  if (p.id === f.ownPanelId) return;
  const bounds = { minX: -Infinity, maxX: Infinity, minZ: -Infinity, maxZ: Infinity };
  const planes = shadowPlanes(p, f);
  for (const [a, c, d] of planes) {
    if (Math.abs(a) > EPS && Math.abs(c) > EPS)
      throw new Error('Rain coverage needs an admitted axis-aligned finite panel.');
    if (Math.abs(a) <= EPS && Math.abs(c) <= EPS) {
      // Coplanar coverings use stable identity order; a body at the top is not underneath.
      const above =
        f.orderingY !== undefined &&
        !f.heightPlane &&
        (!p.panel || panelGeometry(p.panel).normal.y === 1)
          ? p.bounds.max.y - f.orderingY
          : d;
      if (above < -EPS || (Math.abs(above) <= EPS && (!f.ownPanelId || p.id > f.ownPanelId)))
        return;
    } else if (Math.abs(a) > EPS) {
      if (a > 0) bounds.maxX = Math.min(bounds.maxX, d / a);
      else bounds.minX = Math.max(bounds.minX, d / a);
    } else {
      if (c > 0) bounds.maxZ = Math.min(bounds.maxZ, d / c);
      else bounds.minZ = Math.max(bounds.minZ, d / c);
    }
  }
  return bounds.minX < bounds.maxX && bounds.minZ < bounds.maxZ ? bounds : undefined;
}

/** Exact rectangular area integration. Boundary lines have zero area, not an inflated dry rim. */
export function incidentExposure(
  footprint: ExposureFootprint,
  panels: readonly CoverPanel[],
  region?: { minX: number; maxX: number; minZ: number; maxZ: number },
): { fraction: number; coveredArea: number; clips: number } {
  const area = (footprint.maxX - footprint.minX) * (footprint.maxZ - footprint.minZ);
  if (!(area > 0)) throw new Error('An exposure footprint needs finite positive area.');
  const relevant = panels.flatMap((p) => {
    if (!overlapsFootprint(p, footprint)) return [];
    const shadow = shadowRectangle(p, footprint);
    return shadow &&
      shadow.maxX > footprint.minX &&
      shadow.minX < footprint.maxX &&
      shadow.maxZ > footprint.minZ &&
      shadow.minZ < footprint.maxZ
      ? [{ ...shadow, transmission: p.transmission }]
      : [];
  });
  const xs = new Set([footprint.minX, footprint.maxX]);
  const zs = new Set([footprint.minZ, footprint.maxZ]);
  const boundaries = [
    ...relevant.map((p) => ({
      minX: p.minX,
      maxX: p.maxX,
      minZ: p.minZ,
      maxZ: p.maxZ,
    })),
    ...(region ? [region] : []),
  ];
  for (const b of boundaries) {
    for (const x of [b.minX, b.maxX]) if (x > footprint.minX && x < footprint.maxX) xs.add(x);
    for (const z of [b.minZ, b.maxZ]) if (z > footprint.minZ && z < footprint.maxZ) zs.add(z);
  }
  const x = [...xs].sort((a, b) => a - b),
    z = [...zs].sort((a, b) => a - b);
  let incident = 0,
    covered = 0,
    clips = 0;
  for (let i = 1; i < x.length; i++)
    for (let j = 1; j < z.length; j++) {
      const cx = (x[i - 1]! + x[i]!) / 2,
        cz = (z[j - 1]! + z[j]!) / 2;
      const cell = (x[i]! - x[i - 1]!) * (z[j]! - z[j - 1]!);
      const above = relevant.filter(
        (p) => cx >= p.minX && cx <= p.maxX && cz >= p.minZ && cz <= p.maxZ,
      );
      clips += relevant.length;
      const transmission = above.reduce((amount, p) => amount * p.transmission, 1);
      if (above.length) covered += cell;
      if (
        !region ||
        (cx >= region.minX && cx <= region.maxX && cz >= region.minZ && cz <= region.maxZ)
      )
        incident += cell * transmission;
    }
  const fraction = incident / area;
  // Parallel-plane arithmetic must preserve exact dry/full exposure at machine
  // precision; otherwise zero exposure creates needless moisture writes each slice.
  return {
    fraction: fraction < 1e-12 ? 0 : fraction > 1 - 1e-12 ? 1 : fraction,
    coveredArea: covered,
    clips,
  };
}

/** Moving rectangle overlap is piecewise quadratic. These edge crossings let Simpson
 * integration be exact on each linear motion segment, including narrow covered seams. */
export function exposureCrossings(
  from: ExposureFootprint,
  to: ExposureFootprint,
  panels: readonly CoverPanel[],
  region?: { minX: number; maxX: number; minZ: number; maxZ: number },
): number[] {
  if (
    ['minX', 'maxX', 'minZ', 'maxZ', 'y'].every(
      (k) => Reflect.get(from, k) === Reflect.get(to, k),
    ) &&
    from.ownPanelId === to.ownPanelId &&
    (from.heightPlane === to.heightPlane ||
      ['slopeX', 'slopeZ', 'intercept'].every(
        (k) =>
          from.heightPlane &&
          to.heightPlane &&
          Reflect.get(from.heightPlane, k) === Reflect.get(to.heightPlane, k),
      ))
  )
    return [0, 1];
  const times = new Set([0, 1]);
  const addCrossing = (a: number, b: number) => {
    if (a === b) return;
    const t = -a / (b - a);
    if (t > 0 && t < 1) times.add(t);
  };
  const x: Array<[number, number]> = [
    [from.minX, to.minX],
    [from.maxX, to.maxX],
  ];
  const z: Array<[number, number]> = [
    [from.minZ, to.minZ],
    [from.maxZ, to.maxZ],
  ];
  if (region) {
    x.push([region.minX, region.minX], [region.maxX, region.maxX]);
    z.push([region.minZ, region.minZ], [region.maxZ, region.maxZ]);
  }
  for (const p of panels) {
    if (p.id === from.ownPanelId) continue;
    const a = shadowPlanes(p, from),
      b = shadowPlanes(p, to);
    for (let i = 0; i < a.length; i++) {
      const [nx, nz, d0] = a[i]!,
        [, , d1] = b[i]!;
      if (Math.abs(nx) > EPS && Math.abs(nz) > EPS)
        throw new Error('Unadmitted rain coverage orientation.');
      if (Math.abs(nx) > EPS) x.push([d0 / nx, d1 / nx]);
      else if (Math.abs(nz) > EPS) z.push([d0 / nz, d1 / nz]);
      else addCrossing(d0, d1);
    }
  }
  // Shadow edges move linearly when a material rises through a slope. Split where
  // ANY two edges exchange order, including a finite rim's active-plane change.
  // Between these fractions the covered rectangular area is exactly quadratic.
  for (const edges of [x, z])
    for (let i = 0; i < edges.length; i++)
      for (let j = i + 1; j < edges.length; j++)
        addCrossing(edges[i]![0] - edges[j]![0], edges[i]![1] - edges[j]![1]);
  return [...times].sort((a, b) => a - b);
}
