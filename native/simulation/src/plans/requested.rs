//! Requested single-invoke activities enter the ordinary work/choice owners.
//! Source activity-execution.ts::startRequestedActivity is the transition owner.
//! The containing command owns its candidate checkpoint and rolls back refusal.
use super::*;
use crate::commands::{
    ActivityDisplayCursor, CommandChoiceAnswer, CommandChoiceCursor, CommandChoiceStep,
    CompletedActivityDisplay, WorkTransitionMode,
};
use crate::execution::{CoreMutation, ExecutionError};
use crate::experience::AcquiredActivityResult;
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries};
use crate::host::{ByteBudget, ByteReservation};
use std::mem::size_of;

pub(crate) struct RequestedActivityInput {
    pub id: String,
    pub actor_id: String,
    pub mode: PlanMode,
    /// The actual Source-initialized typed envelope, including its root frame.
    pub execution: ActivityExecution,
}
pub(crate) enum RequestedActivityStart {
    Started,
    Queued,
    Refused(Outcome),
}
pub(crate) enum RequestedActivityAnswer {
    Geometry(GeometryAnswers),
    Display(CompletedActivityDisplay),
    Personal(AcquiredActivityResult),
}
pub(crate) enum RequestedActivityStep<'a> {
    Geometry(&'a GeometryQueries),
    Display(&'a mut ActivityDisplayCursor),
    Personal(&'a crate::activity::PendingActivityResult),
    Complete(&'a RequestedActivityStart),
}
#[derive(Clone, Copy, PartialEq, Eq)]
enum Phase {
    Preflight,
    FirstChoice,
    Control,
    Install,
    LastChoice,
    Done,
}
enum Progress {
    Geometry,
    Display,
    Personal,
    Complete,
}
pub(crate) struct RequestedActivityCursor {
    id: String,
    actor: String,
    mode: PlanMode,
    execution: Option<ActivityExecution>,
    binding: GeometryBinding,
    phase: Phase,
    choice: Option<CommandChoiceCursor>,
    control: Option<PlanControlCursor>,
    basis: u64,
    outcome: Option<RequestedActivityStart>,
    budget: ByteBudget,
    reservation: ByteReservation,
}

impl RequestedActivityCursor {
    pub(crate) fn geometry_request(&self) -> Option<&GeometryQueries> {
        self.choice
            .as_ref()
            .and_then(CommandChoiceCursor::geometry_request)
    }
    pub(crate) fn display_cursor(&mut self) -> Option<&mut ActivityDisplayCursor> {
        self.choice
            .as_mut()
            .and_then(CommandChoiceCursor::display_cursor)
    }
    pub(crate) fn personal(
        &self,
    ) -> Result<&crate::activity::PendingActivityResult, ExecutionError> {
        self.control
            .as_ref()
            .ok_or(ExecutionError::Invariant)?
            .personal()
    }
    pub(crate) fn new(
        input: RequestedActivityInput,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let bytes = input
            .execution
            .heap_bytes()
            .and_then(|n| n.checked_add(input.id.capacity()))
            .and_then(|n| n.checked_add(input.actor_id.capacity()))
            .and_then(|n| n.checked_add(size_of::<Self>()))
            .ok_or(ExecutionError::Capacity)?;
        let reservation = budget.reserve(bytes)?;
        Ok(Self {
            id: input.id,
            actor: input.actor_id,
            mode: input.mode,
            execution: Some(input.execution),
            binding,
            phase: Phase::Preflight,
            choice: None,
            control: None,
            basis: 0,
            outcome: None,
            budget: budget.clone(),
            reservation,
        })
    }
    pub(crate) fn abort(&mut self, core: &mut CoreMutation<'_>) -> Result<(), ExecutionError> {
        if let Some(choice) = &mut self.choice {
            choice.abort(core)?;
        }
        self.choice = None;
        self.control = None;
        Ok(())
    }
    fn reserve(&mut self, bytes: usize) -> Result<(), ExecutionError> {
        self.reservation.resize(
            self.reservation
                .bytes()
                .checked_add(bytes)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(())
    }
    fn actor<'a>(
        &self,
        core: &'a CoreMutation<'_>,
    ) -> Result<&'a crate::state::ActorState, ExecutionError> {
        core.state
            .physical
            .entities
            .get(&self.actor)
            .and_then(|entity| entity.actor.as_ref())
            .ok_or(ExecutionError::MissingActor)
    }
    fn pristine(&self, core: &CoreMutation<'_>) -> Result<(), ExecutionError> {
        let value = self.execution.as_ref().ok_or(ExecutionError::Invariant)?;
        value.single_invoke()?;
        value
            .validate_structure(
                &core.state.activity.limits,
                core.state.physical.header.sim_time,
                &core.state.installed,
                &self.budget,
            )
            .map_err(|error| match error {
                crate::install::InstallError::Capacity => ExecutionError::Capacity,
                _ => ExecutionError::UnsupportedFamily,
            })?;
        if value.pending.len() != 1
            || value.serial != 0
            || value.processed != 0
            || value.outputs.object_len() != Some(0)
            || value.active_key.is_some()
            || value.archived_steps.is_some()
            || value.cancelled_keys.is_some()
            || value.reason.is_some()
            || !crate::values::is_safe_record_id(&self.id)
            || !crate::values::is_safe_record_id(&self.actor)
        {
            return Err(ExecutionError::UnsupportedFamily);
        }
        Ok(())
    }
    fn begin_first_choice(&mut self, core: &CoreMutation<'_>) -> Result<(), ExecutionError> {
        let bytes = self
            .id
            .len()
            .checked_add(6)
            .ok_or(ExecutionError::Capacity)?;
        let _id = self.budget.reserve(bytes)?;
        let mut id = String::with_capacity(bytes);
        id.push_str(&self.id);
        id.push_str(":first");
        let (command, _storage) = super::activity::bind_single_invoke(
            self.execution.as_ref().ok_or(ExecutionError::Invariant)?,
            &self.actor,
            &id,
            &core.state.installed,
            &self.budget,
        )?;
        let mode = match self.mode {
            PlanMode::Enqueue => WorkTransitionMode::Enqueue,
            PlanMode::Replace => WorkTransitionMode::Replace,
            PlanMode::Interrupt => WorkTransitionMode::Interrupt,
        };
        self.choice = Some(CommandChoiceCursor::new(
            command,
            mode,
            self.binding,
            &self.budget,
        )?);
        self.phase = Phase::FirstChoice;
        Ok(())
    }
    fn install(&mut self, core: &mut CoreMutation<'_>) -> Result<(), ExecutionError> {
        let actor = self.actor(core)?;
        if self.mode == PlanMode::Enqueue
            && actor
                .agency
                .plan
                .as_ref()
                .is_some_and(|p| p.status == PlanStatus::Active)
        {
            // Source attaches, but never unfolds, behind converted ordinary
            // steps. Another composition/indirect-output prefix is not yet a
            // supported generic Compose consumer; travel rejects busy enqueue.
            let current = actor.agency.plan.as_ref().unwrap();
            if current.activity.is_some() || current.steps.iter().any(|s| s.activity_key.is_some())
            {
                return Err(ExecutionError::UnsupportedFamily);
            }
            let heap = self
                .execution
                .as_ref()
                .ok_or(ExecutionError::Invariant)?
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?;
            core.physical().reserve_plan_growth(heap)?;
            let value = self.execution.take().ok_or(ExecutionError::Invariant)?;
            let mut physical = core.physical();
            let current = physical
                .plan_mut(&self.actor)?
                .as_mut()
                .ok_or(ExecutionError::Invariant)?;
            current.activity = Some(value);
            current.revision = current
                .revision
                .checked_add(1)
                .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
                .ok_or(ExecutionError::Invariant)?;
            physical.advance_agency_revision(&self.actor)?;
            physical.advance_plan_generation(&self.actor)?;
            self.reservation.resize(
                self.reservation
                    .bytes()
                    .checked_sub(heap)
                    .ok_or(ExecutionError::Invariant)?,
            )?;
            self.outcome = Some(RequestedActivityStart::Queued);
            self.phase = Phase::Done;
            return Ok(());
        }
        if actor
            .agency
            .plan
            .as_ref()
            .is_some_and(|p| p.status == PlanStatus::Active)
            || self.mode == PlanMode::Interrupt && actor.action.is_some()
            || self.mode == PlanMode::Enqueue
                && actor
                    .agency
                    .plan
                    .as_ref()
                    .is_some_and(|p| p.status == PlanStatus::Blocked)
        {
            return Err(ExecutionError::UnsupportedFamily);
        }
        let after_direct = self.mode == PlanMode::Enqueue && actor.action.is_some();
        let revision = self
            .basis
            .max(actor.agency.plan.as_ref().map_or(0, |p| p.revision))
            .max(actor.agency.suspended_plan().map_or(0, |p| p.revision))
            .checked_add(1)
            .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
            .ok_or(ExecutionError::Invariant)?;
        let heap = self
            .execution
            .as_ref()
            .ok_or(ExecutionError::Invariant)?
            .heap_bytes()
            .and_then(|n| n.checked_add(self.id.capacity()))
            .ok_or(ExecutionError::Capacity)?;
        core.physical().reserve_plan_growth(heap)?;
        let execution = self.execution.take().ok_or(ExecutionError::Invariant)?;
        let id = std::mem::take(&mut self.id);
        *core.physical().plan_mut(&self.actor)? = Some(ActorPlan {
            result_evidence: None,
            activity: Some(execution),
            id,
            revision,
            goal_id: None,
            status: PlanStatus::Active,
            steps: Vec::new(),
        });
        core.physical().advance_agency_revision(&self.actor)?;
        core.physical().advance_plan_generation(&self.actor)?;
        self.reservation.resize(
            self.reservation
                .bytes()
                .checked_sub(heap)
                .ok_or(ExecutionError::Invariant)?,
        )?;
        if after_direct {
            self.outcome = Some(RequestedActivityStart::Queued);
            self.phase = Phase::Done;
            return Ok(());
        }
        let actor = self.actor(core)?;
        let current = actor
            .agency
            .plan
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        let execution = current.activity.as_ref().ok_or(ExecutionError::Invariant)?;
        let (id, _id) = execution.single_step_id(&current.id, &self.budget)?;
        let (command, _command) = super::activity::bind_single_invoke(
            execution,
            &self.actor,
            &id,
            &core.state.installed,
            &self.budget,
        )?;
        let index = super::activity::append_single_invoke(core, &self.actor, command)?;
        let current = self
            .actor(core)?
            .agency
            .plan
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        let command = &current.steps[index].command;
        let _copy = self
            .budget
            .reserve(command.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        self.choice = Some(CommandChoiceCursor::new(
            command.clone(),
            WorkTransitionMode::Enqueue,
            self.binding,
            &self.budget,
        )?);
        self.phase = Phase::LastChoice;
        Ok(())
    }
    fn drive(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<RequestedActivityAnswer>,
    ) -> Result<Progress, ExecutionError> {
        let mut choice_answer = None;
        let mut personal_answer = None;
        match answer {
            Some(RequestedActivityAnswer::Geometry(value)) => {
                choice_answer = Some(CommandChoiceAnswer::Geometry(value))
            }
            Some(RequestedActivityAnswer::Display(value)) => {
                choice_answer = Some(CommandChoiceAnswer::Display(value))
            }
            Some(RequestedActivityAnswer::Personal(value)) => personal_answer = Some(value),
            None => {}
        }
        loop {
            match self.phase {
                Phase::Preflight => {
                    if choice_answer.is_some() || personal_answer.is_some() {
                        return Err(ExecutionError::UnfinishedOccurrence);
                    }
                    self.pristine(core)?;
                    let actor = self.actor(core)?;
                    self.basis = actor.agency.plan.as_ref().map_or(0, |p| p.revision);
                    let should_check = self.mode != PlanMode::Enqueue
                        || actor.action.is_none()
                            && !actor
                                .agency
                                .plan
                                .as_ref()
                                .is_some_and(|p| p.status == PlanStatus::Active);
                    if should_check {
                        self.begin_first_choice(core)?;
                    } else {
                        self.phase = Phase::Control;
                    }
                }
                Phase::FirstChoice | Phase::LastChoice => {
                    if personal_answer.is_some() {
                        return Err(ExecutionError::UnfinishedOccurrence);
                    }
                    match self
                        .choice
                        .as_mut()
                        .ok_or(ExecutionError::Invariant)?
                        .step(core, choice_answer.take())?
                    {
                        CommandChoiceStep::Geometry(_) => return Ok(Progress::Geometry),
                        CommandChoiceStep::Display(_) => return Ok(Progress::Display),
                        CommandChoiceStep::Complete(value) => {
                            let (outcome, storage) = value.into_parts();
                            self.choice = None;
                            if !outcome.ok {
                                self.reservation.merge(storage)?;
                                self.outcome = Some(RequestedActivityStart::Refused(outcome));
                                self.phase = Phase::Done;
                            } else {
                                drop(outcome);
                                drop(storage);
                                if self.phase == Phase::FirstChoice {
                                    self.phase = Phase::Control;
                                } else {
                                    self.outcome = Some(RequestedActivityStart::Started);
                                    self.phase = Phase::Done;
                                }
                            }
                        }
                    }
                }
                Phase::Control => {
                    if choice_answer.is_some() {
                        return Err(ExecutionError::UnfinishedOccurrence);
                    }
                    if self.control.is_none() {
                        let kind = match self.mode {
                            PlanMode::Replace => Some(PlanControlKind::Stop),
                            PlanMode::Interrupt => Some(PlanControlKind::Suspend),
                            PlanMode::Enqueue => None,
                        };
                        if let Some(kind) = kind {
                            self.control =
                                Some(PlanControlCursor::new(&self.actor, kind, &self.budget)?);
                        } else {
                            self.phase = Phase::Install;
                            continue;
                        }
                    }
                    match self
                        .control
                        .as_mut()
                        .ok_or(ExecutionError::Invariant)?
                        .progress(core, personal_answer.take())?
                    {
                        PlanControlProgress::Personal => return Ok(Progress::Personal),
                        PlanControlProgress::Complete => {}
                    }
                    let control = self.control.as_ref().ok_or(ExecutionError::Invariant)?;
                    if let Some(refusal) = control.refusal() {
                        let heap = refusal.heap_bytes().ok_or(ExecutionError::Capacity)?;
                        self.reserve(heap)?;
                        self.outcome = Some(RequestedActivityStart::Refused(
                            self.control.as_ref().unwrap().refusal().unwrap().clone(),
                        ));
                        self.phase = Phase::Done;
                    } else {
                        self.basis = control.previous_revision().unwrap_or(self.basis);
                        self.phase = Phase::Install;
                    }
                    self.control = None;
                }
                Phase::Install => {
                    if choice_answer.is_some() || personal_answer.is_some() {
                        return Err(ExecutionError::UnfinishedOccurrence);
                    }
                    self.install(core)?;
                }
                Phase::Done => {
                    if choice_answer.is_some() || personal_answer.is_some() {
                        return Err(ExecutionError::UnfinishedOccurrence);
                    }
                    return Ok(Progress::Complete);
                }
            }
        }
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<RequestedActivityAnswer>,
    ) -> Result<RequestedActivityStep<'a>, ExecutionError> {
        let progress = match self.drive(core, answer) {
            Ok(value) => value,
            Err(error) => {
                self.abort(core)?;
                return Err(error);
            }
        };
        Ok(match progress {
            Progress::Geometry => RequestedActivityStep::Geometry(
                self.choice
                    .as_ref()
                    .and_then(CommandChoiceCursor::geometry_request)
                    .ok_or(ExecutionError::Invariant)?,
            ),
            Progress::Display => RequestedActivityStep::Display(
                self.choice
                    .as_mut()
                    .and_then(CommandChoiceCursor::display_cursor)
                    .ok_or(ExecutionError::Invariant)?,
            ),
            Progress::Personal => RequestedActivityStep::Personal(
                self.control
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?
                    .personal()?,
            ),
            Progress::Complete => RequestedActivityStep::Complete(
                self.outcome.as_ref().ok_or(ExecutionError::Invariant)?,
            ),
        })
    }
}
