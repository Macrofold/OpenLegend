import { parseSourceJson } from './native-source-preparation.js';
import type { PersonalSourceRef } from '@open-legend/domain';
import type { SqlDatabase } from './sql-database.js';
import type { LiveReadCuts } from './live-read-overlay.js';
import type { NativeHistoryEditReadRequest } from './native-temporal-pages.js';
import type { NativeRestoreArchive } from './native-restore.js';
import { RestoredSourceVersionSelection } from './source-version-retention.js';
import {
  restoreArchiveSelectionRows,
  restoreArchiveSelectionSql,
} from './restore-archive-selection.js';

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
  if (archives.length > restoreArchiveSelectionRows)
    throw new Error('Restore archive query exceeded its bounded batch.');
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
    const rows = await db
      .prepare(restoreArchiveSelectionSql('?', '?'))
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
    request.archives.length > restoreArchiveSelectionRows ||
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
    (parseSourceJson(String(header['payload'])) as { nextId: number }).nextId !==
      binding.identityThrough
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
