//! Complete only a genuinely running frontier step after the common activity
//! result and resource-release boundary. No account is recreated from a pointer.
use super::*;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::retained_size::HeapBytes;
use crate::text::TextRef;

pub(crate) fn finish_plan_action(
    core: &mut CoreMutation<'_>,
    actor: &str,
    action: &str,
    result: Outcome,
    mut evidence: Option<ResultEvidence>,
) -> Result<(), ExecutionError> {
    let Some(plan) = core
        .state
        .physical
        .entities
        .get(actor)
        .and_then(|e| e.actor.as_ref())
        .and_then(|a| a.agency.plan.as_ref())
    else {
        return Ok(());
    };
    let Some(index) = plan.steps.iter().position(|step| {
        step.status == StepStatus::Running && step.action_id.as_deref() == Some(action)
    }) else {
        return Ok(());
    };
    if plan.activity.is_some() || plan.steps[index].activity_key.is_some() {
        return Err(ExecutionError::UnsupportedFamily);
    }
    if evidence.is_none()
        && core
            .state
            .activity
            .occurrence_for(actor, action)
            .map_err(ExecutionError::Activity)?
            .is_none()
    {
        let installed = core.state.installed.clone();
        let rules = &installed.ordinary_actions.value().plan;
        let command = &core
            .state
            .physical
            .entities
            .get(actor)
            .and_then(|e| e.actor.as_ref())
            .and_then(|a| a.agency.plan.as_ref())
            .ok_or(ExecutionError::Invariant)?
            .steps[index]
            .command;
        let purpose = command
            .envelope()
            .purpose
            .as_ref()
            .map(TextRef::Text)
            .unwrap_or(TextRef::Unicode(command.kind()));
        let fields = [
            ("purpose", purpose),
            (
                "status",
                TextRef::Unicode(if result.ok {
                    &rules.completed_result
                } else {
                    &rules.refused_result
                }),
            ),
            ("message", TextRef::Text(&result.message)),
            ("code", TextRef::Unicode(&result.code)),
        ];
        let budget = core.journal.byte_budget().clone();
        let _guard = budget.reserve(
            rules
                .text_bound(&rules.fallback_result_summary, &fields)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let summary = rules.text(&rules.fallback_result_summary, &fields);
        evidence = super::memory::append_report(core, actor, summary, rules.result_importance)?;
    }
    let growth = evidence
        .heap_bytes()
        .and_then(|bytes| bytes.checked_mul(2))
        .and_then(|bytes| bytes.checked_add(result.heap_bytes()?))
        .ok_or(ExecutionError::Capacity)?;
    core.physical().reserve_plan_growth(growth)?;
    {
        let mut physical = core.physical();
        physical
            .plan_mut(actor)?
            .as_mut()
            .and_then(|plan| plan.steps.get_mut(index))
            .ok_or(ExecutionError::Invariant)?
            .result_evidence = evidence.clone();
    }
    core.physical().set_result_evidence(actor, evidence)?;
    {
        let mut physical = core.physical();
        let plan = physical
            .plan_mut(actor)?
            .as_mut()
            .ok_or(ExecutionError::Invariant)?;
        let ok = result.ok;
        plan.steps[index].outcome = Some(result);
        plan.steps[index].status = if ok {
            StepStatus::Completed
        } else {
            StepStatus::Blocked
        };
        plan.status = if !ok {
            PlanStatus::Blocked
        } else if plan
            .steps
            .iter()
            .all(|step| matches!(step.status, StepStatus::Completed | StepStatus::Cancelled))
        {
            PlanStatus::Completed
        } else {
            PlanStatus::Active
        };
        plan.revision = plan
            .revision
            .checked_add(1)
            .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
            .ok_or(ExecutionError::Invariant)?;
    }
    core.physical().advance_agency_revision(actor)
}
