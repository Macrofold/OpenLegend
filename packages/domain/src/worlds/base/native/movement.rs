//! Bundled-world movement law. Values are installed from the existing
//! BASE_ACTION_DEFAULTS owner, never copied as engine constants.

use crate::install::{CanonicalInput, InstallError, VerifiedDefinition};
use crate::native_response::{LocomotionMode, NativeResponseProfile, profile_key};
use crate::state::Entity;
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct MovementPolicy {
    pub movement_tiles_per_second: f64,
    pub interaction_radius: f64,
    pub direct_probe_max_distance: f64,
}
pub(crate) struct InstalledMovementPolicy {
    value: MovementPolicy,
    canonical: Arc<str>,
    sha256: String,
    _storage: crate::host::ResidentReservation,
}
impl InstalledMovementPolicy {
    pub(crate) fn install(
        input: CanonicalInput,
        budget: &crate::host::ByteBudget,
    ) -> Result<Self, InstallError> {
        let mut workspace = crate::install::reserve_typed_parse::<MovementPolicy>(
            &input.canonical,
            std::mem::size_of::<String>(),
            None,
            budget,
        )?;
        let value: MovementPolicy =
            serde_json::from_str(&input.canonical).map_err(|_| InstallError::DefinitionBody)?;
        input.verify(&value)?;
        if ![
            value.movement_tiles_per_second,
            value.interaction_radius,
            value.direct_probe_max_distance,
        ]
        .iter()
        .all(|n| n.is_finite() && *n > 0.0)
        {
            return Err(InstallError::DefinitionBody);
        }
        let bytes = crate::host::retained_size::heap_sum([
            input.canonical.len(),
            input.sha256.capacity(),
            2 * std::mem::size_of::<usize>(),
            0,
        ])
        .ok_or(InstallError::Capacity)?;
        let storage = workspace
            .split_off(bytes)
            .map_err(|_| InstallError::Capacity)?;
        let storage = budget
            .adopt_record(storage)
            .map_err(|_| InstallError::Capacity)?;
        Ok(Self {
            value,
            canonical: Arc::from(input.canonical),
            sha256: input.sha256,
            _storage: storage,
        })
    }
    pub(crate) fn canonical(&self) -> &str {
        &self.canonical
    }
    pub(crate) fn sha256(&self) -> &str {
        &self.sha256
    }
    pub(crate) fn interaction_radius(&self) -> f64 {
        self.value.interaction_radius
    }
    pub(crate) fn direct_probe_max_distance(&self) -> f64 {
        self.value.direct_probe_max_distance
    }
    /// Idle actors can steer in the converted action closure. Weapon preparation
    /// and recovery must join this world-owned rule when those families convert;
    /// the engine must not treat every physical work slot as a steering lock.
    pub(crate) fn steering_action_allowed(
        &self,
        entity: &Entity,
    ) -> Result<bool, crate::execution::ExecutionError> {
        use crate::execution::ExecutionError;
        match entity
            .actor
            .as_ref()
            .and_then(|actor| actor.action.as_ref())
        {
            None => Ok(true),
            Some(action) if action.kind == "move" || action.kind == "status-effect" => Ok(false),
            Some(_) => Err(ExecutionError::UnsupportedFamily),
        }
    }
    /// Scar meaning is supplied by the same installed body's lifecycle policy.
    /// This function does not invent a default for an unported scar or threat.
    pub(crate) fn speed(
        &self,
        entity: &Entity,
        profiles: &IndexMap<String, VerifiedDefinition<NativeResponseProfile>>,
        scar_factor: f64,
    ) -> Result<f64, crate::execution::ExecutionError> {
        use crate::execution::ExecutionError;
        if !scar_factor.is_finite() || scar_factor <= 0.0 {
            return Err(ExecutionError::Invariant);
        }
        if entity.threat.is_some() {
            return Err(ExecutionError::UnsupportedFamily);
        }
        let action = entity
            .actor
            .as_ref()
            .and_then(|actor| actor.action.as_ref());
        if action.is_some_and(|action| action.evasion.is_some() || action.strike_motion.is_some()) {
            return Err(ExecutionError::UnsupportedFamily);
        }
        let Some(binding) = action.and_then(|action| action.native_locomotion.as_ref()) else {
            return Ok(self.value.movement_tiles_per_second * scar_factor);
        };
        let key = profile_key(&binding.profile).map_err(|_| ExecutionError::Invariant)?;
        let profile = profiles
            .get(&key)
            .filter(|definition| definition.pin() == &binding.profile)
            .ok_or(ExecutionError::Invariant)?
            .value();
        let locomotion = profile
            .locomotion
            .get(&binding.locomotion)
            .ok_or(ExecutionError::Invariant)?;
        let speed = match binding.mode {
            LocomotionMode::Travel => locomotion.travel,
            LocomotionMode::Escape => locomotion.escape,
        };
        Ok(speed
            * if profile.movement_factors.scars {
                scar_factor
            } else {
                1.0
            })
    }
}
