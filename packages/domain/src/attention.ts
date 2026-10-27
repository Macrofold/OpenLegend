import { entityGet } from './entity-collection.js';
import { cloneValue, readOnlyDraftView } from './draft.js';
import { validObserverSubject, type ObserverSubject } from './knowledge.js';
import {
  currentBodyAssociation,
  currentBodyLocalSubject,
  effectiveCurrentFacetSupport,
  publicAttributeMeanings,
  reconcileAttendedTemporalEvidence,
} from './perception-evidence.js';
import { validPerceivedPoint, validateEvidenceSource } from './perception-values.js';
import { personalFactAlias } from './experience-source.js';
import { elapsedDeadline } from './simulation-time.js';
import type {
  ObservationExposure,
  ObservationFactKey,
  ObservedLocation,
  PerceptionEvidenceOwner,
} from './perception-evidence.js';
import type { Position, WorldState } from './types.js';
import {
  selectedAttentionCapacity,
  selectedAttentionFamiliarity,
  selectedAttentionPolicy,
} from './world-composition.js';

export type RecordingReason = 'required' | 'optional' | 'none';
export interface FamiliarityRoot {
  key: string;
  sourceKey: string;
  at: number;
  order: number;
  support: string[];
  required: boolean;
  credited: boolean;
}
export interface FamiliarityState {
  roots: FamiliarityRoot[];
  authored?: { source: string; value: number };
  lastCreditAt?: number;
  nextCreditAt?: number;
  fastCredits: number;
}
export interface RecordingInput {
  source: 'awareness' | 'memory' | 'summary' | 'confirmation';
  eventType?: string;
  modality?: string;
  triggerKind?: string;
  own: boolean;
  hasExposure: boolean;
  exposureKind?: string;
  consequence: boolean;
}
export interface AttentionRetentionPolicy {
  recent: {
    maxAgeSeconds: number;
    maxBytes: number;
    maxChanges: number;
    chunkBytes: number;
    residentChunks: number;
  };
  optional: { maxBytes: number; maxRecords: number };
  required: { maxBytes: number; maxRecords: number };
  speech: { maxBytes: number; maxRecords: number };
  derivedMaxBytes: number;
  impression: {
    maxBytes: number;
    maxClaims: number;
    maxSpans: number;
    weakenAfterSeconds: number;
    expireAfterSeconds: number;
    reinforceIntervalSeconds: number;
  };
  aftermathSeconds: number;
}
export interface AttentionPolicy {
  geometry: {
    intervalSeconds: number;
    patchVisits: number;
    indexVisits: number;
    patchMetres: number;
    errorMetres: number;
    maxFragments: number;
    preparationPatches: number;
  };
  semantic: { discovery: boolean };
  scene: {
    maxBytes: number;
    maxRows: number;
    nodeVisits: number;
    staticBytes: number;
    staticRows: number;
    discoveryBytes: number;
    discoveryRows: number;
    historyBytes: number;
    historyReceipts: number;
    candidateVisits: number;
    initialVisits: number;
    queryVisits: number;
    perAnchorVisits: number;
    maximumQueries: number;
    expansionBytes: number;
    expansionReceipts: number;
  };
  id: string;
  version: number;
  defaultCapacity: number;
  maximumCapacity: number;
  maximumScore: number;
  ongoingShare: number;
  stabilitySeconds: number;
  switchMargin: number;
  familiarityBonus: number;
  displacementMetresPerPoint: number;
  maximumMotionCue: number;
  newDescriptionCue: number;
  urgentCue: number;
  relation: {
    intervalSeconds: number;
    candidates: number;
    clearSeconds: number;
    minimumDecrease: number;
    body: { enter: number; clear: number };
    drop: { enter: number; clear: number; minimumDrop: number };
  };
  retention: AttentionRetentionPolicy;
}
export type AttentionBasis = 'direct' | 'work' | 'explicit' | 'cue' | 'discovery';
interface AttentionPoint {
  point: Position;
  errorRadius: number;
  at: number;
}
export interface AttentionCandidate {
  /** Private routing only; exposure/lease, not entity equality, controls continuity. */
  sourceId: string;
  leaseId: string;
  exposure: ObservationExposure;
  subject?: ObserverSubject;
  descriptionRevision: string;
  changeRevision: string;
  geometryRevision: string;
  presentedDescription?: string;
  presentedChange?: string;
  anchor?: AttentionPoint;
  order: number;
  acquiredAt: number;
  urgency: number;
  urgencyThrough?: number;
  urgencySource?: ObservationFactKey;
  direct: boolean;
  directThrough?: number;
  directSource?: ObservationFactKey;
  score: number;
}
export interface AttentionEntry {
  key: string;
  sourceId: string;
  leaseId: string;
  exposure: ObservationExposure;
  subject?: ObserverSubject;
  descriptionRevision: string;
  changeRevision: string;
  basis: AttentionBasis;
  startedAt: number;
  stableUntil: number;
}
export interface AttentionPresentation {
  key: string;
  descriptionRevision: string;
  changeRevision: string;
  point?: AttentionPoint;
}
export type AttentionRelationFamily = 'closing-body' | 'closing-drop';
export interface AttentionRelationWitness {
  id: string;
  distanceLower: number;
  distanceUpper: number;
  decreaseLower: number;
  dropLower?: number;
  proof: ObservationFactKey[];
}
export interface AttentionRelationEvaluation {
  anchorKey: string;
  family: AttentionRelationFamily;
  revision: string;
  /** Every candidate in this received cut was visited, even if coverage is partial. */
  exhausted: boolean;
  /** The received coverage also supports a complete negative answer. */
  complete: boolean;
  clearSupported: boolean;
  witnesses: AttentionRelationWitness[];
}
export interface AttentionRelationLatch {
  anchorKey: string;
  family: AttentionRelationFamily;
  generation: number;
  active: boolean;
  clearSince?: number;
  entryProof?: ObservationFactKey[];
  newestProof?: ObservationFactKey[];
  revision: string;
  enteredAt?: number;
  witnessId?: string;
}
export interface AttentionRelationScan {
  cursor: number;
  remaining: number;
  revision: string;
  clearSupported: boolean;
}
export interface AttentionCue {
  id: string;
  anchor: AttentionEntry;
  family: AttentionRelationFamily;
  generation: number;
  proof: ObservationFactKey[];
  at: number;
}
export interface AttentionState {
  policy: string;
  nextOrder: number;
  candidates: Record<string, AttentionCandidate>;
  entries: AttentionEntry[];
  explicit: string[];
  latches: Record<string, AttentionRelationLatch>;
  nextRelationAt: number;
  relationCursor: number;
  discoveryCursor: number;
  relationRevision: number;
  relationDirty: Record<string, number>;
  relationScans: Record<string, AttentionRelationScan>;
}
export interface AttentionUpdate {
  changedSourceIds?: readonly string[];
  urgency?: Readonly<Record<string, number>>;
  proofs?: Readonly<Record<string, ObservationFactKey>>;
  directSubjects?: readonly string[];
}
const policyKey = (policy: AttentionPolicy) => JSON.stringify([policy.id, policy.version]);
export const attentionSubjectKey = (sourceId: string, exposure: ObservationExposure) =>
  JSON.stringify([
    exposure.observer.actorId,
    exposure.observer.physicalLife,
    exposure.episodeId,
    sourceId,
  ]);
const relationKey = (key: string, family: AttentionRelationFamily) => JSON.stringify([key, family]);
const owned = (world: WorldState, id: string): PerceptionEvidenceOwner | undefined =>
  world.perceptionEvidence?.[id];
function stateFor(world: WorldState, id: string): AttentionState | undefined {
  const owner = owned(world, id);
  if (!owner) return undefined;
  return (owner.attention ??= {
    policy: policyKey(selectedAttentionPolicy(world)),
    nextOrder: 0,
    candidates: {},
    entries: [],
    explicit: [],
    latches: {},
    nextRelationAt: 0,
    relationCursor: 0,
    discoveryCursor: -1,
    relationRevision: 0,
    relationDirty: {},
    relationScans: {},
  });
}
function point(location: ObservedLocation, at: number): AttentionPoint | undefined {
  return location.kind === 'point'
    ? { point: { ...location.point }, errorRadius: location.errorRadius, at }
    : undefined;
}
function currentPoint(
  owner: PerceptionEvidenceOwner,
  sourceId: string,
  world: WorldState,
  observerId: string,
): AttentionPoint | undefined {
  const source = readOnlyDraftView(owner.current)[`${sourceId}:location`];
  const lease = source && effectiveCurrentFacetSupport(world, observerId, source),
    value = lease && readOnlyDraftView(lease.value);
  return value?.kind === 'location'
    ? point(readOnlyDraftView(value.location), lease!.valueMeasuredThrough)
    : undefined;
}
function descriptions(owner: PerceptionEvidenceOwner, id: string): string {
  // A new receipt can measure the same appearance at another position. Receipt
  // identity is provenance; it must not invent new descriptive novelty.
  const current = readOnlyDraftView(owner.current);
  const facet = (kind: string) => {
    const lease = current[`${id}:${kind}`];
    return lease ? readOnlyDraftView(readOnlyDraftView(lease).value) : undefined;
  };
  const body = facet('body'),
    appearance = body?.kind === 'body' ? readOnlyDraftView(body.body) : undefined;
  const association = facet('association'),
    attributes = facet('public-attributes');
  return JSON.stringify(
    [
      body?.kind === 'body'
        ? {
            kind: appearance!.kind,
            appearance: appearance!.appearance,
            label: appearance!.label,
            description: appearance!.description,
            radius: appearance!.radius,
            height: appearance!.height,
            outward: appearance!.outward,
            heatLit: appearance!.heatLit,
            remainsPhase: appearance!.remainsPhase,
            storage: !!appearance!.storage,
          }
        : null,
      facet('carried') ?? null,
      attributes?.kind === 'public-attributes'
        ? { kind: attributes.kind, attributes: publicAttributeMeanings(attributes) }
        : null,
      association?.kind === 'association'
        ? { subject: association.subject, strength: association.strength }
        : null,
    ],
    (_key, value) => (value && typeof value === 'object' ? readOnlyDraftView(value) : value),
  );
}
function rank(a: AttentionCandidate, b: AttentionCandidate) {
  return b.score - a.score || a.order - b.order;
}
/** Change-fed native selection. A cold call alone enumerates the current body keys.
 * It never reads a source's live entity properties to score received evidence. */
export function updateAttention(
  world: WorldState,
  observerId: string,
  update: AttentionUpdate = {},
): { before: string[]; after: string[] } {
  const observer = entityGet(world.entities, observerId),
    owner = owned(world, observerId);
  if (!observer?.actor || !owner) return { before: [], after: [] };
  const state = stateFor(world, observerId)!;
  const entriesBefore = readOnlyDraftView(state.entries).map((entry) => readOnlyDraftView(entry));
  const before = entriesBefore.map((entry) => entry.sourceId);
  const policy = selectedAttentionPolicy(world);
  state.policy = policyKey(policy);
  const candidatesBefore = Object.values(readOnlyDraftView(state.candidates)).map(
    readOnlyDraftView,
  );
  const expired = candidatesBefore.filter(
    (candidate) =>
      (candidate.urgencyThrough !== undefined && candidate.urgencyThrough <= world.simTime) ||
      (candidate.directThrough !== undefined && candidate.directThrough <= world.simTime),
  );
  const changed = update.changedSourceIds
    ? [
        ...new Set([
          ...update.changedSourceIds,
          ...Object.keys(update.urgency ?? {}),
          ...(update.directSubjects ?? []),
          ...expired.map((candidate) => candidate.sourceId),
        ]),
      ]
    : [
        ...new Set([
          ...Object.values(readOnlyDraftView(owner.current))
            .map((lease) => readOnlyDraftView(lease))
            .filter((lease) => lease.value.kind === 'body')
            .map((lease) => lease.subjectId),
          ...Object.values(readOnlyDraftView(state.candidates)).map(
            (candidate) => candidate.sourceId,
          ),
        ]),
      ];
  const existingBySource = new Map(
    Object.entries(readOnlyDraftView(state.candidates)).map(([key, candidate]) => [
      candidate.sourceId,
      key,
    ]),
  );
  let geometryChanged = false;
  const lostWitness = (key: string) => {
    const previous = readOnlyDraftView(state.candidates)[key];
    if (!previous) return;
    for (const [latchKey, latch] of Object.entries(readOnlyDraftView(state.latches)))
      if (latch.witnessId === previous.exposure.episodeId && latch.clearSince !== undefined)
        delete state.latches[latchKey]!.clearSince;
  };
  for (const sourceId of changed) {
    const bodySource = readOnlyDraftView(owner.current)[`${sourceId}:body`];
    const body = bodySource && readOnlyDraftView(bodySource),
      bodyValue = body && readOnlyDraftView(body.value);
    const previousKey = existingBySource.get(sourceId);
    if (!body || bodyValue?.kind !== 'body') {
      if (previousKey) {
        lostWitness(previousKey);
        delete state.candidates[previousKey];
        geometryChanged = true;
      }
      continue;
    }
    const key = attentionSubjectKey(sourceId, body.exposure);
    if (previousKey && readOnlyDraftView(state.candidates)[previousKey]?.leaseId !== body.id)
      lostWitness(previousKey);
    if (previousKey && previousKey !== key) delete state.candidates[previousKey];
    const originalCandidate = readOnlyDraftView(state.candidates)[key];
    const old = originalCandidate && readOnlyDraftView(originalCandidate);
    const locationSource = readOnlyDraftView(owner.current)[`${sourceId}:location`];
    const location = locationSource && readOnlyDraftView(locationSource);
    const motionSource = readOnlyDraftView(owner.current)[`${sourceId}:observed-motion`];
    const motion = motionSource && readOnlyDraftView(motionSource);
    const measured = currentPoint(owner, sourceId, world, observerId);
    const subject =
      currentBodyAssociation(world, observerId, sourceId) ??
      currentBodyLocalSubject(world, observerId, sourceId);
    const candidate: AttentionCandidate = old
      ? { ...old }
      : {
          sourceId,
          leaseId: body.id,
          exposure: cloneValue(body.exposure),
          order: state.nextOrder++,
          acquiredAt: body.valueAcquiredAt,
          urgency: 0,
          direct: false,
          score: 0,
          descriptionRevision: '',
          changeRevision: '',
          geometryRevision: '',
        };
    candidate.leaseId = body.id;
    candidate.subject = subject ? cloneValue(subject) : undefined;
    candidate.descriptionRevision = descriptions(owner, sourceId);
    candidate.changeRevision = JSON.stringify([
      readOnlyDraftView(body.original).id,
      body.originalOrdinal,
      body.valueAcquiredAt,
      location ? readOnlyDraftView(location.original).id : null,
      location?.originalOrdinal ?? null,
      location?.valueAcquiredAt ?? null,
    ]);
    const geometryRevision = JSON.stringify([
      measured?.point,
      measured?.errorRadius,
      readOnlyDraftView(bodyValue.body).radius,
      readOnlyDraftView(bodyValue.body).height,
      body.id,
      body.revision,
      location?.id,
      location?.revision,
      // Ending an actually received motion interval can establish stationary
      // support without moving the point. Recheck once, not on every clock tick.
      motion?.id,
      motion?.revision,
    ]);
    if (candidate.geometryRevision !== geometryRevision) geometryChanged = true;
    candidate.geometryRevision = geometryRevision;
    candidate.anchor ??= measured;
    if ((candidate.urgencyThrough ?? Infinity) <= world.simTime) {
      candidate.urgency = 0;
      delete candidate.urgencyThrough;
      delete candidate.urgencySource;
    }
    if ((candidate.directThrough ?? Infinity) <= world.simTime) {
      candidate.direct = false;
      delete candidate.directThrough;
      delete candidate.directSource;
    }
    const urgency = update.urgency?.[sourceId] ?? 0;
    // A weaker new event cannot keep an earlier stronger cue alive indefinitely.
    if (urgency > 0 && urgency >= candidate.urgency) {
      candidate.urgency = urgency;
      candidate.urgencyThrough = world.simTime + policy.stabilitySeconds;
      candidate.urgencySource = update.proofs?.[sourceId]
        ? cloneValue(update.proofs[sourceId])
        : undefined;
    }
    if (update.directSubjects?.includes(sourceId)) {
      candidate.direct = true;
      candidate.directThrough = world.simTime + policy.stabilitySeconds;
      candidate.directSource = update.proofs?.[sourceId]
        ? cloneValue(update.proofs[sourceId])
        : undefined;
    }
    const displacement =
      measured && candidate.anchor
        ? Math.max(
            0,
            Math.hypot(
              measured.point.x - candidate.anchor.point.x,
              measured.point.y - candidate.anchor.point.y,
              measured.point.z - candidate.anchor.point.z,
            ) -
              measured.errorRadius -
              candidate.anchor.errorRadius,
          )
        : 0;
    const physical = Math.max(
      candidate.urgency,
      candidate.presentedDescription !== candidate.descriptionRevision
        ? policy.newDescriptionCue
        : 0,
      Math.min(
        policy.maximumMotionCue,
        Math.floor(displacement / policy.displacementMetresPerPoint),
      ),
    );
    candidate.score = Math.min(
      policy.maximumScore,
      physical +
        (policy.familiarityBonus * selectedAttentionFamiliarity(world, observerId, subject)) / 100,
    );
    state.candidates[key] = candidate;
  }
  const live = new Set(Object.keys(state.candidates));
  const explicit = readOnlyDraftView(state.explicit).filter((key) => live.has(key));
  if (explicit.length !== state.explicit.length) state.explicit = explicit;
  for (const [key, latch] of Object.entries(readOnlyDraftView(state.latches)))
    if (!live.has(latch.anchorKey)) delete state.latches[key];
  const capacity = selectedAttentionCapacity(world, observer);
  if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > policy.maximumCapacity)
    throw new Error('Attention capacity exceeds the installed profile.');
  const candidates = Object.entries(readOnlyDraftView(state.candidates)).map(
    ([key, value]) => [key, readOnlyDraftView(value)] as const,
  );
  const candidateMap = new Map(candidates);
  const current = new Map(
    entriesBefore.filter((entry) => live.has(entry.key)).map((entry) => [entry.key, entry]),
  );
  const waiting = candidates.filter(
    ([, candidate]) => candidate.presentedDescription !== candidate.descriptionRevision,
  );
  const previousDiscovery = entriesBefore.find(
    (entry) =>
      entry.basis === 'discovery' &&
      entry.stableUntil > world.simTime &&
      waiting.some(([key]) => key === entry.key),
  );
  const nextWaiting = waiting.filter(([, candidate]) => candidate.order > state.discoveryCursor);
  const oldest = (nextWaiting.length ? nextWaiting : waiting).reduce<
    readonly [string, AttentionCandidate] | undefined
  >((value, entry) => (!value || entry[1].order < value[1].order ? entry : value), undefined);
  const discoveryKey = previousDiscovery?.key ?? oldest?.[0];
  if (discoveryKey && !previousDiscovery)
    state.discoveryCursor = state.candidates[discoveryKey]!.order;
  const selected: Array<{ key: string; basis: AttentionBasis }> = [];
  const take = (key: string, basis: AttentionBasis) => {
    const reservation =
      discoveryKey && key !== discoveryKey && !selected.some((entry) => entry.key === discoveryKey)
        ? 1
        : 0;
    if (selected.length < capacity - reservation && !selected.some((entry) => entry.key === key))
      selected.push({ key, basis: key === discoveryKey ? 'discovery' : basis });
  };
  // A strong received cue can displace optional ongoing detail. Native
  // physical effects remain independent of whether this detail fits attention.
  const urgent: Array<readonly [string, AttentionCandidate]> = [];
  for (const item of candidates)
    if (item[1].urgency >= policy.urgentCue) {
      const at = urgent.findIndex((entry) => rank(item[1], entry[1]) < 0);
      urgent.splice(at < 0 ? urgent.length : at, 0, item);
      if (urgent.length > capacity) urgent.pop();
    }
  for (const [key] of urgent) take(key, 'cue');
  const ongoing = Math.ceil((capacity - 1) * policy.ongoingShare);
  for (const [key, candidate] of candidates)
    if (
      candidate.direct &&
      (candidate.directThrough ?? 0) >= world.simTime &&
      selected.length < ongoing
    )
      take(key, 'direct');
  for (const key of state.explicit) if (selected.length < ongoing) take(key, 'explicit');
  const workTarget = observer.actor.action?.targetId;
  for (const [key, candidate] of candidates)
    if (candidate.sourceId === workTarget && selected.length < ongoing) take(key, 'work');
  const optionalCapacity =
    capacity -
    selected.length -
    (discoveryKey && !selected.some((entry) => entry.key === discoveryKey) ? 1 : 0);
  const incumbents = [...current.values()].filter(
    (entry) => !selected.some((value) => value.key === entry.key) && entry.key !== discoveryKey,
  );
  incumbents.sort((a, b) => rank(candidateMap.get(a.key)!, candidateMap.get(b.key)!));
  const optional = incumbents.slice(0, Math.max(0, optionalCapacity)).map((entry) => entry.key);
  for (const [key, challenger] of candidates) {
    if (
      key === discoveryKey ||
      selected.some((entry) => entry.key === key) ||
      optional.includes(key)
    )
      continue;
    if (optional.length < optionalCapacity) {
      optional.push(key);
      continue;
    }
    let weakest = -1;
    for (let index = 0; index < optional.length; index++) {
      const entry = current.get(optional[index]!);
      if (
        entry &&
        entry.stableUntil > world.simTime &&
        (challenger.urgency < policy.urgentCue ||
          challenger.urgency <= candidateMap.get(entry.key)!.urgency)
      )
        continue;
      if (
        weakest < 0 ||
        rank(candidateMap.get(optional[index]!)!, candidateMap.get(optional[weakest]!)!) > 0
      )
        weakest = index;
    }
    if (
      weakest >= 0 &&
      challenger.score >= candidateMap.get(optional[weakest]!)!.score + policy.switchMargin
    )
      optional[weakest] = key;
  }
  for (const key of optional) take(key, 'cue');
  if (discoveryKey) take(discoveryKey, 'discovery');
  const nextEntries = selected.map(({ key, basis }) => {
    const candidate = candidateMap.get(key)!,
      old = current.get(key);
    if (
      old &&
      old.basis === basis &&
      old.leaseId === candidate.leaseId &&
      old.descriptionRevision === candidate.descriptionRevision &&
      old.changeRevision === candidate.changeRevision &&
      JSON.stringify(old.subject) === JSON.stringify(candidate.subject)
    )
      return old;
    return {
      key,
      sourceId: candidate.sourceId,
      leaseId: candidate.leaseId,
      exposure: cloneValue(candidate.exposure),
      ...(candidate.subject ? { subject: cloneValue(candidate.subject) } : {}),
      descriptionRevision: candidate.descriptionRevision,
      changeRevision: candidate.changeRevision,
      basis,
      startedAt: old?.startedAt ?? world.simTime,
      stableUntil: old?.stableUntil ?? world.simTime + policy.stabilitySeconds,
    };
  });
  if (
    nextEntries.length !== entriesBefore.length ||
    nextEntries.some((entry, index) => entry !== entriesBefore[index])
  )
    state.entries = nextEntries;
  for (const key of Object.keys(state.relationDirty)) {
    const [anchorKey] = JSON.parse(key) as [string, AttentionRelationFamily];
    if (!live.has(anchorKey)) delete state.relationDirty[key];
  }
  for (const key of Object.keys(state.relationScans)) {
    const [anchorKey] = JSON.parse(key) as [string, AttentionRelationFamily];
    if (!live.has(anchorKey)) delete state.relationScans[key];
  }
  if (geometryChanged) markAttentionRelationsDirty(world, observerId);
  for (const entry of state.entries)
    if (!current.has(entry.key))
      for (const family of ['closing-body', 'closing-drop'] as const)
        state.relationDirty[relationKey(entry.key, family)] = state.relationRevision;
  return { before, after: state.entries.map((entry) => entry.sourceId) };
}

export function currentDetailedAttention(
  world: WorldState,
  observerId: string,
): readonly AttentionEntry[] {
  const state = owned(world, observerId)?.attention;
  return state ? readOnlyDraftView(readOnlyDraftView(state).entries) : [];
}
export function setAttentionFocus(
  world: WorldState,
  observerId: string,
  keys: readonly string[],
): boolean {
  const state = stateFor(world, observerId);
  if (
    !state ||
    keys.length > selectedAttentionPolicy(world).maximumCapacity ||
    keys.some((key) => !Object.hasOwn(state.candidates, key))
  )
    return false;
  const next = [...new Set(keys)];
  if (next.length === state.explicit.length && next.every((key, i) => key === state.explicit[i]))
    return true;
  state.explicit = next;
  reconcileAttendedTemporalEvidence(
    world,
    observerId,
    new Set(state.entries.map((entry) => entry.sourceId)),
    [],
    [],
    false,
  );
  return true;
}
export function captureAttentionPresentation(
  world: WorldState,
  observerId: string,
  keys?: readonly string[],
): AttentionPresentation[] {
  const owner = owned(world, observerId),
    state = owner?.attention;
  if (!owner || !state) return [];
  return (keys ?? state.entries.map((entry) => entry.key)).flatMap((key) => {
    const candidate = state.candidates[key];
    return candidate
      ? [
          {
            key,
            descriptionRevision: candidate.descriptionRevision,
            changeRevision: candidate.changeRevision,
            point: currentPoint(owner, candidate.sourceId, world, observerId),
          },
        ]
      : [];
  });
}
export function acknowledgeAttention(
  world: WorldState,
  observerId: string,
  presented: readonly AttentionPresentation[],
): void {
  const state = owned(world, observerId)?.attention;
  if (!state) return;
  const before = new Set(state.entries.map((entry) => entry.sourceId));
  for (const value of presented) {
    const candidate = state.candidates[value.key];
    if (!candidate) continue;
    candidate.presentedDescription = value.descriptionRevision;
    candidate.presentedChange = value.changeRevision;
    // A late successful presentation acknowledges only those supplied revisions;
    // newer received motion remains pending against the actually supplied point.
    candidate.anchor = value.point ? cloneValue(value.point) : candidate.anchor;
    // Merely presenting this body does not acknowledge a later heard/seen event.
    // Its finite native prominence expires independently of the body watermark.
  }
  reconcileAttendedTemporalEvidence(
    world,
    observerId,
    before,
    [],
    presented.flatMap((value) =>
      state.candidates[value.key] ? [state.candidates[value.key]!.sourceId] : [],
    ),
    false,
  );
}

export function markAttentionRelationsDirty(world: WorldState, observerId: string): void {
  const state = owned(world, observerId)?.attention;
  if (!state) return;
  state.relationRevision++;
  for (const entry of state.entries)
    for (const family of ['closing-body', 'closing-drop'] as const)
      state.relationDirty[relationKey(entry.key, family)] = state.relationRevision;
}
/** Only live selected continuations need clock work. Unselected expired cues are
 * cleared by the existing update owner before they can be ranked again. */
export function nextAttentionWorkAt(world: WorldState, observerId: string): number | undefined {
  const source = owned(world, observerId)?.attention;
  if (!source) return;
  const state = readOnlyDraftView(source);
  const candidates = readOnlyDraftView(state.candidates);
  const dirty = readOnlyDraftView(state.relationDirty);
  const latches = readOnlyDraftView(state.latches);
  const policy = selectedAttentionPolicy(world).relation;
  let next = Infinity;
  for (const entry of readOnlyDraftView(state.entries)) {
    const candidate = candidates[entry.key];
    if (candidate?.urgency && candidate.urgencyThrough !== undefined)
      next = Math.min(next, candidate.urgencyThrough);
    if (candidate?.direct && candidate.directThrough !== undefined)
      next = Math.min(next, candidate.directThrough);
    for (const family of ['closing-body', 'closing-drop'] as const) {
      const key = relationKey(entry.key, family);
      if (dirty[key] !== undefined) next = Math.min(next, state.nextRelationAt);
      const latch = latches[key];
      if (latch?.active && latch.clearSince !== undefined)
        next = Math.min(
          next,
          Math.max(state.nextRelationAt, elapsedDeadline(latch.clearSince, policy.clearSeconds)),
        );
    }
  }
  return Number.isFinite(next) ? next : undefined;
}
export function attentionRelationOpportunity(
  world: WorldState,
  observerId: string,
): { anchors: readonly AttentionEntry[]; candidates: number } | undefined {
  const state = owned(world, observerId)?.attention;
  if (!state || !state.entries.length || world.simTime < state.nextRelationAt) return undefined;
  const policy = selectedAttentionPolicy(world);
  const clearDue = new Set(
    Object.values(readOnlyDraftView(state.latches))
      .map((value) => readOnlyDraftView(value))
      .filter(
        (latch) =>
          latch.active &&
          latch.clearSince !== undefined &&
          world.simTime >= elapsedDeadline(latch.clearSince, policy.relation.clearSeconds),
      )
      .map((latch) => latch.anchorKey),
  );
  const due = state.entries.filter(
    (entry) =>
      (['closing-body', 'closing-drop'] as const).some(
        (family) => state.relationDirty[relationKey(entry.key, family)] !== undefined,
      ) || clearDue.has(entry.key),
  );
  if (!due.length) return undefined;
  state.nextRelationAt = world.simTime + policy.relation.intervalSeconds;
  const start = state.relationCursor % due.length;
  state.relationCursor = (start + 1) % due.length;
  return {
    anchors: [...due.slice(start), ...due.slice(0, start)],
    candidates: policy.relation.candidates,
  };
}
export function applyAttentionRelationEvaluations(
  world: WorldState,
  observerId: string,
  evaluations: readonly AttentionRelationEvaluation[],
): AttentionCue[] {
  const state = owned(world, observerId)?.attention;
  if (!state) return [];
  const policy = selectedAttentionPolicy(world).relation,
    cues: AttentionCue[] = [];
  for (const evaluation of evaluations) {
    const anchor = state.entries.find((entry) => entry.key === evaluation.anchorKey);
    if (!anchor) continue;
    if (evaluation.exhausted)
      delete state.relationDirty[relationKey(anchor.key, evaluation.family)];
    const bounds = evaluation.family === 'closing-body' ? policy.body : policy.drop;
    const matches = (witness: AttentionRelationWitness) =>
      witness.distanceUpper <= bounds.enter &&
      witness.decreaseLower >= policy.minimumDecrease &&
      (evaluation.family !== 'closing-drop' ||
        (witness.dropLower ?? -Infinity) >= policy.drop.minimumDrop);
    const witness = evaluation.witnesses.find(matches);
    const key = relationKey(anchor.key, evaluation.family);
    const latch = (state.latches[key] ??= {
      anchorKey: anchor.key,
      family: evaluation.family,
      generation: 0,
      active: false,
      revision: evaluation.revision,
    });
    const sameCut = latch.revision === evaluation.revision;
    latch.revision = evaluation.revision;
    const supportedClear =
      evaluation.clearSupported &&
      (!latch.active || evaluation.witnesses.some((value) => value.id === latch.witnessId)) &&
      evaluation.witnesses.every(
        (value) =>
          value.distanceLower > bounds.clear ||
          value.decreaseLower < policy.minimumDecrease ||
          (evaluation.family === 'closing-drop' &&
            (value.dropLower ?? -Infinity) < policy.drop.minimumDrop),
      );
    if (witness) {
      latch.clearSince = undefined;
      latch.newestProof = cloneValue(witness.proof);
      if (!latch.active) {
        latch.active = true;
        latch.generation++;
        latch.entryProof = cloneValue(witness.proof);
        latch.enteredAt = world.simTime;
        latch.witnessId = witness.id;
        cues.push({
          id: JSON.stringify([key, latch.generation]),
          anchor: cloneValue(anchor),
          family: evaluation.family,
          generation: latch.generation,
          proof: cloneValue(witness.proof),
          at: world.simTime,
        });
      }
    } else if (evaluation.complete && supportedClear) {
      // A complete fresh pass can confirm the ongoing interval even when the
      // global revision advanced for unrelated received input.
      latch.clearSince ??= world.simTime;
      if (world.simTime - latch.clearSince >= policy.clearSeconds) {
        latch.active = false;
        latch.entryProof = undefined;
        latch.newestProof = undefined;
        latch.witnessId = undefined;
      }
    } else if (!sameCut || evaluation.exhausted || !supportedClear) {
      // A bounded partial page is not a reception gap. Keep an already supported
      // interval only for this unchanged cut; rearming still needs a full pass.
      latch.clearSince = undefined;
    }
  }
  return cues;
}

/** Pending native conditions, including anchors rotated out of detailed context.
 * The same generation remains one cause until complete evidence rearms it. */
export function currentAttentionCues(
  world: WorldState,
  observerId: string,
): Array<{
  id: string;
  anchorKey: string;
  sourceId: string;
  subject?: ObserverSubject;
  family: AttentionRelationFamily;
  generation: number;
  proof: ObservationFactKey[];
  at: number;
}> {
  const state = owned(world, observerId)?.attention;
  if (!state) return [];
  const candidates = readOnlyDraftView(state.candidates);
  return Object.entries(readOnlyDraftView(state.latches)).flatMap(([key, value]) => {
    const latch = readOnlyDraftView(value),
      candidate = candidates[latch.anchorKey];
    return latch.active && candidate && latch.entryProof && latch.enteredAt !== undefined
      ? [
          {
            id: JSON.stringify([key, latch.generation]),
            anchorKey: latch.anchorKey,
            sourceId: candidate.sourceId,
            ...(candidate.subject ? { subject: candidate.subject } : {}),
            family: latch.family,
            generation: latch.generation,
            proof: latch.entryProof,
            at: latch.enteredAt,
          },
        ]
      : [];
  });
}
/** Correcting a measurement withdraws only conditions supported by that fact.
 * It does not fabricate the complete negative measurement needed for rearming. */
export function revokeAttentionEvidence(
  world: WorldState,
  observerId: string,
  affected: ReadonlySet<string>,
): void {
  const state = owned(world, observerId)?.attention;
  if (!state) return;
  const revoked = (fact: ObservationFactKey | undefined) =>
    !!fact &&
    (affected.has(fact.source.id) ||
      affected.has(personalFactAlias(fact.source.id, fact.ordinal)) ||
      affected.has(JSON.stringify(fact)) ||
      affected.has(JSON.stringify(fact.source)));
  const changed: string[] = [];
  for (const candidate of Object.values(state.candidates)) {
    if (revoked(candidate.urgencySource)) {
      candidate.urgency = 0;
      delete candidate.urgencyThrough;
      delete candidate.urgencySource;
      changed.push(candidate.sourceId);
    }
    if (revoked(candidate.directSource)) {
      candidate.direct = false;
      delete candidate.directThrough;
      delete candidate.directSource;
      changed.push(candidate.sourceId);
    }
  }
  for (const [key, latch] of Object.entries(state.latches)) {
    // A pending all-clear interval is optional derived evidence. A correction
    // cannot preserve it by omission merely because its original alarm survived.
    if (affected.size) delete latch.clearSince;
    if (![...(latch.entryProof ?? []), ...(latch.newestProof ?? [])].some((fact) => revoked(fact)))
      continue;
    latch.active = false;
    delete latch.entryProof;
    delete latch.newestProof;
    delete latch.enteredAt;
    delete latch.witnessId;
    delete latch.clearSince;
    state.relationDirty[key] = ++state.relationRevision;
    delete state.relationScans[key];
  }
  if (changed.length)
    reconcileAttendedTemporalEvidence(world, observerId, undefined, [], changed, false);
}

/** Current-save boundary: exact references are validated by the owning perception validator. */
export function validateAttentionState(
  value: unknown,
  policy: Pick<AttentionPolicy, 'maximumCapacity' | 'maximumScore'>,
): asserts value is AttentionState {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid attention continuation.');
  const state = value as AttentionState;
  if (
    typeof state.policy !== 'string' ||
    !state.policy ||
    !Number.isSafeInteger(state.nextOrder) ||
    state.nextOrder < 0 ||
    !state.candidates ||
    typeof state.candidates !== 'object' ||
    Array.isArray(state.candidates) ||
    !Array.isArray(state.entries) ||
    state.entries.length > policy.maximumCapacity ||
    !Array.isArray(state.explicit) ||
    state.explicit.length > policy.maximumCapacity ||
    new Set(state.explicit).size !== state.explicit.length ||
    !state.latches ||
    typeof state.latches !== 'object' ||
    Array.isArray(state.latches) ||
    !Number.isFinite(state.nextRelationAt) ||
    state.nextRelationAt < 0 ||
    !Number.isSafeInteger(state.relationCursor) ||
    state.relationCursor < 0 ||
    !Number.isSafeInteger(state.discoveryCursor) ||
    state.discoveryCursor < -1 ||
    !Number.isSafeInteger(state.relationRevision) ||
    state.relationRevision < 0 ||
    !state.relationDirty ||
    typeof state.relationDirty !== 'object' ||
    Array.isArray(state.relationDirty) ||
    !state.relationScans ||
    typeof state.relationScans !== 'object' ||
    Array.isArray(state.relationScans)
  )
    throw new Error('Invalid attention continuation.');
  const validPoint = (value: AttentionPoint | undefined) =>
    value === undefined ||
    (validPerceivedPoint(value.point) &&
      Number.isFinite(value.errorRadius) &&
      value.errorRadius >= 0 &&
      Number.isFinite(value.at) &&
      value.at >= 0);
  const validExposure = (value: ObservationExposure | undefined) =>
    !!value &&
    !!value.observer &&
    typeof value.observer.actorId === 'string' &&
    !!value.observer.actorId &&
    Number.isSafeInteger(value.observer.physicalLife) &&
    value.observer.physicalLife >= 0 &&
    typeof value.episodeId === 'string' &&
    !!value.episodeId;
  const validProof = (proof: ObservationFactKey[] | undefined) => {
    if (proof === undefined) return;
    if (!Array.isArray(proof) || !proof.length || proof.length > 8)
      throw new Error('Invalid attention relation proof.');
    for (const fact of proof) {
      if (!fact || !Number.isSafeInteger(fact.ordinal) || fact.ordinal < 0)
        throw new Error('Invalid attention relation proof.');
      validateEvidenceSource(fact.source);
    }
  };
  for (const [key, candidate] of Object.entries(state.candidates)) {
    if (
      !candidate ||
      typeof candidate.sourceId !== 'string' ||
      !candidate.sourceId ||
      typeof candidate.leaseId !== 'string' ||
      !candidate.leaseId ||
      !validExposure(candidate.exposure) ||
      key !== attentionSubjectKey(candidate.sourceId, candidate.exposure) ||
      typeof candidate.descriptionRevision !== 'string' ||
      !candidate.descriptionRevision ||
      typeof candidate.changeRevision !== 'string' ||
      !candidate.changeRevision ||
      typeof candidate.geometryRevision !== 'string' ||
      !candidate.geometryRevision ||
      !Number.isSafeInteger(candidate.order) ||
      candidate.order < 0 ||
      candidate.order >= state.nextOrder ||
      !Number.isFinite(candidate.acquiredAt) ||
      candidate.acquiredAt < 0 ||
      !Number.isFinite(candidate.score) ||
      candidate.score < 0 ||
      candidate.score > policy.maximumScore ||
      !Number.isFinite(candidate.urgency) ||
      candidate.urgency < 0 ||
      candidate.urgency > 10 ||
      (candidate.urgency > 0 && candidate.urgencyThrough === undefined) ||
      (candidate.urgencyThrough !== undefined &&
        (!Number.isFinite(candidate.urgencyThrough) || candidate.urgencyThrough < 0)) ||
      typeof candidate.direct !== 'boolean' ||
      (candidate.directThrough !== undefined &&
        (!Number.isFinite(candidate.directThrough) || candidate.directThrough < 0)) ||
      !validPoint(candidate.anchor) ||
      (candidate.presentedDescription !== undefined &&
        typeof candidate.presentedDescription !== 'string') ||
      (candidate.presentedChange !== undefined && typeof candidate.presentedChange !== 'string') ||
      (candidate.subject !== undefined && !validObserverSubject(candidate.subject))
    )
      throw new Error('Invalid attention candidate.');
    for (const fact of [candidate.urgencySource, candidate.directSource])
      if (fact) {
        validateEvidenceSource(fact.source);
        if (
          !Number.isSafeInteger(fact.ordinal) ||
          fact.ordinal < 0 ||
          fact.source.observer.actorId !== candidate.exposure.observer.actorId ||
          fact.source.observer.physicalLife !== candidate.exposure.observer.physicalLife
        )
          throw new Error('Invalid received attention cue.');
      }
  }
  if (
    new Set(state.entries.map((entry) => entry.key)).size !== state.entries.length ||
    state.entries.some((entry) => {
      const candidate = state.candidates[entry.key];
      return (
        !candidate ||
        entry.sourceId !== candidate.sourceId ||
        entry.leaseId !== candidate.leaseId ||
        !validExposure(entry.exposure) ||
        attentionSubjectKey(entry.sourceId, entry.exposure) !== entry.key ||
        entry.descriptionRevision !== candidate.descriptionRevision ||
        entry.changeRevision !== candidate.changeRevision ||
        !Number.isFinite(entry.startedAt) ||
        entry.startedAt < 0 ||
        !Number.isFinite(entry.stableUntil) ||
        entry.stableUntil < entry.startedAt ||
        !['direct', 'work', 'explicit', 'cue', 'discovery'].includes(entry.basis) ||
        (entry.subject !== undefined && !validObserverSubject(entry.subject))
      );
    }) ||
    state.explicit.some((key) => !state.candidates[key])
  )
    throw new Error('Invalid selected attention.');
  for (const [key, latch] of Object.entries(state.latches)) {
    if (
      !latch ||
      !state.candidates[latch.anchorKey] ||
      !['closing-body', 'closing-drop'].includes(latch.family) ||
      key !== relationKey(latch.anchorKey, latch.family) ||
      !Number.isSafeInteger(latch.generation) ||
      latch.generation < 0 ||
      typeof latch.active !== 'boolean' ||
      typeof latch.revision !== 'string' ||
      (latch.clearSince !== undefined &&
        (!Number.isFinite(latch.clearSince) || latch.clearSince < 0)) ||
      (latch.enteredAt !== undefined &&
        (!Number.isFinite(latch.enteredAt) || latch.enteredAt < 0)) ||
      (latch.witnessId !== undefined &&
        (typeof latch.witnessId !== 'string' || !latch.witnessId)) ||
      (latch.active && (!latch.entryProof || latch.enteredAt === undefined || !latch.witnessId))
    )
      throw new Error('Invalid attention relation latch.');
    validProof(latch.entryProof);
    validProof(latch.newestProof);
    const observer = state.candidates[latch.anchorKey]!.exposure.observer;
    if (
      [...(latch.entryProof ?? []), ...(latch.newestProof ?? [])].some(
        (fact) =>
          fact.source.observer.actorId !== observer.actorId ||
          fact.source.observer.physicalLife !== observer.physicalLife,
      )
    )
      throw new Error('Attention relation proof belongs to another observer life.');
  }
  for (const [key, revision] of Object.entries(state.relationDirty)) {
    let tuple: unknown;
    try {
      tuple = JSON.parse(key);
    } catch {
      throw new Error('Invalid attention relation continuation.');
    }
    if (
      !Array.isArray(tuple) ||
      tuple.length !== 2 ||
      !state.candidates[tuple[0]] ||
      !['closing-body', 'closing-drop'].includes(tuple[1]) ||
      !Number.isSafeInteger(revision) ||
      revision < 0 ||
      revision > state.relationRevision
    )
      throw new Error('Invalid attention relation continuation.');
  }
  for (const [key, scan] of Object.entries(state.relationScans)) {
    let tuple: unknown;
    try {
      tuple = JSON.parse(key);
    } catch {
      throw new Error('Invalid attention relation scan.');
    }
    if (
      !Array.isArray(tuple) ||
      tuple.length !== 2 ||
      !state.candidates[tuple[0]] ||
      !['closing-body', 'closing-drop'].includes(tuple[1]) ||
      !scan ||
      !Number.isSafeInteger(scan.cursor) ||
      scan.cursor < 0 ||
      !Number.isSafeInteger(scan.remaining) ||
      scan.remaining < 0 ||
      typeof scan.revision !== 'string' ||
      typeof scan.clearSupported !== 'boolean'
    )
      throw new Error('Invalid attention relation scan.');
  }
}
