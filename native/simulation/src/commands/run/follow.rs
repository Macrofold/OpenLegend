use super::*;
use crate::movement::follow::{FollowCursor, FollowDecision, FollowMode, FollowStep};

impl CommandCursor {
    pub(super) fn prepare_follow(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<bool, ExecutionError> {
        let NativeCommand::Follow {
            envelope,
            target_id,
            distance,
            parameters,
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let rules = &core
            .state
            .installed
            .occurrence_rules
            .value()
            .response
            .offers;
        let distance = match parameters.distance(
            rules,
            *distance,
            core.state.physical.header.sim_time,
            envelope.actor_id == *target_id,
        ) {
            Ok(distance) => distance,
            Err(problem) => {
                self.refuse(problem);
                return Ok(false);
            }
        };
        self.binding.serial = core.journal.next_provider_serial()?;
        self.follow = Some(FollowCursor::prepare(
            core,
            &envelope.actor_id,
            target_id,
            FollowMode::Start(*parameters, distance),
            self.binding,
            &self.budget,
        )?);
        self.phase = Phase::Follow;
        self.follow_step(core, None)
    }

    pub(super) fn follow_step(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<GeometryAnswers>,
    ) -> Result<bool, ExecutionError> {
        let result = self
            .follow
            .as_mut()
            .ok_or(ExecutionError::Invariant)?
            .step(core, answer)?;
        let FollowStep::Complete(decision) = result else {
            return Ok(true);
        };
        self.follow = None;
        let rules = &core
            .state
            .installed
            .occurrence_rules
            .value()
            .response
            .offers;
        let update = match decision {
            FollowDecision::Update(update) => update,
            FollowDecision::Stop(reason) => {
                let code = &rules.availability.follow_unavailable_code;
                let message = match reason {
                    crate::movement::follow::FollowStop::Restricted => {
                        &rules.availability.follow_restricted
                    }
                    reason => reason.message(rules),
                };
                self.reserve(code.len() + message.len())?;
                self.outcome = Some(outcome(false, code, message));
                self.phase = Phase::Done;
                return Ok(false);
            }
            FollowDecision::NavigationFailed(message, storage) => {
                let code = &rules.availability.follow_unavailable_code;
                self._reservation.merge(storage)?;
                self.reserve(code.len())?;
                self.outcome = Some(outcome(false, code, &message));
                self.phase = Phase::Done;
                return Ok(false);
            }
        };
        let NativeCommand::Follow { target_id, .. } = &self.command else {
            return Err(ExecutionError::Invariant);
        };
        let mut storage = update.storage;
        storage.resize(
            storage
                .bytes()
                .checked_add(target_id.len() + 16)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut action = Action::following(
            String::new(),
            target_id.clone(),
            update.target_life,
            update.state,
        );
        let route = update.route.ok_or(ExecutionError::Invariant)?;
        action.path = route.path;
        action.navigation = route.navigation;
        action.stage = route.stage;
        action.replans = route.replans;
        self.action = Some(action);
        self.action_storage = Some(storage);
        self.phase = Phase::Prepared;
        Ok(false)
    }

    pub(super) fn follow_started(
        &mut self,
        core: &mut CoreMutation<'_>,
        actor_id: &str,
    ) -> Result<Progress, ExecutionError> {
        let NativeCommand::Follow { target_id, .. } = &self.command else {
            return Err(ExecutionError::Invariant);
        };
        let installed = &core.state.installed;
        let ordinary = installed.ordinary_actions.value();
        let words = &installed
            .occurrence_rules
            .value()
            .response
            .offers
            .follow_outcomes
            .started;
        let event = core.stage_event(EventEmissionIntent {
            event_type: ordinary.action_started_event.clone(),
            text: EmissionText::Narration(Narration {
                parts: vec![
                    NarrationPart::Participant {
                        entity_id: actor_id.to_owned(),
                        role: PersonRole::Subject,
                        article: None,
                    },
                    NarrationPart::Literal(" ".into()),
                    NarrationPart::Literal(words.as_str().into()),
                ],
            }),
            audience: AudienceSelection::Physical,
            source_id: Some(actor_id.to_owned()),
            target_id: Some(target_id.clone()),
            data: Some(IndexMap::from([(
                "actionType".to_owned(),
                crate::reception::EventScalar::Text("follow".into()),
            )])),
            scope: EventScope::External,
            origin: None,
            exposure: None,
        })?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::AfterDeparture;
        Ok(Progress::Occurrence(event))
    }
}
