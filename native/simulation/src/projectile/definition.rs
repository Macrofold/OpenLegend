//! Typed tool meaning from the verified installed item definitions.

use crate::host::retained_size::heap_record;
use crate::values::is_safe_record_id;
use serde::Deserialize;

#[derive(Clone, Copy, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub(crate) enum RangedMechanism {
    Swing,
    Flex,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct RangedWeapon {
    pub mechanism: RangedMechanism,
    pub ammunition_kind: String,
    pub damage: f64,
    pub range: f64,
    pub accuracy: f64,
    pub flight_speed: f64,
    pub recovery_seconds: f64,
}

impl RangedWeapon {
    pub(crate) fn valid(&self) -> bool {
        is_safe_record_id(&self.ammunition_kind)
            && self.damage.is_finite()
            && self.damage >= 0.0
            && self.range.is_finite()
            && self.range > 0.0
            && (0.0..=1.0).contains(&self.accuracy)
            && self.flight_speed.is_finite()
            && self.flight_speed > 0.0
            && self.recovery_seconds.is_finite()
            && self.recovery_seconds >= 0.0
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Ammunition {
    pub kind: String,
    pub damage_bonus: f64,
}

impl Ammunition {
    pub(crate) fn valid(&self) -> bool {
        is_safe_record_id(&self.kind) && self.damage_bonus.is_finite()
    }
}

heap_record!(RangedWeapon { ammunition_kind });
heap_record!(Ammunition { kind });
