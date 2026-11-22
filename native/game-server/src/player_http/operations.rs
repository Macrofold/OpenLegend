//! Permission-scoped entry to operations. Each section prepares only its
//! permitted read and all bytes are handed off under the same current grant.

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

pub(super) mod access;

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
    #[serde(skip_serializing_if = "Option::is_none")]
    checkpoint: Option<&'a CheckpointContext>,
    #[serde(skip_serializing_if = "Option::is_none")]
    access: Option<access::AccessSection<'a>>,
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
    let manages_access = match state
        .authority
        .current_operations(&authorized, |_, caps, _| {
            caps.contains(&Capability::ManageAccess)
        }) {
        Ok(allowed) => allowed,
        Err(error) => return access_failure(error),
    };
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
    let roster = if manages_access {
        let candidates = match state
            .game
            .world
            .capture(openlegend_simulation::runtime::NativeWorldSession::invitation_actors)
            .await
        {
            Ok(candidates) => candidates,
            Err(error) => return failed(error),
        };
        match state.authority.access_roster(&authorized, candidates).await {
            Ok(roster) => Some(roster),
            Err(error) => return access::failure(error),
        }
    } else {
        None
    };
    match state
        .authority
        .current_operations(&authorized, |scope, capabilities, local| {
            let Ok(key) = scope.key() else {
                return busy();
            };
            let context = if capabilities.contains(&Capability::Save) {
                let Ok(context) = checkpoint_context(scope, &key) else {
                    return busy();
                };
                Some(context)
            } else {
                None
            };
            let (day, hour) = clock_parts(clock.at, presentation.offset_hours);
            let value = Operations {
                ok: true,
                world_id: &scope.world_id,
                account_id: &scope.account_id,
                capabilities,
                actor_id: (!scope.actor_id.is_empty()).then_some(scope.actor_id.as_str()),
                scope: &key,
                generation: &generation,
                mode: if local {
                    AuthenticationMode::Local
                } else {
                    AuthenticationMode::Oidc
                },
                checkpoint: context.as_ref(),
                access: roster
                    .as_ref()
                    .map(|roster| access::AccessSection::new(roster, &scope.account_id)),
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
