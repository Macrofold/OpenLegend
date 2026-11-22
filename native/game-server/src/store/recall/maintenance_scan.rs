//! Select exact chronological maintenance references in one database
//! snapshot. The native private source reader hydrates the selected bodies
//! under its own custody and current permission check.

use super::{Store, StoreError, StoreResult, consolidation::ConsolidationCursorWrite};
use crate::store::{DurableHead, durable_head, ordinal, read::admitted_query, sql_ordinal};
use openlegend_simulation::{
    experience::{PersonalSourceKind, PersonalSourceRef},
    host::ByteReservation,
    runtime::{NpcPersonalSelection, NpcSourceSelection},
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{mem::size_of, sync::Arc};
use tokio_postgres::{Row, types::ToSql};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct MaintenanceQueries {
    pub anchor: String,
    pub hourly: String,
    pub daily: String,
    pub maximum_rows: usize,
    pub maximum_bytes: usize,
    pub raw_age_seconds: f64,
    pub hourly_window_seconds: f64,
    pub day_seconds: f64,
    pub protected_importance: f64,
    pub summary_bytes: u64,
    pub hourly_instructions: String,
    pub hourly_schema: Value,
    pub daily_instructions: String,
    pub daily_schemas: [Value; 4],
    pub daily_effort: String,
    pub input_characters: usize,
    pub output_characters: usize,
    pub output_tokens: usize,
}

impl MaintenanceQueries {
    pub(crate) fn retained_bytes(&self) -> Option<usize> {
        let schemas = std::iter::once(&self.hourly_schema)
            .chain(&self.daily_schemas)
            .try_fold(0usize, |bytes, schema| {
                bytes.checked_add(
                    openlegend_simulation::encoding::json_record_len(schema)
                        .ok()?
                        .checked_mul(8)?,
                )
            })?;
        self.anchor
            .capacity()
            .checked_add(self.hourly.capacity())?
            .checked_add(self.daily.capacity())?
            .checked_add(self.hourly_instructions.capacity())?
            .checked_add(self.daily_instructions.capacity())?
            .checked_add(self.daily_effort.capacity())?
            .checked_add(schemas)
    }

    pub(crate) fn valid(&self) -> bool {
        [&self.anchor, &self.hourly, &self.daily]
            .iter()
            .all(|sql| !sql.is_empty())
            && self.maximum_rows != 0
            && self.maximum_bytes != 0
            && self.summary_bytes != 0
            && !self.hourly_instructions.is_empty()
            && self.hourly_schema.is_object()
            && !self.daily_instructions.is_empty()
            && !self.daily_effort.is_empty()
            && self.daily_schemas.iter().all(Value::is_object)
            && self.input_characters > 4096
            && self.output_characters > 128
            && self.output_tokens != 0
            && [
                self.day_seconds,
                self.hourly_window_seconds,
                self.raw_age_seconds,
            ]
            .into_iter()
            .all(|duration| duration.is_finite() && duration > 0.)
            && (0. ..=10.).contains(&self.protected_importance)
    }
}

pub(crate) enum ConsolidationWindow {
    Hourly {
        at: f64,
    },
    Daily {
        day: u64,
        /// A later partition cannot select summaries it wrote itself.
        through_revision: Option<u64>,
        after: Option<ConsolidationPosition>,
    },
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ConsolidationPosition {
    pub at: f64,
    pub sequence: u64,
    pub id: String,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ReviewPosition {
    pub day: u64,
    pub timeline: String,
    pub completed: bool,
    pub failed: bool,
    pub through_revision: Option<u64>,
    pub after: Option<ConsolidationPosition>,
}

pub(crate) struct PendingSchedule<T> {
    pub key: String,
    pub timeline: String,
    pub current: Option<T>,
    pub previous: Option<String>,
    pub custody: ByteReservation,
}

pub(crate) type PendingReview = PendingSchedule<ReviewPosition>;

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct HourlyPosition {
    pub hour: u64,
    pub timeline: String,
    pub source_digest: String,
    pub outcome: HourlyOutcome,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) enum HourlyOutcome {
    Prepared,
    Published,
    Refused,
}

impl<T> PendingSchedule<T> {
    pub(crate) fn write(mut self, next: &T) -> StoreResult<ConsolidationCursorWrite>
    where
        T: Serialize,
    {
        use openlegend_simulation::encoding::{json_record, json_record_len};
        let len = json_record_len(next).map_err(|_| StoreError::InvalidRecord)?;
        self.custody
            .resize(
                self.custody
                    .bytes()
                    .checked_add(len.checked_mul(3).ok_or(StoreError::Capacity)?)
                    .ok_or(StoreError::Capacity)?,
            )
            .map_err(|_| StoreError::Capacity)?;
        let next = json_record(next).map_err(|_| StoreError::InvalidRecord)?;
        Ok(ConsolidationCursorWrite {
            key: self.key,
            previous: self.previous,
            next,
            _custody: self.custody,
        })
    }
}

pub(crate) struct SelectedConsolidation {
    pub head: DurableHead,
    pub actor: String,
    pub through_revision: u64,
    pub after: ConsolidationPosition,
    pub complete: bool,
    pub protected_only: bool,
    pub selection: NpcSourceSelection,
    pub custody: ByteReservation,
}

impl Store {
    pub(crate) async fn pending_review(
        self: &Arc<Self>,
        expected: DurableHead,
        actor: &str,
    ) -> StoreResult<PendingReview> {
        self.pending_maintenance(expected, actor, "memory-review", |p: &ReviewPosition| {
            &p.timeline
        })
        .await
    }

    pub(crate) async fn pending_hourly(
        self: &Arc<Self>,
        expected: DurableHead,
        actor: &str,
    ) -> StoreResult<PendingSchedule<HourlyPosition>> {
        self.pending_maintenance(expected, actor, "cleanup", |p: &HourlyPosition| &p.timeline)
            .await
    }

    async fn pending_maintenance<T>(
        self: &Arc<Self>,
        expected: DurableHead,
        actor: &str,
        kind: &'static str,
        position_timeline: for<'a> fn(&'a T) -> &'a str,
    ) -> StoreResult<PendingSchedule<T>>
    where
        T: serde::de::DeserializeOwned + Send + 'static,
    {
        let mut custody = self
            .budget
            .reserve(2048 + expected.world_id.len() * 4 + actor.len() * 2)
            .map_err(|_| StoreError::Capacity)?;
        let key = format!("integration:{kind}:{}:{actor}", expected.world_id);
        let timeline_key = format!("integration:world-timeline:{}", expected.world_id);
        let store = self.clone();
        self.read_simulation_cut(move |tx| {
            Box::pin(async move {
                let head = durable_head(tx).await?.ok_or(StoreError::StaleCut)?;
                if head != expected {
                    return Err(StoreError::StaleCut);
                }
                let (_wire, rows) = admitted_query(
                    tx,
                    "SELECT key,value FROM meta WHERE key IN ($1,$2)",
                    &[&key, &timeline_key],
                    &store.budget,
                )
                .await?;
                let mut timeline = None;
                let mut previous = None;
                for row in &rows {
                    let name: &str = row.try_get(0)?;
                    let value: &str = row.try_get(1)?;
                    if name == timeline_key {
                        timeline = Some(value);
                    } else if name == key {
                        previous = Some(value);
                    }
                }
                let timeline = timeline.ok_or(StoreError::InvalidRecord)?;
                let parse_bytes = timeline
                    .len()
                    .checked_add(previous.map_or(0, str::len))
                    .and_then(|n| n.checked_mul(12))
                    .ok_or(StoreError::Capacity)?;
                custody
                    .resize(
                        custody
                            .bytes()
                            .checked_add(parse_bytes)
                            .ok_or(StoreError::Capacity)?,
                    )
                    .map_err(|_| StoreError::Capacity)?;
                let timeline: String =
                    serde_json::from_str(timeline).map_err(|_| StoreError::InvalidRecord)?;
                let current = previous
                    .map(serde_json::from_str::<T>)
                    .transpose()
                    .map_err(|_| StoreError::InvalidRecord)?
                    .filter(|position| position_timeline(position) == timeline);
                Ok(PendingSchedule {
                    key,
                    timeline,
                    current,
                    previous: previous.map(str::to_owned),
                    custody,
                })
            })
        })
        .await
    }

    /// Read the next eligible routine anchor for an actor whose current
    /// hourly selection was empty. Nothing polls this query while it sleeps.
    pub(crate) async fn next_hourly_source(
        self: &Arc<Self>,
        expected: DurableHead,
        actor: String,
    ) -> StoreResult<Option<f64>> {
        let store = self.clone();
        self.read_simulation_cut(move |tx| {
            Box::pin(async move {
                if durable_head(tx).await?.as_ref() != Some(&expected) {
                    return Err(StoreError::StaleCut);
                }
                let policy = &store.schema.recall.maintenance;
                let (_wire, rows) = admitted_query(
                    tx,
                    &policy.anchor,
                    &[&expected.world_id, &actor, &expected.generation, &f64::MAX],
                    &store.budget,
                )
                .await?;
                rows.first()
                    .map(|row| {
                        row.try_get::<_, f64>(0)
                            .map(|at| at + policy.raw_age_seconds)
                            .map_err(StoreError::from)
                    })
                    .transpose()
            })
        })
        .await
    }

    /// Read only one due actor and one finite account partition. This is a
    /// durable-cut selection. Live source hydration retains its own accepted
    /// cut and verifies these exact revisions, including pending overrides.
    pub(crate) async fn select_consolidation(
        self: &Arc<Self>,
        expected: DurableHead,
        actor: String,
        window: ConsolidationWindow,
    ) -> StoreResult<Option<SelectedConsolidation>> {
        let store = self.clone();
        self.read_simulation_cut(move |tx| {
            Box::pin(async move {
                let head = durable_head(tx).await?.ok_or(StoreError::StaleCut)?;
                if head != expected {
                    return Err(StoreError::StaleCut);
                }
                let queries = &store.schema.recall.maintenance;
                let before = ConsolidationPosition {
                    at: -f64::MAX,
                    sequence: 0,
                    id: String::new(),
                };
                let world = &head.world_id;
                let generation = &head.generation;
                let (from, to, after, anchor, through_revision) = match window {
                    ConsolidationWindow::Hourly { at } => {
                        let to = at - queries.raw_age_seconds;
                        if !to.is_finite() {
                            return Err(StoreError::InvalidRecord);
                        }
                        let (_wire, selected) = admitted_query(
                            tx,
                            &queries.anchor,
                            &[world, &actor, generation, &to],
                            &store.budget,
                        )
                        .await?;
                        let Some(row) = selected.first() else {
                            return Ok(None);
                        };
                        let after = position(row, 0, 1, 2)?;
                        let at = after.at;
                        (-f64::MAX, to, after, Some(at), None)
                    }
                    ConsolidationWindow::Daily {
                        day,
                        through_revision,
                        after,
                    } => {
                        let revision = through_revision.unwrap_or(head.revision);
                        if revision > head.revision {
                            return Err(StoreError::StaleCut);
                        }
                        let from = day as f64 * queries.day_seconds;
                        let to = from + queries.day_seconds;
                        if !from.is_finite() || !to.is_finite() || to <= from {
                            return Err(StoreError::InvalidRecord);
                        }
                        (
                            from,
                            to,
                            after.unwrap_or(before),
                            None,
                            Some(sql_ordinal(revision)?),
                        )
                    }
                };
                let limit = queries
                    .maximum_rows
                    .checked_add(1)
                    .and_then(|n| i64::try_from(n).ok())
                    .ok_or(StoreError::Capacity)?;
                let sequence = sql_ordinal(after.sequence)?;
                let common: [&(dyn ToSql + Sync); 9] = [
                    world, &actor, generation, &from, &to, &after.at, &sequence, &after.id, &limit,
                ];
                let (_wire, rows) = if let Some(revision) = &through_revision {
                    let [world, actor, generation, from, to, at, sequence, id, limit] = common;
                    admitted_query(
                        tx,
                        &queries.daily,
                        &[
                            world, actor, generation, from, to, at, sequence, id, limit, revision,
                        ],
                        &store.budget,
                    )
                    .await?
                } else {
                    admitted_query(tx, &queries.hourly, &common, &store.budget).await?
                };
                if rows.is_empty() {
                    return Ok(None);
                }
                let mut body_bytes = 0usize;
                let mut retained = size_of::<SelectedConsolidation>()
                    + world.len()
                    + generation.len()
                    + actor.len();
                let mut selected = 0usize;
                let mut protected_only = true;
                for row in &rows {
                    if selected == queries.maximum_rows {
                        break;
                    }
                    let at: f64 = row.try_get(3)?;
                    if !at.is_finite() {
                        return Err(StoreError::InvalidRecord);
                    }
                    if let Some(anchor) = anchor
                        && (at > anchor + queries.hourly_window_seconds
                            || (at / queries.day_seconds).floor()
                                != (anchor / queries.day_seconds).floor())
                    {
                        break;
                    }
                    let bytes = row
                        .try_get::<_, Option<i32>>(6)?
                        .and_then(|bytes| usize::try_from(bytes).ok())
                        .filter(|bytes| *bytes > 0)
                        .ok_or(StoreError::InvalidRecord)?;
                    let total = body_bytes.checked_add(bytes).ok_or(StoreError::Capacity)?;
                    if total > queries.maximum_bytes {
                        if selected == 0 {
                            return Err(StoreError::Capacity);
                        }
                        break;
                    }
                    body_bytes = total;
                    let importance: f64 = row.try_get(5)?;
                    if !(0. ..=10.).contains(&importance) {
                        return Err(StoreError::InvalidRecord);
                    }
                    protected_only &= importance >= queries.protected_importance;
                    let id: &str = row.try_get(1)?;
                    let revision: &str = row.try_get(2)?;
                    retained = retained
                        .checked_add(size_of::<NpcPersonalSelection>())
                        .and_then(|n| n.checked_add(id.len()))
                        .and_then(|n| n.checked_add(revision.len()))
                        .ok_or(StoreError::Capacity)?;
                    selected += 1;
                }
                if selected == 0 {
                    return Ok(None);
                }
                let last = &rows[selected - 1];
                let last_id: &str = last.try_get(1)?;
                let custody = store
                    .budget
                    .reserve(
                        retained
                            .checked_add(last_id.len())
                            .ok_or(StoreError::Capacity)?,
                    )
                    .map_err(|_| StoreError::Capacity)?;
                let mut personal = Vec::with_capacity(selected);
                for row in rows.iter().take(selected) {
                    let kind = match row.try_get::<_, &str>(0)? {
                        "awareness" => PersonalSourceKind::Awareness,
                        "memory" => PersonalSourceKind::Memory,
                        "summary" if through_revision.is_some() => PersonalSourceKind::Summary,
                        _ => return Err(StoreError::InvalidRecord),
                    };
                    let reference = PersonalSourceRef {
                        kind,
                        id: row.try_get(1)?,
                        revision: row.try_get(2)?,
                    };
                    if !reference.validate() {
                        return Err(StoreError::InvalidRecord);
                    }
                    personal.push(NpcPersonalSelection {
                        reference,
                        through: None,
                    });
                }
                Ok(Some(SelectedConsolidation {
                    through_revision: through_revision
                        .map(ordinal)
                        .transpose()?
                        .unwrap_or(head.revision),
                    head,
                    actor,
                    after: position(last, 3, 4, 1)?,
                    complete: selected == rows.len(),
                    protected_only,
                    selection: NpcSourceSelection {
                        receipts: Vec::new(),
                        personal,
                        consolidation_job: None,
                    },
                    custody,
                }))
            })
        })
        .await
    }
}

fn position(
    row: &Row,
    at: usize,
    sequence: usize,
    id: usize,
) -> StoreResult<ConsolidationPosition> {
    let at: f64 = row.try_get(at)?;
    if !at.is_finite() {
        return Err(StoreError::InvalidRecord);
    }
    Ok(ConsolidationPosition {
        at,
        sequence: ordinal(row.try_get(sequence)?)?,
        id: row.try_get(id)?,
    })
}
