import { orderedRecordGet, orderedRecordSet, orderedRecordEntries } from './ordered-record.js';
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
  effectiveCurrentPartition,
  effectiveCurrentCheck,
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
  receivedBatchStorageBytes,
  selectTemporalPageEntries,
  materializeReceivedEntry,
  type TemporalCheckpointAvailability,
} from './temporal-frames.js';
import {
  compareReceivedPosition,
  receivedPositionEligible,
  type ReceivedBatch,
  type ReceivedEntry,
  type ReceivedChargeDirectory,
  type ReceivedRecentDirectory,
  type ReceivedFrontier,
  type ReceivedPosition,
  type ReceivedAddress,
} from './received-batches.js';
export * from './received-batches.js';
export * from './received-record.js';
import { compactReceivedReceipt } from './received-record.js';
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
  sameReceivedValueReference,
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
import { countDomainWork } from './diagnostic-counters.js';
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
  selectedPruneObserverIndividuals,
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
  isRetiringPerceptionLife,
  retirePerceptionLife,
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
  /** Only these received parts stopped being available/recorded. Omitted means
   * the terminal concerns the whole track, never an inferred disappearance. */
  endedFields?: readonly CurrentMemberPart[];
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
    | 'recording-gap'
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
  members: readonly { kind: string; part: 'value' | 'detail' | 'pose' }[];
  /** Last recorded values, never a recursively carried receipt/proof graph. */
  content: readonly {
    kind: string;
    part: 'value' | 'detail' | 'pose';
    value: ReceivedValueReference;
  }[];
  lastSource: NativeEvidenceSource;
  lastAt: number;
  lastMeasurementRevision: number;
  /** Per-member closing-header bytes, secured with admission. Splitting members
   * preserves the unit, never duplicates an aggregate promise. */
  terminalBytes: number;
  /** Retry unchanged refused content only after capacity actually improves. */
  refusedAt?: readonly [bytes: number, count: number];
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
  /** Quota already committed to closing active sparse recording memberships. */
  terminalReservedBytes: number;
  nextDue: number | null;
  maintenanceDue: boolean;
  /** Conservative unavailable-prefix coverage, not a ledger of fictional sensory losses. */
  releasedThrough?: number;
  frontier?: ReceivedFrontier;
  /** Rebuilt from canonical block directories; excluded by the save codec. */
  recent: ReceivedRecentDirectory;
  /** Finite exceptional sparse-edit work, coalesced by the existing retention owner. */
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
  /** A received geometry boundary keeps its scope even when it carries no values. */
  spatialContext?: true;
  availabilityAt?: number;
  coverageGap?: { from: number; through: number };
  endedFields?: readonly CurrentMemberPart[];
  /** Internal pre-admitted finite closing-marker reservation. */
  terminalReservationBytes?: number;
  /** Change in reserved closing quota, installed only when this sample is admitted. */
  terminalReservationDelta?: number;
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
const TEMPORAL_NAMESPACE_MAX_LENGTH = 64;
const byteLength = jsonByteLength;
/** Every member may close independently. Size one complete largest supported
 * closing header; numeric placeholders exceed every finite JSON number token. */
function terminalMemberBytes(
  actorId: string,
  epoch: string,
  subject: string,
  members: readonly CurrentMemberPart[],
): number {
  const ordinal = Number.MAX_SAFE_INTEGER,
    numberToken = '9'.repeat(32);
  let largest: CurrentMemberPart = ['', 'detail'],
    largestBytes = 0;
  for (const member of members) {
    const bytes = byteLength(member);
    if (bytes > largestBytes) {
      largest = member;
      largestBytes = bytes;
    }
  }
  return byteLength({
    actorId,
    physicalLife: ordinal,
    epoch,
    batchOrder: ordinal,
    entryIndex: ordinal,
    id: temporalReceiptId({ epoch, batchOrder: ordinal, entryIndex: ordinal }),
    at: numberToken,
    order: ordinal,
    acquisition: ordinal,
    subject,
    change: 'attention-exit',
    availabilityAt: numberToken,
    coverageGap: { from: numberToken, through: numberToken },
    endedFields: [largest],
    spatialContext: true,
    required: false,
    sourceIds: [],
    facets: [],
  });
}
/** Reservations are owned by the same admitted recording marks as their closes. */
function releaseTerminalReservation(world: WorldState, actorId: string, bytes: number): void {
  const actor = world.experience?.temporal?.actors[actorId];
  if (!actor) return;
  if (bytes > actor.terminalReservedBytes)
    throw new Error('Received terminal reservation underflow.');
  if (bytes) touchNativeEvidence(world, 'temporal', actorId);
  actor.terminalReservedBytes -= bytes;
}
export function clearTemporalRecordingReservations(world: WorldState, actorId: string): void {
  const current = world.perceptionEvidence?.[actorId];
  if (current) {
    touchNativeEvidence(world, 'perception', actorId);
    const updates: Parameters<typeof currentGroupsSetRecording>[1][number][] = [];
    for (const [subjectId, contact] of currentContactEntries(current))
      for (const group of contact.content.groups)
        if (group.recordings?.length)
          updates.push({ subjectId, fields: group.received.fields, recording: undefined });
    if (updates.length) currentGroupsSetRecording(current, updates);
    for (const features of [current.geometry?.fragments ?? [], current.geometry?.boundaries ?? []])
      for (const feature of features) delete feature.recording;
  }
  const actor = world.experience?.temporal?.actors[actorId];
  if (actor) {
    touchNativeEvidence(world, 'temporal', actorId);
    actor.terminalReservedBytes = 0;
  }
}
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
      terminalReservedBytes: 0,
      nextDue: null,
      maintenanceDue: false,
      recent: { blocks: { size: 0 }, individuals: { size: 0 } },
    };
  else if (actor.physicalLife !== life) {
    if (isRetiringPerceptionLife(world, actorId)) return { state: temporal, actor };
    // Current reception can already have replaced its old owner before history
    // first records the new life. Retire only the matching old owner; retiring
    // the newly received life would erase its baseline and release new marks.
    if (world.perceptionEvidence?.[actorId]?.life === actor.physicalLife)
      retirePerceptionLife(world, actorId);
    actor.terminalReservedBytes = 0;
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
export function createReceivedSample(world: WorldState, _actorId: string): number {
  return receivedIdentity(world, 'received-sample');
}

interface BatchBuilder {
  batch: ReceivedBatch;
  frame?: ObservationFrame;
  nextEntry: number;
  sourceDecisions: Map<string, TemporalReceiptLocator | false>;
  policy: TemporalRetentionPolicy;
  bytes: number;
  count: number;
  slots: number;
  nativeBytes: number;
  values: Set<string>;
  terminals: Map<string, Map<string, { entry: ReceivedEntry; reservedBytes: number }>>;
}

interface AcquisitionScope {
  frame?: ObservationFrame;
  prepared?: BatchBuilder;
  beforeSnapshot?: () => void;
}
const acquisitionBatches = new WeakMap<WorldState, Map<string, AcquisitionScope>>();
const acquisitionSnapshotReleases = new WeakMap<WorldState, () => void>();
/** A receiving scope alone allocates no historical frame/order/builder. */
function builder(world: WorldState, actorId: string): BatchBuilder | undefined {
  const scope = acquisitionBatches.get(world)?.get(actorId);
  if (!scope) return;
  if (!scope.prepared) {
    const actor = actorHistory(world, actorId)?.actor;
    if (!actor) return;
    scope.prepared = newBatch(world, actorId, actor, scope.frame);
    countDomainWork('receivedHistoryBuilders');
  }
  return scope.prepared;
}
function newBatch(
  world: WorldState,
  actorId: string,
  actor: TemporalActorHistory,
  frame?: ObservationFrame,
): BatchBuilder {
  return {
    batch: {
      actorId,
      physicalLife: actor.physicalLife,
      epoch: actor.epoch,
      batchOrder: 0,
      entries: [],
    },
    frame,
    nextEntry: 0,
    sourceDecisions: new Map(),
    policy: selectedTemporalPolicy(world).recent,
    bytes: 0,
    count: 0,
    slots: 0,
    nativeBytes: 0,
    values: new Set(),
    terminals: new Map(),
  };
}
/** The existing acquisition owner supports explicit generator lifetimes. Snapshot
 * preparation is world-owned until the last independent actor scope ends.
 * docs/projects/bookkeeping-simplification-tech-design.md#technical-yields-snapshots-and-failures */
export function beginTemporalAcquisition(
  world: WorldState,
  actorId: string,
  frame: ObservationFrame | undefined,
  beforeSnapshot?: () => void,
): { finish(): void; abort(): void } {
  let actors = acquisitionBatches.get(world);
  const borrowed = actors?.get(actorId);
  if (borrowed) {
    const previous = borrowed.beforeSnapshot;
    if (beforeSnapshot) borrowed.beforeSnapshot = beforeSnapshot;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      if (beforeSnapshot && borrowed.beforeSnapshot === beforeSnapshot)
        borrowed.beforeSnapshot = previous;
    };
    return { finish: release, abort: release };
  }
  if (!actors) {
    acquisitionBatches.set(world, (actors = new Map()));
    acquisitionSnapshotReleases.set(
      world,
      prepareWorldSnapshots(world, () => flushReceivedAcquisitionsForSnapshot(world)),
    );
  }
  const scope: AcquisitionScope = { frame, beforeSnapshot };
  actors.set(actorId, scope);
  let closed = false;
  const release = () => {
    if (closed) return;
    closed = true;
    if (actors.get(actorId) === scope) actors.delete(actorId);
    if (!actors.size && acquisitionBatches.get(world) === actors) {
      acquisitionBatches.delete(world);
      acquisitionSnapshotReleases.get(world)?.();
      acquisitionSnapshotReleases.delete(world);
    }
  };
  return {
    finish() {
      if (closed) return;
      try {
        if (scope.prepared) flushReceivedBatch(world, actorId, scope.prepared);
      } finally {
        release();
      }
    },
    abort: release,
  };
}
export function withTemporalAcquisition<T>(
  world: WorldState,
  actorId: string,
  frame: ObservationFrame | undefined,
  work: () => T,
): T {
  if (acquisitionBatches.get(world)?.has(actorId)) return work();
  const scope = beginTemporalAcquisition(world, actorId, frame);
  try {
    const result = work();
    scope.finish();
    return result;
  } finally {
    scope.abort();
  }
}
/** Drain accepted entries before sealing current contact paths; acquisition ownership stays live. */
export function flushTemporalAcquisition(world: WorldState, actorId: string): void {
  const scope = acquisitionBatches.get(world)?.get(actorId);
  const prepared = scope?.prepared;
  if (!scope || !prepared) return;
  scope.prepared = undefined;
  flushReceivedBatch(world, actorId, prepared);
}
/** Flush only actual accepted history. A snapshot does not manufacture a sample. */
export function flushReceivedAcquisitionsForSnapshot(world: WorldState): void {
  const actors = acquisitionBatches.get(world);
  if (!actors) return;
  for (const scope of actors.values()) scope.beforeSnapshot?.();
  for (const actorId of actors.keys()) flushTemporalAcquisition(world, actorId);
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
    return withTemporalAcquisition(world, actorId, undefined, work);
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
): Omit<ReceivedEntry, 'receipt'> {
  const owned = builder(world, actorId)!;
  if (!owned.batch.batchOrder) owned.batch.batchOrder = receivedIdentity(world, 'received-batch');
  return {
    entryIndex: owned.nextEntry++,
    order: temporalReceivedOrder(world, actorId),
    receivedAt: world.simTime,
    kind,
    required: false,
    charge: { bytes: 0, count: 0 },
  };
}
function recentBlockKey(
  owner: Pick<TemporalReceiptLocator, 'physicalLife' | 'epoch'>,
  batchOrder: number,
): string {
  return JSON.stringify([String(batchOrder).padStart(16, '0'), owner.physicalLife, owner.epoch]);
}
export function installTemporalChargeDirectories(
  actor: TemporalActorHistory,
  directories: readonly ReceivedChargeDirectory[],
): void {
  actor.recent = { blocks: { size: 0 }, individuals: { size: 0 } };
  actor.bytes = 0;
  actor.count = 0;
  for (const directory of eligibleReceivedChargeDirectories(directories, actor.frontier))
    appendTemporalChargeDirectory(actor, directory);
}
export function receivedRecentDirectories(
  actor: TemporalActorHistory,
): readonly ReceivedChargeDirectory[] {
  return [...orderedRecordEntries(actor.recent.blocks)].map(([, directory]) => directory);
}
function updateRecentIndividuals(
  actor: TemporalActorHistory,
  ids: readonly string[],
  direction: 1 | -1,
): void {
  for (const id of ids) {
    const count = (orderedRecordGet(actor.recent.individuals, id) ?? 0) + direction;
    if (count < 0) throw new Error('Recent individual membership underflow.');
    orderedRecordSet(actor.recent.individuals, id, count || undefined);
  }
}
function appendTemporalChargeDirectory(
  actor: TemporalActorHistory,
  directory: ReceivedChargeDirectory,
): void {
  for (const header of directory.entries) {
    const key = recentBlockKey(directory, header.batchOrder);
    if (orderedRecordGet(actor.recent.blocks, key))
      throw new Error('Recent block repeats its canonical address.');
    orderedRecordSet(actor.recent.blocks, key, {
      actorId: directory.actorId,
      physicalLife: directory.physicalLife,
      epoch: directory.epoch,
      entries: [header],
    });
    actor.bytes += header.bytes;
    actor.count += header.count;
    updateRecentIndividuals(actor, header.individualIds, 1);
  }
}
export function hasTemporalRecentIndividual(
  world: WorldState,
  actorId: string,
  individualId: string,
): boolean {
  const recent = world.experience?.temporal?.actors[actorId]?.recent;
  return !!recent && !!orderedRecordGet(recent.individuals, individualId);
}
/** Eligibility only. A caller resolving a fact must still select its exact receipt. */
export function receivedDirectoryContains(
  recent: ReceivedRecentDirectory,
  locator: TemporalReceiptLocator,
  _memberIndex?: number,
  receivedAfter = -Infinity,
): boolean {
  const block = orderedRecordGet(recent.blocks, recentBlockKey(locator, locator.batchOrder)),
    header = block?.entries[0];
  return (
    !!block &&
    block.actorId === locator.actorId &&
    !!header &&
    locator.entryIndex >= header.firstEntry &&
    locator.entryIndex <= header.entryIndex &&
    header.throughAt > receivedAfter
  );
}
export function eligibleReceivedChargeDirectories(
  directories: readonly ReceivedChargeDirectory[],
  frontier: ReceivedFrontier | undefined,
): ReceivedChargeDirectory[] {
  const blocks = new Map<string, ReceivedChargeDirectory>();
  for (const directory of directories)
    for (const header of directory.entries) {
      if (
        !receivedPositionEligible(
          {
            batchOrder: header.batchOrder,
            entryIndex: header.entryIndex,
            memberIndex: header.lastMember,
          },
          header.throughAt,
          frontier,
        )
      )
        continue;
      const key = JSON.stringify([
        directory.actorId,
        directory.physicalLife,
        directory.epoch,
        header.batchOrder,
      ]);
      const prior = blocks.get(key);
      if (prior) {
        const held = prior.entries[0]!;
        // A sparse edit/replacement supplies the complete retained block; physical packing never splits it.
        if (
          held.firstEntry !== header.firstEntry ||
          held.entryIndex !== header.entryIndex ||
          held.bytes !== header.bytes ||
          held.count !== header.count
        )
          throw new Error('Conflicting received block headers.');
      } else
        blocks.set(key, {
          actorId: directory.actorId,
          physicalLife: directory.physicalLife,
          epoch: directory.epoch,
          entries: [header],
        });
    }
  return [...blocks.values()].sort((a, b) => a.entries[0]!.batchOrder - b.entries[0]!.batchOrder);
}
export function restoreReceivedRecentDirectory(
  world: WorldState,
  actorId: string,
  directories: readonly ReceivedChargeDirectory[],
): void {
  const actor = world.experience?.temporal?.actors[actorId];
  if (!actor) throw new Error('Missing received actor for reconstruction.');
  const expected = { bytes: actor.bytes, count: actor.count };
  installTemporalChargeDirectories(actor, directories);
  if (actor.bytes !== expected.bytes || actor.count !== expected.count)
    throw new Error('Received block totals disagree with current authority.');
}
function releaseDirectory(
  actor: TemporalActorHistory,
  key: string,
  directory: ReceivedChargeDirectory,
  released: Set<string>,
): void {
  for (const header of directory.entries) {
    actor.bytes -= header.bytes;
    actor.count -= header.count;
    updateRecentIndividuals(actor, header.individualIds, -1);
    for (const id of header.individualIds) released.add(id);
  }
  orderedRecordSet(actor.recent.blocks, key, undefined);
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
  const cutoff = world.simTime - policy.maxAgeSeconds,
    oldest = (
      orderedRecordEntries(actor.recent.blocks).next().value as
        | [string, ReceivedChargeDirectory]
        | undefined
    )?.[1].entries[0];
  if (
    !actor.maintenanceDue &&
    actor.bytes <= policy.maxBytes &&
    actor.count <= policy.maxChanges &&
    (!oldest || oldest.at > cutoff)
  )
    return { bytes: 0, count: 0, nextDue: actor.nextDue, releasedIndividualIds: [] };
  const previous = { bytes: actor.bytes, count: actor.count },
    released = new Set<string>(),
    frontier = (actor.frontier ??= { expiredThroughTime: null });
  for (;;) {
    const first = orderedRecordEntries(actor.recent.blocks).next().value as
      | [string, ReceivedChargeDirectory]
      | undefined;
    if (!first) break;
    const [key, directory] = first,
      header = directory.entries[0]!;
    if (header.at > cutoff && actor.bytes <= policy.maxBytes && actor.count <= policy.maxChanges)
      break;
    const end = {
      batchOrder: header.batchOrder,
      entryIndex: header.entryIndex,
      memberIndex: header.lastMember,
    };
    if (
      !frontier.pressureThrough ||
      compareReceivedPosition(end, frontier.pressureThrough.address) > 0
    )
      frontier.pressureThrough = {
        address: end,
        receivedAt: header.throughAt,
        order: header.order,
      };
    releaseDirectory(actor, key, directory, released);
  }
  if (cutoff >= 0)
    frontier.expiredThroughTime = Math.max(frontier.expiredThroughTime ?? -Infinity, cutoff);
  const first = orderedRecordEntries(actor.recent.blocks).next().value as
    | [string, ReceivedChargeDirectory]
    | undefined;
  actor.nextDue = first ? first[1].entries[0]!.at + policy.maxAgeSeconds : null;
  actor.maintenanceDue = false;
  actor.pages = actor.pages.filter(
    (page) =>
      (temporalPageMutation(page) === 'edit' && !page.batches.length) ||
      page.batches.some(
        (batch) => !!orderedRecordGet(actor.recent.blocks, recentBlockKey(batch, batch.batchOrder)),
      ),
  );
  if (actor.recordingGap && actor.recordingGap.through <= cutoff) delete actor.recordingGap;
  if (previous.bytes !== actor.bytes || previous.count !== actor.count)
    touchNativeEvidence(world, 'temporal', actorId);
  return {
    bytes: previous.bytes - actor.bytes,
    count: previous.count - actor.count,
    nextDue: actor.nextDue,
    releasedIndividualIds: [...released],
  };
}
function flushReceivedBatch(world: WorldState, actorId: string, prepared: BatchBuilder): void {
  if (!prepared.batch.entries.length) return;
  const actor = world.experience!.temporal!.actors[actorId]!,
    value = immutableDataSnapshot(prepared.batch, readOnlyDraftView),
    encoded = receivedBatchStorageBytes(value);
  const page: TemporalPage = {
    id: nextId(world, 'temporal-page'),
    order: value.batchOrder,
    actorId,
    physicalLife: value.physicalLife,
    epoch: value.epoch,
    fromAt: value.entries[0]!.receivedAt,
    throughAt: value.entries.at(-1)!.receivedAt,
    subjects: [],
    sourceIds: [],
    individualIds: [],
    sourceRefs: [],
    bytes: 0,
    count: 0,
    batches: [value],
  };
  const metadata = temporalPageMetadata(page, { world });
  page.bytes = metadata.entryBytes;
  page.count = metadata.count;
  page.subjects = metadata.subjects;
  page.sourceIds = metadata.sourceIds;
  page.individualIds = metadata.individualIds;
  page.sourceRefs = metadata.references;
  actor.pages.push(page);
  appendTemporalChargeDirectory(actor, metadata.chargeDirectory);
  actor.nextDue = Math.min(actor.nextDue ?? Infinity, page.fromAt + prepared.policy.maxAgeSeconds);
  actor.maintenanceDue ||=
    actor.bytes > prepared.policy.maxBytes || actor.count > prepared.policy.maxChanges;
  countDomainWork('temporalOperationsAppended', value.entries.length);
  countDomainWork('receivedBatchesAppended');
  countDomainWork('receivedBatchEncodedBytes', encoded);
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
): TemporalReceiptLocator | undefined {
  if (
    !input.facets.length &&
    !['loss', 'unchecked', 'attention-exit', 'recording-gap'].includes(input.change)
  )
    return;
  return withTemporalReceivedTransition(world, actorId, () => {
    let prepared = builder(world, actorId);
    if (!prepared) return;
    prepared.policy = policy;
    const owner = world.experience!.temporal!.actors[actorId]!;
    // Different fields can have independent last checks and reasons. Merge only
    // equal boundaries; one latest clock would erase an earlier field's gap.
    const terminalKey =
        input.terminalReservationBytes === undefined
          ? ''
          : JSON.stringify([
              input.receivedAt ?? world.simTime,
              input.coverageGap?.from,
              input.coverageGap?.through,
              input.change,
            ]),
      previousTerminal = terminalKey
        ? prepared.terminals.get(input.subject)?.get(terminalKey)
        : undefined;
    if (input.terminalReservationBytes !== undefined && previousTerminal) {
      const prior = previousTerminal.entry.receipt,
        beforeBytes = byteLength(prior);
      // A whole-track boundary subsumes scoped boundaries. Otherwise retain the
      // union; changing one property must not close unrelated spatial evidence.
      if (prior.endedFields && input.endedFields) {
        const parts = new Map(prior.endedFields.map((part) => [JSON.stringify(part), part]));
        for (const [kind, part] of input.endedFields)
          parts.set(JSON.stringify([kind, part]), [kind, part]);
        prior.endedFields = [...parts.values()];
      } else delete prior.endedFields;
      if (input.spatialContext) prior.spatialContext = true;
      const addedBytes = byteLength(prior) - beforeBytes;
      previousTerminal.reservedBytes += input.terminalReservationBytes;
      previousTerminal.entry.charge.bytes += addedBytes;
      if (previousTerminal.entry.charge.bytes > previousTerminal.reservedBytes)
        throw new Error('Recording terminal exceeds its admitted reservation.');
      prepared.bytes += addedBytes;
      prepared.nativeBytes += addedBytes;
      return {
        actorId,
        physicalLife: prepared.batch.physicalLife,
        epoch: prepared.batch.epoch,
        batchOrder: prepared.batch.batchOrder,
        entryIndex: previousTerminal.entry.entryIndex,
      };
    }
    if (
      !input.required &&
      input.terminalReservationBytes === undefined &&
      owner.count + prepared.count + temporalChangeCount(input.change, input.facets.length) >
        policy.maxChanges * (1 + selectedTemporalPolicy(world).maintenanceHeadroom)
    ) {
      owner.recordingGap = {
        from: owner.recordingGap?.from ?? world.simTime,
        through: world.simTime,
      };
      owner.maintenanceDue = true;
      return;
    }
    let target = entry(
      world,
      actorId,
      input.change === 'baseline'
        ? 'baseline'
        : input.change === 'occurrence'
          ? 'occurrence'
          : ['loss', 'unchecked', 'attention-exit', 'recording-gap'].includes(input.change)
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
        ...(input.spatialContext ||
        input.facets.some((facet) =>
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
        ...(target.kind !== 'boundary' && (input.receiverFrame ?? prepared.frame)
          ? { receiverFrame: input.receiverFrame ?? prepared.frame }
          : {}),
        ...(input.contextSubjects ? { contextSubjects: [...input.contextSubjects] } : {}),
        ...(input.availability ? { availability: input.availability } : {}),
        ...(input.availabilityAt === undefined ? {} : { availabilityAt: input.availabilityAt }),
        ...(input.coverageGap ? { coverageGap: input.coverageGap } : {}),
        ...(input.endedFields
          ? { endedFields: input.endedFields.map(([kind, part]) => [kind, part] as const) }
          : {}),
      };
    let bytes = byteLength(receipt);
    const count = temporalReceiptChangeCount(receipt),
      slots = Math.max(1, facets.length),
      headroom = 1 + selectedTemporalPolicy(world).maintenanceHeadroom;
    // Constructor admission bounds the actual retained record before an immutable
    // copy. One larger indivisible event is sealed alone under the same limit.
    if (bytes > 1024 * 1024) {
      if (receipt.required) throw new Error('Required received record exceeds bounded admission.');
      actor.recordingGap = {
        from: actor.recordingGap?.from ?? world.simTime,
        through: world.simTime,
      };
      return;
    }
    if (
      prepared.batch.entries.length &&
      (prepared.nativeBytes + bytes > TEMPORAL_NATIVE_PAGE_BYTES || prepared.slots + slots > 256)
    ) {
      const scope = acquisitionBatches.get(world)!.get(actorId)!;
      const decisions = prepared.sourceDecisions;
      flushReceivedBatch(world, actorId, prepared);
      prepared = newBatch(world, actorId, actor, prepared.frame);
      prepared.sourceDecisions = decisions;
      prepared.policy = policy;
      scope.prepared = prepared;
      target = entry(world, actorId, target.kind);
      target.receivedAt = receipt.at;
      target.order = receipt.order;
      Object.assign(receipt, {
        batchOrder: prepared.batch.batchOrder,
        entryIndex: target.entryIndex,
        id: temporalReceiptId({
          epoch: actor.epoch,
          batchOrder: prepared.batch.batchOrder,
          entryIndex: target.entryIndex,
        }),
        acquisition: prepared.batch.batchOrder,
        order: target.order,
      });
      bytes = byteLength(receipt);
    }
    const addedValues = new Set(
      facets
        .flatMap((facet) => temporalFacetValueReferences(facet))
        .filter((reference) => !prepared!.values.has(reference)),
    );
    let richBytes = 0;
    for (const reference of addedValues) {
      const value = receivedValueAt(world.receivedValues?.sources ?? {}, reference);
      if (!value) throw new Error('Received admission has missing content.');
      richBytes += jsonEncoding(value).bytes;
    }
    const terminal =
      input.terminalReservationBytes !== undefined && target.kind === 'boundary' && !facets.length;
    if (terminal && bytes > input.terminalReservationBytes!)
      throw new Error('Recording terminal exceeds its admitted reservation.');
    if (
      !receipt.required &&
      !terminal &&
      (actor.bytes +
        prepared.bytes +
        bytes +
        richBytes +
        actor.terminalReservedBytes +
        (input.terminalReservationDelta ?? 0) >
        policy.maxBytes * headroom ||
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
    if (actor.terminalReservedBytes + (input.terminalReservationDelta ?? 0) < 0)
      throw new Error('Received terminal reservation underflow.');
    if (input.terminalReservationDelta) {
      touchNativeEvidence(world, 'temporal', actorId);
      actor.terminalReservedBytes += input.terminalReservationDelta;
    }
    target.charge = { bytes, count };
    const retained: ReceivedEntry = {
      ...target,
      receipt: compactReceivedReceipt(prepared.batch, receipt),
    };
    (prepared.batch.entries as ReceivedEntry[]).push(retained);
    if (terminal) {
      let subjectTerminals = prepared.terminals.get(input.subject);
      if (!subjectTerminals) prepared.terminals.set(input.subject, (subjectTerminals = new Map()));
      subjectTerminals.set(terminalKey, {
        entry: retained,
        reservedBytes: input.terminalReservationBytes!,
      });
    } else prepared.terminals.delete(input.subject);
    prepared.bytes += bytes + richBytes;
    prepared.nativeBytes += bytes;
    for (const reference of addedValues) prepared.values.add(reference);
    prepared.count += count;
    prepared.slots += slots;
    return {
      actorId,
      physicalLife: receipt.physicalLife,
      epoch: receipt.epoch,
      batchOrder: receipt.batchOrder,
      entryIndex: receipt.entryIndex,
    };
  });
}
export function beginTemporalReceiptEpoch(world: WorldState, namespace: string): void {
  if (!namespace.trim() || namespace.length > TEMPORAL_NAMESPACE_MAX_LENGTH)
    throw new Error('A receipt timeline requires its admitted namespace.');
  const temporal = world.experience?.temporal;
  if (!temporal) return;
  temporal.namespace = namespace;
  for (const [actorId, actor] of Object.entries(temporal.actors)) {
    clearTemporalRecordingReservations(world, actorId);
    actor.epoch = `${namespace}-${nextId(world, 'receipt-epoch')}`;
  }
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
    change === 'recording-gap' ||
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

/** Recording and independently retained support use the same effective check
 * as current readers, without rewriting the current contact to obtain it. */
function currentTemporalFacetSupport(
  owner: NonNullable<WorldState['perceptionEvidence']>[string],
  record: CurrentFacetRecord,
  partition?: CurrentPartPartition,
): LiveFacetSupport {
  const held = currentFacetSupport(owner, record);
  const metadata =
    partition ??
    currentNativeFacet(
      owner,
      currentFacetKey(record.grant.subjectId, record.value.kind, record.grant.channel),
      { exposure: record.grant.exposure },
    )?.metadata;
  const check = metadata && effectiveCurrentCheck(owner, record.grant, metadata);
  return check
    ? {
        ...held,
        confirmedThrough: check.through,
        revision: Math.max(held.revision, check.revision),
      }
    : held;
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

function currentPartContent(group: CurrentReceivedGroup, members: readonly CurrentMemberPart[]) {
  return members.map(([kind, part]) => {
    const field = group.received.fields[kind]!;
    const value =
      part === 'pose' && field.value.reception?.kind === 'body'
        ? field.value.reception.poseRef
        : field.value.reference;
    return { kind, part, value };
  });
}
function sameRecordedContent(
  prior: TemporalCurrentGroupCheckpoint,
  content: ReturnType<typeof currentPartContent>,
): boolean {
  return content.every((value) =>
    prior.content.some(
      (old) =>
        old.kind === value.kind &&
        old.part === value.part &&
        sameReceivedValueReference(old.value, value.value),
    ),
  );
}
export function captureTemporalCurrent(
  world: WorldState,
  actorId: string,
  inputs: readonly TemporalCurrentGroupInput[],
  policy: TemporalRetentionPolicy,
): void {
  const owner = world.perceptionEvidence?.[actorId];
  if (!owner || !inputs.length) return;
  const updates: Parameters<typeof currentGroupsSetRecording>[1][number][] = [];
  // Freshness scopes may merge independently of the recorded-value segments.
  // Preserve each disjoint prior admission instead of manufacturing a baseline.
  const admissions = inputs.flatMap((input) => {
    if (input.exiting || input.partition.availability) return [input];
    const remaining = new Set(input.partition.members.map((member) => JSON.stringify(member)));
    const selected: TemporalCurrentGroupInput[] = [];
    for (const mark of currentGroupRecordings(input.group, input.partition.members)) {
      const members = input.partition.members.filter(([kind, part]) =>
        mark.members.some((member) => member.kind === kind && member.part === part),
      );
      for (const member of members) remaining.delete(JSON.stringify(member));
      if (members.length) selected.push({ ...input, partition: { ...input.partition, members } });
    }
    const members = input.partition.members.filter((member) =>
      remaining.has(JSON.stringify(member)),
    );
    if (members.length) selected.push({ ...input, partition: { ...input.partition, members } });
    return selected;
  });
  for (const input of admissions) {
    const members = input.partition.members;
    if (!members.length) continue;
    if (input.exiting || input.partition.availability) {
      closeTemporalCurrentGroup(
        world,
        actorId,
        input.subjectId,
        input.group,
        input.exiting ? 'attention-exit' : 'unchecked',
        input.partition,
      );
      continue;
    }
    const marks = currentGroupRecordings(input.group, members),
      content = currentPartContent(input.group, members),
      reservationMark = marks.find((held) =>
        members.every(([kind, part]) =>
          held.members.some((member) => member.kind === kind && member.part === part),
        ),
      ),
      mark = marks.find(
        (held) =>
          held.epoch === world.experience?.temporal?.actors[actorId]?.epoch &&
          members.every(([kind, part]) =>
            held.members.some((member) => member.kind === kind && member.part === part),
          ),
      );
    if (!input.entering && !input.checked) continue;
    if (mark && sameRecordedContent(mark, content)) {
      if (!mark.gap) continue;
      const actor = world.experience?.temporal?.actors[actorId];
      if (
        mark.refusedAt &&
        actor &&
        actor.bytes + actor.terminalReservedBytes >= mark.refusedAt[0] &&
        actor.count >= mark.refusedAt[1]
      )
        continue;
    }
    if (mark?.gap && !input.checked) continue;
    const facets: TemporalCaptureInput['facets'] = [];
    for (const kind of new Set(members.map(([kind]) => kind))) {
      const record = currentGroupFacetRecord(
        input.group,
        input.originalSource,
        kind,
        input.partition,
      );
      if (!record) throw new Error('Received change has no current typed value.');
      facets.push(
        temporalFacetInput(world, currentTemporalFacetSupport(owner, record, input.partition)),
      );
    }
    if (!facets.length) continue;
    const actor = actorHistory(world, actorId)?.actor;
    if (!actor) continue;
    const subject = receivedTrackKey(
        input.group.received.grant.exposure,
        input.group.received.grant.channel,
      ),
      identity = Object.values(input.group.received.fields).find(
        (field) => field.localSubject,
      )?.localSubject,
      field = input.group.received.fields[members[0]![0]]!,
      terminalBytes =
        reservationMark?.terminalBytes ??
        terminalMemberBytes(actorId, actor.epoch, subject, members),
      terminalReservationDelta =
        terminalBytes * members.length -
        (reservationMark && !reservationMark.gap
          ? reservationMark.terminalBytes * members.length
          : 0);
    const locator = appendTemporalReceipt(
      world,
      actorId,
      {
        subject,
        change: mark && !mark.gap ? 'change' : 'baseline',
        facets,
        terminalReservationDelta,
        ...(identity ? { subjectIdentity: identity } : {}),
      },
      policy,
    );
    const source: NativeEvidenceSource = {
      family: 'native-exposure',
      id: field.id,
      revision: input.partition.revision,
      observer: currentFacetObserver(owner),
    };
    updates.push({
      subjectId: input.subjectId,
      fields: input.group.received.fields,
      members,
      recording: {
        epoch: actor.epoch,
        members: members.map(([kind, part]) => ({ kind, part })),
        content,
        lastSource: source,
        lastAt: world.simTime,
        lastMeasurementRevision: input.partition.revision,
        terminalBytes,
        gap: !locator,
        ...(!locator
          ? {
              refusedAt: [
                actor.bytes +
                  actor.terminalReservedBytes +
                  (acquisitionBatches.get(world)?.get(actorId)?.prepared?.bytes ?? 0),
                actor.count + (acquisitionBatches.get(world)?.get(actorId)?.prepared?.count ?? 0),
              ] as const,
            }
          : {}),
      },
    });
    if (!locator && reservationMark && !reservationMark.gap)
      closeTemporalCurrentGroup(
        world,
        actorId,
        input.subjectId,
        input.group,
        'recording-gap',
        input.partition,
      );
  }
  if (updates.length) currentGroupsSetRecording(owner, updates);
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
  const updates: Parameters<typeof currentGroupsSetRecording>[1][number][] = [];
  for (const mark of currentGroupRecordings(group, partition?.members)) {
    const members = mark.members
      .filter(
        ({ kind, part }) =>
          !partition ||
          partition.members.some(([member, memberPart]) => member === kind && memberPart === part),
      )
      .map(({ kind, part }) => [kind, part] as const);
    if (!members.length) continue;
    if (!mark.gap) {
      appendTemporalReceipt(
        world,
        actorId,
        {
          subject: receivedTrackKey(group.received.grant.exposure, group.received.grant.channel),
          change: reason === 'retained-state' ? 'unchecked' : reason,
          availabilityAt: world.simTime,
          coverageGap: {
            from: Math.max(
              mark.lastAt,
              currentGroupTimes(
                group,
                partition ? effectiveCurrentPartition(owner, group, partition) : undefined,
              ).confirmedThrough,
            ),
            through: world.simTime,
          },
          endedFields: members,
          facets: [],
          terminalReservationBytes: mark.terminalBytes * members.length,
        },
        selectedTemporalPolicy(world).recent,
      );
      releaseTerminalReservation(world, actorId, mark.terminalBytes * members.length);
    }
    updates.push({ subjectId, fields: group.received.fields, members, recording: undefined });
  }
  if (updates.length) currentGroupsSetRecording(owner, updates);
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
    terminalReservationDelta?: number;
  } = {},
): TemporalReceiptLocator | undefined {
  const sourceKey = JSON.stringify([
    observation.id,
    observation.revision,
    options.sourceOrdinals ? [...options.sourceOrdinals].sort((a, b) => a - b) : null,
  ]);
  const previous = builder(world, actorId)?.sourceDecisions.get(sourceKey);
  if (previous !== undefined) return previous === false ? undefined : previous;
  // A new recording segment starts now even when its held observation is older
  // (for example, optional capacity recovered after a gap). Its facet dates and
  // source still describe the actual earlier reception, never a new sensory sample.
  // docs/projects/bookkeeping-simplification-tech-design.md#recent-records-and-their-lifetime
  const recordingAdmission = options.change === 'baseline' || options.change === 'change';
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
      receivedAt: recordingAdmission ? world.simTime : observation.acquiredAt,
      receivedOrder: recordingAdmission
        ? temporalReceivedOrder(world, actorId)
        : observation.receivedOrder,
      ...(options.contextSubjects?.length ? { contextSubjects: options.contextSubjects } : {}),
      required,
      ...(options.terminalReservationDelta === undefined
        ? {}
        : { terminalReservationDelta: options.terminalReservationDelta }),
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
): void {
  for (const feature of features) {
    const observation = feature.observation,
      prior = feature.recording,
      heldActor = world.experience?.temporal?.actors[actorId];
    if (
      prior &&
      prior.lastSource.id === observation.id &&
      prior.lastMeasurementRevision === observation.revision &&
      (!prior.gap ||
        (prior.refusedAt &&
          heldActor &&
          heldActor.bytes + heldActor.terminalReservedBytes >= prior.refusedAt[0] &&
          heldActor.count >= prior.refusedAt[1]))
    )
      continue;
    const actor = actorHistory(world, actorId)?.actor;
    if (!actor) continue;
    // The receiving exposure can contain many same-kind features. Each acquired
    // original owns its own availability boundary; its origin still records that exposure.
    // docs/projects/bookkeeping-simplification-tech-design.md#recent-records-and-their-lifetime
    const subject = observation.id,
      members = observation.facets.map((facet) => [facet.value.kind, 'value'] as const),
      terminalBytes =
        prior?.terminalBytes ?? terminalMemberBytes(actorId, actor.epoch, subject, members),
      terminalReservationDelta =
        terminalBytes * members.length -
        (prior && !prior.gap ? prior.terminalBytes * prior.members.length : 0),
      locator = captureTemporalObservation(
        world,
        actorId,
        observation,
        [observation.id],
        false,
        policy,
        {
          subject,
          change: prior && !prior.gap ? 'change' : 'baseline',
          confirmedThrough: through,
          terminalReservationDelta,
        },
      );
    if (!locator && prior && !prior.gap)
      closeTemporalGeometry(world, actorId, feature, through, 'recording-gap');
    const source = contributionFactKey(observation, 0).source as NativeEvidenceSource;
    feature.recording = {
      epoch: world.experience!.temporal!.actors[actorId]!.epoch,
      members: members.map(([kind, part]) => ({ kind, part })),
      content: [],
      lastSource: source,
      lastAt: world.simTime,
      lastMeasurementRevision: observation.revision,
      terminalBytes,
      gap: !locator,
      ...(!locator
        ? {
            refusedAt: [
              actor.bytes +
                actor.terminalReservedBytes +
                (acquisitionBatches.get(world)?.get(actorId)?.prepared?.bytes ?? 0),
              actor.count + (acquisitionBatches.get(world)?.get(actorId)?.prepared?.count ?? 0),
            ] as const,
          }
        : {}),
    };
  }
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
  if (!mark.gap) {
    appendTemporalReceipt(
      world,
      actorId,
      {
        subject: feature.observation.id,
        change: reason === 'retained-state' ? 'unchecked' : reason,
        spatialContext: true,
        coverageGap: { from: Math.max(mark.lastAt, _through), through: world.simTime },
        endedFields: mark.members.map(({ kind, part }) => [kind, part] as const),
        facets: [],
        terminalReservationBytes: mark.terminalBytes * mark.members.length,
      },
      selectedTemporalPolicy(world).recent,
    );
    releaseTerminalReservation(world, actorId, mark.terminalBytes * mark.members.length);
  }
  delete feature.recording;
}

export interface TemporalHistorySelection {
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
    active = acquisitionBatches.get(world)?.get(actorId)?.prepared,
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
/** Select actual sparse acquisitions. Silence never reconstructs an old scene. */
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
    selected = subjects.length ? new Set(subjects) : undefined,
    limit = query.limit ?? 128,
    maxWork = query.operations ?? context.maximumOperations ?? limit,
    maxCandidates = context.maximumCandidates ?? maxWork * 4,
    maxBytes = query.bytes ?? 8192;
  const result: TemporalHistorySelection = {
    entries: [],
    incomplete:
      (context.frontier?.expiredThroughTime !== null &&
        context.frontier?.expiredThroughTime !== undefined &&
        (query.from ?? 0) <= context.frontier.expiredThroughTime) ||
      (!!context.frontier?.pressureThrough &&
        (query.from ?? 0) <= context.frontier.pressureThrough.receivedAt) ||
      (!!context.recordingGap &&
        context.recordingGap.from <= through &&
        context.recordingGap.through >= from),
  };
  const pending: Array<{ batch: ReceivedBatch; entry: ReceivedEntry }> = [];
  for (const page of [...context.pages].reverse()) {
    if (pending.length >= maxCandidates) {
      result.incomplete = true;
      result.hasMore = true;
      break;
    }
    if (
      page.throughAt < from ||
      page.fromAt > through ||
      (query.physicalLife !== undefined && page.physicalLife !== query.physicalLife) ||
      (query.epoch !== undefined && page.epoch !== query.epoch)
    )
      continue;
    for (const batch of [...page.batches].reverse())
      for (const entry of [...batch.entries].reverse()) {
        if (pending.length >= maxCandidates) {
          result.incomplete = true;
          result.hasMore = true;
          break;
        }
        pending.push({ batch, entry });
      }
  }
  pending.sort(
    (a, b) =>
      b.entry.order - a.entry.order ||
      b.batch.batchOrder - a.batch.batchOrder ||
      b.entry.entryIndex - a.entry.entryIndex,
  );
  let work = 0,
    candidates = 0,
    bytes = 0;
  for (const { batch, entry } of pending) {
    if (++candidates > maxCandidates || work >= maxWork) {
      result.incomplete = true;
      result.hasMore = true;
      break;
    }
    if (entry.receivedAt < from || entry.receivedAt > through) continue;
    const received = materializeReceivedEntry(
      batch,
      entry,
      selected,
      undefined,
      query.includeGeometry,
    );
    if (!received || (query.cut && !temporalReceiptWithinPrefix(received, query.cut))) continue;
    if (
      query.before &&
      (received.order > query.before.order ||
        (received.order === query.before.order &&
          (received.batchOrder > query.before.batchOrder ||
            (received.batchOrder === query.before.batchOrder &&
              received.entryIndex > query.before.entryIndex))))
    )
      continue;
    if (!received.facets.length) {
      if (
        query.before &&
        received.batchOrder === query.before.batchOrder &&
        received.entryIndex === query.before.entryIndex &&
        query.before.memberIndex <= 0
      )
        continue;
      result.examinedBefore = {
        epoch: received.epoch,
        batchOrder: received.batchOrder,
        entryIndex: received.entryIndex,
        memberIndex: 0,
        at: received.at,
        order: received.order,
      };
      if (!receivedPositionEligible({ ...received, memberIndex: 0 }, received.at, context.frontier))
        continue;
      const size = byteLength(received);
      if (bytes + size > maxBytes || result.entries.length >= limit) {
        result.incomplete = true;
        result.hasMore = true;
        break;
      }
      result.entries.push({ receipt: received, values: [] });
      bytes += size;
      work++;
      result.incomplete ||= received.change !== 'occurrence';
      continue;
    }
    const facets: TemporalFacetReference[] = [],
      values: TemporalValue[] = [];
    for (const facet of [...received.facets].sort((a, b) => b.memberIndex - a.memberIndex)) {
      if (
        query.before &&
        received.batchOrder === query.before.batchOrder &&
        received.entryIndex === query.before.entryIndex &&
        facet.memberIndex >= query.before.memberIndex
      )
        continue;
      if (++work > maxWork) {
        result.incomplete = true;
        result.hasMore = true;
        break;
      }
      result.examinedBefore = {
        epoch: received.epoch,
        batchOrder: received.batchOrder,
        entryIndex: received.entryIndex,
        memberIndex: facet.memberIndex,
        at: received.at,
        order: received.order,
      };
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
        !temporalFacetEligible(context.disclosure, context.actorId, facet, value) ||
        (query.measurements &&
          (facet.measuredThrough < query.measurements.from ||
            facet.measuredFrom > query.measurements.through))
      )
        continue;
      facets.unshift(facet);
      values.unshift(value);
    }
    if (!facets.length) continue;
    const receipt = temporalReceiptForRead(
        selectTemporalReceiptFacets(received, facets, context.sources, context.disclosure),
      ),
      added = byteLength(receipt) + values.reduce((sum, value) => sum + byteLength(value), 0);
    if (result.entries.length >= limit || bytes + added > maxBytes) {
      result.incomplete = true;
      result.hasMore = true;
      break;
    }
    bytes += added;
    result.entries.push({ receipt, values });
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
  const individualCandidates = new Set<string>();
  for (const [id, capsule] of Object.entries(actor.supports ?? {}))
    if (temporalSupportAliases(capsule, world).some((alias) => sourceIds.has(alias))) {
      if (capsule.receipt.subjectIdentity?.kind === 'individual')
        individualCandidates.add(capsule.receipt.subjectIdentity.individualId);
      for (const value of capsule.values) {
        const individual = temporalValueIndividualId(value);
        if (individual) individualCandidates.add(individual);
      }
      releaseTemporalSupport(world, actorId, id);
      released.push(id);
    }
  if (individualCandidates.size)
    selectedPruneObserverIndividuals(world, actorId, {
      releasedSourceIds: [],
      candidates: [...individualCandidates],
      retireRecent: true,
    });
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
    replacements: ReceivedChargeDirectory[] = [],
    individualCandidates = new Set<string>();
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
      if (facets.length || !receipt.facets.length) retained.push({ ...receipt, facets });
    }
    if (pageChanged) {
      for (const id of page.individualIds) individualCandidates.add(id);
      for (const batch of page.batches)
        for (const entry of batch.entries)
          removedAddresses.add(JSON.stringify([batch.batchOrder, entry.entryIndex]));
      replaceTemporalPageReceipts(page, retained, world);
      refreshTemporalPage(page, world);
      const directory = temporalPageMetadata(page, { world }).chargeDirectory;
      if (directory.entries.length) replacements.push(directory);
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
    const released = new Set<string>();
    for (const [batchOrder] of affected) {
      const key = recentBlockKey(actor, batchOrder),
        directory = orderedRecordGet(actor.recent.blocks, key);
      if (directory) releaseDirectory(actor, key, directory, released);
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
          const original = contact.content.originals[group.received.grant.original];
          if (!original) continue;
          const members = mark.members.filter(({ kind }) => {
            const record = currentGroupFacetRecord(group, original, kind);
            if (!record) return true;
            const input = temporalFacetInput(world, currentTemporalFacetSupport(owner, record));
            if (!('received' in input)) return false;
            const { received, ...facet } = input;
            const value = materializeTemporalValue(
              { reception: received.projection.reception },
              received.projection.value,
              world.receivedValues?.sources ?? {},
            );
            return (
              !!value &&
              revoked(
                value,
                { ...facet, valueRef: received.reference.valueRef, memberIndex: 0 },
                {
                  id: 'current',
                  sourceIds: [],
                  facets: [],
                },
              )
            );
          });
          if (members.length) {
            if (!mark.gap)
              releaseTerminalReservation(world, actorId, mark.terminalBytes * members.length);
            updates.push({
              subjectId,
              fields: group.received.fields,
              members: members.map(({ kind, part }) => [kind, part] as const),
              recording: undefined,
            });
          }
        }
    if (updates.length) currentGroupsSetRecording(owner, updates);
  }
  if (individualCandidates.size)
    selectedPruneObserverIndividuals(world, actorId, {
      releasedSourceIds: [],
      candidates: [...individualCandidates],
      retireRecent: true,
    });
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
  const direct = parseTemporalReceiptId(directSource);
  if (direct) {
    // A block range or dependency alias is only a candidate. The actual owned
    // entry/member proves existence; cold edit callers prepare this selected body.
    for (const page of actor.pages) {
      if (page.epoch !== direct.epoch || !page.sourceIds.includes(sourceId)) continue;
      const locator = { actorId, physicalLife: page.physicalLife, ...direct };
      if (!receivedDirectoryContains(actor.recent, locator)) continue;
      const receipt = temporalPageReceipt(page, locator);
      if (!receipt || receipt.at <= cutoff) continue;
      const eligible = (memberIndex: number) =>
        receivedPositionEligible({ ...locator, memberIndex }, receipt.at, actor.frontier);
      if (fact)
        return receipt.facets.some(
          (field) => field.memberIndex === fact.ordinal && eligible(field.memberIndex),
        );
      return receipt.facets.length
        ? receipt.facets.some((field) => eligible(field.memberIndex))
        : eligible(0);
    }
    return false;
  }
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
/** Called only with a finite private-reader admitted capture, after explicit revocation fencing. */
export function retainCapturedTemporalSupport(
  world: WorldState,
  actorId: string,
  capture: { receipt: TemporalReceipt; values: readonly TemporalValue[] },
  options: { required?: boolean; maxBytes: number; maxRecords: number },
): TemporalSupportCapsule | undefined {
  if (
    capture.receipt.actorId !== actorId ||
    capture.receipt.facets.length !== capture.values.length
  )
    return;
  return retainTemporalCaptureSupport(
    world,
    actorId,
    {
      subject: capture.receipt.subject,
      subjectIdentity: capture.receipt.subjectIdentity,
      change: 'baseline',
      sourceIds: [...new Set([capture.receipt.id, ...capture.receipt.sourceIds])],
      facets: capture.receipt.facets.map((facet, index) => {
        const {
          valueRef: _reference,
          reception: _reception,
          memberIndex: _index,
          ...metadata
        } = facet;
        return { ...metadata, value: capture.values[index]! };
      }),
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
  const lease = currentTemporalFacetSupport(owner, owned),
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
