use super::*;
use crate::host::{
    ResidentReservation,
    retained_size::{heap_sum, map_storage},
};
use crate::records::{
    RecordEncodingError, RowEncoder, encode_marked_owners, encode_sparse_map_changes,
};
use indexmap::IndexMap;
use serde::{Serialize, Serializer};
use std::{mem::size_of, ops::Deref};

impl HeapBytes for MapMarker {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([
            self.id.heap_bytes()?,
            self.label.heap_bytes()?,
            self.icon.heap_bytes()?,
        ])
    }
}

pub(crate) struct MarkerEntry {
    marker: MapMarker,
    storage: ResidentReservation,
}
impl Deref for MarkerEntry {
    type Target = MapMarker;
    fn deref(&self) -> &MapMarker {
        &self.marker
    }
}
impl Serialize for MarkerEntry {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        self.marker.serialize(serializer)
    }
}
type Marks = IndexMap<String, MarkerEntry>;
type Owners = IndexMap<String, Marks>;

pub(crate) struct MapMarkers {
    owners: Option<Owners>,
    metadata: ResidentReservation,
}
impl MapMarkers {
    pub(crate) fn install(
        current: Option<IndexMap<String, IndexMap<String, MapMarker>>>,
        policy: Option<&Cartography>,
        has_actor: impl Fn(&str) -> bool,
        budget: &ByteBudget,
    ) -> Result<Self, InstallError> {
        let capacity = |_| InstallError::Capacity;
        let structure = current
            .as_ref()
            .map_or(Some(0), |root| {
                root.iter().try_fold(
                    map_storage::<String, Marks>(root.len())?,
                    |bytes, (owner, rows)| {
                        heap_sum([
                            bytes,
                            owner.capacity(),
                            map_storage::<String, MarkerEntry>(rows.len())?,
                            rows.keys()
                                .try_fold(0usize, |n, id| n.checked_add(id.capacity()))?,
                        ])
                    },
                )
            })
            .ok_or(InstallError::Capacity)?;
        let metadata = budget
            .reserve_backing(structure.checked_mul(2).ok_or(InstallError::Capacity)?)
            .map_err(capacity)?;
        let owners = current
            .map(|root| -> Result<_, InstallError> {
                let mut owners = IndexMap::with_capacity(root.len());
                for (actor, rows) in root {
                    let policy = policy.ok_or(InstallError::CurrentFormat)?;
                    if !has_actor(&actor) || !policy.collection_fits(rows.len()) {
                        return Err(InstallError::CurrentFormat);
                    }
                    let mut funded = IndexMap::with_capacity(rows.len());
                    for (id, marker) in rows {
                        if id != marker.id || !policy.authorizes(&marker) {
                            return Err(InstallError::CurrentFormat);
                        }
                        let storage = budget
                            .reserve_record(marker.heap_bytes().ok_or(InstallError::Capacity)?)
                            .map_err(capacity)?;
                        funded.insert(id, MarkerEntry { marker, storage });
                    }
                    owners.insert(actor, funded);
                }
                Ok(owners)
            })
            .transpose()?;
        let mut installed = Self { owners, metadata };
        installed
            .metadata
            .resize(installed.owned_bytes().ok_or(InstallError::Capacity)?)
            .map_err(capacity)?;
        Ok(installed)
    }
    fn owned_bytes(&self) -> Option<usize> {
        self.owners.as_ref().map_or(Some(0), |root| {
            root.iter().try_fold(
                map_storage::<String, Marks>(root.capacity())?,
                |bytes, (owner, rows)| {
                    heap_sum([
                        bytes,
                        owner.capacity(),
                        map_storage::<String, MarkerEntry>(rows.capacity())?,
                        rows.keys()
                            .try_fold(0usize, |n, id| n.checked_add(id.capacity()))?,
                    ])
                },
            )
        })
    }
    fn backing_for(&self, actor: &str) -> Result<usize, ExecutionError> {
        self.owners
            .as_ref()
            .map_or(Some(0), |root| {
                let headers = map_storage::<String, Marks>(root.capacity())?;
                match root.get_key_value(actor) {
                    None => Some(headers),
                    Some((owner, rows)) => heap_sum([
                        headers,
                        owner.capacity(),
                        map_storage::<String, MarkerEntry>(rows.capacity())?,
                        rows.keys()
                            .try_fold(0usize, |n, id| n.checked_add(id.capacity()))?,
                    ]),
                }
            })
            .ok_or(ExecutionError::Capacity)
    }
    fn settle_backing(&mut self, base: usize, actor: &str) -> Result<(), ExecutionError> {
        let target = base
            .checked_add(self.backing_for(actor)?)
            .ok_or(ExecutionError::Capacity)?;
        self.metadata.resize(target)?;
        Ok(())
    }
    pub(crate) fn as_ref(&self) -> Option<&Owners> {
        self.owners.as_ref()
    }
    pub(crate) fn is_some(&self) -> bool {
        self.owners.is_some()
    }
}

#[derive(Clone, Copy)]
pub(crate) struct MarkerCheckpoint(bool);

struct MarkerUndo {
    actor: String,
    id: String,
    owner_was_present: bool,
    root_was_present: bool,
    prior: PriorMarker,
    _scratch: ByteReservation,
}

enum PriorMarker {
    Missing,
    Replaced(MarkerEntry),
    Removed {
        ordinal: usize,
        value: MarkerEntry,
        key_custody: ResidentReservation,
    },
}
impl PriorMarker {
    fn entry(&self) -> Option<&MarkerEntry> {
        match self {
            Self::Missing => None,
            Self::Replaced(entry) | Self::Removed { value: entry, .. } => Some(entry),
        }
    }
}

/// A map edit touches one marker. Other simulation candidates keep the empty
/// journal and pay no marker scan or allocation. Associated note changes use
/// the existing knowledge journal.
#[derive(Default)]
pub(crate) struct MarkerJournal(Option<Box<MarkerUndo>>);
impl MarkerJournal {
    pub(crate) fn checkpoint(&self) -> MarkerCheckpoint {
        MarkerCheckpoint(self.0.is_some())
    }
    pub(crate) fn rollback_to(
        &mut self,
        state: &mut MapMarkers,
        checkpoint: MarkerCheckpoint,
    ) -> Result<(), ExecutionError> {
        if checkpoint.0 {
            return self
                .0
                .is_some()
                .then_some(())
                .ok_or(ExecutionError::Invariant);
        }
        let Some(change) = self.0.take() else {
            return Ok(());
        };
        let base = state
            .metadata
            .bytes()
            .checked_sub(state.backing_for(&change.actor)?)
            .ok_or(ExecutionError::Invariant)?;
        let root = state.owners.as_mut().ok_or(ExecutionError::Invariant)?;
        let rows = root
            .get_mut(&change.actor)
            .ok_or(ExecutionError::Invariant)?;
        match change.prior {
            PriorMarker::Missing => {
                rows.shift_remove(&change.id);
            }
            PriorMarker::Replaced(prior) => {
                *rows.get_mut(&change.id).ok_or(ExecutionError::Invariant)? = prior;
            }
            PriorMarker::Removed {
                ordinal,
                value,
                key_custody,
            } => {
                state.metadata.merge(key_custody)?;
                rows.shift_insert(ordinal, change.id, value);
            }
        }
        if !change.owner_was_present {
            root.shift_remove(&change.actor);
        }
        if !change.root_was_present {
            state.owners = None;
        }
        state.settle_backing(base, &change.actor)?;
        Ok(())
    }

    pub(super) fn change(
        &mut self,
        state: &mut MapMarkers,
        actor: &str,
        id: &str,
        next: Option<(MapMarker, ByteReservation)>,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        if self.0.is_some() {
            return Err(ExecutionError::Invariant);
        }
        let base = state
            .metadata
            .bytes()
            .checked_sub(state.backing_for(actor)?)
            .ok_or(ExecutionError::Invariant)?;
        let root = state.owners.as_ref();
        let rows = root.and_then(|root| root.get(actor));
        let existing = rows.and_then(|rows| rows.get_full(id));
        if let Some((_, _, value)) = existing {
            budget.retain_record(&value.storage)?;
        }
        let next = next
            .map(|(marker, storage)| {
                budget
                    .adopt_record(storage)
                    .map(|storage| MarkerEntry { marker, storage })
            })
            .transpose()?;
        let adds_owner = rows.is_none();
        let adds_key = existing.is_none();
        let root_growth = if adds_owner && root.is_none_or(|root| root.len() == root.capacity()) {
            map_storage::<String, Marks>(root.map_or(3, |root| ((root.len() + 1) * 2).max(3)))
                .ok_or(ExecutionError::Capacity)?
        } else {
            0
        };
        let marks_growth = if adds_key && rows.is_none_or(|rows| rows.len() == rows.capacity()) {
            map_storage::<String, MarkerEntry>(rows.map_or(3, |rows| ((rows.len() + 1) * 2).max(3)))
                .ok_or(ExecutionError::Capacity)?
        } else {
            0
        };
        let scratch = budget.reserve(
            heap_sum([size_of::<MarkerUndo>(), actor.len(), id.len()])
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut change = Box::new(MarkerUndo {
            actor: actor.into(),
            id: id.into(),
            owner_was_present: !adds_owner,
            root_was_present: root.is_some(),
            prior: PriorMarker::Missing,
            _scratch: scratch,
        });
        let high = heap_sum([
            state.metadata.bytes(),
            root_growth,
            marks_growth,
            if adds_owner { actor.len() } else { 0 },
            if adds_key { id.len() } else { 0 },
        ])
        .ok_or(ExecutionError::Capacity)?;
        budget.resize_backing(&mut state.metadata, high)?;
        let removed_custody = if next.is_none() {
            let (_, key, _) = existing.ok_or(ExecutionError::Invariant)?;
            Some(state.metadata.split_off(key.capacity())?)
        } else {
            None
        };
        let root = state.owners.get_or_insert_with(IndexMap::new);
        if adds_owner {
            if root.try_reserve(1).is_err() {
                if !change.root_was_present {
                    state.owners = None;
                }
                state.settle_backing(base, actor)?;
                return Err(ExecutionError::Capacity);
            }
            let mut rows = IndexMap::new();
            if rows.try_reserve(1).is_err() {
                if !change.root_was_present {
                    state.owners = None;
                }
                state.settle_backing(base, actor)?;
                return Err(ExecutionError::Capacity);
            }
            root.insert(actor.into(), rows);
        }
        let rows = root.get_mut(actor).ok_or(ExecutionError::Invariant)?;
        if adds_key && !adds_owner && rows.try_reserve(1).is_err() {
            state.settle_backing(base, actor)?;
            return Err(ExecutionError::Capacity);
        }
        change.prior = match next {
            Some(next) => match rows.get_mut(id) {
                Some(selected) => PriorMarker::Replaced(std::mem::replace(selected, next)),
                None => {
                    rows.insert(id.into(), next);
                    PriorMarker::Missing
                }
            },
            None => {
                let (ordinal, key, value) = rows
                    .shift_remove_full(id)
                    .ok_or(ExecutionError::Invariant)?;
                change.id = key;
                PriorMarker::Removed {
                    ordinal,
                    value,
                    key_custody: removed_custody.ok_or(ExecutionError::Invariant)?,
                }
            }
        };
        self.0 = Some(change);
        state.settle_backing(base, actor)?;
        Ok(())
    }

    pub(crate) fn encode_changes(
        &self,
        state: &MapMarkers,
        schema: &crate::records::RecordSchema,
        ledger: &crate::records::RecordLedger,
        output: &mut RowEncoder<'_>,
        budget: &ByteBudget,
    ) -> Result<(), RecordEncodingError> {
        let Some(change) = &self.0 else { return Ok(()) };
        let storage = heap_sum([
            map_storage::<&str, bool>(1).unwrap_or(0),
            map_storage::<&str, Option<&MarkerEntry>>(1).unwrap_or(0),
        ])
        .ok_or(RecordEncodingError("Map marker save capacity."))?;
        let _scratch = budget
            .reserve(storage)
            .map_err(|_| RecordEncodingError("Map marker save capacity."))?;
        encode_marked_owners(
            ledger,
            "mind_map_markers_owners",
            "mapMarkers",
            &IndexMap::from([(change.actor.as_str(), change.owner_was_present)]),
            state.as_ref(),
            false,
            false,
            output,
            budget,
        )?;
        encode_sparse_map_changes(
            schema,
            ledger,
            "mind_map_markers",
            &["world", "mapMarkers", &change.actor],
            None,
            &IndexMap::from([(change.id.as_str(), change.prior.entry())]),
            state.as_ref().and_then(|owners| owners.get(&change.actor)),
            false,
            |_| {
                Ok((
                    Vec::new(),
                    budget
                        .reserve(0)
                        .map_err(|_| RecordEncodingError("Map marker save capacity."))?,
                ))
            },
            output,
            budget,
        )
    }
}
