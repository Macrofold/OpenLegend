import { nextId } from './data.js';
import { countDomainWork } from './diagnostic-counters.js';
import {
  appendedRecordCount,
  appendSnapshot,
  isAppendBuffer,
  readOnlyDraftView,
  touchNativeEvidence,
} from './draft.js';
import { immutableDataSnapshot, isImmutableData, jsonEncoding } from './records.js';
import type { WorldState } from './types.js';
import type {
  SensoryFacet,
  ObservationFrame,
  ReceivedObservationHeader,
} from './perception-evidence.js';
import type { TemporalFragment } from './temporal-evidence.js';
import { currentOriginal, type CurrentFacetRecord } from './perception-current.js';

/** Shared exact payloads are data, never evidence that an actor received them. */
export type ReceivedValueFragment =
  | TemporalFragment
  | { kind: 'body-pose'; pose: import('./perception-evidence.js').ObservedBodyPose }
  | { kind: 'observation-header'; header: ReceivedObservationHeader }
  | { kind: 'observation-frame'; frame: ObservationFrame };
export interface ReceivedValueReference {
  blockId: string;
  valueOrdinal: number;
}
export interface ReceivedValueBlock {
  id: string;
  at: number;
  sequence: number;
  /** Released slots never acquire a different meaning at the same address. */
  values: Array<ReceivedValueFragment | null>;
  bytes: number;
}
export interface ReceivedValueState {
  sources: Record<string, ReceivedValueBlock>;
  activeAt?: number;
  activeSources?: string[];
  activeSource?: string;
}

interface ValueIndex {
  group: readonly string[];
  vectors: Array<readonly (ReceivedValueFragment | null)[]>;
  index: Map<string, ReceivedValueReference>;
  reusable: boolean;
}
const indexes = new WeakMap<object, ValueIndex>();
const emptyGroup: string[] = immutableDataSnapshot([]);

/** The saved append group is the comparison scope. A process-local index only
 * accelerates that exact data; mutable/restored vectors are indexed afresh. */
function activeValueIndex(world: WorldState, state: ReceivedValueState): ValueIndex {
  const group = state.activeSources ? readOnlyDraftView(state.activeSources) : emptyGroup;
  const sources = readOnlyDraftView(state.sources);
  const vectors = group.map((id) => {
    const block = sources[id];
    if (!block) throw new Error('The received append group is unavailable.');
    return readOnlyDraftView(readOnlyDraftView(block).values);
  });
  const reusable =
    isImmutableData(group) &&
    vectors.every((value) => isImmutableData(value) || isAppendBuffer(value));
  const previous = reusable ? indexes.get(world) : undefined;
  if (
    previous &&
    previous.group === group &&
    vectors.every((values, index) => values === previous.vectors[index])
  )
    return previous;
  countDomainWork('receivedValueIndexBuilds');
  const index = new Map<string, ReceivedValueReference>();
  vectors.forEach((values, block) =>
    values.forEach((value, ordinal) => {
      if (!value) return;
      countDomainWork('receivedValueValuesIndexed');
      const encoded = jsonEncoding(readOnlyDraftView(value)).json;
      if (!index.has(encoded))
        index.set(encoded, { blockId: group[block]!, valueOrdinal: ordinal });
    }),
  );
  const prepared = { group, vectors, index, reusable };
  if (reusable) indexes.set(world, prepared);
  else indexes.delete(world);
  return prepared;
}

export function receivedValueState(world: WorldState): ReceivedValueState {
  return (world.receivedValues ??= { sources: {} });
}

export function receivedValueAt(
  sources: ReceivedValueState['sources'],
  reference: ReceivedValueReference,
): ReceivedValueFragment | undefined {
  const block = readOnlyDraftView(sources)[reference.blockId];
  const value = block && readOnlyDraftView(readOnlyDraftView(block).values)[reference.valueOrdinal];
  return value ? readOnlyDraftView(value) : undefined;
}

function updateBytes(block: ReceivedValueBlock): void {
  for (let count = 0; count < 4; count++) {
    const bytes = jsonEncoding(block).bytes;
    if (bytes === block.bytes) return;
    block.bytes = bytes;
  }
}

/** The caller supplies an already received complete value. Equality is checked
 * against this world's still-retained payload before any address is reused. */
export function retainReceivedValue(
  world: WorldState,
  value: ReceivedValueFragment,
  maxBytes: number,
  retained?: ReceivedValueReference,
): { reference: ReceivedValueReference; addedBytes: number; valueBytes: number } {
  const held = readOnlyDraftView(value),
    encoded = jsonEncoding(held),
    existing = retained && receivedValueAt(world.receivedValues?.sources ?? {}, retained);
  if (retained && existing && (existing === held || jsonEncoding(existing).json === encoded.json))
    // A capture watermark also carries reception/confirmation metadata. Only its
    // address may survive here; spreading it would overwrite this new receipt.
    return {
      reference: { blockId: retained.blockId, valueOrdinal: retained.valueOrdinal },
      addedBytes: 0,
      valueBytes: encoded.bytes,
    };
  const state = receivedValueState(world);
  if (state.activeAt !== world.simTime) {
    state.activeAt = world.simTime;
    state.activeSources = emptyGroup;
    delete state.activeSource;
    indexes.delete(world);
  }
  const prepared = activeValueIndex(world, state);
  const known = prepared.index.get(encoded.json);
  if (known)
    return {
      reference: { blockId: known.blockId, valueOrdinal: known.valueOrdinal },
      addedBytes: 0,
      valueBytes: encoded.bytes,
    };
  let block = state.activeSource && state.sources[state.activeSource];
  let addedBytes = 0;
  if (!block || (block.values.length > 0 && block.bytes + encoded.bytes + 1 > maxBytes)) {
    block = {
      id: nextId(world, 'received-source'),
      at: world.simTime,
      sequence: world.sequence,
      values: immutableDataSnapshot([]),
      bytes: 0,
    };
    updateBytes(block);
    addedBytes += block.bytes;
    state.sources[block.id] = block;
    state.activeSource = block.id;
    state.activeSources = immutableDataSnapshot([...(state.activeSources ?? []), block.id]);
    prepared.group = readOnlyDraftView(state.activeSources);
    prepared.vectors.push(block.values);
  }
  touchNativeEvidence(world, 'received', block.id);
  countDomainWork('receivedValueAppends');
  const ordinal = block.values.length,
    before = block.bytes;
  let previousDigits = String(before).length;
  // The existing owned append buffer copies this prefix once per native turn.
  // Only its mutation owner updates the comparison index; unknown mutable vectors rebuild.
  const previousValues = readOnlyDraftView(block.values);
  block.values =
    appendSnapshot(previousValues, [immutableDataSnapshot(held, readOnlyDraftView)], world) ??
    immutableDataSnapshot(
      [...previousValues, immutableDataSnapshot(held, readOnlyDraftView)],
      readOnlyDraftView,
    );
  if (block.values !== previousValues) countDomainWork('receivedValueVectorCopies');
  block.bytes += encoded.bytes + (block.values.length > 1 ? 1 : 0);
  for (let count = 0; count < 4; count++) {
    const digits = String(block.bytes).length,
      delta = digits - previousDigits;
    if (!delta) break;
    block.bytes += delta;
    previousDigits = digits;
  }
  addedBytes += block.bytes - before;
  const reference = { blockId: block.id, valueOrdinal: ordinal };
  prepared.index.set(encoded.json, reference);
  prepared.vectors[prepared.group.length - 1] = readOnlyDraftView(block.values);
  if (prepared.reusable) indexes.set(world, prepared);
  return { reference, addedBytes, valueBytes: encoded.bytes };
}

/** The persistence owner supplies complete current and cold reference membership.
 * Reclamation removes payloads, never readdresses a surviving fact or keeps an
 * expired sibling merely because another value in its block is still owned. */
export function pruneReceivedValueBlock(
  block: ReceivedValueBlock,
  keptOrdinals: ReadonlySet<number>,
): ReceivedValueBlock | undefined {
  if (!keptOrdinals.size) return;
  for (const ordinal of keptOrdinals)
    if (!block.values[ordinal]) throw new Error('A retained received value is unavailable.');
  let changed = false;
  const values = block.values.map((value, ordinal) => {
    if (!value || keptOrdinals.has(ordinal)) return value;
    changed = true;
    return null;
  });
  if (!changed) return block;
  const result = { ...block, values: immutableDataSnapshot(values, readOnlyDraftView) };
  updateBytes(result);
  return result;
}

export function receivedFacetValueReferences(
  value: import('./perception-evidence.js').ReceivedFacetValue,
): ReceivedValueReference[] {
  const result = [{ blockId: value.reference[0], valueOrdinal: value.reference[1] }];
  const frame = (ref: readonly [string, number]) =>
    result.push({ blockId: ref[0], valueOrdinal: ref[1] });
  if (value.reception?.kind === 'body') frame(value.reception.poseRef);
  if (value.reception?.kind === 'location') frame(value.reception.frameRef);
  if (value.reception?.kind === 'observed-motion') {
    frame(value.reception.earlier.frameRef);
    frame(value.reception.later.frameRef);
  }
  return result;
}

export function receivedObservationValueReferences(
  source: import('./perception-evidence.js').ReceivedObservation,
): ReceivedValueReference[] {
  return [
    { blockId: source.headerRef[0], valueOrdinal: source.headerRef[1] },
    ...source.facets.flatMap(({ value }) => receivedFacetValueReferences(value)),
  ];
}

/** Derived ownership only. Callers adding cold/pending ownership copy the affected
 * block sets instead of modifying this shared complete resident result. */
export type ReceivedValueReferences = ReadonlyMap<string, ReadonlySet<number>>;
type TemporalReceipt = import('./temporal-evidence.js').TemporalReceipt;
type PerceptionOwner = import('./perception-evidence.js').PerceptionEvidenceOwner;
interface ReferenceOwner {
  identity: object;
  references: ReceivedValueReferences;
  receipts?: TemporalReceipt[];
  perception?: {
    originals: PerceptionOwner['originals'];
    received: PerceptionOwner['received'];
    current: PerceptionOwner['current'];
    frame: readonly [string, number] | undefined;
  };
}
interface ReferenceIndex {
  owners: Map<string, ReferenceOwner>;
  counts: ReadonlyMap<string, ReadonlyMap<number, number>>;
  references: ReceivedValueReferences;
}
const emptyPerceptionRoot: NonNullable<WorldState['perceptionEvidence']> = immutableDataSnapshot(
  {},
);
const emptyTemporalRoot: import('./temporal-evidence.js').TemporalEvidenceState['actors'] =
  immutableDataSnapshot({});
const referenceIndexes = new WeakMap<object, WeakMap<object, [ReferenceIndex?, ReferenceIndex?]>>();
const observationReferences = new WeakMap<object, ReceivedValueReferences>();
const leaseReferences = new WeakMap<object, ReceivedValueReferences>();
const receiptReferenceOwners = new WeakMap<object, ReferenceOwner>();
// A weak last result allows incremental normal execution without retaining prior
// worlds or an indefinitely growing chain of receipt arrays.
let previousReferenceIndex: WeakRef<ReferenceIndex> | undefined;

function collectReferences(values: Iterable<ReceivedValueReference>): ReceivedValueReferences {
  const result = new Map<string, Set<number>>();
  for (const { blockId, valueOrdinal } of values) {
    let ordinals = result.get(blockId);
    if (!ordinals) result.set(blockId, (ordinals = new Set()));
    ordinals.add(valueOrdinal);
  }
  return result;
}
function combineReferences(values: Iterable<ReceivedValueReferences>): ReceivedValueReferences {
  return collectReferences(
    (function* () {
      for (const references of values)
        for (const [blockId, ordinals] of references)
          for (const valueOrdinal of ordinals) yield { blockId, valueOrdinal };
    })(),
  );
}
function originalReferences(
  input: import('./perception-evidence.js').ReceivedObservation,
): ReceivedValueReferences {
  const source = readOnlyDraftView(input);
  const cached = observationReferences.get(source);
  if (cached) return cached;
  const references = collectReferences(receivedObservationValueReferences(source));
  if (isImmutableData(source)) observationReferences.set(source, references);
  return references;
}
function currentReferences(input: CurrentFacetRecord): ReceivedValueReferences {
  const lease = readOnlyDraftView(input);
  const cached = leaseReferences.get(lease);
  if (cached) return cached;
  const references = collectReferences(
    receivedFacetValueReferences(readOnlyDraftView(lease.value)),
  );
  if (isImmutableData(lease)) leaseReferences.set(lease, references);
  return references;
}
function perceptionReferences(
  input: PerceptionOwner,
  previous: ReferenceOwner | undefined,
): ReferenceOwner {
  const owner = readOnlyDraftView(input);
  const received = readOnlyDraftView(owner.received);
  const originals = readOnlyDraftView(owner.originals);
  const current = readOnlyDraftView(owner.current);
  const frame = owner.visualConfirmation && readOnlyDraftView(owner.visualConfirmation.frameRef);
  const old = previous?.perception;
  if (
    previous &&
    old &&
    old.originals === originals &&
    old.received === received &&
    old.current === current &&
    old.frame?.[0] === frame?.[0] &&
    old.frame?.[1] === frame?.[1]
  )
    return { ...previous, identity: owner };
  countDomainWork('receivedReferenceOwnersRebuilt');
  const fragments: ReceivedValueReferences[] = [];
  if (frame) fragments.push(collectReferences([{ blockId: frame[0], valueOrdinal: frame[1] }]));
  // Original bodies shared by several leases are prepared once through their weak
  // identity cache, never re-materialized or recursively copied here.
  const usedOriginals = new Set(received);
  for (const stored of Object.values(current)) {
    const lease = readOnlyDraftView(stored);
    usedOriginals.add(lease.original);
    fragments.push(currentReferences(lease));
  }
  for (const reference of usedOriginals)
    fragments.push(originalReferences(currentOriginal(owner, reference)));
  return {
    identity: owner,
    references: combineReferences(fragments),
    perception: { received, originals, current, frame },
  };
}
function receiptReferences(
  input: TemporalReceipt[],
  previous: ReferenceOwner | undefined,
): ReferenceOwner {
  const receipts = readOnlyDraftView(input);
  const cached = receiptReferenceOwners.get(receipts);
  if (cached) return cached;
  if (previous?.identity === receipts) return previous;
  countDomainWork('receivedReferenceOwnersRebuilt');
  const appended = previous?.receipts && appendedRecordCount(previous.receipts, receipts);
  const start = appended === undefined ? 0 : receipts.length - appended;
  const changed = collectReferences(
    (function* () {
      for (let index = start; index < receipts.length; index++) {
        countDomainWork('receivedReferenceReceiptsVisited');
        for (const facet of readOnlyDraftView(receipts[index]!).facets) yield facet;
      }
    })(),
  );
  let references = changed;
  if (appended !== undefined && previous) {
    const next = new Map(previous.references);
    for (const [blockId, ordinals] of changed) {
      const old = next.get(blockId);
      if (!old || [...ordinals].some((ordinal) => !old.has(ordinal)))
        next.set(blockId, new Set([...(old ?? []), ...ordinals]));
    }
    references = next;
  }
  const owner = { identity: receipts, receipts, references };
  if (isImmutableData(receipts)) receiptReferenceOwners.set(receipts, owner);
  return owner;
}

/** Native rows are resident; the persistence owner adds exact cold receipt
 * references before reclaiming. Capture marks aid residency, but are not an
 * independent retention grant and must be omitted for last-owner deletion.
 * Exact immutable roots reuse one result across retention, residency and kernel
 * checks. Changed owners update the counted union without scanning other receipts.
 * docs/projects/attention-and-scenes-runtime-design.md#52-one-derived-resident-reference-index */
export function referencedReceivedValues(
  world: WorldState,
  options: { captures?: boolean } = {},
): ReceivedValueReferences {
  const perception = world.perceptionEvidence
    ? readOnlyDraftView(world.perceptionEvidence)
    : emptyPerceptionRoot;
  const temporal = world.experience?.temporal?.actors;
  const actors = temporal ? readOnlyDraftView(temporal) : emptyTemporalRoot;
  const mode = options.captures === false ? 0 : 1;
  const immutable = isImmutableData(perception) && isImmutableData(actors);
  const cached = immutable && referenceIndexes.get(perception)?.get(actors)?.[mode];
  if (cached) {
    countDomainWork('receivedReferenceRootsReused');
    previousReferenceIndex = new WeakRef(cached);
    return cached.references;
  }
  const previous = previousReferenceIndex?.deref();
  const owners = new Map<string, ReferenceOwner>();
  for (const [actorId, owner] of Object.entries(perception)) {
    const key = JSON.stringify(['perception', actorId]);
    owners.set(key, perceptionReferences(owner, previous?.owners.get(key)));
  }
  for (const [actorId, input] of Object.entries(actors)) {
    const actor = readOnlyDraftView(input);
    for (const input of readOnlyDraftView(actor.chunks)) {
      const chunk = readOnlyDraftView(input);
      const key = JSON.stringify(['temporal', actorId, chunk.id]);
      owners.set(key, receiptReferences(chunk.receipts, previous?.owners.get(key)));
    }
    if (mode) {
      const captures = readOnlyDraftView(actor.captures);
      const key = JSON.stringify(['capture', actorId]);
      const old = previous?.owners.get(key);
      owners.set(
        key,
        old?.identity === captures
          ? old
          : { identity: captures, references: collectReferences(Object.values(captures)) },
      );
    }
  }
  const counts = new Map(previous?.counts);
  const references = new Map(previous?.references);
  const touched = new Map<string, Map<number, number>>();
  const change = (blockId: string, ordinal: number, amount: number) => {
    let block = touched.get(blockId);
    if (!block) touched.set(blockId, (block = new Map(counts.get(blockId))));
    const next = (block.get(ordinal) ?? 0) + amount;
    if (next < 0) throw new Error('Received-value ownership changed without its source proof.');
    if (next) block.set(ordinal, next);
    else block.delete(ordinal);
  };
  const changedOwners = new Set([...(previous?.owners.keys() ?? []), ...owners.keys()]);
  for (const key of changedOwners) {
    const before = previous?.owners.get(key)?.references;
    const after = owners.get(key)?.references;
    if (before === after) continue;
    for (const [blockId, ordinals] of before ?? []) {
      const next = after?.get(blockId);
      if (ordinals !== next)
        for (const ordinal of ordinals) if (!next?.has(ordinal)) change(blockId, ordinal, -1);
    }
    for (const [blockId, ordinals] of after ?? []) {
      const old = before?.get(blockId);
      if (ordinals !== old)
        for (const ordinal of ordinals) if (!old?.has(ordinal)) change(blockId, ordinal, 1);
    }
  }
  for (const [blockId, block] of touched) {
    if (!block.size) {
      counts.delete(blockId);
      references.delete(blockId);
      continue;
    }
    counts.set(blockId, block);
    const old = references.get(blockId);
    if (!old || old.size !== block.size || [...block.keys()].some((ordinal) => !old.has(ordinal)))
      references.set(blockId, new Set(block.keys()));
  }
  const index = { owners, counts, references };
  if (immutable) {
    let byTemporal = referenceIndexes.get(perception);
    if (!byTemporal) referenceIndexes.set(perception, (byTemporal = new WeakMap()));
    let modes = byTemporal.get(actors);
    if (!modes) byTemporal.set(actors, (modes = []));
    modes[mode] = index;
    previousReferenceIndex = new WeakRef(index);
  }
  return references;
}
