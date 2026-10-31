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
  sourceIdentity: readonly [
    family: EvidenceSource['family'],
    id: string,
    observer?: EvidenceSource['observer'],
  ];
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
/** Fixed tuple slots are the native authority and current JSON format. Rich
 * proof/source objects are selected read products, never a parallel store. */
interface StoredDictionaryKinds
  extends Omit<DictionaryKinds, 'source' | 'fact' | 'proof' | 'detail'> {
  sourceIdentity: readonly [
    family: EvidenceSource['family'],
    id: string,
    observer?: EvidenceSource['observer'],
  ];
  source: readonly [identity: number, revision: EvidenceSource['revision']];
  fact: readonly [source: number, ordinal: number];
  proof: readonly [
    original: number,
    confirmation: number,
    from: number,
    through: number,
    aliases?: string[],
  ];
  detail: readonly [proof: number, from: number, through: number, acquiredAt: number];
}
type StoredDictionaryValue = {
  [K in keyof StoredDictionaryKinds]: readonly [kind: K, value: StoredDictionaryKinds[K]];
}[keyof StoredDictionaryKinds];
export const TEMPORAL_DICTIONARY_REFERENCE_FIELDS = {
  source: { 0: 'sourceIdentity' },
  fact: { 0: 'source' },
  proof: { 0: 'fact', 1: 'source' },
  detail: { 0: 'proof' },
} as const;
export const TEMPORAL_FIELD = {
  value: 0,
  original: 1,
  source: 2,
  details: 3,
  pose: 4,
  reception: 5,
  ordinal: 6,
  from: 7,
  through: 8,
  role: 9,
  at: 10,
  acquired: 11,
  confirmed: 12,
  support: 13,
  poseFrame: 14,
} as const;
/** Null holes preserve fixed slots; trailing defaults are absent. The common
 * value/original/source/detail bindings precede rare timing/reception overrides. */
export type TemporalPackedFacet = readonly [
  value: readonly [block: number, ordinal: number],
  original?: number | null,
  source?: number | null,
  details?: number | null,
  pose?: readonly [block: number, ordinal: number] | null,
  reception?: number | null,
  ordinal?: number | null,
  from?: number | null,
  through?: number | null,
  role?: Exclude<TemporalFacetReference['role'], 'direct'> | null,
  at?: number | null,
  acquired?: number | null,
  confirmed?: number | null,
  support?: number | null,
  poseFrame?: number | null,
];
export type TemporalPackedConfirmation = TemporalPackedFacet;
function compactField(value: [...TemporalPackedFacet]): TemporalPackedFacet {
  while (value.length > 1 && value.at(-1) == null) value.pop();
  for (let at = 1; at < value.length; at++) value[at] ??= null;
  return value as unknown as TemporalPackedFacet;
}
function packedFieldOrdinal(input: TemporalPackedFacet, ordinal: number): TemporalPackedFacet {
  const row = [...input];
  row[6] = ordinal;
  for (let at = 1; at < row.length; at++) row[at] ??= null;
  return row as unknown as TemporalPackedFacet;
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
      subjects: Array<{
        subject: number;
        context?: readonly [source: number | null, from: number | null, through: number | null];
        fields: TemporalPackedConfirmation[];
      }>;
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
  /** Existing retained reconstruction may have its own equal-time order. */
  order?: number;
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
export const TEMPORAL_FACET_DICTIONARY_FIELDS = [1, 2, 13, 5, 3, 14] as const;
export const TEMPORAL_FACET_REFERENCE_FIELDS = [0, 4] as const;
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
  if (entry?.kind !== 'dictionary' || entry.value[0] !== kind)
    throw new Error('Temporal frame has an invalid dictionary reference.');
  const prior = index.decodedDictionary.get(at);
  if (prior !== undefined) return prior as DictionaryKinds[K];
  const stored = entry.value;
  let value: DictionaryKinds[keyof DictionaryKinds];
  switch (stored[0]) {
    case 'source': {
      const identity = dictionary(index, stored[1][0], 'sourceIdentity');
      value = {
        family: identity[0],
        id: identity[1],
        revision: stored[1][1],
        observer: identity[2] ?? { actorId: index.actorId, physicalLife: index.physicalLife },
      } as EvidenceSource;
      break;
    }
    case 'fact':
      value = { source: dictionary(index, stored[1][0], 'source'), ordinal: stored[1][1] };
      break;
    case 'proof':
      value = {
        original: dictionary(index, stored[1][0], 'fact'),
        confirmation: dictionary(index, stored[1][1], 'source'),
        confirmedFrom: stored[1][2],
        confirmedThrough: stored[1][3],
        ...(stored[1][4] ? { aliases: stored[1][4] } : {}),
      };
      break;
    case 'detail':
      value = {
        proof: dictionary(index, stored[1][0], 'proof'),
        from: stored[1][1],
        through: stored[1][2],
        acquiredAt: stored[1][3],
      };
      break;
    default:
      value = stored[1];
  }
  const complete = immutableDataSnapshot(value, readOnlyDraftView);
  index.decodedDictionary.set(at, complete);
  return complete as DictionaryKinds[K];
}
export function temporalDictionaryDependencies(
  entry: TemporalFrameEntry,
): Array<{ ordinal: number; kind: keyof DictionaryKinds }> {
  if (entry.kind !== 'dictionary') return [];
  const links =
    TEMPORAL_DICTIONARY_REFERENCE_FIELDS[
      entry.value[0] as keyof typeof TEMPORAL_DICTIONARY_REFERENCE_FIELDS
    ];
  return links
    ? Object.entries(links).map(([slot, kind]) => ({
        ordinal: (entry.value[1] as readonly number[])[Number(slot)]!,
        kind,
      }))
    : [];
}
export function temporalDictionaryValue(
  chunk: TemporalFrameOwner,
  ordinal: number,
): DictionaryValue {
  const index = frameIndex(readOnlyDraftView(chunk)),
    entry = index.entries.get(ordinal);
  if (entry?.kind !== 'dictionary') throw new Error('Temporal dictionary entry is unavailable.');
  const kind = entry.value[0];
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
  return decodeFacets([packedFieldOrdinal(facet, facet[6] ?? position)], frame, index)[0]!;
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
    const reception: TemporalReception | undefined = facet[4]
      ? { kind: 'body', poseRef: [dictionary(index, facet[4][0], 'text'), facet[4][1]] }
      : facet[5] != null
        ? dictionary(index, facet[5], 'reception')
        : undefined;
    const poseFrame =
      facet[14] != null
        ? dictionary(index, facet[14], 'view')
        : reception?.kind === 'body'
          ? frame.receiverFrame
          : undefined;
    return {
      blockId: dictionary(index, facet[0][0], 'text'),
      valueOrdinal: facet[0][1],
      ordinal: facet[6] ?? ordinal,
      role: facet[9] ?? 'direct',
      asOf: facet[10] ?? frame.at,
      measuredThrough: facet[8] ?? frame.at,
      measuredFrom: facet[7] ?? facet[8] ?? frame.at,
      acquiredAt: facet[11] ?? frame.at,
      ...(facet[12] != null ? { confirmedThrough: facet[12] } : {}),
      ...(facet[1] != null ? { original: dictionary(index, facet[1], 'fact') } : {}),
      ...(facet[2] != null ? { receivedFrom: dictionary(index, facet[2], 'source') } : {}),
      ...(facet[13] != null ? { support: dictionary(index, facet[13], 'proof') } : {}),
      ...(facet[3] != null ? { detailSupport: dictionary(index, facet[3], 'detail') } : {}),
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
            !!facet[4] ||
            facet[14] != null ||
            (facet[5] != null &&
              ['body', 'location'].includes(dictionary(index, facet[5], 'reception').kind)),
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
      (field) => !!field[4] || field[14] != null || field[5] != null,
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
    blockId: dictionary(index, facet[0][0], 'text'),
    valueOrdinal: facet[0][1],
    ...(facet[4]
      ? {
          reception: {
            kind: 'body' as const,
            poseRef: [dictionary(index, facet[4][0], 'text'), facet[4][1]] as const,
          },
        }
      : facet[5] != null
        ? { reception: dictionary(index, facet[5], 'reception') }
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
/** Common actual checks belong to their subject/acquisition, never a fabricated
 * field source. Exceptions remain on their own row and captured cuts stay exact. */
function confirmationContextField(
  group: Extract<TemporalFrameEntry, { kind: 'confirmation' }>['subjects'][number],
  field: TemporalPackedConfirmation,
): TemporalPackedConfirmation {
  if (!group.context) return field;
  const next = [...field] as unknown[];
  for (const [slot, common] of [
    [2, group.context[0]],
    [7, group.context[1]],
    [8, group.context[2]],
  ] as const)
    if (next[slot] == null && common != null) next[slot] = common;
  for (let at = 1; at < next.length; at++) next[at] ??= null;
  return next as unknown as TemporalPackedConfirmation;
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
    field = value?.fields[position] && confirmationContextField(value, value.fields[position]!);
  if (!value || !field) throw new Error('Temporal confirmation has no selected field.');
  const header = confirmationHeader(index, entry),
    fieldOrdinal =
      field[6] ??
      entry.subjects.slice(0, group).reduce((sum, value) => sum + value.fields.length, 0) +
        position;
  const reception: TemporalReception | undefined = field[4]
    ? { kind: 'body', poseRef: [dictionary(index, field[4][0], 'text'), field[4][1]] }
    : field[5] != null
      ? dictionary(index, field[5], 'reception')
      : undefined;
  return {
    ...header,
    fieldOrdinal,
    subject: dictionary(index, value.subject, 'text'),
    reference: { blockId: dictionary(index, field[0][0], 'text'), valueOrdinal: field[0][1] },
    ...(reception ? { reception } : {}),
    original: dictionary(index, field[1]!, 'fact'),
    confirmation: dictionary(index, field[2]!, 'source'),
    from: field[7] ?? header.at,
    through: field[8] ?? header.at,
    ...(field[3] != null ? { detailSupport: dictionary(index, field[3], 'detail') } : {}),
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
  occurrenceSourceIds: string[];
  occurrenceIndividualIds: string[];
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
    if (entry?.kind !== 'dictionary' || entry.value[0] !== kind)
      throw new Error('Temporal frame has an invalid dictionary reference.');
    return entry.value[1] as StoredDictionaryKinds[K];
  };
  const text = (at: number) => declaration(at, 'text');
  const valueAliases = new Map<object, string[]>();
  return (entries) => {
    const subjects = new Set<string>(),
      aliases = new Set<string>(),
      individuals = new Set<string>(),
      occurrenceAliases = new Set<string>(),
      occurrenceIndividuals = new Set<string>(),
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
    let occurrence = false;
    const addAlias = (id: string) => {
      aliases.add(id);
      if (occurrence) occurrenceAliases.add(id);
    };
    const addIndividual = (id: string) => {
      individuals.add(id);
      if (occurrence) occurrenceIndividuals.add(id);
    };
    const source = (at: number) => declaration(declaration(at, 'source')[0], 'sourceIdentity')[1];
    const fact = (at: number) => {
      const value = declaration(at, 'fact'),
        id = source(value[0]);
      addAlias(id);
      addAlias(personalFactAlias(id, value[1]));
    };
    const proof = (at: number) => {
      const value = declaration(at, 'proof');
      fact(value[0]);
      addAlias(source(value[1]));
      for (const alias of value[4] ?? []) addAlias(alias);
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
      sharedSource?: number | null,
    ) => {
      const fragment = reference(text(value[0][0]), value[0][1]);
      const reception = value[5] == null ? undefined : declaration(value[5], 'reception');
      if (value[4]) reference(text(value[4][0]), value[4][1]);
      else if (reception?.kind === 'body' && reception.poseRef)
        reference(reception.poseRef[0], reception.poseRef[1]);
      if (receiptId != null && ordinal != null) addAlias(personalFactAlias(receiptId, ordinal));
      if (value[1] != null) fact(value[1]!);
      if (value[13] != null) proof(value[13]);
      // A confirmation's implicit field proof precedes independent detail
      // support. Preserve that canonical alias order without building the proof.
      if (confirmation) {
        const confirmedBy = value[2] ?? sharedSource;
        if (confirmedBy != null) addAlias(source(confirmedBy));
      }
      if (value[3] != null) proof(declaration(value[3], 'detail')[0]);
      if (!confirmation && value[2] != null) addAlias(source(value[2]));
      if (fragment && context) {
        spatialContext ||= temporalSpatialContextValue(fragment);
        // Only these complete scalar fragments have value-owned aliases or
        // identity. Geometry reception does not authorize an unrelated value.
        if (
          !value[4] &&
          reception == null &&
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
          for (const alias of held) addAlias(alias);
          const individual = temporalValueIndividualId(fragment);
          if (individual != null) addIndividual(individual);
        }
      }
    };
    for (const entry of entries) {
      if (entry.kind !== 'change' && entry.kind !== 'checkpoint' && entry.kind !== 'confirmation')
        continue;
      occurrence = entry.kind === 'change';
      const frame = index.entries.get(entry.frame);
      if (frame?.kind !== 'frame') throw new Error('Temporal change has no acquisition frame.');
      if (entry.kind === 'confirmation') {
        for (const group of entry.subjects) {
          subjects.add(text(group.subject));
          for (const value of group.fields) {
            confirmations++;
            changes++;
            firstMeasured = Math.min(firstMeasured, value[7] ?? group.context?.[1] ?? frame.at);
            lastSupported = Math.max(lastSupported, value[8] ?? group.context?.[2] ?? frame.at);
            field(value, undefined, undefined, true, group.context?.[0]);
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
        for (const alias of entry.sources ?? []) addAlias(text(alias));
        receiptId = temporalReceiptId({ epoch: chunk.epoch, ordinal: entry.receipt });
        addAlias(receiptId);
        if (entry.identity != null) {
          const identity = declaration(entry.identity, 'identity');
          if (identity.kind === 'individual') addIndividual(identity.individualId);
        }
        if (!entry.facets.length) {
          firstMeasured = Math.min(firstMeasured, frame.at);
          lastSupported = Math.max(lastSupported, frame.at);
        }
      }
      for (let position = 0; position < entry.facets.length; position++) {
        const value = entry.facets[position]!;
        if (entry.kind === 'change') {
          firstMeasured = Math.min(firstMeasured, value[7] ?? value[8] ?? frame.at);
          lastSupported = Math.max(lastSupported, value[12] ?? value[8] ?? frame.at);
        }
        field(value, receiptId, value[6] ?? position);
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
      occurrenceSourceIds: [...occurrenceAliases],
      occurrenceIndividualIds: [...occurrenceIndividuals],
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
          const ordinal = field[6] ?? next;
          next++;
          return selected.has(ordinal) ? [packedFieldOrdinal(field, ordinal)] : [];
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
      const ordinal = facet[6] ?? index;
      return selected.has(ordinal) ? [packedFieldOrdinal(facet, ordinal)] : [];
    }),
  };
}
function entryDependencies(
  index: FrameIndex,
  change: Extract<TemporalFrameEntry, { kind: 'change' | 'checkpoint' | 'confirmation' }>,
): Set<number> {
  const ordinals = new Set<number>([change.ordinal, change.frame]);
  if (change.kind === 'confirmation')
    for (const group of change.subjects) {
      ordinals.add(group.subject);
      if (group.context?.[0] != null) ordinals.add(group.context[0]);
    }
  else ordinals.add(change.subject);
  if (change.kind === 'change') {
    for (const field of TEMPORAL_CHANGE_DICTIONARY_FIELDS)
      if (change[field] != null) ordinals.add(change[field]);
    for (const field of TEMPORAL_CHANGE_DICTIONARY_ARRAY_FIELDS)
      for (const ordinal of change[field] ?? []) ordinals.add(ordinal);
  }
  for (const facet of packedEntryFields(change)) {
    for (const field of TEMPORAL_FACET_REFERENCE_FIELDS)
      if (facet[field]) ordinals.add(facet[field][0]);
    for (const field of TEMPORAL_FACET_DICTIONARY_FIELDS)
      if (facet[field] != null) ordinals.add(facet[field]);
  }
  // A selected proof brings only its typed declarations. Each dependency kind
  // descends toward a source, so neither a cycle nor an unrelated page is read.
  for (const ordinal of ordinals) {
    const entry = ordinal === change.ordinal ? change : index.entries.get(ordinal);
    if (!entry) throw new Error('Temporal frame declaration is unavailable.');
    for (const dependency of temporalDictionaryDependencies(entry)) {
      const target = index.entries.get(dependency.ordinal);
      if (target?.kind !== 'dictionary' || target.value[0] !== dependency.kind)
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
  return fields.map((facet, at) =>
    compactField([
      [intern({ kind: 'text', value: facet.blockId }), facet.valueOrdinal],
      facet.original ? intern({ kind: 'fact', value: facet.original }) : null,
      facet.receivedFrom ? intern({ kind: 'source', value: facet.receivedFrom }) : null,
      facet.detailSupport ? intern({ kind: 'detail', value: facet.detailSupport }) : null,
      facet.reception?.kind === 'body' && facet.reception.poseRef
        ? [intern({ kind: 'text', value: facet.reception.poseRef[0] }), facet.reception.poseRef[1]]
        : null,
      facet.reception && !(facet.reception.kind === 'body' && facet.reception.poseRef)
        ? intern({ kind: 'reception', value: facet.reception })
        : null,
      facet.ordinal !== at ? facet.ordinal : null,
      facet.measuredFrom !== facet.measuredThrough ? facet.measuredFrom : null,
      facet.measuredThrough !== header.at ? facet.measuredThrough : null,
      facet.role !== 'direct' ? facet.role : null,
      facet.asOf !== header.at ? facet.asOf : null,
      facet.acquiredAt !== header.at ? facet.acquiredAt : null,
      facet.confirmedThrough ?? null,
      facet.support ? intern({ kind: 'proof', value: facet.support }) : null,
      facet.poseFrame &&
      (!header.receiverFrame || jsonText(facet.poseFrame) !== jsonText(header.receiverFrame))
        ? intern({ kind: 'view', value: facet.poseFrame })
        : null,
    ]),
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
        const { family, id, revision, observer } = value.value;
        const identity = intern({
          kind: 'sourceIdentity',
          value:
            observer.actorId === base.actorId && observer.physicalLife === base.physicalLife
              ? [family, id]
              : [family, id, observer],
        });
        stored = ['source', [identity, revision]];
        break;
      }
      case 'fact':
        stored = [
          'fact',
          [intern({ kind: 'source', value: value.value.source }), value.value.ordinal],
        ];
        break;
      case 'proof': {
        const row: StoredDictionaryKinds['proof'] = value.value.aliases
          ? [
              intern({ kind: 'fact', value: value.value.original }),
              intern({ kind: 'source', value: value.value.confirmation }),
              value.value.confirmedFrom,
              value.value.confirmedThrough,
              value.value.aliases,
            ]
          : [
              intern({ kind: 'fact', value: value.value.original }),
              intern({ kind: 'source', value: value.value.confirmation }),
              value.value.confirmedFrom,
              value.value.confirmedThrough,
            ];
        stored = ['proof', row];
        break;
      }
      case 'detail':
        stored = [
          'detail',
          [
            intern({ kind: 'proof', value: value.value.proof }),
            value.value.from,
            value.value.through,
            value.value.acquiredAt,
          ],
        ];
        break;
      default:
        stored = [value.kind, value.value] as StoredDictionaryValue;
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
          ...((checkpoint.order ?? receipt.order) !== header.order
            ? { order: checkpoint.order ?? receipt.order }
            : {}),
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
    fields.push(
      compactField([
        [intern({ kind: 'text', value: value.reference.blockId }), value.reference.valueOrdinal],
        intern({ kind: 'fact', value: value.original }),
        intern({ kind: 'source', value: value.confirmation }),
        value.detailSupport ? intern({ kind: 'detail', value: value.detailSupport }) : null,
        value.reception?.kind === 'body' && value.reception.poseRef
          ? [
              intern({ kind: 'text', value: value.reception.poseRef[0] }),
              value.reception.poseRef[1],
            ]
          : null,
        value.reception && !(value.reception.kind === 'body' && value.reception.poseRef)
          ? intern({ kind: 'reception', value: value.reception })
          : null,
        'fieldOrdinal' in value ? (value as TemporalConfirmationRead).fieldOrdinal : null,
        value.from !== header.at ? value.from : null,
        value.through !== header.at ? value.through : null,
      ]),
    );
  }
  return [...groups].map(([subject, fields]) => {
    const common = [2, 7, 8].map((slot) => {
      const first = fields[0]![slot as 2 | 7 | 8];
      return first != null && fields.every((field) => field[slot as 2 | 7 | 8] === first)
        ? first
        : null;
    }) as [number | null, number | null, number | null];
    if (common.every((value) => value === null)) return { subject, fields };
    return {
      subject,
      context: common,
      fields: fields.map((field) => {
        const row = [...field];
        for (let at = 0; at < 3; at++) if (common[at] != null) row[[2, 7, 8][at]!] = null;
        while (row.length > 1 && row.at(-1) == null) row.pop();
        return row as unknown as TemporalPackedConfirmation;
      }),
    };
  });
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
  index.featureScope ||= packedFields.some((field) => !!field[4] || field[5] != null);
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
