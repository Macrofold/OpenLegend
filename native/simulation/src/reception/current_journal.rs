//! Current-record undo belongs to the same candidate as originals and temporal
//! history. A metadata-only edit retains the original encoded content cache.

use super::*;
use crate::attention::AttentionState;
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::received::ReceivedError;
use indexmap::{IndexMap, IndexSet};
use std::mem::{align_of, size_of};
use std::sync::Arc;

mod frames;
mod metadata;
mod save;

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
    VisiblePlaces {
        observer: String,
        prior: IndexMap<String, u64>,
    },
    Visibility {
        observer: String,
        people: bool,
        prior: Option<(usize, Vec<String>)>,
        root_present: bool,
    },
    VisualMeasurement {
        observer: String,
        subject: String,
        prior: Option<VisualMeasurement>,
    },
    VisualConfirmation {
        observer: String,
        prior: Option<VisualConfirmation>,
    },
    MotionMember {
        observer: String,
        subject: String,
        prior: Option<(usize, CurrentMotionSample)>,
        root_present: bool,
    },
    MotionExpiry {
        observer: String,
        prior: Option<f64>,
    },
    GapMember {
        observer: String,
        subject: String,
        prior: Option<(usize, ReceptionGap)>,
    },
    DeadVisibility {
        observer: String,
        people: bool,
        prior: Vec<String>,
    },
    BatchStarted {
        observer: Arc<str>,
    },
    BatchFinished {
        observer: Arc<str>,
        at: usize,
        batch: CurrentBatch,
    },
    BatchSubject {
        observer: Arc<str>,
        subject: Arc<str>,
    },
    BatchFrameContext {
        observer: Arc<str>,
        before: Option<bool>,
    },
    CapturedFrame {
        observer: Arc<str>,
        track: Arc<str>,
        before: Option<ObservationFrame>,
    },
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
    Geometry {
        observer: String,
        prior: Option<ReceivedGeometryState>,
    },
    Motion {
        observer: String,
        prior: IndexMap<String, CurrentMotionSample>,
        expires_at: Option<f64>,
    },
    Gaps {
        observer: String,
        prior: IndexMap<String, ReceptionGap>,
    },
}
struct CurrentBatch {
    token: Arc<()>,
    subjects: IndexSet<Arc<str>>,
    frame_changed: Option<bool>,
    recorded_frames: IndexMap<Arc<str>, ObservationFrame>,
}
/// A borrowed caller cannot seal its receiver's prefix. The token names only
/// this actual in-memory batch; it is neither a saved ID nor another contact map.
pub(crate) struct CurrentContactBatchLease {
    observer: Arc<str>,
    token: Arc<()>,
    owned: bool,
}
impl CurrentContactBatchLease {
    pub(crate) fn owns_prefix(&self) -> bool {
        self.owned
    }
}
pub(crate) struct CurrentJournal {
    undo: Vec<CurrentUndo>,
    batches: IndexMap<Arc<str>, CurrentBatch>,
    retained: IndexSet<usize>,
    reservation: ByteReservation,
}
impl CurrentJournal {
    /// Death ends these two live outward lists only. Missing roots/observers
    /// remain missing; retained identities and historical evidence are intact.
    pub(crate) fn clear_dead_visibility(
        &mut self,
        state: &mut ReceptionState,
        observer: &str,
    ) -> Result<(), ReceivedError> {
        for people in [true, false] {
            let root = if people {
                &state.visible_people
            } else {
                &state.visible_objects
            };
            let Some(prior) = root
                .as_ref()
                .and_then(|root| root.get(observer))
                .filter(|prior| !prior.is_empty())
            else {
                continue;
            };
            self.reserve_growth(observer.len() + prior.heap_bytes().ok_or_else(capacity)?)?;
            let root = if people {
                &mut state.visible_people
            } else {
                &mut state.visible_objects
            };
            let prior = std::mem::take(
                root.as_mut()
                    .and_then(|root| root.get_mut(observer))
                    .ok_or_else(invalid)?,
            );
            self.undo.push(CurrentUndo::DeadVisibility {
                observer: observer.into(),
                people,
                prior,
            });
        }
        Ok(())
    }
    pub(crate) fn dead_visibility_changes(&self) -> impl Iterator<Item = (&str, bool)> {
        self.undo.iter().filter_map(|undo| match undo {
            CurrentUndo::DeadVisibility {
                observer, people, ..
            }
            | CurrentUndo::Visibility {
                observer, people, ..
            } => Some((observer.as_str(), *people)),
            _ => None,
        })
    }
    pub(crate) fn new(budget: &ByteBudget) -> Result<Self, ReceivedError> {
        Ok(Self {
            undo: Vec::new(),
            batches: IndexMap::new(),
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
        let old_storage = self
            .undo
            .capacity()
            .checked_mul(size_of::<CurrentUndo>())
            .ok_or_else(capacity)?;
        let next_capacity = if self.undo.len() == self.undo.capacity() {
            self.undo
                .capacity()
                .checked_mul(2)
                .ok_or_else(capacity)?
                .max(4)
        } else {
            self.undo.capacity()
        };
        let next_storage = next_capacity
            .checked_mul(size_of::<CurrentUndo>())
            .ok_or_else(capacity)?;
        // Fund the replacement backing allocation while the old one is still
        // live. reserve_exact avoids Vec's implicit minimum-four allocation.
        self.reservation
            .resize(
                self.reservation
                    .bytes()
                    .checked_add(bytes)
                    .and_then(|n| {
                        n.checked_add(if next_capacity != self.undo.capacity() {
                            next_storage
                        } else {
                            0
                        })
                    })
                    .ok_or_else(capacity)?,
            )
            .map_err(|_| capacity())?;
        if next_capacity != self.undo.capacity() {
            self.undo
                .try_reserve_exact(next_capacity - self.undo.len())
                .map_err(|_| capacity())?;
            let actual = self
                .undo
                .capacity()
                .checked_mul(size_of::<CurrentUndo>())
                .ok_or_else(capacity)?;
            self.reservation
                .resize(
                    self.reservation
                        .bytes()
                        .checked_sub(old_storage)
                        .and_then(|n| n.checked_sub(next_storage))
                        .and_then(|n| n.checked_add(actual))
                        .ok_or_else(capacity)?,
                )
                .map_err(|_| capacity())?;
        }
        Ok(())
    }
    pub(crate) fn begin_batch(
        &mut self,
        state: &ReceptionState,
        observer: &str,
    ) -> Result<CurrentContactBatchLease, ReceivedError> {
        owner(state, observer)?;
        if let Some((key, batch)) = self.batches.get_key_value(observer) {
            return Ok(CurrentContactBatchLease {
                observer: key.clone(),
                token: batch.token.clone(),
                owned: false,
            });
        }
        let storage = if self.batches.len() == self.batches.capacity() {
            map_storage::<Arc<str>, CurrentBatch>(
                self.batches
                    .len()
                    .checked_add(1)
                    .and_then(|n| n.checked_mul(2))
                    .ok_or_else(capacity)?,
            )
            .ok_or_else(capacity)?
        } else {
            0
        };
        self.reserve_growth(
            heap_sum([storage, observer.len(), 4 * size_of::<usize>()]).ok_or_else(capacity)?,
        )?;
        self.batches.try_reserve(1).map_err(|_| capacity())?;
        let observer: Arc<str> = Arc::from(observer);
        let token = Arc::new(());
        self.undo.push(CurrentUndo::BatchStarted {
            observer: observer.clone(),
        });
        self.batches.insert(
            observer.clone(),
            CurrentBatch {
                token: token.clone(),
                subjects: IndexSet::new(),
                frame_changed: None,
                recorded_frames: IndexMap::new(),
            },
        );
        Ok(CurrentContactBatchLease {
            observer,
            token,
            owned: true,
        })
    }
    pub(super) fn content_batch(
        &mut self,
        observer: &str,
        subject: &str,
    ) -> Result<Arc<()>, ReceivedError> {
        let (key, batch) = self.batches.get_key_value(observer).ok_or_else(invalid)?;
        let key = key.clone();
        let token = batch.token.clone();
        if batch.subjects.contains(subject) {
            return Ok(token);
        }
        let storage = if batch.subjects.len() == batch.subjects.capacity() {
            map_storage::<Arc<str>, ()>(
                batch
                    .subjects
                    .len()
                    .checked_add(1)
                    .and_then(|n| n.checked_mul(2))
                    .ok_or_else(capacity)?,
            )
            .ok_or_else(capacity)?
        } else {
            0
        };
        self.reserve_growth(
            heap_sum([
                storage,
                subject
                    .len()
                    .checked_add(2 * size_of::<usize>())
                    .ok_or_else(capacity)?,
            ])
            .ok_or_else(capacity)?,
        )?;
        let batch = self.batches.get_mut(observer).ok_or_else(invalid)?;
        batch.subjects.try_reserve(1).map_err(|_| capacity())?;
        let subject: Arc<str> = Arc::from(subject);
        batch.subjects.insert(subject.clone());
        self.undo.push(CurrentUndo::BatchSubject {
            observer: key,
            subject,
        });
        Ok(token)
    }
    pub(super) fn mutable_group(
        &mut self,
        group: &mut CurrentReceivedGroup,
        token: &Arc<()>,
    ) -> Result<(), ReceivedError> {
        if group
            .content_batch
            .as_ref()
            .is_some_and(|held| Arc::ptr_eq(held, token))
        {
            return Ok(());
        }
        self.reserve_growth(2 * size_of::<usize>())?;
        group.field_identity = Arc::new(());
        group.content_batch = Some(token.clone());
        Ok(())
    }
    pub(crate) fn finish_batch(
        &mut self,
        state: &mut ReceptionState,
        lease: CurrentContactBatchLease,
    ) -> Result<(), ReceivedError> {
        let batch = self
            .batches
            .get(lease.observer.as_ref())
            .ok_or_else(invalid)?;
        if !Arc::ptr_eq(&batch.token, &lease.token) {
            return Err(invalid());
        }
        if !lease.owned {
            return Ok(());
        }
        // Only fields actually made mutable are snapshotted. Metadata-only
        // confirmation retains the old immutable fields object's identity.
        let subjects = batch.subjects.len();
        self.reserve_growth(
            subjects
                .checked_mul(size_of::<Arc<str>>() + 2 * size_of::<usize>())
                .ok_or_else(capacity)?,
        )?;
        let subjects: Vec<_> = self
            .batches
            .get(lease.observer.as_ref())
            .ok_or_else(invalid)?
            .subjects
            .iter()
            .cloned()
            .collect();
        for subject in subjects {
            let Some(contact) = owner(state, &lease.observer)?.current.get(subject.as_ref()) else {
                continue;
            };
            let count = contact
                .content
                .groups
                .iter()
                .filter(|group| {
                    group
                        .content_batch
                        .as_ref()
                        .is_some_and(|token| Arc::ptr_eq(token, &lease.token))
                        || group
                            .metadata_batch
                            .as_ref()
                            .is_some_and(|token| Arc::ptr_eq(token, &lease.token))
                })
                .count();
            if count == 0 {
                continue;
            }
            self.reserve_growth(
                count
                    .checked_mul(2 * size_of::<usize>())
                    .ok_or_else(capacity)?,
            )?;
            let contact = self
                .contact_mut(state, &lease.observer, &subject)?
                .ok_or_else(invalid)?;
            for group in &mut contact.content.groups {
                if group
                    .content_batch
                    .as_ref()
                    .is_some_and(|token| Arc::ptr_eq(token, &lease.token))
                {
                    group.field_identity = Arc::new(());
                    group.content_batch = None;
                }
                if group
                    .metadata_batch
                    .as_ref()
                    .is_some_and(|token| Arc::ptr_eq(token, &lease.token))
                {
                    group.metadata_batch = None;
                }
            }
        }
        self.reserve_growth(0)?;
        let (at, observer, batch) = self
            .batches
            .shift_remove_full(lease.observer.as_ref())
            .ok_or_else(invalid)?;
        self.undo.push(CurrentUndo::BatchFinished {
            observer,
            at,
            batch,
        });
        Ok(())
    }
    pub(crate) fn require_closed(&self) -> Result<(), ReceivedError> {
        if self.batches.is_empty() {
            Ok(())
        } else {
            Err(invalid())
        }
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
                CurrentUndo::VisiblePlaces { observer, prior } => {
                    *state
                        .visible_places
                        .as_mut()
                        .and_then(|r| r.get_mut(&observer))
                        .ok_or_else(invalid)? = prior;
                }
                CurrentUndo::Visibility {
                    observer,
                    people,
                    prior,
                    root_present,
                } => {
                    let root = if people {
                        &mut state.visible_people
                    } else {
                        &mut state.visible_objects
                    };
                    let rows = root.as_mut().ok_or_else(invalid)?;
                    rows.shift_remove(&observer);
                    if let Some((at, prior)) = prior {
                        if at > rows.len() {
                            return Err(invalid());
                        }
                        rows.shift_insert(at, observer, prior);
                    }
                    if !root_present {
                        *root = None;
                    }
                }
                CurrentUndo::VisualMeasurement {
                    observer,
                    subject,
                    prior,
                } => {
                    owner_mut(state, &observer)?
                        .current
                        .get_mut(&subject)
                        .ok_or_else(invalid)?
                        .visual_measurement = prior;
                }
                CurrentUndo::VisualConfirmation { observer, prior } => {
                    owner_mut(state, &observer)?.visual_confirmation = prior
                }
                CurrentUndo::MotionMember {
                    observer,
                    subject,
                    prior,
                    root_present,
                } => {
                    let owner = owner_mut(state, &observer)?;
                    let samples = owner.motion_samples.as_mut().ok_or_else(invalid)?;
                    samples.shift_remove(&subject);
                    if let Some((at, prior)) = prior {
                        if at > samples.len() {
                            return Err(invalid());
                        }
                        samples.shift_insert(at, subject, prior);
                    }
                    if !root_present {
                        owner.motion_samples = None;
                    }
                }
                CurrentUndo::MotionExpiry { observer, prior } => {
                    owner_mut(state, &observer)?.motion_expires_at = prior
                }
                CurrentUndo::GapMember {
                    observer,
                    subject,
                    prior,
                } => {
                    let gaps = &mut owner_mut(state, &observer)?.gaps;
                    gaps.shift_remove(&subject);
                    if let Some((at, prior)) = prior {
                        if at > gaps.len() {
                            return Err(invalid());
                        }
                        gaps.shift_insert(at, subject, prior);
                    }
                }

                CurrentUndo::DeadVisibility {
                    observer,
                    people,
                    prior,
                } => {
                    let root = if people {
                        &mut state.visible_people
                    } else {
                        &mut state.visible_objects
                    };
                    *root
                        .as_mut()
                        .and_then(|root| root.get_mut(&observer))
                        .ok_or_else(invalid)? = prior;
                }
                CurrentUndo::BatchStarted { observer } => {
                    self.batches
                        .shift_remove(observer.as_ref())
                        .ok_or_else(invalid)?;
                }
                CurrentUndo::BatchFinished {
                    observer,
                    at,
                    batch,
                } => {
                    if at > self.batches.len() || self.batches.contains_key(observer.as_ref()) {
                        return Err(invalid());
                    }
                    self.batches.shift_insert(at, observer, batch);
                }
                CurrentUndo::BatchSubject { observer, subject } => {
                    self.batches
                        .get_mut(observer.as_ref())
                        .ok_or_else(invalid)?
                        .subjects
                        .shift_remove(subject.as_ref());
                }
                CurrentUndo::BatchFrameContext { observer, before } => {
                    self.batches
                        .get_mut(observer.as_ref())
                        .ok_or_else(invalid)?
                        .frame_changed = before;
                }
                CurrentUndo::CapturedFrame {
                    observer,
                    track,
                    before,
                } => {
                    let frames = &mut self
                        .batches
                        .get_mut(observer.as_ref())
                        .ok_or_else(invalid)?
                        .recorded_frames;
                    if let Some(before) = before {
                        frames.insert(track, before);
                    } else {
                        frames.shift_remove(track.as_ref());
                    }
                }
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
                CurrentUndo::Geometry { observer, prior } => {
                    owner_mut(state, &observer)?.geometry = prior
                }
                CurrentUndo::Motion {
                    observer,
                    prior,
                    expires_at,
                } => {
                    let owner = owner_mut(state, &observer)?;
                    owner.motion_samples = Some(prior);
                    owner.motion_expires_at = expires_at;
                }
                CurrentUndo::Gaps { observer, prior } => owner_mut(state, &observer)?.gaps = prior,
            }
        }
        self.retained.truncate(checkpoint.retained);
        Ok(())
    }
    pub(crate) fn discard_undo(&mut self) -> Result<(), ReceivedError> {
        self.require_closed()?;
        self.undo.clear();
        self.retained.clear();
        self.reservation
            .resize(
                heap_sum([
                    size_of::<Self>(),
                    self.undo.capacity() * size_of::<CurrentUndo>(),
                    map_storage::<Arc<str>, CurrentBatch>(self.batches.capacity())
                        .ok_or_else(capacity)?,
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
                    .contains(&(Arc::as_ptr(&group.field_identity) as usize))
                {
                    bytes = bytes
                        .checked_add(2 * size_of::<usize>())
                        .ok_or_else(capacity)?;
                    added = added.checked_add(1).ok_or_else(capacity)?;
                }
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
                self.retained
                    .insert(Arc::as_ptr(&group.field_identity) as usize);
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
                if let Some(prior) = current.current.get_mut(subject) {
                    *prior = after;
                } else {
                    // Match Source ordered-record iteration without rebuilding
                    // or sorting the whole scene after each acquisition.
                    let mut low = 0;
                    let mut high = current.current.len();
                    while low < high {
                        let middle = low + (high - low) / 2;
                        let (key, _) = current.current.get_index(middle).ok_or_else(invalid)?;
                        if crate::encoding::js_string_cmp(key, subject).is_lt() {
                            low = middle + 1;
                        } else {
                            high = middle;
                        }
                    }
                    current.current.shift_insert(low, subject.to_owned(), after);
                }
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
    pub(super) fn end_geometry(
        &mut self,
        state: &mut ReceptionState,
        observer: &str,
    ) -> Result<bool, ReceivedError> {
        let Some(prior) = owner(state, observer)?.geometry.as_ref() else {
            return Ok(false);
        };
        self.reserve_growth(
            heap_sum([observer.len(), prior.heap_bytes().ok_or_else(capacity)?])
                .ok_or_else(capacity)?,
        )?;
        let prior = owner_mut(state, observer)?
            .geometry
            .take()
            .ok_or_else(invalid)?;
        self.undo.push(CurrentUndo::Geometry {
            observer: observer.to_owned(),
            prior: Some(prior),
        });
        Ok(true)
    }
    /// The received geometry is bounded by its selected policy. The actual old
    /// owner moves into undo; replacing it never copies other receiver state.
    pub(super) fn replace_geometry(
        &mut self,
        state: &mut ReceptionState,
        observer: &str,
        next: ReceivedGeometryState,
    ) -> Result<(), ReceivedError> {
        let prior = owner(state, observer)?.geometry.as_ref();
        self.reserve_growth(
            heap_sum([
                observer.len(),
                prior
                    .map_or(Some(0), HeapBytes::heap_bytes)
                    .ok_or_else(capacity)?,
                next.heap_bytes().ok_or_else(capacity)?,
            ])
            .ok_or_else(capacity)?,
        )?;
        let prior = owner_mut(state, observer)?.geometry.replace(next);
        self.undo.push(CurrentUndo::Geometry {
            observer: observer.into(),
            prior,
        });
        Ok(())
    }
    pub(super) fn retire_motion(
        &mut self,
        state: &mut ReceptionState,
        observer: &str,
    ) -> Result<bool, ReceivedError> {
        let Some(prior) = owner(state, observer)?
            .motion_samples
            .as_ref()
            .filter(|samples| !samples.is_empty())
        else {
            return Ok(false);
        };
        self.reserve_growth(
            heap_sum([observer.len(), prior.heap_bytes().ok_or_else(capacity)?])
                .ok_or_else(capacity)?,
        )?;
        let owner = owner_mut(state, observer)?;
        let prior = owner
            .motion_samples
            .replace(IndexMap::new())
            .ok_or_else(invalid)?;
        let expires_at = owner.motion_expires_at.take();
        self.undo.push(CurrentUndo::Motion {
            observer: observer.to_owned(),
            prior,
            expires_at,
        });
        Ok(true)
    }
    pub(super) fn clear_gaps(
        &mut self,
        state: &mut ReceptionState,
        observer: &str,
    ) -> Result<(), ReceivedError> {
        let prior = &owner(state, observer)?.gaps;
        if prior.is_empty() {
            return Ok(());
        }
        self.reserve_growth(
            heap_sum([observer.len(), prior.heap_bytes().ok_or_else(capacity)?])
                .ok_or_else(capacity)?,
        )?;
        let prior = std::mem::take(&mut owner_mut(state, observer)?.gaps);
        self.undo.push(CurrentUndo::Gaps {
            observer: observer.to_owned(),
            prior,
        });
        Ok(())
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
        contact
            .visual_measurement
            .heap_bytes()
            .ok_or_else(capacity)?,
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
