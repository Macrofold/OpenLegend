//! A world's candidate retains pins for its actual newly allocated/before-image
//! records. The host's byte counter is shared; candidate phases are not.

use super::budget::{ByteBudget, ByteReservation, CapacityError};
use super::resident::{ResidentReservation, SharedMemoryPin};
use std::mem::size_of;
use std::sync::{Arc, Mutex, Weak};

#[derive(Default)]
pub(super) struct WorldMemoryScope {
    candidate: Mutex<Weak<PinLedger>>,
}

struct PinLedger {
    entries: Mutex<PinEntries>,
}

struct PinEntries {
    pins: Vec<Arc<SharedMemoryPin>>,
    storage: ByteReservation,
}

impl PinEntries {
    fn prepare_slot(&mut self) -> Result<(), CapacityError> {
        if self.pins.len() < self.pins.capacity() {
            return Ok(());
        }
        let target = self
            .pins
            .capacity()
            .checked_mul(2)
            .map(|n| n.max(4))
            .ok_or(CapacityError)?;
        let bytes = target
            .checked_mul(size_of::<Arc<SharedMemoryPin>>())
            .and_then(|n| n.checked_add(size_of::<PinLedger>() + 2 * size_of::<usize>()))
            .ok_or(CapacityError)?;
        self.storage.resize(bytes)?;
        self.pins
            .try_reserve_exact(target - self.pins.len())
            .map_err(|_| CapacityError)
    }
}

/// Lives with the actual candidate journal, including its parked/Ready phase.
/// Dropping it releases only candidate references; captures can retain the same
/// pins and canonical records keep their separate resident custody.
pub(crate) struct CandidateMemory {
    scope: Arc<WorldMemoryScope>,
    ledger: Arc<PinLedger>,
}

#[derive(Clone, Copy)]
pub(crate) struct MemoryCheckpoint(usize);

impl WorldMemoryScope {
    pub(super) fn begin(
        self: &Arc<Self>,
        budget: &ByteBudget,
    ) -> Result<CandidateMemory, CapacityError> {
        let mut active = self.candidate.lock().map_err(|_| CapacityError)?;
        if active.strong_count() != 0 {
            return Err(CapacityError);
        }
        let ledger = Arc::new(PinLedger {
            entries: Mutex::new(PinEntries {
                pins: Vec::new(),
                storage: budget.reserve(size_of::<PinLedger>() + 2 * size_of::<usize>())?,
            }),
        });
        *active = Arc::downgrade(&ledger);
        Ok(CandidateMemory {
            scope: Arc::clone(self),
            ledger,
        })
    }

    pub(super) fn retain(
        &self,
        record: &ResidentReservation,
        budget: &ByteBudget,
    ) -> Result<(), CapacityError> {
        let ledger = self.candidate.lock().map_err(|_| CapacityError)?.upgrade();
        let Some(ledger) = ledger else { return Ok(()) };
        let mut entries = ledger.entries.lock().map_err(|_| CapacityError)?;
        entries.prepare_slot()?;
        // Pin admission precedes the caller's canonical allocation/growth.
        let pin = record.capture_pin(budget)?;
        entries.pins.push(pin);
        Ok(())
    }

    pub(super) fn adopt(
        &self,
        record: &ResidentReservation,
        storage: ByteReservation,
        budget: &ByteBudget,
    ) -> Result<(), CapacityError> {
        let ledger = self.candidate.lock().map_err(|_| CapacityError)?.upgrade();
        let Some(ledger) = ledger else { return Ok(()) };
        let mut entries = ledger.entries.lock().map_err(|_| CapacityError)?;
        entries.prepare_slot()?;
        entries.pins.push(record.adopt_pin(storage, budget)?);
        Ok(())
    }

    pub(super) fn retain_workspace(
        &self,
        budget: &ByteBudget,
        bytes: usize,
    ) -> Result<(), CapacityError> {
        let ledger = self.candidate.lock().map_err(|_| CapacityError)?.upgrade();
        let Some(ledger) = ledger else { return Ok(()) };
        let mut entries = ledger.entries.lock().map_err(|_| CapacityError)?;
        entries.prepare_slot()?;
        entries
            .pins
            .push(SharedMemoryPin::from_workspace(budget.reserve(bytes)?)?);
        Ok(())
    }
}

impl CandidateMemory {
    pub(crate) fn checkpoint(&self) -> Result<MemoryCheckpoint, CapacityError> {
        Ok(MemoryCheckpoint(
            self.ledger
                .entries
                .lock()
                .map_err(|_| CapacityError)?
                .pins
                .len(),
        ))
    }

    pub(crate) fn rollback(&self, checkpoint: MemoryCheckpoint) -> Result<(), CapacityError> {
        let mut entries = self.ledger.entries.lock().map_err(|_| CapacityError)?;
        if checkpoint.0 > entries.pins.len() {
            return Err(CapacityError);
        }
        entries.pins.truncate(checkpoint.0);
        Ok(())
    }
}

impl Drop for CandidateMemory {
    fn drop(&mut self) {
        if let Ok(mut active) = self.scope.candidate.lock()
            && active.ptr_eq(&Arc::downgrade(&self.ledger))
        {
            *active = Weak::new();
        }
    }
}
