//! A desktop client exchanges one approved loopback code for its own session.
//! The browser signs in with the ordinary identity provider and keeps its cookie.

use super::{
    AccessRoutes, IdentityMode, access_failure, read_cookie, redirect, refusal, set_cookie,
    start_oidc,
};
use crate::authority::{AccessError, DesktopBrowser, invites::invite_hash};
use axum::{
    Json,
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode, header},
    response::{Html, IntoResponse, Response},
};
use openlegend_simulation::{encoding::hex_bytes, host::ByteReservation};
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use subtle::ConstantTimeEq;
use tokio::time::Instant;
use uuid::Uuid;

const CALLBACK: &str = "/openlegend/auth/callback";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct Start {
    redirect_uri: String,
    state: String,
    challenge: String,
    invite: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct Exchange {
    code: String,
    state: String,
    verifier: String,
    redirect_uri: String,
}

pub(crate) struct Attempt {
    request: Start,
    expires: Instant,
    // Bind the confirmation to the exact browser session and world grant.
    browser: Option<DesktopBrowser>,
    approved: Option<[u8; 32]>,
    _custody: ByteReservation,
}

pub(crate) type Attempts = HashMap<Uuid, Attempt>;

impl Attempt {
    pub(crate) fn current(&self, now: Instant) -> bool {
        now < self.expires
    }
}

fn loopback(uri: &str) -> bool {
    let Some(port) = uri
        .strip_prefix("http://127.0.0.1:")
        .and_then(|path| path.strip_suffix(CALLBACK))
    else {
        return false;
    };
    port.parse::<u16>()
        .is_ok_and(|number| number > 0 && number.to_string() == port)
}

fn encoded_sha256(value: &str) -> bool {
    value.len() == 43
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_'))
}

fn verifier(value: &str) -> bool {
    (43..=128).contains(&value.len())
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b'~'))
}

fn stale() -> Response {
    refusal(
        StatusCode::BAD_REQUEST,
        "desktop-sign-in",
        "Start sign-in again from the game.",
    )
}

fn matches_browser(attempt: &Attempt, browser: &DesktopBrowser) -> bool {
    attempt.current(Instant::now())
        && attempt.approved.is_none()
        && attempt
            .browser
            .as_ref()
            .is_some_and(|selected| selected.same_approval(browser))
}

pub(super) async fn bootstrap() -> Response {
    Json(serde_json::json!({ "protocol": "openlegend-desktop-1" })).into_response()
}

pub(super) async fn start(
    State(state): State<AccessRoutes>,
    headers: HeaderMap,
    Query(mut request): Query<Start>,
) -> Response {
    if !loopback(&request.redirect_uri)
        || !encoded_sha256(&request.state)
        || !encoded_sha256(&request.challenge)
    {
        return stale();
    }
    let invitation = match request.invite.take() {
        Some(value) if matches!(&state.identity, IdentityMode::Oidc(_)) => {
            let Some(hash) = invite_hash(&value) else {
                return redirect("/?entry=invite-unavailable", &[]);
            };
            match state.authority.invite_landing(hash).await {
                Ok(true) => Some(hash),
                Ok(false) => return redirect("/?entry=invite-unavailable", &[]),
                Err(_) => return access_failure(AccessError::Availability),
            }
        }
        Some(_) => return redirect("/?entry=invite-unavailable", &[]),
        None => None,
    };
    let id = Uuid::new_v4();
    {
        let Ok(mut pending) = state.pending.lock() else {
            return access_failure(AccessError::Availability);
        };
        let now = Instant::now();
        let Ok(custody) = pending.admit(state.authority.output_budget(), now) else {
            return access_failure(AccessError::Busy);
        };
        pending.desktop.insert(
            id,
            Attempt {
                request,
                expires: now + crate::oidc::PENDING_LIFETIME,
                browser: None,
                approved: None,
                _custody: custody,
            },
        );
    }
    if invitation.is_none()
        && let Some(token) = read_cookie(&headers, "ol_session")
    {
        match bind_browser(&state, id, token).await {
            Ok(path) => return redirect(&path, &[]),
            Err(AccessError::Session | AccessError::Changed) => {}
            Err(error) => {
                discard_attempt(&state, id);
                return access_failure(error);
            }
        }
    }
    let response = match &state.identity {
        IdentityMode::Local(_) => match state.authority.sign_in_local().await {
            Ok(token) => match bind_browser(&state, id, &token).await {
                Ok(path) => redirect(&path, &[set_cookie("ol_session", &token, false, None)]),
                Err(error) => access_failure(error),
            },
            Err(error) => access_failure(error),
        },
        IdentityMode::Oidc(oidc) => start_oidc(oidc, false, invitation, Some(id)).await,
    };
    if response.status() != StatusCode::SEE_OTHER {
        discard_attempt(&state, id);
    }
    response
}

pub(super) fn discard_attempt(state: &AccessRoutes, id: Uuid) {
    if let Ok(mut pending) = state.pending.lock() {
        pending.desktop.remove(&id);
    }
}

pub(super) async fn bind_browser(
    state: &AccessRoutes,
    id: Uuid,
    token: &str,
) -> Result<String, AccessError> {
    let browser = state.authority.desktop_browser(token).await?;
    let mut pending = state
        .pending
        .lock()
        .map_err(|_| AccessError::Availability)?;
    let attempt = pending
        .desktop
        .get_mut(&id)
        .filter(|attempt| attempt.current(Instant::now()) && attempt.browser.is_none())
        .ok_or(AccessError::Changed)?;
    state.authority.current_desktop_browser(&browser, || {
        attempt.browser = Some(browser.clone());
        format!("/auth/desktop/confirm/{id}")
    })
}

pub(super) async fn confirm(
    State(state): State<AccessRoutes>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> Response {
    let Some(token) = read_cookie(&headers, "ol_session") else {
        return access_failure(AccessError::Session);
    };
    let browser = match state.authority.desktop_browser(token).await {
        Ok(browser) => browser,
        Err(error) => return access_failure(error),
    };
    let Ok(pending) = state.pending.lock() else {
        return access_failure(AccessError::Availability);
    };
    let Some(attempt) = pending
        .desktop
        .get(&id)
        .filter(|attempt| matches_browser(attempt, &browser))
    else {
        return stale();
    };
    match state.authority.current_desktop_browser(&browser, || {
        let account = escape_html(browser.account_id());
        let document = format!(
            "<!doctype html><html lang=en><meta charset=utf-8><title>Sign in to Open Legend</title>\
             <main><h1>Sign in to the Open Legend app</h1><p>You are signed in as <strong>{account}</strong>.</p>\
             <p>Continue if you started sign-in from the game on this computer.</p>\
             <form method=post><button type=submit>Continue to the game</button></form></main></html>"
        );
        // Some browsers also enforce form-action on the POST's redirect.
        let policy = format!(
            "default-src 'none'; form-action 'self' {}; base-uri 'none'; frame-ancestors 'none'",
            attempt.request.redirect_uri,
        );
        ([(header::CONTENT_SECURITY_POLICY, policy)], Html(document)).into_response()
    }) {
        Ok(response) => response,
        Err(error) => access_failure(error),
    }
}

fn escape_html(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

pub(super) async fn approve(
    State(state): State<AccessRoutes>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> Response {
    let Some(token) = read_cookie(&headers, "ol_session") else {
        return access_failure(AccessError::Session);
    };
    let browser = match state.authority.desktop_browser(token).await {
        Ok(browser) => browser,
        Err(error) => return access_failure(error),
    };
    let Ok(mut pending) = state.pending.lock() else {
        return access_failure(AccessError::Availability);
    };
    let Some(attempt) = pending
        .desktop
        .get_mut(&id)
        .filter(|attempt| matches_browser(attempt, &browser))
    else {
        return stale();
    };
    match state.authority.current_desktop_browser(&browser, || {
        let mut secret = [0_u8; 16];
        if getrandom::fill(&mut secret).is_err() {
            return access_failure(AccessError::Availability);
        }
        // The random attempt prefix allows an exact lookup; the suffix proves
        // approval. Retain only the digest of their complete code.
        let code = format!("{}{}", id.simple(), hex_bytes(&secret));
        attempt.approved = Some(Sha256::digest(code.as_bytes()).into());
        let callback = format!(
            "{}?state={}&code={}",
            attempt.request.redirect_uri, attempt.request.state, code
        );
        redirect(&callback, &[])
    }) {
        Ok(response) => response,
        Err(error) => access_failure(error),
    }
}

pub(super) async fn exchange(
    State(state): State<AccessRoutes>,
    Json(request): Json<Exchange>,
) -> Response {
    if request.code.len() != 64
        || !request
            .code
            .bytes()
            .all(|byte| matches!(byte, b'0'..=b'9' | b'a'..=b'f'))
        || !encoded_sha256(&request.state)
        || !verifier(&request.verifier)
        || !loopback(&request.redirect_uri)
    {
        return stale();
    }
    let Ok(id) = Uuid::parse_str(&request.code[..32]) else {
        return stale();
    };
    let challenge = crate::oidc::desktop_challenge(request.verifier);
    let digest: [u8; 32] = Sha256::digest(request.code.as_bytes()).into();
    let attempt = {
        let Ok(mut pending) = state.pending.lock() else {
            return access_failure(AccessError::Availability);
        };
        if !pending.desktop.get(&id).is_some_and(|attempt| {
            attempt.current(Instant::now())
                && attempt
                    .approved
                    .is_some_and(|approved| bool::from(approved.ct_eq(&digest)))
                && bool::from(
                    attempt
                        .request
                        .challenge
                        .as_bytes()
                        .ct_eq(challenge.as_bytes()),
                )
                && attempt.request.redirect_uri == request.redirect_uri
                && attempt.request.state == request.state
        }) {
            return stale();
        }
        // Consume before any await. Failed validation above never burns a
        // legitimate attempt, and concurrent valid requests cannot reissue it.
        pending
            .desktop
            .remove(&id)
            .expect("matched a pending attempt")
    };
    let Some(browser) = attempt.browser else {
        return stale();
    };
    match state
        .authority
        .desktop_session(browser, attempt.expires, attempt._custody)
        .await
    {
        Ok(token) => {
            let secure = matches!(&state.identity, IdentityMode::Oidc(oidc) if oidc.origin().starts_with("https:"));
            (
                [(
                    header::SET_COOKIE,
                    set_cookie(
                        "ol_session",
                        &token,
                        secure,
                        Some(state.authority.session_lifetime_secs()),
                    ),
                )],
                Json(serde_json::json!({ "ok": true })),
            )
                .into_response()
        }
        Err(AccessError::Changed | AccessError::Session) => stale(),
        Err(error) => access_failure(error),
    }
}
