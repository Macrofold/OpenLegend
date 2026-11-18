//! Exact saved continuation for finite resource foraging. Hunting, pack and
//! regrouping state remain unsupported. The owning installed profile supplies
//! the fictional rules independently of these current facts.

use crate::host::retained_size::{HeapBytes, heap_record};
use crate::state::SurfacePoint;
use crate::values::{
    DefinitionPin, deserialize_present_option, deserialize_safe_integer, is_safe_record_id,
};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ForagingContinuation {
    pub profile: DefinitionPin,
    pub home: SurfacePoint,
    pub anchors: Vec<SurfacePoint>,
    pub mode: ForagingMode,
    pub review_at: f64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub destination: Option<SurfacePoint>,
    pub empty_sources: IndexMap<String, EmptyFoodSource>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub anchor_food: Option<Vec<AnchorFood>>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub work: Option<ForagingWork>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ForagingMode {
    Routine,
    Resting,
    Feeding,
    Blocked,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EmptyFoodSource {
    pub at: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AnchorFood {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub anchor: u64,
    pub source_id: String,
    pub food: DefinitionPin,
    pub at: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ForagingWork {
    pub kind: ForagingWorkKind,
    pub action_id: String,
    pub started_at: f64,
    pub ends_at: f64,
    pub travelled_metres: f64,
    pub last_point: SurfacePoint,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub source_id: Option<String>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ForagingWorkKind {
    Routine,
    Food,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ResourceFeeding {
    pub profile: DefinitionPin,
    pub food: DefinitionPin,
    pub source: FoodStock,
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "lowercase", deny_unknown_fields)]
pub enum FoodStock {
    Resource {
        #[serde(deserialize_with = "deserialize_safe_integer")]
        revision: u64,
    },
}

impl FoodStock {
    pub(crate) fn revision(self) -> u64 {
        let Self::Resource { revision } = self;
        revision
    }
}

impl ForagingContinuation {
    pub(crate) fn active(&self, actor: &crate::state::ActorState) -> bool {
        self.mode == ForagingMode::Feeding
            && actor.controller == "native"
            && actor.alive
            && self.work.as_ref().is_some_and(|work| {
                actor
                    .action
                    .as_ref()
                    .is_some_and(|action| action.id == work.action_id)
            })
    }

    pub(crate) fn valid_at(&self, through: f64) -> bool {
        let time = |at: f64| at.is_finite() && at >= 0.0;
        let point = |point: &SurfacePoint| {
            [point.x, point.y, point.z].into_iter().all(f64::is_finite)
                && is_safe_record_id(&point.surface_id)
        };
        self.profile.is_valid()
            && point(&self.home)
            && (2..=4).contains(&self.anchors.len())
            && self.anchors.iter().all(point)
            && time(self.review_at)
            && self.destination.as_ref().is_none_or(point)
            && self
                .empty_sources
                .iter()
                .all(|(id, row)| is_safe_record_id(id) && time(row.at) && row.at <= through)
            && self.anchor_food.as_ref().is_none_or(|rows| {
                rows.len() <= self.anchors.len()
                    && rows.iter().enumerate().all(|(index, row)| {
                        row.anchor < self.anchors.len() as u64
                            && is_safe_record_id(&row.source_id)
                            && row.food.is_valid()
                            && time(row.at)
                            && row.at <= through
                            && !rows[..index].iter().any(|other| other.anchor == row.anchor)
                    })
            })
            && self.work.as_ref().is_none_or(|work| {
                is_safe_record_id(&work.action_id)
                    && time(work.started_at)
                    && work.started_at <= through
                    && time(work.ends_at)
                    && work.started_at <= work.ends_at
                    && time(work.travelled_metres)
                    && point(&work.last_point)
                    && work.source_id.as_deref().is_none_or(is_safe_record_id)
            })
    }
}

heap_record!(ForagingContinuation {
    profile,
    home,
    anchors,
    destination,
    empty_sources,
    anchor_food,
    work
});
heap_record!(EmptyFoodSource {});
heap_record!(AnchorFood { source_id, food });
heap_record!(ForagingWork {
    action_id,
    last_point,
    source_id
});
heap_record!(ResourceFeeding { profile, food });
