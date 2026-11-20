//! A socket takes private bytes from Body::poll_frame. The final authority
//! check, payload selection and encoding run synchronously in that poll.

use crate::{
    authority::{AccessError, Authority, AuthorizedScope},
    player_view::{PreparedPlayerView, PreviousView, ViewError, ViewSelection},
    store::{Store, UsageSubscription},
    wire,
    world::{HostedWorld, PlayerDisclosure, PlayerDisclosureTurn, WorldError},
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

pub(crate) const VIEW_CADENCE: Duration = Duration::from_millis(50);
const HEARTBEAT: Duration = Duration::from_secs(15);
const SUFFIX: &[u8] = b"\n\n";
const RESET: &[u8] = b"event: reset\ndata: ";
const PATCH: &[u8] = b"event: patch\ndata: ";

pub(crate) struct ViewAttempt {
    pub started_at: Instant,
    pub scope: Arc<AuthorizedScope>,
    pub view: PreparedPlayerView,
}

pub(crate) type Preparation = Pin<Box<dyn Future<Output = Result<ViewAttempt, ViewError>> + Send>>;
pub(crate) type PrepareView = Arc<dyn Fn() -> Preparation + Send + Sync>;

type NextFrame = Pin<Box<dyn Future<Output = Next> + Send>>;
type UsageWait = Pin<Box<dyn Future<Output = UsageSubscription> + Send>>;

fn wait_usage(mut subscription: UsageSubscription) -> UsageWait {
    Box::pin(async move {
        // This stream holds the store and the store keeps live receivers registered.
        let _ = subscription.receiver.changed().await;
        subscription
    })
}

enum Next {
    Stop,
    Heartbeat,
    View(Result<(ViewAttempt, PlayerDisclosureTurn), ViewError>),
}

pub(crate) struct PlayerStream {
    authority: Arc<Authority>,
    world: Arc<HostedWorld>,
    revisions: watch::Receiver<u64>,
    stop: watch::Receiver<bool>,
    pending: Option<NextFrame>,
    first: Option<ViewAttempt>,
    previous: Option<PreviousView>,
    covered_revision: Option<u64>,
    scope: Arc<AuthorizedScope>,
    after: Instant,
    heartbeat: Instant,
    fresh_attempt: bool,
    ended: bool,
    usage: Option<UsageWait>,
    store: Arc<Store>,
    _permit: OwnedSemaphorePermit,
    // The preparation closure holds the request owner until this body drops.
    prepare: PrepareView,
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
        store: Arc<Store>,
        usage: UsageSubscription,
    ) -> Self {
        let now = Instant::now();
        Self {
            authority,
            world,
            revisions,
            stop,
            pending: None,
            scope: first.scope.clone(),
            first: Some(first),
            previous: None,
            covered_revision: None,
            after: now,
            heartbeat: now + HEARTBEAT,
            fresh_attempt: false,
            ended: false,
            store,
            usage: Some(wait_usage(usage)),
            _permit: permit,
            prepare,
        }
    }

    fn next(&mut self) -> NextFrame {
        let mut stop = self.stop.clone();
        let mut revisions = self.revisions.clone();
        let after = self.after;
        let heartbeat = self.heartbeat;
        let prepare = self.prepare.clone();
        let world = self.world.clone();
        let first = self.first.take();
        let covered = self.covered_revision.filter(|_| !self.fresh_attempt);
        Box::pin(async move {
            let shutdown = async { while !*stop.borrow() && stop.changed().await.is_ok() {} };
            let view = async {
                let attempt = match first {
                    Some(first) => first,
                    None => {
                        // A newer notice can arrive during or just after disclosure.
                        // Wait for a revision beyond the view we actually covered.
                        if let Some(revision) = covered
                            && revisions
                                .wait_for(|latest| *latest > revision)
                                .await
                                .is_err()
                        {
                            return Next::Stop;
                        }
                        sleep_until(after).await;
                        match prepare().await {
                            Ok(attempt) => attempt,
                            Err(error) => return Next::View(Err(error)),
                        }
                    }
                };
                // The successful poll hands the guard straight back to
                // poll_frame. No await or socket drain follows acquisition.
                Next::View(
                    world
                        .player_disclosure_turn()
                        .await
                        .map(|turn| (attempt, turn))
                        .map_err(ViewError::World),
                )
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
        self.release_usage();
    }

    fn release_usage(&mut self) {
        if let Some(subscription) = self.usage.take() {
            drop(subscription);
            self.store.release_usage_watch(&self.scope.scope.actor_id);
        }
    }

    fn defer(&mut self) {
        self.after = Instant::now() + VIEW_CADENCE;
        self.fresh_attempt = true;
    }

    fn changed(&mut self) {
        if self.fresh_attempt {
            // This publication exhausted its fresh attempt. Keep the latest
            // notice eligible at the regular cadence, even in a paused world.
            self.defer();
        } else {
            self.fresh_attempt = true;
        }
    }
}

impl Drop for PlayerStream {
    fn drop(&mut self) {
        self.pending = None;
        self.release_usage();
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
            // Invalidation never cancels a view in preparation or takes its turn.
            // Deliver the first authorized view before optional display notices.
            if self.previous.is_some()
                && let Some(wait) = self.usage.as_mut()
                && let Poll::Ready(receiver) = wait.as_mut().poll(context)
            {
                self.usage = Some(wait_usage(receiver));
                let notice = self.authority.current_view(&self.scope, |_, _| {
                    Frame::data(Bytes::from_static(b"event: ai-usage-changed\ndata: {}\n\n"))
                });
                let frame = match notice {
                    Ok(frame) => frame,
                    Err(_) => {
                        self.end();
                        Frame::data(Bytes::from_static(b"event: access-changed\ndata: {}\n\n"))
                    }
                };
                return Poll::Ready(Some(Ok(frame)));
            }
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
                Next::View(Err(error)) if error.changed() => {
                    self.changed();
                    continue;
                }
                Next::View(Err(error)) if error.busy() => {
                    // Keep the actual previous handoff. Once capacity returns,
                    // build a fresh view against it without replaying private bytes.
                    self.defer();
                    continue;
                }
                Next::View(Err(error)) => {
                    eprintln!("Player stream preparation stopped: {error:?}");
                    self.end();
                    return Poll::Ready(None);
                }
                Next::View(Ok((attempt, turn))) => {
                    let revision = attempt.view.revision();
                    // Start-to-start cadence gives preparation and disclosure their
                    // share of the same publication window.
                    self.after = attempt.started_at + VIEW_CADENCE;
                    let mut inventory = false;
                    let result = turn.disclose(
                        &self.authority,
                        &attempt.scope,
                        attempt.view.read(),
                        attempt.view.event_ids(),
                        attempt.view.control_preview_cut(),
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
                                ViewSelection::Unchanged => {
                                    openlegend_simulation::profile_count!(FRAME_UNCHANGED, 1);
                                    Ok(None)
                                }
                                ViewSelection::Reset => {
                                    let bytes = wire::encode(
                                        &attempt.view.wire(allowed),
                                        RESET,
                                        SUFFIX,
                                        budget,
                                    )
                                    .map_err(WorldError::Wire)?;
                                    openlegend_simulation::profile_count!(FRAME_RESET, 1);
                                    Ok(Some(bytes))
                                }
                                ViewSelection::Patch(patch) => {
                                    let bytes = wire::encode(&patch, PATCH, SUFFIX, budget)
                                        .map_err(WorldError::Wire)?;
                                    openlegend_simulation::profile_count!(FRAME_PATCH, 1);
                                    Ok(Some(bytes))
                                }
                            }
                        },
                    );
                    match result {
                        Ok(PlayerDisclosure::Busy | PlayerDisclosure::Changed)
                        | Err(WorldError::ProjectionChanged) => {
                            self.changed();
                        }
                        Ok(PlayerDisclosure::Unchanged) => {
                            self.covered_revision = Some(revision);
                            self.fresh_attempt = false;
                        }
                        Ok(PlayerDisclosure::Published(bytes)) => {
                            self.covered_revision = Some(revision);
                            self.fresh_attempt = false;
                            if self.scope.scope.actor_id != attempt.scope.scope.actor_id {
                                self.release_usage();
                                self.usage = self.store.watch_usage(&attempt.scope.scope.actor_id)
                                    .ok().map(wait_usage);
                            }
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
                        Err(WorldError::Wire(wire::WireError::Capacity)) => self.defer(),
                        Err(error) => {
                            eprintln!("Player stream delivery stopped: {error:?}");
                            self.end();
                            return Poll::Ready(Some(Err(error)));
                        }
                    }
                }
            }
        }
    }
}
