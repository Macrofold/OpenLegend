//! The actor's canonical replacement and its retrieval placement commit in
//! the same prefix. The old exact body stays available to admitted dependents.
use super::checkpoint_accounts::{AccountImage, Placement, compile_placement};
use super::*;
use crate::{
    authority::{RequestScope, assert_saved_grant},
    store::{CommitError, PrefixProjection, PreparedPrivacyEdit},
};
use openlegend_simulation::{
    records::SqlCell,
    runtime::{RuntimePreparedProducts, RuntimeSave},
};

struct PreparedReplacement {
    world: String,
    generation: String,
    kind: PersonalSourceKind,
    through: u64,
    actor: String,
    id: String,
    previous: String,
    record: String,
    placement: Placement,
    hard_bytes: i64,
    _custody: ByteReservation,
}

pub(crate) struct PreparedMemoryEdit {
    replacement: Option<PreparedReplacement>,
    invalidation: Option<PreparedPrivacyEdit>,
}

impl Store {
    pub(crate) fn prepare_memory_edit(
        &self,
        product: &RuntimePreparedProducts<'_>,
    ) -> Result<PreparedMemoryEdit, openlegend_simulation::runtime::RuntimeError> {
        let invalidation = product.privacy_edit();
        let replacement = self.prepare_replacement(product, invalidation.is_some())?;
        let invalidation = invalidation
            .map(|edit| {
                PreparedPrivacyEdit::new(
                    self,
                    edit,
                    product.changes(),
                    &product.retain_history(),
                    replacement
                        .as_ref()
                        .map(|row| (row.kind, row.record.as_str())),
                )
            })
            .transpose()
            .map_err(openlegend_simulation::runtime::RuntimeError::application_refused)?;
        if replacement.is_none() && invalidation.is_none() {
            return Err(
                openlegend_simulation::runtime::RuntimeError::application_refused(
                    StoreError::DerivedProjectionRequired,
                ),
            );
        }
        Ok(PreparedMemoryEdit {
            replacement,
            invalidation,
        })
    }

    fn prepare_replacement(
        &self,
        product: &RuntimePreparedProducts<'_>,
        invalidates: bool,
    ) -> Result<Option<PreparedReplacement>, openlegend_simulation::runtime::RuntimeError> {
        let Some((kind, actor, id, previous, decoder)) =
            product.person_replacement(&self.budget)?
        else {
            return Ok(None);
        };
        (|| -> StoreResult<_> {
            let progress = product.progress();
            let records = product.changes();
            let table = kind.table();
            let [row] = records.writes.get(table).map_or(&[][..], Vec::as_slice) else {
                return Err(StoreError::DerivedProjectionRequired);
            };
            if row.create
                || ["mind_awareness", "mind_memories", "mind_summaries"]
                    .into_iter()
                    .filter(|name| *name != table)
                    .any(|name| records.writes.contains_key(name))
                || [
                    "mind_memories",
                    "mind_awareness",
                    "mind_forgotten",
                    "mind_corrections",
                ]
                .into_iter()
                .any(|name| records.deletes.contains_key(name))
                || records
                    .deletes
                    .get("mind_summaries")
                    .is_some_and(|deletes| {
                        !invalidates
                            || kind == PersonalSourceKind::Summary && deletes.contains(&row.id)
                    })
            {
                return Err(StoreError::DerivedProjectionRequired);
            }
            let columns = self
                .schema
                .tables
                .iter()
                .find(|entry| entry.name == table)
                .ok_or(StoreError::Schema)?;
            let read = |name: &str| {
                let column = columns
                    .columns
                    .iter()
                    .position(|entry| entry.name == name)
                    .ok_or(StoreError::Schema)?;
                row.extra
                    .get(column)
                    .and_then(SqlCell::as_str)
                    .ok_or(StoreError::InvalidRecord)
            };
            let next = read("account_revision")?;
            if read("actor_id")? != actor || read("source_id")? != id || next == previous {
                return Err(StoreError::InvalidRecord);
            }
            let decode =
                SqlCell::json_decode_bound(&row.payload).ok_or(StoreError::InvalidRecord)?;
            let header = 1024
                + progress.world_id.len()
                + progress.generation.len()
                + actor.len()
                + id.len()
                + row.id.len()
                + previous.len();
            let mut custody = self
                .budget
                .reserve(
                    decode
                        .checked_mul(8)
                        .and_then(|bytes| bytes.checked_add(header))
                        .ok_or(StoreError::Capacity)?,
                )
                .map_err(|_| StoreError::Capacity)?;
            let placement = compile_placement(
                progress.world_id,
                kind,
                AccountImage {
                    record: &row.id,
                    actor,
                    id,
                    revision: next,
                    payload: &row.payload,
                },
                &decoder,
            )?;
            custody
                .resize(
                    placement
                        .retained_bytes()
                        .and_then(|bytes| bytes.checked_add(header))
                        .ok_or(StoreError::Capacity)?,
                )
                .map_err(|_| StoreError::Capacity)?;
            Ok(Some(PreparedReplacement {
                world: progress.world_id.into(),
                generation: progress.generation.into(),
                kind,
                through: progress.through_cut,
                actor: actor.into(),
                id: id.into(),
                previous: previous.into(),
                record: row.id.clone(),
                placement,
                hard_bytes: sql_ordinal(decoder.hard_bytes)?,
                _custody: custody,
            }))
        })()
        .map_err(openlegend_simulation::runtime::RuntimeError::application_refused)
    }

    pub(crate) async fn commit_memory_edit(
        &self,
        prepared: &PreparedMemoryEdit,
        scope: &RequestScope,
        save: &RuntimeSave,
    ) -> Result<openlegend_simulation::runtime::RuntimeSaveAcknowledgement, CommitError> {
        self.commit_save(
            save,
            &[],
            &EditorProjection {
                store: self,
                prepared,
                scope,
            },
        )
        .await
    }
}

struct EditorProjection<'a> {
    store: &'a Store,
    prepared: &'a PreparedMemoryEdit,
    scope: &'a RequestScope,
}

impl PrefixProjection for EditorProjection<'_> {
    async fn before_records(
        &self,
        tx: &Transaction<'_>,
        save: &SaveRows,
        revision: u64,
    ) -> StoreResult<()> {
        assert_saved_grant(tx, self.scope, "create").await?;
        if let Some(invalidation) = &self.prepared.invalidation {
            invalidation
                .projection(self.store)
                .before_records(tx, save, revision)
                .await?;
        }
        let Some(row) = &self.prepared.replacement else {
            return Ok(());
        };
        if save.world_id != row.world
            || save.generation != row.generation
            || save.through_cut != row.through
        {
            return Err(StoreError::StaleCut);
        }
        let current: bool = tx.query_one(
            "SELECT EXISTS(SELECT 1 FROM recall_sources WHERE world_id=$1 AND actor_id=$2 AND id=$3 AND source_kind=$4 AND record_id=$5 AND revision=$6)",
            &[&row.world, &row.actor, &row.id, &source_kind(row.kind), &row.record, &row.previous],
        ).await?.try_get(0)?;
        if !current {
            return Err(StoreError::StaleCut);
        }
        tx.query_opt(
            &self.store.schema.lexical.remove_accounts,
            &[
                &row.world,
                &std::slice::from_ref(&row.record),
                &source_kind(row.kind),
                &Some(row.actor.as_str()),
            ],
        )
        .await?;
        // Only the source's current placement changes. Its exact old version,
        // independent dependents and accepted narrative retain their own links.
        Ok(())
    }
    async fn after_records(
        &self,
        tx: &Transaction<'_>,
        save: &SaveRows,
        revision: u64,
    ) -> StoreResult<()> {
        if let Some(invalidation) = &self.prepared.invalidation {
            invalidation
                .projection(self.store)
                .after_records(tx, save, revision)
                .await?;
        }
        let Some(row) = &self.prepared.replacement else {
            return Ok(());
        };
        self.store
            .insert_retained_accounts(
                tx,
                &row.world,
                source_kind(row.kind),
                row.hard_bytes,
                std::slice::from_ref(&row.placement),
            )
            .await
    }
}
