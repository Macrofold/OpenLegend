import type { WorldEvent, Appraisal } from '@open-legend/domain';
import type { SavedWorld, SqlDatabase } from './store.js';
import { historyKey, historyPositions, historyMapPositions } from './history-residency.js';
import { MEMORY_SOURCE_TABLES } from './memory-repository.js';

export interface HistoryEditSelection {
  eventIds?: string[];
  sources?: { actorId: string; sourceId: string }[];
}
export interface PreparedHistoryEdit {
  state: SavedWorld;
  events: WorldEvent[];
  referencedEventIds: Set<string>;
}

/** Complete dependency closure for an explicit creator edit, never a recall candidate limit.
 * Reads stay in one snapshot outside mutation ownership. The service must reject a changed
 * world before adopting this residency-only preparation. Unselected SQL rows remain intact.
 * docs/projects/history-storage-efficiency.md
 */
export async function prepareHistoryEdit(
  db: SqlDatabase,
  state: SavedWorld,
  selection: HistoryEditSelection,
): Promise<PreparedHistoryEdit> {
  const snapshot = db.readTransaction?.bind(db) ?? db.transaction.bind(db);
  return snapshot(async () => {
    const worldId = state.world.id;
    const eventIds = [...new Set(selection.eventIds ?? [])];
    const roots = (selection.sources ?? []).map(({ actorId, sourceId }) => ({
      actor_id: actorId,
      source_id: sourceId,
    }));
    const events: WorldEvent[] = [];
    const referencedEventIds = new Set<string>();
    if (eventIds.length) {
      for (const row of await db
        .prepare('SELECT payload FROM history_events WHERE world_id=? AND id=ANY(?::text[])')
        .all(worldId, eventIds))
        events.push(JSON.parse(String(row['payload'])) as WorldEvent);
      for (const row of await db
        .prepare(
          `SELECT requested.id FROM unnest(?::text[]) requested(id)
          WHERE EXISTS (SELECT 1 FROM history_events e WHERE e.world_id=? AND e.data_references @> ARRAY[requested.id])`,
        )
        .all(eventIds, worldId))
        referencedEventIds.add(String(row['id']));
      const rows = await db
        .prepare(
          `
        SELECT actor_id,event_id AS source_id FROM history_perspectives WHERE world_id=? AND event_id=ANY(?::text[])
        UNION SELECT actor_id,event_id FROM recall_sources WHERE world_id=? AND event_id=ANY(?::text[])
        UNION SELECT actor_id,source_id FROM mind_summary_sources WHERE world_id=? AND source_id=ANY(?::text[])
        UNION SELECT actor_id,source_id FROM mind_corrections WHERE world_id=? AND source_id=ANY(?::text[])
        UNION SELECT actor_id,correction_id FROM mind_corrections WHERE world_id=? AND correction_id=ANY(?::text[])
      `,
        )
        .all(
          worldId,
          eventIds,
          worldId,
          eventIds,
          worldId,
          eventIds,
          worldId,
          eventIds,
          worldId,
          eventIds,
        );
      roots.push(
        ...rows.map((r) => ({
          actor_id: String(r['actor_id']),
          source_id: String(r['source_id']),
        })),
      );
    }
    if (!roots.length) return { state, events, referencedEventIds };
    // UNION (not UNION ALL) terminates source/alias cycles. Traverse canonical links,
    // including ineligible retained sources, rather than only currently recallable rows.
    const affected = await db
      .prepare(
        `WITH RECURSIVE affected(actor_id,source_id) AS (
      SELECT actor_id,source_id FROM jsonb_to_recordset(?::jsonb) AS roots(actor_id text,source_id text)
      UNION
      SELECT a.actor_id,d.id FROM affected a CROSS JOIN LATERAL (
        SELECT id FROM recall_sources WHERE world_id=? AND actor_id=a.actor_id AND event_id=a.source_id
        UNION SELECT event_id FROM recall_sources WHERE world_id=? AND actor_id=a.actor_id AND id=a.source_id AND source_kind='memory' AND event_id IS NOT NULL
        UNION SELECT summary_id FROM mind_summary_sources WHERE world_id=? AND actor_id=a.actor_id AND source_id=a.source_id
        UNION SELECT source_id FROM mind_corrections WHERE world_id=? AND actor_id=a.actor_id AND correction_id=a.source_id
      ) d
    ) SELECT actor_id,source_id FROM affected`,
      )
      .all(JSON.stringify(roots), worldId, worldId, worldId, worldId);
    const scope = JSON.stringify(affected);
    const world = {
      ...state.world,
      memories: { ...state.world.memories },
      experience: {
        ...state.world.experience!,
        awareness: { ...state.world.experience!.awareness },
        summaries: { ...state.world.experience!.summaries },
      },
    };
    for (const [kind, table] of Object.entries(MEMORY_SOURCE_TABLES)) {
      const rows = await db
        .prepare(
          `SELECT t.actor_id,t.payload,t.position FROM ${table} t
        JOIN jsonb_to_recordset(?::jsonb) a(actor_id text,source_id text) ON a.actor_id=t.actor_id AND a.source_id=t.source_id
        WHERE t.world_id=? ORDER BY t.actor_id,t.position`,
        )
        .all(scope, worldId);
      const owners = new Map<string, Record<string, unknown>[]>();
      for (const row of rows) {
        const actorId = String(row['actor_id']);
        const entries = owners.get(actorId) ?? [];
        entries.push(row);
        owners.set(actorId, entries);
      }
      // The runtime arrays carry their SQL ordinals independently of membership. Preserve
      // those ordinals so a partial edit neither renumbers nor deletes unselected history.
      const target =
        kind === 'memory'
          ? world.memories
          : kind === 'awareness'
            ? world.experience.awareness
            : world.experience.summaries;
      for (const [actorId, selected] of owners) {
        const old = target[actorId] ?? [];
        const placement = historyPositions.get(old);
        const positions = new Map(
          old.map((value, i) => [
            historyKey(value),
            placement?.positions.get(historyKey(value)) ?? i,
          ]),
        );
        const merged = new Map(old.map((value) => [historyKey(value), value]));
        for (const row of selected) {
          const value = JSON.parse(String(row['payload']));
          const key = historyKey(value);
          if (!merged.has(key)) merged.set(key, value);
          positions.set(key, Number(row['position']));
        }
        const next = [...merged.values()].sort(
          (a, b) => positions.get(historyKey(a))! - positions.get(historyKey(b))!,
        );
        const tail = await db
          .prepare(
            `SELECT position FROM ${table} WHERE world_id=? AND actor_id=? ORDER BY position DESC LIMIT 1`,
          )
          .get(worldId, actorId);
        historyPositions.set(next, {
          positions,
          next: Math.max(placement?.next ?? 0, Number(tail?.['position'] ?? -1) + 1),
          complete: placement?.complete,
        });
        // Kind and target are selected together above; keep the heterogeneous merge local.
        if (kind === 'memory') world.memories[actorId] = next as (typeof world.memories)[string];
        else if (kind === 'awareness')
          world.experience.awareness[actorId] = next as (typeof world.experience.awareness)[string];
        else
          world.experience.summaries[actorId] = next as (typeof world.experience.summaries)[string];
      }
    }
    // Experience correction intentionally clears all appraisals for affected actors,
    // including terminal records. Their old private attribution must not survive in SQL.
    // docs/knowledge.md#privacy-and-correction
    const appraisals = { ...world.appraisals };
    for (const actorId of new Set(affected.map((row) => String(row['actor_id'])))) {
      const rows = await db
        .prepare(
          'SELECT slot,position,payload FROM mind_appraisals WHERE world_id=? AND parent_id=? ORDER BY position',
        )
        .all(worldId, JSON.stringify(['world', 'appraisals', actorId]));
      const values: Record<string, Appraisal> = {};
      for (const row of rows)
        values[String(row['slot'])] = JSON.parse(String(row['payload'])) as Appraisal;
      historyMapPositions.set(values, {
        positions: new Map(rows.map((row) => [String(row['slot']), Number(row['position'])])),
        next: Number(rows.at(-1)?.['position'] ?? -1) + 1,
        complete: true,
      });
      if (rows.length || appraisals[actorId]) appraisals[actorId] = values;
    }
    if (world.appraisals || Object.keys(appraisals).length) world.appraisals = appraisals;
    return { state: { ...state, world }, events, referencedEventIds };
  });
}
