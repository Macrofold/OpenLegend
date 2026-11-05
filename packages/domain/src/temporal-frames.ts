import type { WorldState } from './types.js';
import type { ReceivedValueLookup } from './received-values.js';
import { receivedValueAt } from './received-values.js';
import type {
  TemporalPage,
  TemporalReceipt,
  TemporalReceiptLocator,
  TemporalValue,
} from './temporal-evidence.js';
import { temporalReceiptId, materializeTemporalValue } from './temporal-evidence.js';
import type { ReceivedBatch, ReceivedEntry, ReceivedChargeDirectory } from './received-batches.js';
import { immutableDataSnapshot, isImmutableData, jsonByteLength } from './records.js';
import { appendSnapshot, readOnlyDraftView } from './draft.js';
import {
  compactReceivedReceipt,
  materializeReceivedReceipt,
  receivedRecordValueReferences,
  receivedRecordAliases,
  receivedRecordIndividualIds,
} from './received-record.js';
export {
  compactReceivedReceipt,
  materializeReceivedReceipt,
  receivedRecordValueReferences,
  receivedRecordAliases,
  receivedRecordIndividualIds,
} from './received-record.js';

export interface TemporalCheckpointAvailability {
  reason: 'unavailable' | 'unchecked' | 'released';
  at: number;
  fields: number[];
}
const edited = new WeakSet<TemporalPage['batches']>();
const selectionSources = new WeakMap<object, TemporalPage>();
export function temporalPageSelectionSource(page: TemporalPage): TemporalPage | undefined {
  return selectionSources.get(page.batches);
}
export function markTemporalPageEdited(page: TemporalPage): void {
  page.batches = immutableDataSnapshot(page.batches, readOnlyDraftView);
  edited.add(page.batches);
}
export function temporalPageMutation(page: TemporalPage): 'append' | 'edit' {
  return edited.has(readOnlyDraftView(page).batches) ? 'edit' : 'append';
}
export function temporalMemberKey(locator: TemporalReceiptLocator, memberIndex: number): string {
  return JSON.stringify([
    locator.actorId,
    locator.physicalLife,
    locator.epoch,
    locator.batchOrder,
    locator.entryIndex,
    memberIndex,
  ]);
}
export function temporalPageBatches(page: TemporalPage): readonly ReceivedBatch[] {
  return readOnlyDraftView(page.batches);
}
export function temporalPageLastReceivedAt(page: TemporalPage): number {
  return page.throughAt;
}
export function materializeReceivedEntry(
  batch: ReceivedBatch,
  entry: ReceivedEntry,
  subjects?: ReadonlySet<string>,
  members?: ReadonlySet<number>,
  includeGeometry = false,
): TemporalReceipt | undefined {
  const receipt = entry.receipt;
  if (
    subjects &&
    !subjects.has(receipt.subject) &&
    !receipt.contextSubjects?.some((subject) => subjects.has(subject)) &&
    !(includeGeometry && receipt.spatialContext)
  )
    return;
  const facets = members
    ? receipt.facets.filter((facet) => members.has(facet.memberIndex))
    : receipt.facets;
  return facets.length || entry.kind === 'boundary'
    ? materializeReceivedReceipt(batch, entry, members)
    : undefined;
}
export function temporalPageReceipts(page: TemporalPage): TemporalReceipt[] {
  return page.batches.flatMap((batch) =>
    batch.entries.map((entry) => materializeReceivedReceipt(batch, entry)),
  );
}
export function temporalPageReceipt(
  page: TemporalPage,
  locator: TemporalReceiptLocator,
): TemporalReceipt | undefined {
  if (
    page.actorId !== locator.actorId ||
    page.physicalLife !== locator.physicalLife ||
    page.epoch !== locator.epoch
  )
    return;
  const batch = page.batches.find((batch) => batch.batchOrder === locator.batchOrder),
    entry = batch?.entries.find((entry) => entry.entryIndex === locator.entryIndex);
  return batch && entry ? materializeReceivedReceipt(batch, entry) : undefined;
}
export function temporalReceiptValues(
  receipt: TemporalReceipt,
  sources: ReceivedValueLookup,
): TemporalValue[] {
  return receipt.facets.flatMap((facet) => {
    const fragment = receivedValueAt(sources, facet.valueRef),
      value = fragment && materializeTemporalValue(facet, fragment, sources);
    return value ? [value] : [];
  });
}
const batchReferences = new WeakMap<ReceivedBatch, ReadonlySet<string>>();
function references(batch: ReceivedBatch): ReadonlySet<string> {
  const cached = batchReferences.get(batch);
  if (cached) return cached;
  const refs = new Set<string>();
  for (const entry of batch.entries)
    for (const ref of receivedRecordValueReferences(entry.receipt)) refs.add(ref);
  if (isImmutableData(batch)) batchReferences.set(batch, refs);
  return refs;
}
export function temporalPageReferences(page: TemporalPage): ReadonlySet<string> {
  const refs = new Set<string>();
  for (const batch of page.batches) for (const ref of references(batch)) refs.add(ref);
  return refs;
}
export interface TemporalPageMetadata {
  firstBatchOrder: number | null;
  firstEntry: number | null;
  firstMember: number | null;
  lastBatchOrder: number | null;
  lastEntry: number | null;
  lastMember: number | null;
  firstAt: number | null;
  lastAt: number | null;
  entryBytes: number;
  count: number;
  subjects: string[];
  tracks: string[];
  sourceIds: string[];
  individualIds: string[];
  occurrenceKeys: string[];
  references: string[];
  spatialContext: boolean;
  chargeDirectory: ReceivedChargeDirectory;
}
const directories = new WeakMap<ReceivedBatch, ReceivedChargeDirectory>();
export function receivedBatchChargeDirectory(
  batch: ReceivedBatch,
  sources: ReceivedValueLookup,
  world?: import('./temporal-read-context.js').TemporalReadSource,
): ReceivedChargeDirectory {
  const cached = directories.get(batch);
  if (cached) return cached;
  const first = batch.entries[0],
    last = batch.entries.at(-1),
    individualIds = new Set<string>(),
    sourceIds = new Set<string>();
  for (const entry of batch.entries) {
    for (const id of receivedRecordIndividualIds(entry.receipt, sources)) individualIds.add(id);
    for (const id of receivedRecordAliases(batch, entry, sources, world)) sourceIds.add(id);
  }
  let bytes = receivedBatchStorageBytes(batch);
  // Rich ownership is charged once per block, conservatively again in another block.
  for (const ref of references(batch)) {
    const value = receivedValueAt(sources, ref);
    if (!value) throw new Error('Received block has an unavailable owned value.');
    bytes += jsonByteLength(value);
  }
  const directory: ReceivedChargeDirectory = {
    actorId: batch.actorId,
    physicalLife: batch.physicalLife,
    epoch: batch.epoch,
    entries:
      first && last
        ? [
            {
              batchOrder: batch.batchOrder,
              firstEntry: first.entryIndex,
              entryIndex: last.entryIndex,
              lastMember: Math.max(0, ...last.receipt.facets.map((facet) => facet.memberIndex)),
              at: Math.min(...batch.entries.map((entry) => entry.receivedAt)),
              throughAt: Math.max(...batch.entries.map((entry) => entry.receivedAt)),
              order: last.order,
              bytes,
              count: batch.entries.reduce((sum, entry) => sum + entry.charge.count, 0),
              individualIds: [...individualIds],
              sourceIds: [...sourceIds],
            },
          ]
        : [],
  };
  if (isImmutableData(batch)) directories.set(batch, directory);
  return directory;
}
export function temporalPageMetadata(
  page: TemporalPage,
  options: { world?: WorldState; sources?: ReceivedValueLookup } = {},
): TemporalPageMetadata {
  const sources = options.sources ?? options.world?.receivedValues?.sources ?? {},
    subjects = new Set<string>(),
    tracks = new Set<string>(),
    ids = new Set<string>(),
    individuals = new Set<string>(),
    occurrences = new Set<string>();
  const blockDirectories = page.batches.map((batch) =>
      receivedBatchChargeDirectory(batch, sources, options.world),
    ),
    headers = blockDirectories.flatMap((directory) => directory.entries);
  for (const batch of page.batches)
    for (const entry of batch.entries) {
      const receipt = entry.receipt;
      subjects.add(receipt.subject);
      for (const subject of receipt.contextSubjects ?? []) subjects.add(subject);
      for (const facet of receipt.facets) if (facet.track) tracks.add(facet.track);
      if (entry.kind === 'occurrence')
        occurrences.add(temporalReceiptId({ ...batch, entryIndex: entry.entryIndex }));
    }
  for (const header of headers) {
    for (const id of header.sourceIds) ids.add(id);
    for (const id of header.individualIds) individuals.add(id);
  }
  const first = headers[0],
    last = headers.at(-1);
  return {
    firstBatchOrder: first?.batchOrder ?? null,
    firstEntry: first?.firstEntry ?? null,
    firstMember: first ? 0 : null,
    lastBatchOrder: last?.batchOrder ?? null,
    lastEntry: last?.entryIndex ?? null,
    lastMember: last?.lastMember ?? null,
    firstAt: headers.length ? Math.min(...headers.map((header) => header.at)) : null,
    lastAt: headers.length ? Math.max(...headers.map((header) => header.throughAt)) : null,
    entryBytes: headers.reduce((sum, header) => sum + header.bytes, 0),
    count: headers.reduce((sum, header) => sum + header.count, 0),
    subjects: [...subjects],
    tracks: [...tracks],
    sourceIds: [...ids],
    individualIds: [...individuals],
    occurrenceKeys: [...occurrences],
    references: [...temporalPageReferences(page)],
    spatialContext: page.batches.some((batch) =>
      batch.entries.some((entry) => entry.receipt.spatialContext),
    ),
    chargeDirectory: {
      actorId: page.actorId,
      physicalLife: page.physicalLife,
      epoch: page.epoch,
      entries: headers,
    },
  };
}
export interface ReceivedEntrySelection {
  batchOrder: number;
  entryIndex: number;
  members?: ReadonlySet<number>;
}
export function selectTemporalPageEntries(
  page: TemporalPage,
  selections: readonly ReceivedEntrySelection[],
  options: { world?: WorldState; sources?: ReceivedValueLookup },
): TemporalPage {
  const selected = new Map(
    selections.map((selection) => [
      JSON.stringify([selection.batchOrder, selection.entryIndex]),
      selection.members,
    ]),
  );
  const batches = page.batches.flatMap((batch) => {
    const entries = batch.entries.flatMap((entry) => {
      const key = JSON.stringify([batch.batchOrder, entry.entryIndex]);
      if (!selected.has(key)) return [];
      const members = selected.get(key);
      if (!members) return [entry];
      const facets = entry.receipt.facets.filter((facet) => members.has(facet.memberIndex));
      if (!facets.length && entry.kind !== 'boundary') return [];
      const publicReceipt = materializeReceivedReceipt(batch, entry, members),
        receipt = compactReceivedReceipt(batch, publicReceipt);
      return [
        {
          ...entry,
          receipt,
          charge: {
            bytes: jsonByteLength(receipt),
            count: entry.kind === 'boundary' ? 0 : facets.length,
          },
        },
      ];
    });
    return entries.length ? [{ ...batch, entries }] : [];
  });
  const result = { ...page, batches };
  const metadata = temporalPageMetadata(result, options);
  Object.assign(result, {
    subjects: metadata.subjects,
    sourceIds: metadata.sourceIds,
    individualIds: metadata.individualIds,
    sourceRefs: metadata.references,
    bytes: metadata.entryBytes,
    count: metadata.count,
    fromAt: metadata.firstAt ?? 0,
    throughAt: metadata.lastAt ?? 0,
  });
  selectionSources.set(result.batches, page);
  return result;
}
export function replaceTemporalPageReceipts(
  page: TemporalPage,
  receipts: readonly TemporalReceipt[],
  _world: WorldState,
): void {
  const selected = new Map(
    receipts.map((receipt) => [JSON.stringify([receipt.batchOrder, receipt.entryIndex]), receipt]),
  );
  page.batches = page.batches.flatMap((batch) => {
    const entries = batch.entries.flatMap((entry) => {
      const receipt = selected.get(JSON.stringify([batch.batchOrder, entry.entryIndex]));
      if (!receipt) return [];
      const compact = compactReceivedReceipt(batch, receipt);
      return [
        {
          ...entry,
          receipt: compact,
          charge: {
            bytes: jsonByteLength(compact),
            count: entry.kind === 'boundary' ? 0 : receipt.facets.length,
          },
        },
      ];
    });
    return entries.length ? [{ ...batch, entries }] : [];
  });
  markTemporalPageEdited(page);
}
export function selectReceivedReceiptMembers(
  page: TemporalPage,
  locator: TemporalReceiptLocator,
  members?: ReadonlySet<number>,
  subjects?: ReadonlySet<string>,
): TemporalReceipt | undefined {
  if (
    page.actorId !== locator.actorId ||
    page.physicalLife !== locator.physicalLife ||
    page.epoch !== locator.epoch
  )
    return;
  const batch = page.batches.find((batch) => batch.batchOrder === locator.batchOrder),
    entry = batch?.entries.find((entry) => entry.entryIndex === locator.entryIndex);
  return batch && entry ? materializeReceivedEntry(batch, entry, subjects, members) : undefined;
}
export function appendTemporalPageBatch(
  page: TemporalPage,
  batch: ReceivedBatch,
  world?: WorldState,
): void {
  const value = immutableDataSnapshot(batch, readOnlyDraftView);
  page.batches = appendSnapshot(page.batches, [value], world) ?? [...page.batches, value];
}
const batchStorageBytes = new WeakMap<ReceivedBatch, number>();
export function receivedBatchStorageBytes(batch: ReceivedBatch): number {
  const cached = batchStorageBytes.get(batch);
  if (cached !== undefined) return cached;
  const size = jsonByteLength(batch);
  if (isImmutableData(batch)) batchStorageBytes.set(batch, size);
  return size;
}
