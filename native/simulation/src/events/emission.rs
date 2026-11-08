//! Build the original immediately after the single execution owner allocated
//! its identity, before any receiver allocates an original or personal account.
//! This type is deliberately not an acquisition or completion receipt.

use super::*;
use crate::execution::{CoreMutation, ExecutionError, OccurrenceToken, StagedOccurrence};
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::narration::{GrammaticalPerson, NarrationPart, render_narration_parts};
use crate::state::{EntityStore, Named};
use std::mem::size_of;

#[derive(Debug)]
pub(crate) enum EmissionError {
    Execution(ExecutionError),
    Capacity,
    SourcePosition,
}
impl From<ExecutionError> for EmissionError {
    fn from(error: ExecutionError) -> Self {
        Self::Execution(error)
    }
}

pub(crate) struct BegunOccurrence {
    pub(super) event: WorldEvent,
    pub(super) physical_audience: bool,
    pub(super) _token: OccurrenceToken,
    pub(super) reservation: ByteReservation,
}
impl BegunOccurrence {
    pub(crate) fn event(&self) -> &WorldEvent {
        &self.event
    }
    pub(crate) fn requires_physical_audience(&self) -> bool {
        self.physical_audience
    }
    pub(crate) fn explicit_audience(&self) -> Option<&[String]> {
        (!self.physical_audience).then_some(self.event.audience.as_slice())
    }
}

impl HeapBytes for EmissionText {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Literal(text) => text.heap_bytes(),
            Self::Captured(text) => text.heap_bytes(),
            Self::Narration(text) => text.heap_bytes(),
        }
    }
}
impl HeapBytes for WorldEvent {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([
            self.exposure.heap_bytes()?,
            self.id.heap_bytes()?,
            self.event_type.heap_bytes()?,
            self.text.heap_bytes()?,
            self.narration.heap_bytes()?,
            self.audience.heap_bytes()?,
            self.actor_id.heap_bytes()?,
            self.target_id.heap_bytes()?,
            self.data.heap_bytes()?,
        ])
    }
}
fn named(entity: &crate::state::Entity) -> Named {
    Named {
        name: entity.name.clone(),
        name_form: entity.name_form.clone(),
        indefinite_article: entity.indefinite_article.clone(),
    }
}
fn participant_id(part: &NarrationPart) -> Option<&str> {
    match part {
        NarrationPart::Literal(_) => None,
        NarrationPart::Participant { entity_id, .. } => Some(entity_id),
        NarrationPart::Verb { subject_id, .. } => Some(subject_id),
    }
}
fn narration_bound(narration: &Narration, entities: &EntityStore) -> Option<usize> {
    let mut bytes = map_storage::<String, Named>(narration.parts.len().checked_mul(2)?)?;
    for part in &narration.parts {
        bytes = bytes.checked_add(match part {
            NarrationPart::Literal(text) => text.len(),
            NarrationPart::Participant { entity_id, .. } => {
                let name = entities.get(entity_id);
                // Unicode full case mapping yields at most three scalars, each
                // at most four UTF-8 bytes. The extra English grammar is fixed
                // by narration.rs; source labels never become grammar tokens.
                let render = name
                    .map_or(64, |e| e.name.len())
                    .checked_mul(12)?
                    .checked_add(128)?;
                let copy = name.map_or(Some(0), |e| {
                    heap_sum([
                        e.name.len(),
                        e.name_form.as_ref().map_or(0, String::len),
                        e.indefinite_article.as_ref().map_or(0, String::len),
                    ])
                })?;
                heap_sum([render, copy, entity_id.len()])?
            }
            NarrationPart::Verb { subject_id, verb } => {
                let name = entities.get(subject_id);
                let copy = name.map_or(Some(0), |e| {
                    heap_sum([
                        e.name.len(),
                        e.name_form.as_ref().map_or(0, String::len),
                        e.indefinite_article.as_ref().map_or(0, String::len),
                    ])
                })?;
                heap_sum([
                    verb.len().checked_mul(12)?.checked_add(128)?,
                    copy,
                    subject_id.len(),
                ])?
            }
        })?;
    }
    // String's geometric growth may retain almost twice its final contents.
    bytes.checked_mul(2)
}
fn truthy(value: Option<&EventScalar>) -> bool {
    match value {
        None | Some(EventScalar::Null(())) | Some(EventScalar::Boolean(false)) => false,
        Some(EventScalar::Text(text)) => !text.is_empty(),
        Some(EventScalar::Number(number)) => *number != 0.0 && !number.is_nan(),
        Some(EventScalar::Boolean(true)) => true,
    }
}
fn metric(data: Option<&IndexMap<String, EventScalar>>, key: &str, fallback: f64) -> f64 {
    match data.and_then(|data| data.get(key)) {
        Some(EventScalar::Number(number)) if number.is_finite() => number.clamp(0.0, 10.0),
        _ => fallback,
    }
}

pub(crate) fn begin_staged_occurrence(
    core: &CoreMutation<'_>,
    staged: StagedOccurrence,
    budget: &ByteBudget,
) -> Result<BegunOccurrence, EmissionError> {
    let intent = &staged.intent;
    let rules = core.state.installed.occurrence_rules.value();
    let salience = rules.salience(&intent);
    let importance = metric(intent.data.as_ref(), "importance", salience.0);
    let urgency = metric(intent.data.as_ref(), "urgency", salience.1);
    let audience_bytes = match &intent.audience {
        AudienceSelection::Physical => 0,
        AudienceSelection::Explicit(audience) => {
            audience.heap_bytes().ok_or(EmissionError::Capacity)?
        }
    };
    let input_bytes = heap_sum([
        size_of::<BegunOccurrence>(),
        intent
            .event_type
            .heap_bytes()
            .ok_or(EmissionError::Capacity)?,
        intent.text.heap_bytes().ok_or(EmissionError::Capacity)?,
        intent
            .source_id
            .heap_bytes()
            .ok_or(EmissionError::Capacity)?,
        intent
            .target_id
            .heap_bytes()
            .ok_or(EmissionError::Capacity)?,
        intent.data.heap_bytes().ok_or(EmissionError::Capacity)?,
        intent
            .exposure
            .heap_bytes()
            .ok_or(EmissionError::Capacity)?,
        audience_bytes,
        rules.importance_policy.len(),
        rules.significant_reason.len().max(intent.event_type.len()),
        // Source creates two metadata properties even when no producer data is supplied.
        map_storage::<String, EventScalar>(
            intent
                .data
                .as_ref()
                .map_or(2, |d| d.len() + 2)
                .checked_mul(2)
                .ok_or(EmissionError::Capacity)?,
        )
        .ok_or(EmissionError::Capacity)?,
        "importancePolicy".len() + "importanceReason".len(),
        128, // exact event allocation grammar has bounded ASCII identity text
    ])
    .ok_or(EmissionError::Capacity)?;
    let render_bytes = match &intent.text {
        EmissionText::Narration(narration) => {
            narration_bound(narration, &core.state.physical.entities)
                .ok_or(EmissionError::Capacity)?
        }
        _ => 0,
    };
    let mut reservation = budget
        .reserve(
            input_bytes
                .checked_add(render_bytes)
                .ok_or(EmissionError::Capacity)?,
        )
        .map_err(|_| EmissionError::Capacity)?;
    let rendered = if let EmissionText::Narration(narration) = &intent.text {
        let mut names = IndexMap::new();
        names
            .try_reserve(narration.parts.len())
            .map_err(|_| EmissionError::Capacity)?;
        for part in &narration.parts {
            if let Some(id) = participant_id(part)
                && !names.contains_key(id)
                && let Some(entity) = core.state.physical.entities.get(id)
            {
                names.insert(id.to_owned(), named(entity));
            }
        }
        Some(render_narration_parts(
            narration,
            &names,
            None,
            GrammaticalPerson::Third,
        ))
    } else {
        None
    };
    let origin = if intent.origin.is_some() {
        intent.origin
    } else if let Some(source_id) = &intent.source_id {
        let source = core
            .state
            .physical
            .entities
            .get(source_id)
            .ok_or(EmissionError::SourcePosition)?;
        Some(
            if intent.event_type == rules.speech_event {
                crate::reception::sound_origin(source)
            } else {
                source.world_position()
            }
            .ok_or(EmissionError::SourcePosition)?,
        )
    } else {
        None
    };
    let policy = rules.importance_policy.clone();
    let reason = if truthy(
        intent
            .data
            .as_ref()
            .and_then(|data| data.get("significant")),
    ) {
        rules.significant_reason.clone()
    } else {
        intent.event_type.clone()
    };
    let StagedOccurrence {
        token,
        intent,
        id,
        order,
        sequence,
        at,
    } = staged;
    let (text, narration) = match intent.text {
        EmissionText::Literal(text) => (NativeText::Literal(text), None),
        EmissionText::Captured(text) => (NativeText::Captured(text), None),
        EmissionText::Narration(narration) => (
            NativeText::Literal(rendered.ok_or(EmissionError::Capacity)?),
            Some(narration),
        ),
    };
    let mut data = intent.data.unwrap_or_default();
    data.insert("importancePolicy".to_owned(), EventScalar::Text(policy));
    data.insert("importanceReason".to_owned(), EventScalar::Text(reason));
    let (audience, physical_audience) = match intent.audience {
        AudienceSelection::Physical => (Vec::new(), true),
        // Keep one original vector. Physical/current receiver facts, not this
        // selector, must prove permitted acquisition before any account exists.
        AudienceSelection::Explicit(audience) => (audience, false),
    };
    let event = WorldEvent {
        exposure: intent.exposure,
        origin,
        scope: Some(intent.scope),
        id,
        order: Some(order),
        sequence,
        at,
        event_type: intent.event_type,
        text,
        narration,
        audience,
        importance: Some(importance),
        urgency: Some(urgency),
        actor_id: intent.source_id,
        target_id: intent.target_id,
        data: Some(data),
    };
    reservation
        .resize(
            size_of::<BegunOccurrence>()
                .checked_add(event.heap_bytes().ok_or(EmissionError::Capacity)?)
                .and_then(|bytes| bytes.checked_add(event.id.len()))
                .ok_or(EmissionError::Capacity)?,
        )
        .map_err(|_| EmissionError::Capacity)?;
    Ok(BegunOccurrence {
        event,
        physical_audience,
        _token: token,
        reservation,
    })
}
