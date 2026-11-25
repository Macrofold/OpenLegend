import assert from 'node:assert/strict';
import type { PostgresDatabase } from '../../apps/server/src/postgres.js';
import type { WorldPoint } from '@open-legend/spatial';

interface SavedActor {
  position: WorldPoint;
  placementRevision: number;
  behavior?: string;
}

export interface SavedCut {
  at: number;
  revision: number;
  gameSeconds: number;
}

export function positionChanged(before: WorldPoint, after: WorldPoint) {
  return Math.hypot(before.x - after.x, before.y - after.y, before.z - after.z) > 0.001;
}

export function actorActivity(
  ids: readonly string[],
  before: ReadonlyMap<string, SavedActor>,
  after: ReadonlyMap<string, SavedActor>,
) {
  const moved: string[] = [];
  const placementAdvanced: string[] = [];
  const behaviorChanged: string[] = [];
  let presentAtBothCuts = 0;
  for (const id of ids) {
    const earlier = before.get(id);
    const later = after.get(id);
    if (!earlier || !later) continue;
    presentAtBothCuts++;
    if (positionChanged(earlier.position, later.position)) moved.push(id);
    if (earlier.placementRevision < later.placementRevision) placementAdvanced.push(id);
    if (earlier.behavior !== later.behavior) behaviorChanged.push(id);
  }
  return { expected: ids.length, presentAtBothCuts, moved, placementAdvanced, behaviorChanged };
}

/** Read only the disposable world's declared roster. Label each set of
 * positions and receipts with the exact committed revision that owns them. */
export function observeSaves(db: PostgresDatabase, worldId: string, now: () => number) {
  const save = db.prepare(
    `SELECT h.revision, (s.payload::jsonb->>'simTime')::double precision AS game_seconds
       FROM world_head h JOIN world_settings s USING (world_id)
       WHERE h.id=1 AND h.world_id=?`,
  );
  const actors = db.prepare(
    `SELECT p.entity_id AS id, p.x, p.y, p.z,
       (p.payload::jsonb->>'revision')::bigint AS placement_revision, md5(b.payload) AS behavior
       FROM sim_placements p
       JOIN sim_entities e ON e.world_id=p.world_id AND e.entity_id=p.entity_id
       LEFT JOIN sim_animal_behavior b ON b.world_id=e.world_id AND b.parent_id=e.id
       WHERE p.world_id=? AND p.entity_id=ANY(?::text[]) AND p.placement_mode='world'`,
  );
  const placements = db.prepare(
    `SELECT entity_id AS id, (payload::jsonb->>'revision')::bigint AS placement_revision
       FROM sim_placements
       WHERE world_id=? AND entity_id=ANY(?::text[]) AND placement_mode='world'`,
  );
  const receipts = db.prepare(
    `SELECT id, payload::jsonb #> '{result,ok}' AS ok
       FROM gameplay_receipts WHERE world_id=? AND id=ANY(?::text[])`,
  );
  const jobs = db.prepare(
    "SELECT payload::jsonb->>'status' AS status, count(*)::int AS count FROM jobs GROUP BY 1",
  );

  async function readSave(): Promise<SavedCut> {
    const row = await save.get(worldId);
    assert(row, 'The ordinary save did not expose a world clock.');
    return {
      at: now(),
      revision: Number(row['revision']),
      gameSeconds: Number(row['game_seconds']),
    };
  }

  return {
    motion(ids: readonly string[]) {
      return db.readTransaction(async () => {
        const save = await readSave();
        const rows = await placements.all(worldId, ids);
        return {
          save,
          placementRevisions: Object.fromEntries(
            rows.map((row) => [String(row['id']), Number(row['placement_revision'])]),
          ),
        };
      });
    },
    activity(ids: readonly string[], evidence?: { receiptKeys: string[]; modelJobs: boolean }) {
      return db.readTransaction(async () => {
        const save = await readSave();
        const rows = await actors.all(worldId, ids);
        const roster = new Map<string, SavedActor>(
          rows.map((row) => [
            String(row['id']),
            {
              position: { x: Number(row['x']), y: Number(row['y']), z: Number(row['z']) },
              placementRevision: Number(row['placement_revision']),
              behavior: typeof row['behavior'] === 'string' ? row['behavior'] : undefined,
            },
          ]),
        );
        const savedReceipts = evidence?.receiptKeys.length
          ? (await receipts.all(worldId, evidence.receiptKeys)).map((row) => {
              const id = String(row['id']);
              const ok = row['ok'];
              assert(
                typeof ok === 'boolean',
                `Saved command receipt ${id} needs a boolean result.`,
              );
              return { id, ok };
            })
          : [];
        // The fixture owns the entire single-world database. Only speech cases
        // can schedule model jobs, and this census happens after the timed window.
        const backgroundJobs = evidence?.modelJobs ? await jobs.all() : undefined;
        return { save, roster, savedReceipts, backgroundJobs };
      });
    },
  };
}
