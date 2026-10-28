import {
  BoundsIndex,
  bodySurfaceDistance,
  type Bounds3,
  type BoundsQueryCursor,
} from '@open-legend/spatial';
import {
  currentBodyGeometryInputs,
  currentReceivedObservationSources,
  type BodyGeometrySample,
  type CurrentBodyGeometryInput,
  type LocationGeometrySample,
  type ObservedBody,
} from './perception-evidence.js';
import { entityGet } from './entity-collection.js';
import { readOnlyDraftView } from './draft.js';
import type { Position, WorldState } from './types.js';

export interface ReceivedBodyGeometry {
  body: ObservedBody;
  sample: Pick<BodyGeometrySample, 'valueMeasuredFrom' | 'valueMeasuredThrough'>;
  location?: Omit<LocationGeometrySample, 'fact'>;
  motion?: {
    earlier: Omit<LocationGeometrySample, 'fact'>;
    later: Omit<LocationGeometrySample, 'fact'>;
  };
}
export interface ReceivedSceneBody extends CurrentBodyGeometryInput {
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
  const previous = Object.isFrozen(world) ? cached.get(world)?.get(observerId) : undefined;
  if (
    previous &&
    previous.observerId === observerId &&
    previous.physicalLife ===
      (entityGet(readOnlyDraftView(world.entities), observerId)?.actor?.physicalLife ?? 0)
  )
    return previous;
  const reception = currentReceivedObservationSources(world, observerId);
  const physicalLife = reception.physicalLife;
  const bodies = new Map<string, ReceivedSceneBody>();
  let nonlocalized = 0;
  for (const input of currentBodyGeometryInputs(world, observerId)) {
    const error =
      input.location?.location.kind === 'point' ? input.location.location.errorRadius : 0;
    bodies.set(input.sourceId, {
      ...input,
      bounds: receivedBodyBounds(input.body, error),
    });
  }
  // This coverage count needs only the admitted facet kinds. Expanding complete
  // originals would copy body/history proof that no scene measurement consumes.
  for (const contribution of reception.observations) {
    const facets = readOnlyDraftView(readOnlyDraftView(contribution).facets);
    if (
      facets.some((facet) => readOnlyDraftView(facet).value.kind === 'sound') &&
      !facets.some((facet) => readOnlyDraftView(facet).value.kind === 'location')
    )
      nonlocalized++;
  }
  let index: ReceivedScene['index'] | undefined;
  const scene: ReceivedScene = {
    observerId,
    physicalLife,
    bodies,
    // Native relation checks visit a bounded array. Prepare the spatial tree
    // only for readers that actually ask this same received scene for a query.
    get index() {
      return (index ??= new BoundsIndex(
        [...bodies.values()].map((value) => ({ value, bounds: value.bounds })),
      ));
    },
    nonlocalized,
  };
  if (Object.isFrozen(world)) {
    let byActor = cached.get(world);
    if (!byActor) cached.set(world, (byActor = new Map()));
    byActor.set(observerId, scene);
  }
  return scene;
}

/** Full received body extent, expanded only by the supplied measurement error. */
export function receivedBodyBounds(body: ObservedBody, error = 0): Bounds3 {
  const point = body.position;
  return {
    min: { x: point.x - body.radius - error, y: point.y - error, z: point.z - body.radius - error },
    max: {
      x: point.x + body.radius + error,
      y: point.y + body.height + error,
      z: point.z + body.radius + error,
    },
  };
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
  body: ReceivedBodyGeometry,
  at: number,
): { point: Position; error: number } | undefined {
  const location = body.location;
  if (
    location?.location.kind === 'point' &&
    at >= location.valueMeasuredFrom &&
    at <= location.valueMeasuredThrough
  )
    return { point: location.location.point, error: location.location.errorRadius };
  for (const sample of body.motion ? [body.motion.earlier, body.motion.later] : [])
    if (
      sample.location.kind === 'point' &&
      at >= sample.valueMeasuredFrom &&
      at <= sample.valueMeasuredThrough
    )
      return { point: sample.location.point, error: sample.location.errorRadius };
  // The body producer's actually measured unchanged interval can support a stationary
  // participant while a neighbor moves; contact continuity alone cannot do so.
  if (at >= body.sample.valueMeasuredFrom && at <= body.sample.valueMeasuredThrough)
    return {
      point: body.body.position,
      error: location?.location.kind === 'point' ? location.location.errorRadius : 0,
    };
  return undefined;
}

export function receivedSeparation(
  first: ReceivedBodyGeometry,
  second: ReceivedBodyGeometry,
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
