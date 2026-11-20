//! Player-facing spending and job status are operational reads. They neither
//! capture a live world nor expose another resident's private work.

use super::{Store, StoreError, StoreResult, read::admitted_query};
use crate::{
    authority::RequestScope,
    player_events::{SpeechReply, SpeechReplyStatus},
    player_view::{
        AccountAmount, AiBudget, AiJob, AiMode, AiUsage, AiView, ViewTelemetry,
        profile::{PlayerProfile, profile},
    },
};
use indexmap::IndexMap;
use openlegend_simulation::{encoding::json_record, host::ByteReservation, text::JsText};
use serde::Deserialize;
use std::sync::Arc;

#[derive(Clone, Copy)]
pub(crate) struct AiDisplay {
    pub jev_configured: bool,
    pub llm_configured: bool,
    pub limit_usd: f64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct JobScope {
    account_id: String,
    actor_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Job {
    id: String,
    kind: String,
    status: SpeechReplyStatus,
    message: JsText,
    authority: Option<JobScope>,
    player_speech_event_id: Option<String>,
    request: JobRequest,
    queue_latency_ms: Option<f64>,
    total_latency_ms: Option<f64>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct JobRequest {
    npc_id: Option<String>,
    invention: Option<InventionScope>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct InventionScope {
    actor_id: String,
}

impl Store {
    /// Read the finite recent job window, current scoped usage, and account
    /// settings in one independent read-only snapshot. Each decoded product
    /// keeps its own custody after the transaction ends.
    pub(crate) async fn player_view_input(
        self: &Arc<Self>,
        scope: &RequestScope,
        display: AiDisplay,
    ) -> StoreResult<(ViewTelemetry, PlayerProfile)> {
        let account = scope.account_id.clone();
        let actor = scope.actor_id.clone();
        let world = scope.world_id.clone();
        let budget = self.budget.clone();
        let store = Arc::clone(self);
        self.read_operational(move |tx| {
            Box::pin(async move {
                let (mut charges, rows) = admitted_query(
                    tx,
                    "WITH recent AS (SELECT id, payload, selection, created_at FROM jobs \
                         ORDER BY created_at DESC,id DESC LIMIT 12) \
                     SELECT recent.payload,h.payload AS speech_origin FROM recent \
                     LEFT JOIN history_events h ON h.world_id=$1 \
                       AND h.id=((recent.selection->>'playerSpeechEventId')::json #>> '{}') \
                     ORDER BY recent.created_at DESC,recent.id DESC",
                    &[&world],
                    &budget,
                )
                .await?;
                let mut jobs = Vec::with_capacity(rows.len());
                for row in &rows {
                    let payload: &str = row.try_get(0)?;
                    let job: Job =
                        serde_json::from_str(payload).map_err(|_| StoreError::InvalidRecord)?;
                    let allowed = match &job.authority {
                        Some(owner) => owner.account_id == account && owner.actor_id == actor,
                        None => job.request.invention.as_ref().is_some_and(|target| target.actor_id == actor)
                            || (job.kind == "thought" && job.request.npc_id.as_deref() == Some(&actor))
                            || (job.player_speech_event_id.is_some() && own_speech(row.try_get::<_, Option<&str>>(1)?, &actor)?),
                    };
                    if !allowed {
                        continue;
                    }
                    let message = if job.kind == "thought" {
                        let status = json_record(&job.status).map_err(|_| StoreError::InvalidRecord)?;
                        format!("Resident reconsideration: {}.", status.trim_matches('"')).into()
                    } else {
                        job.message
                    };
                    jobs.push(AiJob {
                        id: job.id, kind: job.kind, status: job.status, message,
                        queue_latency_ms: job.queue_latency_ms, total_latency_ms: job.total_latency_ms,
                    });
                }
                let usage_row = tx.query_one(
                    "WITH utc AS (SELECT date_trunc('month', now() AT TIME ZONE 'UTC') AS start), \
                     reports AS (SELECT a.provider,a.status,a.spent,a.reserved,a.created_at,a.id, \
                       a.receipt::json -> 'usage' AS usage, (a.receipt::json ->> 'dispatched')::bool AS dispatched, \
                       (a.receipt::json ->> 'latencyMs')::float8 AS latency \
                     FROM attempts a JOIN attempt_scopes s ON s.attempt_id=a.id, utc \
                     WHERE s.actor_id=$1 AND a.created_at >= extract(epoch from utc.start)*1000) \
                     SELECT (SELECT to_char(start, 'YYYY-MM') FROM utc), \
                         coalesce(sum(spent),0)::bigint,coalesce(sum(reserved) FILTER(WHERE status='reserved'),0)::bigint, \
                         count(*) FILTER(WHERE provider='jev' AND dispatched), \
                         count(*) FILTER(WHERE provider='openai' AND dispatched), \
                         coalesce(sum((usage->>'inputTokens')::bigint),0)::bigint, \
                         coalesce(sum((usage->>'outputTokens')::bigint),0)::bigint, \
                         coalesce((SELECT latency FROM reports WHERE latency IS NOT NULL ORDER BY created_at DESC,id DESC LIMIT 1),0), \
                         count(*) FROM reports",
                    &[&actor],
                ).await?;
                let integer = |index| super::ordinal(usage_row.try_get::<_, i64>(index)?);
                let spent = integer(1)? as f64 / 1_000_000.0;
                let reserved = integer(2)? as f64 / 1_000_000.0;
                let has_usage = integer(8)? > 0;
                let period = usage_row.try_get(0)?;
                let usage = AiUsage { jev_calls: integer(3)?, llm_calls: integer(4)?, input_tokens: integer(5)?,
                    output_tokens: integer(6)?, last_latency_ms: usage_row.try_get(7)? };
                drop(usage_row);
                let problem = jobs.iter().find(|job| matches!(job.status, SpeechReplyStatus::Failed | SpeechReplyStatus::Completed))
                    .filter(|job| job.status == SpeechReplyStatus::Failed);
                let (mode, message): (AiMode, JsText) = if !display.jev_configured {
                    (AiMode::Unconfigured, "Configure backend AI credentials and a spending cap. Macrofold native execution also needs an owner-selected MACROFOLD_WORKER_ID; direct inference does not.".into())
                } else if let Some(problem) = problem {
                    (AiMode::Degraded, problem.message.clone())
                } else {
                    (AiMode::Live, "Jev routes bounded decisions. LLMs handle conversation, reconsideration and new recipes.".into())
                };
                let extra = budget.reserve(4096).map_err(|_| StoreError::Capacity)?;
                charges.merge(extra).map_err(|_| StoreError::Capacity)?;
                // Drop PostgreSQL carriers before the selected read leaves.
                drop(rows);
                let retained = jobs.iter().try_fold(
                    4096 + std::mem::size_of::<AiJob>() * jobs.capacity()
                        + message.storage_bytes(),
                    |size, job| size.checked_add(job.id.capacity())?
                        .checked_add(job.kind.capacity())?
                        .checked_add(job.message.storage_bytes()),
                ).ok_or(StoreError::Capacity)?;
                charges.resize(retained).map_err(|_| StoreError::Capacity)?;
                let profile = profile(&store, tx, account, &world, &actor, &budget).await?;
                let mut accounts = IndexMap::new();
                if has_usage {
                    accounts.insert(actor, AccountAmount { spent_usd: spent, reserved_usd: reserved });
                }
                let ai = AiView {
                    mode,
                    jev_configured: display.jev_configured,
                    llm_configured: display.llm_configured,
                    message,
                    jobs,
                    budget: AiBudget { limit_usd: display.limit_usd, spent_usd: spent, reserved_usd: reserved,
                        estimated: true, per_agent: Some(true), period: Some(period), accounts: Some(accounts) },
                    usage,
                };
                Ok((ViewTelemetry { ai, custody: charges }, profile))
            })
        }).await
    }
}

impl Store {
    /// Read only reply outcomes bound to the exact player-authored speech
    /// selected by the accepted view. No event or job body leaves the store.
    pub(crate) async fn player_speech_replies<'a>(
        &self,
        scope: &RequestScope,
        selected: impl Iterator<Item = &'a str>,
    ) -> StoreResult<Option<(IndexMap<String, SpeechReply>, ByteReservation)>> {
        let mut ids = Vec::new();
        let mut parameters = self.budget.reserve(0).map_err(|_| StoreError::Capacity)?;
        for id in selected {
            let bytes = parameters
                .bytes()
                .checked_add(512 + 4 * id.len())
                .ok_or(StoreError::Capacity)?;
            parameters.resize(bytes).map_err(|_| StoreError::Capacity)?;
            ids.push(json_record(id).map_err(|_| StoreError::InvalidRecord)?);
        }
        if ids.is_empty() {
            return Ok(None);
        }
        let budget = self.budget.clone();
        let account = scope.account_id.clone();
        let actor = scope.actor_id.clone();
        self.read_operational(move |tx| {
            Box::pin(async move {
                let (mut custody, rows) = admitted_query(
                    tx,
                    "SELECT payload FROM jobs WHERE (selection #>> '{playerSpeechEventId}')=ANY($1) \
                     AND (selection #>> '{kind}')='chat' ORDER BY created_at DESC,id DESC",
                    &[&ids],
                    &budget,
                ).await?;
                drop(parameters);
                let mut result = IndexMap::new();
                for row in &rows {
                    let payload: &str = row.try_get(0)?;
                    let job: Job = serde_json::from_str(payload).map_err(|_| StoreError::InvalidRecord)?;
                    let Some(id) = job.player_speech_event_id else { return Err(StoreError::InvalidRecord) };
                    if job.authority.as_ref().is_some_and(|owner| owner.account_id != account || owner.actor_id != actor) {
                        continue;
                    }
                    result.entry(id).or_insert(SpeechReply { id: job.id, status: job.status, message: job.message });
                }
                drop(rows);
                if result.is_empty() {
                    return Ok(None);
                }
                let bytes = result.iter().try_fold(
                    openlegend_simulation::host::map_storage::<String, SpeechReply>(result.capacity()).ok_or(StoreError::Capacity)?,
                    |bytes, (event, job)| bytes.checked_add(event.capacity())?
                        .checked_add(job.id.capacity())?.checked_add(job.message.storage_bytes()),
                ).ok_or(StoreError::Capacity)?;
                custody.resize(bytes).map_err(|_| StoreError::Capacity)?;
                Ok(Some((result, custody)))
            })
        }).await
    }
}

fn own_speech(payload: Option<&str>, actor: &str) -> StoreResult<bool> {
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct Speaker<'a> {
        actor_id: Option<&'a str>,
    }
    payload
        .map(|text| {
            let event: Speaker<'_> =
                serde_json::from_str(text).map_err(|_| StoreError::InvalidRecord)?;
            Ok(event.actor_id == Some(actor))
        })
        .transpose()
        .map(|allowed| allowed.unwrap_or(false))
}
