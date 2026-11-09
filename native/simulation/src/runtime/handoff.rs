//! Ready follows the actual funded Node Buffer handoff, not merely taking an
//! opaque encoding handle. A failed bridge allocation leaves this proof unset.
use super::{ByteBudget, ByteReservation, RuntimeError, failure};
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};

struct Handoff {
    complete: AtomicBool,
    _custody: ByteReservation,
}

#[derive(Clone)]
pub struct RuntimeOutputHandoff(Arc<Handoff>);
impl RuntimeOutputHandoff {
    pub(super) fn new(budget: &ByteBudget) -> Result<Self, RuntimeError> {
        let custody = budget
            .reserve(std::mem::size_of::<Handoff>() + 2 * std::mem::size_of::<usize>())
            .map_err(failure)?;
        Ok(Self(Arc::new(Handoff {
            complete: AtomicBool::new(false),
            _custody: custody,
        })))
    }
    /// The bridge invokes this only after its real Buffer and finalizer exist.
    pub fn complete(&self) {
        self.0.complete.store(true, Ordering::Release);
    }
    pub(super) fn is_complete(&self) -> bool {
        self.0.complete.load(Ordering::Acquire)
    }
}
