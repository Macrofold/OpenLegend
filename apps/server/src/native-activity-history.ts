import { ACTIVITY_LEARNING_PREPARATION } from '@open-legend/domain';
import type { NativeGeometryQueries } from '@open-legend/native-simulation';
import type { SqlDatabase } from './store.js';
import type { LiveReadCuts } from './live-read-overlay.js';
import { WorldRecords } from './world-records.js';
import { nativeCurrentRow } from './native-current-sources.js';

export interface NativeActivityHistoryRequest {
  readonly binding: NativeGeometryQueries['binding'];
  readonly worldId: string;
  readonly generation: string;
  readonly acceptedCut: number;
  readonly actorId: string;
  readonly after: number;
  readonly ids?: readonly string[];
  readonly maximumRows: number;
  readonly maximumBytes: number;
}
/** The original canonical rows come from the same indexed page query as Source,
 * under the actual accepted SQL/pending cut. No decoded occurrence is relabelled
 * with an invented slot, position, or source column. */
export async function readNativeActivityHistory(
  db: SqlDatabase,
  request: NativeActivityHistoryRequest,
  cut: LiveReadCuts,
) {
  if (
    !db.readAtCut ||
    !db.readTransaction ||
    request.worldId !== cut.worldId ||
    request.generation !== cut.generation ||
    request.acceptedCut !== cut.sequence ||
    request.binding.baseCut !== cut.sequence
  )
    throw new Error('Native activity history has no matching accepted SQL cut.');
  return db.readAtCut(cut, () =>
    db.readTransaction!(async () => {
      const head = await db.prepare('SELECT world_id,generation FROM world_head WHERE id=1').get();
      if (head?.['world_id'] !== cut.worldId || head['generation'] !== cut.storageGeneration)
        throw new Error('Native activity history lost its durable world witness.');
      const rows = await new WorldRecords(db).activityRows(
        request.worldId,
        request.actorId,
        request.after,
        request.ids,
        request.ids ? ACTIVITY_LEARNING_PREPARATION.page : request.maximumRows,
        request.maximumBytes,
      );
      return {
        binding: request.binding,
        rows: rows.map((row) => nativeCurrentRow('activity_occurrences', row)),
      };
    }),
  );
}
