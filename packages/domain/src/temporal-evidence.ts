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
  type CurrentPartPartition,
  type CurrentFacetTimes,
  type CurrentMemberPart,
} from './perception-current.js';
import {
  temporalPageReceipts,
  temporalPageOperations,
  temporalOperationHeader,
  temporalOperationLogicalBytes,
  temporalDeclarationSourceIds,
  temporalClockSourceIds,
  temporalPageReceipt,
  temporalReceiptValues,
  temporalPageReferences,
  temporalCheckedFacet,
  temporalSeedFacet,
  markTemporalPageEdited,
  replaceTemporalPageReceipts,
  temporalPageMetadata,
  appendTemporalPageOperation,
  type TemporalHistoryOperation,
  type TemporalHistoryInput,
  temporalOperationLogicalCount,
  selectTemporalPageOperations,
  type TemporalCheckDeclaration,
  type TemporalCheckSeed,
  type TemporalCheckpoint,
  type TemporalCheckpointAvailability,
} from './temporal-frames.js';
import {
  temporalRecognitionSupportSourceIds,
  temporalReadSourceRevoked,
  captureTemporalReadContext,
  type CapturedTemporalHistoryContext,
  type TemporalReadSource,
} from './temporal-read-context.js';
import { nextId } from './data.js';
import {
  retainReceivedValue,
  type ReceivedValueReference,
  receivedValueAt,
  type ReceivedValueState,
  type ReceivedValueLookup,
  type ReceivedValueFragment,
} from './received-values.js';
import { cloneValue, readOnlyDraftView, touchNativeEvidence } from './draft.js';
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
import { personalFactAlias } from './experience-source.js';
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
  ordinal: number;
}
export function temporalReceiptId(
  locator: Pick<TemporalReceiptLocator, 'epoch' | 'ordinal'>,
): string {
  return `temporal-receipt-${locator.epoch}-${locator.ordinal}`;
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
  ordinal: number;
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
  /** Physical saved pages are immutable append destinations after recovery. */
  appendClosed?: true;
  /** Allocation order survives cold residency and physical batch layout. */
  order: number;
  actorId: string;
  physicalLife: number;
  epoch: string;
  fromOrdinal: number;
  throughOrdinal: number;
  fromAt: number;
  throughAt: number;
  subjects: string[];
  sourceIds: string[];
  individualIds: string[];
  sourceRefs: string[];
  bytes: number;
  count: number;
  operations: TemporalHistoryOperation[];
  declarations: TemporalCheckDeclaration[];
}
type NativeEvidenceSource = Extract<
  EvidenceSource,
  { family: 'native-exposure' | 'native-response' }
>;
/** Native current-group recording cursor, never another value or permission store. */
export interface TemporalCurrentGroupCheckpoint {
  epoch: string;
  openingOrdinal: number;
  acquisition: number;
  admittedAt: number;
  admittedOrder: number;
  started: CurrentFacetTimes;
  startedSource: NativeEvidenceSource;
  startedFrame?: ObservationFrame;
  lastFrame?: ObservationFrame;
  lastTimes: CurrentFacetTimes;
  lastSource: NativeEvidenceSource;
  lastAt: number;
  lastOrder: number;
  members: readonly {
    kind: string;
    part: 'value' | 'detail' | 'pose';
    ordinal: number;
    bytes: number;
  }[];
  count: number;
  through: number;
  startedMeasurementRevision: number;
  lastMeasurementRevision: number;
  coverage?: { id: number; memberOrdinals: readonly number[]; measurement: boolean };
  reservedBytes: number;
}
export interface TemporalCurrentGroupInput {
  subjectId: string;
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
  nextOrdinal: number;
  /** Resident append/tail only. The repository owns cold chunks and indexed retirement. */
  pages: TemporalPage[];
  bytes: number;
  count: number;
  nextDue: number | null;
  maintenanceDue: boolean;
  /** Conservative unavailable-prefix coverage, not a ledger of fictional sensory losses. */
  releasedThrough?: number;
  /** Exact logical prefix frontier; physical rows may be collected later. */
  retiredThrough?: { pageOrder: number; ordinal: number; at: number };
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
  return page.operations.reduce((sum, operation) => sum + operation.charge.bytes, 0);
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
  touchNativeEvidence(world, 'temporal', actorId);
  const temporal = state(world);
  if (!temporal) return;
  const life = entity.actor.physicalLife ?? 0;
  let actor = temporal.actors[actorId];
  if (!actor) {
    actor = temporal.actors[actorId] = {
      physicalLife: life,
      epoch: `${temporal.namespace}-${nextId(world, 'receipt-epoch')}`,
      nextOrdinal: 0,
      pages: [],
      bytes: 0,
      count: 0,
      nextDue: null,
      maintenanceDue: false,
    };
  } else if (actor.physicalLife !== life) {
    actor.physicalLife = life;
    actor.epoch = `${temporal.namespace}-${nextId(world, 'receipt-epoch')}`;
    actor.nextOrdinal = 0;
  }
  return { state: temporal, actor };
}
export function temporalActorHistory(
  world: WorldState,
  actorId: string,
): TemporalActorHistory | undefined {
  return actorHistory(world, actorId)?.actor;
}
type OpenRecordingEntry =
  | {
      kind: 'contact';
      subjectId: string;
      group: CurrentReceivedGroup;
      partition: CurrentPartPartition;
      mark: TemporalCurrentGroupCheckpoint;
    }
  | { kind: 'geometry'; feature: TemporalGeometryFeature; mark: TemporalCurrentGroupCheckpoint };
/** Traverse the existing current owners, never received fields or proof facades. */
function* openRecordingEntries(world: WorldState, actorId: string): Generator<OpenRecordingEntry> {
  const owner = world.perceptionEvidence?.[actorId];
  if (!owner) return;
  for (const [subjectId, contact] of currentContactEntries(owner))
    for (const group of contact.content.groups)
      for (const partition of group.metadata)
        if (partition.recording)
          yield { kind: 'contact', subjectId, group, partition, mark: partition.recording };
  for (const features of [owner.geometry?.fragments ?? [], owner.geometry?.boundaries ?? []])
    for (const feature of features)
      if (feature.recording) yield { kind: 'geometry', feature, mark: feature.recording };
}
/** Held reservations and their expiry are metadata beside closed page charges.
 * Age starts at actual recording admission or its latest actual received check. */
export function temporalOpenReservationTotals(
  world: WorldState,
  actorId: string,
): {
  bytes: number;
  count: number;
  expired: { bytes: number; count: number };
  nextDue: number | null;
} {
  const age = selectedTemporalPolicy(world).recent.maxAgeSeconds;
  let bytes = 0,
    count = 0,
    nextDue: number | null = null;
  const expired = { bytes: 0, count: 0 };
  for (const { mark } of openRecordingEntries(world, actorId)) {
    bytes += mark.reservedBytes;
    count += mark.count;
    const due = Math.max(mark.admittedAt, mark.lastAt) + age;
    nextDue = Math.min(nextDue ?? Infinity, due);
    if (due <= world.simTime) {
      expired.bytes += mark.reservedBytes;
      expired.count += mark.count;
    }
  }
  return { bytes, count, expired, nextDue };
}
/** Ordinary recent maintenance expires only still-due recording. Current values,
 * grants and targeting survive; no closure or observation is manufactured. */
export function expireTemporalOpenRecordings(
  world: WorldState,
  actorId: string,
): { bytes: number; count: number } {
  const actor = world.experience?.temporal?.actors[actorId],
    owner = world.perceptionEvidence?.[actorId];
  const released = { bytes: 0, count: 0 };
  if (!actor || !owner) return released;
  const age = selectedTemporalPolicy(world).recent.maxAgeSeconds;
  const updates: Parameters<typeof currentGroupsSetRecording>[1][number][] = [];
  for (const entry of openRecordingEntries(world, actorId)) {
    if (Math.max(entry.mark.admittedAt, entry.mark.lastAt) + age > world.simTime) continue;
    released.bytes += entry.mark.reservedBytes;
    released.count += entry.mark.count;
    if (entry.kind === 'contact')
      updates.push({
        subjectId: entry.subjectId,
        fields: entry.group.received.fields,
        members: entry.partition.members,
        recording: undefined,
      });
    else delete entry.feature.recording;
  }
  if (!released.bytes && !released.count) return released;
  touchNativeEvidence(world, 'temporal', actorId);
  touchNativeEvidence(world, 'perception', actorId);
  if (updates.length) currentGroupsSetRecording(owner, updates);
  actor.bytes -= released.bytes;
  actor.count -= released.count;
  if (actor.bytes < 0 || actor.count < 0)
    throw new Error('Expired recording reservation accounting underflow.');
  return released;
}
/** Restore starts a new append address space without replaying any perception. */
export function beginTemporalReceiptEpoch(world: WorldState, namespace: string): void {
  touchNativeEvidence(world, 'temporal');
  const temporal = world.experience?.temporal;
  if (!temporal) return;
  if (!namespace.trim() || namespace.length > 64)
    throw new Error('A receipt timeline requires its admitted namespace.');
  temporal.namespace = namespace;
  for (const [actorId, actor] of Object.entries(temporal.actors)) {
    const owner = world.perceptionEvidence?.[actorId];
    if (owner)
      for (const [subjectId, contact] of currentContactEntries(owner))
        for (const group of contact.content.groups)
          closeTemporalCurrentGroup(world, actorId, subjectId, group, 'attention-exit');
    if (owner?.geometry)
      for (const feature of [...owner.geometry.fragments, ...owner.geometry.boundaries])
        closeTemporalGeometry(
          world,
          actorId,
          feature,
          owner.geometry.supportedThrough,
          'attention-exit',
        );
    actor.epoch = `${temporal.namespace}-${nextId(world, 'receipt-epoch')}`;
    actor.nextOrdinal = 0;
  }
}
const acquisitionBatches = new WeakMap<
  WorldState,
  Map<string, { acquisition: number; frame?: ObservationFrame }>
>();
/** The actual native receiving operation owns this synchronous batch. It is
 * neither saved authority nor a way for readers to acquire more evidence. */
export function withTemporalAcquisition<T>(
  world: WorldState,
  actorId: string,
  frame: ObservationFrame | undefined,
  work: () => T,
): T {
  let batches = acquisitionBatches.get(world);
  if (batches?.has(actorId)) return work();
  const actor = actorHistory(world, actorId)?.actor;
  if (!actor) return work();
  if (!batches) acquisitionBatches.set(world, (batches = new Map()));
  batches.set(actorId, { acquisition: actor.nextOrdinal, ...(frame ? { frame } : {}) });
  try {
    return work();
  } finally {
    batches.delete(actorId);
    if (!batches.size) acquisitionBatches.delete(world);
  }
}
/** Called only with already received values. Admission never reads a hidden source entity. */
/** A page holds native intent. Physical packing/encoding belongs to the detached save cut. */
function appendHistoryOperation(
  world: WorldState,
  actorId: string,
  input: TemporalHistoryInput,
  policy: TemporalRetentionPolicy,
  required: boolean,
  declarations:
    | readonly TemporalCheckDeclaration[]
    | (() => readonly TemporalCheckDeclaration[]) = [],
  reservation = 0,
  reservationCount = 0,
): boolean {
  const owned = actorHistory(world, actorId);
  if (!owned) return false;
  const actor = owned.actor;
  const added = temporalOperationLogicalBytes(input, world.receivedValues?.sources ?? {});
  const previous = actor.pages.at(-1),
    newPage =
      !previous ||
      previous.appendClosed === true ||
      previous.epoch !== actor.epoch ||
      previous.bytes + added > TEMPORAL_NATIVE_PAGE_BYTES;
  const targetDeclarations = newPage ? [] : previous.declarations;
  let preparedDeclarations: readonly TemporalCheckDeclaration[] = [];
  if (
    input.kind === 'check' &&
    input.stamps.some((stamp) => !targetDeclarations.some((d) => d.id === stamp.declaration))
  )
    preparedDeclarations = typeof declarations === 'function' ? declarations() : declarations;
  const allDeclarations = [...targetDeclarations, ...preparedDeclarations];
  const count = temporalOperationLogicalCount(input, allDeclarations);
  const operation: TemporalHistoryOperation = { ...input, charge: { bytes: added, count } };
  if (
    !required &&
    (actor.bytes + added - reservation >
      policy.maxBytes * (1 + selectedTemporalPolicy(world).maintenanceHeadroom) ||
      actor.count + count >
        policy.maxChanges * (1 + selectedTemporalPolicy(world).maintenanceHeadroom))
  ) {
    actor.recordingGap = {
      from: actor.recordingGap?.from ?? world.simTime,
      through: world.simTime,
    };
    actor.maintenanceDue = true;
    return false;
  }
  let page: TemporalPage;
  if (!previous || newPage) {
    page = {
      id: nextId(world, 'temporal-page'),
      order: world.nextId,
      actorId,
      physicalLife: actor.physicalLife,
      epoch: actor.epoch,
      fromOrdinal: operation.ordinal,
      throughOrdinal: operation.ordinal,
      fromAt: world.simTime,
      throughAt: world.simTime,
      subjects: [],
      sourceIds: [],
      individualIds: [],
      sourceRefs: [],
      bytes: 0,
      count: 0,
      operations: [],
      declarations: [],
    };
    actor.pages.push(page);
  } else page = previous;
  // Declarations are native immutable membership. Physical page packing supplies exact predecessor seeds.
  for (const declaration of preparedDeclarations)
    if (!page.declarations.some((d) => d.id === declaration.id)) {
      page.declarations.push(immutableDataSnapshot(declaration, readOnlyDraftView));
      for (const alias of temporalDeclarationSourceIds(declaration))
        if (!page.sourceIds.includes(alias)) page.sourceIds.push(alias);
      for (const seed of declaration.seeds)
        if (
          seed.reception?.kind === 'body' &&
          typeof seed.reception.poseRef === 'string' &&
          !page.sourceRefs.includes(seed.reception.poseRef)
        )
          page.sourceRefs.push(seed.reception.poseRef);
    }
  appendTemporalPageOperation(page, operation, world);
  const header = temporalOperationHeader(page, operation);
  page.fromAt = Math.min(page.fromAt, header.at);
  page.throughAt = Math.max(page.throughAt, world.simTime);
  page.throughOrdinal = operation.ordinal;
  if (operation.kind !== 'check') {
    for (const subject of [operation.receipt.subject, ...(operation.receipt.contextSubjects ?? [])])
      if (!page.subjects.includes(subject)) page.subjects.push(subject);
    for (const alias of temporalReceiptAliases(
      operation.receipt,
      world.receivedValues?.sources ?? {},
      world,
    ))
      if (!page.sourceIds.includes(alias)) page.sourceIds.push(alias);
    for (const ref of operation.receipt.facets.flatMap(temporalFacetValueReferences))
      if (!page.sourceRefs.includes(ref)) page.sourceRefs.push(ref);
    const individuals = temporalReceiptIndividualIds(
      operation.receipt,
      world.receivedValues?.sources ?? {},
    );
    for (const id of individuals) if (!page.individualIds.includes(id)) page.individualIds.push(id);
    selectedMarkRecentIndividualReferences(world, actorId, individuals, {
      epoch: actor.epoch,
      ordinal: operation.ordinal,
      pageOrder: page.order,
      at: header.at,
    });
  } else
    for (const stamp of operation.stamps) {
      const declaration = page.declarations.find((d) => d.id === stamp.declaration);
      if (declaration && !page.subjects.includes(declaration.subject))
        page.subjects.push(declaration.subject);
      if (!page.sourceIds.includes(stamp.confirmation.id))
        page.sourceIds.push(stamp.confirmation.id);
    }
  if (operation.kind === 'span')
    for (const seed of operation.terminal)
      for (const alias of temporalClockSourceIds(seed))
        if (!page.sourceIds.includes(alias)) page.sourceIds.push(alias);
  page.bytes += added;
  page.count += count;
  actor.bytes += added - reservation;
  actor.count += count - reservationCount;
  const due = header.at + policy.maxAgeSeconds;
  actor.nextDue = actor.nextDue === null ? due : Math.min(actor.nextDue, due);
  actor.maintenanceDue =
    actor.bytes > policy.maxBytes ||
    actor.count > policy.maxChanges ||
    (actor.nextDue !== null && actor.nextDue <= world.simTime);
  countDomainWork('temporalOperationsAppended');
  chargeWork({ effects: 1, outputBytes: added });
  return true;
}
export function appendTemporalReceipt(
  world: WorldState,
  actorId: string,
  input: TemporalCaptureInput,
  policy: TemporalRetentionPolicy,
  acquisition?: number,
): TemporalReceiptLocator | undefined {
  if (!input.facets.length) return;
  const owned = actorHistory(world, actorId);
  if (!owned) return;
  const actor = owned.actor,
    ordinal = actor.nextOrdinal++,
    order = temporalReceivedOrder(world, actorId);
  const facets: TemporalFacetReference[] = input.facets.flatMap((facet, memberOrdinal) => {
    const projection =
      'received' in facet ? facet.received.projection : splitTemporalValue(facet.value);
    const metadata =
      'received' in facet
        ? (({ received, ...rest }) => rest)(facet)
        : (({ value, retainedValue, ...rest }) => rest)(facet);
    const preferred = 'received' in facet ? facet.received.reference : facet.retainedValue;
    const retained = retainReceivedValue(world, projection.value, preferred);
    let reception = projection.reception;
    if (reception?.kind === 'body' && reception.pose)
      reception = { kind: 'body', pose: reception.pose };
    return [
      {
        ...metadata,
        valueRef: retained.reference,
        ordinal: memberOrdinal,
        ...(reception ? { reception } : {}),
      },
    ];
  });
  const batch = acquisitionBatches.get(world)?.get(actorId);
  const receipt: TemporalReceipt = {
    actorId,
    physicalLife: actor.physicalLife,
    epoch: actor.epoch,
    ordinal,
    id: temporalReceiptId({ epoch: actor.epoch, ordinal }),
    at: world.simTime,
    order,
    acquisition: batch?.acquisition ?? acquisition ?? ordinal,
    subject: input.subject,
    change: input.change,
    required: input.required === true,
    sourceIds: [...new Set(input.sourceIds ?? [])],
    facets,
    ...(input.subjectIdentity ? { subjectIdentity: input.subjectIdentity } : {}),
    ...((input.receiverFrame ?? batch?.frame)
      ? { receiverFrame: input.receiverFrame ?? batch?.frame }
      : {}),
    ...(input.origin ? { origin: input.origin } : {}),
    ...(input.contextSubjects ? { contextSubjects: [...input.contextSubjects] } : {}),
    ...(input.availability ? { availability: input.availability } : {}),
    ...(input.availabilityAt === undefined ? {} : { availabilityAt: input.availabilityAt }),
    ...(actor.recordingGap ? { coverageGap: actor.recordingGap } : {}),
  };
  if (
    !appendHistoryOperation(
      world,
      actorId,
      { kind: 'occurrence', ordinal, receipt },
      policy,
      input.required === true,
    )
  )
    return;
  return { actorId, physicalLife: actor.physicalLife, epoch: actor.epoch, ordinal };
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
    ? 1
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

const receivingTransitions = new WeakMap<WorldState, Map<string, { order?: number }>>();
/** One received transition shares its causal boundary across close, install and check. */
export function withTemporalReceivedTransition<T>(
  world: WorldState,
  actorId: string,
  work: () => T,
): T {
  let actors = receivingTransitions.get(world);
  if (actors?.has(actorId)) return work();
  if (!actors) receivingTransitions.set(world, (actors = new Map()));
  actors.set(actorId, {});
  try {
    return work();
  } finally {
    actors.delete(actorId);
    if (!actors.size) receivingTransitions.delete(world);
  }
}
export function temporalReceivedOrder(world: WorldState, actorId: string): number {
  const transition = receivingTransitions.get(world)?.get(actorId);
  if (transition?.order !== undefined) return transition.order;
  const order = world.nextId;
  nextId(world, 'received-order');
  if (transition) transition.order = order;
  return order;
}
/** Only selected consumers and closing boundaries project received values. */
function currentGroupReceipt(
  world: WorldState,
  actorId: string,
  subjectId: string,
  group: CurrentReceivedGroup,
  partition: CurrentPartPartition,
): TemporalReceipt | undefined {
  const mark = partition.recording,
    owner = world.perceptionEvidence?.[actorId];
  if (!mark || !owner) return;
  const original = currentContactGet(owner, subjectId)?.content.originals[
    group.received.grant.original
  ];
  if (!original) return;
  const facets: TemporalFacetReference[] = [];
  for (const member of mark.members) {
    if (!partition.members.some(([kind, part]) => kind === member.kind && part === member.part))
      continue;
    const record = currentGroupFacetRecord(group, original, member.kind, partition);
    if (!record) throw new Error('An open interval has no received member.');
    const lease = currentFacetSupport(owner, record);
    const input = temporalFacetInput(world, {
      ...lease,
      ...mark.started,
      revision: mark.startedSource.revision,
    });
    if (!('received' in input)) throw new Error('Current recording lost its received value.');
    const { received, ...metadata } = input;
    // The raw acquisition pose remains original evidence. Current location owns newer poses.
    const measurementSource: NativeEvidenceSource = {
      ...mark.startedSource,
      id: record.id,
      revision: mark.startedMeasurementRevision,
    };
    facets.push({
      ...metadata,
      ...received.reference,
      track: JSON.stringify([
        receivedTrackKey(group.received.grant.exposure, group.received.grant.channel),
        member.kind,
        member.part,
      ]),
      ordinal: member.ordinal,
      ...(member.part === 'detail' ? {} : { receivedFrom: measurementSource }),
      ...(received.projection.reception ? { reception: received.projection.reception } : {}),
    });
  }
  if (!facets.length) return;
  return {
    actorId,
    physicalLife: currentFacetObserver(owner).physicalLife,
    epoch: mark.epoch,
    ordinal: mark.openingOrdinal,
    id: temporalReceiptId({ epoch: mark.epoch, ordinal: mark.openingOrdinal }),
    at: mark.admittedAt,
    order: mark.admittedOrder,
    acquisition: mark.acquisition,
    subject: receivedTrackKey(group.received.grant.exposure, group.received.grant.channel),
    change: 'baseline',
    required: false,
    sourceIds: [],
    facets,
    ...(mark.startedFrame ? { receiverFrame: mark.startedFrame } : {}),
    ...(partition.availability
      ? {
          availability: groupedTemporalAvailability(
            facets.map(() => ({ reason: 'unchecked', at: partition.availability!.at })),
          ),
        }
      : {}),
  };
}
export interface TemporalOpenInterval {
  receipt: TemporalReceipt;
  terminal: readonly TemporalCheckSeed[];
}
export function currentTemporalOpenIntervals(
  world: WorldState,
  actorId: string,
  subjects?: ReadonlySet<string>,
  includeGeometry = false,
): TemporalOpenInterval[] {
  const owner = world.perceptionEvidence?.[actorId];
  if (!owner) return [];
  const receipts: TemporalOpenInterval[] = [];
  for (const [subjectId, contact] of currentContactEntries(owner))
    for (const group of contact.content.groups) {
      if (
        subjects &&
        !subjects.has(subjectId) &&
        !subjects.has(receivedTrackKey(group.received.grant.exposure, group.received.grant.channel))
      )
        continue;
      for (const partition of group.metadata) {
        const receipt = currentGroupReceipt(world, actorId, subjectId, group, partition);
        if (receipt && partition.recording)
          receipts.push({
            receipt,
            terminal: currentTerminal(
              world,
              actorId,
              subjectId,
              group,
              partition.recording,
              partition.members,
            ),
          });
      }
    }
  const geometry = owner.geometry;
  if (geometry)
    for (const feature of [...geometry.fragments, ...geometry.boundaries]) {
      const receipt = geometryReceipt(world, actorId, feature);
      if (receipt && (includeGeometry || !subjects || subjects.has(receipt.subject)))
        receipts.push({ receipt, terminal: geometryTerminal(feature) });
    }
  return receipts;
}
function selectedRecordingMembers(
  mark: TemporalCurrentGroupCheckpoint,
  parts: readonly CurrentMemberPart[],
) {
  // The current owner has already established exact partition membership.
  if (mark.members.length === parts.length) return mark.members;
  return mark.members.filter((member) =>
    parts.some(([kind, part]) => member.kind === kind && member.part === part),
  );
}
function transferReservation(
  mark: TemporalCurrentGroupCheckpoint,
  parts: readonly CurrentMemberPart[],
) {
  const members = selectedRecordingMembers(mark, parts);
  return {
    bytes: members.reduce((total, member) => total + member.bytes, 0),
    count: new Set(members.map((member) => member.ordinal)).size,
  };
}
function currentTerminal(
  world: WorldState,
  actorId: string,
  subjectId: string,
  group: CurrentReceivedGroup,
  mark: TemporalCurrentGroupCheckpoint,
  parts: readonly CurrentMemberPart[],
): TemporalCheckSeed[] {
  const original = currentContactGet(world.perceptionEvidence![actorId], subjectId)?.content
    .originals[group.received.grant.original];
  if (!original) throw new Error('A closing interval has no original support.');
  return selectedRecordingMembers(mark, parts).map((member) => {
    const field = group.received.fields[member.kind]!;
    return {
      member: member.ordinal,
      part: member.part,
      receivedAt: mark.lastAt,
      order: mark.lastOrder,
      support: {
        original: contributionFactKey(
          { ...original, observer: currentFacetObserver(world.perceptionEvidence![actorId]!) },
          field.originalOrdinal,
        ),
        confirmation: directSource(mark.lastSource, field.id),
        confirmedFrom: mark.lastTimes.confirmedFrom,
        confirmedThrough: mark.lastTimes.confirmedThrough,
      },
      measuredFrom: mark.lastTimes.valueMeasuredFrom,
      measuredThrough: mark.lastTimes.valueMeasuredThrough,
      acquiredAt: mark.lastTimes.valueAcquiredAt,
      receivedFrom: directSource(mark.lastSource, field.id, mark.lastMeasurementRevision),
      ...(mark.lastFrame && field.value.kind === 'location'
        ? { reception: { kind: 'location' as const, frame: mark.lastFrame } }
        : {}),
    };
  });
}
/** An accepted open reservation makes closure mandatory even under optional pressure. */
export function closeTemporalCurrentGroup(
  world: WorldState,
  actorId: string,
  subjectId: string,
  group: CurrentReceivedGroup,
  reason: TemporalReceipt['change'],
  partition?: CurrentPartPartition,
): void {
  const actor = world.experience?.temporal?.actors[actorId];
  if (!actor) return;
  for (const part of partition ? [partition] : group.metadata) {
    const mark = part.recording;
    if (!mark) continue;
    const receipt = currentGroupReceipt(world, actorId, subjectId, group, part);
    if (!receipt) throw new Error('An open recording has no current authority.');
    const reservation = transferReservation(mark, part.members);
    const accepted = appendHistoryOperation(
      world,
      actorId,
      {
        kind: 'span',
        ordinal: actor.nextOrdinal++,
        receipt,
        terminal: currentTerminal(world, actorId, subjectId, group, mark, part.members),
        closedAt: world.simTime,
        closedOrder: temporalReceivedOrder(world, actorId),
        reason,
      },
      selectedTemporalPolicy(world).recent,
      true,
      [],
      reservation.bytes,
      reservation.count,
    );
    if (!accepted) throw new Error('Accepted current history could not close.');
    currentGroupsSetRecording(world.perceptionEvidence![actorId]!, [
      { subjectId, fields: group.received.fields, members: part.members, recording: undefined },
    ]);
  }
}
function measurementChanged(
  times: CurrentFacetTimes,
  mark: TemporalCurrentGroupCheckpoint,
  revision: number,
): boolean {
  return (
    revision !== mark.lastMeasurementRevision ||
    times.valueMeasuredFrom !== mark.lastTimes.valueMeasuredFrom ||
    times.valueMeasuredThrough !== mark.lastTimes.valueMeasuredThrough ||
    times.valueAcquiredAt !== mark.lastTimes.valueAcquiredAt
  );
}
function sameCoverage(
  coverage: NonNullable<TemporalCurrentGroupCheckpoint['coverage']>,
  ordinals: readonly number[],
  measurement: boolean,
): boolean {
  return (
    coverage.measurement === measurement &&
    (coverage.memberOrdinals === ordinals ||
      (coverage.memberOrdinals.length === ordinals.length &&
        coverage.memberOrdinals.every((ordinal, at) => ordinal === ordinals[at])))
  );
}
function directSource(
  source: NativeEvidenceSource,
  id: string,
  revision = source.revision,
): NativeEvidenceSource {
  return { ...source, id, revision };
}
function currentDeclaration(
  world: WorldState,
  actorId: string,
  original: ReceivedObservation,
  group: CurrentReceivedGroup,
  mark: TemporalCurrentGroupCheckpoint,
  members: TemporalCurrentGroupCheckpoint['members'],
  id: number,
): TemporalCheckDeclaration {
  const observer = currentFacetObserver(world.perceptionEvidence![actorId]!);
  return {
    id,
    subject: receivedTrackKey(group.received.grant.exposure, group.received.grant.channel),
    members: members.map((member) => {
      const field = group.received.fields[member.kind]!;
      return {
        locator: {
          actorId,
          physicalLife: observer.physicalLife,
          epoch: mark.epoch,
          ordinal: mark.openingOrdinal,
        },
        memberOrdinal: member.ordinal,
        part: member.part,
        original: contributionFactKey(
          { ...original, observer: currentFacetObserver(world.perceptionEvidence![actorId]!) },
          field.originalOrdinal,
        ),
        role: original.facets[field.originalOrdinal]?.role ?? 'direct',
        confirmationIdentity: { family: 'native-exposure' as const, id: field.id, observer },
        revisionFloor: mark.lastMeasurementRevision,
      };
    }),
    seeds: members.map((member, index) => {
      const field = group.received.fields[member.kind]!,
        fact = contributionFactKey(
          { ...original, observer: currentFacetObserver(world.perceptionEvidence![actorId]!) },
          field.originalOrdinal,
        );
      return {
        member: index,
        part: member.part,
        receivedAt: mark.lastAt,
        order: mark.lastOrder,
        support: {
          original: fact,
          confirmation: directSource(mark.lastSource, field.id),
          confirmedFrom: mark.lastTimes.confirmedFrom,
          confirmedThrough: mark.lastTimes.confirmedThrough,
        },
        measuredFrom: mark.lastTimes.valueMeasuredFrom,
        measuredThrough: mark.lastTimes.valueMeasuredThrough,
        acquiredAt: mark.lastTimes.valueAcquiredAt,
        receivedFrom: directSource(mark.lastSource, field.id, mark.lastMeasurementRevision),
        ...(mark.lastFrame && field.value.kind === 'location'
          ? { reception: { kind: 'location' as const, frame: mark.lastFrame } }
          : {}),
      };
    }),
  };
}
function reserveOpenReceipt(world: WorldState, receipt: TemporalReceipt): number[] {
  // Price each possible standalone close once at admission. Maximum numeric widths
  // cover later clocks/revisions/frames; immutable values and source identities stay fixed.
  // Native JSON numbers need at most 25 characters; a small negative fraction
  // reserves that width for clocks and frame components without encoding scratch.
  const far = -0.0000012345678901234567,
    sequence = Number.MAX_SAFE_INTEGER;
  const revisionBound = (source: EvidenceSource): EvidenceSource =>
    source.family === 'native-exposure' || source.family === 'native-response'
      ? { ...source, revision: sequence }
      : source.family === 'private-condition' && typeof source.revision === 'number'
        ? { ...source, revision: sequence }
        : source;
  return receipt.facets.map((facet) => {
    const proof = facet.detailSupport?.proof ?? facet.support;
    if (!proof) throw new Error('Open recording has no direct proof.');
    const terminal: TemporalCheckSeed = {
      member: facet.ordinal,
      part: facet.detailSupport ? 'detail' : 'value',
      receivedAt: far,
      order: sequence,
      support: {
        original: proof.original,
        confirmation: revisionBound(proof.confirmation),
        confirmedFrom: far,
        confirmedThrough: far,
      },
      measuredFrom: far,
      measuredThrough: far,
      acquiredAt: far,
      receivedFrom: revisionBound(proof.confirmation),
      ...(facet.reception?.kind === 'location'
        ? {
            reception: {
              kind: 'location' as const,
              frame: {
                positionAtObservation: { x: far, y: far, z: far },
                forwardAtObservation: far,
              },
            },
          }
        : {}),
    };
    return temporalOperationLogicalBytes(
      {
        kind: 'span',
        ordinal: sequence,
        receipt: { ...receipt, facets: [facet] },
        terminal: [terminal],
        closedAt: far,
        closedOrder: sequence,
        reason: 'attention-exit',
      },
      world.receivedValues?.sources ?? {},
    );
  });
}
function admitOpen(
  world: WorldState,
  actor: TemporalActorHistory,
  mark: TemporalCurrentGroupCheckpoint,
  policy: TemporalRetentionPolicy,
): boolean {
  const headroom = 1 + selectedTemporalPolicy(world).maintenanceHeadroom;
  if (
    actor.bytes + mark.reservedBytes > policy.maxBytes * headroom ||
    actor.count + mark.count > policy.maxChanges * headroom
  ) {
    actor.recordingGap = {
      from: actor.recordingGap?.from ?? world.simTime,
      through: world.simTime,
    };
    actor.maintenanceDue = true;
    return false;
  }
  actor.bytes += mark.reservedBytes;
  actor.count += mark.count;
  const due = Math.max(mark.admittedAt, mark.lastAt) + policy.maxAgeSeconds;
  actor.nextDue = actor.nextDue === null ? due : Math.min(actor.nextDue, due);
  return true;
}
function recordingMark(
  actor: TemporalActorHistory,
  at: number,
  order: number,
  times: CurrentFacetTimes,
  source: NativeEvidenceSource,
  measurementRevision: number,
  parts: readonly CurrentMemberPart[],
  acquisition?: number,
): TemporalCurrentGroupCheckpoint {
  const openingOrdinal = actor.nextOrdinal++;
  return {
    epoch: actor.epoch,
    openingOrdinal,
    acquisition: acquisition ?? openingOrdinal,
    admittedAt: at,
    admittedOrder: order,
    started: times,
    startedSource: source,
    startedMeasurementRevision: measurementRevision,
    lastTimes: times,
    lastSource: source,
    lastAt: at,
    lastOrder: order,
    lastMeasurementRevision: measurementRevision,
    members: parts.map(([kind, part], ordinal) => ({ kind, part, ordinal, bytes: 0 })),
    count: parts.length,
    through: times.confirmedThrough,
    reservedBytes: 0,
  };
}
export function captureTemporalCurrent(
  world: WorldState,
  actorId: string,
  inputs: readonly TemporalCurrentGroupInput[],
  policy: TemporalRetentionPolicy,
): void {
  const owned = actorHistory(world, actorId),
    owner = world.perceptionEvidence?.[actorId];
  if (!owned || !owner) return;
  withTemporalReceivedTransition(world, actorId, () => {
    const actor = owned.actor;
    for (const input of inputs) {
      const { group } = input;
      const members = input.partition.members.filter(([, part]) => part !== 'pose');
      if (!members.length) continue;
      const partition =
        members.length === input.partition.members.length
          ? input.partition
          : { ...input.partition, members };
      if (input.exiting) {
        closeTemporalCurrentGroup(
          world,
          actorId,
          input.subjectId,
          group,
          'attention-exit',
          partition,
        );
        continue;
      }
      if (partition.availability) continue;
      const firstField = group.received.fields[members[0]![0]];
      if (!firstField) throw new Error('Received coverage has no current field.');
      const times = currentGroupTimes(group, partition),
        source: NativeEvidenceSource = {
          family: 'native-exposure',
          id: firstField.id,
          revision: Math.max(partition.revision, partition.confirmedRevision),
          observer: currentFacetObserver(owner),
        },
        frame =
          partition.frameRef === undefined
            ? undefined
            : receivedObservationFrame(world, partition.frameRef);
      let mark = partition.recording;
      if (mark && mark.epoch !== actor.epoch)
        throw new Error('Current state has a different recording epoch.');
      if (!mark && !input.checked && !input.entering) continue;
      if (!mark) {
        if (!input.checked && !input.entering) continue;
        const order = temporalReceivedOrder(world, actorId);
        mark = recordingMark(
          actor,
          world.simTime,
          order,
          times,
          source,
          partition.revision,
          members,
          acquisitionBatches.get(world)?.get(actorId)?.acquisition,
        );
        mark.lastAt = partition.receivedAt;
        mark.lastOrder = partition.receivedOrder;
        if (frame) {
          mark.startedFrame = frame;
          mark.lastFrame = frame;
        }
        const receipt = currentGroupReceipt(world, actorId, input.subjectId, group, {
          ...partition,
          recording: mark,
        });
        if (!receipt) throw new Error('Current admission has no received values.');
        const charges = reserveOpenReceipt(world, receipt);
        mark.members = mark.members.map((member, at) => ({ ...member, bytes: charges[at]! }));
        mark.reservedBytes = charges.reduce((total, bytes) => total + bytes, 0);
        if (!admitOpen(world, actor, mark, policy)) continue;
        currentGroupsSetRecording(owner, [
          { subjectId: input.subjectId, fields: group.received.fields, members, recording: mark },
        ]);
        // This admitted baseline already contains the actual successful check at this boundary.
        continue;
      }
      if (!input.checked) continue;
      const selected = selectedRecordingMembers(mark, members),
        ordinals =
          selected === mark.members && mark.coverage
            ? mark.coverage.memberOrdinals
            : selected.map((member) => member.ordinal);
      if (!selected.length) continue;
      const measurement = measurementChanged(times, mark, partition.revision);
      if (
        mark.lastAt === world.simTime &&
        !measurement &&
        mark.lastTimes.confirmedFrom === times.confirmedFrom &&
        mark.lastTimes.confirmedThrough === times.confirmedThrough &&
        mark.lastSource.revision === source.revision
      )
        continue;
      const coverage =
        mark.coverage && sameCoverage(mark.coverage, ordinals, measurement)
          ? mark.coverage
          : { id: actor.nextOrdinal++, memberOrdinals: ordinals, measurement };
      const ordinal = actor.nextOrdinal++,
        order = temporalReceivedOrder(world, actorId);
      const op = {
        kind: 'check' as const,
        ordinal,
        at: world.simTime,
        order,
        acquisition: acquisitionBatches.get(world)?.get(actorId)?.acquisition ?? ordinal,
        stamps: [
          {
            declaration: coverage.id,
            confirmation: source,
            confirmedFrom: times.confirmedFrom,
            confirmedThrough: times.confirmedThrough,
            ...(frame ? { frame } : {}),
            ...(measurement
              ? {
                  measurement: {
                    measuredFrom: times.valueMeasuredFrom,
                    measuredThrough: times.valueMeasuredThrough,
                    acquiredAt: times.valueAcquiredAt,
                    receivedFrom: directSource(source, firstField.id, partition.revision),
                  },
                }
              : {}),
          },
        ],
      };
      if (
        appendHistoryOperation(world, actorId, op, policy, false, () => [
          currentDeclaration(
            world,
            actorId,
            input.originalSource,
            group,
            mark!,
            selected,
            coverage.id,
          ),
        ])
      ) {
        const next = {
          ...mark,
          coverage,
          through: times.confirmedThrough,
          lastTimes: times,
          lastSource: source,
          lastAt: world.simTime,
          lastOrder: order,
          lastMeasurementRevision: partition.revision,
          ...(frame ? { lastFrame: frame } : {}),
        };
        currentGroupsSetRecording(owner, [
          { subjectId: input.subjectId, fields: group.received.fields, members, recording: next },
        ]);
      } else
        closeTemporalCurrentGroup(
          world,
          actorId,
          input.subjectId,
          group,
          'attention-exit',
          partition,
        );
    }
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
    ordinals?: ReadonlySet<number>;
    contextSubjects?: readonly string[];
    change?: TemporalCaptureInput['change'];
    confirmedThrough?: number;
  } = {},
): TemporalReceiptLocator | undefined {
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
      ...(options.contextSubjects?.length ? { contextSubjects: options.contextSubjects } : {}),
      required,
      sourceIds,
      origin: cloneValue(observation.origin),
      facets: observation.facets
        .filter((facet) => !options.ordinals || options.ordinals.has(facet.ordinal))
        .map((facet) => ({
          ...facet,
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
            ordinal: facet.ordinal,
          },
        })),
    },
    policy,
  );
  return locator;
}

export interface TemporalGeometryFeature {
  observation: ObservationContribution;
  recording?: TemporalCurrentGroupCheckpoint;
}
function geometryReceipt(
  _world: WorldState,
  actorId: string,
  feature: TemporalGeometryFeature,
): TemporalReceipt | undefined {
  const mark = feature.recording;
  if (!mark) return;
  const observation = feature.observation;
  const facets: TemporalFacetReference[] = observation.facets.map((facet) => {
    const { value, reception } = splitTemporalValue(facet.value),
      original = contributionFactKey(observation, facet.ordinal);
    // Current geometry already owns the validated value. A selected read must not mutate the shared pool.
    return {
      valueRef: value,
      ordinal: facet.ordinal,
      track: JSON.stringify([observation.origin, facet.ordinal]),
      role: facet.role,
      asOf: facet.measuredThrough,
      measuredFrom: facet.measuredFrom,
      measuredThrough: facet.measuredThrough,
      acquiredAt: facet.acquiredAt,
      original,
      receivedFrom: original.source,
      confirmedThrough: mark.started.confirmedThrough,
      support: {
        original,
        confirmation: mark.startedSource,
        confirmedFrom: mark.started.confirmedFrom,
        confirmedThrough: mark.started.confirmedThrough,
      },
      ...(reception ? { reception } : {}),
    };
  });
  return {
    actorId,
    physicalLife: observation.observer.physicalLife,
    epoch: mark.epoch,
    ordinal: mark.openingOrdinal,
    id: temporalReceiptId({ epoch: mark.epoch, ordinal: mark.openingOrdinal }),
    at: mark.admittedAt,
    order: mark.admittedOrder,
    acquisition: mark.acquisition,
    subject:
      observation.origin.kind === 'exposure'
        ? observation.origin.episodeId
        : observation.origin.eventId,
    change: 'baseline',
    required: false,
    sourceIds: [],
    spatialContext: true,
    origin: observation.origin,
    facets,
  };
}
function geometryDeclaration(
  actorId: string,
  feature: TemporalGeometryFeature,
  mark: TemporalCurrentGroupCheckpoint,
  id: number,
): TemporalCheckDeclaration {
  const observation = feature.observation;
  return {
    id,
    subject:
      observation.origin.kind === 'exposure'
        ? observation.origin.episodeId
        : observation.origin.eventId,
    members: observation.facets.map((facet) => ({
      locator: {
        actorId,
        physicalLife: observation.observer.physicalLife,
        epoch: mark.epoch,
        ordinal: mark.openingOrdinal,
      },
      memberOrdinal: facet.ordinal,
      part: 'value',
      original: contributionFactKey(observation, facet.ordinal),
      role: facet.role,
    })),
    seeds: observation.facets.map((facet, member) => ({
      member,
      part: 'value',
      receivedAt: mark.lastAt,
      order: mark.lastOrder,
      support: {
        original: contributionFactKey(observation, facet.ordinal),
        confirmation: mark.lastSource,
        confirmedFrom: mark.lastTimes.confirmedFrom,
        confirmedThrough: mark.lastTimes.confirmedThrough,
      },
      measuredFrom: facet.measuredFrom,
      measuredThrough: facet.measuredThrough,
      acquiredAt: facet.acquiredAt,
      receivedFrom: contributionFactKey(observation, facet.ordinal).source,
    })),
  };
}
export function captureTemporalGeometry(
  world: WorldState,
  actorId: string,
  feature: TemporalGeometryFeature,
  through: number,
  checked = true,
): boolean {
  const actor = actorHistory(world, actorId)?.actor;
  if (!actor) return false;
  return withTemporalReceivedTransition(world, actorId, () => {
    const observation = feature.observation,
      facet = observation.facets[0];
    if (!facet) return false;
    const source: NativeEvidenceSource = {
      family: 'native-exposure',
      id: observation.id,
      revision: observation.revision,
      observer: observation.observer,
    };
    let mark = feature.recording;
    if (!mark) {
      if (!checked) return false;
      const order = temporalReceivedOrder(world, actorId);
      const started: CurrentFacetTimes = {
        valueMeasuredFrom: facet.measuredFrom,
        valueMeasuredThrough: facet.measuredThrough,
        valueAcquiredAt: facet.acquiredAt,
        confirmedFrom: facet.measuredFrom,
        confirmedThrough: through,
      };
      mark = recordingMark(
        actor,
        world.simTime,
        order,
        started,
        source,
        observation.revision,
        observation.facets.map((member) => [member.value.kind, 'value']),
        acquisitionBatches.get(world)?.get(actorId)?.acquisition,
      );
      const receipt = geometryReceipt(world, actorId, { observation, recording: mark });
      if (!receipt) throw new Error('Current geometry admission has no received value.');
      const charges = reserveOpenReceipt(world, receipt);
      mark.members = mark.members.map((member, at) => ({
        ...member,
        ordinal: observation.facets[at]!.ordinal,
        bytes: charges[at]!,
      }));
      mark.reservedBytes = charges.reduce((total, bytes) => total + bytes, 0);
      if (!admitOpen(world, actor, mark, selectedTemporalPolicy(world).recent)) return false;
      feature.recording = mark;
      return true;
    }
    if (mark.epoch !== actor.epoch)
      throw new Error('Current geometry has a different recording epoch.');
    if (!checked || through <= mark.through) return true;
    const coverage = mark.coverage ?? {
      id: actor.nextOrdinal++,
      memberOrdinals: mark.members.map((member) => member.ordinal),
      measurement: false,
    };
    const ordinal = actor.nextOrdinal++,
      order = temporalReceivedOrder(world, actorId);
    const accepted = appendHistoryOperation(
      world,
      actorId,
      {
        kind: 'check',
        ordinal,
        at: world.simTime,
        order,
        acquisition: acquisitionBatches.get(world)?.get(actorId)?.acquisition ?? ordinal,
        stamps: [
          {
            declaration: coverage.id,
            confirmation: source,
            confirmedFrom: mark.lastTimes.confirmedFrom,
            confirmedThrough: through,
          },
        ],
      },
      selectedTemporalPolicy(world).recent,
      false,
      () => [geometryDeclaration(actorId, feature, mark!, coverage.id)],
    );
    if (!accepted) {
      closeTemporalGeometry(world, actorId, feature, mark.through, 'attention-exit');
      return false;
    }
    feature.recording = {
      ...mark,
      coverage,
      through,
      lastAt: world.simTime,
      lastOrder: order,
      lastTimes: { ...mark.lastTimes, confirmedThrough: through },
    };
    return true;
  });
}
function geometryTerminal(feature: TemporalGeometryFeature): TemporalCheckSeed[] {
  const mark = feature.recording;
  if (!mark) return [];
  return feature.observation.facets.map((facet) => ({
    member: facet.ordinal,
    part: 'value',
    receivedAt: mark.lastAt,
    order: mark.lastOrder,
    support: {
      original: contributionFactKey(feature.observation, facet.ordinal),
      confirmation: mark.lastSource,
      confirmedFrom: mark.lastTimes.confirmedFrom,
      confirmedThrough: mark.lastTimes.confirmedThrough,
    },
    measuredFrom: facet.measuredFrom,
    measuredThrough: facet.measuredThrough,
    acquiredAt: facet.acquiredAt,
    receivedFrom: contributionFactKey(feature.observation, facet.ordinal).source,
  }));
}
export function closeTemporalGeometry(
  world: WorldState,
  actorId: string,
  feature: TemporalGeometryFeature,
  _through: number,
  reason: TemporalReceipt['change'] = 'loss',
): void {
  const actor = world.experience?.temporal?.actors[actorId],
    mark = feature.recording;
  if (!actor || !mark) return;
  const receipt = geometryReceipt(world, actorId, feature);
  if (!receipt) throw new Error('Acquired geometry lost its recording value.');
  const terminal = geometryTerminal(feature);
  if (
    !appendHistoryOperation(
      world,
      actorId,
      {
        kind: 'span',
        ordinal: actor.nextOrdinal++,
        receipt,
        terminal,
        closedAt: world.simTime,
        closedOrder: temporalReceivedOrder(world, actorId),
        reason,
      },
      selectedTemporalPolicy(world).recent,
      true,
      [],
      mark.reservedBytes,
      mark.count,
    )
  )
    throw new Error('Accepted geometry history could not close.');
  delete feature.recording;
}

/** Server-selected cold retirement totals are applied by this same native semantic owner. */
export function retireTemporalPages(
  world: WorldState,
  actorId: string,
  ids: readonly string[],
  totals: { bytes: number; count: number },
  nextDue: number | null,
  releasedThrough?: number,
  frontier?: { pageOrder: number; ordinal: number },
): void {
  touchNativeEvidence(world, 'temporal', actorId);
  const actor = world.experience?.temporal?.actors[actorId];
  if (!actor) return;
  const removed = new Set(ids);
  actor.pages = actor.pages.filter((chunk) => !removed.has(chunk.id));
  actor.bytes = Math.max(0, actor.bytes - totals.bytes);
  actor.count = Math.max(0, actor.count - totals.count);
  actor.nextDue = nextDue;
  if (releasedThrough !== undefined)
    actor.releasedThrough = Math.max(actor.releasedThrough ?? 0, releasedThrough);
  if (
    frontier &&
    (!actor.retiredThrough ||
      frontier.pageOrder > actor.retiredThrough.pageOrder ||
      (frontier.pageOrder === actor.retiredThrough.pageOrder &&
        frontier.ordinal > actor.retiredThrough.ordinal))
  )
    actor.retiredThrough = { ...frontier, at: releasedThrough ?? world.simTime };
  // Cursors belong to current received groups. An unrelated old chunk's removal
  // changes neither those memberships nor the current geometry acquisition.
  // The next chunk declares its own exact membership when an actual check arrives.
  actor.maintenanceDue = false;
}

/** Only a rewritten native declaration can invalidate its current group's
 * recorder cursor. Missing cold chunks remain hints, never evidence authority. */
type TemporalAvailabilityState = Omit<TemporalCheckpointAvailability, 'fields'>;
export function temporalAvailability(
  change: TemporalReceipt['change'],
  at: number,
): TemporalAvailabilityState | undefined {
  return change === 'loss'
    ? { reason: 'unavailable', at }
    : change === 'unchecked'
      ? { reason: 'unchecked', at }
      : change === 'attention-exit'
        ? { reason: 'released', at }
        : undefined;
}
/** Availability belongs to the selected field, including a remembered snapshot
 * whose body, pose or wording had independent support coverage. */
export function temporalFieldAvailability(
  receipt: {
    change?: TemporalReceipt['change'];
    at: number;
    availabilityAt?: number;
    availability?: readonly TemporalCheckpointAvailability[];
  },
  ordinal: number,
): TemporalAvailabilityState | undefined {
  return (
    receipt.availability?.find((group) => group.fields.includes(ordinal)) ??
    (receipt.change
      ? temporalAvailability(receipt.change, receipt.availabilityAt ?? receipt.at)
      : undefined)
  );
}
export function groupedTemporalAvailability(
  values: readonly (TemporalAvailabilityState | undefined)[],
): TemporalCheckpointAvailability[] {
  const groups = new Map<string, TemporalCheckpointAvailability>();
  values.forEach((value, ordinal) => {
    if (!value) return;
    const key = JSON.stringify([value.reason, value.at]);
    let group = groups.get(key);
    if (!group) groups.set(key, (group = { ...value, fields: [] }));
    group.fields.push(ordinal);
  });
  return [...groups.values()];
}
/** Retire exact outer operations without rewriting surviving observations. */
export function retireTemporalOperations(
  world: WorldState,
  actorId: string,
  pageId: string,
  ordinals: ReadonlySet<number>,
  nextDue: number | null,
): void {
  const actor = world.experience?.temporal?.actors[actorId],
    page = actor?.pages.find((page) => page.id === pageId);
  if (!actor || !page || !ordinals.size) return;
  const removed = page.operations.filter((op) => ordinals.has(op.ordinal));
  if (!removed.length) return;
  touchNativeEvidence(world, 'temporal', actorId);
  const oldBytes = page.bytes,
    oldCount = page.count;
  page.operations = page.operations.filter((op) => !ordinals.has(op.ordinal));
  const used = new Set(
    page.operations.flatMap((op) =>
      op.kind === 'check' ? op.stamps.map((stamp) => stamp.declaration) : [],
    ),
  );
  page.declarations = page.declarations.filter((declaration) => used.has(declaration.id));
  markTemporalPageEdited(page);
  if (page.operations.length) refreshTemporalPage(page, world);
  else {
    actor.pages = actor.pages.filter((candidate) => candidate.id !== page.id);
    page.bytes = 0;
    page.count = 0;
  }
  actor.bytes -= oldBytes - page.bytes;
  actor.count -= oldCount - page.count;
  actor.releasedThrough = Math.max(
    actor.releasedThrough ?? 0,
    ...removed.map((op) =>
      op.kind === 'span' ? op.closedAt : op.kind === 'check' ? op.at : op.receipt.at,
    ),
  );
  const ordinal = Math.max(...removed.map((op) => op.ordinal));
  if (
    !actor.retiredThrough ||
    page.order > actor.retiredThrough.pageOrder ||
    (page.order === actor.retiredThrough.pageOrder && ordinal > actor.retiredThrough.ordinal)
  )
    actor.retiredThrough = { pageOrder: page.order, ordinal, at: actor.releasedThrough };
  actor.nextDue = nextDue;
  const policy = selectedTemporalPolicy(world).recent;
  actor.maintenanceDue =
    actor.bytes > policy.maxBytes ||
    actor.count > policy.maxChanges ||
    (nextDue !== null && nextDue <= world.simTime);
}

export interface TemporalHistorySelection {
  baselines?: Array<{
    checkpoint: TemporalCheckpoint;
    values: TemporalValue[];
    forReceipt: TemporalReceiptLocator;
    availableAt: number;
    origins: Array<{
      kind: 'checkpoint' | 'receipt';
      ordinal: number;
      facetOrdinal: number;
      availability?: { kind: 'checkpoint' | 'receipt'; ordinal: number; facetOrdinal: number };
    }>;
  }>;
  examinedBefore?: { epoch: string; ordinal: number; at: number; order: number };
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
  before?: { epoch: string; ordinal: number; at: number; order: number };
  cut?: TemporalReceiptPrefix;
  /** Support time differs from the later receipt that confirms a held interval. */
  measurements?: { from: number; through: number };
  kinds?: readonly TemporalValue['kind'][];
  includeGeometry?: boolean;
  limit?: number;
  /** Complete field/checkpoint examination, independent from result pagination. */
  operations?: number;
  bytes?: number;
}

export interface TemporalReceiptPrefix {
  physicalLife: number;
  epoch: string | null;
  throughOrdinal: number;
  throughOrder: number;
}
/** The currently open stream's exact append prefix; earlier sealed streams have
 * no further writers. Allocation order also excludes later same-time streams. */
export function captureTemporalReceiptPrefix(
  world: WorldState,
  actorId: string,
): TemporalReceiptPrefix {
  const actor = world.experience?.temporal?.actors[actorId];
  return {
    physicalLife:
      actor?.physicalLife ?? entityGet(world.entities, actorId)?.actor?.physicalLife ?? 0,
    epoch: actor?.epoch ?? null,
    throughOrdinal: (actor?.nextOrdinal ?? 0) - 1,
    throughOrder: world.nextId,
  };
}
export function temporalReceiptWithinPrefix(
  receipt: TemporalReceipt,
  cut: TemporalReceiptPrefix,
): boolean {
  return (
    cut.epoch !== null &&
    receipt.order <= cut.throughOrder &&
    (receipt.physicalLife !== cut.physicalLife ||
      receipt.epoch !== cut.epoch ||
      receipt.ordinal <= cut.throughOrdinal)
  );
}
/** Select this actor's retained chunks and exact blocks. The supplied world's
 * installed evidence owner also classifies aliases when detail is narrowed. */
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
      open: currentTemporalOpenIntervals(
        world,
        actorId,
        query.subjects
          ? new Set(query.subjects)
          : query.subject
            ? new Set([query.subject])
            : undefined,
        query.includeGeometry,
      ),
      releasedThrough: actor.releasedThrough,
      retiredThrough: actor.retiredThrough,
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
function logicalMemberKey(locator: TemporalReceiptLocator, member: number): string {
  return JSON.stringify([
    locator.actorId,
    locator.physicalLife,
    locator.epoch,
    locator.ordinal,
    member,
  ]);
}
/** Selected intervals are self-contained. Checks amend clocks, never replay values. */
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
    through = Math.min(query.through ?? Infinity, context.at ?? Infinity);
  const subjects = query.subjects ?? (query.subject ? [query.subject] : []),
    limit = query.limit ?? 128,
    maxBytes = query.bytes ?? 8192,
    maxWork = query.operations ?? context.maximumOperations ?? limit,
    maxCandidates = context.maximumCandidates ?? maxWork * 4;
  let work = 0,
    candidates = 0,
    bytes = 0,
    hasMore = false,
    incomplete =
      (context.releasedThrough !== undefined && from <= context.releasedThrough) ||
      (context.recordingGap !== undefined && through >= context.recordingGap.from);
  const selected: Array<{
    receipt: TemporalReceipt;
    closedOrder: number;
    closedAt: number;
    reason?: TemporalReceipt['change'];
  }> = [];
  const add = (
    receipt: TemporalReceipt,
    closedAt: number,
    closedOrder: number,
    reason?: TemporalReceipt['change'],
  ) => {
    if (
      temporalReadSourceRevoked(context.disclosure, context.actorId, receipt.id) ||
      receipt.actorId !== context.actorId ||
      (query.physicalLife !== undefined && receipt.physicalLife !== query.physicalLife) ||
      (query.epoch && receipt.epoch !== query.epoch) ||
      receipt.at > through ||
      closedAt < from ||
      (query.cut && !temporalReceiptWithinPrefix(receipt, query.cut)) ||
      (subjects.length &&
        !subjects.includes(receipt.subject) &&
        !receipt.contextSubjects?.some((subject) => subjects.includes(subject)) &&
        !(query.includeGeometry && receipt.spatialContext))
    )
      return;
    if (
      query.before &&
      (receipt.at > query.before.at ||
        (receipt.at === query.before.at &&
          (receipt.order > query.before.order ||
            (receipt.order === query.before.order && receipt.ordinal >= query.before.ordinal))))
    )
      return;
    selected.push({ receipt, closedAt, closedOrder, ...(reason ? { reason } : {}) });
  };
  for (const interval of context.open ?? []) {
    if (++candidates > maxCandidates) {
      incomplete = true;
      hasMore = true;
      break;
    }
    add(interval.receipt, Infinity, Infinity);
  }
  receiptPages: for (const page of [...context.pages].sort(
    (a, b) => b.throughAt - a.throughAt || b.order - a.order,
  )) {
    if (
      page.actorId !== context.actorId ||
      page.fromAt > through ||
      (subjects.length &&
        !query.includeGeometry &&
        !page.subjects.some((subject) => subjects.includes(subject)))
    )
      continue;
    const operations = temporalPageOperations(page);
    for (let index = operations.length - 1; index >= 0; index--) {
      if (++candidates > maxCandidates) {
        incomplete = true;
        hasMore = true;
        break receiptPages;
      }
      const op = operations[index]!;
      if (op.kind !== 'check')
        add(
          op.receipt,
          op.kind === 'span' ? op.closedAt : op.receipt.at,
          op.kind === 'span' ? op.closedOrder : op.receipt.order + 1,
          op.kind === 'span' ? op.reason : undefined,
        );
    }
  }
  selected.sort(
    (a, b) =>
      b.receipt.at - a.receipt.at ||
      b.receipt.order - a.receipt.order ||
      b.receipt.ordinal - a.receipt.ordinal,
  );
  const clocks = new Map<string, { at: number; order: number; field: TemporalFacetReference }>();
  const desired = new Map<
    string,
    {
      receipt: TemporalReceipt;
      field: TemporalFacetReference;
      closedOrder: number;
      closedAt: number;
    }
  >();
  const chosenReceipts = new Set<string>();
  let preparationWork = 0;
  // Choose the output prefix before resolving clocks. An ordinary broad scene
  // must return a useful bounded prefix instead of spending its whole allowance
  // preparing clocks for fields it can never emit.
  for (const item of selected) {
    const receiptKey = JSON.stringify([
      item.receipt.physicalLife,
      item.receipt.epoch,
      item.receipt.ordinal,
    ]);
    if (!chosenReceipts.has(receiptKey)) {
      if (chosenReceipts.size >= limit || preparationWork >= maxWork) {
        incomplete = true;
        hasMore = true;
        break;
      }
      chosenReceipts.add(receiptKey);
      preparationWork++;
    }
    for (const field of item.receipt.facets) {
      const key = logicalMemberKey(item.receipt, field.ordinal);
      if (desired.has(key)) continue;
      if (preparationWork >= maxWork) {
        incomplete = true;
        hasMore = true;
        break;
      }
      preparationWork++;
      desired.set(key, {
        receipt: item.receipt,
        field,
        closedOrder: item.closedOrder,
        closedAt: item.closedAt,
      });
    }
  }
  const acceptSeed = (key: string, seed: TemporalCheckSeed) => {
    const target = desired.get(key);
    if (
      !target ||
      seed.receivedAt > through ||
      seed.order >= target.closedOrder ||
      (query.cut && seed.order > query.cut.throughOrder)
    )
      return;
    const previous = clocks.get(key);
    if (
      !previous ||
      previous.at < seed.receivedAt ||
      (previous.at === seed.receivedAt && previous.order < seed.order)
    )
      clocks.set(key, {
        at: seed.receivedAt,
        order: seed.order,
        field: temporalSeedFacet(target.field, seed),
      });
  };
  for (const interval of context.open ?? [])
    for (const seed of interval.terminal)
      acceptSeed(logicalMemberKey(interval.receipt, seed.member), seed);
  type CheckAt = {
    at: number;
    order: number;
    stamp: import('./temporal-frames.js').TemporalCheckStamp;
  };
  const checks = new Map<
    string,
    { declaration: TemporalCheckDeclaration; support?: CheckAt; measurement?: CheckAt }
  >();
  const pages = [...context.pages].sort((a, b) => b.throughAt - a.throughAt || b.order - a.order);
  clockPages: for (const page of pages) {
    for (const declaration of page.declarations) {
      const key = JSON.stringify([page.physicalLife, page.epoch, declaration.id]);
      let needed = false;
      for (const seed of declaration.seeds) {
        if (++candidates > maxCandidates) {
          incomplete = true;
          hasMore = true;
          break clockPages;
        }
        const member = declaration.members[seed.member];
        if (!member) continue;
        const memberKey = logicalMemberKey(member.locator, member.memberOrdinal);
        if (!desired.has(memberKey)) continue;
        needed = true;
        acceptSeed(memberKey, seed);
      }
      if (needed && !checks.has(key)) checks.set(key, { declaration });
    }
    for (let index = page.operations.length - 1; index >= 0; index--) {
      const operation = page.operations[index]!;
      if (++candidates > maxCandidates) {
        incomplete = true;
        hasMore = true;
        break clockPages;
      }
      if (operation.kind === 'span') {
        for (const seed of operation.terminal)
          acceptSeed(logicalMemberKey(operation.receipt, seed.member), seed);
        continue;
      }
      if (
        operation.kind !== 'check' ||
        operation.at > through ||
        (query.cut &&
          (operation.order > query.cut.throughOrder ||
            (page.epoch === query.cut.epoch && operation.ordinal > query.cut.throughOrdinal)))
      )
        continue;
      for (const stamp of operation.stamps) {
        const held = checks.get(JSON.stringify([page.physicalLife, page.epoch, stamp.declaration]));
        if (!held) continue;
        const newer = (prior: CheckAt | undefined) =>
          !prior ||
          operation.at > prior.at ||
          (operation.at === prior.at && operation.order > prior.order);
        if (newer(held.support)) held.support = { at: operation.at, order: operation.order, stamp };
        if (stamp.measurement && newer(held.measurement))
          held.measurement = { at: operation.at, order: operation.order, stamp };
      }
    }
  }
  for (const held of checks.values()) {
    const latest = held.support;
    if (!latest) continue;
    for (const member of held.declaration.members) {
      const key = logicalMemberKey(member.locator, member.memberOrdinal),
        target = desired.get(key);
      if (!target || latest.order < target.receipt.order || latest.order >= target.closedOrder)
        continue;
      const prior = clocks.get(key);
      if (
        prior &&
        (prior.at > latest.at || (prior.at === latest.at && prior.order >= latest.order))
      )
        continue;
      const measurement =
        held.measurement && (!prior || held.measurement.order > prior.order)
          ? held.measurement.stamp.measurement
          : undefined;
      const { measurement: _oldMeasurement, ...support } = latest.stamp;
      const field = temporalCheckedFacet(prior?.field ?? target.field, member, undefined, {
        ...support,
        ...(measurement ? { measurement } : {}),
      });
      clocks.set(key, { at: latest.at, order: latest.order, field });
    }
  }
  const entries: TemporalHistorySelection['entries'] = [];
  let examinedBefore: TemporalHistorySelection['examinedBefore'];
  const emitted = new Set<string>(),
    groupedFields = new Map<string, Map<number, TemporalFacetReference>>();
  for (const item of selected) {
    const key = JSON.stringify([
      item.receipt.physicalLife,
      item.receipt.epoch,
      item.receipt.ordinal,
    ]);
    let fields = groupedFields.get(key);
    if (!fields) groupedFields.set(key, (fields = new Map()));
    for (const field of item.receipt.facets)
      if (desired.has(logicalMemberKey(item.receipt, field.ordinal)))
        fields.set(field.ordinal, field);
  }
  for (const item of selected) {
    const identity = JSON.stringify([
      item.receipt.physicalLife,
      item.receipt.epoch,
      item.receipt.ordinal,
    ]);
    if (emitted.has(identity)) continue;
    emitted.add(identity);
    if (!chosenReceipts.has(identity)) continue;
    if (entries.length >= limit) {
      incomplete = true;
      hasMore = true;
      break;
    }
    const facets: TemporalFacetReference[] = [],
      values: TemporalValue[] = [];
    for (const original of groupedFields.get(identity)!.values()) {
      if (++work > maxWork) {
        incomplete = true;
        hasMore = true;
        break;
      }
      const key = logicalMemberKey(item.receipt, original.ordinal),
        clock = clocks.get(key),
        target = desired.get(key);
      if (item.receipt.at < from && target?.closedAt === Infinity && (!clock || clock.at < from))
        continue;
      const field = clock?.field ?? original;
      if (query.measurements) {
        const overlaps = (start: number, end: number) =>
          start <= query.measurements!.through && end >= query.measurements!.from;
        if (
          !overlaps(
            field.measuredFrom,
            field.support?.confirmedThrough ?? field.confirmedThrough ?? field.measuredThrough,
          ) &&
          !(
            field.detailSupport &&
            overlaps(field.detailSupport.from, field.detailSupport.proof.confirmedThrough)
          )
        )
          continue;
      }
      const fragment = receivedValueAt(context.sources, field),
        value = fragment && materializeTemporalValue(field, fragment, context.sources);
      if (!value) {
        incomplete = true;
        continue;
      }
      if (query.kinds && !query.kinds.includes(value.kind)) continue;
      if (!temporalFacetEligible(context.disclosure, context.actorId, field, value)) {
        incomplete = true;
        continue;
      }
      facets.push(field);
      values.push(value);
    }
    if (work > maxWork) break;
    if (!facets.length) continue;
    const receipt = temporalReceiptForRead(
        selectTemporalReceiptFacets(item.receipt, facets, context.sources, context.disclosure),
      ),
      size = byteLength({ receipt, values });
    if (bytes + size > maxBytes) {
      incomplete = true;
      hasMore = true;
      if (size <= maxBytes) break;
      continue;
    }
    bytes += size;
    entries.push({ receipt: cloneValue(receipt), values: cloneValue(values) });
    examinedBefore = {
      epoch: receipt.epoch,
      ordinal: receipt.ordinal,
      at: receipt.at,
      order: receipt.order,
    };
  }
  const supportedThrough = new Map<string, number>();
  for (const item of selected) {
    supportedThrough.set(
      item.receipt.subject,
      Math.max(supportedThrough.get(item.receipt.subject) ?? -Infinity, item.closedAt),
    );
    if (
      item.closedAt >= from &&
      item.closedAt <= through &&
      item.reason &&
      ['loss', 'unchecked', 'attention-exit'].includes(item.reason)
    )
      incomplete = true;
  }
  if ([...supportedThrough.values()].some((at) => at < through)) incomplete = true;
  entries.reverse();
  return {
    entries,
    incomplete,
    ...(hasMore ? { hasMore } : {}),
    ...(examinedBefore ? { examinedBefore } : {}),
  };
}

/** Revocation removes this actor's access; a shared body may remain owned by other witnesses. */
export function invalidateTemporalEvidence(
  world: WorldState,
  actorId: string,
  sourceIds: ReadonlySet<string>,
): ReadonlySet<string> {
  touchNativeEvidence(world, 'temporal', actorId);
  const released = new Set<string>();
  const actor = world.experience?.temporal?.actors[actorId];
  if (!actor) return released;
  for (const [id, support] of Object.entries(actor.supports ?? {}))
    if (
      sourceIds.has(id) ||
      temporalSupportAliases(support, world).some((source) => sourceIds.has(source))
    ) {
      releaseTemporalSupport(world, actorId, id);
      released.add(id);
    }
  for (const chunk of actor.pages) {
    const removed = temporalPageReceipts(chunk).filter(
      (receipt) =>
        sourceIds.has(receipt.id) ||
        (receipt.sourceIds.some((id) => sourceIds.has(id)) &&
          temporalReceiptAccountAliases(receipt, world.receivedValues?.sources ?? {}, world).some(
            (id) => sourceIds.has(id),
          )),
    );
    if (!removed.length) continue;
    selectedRequestRecentIndividualRepair(world, actorId, chunk.order, chunk.individualIds);
    actor.releasedThrough = Math.max(
      actor.releasedThrough ?? 0,
      ...removed.map((receipt) => receipt.at),
    );
    const previousCount = chunk.count;
    const deleted = new Set(removed.map((receipt) => receipt.ordinal));
    replaceTemporalPageReceipts(
      chunk,
      temporalPageReceipts(chunk).filter((receipt) => !deleted.has(receipt.ordinal)),
      world,
    );
    // Exact stored byte totals are recomputed only for touched resident chunks; cold rows use repository retirement.
    const previousBytes = chunk.bytes;
    refreshTemporalPage(chunk, world);
    actor.count -= previousCount - chunk.count;
    actor.bytes -= previousBytes - chunk.bytes;
  }
  actor.pages = actor.pages.filter((chunk) => chunk.count > 0);
  const sources = readOnlyDraftView(world.receivedValues?.sources ?? {});
  // A surviving receipt can contain an independently received fact beside a
  // route whose earlier proof was revoked. Remove that facet, not its siblings.
  invalidateTemporalFacets(world, actorId, (_value, reference, receipt) =>
    temporalReceiptAliases({ ...receipt, sourceIds: [], facets: [reference] }, sources, world).some(
      (id) => sourceIds.has(id),
    ),
  );
  return released;
}

function refreshTemporalPage(chunk: TemporalPage, world: WorldState): void {
  const metadata = temporalPageMetadata(chunk, {
    sources: world.receivedValues?.sources ?? {},
    world,
  });
  chunk.subjects = metadata.subjects;
  chunk.sourceIds = metadata.sourceIds;
  chunk.individualIds = metadata.individualIds;
  chunk.sourceRefs = metadata.sourceRefs;
  chunk.count = metadata.changes;
  if (!chunk.count) {
    // The caller removes this chunk; no stored header remains to charge.
    chunk.bytes = 0;
    return;
  }
  chunk.fromOrdinal = chunk.operations[0]!.ordinal;
  chunk.throughOrdinal = chunk.operations.at(-1)!.ordinal;
  chunk.fromAt = metadata.firstAt!;
  chunk.throughAt = metadata.lastAt!;
  initialBytes(chunk, () => temporalPageLogicalBytes(chunk, world.receivedValues?.sources ?? {}));
}

type TemporalFieldOwner = {
  facets: readonly TemporalFieldDependencies[];
  sourceIds: readonly string[];
} & Partial<Pick<TemporalReceipt, 'id' | 'receiverFrame'>>;
function revokeTemporalFields(
  world: WorldState,
  owner: Omit<TemporalFieldOwner, 'facets'> & { facets: TemporalFacetReference[] },
  revoked: (
    value: TemporalValue,
    reference: TemporalFieldDependencies,
    owner: TemporalFieldOwner,
  ) => boolean,
): { facets: TemporalFacetReference[]; changed: boolean } {
  let changed = false;
  const facets = owner.facets.flatMap((reference): TemporalFacetReference[] => {
    const fragment = retainedValueAt(world.receivedValues?.sources ?? {}, reference),
      value =
        fragment &&
        materializeTemporalValue(reference, fragment, world.receivedValues?.sources ?? {});
    if (!value || !revoked(value, reference, owner)) return [reference];
    changed = true;
    const frame = reference.poseFrame ?? owner.receiverFrame,
      reception = reference.reception;
    if (
      value.kind === 'body' &&
      reference.detailSupport &&
      frame &&
      reception?.kind === 'body' &&
      reception.poseRef
    ) {
      const { detailSupport: _detail, poseFrame: _pose, ...rest } = reference;
      const point: TemporalFacetReference = {
        ...rest,
        valueRef: reception.poseRef,
        reception: { kind: 'location', frame },
      };
      const sample: TemporalValue = {
        kind: 'location',
        location: { kind: 'point', point: value.body.position, errorRadius: 0 },
        frame,
      };
      if (!revoked(sample, point, owner)) return [point];
    }
    return [];
  });
  return { facets, changed };
}

/** Withdraw only recorded history. Current sensing/targeting remains its own grant. */
function revokeOpenTemporalFields(
  world: WorldState,
  actorId: string,
  revoked: (
    value: TemporalValue,
    reference: TemporalFieldDependencies,
    owner: TemporalFieldOwner,
  ) => boolean,
): void {
  const actor = world.experience?.temporal?.actors[actorId],
    owner = world.perceptionEvidence?.[actorId];
  if (!actor || !owner) return;
  const updates: Parameters<typeof currentGroupsSetRecording>[1][number][] = [];
  for (const [subjectId, contact] of currentContactEntries(owner))
    for (const group of contact.content.groups)
      for (const partition of group.metadata) {
        const mark = partition.recording;
        if (!mark) continue;
        const receipt = currentGroupReceipt(world, actorId, subjectId, group, partition);
        if (!receipt) throw new Error('Open history has no current received owner.');
        const removed = new Set<number>();
        for (const reference of receipt.facets) {
          const fragment = receivedValueAt(world.receivedValues?.sources ?? {}, reference),
            value =
              fragment &&
              materializeTemporalValue(reference, fragment, world.receivedValues?.sources ?? {});
          if (value && revoked(value, reference, receipt)) removed.add(reference.ordinal);
        }
        if (!removed.size) continue;
        const members = mark.members.filter((member) => removed.has(member.ordinal));
        actor.bytes -= members.reduce((sum, member) => sum + member.bytes, 0);
        actor.count -= members.length;
        updates.push({
          subjectId,
          fields: group.received.fields,
          members: members.map((member) => [member.kind, member.part] as const),
          recording: undefined,
        });
      }
  if (updates.length) {
    touchNativeEvidence(world, 'perception', actorId);
    currentGroupsSetRecording(owner, updates);
  }
  const geometry = owner.geometry;
  if (geometry)
    for (const feature of [...geometry.fragments, ...geometry.boundaries]) {
      const mark = feature.recording;
      if (!mark) continue;
      const receipt = geometryReceipt(world, actorId, feature);
      if (!receipt) continue;
      const remove = receipt.facets.some((reference) => {
        const fragment = receivedValueAt(world.receivedValues?.sources ?? {}, reference),
          value =
            fragment &&
            materializeTemporalValue(reference, fragment, world.receivedValues?.sources ?? {});
        return !!value && revoked(value, reference, receipt);
      });
      if (remove) {
        touchNativeEvidence(world, 'perception', actorId);
        actor.bytes -= mark.reservedBytes;
        actor.count -= mark.count;
        delete feature.recording;
      }
    }
}

/** Remove a revoked interpretation while preserving independent direct words and measurements. */
export function invalidateTemporalFacets(
  world: WorldState,
  actorId: string,
  revoked: (
    value: TemporalValue,
    reference: TemporalFieldDependencies,
    receipt: TemporalFieldOwner,
  ) => boolean,
): void {
  touchNativeEvidence(world, 'temporal', actorId);
  const temporal = world.experience?.temporal;
  const actor = temporal?.actors[actorId];
  if (!temporal || !actor) return;
  revokeOpenTemporalFields(world, actorId, revoked);
  for (const chunk of actor.pages) {
    const previousBytes = chunk.bytes,
      previousCount = chunk.count;
    let changed = false;
    const retained: TemporalReceipt[] = [];
    for (const stored of readOnlyDraftView(temporalPageReceipts(chunk))) {
      const receipt = readOnlyDraftView(stored);
      const selection = revokeTemporalFields(world, receipt, revoked),
        facets = selection.facets;
      const receiptChanged = selection.changed;
      changed ||= receiptChanged;
      if (receiptChanged) {
        actor.releasedThrough = Math.max(actor.releasedThrough ?? 0, receipt.at);
        if (facets.length)
          retained.push(
            immutableDataSnapshot(
              selectTemporalReceiptFacets(
                receipt,
                facets,
                world.receivedValues?.sources ?? {},
                world,
              ),
              readOnlyDraftView,
            ),
          );
      } else {
        retained.push(receipt);
      }
    }
    if (!changed) continue;
    selectedRequestRecentIndividualRepair(world, actorId, chunk.order, chunk.individualIds);
    replaceTemporalPageReceipts(chunk, retained, world);
    refreshTemporalPage(chunk, world);
    actor.bytes -= previousBytes - chunk.bytes;
    actor.count -= previousCount - chunk.count;
  }
  actor.pages = actor.pages.filter((chunk) => chunk.count > 0);
}

export function temporalSourceIds(receipt: TemporalReceipt): EvidenceSource[] {
  return receipt.facets.flatMap((facet) => (facet.original ? [facet.original.source] : []));
}

export type TemporalFieldDependencies = Pick<
  TemporalFacetReference,
  'valueRef' | 'reception' | 'original' | 'receivedFrom' | 'support' | 'detailSupport'
> & { ordinal?: number };
/** Value-owned provenance is shared by expanded reads and compact metadata reads. */
export function temporalValueDependencyAliases(
  value: TemporalValue,
  world: TemporalReadSource,
): string[] {
  const aliases = new Set<string>();
  if (value.kind === 'association')
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
  world: TemporalReadSource,
  selectedFragments?: readonly TemporalFragment[],
): string[] {
  const aliases = new Set([...receipt.sourceIds, ...(receipt.id ? [receipt.id] : [])]);
  const fact = (key: ObservationFactKey) => {
    aliases.add(key.source.id);
    aliases.add(personalFactAlias(key.source.id, key.ordinal));
  };
  for (let index = 0; index < receipt.facets.length; index++) {
    const reference = receipt.facets[index]!;
    if (receipt.id && reference.ordinal !== undefined)
      aliases.add(personalFactAlias(receipt.id, reference.ordinal));
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
  for (const interval of currentTemporalOpenIntervals(world, actorId)) add(interval.receipt);
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
  const selected = new Set(facets.map((field) => field.ordinal));
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
          ordinal: receipt.ordinal,
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
  const includes = (owner: {
    facets: readonly TemporalFieldDependencies[];
    sourceIds: readonly string[];
    id?: string;
  }) => temporalReceiptAliases(owner, sources, world).includes(sourceId);
  for (const { receipt } of currentTemporalOpenIntervals(world, actorId))
    if (receipt.id === sourceId || includes(receipt)) return true;
  for (const chunk of actor.pages) {
    if (chunk.throughAt <= cutoff || !chunk.sourceIds.includes(sourceId)) continue;
    const actual = temporalPageReceipts(chunk).filter((receipt) =>
      temporalRecentAt(
        receipt.at,
        world.simTime,
        selectedTemporalPolicy(world).recent.maxAgeSeconds,
      ),
    );
    if (actual.some(includes)) return true;
    for (const op of temporalPageOperations(chunk))
      if (op.kind === 'check' && op.at > cutoff)
        for (const stamp of op.stamps)
          if (
            stamp.confirmation.id === sourceId ||
            chunk.declarations
              .find((d) => d.id === stamp.declaration)
              ?.members.some((member) => member.original.source.id === sourceId)
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

function sameReceiptAddress(receipt: TemporalReceipt, locator: TemporalReceiptLocator): boolean {
  return (
    receipt.actorId === locator.actorId &&
    receipt.physicalLife === locator.physicalLife &&
    receipt.epoch === locator.epoch &&
    receipt.ordinal === locator.ordinal
  );
}
function nativeTemporalReceipt(
  world: WorldState,
  locator: TemporalReceiptLocator,
): { receipt: TemporalReceipt; receivedAt: number } | undefined {
  const actor = world.experience?.temporal?.actors[locator.actorId];
  if (!actor) return;
  let receipt: TemporalReceipt | undefined,
    terminal: readonly TemporalCheckSeed[] = [],
    receivedAt = 0;
  const open = currentTemporalOpenIntervals(world, locator.actorId).find((interval) =>
    sameReceiptAddress(interval.receipt, locator),
  );
  if (open) {
    receipt = open.receipt;
    terminal = open.terminal;
  } else
    for (const page of actor.pages) {
      if (page.physicalLife !== locator.physicalLife || page.epoch !== locator.epoch) continue;
      const operation = page.operations.find(
        (operation) => operation.kind !== 'check' && sameReceiptAddress(operation.receipt, locator),
      );
      if (operation && operation.kind !== 'check') {
        receipt = operation.receipt;
        terminal = operation.kind === 'span' ? operation.terminal : [];
        break;
      }
    }
  if (!receipt) return;
  receivedAt = Math.max(receipt.at, ...terminal.map((seed) => seed.receivedAt));
  return {
    receipt: {
      ...receipt,
      facets: receipt.facets.map((field) => {
        const seed = terminal.find((seed) => seed.member === field.ordinal);
        return seed ? temporalSeedFacet(field, seed) : field;
      }),
    },
    receivedAt,
  };
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
export function isTemporalReceiptSource(source: EvidenceSource): boolean {
  return (
    source.family === 'native-exposure' &&
    source.revision === 1 &&
    /^temporal-receipt-.+-receipt-epoch-\d+-\d+$/u.test(source.id)
  );
}

export function retainTemporalSupport(
  world: WorldState,
  locator: TemporalReceiptLocator,
  options: {
    facetOrdinals?: readonly number[];
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
    ((prior.receipt.change === 'retained-state' && !options.facetOrdinals) ||
      options.facetOrdinals?.every((ordinal) =>
        prior.receipt.facets.some((facet) => facet.ordinal === ordinal),
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
    options.facetOrdinals &&
    new Set([
      ...options.facetOrdinals,
      ...(prior?.receipt.facets.map((facet) => facet.ordinal) ?? []),
    ]);
  if (
    options.facetOrdinals?.some(
      (ordinal) => !receipt.facets.some((facet) => facet.ordinal === ordinal),
    )
  )
    return;
  const facets = receipt.facets.filter((facet) => !selected || selected.has(facet.ordinal));
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
              personalFactAlias(receipt.id, facet.ordinal),
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
  const ordinal = actor.nextOrdinal++,
    values: TemporalFragment[] = [];
  const facets: TemporalFacetReference[] = input.facets.map((field, ordinal) => {
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
        ordinal,
        ...(projection.reception ? { reception: projection.reception } : {}),
      },
      world.receivedValues?.sources ?? {},
    );
  });
  const receipt: TemporalReceipt = {
    actorId,
    physicalLife: actor.physicalLife,
    epoch: actor.epoch,
    ordinal,
    id: temporalReceiptId({ epoch: actor.epoch, ordinal }),
    at: world.simTime,
    order: temporalReceivedOrder(world, actorId),
    acquisition: ordinal,
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
    anchor.at !== baseline.availableAt ||
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
  const ordinal = actor.nextOrdinal,
    id = temporalReceiptId({ epoch: actor.epoch, ordinal });
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
    ordinal,
    acquisition: ordinal,
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
        baseline.checkpoint.pageId,
        baseline.checkpoint.ordinal,
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
  if (admitted) actor.nextOrdinal++;
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
