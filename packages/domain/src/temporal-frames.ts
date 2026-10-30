import { appendSnapshot, isAppendBuffer, readOnlyDraftView } from './draft.js';
import { immutableDataSnapshot, isImmutableData, jsonText } from './records.js';
import type { WorldState } from './types.js';
import type {
  EvidenceSource,
  ObservationFactKey,
  ObservationOrigin,
  ReceivedFacetProof,
  ObservationFrame,
} from './perception-evidence.js';
import type { ObserverSubject } from './knowledge.js';
import type {
  TemporalChunk,
  TemporalFacetReference,
  TemporalReceipt,
  TemporalReception,
  TemporalValueReference,
  TemporalFieldDependencies,
} from './temporal-evidence.js';
import {
  temporalConfirmationReference,
  temporalReceiptId,
  temporalReceiptChangeCount,
  temporalSpatialContextValue,
  temporalValueDependencyAliases,
  temporalValueIndividualId,
} from './temporal-evidence.js';
import { personalFactAlias } from './experience-source.js';
import { receivedValueAt, type ReceivedValueLookup } from './received-values.js';
import type { TemporalReadSource } from './temporal-read-context.js';

/** A chunk is one append collection. Dictionary/frame declarations are written
 * once, so saving a suffix never repeats its starting context. Addresses issued
 * to consumers use acquisition/operation identity, never these storage offsets. */
interface DictionaryKinds {
  text: string;
  identity: ObserverSubject;
  source: EvidenceSource;
  fact: ObservationFactKey;
  proof: ReceivedFacetProof;
  origin: ObservationOrigin;
  reception: TemporalReception;
  detail: NonNullable<TemporalFacetReference['detailSupport']>;
  view: ObservationFrame;
}
type DictionaryValue = {
  [K in keyof DictionaryKinds]: { kind: K; value: DictionaryKinds[K] };
}[keyof DictionaryKinds];
type PackedEvidenceSource = EvidenceSource extends infer S
  ? S extends EvidenceSource
    ? Omit<S, 'observer'> & { observer?: S['observer'] }
    : never
  : never;
interface StoredDictionaryKinds
  extends Omit<DictionaryKinds, 'source' | 'fact' | 'proof' | 'detail'> {
  source: PackedEvidenceSource;
  fact: { source: number; ordinal: number };
  proof: {
    original: number;
    confirmation: number;
    confirmedFrom: number;
    confirmedThrough: number;
    aliases?: string[];
  };
  detail: { proof: number; from: number; through: number; acquiredAt: number };
}
type StoredDictionaryValue = {
  [K in keyof StoredDictionaryKinds]: { kind: K; value: StoredDictionaryKinds[K] };
}[keyof StoredDictionaryKinds];
/** The only nested declaration links. Their strictly descending kinds bound
 * decoding and SQL closure to source <- fact <- proof <- detail. */
export const TEMPORAL_DICTIONARY_REFERENCE_FIELDS = {
  fact: { source: 'source' },
  proof: { original: 'fact', confirmation: 'source' },
  detail: { proof: 'proof' },
} as const;
export interface TemporalPackedFacet {
  value: readonly [block: number, ordinal: number];
  pose?: readonly [block: number, ordinal: number];
  ordinal?: number;
  role?: Exclude<TemporalFacetReference['role'], 'direct'>;
  at?: number;
  from?: number;
  through?: number;
  acquired?: number;
  confirmed?: number;
  original?: number;
  source?: number;
  support?: number;
  reception?: number;
  details?: number;
  poseFrame?: number;
}
export interface TemporalConfirmation {
  subject: string;
  reference: TemporalValueReference;
  reception?: TemporalReception;
  original: ObservationFactKey;
  confirmation: EvidenceSource;
  from: number;
  through: number;
  detailSupport?: TemporalFacetReference['detailSupport'];
}
export interface TemporalPackedConfirmation {
  value: readonly [number, number];
  pose?: readonly [number, number];
  reception?: number;
  original: number;
  source: number;
  from?: number;
  through?: number;
  details?: number;
  ordinal?: number;
}
export interface TemporalConfirmationRead extends TemporalConfirmation {
  entryOrdinal: number;
  fieldOrdinal: number;
  receiptOrdinal: number;
  acquisition: number;
  at: number;
  order: number;
}
export interface TemporalConfirmationDependency {
  subject: string;
  sourceIds: [];
  confirmation: true;
  from: number;
  through: number;
  facets: TemporalFieldDependencies[];
}
function packedEntryFields(entry: TemporalFrameEntry): readonly TemporalPackedFacet[] {
  return entry.kind === 'change' || entry.kind === 'checkpoint'
    ? entry.facets
    : entry.kind === 'confirmation'
      ? entry.subjects.flatMap((subject) => subject.fields)
      : [];
}
export type TemporalFrameEntry =
  | { ordinal: number; kind: 'dictionary'; value: StoredDictionaryValue }
  | {
      ordinal: number;
      kind: 'confirmation';
      frame: number;
      receipt: number;
      order?: number;
      subjects: Array<{ subject: number; fields: TemporalPackedConfirmation[] }>;
    }
  | {
      ordinal: number;
      kind: 'checkpoint';
      frame: number;
      order?: number;
      subject: number;
      availability?: TemporalCheckpointAvailability[];
      facets: TemporalPackedFacet[];
    }
  | {
      ordinal: number;
      kind: 'frame';
      acquisition: number;
      at: number;
      order: number;
      receiverFrame?: ObservationFrame;
      coverageGap?: { from: number; through: number };
    }
  | {
      ordinal: number;
      kind: 'change';
      receipt: number;
      frame: number;
      order?: number;
      subject: number;
      contexts?: number[];
      identity?: number;
      origin?: number;
      change: TemporalReceipt['change'];
      availabilityAt?: number;
      spatialContext?: true;
      required?: true;
      sources?: number[];
      facets: TemporalPackedFacet[];
    };
export type TemporalFrameOwner = Pick<
  TemporalChunk,
  'id' | 'actorId' | 'physicalLife' | 'epoch' | 'entries'
>;
/** Reconstruction state at a real track-entry opportunity, not another
 * acquisition or an address to observations before this chunk's coverage. */
export interface TemporalCheckpoint {
  chunkId: string;
  actorId: string;
  physicalLife: number;
  epoch: string;
  ordinal: number;
  acquisition: number;
  at: number;
  order: number;
  subject: string;
  sourceIds: [];
  facets: TemporalFacetReference[];
  availability?: TemporalCheckpointAvailability[];
}
export interface TemporalCheckpointAvailability {
  reason: 'unavailable' | 'unchecked' | 'released';
  at: number;
  fields: number[];
}
export interface TemporalCheckpointFields {
  subject: string;
  facets: readonly TemporalFacetReference[];
  availability?: TemporalCheckpointAvailability[];
}
export type TemporalCheckpointDraft = Omit<TemporalCheckpoint, 'ordinal'>;
export type TemporalCheckpointBuilder = (
  subjects: ReadonlySet<string>,
  includeFeatures: boolean,
) => readonly TemporalCheckpointFields[];
type TemporalFrameWriter = TemporalFrameOwner & Pick<TemporalChunk, 'nextEntryOrdinal'>;
/** Native writes need only operation metadata. Expanded actor/life/id/proof
 * envelopes are lazy read products of the compact entries, never append input. */
export type TemporalWriteHeader = Omit<
  TemporalReceipt,
  'id' | 'actorId' | 'physicalLife' | 'epoch' | 'facets'
>;
/** The storage query and native materializer share this dependency contract.
 * Queries select declarations; only the native decoder interprets their values. */
export const TEMPORAL_CHANGE_DICTIONARY_FIELDS = ['subject', 'identity', 'origin'] as const;
export const TEMPORAL_CHANGE_DICTIONARY_ARRAY_FIELDS = ['contexts', 'sources'] as const;
export const TEMPORAL_FACET_DICTIONARY_FIELDS = [
  'original',
  'source',
  'support',
  'reception',
  'details',
  'poseFrame',
] as const;
export const TEMPORAL_FACET_REFERENCE_FIELDS = ['value', 'pose'] as const;
interface FrameIndex {
  id: string;
  actorId: string;
  physicalLife: number;
  epoch: string;
  length: number;
  entries: Map<number, TemporalFrameEntry>;
  dictionary: Map<string, number>;
  decodedDictionary: Map<number, DictionaryKinds[keyof DictionaryKinds]>;
  frames: Map<number, number>;
  receipts: Map<number, TemporalReceipt>;
  headers: Map<number, Omit<TemporalReceipt, 'facets'>>;
  operations: Map<number, Extract<TemporalFrameEntry, { kind: 'change' }>>;
  operationOrder: Array<Extract<TemporalFrameEntry, { kind: 'change' }>>;
  checkpoints: Map<number, Extract<TemporalFrameEntry, { kind: 'checkpoint' }>>;
  decodedCheckpoints: Map<number, TemporalCheckpoint>;
  subjects: Set<string>;
  featureScope: boolean;
  confirmations: Map<number, Extract<TemporalFrameEntry, { kind: 'confirmation' }>>;
  references: Map<string, Set<number>>;
}
const indexes = new WeakMap<object, FrameIndex>();
function key(value: StoredDictionaryValue): string {
  return jsonText(value);
}
function dictionary<K extends keyof DictionaryKinds>(
  index: FrameIndex,
  at: number,
  kind: K,
): DictionaryKinds[K] {
  const entry = index.entries.get(at);
  if (entry?.kind !== 'dictionary' || entry.value.kind !== kind)
    throw new Error('Temporal frame has an invalid dictionary reference.');
  const prior = index.decodedDictionary.get(at);
  if (prior !== undefined) return prior as DictionaryKinds[K];
  const stored = entry.value;
  let value: DictionaryKinds[keyof DictionaryKinds];
  switch (stored.kind) {
    case 'source':
      value = {
        ...stored.value,
        observer: stored.value.observer ?? {
          actorId: index.actorId,
          physicalLife: index.physicalLife,
        },
      } as EvidenceSource;
      break;
    case 'fact':
      value = {
        source: dictionary(index, stored.value.source, 'source'),
        ordinal: stored.value.ordinal,
      };
      break;
    case 'proof':
      value = {
        ...stored.value,
        original: dictionary(index, stored.value.original, 'fact'),
        confirmation: dictionary(index, stored.value.confirmation, 'source'),
      };
      break;
    case 'detail':
      value = { ...stored.value, proof: dictionary(index, stored.value.proof, 'proof') };
      break;
    default:
      value = stored.value;
  }
  const complete = immutableDataSnapshot(value, readOnlyDraftView);
  index.decodedDictionary.set(at, complete);
  return complete as DictionaryKinds[K];
}
export function temporalDictionaryDependencies(
  entry: TemporalFrameEntry,
): Array<{ ordinal: number; kind: keyof DictionaryKinds }> {
  if (entry.kind !== 'dictionary') return [];
  switch (entry.value.kind) {
    case 'fact':
      return [
        {
          ordinal: entry.value.value.source,
          kind: TEMPORAL_DICTIONARY_REFERENCE_FIELDS.fact.source,
        },
      ];
    case 'proof':
      return [
        {
          ordinal: entry.value.value.original,
          kind: TEMPORAL_DICTIONARY_REFERENCE_FIELDS.proof.original,
        },
        {
          ordinal: entry.value.value.confirmation,
          kind: TEMPORAL_DICTIONARY_REFERENCE_FIELDS.proof.confirmation,
        },
      ];
    case 'detail':
      return [
        {
          ordinal: entry.value.value.proof,
          kind: TEMPORAL_DICTIONARY_REFERENCE_FIELDS.detail.proof,
        },
      ];
    default:
      return [];
  }
}
export function temporalDictionaryValue(
  chunk: TemporalFrameOwner,
  ordinal: number,
): DictionaryValue {
  const index = frameIndex(readOnlyDraftView(chunk)),
    entry = index.entries.get(ordinal);
  if (entry?.kind !== 'dictionary') throw new Error('Temporal dictionary entry is unavailable.');
  const kind = entry.value.kind;
  return { kind, value: dictionary(index, ordinal, kind) } as DictionaryValue;
}
export function temporalOperationHeader(
  chunk: TemporalFrameOwner,
  entry: Extract<TemporalFrameEntry, { kind: 'change' }>,
): Omit<TemporalReceipt, 'facets'> {
  return operationHeader(chunk, entry, frameIndex(readOnlyDraftView(chunk)));
}
function operationHeader(
  chunk: TemporalFrameOwner,
  entry: Extract<TemporalFrameEntry, { kind: 'change' }>,
  index: FrameIndex,
): Omit<TemporalReceipt, 'facets'> {
  const prior = index.headers.get(entry.receipt);
  if (prior) return prior;
  const frame = index.entries.get(entry.frame);
  if (frame?.kind !== 'frame') throw new Error('Temporal change has no acquisition frame.');
  const header = immutableDataSnapshot<Omit<TemporalReceipt, 'facets'>>({
    id: temporalReceiptId({ epoch: chunk.epoch, ordinal: entry.receipt }),
    actorId: chunk.actorId,
    physicalLife: chunk.physicalLife,
    epoch: chunk.epoch,
    ordinal: entry.receipt,
    acquisition: frame.acquisition,
    at: frame.at,
    order: entry.order ?? frame.order,
    ...(frame.receiverFrame ? { receiverFrame: frame.receiverFrame } : {}),
    ...(frame.coverageGap ? { coverageGap: frame.coverageGap } : {}),
    subject: dictionary(index, entry.subject, 'text'),
    ...(entry.contexts
      ? { contextSubjects: entry.contexts.map((at) => dictionary(index, at, 'text')) }
      : {}),
    ...(entry.identity !== undefined
      ? { subjectIdentity: dictionary(index, entry.identity, 'identity') }
      : {}),
    ...(entry.origin !== undefined ? { origin: dictionary(index, entry.origin, 'origin') } : {}),
    change: entry.change,
    ...(['unchecked', 'loss', 'attention-exit'].includes(entry.change)
      ? { availabilityAt: entry.availabilityAt ?? frame.at }
      : {}),
    required: entry.required === true,
    ...(entry.spatialContext ? { spatialContext: true } : {}),
    sourceIds: (entry.sources ?? []).map((at) => dictionary(index, at, 'text')),
  });
  index.headers.set(entry.receipt, header);
  return header;
}
function decode(
  chunk: TemporalFrameOwner,
  entry: Extract<TemporalFrameEntry, { kind: 'change' }>,
  index: FrameIndex,
): TemporalReceipt {
  const frame = index.entries.get(entry.frame);
  if (frame?.kind !== 'frame') throw new Error('Temporal change has no acquisition frame.');
  return immutableDataSnapshot({
    ...operationHeader(chunk, entry, index),
    facets: decodeFacets(entry.facets, frame, index),
  });
}
/** Header selection precedes field/proof decoding. The index is derived from one
 * bounded page and reused by immutable identity; callers charge each visited
 * operation and decoded field to their existing preparation allowance. */
export function temporalChunkOperations(
  chunk: TemporalFrameOwner,
): readonly Extract<TemporalFrameEntry, { kind: 'change' }>[] {
  return frameIndex(readOnlyDraftView(chunk)).operationOrder;
}
export function temporalChunkCheckpointOperations(
  chunk: TemporalFrameOwner,
): Iterable<Extract<TemporalFrameEntry, { kind: 'checkpoint' }>> {
  return frameIndex(readOnlyDraftView(chunk)).checkpoints.values();
}
export function temporalOperationFacet(
  chunk: TemporalFrameOwner,
  entry: Extract<TemporalFrameEntry, { kind: 'change' | 'checkpoint' }>,
  position: number,
): TemporalFacetReference {
  const index = frameIndex(readOnlyDraftView(chunk)),
    frame = index.entries.get(entry.frame),
    facet = entry.facets[position];
  if (frame?.kind !== 'frame' || !facet)
    throw new Error('Temporal operation has no selected field.');
  return decodeFacets([{ ...facet, ordinal: facet.ordinal ?? position }], frame, index)[0]!;
}
export function temporalCheckpointHeader(
  chunk: TemporalFrameOwner,
  entry: Extract<TemporalFrameEntry, { kind: 'checkpoint' }>,
): Omit<TemporalCheckpoint, 'facets'> {
  const index = frameIndex(readOnlyDraftView(chunk)),
    frame = index.entries.get(entry.frame);
  if (frame?.kind !== 'frame') throw new Error('Temporal checkpoint has no entry frame.');
  return {
    chunkId: chunk.id,
    actorId: chunk.actorId,
    physicalLife: chunk.physicalLife,
    epoch: chunk.epoch,
    ordinal: entry.ordinal,
    acquisition: frame.acquisition,
    at: frame.at,
    order: entry.order ?? frame.order,
    subject: dictionary(index, entry.subject, 'text'),
    sourceIds: [],
    ...(entry.availability?.length ? { availability: entry.availability } : {}),
  };
}
function decodeFacets(
  facets: readonly TemporalPackedFacet[],
  frame: Extract<TemporalFrameEntry, { kind: 'frame' }>,
  index: FrameIndex,
): TemporalFacetReference[] {
  return facets.map((facet, ordinal): TemporalFacetReference => {
    const reception: TemporalReception | undefined = facet.pose
      ? { kind: 'body', poseRef: [dictionary(index, facet.pose[0], 'text'), facet.pose[1]] }
      : facet.reception !== undefined
        ? dictionary(index, facet.reception, 'reception')
        : undefined;
    const poseFrame =
      facet.poseFrame !== undefined
        ? dictionary(index, facet.poseFrame, 'view')
        : reception?.kind === 'body'
          ? frame.receiverFrame
          : undefined;
    return {
      blockId: dictionary(index, facet.value[0], 'text'),
      valueOrdinal: facet.value[1],
      ordinal: facet.ordinal ?? ordinal,
      role: facet.role ?? 'direct',
      asOf: facet.at ?? frame.at,
      measuredThrough: facet.through ?? frame.at,
      measuredFrom: facet.from ?? facet.through ?? frame.at,
      acquiredAt: facet.acquired ?? frame.at,
      ...(facet.confirmed !== undefined ? { confirmedThrough: facet.confirmed } : {}),
      ...(facet.original !== undefined
        ? { original: dictionary(index, facet.original, 'fact') }
        : {}),
      ...(facet.source !== undefined
        ? { receivedFrom: dictionary(index, facet.source, 'source') }
        : {}),
      ...(facet.support !== undefined
        ? { support: dictionary(index, facet.support, 'proof') }
        : {}),
      ...(facet.details !== undefined
        ? { detailSupport: dictionary(index, facet.details, 'detail') }
        : {}),
      ...(reception ? { reception } : {}),
      ...(poseFrame ? { poseFrame } : {}),
    };
  });
}
function decodedCheckpoint(
  chunk: TemporalFrameOwner,
  entry: Extract<TemporalFrameEntry, { kind: 'checkpoint' }>,
  index: FrameIndex,
): TemporalCheckpoint {
  let checkpoint = index.decodedCheckpoints.get(entry.ordinal);
  if (!checkpoint) {
    const frame = index.entries.get(entry.frame);
    if (frame?.kind !== 'frame') throw new Error('Temporal checkpoint has no entry frame.');
    checkpoint = immutableDataSnapshot({
      chunkId: chunk.id,
      actorId: chunk.actorId,
      physicalLife: chunk.physicalLife,
      epoch: chunk.epoch,
      ordinal: entry.ordinal,
      acquisition: frame.acquisition,
      at: frame.at,
      order: entry.order ?? frame.order,
      subject: dictionary(index, entry.subject, 'text'),
      sourceIds: [],
      facets: decodeFacets(entry.facets, frame, index),
      ...(entry.availability?.length ? { availability: entry.availability } : {}),
    });
    index.decodedCheckpoints.set(entry.ordinal, checkpoint);
  }
  return checkpoint;
}
function frameIndex(chunk: TemporalFrameOwner): FrameIndex {
  const entries = readOnlyDraftView(chunk.entries);
  const reusable = isImmutableData(entries) || isAppendBuffer(entries);
  let index = reusable ? indexes.get(entries) : undefined;
  if (
    index &&
    (index.id !== chunk.id ||
      index.actorId !== chunk.actorId ||
      index.physicalLife !== chunk.physicalLife ||
      index.epoch !== chunk.epoch)
  )
    index = undefined;
  if (!index)
    index = {
      id: chunk.id,
      actorId: chunk.actorId,
      physicalLife: chunk.physicalLife,
      epoch: chunk.epoch,
      length: 0,
      entries: new Map(),
      dictionary: new Map(),
      decodedDictionary: new Map(),
      frames: new Map(),
      receipts: new Map(),
      headers: new Map(),
      operations: new Map(),
      operationOrder: [],
      checkpoints: new Map(),
      decodedCheckpoints: new Map(),
      subjects: new Set(),
      featureScope: false,
      confirmations: new Map(),
      references: new Map(),
    };
  for (let at = index.length; at < entries.length; at++) {
    const entry = readOnlyDraftView(entries[at]!);
    if (index.entries.has(entry.ordinal)) throw new Error('Duplicate temporal storage ordinal.');
    index.entries.set(entry.ordinal, entry);
    if (entry.kind === 'dictionary') index.dictionary.set(key(entry.value), entry.ordinal);
    else if (entry.kind === 'frame') {
      if (index.frames.has(entry.acquisition))
        throw new Error('Duplicate acquisition in temporal chunk.');
      index.frames.set(entry.acquisition, entry.ordinal);
    } else if (entry.kind === 'change') {
      if (index.operations.has(entry.receipt)) throw new Error('Duplicate temporal operation.');
      index.operations.set(entry.receipt, entry);
      index.operationOrder.push(entry);
    } else if (entry.kind === 'checkpoint') {
      index.checkpoints.set(entry.ordinal, entry);
    } else if (entry.kind === 'confirmation') {
      index.confirmations.set(entry.ordinal, entry);
    } else throw new Error('Unsupported temporal frame entry.');
  }
  // A narrowed older operation may refer to newly appended declarations. Index
  // the complete immutable declaration set before resolving any references.
  for (let at = index.length; at < entries.length; at++) {
    const entry = readOnlyDraftView(entries[at]!);
    if (entry.kind !== 'change' && entry.kind !== 'checkpoint' && entry.kind !== 'confirmation')
      continue;
    if (entry.kind === 'confirmation')
      for (const group of entry.subjects)
        index.subjects.add(dictionary(index, group.subject, 'text'));
    else index.subjects.add(dictionary(index, entry.subject, 'text'));
    if (entry.kind === 'change') {
      for (const subject of entry.contexts ?? [])
        index.subjects.add(dictionary(index, subject, 'text'));
      index.featureScope ||=
        entry.spatialContext === true ||
        !!entry.contexts?.length ||
        entry.change === 'receiver-frame' ||
        entry.facets.some(
          (facet) =>
            !!facet.pose ||
            facet.poseFrame !== undefined ||
            (facet.reception !== undefined &&
              ['body', 'location'].includes(dictionary(index, facet.reception, 'reception').kind)),
        );
    }
    for (const facet of packedEntryFields(entry))
      for (const field of TEMPORAL_FACET_REFERENCE_FIELDS) {
        const reference = facet[field];
        if (!reference) continue;
        const blockId = dictionary(index, reference[0], 'text');
        let ordinals = index.references.get(blockId);
        if (!ordinals) index.references.set(blockId, (ordinals = new Set()));
        ordinals.add(reference[1]);
      }
    index.featureScope ||= packedEntryFields(entry).some(
      (field) => !!field.pose || field.poseFrame !== undefined || field.reception !== undefined,
    );
  }
  index.length = entries.length;
  if (reusable) indexes.set(entries, index);
  return index;
}
function decodedReceipt(
  chunk: TemporalFrameOwner,
  entry: Extract<TemporalFrameEntry, { kind: 'change' }>,
  index: FrameIndex,
): TemporalReceipt {
  let receipt = index.receipts.get(entry.receipt);
  if (!receipt) {
    receipt = decode(chunk, entry, index);
    index.receipts.set(entry.receipt, receipt);
  }
  return receipt;
}
/** Pure read products. No reader appends evidence or resolves hidden world data. */
export function temporalChunkReceipts(chunk: TemporalFrameOwner): TemporalReceipt[] {
  const index = frameIndex(readOnlyDraftView(chunk));
  return [...index.operations.values()].map((entry) => decodedReceipt(chunk, entry, index));
}
export function temporalChunkReceipt(
  chunk: TemporalFrameOwner,
  ordinal: number,
): TemporalReceipt | undefined {
  const index = frameIndex(readOnlyDraftView(chunk)),
    entry = index.operations.get(ordinal);
  return entry && decodedReceipt(chunk, entry, index);
}
/** Capture watermarks need only exact value/reception addresses. Do not decode
 * all proof dictionaries, or every prior receipt in the chunk, to retain them. */
export function temporalReceiptValues(
  chunk: TemporalFrameOwner,
  ordinal: number,
): Array<TemporalValueReference & { reception?: TemporalReception }> {
  const index = frameIndex(readOnlyDraftView(chunk)),
    entry = index.operations.get(ordinal);
  if (!entry) return [];
  return entry.facets.map((facet) => ({
    blockId: dictionary(index, facet.value[0], 'text'),
    valueOrdinal: facet.value[1],
    ...(facet.pose
      ? {
          reception: {
            kind: 'body' as const,
            poseRef: [dictionary(index, facet.pose[0], 'text'), facet.pose[1]] as const,
          },
        }
      : facet.reception !== undefined
        ? { reception: dictionary(index, facet.reception, 'reception') }
        : {}),
  }));
}
export function temporalEntryCheckpoints(
  chunk: TemporalFrameOwner,
  entries: readonly TemporalFrameEntry[] = chunk.entries,
): TemporalCheckpoint[] {
  const index = frameIndex(readOnlyDraftView(chunk));
  return entries.flatMap((entry) =>
    entry.kind === 'checkpoint' ? [decodedCheckpoint(chunk, entry, index)] : [],
  );
}
export function temporalChunkCheckpoint(
  chunk: TemporalFrameOwner,
  ordinal: number,
): TemporalCheckpoint | undefined {
  const index = frameIndex(readOnlyDraftView(chunk)),
    entry = index.checkpoints.get(ordinal);
  return entry && decodedCheckpoint(chunk, entry, index);
}
export function temporalChunkConfirmationOperations(
  chunk: TemporalFrameOwner,
): Iterable<Extract<TemporalFrameEntry, { kind: 'confirmation' }>> {
  return frameIndex(readOnlyDraftView(chunk)).confirmations.values();
}
export function temporalConfirmationHeader(
  chunk: TemporalFrameOwner,
  entry: Extract<TemporalFrameEntry, { kind: 'confirmation' }>,
) {
  return confirmationHeader(frameIndex(readOnlyDraftView(chunk)), entry);
}
function confirmationHeader(
  index: FrameIndex,
  entry: Extract<TemporalFrameEntry, { kind: 'confirmation' }>,
) {
  const frame = index.entries.get(entry.frame);
  if (frame?.kind !== 'frame') throw new Error('Temporal confirmation has no acquisition frame.');
  return {
    entryOrdinal: entry.ordinal,
    receiptOrdinal: entry.receipt,
    acquisition: frame.acquisition,
    at: frame.at,
    order: entry.order ?? frame.order,
  };
}
export function temporalConfirmationSubject(
  chunk: TemporalFrameOwner,
  entry: Extract<TemporalFrameEntry, { kind: 'confirmation' }>,
  group: number,
): string {
  const value = entry.subjects[group];
  if (!value) throw new Error('Temporal confirmation has no subject.');
  return dictionary(frameIndex(readOnlyDraftView(chunk)), value.subject, 'text');
}
export function temporalConfirmationField(
  chunk: TemporalFrameOwner,
  entry: Extract<TemporalFrameEntry, { kind: 'confirmation' }>,
  group: number,
  position: number,
): TemporalConfirmationRead {
  return confirmationField(frameIndex(readOnlyDraftView(chunk)), entry, group, position);
}
function confirmationField(
  index: FrameIndex,
  entry: Extract<TemporalFrameEntry, { kind: 'confirmation' }>,
  group: number,
  position: number,
): TemporalConfirmationRead {
  const value = entry.subjects[group],
    field = value?.fields[position];
  if (!value || !field) throw new Error('Temporal confirmation has no selected field.');
  const header = confirmationHeader(index, entry),
    fieldOrdinal =
      field.ordinal ??
      entry.subjects.slice(0, group).reduce((sum, value) => sum + value.fields.length, 0) +
        position;
  const reception: TemporalReception | undefined = field.pose
    ? { kind: 'body', poseRef: [dictionary(index, field.pose[0], 'text'), field.pose[1]] }
    : field.reception !== undefined
      ? dictionary(index, field.reception, 'reception')
      : undefined;
  return {
    ...header,
    fieldOrdinal,
    subject: dictionary(index, value.subject, 'text'),
    reference: { blockId: dictionary(index, field.value[0], 'text'), valueOrdinal: field.value[1] },
    ...(reception ? { reception } : {}),
    original: dictionary(index, field.original, 'fact'),
    confirmation: dictionary(index, field.source, 'source'),
    from: field.from ?? header.at,
    through: field.through ?? header.at,
    ...(field.details !== undefined
      ? { detailSupport: dictionary(index, field.details, 'detail') }
      : {}),
  };
}
export function temporalEntryConfirmations(
  chunk: TemporalFrameOwner,
  entries: readonly TemporalFrameEntry[] = chunk.entries,
): TemporalConfirmationRead[] {
  return entryConfirmations(frameIndex(readOnlyDraftView(chunk)), entries);
}
/** Select a track before decoding its field proofs. One synchronous visit also
 * shares preparation for mutable/cold chunks, whose identity is not reusable. */
export function visitTemporalConfirmations(
  chunk: TemporalFrameOwner,
  selected: (subject: string, receiptOrdinal: number) => boolean,
  visit: (value: TemporalConfirmationRead) => void,
): void {
  const index = frameIndex(readOnlyDraftView(chunk));
  for (const entry of chunk.entries) {
    if (entry.kind !== 'confirmation') continue;
    for (let group = 0; group < entry.subjects.length; group++) {
      const subject = entry.subjects[group]!;
      if (!selected(dictionary(index, subject.subject, 'text'), entry.receipt)) continue;
      for (let field = 0; field < subject.fields.length; field++)
        visit(confirmationField(index, entry, group, field));
    }
  }
}
function entryConfirmations(
  index: FrameIndex,
  entries: readonly TemporalFrameEntry[],
): TemporalConfirmationRead[] {
  // Cold/raw chunks deliberately have no reusable identity cache. One synchronous
  // read still shares its prepared declarations across every selected field.
  return entries.flatMap((entry) =>
    entry.kind === 'confirmation'
      ? entry.subjects.flatMap((group, g) =>
          group.fields.map((_, p) => confirmationField(index, entry, g, p)),
        )
      : [],
  );
}
export function temporalConfirmationForFacet(
  chunk: TemporalFrameOwner,
  reference: TemporalFacetReference,
): TemporalConfirmationRead | undefined {
  const support = reference.support;
  if (!support) return;
  const same = (a: object | undefined, b: object | undefined) =>
    a === b || (!!a && !!b && jsonText(a) === jsonText(b));
  const values = temporalEntryConfirmations(chunk);
  for (let index = values.length - 1; index >= 0; index--) {
    const value = values[index]!;
    if (
      value.reference.blockId === reference.blockId &&
      value.reference.valueOrdinal === reference.valueOrdinal &&
      same(value.reception, reference.reception) &&
      same(value.original, reference.original) &&
      same(value.original, support.original) &&
      same(value.confirmation, support.confirmation) &&
      value.from === support.confirmedFrom &&
      value.through === support.confirmedThrough &&
      (reference.confirmedThrough === undefined || reference.confirmedThrough === value.through) &&
      (!value.detailSupport || same(value.detailSupport, reference.detailSupport))
    )
      return value;
  }
  return;
}
export function temporalConfirmationChangeCount(entries: readonly TemporalFrameEntry[]): number {
  return entries.reduce(
    (count, entry) =>
      count +
      (entry.kind === 'confirmation'
        ? entry.subjects.reduce((n, subject) => n + subject.fields.length, 0)
        : 0),
    0,
  );
}
function confirmationDependencies(value: TemporalConfirmationRead): TemporalConfirmationDependency {
  return {
    subject: value.subject,
    sourceIds: [],
    confirmation: true,
    from: value.from,
    through: value.through,
    facets: [temporalConfirmationReference(value)],
  };
}
export function temporalCheckpointForRead(checkpoint: TemporalCheckpoint): TemporalCheckpoint {
  if (!checkpoint.facets.some((facet) => facet.reception !== undefined)) return checkpoint;
  return {
    ...checkpoint,
    facets: checkpoint.facets.map(({ reception: _reception, ...facet }) => facet),
  };
}
/** Every persisted state dependency uses this visitor, including reconstruction
 * fields that are intentionally absent from the occurrence/receipt index. */
export function temporalEntryDependencies(
  chunk: TemporalFrameOwner,
  entries: readonly TemporalFrameEntry[] = chunk.entries,
): Array<TemporalReceipt | TemporalCheckpoint | TemporalConfirmationDependency> {
  const index = frameIndex(readOnlyDraftView(chunk));
  return entries.flatMap<TemporalReceipt | TemporalCheckpoint | TemporalConfirmationDependency>(
    (entry) =>
      entry.kind === 'confirmation'
        ? entryConfirmations(index, [entry]).map(confirmationDependencies)
        : entry.kind === 'checkpoint'
          ? [decodedCheckpoint(chunk, entry, index)]
          : entry.kind === 'change'
            ? [decodedReceipt(chunk, entry, index)]
            : [],
  );
}

export interface TemporalEntryMetadata {
  /** Native logical bounds/count; physical index consumers omit these fields. */
  firstAt: number | undefined;
  lastAt: number | undefined;
  changes: number;
  firstOrder: number | undefined;
  lastOrder: number | undefined;
  firstMeasured: number;
  lastSupported: number;
  confirmations: number;
  spatialContext: boolean;
  ordinals: number[];
  references: Record<string, number[]>;
  subjects: string[];
  sourceIds: string[];
  individualIds: string[];
  sourceRefs: string[];
}

/** One synchronous read prepares declarations once, then visits only packed
 * scalar metadata. Storage indexing must not reconstruct received accounts or
 * clone proof trees merely to recover their IDs. The optional source context is
 * required for complete value-owned aliases and validates exact value closure.
 * docs/projects/attention-and-scenes-runtime-design.md#61-segmented-physical-layout */
export function temporalEntryMetadataReader(
  chunk: TemporalFrameOwner,
  context?: { sources: ReceivedValueLookup; world: TemporalReadSource },
): (entries: readonly TemporalFrameEntry[]) => TemporalEntryMetadata {
  const index = frameIndex(readOnlyDraftView(chunk));
  const declaration = <K extends keyof StoredDictionaryKinds>(at: number, kind: K) => {
    const entry = index.entries.get(at);
    if (entry?.kind !== 'dictionary' || entry.value.kind !== kind)
      throw new Error('Temporal frame has an invalid dictionary reference.');
    return entry.value.value as StoredDictionaryKinds[K];
  };
  const text = (at: number) => declaration(at, 'text');
  const valueAliases = new Map<object, string[]>();
  return (entries) => {
    const subjects = new Set<string>(),
      aliases = new Set<string>(),
      individuals = new Set<string>(),
      references = new Map<string, Set<number>>(),
      ordinals: number[] = [];
    let firstAt: number | undefined,
      lastAt: number | undefined,
      changes = 0,
      firstOrder: number | undefined,
      lastOrder: number | undefined,
      firstMeasured = Infinity,
      lastSupported = -Infinity,
      confirmations = 0,
      spatialContext = false;
    const source = (at: number) => declaration(at, 'source').id;
    const fact = (at: number) => {
      const value = declaration(at, 'fact'),
        id = source(value.source);
      aliases.add(id);
      aliases.add(personalFactAlias(id, value.ordinal));
    };
    const proof = (at: number) => {
      const value = declaration(at, 'proof');
      fact(value.original);
      aliases.add(source(value.confirmation));
      for (const alias of value.aliases ?? []) aliases.add(alias);
    };
    const reference = (block: string, ordinal: number) => {
      let values = references.get(block);
      if (!values) references.set(block, (values = new Set()));
      values.add(ordinal);
      const fragment =
        context && receivedValueAt(context.sources, { blockId: block, valueOrdinal: ordinal });
      if (context && !fragment)
        throw new Error('Receipt page index requires complete received source support.');
      return fragment;
    };
    const field = (
      value: TemporalPackedFacet | TemporalPackedConfirmation,
      receiptId?: string,
      ordinal?: number,
      confirmation = false,
    ) => {
      const fragment = reference(text(value.value[0]), value.value[1]);
      const reception =
        value.reception === undefined ? undefined : declaration(value.reception, 'reception');
      if (value.pose) reference(text(value.pose[0]), value.pose[1]);
      else if (reception?.kind === 'body' && reception.poseRef)
        reference(reception.poseRef[0], reception.poseRef[1]);
      if (receiptId !== undefined && ordinal !== undefined)
        aliases.add(personalFactAlias(receiptId, ordinal));
      if (value.original !== undefined) fact(value.original);
      if ('support' in value && value.support !== undefined) proof(value.support);
      // A confirmation's implicit field proof precedes independent detail
      // support. Preserve that canonical alias order without building the proof.
      if (confirmation && value.source !== undefined) aliases.add(source(value.source));
      if (value.details !== undefined) proof(declaration(value.details, 'detail').proof);
      if (!confirmation && value.source !== undefined) aliases.add(source(value.source));
      if (fragment && context) {
        spatialContext ||= temporalSpatialContextValue(fragment);
        // Only these complete scalar fragments have value-owned aliases or
        // identity. Geometry reception does not authorize an unrelated value.
        if (
          !value.pose &&
          reception === undefined &&
          (fragment.kind === 'association' ||
            fragment.kind === 'claim' ||
            fragment.kind === 'physical-boundary' ||
            fragment.kind === 'event')
        ) {
          let held = valueAliases.get(fragment);
          if (!held) {
            held = temporalValueDependencyAliases(fragment, context.world);
            valueAliases.set(fragment, held);
          }
          for (const alias of held) aliases.add(alias);
          const individual = temporalValueIndividualId(fragment);
          if (individual !== undefined) individuals.add(individual);
        }
      }
    };
    for (const entry of entries) {
      if (entry.kind !== 'change' && entry.kind !== 'checkpoint' && entry.kind !== 'confirmation')
        continue;
      const frame = index.entries.get(entry.frame);
      if (frame?.kind !== 'frame') throw new Error('Temporal change has no acquisition frame.');
      if (entry.kind === 'confirmation') {
        for (const group of entry.subjects) {
          subjects.add(text(group.subject));
          for (const value of group.fields) {
            confirmations++;
            changes++;
            firstMeasured = Math.min(firstMeasured, value.from ?? frame.at);
            lastSupported = Math.max(lastSupported, value.through ?? frame.at);
            field(value, undefined, undefined, true);
          }
        }
        continue;
      }
      subjects.add(text(entry.subject));
      let receiptId: string | undefined;
      if (entry.kind === 'change') {
        firstAt ??= frame.at;
        lastAt = frame.at;
        changes += temporalReceiptChangeCount(entry);
        firstOrder ??= entry.order ?? frame.order;
        lastOrder = entry.order ?? frame.order;
        ordinals.push(entry.receipt);
        spatialContext ||= entry.spatialContext === true;
        for (const subject of entry.contexts ?? []) subjects.add(text(subject));
        for (const alias of entry.sources ?? []) aliases.add(text(alias));
        receiptId = temporalReceiptId({ epoch: chunk.epoch, ordinal: entry.receipt });
        aliases.add(receiptId);
        if (entry.identity !== undefined) {
          const identity = declaration(entry.identity, 'identity');
          if (identity.kind === 'individual') individuals.add(identity.individualId);
        }
        if (!entry.facets.length) {
          firstMeasured = Math.min(firstMeasured, frame.at);
          lastSupported = Math.max(lastSupported, frame.at);
        }
      }
      for (let position = 0; position < entry.facets.length; position++) {
        const value = entry.facets[position]!;
        if (entry.kind === 'change') {
          firstMeasured = Math.min(firstMeasured, value.from ?? value.through ?? frame.at);
          lastSupported = Math.max(lastSupported, value.confirmed ?? value.through ?? frame.at);
        }
        field(value, receiptId, value.ordinal ?? position);
      }
    }
    return {
      firstAt,
      lastAt,
      changes,
      firstOrder,
      lastOrder,
      firstMeasured: Number.isFinite(firstMeasured) ? firstMeasured : 0,
      lastSupported: Number.isFinite(lastSupported) ? lastSupported : 0,
      confirmations,
      spatialContext,
      ordinals,
      references: Object.fromEntries(
        [...references].map(([block, ordinals]) => [block, [...ordinals].sort((a, b) => a - b)]),
      ),
      subjects: [...subjects],
      sourceIds: [...aliases],
      individualIds: [...individuals],
      sourceRefs: [...references.keys()],
    };
  };
}
/** Exact self-contained physical closure for one personal operation. This never
 * includes unrelated observations merely because they share a storage page. */
export function projectTemporalOperation(
  entry: TemporalFrameEntry,
  facetOrdinals: readonly number[],
): TemporalFrameEntry {
  if (entry.kind === 'confirmation') {
    const selected = new Set(facetOrdinals);
    let next = 0;
    return {
      ...entry,
      subjects: entry.subjects.flatMap((group) => {
        const fields = group.fields.flatMap((field) => {
          const ordinal = field.ordinal ?? next;
          next++;
          return selected.has(ordinal) ? [{ ...field, ordinal }] : [];
        });
        return fields.length ? [{ ...group, fields }] : [];
      }),
    };
  }
  if (entry.kind !== 'change' && entry.kind !== 'checkpoint') return entry;
  const selected = new Set(facetOrdinals),
    header =
      entry.kind === 'change'
        ? (({ sources: _aliases, ...rest }) => rest)(entry)
        : (({ availability: _availability, ...rest }) => rest)(entry),
    availability =
      entry.kind === 'checkpoint'
        ? entry.availability?.flatMap((row) => {
            const fields = row.fields.filter((field) => selected.has(field));
            return fields.length ? [{ ...row, fields }] : [];
          })
        : undefined;
  return {
    ...header,
    ...(availability?.length ? { availability } : {}),
    facets: entry.facets.flatMap((facet, index) => {
      const ordinal = facet.ordinal ?? index;
      return selected.has(ordinal) ? [{ ...facet, ordinal }] : [];
    }),
  };
}
function entryDependencies(
  index: FrameIndex,
  change: Extract<TemporalFrameEntry, { kind: 'change' | 'checkpoint' | 'confirmation' }>,
): Set<number> {
  const ordinals = new Set<number>([change.ordinal, change.frame]);
  if (change.kind === 'confirmation')
    for (const group of change.subjects) ordinals.add(group.subject);
  else ordinals.add(change.subject);
  if (change.kind === 'change') {
    for (const field of TEMPORAL_CHANGE_DICTIONARY_FIELDS)
      if (change[field] !== undefined) ordinals.add(change[field]);
    for (const field of TEMPORAL_CHANGE_DICTIONARY_ARRAY_FIELDS)
      for (const ordinal of change[field] ?? []) ordinals.add(ordinal);
  }
  for (const facet of packedEntryFields(change)) {
    for (const field of TEMPORAL_FACET_REFERENCE_FIELDS)
      if (facet[field]) ordinals.add(facet[field][0]);
    for (const field of TEMPORAL_FACET_DICTIONARY_FIELDS)
      if (facet[field] !== undefined) ordinals.add(facet[field]);
  }
  // A selected proof brings only its typed declarations. Each dependency kind
  // descends toward a source, so neither a cycle nor an unrelated page is read.
  for (const ordinal of ordinals) {
    const entry = ordinal === change.ordinal ? change : index.entries.get(ordinal);
    if (!entry) throw new Error('Temporal frame declaration is unavailable.');
    for (const dependency of temporalDictionaryDependencies(entry)) {
      const target = index.entries.get(dependency.ordinal);
      if (target?.kind !== 'dictionary' || target.value.kind !== dependency.kind)
        throw new Error('Temporal frame has an invalid nested dictionary reference.');
      ordinals.add(dependency.ordinal);
    }
  }
  return ordinals;
}
export function temporalReceiptEntries(
  chunk: TemporalFrameOwner,
  receiptOrdinal: number,
  facetOrdinals?: readonly number[],
): TemporalFrameEntry[] {
  const index = frameIndex(readOnlyDraftView(chunk)),
    original = index.operations.get(receiptOrdinal);
  if (!original) return [];
  const change = facetOrdinals
    ? (projectTemporalOperation(original, facetOrdinals) as typeof original)
    : original;
  return [...entryDependencies(index, change)]
    .sort((a, b) => a - b)
    .map((ordinal) => (ordinal === change.ordinal ? change : index.entries.get(ordinal)!));
}
export function temporalCheckpointEntries(
  chunk: TemporalFrameOwner,
  ordinal: number,
  facetOrdinals?: readonly number[],
): TemporalFrameEntry[] {
  const index = frameIndex(readOnlyDraftView(chunk)),
    original = index.checkpoints.get(ordinal);
  if (!original) return [];
  const checkpoint = facetOrdinals
    ? (projectTemporalOperation(original, facetOrdinals) as typeof original)
    : original;
  return [...entryDependencies(index, checkpoint)]
    .sort((a, b) => a - b)
    .map((at) => (at === ordinal ? checkpoint : index.entries.get(at)!));
}
export function temporalConfirmationEntries(
  chunk: TemporalFrameOwner,
  ordinal: number,
  fieldOrdinals?: readonly number[],
): TemporalFrameEntry[] {
  const index = frameIndex(readOnlyDraftView(chunk)),
    original = index.confirmations.get(ordinal);
  if (!original) return [];
  const entry = fieldOrdinals
    ? (projectTemporalOperation(original, fieldOrdinals) as typeof original)
    : original;
  return [...entryDependencies(index, entry)]
    .sort((a, b) => a - b)
    .map((at) => (at === ordinal ? entry : index.entries.get(at)!));
}
export function temporalEntryReceipts(
  chunk: TemporalFrameOwner,
  entries: readonly TemporalFrameEntry[],
): TemporalReceipt[] {
  const index = frameIndex(readOnlyDraftView(chunk));
  return entries.flatMap((entry) =>
    entry.kind === 'change' ? [decodedReceipt(chunk, entry, index)] : [],
  );
}
function packFacets(
  fields: readonly TemporalFacetReference[],
  header: Extract<TemporalFrameEntry, { kind: 'frame' }>,
  intern: (value: DictionaryValue) => number,
): TemporalPackedFacet[] {
  return fields.map(
    (facet, at): TemporalPackedFacet => ({
      value: [intern({ kind: 'text', value: facet.blockId }), facet.valueOrdinal],
      ...(facet.ordinal !== at ? { ordinal: facet.ordinal } : {}),
      ...(facet.role !== 'direct' ? { role: facet.role } : {}),
      ...(facet.asOf !== header.at ? { at: facet.asOf } : {}),
      ...(facet.measuredThrough !== header.at ? { through: facet.measuredThrough } : {}),
      ...(facet.measuredFrom !== facet.measuredThrough ? { from: facet.measuredFrom } : {}),
      ...(facet.acquiredAt !== header.at ? { acquired: facet.acquiredAt } : {}),
      ...(facet.confirmedThrough !== undefined ? { confirmed: facet.confirmedThrough } : {}),
      ...(facet.original ? { original: intern({ kind: 'fact', value: facet.original }) } : {}),
      ...(facet.receivedFrom
        ? { source: intern({ kind: 'source', value: facet.receivedFrom }) }
        : {}),
      ...(facet.support ? { support: intern({ kind: 'proof', value: facet.support }) } : {}),
      ...(facet.detailSupport
        ? { details: intern({ kind: 'detail', value: facet.detailSupport }) }
        : {}),
      ...(facet.poseFrame &&
      (!header.receiverFrame || jsonText(facet.poseFrame) !== jsonText(header.receiverFrame))
        ? { poseFrame: intern({ kind: 'view', value: facet.poseFrame }) }
        : {}),
      ...(facet.reception?.kind === 'body' && facet.reception.poseRef
        ? {
            pose: [
              intern({ kind: 'text', value: facet.reception.poseRef[0] }),
              facet.reception.poseRef[1],
            ] as const,
          }
        : facet.reception
          ? { reception: intern({ kind: 'reception', value: facet.reception }) }
          : {}),
    }),
  );
}
function dictionaryWriter(base: FrameIndex, start: number) {
  const additions: TemporalFrameEntry[] = [],
    dictionary = new Map<string, number>(),
    supplied = new Map<DictionaryValue['kind'], WeakMap<object, number>>();
  let ordinal = start;
  const next = () => ordinal++;
  const intern = (value: DictionaryValue): number => {
    // One synchronous writer cannot change its inputs. Repeated references to
    // the same fact/proof therefore need neither recursive packing nor JSON
    // comparison again; equal distinct objects still use the exact dictionary.
    const object = typeof value.value === 'object' ? value.value : undefined;
    let identities = object && supplied.get(value.kind);
    const previous = object && identities?.get(object);
    if (previous !== undefined) return previous;
    if (object && !identities) supplied.set(value.kind, (identities = new WeakMap()));
    let stored: StoredDictionaryValue;
    switch (value.kind) {
      case 'source': {
        const { observer, ...source } = value.value;
        stored = {
          kind: 'source',
          value: {
            ...source,
            ...(observer.actorId === base.actorId && observer.physicalLife === base.physicalLife
              ? {}
              : { observer }),
          } as PackedEvidenceSource,
        };
        break;
      }
      case 'fact':
        stored = {
          kind: 'fact',
          value: {
            source: intern({ kind: 'source', value: value.value.source }),
            ordinal: value.value.ordinal,
          },
        };
        break;
      case 'proof':
        stored = {
          kind: 'proof',
          value: {
            ...value.value,
            original: intern({ kind: 'fact', value: value.value.original }),
            confirmation: intern({ kind: 'source', value: value.value.confirmation }),
          },
        };
        break;
      case 'detail':
        stored = {
          kind: 'detail',
          value: { ...value.value, proof: intern({ kind: 'proof', value: value.value.proof }) },
        };
        break;
      default:
        stored = value;
    }
    const encoded = key(stored),
      known = dictionary.get(encoded) ?? base.dictionary.get(encoded);
    if (known !== undefined) {
      if (object) identities!.set(object, known);
      return known;
    }
    const entry: TemporalFrameEntry = immutableDataSnapshot(
      { ordinal: next(), kind: 'dictionary', value: stored },
      readOnlyDraftView,
    );
    additions.push(entry);
    dictionary.set(encoded, entry.ordinal);
    if (object) identities!.set(object, entry.ordinal);
    return entry.ordinal;
  };
  return { additions, intern, next };
}
function packTemporalReceipt(
  chunk: TemporalFrameWriter,
  receipt: TemporalWriteHeader,
  fields: readonly TemporalFacetReference[],
  base: FrameIndex,
  operationOrdinal?: number,
  checkpoints: readonly TemporalCheckpointFields[] = [],
  confirmations: readonly TemporalConfirmation[] = [],
): TemporalFrameEntry[] {
  const { additions, intern, next } = dictionaryWriter(base, chunk.nextEntryOrdinal);
  let frame = base.frames.get(receipt.acquisition);
  let header =
    frame === undefined
      ? undefined
      : (base.entries.get(frame) as Extract<TemporalFrameEntry, { kind: 'frame' }>);
  if (frame === undefined) {
    const entry: Extract<TemporalFrameEntry, { kind: 'frame' }> = {
      ordinal: next(),
      kind: 'frame',
      acquisition: receipt.acquisition,
      at: receipt.at,
      order: receipt.order,
      ...(receipt.receiverFrame ? { receiverFrame: receipt.receiverFrame } : {}),
      ...(receipt.coverageGap ? { coverageGap: receipt.coverageGap } : {}),
    };
    additions.push(immutableDataSnapshot(entry, readOnlyDraftView));
    frame = entry.ordinal;
    header = entry;
  }
  if (!header) throw new Error('Temporal append has no frame header.');
  const subject = intern({ kind: 'text', value: receipt.subject });
  const contexts = receipt.contextSubjects?.map((value) => intern({ kind: 'text', value }));
  const identity =
    receipt.subjectIdentity && intern({ kind: 'identity', value: receipt.subjectIdentity });
  const origin = receipt.origin && intern({ kind: 'origin', value: receipt.origin });
  const sources = receipt.sourceIds.map((value) => intern({ kind: 'text', value }));

  for (const checkpoint of checkpoints)
    if (checkpoint.facets.length) {
      const subject = intern({ kind: 'text', value: checkpoint.subject }),
        facets = packFacets(checkpoint.facets, header, intern);
      additions.push(
        immutableDataSnapshot({
          ordinal: next(),
          kind: 'checkpoint',
          frame,
          subject,
          facets,
          ...(checkpoint.availability?.length ? { availability: checkpoint.availability } : {}),
          ...(receipt.order !== header.order ? { order: receipt.order } : {}),
        }),
      );
    }
  const facets = packFacets(fields, header, intern);
  if (confirmations.length) {
    const subjects = packConfirmations(confirmations, header, intern);
    additions.push(
      immutableDataSnapshot({
        ordinal: next(),
        kind: 'confirmation',
        frame,
        receipt: receipt.ordinal,
        ...(receipt.order !== header.order ? { order: receipt.order } : {}),
        subjects,
      }),
    );
  }
  additions.push(
    immutableDataSnapshot({
      ordinal: operationOrdinal ?? next(),
      kind: 'change',
      receipt: receipt.ordinal,
      frame,
      subject,
      ...(receipt.order !== header.order ? { order: receipt.order } : {}),
      ...(contexts?.length ? { contexts } : {}),
      ...(identity !== undefined ? { identity } : {}),
      ...(origin !== undefined ? { origin } : {}),
      change: receipt.change,
      ...(receipt.availabilityAt !== undefined && receipt.availabilityAt !== header.at
        ? { availabilityAt: receipt.availabilityAt }
        : {}),
      ...(receipt.spatialContext ? { spatialContext: true } : {}),
      ...(receipt.required ? { required: true } : {}),
      ...(sources.length ? { sources } : {}),
      facets,
    }),
  );

  return additions;
}
function packConfirmations(
  confirmations: readonly TemporalConfirmation[],
  header: Extract<TemporalFrameEntry, { kind: 'frame' }>,
  intern: (value: DictionaryValue) => number,
) {
  const groups = new Map<number, TemporalPackedConfirmation[]>();
  for (const value of confirmations) {
    const subject = intern({ kind: 'text', value: value.subject }),
      fields = groups.get(subject) ?? [];
    if (!groups.has(subject)) groups.set(subject, fields);
    fields.push({
      value: [
        intern({ kind: 'text', value: value.reference.blockId }),
        value.reference.valueOrdinal,
      ],
      original: intern({ kind: 'fact', value: value.original }),
      source: intern({ kind: 'source', value: value.confirmation }),
      ...(value.from !== header.at ? { from: value.from } : {}),
      ...(value.through !== header.at ? { through: value.through } : {}),
      ...(value.detailSupport
        ? { details: intern({ kind: 'detail', value: value.detailSupport }) }
        : {}),
      ...(value.reception?.kind === 'body' && value.reception.poseRef
        ? {
            pose: [
              intern({ kind: 'text', value: value.reception.poseRef[0] }),
              value.reception.poseRef[1],
            ] as const,
          }
        : value.reception
          ? { reception: intern({ kind: 'reception', value: value.reception }) }
          : {}),
      ...('fieldOrdinal' in value
        ? { ordinal: (value as TemporalConfirmationRead).fieldOrdinal }
        : {}),
    });
  }
  return [...groups].map(([subject, fields]) => ({ subject, fields }));
}
export function prepareTemporalFrameReceipt(
  chunk: TemporalFrameWriter,
  receipt: TemporalWriteHeader,
  fields: readonly TemporalFacetReference[],
  buildCheckpoints?: TemporalCheckpointBuilder,
  confirmations: readonly TemporalConfirmation[] = [],
): {
  entries: TemporalFrameEntry[];
  checkpoints: readonly TemporalCheckpointFields[];
  confirmations: readonly TemporalConfirmation[];
} {
  const index = frameIndex(readOnlyDraftView(chunk));
  const subjects = new Set(
    [
      receipt.subject,
      ...(receipt.contextSubjects ?? []),
      ...confirmations.map((value) => value.subject),
    ].filter((subject) => !index.subjects.has(subject)),
  );
  const includeFeatures =
    !index.featureScope &&
    (receipt.spatialContext === true ||
      confirmations.some((value) => value.reception !== undefined) ||
      fields.some((facet) => facet.reception !== undefined || facet.poseFrame !== undefined) ||
      !!receipt.contextSubjects?.length ||
      receipt.change === 'receiver-frame');
  const checkpoints =
    buildCheckpoints && (subjects.size || includeFeatures)
      ? buildCheckpoints(subjects, includeFeatures).filter((checkpoint) => checkpoint.facets.length)
      : [];
  return {
    entries: packTemporalReceipt(
      chunk,
      receipt,
      fields,
      index,
      undefined,
      checkpoints,
      confirmations,
    ),
    checkpoints,
    confirmations,
  };
}
export function temporalChunkReferences(
  chunk: TemporalFrameOwner,
): ReadonlyMap<string, ReadonlySet<number>> {
  return frameIndex(readOnlyDraftView(chunk)).references;
}
export function appendTemporalFrameReceipt(
  chunk: TemporalFrameWriter,
  receipt: TemporalWriteHeader,
  fields: readonly TemporalFacetReference[],
  world?: WorldState,
  prepared?: TemporalFrameEntry[],
): void {
  const entries = readOnlyDraftView(chunk.entries),
    base = frameIndex(readOnlyDraftView(chunk));
  const additions = prepared ?? prepareTemporalFrameReceipt(chunk, receipt, fields).entries;
  for (const entry of additions)
    chunk.nextEntryOrdinal = Math.max(chunk.nextEntryOrdinal, entry.ordinal + 1);
  chunk.entries = appendSnapshot(entries, additions, world) ?? [...entries, ...additions];
  const nextEntries = readOnlyDraftView(chunk.entries);
  const index: FrameIndex =
    nextEntries === entries && isAppendBuffer(entries)
      ? base
      : {
          id: base.id,
          actorId: base.actorId,
          physicalLife: base.physicalLife,
          epoch: base.epoch,
          length: base.length,
          entries: new Map(base.entries),
          dictionary: new Map(base.dictionary),
          decodedDictionary: new Map(base.decodedDictionary),
          frames: new Map(base.frames),
          receipts: new Map(base.receipts),
          headers: new Map(base.headers),
          operations: new Map(base.operations),
          operationOrder: [...base.operationOrder],
          checkpoints: new Map(base.checkpoints),
          decodedCheckpoints: new Map(base.decodedCheckpoints),
          subjects: new Set(base.subjects),
          featureScope: base.featureScope,
          confirmations: new Map(base.confirmations),
          references: new Map(base.references),
        };
  for (const entry of additions) {
    index.entries.set(entry.ordinal, entry);
    if (entry.kind === 'dictionary') index.dictionary.set(key(entry.value), entry.ordinal);
    else if (entry.kind === 'frame') index.frames.set(entry.acquisition, entry.ordinal);
    else if (entry.kind === 'change') {
      index.operations.set(entry.receipt, entry);
      index.operationOrder.push(entry);
    } else if (entry.kind === 'checkpoint') {
      index.checkpoints.set(entry.ordinal, entry);
      index.subjects.add(dictionary(index, entry.subject, 'text'));
    } else {
      index.confirmations.set(entry.ordinal, entry);
      for (const group of entry.subjects)
        index.subjects.add(dictionary(index, group.subject, 'text'));
    }
  }
  const touched = new Set<string>();
  index.subjects.add(receipt.subject);
  for (const subject of receipt.contextSubjects ?? []) index.subjects.add(subject);
  index.featureScope ||=
    receipt.spatialContext === true ||
    fields.some((facet) => facet.reception !== undefined || facet.poseFrame !== undefined) ||
    !!receipt.contextSubjects?.length ||
    receipt.change === 'receiver-frame';
  const packedFields = additions.flatMap(packedEntryFields);
  index.featureScope ||= packedFields.some(
    (field) => !!field.pose || field.reception !== undefined,
  );
  for (const facet of packedFields)
    for (const field of TEMPORAL_FACET_REFERENCE_FIELDS) {
      const packed = facet[field];
      if (!packed) continue;
      const reference = { blockId: dictionary(index, packed[0], 'text'), valueOrdinal: packed[1] };
      let ordinals = index.references.get(reference.blockId);
      if (!touched.has(reference.blockId)) {
        ordinals = new Set(ordinals);
        index.references.set(reference.blockId, ordinals);
        touched.add(reference.blockId);
      }
      ordinals!.add(reference.valueOrdinal);
    }
  index.length = nextEntries.length;
  if (isImmutableData(nextEntries) || isAppendBuffer(nextEntries)) indexes.set(nextEntries, index);
}
/** Correction/prefix expiry rewrites only this bounded chunk; logical personal
 * addresses remain stable and unused dictionary/body metadata actually leaves. */
export function replaceTemporalChunkReceipts(
  chunk: TemporalFrameWriter,
  receipts: readonly TemporalReceipt[],
  _world?: WorldState,
  checkpoints: readonly (TemporalCheckpoint | TemporalCheckpointDraft)[] = temporalEntryCheckpoints(
    chunk,
  ),
  confirmations: readonly TemporalConfirmationRead[] = temporalEntryConfirmations(chunk).filter(
    (value) => receipts.some((receipt) => receipt.ordinal === value.receiptOrdinal),
  ),
): void {
  const base = frameIndex(readOnlyDraftView(chunk));
  const index: FrameIndex = {
    ...base,
    entries: new Map(base.entries),
    dictionary: new Map(base.dictionary),
    decodedDictionary: new Map(base.decodedDictionary),
    frames: new Map(base.frames),
  };
  const changes: Array<
    Extract<TemporalFrameEntry, { kind: 'change' | 'checkpoint' | 'confirmation' }>
  > = [];
  let nextEntryOrdinal = chunk.nextEntryOrdinal;
  for (const receipt of receipts) {
    const original = base.operations.get(receipt.ordinal);
    if (
      original &&
      (decodedReceipt(chunk, original, base) === receipt ||
        jsonText(decodedReceipt(chunk, original, base)) === jsonText(receipt))
    ) {
      changes.push(original);
      continue;
    }
    const additions = packTemporalReceipt(
      { ...chunk, nextEntryOrdinal },
      receipt,
      receipt.facets,
      index,
      original?.ordinal,
    );
    for (const entry of additions) {
      nextEntryOrdinal = Math.max(nextEntryOrdinal, entry.ordinal + 1);
      index.entries.set(entry.ordinal, entry);
      if (entry.kind === 'dictionary') index.dictionary.set(key(entry.value), entry.ordinal);
      else if (entry.kind === 'frame') index.frames.set(entry.acquisition, entry.ordinal);
      else if (entry.kind === 'change' || entry.kind === 'checkpoint') changes.push(entry);
    }
  }
  if (receipts.length)
    for (const checkpoint of checkpoints) {
      const original =
        'ordinal' in checkpoint ? base.checkpoints.get(checkpoint.ordinal) : undefined;
      if (
        ('ordinal' in checkpoint && !original) ||
        checkpoint.chunkId !== chunk.id ||
        checkpoint.actorId !== chunk.actorId ||
        checkpoint.physicalLife !== chunk.physicalLife ||
        checkpoint.epoch !== chunk.epoch
      )
        throw new Error('Foreign temporal checkpoint replacement.');
      if (original && jsonText(decodedCheckpoint(chunk, original, base)) === jsonText(checkpoint)) {
        changes.push(original);
        continue;
      }
      if (!checkpoint.facets.length) continue;
      const frame = index.frames.get(checkpoint.acquisition),
        header = frame === undefined ? undefined : index.entries.get(frame);
      if (header?.kind !== 'frame' || header.at !== checkpoint.at)
        throw new Error('Temporal checkpoint has no actual retained entry frame.');
      const { additions, intern, next } = dictionaryWriter(index, nextEntryOrdinal);
      const subject = intern({ kind: 'text', value: checkpoint.subject }),
        facets = packFacets(checkpoint.facets, header, intern);
      const change: Extract<TemporalFrameEntry, { kind: 'checkpoint' }> = {
        ordinal: original?.ordinal ?? next(),
        kind: 'checkpoint',
        frame: header.ordinal,
        subject,
        facets,
        ...(checkpoint.availability?.length ? { availability: checkpoint.availability } : {}),
        ...(checkpoint.order !== header.order ? { order: checkpoint.order } : {}),
      };
      additions.push(change);
      for (const entry of additions) {
        nextEntryOrdinal = Math.max(nextEntryOrdinal, entry.ordinal + 1);
        index.entries.set(entry.ordinal, entry);
        if (entry.kind === 'dictionary') index.dictionary.set(key(entry.value), entry.ordinal);
      }
      changes.push(change);
    }
  const groups = new Map<number, TemporalConfirmationRead[]>();
  for (const value of confirmations) {
    const held = groups.get(value.entryOrdinal) ?? [];
    if (!groups.has(value.entryOrdinal)) groups.set(value.entryOrdinal, held);
    held.push(value);
  }
  for (const [ordinal, values] of groups) {
    const original = base.confirmations.get(ordinal);
    if (!original) throw new Error('Foreign temporal confirmation replacement.');
    if (!receipts.some((receipt) => receipt.ordinal === original.receipt)) continue;
    if (jsonText(temporalEntryConfirmations(chunk, [original])) === jsonText(values)) {
      changes.push(original);
      continue;
    }
    const header = index.entries.get(original.frame);
    if (header?.kind !== 'frame') throw new Error('Temporal confirmation has no retained frame.');
    const { additions, intern } = dictionaryWriter(index, nextEntryOrdinal),
      subjects = packConfirmations(values, header, intern);
    const change: Extract<TemporalFrameEntry, { kind: 'confirmation' }> = { ...original, subjects };
    for (const entry of additions) {
      nextEntryOrdinal = Math.max(nextEntryOrdinal, entry.ordinal + 1);
      index.entries.set(entry.ordinal, entry);
      if (entry.kind === 'dictionary') index.dictionary.set(key(entry.value), entry.ordinal);
    }
    index.entries.set(ordinal, change);
    changes.push(change);
  }
  const retained = new Set<number>();
  for (const change of changes)
    for (const ordinal of entryDependencies(index, change)) retained.add(ordinal);
  // The replacement is complete owned data. Prove its container now so the
  // following metadata/accounting reads share one derived frame preparation.
  chunk.entries = immutableDataSnapshot(
    [...retained]
      .sort((a, b) => a - b)
      .map((ordinal) => immutableDataSnapshot(index.entries.get(ordinal)!, readOnlyDraftView)),
  );
  chunk.nextEntryOrdinal = nextEntryOrdinal;
}
