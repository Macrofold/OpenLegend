import type { GameView } from '@open-legend/protocol';
import {
  clearSegment,
  distance3D,
  soundTransmission,
  surfaceContains,
  surfaceHeight,
  type WorldPoint,
} from '@open-legend/spatial';
import { VISION_FOCUS } from './vision-blur';
import type { PerceptionOptions } from './world-renderer';

/** Bounded, conservative surface guide, not an observation/recognition query.
 * docs/spatial-world.md#perception-range-guides owns sampling and elevation limits. */
export const GUIDE_SAMPLING = {
  rays: 128,
  steps: 32,
  refinements: 8,
  intervalMs: 100,
  sliceMs: 4,
} as const;
type SurfaceSample = { center: WorldPoint; support: WorldPoint | null };
export interface GuideContour {
  sense: 'vision' | 'hearing';
  band: number;
  label: string;
  vertices: WorldPoint[];
  triangles: number[];
  segments: Array<[WorldPoint, WorldPoint]>;
}
export const GUIDE_HINTS = {
  vision: 'Sight range. Nearby objects are clearer; obstacles block the view.',
  hearing:
    'Hearing range for normal speech. Words become harder to hear with distance; walls can muffle them.',
} as const;

export function perceptionFieldKey(
  view: GameView,
  options: PerceptionOptions,
  includePosition = true,
): string {
  return JSON.stringify([
    view.worldId,
    view.saveTimeline,
    view.access?.scope,
    view.player.id,
    view.map.seed,
    view.map.width,
    view.map.height,
    view.map.spatial.revision,
    view.map.spatial.disclosure,
    includePosition ? view.player.position : null,
    view.player.supportSurfaceId,
    view.vision,
    view.hearing,
    options,
  ]);
}

export function perceptionField(view: GameView, options: PerceptionOptions): GuideContour[] {
  const steps = perceptionFieldSteps(view, options);
  let result = steps.next();
  while (!result.done) result = steps.next();
  return result.value;
}

/** Same deterministic field for synchronous consumers and cooperative browser calculation. */
export function* perceptionFieldSteps(
  view: GameView,
  options: PerceptionOptions,
): Generator<void, GuideContour[]> {
  // This provider explicitly discloses starter geometry. Never infer undiscovered topology.
  if (view.map.spatial.disclosure !== 'public') return [];
  const contours: Array<GuideContour & { radius: number }> = [];
  if (options.vision && view.vision.enabled && view.vision.radius > 0)
    for (const [band, radius] of [
      view.vision.radius * VISION_FOCUS.clearFraction,
      view.vision.radius,
    ].entries())
      contours.push({
        sense: 'vision',
        band,
        radius,
        label: band === 0 ? 'Clear sight' : 'Within sight',
        vertices: [],
        triangles: [],
        segments: [],
      });
  if (options.hearing && view.hearing.enabled)
    for (const [band, radius] of [
      view.hearing.referenceRadius,
      view.hearing.partialRadius,
      view.hearing.detectionRadius,
    ].entries())
      if (radius > 0)
        contours.push({
          sense: 'hearing',
          band,
          radius,
          label: ['Clear speech', 'Some words', 'Faint sound'][band]!,
          vertices: [],
          triangles: [],
          segments: [],
        });
  if (!contours.length) return [];
  const map = view.map,
    origin = view.player.position;
  const surfaces = map.spatial.surfaces;
  const current = surfaces.find((surface) => surface.id === view.player.supportSurfaceId);
  const eye = { ...origin, y: origin.y + view.vision.eyeHeight };
  const ear = { ...origin, y: origin.y + view.hearing.earHeight };
  const maximum = Math.max(...contours.map((contour) => contour.radius));
  // Airborne actors use a horizontal cross-section; grounded actors prefer their
  // own support, then the closest declared sheet. Never join stacked floors.
  const footAt = (x: number, z: number): WorldPoint | null => {
    if (x < 0 || z < 0 || x > map.width - 1 || z > map.height - 1) return null;
    if (view.player.supportSurfaceId === null) return { x, y: origin.y, z };
    if (current && surfaceContains(current, { x, z }))
      return { x, y: surfaceHeight(current, x, z), z };
    let y = 0,
      best = Math.abs(origin.y);
    for (const surface of surfaces) {
      if (!surfaceContains(surface, { x, z })) continue;
      const candidate = surfaceHeight(surface, x, z),
        separation = Math.abs(candidate - origin.y);
      if (separation < best) {
        y = candidate;
        best = separation;
      }
    }
    return { x, y, z };
  };
  const sight = new WeakMap<WorldPoint, boolean>();
  const acousticDistance = new WeakMap<WorldPoint, number>();
  const passes = (contour: (typeof contours)[number], foot: WorldPoint): boolean => {
    if (contour.sense === 'vision') {
      if (distance3D(origin, foot) > contour.radius) return false;
      let visible = sight.get(foot);
      if (visible === undefined) {
        visible = view.vision.targetHeights.some((height) =>
          clearSegment(map, eye, { ...foot, y: foot.y + height }),
        );
        sight.set(foot, visible);
      }
      return visible;
    }
    let effectiveDistance = acousticDistance.get(foot);
    if (effectiveDistance === undefined) {
      const speaker = { ...foot, y: foot.y + view.hearing.earHeight };
      // Native radii invert the authored thresholds. Energy transmission scales
      // their radius by sqrt(T), exactly equivalent to native +10 log10(T).
      const transmission = soundTransmission(map, speaker, ear);
      effectiveDistance =
        transmission > 0
          ? Math.max(0.25, distance3D(speaker, ear)) / Math.sqrt(transmission)
          : Infinity;
      acousticDistance.set(foot, effectiveDistance);
    }
    return effectiveDistance <= contour.radius;
  };
  // One shared grid retains bounded work and reuses sight/acoustic samples across bands.
  const grid: WorldPoint[][] = [[origin]];
  for (let ring = 1; ring <= GUIDE_SAMPLING.steps; ring++) {
    const distance = (ring * maximum) / GUIDE_SAMPLING.steps;
    grid.push(
      Array.from({ length: GUIDE_SAMPLING.rays }, (_, ray) => {
        const angle = (ray * Math.PI * 2) / GUIDE_SAMPLING.rays;
        const x = origin.x + Math.cos(angle) * distance;
        const z = origin.z + Math.sin(angle) * distance;
        return footAt(x, z) ?? { x, y: origin.y, z };
      }),
    );
    yield;
  }
  // Full triangle interiors are identical across bands; keep their support points
  // shared so native sight/transmission classification runs once per build.
  const interiors: SurfaceSample[] = [];
  const midpoints = new Map<number, SurfaceSample>();
  const result: GuideContour[] = [];
  for (const contour of contours) {
    const { radius: _radius, ...display } = contour;
    const mesh = yield* guideMesh(grid, interiors, midpoints, footAt, (point) =>
      passes(contour, point),
    );
    result.push({ ...display, ...mesh });
  }
  return result;
}

/** Fill and outline share topology. Rejected interiors become closed holes rather
 * than missing border fragments; no chord connects across an excluded patch.
 * docs/spatial-world.md#display-approximation-and-updates */
function* guideMesh(
  grid: WorldPoint[][],
  interiors: SurfaceSample[],
  midpoints: Map<number, SurfaceSample>,
  footAt: (x: number, z: number) => WorldPoint | null,
  passes: (point: WorldPoint) => boolean,
): Generator<void, Pick<GuideContour, 'vertices' | 'triangles' | 'segments'>> {
  type Sample = { id: number; point: WorldPoint; inside: boolean };
  const vertices: WorldPoint[] = [],
    triangles: number[] = [];
  const indices: number[] = [];
  const crossings = new Map<number, Sample>();
  const boundary = new Map<number, [number, number]>();
  // Unordered integer pairs avoid allocating strings for every shared mesh edge.
  const edgeKey = (a: number, b: number): number => ((a + b) * (a + b + 1)) / 2 + Math.min(a, b);
  const originalPoints = grid.reduce((count, ring) => count + ring.length, 0);
  const clippedMidpoints = new Map<number, SurfaceSample>();
  let nextId = 0;
  const sample = (point: WorldPoint): Sample => ({
    id: nextId++,
    point,
    inside: footAt(point.x, point.z) !== null && passes(point),
  });
  const samples: Sample[][] = [];
  for (const ring of grid) {
    const row: Sample[] = [];
    for (let i = 0; i < ring.length; i++) {
      row.push(sample(ring[i]!));
      if ((i + 1) % 32 === 0) yield;
    }
    samples.push(row);
  }
  const crossing = (a: Sample, b: Sample): Sample => {
    const key = edgeKey(a.id, b.id);
    const cached = crossings.get(key);
    if (cached) return cached;
    let inside = a.inside ? a.point : b.point;
    let outside = a.inside ? b.point : a.point;
    for (let i = 0; i < GUIDE_SAMPLING.refinements; i++) {
      const x = (inside.x + outside.x) / 2;
      const z = (inside.z + outside.z) / 2;
      const point = footAt(x, z);
      if (point && passes(point)) inside = point;
      else outside = { x, y: (inside.y + outside.y) / 2, z };
    }
    const result = { id: nextId++, point: inside, inside: true };
    crossings.set(key, result);
    return result;
  };
  const edgePasses = (a: Sample, b: Sample): boolean => {
    const cache = a.id < originalPoints && b.id < originalPoints ? midpoints : clippedMidpoints;
    const key = edgeKey(a.id, b.id);
    let middle = cache.get(key);
    if (!middle) {
      const center = {
        x: (a.point.x + b.point.x) / 2,
        y: (a.point.y + b.point.y) / 2,
        z: (a.point.z + b.point.z) / 2,
      };
      middle = { center, support: footAt(center.x, center.z) };
      cache.set(key, middle);
    }
    return (
      middle.support !== null &&
      Math.abs(middle.support.y - middle.center.y) <= 0.05 &&
      passes(middle.support)
    );
  };
  const index = (point: Sample): number => {
    let id = indices[point.id];
    if (id === undefined) {
      id = vertices.length;
      indices[point.id] = id;
      vertices.push(point.point);
    }
    return id;
  };
  const edge = (a: number, b: number): void => {
    const key = edgeKey(a, b);
    if (boundary.has(key)) boundary.delete(key);
    else boundary.set(key, [a, b]);
  };
  let triangleNumber = 0;
  const triangle = (corners: Sample[]): void => {
    const ordinal = triangleNumber++;
    const polygon: Sample[] = [];
    for (let i = 0; i < 3; i++) {
      const a = corners[i]!,
        b = corners[(i + 1) % 3]!;
      if (a.inside) polygon.push(a);
      if (a.inside !== b.inside) polygon.push(crossing(a, b));
    }
    if (polygon.length < 3) return;
    const first = index(polygon[0]!);
    for (let i = 1; i + 1 < polygon.length; i++) {
      const a = index(polygon[i]!),
        b = index(polygon[i + 1]!);
      const from = vertices[first]!,
        to = vertices[a]!,
        last = vertices[b]!;
      if (
        Math.abs((to.x - from.x) * (last.z - from.z) - (to.z - from.z) * (last.x - from.x)) < 1e-9
      )
        continue;
      // Check each rendered triangle, including both halves of a clipped quadrilateral.
      // Native interior classification and support height exclude hidden/stacked ground.
      const unchanged = corners.every((corner) => corner.inside);
      let interior = unchanged ? interiors[ordinal] : undefined;
      if (!interior) {
        const center = {
          x: (from.x + to.x + last.x) / 3,
          y: (from.y + to.y + last.y) / 3,
          z: (from.z + to.z + last.z) / 3,
        };
        interior = { center, support: footAt(center.x, center.z) };
        if (unchanged) interiors[ordinal] = interior;
      }
      const { center, support } = interior;
      if (!support || Math.abs(support.y - center.y) > 0.05 || !passes(support)) continue;
      // A visible center alone can still bridge an unseen wall corner. Exclude
      // that triangle instead of breaking its outline; the resulting hole closes.
      if (
        !edgePasses(polygon[0]!, polygon[i]!) ||
        !edgePasses(polygon[i]!, polygon[i + 1]!) ||
        !edgePasses(polygon[i + 1]!, polygon[0]!)
      )
        continue;
      triangles.push(first, a, b);
      edge(first, a);
      edge(a, b);
      edge(b, first);
    }
  };
  for (let ring = 1; ring < samples.length; ring++) {
    for (let ray = 0; ray < GUIDE_SAMPLING.rays; ray++) {
      const next = (ray + 1) % GUIDE_SAMPLING.rays;
      const outer = samples[ring]!;
      const inner = samples[ring - 1]!;
      if (ring === 1) triangle([inner[0]!, outer[ray]!, outer[next]!]);
      else {
        triangle([inner[ray]!, outer[ray]!, outer[next]!]);
        triangle([inner[ray]!, outer[next]!, inner[next]!]);
      }
      if ((ray + 1) % 8 === 0) yield;
    }
  }
  return {
    vertices,
    triangles,
    segments: [...boundary.values()].map(([a, b]) => [vertices[a]!, vertices[b]!]),
  };
}
