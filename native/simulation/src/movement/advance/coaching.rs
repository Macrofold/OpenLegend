//! Both actors choose their own feedback action. Its clock begins only on
//! the second choice. Each action goes through ordinary activity settlement.
use super::*;
use crate::commands::outcome;
use crate::install::{CoachingEpisode, CoachingSettlement as Settlement};
use crate::reception::EventScalar;
use crate::state::CoachingSupport;
use indexmap::IndexMap;

impl MoveAdvanceCursor {
    fn feedback_outcome(
        &mut self,
        core: &CoreMutation<'_>,
        lesson: &CoachingEpisode,
        settled: Settlement,
    ) -> Result<(), ExecutionError> {
        let definition = core
            .state
            .installed
            .attributes
            .get(&lesson.pin.id)
            .filter(|d| d.pin() == &lesson.pin)
            .ok_or(ExecutionError::Invariant)?;
        let profile = definition
            .value()
            .practice
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        let result = match settled {
            Settlement::Interrupted => {
                outcome(false, "cancelled", &profile.presentation.cancel_result)
            }
            Settlement::Completed => {
                let progress = core
                    .state
                    .physical
                    .entities
                    .get(&lesson.learner_id)
                    .and_then(|e| e.actor.as_ref()?.practice.as_ref()?.get(&lesson.pin.id))
                    .ok_or(ExecutionError::Invariant)?;
                let remaining = profile
                    .coached_releases
                    .saturating_sub(progress.releases.len() as u64);
                let text = profile
                    .presentation
                    .complete_result
                    .replace("{guidance}", &profile.guidance)
                    .replace("{remaining}", &remaining.to_string());
                outcome(true, "coaching-completed", &text)
            }
        };
        self.production_result = Some(result);
        self.phase = Phase::Finish;
        Ok(())
    }
    pub(super) fn coaching_progress(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<Option<StagedOccurrence>, ExecutionError> {
        let lesson = core
            .state
            .physical
            .entities
            .get(&self.actor_id)
            .and_then(|e| e.actor.as_ref()?.coaching_episode_id.as_ref())
            .and_then(|id| core.state.physical.coaching.records.get(id))
            .ok_or(ExecutionError::Invariant)?;
        if let Some(result) = lesson.settlement {
            self.feedback_outcome(core, lesson, result)?;
            return Ok(None);
        }
        let Some(start) = lesson.started_at else {
            self.phase = Phase::Done;
            return Ok(None);
        };
        let profile = core
            .state
            .installed
            .attributes
            .get(&lesson.pin.id)
            .and_then(|d| d.value().practice.as_ref())
            .ok_or(ExecutionError::Invariant)?;
        if core.state.physical.header.sim_time + core.state.installed.time_epsilon
            < start + profile.feedback_seconds
        {
            let action = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
            let epsilon = core.state.installed.time_epsilon;
            core.physical()
                .advance_timed_work(&self.actor_id, action, self.seconds, epsilon)?;
            self.phase = Phase::Done;
            return Ok(None);
        }
        let support = lesson.observed.as_ref().ok_or(ExecutionError::Invariant)?;
        let id = lesson.id.clone();
        let learner = lesson.learner_id.clone();
        let coach = lesson.coach_id.clone();
        if !core.coaching_is_current(lesson)? {
            core.physical().end_coaching(&id)?;
            self.phase = Phase::Start;
            return Ok(None);
        }
        let event = core.stage_event(EventEmissionIntent {
            event_type: "coaching-completed".into(),
            text: EmissionText::Narration(crate::narration::Narration::between(
                &learner,
                " completed the chosen guided feedback with ",
                &coach,
                ".".into(),
            )),
            source_id: Some(learner),
            target_id: Some(coach),
            audience: AudienceSelection::Physical,
            scope: EventScope::External,
            data: Some(IndexMap::from([
                ("episodeId".into(), EventScalar::Text(id.as_str().into())),
                (
                    "observedShotEventId".into(),
                    EventScalar::Text(support.event_id.as_str().into()),
                ),
                ("semanticTrigger".into(), EventScalar::Boolean(true)),
            ])),
            exposure: None,
            origin: None,
        })?;
        self.event = Some(event.id.clone());
        self.completing_lesson = Some(id);
        self.after_event = Phase::Start;
        Ok(Some(event))
    }
    pub(super) fn finish_coaching_event(
        &mut self,
        core: &mut CoreMutation<'_>,
        id: &str,
        event: &CompletedOccurrence,
    ) -> Result<Option<StagedOccurrence>, ExecutionError> {
        let l = core
            .state
            .physical
            .coaching
            .records
            .get(id)
            .ok_or(ExecutionError::Invariant)?;
        let occurrence = |actor: &str| -> Result<String, ExecutionError> {
            let action = l.actions.get(actor).ok_or(ExecutionError::Invariant)?;
            core.state
                .activity
                .occurrence_for(actor, action)
                .map_err(ExecutionError::Activity)?
                .filter(|o| o.revoked != Some(true))
                .map(|o| o.id.clone())
                .ok_or(ExecutionError::Invariant)
        };
        let support = CoachingSupport {
            event_id: event.event_id().to_owned(),
            observation_event_id: l
                .observation_event_id
                .clone()
                .ok_or(ExecutionError::Invariant)?,
            observed: l.observed.clone().ok_or(ExecutionError::Invariant)?,
            coach_id: l.coach_id.clone(),
            coach_evidence_id: occurrence(&l.coach_id)?,
            learner_evidence_id: occurrence(&l.learner_id)?,
        };
        let mut update = l.clone();
        update.settlement = Some(Settlement::Completed);
        let installed = core.state.installed.clone();
        let definition = installed
            .attributes
            .get(&update.pin.id)
            .ok_or(ExecutionError::Invariant)?
            .value();
        let improved = core.physical().credit_coaching(
            &update.learner_id,
            &update.pin.id,
            support,
            definition
                .practice
                .as_ref()
                .ok_or(ExecutionError::Invariant)?,
        )?;
        self.feedback_outcome(core, &update, Settlement::Completed)?;
        let learner = update.learner_id.clone();
        core.physical().put_coaching(id, Some(update))?;
        if improved {
            self.competence_improved(core, &learner, definition)
        } else {
            Ok(None)
        }
    }
}
