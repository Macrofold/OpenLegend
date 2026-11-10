import {
  receivedValueAt,
  type ReceivedValue,
  type TemporalPage,
  type TemporalReceiptLocator,
} from '@open-legend/domain';
import type { CanonicalCheckpoint } from './checkpoint.js';
import { addHistoryAccountVersions, validateHistoryEvidenceRows } from './history.js';
import {
  decodeStoryAccount,
  personalAccountKey,
  personalAccountRevision,
  storyTemporalReceipt,
} from './personal-accounts.js';
import { readTemporalPageRecord } from './temporal-storage.js';

type Row = Record<string, unknown>;
type Address = readonly [number, number, number];
type Page = { readonly row: Row; readonly first: Address; readonly last: Address };
const compare = (a: Address, b: Address) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
const owner = (actorId: string, life: number, epoch: string) =>
  JSON.stringify([actorId, life, epoch]);
function position(row: Row, first: boolean): Address {
  const prefix = first ? 'first' : 'last';
  const parts = [`${prefix}_batch_order`, `${prefix}_entry`, `${prefix}_member`].map((key) =>
    Number(row[key]),
  );
  if (parts.some((value) => !Number.isSafeInteger(value) || value < 0))
    throw new Error('Invalid checkpoint temporal page span.');
  return [parts[0]!, parts[1]!, parts[2]!];
}

/** Explicit restore may visit the complete archive. This keeps only canonical
 * row strings and scalar spans, decodes each referenced page once, and resolves
 * only the selected occurrence's values. No Node page/value world is built. */
export function validateNativeCheckpointHistory(captured: CanonicalCheckpoint): void {
  const accounts = new Map<string, string>();
  for (const rows of captured.groups.get('mind_awareness')?.values() ?? [])
    for (const row of rows) {
      const payload = String(row['payload']);
      accounts.set(
        personalAccountKey(
          captured.worldId,
          String(row['actor_id']),
          'awareness',
          String(row['source_id']),
          personalAccountRevision(payload),
        ),
        payload,
      );
    }
  addHistoryAccountVersions(captured.worldId, accounts, captured.memory.mind_source_versions);
  const values = new Map<string, Row>();
  for (const rows of captured.groups.get('mind_perception_values')?.values() ?? [])
    for (const row of rows) values.set(String(row['source_id']), row);
  const pages = new Map<string, Page[]>();
  for (const rows of captured.groups.get('mind_temporal_pages')?.values() ?? [])
    for (const row of rows) {
      const key = owner(
        String(row['actor_id']),
        Number(row['physical_life']),
        String(row['receipt_epoch']),
      );
      let list = pages.get(key);
      if (!list) pages.set(key, (list = []));
      list.push({ row, first: position(row, true), last: position(row, false) });
    }
  for (const list of pages.values()) list.sort((a, b) => compare(a.first, b.first));
  const ordinary: Row[] = [];
  const byPage = new Map<Page, Row[]>();
  const selected = new Map<Row, TemporalReceiptLocator>();
  for (const row of captured.history.history_perspectives) {
    const receipt = storyTemporalReceipt(String(row['payload']));
    if (!receipt) {
      ordinary.push(row);
      continue;
    }
    const list = pages.get(owner(receipt.actorId, receipt.physicalLife, receipt.epoch));
    const at: Address = [receipt.batchOrder, receipt.entryIndex, 0];
    let low = 0,
      high = list?.length ?? 0;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (compare(list![middle]!.first, at) <= 0) low = middle + 1;
      else high = middle;
    }
    const page = list?.[low - 1];
    if (!page || compare(at, page.last) > 0)
      throw new Error('Recent personal receipt is unavailable.');
    let rows = byPage.get(page);
    if (!rows) byPage.set(page, (rows = []));
    rows.push(row);
    selected.set(row, receipt);
  }
  let currentPage: TemporalPage | undefined;
  const perspectives = function* () {
    yield* ordinary;
    for (const [page, rows] of byPage) {
      currentPage = readTemporalPageRecord(page.row);
      yield* rows;
      currentPage = undefined;
    }
  };
  validateHistoryEvidenceRows(
    captured.history,
    captured.worldId,
    (row) => {
      const payload = String(row['payload']);
      const receipt = selected.get(row);
      if (!receipt) {
        const stored = JSON.parse(payload) as {
          id: string;
          account?: { kind: string; revision: string };
        };
        return decodeStoryAccount(
          payload,
          stored.account &&
            accounts.get(
              personalAccountKey(
                captured.worldId,
                String(row['actor_id']),
                stored.account.kind,
                stored.id,
                stored.account.revision,
              ),
            ),
        );
      }
      if (
        !currentPage ||
        currentPage.actorId !== receipt.actorId ||
        currentPage.physicalLife !== receipt.physicalLife ||
        currentPage.epoch !== receipt.epoch
      )
        throw new Error('Recent personal receipt has a different owner.');
      const batch = currentPage.batches.find((batch) => batch.batchOrder === receipt.batchOrder);
      const entry = batch?.entries.find((entry) => entry.entryIndex === receipt.entryIndex);
      if (!batch || entry?.kind !== 'occurrence')
        throw new Error('Recent personal receipt is unavailable.');
      // The source decoder restores inherited owner/clocks/dictionaries from this
      // genuine compact entry; no fabricated receipt or empty value pool is used.
      const lookup: Record<string, ReceivedValue> = Object.create(null);
      for (const field of entry.receipt.facets) {
        const reference = field.valueRef;
        if (typeof reference !== 'string' || Object.hasOwn(lookup, reference)) continue;
        const source = values.get(reference);
        if (source) lookup[reference] = JSON.parse(String(source['payload'])) as ReceivedValue;
      }
      const fragments = entry.receipt.facets
        .map((ref) => receivedValueAt(lookup, ref))
        .flatMap((value) => (value?.kind === 'event' || value?.kind === 'sound' ? [value] : []));
      return decodeStoryAccount(
        payload,
        JSON.stringify({ batch: { ...batch, entries: [entry] }, values: fragments }),
      );
    },
    perspectives(),
  );
}
