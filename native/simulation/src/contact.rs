//! Finite natural contact uses installed strike definitions and the common body
//! and occurrence owners. Selecting an intention does not grant an impact.
use crate::simulation::InstalledWorld;
use crate::state::{Action, Entity};
use crate::worlds::base_decision_offers::NativeStrikeRead;
use serde::{Deserialize, Serialize};
mod impact;
mod motion;
pub(crate) use impact::{ContactAnswer, ContactStep, ImpactCursor};
pub(crate) use motion::{StrikeMotion, StrikeRoute, StrikeRouteStep, reach};

pub(crate) fn stage_preparation(
    core: &mut crate::execution::CoreMutation<'_>,
    source: &str,
    budget: &crate::host::ByteBudget,
) -> Result<
    (
        crate::execution::StagedOccurrence,
        crate::host::ByteReservation,
    ),
    crate::execution::ExecutionError,
> {
    use crate::events::{AudienceSelection, EmissionText, EventEmissionIntent, EventScope};
    use crate::execution::ExecutionError;
    let text = core
        .state
        .physical
        .entities
        .get(source)
        .and_then(|entity| entity.threat.as_ref())
        .ok_or(ExecutionError::Invariant)?
        .windup_text();
    let storage =
        budget.reserve(text.storage_bytes() + source.len() + "attack-preparation".len())?;
    let event = core.stage_event(EventEmissionIntent {
        event_type: "attack-preparation".into(),
        text: EmissionText::Literal(text.clone()),
        audience: AudienceSelection::Physical,
        source_id: Some(source.into()),
        target_id: None,
        data: None,
        scope: EventScope::External,
        origin: None,
        exposure: None,
    })?;
    Ok((event, storage))
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum StrikePhase {
    Windup,
    Recovery,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum StrikeOutcome {
    Hit,
    Miss,
}

/// Only the selected automatic natural strike family. Everything this path
/// cannot honor still needs its own admission before it can execute.
pub(crate) fn profile<'a>(
    installed: &'a InstalledWorld,
    source: &Entity,
    definition: &str,
) -> Option<&'a NativeStrikeRead> {
    let strike = installed.retained.native_strike_read.get(definition)?;
    let actor = source.actor.as_ref()?;
    let body = actor.body.as_ref()?;
    (actor.controller == "native"
        && motion::support_parts(source).is_some()
        && actor.natural_strike_ids.as_ref()?.contains(&strike.id)
        && strike.required_body_plan.as_ref() == Some(&body.plan)
        && strike.weapon_item_id.is_none()
        && !strike.auto_move_to_range
        && strike.recovery_seconds.is_some())
    .then_some(strike)
}

pub(crate) fn may_target(
    installed: &InstalledWorld,
    source: &Entity,
    target: &Entity,
    life: u64,
) -> bool {
    source.id != target.id
        && source.actively_participates()
        && target.actively_participates()
        // Contact-triggered prey escape and territorial retaliation have a
        // separate receiving owner. Admit the real player/NPC consequence
        // while those active native-target consequences remain unsupported.
        && target.animal.is_none()
        && source.actor.as_ref().is_some_and(|actor| {
            actor.controller == "native" && actor.alive && !actor.incapacitated
        })
        && target.actor.as_ref().is_some_and(|actor| {
            actor.alive
                && actor.physical_life.unwrap_or(0) == life
                && installed
                    .body_policy
                    .as_ref()
                    .and_then(|body| body.value().combat.as_ref())
                    .is_some_and(|policy| policy.targets.native.contains(&actor.controller))
        })
}

pub(crate) fn valid_action(
    installed: &InstalledWorld,
    source: &Entity,
    action: &Action,
    target: Option<&Entity>,
    now: f64,
) -> bool {
    use StrikePhase::*;
    let Some(definition) = action
        .definition_id
        .as_deref()
        .and_then(|id| profile(installed, source, id))
    else {
        return false;
    };
    if (action.stage != "working" && !action.awaiting_moving_contact())
        || action
            .target_id
            .as_ref()
            .is_none_or(|id| id == &source.id || !crate::values::is_safe_record_id(id))
        || action.target_life.is_none()
        || action.definition_version != Some(definition.version)
        || action.has_unconverted_fields()
        || action.destination.is_some()
        || action.native_locomotion.is_some()
        || action.replans.is_some()
        || action.motion_sample_remaining_metres.is_some()
        || action.resource_definition.is_some()
        || action.attribute_id.is_some()
        || !action.consumed.is_empty()
        || !action.remaining_seconds.is_finite()
        || action.remaining_seconds < 0.0
        || action.remaining_seconds > action.total_seconds
    {
        return false;
    }
    match action.strike_phase {
        Some(Windup) => {
            action.total_seconds == definition.work_seconds
                && action.strike_outcome.is_none()
                && match (&action.strike_motion, action.awaiting_moving_contact()) {
                    (Some(motion), false) => {
                        motion.valid(installed, definition, now, action.remaining_seconds)
                            && target.and_then(Entity::physical_life) == action.target_life
                            && motion::valid_route(installed, action)
                    }
                    (None, true) => {
                        definition.preparation_motion.is_some()
                            && action.remaining_seconds == action.total_seconds
                            && target.and_then(Entity::physical_life) == action.target_life
                            && motion::valid_route(installed, action)
                    }
                    // Preserve stationary work for its ordinary refusal if its
                    // earlier target life ended; this action owns no pursuit.
                    (None, false) => {
                        definition.preparation_motion.is_none()
                            && action.path.is_empty()
                            && action.navigation.is_none()
                    }
                    _ => false,
                }
        }
        Some(Recovery) => {
            let deadline = source
                .actor
                .as_ref()
                .and_then(|actor| actor.combat_ready_at);
            Some(action.total_seconds) == definition.recovery_seconds
                && action.stage == "working"
                && action.strike_outcome.is_some()
                && action.strike_motion.is_none()
                && action.path.is_empty()
                && action.navigation.is_none()
                && deadline.is_some_and(|at| {
                    (action.remaining_seconds - (at - now).max(0.0)).abs() <= installed.time_epsilon
                })
        }
        None => false,
    }
}
