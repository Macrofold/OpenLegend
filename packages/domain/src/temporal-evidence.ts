import {
  receivedTrackKey,
  currentFacetObserver,
  currentGroupFacetRecord,
  currentGroupsSetRecording,
  currentFacetProof,
  currentFacetSupport,
  currentContactEntries,
} from './perception-current.js';
import {
  appendTemporalFrameReceipt,
  prepareTemporalFrameReceipt,
  temporalChunkReceipts,
  temporalChunkOperations,
  temporalChunkCheckpointOperations,
  temporalOperationHeader,
  temporalCheckpointHeader,
  temporalOperationFacet,
  temporalChunkReceipt,
  temporalReceiptValues,
  type TemporalWriteHeader,
  temporalChunkReferences,
  replaceTemporalChunkReceipts,
  type TemporalFrameEntry,
  type TemporalCheckpointFields,
  type TemporalCheckpointBuilder,
  type TemporalCheckpoint,
  type TemporalCheckpointDraft,
  type TemporalCheckpointAvailability,
  type TemporalConfirmation,
  temporalConfirmationPositions,
  temporalCheckGroupMembership,
  temporalCurrentMembershipPresent,
  type TemporalCheckGroup,
  temporalEntryCheckpoints,
  temporalEntryConfirmations,
  visitTemporalConfirmations,
  temporalChunkConfirmationOperations,
  temporalConfirmationHeader,
  temporalConfirmationSubject,
  temporalConfirmationField,
  temporalEntryMetadataReader,
  temporalCheckpointForRead,
} from './temporal-frames.js';
import {
  temporalRecognitionSupportSourceIds,
  temporalReadSourceRevoked,
  captureTemporalReadContext,
  type CapturedTemporalHistoryContext,
  type TemporalReadSource,
} from './temporal-read-context.js';
import { nextId } from './data.js';
import { currentReceivedGeometry } from './received-geometry.js';
import {
  retainReceivedValue,
  sameReceivedValueReference,
  type ReceivedValueReference,
  receivedValueAt,
  type ReceivedValueState,
  type ReceivedValueLookup,
  type ReceivedValueFragment,
} from './received-values.js';
import { cloneValue, readOnlyDraftView, touchNativeEvidence, appendSnapshot } from './draft.js';
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
import { immutableDataSnapshot, jsonEncoding, jsonText } from './records.js';
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
  currentFacetConfirmation,
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
export interface TemporalChunk {
  id: string;
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
  entries: TemporalFrameEntry[];
  nextEntryOrdinal: number;
}
/** Native current-group recording cursor, never another value or permission store. */
export interface TemporalCurrentGroupCheckpoint {
  epoch: string;
  chunkId: string;
  entryOrdinal: number;
  count: number;
  through: number;
  revision: number;
}
export interface TemporalCurrentGroupInput {
  subjectId: string;
  group: CurrentReceivedGroup;
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
  chunks: TemporalChunk[];
  bytes: number;
  count: number;
  nextDue: number | null;
  maintenanceDue: boolean;
  /** Conservative unavailable-prefix coverage, not a ledger of fictional sensory losses. */
  releasedThrough?: number;
  /** Exact logical prefix frontier; physical rows may be collected later. */
  retiredThrough?: { chunkOrder: number; ordinal: number; at: number };
  /** Finite exceptional sparse-edit work, coalesced by the existing retention owner. */
  individualRepairs?: string[];
  /** Last recorded support of an actual current geometry acquisition. This is
   * bookkeeping only; its source retains the typed value and original times. */
  geometryCaptures: Record<string, { confirmedThrough: number }>;
  /** A recording gap or restored timeline needs repair at its next native phase. */
  geometryCaptureRepairDue?: true;
  lastReceiverFrame?: ObservationFrame;
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
  chunkBytes: number;
}
export interface TemporalCaptureInput {
  confirmations?: readonly TemporalConfirmation[];
  checks?: readonly TemporalCheckGroup[];
  checkpointFields?: (
    subjects: ReadonlySet<string>,
    includeFeatures: boolean,
  ) => readonly TemporalCheckpointFields[];
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

const encoder = new TextEncoder();
const byteLength = (value: unknown) => encoder.encode(JSON.stringify(value)).byteLength;
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
  return (
    jsonEncoding(readOnlyDraftView(receipt)).bytes -
    receipt.facets.reduce((bytes, reference) => bytes + receptionBytes(reference), 0)
  );
}

export function temporalChunkLogicalBytes(
  chunk: TemporalChunk,
  sources: ReceivedValueLookup,
): number {
  let bytes = byteLength(chunk);
  for (const valueRef of temporalChunkReferences(chunk)) {
    const fragment = receivedValueAt(sources, valueRef);
    if (!fragment) throw new Error('Temporal accounting requires its selected values.');
    bytes += jsonEncoding(fragment).bytes;
  }
  return bytes;
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
      chunks: [],
      bytes: 0,
      count: 0,
      nextDue: null,
      maintenanceDue: false,
      geometryCaptures: {},
    };
  } else if (actor.physicalLife !== life) {
    actor.physicalLife = life;
    actor.epoch = `${temporal.namespace}-${nextId(world, 'receipt-epoch')}`;
    actor.nextOrdinal = 0;
    actor.geometryCaptures = {};
  }
  return { state: temporal, actor };
}
export function temporalActorHistory(
  world: WorldState,
  actorId: string,
): TemporalActorHistory | undefined {
  return actorHistory(world, actorId)?.actor;
}
/** Restore starts a new append address space without replaying any perception. */
export function beginTemporalReceiptEpoch(world: WorldState, namespace: string): void {
  touchNativeEvidence(world, 'temporal');
  const temporal = world.experience?.temporal;
  if (!temporal) return;
  if (!namespace.trim() || namespace.length > 64)
    throw new Error('A receipt timeline requires its admitted namespace.');
  temporal.namespace = namespace;
  for (const actor of Object.values(temporal.actors)) {
    actor.geometryCaptureRepairDue = true;
    actor.epoch = `${temporal.namespace}-${nextId(world, 'receipt-epoch')}`;
    actor.nextOrdinal = 0;
    actor.geometryCaptures = {};
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
export function appendTemporalReceipt(
  world: WorldState,
  actorId: string,
  input: TemporalCaptureInput,
  policy: TemporalRetentionPolicy,
  acquisition?: number,
): TemporalReceiptLocator | undefined {
  if (input.facets.some((facet) => 'value' in facet && facet.value.kind === 'observed-motion'))
    input = {
      ...input,
      facets: input.facets.flatMap<TemporalCaptureInput['facets'][number]>((facet) => {
        if ('received' in facet || facet.value.kind !== 'observed-motion') return [facet];
        return [facet.value.earlier, facet.value.later].map((sample) => ({
          value: { kind: 'location' as const, location: sample.location, frame: sample.frame },
          role: facet.role,
          asOf: sample.measuredThrough,
          measuredFrom: sample.measuredFrom,
          measuredThrough: sample.measuredThrough,
          acquiredAt: sample.acquiredAt,
          original: sample.original,
          receivedFrom: sample.confirmation,
          support: {
            original: sample.original,
            confirmation: sample.confirmation,
            confirmedFrom: sample.confirmedFrom,
            confirmedThrough: sample.confirmedThrough,
            ...(sample.aliases ? { aliases: sample.aliases } : {}),
          },
        }));
      }),
    };
  if (
    !input.facets.length &&
    !(
      input.change === 'receiver-frame' &&
      (input.receiverFrame || input.confirmations?.length || input.checks?.length)
    )
  )
    return;
  const owned = actorHistory(world, actorId);
  if (!owned) return;
  const { actor, state: temporal } = owned;
  const batch = acquisitionBatches.get(world)?.get(actorId);
  if (batch?.frame && !input.receiverFrame) input = { ...input, receiverFrame: batch.frame };
  let addedSourceBytes = 0;
  const ordinal = actor.nextOrdinal++;
  // Append only compact operation metadata and exact selected field references.
  // Proof objects are interned once by the frame writer; a complete received
  // envelope is materialized only for a consumer that actually asks for it.
  const header: TemporalWriteHeader = {
    ordinal,
    at: world.simTime,
    order: world.nextId,
    acquisition: batch?.acquisition ?? acquisition ?? ordinal,
    ...(input.availability?.length ? { availability: input.availability } : {}),
    ...(['loss', 'unchecked', 'attention-exit'].includes(input.change)
      ? { availabilityAt: input.availabilityAt ?? world.simTime }
      : {}),
    ...(input.facets.length &&
    input.facets.every((facet) => {
      const kind = 'received' in facet ? facet.received.projection.value.kind : facet.value.kind;
      return kind === 'surface-patch' || kind === 'physical-boundary';
    })
      ? { spatialContext: true as const }
      : {}),
    ...(input.receiverFrame ? { receiverFrame: input.receiverFrame } : {}),
    ...(actor.recordingGap ? { coverageGap: actor.recordingGap } : {}),
    ...(input.origin ? { origin: input.origin } : {}),
    subject: input.subject,
    ...(input.contextSubjects?.length || input.confirmations?.length || input.checks?.length
      ? {
          contextSubjects: [
            ...new Set([
              ...(input.contextSubjects ?? []),
              ...(input.confirmations ?? []).map((value) => value.subject),
              ...(input.checks ?? []).map((value) => value.subject),
            ]),
          ],
        }
      : {}),
    ...(input.subjectIdentity ? { subjectIdentity: input.subjectIdentity } : {}),
    change: input.change,
    required: input.required === true,
    sourceIds: [...new Set(input.sourceIds ?? [])],
  };
  const fields: TemporalFacetReference[] = input.facets.map((facet, ordinal) => {
    let projected: TemporalValueProjection;
    let retainedValue: TemporalValueReference | undefined;
    let metadata: Omit<TemporalFacetReference, 'ordinal' | 'valueRef' | 'reception'>;
    if ('received' in facet) {
      const { received, ...fields } = facet;
      projected = received.projection;
      retainedValue = received.reference;
      if (receivedValueAt(world.receivedValues?.sources ?? {}, retainedValue) !== projected.value)
        throw new Error('The selected current temporal value changed before capture.');
      metadata = fields;
    } else {
      const { value, retainedValue: preferred, ...fields } = facet;
      projected = splitTemporalValue(value);
      retainedValue = preferred;
      metadata = fields;
    }
    const retained = retainReceivedValue(world, projected.value, retainedValue);
    addedSourceBytes += retained.addedBytes;
    let reception = projected.reception;
    if (reception?.kind === 'body' && reception.pose) {
      const pose = retainReceivedValue(world, { kind: 'body-pose', pose: reception.pose });
      addedSourceBytes += pose.addedBytes;
      reception = {
        kind: 'body',
        poseRef: pose.reference,
      };
    }
    return {
      ...metadata,
      valueRef: retained.reference,
      ...(reception ? { reception } : {}),
      ordinal,
    };
  });
  const dependencies = {
    id: temporalReceiptId({ epoch: actor.epoch, ordinal }),
    sourceIds: header.sourceIds,
    ...(header.subjectIdentity ? { subjectIdentity: header.subjectIdentity } : {}),
    facets: fields,
  };
  const headers = {
    subjects: [...new Set([header.subject, ...(header.contextSubjects ?? [])])],
    sourceIds: [
      ...new Set([
        ...header.sourceIds,
        ...temporalReceiptAliases(dependencies, world.receivedValues?.sources ?? {}, world),
      ]),
    ],
    individualIds: temporalReceiptIndividualIds(dependencies, world.receivedValues?.sources ?? {}),
    sourceRefs: [
      ...new Set(fields.flatMap(temporalFacetValueReferences).map((reference) => reference)),
    ],
  };
  const headerKeys = ['subjects', 'sourceIds', 'individualIds', 'sourceRefs'] as const;
  const changes =
    temporalChangeCount(header.change, fields.length) +
    (input.confirmations?.length ?? 0) +
    (input.checks ?? []).reduce((count, group) => count + (group.declareOnly ? 0 : group.count), 0);
  const prepareAppend = (chunk: TemporalChunk) => {
    const plan = prepareTemporalFrameReceipt(
      chunk,
      header,
      fields,
      input.checkpointFields ?? temporalCurrentCheckpoints(world, actorId),
      input.confirmations,
      input.checks,
    );
    const entries = plan.entries;
    const checkpointFacets = plan.checkpoints.flatMap((checkpoint) => checkpoint.facets);
    const confirmationFields = (input.confirmations ?? []).map(temporalConfirmationReference);
    // Only newly declared memberships have dependencies to add to this chunk.
    // Existing declarations already own that closure; a later stamp is O(groups).
    const checkDependencies = { facets: plan.checkFields, sourceIds: [] };
    const checkSources = temporalReceiptAliases(
      checkDependencies,
      world.receivedValues?.sources ?? {},
      world,
    );
    const checkIndividuals = temporalReceiptIndividualIds(
      checkDependencies,
      world.receivedValues?.sources ?? {},
    );
    const checkValues = plan.checkFields.flatMap(temporalFacetValueReferences);
    const completeHeaders = {
      subjects: [
        ...new Set([
          ...plan.checkpoints.map((checkpoint) => checkpoint.subject),
          ...(input.confirmations ?? []).map((value) => value.subject),
          ...(input.checks ?? []).map((value) => value.subject),
          ...headers.subjects,
        ]),
      ],
      sourceIds: [
        ...new Set([
          ...plan.checkpoints.flatMap((checkpoint) =>
            temporalReceiptAliases(
              { ...checkpoint, facets: [...checkpoint.facets], sourceIds: [] },
              world.receivedValues?.sources ?? {},
              world,
            ),
          ),
          ...temporalReceiptAliases(
            { facets: confirmationFields, sourceIds: [] },
            world.receivedValues?.sources ?? {},
            world,
          ),
          ...checkSources,
          ...headers.sourceIds,
        ]),
      ],
      individualIds: [
        ...new Set([
          ...plan.checkpoints.flatMap((checkpoint) =>
            temporalReceiptIndividualIds(
              { facets: [...checkpoint.facets], subjectIdentity: checkpoint.subjectIdentity },
              world.receivedValues?.sources ?? {},
            ),
          ),
          ...temporalReceiptIndividualIds(
            { facets: confirmationFields },
            world.receivedValues?.sources ?? {},
          ),
          ...checkIndividuals,
          ...headers.individualIds,
        ]),
      ],
      sourceRefs: [
        ...new Set([
          ...[...checkpointFacets, ...confirmationFields]
            .flatMap(temporalFacetValueReferences)
            .map((reference) => reference),
          ...checkValues,
          ...headers.sourceRefs,
        ]),
      ],
    };
    const additions = Object.fromEntries(
      headerKeys.map((key) => [
        key,
        completeHeaders[key].filter((value) => !readOnlyDraftView(chunk[key]).includes(value)),
      ]),
    ) as typeof headers;
    const held = readOnlyDraftView(chunk);
    const previousValues = temporalChunkReferences(held);
    const addedValues = new Set<string>();
    let valueBytes = 0;
    for (const reference of new Set([
      ...[...fields, ...checkpointFacets, ...confirmationFields].flatMap(
        temporalFacetValueReferences,
      ),
      ...checkValues,
    ])) {
      const key = reference;
      if (addedValues.has(key) || previousValues.has(reference)) continue;
      addedValues.add(key);
      const value = receivedValueAt(world.receivedValues?.sources ?? {}, reference);
      if (!value) throw new Error('Temporal append has no received source.');
      valueBytes += jsonEncoding(value).bytes;
    }
    let delta =
      byteLength((entries.at(-1)?.ordinal ?? held.nextEntryOrdinal - 1) + 1) -
      byteLength(held.nextEntryOrdinal) +
      valueBytes +
      entries.reduce((sum, entry) => sum + jsonEncoding(entry).bytes, 0) +
      Math.max(0, entries.length - (held.entries.length ? 0 : 1));
    delta +=
      byteLength(header.at) -
      byteLength(held.throughAt) +
      byteLength(header.ordinal) -
      byteLength(held.throughOrdinal) +
      byteLength(held.count + changes) -
      byteLength(held.count);
    for (const key of headerKeys) {
      let count = held[key].length;
      for (const value of additions[key]) delta += byteLength(value) + (count++ > 0 ? 1 : 0);
    }
    const base = held.bytes + delta;
    let bytes = base;
    for (let n = 0; n < 4; n++) {
      const next = base + byteLength(bytes) - byteLength(held.bytes);
      if (next === bytes) break;
      bytes = next;
    }
    return { entries, additions, bytes };
  };
  let created = false;
  let chunk = actor.chunks.at(-1),
    append = chunk && chunk.epoch === actor.epoch ? prepareAppend(chunk) : undefined;
  if (
    !chunk ||
    chunk.epoch !== actor.epoch ||
    !temporalRecentAt(chunk.throughAt, world.simTime, policy.maxAgeSeconds) ||
    (chunk.count > 0 && append && append.bytes > policy.chunkBytes)
  ) {
    const order = world.nextId;
    chunk = {
      id: nextId(world, 'temporal-chunk'),
      order,
      actorId,
      physicalLife: actor.physicalLife,
      epoch: actor.epoch,
      fromOrdinal: header.ordinal,
      throughOrdinal: header.ordinal,
      fromAt: header.at,
      throughAt: header.at,
      subjects: [],
      sourceIds: [],
      individualIds: [],
      sourceRefs: [],
      bytes: 0,
      count: 0,
      entries: [],
      nextEntryOrdinal: 0,
    };
    initialBytes(chunk);
    created = true;
    append = prepareAppend(chunk);
  }
  if (!append) throw new Error('A temporal append has no complete byte charge.');
  if (!input.required && append.bytes > policy.chunkBytes) {
    actor.recordingGap = {
      from: actor.recordingGap?.from ?? world.simTime,
      through: world.simTime,
    };
    actor.geometryCaptureRepairDue = true;
    return;
  }
  const headroom = selectedTemporalPolicy(world).maintenanceHeadroom;
  if (
    !input.required &&
    (actor.bytes + append.bytes - (created ? 0 : chunk.bytes) > policy.maxBytes * (1 + headroom) ||
      actor.count + changes > policy.maxChanges * (1 + headroom))
  ) {
    actor.recordingGap = {
      from: actor.recordingGap?.from ?? world.simTime,
      through: world.simTime,
    };
    actor.geometryCaptureRepairDue = true;
    actor.maintenanceDue = true;
    return;
  }
  if (created) {
    actor.bytes += chunk.bytes;
    actor.chunks.push(chunk);
  }
  const previousBytes = chunk.bytes;
  appendTemporalFrameReceipt(chunk, header, fields, world, append.entries);
  chunk.count += changes;
  chunk.throughAt = header.at;
  chunk.throughOrdinal = header.ordinal;
  for (const key of headerKeys)
    if (append.additions[key].length)
      chunk[key] = appendSnapshot(readOnlyDraftView(chunk[key]), append.additions[key], world) ?? [
        ...chunk[key],
        ...append.additions[key],
      ];
  chunk.bytes = append.bytes;
  actor.bytes += append.bytes - previousBytes;
  actor.count += changes;
  selectedMarkRecentIndividualReferences(world, actorId, headers.individualIds, {
    epoch: actor.epoch,
    ordinal: header.ordinal,
    chunkOrder: chunk.order,
    at: header.at,
  });
  countDomainWork('temporalOperationsAppended');
  countDomainWork(
    'temporalFieldsAppended',
    fields.length +
      (input.confirmations?.length ?? 0) +
      (input.checks ?? []).reduce(
        (count, group) => count + (group.declareOnly ? 0 : group.count),
        0,
      ),
  );
  if (!input.required) delete actor.recordingGap;
  const due = chunk.fromAt + policy.maxAgeSeconds;
  actor.nextDue = actor.nextDue === null ? due : Math.min(actor.nextDue, due);
  actor.maintenanceDue =
    actor.bytes > policy.maxBytes ||
    actor.count > policy.maxChanges ||
    (actor.nextDue !== null && actor.nextDue <= world.simTime);
  chargeWork({
    effects: 1,
    tests: input.facets.length,
    outputBytes:
      append.entries.reduce((sum, entry) => sum + jsonEncoding(entry).bytes, 0) + addedSourceBytes,
  });
  return {
    actorId,
    physicalLife: actor.physicalLife,
    epoch: actor.epoch,
    ordinal: header.ordinal,
  };
}

export function temporalSpatialContextValue(
  value: Pick<TemporalValue | ReceivedValueFragment, 'kind'>,
): boolean {
  return value.kind === 'surface-patch' || value.kind === 'physical-boundary';
}

/** Minimal state for tracks actually referenced by this chunk. Copies neither
 * older routes nor a broad scene, and never remeasures an existing field. */
function temporalCheckpointFeatures(
  world: WorldState,
  actorId: string,
  includeFeatures: boolean,
): TemporalCheckpointFields[] {
  const groups = new Map<string, TemporalFacetReference[]>();
  const include = (subject: string, reference: TemporalFacetReference) => {
    const value = receivedValueAt(world.receivedValues?.sources ?? {}, reference);
    const expanded =
      value && materializeTemporalValue(reference, value, world.receivedValues?.sources ?? {});
    if (!expanded || !temporalFacetEligible(world, actorId, reference, expanded)) return;
    let facets = groups.get(subject);
    if (!facets) groups.set(subject, (facets = []));
    facets.push({ ...reference, ordinal: facets.length });
  };
  if (includeFeatures) {
    const geometry = currentReceivedGeometry(world, actorId);
    for (const observation of geometry.observations)
      for (const facet of observation.facets) {
        if (!temporalSpatialContextValue(facet.value)) continue;
        const projection = splitTemporalValue(facet.value),
          retained = retainReceivedValue(world, projection.value);
        if (retained.addedBytes) chargeWork({ outputBytes: retained.addedBytes });
        const subject =
          observation.origin.kind === 'exposure'
            ? observation.origin.episodeId
            : observation.origin.eventId;
        include(subject, {
          valueRef: retained.reference,
          ordinal: 0,
          role: facet.role,
          asOf: facet.asOf,
          measuredFrom: facet.measuredFrom,
          measuredThrough: facet.measuredThrough,
          acquiredAt: facet.acquiredAt,
          confirmedThrough: geometry.supportedThrough,
          original: contributionFactKey(observation, facet.ordinal),
          receivedFrom: {
            family: 'native-exposure',
            id: observation.id,
            revision: observation.revision,
            observer: observation.observer,
          },
          ...(facet.support ? { support: facet.support } : {}),
          ...(projection.reception ? { reception: projection.reception } : {}),
        });
      }
  }
  return [...groups].map(([subject, facets]) => ({ subject, facets }));
}

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

/** Actual failed checks close one subject's affected fields together. Last
 * values are references to received samples, not new measurements on loss. */
export function captureTemporalAvailability(
  world: WorldState,
  actorId: string,
  leases: readonly LiveFacetSupport[],
  policy: TemporalRetentionPolicy,
  options: { change?: 'loss' | 'unchecked' | 'attention-exit'; at?: number } = {},
): void {
  const groups = new Map<string, LiveFacetSupport[]>();
  for (const lease of leases) {
    const group = groups.get(lease.exposure.track) ?? [];
    group.push(lease);
    groups.set(lease.exposure.track, group);
  }
  const acquisition = world.experience?.temporal?.actors[actorId]?.nextOrdinal;
  for (const [subject, group] of groups)
    appendTemporalReceipt(
      world,
      actorId,
      {
        subject,
        change: options.change ?? 'loss',
        ...(options.at !== undefined ? { availabilityAt: options.at } : {}),
        ...(group.find((lease) => lease.localSubject)?.localSubject
          ? { subjectIdentity: group.find((lease) => lease.localSubject)!.localSubject }
          : {}),
        sourceIds: [...new Set(group.map((lease) => lease.original.id))],
        facets: group.map((lease) => temporalFacetInput(world, lease)),
      },
      policy,
      acquisition,
    );
}

function temporalFacetProofInput(lease: CurrentFacetProof, body: boolean) {
  // This synchronous input is interned/detached by the compact frame writer;
  // copying the same observer again for every selected field adds no authority.
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
  policy: TemporalRetentionPolicy,
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
  return appendTemporalReceipt(
    world,
    actorId,
    {
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
          measuredThrough:
            snapshot.poseSupport?.poseMeasuredThrough ?? snapshot.valueMeasuredThrough,
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
    },
    policy,
  );
}

/** Expand only a genuinely new admitted native group. Actual confirmation stamps
 * reuse its immutable member declaration without reading those members again. */
interface RecordedNativeGroup {
  records: CurrentFacetRecord[];
  leases: LiveFacetSupport[];
  facets: TemporalFacetReference[];
  inputs: TemporalCaptureInput['facets'];
}
function materializeNativeGroup(
  world: WorldState,
  owner: PerceptionEvidenceOwner,
  input: TemporalCurrentGroupInput,
): RecordedNativeGroup {
  const group = readOnlyDraftView(input.group),
    fields = readOnlyDraftView(group.fields);
  const records: CurrentFacetRecord[] = [],
    leases: LiveFacetSupport[] = [],
    facets: TemporalFacetReference[] = [],
    inputs: TemporalCaptureInput['facets'] = [];
  for (const kind of Object.keys(fields)) {
    const record = currentGroupFacetRecord(group, input.originalSource, kind);
    if (!record) continue;
    countDomainWork('temporalCaptureFieldsExpanded');
    const raw = currentFacetSupport(owner, record);
    const check = currentFacetConfirmation(owner, record, raw.confirmedThrough);
    const lease = check
      ? {
          ...raw,
          revision: Math.max(raw.revision, check.revision),
          confirmedThrough: check.through,
        }
      : raw;
    const value = temporalFacetInput(world, lease);
    if (!('received' in value)) throw new Error('Native group lost its acquired value.');
    const { received, ...metadata } = value;
    records.push(record);
    leases.push(lease);
    inputs.push(value);
    facets.push({
      ...metadata,
      ...received.reference,
      ...(received.projection.reception ? { reception: received.projection.reception } : {}),
      ordinal: facets.length,
    });
  }
  return { records, leases, facets, inputs };
}
/** Chunk boundaries preserve only the already selected native tracks. A generic
 * occurrence between sense phases must not scan broad contacts or lose the
 * selected baseline merely because it, rather than sight, started the chunk. */
function temporalCurrentCheckpoints(
  world: WorldState,
  actorId: string,
  inputs?: readonly TemporalCurrentGroupInput[],
  materialize?: (input: TemporalCurrentGroupInput) => RecordedNativeGroup,
): TemporalCheckpointBuilder {
  let byTrack: Map<string, TemporalCurrentGroupInput[]> | undefined;
  return (subjects: ReadonlySet<string>, includeFeatures: boolean): TemporalCheckpointFields[] => {
    if (!byTrack) {
      byTrack = new Map();
      const owner = world.perceptionEvidence?.[actorId];
      for (const input of inputs ?? (owner ? selectedTemporalCurrentGroups(owner) : [])) {
        const subject = receivedTrackKey(input.group.grant.exposure, input.group.grant.channel),
          held = byTrack.get(subject);
        if (held) held.push(input);
        else byTrack.set(subject, [input]);
      }
    }
    const selected = new Map<
      string,
      {
        facets: TemporalFacetReference[];
        subjectIdentity?: ObserverSubject;
        availability: Array<TemporalAvailabilityState | undefined>;
      }
    >();
    for (const subject of subjects)
      for (const input of byTrack.get(subject) ?? []) {
        let held = selected.get(subject);
        if (!held) selected.set(subject, (held = { facets: [], availability: [] }));
        const expanded = materialize
          ? materialize(input)
          : materializeNativeGroup(world, world.perceptionEvidence![actorId]!, input);
        held.subjectIdentity ??= expanded.records.find(
          (record) => record.localSubject,
        )?.localSubject;
        for (const facet of expanded.facets) {
          held.facets.push({ ...facet, ordinal: held.facets.length });
          held.availability.push(
            input.group.availability
              ? { reason: 'unchecked', at: input.group.availability.at }
              : undefined,
          );
        }
      }
    const result: TemporalCheckpointFields[] = [...selected].map(([subject, held]) => ({
      subject,
      ...(held.subjectIdentity ? { subjectIdentity: held.subjectIdentity } : {}),
      facets: held.facets,
      ...(held.availability.some((value) => value !== undefined)
        ? { availability: groupedTemporalAvailability(held.availability) }
        : {}),
    }));
    result.push(...temporalCheckpointFeatures(world, actorId, includeFeatures));
    return result;
  };
}
export function captureTemporalCurrent(
  world: WorldState,
  actorId: string,
  inputs: readonly TemporalCurrentGroupInput[],
  policy: TemporalRetentionPolicy,
  contactSubjects: ReadonlySet<string> = new Set(),
): Array<{
  subjectId: string;
  receipt: TemporalReceiptLocator;
  body?: LiveFacetSupport;
  bodyOrdinal?: number;
}> {
  if (!inputs.length) return [];
  const owned = actorHistory(world, actorId),
    owner = world.perceptionEvidence?.[actorId];
  if (!owned || !owner) return [];
  // A lost recording interval needs a new baseline for every selected group.
  // Geometry repair alone cannot invalidate unrelated current chronology.
  const rebaseline = owned.actor.recordingGap !== undefined;
  const frameRef = owner.visualConfirmation?.frameRef;
  const receiverFrame = frameRef ? receivedObservationFrame(world, frameRef) : undefined;
  const frameChanged =
    !!receiverFrame &&
    (!owned.actor.lastReceiverFrame ||
      jsonText(receiverFrame) !== jsonText(owned.actor.lastReceiverFrame));
  const acquisition = owned.actor.nextOrdinal;
  const captured: ReturnType<typeof captureTemporalCurrent> = [];
  const checks: Array<{
    input: TemporalCurrentGroupInput;
    check: TemporalCheckGroup;
    through: number;
    revision: number;
  }> = [];
  let materialized: Map<TemporalCurrentGroupInput, RecordedNativeGroup> | undefined;
  const nativeFields = (input: TemporalCurrentGroupInput) => {
    materialized ??= new Map();
    let held = materialized.get(input);
    if (!held) materialized.set(input, (held = materializeNativeGroup(world, owner, input)));
    return held;
  };
  const checkpointFields = temporalCurrentCheckpoints(world, actorId, inputs, nativeFields);
  const marks: Parameters<typeof currentGroupsSetRecording>[1][number][] = [];
  const mark = (
    input: TemporalCurrentGroupInput,
    check: TemporalCheckGroup,
    through: number,
    revision: number,
  ) => {
    const chunk = readOnlyDraftView(owned.actor.chunks).at(-1);
    const membership = chunk && temporalCheckGroupMembership(chunk, check);
    if (chunk && membership)
      marks.push({
        subjectId: input.subjectId,
        fields: input.group.fields,
        recording: {
          epoch: owned.actor.epoch,
          chunkId: chunk.id,
          entryOrdinal: membership.entryOrdinal,
          count: membership.count,
          through,
          revision,
        },
      });
  };
  for (const input of inputs) {
    countDomainWork('temporalGroupsVisited');
    const group = readOnlyDraftView(input.group),
      fields = readOnlyDraftView(group.fields);
    const prior =
      !rebaseline && group.recording?.epoch === owned.actor.epoch ? group.recording : undefined;
    const forceContact = contactSubjects.has(input.subjectId) && fields.body !== undefined;
    // Actual value/member mutation clears this checkpoint in the current owner.
    // A same-phase re-score cannot turn a previously consumed sample mask into
    // another baseline; only its still-current group identity matters here.
    const baseline = !prior || input.entering || input.exiting || forceContact;
    if (!baseline && !input.checked) continue;
    let representative: CurrentFacetRecord | undefined;
    for (const kind in fields) {
      representative = currentGroupFacetRecord(group, input.originalSource, kind);
      break;
    }
    if (!representative) continue;
    const proof = currentFacetProof(owner, representative);
    const confirmation = currentFacetConfirmation(owner, representative, proof.confirmedThrough);
    const through = confirmation?.through ?? proof.confirmedThrough;
    const materialize = () => nativeFields(input);
    const source: EvidenceSource = {
      family: 'native-exposure',
      id: representative.id,
      revision: Math.max(representative.revision, confirmation?.revision ?? 0),
      observer: currentFacetObserver(owner),
    };
    if (!baseline && through <= prior.through && source.revision === prior.revision) continue;
    const check: TemporalCheckGroup = {
      subject: receivedTrackKey(group.grant.exposure, group.grant.channel),
      confirmation: source,
      from: proof.confirmedFrom,
      through,
      count: prior?.count ?? 0,
      fields: () => materialize().facets,
      membershipKey: group.fields,
      ...(fields.body ? { detail: [source.revision, proof.confirmedFrom, through] as const } : {}),
      ...(prior
        ? { membership: { chunkId: prior.chunkId, entryOrdinal: prior.entryOrdinal } }
        : {}),
    };
    if (baseline) {
      const selected = materialize();
      if (!selected.facets.length) continue;
      check.count = selected.facets.length;
      check.declareOnly = true;
      check.useReceiptFields = true;
      const bodyOrdinal = selected.records.findIndex((record) => record.value.kind === 'body');
      const identity = selected.records.find((record) => record.localSubject)?.localSubject;
      const locator = appendTemporalReceipt(
        world,
        actorId,
        {
          subject: receivedTrackKey(group.grant.exposure, group.grant.channel),
          checkpointFields,
          ...(identity ? { subjectIdentity: identity } : {}),
          ...(receiverFrame ? { receiverFrame } : {}),
          change: input.exiting
            ? 'attention-exit'
            : group.availability?.state === 'unchecked'
              ? 'unchecked'
              : input.entering || !prior
                ? 'baseline'
                : 'change',
          ...(group.availability?.state === 'unchecked'
            ? { availabilityAt: group.availability.at }
            : {}),
          sourceIds: [input.originalSource.id],
          facets: selected.inputs,
          checks: [check],
        },
        policy,
        acquisition,
      );
      if (locator) {
        mark(input, check, through, source.revision);
        captured.push({
          subjectId: input.subjectId,
          receipt: locator,
          ...(bodyOrdinal >= 0 ? { body: selected.leases[bodyOrdinal], bodyOrdinal } : {}),
        });
      }
    } else checks.push({ input, check, through, revision: source.revision });
  }
  if (checks.length || (frameChanged && inputs.some((input) => !input.exiting))) {
    const locator = appendTemporalReceipt(
      world,
      actorId,
      {
        subject: JSON.stringify(['receiver', owned.actor.physicalLife]),
        contextSubjects: [
          ...new Set(
            inputs.map((input) =>
              receivedTrackKey(input.group.grant.exposure, input.group.grant.channel),
            ),
          ),
        ],
        change: 'receiver-frame',
        checkpointFields,
        ...(receiverFrame ? { receiverFrame } : {}),
        facets: [],
        checks: checks.map((value) => value.check),
      },
      policy,
      acquisition,
    );
    if (locator)
      for (const value of checks) mark(value.input, value.check, value.through, value.revision);
    if (locator && receiverFrame) owned.actor.lastReceiverFrame = receiverFrame;
  } else if (captured.length && receiverFrame) owned.actor.lastReceiverFrame = receiverFrame;
  if (marks.length) {
    touchNativeEvidence(world, 'perception', actorId);
    currentGroupsSetRecording(owner, marks);
  }
  return captured;
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
  const history = world.experience?.temporal?.actors[actorId];
  const previous =
    observation.facets.length === 1 &&
    (observation.facets[0]!.value.kind === 'surface-patch' ||
      observation.facets[0]!.value.kind === 'physical-boundary')
      ? history?.geometryCaptures[observation.id]
      : undefined;
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
  if (
    locator &&
    observation.facets.length === 1 &&
    (observation.facets[0]!.value.kind === 'surface-patch' ||
      observation.facets[0]!.value.kind === 'physical-boundary')
  ) {
    const actor = world.experience!.temporal!.actors[actorId]!;
    actor.geometryCaptures[observation.id] = {
      confirmedThrough: Math.max(
        previous?.confirmedThrough ?? 0,
        options.confirmedThrough ?? observation.facets[0]!.measuredThrough,
      ),
    };
  }
  return locator;
}

/** Only a native receiver's held interval may extend an original geometry fact.
 * Compact boundary receipts keep that proof when the live view is replaced. */
export function finalizeTemporalGeometrySupport(
  world: WorldState,
  actorId: string,
  observations: readonly ObservationContribution[],
  through: number,
  policy: TemporalRetentionPolicy,
): void {
  const actor = world.experience?.temporal?.actors[actorId];
  if (!actor) return;
  for (const observation of observations) {
    const held = actor.geometryCaptures[observation.id];
    if (!held || through <= (held.confirmedThrough ?? observation.acquiredAt)) continue;
    captureTemporalObservation(world, actorId, observation, [observation.id], false, policy, {
      change: 'change',
      confirmedThrough: through,
    });
  }
}

/** Watermarks follow the bounded current geometry. They grant no source retention. */
export function reconcileTemporalGeometryCaptures(
  world: WorldState,
  actorId: string,
  active: ReadonlySet<string>,
): void {
  touchNativeEvidence(world, 'temporal', actorId);
  const actor = world.experience?.temporal?.actors[actorId];
  if (!actor) return;
  for (const [id, capture] of Object.entries(actor.geometryCaptures)) {
    if (!id.startsWith('perception-observation-')) continue;
    if (!active.has(id)) delete actor.geometryCaptures[id];
  }
}

/** Server-selected cold retirement totals are applied by this same native semantic owner. */
export function retireTemporalChunks(
  world: WorldState,
  actorId: string,
  ids: readonly string[],
  totals: { bytes: number; count: number },
  nextDue: number | null,
  releasedThrough?: number,
  frontier?: { chunkOrder: number; ordinal: number },
): void {
  touchNativeEvidence(world, 'temporal', actorId);
  const actor = world.experience?.temporal?.actors[actorId];
  if (!actor) return;
  const removed = new Set(ids);
  actor.chunks = actor.chunks.filter((chunk) => !removed.has(chunk.id));
  actor.bytes = Math.max(0, actor.bytes - totals.bytes);
  actor.count = Math.max(0, actor.count - totals.count);
  actor.nextDue = nextDue;
  if (releasedThrough !== undefined)
    actor.releasedThrough = Math.max(actor.releasedThrough ?? 0, releasedThrough);
  if (
    frontier &&
    (!actor.retiredThrough ||
      frontier.chunkOrder > actor.retiredThrough.chunkOrder ||
      (frontier.chunkOrder === actor.retiredThrough.chunkOrder &&
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
function invalidateChangedRecordingMemberships(
  world: WorldState,
  actorId: string,
  chunk: TemporalChunk,
): void {
  const owner = world.perceptionEvidence?.[actorId];
  if (!owner) return;
  const updates: Parameters<typeof currentGroupsSetRecording>[1][number][] = [];
  for (const [subjectId, contact] of currentContactEntries(owner))
    for (const group of contact.content.groups) {
      const mark = group.recording;
      if (
        mark?.chunkId === chunk.id &&
        !temporalCurrentMembershipPresent(chunk, mark.entryOrdinal, mark.count)
      )
        updates.push({ subjectId, fields: group.fields, recording: undefined });
    }
  if (updates.length) {
    touchNativeEvidence(world, 'perception', actorId);
    currentGroupsSetRecording(owner, updates);
  }
}

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
const temporalStateValue = (value: { kind: string }) =>
  !['event', 'speech', 'sound', 'personal-account'].includes(value.kind);
function temporalStateFieldKey(value: TemporalValue, reference: TemporalFacetReference): string {
  // An acquired appearance and a later independently received position are
  // different state. Carrying the latter must not erase the former.
  return temporalSpatialContextValue(value)
    ? JSON.stringify([value.kind, reference.original])
    : value.kind;
}
/** Prefix retirement carries only state needed by the retained suffix. A carried
 * point has the suffix's coverage boundary and keeps its original sample time;
 * it is never an earlier route entry. No current-world value fills this replay. */
function checkpointsForRetainedReceipts(
  world: WorldState,
  actorId: string,
  chunk: TemporalChunk,
  remaining: readonly TemporalReceipt[],
): Array<TemporalCheckpoint | TemporalCheckpointDraft> {
  if (!remaining.length) return [];
  const old = temporalEntryCheckpoints(chunk),
    actual = temporalChunkReceipts(chunk),
    sources = world.receivedValues?.sources ?? {};
  const anchors = new Map<string, TemporalReceipt>();
  for (const receipt of remaining)
    for (const subject of [receipt.subject, ...(receipt.contextSubjects ?? [])])
      if (!anchors.has(subject)) anchors.set(subject, receipt);
  const spatial = remaining.find(
    (receipt) =>
      receipt.spatialContext ||
      receipt.change === 'receiver-frame' ||
      receipt.facets.some(
        (facet) => facet.reception?.kind === 'body' || facet.reception?.kind === 'location',
      ),
  );
  const previous = new Map<string, TemporalCheckpoint>();
  for (const checkpoint of old) {
    if (!previous.has(checkpoint.subject)) previous.set(checkpoint.subject, checkpoint);
    if (
      spatial &&
      !anchors.has(checkpoint.subject) &&
      checkpoint.facets.some((reference) => {
        const value = receivedValueAt(sources, reference);
        return value && temporalSpatialContextValue(value);
      })
    )
      anchors.set(checkpoint.subject, spatial);
  }
  type Field = { reference: TemporalFacetReference; value: TemporalValue };
  type ReplayState = {
    anchor: TemporalReceipt;
    subjectIdentity?: ObserverSubject;
    fields: Map<string, Field>;
    values: Map<string, Set<string>>;
    availability: Map<string, TemporalAvailabilityState>;
  };
  const states = new Map<string, ReplayState>(
    [...anchors].map(([subject, anchor]) => [
      subject,
      {
        anchor,
        fields: new Map<string, Field>(),
        values: new Map<string, Set<string>>(),
        availability: new Map<string, TemporalAvailabilityState>(),
      },
    ]),
  );
  const valueKey = (reference: TemporalValueReference): string =>
    typeof reference.valueRef === 'string' ? reference.valueRef : jsonText(reference.valueRef);
  const valueKeys = (reference: TemporalFacetReference): string[] => [
    valueKey(reference),
    ...(reference.reception?.kind === 'body' && reference.reception.poseRef
      ? [valueKey({ valueRef: reference.reception.poseRef })]
      : []),
  ];
  const include = (
    state: ReplayState,
    reference: TemporalFacetReference,
    unavailable?: TemporalAvailabilityState,
  ) => {
    const fragment = receivedValueAt(sources, reference);
    if (!fragment || !temporalStateValue(fragment)) return;
    const value = materializeTemporalValue(reference, fragment, sources);
    if (!value || !temporalFacetEligible(world, actorId, reference, value)) return;
    const key = temporalStateFieldKey(value, reference),
      prior = state.fields.get(key);
    if (prior) {
      for (const previous of valueKeys(prior.reference)) {
        const keys = state.values.get(previous)!;
        keys.delete(key);
        if (!keys.size) state.values.delete(previous);
      }
    }
    state.fields.set(key, { reference, value });
    for (const id of valueKeys(reference)) {
      let keys = state.values.get(id);
      if (!keys) state.values.set(id, (keys = new Set()));
      keys.add(key);
    }
    if (unavailable) state.availability.set(key, unavailable);
    else state.availability.delete(key);
  };
  for (const [subject, state] of states) {
    const checkpoint = previous.get(subject);
    state.subjectIdentity = checkpoint?.subjectIdentity;
    for (const reference of checkpoint?.facets ?? [])
      include(
        state,
        reference,
        checkpoint?.availability?.find((group) => group.fields.includes(reference.ordinal)),
      );
  }
  // Route each received operation once. A subject's first retained operation is
  // its coverage boundary; replay never scans unrelated tracks for that subject.
  for (const receipt of actual) {
    const state = states.get(receipt.subject);
    if (!state || receipt.ordinal >= state.anchor.ordinal) continue;
    if (receipt.subjectIdentity) state.subjectIdentity = receipt.subjectIdentity;
    for (const reference of receipt.facets)
      include(state, reference, temporalFieldAvailability(receipt, reference.ordinal));
  }
  // Confirmation decoding is page-wide work, not work repeated for every track.
  // Select the subject before expanding proofs, then match its exact shared value.
  visitTemporalConfirmations(
    chunk,
    (subject, receiptOrdinal) => {
      const state = states.get(subject);
      return !!state && receiptOrdinal <= state.anchor.ordinal;
    },
    (confirmation) => {
      const state = states.get(confirmation.subject)!;
      if (confirmation.through > state.anchor.at) return;
      const keys = state.values.get(valueKey(confirmation.reference));
      if (!keys?.size) return;
      const dependency = temporalConfirmationReference(confirmation);
      for (const key of keys) {
        const field = state.fields.get(key)!;
        if (temporalFacetEligible(world, actorId, dependency, field.value))
          field.reference = applyTemporalConfirmation(field.reference, confirmation);
      }
    },
  );
  const result: Array<TemporalCheckpoint | TemporalCheckpointDraft> = [];
  for (const [subject, state] of states) {
    const { anchor, fields, availability } = state;
    if (anchor.subject === subject)
      for (const reference of anchor.facets) {
        const fragment = receivedValueAt(sources, reference);
        if (!fragment || !temporalStateValue(fragment)) continue;
        const value = materializeTemporalValue(reference, fragment, sources);
        if (value) fields.delete(temporalStateFieldKey(value, reference));
      }
    if (!fields.size) continue;
    const checkpoint = previous.get(subject);
    result.push({
      chunkId: chunk.id,
      actorId,
      physicalLife: chunk.physicalLife,
      epoch: chunk.epoch,
      ...(checkpoint ? { ordinal: checkpoint.ordinal } : {}),
      acquisition: anchor.acquisition,
      at: anchor.at,
      order: anchor.order,
      subject,
      ...(state.subjectIdentity ? { subjectIdentity: state.subjectIdentity } : {}),
      sourceIds: [],
      facets: [...fields.values()].map(({ reference }, ordinal) => ({ ...reference, ordinal })),
      availability: groupedTemporalAvailability(
        [...fields.keys()].map((key) => availability.get(key)),
      ),
    });
  }
  return result;
}

/** Expiry can cut inside an open logical chunk. Physical pages keep stable
 * ordinals; deleting a prefix does not keep its expired payload alive. */
export function retireTemporalReceipts(
  world: WorldState,
  actorId: string,
  chunkId: string,
  ordinals: ReadonlySet<number>,
  nextDue: number | null,
): void {
  const temporal = world.experience?.temporal,
    actor = temporal?.actors[actorId];
  const chunk = actor?.chunks.find((chunk) => chunk.id === chunkId);
  if (!temporal || !actor || !chunk || !ordinals.size) return;
  const actual = temporalChunkReceipts(chunk),
    removed: TemporalReceipt[] = [],
    remaining: TemporalReceipt[] = [];
  for (const receipt of actual) (ordinals.has(receipt.ordinal) ? removed : remaining).push(receipt);
  if (!removed.length) return;
  touchNativeEvidence(world, 'temporal', actorId);
  const oldBytes = chunk.bytes,
    oldCount = chunk.count;
  const checkpoints = checkpointsForRetainedReceipts(world, actorId, chunk, remaining);
  replaceTemporalChunkReceipts(chunk, remaining, world, checkpoints);
  if (remaining.length) {
    refreshChunk(chunk, world);
    invalidateChangedRecordingMemberships(world, actorId, chunk);
  } else {
    actor.chunks = actor.chunks.filter((value) => value.id !== chunkId);
    chunk.count = 0;
    chunk.bytes = 0;
  }
  actor.bytes -= oldBytes - chunk.bytes;
  actor.count -= oldCount - chunk.count;
  actor.releasedThrough = Math.max(
    actor.releasedThrough ?? 0,
    ...removed.map((receipt) => receipt.at),
  );
  if (!remaining.length || removed.every((receipt) => receipt.ordinal < remaining[0]!.ordinal)) {
    const ordinal = Math.max(...removed.map((receipt) => receipt.ordinal));
    if (
      !actor.retiredThrough ||
      chunk.order > actor.retiredThrough.chunkOrder ||
      (chunk.order === actor.retiredThrough.chunkOrder && ordinal > actor.retiredThrough.ordinal)
    )
      actor.retiredThrough = {
        chunkOrder: chunk.order,
        ordinal,
        at: Math.max(...removed.map((receipt) => receipt.at)),
      };
  }
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
      chunks: actor.chunks,
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
export function selectCapturedTemporalHistory(
  context: CapturedTemporalHistoryContext,
  query: TemporalHistoryQuery = {},
): TemporalHistorySelection {
  if (context.at !== undefined && context.maxAgeSeconds !== undefined)
    query = {
      ...query,
      from: Math.max(query.from ?? 0, context.at - context.maxAgeSeconds),
      through: Math.min(query.through ?? context.at, context.at),
    };
  const limit = query.limit ?? 128,
    maxBytes = query.bytes ?? 8192;
  const entries: TemporalHistorySelection['entries'] = [];
  const workLimit = query.operations ?? context.maximumOperations ?? limit;
  let examined = 0;
  let examinedBefore: TemporalHistorySelection['examinedBefore'];
  let bytes = 0,
    hasMore = false,
    incomplete =
      context.releasedThrough !== undefined &&
      (query.from === undefined || query.from <= context.releasedThrough);
  if (
    context.recordingGap &&
    (query.through === undefined || query.through >= context.recordingGap.from)
  )
    incomplete = true;
  const actorId = context.actorId;
  const subjects = query.subjects ?? (query.subject ? [query.subject] : []);
  let candidates = 0;
  const maximumCandidates = context.maximumCandidates ?? workLimit * 4;
  const chunks = context.chunks.filter(
    (chunk) =>
      chunk.actorId === actorId &&
      (!context.retiredThrough ||
        chunk.order > context.retiredThrough.chunkOrder ||
        (chunk.order === context.retiredThrough.chunkOrder &&
          chunk.throughOrdinal > context.retiredThrough.ordinal)) &&
      (!query.epoch || chunk.epoch === query.epoch) &&
      (query.physicalLife === undefined || chunk.physicalLife === query.physicalLife) &&
      (query.from === undefined || chunk.throughAt >= query.from) &&
      (query.through === undefined || chunk.fromAt <= query.through) &&
      (!subjects.length ||
        query.includeGeometry ||
        chunk.subjects.some((subject) => subjects.includes(subject))),
  );
  type Cursor = {
    chunk: TemporalChunk;
    operations: ReturnType<typeof temporalChunkOperations>;
    position: number;
    header?: ReturnType<typeof temporalOperationHeader>;
  };
  const cursors: Cursor[] = chunks.map((chunk) => {
    const operations = temporalChunkOperations(chunk);
    return { chunk, operations, position: operations.length - 1 };
  });
  const compare = (
    left: ReturnType<typeof temporalOperationHeader>,
    right: ReturnType<typeof temporalOperationHeader>,
  ) =>
    right.at - left.at ||
    right.order - left.order ||
    right.epoch.localeCompare(left.epoch) ||
    right.ordinal - left.ordinal;
  function* selectedOperations() {
    // Merge page-local order, decoding only one compact header per active page.
    // No complete receipt/proof graph is built merely to sort a narrow query.
    while (true) {
      let selected: Cursor | undefined;
      for (const cursor of cursors) {
        if (cursor.position < 0) continue;
        if (!cursor.header) {
          if (++candidates > maximumCandidates) {
            incomplete = true;
            hasMore = true;
            return;
          }
          cursor.header = temporalOperationHeader(
            cursor.chunk,
            cursor.operations[cursor.position]!,
          );
        }
        if (!selected || compare(cursor.header, selected.header!) < 0) selected = cursor;
      }
      if (!selected) return;
      const header = selected.header!,
        operation = selected.operations[selected.position--]!;
      selected.header = undefined;
      if (
        (!context.retiredThrough ||
          selected.chunk.order > context.retiredThrough.chunkOrder ||
          (selected.chunk.order === context.retiredThrough.chunkOrder &&
            header.ordinal > context.retiredThrough.ordinal)) &&
        (context.at === undefined ||
          context.maxAgeSeconds === undefined ||
          temporalRecentAt(header.at, context.at, context.maxAgeSeconds)) &&
        (!query.cut || temporalReceiptWithinPrefix({ ...header, facets: [] }, query.cut)) &&
        (query.from === undefined || header.at >= query.from) &&
        (query.through === undefined || header.at <= query.through) &&
        (!subjects.length ||
          (query.includeGeometry && header.spatialContext) ||
          subjects.includes(header.subject) ||
          header.contextSubjects?.some((subject) => subjects.includes(subject))) &&
        (!query.before ||
          header.at < query.before.at ||
          (header.at === query.before.at &&
            (header.order < query.before.order ||
              (header.order === query.before.order &&
                (header.epoch < query.before.epoch ||
                  (header.epoch === query.before.epoch &&
                    header.ordinal < query.before.ordinal))))))
      )
        yield { chunk: selected.chunk, operation, header };
    }
  }
  const examinedFrames = new Set<string>();
  for (const { chunk, operation, header } of selectedOperations()) {
    if (entries.length >= limit) {
      incomplete = true;
      hasMore = true;
      break;
    }
    const receipt: TemporalReceipt = { ...header, facets: [] };
    const frameKey = JSON.stringify([receipt.physicalLife, receipt.epoch, receipt.acquisition]);
    if (!examinedFrames.has(frameKey)) {
      examinedFrames.add(frameKey);
      if (++examined > workLimit) {
        incomplete = true;
        hasMore = true;
        break;
      }
    }
    if (receipt.coverageGap) incomplete = true;
    const values: TemporalValue[] = [];
    const references: TemporalFacetReference[] = [];
    // Skipping an oversized operation leaves coverage incomplete, but only
    // exhausted examination work stops selection of older usable operations.
    let missing = false,
      exhausted = false;
    for (let position = 0; position < operation.facets.length; position++) {
      if (++examined > workLimit) {
        incomplete = true;
        hasMore = true;
        exhausted = true;
        break;
      }
      const reference = temporalOperationFacet(chunk, operation, position);
      receipt.facets.push(reference);
      if (
        query.measurements &&
        (reference.measuredFrom > query.measurements.through ||
          (reference.confirmedThrough ?? reference.measuredThrough) < query.measurements.from)
      )
        continue;
      const fragment = retainedValueAt(context.sources, reference);
      if (!fragment) {
        incomplete = true;
        missing = true;
        continue;
      }
      const value = materializeTemporalValue(reference, fragment, context.sources);
      if (!value) {
        incomplete = true;
        missing = true;
        continue;
      }
      if (query.kinds && !query.kinds.includes(value.kind)) continue;
      if (!temporalFacetEligible(context.disclosure, actorId, reference, value)) {
        incomplete = true;
        continue;
      }
      values.push(value);
      references.push(reference);
    }
    if (exhausted) break;
    if (missing || (!values.length && receipt.change !== 'receiver-frame')) {
      examinedBefore = {
        epoch: receipt.epoch,
        ordinal: receipt.ordinal,
        at: receipt.at,
        order: receipt.order,
      };
      continue;
    }
    const selectedReceipt = temporalReceiptForRead(
      selectTemporalReceiptFacets(receipt, references, context.sources, context.disclosure),
    );
    const size = byteLength({ receipt: selectedReceipt, values });
    if (bytes + size > maxBytes) {
      incomplete = true;
      hasMore = true;
      // An individually oversized operation cannot fit any page. Skip it whole;
      // an ordinary operation that only exceeds this page remains behind its
      // cursor and must be offered on the next page.
      if (size <= maxBytes) break;
      examinedBefore = {
        epoch: receipt.epoch,
        ordinal: receipt.ordinal,
        at: receipt.at,
        order: receipt.order,
      };
      continue;
    }
    if (
      receipt.change === 'loss' ||
      receipt.change === 'unchecked' ||
      receipt.change === 'attention-exit'
    )
      incomplete = true;
    bytes += size;
    entries.push({ receipt: cloneValue(selectedReceipt), values: cloneValue(values) });
    examinedBefore = {
      epoch: receipt.epoch,
      ordinal: receipt.ordinal,
      at: receipt.at,
      order: receipt.order,
    };
  }
  entries.reverse();
  const baselines: NonNullable<TemporalHistorySelection['baselines']> = [];
  const stateKey = temporalStateFieldKey;
  const scalar = temporalStateValue;
  for (const chunk of chunks) {
    const selected = entries.filter(
      (entry) =>
        entry.receipt.physicalLife === chunk.physicalLife &&
        entry.receipt.epoch === chunk.epoch &&
        entry.receipt.ordinal >= chunk.fromOrdinal &&
        entry.receipt.ordinal <= chunk.throughOrdinal,
    );
    if (!selected.length) continue;
    const actual = temporalChunkOperations(chunk);
    for (const checkpointOperation of temporalChunkCheckpointOperations(chunk)) {
      if (++candidates > maximumCandidates) {
        incomplete = true;
        break;
      }
      const checkpoint = temporalCheckpointHeader(chunk, checkpointOperation);
      let feature = false;
      // A feature checkpoint is relevant only when the caller requested geometry.
      // Decode its fields below under the same allowance as ordinary operations.
      if (query.includeGeometry && checkpointOperation.facets.length) {
        if (++examined > workLimit) {
          incomplete = true;
          break;
        }
        const reference = temporalOperationFacet(chunk, checkpointOperation, 0),
          value = receivedValueAt(context.sources, reference);
        feature = !!value && temporalSpatialContextValue(value);
      }
      const anchor = selected.find(
        (entry) =>
          entry.receipt.subject === checkpoint.subject ||
          entry.receipt.contextSubjects?.includes(checkpoint.subject) ||
          (query.includeGeometry && feature),
      );
      if (!anchor || checkpoint.at > anchor.receipt.at) continue;
      if (query.cut && checkpoint.order > query.cut.throughOrder) continue;
      const assigned = new Set(
        anchor.receipt.subject === checkpoint.subject
          ? anchor.values.flatMap((value, index) =>
              scalar(value) ? [stateKey(value, anchor.receipt.facets[index]!)] : [],
            )
          : [],
      );
      const held = new Map<
        string,
        {
          reference: TemporalFacetReference;
          value: TemporalValue;
          availability?: TemporalAvailabilityState;
          origin: NonNullable<TemporalHistorySelection['baselines']>[number]['origins'][number];
        }
      >();
      let complete = true;
      for (let index = actual.length - 1; index >= 0; index--) {
        if (++candidates > maximumCandidates) {
          complete = false;
          break;
        }
        const operation = actual[index]!,
          receipt = temporalOperationHeader(chunk, operation);
        if (
          receipt.subject !== checkpoint.subject ||
          receipt.ordinal >= anchor.receipt.ordinal ||
          receipt.at < checkpoint.at
        )
          continue;
        if (receipt.origin?.kind === 'occurrence') continue;
        for (let position = 0; position < operation.facets.length; position++) {
          if (++examined > workLimit) {
            complete = false;
            break;
          }
          const reference = temporalOperationFacet(chunk, operation, position);
          // Pose assignment is recognizable from its personal reception before
          // payload work. It cannot crowd out unrelated last-known scalar state.
          if (
            (reference.reception?.kind === 'body' || reference.reception?.kind === 'location') &&
            (assigned.has('pose') || held.has('pose'))
          )
            continue;
          const fragment = receivedValueAt(context.sources, reference),
            value = fragment && materializeTemporalValue(reference, fragment, context.sources);
          if (!value) {
            complete = false;
            break;
          }
          if (!scalar(value)) continue;
          const key = stateKey(value, reference);
          if (assigned.has(key) || held.has(key)) continue;
          if (temporalFacetEligible(context.disclosure, actorId, reference, value))
            held.set(key, {
              reference,
              value,
              availability: temporalFieldAvailability(receipt, reference.ordinal),
              origin: {
                kind: 'receipt',
                ordinal: receipt.ordinal,
                facetOrdinal: reference.ordinal,
                ...(temporalFieldAvailability(receipt, reference.ordinal)
                  ? {
                      availability: {
                        kind: 'receipt' as const,
                        ordinal: receipt.ordinal,
                        facetOrdinal: reference.ordinal,
                      },
                    }
                  : {}),
              },
            });
        }
        if (!complete) break;
      }
      if (!complete) {
        incomplete = true;
        continue;
      }
      for (let position = 0; position < checkpointOperation.facets.length; position++) {
        if (++examined > workLimit) {
          complete = false;
          break;
        }
        const reference = temporalOperationFacet(chunk, checkpointOperation, position);
        const fragment = receivedValueAt(context.sources, reference),
          value = fragment && materializeTemporalValue(reference, fragment, context.sources);
        if (!value) {
          complete = false;
          break;
        }
        const key = stateKey(value, reference);
        if (assigned.has(key) || held.has(key)) continue;
        if (temporalFacetEligible(context.disclosure, actorId, reference, value))
          held.set(key, {
            reference,
            value,
            availability: checkpoint.availability?.find((group) =>
              group.fields.includes(reference.ordinal),
            ),
            origin: {
              kind: 'checkpoint',
              ordinal: checkpoint.ordinal,
              facetOrdinal: reference.ordinal,
              ...(checkpoint.availability?.some((group) => group.fields.includes(reference.ordinal))
                ? {
                    availability: {
                      kind: 'checkpoint' as const,
                      ordinal: checkpoint.ordinal,
                      facetOrdinal: reference.ordinal,
                    },
                  }
                : {}),
            },
          });
      }
      if (!complete) {
        incomplete = true;
        continue;
      }
      confirmationReplay: for (const operation of temporalChunkConfirmationOperations(chunk)) {
        if (++candidates > maximumCandidates) {
          complete = false;
          break;
        }
        const header = temporalConfirmationHeader(chunk, operation);
        if (
          header.receiptOrdinal > anchor.receipt.ordinal ||
          header.at > anchor.receipt.at ||
          (query.cut &&
            (header.order > query.cut.throughOrder ||
              (chunk.epoch === query.cut.epoch &&
                header.receiptOrdinal > query.cut.throughOrdinal)))
        )
          continue;
        for (let group = 0; group < operation.subjects.length; group++) {
          if (++candidates > maximumCandidates) {
            complete = false;
            break confirmationReplay;
          }
          if (temporalConfirmationSubject(chunk, operation, group) !== checkpoint.subject) continue;
          for (const position of temporalConfirmationPositions(operation.subjects[group]!)) {
            if (++examined > workLimit) {
              complete = false;
              break confirmationReplay;
            }
            const confirmation = temporalConfirmationField(chunk, operation, group, position);
            if (confirmation.through > anchor.receipt.at) continue;
            const dependency = temporalConfirmationReference(confirmation);
            for (const field of held.values()) {
              if (!temporalFacetEligible(context.disclosure, actorId, dependency, field.value))
                continue;
              const next = applyTemporalConfirmation(field.reference, confirmation);
              if (next !== field.reference) field.reference = next;
            }
          }
        }
      }
      if (!complete) {
        incomplete = true;
        continue;
      }
      const fields = [...held.values()].filter(
        (field) =>
          (!query.kinds || query.kinds.includes(field.value.kind)) &&
          (!query.measurements ||
            ((field.reference.support?.confirmedThrough ??
              field.reference.confirmedThrough ??
              field.reference.measuredThrough) >= query.measurements.from &&
              field.reference.measuredFrom <= query.measurements.through)),
      );
      if (!fields.length) continue;
      const baseline = {
        checkpoint: temporalCheckpointForRead({
          ...checkpoint,
          facets: fields.map((field, ordinal) => ({ ...field.reference, ordinal })),
          availability: groupedTemporalAvailability(fields.map((field) => field.availability)),
        }),
        values: fields.map((field) => field.value),
        forReceipt: {
          actorId: anchor.receipt.actorId,
          physicalLife: anchor.receipt.physicalLife,
          epoch: anchor.receipt.epoch,
          ordinal: anchor.receipt.ordinal,
        },
        availableAt: anchor.receipt.at,
        origins: fields.map((field) => field.origin),
      };
      const size = byteLength(baseline);
      if (bytes + size > maxBytes) {
        incomplete = true;
        continue;
      }
      bytes += size;
      baselines.push(cloneValue(baseline));
    }
  }
  const selectedEntries =
    query.kinds || query.measurements
      ? entries.filter(
          (entry) =>
            entry.values.length ||
            baselines.some((baseline) => sameReceiptAddress(entry.receipt, baseline.forReceipt)),
        )
      : entries;
  return {
    entries: selectedEntries,
    ...(baselines.length ? { baselines } : {}),
    ...(examinedBefore ? { examinedBefore } : {}),
    incomplete: incomplete || selectedEntries.length === 0,
    hasMore,
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
  for (const chunk of actor.chunks) {
    const removed = temporalChunkReceipts(chunk).filter(
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
    replaceTemporalChunkReceipts(
      chunk,
      temporalChunkReceipts(chunk).filter((receipt) => !deleted.has(receipt.ordinal)),
      world,
    );
    // Exact stored byte totals are recomputed only for touched resident chunks; cold rows use repository retirement.
    const previousBytes = chunk.bytes;
    refreshChunk(chunk, world);
    if (chunk.count) invalidateChangedRecordingMemberships(world, actorId, chunk);
    actor.count -= previousCount - chunk.count;
    actor.bytes -= previousBytes - chunk.bytes;
  }
  actor.chunks = actor.chunks.filter((chunk) => chunk.count > 0);
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

function refreshChunk(chunk: TemporalChunk, world: WorldState): void {
  const metadata = temporalEntryMetadataReader(chunk, {
    sources: world.receivedValues?.sources ?? {},
    world,
  })(chunk.entries);
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
  chunk.fromOrdinal = metadata.ordinals[0]!;
  chunk.throughOrdinal = metadata.ordinals.at(-1)!;
  chunk.fromAt = metadata.firstAt!;
  chunk.throughAt = metadata.lastAt!;
  initialBytes(chunk, () => temporalChunkLogicalBytes(chunk, world.receivedValues?.sources ?? {}));
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
  for (const chunk of actor.chunks) {
    const previousBytes = chunk.bytes,
      previousCount = chunk.count;
    let changed = false;
    const retained: TemporalReceipt[] = [];
    for (const stored of readOnlyDraftView(temporalChunkReceipts(chunk))) {
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
    const checkpoints = temporalEntryCheckpoints(chunk).flatMap((checkpoint) => {
      const selection = revokeTemporalFields(world, checkpoint, revoked);
      changed ||= selection.changed;
      return selection.facets.length
        ? [
            {
              ...checkpoint,
              facets: selection.facets,
              availability: checkpoint.availability
                ?.map((group) => ({
                  ...group,
                  fields: group.fields.filter((ordinal) =>
                    selection.facets.some((field) => field.ordinal === ordinal),
                  ),
                }))
                .filter((group) => group.fields.length),
            },
          ]
        : [];
    });
    const confirmations = temporalEntryConfirmations(chunk).filter((confirmation) => {
      const reference = temporalConfirmationReference(confirmation),
        fragment = receivedValueAt(world.receivedValues?.sources ?? {}, reference),
        value =
          fragment &&
          materializeTemporalValue(reference, fragment, world.receivedValues?.sources ?? {});
      const remove = !!value && revoked(value, reference, { facets: [reference], sourceIds: [] });
      changed ||= remove;
      return !remove;
    });
    if (!changed) continue;
    selectedRequestRecentIndividualRepair(world, actorId, chunk.order, chunk.individualIds);
    replaceTemporalChunkReceipts(chunk, retained, world, checkpoints, confirmations);
    refreshChunk(chunk, world);
    if (chunk.count) invalidateChangedRecordingMemberships(world, actorId, chunk);
    actor.bytes -= previousBytes - chunk.bytes;
    actor.count -= previousCount - chunk.count;
  }
  actor.chunks = actor.chunks.filter((chunk) => chunk.count > 0);
}

export function temporalSourceIds(receipt: TemporalReceipt): EvidenceSource[] {
  return receipt.facets.flatMap((facet) => (facet.original ? [facet.original.source] : []));
}

/** A confirmation advances support for one exact received variant only. It
 * never changes when its value was measured or acquired. */
export function applyTemporalConfirmation(
  reference: TemporalFacetReference,
  value: TemporalConfirmation,
): TemporalFacetReference {
  const sameValue = sameReceivedValueReference(reference.valueRef, value.reference.valueRef);
  const detail = reference.detailSupport,
    confirmedDetail = value.detailSupport;
  if (
    sameValue &&
    detail &&
    confirmedDetail &&
    jsonText(detail.proof.original) === jsonText(confirmedDetail.proof.original) &&
    confirmedDetail.proof.confirmedFrom <= detail.proof.confirmedThrough &&
    confirmedDetail.proof.confirmedThrough >= detail.proof.confirmedThrough
  ) {
    return { ...reference, detailSupport: confirmedDetail };
  }
  const samePose =
    reference.reception?.kind === 'body' &&
    reference.reception.poseRef !== undefined &&
    sameReceivedValueReference(reference.reception.poseRef, value.reference.valueRef);
  if (
    (!sameValue && !samePose) ||
    !reference.original ||
    jsonText(reference.original) !== jsonText(value.original) ||
    (!samePose &&
      !(
        reference.reception === value.reception ||
        (reference.reception &&
          value.reception &&
          jsonText(reference.reception) === jsonText(value.reception))
      )) ||
    value.from >
      (reference.support?.confirmedThrough ??
        reference.confirmedThrough ??
        reference.measuredThrough) ||
    value.through <
      (reference.support?.confirmedThrough ??
        reference.confirmedThrough ??
        reference.measuredThrough)
  )
    return reference;
  return {
    ...reference,
    receivedFrom: value.confirmation,
    support: {
      original: value.original,
      confirmation: value.confirmation,
      confirmedFrom: value.from,
      confirmedThrough: value.through,
    },
    ...(value.detailSupport ? { detailSupport: value.detailSupport } : {}),
  };
}

export type TemporalFieldDependencies = Pick<
  TemporalFacetReference,
  'valueRef' | 'reception' | 'original' | 'receivedFrom' | 'support' | 'detailSupport'
> & { ordinal?: number };
/** Confirmations share exact field/source dependency accounting with assignments;
 * they carry no new value measurement or acquisition. */
export function temporalConfirmationReference(
  value: TemporalConfirmation,
): TemporalFieldDependencies {
  return {
    ...value.reference,
    ...(value.reception ? { reception: value.reception } : {}),
    original: value.original,
    receivedFrom: value.confirmation,
    support: {
      original: value.original,
      confirmation: value.confirmation,
      confirmedFrom: value.from,
      confirmedThrough: value.through,
    },
    ...(value.detailSupport ? { detailSupport: value.detailSupport } : {}),
  };
}

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
  for (const chunk of actor?.chunks ?? [])
    for (const receipt of temporalChunkReceipts(chunk)) add(receipt);
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
  const chunks = world.experience?.temporal?.actors[actorId]?.chunks ?? [];
  const maxAge = selectedTemporalPolicy(world).recent.maxAgeSeconds;
  for (let index = chunks.length - 1; index >= 0; index--)
    for (const receipt of temporalChunkReceipts(chunks[index]!))
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
  for (const chunk of actor.chunks) {
    if (chunk.throughAt <= cutoff || !chunk.sourceIds.includes(sourceId)) continue;
    const actual = temporalChunkReceipts(chunk).filter((receipt) =>
      temporalRecentAt(
        receipt.at,
        world.simTime,
        selectedTemporalPolicy(world).recent.maxAgeSeconds,
      ),
    );
    if (actual.some(includes)) return true;
    const retained = new Set(actual.map((receipt) => receipt.ordinal));
    for (const confirmation of temporalEntryConfirmations(chunk))
      if (
        retained.has(confirmation.receiptOrdinal) &&
        includes({ facets: [temporalConfirmationReference(confirmation)], sourceIds: [] })
      )
        return true;
    for (const checkpoint of checkpointsForRetainedReceipts(world, actorId, chunk, actual))
      if (includes(checkpoint)) return true;
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
function findTemporalReceipt(
  actor: TemporalActorHistory,
  locator: TemporalReceiptLocator,
): TemporalReceipt | undefined {
  const chunks = readOnlyDraftView(actor.chunks);
  // Contact retention normally asks for the just-appended receipt. Chunk bounds
  // also prune older epochs/lives without flattening every retained receipt.
  for (let index = chunks.length - 1; index >= 0; index--) {
    const chunk = readOnlyDraftView(chunks[index]!);
    if (
      chunk.actorId !== locator.actorId ||
      chunk.physicalLife !== locator.physicalLife ||
      chunk.epoch !== locator.epoch ||
      locator.ordinal < chunk.fromOrdinal ||
      locator.ordinal > chunk.throughOrdinal
    )
      continue;
    const receipt = temporalChunkReceipt(chunk, locator.ordinal);
    if (receipt) return sameReceiptAddress(receipt, locator) ? receipt : undefined;
  }
  return undefined;
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
  const heldReceipt = findTemporalReceipt(actor, locator);
  const receipt =
    heldReceipt &&
    temporalRecentAt(
      heldReceipt.at,
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
  const receipt = findTemporalReceipt(actor, locator);
  if (
    !receipt ||
    !temporalRecentAt(receipt.at, world.simTime, selectedTemporalPolicy(world).recent.maxAgeSeconds)
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
  selectedReceipt.facets = selectedReceipt.facets.map((facet) => {
    const reception = facet.reception;
    if (reception?.kind !== 'body' || !reception.poseRef) return facet;
    const pose = receivedValueAt(world.receivedValues?.sources ?? {}, reception.poseRef);
    if (pose?.kind !== 'body-pose') throw new Error('Retained support has no received pose.');
    return { ...facet, reception: { kind: 'body' as const, pose: pose.pose } };
  });
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
        baseline.checkpoint.chunkId,
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
