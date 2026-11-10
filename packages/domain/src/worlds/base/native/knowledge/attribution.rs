//! Capture only the selected entities' real observer identity records. The
//! application hashes this finite read with its existing attribution formatter.
use super::*;
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};

type Identity = (
    Option<String>,
    Option<String>,
    crate::text::JsText,
    Option<crate::text::JsText>,
    bool,
);
pub(crate) struct CapturedAttributionIdentities {
    values: IndexMap<String, Vec<Identity>>,
    enumeration: Vec<usize>,
    _storage: ByteReservation,
}
impl CapturedAttributionIdentities {
    pub(crate) fn key(&self, ordinal: usize) -> Option<&str> {
        self.values
            .get_index(*self.enumeration.get(ordinal)?)
            .map(|(key, _)| key.as_str())
    }
    pub(crate) fn matches_entry(&self, ordinal: usize, current: &Self) -> bool {
        self.enumeration
            .get(ordinal)
            .and_then(|index| self.values.get_index(*index))
            .is_some_and(|(key, expected)| current.values.get(key) == Some(expected))
    }
}
impl Serialize for CapturedAttributionIdentities {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        self.values.serialize(serializer)
    }
}
impl PersonalNameReader<'_> {
    pub(crate) fn capture_attribution_identities<'a>(
        &self,
        ids: impl Iterator<Item = &'a str> + Clone,
        budget: &ByteBudget,
    ) -> Result<CapturedAttributionIdentities, ReceivedError> {
        let count = ids.clone().count();
        let keys = ids
            .clone()
            .try_fold(0usize, |n, id| n.checked_add(id.len()))
            .ok_or_else(capacity)?;
        let _selection = budget
            .reserve(map_storage::<&str, usize>(count).ok_or_else(capacity)?)
            .map_err(|_| capacity())?;
        let mut selected = IndexMap::with_capacity(count);
        for id in ids {
            let next = selected.len();
            selected.entry(id).or_insert(next);
        }
        let mut matches = 0usize;
        let mut payload = 0usize;
        for identity in self.identities().into_iter().flat_map(IndexMap::values) {
            if identity.seed_only == Some(true)
                || !identity
                    .canonical_id
                    .as_deref()
                    .is_some_and(|id| selected.contains_key(id))
            {
                continue;
            }
            matches = matches.checked_add(1).ok_or_else(capacity)?;
            payload = heap_sum([
                payload,
                identity.individual_id.heap_bytes().ok_or_else(capacity)?,
                identity.canonical_id.heap_bytes().ok_or_else(capacity)?,
                identity.given_name.heap_bytes().ok_or_else(capacity)?,
                identity.nickname.heap_bytes().ok_or_else(capacity)?,
            ])
            .ok_or_else(capacity)?;
        }
        let bytes = heap_sum([
            size_of::<CapturedAttributionIdentities>(),
            keys,
            payload,
            map_storage::<String, Vec<Identity>>(selected.len()).ok_or_else(capacity)?,
            selected
                .len()
                .checked_mul(size_of::<usize>())
                .ok_or_else(capacity)?,
            matches
                .checked_mul(size_of::<Identity>())
                .ok_or_else(capacity)?,
        ])
        .ok_or_else(capacity)?;
        let storage = budget.reserve(bytes).map_err(|_| capacity())?;
        // Source Object.values order puts array-index keys first. Sort only
        // selected immutable references, never the observer's whole catalogue.
        let _scratch = budget
            .reserve(
                matches
                    .checked_mul(2 * size_of::<(usize, (u8, u64), &ObserverIdentity)>())
                    .ok_or_else(capacity)?,
            )
            .map_err(|_| capacity())?;
        let mut rows = Vec::with_capacity(matches);
        let mut lengths = vec![0usize; selected.len()];
        for (at, (key, identity)) in self
            .identities()
            .into_iter()
            .flat_map(IndexMap::iter)
            .enumerate()
        {
            if identity.seed_only == Some(true) {
                continue;
            }
            let Some(&group) = identity
                .canonical_id
                .as_deref()
                .and_then(|id| selected.get(id))
            else {
                continue;
            };
            lengths[group] += 1;
            let rank = crate::encoding::array_index(key)
                .map_or((1u8, at as u64), |index| (0, u64::from(index)));
            rows.push((group, rank, identity));
        }
        rows.sort_by_key(|(group, rank, _)| (*group, *rank));
        let mut values = IndexMap::with_capacity(selected.len());
        for (id, &group) in &selected {
            values.insert((*id).to_owned(), Vec::with_capacity(lengths[group]));
        }
        for (group, _, identity) in rows {
            values.get_index_mut(group).ok_or_else(capacity)?.1.push((
                identity.individual_id.clone(),
                identity.canonical_id.clone(),
                identity.given_name.clone(),
                identity.nickname.clone(),
                identity.authored,
            ));
        }
        // Reuse the funded lengths vector for Object.keys order. Numeric
        // authored IDs enumerate before other keys in the Node formatter.
        for (index, entry) in lengths.iter_mut().enumerate() {
            *entry = index;
        }
        lengths.sort_unstable_by_key(|index| {
            let key = values.get_index(*index).expect("captured identity key").0;
            crate::encoding::array_index(key)
                .map_or((1u8, *index as u64), |index| (0, u64::from(index)))
        });
        Ok(CapturedAttributionIdentities {
            values,
            enumeration: lengths,
            _storage: storage,
        })
    }
}
