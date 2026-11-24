//! Current intentions and work-handling facts, read through the same pause and
//! display owners used by command admission. These facts do not pause work.
use super::*;
use crate::text::JsText;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct RemainingPlan {
    status: crate::plans::PlanStatus,
    paused: bool,
    views: Vec<crate::activity::ActivityView>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct NpcWorkContext {
    lost_work_seconds: f64,
    spent_inputs: Vec<crate::state::Yield>,
    has_plan: bool,
    combat_until: f64,
    evade_until: f64,
    suspension_problem: Option<Outcome>,
    plan: Option<RemainingPlan>,
    suspended: Option<RemainingPlan>,
    #[serde(skip)]
    learned_sources: [Option<crate::activity::LearnedSequenceSource>; 2],
    #[serde(skip)]
    storage: ByteReservation,
}
impl NpcWorkContext {
    pub(crate) fn remaining_views(&self, paused: bool) -> Option<&[crate::activity::ActivityView]> {
        let plan = if paused { &self.suspended } else { &self.plan };
        plan.as_ref().map(|plan| plan.views.as_slice())
    }

    pub(crate) fn learned_sources(
        &self,
    ) -> impl Iterator<Item = &crate::activity::LearnedSequenceSource> {
        self.learned_sources.iter().flatten()
    }

    pub(super) fn prepare(
        core: &CoreMutation<'_>,
        actor: &str,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let pause = crate::plans::prepare_suspension(core, actor, budget)?;
        let actor_id = actor;
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
            if let Some(activity) = &plan.activity {
                if activity.method_id.is_none() {
                    return Err(ExecutionError::UnsupportedFamily);
                }
                crate::plans::require_supported_activity(plan)?;
                // This method's existing and still unbound speech are funded
                // together by the activity view below.
                continue;
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
        let ordinary = |plan: &crate::plans::ActorPlan, paused| RemainingPlan {
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
        let mut remaining =
            |plan: Option<&crate::plans::ActorPlan>, paused| -> Result<_, ExecutionError> {
                let Some(plan) = plan else {
                    return Ok((None, None));
                };
                let Some(execution) = &plan.activity else {
                    return Ok((Some(ordinary(plan, paused)), None));
                };
                let mut facts = RemainingPlan {
                    status: plan.status,
                    paused,
                    views: Vec::new(),
                };
                if matches!(
                    plan.status,
                    crate::plans::PlanStatus::Completed | crate::plans::PlanStatus::Cancelled
                ) {
                    return Ok((Some(facts), None));
                }
                let id = execution
                    .method_id
                    .as_deref()
                    .ok_or(ExecutionError::Invariant)?;
                let Some(method) =
                    crate::activity::current_learned_sequence(core.state, actor_id, id, budget)?
                        .filter(|method| method.permits_bindings(&execution.bindings))
                else {
                    // Withheld source text cannot pass as an anonymous quotation.
                    // The admitted plan status still reflects current work.
                    return Ok((Some(facts), None));
                };
                let queued = plan.steps.iter().filter(|step| {
                    matches!(
                        step.status,
                        crate::plans::StepStatus::Queued | crate::plans::StepStatus::Running
                    )
                });
                let count = queued
                    .clone()
                    .count()
                    .checked_add(execution.pending.len())
                    .ok_or(ExecutionError::Capacity)?;
                storage.merge(
                    budget.reserve(
                        count
                            .checked_mul(size_of::<crate::activity::ActivityView>())
                            .ok_or(ExecutionError::Capacity)?,
                    )?,
                )?;
                facts
                    .views
                    .try_reserve_exact(count)
                    .map_err(|_| ExecutionError::Capacity)?;
                let mut detail = |name: &JsText, words: Option<&JsText>| -> Result<(), ExecutionError> {
                    let bytes = words
                        .map_or(0, JsText::storage_bytes)
                        .checked_add(name.storage_bytes())
                        .and_then(|n| n.checked_mul(8))
                        .and_then(|n| n.checked_add(4096))
                        .ok_or(ExecutionError::Capacity)?;
                    let mut owned = budget.reserve(bytes)?;
                    let view = if let Some(words) = words {
                        crate::activity::learned_speech_view(core.state, name, words)?
                    } else {
                        crate::activity::ActivityView {
                            name: name.clone(), facts: Vec::new(), actor: None, target: None,
                            tool: None, children: None, result: None,
                        }
                    };
                    owned.resize(view.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
                    storage.merge(owned)?;
                    facts.views.push(view);
                    Ok(())
                };
                for step in queued {
                    let command = &step.command;
                    if !command.is_learned_leaf() {
                        return Err(ExecutionError::Invariant);
                    }
                    let name = command.envelope().purpose.as_ref().ok_or(ExecutionError::Invariant)?;
                    detail(name, command.learned_speech_fields().map(|(_, words)| words))?;
                }
                for frame in execution.pending.iter().rev() {
                    let leaf = method.leaf(&frame.node, &execution.bindings, &core.state.installed)
                        .ok_or(ExecutionError::Invariant)?;
                    let words = match &leaf {
                        crate::activity::LearnedLeaf::Speech(step) => Some(step.text),
                        _ => None,
                    };
                    detail(leaf.purpose(), words)?;
                }
                Ok((
                    Some(facts),
                    (count > 0)
                        .then(|| method.hold_source(budget))
                        .transpose()?,
                ))
            };
        let (plan, current_source) = remaining(actor.agency.plan.as_ref(), false)?;
        let (suspended, paused_source) = remaining(actor.agency.suspended_plan(), true)?;
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
            // Committed readiness survives after its original action is gone.
            combat_until: actor.combat_ready_at.unwrap_or(0.0),
            evade_until: actor.evasion_ready_at.unwrap_or(0.0),
            suspension_problem: pause.outcome,
            plan,
            suspended,
            learned_sources: [current_source, paused_source],
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
        if plan
            .activity
            .as_ref()
            .is_some_and(|activity| activity.method_id.is_some())
        {
            return Ok(false); // Prepared above with its matching personal source.
        }
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
