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
    map_bytes: usize,
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
        let map_bytes = map_storage::<String, InstalledObserverIdentity>(records.capacity())
            .ok_or_else(capacity)?;
        let bytes = heap_sum([values_bytes, keys_bytes, map_bytes]).ok_or_else(capacity)?;
        Ok(Self {
            records,
            values_bytes,
            keys_bytes,
            map_bytes,
            storage: budget.reserve_backing(bytes).map_err(|_| capacity())?,
            budget: budget.clone(),
        })
    }

    /// Removing an entry can leave a tombstone. Fund restoring it even if
    /// nested writes consume the directory's remaining insertion room.
    pub(crate) fn removal_undo_growth(&self) -> Result<usize, ReceivedError> {
        let (_, needed) = Self::insertion_backing(self.records.len())?;
        Ok(needed.saturating_sub(self.map_bytes))
    }

    fn insertion_backing(next_len: usize) -> Result<(usize, usize), ReceivedError> {
        let target = next_len.checked_mul(2).ok_or_else(capacity)?;
        let bytes =
            map_storage::<String, InstalledObserverIdentity>(target).ok_or_else(capacity)?;
        Ok((target, bytes))
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
        let old = self.records.get_full(key);
        let old_position = old.map(|(position, _, _)| position);
        let old_value = old
            .map_or(Some(0), |(_, _, value)| value.heap_bytes())
            .ok_or_else(capacity)?;
        let old_key = old.map_or(0, |(_, key, _)| key.capacity());
        let next_value = after
            .as_ref()
            .map_or(Some(0), |(_, value)| value.heap_bytes())
            .ok_or_else(capacity)?;
        let values_bytes = self
            .values_bytes
            .checked_sub(old_value)
            .and_then(|n| n.checked_add(next_value))
            .ok_or_else(capacity)?;
        let next_key = after
            .as_ref()
            .map_or(0, |_| old.map_or(key.len(), |(_, key, _)| key.capacity()));
        let keys_bytes = self
            .keys_bytes
            .checked_sub(old_key)
            .and_then(|n| n.checked_add(next_key))
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
        let growth = if inserting && self.records.len() == self.records.capacity() {
            let next_len = self.records.len().checked_add(1).ok_or_else(capacity)?;
            Some(Self::insertion_backing(next_len)?)
        } else {
            None
        };
        // IndexMap capacity is remaining insertion room, not the size of
        // either allocation. Tombstones can change it without any allocation.
        // Only a reserve can increase our funded backing estimate.
        let map_bytes = growth.map_or(self.map_bytes, |(_, bound)| self.map_bytes.max(bound));
        let forecast = heap_sum([values_bytes, keys_bytes, map_bytes]).ok_or_else(capacity)?;
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
        if let Some((target, _)) = growth {
            // Ordinary reserve rounds the entry buffer up to the hash table's
            // capacity. Keep this explicit pre-admitted target exact instead.
            if self
                .records
                .try_reserve_exact(target - self.records.len())
                .is_err()
            {
                // A failed reserve can still grow one of the two buffers.
                // Keep its admitted capacity unless we can drop both.
                self.map_bytes = if self.records.is_empty() {
                    self.records = IndexMap::new();
                    0
                } else {
                    map_bytes
                };
                self.storage
                    .resize(
                        heap_sum([self.values_bytes, self.keys_bytes, self.map_bytes])
                            .ok_or_else(capacity)?,
                    )
                    .map_err(|_| capacity())?;
                return Err(capacity());
            }
        }
        // Removing and reinserting a retained key can rehash or grow a full
        // index after admission. Move only the old value into the journal.
        let before = match (old_position, after) {
            (Some(old), Some((position, value))) => {
                let (_, previous) = self.records.get_index_mut(old).ok_or_else(capacity)?;
                let previous = std::mem::replace(previous, value);
                if old != position {
                    self.records.move_index(old, position);
                }
                Some((old, previous))
            }
            (Some(_), None) => self
                .records
                .shift_remove_full(key)
                .map(|(position, _, value)| (position, value)),
            (None, Some((position, value))) => {
                self.records.shift_insert(position, key.to_owned(), value);
                None
            }
            (None, None) => None,
        };
        self.values_bytes = values_bytes;
        self.keys_bytes = keys_bytes;
        self.map_bytes = map_bytes;
        self.storage.resize(forecast).map_err(|_| capacity())?;
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
