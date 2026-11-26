//! Start a descriptive Act with the same controlling scope as typed commands.
//! Recovery never submits a provider request.
use super::dialogue::Recovered;
use super::*;
use crate::npc::{ExpressionRequest, SubmitResult, job_report, valid_request_id};

pub(super) async fn submit(State(state): State<PlayerRoutes>, request: Request) -> Response {
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
    let (input, custody) = match json(&parts.headers, body, state.game.host.budget()).await {
        Ok(input) => input,
        Err(response) => return response,
    };
    match state
        .decisions
        .expression(input, access.clone(), custody, state.references.clone())
        .await
    {
        Ok(result) => match state
            .authority
            .current(&access, Capability::Play, false, |_, _| {
                let code = StatusCode::ACCEPTED;
                match result {
                    SubmitResult::Job(job) => reply(&state, code, &job_report(&job, true)),
                    SubmitResult::Refusal {
                        code: reason,
                        message,
                    } => refusal(code, reason, message),
                    SubmitResult::Command(..) => {
                        unreachable!("Expression only admits a description job")
                    }
                }
            }) {
            Ok(response) => response,
            Err(error) => access_failure(error),
        },
        Err(error) => failed(error),
    }
}

pub(super) async fn receipt(
    state: &PlayerRoutes,
    scope: Arc<AuthorizedScope>,
    timeline: String,
    request: ExpressionRequest,
    custody: ByteReservation,
) -> Response {
    if !valid_request_id(&timeline) {
        return access_failure(AccessError::Forbidden);
    }
    if timeline != scope.scope.timeline_id {
        return refusal(
            StatusCode::OK,
            "stale-world",
            "This action belongs to an earlier world timeline.",
        );
    }
    let outcome = match state
        .decisions
        .expression_receipt(scope.clone(), request, custody)
        .await
    {
        Ok(outcome) => outcome,
        Err(error) => return failed(error),
    };
    match state
        .authority
        .current(&scope, Capability::Play, false, |fields, _| {
            let Ok(scope) = fields.key() else {
                return busy();
            };
            let code = StatusCode::OK;
            let unknown =
                "The original request has no confirmed record yet. Nothing was resubmitted.".into();
            let (status, message, result) = match &outcome {
                Some(SubmitResult::Job(job)) => {
                    ("resolved", &job.job.message, Some(job_report(job, false)))
                }
                Some(SubmitResult::Refusal {
                    code: reason,
                    message,
                }) => return refusal(code, reason, message),
                Some(SubmitResult::Command(..)) => {
                    unreachable!("Expression only recovers description jobs")
                }
                None => ("unknown", &unknown, None),
            };
            reply(
                state,
                code,
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
