//! Replay the actual inactive candidate's selected archive baseline before
//! answering a later version question. Rollback keeps the outer staged rows.

use super::archives::{Archive, Category};
use crate::store::read::admitted_query;
use crate::store::{DurableHead, Store, StoreError, StoreResult, ordinal, sql_ordinal};
use openlegend_simulation::received::{AccountClass, SourceVersionArchiveChange};
use std::collections::BTreeMap;
use tokio_postgres::Transaction;

impl Store {
    /// Place the selected original archive identities in the existing checkpoint
    /// transaction. The borrowed selection owns the private read's custody.
    pub(crate) async fn apply_checkpoint_archive_selection<'a>(
        &self,
        tx: &Transaction<'_>,
        head: &DurableHead,
        count: usize,
        selection: impl Iterator<Item = (&'a Archive, Category)>,
    ) -> StoreResult<()> {
        // The caller already owns the exact archive bodies. Admit only the
        // borrowed ordered lookup and its node backing before indexing them.
        let bytes = count.checked_mul(2 * (size_of::<[&str; 4]>() + 6 * size_of::<usize>()))
            .ok_or(StoreError::Capacity)?;
        let _lookup = self.budget.reserve(bytes).map_err(|_| StoreError::Capacity)?;
        let mut retained = BTreeMap::new();
        for (row, category) in selection {
            let key = [
                row.actor_id.as_str(),
                row.kind.as_str(),
                row.id.as_str(),
                row.revision.as_str(),
            ];
            if retained.insert(key, (row.bytes, category)).is_some() {
                return Err(StoreError::InvalidRecord);
            }
        }
        let world = head.world_id.as_str();
        let revision = sql_ordinal(head.revision)?;
        let (_wire, rows) = admitted_query(
            tx,
            "SELECT actor_id,source_kind,source_id,revision,retention_class,logical_bytes,octet_length(payload)::bigint \
             FROM mind_source_versions WHERE world_id=$1 ORDER BY actor_id,source_kind,source_id,revision",
            &[&world], &self.budget,
        ).await?;
        const BATCH: usize = 128;
        let _workspace = self
            .budget
            .reserve(BATCH * size_of::<SourceVersionArchiveChange<'_>>())
            .map_err(|_| StoreError::Capacity)?;
        for group in rows.chunks(BATCH) {
            let mut changes = Vec::with_capacity(group.len());
            let mut bytes = 0usize;
            for row in group {
                let actor_id: &str = row.try_get(0)?;
                let kind: &str = row.try_get(1)?;
                let id: &str = row.try_get(2)?;
                let revision: &str = row.try_get(3)?;
                let current = (checked_class(row.try_get(4)?)?, ordinal(row.try_get(5)?)?);
                let next = retained.remove(&[actor_id, kind, id, revision]);
                let desired = if let Some((bytes, category)) = next {
                    let observed = ordinal(row.try_get(6)?)?;
                    if observed != bytes {
                        return Err(StoreError::InvalidRecord);
                    }
                    Some(if kind == "perspective" {
                        current
                    } else {
                        (class(category), observed)
                    })
                } else {
                    None
                };
                if desired == Some(current) {
                    continue;
                }
                bytes = [actor_id, kind, id, revision]
                    .into_iter()
                    .try_fold(bytes, |n, value| n.checked_add(value.len()))
                    .and_then(|n| n.checked_add(512))
                    .ok_or(StoreError::Capacity)?;
                changes.push(SourceVersionArchiveChange {
                    actor_id,
                    kind,
                    id,
                    revision,
                    expected_prior: Some(current),
                    desired,
                    payload: None,
                });
            }
            if !changes.is_empty() {
                self.apply_archive_batch(tx, world, revision, &changes, bytes)
                    .await?;
            }
        }
        if !retained.is_empty() {
            return Err(StoreError::StaleCut);
        }
        Ok(())
    }
}

fn checked_class(value: &str) -> StoreResult<AccountClass> {
    Ok(match value {
        "optional" => AccountClass::Optional,
        "required" => AccountClass::Required,
        "speech" => AccountClass::Speech,
        _ => return Err(StoreError::InvalidRecord),
    })
}

fn class(value: Category) -> AccountClass {
    match value {
        Category::Optional => AccountClass::Optional,
        Category::Required => AccountClass::Required,
        Category::Speech => AccountClass::Speech,
    }
}
