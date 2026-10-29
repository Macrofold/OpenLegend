import { restoreEvidenceLayout } from './evidence-segments.js';
import type {
  WorldEvent,
  Appraisal,
  ReceivedValueBlock,
  TemporalReceiptLocator,
} from '@open-legend/domain';
import { temporalAccountAliasClosure } from '@open-legend/domain';
import { digest } from './content-digest.js';
import { readTemporalChunkRecord } from './temporal-storage.js';
import type { SavedWorld, SqlDatabase } from './store.js';
import { historyKey, historyPositions, historyMapPositions } from './history-residency.js';
import { MEMORY_SOURCE_TABLES } from './memory-repository.js';

export interface HistoryEditSelection {
  eventIds?: string[];
  receipts?: readonly TemporalReceiptLocator[];
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
 * docs/projects/completed/history-storage-efficiency.md
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
        UNION SELECT actor_id,source_id FROM mind_source_dependencies WHERE world_id=? AND source_id=ANY(?::text[])
        UNION SELECT actor_id,alias_id FROM mind_source_dependencies WHERE world_id=? AND alias_id=ANY(?::text[])
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
    if (selection.receipts?.length) {
      if (selection.receipts.length > 8192)
        throw new Error('Receipt correction exceeds bounded preparation.');
      const impressions = await db
        .prepare(
          `SELECT DISTINCT s.actor_id,s.owner_id AS source_id FROM mind_impression_spans s
        JOIN jsonb_to_recordset(?::jsonb) q("actorId" text,"physicalLife" bigint,epoch text,ordinal bigint)
          ON s.actor_id=q."actorId" AND s.physical_life=q."physicalLife" AND s.receipt_epoch=q.epoch
            AND s.first_ordinal<=q.ordinal AND s.last_ordinal>=q.ordinal WHERE s.world_id=?`,
        )
        .all(JSON.stringify(selection.receipts), worldId);
      roots.push(
        ...impressions.map((row) => ({
          actor_id: String(row['actor_id']),
          source_id: String(row['source_id']),
        })),
      );
    }
    if (!roots.length) return { state, events, referencedEventIds };
    // UNION (not UNION ALL) terminates source/alias cycles. Traverse canonical links,
    // including ineligible retained sources, rather than only currently recallable rows.
    const world = {
      ...state.world,
      memories: { ...state.world.memories },
      actionExperience: {
        ...state.world.actionExperience,
        occurrences: { ...state.world.actionExperience.occurrences },
      },
      experience: {
        ...state.world.experience!,
        awareness: { ...state.world.experience!.awareness },
        summaries: { ...state.world.experience!.summaries },
      },
    };
    // Alternate indexed dependency closure and exact personal account aliases. A
    // receipt address can name a cold canonical event; facet support cannot do so.
    let affected: Record<string, unknown>[] = [];
    const loadedChunks = new Set(
      Object.values(world.experience.temporal?.actors ?? {}).flatMap((actor) =>
        actor.chunks.map((chunk) => chunk.id),
      ),
    );
    let chunkCount = 0,
      chunkBytes = 0,
      sourceBytes = 0;
    for (;;) {
      affected = await db
        .prepare(
          `WITH RECURSIVE affected(actor_id,source_id) AS (
      SELECT actor_id,source_id FROM jsonb_to_recordset(?::jsonb) AS roots(actor_id text,source_id text)
      UNION
      SELECT a.actor_id,d.id FROM affected a CROSS JOIN LATERAL (
        SELECT id FROM recall_sources WHERE world_id=? AND actor_id=a.actor_id AND event_id=a.source_id
        UNION SELECT event_id FROM recall_sources WHERE world_id=? AND actor_id=a.actor_id AND id=a.source_id AND source_kind='memory' AND event_id IS NOT NULL
        UNION SELECT result_memory_id FROM activity_occurrences WHERE world_id=? AND actor_id=a.actor_id AND source_id=a.source_id AND result_memory_id IS NOT NULL
        UNION SELECT source_id FROM activity_occurrences WHERE world_id=? AND actor_id=a.actor_id AND result_memory_id=a.source_id
        UNION SELECT payload::jsonb->>'activityId' FROM mind_memories WHERE world_id=? AND actor_id=a.actor_id AND source_id=a.source_id AND payload::jsonb->>'activityId' IS NOT NULL
        UNION SELECT derived_id FROM mind_source_dependencies WHERE world_id=? AND actor_id=a.actor_id AND (source_id=a.source_id OR alias_id=a.source_id)
        UNION SELECT source_id FROM mind_source_dependencies WHERE world_id=? AND actor_id=a.actor_id AND derived_id=a.source_id AND support_key=?
        UNION SELECT source_id FROM mind_corrections WHERE world_id=? AND actor_id=a.actor_id AND correction_id=a.source_id
      ) d
    ) SELECT actor_id,source_id FROM affected`,
        )
        .all(
          JSON.stringify(roots),
          worldId,
          worldId,
          worldId,
          worldId,
          worldId,
          worldId,
          worldId,
          digest('native-origin'),
          worldId,
        );
      const scope = JSON.stringify(affected);
      // A creator correction must reach cold personal receipts too. Select the actor's
      // indexed source aliases before loading packed chunks; shared blocks grant no access.
      if (world.experience.temporal) {
        const selected = await db
          .prepare(
            `SELECT t.actor_id,t.source_id,t.payload,t.position,t.value_refs,t.segments,t.encoded_bytes AS bytes
        FROM mind_temporal_chunks_read t WHERE t.world_id=? AND NOT (t.source_id=ANY(?::text[])) AND EXISTS (
          SELECT 1 FROM jsonb_to_recordset(?::jsonb) a(actor_id text,source_id text)
          WHERE a.actor_id=t.actor_id AND EXISTS (SELECT 1 FROM mind_temporal_segments s
            WHERE s.world_id=t.world_id AND s.parent_id=t.id AND s.source_ids @> ARRAY[a.source_id]::text[])) ORDER BY t.actor_id,t.position LIMIT 8193`,
          )
          .all(worldId, [...loadedChunks], scope);
        chunkCount += selected.length;
        chunkBytes += selected.reduce((sum, row) => sum + Number(row['bytes']), 0);
        if (chunkCount > 8192 || chunkBytes > 4 * 1024 * 1024)
          throw new Error('Complete personal receipt correction exceeds bounded preparation.');
        const temporal = {
          ...world.experience.temporal,
          actors: { ...world.experience.temporal.actors },
        };
        const sources = new Set<string>(),
          owners = new Map<string, typeof selected>();
        for (const row of selected) {
          const actorId = String(row['actor_id']),
            rows = owners.get(actorId) ?? [];
          loadedChunks.add(String(row['source_id']));
          rows.push(row);
          owners.set(actorId, rows);
        }
        for (const [actorId, rows] of owners) {
          const actor = temporal.actors[actorId];
          if (!actor) throw new Error('Cold personal receipt owner is unavailable.');
          const placement = historyPositions.get(actor.chunks),
            positions = new Map(
              placement?.positions ?? actor.chunks.map((chunk, index) => [chunk.id, index]),
            );
          const chunks = new Map(actor.chunks.map((chunk) => [chunk.id, chunk]));
          for (const row of rows) {
            const chunk = readTemporalChunkRecord(row);
            chunks.set(chunk.id, chunk);
            positions.set(chunk.id, Number(row['position']));
            for (const id of chunk.sourceRefs) sources.add(id);
          }
          const merged = [...chunks.values()].sort(
            (a, b) => positions.get(a.id)! - positions.get(b.id)!,
          );
          historyPositions.set(merged, {
            positions,
            next: placement?.next ?? Math.max(...rows.map((row) => Number(row['position']) + 1)),
            complete: placement?.complete,
          });
          temporal.actors[actorId] = { ...actor, chunks: merged };
        }
        const received = { ...world.receivedValues, sources: { ...world.receivedValues?.sources } };
        const missing = [...sources].filter((id) => !received.sources[id]);
        if (missing.length) {
          const size = await db
            .prepare(
              'SELECT SUM(encoded_bytes) AS bytes FROM mind_perception_values_read WHERE world_id=? AND source_id=ANY(?::text[])',
            )
            .get(worldId, missing);
          sourceBytes += Number(size?.['bytes'] ?? 0);
          if (sourceBytes > 4 * 1024 * 1024)
            throw new Error('Complete personal source correction exceeds bounded preparation.');
          for (const row of await db
            .prepare(
              'SELECT payload,segments FROM mind_perception_values_read WHERE world_id=? AND source_id=ANY(?::text[])',
            )
            .all(worldId, missing)) {
            const source = restoreEvidenceLayout(
              JSON.parse(String(row['payload'])),
              'values',
              row['segments'],
            ) as unknown as ReceivedValueBlock;
            received.sources[source.id] = source;
          }
        }
        if ([...sources].some((id) => !received.sources[id]))
          throw new Error('Personal receipt correction has missing source fragments.');
        world.experience.temporal = temporal;
        if (sources.size) world.receivedValues = received;
      }
      const known = new Set(
        affected.map((row) => JSON.stringify([row['actor_id'], row['source_id']])),
      );
      const additions: typeof roots = [];
      for (const actorId of new Set(affected.map((row) => String(row['actor_id']))))
        for (const alias of temporalAccountAliasClosure(
          world,
          actorId,
          affected
            .filter((row) => row['actor_id'] === actorId)
            .map((row) => String(row['source_id'])),
        )) {
          const key = JSON.stringify([actorId, alias]);
          if (!known.has(key)) {
            known.add(key);
            additions.push({ actor_id: actorId, source_id: alias });
          }
        }
      if (!additions.length) break;
      roots.push(...additions);
    }
    const scope = JSON.stringify(affected);
    for (const [kind, table] of Object.entries({
      ...MEMORY_SOURCE_TABLES,
      activity: 'activity_occurrences',
    })) {
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
        kind === 'activity'
          ? world.actionExperience.occurrences
          : kind === 'memory'
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
        if (kind === 'activity')
          world.actionExperience.occurrences[actorId] =
            next as (typeof world.actionExperience.occurrences)[string];
        else if (kind === 'memory')
          world.memories[actorId] = next as (typeof world.memories)[string];
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
