//! The existing durable spending ledger admits one provider attempt. A lost
//! response keeps its obligation and never authorizes another submission.

use super::{
    CommitError, Store, StoreError, StoreResult,
    recall::semantic::SemanticClaim,
    reflection::{ReflectionCue, ReflectionScope},
};
use crate::{authority::now_ms, provider_transport::deployment::ModelExecutionProof};
use openlegend_simulation::{encoding::json_record, identity::MAX_SAFE_INTEGER};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

enum AttemptClaim {
    Semantic(Arc<SemanticClaim>),
    Reflection(Arc<ReflectionScope>, ReflectionCue),
    EscalatedDecision {
        fingerprint: String,
        kind: &'static str,
        level_ceiling: u64,
        rejected: Option<String>,
    },
}

#[derive(Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum InferenceClass {
    Jev,
    OpenAi,
}

impl InferenceClass {
    fn sql(self) -> &'static str {
        match self {
            Self::Jev => "jev",
            Self::OpenAi => "openai",
        }
    }
}

pub(crate) struct AttemptRequest {
    pub id: String,
    pub actor: String,
    pub job: String,
    pub provider: InferenceClass,
    pub category: &'static str,
    pub stage: &'static str,
    pub level: Option<i32>,
    pub background: bool,
    pub amount: u64,
    pub ceiling: u64,
}

pub(crate) enum AttemptAdmission {
    Reserved(ReservedAttempt),
    Exhausted,
    Existing,
}

pub(crate) struct ReservedAttempt {
    id: String,
    provider: InferenceClass,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PriorReceipt {
    request_id: String,
    provider: InferenceClass,
    context_digest: String,
    dispatched: bool,
    provider_request_id: Option<String>,
    estimated_cost_usd: Option<f64>,
    macrofold_billing_mode: Option<String>,
}

/// Receipt fields are observed facts. No raw provider error or payload can
/// enter this type. An estimated amount remains distinct from paid admission.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ModelReceipt {
    #[serde(flatten)]
    pub proof: ModelExecutionProof,
    pub request_id: String,
    pub provider: InferenceClass,
    pub requested_model: String,
    pub model: String,
    pub model_version_status: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider_request_id: Option<String>,
    pub context_digest: String,
    pub provider_request_digest: String,
    pub started_at: String,
    pub completed_at: String,
    pub latency_ms: f64,
    pub dispatched: bool,
    pub transport_started: bool,
    pub response_received: bool,
    pub completion_uncertain: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub http_status: Option<u16>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider_error_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub retry_after_ms: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub macrofold_billing_mode: Option<&'static str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub usage: Option<ModelUsage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub estimated_cost_usd: Option<f64>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ModelUsage {
    pub input_tokens: u64,
    pub output_tokens: u64,
}

fn sql_microusd(value: u64) -> StoreResult<i64> {
    if value <= MAX_SAFE_INTEGER {
        Ok(value as i64)
    } else {
        Err(StoreError::InvalidRecord)
    }
}

fn microusd(value: f64) -> StoreResult<i64> {
    let amount = (value * 1_000_000.0).round();
    if amount.is_finite() && value >= 0.0 && amount <= MAX_SAFE_INTEGER as f64 {
        Ok(amount as i64)
    } else {
        Err(StoreError::InvalidRecord)
    }
}

async fn exposure(tx: &tokio_postgres::Transaction<'_>, actor: &str) -> StoreResult<i64> {
    let row = tx.query_one(
        "SELECT coalesce(sum(a.spent + CASE WHEN a.status='reserved' THEN a.reserved ELSE 0 END),0)::bigint \
         FROM attempts a LEFT JOIN attempt_scopes s ON s.attempt_id=a.id \
         WHERE a.created_at >= extract(epoch from date_trunc('month', now() AT TIME ZONE 'UTC'))*1000 \
         AND (s.actor_id=$1 OR s.actor_id IS NULL)",
        &[&actor],
    ).await?;
    let result = row.try_get::<_, i64>(0)?;
    sql_microusd(super::ordinal(result)?)
}

impl Store {
    pub(crate) async fn conversation_transfers(&self, job: &str) -> StoreResult<(bool, bool)> {
        let job = job.to_owned();
        self.read_operational(move |tx| Box::pin(async move {
            let row = tx.query_one(
                "SELECT coalesce(bool_or((a.receipt::json->>'transportStarted')::bool),false), \
                 coalesce(bool_or((a.receipt::json->>'responseReceived')::bool),false) \
                 FROM cognition_attempt_links l JOIN attempts a ON a.id=l.attempt_id WHERE l.root_job_id=$1",
                &[&job],
            ).await?;
            Ok((row.try_get(0)?, row.try_get(1)?))
        })).await
    }

    pub(crate) async fn model_allowance(
        &self,
        actor: &str,
        amount: u64,
        ceiling: u64,
    ) -> StoreResult<bool> {
        let amount = sql_microusd(amount)?;
        let ceiling = sql_microusd(ceiling)?;
        let actor = actor.to_owned();
        self.read_operational(move |tx| {
            Box::pin(async move {
                Ok(exposure(tx, &actor)
                    .await?
                    .checked_add(amount)
                    .is_some_and(|sum| sum <= ceiling))
            })
        })
        .await
    }

    pub(crate) async fn reserve_model(
        &self,
        request: AttemptRequest,
    ) -> Result<AttemptAdmission, CommitError> {
        self.reserve_for_model(request, None).await
    }

    pub(crate) async fn reserve_claimed_model(
        &self,
        request: AttemptRequest,
        claim: Option<Arc<SemanticClaim>>,
    ) -> Result<AttemptAdmission, CommitError> {
        self.reserve_for_model(request, claim.map(AttemptClaim::Semantic))
            .await
    }

    pub(crate) async fn reserve_reflection_model(
        &self,
        request: AttemptRequest,
        scope: Arc<ReflectionScope>,
        cue: Option<ReflectionCue>,
    ) -> Result<AttemptAdmission, CommitError> {
        self.reserve_for_model(request, cue.map(|cue| AttemptClaim::Reflection(scope, cue)))
            .await
    }

    /// Fund the one direct higher answer for the exact unfinished root
    /// after every preceding linked execution is known terminal.
    pub(crate) async fn reserve_escalated_decision(
        &self,
        request: AttemptRequest,
        fingerprint: String,
        kind: &'static str,
        level_ceiling: u64,
        rejected: Option<&str>,
    ) -> Result<AttemptAdmission, CommitError> {
        if !matches!(kind, "thought" | "chat") || (kind == "chat" && rejected.is_some()) {
            return Err(CommitError::RolledBack(StoreError::InvalidRecord));
        }
        // This bounded copy is only needed when custody reaches SQL.
        let _custody = self
            .budget
            .reserve(rejected.map_or(0, str::len))
            .map_err(|_| CommitError::RolledBack(StoreError::Capacity))?;
        self.reserve_for_model(
            request,
            Some(AttemptClaim::EscalatedDecision {
                fingerprint,
                kind,
                level_ceiling,
                rejected: rejected.map(str::to_owned),
            }),
        )
        .await
    }

    async fn reserve_for_model(
        &self,
        request: AttemptRequest,
        claim: Option<AttemptClaim>,
    ) -> Result<AttemptAdmission, CommitError> {
        let amount = sql_microusd(request.amount).map_err(CommitError::RolledBack)?;
        let ceiling = sql_microusd(request.ceiling).map_err(CommitError::RolledBack)?;
        if amount <= 0
            || request.actor.is_empty()
            || request.actor.len() > 160
            || request.id.is_empty()
            || request.id.len() > 512
            || request.job.is_empty()
        {
            return Err(CommitError::RolledBack(StoreError::InvalidRecord));
        }
        self.operational(move |tx| Box::pin(async move {
            if tx.query_opt("SELECT id FROM attempts WHERE id=$1", &[&request.id]).await?.is_some() {
                return Ok(AttemptAdmission::Existing);
            }
            if let Some(AttemptClaim::EscalatedDecision { level_ceiling, .. }) = &claim
                && request.amount > *level_ceiling
            {
                return Ok(AttemptAdmission::Exhausted);
            }
            if exposure(tx, &request.actor).await?.checked_add(amount).is_none_or(|sum| sum > ceiling) {
                return Ok(AttemptAdmission::Exhausted);
            }
            let claimed = match claim {
                Some(AttemptClaim::Semantic(claim)) =>
                    claim.scope.actor == request.actor && claim.take(tx, &request.id).await?,
                Some(AttemptClaim::Reflection(scope, cue)) =>
                    scope.actor == request.actor && scope.attempt == request.id && scope.take_cue(tx, &cue).await?,
                Some(AttemptClaim::EscalatedDecision { fingerprint, kind, rejected, .. }) => {
                    let actor = json_record(&request.actor).map_err(|_| StoreError::InvalidRecord)?;
                    tx.query_one(
                        "SELECT EXISTS(SELECT 1 FROM jobs WHERE id=$1 AND fingerprint=$2 \
                          AND selection->>'kind'=$4 AND selection->>'npcId'=$3 \
                          AND selection->>'status' IN ('queued','judging','generating')) \
                         AND NOT EXISTS(SELECT 1 FROM cognition_attempt_links l JOIN attempts a ON a.id=l.attempt_id \
                          WHERE l.root_job_id=$1 AND (l.level=4 OR l.stage='decision-escalation' \
                          OR COALESCE((a.receipt::json->>'completionUncertain')::bool,true))) \
                         AND ($5::text IS NULL OR EXISTS(SELECT 1 FROM response_receipts r \
                          WHERE r.world_id=(SELECT world_id FROM world_head WHERE id=1) AND r.slot=$1 \
                          AND r.payload::json#>>'{components,action,code}'=$5 \
                          AND r.payload::json#>>'{components,action,ok}'='false' \
                          AND r.payload::json#>>'{outcome,code}'='response-rejected'))",
                        &[&request.job, &fingerprint, &actor, &kind, &rejected],
                    ).await?.try_get(0)?
                }
                None => true,
            };
            if !claimed {
                return Ok(AttemptAdmission::Existing);
            }
            tx.execute(
                "INSERT INTO attempts(id,provider,status,reserved,created_at) VALUES($1,$2,'reserved',$3,$4)",
                &[&request.id, &request.provider.sql(), &amount, &now_ms()],
            ).await?;
            tx.execute("INSERT INTO attempt_scopes(attempt_id,actor_id) VALUES($1,$2)", &[&request.id, &request.actor]).await?;
            let execution = if request.background { "background" } else { "primary" };
            tx.execute(
                "INSERT INTO cognition_attempt_links(attempt_id,root_job_id,category,level,stage,execution_class) \
                 VALUES($1,$2,$3,$4,$5,$6)",
                &[&request.id,&request.job,&request.category,&request.level,&request.stage,&execution],
            ).await?;
            Ok(AttemptAdmission::Reserved(ReservedAttempt { id: request.id, provider: request.provider }))
        })).await
    }

    pub(crate) async fn model_dispatch_intent(
        &self,
        admitted: &ReservedAttempt,
    ) -> Result<bool, CommitError> {
        let id = admitted.id.clone();
        self.operational(move |tx| Box::pin(async move {
            let updated = tx.execute(
                "UPDATE cognition_attempt_links l SET dispatch_intent=true FROM attempts a \
                 WHERE a.id=l.attempt_id AND l.attempt_id=$1 AND a.status='reserved' AND NOT l.dispatch_intent",
                &[&id],
            ).await?;
            Ok(updated == 1)
        })).await
    }

    pub(crate) async fn settle_model(
        &self,
        attempt: ReservedAttempt,
        mut receipt: ModelReceipt,
    ) -> Result<(), CommitError> {
        if receipt.request_id != attempt.id || receipt.provider != attempt.provider {
            return Err(CommitError::RolledBack(StoreError::StaleCut));
        }
        let _working = self
            .budget
            .reserve(64 * 1024)
            .map_err(|_| CommitError::RolledBack(StoreError::Capacity))?;
        self.operational(move |tx| {
            Box::pin(async move {
                let row = tx
                    .query_opt(
                        "SELECT a.status,a.reserved,a.spent, \
                 CASE WHEN octet_length(a.receipt)<=32768 THEN a.receipt END, \
                 a.receipt IS NOT NULL,l.dispatch_intent \
                 FROM attempts a JOIN cognition_attempt_links l ON l.attempt_id=a.id \
                 WHERE a.id=$1 AND a.provider=$2",
                        &[&attempt.id, &attempt.provider.sql()],
                    )
                    .await?
                    .ok_or(StoreError::StaleCut)?;
                if receipt.dispatched && !row.try_get::<_, bool>(5)? {
                    return Err(StoreError::StaleCut);
                }
                let prior: Option<PriorReceipt> = row
                    .try_get::<_, Option<&str>>(3)?
                    .map(serde_json::from_str)
                    .transpose()
                    .map_err(|_| StoreError::InvalidRecord)?;
                if row.try_get::<_, bool>(4)? != prior.is_some() {
                    return Err(StoreError::InvalidRecord);
                }
                let mut charge = receipt.estimated_cost_usd.map(microusd).transpose()?;
                if let Some(prior) = prior {
                    if prior.request_id != receipt.request_id
                        || prior.provider != receipt.provider
                        || prior.context_digest != receipt.context_digest
                        || (prior.dispatched && !receipt.dispatched)
                        || (prior.provider_request_id.is_some()
                            && prior.provider_request_id != receipt.provider_request_id)
                        || prior.macrofold_billing_mode.as_deref() != receipt.macrofold_billing_mode
                    {
                        return Err(StoreError::StaleCut);
                    }
                    if row.try_get::<_, &str>(0)? == "settled"
                        && (!prior.dispatched || prior.estimated_cost_usd.is_some())
                    {
                        return Ok(());
                    }
                    charge = charge.max(prior.estimated_cost_usd.map(microusd).transpose()?);
                    receipt.estimated_cost_usd = charge.map(|value| value as f64 / 1_000_000.0);
                }
                let uncertain =
                    receipt.dispatched && (receipt.completion_uncertain || charge.is_none());
                let spent = if !receipt.dispatched {
                    0
                } else if uncertain {
                    row.try_get::<_, i64>(1)?
                        .max(row.try_get::<_, i64>(2)?)
                        .max(charge.unwrap_or_default())
                } else {
                    charge.ok_or(StoreError::InvalidRecord)?
                };
                let status = if uncertain { "uncertain" } else { "settled" };
                let body = json_record(&receipt).map_err(|_| StoreError::InvalidRecord)?;
                tx.execute(
                    "UPDATE attempts SET status=$2,spent=$3,receipt=$4 WHERE id=$1",
                    &[&attempt.id, &status, &spent, &body],
                )
                .await?;
                Ok(())
            })
        })
        .await
    }

    /// Record the original accepted Run before waiting for it. The existing
    /// ledger retains the original reservation if the process cannot establish
    /// its final outcome. It cannot grant another provider submission.
    pub(crate) async fn record_model_run(
        &self,
        admitted: &ReservedAttempt,
        mut accepted: ModelReceipt,
    ) -> Result<(), CommitError> {
        if accepted.request_id != admitted.id
            || accepted.provider != admitted.provider
            || accepted.provider_request_id.is_none()
            || !accepted.dispatched
            || accepted.response_received
        {
            return Err(CommitError::RolledBack(StoreError::InvalidRecord));
        }
        accepted.completion_uncertain = true;
        let custody = self
            .budget
            .reserve(64 * 1024)
            .map_err(|_| CommitError::RolledBack(StoreError::Capacity))?;
        let body = json_record(&accepted)
            .map_err(|_| CommitError::RolledBack(StoreError::InvalidRecord))?;
        let id = admitted.id.clone();
        self.operational(move |tx| Box::pin(async move {
            let _custody = custody;
            let updated = tx.execute(
                "UPDATE attempts a SET receipt=$2 FROM cognition_attempt_links l \
                 WHERE a.id=l.attempt_id AND a.id=$1 AND a.status='reserved' AND l.dispatch_intent AND a.receipt IS NULL",
                &[&id, &body],
            ).await?;
            if updated != 1 { return Err(StoreError::StaleCut); }
            Ok(())
        })).await
    }
}

impl ReservedAttempt {
    pub(crate) fn id(&self) -> &str {
        &self.id
    }
}
