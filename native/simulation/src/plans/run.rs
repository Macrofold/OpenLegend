//! Dispatch one real ordinary frontier through the common command owner. The
//! outer interval chooses actor order and calls again at its next phase; this
//! cursor never drains a plan or advances time by itself.
use super::*;
use crate::commands::{
    CommandCursor, CommandOperation, CommandOperationError, CommandOptions,
    CompletedCommandOperation,
};
use crate::execution::{CandidateCheckpoint, CoreMutation, ExecutionError};
use crate::experience::{acquire_activity_result, prepare_activity_result};
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries};
use crate::host::{ByteBudget, ByteReservation, CandidateKey};
use std::mem::size_of;

#[derive(Serialize)]
pub(crate) struct PlanCommandRequest {
    pub binding: GeometryBinding,
    pub command: NativeCommand,
    #[serde(skip)]
    _reservation: ByteReservation,
}
pub(crate) enum PlanRunAnswer {
    Geometry(GeometryAnswers),
    Canonical {
        binding: GeometryBinding,
        canonical: String,
    },
    Command(CompletedCommandOperation),
}
pub(crate) enum PlanRunStep<'a> {
    Geometry(&'a GeometryQueries),
    Canonical(&'a PlanCommandRequest),
    Command(&'a mut CommandOperation),
    Complete(CompletedPlanRun),
}
pub(crate) struct CompletedPlanRun {
    // Own the actual command events and their buffer allowance through outer
    // publication. No event or account is recreated from a command outcome.
    pub command: Option<CompletedCommandOperation>,
}
enum Progress {
    Geometry,
    Canonical,
    Command,
    Complete(CompletedPlanRun),
}
pub(crate) struct PlanRunCursor {
    candidate: CandidateKey,
    checkpoint: Option<CandidateCheckpoint>,
    readiness: Option<PlanReadyCursor>,
    ready: Option<ReadyPlanStep>,
    request: Option<PlanCommandRequest>,
    operation: Option<CommandOperation>,
    done: bool,
    _reservation: ByteReservation,
}
impl PlanRunCursor {
    pub(crate) fn new(
        core: &mut CoreMutation<'_>,
        actor: &str,
        candidate: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Self, CommandOperationError> {
        let reservation = budget.reserve(size_of::<Self>())?;
        let binding = GeometryBinding::new(
            candidate,
            core.state.installed.geometry.spatial.revision,
            core.journal.next_provider_serial()?,
        );
        let readiness = PlanReadyCursor::new(actor, binding, budget)?;
        let checkpoint = core.journal.checkpoint(core.state)?;
        Ok(Self {
            candidate,
            checkpoint: Some(checkpoint),
            readiness: Some(readiness),
            ready: None,
            request: None,
            operation: None,
            done: false,
            _reservation: reservation,
        })
    }
    pub(crate) fn abort(&mut self, core: &mut CoreMutation<'_>) -> Result<(), ExecutionError> {
        if let Some(operation) = &mut self.operation {
            operation.abort(core)?;
        }
        self.operation = None;
        if let Some(checkpoint) = self.checkpoint.take() {
            core.journal.rollback_to(core.state, checkpoint)?;
        }
        self.request = None;
        self.readiness = None;
        self.ready = None;
        self.done = true;
        Ok(())
    }
    fn complete(
        &mut self,
        core: &mut CoreMutation<'_>,
        command: Option<CompletedCommandOperation>,
    ) -> Result<Progress, CommandOperationError> {
        core.journal.keep(
            core.state,
            self.checkpoint
                .take()
                .ok_or(ExecutionError::InvalidCheckpoint)?,
        )?;
        self.operation = None;
        self.request = None;
        self.readiness = None;
        self.done = true;
        Ok(Progress::Complete(CompletedPlanRun { command }))
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<PlanRunAnswer>,
        budget: &ByteBudget,
    ) -> Result<PlanRunStep<'a>, CommandOperationError> {
        let progress = match self.drive(core, answer, budget) {
            Ok(progress) => progress,
            Err(error) => {
                self.abort(core)?;
                return Err(error);
            }
        };
        Ok(match progress {
            Progress::Geometry => PlanRunStep::Geometry(
                self.readiness
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?
                    .geometry_request()?,
            ),
            Progress::Canonical => {
                PlanRunStep::Canonical(self.request.as_ref().ok_or(ExecutionError::Invariant)?)
            }
            Progress::Command => {
                PlanRunStep::Command(self.operation.as_mut().ok_or(ExecutionError::Invariant)?)
            }
            Progress::Complete(completed) => PlanRunStep::Complete(completed),
        })
    }
    fn drive(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<PlanRunAnswer>,
        budget: &ByteBudget,
    ) -> Result<Progress, CommandOperationError> {
        if self.done {
            return Err(ExecutionError::Invariant.into());
        }
        let mut ready_answer = None;
        match answer {
            Some(PlanRunAnswer::Geometry(answers)) if self.readiness.is_some() => {
                ready_answer = Some(PlanReadyAnswer::Geometry(answers));
            }
            Some(PlanRunAnswer::Canonical { binding, canonical }) if self.operation.is_none() => {
                let request = self
                    .request
                    .as_ref()
                    .filter(|request| request.binding == binding)
                    .ok_or(ExecutionError::UnfinishedOccurrence)?;
                let command = self
                    .ready
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?
                    .command(core)?;
                if *command != request.command {
                    return Err(ExecutionError::Invariant.into());
                }
                let reservation =
                    budget.reserve(command.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
                let command = command.clone();
                let cursor = CommandCursor::new(
                    command,
                    canonical,
                    CommandOptions {
                        preview: false,
                        native_controller: false,
                        native_movement: None,
                        durable_receipt: false,
                    },
                    binding,
                    budget,
                )?;
                self.operation = Some(CommandOperation::from_cursor(
                    core,
                    cursor,
                    self.candidate,
                    budget,
                )?);
                self.request = None;
                drop(reservation);
            }
            Some(PlanRunAnswer::Command(completed)) => {
                if self
                    .operation
                    .as_ref()
                    .is_none_or(|operation| !operation.is_complete())
                {
                    return Err(ExecutionError::UnfinishedOccurrence.into());
                }
                let ready = self.ready.take().ok_or(ExecutionError::Invariant)?;
                if completed.command.actor_id() != ready.actor_id()
                    || completed.command.command_id() != ready.step_id()
                {
                    return Err(ExecutionError::UnfinishedOccurrence.into());
                }
                // The outer Source advance forks its next working draft from
                // this settled command before marking/completing the step.
                core.begin_received_value_scope()?;
                ready.complete(core, completed.command.outcome())?;
                return self.complete(core, Some(completed));
            }
            Some(_) => return Err(ExecutionError::UnfinishedOccurrence.into()),
            None => {}
        }
        if self.operation.is_some() {
            return Ok(Progress::Command);
        }
        if self.request.is_some() {
            return Ok(Progress::Canonical);
        }
        loop {
            let readiness = self.readiness.as_mut().ok_or(ExecutionError::Invariant)?;
            match readiness.step(core, ready_answer.take())? {
                PlanReadyStep::Geometry(_) => return Ok(Progress::Geometry),
                PlanReadyStep::Personal(pending) => {
                    let plan = prepare_activity_result(core, pending, budget)?;
                    let schema = core.state.installed.schema.clone();
                    ready_answer = Some(PlanReadyAnswer::Personal(acquire_activity_result(
                        core, plan, &schema,
                    )?));
                }
                PlanReadyStep::Complete(None) => return self.complete(core, None),
                PlanReadyStep::Complete(Some(ready)) => {
                    self.readiness = None;
                    if !ready.targets_current(core)? {
                        let installed = core.state.installed.clone();
                        let rule = &installed.ordinary_actions.value().plan.stale_encounter;
                        let guard = budget.reserve(
                            rule.message.len() * 8 + rule.code.len() + size_of::<Outcome>(),
                        )?;
                        ready.complete(core, &rule.outcome(false))?;
                        drop(guard);
                        return self.complete(core, None);
                    }
                    let binding = GeometryBinding::new(
                        self.candidate,
                        core.state.installed.geometry.spatial.revision,
                        core.journal.next_provider_serial()?,
                    );
                    let command = ready.command(core)?;
                    let reservation = budget.reserve(
                        size_of::<PlanCommandRequest>()
                            + command.heap_bytes().ok_or(ExecutionError::Capacity)?,
                    )?;
                    self.request = Some(PlanCommandRequest {
                        binding,
                        command: command.clone(),
                        _reservation: reservation,
                    });
                    self.ready = Some(ready);
                    return Ok(Progress::Canonical);
                }
            }
        }
    }
}
