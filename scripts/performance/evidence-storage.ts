import type { SqlDatabase } from '../../apps/server/src/store.js';

/** Explicit post-workload diagnostic; never called by gameplay or save admission.
 * SQL aggregates count cold data without loading it into the simulation. */
export async function evidenceStorageStats(db: SqlDatabase, worldId: string) {
  const read = db.readTransaction?.bind(db) ?? db.transaction.bind(db);
  return read(async () => {
    const tables = [
      'mind_perception_current',
      'mind_perception_attention_annotations',
      'mind_perception_values',
      'mind_temporal_chunks',
      'mind_temporal_segments',
      'received_value_uses',
    ];
    const relations = await db
      .prepare(
        tables
          .map(
            (table) => `SELECT '${table}' AS name,
      count(*) AS rows, ${table === 'received_value_uses' ? 'NULL' : 'COALESCE(sum(octet_length(payload)),0)'} AS payload_bytes,
      pg_relation_size('${table}') AS table_bytes, pg_indexes_size('${table}') AS index_bytes
      FROM ${table} WHERE world_id=?`,
          )
          .join(' UNION ALL '),
      )
      .all(...tables.map(() => worldId));
    const debt = await db
      .prepare(
        `SELECT
      (SELECT count(*) FROM mind_perception_values WHERE world_id=? AND gc_candidate_seq IS NOT NULL) AS candidate_values,
      (SELECT COALESCE(sum(octet_length(payload)),0) FROM mind_perception_values WHERE world_id=? AND gc_candidate_seq IS NOT NULL) AS candidate_value_bytes,
      (SELECT count(*) FROM mind_temporal_chunks WHERE world_id=? AND retired_revision IS NOT NULL) AS retired_chunks,
      (SELECT COALESCE(sum(octet_length(payload)+COALESCE((payload::json#>>'{storage,segmentBytes}')::bigint,0)),0)
        FROM mind_temporal_chunks WHERE world_id=? AND retired_revision IS NOT NULL) AS retired_chunk_bytes,
      (SELECT revision FROM world_head WHERE world_id=?) AS revision,
      pg_current_wal_insert_lsn()::text AS wal_insert_lsn`,
      )
      .get(worldId, worldId, worldId, worldId, worldId);
    return {
      scope:
        'Durable PostgreSQL snapshot after the workload; relation/index sizes include reusable space. WAL position is cluster-wide, not exclusive game WAL attribution.',
      relations,
      debt,
    };
  });
}
