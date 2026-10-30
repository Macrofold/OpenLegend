import { temporalFacetValueReferences } from './temporal-evidence.js';
import { temporalChunkReferences } from './temporal-frames.js';
import { nextId } from './data.js';
import { countDomainWork } from './diagnostic-counters.js';
import {
  appendedRecordCount,
  appendSnapshot,
  isAppendBuffer,
  readOnlyDraftView,
  recordMapChangesBetween,
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
  | { kind: 'observation-header'; header: ReceivedObservationHeader }
  | { kind: 'observation-frame'; frame: ObservationFrame };
export interface ReceivedValueReference {
  blockId: string;
  valueOrdinal: number;
}
export type ReceivedValueLookup = Readonly<
  Record<string, { readonly values: readonly (ReceivedValueFragment | null | undefined)[] }>
>;
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
  retirement?: ReceivedValueRetirement;
}

/** Cleanup intent survives deletion of its last personal owner and journal pruning.
 * A candidate grants no permission to delete; the server proves exact live ownership. */
export interface ReceivedValueRetirement {
  nextGeneration: number;
  bytes: number;
  optionalAdmissionBlocked: boolean;
  cursor?: string;
  pending: Record<
    string,
    {
      generation: number;
      /** Later releases do not replace an in-flight physical candidate. */
      releaseRevision: number;
      bytes: number;
      checkedRevision?: number;
      stage: 'candidate' | 'applying';
      applicationRevision?: number;
    }
  >;
}

export function receivedOptionalAdmissionBlocked(world: WorldState): boolean {
  return world.receivedValues?.retirement?.optionalAdmissionBlocked === true;
}

export function nominateReceivedValueRetirement(
  world: WorldState,
  candidates: ReadonlyMap<string, number>,
): void {
  if (!candidates.size) return;
  const owner = receivedValueState(world);
  const retirement = (owner.retirement ??= {
    nextGeneration: 0,
    bytes: 0,
    optionalAdmissionBlocked: false,
    pending: {},
  });
  for (const [id, bytes] of candidates) {
    const existing = retirement.pending[id];
    const releaseRevision = ++retirement.nextGeneration;
    retirement.pending[id] = existing
      ? { ...existing, releaseRevision, bytes: Math.max(existing.bytes, bytes) }
      : { generation: releaseRevision, releaseRevision, bytes, stage: 'candidate' };
    retirement.bytes += retirement.pending[id]!.bytes - (existing?.bytes ?? 0);
  }
}

/** Encoded journal debt and proven physical allocation charges share one server
 * allowance. A pending ownership check alone is not storage pressure. */
export function updateReceivedRetirementPressure(
  world: WorldState,
  journalBytes: number,
  maximumBytes: number,
): boolean {
  let retirement = world.receivedValues?.retirement;
  let created = false;
  if (!retirement) {
    if (journalBytes < maximumBytes) return false;
    retirement = receivedValueState(world).retirement = {
      nextGeneration: 0,
      bytes: 0,
      optionalAdmissionBlocked: false,
      pending: {},
    };
    created = true;
  }
  const blocked = retirement.bytes + journalBytes >= maximumBytes;
  if (retirement.optionalAdmissionBlocked === blocked) return created;
  retirement.optionalAdmissionBlocked = blocked;
  return true;
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
  sources: ReceivedValueLookup,
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
type ReferenceCounts = ReadonlyMap<string, ReadonlyMap<number, number>>;
interface CountedReferences {
  counts: ReferenceCounts;
  references: ReceivedValueReferences;
}
type TemporalReceipt = import('./temporal-evidence.js').TemporalReceipt;
type PerceptionOwner = import('./perception-evidence.js').PerceptionEvidenceOwner;
interface ReferenceOwner {
  identity: object;
  references: ReceivedValueReferences;
  referenceChanges?: {
    before: WeakRef<ReceivedValueReferences>;
    blocks: ReadonlySet<string>;
  };
  receipts?: TemporalReceipt[];
  perception?: {
    originals: PerceptionOwner['originals'];
    received: PerceptionOwner['received'];
    current: PerceptionOwner['current'];
    motion: PerceptionOwner['motionSamples'];
    frame: readonly [string, number] | undefined;
    receivedOriginals: ReadonlySet<string>;
    originalUses: ReadonlyMap<string, number>;
    counts: ReferenceCounts;
  };
}
interface ReferenceIndex {
  owners: Map<string, ReferenceOwner>;
  counts: ReferenceCounts;
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
/** Count each contributing piece once. Changed pieces copy only their affected
 * blocks; the published sets keep identity when membership did not change. */
function referenceDelta(previous?: CountedReferences) {
  const touched = new Map<string, Map<number, number>>();
  const changedBlocks = new Set<string>();
  const change = (blockId: string, ordinal: number, amount: number) => {
    let block = touched.get(blockId);
    if (!block) touched.set(blockId, (block = new Map(previous?.counts.get(blockId))));
    const next = (block.get(ordinal) ?? 0) + amount;
    if (next < 0) throw new Error('Received-value ownership changed without its source proof.');
    if (next) block.set(ordinal, next);
    else block.delete(ordinal);
  };
  return {
    changedBlocks,
    update(
      before: ReceivedValueReferences | undefined,
      after: ReceivedValueReferences | undefined,
      blocks?: ReadonlySet<string>,
    ) {
      if (before === after) return;
      for (const blockId of blocks ?? before?.keys() ?? []) {
        const ordinals = before?.get(blockId);
        if (!ordinals) continue;
        const next = after?.get(blockId);
        if (ordinals !== next)
          for (const ordinal of ordinals) if (!next?.has(ordinal)) change(blockId, ordinal, -1);
      }
      for (const blockId of blocks ?? after?.keys() ?? []) {
        const ordinals = after?.get(blockId);
        if (!ordinals) continue;
        const old = before?.get(blockId);
        if (ordinals !== old)
          for (const ordinal of ordinals) if (!old?.has(ordinal)) change(blockId, ordinal, 1);
      }
    },
    finish(): CountedReferences {
      if (!touched.size && previous) return previous;
      const counts = new Map(previous?.counts),
        references = new Map(previous?.references);
      for (const [blockId, block] of touched) {
        if (!block.size) {
          counts.delete(blockId);
          if (references.has(blockId)) changedBlocks.add(blockId);
          references.delete(blockId);
          continue;
        }
        const prior = counts.get(blockId);
        if (
          !prior ||
          prior.size !== block.size ||
          [...block].some(([ordinal, count]) => prior.get(ordinal) !== count)
        )
          counts.set(blockId, block);
        const old = references.get(blockId);
        if (
          !old ||
          old.size !== block.size ||
          [...block.keys()].some((ordinal) => !old.has(ordinal))
        ) {
          references.set(blockId, new Set(block.keys()));
          changedBlocks.add(blockId);
        }
      }
      return { counts, references };
    },
  };
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
function frameReferences(frame: readonly [string, number] | undefined) {
  return frame && collectReferences([{ blockId: frame[0], valueOrdinal: frame[1] }]);
}
function perceptionReferences(
  input: PerceptionOwner,
  previous: ReferenceOwner | undefined,
): ReferenceOwner {
  const owner = readOnlyDraftView(input);
  const received = readOnlyDraftView(owner.received);
  const originals = readOnlyDraftView(owner.originals);
  const current = readOnlyDraftView(owner.current);
  const motion = owner.motionSamples && readOnlyDraftView(owner.motionSamples);
  const frame = owner.visualConfirmation && readOnlyDraftView(owner.visualConfirmation.frameRef);
  const old = previous?.perception;
  if (
    previous &&
    old &&
    old.originals === originals &&
    old.received === received &&
    old.current === current &&
    old.motion === motion &&
    old.frame?.[0] === frame?.[0] &&
    old.frame?.[1] === frame?.[1]
  )
    return { ...previous, identity: owner };
  const currentChanges = old && recordMapChangesBetween(old.current, current),
    originalChanges = old && recordMapChangesBetween(old.originals, originals);
  const incremental = !!old && !!currentChanges && !!originalChanges && isImmutableData(owner);
  const delta = referenceDelta(
    incremental ? { counts: old!.counts, references: previous!.references } : undefined,
  );
  const receivedOriginals = old?.received === received ? old.receivedOriginals : new Set(received);
  let originalUses: ReadonlyMap<string, number> = incremental ? old!.originalUses : new Map();
  let changedUses = incremental ? undefined : (originalUses as Map<string, number>);
  const changedOriginals = new Set<string>();
  const useOriginal = (reference: string, amount: number) => {
    const count = (originalUses.get(reference) ?? 0) + amount;
    if (count < 0) throw new Error('A current original lost unowned support.');
    if (!changedUses) originalUses = changedUses = new Map(originalUses);
    if (count) changedUses.set(reference, count);
    else changedUses.delete(reference);
    changedOriginals.add(reference);
  };
  if (incremental) {
    for (const key of currentChanges!) {
      const before = old!.current[key] && readOnlyDraftView(old!.current[key]!),
        after = current[key] && readOnlyDraftView(current[key]!);
      if (before === after) continue;
      countDomainWork('receivedReferenceCurrentVisited');
      delta.update(before && currentReferences(before), after && currentReferences(after));
      if (before?.original !== after?.original) {
        if (before) useOriginal(before.original, -1);
        if (after) useOriginal(after.original, 1);
      }
    }
    if (old!.receivedOriginals !== receivedOriginals) {
      for (const reference of old!.receivedOriginals)
        if (!receivedOriginals.has(reference)) useOriginal(reference, -1);
      for (const reference of receivedOriginals)
        if (!old!.receivedOriginals.has(reference)) useOriginal(reference, 1);
    }
    for (const reference of originalChanges!) changedOriginals.add(reference);
    for (const reference of changedOriginals) {
      const before = old!.originalUses.has(reference),
        after = originalUses.has(reference);
      if (!before && !after) continue;
      if (before && after && old!.originals[reference] === originals[reference]) continue;
      countDomainWork('receivedReferenceOriginalsVisited');
      delta.update(
        before
          ? originalReferences(currentOriginal(previous!.identity as PerceptionOwner, reference))
          : undefined,
        after ? originalReferences(currentOriginal(owner, reference)) : undefined,
      );
    }
    delta.update(frameReferences(old!.frame), frameReferences(frame));
  } else {
    countDomainWork('receivedReferenceOwnersRebuilt');
    delta.update(undefined, frameReferences(frame));
    for (const stored of Object.values(current)) {
      const lease = readOnlyDraftView(stored);
      countDomainWork('receivedReferenceCurrentVisited');
      useOriginal(lease.original, 1);
      delta.update(undefined, currentReferences(lease));
    }
    for (const reference of receivedOriginals) useOriginal(reference, 1);
    // Several leases may share one exact original; catalogue membership alone
    // grants nothing. Only current and received users retain its payloads.
    for (const reference of originalUses.keys()) {
      countDomainWork('receivedReferenceOriginalsVisited');
      delta.update(undefined, originalReferences(currentOriginal(owner, reference)));
    }
  }
  if (!incremental || old!.motion !== motion) {
    const before = incremental
      ? collectReferences(
          Object.values(old!.motion ?? {}).flatMap((track) =>
            receivedFacetValueReferences(track.earlier.value),
          ),
        )
      : undefined;
    const after = collectReferences(
      Object.values(motion ?? {}).flatMap((track) =>
        receivedFacetValueReferences(track.earlier.value),
      ),
    );
    delta.update(before, after);
  }
  const { counts, references } = delta.finish();
  return {
    identity: owner,
    references,
    ...(incremental
      ? {
          referenceChanges: {
            before: new WeakRef(previous!.references),
            blocks: delta.changedBlocks,
          },
        }
      : {}),
    perception: {
      received,
      originals,
      current,
      motion,
      frame,
      receivedOriginals,
      originalUses,
      counts,
    },
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
  const owner = {
    identity: receipts,
    receipts,
    references,
    ...(appended !== undefined && previous
      ? {
          referenceChanges: {
            before: new WeakRef(previous.references),
            blocks: new Set(changed.keys()),
          },
        }
      : {}),
  };
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
      const old = previous?.owners.get(key);
      owners.set(
        key,
        old?.identity === chunk.entries
          ? old
          : { identity: chunk.entries, references: temporalChunkReferences(chunk) },
      );
    }
    if (mode) {
      const captures = readOnlyDraftView(actor.captures);
      const key = JSON.stringify(['capture', actorId]);
      const old = previous?.owners.get(key);
      owners.set(
        key,
        old?.identity === captures
          ? old
          : {
              identity: captures,
              references: collectReferences(
                Object.values(captures).flatMap(temporalFacetValueReferences),
              ),
            },
      );
    }
  }
  const delta = referenceDelta(previous);
  const changedOwners = new Set([...(previous?.owners.keys() ?? []), ...owners.keys()]);
  for (const key of changedOwners) {
    const before = previous?.owners.get(key)?.references,
      after = owners.get(key),
      changes = after?.referenceChanges;
    delta.update(
      before,
      after?.references,
      before && changes?.before.deref() === before ? changes.blocks : undefined,
    );
  }
  const { counts, references } = delta.finish();
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
