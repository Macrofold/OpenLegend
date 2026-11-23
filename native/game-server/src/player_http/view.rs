//! The same admitted view feeds ordinary HTTP and the browser's SSE stream.
//! Only the body owns a stream's previously handed-off decoded view.

use super::*;
use crate::{
    authority::Capability,
    player_stream::{PlayerStream, PrepareView, VIEW_CADENCE, ViewAttempt},
    player_view::{ViewError, capture_host, prepare_view, profile::DisplayPreferencesPatch},
    store::AiDisplay,
    world::PlayerDisclosure,
};
use axum::{extract::Query, routing::get};
use openlegend_world_host::pool::HostError;
use tokio::{
    sync::{Mutex, watch},
    time::Instant,
};

struct Views {
    routes: PlayerRoutes,
    lane: Mutex<()>,
    streams: Arc<Semaphore>,
    display: AiDisplay,
    god_mode: bool,
    stop: watch::Receiver<bool>,
}

pub(super) fn router(
    routes: PlayerRoutes,
    streams: Arc<Semaphore>,
    display: AiDisplay,
    god_mode: bool,
    stop: watch::Receiver<bool>,
) -> Router {
    let state = Arc::new(Views {
        routes,
        lane: Mutex::new(()),
        streams,
        display,
        god_mode,
        stop,
    });
    Router::new()
        .route("/api/state", get(state_view))
        .route("/api/events", get(events))
        .route("/api/profile", get(profile))
        .route("/api/profile/preferences", post(save_profile))
        .route("/api/ai/usage", get(usage))
        .with_state(state)
}

struct Tab {
    token: String,
    connection: String,
    _custody: ByteReservation,
}

impl Views {
    fn tab(&self, headers: &HeaderMap, connection: Option<&str>) -> Result<Arc<Tab>, AccessError> {
        let token = read_cookie(headers, "ol_session").ok_or(AccessError::Session)?;
        let selected = connection
            .or_else(|| {
                headers
                    .get("x-ol-client")
                    .and_then(|value| value.to_str().ok())
            })
            .filter(|value| valid_tab(value))
            .ok_or(AccessError::Changed)?;
        let funding = self
            .routes
            .game
            .host
            .budget()
            .reserve(512)
            .map_err(|_| AccessError::Busy)?;
        Ok(Arc::new(Tab {
            token: token.to_owned(),
            connection: selected.to_owned(),
            _custody: funding,
        }))
    }

    async fn prepare(&self, tab: &Tab) -> Result<ViewAttempt, ViewError> {
        openlegend_simulation::profile_body!(VIEW, {
            let _admitted = self
                .routes
                .capacity
                .try_acquire()
                .map_err(|_| ViewError::Capacity)?;
            let _serial = tokio::time::timeout(REQUEST_TIMEOUT, self.lane.lock())
                .await
                .map_err(|_| ViewError::Capacity)?;
            let started_at = Instant::now();
            if *self.stop.borrow() {
                return Err(ViewError::Changed);
            }
            let game = &self.routes.game;
            let budget = game.host.budget();
            let authority = &self.routes.authority;
            let scope = Arc::new(
                authority
                    .scope(&tab.token, tab.connection.clone())
                    .await
                    .map_err(world_access)?,
            );
            if scope.scope.world_id != self.routes.expected_world {
                return Err(world_access(AccessError::Changed));
            }
            if scope.scope.actor_id.is_empty() {
                return Err(world_access(AccessError::Characterless));
            }
            authority
                .current(&scope, Capability::Play, false, |_, _| ())
                .map_err(world_access)?;
            let (telemetry, narrator) = game
                .store
                .player_view_input(&scope.scope, self.display)
                .await
                .map_err(ViewError::Store)?;
            let host = capture_host(
                authority,
                &scope,
                &self.routes.commands,
                &self.routes.presence,
                telemetry,
                narrator,
                self.god_mode,
                budget,
            )
            .await?;
            let mut view = prepare_view(
                game,
                game.view_policy().clone(),
                scope.clone(),
                self.routes.references.clone(),
                &self.routes.inputs,
                &self.routes.commands,
                self.routes.saves.clone(),
                host,
            )
            .await?;
            if let Some((outcomes, funding)) = game
                .store
                .player_speech_replies(&scope.scope, view.speech_reply_ids())
                .await
                .map_err(ViewError::Store)?
            {
                view = view.attach_speech_replies(outcomes, funding)?;
            }
            view.attach_presentation_release(game.installed_assets().map(Arc::as_ref), &game.store)
                .await?;
            Ok(ViewAttempt {
                started_at,
                scope,
                view,
            })
        })
    }

    /// The opening header cannot succeed on an unchecked capture. A later
    /// SSE poll rechecks this same permission before the first private bytes.
    async fn first(
        &self,
        tab: &Tab,
        encode_http: bool,
    ) -> Result<(ViewAttempt, Option<Bytes>), ViewError> {
        // A fresh HTTP state read binds this tab again on each attempt. A
        // retained stream still owns its original requested scope.
        let retry_access = |error: &ViewError| encode_http && stale_view_scope(error);
        let mut refusal = ViewError::Changed;
        for _ in 0..2 {
            if refusal.busy() || retry_access(&refusal) {
                tokio::time::sleep(VIEW_CADENCE).await;
            }
            let attempt = match self.prepare(tab).await {
                Err(error) if error.changed() || error.busy() || retry_access(&error) => {
                    refusal = error;
                    continue;
                }
                result => result?,
            };
            let result = self
                .routes
                .game
                .world
                .first_player_disclosure(
                    &self.routes.authority,
                    &attempt.scope,
                    attempt.view.read(),
                    attempt.view.event_ids(),
                    attempt.view.control_preview_cut(),
                    attempt.view.attack_review(),
                    |allowed, review_allowed, budget| {
                        if encode_http {
                            let bytes = wire::encode(&attempt.view.wire(allowed, review_allowed), b"", b"", budget)
                                .map_err(WorldError::Wire)?;
                            openlegend_simulation::profile_count!(FRAME_HTTP, 1);
                            Ok(Some(bytes))
                        } else {
                            Ok(None)
                        }
                    },
                )
                .await;
            match result {
                Ok(PlayerDisclosure::Changed) => refusal = ViewError::Changed,
                Ok(PlayerDisclosure::Busy) => refusal = ViewError::World(HostError::Busy.into()),
                Ok(PlayerDisclosure::Unchanged) => return Ok((attempt, None)),
                Ok(PlayerDisclosure::Published(bytes)) => return Ok((attempt, Some(bytes))),
                Err(error) => {
                    let error = ViewError::World(error);
                    if !error.busy() && !retry_access(&error) {
                        return Err(error);
                    }
                    refusal = error;
                }
            }
        }
        Err(refusal)
    }
}

async fn state_view(State(views): State<Arc<Views>>, headers: HeaderMap) -> Response {
    let tab = match views.tab(&headers, None) {
        Ok(tab) => tab,
        Err(error) => return access_failure(error),
    };
    match views.first(&tab, true).await {
        Ok((_, Some(bytes))) => json_response(StatusCode::OK, bytes),
        Ok((_, None)) => busy(),
        Err(error) if stale_view_scope(&error) => refusal(
            StatusCode::CONFLICT,
            "loading",
            "Your current view is changing. Please wait.",
        ),
        Err(error) => unavailable(error),
    }
}

fn stale_view_scope(error: &ViewError) -> bool {
    matches!(
        error,
        ViewError::World(WorldError::Access(AccessError::Changed))
    )
}

async fn display_scope<'a>(
    routes: &'a PlayerRoutes,
    headers: &HeaderMap,
) -> Result<(tokio::sync::SemaphorePermit<'a>, AuthorizedScope), Response> {
    let slot = routes.capacity.try_acquire().map_err(|_| busy())?;
    let scope = read_scope(&routes.authority, headers)
        .await
        .map_err(access_failure)?;
    routes
        .authority
        .current_view(&scope, |_, _| ())
        .map_err(access_failure)?;
    Ok((slot, scope))
}

fn display_response<T: Serialize>(
    routes: &PlayerRoutes,
    scope: &AuthorizedScope,
    value: T,
) -> Response {
    match routes.authority.current_view(scope, |_, _| {
        match wire::encode(&value, b"", b"", routes.game.host.budget()) {
            Ok(bytes) => json_response(StatusCode::OK, bytes),
            Err(_) => busy(),
        }
    }) {
        Ok(response) => response,
        Err(error) => access_failure(error),
    }
}

async fn profile(State(views): State<Arc<Views>>, headers: HeaderMap) -> Response {
    let routes = &views.routes;
    let (_slot, scope) = match display_scope(routes, &headers).await {
        Ok(authorized) => authorized,
        Err(response) => return response,
    };
    match routes.game.store.player_profile(&scope.scope).await {
        Ok(profile) => display_response(routes, &scope, profile),
        Err(error) => failed(error.into()),
    }
}

async fn save_profile(State(views): State<Arc<Views>>, request: Request) -> Response {
    let routes = &views.routes;
    let Ok(_slot) = routes.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let authorized = match scope(&routes.authority, &parts.headers, None).await {
        Ok(authorized) => authorized,
        Err(error) => return access_failure(error),
    };
    let (patch, _custody): (DisplayPreferencesPatch, _) =
        match json(&parts.headers, body, routes.game.host.budget()).await {
            Ok(value) => value,
            Err(response) => return response,
        };
    let Some((reveal, voice)) = patch.parts() else {
        return refusal(
            StatusCode::BAD_REQUEST,
            "preferences",
            "Choose a valid preference.",
        );
    };
    if let Err(error) = routes
        .authority
        .set_display_preferences(&authorized, reveal, voice)
        .await
    {
        return access_failure(error);
    }
    match routes.authority.current_view(&authorized, |_, _| {
        control_response(routes, true, "preferences", "Your preference was saved.")
    }) {
        Ok(response) => response,
        Err(error) => access_failure(error),
    }
}

async fn usage(State(views): State<Arc<Views>>, headers: HeaderMap) -> Response {
    let routes = &views.routes;
    let (_slot, scope) = match display_scope(routes, &headers).await {
        Ok(authorized) => authorized,
        Err(response) => return response,
    };
    match routes
        .game
        .store
        .player_usage(&scope.scope, views.display.limit_usd)
        .await
    {
        Ok(usage) => display_response(routes, &scope, usage),
        Err(error) => failed(error.into()),
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct EventQuery {
    client: Option<String>,
    world_id: Option<String>,
    scope: Option<String>,
}

async fn events(
    State(views): State<Arc<Views>>,
    Query(query): Query<EventQuery>,
    headers: HeaderMap,
) -> Response {
    if query
        .world_id
        .as_ref()
        .is_some_and(|world| *world != views.routes.expected_world)
        || query.scope.as_ref().is_some_and(|key| key.len() != 64)
    {
        return access_failure(AccessError::Changed);
    }
    let Ok(connection) = views.streams.clone().try_acquire_owned() else {
        return busy();
    };
    let tab = match views.tab(&headers, query.client.as_deref()) {
        Ok(tab) => tab,
        Err(error) => return access_failure(error),
    };
    let revisions = views.routes.saves.subscribe();
    let (first, _) = match views.first(&tab, false).await {
        Ok(result) => result,
        Err(error) => return unavailable(error),
    };
    if let Some(key) = &query.scope
        && first.scope.scope.key().ok().as_ref() != Some(key)
    {
        return access_failure(AccessError::Changed);
    }
    let prepare: PrepareView = {
        let views = views.clone();
        Arc::new(move || {
            let views = views.clone();
            let tab = tab.clone();
            Box::pin(async move { views.prepare(&tab).await })
        })
    };
    let authority = &views.routes.authority;
    let controlling =
        match authority.current(&first.scope, Capability::Play, false, |_, controlling| {
            controlling
        }) {
            Ok(controlling) => controlling,
            Err(error) => return access_failure(error),
        };
    let presence = if controlling {
        let background = match views
            .routes
            .game
            .store
            .player_background(&first.scope.scope)
            .await
        {
            Ok(background) => background,
            Err(error) => return failed(error.into()),
        };
        match views
            .routes
            .presence
            .connect(first.scope.clone(), background)
        {
            Ok(presence) => presence,
            Err(error) => return access_failure(error),
        }
    } else {
        None
    };
    let body = PlayerStream::new(
        views.routes.authority.clone(),
        views.routes.game.world.clone(),
        prepare,
        revisions,
        views.stop.clone(),
        first,
        connection,
        presence,
    );
    (
        [
            (header::CONTENT_TYPE, "text/event-stream"),
            (header::CACHE_CONTROL, "no-store"),
            (
                axum::http::HeaderName::from_static("x-accel-buffering"),
                "no",
            ),
        ],
        Body::new(body),
    )
        .into_response()
}

fn world_access(error: AccessError) -> ViewError {
    ViewError::World(WorldError::Access(error))
}

fn unavailable(error: ViewError) -> Response {
    match error {
        ViewError::World(error) => failed(error),
        _ => busy(),
    }
}
