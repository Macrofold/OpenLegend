// SQL for canonical account membership and retention metadata. Live readers
// and stopped release preparation share the same projections and bounds.

import { maximumTemporalPreparationRows } from './temporal-page-storage.js';

export const ACCOUNT_RETENTION_PREPARATION = Object.freeze({
  rows: 64,
  bytes: 4 * 1024 * 1024,
  metadataRows: 8192,
});
export const SUPPORT_MEMBERSHIP_PREPARATION = Object.freeze({
  bytes: 4 * 1024 * 1024,
  rows: maximumTemporalPreparationRows,
});
export const accountTables = ['mind_awareness', 'mind_memories', 'mind_summaries'] as const;

export function accountMembershipQueries(world: string) {
  return accountTables.map((table) => {
    const suffix =
      table === 'mind_awareness'
        ? 'awareness'
        : table === 'mind_memories'
          ? 'memories'
          : 'summaries';
    return `SELECT q.key,
      ARRAY(SELECT id FROM unnest(q.aliases) id WHERE t.kind IS DISTINCT FROM 'impression' AND
        (id=t.source_id OR id=t.event_id OR jsonb_exists(t.retention_metadata->'aliases',id))) AS aliases,
      ARRAY(SELECT id FROM unnest(q.individuals) id WHERE id=ANY(t.individual_ids)) AS individuals,
      NULL::text AS page_id,0::bigint AS page_bytes
      FROM requested q JOIN ${table} t ON t.world_id=${world} AND t.actor_id=q.actor_id
      WHERE q.${suffix} AND NOT(t.id=ANY(q.excluded_${suffix})) AND
        (t.source_id=ANY(q.aliases) OR t.event_id=ANY(q.aliases) OR
          jsonb_exists_any(t.retention_metadata->'aliases',q.aliases) OR t.individual_ids && q.individuals)`;
  });
}

/** A stopped native restore already owns its complete prospective rows. Use
 * the same account membership predicates and exclude all recent-page work. */
export function restoreSupportMembershipSql(world: string, actor: string, aliases: string) {
  return `${restoreMembershipQuery(world, actor, aliases, 'ARRAY[]')} SELECT DISTINCT unnest(aliases) FROM proofs`;
}

export function restoreRetentionMembershipSql(
  world: string,
  actor: string,
  aliases: string,
  individuals: string,
) {
  return `${restoreMembershipQuery(world, actor, aliases, individuals)}
    SELECT 'alias' AS kind,unnest(aliases) AS member FROM proofs
    UNION SELECT 'individual',unnest(individuals) FROM proofs`;
}

function restoreMembershipQuery(
  world: string,
  actor: string,
  aliases: string,
  individuals: string,
) {
  return `WITH requested AS MATERIALIZED (
    SELECT 0 AS key,${actor}::text AS actor_id,${aliases}::text[] AS aliases,
      ${individuals}::text[] AS individuals,true AS awareness,true AS memories,true AS summaries,
      ARRAY[]::text[] AS excluded_awareness,ARRAY[]::text[] AS excluded_memories,
      ARRAY[]::text[] AS excluded_summaries
  ), proofs AS (${accountMembershipQueries(world).join(' UNION ALL ')})`;
}

export const indexedTables = [
  ...accountTables,
  'mind_temporal_pages',
  'mind_temporal_supports',
] as const;
export type RetentionTable = (typeof indexedTables)[number];
export interface RetentionRow {
  table: RetentionTable;
  id: string;
  parent: string;
  position: number;
  actorId: string;
  columns: Readonly<Record<string, unknown>>;
  encodedBytes: number;
}

const accountColumns = [
  'actor_id',
  'source_id',
  'at',
  'event_id',
  'kind',
  'individual_ids',
  'logical_bytes',
  'retention_class',
  'retention_reason',
  'policy_priority',
  'active_or_protected',
  'next_due_at',
  'account_revision',
  'retention_metadata',
] as const;
export const selectedColumns: Record<RetentionTable, readonly string[]> = {
  mind_awareness: accountColumns,
  mind_summaries: accountColumns,
  mind_memories: [...accountColumns, 'unresolved', 'expires_at', 'weaken_at'],
  mind_temporal_pages: [
    'actor_id',
    'physical_life',
    'receipt_epoch',
    'first_batch_order',
    'first_entry',
    'first_member',
    'last_batch_order',
    'last_entry',
    'last_member',
    'first_at',
    'last_at',
    'entry_bytes',
    'charge_directory',
    'receipt_count',
    'source_ids',
    'individual_ids',
    'value_refs',
  ],
  mind_temporal_supports: ['actor_id', 'source_id', 'logical_bytes', 'required'],
};
export function retentionProjection(table: RetentionTable, selectionOnly = false) {
  const encoded =
    table === 'mind_temporal_pages'
      ? 't.encoded_bytes'
      : accountTables.includes(table as (typeof accountTables)[number])
        ? 't.logical_bytes'
        : 'octet_length(t.payload)';
  return `SELECT '${table}' AS table_name,t.id,t.parent_id,t.position,t.actor_id,
        jsonb_build_object(${(selectionOnly ? ['actor_id', 'source_id', 'at', 'logical_bytes', 'retention_class', 'policy_priority', 'active_or_protected', 'next_due_at', 'account_revision'] : selectedColumns[table]).flatMap((name) => [`'${name}'`, `t.${name}`]).join(',')}) AS columns,
        ${encoded} AS encoded_bytes`;
}

/** A retention request selects indexed scalar metadata first. Only the
 * selected result may request a bounded body for the actual account. */
export function accountRetentionCandidatesSql(
  table: (typeof accountTables)[number],
  requestValues: string,
  world: string,
  selectionOnly: boolean,
) {
  return `WITH requested(actor_id,at,due,pressured,overridden,changed) AS MATERIALIZED (
          VALUES ${requestValues}
        ), scoped AS (
          ${retentionProjection(table, selectionOnly)},'due'::text AS criterion FROM requested q CROSS JOIN LATERAL (
            SELECT t.* FROM ${table} t WHERE q.due AND t.world_id=${world} AND t.actor_id=q.actor_id
              AND t.retention_class<>'sensory' AND t.active_or_protected=0 AND t.next_due_at<=q.at
              AND NOT(t.id=ANY(q.overridden))
            ORDER BY t.policy_priority,t.at,t.source_id COLLATE "C" LIMIT ${ACCOUNT_RETENTION_PREPARATION.rows + 1}
          ) t
          UNION ALL
          ${retentionProjection(table, selectionOnly)},'pressure'::text AS criterion FROM requested q
          CROSS JOIN LATERAL unnest(q.pressured) pool(kind) CROSS JOIN LATERAL (
            SELECT t.* FROM ${table} t WHERE t.world_id=${world} AND t.actor_id=q.actor_id
              AND t.retention_class=pool.kind AND t.active_or_protected=0 AND NOT(t.id=ANY(q.overridden))
            ORDER BY t.policy_priority,t.at,t.source_id COLLATE "C" LIMIT ${ACCOUNT_RETENTION_PREPARATION.rows + 1}
          ) t
          UNION ALL
          ${retentionProjection(table, selectionOnly)},'changed'::text AS criterion FROM requested q JOIN ${table} t
            ON t.world_id=${world} AND t.actor_id=q.actor_id AND t.id=ANY(q.changed)
          UNION ALL
          SELECT '${table}',NULL::text,NULL::text,NULL::bigint,q.actor_id,
            jsonb_build_object('next_due_at',next.due),0::bigint,'deadline'::text
          FROM requested q CROSS JOIN LATERAL (
            SELECT MIN(t.next_due_at) AS due FROM ${table} t
            WHERE t.world_id=${world} AND t.actor_id=q.actor_id AND t.retention_class<>'sensory'
              AND t.active_or_protected=0 AND t.next_due_at>q.at AND NOT(t.id=ANY(q.overridden))
          ) next
        ) SELECT * FROM scoped`;
}
