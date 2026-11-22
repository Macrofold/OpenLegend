//! Saved continuation for finite foraging. Installed world profiles supply
//! the laws independently of these observations and outstanding work.

use super::{NavigationBody, NavigationWait};
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
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub pack_id: Option<String>,
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
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub reconsider_at: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub proposal: Option<Box<ForagingProposal>>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ForagingMode {
    Routine,
    Resting,
    Feeding,
    Regrouping,
    Stalking,
    Pursuing,
    Searching,
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
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub target_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    pub target_life: Option<u64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub observed: Option<ObservedForagingTarget>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    pub search_index: Option<u64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub lost_at: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub route_target: Option<SurfacePoint>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ForagingWorkKind {
    Routine,
    Food,
    Hunt,
    Regroup,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ObservedForagingTarget {
    pub point: SurfacePoint,
    pub at: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ForagingProposal {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub generation: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub geometry_revision: u64,
    pub at: f64,
    pub origin: SurfacePoint,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub movement_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub wait: Option<NavigationWait>,
    pub body: NavigationBody,
    pub candidates: Vec<ForagingCandidate>,
    pub basis: String,
    pub separations: IndexMap<String, f64>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ForagingCandidate {
    pub id: String,
    pub point: SurfacePoint,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ResourceFeeding {
    pub profile: DefinitionPin,
    pub food: DefinitionPin,
    pub source: FoodStock,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum FoodSourceKind {
    Resource,
    Item,
    Remains,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "lowercase", deny_unknown_fields)]
pub enum FoodStock {
    Resource {
        #[serde(deserialize_with = "deserialize_safe_integer")]
        revision: u64,
    },
    Item {
        #[serde(rename = "itemId")]
        item_id: String,
        #[serde(deserialize_with = "deserialize_safe_integer")]
        revision: u64,
    },
    Remains {
        digest: String,
    },
}

impl FoodStock {
    pub(crate) fn kind(&self) -> FoodSourceKind {
        match self {
            Self::Resource { .. } => FoodSourceKind::Resource,
            Self::Item { .. } => FoodSourceKind::Item,
            Self::Remains { .. } => FoodSourceKind::Remains,
        }
    }

    pub(crate) fn valid(&self) -> bool {
        match self {
            Self::Resource { .. } => true,
            Self::Item { item_id, .. } => is_safe_record_id(item_id),
            Self::Remains { digest } => !digest.is_empty(),
        }
    }
}

impl HeapBytes for FoodStock {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Resource { .. } => Some(0),
            Self::Item { item_id, .. } => item_id.heap_bytes(),
            Self::Remains { digest } => digest.heap_bytes(),
        }
    }
}

impl ForagingContinuation {
    pub(crate) fn active(&self, actor: &crate::state::ActorState) -> bool {
        actor.controller == "native"
            && actor.alive
            && self.work.as_ref().is_some_and(|work| {
                (work.kind == ForagingWorkKind::Hunt
                    && matches!(
                        self.mode,
                        ForagingMode::Stalking | ForagingMode::Pursuing | ForagingMode::Searching
                    ))
                    || (self.mode == ForagingMode::Feeding
                        && actor
                            .action
                            .as_ref()
                            .is_some_and(|action| action.id == work.action_id))
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
            && self.pack_id.as_deref().is_none_or(is_safe_record_id)
            && time(self.review_at)
            && self.reconsider_at.is_none_or(time)
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
                    && work
                        .target_id
                        .as_deref()
                        .is_none_or(|id| is_safe_record_id(id) && work.target_life.is_some())
                    && work.observed.as_ref().is_none_or(|observed| {
                        point(&observed.point) && time(observed.at) && observed.at <= through
                    })
                    && work.lost_at.is_none_or(|at| time(at) && at <= through)
                    && work.search_index.is_none_or(|index| index <= 3)
                    && work.route_target.as_ref().is_none_or(point)
                    && (!matches!(
                        work.kind,
                        ForagingWorkKind::Hunt | ForagingWorkKind::Regroup
                    ) || work.target_id.is_some() && work.observed.is_some())
            })
            && self.proposal.as_ref().is_none_or(|proposal| {
                time(proposal.at)
                    && proposal.at <= through
                    && point(&proposal.origin)
                    && proposal
                        .movement_id
                        .as_deref()
                        .is_none_or(is_safe_record_id)
                    && proposal.body.radius.is_finite()
                    && proposal.body.radius > 0.0
                    && proposal.body.height.is_finite()
                    && proposal.body.height > 0.0
                    && time(proposal.body.max_slope)
                    && !proposal.basis.is_empty()
                    && proposal.candidates.len() <= 6
                    && proposal.candidates.len() == proposal.separations.len()
                    && proposal
                        .candidates
                        .iter()
                        .enumerate()
                        .all(|(index, candidate)| {
                            is_safe_record_id(&candidate.id)
                                && point(&candidate.point)
                                && proposal
                                    .separations
                                    .get(&candidate.id)
                                    .is_some_and(|value| time(*value))
                                && !proposal.candidates[..index]
                                    .iter()
                                    .any(|other| other.id == candidate.id)
                        })
            })
    }
}

heap_record!(ForagingContinuation {
    profile,
    home,
    anchors,
    pack_id,
    destination,
    empty_sources,
    anchor_food,
    work,
    proposal
});
heap_record!(EmptyFoodSource {});
heap_record!(AnchorFood { source_id, food });
heap_record!(ForagingWork {
    action_id,
    last_point,
    source_id,
    target_id,
    observed,
    route_target
});
heap_record!(ObservedForagingTarget { point });
heap_record!(ForagingProposal {
    origin,
    movement_id,
    candidates,
    basis,
    separations
});
heap_record!(ForagingCandidate { id, point });
heap_record!(ResourceFeeding {
    profile,
    food,
    source
});
