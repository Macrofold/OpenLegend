//! A deliberate selection creates one private semantic trigger. Reading that
//! trigger's page in the next decision grants no new effects or method rights.

use super::*;
use crate::activity::ACTIVITY_INSPECTION_COPY as COPY;
use crate::events::{AudienceSelection, EmissionText, EventEmissionIntent, EventScope};
use crate::narration::{Narration, NarrationPart, PersonRole};
use crate::reception::EventScalar;
use crate::text::JsText;
use indexmap::IndexMap;

impl CommandCursor {
    pub(super) fn inspect_activities(
        &mut self,
        core: &mut CoreMutation<'_>,
        actor: &str,
    ) -> Result<Option<StagedOccurrence>, ExecutionError> {
        let NativeCommand::InspectActivities {
            history_after,
            method_after,
            ..
        } = self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        self.phase = Phase::Done;
        self.reserve(128)?;
        if !(-1..=crate::identity::MAX_SAFE_INTEGER as i64).contains(&history_after)
            || method_after > core.state.activity.limits.acquisitions
        {
            self.outcome = Some(outcome(false, "invalid-page", COPY.bad_page));
            return Ok(None);
        }
        self.outcome = Some(outcome(true, "history-requested", COPY.accepted));
        if self.options.preview || self.preparation_mode.is_some() {
            return Ok(None);
        }
        self.reserve(1024 + actor.len() * 4 + COPY.chosen.len() + COPY.details.len())?;
        let person = |role| NarrationPart::Participant {
            entity_id: actor.to_owned(),
            role,
            article: None,
        };
        let event = core.stage_event(EventEmissionIntent {
            event_type: COPY.event.to_owned(),
            text: EmissionText::Narration(Narration {
                parts: vec![
                    person(PersonRole::Subject),
                    NarrationPart::Literal(JsText::from(format!(" {}", COPY.chosen))),
                    person(PersonRole::Possessive),
                    NarrationPart::Literal(COPY.details.into()),
                ],
            }),
            audience: AudienceSelection::Explicit(vec![actor.to_owned()]),
            source_id: Some(actor.to_owned()),
            target_id: None,
            data: Some(IndexMap::from([(
                "semanticTrigger".to_owned(),
                EventScalar::Boolean(true),
            )])),
            scope: EventScope::Private,
            origin: None,
            exposure: None,
        })?;
        core.journal
            .activity
            .select_activity_inspection(
                &mut core.state.activity,
                actor,
                &event.id,
                history_after,
                method_after,
            )
            .map_err(ExecutionError::Activity)?;
        self.reserve(event.id.len())?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::Done;
        Ok(Some(event))
    }
}
