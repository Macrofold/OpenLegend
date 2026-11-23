//! Conversations share the browser's current job and original-speech index.
//! The pending prefix owns initial admission and final gameplay application.

use super::{CommitError, Store, StoreError, StoreResult, read::admitted_query};
use crate::{authority::RequestScope, player_events::SpeechReplyStatus};
use indexmap::IndexMap;
use openlegend_simulation::{
    encoding::{json_record, json_record_len, json_tree_allocation_bound},
    host::{ByteBudget, ByteReservation},
    text::JsText,
    worlds::base_observed::SpeechVolume,
};
use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;
use std::sync::Arc;
use tokio_postgres::Transaction;

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ConversationJob {
    pub id: String,
    pub fingerprint: String,
    pub kind: String,
    pub status: SpeechReplyStatus,
    pub message: JsText,
    pub authority: Option<RequestScope>,
    pub player_speech_event_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub retry_of: Option<String>,
    pub request: JobRequest,
    pub created_at: i64,
    #[serde(skip_serializing)]
    pub completed_at: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub outcome: Option<TerminalOutcome>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TerminalOutcome {
    pub stage: String,
    pub condition: String,
    pub dispatched: bool,
    pub received: bool,
    pub applied: bool,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct JobRequest {
    pub text: JsText,
    pub npc_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub volume: Option<SpeechVolume>,
}

pub(crate) struct AdmittedJob {
    // Held in an Arc and replaced through `advance`, so its admitted byte
    // count still describes the body when a later save acquires it.
    pub job: ConversationJob,
    encoded_len: usize,
    _custody: ByteReservation,
}

impl AdmittedJob {
    /// One independently owned body can be shared by a request and its
    /// detached save. The writer derives only its finite SQL index fields.
    pub(crate) fn new(job: ConversationJob, budget: &ByteBudget) -> StoreResult<Arc<Self>> {
        let length = json_record_len(&job).map_err(|_| StoreError::InvalidRecord)?;
        if length > 64 * 1024 {
            return Err(StoreError::InvalidRecord);
        }
        let _custody = budget
            .reserve(
                length
                    .checked_mul(2)
                    .and_then(|n| n.checked_add(1024))
                    .ok_or(StoreError::Capacity)?,
            )
            .map_err(|_| StoreError::Capacity)?;
        Ok(Arc::new(Self {
            job,
            encoded_len: length,
            _custody,
        }))
    }

    pub(crate) fn advance(
        &self,
        status: SpeechReplyStatus,
        message: JsText,
        outcome: Option<TerminalOutcome>,
        budget: &ByteBudget,
    ) -> StoreResult<Arc<Self>> {
        let previous = &self.job;
        // The predecessor already owns its admitted size. Fund the new job
        // body while that accepted predecessor remains independently held.
        let copying = budget
            .reserve(self._custody.bytes())
            .map_err(|_| StoreError::Capacity)?;
        let next = ConversationJob {
            id: previous.id.clone(),
            fingerprint: previous.fingerprint.clone(),
            kind: previous.kind.clone(),
            status,
            message,
            authority: previous.authority.clone(),
            player_speech_event_id: previous.player_speech_event_id.clone(),
            retry_of: previous.retry_of.clone(),
            request: JobRequest {
                text: previous.request.text.clone(),
                npc_id: previous.request.npc_id.clone(),
                volume: previous.request.volume,
            },
            created_at: previous.created_at,
            completed_at: status.terminal().then(crate::authority::now_ms),
            outcome,
        };
        let result = Self::new(next, budget);
        drop(copying);
        result
    }
}

impl Store {
    /// Detach former-timeline speech links during the existing restore
    /// transaction. Read and update bounded pages, preserving all other job
    /// fields verbatim, including text PostgreSQL JSON cannot represent.
    pub(super) async fn detach_job_speech(&self, tx: &Transaction<'_>) -> StoreResult<()> {
        const PAGE: i64 = 64;
        let mut after = None::<String>;
        let mut cursor = self.budget.reserve(0).map_err(|_| StoreError::Capacity)?;
        loop {
            let (_transfer, rows) = admitted_query(
                tx,
                "SELECT id,payload FROM jobs WHERE ($1::text IS NULL OR id>$1) \
                 AND selection ? 'playerSpeechEventId' ORDER BY id LIMIT $2",
                &[&after, &PAGE],
                &self.budget,
            )
            .await?;
            if rows.is_empty() {
                return Ok(());
            }
            let mut working = self
                .budget
                .reserve(8192)
                .map_err(|_| StoreError::Capacity)?;
            let mut ids = Vec::with_capacity(rows.len());
            let mut payloads = Vec::with_capacity(rows.len());
            for row in &rows {
                let payload: &str = row.try_get(1)?;
                let bytes = json_tree_allocation_bound(payload)
                    .and_then(|bytes| bytes.checked_mul(2))
                    .and_then(|bytes| bytes.checked_add(working.bytes()))
                    .ok_or(StoreError::Capacity)?;
                working.resize(bytes).map_err(|_| StoreError::Capacity)?;
                let mut fields: IndexMap<String, &RawValue> =
                    serde_json::from_str(payload).map_err(|_| StoreError::InvalidRecord)?;
                fields
                    .shift_remove("playerSpeechEventId")
                    .ok_or(StoreError::InvalidRecord)?;
                ids.push(row.try_get::<_, &str>(0)?);
                payloads.push(json_record(&fields).map_err(|_| StoreError::InvalidRecord)?);
            }
            let updated = tx.execute(
                "UPDATE jobs SET payload=owned.payload,selection=selection-'playerSpeechEventId' \
                 FROM unnest($1::text[],$2::text[]) owned(id,payload) WHERE jobs.id=owned.id",
                &[&ids, &payloads],
            ).await?;
            if updated != ids.len() as u64 {
                return Err(StoreError::StaleCut);
            }
            if updated < PAGE as u64 {
                return Ok(());
            }
            let last = ids.last().ok_or(StoreError::InvalidRecord)?;
            drop(after.take());
            cursor
                .resize(last.len())
                .map_err(|_| StoreError::Capacity)?;
            after = Some((*last).to_owned());
        }
    }

    pub(crate) async fn conversation_job(&self, id: &str) -> StoreResult<Option<Arc<AdmittedJob>>> {
        let budget = self.budget.clone();
        let id = id.to_owned();
        self.read_operational(move |tx| Box::pin(async move {
            let (_transfer, rows) = admitted_query(
                tx, "SELECT payload FROM jobs WHERE id=$1 AND selection->>'kind' IN ('chat','thought','action')",
                &[&id], &budget,
            ).await?;
            rows.first().map(|row| {
                let body: &str = row.try_get(0)?;
                let job: ConversationJob = serde_json::from_str(body).map_err(|_| StoreError::InvalidRecord)?;
                if job.id != id {
                    return Err(StoreError::InvalidRecord);
                }
                AdmittedJob::new(job, &budget)
            }).transpose()
        })).await
    }

    pub(crate) async fn put_conversation_job(
        self: &Arc<Self>,
        record: Arc<AdmittedJob>,
    ) -> Result<(), CommitError> {
        let store = self.clone();
        self.operational(move |tx| {
            Box::pin(async move { store.write_conversation_job(tx, &record).await })
        })
        .await
    }

    /// An explicit retry can supersede only the latest failed attempt for
    /// this exact speech and timeline. Keep the test and the write in one
    /// transaction even though the resident slot already orders local work.
    pub(crate) async fn admit_conversation_retry(
        self: &Arc<Self>,
        record: Arc<AdmittedJob>,
        stopped: tokio::sync::watch::Receiver<bool>,
    ) -> Result<bool, CommitError> {
        if *stopped.borrow() {
            return Ok(false);
        }
        let store = self.clone();
        self.operational(move |tx| {
            Box::pin(async move {
                if *stopped.borrow() {
                    return Err(StoreError::Cancelled);
                }
                let job = &record.job;
                let scope = job.authority.as_ref().ok_or(StoreError::InvalidRecord)?;
                let original = job.retry_of.as_deref().ok_or(StoreError::InvalidRecord)?;
                let speech = job
                    .player_speech_event_id
                    .as_deref()
                    .ok_or(StoreError::InvalidRecord)?;
                let key_bytes = [
                    speech,
                    &scope.account_id,
                    &scope.actor_id,
                    &scope.world_id,
                    &scope.timeline_id,
                ]
                .into_iter()
                .map(str::len)
                .sum::<usize>();
                let _keys = store
                    .budget
                    .reserve(512 + key_bytes * 12)
                    .map_err(|_| StoreError::Capacity)?;
                let speech = json_record(speech).map_err(|_| StoreError::InvalidRecord)?;
                let scope = JobAuthority::encode(scope)?;
                let eligible: bool = tx
                    .query_one(
                        "SELECT COALESCE((SELECT id=$2 AND selection->>'status'='failed' FROM jobs \
             WHERE selection #>> '{kind}'='chat' AND selection #>> '{playerSpeechEventId}'=$1 \
             AND selection #>> '{authority,worldId}'=$3 \
             AND selection #>> '{authority,timelineId}'=$4 \
             AND selection #>> '{authority,actorId}'=$5 \
             AND selection #>> '{authority,accountId}'=$6 \
             ORDER BY created_at DESC,id DESC LIMIT 1),false)",
                        &[
                            &speech,
                            &original,
                            &scope.world_id,
                            &scope.timeline_id,
                            &scope.actor_id,
                            &scope.account_id,
                        ],
                    )
                    .await?
                    .try_get(0)?;
                drop((speech, scope, _keys));
                if !eligible {
                    return Ok(false);
                }
                if *stopped.borrow() {
                    return Err(StoreError::Cancelled);
                }
                store.write_conversation_job(tx, &record).await?;
                // The write can await a database lock after the HTTP request
                // disconnects. Refuse until COMMIT owns the outcome.
                if *stopped.borrow() {
                    return Err(StoreError::Cancelled);
                }
                Ok(true)
            })
        })
        .await
        .or_else(|error| match error {
            CommitError::RolledBack(StoreError::Cancelled) => Ok(false),
            other => Err(other),
        })
    }

    /// Reserve temporary SQL encoding space using the admitted body's exact
    /// size. The caller keeps the body reservation until the write completes.
    pub(super) async fn write_conversation_job(
        &self,
        tx: &Transaction<'_>,
        record: &AdmittedJob,
    ) -> StoreResult<()> {
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Selection<'a> {
            kind: &'a str,
            status: SpeechReplyStatus,
            #[serde(skip_serializing_if = "Option::is_none")]
            completed_at: Option<i64>,
            #[serde(skip_serializing_if = "Option::is_none")]
            player_speech_event_id: Option<String>,
            #[serde(skip_serializing_if = "Option::is_none")]
            npc_id: Option<String>,
            authority: Option<JobAuthority>,
            #[serde(skip_serializing_if = "Option::is_none")]
            display_message: Option<String>,
        }
        // Canonical TEXT plus a double-encoded display message and routing keys.
        let _working = self
            .budget
            .reserve(8 * 1024 + record.encoded_len * 8)
            .map_err(|_| StoreError::Capacity)?;
        let job = &record.job;
        let invalid = |_| StoreError::InvalidRecord;
        let mut body = json_record(job).map_err(invalid)?;
        // The shared SQL appends the final completion time and preserves
        // an already committed time. The body excludes that one field.
        body.pop();
        let event = job
            .player_speech_event_id
            .as_deref()
            .map(json_record)
            .transpose()
            .map_err(invalid)?;
        let selected = json_record(&Selection {
            kind: &job.kind,
            status: job.status,
            completed_at: job.completed_at,
            player_speech_event_id: event,
            npc_id: matches!(job.kind.as_str(), "thought" | "chat")
                .then(|| json_record(&job.request.npc_id))
                .transpose()
                .map_err(invalid)?,
            authority: job
                .authority
                .as_ref()
                .map(JobAuthority::encode)
                .transpose()?,
            display_message: (job.kind != "thought")
                .then(|| json_record(&job.message))
                .transpose()
                .map_err(invalid)?,
        })
        .map_err(invalid)?;
        if tx
            .query_opt(
                &self.schema.upsert_job,
                &[&job.id, &job.fingerprint, &body, &selected, &job.created_at],
            )
            .await?
            .is_none()
        {
            return Err(StoreError::StaleCut);
        }
        Ok(())
    }
}

/// SQL identity values carry their exact JSON string encoding. The canonical
/// job can have quoted text PostgreSQL's JSON decoder cannot represent.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct JobAuthority {
    account_id: String,
    actor_id: String,
    world_id: String,
    timeline_id: String,
}

impl JobAuthority {
    fn encode(scope: &RequestScope) -> StoreResult<Self> {
        let key = |id: &str| json_record(id).map_err(|_| StoreError::InvalidRecord);
        Ok(Self {
            account_id: key(&scope.account_id)?,
            actor_id: key(&scope.actor_id)?,
            world_id: key(&scope.world_id)?,
            timeline_id: key(&scope.timeline_id)?,
        })
    }
}
