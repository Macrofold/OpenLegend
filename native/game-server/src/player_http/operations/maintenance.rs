//! The existing Operations dashboard is the only browser writer for windows.
use crate::operator_maintenance::{Error, Field, Notice, Planned, Request as Edit, Transition};
use axum::{extract::State, http::StatusCode, response::Response};
use serde::Serialize;
use std::sync::Arc;

use super::super::{PlayerRoutes, access_failure, busy, failed, json, json_response, scope, wire};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Accepted<'a> {
    ok: bool,
    message: &'static str,
    maintenance: &'a Notice,
}

#[derive(Serialize)]
struct Refused {
    ok: bool,
    code: &'static str,
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    field: Option<Field>,
}

pub(in crate::player_http) async fn edit(
    State(state): State<PlayerRoutes>,
    request: axum::extract::Request,
) -> Response {
    let Ok(_slot) = state.capacity.clone().try_acquire_owned() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let authorized = match scope(&state.authority, &parts.headers, None).await {
        Ok(scope) => Arc::new(scope),
        Err(error) => return access_failure(error),
    };
    let budget = state.game.host.budget();
    let (edit, _custody) = match parts.uri.path() {
        "/api/maintenance/schedule" | "/api/maintenance/update" => {
            let (body, custody): (Planned, _) = match json(&parts.headers, body, budget).await {
                Ok(parsed) => parsed,
                Err(error) => return error,
            };
            let edit = if parts.uri.path().ends_with("/schedule") {
                Edit::Schedule(body)
            } else {
                Edit::Update(body)
            };
            (edit, custody)
        }
        path => {
            let (body, custody): (Transition, _) = match json(&parts.headers, body, budget).await {
                Ok(parsed) => parsed,
                Err(error) => return error,
            };
            let edit = match path {
                "/api/maintenance/start" => Edit::Start(body),
                "/api/maintenance/cancel" => Edit::Cancel(body),
                "/api/maintenance/ready" => Edit::Ready(body),
                _ => unreachable!("only the finite maintenance routes call this handler"),
            };
            (edit, custody)
        }
    };
    let clock = state.clock.clone();
    let authority = state.authority.clone();
    let operator = authorized.clone();
    // Once the protected operation begins, a closed tab cannot leave its
    // serial permit ahead of publication of the committed schedule.
    let result = state
        .game
        .world
        .operations
        .spawn(async move {
            let _custody = _custody;
            clock
                .maintenance()
                .request(&clock, (authority, operator), edit)
                .await
        })
        .await;
    match result {
        Ok(Ok(window)) => match state.authority.current(
            &authorized,
            crate::authority::Capability::Create,
            false,
            |_, _| {
                let accepted = Accepted {
                    ok: true,
                    message: "Maintenance updated.",
                    maintenance: &window.notice,
                };
                wire::encode(&accepted, b"", b"", budget)
                    .map(|bytes| json_response(StatusCode::OK, bytes))
            },
        ) {
            Ok(Ok(response)) => response,
            Ok(Err(_)) => busy(),
            Err(error) => access_failure(error),
        },
        Ok(Err(Error::Refused {
            code,
            message,
            field,
        })) => match state.authority.current(
            &authorized,
            crate::authority::Capability::Create,
            false,
            |_, _| {
                wire::encode(
                    &Refused {
                        ok: false,
                        code,
                        message,
                        field,
                    },
                    b"",
                    b"",
                    budget,
                )
                .map(|bytes| json_response(StatusCode::CONFLICT, bytes))
            },
        ) {
            Ok(Ok(response)) => response,
            Ok(Err(_)) => busy(),
            Err(error) => access_failure(error),
        },
        Ok(Err(Error::World(error))) => failed(error),
        Err(_) => busy(),
    }
}
