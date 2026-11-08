//! The selected receiver keeps pre-mutation correspondence until the real
//! temporal owner has closed outgoing tracks and admitted incoming tracks.
use super::*;
use crate::attention::AttentionEntry;
use crate::execution::{CoreMutation, ExecutionError};
use crate::experience::{AssociationEvidenceStatus, ExperienceState, association_evidence_status};
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::received::{CurrentRecordingContext, ReceivedError, TemporalCurrentGroupInput};
use crate::simulation::{InstalledWorld, PhysicalState};
use indexmap::IndexSet;
use std::{mem::size_of, sync::Arc};

fn invalid() -> ReceivedError {
    ReceivedError("Current recording cohort has changed or is unavailable.")
}
fn capacity() -> ReceivedError {
    ReceivedError("Current recording cohort exceeds native byte allowance.")
}
#[derive(PartialEq, Eq)]
pub(super) struct TrackDescriptor {
    source_id: String,
    lease_id: String,
    track: String,
    exposure: String,
    channel: DefinitionPin,
    local_subject: Option<ObserverSubject>,
    subject: Option<ObserverSubject>,
}
pub(super) struct SelectedTrack {
    exposure: String,
    channel: DefinitionPin,
}
pub(super) type SelectedTracks = IndexMap<String, IndexMap<String, SelectedTrack>>;
/// A real pre-mutation selection, not caller-supplied names or a history query.
pub(crate) struct CurrentCohort {
    observer: ObserverLife,
    entries: Vec<AttentionEntry>,
    tracks: SelectedTracks,
    subjects: IndexSet<String>,
    descriptors: Vec<TrackDescriptor>,
    _reservation: ByteReservation,
}
impl CurrentCohort {
    pub(crate) fn observer(&self) -> &ObserverLife {
        &self.observer
    }
    pub(super) fn active_tracks(
        &self,
        reception: &ReceptionState,
        experience: &ExperienceState,
        source: &str,
    ) -> Result<SelectedTracks, ReceivedError> {
        let owner = reception
            .perception_evidence
            .as_ref()
            .and_then(|owners| owners.get(&self.observer.actor_id))
            .ok_or_else(invalid)?;
        let entries = owner
            .attention
            .as_ref()
            .map_or(&[][..], |attention| attention.entries.as_slice());
        let mut ids = candidate_ids(owner, entries);
        ids.insert(source.to_owned());
        let descriptors = descriptors(reception, experience, &self.observer.actor_id, &ids)?;
        let mut tracks = selected_tracks(entries, &descriptors)?;
        linked_tracks(&mut tracks, &self.subjects, &descriptors)?;
        Ok(tracks)
    }
    pub(super) fn correspondence_changed(
        &self,
        reception: &ReceptionState,
        experience: &ExperienceState,
        source: &str,
    ) -> Result<bool, ReceivedError> {
        if !self.entries.iter().any(|entry| entry.source_id == source) {
            return Ok(false);
        }
        let mut ids = IndexSet::new();
        ids.insert(source.to_owned());
        let after = descriptors(reception, experience, &self.observer.actor_id, &ids)?;
        Ok(!self
            .descriptors
            .iter()
            .filter(|descriptor| descriptor.source_id == source)
            .eq(after.iter()))
    }
    pub(crate) fn capture(
        physical: &PhysicalState,
        reception: &ReceptionState,
        installed: &InstalledWorld,
        experience: &ExperienceState,
        observer: &str,
        budget: &ByteBudget,
    ) -> Result<Option<Arc<Self>>, ReceivedError> {
        let Some(_entity) = physical
            .entities
            .get(observer)
            .filter(|entity| entity.has_memory())
        else {
            return Ok(None);
        };
        let Some(owner) = reception
            .perception_evidence
            .as_ref()
            .and_then(|owners| owners.get(observer))
        else {
            return Ok(None);
        };
        // Correspondence belongs to this received owner, including the old
        // owner while a body is being retired. Physical-life eligibility is a
        // separate current-body read; it cannot replace the old history epoch.
        let life = owner.life;
        let reservation = reserve(owner, observer, budget)?;
        let entries = owner
            .attention
            .as_ref()
            .map_or_else(Vec::new, |attention| attention.entries.clone());
        let descriptors = descriptors(
            reception,
            experience,
            observer,
            &candidate_ids(owner, &entries),
        )?;
        let tracks = selected_tracks(&entries, &descriptors)?;
        let subjects = selected_subjects(&entries, &descriptors)?;
        let _ = installed; // Immutable selected meaning is mounted below, never supplied by a caller.
        Ok(Some(Arc::new(Self {
            observer: ObserverLife {
                actor_id: observer.to_owned(),
                physical_life: life,
            },
            entries,
            tracks,
            subjects,
            descriptors,
            _reservation: reservation,
        })))
    }
}
fn reserve(
    owner: &PerceptionEvidenceOwner,
    observer: &str,
    budget: &ByteBudget,
) -> Result<ByteReservation, ReceivedError> {
    let mut bytes = heap_sum([
        size_of::<CurrentCohort>(),
        observer.len(),
        owner
            .attention
            .heap_bytes()
            .ok_or_else(capacity)?
            .checked_mul(4)
            .ok_or_else(capacity)?,
    ])
    .ok_or_else(capacity)?;
    let mut count = 0usize;
    for (id, contact) in &owner.current {
        count = count
            .checked_add(contact.content.groups.len())
            .ok_or_else(capacity)?;
        bytes = heap_sum([
            bytes,
            id.len().checked_mul(8).ok_or_else(capacity)?,
            contact
                .content
                .groups
                .iter()
                .try_fold(0usize, |sum, group| {
                    heap_sum([sum, group.received.heap_bytes()?.checked_mul(8)?])
                })
                .ok_or_else(capacity)?,
        ])
        .ok_or_else(capacity)?;
    }
    bytes = heap_sum([
        bytes,
        count
            .checked_mul(6 * size_of::<TrackDescriptor>())
            .ok_or_else(capacity)?,
        map_storage::<String, SelectedTrack>(count.checked_mul(4).ok_or_else(capacity)?)
            .ok_or_else(capacity)?,
    ])
    .ok_or_else(capacity)?;
    budget.reserve(bytes).map_err(|_| capacity())
}
fn candidate_ids(owner: &PerceptionEvidenceOwner, entries: &[AttentionEntry]) -> IndexSet<String> {
    let mut ids = IndexSet::new();
    if let Some(attention) = &owner.attention {
        let mut annotations: Vec<_> = attention.annotations.iter().collect();
        annotations.sort_by(|(a, _), (b, _)| crate::encoding::js_property_cmp(a, b));
        for (_, annotation) in annotations {
            ids.insert(annotation.source_id.clone());
        }
    }
    for entry in entries {
        ids.insert(entry.source_id.clone());
    }
    ids
}
pub(super) fn descriptors(
    reception: &ReceptionState,
    experience: &ExperienceState,
    observer: &str,
    ids: &IndexSet<String>,
) -> Result<Vec<TrackDescriptor>, ReceivedError> {
    let owner = reception
        .perception_evidence
        .as_ref()
        .and_then(|owners| owners.get(observer))
        .ok_or_else(invalid)?;
    let mut result = Vec::new();
    let values = &reception.received_values.as_ref();
    for id in ids {
        for source in received_attention_sources(owner, id)? {
            let mut subject = source.field.local_subject.clone();
            if source.field.value.kind == "body" && source.grant.modality == Modality::Sight {
                if let Some(association) = current_native_facet_at(
                    Some(owner),
                    id,
                    "association",
                    CurrentFacetSelector {
                        channel: Some(&source.grant.channel),
                        exposure: Some(&source.grant.exposure),
                        modality: None,
                    },
                )? {
                    if association.field.body_lease_id.as_ref() == Some(&source.field.id) {
                        if let Some(
                            value @ SensoryFacet::Association {
                                strength: AssociationStrength::Supported,
                                ..
                            },
                        ) = received_facet_value(values, &association.field.value)?
                        {
                            if association_evidence_status(
                                experience,
                                observer,
                                &value,
                                Some((
                                    &association.original_source.id,
                                    association.field.original_ordinal,
                                )),
                                &crate::worlds::InstalledEvidenceMeaning,
                            )
                            .map_err(|_| invalid())?
                                == AssociationEvidenceStatus::Retained
                            {
                                if let SensoryFacet::Association { subject: value, .. } = value {
                                    subject = Some(value);
                                }
                            }
                        }
                    }
                }
            }
            result.push(TrackDescriptor {
                source_id: source.grant.subject_id.clone(),
                lease_id: source.field.id.clone(),
                track: received_track_key(&source.grant.exposure, &source.grant.channel)?,
                exposure: source.grant.exposure.clone(),
                channel: source.grant.channel.clone(),
                local_subject: source.field.local_subject.clone(),
                subject,
            });
        }
    }
    Ok(result)
}
fn subject_key(subject: &ObserverSubject) -> Result<String, ReceivedError> {
    match subject {
        ObserverSubject::Entity { entity_id } => {
            crate::encoding::json_record(&("entity", entity_id))
        }
        ObserverSubject::Individual { individual_id } => {
            crate::encoding::json_record(&("individual", individual_id))
        }
    }
    .map_err(|_| invalid())
}
fn add(tracks: &mut SelectedTracks, descriptor: &TrackDescriptor) {
    tracks
        .entry(descriptor.source_id.clone())
        .or_default()
        .insert(
            descriptor.track.clone(),
            SelectedTrack {
                exposure: descriptor.exposure.clone(),
                channel: descriptor.channel.clone(),
            },
        );
}
fn selected_subjects(
    entries: &[AttentionEntry],
    descriptors: &[TrackDescriptor],
) -> Result<IndexSet<String>, ReceivedError> {
    let mut subjects = IndexSet::new();
    for entry in entries {
        if let Some(source) = descriptors
            .iter()
            .rev()
            .find(|source| {
                source.source_id == entry.source_id && source.track == entry.exposure.track
            })
            .filter(|source| source.lease_id == entry.lease_id)
        {
            for subject in [&source.local_subject, &source.subject]
                .into_iter()
                .flatten()
            {
                subjects.insert(subject_key(subject)?);
            }
        }
    }
    Ok(subjects)
}
fn linked_tracks(
    tracks: &mut SelectedTracks,
    subjects: &IndexSet<String>,
    descriptors: &[TrackDescriptor],
) -> Result<(), ReceivedError> {
    for source in descriptors {
        for subject in [&source.local_subject, &source.subject]
            .into_iter()
            .flatten()
        {
            if subjects.contains(&subject_key(subject)?) {
                add(tracks, source);
                break;
            }
        }
    }
    Ok(())
}
pub(super) fn selected_tracks(
    entries: &[AttentionEntry],
    descriptors: &[TrackDescriptor],
) -> Result<SelectedTracks, ReceivedError> {
    let subjects = selected_subjects(entries, descriptors)?;
    let mut tracks = SelectedTracks::new();
    for entry in entries {
        if let Some(source) = descriptors
            .iter()
            .rev()
            .find(|source| {
                source.source_id == entry.source_id && source.track == entry.exposure.track
            })
            .filter(|source| source.lease_id == entry.lease_id)
        {
            add(&mut tracks, source);
        }
    }
    linked_tracks(&mut tracks, &subjects, descriptors)?;
    Ok(tracks)
}

/// Completes the actual one-hop correspondence change without rerunning optional
/// attention competition. Recognition/familiarity affects the next opportunity.
pub(crate) struct ReceivingMutation<'a> {
    pub(crate) experience: &'a ExperienceState,
    pub(crate) current: &'a mut CurrentJournal,
    pub(crate) acquisitions: &'a mut crate::execution::TemporalScopes,
    pub(crate) meters: &'a mut crate::work::WorkMeters,
    pub(crate) budget: &'a ByteBudget,
}
pub(crate) struct CurrentCohortTransition {
    before: Arc<CurrentCohort>,
    prefix: CurrentContactBatchLease,
    acquisition: crate::execution::AcquisitionLease,
}
impl ReceivingMutation<'_> {
    pub(crate) fn prepare_identity(
        &mut self,
        physical: &PhysicalState,
        reception: &ReceptionState,
        installed: &InstalledWorld,
        observer: &str,
    ) -> Result<Option<CurrentCohortTransition>, ExecutionError> {
        // Unlike a real selection opportunity, identity replacement cannot
        // create an attention owner where the source had none.
        if reception
            .perception_evidence
            .as_ref()
            .and_then(|owners| owners.get(observer))
            .is_none_or(|owner| owner.attention.is_none())
        {
            return Ok(None);
        }
        CurrentCohort::capture(
            physical,
            reception,
            installed,
            self.experience,
            observer,
            self.budget,
        )?
        .map(|before| self.begin(physical, reception, before))
        .transpose()
    }
    fn begin(
        &mut self,
        physical: &PhysicalState,
        reception: &ReceptionState,
        before: Arc<CurrentCohort>,
    ) -> Result<CurrentCohortTransition, ExecutionError> {
        let observer = &before.observer;
        let entity = physical
            .entities
            .get(&observer.actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let frame = ObservationFrame {
            position_at_observation: entity
                .world_position()
                .ok_or(ExecutionError::UnsupportedFamily)?,
            forward_at_observation: Some(entity.spatial.heading),
        };
        let acquisition = self.acquisitions.begin_acquisition(
            &observer.actor_id,
            observer.physical_life,
            Some(frame),
        )?;
        let prefix = self.current.begin_batch(reception, &observer.actor_id)?;
        Ok(CurrentCohortTransition {
            before,
            prefix,
            acquisition,
        })
    }

    pub(crate) fn reconcile(
        &mut self,
        physical: &mut PhysicalState,
        reception: &mut ReceptionState,
        installed: &InstalledWorld,
        temporal: &mut crate::received::TemporalState,
        transition: CurrentCohortTransition,
        sample_token: Option<u64>,
    ) -> Result<(), ExecutionError> {
        let CurrentCohortTransition {
            before,
            prefix,
            acquisition,
        } = transition;
        let budget = self.budget;
        let observer = &before.observer.actor_id;
        physical
            .entities
            .get(observer)
            .ok_or(ExecutionError::MissingActor)?;
        let owner = reception
            .perception_evidence
            .as_ref()
            .and_then(|owners| owners.get(observer))
            .ok_or(ExecutionError::Invariant)?;
        if owner.life != before.observer.physical_life {
            return Err(ExecutionError::Invariant);
        }
        let _scratch = reserve(owner, observer, budget).map_err(ExecutionError::Received)?;
        let entries = owner
            .attention
            .as_ref()
            .map_or(&[][..], |attention| attention.entries.as_slice());
        let descriptors = descriptors(
            &reception,
            &self.experience,
            observer,
            &candidate_ids(owner, entries),
        )
        .map_err(ExecutionError::Received)?;
        let after = selected_tracks(entries, &descriptors).map_err(ExecutionError::Received)?;
        let mut subjects: IndexSet<_> = before.tracks.keys().cloned().collect();
        subjects.extend(after.keys().cloned());
        let mut inputs = Vec::new();
        for subject in subjects {
            let Some(contact) = owner.current.get(&subject) else {
                continue;
            };
            for group in &contact.content.groups {
                let key = received_track_key(
                    &group.received.grant.exposure,
                    &group.received.grant.channel,
                )
                .map_err(ExecutionError::Received)?;
                let was = before
                    .tracks
                    .get(&subject)
                    .is_some_and(|tracks| tracks.contains_key(&key));
                let is = after
                    .get(&subject)
                    .is_some_and(|tracks| tracks.contains_key(&key));
                if was == is {
                    continue;
                }
                let original = contact
                    .content
                    .originals
                    .get(&group.received.grant.original)
                    .ok_or(ExecutionError::Invariant)?;
                for partition in &group.metadata {
                    inputs.push(TemporalCurrentGroupInput {
                        subject_id: &group.received.grant.subject_id,
                        sample_token,
                        group,
                        partition,
                        original_source: original,
                        checked: false,
                        entering: !was,
                        exiting: !is,
                    });
                }
            }
        }
        if !inputs.is_empty() {
            let policy = &installed.attention.value().retention;
            let updates = temporal.capture_current(
                &mut CurrentRecordingContext {
                    actor_id: observer,
                    owner,
                    values: reception
                        .received_values
                        .as_mut()
                        .ok_or(ExecutionError::UnfinishedOccurrence)?,
                    identity: &mut physical.identity,
                    scopes: self.acquisitions,
                    recent_policy: &policy.recent,
                    maintenance_headroom: policy.maintenance_headroom,
                    meaning: &crate::worlds::InstalledEvidenceMeaning,
                    meters: self.meters,
                    now: physical.header.sim_time,
                    sequence: physical.header.sequence,
                    budget,
                },
                &inputs,
                &policy.recent,
            )?;
            current_groups_set_recording(self.current, reception, observer, updates.updates())?;
        }
        let values = reception
            .received_values
            .as_ref()
            .ok_or(ExecutionError::UnfinishedOccurrence)?;
        if prefix.owns_prefix() {
            self.acquisitions.flush_acquisition(
                acquisition,
                temporal,
                values,
                &mut physical.identity,
                &crate::worlds::InstalledEvidenceMeaning,
                self.meters,
            )?;
        }
        self.current.finish_batch(reception, prefix)?;
        let values = reception
            .received_values
            .as_ref()
            .ok_or(ExecutionError::UnfinishedOccurrence)?;
        self.acquisitions.finish_acquisition(
            acquisition,
            &mut *temporal,
            values,
            &mut physical.identity,
            &crate::worlds::InstalledEvidenceMeaning,
            &mut self.meters,
        )?;
        Ok(())
    }
}
pub(crate) fn reconcile_current_cohort(
    core: &mut CoreMutation<'_>,
    before: Arc<CurrentCohort>,
    sample_token: Option<u64>,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let mut receiver = ReceivingMutation {
        experience: &core.state.experience,
        current: &mut core.journal.current,
        acquisitions: &mut core.journal.acquisitions,
        meters: &mut core.journal.meters,
        budget,
    };
    let transition = receiver.begin(&core.state.physical, &core.state.reception, before)?;
    receiver.reconcile(
        &mut core.state.physical,
        &mut core.state.reception,
        &core.state.installed,
        &mut core.state.temporal,
        transition,
        sample_token,
    )
}

/// Check event participants against actual selected one-hop tracks before
/// rendering names or constructing a personal envelope.
pub(crate) fn attended_event_participants(
    core: &CoreMutation<'_>,
    observer: &str,
    ids: &[&str],
    at: f64,
    budget: &ByteBudget,
) -> Result<bool, ReceivedError> {
    if ids.is_empty() {
        return Ok(false);
    }
    let Some(scope) = CurrentBodyReadScope::prepare(
        &core.state.reception,
        &core.state.physical.entities,
        &core.state.installed,
        &core.state.experience,
        &crate::worlds::InstalledEvidenceMeaning,
        observer,
    )?
    else {
        return Ok(false);
    };
    let entries = scope
        .state()
        .attention
        .as_ref()
        .map_or(&[][..], |attention| attention.entries.as_slice());
    if entries.is_empty() {
        return Ok(false);
    }
    let _reservation = reserve(scope.state(), observer, budget)?;
    let _ids_reservation = budget
        .reserve(
            heap_sum([
                ids.iter()
                    .try_fold(0usize, |sum, id| sum.checked_add(id.len()))
                    .ok_or_else(capacity)?,
                map_storage::<String, ()>(ids.len().checked_mul(2).ok_or_else(capacity)?)
                    .ok_or_else(capacity)?,
                ids.len()
                    .checked_mul(size_of::<TrackDescriptor>())
                    .ok_or_else(capacity)?,
            ])
            .ok_or_else(capacity)?,
        )
        .map_err(|_| capacity())?;

    let mut candidates = candidate_ids(scope.state(), entries);
    candidates.extend(ids.iter().map(|id| (*id).to_owned()));
    let descriptors = descriptors(
        &core.state.reception,
        &core.state.experience,
        observer,
        &candidates,
    )?;
    let mut tracks = selected_tracks(entries, &descriptors)?;
    let subjects = selected_subjects(entries, &descriptors)?;
    linked_tracks(&mut tracks, &subjects, &descriptors)?;
    for id in ids {
        let episode = core
            .state
            .reception
            .perception_episodes
            .as_ref()
            .and_then(|owners| owners.get(observer))
            .and_then(|episodes| episodes.get(*id))
            .map(String::as_str);
        let Some((body, _)) = acquisition::received_event_body(&scope, id, at, episode)? else {
            continue;
        };
        if tracks.get(*id).is_some_and(|tracks| {
            received_track_key(&body.grant.exposure, &body.grant.channel)
                .is_ok_and(|key| tracks.contains_key(&key))
        }) {
            return Ok(true);
        }
    }
    Ok(false)
}
