import {
  selectedTemporalPolicy,
  selectedRepairRecentIndividualReferences,
  selectedPruneObserverIndividuals,
  temporalPageReferences,
  temporalPageOperations,
  temporalReceiptIndividualIds,
  temporalRecentAt,
  updateWorld,
  type TemporalPage,
  type ReceivedValueLookup,
} from '@open-legend/domain';
import type { SqlDatabase, SavedWorld } from './store.js';
import { readTemporalPageRecord, MemoryRetentionError } from './temporal-storage.js';
import { receiptLookupBucket } from './temporal-page-storage.js';
import type { RetentionMetadataView } from './retention-metadata.js';

type Reference = { epoch: string; ordinal: number; pageOrder: number; at: number };
/** Sparse correction is exceptional: find only the latest matching retained
 * chunk for affected people, then inspect those bounded bodies once. Ordinary
 * prefix expiry and every other individual require no cold survivor lookup. */
export async function prepareIndividualReferenceRepairs(
  db: SqlDatabase,
  state: SavedWorld,
  metadata: RetentionMetadataView,
  actorIds: readonly string[],
): Promise<SavedWorld> {
  const world = state.world,
    requested: Array<{
      actor_id: string;
      individual_id: string;
      bucket: number;
    }> = [];
  for (const actorId of actorIds) {
    const actor = world.experience?.temporal?.actors[actorId];
    if (!actor) continue;
    for (const id of actor.individualRepairs ?? []) {
      requested.push({
        actor_id: actorId,
        individual_id: id,
        bucket: receiptLookupBucket('individualIds', id),
      });
      if (requested.length === 32) break;
    }
    if (requested.length === 32) break;
  }
  if (!requested.length) return state;
  const rows = await db
    .prepare(
      `WITH requested AS MATERIALIZED (
        SELECT * FROM jsonb_to_recordset(?::jsonb) q(actor_id text,individual_id text,bucket smallint)
      ) SELECT q.actor_id,q.individual_id,c.id,c.encoded_bytes
        FROM requested q CROSS JOIN LATERAL (
          SELECT id,encoded_bytes FROM mind_temporal_pages c WHERE c.world_id=? AND c.actor_id=q.actor_id
            AND c.retired_revision IS NULL AND c.last_received_at>?
            AND c.lookup_buckets @> ARRAY[q.bucket] AND c.individual_ids @> ARRAY[q.individual_id]
          ORDER BY c.last_received_at DESC,c.last_order DESC,c.id DESC LIMIT 1
        ) c`,
    )
    .all(
      JSON.stringify(requested),
      world.id,
      world.simTime - selectedTemporalPolicy(world).recent.maxAgeSeconds,
    );
  const ids = [...new Set(rows.map((row) => String(row['id'])))];
  const sizes = new Map(rows.map((row) => [String(row['id']), Number(row['encoded_bytes'])]));
  if ([...sizes.values()].reduce((sum, bytes) => sum + bytes, 0) > 4 * 1024 * 1024)
    throw new MemoryRetentionError('Individual reference repair exceeds bounded preparation.');
  const pages = new Map<string, TemporalPage>();
  if (ids.length)
    for (const row of await db
      .prepare('SELECT * FROM mind_temporal_pages WHERE world_id=? AND id=ANY(?::text[])')
      .all(world.id, ids))
      pages.set(String(row['id']), readTemporalPageRecord(row));
  if (ids.some((id) => !pages.has(id)))
    throw new MemoryRetentionError('Selected individual reference body is unavailable.');
  for (const request of requested)
    for (const page of world.experience?.temporal?.actors[request.actor_id]?.pages ?? [])
      if (page.individualIds.includes(request.individual_id))
        pages.set(JSON.stringify([page.actorId, page.id]), page);
  const wantedValues = [
    ...new Set([...pages.values()].flatMap((chunk) => [...temporalPageReferences(chunk)])),
  ];
  const sources: Record<string, ReceivedValueLookup[string]> = {};
  for (const id of wantedValues)
    if (world.receivedValues?.sources[id]) sources[id] = world.receivedValues.sources[id]!;
  const missingValues = wantedValues.filter((id) => !sources[id]);
  if (missingValues.length)
    for (const row of await db
      .prepare(
        'SELECT source_id,payload FROM mind_perception_values WHERE world_id=? AND source_id=ANY(?::text[])',
      )
      .all(world.id, missingValues))
      sources[String(row['source_id'])] = JSON.parse(
        String(row['payload']),
      ) as ReceivedValueLookup[string];
  if (wantedValues.some((id) => !sources[id]))
    throw new MemoryRetentionError('Selected individual reference values are unavailable.');
  const byActor = new Map<string, Array<{ id: string; reference?: Reference }>>();
  for (const request of requested) {
    let changes = byActor.get(request.actor_id);
    if (!changes) byActor.set(request.actor_id, (changes = []));
    const matching = [...pages.values()].filter(
      (page) =>
        page.actorId === request.actor_id && page.individualIds.includes(request.individual_id),
    );
    let reference: Reference | undefined;
    for (const page of matching)
      for (const operation of temporalPageOperations(page)) {
        if (operation.kind === 'check') continue;
        const receipt = operation.receipt;
        if (
          !temporalRecentAt(
            operation.kind === 'span' ? operation.closedAt : receipt.at,
            world.simTime,
            selectedTemporalPolicy(world).recent.maxAgeSeconds,
          ) ||
          !temporalReceiptIndividualIds(receipt, sources).includes(request.individual_id)
        )
          continue;
        const at = Math.max(
          receipt.at,
          ...receipt.facets.map(
            (field) =>
              field.support?.confirmedThrough ?? field.confirmedThrough ?? field.measuredThrough,
          ),
        );
        if (
          !reference ||
          at > reference.at ||
          (at === reference.at && receipt.ordinal > reference.ordinal)
        )
          reference = { epoch: page.epoch, ordinal: receipt.ordinal, pageOrder: page.order, at };
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
