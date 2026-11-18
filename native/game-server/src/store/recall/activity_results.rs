//! Ordinary completion memories are already acquired by the installed world.
//! Reuse their exact saved text and chronology when placing recall indexes.

use super::*;
use openlegend_simulation::{
    experience::{AwarenessRetentionClass, ExperienceRetention},
    received::TemporalReceiptLocator,
    text::JsText,
};
use serde::Deserialize;
use std::sync::Arc;

pub(crate) const TABLE: &str = "mind_memories";

pub(crate) struct PreparedActivityMemories {
    world: String,
    generation: String,
    through: u64,
    revision_column: usize,
    rows: Vec<Memory>,
    _custody: ByteReservation,
}

struct Memory {
    record_id: String,
    actor: String,
    id: String,
    revision: String,
    source: String,
}

// This is the append-only result produced by experience::result, not an
// authorization to accept notes, impressions, copied evidence or edits.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ResultBody {
    id: String,
    actor_id: String,
    activity_id: String,
    kind: String,
    source: String,
    importance: f64,
    at: f64,
    sequence: u64,
    summary: JsText,
    entity_ids: Vec<String>,
    event_type: Option<String>,
    speaker_id: Option<String>,
    source_receipt: Option<TemporalReceiptLocator>,
    retention: ExperienceRetention,
}

impl Store {
    /// Compile the actual finished action's new memory source once while the
    /// candidate can still refuse. The ordinary save prefix borrows this
    /// independently retained product through its database acknowledgement.
    pub(crate) fn prepare_activity_memories(
        &self,
        changes: &openlegend_simulation::records::ChangedRows,
        history: &openlegend_simulation::runtime::RuntimeHistory,
    ) -> StoreResult<Option<Arc<PreparedActivityMemories>>> {
        let Some(rows) = changes.writes.get(TABLE).filter(|rows| !rows.is_empty()) else {
            return Ok(None);
        };
        let columns = self
            .schema
            .tables
            .iter()
            .find(|table| table.name == TABLE)
            .ok_or(StoreError::Schema)?;
        let index = |name: &str| {
            columns
                .columns
                .iter()
                .position(|column| column.name == name)
                .ok_or(StoreError::Schema)
        };
        let actor_column = index("actor_id")?;
        let id_column = index("source_id")?;
        let revision_column = index("account_revision")?;
        let encoded_bound = rows
            .iter()
            .try_fold(
                2048usize + history.world_id().len() + history.generation().len(),
                |bytes, row| {
                    bytes
                        .checked_add(row.id.len().checked_mul(4)?)?
                        .checked_add(row.payload.len().checked_mul(12)?)?
                        .checked_add(1024)
                },
            )
            .ok_or(StoreError::Capacity)?;
        let mut custody = self
            .budget
            .reserve(encoded_bound)
            .map_err(|_| StoreError::Capacity)?;
        let mut prepared = Vec::new();
        prepared
            .try_reserve_exact(rows.len())
            .map_err(|_| StoreError::Capacity)?;
        for row in rows {
            if !row.create {
                return Err(StoreError::DerivedProjectionRequired);
            }
            let body: ResultBody = serde_json::from_str(&row.payload)
                .map_err(|_| StoreError::DerivedProjectionRequired)?;
            let field = |at: usize| {
                row.extra
                    .get(at)
                    .and_then(|cell| cell.as_str())
                    .ok_or(StoreError::InvalidRecord)
            };
            let revision = field(revision_column)?;
            if body.kind != "episode"
                || body.source != "internal"
                || body.activity_id.is_empty()
                || body.actor_id != field(actor_column)?
                || body.id != field(id_column)?
                || body.entity_ids.as_slice() != [body.actor_id.as_str()]
                || body.source_receipt != body.retention.receipt
                || body
                    .source_receipt
                    .as_ref()
                    .is_some_and(|receipt| receipt.actor_id != body.actor_id)
                || body.speaker_id.as_deref()
                    != body.event_type.as_ref().map(|_| body.actor_id.as_str())
            {
                return Err(StoreError::DerivedProjectionRequired);
            }
            let source = json_record(&Source {
                world_id: history.world_id(),
                actor_id: &body.actor_id,
                id: &body.id,
                source_kind: "memory",
                record_id: &row.id,
                revision,
                event_id: None,
                memory_kind: Some(&body.kind),
                acquisition: Some(&body.source),
                event_type: body.event_type.as_deref(),
                at: body.at,
                importance: body.importance,
                required: 0,
                sequence: sql_ordinal(body.sequence)?,
                search_text: &body.summary,
                linguistic: 0,
                payload_bytes: i64::try_from(row.payload.len())
                    .map_err(|_| StoreError::Capacity)?,
                retention_class: AwarenessRetentionClass::Memory,
            })
            .map_err(|_| StoreError::InvalidRecord)?;
            prepared.push(Memory {
                record_id: row.id.clone(),
                actor: body.actor_id,
                id: body.id,
                revision: revision.to_owned(),
                source,
            });
        }
        let retained_bound = prepared
            .iter()
            .try_fold(
                2048usize + history.world_id().len() + history.generation().len(),
                |bytes, row| {
                    bytes
                        .checked_add(std::mem::size_of::<Memory>())?
                        .checked_add(row.record_id.capacity())?
                        .checked_add(row.actor.capacity())?
                        .checked_add(row.id.capacity())?
                        .checked_add(row.revision.capacity())?
                        .checked_add(row.source.capacity())
                },
            )
            .ok_or(StoreError::Capacity)?;
        custody
            .resize(retained_bound)
            .map_err(|_| StoreError::Capacity)?;
        Ok(Some(Arc::new(PreparedActivityMemories {
            world: history.world_id().to_owned(),
            generation: history.generation().to_owned(),
            through: history
                .base_cut()
                .checked_add(1)
                .ok_or(StoreError::StaleCut)?,
            revision_column,
            rows: prepared,
            _custody: custody,
        })))
    }

    pub(crate) async fn write_activity_memories(
        &self,
        transaction: &Transaction<'_>,
        save: &SaveRows,
        prepared: &[Arc<PreparedActivityMemories>],
        hard_bytes: i64,
    ) -> StoreResult<()> {
        let Some(rows) = save.changes.writes.get(TABLE) else {
            return if prepared.is_empty() {
                Ok(())
            } else {
                Err(StoreError::StaleCut)
            };
        };
        let mut canonical = rows.iter();
        let mut previous = 0;
        for candidate in prepared {
            if candidate.world != save.world_id
                || candidate.generation != save.generation
                || candidate.through <= previous
                || candidate.through > save.through_cut
            {
                return Err(StoreError::StaleCut);
            }
            previous = candidate.through;
            for row in &candidate.rows {
                let index = canonical.next().ok_or(StoreError::StaleCut)?;
                if !index.create
                    || index.id != row.record_id
                    || index
                        .extra
                        .get(candidate.revision_column)
                        .and_then(|value| value.as_str())
                        != Some(&row.revision)
                {
                    return Err(StoreError::StaleCut);
                }
            }
        }
        if canonical.len() != 0 {
            return Err(StoreError::StaleCut);
        }
        for candidate in prepared {
            for batch in candidate.rows.chunks(BATCH) {
                let bytes = batch
                    .iter()
                    .try_fold(8192usize, |bytes, row| {
                        bytes
                            .checked_add(row.source.len().checked_mul(3)?)?
                            .checked_add(row.actor.len().checked_mul(4)?)?
                            .checked_add(row.id.len().checked_mul(4)?)?
                            .checked_add(256)
                    })
                    .ok_or(StoreError::Capacity)?;
                let _transfer = self
                    .budget
                    .reserve(bytes)
                    .map_err(|_| StoreError::Capacity)?;
                let body = array(batch.iter().map(|row| row.source.as_str()));
                transaction
                    .query_opt(&self.schema.recall.insert, &[&body, &hard_bytes])
                    .await?;
                let actors: Vec<_> = batch.iter().map(|row| row.actor.as_str()).collect();
                let ids: Vec<_> = batch.iter().map(|row| row.id.as_str()).collect();
                transaction
                    .execute(
                        &self.schema.recall.reconcile,
                        &[&save.world_id, &actors, &ids],
                    )
                    .await?;
            }
        }
        Ok(())
    }
}
