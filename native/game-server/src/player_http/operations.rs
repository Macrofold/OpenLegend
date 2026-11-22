//! Permission-scoped entry to operations. Each section prepares only its
//! permitted read and all bytes are handed off under the same current grant.

use super::{PlayerRoutes, access_failure, busy, failed, json_response, read_scope, wire};
use crate::authority::{AccessError, Capability};
use crate::player_view::{
    AuthenticationMode, CheckpointContext, PauseReason, checkpoint_context, clock_parts,
    pause_reason,
};
use crate::store::assets::AssetRevision;
use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::response::Response;
use openlegend_simulation::runtime::{RuntimeError, RuntimeOverview};
use serde::Serialize;
use serde_json::value::RawValue;

pub(super) mod access;
pub(super) mod maintenance;
pub(super) mod performance;

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
    presentation_release: Option<&'a AssetRevision>,
    #[serde(skip_serializing_if = "Option::is_none")]
    presentation_release_revision: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    access: Option<access::AccessSection<'a>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    overview: Option<Overview<'a>>,
    clock: Clock<'a>,
    maintenance: Option<&'a crate::operator_maintenance::Notice>,
    #[serde(skip_serializing_if = "Option::is_none")]
    maintenance_history: Option<Vec<&'a crate::operator_maintenance::Notice>>,
}

#[derive(Serialize)]
struct Overview<'a> {
    map: OverviewMap<'a>,
    #[serde(flatten)]
    locations: &'a RuntimeOverview,
}

#[derive(Serialize)]
struct OverviewMap<'a> {
    width: f64,
    height: f64,
    tiles: &'a RawValue,
    terrain: &'a RawValue,
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
    let Ok(_slot) = state.capacity.clone().try_acquire_owned() else {
        return busy();
    };
    let authorized = match read_scope(&state.authority, &headers).await {
        Ok(scope) => scope,
        Err(error) => return access_failure(error),
    };
    let (manages_access, manages_saves, spectates) =
        match state
            .authority
            .current_operations(&authorized, |_, caps, _| {
                (
                    caps.contains(&Capability::ManageAccess),
                    caps.contains(&Capability::Save),
                    caps.contains(&Capability::Spectate),
                )
            }) {
            Ok(allowed) => allowed,
            Err(error) => return access_failure(error),
        };
    let budget = state.game.host.budget();
    let Ok(_workspace) = budget.reserve(8192) else {
        return busy();
    };
    let published = state.clock.maintenance().clone();
    let (clock, generation, artwork, artwork_revision, maintenance, locations) = match state
        .game
        .world
        .capture(move |world| {
            let (reference, revision) = if manages_saves {
                let (raw, revision) = world.saved_presentation_release();
                (
                    raw.map(AssetRevision::from_current)
                        .transpose()
                        .map_err(|_| {
                            RuntimeError::application_refused("Invalid saved artwork identity")
                        })?,
                    Some(revision.unwrap_or(0)),
                )
            } else {
                (None, None)
            };
            Ok((
                world.clock()?,
                world.accepted_progress()?.generation.to_owned(),
                reference,
                revision,
                published.snapshot(),
                spectates.then(|| world.public_overview()).transpose()?,
            ))
        })
        .await
    {
        Ok(value) => value,
        Err(error) => return failed(error),
    };
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
    let artwork = match (artwork, state.game.installed_assets()) {
        (Some(reference), Some(installed)) => match installed
            .permitted_release(&state.game.store, &authorized.scope.account_id, &reference)
            .await
        {
            Ok(Some(_)) => Some(reference),
            Ok(None) => None,
            Err(_) => return busy(),
        },
        _ => None,
    };
    let world = state.game.world.clone();
    let revision = maintenance.revision;
    let source_generation = generation.clone();
    let disclose = move || match state.authority.current_operations(
        &authorized,
        |scope, capabilities, local| {
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
            let presentation = &state.game.view_policy().world;
            let (day, hour) = clock_parts(clock.at, presentation.offset_hours);
            let overview = locations.as_ref().and_then(|locations| {
                capabilities
                    .contains(&Capability::Spectate)
                    .then(|| Overview {
                        map: OverviewMap {
                            width: presentation.map.width,
                            height: presentation.map.height,
                            tiles: &presentation.map.tiles,
                            terrain: &presentation.map.terrain,
                        },
                        locations,
                    })
            });
            let value = Operations {
                ok: true,
                world_id: &scope.world_id,
                account_id: &scope.account_id,
                capabilities,
                actor_id: (!scope.actor_id.is_empty()).then_some(scope.actor_id.as_str()),
                scope: &key,
                generation: maintenance.generation.as_deref().unwrap_or(&generation),
                mode: if local {
                    AuthenticationMode::Local
                } else {
                    AuthenticationMode::Oidc
                },
                checkpoint: context.as_ref(),
                presentation_release: artwork.as_ref(),
                presentation_release_revision: artwork_revision,
                access: roster
                    .as_ref()
                    .map(|roster| access::AccessSection::new(roster, &scope.account_id)),
                overview,
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
                maintenance: maintenance.notice(),
                maintenance_history: capabilities
                    .contains(&Capability::Create)
                    .then(|| maintenance.history().collect()),
            };
            match wire::encode(&value, b"", b"", state.game.host.budget()) {
                Ok(bytes) => json_response(StatusCode::OK, bytes),
                Err(_) => busy(),
            }
        },
    ) {
        Ok(response) => response,
        Err(error) => access_failure(error),
    };
    match world
        .capture(move |world| {
            let artwork_current = artwork_revision.is_none_or(|expected| {
                world.saved_presentation_release().1.unwrap_or(0) == expected
            });
            let timeline_current = world.accepted_progress()?.generation == source_generation;
            Ok((timeline_current
                && artwork_current
                && world.clock()?.maintenance_revision == revision)
                .then(disclose))
        })
        .await
    {
        Ok(Some(response)) => response,
        Ok(None) => access_failure(AccessError::Changed),
        Err(error) => failed(error),
    }
}
