import { EXPERIENCE_LIMITS } from '@open-legend/domain';
import { enqueueLexicalSql } from './lexical-projection.js';
import { derivedChargeSql } from './memory-derivatives.js';

export const MAINTENANCE_SOURCES = 128;
export const MAINTENANCE_BYTES = 512 * 1024;

export const MEMORY_SOURCE_ELIGIBILITY = `r.retention_class='memory' AND NOT EXISTS (SELECT 1 FROM mind_forgotten f WHERE f.world_id=r.world_id AND f.actor_id=r.actor_id AND (f.source_id=r.id OR f.source_id=r.event_id))
    AND (r.source_kind<>'memory' OR ((r.memory_kind='impression' OR r.memory_kind='commitment' OR (r.memory_kind='episode' AND r.acquisition<>'inferred'))
      AND NOT (r.memory_kind='episode' AND r.event_id IS NOT NULL AND EXISTS (SELECT 1 FROM recall_sources a WHERE a.world_id=r.world_id AND a.actor_id=r.actor_id AND a.source_kind='awareness' AND a.id=r.event_id))))
    AND (r.source_kind<>'summary' OR NOT EXISTS (
      SELECT 1 FROM mind_source_dependencies s WHERE s.world_id=r.world_id AND s.actor_id=r.actor_id AND s.derived_kind=r.source_kind AND s.derived_id=r.id AND
      (EXISTS (SELECT 1 FROM mind_forgotten f WHERE f.world_id=s.world_id AND f.actor_id=s.actor_id AND (f.source_id=s.source_id OR f.source_id=s.alias_id))
       OR EXISTS (SELECT 1 FROM mind_corrections c WHERE c.world_id=s.world_id AND c.actor_id=s.actor_id AND (c.source_id=s.source_id OR c.source_id=s.alias_id)))))`;
export const MEMORY_SOURCE_TABLES = {
  awareness: 'mind_awareness',
  memory: 'mind_memories',
  summary: 'mind_summaries',
} as const;

// Payload/text bodies must not leak into metadata selection before byte admission.
export const RECALL_SOURCE_COLUMNS = [
  'world_id',
  'actor_id',
  'id',
  'source_kind',
  'record_id',
  'revision',
  'event_id',
  'memory_kind',
  'acquisition',
  'event_type',
  'at',
  'importance',
  'required',
  'eligible',
  'sequence',
];
export const recallSourceColumns = RECALL_SOURCE_COLUMNS.map((name) => `r.${name}`).join(',');

function consolidationRecentSpeechSql(world: string, actor: string): string {
  // Reuse the admitted dialogue flag. Exact speech bodies can preserve UTF-16
  // code units PostgreSQL cannot decode, and this selection needs no text.
  return `SELECT s.id FROM recall_sources s
    WHERE s.world_id=${world} AND s.actor_id=${actor} AND s.eligible=1 AND s.source_kind='awareness'
      AND s.event_type='speech' AND s.linguistic=1
    ORDER BY s.at DESC,s.sequence DESC,s.id DESC LIMIT ${EXPERIENCE_LIMITS.conversationSpeech}`;
}

/** Only routine eligible evidence can anchor hourly work. Important accounts
 * in that batch stay as boundaries between routine groups. */
export function consolidationAnchorSql(scope: string, cutoff: string, speech: [string, string]) {
  return `SELECT r.at,r.sequence,r.id FROM recall_sources r
    WHERE ${scope} AND r.at<=${cutoff} AND r.importance<${EXPERIENCE_LIMITS.protectedImportance}
      AND (r.source_kind='awareness' OR r.memory_kind='episode')
      AND r.id NOT IN (${consolidationRecentSpeechSql(...speech)})
    ORDER BY r.at,r.sequence,r.id LIMIT 1`;
}

/** Chronological metadata only. The source owner must admit complete bodies
 * before loading them. A daily partition keeps its original revision ceiling. */
export function consolidationSourceSql(input: {
  scope: string;
  from: string;
  to: string;
  after: [string, string, string];
  speech: [string, string];
  limit: string;
  dailyRevision?: [string, string, string];
  fields?: string;
}) {
  const {
    scope,
    from,
    to,
    after,
    speech,
    limit,
    dailyRevision,
    fields = recallSourceColumns,
  } = input;
  const daily = dailyRevision !== undefined;
  const payload = Object.entries(MEMORY_SOURCE_TABLES)
    .map(
      ([kind, table]) =>
        `WHEN '${kind}' THEN (SELECT octet_length(payload) FROM ${table} t WHERE t.world_id=r.world_id AND t.id=r.record_id)`,
    )
    .join(' ');
  return `SELECT ${fields}, CASE r.source_kind ${payload} END AS payload_bytes FROM recall_sources r
    WHERE ${scope}
      AND NOT (r.source_kind='awareness' AND r.importance>=${EXPERIENCE_LIMITS.protectedImportance} AND EXISTS (
        SELECT 1 FROM recall_place_capsules p WHERE p.world_id=r.world_id AND p.actor_id=r.actor_id
          AND p.owner_id=r.id AND p.owner_kind=r.source_kind AND p.owner_revision=r.revision))
      AND r.at>=${from} AND r.at${daily ? '<' : '<='}${to}
      AND (r.at,r.sequence,r.id) ${daily ? '>' : '>='} (${after.join(',')})
      AND (r.source_kind='awareness' OR r.memory_kind='episode'${daily ? " OR r.source_kind='summary'" : ''})
      AND r.id NOT IN (${consolidationRecentSpeechSql(...speech)})
      ${
        dailyRevision
          ? `AND EXISTS (
        SELECT 1 FROM mind_memories m WHERE r.source_kind='memory' AND m.world_id=r.world_id AND m.id=r.record_id AND m.revision<=${dailyRevision[0]}
        UNION ALL SELECT 1 FROM mind_awareness a WHERE r.source_kind='awareness' AND a.world_id=r.world_id AND a.id=r.record_id AND a.revision<=${dailyRevision[1]}
        UNION ALL SELECT 1 FROM mind_summaries s WHERE r.source_kind='summary' AND s.world_id=r.world_id AND s.id=r.record_id AND s.revision<=${dailyRevision[2]})`
          : ''
      }
    ORDER BY r.at,r.sequence,r.id LIMIT ${limit}`;
}
/** Current recall rows and their lexical admission are one statement. The
 * stand-alone release uses this same trusted SQL with typed parameter markers. */
export function memoryProjectionSql(hardBytes: string, input = '?'): string {
  const columns = [
    ...RECALL_SOURCE_COLUMNS,
    'search_text',
    'linguistic',
    'payload_bytes',
    'retention_class',
  ];
  const sourceKeys = ['world_id', 'actor_id', 'id', 'source_kind']
    .map((field) => `octet_length(r.${field})`)
    .join('+');
  const pendingCharge = `2*(${sourceKeys})+octet_length(r.revision)+(SELECT octet_length(generation) FROM world_head WHERE id=1)+768`;
  const admission = `COALESCE((SELECT bytes FROM memory_derived_usage u WHERE u.world_id=r.world_id AND u.actor_id=r.actor_id),0)
    +SUM(${derivedChargeSql('text', 'r')}+CASE WHEN r.search_text='' THEN 0 ELSE ${pendingCharge} END)
      OVER(PARTITION BY r.world_id,r.actor_id ORDER BY r.id,r.source_kind ROWS UNBOUNDED PRECEDING)<=${hardBytes}`;
  const projection = columns.map((name) =>
    name === 'eligible'
      ? `CASE WHEN ${MEMORY_SOURCE_ELIGIBILITY} THEN 1 ELSE 0 END`
      : name === 'search_text'
        ? `CASE WHEN ${admission} THEN r.search_text ELSE '' END`
        : `r.${name}`,
  );
  return `WITH input_sources AS MATERIALIZED (SELECT * FROM jsonb_populate_recordset(NULL::recall_sources,${input}::jsonb)),
changed_rows AS (INSERT INTO recall_sources(${columns.join(',')})
SELECT ${projection.join(',')} FROM input_sources r
RETURNING world_id,actor_id,id,source_kind,revision,search_text),
changed AS (SELECT c.*,i.search_text<>'' AS lexical_expected FROM changed_rows c JOIN input_sources i
  ON i.world_id=c.world_id AND i.actor_id=c.actor_id AND i.id=c.id AND i.source_kind=c.source_kind)
${enqueueLexicalSql('changed', false)}`;
}

/** Use the canonical affected-source closure for either typed SQL caller.
 * Fresh rows already have insertion-time eligibility; existing dependents are
 * evaluated once and share their decided state with vector/queue maintenance. */
export function memoryReconciliationSql(input: string, world = '?'): string {
  const cte = `WITH changed(actor_id,id,fresh_kind) AS (${input}),
    affected AS MATERIALIZED (SELECT actor_id,id FROM changed WHERE fresh_kind IS NULL
      UNION SELECT r.actor_id,r.id FROM changed c CROSS JOIN recall_sources r
        WHERE r.world_id=${world} AND r.actor_id=c.actor_id
        AND (r.event_id=c.id OR (c.fresh_kind IS NOT NULL AND r.id=c.id AND r.source_kind<>c.fresh_kind))
        AND NOT (c.fresh_kind IS NOT NULL AND r.id=c.id AND r.source_kind=c.fresh_kind)
      UNION SELECT s.actor_id,s.derived_id FROM changed c CROSS JOIN mind_source_dependencies s WHERE s.world_id=${world} AND s.actor_id=c.actor_id AND (s.source_id=c.id OR s.alias_id=c.id))`;
  const target = '(r.actor_id,r.id) IN (SELECT actor_id,id FROM affected)';
  return `${cte}, desired AS MATERIALIZED (
SELECT r.world_id,r.actor_id,r.id,r.source_kind,r.revision,r.importance,r.at,
  CASE WHEN ${MEMORY_SOURCE_ELIGIBILITY} THEN 1 ELSE 0 END AS next_eligible
FROM recall_sources r WHERE r.world_id=${world} AND ${target}
UNION ALL
SELECT r.world_id,r.actor_id,r.id,r.source_kind,r.revision,r.importance,r.at,r.eligible AS next_eligible
FROM changed c JOIN recall_sources r ON r.actor_id=c.actor_id AND r.id=c.id AND r.source_kind=c.fresh_kind
WHERE r.world_id=${world} AND c.fresh_kind IS NOT NULL AND NOT EXISTS (SELECT 1 FROM affected a WHERE a.actor_id=c.actor_id AND a.id=c.id)
        ), updated AS (
UPDATE recall_sources r SET eligible=d.next_eligible FROM desired d
WHERE r.world_id=d.world_id AND r.actor_id=d.actor_id AND r.id=d.id AND r.source_kind=d.source_kind
AND r.eligible<>d.next_eligible
        ), discarded_vectors AS (
DELETE FROM memory_vectors v WHERE v.world_id=${world} AND (v.actor_id,v.source_id) IN (SELECT actor_id,id FROM affected)
AND NOT EXISTS (SELECT 1 FROM desired d WHERE d.actor_id=v.actor_id AND d.id=v.source_id AND d.revision=v.source_revision AND d.next_eligible=1)
        ), wanted AS MATERIALIZED (
SELECT r.world_id,r.actor_id,r.id AS source_id,r.revision AS source_revision,m.model,m.dimensions,r.importance,r.at
FROM desired r JOIN memory_index_models m ON m.world_id=r.world_id AND m.actor_id=r.actor_id
WHERE r.next_eligible=1
AND NOT EXISTS (SELECT 1 FROM memory_vectors v WHERE v.world_id=r.world_id AND v.actor_id=r.actor_id AND v.source_id=r.id AND v.source_revision=r.revision AND v.model=m.model AND v.dimensions=m.dimensions)
AND NOT EXISTS (SELECT 1 FROM memory_index_attempts a WHERE a.world_id=r.world_id AND a.actor_id=r.actor_id AND a.source_id=r.id AND a.source_revision=r.revision AND a.model=m.model AND a.dimensions=m.dimensions)
        ), discarded_queue AS (
DELETE FROM memory_index_queue q WHERE q.world_id=${world} AND (q.actor_id,q.source_id) IN (SELECT actor_id,id FROM affected)
AND NOT EXISTS (SELECT 1 FROM wanted w WHERE w.actor_id=q.actor_id AND w.source_id=q.source_id AND w.model=q.model AND w.dimensions=q.dimensions)
        ) INSERT INTO memory_index_queue SELECT * FROM wanted
        ON CONFLICT (world_id,actor_id,source_id,model,dimensions) DO UPDATE
        SET source_revision=excluded.source_revision,importance=excluded.importance,at=excluded.at
        WHERE (memory_index_queue.source_revision,memory_index_queue.importance,memory_index_queue.at)
IS DISTINCT FROM (excluded.source_revision,excluded.importance,excluded.at)`;
}

/** Reattach cached vectors only for exact eligible accounts in the current
 * generation. The database computes and enforces the per-actor derived charge
 * without hydrating vector bodies on the host. Call inside the source write. */
export function memoryVectorReuseSql(world: string, hardBytes: string, selection = ''): string {
  return `WITH candidates AS MATERIALIZED (
    SELECT c.world_id,c.actor_id,h.generation,c.source_id,c.source_revision,c.model,c.dimensions,c.embedding::public.vector AS embedding
    FROM recall_sources r JOIN memory_vector_cache c ON c.world_id=r.world_id AND c.actor_id=r.actor_id AND c.source_id=r.id AND c.source_revision=r.revision
    JOIN world_head h ON h.world_id=r.world_id
    WHERE r.world_id=${world} AND r.eligible=1${selection}
      AND NOT EXISTS (SELECT 1 FROM memory_vectors v WHERE v.world_id=c.world_id AND v.actor_id=c.actor_id AND v.source_id=c.source_id AND v.model=c.model AND v.dimensions=c.dimensions AND v.generation=h.generation AND v.source_revision=c.source_revision)
  ), sized AS (
    SELECT candidate.*,SUM(${derivedChargeSql('vector', 'candidate')}) OVER(PARTITION BY world_id,actor_id ORDER BY source_id,model,dimensions ROWS UNBOUNDED PRECEDING) AS charge
    FROM candidates candidate
  ) INSERT INTO memory_vectors
    SELECT world_id,actor_id,generation,source_id,source_revision,model,dimensions,embedding FROM sized s
    WHERE COALESCE((SELECT bytes FROM memory_derived_usage u WHERE u.world_id=s.world_id AND u.actor_id=s.actor_id),0)+s.charge<=${hardBytes}
    ON CONFLICT(world_id,actor_id,source_id,model,dimensions) DO UPDATE SET generation=excluded.generation,source_revision=excluded.source_revision,embedding=excluded.embedding
    WHERE (memory_vectors.generation,memory_vectors.source_revision) IS DISTINCT FROM (excluded.generation,excluded.source_revision)`;
}

/** Remove only queued versions the same transaction made searchable. */
export function memoryVectorReuseQueueSql(world: string, selection = ''): string {
  return `DELETE FROM memory_index_queue q WHERE q.world_id=${world}${selection}
  AND EXISTS (SELECT 1 FROM memory_vectors v
    WHERE v.world_id=q.world_id AND v.actor_id=q.actor_id AND v.source_id=q.source_id AND v.source_revision=q.source_revision AND v.model=q.model AND v.dimensions=q.dimensions)`;
}
