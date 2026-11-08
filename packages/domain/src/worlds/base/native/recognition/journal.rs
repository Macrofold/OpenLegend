//! The selected identity owner moves old records into the candidate's undo.
//! Personal byte quotas remain with the shared temporal account owner.

use super::*;
use crate::attention::AttentionRetentionPolicy;
pub(crate) use crate::encoding::js_property_cmp as property_order;
use crate::encoding::json_record_len;
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::received::{KnowledgeAccountChange, ReceivedError, TemporalState};
use crate::reception::ReceptionState;
use crate::worlds::base_knowledge::ObserverIdentity;
use std::mem::size_of;

fn invalid() -> ReceivedError {
    ReceivedError("Invalid selected recognition mutation or rollback.")
}
fn capacity() -> ReceivedError {
    ReceivedError("Recognition mutation exceeds native byte allowance.")
}
fn map_growth<T>(
    records: Option<&IndexMap<String, T>>,
    inserting: bool,
) -> Result<usize, ReceivedError> {
    if !inserting || records.is_some_and(|records| records.len() < records.capacity()) {
        return Ok(0);
    }
    map_storage::<String, T>(records.map_or(1, |records| 2 * (records.len() + 1)))
        .ok_or_else(capacity)
}

#[derive(Clone, Copy)]
pub(crate) struct RecognitionCheckpoint {
    operations: usize,
    effects: usize,
    next_effect: usize,
    identities_present: bool,
    revisions_present: bool,
}
enum RecognitionUndo {
    Observer {
        observer: String,
    },
    Identity {
        observer: String,
        key: String,
        prior: Option<(usize, ObserverIdentity)>,
    },
    Revision {
        observer: String,
        prior: Option<u64>,
    },
}
/// The receiver must invalidate its actual ephemeral preparation before another
/// reader resumes. Numeric familiarity changes do not run a new competition.
pub(crate) struct RecognitionEffect {
    pub observer: String,
    pub individual_id: Option<String>,
    pub knowledge_changed: bool,
}
pub(crate) struct RecognitionJournal {
    undo: Vec<RecognitionUndo>,
    effects: Vec<RecognitionEffect>,
    next_effect: usize,
    reservation: ByteReservation,
}
impl RecognitionJournal {
    pub(crate) fn new(budget: &ByteBudget) -> Result<Self, ReceivedError> {
        Ok(Self {
            undo: Vec::new(),
            effects: Vec::new(),
            next_effect: 0,
            reservation: budget.reserve(size_of::<Self>()).map_err(|_| capacity())?,
        })
    }
    pub(crate) fn checkpoint(&self, state: &ReceptionState) -> RecognitionCheckpoint {
        RecognitionCheckpoint {
            operations: self.undo.len(),
            effects: self.effects.len(),
            next_effect: self.next_effect,
            identities_present: state.observer_identities.is_some(),
            revisions_present: state.knowledge_revisions.is_some(),
        }
    }
    fn reserve(&mut self, bytes: usize) -> Result<(), ReceivedError> {
        self.reservation
            .resize(
                self.reservation
                    .bytes()
                    .checked_add(bytes)
                    .ok_or_else(capacity)?,
            )
            .map_err(|_| capacity())?;
        self.undo.try_reserve(1).map_err(|_| capacity())?;
        self.effects.try_reserve(1).map_err(|_| capacity())
    }
    pub(crate) fn next_effect(&self) -> Option<&RecognitionEffect> {
        self.effects.get(self.next_effect)
    }
    pub(crate) fn complete_effect(&mut self) -> Result<(), ReceivedError> {
        if self.next_effect == self.effects.len() {
            return Err(invalid());
        }
        self.next_effect += 1;
        Ok(())
    }
    pub(crate) fn rollback_to(
        &mut self,
        state: &mut ReceptionState,
        checkpoint: RecognitionCheckpoint,
    ) -> Result<(), ReceivedError> {
        if checkpoint.operations > self.undo.len() || checkpoint.effects > self.effects.len() {
            return Err(invalid());
        }
        while self.undo.len() > checkpoint.operations {
            match self.undo.pop().ok_or_else(invalid)? {
                RecognitionUndo::Observer { observer } => {
                    state
                        .observer_identities
                        .as_mut()
                        .ok_or_else(invalid)?
                        .shift_remove(&observer)
                        .ok_or_else(invalid)?;
                }
                RecognitionUndo::Identity {
                    observer,
                    key,
                    prior,
                } => {
                    let records = state
                        .observer_identities
                        .as_mut()
                        .and_then(|root| root.get_mut(&observer))
                        .ok_or_else(invalid)?;
                    records.shift_remove(&key);
                    if let Some((at, prior)) = prior {
                        if at > records.len() {
                            return Err(invalid());
                        }
                        records.shift_insert(at, key, prior);
                    }
                }
                RecognitionUndo::Revision { observer, prior } => {
                    let revisions = state.knowledge_revisions.as_mut().ok_or_else(invalid)?;
                    if let Some(prior) = prior {
                        *revisions.get_mut(&observer).ok_or_else(invalid)? = prior;
                    } else {
                        revisions.shift_remove(&observer);
                    }
                }
            }
        }
        self.effects.truncate(checkpoint.effects);
        self.next_effect = checkpoint.next_effect;
        if !checkpoint.identities_present {
            state.observer_identities = None;
        }
        if !checkpoint.revisions_present {
            state.knowledge_revisions = None;
        }
        Ok(())
    }
    pub(crate) fn discard_undo(&mut self) -> Result<(), ReceivedError> {
        if self.next_effect != self.effects.len() {
            return Err(invalid());
        }
        self.undo.clear();
        self.effects.clear();
        self.next_effect = 0;
        self.reservation
            .resize(
                size_of::<Self>()
                    + self.undo.capacity() * size_of::<RecognitionUndo>()
                    + self.effects.capacity() * size_of::<RecognitionEffect>(),
            )
            .map_err(|_| capacity())
    }
    pub(crate) fn ensure_observer(
        &mut self,
        state: &mut ReceptionState,
        observer: &str,
    ) -> Result<(), ReceivedError> {
        if state
            .observer_identities
            .as_ref()
            .is_some_and(|root| root.contains_key(observer))
        {
            return Ok(());
        }
        self.reserve(
            heap_sum([
                2 * observer.len(),
                2 * size_of::<RecognitionUndo>(),
                map_growth(state.observer_identities.as_ref(), true)?,
            ])
            .ok_or_else(capacity)?,
        )?;
        state
            .observer_identities
            .get_or_insert_with(IndexMap::new)
            .insert(observer.to_owned(), IndexMap::new());
        self.undo.push(RecognitionUndo::Observer {
            observer: observer.to_owned(),
        });
        Ok(())
    }
    pub(crate) fn insert_ephemeral(
        &mut self,
        state: &mut ReceptionState,
        observer: &str,
        key: &str,
        value: ObserverIdentity,
    ) -> Result<(), ReceivedError> {
        self.ensure_observer(state, observer)?;
        let records = state
            .observer_identities
            .as_ref()
            .and_then(|root| root.get(observer))
            .ok_or_else(invalid)?;
        if records.contains_key(key) {
            return Err(invalid());
        }
        self.reserve(
            heap_sum([
                2 * observer.len(),
                2 * key.len(),
                value.heap_bytes().ok_or_else(capacity)?,
                2 * size_of::<RecognitionUndo>(),
                map_growth(Some(records), true)?,
            ])
            .ok_or_else(capacity)?,
        )?;
        state
            .observer_identities
            .as_mut()
            .and_then(|root| root.get_mut(observer))
            .ok_or_else(invalid)?
            .insert(key.to_owned(), value);
        self.undo.push(RecognitionUndo::Identity {
            observer: observer.to_owned(),
            key: key.to_owned(),
            prior: None,
        });
        Ok(())
    }
    /// This returns false only for actual personal quota refusal. Unsupported
    /// correspondence work is an explicit unfinished phase, never a lost update.
    pub(crate) fn commit(
        &mut self,
        state: &mut ReceptionState,
        temporal: &mut TemporalState,
        observer: &str,
        key: &str,
        mut next: ObserverIdentity,
        now: f64,
        policy: &RecognitionPolicy,
        time_scale: f64,
        retention: &AttentionRetentionPolicy,
    ) -> Result<bool, ReceivedError> {
        self.ensure_observer(state, observer)?;
        if !next.authored {
            next.retained = Some(true);
        }
        let records = state
            .observer_identities
            .as_ref()
            .and_then(|root| root.get(observer))
            .ok_or_else(invalid)?;
        let prior = records.get(key);
        ensure_correspondence_ready(state, observer, prior, Some(&next))?;
        let before_bytes = prior
            .filter(|prior| prior.retained == Some(true) && !prior.authored)
            .map(json_record_len)
            .transpose()
            .map_err(|_| invalid())?
            .map(|n| n as u64);
        let after_bytes = if next.authored {
            None
        } else {
            Some(json_record_len(&next).map_err(|_| invalid())? as u64)
        };
        self.reserve(
            heap_sum([
                3 * observer.len(),
                2 * key.len(),
                2 * size_of::<RecognitionUndo>() + 2 * size_of::<RecognitionEffect>(),
                next.individual_id.as_ref().map_or(0, String::len),
                next.heap_bytes().ok_or_else(capacity)?,
                prior
                    .map_or(Some(0), HeapBytes::heap_bytes)
                    .ok_or_else(capacity)?,
                map_growth(Some(records), prior.is_none())?,
                source_scratch(prior)?,
            ])
            .ok_or_else(capacity)?,
        )?;
        let dropped = dropped_sources(prior, Some(&next));
        if !temporal.adjust_retained_knowledge(
            observer,
            KnowledgeAccountChange {
                before_bytes,
                after_bytes,
                required: false,
                revocation: false,
            },
            now,
            retention,
        )? {
            return Ok(false);
        }
        if !dropped.is_empty() {
            temporal.mark_support_dirty(observer, Some(&dropped))?;
        }
        let due = recognition_seed_deadline(&next, policy, time_scale);
        let individual_id = next.individual_id.clone();
        let records = state
            .observer_identities
            .as_mut()
            .and_then(|root| root.get_mut(observer))
            .ok_or_else(invalid)?;
        let prior = records
            .shift_remove_full(key)
            .map(|(at, _, value)| (at, value));
        if let Some((at, _)) = &prior {
            records.shift_insert(*at, key.to_owned(), next);
        } else {
            records.insert(key.to_owned(), next);
        }
        self.undo.push(RecognitionUndo::Identity {
            observer: observer.to_owned(),
            key: key.to_owned(),
            prior,
        });
        self.effects.push(RecognitionEffect {
            observer: observer.to_owned(),
            individual_id,
            knowledge_changed: false,
        });
        if let Some(due) = due {
            temporal.note_knowledge_due(observer, due)?;
        }
        Ok(true)
    }
    pub(crate) fn retire(
        &mut self,
        state: &mut ReceptionState,
        temporal: &mut TemporalState,
        observer: &str,
        key: &str,
        now: f64,
        retention: &AttentionRetentionPolicy,
    ) -> Result<(), ReceivedError> {
        let Some(prior) = state
            .observer_identities
            .as_ref()
            .and_then(|root| root.get(observer))
            .and_then(|records| records.get(key))
        else {
            return Ok(());
        };
        ensure_correspondence_ready(state, observer, Some(prior), None)?;
        let bytes = if prior.retained == Some(true) && !prior.authored {
            Some(json_record_len(prior).map_err(|_| invalid())? as u64)
        } else {
            None
        };
        self.reserve(
            heap_sum([
                3 * observer.len(),
                key.len(),
                prior.heap_bytes().ok_or_else(capacity)?,
                2 * size_of::<RecognitionUndo>() + 2 * size_of::<RecognitionEffect>(),
                prior.individual_id.as_ref().map_or(0, String::len),
                source_scratch(Some(prior))?,
            ])
            .ok_or_else(capacity)?,
        )?;
        let dropped = dropped_sources(Some(prior), None);
        let releases: Vec<String> =
            recognition_support_sources(prior.name_evidence_ids.as_deref().unwrap_or(&[]))
                .into_iter()
                .filter_map(|source| match source {
                    RecognitionSupportSource::Evidence(source)
                        if crate::received::is_temporal_receipt_source(&source) =>
                    {
                        Some(source.id)
                    }
                    _ => None,
                })
                .collect();
        if bytes.is_some()
            && !temporal.adjust_retained_knowledge(
                observer,
                KnowledgeAccountChange {
                    before_bytes: bytes,
                    after_bytes: None,
                    required: false,
                    revocation: false,
                },
                now,
                retention,
            )?
        {
            return Err(invalid());
        }
        if !dropped.is_empty() {
            temporal.mark_support_dirty(observer, Some(&dropped))?;
        }
        let records = state
            .observer_identities
            .as_mut()
            .and_then(|root| root.get_mut(observer))
            .ok_or_else(invalid)?;
        let (at, _, prior) = records.shift_remove_full(key).ok_or_else(invalid)?;
        let individual_id = prior.individual_id.clone();
        self.undo.push(RecognitionUndo::Identity {
            observer: observer.to_owned(),
            key: key.to_owned(),
            prior: Some((at, prior)),
        });
        self.effects.push(RecognitionEffect {
            observer: observer.to_owned(),
            individual_id,
            knowledge_changed: false,
        });
        for id in releases {
            temporal.release_support(observer, &id, now, retention, None)?;
        }
        Ok(())
    }
    pub(crate) fn advance_revision(
        &mut self,
        state: &mut ReceptionState,
        observer: &str,
    ) -> Result<(), ReceivedError> {
        let prior = state
            .knowledge_revisions
            .as_ref()
            .and_then(|root| root.get(observer))
            .copied();
        let next = prior
            .unwrap_or(0)
            .checked_add(1)
            .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
            .ok_or_else(invalid)?;
        self.reserve(
            heap_sum([
                3 * observer.len(),
                2 * size_of::<RecognitionUndo>() + 2 * size_of::<RecognitionEffect>(),
                map_growth(state.knowledge_revisions.as_ref(), prior.is_none())?,
            ])
            .ok_or_else(capacity)?,
        )?;
        state
            .knowledge_revisions
            .get_or_insert_with(IndexMap::new)
            .insert(observer.to_owned(), next);
        self.undo.push(RecognitionUndo::Revision {
            observer: observer.to_owned(),
            prior,
        });
        self.effects.push(RecognitionEffect {
            observer: observer.to_owned(),
            individual_id: None,
            knowledge_changed: true,
        });
        Ok(())
    }
}
fn support_keys(identity: &ObserverIdentity) -> impl Iterator<Item = &String> {
    identity
        .name_evidence_ids
        .iter()
        .flatten()
        .chain(
            identity
                .familiarity
                .iter()
                .flat_map(|state| state.roots.iter())
                .flat_map(|root| std::iter::once(&root.source_key).chain(&root.support)),
        )
        .chain(
            identity
                .voice
                .iter()
                .chain(identity.sight.iter())
                .flat_map(|knowledge| knowledge.samples.iter())
                .flat_map(|sample| std::iter::once(&sample.source_key).chain(&sample.support)),
        )
}
fn source_scratch(identity: Option<&ObserverIdentity>) -> Result<usize, ReceivedError> {
    identity
        .into_iter()
        .flat_map(support_keys)
        .try_fold(0usize, |bytes, key| {
            // Closed source-key parsing overlaps a copied key, its parsed source,
            // deduplication storage and the resulting source ID. Bound those actual
            // fields before parsing; no source JSON graph remains in the world.
            let strings = key.len().checked_mul(4)?;
            let layout = size_of::<RecognitionSupportSource>()
                + 4 * size_of::<String>()
                + 6 * size_of::<serde_json::Value>();
            heap_sum([bytes, strings, layout])
        })
        .ok_or_else(capacity)
}
fn dropped_sources(
    before: Option<&ObserverIdentity>,
    after: Option<&ObserverIdentity>,
) -> Vec<String> {
    let keys: Vec<String> = before
        .into_iter()
        .flat_map(support_keys)
        .filter(|key| !after.is_some_and(|after| support_keys(after).any(|kept| kept == *key)))
        .cloned()
        .collect();
    recognition_support_sources(&keys)
        .iter()
        .map(|source| source.id().to_owned())
        .collect()
}
fn ensure_correspondence_ready(
    state: &ReceptionState,
    observer: &str,
    before: Option<&ObserverIdentity>,
    after: Option<&ObserverIdentity>,
) -> Result<(), ReceivedError> {
    let removes = |before: Option<&RecognitionKnowledge>, after: Option<&RecognitionKnowledge>| {
        before.is_some_and(|before| {
            before.samples.iter().any(|sample| {
                !after.is_some_and(|after| after.samples.iter().any(|kept| kept.key == sample.key))
            })
        })
    };
    let correspondence = before.is_some_and(|before| {
        after.is_none_or(|after| {
            before.individual_id != after.individual_id
                || before.canonical_id != after.canonical_id
                || before.seed_only != after.seed_only
                || before.authored != after.authored
                || removes(before.voice.as_ref(), after.voice.as_ref())
                || removes(before.sight.as_ref(), after.sight.as_ref())
        })
    });
    if correspondence
        && state
            .perception_evidence
            .as_ref()
            .and_then(|root| root.get(observer))
            .is_some_and(|owner| owner.attention.is_some())
    {
        return Err(ReceivedError(
            "Recognition correspondence requires the current reception finalizer.",
        ));
    }
    Ok(())
}
pub(crate) fn recognition_seed_deadline(
    identity: &ObserverIdentity,
    policy: &RecognitionPolicy,
    time_scale: f64,
) -> Option<f64> {
    identity
        .voice
        .as_ref()
        .filter(|voice| identity.seed_only == Some(true) && !voice.samples.is_empty())
        .map(|voice| {
            voice
                .samples
                .iter()
                .map(|sample| sample.at)
                .fold(f64::NEG_INFINITY, f64::max)
                + policy.seed_seconds * time_scale
        })
}
