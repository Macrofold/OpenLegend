//! Allocation custody for the real selected-world identity directory. Policy,
//! account admission, correspondence and revision notices stay in its world
//! journal. The directory updates one changed record's allocation components;
//! it never walks all accumulated identities merely to fund another write.

use super::ReceptionState;
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation, ResidentReservation};
use crate::received::ReceivedError;
use crate::worlds::InstalledObserverIdentity;
use indexmap::IndexMap;
use serde::{Serialize, Serializer};
use std::ops::Deref;

fn capacity() -> ReceivedError {
    ReceivedError("Observer identity allocation exceeds native allowance.")
}

pub(crate) struct IdentityDirectory {
    records: IndexMap<String, InstalledObserverIdentity>,
    values_bytes: usize,
    keys_bytes: usize,
    storage: ResidentReservation,
    budget: ByteBudget,
}
impl Deref for IdentityDirectory {
    type Target = IndexMap<String, InstalledObserverIdentity>;
    fn deref(&self) -> &Self::Target {
        &self.records
    }
}
impl HeapBytes for IdentityDirectory {
    fn heap_bytes(&self) -> Option<usize> {
        Some(self.storage.bytes())
    }
}
impl<'a> IntoIterator for &'a IdentityDirectory {
    type Item = (&'a String, &'a InstalledObserverIdentity);
    type IntoIter = indexmap::map::Iter<'a, String, InstalledObserverIdentity>;
    fn into_iter(self) -> Self::IntoIter {
        self.records.iter()
    }
}
impl Serialize for IdentityDirectory {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        self.records.serialize(serializer)
    }
}
impl IdentityDirectory {
    pub(crate) fn install(
        records: IndexMap<String, InstalledObserverIdentity>,
        budget: &ByteBudget,
    ) -> Result<Self, ReceivedError> {
        let values_bytes = records
            .values()
            .try_fold(0_usize, |sum, value| sum.checked_add(value.heap_bytes()?))
            .ok_or_else(capacity)?;
        let keys_bytes = records
            .keys()
            .try_fold(0_usize, |sum, key| sum.checked_add(key.capacity()))
            .ok_or_else(capacity)?;
        let bytes = heap_sum([
            values_bytes,
            keys_bytes,
            map_storage::<String, InstalledObserverIdentity>(records.capacity())
                .ok_or_else(capacity)?,
        ])
        .ok_or_else(capacity)?;
        Ok(Self {
            records,
            values_bytes,
            keys_bytes,
            storage: budget.reserve_backing(bytes).map_err(|_| capacity())?,
            budget: budget.clone(),
        })
    }
    /// Only the selected semantic journal calls this after its policy/account
    /// admission and before publishing its dependent correspondence changes.
    /// Its existing workspace funds copied keys and the moved old before-image.
    pub(crate) fn replace(
        &mut self,
        key: &str,
        after: Option<(usize, InstalledObserverIdentity)>,
        workspace: &mut ByteReservation,
        restoring: bool,
    ) -> Result<Option<(usize, InstalledObserverIdentity)>, ReceivedError> {
        let old = self.records.get_key_value(key);
        let old_value = old
            .map_or(Some(0), |(_, value)| value.heap_bytes())
            .ok_or_else(capacity)?;
        let old_key = old.map_or(0, |(key, _)| key.capacity());
        let next_value = after
            .as_ref()
            .map_or(Some(0), |(_, value)| value.heap_bytes())
            .ok_or_else(capacity)?;
        let values_bytes = self
            .values_bytes
            .checked_sub(old_value)
            .and_then(|n| n.checked_add(next_value))
            .ok_or_else(capacity)?;
        let keys_bytes = self
            .keys_bytes
            .checked_sub(old_key)
            .and_then(|n| n.checked_add(if after.is_some() { key.len() } else { 0 }))
            .ok_or_else(capacity)?;
        let old_present = old.is_some();
        if after
            .as_ref()
            .is_some_and(|(position, _)| *position > self.records.len() - usize::from(old_present))
        {
            return Err(ReceivedError(
                "Observer identity insertion position is invalid.",
            ));
        }
        let inserting = after.is_some() && !old_present;
        let target = if inserting && self.records.len() == self.records.capacity() {
            self.records
                .capacity()
                .checked_add(1)
                .and_then(|n| n.checked_mul(2))
                .ok_or_else(capacity)?
        } else {
            self.records.capacity()
        };
        let forecast = heap_sum([
            values_bytes,
            keys_bytes,
            map_storage::<String, InstalledObserverIdentity>(target).ok_or_else(capacity)?,
        ])
        .ok_or_else(capacity)?;
        if forecast > self.storage.bytes() {
            let growth = workspace
                .split_off(forecast - self.storage.bytes())
                .map_err(|_| capacity())?;
            if restoring {
                self.budget.restore_backing(&mut self.storage, growth)
            } else {
                self.budget.fund_backing(&mut self.storage, growth)
            }
            .map_err(|_| capacity())?;
        }
        if target > self.records.capacity() {
            if self
                .records
                .try_reserve(target - self.records.len())
                .is_err()
            {
                // A failed allocator changed no record. Release the unused
                // forecast instead of keeping an inflated resident counter.
                self.storage
                    .resize(
                        heap_sum([
                            self.values_bytes,
                            self.keys_bytes,
                            map_storage::<String, InstalledObserverIdentity>(
                                self.records.capacity(),
                            )
                            .ok_or_else(capacity)?,
                        ])
                        .ok_or_else(capacity)?,
                    )
                    .map_err(|_| capacity())?;
                return Err(capacity());
            }
        }
        let before = self
            .records
            .shift_remove_full(key)
            .map(|(position, _, value)| (position, value));
        if let Some((position, value)) = after {
            self.records.shift_insert(position, key.to_owned(), value);
        }
        self.values_bytes = values_bytes;
        self.keys_bytes = keys_bytes;
        let actual = heap_sum([
            values_bytes,
            keys_bytes,
            map_storage::<String, InstalledObserverIdentity>(self.records.capacity())
                .ok_or_else(capacity)?,
        ])
        .ok_or_else(capacity)?;
        if actual > self.storage.bytes() {
            return Err(capacity());
        }
        self.storage.resize(actual).map_err(|_| capacity())?;
        Ok(before)
    }
}

pub(crate) struct RecognitionRoots {
    identity_keys: usize,
    revision_keys: usize,
    storage: ResidentReservation,
    budget: ByteBudget,
}
impl RecognitionRoots {
    pub(crate) fn install(
        state: &ReceptionState,
        budget: &ByteBudget,
    ) -> Result<Self, ReceivedError> {
        let identity_keys = state
            .observer_identities
            .as_ref()
            .map_or(Some(0), |root| {
                root.keys()
                    .try_fold(0_usize, |sum, key| sum.checked_add(key.capacity()))
            })
            .ok_or_else(capacity)?;
        let revision_keys = state
            .knowledge_revisions
            .as_ref()
            .map_or(Some(0), |root| {
                root.keys()
                    .try_fold(0_usize, |sum, key| sum.checked_add(key.capacity()))
            })
            .ok_or_else(capacity)?;
        let bytes = roots_bytes(state, identity_keys, revision_keys).ok_or_else(capacity)?;
        Ok(Self {
            identity_keys,
            revision_keys,
            storage: budget.reserve_backing(bytes).map_err(|_| capacity())?,
            budget: budget.clone(),
        })
    }
}
fn roots_bytes(
    state: &ReceptionState,
    identity_keys: usize,
    revision_keys: usize,
) -> Option<usize> {
    heap_sum([
        identity_keys,
        revision_keys,
        map_storage::<String, IdentityDirectory>(
            state
                .observer_identities
                .as_ref()
                .map_or(0, IndexMap::capacity),
        )?,
        map_storage::<String, u64>(
            state
                .knowledge_revisions
                .as_ref()
                .map_or(0, IndexMap::capacity),
        )?,
    ])
}
impl ReceptionState {
    /// Mutable parent maps never lend their buffers to readers. The semantic
    /// journal admits growth before writing; this transfers surviving backing
    /// out of that same workspace before acceptance can release it.
    pub(crate) fn settle_recognition_roots(
        &mut self,
        identity_keys_delta: i128,
        revision_keys_delta: i128,
        workspace: &mut ByteReservation,
        restoring: bool,
    ) -> Result<(), ReceivedError> {
        let current = self.recognition_storage.as_ref().ok_or_else(capacity)?;
        let identity_keys = usize::try_from(
            (current.identity_keys as i128)
                .checked_add(identity_keys_delta)
                .ok_or_else(capacity)?,
        )
        .map_err(|_| capacity())?;
        let revision_keys = usize::try_from(
            (current.revision_keys as i128)
                .checked_add(revision_keys_delta)
                .ok_or_else(capacity)?,
        )
        .map_err(|_| capacity())?;
        let bytes = roots_bytes(self, identity_keys, revision_keys).ok_or_else(capacity)?;
        let current = self.recognition_storage.as_mut().ok_or_else(capacity)?;
        if bytes > current.storage.bytes() {
            let growth = workspace
                .split_off(bytes - current.storage.bytes())
                .map_err(|_| capacity())?;
            if restoring {
                current.budget.restore_backing(&mut current.storage, growth)
            } else {
                current.budget.fund_backing(&mut current.storage, growth)
            }
            .map_err(|_| capacity())?;
        }
        current.storage.resize(bytes).map_err(|_| capacity())?;
        current.identity_keys = identity_keys;
        current.revision_keys = revision_keys;
        Ok(())
    }
}
