//! Canonical consent records have one custody, order and undo owner. This
//! Ordinary paired travel is installed through the selected finite host.
use crate::execution::ExecutionError;
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation, ResidentReservation};
use crate::records::SqlCell;
use indexmap::IndexMap;
use serde::{Serialize, Serializer};
use std::mem::size_of;

mod types;
pub(crate) use crate::worlds::{InstalledOutingKind as OutingKind, InstalledOutingStatus as OutingStatus};
pub(crate) use types::OutingRecord;
mod index;
use index::OutingIndex;
mod install;
pub(crate) use install::verify_travel_host;
mod journal;
pub(crate) use journal::{OutingCheckpoint, OutingJournal};
mod mutation;
mod save;
pub(crate) mod travel;
pub(crate) mod view;
pub(crate) mod settle;
pub(crate) mod reception;

pub(crate) struct OutingState {
    records: Option<IndexMap<String, OutingRecord>>,
    index: OutingIndex,
    backing: ResidentReservation,
    key_bytes: usize,
}
impl OutingState {
    pub(crate) fn has_rows(&self) -> bool {
        self.records.as_ref().is_some_and(|rows| !rows.is_empty())
    }
    pub(crate) fn is_present(&self) -> bool {
        self.records.is_some()
    }
    pub(crate) fn get(&self, id: &str) -> Option<&OutingRecord> {
        self.records.as_ref()?.get(id)
    }
}
