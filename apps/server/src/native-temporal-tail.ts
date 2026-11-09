import type { LiveReadCuts } from './live-read-overlay.js';
import { retainNativeSources } from './native-consumer.js';
import { nativeScopedReadCut, type NativeActorReadCut } from './native-read-cut.js';
import type { SqlDatabase } from './store.js';

export interface NativeTemporalTailRequest {
  readonly actorId: string;
  readonly physicalLife: number;
  readonly epoch: string;
  readonly tailRevision: number;
}

/** A physical last page can remain outside both the eligible recent directory
 * and the resident byte-tail after an edit. Read its indexed coordinates from
 * the same SQL+accepted-unsaved projection that owns the context's history. */
export async function readNativeTemporalTail(
  db: SqlDatabase,
  captured: NativeActorReadCut,
  pending: LiveReadCuts,
  request: NativeTemporalTailRequest,
) {
  if (request.actorId !== captured.actorId || !db.readAtCut || !db.readTransaction)
    throw new Error('Native receipt tail requires its scoped accepted history read.');
  const cut = nativeScopedReadCut(captured, pending);
  const row = await db.readAtCut(cut, () =>
    db.readTransaction!(() =>
      db
        .prepare(
          `SELECT last_batch_order,last_entry FROM mind_temporal_pages
           WHERE world_id=? AND actor_id=?
           ORDER BY first_batch_order DESC,first_entry DESC,first_member DESC,id DESC LIMIT 1`,
        )
        .get(captured.worldId, request.actorId),
    ),
  );
  let tail: { batchOrder: number; entryIndex: number } | null = null;
  if (row) {
    const batchOrder = row['last_batch_order'],
      entryIndex = row['last_entry'];
    if (
      batchOrder === null ||
      batchOrder === undefined ||
      entryIndex === null ||
      entryIndex === undefined
    )
      throw new Error('Native receipt tail has no actual final receipt coordinates.');
    tail = { batchOrder: Number(batchOrder), entryIndex: Number(entryIndex) };
    if (
      !Number.isSafeInteger(tail.batchOrder) ||
      tail.batchOrder < 0 ||
      tail.batchOrder >= captured.identityThrough ||
      !Number.isSafeInteger(tail.entryIndex) ||
      tail.entryIndex < 0
    )
      throw new Error('Native receipt tail is outside its accepted identity cut.');
  }
  return retainNativeSources(
    {
      worldId: captured.worldId,
      generation: captured.generation,
      acceptedCut: captured.acceptedCut,
      identityThrough: captured.identityThrough,
      request,
      tail,
    },
    captured,
    pending,
    request,
  );
}
