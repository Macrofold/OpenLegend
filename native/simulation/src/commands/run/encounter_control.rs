//! An exact preference does not touch speech or unrelated physical work.
use super::*;
use crate::combat_encounters::{
    EncounterOperation, apply_control, context, current_pair, own_method, policy,
};
use crate::execution::ActionFinish;

impl CommandCursor {
    pub(super) fn prepare_encounter_control(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<(), ExecutionError> {
        let NativeCommand::EncounterPreference {
            envelope,
            operation,
            binding,
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let state = &*core.state;
        let observer = state
            .physical
            .entities
            .get(&envelope.actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let current = state
            .physical
            .entities
            .get(&binding.target_id)
            .filter(|target| {
                state
                    .reception
                    .visible_people
                    .as_ref()
                    .and_then(|owners| owners.get(&observer.id))
                    .is_some_and(|people| people.contains(&target.id))
            });
        let Some(target) = current.filter(|target| {
            context(state, observer, target).is_some_and(|seen| seen.binding == binding.borrowed())
        }) else {
            return self.refuse_encounter(
                "stale-encounter-preference",
                "This encounter changed. Review its current controls.",
            );
        };
        if *operation == EncounterOperation::Speak {
            return self.finish_encounter_control(core, false);
        }
        let Some(own) = current_pair(state, observer, target).and_then(|pair| pair.own.as_ref())
        else {
            return self.refuse_encounter(
                "stale-encounter-preference",
                "This encounter changed. Review its current controls.",
            );
        };
        let actor = observer
            .actor
            .as_ref()
            .ok_or(ExecutionError::MissingActor)?;
        if own.plan_id.as_ref().is_some_and(|id| {
            [actor.agency.plan.as_ref(), actor.agency.suspended_plan()]
                .into_iter()
                .flatten()
                .any(|plan| &plan.id == id)
        }) {
            return self.refuse_encounter(
                "scoped-stop-unavailable",
                "This attack belongs to existing work. Use its action controls to stop it.",
            );
        }
        let exact = actor.action.as_ref().filter(|action| {
            action.id == own.invocation_id
                && own_method(action).is_some()
                && action.target_id.as_deref() == Some(binding.target_id.as_str())
                && action.target_life == Some(binding.target_life)
                && action.strike_phase != Some(crate::contact::StrikePhase::Recovery)
        });
        let Some(action) = exact else {
            return self.finish_encounter_control(core, false);
        };
        let _storage = self.budget.reserve(action.id.len() + 160)?;
        let action = action.id.clone();
        let result = core
            .state
            .installed
            .ordinary_actions
            .value()
            .cancelled_by_choice
            .outcome(false);
        match core.begin_finish_action(&envelope.actor_id, &action, result)? {
            ActionFinish::Complete(_) => self.finish_encounter_control(core, true),
            ActionFinish::Personal(pending) => {
                self.personal = Some(PersonalTask::EncounterStop(pending));
                Ok(())
            }
        }
    }

    fn refuse_encounter(&mut self, code: &str, message: &str) -> Result<(), ExecutionError> {
        self.reserve(code.len() + 4 * message.len())?;
        self.outcome = Some(outcome(false, code, message));
        self.phase = Phase::Done;
        Ok(())
    }

    pub(super) fn finish_encounter_control(
        &mut self,
        core: &mut CoreMutation<'_>,
        stopped: bool,
    ) -> Result<(), ExecutionError> {
        let NativeCommand::EncounterPreference {
            envelope,
            operation,
            binding,
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        if stopped {
            let state = &*core.state;
            let still_exact = state
                .physical
                .entities
                .get(&envelope.actor_id)
                .zip(state.physical.entities.get(&binding.target_id))
                .and_then(|(source, target)| {
                    let owned = current_pair(state, source, target)?.own.as_ref()?;
                    let action = source.actor.as_ref()?.action.as_ref()?;
                    Some(
                        action.id == owned.invocation_id
                            && action.target_id.as_deref() == Some(binding.target_id.as_str())
                            && action.target_life == Some(binding.target_life),
                    )
                })
                == Some(true);
            if still_exact {
                core.physical().replace_action(
                    &envelope.actor_id,
                    None,
                    ActionWrite {
                        generation: PlanGenerationWrite::Advance,
                        behavior: Some(false),
                    },
                )?;
            }
        }
        apply_control(core, &envelope.actor_id, binding, *operation, &self.budget)?;
        let words = &policy(core.state)
            .ok_or(ExecutionError::Invariant)?
            .controls;
        let message = match operation {
            EncounterOperation::Speak => &words.speak.success,
            EncounterOperation::Stop => &words.stop.success,
        };
        self.reserve(128 + 4 * message.len())?;
        self.outcome = Some(outcome(true, "encounter-preference-changed", message));
        self.phase = Phase::Tail;
        Ok(())
    }
}
