import {
  BoundsIndex,
  horizontalCone,
  distance3D,
  movingBodiesMinimumSeparation,
  queryPhysicalFeatures,
  physicalFeatureById,
  queryConvexView,
  type Bounds3,
  type BoundsQueryCursor,
  type PhysicalFeature,
} from '@open-legend/spatial';
import { entityGet } from './entity-collection.js';
import { effectiveBodyProfile, spatialMap, worldPosition } from './spatial-state.js';
import { activelyParticipates } from './participation-state.js';
import { visionRadius, visionFieldOfView, sensesFor } from './perception.js';
import {
  acquireObservation,
  observationFactKey,
  validateObservationContribution,
  currentObservedFacetValues,
  type ObservationContribution,
  type ObservationFactKey,
  type ObservationFrame,
} from './perception-evidence.js';
import {
  applyAttentionRelationEvaluations,
  attentionRelationOpportunity,
  markAttentionRelationsDirty,
  currentDetailedAttention,
  SELF_RELATION_KEY,
  type AttentionRelationEvaluation,
  type AttentionRelationWitness,
} from './attention.js';
import {
  receivedScene,
  receivedSeparation,
  type ReceivedSceneBody,
  type ReceivedBodyGeometry,
} from './received-scene.js';
import { selectedAttentionPolicy, selectedTemporalPolicy } from './world-composition.js';
import {
  finalizeTemporalGeometrySupport,
  reconcileTemporalGeometryCaptures,
} from './temporal-evidence.js';
import { validPerceivedPoint, validateEvidenceSource } from './perception-values.js';
import { cloneValue, readOnlyDraftView } from './draft.js';
import { jsonEncoding, hasRecordFields } from './records.js';
import { personalFactAlias } from './experience-source.js';
import { nextId } from './data.js';
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
  dropLower: number;
}
interface FeatureExtent {
  featureId: string;
  u0: number;
  u1: number;
  v0: number;
  v1: number;
}
interface GeometryFragment extends FeatureExtent {
  key: string;
  observation: ObservationContribution;
}
export interface ReceivedGeometryState {
  inputRevision: number;
  basis: string;
  sourceBasis: string;
  episodeId: string;
  frame: ObservationFrame;
  frameAt: number;
  priorFrame?: { at: number; frame: ObservationFrame };
  eye: Position;
  radius: number;
  geometryRevision: number;
  supportedThrough: number;
  generation: number;
  nextAt: number;
  queryKey: string;
  featureCursor?: BoundsQueryCursor;
  anchorCursor: number;
  fragments: GeometryFragment[];
  boundaries: ObservationContribution[];
  boundaryKeys: string[];
  finished: boolean;
  unknown: boolean;
  complete: boolean;
  visited: number;
  bytes: number;
}
const epsilon = 1e-8;
const extentKey = (value: FeatureExtent) =>
  JSON.stringify([value.featureId, value.u0, value.u1, value.v0, value.v1]);
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
    (s) => s.implementation === 'vision-geometry-v1',
  );
  const radius = visionRadius(world, observer),
    angle = visionFieldOfView(world, observer);
  if (!detector || radius <= 0) return;
  const p = worldPosition(observer),
    eye = { x: p.x, y: p.y + effectiveBodyProfile(world, observer).eyeHeight, z: p.z };
  const map = spatialMap(world),
    policy = selectedAttentionPolicy(world);
  const sourceBasis = JSON.stringify([
    observer.actor.physicalLife ?? 0,
    map.spatial.revision,
    detector,
    policy.id,
    policy.version,
    policy.geometry,
  ]);
  const basis = JSON.stringify([
    sourceBasis,
    eye,
    radius,
    angle,
    angle < 2 * Math.PI ? observer.spatial.heading : null,
  ]);
  return {
    observer,
    detector,
    radius,
    inCone: horizontalCone(p, observer.spatial.heading, angle),
    eye,
    map,
    basis,
    sourceBasis,
    frame: { positionAtObservation: { ...p }, forwardAtObservation: observer.spatial.heading },
  };
}
function boundsAround(point: Position, radius: number): Bounds3 {
  return {
    min: { x: point.x - radius, y: point.y - radius, z: point.z - radius },
    max: { x: point.x + radius, y: point.y + radius, z: point.z + radius },
  };
}
function boundsOf(points: readonly Position[]): Bounds3 {
  return {
    min: {
      x: Math.min(...points.map((p) => p.x)),
      y: Math.min(...points.map((p) => p.y)),
      z: Math.min(...points.map((p) => p.z)),
    },
    max: {
      x: Math.max(...points.map((p) => p.x)),
      y: Math.max(...points.map((p) => p.y)),
      z: Math.max(...points.map((p) => p.z)),
    },
  };
}
function featurePoint(feature: PhysicalFeature, u: number, v: number): Position {
  const [a, b, c, d] = feature.vertices;
  return {
    x: a.x * (1 - u) * (1 - v) + b.x * u * (1 - v) + c.x * u * v + d.x * (1 - u) * v,
    y: a.y * (1 - u) * (1 - v) + b.y * u * (1 - v) + c.y * u * v + d.y * (1 - u) * v,
    z: a.z * (1 - u) * (1 - v) + b.z * u * (1 - v) + c.z * u * v + d.z * (1 - u) * v,
  };
}
/** Split around a conservative projection of the actual occluder, then let
 * the normal complete visibility query certify each proposed interior. This
 * avoids blindly bisecting the long axis while a narrow shadow hides one edge. */
function shadowPartition(
  feature: PhysicalFeature,
  extent: FeatureExtent,
  eye: Position,
  vertices: readonly Position[],
): FeatureExtent[] | undefined {
  const a = feature.vertices[0],
    b = feature.vertices[1],
    d = feature.vertices[3],
    n = feature.normal,
    u = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z },
    v = { x: d.x - a.x, y: d.y - a.y, z: d.z - a.z },
    uu = dot(u, u),
    vv = dot(v, v),
    uv = dot(u, v),
    det = uu * vv - uv * uv;
  if (det <= epsilon) return;
  const numerator = n.x * (a.x - eye.x) + n.y * (a.y - eye.y) + n.z * (a.z - eye.z);
  let lowU = Infinity,
    highU = -Infinity,
    lowV = Infinity,
    highV = -Infinity;
  for (const point of vertices) {
    const delta = { x: point.x - eye.x, y: point.y - eye.y, z: point.z - eye.z },
      denominator = dot(n, delta),
      t = numerator / denominator;
    // A crossing/eye-plane solid needs the ordinary conservative subdivision.
    if (!Number.isFinite(t) || t < 1 - epsilon) return;
    const projected = {
        x: eye.x + t * delta.x - a.x,
        y: eye.y + t * delta.y - a.y,
        z: eye.z + t * delta.z - a.z,
      },
      du = dot(projected, u),
      dv = dot(projected, v),
      pu = (du * vv - dv * uv) / det,
      pv = (dv * uu - du * uv) / det;
    lowU = Math.min(lowU, pu);
    highU = Math.max(highU, pu);
    lowV = Math.min(lowV, pv);
    highV = Math.max(highV, pv);
  }
  const left = Math.max(extent.u0, Math.min(extent.u1, lowU)),
    right = Math.max(extent.u0, Math.min(extent.u1, highU)),
    bottom = Math.max(extent.v0, Math.min(extent.v1, lowV)),
    top = Math.max(extent.v0, Math.min(extent.v1, highV));
  const result: FeatureExtent[] = [];
  const add = (u0: number, u1: number, v0: number, v1: number) => {
    if (u1 - u0 > epsilon && v1 - v0 > epsilon) result.push({ ...extent, u0, u1, v0, v1 });
  };
  const margin = epsilon * 16;
  add(extent.u0, left - margin, extent.v0, extent.v1);
  add(right + margin, extent.u1, extent.v0, extent.v1);
  add(left, right, extent.v0, bottom - margin);
  add(left, right, top + margin, extent.v1);
  if (!result.length) return;
  // The shadow itself remains last and unknown unless later work proves it.
  add(left, right, bottom, top);
  return result;
}
function extentPoints(feature: PhysicalFeature, extent: FeatureExtent): Quad<Position> {
  return [
    featurePoint(feature, extent.u0, extent.v0),
    featurePoint(feature, extent.u1, extent.v0),
    featurePoint(feature, extent.u1, extent.v1),
    featurePoint(feature, extent.u0, extent.v1),
  ];
}
function dot(a: Position, b: Position) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
function localExtent(feature: PhysicalFeature, anchor: Position, metres: number): FeatureExtent {
  const [a, b, , d] = feature.vertices,
    u = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z },
    v = { x: d.x - a.x, y: d.y - a.y, z: d.z - a.z },
    delta = { x: anchor.x - a.x, y: anchor.y - a.y, z: anchor.z - a.z };
  const uLength = Math.hypot(u.x, u.y, u.z),
    vLength = Math.hypot(v.x, v.y, v.z);
  const tile = (coordinate: number, length: number) => {
    const size = Math.min(1, metres / length),
      count = Math.ceil(1 / size),
      at = Math.min(count - 1, Math.max(0, Math.floor(coordinate / size)));
    return [at * size, Math.min(1, (at + 1) * size)] as const;
  };
  const uu = dot(u, u),
    vv = dot(v, v),
    uv = dot(u, v),
    determinant = uu * vv - uv * uv;
  const [u0, u1] = tile((dot(delta, u) * vv - dot(delta, v) * uv) / determinant, uLength),
    [v0, v1] = tile((dot(delta, v) * uu - dot(delta, u) * uv) / determinant, vLength);
  return { featureId: feature.id, u0, u1, v0, v1 };
}
function splitExtent(
  value: FeatureExtent,
  feature: PhysicalFeature,
): [FeatureExtent, FeatureExtent] {
  const points = extentPoints(feature, value);
  if (distance3D(points[0], points[1]) >= distance3D(points[0], points[3])) {
    const middle = (value.u0 + value.u1) / 2;
    return [
      { ...value, u1: middle },
      { ...value, u0: middle },
    ];
  }
  const middle = (value.v0 + value.v1) / 2;
  return [
    { ...value, v1: middle },
    { ...value, v0: middle },
  ];
}
function distanceBounds(bounds: Bounds3, point: Position) {
  return Math.hypot(
    Math.max(bounds.min.x - point.x, point.x - bounds.max.x, 0),
    Math.max(bounds.min.y - point.y, point.y - bounds.max.y, 0),
    Math.max(bounds.min.z - point.z, point.z - bounds.max.z, 0),
  );
}
function inputFor(
  input: NonNullable<ReturnType<typeof receptor>>,
  state: ReceivedGeometryState,
  world: WorldState,
  kind: 'surface-patch' | 'physical-boundary',
  value: ObservedSurfacePatch | ObservedBoundary,
  key: string,
) {
  return {
    origin: {
      kind: 'exposure' as const,
      episodeId: state.episodeId,
      detectorId: JSON.stringify([kind, key]),
      measuredFrom: world.simTime,
      measuredThrough: world.simTime,
    },
    modality: 'sight' as const,
    detector: { id: input.detector.id, version: input.detector.version },
    facets: [
      {
        role: 'direct' as const,
        asOf: world.simTime,
        measuredFrom: world.simTime,
        measuredThrough: world.simTime,
        value:
          kind === 'surface-patch'
            ? { kind, patch: value as ObservedSurfacePatch }
            : { kind, boundary: value as ObservedBoundary },
      },
    ],
  };
}
function admittedGeometry(
  world: WorldState,
  input: NonNullable<ReturnType<typeof receptor>>,
  state: ReceivedGeometryState,
  kind: 'surface-patch' | 'physical-boundary',
  value: ObservedSurfacePatch | ObservedBoundary,
  key: string,
  available: number,
) {
  const request = inputFor(input, state, world, kind, value, key);
  // Complete logical accounting before allocating a pool/original. Only the
  // generated ID is unknown; its maximum safe numeric spelling bounds that field.
  const bound = jsonEncoding({
    id: `perception-observation-${Number.MAX_SAFE_INTEGER}`,
    revision: 1,
    observer: { actorId: input.observer.id, physicalLife: input.observer.actor!.physicalLife ?? 0 },
    acquiredAt: world.simTime,
    ...request,
    facets: request.facets.map((facet, ordinal) => ({
      ...facet,
      ordinal,
      acquiredAt: world.simTime,
    })),
  }).bytes;
  if (bound > available) return;
  const observation = acquireObservation(world, input.observer, request),
    bytes = jsonEncoding(observation).bytes;
  if (bytes > bound) throw new Error('Geometry admission exceeded its complete logical bound.');
  return { observation, bytes };
}
/** Context anchors use received placements. Broad regions remain available when
 * body attention is full; the scan and feature query share one finite allowance. */
function contextAnchors(
  world: WorldState,
  input: NonNullable<ReturnType<typeof receptor>>,
  cursor: number,
) {
  const policy = selectedAttentionPolicy(world).geometry,
    points = [input.frame.positionAtObservation];
  const ids = new Set(
    currentDetailedAttention(world, input.observer.id).map((entry) => entry.sourceId),
  );
  if (input.observer.actor?.action?.targetId) ids.add(input.observer.actor.action.targetId);
  const attention = world.perceptionEvidence?.[input.observer.id]?.attention;
  for (const entry of Object.values(attention?.candidates ?? {}))
    if (entry.direct) ids.add(entry.sourceId);
  let visited = 0;
  const add = (id: string) => {
    if (visited >= Math.floor(policy.visits / 3)) return;
    visited++;
    const received = currentObservedFacetValues(world, input.observer.id, id, ['location']).find(
      (value) => value.value.kind === 'location',
    );
    if (received?.value.kind === 'location' && received.value.location.kind === 'point')
      points.push(received.value.location.point);
  };
  for (const id of ids) add(id);
  const visible = [
      ...(world.visiblePeople?.[input.observer.id] ?? []),
      ...(world.visibleObjects?.[input.observer.id] ?? []),
    ],
    regions = new Set(
      points.map((point) =>
        JSON.stringify([
          Math.floor(point.x / policy.extentMetres),
          Math.floor(point.z / policy.extentMetres),
        ]),
      ),
    );
  const maximum = Math.floor(policy.visits / 3);
  let scanned = 0;
  while (scanned < visible.length && visited < maximum) {
    const id = visible[(cursor + scanned++) % visible.length]!;
    if (ids.has(id)) continue;
    const before = points.length;
    add(id);
    if (points.length > before) {
      const point = points.at(-1)!,
        key = JSON.stringify([
          Math.floor(point.x / policy.extentMetres),
          Math.floor(point.z / policy.extentMetres),
        ]);
      if (regions.has(key)) points.pop();
      else regions.add(key);
    }
  }
  return {
    points,
    visited,
    partial: scanned < visible.length,
    cursor: visible.length ? (cursor + scanned) % visible.length : 0,
  };
}
/** Acquire selected physical features, never a field-of-view ground grid. The
 * finite cursor is over shared source features; split scratch dies at this boundary. */
export function expireReceivedGeometryMotion(world: WorldState, observerId: string): void {
  const state = world.perceptionEvidence?.[observerId]?.geometry;
  if (
    !state?.priorFrame ||
    world.simTime < state.frameAt + selectedAttentionPolicy(world).geometry.intervalSeconds
  )
    return;
  delete state.priorFrame;
  markAttentionRelationsDirty(
    world,
    observerId,
    ['closing-body', 'closing-drop'],
    new Set([SELF_RELATION_KEY]),
  );
}
export function refreshReceivedGeometry(
  world: WorldState,
  observerId: string,
): { acquired: ObservationContribution[]; changed: boolean } {
  const input = receptor(world, observerId),
    owner = world.perceptionEvidence?.[observerId];
  if (!input || !owner) {
    if (owner?.geometry) {
      endReceivedGeometry(world, observerId);
      return { acquired: [], changed: true };
    }
    return { acquired: [], changed: false };
  }
  const policy = selectedAttentionPolicy(world).geometry,
    previous = owner.geometry && readOnlyDraftView(owner.geometry);
  expireReceivedGeometryMotion(world, observerId);
  if (
    previous &&
    JSON.stringify(previous.frame.positionAtObservation) !==
      JSON.stringify(input.frame.positionAtObservation)
  )
    markAttentionRelationsDirty(
      world,
      observerId,
      ['closing-body', 'closing-drop'],
      new Set([SELF_RELATION_KEY]),
    );
  if (
    geometryCertificateCurrent(world, observerId, input, previous) &&
    world.simTime < previous.nextAt
  ) {
    if (previous.basis === input.basis && previous.supportedThrough !== world.simTime) {
      owner.geometry!.supportedThrough = world.simTime;
      owner.geometry!.inputRevision = world.sensory?.revision ?? 0;
      return { acquired: [], changed: true };
    }
    return { acquired: [], changed: false };
  }
  const anchors = contextAnchors(world, input, previous?.anchorCursor ?? 0),
    radius = Math.min(input.radius, selectedAttentionPolicy(world).relation.drop.clear),
    boxes = anchors.points.map((point) => boundsAround(point, radius));
  const bounds = {
    min: {
      x: Math.min(...boxes.map((b) => b.min.x)),
      y: Math.min(...boxes.map((b) => b.min.y)),
      z: Math.min(...boxes.map((b) => b.min.z)),
    },
    max: {
      x: Math.max(...boxes.map((b) => b.max.x)),
      y: Math.max(...boxes.map((b) => b.max.y)),
      z: Math.max(...boxes.map((b) => b.max.z)),
    },
  };
  // The continuation owns its ordering inputs as well as its index. Receptor
  // rejection happens in the hierarchy, before distant terrain spends the page.
  const queryKey = JSON.stringify([input.basis, bounds, anchors.points]);
  const basis = input.basis;
  if (
    previous?.basis === basis &&
    previous.queryKey === queryKey &&
    previous.finished &&
    geometryCertificateCurrent(world, observerId, input, previous)
  ) {
    if (previous.supportedThrough === world.simTime) return { acquired: [], changed: false };
    owner.geometry!.supportedThrough = world.simTime;
    owner.geometry!.inputRevision = world.sensory?.revision ?? 0;
    return { acquired: [], changed: true };
  }
  const state: ReceivedGeometryState = {
    basis,
    inputRevision: world.sensory?.revision ?? 0,
    sourceBasis: input.sourceBasis,
    episodeId:
      previous?.sourceBasis === input.sourceBasis
        ? previous.episodeId
        : nextId(world, 'geometry-exposure'),
    frame: input.frame,
    frameAt: world.simTime,
    ...(previous?.sourceBasis === input.sourceBasis
      ? {
          priorFrame:
            previous.basis === input.basis
              ? owner.geometry?.priorFrame
              : { at: previous.frameAt, frame: previous.frame },
        }
      : {}),
    eye: input.eye,
    radius: input.radius,
    geometryRevision: input.map.spatial.revision,
    supportedThrough: world.simTime,
    generation: (previous?.generation ?? -1) + 1,
    nextAt: world.simTime + policy.intervalSeconds,
    queryKey,
    anchorCursor: anchors.cursor,
    fragments: [],
    boundaries: [],
    boundaryKeys: [],
    finished: true,
    unknown:
      anchors.partial ||
      (previous?.basis === basis &&
        previous.queryKey === queryKey &&
        !!previous.featureCursor &&
        previous.unknown),
    complete: true,
    visited: anchors.visited,
    bytes: 0,
  };
  const acquired: ObservationContribution[] = [];
  const anchorDistance = (box: Bounds3) => {
    let nearest = Infinity;
    for (const point of anchors.points) nearest = Math.min(nearest, distanceBounds(box, point));
    return nearest;
  };
  const query = queryPhysicalFeatures(
    input.map,
    bounds,
    Math.max(1, Math.floor((policy.visits - state.visited) / 3)),
    previous?.queryKey === queryKey ? previous.featureCursor : undefined,
    {
      intersects: (box) => distanceBounds(box, input.eye) <= input.radius,
      priority: anchorDistance,
    },
  );
  state.visited += query.visited;
  state.featureCursor = query.cursor;
  state.finished = !query.cursor;
  // A live index cursor is unfinished work, rather than a permanent visibility
  // gap. Keep real uncertified fringe separately so the last page can complete
  // an otherwise exact view without acquiring another fact.
  state.unknown ||= query.status !== 'complete' && !query.cursor;
  const features = new Map(query.values.map((feature) => [feature.id, feature]));
  const held = previous?.sourceBasis === input.sourceBasis ? previous.fragments : [];
  for (const fragment of held) {
    const feature = physicalFeatureById(input.map, fragment.featureId);
    if (
      feature &&
      anchors.points.some(
        (point) => distanceBounds(boundsOf(extentPoints(feature, fragment)), point) <= radius,
      )
    )
      features.set(feature.id, feature);
  }
  type Candidate = {
    extent: FeatureExtent;
    feature: PhysicalFeature;
    old?: GeometryFragment;
    priority: number;
  };
  const pending: Candidate[] = [],
    keys = new Set<string>();
  // The shared index has already charged these source visits. Reject a whole
  // back face before allocating anchor extents or spending convex-view work.
  const frontFacing = (feature: PhysicalFeature) =>
    dot(
      {
        x: input.eye.x - feature.vertices[0].x,
        y: input.eye.y - feature.vertices[0].y,
        z: input.eye.z - feature.vertices[0].z,
      },
      feature.normal,
    ) > epsilon;
  const selectionLimit = Math.max(state.visited, Math.floor(policy.visits / 2));
  const enqueue = (
    extent: FeatureExtent,
    feature: PhysicalFeature,
    old?: GeometryFragment,
    allowance = selectionLimit,
  ) => {
    const key = extentKey(extent);
    if (keys.has(key)) return;
    if (state.visited >= allowance) {
      state.unknown = true;
      return;
    }
    state.visited++;
    keys.add(key);
    const box = boundsOf(extentPoints(feature, extent)),
      priority = Math.min(...anchors.points.map((point) => distanceBounds(box, point)));
    if (priority <= radius) pending.push({ extent, feature, old, priority });
  };
  for (const fragment of held) {
    const feature = features.get(fragment.featureId);
    if (feature && frontFacing(feature)) enqueue(fragment, feature, fragment);
  }
  const closestFeatures = [...features.values()].sort(
    (a, b) => anchorDistance(a.bounds) - anchorDistance(b.bounds) || a.id.localeCompare(b.id),
  );
  for (const feature of closestFeatures) {
    if (!frontFacing(feature)) continue;
    // A finite feature that already fits the actual receptor needs one proof,
    // rather than several artificial tiles competing for the same allowance.
    const whole = feature.vertices.every(
      (point) => distance3D(input.eye, point) <= input.radius && input.inCone(point),
    )
      ? { featureId: feature.id, u0: 0, u1: 1, v0: 0, v1: 1 }
      : undefined;
    for (const point of anchors.points) {
      if (state.visited >= selectionLimit) {
        state.unknown = true;
        break;
      }
      if (distanceBounds(feature.bounds, point) > radius) continue;
      if (
        held.some(
          (fragment) =>
            fragment.featureId === feature.id &&
            distanceBounds(boundsOf(extentPoints(feature, fragment)), point) <= epsilon,
        )
      )
        continue;
      enqueue(whole ?? localExtent(feature, point, policy.extentMetres), feature);
    }
  }
  pending.sort(
    (a, b) =>
      policy.featurePriority[a.feature.kind] - policy.featurePriority[b.feature.kind] ||
      a.priority - b.priority ||
      (a.old ? -1 : 0) - (b.old ? -1 : 0) ||
      a.feature.id.localeCompare(b.feature.id),
  );
  // Give each selected physical source its first useful extent before spending
  // the remaining allowance on another extent/face of the same source.
  const seenSources = new Set<string>(),
    first: Candidate[] = [],
    additional: Candidate[] = [];
  for (const candidate of pending) {
    if (seenSources.has(candidate.feature.sourceId)) additional.push(candidate);
    else {
      seenSources.add(candidate.feature.sourceId);
      first.push(candidate);
    }
  }
  pending.splice(0, pending.length, ...first, ...additional);
  const certified: Array<Candidate & { patch: ObservedSurfacePatch }> = [];
  // Keep a small relation pass, lending unused reservation to actual visibility
  // proofs. A fixed quarter withheld here can prevent even one local feature
  // from ever passing the hierarchy in an otherwise tiny visible scene.
  const certificateLimit = Math.max(
    state.visited,
    policy.visits - Math.min(policy.maxViews, Math.max(2, pending.length)),
  );
  while (pending.length && state.visited < certificateLimit) {
    const entry = pending.shift()!,
      points = extentPoints(entry.feature, entry.extent);
    state.visited++;
    const heldPatch = entry.old?.observation.facets[0]?.value;
    if (
      previous?.basis === basis &&
      geometryCertificateCurrent(world, observerId, input, previous) &&
      heldPatch?.kind === 'surface-patch'
    ) {
      certified.push({ ...entry, patch: heldPatch.patch });
      if (entry.extent.u0 > 0 || entry.extent.u1 < 1 || entry.extent.v0 > 0 || entry.extent.v1 < 1)
        state.unknown = true;
      continue;
    }
    const delta = {
      x: input.eye.x - points[0].x,
      y: input.eye.y - points[0].y,
      z: input.eye.z - points[0].z,
    };
    if (dot(delta, entry.feature.normal) <= epsilon) continue;
    const local = points.every(
      (point) => distance3D(input.eye, point) <= input.radius && input.inCone(point),
    );
    const visible = local
      ? queryConvexView(input.map, input.eye, points, certificateLimit - state.visited)
      : undefined;
    state.visited += visible?.visited ?? 0;
    if (!visible?.clear) {
      state.unknown = true;
      if (
        (!visible || visible.complete) &&
        Math.max(distance3D(points[0], points[1]), distance3D(points[0], points[3])) >
          policy.errorMetres * 2
      ) {
        const partitions =
          visible?.blockingVertices &&
          shadowPartition(entry.feature, entry.extent, input.eye, visible.blockingVertices);
        const before = pending.length;
        for (const extent of partitions ?? splitExtent(entry.extent, entry.feature))
          enqueue(extent, entry.feature, undefined, certificateLimit);
        if (partitions) {
          const next = pending.splice(before);
          pending.unshift(...next);
        }
      }
      continue;
    }
    certified.push({
      ...entry,
      patch: {
        vertices: points,
        normal: entry.feature.normal,
        errorRadius: policy.errorMetres,
        edges: [
          entry.extent.v0 === 0 ? 'physical-boundary' : 'coverage-limit',
          entry.extent.u1 === 1 ? 'physical-boundary' : 'coverage-limit',
          entry.extent.v1 === 1 ? 'physical-boundary' : 'coverage-limit',
          entry.extent.u0 === 0 ? 'physical-boundary' : 'coverage-limit',
        ],
        frame: input.frame,
      },
    });
    if (entry.extent.u0 > 0 || entry.extent.u1 < 1 || entry.extent.v0 > 0 || entry.extent.v1 < 1)
      state.unknown = true;
  }
  if (pending.length) state.unknown = true;
  const selected = new Map<string, GeometryFragment>();
  const admit = (candidate: (typeof certified)[number]) => {
    const key = extentKey(candidate.extent),
      known = selected.get(key);
    if (known) return known;
    if (state.fragments.length + state.boundaries.length >= policy.maxViews) return;
    const retained = candidate.old && {
      observation: candidate.old.observation,
      bytes: jsonEncoding(candidate.old.observation).bytes,
    };
    const result =
      retained ??
      admittedGeometry(
        world,
        input,
        state,
        'surface-patch',
        candidate.patch,
        key,
        policy.maxBytes - state.bytes,
      );
    if (!result || state.bytes + result.bytes > policy.maxBytes) return;
    const fragment = { ...candidate.extent, key, observation: result.observation };
    state.fragments.push(fragment);
    selected.set(key, fragment);
    state.bytes += result.bytes;
    if (!retained) acquired.push(result.observation);
    return fragment;
  };
  // Supported near/far pairs are prioritized as a complete dependency bundle.
  // Coverage/range edges and a merely unseen far side never become a cliff.
  const supports = certified
    .filter((candidate) => candidate.feature.kind === 'support')
    .map((candidate) => ({ ...candidate, bounds: boundsOf(candidate.patch.vertices) }))
    .sort((a, b) => a.bounds.min.y - b.bounds.min.y);
  // Test downward candidates before reverse/equal-height pairs consume the
  // remaining allowance. Both surfaces still need their actual visibility proof.
  for (const near of [...supports].sort((a, b) => b.bounds.max.y - a.bounds.max.y)) {
    for (const far of supports) {
      if (state.visited >= policy.visits) {
        state.unknown = true;
        break;
      }
      state.visited++;
      if (near.feature.sourceId === far.feature.sourceId) continue;
      const fb = far.bounds;
      let edge: [Position, Position] | undefined;
      for (let i = 0; i < 4; i++) {
        if (near.patch.edges[i] !== 'physical-boundary') continue;
        const a = near.patch.vertices[i]!,
          b = near.patch.vertices[(i + 1) % 4]!;
        const axis = Math.abs(a.x - b.x) > epsilon ? 'x' : 'z',
          other = axis === 'x' ? 'z' : 'x';
        if (
          Math.abs(a[other] - fb.min[other]) > epsilon &&
          Math.abs(a[other] - fb.max[other]) > epsilon
        )
          continue;
        const low = Math.max(Math.min(a[axis], b[axis]), fb.min[axis]),
          high = Math.min(Math.max(a[axis], b[axis]), fb.max[axis]);
        if (high - low <= epsilon) continue;
        const at = (n: number) => {
          const t = (n - a[axis]) / (b[axis] - a[axis]);
          return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
        };
        edge = [at(low), at(high)];
        break;
      }
      if (!edge) continue;
      const farHeight = (point: Position) => {
        const p = far.patch.vertices[0],
          n = far.patch.normal;
        return p.y - (n.x * (point.x - p.x) + n.z * (point.z - p.z)) / n.y;
      };
      const lower =
        Math.min(...edge.map((point) => point.y - farHeight(point))) - policy.errorMetres * 2;
      if (lower <= 0) continue;
      const key = JSON.stringify([extentKey(near.extent), extentKey(far.extent), edge]);
      if (state.boundaryKeys.includes(key)) continue;
      const oldIndex = previous?.boundaryKeys.indexOf(key) ?? -1,
        old = oldIndex >= 0 ? previous!.boundaries[oldIndex] : undefined;
      if (
        state.fragments.length +
          state.boundaries.length +
          (!selected.has(extentKey(near.extent)) ? 1 : 0) +
          (!selected.has(extentKey(far.extent)) ? 1 : 0) +
          1 >
        policy.maxViews
      ) {
        state.unknown = true;
        continue;
      }
      const a = admit(near),
        b = admit(far);
      if (!a || !b) {
        state.unknown = true;
        continue;
      }
      const middle = {
        x: (edge[0].x + edge[1].x) / 2,
        y: (edge[0].y + edge[1].y) / 2,
        z: (edge[0].z + edge[1].z) / 2,
      };
      const value: ObservedBoundary = {
        a: edge[0],
        b: edge[1],
        errorRadius: policy.errorMetres,
        nearSurface: {
          point: middle,
          normal: near.patch.normal,
          support: observationFactKey(world, a.observation, 0),
        },
        farSurface: {
          point: { ...middle, y: farHeight(middle) },
          normal: far.patch.normal,
          support: observationFactKey(world, b.observation, 0),
        },
        dropLower: lower,
      };
      const oldValue = old?.facets[0]?.value;
      const retained =
        oldValue?.kind === 'physical-boundary' &&
        JSON.stringify(oldValue.boundary) === JSON.stringify(value)
          ? { observation: old!, bytes: jsonEncoding(old!).bytes }
          : undefined;
      const result =
        retained ??
        admittedGeometry(
          world,
          input,
          state,
          'physical-boundary',
          value,
          key,
          policy.maxBytes - state.bytes,
        );
      if (!result || state.bytes + result.bytes > policy.maxBytes) {
        state.unknown = true;
        continue;
      }
      state.boundaries.push(result.observation);
      state.boundaryKeys.push(key);
      state.bytes += result.bytes;
      if (!retained) acquired.push(result.observation);
    }
  }
  for (const candidate of certified) if (!admit(candidate)) state.unknown = true;
  if (
    state.fragments.length + state.boundaries.length >= policy.maxViews ||
    state.bytes >= policy.maxBytes
  )
    state.finished = true;
  state.complete = state.finished && !state.unknown;
  owner.geometry = state;
  if (previous) {
    const kept = new Set(geometryObservations(state).map((observation) => observation.id));
    finalizeTemporalGeometrySupport(
      world,
      observerId,
      geometryObservations(previous).filter((observation) => !kept.has(observation.id)),
      previous.supportedThrough,
      selectedTemporalPolicy(world).recent,
    );
  }
  markAttentionRelationsDirty(world, observerId, ['closing-drop']);
  return { acquired, changed: true };
}
function geometryObservations(state: ReceivedGeometryState): ObservationContribution[] {
  const held = readOnlyDraftView(state);
  return [
    ...readOnlyDraftView(held.fragments).map((fragment) =>
      readOnlyDraftView(readOnlyDraftView(fragment).observation),
    ),
    ...readOnlyDraftView(held.boundaries).map(readOnlyDraftView),
  ];
}
function finalizeGeometry(
  world: WorldState,
  observerId: string,
  state: ReceivedGeometryState,
): void {
  finalizeTemporalGeometrySupport(
    world,
    observerId,
    geometryObservations(state),
    state.supportedThrough,
    selectedTemporalPolicy(world).recent,
  );
}
export function endReceivedGeometry(world: WorldState, observerId: string): void {
  const owner = world.perceptionEvidence?.[observerId];
  if (!owner?.geometry) return;
  finalizeGeometry(world, observerId, owner.geometry);
  delete owner.geometry;
  reconcileTemporalGeometryCaptures(world, observerId, new Set());
  markAttentionRelationsDirty(world, observerId, ['closing-drop']);
}
/** Ordinary motion keeps the last received context until its actual due check.
 * Life, detector, geometry or policy replacement still withdraws current grants. */
function geometryCertificateCurrent(
  world: WorldState,
  observerId: string,
  input: NonNullable<ReturnType<typeof receptor>>,
  state: ReceivedGeometryState | undefined,
): state is ReceivedGeometryState {
  return (
    !!state &&
    state.sourceBasis === input.sourceBasis &&
    state.inputRevision >=
      Math.max(
        world.sensory?.invalidatedRevision ?? -1,
        world.sensory?.scopes[observerId]?.invalidatedRevision ?? -1,
      )
  );
}
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
  return input && geometryCertificateCurrent(world, observerId, input, state)
    ? {
        observations: geometryObservations(state),
        complete: state.complete,
        visited: state.visited,
        supportedThrough: state.supportedThrough,
      }
    : { observations: [], complete: false, visited: 0, supportedThrough: 0 };
}
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
  const removed = new Set(
    state.fragments
      .filter((fragment) => revoked(fragment.observation.id))
      .map((fragment) => fragment.observation.id),
  );
  const retained = state.boundaries.filter((observation) => {
    const value = observation.facets[0]?.value;
    return (
      !revoked(observation.id) &&
      value?.kind === 'physical-boundary' &&
      [value.boundary.nearSurface.support, value.boundary.farSurface.support].every(
        (support) =>
          !removed.has(support.source.id) && !revoked(support.source.id, support.ordinal),
      )
    );
  });
  if (!removed.size && retained.length === state.boundaries.length) return;
  const ids = new Set(retained.map((observation) => observation.id));
  state.boundaryKeys = state.boundaryKeys.filter((_, i) => ids.has(state.boundaries[i]!.id));
  state.boundaries = retained;
  state.fragments = state.fragments.filter((fragment) => !removed.has(fragment.observation.id));
  state.bytes = geometryObservations(state).reduce(
    (bytes, observation) => bytes + jsonEncoding(observation).bytes,
    0,
  );
  state.generation++;
  state.finished = false;
  state.unknown = true;
  state.complete = false;
  delete state.featureCursor;
  markAttentionRelationsDirty(world, observerId, ['closing-drop']);
}

function bodyProof(body: ReceivedSceneBody): ObservationFactKey[] {
  return [
    body.sample.fact,
    ...(body.location ? [body.location.fact] : []),
    ...(body.motion ? [body.motion.earlier.fact, body.motion.later.fact] : []),
  ];
}
export function receivedBoundarySeparation(
  anchor: ReceivedBodyGeometry,
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
  const at = Math.min(
    anchor.sample.valueSupportedThrough ?? anchor.sample.valueMeasuredThrough,
    measurement.through,
  );
  if (at < measurement.from) return { status: 'unavailable' };
  const sampleAt = (time: number) => {
    for (const sample of [anchor.location, anchor.motion?.earlier, anchor.motion?.later])
      if (
        sample?.location.kind === 'point' &&
        time >= (sample.valueSupportedFrom ?? sample.valueMeasuredFrom) &&
        time <= (sample.valueSupportedThrough ?? sample.valueMeasuredThrough)
      )
        return { point: sample.location.point, error: sample.location.errorRadius };
    return time >= (anchor.sample.valueSupportedFrom ?? anchor.sample.valueMeasuredFrom) &&
      time <= (anchor.sample.valueSupportedThrough ?? anchor.sample.valueMeasuredThrough)
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
  const constantFrom = Math.max(
    anchor.sample.valueSupportedFrom ?? anchor.sample.valueMeasuredFrom,
    measurement.from,
  );
  const earlier = anchor.motion?.earlier;
  const before =
    constantFrom < at
      ? sampleAt(constantFrom)
      : earlier &&
        (earlier.valueSupportedThrough ?? earlier.valueMeasuredThrough) >= measurement.from &&
        (earlier.valueSupportedThrough ?? earlier.valueMeasuredThrough) < at &&
        sampleAt(earlier.valueSupportedThrough ?? earlier.valueMeasuredThrough);
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
  const state = world.perceptionEvidence![observerId]!.attention!;
  const bodiesByExposure = new Map(bodies.map((body) => [body.exposure, body]));
  const boundariesById = new Map(boundaries.map((value) => [value.observation.id, value]));
  const evaluations: AttentionRelationEvaluation[] = [];
  const observer = entityGet(world.entities, observerId)!,
    ownPoint = worldPosition(observer),
    profile = effectiveBodyProfile(world, observer);
  const heldGeometry = world.perceptionEvidence?.[observerId]?.geometry;
  const oldFrame =
    heldGeometry &&
    (distance3D(heldGeometry.frame.positionAtObservation, ownPoint) > epsilon
      ? { at: heldGeometry.frameAt, frame: heldGeometry.frame }
      : heldGeometry.priorFrame);
  const ownSample = { valueMeasuredFrom: world.simTime, valueMeasuredThrough: world.simTime };
  const ownLocation = {
    ...ownSample,
    location: { kind: 'point' as const, point: ownPoint, errorRadius: 0 },
  };
  const ownBody: ReceivedBodyGeometry = {
    body: { position: ownPoint, radius: profile.radius, height: profile.height },
    sample: ownSample,
    location: ownLocation,
    ...(oldFrame &&
    oldFrame.at < world.simTime &&
    world.simTime - (heldGeometry?.frameAt ?? 0) <
      selectedAttentionPolicy(world).geometry.intervalSeconds
      ? {
          motion: {
            earlier: {
              valueMeasuredFrom: oldFrame.at,
              valueMeasuredThrough: oldFrame.at,
              location: {
                kind: 'point' as const,
                point: oldFrame.frame.positionAtObservation,
                errorRadius: 0,
              },
            },
            later: ownLocation,
          },
        }
      : {}),
  };
  // A tree continuation cannot survive moving members. Rotating received rows
  // instead gives every member finite visits without pretending partial absence
  // is a negative answer. Only a complete unchanged-cut pass can clear a latch.
  const page = <T>(
    entry: { key: string },
    family: 'closing-body' | 'closing-drop',
    values: readonly T[],
    due: boolean,
    allowance: number,
    measure: (value: T) => AttentionRelationWitness | undefined,
    prior: AttentionRelationWitness | undefined,
    priorRequired: boolean,
    knownComplete: boolean,
  ) => {
    const key = JSON.stringify([entry.key, family]);
    const previous = state.relationScans[key];
    const reserved = priorRequired && allowance > 0 ? 1 : 0;
    if (!due) {
      // Reserve exactly the old page allowance, including its prior witness.
      // Skipping clean work must not lend extra visits to this or later anchors.
      return {
        visited:
          Math.min(
            Math.max(0, allowance - reserved),
            values.length,
            previous?.remaining ?? values.length,
          ) + reserved,
      };
    }
    const scan = (state.relationScans[key] ??= {
      cursor: 0,
      remaining: values.length,
      revision: '',
      clearSupported: true,
    });
    // Only this predicate's received dependencies advance its generation.
    const cut = String(state.relationDirty[key]);
    if (scan.revision !== cut) {
      scan.revision = cut;
      scan.remaining = values.length;
      scan.clearSupported = true;
    }
    const count = Math.min(Math.max(0, allowance - reserved), values.length, scan.remaining);
    const witnesses: AttentionRelationWitness[] = [];
    const bounds = family === 'closing-body' ? policy.body : policy.drop;
    for (let i = 0; i < count; i++) {
      const value = values[(scan.cursor + i) % values.length]!;
      const witness = measure(value);
      if (!witness) {
        scan.clearSupported = false;
        continue;
      }
      witnesses.push(witness);
      if (
        !(
          witness.distanceLower > bounds.clear ||
          witness.decreaseLower < policy.minimumDecrease ||
          (family === 'closing-drop' && (witness.dropLower ?? -Infinity) < policy.drop.minimumDrop)
        )
      )
        scan.clearSupported = false;
    }
    scan.cursor = values.length ? (scan.cursor + count) % values.length : 0;
    scan.remaining -= count;
    if (prior && !witnesses.some((value) => value.id === prior.id)) witnesses.push(prior);
    const exhausted = scan.remaining === 0;
    const complete = exhausted && knownComplete;
    const clearSupported = scan.clearSupported && (!priorRequired || !!prior);
    if (scan.remaining === 0) {
      scan.remaining = values.length;
      scan.clearSupported = true;
    }
    return {
      evaluation: {
        anchorKey: entry.key,
        family,
        revision: cut,
        exhausted,
        complete,
        clearSupported,
        witnesses,
      },
      visited: count + reserved,
    };
  };
  let remaining = opportunity.candidates;
  for (let ordinal = 0; ordinal < opportunity.anchors.length; ordinal++) {
    const entry = opportunity.anchors[ordinal]!,
      anchor = entry.sourceId === observerId ? ownBody : scene.bodies.get(entry.sourceId),
      families = opportunity.families.get(entry.key)!;
    if (!anchor) continue;
    const anchorProof = entry.sourceId === observerId ? [] : bodyProof(anchor as ReceivedSceneBody);
    const share = Math.floor(remaining / (opportunity.anchors.length - ordinal));
    const bodyKey = JSON.stringify([entry.key, 'closing-body']),
      bodyLatch = state.latches[bodyKey];
    const bodyMeasure = (neighbor: ReceivedSceneBody): AttentionRelationWitness | undefined => {
      if (neighbor.sourceId === entry.sourceId)
        return {
          id: neighbor.exposure,
          distanceLower: Infinity,
          distanceUpper: Infinity,
          decreaseLower: 0,
          proof: [],
        };
      const relation = receivedSeparation(anchor, neighbor);
      if (
        relation.status !== 'complete' ||
        (relation.decreaseLower === undefined && relation.lower! <= policy.body.clear)
      )
        return undefined;
      return {
        id: neighbor.exposure,
        distanceLower: relation.lower!,
        distanceUpper: relation.upper!,
        decreaseLower: relation.decreaseLower ?? 0,
        proof: [...anchorProof, ...bodyProof(neighbor)].slice(0, 8),
      };
    };
    const priorBody = bodyLatch?.witnessId ? bodiesByExposure.get(bodyLatch.witnessId) : undefined;
    const body = page(
      entry,
      'closing-body',
      bodies,
      families.has('closing-body'),
      Math.ceil(share / 2),
      bodyMeasure,
      families.has('closing-body') && share > 0 && priorBody ? bodyMeasure(priorBody) : undefined,
      !!bodyLatch?.active,
      true,
    );
    remaining -= body.visited;
    if (body.evaluation) evaluations.push(body.evaluation);
    const dropLatch = state.latches[JSON.stringify([entry.key, 'closing-drop'])];
    const dropMeasure = (
      value: (typeof boundaries)[number],
    ): AttentionRelationWitness | undefined => {
      const measured = receivedBoundarySeparation(anchor, value.boundary, {
        from: value.observation.acquiredAt,
        through: geometry.supportedThrough,
      });
      if (
        measured.status !== 'complete' ||
        (measured.decreaseLower === undefined && measured.lower! <= policy.drop.clear)
      )
        return undefined;
      return {
        id: value.observation.id,
        distanceLower: measured.lower!,
        distanceUpper: measured.upper!,
        decreaseLower: measured.decreaseLower ?? 0,
        dropLower: measured.dropLower,
        proof: [...anchorProof, observationFactKey(world, value.observation, value.ordinal)].slice(
          0,
          8,
        ),
      };
    };
    const priorBoundary = dropLatch?.witnessId
      ? boundariesById.get(dropLatch.witnessId)
      : undefined;
    const drop = page(
      entry,
      'closing-drop',
      boundaries,
      families.has('closing-drop'),
      Math.max(0, share - body.visited),
      dropMeasure,
      families.has('closing-drop') && share - body.visited > 0 && priorBoundary
        ? dropMeasure(priorBoundary)
        : undefined,
      !!dropLatch?.active,
      geometry.complete,
    );
    remaining -= drop.visited;
    if (drop.evaluation) evaluations.push(drop.evaluation);
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
    !hasRecordFields(
      state,
      [
        'basis',
        'inputRevision',
        'sourceBasis',
        'episodeId',
        'frame',
        'frameAt',
        'eye',
        'radius',
        'geometryRevision',
        'supportedThrough',
        'generation',
        'nextAt',
        'queryKey',
        'anchorCursor',
        'fragments',
        'boundaries',
        'boundaryKeys',
        'finished',
        'unknown',
        'complete',
        'visited',
        'bytes',
      ],
      ['featureCursor', 'priorFrame'],
    ) ||
    [state.basis, state.sourceBasis, state.episodeId, state.queryKey].some(
      (value) => typeof value !== 'string' || !value,
    ) ||
    !state.frame ||
    !Number.isFinite(state.frameAt) ||
    state.frameAt < 0 ||
    state.frameAt > world.simTime ||
    (state.priorFrame !== undefined &&
      (!hasRecordFields(state.priorFrame, ['at', 'frame']) ||
        !Number.isFinite(state.priorFrame.at) ||
        state.priorFrame.at < 0 ||
        state.priorFrame.at > state.frameAt ||
        !validPerceivedPoint(state.priorFrame.frame?.positionAtObservation) ||
        (state.priorFrame.frame.forwardAtObservation !== undefined &&
          !Number.isFinite(state.priorFrame.frame.forwardAtObservation)))) ||
    !validPerceivedPoint(state.frame.positionAtObservation) ||
    (state.frame.forwardAtObservation !== undefined &&
      !Number.isFinite(state.frame.forwardAtObservation)) ||
    !validPerceivedPoint(state.eye) ||
    !Number.isFinite(state.radius) ||
    state.radius <= 0 ||
    !Number.isSafeInteger(state.geometryRevision) ||
    state.geometryRevision < 0 ||
    !Number.isFinite(state.supportedThrough) ||
    state.supportedThrough < 0 ||
    state.supportedThrough > world.simTime ||
    !Number.isFinite(state.nextAt) ||
    state.nextAt < 0 ||
    [state.generation, state.anchorCursor, state.visited, state.bytes].some(
      (value) => !Number.isSafeInteger(value) || value < 0,
    ) ||
    state.visited > policy.visits ||
    state.bytes > policy.maxBytes ||
    !Number.isSafeInteger(state.inputRevision) ||
    state.inputRevision < 0 ||
    state.inputRevision > (world.sensory?.revision ?? 0) ||
    typeof state.finished !== 'boolean' ||
    typeof state.unknown !== 'boolean' ||
    typeof state.complete !== 'boolean' ||
    state.complete !== (state.finished && !state.unknown) ||
    !Array.isArray(state.fragments) ||
    !Array.isArray(state.boundaries) ||
    state.fragments.length + state.boundaries.length > policy.maxViews ||
    !Array.isArray(state.boundaryKeys) ||
    state.boundaryKeys.length !== state.boundaries.length ||
    new Set(state.boundaryKeys).size !== state.boundaryKeys.length
  )
    throw new Error('Invalid received contextual geometry.');
  const cursor = state.featureCursor;
  if (
    cursor &&
    (!Array.isArray(cursor.pending) ||
      cursor.pending.length > 64 ||
      cursor.pending.some(
        (path) =>
          !Array.isArray(path) ||
          path.length > 64 ||
          path.some(
            (part, index) =>
              part !== 0 &&
              part !== 1 &&
              !(index === path.length - 1 && Number.isInteger(part) && part >= -4 && part <= -1),
          ),
      ) ||
      !Number.isSafeInteger(cursor.offset) ||
      cursor.offset < 0 ||
      cursor.offset > 4 ||
      (cursor.leaf !== undefined && typeof cursor.leaf !== 'boolean') ||
      (cursor.truncated !== undefined && cursor.truncated !== true))
  )
    throw new Error('Invalid received feature continuation.');
  const observations = geometryObservations(state),
    life = world.perceptionEvidence?.[observerId]?.life;
  if (
    new Set(observations.map((value) => value.id)).size !== observations.length ||
    new Set(state.fragments.map((fragment) => fragment.key)).size !== state.fragments.length
  )
    throw new Error('Invalid received feature membership or charging.');
  const patches = new Map(
    state.fragments.map((fragment) => [
      JSON.stringify([fragment.observation.id, fragment.observation.revision]),
      fragment.observation,
    ]),
  );
  for (const fragment of state.fragments) {
    if (
      !hasRecordFields(fragment, ['featureId', 'u0', 'u1', 'v0', 'v1', 'key', 'observation']) ||
      typeof fragment.featureId !== 'string' ||
      !fragment.featureId ||
      [fragment.u0, fragment.u1, fragment.v0, fragment.v1].some(
        (value) => !Number.isFinite(value) || value < 0 || value > 1,
      ) ||
      fragment.u0 >= fragment.u1 ||
      fragment.v0 >= fragment.v1 ||
      fragment.key !== extentKey(fragment) ||
      fragment.observation.facets.length !== 1 ||
      fragment.observation.facets[0]!.value.kind !== 'surface-patch'
    )
      throw new Error('Invalid received feature extent.');
  }
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
    const value = observation.facets[0]!.value;
    if (value.kind === 'physical-boundary')
      for (const surface of [value.boundary.nearSurface, value.boundary.farSurface]) {
        const source = surface.support.source,
          patch = patches.get(JSON.stringify([source.id, source.revision]));
        if (
          source.family !== 'native-exposure' ||
          source.observer.actorId !== observerId ||
          source.observer.physicalLife !== life ||
          surface.support.ordinal !== 0 ||
          patch?.facets[0]?.value.kind !== 'surface-patch'
        )
          throw new Error('Received boundary support is not an owned received surface.');
      }
  }
  if (
    observations.reduce((bytes, observation) => bytes + jsonEncoding(observation).bytes, 0) !==
    state.bytes
  )
    throw new Error('Invalid received feature charging.');
}
