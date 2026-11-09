//! Page-owned encoding/projections remain funded through old read/save/edit
//! holders. Logical batch bodies carry independent shared custody.
use super::*;
use crate::host::retained_size::{HeapBytes, heap_sum, tree_node_bound};
use crate::host::{ByteBudget, ByteReservation};
use std::mem::{align_of, size_of};
impl TemporalPageRecord {
    pub(super) fn fund(mut self, budget: &ByteBudget) -> Result<Self, ReceivedError> {
        let columns = self
            .columns
            .iter()
            .try_fold(
                self.columns
                    .len()
                    .checked_mul(size_of::<crate::records::SqlCell>())
                    .ok_or(ReceivedError("Temporal page allocation overflow."))?,
                |n, c| n.checked_add(c.heap_bytes()?),
            )
            .ok_or(ReceivedError("Temporal page allocation overflow."))?;
        let bytes = heap_sum([
            size_of::<Self>(),
            2 * size_of::<usize>() + align_of::<Self>() - 1,
            self.id.capacity(),
            self.row_id.capacity(),
            self.parent.capacity(),
            self.slot.capacity(),
            self.actor_id.capacity(),
            self.epoch.capacity(),
            self.payload.len(),
            2 * size_of::<usize>(),
            columns,
            2 * size_of::<usize>(),
            self.batches
                .capacity()
                .checked_mul(size_of::<Arc<super::super::TemporalBatch>>())
                .ok_or(ReceivedError("Temporal page allocation overflow."))?,
            if self.edit_identity().is_some() {
                2 * size_of::<usize>()
            } else {
                0
            },
            self.metadata
                .heap_bytes()
                .ok_or(ReceivedError("Temporal page allocation overflow."))?,
            // A conservative node escrow permits restoring the same physical
            // placement while a replaced/evicted page is still held elsewhere.
            tree_node_bound::<u64, Arc<Self>>()
                .ok_or(ReceivedError("Temporal page allocation overflow."))?,
        ])
        .ok_or(ReceivedError("Temporal page allocation overflow."))?;
        self.storage = Some(
            budget
                .reserve(bytes)
                .map_err(|_| ReceivedError("Temporal page exceeds native allowance."))?,
        );
        Ok(self)
    }
}
