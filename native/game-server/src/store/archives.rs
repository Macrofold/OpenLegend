//! Sparse archived personal sources follow the existing accepted version
//! plan. This writer does not enumerate history or choose eligible sources.

use super::{Store, StoreError, StoreResult, sql_ordinal};
use openlegend_simulation::received::{AccountClass, SourceVersionArchiveChange};
use openlegend_simulation::runtime::RuntimeSave;
use std::collections::{BTreeMap, btree_map::Entry};
use std::mem::size_of;
use tokio_postgres::Transaction;

const BATCH_BYTES: usize = 262_144;
const BATCH_ROWS: usize = 128;

impl Store {
    /// Apply the exact archive plans carried by the real detached save. The
    /// caller supplies that save's transaction before canonical account writes.
    /// Each newest-first chain is reduced to its original durable predecessor
    /// and one final desired state. Retained payloads stay in the save handle.
    pub(super) async fn apply_archives(
        &self,
        transaction: &Transaction<'_>,
        save: &RuntimeSave,
    ) -> StoreResult<()> {
        let rows = save.rows();
        let revision = sql_ordinal(
            rows.base_revision
                .checked_add(1)
                .ok_or(StoreError::StaleCut)?,
        )?;
        let mut merged = BTreeMap::<[&str; 4], SourceVersionArchiveChange<'_>>::new();
        let mut custody = self.budget.reserve(0).map_err(|_| StoreError::Capacity)?;
        // A sparse B-tree node per newly selected key is the current Rust
        // allocator bound. No full native save or payload backing is copied.
        const NODE: usize = 11
            * (size_of::<[&str; 4]>() + size_of::<SourceVersionArchiveChange<'static>>())
            + 16 * size_of::<usize>();
        for change in save.source_versions_newest_first() {
            if change.desired.is_some()
                && change.payload.is_none()
                && change.expected_prior.is_none()
            {
                return Err(StoreError::InvalidRecord);
            }
            let key = [change.actor_id, change.kind, change.id, change.revision];
            match merged.entry(key) {
                Entry::Vacant(entry) => {
                    let bytes = custody
                        .bytes()
                        .checked_add(NODE)
                        .ok_or(StoreError::Capacity)?;
                    custody.resize(bytes).map_err(|_| StoreError::Capacity)?;
                    entry.insert(change);
                }
                Entry::Occupied(mut entry) => {
                    let latest = entry.get_mut();
                    if latest.expected_prior != change.desired {
                        return Err(StoreError::StaleCut);
                    }
                    latest.expected_prior = change.expected_prior;
                    if latest.desired.is_some() && latest.payload.is_none() {
                        latest.payload = change.payload;
                    }
                }
            }
        }
        if merged.is_empty() {
            return Ok(());
        }
        let _batch = self
            .budget
            .reserve(BATCH_ROWS * size_of::<SourceVersionArchiveChange<'static>>())
            .map_err(|_| StoreError::Capacity)?;
        let mut batch = Vec::with_capacity(BATCH_ROWS);
        let mut bytes = 0usize;
        for change in merged.into_values() {
            let next = [
                change.actor_id,
                change.kind,
                change.id,
                change.revision,
                change.payload.unwrap_or_default(),
            ]
            .into_iter()
            .try_fold(512usize, |size, value| size.checked_add(value.len()))
            .ok_or(StoreError::Capacity)?;
            if !batch.is_empty()
                && (batch.len() == BATCH_ROWS
                    || bytes
                        .checked_add(next)
                        .is_none_or(|bytes| bytes > BATCH_BYTES))
            {
                self.apply_archive_batch(transaction, &rows.world_id, revision, &batch, bytes)
                    .await?;
                batch.clear();
                bytes = 0;
            }
            bytes = bytes.checked_add(next).ok_or(StoreError::Capacity)?;
            batch.push(change);
        }
        if !batch.is_empty() {
            self.apply_archive_batch(transaction, &rows.world_id, revision, &batch, bytes)
                .await?;
        }
        Ok(())
    }

    async fn apply_archive_batch(
        &self,
        transaction: &Transaction<'_>,
        world: &str,
        revision: i64,
        changes: &[SourceVersionArchiveChange<'_>],
        bytes: usize,
    ) -> StoreResult<()> {
        let _binding = self
            .budget
            .reserve(bytes.checked_mul(2).ok_or(StoreError::Capacity)?)
            .map_err(|_| StoreError::Capacity)?;
        let mut actor = Vec::with_capacity(changes.len());
        let mut kind = Vec::with_capacity(changes.len());
        let mut id = Vec::with_capacity(changes.len());
        let mut revisions = Vec::with_capacity(changes.len());
        let mut old_class = Vec::with_capacity(changes.len());
        let mut old_bytes = Vec::with_capacity(changes.len());
        let mut category = Vec::with_capacity(changes.len());
        let mut size = Vec::with_capacity(changes.len());
        let mut payload = Vec::with_capacity(changes.len());
        for change in changes {
            actor.push(change.actor_id);
            kind.push(change.kind);
            id.push(change.id);
            revisions.push(change.revision);
            old_class.push(change.expected_prior.map(|(kind, _)| category_name(kind)));
            old_bytes.push(
                change
                    .expected_prior
                    .map(|(_, bytes)| sql_ordinal(bytes))
                    .transpose()?,
            );
            category.push(change.desired.map(|(kind, _)| category_name(kind)));
            size.push(
                change
                    .desired
                    .map(|(_, bytes)| sql_ordinal(bytes))
                    .transpose()?,
            );
            payload.push(change.payload);
        }
        let matched: bool = transaction.query_one(
            "WITH input AS MATERIALIZED (
                SELECT * FROM unnest($3::text[],$4::text[],$5::text[],$6::text[],$7::text[],
                  $8::bigint[],$9::text[],$10::bigint[],$11::text[])
                q(actor_id,kind,id,revision,old_class,old_bytes,category,bytes,payload)
             ), conflict AS MATERIALIZED (
                SELECT 1 FROM input q LEFT JOIN mind_source_versions v
                ON v.world_id=$1 AND v.actor_id=q.actor_id AND v.source_kind=q.kind
                AND v.source_id=q.id AND v.revision=q.revision
                WHERE (v.retention_class,v.logical_bytes) IS DISTINCT FROM (q.old_class,q.old_bytes)
                LIMIT 1
             ), valid AS MATERIALIZED (SELECT * FROM input WHERE NOT EXISTS (SELECT 1 FROM conflict)),
             removed AS (
                DELETE FROM mind_source_versions v USING valid q
                WHERE v.world_id=$1 AND v.actor_id=q.actor_id AND v.source_kind=q.kind
                AND v.source_id=q.id AND v.revision=q.revision AND q.category IS NULL
             ), charged AS (
                UPDATE mind_source_versions v SET retention_class=q.category,logical_bytes=q.bytes
                FROM valid q WHERE v.world_id=$1 AND v.actor_id=q.actor_id AND v.source_kind=q.kind
                AND v.source_id=q.id AND v.revision=q.revision AND q.category IS NOT NULL AND q.payload IS NULL
             ), stored AS (
                INSERT INTO mind_source_versions(world_id,actor_id,source_kind,source_id,revision,payload,retired_revision,retention_class,logical_bytes)
                SELECT $1,q.actor_id,q.kind,q.id,q.revision,q.payload,$2,q.category,q.bytes FROM valid q
                WHERE q.category IS NOT NULL AND q.payload IS NOT NULL
                ON CONFLICT(world_id,actor_id,source_kind,source_id,revision)
                DO UPDATE SET retention_class=excluded.retention_class,logical_bytes=excluded.logical_bytes
             ) SELECT NOT EXISTS (SELECT 1 FROM conflict)",
            &[&world,&revision,&actor,&kind,&id,&revisions,&old_class,&old_bytes,&category,&size,&payload],
        ).await?.try_get(0)?;
        if !matched {
            return Err(StoreError::StaleCut);
        }
        Ok(())
    }
}

fn category_name(category: AccountClass) -> &'static str {
    match category {
        AccountClass::Optional => "optional",
        AccountClass::Required => "required",
        AccountClass::Speech => "speech",
    }
}
