//! Canonical occurrence placement for a funded detached save. Personal
//! perspectives are separate and must come from their actual received account.

use super::{
    AdmittedJob, PrefixProjection, PreparedRecall, Store, StoreError, StoreResult, postgres_text,
    recall::activity_results::{self, PreparedActivityMemories},
    sql_ordinal,
};
use crate::language::{LanguageProvider, canonical::KeyOrder};
use openlegend_simulation::events::OriginalOccurrence;
use openlegend_simulation::reception::EventScalar;
use openlegend_simulation::records::{ChangedRows, SaveRows};
use openlegend_simulation::runtime::{RuntimeHistory, RuntimeHistoryCuts};
use std::borrow::Cow;
use std::collections::HashSet;
use std::fmt::Write as _;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use tokio_postgres::Transaction;
use tokio_postgres::types::{ToSql, Type};

pub(crate) mod banner;
pub(crate) mod events;
mod expiry;
mod perspective;
mod story;
mod story_write;
pub(crate) use story_write::{ClaimedStory, OptionalStorySource, StoryOutput, StoryRevisions};
pub(crate) mod transcript;
use perspective::Perspective;

/// Write the actual detached occurrence and personal-account changes. Recall,
/// history, privacy fences and receipts all stay inside this same transaction.
pub struct OrdinaryProjection<'a> {
    store: &'a Store,
    histories: &'a [RuntimeHistory],
    eligibility: Option<&'a RuntimeHistoryCuts>,
    recall: Option<&'a PreparedRecall>,
    language: Option<&'a LanguageProvider>,
    jobs: &'a [Arc<AdmittedJob>],
    activity_memories: &'a [Arc<PreparedActivityMemories>],
    activity_memory_hard_bytes: i64,
    story_enqueued: AtomicBool,
}

impl<'a> OrdinaryProjection<'a> {
    pub fn new(store: &'a Store, histories: &'a [RuntimeHistory]) -> Self {
        Self {
            store,
            histories,
            eligibility: None,
            recall: None,
            language: None,
            jobs: &[],
            activity_memories: &[],
            activity_memory_hard_bytes: 0,
            story_enqueued: AtomicBool::new(false),
        }
    }

    pub(crate) fn with_conversation_jobs(mut self, jobs: &'a [Arc<AdmittedJob>]) -> Self {
        self.jobs = jobs;
        self
    }

    /// The saver can publish this wake only after this same transaction is
    /// confirmed and the accepted prefix is acknowledged.
    pub(crate) fn story_enqueued(&self) -> bool {
        self.story_enqueued.load(Ordering::Relaxed)
    }

    pub(crate) fn with_activity_memories(
        mut self,
        memories: &'a [Arc<PreparedActivityMemories>],
        hard_bytes: i64,
    ) -> Self {
        self.activity_memories = memories;
        self.activity_memory_hard_bytes = hard_bytes;
        self
    }

    pub fn with_projections(
        mut self,
        eligibility: Option<&'a RuntimeHistoryCuts>,
        recall: Option<&'a PreparedRecall>,
        language: Option<&'a LanguageProvider>,
    ) -> Self {
        self.eligibility = eligibility;
        self.recall = recall;
        self.language = language;
        self
    }

    /// Check while the exact candidate can still be rolled back. Protected
    /// personal edits and erasures still have their own projection owner.
    pub fn validate_candidate(
        store: &Store,
        changes: &ChangedRows,
        history: &RuntimeHistory,
    ) -> StoreResult<Option<Arc<PreparedActivityMemories>>> {
        if unsupported_rows(changes) || expiry::missing_proof(changes, history) {
            return Err(StoreError::DerivedProjectionRequired);
        }
        // A malformed authored policy must refuse before this candidate
        // enters the ordinary save queue. Unobserved changes have no story
        // authority and need no policy read here.
        if history
            .accounts()
            .any(|account| history.story_principal(account.actor_id).is_some())
        {
            store.story_policy(history)?;
        }
        store.prepare_activity_memories(changes, history)
    }
}

fn unsupported_rows(changes: &ChangedRows) -> bool {
    let leaf = changes
        .writes
        .keys()
        .chain(changes.deletes.keys())
        .any(|table| {
            matches!(
                table.as_str(),
                "mind_summaries" | "mind_forgotten" | "mind_corrections" | "mind_privacy_revisions"
            )
        });
    let awareness_update = changes
        .writes
        .get("mind_awareness")
        .is_some_and(|rows| rows.iter().any(|row| !row.create));
    let memory_edit = changes.deletes.contains_key(activity_results::TABLE)
        || changes
            .writes
            .get(activity_results::TABLE)
            .is_some_and(|rows| rows.iter().any(|row| !row.create));
    leaf || awareness_update
        || memory_edit
        || [
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
        if unsupported_rows(&rows.changes)
            || rows.changes.writes.contains_key("mind_awareness") != self.recall.is_some()
            || self
                .histories
                .iter()
                .any(|history| history.accounts().next().is_some())
                != self.eligibility.is_some()
        {
            return Err(StoreError::DerivedProjectionRequired);
        }
        self.store
            .expire_sensory(transaction, rows, self.histories)
            .await?;
        self.store
            .append_originals(transaction, rows, self.histories)
            .await?;
        if let Some(cuts) = self.eligibility {
            let language = self.language.ok_or(StoreError::DerivedProjectionRequired)?;
            let compare = |left: &str, right: &str| language.compare_utf8(left, right);
            let story_enqueued = self
                .store
                .append_perspectives(transaction, rows, self.histories, cuts, &compare)
                .await?;
            self.story_enqueued.store(story_enqueued, Ordering::Relaxed);
        }
        Ok(())
    }

    async fn after_records(
        &self,
        transaction: &Transaction<'_>,
        rows: &SaveRows,
        _revision: u64,
    ) -> StoreResult<()> {
        if let Some(recall) = self.recall {
            self.store.write_recall(transaction, rows, recall).await?;
        }
        if !self.activity_memories.is_empty()
            || rows.changes.writes.contains_key(activity_results::TABLE)
        {
            self.store
                .write_activity_memories(
                    transaction,
                    rows,
                    self.activity_memories,
                    self.activity_memory_hard_bytes,
                )
                .await?;
        }
        for job in self.jobs {
            self.store.write_conversation_job(transaction, job).await?;
        }
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

    /// Place the selected, still-eligible personal accounts for the same
    /// append written by `append_originals`. Cold reading can recover each
    /// reference from its own awareness or canonical received receipt.
    /// This helper leaves authored narration selection to its caller.
    pub(crate) async fn append_perspectives(
        &self,
        transaction: &Transaction<'_>,
        rows: &SaveRows,
        histories: &[RuntimeHistory],
        cuts: &RuntimeHistoryCuts,
        compare: &KeyOrder<'_>,
    ) -> StoreResult<bool> {
        if cuts.binding() != (&rows.world_id, &rows.generation, rows.through_cut) {
            return Err(StoreError::StaleCut);
        }
        let _head = self
            .budget
            .reserve(8192)
            .map_err(|_| StoreError::Capacity)?;
        let mut prepared = Vec::with_capacity(64);
        let current = histories.last().ok_or(StoreError::StaleCut)?;
        // Capture the latest authored policy once per prefix. Event-time
        // subject fields occur only in the individual admitted captures.
        let story_policy = if histories.iter().any(|history| {
            history
                .accounts()
                .any(|account| current.story_principal(account.actor_id).is_some())
        }) {
            self.story_policy(current)?
        } else {
            None
        };
        let mut stories = Vec::new();

        for history in histories {
            let count = history.originals().len();
            let _index = self
                .budget
                .reserve(count.checked_mul(160).ok_or(StoreError::Capacity)?)
                .map_err(|_| StoreError::Capacity)?;
            let mut originals: std::collections::HashMap<_, _> = history
                .originals()
                .map(|original| (original.event().id.as_str(), (original, None)))
                .collect();
            if originals.len() != count {
                return Err(StoreError::InvalidRecord);
            }
            let eligible = cuts
                .eligible_accounts(history)
                .ok_or(StoreError::StaleCut)?;
            for (account, allowed) in history.accounts().zip(eligible) {
                let (original, revision) = originals
                    .get_mut(account.event_id)
                    .ok_or(StoreError::InvalidRecord)?;
                if !allowed {
                    continue;
                }
                if account.awareness_payload.is_some() {
                    let bound = (account.actor_id.len() + account.event_id.len())
                        .checked_mul(7)
                        .and_then(|n| n.checked_add(256))
                        .ok_or(StoreError::Capacity)?;
                    let _key = self
                        .budget
                        .reserve(bound)
                        .map_err(|_| StoreError::Capacity)?;
                    let id = openlegend_simulation::encoding::json_record(&[
                        "world",
                        "experience",
                        "awareness",
                        account.actor_id,
                        account.event_id,
                    ])
                    .map_err(|_| StoreError::InvalidRecord)?;
                    if [&rows.changes.deletes, &rows.changes.expired]
                        .iter()
                        .any(|table| {
                            table
                                .get("mind_awareness")
                                .is_some_and(|rows| rows.contains(&id))
                        })
                    {
                        continue;
                    }
                }
                let perspective = Perspective::prepare(
                    account,
                    original,
                    revision
                        .get_or_insert_with(|| perspective::digest(original.payload().as_bytes())),
                    event_position(original)?,
                    compare,
                    &self.budget,
                )?;
                if let Some(policy) = &story_policy
                    && let Some(owner) = current.story_principal(account.actor_id)
                    && let Some(story) = policy.candidate(
                        self,
                        history,
                        owner,
                        original.event(),
                        account,
                        &perspective,
                    )?
                {
                    stories.push(story);
                }
                prepared.push(perspective);
                if prepared.len() == 64 {
                    Self::insert_perspectives(transaction, &rows.world_id, &prepared).await?;
                    prepared.clear();
                }
            }
        }
        if !prepared.is_empty() {
            Self::insert_perspectives(transaction, &rows.world_id, &prepared).await?;
        }
        self.append_stories(transaction, &rows.world_id, stories, compare)
            .await
    }

    async fn insert_perspectives(
        transaction: &Transaction<'_>,
        world: &str,
        rows: &[Perspective<'_>],
    ) -> StoreResult<()> {
        let mut sql = String::from(
            "INSERT INTO history_perspectives
            (world_id,event_id,actor_id,payload,position,event_type,source_id,target_id,speech_peer_id,
             response_action,temporal_life,temporal_epoch,temporal_batch_order,temporal_entry_index) VALUES ",
        );
        let mut params: Vec<(&(dyn ToSql + Sync), Type)> = vec![(&world, Type::TEXT)];
        for (index, row) in rows.iter().enumerate() {
            if index != 0 {
                sql.push(',');
            }
            sql.push_str("($1");
            for index in params.len() + 1..=params.len() + 13 {
                write!(&mut sql, ",${index}").expect("string write");
            }
            sql.push(')');
            params.extend([
                (&row.event as &(dyn ToSql + Sync), Type::TEXT),
                (&row.actor, Type::TEXT),
                (&row.payload, Type::TEXT),
                (&row.position, Type::INT8),
                (&row.event_type, Type::TEXT),
                (&row.source, Type::TEXT),
                (&row.target, Type::TEXT),
                (&row.speech_peer, Type::TEXT),
                (&row.conversation_relevant, Type::BOOL),
                (&row.temporal_life, Type::INT8),
                (&row.temporal_epoch, Type::TEXT),
                (&row.temporal_batch, Type::INT8),
                (&row.temporal_entry, Type::INT8),
            ]);
        }
        let written = transaction.execute_typed(&sql, &params).await?;
        if written != rows.len() as u64 {
            return Err(StoreError::StaleCut);
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

fn event_position(row: &OriginalOccurrence) -> StoreResult<i64> {
    let event = row.event();
    sql_ordinal(event.order.unwrap_or_else(|| {
        event
            .id
            .rsplit('-')
            .next()
            .and_then(|tail| tail.parse::<u64>().ok())
            .filter(|id| *id > 0)
            .unwrap_or(event.sequence)
    }))
}

struct HistoryRow<'a> {
    id: &'a str,
    position: i64,
    payload: &'a str,
    response_id: Option<Cow<'a, str>>,
    references: Vec<&'a str>,
    utterance_id: Option<Cow<'a, str>>,
}

impl<'a> HistoryRow<'a> {
    fn from_original(row: &'a OriginalOccurrence) -> StoreResult<Self> {
        let event = row.event();
        let position = event_position(row)?;
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
                // A reference can match only an ID representable as PostgreSQL
                // text. The canonical payload independently preserves prose.
                if let EventScalar::Text(reference) = value
                    && let Some(reference) = postgres_text(reference)
                    && reference != event.id
                    && seen.insert(reference)
                {
                    references.push(reference);
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
