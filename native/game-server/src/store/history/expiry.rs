//! Natural sensory expiry removes the exact current awareness and its SQL
//! projections. This transaction has no authority to edit a retained memory,
//! forgive a correction or remove another actor's copy of the occurrence.

use super::*;
use openlegend_simulation::encoding::json_record;
use openlegend_simulation::experience::SensoryExpiration;
use serde::Serialize;
use std::collections::BTreeMap;

const TABLE: &str = "mind_awareness";
const BATCH: usize = 128;

pub(super) fn missing_proof(changes: &ChangedRows, history: &RuntimeHistory) -> bool {
    changes.deletes.get(TABLE).is_some_and(|ids| {
        ids.iter().any(|id| {
            !history
                .sensory_expirations()
                .iter()
                .any(|record| record.row_id == *id)
        })
    })
}

#[derive(Serialize)]
struct Selected<'a> {
    row_id: &'a str,
    actor_id: &'a str,
    event_id: &'a str,
    revision: &'a str,
}

impl Store {
    pub(super) async fn expire_sensory(
        &self,
        transaction: &Transaction<'_>,
        save: &SaveRows,
        histories: &[RuntimeHistory],
    ) -> StoreResult<()> {
        let Some(deleted) = save.changes.deletes.get(TABLE) else {
            return Ok(());
        };
        let count = histories
            .iter()
            .try_fold(0usize, |n, history| {
                n.checked_add(history.sensory_expirations().len())
            })
            .ok_or(StoreError::Capacity)?;
        let _selection = self
            .budget
            .reserve(count.checked_mul(192).ok_or(StoreError::Capacity)?)
            .map_err(|_| StoreError::Capacity)?;
        let mut selected = BTreeMap::<&str, &SensoryExpiration>::new();
        for history in histories {
            for expiry in history.sensory_expirations() {
                selected.insert(&expiry.row_id, expiry);
            }
        }
        let world = save.world_id.as_str();
        for batch in deleted.chunks(BATCH) {
            let owned = batch.iter().map(|id| {
                selected
                    .get(id.as_str())
                    .copied()
                    .ok_or(StoreError::DerivedProjectionRequired)
            });
            let records = owned.collect::<StoreResult<Vec<_>>>()?;
            let bytes = records
                .iter()
                .try_fold(8192usize, |n, row| {
                    n.checked_add(row.row_id.len())?
                        .checked_add(row.actor_id.len())?
                        .checked_add(row.event_id.len())?
                        .checked_add(row.revision.len())?
                        .checked_add(2048)
                })
                .and_then(|n| n.checked_mul(8))
                .ok_or(StoreError::Capacity)?;
            let _wired = self
                .budget
                .reserve(bytes)
                .map_err(|_| StoreError::Capacity)?;
            let rows = records
                .iter()
                .map(|row| Selected {
                    row_id: &row.row_id,
                    actor_id: &row.actor_id,
                    event_id: &row.event_id,
                    revision: &row.revision,
                })
                .collect::<Vec<_>>();
            let body = json_record(&rows).map_err(|_| StoreError::InvalidRecord)?;
            let matches: bool = transaction.query_one(
                "WITH offered AS MATERIALIZED (
                   SELECT * FROM jsonb_to_recordset($2::text::jsonb) AS q(row_id text,actor_id text,event_id text,revision text)
                 ), matching AS MATERIALIZED (
                   SELECT q.* FROM offered q JOIN mind_awareness a ON a.world_id=$1 AND a.id=q.row_id
                   AND a.actor_id=q.actor_id AND a.source_id=q.event_id AND a.account_revision=q.revision AND a.retention_class='sensory'
                 ), checked AS MATERIALIZED (
                   SELECT (SELECT count(*) FROM matching)=(SELECT count(*) FROM offered) AS valid
                 ), accepted AS MATERIALIZED (SELECT * FROM matching WHERE (SELECT valid FROM checked)),
                 removed_dependencies AS (DELETE FROM mind_source_dependencies d USING accepted a
                    WHERE d.world_id=$1 AND d.actor_id=a.actor_id AND d.derived_kind='awareness' AND d.derived_id=a.event_id),
                 removed_history AS (DELETE FROM history_perspectives h USING accepted a
                    WHERE h.world_id=$1 AND h.actor_id=a.actor_id AND h.event_id=a.event_id)
                 SELECT valid FROM checked", &[&world,&body],
             ).await?.try_get(0)?;
            if !matches {
                return Err(StoreError::StaleCut);
            }
            let actors: Vec<_> = rows.iter().map(|row| row.actor_id).collect();
            let events: Vec<_> = rows.iter().map(|row| row.event_id).collect();
            transaction
                .query_opt(&self.schema.lexical.remove_awareness, &[&world, &batch])
                .await?;
            transaction
                .execute(&self.schema.recall.reconcile, &[&world, &actors, &events])
                .await?;
            let mut compactions = BTreeMap::new();
            for actor in actors {
                if !compactions.contains_key(actor) {
                    let pair =
                        json_record(&[world, actor]).map_err(|_| StoreError::InvalidRecord)?;
                    compactions
                        .insert(actor, format!("integration:conversation-compaction:{pair}"));
                }
            }
            let compactions: Vec<_> = compactions.into_values().collect();
            transaction
                .execute(
                    "DELETE FROM meta WHERE key=ANY($1::text[])",
                    &[&compactions],
                )
                .await?;
        }
        Ok(())
    }
}
