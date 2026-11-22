//! Ordinary persistence keeps the exact detached native prefix and its
//! independently funded history and receipts through a confirmed SQL result.

use crate::{
    language::LanguageProvider,
    npc::schedule::{ScheduleInbox, ScheduleWake},
    store::{
        AdmittedJob, CommitError, GameplayReceipt, OrdinaryProjection, PreparedActivityMemories,
        PreparedRecall, Store, StoreError,
    },
    world::{HostedWorld, WorldError},
};
use indexmap::IndexMap;
use openlegend_simulation::{
    host::{ByteBudget, ByteReservation, CapacityError, map_storage},
    runtime::{
        NativeWorldSession, RuntimeError, RuntimeHistory, RuntimeHistoryCuts,
        RuntimePreparedProducts, RuntimeSave, RuntimeSaveAcknowledgement,
    },
};
use openlegend_world_host::pool::HostError;
use std::{
    collections::VecDeque,
    sync::{Arc, Mutex, atomic::{AtomicBool, Ordering}},
    time::Duration,
};
use tokio::{
    sync::{Mutex as AsyncMutex, Notify, RwLock, RwLockReadGuard, RwLockWriteGuard, watch},
    time::Instant,
};

pub const SAVE_INTERVAL: Duration = Duration::from_secs(1);
const MAX_SAVE_AGE: Duration = Duration::from_secs(5);

pub struct AcceptedSaveInput {
    through: u64,
    history: RuntimeHistory,
    receipt: Option<GameplayReceipt>,
    job: Option<Arc<AdmittedJob>>,
    activity_memories: Option<Arc<PreparedActivityMemories>>,
    wake: Option<ScheduleWake>,
    _custody: ByteReservation,
}

/// History and recall belonging to a protected gameplay candidate. Use
/// the ordinary writer and notify its workers only after the native ACK.
pub(crate) struct ProtectedGameplaySave {
    history: RuntimeHistory,
    eligibility: Option<RuntimeHistoryCuts>,
    recall: Option<PreparedRecall>,
    activity_memories: Option<Arc<PreparedActivityMemories>>,
    recall_hard_bytes: i64,
    story_enqueued: AtomicBool,
}

impl ProtectedGameplaySave {
    pub(crate) fn prepare(
        product: &RuntimePreparedProducts<'_>,
        store: &Store,
        budget: &ByteBudget,
    ) -> Result<Self, RuntimeError> {
        product
            .prepare_protected_gameplay_save(budget, |history, eligibility, recall| {
                let activity_memories =
                    OrdinaryProjection::validate_candidate(store, recall.changes, &history)?;
                let recall_hard_bytes =
                    i64::try_from(recall.hard_bytes).map_err(|_| StoreError::Capacity)?;
                let recall = store.prepare_recall(recall)?;
                Ok::<_, StoreError>(Self {
                    history,
                    eligibility,
                    recall,
                    activity_memories,
                    recall_hard_bytes,
                    story_enqueued: AtomicBool::new(false),
                })
            })?
            .map_err(RuntimeError::application_refused)
    }

    pub(crate) fn projection<'a>(
        &'a self,
        store: &'a Store,
        language: Option<&'a LanguageProvider>,
    ) -> OrdinaryProjection<'a> {
        OrdinaryProjection::new(store, std::slice::from_ref(&self.history))
            .with_projections(self.eligibility.as_ref(), self.recall.as_ref(), language)
            .with_activity_memories(self.activity_memories.as_slice(), self.recall_hard_bytes)
    }

    pub(crate) fn record_commit(&self, projection: &OrdinaryProjection<'_>) {
        self.story_enqueued
            .store(projection.story_enqueued(), Ordering::Relaxed);
    }

    pub(crate) fn acknowledged(&self, saves: &LiveSaves) {
        if self.recall.is_some() || self.activity_memories.is_some() {
            saves.signal_recall_change();
        }
        if self.story_enqueued.load(Ordering::Relaxed) {
            saves.story_waker().notify_one();
        }
        saves.signal_view();
    }
}

struct Pending {
    queue: VecDeque<(Instant, Arc<AcceptedSaveInput>)>,
    queue_custody: ByteReservation,
    receipt_reads: IndexMap<String, ReceiptReaders>,
    reader_custody: ByteReservation,
    fault: bool,
}

struct ReceiptReaders {
    readers: usize,
    accepted: Option<Arc<AcceptedSaveInput>>,
    _custody: ByteReservation,
}

pub struct ReceiptRead<'a> {
    owner: &'a LiveSaves,
    id: &'a str,
}

struct Detached {
    native: RuntimeSave,
    prepared: PreparedPrefix,
    committed: Option<RuntimeSaveAcknowledgement>,
    story_enqueued: bool,
}

struct PreparedPrefix {
    through: u64,
    histories: Vec<RuntimeHistory>,
    receipts: Vec<GameplayReceipt>,
    jobs: Vec<Arc<AdmittedJob>>,
    eligibility: Option<RuntimeHistoryCuts>,
    recall: Option<PreparedRecall>,
    activity_memories: Vec<Arc<PreparedActivityMemories>>,
    recall_hard_bytes: i64,
    _custody: ByteReservation,
}

pub struct LiveSaves {
    world: Arc<HostedWorld>,
    store: Arc<Store>,
    language: Option<Arc<LanguageProvider>>,
    budget: ByteBudget,
    pending: Mutex<Pending>,
    detached: AsyncMutex<Option<Detached>>,
    intake: RwLock<()>,
    wake: Notify,
    lexical_wake: Arc<Notify>,
    semantic_wake: Arc<Notify>,
    story_wake: Arc<Notify>,
    publications: watch::Sender<u64>,
    schedule: Option<Arc<ScheduleInbox>>,
}

impl LiveSaves {
    pub fn new(
        world: Arc<HostedWorld>,
        store: Arc<Store>,
        budget: ByteBudget,
        language: Option<Arc<LanguageProvider>>,
    ) -> Result<Self, CapacityError> {
        let queue_custody = budget.reserve(0)?;
        let reader_custody = budget.reserve(0)?;
        let (publications, _) = watch::channel(0);
        Ok(Self {
            world,
            store,
            language,
            budget,
            pending: Mutex::new(Pending {
                queue: VecDeque::new(),
                queue_custody,
                receipt_reads: IndexMap::new(),
                reader_custody,
                fault: false,
            }),
            detached: AsyncMutex::new(None),
            intake: RwLock::new(()),
            wake: Notify::new(),
            lexical_wake: Arc::new(Notify::new()),
            semantic_wake: Arc::new(Notify::new()),
            story_wake: Arc::new(Notify::new()),
            publications,
            schedule: None,
        })
    }

    pub(crate) fn with_schedule(mut self, schedule: Arc<ScheduleInbox>) -> Self {
        self.schedule = Some(schedule);
        self
    }

    pub(crate) fn lexical_waker(&self) -> Arc<Notify> {
        self.lexical_wake.clone()
    }

    pub(crate) fn semantic_waker(&self) -> Arc<Notify> {
        self.semantic_wake.clone()
    }

    /// The two indexes recover independently from the same durable source change.
    pub(crate) fn signal_recall_change(&self) {
        self.lexical_wake.notify_one();
        self.semantic_wake.notify_one();
    }

    pub(crate) fn resume_semantic_index(&self) {
        self.semantic_wake.notify_one();
    }

    pub(crate) fn story_waker(&self) -> Arc<Notify> {
        self.story_wake.clone()
    }

    /// An ordinary applicant may hold this promise only through its mutation.
    /// It does not borrow the world or prevent the independent save worker
    /// from detaching and acknowledging ordinary prefixes.
    pub(crate) async fn enter_ordinary(&self) -> RwLockReadGuard<'_, ()> {
        self.intake.read().await
    }

    /// Close ordinary admission before draining. The holder retains priority
    /// over new candidates until its protected result settles.
    pub(crate) async fn enter_protected(
        self: &Arc<Self>,
    ) -> Result<RwLockWriteGuard<'_, ()>, WorldError> {
        self.drain_protected(self.intake.write().await).await
    }

    /// Automatic checkpoint admission must leave the intake queue unchanged
    /// on contention. Once admitted it uses the normal durable prefix drain.
    pub(crate) async fn try_enter_protected(
        self: &Arc<Self>,
    ) -> Result<RwLockWriteGuard<'_, ()>, WorldError> {
        let held = self.intake.try_write().map_err(|_| HostError::Busy)?;
        self.drain_protected(held).await
    }

    async fn drain_protected<'a>(
        self: &Arc<Self>,
        held: RwLockWriteGuard<'a, ()>,
    ) -> Result<RwLockWriteGuard<'a, ()>, WorldError> {
        while self.flush().await? {}
        Ok(held)
    }

    pub fn check_admission(&self, now: Instant) -> Result<(), WorldError> {
        self.store.assert_write_admission()?;
        let pending = self
            .pending
            .lock()
            .map_err(|_| StoreError::WriterUnavailable)?;
        if pending.fault
            || pending.queue.front().is_some_and(|(accepted, _)| {
                now.saturating_duration_since(*accepted) >= MAX_SAVE_AGE
            })
        {
            return Err(StoreError::WriterUnavailable.into());
        }
        Ok(())
    }

    pub(crate) fn has_failed(&self) -> bool {
        self.fault_latched() || self.store.assert_write_admission().is_err()
    }

    fn fault_latched(&self) -> bool {
        self.pending.lock().map_or(true, |pending| pending.fault)
    }

    fn latch_fault(&self, error: WorldError) -> WorldError {
        if let Ok(mut pending) = self.pending.lock()
            && !pending.fault
        {
            pending.fault = true;
            drop(pending);
            eprintln!("Ordinary world save failed: {error}");
            self.signal_view();
            self.wake.notify_one();
        }
        error
    }

    pub(crate) fn publication_revision(&self) -> u64 {
        *self.publications.borrow()
    }

    pub(crate) fn subscribe(&self) -> watch::Receiver<u64> {
        self.publications.subscribe()
    }

    pub(crate) fn signal_view(&self) {
        self.publications.send_modify(|revision| {
            *revision = revision
                .checked_add(1)
                .expect("publication revision exhausted");
        });
    }

    /// Fund the accepted queue and this exact application product before
    /// Ready. The capture already owns the original occurrence/evidence bodies.
    /// The optional receipt belongs to the same command outcome and cut.
    pub fn stage(
        &self,
        products: &RuntimePreparedProducts<'_>,
        receipt: Option<GameplayReceipt>,
    ) -> Result<Arc<AcceptedSaveInput>, RuntimeError> {
        self.stage_with_job(products, receipt, None)
    }

    pub(crate) fn stage_with_job(
        &self,
        products: &RuntimePreparedProducts<'_>,
        receipt: Option<GameplayReceipt>,
        job: Option<Arc<AdmittedJob>>,
    ) -> Result<Arc<AcceptedSaveInput>, RuntimeError> {
        let receipt_body = receipt
            .as_ref()
            .map(receipt_bytes)
            .transpose()?
            .unwrap_or(0);
        let total = (std::mem::size_of::<AcceptedSaveInput>() + 2 * std::mem::size_of::<usize>())
            .checked_add(receipt_body)
            .ok_or(CapacityError)?;
        let custody = self.budget.reserve(total)?;
        let mut pending = self.pending.lock().map_err(|_| CapacityError)?;
        if pending.fault {
            return Err(RuntimeError::application_busy(
                StoreError::WriterUnavailable,
            ));
        }
        let history = products.retain_history();
        let activity_memories =
            OrdinaryProjection::validate_candidate(&self.store, products.changes(), &history)
                .map_err(RuntimeError::application_refused)?;
        let old = pending.queue.capacity();
        if pending.queue.len() == old {
            let next = old.checked_mul(2).ok_or(CapacityError)?.max(8);
            let slot = std::mem::size_of::<(Instant, Arc<AcceptedSaveInput>)>();
            let growing = self
                .budget
                .reserve(next.checked_mul(slot).ok_or(CapacityError)?)?;
            pending
                .queue
                .try_reserve_exact(next - old)
                .map_err(|_| CapacityError)?;
            pending.queue_custody = growing;
        }
        let wake = self
            .schedule
            .as_ref()
            .map(|schedule| schedule.stage(products.changes()))
            .transpose()?;
        Ok(Arc::new(AcceptedSaveInput {
            through: products.progress().through_cut,
            history,
            receipt,
            job,
            activity_memories,
            wake,
            _custody: custody,
        }))
    }

    /// Run under the same world turn and before any newer request can recover
    /// a receipt. All allocation and product ownership was staged before Ready.
    pub fn accept(&self, input: &Arc<AcceptedSaveInput>) {
        let mut pending = self.pending.lock().expect("ordinary save owner poisoned");
        assert!(
            pending.queue.len() < pending.queue.capacity(),
            "ordinary save queue not staged"
        );
        assert!(
            pending
                .queue
                .back()
                .is_none_or(|(_, prior)| prior.through < input.through),
            "ordinary save receipt is out of order"
        );
        let was_empty = pending.queue.is_empty();
        if let Some(receipt) = input.receipt.as_ref()
            && let Some(readers) = pending.receipt_reads.get_mut(&receipt.id)
        {
            readers.accepted = Some(input.clone());
        }
        pending.queue.push_back((Instant::now(), input.clone()));
        if let Some((schedule, wake)) = self.schedule.as_ref().zip(input.wake.as_ref()) {
            schedule.accept(wake);
        }
        if was_empty {
            self.wake.notify_one();
        }
        self.signal_view();
    }

    /// Readers keep the actual accepted body independent of save ACK. A live
    /// miss is not a durable miss. The caller must check its original scope
    /// again after looking up the durable receipt.
    pub fn read_receipt<'a>(&'a self, id: &'a str) -> Result<ReceiptRead<'a>, StoreError> {
        let mut pending = self
            .pending
            .lock()
            .map_err(|_| StoreError::WriterUnavailable)?;
        if let Some(readers) = pending.receipt_reads.get_mut(id) {
            readers.readers = readers.readers.checked_add(1).ok_or(StoreError::Capacity)?;
        } else {
            let key = self
                .budget
                .reserve(id.len())
                .map_err(|_| StoreError::Capacity)?;
            if pending.receipt_reads.len() == pending.receipt_reads.capacity() {
                let length = pending.receipt_reads.len();
                let next = length
                    .checked_mul(2)
                    .and_then(|n| n.checked_add(4))
                    .ok_or(StoreError::Capacity)?;
                let bytes = map_storage::<String, ReceiptReaders>(next)
                    .ok_or(StoreError::Capacity)?
                    .max(pending.reader_custody.bytes());
                let new = self
                    .budget
                    .reserve(bytes)
                    .map_err(|_| StoreError::Capacity)?;
                pending
                    .receipt_reads
                    .try_reserve(1)
                    .map_err(|_| StoreError::Capacity)?;
                pending.reader_custody = new;
            }
            let accepted = pending.queue.iter().rev().find_map(|(_, input)| {
                input
                    .receipt
                    .as_ref()
                    .is_some_and(|receipt| receipt.id == id)
                    .then(|| input.clone())
            });
            pending.receipt_reads.insert(
                id.to_owned(),
                ReceiptReaders {
                    readers: 1,
                    accepted,
                    _custody: key,
                },
            );
        }
        Ok(ReceiptRead { owner: self, id })
    }

    pub(crate) fn watched_receipt(
        &self,
        id: &str,
    ) -> Result<Option<Arc<AcceptedSaveInput>>, StoreError> {
        let pending = self
            .pending
            .lock()
            .map_err(|_| StoreError::WriterUnavailable)?;
        Ok(pending
            .receipt_reads
            .get(id)
            .and_then(|readers| readers.accepted.clone()))
    }

    /// A pending job is visible at the accepted boundary before PostgreSQL
    /// confirms the same occurrence. The returned owner survives that ACK.
    pub(crate) fn pending_job(&self, id: &str) -> Result<Option<Arc<AdmittedJob>>, StoreError> {
        let pending = self
            .pending
            .lock()
            .map_err(|_| StoreError::WriterUnavailable)?;
        Ok(pending
            .queue
            .iter()
            .rev()
            .find_map(|(_, input)| input.job.as_ref().filter(|job| job.job.id == id).cloned()))
    }

    /// The existing one-second timer and manual barriers use this writer.
    /// PostgreSQL never owns the mutation turn while writing ordinary work.
    /// A refused capture or ACK turn can wait for the next save opportunity.
    pub async fn flush(self: &Arc<Self>) -> Result<bool, WorldError> {
        self.flush_ready(false).await
    }

    async fn flush_ready(self: &Arc<Self>, scheduled: bool) -> Result<bool, WorldError> {
        // The caller can lose its connection while this save owns the exact
        // cut. Until the actual SQL result, the writer keeps both products.
        let owner = self.clone();
        tokio::spawn(async move { owner.flush_owned(scheduled).await })
            .await
            .map_err(|_| HostError::WorkerFailed)?
    }

    async fn flush_owned(self: &Arc<Self>, scheduled: bool) -> Result<bool, WorldError> {
        openlegend_simulation::profile_body!(
            SAVE_FLUSH,
            {
                let mut detached = self.detached.lock().await;
                if self.fault_latched() {
                    return Err(StoreError::WriterUnavailable.into());
                }
                if detached.is_none() {
                    let oldest = self
                        .pending
                        .lock()
                        .map_err(|_| StoreError::WriterUnavailable)?
                        .queue
                        .front()
                        .map(|(at, _)| *at);
                    // A protected drain can settle the prefix that started this timer.
                    // Check the current deadline while holding the sole flush owner.
                    if oldest.is_none_or(|at| scheduled && at.elapsed() < SAVE_INTERVAL) {
                        return Ok(false);
                    }
                    let owner = self.clone();
                    let capture = self
                        .world
                        .capture_save_with(move |session| owner.prepare_prefix(session))
                        .await;
                    let (native, prepared) = match capture {
                        Ok(prefix) => prefix,
                        Err(error) if capture_can_wait(&error) => return Err(error),
                        Err(error) => return Err(self.latch_fault(error)),
                    };
                    if native.rows().through_cut != prepared.through {
                        return Err(self.latch_fault(StoreError::StaleCut.into()));
                    }
                    *detached = Some(Detached {
                        native,
                        prepared,
                        committed: None,
                        story_enqueued: false,
                    });
                }
                let flight = detached.as_mut().expect("detached save");
                if flight.committed.is_none() {
                    let projection =
                        OrdinaryProjection::new(&self.store, &flight.prepared.histories)
                            .with_projections(
                                flight.prepared.eligibility.as_ref(),
                                flight.prepared.recall.as_ref(),
                                self.language.as_deref(),
                            )
                            .with_conversation_jobs(&flight.prepared.jobs)
                            .with_activity_memories(
                                &flight.prepared.activity_memories,
                                flight.prepared.recall_hard_bytes,
                            );
                    let result = self
                        .store
                        .commit_save(&flight.native, &flight.prepared.receipts, &projection)
                        .await;
                    let ack = match result {
                        Ok(ack) => Ok(ack),
                        Err(CommitError::Unknown(cause)) => {
                            // Only read the exact durable outcome on the original
                            // writer. A proven rollback still latches the write fault.
                            match self
                                .store
                                .reconcile_prefix(flight.native.rows(), &flight.prepared.receipts)
                                .await
                            {
                                Ok(Some(ack)) => Ok(ack),
                                Ok(None) => Err(CommitError::RolledBack(cause)),
                                Err(_) => Err(CommitError::Unknown(cause)),
                            }
                        }
                        Err(error) => Err(error),
                    };
                    flight.committed =
                        Some(ack.map_err(|error| self.latch_fault(WorldError::Commit(error)))?);
                    flight.story_enqueued = projection.story_enqueued();
                }
                let ack = flight
                    .committed
                    .as_ref()
                    .expect("confirmed ordinary save")
                    .clone();
                let through = ack.through_cut;
                match openlegend_simulation::profile_result!(ACK, self.world.acknowledge(ack)).await
                {
                    Ok(()) => (),
                    // The database already committed. A refused turn leaves the ACK
                    // in this detached owner, so the next attempt never resends SQL.
                    Err(error) if error.is_admission_refusal() => return Err(error),
                    Err(error) => return Err(self.latch_fault(error)),
                }
                let mut pending = self
                    .pending
                    .lock()
                    .map_err(|_| StoreError::WriterUnavailable)?;
                while pending
                    .queue
                    .front()
                    .is_some_and(|(_, input)| input.through <= through)
                {
                    pending.queue.pop_front();
                }
                drop(pending);
                if flight.prepared.recall.is_some() || !flight.prepared.activity_memories.is_empty()
                {
                    self.signal_recall_change();
                }
                if flight.story_enqueued {
                    self.story_wake.notify_one();
                }
                // Keep the successfully acknowledged prefix if its caller has another
                // independent read. This writer no longer needs its reference.
                *detached = None;
                Ok(true)
            },
            WorldError::profile_outcome
        )
    }

    /// Schedule one background write per ordinary save opportunity. The
    /// listener stops intake before requesting the final drain. The caller
    /// owns any confirmed/refused result and joins this task during shutdown.
    pub async fn run(self: &Arc<Self>, mut stop: watch::Receiver<bool>) -> Result<(), WorldError> {
        let mut retry_at = None;
        let fault = loop {
            if *stop.borrow() {
                break None;
            }
            let oldest = {
                let pending = self
                    .pending
                    .lock()
                    .map_err(|_| StoreError::WriterUnavailable)?;
                if pending.fault {
                    break Some(StoreError::WriterUnavailable.into());
                }
                pending.queue.front().map(|(at, _)| *at)
            };
            match oldest {
                Some(at) => {
                    // A newer tail can already be due when the older prefix
                    // finishes. A refused capture or ACK turn gets a new
                    // opportunity without resetting the oldest acceptance.
                    let due = (at + SAVE_INTERVAL).max(retry_at.unwrap_or(at));
                    tokio::select! {
                        _ = stop.changed() => break None,
                        _ = tokio::time::sleep_until(due) => {},
                    }
                    retry_at = match self.flush_ready(true).await {
                        Ok(_) => None,
                        Err(error) if self.fault_latched() => break Some(error),
                        Err(error) if capture_can_wait(&error) => {
                            Some(Instant::now() + SAVE_INTERVAL)
                        }
                        Err(error) => return Err(error),
                    };
                }
                None => {
                    tokio::select! {
                        _ = stop.changed() => break None,
                        _ = self.wake.notified() => {},
                    }
                }
            }
        };
        if let Some(error) = fault {
            // Keep the accepted cut and its visible error until an operator
            // stops the listener. A failed write does not replay on shutdown.
            // docs/save-and-load.md#background-and-synchronous-world-saves
            while !*stop.borrow() && stop.changed().await.is_ok() {}
            return Err(error);
        }
        while self.flush().await? {}
        Ok(())
    }

    fn prepare_prefix(&self, session: &NativeWorldSession) -> Result<PreparedPrefix, WorldError> {
        let through = session.accepted_progress()?.through_cut;
        let pending = self
            .pending
            .lock()
            .map_err(|_| StoreError::WriterUnavailable)?;
        let selected = || {
            pending
                .queue
                .iter()
                .map(|(_, input)| input)
                .take_while(|input| input.through <= through)
        };
        if selected()
            .last()
            .is_none_or(|input| input.through != through)
        {
            return Err(StoreError::StaleCut.into());
        }
        let mut bytes = std::mem::size_of::<PreparedPrefix>();
        let mut histories_count = 0usize;
        let mut receipts_count = 0usize;
        let mut jobs_count = 0usize;
        let mut memory_count = 0usize;
        for input in selected() {
            histories_count += 1;
            bytes = bytes
                .checked_add(std::mem::size_of::<RuntimeHistory>())
                .ok_or(StoreError::Capacity)?;
            if let Some(receipt) = input.receipt.as_ref() {
                receipts_count += 1;
                bytes = bytes
                    .checked_add(std::mem::size_of::<GameplayReceipt>())
                    .and_then(|size| size.checked_add(receipt_bytes(receipt).ok()?))
                    .ok_or(StoreError::Capacity)?;
            }
            if input.job.is_some() {
                jobs_count += 1;
                bytes = bytes
                    .checked_add(std::mem::size_of::<Arc<AdmittedJob>>())
                    .ok_or(StoreError::Capacity)?;
            }
            if input.activity_memories.is_some() {
                memory_count += 1;
                bytes = bytes
                    .checked_add(std::mem::size_of::<Arc<PreparedActivityMemories>>())
                    .ok_or(StoreError::Capacity)?;
            }
        }
        let custody = self
            .budget
            .reserve(bytes)
            .map_err(|_| StoreError::Capacity)?;
        let mut histories = Vec::new();
        histories
            .try_reserve_exact(histories_count)
            .map_err(|_| StoreError::Capacity)?;
        let mut receipts = Vec::new();
        receipts
            .try_reserve_exact(receipts_count)
            .map_err(|_| StoreError::Capacity)?;
        let mut jobs = Vec::new();
        jobs.try_reserve_exact(jobs_count)
            .map_err(|_| StoreError::Capacity)?;
        let mut activity_memories = Vec::new();
        activity_memories
            .try_reserve_exact(memory_count)
            .map_err(|_| StoreError::Capacity)?;
        for input in selected() {
            histories.push(input.history.clone());
            if let Some(receipt) = &input.receipt {
                receipts.push(receipt.clone());
            }
            if let Some(job) = &input.job {
                jobs.push(job.clone());
            }
            if let Some(memories) = &input.activity_memories {
                activity_memories.push(memories.clone());
            }
        }
        let eligibility = session.capture_save_history_cuts(through, &histories)?;
        let (recall, recall_hard_bytes) = session.with_ordinary_recall(through, |read| {
            let hard_bytes = i64::try_from(read.hard_bytes).map_err(|_| StoreError::Capacity)?;
            Ok::<_, StoreError>((self.store.prepare_recall(read)?, hard_bytes))
        })??;
        Ok(PreparedPrefix {
            through,
            histories,
            receipts,
            jobs,
            eligibility,
            recall,
            activity_memories,
            recall_hard_bytes,
            _custody: custody,
        })
    }
}

fn capture_can_wait(error: &WorldError) -> bool {
    error.is_admission_refusal() || matches!(error, WorldError::Storage(StoreError::Capacity))
}

impl AcceptedSaveInput {
    pub fn receipt(&self) -> Option<&GameplayReceipt> {
        self.receipt.as_ref()
    }
}

impl ReceiptRead<'_> {
    /// A fixed SQL snapshot can miss a receipt accepted while it was reading.
    /// Follow the live acceptance even if ordinary save ACK has removed it
    /// from the active prefix. The caller rechecks this at its final turn.
    pub fn accepted(&self) -> Result<Option<Arc<AcceptedSaveInput>>, StoreError> {
        self.owner.watched_receipt(self.id)
    }
}

impl Drop for ReceiptRead<'_> {
    fn drop(&mut self) {
        if let Ok(mut pending) = self.owner.pending.lock()
            && let Some(value) = pending.receipt_reads.get_mut(self.id)
        {
            value.readers -= 1;
            if value.readers == 0 {
                pending.receipt_reads.swap_remove(self.id);
            }
        }
    }
}

fn receipt_bytes(receipt: &GameplayReceipt) -> Result<usize, CapacityError> {
    [
        receipt.id.capacity(),
        receipt.fingerprint.capacity(),
        receipt
            .recovery_fingerprint
            .as_ref()
            .map_or(0, String::capacity),
        receipt.result.get().len(),
    ]
    .into_iter()
    .try_fold(0usize, |total, next| {
        total.checked_add(next).ok_or(CapacityError)
    })
}
