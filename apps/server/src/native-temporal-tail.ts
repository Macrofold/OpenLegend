import type { NativeWorld } from '@open-legend/native-simulation';
import type { LiveReadCuts } from './live-read-overlay.js';
import { releaseNativeProduct, withNativeJsonInput } from './native-consumer.js';
import {
  captureNativeReadCut,
  nativeScopedReadCut,
  type NativeActorReadCut,
} from './native-read-cut.js';
import { ViewChangedError } from './player-view-async.js';
import type { SqlDatabase } from './store.js';

export interface NativeTemporalTailRequest {
  readonly actorId: string;
  readonly physicalLife: number;
  readonly epoch: string;
  readonly tailRevision: number;
}

/** An unclosed partial restore can lack its physical last-page witness. In the
 * caller's existing accepted turn, pin the same actor's native and pending-save
 * rows, select the indexed SQL tail and resolve it once through Rust. This
 * adopts the funded request and releases it and the read before recapture.
 * Explicit retirement and unsaved empty edits stay with the page owner. */
export async function resolveNativeReceiptTail(
  world: NativeWorld,
  db: SqlDatabase,
  actorId: string,
  acceptedCut: number,
  pending: () => LiveReadCuts,
  request: NativeTemporalTailRequest,
): Promise<void> {
  let captured: NativeActorReadCut | undefined;
  let cut: LiveReadCuts | undefined;
  const releaseRead = () => {
    const read = cut;
    cut = undefined;
    if (read) releaseNativeProduct(read);
    releaseNativeProduct(request);
  };
  try {
    captured = await captureNativeReadCut(world, actorId);
    if (captured.acceptedCut !== acceptedCut) throw new ViewChangedError();
    if (request.actorId !== captured.actorId || !db.readAtCut || !db.readTransaction)
      throw new Error('Native receipt tail requires its scoped accepted history read.');
    const { worldId, generation, identityThrough } = captured;
    cut = nativeScopedReadCut(captured, pending());
    captured = undefined;
    const row = await db.readAtCut(cut, () =>
      db.readTransaction!(() =>
        db
          .prepare(
            `SELECT last_batch_order,last_entry FROM mind_temporal_pages
           WHERE world_id=? AND actor_id=?
           ORDER BY first_batch_order DESC,first_entry DESC,first_member DESC,id DESC LIMIT 1`,
          )
          .get(worldId, request.actorId),
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
        tail.batchOrder >= identityThrough ||
        !Number.isSafeInteger(tail.entryIndex) ||
        tail.entryIndex < 0
      )
        throw new Error('Native receipt tail is outside its accepted identity cut.');
    }
    await withNativeJsonInput(
      world,
      { worldId, generation, acceptedCut, identityThrough, request, tail },
      (bytes) => {
        // The admitted bytes now own the input; no decoded cut is needed
        // during native settlement.
        releaseRead();
        return world.resolveReceiptTail(bytes);
      },
    );
  } finally {
    // The pending half can refuse before the join adopts the native capture.
    if (captured) releaseNativeProduct(captured);
    releaseRead();
  }
}
