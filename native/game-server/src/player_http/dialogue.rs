//! The browser can start, inspect or cancel one real character request.
//! Receipt recovery has no submission or provider authority.

use super::*;
use crate::npc::{
    ChatRequest, ChatRetryRequest, InteractionAvailability, SubmitResult, human_request,
    job_report, valid_request_id,
};
use openlegend_simulation::runtime::InteractionMode;

pub(super) async fn chat(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let Ok(_slot) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let access = match scope(&state.authority, &parts.headers, None).await {
        Ok(access) => Arc::new(access),
        Err(error) => return access_failure(error),
    };
    if let Err(error) = state
        .clock
        .maintenance()
        .allow_ordinary(&state.authority, &access)
    {
        return failed(error);
    }
    let retry = parts.uri.path() == "/api/chat/retry";
    let status = if retry {
        StatusCode::OK
    } else {
        StatusCode::ACCEPTED
    };
    let result = if retry {
        let (input, custody): (ChatRetryRequest, _) =
            match json(&parts.headers, body, state.game.host.budget()).await {
                Ok(input) => input,
                Err(response) => return response,
            };
        state.decisions.retry(input, access.clone(), custody).await
    } else {
        let (input, custody): (ChatRequest, _) =
            match json(&parts.headers, body, state.game.host.budget()).await {
                Ok(input) => input,
                Err(response) => return response,
            };
        state
            .decisions
            .submit(input, access.clone(), custody, state.references.clone())
            .await
    };
    match result {
        Ok(result) => match state
            .authority
            .current(&access, Capability::Play, false, |_, _| match result {
                SubmitResult::Job(job) => reply(&state, status, &job_report(&job, true)),
                SubmitResult::Command(outcome, _custody) => reply(&state, status, &outcome),
                SubmitResult::Refusal { code, message } => refusal(status, code, message),
            }) {
            Ok(response) => response,
            Err(error) => access_failure(error),
        },
        Err(error) => failed(error),
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ReceiptRequest {
    request_id: String,
    timeline: String,
}

#[derive(Serialize)]
struct Recovered<'a, T: Serialize> {
    ok: bool,
    scope: &'a str,
    status: &'static str,
    message: &'a openlegend_simulation::text::JsText,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<T>,
}

pub(super) async fn receipt(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let Ok(_slot) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let access = match scope(&state.authority, &parts.headers, None).await {
        Ok(access) => access,
        Err(error) => return access_failure(error),
    };
    let (input, _custody): (ReceiptRequest, _) =
        match json(&parts.headers, body, state.game.host.budget()).await {
            Ok(input) => input,
            Err(response) => return response,
        };
    if !valid_request_id(&input.request_id) || !valid_request_id(&input.timeline) {
        return access_failure(AccessError::Forbidden);
    }
    if input.timeline != access.scope.timeline_id {
        return refusal(
            StatusCode::OK,
            "stale-world",
            "This request belongs to an earlier save.",
        );
    }
    let id = match human_request(&access.scope, &input.request_id) {
        Ok(id) => id,
        Err(error) => return failed(error),
    };
    let record = match state.decisions.receipt(&access, &id).await {
        Ok(result) => result,
        Err(error) => return failed(error),
    };
    match state
        .authority
        .current(&access, Capability::Play, false, |fields, _| {
            let Ok(scope) = fields.key() else {
                return busy();
            };
            let unknown =
                "The original request has no confirmed record yet. Nothing was resubmitted.".into();
            let (status, message, result) = match &record {
                Some(job) => ("resolved", &job.job.message, Some(job_report(job, false))),
                None => ("unknown", &unknown, None),
            };
            reply(
                &state,
                StatusCode::OK,
                &Recovered {
                    ok: true,
                    scope: &scope,
                    status,
                    message,
                    result,
                },
            )
        }) {
        Ok(response) => response,
        Err(error) => access_failure(error),
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CancelRequest {
    job_id: String,
}

pub(super) async fn cancel(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let Ok(_slot) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let access = match scope(&state.authority, &parts.headers, None).await {
        Ok(access) => access,
        Err(error) => return access_failure(error),
    };
    let (input, _custody): (CancelRequest, _) =
        match json(&parts.headers, body, state.game.host.budget()).await {
            Ok(input) => input,
            Err(response) => return response,
        };
    if !valid_request_id(&input.job_id) {
        return access_failure(AccessError::Forbidden);
    }
    match state.decisions.cancel(&access, &input.job_id).await {
        Ok(true) => control_response(&state, true, "cancelled", "Cancellation requested."),
        Ok(false) => refusal(
            StatusCode::OK,
            "request-unavailable",
            "That request is no longer pending.",
        ),
        Err(error) => failed(error),
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct AvailabilityRequest {
    mode: InteractionMode,
    target_id: Option<String>,
}

pub(super) async fn availability(
    State(state): State<PlayerRoutes>,
    Query(input): Query<AvailabilityRequest>,
    headers: HeaderMap,
) -> Response {
    let Ok(_slot) = state.capacity.try_acquire() else {
        return busy();
    };
    if input
        .target_id
        .as_deref()
        .is_some_and(|selected| !valid_request_id(selected))
    {
        return access_failure(AccessError::Forbidden);
    }
    let access = match read_scope(&state.authority, &headers).await {
        Ok(access) => Arc::new(access),
        Err(error) => return access_failure(error),
    };
    let result: InteractionAvailability = match state
        .decisions
        .availability(
            access.clone(),
            state.references.clone(),
            input.mode,
            input.target_id,
        )
        .await
    {
        Ok(result) => result,
        Err(error) => return failed(error),
    };
    match state
        .authority
        .current(&access, Capability::Play, false, |_, _| {
            reply(&state, StatusCode::OK, &result)
        }) {
        Ok(response) => response,
        Err(error) => access_failure(error),
    }
}
