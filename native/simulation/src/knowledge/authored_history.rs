//! A creator declares past narrative and separate first-hand accounts. Live
//! perception, NPC reactions and mechanical effects do not run retroactively.
use super::{edit::result, *};
use crate::{
    attention::RecordingReason,
    events::WorldEvent,
    experience::{
        Awareness, AwarenessAcquisitionError, AwarenessEncoding, AwarenessFactory, AwarenessInput,
        AwarenessRetentionClass, acquire_awareness_accounts, prepare_awareness_admission,
    },
    narration::NativeText,
    received::TemporalAppendError,
    runtime::AuthoredEvent,
};

fn acquisition(error: AwarenessAcquisitionError) -> ExecutionError {
    match error {
        AwarenessAcquisitionError::Execution(error) => error,
        AwarenessAcquisitionError::Experience(error) => ExecutionError::Experience(error),
        AwarenessAcquisitionError::Received(error)
        | AwarenessAcquisitionError::Append(TemporalAppendError::Received(error)) => {
            ExecutionError::Received(error)
        }
        AwarenessAcquisitionError::Append(TemporalAppendError::Work(error)) => {
            ExecutionError::Work(error)
        }
        AwarenessAcquisitionError::Encoding => ExecutionError::Invariant,
    }
}
pub(super) fn apply(
    core: &mut CoreMutation<'_>,
    input: &AuthoredEvent,
    budget: &ByteBudget,
) -> Result<CompletedKnowledgeEdit, ExecutionError> {
    let size = input.text.storage_bytes()
        + input
            .perspectives
            .iter()
            .map(|p| p.actor_id.len() + p.text.storage_bytes() + size_of::<Awareness>())
            .sum::<usize>();
    let _scratch = budget.reserve(
        size.checked_mul(3)
            .and_then(|n| n.checked_add(1024))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let issued = core.physical().allocate("event")?;
    let order = core.state.physical.identity.next_id();
    let sequence = core
        .state
        .physical
        .header
        .sequence
        .checked_add(1)
        .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
        .ok_or(ExecutionError::Identity)?;
    let event = WorldEvent {
        id: issued.id,
        order: Some(order),
        sequence,
        at: input.at,
        event_type: "authored-event".into(),
        text: NativeText::Literal(input.text.clone()),
        audience: input
            .perspectives
            .iter()
            .map(|p| p.actor_id.clone())
            .collect(),
        actor_id: None,
        target_id: None,
        origin: None,
        exposure: None,
        narration: None,
        scope: None,
        importance: None,
        urgency: None,
        data: None,
    };
    let schema = core.state.installed.schema.clone();
    for p in &input.perspectives {
        let awareness = Awareness {
            retention_class: AwarenessRetentionClass::Memory,
            event_id: event.id.clone(),
            actor_id: p.actor_id.clone(),
            text: NativeText::Literal(p.text.clone()),
            at: input.at,
            sequence: order,
            modality: p.modality,
            importance: 5.0,
            recognized: false,
            intelligible: false,
            entity_ids: Vec::new(),
            event_type: Some(event.event_type.clone()),
            event_data: Some(Default::default()),
            exposure: None,
            entity_episodes: None,
            urgency: None,
            references: None,
            source_id: None,
            target_id: None,
            trigger_kind: None,
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
            sound: None,
            expires_at: None,
            source_receipt: None,
        };
        let input = AwarenessInput {
            awareness: &awareness,
            encoding: AwarenessEncoding {
                factory: AwarenessFactory::Event {
                    recording: RecordingReason::Optional,
                },
                source_receipt_before_observation: false,
            },
        };
        let admission = prepare_awareness_admission(core, &p.actor_id, &[input], None, budget)
            .map_err(acquisition)?;
        let placed =
            acquire_awareness_accounts(core, admission, &schema, budget).map_err(acquisition)?;
        if placed.entries().is_empty() {
            return result(
                false,
                "history-declined",
                "One selected observer could not retain this event.",
                budget,
            );
        }
    }
    // Original and private rows share the candidate journal. Omitting the event
    // from live outputs prevents historical narration from re-playing as news.
    core.state
        .occurrences
        .append(&event, budget)
        .map_err(|_| ExecutionError::Capacity)?;
    result(
        true,
        "history-authored",
        "Historical event and selected accounts added.",
        budget,
    )
}
