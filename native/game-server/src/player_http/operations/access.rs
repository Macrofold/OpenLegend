//! Access administration uses the existing browser operations endpoints and
//! never discloses invitation secrets in the roster.

use super::super::{
    PlayerRoutes, access_failure, busy, failed, json, json_response, request_error, scope, wire,
};
use crate::{
    access_http::refusal,
    authority::{
        AccessUpdateError, Capability, RemoveAccess,
        invites::{AccessRoster, GrantView, InviteError, InviteView, NewInvite},
        now_ms,
    },
};
use axum::{
    extract::{Request, State},
    http::StatusCode,
    response::{IntoResponse, Response},
};
use openlegend_simulation::{runtime::InvitationActor, values::is_safe_record_id};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Serialize)]
pub(super) struct AccessSection<'a> {
    grants: Vec<GrantView<'a>>,
    invites: Vec<InviteView<'a>>,
    candidates: &'a [InvitationActor],
}

impl<'a> AccessSection<'a> {
    pub(super) fn new(roster: &'a AccessRoster, own: &'a str) -> Self {
        Self {
            grants: roster.grants(own).collect(),
            invites: roster.invitations(now_ms()).collect(),
            candidates: &roster.candidates.actors,
        }
    }
}

pub(super) fn failure(error: InviteError) -> Response {
    match error {
        InviteError::Access(error) => access_failure(error),
        InviteError::Conflict => conflict(),
        InviteError::Refused(message) => refusal(StatusCode::CONFLICT, "invite", message),
    }
}

fn conflict() -> Response {
    refusal(
        StatusCode::CONFLICT,
        "conflict",
        "Access changed. Refresh and try again.",
    )
}

fn updated(message: &'static str) -> Response {
    axum::Json(serde_json::json!({ "ok":true, "message":message })).into_response()
}

#[derive(Serialize)]
struct Created<'a> {
    ok: bool,
    message: &'static str,
    link: String,
    invite: InviteView<'a>,
}

pub(in crate::player_http) async fn create(
    State(state): State<PlayerRoutes>,
    request: Request,
) -> Response {
    let Ok(_permit) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let authorized = match scope(&state.authority, &parts.headers, None).await {
        Ok(scope) => scope,
        Err(error) => return access_failure(error),
    };
    let budget = state.game.host.budget();
    let (mut request, _custody): (NewInvite, _) = match json(&parts.headers, body, budget).await {
        Ok(value) => value,
        Err(error) => return error,
    };
    if !request.valid() {
        return request_error();
    }
    if let Err(error) =
        state
            .authority
            .current(&authorized, Capability::ManageAccess, false, |_, _| ())
    {
        return access_failure(error);
    }
    if !state.authority.invite_mode() {
        return failure(InviteError::Refused(
            "Invites need OIDC sign-in; local mode has a single player.",
        ));
    }
    let _barrier = if let Some(actor) = request.actor_id.clone() {
        let barrier = match state.saves.enter_protected().await {
            Ok(barrier) => barrier,
            Err(error) => return failed(error),
        };
        match state
            .game
            .world
            .capture(move |world| world.may_invite_actor(&actor))
            .await
        {
            Ok(true) => (),
            Ok(false) => {
                return failure(InviteError::Refused(
                    "That character cannot be offered to a new player.",
                ));
            }
            Err(error) => return failed(error),
        }
        Some(barrier)
    } else {
        None
    };
    let Some(origin) = parts
        .headers
        .get("origin")
        .and_then(|value| value.to_str().ok())
    else {
        return request_error();
    };
    // The outer middleware requires this exact configured browser origin
    // before admitting any POST. Use it only to build the one-time link.
    let result = match state.authority.issue_invite(&authorized, request).await {
        Ok(invite) => invite,
        Err(error) => return failure(error),
    };
    match state
        .authority
        .current(&authorized, Capability::ManageAccess, false, |_, _| {
            let body = Created {
                ok: true,
                message: "Invite created. Copy the link now; it is shown only once.",
                link: format!("{origin}/auth/invite?token={}", result.token),
                invite: result.view(),
            };
            wire::encode(&body, b"", b"", budget)
        }) {
        Ok(Ok(bytes)) => json_response(StatusCode::OK, bytes),
        Ok(Err(_)) => busy(),
        Err(error) => access_failure(error),
    }
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Revoke {
    id: Uuid,
}

pub(in crate::player_http) async fn revoke(
    State(state): State<PlayerRoutes>,
    request: Request,
) -> Response {
    let Ok(_permit) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let authorized = match scope(&state.authority, &parts.headers, None).await {
        Ok(scope) => scope,
        Err(error) => return access_failure(error),
    };
    let (request, _custody): (Revoke, _) =
        match json(&parts.headers, body, state.game.host.budget()).await {
            Ok(value) => value,
            Err(error) => return error,
        };
    match state.authority.revoke_invite(&authorized, request.id).await {
        Ok(message) => updated(message),
        Err(error) => failure(error),
    }
}

pub(in crate::player_http) async fn remove(
    State(state): State<PlayerRoutes>,
    request: Request,
) -> Response {
    let Ok(permit) = state.capacity.clone().try_acquire_owned() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let authorized = match scope(&state.authority, &parts.headers, None).await {
        Ok(scope) => scope,
        Err(error) => return access_failure(error),
    };
    let (request, custody): (RemoveAccess, _) =
        match json(&parts.headers, body, state.game.host.budget()).await {
            Ok(value) => value,
            Err(error) => return error,
        };
    if !request.capabilities.is_empty()
        || !is_safe_record_id(&request.account_id)
        || request.account_id.encode_utf16().count() > 100
        || request.expected_revision > openlegend_simulation::identity::MAX_SAFE_INTEGER
    {
        return request_error();
    }
    // Once admitted, the transaction and its disclosure fence must settle
    // together even if the connection stops waiting for its response.
    match tokio::spawn(async move {
        let _permit = permit;
        let _custody = custody;
        state
            .authority
            .remove_access(&authorized, request, || state.saves.signal_view())
            .await
    })
    .await
    {
        Ok(Ok(())) => updated("Access updated."),
        Ok(Err(AccessUpdateError::Conflict)) => conflict(),
        Ok(Err(AccessUpdateError::Access(error))) => access_failure(error),
        Err(_) => access_failure(crate::authority::AccessError::Availability),
    }
}
