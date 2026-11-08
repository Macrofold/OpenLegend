//! Returning to a paused ordinary frontier preserves its real command bindings,
//! committed effects and personal reports. Retirement finishes before reinstall.
use super::*;
use crate::execution::{ActionWrite, CoreMutation, ExecutionError, PlanGenerationWrite};
use crate::experience::AcquiredActivityResult;
use crate::host::retained_size::HeapBytes;
use crate::host::{ByteBudget, ByteReservation};
use crate::text::TextRef;
use std::mem::size_of;

pub(crate) enum ResumeMode {
    Automatic,
    Choice { id: String, revision: u64 },
}
#[derive(Clone, Copy, PartialEq, Eq)]
enum Phase {
    Preflight,
    Intervention,
    Take,
    Retire,
    Install,
    Report,
    Done,
}
pub(super) enum ResumeProgress {
    Personal,
    Complete,
}
pub(crate) enum PlanResumeStep<'a> {
    Personal(&'a crate::activity::PendingActivityResult),
    Complete,
}
pub(crate) struct PlanResumeCursor {
    actor: String,
    mode: ResumeMode,
    phase: Phase,
    paused: Option<ActorPlan>,
    latest: u64,
    retire: Option<PlanControlCursor>,
    pending: Option<crate::activity::PendingActivityResult>,
    intervention: Option<String>,
    refused: Option<Outcome>,
    report_name: Option<crate::text::JsText>,
    report_reason: Option<Reason>,
    budget: ByteBudget,
    reservation: ByteReservation,
}
#[derive(Clone, Copy)]
enum Reason {
    Goal,
    Target,
}
impl PlanResumeCursor {
    pub(crate) fn new(
        actor: &str,
        mode: ResumeMode,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let bytes = size_of::<Self>()
            .checked_add(actor.len())
            .and_then(|n| {
                n.checked_add(match &mode {
                    ResumeMode::Choice { id, .. } => id.capacity(),
                    _ => 0,
                })
            })
            .ok_or(ExecutionError::Capacity)?;
        let reservation = budget.reserve(bytes)?;
        Ok(Self {
            actor: actor.into(),
            mode,
            phase: Phase::Preflight,
            paused: None,
            latest: 0,
            retire: None,
            pending: None,
            intervention: None,
            refused: None,
            report_name: None,
            report_reason: None,
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
    fn reason(&self, core: &CoreMutation<'_>, paused: &ActorPlan) -> Option<Reason> {
        if paused
            .goal_id
            .as_ref()
            .filter(|id| !id.is_empty())
            .is_some_and(|id| {
                !self.actor(core).is_ok_and(|a| {
                    a.agency
                        .goals
                        .iter()
                        .any(|g| g.id == *id && matches!(g.status.as_str(), "active" | "paused"))
                })
            })
        {
            return Some(Reason::Goal);
        }
        paused
            .steps
            .iter()
            .any(|step| {
                step.status == StepStatus::Queued
                    && !super::targets_current(core, &self.actor, step)
            })
            .then_some(Reason::Target)
    }
    fn refusal_for(
        &mut self,
        core: &CoreMutation<'_>,
        reason: Reason,
    ) -> Result<(), ExecutionError> {
        let rules = &core.state.installed.ordinary_actions.value().plan;
        let text = match reason {
            Reason::Goal => rules.inactive_goal_reason.as_str(),
            Reason::Target => rules.changed_target_reason.as_str(),
        };
        self.reserve(rules.resume_refused_prefix.len() + text.len() + size_of::<Outcome>() + 32)?;
        let mut message = rules.resume_refused_prefix.clone();
        message.push_str(text);
        let mut value = rules.stale_paused.outcome(false);
        value.code = "resume-refused".into();
        value.message = message.into();
        self.refused = Some(value);
        self.phase = Phase::Done;
        Ok(())
    }
    fn end_intervention(&mut self, core: &mut CoreMutation<'_>) -> Result<bool, ExecutionError> {
        let Some(action) = self.actor(core)?.action.as_ref() else {
            return Ok(false);
        };
        self.reserve(action.id.len())?;
        let action = action.id.clone();
        let installed = core.state.installed.clone();
        let rule = &installed
            .ordinary_actions
            .value()
            .plan
            .returned_from_intervention;
        self.reserve(rule.code.len() + rule.message.len() + size_of::<Outcome>())?;
        self.pending = core
            .journal
            .activity
            .prepare_end(
                &mut core.state.activity,
                &self.actor,
                &action,
                rule.outcome(false),
                core.state.physical.header.sim_time,
                &installed.ordinary_actions.value().before_attempt_facts,
            )
            .map_err(ExecutionError::Activity)?;
        self.intervention = Some(action);
        Ok(self.pending.is_some())
    }
    fn clear_intervention(&mut self, core: &mut CoreMutation<'_>) -> Result<(), ExecutionError> {
        if let Some(action) = self.intervention.take() {
            core.physical().release_work(&action)?;
            core.physical().replace_action(
                &self.actor,
                None,
                ActionWrite {
                    generation: PlanGenerationWrite::Preserve,
                    behavior: None,
                },
            )?;
        }
        self.phase = Phase::Take;
        Ok(())
    }
    pub(super) fn personal(
        &self,
    ) -> Result<&crate::activity::PendingActivityResult, ExecutionError> {
        if let Some(p) = &self.pending {
            Ok(p)
        } else {
            self.retire
                .as_ref()
                .ok_or(ExecutionError::Invariant)?
                .personal()
        }
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<AcquiredActivityResult>,
    ) -> Result<PlanResumeStep<'a>, ExecutionError> {
        Ok(match self.progress(core, answer)? {
            ResumeProgress::Personal => PlanResumeStep::Personal(self.personal()?),
            ResumeProgress::Complete => PlanResumeStep::Complete,
        })
    }
    pub(super) fn progress(
        &mut self,
        core: &mut CoreMutation<'_>,
        mut answer: Option<AcquiredActivityResult>,
    ) -> Result<ResumeProgress, ExecutionError> {
        if self.pending.is_some() {
            let Some(acquired) = answer.take() else {
                return Ok(ResumeProgress::Personal);
            };
            let pending = self.pending.take().ok_or(ExecutionError::Invariant)?;
            core.complete_activity_result(pending, &acquired)?;
            self.clear_intervention(core)?;
        }
        if answer.is_some() && self.phase != Phase::Retire {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        loop {
            match self.phase {
                Phase::Preflight => {
                    let actor = self.actor(core)?;
                    if matches!(self.mode, ResumeMode::Automatic)
                        && (actor.action.is_some()
                            || actor
                                .agency
                                .plan
                                .as_ref()
                                .is_some_and(|p| p.status == PlanStatus::Active))
                    {
                        self.phase = Phase::Done;
                        continue;
                    }
                    let Some(paused) = actor.agency.suspended_plan() else {
                        if matches!(self.mode, ResumeMode::Choice { .. }) {
                            let rule = &core
                                .state
                                .installed
                                .ordinary_actions
                                .value()
                                .plan
                                .stale_paused;
                            self.reserve(
                                rule.code.len() + rule.message.len() + size_of::<Outcome>(),
                            )?;
                            self.refused = Some(rule.outcome(false));
                        }
                        self.phase = Phase::Done;
                        continue;
                    };
                    if paused.activity.is_some()
                        || paused.steps.iter().any(|s| s.activity_key.is_some())
                    {
                        return Err(ExecutionError::UnsupportedFamily);
                    }
                    if let ResumeMode::Choice { id, revision } = &self.mode {
                        if paused.id != *id || paused.revision != *revision {
                            let rule = &core
                                .state
                                .installed
                                .ordinary_actions
                                .value()
                                .plan
                                .stale_paused;
                            self.reserve(
                                rule.code.len() + rule.message.len() + size_of::<Outcome>(),
                            )?;
                            self.refused = Some(rule.outcome(false));
                            self.phase = Phase::Done;
                            continue;
                        }
                        if let Some(reason) = self.reason(core, paused) {
                            self.refusal_for(core, reason)?;
                            continue;
                        }
                    }
                    self.phase = Phase::Intervention;
                }
                Phase::Intervention => {
                    if matches!(self.mode, ResumeMode::Choice { .. })
                        && self.end_intervention(core)?
                    {
                        return Ok(ResumeProgress::Personal);
                    }
                    self.clear_intervention(core)?;
                }
                Phase::Take => {
                    let actor = self.actor(core)?;
                    let paused = actor
                        .agency
                        .suspended_plan()
                        .ok_or(ExecutionError::Invariant)?;
                    self.latest = paused
                        .revision
                        .max(actor.agency.plan.as_ref().map_or(0, |p| p.revision));
                    self.paused = core
                        .physical()
                        .suspended_plan_mut(&self.actor)?
                        .replace(None)
                        .ok_or(ExecutionError::Invariant)?;
                    if self.actor(core)?.agency.plan.is_some() {
                        self.retire = Some(PlanControlCursor::new(
                            &self.actor,
                            PlanControlKind::Retire,
                            &self.budget,
                        )?);
                        self.phase = Phase::Retire;
                        continue;
                    }
                    self.phase = Phase::Install;
                }
                Phase::Retire => {
                    match self
                        .retire
                        .as_mut()
                        .ok_or(ExecutionError::Invariant)?
                        .progress(core, answer.take())?
                    {
                        PlanControlProgress::Personal => {
                            return Ok(ResumeProgress::Personal);
                        }
                        PlanControlProgress::Complete => {
                            self.retire = None;
                            self.phase = Phase::Install;
                        }
                    }
                }
                Phase::Install => {
                    let reason =
                        self.reason(core, self.paused.as_ref().ok_or(ExecutionError::Invariant)?);
                    let installed = core.state.installed.clone();
                    let rules = &installed.ordinary_actions.value().plan;
                    let name_bytes = self
                        .paused
                        .as_ref()
                        .ok_or(ExecutionError::Invariant)?
                        .steps
                        .iter()
                        .find(|s| s.status == StepStatus::Queued)
                        .and_then(|s| s.command.envelope().purpose.as_ref())
                        .map_or(Some(rules.paused_work_name.len()), HeapBytes::heap_bytes)
                        .ok_or(ExecutionError::Capacity)?;
                    self.reserve(name_bytes)?;
                    self.report_name = Some(
                        self.paused
                            .as_ref()
                            .ok_or(ExecutionError::Invariant)?
                            .steps
                            .iter()
                            .find(|s| s.status == StepStatus::Queued)
                            .and_then(|s| s.command.envelope().purpose.as_ref())
                            .cloned()
                            .unwrap_or_else(|| rules.paused_work_name.clone().into()),
                    );
                    self.report_reason = reason;
                    if let Some(reason) = reason {
                        let paused = self.paused.as_ref().ok_or(ExecutionError::Invariant)?;
                        let index = if matches!(reason, Reason::Target) {
                            paused.steps.iter().position(|s| {
                                s.status == StepStatus::Queued
                                    && !super::targets_current(core, &self.actor, s)
                            })
                        } else {
                            None
                        }
                        .or_else(|| {
                            paused
                                .steps
                                .iter()
                                .position(|s| s.status == StepStatus::Queued)
                        });
                        if let Some(index) = index {
                            let reason = match reason {
                                Reason::Goal => rules.inactive_goal_reason.as_str(),
                                Reason::Target => rules.changed_target_reason.as_str(),
                            };
                            let bytes = rules.resume_refused_prefix.len()
                                + reason.len()
                                + size_of::<Outcome>()
                                + 32;
                            core.physical().reserve_plan_growth(bytes)?;
                            let mut message = rules.resume_refused_prefix.clone();
                            message.push_str(reason);
                            let mut result = rules.stale_paused.outcome(false);
                            result.code = "resume-refused".into();
                            result.message = message.into();
                            let step =
                                &mut self.paused.as_mut().ok_or(ExecutionError::Invariant)?.steps
                                    [index];
                            step.status = StepStatus::Blocked;
                            step.outcome = Some(result);
                        }
                    }
                    let mut paused = self.paused.take().ok_or(ExecutionError::Invariant)?;
                    paused.status = if reason.is_some() {
                        PlanStatus::Blocked
                    } else {
                        PlanStatus::Active
                    };
                    paused.revision = self
                        .latest
                        .checked_add(1)
                        .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
                        .ok_or(ExecutionError::Invariant)?;
                    *core.physical().plan_mut(&self.actor)? = Some(paused);
                    core.physical().advance_agency_revision(&self.actor)?;
                    core.physical().advance_plan_generation(&self.actor)?;
                    self.phase = Phase::Report;
                }
                Phase::Report => {
                    let installed = core.state.installed.clone();
                    let rules = &installed.ordinary_actions.value().plan;
                    let name =
                        TextRef::Text(self.report_name.as_ref().ok_or(ExecutionError::Invariant)?);
                    let reason = self.report_reason;
                    let reason_text = reason.map(|r| match r {
                        Reason::Goal => rules.inactive_goal_reason.as_str(),
                        Reason::Target => rules.changed_target_reason.as_str(),
                    });
                    let fields = [
                        ("name", name),
                        ("reason", TextRef::Unicode(reason_text.unwrap_or(""))),
                    ];
                    let template = if reason.is_some() {
                        &rules.resume_blocked
                    } else {
                        &rules.resumed
                    };
                    let _text_guard = self.budget.reserve(
                        rules
                            .text_bound(template, &fields)
                            .ok_or(ExecutionError::Capacity)?,
                    )?;
                    let suffix = rules.text(template, &fields);
                    let (summary, _guard) =
                        super::memory::personal_possessive(&self.actor, suffix, &self.budget)?;
                    let evidence = super::memory::append_report(
                        core,
                        &self.actor,
                        summary,
                        rules.control_importance,
                    )?;
                    core.physical().reserve_plan_growth(
                        evidence
                            .heap_bytes()
                            .and_then(|n| n.checked_mul(2))
                            .ok_or(ExecutionError::Capacity)?,
                    )?;
                    core.physical()
                        .plan_mut(&self.actor)?
                        .as_mut()
                        .ok_or(ExecutionError::Invariant)?
                        .result_evidence = evidence.clone();
                    core.physical().set_result_evidence(&self.actor, evidence)?;
                    self.phase = Phase::Done;
                }
                Phase::Done => return Ok(ResumeProgress::Complete),
            }
        }
    }
}
