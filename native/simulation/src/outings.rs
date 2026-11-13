//! Canonical consent records have one custody, order and undo owner. This
//! foundation does not install live outings or execute social commands yet.
use crate::execution::ExecutionError;
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation, ResidentReservation};
use crate::records::SqlCell;
use indexmap::IndexMap;
use serde::{Serialize, Serializer};
use std::mem::size_of;

mod types;
use crate::worlds::{InstalledOutingKind as OutingKind, InstalledOutingStatus as OutingStatus};
pub(crate) use types::OutingRecord;
mod index;
use index::OutingIndex;
mod install;
mod journal;
pub(crate) use journal::{OutingCheckpoint, OutingJournal};
mod save;

pub(crate) struct OutingState {
    records: Option<IndexMap<String, OutingRecord>>,
    index: OutingIndex,
    backing: ResidentReservation,
    key_bytes: usize,
}
impl OutingState {
    pub(crate) fn is_present(&self) -> bool {
        self.records.is_some()
    }
    pub(crate) fn get(&self, id: &str) -> Option<&OutingRecord> {
        self.records.as_ref()?.get(id)
    }
    /// The executable family remains closed. An empty/absent canonical owner
    /// is not evidence that consent, activities or private readers are ported.
    pub(crate) fn require_closed(&self) -> Result<(), ExecutionError> {
        if self.records.as_ref().is_some_and(|rows| !rows.is_empty()) {
            return Err(ExecutionError::UnsupportedFamily);
        }
        Ok(())
    }
}
