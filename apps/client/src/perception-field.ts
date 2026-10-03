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
export const GUIDE_SAMPLING = { rays: 128, steps: 32, refinements: 8, intervalMs: 250 } as const;
export interface GuideContour {
  sense: 'vision' | 'hearing';
  band: number;
  label: string;
  points: Array<WorldPoint | null>;
  segments: Array<[WorldPoint, WorldPoint]>;
}
export const GUIDE_HINTS = {
  vision:
    'Vision · solid teal. Clear sight → Reduced detail → Outside sight range. The inner band is a visual guide at 60% of sight range; the outer limit uses actual sight range and physical barriers. Sampled on nearby mapped surfaces for a target your size.',
  hearing:
    'Hearing · dashed amber. Clear speech → Partial speech → Indistinct speech → Inaudible. Reference: normal-volume speech from someone your size. Uses your hearing, background sound, distance and barrier attenuation. Sampled on nearby mapped surfaces.',
} as const;

export function perceptionFieldKey(view: GameView, options: PerceptionOptions): string {
  return JSON.stringify([
    view.worldId,
    view.saveTimeline,
    view.access?.scope,
    view.player.id,
    view.map.seed,
    view.map.width,
    view.map.height,
    view.map.spatial.revision,
    view.player.position,
    view.player.supportSurfaceId,
    view.vision,
    view.hearing,
    options,
  ]);
}

export function perceptionField(view: GameView, options: PerceptionOptions): GuideContour[] {
  // This provider explicitly discloses starter geometry. Never infer undiscovered topology.
  if (view.map.spatial.disclosure !== 'public') return [];
  type Edge = { point: WorldPoint; direction: 'in' | 'out' };
  const contours: Array<GuideContour & { radius: number; edges: Edge[][] }> = [];
  if (options.vision && view.vision.enabled && view.vision.radius > 0)
    for (const [band, radius] of [
      view.vision.radius * VISION_FOCUS.clearFraction,
      view.vision.radius,
    ].entries())
      contours.push({
        sense: 'vision',
        band,
        radius,
        label:
          band === 0
            ? 'Vision · Clear sight / Reduced detail (visual guide)'
            : 'Vision · Reduced detail / Outside sight range',
        points: [],
        segments: [],
        edges: [],
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
          label:
            [
              'Hearing · Clear speech / Partial speech',
              'Hearing · Partial speech / Indistinct speech',
              'Hearing · Indistinct speech / Inaudible',
            ][band] + ' · normal-volume speech',
          points: [],
          segments: [],
          edges: [],
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
  for (let ray = 0; ray < GUIDE_SAMPLING.rays; ray++) {
    const angle = (ray * Math.PI * 2) / GUIDE_SAMPLING.rays;
    const dx = Math.cos(angle),
      dz = Math.sin(angle);
    const samples = new Map<number, WorldPoint | null>();
    const at = (distance: number) => {
      if (!samples.has(distance))
        samples.set(distance, footAt(origin.x + dx * distance, origin.z + dz * distance));
      return samples.get(distance)!;
    };
    for (const contour of contours) {
      // A support edge can hide nearby ground while farther ground is visible.
      // Retain every sampled transition, not a single star-shaped first-hit field.
      const edges: Edge[] = [];
      let previousDistance = 0,
        inside = passes(contour, origin);
      const step = maximum / GUIDE_SAMPLING.steps;
      for (let index = 1; index <= GUIDE_SAMPLING.steps; index++) {
        const distance = Math.min(index * step, contour.radius);
        const foot = at(distance);
        // A map edge is not a sensory threshold; never draw an invented boundary.
        if (!foot) break;
        const nextInside = passes(contour, foot);
        if (inside !== nextInside) {
          let low = previousDistance,
            high = distance;
          for (let refinement = 0; refinement < GUIDE_SAMPLING.refinements; refinement++) {
            const mid = (low + high) / 2,
              sample = at(mid);
            if (sample && passes(contour, sample) === inside) low = mid;
            else high = mid;
          }
          const point = at(inside ? low : high);
          if (point) edges.push({ point, direction: inside ? 'out' : 'in' });
        }
        inside = nextInside;
        previousDistance = distance;
        if (distance === contour.radius) {
          if (inside) edges.push({ point: foot, direction: 'out' });
          break;
        }
      }
      contour.edges.push(edges);
      contour.points.push(edges.at(-1)?.point ?? null);
    }
  }
  for (const contour of contours) {
    contour.segments = guideSegments(contour.edges, (a, b) => {
      // Validate the chord as well as radial endpoints. A sampled wall corner or
      // support edge must leave a gap instead of a misleading bridge.
      for (const t of [0.25, 0.5, 0.75]) {
        const point = {
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t,
          z: a.z + (b.z - a.z) * t,
        };
        const support = footAt(point.x, point.z);
        if (!support || Math.abs(support.y - point.y) > 0.05 || !passes(contour, point))
          return false;
      }
      return (
        contour.sense !== 'vision' ||
        clearSegment(
          map,
          { ...a, y: a.y + view.vision.eyeHeight },
          { ...b, y: b.y + view.vision.eyeHeight },
        )
      );
    });
  }
  return contours.map(({ radius: _radius, edges: _edges, ...contour }) => contour);
}

/** Match nearby boundaries of the same crossing direction; support and native
 * checks below leave gaps at ambiguous corners instead of joining unseen regions. */
function guideSegments(
  edges: Array<Array<{ point: WorldPoint; direction: 'in' | 'out' }>>,
  valid: (a: WorldPoint, b: WorldPoint) => boolean,
): Array<[WorldPoint, WorldPoint]> {
  const segments: Array<[WorldPoint, WorldPoint]> = [];
  for (let index = 0; index < edges.length; index++) {
    const next = edges[(index + 1) % edges.length]!;
    const used = new Set<number>();
    for (const edge of edges[index]!) {
      let nearest = 3,
        match = -1;
      for (const [candidate, other] of next.entries()) {
        if (used.has(candidate) || edge.direction !== other.direction) continue;
        const separation = distance3D(edge.point, other.point);
        if (separation < nearest) {
          nearest = separation;
          match = candidate;
        }
      }
      if (match < 0) continue;
      const a = edge.point,
        b = next[match]!.point;
      if (Math.abs(a.y - b.y) > Math.hypot(a.x - b.x, a.z - b.z) + 0.05 || !valid(a, b)) continue;
      used.add(match);
      segments.push([a, b]);
    }
  }
  return segments;
}
