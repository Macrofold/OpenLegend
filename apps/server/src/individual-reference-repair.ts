import {
  selectedTemporalPolicy,
  selectedRepairRecentIndividualReferences,
  selectedPruneObserverIndividuals,
  temporalChunkReceipts,
  temporalChunkCheckpointOperations,
  temporalCheckpointHeader,
  temporalOperationFacet,
  temporalReceiptIndividualIds,
  temporalRecentAt,
  updateWorld,
  type WorldState,
  type TemporalChunk,
  type ReceivedValueLookup,
} from '@open-legend/domain';
import type { SqlDatabase, SavedWorld } from './store.js';
import { readTemporalChunkRecord, MemoryRetentionError } from './temporal-storage.js';
import { receiptLookupBucket } from './evidence-segments.js';
import type { RetentionMetadataView } from './retention-metadata.js';

type Reference = { epoch: string; ordinal: number; chunkOrder: number; at: number };
/** Sparse correction is exceptional: find only the latest matching retained
 * chunk for affected people, then inspect those bounded bodies once. Ordinary
 * prefix expiry and every other individual require no cold survivor lookup. */
export async function prepareIndividualReferenceRepairs(
  db: SqlDatabase,
  state: SavedWorld,
  metadata: RetentionMetadataView,
): Promise<SavedWorld> {
  const world = state.world,
    requested: Array<{
      actor_id: string;
      individual_id: string;
      bucket: number;
      frontier_order: number | null;
      frontier_ordinal: number | null;
    }> = [];
  for (const [actorId, actor] of Object.entries(world.experience?.temporal?.actors ?? {})) {
    for (const id of actor.individualRepairs ?? []) {
      requested.push({
        actor_id: actorId,
        individual_id: id,
        bucket: receiptLookupBucket('individualIds', id),
        frontier_order: actor.retiredThrough?.chunkOrder ?? null,
        frontier_ordinal: actor.retiredThrough?.ordinal ?? null,
      });
      if (requested.length === 32) break;
    }
    if (requested.length === 32) break;
  }
  if (!requested.length) return state;
  const rows = await db
    .prepare(
      `WITH requested AS MATERIALIZED (
      SELECT * FROM jsonb_to_recordset(?::jsonb) q(actor_id text,individual_id text,bucket smallint,frontier_order bigint,frontier_ordinal bigint)
    ), wanted AS (
      SELECT actor_id,array_agg(DISTINCT individual_id) AS individuals,array_agg(DISTINCT bucket) AS buckets,
        max(frontier_order) AS frontier_order,max(frontier_ordinal) AS frontier_ordinal FROM requested GROUP BY actor_id
    ), pages AS MATERIALIZED (
      SELECT c.actor_id,c.id,c.chunk_order,c.logical_bytes,c.last_ordinal,s.occurrence_individual_ids
      FROM wanted q JOIN mind_temporal_segments s ON s.world_id=? AND s.actor_id=q.actor_id
      JOIN mind_temporal_chunks c ON c.world_id=s.world_id AND c.id=s.parent_id
      WHERE c.retired_revision IS NULL AND c.last_at>?
        AND s.lookup_buckets && q.buckets AND s.occurrence_individual_ids && q.individuals
        AND (q.frontier_order IS NULL OR c.chunk_order>q.frontier_order OR (c.chunk_order=q.frontier_order AND c.last_ordinal>q.frontier_ordinal))
    ) SELECT DISTINCT ON (q.actor_id,q.individual_id) q.actor_id,q.individual_id,p.id,p.logical_bytes
      FROM requested q JOIN pages p ON p.actor_id=q.actor_id AND p.occurrence_individual_ids @> ARRAY[q.individual_id]
      ORDER BY q.actor_id,q.individual_id,p.chunk_order DESC,p.last_ordinal DESC`,
    )
    .all(
      JSON.stringify(requested),
      world.id,
      world.simTime - selectedTemporalPolicy(world).recent.maxAgeSeconds,
    );
  const ids = [...new Set(rows.map((row) => String(row['id'])))];
  const sizes = new Map(rows.map((row) => [String(row['id']), Number(row['logical_bytes'])]));
  if ([...sizes.values()].reduce((sum, bytes) => sum + bytes, 0) > 4 * 1024 * 1024)
    throw new MemoryRetentionError('Individual reference repair exceeds bounded preparation.');
  const chunks = new Map<string, TemporalChunk>();
  if (ids.length)
    for (const row of await db
      .prepare(
        'SELECT id,payload,segments,value_refs FROM mind_temporal_chunks_read WHERE world_id=? AND id=ANY(?::text[])',
      )
      .all(world.id, ids))
      chunks.set(String(row['id']), readTemporalChunkRecord(row));
  if (ids.some((id) => !chunks.has(id)))
    throw new MemoryRetentionError('Selected individual reference body is unavailable.');
  const wantedValues = [...new Set([...chunks.values()].flatMap((chunk) => chunk.sourceRefs))];
  const sources: Record<string, ReceivedValueLookup[string]> = {};
  if (wantedValues.length)
    for (const row of await db
      .prepare(
        'SELECT source_id,payload FROM mind_perception_values WHERE world_id=? AND source_id=ANY(?::text[])',
      )
      .all(world.id, wantedValues))
      sources[String(row['source_id'])] = JSON.parse(
        String(row['payload']),
      ) as ReceivedValueLookup[string];
  if (wantedValues.some((id) => !sources[id]))
    throw new MemoryRetentionError('Selected individual reference values are unavailable.');
  const byActor = new Map<string, Array<{ id: string; reference?: Reference }>>();
  for (const request of requested) {
    let changes = byActor.get(request.actor_id);
    if (!changes) byActor.set(request.actor_id, (changes = []));
    const row = rows.find(
      (row) =>
        row['actor_id'] === request.actor_id && row['individual_id'] === request.individual_id,
    );
    const chunk = row && chunks.get(String(row['id']));
    let reference: Reference | undefined;
    if (chunk) {
      const frontier = world.experience!.temporal!.actors[request.actor_id]!.retiredThrough;
      const receipts = temporalChunkReceipts(chunk).filter(
        (receipt) =>
          temporalRecentAt(
            receipt.at,
            world.simTime,
            selectedTemporalPolicy(world).recent.maxAgeSeconds,
          ) &&
          (!frontier ||
            chunk.order > frontier.chunkOrder ||
            (chunk.order === frontier.chunkOrder && receipt.ordinal > frontier.ordinal)),
      );
      const keep = (ordinal: number, at: number) => {
        if (!reference || ordinal > reference.ordinal)
          reference = { epoch: chunk.epoch, ordinal, chunkOrder: chunk.order, at };
      };
      for (const receipt of receipts)
        if (temporalReceiptIndividualIds(receipt, sources).includes(request.individual_id))
          keep(receipt.ordinal, receipt.at);
      for (const entry of temporalChunkCheckpointOperations(chunk)) {
        const header = temporalCheckpointHeader(chunk, entry);
        const anchor = receipts.find(
          (receipt) => receipt.at >= header.at && receipt.acquisition >= header.acquisition,
        );
        if (!anchor) continue;
        const facets = entry.facets.map((_, position) =>
          temporalOperationFacet(chunk, entry, position),
        );
        if (
          temporalReceiptIndividualIds({ ...header, facets }, sources).includes(
            request.individual_id,
          )
        )
          // The retained suffix actually uses this checkpoint role. This locator
          // proves liveness, never a new sighting at the anchor's time.
          keep(anchor.ordinal, anchor.at);
      }
    }
    changes.push({ id: request.individual_id, ...(reference ? { reference } : {}) });
  }
  const actors = [...byActor];
  const lasting = await metadata.survivingMembershipBatch(
    db,
    world.id,
    actors.map(([actorId, changes]) => ({
      actorId,
      aliases: [],
      individualIds: changes.map((change) => change.id),
      includeRecent: false,
    })),
  );
  return {
    ...state,
    world: updateWorld(
      world,
      (draft) => {
        for (const [index, [actorId, changes]] of actors.entries()) {
          selectedRepairRecentIndividualReferences(draft, actorId, changes);
          const retained = lasting[index]!.individuals;
          for (const capsule of Object.values(
            draft.experience?.temporal?.actors[actorId]?.supports ?? {},
          )) {
            if (capsule.receipt.subjectIdentity?.kind === 'individual')
              retained.add(capsule.receipt.subjectIdentity.individualId);
            for (const value of capsule.values)
              if (value.kind === 'association' && value.subject.kind === 'individual')
                retained.add(value.subject.individualId);
          }
          selectedPruneObserverIndividuals(draft, actorId, {
            releasedSourceIds: [],
            retainedIndividualIds: retained,
          });
        }
      },
      { retainNativeValues: true },
    ),
  };
}
