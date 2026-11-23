//! Resolves the selected finite shield against a hit. The current
//! defender's action supplies binding and timing, the caller supplies contact.
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::retained_size::heap_record;
use crate::simulation::{InstalledWorld, PhysicalState};
use crate::state::{Action, Entity, Point};
use crate::values::{DefinitionPin, deserialize_present_option, deserialize_safe_integer};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct DefenseProfile {
    pub reduction: f64,
    pub(crate) coverage_degrees: f64,
    pub preparation_seconds: f64,
    pub ready_seconds: f64,
    pub recovery_seconds: f64,
    pub label: String,
    pub preparing_label: String,
    pub ready_label: String,
    pub recovery_label: String,
}

impl DefenseProfile {
    pub(crate) fn phase_label(&self, phase: GuardPhase) -> &str {
        match phase {
            GuardPhase::Preparing => &self.preparing_label,
            GuardPhase::Ready => &self.ready_label,
            GuardPhase::Recovery => &self.recovery_label,
        }
    }

    pub(crate) fn valid(&self) -> bool {
        self.reduction > 0.0
            && self.reduction < 1.0
            && self.coverage_degrees > 0.0
            && self.coverage_degrees <= 360.0
            && [
                self.preparation_seconds,
                self.ready_seconds,
                self.recovery_seconds,
            ]
            .into_iter()
            .all(|time| time.is_finite() && time > 0.0)
            && [
                &self.label,
                &self.preparing_label,
                &self.ready_label,
                &self.recovery_label,
            ]
            .into_iter()
            .all(|text| !text.trim().is_empty() && text.encode_utf16().count() <= 200)
    }

    fn covers(&self, facing: f64, direction: Point) -> bool {
        let length = direction.x.hypot(direction.z);
        length > 1e-8
            && (direction.x * facing.sin() + direction.z * facing.cos()) / length
                >= (self.coverage_degrees.to_radians() * 0.5).cos()
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum GuardPhase {
    Preparing,
    Ready,
    Recovery,
}

#[derive(Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Guard {
    pub phase: GuardPhase,
    pub profile: DefinitionPin,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub physical_life: u64,
    pub facing: f64,
    pub ready_at: f64,
    pub expires_at: f64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub recovery_until: Option<f64>,
}

impl Guard {
    pub(crate) fn deadline(&self) -> f64 {
        match self.phase {
            GuardPhase::Preparing => self.ready_at,
            GuardPhase::Ready => self.expires_at,
            GuardPhase::Recovery => self.recovery_until.unwrap_or(self.expires_at),
        }
    }
}

#[derive(Clone, Copy)]
pub(crate) struct Defense {
    pub prevented: f64,
    pub injury: f64,
}

pub(crate) fn current_profile<'a>(
    physical: &PhysicalState,
    installed: &'a InstalledWorld,
    defender: &Entity,
    action: &Action,
) -> Option<&'a DefenseProfile> {
    let guard = action.guard.as_ref()?;
    if !action.is_guard()
        || !defender.actively_participates()
        || defender.physical_life() != Some(guard.physical_life)
        || defender.spatial.heading != guard.facing
    {
        return None;
    }
    let item = action.item_id.as_deref()?;
    let lot =
        crate::install::owned_by(physical, &installed.retained, &defender.id, item).ok()??;
    installed
        .retained
        .items
        .get(lot.definition_id)
        .filter(|definition| {
            lot.equipped && definition.pin == guard.profile && definition.can_guard()
        })
        .and_then(|definition| definition.contact_defense.as_ref())
}

pub(crate) fn apply_contact(
    core: &mut CoreMutation<'_>,
    defender: &str,
    toward_source: Point,
    raw_injury: f64,
) -> Result<Defense, ExecutionError> {
    let ordinary = Defense {
        prevented: 0.0,
        injury: raw_injury,
    };
    let physical = &core.state.physical;
    let Some(body) = physical.entities.get(defender) else {
        return Ok(ordinary);
    };
    let Some(action) = body
        .actor
        .as_ref()
        .filter(|actor| actor.alive && !actor.incapacitated)
        .and_then(|actor| actor.action.as_ref())
    else {
        return Ok(ordinary);
    };
    let Some((guard, profile)) = action.guard.as_ref().zip(current_profile(
        physical,
        &core.state.installed,
        body,
        action,
    )) else {
        return Ok(ordinary);
    };
    let now = physical.header.sim_time;
    if core
        .state
        .installed
        .capabilities
        .capability_blocked(Some(body), "actions")?
        || guard.phase == GuardPhase::Recovery
        || now < guard.ready_at
        || now >= guard.expires_at
        || !profile.covers(guard.facing, toward_source)
    {
        return Ok(ordinary);
    }
    let after = Defense {
        prevented: raw_injury * profile.reduction,
        injury: raw_injury * (1.0 - profile.reduction),
    };
    let seconds = profile.recovery_seconds;
    core.physical().advance_guard(
        defender,
        GuardPhase::Recovery,
        seconds,
        seconds,
        Some(now + seconds),
    )?;
    Ok(after)
}

heap_record!(DefenseProfile {
    label,
    preparing_label,
    ready_label,
    recovery_label
});
heap_record!(Guard { profile });

pub(crate) fn advance(
    core: &mut CoreMutation<'_>,
    defender: &str,
) -> Result<Option<bool>, ExecutionError> {
    let physical = &core.state.physical;
    let body = physical
        .entities
        .get(defender)
        .ok_or(ExecutionError::MissingEntity)?;
    let action = body
        .actor
        .as_ref()
        .and_then(|actor| actor.action.as_ref())
        .ok_or(ExecutionError::InvalidCheckpoint)?;
    let Some((guard, profile)) = action.guard.as_ref().zip(current_profile(
        physical,
        &core.state.installed,
        body,
        action,
    )) else {
        return Ok(None);
    };
    if core
        .state
        .installed
        .capabilities
        .capability_blocked(Some(body), "actions")?
    {
        return Ok(None);
    }
    let now = physical.header.sim_time;
    let (phase, until, total, recovery) = if let Some(until) = guard.recovery_until {
        (
            GuardPhase::Recovery,
            until,
            profile.recovery_seconds,
            Some(until),
        )
    } else if now >= guard.expires_at {
        let deadline = guard.expires_at + profile.recovery_seconds;
        (
            GuardPhase::Recovery,
            deadline,
            profile.recovery_seconds,
            Some(deadline),
        )
    } else if now >= guard.ready_at {
        (
            GuardPhase::Ready,
            guard.expires_at,
            profile.ready_seconds,
            None,
        )
    } else {
        (
            GuardPhase::Preparing,
            guard.ready_at,
            profile.preparation_seconds,
            None,
        )
    };
    // The duration is exact even when subtracting two absolute clock values
    // rounds a just-started deadline slightly above its own duration.
    let remaining = (until - now).clamp(0.0, total);
    core.physical()
        .advance_guard(defender, phase, remaining, total, recovery)?;
    Ok(Some(phase == GuardPhase::Recovery && remaining == 0.0))
}

pub(crate) fn valid_saved(
    physical: &PhysicalState,
    installed: &InstalledWorld,
    defender: &Entity,
    action: &Action,
) -> bool {
    let Some((guard, profile)) = action
        .guard
        .as_ref()
        .zip(current_profile(physical, installed, defender, action))
    else {
        return false;
    };
    let epsilon = installed.time_epsilon;
    let (deadline, duration) = match guard.phase {
        GuardPhase::Preparing => (guard.ready_at, profile.preparation_seconds),
        GuardPhase::Ready => (guard.expires_at, profile.ready_seconds),
        GuardPhase::Recovery => {
            let Some(until) = guard.recovery_until.filter(|until| {
                *until >= guard.ready_at + profile.recovery_seconds - epsilon
                    && *until <= guard.expires_at + profile.recovery_seconds + epsilon
                    && defender
                        .actor
                        .as_ref()
                        .and_then(|actor| actor.combat_ready_at)
                        .is_some_and(|recovery| recovery >= *until)
            }) else {
                return false;
            };
            (until, profile.recovery_seconds)
        }
    };
    action.path.is_empty()
        && action.destination.is_none()
        && action.navigation.is_none()
        && guard.facing.is_finite()
        && guard.expires_at.is_finite()
        && guard.ready_at.is_finite()
        && guard.ready_at >= 0.0
        && (guard.expires_at - guard.ready_at - profile.ready_seconds).abs() <= epsilon
        && guard.recovery_until.is_some() == (guard.phase == GuardPhase::Recovery)
        && action.total_seconds == duration
        && (action.remaining_seconds - (deadline - physical.header.sim_time).max(0.0)).abs()
            <= epsilon
}
