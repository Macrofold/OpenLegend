//! The save capability protects the checkpoint panel and every operator
//! action. Payloads contain only the world’s catalog summaries and policy.

use super::{PlayerRoutes, access_failure, busy, json, json_response, refusal, scope, wire};
use crate::authority::{AccessError, AuthorizedScope, Capability};
use crate::store::{
    CommitError, StoreError,
    checkpoint::{CaptureError, CheckpointCursor, CheckpointSettings},
};
use crate::world::WorldError;
use axum::extract::{Request, State};
use axum::http::StatusCode;
use axum::response::Response;
use openlegend_simulation::host::ByteReservation;
use serde::{Deserialize, Serialize, de::DeserializeOwned};
use std::sync::Arc;
use tokio::sync::OwnedSemaphorePermit;
use uuid::Uuid;

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct CreateCheckpoint {
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

#[derive(Serialize)]
struct Saved<T = ()> {
    ok: bool,
    message: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    autosaves: Option<T>,
}

struct Operation<T> {
    input: T,
    authorized: Arc<AuthorizedScope>,
    custody: ByteReservation,
    _slot: OwnedSemaphorePermit,
}

async fn operation<T: DeserializeOwned>(
    state: &PlayerRoutes,
    request: Request,
) -> Result<Operation<T>, Response> {
    let slot = state
        .capacity
        .clone()
        .try_acquire_owned()
        .map_err(|_| busy())?;
    let (parts, body) = request.into_parts();
    let authorized = Arc::new(
        scope(&state.authority, &parts.headers, None)
            .await
            .map_err(access_failure)?,
    );
    state
        .authority
        .current(&authorized, Capability::Save, false, |_, _| ())
        .map_err(access_failure)?;
    let (input, custody) = json(&parts.headers, body, state.game.host.budget()).await?;
    Ok(Operation {
        input,
        authorized,
        custody,
        _slot: slot,
    })
}

fn authorizer(
    state: &PlayerRoutes,
    authorized: Arc<AuthorizedScope>,
    custody: ByteReservation,
) -> impl Fn() -> Result<(), WorldError> + Send + Sync + 'static {
    let authority = state.authority.clone();
    let owner = state._request_owner.clone();
    move || {
        let _held = (&owner, &custody);
        authority
            .current(&authorized, Capability::Save, false, |_, _| ())
            .map_err(WorldError::Access)
    }
}

fn publish<T: Serialize>(
    state: &PlayerRoutes,
    authorized: &AuthorizedScope,
    outcome: impl FnOnce() -> Result<T, Response>,
) -> Response {
    match state
        .authority
        .current(authorized, Capability::Save, false, |_, _| {
            match outcome() {
                Err(error) => error,
                Ok(value) => match wire::encode(&value, b"", b"", state.game.host.budget()) {
                    Ok(bytes) => json_response(StatusCode::OK, bytes),
                    Err(_) => busy(),
                },
            }
        }) {
        Ok(response) => response,
        Err(error) => access_failure(error),
    }
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
    let listing = state.checkpoints.catalog(call.input.before).await;
    publish(&state, &call.authorized, || {
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
    let allowed = authorizer(&state, call.authorized.clone(), call.custody);
    let result = state
        .checkpoints
        .manual_checkpoint(call.input.id, label.to_owned(), allowed)
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
    let call = match operation::<CheckpointId>(&state, request).await {
        Ok(call) => call,
        Err(error) => return error,
    };
    let allowed = authorizer(&state, call.authorized.clone(), call.custody);
    let result = state.checkpoints.delete(call.input.id, allowed).await;
    publish(&state, &call.authorized, || {
        result.map_err(|error| failure(&error))?;
        Ok(Saved::<()> {
            ok: true,
            message: "Save deleted.",
            autosaves: None,
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
