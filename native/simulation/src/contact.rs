//! Finite natural contact uses installed strike definitions and the common body
//! and occurrence owners. Selecting an intention does not grant an impact.
use crate::simulation::InstalledWorld;
use crate::state::{Action, Entity, EntityStore};
use crate::worlds::base_decision_offers::NativeStrikeRead;
use serde::{Deserialize, Serialize};
pub(crate) mod guard;
mod impact;
mod injury;
mod motion;
mod read;
pub(crate) mod review;
pub(crate) use impact::{ContactAnswer, ContactStep, ImpactCursor};
pub(crate) use injury::ContactInjury;
pub(crate) use motion::{StrikeMotion, StrikeRoute, StrikeRouteStep, reach};
pub(crate) use read::{ContactKind, ContactRead};
pub use review::{StrikePermission, StrikeReviewOffer};

pub(crate) fn stage_preparation(
    core: &mut crate::execution::CoreMutation<'_>,
    source: &str,
    budget: &crate::host::ByteBudget,
) -> Result<
    Option<(
        crate::execution::StagedOccurrence,
        crate::host::ByteReservation,
    )>,
    crate::execution::ExecutionError,
> {
    use crate::events::{AudienceSelection, EmissionText, EventEmissionIntent, EventScope};
    use crate::execution::ExecutionError;
    let body = core
        .state
        .physical
        .entities
        .get(source)
        .ok_or(ExecutionError::MissingActor)?;
    let action = body
        .actor
        .as_ref()
        .and_then(|actor| actor.action.as_ref())
        .ok_or(ExecutionError::Invariant)?;
    let installed = &core.state.installed;
    let hunt = body
        .animal
        .as_ref()
        .and_then(|animal| animal.foraging.as_ref())
        .and_then(|foraging| {
            installed
                .retained
                .foraging
                .profiles
                .get(&foraging.profile.id)
        })
        .and_then(|definition| definition.profile.hunt.as_ref());
    let chosen = body
        .actor
        .as_ref()
        .is_some_and(|actor| matches!(actor.controller.as_str(), "npc" | "player"));
    if chosen || hunt.is_some_and(|hunt| action.definition_id.as_deref() == Some(&hunt.strike_id)) {
        use crate::reception::EventScalar;
        let Some(cue) = installed
            .body_policy
            .as_ref()
            .and_then(|body| body.value().combat.as_ref())
            .and_then(|combat| combat.encounters.as_ref())
        else {
            // A chosen strike does not require the optional encounter system.
            return if chosen {
                Ok(None)
            } else {
                Err(ExecutionError::UnsupportedFamily)
            };
        };
        let target = action
            .target_id
            .as_deref()
            .ok_or(ExecutionError::Invariant)?;
        let event_type = &installed.ordinary_actions.value().action_started_event;
        let storage = budget.reserve(
            768 + 2 * (source.len() + target.len())
                + action.id.len()
                + event_type.len()
                + 2 * cue.preparing_strike.len(),
        )?;
        let event = EventEmissionIntent {
            event_type: event_type.clone(),
            text: EmissionText::Narration(
                crate::reception::combat_observation::preparation_narration(
                    source,
                    target,
                    &cue.preparing_strike,
                ),
            ),
            audience: AudienceSelection::Physical,
            source_id: Some(source.into()),
            target_id: Some(target.into()),
            data: Some(indexmap::IndexMap::from([
                (
                    "actionId".into(),
                    EventScalar::Text(action.id.clone().into()),
                ),
                ("actionType".into(), EventScalar::Text("strike".into())),
            ])),
            scope: EventScope::External,
            origin: None,
            exposure: None,
        };
        return Ok(Some((core.stage_event(event)?, storage)));
    }
    let text = body
        .threat
        .as_ref()
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
    Ok(Some((event, storage)))
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

/// Select an installed unarmed contact profile for its actual performer.
/// Autonomous controllers still require their explicitly granted profiles.
pub(crate) fn profile<'a>(
    installed: &'a InstalledWorld,
    source: &Entity,
    definition: &str,
) -> Option<&'a NativeStrikeRead> {
    let strike = installed.retained.native_strike_read.get(definition)?;
    let actor = source.actor.as_ref()?;
    let body = actor.body.as_ref()?;
    let granted = actor
        .natural_strike_ids
        .as_ref()
        .is_some_and(|ids| ids.contains(&strike.id));
    if motion::support_parts(source).is_none() || strike.weapon_item_id.is_some() {
        return None;
    }
    match actor.controller.as_str() {
        "native" => (granted
            && strike.required_body_plan.as_ref() == Some(&body.plan)
            && !strike.auto_move_to_range
            && strike.recovery_seconds.is_some())
        .then_some(strike),
        "npc" | "player" => {
            let ordinary = &installed
                .occurrence_rules
                .value()
                .response
                .offers
                .natural_strike_body_plans;
            ((granted || ordinary.contains(&body.plan))
                && strike
                    .required_body_plan
                    .as_ref()
                    .is_none_or(|plan| plan == &body.plan)
                && strike.preparation_motion.is_none())
            .then_some(strike)
        }
        _ => None,
    }
}

pub(crate) fn may_target(
    installed: &InstalledWorld,
    source: &Entity,
    target: &Entity,
    life: u64,
) -> bool {
    contact_permitted(installed, source, target, life)
        && (source
            .actor
            .as_ref()
            .is_some_and(|actor| actor.controller != "native")
            || target.animal.is_none()
            || source
                .animal
                .as_ref()
                .and_then(|animal| animal.foraging.as_ref())
                .and_then(|state| state.work.as_ref())
                .is_some_and(|work| {
                    work.kind == crate::native_response::ForagingWorkKind::Hunt
                        && work.target_id.as_deref() == Some(target.id.as_str())
                        && work.target_life == Some(life)
                }))
}

/// World policy authorizes the pair and its current life. The caller still
/// supplies a chosen or autonomous action and its observation proof.
pub(crate) fn contact_permitted(
    installed: &InstalledWorld,
    source: &Entity,
    target: &Entity,
    life: u64,
) -> bool {
    if source.id == target.id || !source.actively_participates() || !target.actively_participates()
    {
        return false;
    }
    let Some(source) = source.actor.as_ref().filter(|actor| {
        actor.alive
            && !actor.incapacitated
            && matches!(actor.controller.as_str(), "native" | "npc" | "player")
    }) else {
        return false;
    };
    target.actor.as_ref().is_some_and(|target| {
        target.alive
            && target.physical_life.unwrap_or(0) == life
            && installed
                .body_policy
                .as_ref()
                .and_then(|body| body.value().combat.as_ref())
                .is_some_and(|policy| {
                    policy.permits_target(&source.controller, &target.controller, false)
                })
    })
}

pub(crate) fn valid_action(
    installed: &InstalledWorld,
    entities: &EntityStore,
    source: &Entity,
    action: &Action,
    target: Option<&Entity>,
    now: f64,
) -> bool {
    use StrikePhase::*;
    let Some(definition) = ContactRead::action(installed, entities, source, action)
    else {
        return false;
    };
    let player = source
        .actor
        .as_ref()
        .is_some_and(|actor| actor.controller == "player");
    if action.requires_lethal_review != player.then_some(true)
        || action.lethal_permission.as_ref().is_some_and(|permission| {
            !player
                || !action
                    .target_id
                    .as_deref()
                    .zip(action.target_life)
                    .is_some_and(|(target, life)| permission.valid_for_action(source, target, life))
        })
    {
        return false;
    }
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
        || action.replans.is_some_and(|count| {
            !action.has_contact_approach() || count > installed.movement_settings.max_replans
        })
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
                        (definition.preparation_motion.is_some()
                            || (definition.auto_move_to_range && action.has_contact_approach()))
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
            action.total_seconds == definition.recovery_seconds.unwrap_or(0.0)
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
