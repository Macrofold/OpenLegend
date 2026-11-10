import type { NativeGeometryQueries } from '@open-legend/native-simulation';
import type { LiveReadCuts } from './live-read-overlay.js';
import type { SqlDatabase } from './store.js';
import { mergeRecordChanges, type RecordChanges } from './world-records.js';
import { selectActorRecordChanges } from './actor-record-selection.js';
import { RetentionMetadata, accountTables } from './retention-metadata.js';
import { SUPPORT_MEMBERSHIP_PREPARATION } from './retention-cleanup.js';

export interface NativeSupportMembershipRequest {
  readonly binding: NativeGeometryQueries['binding'];
  readonly worldId: string;
  readonly generation: string;
  readonly acceptedCut: number;
  readonly actorId: string;
  readonly aliases: readonly string[];
}

/** The ordinary Source membership owner combines exact pending account metadata
 * with its cold remainder. Recent pages and opaque account bodies are never
 * hydrated to prove an aliases-only sparse-support dependency. */
export async function readNativeSupportMembership(
  db: SqlDatabase,
  cut: LiveReadCuts,
  request: NativeSupportMembershipRequest,
) {
  if (
    !db.readAtCut ||
    !db.readTransaction ||
    !db.readMetadataBaseline ||
    cut.worldId !== request.worldId ||
    cut.generation !== request.generation ||
    cut.sequence !== request.acceptedCut ||
    request.binding.baseCut !== request.acceptedCut
  )
    throw new Error('Native support membership has no matching accepted SQL cut.');
  if (
    request.aliases.length > SUPPORT_MEMBERSHIP_PREPARATION.rows ||
    Buffer.byteLength(JSON.stringify(request.aliases)) > SUPPORT_MEMBERSHIP_PREPARATION.bytes
  )
    throw new Error('Native support membership exceeds its bounded preparation.');
  let pending: RecordChanges = { writes: new Map(), deletes: new Map(), rows: 0 };
  for (const part of cut.cuts) {
    const selected = selectActorRecordChanges(part.changes, [request.actorId]);
    const writes = new Map(
      [...selected.writes].filter(([table]) =>
        accountTables.includes(table as (typeof accountTables)[number]),
      ),
    );
    pending = mergeRecordChanges(pending, {
      writes,
      deletes: selected.deletes,
      rows: [...writes.values()].reduce((n, rows) => n + rows.length, 0),
    });
  }
  const membership = await db.readAtCut(cut, () =>
    db.readTransaction!(() =>
      db.readMetadataBaseline!([request.actorId], (baseline) => {
        // readAtCut already verifies the actual captured prefix. Its in-flight
        // save may now be durable; that permitted SQL head is not a source edit.
        if (baseline.worldId !== request.worldId)
          throw new Error('Native support membership no longer matches its SQL baseline.');
        const metadata = new RetentionMetadata();
        metadata.initializeIndexed(baseline);
        return metadata
          .view(request.worldId, pending)
          .survivingMembershipBatch(db, request.worldId, [
            {
              actorId: request.actorId,
              aliases: request.aliases,
              individualIds: [],
              includeRecent: false,
            },
          ]);
      }),
    ),
  );
  const aliases = membership[0]!.aliases;
  return {
    binding: request.binding,
    retained: request.aliases.flatMap((id, index) => (aliases.has(id) ? [index] : [])),
  };
}
