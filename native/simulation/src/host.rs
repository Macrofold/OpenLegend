//! A candidate's visibility fence is separate from its mutable records. Settlement
//! must never acquire the writer lock held by native calculation.

mod budget;
pub(crate) mod retained_size;
pub use budget::{ByteBudget, ByteReservation, CapacityError};

use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};

const STATE_BITS: u32 = 4;
const STATE_MASK: u64 = (1 << STATE_BITS) - 1;
const MAX_CANDIDATE_ID: u64 = u64::MAX >> STATE_BITS;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u64)]
pub enum CandidatePhase {
    Idle = 0,
    Preparing = 1,
    Ready = 2,
    Accepted = 3,
    Rejected = 4,
    RollingBack = 5,
    Poisoned = 6,
    Stopped = 7,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct CandidateKey {
    pub id: u64,
    pub base_cut: u64,
    pub generation: u64,
}

/// Proof of the fence's exact accepted candidate. Only host acceptance may
/// create it; proposal owners can inspect its binding without re-settling.
pub(crate) struct AcceptedCandidate {
    key: CandidateKey,
}
impl AcceptedCandidate {
    pub(crate) fn key(&self) -> CandidateKey {
        self.key
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum FenceError {
    Busy,
    Closed,
    Stale,
    NotReady,
    Poisoned,
    IdentityExhausted,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Settlement {
    Accepted,
    Rejected,
}

/// One fence belongs to one world, while the compute pool belongs to the host.
/// The token includes identity as well as phase: a late settlement cannot accept
/// a different ready candidate after the first one has completed.
pub struct CandidateFence {
    token: AtomicU64,
    base_cut: AtomicU64,
    generation: AtomicU64,
    closed: AtomicBool,
    stop_requested: AtomicBool,
    last_settlement: Mutex<Option<(CandidateKey, Settlement)>>,
}

impl Default for CandidateFence {
    fn default() -> Self {
        Self::new()
    }
}

impl CandidateFence {
    pub const fn new() -> Self {
        Self {
            token: AtomicU64::new(CandidatePhase::Idle as u64),
            base_cut: AtomicU64::new(0),
            generation: AtomicU64::new(0),
            closed: AtomicBool::new(false),
            stop_requested: AtomicBool::new(false),
            last_settlement: Mutex::new(None),
        }
    }

    /// Called by the existing single writer before editing any canonical record.
    pub fn begin(&self, base_cut: u64, generation: u64) -> Result<CandidateKey, FenceError> {
        if self.closed.load(Ordering::Acquire) {
            return Err(FenceError::Closed);
        }
        let previous = self.token.load(Ordering::Acquire);
        if phase(previous) != CandidatePhase::Idle {
            return Err(phase_error(previous));
        }
        let id = (previous >> STATE_BITS)
            .checked_add(1)
            .filter(|id| *id <= MAX_CANDIDATE_ID)
            .ok_or(FenceError::IdentityExhausted)?;
        self.token
            .compare_exchange(
                previous,
                token(id, CandidatePhase::Preparing),
                Ordering::AcqRel,
                Ordering::Acquire,
            )
            .map_err(phase_error)?;
        self.base_cut.store(base_cut, Ordering::Relaxed);
        self.generation.store(generation, Ordering::Relaxed);
        Ok(CandidateKey {
            id,
            base_cut,
            generation,
        })
    }

    pub fn ready(&self, key: CandidateKey) -> Result<(), FenceError> {
        self.check_bindings(key)?;
        self.transition(key.id, CandidatePhase::Preparing, CandidatePhase::Ready)
    }

    pub(crate) fn validate_phase(
        &self,
        key: CandidateKey,
        expected: CandidatePhase,
    ) -> Result<(), FenceError> {
        self.check_bindings(key)?;
        if self.token.load(Ordering::Acquire) != token(key.id, expected) {
            return Err(FenceError::NotReady);
        }
        Ok(())
    }

    /// The application rechecks current input/authority and reserved output/save
    /// capacity immediately before this synchronous constant-size exchange.
    pub fn settle(&self, key: CandidateKey, accept: bool) -> Result<Settlement, FenceError> {
        // Only this fixed-size control record is shared with settlement; the
        // mutable world lock is never acquired. Completed older requests use the
        // application's existing bounded receipt owner, not a native diary.
        let mut last = self
            .last_settlement
            .lock()
            .map_err(|_| FenceError::Poisoned)?;
        if let Some((settled_key, outcome)) = *last
            && settled_key == key
        {
            return Ok(outcome);
        }
        self.check_bindings(key)?;
        let target = if accept {
            CandidatePhase::Accepted
        } else {
            CandidatePhase::Rejected
        };
        let ready = token(key.id, CandidatePhase::Ready);
        match self.token.compare_exchange(
            ready,
            token(key.id, target),
            Ordering::AcqRel,
            Ordering::Acquire,
        ) {
            Ok(_) => {
                let outcome = if accept {
                    Settlement::Accepted
                } else {
                    Settlement::Rejected
                };
                *last = Some((key, outcome));
                Ok(outcome)
            }
            Err(current) if current >> STATE_BITS != key.id => Err(FenceError::Stale),
            Err(current) => match phase(current) {
                CandidatePhase::Accepted => Ok(Settlement::Accepted),
                CandidatePhase::Rejected | CandidatePhase::RollingBack => Ok(Settlement::Rejected),
                CandidatePhase::Poisoned => Err(FenceError::Poisoned),
                _ => Err(FenceError::NotReady),
            },
        }
    }

    /// The writer has detached the accepted effects/delta for their real owners.
    pub(crate) fn accepted_candidate(
        &self,
        key: CandidateKey,
    ) -> Result<AcceptedCandidate, FenceError> {
        self.check_bindings(key)?;
        let current = self.token.load(Ordering::Acquire);
        if current == token(key.id, CandidatePhase::Accepted) {
            Ok(AcceptedCandidate { key })
        } else if current >> STATE_BITS != key.id {
            Err(FenceError::Stale)
        } else {
            Err(phase_error(current))
        }
    }

    pub fn accepted_complete(&self, key: CandidateKey) -> Result<(), FenceError> {
        self.check_bindings(key)?;
        self.transition(key.id, CandidatePhase::Accepted, CandidatePhase::Idle)
    }

    pub fn start_rollback(&self, key: CandidateKey) -> Result<(), FenceError> {
        self.check_bindings(key)?;
        self.transition(
            key.id,
            CandidatePhase::Rejected,
            CandidatePhase::RollingBack,
        )
    }

    /// Preparation failure/cancellation is private; the writer must revert the
    /// operation's undo batch before declaring this candidate available again.
    pub fn rollback_preparation(&self, key: CandidateKey) -> Result<(), FenceError> {
        self.check_bindings(key)?;
        self.transition(
            key.id,
            CandidatePhase::Preparing,
            CandidatePhase::RollingBack,
        )
    }

    pub fn rollback_complete(&self, key: CandidateKey) -> Result<(), FenceError> {
        self.check_bindings(key)?;
        self.transition(key.id, CandidatePhase::RollingBack, CandidatePhase::Idle)
    }

    pub fn request_stop(&self) {
        self.stop_requested.store(true, Ordering::Release);
    }

    pub fn stop_requested(&self) -> bool {
        self.closed.load(Ordering::Acquire) || self.stop_requested.load(Ordering::Acquire)
    }

    /// Consume a request only when reaching its coherent boundary. Beginning a
    /// new job never clears a stop that raced its admission.
    pub fn take_stop_request(&self) -> bool {
        self.stop_requested.swap(false, Ordering::AcqRel)
    }

    pub fn close_admission(&self) {
        self.closed.store(true, Ordering::Release);
        self.request_stop();
    }

    /// Panic leaves no trustworthy rollback assumption; the owner must recover
    /// from its last complete durable cut rather than serve the tentative state.
    pub fn poison(&self) {
        self.closed.store(true, Ordering::Release);
        self.request_stop();
        self.token
            .try_update(Ordering::AcqRel, Ordering::Acquire, |value| {
                Some(token(value >> STATE_BITS, CandidatePhase::Poisoned))
            })
            .ok();
    }

    pub fn finish_stop(&self) -> Result<(), FenceError> {
        self.close_admission();
        let previous = self.token.load(Ordering::Acquire);
        if phase(previous) != CandidatePhase::Idle {
            return Err(phase_error(previous));
        }
        self.transition(
            previous >> STATE_BITS,
            CandidatePhase::Idle,
            CandidatePhase::Stopped,
        )
    }

    pub fn phase(&self) -> CandidatePhase {
        phase(self.token.load(Ordering::Acquire))
    }

    fn check_bindings(&self, key: CandidateKey) -> Result<(), FenceError> {
        let current = self.token.load(Ordering::Acquire);
        if phase(current) == CandidatePhase::Poisoned {
            return Err(FenceError::Poisoned);
        }
        if current >> STATE_BITS != key.id
            || self.base_cut.load(Ordering::Relaxed) != key.base_cut
            || self.generation.load(Ordering::Relaxed) != key.generation
        {
            return Err(FenceError::Stale);
        }
        Ok(())
    }

    fn transition(
        &self,
        id: u64,
        from: CandidatePhase,
        to: CandidatePhase,
    ) -> Result<(), FenceError> {
        self.token
            .compare_exchange(
                token(id, from),
                token(id, to),
                Ordering::AcqRel,
                Ordering::Acquire,
            )
            .map(|_| ())
            .map_err(|current| {
                if current >> STATE_BITS == id {
                    phase_error(current)
                } else {
                    FenceError::Stale
                }
            })
    }
}

fn token(id: u64, phase: CandidatePhase) -> u64 {
    (id << STATE_BITS) | phase as u64
}

fn phase(value: u64) -> CandidatePhase {
    match value & STATE_MASK {
        0 => CandidatePhase::Idle,
        1 => CandidatePhase::Preparing,
        2 => CandidatePhase::Ready,
        3 => CandidatePhase::Accepted,
        4 => CandidatePhase::Rejected,
        5 => CandidatePhase::RollingBack,
        6 => CandidatePhase::Poisoned,
        _ => CandidatePhase::Stopped,
    }
}

fn phase_error(value: u64) -> FenceError {
    match phase(value) {
        CandidatePhase::Poisoned => FenceError::Poisoned,
        CandidatePhase::Stopped => FenceError::Closed,
        _ => FenceError::Busy,
    }
}
