//! Existing local-browser authentication endpoints. The listener routes these
//! through the same current SQL accounts, sessions and grants as gameplay.

use crate::authority::{AccessError, Authority, WorldGrant};
use axum::{
    Json, Router,
    extract::{DefaultBodyLimit, Request, State},
    http::{HeaderMap, HeaderValue, StatusCode, header},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::{get, post},
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Clone)]
struct AccessRoutes {
    authority: Arc<Authority>,
    port: u16,
}

pub fn local_access_router(authority: Arc<Authority>, port: u16) -> Router {
    let state = AccessRoutes { authority, port };
    Router::new()
        .route("/auth/login", get(login))
        .route("/api/session", get(session))
        .route("/api/session/logout", post(logout))
        .layer(DefaultBodyLimit::max(1024))
        .layer(middleware::from_fn_with_state(state.clone(), check_origin))
        .with_state(state)
}

async fn check_origin(State(state): State<AccessRoutes>, request: Request, next: Next) -> Response {
    let headers = request.headers();
    let Some(host) = headers
        .get(header::HOST)
        .and_then(|value| value.to_str().ok())
    else {
        return refusal(
            StatusCode::FORBIDDEN,
            "host",
            "Use the configured game host.",
        );
    };
    let Some((address, port)) = host.rsplit_once(':') else {
        return refusal(
            StatusCode::FORBIDDEN,
            "host",
            "Use the configured game host.",
        );
    };
    if !matches!(address, "127.0.0.1" | "localhost" | "[::1]")
        || port.parse::<u16>().ok() != Some(state.port)
    {
        return refusal(
            StatusCode::FORBIDDEN,
            "host",
            "Use the configured game host.",
        );
    }
    let expected = format!("http://{host}");
    let matches_origin = headers
        .get(header::ORIGIN)
        .is_some_and(|value| value.as_bytes() == expected.as_bytes());
    if headers
        .get("sec-fetch-site")
        .is_some_and(|value| value == "cross-site")
        || (headers.contains_key(header::ORIGIN) && !matches_origin)
        || (request.uri().path() == "/api/session/logout" && !matches_origin)
    {
        return refusal(
            StatusCode::FORBIDDEN,
            "origin",
            "Use the game in its own browser tab.",
        );
    }
    let mut response = next.run(request).await;
    response
        .headers_mut()
        .insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
    response
}

fn cookie(headers: &HeaderMap) -> Option<&str> {
    headers
        .get(header::COOKIE)?
        .to_str()
        .ok()?
        .split(';')
        .find_map(|member| member.trim_start().strip_prefix("ol_session="))
}

async fn login(State(state): State<AccessRoutes>) -> Response {
    let token = match state.authority.sign_in_local().await {
        Ok(token) => token,
        Err(error) => return access_failure(error),
    };
    let cookie = format!("ol_session={token}; HttpOnly; SameSite=Lax; Path=/");
    (
        StatusCode::SEE_OTHER,
        [
            (header::LOCATION, "/"),
            (header::SET_COOKIE, cookie.as_str()),
        ],
    )
        .into_response()
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SessionView {
    ok: bool,
    account_id: String,
    worlds: Vec<WorldGrant>,
}

async fn session(State(state): State<AccessRoutes>, headers: HeaderMap) -> Response {
    let Some(token) = cookie(&headers) else {
        return access_failure(AccessError::Session);
    };
    match state.authority.session(token).await {
        Ok((account_id, worlds)) => Json(SessionView {
            ok: true,
            account_id,
            worlds,
        })
        .into_response(),
        Err(error) => access_failure(error),
    }
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Logout {}

async fn logout(
    State(state): State<AccessRoutes>,
    headers: HeaderMap,
    Json(_request): Json<Logout>,
) -> Response {
    let Some(token) = cookie(&headers) else {
        return access_failure(AccessError::Session);
    };
    match state.authority.logout(token).await {
        Ok(()) => (
            [(
                header::SET_COOKIE,
                "ol_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
            )],
            Json(serde_json::json!({"ok": true, "message": "Signed out."})),
        )
            .into_response(),
        Err(error) => access_failure(error),
    }
}

fn access_failure(error: AccessError) -> Response {
    match error {
        AccessError::Session => {
            refusal(StatusCode::UNAUTHORIZED, "session", "Sign in to continue.")
        }
        AccessError::Forbidden => refusal(
            StatusCode::FORBIDDEN,
            "forbidden",
            "This operation is unavailable to this account.",
        ),
        AccessError::Changed => refusal(
            StatusCode::FORBIDDEN,
            "stale-scope",
            "Your access or world changed. Refresh before continuing.",
        ),
        _ => refusal(
            StatusCode::SERVICE_UNAVAILABLE,
            "unavailable",
            "Sign-in is temporarily unavailable.",
        ),
    }
}

fn refusal(status: StatusCode, code: &str, message: &str) -> Response {
    (
        status,
        Json(serde_json::json!({ "ok": false, "code": code, "message": message })),
    )
        .into_response()
}
