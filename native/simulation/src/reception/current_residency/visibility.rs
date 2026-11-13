//! The three mutable outward lists own their surviving backing independently
//! of candidate undo. Changes account only the affected observer/member;
//! installation is the sole complete-root measurement.
use super::*;
use crate::host::ByteReservation;
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::received::ReceivedError;
use indexmap::IndexMap;

#[derive(Clone, Copy)]
pub(in super::super) enum VisibilityPart {
    People,
    Objects,
    Places,
}
impl VisibilityPart {
    pub(in super::super) fn bodies(people: bool) -> Self {
        if people { Self::People } else { Self::Objects }
    }
}
pub(crate) struct VisibilityRoots {
    keys: [usize; 3],
    values: [usize; 3],
    storage: ResidentReservation,
    budget: ByteBudget,
}
fn root_storage(state: &ReceptionState, part: VisibilityPart) -> Option<usize> {
    match part {
        VisibilityPart::People => map_storage::<String, Vec<String>>(
            state.visible_people.as_ref().map_or(0, IndexMap::capacity),
        ),
        VisibilityPart::Objects => map_storage::<String, Vec<String>>(
            state.visible_objects.as_ref().map_or(0, IndexMap::capacity),
        ),
        VisibilityPart::Places => map_storage::<String, IndexMap<String, u64>>(
            state.visible_places.as_ref().map_or(0, IndexMap::capacity),
        ),
    }
}
fn root_parts<T: HeapBytes>(root: Option<&IndexMap<String, T>>) -> Option<(usize, usize)> {
    root.into_iter()
        .flatten()
        .try_fold((0usize, 0usize), |(keys, values), (key, value)| {
            Some((
                keys.checked_add(key.capacity())?,
                values.checked_add(value.heap_bytes()?)?,
            ))
        })
}
impl VisibilityRoots {
    pub(in super::super) fn install(
        state: &ReceptionState,
        budget: &ByteBudget,
    ) -> Result<Self, ReceivedError> {
        let mut keys = [0; 3];
        let mut values = [0; 3];
        for (part, allocation) in [
            (
                VisibilityPart::People,
                root_parts(state.visible_people.as_ref()),
            ),
            (
                VisibilityPart::Objects,
                root_parts(state.visible_objects.as_ref()),
            ),
            (
                VisibilityPart::Places,
                root_parts(state.visible_places.as_ref()),
            ),
        ] {
            (keys[part as usize], values[part as usize]) = allocation.ok_or_else(capacity)?;
        }
        let bytes = total(state, keys, values).ok_or_else(capacity)?;
        Ok(Self {
            keys,
            values,
            storage: budget.reserve_backing(bytes).map_err(|_| capacity())?,
            budget: budget.clone(),
        })
    }
}
fn total(state: &ReceptionState, keys: [usize; 3], values: [usize; 3]) -> Option<usize> {
    heap_sum([
        heap_sum(keys)?,
        heap_sum(values)?,
        root_storage(state, VisibilityPart::People)?,
        root_storage(state, VisibilityPart::Objects)?,
        root_storage(state, VisibilityPart::Places)?,
    ])
}
fn adjusted(total: usize, before: usize, after: usize) -> Option<usize> {
    total.checked_sub(before)?.checked_add(after)
}
impl ReceptionState {
    pub(in super::super) fn visibility_allocation(
        &self,
        part: VisibilityPart,
        observer: &str,
    ) -> Result<(usize, usize), ReceivedError> {
        fn allocation<T: HeapBytes>(
            root: Option<&IndexMap<String, T>>,
            observer: &str,
        ) -> Option<(usize, usize)> {
            root.and_then(|root| root.get_key_value(observer))
                .map_or(Some((0, 0)), |(key, value)| {
                    Some((key.capacity(), value.heap_bytes()?))
                })
        }
        match part {
            VisibilityPart::People => allocation(self.visible_people.as_ref(), observer),
            VisibilityPart::Objects => allocation(self.visible_objects.as_ref(), observer),
            VisibilityPart::Places => allocation(self.visible_places.as_ref(), observer),
        }
        .ok_or_else(capacity)
    }
    /// Admit candidate pins before the future canonical allocation exists.
    pub(in super::super) fn prepare_visibility_growth(
        &mut self,
        part: VisibilityPart,
        before: (usize, usize),
        after: (usize, usize),
        parent_backing: Option<usize>,
        workspace: &mut ByteReservation,
    ) -> Result<(), ReceivedError> {
        let current = self.visibility_storage.as_ref().ok_or_else(capacity)?;
        let mut keys = current.keys;
        let mut values = current.values;
        keys[part as usize] =
            adjusted(keys[part as usize], before.0, after.0).ok_or_else(capacity)?;
        values[part as usize] =
            adjusted(values[part as usize], before.1, after.1).ok_or_else(capacity)?;
        let mut bytes = total(self, keys, values).ok_or_else(capacity)?;
        if let Some(parent) = parent_backing {
            bytes = bytes
                .checked_sub(root_storage(self, part).ok_or_else(capacity)?)
                .and_then(|bytes| bytes.checked_add(parent))
                .ok_or_else(capacity)?;
        }
        let current = self.visibility_storage.as_mut().ok_or_else(capacity)?;
        if bytes > current.storage.bytes() {
            let growth = workspace
                .split_off(bytes - current.storage.bytes())
                .map_err(|_| capacity())?;
            current
                .budget
                .fund_backing(&mut current.storage, growth)
                .map_err(|_| capacity())?;
        }
        Ok(())
    }
    /// Failed allocation changed no record; release the unused forecast while
    /// preserving all actual parent backing capacity.
    pub(in super::super) fn cancel_visibility_growth(&mut self) -> Result<(), ReceivedError> {
        let current = self.visibility_storage.as_ref().ok_or_else(capacity)?;
        let bytes = total(self, current.keys, current.values).ok_or_else(capacity)?;
        let current = self.visibility_storage.as_mut().ok_or_else(capacity)?;
        if bytes > current.storage.bytes() {
            return Err(capacity());
        }
        current.storage.resize(bytes).map_err(|_| capacity())
    }
    /// Deltas cover one changed observer/member. Unrelated roots are not scanned.
    pub(in super::super) fn settle_visibility(
        &mut self,
        part: VisibilityPart,
        before: (usize, usize),
        after: (usize, usize),
        workspace: &mut ByteReservation,
        restoring: bool,
    ) -> Result<(), ReceivedError> {
        let current = self.visibility_storage.as_ref().ok_or_else(capacity)?;
        let mut keys = current.keys;
        let mut values = current.values;
        keys[part as usize] =
            adjusted(keys[part as usize], before.0, after.0).ok_or_else(capacity)?;
        values[part as usize] =
            adjusted(values[part as usize], before.1, after.1).ok_or_else(capacity)?;
        let bytes = total(self, keys, values).ok_or_else(capacity)?;
        let current = self.visibility_storage.as_mut().ok_or_else(capacity)?;
        current.keys = keys;
        current.values = values;
        if bytes > current.storage.bytes() {
            if !restoring {
                return Err(capacity());
            }
            let growth = workspace
                .split_off(bytes - current.storage.bytes())
                .map_err(|_| capacity())?;
            current
                .budget
                .restore_backing(&mut current.storage, growth)
                .map_err(|_| capacity())?;
        }
        current.storage.resize(bytes).map_err(|_| capacity())?;
        Ok(())
    }
}
