//! Mutable values retain canonical custody independently of their journal.
//! Status guards follow the sole status map's positions; they contain no second
//! status value, clock, identity or mutation authority.
use super::*;
use crate::host::retained_size::{heap_sum, map_storage};
use crate::values::StatusInstance;
use std::mem::size_of;

impl HeapBytes for StatusInstance {
    fn heap_bytes(&self) -> Option<usize> {
        if self.contribution.is_some() {
            return None;
        }
        heap_sum([
            self.episode.capacity(),
            self.source_id.capacity(),
            self.action_target_id.capacity(),
        ])
    }
}
fn status_bytes(value: &StatusInstance) -> Result<usize, ExecutionError> {
    value.heap_bytes().ok_or(ExecutionError::UnsupportedFamily)
}
pub(crate) struct FundedStatus {
    pub value: StatusInstance,
    storage: ResidentReservation,
}
impl std::ops::Deref for FundedStatus {
    type Target = StatusInstance;
    fn deref(&self) -> &StatusInstance {
        &self.value
    }
}
impl FundedStatus {
    pub(crate) fn from_storage(
        value: StatusInstance,
        mut storage: ByteReservation,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let bytes = status_bytes(&value)?;
        if storage.bytes() < bytes {
            return Err(ExecutionError::Capacity);
        }
        storage.resize(bytes)?;
        Ok(Self {
            value,
            storage: budget.adopt_record(storage)?,
        })
    }
    pub(crate) fn copy(
        value: &StatusInstance,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let storage = budget.reserve(status_bytes(value)?)?;
        Self::from_storage(value.clone(), storage, budget)
    }
    pub(crate) fn is_funded_by(&self, budget: &ByteBudget) -> bool {
        budget.resident().owns(&self.storage)
    }
}

pub(super) struct ValueStorage {
    // Selected writers change only numeric/scalar attribute fields. Membership
    // and category strings remain fixed after admission; a future allocating
    // attribute writer must extend this owner before writing those fields.
    _attributes: ResidentReservation,
    statuses: Vec<ResidentReservation>,
    vector: ResidentReservation,
    map: ResidentReservation,
    keys: ResidentReservation,
    key_bytes: usize,
}
impl ValueStorage {
    pub(super) fn new(entity: &Entity, budget: &ByteBudget) -> Result<Self, ExecutionError> {
        let attributes = heap_sum([
            entity
                .attributes
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?,
            entity
                .actor
                .as_ref()
                .map_or(Some(0), |actor| actor.attributes.heap_bytes())
                .ok_or(ExecutionError::Capacity)?,
        ])
        .ok_or(ExecutionError::Capacity)?;
        let states = entity.status_effects.as_ref();
        let key_bytes = states
            .map_or(Some(0), |states| {
                states
                    .keys()
                    .try_fold(0usize, |n, key| n.checked_add(key.capacity()))
            })
            .ok_or(ExecutionError::Capacity)?;
        let count = states.map_or(0, IndexMap::len);
        let mut vector = budget.reserve_backing(if count == 0 {
            0
        } else {
            count
                .checked_mul(2)
                .and_then(|n| n.checked_add(4))
                .and_then(|n| n.checked_mul(size_of::<ResidentReservation>()))
                .ok_or(ExecutionError::Capacity)?
        })?;
        let mut statuses = Vec::new();
        statuses
            .try_reserve_exact(count)
            .map_err(|_| ExecutionError::Capacity)?;
        vector.resize(
            statuses
                .capacity()
                .checked_mul(size_of::<ResidentReservation>())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        if let Some(states) = states {
            for state in states.values() {
                statuses.push(budget.reserve_record(status_bytes(state)?)?);
            }
        }
        Ok(Self {
            _attributes: budget.reserve_record(attributes)?,
            statuses,
            vector,
            map: budget.reserve_backing(
                map_storage::<String, StatusInstance>(states.map_or(0, IndexMap::capacity))
                    .ok_or(ExecutionError::Capacity)?,
            )?,
            keys: budget.reserve_backing(key_bytes)?,
            key_bytes,
        })
    }
    fn trim(
        &mut self,
        states: Option<&IndexMap<String, StatusInstance>>,
    ) -> Result<(), ExecutionError> {
        let vector = self
            .statuses
            .capacity()
            .checked_mul(size_of::<ResidentReservation>())
            .ok_or(ExecutionError::Capacity)?;
        let map = map_storage::<String, StatusInstance>(states.map_or(0, IndexMap::capacity))
            .ok_or(ExecutionError::Capacity)?;
        if vector > self.vector.bytes()
            || map > self.map.bytes()
            || self.key_bytes > self.keys.bytes()
        {
            return Err(ExecutionError::Invariant);
        }
        self.vector.resize(vector)?;
        self.map.resize(map)?;
        self.keys.resize(self.key_bytes)?;
        Ok(())
    }
}

impl EntityStore {
    /// This admits each prospective allocation before either canonical backing
    /// grows. A failed candidate can retain real empty capacity; its slot keeps
    /// that capacity funded until the backing is actually released.
    pub(crate) fn prepare_status_insert(
        &mut self,
        handle: EntityHandle,
        key: &str,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let slot = self
            .slots
            .get_mut(handle.slot)
            .filter(|slot| slot.generation == handle.generation)
            .ok_or(ExecutionError::MissingEntity)?;
        let entity = slot.entity.as_mut().ok_or(ExecutionError::MissingEntity)?;
        let storage = &mut slot
            .metadata_storage
            .as_mut()
            .ok_or(ExecutionError::Invariant)?
            .values;
        if !budget.resident().owns(&storage.map) {
            return Err(ExecutionError::Invariant);
        }
        let len = entity.status_effects.as_ref().map_or(0, IndexMap::len);
        if storage.statuses.len() != len {
            return Err(ExecutionError::Invariant);
        }
        if entity
            .status_effects
            .as_ref()
            .is_some_and(|states| states.contains_key(key))
        {
            return Ok(());
        }
        let capacity = len
            .checked_add(1)
            .and_then(|n| n.checked_mul(2))
            .and_then(|n| n.checked_add(4))
            .ok_or(ExecutionError::Capacity)?;
        let result = (|| {
            if entity.status_effects.as_ref().map_or(0, IndexMap::capacity) == len {
                budget.resize_backing(
                    &mut storage.map,
                    map_storage::<String, StatusInstance>(capacity)
                        .ok_or(ExecutionError::Capacity)?,
                )?;
            }
            if storage.statuses.len() == storage.statuses.capacity() {
                budget.resize_backing(
                    &mut storage.vector,
                    capacity
                        .checked_mul(size_of::<ResidentReservation>())
                        .ok_or(ExecutionError::Capacity)?,
                )?;
            }
            budget.resize_backing(
                &mut storage.keys,
                storage
                    .key_bytes
                    .checked_add(key.len())
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            storage
                .statuses
                .try_reserve_exact(1)
                .map_err(|_| ExecutionError::Capacity)?;
            entity
                .status_effects
                .get_or_insert_with(IndexMap::new)
                .try_reserve(1)
                .map_err(|_| ExecutionError::Capacity)?;
            Ok(())
        })();
        if result.is_err() {
            storage.trim(entity.status_effects.as_ref())?;
        }
        result
    }
    pub(crate) fn swap_funded_status(
        &mut self,
        handle: EntityHandle,
        key: &str,
        after: FundedStatus,
    ) -> Result<Option<(usize, FundedStatus)>, ExecutionError> {
        let slot = self
            .slots
            .get_mut(handle.slot)
            .filter(|slot| slot.generation == handle.generation)
            .ok_or(ExecutionError::MissingEntity)?;
        let entity = slot.entity.as_mut().ok_or(ExecutionError::MissingEntity)?;
        let storage = &mut slot
            .metadata_storage
            .as_mut()
            .ok_or(ExecutionError::Invariant)?
            .values;
        if !storage.map.shares_owner(&after.storage) {
            return Err(ExecutionError::Invariant);
        }
        let states = entity
            .status_effects
            .as_mut()
            .ok_or(ExecutionError::Invariant)?;
        if storage.statuses.len() != states.len() {
            return Err(ExecutionError::Invariant);
        }
        let before = if let Some((position, _, value)) = states.get_full_mut(key) {
            let old = FundedStatus {
                value: std::mem::replace(value, after.value),
                storage: std::mem::replace(
                    storage
                        .statuses
                        .get_mut(position)
                        .ok_or(ExecutionError::Invariant)?,
                    after.storage,
                ),
            };
            Some((position, old))
        } else {
            if states.len() == states.capacity()
                || storage.statuses.len() == storage.statuses.capacity()
                || storage.keys.bytes()
                    < storage
                        .key_bytes
                        .checked_add(key.len())
                        .ok_or(ExecutionError::Capacity)?
            {
                return Err(ExecutionError::Invariant);
            }
            states.insert(key.to_owned(), after.value);
            storage.statuses.push(after.storage);
            storage.key_bytes = storage
                .key_bytes
                .checked_add(key.len())
                .ok_or(ExecutionError::Capacity)?;
            None
        };
        storage.trim(Some(states))?;
        Ok(before)
    }
    pub(crate) fn restore_funded_status(
        &mut self,
        handle: EntityHandle,
        key: &str,
        before: Option<(usize, FundedStatus)>,
        root_present: bool,
    ) -> Result<(), ExecutionError> {
        if let Some((position, before)) = before {
            let actual = self
                .resolve(handle)
                .and_then(|entity| entity.status_effects.as_ref())
                .and_then(|states| states.get_index_of(key))
                .ok_or(ExecutionError::Invariant)?;
            if position != actual {
                return Err(ExecutionError::Invariant);
            }
            drop(self.swap_funded_status(handle, key, before)?);
            return Ok(());
        }
        let slot = self
            .slots
            .get_mut(handle.slot)
            .filter(|slot| slot.generation == handle.generation)
            .ok_or(ExecutionError::MissingEntity)?;
        let entity = slot.entity.as_mut().ok_or(ExecutionError::MissingEntity)?;
        let storage = &mut slot
            .metadata_storage
            .as_mut()
            .ok_or(ExecutionError::Invariant)?
            .values;
        if let Some(states) = entity.status_effects.as_mut() {
            if let Some((position, removed_key, value)) = states.shift_remove_full(key) {
                let body = storage.statuses.remove(position);
                storage.key_bytes = storage
                    .key_bytes
                    .checked_sub(removed_key.capacity())
                    .ok_or(ExecutionError::Invariant)?;
                drop(value);
                drop(body);
                drop(removed_key);
            }
            if !root_present {
                if !states.is_empty() {
                    return Err(ExecutionError::Invariant);
                }
                entity.status_effects = None;
            }
        } else if root_present {
            return Err(ExecutionError::Invariant);
        }
        storage.trim(entity.status_effects.as_ref())
    }
}
