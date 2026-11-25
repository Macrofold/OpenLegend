//! An application turn owns the right to advance one private candidate.
//! Compute submissions share the process pool. SQL and provider waits own
//! their inputs and never occupy a worker.

use crate::{
    authority::{AccessError, Authority, AuthorizedScope, RequestScope},
    store::{CommitError, Store, StoreError},
};
use openlegend_simulation::host::{
    ByteBudget, CandidateFence, CandidateKey, CandidatePhase, FenceError, Settlement,
};
use openlegend_simulation::runtime::{
    NativeWorldSession, RuntimeActivation, RuntimeDirectOutput, RuntimeDirectPrepared,
    RuntimeDirectStep, RuntimeError, RuntimeNavigationRead, RuntimeNpcResponseTicket,
    RuntimeClock, RuntimeNpcStageWitness, RuntimePlayerRead, RuntimeProvider, RuntimeProviderInput, RuntimeSave,
    RuntimeSaveAcknowledgement,
};
use openlegend_world_host::{
    DispatchHost, DispatchWorld, SerialDispatch,
    pool::{HostError, HostPool},
    try_submit_world,
};
use std::pin::Pin;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, Weak};
use std::time::Duration;
use std::{collections::BTreeSet, future::Future};
use tokio::sync::{Mutex as TurnLock, Semaphore, oneshot, watch};
use tokio::time::Instant;
use tokio_util::task::TaskTracker;

const TURN_WAIT: Duration = Duration::from_secs(5);
pub(crate) const IO_YIELD: Duration = Duration::from_millis(8);
mod activity_learning;
mod npc;
mod recall_maintenance;
pub(crate) use npc::{NpcBinding, NpcHistoryRows};
mod player_history;
mod player_inventory;
pub(crate) mod narrator;
pub(crate) use player_history::PlayerHistoryRead;

#[derive(Debug)]
pub enum WorldError {
    Host(HostError),
    Simulation(RuntimeError),
    Fence(FenceError),
    WriterOwned,
    Protected,
    Commit(CommitError),
    Storage(StoreError),
    Access(AccessError),
    Wire(crate::wire::WireError),
    RecoveryRequired,
    ProviderKind,
    Geometry(crate::spatial::SpatialError),
    Language(crate::language::LanguageError),
    ClockChanged,
    OperatorMaintenance,
    ProjectionChanged,
    NpcDecisionExpired,
    SourceEditPending,
}

impl WorldError {
    #[cfg(feature = "profile-campaign")]
    pub(crate) fn profile_outcome<T>(
        result: &Result<T, Self>,
    ) -> openlegend_simulation::profile::Outcome {
        use openlegend_simulation::profile::Outcome;
        match result {
            Ok(_) => Outcome::Completed,
            Err(Self::Host(HostError::Cancelled)) => Outcome::Cancelled,
            Err(error) if error.is_admission_refusal() => Outcome::Refused,
            Err(_) => Outcome::Failed,
        }
    }

    /// These owners refused work before acceptance. The clock can keep the
    /// elapsed offer or try the still-pending route on a later wake.
    pub(crate) fn is_admission_refusal(&self) -> bool {
        match self {
            Self::Host(HostError::Busy | HostError::Capacity)
            | Self::Fence(FenceError::Busy)
            | Self::Storage(StoreError::KnownPlacesPendingSave)
            | Self::Geometry(
                crate::spatial::SpatialError::Capacity
                | crate::spatial::SpatialError::NavigationBusy,
            ) => true,
            Self::Simulation(error) => error.is_busy() || error.is_capacity(),
            _ => false,
        }
    }

    /// Report a refusal while staging an application's part of an unaccepted
    /// native operation. The clock can retry when a resource owner said busy.
    pub(crate) fn candidate_refusal(self) -> RuntimeError {
        match self {
            Self::Simulation(error) => error,
            Self::Host(HostError::Capacity) => openlegend_simulation::host::CapacityError.into(),
            error if error.is_admission_refusal() => RuntimeError::application_busy(error),
            error => RuntimeError::application_refused(error),
        }
    }
}

impl std::fmt::Display for WorldError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Host(error) => error.fmt(f),
            Self::Simulation(error) => error.fmt(f),
            Self::Fence(error) => write!(f, "World candidate refused: {error:?}"),
            Self::WriterOwned => f.write_str("The game server already has a world writer"),
            Self::Protected => f.write_str("The operation requires protected settlement"),
            Self::Commit(error) => error.fmt(f),
            Self::Storage(error) => error.fmt(f),
            Self::Access(error) => error.fmt(f),
            Self::Wire(error) => error.fmt(f),
            Self::OperatorMaintenance => f.write_str(crate::operator_maintenance::HOLD_MESSAGE),
            Self::RecoveryRequired => {
                f.write_str("The protected operation is fenced pending durable recovery")
            }
            Self::ProviderKind => f.write_str("The prepared operation requires another provider"),
            Self::Geometry(error) => error.fmt(f),
            Self::Language(error) => error.fmt(f),
            Self::ClockChanged => {
                f.write_str("The accepted clock changed before the elapsed offer")
            }
            Self::ProjectionChanged => f.write_str("The allowed player view changed"),
            Self::NpcDecisionExpired => {
                f.write_str("The character's original decision deadline passed")
            }
            Self::SourceEditPending => {
                f.write_str("The selected character's evidence is being edited")
            }
        }
    }
}

impl std::error::Error for WorldError {}

impl From<HostError> for WorldError {
    fn from(value: HostError) -> Self {
        Self::Host(value)
    }
}

impl From<RuntimeError> for WorldError {
    fn from(value: RuntimeError) -> Self {
        Self::Simulation(value)
    }
}

impl From<StoreError> for WorldError {
    fn from(value: StoreError) -> Self {
        Self::Storage(value)
    }
}

impl From<AccessError> for WorldError {
    fn from(error: AccessError) -> Self {
        Self::Access(error)
    }
}

impl From<FenceError> for WorldError {
    fn from(value: FenceError) -> Self {
        Self::Fence(value)
    }
}

impl From<crate::spatial::SpatialError> for WorldError {
    fn from(value: crate::spatial::SpatialError) -> Self {
        Self::Geometry(value)
    }
}

pub struct WorldHost {
    pool: HostPool,
    budget: ByteBudget,
    request_capacity: usize,
    writer: Mutex<Weak<HostedWorld>>,
}

impl DispatchHost for WorldHost {
    fn pool(&self) -> &HostPool {
        &self.pool
    }

    fn budget(&self) -> &ByteBudget {
        &self.budget
    }
}

impl WorldHost {
    pub fn new(
        workers: usize,
        transient_bytes: usize,
        request_capacity: usize,
    ) -> Result<Arc<Self>, WorldError> {
        if request_capacity == 0 || request_capacity > Semaphore::MAX_PERMITS {
            return Err(HostError::Capacity.into());
        }
        Ok(Arc::new(Self {
            pool: HostPool::new(workers)?,
            budget: ByteBudget::new(transient_bytes),
            request_capacity,
            writer: Mutex::new(Weak::new()),
        }))
    }

    pub fn budget(&self) -> &ByteBudget {
        &self.budget
    }

    /// Run an independently owned finite calculation on the shared process
    /// pool. A dropped caller requests cancellation before queued execution.
    pub async fn compute<T>(
        &self,
        work: impl FnOnce() -> T + Send + 'static,
    ) -> Result<T, WorldError>
    where
        T: Send + 'static,
    {
        self.compute_with_wait(work, None).await
    }

    /// Keep the already funded response while waiting for a compute slot. Only
    /// Busy before enqueue can wait. The caller holds neither a world turn nor
    /// a pool permit while waiting, and the original response is decoded once.
    pub(crate) async fn compute_before<T>(
        &self,
        deadline: Instant,
        work: impl FnOnce() -> T + Send + 'static,
    ) -> Result<T, WorldError>
    where
        T: Send + 'static,
    {
        self.compute_with_wait(work, Some(deadline)).await
    }

    async fn compute_with_wait<T>(
        &self,
        work: impl FnOnce() -> T + Send + 'static,
        until: Option<Instant>,
    ) -> Result<T, WorldError>
    where
        T: Send + 'static,
    {
        let mut input = Some(work);
        loop {
            let mut reply = None;
            let submitted = self.pool.submit_with(|| {
                let work = input.take().expect("admit the computation once");
                let (send, receive) = oneshot::channel();
                reply = Some(receive);
                (
                    move |_| Ok(work()),
                    move |result| {
                        let _ = send.send(result);
                    },
                    || {},
                )
            });
            match submitted {
                Ok(cancellation) => {
                    let _cancel = CancelCompute(cancellation);
                    let result = reply.expect("admitted computation owns its reply").await;
                    return Ok(result.map_err(|_| HostError::WorkerFailed)??);
                }
                Err(HostError::Busy) => {
                    let now = Instant::now();
                    let deadline = until
                        .filter(|deadline| now < *deadline)
                        .ok_or(HostError::Busy)?;
                    tokio::time::sleep_until((now + IO_YIELD).min(deadline)).await;
                    if Instant::now() >= deadline {
                        return Err(HostError::Busy.into());
                    }
                }
                Err(error) => return Err(error.into()),
            }
        }
    }

    /// The store must already own the connection holding the database writer
    /// lock and have validated the actual durable cut in this receipt.
    pub fn adopt(
        self: &Arc<Self>,
        mut session: NativeWorldSession,
        receipt: RuntimeActivation,
        store: Arc<Store>,
    ) -> Result<Arc<HostedWorld>, WorldError> {
        let mut writer = self
            .writer
            .lock()
            .map_err(|_| HostError::SynchronizationFailed)?;
        if self.pool.is_closing() {
            return Err(HostError::Closed.into());
        }
        if writer.upgrade().is_some() {
            return Err(WorldError::WriterOwned);
        }
        store.assert_write_admission()?;
        let dispatch = SerialDispatch::new(&self.budget, self.pool.capacity())?;
        session.check_current_work()?;
        let (durable, _) = watch::channel(receipt.accepted_cut);
        session.activate(receipt)?;
        let fence = session.fence();
        let (delayed_decision_clock, _) = watch::channel(session.clock()?.paused);
        let world = Arc::new(HostedWorld {
            host: Arc::clone(self),
            store,
            session: Mutex::new(session),
            dispatch,
            fence,
            turn: Arc::new(TurnLock::new(())),
            waiting: Arc::new(Semaphore::new(self.request_capacity)),
            operations: TaskTracker::new(),
            closing: AtomicBool::new(false),
            durable,
            delayed_decision_clock,
            pending_source_edits: Mutex::new(BTreeSet::new()),
            protected_hold: Mutex::new(None),
        });
        *writer = Arc::downgrade(&world);
        Ok(world)
    }

    /// Join actual workers after the world and its final save have stopped.
    pub async fn shutdown(self: Arc<Self>) -> Result<(), WorldError> {
        tokio::task::spawn_blocking(move || self.pool.shutdown(TURN_WAIT))
            .await
            .map_err(|_| HostError::WorkerFailed)??;
        Ok(())
    }
}

pub struct HostedWorld {
    host: Arc<WorldHost>,
    store: Arc<Store>,
    session: Mutex<NativeWorldSession>,
    dispatch: SerialDispatch<WorldHost, Self>,
    fence: Arc<CandidateFence>,
    turn: Arc<TurnLock<()>>,
    waiting: Arc<Semaphore>,
    pub(crate) operations: TaskTracker,
    closing: AtomicBool,
    durable: watch::Sender<u64>,
    delayed_decision_clock: watch::Sender<bool>,
    pending_source_edits: Mutex<BTreeSet<Arc<str>>>,
    // An unresolved SQL outcome retains the actual candidate output and prefix.
    // Normal stop cannot pretend it rejected the mutation. Recovery cold-opens
    // the published database head after the old writer exits.
    protected_hold: Mutex<Option<Box<dyn Send>>>,
}

pub type ProtectedCommit<'a> =
    Pin<Box<dyn Future<Output = Result<RuntimeSaveAcknowledgement, CommitError>> + Send + 'a>>;

pub enum PlayerDisclosure {
    Busy,
    Changed,
    Unchanged,
    Published(axum::body::Bytes),
}

#[cfg(feature = "profile-campaign")]
type TurnGuard<T> = MeasuredTurn<T>;
#[cfg(not(feature = "profile-campaign"))]
type TurnGuard<T> = T;

/// The observation ends before releasing the actual world turn. It must not
/// change the lock order or make a timed waiter keep this guard alive.
#[cfg(feature = "profile-campaign")]
struct MeasuredTurn<T> {
    _observation: openlegend_simulation::profile::Operation,
    _guard: T,
}

fn held_turn<T>(
    guard: T,
    #[cfg(feature = "profile-campaign")] site: openlegend_simulation::profile::Site,
) -> TurnGuard<T> {
    #[cfg(feature = "profile-campaign")]
    {
        let mut observation = openlegend_simulation::profile::begin(site);
        observation.outcome(openlegend_simulation::profile::Outcome::Completed);
        MeasuredTurn {
            _observation: observation,
            _guard: guard,
        }
    }
    #[cfg(not(feature = "profile-campaign"))]
    guard
}

async fn wait_for_turn<T>(lock: impl Future<Output = T>) -> Result<T, HostError> {
    openlegend_simulation::profile_measure!(
        TURN_WAIT,
        tokio::time::timeout(TURN_WAIT, lock),
        |result| if result.is_ok() {
            openlegend_simulation::profile::Outcome::Completed
        } else {
            openlegend_simulation::profile::Outcome::Refused
        }
    )
    .await
    .map_err(|_| HostError::Busy)
}

pub(crate) struct PlayerDisclosureTurn {
    world: Arc<HostedWorld>,
    _turn: TurnGuard<tokio::sync::OwnedMutexGuard<()>>,
}

impl PlayerDisclosureTurn {
    /// Consume the existing fair turn during an immediate authorized
    /// handoff. Never hold it while waiting for a provider or socket.
    pub(crate) fn accepted<T>(
        self,
        select: impl FnOnce(&NativeWorldSession) -> Result<Option<T>, RuntimeError>,
    ) -> Result<Option<T>, WorldError> {
        if self.world.closing.load(Ordering::Acquire) {
            return Err(HostError::Closed.into());
        }
        self.world.publication_in_turn(select)
    }

    /// Consume the turn during the body poll that acquired it. Only the
    /// authorized result bytes leave this call for transport.
    pub(crate) fn disclose(
        self,
        authority: &Authority,
        scope: &AuthorizedScope,
        read: &RuntimePlayerRead,
        selected_events: &[String],
        control_preview_cut: Option<u64>,
        attack_review: Option<&crate::player_command::LateReviewInvite>,
        publish: impl FnOnce(bool, bool, &ByteBudget) -> Result<Option<axum::body::Bytes>, WorldError>,
    ) -> Result<PlayerDisclosure, WorldError> {
        self.world.disclose_player_in_turn(
            authority,
            scope,
            read,
            selected_events,
            control_preview_cut,
            attack_review,
            publish,
        )
    }
}

pub enum ApplicationStart<T> {
    Candidate(CandidateKey),
    Existing(T),
}

#[derive(Debug)]
pub(crate) enum NpcDisclosure {
    Busy,
    Refused(&'static str),
}

/// An optional higher decision ends at the first accepted pause. Each
/// receiver keeps its original clock version, even if the world resumes.
#[derive(Clone)]
pub(crate) struct DelayedDecisionClock(watch::Receiver<bool>);

impl DelayedDecisionClock {
    pub(crate) fn interrupted(&self) -> bool {
        *self.0.borrow() || self.0.has_changed().unwrap_or(true)
    }

    pub(crate) async fn interruption(&self) {
        if !self.interrupted() {
            let _ = self.0.clone().changed().await;
        }
    }
}

pub(crate) struct NpcDisclosureTurn<'a> {
    world: &'a HostedWorld,
    _turn: TurnGuard<tokio::sync::MutexGuard<'a, ()>>,
}

pub(crate) struct SourceEdit {
    world: Arc<HostedWorld>,
    actor: Arc<str>,
    _custody: openlegend_simulation::host::ByteReservation,
}

impl Drop for SourceEdit {
    fn drop(&mut self) {
        if let Ok(mut pending) = self.world.pending_source_edits.lock() {
            pending.remove(&self.actor);
        }
    }
}

impl DispatchWorld<WorldHost> for HostedWorld {
    fn dispatch(&self) -> &SerialDispatch<WorldHost, Self> {
        &self.dispatch
    }

    fn poison(&self) {
        self.fence.poison();
    }
}

impl HostedWorld {
    /// Reserve the actor's private edit before waiting for a durable prefix.
    /// Outstanding dispatch may observe the refusal as soon as the edit starts.
    pub(crate) fn begin_source_edit(
        self: &Arc<Self>,
        actor: &str,
    ) -> Result<SourceEdit, WorldError> {
        let _custody = self
            .host
            .budget()
            .reserve(1024 + actor.len())
            .map_err(HostError::from)?;
        let mut pending = self
            .pending_source_edits
            .lock()
            .map_err(|_| HostError::Poisoned)?;
        if pending.contains(actor) {
            return Err(HostError::Busy.into());
        }
        let actor: Arc<str> = Arc::from(actor);
        pending.insert(actor.clone());
        Ok(SourceEdit {
            world: self.clone(),
            actor,
            _custody,
        })
    }

    /// A protected evidence edit can announce withdrawal while a response
    /// candidate still owns ordinary admission. Hold its marker through
    /// this synchronous acceptance so a newly pending edit cannot race it.
    pub(crate) fn settle_npc_response(
        &self,
        actor: &str,
        fence: &CandidateFence,
        key: CandidateKey,
    ) -> Result<Settlement, WorldError> {
        let pending = self
            .pending_source_edits
            .lock()
            .map_err(|_| HostError::Poisoned)?;
        if pending.contains(actor) {
            return Err(WorldError::SourceEditPending);
        }
        Ok(fence.settle(key, true)?)
    }

    /// The game clock calls this after accepting its protected write and before
    /// releasing the native turn shared by provider disclosure and effects.
    pub(crate) fn publish_decision_clock(&self, paused: bool) {
        self.delayed_decision_clock.send_if_modified(|previous| {
            if *previous == paused {
                return false;
            }
            *previous = paused;
            true
        });
    }

    pub(crate) fn delayed_decision_clock(&self) -> DelayedDecisionClock {
        DelayedDecisionClock(self.delayed_decision_clock.subscribe())
    }

    /// Start the prepared transfer only while its native source and consumer
    /// are current. The synchronous callback must relinquish the lease
    /// before any provider, database or socket wait.
    pub(crate) async fn npc_disclosure_turn(&self) -> Result<NpcDisclosureTurn<'_>, WorldError> {
        self.request_advance_publication();
        Ok(NpcDisclosureTurn {
            world: self,
            _turn: held_turn(
                self.enter_turn(self.turn.lock()).await?,
                #[cfg(feature = "profile-campaign")]
                openlegend_simulation::profile::sites::TURN_NPC,
            ),
        })
    }

    fn disclose_npc<T>(
        &self,
        ticket: &RuntimeNpcResponseTicket,
        stage: Option<(&RuntimeNpcStageWitness, &RequestScope)>,
        remembered_places: bool,
        deliver: impl FnOnce(Option<u64>) -> T,
    ) -> Result<Result<T, NpcDisclosure>, WorldError> {
        if self.closing.load(Ordering::Acquire) {
            return Err(HostError::Closed.into());
        }
        let pending = self
            .pending_source_edits
            .lock()
            .map_err(|_| HostError::Poisoned)?;
        if pending.contains(ticket.actor_id()) {
            return Ok(Err(NpcDisclosure::Refused("source-edit-pending")));
        }
        let session = match self.session.try_lock() {
            Ok(session) => session,
            Err(std::sync::TryLockError::WouldBlock) => return Ok(Err(NpcDisclosure::Busy)),
            Err(std::sync::TryLockError::Poisoned(_)) => return Err(HostError::Poisoned.into()),
        };
        // Check the optional source under the already held session turn, then
        // reuse the ordinary send's single publication lease for both.
        let capture = stage.and_then(|(witness, owner)| {
            if witness.actor_id() != ticket.actor_id() {
                return None;
            }
            session.npc_stage_current(witness).ok()?.ok()?;
            session.intelligence_owner_life(&owner.account_id, &owner.actor_id).ok()?
        });
        match session.npc_response_publication_with_places(ticket, remembered_places)? {
            Ok(lease) => {
                let result = deliver(capture);
                drop(lease);
                Ok(Ok(result))
            }
            Err(reason) => Ok(Err(NpcDisclosure::Refused(reason))),
        }
    }

    /// Use a historical diagnostic only during a synchronous current read.
    /// The actor's pending edit and source lease stay held through encoding.
    pub(crate) fn with_current_stage_source<T>(
        &self,
        session: &NativeWorldSession,
        witness: &RuntimeNpcStageWitness,
        expose: impl FnOnce() -> T,
    ) -> Result<Option<T>, RuntimeError> {
        if self.closing.load(Ordering::Acquire) {
            return Ok(None);
        }
        let pending = self
            .pending_source_edits
            .lock()
            .map_err(|_| RuntimeError::application_refused("Diagnostic source is unavailable."))?;
        if pending.contains(witness.actor_id()) {
            return Ok(None);
        }
        match session.npc_stage_publication(witness)? {
            Ok(lease) => {
                let value = expose();
                drop(lease);
                Ok(Some(value))
            }
            Err(_) => Ok(None),
        }
    }

    /// Positive preview words require their final exact native exposure cut.
    /// A busy mutation leaves them withheld without delaying this socket poll.
    pub(crate) fn disclose_reply_preview<T>(
        &self,
        scope: &crate::authority::RequestScope,
        cut: u64,
        publish: impl FnOnce() -> T,
    ) -> Result<Option<T>, WorldError> {
        self.try_publication(|session| {
            let lease =
                session.reply_preview_publication(&scope.account_id, &scope.actor_id, cut)?;
            Ok(lease
                .filter(|lease| lease.is_current())
                .map(|_lease| publish()))
        })
    }

    pub(crate) fn disclose_reply_receipt<T>(
        &self,
        scope: &crate::authority::RequestScope,
        source: Option<&openlegend_simulation::experience::PersonalSourceRef>,
        publish: impl FnOnce(bool) -> T,
    ) -> Result<Option<T>, WorldError> {
        self.try_publication(|session| {
            let (lease, allowed) =
                session.reply_receipt_publication(&scope.account_id, &scope.actor_id, source)?;
            Ok(lease.is_current().then(|| publish(allowed)))
        })
    }

    /// Borrow the accepted world for immediate publication or precommit validation.
    /// A caller holding PostgreSQL can try this boundary without waiting for a world turn.
    pub(crate) fn try_publication<T>(
        &self,
        select: impl FnOnce(&NativeWorldSession) -> Result<Option<T>, RuntimeError>,
    ) -> Result<Option<T>, WorldError> {
        if self.closing.load(Ordering::Acquire) {
            return Err(HostError::Closed.into());
        }
        // An already admitted provider start owns the world turn. A preview
        // can defer its frame but must not take that start's session lock.
        let Ok(_turn) = self.turn.try_lock() else {
            return Ok(None);
        };
        let _turn = held_turn(
            _turn,
            #[cfg(feature = "profile-campaign")]
            openlegend_simulation::profile::sites::TURN_VIEW,
        );
        self.publication_in_turn(select)
    }

    fn publication_in_turn<T>(
        &self,
        select: impl FnOnce(&NativeWorldSession) -> Result<Option<T>, RuntimeError>,
    ) -> Result<Option<T>, WorldError> {
        let session = match self.session.try_lock() {
            Ok(session) => session,
            Err(std::sync::TryLockError::WouldBlock) => return Ok(None),
            Err(std::sync::TryLockError::Poisoned(_)) => return Err(HostError::Poisoned.into()),
        };
        Ok(select(&session)?)
    }

    async fn call<T>(
        self: &Arc<Self>,
        run: impl FnOnce(&mut NativeWorldSession) -> Result<T, RuntimeError> + Send + 'static,
    ) -> Result<T, WorldError>
    where
        T: Send + 'static,
    {
        let deadline = tokio::time::Instant::now() + TURN_WAIT;
        let mut input = Some(run);
        loop {
            let mut reply = None;
            let submitted = try_submit_world(&self.host, self, || {
                let run = input
                    .take()
                    .expect("world application submits its call once");
                let (send, receive) = oneshot::channel();
                reply = Some(receive);
                (
                    move |_, world: &Arc<Self>, _| {
                        let mut session = world.session.lock().map_err(|_| HostError::Poisoned)?;
                        Ok(run(&mut session))
                    },
                    move |result| {
                        let _ = send.send(result);
                    },
                )
            });
            match submitted {
                Ok(cancellation) => {
                    let _cancel = CancelCompute(cancellation);
                    let result = reply.expect("admitted world call owns its reply").await;
                    return Ok(result.map_err(|_| HostError::WorkerFailed)???);
                }
                Err(HostError::Busy) if tokio::time::Instant::now() < deadline => {
                    // Only an offer refused before enqueue is retried. No
                    // worker or native lock is held during this wait.
                    tokio::time::sleep_until(
                        (tokio::time::Instant::now() + IO_YIELD).min(deadline),
                    )
                    .await;
                }
                Err(error) => return Err(error.into()),
            }
        }
    }

    async fn enter(&self) -> Result<TurnGuard<tokio::sync::MutexGuard<'_, ()>>, WorldError> {
        let guard = self.enter_turn(self.turn.lock()).await?;
        Ok(held_turn(
            guard,
            #[cfg(feature = "profile-campaign")]
            openlegend_simulation::profile::sites::TURN_OTHER,
        ))
    }

    async fn enter_turn<T>(&self, lock: impl Future<Output = T>) -> Result<T, WorldError> {
        let queued = self.waiting.try_acquire().map_err(|_| HostError::Busy)?;
        let turn = wait_for_turn(lock).await?;
        drop(queued);
        if self.closing.load(Ordering::Acquire) {
            return Err(HostError::Closed.into());
        }
        Ok(turn)
    }

    /// The clock asks the active advance to finish at its next coherent point.
    /// Pending commands still wait outside the worker pool.
    pub fn request_advance_publication(&self) {
        self.fence.request_advance_publication();
    }

    /// Capture the actual immutable prefix at an accepted boundary, then let
    /// the store keep it independently through its PostgreSQL transaction.
    pub async fn capture_save(self: &Arc<Self>) -> Result<RuntimeSave, WorldError> {
        let _turn = self.enter().await?;
        self.call(NativeWorldSession::capture_save).await
    }

    /// Stage all fallible application work at the exact accepted cut before
    /// detaching the native prefix. The caller keeps the returned products
    /// alive across SQL and does not hold the world turn while awaiting it.
    pub(crate) async fn capture_save_with<T>(
        self: &Arc<Self>,
        prepare: impl FnOnce(&NativeWorldSession) -> Result<T, WorldError> + Send + 'static,
    ) -> Result<(RuntimeSave, T), WorldError>
    where
        T: Send + 'static,
    {
        let _turn = self.enter().await?;
        self.call(move |session| {
            let prepared = match prepare(session) {
                Ok(prepared) => prepared,
                Err(error) => return Ok(Err(error)),
            };
            Ok(Ok((session.capture_save()?, prepared)))
        })
        .await?
    }

    pub async fn acknowledge(
        self: &Arc<Self>,
        receipt: RuntimeSaveAcknowledgement,
    ) -> Result<(), WorldError> {
        let _turn = self.enter().await?;
        self.acknowledge_owned(receipt).await
    }

    async fn acknowledge_owned(
        self: &Arc<Self>,
        receipt: RuntimeSaveAcknowledgement,
    ) -> Result<(), WorldError> {
        let through = receipt.through_cut;
        self.call(move |session| session.acknowledge(receipt))
            .await?;
        self.durable.send_if_modified(|previous| {
            if through <= *previous {
                return false;
            }
            *previous = through;
            true
        });
        Ok(())
    }

    pub(crate) fn durability_changes(&self) -> watch::Receiver<u64> {
        self.durable.subscribe()
    }

    /// Wait for the caller's already selected accepted prefix under the
    /// ordinary save timer. Subsequent world activity cannot extend it.
    pub(crate) async fn when_durable(
        &self,
        required: u64,
        until: tokio::time::Instant,
    ) -> Result<(), WorldError> {
        let mut saved = self.durable.subscribe();
        tokio::time::timeout_at(until, saved.wait_for(|through| *through >= required))
            .await
            .map_err(|_| HostError::Busy)?
            .map_err(|_| HostError::Closed)?;
        Ok(())
    }

    /// Keep the accepted cut stable for a bounded capture. The returned owner
    /// must keep its own backing allocation through its consumer's last use.
    pub async fn capture<T>(
        self: &Arc<Self>,
        read: impl FnOnce(&NativeWorldSession) -> Result<T, RuntimeError> + Send + 'static,
    ) -> Result<T, WorldError>
    where
        T: Send + 'static,
    {
        let _turn = self.enter().await?;
        self.call(move |session| read(session)).await
    }

    /// Capture one permitted player's exact accepted read and fund the
    /// selected self fields before the borrowed simulation data is released.
    pub async fn capture_player<T>(
        self: &Arc<Self>,
        account: String,
        actor: String,
        window: usize,
        prepare: impl FnOnce(
            openlegend_simulation::capture::PlayerSelfFacts<'_>,
            RuntimeClock,
            &ByteBudget,
        ) -> Result<T, openlegend_simulation::host::CapacityError>
        + Send
        + 'static,
    ) -> Result<(openlegend_simulation::runtime::RuntimePlayerRead, T), WorldError>
    where
        T: Send + 'static,
    {
        let _turn = self.enter().await?;
        self.call(move |session| session.read_player_direct(&account, &actor, window, prepare))
            .await
    }

    /// The HTTP body polls this bounded, fair wait only when it can take its
    /// next frame. No compute worker or disclosure lease waits here.
    pub(crate) async fn player_disclosure_turn(
        self: Arc<Self>,
    ) -> Result<PlayerDisclosureTurn, WorldError> {
        self.request_advance_publication();
        let turn = self.enter_turn(self.turn.clone().lock_owned()).await?;
        Ok(PlayerDisclosureTurn {
            world: self,
            _turn: held_turn(
                turn,
                #[cfg(feature = "profile-campaign")]
                openlegend_simulation::profile::sites::TURN_VIEW,
            ),
        })
    }

    /// The first state response and stream headers may wait for the existing
    /// fair world turn. Final authorization and any payload still leave
    /// synchronously.
    pub(crate) async fn first_player_disclosure(
        &self,
        authority: &Authority,
        scope: &AuthorizedScope,
        read: &RuntimePlayerRead,
        selected_events: &[String],
        control_preview_cut: Option<u64>,
        attack_review: Option<&crate::player_command::LateReviewInvite>,
        publish: impl FnOnce(bool, bool, &ByteBudget) -> Result<Option<axum::body::Bytes>, WorldError>,
    ) -> Result<PlayerDisclosure, WorldError> {
        self.request_advance_publication();
        let guard = self.enter_turn(self.turn.lock()).await?;
        let _turn = held_turn(
            guard,
            #[cfg(feature = "profile-campaign")]
            openlegend_simulation::profile::sites::TURN_VIEW,
        );
        self.disclose_player_in_turn(
            authority,
            scope,
            read,
            selected_events,
            control_preview_cut,
            attack_review,
            publish,
        )
    }

    fn disclose_player_in_turn(
        &self,
        authority: &Authority,
        scope: &AuthorizedScope,
        read: &RuntimePlayerRead,
        selected_events: &[String],
        control_preview_cut: Option<u64>,
        attack_review: Option<&crate::player_command::LateReviewInvite>,
        publish: impl FnOnce(bool, bool, &ByteBudget) -> Result<Option<axum::body::Bytes>, WorldError>,
    ) -> Result<PlayerDisclosure, WorldError> {
        #[cfg(feature = "profile-campaign")]
        let mut observation = openlegend_simulation::profile_scope!(DISCLOSE);
        let result = authority.current_view(scope, |scope, controlling| {
            if self.closing.load(Ordering::Acquire) {
                return Err(HostError::Closed.into());
            }
            if !read.belongs_to(&scope.account_id, &scope.actor_id) {
                return Ok(PlayerDisclosure::Changed);
            }
            let edits = self
                .pending_source_edits
                .lock()
                .map_err(|_| HostError::Poisoned)?;
            if edits.contains(scope.actor_id.as_str()) {
                return Ok(PlayerDisclosure::Changed);
            }
            let session = match self.session.try_lock() {
                Ok(session) => session,
                Err(std::sync::TryLockError::WouldBlock) => return Ok(PlayerDisclosure::Busy),
                Err(std::sync::TryLockError::Poisoned(_)) => return Err(HostError::Poisoned.into()),
            };
            let clock = session.clock()?;
            if let Some(cut) = control_preview_cut
                && session.accepted_progress()?.through_cut != cut
            {
                return Ok(PlayerDisclosure::Changed);
            }
            let prepared = read.clock();
            if (
                clock.paused,
                clock.manually_paused,
                clock.speed,
                clock.maintenance_revision,
            ) != (
                prepared.paused,
                prepared.manually_paused,
                prepared.speed,
                prepared.maintenance_revision,
            ) {
                return Ok(PlayerDisclosure::Changed);
            }
            // The review is an independent private disclosure inside this
            // same accepted world turn. Its failure hides only the invitation.
            let review_allowed = if controlling && !clock.paused {
                attack_review.map(|review| review.current(&session, scope, self.host.budget()))
                    .transpose()?.unwrap_or(false)
            } else {
                false
            };
            let Some(permit) =
                session.player_publication(read, selected_events, clock.paused, controlling)?
            else {
                return Ok(PlayerDisclosure::Changed);
            };
            let result = publish(permit.can_use_inventory(), review_allowed, self.host.budget())?;
            drop(permit);
            Ok(match result {
                Some(bytes) => {
                    openlegend_simulation::profile_count!(VIEW_BYTES, bytes.len() as u64);
                    PlayerDisclosure::Published(bytes)
                }
                None => PlayerDisclosure::Unchanged,
            })
        });
        let result = result.map_err(WorldError::Access).and_then(|result| result);
        #[cfg(feature = "profile-campaign")]
        observation.outcome(match &result {
            Ok(PlayerDisclosure::Busy | PlayerDisclosure::Changed) => {
                openlegend_simulation::profile::Outcome::Refused
            }
            _ => WorldError::profile_outcome(&result),
        });
        result
    }

    /// The originating operation is suspended on this exact read ticket and
    /// already owns the world turn. Only the selected accepted store inputs
    /// are retained when the worker returns, before awaiting PostgreSQL.
    pub(crate) async fn prepare_known_places(
        self: &Arc<Self>,
        question: RuntimeProvider,
    ) -> Result<(RuntimeProvider, crate::store::PreparedKnownPlaceRead), WorldError> {
        let store = Arc::clone(&self.store);
        let (question, prepared) = self
            .call(move |session| {
                let prepared = session.with_known_place_read(&question, |read| {
                    store.prepare_known_place_read(read)
                })?;
                Ok((question, prepared))
            })
            .await?;
        Ok((question, prepared.ok_or(WorldError::ProviderKind)??))
    }

    pub(crate) async fn prepare_appraisal_outcomes(
        self: &Arc<Self>,
        question: RuntimeProvider,
    ) -> Result<(RuntimeProvider, crate::store::PreparedAppraisalOutcomes), WorldError> {
        let store = self.store.clone();
        let (question, prepared) = self
            .call(move |session| {
                let prepared = session
                    .with_appraisal_outcomes_read(&question, |read| store.prepare_appraisal_outcomes(read))?;
                Ok((question, prepared))
            })
            .await?;
        Ok((question, prepared.ok_or(WorldError::ProviderKind)??))
    }

    pub(crate) async fn prepare_source_versions(
        self: &Arc<Self>,
        question: RuntimeProvider,
    ) -> Result<(RuntimeProvider, crate::store::PreparedSourceVersions), WorldError> {
        let store = self.store.clone();
        let (question, prepared) = self
            .call(move |session| {
                let prepared = session.with_source_version_read(&question, |read| {
                    store.prepare_source_versions(read)
                })?;
                Ok((question, prepared))
            })
            .await?;
        Ok((question, prepared.ok_or(WorldError::ProviderKind)??))
    }

    pub(crate) async fn prepare_npc_sources(
        self: &Arc<Self>,
        question: RuntimeProvider,
    ) -> Result<(RuntimeProvider, crate::store::PreparedNpcSources), WorldError> {
        let store = self.store.clone();
        let (question, prepared) = self
            .call(move |session| {
                let prepared = session
                    .with_npc_sources_read(&question, |read| store.prepare_npc_sources(read))?;
                Ok((question, prepared))
            })
            .await?;
        Ok((question, prepared.ok_or(WorldError::ProviderKind)??))
    }

    pub(crate) async fn navigation(
        self: &Arc<Self>,
        include_world: bool,
    ) -> Result<Option<RuntimeNavigationRead>, WorldError> {
        let _turn = self.enter().await?;
        self.call(move |session| session.read_deferred_navigation(include_world))
            .await
    }

    pub(crate) async fn resolve_navigation(
        self: &Arc<Self>,
        mut read: RuntimeNavigationRead,
        result: openlegend_simulation::geometry::GeometryAnswers,
        funding: openlegend_simulation::host::ByteReservation,
    ) -> Result<Option<RuntimeNavigationRead>, WorldError> {
        let _turn = self.enter().await?;
        self.call(move |session| {
            let more = session.resolve_navigation_direct(&mut read, result, funding)?;
            Ok(more.then_some(read))
        })
        .await
    }

    /// Drive an ordinary operation through the simulation's real candidate.
    /// The final fence callback must settle synchronously under current app
    /// authority. If it returns an error it must have left the fence unchanged.
    /// Slow I/O cannot hold a compute job. Only finite simulation questions
    /// may keep a candidate open; NPC model requests use independent reads.
    pub async fn execute<T, B, Q, A, R, S>(
        self: &Arc<Self>,
        begin: B,
        answer: Q,
        stage: A,
        settle: S,
    ) -> Result<Option<T>, WorldError>
    where
        T: Send + 'static,
        B: FnOnce(&mut NativeWorldSession) -> Result<CandidateKey, RuntimeError> + Send + 'static,
        Q: FnMut(RuntimeProvider) -> R + Send + 'static,
        R: Future<Output = Result<(RuntimeProvider, RuntimeProviderInput), WorldError>> + Send,
        A: Fn(RuntimeDirectOutput<'_>, &ByteBudget) -> Result<T, RuntimeError>
            + Send
            + Sync
            + 'static,
        S: FnOnce(&CandidateFence, CandidateKey) -> Result<Settlement, WorldError> + Send + 'static,
    {
        self.execute_and_publish(
            #[cfg(feature = "profile-campaign")]
            openlegend_simulation::profile::sites::TURN_OTHER,
            |session| Ok(ApplicationStart::Candidate(begin(session)?)),
            answer,
            stage,
            |fence, key, _| settle(fence, key),
            |_| {},
        )
        .await
    }

    /// Publish independently funded receipts and history under the mutation
    /// turn. A retry cannot enter between gameplay acceptance and the live
    /// receipt. The callback only releases or transfers already staged work.
    pub async fn execute_and_publish<T, B, Q, A, R, S, P>(
        self: &Arc<Self>,
        #[cfg(feature = "profile-campaign")] holder: openlegend_simulation::profile::Site,
        begin: B,
        answer: Q,
        stage: A,
        settle: S,
        publish: P,
    ) -> Result<Option<T>, WorldError>
    where
        T: Send + 'static,
        B: FnOnce(&mut NativeWorldSession) -> Result<ApplicationStart<T>, WorldError>
            + Send
            + 'static,
        Q: FnMut(RuntimeProvider) -> R + Send + 'static,
        R: Future<Output = Result<(RuntimeProvider, RuntimeProviderInput), WorldError>> + Send,
        A: Fn(RuntimeDirectOutput<'_>, &ByteBudget) -> Result<T, RuntimeError>
            + Send
            + Sync
            + 'static,
        S: FnOnce(&CandidateFence, CandidateKey, &T) -> Result<Settlement, WorldError>
            + Send
            + 'static,
        P: FnOnce(&T) + Send + 'static,
    {
        self.execute_inner(
            #[cfg(feature = "profile-campaign")]
            holder,
            begin,
            answer,
            stage,
            |world, key, prepared| async move {
                if prepared.protected_save().is_some() {
                    return Err(WorldError::Protected);
                }
                prepared.ready()?;
                let decision = settle(&world.fence, key, prepared.output());
                if decision.is_err() {
                    world.fence.settle(key, false)?;
                }
                let accepted = world
                    .call(move |session| session.finish_settlement(key))
                    .await?;
                decision?;
                if !accepted {
                    return Ok(None);
                }
                let output = prepared.into_output();
                // An application programmer error cannot turn an accepted
                // operation into a retryable refusal with an absent receipt.
                if std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| publish(&output)))
                    .is_err()
                {
                    world.fence.poison();
                    world.closing.store(true, Ordering::Release);
                    return Err(HostError::Poisoned.into());
                }
                Ok(Some(output))
            },
        )
        .await
    }

    /// The caller's commit owns the real prefix through its PostgreSQL result.
    /// Authorization is checked before dispatching SQL, while the operation
    /// owns the same turn used by authority changes. Once SQL commits, even
    /// a disconnected caller cannot roll back or replay the candidate.
    pub async fn execute_protected<T, B, Q, A, R, V, C>(
        self: &Arc<Self>,
        begin: B,
        answer: Q,
        stage: A,
        validate: V,
        commit: C,
    ) -> Result<Option<T>, WorldError>
    where
        T: Send + Sync + 'static,
        B: FnOnce(&mut NativeWorldSession) -> Result<CandidateKey, RuntimeError> + Send + 'static,
        Q: FnMut(RuntimeProvider) -> R + Send + 'static,
        R: Future<Output = Result<(RuntimeProvider, RuntimeProviderInput), WorldError>> + Send,
        A: Fn(RuntimeDirectOutput<'_>, &ByteBudget) -> Result<T, RuntimeError>
            + Send
            + Sync
            + 'static,
        V: FnOnce() -> Result<(), WorldError> + Send + 'static,
        C: for<'a> FnOnce(&'a T, &'a RuntimeSave) -> ProtectedCommit<'a> + Send + 'static,
    {
        self.execute_protected_then(begin, answer, stage, validate, commit, |_| Ok(()))
            .await
    }

    /// Run the preadmitted application publication inside the same accepted
    /// turn, even if the original response socket closes after SQL dispatch.
    pub(crate) async fn execute_protected_then<T, B, Q, A, R, V, C, P>(
        self: &Arc<Self>,
        begin: B,
        answer: Q,
        stage: A,
        validate: V,
        commit: C,
        publish: P,
    ) -> Result<Option<T>, WorldError>
    where
        T: Send + Sync + 'static,
        B: FnOnce(&mut NativeWorldSession) -> Result<CandidateKey, RuntimeError> + Send + 'static,
        Q: FnMut(RuntimeProvider) -> R + Send + 'static,
        R: Future<Output = Result<(RuntimeProvider, RuntimeProviderInput), WorldError>> + Send,
        A: Fn(RuntimeDirectOutput<'_>, &ByteBudget) -> Result<T, RuntimeError> + Send + Sync + 'static,
        V: FnOnce() -> Result<(), WorldError> + Send + 'static,
        C: for<'a> FnOnce(&'a T, &'a RuntimeSave) -> ProtectedCommit<'a> + Send + 'static,
        P: FnOnce(&T) -> Result<(), WorldError> + Send + 'static,
    {
        self.execute_inner(
            #[cfg(feature = "profile-campaign")]
            openlegend_simulation::profile::sites::TURN_OTHER,
            |session| Ok(ApplicationStart::Candidate(begin(session)?)),
            answer,
            stage,
            |world, key, prepared| async move {
                let Some(prefix) = prepared.protected_save() else {
                    world.call(move |session| session.cancel(key)).await?;
                    return Ok(Some(prepared.into_output()));
                };
                prepared.ready()?;
                validate()?;
                let acknowledgement = match commit(prepared.output(), prefix).await {
                    Ok(acknowledgement) => acknowledgement,
                    Err(error @ CommitError::RolledBack(_)) => {
                        return Err(WorldError::Commit(error));
                    }
                    Err(CommitError::Unknown(_)) => return Err(world.hold_protected(prepared)),
                };
                // No fallible caller checks belong between SQL and publication.
                let accepted = async {
                    world.fence.settle(key, true)?;
                    if !world
                        .call(move |session| session.finish_settlement(key))
                        .await?
                    {
                        return Err(FenceError::Stale.into());
                    }
                    world.acknowledge_owned(acknowledgement).await
                };
                if accepted.await.is_err() || publish(prepared.output()).is_err() {
                    return Err(world.hold_protected(prepared));
                }
                Ok(Some(prepared.into_output()))
            },
        )
        .await
    }

    async fn execute_inner<T, B, Q, A, R, F, S>(
        self: &Arc<Self>,
        #[cfg(feature = "profile-campaign")] holder: openlegend_simulation::profile::Site,
        begin: B,
        mut answer: Q,
        stage: A,
        finish: F,
    ) -> Result<Option<T>, WorldError>
    where
        T: Send + 'static,
        B: FnOnce(&mut NativeWorldSession) -> Result<ApplicationStart<T>, WorldError>
            + Send
            + 'static,
        Q: FnMut(RuntimeProvider) -> R + Send + 'static,
        R: Future<Output = Result<(RuntimeProvider, RuntimeProviderInput), WorldError>> + Send,
        A: Fn(RuntimeDirectOutput<'_>, &ByteBudget) -> Result<T, RuntimeError>
            + Send
            + Sync
            + 'static,
        F: FnOnce(Arc<Self>, CandidateKey, RuntimeDirectPrepared<T>) -> S + Send + 'static,
        S: Future<Output = Result<Option<T>, WorldError>> + Send,
    {
        let queued = Arc::clone(&self.waiting)
            .try_acquire_owned()
            .map_err(|_| HostError::Busy)?;
        let world = Arc::clone(self);
        let (mut sender, receiver) = oneshot::channel();
        // Once a private candidate exists, cancellation must still join its
        // rollback even when the caller drops its future.
        #[cfg(feature = "profile-campaign")]
        let parent = openlegend_simulation::profile::current();
        let operation = async move {
            let result = async {
                let guard = tokio::select! {
                    biased;
                    _ = sender.closed() => return Err(HostError::Cancelled.into()),
                    turn = wait_for_turn(world.turn.lock()) => turn?,
                };
                let _turn = held_turn(guard, #[cfg(feature = "profile-campaign")] holder);
                drop(queued);
                if world.closing.load(Ordering::Acquire) {
                    world.require_recovered()?;
                    return Err(HostError::Closed.into());
                }
                world.store.assert_write_admission()?;
                let key = match world.call(move |session| Ok(begin(session))).await?? {
                    ApplicationStart::Candidate(key) => key,
                    ApplicationStart::Existing(value) => return Ok(Some(value)),
                };
                let stage = Arc::new(stage);
                let driven = async {
                    let mut supplied: Option<(RuntimeProvider, RuntimeProviderInput)> = None;
                    loop {
                        if sender.is_closed() {
                            return Err(HostError::Cancelled.into());
                        }
                        let stage = Arc::clone(&stage);
                        let step = world
                            .call(move |session| {
                                let ticket_and_input = supplied;
                                let (ticket, input) = match ticket_and_input {
                                    Some((ticket, input)) => (Some(ticket), Some(input)),
                                    None => (None, None),
                                };
                                session.step_direct(
                                    key,
                                    ticket.as_ref().zip(input),
                                    |product, budget| stage(product, budget),
                                )
                            })
                            .await?;
                        match step {
                            RuntimeDirectStep::Continue => supplied = None,
                            RuntimeDirectStep::Provider(ticket) => {
                                supplied = Some(tokio::select! {
                                    biased;
                                    _ = sender.closed() => return Err(HostError::Cancelled.into()),
                                    result = openlegend_simulation::profile_result!(QUESTION, answer(ticket)) => result?,
                                });
                            }
                            RuntimeDirectStep::Preview(value) => return Ok(Some(value)),
                            RuntimeDirectStep::Prepared(prepared) => {
                                if sender.is_closed() {
                                    return Err(HostError::Cancelled.into());
                                }
                                return finish(Arc::clone(&world), key, prepared).await;
                            }
                        }
                    }
                }
                .await;
                if driven.is_err() && world.require_recovered().is_ok() {
                    world.cleanup_candidate(key).await?;
                }
                driven
            }
            .await;
            let _ = sender.send(result);
        };
        #[cfg(feature = "profile-campaign")]
        let operation = openlegend_simulation::profile::carry(parent, operation);
        self.operations.spawn(operation);
        receiver.await.map_err(|_| HostError::WorkerFailed)?
    }

    fn hold_protected<T: Send + 'static>(&self, prepared: RuntimeDirectPrepared<T>) -> WorldError {
        self.closing.store(true, Ordering::Release);
        // The turn prevents a second owner from trying to replace this hold.
        *self
            .protected_hold
            .lock()
            .unwrap_or_else(|error| error.into_inner()) = Some(Box::new(prepared));
        WorldError::RecoveryRequired
    }

    fn require_recovered(&self) -> Result<(), WorldError> {
        match self.protected_hold.lock() {
            Ok(hold) if hold.is_none() => Ok(()),
            _ => Err(WorldError::RecoveryRequired),
        }
    }

    async fn cleanup_candidate(self: &Arc<Self>, key: CandidateKey) -> Result<(), WorldError> {
        match self.fence.phase() {
            CandidatePhase::Ready => {
                self.fence.settle(key, false)?;
                self.call(move |session| session.finish_settlement(key))
                    .await?;
                Ok(())
            }
            CandidatePhase::Accepted | CandidatePhase::Poisoned => {
                self.fence.poison();
                Err(HostError::Poisoned.into())
            }
            CandidatePhase::Rejected => {
                self.call(move |session| session.finish_settlement(key))
                    .await?;
                Ok(())
            }
            _ => self.call(move |session| session.cancel(key)).await,
        }
    }

    /// Join tasks that still hold candidate cleanup or scoped reads after
    /// their callers have stopped. Ingress and the save owner are already joined.
    pub(crate) async fn drain_operations(&self) {
        self.operations.close();
        self.operations.wait().await;
    }

    /// Call after the save owner has drained the last accepted prefix.
    pub async fn stop(self: &Arc<Self>) -> Result<(), WorldError> {
        self.closing.store(true, Ordering::Release);
        let guard = self.turn.lock().await;
        let _turn = held_turn(
            guard,
            #[cfg(feature = "profile-campaign")]
            openlegend_simulation::profile::sites::TURN_OTHER,
        );
        self.require_recovered()?;
        self.call(|session| session.finish_stop()).await
    }
}

impl NpcDisclosureTurn<'_> {
    pub(crate) fn disclose_player_expression(
        self,
        account: &str,
        actor: &str,
        binding: &openlegend_simulation::runtime::PlayerExpressionBinding,
        start: impl FnOnce(),
    ) -> Result<Result<(), NpcDisclosure>, WorldError> {
        let world = self.world;
        if world.closing.load(Ordering::Acquire) {
            return Err(HostError::Closed.into());
        }
        let pending = world.pending_source_edits.lock().map_err(|_| HostError::Poisoned)?;
        if pending.contains(actor) {
            return Ok(Err(NpcDisclosure::Refused("source-edit-pending")));
        }
        let session = match world.session.try_lock() {
            Ok(session) => session,
            Err(std::sync::TryLockError::WouldBlock) => return Ok(Err(NpcDisclosure::Busy)),
            Err(std::sync::TryLockError::Poisoned(_)) => return Err(HostError::Poisoned.into()),
        };
        match session.player_expression_current(account, actor, binding)? {
            Ok(()) => {
                start();
                Ok(Ok(()))
            },
            Err(reason) => Ok(Err(NpcDisclosure::Refused(reason))),
        }
    }

    /// Check the selected free interval under the same turn as the final
    /// synchronous provider disclosure. No database work can extend this check.
    pub(crate) fn discovery_current(
        &self,
        trigger: &openlegend_simulation::runtime::RuntimeNpcTrigger,
        actor: &str,
        generation: &str,
        reservation: &str,
        interval: u64,
    ) -> Result<bool, WorldError> {
        let session = self.world.session.try_lock().map_err(|error| match error {
            std::sync::TryLockError::WouldBlock => HostError::Busy,
            std::sync::TryLockError::Poisoned(_) => HostError::Poisoned,
        })?;
        Ok(session.npc_discovery_current(trigger, actor, generation, reservation, interval)?)
    }

    pub(crate) fn disclose<T>(
        self,
        ticket: &RuntimeNpcResponseTicket,
        stage: Option<(&RuntimeNpcStageWitness, &RequestScope)>,
        remembered_places: bool,
        deliver: impl FnOnce(Option<u64>) -> T,
    ) -> Result<Result<T, NpcDisclosure>, WorldError> {
        self.world.disclose_npc(ticket, stage, remembered_places, deliver)
    }
}

struct CancelCompute(openlegend_world_host::pool::Cancellation);
impl Drop for CancelCompute {
    fn drop(&mut self) {
        self.0.request();
    }
}
