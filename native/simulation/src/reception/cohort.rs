//! The selected receiver keeps pre-mutation correspondence until the real
//! temporal owner has closed outgoing tracks and admitted incoming tracks.
use super::*;
use crate::attention::AttentionEntry;
use crate::execution::{CoreMutation, ExecutionError};
use crate::experience::{AssociationEvidenceStatus, ExperienceState, association_evidence_status};
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::received::{
    CurrentRecordingContext, ReceivedError, TemporalAppendError, TemporalCurrentGroupInput,
};
use crate::simulation::{InstalledWorld, PhysicalState};
use indexmap::IndexSet;
use std::mem::size_of;

fn invalid() -> ReceivedError {
    ReceivedError("Current recording cohort has changed or is unavailable.")
}
fn capacity() -> ReceivedError {
    ReceivedError("Current recording cohort exceeds native byte allowance.")
}
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
    _reservation: ByteReservation,
}
impl CurrentCohort {
    pub(crate) fn observer(&self) -> &ObserverLife {
        &self.observer
    }
    pub(crate) fn capture(
        physical: &PhysicalState,
        reception: &ReceptionState,
        installed: &InstalledWorld,
        experience: &ExperienceState,
        observer: &str,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, ReceivedError> {
        let Some(entity) = physical
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
            .filter(|owner| owner.attention.is_some())
        else {
            return Ok(None);
        };
        let life = entity.physical_life().ok_or_else(invalid)?;
        if owner.life != life {
            return Err(invalid());
        }
        let reservation = reserve(owner, observer, budget)?;
        let entries = owner
            .attention
            .as_ref()
            .ok_or_else(invalid)?
            .entries
            .clone();
        let descriptors = descriptors(
            reception,
            experience,
            observer,
            &candidate_ids(owner, &entries),
        )?;
        let tracks = selected_tracks(&entries, &descriptors)?;
        let _ = installed; // Immutable selected meaning is mounted below, never supplied by a caller.
        Ok(Some(Self {
            observer: ObserverLife {
                actor_id: observer.to_owned(),
                physical_life: life,
            },
            entries,
            tracks,
            _reservation: reservation,
        }))
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
pub(super) fn selected_tracks(
    entries: &[AttentionEntry],
    descriptors: &[TrackDescriptor],
) -> Result<SelectedTracks, ReceivedError> {
    let mut subjects = IndexSet::new();
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
            for subject in [&source.local_subject, &source.subject]
                .into_iter()
                .flatten()
            {
                subjects.insert(subject_key(subject)?);
            }
        }
    }
    for source in descriptors {
        let mut linked = false;
        for subject in [&source.local_subject, &source.subject]
            .into_iter()
            .flatten()
        {
            if subjects.contains(&subject_key(subject)?) {
                linked = true;
                break;
            }
        }
        if linked {
            add(&mut tracks, source);
        }
    }
    Ok(tracks)
}
fn append_error(error: TemporalAppendError) -> ExecutionError {
    match error {
        TemporalAppendError::Received(error) => ExecutionError::Received(error),
        TemporalAppendError::Work(error) => ExecutionError::Work(error),
    }
}

/// Completes the actual one-hop correspondence change without rerunning optional
/// attention competition. Recognition/familiarity affects the next opportunity.
pub(crate) fn reconcile_current_cohort(
    core: &mut CoreMutation<'_>,
    before: CurrentCohort,
    sample_token: Option<u64>,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let observer = &before.observer.actor_id;
    let entity = core
        .state
        .physical
        .entities
        .get(observer)
        .ok_or(ExecutionError::MissingActor)?;
    if entity.physical_life() != Some(before.observer.physical_life) {
        return Err(ExecutionError::Invariant);
    }
    let owner = core
        .state
        .reception
        .perception_evidence
        .as_ref()
        .and_then(|owners| owners.get(observer))
        .ok_or(ExecutionError::Invariant)?;
    let _scratch = reserve(owner, observer, budget).map_err(ExecutionError::Received)?;
    let entries = owner
        .attention
        .as_ref()
        .map_or(&[][..], |attention| attention.entries.as_slice());
    let descriptors = descriptors(
        &core.state.reception,
        &core.state.experience,
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
    if inputs.is_empty() {
        return Ok(());
    }
    let frame = ObservationFrame {
        position_at_observation: entity
            .world_position()
            .ok_or(ExecutionError::UnsupportedFamily)?,
        forward_at_observation: Some(entity.spatial.heading),
    };
    let acquisition = core.journal.acquisitions.begin_acquisition(
        observer,
        before.observer.physical_life,
        Some(frame),
    )?;
    let lease = core.journal.acquisitions.begin_received(
        observer,
        before.observer.physical_life,
        sample_token,
    )?;
    let policy = &core.state.installed.attention.value().retention;
    let mut loan = core.journal.acquisitions.loan(
        lease,
        &core.state.temporal,
        &policy.recent,
        policy.maintenance_headroom,
    )?;
    let (scope, transition) = loan.parts().ok_or(ExecutionError::Invariant)?;
    let result = core.state.temporal.capture_current(
        &mut CurrentRecordingContext {
            actor_id: observer,
            owner,
            values: core
                .state
                .reception
                .received_values
                .as_mut()
                .ok_or(ExecutionError::UnfinishedOccurrence)?,
            identity: &mut core.state.physical.identity,
            scope,
            transition,
            meaning: &crate::worlds::InstalledEvidenceMeaning,
            meters: &mut core.journal.meters,
            now: core.state.physical.header.sim_time,
            sequence: core.state.physical.header.sequence,
            budget,
        },
        &inputs,
    );
    core.journal.acquisitions.return_loan(loan)?;
    let updates = result.map_err(append_error)?;
    current_groups_set_recording(
        &mut core.journal.current,
        &mut core.state.reception,
        observer,
        updates.updates(),
    )
    .map_err(ExecutionError::Received)?;
    let values = core
        .state
        .reception
        .received_values
        .as_ref()
        .ok_or(ExecutionError::Invariant)?;
    core.journal.acquisitions.finish_received(
        lease,
        &mut core.state.temporal,
        values,
        &mut core.state.physical.identity,
        &crate::worlds::InstalledEvidenceMeaning,
        &mut core.journal.meters,
    )?;
    core.journal.acquisitions.finish_acquisition(
        acquisition,
        &mut core.state.temporal,
        values,
        &mut core.state.physical.identity,
        &crate::worlds::InstalledEvidenceMeaning,
        &mut core.journal.meters,
    )?;
    Ok(())
}
