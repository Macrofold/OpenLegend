//! Finite chosen movement uses one direct segment and the ordinary swept
//! movement owner. The installed body policy owns its reach and deadlines.

use crate::host::retained_size::HeapBytes;
use crate::install::VerifiedDefinition;
use crate::simulation::PhysicalState;
use crate::state::{Action, Entity};
use crate::values::DefinitionPin;
use serde::{Deserialize, Serialize};

const MINIMUM_DISTANCE: f64 = 1e-5;
pub(crate) const COORDINATE_EPSILON: f64 = 1e-8;

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Evasion {
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    pub source_life: u64,
    pub profile: DefinitionPin,
    pub started_at: f64,
    pub ends_at: f64,
    pub repeat_at: f64,
    pub speed: f64,
}

impl HeapBytes for Evasion {
    fn heap_bytes(&self) -> Option<usize> {
        self.profile.heap_bytes()
    }
}

pub(crate) fn profile<'a>(
    installed: &'a crate::simulation::InstalledWorld,
    entity: &Entity,
) -> Option<(&'a crate::body::EvasionPolicy, &'a DefinitionPin)> {
    let actor = entity.actor.as_ref()?;
    let body = actor.body.as_ref()?;
    let definition = installed.body_policy.as_ref()?;
    let profile = definition.value().evasion.as_ref()?;
    profile
        .body_plans
        .iter()
        .any(|plan| plan == &body.plan)
        .then_some((profile, definition.pin()))
}

pub(crate) fn legal_distance(distance: f64, maximum: f64) -> bool {
    distance.is_finite() && distance > MINIMUM_DISTANCE && distance <= maximum + COORDINATE_EPSILON
}

pub(crate) fn valid_saved(
    state: &PhysicalState,
    installed: &crate::simulation::InstalledWorld,
    entity: &Entity,
    action: &Action,
) -> bool {
    let (Some(evasion), Some(destination), Some((position, _)), Some((profile, pin))) = (
        action.evasion.as_ref(),
        action.destination.as_ref(),
        entity.world_support(),
        profile(installed, entity),
    ) else {
        return false;
    };
    let now = state.header.sim_time;
    let epsilon = installed.time_epsilon;
    let progress = crate::spatial::distance(position, destination.point());
    action.path.as_slice() == std::slice::from_ref(destination.physical())
        && action.navigation.is_none()
        && action.replans.is_none()
        && action.target_id.is_none()
        && action.native_locomotion.is_none()
        && entity.actively_participates()
        && entity.physical_life() == Some(evasion.source_life)
        && entity.actor.as_ref().is_some_and(|actor| {
            actor.alive && !actor.incapacitated && actor.evasion_ready_at == Some(evasion.repeat_at)
        })
        && evasion.profile == *pin
        && [
            evasion.started_at,
            evasion.ends_at,
            evasion.repeat_at,
            evasion.speed,
        ]
        .into_iter()
        .all(f64::is_finite)
        && evasion.started_at >= 0.0
        && evasion.started_at <= now
        && evasion.ends_at > now
        && (evasion.ends_at - (evasion.started_at + profile.seconds)).abs() <= epsilon
        && (evasion.repeat_at - (evasion.started_at + profile.repeat_seconds)).abs() <= epsilon
        && action.total_seconds == profile.seconds
        && (action.remaining_seconds - (evasion.ends_at - now)).abs() <= epsilon
        && legal_distance(evasion.speed * profile.seconds, profile.maximum_distance)
        && (progress - evasion.speed * action.remaining_seconds).abs() <= epsilon
}
