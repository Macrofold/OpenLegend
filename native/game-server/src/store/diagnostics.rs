//! Read the ledger and operational job records already owned by Rust. Never
//! load a conversation body for a list, or issue a provider request to inspect
//! a past stage. All related rows come from one independently held snapshot.

use super::{Store, StoreError, StoreResult, TerminalOutcome, durable_head, read::admitted_query};
use crate::player_events::SpeechReplyStatus;
use openlegend_simulation::host::{ByteBudget, ByteReservation};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio_postgres::Row;

const PAGE: usize = 25;
// Match the explicit Intelligence history and stage bounds (LA198, LA202).
const HISTORY: i64 = 1_000;
const STAGES: i64 = 1_000;

const ROOT_ACCESS: &str = "((j.selection#>>'{authority,accountId}'=$1 \
    AND j.selection#>>'{authority,worldId}'=$2 \
    AND j.selection->>'kind' IN ('chat','action')) OR \
    (j.selection->>'kind'='thought' AND j.selection#>>'{authority,accountId}' IS NULL \
    AND j.selection->>'npcId'=ANY($3::text[])))";

const ROOT_HEADER: &str = "j.id,j.created_at,(j.selection->>'completedAt')::bigint, \
    j.selection->>'kind',j.selection->>'status', \
    COALESCE(j.selection#>>'{authority,actorId}',j.selection->>'npcId'), \
    j.selection#>>'{authority,accountId}' IS NOT NULL";

const ROOT_COLUMNS: &str = "stats.level,stats.stages,stats.settled,stats.incomplete";

const ROLLUP: &str = "LEFT JOIN LATERAL (SELECT max(l.level) AS level,count(a.id) AS stages, \
    COALESCE(sum(a.spent) FILTER (WHERE a.status='settled'),0)::bigint AS settled, \
    COALESCE(bool_or(a.status<>'settled'),false) AS incomplete \
    FROM cognition_attempt_links l JOIN attempts a ON a.id=l.attempt_id WHERE l.root_job_id=j.id) stats ON true";

const ATTEMPT_COLUMNS: &str = "a.id,l.stage,l.level,a.provider,a.status,a.created_at, \
    a.reserved,a.spent,l.dispatch_intent,a.receipt";

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ListRequest {
    #[serde(default)]
    pub offset: i64,
    #[serde(default)]
    pub peek: bool,
    pub search: Option<String>,
    pub actor: Option<String>,
    pub route: Option<String>,
    pub outcome: Option<String>,
    pub stage: Option<String>,
    pub from: Option<String>,
    pub to: Option<String>,
}

pub(crate) enum Query {
    List(ListRequest),
    Trigger(String),
    Billing(String),
}

pub(crate) struct ReadAccess {
    pub account: String,
    pub world: String,
    pub world_key: String,
    pub generation: String,
    pub people: Vec<String>,
    pub search_names: Vec<String>,
    pub matching_people: Vec<String>,
    _storage: ByteReservation,
}

impl ReadAccess {
    pub(crate) fn new(
        account: String,
        world: String,
        world_key: String,
        generation: String,
        storage: ByteReservation,
    ) -> Self {
        Self {
            account,
            world,
            world_key,
            generation,
            people: Vec::new(),
            search_names: Vec::new(),
            matching_people: Vec::new(),
            _storage: storage,
        }
    }

    pub(crate) fn admit(&mut self, size: usize) -> StoreResult<()> {
        let reserved = self
            ._storage
            .bytes()
            .checked_add(size)
            .ok_or(StoreError::Capacity)?;
        self._storage
            .resize(reserved)
            .map_err(|_| StoreError::Capacity)
    }
}

pub(crate) struct Selection {
    pub roots: Vec<Root>,
    pub attempts: Vec<Attempt>,
    pub has_more: bool,
    pub stages_truncated: bool,
    _storage: ByteReservation,
}

pub(crate) struct Root {
    pub id: String,
    pub started_at: i64,
    pub completed_at: Option<i64>,
    pub kind: String,
    pub status: SpeechReplyStatus,
    pub actor_key: String,
    pub owned: bool,
    pub level: Option<i32>,
    pub stage_count: i64,
    pub settled_micro_usd: i64,
    pub cost_incomplete: bool,
    pub outcome: Option<TerminalOutcome>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Attempt {
    pub id: String,
    pub stage: String,
    pub level: Option<i32>,
    pub provider: String,
    pub status: String,
    pub created_at: i64,
    pub reserved_micro_usd: i64,
    pub ledger_committed_micro_usd: i64,
    pub dispatch_intent: bool,
    pub receipt: Option<SavedReceipt>,
}

/// Decode only the receipt fields already permitted in this operational view.
/// Context hashes, deployment proof, prompt, reply and provider error bodies
/// are outside the projection. A missing amount or token count stays missing.
#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SavedReceipt {
    pub model: String,
    pub requested_model: String,
    pub model_version_status: String,
    pub provider_request_id: Option<String>,
    pub started_at: String,
    pub completed_at: String,
    pub latency_ms: f64,
    pub dispatched: bool,
    pub transport_started: bool,
    pub response_received: bool,
    pub completion_uncertain: bool,
    pub http_status: Option<u16>,
    pub provider_error_code: Option<String>,
    pub macrofold_billing_mode: Option<String>,
    pub estimated_cost_usd: Option<f64>,
    pub usage: Option<Usage>,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Usage {
    input_tokens: u64,
    output_tokens: u64,
}

impl Store {
    /// Admit the exact selected job headers and any explicitly requested
    /// attempt bodies. The returned read has its own reservation even after
    /// the PostgreSQL session and its row buffers close.
    pub(crate) async fn intelligence(
        &self,
        query: Arc<Query>,
        access: Arc<ReadAccess>,
    ) -> StoreResult<Selection> {
        let budget = self.budget.clone();
        self.read_isolated(move |tx| Box::pin(async move {
        let head = durable_head(tx).await?.ok_or(StoreError::StaleCut)?;
        if head.world_id != access.world || head.generation != access.generation {
            return Err(StoreError::StaleCut);
        }
        let ReadAccess { account, world_key, people, search_names, matching_people, .. } = access.as_ref();
        let (root_transfer, rows) = match query.as_ref() {
            Query::List(input) if input.peek => {
                let statement = format!("SELECT {ROOT_HEADER},NULL::integer,0::bigint,0::bigint,false \
                    FROM jobs j WHERE {ROOT_ACCESS} ORDER BY j.created_at DESC,j.id DESC LIMIT 1");
                admitted_query(tx, &statement, &[account, world_key, people], &budget).await?
            }
            Query::List(input) => {
                let limit = (PAGE + 1) as i64;
                let offset = input.offset;
                let from = millis(input.from.as_deref())?;
                let to = millis(input.to.as_deref())?;
                let actor_filter = input.actor.is_some();
                let search = &input.search;
                let route = &input.route;
                let outcome = &input.outcome;
                let stage = &input.stage;
                let statement = format!("WITH recent AS (
                    SELECT j.id,j.created_at,j.selection FROM jobs j WHERE {ROOT_ACCESS}
                    ORDER BY j.created_at DESC,j.id DESC LIMIT $4
                ), page AS (
                    SELECT j.id,j.created_at,j.selection FROM recent j
                    WHERE ($5::bigint IS NULL OR j.created_at >= $5)
                    AND ($6::bigint IS NULL OR j.created_at <= $6)
                    AND (NOT $7::boolean OR coalesce(j.selection#>>'{{authority,actorId}}',j.selection->>'npcId')=ANY($8::text[]))
                    AND ($9::text IS NULL OR strpos(lower(concat_ws(' ',j.id,j.selection->>'kind',j.selection->>'status')),lower($9))>0
                        OR coalesce(j.selection#>>'{{authority,actorId}}',j.selection->>'npcId')=ANY($10::text[]))
                    AND ($11::text IS NULL OR EXISTS(SELECT 1 FROM cognition_attempt_links l WHERE l.root_job_id=j.id
                        AND strpos(concat('level',l.level),lower(replace($11,' ','')))>0 AND l.level IS NOT NULL))
                    AND ($12::text IS NULL OR strpos(j.selection->>'status',replace(lower($12),'canceled','cancel'))>0
                        OR (j.selection->>'status' IN ('queued','judging','generating') AND lower($12)='pending')
                        OR (j.selection->>'status' IN ('failed','cancelled','stale') AND lower($12)='failed'))
                    AND ($13::text IS NULL OR EXISTS(SELECT 1 FROM cognition_attempt_links l WHERE l.root_job_id=j.id
                        AND strpos(lower(l.stage),lower($13))>0))
                    ORDER BY j.created_at DESC,j.id DESC LIMIT $14 OFFSET $15
) SELECT {ROOT_HEADER},{ROOT_COLUMNS} FROM page j
                {ROLLUP} ORDER BY j.created_at DESC,j.id DESC");
                admitted_query(tx, &statement,
                    &[account,world_key,people,&HISTORY,&from,&to,&actor_filter,
                        matching_people,search,search_names,route,outcome,stage,&limit,&offset],
                    &budget,
                ).await?
            }
            Query::Trigger(id) | Query::Billing(id) => {
                let billing = matches!(query.as_ref(), Query::Billing(_));
                let statement = format!("SELECT {ROOT_HEADER},{ROOT_COLUMNS},CASE WHEN $5 THEN NULL ELSE j.payload END \
                    FROM jobs j {ROLLUP} WHERE {ROOT_ACCESS} AND j.id=CASE WHEN $5 \
                    THEN (SELECT root_job_id FROM cognition_attempt_links WHERE attempt_id=$4) ELSE $4 END");
                admitted_query(tx, &statement, &[account,world_key,people,id,&billing], &budget).await?
            }
        };
        let has_more = rows.len() > PAGE;
        let mut storage = independent(&budget, &root_transfer)?;
        let roots: Vec<_> = rows.iter()
            .take(PAGE + 1)
            .map(|row| root(row, matches!(query.as_ref(), Query::Trigger(_))))
            .collect::<Result<_, _>>()?;
        drop(rows);
        drop(root_transfer);
        let mut attempts = Vec::new();
        let mut stages_truncated = false;
        if let Some(root) = roots.first() {
            let selected = match query.as_ref() {
                Query::List(_) => None,
                Query::Trigger(_) => Some(None),
                Query::Billing(id) => Some(Some(id)),
            };
            if let Some(selected) = selected {
                let statement = format!("SELECT {ATTEMPT_COLUMNS} FROM cognition_attempt_links l \
                    JOIN attempts a ON a.id=l.attempt_id WHERE l.root_job_id=$1 \
                    AND ($2::text IS NULL OR a.id=$2) ORDER BY a.created_at,a.id LIMIT $3");
                let limit = if selected.is_some() { 1 } else { STAGES + 1 };
                let (transfer, rows) = admitted_query(
                    tx, &statement, &[&root.id,&selected,&limit], &budget,
                ).await?;
                storage.merge(independent(&budget, &transfer)?).map_err(|_| StoreError::Capacity)?;
                stages_truncated = rows.len() > (STAGES as usize);
                attempts = rows.iter().take(STAGES as usize).map(attempt).collect::<Result<_, _>>()?;
            }
        }
        Ok(Selection { roots, attempts, has_more, stages_truncated, _storage: storage })
        })).await
    }
}

pub(crate) fn millis(date: Option<&str>) -> StoreResult<Option<i64>> {
    date.map(|value| {
        chrono::DateTime::parse_from_rfc3339(value)
            .map(|date| date.timestamp_millis())
            .map_err(|_| StoreError::InvalidRecord)
    })
    .transpose()
}

fn independent(budget: &ByteBudget, transfer: &ByteReservation) -> StoreResult<ByteReservation> {
    budget
        .reserve(transfer.bytes())
        .map_err(|_| StoreError::Capacity)
}

fn root(row: &Row, detail: bool) -> StoreResult<Root> {
    #[derive(Deserialize)]
    struct Detail {
        outcome: Option<TerminalOutcome>,
    }
    let kind: String = row.try_get(3)?;
    let status = match row.try_get::<_, &str>(4)? {
        "queued" => SpeechReplyStatus::Queued,
        "judging" => SpeechReplyStatus::Judging,
        "generating" => SpeechReplyStatus::Generating,
        "completed" => SpeechReplyStatus::Completed,
        "failed" => SpeechReplyStatus::Failed,
        "cancelled" => SpeechReplyStatus::Cancelled,
        "stale" => SpeechReplyStatus::Stale,
        _ => return Err(StoreError::InvalidRecord),
    };
    let outcome = if detail {
        let value: &str = row.try_get(11)?;
        // The current canonical TEXT can contain isolated UTF-16 units. Only
        // the terminal outcome is decoded; unknown fields stay skipped.
        serde_json::from_str::<Detail>(value)
            .map_err(|_| StoreError::InvalidRecord)?
            .outcome
    } else {
        None
    };
    Ok(Root {
        id: row.try_get(0)?,
        started_at: row.try_get(1)?,
        completed_at: row.try_get(2)?,
        kind,
        status,
        actor_key: row.try_get(5)?,
        owned: row.try_get(6)?,
        level: row.try_get(7)?,
        stage_count: row.try_get(8)?,
        settled_micro_usd: row.try_get(9)?,
        cost_incomplete: row.try_get(10)?,
        outcome,
    })
}

fn attempt(row: &Row) -> StoreResult<Attempt> {
    let receipt = row
        .try_get::<_, Option<&str>>(9)?
        .map(serde_json::from_str)
        .transpose()
        .map_err(|_| StoreError::InvalidRecord)?;
    Ok(Attempt {
        id: row.try_get(0)?,
        stage: row.try_get(1)?,
        level: row.try_get(2)?,
        provider: row.try_get(3)?,
        status: row.try_get(4)?,
        created_at: row.try_get(5)?,
        reserved_micro_usd: row.try_get(6)?,
        ledger_committed_micro_usd: row.try_get(7)?,
        dispatch_intent: row.try_get(8)?,
        receipt,
    })
}
