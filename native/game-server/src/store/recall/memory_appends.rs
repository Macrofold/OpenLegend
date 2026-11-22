//! Stage the derived indexes for each supported ordinary memory append.
//! The retained placement and canonical row share one PostgreSQL prefix.

use super::checkpoint_accounts::{AccountImage, Placement, compile_impression};
use super::*;
use openlegend_simulation::{
    experience::{AwarenessRetentionClass, ExperienceRetention},
    received::TemporalReceiptLocator,
    text::JsText,
};
use serde::Deserialize;
use std::sync::Arc;

pub(crate) const TABLE: &str = "mind_memories";

pub(crate) struct PreparedMemoryAppends {
    world: String,
    generation: String,
    through: u64,
    revision_column: usize,
    rows: Vec<Memory>,
    impressions: Vec<Placement>,
    _custody: ByteReservation,
}

struct Memory {
    record_id: String,
    revision: String,
    activity: Option<ActivityMemory>,
}

struct ActivityMemory {
    actor: String,
    id: String,
    source: String,
}

// The native activity/plan owners append their own work episodes here.
// Other memory forms and edits need their own projection.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ResultBody {
    id: String,
    actor_id: String,
    #[serde(
        default,
        deserialize_with = "openlegend_simulation::values::deserialize_present_option"
    )]
    activity_id: Option<String>,
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
    /// Prepare the canonical insert's exact recall text and dependencies while
    /// the world candidate can still refuse. The ordinary save keeps this
    /// independently funded placement through its database acknowledgement.
    pub(crate) fn prepare_memory_appends(
        &self,
        changes: &openlegend_simulation::records::ChangedRows,
        history: &openlegend_simulation::runtime::RuntimeHistory,
    ) -> StoreResult<Option<Arc<PreparedMemoryAppends>>> {
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
        let mut impressions = Vec::new();
        prepared
            .try_reserve_exact(rows.len())
            .map_err(|_| StoreError::Capacity)?;
        for row in rows {
            if !row.create {
                return Err(StoreError::DerivedProjectionRequired);
            }
            let field = |at: usize| {
                row.extra
                    .get(at)
                    .and_then(|cell| cell.as_str())
                    .ok_or(StoreError::InvalidRecord)
            };
            let revision = field(revision_column)?;
            let Ok(body) = serde_json::from_str::<ResultBody>(&row.payload) else {
                let placement = compile_impression(
                    history.world_id(),
                    AccountImage {
                        record: &row.id,
                        actor: field(actor_column)?,
                        id: field(id_column)?,
                        revision,
                        payload: &row.payload,
                    },
                )?;
                impressions
                    .try_reserve(1)
                    .map_err(|_| StoreError::Capacity)?;
                impressions.push(placement);
                prepared.push(Memory {
                    record_id: row.id.clone(),
                    revision: revision.to_owned(),
                    activity: None,
                });
                continue;
            };
            let work_result = match &body.activity_id {
                Some(activity) => !activity.is_empty(),
                // A plan report has no particular physical activity or
                // event. Its own acquired receipt follows the same check.
                None => body.event_type.is_none(),
            };
            if body.kind != "episode"
                || body.source != "internal"
                || !work_result
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
                revision: revision.to_owned(),
                activity: Some(ActivityMemory {
                    actor: body.actor_id,
                    id: body.id,
                    source,
                }),
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
                        .checked_add(row.revision.capacity())?
                        .checked_add(row.activity.as_ref().map_or(Some(0), |activity| {
                            activity
                                .actor
                                .capacity()
                                .checked_add(activity.id.capacity())?
                                .checked_add(activity.source.capacity())
                        })?)
                },
            )
            .and_then(|bytes| {
                impressions.iter().try_fold(
                    bytes.checked_add(
                        impressions
                            .capacity()
                            .checked_mul(std::mem::size_of::<Placement>())?,
                    )?,
                    |total, row| total.checked_add(row.retained_bytes()?),
                )
            })
            .ok_or(StoreError::Capacity)?;
        custody
            .resize(retained_bound)
            .map_err(|_| StoreError::Capacity)?;
        Ok(Some(Arc::new(PreparedMemoryAppends {
            world: history.world_id().to_owned(),
            generation: history.generation().to_owned(),
            through: history
                .base_cut()
                .checked_add(1)
                .ok_or(StoreError::StaleCut)?,
            revision_column,
            rows: prepared,
            impressions,
            _custody: custody,
        })))
    }

    pub(crate) async fn write_memory_appends(
        &self,
        transaction: &Transaction<'_>,
        save: &SaveRows,
        prepared: &[Arc<PreparedMemoryAppends>],
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
                let activities = batch.iter().filter_map(|row| row.activity.as_ref());
                if activities.clone().next().is_none() {
                    continue;
                }
                let bytes = activities
                    .clone()
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
                let body = array(activities.clone().map(|row| row.source.as_str()));
                transaction
                    .query_opt(&self.schema.recall.insert, &[&body, &hard_bytes])
                    .await?;
                let actors: Vec<_> = activities.clone().map(|row| row.actor.as_str()).collect();
                let ids: Vec<_> = activities.map(|row| row.id.as_str()).collect();
                transaction
                    .execute(
                        &self.schema.recall.reconcile,
                        &[&save.world_id, &actors, &ids, &"memory"],
                    )
                    .await?;
            }
            for batch in candidate.impressions.chunks(BATCH) {
                self.insert_retained_accounts(
                    transaction,
                    &save.world_id,
                    "memory",
                    hard_bytes,
                    batch,
                )
                .await?;
            }
        }
        Ok(())
    }
}
