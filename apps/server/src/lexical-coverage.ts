import type { SqlDatabase } from './store.js';

/** A deliberately omitted optional artifact is different from a drained queue.
 * Keep one conservative coverage marker per actor, never a lifetime list of keys.
 * Only an actual complete rebuild may clear it; ordinary draining cannot. */
export async function markLexicalIncomplete(
  db: SqlDatabase,
  worldId: string,
  actors: readonly string[],
): Promise<void> {
  if (!actors.length) return;
  await db
    .prepare(
      `INSERT INTO memory_lexical_progress
    SELECT world_id,generation,0,0,0,?::text[] FROM world_head WHERE world_id=?
    ON CONFLICT(world_id) DO UPDATE SET incomplete_actors=ARRAY(
      SELECT DISTINCT unnest(memory_lexical_progress.incomplete_actors||excluded.incomplete_actors))`,
    )
    .run(actors, worldId);
}
