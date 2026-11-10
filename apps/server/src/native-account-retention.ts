import { summaryMemory, type ExperienceSummary } from '@open-legend/domain';
import type {
  NativeWorldAccountRetention,
  NativeWorldConsumer,
} from '@open-legend/native-simulation';
import { ACCOUNT_RETENTION_PREPARATION } from './account-retention.js';
import { accountTables, readAccountRetentionCandidates } from './retention-metadata.js';
import type { LiveReadCuts } from './live-read-overlay.js';
import { selectActorRecordChanges } from './actor-record-selection.js';
import { mergeRecordChanges, type RecordChanges, type RowChange } from './world-records.js';
import { RECORD_NODES } from './world-record-schema.js';
import { nativeCurrentRow } from './native-current-sources.js';
import type { SqlDatabase } from './store.js';
import { sqlRowBatches } from './sql-rows.js';
import {
  decodeNativeProduct,
  releaseNativeProduct,
  retainNativeSources,
} from './native-consumer.js';

type Kind = 'awareness' | 'memory' | 'summary';
type Category = 'optional' | 'required' | 'speech';
export interface NativeAccountRetentionRequest {
  worldId: string;
  generation: string;
  acceptedCut: number;
  actorId: string;
  at: number;
  due: boolean;
  pressured: readonly Category[];
}
interface Candidate {
  kind: Kind;
  id: string;
  recordId: string;
  position: number;
  revision: string;
  at: number;
  bytes: number;
  class: Category;
  due: number | null;
  rank: number;
  protected: boolean;
}
export interface RetentionCapacity {
  reserveBytes(bytes: number): NativeWorldConsumer;
}
const kindOf = (table: string): Kind =>
  table === 'mind_awareness' ? 'awareness' : table === 'mind_memories' ? 'memory' : 'summary';
const columns = (table: string, row: RowChange) =>
  Object.fromEntries(
    Object.keys(RECORD_NODES.get(table)!.columns!).map((key, index) => [key, row.extra[index]]),
  );
function candidate(
  table: string,
  row: { id: string; position: number },
  values: Readonly<Record<string, unknown>>,
): Candidate {
  return {
    kind: kindOf(table),
    id: String(values['source_id']),
    recordId: row.id,
    position: row.position,
    revision: String(values['account_revision']),
    at: Number(values['at']),
    bytes: Number(values['logical_bytes']),
    class: values['retention_class'] as Category,
    due: values['next_due_at'] === null ? null : Number(values['next_due_at']),
    rank: Number(values['policy_priority']),
    protected: Number(values['active_or_protected']) === 1,
  };
}
function pendingAt(cut: LiveReadCuts, actorId: string): RecordChanges {
  let result: RecordChanges = { writes: new Map(), deletes: new Map(), rows: 0 };
  for (const part of cut.cuts)
    result = mergeRecordChanges(result, selectActorRecordChanges(part.changes, [actorId]));
  return result;
}
/** Preparation retains the captured read cut while SQL selects actual metadata
 * and at most one actor's existing 64-account/4 MiB body slice. It performs no
 * canonical mutation and never constructs a Source world. */
export async function prepareNativeAccountRetention(
  db: SqlDatabase,
  cut: LiveReadCuts,
  request: NativeAccountRetentionRequest,
  read: NativeWorldAccountRetention,
  capacity: RetentionCapacity,
  signal: AbortSignal,
): Promise<readonly string[]> {
  if (
    !db.readAtCut ||
    !db.readTransaction ||
    !db.readMetadataBaseline ||
    cut.worldId !== request.worldId ||
    cut.generation !== request.generation ||
    cut.sequence !== request.acceptedCut
  )
    throw new Error('Account aging requires its actual captured SQL cut.');
  const pending = pendingAt(cut, request.actorId),
    roots: NativeWorldConsumer[] = [];
  let selection: { selected: readonly Candidate[] } | undefined;
  try {
    // IDs/ranks/deadlines only; dependency metadata and opaque prose are not
    // selected by this query. The per-body escrow below uses exact byte counts.
    return await db.readAtCut(cut, () =>
      db.readTransaction!(() =>
        db.readMetadataBaseline!([request.actorId], async () => {
          const input = await (async () => {
            const metadata = new Map<string, Candidate>();
            let nextDue: number | null = null,
              more = false;
            for (const table of accountTables) {
              signal.throwIfAborted();
              const overrides = new Set([
                ...(pending.writes.get(table) ?? []).map((row) => row.id),
                ...(pending.deletes.get(table) ?? []),
              ]);
              const changed = [
                ...(pending.writes.get(table) ?? [])
                  .filter((row) => !row.create)
                  .map((row) => row.id),
                ...(pending.deletes.get(table) ?? []),
              ];
              const rows = await readAccountRetentionCandidates(
                db,
                request.worldId,
                table,
                [
                  {
                    actor_id: request.actorId,
                    at: request.at,
                    due: request.due,
                    pressured: request.pressured,
                    overridden: [...overrides],
                    changed,
                  },
                ],
                true,
                (rows, bytes) => {
                  // Two fixed records carry at most nineteen scalar properties. Quoted
                  // bytes cover their actual IDs; no arbitrary source prose is decoded.
                  if (
                    !Number.isSafeInteger(rows) ||
                    rows < 0 ||
                    !Number.isSafeInteger(bytes) ||
                    bytes < 0
                  )
                    throw new Error('Account metadata preparation is not finite.');
                  roots.push(capacity.reserveBytes(bytes * 4 + rows * 2048));
                },
              );
              let dueCount = 0;
              for (const row of rows) {
                const values = row['columns'] as Readonly<Record<string, unknown>>;
                if (row['criterion'] === 'deadline') {
                  const due = values['next_due_at'];
                  if (due !== null && due !== undefined)
                    nextDue = Math.min(nextDue ?? Infinity, Number(due));
                  continue;
                }
                if (
                  row['criterion'] === 'due' &&
                  ++dueCount === ACCOUNT_RETENTION_PREPARATION.rows + 1
                )
                  more = true;
                const value = candidate(
                  table,
                  { id: String(row['id']), position: Number(row['position']) },
                  values,
                );
                metadata.set(JSON.stringify([value.kind, value.id]), value);
              }
              for (const id of pending.deletes.get(table) ?? [])
                for (const [key, value] of metadata)
                  if (value.recordId === id) metadata.delete(key);
              for (const row of pending.writes.get(table) ?? []) {
                const values = columns(table, row);
                if (values['retention_class'] === 'sensory') continue;
                const value = candidate(table, row, values);
                metadata.set(JSON.stringify([value.kind, value.id]), value);
              }
            }
            if (metadata.size > ACCOUNT_RETENTION_PREPARATION.metadataRows)
              throw new Error('Account aging exceeds complete metadata preparation.');
            return { metadata: [...metadata.values()], nextDue, more };
          })();
          signal.throwIfAborted();
          selection = decodeNativeProduct<{ selected: readonly Candidate[] }>(
            await read.select(Buffer.from(JSON.stringify(input))),
          );
          const selected = selection.selected;
          if (
            selected.length > ACCOUNT_RETENTION_PREPARATION.rows ||
            selected.reduce((n, value) => n + value.bytes, 0) > ACCOUNT_RETENTION_PREPARATION.bytes
          )
            throw new Error('Account aging selected beyond its shared preparation allowance.');
          const bytes = selected.reduce((n, value) => n + value.bytes, 0);
          roots.push(capacity.reserveBytes(bytes * 8 + selected.length * 2048));
          const reply = await (async () => {
            const result: Array<{
              kind: Kind;
              row: Pick<RowChange, 'id' | 'parent' | 'slot' | 'position' | 'payload' | 'extra'>;
              renderedSummary: string | null;
            }> = [];
            const occupied = new Set<string>();
            for (const table of accountTables) {
              const wanted = selected.filter((value) => value.kind === kindOf(table));
              const names = Object.keys(RECORD_NODES.get(table)!.columns!);
              const pendingRows = new Map(
                (pending.writes.get(table) ?? []).map((row) => [row.id, row]),
              );
              const rows = new Map<string, RowChange>();
              for (const value of wanted) {
                const row = pendingRows.get(value.recordId);
                if (row) rows.set(row.id, row);
              }
              for (const batch of sqlRowBatches(
                wanted
                  .filter((value) => !rows.has(value.recordId))
                  .map((value) => [value.recordId]),
                [request.worldId, request.actorId],
              )) {
                signal.throwIfAborted();
                const found = await db
                  .prepare(
                    `SELECT id,parent_id,slot,position,payload,${names.join(',')} FROM ${table} WHERE world_id=? AND actor_id=? AND id=ANY(?::text[])`,
                  )
                  .all(
                    request.worldId,
                    request.actorId,
                    batch.map(([id]) => id),
                  );
                for (const row of found)
                  rows.set(String(row['id']), { create: false, ...nativeCurrentRow(table, row) });
              }
              for (const value of wanted) {
                const row = rows.get(value.recordId);
                if (!row || Buffer.byteLength(row.payload) !== value.bytes)
                  throw new Error('Selected aging source changed at its captured cut.');
                result.push({
                  kind: value.kind,
                  row: {
                    id: row.id,
                    parent: row.parent,
                    slot: row.slot,
                    position: row.position,
                    payload: row.payload,
                    extra: row.extra,
                  },
                  renderedSummary:
                    value.kind === 'summary'
                      ? summaryMemory(JSON.parse(row.payload) as ExperienceSummary, request.actorId)
                          .summary
                      : null,
                });
              }
            }
            const ids = selected
              .filter((value) => value.kind !== 'memory')
              .map((value) => value.id);
            if (ids.length) {
              for (const row of await db
                .prepare(
                  'SELECT id,source_id FROM mind_memories WHERE world_id=? AND actor_id=? AND source_id=ANY(?::text[])',
                )
                .all(request.worldId, request.actorId, ids))
                if (!pending.deletes.get('mind_memories')?.includes(String(row['id'])))
                  occupied.add(String(row['source_id']));
              for (const row of pending.writes.get('mind_memories') ?? []) {
                const id = String(columns('mind_memories', row)['source_id']);
                if (ids.includes(id)) occupied.add(id);
              }
            }
            return { rows: result, occupiedMemoryIds: [...occupied] };
          })();
          signal.throwIfAborted();
          await read.load(Buffer.from(JSON.stringify(reply)));
          return retainNativeSources(
            selected.flatMap((value) => [
              value.recordId,
              JSON.stringify(['world', 'memories', request.actorId, value.id]),
            ]),
            selection,
          );
        }),
      ),
    );
  } finally {
    if (selection) releaseNativeProduct(selection);
    for (const root of roots) root.release();
  }
}
