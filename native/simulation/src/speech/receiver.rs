//! One real listener's speech continuation. Recognition changes finish before
//! names are selected. No result here is an original, account or event receipt.

use super::*;
use crate::commands::SpeechTargetRole;
use crate::events::WorldEvent;
use crate::execution::{CoreMutation, ExecutionError};
use crate::experience::{
    Awareness, AwarenessReceivedFeatures, AwarenessRetentionClass, AwarenessSourceBody,
};
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::language::{CollationAnswer, CollationRequest};
use crate::narration::{self, NativeText, SpeechDelivery, SpeechPresentationInput};
use crate::reception::{
    EventScalar, ExperienceModality, FeatureModality, Intelligibility, ObserverLife,
    PerceivedSpeech, SoundKind, SpeechAddressing, SpeechParticipant, SpeechPerception, TriggerKind,
};
use crate::state::Named;
use crate::worlds::base_observed::SpeechVolume;
use crate::worlds::base_recognition::{VoiceReception, VoiceReceptionPreparation};
use crate::worlds::{InstalledHearingDetail, InstalledPersonalNameReader};
use indexmap::IndexMap;

enum Phase {
    Voice(VoiceReceptionPreparation),
    Received(Option<VoiceReception>),
    Unreceived,
    Complete,
}
pub(crate) struct SpeechReceiverCursor {
    observer: ObserverLife,
    event_id: String,
    phase: Phase,
    reservation: ByteReservation,
}
pub(crate) enum SpeechReceiverStep<'a> {
    Language(&'a CollationRequest),
    Complete(Option<PreparedSpeechAwareness>),
}
fn capacity<T>(value: Result<T, SpeechError>) -> Result<T, ExecutionError> {
    value.map_err(|_| ExecutionError::Capacity)
}
fn data_text<'a>(event: &'a WorldEvent, field: &str) -> Option<&'a str> {
    match event.data.as_ref().and_then(|data| data.get(field)) {
        Some(EventScalar::Text(text)) => Some(text),
        _ => None,
    }
}

impl SpeechReceiverCursor {
    pub(crate) fn prepare(
        core: &CoreMutation<'_>,
        contacts: &SpeechContacts,
        observer_id: &str,
        event: &WorldEvent,
        language_binding: crate::geometry::GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        contacts
            .require_current(&core.state.physical)
            .map_err(|_| ExecutionError::Invariant)?;
        if event.actor_id.as_deref() != Some(contacts.source_id()) {
            return Err(ExecutionError::Invariant);
        }
        let observer = core
            .state
            .physical
            .entities
            .get(observer_id)
            .ok_or(ExecutionError::MissingActor)?;
        let sight = contacts
            .sight(observer_id)
            .ok_or(ExecutionError::Invariant)?;
        let own = observer_id == contacts.source_id();
        let exposure = contacts
            .exposure(observer_id)
            .ok_or(ExecutionError::Invariant)?;
        let visible = own || sight.seen(contacts.source_id()) == Some(true);
        let reservation = budget.reserve(size_of::<Self>() + observer_id.len() + event.id.len())?;
        let phase = if !own
            && (!observer.actor.as_ref().is_some_and(|actor| actor.alive)
                || (exposure.detail == InstalledHearingDetail::Undetected && !visible))
        {
            Phase::Unreceived
        } else if !own && exposure.detail != InstalledHearingDetail::Undetected {
            match exposure.clarity_margin_db {
                Some(clarity) => match VoiceReceptionPreparation::prepare(
                    &core.state.physical,
                    &core.state.reception,
                    &core.state.installed,
                    &core.state.experience,
                    observer_id,
                    contacts.source_id(),
                    event,
                    clarity,
                    Some(sight),
                    language_binding,
                    budget,
                )
                .map_err(ExecutionError::Received)?
                {
                    Some(preparation) => Phase::Voice(preparation),
                    None => Phase::Received(None),
                },
                None => Phase::Received(None),
            }
        } else {
            Phase::Received(None)
        };
        Ok(Self {
            observer: sight.observer().clone(),
            event_id: event.id.clone(),
            phase,
            reservation,
        })
    }

    pub(crate) fn language_request(&self) -> Option<&CollationRequest> {
        match &self.phase {
            Phase::Voice(preparation) => Some(preparation.comparisons()),
            _ => None,
        }
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        contacts: &SpeechContacts,
        event: &WorldEvent,
        words: &SpeechWords,
        answer: Option<CollationAnswer>,
        budget: &ByteBudget,
    ) -> Result<SpeechReceiverStep<'a>, ExecutionError> {
        contacts
            .require_current(&core.state.physical)
            .map_err(|_| ExecutionError::Invariant)?;
        if self.event_id != event.id
            || data_text(event, "text").unwrap_or("") != words.text()
            || core
                .state
                .physical
                .entities
                .get(&self.observer.actor_id)
                .and_then(|observer| observer.physical_life())
                != Some(self.observer.physical_life)
        {
            return Err(ExecutionError::Invariant);
        }
        if let Some(answer) = answer {
            let Phase::Voice(preparation) = std::mem::replace(&mut self.phase, Phase::Complete)
            else {
                return Err(ExecutionError::Invariant);
            };
            let voice = preparation.finish(core, &answer, budget)?;
            self.phase = Phase::Received(Some(voice));
        }
        if matches!(self.phase, Phase::Voice(_)) {
            let Phase::Voice(preparation) = &self.phase else {
                unreachable!()
            };
            return Ok(SpeechReceiverStep::Language(preparation.comparisons()));
        }
        match std::mem::replace(&mut self.phase, Phase::Complete) {
            Phase::Received(voice) => Ok(SpeechReceiverStep::Complete(assemble(
                core,
                contacts,
                &self.observer.actor_id,
                event,
                words,
                voice,
                budget,
            )?)),
            Phase::Unreceived => Ok(SpeechReceiverStep::Complete(None)),
            _ => Err(ExecutionError::Invariant),
        }
    }
}

fn from_personal(name: crate::worlds::base_knowledge::PersonalName<'_>) -> Named {
    Named {
        name: name.name.to_owned(),
        name_form: name.name_form.map(str::to_owned),
        indefinite_article: name.indefinite_article.map(str::to_owned),
    }
}
fn participant(name: &Named) -> SpeechParticipant {
    SpeechParticipant {
        name_at_time: name.name.clone(),
        name_form: name.name_form.clone(),
        indefinite_article: name.indefinite_article.clone(),
    }
}
fn named_identity(identity: &crate::worlds::InstalledObserverIdentity) -> Option<&str> {
    identity
        .nickname
        .as_deref()
        .filter(|name| !name.is_empty())
        .or_else(|| (!identity.given_name.is_empty()).then_some(identity.given_name.as_str()))
}
fn transcript_size(segments: &[SpeechSegment]) -> Option<usize> {
    segments
        .iter()
        .try_fold(segments.len().saturating_sub(1), |bytes, segment| {
            bytes.checked_add(match segment {
                SpeechSegment::Heard { text } => text.len(),
                SpeechSegment::Unintelligible => "[…]".len(),
            })
        })
}
fn transcript(segments: &[SpeechSegment], bytes: usize) -> String {
    let mut text = String::with_capacity(bytes);
    for (index, segment) in segments.iter().enumerate() {
        if index > 0 {
            text.push(' ');
        }
        text.push_str(match segment {
            SpeechSegment::Heard { text } => text,
            SpeechSegment::Unintelligible => "[…]",
        });
    }
    text
}

fn assemble(
    core: &mut CoreMutation<'_>,
    contacts: &SpeechContacts,
    observer_id: &str,
    event: &WorldEvent,
    words: &SpeechWords,
    voice: Option<VoiceReception>,
    budget: &ByteBudget,
) -> Result<Option<PreparedSpeechAwareness>, ExecutionError> {
    let own = observer_id == contacts.source_id();
    let sight = contacts
        .sight(observer_id)
        .ok_or(ExecutionError::Invariant)?;
    let exposure = contacts
        .exposure(observer_id)
        .ok_or(ExecutionError::Invariant)?;
    let detail = if own {
        InstalledHearingDetail::Clear
    } else {
        exposure.detail
    };
    let visible = own || sight.seen(contacts.source_id()) == Some(true);
    let perception = if own {
        SpeechPerception::SelfBody
    } else if detail == InstalledHearingDetail::Undetected {
        SpeechPerception::Seen
    } else {
        SpeechPerception::Heard
    };
    let observer = core
        .state
        .physical
        .entities
        .get(observer_id)
        .ok_or(ExecutionError::MissingActor)?;
    let understands = observer
        .actor
        .as_ref()
        .and_then(|actor| actor.capabilities.as_ref())
        .is_some_and(|capabilities| capabilities.language);
    let has_memory = observer.has_memory();
    if !understands {
        if perception == SpeechPerception::Seen {
            return Ok(None);
        }
        let Some(mut received) =
            prepare_sound_awareness(core, contacts, observer_id, event, budget)?
        else {
            return Ok(None);
        };
        let parts = voice.map(VoiceReception::into_parts);
        let source_subject = parts.as_ref().and_then(|parts| {
            parts
                .recognition
                .subject
                .as_ref()
                .or(parts.recognition.learned_subject.as_ref())
        });
        let reader = InstalledPersonalNameReader::prepare(
            &core.state.physical,
            &core.state.reception,
            &core.state.installed,
            &core.state.experience,
            observer_id,
        )
        .map_err(ExecutionError::Received)?;
        let source_id = if visible {
            Some(contacts.source_id())
        } else {
            parts
                .as_ref()
                .filter(|parts| parts.recognition.recognized)
                .and_then(|_| source_subject)
                .and_then(|subject| reader.observer_individual(subject))
                .and_then(|identity| identity.canonical_id.as_deref())
        };
        let growth = heap_sum([
            core.state
                .installed
                .occurrence_rules
                .value()
                .sound_event
                .len(),
            source_id.map_or(0, str::len),
            source_subject
                .map_or(Some(0), HeapBytes::heap_bytes)
                .ok_or(ExecutionError::Capacity)?,
        ])
        .ok_or(ExecutionError::Capacity)?;
        received.reservation.resize(
            received
                .reservation
                .bytes()
                .checked_add(growth)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        received.awareness.event_type = Some(
            core.state
                .installed
                .occurrence_rules
                .value()
                .sound_event
                .clone(),
        );
        received
            .awareness
            .sound
            .as_mut()
            .ok_or(ExecutionError::Invariant)?
            .kind = Some(SoundKind::VoiceLike);
        received.awareness.recognized = parts
            .as_ref()
            .is_some_and(|parts| parts.recognition.recognized);
        if has_memory {
            if let Some(id) = source_id {
                received.awareness.source_id = Some(id.to_owned());
            }
            received.awareness.source_subject = source_subject.cloned();
        }
        received.awareness.entity_ids.clear();
        received.awareness.importance = event.importance.unwrap_or(
            core.state
                .installed
                .occurrence_rules
                .value()
                .sound_importance,
        );
        received.awareness.urgency = Some(
            event.urgency.unwrap_or(
                core.state
                    .installed
                    .occurrence_rules
                    .value()
                    .received_urgency,
            ),
        );
        received.awareness.trigger_kind = Some(TriggerKind::ObservedEvent);
        if let Some(parts) = parts {
            received.awareness.received_features = Some(AwarenessReceivedFeatures {
                modality: FeatureModality::Hearing,
                quality: parts.recognition.quality,
                family: parts.family,
                features: parts.features,
            });
            received.awareness.recognition = Some(parts.recognition);
            received.voice_reservation = Some(parts.reservation);
        }
        return Ok(Some(received));
    }

    let reader = InstalledPersonalNameReader::prepare(
        &core.state.physical,
        &core.state.reception,
        &core.state.installed,
        &core.state.experience,
        observer_id,
    )
    .map_err(ExecutionError::Received)?;
    let parts = voice.map(VoiceReception::into_parts);
    let learned_subject = parts.as_ref().and_then(|parts| {
        parts
            .recognition
            .subject
            .as_ref()
            .or(parts.recognition.learned_subject.as_ref())
    });
    let individual = learned_subject.and_then(|subject| reader.observer_individual(subject));
    let local_body = if visible {
        reader
            .current_body_local_subject(contacts.source_id())
            .map_err(ExecutionError::Received)?
    } else {
        None
    };
    let preferred_name = local_body
        .and_then(|subject| reader.observer_individual(subject))
        .and_then(named_identity);
    let individual_name = individual.and_then(named_identity);
    let speaker = if parts
        .as_ref()
        .is_some_and(|parts| parts.recognition.recognized)
        && individual.is_some()
    {
        let name = preferred_name.or(individual_name);
        Some(crate::worlds::base_knowledge::PersonalName {
            name: name.unwrap_or(&core.state.installed.name_rules.value().unidentified_voice),
            name_form: Some(if name.is_some() { "proper" } else { "count" }),
            indefinite_article: None,
        })
    } else if visible {
        Some(
            reader
                .observer_name(contacts.source_id())
                .map_err(ExecutionError::Received)?,
        )
    } else if individual.is_some() {
        Some(crate::worlds::base_knowledge::PersonalName {
            name: individual_name
                .unwrap_or(&core.state.installed.name_rules.value().unidentified_voice),
            name_form: Some(if individual_name.is_some() {
                "proper"
            } else {
                "count"
            }),
            indefinite_article: None,
        })
    } else {
        None
    };
    let source_id = if visible {
        Some(contacts.source_id())
    } else {
        parts
            .as_ref()
            .filter(|parts| parts.recognition.recognized)
            .and(individual)
            .and_then(|identity| identity.canonical_id.as_deref())
    };
    let target = event.target_id.as_deref();
    let recipient = target.filter(|id| {
        perception != SpeechPerception::Seen
            && (own
                || *id == observer_id
                || (core.state.physical.entities.get(id).is_some() && sight.seen(id) == Some(true)))
    });
    let addressee = recipient
        .map(|id| {
            if own {
                reader.intended_addressee_name(
                    id,
                    if data_text(event, "targetRole") == Some("remembered") {
                        SpeechTargetRole::Remembered
                    } else {
                        SpeechTargetRole::Body
                    },
                )
            } else {
                reader.observer_name(id)
            }
        })
        .transpose()
        .map_err(ExecutionError::Received)?;
    let body_lease = if visible && !own {
        reader
            .current_body_grant(contacts.source_id())
            .map_err(ExecutionError::Received)?
    } else {
        None
    };
    let physical_life = core
        .state
        .physical
        .entities
        .get(contacts.source_id())
        .and_then(|source| source.physical_life())
        .unwrap_or(0);
    let listener = observer
        .world_position()
        .ok_or(ExecutionError::InvalidPosition)?;
    let direction = if !own && perception == SpeechPerception::Heard {
        crate::reception::acoustic_direction(
            core.state
                .physical
                .entities
                .get(contacts.source_id())
                .and_then(|source| source.world_position())
                .ok_or(ExecutionError::InvalidPosition)?,
            listener,
        )
    } else {
        None
    };
    let volume = match data_text(event, "volume").unwrap_or("normal") {
        "whisper" => SpeechVolume::Whisper,
        "normal" => SpeechVolume::Normal,
        "shout" => SpeechVolume::Shout,
        _ => return Err(ExecutionError::Invariant),
    };
    let mut segments = match detail {
        InstalledHearingDetail::Clear => capacity(words.clear(budget))?,
        InstalledHearingDetail::Partial => {
            let key_bytes = 16 + 2 + event.id.len() + observer_id.len();
            let _key_guard = budget.reserve(key_bytes)?;
            capacity(words.partial(
                &format!(
                    "{}:{}:{}",
                    core.state.physical.header.seed, event.id, observer_id
                ),
                budget,
            ))?
        }
        _ => HeardSegments {
            segments: Vec::new(),
            reservation: budget.reserve(size_of::<HeardSegments>())?,
        },
    };
    let word_bytes = transcript_size(&segments.segments).ok_or(ExecutionError::Capacity)?;
    let name_bytes = |name: crate::worlds::base_knowledge::PersonalName<'_>| {
        name.name.len()
            + name.name_form.map_or(0, str::len)
            + name.indefinite_article.map_or(0, str::len)
    };
    let names = speaker.map_or(0, name_bytes) + addressee.map_or(0, name_bytes);
    let text_bound = names
        .checked_mul(12)
        .and_then(|n| n.checked_add(word_bytes))
        .and_then(|n| n.checked_add(1024))
        .ok_or(ExecutionError::Capacity)?;
    let episodes = core
        .state
        .reception
        .perception_episodes
        .as_ref()
        .and_then(|root| root.get(observer_id));
    let episode_bytes = [source_id, recipient]
        .into_iter()
        .flatten()
        .try_fold(0usize, |bytes, id| {
            bytes.checked_add(
                episodes
                    .and_then(|episodes| episodes.get(id))
                    .map_or(0, String::len),
            )
        })
        .ok_or(ExecutionError::Capacity)?;
    let own_bytes = heap_sum([
        size_of::<PreparedSpeechAwareness>(),
        text_bound.checked_mul(4).ok_or(ExecutionError::Capacity)?,
        event.id.len(),
        observer_id.len(),
        core.state
            .installed
            .occurrence_rules
            .value()
            .speech_event
            .len(),
        source_id
            .map_or(0, str::len)
            .checked_mul(5)
            .ok_or(ExecutionError::Capacity)?,
        recipient
            .map_or(0, str::len)
            .checked_mul(4)
            .ok_or(ExecutionError::Capacity)?,
        contacts.source_id().len(),
        body_lease.map_or(0, |(id, _)| id.len()),
        names.checked_mul(3).ok_or(ExecutionError::Capacity)?,
        learned_subject
            .map_or(Some(0), HeapBytes::heap_bytes)
            .ok_or(ExecutionError::Capacity)?,
        episode_bytes,
        2 * size_of::<String>(),
        map_storage::<String, String>(2).ok_or(ExecutionError::Capacity)?,
        data_text(event, "selfIntroduction").map_or(0, str::len),
    ])
    .ok_or(ExecutionError::Capacity)?;
    let reservation = budget.reserve(own_bytes)?;
    let speaker = speaker.map(from_personal);
    let addressee = addressee.map(from_personal);
    let mut speech = PerceivedSpeech {
        perception,
        intelligibility: match detail {
            InstalledHearingDetail::Clear => Intelligibility::Clear,
            InstalledHearingDetail::Partial => Intelligibility::Partial,
            _ => Intelligibility::None,
        },
        segments: std::mem::take(&mut segments.segments),
        speaker: speaker.as_ref().map(participant),
        addressing: if perception == SpeechPerception::Seen {
            None
        } else {
            Some(if target.is_some() {
                SpeechAddressing::Directed
            } else {
                SpeechAddressing::Ambient
            })
        },
        addressee: addressee.as_ref().map(participant),
        delivery: (visible && perception != SpeechPerception::Seen).then_some(volume),
        direction,
        listener_position: listener,
        name_claim: None,
    };
    if let Some(introduction) = data_text(event, "selfIntroduction") {
        let name = crate::encoding::js_trim(introduction);
        if speech
            .segments
            .iter()
            .any(|segment| matches!(segment,SpeechSegment::Heard{text} if text.contains(name)))
        {
            speech.name_claim = Some(name.to_owned());
        }
    }
    if !speech.segments.iter().any(|segment| matches!(segment,SpeechSegment::Heard{text} if !crate::encoding::js_trim(text).is_empty())) { speech.intelligibility=Intelligibility::None; }
    let target_id = if own {
        target
    } else {
        recipient.filter(|id| Some(*id) == target)
    };
    let addressed = !own && recipient == Some(observer_id);
    let words = transcript(&speech.segments, word_bytes);
    let text = narration::speech_presentation(SpeechPresentationInput {
        speaker: speaker.as_ref(),
        addressee: addressee.as_ref(),
        self_speaker: own,
        addressed,
        directed: speech.addressing == Some(SpeechAddressing::Directed),
        seen: perception == SpeechPerception::Seen,
        intelligibility: match speech.intelligibility {
            Intelligibility::None => narration::Intelligibility::None,
            Intelligibility::Partial => narration::Intelligibility::Partial,
            Intelligibility::Clear => narration::Intelligibility::Clear,
        },
        delivery: speech.delivery.map(|delivery| match delivery {
            SpeechVolume::Whisper => SpeechDelivery::Whisper,
            SpeechVolume::Normal => SpeechDelivery::Normal,
            SpeechVolume::Shout => SpeechDelivery::Shout,
        }),
        words: &words,
        second_person: false,
    })
    .description;
    let mut entity_ids = Vec::with_capacity(2);
    for id in [source_id, recipient].into_iter().flatten() {
        if !entity_ids.iter().any(|existing| existing == id) {
            entity_ids.push(id.to_owned());
        }
    }
    let mut entity_episodes = IndexMap::with_capacity(2);
    for id in &entity_ids {
        if let Some(episode) = episodes.and_then(|episodes| episodes.get(id)) {
            entity_episodes.insert(id.clone(), episode.clone());
        }
    }
    let recognized = (visible
        && reader
            .recognizes_subject(contacts.source_id())
            .map_err(ExecutionError::Received)?)
        || parts
            .as_ref()
            .is_some_and(|parts| parts.recognition.recognized);
    let source_subject = learned_subject.cloned();
    let rules = core.state.installed.occurrence_rules.value();
    let importance = if perception == SpeechPerception::Seen
        || speech.intelligibility == Intelligibility::None
    {
        rules.unintelligible_speech_importance
    } else {
        event.importance.unwrap_or(rules.speech_importance)
    };
    let awareness = Awareness {
        retention_class: AwarenessRetentionClass::Memory,
        exposure: None,
        event_id: event.id.clone(),
        actor_id: observer_id.to_owned(),
        text: NativeText::Literal(text),
        content: Some(NativeText::Literal(words)),
        at: event.at,
        sequence: event.order.unwrap_or(event.sequence),
        event_type: Some(rules.speech_event.clone()),
        modality: if own {
            ExperienceModality::Internal
        } else if perception == SpeechPerception::Seen {
            ExperienceModality::Observed
        } else {
            ExperienceModality::Heard
        },
        recognized,
        intelligible: speech.intelligibility != Intelligibility::None,
        entity_ids,
        entity_episodes: Some(entity_episodes),
        importance,
        urgency: Some(event.urgency.unwrap_or(rules.received_urgency)),
        source_id: source_id.map(str::to_owned),
        target_id: target_id.map(str::to_owned),
        source_body: if own || body_lease.is_some() {
            Some(AwarenessSourceBody {
                entity_id: contacts.source_id().to_owned(),
                physical_life,
                lease_id: body_lease.map(|(id, _)| id.to_owned()),
            })
        } else {
            None
        },
        source_subject,
        speech: Some(speech),
        trigger_kind: Some(if own {
            TriggerKind::SelfEvent
        } else if perception == SpeechPerception::Seen {
            TriggerKind::ObservedEvent
        } else if addressed {
            TriggerKind::AddressedSpeech
        } else {
            TriggerKind::OverheardSpeech
        }),
        recognition: None,
        received_features: None,
        event_data: None,
        references: None,
        retention: None,
        change: None,
        observation: None,
        observations: None,
        sound: None,
        expires_at: None,
        source_receipt: None,
    };
    drop(speaker);
    drop(addressee);
    let mut result = PreparedSpeechAwareness {
        awareness,
        reservation,
        voice_reservation: None,
        segments_reservation: Some(segments.reservation),
    };
    if let Some(parts) = parts {
        result.awareness.received_features = Some(AwarenessReceivedFeatures {
            modality: FeatureModality::Hearing,
            quality: parts.recognition.quality,
            family: parts.family,
            features: parts.features,
        });
        result.awareness.recognition = Some(parts.recognition);
        result.voice_reservation = Some(parts.reservation);
    }
    let actual = size_of::<PreparedSpeechAwareness>()
        .checked_add(
            result
                .awareness
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?,
        )
        .ok_or(ExecutionError::Capacity)?;
    let auxiliary = result
        .voice_reservation
        .as_ref()
        .map_or(0, ByteReservation::bytes)
        + result
            .segments_reservation
            .as_ref()
            .map_or(0, ByteReservation::bytes);
    if actual
        > result
            .reservation
            .bytes()
            .checked_add(auxiliary)
            .ok_or(ExecutionError::Capacity)?
    {
        return Err(ExecutionError::Capacity);
    }
    result.reservation.resize(
        actual
            .saturating_sub(auxiliary)
            .max(size_of::<PreparedSpeechAwareness>()),
    )?;
    Ok(Some(result))
}
