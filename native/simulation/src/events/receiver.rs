//! Permitted non-speech occurrence projection. Unknown routing IDs receive no
//! names or facts; recording/attention eligibility is checked before rendering.
use super::*;
use crate::activity::EventActivity;
use crate::attention::{
    AccountRecordingInput, AccountRecordingLaw, RecordingInput, RecordingReason, RecordingSource,
};
use crate::execution::{CoreMutation, ExecutionError};
use crate::experience::{
    Awareness, AwarenessRetentionClass, ExperienceRetention, OutwardChange, RetentionReason,
};
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::narration::NativeText;
use crate::reception::{
    EventScalar, ExperienceModality, SightResults, TriggerKind, attended_event_participants,
    prepare_event_observation,
};
use crate::worlds::InstalledPersonalNameReader;
use indexmap::{IndexMap, IndexSet};
use std::mem::size_of;
pub(super) struct Receiver {
    pub actor_id: String,
    pub modality: ExperienceModality,
    pub native_contact: bool,
}
pub(super) struct PreparedEventAwareness {
    pub awareness: Awareness,
    pub reservation: ByteReservation,
}
fn truth(data: Option<&IndexMap<String, EventScalar>>, key: &str) -> bool {
    matches!(
        data.and_then(|data| data.get(key)),
        Some(EventScalar::Boolean(true))
    )
}
pub(super) fn prepare_receiver_awareness(
    core: &mut CoreMutation<'_>,
    event: &WorldEvent,
    receiver: &Receiver,
    sight: Option<&SightResults>,
    activity: Option<&EventActivity>,
    budget: &ByteBudget,
) -> Result<Option<PreparedEventAwareness>, ExecutionError> {
    let installed = std::sync::Arc::clone(&core.state.installed);
    let law = installed.account_law();
    let own = event.actor_id.as_deref() == Some(&receiver.actor_id);
    let trigger = if truth(event.data.as_ref(), "acquisition") {
        TriggerKind::ObservedEvent
    } else if own {
        TriggerKind::SelfEvent
    } else if event.target_id.as_deref() == Some(&receiver.actor_id) {
        TriggerKind::DirectedAction
    } else {
        TriggerKind::ObservedEvent
    };
    let exposure_kind = event.exposure.as_ref().map(|exposure| match exposure {
        crate::reception::EncounterExposure::Place { .. } => "place",
        crate::reception::EncounterExposure::InventoryItem { .. } => "inventory-item",
    });
    if truth(event.data.as_ref(), "acquisition")
        && event.scope == Some(EventScope::Private)
        && own
        && law.recording_reason(RecordingInput {
            source: RecordingSource::Awareness,
            event_type: Some(&event.event_type),
            modality: Some(receiver.modality.as_str()),
            trigger_kind: Some(trigger.as_str()),
            own: true,
            has_exposure: event.exposure.is_some(),
            exposure_kind,
            consequence: false,
        }) == RecordingReason::None
    {
        return Ok(None);
    }
    let selection = prepare_event_observation(
        &core.state.physical.entities,
        event,
        &receiver.actor_id,
        installed.event_disclosure.value(),
        receiver.native_contact,
        sight,
    )
    .map_err(|_| ExecutionError::Invariant)?;
    let reason = law.recording_reason(RecordingInput {
        source: RecordingSource::Awareness,
        event_type: Some(selection.event_type()),
        modality: Some(receiver.modality.as_str()),
        trigger_kind: Some(trigger.as_str()),
        own: selection.source_id() == Some(&receiver.actor_id) || trigger == TriggerKind::SelfEvent,
        has_exposure: event.exposure.is_some(),
        exposure_kind,
        consequence: matches!(
            trigger,
            TriggerKind::SelfEvent | TriggerKind::DirectedAction
        ),
    });
    let ids = selection
        .references()
        .iter()
        .map(|(id, _)| *id)
        .collect::<Vec<_>>();
    if reason == RecordingReason::None
        && !crate::native_controller::event_reception_needed(core, event, &receiver.actor_id)?
        && !attended_event_participants(core, &receiver.actor_id, &ids, event.at, budget)?
    {
        return Ok(None);
    }
    let reader = InstalledPersonalNameReader::prepare(
        &core.state.physical,
        &core.state.reception,
        installed.as_ref(),
        &core.state.experience,
        &receiver.actor_id,
    )?;
    let names = reader.capture_names(&ids, budget)?;
    let projected = selection
        .materialization_bound(&names)
        .map_err(|_| ExecutionError::Capacity)?;
    let mut bytes = heap_sum([
        size_of::<PreparedEventAwareness>() + size_of::<Awareness>(),
        projected.checked_mul(3).ok_or(ExecutionError::Capacity)?,
        event
            .exposure
            .heap_bytes()
            .ok_or(ExecutionError::Capacity)?,
        event.id.len(),
        receiver.actor_id.len(),
        map_storage::<String, String>(ids.len().checked_mul(2).ok_or(ExecutionError::Capacity)?)
            .ok_or(ExecutionError::Capacity)?,
        ids.len()
            .checked_mul(size_of::<String>())
            .ok_or(ExecutionError::Capacity)?,
    ])
    .ok_or(ExecutionError::Capacity)?;
    for id in &ids {
        bytes = heap_sum([
            bytes,
            id.len().checked_mul(2).ok_or(ExecutionError::Capacity)?,
            core.state
                .reception
                .perception_episodes
                .as_ref()
                .and_then(|owners| owners.get(&receiver.actor_id))
                .and_then(|episodes| episodes.get(*id))
                .map_or(0, String::len),
        ])
        .ok_or(ExecutionError::Capacity)?;
    }
    let reservation = budget.reserve(bytes)?;
    let recognized = selection.event_type() != installed.occurrence_rules.value().contact_event
        && selection
            .source_id()
            .map(|id| reader.recognizes_subject(id))
            .transpose()?
            .unwrap_or(false);
    let perceived = selection
        .materialize(&names)
        .map_err(|_| ExecutionError::Invariant)?;
    let mut entity_ids = IndexSet::new();
    entity_ids
        .try_reserve(perceived.references.len())
        .map_err(|_| ExecutionError::Capacity)?;
    for reference in &perceived.references {
        entity_ids.insert(reference.id.clone());
    }
    let entity_ids = entity_ids.into_iter().collect::<Vec<_>>();
    let mut entity_episodes = IndexMap::new();
    entity_episodes
        .try_reserve(entity_ids.len())
        .map_err(|_| ExecutionError::Capacity)?;
    for id in &entity_ids {
        if let Some(episode) = core
            .state
            .reception
            .perception_episodes
            .as_ref()
            .and_then(|owners| owners.get(&receiver.actor_id))
            .and_then(|episodes| episodes.get(id))
        {
            entity_episodes.insert(id.clone(), episode.clone());
        }
    }
    let own = perceived.source_id.as_deref() == Some(receiver.actor_id.as_str())
        || trigger == TriggerKind::SelfEvent;
    let retention = (reason != RecordingReason::None).then(|| ExperienceRetention {
        reason: if event.exposure.is_some() {
            RetentionReason::Deliberate
        } else {
            RetentionReason::Consequence
        },
        after_release: law.account_after_release(AccountRecordingInput {
            source: RecordingSource::Awareness,
            own,
            event_type: Some(&perceived.event_type),
            activity: activity
                .filter(|activity| activity.actor_id() == receiver.actor_id)
                .map(EventActivity::context),
        }),
        required: (reason == RecordingReason::Required).then_some(true),
        receipt: None,
    });
    let content = match perceived.event_data.get("text") {
        Some(EventScalar::Text(text)) => NativeText::Literal(text.clone()),
        _ => perceived.text.clone(),
    };
    let change = if truth(event.data.as_ref(), "acquisition") {
        match event.data.as_ref().and_then(|data| data.get("change")) {
            Some(EventScalar::Text(value)) => match value.as_str() {
                "onset" => Some(OutwardChange::Onset),
                "detail" => Some(OutwardChange::Detail),
                "end" => Some(OutwardChange::End),
                _ => None,
            },
            _ => None,
        }
    } else {
        None
    };
    Ok(Some(PreparedEventAwareness {
        awareness: Awareness {
            retention_class: AwarenessRetentionClass::Memory,
            exposure: event.exposure.clone(),
            event_id: event.id.clone(),
            actor_id: receiver.actor_id.clone(),
            text: perceived.text,
            at: event.at,
            sequence: event.order.unwrap_or(event.sequence),
            modality: receiver.modality,
            entity_episodes: Some(entity_episodes),
            recognized,
            intelligible: true,
            entity_ids,
            importance: event
                .importance
                .unwrap_or(installed.occurrence_rules.value().ordinary_importance),
            urgency: event.urgency,
            event_type: Some(perceived.event_type),
            event_data: Some(perceived.event_data),
            references: Some(perceived.references),
            source_id: perceived.source_id,
            target_id: perceived.target_id,
            trigger_kind: Some(trigger),
            retention,
            content: Some(content),
            change,
            observation: None,
            observations: None,
            source_subject: None,
            source_body: None,
            recognition: None,
            received_features: None,
            speech: None,
            sound: None,
            expires_at: None,
            source_receipt: None,
        },
        reservation,
    }))
}
