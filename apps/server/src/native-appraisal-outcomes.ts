import type { NativeGeometryQueries } from '@open-legend/native-simulation';
import type { LiveReadCuts } from './live-read-overlay.js';
import type { SqlDatabase } from './store.js';
import { nativeCurrentRow } from './native-current-sources.js';

export interface NativeAppraisalOutcomesRequest {
  readonly binding: NativeGeometryQueries['binding'];
  readonly worldId: string;
  readonly generation: string;
  readonly actorId: string;
  readonly ids: readonly string[];
  readonly maximumTransferBytes: number;
}

/** Resolve only the create identities computed by the native appraisal owner.
 * An empty result certifies absence at this actual SQL/pending overlay, without
 * turning an active-only installed appraisal tail into complete history. */
export async function readNativeAppraisalOutcomes(
  db: SqlDatabase,
  request: NativeAppraisalOutcomesRequest,
  cut: LiveReadCuts,
) {
  if (
    !db.readAtCut ||
    !db.readTransaction ||
    request.worldId !== cut.worldId ||
    request.generation !== cut.generation ||
    request.binding.baseCut !== cut.sequence
  )
    throw new Error('Native appraisal preparation has no matching accepted SQL overlay.');
  return db.readAtCut(cut, () =>
    db.readTransaction!(async () => {
      const head = await db.prepare('SELECT world_id,generation FROM world_head WHERE id=1').get();
      if (head?.['world_id'] !== cut.worldId || head['generation'] !== cut.storageGeneration)
        throw new Error('Native appraisal preparation lost its durable world witness.');
      const parent = JSON.stringify(['world', 'appraisals', request.actorId]);
      const ids = request.ids.map((id) =>
        JSON.stringify(['world', 'appraisals', request.actorId, id]),
      );
      const sql =
        'SELECT * FROM mind_appraisals WHERE world_id=? AND parent_id=? AND id=ANY(?::text[])';
      const parameters = [cut.worldId, parent, ids];
      const size = await db
        .prepare(`SELECT COALESCE(sum(octet_length(row_to_json(t)::text)),0) AS bytes FROM (${sql}) t`)
        .get(...parameters);
      const bytes = Number(size?.['bytes']);
      if (!Number.isSafeInteger(bytes) || bytes < 0 || bytes * 6 + 1024 > request.maximumTransferBytes)
        throw new Error('Native appraisal witnesses exceed their admitted transfer allowance.');
      const rows = (await db.prepare(sql + ' ORDER BY position,id').all(...parameters)).map((row) =>
        nativeCurrentRow('mind_appraisals', row),
      );
      const answer = { binding: request.binding, rows };
      if (Buffer.byteLength(JSON.stringify(answer)) > request.maximumTransferBytes)
        throw new Error('Native appraisal witnesses exceed their admitted transfer allowance.');
      return answer;
    }),
  );
}
