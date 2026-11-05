import { temporalBlockExpiredSql } from './temporal-page-storage.js';

/** A retained export is a projection of the committed frontier, not physical
 * collection. Keep unproved/orphaned rows so existing integrity validation fails
 * rather than interpreting corrupt ownership as permission to omit evidence.
 * docs/projects/bookkeeping-simplification-tech-design.md#retained-state-checkpoint-and-recovery */
export function collectibleTemporalBlockSql(block: string): string {
  return `EXISTS (SELECT 1 FROM mind_temporal_actors retained_actor
    WHERE retained_actor.world_id=${block}.world_id
      AND retained_actor.actor_id=${block}.actor_id
      AND ${temporalBlockExpiredSql(block, 'retained_actor')})`;
}

/** Uses belonging only to positively collectible blocks do not keep pooled
 * values alive in an export. Unexpected owner kinds/IDs remain auditable. */
export function retainedReceivedUseSql(use: string): string {
  return `(${use}.owner_kind<>'mind_temporal_pages' OR NOT EXISTS (
    SELECT 1 FROM mind_temporal_pages retained_block
    WHERE retained_block.world_id=${use}.world_id AND retained_block.id=${use}.owner_id
      AND ${collectibleTemporalBlockSql('retained_block')}))`;
}

/** Trusted table/alias vocabulary is supplied by canonical readers, never by a
 * request. These three dependent families must share one captured selection. */
export function retainedEvidenceRowSql(table: string, alias = 't'): string {
  if (table === 'mind_temporal_pages') return `NOT ${collectibleTemporalBlockSql(alias)}`;
  if (table === 'mind_perception_values')
    return `EXISTS (SELECT 1 FROM received_value_uses retained_use
      WHERE retained_use.world_id=${alias}.world_id AND retained_use.value_id=${alias}.source_id
        AND ${retainedReceivedUseSql('retained_use')})`;
  if (table === 'history_perspectives')
    // Seek the one containing physical block through the existing actor/first-
    // coordinate index. Do not expand every old block for every perspective.
    return `NOT EXISTS (SELECT 1 FROM LATERAL (
      SELECT retained_page.world_id,retained_page.actor_id,retained_page.last_at,
        retained_page.last_batch_order,retained_page.last_entry,retained_page.last_member
      FROM mind_temporal_pages retained_page
      WHERE retained_page.world_id=${alias}.world_id AND retained_page.actor_id=${alias}.actor_id
        AND retained_page.physical_life=${alias}.temporal_life
        AND retained_page.receipt_epoch=${alias}.temporal_epoch
        AND (retained_page.first_batch_order,retained_page.first_entry,retained_page.first_member)
          <=(${alias}.temporal_batch_order,${alias}.temporal_entry_index,0)
      ORDER BY retained_page.first_batch_order DESC,retained_page.first_entry DESC,
        retained_page.first_member DESC,retained_page.id DESC LIMIT 1
      ) retained_page
      WHERE (${alias}.temporal_batch_order,${alias}.temporal_entry_index,0)
          <=(retained_page.last_batch_order,retained_page.last_entry,retained_page.last_member)
        AND ${collectibleTemporalBlockSql('retained_page')})`;
  return 'TRUE';
}
