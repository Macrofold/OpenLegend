//! Current intentions and work-handling facts, read through the same pause and
//! display owners used by command admission. These facts do not pause work.
use super::*;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct RemainingPlan {
    status: crate::plans::PlanStatus,
    paused: bool,
    views: Vec<crate::activity::ActivityView>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct NpcWorkContext {
    lost_work_seconds: f64,
    spent_inputs: Vec<crate::state::Yield>,
    has_plan: bool,
    combat_until: f64,
    evade_until: f64,
    suspension_problem: Option<Outcome>,
    plan: Option<RemainingPlan>,
    suspended: Option<RemainingPlan>,
    #[serde(skip)]
    storage: ByteReservation,
}
impl NpcWorkContext {
    pub(super) fn prepare(
        core: &CoreMutation<'_>,
        actor: &str,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let pause = crate::plans::prepare_suspension(core, actor, budget)?;
        let actor = core
            .state
            .physical
            .entities
            .get(actor)
            .and_then(|entity| entity.actor.as_ref())
            .ok_or(ExecutionError::MissingActor)?;
        if actor
            .action
            .as_ref()
            .is_some_and(|action| action.guard.is_some())
        {
            return Err(ExecutionError::UnsupportedFamily);
        }
        let mut bytes = actor
            .action
            .as_ref()
            .map_or(Some(0), |action| action.consumed.heap_bytes())
            .ok_or(ExecutionError::Capacity)?;
        for plan in actor
            .agency
            .plan
            .iter()
            .chain(actor.agency.suspended_plan())
        {
            if plan.activity.is_some() {
                return Err(ExecutionError::UnsupportedFamily);
            }
            bytes = bytes
                .checked_add(
                    plan.steps
                        .iter()
                        .filter(|step| {
                            matches!(
                                step.status,
                                crate::plans::StepStatus::Queued
                                    | crate::plans::StepStatus::Running
                            )
                        })
                        .count()
                        .checked_mul(size_of::<crate::activity::ActivityView>())
                        .ok_or(ExecutionError::Capacity)?,
                )
                .ok_or(ExecutionError::Capacity)?;
        }
        let mut storage = budget.reserve(bytes)?;
        storage.merge(pause.storage)?;
        let remaining = |plan: &crate::plans::ActorPlan, paused| RemainingPlan {
            status: plan.status,
            paused,
            views: Vec::with_capacity(
                plan.steps
                    .iter()
                    .filter(|step| {
                        matches!(
                            step.status,
                            crate::plans::StepStatus::Queued | crate::plans::StepStatus::Running
                        )
                    })
                    .count(),
            ),
        };
        Ok(Self {
            lost_work_seconds: actor
                .action
                .as_ref()
                .filter(|action| action.stage == "working")
                .map_or(0.0, |action| {
                    (action.total_seconds - action.remaining_seconds).max(0.0)
                }),
            spent_inputs: actor
                .action
                .as_ref()
                .map_or_else(Vec::new, |action| action.consumed.clone()),
            has_plan: actor.agency.plan.is_some(),
            // The selected physical installer refuses contact guards; ordinary
            // readiness still survives after its original action is gone.
            combat_until: actor.combat_ready_at.unwrap_or(0.0),
            evade_until: actor.evasion_ready_at.unwrap_or(0.0),
            suspension_problem: pause.outcome,
            plan: actor
                .agency
                .plan
                .as_ref()
                .map(|plan| remaining(plan, false)),
            suspended: actor
                .agency
                .suspended_plan()
                .map(|plan| remaining(plan, true)),
            storage,
        })
    }
}

impl NpcCandidateCursor {
    pub(super) fn begin_work_view(
        &mut self,
        core: &mut CoreMutation<'_>,
        paused: bool,
        index: usize,
    ) -> Result<bool, ExecutionError> {
        let actor = core
            .state
            .physical
            .entities
            .get(&self.actor)
            .and_then(|entity| entity.actor.as_ref())
            .ok_or(ExecutionError::MissingActor)?;
        let plan = if paused {
            actor.agency.suspended_plan()
        } else {
            actor.agency.plan.as_ref()
        };
        let Some(plan) = plan.filter(|plan| {
            !matches!(
                plan.status,
                crate::plans::PlanStatus::Completed | crate::plans::PlanStatus::Cancelled
            )
        }) else {
            return Ok(false);
        };
        let Some(step) = plan.steps.get(index) else {
            return Ok(false);
        };
        if matches!(
            step.status,
            crate::plans::StepStatus::Queued | crate::plans::StepStatus::Running
        ) {
            // Preparation clones only this actual selected command and funds
            // that clone before any target/name/display lookup.
            let _copy = self
                .budget
                .reserve(step.command.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
            let command = step.command.clone();
            self.plan_display = Some(ActivityDisplayCursor::prepare(
                core,
                &command,
                self.candidate,
                &self.budget,
            )?);
            self.plan_display_slot = Some((paused, index));
        }
        Ok(true)
    }
    pub(super) fn finish_work_view(
        &mut self,
        core: &CoreMutation<'_>,
        completed: CompletedActivityDisplay,
    ) -> Result<(), ExecutionError> {
        let (paused, index) = self
            .plan_display_slot
            .take()
            .ok_or(ExecutionError::InvalidCheckpoint)?;
        let actor = core
            .state
            .physical
            .entities
            .get(&self.actor)
            .and_then(|entity| entity.actor.as_ref())
            .ok_or(ExecutionError::MissingActor)?;
        let plan = if paused {
            actor.agency.suspended_plan()
        } else {
            actor.agency.plan.as_ref()
        }
        .ok_or(ExecutionError::InvalidCheckpoint)?;
        let command = &plan
            .steps
            .get(index)
            .ok_or(ExecutionError::InvalidCheckpoint)?
            .command;
        let (view, guard) = completed.into_view(command)?;
        let work = self
            .work_context
            .as_mut()
            .ok_or(ExecutionError::Invariant)?;
        work.storage.merge(guard)?;
        let plan = if paused {
            work.suspended.as_mut()
        } else {
            work.plan.as_mut()
        }
        .ok_or(ExecutionError::Invariant)?;
        if plan.views.len() == plan.views.capacity() {
            return Err(ExecutionError::Invariant);
        }
        plan.views.push(view);
        self.plan_display = None;
        Ok(())
    }
}
