//! Shared transient native capacity. One host owns one counter across candidate
//! undo, detached output and retained captures; no gameplay quota is replaced.

use std::fmt;
use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct CapacityError;

impl fmt::Display for CapacityError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("native host byte allowance is exhausted")
    }
}
impl std::error::Error for CapacityError {}

/// Capacity follows actual ownership. Cancellation does not release a still-live
/// buffer, and moving this reservation to a detached output does not double-count
/// or silently free it.
#[derive(Clone)]
pub struct ByteBudget {
    inner: Arc<ByteBudgetState>,
    world: Arc<super::world_memory::WorldMemoryScope>,
}

struct ByteBudgetState {
    limit: usize,
    used: AtomicUsize,
    peak: AtomicUsize,
    resident: super::resident::ResidentMemory,
    pending_save: super::resident::ResidentMemory,
    tracks_pending_save: bool,
}

pub struct ByteReservation {
    owner: Arc<ByteBudgetState>,
    bytes: usize,
    pending_save: Option<super::resident::ResidentReservation>,
}
impl fmt::Debug for ByteBudget {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("ByteBudget")
            .field("limit", &self.limit())
            .field("used", &self.used())
            .field("resident", &self.resident().used())
            .finish_non_exhaustive()
    }
}
impl fmt::Debug for ByteReservation {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("ByteReservation")
            .field("bytes", &self.bytes)
            .finish_non_exhaustive()
    }
}

impl ByteBudget {
    pub fn new(limit: usize) -> Self {
        Self {
            inner: Arc::new(ByteBudgetState {
                limit,
                used: AtomicUsize::new(0),
                peak: AtomicUsize::new(0),
                resident: super::resident::ResidentMemory::default(),
                pending_save: super::resident::ResidentMemory::default(),
                tracks_pending_save: false,
            }),
            world: Arc::default(),
        }
    }

    pub fn reserve(&self, bytes: usize) -> Result<ByteReservation, CapacityError> {
        let previous = self
            .inner
            .used
            .try_update(Ordering::AcqRel, Ordering::Acquire, |used| {
                used.checked_add(bytes)
                    .filter(|total| *total <= self.inner.limit)
            })
            .map_err(|_| CapacityError)?;
        let pending_save = if self.inner.tracks_pending_save {
            match self.inner.pending_save.reserve(bytes) {
                Ok(storage) => Some(storage),
                Err(error) => {
                    self.inner.used.fetch_sub(bytes, Ordering::AcqRel);
                    return Err(error);
                }
            }
        } else {
            None
        };
        self.inner
            .peak
            .fetch_max(previous + bytes, Ordering::Relaxed);
        Ok(ByteReservation {
            owner: Arc::clone(&self.inner),
            bytes,
            pending_save,
        })
    }

    pub fn used(&self) -> usize {
        self.inner.used.load(Ordering::Acquire)
    }

    pub fn peak(&self) -> usize {
        self.inner.peak.load(Ordering::Relaxed)
    }

    pub fn limit(&self) -> usize {
        self.inner.limit
    }

    pub fn resident(&self) -> &super::resident::ResidentMemory {
        &self.inner.resident
    }

    /// Pending-save rows have the existing independent per-world allowance.
    /// The host observes all still-live prefixes even after their world stops;
    /// the aggregate is accounting, not a second quota.
    pub fn pending_save(&self, limit: usize) -> Self {
        Self {
            inner: Arc::new(ByteBudgetState {
                limit,
                used: AtomicUsize::new(0),
                peak: AtomicUsize::new(0),
                resident: self.inner.resident.clone(),
                pending_save: self.inner.pending_save.clone(),
                tracks_pending_save: true,
            }),
            world: Arc::clone(&self.world),
        }
    }

    pub fn pending_save_used(&self) -> usize {
        self.inner.pending_save.used()
    }
    pub fn pending_save_peak(&self) -> usize {
        self.inner.pending_save.peak()
    }

    pub(crate) fn owns(&self, reservation: &ByteReservation) -> bool {
        Arc::ptr_eq(&self.inner, &reservation.owner)
    }

    /// A host shares one scratch allowance and resident counter across worlds,
    /// while every world has its own serialized candidate pin ledger.
    pub(crate) fn for_world(&self) -> Self {
        Self {
            inner: Arc::clone(&self.inner),
            world: Arc::default(),
        }
    }

    pub(crate) fn begin_candidate_memory(
        &self,
    ) -> Result<super::world_memory::CandidateMemory, CapacityError> {
        self.world.begin(self)
    }

    pub(crate) fn retain_record(
        &self,
        record: &super::resident::ResidentReservation,
    ) -> Result<(), CapacityError> {
        self.world.retain(record, self)
    }

    pub(crate) fn reserve_record(
        &self,
        bytes: usize,
    ) -> Result<super::resident::ResidentReservation, CapacityError> {
        let storage = self.resident().reserve(bytes)?;
        self.retain_record(&storage)?;
        Ok(storage)
    }

    /// An actual producer already admitted construction storage. Move that
    /// admission into the candidate's shared pin instead of charging its body
    /// again. Outside a candidate the consuming installer still holds its
    /// independent decode workspace while canonical custody becomes resident.
    pub(crate) fn adopt_record(
        &self,
        storage: ByteReservation,
    ) -> Result<super::resident::ResidentReservation, CapacityError> {
        if !self.owns(&storage) {
            return Err(CapacityError);
        }
        let resident = self.resident().reserve(storage.bytes())?;
        self.world.adopt(&resident, storage, self)?;
        Ok(resident)
    }

    pub(crate) fn reserve_backing(
        &self,
        bytes: usize,
    ) -> Result<super::resident::ResidentReservation, CapacityError> {
        self.reserve_record(bytes)?.into_backing()
    }

    pub(crate) fn adopt_backing(
        &self,
        storage: ByteReservation,
    ) -> Result<super::resident::ResidentReservation, CapacityError> {
        self.adopt_record(storage)?.into_backing()
    }

    /// Transfer the semantic owner's already admitted new allocation into its
    /// persistent backing custody before a journal can release its workspace.
    pub(crate) fn fund_backing(
        &self,
        backing: &mut super::resident::ResidentReservation,
        storage: ByteReservation,
    ) -> Result<(), CapacityError> {
        backing.merge(self.adopt_backing(storage)?)
    }

    /// Rollback restores an already allocated, still-funded before-image.
    /// Moving it back to canonical custody creates no new candidate workspace.
    pub(crate) fn restore_backing(
        &self,
        backing: &mut super::resident::ResidentReservation,
        storage: ByteReservation,
    ) -> Result<(), CapacityError> {
        if !self.owns(&storage) {
            return Err(CapacityError);
        }
        let restored = self.resident().reserve(storage.bytes())?;
        backing.merge(restored)?;
        drop(storage);
        Ok(())
    }

    /// A mutable map/vector never lends its backing buffer to a capture. Fund
    /// the replacement allocation before its allocator runs, while canonical
    /// custody follows only the surviving backing's accounted capacity.
    pub(crate) fn resize_backing(
        &self,
        backing: &mut super::resident::ResidentReservation,
        bytes: usize,
    ) -> Result<(), CapacityError> {
        if bytes > backing.bytes() {
            self.world.retain_workspace(self, bytes)?;
        }
        backing.resize(bytes)
    }
}

impl ByteReservation {
    pub fn bytes(&self) -> usize {
        self.bytes
    }

    /// Detach custody of an already funded output while the producer keeps
    /// its own scratch. No allocation or gap in host accounting is required.
    pub fn split_off(&mut self, bytes: usize) -> Result<ByteReservation, CapacityError> {
        let remaining = self.bytes.checked_sub(bytes).ok_or(CapacityError)?;
        let pending_save = self
            .pending_save
            .as_mut()
            .map(|storage| storage.split_off(bytes))
            .transpose()?;
        self.bytes = remaining;
        Ok(ByteReservation {
            owner: Arc::clone(&self.owner),
            bytes,
            pending_save,
        })
    }

    pub(crate) fn shares_owner(&self, other: &Self) -> bool {
        Arc::ptr_eq(&self.owner, &other.owner)
    }

    /// Transfer already admitted storage without opening an unfunded interval.
    /// Both guards must belong to the same host allowance; the global count
    /// stays unchanged while the transferred guard is disarmed.
    pub fn merge(&mut self, mut other: ByteReservation) -> Result<(), CapacityError> {
        if !Arc::ptr_eq(&self.owner, &other.owner) {
            return Err(CapacityError);
        }
        let bytes = self.bytes.checked_add(other.bytes).ok_or(CapacityError)?;
        match (&mut self.pending_save, other.pending_save.take()) {
            (Some(into), Some(from)) => into.merge(from)?,
            (None, None) => {}
            _ => return Err(CapacityError),
        }
        self.bytes = bytes;
        other.bytes = 0;
        Ok(())
    }

    /// Reserve growth before allocation; shrink only after the owner has freed
    /// the corresponding storage, including its allocation capacity.
    pub fn resize(&mut self, bytes: usize) -> Result<(), CapacityError> {
        if bytes > self.bytes {
            let additional = bytes - self.bytes;
            let previous = self
                .owner
                .used
                .try_update(Ordering::AcqRel, Ordering::Acquire, |used| {
                    used.checked_add(additional)
                        .filter(|total| *total <= self.owner.limit)
                })
                .map_err(|_| CapacityError)?;
            if let Some(pending) = &mut self.pending_save
                && let Err(error) = pending.resize(bytes)
            {
                self.owner.used.fetch_sub(additional, Ordering::AcqRel);
                return Err(error);
            }
            self.owner
                .peak
                .fetch_max(previous + additional, Ordering::Relaxed);
        } else {
            if let Some(pending) = &mut self.pending_save {
                pending.resize(bytes)?;
            }
            self.owner
                .used
                .fetch_sub(self.bytes - bytes, Ordering::AcqRel);
        }
        self.bytes = bytes;
        Ok(())
    }
}

impl Drop for ByteReservation {
    fn drop(&mut self) {
        self.owner.used.fetch_sub(self.bytes, Ordering::AcqRel);
    }
}
