//! Join signed timing control to the ordinary native attack cursor.
use super::*;
use crate::attack_execution::{PlayerAttackInput, TimedReleaseInput};

impl CommandCursor {
    pub(super) fn timed_begin(&self) -> bool {
        self.attack_execution == Some(PlayerAttackInput::Begin)
    }

    pub(super) fn release_sample(&self) -> (TimedReleaseInput, bool) {
        match self.attack_execution {
            Some(PlayerAttackInput::Release { input, may_wait }) => (input, may_wait),
            _ => (TimedReleaseInput::Ordinary, false),
        }
    }
}

impl CommandCursor {
    pub(super) fn begin_melee_release(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<Progress, ExecutionError> {
        let NativeCommand::ReleaseStrike { expected_action_id, .. } = &self.command else {
            return Err(ExecutionError::Invariant);
        };
        let (input, may_wait) = self.release_sample();
        let installed = core.state.installed.clone();
        let Some(crate::contact::review::ChosenContact::Player(permission)) = &self.chosen_contact
        else {
            return Err(ExecutionError::UnsupportedFamily);
        };
        let action = core.state.physical.entities.get(self.actor_id())
            .and_then(|entity| entity.actor.as_ref())
            .filter(|actor| actor.alive && !actor.incapacitated && actor.controller == "player")
            .and_then(|actor| actor.action.as_ref())
            .filter(|action| {
                action.id == *expected_action_id
                    && action.stage == "working"
                    && action.strike_phase == Some(crate::contact::StrikePhase::Windup)
                    && action.attack_execution.is_some()
            });
        let Some(action) = action else {
            self.refuse(&installed.ordinary_actions.value().not_applicable);
            return self.drive(core, None);
        };
        let release = crate::contact::ImpactCursor::request_release(
            self.actor_id(), action, input, may_wait, permission.as_deref(), self.binding, &self.budget,
        )?;
        self.reserve(size_of::<crate::contact::ImpactCursor>())?;
        self.melee_release = Some(Box::new(release));
        self.phase = Phase::MeleeRelease;
        self.drive_melee_release(core, None)
    }

    pub(super) fn drive_melee_release(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<CommandAnswer>,
    ) -> Result<Progress, ExecutionError> {
        use crate::contact::{ContactAnswer, ContactStep};
        let child = self.melee_release.as_mut().ok_or(ExecutionError::Invariant)?;
        let answer = match answer {
            None => None,
            Some(CommandAnswer::Geometry(answer)) => Some(ContactAnswer::Geometry(answer)),
            Some(CommandAnswer::Occurrence(answer)) => Some(ContactAnswer::Occurrence(answer)),
            _ => return Err(ExecutionError::UnfinishedOccurrence),
        };
        let mut step = child.step(core, answer)?;
        let terminal = loop {
            match step {
                ContactStep::Geometry => return Ok(Progress::Geometry),
                ContactStep::Occurrence(event) => return Ok(Progress::Occurrence(event)),
                ContactStep::Personal => {
                    let prepared = crate::experience::prepare_activity_result(
                        core, child.personal()?, &self.budget,
                    ).map_err(|_| ExecutionError::UnfinishedOccurrence)?;
                    let schema = core.state.installed.schema.clone();
                    let result = crate::experience::acquire_activity_result(core, prepared, &schema)
                        .map_err(|_| ExecutionError::UnfinishedOccurrence)?;
                    step = child.step(core, Some(ContactAnswer::Personal(result)))?;
                }
                finished => break finished,
            }
        };
        let (pending, committed, review) = child.requested_result();
        self.melee_release = None;
        let installed = core.state.installed.clone();
        let ordinary = installed.ordinary_actions.value();
        if let Some(review) = review {
            self.strike_confirmation = Some(review);
            self.phase = Phase::Choice;
        } else if committed || pending {
            let NativeCommand::ReleaseStrike { expected_action_id, .. } = &self.command else {
                return Err(ExecutionError::Invariant);
            };
            let mut result = ordinary.accepted.outcome(true);
            let code = if pending { "release-requested" } else { "released" };
            self._reservation.resize(crate::host::retained_size::heap_sum([
                self._reservation.bytes(), code.len(), result.message.storage_bytes(), expected_action_id.len(),
            ]).ok_or(ExecutionError::Capacity)?)?;
            result.code = code.into();
            result.action_id = Some(expected_action_id.clone());
            self.outcome = Some(result);
            self.phase = Phase::Tail;
        } else if matches!(terminal, ContactStep::SightLost) {
            self.refuse(&installed.occurrence_rules.value().response.offers.availability.unperceived);
        } else {
            self.refuse(&ordinary.not_applicable);
        }
        self.drive(core, None)
    }

    pub(super) fn prepare_melee_release_view(
        &mut self,
        core: &CoreMutation<'_>,
    ) -> Result<(), ExecutionError> {
        let NativeCommand::ReleaseStrike { expected_action_id, .. } = &self.command else {
            return Err(ExecutionError::Invariant);
        };
        let occurrence = core.state.activity.active(expected_action_id)
            .map_err(ExecutionError::Activity)?
            .ok_or(ExecutionError::Invariant)?;
        let storage = self.budget.reserve(
            occurrence.view.heap_bytes().ok_or(ExecutionError::Capacity)?,
        )?;
        self.view = Some(occurrence.view.clone());
        self.view_reservation = Some(storage);
        Ok(())
    }
}
