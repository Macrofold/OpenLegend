//! Read-only current service health for accounts with Inspect.

use super::super::{PlayerRoutes, access_failure, busy, failed, json_response, read_scope, wire};
use crate::{
    authority::Capability,
    player_view::{PauseReason, pause_reason},
};
use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    response::Response,
};
use serde::Serialize;

#[derive(Serialize)]
struct Status {
    runtime: RuntimeStatus,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeStatus {
    service_uptime_seconds: f64,
    profiling: ProfilingStatus,
    game_seconds: f64,
    configured_speed: f64,
    paused: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pause_reason: Option<PauseReason>,
    save_failed: bool,
}

#[derive(Serialize)]
struct ProfilingStatus {
    enabled: bool,
    state: RecorderState,
}

#[derive(Serialize)]
#[serde(rename_all = "lowercase")]
enum RecorderState {
    Disabled,
    #[cfg(feature = "profile-campaign")]
    Ready,
    #[cfg(feature = "profile-campaign")]
    Armed,
}

impl ProfilingStatus {
    fn current() -> Self {
        #[cfg(feature = "profile-campaign")]
        if let Some(armed) = crate::profile::armed() {
            return Self {
                enabled: armed,
                state: if armed {
                    RecorderState::Armed
                } else {
                    RecorderState::Ready
                },
            };
        }
        Self {
            enabled: false,
            state: RecorderState::Disabled,
        }
    }
}

pub(in crate::player_http) async fn status(
    State(state): State<PlayerRoutes>,
    headers: HeaderMap,
) -> Response {
    let Ok(_slot) = state.capacity.try_acquire() else {
        return busy();
    };
    let selected = match read_scope(&state.authority, &headers).await {
        Ok(scope) => scope,
        Err(error) => return access_failure(error),
    };
    if let Err(error) = state
        .authority
        .current(&selected, Capability::Inspect, false, |_, _| ())
    {
        return access_failure(error);
    }
    let world = state.game.world.clone();
    match world
        .capture(move |session| {
            let clock = session.clock()?;
            let save_failed = state.clock.saving_failed();
            Ok(state
                .authority
                .current(&selected, Capability::Inspect, false, |_, _| {
                    let status = Status {
                        runtime: RuntimeStatus {
                            service_uptime_seconds: state.clock.uptime().as_secs_f64(),
                            profiling: ProfilingStatus::current(),
                            game_seconds: clock.at,
                            configured_speed: clock.speed,
                            paused: clock.paused || save_failed,
                            pause_reason: pause_reason(clock, save_failed),
                            save_failed,
                        },
                    };
                    match wire::encode(&status, b"", b"", state.game.host.budget()) {
                        Ok(bytes) => json_response(StatusCode::OK, bytes),
                        Err(_) => busy(),
                    }
                }))
        })
        .await
    {
        Ok(Ok(response)) => response,
        Ok(Err(error)) => access_failure(error),
        Err(error) => failed(error),
    }
}
