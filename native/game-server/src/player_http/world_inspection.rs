//! The owner inspection panel uses the signed browser scope. Require its
//! current Inspect grant when reading and handing off the response.

use super::*;
use crate::mcp_http::{LiveReadRequest, ReadFailure};
use serde_json::{Map, Value, json as object};
use tokio_util::sync::CancellationToken;

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct RequestBody {
    name: String,
    arguments: Map<String, Value>,
}

pub(super) async fn read(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let Ok(slot) = state.capacity.clone().try_acquire_owned() else {
        return busy();
    };
    if !state.god_mode {
        return refusal(
            StatusCode::FORBIDDEN,
            "forbidden",
            "World-owner inspection is disabled.",
        );
    }
    let (parts, body) = request.into_parts();
    let scope = match scope(&state.authority, &parts.headers, None).await {
        Ok(authorized) => Arc::new(authorized),
        Err(error) => return access_failure(error),
    };
    if let Err(error) = state
        .authority
        .current(&scope, Capability::Inspect, false, |_, _| ())
    {
        return access_failure(error);
    }
    let (request, input): (RequestBody, _) =
        match json(&parts.headers, body, state.game.host.budget()).await {
            Ok(request) => request,
            Err(error) => return error,
        };
    if matches!(request.name.as_str(), "ol_entities" | "ol_activity")
        || (request.name == "ol_inspect"
            && request.arguments.get("kind").and_then(Value::as_str) == Some("entity"))
    {
        return read_live(state, scope, request, (slot, input)).await;
    }
    let stopped = CancellationToken::new();
    let _cancel = stopped.clone().drop_guard();
    let authority = state.authority.clone();
    let selected = scope.clone();
    let account = Arc::from(scope.scope.account_id.as_str());
    let stop = state.definitions.stop_signal();
    let prepared = tokio::select! {
        biased;
        _ = crate::launch::stopped(stop.clone()) => return access_failure(AccessError::Changed),
        prepared = tokio::time::timeout(REQUEST_TIMEOUT, state.definitions.signed(
            &request.name,
            request.arguments,
            account,
            (slot, input, state._request_owner.clone()),
            move || authority.current(&selected, Capability::Inspect, false, |_, _| ()).is_ok(),
            stopped,
        )) => prepared,
    };
    // Keep this running timeline through the synchronous HTTP handoff,
    // just like the current account grant below.
    let timeline = stop.borrow();
    if *timeline {
        return access_failure(AccessError::Changed);
    }
    match state
        .authority
        .current(&scope, Capability::Inspect, false, |_, _| match prepared {
            Ok(Ok(bytes)) => json_response(StatusCode::OK, bytes),
            Ok(Err(error)) => unavailable(&state, error),
            Err(_) => busy(),
        }) {
        Ok(response) => response,
        Err(error) => access_failure(error),
    }
}

async fn read_live(
    state: PlayerRoutes,
    scope: Arc<AuthorizedScope>,
    input: RequestBody,
    custody: (tokio::sync::OwnedSemaphorePermit, ByteReservation),
) -> Response {
    if let Err(error) = state
        .authority
        .current_private_view(&scope, true, |_, _| ())
    {
        return access_failure(error);
    }
    let request = match LiveReadRequest::select(&input.name, input.arguments) {
        Ok(request) => request,
        Err(error) => return unavailable(&state, error),
    };
    let world = state.game.world.clone();
    let stop = state.definitions.stop_signal();
    let shutdown = stop.clone();
    let custody = (custody, state._request_owner.clone());
    let publish = world.capture(move |session| {
        let _custody = custody;
        let timeline = stop.borrow();
        if *timeline {
            return Ok(access_failure(AccessError::Changed));
        }
        // Keep accepted subject/custody and both application grants current
        // together through encoding and synchronous response handoff.
        let result = state
            .authority
            .current_private_view(&scope, true, |selected, _| {
                session.with_live_inspection(&selected.account_id, &selected.actor_id, |read| {
                    Ok(
                        match request.publish(
                            read,
                            selected,
                            state.game.language().map(Arc::as_ref),
                            state.game.host.budget(),
                        ) {
                            Ok(bytes) => json_response(StatusCode::OK, bytes),
                            Err(error) => unavailable(&state, error),
                        },
                    )
                })
            });
        match result {
            Ok(Ok(Some(response))) => Ok(response),
            Ok(Ok(None)) => Ok(unavailable(&state, ReadFailure::Forbidden)),
            Ok(Err(error)) => Err(error),
            Err(error) => Ok(access_failure(error)),
        }
    });
    let result = tokio::select! {
        biased;
        _ = crate::launch::stopped(shutdown) => return access_failure(AccessError::Changed),
        result = tokio::time::timeout(REQUEST_TIMEOUT, publish) => result,
    };
    match result {
        Ok(Ok(response)) => response,
        Ok(Err(error)) => failed(error),
        Err(_) => busy(),
    }
}

fn unavailable(state: &PlayerRoutes, error: ReadFailure) -> Response {
    let (status, message) = error.details();
    reply(
        state,
        StatusCode::OK,
        &object!({
            "ok": false,
            "message": message,
            "result": { "status": status, "message": message, "cost": "no-paid-work" },
        }),
    )
}
