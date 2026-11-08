//! A second interpreted original cites the actually heard clause and one
//! uniquely acquired place. It grants neither new sight nor a hidden position.
use super::*;
use crate::events::WorldEvent;
use crate::execution::{CoreMutation, ExecutionError};
use crate::experience::Awareness;
use crate::host::ByteBudget;
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::worlds::base_observed::{
    ClaimPresence, ClaimedInterval, IntervalKind, IntervalPrecision, ObservationClaim,
};
use std::mem::size_of;
fn invalid() -> ExecutionError {
    crate::received::ReceivedError("Grounded warning lacks its actually received proof.").into()
}
pub(crate) fn acquire_ordinary_warning(
    core: &mut CoreMutation<'_>,
    event: &WorldEvent,
    awareness: &Awareness,
    budget: &ByteBudget,
) -> Result<Option<OwnedObservation>, ExecutionError> {
    let Some(speech) = awareness
        .speech
        .as_ref()
        .filter(|speech| speech.perception == SpeechPerception::Heard)
    else {
        return Ok(None);
    };
    let Some(source) = awareness.observation.as_ref() else {
        return Ok(None);
    };
    let Some(interpretation) = crate::worlds::base_recognition::ordinary_warning(
        core.state.installed.recognition.value(),
        core.state
            .installed
            .content
            .time_policy
            .normal_game_seconds_per_second,
        &speech.segments,
        budget,
    )?
    else {
        return Ok(None);
    };
    let now = core.state.physical.header.sim_time;
    if now < event.at || now >= event.at + interpretation.duration {
        return Ok(None);
    }
    let known = core
        .state
        .experience
        .known_places(&awareness.actor_id)
        .map_err(|_| invalid())?;
    let mut places = known.matching(&interpretation.label);
    let Some(place) = places.next() else {
        return Ok(None);
    };
    if places.next().is_some() {
        return Ok(None);
    }
    let Some(observer) = core
        .state
        .physical
        .entities
        .get(&awareness.actor_id)
        .filter(|observer| observer.actor.is_some())
    else {
        return Ok(None);
    };
    let Some(ordinal) = source
        .facets
        .iter()
        .position(|facet| facet.value.kind() == "speech")
    else {
        return Ok(None);
    };
    if awareness.source_subject.is_none() && source.channel.is_none() {
        return Ok(None);
    }
    let bytes = heap_sum([
        size_of::<ReceivedObservationInput>()
            + size_of::<ObservationFacetInput>()
            + size_of::<SensoryFacet>(),
        source
            .context
            .heap_bytes()
            .ok_or(ExecutionError::Capacity)?,
        source
            .observer
            .heap_bytes()
            .ok_or(ExecutionError::Capacity)?,
        source
            .id
            .len()
            .checked_mul(3)
            .ok_or(ExecutionError::Capacity)?,
        event
            .id
            .len()
            .checked_mul(3)
            .ok_or(ExecutionError::Capacity)?,
        source
            .channel
            .heap_bytes()
            .ok_or(ExecutionError::Capacity)?,
        place.heap_bytes().ok_or(ExecutionError::Capacity)?,
        awareness
            .source_subject
            .heap_bytes()
            .ok_or(ExecutionError::Capacity)?,
        speech
            .segments
            .heap_bytes()
            .ok_or(ExecutionError::Capacity)?,
        size_of::<ObservationFactKey>() * 2 + size_of::<SupportAlias>() * 2,
    ])
    .ok_or(ExecutionError::Capacity)?;
    let _scratch = budget.reserve(bytes)?;
    let speaker = if let Some(subject) = &awareness.source_subject {
        EvidenceParticipant::Individual {
            subject: subject.clone(),
            association: None,
        }
    } else {
        EvidenceParticipant::Exposure {
            exposure: ObservationExposure {
                observer: source.observer.clone(),
                episode_id: source.id.clone(),
                track: received_track_key(
                    &source.id,
                    source.channel.as_ref().ok_or_else(invalid)?,
                )?,
            },
        }
    };
    let mut aliases = vec![SupportAlias {
        family: AwarenessFamily::Awareness,
        id: event.id.clone(),
    }];
    if let Some(id) = &place.source_event_id {
        aliases.push(SupportAlias {
            family: AwarenessFamily::Awareness,
            id: id.clone(),
        });
    }
    let value = SensoryFacet::Claim {
        claim: ObservationClaim::Danger {
            location: place.location.clone(),
            when: ClaimedInterval {
                kind: IntervalKind::StatedInterval,
                from: event.at,
                through: event.at + interpretation.duration,
                precision: IntervalPrecision::Approximate,
            },
            presence: ClaimPresence::Possible,
        },
        strength: PossibleStrength::Possible,
        speaker,
        words_as_heard: speech
            .segments
            .iter()
            .filter_map(|segment| match segment {
                SpeechSegment::Heard { text } => Some(text.as_str()),
                _ => None,
            })
            .collect::<Vec<_>>()
            .join(" "),
        support: vec![
            ObservationFactKey {
                source: EvidenceSource {
                    family: EvidenceFamily::NativeExposure,
                    observer: source.observer.clone(),
                    id: source.id.clone(),
                    revision: SourceRevision::Number(source.revision),
                },
                ordinal: ordinal as u64,
            },
            ObservationFactKey {
                source: place.source.clone(),
                ordinal: place.facet_ordinal,
            },
        ],
        support_aliases: Some(aliases),
    };
    let input = ReceivedObservationInput {
        origin: ObservationOrigin::Occurrence {
            event_id: event.id.clone(),
            at: event.at,
            order: event.order.unwrap_or(event.sequence),
        },
        modality: Modality::Hearing,
        channel: None,
        detector: DetectorIdentity {
            id: "native:grounded-warning".to_owned(),
            version: 1,
        },
        context: source.context.clone(),
        facets: vec![ObservationFacetInput {
            support: None,
            role: FacetRole::Testimony,
            as_of: event.at,
            measured_from: event.at,
            measured_through: event.at,
            acquired_at: None,
            prepared_pose: None,
            value,
        }],
    };
    let life = observer.physical_life().ok_or_else(invalid)?;
    let lease = core
        .journal
        .acquisitions
        .begin_received(&awareness.actor_id, life, None)?;
    let original = core.journal.originals.acquire(
        &mut core.state.reception,
        observer,
        input,
        now,
        core.state.physical.header.sequence,
        None,
        &mut core.state.physical.identity,
        &core.state.activity.display,
        &mut core.journal.meters,
    )?;
    if let Some(values) = core.state.reception.received_values.as_ref() {
        core.journal.acquisitions.finish_received(
            lease,
            &mut core.state.temporal,
            values,
            &mut core.state.physical.identity,
            &crate::worlds::InstalledEvidenceMeaning,
            &mut core.journal.meters,
        )?;
    } else {
        core.journal.acquisitions.finish_empty_received(lease)?;
    }
    Ok(Some(materialize_owned_observation(
        &core.state.reception.received_values.as_ref(),
        &original,
        budget,
    )?))
}
