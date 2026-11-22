//! The existing Actions history panel reads only its explicit private page.

use super::*;
use crate::world::PlayerDisclosure;
use openlegend_simulation::{activity::RuntimeActivityPage, values::is_safe_record_id};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct PageRequest {
    actor_id: String,
    #[serde(default = "start")]
    after: i64,
    #[serde(default)]
    method_after: usize,
}

fn start() -> i64 {
    -1
}

#[derive(Serialize)]
struct PageResponse<'a> {
    ok: bool,
    page: RuntimeActivityPage<'a>,
}

pub(super) async fn read(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let Ok(_slot) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let selected = match scope(&state.authority, &parts.headers, None).await {
        Ok(selected) => Arc::new(selected),
        Err(error) => return access_failure(error),
    };
    let (request, _storage): (PageRequest, _) =
        match json(&parts.headers, body, state.game.host.budget()).await {
            Ok(value) => value,
            Err(error) => return error,
        };
    if !is_safe_record_id(&request.actor_id)
        || (parts.uri.path() == "/api/activity-history"
            && request.actor_id != selected.scope.actor_id)
    {
        return access_failure(AccessError::Forbidden);
    }
    if !(-1..=openlegend_simulation::identity::MAX_SAFE_INTEGER as i64).contains(&request.after)
        || request.method_after > 64
    {
        return refusal(
            StatusCode::BAD_REQUEST,
            "invalid-cursor",
            "Refresh action history and try again.",
        );
    }

    for _ in 0..2 {
        match state
            .game
            .world
            .activity_history(
                state.authority.clone(),
                selected.clone(),
                &request.actor_id,
                request.after,
                request.method_after,
                openlegend_simulation::narration::historical_account,
                |page, budget| {
                    wire::encode(&PageResponse { ok: true, page }, b"", b"", budget)
                        .map_err(WorldError::Wire)
                },
            )
            .await
        {
            Ok(PlayerDisclosure::Published(bytes)) => return json_response(StatusCode::OK, bytes),
            Ok(PlayerDisclosure::Busy) | Err(WorldError::Storage(StoreError::StaleCut)) => (),
            Ok(_) | Err(WorldError::ProjectionChanged) => break,
            Err(error) => return failed(error),
        }
    }
    refusal(
        StatusCode::CONFLICT,
        "activity-history-changed",
        "Action history changed. Refresh to continue.",
    )
}
