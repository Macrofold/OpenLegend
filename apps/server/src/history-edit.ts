/** Concurrent preparation is application capacity, never permission to edit a source. */
export const SOURCE_EDIT_PREPARATION_CAPACITY = 64;

import { serializeTemporalPage, temporalPageRecordId } from './temporal-page-storage.js';
import type {
  WorldEvent,
  Appraisal,
  ReceivedValue,
  TemporalReceiptLocator,
} from '@open-legend/domain';
import {
  temporalAccountAliasClosure,
  temporalPageReferences,
  selectedTemporalPolicy,
  parsePersonalFactAlias,
  parseTemporalReceiptId,
} from '@open-legend/domain';
import {
  correctionCandidates,
  correctionPageBytes,
  correctionPageRows,
  correctionReceiptCount,
  correctionSourceBytes,
  readCorrectionDependencies,
  readCorrectionPageMetadata,
  type CorrectionSource,
} from './temporal-correction-selection.js';
import { readTemporalPageRecord } from './temporal-storage.js';
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
  temporalPredecessors?: ReadonlyMap<string, number>;
  stale?: true;
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
  revision: number,
): Promise<PreparedHistoryEdit> {
  const snapshot = db.readTransaction?.bind(db) ?? db.transaction.bind(db);
  return snapshot(async () => {
    const worldId = state.world.id;
    const head = await db.prepare('SELECT revision FROM world_head WHERE world_id=?').get(worldId);
    if (Number(head?.['revision']) !== revision)
      return { state, events: [], referencedEventIds: new Set<string>(), stale: true };
    if (
      Object.values(state.world.experience?.temporal?.actors ?? {}).some((actor) =>
        actor.pages.some((page) => page.appendClosed !== true),
      )
    )
      throw new Error('Flush accepted temporal changes before preparing a durable history edit.');
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
      if (selection.receipts.length > correctionReceiptCount)
        throw new Error('Receipt correction exceeds bounded preparation.');
      const impressions = await db
        .prepare(
          `SELECT DISTINCT s.actor_id,s.owner_id AS source_id FROM mind_impression_spans s
        JOIN jsonb_to_recordset(?::jsonb) q("actorId" text,"physicalLife" bigint,epoch text,"batchOrder" bigint,"entryIndex" bigint)
          ON s.actor_id=q."actorId" AND s.physical_life=q."physicalLife" AND s.receipt_epoch=q.epoch
            AND (s.first_batch_order,s.first_entry)<=(q."batchOrder",q."entryIndex")
            AND (s.last_batch_order,s.last_entry)>=(q."batchOrder",q."entryIndex") WHERE s.world_id=?`,
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
    let affected: CorrectionSource[] = [];
    const loadedChunks = new Set(
      Object.values(world.experience.temporal?.actors ?? {}).flatMap((actor) =>
        actor.pages.map((chunk) => chunk.id),
      ),
    );
    let chunkCount = 0,
      chunkBytes = 0,
      sourceBytes = 0;
    for (;;) {
      affected = await readCorrectionDependencies(db, worldId, roots);
      const candidates = correctionCandidates(affected);
      // A creator correction must reach cold personal receipts too. Select the actor's
      // indexed source aliases before loading packed pages; shared blocks grant no access.
      if (world.experience.temporal) {
        const selectedMetadata = await readCorrectionPageMetadata(
          db,
          worldId,
          candidates,
          [...loadedChunks],
          world.simTime,
          selectedTemporalPolicy(world).recent.maxAgeSeconds,
        );
        if (
          chunkCount + selectedMetadata.length > correctionPageRows ||
          chunkBytes + selectedMetadata.reduce((sum, row) => sum + Number(row['bytes']), 0) >
            correctionPageBytes
        )
          throw new Error('Complete personal receipt correction exceeds bounded preparation.');
        const selected = selectedMetadata.length
          ? await db
              .prepare(
                'SELECT *,encoded_bytes AS bytes FROM mind_temporal_pages WHERE world_id=? AND id=ANY(?::text[])',
              )
              .all(
                worldId,
                selectedMetadata.map((row) => String(row['id'])),
              )
          : [];
        chunkCount += selected.length;
        chunkBytes += selected.reduce((sum, row) => sum + Number(row['bytes']), 0);
        if (chunkCount > correctionPageRows || chunkBytes > correctionPageBytes)
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
          loadedChunks.add(String(row['slot']));
          rows.push(row);
          owners.set(actorId, rows);
        }
        for (const [actorId, rows] of owners) {
          const actor = temporal.actors[actorId];
          if (!actor) throw new Error('Cold personal receipt owner is unavailable.');
          const pages = new Map(actor.pages.map((chunk) => [chunk.id, chunk]));
          for (const row of rows) {
            const chunk = readTemporalPageRecord(row);
            pages.set(chunk.id, chunk);
            for (const id of temporalPageReferences(chunk)) sources.add(id);
          }
          const merged = [...pages.values()].sort((a, b) => a.order - b.order);
          temporal.actors[actorId] = { ...actor, pages: merged };
        }
        const received = { ...world.receivedValues, sources: { ...world.receivedValues?.sources } };
        const missing = [...sources].filter((id) => !received.sources[id]);
        if (missing.length) {
          const size = await db
            .prepare(
              'SELECT SUM(octet_length(payload)) AS bytes FROM mind_perception_values WHERE world_id=? AND source_id=ANY(?::text[])',
            )
            .get(worldId, missing);
          sourceBytes += Number(size?.['bytes'] ?? 0);
          if (sourceBytes > correctionSourceBytes)
            throw new Error('Complete personal source correction exceeds bounded preparation.');
          for (const row of await db
            .prepare(
              'SELECT payload FROM mind_perception_values WHERE world_id=? AND source_id=ANY(?::text[])',
            )
            .all(worldId, missing)) {
            const source = JSON.parse(String(row['payload'])) as unknown as ReceivedValue;
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
    const affectedByActor = new Map<string, Set<string>>();
    for (const source of affected) {
      const actorId = String(source['actor_id']);
      let ids = affectedByActor.get(actorId);
      if (!ids) affectedByActor.set(actorId, (ids = new Set()));
      const id = String(source['source_id']);
      ids.add(id);
      if (!parseTemporalReceiptId(parsePersonalFactAlias(id)?.observationId ?? id))
        ids.add(parsePersonalFactAlias(id)?.observationId ?? id);
    }
    const selectedPages = new Map<string, import('@open-legend/domain').TemporalPage>();
    for (const [actorId, sources] of affectedByActor)
      for (const page of world.experience.temporal?.actors[actorId]?.pages ?? [])
        if (
          page.sourceIds.some((id) => sources.has(id)) ||
          [...sources].some((source) => {
            const fact = parsePersonalFactAlias(source),
              position = parseTemporalReceiptId(fact?.observationId ?? source);
            return (
              position &&
              page.epoch === position.epoch &&
              page.batches.some(
                (batch) =>
                  batch.batchOrder === position.batchOrder &&
                  batch.entries.some(
                    (entry) =>
                      entry.entryIndex === position.entryIndex &&
                      (fact === undefined ||
                        entry.receipt?.facets.some(
                          (member) => member.memberIndex === fact.ordinal,
                        )),
                  ),
              )
            );
          })
        )
          selectedPages.set(temporalPageRecordId(actorId, page.id), page);
    const temporalPredecessors = new Map<string, number>();
    const ids = [...selectedPages.keys()];
    for (let at = 0; at < ids.length; at += 256)
      for (const row of await db
        .prepare(
          'SELECT id,revision,payload FROM mind_temporal_pages WHERE world_id=? AND id=ANY(?::text[])',
        )
        .all(worldId, ids.slice(at, at + 256))) {
        const id = String(row['id']),
          page = selectedPages.get(id)!;
        if (String(row['payload']) !== serializeTemporalPage(page))
          throw new Error('Prepared temporal predecessor differs from its canonical page.');
        temporalPredecessors.set(id, Number(row['revision']));
      }
    if (temporalPredecessors.size !== selectedPages.size)
      throw new Error('Prepared temporal predecessor is unavailable.');
    return { state: { ...state, world }, events, referencedEventIds, temporalPredecessors };
  });
}

/** Install only hydrated cold members into the latest accepted world. Ordinary
 * physical progress and newly acquired suffixes never belong to this read result. */
export function mergeHistoryEditResidency(
  current: SavedWorld,
  prepared: PreparedHistoryEdit,
  baseline: SavedWorld,
): SavedWorld {
  const neededValues = new Set<string>();
  const mergeRows = <T>(
    live: T[] | undefined,
    cold: T[] | undefined,
    original: T[] | undefined,
  ): T[] | undefined => {
    if (!cold?.length || live === cold) return live;
    const values = new Map((live ?? []).map((value) => [historyKey(value), value]));
    const oldPositions = live && historyPositions.get(live);
    const coldPositions = historyPositions.get(cold);
    const positions = new Map(
      oldPositions?.positions ?? (live ?? []).map((value, at) => [historyKey(value), at]),
    );
    let changed = false;
    const resident = new Set((original ?? []).map(historyKey));
    for (const value of cold) {
      const key = historyKey(value);
      if (values.has(key) || resident.has(key)) continue;
      values.set(key, value);
      changed = true;
      const position = coldPositions?.positions.get(key);
      if (position === undefined)
        throw new Error('Prepared memory source has no canonical position.');
      positions.set(key, position);
    }
    if (!changed) return live;
    const result = [...values.values()].sort(
      (a, b) => positions.get(historyKey(a))! - positions.get(historyKey(b))!,
    );
    historyPositions.set(result, {
      positions,
      next: Math.max(oldPositions?.next ?? 0, coldPositions?.next ?? 0),
      complete: oldPositions?.complete ?? false,
    });
    return result;
  };
  const mergeOwners = <T>(
    live: Record<string, T[]>,
    cold: Record<string, T[]> | undefined,
    original: Record<string, T[]> | undefined,
  ) => {
    let result = live;
    for (const [actor, values] of Object.entries(cold ?? {})) {
      const rows = mergeRows(live[actor], values, original?.[actor]);
      if (rows !== live[actor] && rows) {
        if (result === live) result = { ...live };
        result[actor] = rows;
      }
    }
    return result;
  };
  const world = {
    ...current.world,
    memories: mergeOwners(
      current.world.memories,
      prepared.state.world.memories,
      baseline.world.memories,
    ),
    actionExperience: {
      ...current.world.actionExperience,
      occurrences: mergeOwners(
        current.world.actionExperience.occurrences,
        prepared.state.world.actionExperience.occurrences,
        baseline.world.actionExperience.occurrences,
      ),
    },
  };
  if (world.experience && prepared.state.world.experience) {
    world.experience = {
      ...world.experience,
      awareness: mergeOwners(
        world.experience.awareness,
        prepared.state.world.experience.awareness,
        baseline.world.experience?.awareness,
      ),
      summaries: mergeOwners(
        world.experience.summaries,
        prepared.state.world.experience.summaries,
        baseline.world.experience?.summaries,
      ),
    };
    const temporal = world.experience.temporal;
    const cold = prepared.state.world.experience.temporal;
    if (temporal && cold) {
      const actors = { ...temporal.actors };
      for (const [actorId, preparedActor] of Object.entries(cold.actors)) {
        const live = actors[actorId];
        if (!live || live.pages === preparedActor.pages) continue;
        const pages = new Map(live.pages.map((chunk) => [chunk.id, chunk]));
        const resident = new Set(
          (baseline.world.experience?.temporal?.actors[actorId]?.pages ?? []).map(
            (chunk) => chunk.id,
          ),
        );
        const cutoff = world.simTime - selectedTemporalPolicy(world).recent.maxAgeSeconds;
        for (const chunk of preparedActor.pages)
          if (!pages.has(chunk.id) && !resident.has(chunk.id) && chunk.throughAt >= cutoff) {
            pages.set(chunk.id, chunk);
            for (const id of temporalPageReferences(chunk)) neededValues.add(id);
          }
        if (pages.size !== live.pages.length)
          actors[actorId] = {
            ...live,
            pages: [...pages.values()].sort((a, b) => a.order - b.order),
          };
      }
      world.experience.temporal = { ...temporal, actors };
    }
  }
  if (prepared.state.world.receivedValues) {
    const sources = { ...world.receivedValues?.sources };
    for (const id of neededValues)
      if (prepared.state.world.receivedValues.sources[id])
        sources[id] ??= prepared.state.world.receivedValues.sources[id]!;
    world.receivedValues = { ...world.receivedValues, sources };
  }
  if (prepared.state.world.appraisals) {
    world.appraisals = { ...world.appraisals };
    for (const [actor, values] of Object.entries(prepared.state.world.appraisals)) {
      const live = world.appraisals[actor] ?? {};
      const original = baseline.world.appraisals?.[actor] ?? {};
      const merged = { ...live };
      for (const [id, value] of Object.entries(values))
        if (!Object.hasOwn(original, id) && !Object.hasOwn(merged, id)) merged[id] = value;
      const coldPositions = historyMapPositions.get(values),
        currentPositions = historyMapPositions.get(live);
      if (coldPositions)
        historyMapPositions.set(merged, {
          positions: new Map([...coldPositions.positions, ...(currentPositions?.positions ?? [])]),
          next: Math.max(coldPositions.next, currentPositions?.next ?? 0),
          complete: true,
        });
      world.appraisals[actor] = merged;
    }
  }
  return { ...current, world };
}

/** The creator's preparation may wait while ordinary play and retention continue.
 * Recheck the exact selected immutable predecessors before adopting their bodies. */
export async function historyEditPredecessorsCurrent(
  db: SqlDatabase,
  worldId: string,
  prepared: PreparedHistoryEdit,
): Promise<boolean> {
  const expected = prepared.temporalPredecessors;
  if (!expected?.size) return true;
  const ids = [...expected.keys()];
  let found = 0;
  for (let at = 0; at < ids.length; at += 256)
    for (const row of await db
      .prepare('SELECT id,revision FROM mind_temporal_pages WHERE world_id=? AND id=ANY(?::text[])')
      .all(worldId, ids.slice(at, at + 256))) {
      if (expected.get(String(row['id'])) !== Number(row['revision'])) return false;
      found++;
    }
  return found === expected.size;
}
