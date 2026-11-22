//! Stage a validated private installation on the one protected transaction.
//! The stopped server cannot expose any of these rows before reconciliation.

use super::CheckpointHistory;
use crate::store::read::admitted_query;
use crate::store::write::{BATCH_BYTES, insert_checkpoint_rows};
use crate::store::{
    CurrentOpening, DurableHead, Store, StoreError, StoreResult, durable_head, sql_ordinal,
};
use openlegend_simulation::records::{ChangedRows, SqlCell};
use openlegend_simulation::runtime::RuntimeRecallDecoder;
use serde_json::value::RawValue;
use std::collections::{BTreeMap, BTreeSet};
use tokio_postgres::Transaction;
use tokio_postgres::types::Type;

impl Store {
    /// Run a bounded canonical read at the actual private candidate cut.
    /// The savepoint ends before the independently funded answer leaves.
    pub(super) async fn with_checkpoint_projection<R>(
        &self,
        tx: &Transaction<'_>,
        prospective: &DurableHead,
        projection: &RawValue,
        consume: impl std::future::Future<Output = StoreResult<R>>,
    ) -> StoreResult<R> {
        self.checkpoint_view(tx, prospective, projection, None, None, consume)
            .await
    }

    /// Perspective and version readers require exact derived ownership when
    /// their private canonical predecessor differs from the staged baseline.
    pub(crate) async fn with_checkpoint_recall_view<R>(
        &self,
        tx: &Transaction<'_>,
        prospective: &DurableHead,
        projection: &RawValue,
        decoder: &RuntimeRecallDecoder<'_>,
        archives: Option<&RawValue>,
        consume: impl std::future::Future<Output = StoreResult<R>>,
    ) -> StoreResult<R> {
        self.checkpoint_view(
            tx,
            prospective,
            projection,
            Some(decoder),
            archives,
            consume,
        )
        .await
    }

    async fn checkpoint_view<R>(
        &self,
        tx: &Transaction<'_>,
        prospective: &DurableHead,
        projection: &RawValue,
        decoder: Option<&RuntimeRecallDecoder<'_>>,
        archives: Option<&RawValue>,
        consume: impl std::future::Future<Output = StoreResult<R>>,
    ) -> StoreResult<R> {
        if durable_head(tx).await?.as_ref() != Some(prospective) {
            return Err(StoreError::StaleCut);
        }
        let _workspace = self
            .budget
            .reserve(SqlCell::json_decode_bound(projection.get()).ok_or(StoreError::InvalidRecord)?)
            .map_err(|_| StoreError::Capacity)?;
        let changes: ChangedRows =
            serde_json::from_str(projection.get()).map_err(|_| StoreError::InvalidRecord)?;
        self.validate_rows(&changes)?;
        let refresh_dependencies = decoder.is_some()
            && changes
                .writes
                .keys()
                .chain(changes.deletes.keys())
                .any(|name| {
                    matches!(
                        name.as_str(),
                        "data_world"
                            | "experience_state"
                            | "world_memories"
                            | "mind_awareness"
                            | "mind_awareness_owners"
                            | "mind_memories"
                            | "mind_memories_owners"
                            | "mind_summaries"
                            | "mind_summaries_owners"
                            | "mind_forgotten"
                            | "mind_forgotten_owners"
                            | "mind_corrections"
                            | "mind_corrections_owners"
                    )
                });
        let revision = sql_ordinal(prospective.revision)?;
        let world = &prospective.world_id;
        tx.batch_execute("SAVEPOINT recovery_read").await?;
        let answer = async {
            self.write_records(tx, world, revision, &changes).await?;
            if let Some(archives) = archives {
                self.apply_checkpoint_archive_baseline(tx, prospective, archives.get())
                    .await?;
            }
            if let Some(decoder) = decoder.filter(|_| refresh_dependencies) {
                self.rebuild_checkpoint_projections(tx, world, decoder)
                    .await?;
            }
            consume.await
        }
        .await;
        tx.batch_execute("ROLLBACK TO SAVEPOINT recovery_read; RELEASE SAVEPOINT recovery_read")
            .await?;
        answer
    }

    /// Stage the private checkpoint on the original writer. The caller must
    /// reconcile Native and rebuild derived sources before COMMIT. There is no
    /// standalone acceptance path for these tentative imported bodies.
    pub(crate) async fn stage_checkpoint(
        &self,
        transaction: &Transaction<'_>,
        expected: &DurableHead,
        captured_revision: u64,
        checkpoint: &CurrentOpening,
        history: &CheckpointHistory,
    ) -> StoreResult<()> {
        let candidate = &checkpoint.records;
        if candidate.world_id != expected.world_id
            || candidate.database_schema != self.schema.version
            || candidate.generation == expected.generation
            || candidate.generation.is_empty()
            || Some(candidate.durable_revision)
                != expected.revision.max(captured_revision).checked_add(1)
        {
            return Err(StoreError::StaleCut);
        }
        let world = &expected.world_id;
        let before = sql_ordinal(expected.revision)?;
        let revision = sql_ordinal(candidate.durable_revision)?;
        let installed = transaction
            .execute(
                "UPDATE world_head SET generation=$4,revision=$5 WHERE id=1 \
                 AND world_id=$1 AND generation=$2 AND revision=$3",
                &[
                    world,
                    &expected.generation,
                    &before,
                    &candidate.generation,
                    &revision,
                ],
            )
            .await?;
        if installed != 1 {
            return Err(StoreError::StaleCut);
        }
        // The placement edges have restrictive references. Clear these before
        // the canonical root cascade, leaving operational tables untouched.
        transaction
            .execute("DELETE FROM sim_placements WHERE world_id=$1", &[world])
            .await?;
        transaction
            .execute("DELETE FROM data_world WHERE world_id=$1", &[world])
            .await?;
        self.stage_opening_records(transaction, checkpoint, history, true)
            .await
    }

    /// Use the same typed row and history writers for a validated installation
    /// on an empty target. Its authority owner inserts the new head in this
    /// transaction before calling here. Only recovery deletes preceding rows.
    pub(crate) async fn stage_opening_records(
        &self,
        transaction: &Transaction<'_>,
        checkpoint: &CurrentOpening,
        history: &CheckpointHistory,
        replace_history: bool,
    ) -> StoreResult<()> {
        let candidate = &checkpoint.records;
        let world = &candidate.world_id;
        let revision = sql_ordinal(candidate.durable_revision)?;
        for table in &self.schema.tables {
            let rows = candidate
                .tables
                .get(&table.name)
                .ok_or(StoreError::Schema)?;
            insert_checkpoint_rows(transaction, table, world, revision, rows, &self.budget).await?;
        }
        self.stage_checkpoint_history(transaction, world, history, replace_history)
            .await?;
        let supports = candidate
            .tables
            .get("mind_temporal_supports")
            .ok_or(StoreError::Schema)?;
        self.project_checkpoint_support_places(transaction, world, supports)
            .await?;
        self.rebuild_received(transaction, world, revision).await?;
        Ok(())
    }

    async fn stage_checkpoint_history(
        &self,
        transaction: &Transaction<'_>,
        world: &str,
        history: &CheckpointHistory,
        replace: bool,
    ) -> StoreResult<()> {
        for name in &self.schema.checkpoint.history_tables {
            let rows = history.tables.get(name).ok_or(StoreError::InvalidRecord)?;
            if replace {
                transaction
                    .execute(&format!("DELETE FROM {name} WHERE world_id=$1"), &[&world])
                    .await?;
            }
            if rows.is_empty() {
                continue;
            }
            let (_catalog, columns) = admitted_query(
                transaction,
                "SELECT attname::text FROM pg_catalog.pg_attribute \
                 WHERE attrelid=to_regclass($1) AND attnum>0 AND NOT attisdropped ORDER BY attnum",
                &[name],
                &self.budget,
            )
            .await?;
            let fields = columns
                .iter()
                .map(|column| column.try_get::<_, &str>(0).map_err(StoreError::from))
                .collect::<StoreResult<BTreeSet<_>>>()?;
            if !fields.contains("world_id") {
                return Err(StoreError::Schema);
            }
            let statement = format!(
                "INSERT INTO {name} SELECT * FROM jsonb_populate_recordset(NULL::{name},$1::text::jsonb)"
            );
            let mut offset = 0;
            while offset < rows.len() {
                let mut end = offset;
                let mut bytes = 2usize;
                for row in &rows[offset..] {
                    let next = bytes
                        .checked_add(row.get().len() + usize::from(end != offset))
                        .ok_or(StoreError::Capacity)?;
                    if next > BATCH_BYTES && end != offset {
                        break;
                    }
                    bytes = next;
                    end += 1;
                }
                let _buffers = self
                    .budget
                    .reserve(bytes.checked_mul(4).ok_or(StoreError::Capacity)?)
                    .map_err(|_| StoreError::Capacity)?;
                let mut body = String::with_capacity(bytes);
                body.push('[');
                for (member, row) in rows[offset..end].iter().enumerate() {
                    let _decode = self
                        .budget
                        .reserve(
                            SqlCell::json_decode_bound(row.get())
                                .ok_or(StoreError::InvalidRecord)?,
                        )
                        .map_err(|_| StoreError::Capacity)?;
                    let object: BTreeMap<&str, &RawValue> =
                        serde_json::from_str(row.get()).map_err(|_| StoreError::InvalidRecord)?;
                    if object.len() != fields.len()
                        || object.keys().any(|key| !fields.contains(key))
                        || object
                            .get("world_id")
                            .and_then(|value| serde_json::from_str::<&str>(value.get()).ok())
                            != Some(world)
                    {
                        return Err(StoreError::InvalidRecord);
                    }
                    if member > 0 {
                        body.push(',');
                    }
                    body.push_str(row.get());
                }
                body.push(']');
                let written = transaction
                    .execute_typed(&statement, &[(&body, Type::TEXT)])
                    .await?;
                if written != (end - offset) as u64 {
                    return Err(StoreError::StaleCut);
                }
                offset = end;
            }
        }
        Ok(())
    }
}
