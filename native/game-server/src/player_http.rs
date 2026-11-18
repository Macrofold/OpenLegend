//! The real routes admit an authenticated tab and fund their bounded request
//! parser before the application or native writer sees any intention.

use crate::{
    access_http::{access_failure, read_cookie, refusal},
    authority::{AccessError, Authority, AuthorizedScope, ControlRequest},
    boot::CurrentServer,
    command_epoch::RequestIdentity,
    embodiment::{self, EmbodimentChange},
    live_save::LiveSaves,
    player_command::PlayerCommands,
    presence::Presence,
    store::{CommitError, StoreError},
    wire,
    world::WorldError,
    world_input::{InputUpdate, WorldInputs},
};
use axum::{
    Router,
    body::{Body, Bytes, to_bytes},
    extract::{Request, State},
    http::{HeaderMap, StatusCode, header},
    response::{IntoResponse, Response},
    routing::post,
};
use openlegend_simulation::host::{ByteBudget, ByteReservation};
use serde::{Deserialize, Serialize, de::DeserializeOwned};
use std::{sync::Arc, time::Duration};
use tokio::sync::Semaphore;

const REQUEST_LIMIT: usize = 4096;
const REQUEST_TIMEOUT: Duration = Duration::from_secs(5);

#[derive(Clone)]
struct PlayerRoutes {
    authority: Arc<Authority>,
    game: Arc<CurrentServer>,
    saves: Arc<LiveSaves>,
    commands: Arc<PlayerCommands>,
    presence: Arc<Presence>,
    inputs: Arc<WorldInputs>,
    capacity: Arc<Semaphore>,
    grace: Duration,
}

pub(crate) fn router(
    authority: Arc<Authority>,
    identity: RequestIdentity,
    game: Arc<CurrentServer>,
    saves: Arc<LiveSaves>,
    presence: Arc<Presence>,
    inputs: Arc<WorldInputs>,
    capacity: usize,
    grace: Duration,
) -> Router {
    let commands = Arc::new(PlayerCommands::new(
        game.clone(),
        saves.clone(),
        authority.clone(),
        identity,
    ));
    let state = PlayerRoutes {
        authority,
        game,
        saves,
        commands,
        presence,
        inputs,
        capacity: Arc::new(Semaphore::new(capacity)),
        grace,
    };
    Router::new()
        .route("/api/command", post(command))
        .route("/api/command/receipt", post(command))
        .route("/api/embodiment", post(control))
        .route("/api/presence", post(presence_report))
        .route("/api/input", post(update_input))
        .with_state(state)
}

async fn command(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let Ok(_request) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let recovery = parts.uri.path() == "/api/command/receipt";
    let scope = match scope(&state.authority, &parts.headers, None).await {
        Ok(scope) => scope,
        Err(error) => return access_failure(error),
    };
    let (input, custody) = match json(&parts.headers, body, state.game.host.budget()).await {
        Ok(input) => input,
        Err(error) => return error,
    };
    match state
        .commands
        .command(Arc::new(scope), input, recovery, custody)
        .await
    {
        Ok(bytes) => json_response(StatusCode::OK, bytes),
        Err(error) => failed(error),
    }
}

async fn control(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let Ok(_request) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let (input, _custody): (ControlRequest, _) =
        match json(&parts.headers, body, state.game.host.budget()).await {
            Ok(input) => input,
            Err(error) => return error,
        };
    let authorized = match scope(
        &state.authority,
        &parts.headers,
        Some(input.expected_generation),
    )
    .await
    {
        Ok(scope) => scope,
        Err(error) => return access_failure(error),
    };
    // Whether an occupied controller is unattended belongs to presence. An
    // explicit replace already carries the user's decision and needs no hint.
    let unattended = match state
        .presence
        .controller_present(&authorized.scope.actor_id)
    {
        Ok(present) => !present,
        Err(error) => return access_failure(error),
    };
    let result = embodiment::change(
        &state.game,
        &state.saves,
        &state.authority,
        &authorized,
        input,
        unattended,
        state.grace,
    )
    .await;
    match result {
        Ok(EmbodimentChange::Replayed) => control_response(
            &state,
            true,
            "replayed",
            "Control request already committed. Refresh to see current control.",
        ),
        Ok(EmbodimentChange::Returned) => {
            control_response(&state, true, "participation", "Resumed here.")
        }
        Ok(EmbodimentChange::Released) => control_response(
            &state,
            true,
            "participation",
            "Your tab is paused; your character is leaving the world.",
        ),
        Ok(EmbodimentChange::Refused { message, _custody }) => {
            control_response(&state, false, "participation", &message)
        }
        Err(error) => failed(error),
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct PresenceReport {
    client_id: String,
    visible: bool,
    sequence: Option<u64>,
}

async fn presence_report(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let Ok(_request) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let authorized = match scope(&state.authority, &parts.headers, None).await {
        Ok(scope) => scope,
        Err(error) => return access_failure(error),
    };
    let (input, _custody): (PresenceReport, _) =
        match json(&parts.headers, body, state.game.host.budget()).await {
            Ok(input) => input,
            Err(error) => return error,
        };
    if input.client_id != authorized.scope.connection_id
        || input
            .sequence
            .is_some_and(|sequence| sequence > openlegend_simulation::identity::MAX_SAFE_INTEGER)
    {
        return access_failure(AccessError::Changed);
    }
    let actor = authorized.scope.actor_id.clone();
    match state
        .presence
        .report(Arc::new(authorized), input.visible, input.sequence)
    {
        Ok(changed) => {
            if changed
                && !input.visible
                && let Err(error) = state.inputs.clear_actor(&actor)
            {
                return access_failure(error);
            }
            control_response(
                &state,
                true,
                "presence",
                if input.visible { "Present." } else { "Away." },
            )
        }
        Err(error) => access_failure(error),
    }
}

async fn update_input(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let Ok(_request) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let authorized = match scope(&state.authority, &parts.headers, None).await {
        Ok(scope) => Arc::new(scope),
        Err(error) => return access_failure(error),
    };
    let (input, _custody): (InputUpdate, _) =
        match json(&parts.headers, body, state.game.host.budget()).await {
            Ok(input) => input,
            Err(error) => return error,
        };
    let inputs = state.inputs.clone();
    state.game.world.request_advance_publication();
    let report = state
        .game
        .world
        .capture(move |world| {
            let scope = &authorized.scope;
            let facts = world.player_input_direct(&scope.account_id, &scope.actor_id)?;
            Ok(inputs.update(authorized, facts, world.clock()?, input))
        })
        .await;
    match report {
        Ok(Ok(result)) => match wire::encode(&result, b"", b"", state.game.host.budget()) {
            Ok(bytes) => json_response(StatusCode::OK, bytes),
            Err(_) => busy(),
        },
        Ok(Err(error)) => access_failure(error),
        Err(error) => failed(error),
    }
}

async fn scope(
    authority: &Authority,
    headers: &HeaderMap,
    expected: Option<u64>,
) -> Result<AuthorizedScope, AccessError> {
    let token = read_cookie(headers, "ol_session").ok_or(AccessError::Session)?;
    let tab = headers
        .get("x-ol-client")
        .and_then(|header| header.to_str().ok())
        .filter(|text| {
            !text.is_empty()
                && text.len() <= 100
                && text
                    .bytes()
                    .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-'))
        })
        .ok_or(AccessError::Changed)?;
    let authorized = authority.scope(token, tab.to_owned()).await?;
    let submitted = headers
        .get("x-ol-scope")
        .and_then(|header| header.to_str().ok())
        .ok_or(AccessError::Changed)?;
    let selected = &authorized.scope;
    if selected.key().map_err(|_| AccessError::Availability)? != submitted {
        let Some(expected) = expected else {
            return Err(AccessError::Changed);
        };
        let mut prior = selected.clone();
        prior.control_generation = expected;
        if prior.key().map_err(|_| AccessError::Availability)? != submitted {
            return Err(AccessError::Changed);
        }
    }
    Ok(authorized)
}

async fn json<T: DeserializeOwned>(
    headers: &HeaderMap,
    body: Body,
    budget: &ByteBudget,
) -> Result<(T, ByteReservation), Response> {
    if !headers
        .get(header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .is_some_and(|value| value.starts_with("application/json"))
    {
        return Err(refusal(
            StatusCode::UNSUPPORTED_MEDIA_TYPE,
            "content-type",
            "Send a JSON request.",
        ));
    }
    let mut custody = budget.reserve(8 * REQUEST_LIMIT).map_err(|_| busy())?;
    let body = tokio::time::timeout(REQUEST_TIMEOUT, to_bytes(body, REQUEST_LIMIT))
        .await
        .map_err(|_| busy())?
        .map_err(|_| {
            refusal(
                StatusCode::PAYLOAD_TOO_LARGE,
                "body",
                "This request is too large.",
            )
        })?;
    let request = serde_json::from_slice(&body).map_err(|_| {
        refusal(
            StatusCode::BAD_REQUEST,
            "request",
            "This request could not be read.",
        )
    })?;
    let retained = 8 * body.len();
    drop(body);
    custody.resize(retained).map_err(|_| busy())?;
    Ok((request, custody))
}

fn control_response(
    state: &PlayerRoutes,
    ok: bool,
    code: &'static str,
    message: impl Serialize,
) -> Response {
    #[derive(Serialize)]
    struct ControlResponse<T> {
        ok: bool,
        code: &'static str,
        message: T,
    }
    match wire::encode(
        &ControlResponse { ok, code, message },
        b"",
        b"",
        state.game.host.budget(),
    ) {
        Ok(bytes) => json_response(
            if ok {
                StatusCode::OK
            } else {
                StatusCode::CONFLICT
            },
            bytes,
        ),
        Err(_) => busy(),
    }
}

fn json_response(status: StatusCode, bytes: Bytes) -> Response {
    (
        status,
        [(header::CONTENT_TYPE, "application/json; charset=utf-8")],
        bytes,
    )
        .into_response()
}

fn busy() -> Response {
    refusal(
        StatusCode::SERVICE_UNAVAILABLE,
        "busy",
        "This request is temporarily unavailable. Try again.",
    )
}

fn failed(error: WorldError) -> Response {
    match error {
        WorldError::Access(error) => access_failure(error),
        WorldError::Commit(CommitError::RolledBack(StoreError::StaleCut))
        | WorldError::Storage(StoreError::StaleCut) => access_failure(AccessError::Changed),
        _ => busy(),
    }
}
