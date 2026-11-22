//! The typed movement attempt prepares the same first choice as a response,
//! then installs its ordinary plan. The surrounding command owns rollback.

use super::*;
use crate::commands::{
    CommandChoiceAnswer, CommandChoiceCursor, CommandChoiceStep, WorkTransitionMode,
};
use crate::plans::{PlanEditCursor, PlanEditInput, PlanEditStep, PlanMode};

pub(super) struct PreparedWalk {
    mode: PlanMode,
    command: Option<NativeCommand>,
    choice: Option<CommandChoiceCursor>,
    edit: Option<PlanEditCursor>,
    _storage: ByteReservation,
}

impl PreparedWalk {
    pub(super) fn geometry(&self) -> Option<&GeometryQueries> {
        self.choice.as_ref()?.geometry_request()
    }

    pub(super) fn display(&mut self) -> Option<&mut super::super::ActivityDisplayCursor> {
        self.choice.as_mut()?.display_cursor()
    }

    pub(super) fn personal(
        &self,
    ) -> Result<&crate::activity::PendingActivityResult, ExecutionError> {
        self.edit
            .as_ref()
            .ok_or(ExecutionError::Invariant)?
            .personal()
    }

    pub(super) fn close(&mut self, core: &mut CoreMutation<'_>) -> Result<(), ExecutionError> {
        if let Some(mut preview) = self.choice.take() {
            preview.abort(core)?;
        }
        Ok(())
    }
}

impl CommandCursor {
    pub(super) fn prepare_typed_walk(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<Progress, ExecutionError> {
        let mode = self
            .typed_plan_mode
            .take()
            .ok_or(ExecutionError::Invariant)?;
        let NativeCommand::Move { destination, .. } = &self.command else {
            return Err(ExecutionError::UnsupportedFamily);
        };
        let id = &self.command.envelope().id;
        let actor = self.actor_id();
        let bytes = destination
            .physical()
            .surface_id
            .len()
            .checked_add(id.len() + actor.len())
            .and_then(|bytes| bytes.checked_mul(32))
            .and_then(|bytes| bytes.checked_add(4096 + size_of::<PreparedWalk>()))
            .ok_or(ExecutionError::Capacity)?;
        let storage = self.budget.reserve(bytes)?;
        // The plan step has its own identity. Reusing the request receipt ID
        // would make the ordinary runner mistake this unstarted walk for a replay.
        let (command, _) = super::super::player::RuntimePlayerCommand::Move(destination.physical())
            .bind(&format!("{id}:walk"), actor)
            .map_err(|_| ExecutionError::Invariant)?;
        let transition = match mode {
            PlanMode::Enqueue => WorkTransitionMode::Enqueue,
            PlanMode::Replace => WorkTransitionMode::Replace,
            PlanMode::Interrupt => WorkTransitionMode::Interrupt,
        };
        let choice = CommandChoiceCursor::new(
            command.recorded().map_err(|_| ExecutionError::Invariant)?,
            transition,
            self.binding,
            &self.budget,
        )?;
        self.typed_plan = Some(Box::new(PreparedWalk {
            mode,
            command: Some(command),
            choice: Some(choice),
            edit: None,
            _storage: storage,
        }));
        self.phase = Phase::TypedPlan;
        self.typed_walk_step(core, None)
    }

    pub(super) fn typed_walk_step(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<CommandAnswer>,
    ) -> Result<Progress, ExecutionError> {
        let child = self.typed_plan.as_mut().ok_or(ExecutionError::Invariant)?;
        let mut personal = None;
        if let Some(choice) = child.choice.as_mut() {
            let answer = match answer {
                Some(CommandAnswer::Display(value)) => Some(CommandChoiceAnswer::Display(value)),
                Some(CommandAnswer::Geometry(value)) => Some(CommandChoiceAnswer::Geometry(value)),
                None => None,
                _ => return Err(ExecutionError::UnfinishedOccurrence),
            };
            match choice.step(core, answer)? {
                CommandChoiceStep::Geometry(_) => return Ok(Progress::Geometry),
                CommandChoiceStep::Display(_) => return Ok(Progress::Display),
                CommandChoiceStep::Complete(result) => {
                    let (outcome, custody) = result.into_parts();
                    child.choice = None;
                    if !outcome.ok {
                        self._reservation.merge(custody)?;
                        self.outcome = Some(outcome);
                        self.phase = Phase::Done;
                        return self.drive(core, None);
                    }
                }
            }
        } else {
            match answer {
                Some(CommandAnswer::Personal(answer)) => personal = Some(answer),
                None => {}
                _ => return Err(ExecutionError::UnfinishedOccurrence),
            }
        }
        if child.edit.is_none() {
            let actor = &self.command.envelope().actor_id;
            let expected_revision = core
                .state
                .physical
                .entities
                .get(actor)
                .and_then(|entity| entity.actor.as_ref())
                .ok_or(ExecutionError::MissingActor)?
                .agency
                .plan
                .as_ref()
                .map_or(0, |plan| plan.revision);
            child.edit = Some(PlanEditCursor::new(
                PlanEditInput {
                    id: self.command.envelope().id.clone(),
                    actor_id: actor.clone(),
                    mode: child.mode,
                    expected_revision,
                    goal_id: None,
                    commands: vec![child.command.take().ok_or(ExecutionError::Invariant)?],
                },
                &self.budget,
            )?);
        }
        let outcome = match child
            .edit
            .as_mut()
            .ok_or(ExecutionError::Invariant)?
            .step(core, personal)?
        {
            PlanEditStep::Personal(_) => return Ok(Progress::Personal),
            PlanEditStep::Complete(outcome) => outcome,
        };
        self._reservation.resize(
            self._reservation
                .bytes()
                .checked_add(outcome.heap_bytes().ok_or(ExecutionError::Capacity)?)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        self.outcome = Some(outcome.clone());
        self.phase = Phase::Done;
        self.drive(core, None)
    }
}
