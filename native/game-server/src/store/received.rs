//! The SQL reverse index follows actual canonical value references. It never
//! grants permission to use an account and never publishes before COMMIT.

use super::{Store, StoreError, StoreResult};
use openlegend_simulation::records::ChangedRows;
use std::collections::HashSet;
use tokio_postgres::{GenericClient, Transaction};

const OWNERS_PER_BATCH: usize = 800;

impl Store {
    pub(crate) async fn project_received(
        &self,
        transaction: &Transaction<'_>,
        world: &str,
        revision: i64,
        changes: &ChangedRows,
    ) -> StoreResult<()> {
        for table in &self.schema.received_value_owners {
            let writes = changes
                .writes
                .get(table)
                .into_iter()
                .flatten()
                .filter(|row| row.received_uses_changed != Some(false))
                .map(|row| row.id.as_str());
            let deletes = changes
                .deletes
                .get(table)
                .into_iter()
                .flatten()
                .map(String::as_str);
            let mut selected = writes.chain(deletes);
            let mut ids = Vec::with_capacity(OWNERS_PER_BATCH);
            loop {
                ids.clear();
                ids.extend(selected.by_ref().take(OWNERS_PER_BATCH));
                if ids.is_empty() {
                    break;
                }
                let bound = ids
                    .iter()
                    .try_fold(8192usize, |n, id| n.checked_add(24 + id.len()))
                    .and_then(|n| n.checked_mul(2))
                    .ok_or(StoreError::Capacity)?;
                let _input = self
                    .budget
                    .reserve(bound)
                    .map_err(|_| StoreError::Capacity)?;
                // Rebind only the explicitly changed owner IDs, after their same
                // canonical writes. Deleted rows have no desired uses.
                let sql = format!(
                    "WITH desired AS MATERIALIZED (SELECT p.id,p.actor_id,v.value_id \
                      FROM {table} p CROSS JOIN LATERAL unnest(p.value_refs) v(value_id) \
                      WHERE p.world_id=$1 AND p.id=ANY($3)), \
                      removed AS (DELETE FROM received_value_uses u \
                        WHERE u.world_id=$1 AND u.owner_kind=$2 AND u.owner_id=ANY($3) \
                          AND NOT EXISTS (SELECT 1 FROM desired d WHERE d.id=u.owner_id AND d.value_id=u.value_id) \
                        RETURNING u.value_id), \
                      nominated AS (UPDATE mind_perception_values p SET gc_candidate_seq=$4 \
                        WHERE p.world_id=$1 AND p.gc_candidate_seq IS NULL \
                          AND p.source_id IN (SELECT value_id FROM removed)) \
                      INSERT INTO received_value_uses \
                      SELECT $1,$2,d.id,d.actor_id,d.value_id FROM desired d ON CONFLICT DO NOTHING"
                );
                transaction
                    .execute(&sql, &[&world, &table, &ids, &revision])
                    .await?;
            }
        }
        // A removed structural parent may cascade additional received owners.
        // Only those actors need repair. Never enumerate unrelated evidence.
        let removed = [("mind_perception_owners", 2), ("mind_temporal_actors", 4)];
        let parents = removed.iter().flat_map(|(table, index)| {
            changes
                .deletes
                .get(*table)
                .into_iter()
                .flatten()
                .map(move |id| (id, *index))
        });
        let mut actors = HashSet::new();
        let mut custody = self.budget.reserve(0).map_err(|_| StoreError::Capacity)?;
        for (id, index) in parents {
            custody
                .resize(
                    custody
                        .bytes()
                        .checked_add(id.len().checked_mul(16).ok_or(StoreError::Capacity)? + 256)
                        .ok_or(StoreError::Capacity)?,
                )
                .map_err(|_| StoreError::Capacity)?;
            let path: Vec<String> =
                serde_json::from_str(id).map_err(|_| StoreError::InvalidRecord)?;
            actors.insert(
                path.into_iter()
                    .nth(index)
                    .ok_or(StoreError::InvalidRecord)?,
            );
        }
        let actors: Vec<_> = actors.into_iter().collect();
        for chunk in actors.chunks(OWNERS_PER_BATCH) {
            for table in &self.schema.received_value_owners {
                let sql = format!(
                    "WITH removed AS (DELETE FROM received_value_uses u \
                 WHERE u.world_id=$1 AND u.owner_kind=$2 AND u.actor_id=ANY($3) \
                 AND NOT EXISTS(SELECT 1 FROM {table} p WHERE p.world_id=u.world_id AND p.id=u.owner_id) \
                 RETURNING u.value_id) UPDATE mind_perception_values p SET gc_candidate_seq=$4 \
                   WHERE p.world_id=$1 AND p.gc_candidate_seq IS NULL \
                   AND p.source_id IN(SELECT value_id FROM removed)"
                );
                transaction
                    .execute(&sql, &[&world, &table, &chunk, &revision])
                    .await?;
            }
        }
        if let Some(values) = changes.writes.get("mind_perception_values") {
            for rows in values.chunks(OWNERS_PER_BATCH) {
                let bytes = rows
                    .iter()
                    .try_fold(8192usize, |n, row| n.checked_add(96 + 8 * row.id.len()))
                    .ok_or(StoreError::Capacity)?;
                let _input = self
                    .budget
                    .reserve(bytes)
                    .map_err(|_| StoreError::Capacity)?;
                let ids = rows
                    .iter()
                    .map(|row| {
                        let path: Vec<String> =
                            serde_json::from_str(&row.id).map_err(|_| StoreError::InvalidRecord)?;
                        path.into_iter().last().ok_or(StoreError::InvalidRecord)
                    })
                    .collect::<StoreResult<Vec<_>>>()?;
                transaction.execute(
                    "UPDATE mind_perception_values p SET gc_candidate_seq=$2 \
                     WHERE p.world_id=$1 AND p.source_id=ANY($3) AND NOT EXISTS \
                     (SELECT 1 FROM received_value_uses u WHERE u.world_id=p.world_id AND u.value_id=p.source_id)",
                    &[&world,&revision,&ids],
                ).await?;
            }
        }
        Ok(())
    }

    /// Validate only at cold adoption. This compares physically retained rows;
    /// a logical expiry alone cannot remove references from a surviving page.
    pub(crate) async fn validate_received(
        &self,
        client: &impl GenericClient,
        world: &str,
    ) -> StoreResult<()> {
        let expected = self.expected_received_uses();
        let sql = format!(
            "WITH expected AS MATERIALIZED ({expected}), actual AS MATERIALIZED \
            (SELECT * FROM received_value_uses WHERE world_id=$1) \
            SELECT 1 FROM ((SELECT * FROM expected EXCEPT SELECT * FROM actual) UNION ALL \
              (SELECT * FROM actual EXCEPT SELECT * FROM expected)) mismatch LIMIT 1"
        );
        if client.query_opt(&sql, &[&world]).await?.is_some() {
            return Err(StoreError::InvalidRecord);
        }
        Ok(())
    }

    /// Restore owns a complete canonical replacement and has no surviving
    /// reverse index to update incrementally. Rebuild inside that transaction.
    pub(super) async fn rebuild_received(
        &self,
        transaction: &Transaction<'_>,
        world: &str,
        revision: i64,
    ) -> StoreResult<()> {
        transaction
            .execute(
                "DELETE FROM received_value_uses WHERE world_id=$1",
                &[&world],
            )
            .await?;
        let expected = self.expected_received_uses();
        let insert = format!("INSERT INTO received_value_uses {expected} ON CONFLICT DO NOTHING");
        transaction.execute(&insert, &[&world]).await?;
        transaction
            .execute(
                "UPDATE mind_perception_values SET gc_candidate_seq=$2 WHERE world_id=$1",
                &[&world, &revision],
            )
            .await?;
        Ok(())
    }

    fn expected_received_uses(&self) -> String {
        self.schema
            .received_value_owners
            .iter()
            .map(|table| {
                format!(
                    "SELECT p.world_id,'{table}',p.id,p.actor_id,v.id FROM {table} p \
            CROSS JOIN LATERAL unnest(p.value_refs) v(id) WHERE p.world_id=$1"
                )
            })
            .collect::<Vec<_>>()
            .join(" UNION ")
    }
}
