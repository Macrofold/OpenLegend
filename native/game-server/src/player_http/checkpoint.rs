//! The save capability protects the checkpoint panel and every operator
//! action. Payloads contain only the world’s catalog summaries and policy.

use super::save_access::{authorizer, operation, publish};
use super::{PlayerRoutes, access_failure, busy, json_response, refusal, wire};
use crate::authority::{AccessError, AuthorizedScope, Capability};
use crate::launch::checkpoint_load::{LoadRequest, LoadState};
use crate::store::{
    CommitError, StoreError,
    checkpoint::{
        CaptureError, CheckpointCursor, CheckpointSettings, CreationReceipt, LoadReceipt,
        valid_checkpoint_id,
    },
};
use crate::world::WorldError;
use axum::extract::{Request, State};
use axum::http::StatusCode;
use axum::response::Response;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct CreateCheckpoint {
    #[serde(default)]
    scenario: bool,
    id: Uuid,
    label: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct CatalogRequest {
    before: Option<CheckpointCursor>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct CheckpointId {
    id: Uuid,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct DeleteCheckpoint {
    id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct LoadCheckpoint {
    #[serde(default)]
    keep_current_models: bool,
    id: String,
    request_id: Uuid,
}

#[derive(Deserialize)]
#[serde(
    tag = "operation",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
enum ReceiptRequest {
    Create {
        request_id: Uuid,
        label: String,
        timeline: String,
    },
    Load {
        request_id: Uuid,
        save_id: String,
        label: String,
        timeline: String,
    },
}

#[derive(Serialize)]
struct ReceiptResponse {
    ok: bool,
    scope: String,
    status: CreationReceipt,
    message: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<ResultMessage>,
}

#[derive(Serialize)]
struct ResultMessage {
    ok: bool,
    code: &'static str,
    message: &'static str,
}

#[derive(Serialize)]
struct Saved<T = ()> {
    ok: bool,
    message: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    autosaves: Option<T>,
}

pub(super) async fn list(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let call = match operation::<CatalogRequest>(&state, request).await {
        Ok(call) => call,
        Err(error) => return error,
    };
    if call
        .input
        .before
        .as_ref()
        .is_some_and(|cursor| !cursor.valid())
    {
        return invalid_request();
    }
    let mut listing = state.checkpoints.catalog(call.input.before).await;
    let source=match &mut listing{
        Ok(page) if call.authorized.lab_permit().is_some()=>Some(page.restrict_sources(&call.authorized,state.game.store.scenario_namespace()).await),
        _=>None,
    };
    publish(&state,source.as_ref().unwrap_or(&call.authorized), || {
        listing.map_err(|error| failure(&error))
    })
}

pub(super) async fn create(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let call = match operation::<CreateCheckpoint>(&state, request).await {
        Ok(call) => call,
        Err(error) => return error,
    };
    let label = call.input.label.trim();
    if label.is_empty() || label.encode_utf16().count() > 80 {
        return invalid_request();
    }
    let kind = match (call.input.scenario, state.authority.is_lab()) {
        (true, false) => return invalid_request(),
        (true, true) => crate::store::checkpoint::MetadataKind::Scenario,
        (false, _) => crate::store::checkpoint::MetadataKind::Manual,
    };
    let allowed = authorizer(&state, call.authorized.clone(), call.custody);
    let result = state
        .checkpoints
        .manual_checkpoint(call.input.id, label.to_owned(), kind, allowed)
        .await;
    publish(&state, &call.authorized, || {
        result.map_err(|error| failure(&error))?;
        Ok(Saved::<()> {
            ok: true,
            message: "Game saved.",
            autosaves: None,
        })
    })
}

pub(super) async fn delete(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let call = match operation::<DeleteCheckpoint>(&state, request).await {
        Ok(call) => call,
        Err(error) => return error,
    };
    let permit=if call.authorized.lab_permit().is_some(){
        match state.checkpoints.authorized_source(&call.authorized,&call.input.id).await{
            Ok(scope)=>Arc::new(scope),Err(error)=>return access_failure(error),
        }
    }else{call.authorized.clone()};
    let allowed=authorizer(&state,permit.clone(),call.custody);
    let result = if call.input.id == "before-load" {
        state.checkpoints.delete_pre_load(allowed).await
    } else if let Ok(id) = Uuid::parse_str(&call.input.id) {
        state.checkpoints.delete(id, allowed).await
    } else {
        return invalid_request();
    };
    publish(&state, &permit, || {
        result.map_err(|error| failure(&error))?;
        Ok(Saved::<()> {
            ok: true,
            message: "Save deleted.",
            autosaves: None,
        })
    })
}

pub(super) async fn receipt(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let call = match operation::<ReceiptRequest>(&state, request).await {
        Ok(call) => call,
        Err(error) => return error,
    };
    let (request_id, label, timeline) = match call.input {
        ReceiptRequest::Create {
            request_id,
            label,
            timeline,
        } => (request_id, label, timeline),
        ReceiptRequest::Load {
            request_id,
            save_id,
            label,
            timeline,
        } => {
            return load_receipt(
                &state,
                &call.authorized,
                request_id,
                &save_id,
                &label,
                &timeline,
            )
            .await;
        }
    };
    let label = label.trim();
    if timeline.is_empty()
        || timeline.len() > 200
        || label.is_empty()
        || label.encode_utf16().count() > 80
    {
        return invalid_request();
    }
    let observed = state
        .checkpoints
        .creation_receipt(request_id, label.to_owned())
        .await;
    publish(&state, &call.authorized, || {
        let status = observed.map_err(|error| failure(&error))?;
        let scope = call.authorized.scope.key().map_err(|_| busy())?;
        let message = match status {
            CreationReceipt::Resolved => "The original checkpoint was created.",
            CreationReceipt::Pending => {
                "The original checkpoint is still being created. Nothing was resubmitted."
            }
            CreationReceipt::Unknown => {
                "The original checkpoint has no confirmed published result. Nothing was resubmitted."
            }
        };
        Ok(ReceiptResponse {
            ok: true,
            scope,
            status,
            message,
            result: matches!(status, CreationReceipt::Resolved).then_some(ResultMessage {
                ok: true,
                code: "saved",
                message,
            }),
        })
    })
}

const LOADED: &str = "The checkpoint was loaded. The world opened paused.";
const REFUSED_LOAD: &str = "The checkpoint could not be loaded. The previous world was kept.";
const LOAD_PENDING: &str = "The original load is still in progress. Nothing was resubmitted.";
const LOAD_CONFLICT: &str = "The saved checkpoint does not match the original load request.";

pub(super) async fn load(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let call = match operation::<LoadCheckpoint>(&state, request).await {
        Ok(call) => call,
        Err(response) => return response,
    };
    if !valid_checkpoint_id(&call.input.id) {
        return invalid_request();
    }
    let authorized = if call.authorized.lab_permit().is_some() {
        match state.checkpoints.authorized_source(&call.authorized,&call.input.id).await {
            Ok(scope)=>Arc::new(scope),Err(error)=>return access_failure(error),
        }
    }else{call.authorized.clone()};
    let models = if call.input.keep_current_models {
        let Some(control) = state.decisions.lab_controls() else { return invalid_request(); };
        let selected = control.settings();
        if !selected.validate(&state.decisions.lab_model_choices()) { return invalid_request(); }
        Some(selected)
    } else { None };
    let observed = state
        .game
        .store
        .load_receipt(
            &authorized.scope,
            call.input.request_id,
            &call.input.id,
            None,
            Some(call.input.keep_current_models),
        )
        .await;
    match state.authority.current(
        &authorized,
        Capability::Save,
        false,
        |_, _| match observed {
            Ok(LoadReceipt::Completed) => {
                let result = ResultMessage {
                    ok: true,
                    code: "loaded",
                    message: LOADED,
                };
                match wire::encode(&result, b"", b"", state.game.host.budget()) {
                    Ok(bytes) => json_response(StatusCode::OK, bytes),
                    Err(_) => busy(),
                }
            }
            Ok(LoadReceipt::Conflict) => {
                refusal(StatusCode::CONFLICT, "idempotency-conflict", LOAD_CONFLICT)
            }
            Ok(LoadReceipt::Missing) => match state.loads.submit(LoadRequest {
                id: call.input.request_id,
                slot: call.input.id,
                models,
                authorized: authorized.clone(),
                custody: call.custody,
            }) {
                Ok(LoadState::Pending) => refusal(StatusCode::ACCEPTED, "pending", LOAD_PENDING),
                Ok(LoadState::Refused) => refusal(StatusCode::CONFLICT, "loading", REFUSED_LOAD),
                Ok(LoadState::Conflict) => {
                    refusal(StatusCode::CONFLICT, "idempotency-conflict", LOAD_CONFLICT)
                }
                Ok(LoadState::Missing) => unreachable!("the load was admitted or refused"),
                Err(()) => refusal(
                    StatusCode::CONFLICT,
                    "deferred",
                    "Another checkpoint is loading. Try again after it finishes.",
                ),
            },
            Err(error) => failure(&CaptureError::from(error)),
        },
    ) {
        Ok(response) => response,
        Err(error) => access_failure(error),
    }
}

async fn load_receipt(
    state: &PlayerRoutes,
    authorized: &AuthorizedScope,
    request_id: Uuid,
    slot: &str,
    label: &str,
    timeline: &str,
) -> Response {
    if !valid_checkpoint_id(slot)
        || timeline.is_empty()
        || timeline.len() > 200
        || label.is_empty()
        || label.encode_utf16().count() > 80
    {
        return invalid_request();
    }
    let observed = state
        .game
        .store
        .load_receipt(&authorized.scope, request_id, slot, Some(timeline), None)
        .await;
    publish(state, authorized, || {
        let prior = observed.map_err(|error| failure(&CaptureError::from(error)))?;
        let conflict = || refusal(StatusCode::CONFLICT, "idempotency-conflict", LOAD_CONFLICT);
        let (status, message, result) = match prior {
            LoadReceipt::Completed => (
                CreationReceipt::Resolved,
                LOADED,
                Some(ResultMessage {
                    ok: true,
                    code: "loaded",
                    message: LOADED,
                }),
            ),
            LoadReceipt::Conflict => return Err(conflict()),
            LoadReceipt::Missing => match state
                .loads
                .status(&authorized.scope, request_id, slot, timeline)
                .map_err(|_| busy())?
            {
                LoadState::Pending => (CreationReceipt::Pending, LOAD_PENDING, None),
                LoadState::Refused => (
                    CreationReceipt::Resolved,
                    REFUSED_LOAD,
                    Some(ResultMessage {
                        ok: false,
                        code: "loading",
                        message: REFUSED_LOAD,
                    }),
                ),
                LoadState::Missing => (
                    CreationReceipt::Unknown,
                    "The original load has no confirmed installation record. Nothing was loaded again.",
                    None,
                ),
                LoadState::Conflict => return Err(conflict()),
            },
        };
        Ok(ReceiptResponse {
            ok: true,
            scope: authorized.scope.key().map_err(|_| busy())?,
            status,
            message,
            result,
        })
    })
}

pub(super) async fn settings(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let call = match operation::<CheckpointSettings>(&state, request).await {
        Ok(call) => call,
        Err(error) => return error,
    };
    let allowed = authorizer(&state, call.authorized.clone(), call.custody);
    let result = state.checkpoints.update_settings(call.input, allowed).await;
    let status = match result {
        Ok(()) => state.checkpoints.catalog(None).await,
        Err(error) => {
            return publish::<()>(&state, &call.authorized, || {
                Err(match error {
                    CaptureError::Conflict => refusal(
                        StatusCode::CONFLICT,
                        "checkpoint-settings",
                        "Autosave settings changed elsewhere. Refresh and try again.",
                    ),
                    CaptureError::World(WorldError::Storage(StoreError::InvalidRecord)) => {
                        invalid_request()
                    }
                    other => failure(&other),
                })
            });
        }
    };
    publish(&state, &call.authorized, || {
        let status = status.as_ref().map_err(failure)?;
        Ok(Saved {
            ok: true,
            message: "Autosave settings saved.",
            autosaves: Some(status.autosaves()),
        })
    })
}

pub(super) async fn ack(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let call = match operation::<CheckpointId>(&state, request).await {
        Ok(call) => call,
        Err(error) => return error,
    };
    let allowed = authorizer(&state, call.authorized.clone(), call.custody);
    let result = state.checkpoints.acknowledge(call.input.id, allowed).await;
    let message = match result {
        Ok(true) => "Checkpoint failure acknowledged.",
        Ok(false) => "That failure was already acknowledged or replaced by a newer one.",
        Err(error) => return publish::<()>(&state, &call.authorized, || Err(failure(&error))),
    };
    let status = state.checkpoints.catalog(None).await;
    publish(&state, &call.authorized, || {
        let status = status.as_ref().map_err(failure)?;
        Ok(Saved {
            ok: true,
            message,
            autosaves: Some(status.autosaves()),
        })
    })
}

fn invalid_request() -> Response {
    refusal(
        StatusCode::BAD_REQUEST,
        "request",
        "This request could not be read.",
    )
}

fn failure(error: &CaptureError) -> Response {
    match error {
        CaptureError::Referenced => refusal(
            StatusCode::CONFLICT,
            "checkpoint-referenced",
            "The current Lab session or a retained run still uses this checkpoint.",
        ),
        CaptureError::Conflict => refusal(
            StatusCode::CONFLICT,
            "idempotency-conflict",
            "Save identity conflicts.",
        ),
        CaptureError::World(
            WorldError::Storage(StoreError::StaleCut)
            | WorldError::Commit(CommitError::RolledBack(StoreError::StaleCut)),
        ) => access_failure(AccessError::Changed),
        _ => busy(),
    }
}
