//! The same admitted view feeds ordinary HTTP and the browser's SSE stream.
//! Only the body owns a stream's previously handed-off decoded view.

use super::*;
use crate::{
    authority::Capability,
    player_stream::{PlayerStream, PrepareView, VIEW_CADENCE, ViewAttempt},
    player_view::{ViewError, ViewTelemetry, capture_host, prepare_view},
    store::AiDisplay,
    world::PlayerDisclosure,
};
use axum::{extract::Query, routing::get};
use openlegend_world_host::pool::HostError;
use tokio::sync::{Mutex, watch};

#[derive(Clone)]
struct Views {
    routes: PlayerRoutes,
    lane: Arc<Mutex<()>>,
    streams: Arc<Semaphore>,
    display: AiDisplay,
    stop: watch::Receiver<bool>,
}

pub(super) fn router(
    routes: PlayerRoutes,
    streams: Arc<Semaphore>,
    display: AiDisplay,
    stop: watch::Receiver<bool>,
) -> Router {
    let state = Views {
        routes,
        lane: Arc::new(Mutex::new(())),
        streams,
        display,
        stop,
    };
    Router::new()
        .route("/api/state", get(state_view))
        .route("/api/events", get(events))
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
        let _admitted = self
            .routes
            .capacity
            .try_acquire()
            .map_err(|_| ViewError::Capacity)?;
        let _serial = tokio::time::timeout(REQUEST_TIMEOUT, self.lane.lock())
            .await
            .map_err(|_| ViewError::Capacity)?;
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
        authority
            .current(&scope, Capability::Play, false, |_, _| ())
            .map_err(world_access)?;
        let (ai, custody) = game
            .store
            .player_cognition(&scope.scope, self.display)
            .await
            .map_err(ViewError::Store)?;
        let host = capture_host(
            authority,
            &scope,
            &self.routes.saves,
            &self.routes.commands,
            &self.routes.presence,
            ViewTelemetry { ai, custody },
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
        Ok(ViewAttempt { scope, view })
    }

    /// The opening header cannot succeed on an unchecked capture. A later
    /// SSE poll rechecks this same permission before the first private bytes.
    async fn first(
        &self,
        tab: &Tab,
        encode_http: bool,
    ) -> Result<(ViewAttempt, Option<Bytes>), ViewError> {
        let mut refusal = ViewError::Changed;
        for _ in 0..2 {
            if refusal.busy() {
                tokio::time::sleep(VIEW_CADENCE).await;
            }
            let attempt = match self.prepare(tab).await {
                Err(error) if error.changed() || error.busy() => {
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
                    |allowed, budget| {
                        if encode_http {
                            wire::encode(&attempt.view.wire(allowed), b"", b"", budget)
                                .map(Some)
                                .map_err(WorldError::Wire)
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
                    if !error.busy() {
                        return Err(error);
                    }
                    refusal = error;
                }
            }
        }
        Err(refusal)
    }
}

async fn state_view(State(views): State<Views>, headers: HeaderMap) -> Response {
    let tab = match views.tab(&headers, None) {
        Ok(tab) => tab,
        Err(error) => return access_failure(error),
    };
    match views.first(&tab, true).await {
        Ok((_, Some(bytes))) => json_response(StatusCode::OK, bytes),
        Ok((_, None)) => busy(),
        Err(error) => unavailable(error),
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
    State(views): State<Views>,
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
    let body = PlayerStream::new(
        views.routes.authority.clone(),
        views.routes.game.world.clone(),
        prepare,
        revisions,
        views.stop.clone(),
        first,
        connection,
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
