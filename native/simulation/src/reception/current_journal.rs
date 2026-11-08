//! Current-record undo belongs to the same candidate as originals and temporal
//! history. A metadata-only edit retains the original encoded content cache.

use super::*;
use crate::attention::AttentionState;
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::received::ReceivedError;
use indexmap::IndexSet;
use std::mem::{align_of, size_of};
use std::sync::Arc;

fn invalid() -> ReceivedError {
    ReceivedError("Invalid current receiving mutation or rollback.")
}
fn capacity() -> ReceivedError {
    ReceivedError("Current receiving mutation exceeds native byte allowance.")
}
#[derive(Clone, Copy)]
pub(crate) struct CurrentCheckpoint {
    operations: usize,
    retained: usize,
}
enum CurrentUndo {
    Contact {
        observer: String,
        subject: String,
        prior: Option<(usize, CurrentContact)>,
    },
    Attention {
        observer: String,
        prior: Option<AttentionState>,
    },
    NextContact {
        observer: String,
        prior: u64,
    },
}
pub(crate) struct CurrentJournal {
    undo: Vec<CurrentUndo>,
    retained: IndexSet<usize>,
    reservation: ByteReservation,
}
impl CurrentJournal {
    pub(crate) fn new(budget: &ByteBudget) -> Result<Self, ReceivedError> {
        Ok(Self {
            undo: Vec::new(),
            retained: IndexSet::new(),
            reservation: budget.reserve(size_of::<Self>()).map_err(|_| capacity())?,
        })
    }
    pub(crate) fn checkpoint(&self) -> CurrentCheckpoint {
        CurrentCheckpoint {
            operations: self.undo.len(),
            retained: self.retained.len(),
        }
    }
    pub(super) fn reserve_growth(&mut self, bytes: usize) -> Result<(), ReceivedError> {
        self.reservation
            .resize(
                self.reservation
                    .bytes()
                    .checked_add(bytes)
                    .ok_or_else(capacity)?,
            )
            .map_err(|_| capacity())?;
        self.undo.try_reserve(1).map_err(|_| capacity())
    }
    pub(crate) fn rollback_to(
        &mut self,
        state: &mut ReceptionState,
        checkpoint: CurrentCheckpoint,
    ) -> Result<(), ReceivedError> {
        if checkpoint.operations > self.undo.len() || checkpoint.retained > self.retained.len() {
            return Err(invalid());
        }
        while self.undo.len() > checkpoint.operations {
            match self.undo.pop().ok_or_else(invalid)? {
                CurrentUndo::Contact {
                    observer,
                    subject,
                    prior,
                } => {
                    let owner = owner_mut(state, &observer)?;
                    owner.current.shift_remove(&subject);
                    if let Some((at, prior)) = prior {
                        if at > owner.current.len() {
                            return Err(invalid());
                        }
                        owner.current.shift_insert(at, subject, prior);
                    }
                }
                CurrentUndo::Attention { observer, prior } => {
                    owner_mut(state, &observer)?.attention = prior
                }
                CurrentUndo::NextContact { observer, prior } => {
                    owner_mut(state, &observer)?.next_contact = prior
                }
            }
        }
        self.retained.truncate(checkpoint.retained);
        Ok(())
    }
    pub(crate) fn discard_undo(&mut self) -> Result<(), ReceivedError> {
        self.undo.clear();
        self.retained.clear();
        self.reservation
            .resize(
                heap_sum([
                    size_of::<Self>(),
                    self.undo.capacity() * size_of::<CurrentUndo>(),
                    map_storage::<usize, ()>(self.retained.capacity()).ok_or_else(capacity)?,
                ])
                .ok_or_else(capacity)?,
            )
            .map_err(|_| capacity())
    }
    fn snapshot_contact(
        &mut self,
        state: &ReceptionState,
        observer: &str,
        subject: &str,
    ) -> Result<(), ReceivedError> {
        let owner = owner(state, observer)?;
        let prior = owner.current.get_full(subject);
        let mut bytes = heap_sum([2 * size_of::<CurrentUndo>(), observer.len(), subject.len()])
            .ok_or_else(capacity)?;
        let mut added = 0usize;
        if let Some((_, _, contact)) = prior {
            bytes = bytes
                .checked_add(contact_copy_heap(contact)?)
                .ok_or_else(capacity)?;
            for group in &contact.content.groups {
                if !self
                    .retained
                    .contains(&(Arc::as_ptr(&group.received) as usize))
                {
                    bytes = bytes
                        .checked_add(received_content_copy_bytes(&group.received)?)
                        .ok_or_else(capacity)?;
                    added = added.checked_add(1).ok_or_else(capacity)?;
                }
            }
            for original in contact.content.originals.values() {
                if !self.retained.contains(&(Arc::as_ptr(original) as usize)) {
                    bytes = heap_sum([
                        bytes,
                        size_of::<ReceivedObservation>(),
                        2 * size_of::<usize>() + align_of::<ReceivedObservation>() - 1,
                        original.heap_bytes().ok_or_else(capacity)?,
                    ])
                    .ok_or_else(capacity)?;
                    added = added.checked_add(1).ok_or_else(capacity)?;
                }
            }
            if let Some(payload) = &contact.encoded_payload {
                if !self
                    .retained
                    .contains(&(Arc::as_ptr(payload) as *const u8 as usize))
                {
                    bytes = heap_sum([bytes, payload.len(), 2 * size_of::<usize>()])
                        .ok_or_else(capacity)?;
                    added += 1;
                }
            }
        }
        let needed = self
            .retained
            .len()
            .checked_add(added)
            .ok_or_else(capacity)?;
        if needed > self.retained.capacity() {
            bytes = bytes
                .checked_add(
                    map_storage::<usize, ()>(needed.checked_mul(2).ok_or_else(capacity)?)
                        .ok_or_else(capacity)?,
                )
                .ok_or_else(capacity)?;
        }
        self.reserve_growth(bytes)?;
        self.retained.try_reserve(added).map_err(|_| capacity())?;
        let prior = prior.map(|(at, _, contact)| {
            for group in &contact.content.groups {
                self.retained.insert(Arc::as_ptr(&group.received) as usize);
            }
            for original in contact.content.originals.values() {
                self.retained.insert(Arc::as_ptr(original) as usize);
            }
            if let Some(payload) = &contact.encoded_payload {
                self.retained
                    .insert(Arc::as_ptr(payload) as *const u8 as usize);
            }
            (at, contact.clone())
        });
        self.undo.push(CurrentUndo::Contact {
            observer: observer.to_owned(),
            subject: subject.to_owned(),
            prior,
        });
        Ok(())
    }
    /// Only the actual receiver controller may edit a granted contact. Generic
    /// commands cannot reach this helper or clear history by replacing a map.
    pub(super) fn contact_mut<'a>(
        &mut self,
        state: &'a mut ReceptionState,
        observer: &str,
        subject: &str,
    ) -> Result<Option<&'a mut CurrentContact>, ReceivedError> {
        if !owner(state, observer)?.current.contains_key(subject) {
            return Ok(None);
        }
        self.snapshot_contact(state, observer, subject)?;
        Ok(owner_mut(state, observer)?.current.get_mut(subject))
    }
    pub(super) fn replace_contact(
        &mut self,
        state: &mut ReceptionState,
        observer: &str,
        subject: &str,
        after: Option<CurrentContact>,
    ) -> Result<(), ReceivedError> {
        let current = owner(state, observer)?;
        let inserting = after.is_some() && !current.current.contains_key(subject);
        let extra = after.as_ref().map_or(Ok(0), contact_copy_heap)?;
        let growth = if inserting && current.current.len() == current.current.capacity() {
            map_storage::<String, CurrentContact>(2 * (current.current.len() + 1))
                .ok_or_else(capacity)?
        } else {
            0
        };
        self.reserve_growth(heap_sum([extra, growth, subject.len()]).ok_or_else(capacity)?)?;
        self.snapshot_contact(state, observer, subject)?;
        let current = owner_mut(state, observer)?;
        match after {
            Some(after) => {
                current.current.insert(subject.to_owned(), after);
            }
            None => {
                current.current.shift_remove(subject);
            }
        }
        Ok(())
    }
    pub(super) fn next_contact(
        &mut self,
        state: &mut ReceptionState,
        observer: &str,
    ) -> Result<u64, ReceivedError> {
        let prior = owner(state, observer)?.next_contact;
        let next = prior
            .checked_add(1)
            .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
            .ok_or_else(invalid)?;
        self.reserve_growth(observer.len() + 2 * size_of::<CurrentUndo>())?;
        self.undo.push(CurrentUndo::NextContact {
            observer: observer.to_owned(),
            prior,
        });
        owner_mut(state, observer)?.next_contact = next;
        Ok(prior)
    }
    pub(super) fn attention_mut<'a>(
        &mut self,
        state: &'a mut ReceptionState,
        observer: &str,
    ) -> Result<&'a mut Option<AttentionState>, ReceivedError> {
        let prior = &owner(state, observer)?.attention;
        self.reserve_growth(
            heap_sum([
                observer.len(),
                2 * size_of::<CurrentUndo>(),
                prior.heap_bytes().ok_or_else(capacity)?,
            ])
            .ok_or_else(capacity)?,
        )?;
        self.undo.push(CurrentUndo::Attention {
            observer: observer.to_owned(),
            prior: prior.clone(),
        });
        Ok(&mut owner_mut(state, observer)?.attention)
    }
    pub(super) fn complete_original(
        &mut self,
        state: &mut ReceptionState,
        observer: &str,
        subject: &str,
        source: Arc<ReceivedObservation>,
    ) -> Result<(), ReceivedError> {
        let key =
            crate::encoding::json_record(&(&source.id, source.revision)).map_err(|_| invalid())?;
        if owner(state, observer)?
            .current
            .get(subject)
            .is_none_or(|contact| !contact.content.originals.contains_key(&key))
        {
            return Ok(());
        }
        let contact = self
            .contact_mut(state, observer, subject)?
            .ok_or_else(invalid)?;
        contact.invalidate_encoded_content();
        contact.content.originals.insert(key, source);
        Ok(())
    }
}
fn owner<'a>(
    state: &'a ReceptionState,
    observer: &str,
) -> Result<&'a PerceptionEvidenceOwner, ReceivedError> {
    state
        .perception_evidence
        .as_ref()
        .and_then(|owners| owners.get(observer))
        .ok_or_else(invalid)
}
fn owner_mut<'a>(
    state: &'a mut ReceptionState,
    observer: &str,
) -> Result<&'a mut PerceptionEvidenceOwner, ReceivedError> {
    state
        .perception_evidence
        .as_mut()
        .and_then(|owners| owners.get_mut(observer))
        .ok_or_else(invalid)
}
pub(super) fn contact_copy_heap(contact: &CurrentContact) -> Result<usize, ReceivedError> {
    let keys = contact
        .content
        .originals
        .keys()
        .try_fold(0usize, |bytes, key| bytes.checked_add(key.len()))
        .ok_or_else(capacity)?;
    heap_sum([
        contact
            .content
            .field_order
            .heap_bytes()
            .ok_or_else(capacity)?,
        contact
            .content
            .groups
            .iter()
            .try_fold(
                contact
                    .content
                    .groups
                    .capacity()
                    .checked_mul(size_of::<CurrentReceivedGroup>())
                    .ok_or_else(capacity)?,
                |bytes, group| {
                    heap_sum([
                        bytes,
                        group.recordings.heap_bytes()?,
                        group.metadata.heap_bytes()?,
                    ])
                },
            )
            .ok_or_else(capacity)?,
        contact.sight.heap_bytes().ok_or_else(capacity)?,
        keys,
        map_storage::<String, Arc<ReceivedObservation>>(contact.content.originals.capacity())
            .ok_or_else(capacity)?,
    ])
    .ok_or_else(capacity)
}
pub(super) fn received_content_copy_bytes(
    content: &CurrentReceivedContent,
) -> Result<usize, ReceivedError> {
    heap_sum([
        size_of::<CurrentReceivedContent>(),
        content.heap_bytes().ok_or_else(capacity)?,
        2 * size_of::<usize>() + align_of::<CurrentReceivedContent>() - 1,
    ])
    .ok_or_else(capacity)
}
