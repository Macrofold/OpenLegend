//! Stage the derived indexes for each supported ordinary memory write.
//! The retained placement and canonical row share one PostgreSQL prefix.

use super::checkpoint_accounts::{AccountImage, Placement, compile_memory_write};
use super::*;
use indexmap::IndexMap;
use openlegend_simulation::{
    experience::{AwarenessRetentionClass, ExperienceRetention},
    received::TemporalReceiptLocator,
    text::JsText,
};
use serde::Deserialize;
use std::{mem::size_of, sync::Arc};

pub(crate) const TABLE: &str = "mind_memories";

pub(crate) struct PreparedMemoryWrites {
    world: String,
    generation: String,
    through: u64,
    revision_column: usize,
    rows: Vec<Memory>,
    _custody: ByteReservation,
}

struct Memory {
    record_id: String,
    revision: String,
    create: bool,
    output: Output,
}

enum Output {
    Activity(ActivityMemory),
    Impression(Box<Placement>),
    Commitment(Box<Placement>),
}

impl Output {
    fn retained_bytes(&self) -> Option<usize> {
        match self {
            Self::Activity(row) => row
                .actor
                .capacity()
                .checked_add(row.id.capacity())?
                .checked_add(row.source.capacity()),
            Self::Impression(placement) | Self::Commitment(placement) => placement
                .retained_bytes()?
                .checked_add(size_of::<Placement>()),
        }
    }

    fn placement(&self) -> Option<&Placement> {
        match self {
            Self::Activity(_) => None,
            Self::Impression(placement) | Self::Commitment(placement) => Some(placement),
        }
    }
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
    /// Prepare the canonical write's exact recall text and dependencies while
    /// the world candidate can still refuse. The ordinary save keeps this
    /// independently funded placement through its database acknowledgement.
    pub(crate) fn prepare_memory_writes(
        &self,
        changes: &openlegend_simulation::records::ChangedRows,
        history: &openlegend_simulation::runtime::RuntimeHistory,
    ) -> StoreResult<Option<Arc<PreparedMemoryWrites>>> {
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
        let kind_column = index("kind")?;
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
            let field = |at: usize| {
                row.extra
                    .get(at)
                    .and_then(|cell| cell.as_str())
                    .ok_or(StoreError::InvalidRecord)
            };
            let revision = field(revision_column)?;
            let kind = field(kind_column)?;
            if kind == "commitment" || row.create && kind == "impression" {
                let placement = Box::new(compile_memory_write(
                    history.world_id(),
                    AccountImage {
                        record: &row.id,
                        actor: field(actor_column)?,
                        id: field(id_column)?,
                        revision,
                        payload: &row.payload,
                    },
                    kind,
                )?);
                prepared.push(Memory {
                    record_id: row.id.clone(),
                    revision: revision.to_owned(),
                    create: row.create,
                    output: if kind == "commitment" {
                        Output::Commitment(placement)
                    } else {
                        Output::Impression(placement)
                    },
                });
                continue;
            }
            if !row.create || kind != "episode" {
                return Err(StoreError::DerivedProjectionRequired);
            }
            let body: ResultBody = serde_json::from_str(&row.payload)
                .map_err(|_| StoreError::DerivedProjectionRequired)?;
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
                create: true,
                output: Output::Activity(ActivityMemory {
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
                        .checked_add(size_of::<Memory>())?
                        .checked_add(row.record_id.capacity())?
                        .checked_add(row.revision.capacity())?
                        .checked_add(row.output.retained_bytes()?)
                },
            )
            .ok_or(StoreError::Capacity)?;
        custody
            .resize(retained_bound)
            .map_err(|_| StoreError::Capacity)?;
        Ok(Some(Arc::new(PreparedMemoryWrites {
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

    pub(crate) async fn write_memory_writes(
        &self,
        transaction: &Transaction<'_>,
        save: &SaveRows,
        prepared: &[Arc<PreparedMemoryWrites>],
        hard_bytes: i64,
    ) -> StoreResult<()> {
        let Some(rows) = save.changes.writes.get(TABLE) else {
            return if prepared.is_empty() {
                Ok(())
            } else {
                Err(StoreError::StaleCut)
            };
        };
        // Native save merging keeps the first position and create flag, but
        // uses the newest canonical body. A promise can be made and fulfilled
        // within the same one-second save or advanced repeatedly in a prefix.
        let bytes = rows.len().checked_mul(256).ok_or(StoreError::Capacity)?;
        let _fold = self
            .budget
            .reserve(bytes)
            .map_err(|_| StoreError::Capacity)?;
        let mut folded = IndexMap::<&str, (&Memory, bool)>::new();
        folded
            .try_reserve(rows.len())
            .map_err(|_| StoreError::Capacity)?;
        let mut previous = 0;
        let mut revision_column = None;
        for candidate in prepared {
            if candidate.world != save.world_id
                || candidate.generation != save.generation
                || candidate.through <= previous
                || candidate.through > save.through_cut
                || revision_column.is_some_and(|column| column != candidate.revision_column)
            {
                return Err(StoreError::StaleCut);
            }
            previous = candidate.through;
            revision_column = Some(candidate.revision_column);
            for row in &candidate.rows {
                if let Some((prior, _)) = folded.get_mut(row.record_id.as_str()) {
                    if row.create
                        || !matches!(prior.output, Output::Commitment(_))
                        || !matches!(row.output, Output::Commitment(_))
                    {
                        return Err(StoreError::StaleCut);
                    }
                    *prior = row;
                } else {
                    if folded.len() == rows.len() {
                        return Err(StoreError::StaleCut);
                    }
                    folded.insert(&row.record_id, (row, row.create));
                }
            }
        }
        if folded.len() != rows.len()
            || rows
                .iter()
                .zip(&folded)
                .any(|(canonical, (id, (row, create)))| {
                    canonical.create != *create
                        || canonical.id.as_str() != *id
                        || revision_column
                            .and_then(|column| canonical.extra.get(column))
                            .and_then(|value| value.as_str())
                            != Some(row.revision.as_str())
                })
        {
            return Err(StoreError::StaleCut);
        }
        let mut remaining = folded.as_slice();
        while !remaining.is_empty() {
            let (batch, rest) = remaining.split_at(BATCH.min(remaining.len()));
            remaining = rest;
            let replacements = batch
                .iter()
                .filter_map(|(id, (_, create))| (!*create).then_some(*id))
                .collect::<Vec<_>>();
            if !replacements.is_empty() {
                let bytes = replacements
                    .iter()
                    .try_fold(1024usize, |total, id| {
                        total.checked_add(id.len().checked_mul(3)?)?.checked_add(32)
                    })
                    .ok_or(StoreError::Capacity)?;
                let _wire = self
                    .budget
                    .reserve(bytes)
                    .map_err(|_| StoreError::Capacity)?;
                let matched: i64 = transaction.query_one(
                    "SELECT count(*) FROM recall_sources WHERE world_id=$1 AND source_kind='memory' \
                     AND memory_kind='commitment' AND record_id=ANY($2::text[])",
                    &[&save.world_id, &replacements],
                ).await?.try_get(0)?;
                if matched != replacements.len() as i64 {
                    return Err(StoreError::StaleCut);
                }
                transaction
                    .query_opt(
                        &self.schema.lexical.remove_accounts,
                        &[
                            &save.world_id,
                            &replacements,
                            &"memory",
                            &Option::<&str>::None,
                        ],
                    )
                    .await?;
            }
            let activities = batch.iter().filter_map(|(_, (row, _))| match &row.output {
                Output::Activity(activity) => Some(activity),
                _ => None,
            });
            if activities.clone().next().is_some() {
                self.insert_activity_memories(transaction, &save.world_id, hard_bytes, activities)
                    .await?;
            }
            let retained = batch
                .iter()
                .filter_map(|(_, (row, _))| row.output.placement());
            if retained.clone().next().is_some() {
                self.insert_retained_accounts(
                    transaction,
                    &save.world_id,
                    "memory",
                    hard_bytes,
                    retained,
                )
                .await?;
            }
        }
        Ok(())
    }

    async fn insert_activity_memories<'a>(
        &self,
        transaction: &Transaction<'_>,
        world: &str,
        hard_bytes: i64,
        activities: impl Iterator<Item = &'a ActivityMemory> + Clone,
    ) -> StoreResult<()> {
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
                &[&world, &actors, &ids, &"memory"],
            )
            .await?;
        Ok(())
    }
}
