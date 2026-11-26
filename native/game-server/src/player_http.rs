//! The real routes admit an authenticated tab and fund their bounded request
//! parser before the application or native writer sees any intention.

use crate::{
    access_http::{access_failure, read_cookie, refusal},
    authority::{AccessError, Authority, AuthorizedScope, Capability, ControlRequest},
    boot::CurrentServer,
    command_epoch::RequestIdentity,
    embodiment::{self, EmbodimentChange},
    game_clock::GameClock,
    live_save::LiveSaves,
    npc::Director,
    player_command::PlayerCommands,
    player_references::ReferenceIssuer,
    presence::Presence,
    store::{CommitError, StoreError, checkpoint::CheckpointSchedule},
    wire,
    world::WorldError,
    world_input::{InputUpdate, WorldInputs},
};
use axum::{
    Router,
    body::{Body, Bytes, to_bytes},
    extract::{Query, Request, State},
    http::{HeaderMap, StatusCode, header},
    response::{IntoResponse, Response},
    routing::post,
};
use openlegend_simulation::host::{ByteBudget, ByteReservation};
use serde::{Deserialize, Serialize, de::DeserializeOwned};
use std::{sync::Arc, time::Duration};
use tokio::sync::Semaphore;
pub(crate) mod actions;
mod activity_history;
pub(crate) mod assets;
mod checkpoint;
pub(crate) mod diagnostics;
mod dialogue;
mod event_history;
mod evidence;
mod expression;
mod history;
pub(crate) mod hearth;
mod inventory;
mod offer_recipients;
mod object_history;
mod inventions;
mod notes;
mod known_places;
mod operations;
mod person_editor;
mod person_creation;
mod person_inventory;
mod preview;
mod promises;
mod recall;
mod save_access;
mod trade;
mod typed_actions;
mod view;
mod world_inspection;

const REQUEST_LIMIT: usize = 4096;
pub(crate) const REQUEST_TIMEOUT: Duration = Duration::from_secs(5);

#[derive(Clone)]
struct PlayerRoutes {
    authority: Arc<Authority>,
    game: Arc<CurrentServer>,
    saves: Arc<LiveSaves>,
    commands: Arc<PlayerCommands>,
    presence: Arc<Presence>,
    inputs: Arc<WorldInputs>,
    clock: Arc<GameClock>,
    decisions: Arc<Director>,
    references: Arc<ReferenceIssuer>,
    expected_world: String,
    god_mode: bool,
    capacity: Arc<Semaphore>,
    grace: Duration,
    checkpoints: Arc<CheckpointSchedule>,
    loads: Arc<crate::launch::checkpoint_load::LoadInbox>,
    definitions: Arc<crate::mcp_http::DefinitionReads>,
    // Declared last so the clone releases its world owners before this signal.
    _request_owner: tokio::sync::watch::Sender<()>,
}

pub(crate) fn router(
    authority: Arc<Authority>,
    identity: Arc<tokio::sync::Mutex<RequestIdentity>>,
    game: Arc<CurrentServer>,
    saves: Arc<LiveSaves>,
    presence: Arc<Presence>,
    inputs: Arc<WorldInputs>,
    clock: Arc<GameClock>,
    decisions: Arc<Director>,
    expected_world: String,
    capacity: usize,
    grace: Duration,
    streams: usize,
    ai_display: crate::store::AiDisplay,
    god_mode: bool,
    stop: tokio::sync::watch::Receiver<bool>,
    request_owner: tokio::sync::watch::Sender<()>,
    checkpoints: Arc<CheckpointSchedule>,
    loads: Arc<crate::launch::checkpoint_load::LoadInbox>,
    definitions: Arc<crate::mcp_http::DefinitionReads>,
    references: Arc<ReferenceIssuer>,
) -> Router {
    let commands = Arc::new(PlayerCommands::new(
        game.clone(),
        saves.clone(),
        authority.clone(),
        references.clone(),
        identity,
        clock.maintenance().clone(),
        inputs.clone(),
    ));
    let state = PlayerRoutes {
        authority,
        game,
        saves,
        commands,
        presence,
        inputs,
        clock,
        decisions,
        references,
        expected_world,
        god_mode,
        capacity: Arc::new(Semaphore::new(capacity)),
        grace,
        checkpoints,
        loads,
        definitions,
        _request_owner: request_owner,
    };
    let streams = Arc::new(Semaphore::new(streams));
    let reads = view::router(
        state.clone(),
        streams.clone(),
        ai_display,
        god_mode,
        stop.clone(),
    )
    .merge(preview::router(state.clone(), streams, stop.clone()));
    let operations = Router::new()
        .route("/api/construction/hearths", axum::routing::get(hearth::catalogue))
        .route("/api/construction/hearth-preview", post(hearth::preview))
        .route("/api/command", post(command))
        .route("/api/command/receipt", post(command))
        .route("/api/expression", post(expression::submit))
        .route("/api/action-attempt", post(typed_actions::access))
        .route("/api/action-attempt/receipt", post(typed_actions::access))
        .route("/api/embodiment", post(control))
        .route("/api/presence", post(presence_report))
        .route("/api/control", post(manual_clock))
        .route("/api/input", post(update_input))
        .route("/api/saves/create", post(checkpoint::create))
        .route("/api/saves/load", post(checkpoint::load))
        .route("/api/saves/receipt", post(checkpoint::receipt))
        .route("/api/operations", axum::routing::get(operations::state))
        .route(
            "/api/performance",
            axum::routing::get(operations::performance::status),
        )
        .route(
            "/api/maintenance/schedule",
            post(operations::maintenance::edit),
        )
        .route(
            "/api/maintenance/update",
            post(operations::maintenance::edit),
        )
        .route(
            "/api/maintenance/start",
            post(operations::maintenance::edit),
        )
        .route(
            "/api/maintenance/cancel",
            post(operations::maintenance::edit),
        )
        .route(
            "/api/maintenance/ready",
            post(operations::maintenance::edit),
        )
        .route("/api/invites/create", post(operations::access::create))
        .route("/api/invites/revoke", post(operations::access::revoke))
        .route("/api/access", post(operations::access::update_grant))
        .route("/api/access/binding", post(operations::access::change))
        .route("/api/saves/list", post(checkpoint::list))
        .route("/api/saves/delete", post(checkpoint::delete))
        .route("/api/saves/settings", post(checkpoint::settings))
        .route("/api/saves/acknowledge", post(checkpoint::ack))
        .route("/api/assets/install", post(assets::selection::install))
        .route("/api/assets/selection-result", post(assets::selection::receipt))
        .route("/api/known-places", post(known_places::list))
        .route("/api/inventory/bindings", post(inventory::bindings))
        .route("/api/inventory", post(inventory::page))
        .route("/api/inventory/destinations", post(offer_recipients::read))
        .route("/api/inventory/history", post(object_history::read))
        .route("/api/inventory/access", post(inventory::access))
        .route("/api/trade", post(trade::read))
        .route("/api/trade/disclosures", post(trade::disclosures::list))
        .route("/api/known-places/inspect", post(known_places::inspect))
        .route("/api/history", axum::routing::get(history::journal))
        .route("/api/memories", post(recall::recollections))
        .route("/api/commitments", post(promises::list))
        .route("/api/commitment", post(promises::amend))
        .route("/api/mind", post(notes::get))
        .route("/api/mind/subjects", post(notes::subjects::read))
        .route("/api/attention", post(notes::attention::edit))
        .route("/api/knowledge", post(notes::edit))
        .route("/api/map/marker", post(notes::marker::edit))
        .route("/api/activity-history", post(activity_history::read))
        .route("/api/nickname", post(notes::nickname::edit))
        .route("/api/narration/regenerate", post(history::regenerate))
        .route(
            "/api/world-events",
            axum::routing::get(event_history::events),
        )
        .route("/api/world-events/sources", post(event_history::sources))
        .route("/api/actions", post(actions::menu))
        .route("/api/chat", post(dialogue::chat))
        .route("/api/chat/retry", post(dialogue::chat))
        .route("/api/chat/receipt", post(dialogue::receipt))
        // Preserve existing invention reads and reuse. New World Agent and invention
        // work is deferred in docs/projects/completed/2026/rust-server-completion-feature-spec.md#rust-cutover-scope.
        .route("/api/inventions/list", post(inventions::list))
        .route("/api/inventions/receipt", post(inventions::receipt))
        .route("/api/world-agent/messages", post(inventions::reuse::submit))
        .route("/api/world-agent/inspect", post(world_inspection::read))
        .route("/api/ai/cancel", post(dialogue::cancel))
        .route(
            "/api/player-interaction/availability",
            axum::routing::get(dialogue::availability),
        );
    let operations = if god_mode {
        operations
            .merge(diagnostics::router(stop))
            .route("/api/god/memories", post(recall::recollections))
            .route("/api/god/mind", post(notes::get))
            .route("/api/god/knowledge", post(notes::edit))
            .route("/api/god/editor/person", post(person_editor::read))
            .route("/api/god/editor/person/inventory", post(person_inventory::read))
            .route("/api/god/editor/person/memory", post(person_editor::read))
            .route("/api/god/editor/person/save", post(person_editor::save))
            .route("/api/god/person", post(person_creation::create))
            .route("/api/god/editor/person/author", post(person_editor::author))
            .route("/api/god/activity-history", post(activity_history::read))
            .route("/api/god/mind/subjects", post(notes::subjects::read))
            .route("/api/god/forget-memory", post(edit_recall))
            .route("/api/god/correct-memory", post(edit_recall))
    } else {
        operations
    };
    operations.with_state(state).merge(reads)
}

async fn edit_recall(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let Ok(_slot) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let authorized = match scope(&state.authority, &parts.headers, None).await {
        Ok(scope) => Arc::new(scope),
        Err(error) => return access_failure(error),
    };
    let (input, _custody): (crate::privacy_edit::RecallEditRequest, _) =
        match json(&parts.headers, body, state.game.host.budget()).await {
            Ok(input) => input,
            Err(error) => return error,
        };
    if input.correction_event_id.is_some() != (parts.uri.path() == "/api/god/correct-memory") {
        return failed(StoreError::InvalidRecord.into());
    }
    let needs_inspect = input.actor_id != authorized.scope.actor_id;
    let result = match crate::privacy_edit::edit(
        &state.game,
        &state.saves,
        state.authority.clone(),
        authorized.clone(),
        &state.references,
        input,
    )
    .await
    {
        Ok(outcome) => outcome,
        Err(error) => return failed(error),
    };
    match state
        .authority
        .current_recall_operator(&authorized, needs_inspect, |_| {
            wire::encode(&result, b"", b"", state.game.host.budget())
        }) {
        Ok(Ok(bytes)) => json_response(StatusCode::OK, bytes),
        Ok(Err(_)) => busy(),
        Err(error) => access_failure(error),
    }
}

async fn command(State(state): State<PlayerRoutes>, request: Request) -> Response {
    use http_body::Body as _;

    let Ok(_request) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let recovery = parts.uri.path() == "/api/command/receipt";
    let scope = match scope(&state.authority, &parts.headers, None).await {
        Ok(scope) => scope,
        Err(error) => return access_failure(error),
    };
    // An allowed utterance may use six JSON bytes per UTF-16 unit. Keep
    // the ordinary admission for short bodies with a known transport length.
    const COMMAND_LIMIT: usize = 16_384;
    let limit = body.size_hint().exact()
        .and_then(|bytes| usize::try_from(bytes).ok())
        .map_or(COMMAND_LIMIT, |bytes| bytes.clamp(REQUEST_LIMIT, COMMAND_LIMIT));
    let (input, custody) = match read_json(&parts.headers, body, state.game.host.budget(), false, limit).await {
        Ok(input) => input,
        Err(error) => return error,
    };
    match state
        .commands
        .command(Arc::new(scope), input, recovery, custody, &state.decisions)
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
    let result = embodiment::change(
        &state.game,
        &state.saves,
        &state.authority,
        &authorized,
        input,
        &state.presence,
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
            if state.authority.is_lab() { "Lab control released." } else { "Your tab is paused; your character is leaving the world." },
        ),
        Ok(EmbodimentChange::Refused { message, _custody }) => {
            // The finished control fence evicted its cached authority. Read
            // the same submitted scope before encoding the refusal.
            let current = match read_scope(&state.authority, &parts.headers).await {
                Ok(current) => current,
                Err(error) => return access_failure(error),
            };
            match state.authority.current(&current, Capability::Play, false, |_, _| {
                control_response(&state, false, "participation", &message)
            }) {
                Ok(response) => response,
                Err(error) => access_failure(error),
            }
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

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct PresenceBeacon {
    client: String,
    scope: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ManualClock {
    paused: Option<bool>,
    speed: Option<f64>,
    client_id: Option<String>,
    presence_sequence: Option<u64>,
}

async fn manual_clock(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let Ok(_request) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let authorized = match scope(&state.authority, &parts.headers, None).await {
        Ok(access) => Arc::new(access),
        Err(error) => return access_failure(error),
    };
    let (input, _custody): (ManualClock, _) =
        match json(&parts.headers, body, state.game.host.budget()).await {
            Ok(input) => input,
            Err(error) => return error,
        };
    if let Some(speed) = input.speed {
        if !state.god_mode {
            return refusal(
                StatusCode::OK,
                "forbidden",
                "Game speed is available in God mode only.",
            );
        }
        if let Err(error) = state
            .authority
            .current(&authorized, Capability::Create, true, |_, _| ())
        {
            return access_failure(error);
        }
        match crate::control_format::speeds() {
            Ok(choices) if choices.contains(&speed) => {}
            Ok(_) => {
                return refusal(
                    StatusCode::OK,
                    "speed",
                    "Choose one of the available game speeds.",
                );
            }
            Err(error) => return failed(error),
        }
    }
    if input
        .client_id
        .as_ref()
        .is_some_and(|id| id != &authorized.scope.connection_id)
        || input
            .presence_sequence
            .is_some_and(|n| n > openlegend_simulation::identity::MAX_SAFE_INTEGER)
    {
        return access_failure(AccessError::Changed);
    }
    if input.paused == Some(false)
        && input.client_id.is_some()
        && let Err(error) = state
            .presence
            .report(authorized.clone(), true, input.presence_sequence)
    {
        return access_failure(error);
    }
    match state
        .clock
        .manual_control(state.authority.clone(), authorized, input.paused, input.speed)
        .await
    {
        Ok(true) => control_response(&state, true, "control", "World controls updated."),
        Ok(false) => refusal(
            StatusCode::OK,
            "away",
            "This game tab has not reconnected yet. Reload it and try Resume again.",
        ),
        Err(WorldError::OperatorMaintenance) => refusal(
            StatusCode::CONFLICT,
            "maintenance",
            crate::operator_maintenance::HOLD_MESSAGE,
        ),
        Err(WorldError::RecoveryRequired) => refusal(
            StatusCode::SERVICE_UNAVAILABLE,
            "recovery-required",
            "The clock change is unconfirmed. Reopen the world before changing its clock again.",
        ),
        Err(error) => failed(error),
    }
}

async fn presence_report(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let Ok(_request) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let beacon = if parts.headers.contains_key("x-ol-client") {
        None
    } else {
        match Query::<PresenceBeacon>::try_from_uri(&parts.uri) {
            Ok(Query(beacon)) => Some(beacon),
            Err(_) => return access_failure(AccessError::Changed),
        }
    };
    let authorized = match scope_from(&state.authority, &parts.headers, None, beacon.as_ref()).await
    {
        Ok(scope) => scope,
        Err(error) => return access_failure(error),
    };
    let (input, _custody): (PresenceReport, _) =
        match read_json(&parts.headers, body, state.game.host.budget(), true, REQUEST_LIMIT).await {
            Ok(input) => input,
            Err(error) => return error,
        };
    if input.client_id != authorized.scope.connection_id
        || (beacon.is_some() && input.visible)
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
            if changed && let Err(error) = state.clock.presence_changed().await {
                return failed(error);
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
    let _ordinary = state.saves.enter_ordinary().await;
    if let Err(error) = state
        .clock
        .maintenance()
        .allow_ordinary(&state.authority, &authorized)
    {
        return failed(error);
    }
    let inputs = state.inputs.clone();
    let accepted_scope = authorized.clone();
    state.game.world.request_advance_publication();
    let report = match inputs.update_during_advance(&authorized, &input) {
        Ok(Some(result)) => Ok(Ok(result)),
        Err(error) => Ok(Err(error)),
        Ok(None) => {
            state
                .game
                .world
                .capture(move |world| {
                    let scope = &accepted_scope.scope;
                    let facts = world.player_input_direct(&scope.account_id, &scope.actor_id)?;
                    let clock = world.clock()?;
                    // A completed or refused release no longer has an accepted
                    // native intention. Tell the browser to stop renewing it.
                    if matches!(&input, InputUpdate::Renew { pending_release: Some(_), .. }) {
                        return Ok(world.with_player_attack(&scope.account_id, &scope.actor_id, |attack| {
                            let pending = attack.and_then(|(action, pending)| pending.then_some(action));
                            inputs.update(accepted_scope.clone(), facts, clock, input, pending)
                        })?);
                    }
                    Ok(inputs.update(accepted_scope, facts, clock, input, None))
                })
                .await
        }
    };
    match report {
        Ok(Ok(result)) => {
            match state
                .authority
                .current(&authorized, Capability::Play, true, |_, _| {
                    wire::encode(&result, b"", b"", state.game.host.budget())
                }) {
                Ok(Ok(bytes)) => json_response(StatusCode::OK, bytes),
                Ok(Err(_)) => busy(),
                Err(error) => access_failure(error),
            }
        }
        Ok(Err(error)) => access_failure(error),
        Err(error) => failed(error),
    }
}

async fn scope(
    authority: &Authority,
    headers: &HeaderMap,
    expected: Option<u64>,
) -> Result<AuthorizedScope, AccessError> {
    scope_from(authority, headers, expected, None).await
}

async fn scope_from(
    authority: &Authority,
    headers: &HeaderMap,
    expected: Option<u64>,
    beacon: Option<&PresenceBeacon>,
) -> Result<AuthorizedScope, AccessError> {
    let authorized = session_scope(authority, headers, beacon).await?;
    let submitted = match headers.get("x-ol-scope") {
        Some(value) => value.to_str().map_err(|_| AccessError::Changed)?,
        None => beacon
            .map(|beacon| beacon.scope.as_str())
            .ok_or(AccessError::Changed)?,
    };
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

async fn read_scope(
    authority: &Authority,
    headers: &HeaderMap,
) -> Result<AuthorizedScope, AccessError> {
    let authorized = session_scope(authority, headers, None).await?;
    if let Some(submitted) = headers.get("x-ol-scope") {
        let submitted = submitted.to_str().map_err(|_| AccessError::Changed)?;
        if authorized
            .scope
            .key()
            .map_err(|_| AccessError::Availability)?
            != submitted
        {
            return Err(AccessError::Changed);
        }
    }
    Ok(authorized)
}

async fn session_scope(
    authority: &Authority,
    headers: &HeaderMap,
    beacon: Option<&PresenceBeacon>,
) -> Result<AuthorizedScope, AccessError> {
    let token = read_cookie(headers, "ol_session").ok_or(AccessError::Session)?;
    let tab = headers
        .get("x-ol-client")
        .and_then(|header| header.to_str().ok())
        .or_else(|| beacon.map(|beacon| beacon.client.as_str()))
        .filter(|text| valid_tab(text))
        .ok_or(AccessError::Changed)?;
    authority.scope(token, tab.to_owned()).await
}

pub(crate) fn valid_tab(tab: &str) -> bool {
    !tab.is_empty()
        && tab.len() <= 100
        && tab
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-'))
}

async fn json<T: DeserializeOwned>(
    headers: &HeaderMap,
    body: Body,
    budget: &ByteBudget,
) -> Result<(T, ByteReservation), Response> {
    read_json(headers, body, budget, false, REQUEST_LIMIT).await
}

async fn read_json<T: DeserializeOwned>(
    headers: &HeaderMap,
    body: Body,
    budget: &ByteBudget,
    presence: bool,
    limit: usize,
) -> Result<(T, ByteReservation), Response> {
    if !headers
        .get(header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .is_some_and(|value| {
            value.starts_with("application/json") || (presence && value.starts_with("text/plain"))
        })
    {
        return Err(refusal(
            StatusCode::UNSUPPORTED_MEDIA_TYPE,
            "content-type",
            "Send a JSON request.",
        ));
    }
    let mut custody = budget.reserve(8 * limit).map_err(|_| busy())?;
    let body = tokio::time::timeout(REQUEST_TIMEOUT, to_bytes(body, limit))
        .await
        .map_err(|_| busy())?
        .map_err(|_| {
            refusal(
                StatusCode::PAYLOAD_TOO_LARGE,
                "body",
                "This request is too large.",
            )
        })?;
    let request = serde_json::from_slice(&body).map_err(|_| request_error())?;
    let retained = 8 * body.len();
    drop(body);
    custody.resize(retained).map_err(|_| busy())?;
    Ok((request, custody))
}

fn request_error() -> Response {
    refusal(StatusCode::BAD_REQUEST, "request", "This request could not be read.")
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

/// Transfer one admitted JSON allocation to the response body while the caller
/// still owns any required disclosure lease.
fn reply(state: &PlayerRoutes, code: StatusCode, value: &impl Serialize) -> Response {
    match wire::encode(value, b"", b"", state.game.host.budget()) {
        Ok(bytes) => json_response(code, bytes),
        Err(_) => busy(),
    }
}

pub(crate) fn json_response(status: StatusCode, bytes: Bytes) -> Response {
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
        WorldError::OperatorMaintenance => refusal(
            StatusCode::CONFLICT,
            "maintenance",
            crate::operator_maintenance::ACTION_MESSAGE,
        ),
        WorldError::Access(error) => access_failure(error),
        WorldError::Commit(CommitError::RolledBack(StoreError::StaleCut))
        | WorldError::Storage(StoreError::StaleCut) => access_failure(AccessError::Changed),
        _ => busy(),
    }
}
