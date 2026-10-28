import { nextId } from './data.js';
import { countDomainWork } from './diagnostic-counters.js';
import { readOnlyDraftView } from './draft.js';
import { immutableDataSnapshot, isImmutableData, jsonEncoding } from './records.js';
import type { WorldState } from './types.js';
import type { SensoryFacet } from './perception-evidence.js';
import type { TemporalFragment } from './temporal-evidence.js';

/** Shared exact payloads are data, never evidence that an actor received them. */
export type ReceivedValueFragment =
  | TemporalFragment
  | Extract<SensoryFacet, { kind: 'observed-motion' }>;
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
  const reusable = isImmutableData(group) && vectors.every(isImmutableData);
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
  const block = sources[reference.blockId];
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
  const state = receivedValueState(world),
    held = readOnlyDraftView(value),
    encoded = jsonEncoding(held),
    existing = retained && receivedValueAt(readOnlyDraftView(state.sources), retained);
  if (retained && existing && (existing === held || jsonEncoding(existing).json === encoded.json))
    // A capture watermark also carries reception/confirmation metadata. Only its
    // address may survive here; spreading it would overwrite this new receipt.
    return {
      reference: { blockId: retained.blockId, valueOrdinal: retained.valueOrdinal },
      addedBytes: 0,
      valueBytes: encoded.bytes,
    };
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
  countDomainWork('receivedValueAppends');
  const ordinal = block.values.length,
    before = block.bytes;
  let previousDigits = String(before).length;
  // Immutable vectors make index dependencies exact even for raw builders:
  // replace the vector to edit it; a shallow-frozen outer owner proves nothing.
  block.values = immutableDataSnapshot(
    [...readOnlyDraftView(block.values), immutableDataSnapshot(held, readOnlyDraftView)],
    readOnlyDraftView,
  );
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

export function receivedObservationValueReferences(
  source: import('./perception-evidence.js').ReceivedObservation,
): ReceivedValueReference[] {
  return source.facets.map(({ value }) => ({
    blockId: value.reference[0],
    valueOrdinal: value.reference[1],
  }));
}

/** Native rows are resident; the persistence owner adds exact cold receipt
 * references before reclaiming. Capture marks aid residency, but are not an
 * independent retention grant and must be omitted for last-owner deletion. */
export function referencedReceivedValues(
  world: WorldState,
  options: { captures?: boolean } = {},
): Map<string, Set<number>> {
  const references = new Map<string, Set<number>>();
  const add = (reference: ReceivedValueReference) => {
    const ordinals = references.get(reference.blockId) ?? new Set<number>();
    ordinals.add(reference.valueOrdinal);
    references.set(reference.blockId, ordinals);
  };
  const originals = new WeakSet<object>();
  const observation = (source: import('./perception-evidence.js').ReceivedObservation) => {
    source = readOnlyDraftView(source);
    if (originals.has(source)) return;
    originals.add(source);
    for (const reference of receivedObservationValueReferences(source)) add(reference);
  };
  for (const owner of Object.values(world.perceptionEvidence ?? {})) {
    for (const source of owner.received) observation(readOnlyDraftView(source));
    for (const lease of Object.values(readOnlyDraftView(owner.current))) {
      add({ blockId: lease.value.reference[0], valueOrdinal: lease.value.reference[1] });
      observation(readOnlyDraftView(lease.original));
    }
  }
  for (const actor of Object.values(world.experience?.temporal?.actors ?? {})) {
    for (const chunk of actor.chunks)
      for (const receipt of chunk.receipts) for (const facet of receipt.facets) add(facet);
    if (options.captures !== false)
      for (const reference of Object.values(actor.captures)) add(reference);
  }
  return references;
}
