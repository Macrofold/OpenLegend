//! The selected world's actual forecast fidelity and advance allowance. Saved
//! normal-play speed remains in its existing independent content owner.
use crate::install::{CanonicalInput, InstallError};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TimeRules {
    idle_horizon_seconds: f64,
    perception_travel_metres: f64,
    max_advance_seconds: f64,
    invalid_duration_message: crate::text::JsText,
}
pub(crate) struct InstalledTimeRules {
    value: TimeRules,
    canonical: Arc<str>,
    sha256: String,
}
impl InstalledTimeRules {
    pub(crate) fn install(input: CanonicalInput) -> Result<Self, InstallError> {
        let value: TimeRules =
            serde_json::from_str(&input.canonical).map_err(|_| InstallError::DefinitionBody)?;
        input.verify(&value)?;
        if ![
            value.idle_horizon_seconds,
            value.perception_travel_metres,
            value.max_advance_seconds,
        ]
        .into_iter()
        .all(|value| value.is_finite() && value > 0.0)
        {
            return Err(InstallError::DefinitionBody);
        }
        Ok(Self {
            value,
            canonical: Arc::from(input.canonical),
            sha256: input.sha256,
        })
    }
    pub(crate) fn idle_horizon_seconds(&self) -> f64 {
        self.value.idle_horizon_seconds
    }
    pub(crate) fn perception_travel_metres(&self) -> f64 {
        self.value.perception_travel_metres
    }
    pub(crate) fn maximum_advance_seconds(&self) -> f64 {
        self.value.max_advance_seconds
    }
    pub(crate) fn invalid_duration_message(&self) -> &crate::text::JsText {
        &self.value.invalid_duration_message
    }
    pub(crate) fn canonical(&self) -> &str {
        &self.canonical
    }
    pub(crate) fn sha256(&self) -> &str {
        &self.sha256
    }
}
