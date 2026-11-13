import type { NativeGeometryQueries } from '@open-legend/native-simulation';
import type { LiveReadCuts } from './live-read-overlay.js';
import type { MemoryRepository } from './memory-repository.js';
import type { SqlDatabase } from './store.js';

export interface NativeKnownPlaceEvidenceRequest {
  readonly binding: NativeGeometryQueries['binding'];
  readonly worldId: string;
  readonly generation: string;
  readonly actorId: string;
  readonly physicalLife: number;
  readonly privacyRevision: number;
  readonly expectedRevision: number;
  readonly maximumRows: number;
  readonly maximumBytes: number;
}

/** Hearing consumes a complete private index. Select its canonical capsules
 * through the existing repository at the operation's original accepted cut;
 * live place bodies and a later SQL prefix cannot fill missing history. */
export async function readNativeKnownPlaceEvidence(
  db: SqlDatabase,
  memories: Pick<MemoryRepository, 'readNativeKnownPlaceCapsules'>,
  request: NativeKnownPlaceEvidenceRequest,
  cut: LiveReadCuts,
) {
  if (
    !db.readAtCut ||
    !db.readTransaction ||
    request.worldId !== cut.worldId ||
    request.generation !== cut.generation ||
    request.binding.baseCut !== cut.sequence
  )
    throw new Error('Remembered-place preparation has no matching accepted SQL cut.');
  return db.readAtCut(cut, () =>
    db.readTransaction!(async () => {
      const capsules = await memories.readNativeKnownPlaceCapsules({
        worldId: cut.worldId,
        actorId: request.actorId,
        generation: cut.storageGeneration,
      });
      if (capsules.length > request.maximumRows)
        throw new Error('Remembered-place preparation exceeds its admitted capacity.');
      // The native index owner validates capsule format and its exact encoded
      // byte allowance; Node retains the query's transfer/parse admission here.
      return { binding: request.binding, capsules };
    }),
  );
}
