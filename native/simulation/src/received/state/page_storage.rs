//! The page index owns node backing separately from shared immutable page
//! bodies. Sparse removal funds its inverse nodes before they can be freed.
use super::*;
use crate::host::retained_size::tree_node_bound;
pub(super) fn page_map_bytes(entries: usize) -> Result<usize, ReceivedError> {
    entries
        .checked_add(1)
        .and_then(|n| n.checked_mul(tree_node_bound::<u64, Arc<TemporalPageRecord>>()?))
        .ok_or(ReceivedError("Temporal page-index allocation overflow."))
}
pub(super) fn fresh_page_map_bytes(entries: usize) -> Result<usize, ReceivedError> {
    if entries == 0 {
        Ok(0)
    } else {
        page_map_bytes(entries)
    }
}
pub(super) fn restored_page_bytes(entries: usize) -> Result<usize, ReceivedError> {
    entries
        .checked_mul(
            tree_node_bound::<u64, Arc<TemporalPageRecord>>().ok_or(ReceivedError(
                "Temporal inverse page-index allocation overflow.",
            ))?,
        )
        .ok_or(ReceivedError(
            "Temporal inverse page-index allocation overflow.",
        ))
}
impl TemporalActorHistory {
    pub(super) fn reserve_page_entries(
        &mut self,
        entries: usize,
        budget: &crate::host::ByteBudget,
    ) -> Result<(), ReceivedError> {
        let bytes = fresh_page_map_bytes(entries)?;
        if bytes > self.page_storage.bytes() {
            budget
                .resize_backing(&mut self.page_storage, bytes)
                .map_err(|_| ReceivedError("Temporal page-index exceeds native allowance."))?;
        }
        Ok(())
    }
    pub(super) fn settle_page_entries(&mut self) -> Result<(), ReceivedError> {
        // Removing the last key may keep one allocated root. A fresh empty map
        // has no allocation, which its zero-sized guard already distinguishes.
        let bytes = if self.pages.is_empty() {
            self.page_storage.bytes().min(page_map_bytes(0)?)
        } else {
            page_map_bytes(self.pages.len())?
        };
        if bytes > self.page_storage.bytes() {
            return Err(ReceivedError(
                "Temporal page-index grew without prior admission.",
            ));
        }
        self.page_storage
            .resize(bytes)
            .map_err(|_| ReceivedError("Temporal page-index custody is unavailable."))
    }
}
