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
import {
  receivedValueAt,
  type ReceivedValueLookup,
  type ReceivedValueReference,
  sameReceivedValueReference,
} from './received-values.js';
import { countDomainWork } from './diagnostic-counters.js';
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
  received: ReceivedValueReference;
  identity: ObserverSubject;
  source: EvidenceSource;
  fact: ObservationFactKey;
  proof: ReceivedFacetProof;
  origin: ObservationOrigin;
  reception: TemporalReception;
  detail: NonNullable<TemporalFacetReference['detailSupport']>;
  checkDetail: {
    role: TemporalFacetReference['role'];
    original: ObservationFactKey;
    identity: DictionaryKinds['sourceIdentity'];
    from: number;
    through: number;
    acquiredAt: number;
    aliases?: string[];
  };
  view: ObservationFrame;
  members: readonly (TemporalPackedConfirmation | null)[];
}
type DictionaryValue = {
  [K in keyof DictionaryKinds]: { kind: K; value: DictionaryKinds[K] };
}[keyof DictionaryKinds];
/** Fixed tuple slots are the native authority and current JSON format. Rich
 * proof/source objects are selected read products, never a parallel store. */
interface StoredDictionaryKinds
  extends Omit<DictionaryKinds, 'source' | 'fact' | 'proof' | 'detail' | 'checkDetail'> {
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
  detail: readonly [
    proof: number,
    from: number,
    through: number,
    acquiredAt: number,
    role: TemporalFacetReference['role'],
  ];
  checkDetail: readonly [
    original: number,
    identity: number,
    from: number,
    through: number,
    acquiredAt: number,
    role: TemporalFacetReference['role'],
    aliases?: string[],
  ];
}
type StoredDictionaryValue = {
  [K in keyof StoredDictionaryKinds]: readonly [kind: K, value: StoredDictionaryKinds[K]];
}[keyof StoredDictionaryKinds];
export const TEMPORAL_DICTIONARY_REFERENCE_FIELDS = {
  source: { 0: 'sourceIdentity' },
  fact: { 0: 'source' },
  proof: { 0: 'fact', 1: 'source' },
  detail: { 0: 'proof' },
  checkDetail: { 0: 'fact', 1: 'sourceIdentity' },
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
  value: number,
  original?: number | null,
  source?: number | null,
  details?: number | null,
  pose?: number | null,
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
/** Borrowed current fields for one synchronous write. Common actual checks are
 * prepared once; no rich per-field confirmation envelopes are retained. */
export interface TemporalCheckGroup {
  subject: string;
  confirmation: EvidenceSource;
  from: number;
  through: number;
  count: number;
  /** First baseline owns this immutable template without another check event. */
  declareOnly?: true;
  useReceiptFields?: true;
  fields: () => readonly TemporalFacetReference[];
  membershipKey: object;
  membership?: { chunkId: string; entryOrdinal: number };
  /** Actual appearance check tuple; member identity/role lives in its declaration. */
  detail?: readonly [revision: EvidenceSource['revision'], from: number, through: number];
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
      ? []
      : entry.kind === 'dictionary' && entry.value[0] === 'members'
        ? entry.value[1].filter((field): field is TemporalPackedConfirmation => field !== null)
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
        /** One actual check stamp; member source identities and measured values are stable. */
        check: readonly [
          revision: EvidenceSource['revision'],
          from?: number | null,
          through?: number | null,
        ];
        detail?: readonly [revision: EvidenceSource['revision'], from: number, through: number];
        /** Immutable field membership is declared once in this logical chunk. */
        members: number;
        count: number;
        offset: number;
        /** Sparse original addresses for narrowed/corrected read products. */
        ordinals?: number[];
        /** Selected membership positions; absence means the complete declared set. */
        mask?: number[];
      }>;
    }
  | {
      ordinal: number;
      kind: 'checkpoint';
      frame: number;
      identity?: number;
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
      availability?: TemporalCheckpointAvailability[];
      spatialContext?: true;
      required?: true;
      sources?: number[];
      memberships?: number[];
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
  subjectIdentity?: ObserverSubject;
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
  subjectIdentity?: ObserverSubject;
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
  references: Set<string>;
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
        role: stored[1][4],
      };
      break;
    case 'checkDetail':
      value = {
        original: dictionary(index, stored[1][0], 'fact'),
        identity: dictionary(index, stored[1][1], 'sourceIdentity'),
        from: stored[1][2],
        through: stored[1][3],
        acquiredAt: stored[1][4],
        role: stored[1][5],
        ...(stored[1][6] ? { aliases: stored[1][6] } : {}),
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
  if (entry.value[0] === 'members') {
    const links: Array<{ ordinal: number; kind: keyof DictionaryKinds }> = [];
    for (const field of entry.value[1]) {
      if (!field) continue;
      for (const slot of TEMPORAL_FACET_REFERENCE_FIELDS)
        if (field[slot] != null) links.push({ ordinal: field[slot], kind: 'received' });
      for (const [slot, kind] of [
        [1, 'fact'],
        [2, 'sourceIdentity'],
        [3, 'checkDetail'],
        [5, 'reception'],
      ] as const)
        if (field[slot] != null) links.push({ ordinal: field[slot], kind });
    }
    return links;
  }
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
    ...(entry.availability?.length ? { availability: entry.availability } : {}),
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
    ...(entry.identity !== undefined
      ? { subjectIdentity: dictionary(index, entry.identity, 'identity') }
      : {}),
    sourceIds: [],
    ...(entry.availability?.length ? { availability: entry.availability } : {}),
  };
}
function fieldReception(
  index: FrameIndex,
  field: TemporalPackedFacet,
): TemporalReception | undefined {
  return field[4] != null
    ? { kind: 'body', poseRef: dictionary(index, field[4], 'received') }
    : field[5] != null
      ? dictionary(index, field[5], 'reception')
      : undefined;
}
function decodeFacets(
  facets: readonly TemporalPackedFacet[],
  frame: Extract<TemporalFrameEntry, { kind: 'frame' }>,
  index: FrameIndex,
): TemporalFacetReference[] {
  return facets.map((facet, ordinal): TemporalFacetReference => {
    const reception = fieldReception(index, facet);
    const poseFrame =
      facet[14] != null
        ? dictionary(index, facet[14], 'view')
        : reception?.kind === 'body'
          ? frame.receiverFrame
          : undefined;
    return {
      valueRef: dictionary(index, facet[0]!, 'received'),
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
      ...(entry.identity !== undefined
        ? { subjectIdentity: dictionary(index, entry.identity, 'identity') }
        : {}),
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
      references: new Set(),
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
    if (entry.kind === 'dictionary' && entry.value[0] === 'members') {
      for (const facet of packedEntryFields(entry)) {
        for (const slot of TEMPORAL_FACET_REFERENCE_FIELDS) {
          const reference = facet[slot];
          if (reference == null) continue;
          const value = dictionary(index, reference, 'received');
          if (typeof value === 'string') index.references.add(value);
        }
        index.featureScope ||= facet[4] != null || facet[5] != null;
      }
    }
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
            facet[4] != null ||
            facet[14] != null ||
            (facet[5] != null &&
              ['body', 'location'].includes(dictionary(index, facet[5], 'reception').kind)),
        );
    }
    for (const facet of packedEntryFields(entry))
      for (const field of TEMPORAL_FACET_REFERENCE_FIELDS) {
        const reference = facet[field];
        if (reference == null) continue;
        const value = dictionary(index, reference, 'received');
        if (typeof value === 'string') index.references.add(value);
      }
    index.featureScope ||= packedEntryFields(entry).some(
      (field) => field[4] != null || field[14] != null || field[5] != null,
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
    valueRef: dictionary(index, facet[0]!, 'received'),
    ...(facet[4] != null
      ? {
          reception: {
            kind: 'body' as const,
            poseRef: dictionary(index, facet[4]!, 'received'),
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
function checkedSource(
  index: FrameIndex,
  identity: DictionaryKinds['sourceIdentity'],
  revision: EvidenceSource['revision'],
): EvidenceSource {
  return {
    family: identity[0],
    id: identity[1],
    revision,
    observer: identity[2] ?? { actorId: index.actorId, physicalLife: index.physicalLife },
  } as EvidenceSource;
}
type StoredCheckGroup = Extract<TemporalFrameEntry, { kind: 'confirmation' }>['subjects'][number];
function checkMembers(
  index: FrameIndex,
  group: StoredCheckGroup,
): readonly (TemporalPackedConfirmation | null)[] {
  return dictionary(index, group.members, 'members');
}
/** Current-format cursor validation resolves native identities once at loading,
 * never again on each successful group check. */
export function temporalMembershipBindings(
  chunk: TemporalFrameOwner,
  ordinal: number,
): Array<{
  valueRef: ReceivedValueReference;
  original: ObservationFactKey;
  sourceId: string;
  reception?: TemporalReception;
}> {
  const index = frameIndex(readOnlyDraftView(chunk));
  return dictionary(index, ordinal, 'members').flatMap((field) =>
    field
      ? [
          {
            valueRef: dictionary(index, field[0], 'received'),
            original: dictionary(index, field[1]!, 'fact'),
            sourceId: dictionary(index, field[2]!, 'sourceIdentity')[1],
            ...(fieldReception(index, field) ? { reception: fieldReception(index, field) } : {}),
          },
        ]
      : [],
  );
}
export function temporalConfirmationPositions(group: StoredCheckGroup): readonly number[] {
  return group.mask ?? Array.from({ length: group.count }, (_, at) => at);
}
function checkFieldOrdinal(group: StoredCheckGroup, position: number): number {
  return group.ordinals?.[position] ?? group.offset + position;
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
    field = value && checkMembers(index, value)[position];
  if (!value || !field) throw new Error('Temporal confirmation has no selected field.');
  const header = confirmationHeader(index, entry),
    fieldOrdinal = checkFieldOrdinal(value, position);
  const reception = fieldReception(index, field);
  return {
    ...header,
    fieldOrdinal,
    subject: dictionary(index, value.subject, 'text'),
    reference: { valueRef: dictionary(index, field[0]!, 'received') },
    ...(reception ? { reception } : {}),
    original: dictionary(index, field[1]!, 'fact'),
    confirmation: checkedSource(
      index,
      dictionary(index, field[2]!, 'sourceIdentity'),
      value.check[0],
    ),
    from: value.check[1] ?? header.at,
    through: value.check[2] ?? header.at,
    ...(field[3] != null ? { detailSupport: checkedDetails(index, field[3], value.detail) } : {}),
  };
}
function checkedDetails(
  index: FrameIndex,
  at: number,
  stamp: Extract<TemporalFrameEntry, { kind: 'confirmation' }>['subjects'][number]['detail'],
): NonNullable<TemporalFacetReference['detailSupport']> {
  if (!stamp) throw new Error('A checked detail has no actual check stamp.');
  const base = dictionary(index, at, 'checkDetail');
  return {
    proof: {
      original: base.original,
      confirmation: checkedSource(index, base.identity, stamp[0]),
      confirmedFrom: stamp[1],
      confirmedThrough: stamp[2],
      ...(base.aliases ? { aliases: base.aliases } : {}),
    },
    from: base.from,
    through: base.through,
    acquiredAt: base.acquiredAt,
    role: base.role,
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
      for (const field of temporalConfirmationPositions(subject))
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
          temporalConfirmationPositions(group).map((p) => confirmationField(index, entry, g, p)),
        )
      : [],
  );
}
export function temporalConfirmationsForFacet(
  chunk: TemporalFrameOwner,
  reference: TemporalFacetReference,
  prior: TemporalFacetReference,
): TemporalConfirmationRead[] {
  const support = reference.support,
    detail = reference.detailSupport;
  if (!support && !detail) return [];
  const same = (a: object | undefined, b: object | undefined) =>
    a === b || !!(a && b && jsonText(a) === jsonText(b));
  const values = temporalEntryConfirmations(chunk),
    selected: TemporalConfirmationRead[] = [];
  let mainFound =
      !support ||
      (same(prior.support, support) && same(prior.receivedFrom, reference.receivedFrom)),
    detailFound = !detail || same(prior.detailSupport, detail);
  for (let index = values.length - 1; index >= 0 && (!mainFound || !detailFound); index--) {
    const value = values[index]!;
    const sameValue = sameReceivedValueReference(value.reference.valueRef, reference.valueRef);
    const samePose =
      reference.reception?.kind === 'body' &&
      reference.reception.poseRef !== undefined &&
      sameReceivedValueReference(reference.reception.poseRef, value.reference.valueRef);
    const main =
      !mainFound &&
      support &&
      (sameValue || samePose) &&
      (samePose || same(value.reception, reference.reception)) &&
      same(value.original, reference.original) &&
      same(value.original, support.original) &&
      same(value.confirmation, support.confirmation) &&
      value.from === support.confirmedFrom &&
      value.through === support.confirmedThrough &&
      (reference.confirmedThrough === undefined || reference.confirmedThrough === value.through);
    const appearance =
      !detailFound &&
      sameValue &&
      detail &&
      value.detailSupport &&
      same(detail, value.detailSupport);
    if (main || appearance) {
      selected.push(value);
      mainFound ||= !!main;
      detailFound ||= !!appearance;
    }
  }
  return selected;
}
export function temporalConfirmationChangeCount(entries: readonly TemporalFrameEntry[]): number {
  return entries.reduce(
    (count, entry) =>
      count +
      (entry.kind === 'confirmation'
        ? entry.subjects.reduce((n, subject) => n + (subject.mask?.length ?? subject.count), 0)
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
  references: string[];
  subjects: string[];
  sourceIds: string[];
  individualIds: string[];
  sourceRefs: string[];
  occurrenceSourceIds: string[];
  occurrenceIndividualIds: string[];
}

interface TemporalMemberMetadata {
  aliases: Set<string>;
  individuals: Set<string>;
  references: Set<string>;
  blocks: Map<string, object>;
  spatialContext: boolean;
  contextual?: boolean;
}
const memberMetadata = new WeakMap<
  object,
  Partial<
    Record<
      'structural' | 'received',
      {
        mask: string;
        value: TemporalMemberMetadata;
      }
    >
  >
>();
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
  // Declaration metadata is independent of successful-check stamps. Cold page
  // preparation parses its exact dependency closure once, then reuses it.
  const memberships = new Map<string, TemporalMemberMetadata>();
  return (entries) => {
    const subjects = new Set<string>(),
      aliases = new Set<string>(),
      individuals = new Set<string>(),
      occurrenceAliases = new Set<string>(),
      occurrenceIndividuals = new Set<string>(),
      references = new Set<string>(),
      ordinals: number[] = [];
    const seenMemberships = new Set<string>();
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
    const addAlias = (id: string, target?: TemporalMemberMetadata) => {
      (target?.aliases ?? aliases).add(id);
      if (!target && occurrence) occurrenceAliases.add(id);
    };
    const addIndividual = (id: string, target?: TemporalMemberMetadata) => {
      (target?.individuals ?? individuals).add(id);
      if (!target && occurrence) occurrenceIndividuals.add(id);
    };
    const source = (at: number) => declaration(declaration(at, 'source')[0], 'sourceIdentity')[1];
    const fact = (at: number, target?: TemporalMemberMetadata) => {
      const value = declaration(at, 'fact'),
        id = source(value[0]);
      addAlias(id, target);
      addAlias(personalFactAlias(id, value[1]), target);
    };
    const proof = (at: number, target?: TemporalMemberMetadata) => {
      const value = declaration(at, 'proof');
      fact(value[0], target);
      addAlias(source(value[1]), target);
      for (const alias of value[4] ?? []) addAlias(alias, target);
    };
    const reference = (block: ReceivedValueReference, target?: TemporalMemberMetadata) => {
      if (typeof block === 'string') (target?.references ?? references).add(block);
      const fragment = context && receivedValueAt(context.sources, block);
      if (context && !fragment)
        throw new Error('Receipt page index requires complete received source support.');
      if (target && typeof block === 'string' && fragment) target.blocks.set(block, fragment);
      return fragment;
    };
    const field = (
      value: TemporalPackedFacet | TemporalPackedConfirmation,
      receiptId?: string,
      ordinal?: number,
      confirmation = false,
      target?: TemporalMemberMetadata,
    ) => {
      const fragment = reference(declaration(value[0], 'received'), target);
      const reception = value[5] == null ? undefined : declaration(value[5], 'reception');
      if (value[4] != null) reference(declaration(value[4]!, 'received'), target);
      else if (reception?.kind === 'body' && reception.poseRef)
        reference(reception.poseRef, target);
      if (receiptId != null && ordinal != null)
        addAlias(personalFactAlias(receiptId, ordinal), target);
      if (value[1] != null) fact(value[1]!, target);
      if (value[13] != null) proof(value[13], target);
      // A confirmation's implicit field proof precedes independent detail
      // support. Preserve that canonical alias order without building the proof.
      if (confirmation) {
        if (value[2] != null) addAlias(declaration(value[2], 'sourceIdentity')[1], target);
      }
      if (value[3] != null) {
        if (confirmation) {
          const detail = declaration(value[3], 'checkDetail');
          fact(detail[0], target);
          addAlias(declaration(detail[1], 'sourceIdentity')[1], target);
          for (const alias of detail[6] ?? []) addAlias(alias, target);
        } else proof(declaration(value[3], 'detail')[0], target);
      }
      if (!confirmation && value[2] != null) addAlias(source(value[2]), target);
      if (fragment && context) {
        if (target) target.spatialContext ||= temporalSpatialContextValue(fragment);
        else spatialContext ||= temporalSpatialContextValue(fragment);
        // Only these complete scalar fragments have value-owned aliases or
        // identity. Geometry reception does not authorize an unrelated value.
        if (
          value[4] == null &&
          reception == null &&
          (fragment.kind === 'association' ||
            fragment.kind === 'claim' ||
            fragment.kind === 'physical-boundary' ||
            fragment.kind === 'event')
        ) {
          if (target && fragment.kind === 'association') target.contextual = true;
          let held = valueAliases.get(fragment);
          if (!held) {
            held = temporalValueDependencyAliases(fragment, context.world);
            valueAliases.set(fragment, held);
          }
          for (const alias of held) addAlias(alias, target);
          const individual = temporalValueIndividualId(fragment);
          if (individual != null) addIndividual(individual, target);
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
          const count = group.mask?.length ?? group.count;
          confirmations += count;
          changes += count;
          firstMeasured = Math.min(firstMeasured, group.check[1] ?? frame.at);
          lastSupported = Math.max(lastSupported, group.check[2] ?? frame.at);
          const key = `${group.members}:${group.mask?.join(',') ?? '*'}`;
          if (seenMemberships.has(key)) continue;
          seenMemberships.add(key);
          const declaration = index.entries.get(group.members)!;
          const sharedKind = context ? 'received' : 'structural';
          const sharedMask = group.mask?.join(',') ?? '*';
          const reusable = isImmutableData(declaration);
          const shared = reusable ? memberMetadata.get(declaration)?.[sharedKind] : undefined;
          let reusableShared = shared?.mask === sharedMask ? shared.value : undefined;
          if (reusableShared && context)
            for (const [id, fragment] of reusableShared.blocks)
              if (receivedValueAt(context.sources, id) !== fragment) {
                reusableShared = undefined;
                break;
              }
          let held = memberships.get(key) ?? reusableShared;
          if (!held) {
            held = {
              aliases: new Set(),
              individuals: new Set(),
              references: new Set(),
              blocks: new Map(),
              spatialContext: false,
            };
            for (const position of temporalConfirmationPositions(group))
              field(checkMembers(index, group)[position]!, undefined, undefined, true, held);
            if (reusable && !held.contextual) {
              const saved = memberMetadata.get(declaration) ?? {};
              saved[sharedKind] = { mask: sharedMask, value: held };
              memberMetadata.set(declaration, saved);
            }
          }
          memberships.set(key, held);
          for (const id of held.aliases) aliases.add(id);
          for (const id of held.individuals) individuals.add(id);
          for (const id of held.references) references.add(id);
          spatialContext ||= held.spatialContext;
        }
        continue;
      }
      subjects.add(text(entry.subject));
      if (entry.identity != null) {
        const identity = declaration(entry.identity, 'identity');
        if (identity.kind === 'individual') addIndividual(identity.individualId);
      }
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
      references: [...references].sort(),
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
  if (entry.kind === 'dictionary' && entry.value[0] === 'members') {
    const selected = new Set(facetOrdinals);
    return {
      ...entry,
      value: [
        'members',
        entry.value[1].map((field, position) => (selected.has(position) ? field : null)),
      ],
    };
  }
  if (entry.kind === 'confirmation') {
    const selected = new Set(facetOrdinals);
    return {
      ...entry,
      subjects: entry.subjects.flatMap((group) => {
        const mask = temporalConfirmationPositions(group).filter((position) =>
          selected.has(checkFieldOrdinal(group, position)),
        );
        return mask.length ? [{ ...group, mask }] : [];
      }),
    };
  }
  if (entry.kind !== 'change' && entry.kind !== 'checkpoint') return entry;
  const selected = new Set(facetOrdinals),
    header =
      entry.kind === 'change'
        ? (({
            sources: _aliases,
            memberships: _memberships,
            availability: _availability,
            ...rest
          }) => rest)(entry)
        : (({ availability: _availability, ...rest }) => rest)(entry),
    availability = entry.availability?.flatMap((row) => {
      const fields = row.fields.filter((field) => selected.has(field));
      return fields.length ? [{ ...row, fields }] : [];
    });
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
  projected: ReadonlyMap<number, TemporalFrameEntry> = new Map(),
): Set<number> {
  const ordinals = new Set<number>([change.ordinal, change.frame]);
  if (change.kind === 'confirmation')
    for (const group of change.subjects) {
      ordinals.add(group.subject);
      ordinals.add(group.members);
    }
  else {
    ordinals.add(change.subject);
    if (change.identity !== undefined) ordinals.add(change.identity);
  }
  if (change.kind === 'change') {
    for (const ordinal of change.memberships ?? []) ordinals.add(ordinal);
    for (const field of TEMPORAL_CHANGE_DICTIONARY_FIELDS)
      if (change[field] != null) ordinals.add(change[field]);
    for (const field of TEMPORAL_CHANGE_DICTIONARY_ARRAY_FIELDS)
      for (const ordinal of change[field] ?? []) ordinals.add(ordinal);
  }
  for (const facet of packedEntryFields(change)) {
    for (const field of TEMPORAL_FACET_REFERENCE_FIELDS)
      if (facet[field] != null) ordinals.add(facet[field]);
    for (const field of TEMPORAL_FACET_DICTIONARY_FIELDS)
      if (facet[field] != null) ordinals.add(facet[field]);
  }
  // A selected proof brings only its typed declarations. Each dependency kind
  // descends toward a source, so neither a cycle nor an unrelated page is read.
  for (const ordinal of ordinals) {
    const entry =
      ordinal === change.ordinal ? change : (projected.get(ordinal) ?? index.entries.get(ordinal));
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
  const selected = new Map<number, Set<number>>();
  for (const group of entry.subjects) {
    let positions = selected.get(group.members);
    if (!positions) selected.set(group.members, (positions = new Set()));
    for (const position of temporalConfirmationPositions(group)) positions.add(position);
  }
  const projected = new Map(
    [...selected].map(([ordinal, positions]) => [
      ordinal,
      projectTemporalOperation(index.entries.get(ordinal)!, [...positions]),
    ]),
  );
  return [...entryDependencies(index, entry, projected)]
    .sort((a, b) => a - b)
    .map((at) => (at === ordinal ? entry : (projected.get(at) ?? index.entries.get(at)!)));
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
      intern({ kind: 'received', value: facet.valueRef }),
      facet.original ? intern({ kind: 'fact', value: facet.original }) : null,
      facet.receivedFrom ? intern({ kind: 'source', value: facet.receivedFrom }) : null,
      facet.detailSupport ? intern({ kind: 'detail', value: facet.detailSupport }) : null,
      facet.reception?.kind === 'body' && facet.reception.poseRef
        ? intern({ kind: 'received', value: facet.reception.poseRef })
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
            value.value.role,
          ],
        ];
        break;
      case 'checkDetail': {
        const row: StoredDictionaryKinds['checkDetail'] = [
          intern({ kind: 'fact', value: value.value.original }),
          intern({ kind: 'sourceIdentity', value: value.value.identity }),
          value.value.from,
          value.value.through,
          value.value.acquiredAt,
          value.value.role,
          ...(value.value.aliases ? ([value.value.aliases] as [string[]]) : ([] as [])),
        ];
        stored = ['checkDetail', row];
        break;
      }
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
  checks: readonly TemporalCheckGroup[] = [],
  checkFields: TemporalFacetReference[] = [],
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
        identity =
          checkpoint.subjectIdentity &&
          intern({ kind: 'identity', value: checkpoint.subjectIdentity }),
        facets = packFacets(checkpoint.facets, header, intern);
      additions.push(
        immutableDataSnapshot({
          ordinal: next(),
          kind: 'checkpoint',
          frame,
          subject,
          ...(identity !== undefined ? { identity } : {}),
          facets,
          ...(checkpoint.availability?.length ? { availability: checkpoint.availability } : {}),
          ...((checkpoint.order ?? receipt.order) !== header.order
            ? { order: checkpoint.order ?? receipt.order }
            : {}),
        }),
      );
    }
  const facets = packFacets(fields, header, intern);
  const memberships: number[] = [];
  if (confirmations.length || checks.length) {
    const subjects = packConfirmations(
      confirmations,
      header,
      intern,
      checks,
      chunk,
      base,
      fields,
      memberships,
      checkFields,
    );
    if (subjects.length)
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
      ...(receipt.availability?.length ? { availability: receipt.availability } : {}),
      ...(receipt.spatialContext ? { spatialContext: true } : {}),
      ...(receipt.required ? { required: true } : {}),
      ...(sources.length ? { sources } : {}),
      ...(memberships.length ? { memberships } : {}),
      facets,
    }),
  );

  return additions;
}
const checkMemberships = new WeakMap<object, { chunkId: string; ordinal: number; count: number }>();
export function temporalCheckGroupMembership(
  chunk: TemporalFrameOwner,
  value: TemporalCheckGroup,
): { entryOrdinal: number; count: number } | undefined {
  const held = checkMemberships.get(value.membershipKey);
  if (!held || held.chunkId !== chunk.id) return;
  const entry = frameIndex(readOnlyDraftView(chunk)).entries.get(held.ordinal);
  return entry?.kind === 'dictionary' && entry.value[0] === 'members'
    ? { entryOrdinal: held.ordinal, count: held.count }
    : undefined;
}
function packConfirmations(
  confirmations: readonly TemporalConfirmation[],
  header: Extract<TemporalFrameEntry, { kind: 'frame' }>,
  intern: (value: DictionaryValue) => number,
  checks: readonly TemporalCheckGroup[] = [],
  scope: Pick<TemporalFrameOwner, 'id' | 'actorId' | 'physicalLife'>,
  index: FrameIndex,
  receiptFields: readonly TemporalFacetReference[] = [],
  declarations: number[] = [],
  preparedFields: TemporalFacetReference[] = [],
): Extract<TemporalFrameEntry, { kind: 'confirmation' }>['subjects'] {
  const groups = new Map<
    string,
    Omit<StoredCheckGroup, 'members' | 'count' | 'offset'> & {
      fields: TemporalPackedConfirmation[];
    }
  >();
  const identity = (source: EvidenceSource): DictionaryKinds['sourceIdentity'] =>
    source.observer.actorId === scope.actorId && source.observer.physicalLife === scope.physicalLife
      ? [source.family, source.id]
      : [source.family, source.id, source.observer];
  const groupFor = (
    subject: string,
    confirmation: EvidenceSource,
    from: number,
    through: number,
    detail?: TemporalConfirmation['detailSupport'],
  ) => {
    const detailStamp =
      detail &&
      ([
        detail.proof.confirmation.revision,
        detail.proof.confirmedFrom,
        detail.proof.confirmedThrough,
      ] as const);
    const key = JSON.stringify([subject, confirmation.revision, from, through, detailStamp]);
    let group = groups.get(key);
    if (!group) {
      const check: Array<EvidenceSource['revision'] | null> = [
        confirmation.revision,
        from === header.at ? null : from,
        through === header.at ? null : through,
      ];
      while (check.length > 1 && check.at(-1) === null) check.pop();
      groups.set(
        key,
        (group = {
          subject: intern({ kind: 'text', value: subject }),
          check: check as unknown as Extract<
            TemporalFrameEntry,
            { kind: 'confirmation' }
          >['subjects'][number]['check'],
          ...(detailStamp ? { detail: detailStamp } : {}),
          fields: [],
        }),
      );
    }
    return group;
  };
  const detailBase = (detail: TemporalConfirmation['detailSupport']) =>
    detail
      ? intern({
          kind: 'checkDetail',
          value: {
            original: detail.proof.original,
            identity: identity(detail.proof.confirmation),
            from: detail.from,
            through: detail.through,
            acquiredAt: detail.acquiredAt,
            role: detail.role,
            ...(detail.proof.aliases ? { aliases: detail.proof.aliases } : {}),
          },
        })
      : null;
  const receptionFields = (
    reception: TemporalReception | undefined,
  ): [number | null, number | null] =>
    reception?.kind === 'body' && reception.poseRef
      ? [intern({ kind: 'received', value: reception.poseRef }), null]
      : [null, reception ? intern({ kind: 'reception', value: reception }) : null];
  for (const value of confirmations) {
    const group = groupFor(
      value.subject,
      value.confirmation,
      value.from,
      value.through,
      value.detailSupport,
    );
    group.fields.push(
      compactField([
        intern({ kind: 'received', value: value.reference.valueRef }),
        intern({ kind: 'fact', value: value.original }),
        intern({ kind: 'sourceIdentity', value: identity(value.confirmation) }),
        detailBase(value.detailSupport),
        ...receptionFields(value.reception),
        'fieldOrdinal' in value ? (value as TemporalConfirmationRead).fieldOrdinal : null,
      ]),
    );
  }
  let offset = 0;
  const packed: StoredCheckGroup[] = [...groups.values()].map(({ fields, ...group }) => {
    const ordinals = fields.map((field, at) => field[6] ?? offset + at);
    const members = fields.map((field) => {
      if (field[6] == null) return field;
      const value = [...field] as [...TemporalPackedFacet];
      value[6] = null;
      return compactField(value);
    });
    const result: StoredCheckGroup = {
      ...group,
      members: intern({ kind: 'members', value: members }),
      count: members.length,
      offset,
      ...(ordinals.some((ordinal, at) => ordinal !== offset + at) ? { ordinals } : {}),
    };
    offset += members.length;
    return result;
  });
  for (const value of checks) {
    const requested =
      value.membership?.chunkId === scope.id ? value.membership.entryOrdinal : undefined;
    const cached = checkMemberships.get(value.membershipKey);
    const existing = requested ?? (cached?.chunkId === scope.id ? cached.ordinal : undefined);
    const declaration = existing === undefined ? undefined : index.entries.get(existing);
    let members: number;
    const count = value.count;
    if (
      !value.declareOnly &&
      declaration?.kind === 'dictionary' &&
      declaration.value[0] === 'members' &&
      declaration.value[1].length === count
    ) {
      members = existing!;
      countDomainWork('temporalMembershipDeclarationsReused');
    } else {
      // An invalidated group's baseline owns fresh membership. A previous
      // declaration may have been narrowed in place by erasure or retirement.
      const selected = value.useReceiptFields ? receiptFields : value.fields();
      if (selected.length !== count)
        throw new Error('Native check membership changed before capture.');
      countDomainWork('temporalMembershipFieldsPacked', selected.length);
      const fields = selected.map((field) => {
        const original = field.original ?? field.support?.original;
        const source =
          field.detailSupport?.proof.confirmation ??
          field.receivedFrom ??
          field.support?.confirmation;
        if (!original || !source)
          throw new Error('A group check needs actual acquired field support.');
        return compactField([
          intern({ kind: 'received', value: field.valueRef }),
          intern({ kind: 'fact', value: original }),
          intern({ kind: 'sourceIdentity', value: identity(source) }),
          detailBase(field.detailSupport),
          ...receptionFields(field.reception),
        ]);
      });
      members = intern({ kind: 'members', value: fields });
      if (!value.declareOnly) preparedFields.push(...selected);
    }
    checkMemberships.set(value.membershipKey, { chunkId: scope.id, ordinal: members, count });
    if (value.declareOnly) {
      declarations.push(members);
      continue;
    }
    const detail = value.detail;
    const check: Array<EvidenceSource['revision'] | null> = [
      value.confirmation.revision,
      value.from === header.at ? null : value.from,
      value.through === header.at ? null : value.through,
    ];
    while (check.length > 1 && check.at(-1) === null) check.pop();
    packed.push({
      subject: intern({ kind: 'text', value: value.subject }),
      check: check as unknown as StoredCheckGroup['check'],
      ...(detail ? { detail } : {}),
      members,
      count,
      offset,
    });
    offset += count;
  }
  return packed;
}
export function prepareTemporalFrameReceipt(
  chunk: TemporalFrameWriter,
  receipt: TemporalWriteHeader,
  fields: readonly TemporalFacetReference[],
  buildCheckpoints?: TemporalCheckpointBuilder,
  confirmations: readonly TemporalConfirmation[] = [],
  checks: readonly TemporalCheckGroup[] = [],
): {
  entries: TemporalFrameEntry[];
  checkpoints: readonly TemporalCheckpointFields[];
  confirmations: readonly TemporalConfirmation[];
  checkFields: readonly TemporalFacetReference[];
} {
  const index = frameIndex(readOnlyDraftView(chunk));
  const subjects = new Set(
    [
      receipt.subject,
      ...(receipt.contextSubjects ?? []),
      ...confirmations.map((value) => value.subject),
      ...checks.map((value) => value.subject),
    ].filter((subject) => !index.subjects.has(subject)),
  );
  const includeFeatures =
    !index.featureScope &&
    (receipt.spatialContext === true ||
      confirmations.some((value) => value.reception !== undefined) ||
      checks.some((check) => check.detail !== undefined) ||
      fields.some((facet) => facet.reception !== undefined || facet.poseFrame !== undefined) ||
      !!receipt.contextSubjects?.length ||
      receipt.change === 'receiver-frame');
  let checkpoints =
    buildCheckpoints && (subjects.size || includeFeatures)
      ? buildCheckpoints(subjects, includeFeatures).filter((checkpoint) => checkpoint.facets.length)
      : [];
  if (fields.length && checkpoints.some((checkpoint) => checkpoint.subject === receipt.subject)) {
    // A native baseline assigns one admitted group, not necessarily its whole
    // track. Carry the other held groups across a chunk boundary while sharing
    // exact assignments already owned by this operation.
    const assignment = ({ ordinal: _ordinal, ...value }: TemporalFacetReference) => jsonText(value);
    const assigned = new Set(fields.map(assignment));
    checkpoints = checkpoints
      .map((checkpoint) => {
        if (checkpoint.subject !== receipt.subject) return checkpoint;
        const facets = checkpoint.facets.filter((field) => !assigned.has(assignment(field)));
        const kept = new Set(facets.map((field) => field.ordinal));
        const { availability, ...rest } = checkpoint;
        const narrowed = availability
          ?.map((group) => ({ ...group, fields: group.fields.filter((at) => kept.has(at)) }))
          .filter((group) => group.fields.length);
        return { ...rest, facets, ...(narrowed?.length ? { availability: narrowed } : {}) };
      })
      .filter((checkpoint) => checkpoint.facets.length);
  }
  const checkFields: TemporalFacetReference[] = [];
  return {
    entries: packTemporalReceipt(
      chunk,
      receipt,
      fields,
      index,
      undefined,
      checkpoints,
      confirmations,
      checks,
      checkFields,
    ),
    checkpoints,
    confirmations,
    checkFields,
  };
}
export function temporalChunkReferences(chunk: TemporalFrameOwner): ReadonlySet<string> {
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
          references: new Set(base.references),
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
  index.featureScope ||= packedFields.some((field) => field[4] != null || field[5] != null);
  for (const facet of packedFields)
    for (const field of TEMPORAL_FACET_REFERENCE_FIELDS) {
      const packed = facet[field];
      if (packed == null) continue;
      const value = dictionary(index, packed, 'received');
      if (typeof value === 'string') index.references.add(value);
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
        identity =
          checkpoint.subjectIdentity &&
          intern({ kind: 'identity', value: checkpoint.subjectIdentity }),
        facets = packFacets(checkpoint.facets, header, intern);
      const change: Extract<TemporalFrameEntry, { kind: 'checkpoint' }> = {
        ordinal: original?.ordinal ?? next(),
        kind: 'checkpoint',
        frame: header.ordinal,
        subject,
        ...(identity !== undefined ? { identity } : {}),
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
    const previous = temporalEntryConfirmations(chunk, [original]);
    if (jsonText(previous) === jsonText(values)) {
      changes.push(original);
      continue;
    }
    const previousFields = new Map(previous.map((field) => [field.fieldOrdinal, field]));
    if (
      values.every((field) => {
        const prior = previousFields.get(field.fieldOrdinal);
        return prior !== undefined && jsonText(prior) === jsonText(field);
      })
    ) {
      // Erasure narrows an existing declaration at its native address. Moving
      // the surviving members to a new declaration would revoke an unrelated
      // pending selected read solely because its sibling was forgotten.
      const change = projectTemporalOperation(
        original,
        values.map((field) => field.fieldOrdinal),
      ) as typeof original;
      index.entries.set(ordinal, change);
      changes.push(change);
      continue;
    }
    const header = index.entries.get(original.frame);
    if (header?.kind !== 'frame') throw new Error('Temporal confirmation has no retained frame.');
    const { additions, intern } = dictionaryWriter(index, nextEntryOrdinal),
      subjects = packConfirmations(values, header, intern, [], chunk, index);
    const change: Extract<TemporalFrameEntry, { kind: 'confirmation' }> = { ...original, subjects };
    for (const entry of additions) {
      nextEntryOrdinal = Math.max(nextEntryOrdinal, entry.ordinal + 1);
      index.entries.set(entry.ordinal, entry);
      if (entry.kind === 'dictionary') index.dictionary.set(key(entry.value), entry.ordinal);
    }
    index.entries.set(ordinal, change);
    changes.push(change);
  }
  const memberSelections = new Map<number, Set<number>>();
  for (const change of changes)
    if (change.kind === 'confirmation')
      for (const group of change.subjects) {
        let selected = memberSelections.get(group.members);
        if (!selected) memberSelections.set(group.members, (selected = new Set()));
        for (const position of temporalConfirmationPositions(group)) selected.add(position);
      }
  for (const [ordinal, selected] of memberSelections) {
    const entry = index.entries.get(ordinal)!;
    const narrowed = projectTemporalOperation(entry, [...selected]);
    index.entries.set(ordinal, narrowed);
    index.decodedDictionary.delete(ordinal);
    if (entry.kind === 'dictionary' && narrowed.kind === 'dictionary') {
      index.dictionary.delete(key(entry.value));
      index.dictionary.set(key(narrowed.value), ordinal);
    }
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
