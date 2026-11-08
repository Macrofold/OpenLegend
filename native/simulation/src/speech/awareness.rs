//! Listener-specific sound intake. Physical products and selected names are
//! consumed once; the event owner must still acquire original proof and finish
//! required personal/history duties before completing the occurrence.

use super::SpeechContacts;
use crate::events::WorldEvent;
use crate::execution::{CoreMutation, ExecutionError};
use crate::experience::{Awareness, AwarenessRetentionClass};
use crate::host::retained_size::HeapBytes;
use crate::host::{ByteBudget, ByteReservation};
use crate::narration::{NameArticle, NativeText, name_phrase, sound_description};
use crate::reception::{
    ExperienceModality, PerceivedSound, ReceivedReference, ReferenceRole, SoundAcquisition,
    TriggerKind, VisibleSoundSource, acoustic_direction,
};
use crate::state::Named;
use crate::worlds::{InstalledHearingDetail, InstalledPersonalNameReader};
use std::mem::size_of;

pub(crate) struct PreparedSpeechAwareness {
    pub awareness: Awareness,
    pub(super) reservation: ByteReservation,
    pub(super) voice_reservation: Option<ByteReservation>,
    pub(super) segments_reservation: Option<ByteReservation>,
}

impl PreparedSpeechAwareness {
    pub(crate) fn into_parts(
        self,
    ) -> (
        Awareness,
        ByteReservation,
        Option<ByteReservation>,
        Option<ByteReservation>,
    ) {
        (
            self.awareness,
            self.reservation,
            self.voice_reservation,
            self.segments_reservation,
        )
    }
}

pub(crate) fn prepare_sound_awareness(
    core: &mut CoreMutation<'_>,
    contacts: &SpeechContacts,
    observer_id: &str,
    event: &WorldEvent,
    budget: &ByteBudget,
) -> Result<Option<PreparedSpeechAwareness>, ExecutionError> {
    contacts
        .require_current(&core.state.physical)
        .map_err(|_| ExecutionError::Invariant)?;
    let exposure = contacts
        .exposure(observer_id)
        .ok_or(ExecutionError::Invariant)?;
    if exposure.detail == InstalledHearingDetail::Undetected {
        return Ok(None);
    }
    let (Some(received_level_db_spl), Some(clarity_margin_db)) =
        (exposure.received_level_db_spl, exposure.clarity_margin_db)
    else {
        return Ok(None);
    };
    let source_id = contacts.source_id();
    let physical = &core.state.physical;
    let source = physical
        .entities
        .get(source_id)
        .ok_or(ExecutionError::MissingEntity)?;
    let observer = physical
        .entities
        .get(observer_id)
        .ok_or(ExecutionError::MissingEntity)?;
    let self_body = source_id == observer_id;
    let sight = contacts
        .sight(observer_id)
        .ok_or(ExecutionError::Invariant)?;
    let visible = !self_body && sight.seen(source_id) == Some(true);
    let reader = InstalledPersonalNameReader::prepare(
        physical,
        &core.state.reception,
        &core.state.installed,
        &core.state.experience,
        observer_id,
    )
    .map_err(ExecutionError::Received)?;
    let body_name = if visible {
        Some(
            reader
                .outward_body_name(source_id, sight)
                .map_err(ExecutionError::Received)?
                .ok_or(ExecutionError::Invariant)?,
        )
    } else {
        None
    };
    let prior_episode = core
        .state
        .reception
        .perception_episodes
        .as_ref()
        .and_then(|owners| owners.get(observer_id))
        .and_then(|episodes| episodes.get(source_id));
    let name_bytes = body_name.map_or(0, |name| {
        name.name.storage_bytes()
            + name.name_form.map_or(0, str::len)
            + name.indefinite_article.map_or(0, str::len)
    });
    // Sound text and its reference label share the same permitted noun. Their
    // copies, transient article phrase and full DTO allocation are funded first.
    let text_bound = "I heard a sound from my own body to the northeast and above."
        .len()
        .checked_add(name_bytes)
        .and_then(|n| n.checked_add(4))
        .ok_or(ExecutionError::Capacity)?;
    let mut time_buffer = ryu_js::Buffer::new();
    let next_episode_bytes = physical
        .header
        .sequence
        .checked_ilog10()
        .map_or(1, |digits| digits as usize + 1)
        + time_buffer.format(physical.header.sim_time).len()
        + 2
        + source_id.len();
    let episode_bound = prior_episode.map_or(next_episode_bytes, String::len);
    let bytes = crate::host::retained_size::heap_sum([
        size_of::<PreparedSpeechAwareness>(),
        size_of::<PerceivedSound>(),
        size_of::<VisibleSoundSource>(),
        size_of::<ReceivedReference>(),
        size_of::<String>(),
        event.id.len(),
        observer_id.len(),
        source_id
            .len()
            .checked_mul(4)
            .ok_or(ExecutionError::Capacity)?,
        event.event_type.len(),
        episode_bound,
        name_bytes,
        text_bound.checked_mul(3).ok_or(ExecutionError::Capacity)?,
    ])
    .ok_or(ExecutionError::Capacity)?;
    let mut reservation = budget.reserve(bytes)?;
    let description = body_name.map(|name| Named {
        name: name.name.to_owned(),
        name_form: name.name_form.map(str::to_owned),
        indefinite_article: name.indefinite_article.map(str::to_owned),
    });
    let source_life = source.physical_life().unwrap_or(0);
    let physical_life = observer.physical_life().unwrap_or(0);
    let listener_position = observer
        .world_position()
        .ok_or(ExecutionError::InvalidPosition)?;
    let direction = if self_body {
        None
    } else {
        Some(
            source
                .world_position()
                .ok_or(ExecutionError::InvalidPosition)?,
        )
        .and_then(|position| acoustic_direction(position, listener_position))
    };
    let episode_id = if visible {
        Some(
            core.journal
                .episodes
                .ensure(
                    &mut core.state.reception,
                    observer_id,
                    source_id,
                    physical.header.sequence,
                    physical.header.sim_time,
                    None,
                )
                .map_err(ExecutionError::Received)?
                .to_owned(),
        )
    } else {
        None
    };
    let sound = PerceivedSound {
        kind: None,
        acquisition: if self_body {
            SoundAcquisition::SelfBody
        } else {
            SoundAcquisition::External
        },
        physical_life,
        acquired_at: event.at,
        listener_position,
        received_level_db_spl,
        clarity_margin_db,
        detect_threshold_db: core.state.installed.acoustics.value().thresholds_db.detect,
        direction,
        visible_source: description.map(|description| VisibleSoundSource {
            entity_id: source_id.to_owned(),
            physical_life: source_life,
            episode_id,
            description,
        }),
    };
    let source_id = (self_body || visible).then_some(source_id);
    let references = if let Some(id) = source_id {
        Some(ReceivedReference {
            id: id.to_owned(),
            label: if self_body {
                "me".into()
            } else {
                name_phrase(
                    &sound
                        .visible_source
                        .as_ref()
                        .ok_or(ExecutionError::Invariant)?
                        .description,
                    NameArticle::Indefinite,
                    false,
                )
            },
            role: ReferenceRole::Actor,
        })
    } else {
        None
    };
    let rules = core.state.installed.occurrence_rules.value();
    let awareness = Awareness {
        retention_class: AwarenessRetentionClass::Sensory,
        event_id: event.id.clone(),
        actor_id: observer_id.to_owned(),
        text: NativeText::Literal(sound_description(&sound)),
        at: event.at,
        sequence: event.order.unwrap_or(event.sequence),
        modality: ExperienceModality::Heard,
        recognized: source_id.is_some(),
        intelligible: false,
        entity_ids: source_id.into_iter().map(str::to_owned).collect(),
        importance: rules.sound_importance,
        urgency: Some(event.urgency.unwrap_or(rules.received_urgency)),
        event_type: Some(event.event_type.clone()),
        source_id: source_id.map(str::to_owned),
        references: Some(references.into_iter().collect()),
        trigger_kind: Some(if self_body {
            TriggerKind::SelfEvent
        } else {
            TriggerKind::ObservedEvent
        }),
        sound: Some(sound),
        expires_at: Some(
            event.at
                + core
                    .state
                    .installed
                    .acoustics
                    .value()
                    .sensory_lifetime_seconds,
        ),
        exposure: None,
        entity_episodes: None,
        event_data: None,
        target_id: None,
        retention: None,
        content: None,
        change: None,
        observation: None,
        observations: None,
        source_subject: None,
        source_body: None,
        recognition: None,
        received_features: None,
        speech: None,
        source_receipt: None,
    };
    let actual = size_of::<PreparedSpeechAwareness>()
        .checked_add(awareness.heap_bytes().ok_or(ExecutionError::Capacity)?)
        .ok_or(ExecutionError::Capacity)?;
    if actual > reservation.bytes() {
        return Err(ExecutionError::Capacity);
    }
    reservation.resize(actual)?;
    Ok(Some(PreparedSpeechAwareness {
        awareness,
        reservation,
        voice_reservation: None,
        segments_reservation: None,
    }))
}
