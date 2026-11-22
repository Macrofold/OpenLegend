//! Scoped consolidation removes current search placements while leaving
//! archived originals and independent observer accounts intact.

use super::checkpoint_accounts::{AccountImage, Placement, compile_placement};
use super::{Store, StoreError, StoreResult, source_kind, sql_ordinal};
use crate::store::PrefixProjection;
use openlegend_simulation::{
    encoding::json_record,
    experience::PersonalSourceKind,
    host::ByteReservation,
    records::{SaveRows, SqlCell},
    runtime::RuntimePreparedProducts,
};
use std::mem::size_of;
use tokio_postgres::Transaction;

const SUMMARY: &str = "mind_summaries";
const RETIRED_KINDS: [PersonalSourceKind; 3] = [
    PersonalSourceKind::Awareness,
    PersonalSourceKind::Memory,
    PersonalSourceKind::Summary,
];

pub(crate) struct PreparedConsolidation {
    world: String,
    generation: String,
    through: u64,
    actor: String,
    hard_bytes: i64,
    summaries: Vec<Placement>,
    retired: Vec<String>,
    _custody: ByteReservation,
}

pub(crate) struct ConsolidationCursorWrite {
    pub key: String,
    pub previous: Option<String>,
    pub next: String,
    pub _custody: ByteReservation,
}

impl ConsolidationCursorWrite {
    pub(crate) async fn commit(&self, tx: &Transaction<'_>) -> StoreResult<()> {
        let saved = tx
            .execute(
                "INSERT INTO meta(key,value) SELECT $1,$2 WHERE $3::text IS NULL \
             OR EXISTS(SELECT 1 FROM meta WHERE key=$1) \
             ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE meta.value=$3",
                &[&self.key, &self.next, &self.previous],
            )
            .await?;
        if saved != 1 {
            return Err(StoreError::StaleCut);
        }
        Ok(())
    }
}

impl Store {
    /// Compile candidate summaries into private search placements before the
    /// world can accept. The saved prefix keeps the canonical bodies and archives.
    pub(crate) fn prepare_consolidation(
        &self,
        product: &RuntimePreparedProducts<'_>,
    ) -> StoreResult<Option<PreparedConsolidation>> {
        let Some((actor, retired, decoder)) = product.consolidation_recall() else {
            return Ok(None);
        };
        let progress = product.progress();
        let changes = product.changes();
        if RETIRED_KINDS[..2]
            .iter()
            .any(|kind| changes.writes.contains_key(kind.table()))
        {
            return Err(StoreError::DerivedProjectionRequired);
        }
        let columns = self
            .schema
            .tables
            .iter()
            .find(|table| table.name == SUMMARY)
            .ok_or(StoreError::Schema)?;
        let column = |name: &str| {
            columns
                .columns
                .iter()
                .position(|c| c.name == name)
                .ok_or(StoreError::Schema)
        };
        let actor_column = column("actor_id")?;
        let id_column = column("source_id")?;
        let revision_column = column("account_revision")?;
        let rows = changes.writes.get(SUMMARY).map_or(&[][..], Vec::as_slice);
        let owned = retired
            .iter()
            .try_fold(
                size_of::<PreparedConsolidation>()
                    + progress.world_id.len()
                    + progress.generation.len()
                    + actor.len(),
                |n, id| n.checked_add(id.len())?.checked_add(size_of::<String>()),
            )
            .and_then(|n| n.checked_add(rows.len().checked_mul(size_of::<Placement>())?))
            .ok_or(StoreError::Capacity)?;
        let mut custody = self
            .budget
            .reserve(owned)
            .map_err(|_| StoreError::Capacity)?;
        let mut summaries = Vec::with_capacity(rows.len());
        for row in rows {
            let field = |at: usize| {
                row.extra
                    .get(at)
                    .and_then(SqlCell::as_str)
                    .ok_or(StoreError::InvalidRecord)
            };
            if field(actor_column)? != actor {
                return Err(StoreError::InvalidRecord);
            }
            let decode =
                SqlCell::json_decode_bound(&row.payload).ok_or(StoreError::InvalidRecord)?;
            // Dependency placement also materializes SQL projections of the
            // validated body. Replace its workspace charge with retained custody.
            let mut row_custody = self
                .budget
                .reserve(decode.checked_mul(8).ok_or(StoreError::Capacity)?)
                .map_err(|_| StoreError::Capacity)?;
            let summary = compile_placement(
                progress.world_id,
                PersonalSourceKind::Summary,
                AccountImage {
                    record: &row.id,
                    id: field(id_column)?,
                    actor,
                    revision: field(revision_column)?,
                    payload: &row.payload,
                },
                decoder,
            )?;
            let retained = summary.retained_bytes().ok_or(StoreError::Capacity)?;
            row_custody
                .resize(retained)
                .map_err(|_| StoreError::Capacity)?;
            custody
                .merge(row_custody)
                .map_err(|_| StoreError::Capacity)?;
            summaries.push(summary);
        }
        Ok(Some(PreparedConsolidation {
            world: progress.world_id.into(),
            generation: progress.generation.into(),
            through: progress.through_cut,
            actor: actor.into(),
            hard_bytes: sql_ordinal(decoder.hard_bytes)?,
            summaries,
            retired: retired.to_vec(),
            _custody: custody,
        }))
    }
}

impl PreparedConsolidation {
    pub(crate) fn projection<'a>(&'a self, store: &'a Store) -> ConsolidationProjection<'a> {
        ConsolidationProjection {
            prepared: self,
            store,
            cursor: None,
        }
    }
}

pub(crate) struct ConsolidationProjection<'a> {
    prepared: &'a PreparedConsolidation,
    store: &'a Store,
    cursor: Option<&'a ConsolidationCursorWrite>,
}

impl<'a> ConsolidationProjection<'a> {
    pub(crate) fn with_cursor(mut self, cursor: &'a ConsolidationCursorWrite) -> Self {
        self.cursor = Some(cursor);
        self
    }
}

impl PrefixProjection for ConsolidationProjection<'_> {
    async fn before_records(
        &self,
        transaction: &Transaction<'_>,
        save: &SaveRows,
        _revision: u64,
    ) -> StoreResult<()> {
        let prepared = self.prepared;
        if prepared.world != save.world_id
            || prepared.generation != save.generation
            || prepared.through != save.through_cut
        {
            return Err(StoreError::StaleCut);
        }
        for kind in RETIRED_KINDS {
            let deletes = save
                .changes
                .deletes
                .get(kind.table())
                .map_or(&[][..], Vec::as_slice);
            let writes = save
                .changes
                .writes
                .get(kind.table())
                .map_or(&[][..], Vec::as_slice);
            let ids = deletes.iter().map(String::as_str).chain(
                writes
                    .iter()
                    .filter(|row| !row.create)
                    .map(|row| row.id.as_str()),
            );
            let wire = ids
                .clone()
                .try_fold(0usize, |n, id| n.checked_add(id.len())?.checked_add(64))
                .and_then(|n| n.checked_mul(3))
                .ok_or(StoreError::Capacity)?;
            if wire == 0 {
                continue;
            }
            let _wire = self
                .store
                .budget
                .reserve(wire)
                .map_err(|_| StoreError::Capacity)?;
            let ids: Vec<_> = ids.collect();
            let family = source_kind(kind);
            transaction.execute(
                "DELETE FROM mind_source_dependencies d USING recall_sources r \
                 WHERE r.world_id=$1 AND r.actor_id=$2 AND r.source_kind=$3 AND r.record_id=ANY($4::text[]) \
                 AND (d.world_id,d.actor_id,d.derived_kind,d.derived_id)=(r.world_id,r.actor_id,r.source_kind,r.id)",
                &[&prepared.world, &prepared.actor, &family, &ids],
            ).await?;
            transaction
                .query_opt(
                    &self.store.schema.lexical.remove_accounts,
                    &[
                        &prepared.world,
                        &ids,
                        &family,
                        &Some(prepared.actor.as_str()),
                    ],
                )
                .await?;
        }
        if save
            .changes
            .deletes
            .contains_key(PersonalSourceKind::Awareness.table())
        {
            let actor_key = json_record(&[prepared.world.as_str(), prepared.actor.as_str()])
                .map_err(|_| StoreError::InvalidRecord)?;
            let key = format!("integration:conversation-compaction:{actor_key}");
            transaction
                .execute("DELETE FROM meta WHERE key=$1", &[&key])
                .await?;
        }
        Ok(())
    }

    async fn after_records(
        &self,
        transaction: &Transaction<'_>,
        _save: &SaveRows,
        _revision: u64,
    ) -> StoreResult<()> {
        let prepared = self.prepared;
        if !prepared.summaries.is_empty() {
            self.store
                .insert_retained_accounts(
                    transaction,
                    &prepared.world,
                    "summary",
                    prepared.hard_bytes,
                    prepared.summaries.iter(),
                )
                .await?;
        }
        if !prepared.retired.is_empty() {
            let bytes = prepared
                .retired
                .iter()
                .try_fold(1024usize, |n, id| {
                    n.checked_add(id.len())?
                        .checked_add(prepared.actor.len())?
                        .checked_add(64)
                })
                .and_then(|n| n.checked_mul(3))
                .ok_or(StoreError::Capacity)?;
            let _wire = self
                .store
                .budget
                .reserve(bytes)
                .map_err(|_| StoreError::Capacity)?;
            let actors = vec![prepared.actor.as_str(); prepared.retired.len()];
            transaction
                .execute(
                    &self.store.schema.recall.reconcile,
                    &[
                        &prepared.world,
                        &actors,
                        &prepared.retired,
                        &Option::<&str>::None,
                    ],
                )
                .await?;
        }
        if let Some(cursor) = self.cursor {
            cursor.commit(transaction).await?;
        }
        Ok(())
    }
}
