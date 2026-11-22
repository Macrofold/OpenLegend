//! Private pages and exact receipts use the existing durable inventions.
//! Neither query has admission, execution or spending authority.

use super::{MAX_SAFE_INTEGER, Store, StoreError, StoreResult, read::admitted_query};
use crate::{authority::RequestScope, player_events::SpeechReplyStatus as JobStatus};
use openlegend_simulation::{
    encoding::{json_record, json_tree_allocation_bound},
    host::{ByteBudget, ByteReservation},
    text::JsText,
};
use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;

pub(crate) mod reuse;

pub(crate) const PAGE_SIZE: usize = 50;

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct InventionCursor {
    pub created_at: i64,
    pub id: String,
}

impl InventionCursor {
    pub fn valid(&self) -> bool {
        (0..=MAX_SAFE_INTEGER as i64).contains(&self.created_at)
            && crate::npc::valid_request_id(&self.id)
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct InventionJob {
    pub id: String,
    kind: String,
    pub created_at: i64,
    pub status: JobStatus,
    pub message: JsText,
    authority: Option<InventionAuthority>,
    pub request: InventionRequest,
    pub invention: Option<InventionResult>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct InventionAuthority {
    account_id: String,
    world_id: String,
    actor_id: String,
    timeline_id: String,
}

#[derive(Deserialize)]
pub(crate) struct InventionRequest {
    pub text: JsText,
    pub invention: InventionSource,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct InventionSource {
    actor_id: String,
    world_id: String,
    pub timeline_id: String,
    pub conversation_id: Option<String>,
    pub candidate: Option<Box<RawValue>>,
    pub mode: Option<String>,
    pub root_id: String,
    pub continuation: Option<InventionContinuation>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct InventionContinuation {
    pub parent_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct InventionResult {
    pub code: String,
    pub candidate: Option<Box<RawValue>>,
    pub candidate_digest: Option<String>,
    pub validation: Option<Box<RawValue>>,
    pub continued_by: Option<String>,
    pub recipe_id: Option<String>,
    pub search: Option<InventionSearch>,
}

#[derive(Deserialize)]
pub(crate) struct InventionSearch {
    pub status: String,
    pub message: JsText,
    pub matches: Vec<InventionMatch>,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct InventionMatch {
    pub recipe_id: String,
    pub digest: String,
    pub version: u64,
    name: JsText,
    description: JsText,
    materials: JsText,
    behavior: JsText,
    #[serde(skip_serializing_if = "Option::is_none")]
    score: Option<f64>,
}

impl InventionJob {
    pub fn belongs_to_receipt(&self, scope: &RequestScope) -> bool {
        self.request.invention.world_id == scope.world_id
            && self.request.invention.actor_id == scope.actor_id
            && self.request.invention.timeline_id == scope.timeline_id
            && self.authority.as_ref().is_some_and(|saved| {
                saved.world_id == scope.world_id
                    && saved.actor_id == scope.actor_id
                    && saved.account_id == scope.account_id
                    && saved.timeline_id == scope.timeline_id
            })
    }
}

pub(crate) struct InventionPage {
    pub jobs: Vec<InventionJob>,
    _custody: ByteReservation,
}

pub(crate) enum InventionReceipt {
    Unknown,
    Unavailable,
    Recorded {
        job: Box<InventionJob>,
        _custody: ByteReservation,
    },
}

impl Store {
    /// Select one current-format primary key. The returned body owns its
    /// decoded allocation after the fixed SQL snapshot and transfer end.
    pub(crate) async fn invention_receipt(&self, id: String) -> StoreResult<InventionReceipt> {
        let budget = self.budget.clone();
        self.read_operational(move |tx| Box::pin(async move {
            let (_transfer, rows) = admitted_query(
                tx,
                "SELECT CASE WHEN selection->>'kind'='invention' THEN payload END FROM jobs WHERE id=$1",
                &[&id],
                &budget,
            ).await?;
            let Some(row) = rows.first() else {
                return Ok(InventionReceipt::Unknown);
            };
            let Some(body) = row.try_get::<_, Option<&str>>(0)? else {
                return Ok(InventionReceipt::Unavailable);
            };
            let custody = decode_allowance(&budget, body, size_of::<InventionJob>())?;
            let job = decode(body, &id, None)?;
            Ok(InventionReceipt::Recorded { job: Box::new(job), _custody: custody })
        })).await
    }

    /// Preserve the existing actor/world history index and timestamp/ID
    /// boundary. Retained earlier timelines stay visible to the same actor;
    /// their present-day recipe proofs are checked separately in the world.
    pub(crate) async fn invention_page(
        &self,
        world: &str,
        actor: &str,
        before: Option<InventionCursor>,
    ) -> StoreResult<InventionPage> {
        let budget = self.budget.clone();
        let world_key = json_record(world).map_err(|_| StoreError::InvalidRecord)?;
        let actor_key = json_record(actor).map_err(|_| StoreError::InvalidRecord)?;
        let world = world.to_owned();
        let actor = actor.to_owned();
        let before = before.unwrap_or_else(|| InventionCursor {
            created_at: MAX_SAFE_INTEGER as i64,
            id: "\u{ffff}".into(),
        });
        self.read_operational(move |tx| {
            Box::pin(async move {
                let (_transfer, rows) = admitted_query(
                    tx,
                    "SELECT id,created_at,payload FROM jobs
                 WHERE (selection #>> '{request,invention,worldId}')=$1
                   AND (selection #>> '{request,invention,actorId}')=$2
                   AND (created_at,id)<($3,$4)
                 ORDER BY created_at DESC,id DESC LIMIT $5",
                    &[
                        &world_key,
                        &actor_key,
                        &before.created_at,
                        &before.id,
                        &(PAGE_SIZE as i64),
                    ],
                    &budget,
                )
                .await?;
                let mut custody = budget.reserve(0).map_err(|_| StoreError::Capacity)?;
                let heap = rows
                    .len()
                    .checked_mul(size_of::<InventionJob>())
                    .ok_or(StoreError::Capacity)?;
                custody.resize(heap).map_err(|_| StoreError::Capacity)?;
                let mut jobs = Vec::with_capacity(rows.len());
                for row in &rows {
                    let body = row.try_get::<_, &str>(2)?;
                    custody
                        .merge(decode_allowance(&budget, body, 0)?)
                        .map_err(|_| StoreError::Capacity)?;
                    let job = decode(body, row.try_get(0)?, Some(row.try_get(1)?))?;
                    if job.request.invention.world_id != world
                        || job.request.invention.actor_id != actor
                    {
                        return Err(StoreError::InvalidRecord);
                    }
                    jobs.push(job);
                }
                Ok(InventionPage {
                    jobs,
                    _custody: custody,
                })
            })
        })
        .await
    }
}

fn decode(body: &str, id: &str, created_at: Option<i64>) -> StoreResult<InventionJob> {
    let job: InventionJob = serde_json::from_str(body).map_err(|_| StoreError::InvalidRecord)?;
    if job.kind != "invention"
        || job.id != id
        || !(0..=MAX_SAFE_INTEGER as i64).contains(&job.created_at)
        || created_at.is_some_and(|created_at| job.created_at != created_at)
    {
        return Err(StoreError::InvalidRecord);
    }
    Ok(job)
}

fn decode_allowance(budget: &ByteBudget, body: &str, fixed: usize) -> StoreResult<ByteReservation> {
    let bytes = json_tree_allocation_bound(body)
        .and_then(|bytes| bytes.checked_add(fixed))
        .ok_or(StoreError::InvalidRecord)?;
    budget.reserve(bytes).map_err(|_| StoreError::Capacity)
}
