import {
  buildReceivedRecentDirectory,
  jsonByteLength,
  summaryMemory,
  type ExperienceSummary,
  type ReceivedChargeDirectory,
  type ReceivedFrontier,
  type TemporalReadContext,
} from '@open-legend/domain';
import type {
  NativeWorldAccountRetention,
  NativeWorldConsumer,
} from '@open-legend/native-simulation';
import { ACCOUNT_RETENTION_PREPARATION } from './account-retention.js';
import {
  RetentionMetadata,
  accountTables,
  readAccountRetentionCandidates,
} from './retention-metadata.js';
import type { LiveReadCuts } from './live-read-overlay.js';
import { selectActorRecordChanges } from './actor-record-selection.js';
import { mergeRecordChanges, type RecordChanges, type RowChange } from './world-records.js';
import { RECORD_NODES } from './world-record-schema.js';
import { nativeCurrentRow } from './native-current-sources.js';
import type { SqlDatabase } from './store.js';
import { sqlRowBatches } from './sql-rows.js';
import type { NativeProviderAnswer } from './native-providers.js';
import {
  attachNativeConsumer,
  decodeNativeProduct,
  releaseNativeProduct,
  retainNativeSources,
  withNativeJsonInput,
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
  reserveJson(bytes: Buffer): NativeWorldConsumer;
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
  const encoding = { reserveConsumerBytes: (bytes: number) => capacity.reserveBytes(bytes) };
  let selection: { selected: readonly Candidate[] } | undefined;
  try {
    // IDs/ranks/deadlines only; dependency metadata and opaque prose are not
    // selected by this query. The per-body escrow below uses exact byte counts.
    return await db.readAtCut(cut, () =>
      db.readTransaction!(() =>
        db.readMetadataBaseline!([request.actorId], async () => {
          const input = await accountMetadata(db, request, pending, capacity, roots, signal);
          signal?.throwIfAborted();
          selection = decodeNativeProduct<{ selected: readonly Candidate[] }>(
            await withNativeJsonInput(encoding, input, (bytes) => read.select(bytes)),
          );
          const selected = selection.selected;
          const reply = await accountBodies(
            db,
            request,
            selected,
            pending,
            capacity,
            roots,
            signal,
          );
          signal?.throwIfAborted();
          await withNativeJsonInput(encoding, reply, (bytes) => read.load(bytes));
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

async function accountMetadata(
  db: SqlDatabase,
  request: NativeAccountRetentionRequest,
  pending: RecordChanges,
  capacity: RetentionCapacity,
  roots: NativeWorldConsumer[],
  signal?: AbortSignal,
) {
  const metadata = new Map<string, Candidate>();
  let nextDue: number | null = null,
    more = false;
  for (const table of accountTables) {
    signal?.throwIfAborted();
    const overrides = new Set([
      ...(pending.writes.get(table) ?? []).map((row) => row.id),
      ...(pending.deletes.get(table) ?? []),
    ]);
    const changed = [
      ...(pending.writes.get(table) ?? []).filter((row) => !row.create).map((row) => row.id),
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
        if (!Number.isSafeInteger(rows) || rows < 0 || !Number.isSafeInteger(bytes) || bytes < 0)
          throw new Error('Account metadata preparation is not finite.');
        roots.push(capacity.reserveBytes(bytes * 4 + rows * 2048));
      },
    );
    let dueCount = 0;
    for (const row of rows) {
      const values = row['columns'] as Readonly<Record<string, unknown>>;
      if (row['criterion'] === 'deadline') {
        const due = values['next_due_at'];
        if (due !== null && due !== undefined) nextDue = Math.min(nextDue ?? Infinity, Number(due));
        continue;
      }
      if (row['criterion'] === 'due' && ++dueCount === ACCOUNT_RETENTION_PREPARATION.rows + 1)
        more = true;
      const value = candidate(
        table,
        { id: String(row['id']), position: Number(row['position']) },
        values,
      );
      metadata.set(JSON.stringify([value.kind, value.id]), value);
    }
    for (const id of pending.deletes.get(table) ?? [])
      for (const [key, value] of metadata) if (value.recordId === id) metadata.delete(key);
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
}

interface BodyRequest {
  worldId: string;
  actorId: string;
  at: number;
}
async function accountBodies(
  db: SqlDatabase,
  request: BodyRequest,
  selected: readonly Candidate[],
  pending: RecordChanges,
  capacity: RetentionCapacity,
  roots: NativeWorldConsumer[],
  signal?: AbortSignal,
) {
  if (
    selected.length > ACCOUNT_RETENTION_PREPARATION.rows ||
    selected.reduce((n, value) => n + value.bytes, 0) > ACCOUNT_RETENTION_PREPARATION.bytes
  )
    throw new Error('Account aging selected beyond its shared preparation allowance.');
  const bytes = selected.reduce((n, value) => n + value.bytes, 0);
  roots.push(capacity.reserveBytes(bytes * 8 + selected.length * 2048));
  const result: Array<{
    kind: Kind;
    row: Pick<RowChange, 'id' | 'parent' | 'slot' | 'position' | 'payload' | 'extra'>;
    renderedSummary: string | null;
  }> = [];
  const occupied = new Set<string>();
  for (const table of accountTables) {
    const wanted = selected.filter((value) => value.kind === kindOf(table));
    const names = Object.keys(RECORD_NODES.get(table)!.columns!);
    const pendingRows = new Map((pending.writes.get(table) ?? []).map((row) => [row.id, row]));
    const rows = new Map<string, RowChange>();
    for (const value of wanted) {
      const row = pendingRows.get(value.recordId);
      if (row) rows.set(row.id, row);
    }
    for (const batch of sqlRowBatches(
      wanted.filter((value) => !rows.has(value.recordId)).map((value) => [value.recordId]),
      [request.worldId, request.actorId],
    )) {
      signal?.throwIfAborted();
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
            ? summaryMemory(JSON.parse(row.payload) as ExperienceSummary, request.actorId).summary
            : null,
      });
    }
  }
  const ids = selected.filter((value) => value.kind !== 'memory').map((value) => value.id);
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
}

export interface NativeRestoreRetentionRequest {
  readonly binding: {
    readonly worldId: string;
    readonly generation: string;
    readonly actorId: string;
    readonly acceptedCut: number;
    readonly identityThrough: number;
    readonly candidateId: number;
    readonly candidateGeneration: number;
    readonly requestSerial: number;
  };
  readonly phase: 'metadata' | 'records' | 'membership';
  readonly data:
    | NativeAccountRetentionRequest
    | {
        readonly actorId: string;
        readonly at: number;
        readonly selected: readonly Candidate[];
      }
    | {
        readonly actorId: string;
        readonly at: number;
        readonly maxAgeSeconds: number;
        readonly frontier: ReceivedFrontier | null;
        readonly recentDirectories: readonly ReceivedChargeDirectory[];
        readonly recentBytes: number;
        readonly recentCount: number;
        readonly forgotten: readonly string[];
        readonly corrections: Readonly<Record<string, string>>;
        readonly aliases: readonly string[];
        readonly individualIds: readonly string[];
      };
  readonly maximumTransferBytes: number;
}

/** The restore driver supplies a genuine private SQL rollback view before this
 * same selector runs. The guarded reply survives its actual native answer. */
export async function readNativeRestoreRetention(
  db: SqlDatabase,
  cut: LiveReadCuts,
  request: NativeRestoreRetentionRequest,
  capacity: RetentionCapacity,
  signal?: AbortSignal,
  supportSources?: TemporalReadContext['recognitionSupportSourceIds'],
): Promise<NativeProviderAnswer> {
  if (
    !db.readAtCut ||
    !db.readTransaction ||
    !db.readMetadataBaseline ||
    cut.worldId !== request.binding.worldId ||
    cut.generation !== request.binding.generation ||
    cut.sequence !== request.binding.acceptedCut ||
    request.data.actorId !== request.binding.actorId
  )
    throw new Error('Restore account retention requires its actual private SQL cut.');
  if (request.phase === 'metadata') {
    const data = request.data as NativeAccountRetentionRequest;
    if (
      data.worldId !== request.binding.worldId ||
      data.generation !== request.binding.generation ||
      data.acceptedCut !== request.binding.acceptedCut
    )
      throw new Error('Restore account metadata differs from its bound selection.');
  }
  const pending = pendingAt(cut, request.binding.actorId),
    roots: NativeWorldConsumer[] = [];
  let answer: NativeProviderAnswer | undefined;
  try {
    // The selected row admissions cover body/metadata formatting. The reply's
    // binding and fixed envelope also exist for an empty selection, and stay
    // owned until its actual UTF-8 answer Buffer has been consumed.
    roots.push(capacity.reserveBytes(jsonByteLength(request.binding) * 6 + 16 * 64));
    const data = await db.readAtCut(cut, () =>
      db.readTransaction!(() =>
        db.readMetadataBaseline!([request.binding.actorId], async (baseline) => {
          signal?.throwIfAborted();
          if (request.phase === 'metadata')
            return accountMetadata(
              db,
              request.data as NativeAccountRetentionRequest,
              pending,
              capacity,
              roots,
              signal,
            );
          if (request.phase === 'membership') {
            if (!supportSources)
              throw new Error('Restore membership has no selected support reader.');
            const selected = request.data as Extract<
              NativeRestoreRetentionRequest['data'],
              { aliases: unknown }
            >;
            const entries = selected.recentDirectories.reduce(
              (sum, directory) => sum + directory.entries.length,
              0,
            );
            roots.push(
              capacity.reserveBytes(
                jsonByteLength(selected) * 6 +
                  entries * 1024 +
                  (selected.aliases.length + selected.individualIds.length) * 256,
              ),
            );
            const directory = buildReceivedRecentDirectory(
              selected.recentDirectories,
              selected.frontier ?? undefined,
            );
            if (
              (directory?.bytes ?? 0) !== selected.recentBytes ||
              (directory?.count ?? 0) !== selected.recentCount
            )
              throw new Error(
                'Restore membership recent directories disagree with their actual totals.',
              );
            const metadata = new RetentionMetadata();
            metadata.initializeIndexed(baseline);
            let pageRoots: NativeWorldConsumer[] | undefined;
            const [membership] = await metadata
              .view(request.binding.worldId, pending)
              .survivingMembershipBatch(
                db,
                request.binding.worldId,
                [
                  {
                    actorId: selected.actorId,
                    aliases: selected.aliases,
                    individualIds: selected.individualIds,
                    includeRecent: true,
                  },
                ],
                {
                  storage: 'indexed',
                  worldId: request.binding.worldId,
                  actorId: selected.actorId,
                  at: selected.at,
                  maxAgeSeconds: selected.maxAgeSeconds,
                  actor: {
                    recent: directory.recent,
                    ...(selected.frontier ? { frontier: selected.frontier } : {}),
                  },
                  disclosure: {
                    actorId: selected.actorId,
                    forgotten: new Set(selected.forgotten),
                    corrected: new Set(Object.keys(selected.corrections)),
                    recognitionSupportSourceIds: supportSources,
                  },
                  reserveBytes: (bytes) => {
                    (pageRoots ?? roots).push(capacity.reserveBytes(bytes));
                  },
                  reserveJson: (bytes) => {
                    (pageRoots ?? roots).push(capacity.reserveJson(bytes));
                  },
                  withPage: async (operation) => {
                    pageRoots = [];
                    try {
                      return await operation();
                    } finally {
                      // Membership adds only request-supplied alias/individual
                      // strings to the outer sets. Their counts/backing are
                      // covered by the selected-input admission above; no
                      // decoded page or shared-value body escapes this frame.
                      for (const root of pageRoots) root.release();
                      pageRoots = undefined;
                    }
                  },
                },
              );
            return {
              aliases: selected.aliases.flatMap((id, index) =>
                membership!.aliases.has(id) ? [index] : [],
              ),
              individuals: selected.individualIds.flatMap((id, index) =>
                membership!.individuals.has(id) ? [index] : [],
              ),
            };
          }
          const selected = request.data as Extract<
            NativeRestoreRetentionRequest['data'],
            { selected: unknown }
          >;
          return accountBodies(
            db,
            { worldId: request.binding.worldId, actorId: selected.actorId, at: selected.at },
            selected.selected,
            pending,
            capacity,
            roots,
            signal,
          );
        }),
      ),
    );
    signal?.throwIfAborted();
    const json = JSON.stringify({ binding: request.binding, phase: request.phase, data });
    if (
      !Number.isSafeInteger(request.maximumTransferBytes) ||
      request.maximumTransferBytes <= 0 ||
      Buffer.byteLength(json) > request.maximumTransferBytes
    )
      throw new Error('Restore account reply exceeds its actual transfer allowance.');
    answer = { json };
    // These admissions already fund SQL decoding, selected formatting and its
    // serialized reply. Move them to the result consumed by world.answer.
    while (roots.length) attachNativeConsumer(answer, roots.shift()!);
    return answer;
  } catch (error) {
    if (answer) releaseNativeProduct(answer);
    throw error;
  } finally {
    for (const root of roots) root.release();
  }
}
