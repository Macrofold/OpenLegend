//! Existing local-browser authentication endpoints. The listener routes these
//! through the same current SQL accounts, sessions and grants as gameplay.

use crate::{
    authority::{AccessError, Authority, WorldGrant},
    oidc::Oidc,
    wire,
};
use axum::{
    Json, Router,
    extract::{DefaultBodyLimit, Query, Request, State},
    http::{HeaderMap, HeaderValue, StatusCode, header},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::{get, post},
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

mod invites;
pub(crate) use invites::Enrollment;

#[derive(Clone)]
struct AccessRoutes {
    authority: Arc<Authority>,
    identity: IdentityMode,
    enrollment: Option<Enrollment>,
}

#[derive(Clone)]
enum IdentityMode {
    Local(u16),
    Oidc(Arc<Oidc>),
}

pub fn local_access_router(authority: Arc<Authority>, port: u16) -> Router {
    local_router(authority, port, Router::new())
}

pub fn oidc_access_router(authority: Arc<Authority>, oidc: Arc<Oidc>) -> Router {
    oidc_router(authority, oidc, Router::new(), None)
}

pub(crate) fn local_router(authority: Arc<Authority>, port: u16, game: Router) -> Router {
    access_router(
        AccessRoutes {
            authority,
            identity: IdentityMode::Local(port),
            enrollment: None,
        },
        game,
    )
}

pub(crate) fn oidc_router(
    authority: Arc<Authority>,
    oidc: Arc<Oidc>,
    game: Router,
    enrollment: Option<Enrollment>,
) -> Router {
    access_router(
        AccessRoutes {
            authority,
            identity: IdentityMode::Oidc(oidc),
            enrollment,
        },
        game,
    )
}

fn access_router(state: AccessRoutes, game: Router) -> Router {
    let origin = match &state.identity {
        IdentityMode::Local(port) => BrowserOrigin::Loopback(*port),
        IdentityMode::Oidc(oidc) => BrowserOrigin::Configured(oidc.origin().into()),
    };
    let routes = Router::new()
        .route("/auth/invite", get(invites::landing))
        .route("/auth/login", get(login))
        .route("/auth/callback", get(callback))
        .route("/api/session", get(session))
        .route("/api/session/logout", post(logout))
        .layer(DefaultBodyLimit::max(1024))
        .with_state(state.clone())
        .merge(game);
    guard_origin(routes, origin)
}

#[derive(Clone)]
pub(crate) enum BrowserOrigin {
    Loopback(u16),
    Configured(Arc<str>),
}

pub(crate) fn guard_origin(router: Router, origin: BrowserOrigin) -> Router {
    router.layer(middleware::from_fn_with_state(origin, check_origin))
}

async fn check_origin(
    State(origin): State<BrowserOrigin>,
    request: Request,
    next: Next,
) -> Response {
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
    let expected = match &origin {
        BrowserOrigin::Loopback(port) => host
            .rsplit_once(':')
            .filter(|(addr, value)| {
                matches!(*addr, "127.0.0.1" | "localhost" | "[::1]")
                    && value.parse::<u16>().ok() == Some(*port)
            })
            .map(|_| format!("http://{host}")),
        BrowserOrigin::Configured(origin) => origin
            .split_once("://")
            .filter(|(_, configured)| *configured == host)
            .map(|_| origin.to_string()),
    };
    let Some(expected) = expected else {
        return refusal(
            StatusCode::FORBIDDEN,
            "host",
            "Use the configured game host.",
        );
    };
    let matches_origin = headers
        .get(header::ORIGIN)
        .is_some_and(|value| value.as_bytes() == expected.as_bytes());
    // The public page, an invitation link and an identity redirect may
    // complete a browser navigation begun on another site. Private API
    // reads and all mutating API routes keep their existing origin checks.
    let external_entry = matches!(origin, BrowserOrigin::Configured(_))
        && request.method() == axum::http::Method::GET
        && (request.uri().path() == "/auth/callback"
            || (matches!(request.uri().path(), "/" | "/auth/invite")
                && headers
                    .get("sec-fetch-mode")
                    .is_some_and(|value| value == "navigate")
                && headers
                    .get("sec-fetch-dest")
                    .is_some_and(|value| value == "document")));
    if !external_entry
        && (headers
            .get("sec-fetch-site")
            .is_some_and(|value| value == "cross-site")
            || (headers.contains_key(header::ORIGIN) && !matches_origin)
            || (request.uri().path().starts_with("/api/")
                && request.method() == axum::http::Method::POST
                && !matches_origin))
    {
        return refusal(
            StatusCode::FORBIDDEN,
            "origin",
            "Use the game in its own browser tab.",
        );
    }
    let private =
        request.uri().path().starts_with("/api/") || request.uri().path().starts_with("/auth/");
    let mut response = next.run(request).await;
    let headers = response.headers_mut();
    if private {
        headers.insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
    }
    headers.insert(
        "x-content-type-options",
        HeaderValue::from_static("nosniff"),
    );
    headers.insert("x-frame-options", HeaderValue::from_static("DENY"));
    headers.insert("referrer-policy", HeaderValue::from_static("same-origin"));
    response
}

pub(crate) fn read_cookie<'a>(headers: &'a HeaderMap, name: &str) -> Option<&'a str> {
    headers
        .get(header::COOKIE)?
        .to_str()
        .ok()?
        .split(';')
        .find_map(|member| {
            let (key, value) = member.trim_start().split_once('=')?;
            (key == name
                && value.len() == 64
                && value
                    .bytes()
                    .all(|byte| matches!(byte, b'0'..=b'9' | b'a'..=b'f')))
            .then_some(value)
        })
}

fn set_cookie(name: &str, token: &str, secure: bool, age: Option<i64>) -> String {
    let mut cookie = format!("{name}={token}; HttpOnly; SameSite=Lax; Path=/");
    if secure {
        cookie.push_str("; Secure");
    }
    if let Some(age) = age {
        cookie.push_str(&format!("; Max-Age={age}"));
    }
    cookie
}

#[derive(Deserialize)]
struct LoginQuery {
    #[serde(rename = "change-account")]
    change_account: Option<String>,
}

async fn login(State(state): State<AccessRoutes>, Query(query): Query<LoginQuery>) -> Response {
    match &state.identity {
        IdentityMode::Local(_) => match state.authority.sign_in_local().await {
            Ok(token) => redirect("/", &[set_cookie("ol_session", &token, false, None)]),
            Err(error) => access_failure(error),
        },
        IdentityMode::Oidc(oidc) => {
            start_oidc(oidc, query.change_account.as_deref() == Some("true"), None).await
        }
    }
}

/// An invite starts the same OIDC operation as Sign in. Retain its hash only
/// in this exact pending login; a second navigation cannot replace the invite.
async fn start_oidc(
    oidc: &Arc<Oidc>,
    change_account: bool,
    invitation: Option<crate::authority::invites::InviteHash>,
) -> Response {
    let mut nonce = [0_u8; 32];
    if getrandom::fill(&mut nonce).is_err() {
        return access_failure(AccessError::Availability);
    }
    let token = openlegend_simulation::encoding::sha256_hex(&nonce);
    match oidc.begin(&token, change_account, invitation).await {
        Ok(location) => redirect(
            location.as_str(),
            &[set_cookie(
                "ol_login",
                &token,
                oidc.origin().starts_with("https:"),
                Some(300),
            )],
        ),
        Err(_) => access_failure(AccessError::Availability),
    }
}

#[derive(Deserialize)]
struct CallbackQuery {
    state: String,
    code: Option<String>,
}

async fn callback(
    State(state): State<AccessRoutes>,
    headers: HeaderMap,
    Query(query): Query<CallbackQuery>,
) -> Response {
    let IdentityMode::Oidc(oidc) = &state.identity else {
        return refusal(StatusCode::NOT_FOUND, "route", "Unknown API route.");
    };
    if query.state.len() > 256 || query.code.as_ref().is_some_and(|code| code.len() > 4096) {
        return access_failure(AccessError::Session);
    }
    match oidc
        .complete(
            &state.authority,
            &query.state,
            query.code,
            read_cookie(&headers, "ol_login"),
            read_cookie(&headers, "ol_session"),
        )
        .await
    {
        Ok(login) => {
            let secure = oidc.origin().starts_with("https:");
            let (login, location) = if login.invitation.is_some() {
                let inviting = state.clone();
                // A claim holds its verified login deadline. Its SQL commit
                // finishes even if the browser disconnects after admission.
                match tokio::spawn(async move {
                    let location = invites::complete(
                        &inviting.authority,
                        inviting.enrollment.as_ref(),
                        &login,
                    )
                    .await;
                    (login, location)
                })
                .await
                {
                    Ok(value) => value,
                    Err(_) => return access_failure(AccessError::Availability),
                }
            } else {
                (login, "/")
            };
            redirect(
                location,
                &[
                    set_cookie(
                        "ol_session",
                        &login.token,
                        secure,
                        Some(state.authority.session_lifetime_secs()),
                    ),
                    set_cookie("ol_login", "", secure, Some(0)),
                ],
            )
        }
        Err(error) => access_failure(error),
    }
}

fn redirect(location: &str, cookies: &[String]) -> Response {
    let Ok(location) = HeaderValue::from_str(location) else {
        return access_failure(AccessError::Availability);
    };
    let mut response = (StatusCode::SEE_OTHER, [(header::LOCATION, location)]).into_response();
    for cookie in cookies {
        if let Ok(value) = HeaderValue::from_str(cookie) {
            response.headers_mut().append(header::SET_COOKIE, value);
        }
    }
    response
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SessionView<'a> {
    ok: bool,
    account_id: &'a str,
    worlds: &'a [WorldGrant],
}

async fn session(State(state): State<AccessRoutes>, headers: HeaderMap) -> Response {
    let Some(token) = read_cookie(&headers, "ol_session") else {
        return access_failure(AccessError::Session);
    };
    match state
        .authority
        .session(token, |account_id, worlds| {
            wire::encode(
                &SessionView {
                    ok: true,
                    account_id,
                    worlds,
                },
                b"",
                b"",
                state.authority.output_budget(),
            )
        })
        .await
    {
        Ok(Ok(bytes)) => (
            [(header::CONTENT_TYPE, "application/json; charset=utf-8")],
            bytes,
        )
            .into_response(),
        Ok(Err(_)) => access_failure(AccessError::Availability),
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
    let Some(token) = read_cookie(&headers, "ol_session") else {
        return access_failure(AccessError::Session);
    };
    match state.authority.logout(token).await {
        Ok(()) => (
            [(
                header::SET_COOKIE,
                set_cookie(
                    "ol_session",
                    "",
                    match &state.identity {
                        IdentityMode::Local(_) => false,
                        IdentityMode::Oidc(oidc) => oidc.origin().starts_with("https:"),
                    },
                    Some(0),
                ),
            )],
            Json(serde_json::json!({"ok": true, "message": "Signed out."})),
        )
            .into_response(),
        Err(error) => access_failure(error),
    }
}

pub(crate) fn access_failure(error: AccessError) -> Response {
    match error {
        AccessError::Session => {
            refusal(StatusCode::UNAUTHORIZED, "session", "Sign in to continue.")
        }
        AccessError::Forbidden => refusal(
            StatusCode::FORBIDDEN,
            "forbidden",
            "This operation is unavailable to this account.",
        ),
        AccessError::Characterless => refusal(
            StatusCode::FORBIDDEN,
            "characterless",
            "This account has no character in this world. Use World operations.",
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

pub(crate) fn refusal(status: StatusCode, code: &str, message: &str) -> Response {
    (
        status,
        Json(serde_json::json!({ "ok": false, "code": code, "message": message })),
    )
        .into_response()
}
