import { receivedValueAt } from './received-values.js';
import {
  currentFacetGet,
  currentFacetValues,
  currentContactFacetGet,
} from './perception-current.js';
import { isImmutableData } from './records.js';
import { contentLabel } from './events.js';
import { entityGet } from './entity-collection.js';
import { cloneValue, readOnlyDraftView, touchNativeEvidence } from './draft.js';
import { validObserverSubject, type ObserverSubject } from './knowledge.js';
import { countDomainWork } from './diagnostic-counters.js';
import {
  prepareCurrentBodySubjects,
  effectiveCurrentFacetTimes,
  currentFacetOriginal,
  currentFacetTimes,
  currentFacetExposure,
  currentFacetGrant,
  receivedBodyParts,
  publicAttributeMeanings,
  receivedFacetValue,
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
    visits: number;
    extentMetres: number;
    errorMetres: number;
    maxViews: number;
    maxBytes: number;
    featurePriority: Readonly<Record<'support' | 'solid-face', number>>;
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
export interface AttentionAnnotation {
  /** Private routing only; exposure/lease, not entity equality, controls continuity. */
  sourceId: string;
  leaseId: string;
  exposure: ObservationExposure;
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
}
/** Read product, never a second saved copy of received facts. */
export interface AttentionCandidate extends AttentionAnnotation {
  subject?: ObserverSubject;
  descriptionRevision: string;
  changeRevision: string;
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
  anchor: AttentionRelationAnchor;
  family: AttentionRelationFamily;
  generation: number;
  proof: ObservationFactKey[];
  at: number;
}
export interface AttentionRelationAnchor {
  key: string;
  sourceId: string;
  subject?: ObserverSubject;
  descriptionRevision: string;
}
export const SELF_RELATION_KEY = '@self';
export interface AttentionState {
  policy: string;
  nextOrder: number;
  annotations: Record<string, AttentionAnnotation>;
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
  /** Actually received geometry changes; omitted callers conservatively use changed sources. */
  geometrySourceIds?: readonly string[];
  urgency?: Readonly<Record<string, number>>;
  proofs?: Readonly<Record<string, ObservationFactKey>>;
  directSubjects?: readonly string[];
}
const policyKey = (policy: AttentionPolicy, capacity?: number) =>
  JSON.stringify([
    policy.id,
    policy.version,
    capacity,
    policy.maximumCapacity,
    policy.maximumScore,
    policy.ongoingShare,
    policy.stabilitySeconds,
    policy.switchMargin,
    policy.familiarityBonus,
    policy.displacementMetresPerPoint,
    policy.maximumMotionCue,
    policy.newDescriptionCue,
    policy.urgentCue,
    policy.relation,
  ]);
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
  touchNativeEvidence(world, 'perception', id);
  const owner = owned(world, id);
  if (!owner) return undefined;
  return (owner.attention ??= {
    policy: policyKey(selectedAttentionPolicy(world)),
    nextOrder: 0,
    annotations: {},
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
  const source = currentFacetGet(owner, `${sourceId}:location`);
  if (!source) return;
  const lease = readOnlyDraftView(source);
  const value = receivedValueAt(world.receivedValues?.sources ?? {}, lease.value.reference);
  const at = effectiveCurrentFacetTimes(world, observerId, lease).valueMeasuredThrough;
  if (value?.kind === 'body-pose') return { point: { ...value.pose.position }, errorRadius: 0, at };
  return value?.kind === 'location' ? point(readOnlyDraftView(value.location), at) : undefined;
}
interface DescriptionMeaning {
  next: WeakMap<object, DescriptionMeaning>;
  value?: string;
}
const descriptionMeanings = new WeakMap<object, DescriptionMeaning>();
const absentDescriptionInput = Object.freeze({});
function descriptions(world: WorldState, owner: PerceptionEvidenceOwner, id: string): string {
  // A new receipt can measure the same appearance at another position. Receipt
  // identity is provenance; it must not invent new descriptive novelty.
  const current = readOnlyDraftView(owner.current);

  const facet = (kind: string) => {
    const lease = currentContactFacetGet(current, `${id}:${kind}`);
    return lease
      ? receivedFacetValue(world, readOnlyDraftView(readOnlyDraftView(lease).value))
      : undefined;
  };
  // Description novelty depends on outward detail, never a reconstructed pose.
  const bodySource = currentContactFacetGet(current, `${id}:body`),
    bodyDescriptor = bodySource && readOnlyDraftView(bodySource).value,
    parts = bodyDescriptor && receivedBodyParts(world, bodyDescriptor),
    appearance = parts && readOnlyDraftView(parts.details);
  const description = facet('description'),
    association = facet('association'),
    attributes = facet('public-attributes'),
    carried = facet('carried');
  // Source-only pose/receipt changes preserve these actual received fragments.
  // Share their descriptive meaning across compatible receivers without retaining
  // a world or treating a comparison cache as a new acquisition or identity grant.
  const inputs = [description, carried, attributes, association];
  const reusable =
    appearance &&
    isImmutableData(appearance) &&
    inputs.every((input) => input === undefined || isImmutableData(input));
  let prepared: DescriptionMeaning | undefined;
  if (reusable) {
    let node: DescriptionMeaning = descriptionMeanings.get(appearance) ?? { next: new WeakMap() };
    descriptionMeanings.set(appearance, node);
    for (const input of inputs) {
      const key = input ?? absentDescriptionInput;
      let next: DescriptionMeaning | undefined = node.next.get(key);
      if (!next) node.next.set(key, (next = { next: new WeakMap() }));
      node = next;
    }
    prepared = node;
  }
  if (prepared?.value !== undefined) {
    countDomainWork('attentionDescriptionReuses');
    return prepared.value;
  }
  countDomainWork('attentionDescriptionPreparations');
  const value = JSON.stringify(
    [
      appearance
        ? {
            kind: appearance!.kind,
            appearance: appearance!.appearance,
            label: appearance!.label,
            description:
              description?.kind === 'description' ? description.text : appearance!.description,
            radius: appearance!.radius,
            height: appearance!.height,
            outward: appearance!.outward,
            heatLit: appearance!.heatLit,
            remainsPhase: appearance!.remainsPhase,
            storage: !!appearance!.storage,
          }
        : null,
      carried ?? null,
      attributes?.kind === 'public-attributes'
        ? { kind: attributes.kind, attributes: publicAttributeMeanings(attributes) }
        : null,
      association?.kind === 'association'
        ? { subject: association.subject, strength: association.strength }
        : null,
    ],
    (_key, value) => (value && typeof value === 'object' ? readOnlyDraftView(value) : value),
  );
  // This label only ranks optional descriptive novelty. It grants no evidence,
  // identity, permission or deduplication; those retain exact bodies and revisions.
  const revision = `${value.length}:${contentLabel(value)}`;
  if (prepared) prepared.value = revision;
  return revision;
}
/** Rebuild only the requested view from admitted current evidence. Reading this
 * never samples, acknowledges, credits familiarity or changes future selection. */
export function attentionCandidates(
  world: WorldState,
  observerId: string,
  keys?: readonly string[],
): Record<string, AttentionCandidate> {
  const owner = owned(world, observerId),
    state = owner?.attention;
  if (!owner || !state || keys?.length === 0) return {};
  const annotations = readOnlyDraftView(state.annotations);
  const subjectFor = prepareCurrentBodySubjects(world, observerId);
  const policy = selectedAttentionPolicy(world);
  const result: Record<string, AttentionCandidate> = {};
  for (const key of keys ?? Object.keys(annotations)) {
    const annotationSource = annotations[key];
    if (!annotationSource) continue;
    const annotation = readOnlyDraftView(annotationSource);
    const body = currentFacetGet(owner, `${annotation.sourceId}:body`);
    if (!body || body.id !== annotation.leaseId) continue;
    const location = currentFacetGet(owner, `${annotation.sourceId}:location`);
    const measured = currentPoint(owner, annotation.sourceId, world, observerId);
    const subject = subjectFor(annotation.sourceId);
    const descriptionRevision = descriptions(world, owner, annotation.sourceId);
    const displacement =
      measured && annotation.anchor
        ? Math.max(
            0,
            Math.hypot(
              measured.point.x - annotation.anchor.point.x,
              measured.point.y - annotation.anchor.point.y,
              measured.point.z - annotation.anchor.point.z,
            ) -
              measured.errorRadius -
              annotation.anchor.errorRadius,
          )
        : 0;
    const urgency =
      (annotation.urgencyThrough ?? Infinity) > world.simTime ? annotation.urgency : 0;
    const physical = Math.max(
      urgency,
      annotation.presentedDescription !== descriptionRevision ? policy.newDescriptionCue : 0,
      Math.min(
        policy.maximumMotionCue,
        Math.floor(displacement / policy.displacementMetresPerPoint),
      ),
    );
    result[key] = {
      ...annotation,
      urgency,
      direct: annotation.direct && (annotation.directThrough ?? Infinity) > world.simTime,
      subject,
      descriptionRevision,
      changeRevision: JSON.stringify([
        currentFacetOriginal(owner, body).id,
        body.originalOrdinal,
        currentFacetTimes(owner, body).valueAcquiredAt,
        location ? currentFacetOriginal(owner, location).id : null,
        location?.originalOrdinal ?? null,
        location ? currentFacetTimes(owner, location).valueAcquiredAt : null,
      ]),
      score: Math.min(
        policy.maximumScore,
        physical +
          (policy.familiarityBonus * selectedAttentionFamiliarity(world, observerId, subject)) /
            100,
      ),
    };
  }
  return result;
}
function rank(a: AttentionCandidate, b: AttentionCandidate) {
  return b.score - a.score || a.order - b.order;
}
/** Quiet received revisions still refresh selected detail and relation work below.
 * Only skip competition when the same choices remain valid even after optional
 * incumbent stability expires; discovery keeps its independent rotation deadline. */
function retainedSelection(
  state: AttentionState,
  entries: readonly AttentionEntry[],
  candidates: readonly (readonly [string, AttentionCandidate])[],
  capacity: number,
  policy: AttentionPolicy,
  now: number,
): Array<{ key: string; basis: AttentionBasis }> | undefined {
  const current = Object.fromEntries(candidates);
  if (
    state.explicit.length ||
    entries.length !== Math.min(capacity, candidates.length) ||
    entries.some(
      (entry) => !current[entry.key] || (entry.basis !== 'cue' && entry.basis !== 'discovery'),
    ) ||
    candidates.some(([, candidate]) => candidate.direct || candidate.urgency >= policy.urgentCue)
  )
    return;
  const selected = new Set(entries.map((entry) => entry.key));
  const waiting = candidates.some(
    ([, candidate]) => candidate.presentedDescription !== candidate.descriptionRevision,
  );
  const discovery = entries.find((entry) => entry.basis === 'discovery');
  const held = discovery && current[discovery.key];
  if (
    waiting
      ? !discovery ||
        discovery.stableUntil <= now ||
        !held ||
        held.presentedDescription === held.descriptionRevision
      : !!discovery
  )
    return;
  // Below-threshold cues cannot displace a stable incumbent. Current score
  // changes can still reorder incumbents, exactly as the full owner does.
  const optional = entries
    .filter((entry) => entry.basis === 'cue')
    .sort((a, b) => rank(current[a.key]!, current[b.key]!));
  let weakestExpired = Infinity;
  for (const entry of optional) {
    const candidate = current[entry.key];
    if (!candidate) return;
    if (entry.stableUntil <= now) weakestExpired = Math.min(weakestExpired, candidate.score);
  }
  if (
    candidates.some(
      ([key, candidate]) =>
        !selected.has(key) && candidate.score >= weakestExpired + policy.switchMargin,
    )
  )
    return;
  const result = optional.map(({ key, basis }) => ({ key, basis }));
  if (discovery) result.push({ key: discovery.key, basis: 'discovery' });
  return result;
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
  const previousRelationAnchors = new Set(
    attentionRelationAnchors(world, observerId).map((entry) => entry.key),
  );
  const entriesBefore = readOnlyDraftView(state.entries).map((entry) => readOnlyDraftView(entry));
  const before = entriesBefore.map((entry) => entry.sourceId);
  const policy = selectedAttentionPolicy(world);
  const capacity = selectedAttentionCapacity(world, observer);
  const nextPolicy = policyKey(policy, capacity);
  const policyChanged = state.policy !== nextPolicy;
  state.policy = nextPolicy;
  const annotationEntries = Object.entries(readOnlyDraftView(state.annotations));
  const expired = annotationEntries.filter(
    ([, value]) =>
      (value.urgencyThrough ?? Infinity) <= world.simTime ||
      (value.directThrough ?? Infinity) <= world.simTime,
  );
  const changed =
    update.changedSourceIds && !policyChanged
      ? [
          ...new Set([
            ...update.changedSourceIds,
            ...Object.keys(update.urgency ?? {}),
            ...(update.directSubjects ?? []),
            ...expired.map(([, value]) => value.sourceId),
          ]),
        ]
      : [
          ...new Set([
            ...currentFacetValues(owner)
              .filter((lease) => lease.value.kind === 'body')
              .map((lease) => currentFacetGrant(owner, lease).subjectId),
            ...annotationEntries.map(([, value]) => value.sourceId),
          ]),
        ];
  const existingBySource = new Map(annotationEntries.map(([key, value]) => [value.sourceId, key]));
  const changedGeometrySources = new Set(update.geometrySourceIds ?? changed);
  const changedGeometryKeys = new Set<string>();
  let geometryChanged = false;
  const lostWitness = (key: string) => {
    const previous = readOnlyDraftView(state.annotations)[key];
    if (!previous) return;
    for (const [latchKey, latch] of Object.entries(readOnlyDraftView(state.latches)))
      if (latch.witnessId === previous.exposure.episodeId && latch.clearSince !== undefined)
        delete state.latches[latchKey]!.clearSince;
  };
  for (const sourceId of changed) {
    const body = currentFacetGet(owner, `${sourceId}:body`);
    const previousKey = existingBySource.get(sourceId);
    if (!body || !receivedBodyParts(world, readOnlyDraftView(body.value))) {
      if (previousKey) {
        lostWitness(previousKey);
        delete state.annotations[previousKey];
        geometryChanged = true;
      }
      continue;
    }
    const exposure = currentFacetExposure(owner, body);
    const key = attentionSubjectKey(sourceId, exposure);
    if (previousKey && readOnlyDraftView(state.annotations)[previousKey]?.leaseId !== body.id)
      lostWitness(previousKey);
    if (previousKey && previousKey !== key) delete state.annotations[previousKey];
    const original = readOnlyDraftView(state.annotations)[key];
    const old = original && readOnlyDraftView(original);
    const annotation: AttentionAnnotation = old
      ? { ...old, leaseId: body.id }
      : {
          sourceId,
          leaseId: body.id,
          exposure: cloneValue(exposure),
          order: state.nextOrder++,
          acquiredAt: currentFacetTimes(owner, body).valueAcquiredAt,
          urgency: 0,
          direct: false,
        };
    annotation.anchor ??= currentPoint(owner, sourceId, world, observerId);
    if (!old || changedGeometrySources.has(sourceId)) {
      geometryChanged = true;
      changedGeometryKeys.add(key);
    }
    if ((annotation.urgencyThrough ?? Infinity) <= world.simTime) {
      annotation.urgency = 0;
      delete annotation.urgencyThrough;
      delete annotation.urgencySource;
    }
    if ((annotation.directThrough ?? Infinity) <= world.simTime) {
      annotation.direct = false;
      delete annotation.directThrough;
      delete annotation.directSource;
    }
    const urgency = update.urgency?.[sourceId] ?? 0;
    if (urgency > 0 && urgency >= annotation.urgency) {
      annotation.urgency = urgency;
      annotation.urgencyThrough = world.simTime + policy.stabilitySeconds;
      annotation.urgencySource = update.proofs?.[sourceId]
        ? cloneValue(update.proofs[sourceId])
        : undefined;
    }
    if (update.directSubjects?.includes(sourceId)) {
      annotation.direct = true;
      annotation.directThrough = world.simTime + policy.stabilitySeconds;
      annotation.directSource = update.proofs?.[sourceId]
        ? cloneValue(update.proofs[sourceId])
        : undefined;
    }
    if (
      !old ||
      Object.keys(annotation).length !== Object.keys(old).length ||
      (Object.keys(annotation) as Array<keyof AttentionAnnotation>).some(
        (field) => annotation[field] !== old[field],
      )
    ) {
      state.annotations[key] = annotation;
      countDomainWork('attentionCandidatesChanged');
    } else countDomainWork('attentionCandidatesUnchanged');
  }
  const candidateView = attentionCandidates(world, observerId);
  const candidateEntriesBefore = Object.entries(candidateView);
  const live = new Set(Object.keys(candidateView));
  const explicit = readOnlyDraftView(state.explicit).filter((key) => live.has(key));
  if (explicit.length !== state.explicit.length) state.explicit = explicit;
  for (const [key, latch] of Object.entries(readOnlyDraftView(state.latches)))
    if (latch.anchorKey !== SELF_RELATION_KEY && !live.has(latch.anchorKey))
      delete state.latches[key];
  if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > policy.maximumCapacity)
    throw new Error('Attention capacity exceeds the installed profile.');
  const current = new Map(
    entriesBefore.filter((entry) => live.has(entry.key)).map((entry) => [entry.key, entry]),
  );
  let retained: Array<{ key: string; basis: AttentionBasis }> | undefined;
  if (
    update.changedSourceIds &&
    !expired.length &&
    !Object.keys(update.urgency ?? {}).length &&
    !update.directSubjects?.length &&
    !observer.actor.action?.targetId
  ) {
    retained = retainedSelection(
      state,
      entriesBefore,
      candidateEntriesBefore,
      capacity,
      policy,
      world.simTime,
    );
  }
  let selected: Array<{ key: string; basis: AttentionBasis }>;
  if (retained) {
    selected = retained;
    countDomainWork('attentionSelectionsReused');
  } else {
    countDomainWork('attentionSelectionsRanked');
    const candidates = Object.entries(candidateView).map(
      ([key, value]) => [key, readOnlyDraftView(value)] as const,
    );
    const candidateMap = new Map(candidates);
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
      state.discoveryCursor = candidateMap.get(discoveryKey)!.order;
    selected = [];
    const take = (key: string, basis: AttentionBasis) => {
      const reservation =
        discoveryKey &&
        key !== discoveryKey &&
        !selected.some((entry) => entry.key === discoveryKey)
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
    for (const key of readOnlyDraftView(state.explicit))
      if (selected.length < ongoing) take(key, 'explicit');
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
  }
  const nextEntries = selected.map(({ key, basis }) => {
    const candidate = candidateView[key]!,
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
  for (const key of Object.keys(readOnlyDraftView(state.relationDirty))) {
    const [anchorKey] = JSON.parse(key) as [string, AttentionRelationFamily];
    if (anchorKey !== SELF_RELATION_KEY && !live.has(anchorKey)) delete state.relationDirty[key];
  }
  for (const key of Object.keys(readOnlyDraftView(state.relationScans))) {
    const [anchorKey] = JSON.parse(key) as [string, AttentionRelationFamily];
    if (anchorKey !== SELF_RELATION_KEY && !live.has(anchorKey)) delete state.relationScans[key];
  }
  if (policyChanged) {
    // An interval under the old criterion/capacity cannot certify the new one.
    // Preserve the alarm generation while a fresh full pass restarts clearance.
    for (const latch of Object.values(state.latches)) if (latch.active) delete latch.clearSince;
    markAttentionRelationsDirty(world, observerId);
  } else if (geometryChanged) {
    // Any received body can approach a selected anchor. A static drop instead
    // depends on that anchor's own geometry, not an unrelated moving neighbor.
    markAttentionRelationsDirty(world, observerId, ['closing-body']);
    const anchors = new Set(
      attentionRelationAnchors(world, observerId)
        .filter((entry) => changedGeometryKeys.has(entry.key))
        .map((entry) => entry.key),
    );
    if (anchors.size) markAttentionRelationsDirty(world, observerId, ['closing-drop'], anchors);
  }
  for (const entry of attentionRelationAnchors(world, observerId))
    if (!previousRelationAnchors.has(entry.key))
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
/** Relation context is independent of descriptive attention slots. Work/direct
 * anchors are still only current received bodies; a stale action target grants nothing. */
export function attentionRelationAnchors(
  world: WorldState,
  observerId: string,
): AttentionRelationAnchor[] {
  const owner = owned(world, observerId),
    state = owner?.attention;
  if (!state) return [];
  const result: AttentionRelationAnchor[] = [
    {
      key: SELF_RELATION_KEY,
      sourceId: observerId,
      descriptionRevision: JSON.stringify(['self', owner.life]),
    },
  ];
  const selected = new Set<string>();
  for (const entry of readOnlyDraftView(state.entries)) {
    result.push(entry);
    selected.add(entry.key);
  }
  const target = entityGet(world.entities, observerId)?.actor?.action?.targetId;
  const annotations = readOnlyDraftView(state.annotations);
  const keys = Object.keys(annotations).filter((key) => {
    const value = annotations[key]!;
    return (
      !selected.has(key) &&
      (value.sourceId === target ||
        (value.direct && (value.directThrough ?? Infinity) > world.simTime))
    );
  });
  const candidates = attentionCandidates(world, observerId, keys);
  for (const key in candidates) {
    const candidate = readOnlyDraftView(candidates[key]!);
    if (
      !selected.has(key) &&
      (candidate.sourceId === target ||
        (candidate.direct && (candidate.directThrough ?? Infinity) > world.simTime))
    )
      result.push({
        key,
        sourceId: candidate.sourceId,
        descriptionRevision: candidate.descriptionRevision,
        ...(candidate.subject ? { subject: candidate.subject } : {}),
      });
  }
  return result;
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
    keys.some((key) => !Object.hasOwn(state.annotations, key))
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
  const selected = keys ?? state.entries.map((entry) => entry.key);
  const candidates = attentionCandidates(world, observerId, selected);
  return selected.flatMap((key) => {
    const candidate = candidates[key];
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
    const candidate = state.annotations[value.key];
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
      state.annotations[value.key] ? [state.annotations[value.key]!.sourceId] : [],
    ),
    false,
  );
}

export function markAttentionRelationsDirty(
  world: WorldState,
  observerId: string,
  families: readonly AttentionRelationFamily[] = ['closing-body', 'closing-drop'],
  anchors?: ReadonlySet<string>,
): void {
  const state = owned(world, observerId)?.attention;
  if (!state) return;
  touchNativeEvidence(world, 'perception', observerId);
  state.relationRevision++;
  for (const entry of attentionRelationAnchors(world, observerId))
    if (!anchors || anchors.has(entry.key))
      for (const family of families)
        state.relationDirty[relationKey(entry.key, family)] = state.relationRevision;
}
/** Only live selected continuations need clock work. Unselected expired cues are
 * cleared by the existing update owner before they can be ranked again. */
export function nextAttentionWorkAt(world: WorldState, observerId: string): number | undefined {
  const source = owned(world, observerId)?.attention;
  if (!source) return;
  const state = readOnlyDraftView(source);
  const candidates = readOnlyDraftView(state.annotations);
  const dirty = readOnlyDraftView(state.relationDirty);
  const latches = readOnlyDraftView(state.latches);
  const policy = selectedAttentionPolicy(world).relation;
  let next = Infinity;
  for (const entry of attentionRelationAnchors(world, observerId)) {
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
):
  | {
      anchors: readonly AttentionRelationAnchor[];
      families: ReadonlyMap<string, ReadonlySet<AttentionRelationFamily>>;
      candidates: number;
    }
  | undefined {
  const state = owned(world, observerId)?.attention;
  if (!state || world.simTime < state.nextRelationAt) return undefined;
  touchNativeEvidence(world, 'perception', observerId);
  const policy = selectedAttentionPolicy(world);
  const families = new Map<string, Set<AttentionRelationFamily>>();
  const due = attentionRelationAnchors(world, observerId).filter((entry) => {
    const pending = new Set<AttentionRelationFamily>();
    for (const family of ['closing-body', 'closing-drop'] as const) {
      const key = relationKey(entry.key, family),
        latch = state.latches[key];
      if (
        state.relationDirty[key] === undefined &&
        latch?.active &&
        latch.clearSince !== undefined &&
        world.simTime >= elapsedDeadline(latch.clearSince, policy.relation.clearSeconds)
      ) {
        // No dirty input and the completed scan/latch agree on this cut. Rebase
        // only their comparison key; no proof, cursor or clear interval advances.
        // Keep deadline work pending across partial pages without a sibling job.
        const scan = state.relationScans[key];
        const sameCut = scan && scan.revision !== '' && scan.revision === latch.revision;
        state.relationDirty[key] = ++state.relationRevision;
        if (sameCut) {
          const revision = String(state.relationRevision);
          scan.revision = revision;
          latch.revision = revision;
        } else delete latch.clearSince;
      }
      if (state.relationDirty[key] !== undefined) pending.add(family);
    }
    if (pending.size) families.set(entry.key, pending);
    return pending.size > 0;
  });
  if (!due.length) return undefined;
  state.nextRelationAt = world.simTime + policy.relation.intervalSeconds;
  const start = state.relationCursor % due.length;
  state.relationCursor = (start + 1) % due.length;
  return {
    anchors: [...due.slice(start), ...due.slice(0, start)],
    families,
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
  touchNativeEvidence(world, 'perception', observerId);
  const policy = selectedAttentionPolicy(world).relation,
    cues: AttentionCue[] = [];
  const anchors = new Map(
    attentionRelationAnchors(world, observerId).map((entry) => [entry.key, entry]),
  );
  for (const evaluation of evaluations) {
    const anchor = anchors.get(evaluation.anchorKey);
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
    // Negative scan progress belongs to its scan, not an alarm that never
    // existed. A cleared positive generation stays available for its next cue.
    if (!witness && !state.latches[key]?.active) continue;
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
  descriptionRevision: string;
  subject?: ObserverSubject;
  family: AttentionRelationFamily;
  generation: number;
  proof: ObservationFactKey[];
  at: number;
}> {
  const state = owned(world, observerId)?.attention;
  if (!state) return [];
  const candidates = attentionCandidates(world, observerId, [
    ...new Set(Object.values(readOnlyDraftView(state.latches)).map((latch) => latch.anchorKey)),
  ]);
  const self: AttentionRelationAnchor = {
    key: SELF_RELATION_KEY,
    sourceId: observerId,
    descriptionRevision: JSON.stringify(['self', owned(world, observerId)!.life]),
  };
  return Object.entries(readOnlyDraftView(state.latches)).flatMap(([key, value]) => {
    const latch = readOnlyDraftView(value),
      candidate = latch.anchorKey === SELF_RELATION_KEY ? self : candidates[latch.anchorKey];
    return latch.active && candidate && latch.entryProof && latch.enteredAt !== undefined
      ? [
          {
            id: JSON.stringify([key, latch.generation]),
            anchorKey: latch.anchorKey,
            sourceId: candidate.sourceId,
            descriptionRevision: candidate.descriptionRevision,
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
  for (const candidate of Object.values(state.annotations)) {
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
    if (affected.size && latch.clearSince !== undefined) {
      delete latch.clearSince;
      if (latch.active) state.relationDirty[key] = ++state.relationRevision;
    }
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
  observer: ObservationExposure['observer'],
): asserts value is AttentionState {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid attention continuation.');
  const state = value as AttentionState;
  if (
    typeof state.policy !== 'string' ||
    !state.policy ||
    !Number.isSafeInteger(state.nextOrder) ||
    state.nextOrder < 0 ||
    !state.annotations ||
    typeof state.annotations !== 'object' ||
    Array.isArray(state.annotations) ||
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
    value.observer.actorId === observer.actorId &&
    value.observer.physicalLife === observer.physicalLife &&
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
  for (const [key, candidate] of Object.entries(state.annotations)) {
    if (
      !candidate ||
      typeof candidate.sourceId !== 'string' ||
      !candidate.sourceId ||
      typeof candidate.leaseId !== 'string' ||
      !candidate.leaseId ||
      !validExposure(candidate.exposure) ||
      key !== attentionSubjectKey(candidate.sourceId, candidate.exposure) ||
      !Number.isSafeInteger(candidate.order) ||
      candidate.order < 0 ||
      candidate.order >= state.nextOrder ||
      !Number.isFinite(candidate.acquiredAt) ||
      candidate.acquiredAt < 0 ||
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
      (candidate.presentedChange !== undefined && typeof candidate.presentedChange !== 'string')
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
      const candidate = state.annotations[entry.key];
      return (
        !candidate ||
        entry.sourceId !== candidate.sourceId ||
        entry.leaseId !== candidate.leaseId ||
        !validExposure(entry.exposure) ||
        attentionSubjectKey(entry.sourceId, entry.exposure) !== entry.key ||
        typeof entry.descriptionRevision !== 'string' ||
        !entry.descriptionRevision ||
        typeof entry.changeRevision !== 'string' ||
        !entry.changeRevision ||
        !Number.isFinite(entry.startedAt) ||
        entry.startedAt < 0 ||
        !Number.isFinite(entry.stableUntil) ||
        entry.stableUntil < entry.startedAt ||
        !['direct', 'work', 'explicit', 'cue', 'discovery'].includes(entry.basis) ||
        (entry.subject !== undefined && !validObserverSubject(entry.subject))
      );
    }) ||
    state.explicit.some((key) => !state.annotations[key])
  )
    throw new Error('Invalid selected attention.');
  for (const [key, latch] of Object.entries(state.latches)) {
    if (
      !latch ||
      (latch.anchorKey !== SELF_RELATION_KEY && !state.annotations[latch.anchorKey]) ||
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
      (tuple[0] !== SELF_RELATION_KEY && !state.annotations[tuple[0]]) ||
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
      (tuple[0] !== SELF_RELATION_KEY && !state.annotations[tuple[0]]) ||
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
