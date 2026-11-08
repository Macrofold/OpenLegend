//! Current receiving ownership, chronology and membership validation after all
//! typed rows are assembled. It grants no sight and repairs no stale record.

use super::*;
use crate::received::{CurrentMemberPart, ReceivedError, TemporalState};
use crate::simulation::{InstalledWorld, PhysicalState};
use std::collections::BTreeSet;
fn invalid() -> ReceivedError {
    ReceivedError("Invalid current perception owner, membership or chronology.")
}
fn time(at: f64, now: f64) -> bool {
    at.is_finite() && at >= 0.0 && at <= now
}
fn field_identity(kind: &str, pin: &DefinitionPin) -> Result<String, ReceivedError> {
    crate::encoding::json_record(&(kind, &pin.id, pin.version, &pin.digest)).map_err(|_| invalid())
}
fn original_key(source: &ReceivedObservation) -> Result<String, ReceivedError> {
    crate::encoding::json_record(&(&source.id, source.revision)).map_err(|_| invalid())
}
fn member_check(kind: &str, part: CurrentReceivedPart, modality: Modality) -> CurrentCheck {
    if modality != Modality::Sight || part == CurrentReceivedPart::Pose {
        CurrentCheck::None
    } else if matches!(
        kind,
        "description" | "carried" | "pile-contents" | "public-attributes"
    ) {
        CurrentCheck::Detail
    } else {
        CurrentCheck::Broad
    }
}
fn valid_stamp(
    values: &impl ReceivedValueLookup,
    stamp: SightStampRef<'_>,
    through: f64,
    revision: u64,
    input_revision: u64,
    next_id: u64,
) -> bool {
    time(stamp.through, through)
        && stamp.revision >= 1
        && stamp.revision <= revision
        && stamp.input_revision <= input_revision
        && stamp.received_order > 0
        && stamp.received_order < next_id
        && received_observation_frame(values, stamp.frame_ref).is_ok_and(ObservationFrame::validate)
}
impl CurrentGroupTimes {
    pub(crate) fn validate(&self, now: f64) -> bool {
        let times = self.expanded();
        [
            times.value_measured_from,
            times.value_measured_through,
            times.value_acquired_at,
            times.confirmed_from,
            times.confirmed_through,
        ]
        .into_iter()
        .all(|at| time(at, now))
            && self.is_canonically_packed()
    }
}
impl ReceptionState {
    pub(crate) fn validate_reception(
        &self,
        physical: &PhysicalState,
        installed: &InstalledWorld,
        temporal: &TemporalState,
        originals: &mut OriginalRevisionRegistry,
    ) -> Result<(), ReceivedError> {
        let now = physical.header.sim_time;
        let input_revision = self.sensory.as_ref().map_or(0, |pending| pending.revision);
        let values = &self.received_values.as_ref();
        if let Some(pending) = &self.sensory {
            pending.validate(now, installed.maximum_change_scopes)?;
        }
        let Some(owners) = &self.perception_evidence else {
            return Ok(());
        };
        for (observer_id, owner) in owners {
            if owner.received_at_sequence > physical.header.sequence
                || owner.observer.as_ref().is_some_and(|observer| {
                    observer.actor_id != *observer_id || observer.physical_life != owner.life
                })
            {
                return Err(invalid());
            }
            let observer = ObserverLife {
                actor_id: observer_id.clone(),
                physical_life: owner.life,
            };
            let mut orders = BTreeSet::new();
            for (subject_id, contact) in &owner.current {
                if contact.order >= owner.next_contact
                    || !orders.insert(contact.order)
                    || contact.content.groups.is_empty()
                    || contact
                        .content
                        .field_order
                        .iter()
                        .collect::<BTreeSet<_>>()
                        .len()
                        != contact.content.field_order.len()
                {
                    return Err(invalid());
                }
                let mut kinds = BTreeSet::new();
                let mut used = BTreeSet::new();
                let mut contexts = Vec::new();
                for group in &contact.content.groups {
                    let grant = &group.received.grant;
                    if !grant.channel.is_valid()
                        || grant.subject_id != *subject_id
                        || !is_safe_record_id(subject_id)
                        || grant.exposure.is_empty()
                        || group.received.fields.is_empty()
                        || group.metadata.is_empty()
                    {
                        return Err(invalid());
                    }
                    let source = contact
                        .content
                        .originals
                        .get(&grant.original)
                        .ok_or_else(invalid)?;
                    let header = received_observation_header(values, source)?;
                    if header
                        .channel
                        .as_ref()
                        .is_some_and(|channel| channel != &grant.channel)
                        && group
                            .received
                            .fields
                            .keys()
                            .any(|kind| kind != "association")
                    {
                        return Err(invalid());
                    }
                    let mut parts = BTreeSet::new();
                    for partition in &group.metadata {
                        if !time(partition.received_at, now)
                            || partition.members.is_empty()
                            || !partition.times.validate(now)
                            || partition
                                .availability
                                .as_ref()
                                .is_some_and(|availability| !time(availability.at, now))
                            || partition.frame_ref.as_ref().is_some_and(|reference| {
                                !received_observation_frame(values, reference)
                                    .is_ok_and(ObservationFrame::validate)
                            })
                        {
                            return Err(invalid());
                        }
                        for (kind, part) in &partition.members {
                            let field = group.received.fields.get(kind).ok_or_else(invalid)?;
                            if !current_field_parts(field).contains(part)
                                || partition.check != member_check(kind, *part, grant.modality)
                                || !parts.insert((kind.as_str(), part_key(*part)))
                            {
                                return Err(invalid());
                            }
                        }
                        let context = serde_json::to_value((
                            grant,
                            &partition.times,
                            partition.revision,
                            partition.received_at,
                            partition.received_order,
                            partition.confirmed_revision,
                            &partition.frame_ref,
                            partition.check,
                            &partition.availability,
                        ))
                        .map_err(|_| invalid())?;
                        if contexts.contains(&context) {
                            return Err(invalid());
                        }
                        contexts.push(context);
                    }
                    let mut recorded = BTreeSet::new();
                    if let Some(recordings) = &group.recordings {
                        let epoch = &temporal
                            .actor(observer_id)
                            .ok_or_else(invalid)?
                            .header()
                            .epoch;
                        let members: Vec<_> = group
                            .metadata
                            .iter()
                            .flat_map(|partition| {
                                partition
                                    .members
                                    .iter()
                                    .map(|(kind, part)| CurrentMemberPart {
                                        kind: kind.clone(),
                                        part: *part,
                                    })
                            })
                            .collect();
                        for recording in recordings {
                            recording.validate(now, &members, &observer, epoch)?;
                            for member in &recording.members {
                                let content = recording
                                    .content
                                    .iter()
                                    .find(|content| {
                                        content.kind == member.kind && content.part == member.part
                                    })
                                    .ok_or_else(invalid)?;
                                let field = group
                                    .received
                                    .fields
                                    .get(&member.kind)
                                    .ok_or_else(invalid)?;
                                let expected = if member.part == CurrentReceivedPart::Pose {
                                    match &field.value.reception {
                                        Some(FacetReception::Body { pose_ref }) => pose_ref,
                                        _ => &field.value.reference,
                                    }
                                } else {
                                    &field.value.reference
                                };
                                if !same_received_value_reference(&content.value, expected)?
                                    || !recorded
                                        .insert((member.kind.as_str(), part_key(member.part)))
                                {
                                    return Err(invalid());
                                }
                            }
                        }
                    }
                    used.insert(grant.original.as_str());
                    for (kind, field) in &group.received.fields {
                        if !kinds.insert(field_identity(kind, &grant.channel)?)
                            || field.semantic_revision < 1
                            || kind != &field.value.kind
                            || current_field_parts(field)
                                .iter()
                                .any(|part| !parts.contains(&(kind.as_str(), part_key(*part))))
                        {
                            return Err(invalid());
                        }
                        let partition =
                            current_group_metadata(group, kind, None).ok_or_else(invalid)?;
                        let input = CurrentNativeFacet {
                            field,
                            grant,
                            original_source: source,
                            metadata: partition,
                        };
                        self.validate_current_field(observer_id, owner, input, values, now)?;
                    }
                }
                if kinds.len() != contact.content.field_order.len()
                    || contact
                        .content
                        .field_order
                        .iter()
                        .any(|kind| !kinds.contains(kind))
                    || used.len() != contact.content.originals.len()
                {
                    return Err(invalid());
                }
                for (key, source) in &contact.content.originals {
                    originals.validate_received(values, source)?;
                    let header = received_observation_header(values, source)?;
                    if *key != original_key(source)?
                        || header.observer != observer
                        || header.acquired_at > now
                    {
                        return Err(invalid());
                    }
                }
                if let Some(check) = &contact.sight {
                    let phase = owner.visual_confirmation.as_ref().ok_or_else(invalid)?;
                    if !valid_stamp(
                        values,
                        check.into(),
                        phase.through,
                        phase.revision,
                        input_revision,
                        physical.identity.next_id(),
                    ) || check.detail.as_ref().is_some_and(|detail| {
                        !valid_stamp(
                            values,
                            detail.into(),
                            check.through,
                            check.revision,
                            input_revision,
                            physical.identity.next_id(),
                        ) || detail.input_revision > check.input_revision
                    }) {
                        return Err(invalid());
                    }
                }
            }
            if owner.gaps.values().any(|gap| {
                !gap.lost_at.is_finite() || !gap.through.is_finite() || gap.through < gap.lost_at
            }) {
                return Err(invalid());
            }
            if let Some(phase) = &owner.visual_confirmation {
                if !phase.channel.is_valid()
                    || !time(phase.through, now)
                    || phase.revision < 1
                    || phase.frame_revision < 1
                    || phase.frame_revision > phase.revision
                    || !received_observation_frame(values, &phase.frame_ref)
                        .is_ok_and(ObservationFrame::validate)
                    || phase.complete.as_ref().is_some_and(|stamp| {
                        !valid_stamp(
                            values,
                            stamp.into(),
                            phase.through,
                            phase.revision,
                            input_revision,
                            physical.identity.next_id(),
                        )
                    })
                {
                    return Err(invalid());
                }
            }
            let mut received_keys = BTreeSet::new();
            for source in &owner.received {
                if !received_keys.insert(original_key(source)?) {
                    return Err(invalid());
                }
                originals.validate_received(values, source)?;
                let header = received_observation_header(values, source)?;
                if header.observer != observer || header.acquired_at > now {
                    return Err(invalid());
                }
            }
            for (key, index) in &owner.receipts {
                let source = owner.received.get(*index as usize).ok_or_else(invalid)?;
                let header = received_observation_header(values, source)?;
                if *key
                    != observation_acquisition_key(
                        header.modality,
                        &header.detector,
                        header.channel.as_ref(),
                        &source.origin,
                    )?
                {
                    return Err(invalid());
                }
            }
            self.validate_motion(owner, values, now)?;
            if let Some(support) = &owner.support {
                support.validate(
                    &physical.entities,
                    observer_id,
                    now,
                    installed.detection_support.value(),
                    originals,
                )?;
            }
            if let Some(geometry) = &owner.geometry {
                geometry.validate(
                    owner,
                    values,
                    now,
                    input_revision,
                    installed.attention.value(),
                    temporal,
                    originals,
                )?;
            }
            if let Some(attention) = &owner.attention {
                attention.validate(installed.attention.value(), &observer)?;
            }
        }
        Ok(())
    }
    fn validate_current_field(
        &self,
        observer_id: &str,
        owner: &PerceptionEvidenceOwner,
        input: CurrentNativeFacet<'_>,
        values: &impl ReceivedValueLookup,
        now: f64,
    ) -> Result<(), ReceivedError> {
        let observer = owner.observer.as_ref().ok_or_else(invalid)?;
        let value = validate_received_facet(values, &input.field.value)?;
        let header = received_observation_header(values, input.original_source)?;
        let times = input.metadata.times.expanded();
        value
            .validate_participant_observers(observer)
            .map_err(|_| invalid())?;
        if !input.field.id.starts_with("perception-lease-")
            || input.metadata.revision < 1
            || observer.actor_id != observer_id
            || observer.physical_life != owner.life
            || !is_safe_record_id(&input.grant.subject_id)
            || header.observer != *observer
            || input.field.original_ordinal as usize >= input.original_source.facets.len()
            || input.original_source.facets[input.field.original_ordinal as usize]
                .value
                .kind
                != value.kind()
            || header.acquired_at > now
            || value.kind() != "association" && input.grant.modality != header.modality
            || !matches!(
                value.kind(),
                "surface-patch"
                    | "physical-boundary"
                    | "detected"
                    | "location"
                    | "body"
                    | "description"
                    | "carried"
                    | "pile-contents"
                    | "public-attributes"
                    | "contact"
                    | "association"
                    | "observed-motion"
            )
            || ![
                times.value_measured_from,
                times.value_measured_through,
                times.value_acquired_at,
                times.confirmed_from,
                times.confirmed_through,
            ]
            .into_iter()
            .all(f64::is_finite)
            || times.value_measured_through < times.value_measured_from
            || times.value_measured_through > now
            || times.value_measured_through > times.value_acquired_at
            || times.value_measured_through > times.confirmed_through
            || times.value_acquired_at < header.acquired_at
            || times.value_acquired_at > now
            || times.confirmed_through > now
            || times.confirmed_through < times.confirmed_from
        {
            return Err(invalid());
        }
        if input.grant.modality == Modality::Sight
            && value.kind() == "location"
            && owner.visual_confirmation.as_ref().is_some_and(|phase| {
                phase.channel == input.grant.channel && input.metadata.revision > phase.revision
            })
        {
            return Err(invalid());
        }
        if let Some(subject) = &input.field.local_subject {
            if !subject.validate()
                || matches!(subject,ObserverSubject::Individual{individual_id}if self.observer_identities.as_ref().and_then(|owners|owners.get(observer_id)).is_none_or(|identities|!identities.contains_key(individual_id)))
            {
                return Err(invalid());
            }
        }
        if value.kind() == "association" {
            let body = current_native_facet_at(
                Some(owner),
                &input.grant.subject_id,
                "body",
                CurrentFacetSelector {
                    channel: Some(&input.grant.channel),
                    ..Default::default()
                },
            )?;
            if input
                .field
                .body_lease_id
                .as_ref()
                .is_none_or(|lease| body.is_none_or(|body| &body.field.id != lease))
            {
                return Err(invalid());
            }
        }
        current_facet_exposure(owner, input)?
            .validate()
            .map_err(|_| invalid())?;
        Ok(())
    }
    fn validate_motion(
        &self,
        owner: &PerceptionEvidenceOwner,
        values: &impl ReceivedValueLookup,
        now: f64,
    ) -> Result<(), ReceivedError> {
        let Some(tracks) = &owner.motion_samples else {
            return if owner.motion_expires_at.is_none() {
                Ok(())
            } else {
                Err(invalid())
            };
        };
        let mut next: Option<f64> = None;
        for (subject_id, track) in tracks {
            let location = current_native_facet_at(
                Some(owner),
                subject_id,
                "location",
                CurrentFacetSelector {
                    modality: Some(Modality::Sight),
                    ..Default::default()
                },
            )?
            .ok_or_else(invalid)?;
            if !track.through.is_finite()
                || track.through > now
                || !track.expires_at.is_finite()
                || track.expires_at < track.through
                || track.earlier.times.iter().any(|at| !time(*at, now))
            {
                return Err(invalid());
            }
            let Some(SensoryFacet::Location {
                location: earlier_location,
                frame: earlier_frame,
            }) = received_facet_value(values, &track.earlier.value)?
            else {
                return Err(invalid());
            };
            let Some(SensoryFacet::Location {
                location: later_location,
                frame: later_frame,
            }) = received_facet_value(values, &location.field.value)?
            else {
                return Err(invalid());
            };
            let observer = owner.observer.as_ref().ok_or_else(invalid)?;
            let source = |id: String, revision: u64| EvidenceSource {
                family: EvidenceFamily::NativeExposure,
                id,
                revision: SourceRevision::Number(revision),
                observer: observer.clone(),
            };
            let earlier = ReceivedLocationSample {
                location: earlier_location,
                frame: earlier_frame,
                measured_from: track.earlier.times[0],
                measured_through: track.earlier.times[1],
                acquired_at: track.earlier.times[2],
                confirmed_from: track.earlier.times[3],
                confirmed_through: track.earlier.times[4],
                original: ObservationFactKey {
                    source: source(
                        track.earlier.original.id.clone(),
                        track.earlier.original.revision,
                    ),
                    ordinal: track.earlier.original.ordinal,
                },
                confirmation: source(
                    track.earlier.confirmation.id.clone(),
                    track.earlier.confirmation.revision,
                ),
                aliases: track.earlier.aliases.clone(),
            };
            let times = location.metadata.times.expanded();
            let later = ReceivedLocationSample {
                location: later_location,
                frame: later_frame,
                measured_from: times.value_measured_from,
                measured_through: times.value_measured_through,
                acquired_at: times.value_acquired_at,
                confirmed_from: times.confirmed_from,
                confirmed_through: times.confirmed_through,
                original: ObservationFactKey {
                    source: source(
                        location.original_source.id.clone(),
                        location.original_source.revision,
                    ),
                    ordinal: location.field.original_ordinal,
                },
                confirmation: source(location.field.id.clone(), location.metadata.revision),
                aliases: match &location.original_source.origin {
                    ObservationOrigin::Occurrence { event_id, .. } => Some(vec![event_id.clone()]),
                    ObservationOrigin::Exposure {
                        source: Some(source),
                        ..
                    } => Some(vec![source.id.clone()]),
                    _ => None,
                },
            };
            SensoryFacet::ObservedMotion {
                exposure: current_facet_exposure(owner, location)?,
                earlier,
                later,
                correspondence: MotionCorrespondence::UnambiguousReceivedContinuity,
            }
            .validate()
            .map_err(|_| invalid())?;
            next = Some(next.map_or(track.expires_at, |prior| prior.min(track.expires_at)));
        }
        if owner.motion_expires_at != next {
            return Err(invalid());
        }
        Ok(())
    }
}
fn part_key(part: CurrentReceivedPart) -> u8 {
    match part {
        CurrentReceivedPart::Value => 0,
        CurrentReceivedPart::Detail => 1,
        CurrentReceivedPart::Pose => 2,
    }
}
