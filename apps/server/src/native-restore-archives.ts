import type { PersonalSourceRef } from '@open-legend/domain';
import type { SqlDatabase } from './store.js';
import type { LiveReadCuts } from './live-read-overlay.js';
import type { NativeHistoryEditReadRequest } from './native-temporal-pages.js';
import type { NativeRestoreArchive } from './native-restore.js';
import { RestoredSourceVersionSelection } from './source-version-retention.js';

export interface NativeRestoreArchivesRequest {
  readonly binding: NativeHistoryEditReadRequest['binding'];
  readonly offset: number;
  readonly archives: readonly NativeRestoreArchive[];
  readonly maximumTransferBytes: number;
}

/** Only exact reverse-index matches reach the canonical reference metadata.
 * Learning-only edges cannot retain an archive, and opaque account prose is
 * never decoded. The shared Source selector owns strongest-class selection. */
export async function selectNativeRestoreArchives(
  db: SqlDatabase,
  worldId: string,
  archives: readonly NativeRestoreArchive[],
) {
  if (archives.length > 256) throw new Error('Restore archive query exceeded its bounded batch.');
  const wanted = archives.flatMap((row, index) =>
    row.kind === 'perspective'
      ? []
      : [
          {
            ordinal: index,
            actor_id: row.actorId,
            kind: row.kind,
            id: row.id,
            revision: row.revision,
          },
        ],
  );
  const selection = new RestoredSourceVersionSelection(() => false);
  if (wanted.length) {
    const derived = (table: string, kind: string) => `
      SELECT w.ordinal AS archive_index,r.retention_class FROM wanted w
      JOIN mind_source_dependencies d ON d.world_id=? AND d.actor_id=w.actor_id
        AND d.source_kind=w.kind AND d.source_id=w.id AND d.source_revision=w.revision
      JOIN ${table} r ON r.world_id=d.world_id AND r.actor_id=d.actor_id
        AND r.source_id=d.derived_id AND d.derived_kind='${kind}'
      WHERE ${kind === 'memory' ? "r.kind<>'impression' AND" : ''}
        r.retention_metadata->'versions' @> jsonb_build_array(jsonb_build_object(
          'kind',w.kind,'id',w.id,'revision',w.revision))
        AND NOT EXISTS (SELECT 1 FROM mind_forgotten f WHERE f.world_id=r.world_id
          AND f.actor_id=w.actor_id AND f.source_id=w.id)`;
    const rows = await db
      .prepare(
        `
      WITH wanted AS (SELECT * FROM jsonb_to_recordset(?::jsonb)
        w(ordinal integer,actor_id text,kind text,id text,revision text))
      SELECT DISTINCT archive_index,retention_class FROM (
        ${derived('mind_memories', 'memory')} UNION ALL
        ${derived('mind_summaries', 'summary')}
      ) retained ORDER BY archive_index,retention_class`,
      )
      .all(JSON.stringify(wanted), worldId, worldId);
    for (const row of rows) {
      const index = Number(row['archive_index']),
        archive = archives[index],
        category = row['retention_class'];
      if (
        row['archive_index'] === null ||
        !Number.isSafeInteger(index) ||
        !archive ||
        (category !== 'optional' && category !== 'required' && category !== 'speech')
      )
        throw new Error('Restore archive index returned invalid canonical metadata.');
      selection.includeReferences(archive.actorId, category, [
        {
          kind: archive.kind as PersonalSourceRef['kind'],
          id: archive.id,
          revision: archive.revision,
        },
      ]);
    }
  }
  return archives.flatMap((row, index) => {
    if (row.kind === 'perspective') return [];
    const category = selection.retainedClass(row.actorId, {
      kind: row.kind as PersonalSourceRef['kind'],
      id: row.id,
      revision: row.revision,
    });
    return category ? [{ index, category }] : [];
  });
}

export async function readNativeRestoreArchives(
  db: SqlDatabase,
  request: NativeRestoreArchivesRequest,
  cut: LiveReadCuts,
) {
  const { binding } = request;
  if (
    !db.transactionActive ||
    binding.worldId !== cut.worldId ||
    binding.generation !== cut.generation ||
    binding.acceptedCut !== cut.sequence ||
    !Number.isSafeInteger(request.offset) ||
    request.offset < 0 ||
    request.archives.length > 256 ||
    !Number.isSafeInteger(request.offset + request.archives.length) ||
    !Number.isSafeInteger(request.maximumTransferBytes) ||
    request.maximumTransferBytes <= 0
  )
    throw new Error('Restore archive selection requires its actual private SQL view.');
  const head = await db.prepare('SELECT world_id,generation FROM world_head WHERE id=1').get();
  const header = await db
    .prepare('SELECT payload FROM world_settings WHERE world_id=? AND id=?')
    .get(binding.worldId, '["world"]');
  if (
    !head ||
    head['world_id'] !== cut.worldId ||
    head['generation'] !== cut.storageGeneration ||
    !header ||
    (JSON.parse(String(header['payload'])) as { nextId: number }).nextId !== binding.identityThrough
  )
    throw new Error('Restore archive selection lost its bound canonical view.');
  const selected = (await selectNativeRestoreArchives(db, binding.worldId, request.archives)).map(
    (row) => ({ ...row, index: row.index + request.offset }),
  );
  const fixed = Buffer.byteLength(JSON.stringify({ binding, selected: [] }));
  const bytes =
    fixed +
    selected.reduce((n, row) => n + Buffer.byteLength(JSON.stringify(row)), 0) +
    Math.max(0, selected.length - 1);
  if (bytes > request.maximumTransferBytes)
    throw new Error('Restore archive reply exceeds its admitted transfer allowance.');
  return { binding, selected };
}
