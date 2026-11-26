//! Descriptive Act enters normal physical reception without generating an
//! activity, interrupting work or running an executable action.
use super::*;
use crate::{
    events::{AudienceSelection, EmissionText, EventScope},
    narration::{Narration, NarrationPart, PersonRole},
    reception::EventScalar,
    text::JsText,
};

impl CommandCursor {
    pub(super) fn stage_descriptive_act(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<StagedOccurrence, ExecutionError> {
        let NativeCommand::DescriptiveAct {
            envelope,
            predicate,
            target,
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let marker: JsText = "{target}".into();
        let marker_len = marker.units_len();
        let bytes = 2048
            + 8 * predicate.storage_bytes()
            + 4 * envelope.actor_id.len()
            + target.as_ref().map_or(0, |id| {
                (predicate.units_len() / marker_len) * (id.len() + 128)
            });
        self._reservation.resize(
            self._reservation
                .bytes()
                .checked_add(bytes)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut parts = vec![
            NarrationPart::Participant {
                entity_id: envelope.actor_id.clone(),
                role: PersonRole::Subject,
                article: None,
            },
            NarrationPart::Literal(" ".into()),
        ];
        let mut start = 0;
        if let Some(target) = target {
            while let Some(position) = predicate.find_from(&marker, start) {
                parts.push(NarrationPart::Literal(predicate.slice(start..position)));
                parts.push(NarrationPart::Participant {
                    entity_id: target.clone(),
                    role: PersonRole::Object,
                    article: None,
                });
                start = position + marker_len;
            }
        }
        parts.push(NarrationPart::Literal(
            predicate.slice(start..predicate.units_len()),
        ));
        let event = core.stage_event(EventEmissionIntent {
            event_type: core
                .state
                .installed
                .occurrence_rules
                .value()
                .response
                .expression
                .event_type
                .clone(),
            text: EmissionText::Narration(Narration { parts }),
            audience: AudienceSelection::Physical,
            source_id: Some(envelope.actor_id.clone()),
            target_id: target.clone(),
            data: Some(indexmap::indexmap! {
                "mechanical".into() => EventScalar::Boolean(false),
                "descriptive".into() => EventScalar::Boolean(true),
                "responseId".into() => EventScalar::Text(envelope.id.as_str().into()),
                "semanticTrigger".into() => EventScalar::Boolean(true),
            }),
            scope: EventScope::External,
            origin: None,
            exposure: None,
        })?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::Done;
        self.outcome = Some(outcome(
            true,
            "expressed",
            "Expression shown. No mechanical effects.",
        ));
        Ok(event)
    }
}
