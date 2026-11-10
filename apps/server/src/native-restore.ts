import type { ExperiencePrivacy } from '@open-legend/domain';
import type { NativeChangedRows } from '@open-legend/native-simulation';
import type { CanonicalCheckpoint } from './checkpoint.js';
import type { CommitInputs } from './commit-inputs.js';
import type { GameSaves, RestoreSave } from './game-saves.js';
import type { AuthorityFence } from './authority.js';
import { MEMORY_SOURCE_TABLES } from './memory-repository.js';
import { nativeCurrentRow } from './native-current-sources.js';
import { tableRows } from './record-pages.js';
import { applySourceVersions, type SourceVersionPlan } from './source-version-retention.js';
import { selectNativeRestoreArchives } from './native-restore-archives.js';
import { sqlRowBatches } from './sql-rows.js';
import type {
  NativeCurrentWorldInstallation,
  NativeWorldAdoption,
  NativeWorldProviders,
  SqlDatabase,
} from './store.js';
import type { RecordChanges, RowChange } from './world-records.js';
import type { NativePublication } from './native-operation.js';

export interface NativeRestoreArchive {
  readonly actorId: string;
  readonly kind: string;
  readonly id: string;
  readonly revision: string;
  readonly bytes: number;
  readonly category: 'optional' | 'required' | 'speech';
}
export interface NativeRestoreMetadata {
  readonly identityFloor: number;
  readonly actorOwners: readonly { readonly actorId: string; readonly accountId: string }[];
  readonly worldGrants: readonly { readonly actorId: string | null; readonly accountId: string }[];
  readonly privacyRevisions: Readonly<Record<string, number>>;
  readonly namespace: string;
  readonly archives: readonly NativeRestoreArchive[];
}
export interface NativeRestorePublication
  extends Omit<NativePublication, 'records' | 'protectedSave' | 'privacyChange'> {
  readonly restore: {
    readonly worldId: string;
    readonly generation: string;
    readonly revision: number;
    readonly acceptedCut: number;
    readonly identityThrough: number;
    readonly installation: NativeCurrentWorldInstallation;
    readonly changes: NativeChangedRows;
    readonly retainedValues: Readonly<Record<string, true>>;
  };
  readonly restoreMetadata: {
    readonly keptArchives: readonly NativeRestoreArchive[];
    readonly privacy: ExperiencePrivacy;
  };
}

export interface NativeRestoreRequest {
  readonly generation: string;
  readonly authority: AuthorityFence;
  readonly checkpoint: CanonicalCheckpoint;
  readonly restore: Omit<RestoreSave, 'payload'>;
}
export interface NativeRestoreStage {
  readonly source: Awaited<ReturnType<GameSaves['stageCanonical']>>['source'];
  readonly changes: RecordChanges;
  readonly revision: number;
  readonly generation: string;
  readonly metadata: NativeRestoreMetadata;
  prepareReads(installation: NativeCurrentWorldInstallation): Promise<NativeRestoreReadView>;
}
export interface NativeRestoreReadView {
  withPrivateView<T>(projection: NativeChangedRows, read: () => Promise<T>): Promise<T>;
}
/** The application retains the actual sealed native preparation while this
 * finite projection is applied. These rows are prospective and undisclosed
 * until the SQL result permits activation of that same prepared native owner. */
export interface NativeRestoreProjection {
  readonly installation: NativeCurrentWorldInstallation;
  readonly inputs: CommitInputs;
  readonly providers: NativeWorldProviders;
  readonly archives: readonly NativeRestoreArchive[];
  retainReceipt(receipt: NativeWorldAdoption): void;
}

/** Checkpoint coverage is complete; these are its actual canonical privacy
 * scalar rows, before current operational constraints are reapplied natively. */
export function checkpointPrivacy(captured: CanonicalCheckpoint): ExperiencePrivacy {
  const privacy: ExperiencePrivacy = { forgotten: {}, corrections: {} };
  for (const table of ['mind_forgotten', 'mind_corrections'] as const)
    for (const siblings of captured.groups.get(table)?.values() ?? [])
      for (const row of siblings) {
        const actor = (JSON.parse(String(row['parent_id'])) as string[]).at(-1)!;
        const value = JSON.parse(String(row['payload'])) as string;
        if (table === 'mind_forgotten') (privacy.forgotten[actor] ??= []).push(value);
        else {
          const source = (JSON.parse(String(row['id'])) as string[]).at(-1)!;
          (privacy.corrections[actor] ??= {})[source] = value;
        }
      }
  return privacy;
}

export function nativeRestoreArchiveMetadata(rows: readonly Record<string, unknown>[]) {
  return rows.map(
    (row): NativeRestoreArchive => ({
      actorId: String(row['actor_id']),
      kind: String(row['source_kind']),
      id: String(row['source_id']),
      revision: String(row['revision']),
      bytes: Buffer.byteLength(String(row['payload'])),
      category: row['retention_class'] as NativeRestoreArchive['category'],
    }),
  );
}

export function assertNativeRestoredArchives(
  native: readonly NativeRestoreArchive[],
  selected: readonly NativeRestoreArchive[],
): void {
  const key = (row: NativeRestoreArchive) =>
    JSON.stringify([row.actorId, row.kind, row.id, row.revision]);
  const expected = new Map(selected.map((row) => [key(row), row]));
  if (
    native.length !== expected.size ||
    native.some((row) => {
      const source = expected.get(key(row));
      return !source || source.bytes !== row.bytes || source.category !== row.category;
    }) ||
    new Set(native.map(key)).size !== expected.size
  )
    throw new Error('Native restore archive selection differs from its final canonical sources.');
}

/** Full reconstruction is specific to checkpoint installation. Read one
 * canonical source page at a time and retain only the rows needed by the
 * existing source writer; no entity or TypeScript world is assembled. */
export async function* nativeRestoredSourceBatches(
  db: SqlDatabase,
  worldId: string,
): AsyncGenerator<RecordChanges> {
  for (const table of Object.values(MEMORY_SOURCE_TABLES)) {
    let values: RowChange[] = [];
    for await (const row of tableRows(db, table, worldId)) {
      values.push({ ...nativeCurrentRow(table, row), create: true });
      if (values.length === 256) {
        yield { writes: new Map([[table, values]]), deletes: new Map(), rows: values.length };
        values = [];
      }
    }
    if (values.length)
      yield { writes: new Map([[table, values]]), deletes: new Map(), rows: values.length };
  }
}

/** Source restore selects archives from the final surviving derivations, after
 * today's privacy rules have been reapplied. The shared selector keeps the
 * same strongest category and exact encoded-byte charge. */
export async function nativeRestoredArchives(
  db: SqlDatabase,
  worldId: string,
  privacy: ExperiencePrivacy,
) {
  const forgotten = new Map(
    Object.entries(privacy.forgotten).map(([actor, ids]) => [actor, new Set(ids)]),
  );
  const rows = await db
    .prepare(
      `SELECT actor_id,source_kind,source_id,revision,
    retention_class,logical_bytes,octet_length(payload) AS payload_bytes
    FROM mind_source_versions WHERE world_id=? ORDER BY actor_id,source_kind,source_id,revision`,
    )
    .all(worldId);
  const archives = rows.map(
    (row): NativeRestoreArchive => ({
      actorId: String(row['actor_id']),
      kind: String(row['source_kind']),
      id: String(row['source_id']),
      revision: String(row['revision']),
      bytes: Number(row['payload_bytes']),
      category: row['retention_class'] as NativeRestoreArchive['category'],
    }),
  );
  const selected: NativeRestoreArchive[] = [];
  const plan: SourceVersionPlan = { changes: [] };
  const totals = new Map<
    string,
    Record<'optional' | 'required' | 'speech', { bytes: number; count: number }>
  >();
  for (let offset = 0; offset < archives.length; offset += 256) {
    const batch = archives.slice(offset, offset + 256);
    const referenced = new Map(
      (await selectNativeRestoreArchives(db, worldId, batch)).map((row) => [
        row.index,
        row.category,
      ]),
    );
    for (let index = 0; index < batch.length; index++) {
      const row = batch[index]!,
        before = rows[offset + index]!;
      const category =
        row.kind === 'perspective'
          ? forgotten.get(row.actorId)?.has(row.id)
            ? undefined
            : row.category
          : referenced.get(index);
      if (category) {
        selected.push({ ...row, category });
        if (row.kind !== 'perspective') {
          const actor = totals.get(row.actorId) ?? {
            optional: { bytes: 0, count: 0 },
            required: { bytes: 0, count: 0 },
            speech: { bytes: 0, count: 0 },
          };
          actor[category].bytes += row.bytes;
          actor[category].count++;
          totals.set(row.actorId, actor);
        }
      }
      if (
        !category ||
        (row.kind !== 'perspective' &&
          (category !== row.category || Number(before['logical_bytes']) !== row.bytes))
      )
        plan.changes.push({
          actorId: row.actorId,
          kind: row.kind,
          id: row.id,
          revision: row.revision,
          expectedPrior: { category: row.category, bytes: Number(before['logical_bytes']) },
          desired: category ? { category, bytes: row.bytes } : null,
        });
    }
  }
  const annotations: Record<string, unknown>[] = [];
  for (const row of await db
    .prepare(
      `SELECT actor_id,source_kind,source_id,source_revision,namespace
    FROM mind_source_annotations WHERE world_id=?`,
    )
    .all(worldId))
    if (forgotten.get(String(row['actor_id']))?.has(String(row['source_id'])))
      annotations.push(row);

  // The native restore owner changes these counters before sealing. Never
  // repair native authority by editing canonical headers from this SQL host.
  for await (const row of tableRows(db, 'mind_temporal_actors', worldId)) {
    const body = JSON.parse(String(row['payload'])) as {
      accounts?: {
        archives?: Record<'optional' | 'required' | 'speech', { bytes: number; count: number }>;
      };
    };
    const expected = totals.get(String(row['slot']));
    for (const category of ['optional', 'required', 'speech'] as const) {
      const stored = body.accounts?.archives?.[category];
      if (
        (stored?.bytes ?? 0) !== (expected?.[category].bytes ?? 0) ||
        (stored?.count ?? 0) !== (expected?.[category].count ?? 0)
      )
        throw new Error('Native restore archive accounting differs from its surviving sources.');
    }
  }
  return { worldId, selected, totals, plan, annotations };
}

export async function applyNativeRestoredArchives(
  db: SqlDatabase,
  revision: number,
  selection: Awaited<ReturnType<typeof nativeRestoredArchives>>,
): Promise<void> {
  await applySourceVersions(db, selection.worldId, revision, selection.plan);
  for (const batch of sqlRowBatches(selection.annotations.map((row) => [row])))
    await db
      .prepare(
        `DELETE FROM mind_source_annotations a USING jsonb_to_recordset(?::jsonb)
      q(actor_id text,source_kind text,source_id text,source_revision text,namespace text)
      WHERE a.world_id=? AND a.actor_id=q.actor_id AND a.source_kind=q.source_kind
        AND a.source_id=q.source_id AND a.source_revision=q.source_revision AND a.namespace=q.namespace`,
      )
      .run(JSON.stringify(batch.map(([row]) => row)), selection.worldId);
}
