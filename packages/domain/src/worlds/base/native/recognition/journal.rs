//! The selected identity owner moves old records into the candidate's undo.
//! Personal byte quotas remain with the shared temporal account owner.

use super::*;
#[path = "journal/save.rs"]
mod save;
use crate::attention::AttentionRetentionPolicy;
pub(crate) use crate::encoding::js_property_cmp as property_order;
use crate::encoding::json_record_len;
use crate::execution::ExecutionError;
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::received::{KnowledgeAccountChange, ReceivedError, TemporalState};
use crate::reception::{ReceivingMutation, ReceptionState};
use crate::simulation::{InstalledWorld, PhysicalState};
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
/// Correspondence history is completed synchronously by the real receiver at
/// each identity write. Borrowed native read scopes cannot survive that mutable
/// write; scores are read afresh at the next actual attention opportunity.
pub(crate) struct RecognitionJournal {
    budget: ByteBudget,
    undo: Vec<RecognitionUndo>,
    reservation: ByteReservation,
}
impl RecognitionJournal {
    /// Source keeps read-only entry objects across replacements. Read the exact
    /// moved before-image already owned by this operation, rather than cloning
    /// the observer's whole identity directory for a later privacy callback.
    pub(super) fn identity_at<'a>(
        &'a self,
        state: &'a ReceptionState,
        checkpoint: RecognitionCheckpoint,
        observer: &str,
        key: &str,
    ) -> Option<&'a ObserverIdentity> {
        for undo in self.undo.get(checkpoint.operations..)? {
            if let RecognitionUndo::Identity {
                observer: owner,
                key: changed,
                prior,
            } = undo
            {
                if owner == observer && changed == key {
                    return prior.as_ref().map(|(_, identity)| identity);
                }
            }
        }
        state.observer_identities.as_ref()?.get(observer)?.get(key)
    }
    pub(crate) fn new(budget: &ByteBudget) -> Result<Self, ReceivedError> {
        Ok(Self {
            budget: budget.clone(),
            undo: Vec::new(),
            reservation: budget.reserve(size_of::<Self>()).map_err(|_| capacity())?,
        })
    }
    pub(crate) fn checkpoint(&self, state: &ReceptionState) -> RecognitionCheckpoint {
        RecognitionCheckpoint {
            operations: self.undo.len(),
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
        self.undo.try_reserve(1).map_err(|_| capacity())
    }
    pub(crate) fn rollback_to(
        &mut self,
        state: &mut ReceptionState,
        checkpoint: RecognitionCheckpoint,
    ) -> Result<(), ReceivedError> {
        if checkpoint.operations > self.undo.len() {
            return Err(invalid());
        }
        while self.undo.len() > checkpoint.operations {
            match self.undo.pop().ok_or_else(invalid)? {
                RecognitionUndo::Observer { observer } => {
                    let key_bytes = state
                        .observer_identities
                        .as_ref()
                        .and_then(|root| root.get_key_value(&observer))
                        .map_or(0, |(key, _)| key.capacity());
                    state
                        .observer_identities
                        .as_mut()
                        .ok_or_else(invalid)?
                        .shift_remove(&observer)
                        .ok_or_else(invalid)?;
                    state.settle_recognition_roots(
                        -(key_bytes as i128),
                        0,
                        &mut self.reservation,
                        true,
                    )?;
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
                    records.replace(&key, prior, &mut self.reservation, true)?;
                }
                RecognitionUndo::Revision { observer, prior } => {
                    let key_bytes = state
                        .knowledge_revisions
                        .as_ref()
                        .and_then(|root| root.get_key_value(&observer))
                        .map_or(0, |(key, _)| key.capacity());
                    let revisions = state.knowledge_revisions.as_mut().ok_or_else(invalid)?;
                    if let Some(prior) = prior {
                        *revisions.get_mut(&observer).ok_or_else(invalid)? = prior;
                    } else {
                        revisions.shift_remove(&observer);
                    }
                    if prior.is_none() {
                        state.settle_recognition_roots(
                            0,
                            -(key_bytes as i128),
                            &mut self.reservation,
                            true,
                        )?;
                    }
                }
            }
        }
        if !checkpoint.identities_present {
            state.observer_identities = None;
        }
        if !checkpoint.revisions_present {
            state.knowledge_revisions = None;
        }
        state.settle_recognition_roots(0, 0, &mut self.reservation, true)?;
        Ok(())
    }
    pub(crate) fn discard_undo(&mut self) -> Result<(), ReceivedError> {
        self.undo.clear();
        self.reservation
            .resize(size_of::<Self>() + self.undo.capacity() * size_of::<RecognitionUndo>())
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
            .insert(
                observer.to_owned(),
                crate::reception::IdentityDirectory::install(IndexMap::new(), &self.budget)?,
            );
        state.settle_recognition_roots(observer.len() as i128, 0, &mut self.reservation, false)?;
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
        let records = state
            .observer_identities
            .as_mut()
            .and_then(|root| root.get_mut(observer))
            .ok_or_else(invalid)?;
        records.replace(
            key,
            Some((records.len(), value)),
            &mut self.reservation,
            false,
        )?;
        self.undo.push(RecognitionUndo::Identity {
            observer: observer.to_owned(),
            key: key.to_owned(),
            prior: None,
        });
        Ok(())
    }
    /// Incidental roots can fade, and complete recent retirement can return an
    /// unlearned body identity to current-only ownership. Neither operation
    /// grants a correspondence or semantic knowledge-revision opportunity.
    pub(super) fn replace_incidental_identity(
        &mut self,
        state: &mut ReceptionState,
        temporal: &mut TemporalState,
        observer: &str,
        key: &str,
        next: ObserverIdentity,
        now: f64,
        retention: &AttentionRetentionPolicy,
    ) -> Result<(), ExecutionError> {
        let prior = state
            .observer_identities
            .as_ref()
            .and_then(|owners| owners.get(observer))
            .and_then(|identities| identities.get(key))
            .ok_or_else(invalid)?;
        let charged = prior.retained == Some(true) && !prior.authored;
        self.reserve(
            heap_sum([
                observer.len(),
                key.len(),
                size_of::<RecognitionUndo>(),
                prior.heap_bytes().ok_or_else(capacity)?,
                next.heap_bytes().ok_or_else(capacity)?,
            ])
            .ok_or_else(capacity)?,
        )?;
        if charged
            && !temporal.adjust_retained_knowledge(
                observer,
                KnowledgeAccountChange {
                    before_bytes: Some(json_record_len(prior).map_err(|_| invalid())? as u64),
                    after_bytes: if next.retained == Some(true) {
                        Some(json_record_len(&next).map_err(|_| invalid())? as u64)
                    } else {
                        None
                    },
                    required: false,
                    revocation: false,
                },
                now,
                retention,
            )?
        {
            return Err(invalid().into());
        }
        let identities = state
            .observer_identities
            .as_mut()
            .and_then(|owners| owners.get_mut(observer))
            .ok_or_else(invalid)?;
        let position = identities.get_index_of(key).ok_or_else(invalid)?;
        let (_, prior) = identities
            .replace(key, Some((position, next)), &mut self.reservation, false)?
            .ok_or_else(invalid)?;
        self.undo.push(RecognitionUndo::Identity {
            observer: observer.to_owned(),
            key: key.to_owned(),
            prior: Some((position, prior)),
        });
        Ok(())
    }
    /// A personal quota refusal writes nothing. Every accepted correspondence
    /// change closes its real current cohort before the next identity operation.
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
        physical: &mut PhysicalState,
        installed: &InstalledWorld,
        receiving: &mut ReceivingMutation<'_>,
    ) -> Result<bool, ExecutionError> {
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
        let correspondence = correspondence_changes(prior, Some(&next));
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
                2 * size_of::<RecognitionUndo>(),
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
        let cohort = if correspondence {
            receiving.prepare_identity(physical, state, installed, observer)?
        } else {
            None
        };
        if !dropped.is_empty() {
            temporal.mark_support_dirty(observer, Some(&dropped))?;
        }
        let due = recognition_seed_deadline(&next, policy, time_scale);
        let records = state
            .observer_identities
            .as_mut()
            .and_then(|root| root.get_mut(observer))
            .ok_or_else(invalid)?;
        let position = records.get_index_of(key).unwrap_or(records.len());
        let prior = records.replace(key, Some((position, next)), &mut self.reservation, false)?;
        self.undo.push(RecognitionUndo::Identity {
            observer: observer.to_owned(),
            key: key.to_owned(),
            prior,
        });
        if let Some(cohort) = cohort {
            receiving.reconcile(physical, state, installed, temporal, cohort, None)?;
        } else {
            let individual = state
                .observer_identities
                .as_ref()
                .and_then(|root| root.get(observer))
                .and_then(|records| records.get(key))
                .and_then(|identity| identity.individual_id.as_deref());
            receiving
                .current
                .note_attention_familiarity(observer, individual)?;
        }
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
        physical: &mut PhysicalState,
        installed: &InstalledWorld,
        receiving: &mut ReceivingMutation<'_>,
    ) -> Result<(), ExecutionError> {
        let Some(prior) = state
            .observer_identities
            .as_ref()
            .and_then(|root| root.get(observer))
            .and_then(|records| records.get(key))
        else {
            return Ok(());
        };
        let cohort = if correspondence_changes(Some(prior), None) {
            receiving.prepare_identity(physical, state, installed, observer)?
        } else {
            None
        };
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
                2 * size_of::<RecognitionUndo>(),
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
            return Err(invalid().into());
        }
        if !dropped.is_empty() {
            temporal.mark_support_dirty(observer, Some(&dropped))?;
        }
        let records = state
            .observer_identities
            .as_mut()
            .and_then(|root| root.get_mut(observer))
            .ok_or_else(invalid)?;
        let (at, prior) = records
            .replace(key, None, &mut self.reservation, false)?
            .ok_or_else(invalid)?;
        self.undo.push(RecognitionUndo::Identity {
            observer: observer.to_owned(),
            key: key.to_owned(),
            prior: Some((at, prior)),
        });
        if let Some(cohort) = cohort {
            receiving.reconcile(physical, state, installed, temporal, cohort, None)?;
        }
        for id in releases {
            temporal.release_support(observer, &id, now, retention, None)?;
        }
        Ok(())
    }
    pub(crate) fn advance_revision(
        &mut self,
        state: &mut ReceptionState,
        observer: &str,
        cognition: &mut crate::cognition::CognitionJournal,
    ) -> Result<(), ExecutionError> {
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
                2 * size_of::<RecognitionUndo>(),
                map_growth(state.knowledge_revisions.as_ref(), prior.is_none())?,
            ])
            .ok_or_else(capacity)?,
        )?;
        // Knowledge subscriptions change at this same semantic revision,
        // including learning during speech, not only explicit notepad edits.
        cognition.note_knowledge_change(observer)?;
        state
            .knowledge_revisions
            .get_or_insert_with(IndexMap::new)
            .insert(observer.to_owned(), next);
        if prior.is_none() {
            state.settle_recognition_roots(
                0,
                observer.len() as i128,
                &mut self.reservation,
                false,
            )?;
        }
        self.undo.push(RecognitionUndo::Revision {
            observer: observer.to_owned(),
            prior,
        });
        Ok(())
    }
}
pub(super) fn support_keys(identity: &ObserverIdentity) -> impl Iterator<Item = &String> {
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
pub(super) fn correspondence_changes(
    before: Option<&ObserverIdentity>,
    after: Option<&ObserverIdentity>,
) -> bool {
    let removes = |before: Option<&RecognitionKnowledge>, after: Option<&RecognitionKnowledge>| {
        before.is_some_and(|before| {
            before.samples.iter().any(|sample| {
                !after.is_some_and(|after| after.samples.iter().any(|kept| kept.key == sample.key))
            })
        })
    };
    before.is_some_and(|before| {
        after.is_none_or(|after| {
            before.individual_id != after.individual_id
                || before.canonical_id != after.canonical_id
                || before.seed_only != after.seed_only
                || before.authored != after.authored
                || removes(before.voice.as_ref(), after.voice.as_ref())
                || removes(before.sight.as_ref(), after.sight.as_ref())
        })
    })
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
