/** Indexed dependency and physical-page selection for explicit history edits.
 * Both Source and native preparation consume these finite rows at their actual
 * live SQL cut; a shared value or unselected page never grants edit scope. */
import { parsePersonalFactAlias, parseTemporalReceiptId } from '@open-legend/domain';
import { receiptLookupBucket } from './temporal-page-storage.js';
import { digest } from './content-digest.js';
import type { SqlDatabase } from './store.js';

export const correctionPageBytes = 4 * 1024 * 1024;
export const correctionPageRows = 8192;
export const correctionSourceBytes = 4 * 1024 * 1024;
export const correctionReceiptCount = 8192;

export interface CorrectionSource {
  readonly actor_id: string;
  readonly source_id: string;
}
export interface CorrectionCandidate extends CorrectionSource {
  readonly lookup_source_id: string;
  readonly lookup_bucket: number;
  readonly position?: ReturnType<typeof parseTemporalReceiptId>;
  readonly member_index?: number | null;
}

export function correctionCandidates(sources: readonly CorrectionSource[]): CorrectionCandidate[] {
  return sources.map(({ actor_id, source_id }) => {
    const fact = parsePersonalFactAlias(source_id);
    const lookup = fact?.observationId ?? source_id;
    const position = parseTemporalReceiptId(lookup);
    return {
      actor_id,
      source_id,
      lookup_source_id: lookup,
      lookup_bucket: receiptLookupBucket('sourceIds', lookup),
      ...(position ? { position, member_index: fact?.ordinal ?? null } : {}),
    };
  });
}

export function correctionDependencyQuery(worldId: string, roots: readonly CorrectionSource[]) {
  return {
    sql: `WITH RECURSIVE affected(actor_id,source_id) AS (
      SELECT actor_id,source_id FROM jsonb_to_recordset(?::jsonb) AS roots(actor_id text,source_id text)
      UNION
      SELECT a.actor_id,d.id FROM affected a CROSS JOIN LATERAL (
        SELECT id FROM recall_sources WHERE world_id=? AND actor_id=a.actor_id AND event_id=a.source_id
        UNION SELECT event_id FROM recall_sources WHERE world_id=? AND actor_id=a.actor_id AND id=a.source_id AND source_kind='memory' AND event_id IS NOT NULL
        UNION SELECT result_evidence_id FROM activity_occurrences WHERE world_id=? AND actor_id=a.actor_id AND source_id=a.source_id AND result_evidence_id IS NOT NULL
        UNION SELECT source_id FROM activity_occurrences WHERE world_id=? AND actor_id=a.actor_id AND result_evidence_id=a.source_id
        UNION SELECT activity_id FROM mind_memories WHERE world_id=? AND actor_id=a.actor_id AND source_id=a.source_id AND activity_id IS NOT NULL
        UNION SELECT derived_id FROM mind_source_dependencies WHERE world_id=? AND actor_id=a.actor_id AND (source_id=a.source_id OR alias_id=a.source_id)
        UNION SELECT source_id FROM mind_source_dependencies WHERE world_id=? AND actor_id=a.actor_id AND derived_id=a.source_id AND support_key=?
        UNION SELECT source_id FROM mind_corrections WHERE world_id=? AND actor_id=a.actor_id AND correction_id=a.source_id
      ) d
    ) SELECT actor_id,source_id FROM affected`,
    parameters: [
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
    ],
  };
}

export async function readCorrectionDependencies(
  db: SqlDatabase,
  worldId: string,
  roots: readonly CorrectionSource[],
): Promise<CorrectionSource[]> {
  const query = correctionDependencyQuery(worldId, roots);
  const rows = await db.prepare(query.sql).all(...query.parameters);
  return rows.map((row) => ({
    actor_id: String(row['actor_id']),
    source_id: String(row['source_id']),
  }));
}

export async function readCorrectionPageMetadata(
  db: SqlDatabase,
  worldId: string,
  candidates: readonly CorrectionCandidate[],
  residentSlots: readonly string[],
  now: number,
  maxAgeSeconds: number,
): Promise<Record<string, unknown>[]> {
  const aliases = candidates.some((candidate) => !candidate.position)
    ? await db
        .prepare(
          `SELECT t.id,t.encoded_bytes AS bytes
        FROM mind_temporal_pages t WHERE t.world_id=? AND t.last_at+?>? AND NOT (t.slot=ANY(?::text[])) AND EXISTS (
          SELECT 1 FROM jsonb_to_recordset(?::jsonb) a(actor_id text,source_id text,lookup_source_id text,lookup_bucket smallint)
          WHERE a.actor_id=t.actor_id AND t.lookup_buckets @> ARRAY[a.lookup_bucket]::smallint[] AND t.source_ids @> ARRAY[a.lookup_source_id]::text[]) ORDER BY t.actor_id,t.position LIMIT ${correctionPageRows + 1}`,
        )
        .all(
          worldId,
          maxAgeSeconds,
          now,
          residentSlots,
          JSON.stringify(candidates.filter((c) => !c.position)),
        )
    : [];
  const direct = candidates.flatMap((candidate) =>
    candidate.position
      ? [
          {
            actor_id: candidate.actor_id,
            epoch: candidate.position.epoch,
            batch_order: candidate.position.batchOrder,
            entry_index: candidate.position.entryIndex,
            member_index: candidate.member_index,
          },
        ]
      : [],
  );
  const addressed = direct.length
    ? await db
        .prepare(
          `WITH requested AS MATERIALIZED (
          SELECT * FROM jsonb_to_recordset(?::jsonb) q(actor_id text,epoch text,batch_order bigint,entry_index bigint,member_index bigint)
        ) SELECT DISTINCT p.id,p.encoded_bytes AS bytes FROM requested q CROSS JOIN LATERAL (
          (SELECT id,slot,receipt_epoch,last_batch_order,last_entry,last_member,encoded_bytes
            FROM mind_temporal_pages WHERE world_id=? AND actor_id=q.actor_id
              AND (first_batch_order,first_entry,first_member)<=(q.batch_order,q.entry_index,COALESCE(q.member_index,-1))
            ORDER BY first_batch_order DESC,first_entry DESC,first_member DESC,id DESC LIMIT 1)
          UNION ALL
          (SELECT id,slot,receipt_epoch,last_batch_order,last_entry,last_member,encoded_bytes
            FROM mind_temporal_pages WHERE q.member_index IS NULL AND world_id=? AND actor_id=q.actor_id
              AND first_batch_order=q.batch_order AND first_entry=q.entry_index)
        ) p WHERE p.receipt_epoch=q.epoch
          AND (p.last_batch_order,p.last_entry,p.last_member)>=(q.batch_order,q.entry_index,COALESCE(q.member_index,0))
          AND NOT(p.slot=ANY(?::text[])) LIMIT ${correctionPageRows + 1}`,
        )
        .all(JSON.stringify(direct), worldId, worldId, residentSlots)
    : [];
  return [...new Map([...aliases, ...addressed].map((row) => [String(row['id']), row])).values()];
}
