//! Canonical personal bodies keep their own allowance through held captures,
//! replacement, eviction and rollback. No journal destruction releases them.
use super::*;
use crate::host::retained_size::{HeapBytes, heap_sum, tree_node_bound};
use std::mem::{align_of, size_of};

pub(super) fn record_parts_bytes(
    row: &InstalledRow,
    header: &PersonalSourceHeader,
) -> Option<usize> {
    let cells = row.extra.iter().try_fold(
        row.extra
            .len()
            .checked_mul(size_of::<crate::records::SqlCell>())?,
        |bytes, cell| bytes.checked_add(cell.heap_bytes()?),
    )?;
    // A B-tree has at most one node per live entry. This conservative allowance
    // follows the record while a removed body is retained by rollback/capture,
    // so restoring its two real indexes never needs post-refusal admission.
    // It is allocation escrow, not a resident-memory measurement.
    let indices = heap_sum([
        tree_node_bound::<u64, Arc<PersonalSourceRecord>>()?,
        tree_node_bound::<String, u64>()?,
        header.reference.id.len(),
        if header.completion_event_type.is_some() {
            tree_node_bound::<String, u64>()?
                .checked_add(header.completion_event_type.as_ref()?.len())?
        } else {
            0
        },
    ])?;
    heap_sum([
        size_of::<PersonalSourceRecord>(),
        2 * size_of::<usize>() + align_of::<PersonalSourceRecord>() - 1,
        row.id.capacity(),
        row.parent.capacity(),
        row.slot.capacity(),
        row.payload.len(),
        2 * size_of::<usize>(),
        cells,
        2 * size_of::<usize>(),
        header.heap_bytes()?,
        indices,
    ])
}

/// Only owner directories and privacy metadata live here. Immutable source
/// bodies/index escrow and known-place products keep their own custody.
#[derive(Clone, Copy)]
pub(super) struct MetadataBefore {
    backing: usize,
}
fn root_backing(state: &ExperienceState) -> Option<usize> {
    use crate::host::retained_size::map_storage;
    let owners = state.owner_maps.values().try_fold(0usize, |sum, owner| {
        sum.checked_add(map_storage::<String, u64>(owner.placements.capacity())?)
    })?;
    heap_sum([
        map_storage::<String, PersonalHistory>(state.actors.capacity())?,
        map_storage::<PersonalSourceKind, PersonalOwnerMap>(state.owner_maps.capacity())?,
        map_storage::<String, super::places::KnownPlacePreparation>(state.known_places.capacity())?,
        owners,
    ])
}
fn actor_backing(actor: Option<&PersonalHistory>) -> Option<usize> {
    use crate::host::retained_size::map_storage;
    let Some(actor) = actor else { return Some(0) };
    heap_sum([
        map_storage::<PersonalSourceKind, PersonalSourceCollection>(actor.sources.capacity())?,
        actor
            .privacy
            .forgotten
            .capacity()
            .checked_mul(size_of::<String>())?,
        tree_node_bound::<String, ()>()?.checked_mul(actor.privacy.forgotten_index.len())?,
        map_storage::<String, String>(actor.privacy.corrections.capacity())?,
    ])
}
impl MetadataBefore {
    pub(super) fn capture(state: &ExperienceState, actor: &str) -> Result<Self, ExperienceError> {
        Ok(Self {
            backing: root_backing(state)
                .and_then(|n| n.checked_add(actor_backing(state.actors.get(actor))?))
                .ok_or(ExperienceError::Capacity)?,
        })
    }
}
fn string_sum<'a>(mut values: impl Iterator<Item = &'a String>) -> Option<usize> {
    values.try_fold(0usize, |n, s| n.checked_add(s.capacity()))
}
fn difference(total: usize, before: usize, after: usize) -> Result<usize, ExperienceError> {
    total
        .checked_sub(before)
        .and_then(|n| n.checked_add(after))
        .ok_or(ExperienceError::Capacity)
}
impl ExperienceState {
    pub(super) fn install_metadata(&mut self) -> Result<(), ExperienceError> {
        let mut data = self.generation.capacity();
        let mut backing = root_backing(self).ok_or(ExperienceError::Capacity)?;
        for (id, actor) in &self.actors {
            data = data
                .checked_add(id.capacity())
                .and_then(|n| {
                    n.checked_add(string_sum(actor.sources.values().map(|c| &c.actor_id))?)
                })
                .and_then(|n| n.checked_add(string_sum(actor.privacy.forgotten.iter())?))
                .and_then(|n| n.checked_add(string_sum(actor.privacy.forgotten_index.iter())?))
                .and_then(|n| {
                    n.checked_add(string_sum(
                        actor.privacy.corrections.iter().flat_map(|(k, v)| [k, v]),
                    )?)
                })
                .ok_or(ExperienceError::Capacity)?;
            backing = backing
                .checked_add(actor_backing(Some(actor)).ok_or(ExperienceError::Capacity)?)
                .ok_or(ExperienceError::Capacity)?;
        }
        for owner in self.owner_maps.values() {
            data = data
                .checked_add(owner.coverage.table.capacity())
                .and_then(|n| n.checked_add(owner.coverage.owner.capacity()))
                .and_then(|n| n.checked_add(string_sum(owner.placements.keys())?))
                .ok_or(ExperienceError::Capacity)?;
        }
        data = data
            .checked_add(string_sum(self.known_places.keys()).ok_or(ExperienceError::Capacity)?)
            .ok_or(ExperienceError::Capacity)?;
        self.metadata_data = data;
        self.metadata_backing = backing;
        self.metadata_storage
            .resize(data.checked_add(backing).ok_or(ExperienceError::Capacity)?)
            .map_err(|_| ExperienceError::Capacity)
    }
    /// Move custody already admitted by the actual semantic producer. The
    /// owner publishes no byte change and performs no allocation in this move.
    pub(super) fn fund_metadata(
        &mut self,
        from: &mut crate::host::ByteReservation,
        bytes: usize,
    ) -> Result<(), ExperienceError> {
        self.metadata_storage
            .merge(
                from.split_off(bytes)
                    .map_err(|_| ExperienceError::Capacity)?,
            )
            .map_err(|_| ExperienceError::Capacity)
    }
    pub(super) fn settle_metadata(
        &mut self,
        before: MetadataBefore,
        actor: &str,
        old_strings: usize,
        new_strings: usize,
        from: &mut crate::host::ByteReservation,
    ) -> Result<(), ExperienceError> {
        let after = MetadataBefore::capture(self, actor)?;
        let data = difference(self.metadata_data, old_strings, new_strings)?;
        let backing = difference(self.metadata_backing, before.backing, after.backing)?;
        let bytes = data.checked_add(backing).ok_or(ExperienceError::Capacity)?;
        if bytes > self.metadata_storage.bytes() {
            self.fund_metadata(from, bytes - self.metadata_storage.bytes())?;
        }
        self.metadata_storage
            .resize(bytes)
            .map_err(|_| ExperienceError::Capacity)?;
        self.metadata_data = data;
        self.metadata_backing = backing;
        Ok(())
    }
}
