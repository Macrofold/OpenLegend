//! Recent eligibility has no receipt bodies. Each actual short block keeps its
//! allocation custody through correction undo. The block also funds an upper
//! bound for its membership-index keys/nodes; shared memberships need no second
//! counter or full-directory scan on every append.

use super::{ReceivedChargeDirectory, ReceivedChargeEntry, ReceivedError};
use crate::host::retained_size::{HeapBytes, heap_sum, tree_node_bound};
use crate::host::{ByteBudget, ByteReservation, ResidentReservation};
use std::{mem::size_of, ops::Deref};

#[derive(Debug)]
pub(super) struct RecentDirectoryBlock {
    pub(super) directory: ReceivedChargeDirectory,
    pub(super) storage: ResidentReservation,
}
impl Deref for RecentDirectoryBlock {
    type Target = ReceivedChargeDirectory;
    fn deref(&self) -> &Self::Target {
        &self.directory
    }
}

fn capacity() -> ReceivedError {
    ReceivedError("Recent directory allocation overflow.")
}

fn key_bound(directory: &ReceivedChargeDirectory) -> Result<usize, ReceivedError> {
    // Two safe-integer decimal fields, punctuation, and the actual encoded
    // epoch. The extra factor covers format!'s growth while writing the key.
    crate::encoding::json_record_len(&directory.epoch)
        .ok()
        .and_then(|n| n.checked_add(64))
        .and_then(|n| n.checked_mul(2))
        .ok_or_else(capacity)
}
fn block_bound(
    directory: &ReceivedChargeDirectory,
    header: &ReceivedChargeEntry,
) -> Result<usize, ReceivedError> {
    let memberships = header
        .individual_ids
        .iter()
        .try_fold(0_usize, |sum, id| {
            sum.checked_add(tree_node_bound::<String, u64>()?)?
                .checked_add(id.len())
        })
        .ok_or_else(capacity)?;
    heap_sum([
        tree_node_bound::<String, RecentDirectoryBlock>().ok_or_else(capacity)?,
        key_bound(directory)?,
        directory.actor_id.len(),
        directory.epoch.len(),
        size_of::<ReceivedChargeEntry>(),
        header.heap_bytes().ok_or_else(capacity)?,
        memberships,
    ])
    .ok_or_else(capacity)
}
pub(super) fn append_workspace(
    directory: &ReceivedChargeDirectory,
) -> Result<usize, ReceivedError> {
    let key = key_bound(directory)?;
    directory.entries.iter().try_fold(
        directory
            .entries
            .len()
            .checked_mul(size_of::<RecentDirectoryBlock>())
            .ok_or_else(capacity)?,
        |sum, header| {
            let staging = header
                .individual_ids
                .len()
                .checked_mul(tree_node_bound::<&str, u64>().ok_or_else(capacity)?)
                .ok_or_else(capacity)?;
            heap_sum([
                sum,
                block_bound(directory, header)?,
                staging,
                tree_node_bound::<String, ()>().ok_or_else(capacity)?,
                key.checked_mul(3).ok_or_else(capacity)?,
            ])
            .ok_or_else(capacity)
        },
    )
}
impl RecentDirectoryBlock {
    pub(super) fn prepare(
        directory: &ReceivedChargeDirectory,
        header: &ReceivedChargeEntry,
        workspace: &mut ByteReservation,
        budget: &ByteBudget,
    ) -> Result<Self, ReceivedError> {
        let storage = workspace
            .split_off(block_bound(directory, header)?)
            .and_then(|storage| budget.adopt_record(storage))
            .map_err(|_| ReceivedError("Recent directory exceeds native allowance."))?;
        Ok(Self {
            directory: ReceivedChargeDirectory {
                actor_id: directory.actor_id.clone(),
                physical_life: directory.physical_life,
                epoch: directory.epoch.clone(),
                entries: vec![header.clone()],
            },
            storage,
        })
    }
}
