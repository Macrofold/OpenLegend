import { mergeTemporalPageIntent, type PendingTemporalPage } from './temporal-page-storage.js';
import {
  mergeSourceVersionChanges,
  sourceVersionKey,
  type SourceVersionPlan,
  type SourceVersionChange,
} from './source-version-retention.js';
import { jsonText } from '@open-legend/domain';
import { RECORD_NODES } from './world-record-schema.js';
import { Buffer } from 'node:buffer';
import type { GameplayReceipt } from './command-receipts.js';
import type { SavedWorld } from './store.js';
import { mergeRowChange, type RecordChanges, type RowChange } from './world-records.js';
import { mergeHistoryPreparation, type PreparedHistory } from './history-preparation.js';

export const LIVE_SAVE_INTERVAL_MS = 1000;
export const LIVE_SAVE_MAX_AGE_MS = 5000;
export const LIVE_SAVE_MAX_BYTES = 64 * 1024 * 1024;

interface Entry {
  row?: RowChange;
  bytes: number;
  deletedCreate?: boolean;
}
type ChildIndex = Map<string, Map<string, Set<string>>>;
function indexChild(
  index: ChildIndex,
  parent: string,
  table: string,
  id: string,
  add: boolean,
): void {
  let tables = index.get(parent);
  if (!tables && add) index.set(parent, (tables = new Map()));
  if (!tables) return;
  let ids = tables.get(table);
  if (!ids && add) tables.set(table, (ids = new Set()));
  if (add) ids!.add(id);
  else ids?.delete(id);
  if (!ids?.size) tables.delete(table);
  if (!tables.size) index.delete(parent);
}
const rowBytes = (table: string, row: RowChange) => {
  const columns = Object.keys(RECORD_NODES.get(table)?.columns ?? {});
  const values = row.writeColumns
    ? row.extra.filter((_, at) => row.writeColumns!.includes(columns[at]!))
    : row.extra;
  return (
    Buffer.byteLength(row.id) +
    Buffer.byteLength(row.parent) +
    Buffer.byteLength(row.slot) +
    (!row.writeColumns || row.writeColumns.includes('payload')
      ? Buffer.byteLength(row.payload)
      : 0) +
    values.reduce<number>(
      (sum, value) =>
        sum +
        Buffer.byteLength(typeof value === 'string' ? value : (JSON.stringify(value) ?? 'null')),
      0,
    ) +
    128
  );
};

/** The existing save stream's unsaved suffix. Current rows coalesce; admitted history
 * and command outcomes survive working-set eviction. No second gameplay authority.
 * docs/projects/bookkeeping-simplification-runtime-design.md#62-accept-buffer-save */
export class PendingWorldSave {
  private readonly temporal = new Map<string, PendingTemporalPage>();
  private readonly tables = new Map<string, Map<string, Entry>>();
  private readonly children: ChildIndex = new Map();
  private readonly versionChanges = new Map<
    string,
    { change: SourceVersionChange; bytes: number }
  >();
  private sourceVersionsPrepared = false;
  private preparedVersions?: SourceVersionPlan;
  get versions(): SourceVersionPlan | undefined {
    // A real empty plan still proves closure when every referenced source
    // remains current. Coalescing cannot turn that proof into no preparation.
    if (!this.sourceVersionsPrepared) return undefined;
    return (this.preparedVersions ??= {
      changes: [...this.versionChanges.values()].map((value) => value.change),
    });
  }
  private readonly expired = new Map<string, Set<string>>();
  readonly receipts = new Map<string, GameplayReceipt>();
  history?: PreparedHistory;
  private capturedChanges?: RecordChanges;
  bytes = 0;
  through = 0;
  state?: SavedWorld;
  constructor(readonly acceptedAt: number) {}

  admit(
    state: SavedWorld,
    changes: RecordChanges,
    history: PreparedHistory,
    sequence: number,
    receipt: GameplayReceipt | undefined,
    availableBytes: number,
    versions?: SourceVersionPlan,
  ): boolean {
    const edits = new Map<string, Map<string, Entry | undefined>>();
    const stagedChildren: ChildIndex = new Map();
    let charge = this.bytes;
    const temporalChanges = new Map<string, PendingTemporalPage>();
    for (const [key, incoming] of changes.temporal ?? []) {
      const prior = this.temporal.get(key);
      const merged = mergeTemporalPageIntent(prior, incoming);
      charge += merged.reservedBytes - (prior?.reservedBytes ?? 0);
      temporalChanges.set(key, merged);
    }
    const effective = (table: string, id: string) =>
      edits.get(table)?.has(id) ? edits.get(table)!.get(id) : this.tables.get(table)?.get(id);
    const stage = (table: string, id: string, entry: Entry | undefined) => {
      const prior = effective(table, id);
      charge += (entry?.bytes ?? 0) - (prior?.bytes ?? 0);
      let rows = edits.get(table);
      if (!rows) edits.set(table, (rows = new Map()));
      rows.set(id, entry);
      if (entry?.row) indexChild(stagedChildren, entry.row.parent, table, id, true);
    };
    for (const [table, rows] of changes.writes)
      for (const incoming of rows) {
        const prior = effective(table, incoming.id);
        let row = prior?.row ? mergeRowChange(prior.row, incoming, table) : incoming;
        // A removal followed by reacquisition of the same current key replaces its
        // durable predecessor; absence in the intermediate live cut is not INSERT proof.
        if (prior && !prior.row && !prior.deletedCreate && row.create)
          row = { ...row, create: false };
        stage(table, row.id, { row, bytes: rowBytes(table, row) });
      }
    for (const [table, ids] of changes.deletes)
      for (const id of ids) {
        const prior = effective(table, id);
        const queue = [id],
          visited = new Set<string>();
        for (let at = 0; at < queue.length; at++) {
          const parent = queue[at]!;
          if (visited.has(parent)) continue;
          visited.add(parent);
          for (const index of [this.children, stagedChildren])
            for (const [childTable, children] of index.get(parent) ?? [])
              for (const childId of children) {
                const child = effective(childTable, childId);
                // A row already moved to another owner survives its former owner's removal.
                if (child?.row?.parent !== parent) continue;
                queue.push(childId);
                stage(childTable, childId, undefined);
              }
        }
        stage(table, id, {
          bytes: Buffer.byteLength(id) + 64,
          deletedCreate: prior?.row?.create ?? prior?.deletedCreate ?? false,
        });
      }
    const versionChanges = new Map<string, { change: SourceVersionChange; bytes: number }>();
    for (const incoming of versions?.changes ?? []) {
      const id = sourceVersionKey(incoming),
        prior = versionChanges.get(id) ?? this.versionChanges.get(id);
      const change = prior ? mergeSourceVersionChanges(prior.change, incoming) : incoming;
      const bytes = Buffer.byteLength(id) + Buffer.byteLength(JSON.stringify(change)) + 64;
      versionChanges.set(id, { change, bytes });
      charge += bytes - (prior?.bytes ?? 0);
    }
    // Events and their personal perspectives have their own archive owner; charge
    // their admitted input once, independently of replacement current rows.
    const historyBytes = history.changed.reduce(
      (n, event) =>
        n +
        Buffer.byteLength(jsonText(event)) +
        event.audience.reduce(
          (m, actor) =>
            m + Buffer.byteLength(JSON.stringify(history.perspective(actor, event.id) ?? null)),
          0,
        ),
      0,
    );
    const receiptBytes = receipt ? Buffer.byteLength(JSON.stringify(receipt)) : 0;
    charge += historyBytes + receiptBytes;
    if (charge > availableBytes) return false;
    for (const [table, rows] of edits)
      for (const [id, entry] of rows) {
        let entries = this.tables.get(table);
        const old = entries?.get(id);
        if (old?.row) indexChild(this.children, old.row.parent, table, id, false);
        if (entry) {
          if (!entries) this.tables.set(table, (entries = new Map()));
          entries.set(id, entry);
          if (entry.row) indexChild(this.children, entry.row.parent, table, id, true);
        } else {
          entries?.delete(id);
          if (!entries?.size) this.tables.delete(table);
        }
      }
    for (const [key, intent] of temporalChanges) this.temporal.set(key, intent);
    for (const [id, value] of versionChanges) this.versionChanges.set(id, value);
    if (versions) this.sourceVersionsPrepared = true;
    if (versionChanges.size) this.preparedVersions = undefined;
    for (const [table, ids] of changes.expired ?? []) {
      let entries = this.expired.get(table);
      if (!entries) this.expired.set(table, (entries = new Set()));
      for (const id of ids) entries.add(id);
    }
    this.history = this.history ? mergeHistoryPreparation(this.history, history) : history;
    if (receipt) this.receipts.set(receipt.id, receipt);
    this.capturedChanges = undefined;
    this.bytes = charge;
    this.state = state;
    this.through = sequence;
    return true;
  }

  changes(): RecordChanges {
    if (this.capturedChanges) return this.capturedChanges;
    const writes = new Map<string, RowChange[]>(),
      deletes = new Map<string, string[]>();
    let rows = 0;
    for (const [table, entries] of this.tables)
      for (const [id, entry] of entries) {
        if (entry.row) {
          let values = writes.get(table);
          if (!values) writes.set(table, (values = []));
          values.push(entry.row);
          rows++;
        } else {
          let values = deletes.get(table);
          if (!values) deletes.set(table, (values = []));
          values.push(id);
        }
      }
    return (this.capturedChanges = {
      ...(this.temporal.size ? { temporal: new Map(this.temporal) } : {}),
      writes,
      deletes,
      rows,
      ...(this.expired.size
        ? { expired: new Map([...this.expired].map(([table, ids]) => [table, [...ids]])) }
        : {}),
    });
  }
}
