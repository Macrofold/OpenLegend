//! Shared record custody follows the same Arc as reads and phase deduplication.
//! The allowance is conservative escrow; encoding bytes remain gameplay charges.
use super::*;
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage, tree_node_bound};
use std::mem::{align_of, size_of};

pub(super) fn record_bytes(record: &ReceivedValueRecord) -> Option<usize> {
    body_parts_bytes(record.id.capacity(), record.heap_bytes()?)
}
pub(super) fn body_parts_bytes(id_capacity: usize, body: usize) -> Option<usize> {
    heap_sum([
        size_of::<ReceivedValueRecord>()
            + 2 * size_of::<usize>()
            + align_of::<ReceivedValueRecord>()
            - 1,
        body,
        // Source map and source-insert inverse IDs; the body is still owned
        // until its source insertion inverse (if any) has released that key.
        id_capacity.checked_mul(2)?,
    ])
}
pub(super) fn encoding_bytes(encoded: usize, id_capacity: usize) -> Option<usize> {
    heap_sum([
        encoded.checked_add(2 * size_of::<usize>())?,
        size_of::<EncodingStorage>() + 2 * size_of::<usize>() + align_of::<EncodingStorage>() - 1,
        id_capacity,
        tree_node_bound::<ValueEncoding, String>()?,
    ])
}
pub(super) fn backing(sources: usize, undo: usize) -> Option<usize> {
    heap_sum([
        map_storage::<String, SharedReceivedValue>(sources)?,
        undo.checked_mul(size_of::<ReceivedValuesUndo>())?,
    ])
}

// json_record writes into a pinned Rust Vec<u8>: geometric growth is bounded
// by twice the final length, with its eight-byte minimum nonzero allocation.
pub(super) fn encoding_scratch(bytes: usize) -> Option<usize> {
    Some(bytes.checked_mul(2)?.max(8))
}

/// Projection replaces only resident placement. SQL and held read Arcs retain
/// their independent custody; eviction is never a shared-value row deletion.
pub(crate) enum PreparedValueResidency {
    Unchanged,
    Replace {
        sources: IndexMap<String, SharedReceivedValue>,
        backing: crate::host::ResidentReservation,
        scratch: ByteReservation,
    },
}
impl ReceivedValues {
    pub(crate) fn prepare_residency(
        &self,
        references: &std::collections::BTreeSet<String>,
        budget: &ByteBudget,
    ) -> Result<PreparedValueResidency, ReceivedError> {
        let error = || {
            ReceivedError(
                "Received residency requires its complete current reference closure and allowance.",
            )
        };
        if !self.undo.is_empty() {
            return Err(error());
        }
        if references.iter().any(|id| !self.sources.contains_key(id)) {
            return Err(error());
        }
        if references.len() == self.sources.len() {
            return Ok(PreparedValueResidency::Unchanged);
        }
        let keys = references
            .iter()
            .try_fold(0usize, |n, key| n.checked_add(key.len()))
            .ok_or_else(error)?;
        let map_bound = super::residency::backing(references.len().checked_mul(2).and_then(|n|n.checked_add(1)).ok_or_else(error)?,0).ok_or_else(error)?;
        // ACK preparation owns a new map before its infallible installation.
        // Retain its actual workspace as well as future resident custody.
        let scratch = budget.reserve(keys.checked_add(map_bound).ok_or_else(error)?).map_err(|_| error())?;
        let mut backing = budget
            .reserve_backing(
                super::residency::backing(
                    references
                        .len()
                        .checked_mul(2)
                        .and_then(|n| n.checked_add(1))
                        .ok_or_else(error)?,
                    0,
                )
                .ok_or_else(error)?,
            )
            .map_err(|_| error())?;
        if !backing.shares_owner(&self.backing) {
            return Err(error());
        }
        let mut sources = IndexMap::new();
        sources.try_reserve(references.len()).map_err(|_| error())?;
        // Preserve Source Object.entries order; references do not dictate order.
        for (id, value) in &self.sources {
            if references.contains(id) {
                sources.insert(id.clone(), value.clone());
            }
        }
        backing
            .resize(
                super::residency::backing(sources.capacity(), 0)
                    .ok_or_else(error)?,
            )
            .map_err(|_| error())?;
        Ok(PreparedValueResidency::Replace {
            sources,
            backing,
            scratch,
        })
    }
    pub(crate) fn apply_residency(&mut self, prepared: PreparedValueResidency) {
        // Source's projected world has a fresh derived phase cache. No saved
        // order/ID is issued here, and no live candidate may borrow this scope.
        self.phase_values.clear();
        self.phase_at = None;
        if let PreparedValueResidency::Replace {
            sources,
            backing,
            scratch,
        } = prepared
        {
            let old = std::mem::replace(&mut self.sources, sources);
            let old_backing = std::mem::replace(&mut self.backing, backing);
            drop(old);
            drop(old_backing);
            drop(scratch);
        }
    }
}
