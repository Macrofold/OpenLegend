//! Actual canonical ownership is separate from the shared transient allowance.
//! This counter imposes no world/population quota; existing semantic retention
//! owners still admit records, and RSS remains a separate measurement.

use super::budget::{ByteBudget, ByteReservation, CapacityError};
use std::fmt;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex, Weak};

#[derive(Clone, Default)]
pub struct ResidentMemory {
    inner: Arc<ResidentState>,
}

#[derive(Default)]
struct ResidentState {
    used: AtomicUsize,
    peak: AtomicUsize,
}

/// Custody of one actual allocation or one owner's backing allocation. A shared
/// immutable record keeps this guard inside its sole Arc allocation.
pub struct ResidentReservation {
    owner: Arc<ResidentState>,
    bytes: usize,
    pin: Mutex<Weak<SharedMemoryPin>>,
}

/// Captures and before-images share this transient admission for the same
/// immutable allocation. Their own vectors/keys/references remain separately
/// funded. Holding a pin never replaces custody of the actual record Arc.
pub struct SharedMemoryPin {
    storage: ByteReservation,
}

fn pin_overhead() -> usize {
    std::mem::size_of::<SharedMemoryPin>() + 2 * std::mem::size_of::<usize>()
}

impl fmt::Debug for ResidentReservation {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("ResidentReservation")
            .field("bytes", &self.bytes)
            .finish_non_exhaustive()
    }
}

impl fmt::Debug for SharedMemoryPin {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("SharedMemoryPin")
            .field("bytes", &self.storage.bytes())
            .finish_non_exhaustive()
    }
}
impl SharedMemoryPin {
    pub(super) fn from_workspace(mut storage: ByteReservation) -> Result<Arc<Self>, CapacityError> {
        storage.resize(
            storage
                .bytes()
                .checked_add(pin_overhead())
                .ok_or(CapacityError)?,
        )?;
        Ok(Arc::new(Self { storage }))
    }
}

impl ResidentMemory {
    pub(crate) fn owns(&self, reservation: &ResidentReservation) -> bool {
        Arc::ptr_eq(&self.inner, &reservation.owner)
    }
    pub fn used(&self) -> usize {
        self.inner.used.load(Ordering::Acquire)
    }

    pub fn peak(&self) -> usize {
        self.inner.peak.load(Ordering::Relaxed)
    }

    pub fn reserve(&self, bytes: usize) -> Result<ResidentReservation, CapacityError> {
        add(&self.inner, bytes)?;
        Ok(ResidentReservation {
            owner: Arc::clone(&self.inner),
            bytes,
            pin: Mutex::new(Weak::new()),
        })
    }
}

fn add(owner: &ResidentState, bytes: usize) -> Result<(), CapacityError> {
    let before = owner
        .used
        .try_update(Ordering::AcqRel, Ordering::Acquire, |used| {
            used.checked_add(bytes)
        })
        .map_err(|_| CapacityError)?;
    owner.peak.fetch_max(before + bytes, Ordering::Relaxed);
    Ok(())
}

impl ResidentReservation {
    pub fn bytes(&self) -> usize {
        self.bytes
    }

    pub(crate) fn shares_owner(&self, other: &Self) -> bool {
        Arc::ptr_eq(&self.owner, &other.owner)
    }

    /// A mutable owner aggregates backing growth, not an immutable captured
    /// body. Candidate pins retain each admitted growth separately; no capture
    /// may borrow that mutable Vec/map allocation. Captures copy its references.
    pub(super) fn into_backing(mut self) -> Result<Self, CapacityError> {
        *self.pin.get_mut().map_err(|_| CapacityError)? = Weak::new();
        Ok(self)
    }

    /// Mutable backing owners have no detached immutable pins. Refusing a size
    /// change while pinned prevents a caller from silently changing the body
    /// that an older capture's admission describes.
    fn require_unpinned(&mut self) -> Result<(), CapacityError> {
        if self
            .pin
            .get_mut()
            .map_err(|_| CapacityError)?
            .strong_count()
            != 0
        {
            return Err(CapacityError);
        }
        Ok(())
    }

    pub fn resize(&mut self, bytes: usize) -> Result<(), CapacityError> {
        if bytes == self.bytes {
            return Ok(());
        }
        self.require_unpinned()?;
        if bytes > self.bytes {
            add(&self.owner, bytes - self.bytes)?;
        } else {
            self.owner
                .used
                .fetch_sub(self.bytes - bytes, Ordering::AcqRel);
        }
        self.bytes = bytes;
        Ok(())
    }

    pub fn split_off(&mut self, bytes: usize) -> Result<Self, CapacityError> {
        if bytes != 0 {
            self.require_unpinned()?;
        }
        self.bytes = self.bytes.checked_sub(bytes).ok_or(CapacityError)?;
        Ok(Self {
            owner: Arc::clone(&self.owner),
            bytes,
            pin: Mutex::new(Weak::new()),
        })
    }

    pub fn merge(&mut self, mut other: Self) -> Result<(), CapacityError> {
        self.require_unpinned()?;
        other.require_unpinned()?;
        if !self.shares_owner(&other) {
            return Err(CapacityError);
        }
        self.bytes = self.bytes.checked_add(other.bytes).ok_or(CapacityError)?;
        other.bytes = 0;
        Ok(())
    }

    pub(crate) fn capture_pin(
        &self,
        budget: &ByteBudget,
    ) -> Result<Arc<SharedMemoryPin>, CapacityError> {
        let mut slot = self.pin.lock().map_err(|_| CapacityError)?;
        if let Some(pin) = slot.upgrade() {
            if !budget.owns(&pin.storage) {
                return Err(CapacityError);
            }
            return Ok(pin);
        }
        let pin = Arc::new(SharedMemoryPin {
            storage: budget.reserve(
                self.bytes
                    .checked_add(pin_overhead())
                    .ok_or(CapacityError)?,
            )?,
        });
        *slot = Arc::downgrade(&pin);
        Ok(pin)
    }

    pub(super) fn adopt_pin(
        &self,
        mut storage: ByteReservation,
        budget: &ByteBudget,
    ) -> Result<Arc<SharedMemoryPin>, CapacityError> {
        if !budget.owns(&storage) || storage.bytes() < self.bytes {
            return Err(CapacityError);
        }
        let mut slot = self.pin.lock().map_err(|_| CapacityError)?;
        if slot.strong_count() != 0 {
            return Err(CapacityError);
        }
        storage.resize(
            self.bytes
                .checked_add(pin_overhead())
                .ok_or(CapacityError)?,
        )?;
        let pin = Arc::new(SharedMemoryPin { storage });
        *slot = Arc::downgrade(&pin);
        Ok(pin)
    }
}

impl Drop for ResidentReservation {
    fn drop(&mut self) {
        self.owner.used.fetch_sub(self.bytes, Ordering::AcqRel);
    }
}
