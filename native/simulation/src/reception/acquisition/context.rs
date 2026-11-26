//! Event participants join only an actually received body exposure. A routing
//! ID, recognized unseen voice or later body position cannot create this join.

use super::*;
use crate::encoding::{js_property_cmp, json_record_len};
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use indexmap::IndexSet;
use std::mem::size_of;

pub(super) struct BodyContext {
    pub context: ObservationContext,
    pub participants: Vec<ReceivedEventParticipant>,
    pub speech: ReceivedSpeechParticipants,
    pub sound: Option<ExposureParticipant>,
    pub reservation: ByteReservation,
}
pub(in super::super) fn event_body<'a>(
    scope: &CurrentBodyReadScope<'a>,
    id: &str,
    at: f64,
    episode: Option<&str>,
) -> Result<Option<(CurrentNativeFacet<'a>, &'a str)>, ReceivedError> {
    let Some(body) = scope.native_body(id)? else {
        return Ok(None);
    };
    let Some(detected) = scope.native(
        id,
        "detected",
        CurrentFacetSelector {
            modality: Some(Modality::Sight),
            ..Default::default()
        },
    )?
    else {
        return Ok(None);
    };
    let ObservationOrigin::Exposure { episode_id, .. } = &detected.original_source.origin else {
        return Ok(None);
    };
    if body.field.value.kind != "body"
        || (body.grant.subject_physical_life.is_some() && episode != Some(episode_id))
        || detected.grant.exposure != body.grant.exposure
        || received_observation_header(&scope_values(scope), body.original_source)?.acquired_at > at
    {
        return Ok(None);
    }
    Ok(Some((body, episode_id)))
}
// A source lookup never creates a grant. This borrowed seam is kept with the
// already-eligible current scope instead of exposing a raw world/value store.
fn scope_values<'a>(
    scope: &CurrentBodyReadScope<'a>,
) -> Option<&'a crate::received::ReceivedValues> {
    scope.received_values()
}

pub(super) fn awareness_body_context(
    physical: &PhysicalState,
    reception: &ReceptionState,
    installed: &InstalledWorld,
    experience: &ExperienceState,
    awareness: &Awareness,
    budget: &ByteBudget,
) -> Result<Option<BodyContext>, ReceivedError> {
    let Some(scope) = CurrentBodyReadScope::prepare(
        reception,
        &physical.entities,
        installed,
        experience,
        &crate::worlds::InstalledEvidenceMeaning,
        &awareness.actor_id,
    )?
    else {
        return Ok(None);
    };
    let possible = awareness
        .entity_episodes
        .as_ref()
        .map_or(0, IndexMap::len)
        .checked_add(awareness.references.as_ref().map_or(0, Vec::len))
        .and_then(|n| n.checked_add(1))
        .ok_or_else(capacity)?;
    let allowance = heap_sum([
        size_of::<BodyContext>(),
        possible
            .checked_mul(size_of::<&str>() * 2)
            .ok_or_else(capacity)?,
        map_storage::<&str, ()>(possible).ok_or_else(capacity)?,
    ])
    .ok_or_else(capacity)?;
    let mut reservation = budget.reserve(allowance).map_err(|_| capacity())?;
    let mut keys: Vec<&str> =
        Vec::with_capacity(awareness.entity_episodes.as_ref().map_or(0, IndexMap::len));
    keys.extend(
        awareness
            .entity_episodes
            .iter()
            .flat_map(IndexMap::keys)
            .map(String::as_str),
    );
    keys.sort_by(|a, b| js_property_cmp(a, b));
    let visible = awareness
        .sound
        .as_ref()
        .and_then(|sound| sound.visible_source.as_ref());
    let ids: IndexSet<&str> = keys
        .into_iter()
        .chain(
            awareness
                .references
                .iter()
                .flatten()
                .map(|reference| reference.id.as_str()),
        )
        .chain(visible.map(|visible| visible.entity_id.as_str()))
        .collect();
    reservation
        .resize(
            reservation
                .bytes()
                .checked_add(
                    ids.len()
                        .checked_mul(size_of::<(CurrentNativeFacet<'_>, bool, usize)>())
                        .ok_or_else(capacity)?,
                )
                .ok_or_else(capacity)?,
        )
        .map_err(|_| capacity())?;
    let mut inputs = Vec::with_capacity(ids.len());
    let mut output_bound = 0usize;
    for id in ids {
        let episode = awareness
            .entity_episodes
            .as_ref()
            .and_then(|episodes| episodes.get(id))
            .map(String::as_str)
            .or_else(|| {
                visible
                    .filter(|visible| visible.entity_id == id)
                    .and_then(|visible| visible.episode_id.as_deref())
            });
        let Some((body, episode)) = event_body(&scope, id, awareness.at, episode)? else {
            continue;
        };
        let sound_source = visible.is_some_and(|visible| {
            visible.entity_id == id
                && visible.physical_life == body.grant.subject_physical_life.unwrap_or(0)
                && visible.episode_id.as_deref() == Some(episode)
        });
        if awareness.sound.is_some() && !sound_source {
            continue;
        }
        if body.grant.subject_physical_life.is_none()
            && awareness.modality != ExperienceModality::Observed
            && !sound_source
        {
            continue;
        }
        if let Some(speech) = &awareness.speech {
            if awareness.source_id.as_deref() == Some(id) {
                if !awareness.source_body.as_ref().is_some_and(|binding| {
                    binding.entity_id == id
                        && binding.lease_id.as_deref() == Some(&body.field.id)
                        && Some(binding.physical_life) == body.grant.subject_physical_life
                }) {
                    continue;
                }
            } else if awareness.target_id.as_deref() != Some(id) || speech.addressee.is_none() {
                continue;
            }
        } else if !sound_source
            && !awareness
                .references
                .as_ref()
                .is_some_and(|references| references.iter().any(|reference| reference.id == id))
        {
            continue;
        }
        let reference_count = awareness.references.as_ref().map_or(0, |references| {
            references
                .iter()
                .filter(|reference| reference.id == id)
                .count()
        });
        let copies = 1
            + reference_count
            + usize::from(awareness.speech.is_some()) * 2
            + usize::from(sound_source);
        let track = json_record_len(&(
            &body.grant.exposure,
            &body.grant.channel.id,
            body.grant.channel.version,
            &body.grant.channel.digest,
        ))
        .map_err(|_| invalid())?;
        let bytes = heap_sum([
            awareness.actor_id.len(),
            body.grant.exposure.len(),
            track,
            size_of::<ObservationExposure>()
                + size_of::<ReceivedEventParticipant>()
                + size_of::<ExposureParticipant>(),
        ])
        .ok_or_else(capacity)?;
        output_bound = output_bound
            .checked_add(bytes.checked_mul(copies).ok_or_else(capacity)?)
            .ok_or_else(capacity)?;
        inputs.push((body, sound_source, reference_count));
    }
    if inputs.is_empty() {
        return Ok(None);
    }
    reservation
        .resize(
            reservation
                .bytes()
                .checked_add(output_bound)
                .ok_or_else(capacity)?,
        )
        .map_err(|_| capacity())?;
    let mut subjects: Vec<ObservationExposure> = Vec::with_capacity(inputs.len());
    let reference_count = inputs
        .iter()
        .try_fold(0usize, |count, (_, _, references)| {
            count.checked_add(*references)
        })
        .ok_or_else(capacity)?;
    let mut participants = Vec::with_capacity(reference_count);
    let mut speech = ReceivedSpeechParticipants {
        speaker: None,
        addressee: None,
    };
    let mut sound = None;
    let mut attended = false;
    for (body, sound_source, _) in inputs {
        let id = body.grant.subject_id.as_str();
        let exposure = current_facet_exposure(scope.state(), body)?;
        if !subjects
            .iter()
            .any(|subject| subject.track == exposure.track)
        {
            subjects.push(exposure.clone());
        }
        for (ordinal, reference) in awareness.references.iter().flatten().enumerate() {
            if reference.id == id {
                participants.push(ReceivedEventParticipant {
                    reference_ordinal: ordinal as u64,
                    participant: ExposureParticipant::Exposure {
                        exposure: exposure.clone(),
                    },
                });
            }
        }
        if awareness.speech.is_some() {
            if awareness.source_id.as_deref() == Some(id) {
                speech.speaker = Some(ExposureParticipant::Exposure {
                    exposure: exposure.clone(),
                });
            }
            if awareness.target_id.as_deref() == Some(id) {
                speech.addressee = Some(ExposureParticipant::Exposure {
                    exposure: exposure.clone(),
                });
            }
        }
        if sound_source {
            sound = Some(ExposureParticipant::Exposure {
                exposure: exposure.clone(),
            });
        }
        attended |= scope.state().attention.as_ref().is_some_and(|attention| {
            attention
                .entries
                .iter()
                .any(|entry| entry.source_id == id && entry.exposure.track == exposure.track)
        });
    }
    let mut result = BodyContext {
        context: ObservationContext { subjects, attended },
        participants,
        speech,
        sound,
        reservation,
    };
    let actual = heap_sum([
        size_of::<BodyContext>(),
        result.context.heap_bytes().ok_or_else(capacity)?,
        result.participants.heap_bytes().ok_or_else(capacity)?,
        result.speech.heap_bytes().ok_or_else(capacity)?,
        result.sound.heap_bytes().ok_or_else(capacity)?,
    ])
    .ok_or_else(capacity)?;
    result.reservation.resize(actual).map_err(|_| capacity())?;
    Ok(Some(result))
}
