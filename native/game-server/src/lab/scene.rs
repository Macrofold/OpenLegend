//! Alter the physical presence of the single human actor bound to this grant.
use super::{LabOperator, LabRuntime};
use crate::{
    access_http::{access_failure, refusal},
    authority::AccessError,
    world::WorldError,
};
use axum::{
    Extension, Json, Router,
    extract::{DefaultBodyLimit, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::post,
};
use serde::Deserialize;
use std::sync::Arc;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Participation {
    present: bool,
    expected_revision: u64,
}

pub(super) fn router() -> Router<Arc<LabRuntime>> {
    Router::new()
        .route("/scene/participation", post(participate))
        .layer(DefaultBodyLimit::max(1024))
}

async fn participate(
    State(lab): State<Arc<LabRuntime>>,
    Extension(op): Extension<LabOperator>,
    Json(input): Json<Participation>,
) -> Response {
    match crate::embodiment::lab_participation(
        &lab.game,
        &lab.saves,
        &op.authority,
        &op.scope,
        &lab.presence,
        lab.grace,
        input.expected_revision,
        input.present,
    )
    .await
    {
        Ok(outcome) => (
            if outcome.ok {
                StatusCode::OK
            } else {
                StatusCode::CONFLICT
            },
            Json(outcome),
        )
            .into_response(),
        Err(WorldError::Access(e)) => access_failure(e),
        Err(WorldError::Simulation(e)) if e.stale_reason() == Some("participation") => refusal(
            StatusCode::CONFLICT,
            "changed",
            "Your character's physical presence changed. Refresh the Lab.",
        ),
        Err(WorldError::Commit(crate::store::CommitError::RolledBack(crate::store::StoreError::StaleCut))) | Err(WorldError::Storage(crate::store::StoreError::StaleCut))=> access_failure(AccessError::Changed),
        Err(_) => access_failure(AccessError::Availability),
    }
}
