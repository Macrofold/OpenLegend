//! Body and sparse-directory custody is independent of the action undo journal.
use super::*;
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage, tree_node_bound};
use crate::host::{ByteBudget, ByteReservation};
use std::{collections::BTreeMap, mem::size_of};

pub(super) fn record_bytes(value: &ActivityOccurrence, slot: &String) -> Option<usize> {
    heap_sum([
        value.live_heap_bytes()?,
        slot.capacity(),
        // Per-record B-tree escrow also funds reverse action-index placement.
        tree_node_bound::<u64, String>()?.checked_mul(2)?,
        tree_node_bound::<String, BTreeMap<u64, String>>()?,
        value.id.len().checked_mul(3)?,
        value.action_id.len(),
    ])
}
#[derive(Clone, Copy)]
pub(super) struct MetadataBefore {
    backing: usize,
    strings: usize,
}
fn backing(state: &ActivityState) -> Option<usize> {
    heap_sum([
        map_storage::<String, ActivityCollection>(state.collections.capacity())?,
        map_storage::<String, LearningCursor>(state.learning.capacity())?,
        map_storage::<String, String>(state.current.capacity())?,
        map_storage::<String, ActivityReference>(state.active.capacity())?,
        map_storage::<String, Vec<ActivityItemSource>>(state.items.capacity())?,
        map_storage::<String, Vec<ActivityReference>>(state.changes.capacity())?,
    ])
}
fn entry<K: HeapBytes, V: HeapBytes>(value: Option<(&K, &V)>) -> Option<usize> {
    value.map_or(Some(0), |(k, v)| {
        heap_sum([k.heap_bytes()?, v.heap_bytes()?])
    })
}
fn strings(state: &ActivityState, actor: Option<&str>, actions: &[&str]) -> Option<usize> {
    let mut bytes = 0usize;
    if let Some(actor) = actor {
        bytes = heap_sum([
            entry(state.current.get_key_value(actor))?,
            entry(state.learning.get_key_value(actor))?,
            state
                .collections
                .get_key_value(actor)
                .map_or(Some(0), |(k, _)| Some(k.capacity()))?,
        ])?;
    }
    for (at, key) in actions.iter().enumerate() {
        if !actions[..at].contains(key) {
            bytes = bytes.checked_add(entry(state.active.get_key_value(*key))?)?;
        }
    }
    Some(bytes)
}
impl MetadataBefore {
    pub(super) fn capture(
        state: &ActivityState,
        actor: Option<&str>,
        actions: &[&str],
    ) -> Result<Self, ActivityError> {
        Ok(Self {
            backing: backing(state).ok_or(ActivityError::Capacity)?,
            strings: strings(state, actor, actions).ok_or(ActivityError::Capacity)?,
        })
    }
}
impl ActivityState {
    pub(super) fn install_metadata(&mut self) -> Result<(), ActivityError> {
        let mut bytes = heap_sum([
            backing(self).ok_or(ActivityError::Capacity)?,
            self.learning
                .heap_bytes()
                .ok_or(ActivityError::Capacity)?
                .checked_sub(
                    map_storage::<String, LearningCursor>(self.learning.capacity())
                        .ok_or(ActivityError::Capacity)?,
                )
                .ok_or(ActivityError::Capacity)?,
            self.current
                .heap_bytes()
                .ok_or(ActivityError::Capacity)?
                .checked_sub(
                    map_storage::<String, String>(self.current.capacity())
                        .ok_or(ActivityError::Capacity)?,
                )
                .ok_or(ActivityError::Capacity)?,
            self.active
                .heap_bytes()
                .ok_or(ActivityError::Capacity)?
                .checked_sub(
                    map_storage::<String, ActivityReference>(self.active.capacity())
                        .ok_or(ActivityError::Capacity)?,
                )
                .ok_or(ActivityError::Capacity)?,
            self.changes
                .heap_bytes()
                .ok_or(ActivityError::Capacity)?
                .checked_sub(
                    map_storage::<String, Vec<ActivityReference>>(self.changes.capacity())
                        .ok_or(ActivityError::Capacity)?,
                )
                .ok_or(ActivityError::Capacity)?,
        ])
        .ok_or(ActivityError::Capacity)?;
        for key in self.collections.keys() {
            bytes = heap_sum([bytes, key.capacity()]).ok_or(ActivityError::Capacity)?;
        }
        for (key, values) in &self.items {
            bytes = heap_sum([
                bytes,
                key.capacity(),
                values
                    .capacity()
                    .checked_mul(size_of::<ActivityItemSource>())
                    .ok_or(ActivityError::Capacity)?,
            ])
            .ok_or(ActivityError::Capacity)?;
            for value in values {
                bytes = heap_sum([
                    bytes,
                    value.actor_id.capacity(),
                    value.occurrence_id.capacity(),
                    value.port.capacity(),
                ])
                .ok_or(ActivityError::Capacity)?;
            }
        }
        self.metadata_bytes = bytes;
        self.metadata_storage
            .resize(bytes)
            .map_err(|_| ActivityError::Capacity)
    }
    pub(super) fn fund_metadata(
        &mut self,
        from: &mut ByteReservation,
        bytes: usize,
    ) -> Result<(), ActivityError> {
        self.budget.fund_backing(&mut self.metadata_storage, from.split_off(bytes).map_err(|_| ActivityError::Capacity)?)
            .map_err(|_| ActivityError::Capacity)
    }
    pub(super) fn settle_metadata(
        &mut self,
        before: MetadataBefore,
        actor: Option<&str>,
        actions: &[&str],
        from: &mut ByteReservation,
    ) -> Result<(), ActivityError> {
        let after = MetadataBefore::capture(self, actor, actions)?;
        let bytes = self
            .metadata_bytes
            .checked_sub(before.backing)
            .and_then(|n| n.checked_sub(before.strings))
            .and_then(|n| n.checked_add(after.backing))
            .and_then(|n| n.checked_add(after.strings))
            .ok_or(ActivityError::Capacity)?;
        if bytes > self.metadata_storage.bytes() {
            self.fund_metadata(from, bytes - self.metadata_storage.bytes())?;
        }
        self.metadata_storage
            .resize(bytes)
            .map_err(|_| ActivityError::Capacity)?;
        self.metadata_bytes = bytes;
        Ok(())
    }
}
impl ActivityRecord {
    pub(super) fn installed(
        occurrence: ActivityOccurrence,
        position: u64,
        slot: String,
        budget: &ByteBudget,
    ) -> Result<Self, ActivityError> {
        let storage = budget
            .reserve_backing(record_bytes(&occurrence, &slot).ok_or(ActivityError::Capacity)?)
            .map_err(|_| ActivityError::Capacity)?;
        Ok(Self {
            occurrence,
            position,
            slot,
            storage,
        })
    }
}
impl ActivityJournal {
    pub(super) fn settle_record(
        &mut self,
        state: &mut ActivityState,
        actor: &str,
        id: &str,
    ) -> Result<(), ActivityError> {
        let record = state
            .collections
            .get_mut(actor)
            .and_then(|o| o.records.get_mut(id))
            .ok_or(ActivityError::InvalidStructure)?;
        let bytes =
            record_bytes(&record.occurrence, &record.slot).ok_or(ActivityError::Capacity)?;
        if bytes > record.storage.bytes() {
            let growth = bytes - record.storage.bytes();
            state.budget.fund_backing(&mut record.storage,
                    self.reservation
                        .split_off(growth)
                        .map_err(|_| ActivityError::Capacity)?,
                )
                .map_err(|_| ActivityError::Capacity)?;
        }
        record
            .storage
            .resize(bytes)
            .map_err(|_| ActivityError::Capacity)
    }
}

fn growth<K, V>(capacity: usize, needed: bool) -> Result<usize, ActivityError> {
    if !needed {
        return Ok(0);
    }
    map_storage::<K, V>(
        capacity
            .checked_mul(2)
            .and_then(|n| n.checked_add(2))
            .ok_or(ActivityError::Capacity)?,
    )
    .ok_or(ActivityError::Capacity)
}
impl ActivityJournal {
    /// Real record-map backing remains owned by its collection even if rollback
    /// removes its last entry. It cannot follow a body that has already dropped.
    pub(super) fn prepare_collection(
        &mut self,
        state: &mut ActivityState,
        actor: &str,
    ) -> Result<Option<ActivityCollection>, ActivityError> {
        if let Some(owner) = state.collections.get_mut(actor) {
            let add = growth::<String, ActivityRecord>(
                owner.records.capacity(),
                owner.records.len() == owner.records.capacity(),
            )?;
            self.reserve(add)?;
            state.budget.fund_backing(&mut owner.storage,
                    self.reservation
                        .split_off(add)
                        .map_err(|_| ActivityError::Capacity)?,
                )
                .map_err(|_| ActivityError::Capacity)?;
            let result = owner.records.try_reserve(1);
            owner
                .storage
                .resize(
                    owner
                        .actor_id
                        .capacity()
                        .checked_add(
                            map_storage::<String, ActivityRecord>(owner.records.capacity())
                                .ok_or(ActivityError::Capacity)?,
                        )
                        .ok_or(ActivityError::Capacity)?,
                )
                .map_err(|_| ActivityError::Capacity)?;
            result.map_err(|_| ActivityError::Capacity)?;
            return Ok(None);
        }
        let bytes = actor
            .len()
            .checked_add(growth::<String, ActivityRecord>(0, true)?)
            .ok_or(ActivityError::Capacity)?;
        self.reserve(bytes)?;
        let storage = self
            .reservation
            .split_off(bytes)
            .map_err(|_| ActivityError::Capacity)?;
        let storage = state.budget.adopt_backing(storage).map_err(|_| ActivityError::Capacity)?;
        let mut owner = ActivityCollection {
            actor_id: actor.to_owned(),
            complete: true,
            next_ordinal: 0,
            parent_present: false,
            records: IndexMap::new(),
            order: BTreeMap::new(),
            actions: BTreeMap::new(),
            storage,
        };
        owner
            .records
            .try_reserve(1)
            .map_err(|_| ActivityError::Capacity)?;
        owner
            .storage
            .resize(
                owner
                    .actor_id
                    .capacity()
                    .checked_add(
                        map_storage::<String, ActivityRecord>(owner.records.capacity())
                            .ok_or(ActivityError::Capacity)?,
                    )
                    .ok_or(ActivityError::Capacity)?,
            )
            .map_err(|_| ActivityError::Capacity)?;
        Ok(Some(owner))
    }
    pub(super) fn prepare_metadata(
        &mut self,
        state: &mut ActivityState,
        actor: &str,
        action: &str,
        id: &str,
        old_action: Option<&str>,
    ) -> Result<MetadataBefore, ActivityError> {
        let actions = [old_action.unwrap_or(action), action];
        let before = MetadataBefore::capture(state, Some(actor), &actions)?;
        let collection = !state.collections.contains_key(actor);
        let current = !state.current.contains_key(actor);
        let active = !state.active.contains_key(action);
        let learning = !state.learning.contains_key(actor);
        let bytes = heap_sum([
            growth::<String, ActivityCollection>(
                state.collections.capacity(),
                collection && state.collections.len() == state.collections.capacity(),
            )?,
            growth::<String, String>(
                state.current.capacity(),
                current && state.current.len() == state.current.capacity(),
            )?,
            growth::<String, ActivityReference>(
                state.active.capacity(),
                active
                    && !old_action.is_some_and(|old| state.active.contains_key(old))
                    && state.active.len() == state.active.capacity(),
            )?,
            growth::<String, LearningCursor>(
                state.learning.capacity(),
                learning && state.learning.len() == state.learning.capacity(),
            )?,
            actor
                .len()
                .checked_mul(4)
                .and_then(|n| n.checked_add(action.len().checked_mul(2)?))
                .and_then(|n| n.checked_add(id.len()))
                .ok_or(ActivityError::Capacity)?,
        ])
        .ok_or(ActivityError::Capacity)?;
        self.reserve(bytes)?;
        state.fund_metadata(&mut self.reservation, bytes)?;
        let result = (|| {
            state
                .collections
                .try_reserve(usize::from(collection))
                .map_err(|_| ActivityError::Capacity)?;
            state
                .current
                .try_reserve(usize::from(current))
                .map_err(|_| ActivityError::Capacity)?;
            state
                .active
                .try_reserve(usize::from(active))
                .map_err(|_| ActivityError::Capacity)?;
            state
                .learning
                .try_reserve(usize::from(learning))
                .map_err(|_| ActivityError::Capacity)
        })();
        if let Err(error) = result {
            state.settle_metadata(before, Some(actor), &actions, &mut self.reservation)?;
            return Err(error);
        }
        let after = MetadataBefore::capture(state, Some(actor), &actions)?;
        state.metadata_bytes = state
            .metadata_bytes
            .checked_sub(before.backing)
            .and_then(|n| n.checked_add(after.backing))
            .ok_or(ActivityError::Capacity)?;
        Ok(after)
    }
}

pub(super) fn current_bytes(state: &ActivityState, key: &str) -> Result<usize, ActivityError> {
    entry(state.current.get_key_value(key)).ok_or(ActivityError::Capacity)
}
pub(super) fn active_bytes(state: &ActivityState, key: &str) -> Result<usize, ActivityError> {
    entry(state.active.get_key_value(key)).ok_or(ActivityError::Capacity)
}
pub(super) fn learning_bytes(state: &ActivityState, key: &str) -> Result<usize, ActivityError> {
    entry(state.learning.get_key_value(key)).ok_or(ActivityError::Capacity)
}
impl ActivityState {
    /// A rollback moves its exact owned key/value out of the inverse. Their
    /// known sizes avoid cloning an address merely to find it after that move.
    pub(super) fn settle_component(
        &mut self,
        before: MetadataBefore,
        old: usize,
        new: usize,
        from: &mut ByteReservation,
    ) -> Result<(), ActivityError> {
        let bytes = self
            .metadata_bytes
            .checked_sub(before.backing)
            .and_then(|n| n.checked_sub(old))
            .and_then(|n| n.checked_add(backing(self)?))
            .and_then(|n| n.checked_add(new))
            .ok_or(ActivityError::Capacity)?;
        if bytes > self.metadata_storage.bytes() {
            self.fund_metadata(from, bytes - self.metadata_storage.bytes())?;
        }
        self.metadata_storage
            .resize(bytes)
            .map_err(|_| ActivityError::Capacity)?;
        self.metadata_bytes = bytes;
        Ok(())
    }
}
