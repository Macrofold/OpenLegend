import type { SqlDatabase } from '../../apps/server/src/store.js';
import { eligibleReceivedChargeDirectories, type ReceivedChargeDirectory } from '@open-legend/domain';
import {
  temporalBlockExpiredSql,
  temporalBlockMixedBoundarySql,
  temporalFrontierFromColumns,
} from '../../apps/server/src/temporal-page-storage.js';

/** Explicit workload-boundary diagnostic; never called by gameplay or save admission.
 * SQL aggregates count cold data without loading it into the simulation. */
export async function evidenceStorageStats(db: SqlDatabase, worldId: string) {
  if (!db.readMetadataBaseline)
    throw new Error('Physical storage diagnostics require a durable metadata snapshot.');
  return db.readMetadataBaseline([], async (baseline) => {
    if (baseline.worldId !== worldId)
      throw new Error('Physical storage diagnostic world changed before capture.');
    const tables = [
      'mind_perception_current',
      'mind_perception_attention_annotations',
      'mind_perception_values',
      'mind_temporal_pages',
      'received_value_uses',
    ];
    const relations = await db
      .prepare(
        tables
          .map(
            (table) => `SELECT '${table}' AS name,
      count(*) AS rows, ${table === 'received_value_uses' ? 'NULL' : 'COALESCE(sum(octet_length(payload)),0)'} AS payload_bytes,
      ${table === 'mind_perception_current' ? 'COALESCE(sum(octet_length(metadata)),0)' : table === 'mind_temporal_pages' ? 'COALESCE(sum(octet_length(charge_directory)),0)' : '0::bigint'} AS metadata_bytes,
      pg_relation_size('${table}') AS table_bytes, pg_indexes_size('${table}') AS index_bytes,
      pg_total_relation_size('${table}') AS total_bytes,
      (SELECT CASE WHEN reltoastrelid=0 THEN 0 ELSE pg_total_relation_size(reltoastrelid) END
        FROM pg_class WHERE oid='${table}'::regclass) AS toast_bytes
      FROM ${table} WHERE world_id=?`,
          )
          .join(' UNION ALL '),
      )
      .all(...tables.map(() => worldId));
    const captured = await db
      .prepare(
        `WITH candidates AS MATERIALIZED (
          SELECT octet_length(p.payload) AS bytes,NOT EXISTS(
            SELECT 1 FROM received_value_uses u WHERE u.world_id=p.world_id AND u.value_id=p.source_id) AS unowned
          FROM mind_perception_values p WHERE p.world_id=? AND p.gc_candidate_seq IS NOT NULL
        ), blocks AS MATERIALIZED (
          SELECT p.encoded_bytes AS bytes,${temporalBlockExpiredSql('p', 'a')} AS expired,
            (p.first_at<=a.expired_through_time OR
              (p.first_batch_order,p.first_entry,p.first_member)<=
              (a.pressure_batch_order,a.pressure_entry,a.pressure_member)) IS TRUE AS intersects
          FROM mind_temporal_pages p JOIN mind_temporal_actors a ON a.world_id=p.world_id AND a.actor_id=p.actor_id
          WHERE p.world_id=?
        ) SELECT
      (SELECT count(*) FROM candidates) AS queued_candidate_values,
      (SELECT COALESCE(sum(bytes),0) FROM candidates) AS queued_candidate_value_bytes,
      (SELECT count(*) FROM candidates WHERE unowned) AS unowned_candidate_values,
      (SELECT COALESCE(sum(bytes),0) FROM candidates WHERE unowned) AS unowned_candidate_value_bytes,
      (SELECT count(*) FROM blocks WHERE expired) AS collectible_blocks,
      (SELECT COALESCE(sum(bytes),0) FROM blocks WHERE expired) AS collectible_block_payload_bytes,
      (SELECT count(*) FROM blocks WHERE intersects AND NOT expired) AS partial_blocks,
      (SELECT COALESCE(sum(bytes),0) FROM blocks WHERE intersects AND NOT expired) AS partial_block_payload_bytes,
      (SELECT revision FROM world_head WHERE world_id=?) AS revision,
      pg_current_wal_insert_lsn()::text AS wal_insert_lsn`,
      )
      .get(worldId, worldId, worldId);
    if (!captured) throw new Error('Physical storage diagnostic lost its durable snapshot.');
    const debt = {
      ...captured,
      collectible_blocks: Number(captured['collectible_blocks']),
      collectible_block_payload_bytes: Number(captured['collectible_block_payload_bytes']),
      partial_blocks: Number(captured['partial_blocks']),
      partial_block_payload_bytes: Number(captured['partial_block_payload_bytes']),
      mixed_boundaries_examined: 0,
    };
    // Scalar envelopes are sufficient for most blocks. Reuse the collector's
    // exact metadata proof where age and pressure can jointly exhaust a block.
    let after: string | undefined;
    for (;;) {
      const boundaries = await db.prepare(`SELECT p.id,p.encoded_bytes,p.charge_directory,
          a.expired_through_time,a.pressure_batch_order,a.pressure_entry,a.pressure_member,a.pressure_at,a.pressure_order
        FROM mind_temporal_pages p JOIN mind_temporal_actors a ON a.world_id=p.world_id AND a.actor_id=p.actor_id
        WHERE p.world_id=? AND ${temporalBlockMixedBoundarySql('p', 'a')} ${after ? 'AND p.id>?' : ''}
        ORDER BY p.id LIMIT 128`).all(worldId, ...(after ? [after] : []));
      for (const row of boundaries) {
        debt.mixed_boundaries_examined++;
        const directory = JSON.parse(String(row['charge_directory'])) as ReceivedChargeDirectory;
        if (eligibleReceivedChargeDirectories([directory], temporalFrontierFromColumns(row)).length) continue;
        const bytes = Number(row['encoded_bytes']);
        debt.collectible_blocks++; debt.collectible_block_payload_bytes += bytes;
        debt.partial_blocks--; debt.partial_block_payload_bytes -= bytes;
      }
      if (boundaries.length < 128) break;
      after = String(boundaries.at(-1)!['id']);
    }
    return {
      scope:
        'Durable PostgreSQL snapshot at an explicit workload boundary; relation/index sizes include reusable space. Collectible blocks are wholly ineligible under saved frontiers; partial-block payload is occupied boundary storage, not wholly reclaimable debt. Queued pooled-value candidates may remain owned; unowned candidates can still have protected pending references. WAL position is cluster-wide, not exclusive game WAL attribution.',
      relations,
      debt,
    };
  });
}
