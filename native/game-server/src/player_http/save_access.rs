//! Bounded request custody and final disclosure for world save operators.

use super::{PlayerRoutes, access_failure, busy, json, json_response, scope, wire};
use crate::{
    authority::{AuthorizedScope, Capability},
    world::WorldError,
};
use axum::{extract::Request, http::StatusCode, response::Response};
use openlegend_simulation::host::ByteReservation;
use serde::{Serialize, de::DeserializeOwned};
use std::sync::Arc;
use tokio::sync::OwnedSemaphorePermit;

pub(super) struct Operation<T> {
    pub(super) input: T,
    pub(super) authorized: Arc<AuthorizedScope>,
    pub(super) custody: ByteReservation,
    _slot: OwnedSemaphorePermit,
}

pub(super) async fn operation<T: DeserializeOwned>(
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

pub(super) fn authorizer(
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

pub(super) fn publish<T: Serialize>(
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
