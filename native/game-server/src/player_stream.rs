//! A socket takes private bytes from Body::poll_frame. The final authority
//! check, payload selection and encoding run synchronously in that poll.

use crate::{
    authority::{AccessError, Authority, AuthorizedScope},
    player_view::{PreparedPlayerView, PreviousView, ViewError, ViewSelection},
    wire,
    world::{HostedWorld, PlayerDisclosure, WorldError},
};
use axum::body::Bytes;
use http_body::{Body, Frame};
use std::{
    future::Future,
    pin::Pin,
    sync::Arc,
    task::{Context, Poll, ready},
    time::Duration,
};
use tokio::{
    sync::{OwnedSemaphorePermit, watch},
    time::{Instant, sleep_until},
};

const CADENCE: Duration = Duration::from_millis(50);
const HEARTBEAT: Duration = Duration::from_secs(15);
const SUFFIX: &[u8] = b"\n\n";
const RESET: &[u8] = b"event: reset\ndata: ";
const PATCH: &[u8] = b"event: patch\ndata: ";

pub(crate) struct ViewAttempt {
    pub scope: Arc<AuthorizedScope>,
    pub view: PreparedPlayerView,
}

pub(crate) type Preparation = Pin<Box<dyn Future<Output = Result<ViewAttempt, ViewError>> + Send>>;
pub(crate) type PrepareView = Arc<dyn Fn() -> Preparation + Send + Sync>;

type NextFrame = Pin<Box<dyn Future<Output = Next> + Send>>;

enum Next {
    Stop,
    Heartbeat,
    View(Result<ViewAttempt, ViewError>),
}

pub(crate) struct PlayerStream {
    authority: Arc<Authority>,
    world: Arc<HostedWorld>,
    prepare: PrepareView,
    revisions: watch::Receiver<u64>,
    stop: watch::Receiver<bool>,
    pending: Option<NextFrame>,
    first: Option<ViewAttempt>,
    previous: Option<PreviousView>,
    scope: Arc<AuthorizedScope>,
    after: Instant,
    heartbeat: Instant,
    fresh_attempt: bool,
    ended: bool,
    _permit: OwnedSemaphorePermit,
}

impl PlayerStream {
    /// The handler has already admitted an actual first view and confirmed
    /// that this tab may open a stream. Its first frame still awaits this poll.
    pub(crate) fn new(
        authority: Arc<Authority>,
        world: Arc<HostedWorld>,
        prepare: PrepareView,
        revisions: watch::Receiver<u64>,
        stop: watch::Receiver<bool>,
        first: ViewAttempt,
        permit: OwnedSemaphorePermit,
    ) -> Self {
        let now = Instant::now();
        Self {
            authority,
            world,
            prepare,
            revisions,
            stop,
            pending: None,
            scope: first.scope.clone(),
            first: Some(first),
            previous: None,
            after: now,
            heartbeat: now + HEARTBEAT,
            fresh_attempt: false,
            ended: false,
            _permit: permit,
        }
    }

    fn next(&self) -> NextFrame {
        let mut stop = self.stop.clone();
        let mut revisions = self.revisions.clone();
        let after = self.after;
        let heartbeat = self.heartbeat;
        let prepare = self.prepare.clone();
        let fresh = self.fresh_attempt;
        Box::pin(async move {
            let shutdown = async { while !*stop.borrow() && stop.changed().await.is_ok() {} };
            let view = async {
                if !fresh && revisions.changed().await.is_err() {
                    return Next::Stop;
                }
                sleep_until(after).await;
                Next::View(prepare().await)
            };
            tokio::select! {
                _ = shutdown => Next::Stop,
                result = view => result,
                _ = sleep_until(heartbeat) => Next::Heartbeat,
            }
        })
    }

    fn end(&mut self) {
        self.ended = true;
        self.first = None;
        self.previous = None;
        self.pending = None;
    }
}

impl Body for PlayerStream {
    type Data = Bytes;
    type Error = WorldError;

    fn is_end_stream(&self) -> bool {
        self.ended
    }

    fn poll_frame(
        mut self: Pin<&mut Self>,
        context: &mut Context<'_>,
    ) -> Poll<Option<Result<Frame<Self::Data>, Self::Error>>> {
        loop {
            if self.ended || *self.stop.borrow() {
                self.end();
                return Poll::Ready(None);
            }
            let next = match self.first.take() {
                Some(first) => Next::View(Ok(first)),
                None => {
                    if self.pending.is_none() {
                        self.pending = Some(self.next());
                    }
                    let next = ready!(
                        self.pending
                            .as_mut()
                            .expect("prepared poll")
                            .as_mut()
                            .poll(context)
                    );
                    self.pending = None;
                    next
                }
            };
            match next {
                Next::Stop => {
                    self.end();
                    return Poll::Ready(None);
                }
                Next::Heartbeat => {
                    if self
                        .authority
                        .current(
                            &self.scope,
                            crate::authority::Capability::Play,
                            false,
                            |_, _| (),
                        )
                        .is_err()
                    {
                        self.end();
                        return Poll::Ready(Some(Ok(Frame::data(Bytes::from_static(
                            b"event: access-changed\ndata: {}\n\n",
                        )))));
                    }
                    self.heartbeat = Instant::now() + HEARTBEAT;
                    return Poll::Ready(Some(Ok(Frame::data(Bytes::from_static(
                        b": heartbeat\n\n",
                    )))));
                }
                Next::View(Err(ViewError::World(WorldError::Access(
                    AccessError::Changed | AccessError::Forbidden | AccessError::Session,
                )))) => {
                    self.end();
                    return Poll::Ready(Some(Ok(Frame::data(Bytes::from_static(
                        b"event: access-changed\ndata: {}\n\n",
                    )))));
                }
                Next::View(Err(ViewError::Changed)) if !self.fresh_attempt => {
                    self.fresh_attempt = true;
                    continue;
                }
                Next::View(Err(_error)) => {
                    self.end();
                    return Poll::Ready(None);
                }
                Next::View(Ok(attempt)) => {
                    let offered = *self.revisions.borrow();
                    self.after = Instant::now() + CADENCE;
                    let mut inventory = false;
                    let result = self.world.disclose_player(
                        &self.authority,
                        &attempt.scope,
                        attempt.view.read(),
                        attempt.view.event_ids(),
                        |allowed, budget| {
                            inventory = allowed;
                            match attempt
                                .view
                                .select(self.previous.as_ref(), allowed, budget)
                                .map_err(|error| match error {
                                    ViewError::Capacity => {
                                        WorldError::Wire(wire::WireError::Capacity)
                                    }
                                    _ => WorldError::ProjectionChanged,
                                })? {
                                ViewSelection::Unchanged => Ok(None),
                                ViewSelection::Reset => {
                                    wire::encode(&attempt.view.wire(allowed), RESET, SUFFIX, budget)
                                        .map(Some)
                                        .map_err(WorldError::Wire)
                                }
                                ViewSelection::Patch(patch) => {
                                    wire::encode(&patch, PATCH, SUFFIX, budget)
                                        .map(Some)
                                        .map_err(WorldError::Wire)
                                }
                            }
                        },
                    );
                    match result {
                        Ok(PlayerDisclosure::Busy | PlayerDisclosure::Changed)
                        | Err(WorldError::ProjectionChanged) => {
                            if self.fresh_attempt {
                                self.revisions.borrow_and_update();
                                self.fresh_attempt = false;
                            } else {
                                self.fresh_attempt = true;
                            }
                        }
                        Ok(PlayerDisclosure::Unchanged) => {
                            self.revisions.borrow_and_update();
                            self.fresh_attempt = false;
                        }
                        Ok(PlayerDisclosure::Published(bytes)) => {
                            let revision = attempt.view.revision();
                            if offered <= revision {
                                self.revisions.borrow_and_update();
                            }
                            self.fresh_attempt = false;
                            self.scope = attempt.scope;
                            self.previous = Some(attempt.view.into_previous(inventory));
                            return Poll::Ready(Some(Ok(Frame::data(bytes))));
                        }
                        Err(WorldError::Access(
                            AccessError::Changed | AccessError::Forbidden | AccessError::Session,
                        )) => {
                            self.end();
                            return Poll::Ready(Some(Ok(Frame::data(Bytes::from_static(
                                b"event: access-changed\ndata: {}\n\n",
                            )))));
                        }
                        Err(error) => {
                            self.end();
                            return Poll::Ready(Some(Err(error)));
                        }
                    }
                }
            }
        }
    }
}
