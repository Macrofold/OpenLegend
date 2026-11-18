//! Canonical occurrence placement for a funded detached save. Personal
//! perspectives are separate and must come from their actual received account.

use super::{PrefixProjection, Store, StoreError, StoreResult, sql_ordinal};
use openlegend_simulation::events::OriginalOccurrence;
use openlegend_simulation::reception::EventScalar;
use openlegend_simulation::records::{ChangedRows, SaveRows};
use openlegend_simulation::runtime::RuntimeHistory;
use std::borrow::Cow;
use std::collections::HashSet;
use std::fmt::Write as _;
use tokio_postgres::Transaction;
use tokio_postgres::types::{ToSql, Type};

/// Write the detached prefix's actual append-only occurrences. All captures
/// are borrowed from their independently funded accepted owners. Until their
/// additional derived writer is attached, personal edits or perspectives
/// refuse this projection before any gameplay can be published to SQL.
pub struct OrdinaryProjection<'a> {
    store: &'a Store,
    histories: &'a [RuntimeHistory],
}

impl<'a> OrdinaryProjection<'a> {
    pub fn new(store: &'a Store, histories: &'a [RuntimeHistory]) -> Self {
        Self { store, histories }
    }

    /// The acceptance owner checks this before Ready while a refused
    /// candidate can still be rolled back. Prefix capture repeats the same
    /// predicate for any newly materialized save rows.
    pub fn validate_candidate(changes: &ChangedRows, history: &RuntimeHistory) -> StoreResult<()> {
        if derived_rows(changes) || history.accounts().next().is_some() {
            return Err(StoreError::DerivedProjectionRequired);
        }
        Ok(())
    }
}

fn derived_rows(changes: &ChangedRows) -> bool {
    let leaf = changes
        .writes
        .keys()
        .chain(changes.deletes.keys())
        .any(|table| {
            matches!(
                table.as_str(),
                "mind_awareness"
                    | "mind_memories"
                    | "mind_summaries"
                    | "mind_forgotten"
                    | "mind_corrections"
                    | "mind_privacy_revisions"
            )
        });
    leaf || [
        "data_world",
        "world_settings",
        "experience_state",
        "mind_awareness_owners",
        "mind_memories_owners",
        "mind_summaries_owners",
        "mind_forgotten_owners",
        "mind_corrections_owners",
    ]
    .into_iter()
    .any(|name| changes.deletes.contains_key(name))
}

impl PrefixProjection for OrdinaryProjection<'_> {
    async fn before_records(
        &self,
        transaction: &Transaction<'_>,
        rows: &SaveRows,
        _revision: u64,
    ) -> StoreResult<()> {
        let last = self.histories.last().ok_or(StoreError::StaleCut)?;
        if last.base_cut().checked_add(1) != Some(rows.through_cut)
            || self
                .histories
                .windows(2)
                .any(|pair| pair[0].base_cut().checked_add(1) != Some(pair[1].base_cut()))
        {
            return Err(StoreError::StaleCut);
        }
        if derived_rows(&rows.changes)
            || self
                .histories
                .iter()
                .any(|history| history.accounts().next().is_some())
        {
            return Err(StoreError::DerivedProjectionRequired);
        }
        self.store
            .append_originals(transaction, rows, self.histories)
            .await
    }

    async fn after_records(
        &self,
        _transaction: &Transaction<'_>,
        _rows: &SaveRows,
        _revision: u64,
    ) -> StoreResult<()> {
        // Canonical supports' derived capsule rows are owned by the shared
        // store writer. This checked scope has no other post-record effects.
        Ok(())
    }
}

impl Store {
    /// Write already encoded original bodies at the existing SQL occurrence
    /// boundary. The projection caller then writes the separately permitted
    /// historical perspectives, current source references and any story work.
    /// `histories` is the actual accepted prefix selected by that caller.
    pub async fn append_originals(
        &self,
        transaction: &Transaction<'_>,
        rows: &SaveRows,
        histories: &[RuntimeHistory],
    ) -> StoreResult<()> {
        if histories
            .iter()
            .zip(histories.iter().skip(1))
            .any(|(left, right)| left.base_cut() >= right.base_cut())
            || histories.iter().any(|history| {
                history.world_id() != rows.world_id
                    || history.generation() != rows.generation
                    || history.base_cut() >= rows.through_cut
            })
        {
            return Err(StoreError::StaleCut);
        }
        let mut inserted = 0i64;
        // Retain row references only. Canonical bodies continue to be owned by
        // the funded captures and are borrowed directly into the SQL request.
        let _head = self
            .budget
            .reserve(4096)
            .map_err(|_| StoreError::Capacity)?;
        let mut batch = Vec::with_capacity(128);
        let mut bound = 0usize;
        for history in histories {
            for row in history.originals() {
                let added = original_bound(row).ok_or(StoreError::Capacity)?;
                let bytes = bound.checked_add(added).ok_or(StoreError::Capacity)?;
                if !batch.is_empty() && (bytes > 262_144 || batch.len() == 128) {
                    inserted = inserted
                        .checked_add(
                            self.insert_original_batch(transaction, rows, &batch, bound)
                                .await?,
                        )
                        .ok_or(StoreError::Capacity)?;
                    batch.clear();
                    bound = 0;
                }
                bound = bound.checked_add(added).ok_or(StoreError::Capacity)?;
                batch.push(row);
            }
        }
        if !batch.is_empty() {
            inserted = inserted
                .checked_add(
                    self.insert_original_batch(transaction, rows, &batch, bound)
                        .await?,
                )
                .ok_or(StoreError::Capacity)?;
        }
        if inserted != 0 {
            let applied = transaction
                .execute(
                    "UPDATE history_totals SET event_count=event_count+$2 WHERE world_id=$1",
                    &[&rows.world_id, &inserted],
                )
                .await?;
            if applied != 1 {
                return Err(StoreError::InvalidRecord);
            }
        }
        Ok(())
    }

    async fn insert_original_batch(
        &self,
        transaction: &Transaction<'_>,
        rows: &SaveRows,
        batch: &[&OriginalOccurrence],
        bound: usize,
    ) -> StoreResult<i64> {
        let _sql = self
            .budget
            .reserve(bound)
            .map_err(|_| StoreError::Capacity)?;
        let events = batch
            .iter()
            .map(|row| HistoryRow::from_original(row))
            .collect::<StoreResult<Vec<_>>>()?;
        let mut sql = String::from(
            "INSERT INTO history_events \
            (world_id,id,position,payload,response_id,data_references,utterance_id) VALUES ",
        );
        let world_id = rows.world_id.as_str();
        let mut params: Vec<(&(dyn ToSql + Sync), Type)> = vec![(&world_id, Type::TEXT)];
        let mut base = 2;
        for (at, event) in events.iter().enumerate() {
            if at != 0 {
                sql.push(',');
            }
            write!(
                sql,
                "($1,${},${},${},${},${},${})",
                base,
                base + 1,
                base + 2,
                base + 3,
                base + 4,
                base + 5
            )
            .expect("string write");
            base += 6;
            params.push((&event.id, Type::TEXT));
            params.push((&event.position, Type::INT8));
            params.push((&event.payload, Type::TEXT));
            params.push((&event.response_id, Type::TEXT));
            params.push((&event.references, Type::TEXT_ARRAY));
            params.push((&event.utterance_id, Type::TEXT));
        }
        let written = transaction.execute_typed(&sql, &params).await?;
        if written != events.len() as u64 {
            return Err(StoreError::StaleCut);
        }
        Ok(written as i64)
    }
}

struct HistoryRow<'a> {
    id: &'a str,
    position: i64,
    payload: &'a str,
    response_id: Option<Cow<'a, str>>,
    references: Vec<Cow<'a, str>>,
    utterance_id: Option<Cow<'a, str>>,
}

impl<'a> HistoryRow<'a> {
    fn from_original(row: &'a OriginalOccurrence) -> StoreResult<Self> {
        let event = row.event();
        let position = sql_ordinal(event.order.unwrap_or_else(|| {
            event
                .id
                .rsplit('-')
                .next()
                .and_then(|tail| tail.parse::<u64>().ok())
                .filter(|id| *id > 0)
                .unwrap_or(event.sequence)
        }))?;
        let field = |key| {
            event
                .data
                .as_ref()
                .and_then(|data| data.get(key))
                .and_then(text)
        };
        let mut references = Vec::new();
        if let Some(data) = &event.data {
            let mut seen = HashSet::new();
            for value in data.values() {
                if let EventScalar::Text(reference) = value {
                    // Source deduplicates code units before PostgreSQL converts
                    // display/index strings to Unicode scalar values.
                    if reference.as_unicode() != Some(&event.id) && seen.insert(reference) {
                        references.push(sql_text(reference));
                    }
                }
            }
        }
        Ok(Self {
            id: &event.id,
            position,
            payload: row.payload(),
            response_id: field("responseId"),
            references,
            utterance_id: field("utteranceId"),
        })
    }
}

fn text(value: &EventScalar) -> Option<Cow<'_, str>> {
    let EventScalar::Text(value) = value else {
        return None;
    };
    Some(sql_text(value))
}

fn sql_text(value: &openlegend_simulation::text::JsText) -> Cow<'_, str> {
    match value.as_unicode() {
        Some(value) => Cow::Borrowed(value),
        None => Cow::Owned(String::from_utf16_lossy(&value.units().collect::<Vec<_>>())),
    }
}

fn original_bound(row: &OriginalOccurrence) -> Option<usize> {
    row.event()
        .data
        .iter()
        .flat_map(|values| values.values())
        .try_fold(
            row.payload()
                .len()
                .checked_mul(4)?
                .checked_add(row.event().id.len().checked_mul(4)?)?
                .checked_add(1024)?,
            |n, value| match value {
                EventScalar::Text(text) => n
                    .checked_add(text.utf8_len().checked_mul(16)?)?
                    .checked_add(96),
                _ => Some(n),
            },
        )
}
