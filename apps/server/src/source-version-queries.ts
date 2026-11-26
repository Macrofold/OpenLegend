import { digest } from './content-digest.js';

export const SOURCE_RETENTION_CLOSURE_ROUNDS = 4;
export type SourceVersionCategory = 'optional' | 'required' | 'speech';
export const sourceVersionPriority = (category: SourceVersionCategory) =>
  category === 'required' ? 2 : category === 'speech' ? 1 : 0;

export const SOURCE_VERSION_TABLES = {
  awareness: 'mind_awareness',
  memory: 'mind_memories',
  summary: 'mind_summaries',
} as const;

type AccountTable = (typeof SOURCE_VERSION_TABLES)[keyof typeof SOURCE_VERSION_TABLES];

export const sourcePredecessorSql = (
  table: AccountTable,
  keys: string,
  world: string,
  textMetadata = false,
) => `
  SELECT t.id,t.parent_id,t.position,t.actor_id,t.source_id,t.account_revision,
    t.retention_metadata${textMetadata ? '::text' : ''},t.retention_class,t.logical_bytes,octet_length(t.payload) AS encoded_bytes
  FROM jsonb_to_recordset(${keys}::jsonb) q(actor_id text,id text)
  JOIN ${table} t ON t.world_id=${world} AND t.actor_id=q.actor_id AND t.id=q.id`;

export const sourceLearningRevisionSql = (table: AccountTable, keys: string, world: string) => `
  SELECT t.actor_id,t.source_id,t.account_revision
  FROM jsonb_to_recordset(${keys}::jsonb) q(actor_id text,source_id text)
  JOIN ${table} t ON t.world_id=${world} AND t.actor_id=q.actor_id AND t.source_id=q.source_id`;

/** Literal references follow privacy withdrawal but do not retain a source body. */
export function sourceDependentClassesSql(
  keys: string,
  owners: string,
  world: string,
  includeOwner = false,
): string {
  const accounts = Object.entries(SOURCE_VERSION_TABLES)
    .map(
      ([kind, table]) =>
        `SELECT '${kind}' AS kind,actor_id,source_id,retention_class FROM ${table} WHERE world_id=${world}`,
    )
    .join(' UNION ALL ');
  return `WITH requested AS (
    SELECT * FROM jsonb_to_recordset(${keys}::jsonb) q(actor_id text,kind text,id text,revision text)
  ), changed AS (SELECT * FROM jsonb_to_recordset(${owners}::jsonb) q(actor_id text,kind text,id text)),
  accounts AS (${accounts})
  SELECT DISTINCT q.actor_id,q.kind,q.id,q.revision,a.retention_class${includeOwner ? ',d.derived_kind,d.derived_id' : ''}
  FROM requested q JOIN mind_source_dependencies d ON d.world_id=${world} AND d.actor_id=q.actor_id
    AND d.source_kind=q.kind AND d.source_id=q.id AND d.source_revision=q.revision
  JOIN accounts a ON a.actor_id=d.actor_id AND a.kind=d.derived_kind AND a.source_id=d.derived_id
  WHERE a.retention_class<>'sensory' AND d.support_key<>'${digest('literal-reference')}'
    AND NOT EXISTS(SELECT 1 FROM changed c WHERE c.actor_id=d.actor_id AND c.kind=d.derived_kind AND c.id=d.derived_id)`;
}

export const sourceArchiveChargesSql = (keys: string, world: string) => `
  SELECT v.actor_id,v.source_kind,v.source_id,v.revision,v.retention_class,v.logical_bytes
  FROM mind_source_versions v JOIN jsonb_to_recordset(${keys}::jsonb) q(actor_id text,kind text,id text,revision text)
  ON v.actor_id=q.actor_id AND v.source_kind=q.kind AND v.source_id=q.id AND v.revision=q.revision
  WHERE v.world_id=${world}`;

export const sourceRetiredBodiesSql = (
  table: AccountTable,
  world: string,
  actor: string,
  ids: string,
) => `
  SELECT id,source_id,account_revision,payload FROM ${table}
  WHERE world_id=${world} AND actor_id=${actor} AND id=ANY(${ids}::text[])`;
