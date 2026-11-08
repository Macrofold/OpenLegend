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
}

struct ByteBudgetState {
    limit: usize,
    used: AtomicUsize,
    peak: AtomicUsize,
}

pub struct ByteReservation {
    owner: Arc<ByteBudgetState>,
    bytes: usize,
}

impl ByteBudget {
    pub fn new(limit: usize) -> Self {
        Self {
            inner: Arc::new(ByteBudgetState {
                limit,
                used: AtomicUsize::new(0),
                peak: AtomicUsize::new(0),
            }),
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
        self.inner
            .peak
            .fetch_max(previous + bytes, Ordering::Relaxed);
        Ok(ByteReservation {
            owner: Arc::clone(&self.inner),
            bytes,
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
}

impl ByteReservation {
    pub fn bytes(&self) -> usize {
        self.bytes
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
            self.owner
                .peak
                .fetch_max(previous + additional, Ordering::Relaxed);
        } else {
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
