//! Retain a small outcome after the native job finishes. Checkpoints, people,
//! conversation inputs and private stage payloads stay with their native owners.
use super::{LabOperator, LabRuntime};
#[path = "replay.rs"]
mod replay;
use crate::{
    access_http::{access_failure, refusal},
    authority::{Capability, assert_saved_grant},
    npc::valid_request_id,
    player_events::SpeechReplyStatus,
    store::{CommitError, JobRequest, Store, StoreError},
};
use axum::{
    Extension, Json, Router,
    extract::{DefaultBodyLimit, Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{delete, get, post},
};
use openlegend_simulation::encoding::json_record_digest;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use uuid::Uuid;

pub(super) fn router() -> Router<Arc<LabRuntime>> {
    Router::new()
        .route("/runs", get(list).post(retain))
        .route("/runs/{id}", delete(remove))
        .route("/runs/{id}/replay/{load}", post(replay::repeat))
        .route("/comparisons", post(compare))
        .layer(DefaultBodyLimit::max(4096))
}

/// Create only Lab-owned operational tables in the separately opened Lab
/// database. A native checkpoint restore replaces gameplay data alone.
pub(super) async fn initialize(store: &Store) -> Result<(), CommitError> {
    store
        .operational(|tx| {
            Box::pin(async move {
                tx.batch_execute(
                    "CREATE SCHEMA IF NOT EXISTS cognition_lab;
             CREATE TABLE IF NOT EXISTS cognition_lab.retained_runs (
                owner text NOT NULL, id text NOT NULL, sequence bigint GENERATED ALWAYS AS IDENTITY,
                summary text NOT NULL CHECK (octet_length(summary)<=2048),
                source_checksum text, stimulus_checksum text NOT NULL,
                PRIMARY KEY(owner,id)
             );
             CREATE INDEX IF NOT EXISTS retained_runs_owner_sequence
                 ON cognition_lab.retained_runs(owner,sequence DESC);
             CREATE INDEX IF NOT EXISTS retained_runs_origin
                 ON cognition_lab.retained_runs ((summary::jsonb->>'originId'))
                 WHERE source_checksum IS NOT NULL;",
                )
                .await?;
                Ok(())
            })
        })
        .await
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Retain {
    id: Uuid,
    label: String,
    job_id: String,
    load_id: Option<Uuid>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Run {
    id: Uuid,
    label: String,
    job_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    origin_id: Option<Uuid>,
    #[serde(skip_serializing_if = "Option::is_none")]
    load_id: Option<Uuid>,
    status: SpeechReplyStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    stage: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    dispatched: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    received: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    applied: Option<bool>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Page {
    before: Option<i64>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Pair {
    left: Uuid,
    right: Uuid,
}

pub(super) fn scoped_owner(operator: &LabOperator) -> Result<String, StoreError> {
    grant_owner(&operator.scope)
}
pub(super) fn grant_owner(
    selected: &crate::authority::AuthorizedScope,
) -> Result<String, StoreError> {
    let host = selected.lab_host_scope().ok_or(StoreError::StaleCut)?;
    let lab = &selected.scope;
    // A new browser session can reopen its own notes; a replacement grant or
    // character cannot inherit them. Both databases own independent grants.
    json_record_digest(&(
        selected.lab_permit().and_then(|permit|permit.origin()),
        &host.world_id,
        &host.account_id,
        &host.actor_id,
        host.grant_revision,
        &lab.world_id,
        &lab.account_id,
        &lab.actor_id,
        lab.grant_revision,
    ))
    .map_err(|_| StoreError::InvalidRecord)
}

/// Match the operator's intended speech. Delivery, event IDs and provider
/// results describe the outcome and can legitimately differ across restores.
fn stimulus_digest(kind: &str, request: &JobRequest) -> Result<String, StoreError> {
    let composer = request
        .composer
        .as_ref()
        .map(|source| (&source.actor_id, &source.target_id));
    json_record_digest(&(
        kind,
        &request.npc_id,
        &request.text,
        &request.volume,
        composer,
    ))
    .map_err(|_| StoreError::InvalidRecord)
}

fn unavailable() -> Response {
    refusal(
        StatusCode::SERVICE_UNAVAILABLE,
        "library-unavailable",
        "The Lab Library is unavailable.",
    )
}

fn missing() -> Response {
    refusal(
        StatusCode::NOT_FOUND,
        "run-unavailable",
        "The selected run is unavailable.",
    )
}

fn publish(operator: &LabOperator, lab: &LabRuntime, value: impl Serialize) -> Response {
    operator
        .current(Capability::Inspect, || {
            match crate::wire::encode(&value, b"", b"", lab.game.host.budget()) {
                Ok(bytes) => crate::player_http::json_response(StatusCode::OK, bytes),
                Err(_) => unavailable(),
            }
        })
        .unwrap_or_else(access_failure)
}

async fn retain(
    State(lab): State<Arc<LabRuntime>>,
    Extension(operator): Extension<LabOperator>,
    Json(input): Json<Retain>,
) -> Response {
    if let Err(error) = operator
        .current(Capability::Save, || ())
        .and_then(|()| operator.current(Capability::Inspect, || ()))
    {
        return access_failure(error);
    }
    if input.label.trim().is_empty()
        || input.label.chars().count() > 80
        || input.label.chars().any(char::is_control)
        || !valid_request_id(&input.job_id)
    {
        return refusal(
            StatusCode::BAD_REQUEST,
            "invalid-run",
            "Supply a job ID and a label of 1 to 80 characters.",
        );
    }
    let Ok(owner) = scoped_owner(&operator) else {
        return unavailable();
    };
    let scope = &operator.scope.scope;
    let record = match lab.game.store.conversation_job(&input.job_id).await {
        Ok(Some(record)) => record,
        Ok(None) => return missing(),
        Err(_) => return unavailable(),
    };
    let job = &record.job;
    if !job
        .authority
        .as_ref()
        .is_some_and(|source| source.recovery_fields() == scope.recovery_fields())
    {
        return missing();
    }
    if !job.status.terminal() {
        return refusal(
            StatusCode::CONFLICT,
            "run-active",
            "Wait for the conversation job to finish.",
        );
    }
    let restored = match lab.game.store.restored_checkpoint_source(scope).await {
        Ok(source) => source,
        Err(_) => return unavailable(),
    };
    if input.load_id.is_some() && input.load_id != restored.as_ref().map(|source| source.0) {
        return refusal(
            StatusCode::CONFLICT,
            "origin-unavailable",
            "This run belongs to a different restore.",
        );
    }
    let outcome = job.outcome.as_ref();
    let run = Run {
        id: input.id,
        label: input.label.trim().to_owned(),
        job_id: input.job_id,
        origin_id: restored.as_ref().map(|source| source.1),
        load_id: restored.as_ref().map(|source| source.0),
        status: job.status,
        stage: outcome.map(|detail| detail.stage.clone()),
        dispatched: outcome.map(|detail| detail.dispatched),
        received: outcome.map(|detail| detail.received),
        applied: outcome.map(|detail| detail.applied),
    };
    let Ok(body) = serde_json::to_string(&run) else {
        return unavailable();
    };
    // The digest is internal. Equality describes only the authored stimulus,
    // including addressee and volume. The model may have seen different context.
    let Ok(stimulus) = stimulus_digest(&job.kind, &job.request) else {
        return unavailable();
    };
    let checksum = restored.map(|source| source.2);
    let id = input.id.to_string();
    let writer = operator.clone();
    let result = lab.game.store.operational(move |tx| Box::pin(async move {
        assert_saved_grant(tx, &writer.scope.scope, "save").await?;
        assert_saved_grant(tx, &writer.scope.scope, "inspect").await?;
        let current: bool = tx.query_one(
            "SELECT EXISTS (SELECT 1 FROM meta WHERE key='integration:world-timeline:' || $1::text
             AND value::jsonb = to_jsonb($2::text))",
            &[&writer.scope.scope.world_id, &writer.scope.scope.timeline_id],
        ).await?.try_get(0)?;
        if !current { return Err(StoreError::StaleCut); }
        let created = tx.execute(
            "INSERT INTO cognition_lab.retained_runs (owner,id,summary,source_checksum,stimulus_checksum)
             VALUES ($1,$2,$3,$4,$5) ON CONFLICT (owner,id) DO NOTHING",
            &[&owner,&id,&body,&checksum,&stimulus],
        ).await? != 0;
        let matches = created || tx.query_one(
            "SELECT summary=$3 AND source_checksum IS NOT DISTINCT FROM $4 AND stimulus_checksum=$5
             FROM cognition_lab.retained_runs WHERE owner=$1 AND id=$2",
            &[&owner,&id,&body,&checksum,&stimulus],
        ).await?.try_get::<_, bool>(0)?;
        writer.current(Capability::Save, || ()).and_then(|()| writer.current(Capability::Inspect, || ()))
            .map_err(|_| StoreError::StaleCut)?;
        Ok(matches)
    })).await;
    match result {
        Ok(true) => publish(&operator, &lab, json!({"run":run})),
        Ok(false) => refusal(
            StatusCode::CONFLICT,
            "run-id-used",
            "That run ID is already in use.",
        ),
        Err(_) => unavailable(),
    }
}

fn summary(row: &tokio_postgres::Row) -> Result<Run, StoreError> {
    serde_json::from_str(row.try_get::<_, &str>("summary")?).map_err(|_| StoreError::InvalidRecord)
}

async fn list(
    State(lab): State<Arc<LabRuntime>>,
    Extension(operator): Extension<LabOperator>,
    Query(page): Query<Page>,
) -> Response {
    if let Err(error) = operator.current(Capability::Inspect, || ()) {
        return access_failure(error);
    }
    let Ok(owner) = scoped_owner(&operator) else {
        return unavailable();
    };
    let current_load = match lab
        .game
        .store
        .restored_checkpoint_source(&operator.scope.scope)
        .await
    {
        Ok(source) => source.map(|source| source.0),
        Err(_) => return unavailable(),
    };
    const PAGE: usize = 50;
    let budget = lab.game.host.budget().clone();
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Listing {
        runs: Vec<Run>,
        next: Option<i64>,
        current_load_id: Option<Uuid>,
    }

    let before = page.before.unwrap_or(i64::MAX);
    let result = lab
        .game
        .store
        .read_operational(move |tx| {
            Box::pin(async move {
                // The CHECK constraint bounds each stored summary at 2 KiB. The page
                // owns the SQL values and decoded strings until the wire buffer takes over.
                let custody = budget
                    .reserve((PAGE + 1) * 6144)
                    .map_err(|_| StoreError::Capacity)?;
                let rows = tx.query(
            "SELECT sequence,summary FROM cognition_lab.retained_runs WHERE owner=$1 AND sequence<$2
             ORDER BY sequence DESC LIMIT $3", &[&owner,&before,&(PAGE as i64 + 1)],
        ).await?;
                let runs = rows
                    .iter()
                    .take(PAGE)
                    .map(summary)
                    .collect::<Result<Vec<_>, _>>()?;
                let next = if rows.len() > PAGE {
                    Some(rows[PAGE - 1].try_get::<_, i64>("sequence")?)
                } else {
                    None
                };
                Ok((runs, next, custody))
            })
        })
        .await;
    match result {
        Ok((runs, next, _custody)) => publish(
            &operator,
            &lab,
            Listing {
                runs,
                next,
                current_load_id: current_load,
            },
        ),
        Err(_) => unavailable(),
    }
}

async fn remove(
    State(lab): State<Arc<LabRuntime>>,
    Extension(operator): Extension<LabOperator>,
    Path(id): Path<Uuid>,
) -> Response {
    if let Err(error) = operator.current(Capability::Save, || ()) {
        return access_failure(error);
    }
    let Ok(owner) = scoped_owner(&operator) else {
        return unavailable();
    };
    let id = id.to_string();
    let writer = operator.clone();
    match lab
        .game
        .store
        .operational(move |tx| {
            Box::pin(async move {
                assert_saved_grant(tx, &writer.scope.scope, "save").await?;
                tx.execute(
                    "DELETE FROM cognition_lab.retained_runs WHERE owner=$1 AND id=$2",
                    &[&owner, &id],
                )
                .await?;
                writer
                    .current(Capability::Save, || ())
                    .map_err(|_| StoreError::StaleCut)
            })
        })
        .await
    {
        Ok(()) => operator
            .current(Capability::Save, || {
                Json(json!({"ok":true})).into_response()
            })
            .unwrap_or_else(access_failure),
        Err(_) => unavailable(),
    }
}

async fn compare(
    State(lab): State<Arc<LabRuntime>>,
    Extension(operator): Extension<LabOperator>,
    Json(pair): Json<Pair>,
) -> Response {
    if let Err(error) = operator.current(Capability::Inspect, || ()) {
        return access_failure(error);
    }
    if pair.left == pair.right {
        return refusal(
            StatusCode::BAD_REQUEST,
            "duplicate-run",
            "Choose two different runs.",
        );
    }
    let Ok(owner) = scoped_owner(&operator) else {
        return unavailable();
    };
    let ids = [pair.left.to_string(), pair.right.to_string()];
    let result = lab.game.store.read_operational(move |tx| Box::pin(async move {
        let rows = tx.query(
            "SELECT summary,source_checksum,stimulus_checksum FROM cognition_lab.retained_runs
             WHERE owner=$1 AND id = ANY($2) ORDER BY array_position($2,id)",
            &[&owner,&&ids[..]],
        ).await?;
        let [a,b] = rows.as_slice() else { return Ok(None) };
        let (left,right) = (summary(a)?,summary(b)?);
        let source = a.try_get::<_,Option<&str>>("source_checksum")?;
        let same_checkpoint = left.origin_id.is_some() && left.origin_id == right.origin_id
            && source.is_some() && source == b.try_get("source_checksum")?;
        let independent_restores = same_checkpoint && left.load_id != right.load_id;
        let same_stimulus = a.try_get::<_,&str>("stimulus_checksum")? == b.try_get::<_,&str>("stimulus_checksum")?;
        Ok(Some(json!({"left":left,"right":right,"sameCheckpoint":same_checkpoint,"independentRestores":independent_restores,"effectiveInputs":"unverified","sameStimulus":same_stimulus})))
    })).await;
    match result {
        Ok(Some(pair)) => publish(&operator, &lab, pair),
        Ok(None) => missing(),
        Err(_) => unavailable(),
    }
}
