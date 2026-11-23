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

#[derive(Clone, Copy, Debug, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum RuntimeRangedMode {
    Aim,
    ShootOnce,
    Hunt,
}

impl RuntimeRangedMode {
    pub(crate) fn kind(self) -> &'static str {
        match self {
            Self::Aim => "aim",
            Self::ShootOnce => "shoot-once",
            Self::Hunt => "hunt",
        }
    }
}

#[derive(Clone, Copy)]
pub enum RuntimeRangedTarget<'a> {
    Subject {
        id: &'a str,
        life: u64,
    },
    Point {
        point: Point,
        subject: Option<(&'a str, u64)>,
    },
}

impl RuntimeRangedTarget<'_> {
    pub(crate) fn selected_text_bytes(self) -> usize {
        match self {
            Self::Subject { id, .. } => id.len(),
            Self::Point { subject, .. } => subject.map_or(0, |(id, _)| id.len()),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "lowercase", deny_unknown_fields)]
pub(crate) enum RangedTarget {
    Subject {
        id: String,
        #[serde(deserialize_with = "deserialize_safe_integer")]
        life: u64,
    },
    Point {
        point: Point,
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        subject: Option<AimedLife>,
    },
}

impl RangedTarget {
    pub(crate) fn bound(value: RuntimeRangedTarget<'_>) -> Self {
        match value {
            RuntimeRangedTarget::Subject { id, life } => Self::Subject {
                id: id.into(),
                life,
            },
            RuntimeRangedTarget::Point { point, subject } => Self::Point {
                point,
                subject: subject.map(|(id, life)| AimedLife {
                    id: id.into(),
                    life,
                }),
            },
        }
    }

    pub(crate) fn valid(&self) -> bool {
        let valid_life = |id: &str, life| {
            crate::values::is_safe_record_id(id) && life <= crate::identity::MAX_SAFE_INTEGER
        };
        match self {
            Self::Subject { id, life } => valid_life(id, *life),
            Self::Point { point, subject } => {
                [point.x, point.y, point.z].into_iter().all(f64::is_finite)
                    && subject
                        .as_ref()
                        .is_none_or(|body| valid_life(&body.id, body.life))
            }
        }
    }

    pub(crate) fn subject_id(&self) -> Option<&str> {
        match self {
            Self::Subject { id, .. } => Some(id),
            Self::Point { .. } => None,
        }
    }
}

impl crate::host::retained_size::HeapBytes for RangedTarget {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Subject { id, .. } => id.heap_bytes(),
            Self::Point { subject, .. } => subject.heap_bytes(),
        }
    }
}
