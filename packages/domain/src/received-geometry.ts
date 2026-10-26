import {
  BoundsIndex,
  clearConvexView,
  distance3D,
  movingBodiesMinimumSeparation,
  querySurfacesInBounds,
  surfaceById,
  surfaceHeight,
  surfaceSupportsRectangle,
  type Bounds3,
  type BoundsQueryCursor,
  type SpatialMap,
  type WalkableSurface,
} from '@open-legend/spatial';
import { entityGet } from './entity-collection.js';
import { bodyProfile, spatialMap, worldPosition } from './spatial-state.js';
import { activelyParticipates } from './participation-state.js';
import { visionRadius, sensesFor } from './perception.js';
import {
  acquireObservation,
  observationFactKey,
  validateObservationContribution,
  type ObservationContribution,
  type ObservationFactKey,
  type ObservationFrame,
} from './perception-evidence.js';
import {
  applyAttentionRelationEvaluations,
  attentionRelationOpportunity,
  markAttentionRelationsDirty,
  type AttentionRelationEvaluation,
  type AttentionRelationWitness,
} from './attention.js';
import {
  receivedScene,
  receivedSeparation,
  type ReceivedSceneBody,
} from './received-scene.js';
import { selectedAttentionPolicy } from './world-composition.js';
import { validPerceivedPoint, validateEvidenceSource } from './perception-values.js';
import { cloneValue } from './draft.js';
import { personalFactAlias } from './experience-source.js';
import type { Position, WorldState } from './types.js';

type Quad<T> = [T, T, T, T];
export interface ObservedSurfacePatch {
  vertices: Quad<Position>;
  normal: Position;
  errorRadius: number;
  edges: Quad<'coverage-limit' | 'physical-boundary'>;
  frame: ObservationFrame;
}
export interface ObservedBoundary {
  a: Position;
  b: Position;
  errorRadius: number;
  nearSurface: { point: Position; normal: Position; support: ObservationFactKey };
  farSurface: { point: Position; normal: Position; support: ObservationFactKey };
  /** Signed vertical height decrease, already reduced by both measurement errors. */
  dropLower: number;
}
interface Rectangle {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}
interface PendingPatch extends Rectangle {
  surfaceId: string;
}
interface GeometryFragment extends PendingPatch {
  key: string;
  observation: ObservationContribution;
}
export interface ReceivedGeometryState {
  basis: string;
  frame: ObservationFrame;
  eye: Position;
  radius: number;
  geometryRevision: number;
  supportedThrough: number;
  generation: number;
  nextAt: number;
  pending: PendingPatch[];
  surfaceCursor?: BoundsQueryCursor;
  surfacesComplete: boolean;
  fragments: GeometryFragment[];
  boundaries: ObservationContribution[];
  boundaryKeys: string[];
  boundaryCursor: number;
  boundaryChecked: number;
  finished: boolean;
  complete: boolean;
  unrepresented: boolean;
  visited: number;
}
const epsilon = 1e-8;
const rectangleKey = (rectangle: PendingPatch) =>
  JSON.stringify([
    rectangle.surfaceId,
    rectangle.minX,
    rectangle.maxX,
    rectangle.minZ,
    rectangle.maxZ,
  ]);
const patchFacet = (fragment: GeometryFragment) => fragment.observation.facets[0]!.value;
const intersects = (a: Bounds3, b: Bounds3) =>
  a.min.x <= b.max.x &&
  a.max.x >= b.min.x &&
  a.min.y <= b.max.y &&
  a.max.y >= b.min.y &&
  a.min.z <= b.max.z &&
  a.max.z >= b.min.z;
function receptor(world: WorldState, observerId: string) {
  const observer = entityGet(world.entities, observerId);
  if (!observer?.actor?.alive || !activelyParticipates(observer)) return;
  const detector = sensesFor(world, observer).find(
    (sense) => sense.implementation === 'vision-geometry-v1',
  );
  const radius = visionRadius(world, observer);
  if (!detector || radius <= 0) return;
  const p = worldPosition(observer),
    eye = { x: p.x, y: p.y + bodyProfile(observer).eyeHeight, z: p.z };
  const map = spatialMap(world),
    policy = selectedAttentionPolicy(world);
  const basis = JSON.stringify([
    observer.actor.physicalLife ?? 0,
    map.spatial.revision,
    eye.x,
    eye.y,
    eye.z,
    radius,
    detector.id,
    detector.version,
    policy.id,
    policy.version,
  ]);
  return {
    observer,
    detector,
    radius,
    eye,
    map,
    basis,
    frame: { positionAtObservation: { ...p }, forwardAtObservation: observer.spatial.heading },
  };
}
function boundsAround(point: Position, radius: number): Bounds3 {
  return {
    min: { x: point.x - radius, y: point.y - radius, z: point.z - radius },
    max: { x: point.x + radius, y: point.y + radius, z: point.z + radius },
  };
}
function vertices(surface: WalkableSurface, rectangle: Rectangle): Quad<Position> {
  return [
    [rectangle.minX, rectangle.minZ],
    [rectangle.maxX, rectangle.minZ],
    [rectangle.maxX, rectangle.maxZ],
    [rectangle.minX, rectangle.maxZ],
  ].map(([x, z]) => ({ x: x!, z: z!, y: surfaceHeight(surface, x!, z!) })) as Quad<Position>;
}
function normal(surface: WalkableSurface): Position {
  const length = Math.hypot(surface.slopeX, 1, surface.slopeZ);
  return { x: -surface.slopeX / length, y: 1 / length, z: -surface.slopeZ / length };
}
function priority(patch: Rectangle, eye: Position): number {
  return (
    Math.max(patch.minX - eye.x, eye.x - patch.maxX, 0) ** 2 +
    Math.max(patch.minZ - eye.z, eye.z - patch.maxZ, 0) ** 2
  );
}
function split(patch: PendingPatch): [PendingPatch, PendingPatch] {
  if (patch.maxX - patch.minX >= patch.maxZ - patch.minZ) {
    const middle = (patch.minX + patch.maxX) / 2;
    return [
      { ...patch, maxX: middle },
      { ...patch, minX: middle },
    ];
  }
  const middle = (patch.minZ + patch.maxZ) / 2;
  return [
    { ...patch, maxZ: middle },
    { ...patch, minZ: middle },
  ];
}
function patchBounds(fragment: GeometryFragment): Bounds3 {
  const value = patchFacet(fragment);
  if (value.kind !== 'surface-patch') throw new Error('Invalid native surface fragment.');
  return {
    min: {
      x: fragment.minX,
      y: Math.min(...value.patch.vertices.map((p) => p.y)),
      z: fragment.minZ,
    },
    max: {
      x: fragment.maxX,
      y: Math.max(...value.patch.vertices.map((p) => p.y)),
      z: fragment.maxZ,
    },
  };
}
function emit(
  world: WorldState,
  input: NonNullable<ReturnType<typeof receptor>>,
  kind: 'surface-patch' | 'physical-boundary',
  value: ObservedSurfacePatch | ObservedBoundary,
  key: string,
): ObservationContribution {
  const facet =
    kind === 'surface-patch'
      ? { kind, patch: value as ObservedSurfacePatch }
      : { kind, boundary: value as ObservedBoundary };
  return acquireObservation(world, input.observer, {
    origin: {
      kind: 'exposure',
      episodeId: JSON.stringify(['geometry', input.basis]),
      detectorId: JSON.stringify([kind, key]),
      measuredFrom: world.simTime,
      measuredThrough: world.simTime,
    },
    modality: 'sight',
    detector: { id: input.detector.id, version: input.detector.version },
    facets: [
      {
        role: 'direct',
        asOf: world.simTime,
        measuredFrom: world.simTime,
        measuredThrough: world.simTime,
        value: facet,
      },
    ],
  });
}
function surfaceRectangle(
  surface: WalkableSurface,
  eye: Position,
  radius: number,
): PendingPatch | undefined {
  const rectangle = {
    surfaceId: surface.id,
    minX: Math.max(surface.minX, eye.x - radius),
    maxX: Math.min(surface.maxX, eye.x + radius),
    minZ: Math.max(surface.minZ, eye.z - radius),
    maxZ: Math.min(surface.maxZ, eye.z + radius),
  };
  return rectangle.maxX > rectangle.minX && rectangle.maxZ > rectangle.minZ ? rectangle : undefined;
}
function actualEdges(
  fragment: GeometryFragment,
  surface: WalkableSurface,
): Array<{ edge: number; a: Position; b: Position; outside: (far: GeometryFragment) => boolean }> {
  const facet = patchFacet(fragment);
  if (facet.kind !== 'surface-patch') return [];
  const p = facet.patch.vertices;
  return [
    ...(Math.abs(fragment.minZ - surface.minZ) <= epsilon
      ? [
          {
            edge: 0,
            a: p[0],
            b: p[1],
            outside: (far: GeometryFragment) =>
              Math.abs(far.maxZ - fragment.minZ) <= epsilon,
          },
        ]
      : []),
    ...(Math.abs(fragment.maxX - surface.maxX) <= epsilon
      ? [
          {
            edge: 1,
            a: p[1],
            b: p[2],
            outside: (far: GeometryFragment) =>
              Math.abs(far.minX - fragment.maxX) <= epsilon,
          },
        ]
      : []),
    ...(Math.abs(fragment.maxZ - surface.maxZ) <= epsilon
      ? [
          {
            edge: 2,
            a: p[2],
            b: p[3],
            outside: (far: GeometryFragment) =>
              Math.abs(far.minZ - fragment.maxZ) <= epsilon,
          },
        ]
      : []),
    ...(Math.abs(fragment.minX - surface.minX) <= epsilon
      ? [
          {
            edge: 3,
            a: p[3],
            b: p[0],
            outside: (far: GeometryFragment) =>
              Math.abs(far.maxX - fragment.minX) <= epsilon,
          },
        ]
      : []),
  ];
}
function sharedEdge(a: Position, b: Position, far: GeometryFragment): [Position, Position] | undefined {
  const axis = Math.abs(a.x - b.x) > epsilon ? 'x' : 'z';
  const low = Math.max(Math.min(a[axis], b[axis]), axis === 'x' ? far.minX : far.minZ);
  const high = Math.min(Math.max(a[axis], b[axis]), axis === 'x' ? far.maxX : far.maxZ);
  if (high - low <= epsilon) return;
  const at = (value: number): Position => { const fraction = (value - a[axis]) / (b[axis] - a[axis]); return { x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction, z: a.z + (b.z - a.z) * fraction }; };
  return [at(low), at(high)];
}

/** A finite native source over supported planar geometry. Each admitted rectangle's
 * entire ray hull is certified; occlusion/range fringes stay unknown. All tuning is
 * selected world data. No place names or hidden topology enter the received facet. */
export function refreshReceivedGeometry(
  world: WorldState,
  observerId: string,
): { acquired: ObservationContribution[]; changed: boolean } {
  const input = receptor(world, observerId),
    owner = world.perceptionEvidence?.[observerId];
  if (!input || !owner) {
    if (owner?.geometry) {
      delete owner.geometry;
      markAttentionRelationsDirty(world, observerId);
      return { acquired: [], changed: true };
    }
    return { acquired: [], changed: false };
  }
  const policy = selectedAttentionPolicy(world).geometry,
    acquired: ObservationContribution[] = [];
  let state = owner.geometry,
    changed = false;
  if (!state || state.basis !== input.basis) {
    const nextAt = state?.nextAt ?? 0;
    state = owner.geometry = {
      basis: input.basis,
      frame: input.frame,
      eye: input.eye,
      radius: input.radius,
      geometryRevision: input.map.spatial.revision,
      supportedThrough: world.simTime,
      generation: 0,
      nextAt,
      pending: [],
      surfacesComplete: false,
      fragments: [],
      boundaries: [],
      boundaryKeys: [],
      boundaryCursor: 0,
      boundaryChecked: 0,
      finished: false,
      complete: false,
      unrepresented: false,
      visited: 0,
    };
    changed = true;
  }
  // This is the actual native receiver phase. Unchanged eye, material and shape
  // dependencies certify a static region without inventing another receipt.
  state.supportedThrough = world.simTime;
  if (
    world.simTime < state.nextAt ||
    state.finished ||
    state.fragments.length + state.boundaries.length >= policy.maxFragments
  ) {
    if (changed) markAttentionRelationsDirty(world, observerId);
    return { acquired, changed };
  }
  state.nextAt = world.simTime + policy.intervalSeconds;
  let indexVisits = 0,
    patchVisits = 0;
  const enqueue = (patches: PendingPatch[]) => {
    for (const patch of patches) {
      if (state.pending.length < policy.preparationPatches) state.pending.push(patch);
      else state.unrepresented = true;
    }
  };
  if (!state.surfacesComplete) {
    const result = querySurfacesInBounds(
      input.map,
      boundsAround(input.eye, input.radius),
      policy.indexVisits,
      state.surfaceCursor,
    );
    indexVisits += result.visited;
    state.surfaceCursor = result.cursor;
    state.surfacesComplete = result.status === 'complete';
    for (const surface of result.values) {
      const rectangle = surfaceRectangle(surface, input.eye, input.radius);
      if (rectangle) enqueue([rectangle]);
    }
  }
  while (
    patchVisits < policy.patchVisits &&
    state.pending.length &&
    state.fragments.length + state.boundaries.length < policy.maxFragments
  ) {
    let nearest = 0;
    for (let index = 1; index < state.pending.length; index++)
      if (priority(state.pending[index]!, input.eye) < priority(state.pending[nearest]!, input.eye))
        nearest = index;
    const [rectangle] = state.pending.splice(nearest, 1);
    const surface = surfaceById(input.map, rectangle!.surfaceId);
    patchVisits++;
    if (!surface) {
      state.unrepresented = true;
      continue;
    }
    const width = rectangle!.maxX - rectangle!.minX,
      depth = rectangle!.maxZ - rectangle!.minZ;
    const points = vertices(surface, rectangle!);
    const facing = input.eye.y - surfaceHeight(surface, input.eye.x, input.eye.z) > epsilon;
    if (!facing) { state.unrepresented = true; continue; }
    const inRange = points.every((point) => distance3D(input.eye, point) <= input.radius);
    const visible =
      inRange &&
      surfaceSupportsRectangle(input.map, surface, rectangle!) &&
      clearConvexView(input.map, input.eye, points);
    if (!visible) {
      if (Math.max(width, depth) > (inRange ? policy.errorMetres * 2 : policy.patchMetres)) enqueue(split(rectangle!));
      else state.unrepresented = true;
      continue;
    }
    const key = rectangleKey(rectangle!);
    const observation = emit(
      world,
      input,
      'surface-patch',
      {
        vertices: points,
        normal: normal(surface),
        errorRadius: policy.errorMetres,
        edges: ['coverage-limit', 'coverage-limit', 'coverage-limit', 'coverage-limit'],
        frame: cloneValue(input.frame),
      },
      JSON.stringify([state.generation, key]),
    );
    state.fragments.push({ ...rectangle!, key, observation });
    state.boundaryChecked = 0;
    acquired.push(observation);
  }
  // Pair only received adjacent patches. A clipped/occluded edge never invents a
  // drop; an unseen far side remains unknown even if the physical map knows it.
  const ordered = [...state.fragments].sort((a, b) => a.key.localeCompare(b.key));
  const edges = ordered.flatMap((fragment) => {
    const surface = surfaceById(input.map, fragment.surfaceId);
    return surface ? actualEdges(fragment, surface).map((edge) => ({ fragment, edge })) : [];
  });
  const index = new BoundsIndex(
    ordered.map((fragment) => ({ value: fragment, bounds: patchBounds(fragment) })),
  );
  let checked = 0;
  while (
    edges.length &&
    state.boundaryChecked < edges.length &&
    checked < edges.length &&
    indexVisits < policy.indexVisits &&
    state.fragments.length + state.boundaries.length < policy.maxFragments
  ) {
    const at = state.boundaryCursor % edges.length,
      { fragment, edge } = edges[at]!;
    state.boundaryCursor = (at + 1) % edges.length;
    checked++;
    state.boundaryChecked++;
    const b: Bounds3 = {
      min: {
        x: Math.min(edge.a.x, edge.b.x) - epsilon,
        y: input.eye.y - input.radius,
        z: Math.min(edge.a.z, edge.b.z) - epsilon,
      },
      max: {
        x: Math.max(edge.a.x, edge.b.x) + epsilon,
        y: input.eye.y + input.radius,
        z: Math.max(edge.a.z, edge.b.z) + epsilon,
      },
    };
    const result = index.query((bounds) => intersects(b, bounds), policy.indexVisits - indexVisits);
    indexVisits += result.visited;
    if (result.status === 'partial') state.unrepresented = true;
    for (const far of result.values) {
      if (far.surfaceId === fragment.surfaceId || !edge.outside(far)) continue;
      const overlap = sharedEdge(edge.a, edge.b, far);
      if (!overlap) continue;
      const [a, b] = overlap;
      const nearValue = patchFacet(fragment),
        farValue = patchFacet(far);
      if (nearValue.kind !== 'surface-patch' || farValue.kind !== 'surface-patch') continue;
      const farSurface = surfaceById(input.map, far.surfaceId);
      if (!farSurface) continue;
      const middle = {
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
        z: (a.z + b.z) / 2,
      };
      const farPoint = { ...middle, y: surfaceHeight(farSurface, middle.x, middle.z) };
      const lower =
        Math.min(
          a.y - surfaceHeight(farSurface, a.x, a.z),
          b.y - surfaceHeight(farSurface, b.x, b.z),
        ) -
        nearValue.patch.errorRadius -
        farValue.patch.errorRadius;
      if (lower <= 0) continue;
      const key = JSON.stringify([fragment.key, edge.edge, far.key]);
      if (state.boundaryKeys.includes(key)) continue;
      const observation = emit(
        world,
        input,
        'physical-boundary',
        {
          a,
          b,
          errorRadius: policy.errorMetres,
          nearSurface: {
            point: middle,
            normal: nearValue.patch.normal,
            support: observationFactKey(fragment.observation, 0),
          },
          farSurface: {
            point: farPoint,
            normal: farValue.patch.normal,
            support: observationFactKey(far.observation, 0),
          },
          dropLower: lower,
        },
        JSON.stringify([state.generation, key]),
      );
      state.boundaries.push(observation);
      state.boundaryKeys.push(key);
      acquired.push(observation);
    }
  }
  state.visited = indexVisits + patchVisits;
  state.finished =
    (state.surfacesComplete && !state.pending.length && state.boundaryChecked >= edges.length) ||
    state.fragments.length + state.boundaries.length >= policy.maxFragments;
  state.complete =
    state.finished && !state.pending.length && state.surfacesComplete && !state.unrepresented;
  if (acquired.length || changed) {
    changed = true;
    markAttentionRelationsDirty(world, observerId);
  }
  return { acquired, changed };
}

/** Pure current read: changed eye/range/geometry immediately removes stale grants
 * even before the bounded physical source gets its next native opportunity. */
export function currentReceivedGeometry(
  world: WorldState,
  observerId: string,
): {
  observations: readonly ObservationContribution[];
  complete: boolean;
  visited: number;
  supportedThrough: number;
} {
  const input = receptor(world, observerId),
    state = world.perceptionEvidence?.[observerId]?.geometry;
  return input && state?.basis === input.basis
    ? {
        observations: [
          ...state.fragments.map((fragment) => fragment.observation),
          ...state.boundaries,
        ],
        complete: state.complete,
        visited: state.visited,
        supportedThrough: state.supportedThrough,
      }
    : { observations: [], complete: false, visited: 0, supportedThrough: 0 };
}

/** Existing personal-source correction removes the same received permission.
 * Re-measuring later creates a new original, never revives the revoked one. */
export function revokeReceivedGeometryEvidence(
  world: WorldState,
  observerId: string,
  affected: ReadonlySet<string>,
): void {
  const state = world.perceptionEvidence?.[observerId]?.geometry;
  if (!state) return;
  const revoked = (id: string, ordinal = 0) =>
    affected.has(id) ||
    affected.has(`awareness:${id}`) ||
    affected.has(`memory:${id}`) ||
    affected.has(`summary:${id}`) ||
    affected.has(personalFactAlias(id, ordinal));
  const removed = state.fragments.filter((fragment) => revoked(fragment.observation.id));
  const removedIds = new Set(removed.map((fragment) => fragment.observation.id));
  const retainedBoundaries = state.boundaries.filter((observation) => {
    const value = observation.facets[0]?.value;
    return (
      !revoked(observation.id) &&
      value?.kind === 'physical-boundary' &&
      !removedIds.has(value.boundary.nearSurface.support.source.id) &&
      !removedIds.has(value.boundary.farSurface.support.source.id) &&
      !revoked(
        value.boundary.nearSurface.support.source.id,
        value.boundary.nearSurface.support.ordinal,
      ) &&
      !revoked(
        value.boundary.farSurface.support.source.id,
        value.boundary.farSurface.support.ordinal,
      )
    );
  });
  if (!removed.length && retainedBoundaries.length === state.boundaries.length) return;
  const retainedIds = new Set(retainedBoundaries.map((value) => value.id));
  state.boundaryKeys = state.boundaryKeys.filter((_, ordinal) =>
    retainedIds.has(state.boundaries[ordinal]!.id),
  );
  state.boundaries = retainedBoundaries;
  state.fragments = state.fragments.filter((fragment) => !removedIds.has(fragment.observation.id));
  for (const fragment of removed)
    if (state.pending.length < selectedAttentionPolicy(world).geometry.preparationPatches)
      state.pending.push({
        surfaceId: fragment.surfaceId,
        minX: fragment.minX,
        maxX: fragment.maxX,
        minZ: fragment.minZ,
        maxZ: fragment.maxZ,
      });
  state.generation++;
  state.boundaryChecked = 0;
  state.finished = false;
  state.complete = false;
  markAttentionRelationsDirty(world, observerId);
}

function bodyProof(body: ReceivedSceneBody): ObservationFactKey[] {
  return [
    observationFactKey(body.sample.original, body.sample.originalOrdinal),
    ...(body.location
      ? [observationFactKey(body.location.original, body.location.originalOrdinal)]
      : []),
    ...(body.motion
      ? [
          observationFactKey(body.motion.earlier.original, body.motion.earlier.originalOrdinal),
          observationFactKey(body.motion.later.original, body.motion.later.originalOrdinal),
        ]
      : []),
  ];
}
export function receivedBoundarySeparation(
  anchor: ReceivedSceneBody,
  boundary: ObservedBoundary,
  measurement: { from: number; through: number },
): {
  status: 'complete' | 'unavailable';
  asOf?: number;
  lower?: number;
  upper?: number;
  decreaseLower?: number;
  dropLower?: number;
} {
  const at = Math.min(anchor.sample.valueMeasuredThrough, measurement.through);
  if (at < measurement.from) return { status: 'unavailable' };
  const sampleAt = (time: number) => {
    for (const sample of [anchor.location, anchor.motion?.earlier, anchor.motion?.later])
      if (
        sample?.value.location.kind === 'point' &&
        time >= sample.valueMeasuredFrom &&
        time <= sample.valueMeasuredThrough
      )
        return { point: sample.value.location.point, error: sample.value.location.errorRadius };
    return time >= anchor.sample.valueMeasuredFrom && time <= anchor.sample.valueMeasuredThrough
      ? { point: anchor.body.position, error: 0 }
      : undefined;
  };
  const current = sampleAt(at);
  if (!current) return { status: 'unavailable' };
  // The zero-size body is a geometric point traversing the segment for a minimum
  // distance calculation, not a claim that anything moved along that segment.
  const distance = (point: Position) =>
    movingBodiesMinimumSeparation(point, point, anchor.body, boundary.a, boundary.b, {
      radius: 0,
      height: 0,
    });
  const d = distance(current.point),
    error = current.error + boundary.errorRadius;
  const earlier = anchor.motion?.earlier;
  const before =
    earlier &&
    earlier.valueMeasuredThrough >= measurement.from &&
    earlier.valueMeasuredThrough < at &&
    sampleAt(earlier.valueMeasuredThrough);
  return {
    status: 'complete',
    asOf: at,
    lower: Math.max(0, d - error),
    upper: d + error,
    dropLower: boundary.dropLower,
    ...(before
      ? { decreaseLower: distance(before.point) - before.error - boundary.errorRadius - d - error }
      : {}),
  };
}
/** Native relation measurements use only the received scene. No hidden target
 * positions, intent or terrain are read after physical delivery. */
export function evaluateAttentionRelations(world: WorldState, observerId: string): void {
  const opportunity = attentionRelationOpportunity(world, observerId);
  if (!opportunity) return;
  const scene = receivedScene(world, observerId),
    geometry = currentReceivedGeometry(world, observerId),
    policy = selectedAttentionPolicy(world).relation;
  const boundaries = geometry.observations.flatMap((observation) =>
    observation.facets.flatMap((facet) =>
      facet.value.kind === 'physical-boundary'
        ? [{ observation, ordinal: facet.ordinal, boundary: facet.value.boundary }]
        : [],
    ),
  );
  const bodies = [...scene.bodies.values()];
  const bodyRevision = JSON.stringify(bodies.map((body) => [body.exposure, body.sample.original.id,
    body.sample.valueAcquiredAt, body.motion?.earlier.valueAcquiredAt]));
  const geometryRevision = JSON.stringify(boundaries.map((value) => value.observation.id));
  const bodiesByExposure = new Map(bodies.map((body) => [body.exposure, body]));
  const boundariesById = new Map(boundaries.map((value) => [value.observation.id, value]));
  const state = world.perceptionEvidence![observerId]!.attention!;
  const evaluations: AttentionRelationEvaluation[] = [];
  // A tree continuation cannot survive moving members. Rotating received rows
  // instead gives every member finite visits without pretending partial absence
  // is a negative answer. Only a complete unchanged-cut pass can clear a latch.
  const page = <T>(entry: {key:string;changeRevision:string}, family:'closing-body'|'closing-drop',
    values: readonly T[], revision: string, allowance:number, measure:(value:T)=>AttentionRelationWitness|undefined,
    prior: AttentionRelationWitness | undefined, priorRequired:boolean, knownComplete:boolean) => {
    const key=JSON.stringify([entry.key,family]);
    const scan=(state.relationScans[key]??={cursor:0,remaining:values.length,revision:'',clearSupported:true});
    const cut=JSON.stringify([entry.changeRevision,revision]);
    if(scan.revision!==cut){scan.revision=cut;scan.remaining=values.length;scan.clearSupported=true;}
    const reserved = priorRequired && allowance > 0 ? 1 : 0;
    const count=Math.min(Math.max(0,allowance-reserved),values.length,scan.remaining);
    const witnesses:AttentionRelationWitness[]=[];
    const bounds=family==='closing-body'?policy.body:policy.drop;
    for(let i=0;i<count;i++){
      const value=values[(scan.cursor+i)%values.length]!;
      const witness=measure(value);
      if(!witness){scan.clearSupported=false;continue;}
      witnesses.push(witness);
      if(!(witness.distanceLower>bounds.clear||witness.decreaseLower<policy.minimumDecrease||
        (family==='closing-drop'&&(witness.dropLower??-Infinity)<policy.drop.minimumDrop))) scan.clearSupported=false;
    }
    scan.cursor=values.length?(scan.cursor+count)%values.length:0;
    scan.remaining-=count;
    if(prior&&!witnesses.some((value)=>value.id===prior.id)) witnesses.push(prior);
    const complete=scan.remaining===0&&knownComplete;
    const clearSupported=scan.clearSupported&&(!priorRequired||!!prior);
    if(scan.remaining===0){scan.remaining=values.length;scan.clearSupported=true;}
    return {evaluation:{anchorKey:entry.key,family,revision:cut,complete,clearSupported,witnesses},visited:count+reserved};
  };
  let remaining = opportunity.candidates;
  for (let ordinal = 0; ordinal < opportunity.anchors.length; ordinal++) {
    const entry = opportunity.anchors[ordinal]!, anchor = scene.bodies.get(entry.sourceId);
    if (!anchor) continue;
    const share=Math.floor(remaining/(opportunity.anchors.length-ordinal));
    const bodyKey=JSON.stringify([entry.key,'closing-body']), bodyLatch=state.latches[bodyKey];
    const bodyMeasure=(neighbor:ReceivedSceneBody):AttentionRelationWitness|undefined=>{
      if(neighbor.sourceId===anchor.sourceId) return {id:neighbor.exposure,distanceLower:Infinity,distanceUpper:Infinity,decreaseLower:0,proof:[]};
      const relation=receivedSeparation(anchor,neighbor);
      if(relation.status!=='complete'||(relation.decreaseLower===undefined&&relation.lower!<=policy.body.clear))return undefined;
      return {id:neighbor.exposure,distanceLower:relation.lower!,distanceUpper:relation.upper!,decreaseLower:relation.decreaseLower??0,
        proof:[...bodyProof(anchor),...bodyProof(neighbor)].slice(0,8)};
    };
    const priorBody=bodyLatch?.witnessId?bodiesByExposure.get(bodyLatch.witnessId):undefined;
    const body=page(entry,'closing-body',bodies,bodyRevision,Math.ceil(share/2),bodyMeasure,
      share>0&&priorBody?bodyMeasure(priorBody):undefined,!!bodyLatch?.active,true);
    remaining-=body.visited; evaluations.push(body.evaluation);
    const dropLatch=state.latches[JSON.stringify([entry.key,'closing-drop'])];
    const dropMeasure=(value:typeof boundaries[number]):AttentionRelationWitness|undefined=>{
      const measured=receivedBoundarySeparation(anchor,value.boundary,{from:value.observation.acquiredAt,through:geometry.supportedThrough});
      if(measured.status!=='complete'||(measured.decreaseLower===undefined&&measured.lower!<=policy.drop.clear))return undefined;
      return {id:value.observation.id,distanceLower:measured.lower!,distanceUpper:measured.upper!,decreaseLower:measured.decreaseLower??0,
        dropLower:measured.dropLower,proof:[...bodyProof(anchor),observationFactKey(value.observation,value.ordinal)].slice(0,8)};
    };
    const priorBoundary=dropLatch?.witnessId?boundariesById.get(dropLatch.witnessId):undefined;
    const drop=page(entry,'closing-drop',boundaries,geometryRevision,Math.max(0,share-body.visited),dropMeasure,
      share-body.visited>0&&priorBoundary?dropMeasure(priorBoundary):undefined,!!dropLatch?.active,geometry.complete);
    remaining-=drop.visited; evaluations.push(drop.evaluation);
  }
  applyAttentionRelationEvaluations(world, observerId, evaluations);
}

export function validateReceivedSurfacePatch(value: ObservedSurfacePatch): void {
  if (
    !value ||
    !Array.isArray(value.vertices) ||
    value.vertices.length !== 4 ||
    value.vertices.some((p) => !validPerceivedPoint(p)) ||
    !validPerceivedPoint(value.normal) ||
    Math.abs(Math.hypot(value.normal.x, value.normal.y, value.normal.z) - 1) > 1e-6 ||
    !Number.isFinite(value.errorRadius) ||
    value.errorRadius < 0 ||
    !Array.isArray(value.edges) ||
    value.edges.length !== 4 ||
    value.edges.some((edge) => !['coverage-limit', 'physical-boundary'].includes(edge)) ||
    !value.frame ||
    !validPerceivedPoint(value.frame.positionAtObservation) ||
    (value.frame.forwardAtObservation !== undefined &&
      !Number.isFinite(value.frame.forwardAtObservation))
  )
    throw new Error('Invalid received surface patch.');
}
export function validateReceivedBoundary(value: ObservedBoundary): void {
  if (
    !value ||
    !validPerceivedPoint(value.a) ||
    !validPerceivedPoint(value.b) ||
    !Number.isFinite(value.errorRadius) ||
    value.errorRadius < 0 ||
    !Number.isFinite(value.dropLower)
  )
    throw new Error('Invalid received physical boundary.');
  for (const surface of [value.nearSurface, value.farSurface]) {
    if (
      !surface ||
      !validPerceivedPoint(surface.point) ||
      !validPerceivedPoint(surface.normal) ||
      Math.abs(Math.hypot(surface.normal.x, surface.normal.y, surface.normal.z) - 1) > 1e-6 ||
      !surface.support ||
      !Number.isSafeInteger(surface.support.ordinal) ||
      surface.support.ordinal < 0
    )
      throw new Error('Invalid received boundary surface.');
    validateEvidenceSource(surface.support.source);
  }
}

export function validateReceivedGeometryState(
  world: WorldState,
  observerId: string,
  state: ReceivedGeometryState,
  originals = new Map<string, string>(),
): void {
  const policy = selectedAttentionPolicy(world).geometry;
  if (
    !state ||
    typeof state.basis !== 'string' ||
    !state.basis ||
    !state.frame ||
    !validPerceivedPoint(state.frame.positionAtObservation) ||
    (state.frame.forwardAtObservation !== undefined &&
      !Number.isFinite(state.frame.forwardAtObservation)) ||
    !validPerceivedPoint(state.eye) ||
    !Number.isFinite(state.radius) ||
    state.radius <= 0 ||
    !Number.isSafeInteger(state.geometryRevision) ||
    state.geometryRevision < 0 ||
    !Number.isFinite(state.supportedThrough) || state.supportedThrough < 0 || state.supportedThrough > world.simTime ||
    !Number.isSafeInteger(state.generation) ||
    state.generation < 0 ||
    !Number.isSafeInteger(state.boundaryChecked) ||
    state.boundaryChecked < 0 ||
    !Number.isFinite(state.nextAt) ||
    state.nextAt < 0 ||
    !Number.isSafeInteger(state.boundaryCursor) ||
    state.boundaryCursor < 0 ||
    typeof state.finished !== 'boolean' ||
    typeof state.complete !== 'boolean' ||
    typeof state.unrepresented !== 'boolean' ||
    typeof state.surfacesComplete !== 'boolean' ||
    !Number.isSafeInteger(state.visited) ||
    state.visited < 0 ||
    state.visited > policy.patchVisits + policy.indexVisits ||
    !Array.isArray(state.pending) ||
    state.pending.length > policy.preparationPatches ||
    !Array.isArray(state.fragments) ||
    !Array.isArray(state.boundaries) ||
    state.fragments.length + state.boundaries.length > policy.maxFragments ||
    !Array.isArray(state.boundaryKeys) ||
    state.boundaryKeys.length !== state.boundaries.length ||
    new Set(state.boundaryKeys).size !== state.boundaryKeys.length ||
    state.boundaryKeys.some((key) => typeof key !== 'string')
  )
    throw new Error('Invalid received geometry continuation.');
  for (const patch of [...state.pending, ...state.fragments])
    if (
      !patch ||
      typeof patch.surfaceId !== 'string' ||
      !patch.surfaceId ||
      ![patch.minX, patch.maxX, patch.minZ, patch.maxZ].every(Number.isFinite) ||
      patch.minX >= patch.maxX ||
      patch.minZ >= patch.maxZ
    )
      throw new Error('Invalid received geometry preparation.');
  if (
    state.surfaceCursor &&
    (!Array.isArray(state.surfaceCursor.pending) ||
      state.surfaceCursor.pending.length > 64 ||
      state.surfaceCursor.pending.some(
        (path) =>
          !Array.isArray(path) || path.length > 64 || path.some((part) => part !== 0 && part !== 1),
      ) ||
      !Number.isSafeInteger(state.surfaceCursor.offset) ||
      state.surfaceCursor.offset < 0 ||
      state.surfaceCursor.offset > 4 ||
      (state.surfaceCursor.leaf !== undefined && typeof state.surfaceCursor.leaf !== 'boolean'))
  )
    throw new Error('Invalid received geometry cursor.');
  const life = world.perceptionEvidence?.[observerId]?.life;
  const observations = [
    ...state.fragments.map((fragment) => fragment.observation),
    ...state.boundaries,
  ];
  if (
    new Set(observations.map((value) => value.id)).size !== observations.length ||
    new Set(state.fragments.map((value) => value.key)).size !== state.fragments.length
  )
    throw new Error('Duplicate received geometry.');
  for (const fragment of state.fragments)
    if (
      fragment.key !== rectangleKey(fragment) ||
      fragment.observation.facets.length !== 1 ||
      fragment.observation.facets[0]?.value.kind !== 'surface-patch'
    )
      throw new Error('Invalid received surface binding.');
  for (const observation of observations) {
    validateObservationContribution(observation, originals);
    if (
      observation.observer.actorId !== observerId ||
      observation.observer.physicalLife !== life ||
      observation.modality !== 'sight' ||
      observation.acquiredAt > world.simTime ||
      observation.facets.length !== 1 ||
      !['surface-patch', 'physical-boundary'].includes(observation.facets[0]!.value.kind)
    )
      throw new Error('Invalid received geometry owner.');
  }
}
