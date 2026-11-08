//! Immutable authored root content, moved out of the installation transport.
//! These finite fields contain no actor, evidence, clocks, identity allocator or
//! writable child collection. Live header/child projections borrow their owners.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Arc;

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct TimePolicy {
    pub normal_game_seconds_per_second: f64,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct WorldProfile {
    pub id: String,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    pub version: u64,
}

pub(crate) struct InstalledContent {
    /// Presentation is installed authored data, not a source of permissions or
    /// executable policy. The Node formatter may share this same immutable cut.
    pub presentation: Option<Arc<Value>>,
    pub time_policy: TimePolicy,
    pub profile: WorldProfile,
}

impl InstalledContent {
    pub(crate) fn install(
        presentation: Option<Value>,
        time_policy: TimePolicy,
        profile: WorldProfile,
    ) -> Result<Self, super::InstallError> {
        if presentation
            .as_ref()
            .is_some_and(|value| !value.is_object())
            || !time_policy.normal_game_seconds_per_second.is_finite()
            || time_policy.normal_game_seconds_per_second <= 0.0
            || !crate::values::is_safe_record_id(&profile.id)
            || profile.version == 0
        {
            return Err(super::InstallError::CurrentFormat);
        }
        Ok(Self {
            presentation: presentation.map(Arc::new),
            time_policy,
            profile,
        })
    }
}
