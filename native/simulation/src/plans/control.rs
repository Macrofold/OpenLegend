//! Ordinary plan cancellation/retirement/pause keep Source's personal-result
//! boundaries. The cursor cannot advance past an actual pending acquisition.
use super::*;
use crate::activity::PendingActivityResult;
use crate::execution::{ActionWrite, CoreMutation, ExecutionError, PlanGenerationWrite};
use crate::experience::AcquiredActivityResult;
use crate::host::retained_size::HeapBytes;
use crate::host::{ByteBudget, ByteReservation};
use crate::text::TextRef;
use std::mem::size_of;

#[derive(Clone, Copy, PartialEq, Eq)]
pub(crate) enum PlanControlKind {
    Cancel,
    Retire,
    Stop,
    DiscardSuspended,
    Suspend,
}
#[derive(Clone, Copy, PartialEq, Eq)]
enum Phase {
    Begin,
    CancelStep,
    CancelReport,
    CancelFinish,
    Retire,
    DiscardReport,
    DiscardFinish,
    EndLoose,
    SuspendEnd,
    SuspendRestart,
    Done,
}
#[derive(Clone, Copy)]
enum Destination {
    Cancel(usize),
    Suspend(usize),
    Loose,
}
struct Ending {
    action: String,
    result: Outcome,
    destination: Destination,
}
pub(crate) enum PlanControlProgress {
    Personal,
    Complete,
}
pub(crate) enum PlanControlStep<'a> {
    Personal(&'a PendingActivityResult),
    Complete,
}

pub(crate) struct PlanControlCursor {
    actor: String,
    kind: PlanControlKind,
    phase: Phase,
    index: usize,
    ending: Option<Ending>,
    pending: Option<PendingActivityResult>,
    restart: Option<(usize, String)>,
    refused: Option<Outcome>,
    previous_revision: Option<u64>,
    budget: ByteBudget,
    reservation: ByteReservation,
}
impl PlanControlCursor {
    pub(crate) fn new(
        actor: &str,
        kind: PlanControlKind,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let reservation = budget.reserve(size_of::<Self>() + actor.len())?;
        Ok(Self {
            actor: actor.into(),
            kind,
            phase: Phase::Begin,
            index: 0,
            ending: None,
            pending: None,
            restart: None,
            refused: None,
            previous_revision: None,
            budget: budget.clone(),
            reservation,
        })
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
    pub(crate) fn refusal(&self) -> Option<&Outcome> {
        self.refused.as_ref()
    }
    pub(crate) fn previous_revision(&self) -> Option<u64> {
        self.previous_revision
    }
    pub(crate) fn personal(&self) -> Result<&PendingActivityResult, ExecutionError> {
        self.pending
            .as_ref()
            .ok_or(ExecutionError::UnfinishedOccurrence)
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<AcquiredActivityResult>,
    ) -> Result<PlanControlStep<'a>, ExecutionError> {
        Ok(match self.progress(core, answer)? {
            PlanControlProgress::Personal => PlanControlStep::Personal(self.personal()?),
            PlanControlProgress::Complete => PlanControlStep::Complete,
        })
    }
    fn message(
        &mut self,
        rule: &crate::worlds::InstalledActionMessage,
        ok: bool,
    ) -> Result<Outcome, ExecutionError> {
        self.reserve(
            rule.code
                .len()
                .checked_add(
                    rule.message
                        .len()
                        .checked_mul(8)
                        .ok_or(ExecutionError::Capacity)?,
                )
                .and_then(|n| n.checked_add(2 * size_of::<Outcome>()))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(rule.outcome(ok))
    }
    fn actor<'a>(
        &self,
        core: &'a CoreMutation<'_>,
    ) -> Result<&'a crate::state::ActorState, ExecutionError> {
        core.state
            .physical
            .entities
            .get(&self.actor)
            .and_then(|e| e.actor.as_ref())
            .ok_or(ExecutionError::MissingActor)
    }
    fn clear_action(
        &self,
        core: &mut CoreMutation<'_>,
        generation: PlanGenerationWrite,
    ) -> Result<(), ExecutionError> {
        core.physical().replace_action(
            &self.actor,
            None,
            ActionWrite {
                generation,
                behavior: None,
            },
        )
    }
    fn ending(
        &mut self,
        core: &mut CoreMutation<'_>,
        action: &str,
        result: Outcome,
        destination: Destination,
    ) -> Result<bool, ExecutionError> {
        self.reserve(
            action
                .len()
                .checked_add(result.heap_bytes().ok_or(ExecutionError::Capacity)?)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        self.ending = Some(Ending {
            action: action.into(),
            result: result.clone(),
            destination,
        });
        let installed = core.state.installed.clone();
        self.pending = core
            .journal
            .activity
            .prepare_end(
                &mut core.state.activity,
                &self.actor,
                action,
                result,
                core.state.physical.header.sim_time,
                &installed.ordinary_actions.value().before_attempt_facts,
            )
            .map_err(ExecutionError::Activity)?;
        if self.pending.is_some() {
            return Ok(true);
        }
        let evidence = core
            .state
            .activity
            .occurrence_for(&self.actor, action)
            .map_err(ExecutionError::Activity)?
            .and_then(|e| e.result_evidence.as_ref());
        self.reserve(
            evidence
                .map_or(Some(0), HeapBytes::heap_bytes)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let evidence = evidence.cloned();
        self.finish_ending(core, evidence)?;
        Ok(false)
    }
    fn finish_ending(
        &mut self,
        core: &mut CoreMutation<'_>,
        evidence: Option<ResultEvidence>,
    ) -> Result<(), ExecutionError> {
        let Ending {
            action,
            result,
            destination,
        } = self.ending.take().ok_or(ExecutionError::Invariant)?;
        core.physical().reserve_plan_growth(
            result
                .heap_bytes()
                .and_then(|bytes| bytes.checked_add(evidence.heap_bytes()?))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        match destination {
            Destination::Cancel(index) => {
                let mut physical = core.physical();
                let step = physical
                    .plan_mut(&self.actor)?
                    .as_mut()
                    .and_then(|p| p.steps.get_mut(index))
                    .ok_or(ExecutionError::Invariant)?;
                step.result_evidence = evidence;
                step.status = StepStatus::Cancelled;
                step.outcome = Some(result);
                self.index = index + 1;
            }
            Destination::Suspend(index) => {
                let mut physical = core.physical();
                physical
                    .plan_mut(&self.actor)?
                    .as_mut()
                    .and_then(|p| p.steps.get_mut(index))
                    .ok_or(ExecutionError::Invariant)?
                    .result_evidence = evidence;
                core.physical().release_work(&action)?;
                self.clear_action(core, PlanGenerationWrite::Preserve)?;
                self.phase = Phase::SuspendRestart;
            }
            Destination::Loose => {
                core.physical().release_work(&action)?;
                self.clear_action(core, PlanGenerationWrite::Advance)?;
                self.phase = Phase::Done;
            }
        }
        Ok(())
    }
    fn archive(
        &mut self,
        core: &mut CoreMutation<'_>,
        steps: &[PlanStep],
    ) -> Result<(), ExecutionError> {
        let history = &self.actor(core)?.agency.history;
        let total = history
            .len()
            .checked_add(steps.len())
            .ok_or(ExecutionError::Capacity)?;
        let maximum = usize::try_from(core.state.installed.agency_limits.history)
            .map_err(|_| ExecutionError::Capacity)?;
        let kept = total.min(maximum);
        let skipped = total - kept;
        let heap = history.iter().chain(steps).skip(skipped).try_fold(
            kept.checked_mul(size_of::<PlanStep>())
                .ok_or(ExecutionError::Capacity)?,
            |bytes, step| {
                bytes
                    .checked_add(step.heap_bytes().ok_or(ExecutionError::Capacity)?)
                    .ok_or(ExecutionError::Capacity)
            },
        )?;
        core.physical().reserve_plan_growth(heap)?;
        let mut after = Vec::with_capacity(kept);
        after.extend(
            self.actor(core)?
                .agency
                .history
                .iter()
                .chain(steps)
                .skip(skipped)
                .cloned(),
        );
        core.physical().replace_plan_history(&self.actor, after)
    }
    fn report(&mut self, core: &mut CoreMutation<'_>, paused: bool) -> Result<(), ExecutionError> {
        let installed = core.state.installed.clone();
        let rules = &installed.ordinary_actions.value().plan;
        let plan = if paused {
            self.actor(core)?.agency.suspended_plan()
        } else {
            self.actor(core)?.agency.plan.as_ref()
        }
        .ok_or(ExecutionError::Invariant)?;
        let queued = plan
            .steps
            .iter()
            .filter(|step| step.action_id.is_none())
            .count();
        self.reserve(
            crate::encoding::json_record_len(&core.state.physical.header.sim_time)
                .map_err(|_| ExecutionError::Invariant)?
                .checked_add(32 + 2 * size_of::<String>())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let time = crate::encoding::json_record(&core.state.physical.header.sim_time)
            .map_err(|_| ExecutionError::Invariant)?;
        let queued = queued.to_string();
        let fields = [
            ("time", TextRef::Unicode(&time)),
            ("queued", TextRef::Unicode(&queued)),
        ];
        let bound = rules
            .text_bound(&rules.stopped_summary, &fields)
            .ok_or(ExecutionError::Capacity)?;
        self.reserve(bound)?;
        let suffix = rules.text(&rules.stopped_summary, &fields);
        let (summary, _render) =
            super::memory::personal_possessive(&self.actor, suffix, &self.budget)?;
        let evidence =
            super::memory::append_report(core, &self.actor, summary, rules.control_importance)?;
        let pointer_bytes = evidence
            .heap_bytes()
            .ok_or(ExecutionError::Capacity)?
            .checked_mul(2)
            .ok_or(ExecutionError::Capacity)?;
        core.physical().reserve_plan_growth(pointer_bytes)?;
        if paused {
            let mut physical = core.physical();
            physical
                .suspended_plan_mut(&self.actor)?
                .as_mut()
                .and_then(Option::as_mut)
                .ok_or(ExecutionError::Invariant)?
                .result_evidence = evidence.clone();
        } else {
            let mut physical = core.physical();
            physical
                .plan_mut(&self.actor)?
                .as_mut()
                .ok_or(ExecutionError::Invariant)?
                .result_evidence = evidence.clone();
        }
        core.physical().set_result_evidence(&self.actor, evidence)
    }
    pub(super) fn progress(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<AcquiredActivityResult>,
    ) -> Result<PlanControlProgress, ExecutionError> {
        if self.pending.is_some() {
            let acquired = answer.ok_or(ExecutionError::UnfinishedOccurrence)?;
            let pending = self.pending.take().ok_or(ExecutionError::Invariant)?;
            self.reserve(
                acquired
                    .evidence()
                    .map_or(Some(0), HeapBytes::heap_bytes)
                    .ok_or(ExecutionError::Capacity)?
                    .checked_mul(2)
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let evidence = acquired.evidence().cloned();
            core.complete_activity_result(pending, &acquired)?;
            self.finish_ending(core, evidence)?;
        } else if answer.is_some() {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        let installed = core.state.installed.clone();
        let rules = &installed.ordinary_actions.value().plan;
        loop {
            match self.phase {
                Phase::Begin => {
                    self.phase = match self.kind {
                        PlanControlKind::DiscardSuspended => Phase::DiscardReport,
                        PlanControlKind::Suspend => Phase::SuspendEnd,
                        _ => Phase::CancelStep,
                    };
                }
                Phase::CancelStep => {
                    let actor = self.actor(core)?;
                    let Some(plan) = actor.agency.plan.as_ref() else {
                        self.phase = if self.kind == PlanControlKind::Stop {
                            Phase::DiscardReport
                        } else {
                            Phase::Done
                        };
                        continue;
                    };
                    if matches!(plan.status, PlanStatus::Completed | PlanStatus::Cancelled) {
                        self.phase = if self.kind == PlanControlKind::Cancel {
                            Phase::Done
                        } else {
                            Phase::Retire
                        };
                        continue;
                    }
                    let Some(step) = plan.steps.get(self.index) else {
                        self.phase = Phase::CancelReport;
                        continue;
                    };
                    if !matches!(step.status, StepStatus::Queued | StepStatus::Running) {
                        self.index += 1;
                        continue;
                    }
                    self.reserve(step.action_id.as_ref().map_or(0, String::len))?;
                    let action = step.action_id.clone();
                    let index = self.index;
                    if actor
                        .action
                        .as_ref()
                        .is_some_and(|work| Some(&work.id) == action.as_ref())
                    {
                        core.physical()
                            .release_work(action.as_deref().ok_or(ExecutionError::Invariant)?)?;
                        self.clear_action(core, PlanGenerationWrite::Advance)?;
                    }
                    let result = self.message(&rules.cancelled_step, false)?;
                    if let Some(action) = action {
                        if self.ending(core, &action, result, Destination::Cancel(index))? {
                            return Ok(PlanControlProgress::Personal);
                        }
                    } else {
                        let mut physical = core.physical();
                        physical.reserve_plan_growth(
                            result.heap_bytes().ok_or(ExecutionError::Capacity)?,
                        )?;
                        let step = physical
                            .plan_mut(&self.actor)?
                            .as_mut()
                            .and_then(|p| p.steps.get_mut(index))
                            .ok_or(ExecutionError::Invariant)?;
                        step.status = StepStatus::Cancelled;
                        step.outcome = Some(result);
                        self.index += 1;
                    }
                }
                Phase::CancelReport => {
                    {
                        let mut physical = core.physical();
                        physical
                            .plan_mut(&self.actor)?
                            .as_mut()
                            .ok_or(ExecutionError::Invariant)?
                            .status = PlanStatus::Cancelled;
                    }
                    self.report(core, false)?;
                    self.phase = Phase::CancelFinish;
                }
                Phase::CancelFinish => {
                    {
                        let mut physical = core.physical();
                        let plan = physical
                            .plan_mut(&self.actor)?
                            .as_mut()
                            .ok_or(ExecutionError::Invariant)?;
                        plan.revision = plan
                            .revision
                            .checked_add(1)
                            .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
                            .ok_or(ExecutionError::Invariant)?;
                    }
                    core.physical().advance_agency_revision(&self.actor)?;
                    core.physical().advance_plan_generation(&self.actor)?;
                    self.phase = if self.kind == PlanControlKind::Cancel {
                        Phase::Done
                    } else {
                        Phase::Retire
                    };
                }
                Phase::Retire => {
                    let plan = self
                        .actor(core)?
                        .agency
                        .plan
                        .as_ref()
                        .ok_or(ExecutionError::Invariant)?;
                    self.reserve(plan.steps.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
                    let steps = plan.steps.clone();
                    self.previous_revision = Some(plan.revision);
                    self.archive(core, &steps)?;
                    *core.physical().plan_mut(&self.actor)? = None;
                    self.phase = if self.kind == PlanControlKind::Stop {
                        Phase::DiscardReport
                    } else {
                        Phase::Done
                    };
                }
                Phase::DiscardReport => {
                    if self.actor(core)?.agency.suspended_plan().is_none() {
                        self.phase = if self.kind == PlanControlKind::Stop {
                            Phase::EndLoose
                        } else {
                            Phase::Done
                        };
                        continue;
                    }
                    self.report(core, true)?;
                    self.phase = Phase::DiscardFinish;
                }
                Phase::DiscardFinish => {
                    let paused = self
                        .actor(core)?
                        .agency
                        .suspended_plan()
                        .ok_or(ExecutionError::Invariant)?;
                    self.reserve(paused.steps.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
                    let mut steps = paused.steps.clone();
                    for step in &mut steps {
                        if step.status == StepStatus::Queued {
                            step.status = StepStatus::Cancelled;
                            step.outcome = Some(self.message(&rules.discarded_paused, false)?);
                        }
                    }
                    self.archive(core, &steps)?;
                    *core.physical().suspended_plan_mut(&self.actor)? = Some(None);
                    core.physical().advance_agency_revision(&self.actor)?;
                    self.phase = if self.kind == PlanControlKind::Stop {
                        Phase::EndLoose
                    } else {
                        Phase::Done
                    };
                }
                Phase::EndLoose => {
                    let Some(action) = self.actor(core)?.action.as_ref() else {
                        self.phase = Phase::Done;
                        continue;
                    };
                    self.reserve(action.id.len())?;
                    let action = action.id.clone();
                    let result = self.message(
                        &installed.ordinary_actions.value().cancelled_replaced,
                        false,
                    )?;
                    if self.ending(core, &action, result, Destination::Loose)? {
                        return Ok(PlanControlProgress::Personal);
                    }
                }
                Phase::SuspendEnd => {
                    let prepared = super::prepare_suspension(core, &self.actor, &self.budget)?;
                    self.reservation.merge(prepared.storage)?;
                    if let Some(refusal) = prepared.outcome {
                        self.refused = Some(refusal);
                        self.phase = Phase::Done;
                        continue;
                    }
                    self.restart = prepared.restart;
                    let actor = self.actor(core)?;
                    if actor
                        .agency
                        .plan
                        .as_ref()
                        .is_none_or(|plan| plan.status != PlanStatus::Active)
                    {
                        self.phase = Phase::Done;
                        continue;
                    }
                    if let Some(action) = actor.action.as_ref() {
                        self.reserve(action.id.len())?;
                        let action = action.id.clone();
                        let index = self
                            .restart
                            .as_ref()
                            .map(|(i, _)| *i)
                            .ok_or(ExecutionError::Invariant)?;
                        let result = self.message(&rules.paused_step, false)?;
                        if self.ending(core, &action, result, Destination::Suspend(index))? {
                            return Ok(PlanControlProgress::Personal);
                        }
                    } else {
                        self.phase = Phase::SuspendRestart;
                    }
                }
                Phase::SuspendRestart => {
                    if let Some((index, restart)) = self.restart.take() {
                        let step = self
                            .actor(core)?
                            .agency
                            .plan
                            .as_ref()
                            .and_then(|plan| plan.steps.get(index))
                            .ok_or(ExecutionError::Invariant)?;
                        self.reserve(
                            step.heap_bytes()
                                .ok_or(ExecutionError::Capacity)?
                                .checked_mul(2)
                                .ok_or(ExecutionError::Capacity)?,
                        )?;
                        self.reserve(
                            step.command
                                .source_edit_heap_bound(restart.len())
                                .ok_or(ExecutionError::Capacity)?,
                        )?;
                        let mut archived = step.clone();
                        archived.status = StepStatus::Cancelled;
                        archived.outcome = Some(self.message(&rules.paused_restart, false)?);
                        let mut next = step.clone();
                        core.physical().reserve_plan_growth(
                            next.heap_bytes()
                                .and_then(|bytes| bytes.checked_add(restart.len().checked_mul(2)?))
                                .ok_or(ExecutionError::Capacity)?,
                        )?;
                        self.archive(core, std::slice::from_ref(&archived))?;
                        next.id = restart.clone();
                        next.command
                            .restart_id(restart)
                            .map_err(|_| ExecutionError::Invariant)?;
                        next.status = StepStatus::Queued;
                        next.action_id = None;
                        next.outcome = None;
                        next.result_evidence = None;
                        core.physical()
                            .plan_mut(&self.actor)?
                            .as_mut()
                            .ok_or(ExecutionError::Invariant)?
                            .steps[index] = next;
                    }
                    let mut physical = core.physical();
                    let plan = physical
                        .plan_mut(&self.actor)?
                        .as_mut()
                        .ok_or(ExecutionError::Invariant)?;
                    plan.revision = plan
                        .revision
                        .checked_add(1)
                        .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
                        .ok_or(ExecutionError::Invariant)?;
                    self.previous_revision = Some(plan.revision);
                    let plan = physical
                        .plan_mut(&self.actor)?
                        .take()
                        .ok_or(ExecutionError::Invariant)?;
                    *physical.suspended_plan_mut(&self.actor)? = Some(Some(plan));
                    physical.advance_agency_revision(&self.actor)?;
                    physical.advance_plan_generation(&self.actor)?;
                    self.phase = Phase::Done;
                }
                Phase::Done => return Ok(PlanControlProgress::Complete),
            }
        }
    }
}
