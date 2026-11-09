//! One canonical logical batch can be held by pending append and saved packing
//! owners. Its allowance follows that same immutable body, never either list.
use super::{ReceivedBatch, ReceivedError};
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation, ResidentReservation};
use serde::{Serialize, Serializer};
use std::{
    mem::{align_of, size_of},
    ops::Deref,
    sync::Arc,
};

#[derive(Debug)]
pub struct TemporalBatch {
    value: ReceivedBatch,
    _storage: ResidentReservation,
}
impl Deref for TemporalBatch {
    type Target = ReceivedBatch;
    fn deref(&self) -> &Self::Target {
        &self.value
    }
}
impl Serialize for TemporalBatch {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        self.value.serialize(serializer)
    }
}
impl PartialEq for TemporalBatch {
    fn eq(&self, other: &Self) -> bool {
        self.value == other.value
    }
}
impl TemporalBatch {
    pub(crate) fn retain_for_candidate(&self, budget: &ByteBudget) -> Result<(), ReceivedError> {
        budget.retain_record(&self._storage).map_err(|_| ReceivedError("Temporal before-image exceeds native allowance."))
    }
    pub fn value(&self) -> &ReceivedBatch {
        &self.value
    }
    pub(super) fn body_bytes(value: &ReceivedBatch) -> Result<usize, ReceivedError> {
        heap_sum([
            size_of::<Self>(),
            2 * size_of::<usize>() + align_of::<Self>() - 1,
            value
                .heap_bytes()
                .ok_or(ReceivedError("Temporal batch allocation overflow."))?,
        ])
        .ok_or(ReceivedError("Temporal batch allocation overflow."))
    }
    pub(super) fn from_owned(
        value: ReceivedBatch,
        budget: &ByteBudget,
    ) -> Result<Arc<Self>, ReceivedError> {
        let storage = budget
            .reserve_record(Self::body_bytes(&value)?)
            .map_err(|_| ReceivedError("Temporal batch exceeds native allowance."))?;
        Ok(Arc::new(Self {
            value,
            _storage: storage,
        }))
    }
    pub(super) fn from_builder(
        value: ReceivedBatch,
        backing: &mut ByteReservation,
        budget: &ByteBudget,
    ) -> Result<Arc<Self>, ReceivedError> {
        let storage = backing
            .split_off(Self::body_bytes(&value)?)
            .map_err(|_| ReceivedError("Temporal batch exceeds admitted builder allowance."))?;
        Ok(Arc::new(Self {
            value,
            _storage: budget
                .adopt_record(storage)
                .map_err(|_| ReceivedError("Temporal batch exceeds native allowance."))?,
        }))
    }

    pub(crate) fn capture_pin(
        &self,
        budget: &ByteBudget,
    ) -> Result<Arc<crate::host::SharedMemoryPin>, ReceivedError> {
        self._storage
            .capture_pin(budget)
            .map_err(|_| ReceivedError("Temporal capture exceeds native allowance."))
    }
}
