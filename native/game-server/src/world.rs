//! An application turn owns the right to advance one private candidate.
//! Compute submissions share the process pool. SQL and provider waits own
//! their inputs and never occupy a worker.

use crate::store::{CommitError, Store, StoreError};
use openlegend_simulation::host::{
    ByteBudget, CandidateFence, CandidateKey, CandidatePhase, FenceError, Settlement,
};
use openlegend_simulation::runtime::{
    NativeWorldSession, RuntimeActivation, RuntimeDirectOutput, RuntimeDirectPrepared,
    RuntimeDirectStep, RuntimeError, RuntimeProvider, RuntimeProviderInput, RuntimeSave,
    RuntimeSaveAcknowledgement,
};
use openlegend_world_host::{
    DispatchHost, DispatchWorld, SerialDispatch,
    pool::{HostError, HostPool},
    submit_world,
};
use std::future::Future;
use std::pin::Pin;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, Weak};
use std::time::Duration;
use tokio::sync::{Mutex as TurnLock, Semaphore, oneshot};

const MAX_WAITING: usize = 256;
const TURN_WAIT: Duration = Duration::from_secs(5);

#[derive(Debug)]
pub enum WorldError {
    Host(HostError),
    Simulation(RuntimeError),
    Fence(FenceError),
    WriterOwned,
    Protected,
    Commit(CommitError),
    Storage(StoreError),
    RecoveryRequired,
    ProviderKind,
    Geometry(crate::spatial::SpatialError),
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
            Self::RecoveryRequired => {
                f.write_str("The protected operation is fenced pending durable recovery")
            }
            Self::ProviderKind => f.write_str("The prepared operation requires another provider"),
            Self::Geometry(error) => error.fmt(f),
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
    pub fn new(workers: usize, transient_bytes: usize) -> Result<Arc<Self>, WorldError> {
        Ok(Arc::new(Self {
            pool: HostPool::new(workers)?,
            budget: ByteBudget::new(transient_bytes),
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
        let (send, receive) = oneshot::channel();
        let cancellation = self.pool.submit(
            move |_| Ok(work()),
            move |result| {
                let _ = send.send(result);
            },
            || {},
        )?;
        let cancel = CancelCompute(cancellation);
        let value = receive.await.map_err(|_| HostError::WorkerFailed)??;
        drop(cancel);
        Ok(value)
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
        session.activate(receipt)?;
        let fence = session.fence();
        let world = Arc::new(HostedWorld {
            host: Arc::clone(self),
            store,
            session: Mutex::new(session),
            dispatch,
            fence,
            turn: TurnLock::new(()),
            waiting: Arc::new(Semaphore::new(MAX_WAITING)),
            closing: AtomicBool::new(false),
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
    turn: TurnLock<()>,
    waiting: Arc<Semaphore>,
    closing: AtomicBool,
    // An unresolved SQL outcome retains the actual candidate output and prefix.
    // Normal stop cannot pretend it rejected the mutation. Recovery cold-opens
    // the published database head after the old writer exits.
    protected_hold: Mutex<Option<Box<dyn Send>>>,
}

pub type ProtectedCommit<'a> =
    Pin<Box<dyn Future<Output = Result<RuntimeSaveAcknowledgement, CommitError>> + Send + 'a>>;

impl DispatchWorld<WorldHost> for HostedWorld {
    fn dispatch(&self) -> &SerialDispatch<WorldHost, Self> {
        &self.dispatch
    }

    fn poison(&self) {
        self.fence.poison();
    }
}

impl HostedWorld {
    async fn call<T>(
        self: &Arc<Self>,
        run: impl FnOnce(&mut NativeWorldSession) -> Result<T, RuntimeError> + Send + 'static,
    ) -> Result<T, WorldError>
    where
        T: Send + 'static,
    {
        let (send, receive) = oneshot::channel();
        submit_world(
            &self.host,
            self,
            move |_, world, _| {
                let mut session = world.session.lock().map_err(|_| HostError::Poisoned)?;
                Ok(run(&mut session))
            },
            move |result| {
                let _ = send.send(result);
            },
        )?;
        Ok(receive.await.map_err(|_| HostError::WorkerFailed)???)
    }

    async fn enter(&self) -> Result<tokio::sync::MutexGuard<'_, ()>, WorldError> {
        let queued = self.waiting.try_acquire().map_err(|_| HostError::Busy)?;
        let turn = tokio::time::timeout(TURN_WAIT, self.turn.lock())
            .await
            .map_err(|_| HostError::Busy)?;
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

    pub async fn acknowledge(
        self: &Arc<Self>,
        receipt: RuntimeSaveAcknowledgement,
    ) -> Result<(), WorldError> {
        let _turn = self.enter().await?;
        self.call(move |session| session.acknowledge(receipt)).await
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
        self.execute_inner(begin, answer, stage, |world, key, prepared| async move {
            if prepared.protected_save().is_some() {
                return Err(WorldError::Protected);
            }
            prepared.ready()?;
            let decision = settle(&world.fence, key);
            if decision.is_err() {
                world.fence.settle(key, false)?;
            }
            let accepted = world
                .call(move |session| session.finish_settlement(key))
                .await?;
            decision?;
            Ok(accepted.then(|| prepared.into_output()))
        })
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
        self.execute_inner(begin, answer, stage, |world, key, prepared| async move {
            let Some(prefix) = prepared.protected_save() else {
                world.call(move |session| session.cancel(key)).await?;
                return Ok(Some(prepared.into_output()));
            };
            prepared.ready()?;
            validate()?;
            let acknowledgement = match commit(prepared.output(), prefix).await {
                Ok(acknowledgement) => acknowledgement,
                Err(error @ CommitError::RolledBack(_)) => return Err(WorldError::Commit(error)),
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
                world
                    .call(move |session| session.acknowledge(acknowledgement))
                    .await
            };
            if accepted.await.is_err() {
                return Err(world.hold_protected(prepared));
            }
            Ok(Some(prepared.into_output()))
        })
        .await
    }

    async fn execute_inner<T, B, Q, A, R, F, S>(
        self: &Arc<Self>,
        begin: B,
        mut answer: Q,
        stage: A,
        finish: F,
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
        tokio::spawn(async move {
            let result = async {
                let _turn = tokio::select! {
                    biased;
                    _ = sender.closed() => return Err(HostError::Cancelled.into()),
                    turn = tokio::time::timeout(TURN_WAIT, world.turn.lock()) => turn.map_err(|_| HostError::Busy)?,
                };
                drop(queued);
                if world.closing.load(Ordering::Acquire) {
                    return Err(HostError::Closed.into());
                }
                world.require_recovered()?;
                world.store.assert_write_admission()?;
                let key = world.call(begin).await?;
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
                                    result = answer(ticket) => result?,
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
                if driven.is_err() && !matches!(driven, Err(WorldError::RecoveryRequired)) {
                    world.cleanup_candidate(key).await?;
                }
                driven
            }
            .await;
            let _ = sender.send(result);
        });
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

    /// Call after the save owner has drained the last accepted prefix.
    pub async fn stop(self: &Arc<Self>) -> Result<(), WorldError> {
        self.closing.store(true, Ordering::Release);
        let _turn = self.turn.lock().await;
        self.require_recovered()?;
        self.call(|session| session.finish_stop()).await
    }
}

struct CancelCompute(openlegend_world_host::pool::Cancellation);
impl Drop for CancelCompute {
    fn drop(&mut self) {
        self.0.request();
    }
}
