import { appendSnapshot, isAppendBuffer, readOnlyDraftView } from './draft.js';
import { immutableDataSnapshot, isImmutableData, jsonText } from './records.js';
import type { WorldState } from './types.js';
import type { EvidenceSource, ObservationFactKey, ObservationOrigin, ReceivedFacetProof, ObservationFrame } from './perception-evidence.js';
import type { ObserverSubject } from './knowledge.js';
import type { TemporalChunk, TemporalFacetReference, TemporalReceipt, TemporalReception } from './temporal-evidence.js';
import {temporalFacetValueReferences} from './temporal-evidence.js';

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
}
type DictionaryValue = {[K in keyof DictionaryKinds]: {kind:K;value:DictionaryKinds[K]}}[keyof DictionaryKinds];
export interface TemporalPackedFacet {
  value: readonly [block: number, ordinal: number];
  pose?: readonly [block:number,ordinal:number];
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
}
export type TemporalFrameEntry =
  | { ordinal: number; kind: 'dictionary'; value: DictionaryValue }
  | { ordinal: number; kind: 'frame'; acquisition: number; at: number; order: number; receiverFrame?:ObservationFrame; coverageGap?:{from:number;through:number} }
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
      required?: true;
      sources?: number[];
      facets: TemporalPackedFacet[];
    };
export type TemporalFrameOwner = Pick<TemporalChunk, 'actorId' | 'physicalLife' | 'epoch' | 'entries'>;
/** The storage query and native materializer share this dependency contract.
 * Queries select declarations; only the native decoder interprets their values. */
export const TEMPORAL_CHANGE_DICTIONARY_FIELDS = ['subject', 'identity', 'origin'] as const;
export const TEMPORAL_CHANGE_DICTIONARY_ARRAY_FIELDS = ['contexts', 'sources'] as const;
export const TEMPORAL_FACET_DICTIONARY_FIELDS = ['original', 'source', 'support', 'reception'] as const;
export const TEMPORAL_FACET_REFERENCE_FIELDS = ['value','pose'] as const;
interface FrameIndex {
  length: number;
  entries: Map<number, TemporalFrameEntry>;
  dictionary: Map<string, number>;
  frames: Map<number, number>;
  receipts: Map<number, TemporalReceipt>;
  references: Map<string, Set<number>>;
}
const indexes = new WeakMap<object, FrameIndex>();
function key(value: DictionaryValue): string { return jsonText(value); }
function dictionary<K extends keyof DictionaryKinds>(index: FrameIndex, at: number, kind: K): DictionaryKinds[K] {
  const entry = index.entries.get(at);
  if (entry?.kind !== 'dictionary' || entry.value.kind !== kind)
    throw new Error('Temporal frame has an invalid dictionary reference.');
  return entry.value.value as DictionaryKinds[K];
}
function decode(chunk: TemporalFrameOwner, entry: Extract<TemporalFrameEntry, {kind:'change'}>, index: FrameIndex): TemporalReceipt {
  const frame = index.entries.get(entry.frame);
  if (frame?.kind !== 'frame') throw new Error('Temporal change has no acquisition frame.');
  return immutableDataSnapshot({
    id: `temporal-receipt-${chunk.epoch}-${entry.receipt}`,
    actorId: chunk.actorId, physicalLife: chunk.physicalLife, epoch: chunk.epoch,
    ordinal: entry.receipt, acquisition: frame.acquisition, at: frame.at, order: entry.order ?? frame.order,
    ...(frame.receiverFrame ? {receiverFrame:frame.receiverFrame}:{}),
    ...(frame.coverageGap ? {coverageGap:frame.coverageGap}:{}),
    subject: dictionary(index, entry.subject, 'text'),
    ...(entry.contexts ? {contextSubjects: entry.contexts.map(at => dictionary(index, at, 'text'))} : {}),
    ...(entry.identity !== undefined ? {subjectIdentity: dictionary(index, entry.identity, 'identity')} : {}),
    ...(entry.origin !== undefined ? {origin: dictionary(index, entry.origin, 'origin')} : {}),
    change: entry.change, required: entry.required === true,
    sourceIds: (entry.sources ?? []).map(at => dictionary(index, at, 'text')),
    facets: entry.facets.map((facet, ordinal): TemporalFacetReference => ({
      blockId: dictionary(index, facet.value[0], 'text'), valueOrdinal: facet.value[1],
      ordinal: facet.ordinal ?? ordinal, role: facet.role ?? 'direct',
      asOf: facet.at ?? frame.at, measuredThrough: facet.through ?? frame.at,
      measuredFrom: facet.from ?? facet.through ?? frame.at,
      acquiredAt: facet.acquired ?? frame.at,
      ...(facet.confirmed !== undefined ? {confirmedThrough: facet.confirmed} : {}),
      ...(facet.original !== undefined ? {original: dictionary(index, facet.original, 'fact')} : {}),
      ...(facet.source !== undefined ? {receivedFrom: dictionary(index, facet.source, 'source')} : {}),
      ...(facet.support !== undefined ? {support: dictionary(index, facet.support, 'proof')} : {}),
      ...(facet.pose ? {reception:{kind:'body' as const,poseRef:[dictionary(index,facet.pose[0],'text'),facet.pose[1]] as const}} : facet.reception !== undefined ? {reception: dictionary(index, facet.reception, 'reception')} : {}),
    })),
  });
}
function frameIndex(chunk: TemporalFrameOwner): FrameIndex {
  const entries = readOnlyDraftView(chunk.entries);
  const reusable = isImmutableData(entries) || isAppendBuffer(entries);
  let index = reusable ? indexes.get(entries) : undefined;
  if (!index) index = {length:0, entries:new Map(), dictionary:new Map(), frames:new Map(), receipts:new Map(), references:new Map()};
  for (let at=index.length; at<entries.length; at++) {
    const entry = readOnlyDraftView(entries[at]!);
    if (index.entries.has(entry.ordinal)) throw new Error('Duplicate temporal storage ordinal.');
    index.entries.set(entry.ordinal, entry);
    if (entry.kind === 'dictionary') index.dictionary.set(key(entry.value), entry.ordinal);
    else if (entry.kind === 'frame') {
      if (index.frames.has(entry.acquisition)) throw new Error('Duplicate acquisition in temporal chunk.');
      index.frames.set(entry.acquisition, entry.ordinal);
    } else if (entry.kind === 'change') {
      if (index.receipts.has(entry.receipt)) throw new Error('Duplicate temporal operation.');
      const receipt=decode(chunk, entry, index);
      index.receipts.set(entry.receipt,receipt);
      for(const facet of receipt.facets)for(const reference of temporalFacetValueReferences(facet)) {let ordinals=index.references.get(reference.blockId);if(!ordinals)index.references.set(reference.blockId,(ordinals=new Set()));ordinals.add(reference.valueOrdinal);}
    } else throw new Error('Unsupported temporal frame entry.');
  }
  index.length = entries.length;
  if (reusable) indexes.set(entries,index);
  return index;
}
/** Pure read products. No reader appends evidence or resolves hidden world data. */
export function temporalChunkReceipts(chunk: TemporalFrameOwner): TemporalReceipt[] {
  return [...frameIndex(readOnlyDraftView(chunk)).receipts.values()];
}
export function temporalChunkReceipt(chunk: TemporalFrameOwner, ordinal: number): TemporalReceipt | undefined {
  return frameIndex(readOnlyDraftView(chunk)).receipts.get(ordinal);
}
/** Exact self-contained physical closure for one personal operation. This never
 * includes unrelated observations merely because they share a storage page. */
export function temporalReceiptEntries(chunk: TemporalFrameOwner, receiptOrdinal: number): TemporalFrameEntry[] {
  const index=frameIndex(readOnlyDraftView(chunk));
  const change=chunk.entries.find((entry):entry is Extract<TemporalFrameEntry,{kind:'change'}>=>entry.kind==='change'&&entry.receipt===receiptOrdinal);
  if(!change)return [];
  const ordinals=new Set<number>([change.ordinal,change.frame]);
  for(const field of TEMPORAL_CHANGE_DICTIONARY_FIELDS)if(change[field]!==undefined)ordinals.add(change[field]);
  for(const field of TEMPORAL_CHANGE_DICTIONARY_ARRAY_FIELDS)for(const ordinal of change[field]??[])ordinals.add(ordinal);
  for(const facet of change.facets){
    for(const field of TEMPORAL_FACET_REFERENCE_FIELDS)if(facet[field])ordinals.add(facet[field][0]);
    for(const field of TEMPORAL_FACET_DICTIONARY_FIELDS)if(facet[field]!==undefined)ordinals.add(facet[field]);
  }
  return [...ordinals].sort((a,b)=>a-b).map(ordinal=>index.entries.get(ordinal)!);
}
export function temporalEntryReceipts(chunk: TemporalFrameOwner, entries: readonly TemporalFrameEntry[]): TemporalReceipt[] {
  const index = frameIndex(readOnlyDraftView(chunk));
  return entries.flatMap(entry => entry.kind === 'change' ? [index.receipts.get(entry.receipt)!] : []);
}
export function prepareTemporalFrameReceipt(chunk: TemporalFrameOwner, receipt: TemporalReceipt): TemporalFrameEntry[] {
  const base=frameIndex(readOnlyDraftView(chunk));
  const index = { entries:new Map<number,TemporalFrameEntry>(), dictionary:new Map<string,number>(), frames:new Map<number,number>() };
  const additions: TemporalFrameEntry[] = [];
  let ordinal = (readOnlyDraftView(chunk.entries).at(-1)?.ordinal ?? -1) + 1;
  const intern = (value: DictionaryValue): number => {
    const encoded = key(value), known = index.dictionary.get(encoded) ?? base.dictionary.get(encoded);
    if (known !== undefined) return known;
    const entry: TemporalFrameEntry = immutableDataSnapshot({ordinal: ordinal++, kind:'dictionary', value}, readOnlyDraftView);
    additions.push(entry); index.dictionary.set(encoded,entry.ordinal); index.entries.set(entry.ordinal,entry);
    return entry.ordinal;
  };
  let frame = base.frames.get(receipt.acquisition);
  if (frame === undefined) {
    const entry: TemporalFrameEntry = {ordinal: ordinal++, kind:'frame', acquisition:receipt.acquisition, at:receipt.at, order:receipt.order,...(receipt.receiverFrame?{receiverFrame:receipt.receiverFrame}:{}),...(receipt.coverageGap?{coverageGap:receipt.coverageGap}:{})};
    additions.push(entry); index.entries.set(entry.ordinal,entry); index.frames.set(receipt.acquisition,entry.ordinal); frame=entry.ordinal;
  }
  const header = (index.entries.get(frame) ?? base.entries.get(frame))! as Extract<TemporalFrameEntry,{kind:'frame'}>;
  const subject=intern({kind:'text',value:receipt.subject});
  const contexts=receipt.contextSubjects?.map(value=>intern({kind:'text',value}));
  const identity=receipt.subjectIdentity && intern({kind:'identity',value:receipt.subjectIdentity});
  const origin=receipt.origin && intern({kind:'origin',value:receipt.origin});
  const sources=receipt.sourceIds.map(value=>intern({kind:'text',value}));
  const facets=receipt.facets.map((facet,at): TemporalPackedFacet => ({
    value:[intern({kind:'text',value:facet.blockId}),facet.valueOrdinal],
    ...(facet.ordinal!==at ? {ordinal:facet.ordinal}:{}),
    ...(facet.role!=='direct' ? {role:facet.role}:{}),
    ...(facet.asOf!==header.at ? {at:facet.asOf}:{}),
    ...(facet.measuredThrough!==header.at ? {through:facet.measuredThrough}:{}),
    ...(facet.measuredFrom!==facet.measuredThrough ? {from:facet.measuredFrom}:{}),
    ...(facet.acquiredAt!==header.at ? {acquired:facet.acquiredAt}:{}),
    ...(facet.confirmedThrough!==undefined ? {confirmed:facet.confirmedThrough}:{}),
    ...(facet.original ? {original:intern({kind:'fact',value:facet.original})}:{}),
    ...(facet.receivedFrom ? {source:intern({kind:'source',value:facet.receivedFrom})}:{}),
    ...(facet.support ? {support:intern({kind:'proof',value:facet.support})}:{}),
    ...(facet.reception?.kind==='body'&&facet.reception.poseRef ? {pose:[intern({kind:'text',value:facet.reception.poseRef[0]}),facet.reception.poseRef[1]] as const} : facet.reception ? {reception:intern({kind:'reception',value:facet.reception})}:{}),
  }));
  additions.push(immutableDataSnapshot({ordinal:ordinal++,kind:'change',receipt:receipt.ordinal,frame,subject,
    ...(receipt.order!==header.order?{order:receipt.order}:{}),
    ...(contexts?.length?{contexts}:{}), ...(identity!==undefined?{identity}:{}), ...(origin!==undefined?{origin}:{}),
    change:receipt.change,...(receipt.required?{required:true}:{}),...(sources.length?{sources}:{}),facets,
  }));
  return additions;
}
export function temporalChunkReferences(chunk: TemporalFrameOwner): ReadonlyMap<string, ReadonlySet<number>> {
  return frameIndex(readOnlyDraftView(chunk)).references;
}
export function appendTemporalFrameReceipt(chunk: TemporalFrameOwner, receipt: TemporalReceipt, world?: WorldState, prepared?: TemporalFrameEntry[]): void {
  const entries=readOnlyDraftView(chunk.entries), base=frameIndex(readOnlyDraftView(chunk));
  const additions=prepared ?? prepareTemporalFrameReceipt(chunk,receipt);
  chunk.entries=appendSnapshot(entries,additions,world) ?? [...entries,...additions];
  const nextEntries=readOnlyDraftView(chunk.entries);
  const index: FrameIndex = nextEntries===entries && isAppendBuffer(entries) ? base : {
    length:base.length, entries:new Map(base.entries), dictionary:new Map(base.dictionary), frames:new Map(base.frames), receipts:new Map(base.receipts), references:new Map(base.references),
  };
  for(const entry of additions) {
    index.entries.set(entry.ordinal,entry);
    if(entry.kind==='dictionary')index.dictionary.set(key(entry.value),entry.ordinal);
    else if(entry.kind==='frame')index.frames.set(entry.acquisition,entry.ordinal);
  }
  index.receipts.set(receipt.ordinal,receipt);
  const touched=new Set<string>();
  for(const facet of receipt.facets) for(const reference of temporalFacetValueReferences(facet)) {
    let ordinals=index.references.get(reference.blockId);
    if(!touched.has(reference.blockId)) {ordinals=new Set(ordinals);index.references.set(reference.blockId,ordinals);touched.add(reference.blockId);}
    ordinals!.add(reference.valueOrdinal);
  }
  index.length=nextEntries.length;
  if(isImmutableData(nextEntries)||isAppendBuffer(nextEntries))indexes.set(nextEntries,index);
}
/** Correction/prefix expiry rewrites only this bounded chunk; logical personal
 * addresses remain stable and unused dictionary/body metadata actually leaves. */
export function replaceTemporalChunkReceipts(chunk: TemporalFrameOwner, receipts: readonly TemporalReceipt[], world?: WorldState): void {
  chunk.entries=[];
  for (const receipt of receipts) appendTemporalFrameReceipt(chunk,receipt,world);
}
