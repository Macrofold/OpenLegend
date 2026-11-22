//! Permission-scoped entry to the checkpoint panel. Pull only the accepted
//! clock and generation. No embodied view, history or scenery is prepared.

use super::{PlayerRoutes, access_failure, busy, failed, json_response, read_scope, wire};
use crate::authority::Capability;
use crate::player_view::{
    AuthenticationMode, CheckpointContext, PauseReason, checkpoint_context, clock_parts,
    pause_reason,
};
use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::response::Response;
use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Operations<'a> {
    ok: bool,
    world_id: &'a str,
    account_id: &'a str,
    capabilities: &'a [Capability],
    #[serde(skip_serializing_if = "Option::is_none")]
    actor_id: Option<&'a str>,
    scope: &'a str,
    generation: &'a str,
    mode: AuthenticationMode,
    checkpoint: &'a CheckpointContext,
    clock: Clock<'a>,
    // Rust's startup has already refused active and scheduled maintenance.
    maintenance: (),
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Clock<'a> {
    seconds: f64,
    day: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    day_label: Option<&'a str>,
    hour: f64,
    offset_hours: f64,
    speed: f64,
    paused: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pause_reason: Option<PauseReason>,
}

pub(super) async fn state(State(state): State<PlayerRoutes>, headers: HeaderMap) -> Response {
    let Ok(_slot) = state.capacity.try_acquire() else {
        return busy();
    };
    let authorized = match read_scope(&state.authority, &headers).await {
        Ok(scope) => scope,
        Err(error) => return access_failure(error),
    };
    if let Err(error) = state
        .authority
        .current_checkpoint_operator(&authorized, |_, _, _| ())
    {
        return access_failure(error);
    }
    let budget = state.game.host.budget();
    let Ok(_workspace) = budget.reserve(8192) else {
        return busy();
    };
    let (clock, generation) = match state
        .game
        .world
        .capture(|world| {
            Ok((
                world.clock()?,
                world.accepted_progress()?.generation.to_owned(),
            ))
        })
        .await
    {
        Ok(value) => value,
        Err(error) => return failed(error),
    };
    let presentation = &state.game.view_policy().world;
    let save_failed = state.saves.has_failed();
    match state
        .authority
        .current_checkpoint_operator(&authorized, |scope, _, local| {
            let Ok(key) = scope.key() else {
                return busy();
            };
            let Ok(context) = checkpoint_context(scope, &key) else {
                return busy();
            };
            // This projection only serves the checkpoint panel. The other
            // operations sections need their own scoped readers and controls.
            let (day, hour) = clock_parts(clock.at, presentation.offset_hours);
            let value = Operations {
                ok: true,
                world_id: &scope.world_id,
                account_id: &scope.account_id,
                capabilities: &[Capability::Save],
                actor_id: (!scope.actor_id.is_empty()).then_some(scope.actor_id.as_str()),
                scope: &key,
                generation: &generation,
                mode: if local {
                    AuthenticationMode::Local
                } else {
                    AuthenticationMode::Oidc
                },
                checkpoint: &context,
                clock: Clock {
                    seconds: clock.at,
                    day,
                    day_label: presentation.day_label.as_deref(),
                    hour,
                    offset_hours: presentation.offset_hours,
                    speed: clock.speed,
                    paused: clock.paused || save_failed,
                    pause_reason: pause_reason(clock, save_failed),
                },
                maintenance: (),
            };
            match wire::encode(&value, b"", b"", budget) {
                Ok(bytes) => json_response(StatusCode::OK, bytes),
                Err(_) => busy(),
            }
        }) {
        Ok(response) => response,
        Err(error) => access_failure(error),
    }
}
