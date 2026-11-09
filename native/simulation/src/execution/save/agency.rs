//! At most one bounded frontier and its bounded plain history per changed actor.
//! Original placements remain with the ledger; no world diff selects these rows.
use super::*;
use crate::plans::{ActorPlan, PlanStep};

pub(super) fn encode(
    actor_id: &str,
    agency: &crate::state::ActorAgency,
    plan_before: Option<&Option<ActorPlan>>,
    history_before: Option<&Vec<PlanStep>>,
    goals_before: Option<&Vec<crate::state::Goal>>,
    intents_before: Option<&Vec<crate::plans::PendingIntent>>,
    ledger: &RecordLedger,
    output: &mut RowEncoder<'_>,
    budget: &ByteBudget,
) -> Result<(), RecordEncodingError> {
    let parent = ["world", "entities", actor_id, "actor", "agency"];
    let plan_path = ["world", "entities", actor_id, "actor", "agency", "plan"];
    if let Some(before) = goals_before {
        for prior in before {
            if !agency.goals.iter().any(|goal| goal.id == prior.id) {
                let path = [
                    "world", "entities", actor_id, "actor", "agency", "goals", &prior.id,
                ];
                let _guard = budget
                    .reserve(
                        crate::encoding::json_record_len(&path)
                            .map_err(|_| error())?
                            .checked_mul(2)
                            .ok_or_else(error)?,
                    )
                    .map_err(|_| error())?;
                output.delete(
                    "sim_goals",
                    &crate::encoding::json_record(&path).map_err(|_| error())?,
                    false,
                )?;
            }
        }
        for (index, goal) in agency.goals.iter().enumerate() {
            if before.get(index) == Some(goal) {
                continue;
            }
            let _slot = budget.reserve(32).map_err(|_| error())?;
            let slot = index.to_string();
            let address = SelectedPlacement::new(
                ledger,
                "sim_goals",
                &[
                    "world", "entities", actor_id, "actor", "agency", "goals", &goal.id,
                ],
                &parent,
                &slot,
                index as u64,
                !before.iter().any(|prior| prior.id == goal.id),
                budget,
            )?;
            output.write(
                "sim_goals",
                address.value(),
                goal,
                &[],
                address.create(),
                RowEffects::default(),
            )?;
        }
        observe(
            output,
            "sim_goals",
            &parent,
            true,
            agency.goals.len() as u64,
            budget,
        )?;
    }
    if let Some(before) = intents_before {
        for prior in before {
            if !agency.attempts.iter().any(|intent| intent.id == prior.id) {
                let path = [
                    "world", "entities", actor_id, "actor", "agency", "attempts", &prior.id,
                ];
                let _guard = budget
                    .reserve(
                        crate::encoding::json_record_len(&path)
                            .map_err(|_| error())?
                            .checked_mul(2)
                            .ok_or_else(error)?,
                    )
                    .map_err(|_| error())?;
                output.delete(
                    "sim_intentions",
                    &crate::encoding::json_record(&path).map_err(|_| error())?,
                    false,
                )?;
            }
        }
        for (index, intent) in agency.attempts.iter().enumerate() {
            if before.get(index) == Some(intent) {
                continue;
            }
            let _slot = budget.reserve(32).map_err(|_| error())?;
            let slot = index.to_string();
            let address = SelectedPlacement::new(
                ledger,
                "sim_intentions",
                &[
                    "world", "entities", actor_id, "actor", "agency", "attempts", &intent.id,
                ],
                &parent,
                &slot,
                index as u64,
                !before.iter().any(|prior| prior.id == intent.id),
                budget,
            )?;
            output.write(
                "sim_intentions",
                address.value(),
                intent,
                &[],
                address.create(),
                RowEffects::default(),
            )?;
        }
        observe(
            output,
            "sim_intentions",
            &parent,
            true,
            agency.attempts.len() as u64,
            budget,
        )?;
    }
    if let Some(before) = plan_before {
        if before.as_ref() != agency.plan.as_ref() {
            if let Some(plan) = &agency.plan {
                let address = SelectedPlacement::new(
                    ledger,
                    "sim_plans",
                    &plan_path,
                    &parent,
                    "plan",
                    0,
                    false,
                    budget,
                )?;
                // A structural plan slot can be deleted/recreated in an unsaved
                // suffix. Its accepted absence is not durable INSERT-only proof.
                output.write(
                    "sim_plans",
                    address.value(),
                    plan,
                    &[],
                    false,
                    RowEffects::default(),
                )?;
            } else {
                one(
                    ledger,
                    output,
                    "sim_plans",
                    &plan_path,
                    &parent,
                    "plan",
                    agency.plan.as_ref(),
                    budget,
                )?;
            }
        }
        observe(
            output,
            "sim_plans",
            &parent,
            agency.plan.is_some(),
            u64::from(agency.plan.is_some()),
            budget,
        )?;
        if let Some(after) = &agency.plan {
            let old = before
                .as_ref()
                .map(|plan| plan.steps.as_slice())
                .unwrap_or(&[]);
            for step in old {
                if !after.steps.iter().any(|next| next.id == step.id) {
                    let path = [
                        "world", "entities", actor_id, "actor", "agency", "plan", "steps", &step.id,
                    ];
                    let bytes = crate::encoding::json_record_len(&path).map_err(|_| error())?;
                    let _guard = budget
                        .reserve(bytes.checked_mul(2).ok_or_else(error)?)
                        .map_err(|_| error())?;
                    output.delete(
                        "sim_plan_steps",
                        &crate::encoding::json_record(&path).map_err(|_| error())?,
                        false,
                    )?;
                }
            }
            for (index, step) in after.steps.iter().enumerate() {
                if old
                    .iter()
                    .enumerate()
                    .any(|(at, prior)| at == index && same_step(prior, step))
                {
                    continue;
                }
                let _slot_guard = budget
                    .reserve(32 + size_of::<String>())
                    .map_err(|_| error())?;
                let slot = index.to_string();
                let address = SelectedPlacement::new(
                    ledger,
                    "sim_plan_steps",
                    &[
                        "world", "entities", actor_id, "actor", "agency", "plan", "steps", &step.id,
                    ],
                    &plan_path,
                    &slot,
                    index as u64,
                    before.is_none(),
                    budget,
                )?;
                output.write(
                    "sim_plan_steps",
                    address.value(),
                    step,
                    &[],
                    false,
                    RowEffects::default(),
                )?;
            }
            observe(
                output,
                "sim_plan_steps",
                &plan_path,
                true,
                after.steps.len() as u64,
                budget,
            )?;
        } else {
            // SQL cascade alone does not retire accepted placement metadata.
            // Enumerate this bounded frontier's actual children through the
            // same delete product. E3 includes the extra SQL work; a second
            // metadata-retirement protocol needs a demonstrated bottleneck.
            if let Some(before) = before {
                for step in &before.steps {
                    let path = [
                        "world", "entities", actor_id, "actor", "agency", "plan", "steps", &step.id,
                    ];
                    let bytes = crate::encoding::json_record_len(&path).map_err(|_| error())?;
                    let _guard = budget
                        .reserve(bytes.checked_mul(2).ok_or_else(error)?)
                        .map_err(|_| error())?;
                    output.delete(
                        "sim_plan_steps",
                        &crate::encoding::json_record(&path).map_err(|_| error())?,
                        false,
                    )?;
                }
            }
            observe(output, "sim_plan_steps", &plan_path, false, 0, budget)?;
        }
    }
    if let Some(before) = history_before {
        for (index, step) in agency.history.iter().enumerate() {
            if before
                .get(index)
                .is_some_and(|prior| same_step(prior, step))
            {
                continue;
            }
            let _slot_guard = budget
                .reserve(32 + size_of::<String>())
                .map_err(|_| error())?;
            let slot = index.to_string();
            let address = SelectedPlacement::new(
                ledger,
                "sim_plan_history",
                &[
                    "world", "entities", actor_id, "actor", "agency", "history", &slot,
                ],
                &parent,
                &slot,
                index as u64,
                false,
                budget,
            )?;
            output.write(
                "sim_plan_history",
                address.value(),
                step,
                &[],
                address.create(),
                RowEffects::default(),
            )?;
        }
        for index in agency.history.len()..before.len() {
            let _guard = budget
                .reserve(actor_id.len() * 2 + 256)
                .map_err(|_| error())?;
            let slot = index.to_string();
            let id = crate::encoding::json_record(&[
                "world", "entities", actor_id, "actor", "agency", "history", &slot,
            ])
            .map_err(|_| error())?;
            output.delete("sim_plan_history", &id, false)?;
        }
        observe(
            output,
            "sim_plan_history",
            &parent,
            true,
            agency.history.len() as u64,
            budget,
        )?;
    }
    Ok(())
}

// Field order is retained activity input: equal command meaning can still carry
// different Source learning order, so changed rows compare both owners.
fn same_step(a: &PlanStep, b: &PlanStep) -> bool {
    a == b && a.command.source_encoding() == b.command.source_encoding()
}
