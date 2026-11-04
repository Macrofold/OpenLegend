import { objectIndexEntries } from './object-index.js';
import { orderedRecordGet, orderedRecordSet, orderedRecordEntries } from './ordered-record.js';
import { selectReceivedBindingParts, mergeReceivedBindings } from './received-batches.js';
import {
  receivedTrackKey,
  currentFacetObserver,
  currentNativeFacet,
  currentNativeFacetTimes,
  currentFacetTimes,
  currentFacetKey,
  projectCurrentFacet,
  sameCurrentFacetContent,
  currentGroupFacetRecord,
  currentGroupsSetRecording,
  currentFacetSupport,
  currentContactEntries,
  currentContactGet,
  currentGroupTimes,
  currentGroupRecordings,
  type CurrentPartPartition,
  type CurrentFacetTimes,
  type CurrentMemberPart,
} from './perception-current.js';
import {
  temporalPageReceipts,
  temporalPageReceipt,
  temporalReceiptValues,
  temporalPageReferences,
  markTemporalPageEdited,
  temporalPageMutation,
  replaceTemporalPageReceipts,
  temporalPageMetadata,
  appendTemporalPageBatch,
  receivedBatchChargeDirectory,
  receivedBindingChargeProjection,
  receivedBatchStorageBytes,
  selectTemporalPageEntries,
  materializeReceivedEntry,
  materializeReceivedBindingSeed,
  type TemporalCheckpoint,
  type TemporalCheckpointAvailability,
} from './temporal-frames.js';
import {
  compareReceivedPosition,
  receivedPositionEligible,
  receivedStateEligible,
  type ReceivedBatch,
  type ReceivedBinding,
  type ReceivedCoverage,
  type ReceivedEntry,
  type ReceivedChargeDirectory,
  type ReceivedRecentDirectory,
  type ReceivedFrontier,
  type ReceivedPosition,
  type ReceivedAddress,
} from './received-batches.js';
export * from './received-batches.js';
import {
  temporalRecognitionSupportSourceIds,
  temporalReadSourceRevoked,
  captureTemporalReadContext,
  type CapturedTemporalHistoryContext,
  type TemporalReadSource,
} from './temporal-read-context.js';
import { nextId } from './data.js';
import { canonicalJson } from './events.js';
import {
  retainReceivedValue,
  type ReceivedValueReference,
  receivedValueAt,
  type ReceivedValueState,
  type ReceivedValueLookup,
  type ReceivedValueFragment,
} from './received-values.js';
import {
  prepareWorldSnapshots,
  cloneValue,
  readOnlyDraftView,
  touchNativeEvidence,
} from './draft.js';
import { entityGet } from './entity-collection.js';
import { hasMemory } from './living.js';
import { chargeWork } from './work-budget.js';
import { countDomainWork, domainCountersEnabled } from './diagnostic-counters.js';
import {
  ensureExperienceAccounting,
  markRequiredExperienceMaintenance,
} from './remembered-impressions.js';
import {
  acquireKnownPlaceCapsules,
  invalidateKnownPlaceEvidence,
  temporalKnownPlaceCapsules,
} from './known-place-evidence.js';
import { personalFactAlias, parsePersonalFactAlias } from './experience-source.js';
import { immutableDataSnapshot, jsonEncoding, jsonText, jsonByteLength } from './records.js';
import {
  selectedRecognitionSupportSourceIds,
  selectedMarkRecentIndividualReferences,
  selectedRequestRecentIndividualRepair,
  selectedTemporalPolicy,
  selectedAttentionPolicy,
} from './world-composition.js';
import type { WorldState } from './types.js';
import type { ObserverSubject } from './knowledge.js';
import {
  receivedFacetValue,
  sensoryFacetDependencies,
  splitObservedBody,
  materializeObservedBody,
  receivedObservationFrame,
  receivedBodyParts,
  contributionFactKey,
  selectedTemporalCurrentGroups,
} from './perception-evidence.js';
import type {
  CurrentFacetRecord,
  CurrentFacetProof,
  CurrentReceivedGroup,
} from './perception-current.js';
import type {
  EvidenceSource,
  PerceptionEvidenceOwner,
  ReceivedObservation,
  LiveFacetSupport,
  ObservationContribution,
  ObservationFactKey,
  ObservedLocation,
  ObservationFrame,
  ObservationExposure,
  ObservationOrigin,
  SensoryFacet,
  CapturedCurrentFacet,
  ReceivedLocationSample,
  ReceivedFacetProof,
  ObservedBodyDetails,
  ObservedBodyPose,
  ReceivedFacetValue,
} from './perception-evidence.js';

/** An address proves neither reception nor access. Readers first select the actor's receipt. */
export interface TemporalReceiptLocator {
  actorId: string;
  physicalLife: number;
  epoch: string;
  batchOrder: number;
  entryIndex: number;
}
export function temporalReceiptId(
  locator: Pick<TemporalReceiptLocator, 'epoch' | 'batchOrder' | 'entryIndex'>,
): string {
  return `temporal-receipt-${locator.epoch}-${locator.batchOrder}-${locator.entryIndex}`;
}
export interface TemporalValueReference {
  valueRef: ReceivedValueReference;
}
export type TemporalValue =
  | SensoryFacet
  | {
      kind: 'personal-account';
      source: 'awareness' | 'memory';
      id: string;
      text: string;
      eventType?: string;
      content?: string;
      data?: Record<string, unknown>;
    };
/** Geometry may be shared; the receipt still owns exactly who received it and how. */
export type TemporalFragment =
  | Exclude<TemporalValue, { kind: 'body' | 'location' | 'observed-motion' }>
  | { kind: 'body'; body: ObservedBodyDetails }
  | { kind: 'location'; location: ObservedLocation }
  | { kind: 'body-pose'; pose: ObservedBodyPose };
export type TemporalReception =
  | { kind: 'body'; pose: ObservedBodyPose; poseRef?: never }
  | { kind: 'body'; poseRef: ReceivedValueReference; pose?: never }
  | { kind: 'location'; frame: ObservationFrame };
interface TemporalValueProjection {
  value: TemporalFragment;
  reception?: TemporalReception;
}
export interface TemporalFacetReference extends TemporalValueReference {
  /** Stable received member track, independent of value and physical packing. */
  track?: string;
  support?: ReceivedFacetProof;
  /** A body read combines a new pose with independently received outward detail. */
  detailSupport?: {
    proof: ReceivedFacetProof;
    role: TemporalFacetReference['role'];
    from: number;
    through: number;
    acquiredAt: number;
  };
  poseFrame?: ObservationFrame;
  memberIndex: number;
  role: 'direct' | 'inference' | 'testimony';
  asOf: number;
  measuredFrom: number;
  measuredThrough: number;
  acquiredAt: number;
  /** An actual held-view confirmation, without changing the original measurement. */
  confirmedThrough?: number;
  original?: ObservationFactKey;
  /** Exact live measurement revision; original is its acquired provenance root. */
  receivedFrom?: EvidenceSource;
  /** Personal measurement proof is never part of shared geometry identity. */
  reception?: TemporalReception;
}
/** The single dependency visitor for a recorded field and its shared pose. */
export function temporalFacetValueReferences(
  facet: Pick<TemporalFacetReference, 'valueRef' | 'reception'>,
): string[] {
  return [
    facet.valueRef,
    ...(facet.reception?.kind === 'body' && facet.reception.poseRef
      ? [facet.reception.poseRef]
      : []),
  ].filter((reference): reference is string => typeof reference === 'string');
}

export interface TemporalReceipt extends TemporalReceiptLocator {
  id: string;
  at: number;
  order: number;
  acquisition: number;
  receiverFrame?: ObservationFrame;
  coverageGap?: { from: number; through: number };
  spatialContext?: true;
  origin?: ObservationOrigin;
  /** Observer-local continuous exposure, not a canonical identity. */
  subject: string;
  /** Recording scope only: these attended exposures shared this received context. */
  contextSubjects?: string[];
  subjectIdentity?: ObserverSubject;
  change:
    | 'baseline'
    | 'change'
    | 'loss'
    | 'unchecked'
    | 'occurrence'
    | 'attention-exit'
    | 'receiver-frame'
    | 'retained-state';
  availability?: TemporalCheckpointAvailability[];
  availabilityAt?: number;
  required: boolean;
  /** Source lookup aliases include facet provenance; only independent account
   * aliases revoke the whole receipt. Neither grants hidden hydration. */
  sourceIds: string[];
  facets: TemporalFacetReference[];
}
export interface TemporalPage {
  id: string;
  appendClosed?: true;
  order: number;
  actorId: string;
  physicalLife: number;
  epoch: string;
  fromAt: number;
  throughAt: number;
  subjects: string[];
  sourceIds: string[];
  individualIds: string[];
  sourceRefs: string[];
  bytes: number;
  count: number;
  batches: ReceivedBatch[];
}
type NativeEvidenceSource = Extract<
  EvidenceSource,
  { family: 'native-exposure' | 'native-response' }
>;
/** Active admitted coverage lives beside current received metadata, never in
 * freshness partition identity and never as an unrecorded future-close promise. */
export interface TemporalCurrentGroupCheckpoint {
  epoch: string;
  binding: ReceivedBinding;
  carrier?: ReceivedAddress;
  carrierMembers?: ReceivedCoverage['members'];
  members: readonly { kind: string; part: 'value' | 'detail' | 'pose' }[];
  lastToken?: number;
  lastTimes: CurrentFacetTimes;
  lastSource: NativeEvidenceSource;
  lastAt: number;
  lastOrder: number;
  lastMeasurementRevision: number;
  gap: boolean;
}
export interface TemporalCurrentGroupInput {
  subjectId: string;
  sampleToken?: number;
  group: CurrentReceivedGroup;
  partition: CurrentPartPartition;
  originalSource: ReceivedObservation;
  checked: boolean;
  entering: boolean;
  exiting: boolean;
}
export interface TemporalActorHistory {
  physicalLife: number;
  epoch: string;
  /** Resident append/tail only. The repository owns cold chunks and indexed retirement. */
  pages: TemporalPage[];
  bytes: number;
  count: number;
  nextDue: number | null;
  maintenanceDue: boolean;
  /** Conservative unavailable-prefix coverage, not a ledger of fictional sensory losses. */
  releasedThrough?: number;
  frontier?: ReceivedFrontier;
  /** Rebuilt from canonical block directories; excluded by the save codec. */
  recent: ReceivedRecentDirectory;
  /** Finite exceptional sparse-edit work, coalesced by the existing retention owner. */
  individualRepairs?: string[];
  recordingGap?: { from: number; through: number };
  /** Sparse exact qualifying contact support, not an autobiographical archive. */
  supports?: Record<string, TemporalSupportCapsule>;
  accounts?: {
    nextDue: number | null;
    optional: { bytes: number; count: number };
    required: { bytes: number; count: number };
    speech: { bytes: number; count: number };
    archives?: Record<'optional' | 'required' | 'speech', { bytes: number; count: number }>;
  };
}
export interface TemporalSupportCapsule {
  receipt: TemporalReceipt;
  /** Same order as retained facets. Their original ordinals are never renumbered. */
  values: TemporalFragment[];
  bytes: number;
  required: boolean;
}
export interface TemporalEvidenceState {
  version: 1;
  /** Existing server timeline identity on restoration; native creation uses saved IDs. */
  namespace: string;
  actors: Record<string, TemporalActorHistory>;
}
/** A receipt expires at its deadline, independently of physical collection.
 * Minimum support already owned by another account has its own lifetime. */
export function temporalRecentAt(at: number, now: number, maxAgeSeconds: number): boolean {
  return at + maxAgeSeconds > now;
}

export interface TemporalRetentionPolicy {
  maxAgeSeconds: number;
  maxBytes: number;
  maxChanges: number;
}
export interface TemporalCaptureInput {
  availabilityAt?: number;
  receivedAt?: number;
  receivedOrder?: number;
  availability?: TemporalCheckpointAvailability[];
  receiverFrame?: ObservationFrame;
  subject: string;
  contextSubjects?: readonly string[];
  subjectIdentity?: ObserverSubject;
  change: Exclude<TemporalReceipt['change'], 'retained-state'>;
  required?: boolean;
  sourceIds?: string[];
  origin?: ObservationOrigin;
  facets: Array<
    {
      memberIndex?: number;
      support?: ReceivedFacetProof;
      detailSupport?: TemporalFacetReference['detailSupport'];
      poseFrame?: ObservationFrame;
      role: TemporalFacetReference['role'];
      asOf: number;
      measuredFrom: number;
      measuredThrough: number;
      acquiredAt: number;
      confirmedThrough?: number;
      original?: ObservationFactKey;
      receivedFrom?: EvidenceSource;
    } & (
      | {
          value: TemporalValue;
          /** A saved producer watermark; reuse still verifies the received value. */
          retainedValue?: TemporalValueReference;
        }
      | {
          /** Prepared from an already selected current descriptor. Admission still
           * verifies that this exact neutral object occupies the selected address. */
          received: { projection: TemporalValueProjection; reference: TemporalValueReference };
        }
    )
  >;
}

/** Native buffer granularity bounds work; it is not authored memory policy. */
const TEMPORAL_NATIVE_PAGE_BYTES = 64 * 1024;
const byteLength = jsonByteLength;
function valueEncoding(value: TemporalFragment): { json: string; bytes: number } {
  const held = readOnlyDraftView(value);
  // Encode common geometry components once through their existing immutable
  // encoding owner, rather than traversing a new personal wrapper per witness.
  if (held.kind === 'location') {
    const location = jsonEncoding(readOnlyDraftView(held.location));
    const prefix = '{"kind":"location","location":';
    return { json: `${prefix}${location.json}}`, bytes: prefix.length + location.bytes + 1 };
  }
  return jsonEncoding(held);
}

/** This projection changes storage identity, never the received measurement. */
export function splitTemporalValue(value: TemporalValue): TemporalValueProjection {
  const held = readOnlyDraftView(value);
  if (held.kind === 'body') {
    const parts = splitObservedBody(held.body);
    return {
      value: { kind: 'body', body: parts.details },
      reception: { kind: 'body', pose: parts.pose },
    };
  }
  if (held.kind === 'location')
    return {
      value: { kind: 'location', location: held.location },
      reception: { kind: 'location', frame: held.frame },
    };
  if (held.kind === 'observed-motion')
    throw new Error('Motion must be recorded as its received samples.');
  return { value: held };
}

/** Readers call this only after selecting an actor-owned receipt. A shared
 * fragment alone grants neither a frame, an identity nor a received route. */
export function materializeTemporalValue(
  reference: Pick<TemporalFacetReference, 'reception'>,
  fragment: ReceivedValueFragment,
  sources: ReceivedValueLookup = {},
): TemporalValue | undefined {
  const value = receivedTemporalFragment(readOnlyDraftView(fragment));
  if (!value) return;
  const reception = reference.reception && readOnlyDraftView(reference.reception);
  if (value.kind === 'body') {
    if (reception?.kind !== 'body') return;
    const held = reception.poseRef ? receivedValueAt(sources, reception.poseRef) : undefined;
    const pose = reception.pose ?? (held?.kind === 'body-pose' ? held.pose : undefined);
    return pose ? { kind: 'body', body: materializeObservedBody(value.body, pose) } : undefined;
  }
  if (value.kind === 'location' || value.kind === 'body-pose')
    return reception?.kind === 'location'
      ? {
          kind: 'location',
          location:
            value.kind === 'body-pose'
              ? { kind: 'point', point: value.pose.position, errorRadius: 0 }
              : value.location,
          frame: reception.frame,
        }
      : undefined;
  return reception === undefined ? value : undefined;
}

/** Expanded read values already contain their complete personal reception. Do
 * not expose or charge a duplicate copy on the selected receipt as well. */
export function temporalReceiptForRead(receipt: TemporalReceipt): TemporalReceipt {
  if (!receipt.facets.some((facet) => facet.reception !== undefined)) return receipt;
  return {
    ...receipt,
    facets: receipt.facets.map(({ reception: _reception, ...reference }) => reference),
  };
}

const addedFieldBytes = (name: string, valueBytes: number) => name.length + 4 + valueBytes;
function receptionBytes(reference: Pick<TemporalFacetReference, 'reception'>): number {
  return reference.reception
    ? addedFieldBytes('reception', jsonEncoding(readOnlyDraftView(reference.reception)).bytes)
    : 0;
}

/** Logical retention keeps the complete personal charge despite physical sharing.
 * Compose already encoded components; do not rebuild a complete value to bill it. */
export function temporalValueLogicalBytes(
  reference: Pick<TemporalFacetReference, 'reception'>,
  fragment: TemporalFragment,
): number {
  return valueLogicalBytes(reference, fragment, valueEncoding(fragment).bytes);
}

function valueLogicalBytes(
  reference: Pick<TemporalFacetReference, 'reception'>,
  fragment: TemporalFragment,
  fragmentBytes: number,
): number {
  const value = readOnlyDraftView(fragment);
  const reception = reference.reception && readOnlyDraftView(reference.reception);
  if (value.kind === 'body' && reception?.kind === 'body' && reception.pose)
    return (
      fragmentBytes +
      addedFieldBytes('position', jsonEncoding(reception.pose.position).bytes) +
      addedFieldBytes('heading', byteLength(reception.pose.heading)) +
      addedFieldBytes('supportSurfaceId', byteLength(reception.pose.supportSurfaceId))
    );
  if (value.kind === 'location' && reception?.kind === 'location')
    return fragmentBytes + addedFieldBytes('frame', jsonEncoding(reception.frame).bytes);
  if (value.kind === 'body-pose' && reception?.kind === 'location')
    return byteLength({
      kind: 'location',
      location: { kind: 'point', point: value.pose.position, errorRadius: 0 },
      frame: reception.frame,
    });
  if (value.kind === 'location' || value.kind === 'body-pose' || reception !== undefined)
    throw new Error('Temporal geometry has no matching personal reception.');
  return fragmentBytes;
}

export function temporalReceiptLogicalBytes(receipt: TemporalReceipt): number {
  return jsonEncoding(readOnlyDraftView(receipt)).bytes - 0;
}

export function temporalPageLogicalBytes(page: TemporalPage, sources: ReceivedValueLookup): number {
  return page.batches.reduce(
    (sum, batch) => sum + batch.entries.reduce((sum, entry) => sum + entry.charge.bytes, 0),
    0,
  );
}

export function temporalSupportLogicalBytes(capsule: TemporalSupportCapsule): number {
  let bytes = byteLength(capsule);
  capsule.receipt.facets.forEach((reference, index) => {
    const fragment = capsule.values[index];
    if (!fragment) throw new Error('Temporal support requires every selected value.');
    const fragmentBytes = valueEncoding(fragment).bytes;
    bytes +=
      valueLogicalBytes(reference, fragment, fragmentBytes) -
      fragmentBytes -
      receptionBytes(reference);
  });
  return bytes;
}
export function receivedTemporalFragment(
  value: ReceivedValueFragment | undefined,
): TemporalFragment | undefined {
  return value?.kind === 'observation-header' || value?.kind === 'observation-frame'
    ? undefined
    : value;
}
function retainedValueAt(
  sources: ReceivedValueLookup,
  reference: TemporalValueReference,
): TemporalFragment | undefined {
  const value = receivedValueAt(sources, reference);
  return receivedTemporalFragment(value);
}
/** Retain neutral authority directly. Expanding a body/motion only to split it
 * again copies shared measurements and serializes an identical new wrapper for
 * every witness. Personal reception stays inline in the unchanged receipt shape. */
function currentTemporalProjection(
  world: WorldState,
  descriptor: ReceivedFacetValue,
): TemporalValueProjection | undefined {
  const fragment = receivedValueAt(world.receivedValues?.sources ?? {}, descriptor.reference);
  const value = receivedTemporalFragment(fragment);
  if (
    !value ||
    (value.kind !== descriptor.kind &&
      !(descriptor.kind === 'location' && value.kind === 'body-pose'))
  )
    return;
  const reception = descriptor.reception;
  if (value.kind === 'body') {
    const parts = receivedBodyParts(world, descriptor);
    return parts && reception?.kind === 'body'
      ? { value, reception: { kind: 'body', poseRef: reception.poseRef } }
      : undefined;
  }
  if (value.kind === 'location' || value.kind === 'body-pose')
    return reception?.kind === 'location'
      ? {
          value,
          reception: {
            kind: 'location',
            frame: receivedObservationFrame(world, reception.frameRef),
          },
        }
      : undefined;
  return reception === undefined ? { value } : undefined;
}
function initialBytes(value: { bytes: number }, measure = () => byteLength(value)): number {
  for (let attempt = 0; attempt < 4; attempt++) {
    const bytes = measure();
    if (bytes === value.bytes) break;
    value.bytes = bytes;
  }
  return value.bytes;
}

function state(world: WorldState): TemporalEvidenceState | undefined {
  if (!world.experience) return;
  return (world.experience.temporal ??= {
    version: 1,
    namespace: nextId(world, 'receipt-timeline'),
    actors: {},
  });
}
function actorHistory(
  world: WorldState,
  actorId: string,
): { state: TemporalEvidenceState; actor: TemporalActorHistory } | undefined {
  const entity = entityGet(world.entities, actorId);
  if (!entity?.actor || !hasMemory(entity)) return;
  const temporal = state(world);
  if (!temporal) return;
  touchNativeEvidence(world, 'temporal', actorId);
  const life = entity.actor.physicalLife ?? 0;
  let actor = temporal.actors[actorId];
  if (!actor)
    actor = temporal.actors[actorId] = {
      physicalLife: life,
      epoch: `${temporal.namespace}-${nextId(world, 'receipt-epoch')}`,
      pages: [],
      bytes: 0,
      count: 0,
      nextDue: null,
      maintenanceDue: false,
      recent: { blocks: { size: 0 }, projections: { size: 0 }, closures: { size: 0 } },
    };
  else if (actor.physicalLife !== life) {
    actor.physicalLife = life;
    actor.epoch = `${temporal.namespace}-${nextId(world, 'receipt-epoch')}`;
  }
  return { state: temporal, actor };
}
export function temporalActorHistory(
  world: WorldState,
  actorId: string,
): TemporalActorHistory | undefined {
  return actorHistory(world, actorId)?.actor;
}
function receivedIdentity(world: WorldState, family: string): number {
  const id = world.nextId;
  nextId(world, family);
  return id;
}
/** The actual detector reserves causal coordinates before admission/filtering. */
export function createReceivedSample(world: WorldState, actorId: string): number {
  const token = receivedIdentity(world, 'received-sample'),
    prepared = builder(world, actorId);
  countDomainWork('receivedActualSampleTokens');
  if (prepared && !prepared.reservations.has(token))
    prepared.reservations.set(token, {
      boundary: prepared.nextEntry++,
      sample: prepared.nextEntry++,
    });
  return token;
}
interface BatchBuilder {
  batch: ReceivedBatch;
  nextEntry: number;
  nextMember: Map<number, number>;
  samples: Map<number, ReceivedEntry>;
  decisions: Map<string, boolean>;
  coordinates: Map<string, number>;
  pendingAtoms: Set<string>;
  sampleBindings: Map<number, Map<object | number, ReceivedBinding>>;
  closedSamples: Set<number>;
  sourceDecisions: Map<string, TemporalReceiptLocator | false>;
  reservations: Map<number, { boundary: number; sample: number }>;
  boundaries: Map<number, ReceivedEntry>;
  policy: TemporalRetentionPolicy;
  bytes: number;
  count: number;
}
const acquisitionBatches = new WeakMap<WorldState, Map<string, BatchBuilder>>();
function builder(world: WorldState, actorId: string): BatchBuilder | undefined {
  return acquisitionBatches.get(world)?.get(actorId);
}
function newBatch(
  world: WorldState,
  actorId: string,
  actor: TemporalActorHistory,
  frame?: ObservationFrame,
): BatchBuilder {
  const batchOrder = 0;
  return {
    batch: {
      actorId,
      physicalLife: actor.physicalLife,
      epoch: actor.epoch,
      batchOrder,
      frames: frame ? [immutableDataSnapshot(frame, readOnlyDraftView)] : [],
      bindings: [],
      entries: [],
    },
    nextEntry: 0,
    nextMember: new Map(),
    samples: new Map(),
    decisions: new Map(),
    coordinates: new Map(),
    pendingAtoms: new Set(),
    sampleBindings: new Map(),
    closedSamples: new Set(),
    sourceDecisions: new Map(),
    reservations: new Map(),
    boundaries: new Map(),
    policy: selectedTemporalPolicy(world).recent,
    bytes: 0,
    count: 0,
  };
}
/** Synchronous receiving scope. Actual detector tokens and admission decisions
 * are shared by all helpers; no builder survives publication or a wait. */
export function withTemporalAcquisition<T>(
  world: WorldState,
  actorId: string,
  frame: ObservationFrame | undefined,
  work: () => T,
): T {
  let actors = acquisitionBatches.get(world);
  if (actors?.has(actorId)) return work();
  const actor = actorHistory(world, actorId)?.actor;
  if (!actor) return work();
  let releaseSnapshotPreparation: (() => void) | undefined;
  if (!actors) {
    acquisitionBatches.set(world, (actors = new Map()));
    releaseSnapshotPreparation = prepareWorldSnapshots(world, () =>
      flushReceivedAcquisitionsForSnapshot(world),
    );
  }
  const prepared = newBatch(world, actorId, actor, frame);
  actors.set(actorId, prepared);
  try {
    const result = work();
    flushReceivedBatch(world, actorId, prepared);
    return result;
  } finally {
    actors.delete(actorId);
    if (!actors.size) acquisitionBatches.delete(world);
    releaseSnapshotPreparation?.();
  }
}
/** Candidate snapshots see accepted received intent through the same authority
 * as ordinary publication. A frozen sample cannot grow across that boundary. */
export function flushReceivedAcquisitionsForSnapshot(world: WorldState): void {
  const actors = acquisitionBatches.get(world);
  if (!actors) return;
  for (const [actorId, prepared] of actors) {
    flushReceivedBatch(world, actorId, prepared);
    const actor = world.experience?.temporal?.actors[actorId];
    if (!actor) continue;
    const closedSamples = new Set([
        ...prepared.closedSamples,
        ...prepared.samples.keys(),
        ...prepared.reservations.keys(),
      ]),
      sourceDecisions = prepared.sourceDecisions;
    Object.assign(prepared, newBatch(world, actorId, actor, prepared.batch.frames[0]));
    prepared.closedSamples = closedSamples;
    prepared.sourceDecisions = sourceDecisions;
  }
}
const receivingTransitions = new WeakMap<
  WorldState,
  Map<string, { order?: number; sampleToken?: number }>
>();
export function withTemporalReceivedTransition<T>(
  world: WorldState,
  actorId: string,
  work: () => T,
  sampleToken?: number,
): T {
  let actors = receivingTransitions.get(world);
  const previous = actors?.get(actorId);
  if (previous && (sampleToken === undefined || previous.sampleToken === sampleToken))
    return work();
  if (!actors) receivingTransitions.set(world, (actors = new Map()));
  actors.set(actorId, {
    ...(sampleToken === undefined ? {} : { sampleToken, order: sampleToken }),
  });
  try {
    return withTemporalAcquisition(world, actorId, undefined, () => {
      const prepared = builder(world, actorId);
      if (prepared && sampleToken !== undefined && !prepared.reservations.has(sampleToken))
        prepared.reservations.set(sampleToken, {
          boundary: prepared.nextEntry++,
          sample: prepared.nextEntry++,
        });
      return work();
    });
  } finally {
    if (previous) actors.set(actorId, previous);
    else actors.delete(actorId);
    if (!actors.size) receivingTransitions.delete(world);
  }
}

export function temporalReceivedOrder(world: WorldState, actorId: string): number {
  const current = receivingTransitions.get(world)?.get(actorId);
  if (current?.order !== undefined) return current.order;
  const order = world.nextId;
  nextId(world, 'received-order');
  if (current) current.order = order;
  return order;
}
function entry(
  world: WorldState,
  actorId: string,
  kind: ReceivedEntry['kind'],
  token?: number,
): ReceivedEntry {
  const owned = builder(world, actorId)!,
    boundaryToken =
      kind === 'boundary' ? receivingTransitions.get(world)?.get(actorId)?.sampleToken : undefined;
  const old =
    token === undefined
      ? boundaryToken === undefined
        ? undefined
        : owned.boundaries.get(boundaryToken)
      : owned.samples.get(token);
  if (old) return old;
  if (owned.batch.batchOrder === 0)
    owned.batch.batchOrder = receivedIdentity(world, 'received-batch');
  let entryIndex: number;
  const reservation = owned.reservations.get(token ?? boundaryToken ?? -1);
  if (reservation) entryIndex = kind === 'boundary' ? reservation.boundary : reservation.sample;
  else entryIndex = owned.nextEntry++;
  const value: ReceivedEntry = {
    entryIndex,
    order: token ?? boundaryToken ?? temporalReceivedOrder(world, actorId),
    receivedAt: world.simTime,
    kind,
    required: false,
    coverage: [],
    charge: { bytes: 0, count: 0 },
    ...(token === undefined ? {} : { sampleToken: token }),
  };
  (owned.batch.entries as ReceivedEntry[]).push(value);
  owned.bytes += byteLength({ ...value, charge: undefined });
  if (token !== undefined) owned.samples.set(token, value);
  if (boundaryToken !== undefined) owned.boundaries.set(boundaryToken, value);
  return value;
}
function addBinding(prepared: BatchBuilder, binding: ReceivedBinding): void {
  const index = prepared.batch.bindings.findIndex((held) => held.id === binding.id);
  if (index < 0) (prepared.batch.bindings as ReceivedBinding[]).push(binding);
  else
    (prepared.batch.bindings as ReceivedBinding[])[index] = mergeReceivedBindings(
      prepared.batch.bindings[index]!,
      binding,
    );
}
function coverageBytes(coverage: ReceivedCoverage): number {
  return byteLength(coverage);
}
function admitCoverage(
  world: WorldState,
  actorId: string,
  target: ReceivedEntry,
  binding: ReceivedBinding,
  parts: readonly number[],
  clock: ReceivedCoverage['clock'],
  required = false,
): boolean {
  const prepared = builder(world, actorId)!,
    actor = world.experience!.temporal!.actors[actorId]!;
  const logical = new Map<number, number[]>();
  for (const partIndex of parts) {
    const part = binding.parts.find((part) => part.partIndex === partIndex);
    if (!part) throw new Error('Recorded sample names an absent binding part.');
    const held = logical.get(part.logicalMember);
    if (held) held.push(partIndex);
    else logical.set(part.logicalMember, [partIndex]);
  }
  let covered = target.coverage.find(
    (coverage) =>
      coverage.binding === binding.id &&
      canonicalJson(coverage.clock) === canonicalJson(clock) &&
      coverage.boundary === (target.kind === 'boundary' ? target.reason : undefined),
  );
  const members: ReceivedCoverage['members'][number][] = [];
  for (const [logicalMember, suppliedParts] of logical) {
    const decision = JSON.stringify([target.entryIndex, binding.id, logicalMember]);
    const previousDecision = prepared.decisions.get(decision),
      existing = previousDecision !== undefined,
      memberIndex = existing
        ? prepared.coordinates.get(decision)!
        : (prepared.nextMember.get(target.entryIndex) ?? 0);
    const considered = existing
      ? new Set([
          ...target.coverage
            .filter((coverage) => coverage.binding === binding.id)
            .flatMap((coverage) =>
              coverage.members
                .filter((member) => member.memberIndex === memberIndex)
                .flatMap((member) => member.partIndices),
            ),
          ...(target.rejected ?? [])
            .filter((hole) => hole.binding === binding.id && hole.memberIndex === memberIndex)
            .flatMap((hole) => hole.partIndices),
        ])
      : undefined;
    const partIndices = considered
      ? suppliedParts.filter((index) => !considered.has(index))
      : suppliedParts;
    if (!partIndices.length) continue;
    if (!existing) prepared.nextMember.set(target.entryIndex, memberIndex + 1);
    const candidate = { memberIndex, partIndices };
    const projection = receivedBindingChargeProjection(
        binding,
        world.receivedValues?.sources ?? {},
        world,
        new Set(partIndices),
      ),
      projectedIndex = logicalMember;
    const marginal = projectionAtoms(projection, [projectedIndex]).filter(
      (atom) =>
        !orderedRecordGet(actor.recent.closures, atom.key) && !prepared.pendingAtoms.has(atom.key),
    );
    const bytes =
      coverageBytes({
        binding: binding.id,
        members: [candidate],
        ...(clock ? { clock } : {}),
        ...(target.kind === 'boundary' && target.reason ? { boundary: target.reason } : {}),
      }) + marginal.reduce((sum, atom) => sum + atom.bytes, 0);
    const count = existing || target.kind === 'boundary' ? 0 : 1;
    const headroom = 1 + selectedTemporalPolicy(world).maintenanceHeadroom;
    const accepted =
      required ||
      (previousDecision !== false &&
        actor.bytes + prepared.bytes + bytes <= prepared.policy.maxBytes * headroom &&
        actor.count + prepared.count + count <= prepared.policy.maxChanges * headroom);
    if (!existing) {
      prepared.decisions.set(decision, accepted);
      prepared.coordinates.set(decision, memberIndex);
    }
    if (!accepted) {
      target.rejected ??= [];
      (target.rejected as NonNullable<ReceivedEntry['rejected']>[number][]).push({
        memberIndex,
        binding: binding.id,
        subject: binding.subject,
        partIndices,
        parts: partIndices.map((index) => {
          const part = binding.parts.find((part) => part.partIndex === index)!;
          return { partIndex: index, kind: part.kind, part: part.part };
        }),
        sourceIds: [
          ...new Set(
            binding.parts.flatMap((part) =>
              part.facet.original ? [part.facet.original.source.id] : [],
            ),
          ),
        ],
      });
      const gapBytes = byteLength({ memberIndex, binding: binding.id, partIndices });
      target.charge.bytes += gapBytes;
      prepared.bytes += gapBytes;
      actor.maintenanceDue = true;
      continue;
    }
    members.push(candidate);
    for (const atom of marginal) prepared.pendingAtoms.add(atom.key);
    prepared.bytes += bytes;
    prepared.count += count;
  }
  if (!members.length) return false;
  addBinding(prepared, binding);
  if (covered) (covered.members as ReceivedCoverage['members'][number][]).push(...members);
  else {
    covered = {
      binding: binding.id,
      members,
      ...(clock ? { clock } : {}),
      ...(target.kind === 'boundary' && target.reason ? { boundary: target.reason } : {}),
    };
    (target.coverage as ReceivedCoverage[]).push(covered);
  }
  target.required ||= required;
  target.charge.bytes += coverageBytes({ ...covered, members });
  target.charge.count =
    target.kind === 'boundary'
      ? 0
      : new Set(
          target.coverage.flatMap((coverage) =>
            coverage.members.map((member) => member.memberIndex),
          ),
        ).size;
  return true;
}
/** Native directory is derived from accepted canonical entries, never authority
 * for what was sensed. Load supplies the same directories for cold blocks. */
function projectionUseKey(use: import('./received-batches.js').ReceivedChargeUse): string {
  return use.members ? JSON.stringify([use.projection, use.members]) : use.projection;
}
function projectionAtoms(
  projection: import('./received-batches.js').ReceivedChargeProjection,
  members?: readonly number[],
): readonly { key: string; bytes: number }[] {
  const atoms = new Map<string, number>();
  for (const index of members ?? projection.members.map((member) => member.logicalMember)) {
    const member = projection.members.find((member) => member.logicalMember === index)!;
    for (const atom of member.closures) atoms.set(atom.key, atom.bytes);
  }
  return [...atoms].map(([key, bytes]) => ({ key, bytes }));
}
function retainProjectionUse(
  actor: TemporalActorHistory,
  directory: ReceivedChargeDirectory,
  use: import('./received-batches.js').ReceivedChargeUse,
): void {
  const key = projectionUseKey(use),
    prior = orderedRecordGet(actor.recent.projections, key);
  if (prior) {
    orderedRecordSet(actor.recent.projections, key, { ...prior, uses: prior.uses + 1 });
    return;
  }
  const projection = directory.projections.find((projection) => projection.id === use.projection);
  if (!projection) throw new Error('Recent charge use has no projection.');
  orderedRecordSet(actor.recent.projections, key, {
    projection,
    ...(use.members ? { members: use.members } : {}),
    uses: 1,
  });
  for (const atom of projectionAtoms(projection, use.members)) {
    const prior = orderedRecordGet(actor.recent.closures, atom.key);
    orderedRecordSet(actor.recent.closures, atom.key, {
      bytes: prior?.bytes ?? atom.bytes,
      uses: (prior?.uses ?? 0) + 1,
    });
    if (!prior) actor.bytes += atom.bytes;
  }
}
function releaseProjectionUse(
  actor: TemporalActorHistory,
  use: import('./received-batches.js').ReceivedChargeUse,
): void {
  const key = projectionUseKey(use),
    held = orderedRecordGet(actor.recent.projections, key);
  if (!held || held.uses <= 0) throw new Error('Recent projection use underflow.');
  if (held.uses > 1) {
    orderedRecordSet(actor.recent.projections, key, { ...held, uses: held.uses - 1 });
    return;
  }
  orderedRecordSet(actor.recent.projections, key, undefined);
  for (const atom of projectionAtoms(held.projection, held.members)) {
    const prior = orderedRecordGet(actor.recent.closures, atom.key);
    if (!prior || prior.uses <= 0) throw new Error('Recent closure use underflow.');
    orderedRecordSet(
      actor.recent.closures,
      atom.key,
      prior.uses === 1 ? undefined : { ...prior, uses: prior.uses - 1 },
    );
    if (prior.uses === 1) actor.bytes -= prior.bytes;
  }
}
function recentBlockKey(
  owner: Pick<TemporalReceiptLocator, 'physicalLife' | 'epoch'>,
  batchOrder: number,
): string {
  return `${String(batchOrder).padStart(16, '0')}:${owner.physicalLife}:${owner.epoch}`;
}
export function installTemporalChargeDirectories(
  actor: TemporalActorHistory,
  directories: readonly ReceivedChargeDirectory[],
): void {
  actor.recent = { blocks: { size: 0 }, projections: { size: 0 }, closures: { size: 0 } };
  actor.bytes = 0;
  actor.count = 0;
  for (const directory of eligibleReceivedChargeDirectories(directories, actor.frontier))
    appendTemporalChargeDirectory(actor, directory);
}
/** Full directory materialization is reserved for restore/audit/selected capture,
 * never the ordinary append or expiry path. */
export function receivedRecentDirectories(
  actor: TemporalActorHistory,
): readonly ReceivedChargeDirectory[] {
  return [...orderedRecordEntries(actor.recent.blocks)].map(([, directory]) => directory);
}
function appendTemporalChargeDirectory(
  actor: TemporalActorHistory,
  directory: ReceivedChargeDirectory,
): void {
  const batchOrder = directory.entries[0]?.batchOrder;
  if (batchOrder === undefined) return;
  if (directory.entries.some((entry) => entry.batchOrder !== batchOrder))
    throw new Error('Native recent directory must contain one bounded logical batch.');
  const key = recentBlockKey(directory, batchOrder),
    prior = orderedRecordGet(actor.recent.blocks, key);
  let value = directory;
  if (prior) {
    if (
      directory.entries.some((entry) =>
        prior.entries.some((held) => held.entryIndex === entry.entryIndex),
      )
    )
      throw new Error('Recent directory repeats an admitted entry.');
    const projections = new Map(
      [...prior.projections, ...directory.projections].map((projection) => [
        projection.id,
        projection,
      ]),
    );
    value = {
      ...prior,
      entries: [...prior.entries, ...directory.entries].sort((a, b) => a.entryIndex - b.entryIndex),
      projections: [...projections.values()],
    };
  }
  orderedRecordSet(actor.recent.blocks, key, value);
  for (const header of directory.entries) {
    actor.bytes += header.bytes;
    actor.count += header.count;
    for (const use of header.uses) retainProjectionUse(actor, directory, use);
  }
}
/** Exact logical lookup visits one batch branch and its bounded entry mask. */
export function receivedDirectoryContains(
  recent: ReceivedRecentDirectory,
  locator: TemporalReceiptLocator,
  memberIndex?: number,
  receivedAfter = -Infinity,
): boolean {
  const block = orderedRecordGet(recent.blocks, recentBlockKey(locator, locator.batchOrder));
  if (!block || block.actorId !== locator.actorId) return false;
  let low = 0,
    high = block.entries.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (block.entries[mid]!.entryIndex < locator.entryIndex) low = mid + 1;
    else high = mid;
  }
  const header = block.entries[low];
  return (
    header?.entryIndex === locator.entryIndex &&
    header.at > receivedAfter &&
    (memberIndex === undefined ||
      header.uses.some((use) => use.memberIndices.includes(memberIndex)))
  );
}
/** Recombine disjoint physical slices before applying exact logical expiry. */
export function eligibleReceivedChargeDirectories(
  directories: readonly ReceivedChargeDirectory[],
  frontier: ReceivedFrontier | undefined,
): ReceivedChargeDirectory[] {
  const owners = new Map<
    string,
    {
      header: ReceivedChargeDirectory;
      projections: Map<string, import('./received-batches.js').ReceivedChargeProjection>;
      entries: Map<string, import('./received-batches.js').ReceivedChargeEntry>;
    }
  >();
  for (const directory of directories) {
    const ownerKey = JSON.stringify([directory.actorId, directory.physicalLife, directory.epoch]);
    let owner = owners.get(ownerKey);
    if (!owner)
      owners.set(
        ownerKey,
        (owner = { header: directory, projections: new Map(), entries: new Map() }),
      );
    for (const projection of directory.projections) {
      const prior = owner.projections.get(projection.id);
      owner.projections.set(
        projection.id,
        prior
          ? {
              ...prior,
              members: [
                ...prior.members,
                ...projection.members.filter(
                  (member) =>
                    !prior.members.some((held) => held.logicalMember === member.logicalMember),
                ),
              ],
            }
          : projection,
      );
    }
    for (const header of directory.entries) {
      const key = JSON.stringify([header.batchOrder, header.entryIndex]),
        prior = owner.entries.get(key);
      if (!prior) {
        owner.entries.set(key, header);
        continue;
      }
      const uses = new Map<
        string,
        { projection: string; memberIndices: number[]; members: number[] }
      >();
      for (const use of [...prior.uses, ...header.uses]) {
        const projection = owner.projections.get(use.projection)!;
        const selected = use.members ?? projection.members.map((member) => member.logicalMember);
        let held = uses.get(use.projection);
        if (!held)
          uses.set(
            use.projection,
            (held = { projection: use.projection, memberIndices: [], members: [] }),
          );
        for (let index = 0; index < selected.length; index++) {
          if (held.memberIndices.includes(use.memberIndices[index]!))
            throw new Error('Overlapping received charge slices.');
          held.memberIndices.push(use.memberIndices[index]!);
          held.members.push(selected[index]!);
        }
      }
      owner.entries.set(key, {
        ...prior,
        bytes: Math.max(prior.bytes, header.bytes),
        count: prior.count + header.count,
        ...(prior.holes || header.holes
          ? { holes: [...new Set([...(prior.holes ?? []), ...(header.holes ?? [])])] }
          : {}),
        uses: [...uses.values()],
      });
    }
  }
  const result: ReceivedChargeDirectory[] = [];
  for (const owner of owners.values()) {
    const entries = [...owner.entries.values()]
      .sort((a, b) => a.batchOrder - b.batchOrder || a.entryIndex - b.entryIndex)
      .flatMap((header) => {
        if (
          frontier?.expiredThroughTime !== null &&
          frontier?.expiredThroughTime !== undefined &&
          header.at <= frontier.expiredThroughTime
        )
          return [];
        let count = 0;
        const uses = header.uses.flatMap((use) => {
          const projection = owner.projections.get(use.projection)!;
          const selected = use.members ?? projection.members.map((member) => member.logicalMember),
            members: number[] = [],
            memberIndices: number[] = [];
          for (let index = 0; index < selected.length; index++) {
            const memberIndex = use.memberIndices[index]!;
            if (
              frontier?.pressureThrough &&
              compareReceivedPosition(
                { batchOrder: header.batchOrder, entryIndex: header.entryIndex, memberIndex },
                frontier.pressureThrough.address,
              ) <= 0
            )
              continue;
            members.push(selected[index]!);
            memberIndices.push(memberIndex);
            count +=
              header.count === 0
                ? 0
                : projection.members.find((member) => member.logicalMember === selected[index])!
                    .count;
          }
          return members.length ? [{ projection: use.projection, members, memberIndices }] : [];
        });
        const holes = header.holes?.filter(
          (memberIndex) =>
            !frontier?.pressureThrough ||
            compareReceivedPosition(
              { batchOrder: header.batchOrder, entryIndex: header.entryIndex, memberIndex },
              frontier.pressureThrough.address,
            ) > 0,
        );
        if (!uses.length && !holes?.length) return [];
        if (header.indivisible && count !== header.count)
          throw new Error('Pressure frontier bisects an indivisible occurrence.');
        return [{ ...header, count, uses, ...(holes ? { holes } : {}) }];
      });
    const batches = new Map<number, typeof entries>();
    for (const entry of entries) {
      const held = batches.get(entry.batchOrder);
      if (held) held.push(entry);
      else batches.set(entry.batchOrder, [entry]);
    }
    for (const batchEntries of batches.values()) {
      const used = new Set(
        batchEntries.flatMap((entry) => entry.uses.map((use) => use.projection)),
      );
      result.push({
        ...owner.header,
        projections: [...owner.projections.values()].filter((projection) =>
          used.has(projection.id),
        ),
        entries: batchEntries,
      });
    }
  }
  return result.sort((a, b) => (a.entries[0]?.batchOrder ?? 0) - (b.entries[0]?.batchOrder ?? 0));
}
export function restoreReceivedRecentDirectory(
  world: WorldState,
  actorId: string,
  directories: readonly ReceivedChargeDirectory[],
): void {
  const actor = world.experience?.temporal?.actors[actorId];
  if (!actor) throw new Error('Received directory has no actor owner.');
  if (directories.some((directory) => directory.actorId !== actorId))
    throw new Error('Received directory belongs to another actor.');
  const expected = { bytes: actor.bytes, count: actor.count };
  const prepared = { ...actor };
  installTemporalChargeDirectories(prepared, directories);
  if (prepared.bytes !== expected.bytes || prepared.count !== expected.count)
    throw new Error('Received recent charges disagree with saved actor totals.');
  actor.recent = prepared.recent;
}
function releaseDirectoryEntry(
  actor: TemporalActorHistory,
  directory: ReceivedChargeDirectory,
  header: import('./received-batches.js').ReceivedChargeEntry,
  releasedIndividuals?: Set<string>,
): void {
  if (releasedIndividuals)
    for (const use of header.uses) {
      const projection = directory.projections.find(
        (projection) => projection.id === use.projection,
      )!;
      for (const logical of use.members ?? projection.members.map((member) => member.logicalMember))
        for (const id of projection.members.find((member) => member.logicalMember === logical)!
          .individualIds)
          releasedIndividuals.add(id);
    }
  actor.bytes -= header.bytes;
  actor.count -= header.count;
  for (const use of header.uses) releaseProjectionUse(actor, use);
}
/** Ordinary age/pressure retirement runs only over the actor's retained headers.
 * Current values and separately retained account support are never expired here. */
function firstRecentDirectory(
  recent: ReceivedRecentDirectory,
): [string, ReceivedChargeDirectory] | undefined {
  const first = orderedRecordEntries(recent.blocks).next();
  return first.done ? undefined : first.value;
}
function setRecentDirectoryEntries(
  actor: TemporalActorHistory,
  key: string,
  directory: ReceivedChargeDirectory,
  entries: ReceivedChargeDirectory['entries'],
): void {
  if (!entries.length) {
    orderedRecordSet(actor.recent.blocks, key, undefined);
    return;
  }
  const used = new Set(entries.flatMap((entry) => entry.uses.map((use) => use.projection)));
  orderedRecordSet(actor.recent.blocks, key, {
    ...directory,
    entries,
    projections: directory.projections.filter((projection) => used.has(projection.id)),
  });
}
export function advanceTemporalRecent(
  world: WorldState,
  actorId: string,
  policy: TemporalRetentionPolicy,
): {
  bytes: number;
  count: number;
  nextDue: number | null;
  releasedIndividualIds: readonly string[];
} {
  const actor = world.experience?.temporal?.actors[actorId];
  if (!actor) return { bytes: 0, count: 0, nextDue: null, releasedIndividualIds: [] };
  const previous = { bytes: actor.bytes, count: actor.count },
    cutoff = world.simTime - policy.maxAgeSeconds,
    first = firstRecentDirectory(actor.recent)?.[1].entries[0];
  if (
    !actor.maintenanceDue &&
    actor.bytes <= policy.maxBytes &&
    actor.count <= policy.maxChanges &&
    (!first || first.at > cutoff)
  )
    return { bytes: 0, count: 0, nextDue: actor.nextDue, releasedIndividualIds: [] };
  touchNativeEvidence(world, 'temporal', actorId);
  const releasedIndividualIds = new Set<string>(),
    frontier = (actor.frontier ??= { expiredThroughTime: null });
  if (cutoff >= 0)
    frontier.expiredThroughTime = Math.max(frontier.expiredThroughTime ?? -Infinity, cutoff);
  if (actor.recordingGap) {
    if (actor.recordingGap.through <= cutoff) delete actor.recordingGap;
    else if (actor.recordingGap.from < cutoff)
      actor.recordingGap = { ...actor.recordingGap, from: cutoff };
  }
  // One tree branch per expired batch; only its bounded boundary mask is copied.
  for (;;) {
    const current = firstRecentDirectory(actor.recent);
    if (!current) break;
    const [key, directory] = current;
    let expired = 0;
    while (expired < directory.entries.length && directory.entries[expired]!.at <= cutoff) {
      releaseDirectoryEntry(actor, directory, directory.entries[expired]!, releasedIndividualIds);
      expired++;
    }
    if (!expired) break;
    setRecentDirectoryEntries(actor, key, directory, directory.entries.slice(expired));
    if (expired < directory.entries.length) break;
  }
  while (actor.bytes > policy.maxBytes || actor.count > policy.maxChanges) {
    const current = firstRecentDirectory(actor.recent);
    if (!current) break;
    const [key, directory] = current,
      header = directory.entries[0]!,
      members = [
        ...new Set([...header.uses.flatMap((use) => use.memberIndices), ...(header.holes ?? [])]),
      ].sort((a, b) => a - b);
    let removed: number;
    if (header.indivisible || members.length <= 1) {
      removed = Math.max(0, ...members);
      releaseDirectoryEntry(actor, directory, header, releasedIndividualIds);
      setRecentDirectoryEntries(actor, key, directory, directory.entries.slice(1));
    } else {
      removed = members[0]!;
      let releasedCount = 0;
      const uses = header.uses.flatMap((use) => {
        const at = use.memberIndices.indexOf(removed);
        if (at < 0) return [use];
        const projection = directory.projections.find(
            (projection) => projection.id === use.projection,
          )!,
          indices = use.members ?? projection.members.map((member) => member.logicalMember),
          member = projection.members.find((member) => member.logicalMember === indices[at])!;
        releasedCount = header.count === 0 ? 0 : member.count;
        for (const id of member.individualIds) releasedIndividualIds.add(id);
        releaseProjectionUse(actor, use);
        const memberIndices = use.memberIndices.filter((_, index) => index !== at),
          selected = indices.filter((_, index) => index !== at);
        if (!memberIndices.length) return [];
        const next = { projection: use.projection, memberIndices, members: selected };
        retainProjectionUse(actor, directory, next);
        return [next];
      });
      actor.count -= releasedCount;
      const partial = {
        ...header,
        count: header.count - releasedCount,
        uses,
        ...(header.holes ? { holes: header.holes.filter((index) => index !== removed) } : {}),
      };
      setRecentDirectoryEntries(actor, key, directory, [partial, ...directory.entries.slice(1)]);
    }
    const address = {
      batchOrder: header.batchOrder,
      entryIndex: header.entryIndex,
      memberIndex: removed,
    };
    if (
      !frontier.pressureThrough ||
      compareReceivedPosition(address, frontier.pressureThrough.address) > 0
    )
      frontier.pressureThrough = { address, receivedAt: header.at, order: header.order };
  }
  const oldest = firstRecentDirectory(actor.recent)?.[1].entries[0];
  actor.nextDue = oldest ? oldest.at + policy.maxAgeSeconds : null;
  actor.maintenanceDue = false;
  actor.pages = actor.pages.filter((page) => {
    if (temporalPageMutation(page) === 'edit' && !page.batches.length) return true;
    if (frontier.expiredThroughTime !== null && page.throughAt <= frontier.expiredThroughTime)
      return false;
    if (!frontier.pressureThrough) return true;
    const batch = page.batches.at(-1),
      entry = batch?.entries.at(-1);
    if (!batch || !entry) return true;
    const memberIndex = Math.max(
      0,
      ...(entry.receipt?.facets.map((facet) => facet.memberIndex) ??
        entry.coverage.flatMap((coverage) => coverage.members.map((member) => member.memberIndex))),
      ...(entry.rejected?.map((member) => member.memberIndex) ?? []),
    );
    return (
      compareReceivedPosition(
        { batchOrder: batch.batchOrder, entryIndex: entry.entryIndex, memberIndex },
        frontier.pressureThrough.address,
      ) > 0
    );
  });
  return {
    bytes: previous.bytes - actor.bytes,
    count: previous.count - actor.count,
    nextDue: actor.nextDue,
    releasedIndividualIds: [...releasedIndividualIds],
  };
}

const bindingIndividuals = new WeakMap<object, ReadonlyMap<number, readonly string[]>>();
function receivedBindingIndividuals(
  binding: ReceivedBinding,
  sources: ReceivedValueLookup,
): ReadonlyMap<number, readonly string[]> {
  const projection = binding.charges ?? receivedBindingChargeProjection(binding, sources),
    cached = bindingIndividuals.get(projection);
  if (cached) return cached;
  const result = new Map(
    projection.members.map((member) => [member.logicalMember, member.individualIds]),
  );
  bindingIndividuals.set(projection, result);
  return result;
}

function flushReceivedBatch(world: WorldState, actorId: string, prepared: BatchBuilder): void {
  const batch = prepared.batch;
  const entries = batch.entries
    .filter((entry) => entry.coverage.length || entry.receipt || entry.rejected?.length)
    .sort((a, b) => a.entryIndex - b.entryIndex);
  if (!entries.length) return;
  for (const entry of entries) entry.charge.bytes = byteLength({ ...entry, charge: undefined });
  const actor = world.experience!.temporal!.actors[actorId]!;
  const used = new Map<number, Set<number>>();
  for (const entry of entries)
    for (const coverage of entry.coverage) {
      let indices = used.get(coverage.binding);
      if (!indices) used.set(coverage.binding, (indices = new Set()));
      for (const member of coverage.members)
        for (const index of member.partIndices) indices.add(index);
    }
  const bindings = batch.bindings.flatMap((binding) => {
    const indices = used.get(binding.id);
    return indices ? [selectReceivedBindingParts(binding, indices)] : [];
  });
  const value = immutableDataSnapshot({ ...batch, bindings, entries }, readOnlyDraftView);
  const encoded = receivedBatchStorageBytes(value),
    prior = actor.pages.at(-1);
  let page: TemporalPage;
  if (
    !prior ||
    prior.appendClosed ||
    prior.epoch !== batch.epoch ||
    prior.batches.reduce((sum, batch) => sum + receivedBatchStorageBytes(batch), 0) + encoded >
      TEMPORAL_NATIVE_PAGE_BYTES
  ) {
    page = {
      id: nextId(world, 'temporal-page'),
      order: world.nextId,
      actorId,
      physicalLife: batch.physicalLife,
      epoch: batch.epoch,
      fromAt: world.simTime,
      throughAt: world.simTime,
      subjects: [],
      sourceIds: [],
      individualIds: [],
      sourceRefs: [],
      bytes: 0,
      count: 0,
      batches: [],
    };
    actor.pages.push(page);
  } else page = prior;
  const metadata = temporalPageMetadata({ ...page, batches: [value] }, { world });
  appendTemporalPageBatch(page, value, world);
  page.bytes += metadata.entryBytes;
  page.count += metadata.count;
  page.fromAt = Math.min(page.fromAt, metadata.firstAt ?? page.fromAt);
  page.throughAt = Math.max(page.throughAt, metadata.lastAt ?? page.throughAt);
  page.subjects = [...new Set([...page.subjects, ...metadata.subjects])];
  page.sourceIds = [...new Set([...page.sourceIds, ...metadata.sourceIds])];
  page.individualIds = [...new Set([...page.individualIds, ...metadata.individualIds])];
  page.sourceRefs = [...new Set([...page.sourceRefs, ...metadata.references])];
  const directory = metadata.chargeDirectory;
  appendTemporalChargeDirectory(actor, directory);
  const due = Math.min(...entries.map((entry) => entry.receivedAt)) + prepared.policy.maxAgeSeconds;
  actor.nextDue = Math.min(actor.nextDue ?? Infinity, due);
  actor.maintenanceDue ||=
    actor.bytes > prepared.policy.maxBytes || actor.count > prepared.policy.maxChanges;
  for (const entry of entries) {
    const mentioned = new Map<number, Set<string>>();
    for (const coverage of entry.coverage) {
      const binding = batch.bindings.find((binding) => binding.id === coverage.binding)!;
      const individuals = receivedBindingIndividuals(binding, world.receivedValues?.sources ?? {});
      for (const member of coverage.members) {
        let ids = mentioned.get(member.memberIndex);
        if (!ids) mentioned.set(member.memberIndex, (ids = new Set()));
        for (const index of member.partIndices) {
          const part = binding.parts.find((part) => part.partIndex === index)!;
          for (const id of individuals.get(part.logicalMember) ?? []) ids.add(id);
        }
      }
    }
    if (entry.receipt)
      for (const facet of entry.receipt.facets) {
        const ids = temporalReceiptIndividualIds(
          { ...entry.receipt, facets: [facet] },
          world.receivedValues?.sources ?? {},
        );
        mentioned.set(facet.memberIndex, new Set(ids));
      }
    for (const [memberIndex, ids] of mentioned)
      if (ids.size)
        selectedMarkRecentIndividualReferences(world, actorId, [...ids], {
          physicalLife: batch.physicalLife,
          epoch: batch.epoch,
          batchOrder: batch.batchOrder,
          entryIndex: entry.entryIndex,
          memberIndex,
          at: entry.receivedAt,
        });
  }
  countDomainWork('temporalOperationsAppended');
  countDomainWork('receivedBatchesAppended');
  for (const entry of entries) {
    countDomainWork(
      entry.kind === 'baseline'
        ? 'receivedBaselineEntries'
        : entry.kind === 'sample'
          ? 'receivedSampleEntries'
          : entry.kind === 'boundary'
            ? 'receivedBoundaryEntries'
            : 'receivedOccurrenceEntries',
    );
    countDomainWork('receivedLogicalMembersAdmitted', entry.charge.count);
    countDomainWork(
      'receivedLogicalMembersRejected',
      new Set(entry.rejected?.map((hole) => hole.memberIndex)).size,
    );
  }
  if (domainCountersEnabled()) {
    countDomainWork('receivedBatchEncodedBytes', byteLength(value));
    countDomainWork(
      'receivedBindingBytes',
      value.bindings.reduce((sum, binding) => sum + byteLength(binding.parts), 0),
    );
    countDomainWork(
      'receivedSeedBytes',
      value.bindings.reduce(
        (sum, binding) =>
          sum + byteLength({ seed: binding.seed, predecessors: binding.predecessors }),
        0,
      ),
    );
  }
  chargeWork({ effects: 1, outputBytes: encoded });
}
function prepareCaptureFacets(
  world: WorldState,
  input: TemporalCaptureInput,
): TemporalFacetReference[] {
  return input.facets.map((facet, memberIndex) => {
    const projection =
      'received' in facet ? facet.received.projection : splitTemporalValue(facet.value);
    const metadata =
      'received' in facet
        ? (({ received, ...rest }) => rest)(facet)
        : (({ value, retainedValue, ...rest }) => rest)(facet);
    const retained = retainReceivedValue(
      world,
      projection.value,
      'received' in facet ? facet.received.reference : facet.retainedValue,
    );
    return {
      ...metadata,
      valueRef: retained.reference,
      memberIndex: facet.memberIndex ?? memberIndex,
      ...(projection.reception ? { reception: projection.reception } : {}),
    };
  });
}
export function appendTemporalReceipt(
  world: WorldState,
  actorId: string,
  input: TemporalCaptureInput,
  policy: TemporalRetentionPolicy,
  _acquisition?: number,
): TemporalReceiptLocator | undefined {
  if (!input.facets.length) return;
  return withTemporalReceivedTransition(world, actorId, () => {
    const prepared = builder(world, actorId);
    if (!prepared) return;
    prepared.policy = policy;
    const target = entry(
      world,
      actorId,
      input.change === 'baseline'
        ? 'baseline'
        : input.change === 'occurrence'
          ? 'occurrence'
          : ['loss', 'unchecked', 'attention-exit'].includes(input.change)
            ? 'boundary'
            : 'sample',
    );
    if (input.receivedAt !== undefined) target.receivedAt = input.receivedAt;
    if (input.receivedOrder !== undefined) target.order = input.receivedOrder;
    const actor = world.experience!.temporal!.actors[actorId]!,
      locator = {
        actorId,
        physicalLife: actor.physicalLife,
        epoch: actor.epoch,
        batchOrder: prepared.batch.batchOrder,
        entryIndex: target.entryIndex,
      };
    const facets = prepareCaptureFacets(world, input),
      receipt: TemporalReceipt = {
        ...locator,
        id: temporalReceiptId(locator),
        at: target.receivedAt,
        order: target.order,
        acquisition: prepared.batch.batchOrder,
        subject: input.subject,
        change: input.change,
        ...(input.facets.some((facet) =>
          temporalSpatialContextValue(
            'received' in facet ? facet.received.projection.value : facet.value,
          ),
        )
          ? { spatialContext: true }
          : {}),
        required: input.required === true,
        sourceIds: [...new Set(input.sourceIds ?? [])],
        facets,
        ...(input.subjectIdentity ? { subjectIdentity: input.subjectIdentity } : {}),
        ...(input.origin ? { origin: input.origin } : {}),
        ...((input.receiverFrame ?? prepared.batch.frames[0])
          ? { receiverFrame: input.receiverFrame ?? prepared.batch.frames[0] }
          : {}),
        ...(input.contextSubjects ? { contextSubjects: [...input.contextSubjects] } : {}),
        ...(input.availability ? { availability: input.availability } : {}),
        ...(input.availabilityAt === undefined ? {} : { availabilityAt: input.availabilityAt }),
      };
    receipt.sourceIds = temporalReceiptAliases(receipt, world.receivedValues?.sources ?? {}, world);
    const bytes = byteLength(receipt),
      count = temporalReceiptChangeCount(receipt),
      headroom = 1 + selectedTemporalPolicy(world).maintenanceHeadroom;
    if (
      !receipt.required &&
      (actor.bytes + prepared.bytes + bytes > policy.maxBytes * headroom ||
        actor.count + prepared.count + count > policy.maxChanges * headroom)
    ) {
      actor.recordingGap = {
        from: actor.recordingGap?.from ?? world.simTime,
        through: world.simTime,
      };
      actor.maintenanceDue = true;
      return;
    }
    target.required = receipt.required;
    target.receipt = receipt;
    target.charge = { bytes, count };
    prepared.bytes += bytes;
    prepared.count += count;
    return locator;
  });
}
export function beginTemporalReceiptEpoch(world: WorldState, namespace: string): void {
  if (!namespace.trim() || namespace.length > 64)
    throw new Error('A receipt timeline requires its admitted namespace.');
  const temporal = world.experience?.temporal;
  if (!temporal) return;
  temporal.namespace = namespace;
  for (const actor of Object.values(temporal.actors))
    actor.epoch = `${namespace}-${nextId(world, 'receipt-epoch')}`;
}
export function temporalSpatialContextValue(
  value: Pick<TemporalValue | ReceivedValueFragment, 'kind'>,
): boolean {
  return value.kind === 'surface-patch' || value.kind === 'physical-boundary';
}

/** Minimal state for tracks actually referenced by this chunk. Copies neither
 * older routes nor a broad scene, and never remeasures an existing field. */
function temporalChangeCount(change: TemporalReceipt['change'], fields: number): number {
  return change === 'loss' ||
    change === 'unchecked' ||
    change === 'attention-exit' ||
    change === 'receiver-frame'
    ? 0
    : fields;
}
export function temporalReceiptChangeCount(receipt: {
  change: TemporalReceipt['change'];
  facets: readonly unknown[];
}): number {
  return temporalChangeCount(receipt.change, receipt.facets.length);
}

function temporalFacetProofInput(lease: CurrentFacetProof, body: boolean) {
  // Selected proof construction borrows the immutable observer identity;
  // copying it for every field adds no authority.
  const observer = readOnlyDraftView(lease.observer);
  const fact = (value: CurrentFacetProof): ObservationFactKey => ({
    source: {
      family: 'native-exposure',
      id: value.original.id,
      revision: value.original.revision,
      observer,
    },
    ordinal: value.originalOrdinal,
  });
  const confirmation = (value: CurrentFacetProof): EvidenceSource => ({
    family: 'native-exposure',
    id: value.id,
    revision: value.revision,
    observer,
  });
  const role = lease.original.facets[lease.originalOrdinal]?.role ?? 'direct';
  const appearance: ReceivedFacetProof = {
    original: fact(lease),
    confirmation: confirmation(lease),
    confirmedFrom: lease.confirmedFrom,
    confirmedThrough: lease.confirmedThrough,
  };
  let from = lease.valueMeasuredFrom,
    through = lease.valueMeasuredThrough,
    acquiredAt = lease.valueAcquiredAt;
  let original = fact(lease),
    receivedFrom = confirmation(lease),
    support = appearance;
  let detailSupport: TemporalFacetReference['detailSupport'],
    poseFrame: ObservationFrame | undefined;
  if (body) {
    detailSupport = { proof: appearance, role, from, through, acquiredAt };
    if (lease.poseSupport) {
      const pose = lease.poseSupport;
      from = pose.poseMeasuredFrom;
      through = pose.poseMeasuredThrough;
      acquiredAt = pose.poseAcquiredAt;
      original = pose.original;
      receivedFrom = pose.confirmation;
      poseFrame = pose.frame;
      support = {
        original,
        confirmation: receivedFrom,
        confirmedFrom: pose.confirmedFrom,
        confirmedThrough: pose.confirmedThrough,
      };
    } else {
      // The raw body's pose belongs to its acquisition. Later group checks
      // confirm its appearance; separately received location owns newer poses.
      receivedFrom = original.source;
      support = {
        original,
        confirmation: receivedFrom,
        confirmedFrom: from,
        confirmedThrough: through,
      };
    }
  }
  return {
    ...(detailSupport ? { detailSupport } : {}),
    ...(poseFrame ? { poseFrame } : {}),
    support,
    role: body && lease.poseSupport ? lease.poseSupport.role : role,
    asOf: through,
    measuredFrom: from,
    measuredThrough: through,
    acquiredAt,
    original,
    receivedFrom,
  };
}

export function temporalFacetInput(
  world: WorldState,
  lease: LiveFacetSupport,
  projection = currentTemporalProjection(world, lease.value),
): TemporalCaptureInput['facets'][number] & ReturnType<typeof temporalFacetProofInput> {
  if (!projection) throw new Error('The selected current temporal value is unavailable.');
  // Exact pooled addresses survive JSON loading and share one received pose.
  return {
    received: {
      projection,
      reference: { valueRef: lease.value.reference },
    },
    ...temporalFacetProofInput(lease, lease.value.kind === 'body'),
  };
}

/** Retain an already supplied current measurement without sensing again or
 * replacing its value with the older exposure that supports its provenance. */
export function captureTemporalSnapshot(
  world: WorldState,
  actorId: string,
  snapshot: CapturedCurrentFacet,
): TemporalReceiptLocator | undefined {
  if (snapshot.observer.actorId !== actorId) return;
  const proof = (value: ReceivedFacetProof): ReceivedFacetProof => ({
    original: value.original,
    confirmation: value.confirmation,
    confirmedFrom: value.confirmedFrom,
    confirmedThrough: value.confirmedThrough,
    ...(value.aliases ? { aliases: value.aliases } : {}),
  });
  let value = snapshot.value;
  const description =
    snapshot.value.kind === 'body' && snapshot.descriptionSupport
      ? snapshot.descriptionSupport
      : undefined;
  if (value.kind === 'body' && description) {
    const { description: _description, ...body } = value.body;
    value = { kind: 'body', body };
  }
  const input: TemporalCaptureInput = {
    subject: snapshot.exposure.track,
    ...(snapshot.localSubject ? { subjectIdentity: snapshot.localSubject } : {}),
    change: 'baseline',
    availability: [
      ...(snapshot.availability || snapshot.poseSupport?.availability
        ? [
            {
              reason: 'unchecked' as const,
              at: Math.min(
                snapshot.availability?.at ?? Infinity,
                snapshot.poseSupport?.availability?.at ?? Infinity,
              ),
              fields: [0],
            },
          ]
        : []),
      ...(description?.availability
        ? [{ reason: 'unchecked' as const, at: description.availability.at, fields: [1] }]
        : []),
    ],
    required: false,
    sourceIds: [
      snapshot.original.source.id,
      snapshot.confirmation.id,
      ...(snapshot.originalAliases ?? []),
    ],
    facets: [
      {
        value,
        support:
          snapshot.value.kind === 'body' && snapshot.poseSupport
            ? proof(snapshot.poseSupport)
            : {
                original: snapshot.original,
                confirmation: snapshot.confirmation,
                confirmedFrom: snapshot.confirmedFrom,
                confirmedThrough: snapshot.confirmedThrough,
                ...(snapshot.originalAliases ? { aliases: snapshot.originalAliases } : {}),
              },
        ...(snapshot.value.kind === 'body' && snapshot.poseSupport
          ? {
              detailSupport: {
                proof: {
                  original: snapshot.original,
                  confirmation: snapshot.confirmation,
                  confirmedFrom: snapshot.confirmedFrom,
                  confirmedThrough: snapshot.confirmedThrough,
                  ...(snapshot.originalAliases ? { aliases: snapshot.originalAliases } : {}),
                },
                role: snapshot.role,
                from: snapshot.valueMeasuredFrom,
                through: snapshot.valueMeasuredThrough,
                acquiredAt: snapshot.valueAcquiredAt,
              },
              poseFrame: snapshot.poseSupport.frame,
            }
          : {}),
        role:
          snapshot.value.kind === 'body' && snapshot.poseSupport
            ? snapshot.poseSupport.role
            : snapshot.role,
        asOf: snapshot.poseSupport?.poseMeasuredThrough ?? snapshot.valueMeasuredThrough,
        measuredFrom: snapshot.poseSupport?.poseMeasuredFrom ?? snapshot.valueMeasuredFrom,
        measuredThrough: snapshot.poseSupport?.poseMeasuredThrough ?? snapshot.valueMeasuredThrough,
        acquiredAt: snapshot.poseSupport?.poseAcquiredAt ?? snapshot.valueAcquiredAt,
        original: snapshot.poseSupport?.original ?? snapshot.original,
        receivedFrom: snapshot.poseSupport?.confirmation ?? snapshot.confirmation,
      },
      ...(description && snapshot.value.kind === 'body'
        ? [
            {
              value: {
                kind: 'description' as const,
                text: snapshot.value.body.description ?? '',
              },
              role: description.role,
              support: proof(description),
              asOf: description.descriptionMeasuredThrough,
              measuredFrom: description.descriptionMeasuredFrom,
              measuredThrough: description.descriptionMeasuredThrough,
              acquiredAt: description.descriptionAcquiredAt,
              original: description.original,
              receivedFrom: description.confirmation,
            },
          ]
        : []),
    ],
  };
  const capsule = retainTemporalCaptureSupport(
    world,
    actorId,
    input,
    selectedTemporalPolicy(world).optional,
  );
  return capsule?.receipt;
}

/** Selected proof snapshots remain read products; ongoing history is already
 * recorded at reception rather than waiting for a later closure. */
export interface TemporalCurrentSeed {
  receipt: TemporalReceipt;
  binding: number;
  carrier?: ReceivedAddress;
  carrierMembers?: ReceivedCoverage['members'];
  bindingParts: ReceivedBinding['parts'];
}
export function captureTemporalCurrentSeeds(
  world: WorldState,
  actorId: string,
  subjects?: ReadonlySet<string>,
  includeGeometry = false,
): TemporalCurrentSeed[] {
  const owner = world.perceptionEvidence?.[actorId];
  if (!owner) return [];
  const result: TemporalCurrentSeed[] = [];
  for (const [subjectId, contact] of currentContactEntries(owner))
    for (const group of contact.content.groups)
      for (const mark of group.recordings ?? []) {
        if (mark.gap) continue;
        if (subjects && !subjects.has(subjectId) && !subjects.has(mark.binding.subject)) continue;
        result.push({
          receipt: materializeReceivedBindingSeed(
            mark.binding,
            new Set(
              mark.binding.parts
                .filter((part) =>
                  mark.members.some(
                    (member) => member.kind === part.kind && member.part === part.part,
                  ),
                )
                .map((part) => part.partIndex),
            ),
          ),
          binding: mark.binding.id,
          bindingParts: mark.binding.parts,
          ...(mark.carrier ? { carrier: mark.carrier, carrierMembers: mark.carrierMembers } : {}),
        });
      }
  if (includeGeometry)
    for (const feature of [
      ...(owner.geometry?.fragments ?? []),
      ...(owner.geometry?.boundaries ?? []),
    ])
      if (feature.recording)
        result.push({
          receipt: materializeReceivedBindingSeed(feature.recording.binding),
          binding: feature.recording.binding.id,
          bindingParts: feature.recording.binding.parts,
          ...(feature.recording.carrier
            ? {
                carrier: feature.recording.carrier,
                carrierMembers: feature.recording.carrierMembers,
              }
            : {}),
        });
  return result;
}
function markParts(
  mark: TemporalCurrentGroupCheckpoint,
  members: readonly CurrentMemberPart[],
): number[] {
  return mark.binding.parts
    .filter((part) => members.some(([kind, which]) => kind === part.kind && which === part.part))
    .map((part) => part.partIndex);
}
function bindingForCurrent(
  world: WorldState,
  actorId: string,
  input: TemporalCurrentGroupInput,
  target: ReceivedEntry,
  previous?: ReceivedBinding,
): ReceivedBinding {
  const prepared = builder(world, actorId)!,
    owner = world.perceptionEvidence![actorId]!,
    parts: ReceivedBinding['parts'][number][] = previous ? [...previous.parts] : [];
  const logical = new Map(parts.map((part) => [part.kind, part.logicalMember]));
  let nextLogical = Math.max(-1, ...parts.map((part) => part.logicalMember)) + 1;
  let nextPart = Math.max(-1, ...parts.map((part) => part.partIndex)) + 1;
  for (const partition of input.group.metadata)
    for (const [kind, part] of partition.members) {
      if (parts.some((held) => held.kind === kind && held.part === part)) continue;
      const record = currentGroupFacetRecord(input.group, input.originalSource, kind, partition);
      if (!record) throw new Error('Received binding has no member.');
      const value = temporalFacetInput(world, currentFacetSupport(owner, record));
      if (!('received' in value)) throw new Error('Current binding lost its received descriptor.');
      const { received, ...metadata } = value;
      let logicalMember = logical.get(kind);
      if (logicalMember === undefined) {
        logicalMember = nextLogical++;
        logical.set(kind, logicalMember);
      }
      const facet: TemporalFacetReference = {
        ...metadata,
        ...received.reference,
        memberIndex: logicalMember,
        track: JSON.stringify([
          receivedTrackKey(input.group.received.grant.exposure, input.group.received.grant.channel),
          kind,
          part,
        ]),
        ...(received.projection.reception ? { reception: received.projection.reception } : {}),
      };
      parts.push({ partIndex: nextPart++, logicalMember, kind, part, facet });
    }
  if (previous) {
    if (
      previous.subject !==
      receivedTrackKey(input.group.received.grant.exposure, input.group.received.grant.channel)
    )
      throw new Error('A sample cannot extend a different received track.');
    const extended = { ...previous, parts, charges: undefined };
    return immutableDataSnapshot(
      {
        ...extended,
        charges: receivedBindingChargeProjection(
          extended,
          world.receivedValues?.sources ?? {},
          world,
        ),
      },
      readOnlyDraftView,
    );
  }
  const actor = world.experience!.temporal!.actors[actorId]!,
    locator = {
      actorId,
      physicalLife: actor.physicalLife,
      epoch: actor.epoch,
      batchOrder: prepared.batch.batchOrder,
      entryIndex: target.entryIndex,
    },
    id = world.nextId;
  nextId(world, 'received-binding');
  return immutableDataSnapshot(
    {
      id,
      subject: receivedTrackKey(
        input.group.received.grant.exposure,
        input.group.received.grant.channel,
      ),
      seed: {
        ...locator,
        id: temporalReceiptId(locator),
        at: world.simTime,
        order: target.order,
        acquisition: prepared.batch.batchOrder,
        subject: receivedTrackKey(
          input.group.received.grant.exposure,
          input.group.received.grant.channel,
        ),
        change: 'baseline' as const,
        required: false,
        sourceIds: [],
        ...(Object.values(input.group.received.fields).find((field) => field.localSubject)
          ?.localSubject
          ? {
              subjectIdentity: Object.values(input.group.received.fields).find(
                (field) => field.localSubject,
              )!.localSubject,
            }
          : {}),
        ...(prepared.batch.frames[0] ? { receiverFrame: prepared.batch.frames[0] } : {}),
      },
      parts,
    },
    readOnlyDraftView,
  );
}
function updateBindingSeed(
  binding: ReceivedBinding,
  clock: ReceivedCoverage['clock'],
  batch: ReceivedBatch,
  entry: ReceivedEntry,
  partIndices: readonly number[],
): ReceivedBinding {
  if (!clock) return binding;
  const selected = new Set(partIndices),
    predecessors = (binding.predecessors ?? []).flatMap((predecessor) => {
      const retained = predecessor.partIndices.filter((index) => !selected.has(index));
      return retained.length
        ? [
            retained.length === predecessor.partIndices.length
              ? predecessor
              : { ...predecessor, partIndices: retained },
          ]
        : [];
    });
  const { frame, ...proof } = clock;
  predecessors.push({
    partIndices,
    at: entry.receivedAt,
    order: entry.order,
    clock: proof,
    ...(frame === undefined ? {} : { frame: batch.frames[frame] }),
  });
  return { ...binding, predecessors };
}
export function captureTemporalCurrent(
  world: WorldState,
  actorId: string,
  inputs: readonly TemporalCurrentGroupInput[],
  policy: TemporalRetentionPolicy,
): void {
  const owner = world.perceptionEvidence?.[actorId];
  if (!owner || !actorHistory(world, actorId)) return;
  withTemporalReceivedTransition(world, actorId, () => {
    const prepared = builder(world, actorId)!;
    prepared.policy = policy;
    const updates: Parameters<typeof currentGroupsSetRecording>[1][number][] = [];
    const freshBindings = new Map<object | number, ReceivedBinding>();
    const admissions: Array<{
      input: TemporalCurrentGroupInput;
      mark?: TemporalCurrentGroupCheckpoint;
    }> = [];
    for (const input of inputs) {
      if (!input.partition.members.length) continue;
      const currentGroup =
        currentContactGet(owner, input.subjectId)?.content.groups.find(
          (group) =>
            readOnlyDraftView(group.received.fields) ===
            readOnlyDraftView(input.group.received.fields),
        ) ?? input.group;
      if (input.exiting || input.partition.availability) {
        closeTemporalCurrentGroup(
          world,
          actorId,
          input.subjectId,
          currentGroup,
          input.exiting ? 'attention-exit' : 'unchecked',
          input.partition,
        );
        continue;
      }
      const marks = currentGroupRecordings(currentGroup, input.partition.members),
        covered = new Set<string>();
      for (const mark of marks) {
        const members = input.partition.members.filter(([kind, part]) =>
          mark.members.some((member) => member.kind === kind && member.part === part),
        );
        for (const member of members) covered.add(JSON.stringify(member));
        admissions.push({ input: { ...input, partition: { ...input.partition, members } }, mark });
      }
      const remaining = input.partition.members.filter(
        (member) => !covered.has(JSON.stringify(member)),
      );
      if (remaining.length)
        admissions.push({
          input:
            remaining.length === input.partition.members.length
              ? input
              : { ...input, partition: { ...input.partition, members: remaining } },
        });
    }
    for (const admission of admissions) {
      const { input } = admission,
        parts = input.partition.members;
      let mark = admission.mark;
      // Reconciliation alone neither repeats an admitted baseline nor retries a refusal.
      if (!input.checked && (mark || !input.entering)) continue;

      if (mark?.gap) mark = undefined;
      if (!mark && !input.checked && !input.entering) continue;
      const times = currentGroupTimes(input.group, input.partition),
        field = input.group.received.fields[parts[0]![0]]!,
        source: NativeEvidenceSource = {
          family: 'native-exposure',
          id: field.id,
          revision: Math.max(input.partition.revision, input.partition.confirmedRevision),
          observer: currentFacetObserver(owner),
        };
      if (mark && mark.epoch !== prepared.batch.epoch) mark = undefined;
      const token = input.checked ? input.sampleToken : undefined;
      if (input.checked && token === undefined)
        throw new Error('An actual received check requires its detector sample token.');
      if (token !== undefined && prepared.closedSamples.has(token)) continue;
      const target = entry(world, actorId, token === undefined ? 'baseline' : 'sample', token);
      if (admission.mark && input.checked && admission.mark.lastToken === token) continue;
      let sampleBindings = token === undefined ? undefined : prepared.sampleBindings.get(token);
      if (token !== undefined && !sampleBindings)
        prepared.sampleBindings.set(token, (sampleBindings = new Map()));
      const fieldIdentity = readOnlyDraftView(input.group.received.fields),
        freshKey = admission.mark?.gap ? admission.mark : fieldIdentity;
      const priorSample = sampleBindings?.get(mark?.binding.id ?? freshKey),
        candidate =
          mark?.binding ??
          freshBindings.get(freshKey) ??
          bindingForCurrent(world, actorId, input, target, priorSample);
      const acquiredBinding = priorSample
        ? mergeReceivedBindings(priorSample, candidate)
        : candidate;
      const binding = acquiredBinding.charges
        ? acquiredBinding
        : {
            ...acquiredBinding,
            charges: receivedBindingChargeProjection(
              acquiredBinding,
              world.receivedValues?.sources ?? {},
              world,
            ),
          };
      if (!binding.parts.length) continue;
      freshBindings.set(freshKey, binding);
      sampleBindings?.set(mark?.binding.id ?? freshKey, binding);
      const frame =
        input.partition.frameRef === undefined
          ? undefined
          : receivedObservationFrame(world, input.partition.frameRef);
      let frameIndex: number | undefined;
      if (frame) {
        frameIndex = prepared.batch.frames.findIndex((value) => value === frame);
        if (frameIndex < 0) {
          frameIndex = prepared.batch.frames.length;
          (prepared.batch.frames as ObservationFrame[]).push(frame);
        }
      }
      const measurement =
        !mark ||
        input.partition.revision !== mark.lastMeasurementRevision ||
        times.valueMeasuredThrough !== mark.lastTimes.valueMeasuredThrough ||
        times.valueMeasuredFrom !== mark.lastTimes.valueMeasuredFrom ||
        times.valueAcquiredAt !== mark.lastTimes.valueAcquiredAt;
      const clock: ReceivedCoverage['clock'] = {
        confirmation: source,
        confirmedFrom: times.confirmedFrom,
        confirmedThrough: times.confirmedThrough,
        ...(measurement
          ? {
              measurement: {
                measuredFrom: times.valueMeasuredFrom,
                measuredThrough: times.valueMeasuredThrough,
                acquiredAt: times.valueAcquiredAt,
                receivedFrom: { ...source, revision: input.partition.revision },
              },
            }
          : {}),
        ...(frameIndex === undefined ? {} : { frame: frameIndex }),
      };
      const supplied = markParts({ binding } as TemporalCurrentGroupCheckpoint, parts);
      admitCoverage(world, actorId, target, binding, supplied, clock);
      const carrierMembers = target.coverage
          .filter((coverage) => coverage.binding === binding.id)
          .flatMap((coverage) => coverage.members),
        acceptedParts = new Set(carrierMembers.flatMap((member) => member.partIndices));
      const admitted = parts.filter(([kind, part]) =>
        binding.parts.some(
          (held) => held.kind === kind && held.part === part && acceptedParts.has(held.partIndex),
        ),
      );
      const declined = parts.filter(
        ([kind, part]) =>
          !admitted.some(([heldKind, heldPart]) => heldKind === kind && heldPart === part),
      );
      const nextBinding = updateBindingSeed(binding, clock, prepared.batch, target, supplied);
      for (const [members, gap] of [
        [admitted, false],
        [declined, true],
      ] as const) {
        if (!members.length) continue;
        const indices = new Set(markParts({ binding } as TemporalCurrentGroupCheckpoint, members)),
          carriers = carrierMembers.flatMap((member) => {
            const partIndices = member.partIndices.filter((index) => indices.has(index));
            return partIndices.length ? [{ ...member, partIndices }] : [];
          }),
          admittedMember = carriers[0]?.memberIndex;
        const next: TemporalCurrentGroupCheckpoint = {
          epoch: prepared.batch.epoch,
          ...(admittedMember === undefined
            ? {}
            : {
                carrier: {
                  actorId,
                  physicalLife: prepared.batch.physicalLife,
                  epoch: prepared.batch.epoch,
                  batchOrder: prepared.batch.batchOrder,
                  entryIndex: target.entryIndex,
                  memberIndex: admittedMember,
                },
                carrierMembers: carriers,
              }),
          binding: nextBinding,
          members: members.map(([kind, part]) => ({ kind, part })),
          lastToken: token,
          lastTimes: times,
          lastSource: source,
          lastAt: world.simTime,
          lastOrder: target.order,
          lastMeasurementRevision: input.partition.revision,
          gap,
        };
        updates.push({
          subjectId: input.subjectId,
          fields: input.group.received.fields,
          members,
          recording: next,
        });
      }
    }
    if (updates.length) currentGroupsSetRecording(owner, updates);
  });
}
export function closeTemporalCurrentGroup(
  world: WorldState,
  actorId: string,
  subjectId: string,
  group: CurrentReceivedGroup,
  reason: TemporalReceipt['change'],
  partition?: CurrentPartPartition,
): void {
  const owner = world.perceptionEvidence?.[actorId];
  if (!owner) return;
  withTemporalReceivedTransition(world, actorId, () => {
    const updates: Parameters<typeof currentGroupsSetRecording>[1][number][] = [];
    for (const mark of currentGroupRecordings(group, partition?.members)) {
      const members =
        partition?.members ?? mark.members.map((member) => [member.kind, member.part] as const);
      if (!mark.gap) {
        const target = entry(world, actorId, 'boundary');
        target.reason = reason;
        admitCoverage(
          world,
          actorId,
          target,
          mark.binding,
          markParts(mark, members),
          undefined,
          true,
        );
      }
      updates.push({ subjectId, fields: group.received.fields, members, recording: undefined });
    }
    if (updates.length) currentGroupsSetRecording(owner, updates);
  });
}
export function captureTemporalObservation(
  world: WorldState,
  actorId: string,
  observation: ObservationContribution,
  sourceIds: string[],
  required: boolean,
  policy: TemporalRetentionPolicy,
  options: {
    subject?: string;
    sourceOrdinals?: ReadonlySet<number>;
    contextSubjects?: readonly string[];
    change?: TemporalCaptureInput['change'];
    confirmedThrough?: number;
  } = {},
): TemporalReceiptLocator | undefined {
  const sourceKey = JSON.stringify([
    observation.id,
    observation.revision,
    options.sourceOrdinals ? [...options.sourceOrdinals].sort((a, b) => a - b) : null,
  ]);
  const previous = builder(world, actorId)?.sourceDecisions.get(sourceKey);
  if (previous !== undefined) return previous === false ? undefined : previous;
  const locator = appendTemporalReceipt(
    world,
    actorId,
    {
      subject:
        options.subject ??
        (observation.origin.kind === 'exposure'
          ? observation.origin.episodeId
          : observation.origin.eventId),
      change: options.change ?? 'occurrence',
      receivedAt: observation.acquiredAt,
      receivedOrder: observation.receivedOrder,
      ...(options.contextSubjects?.length ? { contextSubjects: options.contextSubjects } : {}),
      required,
      sourceIds,
      origin: cloneValue(observation.origin),
      facets: observation.facets
        .filter((facet) => !options.sourceOrdinals || options.sourceOrdinals.has(facet.ordinal))
        .map(({ ordinal, ...facet }) => ({
          ...facet,
          memberIndex: ordinal,
          ...(options.confirmedThrough === undefined
            ? {}
            : { confirmedThrough: options.confirmedThrough }),
          original: {
            source: {
              family: 'native-exposure',
              id: observation.id,
              revision: observation.revision,
              observer: { ...observation.observer },
            },
            ordinal,
          },
        })),
    },
    policy,
  );
  builder(world, actorId)?.sourceDecisions.set(sourceKey, locator ?? false);
  return locator;
}

export interface TemporalGeometryFeature {
  observation: ObservationContribution;
  recording?: TemporalCurrentGroupCheckpoint;
}
export function captureTemporalGeometry(
  world: WorldState,
  actorId: string,
  features: readonly TemporalGeometryFeature[],
  through: number,
  policy: TemporalRetentionPolicy,
  sampleToken: number,
): void {
  if (!actorHistory(world, actorId)) return;
  withTemporalReceivedTransition(world, actorId, () => {
    const prepared = builder(world, actorId)!;
    if (prepared.closedSamples.has(sampleToken)) return;
    prepared.policy = policy;
    const target = entry(world, actorId, 'sample', sampleToken);
    for (const feature of features) {
      const observation = feature.observation,
        prior = feature.recording;
      if (prior?.lastToken === sampleToken) continue;
      let binding = prior?.binding;
      if (!binding) {
        const facets = prepareCaptureFacets(world, {
          subject: observation.id,
          change: 'baseline',
          facets: observation.facets.map(({ ordinal, ...facet }) => ({
            ...facet,
            memberIndex: ordinal,
            original: contributionFactKey(observation, ordinal),
            value: facet.value,
          })),
        }).map((facet) => ({
          ...facet,
          track: JSON.stringify([
            observation.origin.kind === 'exposure'
              ? observation.origin.episodeId
              : observation.origin.eventId,
            observation.origin.kind === 'exposure'
              ? observation.origin.detectorId
              : observation.origin.eventId,
            facet.memberIndex,
          ]),
        }));
        const actor = world.experience!.temporal!.actors[actorId]!,
          locator = {
            actorId,
            physicalLife: actor.physicalLife,
            epoch: actor.epoch,
            batchOrder: prepared.batch.batchOrder,
            entryIndex: target.entryIndex,
          },
          id = world.nextId;
        nextId(world, 'received-binding');
        binding = immutableDataSnapshot(
          {
            id,
            subject:
              observation.origin.kind === 'exposure'
                ? observation.origin.episodeId
                : observation.origin.eventId,
            seed: {
              ...locator,
              id: temporalReceiptId(locator),
              at: world.simTime,
              order: target.order,
              acquisition: prepared.batch.batchOrder,
              subject:
                observation.origin.kind === 'exposure'
                  ? observation.origin.episodeId
                  : observation.origin.eventId,
              change: 'baseline' as const,
              required: false,
              sourceIds: [observation.id],
              spatialContext: true,
              origin: observation.origin,
            },
            parts: facets.map((facet, index) => ({
              partIndex: index,
              logicalMember: facet.memberIndex,
              kind: observation.facets[index]!.value.kind,
              part: 'value' as const,
              facet,
            })),
          },
          readOnlyDraftView,
        );
      }
      if (!binding.charges)
        binding = {
          ...binding,
          charges: receivedBindingChargeProjection(
            binding,
            world.receivedValues?.sources ?? {},
            world,
          ),
        };
      const original = contributionFactKey(observation, 0),
        source = original.source as NativeEvidenceSource,
        times = {
          valueMeasuredFrom: observation.facets[0]!.measuredFrom,
          valueMeasuredThrough: observation.facets[0]!.measuredThrough,
          valueAcquiredAt: observation.acquiredAt,
          confirmedFrom: observation.acquiredAt,
          confirmedThrough: through,
        },
        clock = {
          confirmation: source,
          confirmedFrom: times.confirmedFrom,
          confirmedThrough: through,
        };
      const accepted = admitCoverage(
        world,
        actorId,
        target,
        binding,
        binding.parts.map((part) => part.partIndex),
        clock,
      );
      const carrierMembers = target.coverage
          .filter((coverage) => coverage.binding === binding!.id)
          .flatMap((coverage) => coverage.members),
        admittedMember = carrierMembers[0]?.memberIndex;
      feature.recording = {
        epoch: prepared.batch.epoch,
        ...(admittedMember === undefined
          ? {}
          : {
              carrier: {
                actorId,
                physicalLife: prepared.batch.physicalLife,
                epoch: prepared.batch.epoch,
                batchOrder: prepared.batch.batchOrder,
                entryIndex: target.entryIndex,
                memberIndex: admittedMember,
              },
              carrierMembers,
            }),
        binding: updateBindingSeed(
          binding,
          clock,
          prepared.batch,
          target,
          binding.parts.map((part) => part.partIndex),
        ),
        members: binding.parts.map((part) => ({ kind: part.kind, part: part.part })),
        lastToken: sampleToken,
        lastTimes: times,
        lastSource: source,
        lastAt: world.simTime,
        lastOrder: target.order,
        lastMeasurementRevision: source.revision,
        gap: !accepted,
      };
    }
  });
}
export function closeTemporalGeometry(
  world: WorldState,
  actorId: string,
  feature: TemporalGeometryFeature,
  _through: number,
  reason: TemporalReceipt['change'],
): void {
  const mark = feature.recording;
  if (!mark) return;
  withTemporalReceivedTransition(world, actorId, () => {
    if (!mark.gap) {
      const target = entry(world, actorId, 'boundary');
      target.reason = reason;
      admitCoverage(
        world,
        actorId,
        target,
        mark.binding,
        mark.binding.parts.map((part) => part.partIndex),
        undefined,
        true,
      );
    }
    delete feature.recording;
  });
}
export interface TemporalHistorySelection {
  baselines?: Array<{
    checkpoint: TemporalCheckpoint;
    values: TemporalValue[];
    forReceipt: ReceivedAddress;
    availableAt: number;
    origins: Array<{
      kind: 'checkpoint' | 'receipt';
      batchOrder: number;
      entryIndex: number;
      memberIndex: number;
      availability?: {
        kind: 'checkpoint' | 'receipt';
        batchOrder: number;
        entryIndex: number;
        memberIndex: number;
      };
    }>;
  }>;
  examinedBefore?: {
    epoch: string;
    batchOrder: number;
    entryIndex: number;
    memberIndex: number;
    at: number;
    order: number;
  };
  entries: Array<{ receipt: TemporalReceipt; values: TemporalValue[] }>;
  incomplete: boolean;
  hasMore?: boolean;
}
export interface TemporalHistoryQuery {
  from?: number;
  through?: number;
  subject?: string;
  subjects?: readonly string[];
  physicalLife?: number;
  epoch?: string;
  before?: {
    epoch: string;
    batchOrder: number;
    entryIndex: number;
    memberIndex: number;
    at: number;
    order: number;
  };
  cut?: TemporalReceiptPrefix;
  measurements?: { from: number; through: number };
  kinds?: readonly TemporalValue['kind'][];
  includeGeometry?: boolean;
  limit?: number;
  operations?: number;
  bytes?: number;
}
export interface TemporalReceiptPrefix {
  physicalLife: number;
  epoch: string | null;
  throughBatchOrder: number;
  throughEntryIndex: number;
  throughOrder: number;
}
export function captureTemporalReceiptPrefix(
  world: WorldState,
  actorId: string,
): TemporalReceiptPrefix {
  const actor = world.experience?.temporal?.actors[actorId],
    active = builder(world, actorId),
    batch = active?.batch ?? actor?.pages.at(-1)?.batches.at(-1);
  return {
    physicalLife: actor?.physicalLife ?? 0,
    epoch: actor?.epoch ?? null,
    throughBatchOrder: batch?.batchOrder ?? -1,
    throughEntryIndex: active ? active.nextEntry - 1 : (batch?.entries.at(-1)?.entryIndex ?? -1),
    throughOrder: world.nextId,
  };
}
export function temporalReceiptWithinPrefix(
  receipt: Pick<TemporalReceipt, 'order' | 'physicalLife' | 'epoch' | 'batchOrder' | 'entryIndex'>,
  cut: TemporalReceiptPrefix,
): boolean {
  return (
    cut.epoch !== null &&
    receipt.order <= cut.throughOrder &&
    (receipt.physicalLife !== cut.physicalLife ||
      receipt.epoch !== cut.epoch ||
      receipt.batchOrder < cut.throughBatchOrder ||
      (receipt.batchOrder === cut.throughBatchOrder && receipt.entryIndex <= cut.throughEntryIndex))
  );
}
export function selectTemporalHistory(
  world: WorldState,
  actorId: string,
  query: TemporalHistoryQuery = {},
): TemporalHistorySelection {
  const actor = world.experience?.temporal?.actors[actorId];
  if (!actor) return { entries: [], incomplete: true };
  return selectCapturedTemporalHistory(
    {
      actorId,
      pages: actor.pages,
      currentSeeds: captureTemporalCurrentSeeds(
        world,
        actorId,
        query.subjects
          ? new Set(query.subjects)
          : query.subject
            ? new Set([query.subject])
            : undefined,
        query.includeGeometry,
      ),
      frontier: actor.frontier,
      sources: world.receivedValues?.sources ?? {},
      disclosure: captureTemporalReadContext(world, actorId),
      maximumOperations: selectedAttentionPolicy(world).scene.historyReceipts,
      maximumCandidates: selectedAttentionPolicy(world).scene.candidateVisits,
      at: world.simTime,
      maxAgeSeconds: selectedTemporalPolicy(world).recent.maxAgeSeconds,
      recordingGap: actor.recordingGap,
    },
    query,
  );
}
/** Decode only candidate entries and their exact captured seeds. Seeds can answer
 * held-state cuts but never appear as additional historical observations. */
export function selectCapturedTemporalHistory(
  context: CapturedTemporalHistoryContext,
  query: TemporalHistoryQuery = {},
): TemporalHistorySelection {
  const from = Math.max(
      query.from ?? 0,
      context.at !== undefined && context.maxAgeSeconds !== undefined
        ? context.at - context.maxAgeSeconds
        : 0,
    ),
    through = Math.min(query.through ?? Infinity, context.at ?? Infinity),
    subjects = query.subjects ?? (query.subject ? [query.subject] : []),
    subjectSet = subjects.length ? new Set(subjects) : undefined,
    limit = query.limit ?? 128,
    maxWork = query.operations ?? context.maximumOperations ?? limit,
    maxCandidates = context.maximumCandidates ?? maxWork * 4,
    maxBytes = query.bytes ?? 8192;
  const requestedFrom = query.from ?? 0,
    ageFloor =
      context.frontier?.expiredThroughTime ??
      (context.at !== undefined && context.maxAgeSeconds !== undefined
        ? context.at - context.maxAgeSeconds
        : -Infinity),
    pressure = context.frontier?.pressureThrough;
  const result: TemporalHistorySelection = {
    entries: [],
    incomplete:
      requestedFrom <= ageFloor ||
      (!!pressure && requestedFrom <= pressure.receivedAt) ||
      (!!context.recordingGap &&
        context.recordingGap.from <= through &&
        context.recordingGap.through >= from),
  };
  let candidates = 0,
    work = 0,
    bytes = 0;
  const carried = new Map<
    string,
    {
      seed: TemporalReceipt | ReceivedBinding;
      parts?: ReadonlySet<number>;
      carrier: ReceivedAddress;
      until: number;
      binding: number;
      memberCarriers: ReadonlyMap<number, number>;
    }
  >();
  const pending: Array<{ batch: ReceivedBatch; entry: ReceivedEntry }> = [];
  for (const page of context.pages) {
    if (
      (query.physicalLife !== undefined && page.physicalLife !== query.physicalLife) ||
      (query.epoch !== undefined && page.epoch !== query.epoch)
    )
      continue;
    if (
      subjectSet &&
      !page.subjects.some((subject) => subjectSet.has(subject)) &&
      !(
        query.includeGeometry &&
        page.batches.some(
          (batch) =>
            batch.bindings.some((binding) => binding.seed.spatialContext) ||
            batch.entries.some((entry) => entry.receipt?.spatialContext),
        )
      )
    )
      continue;
    for (const batch of page.batches)
      for (const entry of batch.entries) pending.push({ batch, entry });
  }
  // Mixed physical blocks may split one complete logical entry. Reassemble
  // disjoint members before pagination so a byte boundary never skips its siblings.
  const logicalEntries = new Map<string, { batch: ReceivedBatch; entry: ReceivedEntry }>();
  for (const value of pending) {
    const key = JSON.stringify([
        value.batch.actorId,
        value.batch.physicalLife,
        value.batch.epoch,
        value.batch.batchOrder,
        value.entry.entryIndex,
      ]),
      held = logicalEntries.get(key);
    if (!held) {
      logicalEntries.set(key, value);
      continue;
    }
    const bindings = new Map(held.batch.bindings.map((binding) => [binding.id, binding]));
    for (const binding of value.batch.bindings) {
      const prior = bindings.get(binding.id);
      if (!prior) bindings.set(binding.id, binding);
      else {
        bindings.set(binding.id, mergeReceivedBindings(prior, binding));
      }
    }
    const receipt =
      held.entry.receipt && value.entry.receipt
        ? {
            ...held.entry.receipt,
            facets: [...held.entry.receipt.facets, ...value.entry.receipt.facets],
          }
        : (held.entry.receipt ?? value.entry.receipt);
    logicalEntries.set(key, {
      batch: { ...held.batch, bindings: [...bindings.values()] },
      entry: {
        ...held.entry,
        coverage: [...held.entry.coverage, ...value.entry.coverage],
        charge: {
          bytes: Math.max(held.entry.charge.bytes, value.entry.charge.bytes),
          count: held.entry.charge.count + value.entry.charge.count,
        },
        ...(receipt ? { receipt } : {}),
      },
    });
  }
  pending.length = 0;
  pending.push(...logicalEntries.values());
  // Captured first-use seeds establish only the supported state before this
  // carrier, never an event at the requested cut. Keep the nearest carrier per track.
  for (const { batch, entry } of pending) {
    if (entry.receivedAt < from) continue;
    const byBinding = new Map<number, ReceivedCoverage[]>();
    for (const coverage of entry.coverage) {
      const held = byBinding.get(coverage.binding);
      if (held) held.push(coverage);
      else byBinding.set(coverage.binding, [coverage]);
    }
    for (const [id, coverages] of byBinding) {
      const binding = batch.bindings.find((binding) => binding.id === id)!;
      if (
        (subjectSet &&
          !subjectSet.has(binding.subject) &&
          !(query.includeGeometry && binding.seed.spatialContext)) ||
        binding.seed.at > through
      )
        continue;
      const key = String(binding.id),
        held = carried.get(key);
      if (held && entry.receivedAt >= held.until) continue;
      const parts = new Set(
        coverages.flatMap((coverage) => coverage.members.flatMap((member) => member.partIndices)),
      );
      carried.set(key, {
        seed: binding,
        parts,
        carrier: {
          actorId: batch.actorId,
          physicalLife: batch.physicalLife,
          epoch: batch.epoch,
          batchOrder: batch.batchOrder,
          entryIndex: entry.entryIndex,
          memberIndex: coverages[0]!.members[0]!.memberIndex,
        },
        until: entry.receivedAt,
        binding: binding.id,
        memberCarriers: new Map(
          coverages.flatMap((coverage) =>
            coverage.members.flatMap((member) =>
              member.partIndices.map(
                (index) =>
                  [
                    binding.parts.find((part) => part.partIndex === index)!.logicalMember,
                    member.memberIndex,
                  ] as const,
              ),
            ),
          ),
        ),
      });
    }
  }
  for (const {
    receipt: seed,
    binding,
    carrier,
    carrierMembers,
    bindingParts,
  } of context.currentSeeds ?? []) {
    if (
      !carrier ||
      (subjectSet &&
        !subjectSet.has(seed.subject) &&
        !(query.includeGeometry && seed.spatialContext)) ||
      seed.at > through
    )
      continue;
    const held = carried.get(String(binding));
    if (!held || held.until > through)
      carried.set(String(binding), {
        seed,
        carrier,
        until: Infinity,
        binding,
        memberCarriers: new Map(
          (carrierMembers ?? []).flatMap((member) =>
            member.partIndices.map(
              (index) =>
                [
                  bindingParts.find((part) => part.partIndex === index)!.logicalMember,
                  member.memberIndex,
                ] as const,
            ),
          ),
        ),
      });
  }
  pending.sort(
    (a, b) =>
      b.entry.order - a.entry.order ||
      b.batch.batchOrder - a.batch.batchOrder ||
      b.entry.entryIndex - a.entry.entryIndex,
  );
  for (const { batch, entry } of pending) {
    if (++candidates > maxCandidates || work >= maxWork) {
      result.incomplete = true;
      break;
    }
    if (
      entry.receivedAt > through ||
      entry.receivedAt < from ||
      (context.at !== undefined &&
        context.maxAgeSeconds !== undefined &&
        !temporalRecentAt(entry.receivedAt, context.at, context.maxAgeSeconds))
    )
      continue;
    if (
      entry.rejected?.some(
        (hole) =>
          (!subjectSet || subjectSet.has(hole.subject)) &&
          receivedPositionEligible(
            { ...batch, entryIndex: entry.entryIndex, memberIndex: hole.memberIndex },
            entry.receivedAt,
            context.frontier,
          ) &&
          (!query.kinds ||
            hole.parts.some((part) => query.kinds!.some((kind) => kind === part.kind))),
      )
    )
      result.incomplete = true;
    if (
      query.before &&
      (entry.order > query.before.order ||
        (entry.order === query.before.order &&
          (batch.batchOrder > query.before.batchOrder ||
            (batch.batchOrder === query.before.batchOrder &&
              entry.entryIndex > query.before.entryIndex))))
    )
      continue;
    if (
      entry.kind === 'boundary' &&
      entry.coverage.some((coverage) =>
        ['loss', 'unchecked', 'attention-exit'].includes(coverage.boundary ?? entry.reason ?? ''),
      )
    )
      result.incomplete = true;
    const coordinates = [
      ...new Set(
        entry.receipt
          ? entry.receipt.facets.map((facet) => facet.memberIndex)
          : entry.coverage
              .filter((coverage) => {
                const binding = batch.bindings.find((binding) => binding.id === coverage.binding)!;
                return (
                  !subjectSet ||
                  subjectSet.has(binding.subject) ||
                  (!!query.includeGeometry && !!binding.seed.spatialContext)
                );
              })
              .flatMap((coverage) => coverage.members.map((member) => member.memberIndex)),
      ),
    ]
      .filter(
        (memberIndex) =>
          (!query.before ||
            batch.batchOrder !== query.before.batchOrder ||
            entry.entryIndex !== query.before.entryIndex ||
            memberIndex < query.before.memberIndex) &&
          receivedPositionEligible(
            { ...batch, entryIndex: entry.entryIndex, memberIndex },
            entry.receivedAt,
            context.frontier,
          ),
      )
      .sort((a, b) => b - a);
    const selectedMembers = new Set(coordinates.slice(0, Math.max(0, maxWork - work)));
    if (selectedMembers.size < coordinates.length) {
      result.incomplete = true;
      result.hasMore = true;
    }
    if (selectedMembers.size)
      result.examinedBefore = {
        epoch: batch.epoch,
        batchOrder: batch.batchOrder,
        entryIndex: entry.entryIndex,
        memberIndex: Math.min(...selectedMembers),
        at: entry.receivedAt,
        order: entry.order,
      };
    const received = materializeReceivedEntry(
      batch,
      entry,
      subjectSet,
      selectedMembers,
      query.includeGeometry,
    );
    if (!received) continue;
    if (query.cut && !temporalReceiptWithinPrefix(received, query.cut)) continue;
    const facets: TemporalFacetReference[] = [],
      values: TemporalValue[] = [];
    for (const facet of received.facets) {
      if (
        query.before &&
        received.batchOrder === query.before.batchOrder &&
        received.entryIndex === query.before.entryIndex &&
        facet.memberIndex >= query.before.memberIndex
      )
        continue;
      if (++work > maxWork) {
        result.incomplete = true;
        break;
      }
      if (
        !receivedPositionEligible(
          { ...received, memberIndex: facet.memberIndex },
          received.at,
          context.frontier,
        )
      )
        continue;
      const fragment = retainedValueAt(context.sources, facet),
        value = fragment && materializeTemporalValue(facet, fragment, context.sources);
      if (
        !value ||
        (query.kinds && !query.kinds.includes(value.kind)) ||
        !temporalFacetEligible(context.disclosure, context.actorId, facet, value)
      )
        continue;
      if (
        query.measurements &&
        (facet.measuredThrough < query.measurements.from ||
          facet.measuredFrom > query.measurements.through)
      )
        continue;
      facets.push(facet);
      values.push(value);
    }
    if (!facets.length) continue;
    const receipt = temporalReceiptForRead(
        selectTemporalReceiptFacets(received, facets, context.sources, context.disclosure),
      ),
      added = byteLength(receipt) + values.reduce((sum, value) => sum + byteLength(value), 0);
    if (result.entries.length >= limit || bytes + added > maxBytes) {
      result.hasMore = true;
      result.incomplete = true;
      break;
    }
    bytes += added;
    result.entries.push({ receipt, values });
    result.examinedBefore = {
      epoch: receipt.epoch,
      batchOrder: receipt.batchOrder,
      entryIndex: receipt.entryIndex,
      memberIndex: Math.min(...receipt.facets.map((facet) => facet.memberIndex)),
      at: receipt.at,
      order: receipt.order,
    };
  }
  for (const {
    seed: captured,
    parts,
    carrier,
    until,
    binding,
    memberCarriers,
  } of carried.values()) {
    if (work >= maxWork) {
      result.incomplete = true;
      break;
    }
    let seed: TemporalReceipt;
    if ('parts' in captured) {
      const available = captured.parts.filter(
          (part) =>
            (!parts || parts.has(part.partIndex)) &&
            (!query.kinds || query.kinds.some((kind) => kind === part.kind)),
        ),
        logical = [...new Set(available.map((part) => part.logicalMember))],
        selected = new Set(logical.slice(0, Math.max(0, maxWork - work)));
      if (selected.size < logical.length) result.incomplete = true;
      seed = materializeReceivedBindingSeed(
        captured,
        new Set(
          available
            .filter((part) => selected.has(part.logicalMember))
            .map((part) => part.partIndex),
        ),
      );
    } else seed = captured;
    if (
      seed.at >= from ||
      seed.at > through ||
      until < from ||
      (query.cut && !temporalReceiptWithinPrefix(seed, query.cut))
    )
      continue;
    const availableAt = Math.max(from, seed.at);
    if (availableAt > through) continue;
    if (
      context.frontier?.expiredThroughTime !== null &&
      context.frontier?.expiredThroughTime !== undefined &&
      availableAt <= context.frontier.expiredThroughTime
    )
      continue;
    const facets: TemporalFacetReference[] = [],
      values: TemporalValue[] = [];
    for (const facet of seed.facets) {
      const actualMember = memberCarriers.get(facet.memberIndex);
      if (
        actualMember === undefined ||
        !receivedStateEligible(
          { ...carrier, memberIndex: actualMember },
          availableAt,
          context.frontier,
        )
      )
        continue;
      if (++work > maxWork) {
        result.incomplete = true;
        break;
      }
      const fragment = retainedValueAt(context.sources, facet),
        value = fragment && materializeTemporalValue(facet, fragment, context.sources);
      if (
        !value ||
        (query.kinds && !query.kinds.includes(value.kind)) ||
        !temporalFacetEligible(context.disclosure, context.actorId, facet, value)
      )
        continue;
      facets.push(facet);
      values.push(value);
    }
    if (!facets.length) continue;
    const checkpoint: TemporalCheckpoint = {
      ...temporalReceiptForRead({ ...seed, facets }),
      binding,
      pageId: 'captured-binding',
      sourceIds: [],
    };
    (result.baselines ??= []).push({
      checkpoint,
      values,
      forReceipt: { ...carrier, memberIndex: memberCarriers.get(facets[0]!.memberIndex)! },
      availableAt,
      origins: facets.map((facet) => ({
        kind: 'checkpoint' as const,
        batchOrder: carrier.batchOrder,
        entryIndex: carrier.entryIndex,
        memberIndex: memberCarriers.get(facet.memberIndex)!,
      })),
    });
  }
  result.entries.reverse();
  return result;
}
function refreshTemporalPage(page: TemporalPage, world: WorldState): void {
  const metadata = temporalPageMetadata(page, { world });
  page.subjects = metadata.subjects;
  page.sourceIds = metadata.sourceIds;
  page.individualIds = metadata.individualIds;
  page.sourceRefs = metadata.references;
  page.count = metadata.count;
  page.bytes = metadata.entryBytes;
  page.fromAt = metadata.firstAt ?? 0;
  page.throughAt = metadata.lastAt ?? 0;
}
export function retireTemporalPages(
  world: WorldState,
  actorId: string,
  pageIds: ReadonlySet<string>,
  nextDue: number | null,
): void {
  const actor = world.experience?.temporal?.actors[actorId];
  if (!actor) return;
  touchNativeEvidence(world, 'temporal', actorId);
  actor.pages = actor.pages.filter((page) => !pageIds.has(page.id));
  actor.nextDue = nextDue;
}
export function retireTemporalEntries(
  world: WorldState,
  actorId: string,
  pageId: string,
  entries: ReadonlySet<string>,
  nextDue: number | null,
): void {
  const actor = world.experience?.temporal?.actors[actorId],
    page = actor?.pages.find((page) => page.id === pageId);
  if (!actor || !page) return;
  const selections = page.batches.flatMap((batch) =>
    batch.entries
      .filter((entry) => !entries.has(JSON.stringify([batch.batchOrder, entry.entryIndex])))
      .map((entry) => ({ batchOrder: batch.batchOrder, entryIndex: entry.entryIndex })),
  );
  const selected = selectTemporalPageEntries(page, selections);
  page.batches = selected.batches;
  markTemporalPageEdited(page);
  refreshTemporalPage(page, world);
  actor.nextDue = nextDue;
}
export function temporalAvailability(
  receipt: Pick<TemporalReceipt, 'change' | 'availabilityAt' | 'at'>,
): { reason: 'unavailable' | 'unchecked' | 'released'; at: number } | undefined {
  return receipt.change === 'unchecked'
    ? { reason: 'unchecked', at: receipt.availabilityAt ?? receipt.at }
    : receipt.change === 'loss'
      ? { reason: 'unavailable', at: receipt.availabilityAt ?? receipt.at }
      : receipt.change === 'attention-exit'
        ? { reason: 'released', at: receipt.availabilityAt ?? receipt.at }
        : undefined;
}
export function temporalFieldAvailability(receipt: TemporalReceipt, memberIndex: number) {
  return (
    receipt.availability?.find((availability) => availability.fields.includes(memberIndex)) ??
    temporalAvailability(receipt)
  );
}
export function groupedTemporalAvailability(
  values: readonly ({ reason: 'unavailable' | 'unchecked' | 'released'; at: number } | undefined)[],
): TemporalCheckpointAvailability[] {
  const groups = new Map<string, TemporalCheckpointAvailability>();
  values.forEach((value, index) => {
    if (!value) return;
    const key = JSON.stringify([value.reason, value.at]);
    let group = groups.get(key);
    if (!group) groups.set(key, (group = { ...value, fields: [] }));
    group.fields.push(index);
  });
  return [...groups.values()];
}
type TemporalFieldOwner = {
  facets: readonly TemporalFieldDependencies[];
  sourceIds: readonly string[];
} & Partial<Pick<TemporalReceipt, 'id' | 'receiverFrame'>>;
export function invalidateTemporalEvidence(
  world: WorldState,
  actorId: string,
  sourceIds: ReadonlySet<string>,
): string[] {
  const actor = world.experience?.temporal?.actors[actorId];
  if (!actor) return [];
  const released: string[] = actor.pages.flatMap((page) =>
    temporalPageReceipts(page)
      .filter((receipt) =>
        temporalReceiptAccountAliases(receipt, world.receivedValues?.sources ?? {}, world).some(
          (alias) => sourceIds.has(alias),
        ),
      )
      .map((receipt) => receipt.id),
  );
  invalidateTemporalFacets(world, actorId, (_value, field, owner) =>
    temporalReceiptAliases(
      { ...owner, sourceIds: [], facets: [field] },
      world.receivedValues?.sources ?? {},
      world,
    ).some((id) => sourceIds.has(id)),
  );
  for (const [id, capsule] of Object.entries(actor.supports ?? {}))
    if (temporalSupportAliases(capsule, world).some((alias) => sourceIds.has(alias))) {
      releaseTemporalSupport(world, actorId, id);
      released.push(id);
    }
  return released;
}
export function invalidateTemporalFacets(
  world: WorldState,
  actorId: string,
  revoked: (
    value: TemporalValue,
    reference: TemporalFieldDependencies,
    receipt: TemporalFieldOwner,
  ) => boolean,
): void {
  const actor = world.experience?.temporal?.actors[actorId];
  if (!actor) return;
  touchNativeEvidence(world, 'temporal', actorId);
  const removedAddresses = new Set<string>(),
    replacements: ReceivedChargeDirectory[] = [];
  for (const page of actor.pages) {
    const receipts = temporalPageReceipts(page),
      retained: TemporalReceipt[] = [];
    let pageChanged = false;
    for (const receipt of receipts) {
      const facets = receipt.facets.filter((facet) => {
        const fragment = retainedValueAt(world.receivedValues?.sources ?? {}, facet),
          value =
            fragment &&
            materializeTemporalValue(facet, fragment, world.receivedValues?.sources ?? {});
        return !value || !revoked(value, facet, receipt);
      });
      if (facets.length !== receipt.facets.length) pageChanged = true;
      if (facets.length) retained.push({ ...receipt, facets });
    }
    if (pageChanged) {
      for (const batch of page.batches)
        for (const entry of batch.entries)
          removedAddresses.add(JSON.stringify([batch.batchOrder, entry.entryIndex]));
      replaceTemporalPageReceipts(page, retained, world);
      refreshTemporalPage(page, world);
      const directory = temporalPageMetadata(page, { world }).chargeDirectory;
      if (directory.entries.length) replacements.push(directory);
      selectedRequestRecentIndividualRepair(world, actorId, page.individualIds);
    }
  }
  if (removedAddresses.size) {
    const affected = new Map<number, Set<number>>();
    for (const address of removedAddresses) {
      const [batchOrder, entryIndex] = JSON.parse(address) as [number, number];
      let entries = affected.get(batchOrder);
      if (!entries) affected.set(batchOrder, (entries = new Set()));
      entries.add(entryIndex);
    }
    for (const [batchOrder, entries] of affected) {
      for (const page of actor.pages) {
        const key = recentBlockKey(page, batchOrder),
          directory = orderedRecordGet(actor.recent.blocks, key);
        if (!directory) continue;
        const retained = directory.entries.filter((header) => {
          if (!entries.has(header.entryIndex)) return true;
          releaseDirectoryEntry(actor, directory, header);
          return false;
        });
        setRecentDirectoryEntries(actor, key, directory, retained);
        break;
      }
    }
    for (const directory of eligibleReceivedChargeDirectories(replacements, actor.frontier))
      appendTemporalChargeDirectory(actor, directory);
  }

  const owner = world.perceptionEvidence?.[actorId];
  if (owner) {
    const updates: Parameters<typeof currentGroupsSetRecording>[1][number][] = [];
    for (const [subjectId, contact] of currentContactEntries(owner))
      for (const group of contact.content.groups)
        for (const mark of group.recordings ?? []) {
          const members = mark.members.filter((member) => {
            const part = mark.binding.parts.find(
              (part) => part.kind === member.kind && part.part === member.part,
            );
            if (!part) return true;
            const fragment = retainedValueAt(world.receivedValues?.sources ?? {}, part.facet),
              value =
                fragment &&
                materializeTemporalValue(part.facet, fragment, world.receivedValues?.sources ?? {});
            return (
              !!value &&
              revoked(value, part.facet, {
                ...mark.binding.seed,
                facets: mark.binding.parts.map((part) => part.facet),
              })
            );
          });
          if (members.length)
            updates.push({
              subjectId,
              fields: group.received.fields,
              members: members.map((member) => [member.kind, member.part] as const),
              recording: undefined,
            });
        }
    if (updates.length) currentGroupsSetRecording(owner, updates);
  }
}

export function temporalSourceIds(receipt: TemporalReceipt): EvidenceSource[] {
  return receipt.facets.flatMap((facet) => (facet.original ? [facet.original.source] : []));
}

export type TemporalFieldDependencies = Pick<
  TemporalFacetReference,
  'valueRef' | 'reception' | 'original' | 'receivedFrom' | 'support' | 'detailSupport'
> & { memberIndex?: number };
/** Value-owned provenance is shared by expanded reads and compact metadata reads. */
export function temporalValueDependencyAliases(
  value: TemporalValue,
  world: TemporalReadSource | undefined,
): string[] {
  const aliases = new Set<string>();
  if (world && value.kind === 'association')
    for (const id of temporalRecognitionSupportSourceIds(world, value.learningSupport ?? []))
      aliases.add(id);
  if (value.kind === 'claim' || value.kind === 'physical-boundary')
    for (const dependency of sensoryFacetDependencies(value)) {
      aliases.add(dependency.source.id);
      if (dependency.ordinal !== null)
        aliases.add(personalFactAlias(dependency.source.id, dependency.ordinal));
      for (const alias of dependency.aliases) aliases.add(alias);
    }
  return [...aliases];
}

/** Resident blocks and sparse selected support share one dependency interpretation. */
export function temporalReceiptAliases(
  receipt: {
    facets: readonly TemporalFieldDependencies[];
    sourceIds: readonly string[];
    id?: string;
  },
  sources: ReceivedValueLookup,
  world: TemporalReadSource | undefined,
  selectedFragments?: readonly TemporalFragment[],
): string[] {
  const aliases = new Set([...receipt.sourceIds, ...(receipt.id ? [receipt.id] : [])]);
  const fact = (key: ObservationFactKey) => {
    aliases.add(key.source.id);
    aliases.add(personalFactAlias(key.source.id, key.ordinal));
  };
  for (let index = 0; index < receipt.facets.length; index++) {
    const reference = receipt.facets[index]!;
    if (receipt.id && reference.memberIndex !== undefined)
      aliases.add(personalFactAlias(receipt.id, reference.memberIndex));
    if (reference.original) fact(reference.original);
    if (reference.support) {
      fact(reference.support.original);
      aliases.add(reference.support.confirmation.id);
      for (const alias of reference.support.aliases ?? []) aliases.add(alias);
    }
    if (reference.detailSupport) {
      fact(reference.detailSupport.proof.original);
      aliases.add(reference.detailSupport.proof.confirmation.id);
      for (const alias of reference.detailSupport.proof.aliases ?? []) aliases.add(alias);
    }
    if (reference.receivedFrom) aliases.add(reference.receivedFrom.id);
    const fragment = selectedFragments
      ? selectedFragments[index]
      : retainedValueAt(sources, reference);
    if (
      !fragment ||
      (fragment.kind !== 'association' &&
        fragment.kind !== 'claim' &&
        fragment.kind !== 'physical-boundary')
    )
      continue;
    const value = materializeTemporalValue(reference, fragment, sources);
    if (value) for (const alias of temporalValueDependencyAliases(value, world)) aliases.add(alias);
  }
  return [...aliases];
}

/** Facet provenance can share the source-lookup list with a real account alias.
 * Correcting that provenance must not turn independent sibling facts into the
 * same account, including when a sparse capsule retains only selected facets. */
export function temporalReceiptAccountAliases(
  receipt: TemporalReceipt,
  sources: ReceivedValueLookup,
  world: TemporalReadSource,
  selectedFragments?: readonly TemporalFragment[],
): string[] {
  const dependencies = new Set(
    temporalReceiptAliases({ ...receipt, sourceIds: [] }, sources, world, selectedFragments),
  );
  return receipt.sourceIds.filter(
    (id) =>
      (receipt.origin?.kind === 'occurrence' && id === receipt.origin.eventId) ||
      !dependencies.has(id),
  );
}

/** Receipt IDs and true account aliases are interchangeable edit roots. Facet
 * provenance stays directional and must never pull independent sibling facts in. */
export function temporalAccountAliasClosure(
  world: WorldState,
  actorId: string,
  sourceIds: Iterable<string>,
): string[] {
  const temporal = world.experience?.temporal,
    actor = temporal?.actors[actorId];
  const groups = new Map<string, string[][]>();
  const add = (receipt: TemporalReceipt, values?: readonly TemporalFragment[]) => {
    const aliases = [
      receipt.id,
      ...temporalReceiptAccountAliases(receipt, world.receivedValues?.sources ?? {}, world, values),
    ];
    for (const alias of aliases) {
      const linked = groups.get(alias) ?? [];
      linked.push(aliases);
      groups.set(alias, linked);
    }
  };
  for (const chunk of actor?.pages ?? [])
    for (const receipt of temporalPageReceipts(chunk)) add(receipt);
  for (const support of Object.values(actor?.supports ?? {})) add(support.receipt, support.values);
  for (const interval of captureTemporalCurrentSeeds(world, actorId)) add(interval.receipt);
  const selected = new Set(sourceIds),
    queue = [...selected],
    visited = new Set<string[]>();
  for (let index = 0; index < queue.length; index++)
    for (const aliases of groups.get(queue[index]!) ?? []) {
      if (visited.has(aliases)) continue;
      visited.add(aliases);
      for (const alias of aliases)
        if (!selected.has(alias)) {
          selected.add(alias);
          queue.push(alias);
        }
    }
  return [...selected];
}

/** Dropped facet aliases must leave too: otherwise their now-unmatched source
 * IDs would be misclassified as whole-account aliases on the next read/edit. */
export function selectTemporalReceiptFacets(
  receipt: TemporalReceipt,
  facets: TemporalFacetReference[],
  sources: ReceivedValueLookup,
  world: TemporalReadSource,
): TemporalReceipt {
  if (facets.length === receipt.facets.length) return { ...receipt, facets };
  const retained = new Set([
    ...temporalReceiptAccountAliases(receipt, sources, world),
    ...temporalReceiptAliases({ ...receipt, facets, sourceIds: [] }, sources, world),
  ]);
  const selected = new Set(facets.map((field) => field.memberIndex));
  const { availability: _availability, ...header } = receipt;
  const availability = receipt.availability
    ?.map((group) => ({ ...group, fields: group.fields.filter((id) => selected.has(id)) }))
    .filter((group) => group.fields.length);
  return {
    ...header,
    facets,
    sourceIds: receipt.sourceIds.filter((id) => retained.has(id)),
    ...(availability?.length ? { availability } : {}),
  };
}

/** Sparse support outlives its source block, but keeps the same exact dependency
 * closure. Revocation follows these selected facts, never an unrelated chunk. */
export function temporalSupportAliases(
  capsule: TemporalSupportCapsule,
  world: WorldState,
): string[] {
  return temporalReceiptAliases(capsule.receipt, {}, world, capsule.values);
}

export function temporalValueIndividualId(
  value: TemporalValue | TemporalFragment,
): string | undefined {
  if (value.kind === 'association' && value.subject.kind === 'individual')
    return value.subject.individualId;
  if (value.kind === 'event' && value.sourceSubject?.kind === 'individual')
    return value.sourceSubject.individualId;
  return;
}

export function temporalReceiptIndividualIds(
  receipt: { facets: readonly TemporalFieldDependencies[]; subjectIdentity?: ObserverSubject },
  sources: ReceivedValueLookup,
): string[] {
  const ids = new Set<string>();
  if (receipt.subjectIdentity?.kind === 'individual') ids.add(receipt.subjectIdentity.individualId);
  for (const reference of receipt.facets) {
    const fragment = retainedValueAt(sources, reference);
    if (!fragment || (fragment.kind !== 'association' && fragment.kind !== 'event')) continue;
    const value = materializeTemporalValue(reference, fragment, sources);
    const id = value && temporalValueIndividualId(value);
    if (id !== undefined) ids.add(id);
  }
  return [...ids];
}

export function temporalReceiptForSource(
  world: WorldState,
  actorId: string,
  sourceId: string,
): TemporalReceiptLocator | undefined {
  const chunks = world.experience?.temporal?.actors[actorId]?.pages ?? [];
  const maxAge = selectedTemporalPolicy(world).recent.maxAgeSeconds;
  for (let index = chunks.length - 1; index >= 0; index--)
    for (const receipt of temporalPageReceipts(chunks[index]!))
      if (
        temporalRecentAt(receipt.at, world.simTime, maxAge) &&
        receipt.sourceIds.includes(sourceId)
      )
        return {
          actorId,
          physicalLife: receipt.physicalLife,
          epoch: receipt.epoch,
          batchOrder: receipt.batchOrder,
          entryIndex: receipt.entryIndex,
        };
  return undefined;
}

/** Physical cleanup may lag logical expiry. Source edits may address only an
 * actually retained assignment, confirmation or needed suffix checkpoint state. */
export function hasRetainedTemporalSource(
  world: WorldState,
  actorId: string,
  sourceId: string,
): boolean {
  const actor = world.experience?.temporal?.actors[actorId];
  if (!actor) return false;
  const cutoff = world.simTime - selectedTemporalPolicy(world).recent.maxAgeSeconds,
    sources = world.receivedValues?.sources ?? {};
  const fact = parsePersonalFactAlias(sourceId);
  const directSource = fact?.observationId ?? sourceId;
  if (parseTemporalReceiptId(directSource))
    return receivedDirectorySourceContains(
      actor.recent,
      actorId,
      directSource,
      fact?.ordinal,
      Math.max(cutoff, actor.frontier?.expiredThroughTime ?? -Infinity),
    );
  const includes = (owner: {
    facets: readonly TemporalFieldDependencies[];
    sourceIds: readonly string[];
    id?: string;
  }) => temporalReceiptAliases(owner, sources, world).includes(sourceId);
  for (const page of actor.pages) {
    if (page.throughAt <= cutoff || !page.sourceIds.includes(sourceId)) continue;
    if (
      temporalPageReceipts(page).some(
        (receipt) =>
          receipt.at > cutoff &&
          receipt.facets.some((facet) =>
            receivedPositionEligible(
              { ...receipt, memberIndex: facet.memberIndex },
              receipt.at,
              actor.frontier,
            ),
          ) &&
          includes(receipt),
      )
    )
      return true;
  }
  return false;
}

/** The same source overlay fences hot and cold exact facts after correction. */
export function temporalFacetEligible(
  world: TemporalReadSource,
  actorId: string,
  reference: Pick<
    TemporalFieldDependencies,
    'original' | 'receivedFrom' | 'support' | 'detailSupport'
  >,
  value: TemporalValue,
): boolean {
  const allowed = (id: string) => !temporalReadSourceRevoked(world, actorId, id);
  const factAllowed = (fact: ObservationFactKey) =>
    fact.source.observer.actorId === actorId &&
    allowed(fact.source.id) &&
    allowed(personalFactAlias(fact.source.id, fact.ordinal));
  if (
    (reference.original && !factAllowed(reference.original)) ||
    (reference.receivedFrom &&
      (reference.receivedFrom.observer.actorId !== actorId || !allowed(reference.receivedFrom.id)))
  )
    return false;
  if (
    [reference.support, reference.detailSupport?.proof].some(
      (proof) =>
        proof &&
        (!factAllowed(proof.original) ||
          !allowed(proof.confirmation.id) ||
          !(proof.aliases ?? []).every(allowed)),
    )
  )
    return false;
  if (value.kind === 'association')
    return temporalRecognitionSupportSourceIds(world, value.learningSupport ?? []).every(allowed);
  if (value.kind !== 'personal-account')
    return sensoryFacetDependencies(value).every(
      (dependency) =>
        dependency.source.observer.actorId === actorId &&
        allowed(dependency.source.id) &&
        (dependency.ordinal === null ||
          allowed(personalFactAlias(dependency.source.id, dependency.ordinal))) &&
        dependency.aliases.every(allowed),
    );
  return true;
}

function sameReceiptAddress(
  receipt: TemporalReceiptLocator,
  locator: TemporalReceiptLocator,
): boolean {
  return (
    receipt.actorId === locator.actorId &&
    receipt.physicalLife === locator.physicalLife &&
    receipt.epoch === locator.epoch &&
    receipt.batchOrder === locator.batchOrder &&
    receipt.entryIndex === locator.entryIndex
  );
}
function nativeTemporalReceipt(
  world: WorldState,
  locator: TemporalReceiptLocator,
): { receipt: TemporalReceipt; receivedAt: number } | undefined {
  const actor = world.experience?.temporal?.actors[locator.actorId];
  if (!actor) return;
  for (const page of actor.pages) {
    const receipt = temporalPageReceipt(page, locator);
    if (!receipt) continue;
    const facets = receipt.facets.filter((facet) =>
      receivedPositionEligible(
        { ...receipt, memberIndex: facet.memberIndex },
        receipt.at,
        actor.frontier,
      ),
    );
    if (facets.length)
      return {
        receipt: selectTemporalReceiptFacets(
          receipt,
          facets,
          world.receivedValues?.sources ?? {},
          world,
        ),
        receivedAt: receipt.at,
      };
  }
  return;
}
/** Resolve an already owned receipt. Cold callers supply their separately scoped
 * captured body at the server admission boundary instead of expanding all history. */
export function retainedTemporalReceipt(
  world: WorldState,
  locator: TemporalReceiptLocator,
): { receipt: TemporalReceipt; values: TemporalValue[] } | undefined {
  const temporal = world.experience?.temporal;
  const actor = temporal?.actors[locator.actorId];
  if (!temporal || !actor) return;
  const support = actor.supports?.[temporalReceiptId(locator)];
  const native = nativeTemporalReceipt(world, locator);
  const heldReceipt = native?.receipt;
  const receipt =
    heldReceipt &&
    temporalRecentAt(
      native!.receivedAt,
      world.simTime,
      selectedTemporalPolicy(world).recent.maxAgeSeconds,
    )
      ? heldReceipt
      : undefined;
  const selected =
    receipt ??
    (support && sameReceiptAddress(support.receipt, locator) ? support.receipt : undefined);
  if (!selected) return;
  const values: TemporalValue[] = [];
  for (const [index, reference] of selected.facets.entries()) {
    const fragment = receipt
      ? retainedValueAt(world.receivedValues?.sources ?? {}, reference)
      : support?.values[index];
    const value =
      fragment &&
      materializeTemporalValue(reference, fragment, world.receivedValues?.sources ?? {});
    if (!value) return;
    values.push(value);
  }
  return { receipt: cloneValue(temporalReceiptForRead(selected)), values: cloneValue(values) };
}

export function temporalReceiptSource(receipt: TemporalReceiptLocator): EvidenceSource {
  return {
    family: 'native-exposure',
    id: temporalReceiptId(receipt),
    revision: 1,
    observer: { actorId: receipt.actorId, physicalLife: receipt.physicalLife },
  };
}
/** Logical candidate coordinates; actor and receiving life come from their
 * actual scoped owner, never from parsing a private entity identity. */
export function parseTemporalReceiptId(
  id: string,
): Pick<TemporalReceiptLocator, 'epoch' | 'batchOrder' | 'entryIndex'> | undefined {
  const match = /^temporal-receipt-(.+-receipt-epoch-\d+)-(\d+)-(\d+)$/u.exec(id);
  if (!match) return;
  const batchOrder = Number(match[2]),
    entryIndex = Number(match[3]);
  if (
    !Number.isSafeInteger(batchOrder) ||
    batchOrder <= 0 ||
    !Number.isSafeInteger(entryIndex) ||
    entryIndex < 0 ||
    String(batchOrder) !== match[2] ||
    String(entryIndex) !== match[3]
  )
    return;
  return { epoch: match[1]!, batchOrder, entryIndex };
}
export function temporalReceiptLocatorFromSource(
  source: EvidenceSource,
): TemporalReceiptLocator | undefined {
  if (source.family !== 'native-exposure' || source.revision !== 1) return;
  const position = parseTemporalReceiptId(source.id);
  return (
    position && {
      actorId: source.observer.actorId,
      physicalLife: source.observer.physicalLife,
      ...position,
    }
  );
}
/** Exact direct-source membership uses the resident batch branch, not a list of
 * generated receipt aliases in every SQL block. Past lives keep their own owner. */
export function receivedDirectorySourceContains(
  recent: ReceivedRecentDirectory,
  actorId: string,
  sourceId: string,
  memberIndex?: number,
  receivedAfter = -Infinity,
): boolean {
  const position = parseTemporalReceiptId(sourceId);
  if (!position) return false;
  const prefix = String(position.batchOrder).padStart(16, '0') + ':';
  for (const [key, block] of objectIndexEntries(readOnlyDraftView(recent.blocks).root, prefix)) {
    if (!key.startsWith(prefix)) break;
    if (
      block.epoch === position.epoch &&
      receivedDirectoryContains(
        recent,
        { actorId, physicalLife: block.physicalLife, ...position },
        memberIndex,
        receivedAfter,
      )
    )
      return true;
  }
  return false;
}
export function isTemporalReceiptSource(source: EvidenceSource): boolean {
  return temporalReceiptLocatorFromSource(source) !== undefined;
}
/** A later knowledge grant owns only its necessary exact support. Reusing an
 * acquired contribution here never inserts an old reception behind new history. */
export function retainTemporalObservationSupport(
  world: WorldState,
  actorId: string,
  observation: ObservationContribution,
  sourceOrdinals: ReadonlySet<number> | undefined,
  options: { required?: boolean; maxBytes: number; maxRecords: number },
): TemporalReceiptLocator | undefined {
  const actor = actorHistory(world, actorId)?.actor;
  if (
    !actor ||
    observation.observer.actorId !== actorId ||
    observation.observer.physicalLife !== actor.physicalLife
  )
    return;
  const requested = observation.facets.filter(
    (facet) => !sourceOrdinals || sourceOrdinals.has(facet.ordinal),
  );
  if (!requested.length) return;
  for (const capsule of Object.values(actor.supports ?? {}))
    if (
      requested.every((facet) =>
        capsule.receipt.facets.some(
          (reference) =>
            reference.original?.source.id === observation.id &&
            reference.original.source.revision === observation.revision &&
            reference.original.source.observer.physicalLife === observation.observer.physicalLife &&
            reference.original.ordinal === facet.ordinal,
        ),
      )
    ) {
      if (
        options.required &&
        !capsule.required &&
        !setTemporalSupportRequired(world, actorId, capsule.receipt.id, true, options)
      )
        return;
      return capsule.receipt;
    }
  const capsule = retainTemporalCaptureSupport(
    world,
    actorId,
    {
      subject:
        observation.origin.kind === 'exposure'
          ? observation.origin.episodeId
          : observation.origin.eventId,
      change: 'baseline',
      required: options.required,
      sourceIds: [observation.id],
      origin: observation.origin,
      facets: requested.map(({ ordinal, ...facet }) => ({
        ...facet,
        memberIndex: ordinal,
        original: contributionFactKey(observation, ordinal),
      })),
    },
    options,
  );
  return capsule?.receipt;
}

export function retainTemporalSupport(
  world: WorldState,
  locator: TemporalReceiptLocator,
  options: {
    memberIndices?: readonly number[];
    required?: boolean;
    maxBytes: number;
    maxRecords: number;
  },
): TemporalSupportCapsule | undefined {
  touchNativeEvidence(world, 'temporal', locator.actorId);
  const temporal = world.experience?.temporal;
  const actor = temporal?.actors[locator.actorId];
  if (!temporal || !actor) return;
  const id = temporalReceiptId(locator);
  const prior = actor.supports?.[id];
  if (
    prior &&
    ((prior.receipt.change === 'retained-state' && !options.memberIndices) ||
      options.memberIndices?.every((ordinal) =>
        prior.receipt.facets.some((facet) => facet.memberIndex === ordinal),
      ))
  ) {
    if (
      options.required &&
      !prior.required &&
      !setTemporalSupportRequired(world, locator.actorId, id, true, options)
    )
      return;
    return actor.supports![id];
  }
  const native = nativeTemporalReceipt(world, locator),
    receipt = native?.receipt;
  if (
    !receipt ||
    !temporalRecentAt(
      native!.receivedAt,
      world.simTime,
      selectedTemporalPolicy(world).recent.maxAgeSeconds,
    )
  )
    return;
  const selected =
    options.memberIndices &&
    new Set([
      ...options.memberIndices,
      ...(prior?.receipt.facets.map((facet) => facet.memberIndex) ?? []),
    ]);
  if (
    options.memberIndices?.some(
      (ordinal) => !receipt.facets.some((facet) => facet.memberIndex === ordinal),
    )
  )
    return;
  const facets = receipt.facets.filter((facet) => !selected || selected.has(facet.memberIndex));
  if (!facets.length) return;
  const values: TemporalFragment[] = [];
  for (const reference of facets) {
    const value = retainedValueAt(world.receivedValues?.sources ?? {}, reference);
    if (!value) return;
    values.push(immutableDataSnapshot(value, readOnlyDraftView));
  }
  const selectedReceipt = selectTemporalReceiptFacets(
    receipt,
    facets,
    world.receivedValues?.sources ?? {},
    world,
  );
  selectedReceipt.facets = selectedReceipt.facets.map((facet) =>
    standaloneTemporalFacet(facet, world.receivedValues?.sources ?? {}),
  );
  const capsule: TemporalSupportCapsule = {
    receipt: immutableDataSnapshot(
      {
        ...selectedReceipt,
        sourceIds: [
          ...new Set([
            ...selectedReceipt.sourceIds,
            ...facets.flatMap((facet) => [
              personalFactAlias(receipt.id, facet.memberIndex),
              ...(facet.original
                ? [
                    facet.original.source.id,
                    personalFactAlias(facet.original.source.id, facet.original.ordinal),
                  ]
                : []),
            ]),
          ]),
        ],
      },
      readOnlyDraftView,
    ),
    values,
    bytes: 0,
    required: prior?.required === true || options.required === true,
  };
  return admitTemporalSupport(world, locator.actorId, capsule, options, prior);
}

function admitTemporalSupport(
  world: WorldState,
  actorId: string,
  capsule: TemporalSupportCapsule,
  options: { maxBytes: number; maxRecords: number },
  prior?: TemporalSupportCapsule,
): TemporalSupportCapsule | undefined {
  const actor = world.experience?.temporal?.actors[actorId];
  if (!actor) return;
  const id = capsule.receipt.id;
  initialBytes(capsule, () => temporalSupportLogicalBytes(capsule));
  ensureExperienceAccounting(world, actorId);
  const account = actor.accounts?.[capsule.required ? 'required' : 'optional'];
  const previousAccount = prior && actor.accounts?.[prior.required ? 'required' : 'optional'];
  const oldBytes = previousAccount === account ? (prior?.bytes ?? 0) : 0;
  const oldCount = previousAccount === account && prior ? 1 : 0;
  if (
    !account ||
    account.count + 1 - oldCount > options.maxRecords ||
    account.bytes + capsule.bytes - oldBytes > options.maxBytes
  )
    return;
  if (prior && previousAccount) {
    previousAccount.bytes -= prior.bytes;
    previousAccount.count--;
  }
  (actor.supports ??= {})[id] = capsule;
  account.bytes += capsule.bytes;
  account.count++;
  if (capsule.required) markRequiredExperienceMaintenance(world, actorId);
  // Sparse retained place proof participates in the same derived native index as
  // its original account. Replacing a place-bearing owner may expose an older
  // cold fallback; never delete only the cached winner and claim completeness.
  const places = temporalKnownPlaceCapsules(actorId, capsule),
    previousPlaces = prior ? temporalKnownPlaceCapsules(actorId, prior) : [];
  if (JSON.stringify(previousPlaces) !== JSON.stringify(places)) {
    if (previousPlaces.length) invalidateKnownPlaceEvidence(world, actorId);
    acquireKnownPlaceCapsules(world, actorId, places);
  }
  chargeWork({ effects: 1, outputBytes: Math.max(0, capsule.bytes - (prior?.bytes ?? 0)) });
  return capsule;
}

/** Explicitly retain previously received state without creating sensory history.
 * Its source address belongs to this capsule; measurement and availability remain original. */
/** Lasting support owns its minimal pose after recent/shared values are reclaimed. */
function standaloneTemporalFacet(
  reference: TemporalFacetReference,
  sources: ReceivedValueLookup,
): TemporalFacetReference {
  const reception = reference.reception;
  if (reception?.kind !== 'body' || !reception.poseRef) return reference;
  const pose = receivedValueAt(sources, reception.poseRef);
  if (pose?.kind !== 'body-pose') throw new Error('Retained support has no received pose.');
  return { ...reference, reception: { kind: 'body', pose: pose.pose } };
}
function retainTemporalCaptureSupport(
  world: WorldState,
  actorId: string,
  input: TemporalCaptureInput,
  options: { required?: boolean; maxBytes: number; maxRecords: number },
): TemporalSupportCapsule | undefined {
  const actor = actorHistory(world, actorId)?.actor;
  if (!actor) return;
  const batchOrder = receivedIdentity(world, 'retained-support'),
    entryIndex = 0,
    values: TemporalFragment[] = [];
  const facets: TemporalFacetReference[] = input.facets.map((field, memberIndex) => {
    const projection =
      'received' in field ? field.received.projection : splitTemporalValue(field.value);
    const metadata =
      'received' in field
        ? (({ received, ...rest }) => rest)(field)
        : (({ value, retainedValue, ...rest }) => rest)(field);
    const retained = retainReceivedValue(
      world,
      projection.value,
      'received' in field ? field.received.reference : field.retainedValue,
    );
    values.push(immutableDataSnapshot(projection.value, readOnlyDraftView));
    return standaloneTemporalFacet(
      {
        ...metadata,
        valueRef: retained.reference,
        memberIndex: field.memberIndex ?? memberIndex,
        ...(projection.reception ? { reception: projection.reception } : {}),
      },
      world.receivedValues?.sources ?? {},
    );
  });
  const receipt: TemporalReceipt = {
    actorId,
    physicalLife: actor.physicalLife,
    epoch: actor.epoch,
    batchOrder,
    entryIndex,
    id: temporalReceiptId({ epoch: actor.epoch, batchOrder, entryIndex }),
    at: world.simTime,
    order: temporalReceivedOrder(world, actorId),
    acquisition: batchOrder,
    subject: input.subject,
    change: 'retained-state',
    required: options.required === true,
    sourceIds: input.sourceIds ?? [],
    facets,
    ...(input.subjectIdentity ? { subjectIdentity: input.subjectIdentity } : {}),
    ...(input.availability ? { availability: input.availability } : {}),
  };
  return admitTemporalSupport(
    world,
    actorId,
    {
      receipt: immutableDataSnapshot(receipt, readOnlyDraftView),
      values,
      bytes: 0,
      required: options.required === true,
    },
    options,
  );
}
export function retainTemporalCurrentSupport(
  world: WorldState,
  actorId: string,
  record: CurrentFacetRecord,
  options: { required?: boolean; maxBytes: number; maxRecords: number },
): TemporalSupportCapsule | undefined {
  const owner = world.perceptionEvidence?.[actorId];
  if (!owner) return;
  const native = currentNativeFacet(
    owner,
    currentFacetKey(record.grant.subjectId, record.value.kind, record.grant.channel),
    { exposure: record.grant.exposure },
  );
  if (
    !native ||
    native.field.id !== record.id ||
    native.metadata.revision !== record.revision ||
    native.originalSource.id !== record.originalSource.id ||
    native.originalSource.revision !== record.originalSource.revision ||
    native.field.originalOrdinal !== record.originalOrdinal
  )
    return;
  const owned = projectCurrentFacet(native),
    receivedTimes = currentFacetTimes(owner, record),
    ownedTimes = currentNativeFacetTimes(native);
  if (
    !sameCurrentFacetContent(owned, record) ||
    (Object.keys(ownedTimes) as Array<keyof CurrentFacetTimes>).some(
      (key) => receivedTimes[key] !== ownedTimes[key],
    )
  )
    return;
  // Selection keys choose the member; value, grant and dates come only from its current owner.
  const lease = currentFacetSupport(owner, owned),
    facet = temporalFacetInput(world, lease);
  return retainTemporalCaptureSupport(
    world,
    actorId,
    {
      subject: receivedTrackKey(owned.grant.exposure, owned.grant.channel),
      change: 'baseline',
      facets: [facet],
      ...(owned.localSubject ? { subjectIdentity: owned.localSubject } : {}),
      ...(owned.availability
        ? { availability: [{ reason: 'unchecked', at: owned.availability.at, fields: [0] }] }
        : {}),
    },
    options,
  );
}

export function retainTemporalStateSupport(
  world: WorldState,
  actorId: string,
  baseline: NonNullable<TemporalHistorySelection['baselines']>[number],
  anchor: TemporalReceipt,
  options: { required?: boolean; maxBytes: number; maxRecords: number },
): TemporalSupportCapsule | undefined {
  const actor = world.experience?.temporal?.actors[actorId];
  if (
    !actor ||
    baseline.checkpoint.actorId !== actorId ||
    anchor.actorId !== actorId ||
    !sameReceiptAddress(anchor, baseline.forReceipt) ||
    baseline.availableAt > anchor.at ||
    anchor.at > world.simTime ||
    !temporalRecentAt(
      baseline.availableAt,
      world.simTime,
      selectedTemporalPolicy(world).recent.maxAgeSeconds,
    ) ||
    baseline.checkpoint.facets.length !== baseline.values.length ||
    !baseline.values.length ||
    baseline.checkpoint.facets.some(
      (reference, index) =>
        !temporalFacetEligible(world, actorId, reference, baseline.values[index]!),
    )
  )
    return;
  const batchOrder = receivedIdentity(world, 'retained-support'),
    entryIndex = 0,
    id = temporalReceiptId({ epoch: actor.epoch, batchOrder, entryIndex });
  if (actor.supports?.[id]) return;
  const values: TemporalFragment[] = [],
    facets = baseline.checkpoint.facets.map((reference, index) => {
      const { value, reception } = splitTemporalValue(baseline.values[index]!);
      values.push(immutableDataSnapshot(value, readOnlyDraftView));
      const { reception: _old, ...metadata } = reference;
      return { ...metadata, ...(reception ? { reception } : {}) };
    });
  const receipt: TemporalReceipt = {
    id,
    actorId,
    physicalLife: baseline.checkpoint.physicalLife,
    epoch: actor.epoch,
    batchOrder,
    entryIndex,
    acquisition: batchOrder,
    at: anchor.at,
    order: anchor.order,
    subject: baseline.checkpoint.subject,
    ...(baseline.checkpoint.subjectIdentity
      ? { subjectIdentity: baseline.checkpoint.subjectIdentity }
      : {}),
    ...(anchor.receiverFrame ? { receiverFrame: anchor.receiverFrame } : {}),
    change: 'retained-state',
    required: options.required === true,
    sourceIds: [
      JSON.stringify([
        'temporal-checkpoint',
        baseline.checkpoint.physicalLife,
        baseline.checkpoint.epoch,
        baseline.checkpoint.binding,
        baseline.checkpoint.batchOrder,
        baseline.checkpoint.entryIndex,
        baseline.checkpoint.facets.map((facet) => [facet.memberIndex, facet.track ?? null]),
        baseline.forReceipt.physicalLife,
        baseline.forReceipt.epoch,
        baseline.forReceipt.batchOrder,
        baseline.forReceipt.entryIndex,
        baseline.forReceipt.memberIndex,
        baseline.availableAt,
      ]),
    ],
    facets,
    ...(baseline.checkpoint.availability?.length
      ? { availability: baseline.checkpoint.availability }
      : {}),
  };
  receipt.sourceIds = temporalReceiptAliases(receipt, {}, world, values);
  const capsule: TemporalSupportCapsule = {
    receipt: immutableDataSnapshot(receipt, readOnlyDraftView),
    values,
    bytes: 0,
    required: options.required === true,
  };
  touchNativeEvidence(world, 'temporal', actorId);
  const admitted = admitTemporalSupport(world, actorId, capsule, options);
  return admitted;
}

export function releaseTemporalSupport(
  world: WorldState,
  actorId: string,
  receiptId: string,
): void {
  touchNativeEvidence(world, 'temporal', actorId);
  const actor = world.experience?.temporal?.actors[actorId];
  const capsule = actor?.supports?.[receiptId];
  if (!actor || !capsule) return;
  ensureExperienceAccounting(world, actorId);
  const account = actor.accounts![capsule.required ? 'required' : 'optional'];
  if (account.bytes < capsule.bytes || account.count < 1)
    throw new Error('Temporal support counters underflowed.');
  account.bytes -= capsule.bytes;
  account.count--;
  delete actor.supports![receiptId];
  if (temporalKnownPlaceCapsules(actorId, capsule).length)
    invalidateKnownPlaceEvidence(world, actorId);
}

export function setTemporalSupportRequired(
  world: WorldState,
  actorId: string,
  receiptId: string,
  required: boolean,
  limits: { maxBytes: number; maxRecords: number },
): boolean {
  touchNativeEvidence(world, 'temporal', actorId);
  const actor = world.experience?.temporal?.actors[actorId];
  const capsule = actor?.supports?.[receiptId];
  if (!actor || !capsule) return false;
  if (capsule.required === required) return true;
  ensureExperienceAccounting(world, actorId);
  const before = actor.accounts![capsule.required ? 'required' : 'optional'];
  const after = actor.accounts![required ? 'required' : 'optional'];
  const replacement = { ...readOnlyDraftView(capsule), required };
  initialBytes(replacement, () => temporalSupportLogicalBytes(replacement));
  if (after.count + 1 > limits.maxRecords || after.bytes + replacement.bytes > limits.maxBytes)
    return false;
  if (before.bytes < capsule.bytes || before.count < 1)
    throw new Error('Temporal support counters underflowed.');
  before.bytes -= capsule.bytes;
  before.count--;
  after.bytes += replacement.bytes;
  after.count++;
  actor.supports![receiptId] = replacement;
  if (required) markRequiredExperienceMaintenance(world, actorId);
  return true;
}

export function retainedTemporalSupport(
  temporal: TemporalEvidenceState | undefined,
  actorId: string,
  source: EvidenceSource,
): TemporalSupportCapsule | undefined {
  if (
    source.observer.actorId !== actorId ||
    source.family !== 'native-exposure' ||
    source.revision !== 1
  )
    return;
  const capsule = temporal?.actors[actorId]?.supports?.[source.id];
  return capsule && capsule.receipt.physicalLife === source.observer.physicalLife
    ? capsule
    : undefined;
}
