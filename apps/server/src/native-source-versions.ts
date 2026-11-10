import { jsonByteLength } from '@open-legend/domain';
import { parseSourceJson } from './native-source-preparation.js';
import type { NativeChangedRows, NativeGeometryQueries } from '@open-legend/native-simulation';
import { nativeRecordChanges } from './native-records.js';
import type { LiveReadCuts } from './live-read-overlay.js';
import { personalAccountRevision } from './personal-accounts.js';
import type { RetentionRow } from './retention-metadata.js';
import { prepareSourceVersionPlan, type SourceVersionPlan } from './source-version-retention.js';
import type { SqlDatabase } from './store.js';
import { RECORD_NODES } from './world-record-schema.js';
import type { RecordChanges } from './world-records.js';
import type { NativeRestoreArchive } from './native-restore.js';

/** Selected immutable bodies immediately before a native personal replacement.
 * They keep their actual source revision and SQL placement; no world is rebuilt. */
export interface NativePersonalPredecessor {
  readonly table: string;
  readonly id: string;
  readonly parent: string;
  readonly slot: string;
  readonly position: number;
  readonly actorId: string;
  readonly payload: string;
  readonly extra: readonly unknown[];
  readonly encodedBytes: number;
}

export interface NativeSourceVersionContext {
  readonly worldId: string;
  readonly generation: string;
  readonly baseCut: number;
  readonly cuts: readonly { readonly actorId: string; readonly forgotten: readonly string[] }[];
}
export interface NativeSourceVersionsRequest extends NativeSourceVersionContext {
  readonly binding: NativeGeometryQueries['binding'];
  readonly records: NativeChangedRows;
  readonly personalPredecessors: readonly NativePersonalPredecessor[];
  readonly maximumTransferBytes: number;
  readonly restoreProjection?: NativeChangedRows;
  readonly archiveBaseline?: readonly NativeRestoreArchive[];
}
/** The native candidate asks once, before its temporal header and save rows are
 * sealed. The ordinary application stage consumes this exact plan afterward. */
export async function readNativeSourceVersions(
  db: SqlDatabase,
  beforeCut: LiveReadCuts,
  request: NativeSourceVersionsRequest,
): Promise<{
  readonly binding: NativeGeometryQueries['binding'];
  readonly plan: SourceVersionPlan;
}> {
  const plan = await prepareNativeSourceVersionPlan(
    db,
    request,
    nativeRecordChanges(request.records),
    request.personalPredecessors,
    beforeCut,
  );
  const reply = { binding: request.binding, plan };
  if (
    !Number.isSafeInteger(request.maximumTransferBytes) ||
    request.maximumTransferBytes <= 0 ||
    jsonByteLength(reply, { cache: false }) > request.maximumTransferBytes
  )
    throw new Error('Native source-version reply exceeds its actual transfer allowance.');
  return reply;
}

const accountTables = new Set(['mind_awareness', 'mind_memories', 'mind_summaries']);
const key = (table: string, id: string) => JSON.stringify([table, id]);

/** Use the existing source-retention planner over the same live-before database
 * view used by this candidate. That view must include earlier accepted unsaved
 * changes: durable SQL alone cannot prove a pending learned-source revision.
 * The host retains the candidate/cut fence across this asynchronous preparation. */
export async function prepareNativeSourceVersionPlan(
  db: SqlDatabase,
  input: NativeSourceVersionContext,
  changes: RecordChanges,
  predecessors: readonly NativePersonalPredecessor[],
  beforeCut: LiveReadCuts,
): Promise<SourceVersionPlan> {
  if (
    beforeCut.worldId !== input.worldId ||
    beforeCut.generation !== input.generation ||
    beforeCut.sequence !== input.baseCut ||
    !db.readAtCut ||
    !db.readTransaction
  )
    throw new Error('Native source preparation requires its exact accepted predecessor cut.');
  const before = new Map<string, RetentionRow>();
  const previous = new Map<string, Map<string, unknown>>();
  for (const row of predecessors) {
    if (!accountTables.has(row.table))
      throw new Error('Native source predecessor is not a personal account.');
    const columns = Object.keys(RECORD_NODES.get(row.table)!.columns!);
    if (columns.length !== row.extra.length || Buffer.byteLength(row.payload) !== row.encodedBytes)
      throw new Error('Native source predecessor columns or byte charge disagree.');
    const values = Object.fromEntries(columns.map((column, index) => [column, row.extra[index]]));
    if (
      values['actor_id'] !== row.actorId ||
      values['account_revision'] !== personalAccountRevision(row.payload)
    )
      throw new Error('Native source predecessor does not match its owner or revision.');
    const identity = key(row.table, row.id);
    if (before.has(identity)) throw new Error('Duplicate native source predecessor.');
    before.set(identity, {
      table: row.table as RetentionRow['table'],
      id: row.id,
      parent: row.parent,
      position: row.position,
      actorId: row.actorId,
      columns: values,
      encodedBytes: row.encodedBytes,
    });
    let bodies = previous.get(row.table);
    if (!bodies) previous.set(row.table, (bodies = new Map()));
    bodies.set(row.id, parseSourceJson(row.payload) as unknown);
  }
  const forgotten = new Map<string, ReadonlySet<string>>();
  for (const cut of input.cuts) {
    if (forgotten.has(cut.actorId)) throw new Error('Duplicate native source privacy cut.');
    forgotten.set(cut.actorId, new Set(cut.forgotten));
  }
  // PostgresDatabase validates the durable head inside this repeatable read and
  // projects only the pending tables requested by the existing planner. In-flight
  // acknowledgement cannot accidentally move this immutable read to a later cut.
  return db.readAtCut(beforeCut, () =>
    db.readTransaction!(() =>
      prepareSourceVersionPlan(db, { worldId: input.worldId, forgotten }, changes, {
        before: { get: (table, id) => before.get(key(table, id)) },
        previous,
      }),
    ),
  );
}
