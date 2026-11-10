//! One personal source placement owner. New immutable body/header/columns enter
//! together; nested rollback removes only that append and restores its ordinal.

use super::*;
use crate::host::retained_size::HeapBytes;
use crate::host::{ByteBudget, ByteReservation};
use std::mem::{align_of, size_of};
mod changes;
pub(in crate::experience) use changes::PersonalChanges;

#[derive(Clone, Copy)]
pub(crate) struct ExperienceCheckpoint {
    operations: usize,
}
pub(super) struct AppendUndo {
    pub(super) actor_id: String,
    pub(super) kind: PersonalSourceKind,
    pub(super) id: String,
    pub(super) position: u64,
    pub(super) next_ordinal: u64,
}
impl AppendUndo {
    pub(super) fn source_key(&self) -> (&str, PersonalSourceKind, &str) {
        (&self.actor_id, self.kind, &self.id)
    }
}
pub(super) enum ExperienceUndo {
    SummaryCollection {
        actor: String,
        before: PersonalSourceCollection,
    },
    ConsolidatedAt {
        actor: String,
        before: Option<f64>,
    },
    Append(AppendUndo),
    Loaded(AppendUndo),
    Remove {
        actor_id: String,
        kind: PersonalSourceKind,
        before: Arc<PersonalSourceRecord>,
    },
    Header {
        before: ExperienceHeader,
        payload: Arc<str>,
        storage: crate::host::ResidentReservation,
    },
    Privacy(super::privacy_mutation::PrivacyUndo),
    Replace {
        actor_id: String,
        kind: PersonalSourceKind,
        id: String,
        position: u64,
        next_ordinal: u64,
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
    budget: ByteBudget,
}
impl ExperienceJournal {
    /// Admit only this operation's new payload and actual geometric undo growth.
    /// Recharging the already owned capacity per edit would make a linear
    /// privacy closure consume a quadratic allowance.
    pub(super) fn prepare_undo(&mut self, bytes: usize) -> Result<(), ExperienceError> {
        let capacity = self.undo.capacity();
        let target = if self.undo.len() == capacity {
            capacity
                .checked_mul(2)
                .and_then(|n| n.checked_add(usize::from(capacity == 0) * 4))
                .ok_or(ExperienceError::Capacity)?
        } else {
            capacity
        };
        let growth = target
            .checked_sub(capacity)
            .and_then(|n| n.checked_mul(size_of::<ExperienceUndo>()))
            .ok_or(ExperienceError::Capacity)?;
        self.reservation
            .resize(
                self.reservation
                    .bytes()
                    .checked_add(bytes)
                    .and_then(|n| n.checked_add(growth))
                    .ok_or(ExperienceError::Capacity)?,
            )
            .map_err(|_| ExperienceError::Capacity)?;
        if target > capacity {
            self.undo
                .try_reserve_exact(target - self.undo.len())
                .map_err(|_| ExperienceError::Capacity)?;
        }
        Ok(())
    }
    pub(crate) fn new(budget: &ByteBudget) -> Result<Self, ExperienceError> {
        Ok(Self {
            undo: Vec::new(),
            budget: budget.clone(),
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
                ExperienceUndo::SummaryCollection { actor, before } => {
                    *state
                        .actors
                        .get_mut(&actor)
                        .and_then(|a| a.sources.get_mut(&PersonalSourceKind::Summary))
                        .ok_or(ExperienceError::UnknownCoverage)? = before;
                    continue;
                }
                ExperienceUndo::ConsolidatedAt { actor, before } => {
                    state
                        .actors
                        .get_mut(&actor)
                        .ok_or(ExperienceError::ForeignOwner)?
                        .consolidated_at = before;
                    continue;
                }
                ExperienceUndo::Append(undo) | ExperienceUndo::Loaded(undo) => undo,
                ExperienceUndo::Header {
                    before,
                    payload,
                    storage,
                } => {
                    state.header = before;
                    state.header_payload = payload;
                    state.header_storage = storage;
                    continue;
                }
                ExperienceUndo::Privacy(undo) => {
                    undo.rollback(state, &mut self.reservation)?;
                    continue;
                }
                ExperienceUndo::Remove {
                    actor_id,
                    kind,
                    before,
                } => {
                    let actor = state
                        .actors
                        .get_mut(&actor_id)
                        .ok_or(ExperienceError::ForeignOwner)?;
                    let source = actor
                        .sources
                        .get_mut(&kind)
                        .ok_or(ExperienceError::UnknownCoverage)?;
                    if source.by_ordinal.contains_key(&before.position)
                        || source.lookup.contains_key(&before.header.reference.id)
                    {
                        return Err(ExperienceError::InvalidOrdinal);
                    }
                    adjust_agreements(source, false, before.header.agreement_body)?;
                    source
                        .lookup
                        .insert(before.header.reference.id.clone(), before.position);
                    source
                        .by_ordinal
                        .insert(before.position, Arc::clone(&before));
                    replace_completion(
                        actor,
                        None,
                        before.header.completion_event_type.as_deref(),
                    )?;
                    state.sensory.exchange(None, Some(&before));
                    continue;
                }
                ExperienceUndo::Replace {
                    actor_id,
                    kind,
                    id,
                    position,
                    next_ordinal,
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
                    let current_agreement = current.header.agreement_body;
                    let current_event = current.header.completion_event_type.clone();
                    state.sensory.exchange(Some(current), Some(&before));
                    replace_completion(
                        actor,
                        current_event.as_deref(),
                        before.header.completion_event_type.as_deref(),
                    )?;
                    let source = actor
                        .sources
                        .get_mut(&kind)
                        .ok_or(ExperienceError::UnknownCoverage)?;
                    adjust_agreements(source, current_agreement, before.header.agreement_body)?;
                    source.coverage.next_ordinal = next_ordinal;
                    source.by_ordinal.insert(position, before);
                    continue;
                }
                ExperienceUndo::KnownPlaces { actor_id, before } => {
                    let metadata = super::residency::MetadataBefore::capture(state, &actor_id)?;
                    let old_strings = state
                        .known_places
                        .get_key_value(&actor_id)
                        .map_or(0, |(k, _)| k.capacity());
                    let new_strings = if let Some(before) = before {
                        *state
                            .known_places
                            .get_mut(&actor_id)
                            .ok_or(ExperienceError::StaleHydration)? = before;
                        old_strings
                    } else {
                        state.known_places.shift_remove(&actor_id);
                        0
                    };
                    state.settle_metadata(
                        metadata,
                        &actor_id,
                        old_strings,
                        new_strings,
                        &mut self.reservation,
                    )?;
                    continue;
                }
                ExperienceUndo::Collection {
                    actor_id,
                    kind,
                    owner_next,
                    new_actor,
                } => {
                    let metadata_before =
                        super::residency::MetadataBefore::capture(state, &actor_id)?;
                    let old_strings = state
                        .owner_maps
                        .get(&kind)
                        .and_then(|o| o.placements.get_key_value(&actor_id))
                        .map(|(k, _)| k.capacity())
                        .and_then(|n| {
                            n.checked_add(
                                state
                                    .actors
                                    .get(&actor_id)?
                                    .sources
                                    .get(&kind)?
                                    .actor_id
                                    .capacity(),
                            )
                        })
                        .and_then(|n| {
                            n.checked_add(if new_actor {
                                state.actors.get_key_value(&actor_id)?.0.capacity()
                            } else {
                                0
                            })
                        })
                        .ok_or(ExperienceError::ForeignOwner)?;
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
                    drop(collection);
                    state.settle_metadata(
                        metadata_before,
                        &actor_id,
                        old_strings,
                        0,
                        &mut self.reservation,
                    )?;
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
            adjust_agreements(source, record.header.agreement_body, false)?;
            state.sensory.exchange(Some(&record), None);
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
        if self.undo.is_empty() {
            state.sensory.settle()?;
        }
        Ok(())
    }
    pub(crate) fn discard_undo(
        &mut self,
        state: &mut ExperienceState,
    ) -> Result<(), ExperienceError> {
        self.undo.clear();
        state.sensory.settle()?;
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
        let metadata_before = super::residency::MetadataBefore::capture(state, actor_id)?;
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
        let source_growth = crate::host::retained_size::map_storage::<
            PersonalSourceKind,
            PersonalSourceCollection,
        >(
            state
                .actors
                .get(actor_id)
                .map_or(0, |a| a.sources.capacity())
                .checked_add(1)
                .and_then(|n| n.checked_mul(2))
                .ok_or(ExperienceError::Capacity)?,
        )
        .ok_or(ExperienceError::Capacity)?;
        self.reservation
            .resize(
                self.reservation
                    .bytes()
                    .checked_add(source_growth)
                    .and_then(|n| n.checked_add(metadata))
                    .and_then(|n| n.checked_add(map_growth))
                    .and_then(|n| n.checked_add(actor_id.len().checked_mul(5)?))
                    .ok_or(ExperienceError::Capacity)?,
            )
            .map_err(|_| ExperienceError::Capacity)?;
        self.undo
            .try_reserve(1)
            .map_err(|_| ExperienceError::Capacity)?;
        state.fund_metadata(
            &mut self.reservation,
            map_growth
                .checked_add(source_growth)
                .and_then(|n| n.checked_add(actor_id.len() * (2 + usize::from(new_actor))))
                .ok_or(ExperienceError::Capacity)?,
        )?;
        let prepared = (|| -> Result<_, ExperienceError> {
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
                agreement_body_count: 0,
                current_open_heads_selected: false,
                sensory_selected: false,
                unresolved_selected: false,
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
            Ok((collection, prepared_history))
        })();
        let (mut collection, prepared_history) = match prepared {
            Ok(prepared) => prepared,
            Err(error) => {
                state.settle_metadata(metadata_before, actor_id, 0, 0, &mut self.reservation)?;
                return Err(error);
            }
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
        state.settle_metadata(
            metadata_before,
            actor_id,
            0,
            actor_id.len() * (2 + usize::from(new_actor)),
            &mut self.reservation,
        )?;
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
        self.all_personal_changes().created_collections()
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
        let bytes = (2 * size_of::<ExperienceUndo>())
            .checked_add(header.actor_id.len())
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
        let record = Arc::new(record);
        state.sensory.prepare_exchange(None, Some(&record))?;
        let header = &record.header;
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
        adjust_agreements(source, false, record.header.agreement_body)?;
        source.coverage.next_ordinal = next;
        source.lookup.insert(undo.id.clone(), undo.position);
        state.sensory.exchange(None, Some(&record));
        source.by_ordinal.insert(undo.position, record);
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
            || record.position != before.position
        {
            return Err(ExperienceError::StaleHydration);
        }
        // Cold expiry reintroduces a missing list member at the captured append
        // slot, while the retirement proof preserves its original SQL ordinal.
        // A later ordinary replacement may use that original ordinal again.
        let slot = record
            .slot
            .parse::<u64>()
            .map_err(|_| ExperienceError::InvalidOrdinal)?;
        if record.slot != before.slot
            && slot != record.position
            && slot != source.coverage.next_ordinal
        {
            return Err(ExperienceError::InvalidOrdinal);
        }
        let next_ordinal = if slot == source.coverage.next_ordinal {
            slot.checked_add(1)
                .filter(|next| *next <= MAX_SAFE_INTEGER)
                .ok_or(ExperienceError::InvalidOrdinal)?
        } else {
            source.coverage.next_ordinal
        };
        self.budget
            .retain_record(&before._storage)
            .map_err(|_| ExperienceError::Capacity)?;
        let bytes = (2 * size_of::<ExperienceUndo>())
            .checked_add(record.header.actor_id.len())
            .and_then(|n| n.checked_add(record.header.reference.id.len()))
            .and_then(|n| {
                n.checked_add(
                    before
                        .header
                        .completion_event_type
                        .as_ref()
                        .map_or(0, String::len),
                )
            })
            .and_then(|n| n.checked_add(self.reservation.bytes()))
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
            next_ordinal: source.coverage.next_ordinal,
            before: Arc::clone(before),
        };
        let old_agreement = before.header.agreement_body;
        let old_event = before.header.completion_event_type.clone();
        let before = Arc::clone(before);
        let record = Arc::new(record);
        state
            .sensory
            .prepare_exchange(Some(&before), Some(&record))?;
        let actor = state
            .actors
            .get_mut(&record.header.actor_id)
            .ok_or(ExperienceError::ForeignOwner)?;
        replace_completion(
            actor,
            old_event.as_deref(),
            record.header.completion_event_type.as_deref(),
        )?;
        state.sensory.exchange(Some(&before), Some(&record));
        let source = actor
            .sources
            .get_mut(&expected.kind)
            .ok_or(ExperienceError::UnknownCoverage)?;
        adjust_agreements(source, old_agreement, record.header.agreement_body)?;
        source.coverage.next_ordinal = next_ordinal;
        source.by_ordinal.insert(record.position, record);
        self.undo.push(undo);
        Ok(())
    }
    /// Remove one actual resident source without reindexing surviving history.
    /// The caller owns privacy/retention policy and the same account charges.
    pub(super) fn remove(
        &mut self,
        state: &mut ExperienceState,
        actor_id: &str,
        kind: PersonalSourceKind,
        id: &str,
    ) -> Result<bool, ExperienceError> {
        let Some(source) = state.optional_collection(actor_id, kind)? else {
            return Ok(false);
        };
        let Some(record) = source.get(id)? else {
            return Ok(false);
        };
        self.budget
            .retain_record(&record._storage)
            .map_err(|_| ExperienceError::Capacity)?;
        let before = Arc::clone(record);
        let bytes = actor_id
            .len()
            .checked_add(id.len())
            .and_then(|bytes| {
                bytes
                    .checked_add(
                        crate::host::retained_size::tree_node_bound::<String, u64>()?
                            .checked_mul(2)?,
                    )?
                    .checked_add(crate::host::retained_size::tree_node_bound::<
                        u64,
                        Arc<PersonalSourceRecord>,
                    >()?)?
                    .checked_add(
                        before
                            .header
                            .completion_event_type
                            .as_ref()
                            .map_or(0, String::len),
                    )
            })
            .ok_or(ExperienceError::Capacity)?;
        self.prepare_undo(bytes)?;
        let undo = ExperienceUndo::Remove {
            actor_id: actor_id.to_owned(),
            kind,
            before: Arc::clone(&before),
        };
        let actor = state
            .actors
            .get_mut(actor_id)
            .ok_or(ExperienceError::ForeignOwner)?;
        let source = actor
            .sources
            .get_mut(&kind)
            .ok_or(ExperienceError::UnknownCoverage)?;
        if source.lookup.remove(id) != Some(before.position)
            || source.by_ordinal.remove(&before.position).is_none()
        {
            return Err(ExperienceError::InvalidOrdinal);
        }
        adjust_agreements(source, before.header.agreement_body, false)?;
        replace_completion(actor, before.header.completion_event_type.as_deref(), None)?;
        state.sensory.exchange(Some(&before), None);
        self.undo.push(undo);
        Ok(true)
    }
    pub(super) fn removed(&self) -> impl DoubleEndedIterator<Item = &Arc<PersonalSourceRecord>> {
        self.all_personal_changes().removed()
    }
    pub(super) fn header_changed(&self) -> bool {
        self.undo
            .iter()
            .any(|operation| matches!(operation, ExperienceUndo::Header { .. }))
    }
    /// Add the actual optional child marker at its original Source insertion
    /// position. Existing finite header bytes remain the sole canonical body.
    pub(super) fn ensure_privacy_header(
        &mut self,
        state: &mut ExperienceState,
        corrections: bool,
    ) -> Result<(), ExperienceError> {
        if if corrections {
            state.header.corrections.is_some()
        } else {
            state.header.privacy_revisions.is_some()
        } {
            return Ok(());
        }
        let bytes = state
            .header_payload
            .len()
            .checked_mul(24)
            .and_then(|bytes| bytes.checked_add(2048))
            .ok_or(ExperienceError::Capacity)?;
        self.prepare_undo(bytes)?;
        let mut fields: IndexMap<String, Box<serde_json::value::RawValue>> =
            serde_json::from_str(&state.header_payload)
                .map_err(|_| ExperienceError::InvalidBody("experience header"))?;
        fields.insert(
            if corrections {
                "corrections"
            } else {
                "privacyRevisions"
            }
            .to_owned(),
            serde_json::value::RawValue::from_string("{}".to_owned())
                .map_err(|_| ExperienceError::InvalidBody("experience marker"))?,
        );
        struct Header<'a>(&'a IndexMap<String, Box<serde_json::value::RawValue>>);
        impl Serialize for Header<'_> {
            fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
                crate::encoding::serialize_js_map(self.0, s)
            }
        }
        let payload: Arc<str> = Arc::from(
            json_record(&Header(&fields))
                .map_err(|_| ExperienceError::InvalidBody("experience header encoding"))?,
        );
        let storage = self
            .reservation
            .split_off(payload.len() + 2 * size_of::<usize>())
            .map_err(|_| ExperienceError::Capacity)?;
        self.budget
            .retain_record(&state.header_storage)
            .map_err(|_| ExperienceError::Capacity)?;
        let storage = self
            .budget
            .adopt_record(storage)
            .map_err(|_| ExperienceError::Capacity)?;
        let old_storage = std::mem::replace(&mut state.header_storage, storage);
        let before = state.header.clone();
        let old_payload = Arc::clone(&state.header_payload);
        if corrections {
            state.header.corrections = Some(EmptyChildOwner {});
        } else {
            state.header.privacy_revisions = Some(EmptyChildOwner {});
        }
        state.header_payload = payload;
        self.undo.push(ExperienceUndo::Header {
            before,
            payload: old_payload,
            storage: old_storage,
        });
        Ok(())
    }
    pub(crate) fn replaced<'a>(
        &'a self,
        state: &'a ExperienceState,
    ) -> impl Iterator<Item = &'a Arc<PersonalSourceRecord>> {
        self.all_personal_changes().replaced(state)
    }
    pub(crate) fn appended<'a>(
        &'a self,
        state: &'a ExperienceState,
    ) -> impl Iterator<Item = &'a Arc<PersonalSourceRecord>> {
        self.all_personal_changes().appended(state)
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

pub(super) fn adjust_agreements(
    source: &mut PersonalSourceCollection,
    before: bool,
    after: bool,
) -> Result<(), ExperienceError> {
    if before != after {
        source.agreement_body_count = if after {
            source.agreement_body_count.checked_add(1)
        } else {
            source.agreement_body_count.checked_sub(1)
        }
        .ok_or(ExperienceError::InvalidOrdinal)?;
    }
    Ok(())
}
