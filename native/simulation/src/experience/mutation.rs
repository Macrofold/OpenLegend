//! One personal source placement owner. New immutable body/header/columns enter
//! together; nested rollback removes only that append and restores its ordinal.

use super::*;
use crate::host::retained_size::HeapBytes;
use crate::host::{ByteBudget, ByteReservation};
use std::mem::{align_of, size_of};

#[derive(Clone, Copy)]
pub(crate) struct ExperienceCheckpoint {
    operations: usize,
}
pub(super) struct AppendUndo {
    actor_id: String,
    kind: PersonalSourceKind,
    id: String,
    position: u64,
    next_ordinal: u64,
}
pub(super) enum ExperienceUndo {
    Append(AppendUndo),
    Replace {
        actor_id: String,
        kind: PersonalSourceKind,
        id: String,
        position: u64,
        before: Arc<PersonalSourceRecord>,
    },
    KnownPlaces {
        actor_id: String,
        before: Option<super::places::KnownPlacePreparation>,
    },
    Collection {
        actor_id: String,
        kind: PersonalSourceKind,
        owner_next: u64,
        new_actor: bool,
    },
}
pub(crate) struct ExperienceJournal {
    pub(super) undo: Vec<ExperienceUndo>,
    pub(super) reservation: ByteReservation,
}
impl ExperienceJournal {
    pub(crate) fn new(budget: &ByteBudget) -> Result<Self, ExperienceError> {
        Ok(Self {
            undo: Vec::new(),
            reservation: budget
                .reserve(size_of::<Self>())
                .map_err(|_| ExperienceError::Capacity)?,
        })
    }
    pub(crate) fn checkpoint(&self) -> ExperienceCheckpoint {
        ExperienceCheckpoint {
            operations: self.undo.len(),
        }
    }
    pub(crate) fn rollback_to(
        &mut self,
        state: &mut ExperienceState,
        checkpoint: ExperienceCheckpoint,
    ) -> Result<(), ExperienceError> {
        if checkpoint.operations > self.undo.len() {
            return Err(ExperienceError::StaleHydration);
        }
        while self.undo.len() > checkpoint.operations {
            let operation = self.undo.pop().expect("journal cursor checked");
            let undo = match operation {
                ExperienceUndo::Append(undo) => undo,
                ExperienceUndo::Replace {
                    actor_id,
                    kind,
                    id,
                    position,
                    before,
                } => {
                    let actor = state
                        .actors
                        .get_mut(&actor_id)
                        .ok_or(ExperienceError::ForeignOwner)?;
                    let current = actor
                        .sources
                        .get(&kind)
                        .and_then(|source| source.by_ordinal.get(&position))
                        .ok_or(ExperienceError::InvalidOrdinal)?;
                    if current.header.reference.id != id {
                        return Err(ExperienceError::InvalidOrdinal);
                    }
                    let current_event = current.header.completion_event_type.clone();
                    replace_completion(
                        actor,
                        current_event.as_deref(),
                        before.header.completion_event_type.as_deref(),
                    )?;
                    actor
                        .sources
                        .get_mut(&kind)
                        .ok_or(ExperienceError::UnknownCoverage)?
                        .by_ordinal
                        .insert(position, before);
                    continue;
                }
                ExperienceUndo::KnownPlaces { actor_id, before } => {
                    if let Some(before) = before {
                        state.known_places.insert(actor_id, before);
                    } else {
                        state.known_places.shift_remove(&actor_id);
                    }
                    continue;
                }
                ExperienceUndo::Collection {
                    actor_id,
                    kind,
                    owner_next,
                    new_actor,
                } => {
                    let actor = state
                        .actors
                        .get_mut(&actor_id)
                        .ok_or(ExperienceError::ForeignOwner)?;
                    let collection = actor
                        .sources
                        .shift_remove(&kind)
                        .ok_or(ExperienceError::UnknownCoverage)?;
                    if !collection.by_ordinal.is_empty() || !collection.lookup.is_empty() {
                        return Err(ExperienceError::InvalidOrdinal);
                    }
                    let owners = state
                        .owner_maps
                        .get_mut(&kind)
                        .ok_or(ExperienceError::UnknownCoverage)?;
                    if owners.placements.shift_remove(&actor_id) != Some(owner_next) {
                        return Err(ExperienceError::InvalidOrdinal);
                    }
                    owners.coverage.next_ordinal = owner_next;
                    if new_actor {
                        if !actor.sources.is_empty() {
                            return Err(ExperienceError::UnknownCoverage);
                        }
                        state.actors.shift_remove(&actor_id);
                    }
                    continue;
                }
            };
            let actor = state
                .actors
                .get_mut(&undo.actor_id)
                .ok_or(ExperienceError::ForeignOwner)?;
            let source = actor
                .sources
                .get_mut(&undo.kind)
                .ok_or(ExperienceError::UnknownCoverage)?;
            if source.lookup.remove(&undo.id) != Some(undo.position) {
                return Err(ExperienceError::InvalidOrdinal);
            }
            let record = source
                .by_ordinal
                .remove(&undo.position)
                .ok_or(ExperienceError::InvalidOrdinal)?;
            if let Some(event_type) = &record.header.completion_event_type {
                let count = actor
                    .completion_events
                    .get_mut(event_type)
                    .ok_or(ExperienceError::InvalidOrdinal)?;
                *count = count
                    .checked_sub(1)
                    .ok_or(ExperienceError::InvalidOrdinal)?;
                if *count == 0 {
                    actor.completion_events.remove(event_type);
                }
            }
            source.coverage.next_ordinal = undo.next_ordinal;
        }
        Ok(())
    }
    pub(crate) fn discard_undo(&mut self) -> Result<(), ExperienceError> {
        self.undo.clear();
        self.reservation
            .resize(size_of::<Self>() + self.undo.capacity() * size_of::<ExperienceUndo>())
            .map_err(|_| ExperienceError::Capacity)
    }
    pub(super) fn ensure_collection(
        &mut self,
        state: &mut ExperienceState,
        kind: PersonalSourceKind,
        actor_id: &str,
    ) -> Result<(), ExperienceError> {
        if state
            .actors
            .get(actor_id)
            .is_some_and(|actor| actor.sources.contains_key(&kind))
        {
            return Ok(());
        }
        let owners = state
            .owner_maps
            .get(&kind)
            .ok_or(ExperienceError::UnknownCoverage)?;
        if !owners.coverage.parent_present
            || !owners.coverage.complete
            || owners.placements.contains_key(actor_id)
            || !is_safe_record_id(actor_id)
        {
            return Err(ExperienceError::UnknownCoverage);
        }
        let owner_next = owners.coverage.next_ordinal;
        let next = owner_next
            .checked_add(1)
            .filter(|n| *n <= MAX_SAFE_INTEGER)
            .ok_or(ExperienceError::InvalidOrdinal)?;
        let new_actor = !state.actors.contains_key(actor_id);
        let metadata = std::mem::size_of::<PersonalHistory>()
            + std::mem::size_of::<PersonalSourceCollection>()
            + std::mem::size_of::<ActorPrivacy>()
            + 3 * std::mem::size_of::<ExperienceUndo>();
        let map_growth = crate::host::retained_size::map_storage::<String, PersonalHistory>(
            state
                .actors
                .capacity()
                .checked_mul(2)
                .and_then(|n| n.checked_add(2))
                .ok_or(ExperienceError::Capacity)?,
        )
        .ok_or(ExperienceError::Capacity)?
        .checked_add(
            crate::host::retained_size::map_storage::<String, u64>(
                owners
                    .placements
                    .capacity()
                    .checked_mul(2)
                    .and_then(|n| n.checked_add(2))
                    .ok_or(ExperienceError::Capacity)?,
            )
            .ok_or(ExperienceError::Capacity)?,
        )
        .ok_or(ExperienceError::Capacity)?;
        self.reservation
            .resize(
                self.reservation
                    .bytes()
                    .checked_add(metadata)
                    .and_then(|n| n.checked_add(map_growth))
                    .and_then(|n| n.checked_add(actor_id.len().checked_mul(5)?))
                    .ok_or(ExperienceError::Capacity)?,
            )
            .map_err(|_| ExperienceError::Capacity)?;
        self.undo
            .try_reserve(1)
            .map_err(|_| ExperienceError::Capacity)?;
        state
            .actors
            .try_reserve(usize::from(new_actor))
            .map_err(|_| ExperienceError::Capacity)?;
        state
            .owner_maps
            .get_mut(&kind)
            .ok_or(ExperienceError::UnknownCoverage)?
            .placements
            .try_reserve(1)
            .map_err(|_| ExperienceError::Capacity)?;
        let mut collection = Some(PersonalSourceCollection {
            kind,
            actor_id: actor_id.to_owned(),
            by_ordinal: BTreeMap::new(),
            lookup: BTreeMap::new(),
            coverage: SourceCoverage {
                complete: true,
                next_ordinal: 0,
                parent_present: true,
            },
        });
        let prepared_history = if new_actor {
            let mut history = PersonalHistory::install(
                Vec::new(),
                ActorPrivacy::install(Vec::new(), IndexMap::new(), None)?,
                None,
            )?;
            history
                .sources
                .try_reserve(1)
                .map_err(|_| ExperienceError::Capacity)?;
            history
                .sources
                .insert(kind, collection.take().expect("prepared collection"));
            Some(history)
        } else {
            let actor = state
                .actors
                .get_mut(actor_id)
                .ok_or(ExperienceError::ForeignOwner)?;
            actor
                .sources
                .try_reserve(1)
                .map_err(|_| ExperienceError::Capacity)?;
            None
        };
        // All fallible allocation and canonical-owner checks precede mutation.
        if let Some(history) = prepared_history {
            state.actors.insert(actor_id.to_owned(), history);
        } else {
            state
                .actors
                .get_mut(actor_id)
                .expect("existing actor checked")
                .sources
                .insert(kind, collection.take().expect("prepared collection"));
        }
        let owners = state
            .owner_maps
            .get_mut(&kind)
            .expect("actual map owner checked");
        owners.placements.insert(actor_id.to_owned(), owner_next);
        owners.coverage.next_ordinal = next;
        self.undo.push(ExperienceUndo::Collection {
            actor_id: actor_id.to_owned(),
            kind,
            owner_next,
            new_actor,
        });
        Ok(())
    }
    pub(crate) fn created_collections<'a>(
        &'a self,
    ) -> impl Iterator<Item = (PersonalSourceKind, &'a str, u64)> + 'a {
        self.undo.iter().filter_map(|operation| match operation {
            ExperienceUndo::Collection {
                actor_id,
                kind,
                owner_next,
                ..
            } => Some((*kind, actor_id.as_str(), *owner_next)),
            _ => None,
        })
    }
    /// Account admission/counters and original reception are completed by the
    /// same enclosing semantic producer before this immutable placement.
    pub(super) fn append(
        &mut self,
        state: &mut ExperienceState,
        record: PersonalSourceRecord,
    ) -> Result<(), ExperienceError> {
        let header = &record.header;
        let actor = state
            .actors
            .get(&header.actor_id)
            .ok_or(ExperienceError::ForeignOwner)?;
        let source = actor.collection(header.reference.kind)?;
        if actor.privacy.forgotten_index.contains(&header.reference.id)
            || header
                .event_id
                .as_ref()
                .is_some_and(|id| actor.privacy.forgotten_index.contains(id))
        {
            return Err(ExperienceError::Revoked);
        }
        if !source.coverage.parent_present
            || source.lookup.contains_key(&header.reference.id)
            || record.position != source.coverage.next_ordinal
            || record.slot != record.position.to_string()
            || source.by_ordinal.contains_key(&record.position)
        {
            return Err(ExperienceError::InvalidOrdinal);
        }
        let next = source
            .coverage
            .next_ordinal
            .checked_add(1)
            .filter(|n| *n <= MAX_SAFE_INTEGER)
            .ok_or(ExperienceError::InvalidOrdinal)?;
        let index_node = 11 * (size_of::<String>() + size_of::<u64>()) + 16 * size_of::<usize>();
        let bytes = retained_bytes(&record)
            .and_then(|n| n.checked_add(index_node.checked_mul(3)?))
            .and_then(|n| n.checked_add(2 * size_of::<ExperienceUndo>()))
            .and_then(|n| n.checked_add(header.actor_id.len()))
            .and_then(|n| n.checked_add(header.reference.id.len().checked_mul(2)?))
            .and_then(|n| n.checked_add(self.reservation.bytes()))
            .ok_or(ExperienceError::Capacity)?;
        self.reservation
            .resize(bytes)
            .map_err(|_| ExperienceError::Capacity)?;
        self.undo
            .try_reserve(1)
            .map_err(|_| ExperienceError::Capacity)?;
        let undo = AppendUndo {
            actor_id: header.actor_id.clone(),
            kind: header.reference.kind,
            id: header.reference.id.clone(),
            position: record.position,
            next_ordinal: source.coverage.next_ordinal,
        };
        let actor = state
            .actors
            .get_mut(&undo.actor_id)
            .ok_or(ExperienceError::ForeignOwner)?;
        if let Some(event_type) = &header.completion_event_type {
            let count = actor
                .completion_events
                .entry(event_type.clone())
                .or_insert(0);
            *count = count
                .checked_add(1)
                .ok_or(ExperienceError::InvalidOrdinal)?;
        }
        let source = actor
            .sources
            .get_mut(&undo.kind)
            .ok_or(ExperienceError::UnknownCoverage)?;
        source.coverage.next_ordinal = next;
        source.lookup.insert(undo.id.clone(), undo.position);
        source.by_ordinal.insert(undo.position, Arc::new(record));
        self.undo.push(ExperienceUndo::Append(undo));
        Ok(())
    }
    /// Replace one immutable body/header/SQL projection at its existing source
    /// ordinal. The caller performs actual accounting and cognition duties in
    /// the same candidate; this owner changes no unrelated retained history.
    pub(super) fn replace(
        &mut self,
        state: &mut ExperienceState,
        expected: &PersonalSourceRef,
        record: PersonalSourceRecord,
    ) -> Result<(), ExperienceError> {
        let actor = state
            .actors
            .get(&record.header.actor_id)
            .ok_or(ExperienceError::ForeignOwner)?;
        let source = actor.collection(expected.kind)?;
        let before = source
            .get(&expected.id)?
            .ok_or(ExperienceError::StaleHydration)?;
        if &before.header.reference != expected
            || record.header.reference.kind != expected.kind
            || record.header.reference.id != expected.id
            || record.row_id != before.row_id
            || record.parent != before.parent
            || record.slot != before.slot
            || record.position != before.position
        {
            return Err(ExperienceError::StaleHydration);
        }
        let index_node = 11 * (size_of::<String>() + size_of::<u64>()) + 16 * size_of::<usize>();
        let bytes = retained_bytes(&record)
            .and_then(|bytes| bytes.checked_add(retained_bytes(before)?))
            .and_then(|bytes| bytes.checked_add(self.reservation.bytes()))
            .and_then(|bytes| bytes.checked_add(2 * size_of::<ExperienceUndo>() + 2 * index_node))
            .and_then(|bytes| bytes.checked_add(record.header.actor_id.len()))
            .and_then(|bytes| bytes.checked_add(record.header.reference.id.len()))
            .and_then(|bytes| {
                bytes.checked_add(
                    record
                        .header
                        .completion_event_type
                        .as_ref()
                        .map_or(0, String::len),
                )
            })
            .and_then(|bytes| {
                bytes.checked_add(
                    before
                        .header
                        .completion_event_type
                        .as_ref()
                        .map_or(0, String::len),
                )
            })
            .ok_or(ExperienceError::Capacity)?;
        self.reservation
            .resize(bytes)
            .map_err(|_| ExperienceError::Capacity)?;
        self.undo
            .try_reserve(1)
            .map_err(|_| ExperienceError::Capacity)?;
        let undo = ExperienceUndo::Replace {
            actor_id: record.header.actor_id.clone(),
            kind: expected.kind,
            id: expected.id.clone(),
            position: record.position,
            before: Arc::clone(before),
        };
        let old_event = before.header.completion_event_type.clone();
        let actor = state
            .actors
            .get_mut(&record.header.actor_id)
            .ok_or(ExperienceError::ForeignOwner)?;
        replace_completion(
            actor,
            old_event.as_deref(),
            record.header.completion_event_type.as_deref(),
        )?;
        actor
            .sources
            .get_mut(&expected.kind)
            .ok_or(ExperienceError::UnknownCoverage)?
            .by_ordinal
            .insert(record.position, Arc::new(record));
        self.undo.push(undo);
        Ok(())
    }
    pub(crate) fn replaced<'a>(
        &'a self,
        state: &'a ExperienceState,
    ) -> impl Iterator<Item = &'a Arc<PersonalSourceRecord>> {
        self.undo.iter().filter_map(|operation| {
            let ExperienceUndo::Replace {
                actor_id,
                kind,
                position,
                ..
            } = operation
            else {
                return None;
            };
            state
                .actors
                .get(actor_id)?
                .sources
                .get(kind)?
                .by_ordinal
                .get(position)
        })
    }
    pub(crate) fn appended<'a>(
        &'a self,
        state: &'a ExperienceState,
    ) -> impl Iterator<Item = &'a Arc<PersonalSourceRecord>> {
        self.undo.iter().filter_map(|operation| {
            let ExperienceUndo::Append(undo) = operation else {
                return None;
            };
            state
                .actors
                .get(&undo.actor_id)?
                .sources
                .get(&undo.kind)?
                .by_ordinal
                .get(&undo.position)
        })
    }
}

fn replace_completion(
    actor: &mut PersonalHistory,
    before: Option<&str>,
    after: Option<&str>,
) -> Result<(), ExperienceError> {
    if before == after {
        return Ok(());
    }
    if before.is_some_and(|event| {
        actor
            .completion_events
            .get(event)
            .is_none_or(|count| *count == 0)
    }) || after.is_some_and(|event| {
        actor.completion_events.get(event).copied().unwrap_or(0) >= MAX_SAFE_INTEGER
    }) {
        return Err(ExperienceError::InvalidOrdinal);
    }
    if let Some(event) = before {
        let count = actor
            .completion_events
            .get_mut(event)
            .expect("checked completion count");
        *count -= 1;
        if *count == 0 {
            actor.completion_events.remove(event);
        }
    }
    if let Some(event) = after {
        if let Some(count) = actor.completion_events.get_mut(event) {
            *count += 1
        } else {
            actor.completion_events.insert(event.to_owned(), 1);
        }
    }
    Ok(())
}

fn receipt_heap(value: &TemporalReceiptLocator) -> Option<usize> {
    value
        .actor_id
        .capacity()
        .checked_add(value.epoch.capacity())
}
fn retained_bytes(record: &PersonalSourceRecord) -> Option<usize> {
    let mut bytes = size_of::<PersonalSourceRecord>()
        .checked_add(2 * size_of::<usize>() + align_of::<PersonalSourceRecord>() - 1)?;
    for text in [
        &record.row_id,
        &record.parent,
        &record.slot,
        &record.header.reference.id,
        &record.header.reference.revision,
        &record.header.actor_id,
    ] {
        bytes = bytes.checked_add(text.capacity())?;
    }
    bytes = bytes
        .checked_add(record.payload.len())?
        .checked_add(2 * size_of::<usize>())?;
    bytes = bytes
        .checked_add(record.columns.len().checked_mul(size_of::<Value>())?)?
        .checked_add(2 * size_of::<usize>())?;
    for cell in record.columns.iter() {
        bytes = bytes.checked_add(crate::records::save::cell_heap(cell)?)?;
    }
    for text in [
        &record.header.event_id,
        &record.header.activity_id,
        &record.header.record_kind,
        &record.header.source,
        &record.header.completion_event_type,
    ]
    .into_iter()
    .flatten()
    {
        bytes = bytes.checked_add(text.capacity())?;
    }
    for values in [
        &record.header.owned_observations,
        &record.header.dependencies,
    ] {
        bytes = bytes.checked_add(values.heap_bytes()?)?;
    }
    if let Some(receipt) = &record.header.source_receipt {
        bytes = bytes.checked_add(receipt_heap(receipt)?)?;
    }
    if let Some(receipt) = record
        .header
        .retention
        .as_ref()
        .and_then(|retention| retention.receipt.as_ref())
    {
        bytes = bytes.checked_add(receipt_heap(receipt)?)?;
    }
    Some(bytes)
}
