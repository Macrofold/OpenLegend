import { nextId } from './data.js';
import {
  retainReceivedValue,
  receivedValueAt,
  type ReceivedValueState,
  type ReceivedValueFragment,
} from './received-values.js';
import { cloneValue, readOnlyDraftView, touchNativeEvidence, appendSnapshot } from './draft.js';
import { entityGet } from './entity-collection.js';
import { hasMemory } from './living.js';
import { chargeWork } from './work-budget.js';
import { ensureExperienceAccounting } from './remembered-impressions.js';
import { personalFactAlias } from './experience-source.js';
import { isImmutableData, immutableDataSnapshot, jsonEncoding, jsonText } from './records.js';
import {
  selectedRecognitionSupportSourceIds,
  selectedTemporalPolicy,
} from './world-composition.js';
import type { WorldState } from './types.js';
import type { ObserverSubject } from './knowledge.js';
import {
  receivedFacetValue,
  sensoryFacetDependencies,
  splitObservedBody,
  materializeObservedBody,
} from './perception-evidence.js';
import type {
  EvidenceSource,
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
  blockId: string;
  valueOrdinal: number;
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
  | { kind: 'observed-motion'; earlier: ObservedLocation; later: ObservedLocation };
export type TemporalReception =
  | { kind: 'body'; pose: ObservedBodyPose }
  | { kind: 'location'; frame: ObservationFrame }
  | {
      kind: 'observed-motion';
      exposure: ObservationExposure;
      earlier: Omit<ReceivedLocationSample, 'location'>;
      later: Omit<ReceivedLocationSample, 'location'>;
      correspondence: 'unambiguous-received-continuity';
    };
export interface TemporalFacetReference extends TemporalValueReference {
  support?: ReceivedFacetProof;
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
export interface TemporalReceipt extends TemporalReceiptLocator {
  id: string;
  at: number;
  order: number;
  origin?: ObservationOrigin;
  /** Observer-local continuous exposure, not a canonical identity. */
  subject: string;
  /** Recording scope only: these attended exposures shared this received context. */
  contextSubjects?: string[];
  subjectIdentity?: ObserverSubject;
  change: 'baseline' | 'change' | 'loss' | 'occurrence' | 'attention-exit';
  required: boolean;
  /** Source lookup aliases include facet provenance; only independent account
   * aliases revoke the whole receipt. Neither grants hidden hydration. */
  sourceIds: string[];
  facets: TemporalFacetReference[];
}
export interface TemporalChunk {
  id: string;
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
  receipts: TemporalReceipt[];
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
  /** Bounded live-capture watermarks; values remain in their immutable source owner. */
  captures: Record<
    string,
    TemporalValueReference & {
      /** Last compared reception, not another source of knowledge or permission. */
      reception?: TemporalReception;
      confirmedThrough?: number;
      contextSubjects?: string[];
    }
  >;
  /** Actual payload retirement requires a new baseline at the next receiver phase. */
  capturesInvalidated?: true;
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
export interface TemporalRetentionPolicy {
  maxAgeSeconds: number;
  maxBytes: number;
  maxChanges: number;
  chunkBytes: number;
}
export interface TemporalCaptureInput {
  subject: string;
  contextSubjects?: readonly string[];
  subjectIdentity?: ObserverSubject;
  change: TemporalReceipt['change'];
  required?: boolean;
  sourceIds?: string[];
  origin?: ObservationOrigin;
  facets: Array<{
    support?: ReceivedFacetProof;
    value: TemporalValue | Extract<SensoryFacet, { kind: 'observed-motion' }>;
    role: TemporalFacetReference['role'];
    asOf: number;
    measuredFrom: number;
    measuredThrough: number;
    acquiredAt: number;
    confirmedThrough?: number;
    original?: ObservationFactKey;
    receivedFrom?: EvidenceSource;
    /** A saved producer watermark; reuse still verifies the received value. */
    retainedValue?: TemporalValueReference;
  }>;
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
  if (held.kind === 'observed-motion') {
    const earlier = jsonEncoding(readOnlyDraftView(held.earlier));
    const later = jsonEncoding(readOnlyDraftView(held.later));
    const prefix = '{"kind":"observed-motion","earlier":';
    const between = ',"later":';
    return {
      json: `${prefix}${earlier.json}${between}${later.json}}`,
      bytes: prefix.length + earlier.bytes + between.length + later.bytes + 1,
    };
  }
  return jsonEncoding(held);
}

/** This projection changes storage identity, never the received measurement. */
export function splitTemporalValue(value: TemporalValue): {
  value: TemporalFragment;
  reception?: TemporalReception;
} {
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
  if (held.kind === 'observed-motion') {
    const { location: earlier, ...earlierReception } = readOnlyDraftView(held.earlier);
    const { location: later, ...laterReception } = readOnlyDraftView(held.later);
    return {
      value: { kind: 'observed-motion', earlier, later },
      reception: {
        kind: 'observed-motion',
        exposure: held.exposure,
        earlier: earlierReception,
        later: laterReception,
        correspondence: held.correspondence,
      },
    };
  }
  return { value: held };
}

/** Readers call this only after selecting an actor-owned receipt. A shared
 * fragment alone grants neither a frame, an identity nor a received route. */
export function materializeTemporalValue(
  reference: Pick<TemporalFacetReference, 'reception'>,
  fragment: ReceivedValueFragment,
): TemporalValue | undefined {
  const value = receivedTemporalFragment(readOnlyDraftView(fragment));
  if (!value) return;
  const reception = reference.reception && readOnlyDraftView(reference.reception);
  if (value.kind === 'body')
    return reception?.kind === 'body'
      ? { kind: 'body', body: materializeObservedBody(value.body, reception.pose) }
      : undefined;
  if (value.kind === 'location')
    return reception?.kind === 'location'
      ? { kind: 'location', location: value.location, frame: reception.frame }
      : undefined;
  if (value.kind === 'observed-motion')
    return reception?.kind === 'observed-motion'
      ? {
          kind: 'observed-motion',
          exposure: reception.exposure,
          earlier: { ...reception.earlier, location: value.earlier },
          later: { ...reception.later, location: value.later },
          correspondence: reception.correspondence,
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
  if (value.kind === 'body' && reception?.kind === 'body')
    return (
      fragmentBytes +
      addedFieldBytes('position', jsonEncoding(reception.pose.position).bytes) +
      addedFieldBytes('heading', byteLength(reception.pose.heading)) +
      addedFieldBytes('supportSurfaceId', byteLength(reception.pose.supportSurfaceId))
    );
  if (value.kind === 'location' && reception?.kind === 'location')
    return fragmentBytes + addedFieldBytes('frame', jsonEncoding(reception.frame).bytes);
  if (value.kind === 'observed-motion' && reception?.kind === 'observed-motion') {
    const sample = (location: ObservedLocation, proof: typeof reception.earlier) =>
      jsonEncoding(readOnlyDraftView(proof)).bytes +
      addedFieldBytes('location', jsonEncoding(readOnlyDraftView(location)).bytes);
    return (
      fragmentBytes -
      jsonEncoding(value.earlier).bytes -
      jsonEncoding(value.later).bytes +
      sample(value.earlier, reception.earlier) +
      sample(value.later, reception.later) +
      addedFieldBytes('exposure', jsonEncoding(reception.exposure).bytes) +
      addedFieldBytes('correspondence', byteLength(reception.correspondence))
    );
  }
  if (value.kind === 'location' || value.kind === 'observed-motion' || reception !== undefined)
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
  sources: ReceivedValueState['sources'],
): number {
  let bytes = byteLength(chunk);
  for (const receipt of chunk.receipts)
    for (const reference of receipt.facets) {
      const fragment = retainedValueAt(sources, reference);
      if (!fragment) throw new Error('Temporal accounting requires its selected source blocks.');
      bytes += temporalValueLogicalBytes(reference, fragment) - receptionBytes(reference);
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
  return value?.kind === 'body-pose' ||
    value?.kind === 'observation-header' ||
    value?.kind === 'observation-frame'
    ? undefined
    : value;
}
function retainedValueAt(
  sources: ReceivedValueState['sources'],
  reference: TemporalValueReference,
): TemporalFragment | undefined {
  const value = receivedValueAt(sources, reference);
  return receivedTemporalFragment(value);
}
function temporalValue(value: TemporalCaptureInput['facets'][number]['value']): TemporalValue {
  return value;
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
  touchNativeEvidence(world, 'temporal', actorId);
  const entity = entityGet(world.entities, actorId);
  if (!entity?.actor || !hasMemory(entity)) return;
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
      captures: {},
    };
  } else if (actor.physicalLife !== life) {
    actor.physicalLife = life;
    actor.epoch = `${temporal.namespace}-${nextId(world, 'receipt-epoch')}`;
    actor.nextOrdinal = 0;
    actor.captures = {};
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
    actor.epoch = `${temporal.namespace}-${nextId(world, 'receipt-epoch')}`;
    actor.nextOrdinal = 0;
    actor.captures = {};
  }
  if (world.receivedValues) {
    delete world.receivedValues.activeAt;
    delete world.receivedValues.activeSources;
    delete world.receivedValues.activeSource;
  }
}
/** Called only with already received values. Admission never reads a hidden source entity. */
export function appendTemporalReceipt(
  world: WorldState,
  actorId: string,
  input: TemporalCaptureInput,
  policy: TemporalRetentionPolicy,
): TemporalReceiptLocator | undefined {
  if (!input.facets.length) return;
  const owned = actorHistory(world, actorId);
  if (!owned) return;
  const { actor, state: temporal } = owned;
  let addedSourceBytes = 0;
  let sourceBytes = 0;
  const ordinal = actor.nextOrdinal++;
  // A received sequence is complete here. Corrections replace its retained
  // projection; publication can share this immutable record without copying it.
  const receipt = immutableDataSnapshot<TemporalReceipt>(
    {
      id: temporalReceiptId({ epoch: actor.epoch, ordinal }),
      actorId,
      physicalLife: actor.physicalLife,
      epoch: actor.epoch,
      ordinal,
      at: world.simTime,
      order: world.nextId,
      ...(input.origin ? { origin: input.origin } : {}),
      subject: input.subject,
      ...(input.contextSubjects?.length
        ? { contextSubjects: [...new Set(input.contextSubjects)] }
        : {}),
      ...(input.subjectIdentity ? { subjectIdentity: input.subjectIdentity } : {}),
      change: input.change,
      required: input.required === true,
      sourceIds: [...new Set(input.sourceIds ?? [])],
      facets: input.facets.map(({ value, retainedValue, ...metadata }, ordinal) => {
        const projected = splitTemporalValue(temporalValue(value));
        const retained = retainReceivedValue(
          world,
          projected.value,
          policy.chunkBytes,
          retainedValue,
        );
        addedSourceBytes += retained.addedBytes;
        sourceBytes += valueLogicalBytes(projected, projected.value, retained.valueBytes);
        return {
          ...metadata,
          ...retained.reference,
          ...(projected.reception ? { reception: projected.reception } : {}),
          ordinal,
        };
      }),
    },
    readOnlyDraftView,
  );
  // Logical accounting charges each observer's full support even when storage shares it.
  const receiptBytes = temporalReceiptLogicalBytes(receipt);
  const bytes = receiptBytes + sourceBytes;
  const headers = {
    subjects: [...new Set([receipt.subject, ...(receipt.contextSubjects ?? [])])],
    sourceIds: [
      ...new Set([
        ...receipt.sourceIds,
        ...temporalReceiptAliases(receipt, world.receivedValues?.sources ?? {}, world),
      ]),
    ],
    individualIds: temporalReceiptIndividualIds(receipt, world.receivedValues?.sources ?? {}),
    sourceRefs: [...new Set(receipt.facets.map((facet) => facet.blockId))],
  };
  const headerKeys = ['subjects', 'sourceIds', 'individualIds', 'sourceRefs'] as const;
  // Charge only newly encoded header members. The retained prefix is unchanged;
  // JSON escaping and UTF-8 still own every byte of each new member.
  const appendBytes = (chunk: TemporalChunk) => {
    let delta =
      byteLength(receipt.at) -
      byteLength(chunk.throughAt) +
      byteLength(receipt.ordinal) -
      byteLength(chunk.throughOrdinal) +
      byteLength(chunk.count + 1) -
      byteLength(chunk.count);
    for (const key of headerKeys) {
      let count = chunk[key].length;
      for (const value of headers[key])
        if (!chunk[key].includes(value)) delta += byteLength(value) + (count++ > 0 ? 1 : 0);
    }
    const base = chunk.bytes + bytes + (chunk.count > 0 ? 1 : 0) + delta;
    let result = base;
    for (let n = 0; n < 4; n++) {
      const next = base + byteLength(result) - byteLength(chunk.bytes);
      if (next === result) break;
      result = next;
    }
    return result;
  };
  let chunk = actor.chunks.at(-1);
  let nextBytes = chunk && chunk.epoch === actor.epoch ? appendBytes(chunk) : undefined;
  if (
    !chunk ||
    chunk.epoch !== actor.epoch ||
    (chunk.count > 0 && nextBytes !== undefined && nextBytes > policy.chunkBytes)
  ) {
    chunk = {
      id: nextId(world, 'temporal-chunk'),
      actorId,
      physicalLife: actor.physicalLife,
      epoch: actor.epoch,
      fromOrdinal: receipt.ordinal,
      throughOrdinal: receipt.ordinal,
      fromAt: receipt.at,
      throughAt: receipt.at,
      subjects: [],
      sourceIds: [],
      individualIds: [],
      sourceRefs: [],
      bytes: 0,
      count: 0,
      receipts: [],
    };
    initialBytes(chunk);
    actor.bytes += chunk.bytes;
    actor.chunks.push(chunk);
    nextBytes = appendBytes(chunk);
  }
  const previousBytes = chunk.bytes;
  if (nextBytes === undefined) throw new Error('A temporal append has no complete byte charge.');
  // Storage pages seal at durable boundaries. The logical chunk spans actual
  // receipt times until full; a game timestamp is not a reason to start a page.
  chunk.receipts = appendSnapshot(readOnlyDraftView(chunk.receipts), [receipt], world) ?? [
    ...chunk.receipts,
    receipt,
  ];
  chunk.count++;
  chunk.throughAt = receipt.at;
  chunk.throughOrdinal = receipt.ordinal;
  for (const key of headerKeys)
    for (const value of headers[key]) if (!chunk[key].includes(value)) chunk[key].push(value);
  chunk.bytes = nextBytes;
  actor.bytes += nextBytes - previousBytes;
  actor.count++;
  const due = chunk.fromAt + policy.maxAgeSeconds;
  actor.nextDue = actor.nextDue === null ? due : Math.min(actor.nextDue, due);
  actor.maintenanceDue =
    actor.bytes > policy.maxBytes ||
    actor.count > policy.maxChanges ||
    (actor.nextDue !== null && actor.nextDue <= world.simTime);
  chargeWork({
    effects: 1,
    tests: input.facets.length,
    outputBytes: jsonEncoding(receipt).bytes + addedSourceBytes,
  });
  return {
    actorId,
    physicalLife: receipt.physicalLife,
    epoch: receipt.epoch,
    ordinal: receipt.ordinal,
  };
}

export function temporalFacetInput(
  world: WorldState,
  lease: LiveFacetSupport,
): TemporalCaptureInput['facets'][number] {
  const observer = immutableDataSnapshot(lease.observer, readOnlyDraftView);
  return {
    value: receivedFacetValue(world, lease.value)!,
    retainedValue:
      lease.value.kind === 'observed-motion'
        ? world.experience?.temporal?.actors[lease.observer.actorId]?.captures[lease.id]
        : { blockId: lease.value.reference[0], valueOrdinal: lease.value.reference[1] },
    role: lease.original.facets[lease.originalOrdinal]?.role ?? 'direct',
    asOf: lease.valueMeasuredThrough,
    measuredFrom: lease.valueMeasuredFrom,
    measuredThrough: lease.valueMeasuredThrough,
    acquiredAt: lease.valueAcquiredAt,
    original: {
      source: {
        family: 'native-exposure',
        id: lease.original.id,
        revision: lease.original.revision,
        observer,
      },
      ordinal: lease.originalOrdinal,
    },
    receivedFrom: {
      family: 'native-exposure',
      id: lease.id,
      revision: lease.revision,
      observer,
    },
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
  return appendTemporalReceipt(
    world,
    actorId,
    {
      subject: snapshot.exposure.episodeId,
      ...(snapshot.localSubject ? { subjectIdentity: snapshot.localSubject } : {}),
      change: 'baseline',
      required: false,
      sourceIds: [
        snapshot.original.source.id,
        snapshot.confirmation.id,
        ...(snapshot.originalAliases ?? []),
      ],
      facets: [
        {
          value: snapshot.value,
          support: {
            original: snapshot.original,
            confirmation: snapshot.confirmation,
            confirmedFrom: snapshot.confirmedFrom,
            confirmedThrough: snapshot.confirmedThrough,
            ...(snapshot.originalAliases ? { aliases: snapshot.originalAliases } : {}),
          },
          role: snapshot.role,
          asOf: snapshot.valueMeasuredThrough,
          measuredFrom: snapshot.valueMeasuredFrom,
          measuredThrough: snapshot.valueMeasuredThrough,
          acquiredAt: snapshot.valueAcquiredAt,
          original: snapshot.original,
          receivedFrom: snapshot.confirmation,
        },
      ],
    },
    policy,
  );
}

/** Leases cover the complete retained selection at this boundary, including exits.
 * changedSubjects limits processing, never the watermark ownership kept alive.
 * Watermarks reference their source owner, not another writable current-fact graph. */
export function captureTemporalCurrent(
  world: WorldState,
  actorId: string,
  leases: readonly LiveFacetSupport[],
  newlySelected: ReadonlySet<string>,
  policy: TemporalRetentionPolicy,
  endingSelection: ReadonlySet<string> = new Set(),
  contactSubjects: ReadonlySet<string> = new Set(),
  changedSubjects?: ReadonlySet<string>,
): Array<{ subjectId: string; receipt: TemporalReceipt; body?: LiveFacetSupport }> {
  const owned = actorHistory(world, actorId);
  if (!owned) return [];
  const captured: Array<{ subjectId: string; receipt: TemporalReceipt; body?: LiveFacetSupport }> =
    [];
  const keep = new Set<string>();
  const grouped = new Map<string, LiveFacetSupport[]>();
  for (const lease of leases) {
    keep.add(lease.id);
    if (
      changedSubjects &&
      !changedSubjects.has(lease.subjectId) &&
      !newlySelected.has(lease.subjectId) &&
      !endingSelection.has(lease.subjectId) &&
      !(lease.value.kind === 'body' && contactSubjects.has(lease.subjectId))
    )
      continue;
    // Comparing an existing capture does not modify its source block. Avoid
    // drafting every retained value merely to discover it is unchanged.
    const reference = readOnlyDraftView(owned.actor.captures)[lease.id];
    const current = receivedFacetValue(world, lease.value)!;
    const previous =
      reference &&
      retainedValueAt(
        readOnlyDraftView(world.receivedValues?.sources ?? {}),
        readOnlyDraftView(reference),
      );
    const maySkip =
      !newlySelected.has(lease.subjectId) &&
      !endingSelection.has(lease.subjectId) &&
      !(lease.value.kind === 'body' && contactSubjects.has(lease.subjectId));
    // One synchronous read resolved the same retained payload. Geometry with a
    // personal reception still needs its independent frame/proof comparison.
    if (
      maySkip &&
      previous &&
      current === previous &&
      reference?.reception === undefined &&
      lease.value.reception === undefined
    )
      continue;
    const projected = splitTemporalValue(temporalValue(current));
    if (
      maySkip &&
      previous &&
      valueEncoding(previous).json === valueEncoding(projected.value).json &&
      (reference?.reception === projected.reception ||
        (reference?.reception !== undefined &&
          projected.reception !== undefined &&
          jsonText(readOnlyDraftView(reference.reception)) === jsonText(projected.reception)))
    )
      continue;
    const group = grouped.get(lease.subjectId) ?? [];
    group.push(lease);
    grouped.set(lease.subjectId, group);
  }
  for (const group of grouped.values()) {
    const association = leases.find(
      (lease) => lease.subjectId === group[0]!.subjectId && lease.value.kind === 'association',
    );
    const supported = association && receivedFacetValue(world, association.value);
    const identity =
      supported?.kind === 'association' && supported.strength === 'supported'
        ? supported.subject
        : leases.find(
            (lease) => lease.subjectId === group[0]!.subjectId && lease.value.kind === 'body',
          )?.localSubject;
    appendTemporalReceipt(
      world,
      actorId,
      {
        subject: group[0]!.exposure.episodeId,
        ...(identity ? { subjectIdentity: identity } : {}),
        change: endingSelection.has(group[0]!.subjectId)
          ? 'attention-exit'
          : newlySelected.has(group[0]!.subjectId)
            ? 'baseline'
            : 'change',
        sourceIds: [...new Set(group.map((lease) => lease.original.id))],
        facets: group.map((lease) => temporalFacetInput(world, lease)),
      },
      policy,
    );
    const receipt = owned.actor.chunks.at(-1)?.receipts.at(-1);
    if (receipt) {
      captured.push({
        subjectId: group[0]!.subjectId,
        receipt,
        body: group.find((lease) => lease.value.kind === 'body'),
      });
      group.forEach((lease, index) => {
        const facet = receipt.facets[index]!;
        owned.actor.captures[lease.id] = {
          blockId: facet.blockId,
          valueOrdinal: facet.valueOrdinal,
          ...(facet.reception ? { reception: facet.reception } : {}),
        };
      });
    }
  }
  for (const id of Object.keys(owned.actor.captures))
    if (id.startsWith('perception-lease-') && !keep.has(id)) delete owned.actor.captures[id];
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
    change?: TemporalReceipt['change'];
    confirmedThrough?: number;
  } = {},
): TemporalReceiptLocator | undefined {
  const history = world.experience?.temporal?.actors[actorId];
  const previous =
    options.contextSubjects && observation.facets.length === 1
      ? history?.captures[observation.id]
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
          ...(previous ? { retainedValue: previous } : {}),
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
  if (locator && options.contextSubjects?.length && observation.facets.length === 1) {
    const actor = world.experience!.temporal!.actors[actorId]!;
    const facet = actor.chunks.at(-1)!.receipts.at(-1)!.facets[0]!;
    actor.captures[observation.id] = {
      blockId: facet.blockId,
      valueOrdinal: facet.valueOrdinal,
      ...(facet.reception ? { reception: facet.reception } : {}),
      confirmedThrough: Math.max(
        previous?.confirmedThrough ?? 0,
        options.confirmedThrough ?? observation.facets[0]!.measuredThrough,
      ),
      contextSubjects: [
        ...new Set([...(previous?.contextSubjects ?? []), ...options.contextSubjects]),
      ],
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
    const held = actor.captures[observation.id];
    if (
      !held?.contextSubjects?.length ||
      through <= (held.confirmedThrough ?? observation.acquiredAt)
    )
      continue;
    captureTemporalObservation(world, actorId, observation, [observation.id], false, policy, {
      contextSubjects: held.contextSubjects,
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
  subjects: readonly string[],
): void {
  touchNativeEvidence(world, 'temporal', actorId);
  const actor = world.experience?.temporal?.actors[actorId];
  if (!actor) return;
  for (const [id, capture] of Object.entries(actor.captures)) {
    if (!id.startsWith('perception-observation-')) continue;
    if (!active.has(id)) delete actor.captures[id];
    else capture.contextSubjects = [...subjects];
  }
}

/** A deduplication watermark grants no retention of a mixed shared source block.
 * The repository calls this only after proving no retained receipt owns the block. */
export function clearTemporalCaptureReferences(
  world: WorldState,
  blockIds: ReadonlySet<string>,
): void {
  touchNativeEvidence(world, 'temporal');
  if (!blockIds.size) return;
  for (const actor of Object.values(world.experience?.temporal?.actors ?? {}))
    for (const [key, reference] of Object.entries(actor.captures))
      if (blockIds.has(reference.blockId)) {
        delete actor.captures[key];
        actor.capturesInvalidated = true;
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
  actor.maintenanceDue = false;
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
  const removed = chunk.receipts.filter((receipt) => ordinals.has(receipt.ordinal));
  if (!removed.length) return;
  touchNativeEvidence(world, 'temporal', actorId);
  const oldBytes = chunk.bytes,
    oldCount = chunk.count;
  chunk.receipts = chunk.receipts.filter((receipt) => !ordinals.has(receipt.ordinal));
  if (chunk.receipts.length) refreshChunk(chunk, temporal, world);
  else actor.chunks = actor.chunks.filter((value) => value.id !== chunkId);
  actor.bytes -= oldBytes - (chunk.receipts.length ? chunk.bytes : 0);
  actor.count -= oldCount - chunk.receipts.length;
  actor.releasedThrough = Math.max(
    actor.releasedThrough ?? 0,
    ...removed.map((receipt) => receipt.at),
  );
  actor.nextDue = nextDue;
  const policy = selectedTemporalPolicy(world).recent;
  actor.maintenanceDue =
    actor.bytes > policy.maxBytes ||
    actor.count > policy.maxChanges ||
    (nextDue !== null && nextDue <= world.simTime);
}

export interface TemporalHistorySelection {
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
  limit?: number;
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
  const temporal = world.experience?.temporal;
  const actor = temporal?.actors[actorId];
  if (!temporal || !actor) return { entries: [], incomplete: true };
  const limit = query.limit ?? 128,
    maxBytes = query.bytes ?? 8192;
  const entries: TemporalHistorySelection['entries'] = [];
  let bytes = 0,
    hasMore = false,
    incomplete =
      actor.releasedThrough !== undefined &&
      (query.from === undefined || query.from <= actor.releasedThrough);
  const subjects = query.subjects ?? (query.subject ? [query.subject] : []);
  const receipts = actor.chunks
    .flatMap((chunk) => (chunk.actorId === actorId ? chunk.receipts : []))
    .filter(
      (receipt) =>
        receipt.actorId === actorId &&
        (!query.cut || temporalReceiptWithinPrefix(receipt, query.cut)) &&
        (!query.measurements ||
          receipt.facets.some(
            (facet) =>
              facet.measuredFrom <= query.measurements!.through &&
              (facet.confirmedThrough ?? facet.measuredThrough) >= query.measurements!.from,
          )) &&
        (query.from === undefined || receipt.at >= query.from) &&
        (query.through === undefined || receipt.at <= query.through) &&
        (!subjects.length ||
          subjects.includes(receipt.subject) ||
          receipt.contextSubjects?.some((subject) => subjects.includes(subject))) &&
        (query.physicalLife === undefined || query.physicalLife === receipt.physicalLife) &&
        (query.epoch === undefined || query.epoch === receipt.epoch) &&
        (!query.before ||
          receipt.at < query.before.at ||
          (receipt.at === query.before.at &&
            (receipt.order < query.before.order ||
              (receipt.order === query.before.order &&
                (receipt.epoch < query.before.epoch ||
                  (receipt.epoch === query.before.epoch &&
                    receipt.ordinal < query.before.ordinal)))))),
    )
    .sort(
      (left, right) =>
        right.at - left.at ||
        right.order - left.order ||
        right.epoch.localeCompare(left.epoch) ||
        right.ordinal - left.ordinal,
    );
  for (const receipt of receipts) {
    const values: TemporalValue[] = [];
    const references: TemporalFacetReference[] = [];
    let missing = false;
    for (const reference of receipt.facets) {
      if (
        query.measurements &&
        (reference.measuredFrom > query.measurements.through ||
          (reference.confirmedThrough ?? reference.measuredThrough) < query.measurements.from)
      )
        continue;
      const fragment = retainedValueAt(world.receivedValues?.sources ?? {}, reference);
      if (!fragment) {
        incomplete = true;
        missing = true;
        continue;
      }
      if (query.kinds && !query.kinds.includes(fragment.kind)) continue;
      const value = materializeTemporalValue(reference, fragment);
      if (!value) {
        incomplete = true;
        missing = true;
        continue;
      }
      values.push(value);
      references.push(reference);
    }
    if (missing || !values.length) continue;
    const selectedReceipt = temporalReceiptForRead(
      selectTemporalReceiptFacets(receipt, references, world.receivedValues?.sources ?? {}, world),
    );
    const size = byteLength({ receipt: selectedReceipt, values });
    if (entries.length >= limit || bytes + size > maxBytes) {
      incomplete = true;
      hasMore = true;
      break;
    }
    if (receipt.change === 'loss' || receipt.change === 'attention-exit') incomplete = true;
    bytes += size;
    entries.push({ receipt: cloneValue(selectedReceipt), values: cloneValue(values) });
  }
  return { entries: entries.reverse(), incomplete: incomplete || entries.length === 0, hasMore };
}

/** Revocation removes this actor's access; a shared body may remain owned by other witnesses. */
export function invalidateTemporalEvidence(
  world: WorldState,
  actorId: string,
  sourceIds: ReadonlySet<string>,
): void {
  touchNativeEvidence(world, 'temporal', actorId);
  const actor = world.experience?.temporal?.actors[actorId];
  if (!actor) return;
  for (const [id, support] of Object.entries(actor.supports ?? {}))
    if (
      sourceIds.has(id) ||
      temporalSupportAliases(support, world).some((source) => sourceIds.has(source))
    )
      releaseTemporalSupport(world, actorId, id);
  for (const chunk of actor.chunks) {
    const removed = chunk.receipts.filter(
      (receipt) =>
        sourceIds.has(receipt.id) ||
        (receipt.sourceIds.some((id) => sourceIds.has(id)) &&
          temporalReceiptAccountAliases(receipt, world.receivedValues?.sources ?? {}, world).some(
            (id) => sourceIds.has(id),
          )),
    );
    if (!removed.length) continue;
    actor.releasedThrough = Math.max(
      actor.releasedThrough ?? 0,
      ...removed.map((receipt) => receipt.at),
    );
    const deleted = new Set(removed.map((receipt) => receipt.ordinal));
    chunk.receipts = chunk.receipts.filter((receipt) => !deleted.has(receipt.ordinal));
    actor.count -= removed.length;
    chunk.count = chunk.receipts.length;
    // Exact stored byte totals are recomputed only for touched resident chunks; cold rows use repository retirement.
    const previousBytes = chunk.bytes;
    refreshChunk(chunk, world.experience!.temporal!, world);
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
}

function refreshChunk(
  chunk: TemporalChunk,
  temporal: TemporalEvidenceState,
  world: WorldState,
): void {
  chunk.subjects = [
    ...new Set(
      chunk.receipts.flatMap((receipt) => [receipt.subject, ...(receipt.contextSubjects ?? [])]),
    ),
  ];
  chunk.sourceIds = [...new Set(chunk.receipts.flatMap((receipt) => receipt.sourceIds))];
  chunk.sourceIds = [
    ...new Set(
      chunk.receipts.flatMap((receipt) =>
        temporalReceiptAliases(receipt, world.receivedValues?.sources ?? {}, world),
      ),
    ),
  ];
  chunk.individualIds = [
    ...new Set(
      chunk.receipts.flatMap((receipt) =>
        temporalReceiptIndividualIds(receipt, world.receivedValues?.sources ?? {}),
      ),
    ),
  ];
  chunk.sourceRefs = [
    ...new Set(chunk.receipts.flatMap((receipt) => receipt.facets.map((facet) => facet.blockId))),
  ];
  chunk.count = chunk.receipts.length;
  if (!chunk.count) {
    // The caller removes this chunk; no stored header remains to charge.
    chunk.bytes = 0;
    return;
  }
  chunk.fromOrdinal = chunk.receipts[0]!.ordinal;
  chunk.throughOrdinal = chunk.receipts.at(-1)!.ordinal;
  chunk.fromAt = chunk.receipts[0]!.at;
  chunk.throughAt = chunk.receipts.at(-1)!.at;
  initialBytes(chunk, () => temporalChunkLogicalBytes(chunk, world.receivedValues?.sources ?? {}));
}

/** Remove a revoked interpretation while preserving independent direct words and measurements. */
export function invalidateTemporalFacets(
  world: WorldState,
  actorId: string,
  revoked: (
    value: TemporalValue,
    reference: TemporalFacetReference,
    receipt: TemporalReceipt,
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
    for (const stored of readOnlyDraftView(chunk.receipts)) {
      const receipt = readOnlyDraftView(stored);
      const facets = receipt.facets.filter((reference) => {
        const fragment = retainedValueAt(world.receivedValues?.sources ?? {}, reference);
        const value = fragment && materializeTemporalValue(reference, fragment);
        if (!value || !revoked(value, reference, receipt)) return true;
        changed = true;
        return false;
      });
      if (facets.length !== receipt.facets.length) {
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
    chunk.receipts = retained;
    refreshChunk(chunk, temporal, world);
    actor.bytes -= previousBytes - chunk.bytes;
    actor.count -= previousCount - chunk.count;
  }
  actor.chunks = actor.chunks.filter((chunk) => chunk.count > 0);
  actor.captures = {};
}

export function temporalSourceIds(receipt: TemporalReceipt): EvidenceSource[] {
  return receipt.facets.flatMap((facet) => (facet.original ? [facet.original.source] : []));
}

/** Resident blocks and sparse selected support share one dependency interpretation. */
export function temporalReceiptAliases(
  receipt: TemporalReceipt,
  sources: ReceivedValueState['sources'],
  world: WorldState,
  selectedFragments?: readonly TemporalFragment[],
): string[] {
  const aliases = new Set([...receipt.sourceIds, receipt.id]);
  const fact = (key: ObservationFactKey) => {
    aliases.add(key.source.id);
    aliases.add(personalFactAlias(key.source.id, key.ordinal));
  };
  const dependencies = (value: TemporalValue) => {
    if (value.kind === 'association')
      for (const id of selectedRecognitionSupportSourceIds(world, value.learningSupport ?? []))
        aliases.add(id);
    if (value.kind !== 'personal-account')
      for (const dependency of sensoryFacetDependencies(value)) {
        aliases.add(dependency.source.id);
        if (dependency.ordinal !== null)
          aliases.add(personalFactAlias(dependency.source.id, dependency.ordinal));
        for (const alias of dependency.aliases) aliases.add(alias);
      }
  };
  for (let index = 0; index < receipt.facets.length; index++) {
    const reference = receipt.facets[index]!;
    aliases.add(personalFactAlias(receipt.id, reference.ordinal));
    if (reference.original) fact(reference.original);
    if (reference.support) {
      fact(reference.support.original);
      aliases.add(reference.support.confirmation.id);
      for (const alias of reference.support.aliases ?? []) aliases.add(alias);
    }
    if (reference.receivedFrom) aliases.add(reference.receivedFrom.id);
    const fragment = selectedFragments
      ? selectedFragments[index]
      : retainedValueAt(sources, reference);
    if (
      !fragment ||
      (fragment.kind !== 'association' &&
        fragment.kind !== 'claim' &&
        fragment.kind !== 'observed-motion' &&
        fragment.kind !== 'physical-boundary')
    )
      continue;
    const value = materializeTemporalValue(reference, fragment);
    if (value) dependencies(value);
  }
  return [...aliases];
}

/** Facet provenance can share the source-lookup list with a real account alias.
 * Correcting that provenance must not turn independent sibling facts into the
 * same account, including when a sparse capsule retains only selected facets. */
export function temporalReceiptAccountAliases(
  receipt: TemporalReceipt,
  sources: ReceivedValueState['sources'],
  world: WorldState,
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
  for (const chunk of actor?.chunks ?? []) for (const receipt of chunk.receipts) add(receipt);
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
  sources: ReceivedValueState['sources'],
  world: WorldState,
): TemporalReceipt {
  if (facets.length === receipt.facets.length) return { ...receipt, facets };
  const retained = new Set([
    ...temporalReceiptAccountAliases(receipt, sources, world),
    ...temporalReceiptAliases({ ...receipt, facets, sourceIds: [] }, sources, world),
  ]);
  return { ...receipt, facets, sourceIds: receipt.sourceIds.filter((id) => retained.has(id)) };
}

/** Sparse support outlives its source block, but keeps the same exact dependency
 * closure. Revocation follows these selected facts, never an unrelated chunk. */
export function temporalSupportAliases(
  capsule: TemporalSupportCapsule,
  world: WorldState,
): string[] {
  return temporalReceiptAliases(capsule.receipt, {}, world, capsule.values);
}

export function temporalReceiptIndividualIds(
  receipt: TemporalReceipt,
  sources: ReceivedValueState['sources'],
): string[] {
  const ids = new Set<string>();
  if (receipt.subjectIdentity?.kind === 'individual') ids.add(receipt.subjectIdentity.individualId);
  for (const reference of receipt.facets) {
    const fragment = retainedValueAt(sources, reference);
    if (!fragment || (fragment.kind !== 'association' && fragment.kind !== 'event')) continue;
    const value = materializeTemporalValue(reference, fragment);
    if (value?.kind === 'association' && value.subject.kind === 'individual')
      ids.add(value.subject.individualId);
    if (value?.kind === 'event' && value.sourceSubject?.kind === 'individual')
      ids.add(value.sourceSubject.individualId);
  }
  return [...ids];
}

export function temporalReceiptForSource(
  world: WorldState,
  actorId: string,
  sourceId: string,
): TemporalReceiptLocator | undefined {
  const chunks = world.experience?.temporal?.actors[actorId]?.chunks ?? [];
  for (let index = chunks.length - 1; index >= 0; index--)
    for (const receipt of chunks[index]!.receipts)
      if (receipt.sourceIds.includes(sourceId))
        return {
          actorId,
          physicalLife: receipt.physicalLife,
          epoch: receipt.epoch,
          ordinal: receipt.ordinal,
        };
  return undefined;
}

/** The same source overlay fences hot and cold exact facts after correction. */
export function temporalFacetEligible(
  world: WorldState,
  actorId: string,
  reference: TemporalFacetReference,
  value: TemporalValue,
): boolean {
  const forgotten = world.experience?.forgotten[actorId] ?? [];
  const corrections = world.experience?.corrections?.[actorId] ?? {};
  const allowed = (id: string) => !forgotten.includes(id) && !Object.hasOwn(corrections, id);
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
    reference.support &&
    (!factAllowed(reference.support.original) ||
      !allowed(reference.support.confirmation.id) ||
      !(reference.support.aliases ?? []).every(allowed))
  )
    return false;
  if (value.kind === 'association')
    return selectedRecognitionSupportSourceIds(world, value.learningSupport ?? []).every(allowed);
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
    const receipts = readOnlyDraftView(chunk.receipts);
    let lower = 0,
      upper = receipts.length - 1;
    while (lower <= upper) {
      const middle = (lower + upper) >>> 1,
        receipt = readOnlyDraftView(receipts[middle]!);
      if (receipt.ordinal < locator.ordinal) lower = middle + 1;
      else if (receipt.ordinal > locator.ordinal) upper = middle - 1;
      else return sameReceiptAddress(receipt, locator) ? receipt : undefined;
    }
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
  const receipt = findTemporalReceipt(actor, locator);
  const selected =
    receipt ??
    (support && sameReceiptAddress(support.receipt, locator) ? support.receipt : undefined);
  if (!selected) return;
  const values: TemporalValue[] = [];
  for (const [index, reference] of selected.facets.entries()) {
    const fragment = receipt
      ? retainedValueAt(world.receivedValues?.sources ?? {}, reference)
      : support?.values[index];
    const value = fragment && materializeTemporalValue(reference, fragment);
    if (!value) return;
    values.push(value);
  }
  return { receipt: cloneValue(temporalReceiptForRead(selected)), values: cloneValue(values) };
}

export function temporalReceiptSource(receipt: TemporalReceipt): EvidenceSource {
  return {
    family: 'native-exposure',
    id: receipt.id,
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
    options.facetOrdinals?.every((ordinal) =>
      prior.receipt.facets.some((facet) => facet.ordinal === ordinal),
    )
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
  if (!receipt) return;
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
  initialBytes(capsule, () => temporalSupportLogicalBytes(capsule));
  ensureExperienceAccounting(world, locator.actorId);
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
  chargeWork({ effects: 1, outputBytes: Math.max(0, capsule.bytes - (prior?.bytes ?? 0)) });
  return capsule;
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
  if (after.count >= limits.maxRecords || after.bytes + replacement.bytes > limits.maxBytes)
    return false;
  if (before.bytes < capsule.bytes || before.count < 1)
    throw new Error('Temporal support counters underflowed.');
  before.bytes -= capsule.bytes;
  before.count--;
  after.bytes += replacement.bytes;
  after.count++;
  actor.supports![receiptId] = replacement;
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
