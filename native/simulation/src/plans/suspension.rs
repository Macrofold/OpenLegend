//! The pause boundary is shared by read-only choice admission and actual plan
//! interruption. Preparation issues no IDs, history, results or gameplay writes.
use super::*;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::{ByteBudget, ByteReservation};
use std::mem::size_of;

pub(crate) struct SuspensionPreparation {
    pub outcome: Option<Outcome>,
    pub restart: Option<(usize, String)>,
    pub storage: ByteReservation,
}
pub(crate) fn prepare_suspension(
    core: &CoreMutation<'_>,
    actor_id: &str,
    budget: &ByteBudget,
) -> Result<SuspensionPreparation, ExecutionError> {
    let actor = core
        .state
        .physical
        .entities
        .get(actor_id)
        .and_then(|entity| entity.actor.as_ref());
    let rules = &core.state.installed.ordinary_actions.value().plan;
    let running = actor
        .and_then(|actor| actor.agency.plan.as_ref())
        .and_then(|plan| {
            plan.steps
                .iter()
                .enumerate()
                .find(|(_, step)| step.status == StepStatus::Running)
        });
    let text = rules
        .actor_unavailable
        .message
        .len()
        .max(rules.not_chosen_plan.message.len())
        .max(rules.already_paused.message.len())
        .max(rules.pause_too_often.message.len())
        .max(rules.pause_state.len())
        .max(rules.pause_attack.len())
        .max(rules.pause_materials.len());
    let codes = rules
        .actor_unavailable
        .code
        .len()
        .max(rules.not_chosen_plan.code.len())
        .max(rules.already_paused.code.len())
        .max(rules.pause_too_often.code.len())
        .max("cannot-pause".len());
    let storage = budget.reserve(
        text.checked_mul(2)
            .and_then(|bytes| bytes.checked_add(codes))
            .and_then(|bytes| bytes.checked_add(running.map_or(0, |(_, step)| step.id.len())))
            .and_then(|bytes| bytes.checked_add(size_of::<SuspensionPreparation>() + 64))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let mut prepared = SuspensionPreparation {
        outcome: None,
        restart: None,
        storage,
    };
    let Some(actor) = actor else {
        prepared.outcome = Some(rules.actor_unavailable.outcome(false));
        return Ok(prepared);
    };
    let Some(plan) = actor
        .agency
        .plan
        .as_ref()
        .filter(|plan| plan.status == PlanStatus::Active)
    else {
        prepared.outcome = actor
            .action
            .as_ref()
            .map(|_| rules.not_chosen_plan.outcome(false));
        return Ok(prepared);
    };
    if actor.agency.suspended_plan().is_some() {
        prepared.outcome = Some(rules.already_paused.outcome(false));
        return Ok(prepared);
    }
    if actor.action.as_ref().is_some_and(|action| {
        running.and_then(|(_, step)| step.action_id.as_ref()) != Some(&action.id)
    }) {
        prepared.outcome = Some(rules.not_chosen_plan.outcome(false));
        return Ok(prepared);
    }
    if let Some(action) = &actor.action {
        let reason = if action.kind == "status-effect" {
            Some(rules.pause_state.as_str())
        } else if action.strike_phase.is_some() {
            Some(rules.pause_attack.as_str())
        } else if action.stage == "working" && !action.consumed.is_empty() {
            Some(rules.pause_materials.as_str())
        } else {
            None
        };
        if let Some(reason) = reason {
            prepared.outcome = Some(Outcome {
                ok: false,
                code: "cannot-pause".into(),
                message: reason.into(),
                spent: None,
                outputs: None,
                recipe_id: None,
                item_id: None,
                entity_id: None,
                goal_id: None,
                plan_id: None,
                action_id: None,
            });
            return Ok(prepared);
        }
        // No selected writer can create another action kind. Its unpausable
        // semantics must join this owner before that physical family admits.
        if action.kind != "move" || action.has_unconverted_fields() {
            return Err(ExecutionError::UnsupportedFamily);
        }
    }
    if let Some((index, step)) = running {
        let id = format!("{}:r{}", step.id, plan.revision);
        if !crate::values::is_safe_record_id(&id) {
            prepared.outcome = Some(rules.pause_too_often.outcome(false));
        } else {
            prepared.restart = Some((index, id));
        }
    }
    Ok(prepared)
}
