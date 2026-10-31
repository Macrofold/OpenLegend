import { temporalFacetValueReferences } from './temporal-evidence.js';
import { temporalChunkReferences } from './temporal-frames.js';
import { nextId } from './data.js';
import { countDomainWork } from './diagnostic-counters.js';
import { readOnlyDraftView, touchNativeEvidence } from './draft.js';
import { immutableDataSnapshot, isImmutableData, jsonEncoding } from './records.js';
import type { WorldState } from './types.js';
import type {
  SensoryFacet,
  ObservationFrame,
  ReceivedObservationHeader,
} from './perception-evidence.js';
import type { TemporalFragment } from './temporal-evidence.js';
import type { CurrentContact } from './perception-current.js';
import {
  orderedRecordGet,
  orderedRecordChangedKeys,
  orderedRecordEntries,
} from './ordered-record.js';

/** Shared exact payloads are data, never evidence that an actor received them. */
export type ReceivedValueFragment =
  | TemporalFragment
  | { kind: 'observation-header'; header: ReceivedObservationHeader }
  | { kind: 'observation-frame'; frame: ObservationFrame };
export type ReceivedValueReference = string | ReceivedValueFragment;
export type ReceivedValueLookup = Readonly<
  Record<string, { readonly value: ReceivedValueFragment }>
>;
export interface ReceivedValue {
  id: string;
  at: number;
  sequence: number;
  /** Immutable content. Receiver grants remain on personal evidence owners. */
  value: ReceivedValueFragment;
  bytes: number;
}
export interface ReceivedValueState {
  sources: Record<string, ReceivedValue>;
}

interface ValueIndex {
  at: number;
  values: Map<string, ReceivedValueReference>;
}
// Phase-local preparation only. No saved append/layout state or historical address cache.
const indexes = new WeakMap<WorldState, ValueIndex>();

export function receivedValueState(world: WorldState): ReceivedValueState {
  return (world.receivedValues ??= { sources: {} });
}

export function receivedValueAt(
  sources: ReceivedValueLookup,
  input: ReceivedValueReference | { valueRef: ReceivedValueReference },
): ReceivedValueFragment | undefined {
  const reference = typeof input === 'object' && 'valueRef' in input ? input.valueRef : input;
  if (typeof reference !== 'string') return readOnlyDraftView(reference);
  const record = readOnlyDraftView(sources)[reference];
  return record && readOnlyDraftView(readOnlyDraftView(record).value);
}
export function sameReceivedValueReference(
  a: ReceivedValueReference,
  b: ReceivedValueReference,
): boolean {
  return (
    a === b ||
    (typeof a !== 'string' &&
      typeof b !== 'string' &&
      jsonEncoding(a).json === jsonEncoding(b).json)
  );
}

function updateBytes(block: ReceivedValue): void {
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
  retained?: ReceivedValueReference | { valueRef: ReceivedValueReference },
): { reference: ReceivedValueReference; addedBytes: number; valueBytes: number } {
  const preferred =
    retained &&
    (typeof retained === 'object' && 'valueRef' in retained ? retained.valueRef : retained);
  const held = readOnlyDraftView(value),
    encoded = jsonEncoding(held),
    existing = preferred && receivedValueAt(world.receivedValues?.sources ?? {}, preferred);
  if (retained && existing && (existing === held || jsonEncoding(existing).json === encoded.json))
    // A capture watermark also carries reception/confirmation metadata. Only its
    // address may survive here; spreading it would overwrite this new receipt.
    return {
      reference: preferred!,
      addedBytes: 0,
      valueBytes: encoded.bytes,
    };
  // Inline small changing measurements; sharing rich/stable bodies still pays for itself.
  if (held.kind !== 'body' && encoded.bytes <= 192)
    return {
      reference: immutableDataSnapshot(held, readOnlyDraftView),
      addedBytes: 0,
      valueBytes: encoded.bytes,
    };
  const state = receivedValueState(world);
  let index = indexes.get(world);
  if (!index || index.at !== world.simTime) {
    index = { at: world.simTime, values: new Map() };
    indexes.set(world, index);
  }
  const known = index.values.get(encoded.json);
  if (known && receivedValueAt(state.sources, known))
    return { reference: known, addedBytes: 0, valueBytes: encoded.bytes };
  const record: ReceivedValue = {
    id: nextId(world, 'received-value'),
    at: world.simTime,
    sequence: world.sequence,
    value: immutableDataSnapshot(held, readOnlyDraftView),
    bytes: 0,
  };
  updateBytes(record);
  touchNativeEvidence(world, 'received', record.id);
  state.sources[record.id] = record;
  countDomainWork('receivedValueAppends');
  const reference = record.id;
  index.values.set(encoded.json, reference);
  return { reference, addedBytes: record.bytes, valueBytes: encoded.bytes };
}

export function receivedFacetValueReferences(
  value: import('./perception-evidence.js').ReceivedFacetValue,
): string[] {
  return [
    value.reference,
    ...(value.reception?.kind === 'body'
      ? [value.reception.poseRef]
      : value.reception?.kind === 'location'
        ? [value.reception.frameRef]
        : []),
  ].filter((reference): reference is string => typeof reference === 'string');
}
export function receivedObservationValueReferences(
  source: import('./perception-evidence.js').ReceivedObservation,
): string[] {
  return [
    source.headerRef,
    ...source.facets.flatMap(({ value }) => receivedFacetValueReferences(value)),
  ].filter((reference): reference is string => typeof reference === 'string');
}

export type ReceivedValueReferences = ReadonlySet<string>;
type ReferenceCounts = ReadonlyMap<string, number>;
interface CountedReferences {
  counts: ReferenceCounts;
  references: ReceivedValueReferences;
}
type PerceptionOwner = import('./perception-evidence.js').PerceptionEvidenceOwner;
interface ReferenceOwner {
  identity: object;
  references: ReceivedValueReferences;
  referenceChanges?: {
    before: WeakRef<ReceivedValueReferences>;
    blocks: ReadonlySet<string>;
  };
  perception?: {
    received: PerceptionOwner['received'];
    current: PerceptionOwner['current'];
    motion: PerceptionOwner['motionSamples'];
    frame: ReceivedValueReference | undefined;
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
const contactReferences = new WeakMap<object, ReceivedValueReferences>();
// A weak last result allows incremental normal execution without retaining prior
// worlds or an indefinitely growing chain of receipt arrays.
let previousReferenceIndex: WeakRef<ReferenceIndex> | undefined;

function collectReferences(values: Iterable<string>): ReceivedValueReferences {
  return new Set(values);
}
/** Count real contributing owners, updating only IDs whose membership changed. */
function referenceDelta(previous?: CountedReferences) {
  const touched = new Map<string, number>(),
    changedBlocks = new Set<string>();
  const change = (id: string, amount: number) => {
    const next = (touched.get(id) ?? previous?.counts.get(id) ?? 0) + amount;
    if (next < 0) throw new Error('Received-value ownership changed without its source proof.');
    touched.set(id, next);
  };
  return {
    changedBlocks,
    update(
      before: ReceivedValueReferences | undefined,
      after: ReceivedValueReferences | undefined,
      ids?: ReadonlySet<string>,
    ) {
      if (before === after) return;
      for (const id of ids ?? before ?? []) if (before?.has(id) && !after?.has(id)) change(id, -1);
      for (const id of ids ?? after ?? []) if (after?.has(id) && !before?.has(id)) change(id, 1);
    },
    finish(): CountedReferences {
      if (!touched.size && previous) return previous;
      const counts = new Map(previous?.counts),
        references = new Set(previous?.references);
      for (const [id, count] of touched) {
        if (count) counts.set(id, count);
        else counts.delete(id);
        if (count > 0 !== references.has(id)) changedBlocks.add(id);
        if (count) references.add(id);
        else references.delete(id);
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
/** One current contact owns only its held groups and their acquired originals. */
export function receivedContactValueReferences(input: CurrentContact): ReceivedValueReferences {
  const contact = readOnlyDraftView(readOnlyDraftView(input).content),
    cached = contactReferences.get(contact);
  if (cached) return cached;
  const refs = new Set<string>();
  for (const source of Object.values(readOnlyDraftView(contact.originals)))
    for (const id of receivedObservationValueReferences(readOnlyDraftView(source))) refs.add(id);
  for (const raw of readOnlyDraftView(contact.groups))
    for (const field of Object.values(readOnlyDraftView(readOnlyDraftView(raw).fields)))
      for (const id of receivedFacetValueReferences(readOnlyDraftView(field).value)) refs.add(id);
  if (isImmutableData(contact)) contactReferences.set(contact, refs);
  return refs;
}
function frameReferences(frame: ReceivedValueReference | undefined) {
  return frame ? collectReferences(typeof frame === 'string' ? [frame] : []) : undefined;
}
function phaseReferences(sources: PerceptionOwner['received']): ReceivedValueReferences {
  return collectReferences(
    readOnlyDraftView(sources).flatMap((source) =>
      receivedObservationValueReferences(readOnlyDraftView(source)),
    ),
  );
}
function perceptionReferences(
  input: PerceptionOwner,
  previous: ReferenceOwner | undefined,
): ReferenceOwner {
  const owner = readOnlyDraftView(input),
    current = readOnlyDraftView(owner.current),
    received = readOnlyDraftView(owner.received),
    motion = owner.motionSamples && readOnlyDraftView(owner.motionSamples),
    frame = owner.visualConfirmation?.frameRef,
    old = previous?.perception;
  if (
    previous &&
    old &&
    old.current === current &&
    old.received === received &&
    old.motion === motion &&
    old.frame === frame
  )
    return { ...previous, identity: owner };
  const changed = old && orderedRecordChangedKeys(old.current, current),
    incremental = !!old && !!changed && isImmutableData(owner),
    delta = referenceDelta(
      incremental ? { counts: old!.counts, references: previous!.references } : undefined,
    );
  if (incremental) {
    for (const id of changed!) {
      const before = orderedRecordGet(old!.current, id),
        after = orderedRecordGet(current, id);
      delta.update(
        before && receivedContactValueReferences(before),
        after && receivedContactValueReferences(after),
      );
    }
    if (old!.received !== received)
      delta.update(phaseReferences(old!.received), phaseReferences(received));
    delta.update(frameReferences(old!.frame), frameReferences(frame));
  } else {
    countDomainWork('receivedReferenceOwnersRebuilt');
    // Contact values are bounded; no individual proof or body is materialized.
    for (const [, contact] of orderedRecordEntries(current))
      delta.update(undefined, receivedContactValueReferences(contact));
    delta.update(undefined, phaseReferences(received));
    delta.update(undefined, frameReferences(frame));
  }
  if (!incremental || old!.motion !== motion) {
    const refs = (items: PerceptionOwner['motionSamples']) =>
      collectReferences(
        Object.values(items ?? {}).flatMap((track) =>
          receivedFacetValueReferences(track.earlier.value),
        ),
      );
    delta.update(incremental ? refs(old!.motion) : undefined, refs(motion));
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
    perception: { current, received, motion, frame, counts },
  };
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
