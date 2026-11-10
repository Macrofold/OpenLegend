//! Current-format ordinary frontiers use the same finite bounds and reference
//! rules as Source validateAgency. Activity graphs remain a separate family.
use super::*;
use crate::install::InstallError;
use crate::values::is_safe_record_id;

/// Discovery also describes current syntax with no selected physical executor.
/// A prepared option is not an executable frontier or a permission to queue it.
pub(crate) fn valid_choice_command(
    command: &NativeCommand,
    world: &crate::simulation::InstalledWorld,
) -> bool {
    match command {
        NativeCommand::Follow {
            target_id,
            distance,
            ..
        } => {
            let rules = &world.occurrence_rules.value().response.offers.follow;
            is_safe_record_id(target_id)
                && distance.is_none_or(|n| {
                    n.is_finite()
                        && n > 0.
                        && n >= rules.minimum_distance
                        && n <= rules.maximum_distance
                })
        }
        NativeCommand::Strike {
            target_id,
            definition_id,
            weapon_item_id,
            ..
        } => {
            is_safe_record_id(target_id)
                && is_safe_record_id(definition_id)
                && weapon_item_id.as_deref().is_none_or(is_safe_record_id)
        }
        NativeCommand::InspectInventory { .. } => true,
        NativeCommand::InspectActivities {
            history_after,
            method_after,
            ..
        } => {
            *history_after >= -1
                && *history_after <= crate::identity::MAX_SAFE_INTEGER as i64
                && *method_after <= crate::identity::MAX_SAFE_INTEGER
        }
        _ => valid_command(
            command,
            world.speech_action.value(),
            world.acoustics.value(),
        ),
    }
}

pub(crate) fn valid_command(
    command: &NativeCommand,
    speech: &crate::worlds::InstalledSpeechAction,
    acoustics: &crate::reception::AcousticPolicy,
) -> bool {
    if command
        .envelope()
        .cooperation
        .as_ref()
        .is_some_and(|b| b.revision == 0)
    {
        return false;
    }
    match command {
        NativeCommand::Move { destination, .. } => {
            [destination.x, destination.y, destination.z]
                .iter()
                .all(|n| n.is_finite())
                && is_safe_record_id(&destination.surface_id)
        }
        NativeCommand::StatusEffect {
            target_id,
            definition_id,
            ..
        } => is_safe_record_id(target_id) && is_safe_record_id(definition_id),
        NativeCommand::Say {
            text,
            target_id,
            volume,
            ..
        } => {
            !text.trim_is_empty()
                && (text.units_len() as u64) <= speech.maximum_characters
                && target_id.as_ref().is_none_or(|id| is_safe_record_id(id))
                && volume
                    .as_ref()
                    .is_none_or(|v| acoustics.volume(v).is_some())
        }
        NativeCommand::Cancel { .. }
        | NativeCommand::WithdrawAttempt { .. }
        | NativeCommand::Follow { .. }
        | NativeCommand::Strike { .. }
        | NativeCommand::InspectInventory { .. }
        | NativeCommand::InspectActivities { .. } => false,
    }
}
fn valid_evidence(value: Option<&ResultEvidence>, actor: &str) -> bool {
    value.is_none_or(|value| value.validate(actor).is_ok())
}
fn step(
    step: &PlanStep,
    actor: &str,
    world: &crate::simulation::InstalledWorld,
) -> Result<(), InstallError> {
    if step.activity_key.is_some() {
        return Err(InstallError::UnsupportedFamily("activity graph plan step"));
    }
    if !is_safe_record_id(&step.id)
        || step.command.envelope().id != step.id
        || step.command.envelope().actor_id != actor
        || !valid_command(
            &step.command,
            world.speech_action.value(),
            world.acoustics.value(),
        )
        || !valid_evidence(step.result_evidence.as_ref(), actor)
        || (step.status == StepStatus::Running
            && !step
                .action_id
                .as_ref()
                .is_some_and(|id| is_safe_record_id(id)))
        || (matches!(
            step.status,
            StepStatus::Completed | StepStatus::Blocked | StepStatus::Cancelled
        ) && step.outcome.is_none())
        || step.target_episodes.as_ref().is_some_and(|episodes| {
            episodes.len() > 16
                || episodes.iter().any(|(id, episode)| {
                    !is_safe_record_id(id)
                        || episode.as_ref().is_some_and(|e| !is_safe_record_id(e))
                })
        })
    {
        return Err(InstallError::CurrentFormat);
    }
    // These reference-bearing consent families have no admitted selected writer.
    // Refuse their actual data before any command can treat them as authorization.
    if step.command.envelope().cooperation.is_some()
        || step.command.envelope().combat_help_id.is_some()
    {
        return Err(InstallError::UnsupportedFamily(
            "plan cooperation or combat consent",
        ));
    }
    if matches!(&step.command,NativeCommand::StatusEffect{resting_place_id,resting_bay,..}if resting_place_id.is_some()||resting_bay.is_some())
    {
        return Err(InstallError::UnsupportedFamily("rest-place plan binding"));
    }
    Ok(())
}
pub(crate) fn validate_installation(
    physical: &crate::simulation::PhysicalState,
    world: &crate::simulation::InstalledWorld,
) -> Result<(), InstallError> {
    for id in physical.entities.ordered_ids() {
        let actor = physical
            .entities
            .get(id)
            .and_then(|e| e.actor.as_ref())
            .ok_or(InstallError::CurrentFormat)?;
        let agency = &actor.agency;
        let limits = &world.agency_limits;
        attempts::validate_installed(&agency.attempts, limits)?;
        if !valid_evidence(agency.last_result_evidence.as_ref(), id)
            || agency.goals.len() as u64
                > limits
                    .goals
                    .checked_add(limits.goal_history)
                    .ok_or(InstallError::CurrentFormat)?
            || agency.history.len() as u64 > limits.history
        {
            return Err(InstallError::CurrentFormat);
        }
        if agency
            .goals
            .iter()
            .filter(|g| matches!(g.status.as_str(), "active" | "paused"))
            .count() as u64
            > limits.goals
        {
            return Err(InstallError::CurrentFormat);
        }
        for (index, goal) in agency.goals.iter().enumerate() {
            if !is_safe_record_id(&goal.id)
                || agency.goals[..index].iter().any(|g| g.id == goal.id)
                || goal.objective.trim_is_empty()
                || goal.objective.units_len() > 500
                || !matches!(
                    goal.status.as_str(),
                    "active" | "paused" | "completed" | "abandoned"
                )
                || !matches!(goal.author.as_str(), "creator" | "actor" | "player" | "god")
                || !is_safe_record_id(&goal.source_id)
                || goal
                    .parent_id
                    .as_ref()
                    .is_some_and(|id| !is_safe_record_id(id))
                || goal
                    .completion
                    .as_ref()
                    .is_some_and(|c| c != "actor-declared")
            {
                return Err(InstallError::CurrentFormat);
            }
            let mut parent = goal.parent_id.as_deref();
            let mut depth = 0;
            while let Some(parent_id) = parent {
                depth += 1;
                if parent_id == goal.id || depth > agency.goals.len() {
                    return Err(InstallError::CurrentFormat);
                }
                let parent_goal = agency
                    .goals
                    .iter()
                    .find(|g| g.id == parent_id)
                    .ok_or(InstallError::CurrentFormat)?;
                parent = parent_goal.parent_id.as_deref();
            }
        }
        if let Some(places) = &agency.places {
            if places.len() as u64 > limits.places {
                return Err(InstallError::CurrentFormat);
            }
            for (index, place) in places.iter().enumerate() {
                if !is_safe_record_id(&place.subject_id)
                    || places[..index]
                        .iter()
                        .any(|p| p.subject_id == place.subject_id)
                    || place.label.trim_is_empty()
                    || place.label.units_len() > 120
                    || place
                        .episode
                        .as_ref()
                        .is_some_and(|id| !is_safe_record_id(id))
                    || ![place.point.x, place.point.y, place.point.z, place.at]
                        .iter()
                        .all(|n| n.is_finite())
                    || !is_safe_record_id(&place.point.surface_id)
                {
                    return Err(InstallError::CurrentFormat);
                }
            }
        }
        if agency.suspended_plan().is_some_and(|p| {
            p.status != PlanStatus::Active
                || p.steps.iter().any(|s| s.status == StepStatus::Running)
        }) {
            return Err(InstallError::CurrentFormat);
        }
        for plan in [agency.plan.as_ref(), agency.suspended_plan()]
            .into_iter()
            .flatten()
        {
            if plan.activity.is_some() {
                return Err(InstallError::UnsupportedFamily("chosen activity graph"));
            }
            if !is_safe_record_id(&plan.id)
                || plan.revision == 0
                || !valid_evidence(plan.result_evidence.as_ref(), id)
                || plan.steps.is_empty()
                || plan.steps.len() as u64 > limits.steps
                || plan.goal_id.as_ref().is_some_and(|goal| {
                    !goal.is_empty() && !agency.goals.iter().any(|g| g.id == *goal)
                })
                || plan
                    .steps
                    .iter()
                    .filter(|s| s.status == StepStatus::Running)
                    .count()
                    > 1
            {
                return Err(InstallError::CurrentFormat);
            }
            for (index, entry) in plan.steps.iter().enumerate() {
                if plan.steps[..index].iter().any(|s| s.id == entry.id) {
                    return Err(InstallError::CurrentFormat);
                }
                step(entry, id, world)?;
            }
        }
        for entry in &agency.history {
            step(entry, id, world)?;
        }
    }
    Ok(())
}
