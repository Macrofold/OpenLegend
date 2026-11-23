import { sourceVersionPriority } from './source-version-retention.js';

export const restoreArchiveSelectionRows = 256;

/** A complete stopped installation can prove references from its canonical
 * accounts. The live reader still starts from the existing reverse index. */
export function restoreArchiveSelectionSql(
  input: string,
  world: string,
  source: 'live-index' | 'complete-checkpoint' = 'live-index',
) {
  const sourceJoin = (table: string, kind: string) =>
    source === 'complete-checkpoint'
      ? `JOIN ${table} r ON r.world_id=${world} AND r.actor_id=w.actor_id`
      : `JOIN mind_source_dependencies d ON d.world_id=${world} AND d.actor_id=w.actor_id
        AND d.source_kind=w.kind AND d.source_id=w.id AND d.source_revision=w.revision
      JOIN ${table} r ON r.world_id=d.world_id AND r.actor_id=d.actor_id
        AND r.source_id=d.derived_id AND d.derived_kind='${kind}'`;
  const derived = (table: string, kind: string) => `
      SELECT w.ordinal AS archive_index,r.retention_class FROM wanted w
      ${sourceJoin(table, kind)}
      WHERE ${kind === 'memory' ? "r.kind<>'impression' AND" : ''}
        r.retention_metadata->'versions' @> jsonb_build_array(jsonb_build_object(
          'kind',w.kind,'id',w.id,'revision',w.revision))
        AND NOT EXISTS (SELECT 1 FROM mind_forgotten f WHERE f.world_id=r.world_id
          AND f.actor_id=w.actor_id AND f.source_id=w.id)`;
  // An invalid class sorts first so the consumer still refuses stored damage.
  const ranks = (['optional', 'required', 'speech'] as const)
    .map((category) => `WHEN '${category}' THEN ${sourceVersionPriority(category)}`)
    .join(' ');
  return `
      WITH wanted AS (SELECT * FROM jsonb_to_recordset(${input}::jsonb)
        w(ordinal integer,actor_id text,kind text,id text,revision text))
      SELECT DISTINCT ON (archive_index) archive_index,retention_class FROM (
        ${derived('mind_memories', 'memory')} UNION ALL
        ${derived('mind_summaries', 'summary')}
      ) retained ORDER BY archive_index,CASE retention_class ${ranks} ELSE 3 END DESC`;
}
