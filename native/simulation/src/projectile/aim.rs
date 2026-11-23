//! Before a shot is released, the action holds an exact choice and one
//! compatible item. A later flight never borrows the live action or claim.

use crate::host::retained_size::heap_record;
use crate::state::Point;
use crate::values::{DefinitionPin, deserialize_present_option, deserialize_safe_integer};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct AimedLife {
    pub id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub life: u64,
}

#[derive(Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ObservedMotion {
    pub from_at: f64,
    pub at: f64,
    pub from: Point,
    pub to: Point,
}

#[derive(Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct RangedAim {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub source_life: u64,
    pub tool: DefinitionPin,
    pub ammunition: DefinitionPin,
    pub reservation_id: String,
    pub manual: bool,
    pub ready: bool,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub aim_target: Option<AimedLife>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub aim_point: Option<Point>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub aim_point_subject: Option<AimedLife>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub observed_motion: Option<ObservedMotion>,
}

heap_record!(AimedLife { id });
heap_record!(RangedAim {
    tool,
    ammunition,
    reservation_id,
    aim_target,
    aim_point_subject
});
