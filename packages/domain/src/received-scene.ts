import {
  BoundsIndex,
  bodySurfaceDistance,
  type Bounds3,
  type BoundsQueryCursor,
} from '@open-legend/spatial';
import {
  captureCurrentFacet,
  currentBodyObservation,
  effectiveCurrentFacetSupport,
  type CapturedCurrentFacet,
  type CapturedLocationSample,
  type ObservedBody,
} from './perception-evidence.js';
import { cloneValue } from './draft.js';
import type { Position, WorldState } from './types.js';

export interface ReceivedSceneBody {
  /** Private routing; ordinary context replaces this with a decision-scoped reference. */
  sourceId: string;
  exposure: string;
  body: ObservedBody;
  sample: CapturedCurrentFacet;
  location?: CapturedLocationSample;
  motion?: Extract<CapturedCurrentFacet['value'], { kind: 'observed-motion' }>;
  bounds: Bounds3;
}

export interface ReceivedScene {
  observerId: string;
  physicalLife: number;
  bodies: ReadonlyMap<string, ReceivedSceneBody>;
  index: BoundsIndex<ReceivedSceneBody>;
  nonlocalized: number;
}
const cached = new WeakMap<WorldState, Map<string, ReceivedScene>>();

/** Derived only when a reader actually needs scene context. This never polls a
 * target transform or keeps a second writable position. */
export function receivedScene(world: WorldState, observerId: string): ReceivedScene {
  const owner = world.perceptionEvidence?.[observerId];
  const key = owner?.current;
  const previous = Object.isFrozen(world) ? cached.get(world)?.get(observerId) : undefined;
  if (previous && previous.observerId === observerId && previous.physicalLife === owner!.life)
    return previous;
  const bodies = new Map<string, ReceivedSceneBody>();
  let nonlocalized = 0;
  for (const lease of Object.values(key ?? {})) {
    if (lease.value.kind !== 'body' || lease.subjectId === observerId) continue;
    const admitted = currentBodyObservation(world, observerId, lease.subjectId);
    if (!admitted) continue;
    const body = cloneValue(admitted.value.body),
      point = body.position;
    const location = key?.[`${lease.subjectId}:location`];
    const error =
      location?.value.kind === 'location' && location.value.location.kind === 'point'
        ? location.value.location.errorRadius
        : 0;
    const motion = key?.[`${lease.subjectId}:observed-motion`]?.value;
    bodies.set(lease.subjectId, {
      sourceId: lease.subjectId,
      exposure: lease.exposure.episodeId,
      body,
      sample: admitted,
      ...(location?.value.kind === 'location'
        ? {
            location: captureCurrentFacet(
              effectiveCurrentFacetSupport(world, observerId, location),
            ) as CapturedLocationSample,
          }
        : {}),
      ...(motion?.kind === 'observed-motion' ? { motion: cloneValue(motion) } : {}),
      bounds: {
        min: {
          x: point.x - body.radius - error,
          y: point.y - error,
          z: point.z - body.radius - error,
        },
        max: {
          x: point.x + body.radius + error,
          y: point.y + body.height + error,
          z: point.z + body.radius + error,
        },
      },
    });
  }
  for (const contribution of owner?.received ?? [])
    if (
      contribution.facets.some((facet) => facet.value.kind === 'sound') &&
      !contribution.facets.some((facet) => facet.value.kind === 'location')
    )
      nonlocalized++;
  const scene: ReceivedScene = {
    observerId,
    physicalLife: owner?.life ?? 0,
    bodies,
    index: new BoundsIndex([...bodies.values()].map((value) => ({ value, bounds: value.bounds }))),
    nonlocalized,
  };
  if (Object.isFrozen(world)) {
    let byActor = cached.get(world);
    if (!byActor) cached.set(world, (byActor = new Map()));
    byActor.set(observerId, scene);
  }
  return scene;
}

export const receivedBoundsIntersect = (a: Bounds3, b: Bounds3) =>
  a.min.x <= b.max.x &&
  a.max.x >= b.min.x &&
  a.min.y <= b.max.y &&
  a.max.y >= b.min.y &&
  a.min.z <= b.max.z &&
  a.max.z >= b.min.z;
export function receivedNear(
  scene: ReceivedScene,
  anchor: ReceivedSceneBody,
  radius: number,
  visits: number,
  cursor?: BoundsQueryCursor,
) {
  const bounds: Bounds3 = {
    min: {
      x: anchor.bounds.min.x - radius,
      y: anchor.bounds.min.y - radius,
      z: anchor.bounds.min.z - radius,
    },
    max: {
      x: anchor.bounds.max.x + radius,
      y: anchor.bounds.max.y + radius,
      z: anchor.bounds.max.z + radius,
    },
  };
  const found = scene.index.query(
    (candidate) => receivedBoundsIntersect(bounds, candidate),
    visits,
    cursor,
  );
  return { ...found, values: found.values.filter((body) => body.sourceId !== anchor.sourceId) };
}

function measuredPoint(
  body: ReceivedSceneBody,
  at: number,
): { point: Position; error: number } | undefined {
  const location = body.location;
  if (
    location?.value.location.kind === 'point' &&
    at >= location.valueMeasuredFrom &&
    at <= location.valueMeasuredThrough
  )
    return { point: location.value.location.point, error: location.value.location.errorRadius };
  for (const sample of body.motion ? [body.motion.earlier, body.motion.later] : [])
    if (
      sample.value.location.kind === 'point' &&
      at >= sample.valueMeasuredFrom &&
      at <= sample.valueMeasuredThrough
    )
      return { point: sample.value.location.point, error: sample.value.location.errorRadius };
  // The body producer's actually measured unchanged interval can support a stationary
  // participant while a neighbor moves; contact continuity alone cannot do so.
  if (at >= body.sample.valueMeasuredFrom && at <= body.sample.valueMeasuredThrough)
    return {
      point: body.body.position,
      error: location?.value.location.kind === 'point' ? location.value.location.errorRadius : 0,
    };
  return undefined;
}

export function receivedSeparation(
  first: ReceivedSceneBody,
  second: ReceivedSceneBody,
): {
  status: 'complete' | 'unavailable';
  at?: number;
  lower?: number;
  upper?: number;
  decreaseLower?: number;
} {
  const at = Math.min(first.sample.valueMeasuredThrough, second.sample.valueMeasuredThrough);
  const a = measuredPoint(first, at),
    b = measuredPoint(second, at);
  if (!a || !b) return { status: 'unavailable' };
  const distance = bodySurfaceDistance(a.point, first.body, b.point, second.body),
    error = a.error + b.error;
  const constantFrom = Math.max(first.sample.valueMeasuredFrom, second.sample.valueMeasuredFrom);
  const earlierTimes = [
    ...new Set([
      first.motion?.earlier.valueMeasuredThrough,
      second.motion?.earlier.valueMeasuredThrough,
      ...(constantFrom < at ? [constantFrom] : []),
    ]),
  ]
    .filter((time): time is number => time !== undefined && time < at)
    .sort((x, y) => y - x);
  let decreaseLower: number | undefined;
  for (const time of earlierTimes) {
    const beforeA = measuredPoint(first, time),
      beforeB = measuredPoint(second, time);
    if (!beforeA || !beforeB) continue;
    decreaseLower =
      bodySurfaceDistance(beforeA.point, first.body, beforeB.point, second.body) -
      beforeA.error -
      beforeB.error -
      distance -
      error;
    break;
  }
  return {
    status: 'complete',
    at,
    lower: Math.max(0, distance - error),
    upper: Math.max(0, distance + error),
    ...(decreaseLower !== undefined ? { decreaseLower } : {}),
  };
}
