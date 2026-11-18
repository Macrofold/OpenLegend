//! A private forming reply is emitted only by the current controlling tab's
//! socket. The frame owns its bytes independently of the provider and view.

use super::*;
use crate::{
    decision_dispatch::ReplyPreview,
    npc::{
        preview::{PreviewDisclosure, read_disclosure},
        valid_request_id,
    },
};
use axum::routing::get;
use http_body::Frame;
use openlegend_simulation::{text::JsText, worlds::base_observed::SpeechVolume};
use std::{
    future::Future,
    pin::Pin,
    task::{Context, Poll, ready},
};
use tokio::{
    sync::{OwnedSemaphorePermit, watch},
    time::{Instant, sleep_until},
};

#[derive(Clone)]
struct PreviewRoutes {
    routes: PlayerRoutes,
    streams: Arc<Semaphore>,
    stop: watch::Receiver<bool>,
}

pub(super) fn router(
    routes: PlayerRoutes,
    streams: Arc<Semaphore>,
    stop: watch::Receiver<bool>,
) -> Router {
    Router::new()
        .route("/api/chat/preview", get(open))
        .with_state(PreviewRoutes {
            routes,
            streams,
            stop,
        })
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct PreviewQuery {
    client: String,
    scope: String,
    world_id: String,
    request_id: String,
}

async fn open(
    State(state): State<PreviewRoutes>,
    Query(query): Query<PreviewQuery>,
    headers: HeaderMap,
) -> Response {
    if !valid_tab(&query.client)
        || !valid_request_id(&query.request_id)
        || query.scope.len() != 64
        || state.routes.expected_world != query.world_id
    {
        return access_failure(AccessError::Changed);
    }
    let Ok(permit) = state.streams.clone().try_acquire_owned() else {
        return busy();
    };
    let Some(token) = read_cookie(&headers, "ol_session") else {
        return access_failure(AccessError::Session);
    };
    let authority = &state.routes.authority;
    let scope = match authority.scope(token, query.client).await {
        Ok(scope) if scope.scope.key().ok().as_deref() == Some(query.scope.as_str()) => {
            Arc::new(scope)
        }
        Ok(_) => return access_failure(AccessError::Changed),
        Err(error) => return access_failure(error),
    };
    if let Err(error) = authority.current(&scope, Capability::Play, true, |_, _| ()) {
        return access_failure(error);
    }
    let Ok(custody) = state
        .routes
        .game
        .host
        .budget()
        .reserve(4096 + query.request_id.len())
    else {
        return busy();
    };
    let stream = PreviewStream {
        changed: state.routes.decisions.previews().watch(),
        revisions: state.routes.saves.subscribe(),
        state,
        request: query.request_id,
        scope,
        pending: None,
        displayed: None,
        after: Instant::now(),
        heartbeat: Instant::now() + Duration::from_secs(15),
        first: true,
        sent: false,
        ended: false,
        _permit: permit,
        _custody: custody,
    };
    (
        [
            (header::CONTENT_TYPE, "text/event-stream"),
            (header::CACHE_CONTROL, "no-store"),
            (
                axum::http::HeaderName::from_static("x-accel-buffering"),
                "no",
            ),
        ],
        Body::new(stream),
    )
        .into_response()
}

type Preparation = Pin<Box<dyn Future<Output = Next> + Send>>;

enum Next {
    Stop,
    Heartbeat,
    Selected(Arc<ReplyPreview>, Option<PreviewDisclosure>),
    Empty,
}

enum Delivery {
    End,
    Clear,
    Wait,
    Heartbeat,
    Forming(Bytes, Arc<ReplyPreview>),
}

struct PreviewStream {
    state: PreviewRoutes,
    request: String,
    scope: Arc<AuthorizedScope>,
    changed: watch::Receiver<()>,
    revisions: watch::Receiver<u64>,
    pending: Option<Preparation>,
    displayed: Option<Arc<ReplyPreview>>,
    after: Instant,
    heartbeat: Instant,
    first: bool,
    sent: bool,
    ended: bool,
    _permit: OwnedSemaphorePermit,
    _custody: ByteReservation,
}

impl PreviewStream {
    fn next(&mut self) -> Preparation {
        let mut stop = self.state.stop.clone();
        let mut changed = self.changed.clone();
        let mut revisions = self.revisions.clone();
        let authority = self.state.routes.authority.clone();
        let game = self.state.routes.game.clone();
        let registry = self.state.routes.decisions.previews().clone();
        let scope = self.scope.clone();
        let request = self.request.clone();
        let first = self.first;
        self.first = false;
        let after = self.after;
        let heartbeat = self.heartbeat;
        // Mark the watched revision before yielding. A crossed cut wakes a new
        // calculation and never discloses the old positive one.
        self.changed.borrow_and_update();
        self.revisions.borrow_and_update();
        Box::pin(async move {
            let prepare = async {
                if !first {
                    tokio::select! {
                        _ = changed.changed() => (),
                        _ = revisions.changed() => (),
                    }
                }
                sleep_until(after).await;
                let Some(selected) = registry.get(&request) else {
                    return Next::Empty;
                };
                if !selected.current() || !same_audience(&selected.scope, &scope) {
                    return Next::Empty;
                }
                let current = read_disclosure(
                    &game,
                    authority,
                    scope,
                    &selected.job.job.request.npc_id,
                    selected.speech.volume,
                )
                .await;
                match current {
                    Ok(exposure) => Next::Selected(selected, exposure),
                    Err(_) => Next::Empty,
                }
            };
            tokio::select! {
                biased;
                _ = stop.wait_for(|stop| *stop) => Next::Stop,
                _ = sleep_until(heartbeat) => Next::Heartbeat,
                selection = prepare => selection,
            }
        })
    }
}

fn same_audience(issued: &AuthorizedScope, actual: &AuthorizedScope) -> bool {
    let (issued, actual) = (&issued.scope, &actual.scope);
    issued.account_id == actual.account_id
        && issued.actor_id == actual.actor_id
        && issued.session_id == actual.session_id
        && issued.control_generation == actual.control_generation
        && issued.world_id == actual.world_id
        && issued.timeline_id == actual.timeline_id
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Snapshot<'a> {
    request_id: &'a str,
    attempt: u8,
    generation: &'a str,
    world_id: &'a str,
    timeline_id: &'a str,
    player_speech_event_id: &'a str,
    npc_id: &'a str,
    sequence: u8,
    state: &'static str,
    speaker: &'a JsText,
    volume: SpeechVolume,
    text: &'a JsText,
    history_ids: [&'a str; 0],
}

impl http_body::Body for PreviewStream {
    type Data = Bytes;
    type Error = WorldError;

    fn poll_frame(
        mut self: Pin<&mut Self>,
        cx: &mut Context<'_>,
    ) -> Poll<Option<Result<Frame<Bytes>, Self::Error>>> {
        loop {
            if self.ended || *self.state.stop.borrow() {
                return Poll::Ready(None);
            }
            if self.pending.is_none() {
                self.pending = Some(self.next());
            }
            let next = ready!(
                self.pending
                    .as_mut()
                    .expect("scheduled preview")
                    .as_mut()
                    .poll(cx)
            );
            self.pending = None;
            let authorized = self.state.routes.authority.current(
                &self.scope,
                Capability::Play,
                true,
                |fields, _| match next {
                    Next::Stop => Ok(Delivery::End),
                    Next::Heartbeat => Ok(Delivery::Heartbeat),
                    Next::Empty => Ok(Delivery::Clear),
                    Next::Selected(preview, fresh) => {
                        let Some(fresh) =
                            fresh.filter(|fresh| fresh.speaker == preview.original.speaker)
                        else {
                            preview.withdraw();
                            return Ok(Delivery::Clear);
                        };
                        if !preview.current() {
                            return Ok(Delivery::Clear);
                        }
                        if self
                            .displayed
                            .as_ref()
                            .is_some_and(|previous| Arc::ptr_eq(previous, &preview))
                        {
                            return Ok(Delivery::Wait);
                        }
                        let game = &self.state.routes.game;
                        let job = &preview.job.job;
                        let prepared =
                            game.world.disclose_reply_preview(fields, fresh.cut, || {
                                if !preview.current() {
                                    return None;
                                }
                                let snapshot = Snapshot {
                                    request_id: &job.id,
                                    attempt: 0,
                                    generation: &preview.generation,
                                    world_id: &fields.world_id,
                                    timeline_id: &fields.timeline_id,
                                    player_speech_event_id: job
                                        .player_speech_event_id
                                        .as_deref()?,
                                    npc_id: &job.request.npc_id,
                                    sequence: 1,
                                    state: "forming",
                                    speaker: &fresh.speaker,
                                    volume: preview.speech.volume,
                                    text: &preview.speech.text,
                                    history_ids: [],
                                };
                                wire::encode(
                                    &snapshot,
                                    b"event: snapshot\ndata: ",
                                    b"\n\n",
                                    game.host.budget(),
                                )
                                .ok()
                            })?;
                        Ok(match prepared.flatten() {
                            Some(bytes) => Delivery::Forming(bytes, preview),
                            None => Delivery::Wait,
                        })
                    }
                },
            );
            self.after = Instant::now() + Duration::from_millis(50);
            let bytes = match authorized {
                Err(_) => {
                    self.ended = true;
                    self.displayed = None;
                    Some(Bytes::from_static(b"event: access-changed\ndata: {}\n\n"))
                }
                Ok(Err(error)) => {
                    self.ended = true;
                    self.displayed = None;
                    return Poll::Ready(Some(Err(error)));
                }
                Ok(Ok(delivery)) => match delivery {
                    Delivery::End => {
                        self.ended = true;
                        self.displayed = None;
                        return Poll::Ready(None);
                    }
                    Delivery::Forming(bytes, preview) => {
                        self.displayed = Some(preview);
                        Some(bytes)
                    }
                    Delivery::Clear => {
                        let clear = !self.sent || self.displayed.take().is_some();
                        clear.then(|| Bytes::from_static(b"event: snapshot\ndata: null\n\n"))
                    }
                    Delivery::Wait => None,
                    Delivery::Heartbeat => {
                        self.heartbeat = Instant::now() + Duration::from_secs(15);
                        Some(Bytes::from_static(b": keepalive\n\n"))
                    }
                },
            };
            if let Some(bytes) = bytes {
                self.sent = true;
                return Poll::Ready(Some(Ok(Frame::data(bytes))));
            }
        }
    }
}
