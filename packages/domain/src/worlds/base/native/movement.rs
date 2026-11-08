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
}
pub(crate) struct InstalledMovementPolicy {
    value: MovementPolicy,
    canonical: Arc<str>,
    sha256: String,
}
impl InstalledMovementPolicy {
    pub(crate) fn install(input: CanonicalInput) -> Result<Self, InstallError> {
        let value: MovementPolicy =
            serde_json::from_str(&input.canonical).map_err(|_| InstallError::DefinitionBody)?;
        input.verify(&value)?;
        if ![value.movement_tiles_per_second, value.interaction_radius]
            .iter()
            .all(|n| n.is_finite() && *n > 0.0)
        {
            return Err(InstallError::DefinitionBody);
        }
        Ok(Self {
            value,
            canonical: Arc::from(input.canonical),
            sha256: input.sha256,
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
