//! Immutable provider geometry and finite preparation products. Rapier/Recast
//! remain the existing physical providers: an answer is preparation for one
//! unchanged native candidate, never permission to move or acquire evidence.

use crate::host::CandidateKey;
use crate::reception::BoundsQueryCursor;
use crate::state::{BodyProfile, Bounds, NavigationRequest, Point, SurfacePoint};
use crate::values::{deserialize_present_option, deserialize_safe_integer};
mod route;
pub(crate) use route::{GuardedRoutePlan, route_plan};

use indexmap::IndexMap;
use serde::{Deserialize, Serialize};

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct GeometryMap {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub width: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub height: u64,
    pub tiles: Vec<Vec<String>>,
    #[serde(serialize_with = "crate::encoding::serialize_js_map")]
    pub terrain: IndexMap<String, TerrainDefinition>,
    pub spatial: SpatialLayout,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TerrainDefinition {
    pub walkable: bool,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub solid: Option<TerrainSolid>,
    pub presentation: TerrainPresentation,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TerrainSolid {
    pub height: f64,
    pub movement: bool,
    pub sight: bool,
    pub acoustic_transmission: f64,
    pub material: String,
    pub name: String,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TerrainPresentation {
    pub style: TerrainStyle,
    pub color: String,
    pub overview_color: String,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub pattern_colors: Option<Vec<String>>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub bank_colors: Option<[String; 2]>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub glint_colors: Option<[String; 2]>,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TerrainStyle {
    Ground,
    Earth,
    Liquid,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SpatialLayout {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub version: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
    pub disclosure: SpatialDisclosure,
    pub surfaces: Vec<WalkableSurface>,
    pub blockers: Vec<SpatialBlocker>,
    pub levels: Vec<SpatialLevel>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub scenery: Option<Vec<SceneryInstance>>,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SpatialDisclosure {
    Public,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct WalkableSurface {
    pub id: String,
    pub name: String,
    pub level_id: String,
    pub min_x: f64,
    pub max_x: f64,
    pub min_z: f64,
    pub max_z: f64,
    pub y: f64,
    pub slope_x: f64,
    pub slope_z: f64,
    pub thickness: f64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub solid_base: Option<f64>,
    pub acoustic_transmission: f64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub terrain: Option<bool>,
    pub material: String,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SpatialBlocker {
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub non_walkable: Option<bool>,
    pub id: String,
    pub bounds: Bounds,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub panel: Option<FinitePanel>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub boxes: Option<Vec<Bounds>>,
    pub movement: bool,
    pub sight: bool,
    pub acoustic_transmission: f64,
    pub material: String,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct FinitePanel {
    pub corners: [Point; 4],
    pub thickness: f64,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SpatialLevel {
    pub id: String,
    pub name: String,
    pub focus_y: f64,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SceneryInstance {
    pub id: String,
    pub appearance: String,
    // The current geometry owner admits signed safe integer scenery seeds.
    pub seed: f64,
    pub position: Point,
    pub width: f64,
    pub height: f64,
    pub cast_shadows: bool,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SightRay {
    pub from: Point,
    pub to: Point,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct WalkingSegment {
    pub from: SurfacePoint,
    pub to: SurfacePoint,
    pub body: BodyProfile,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SupportQuery {
    pub point: Point,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub surface_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub relative: Option<RelativeSupport>,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct RelativeSupport {
    pub x: f64,
    pub z: f64,
    pub heading: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct StandingQuery {
    pub point: SurfacePoint,
    pub body: BodyProfile,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SurfaceLineQuery {
    pub from: SurfacePoint,
    pub x: f64,
    pub z: f64,
    /// A body requests a walkable line; its absence requests support topology
    /// only. Steering traces topology before the movement owner checks bodies.
    pub body: Option<BodyProfile>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SightSweepQuery {
    pub eye_from: Point,
    pub eye_to: Point,
    pub point_from: Point,
    pub point_to: Point,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PhysicalFeature {
    pub id: String,
    pub source_id: String,
    pub kind: PhysicalFeatureKind,
    pub vertices: [Point; 4],
    pub normal: Point,
    pub bounds: Bounds,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum PhysicalFeatureKind {
    Support,
    SolidFace,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PhysicalFeatureQuery {
    pub bounds: Bounds,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub allowance: u64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub cursor: Option<BoundsQueryCursor>,
    pub radial_origin: Point,
    pub radial_radius: f64,
    pub priority_anchors: Vec<Point>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PhysicalFeatureAnswer {
    pub values: Vec<PhysicalFeature>,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub visited: u64,
    pub status: PhysicalQueryStatus,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub cursor: Option<BoundsQueryCursor>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PhysicalQueryStatus {
    Complete,
    Partial,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ConvexViewQuery {
    pub from: Point,
    pub target: Vec<Point>,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub allowance: u64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ConvexViewAnswer {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub visited: u64,
    pub complete: bool,
    pub clear: bool,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub blocking_vertices: Option<Vec<Point>>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum BodySweepMode {
    FirstHit,
    NearestHit,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct BodySweepGroup {
    pub bounds: Vec<Bounds>,
    pub from: Point,
    pub to: Point,
    pub body: BodyProfile,
    pub mode: BodySweepMode,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct BodySweepAnswer {
    pub fraction: Option<f64>,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub tested: u64,
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct StandingColumn {
    pub x: f64,
    pub z: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct StandingColumnsQuery {
    pub columns: Vec<StandingColumn>,
    pub reference_y: f64,
    pub body: BodyProfile,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct StandingSelection {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub index: u64,
    pub point: SurfacePoint,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum RouteQuery {
    Approach {
        from: SurfacePoint,
        body: BodyProfile,
        target_position: Point,
        target_support: Option<SurfacePoint>,
        reach: f64,
        goal: Point,
    },
    Surface {
        from: SurfacePoint,
        to: SurfacePoint,
        body: BodyProfile,
    },
    Outside {
        from: SurfacePoint,
        bounds: Bounds,
        body: BodyProfile,
    },
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(tag = "status", rename_all = "kebab-case", deny_unknown_fields)]
pub enum RoutePlan {
    Reached {
        path: Vec<SurfacePoint>,
        length: f64,
        #[serde(deserialize_with = "deserialize_safe_integer")]
        expanded: u64,
    },
    Pending {
        path: [SurfacePoint; 0],
        request: NavigationRequest,
        #[serde(deserialize_with = "deserialize_safe_integer")]
        expanded: u64,
    },
    InvalidEndpoint {
        path: [SurfacePoint; 0],
        #[serde(deserialize_with = "deserialize_safe_integer")]
        expanded: u64,
    },
    NoRoute {
        path: [SurfacePoint; 0],
        #[serde(deserialize_with = "deserialize_safe_integer")]
        expanded: u64,
    },
    BudgetExceeded {
        path: [SurfacePoint; 0],
        #[serde(deserialize_with = "deserialize_safe_integer")]
        expanded: u64,
    },
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct GeometryBinding {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub candidate_id: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub base_cut: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub generation: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub geometry_revision: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub serial: u64,
}

impl GeometryBinding {
    pub fn new(candidate: CandidateKey, geometry_revision: u64, serial: u64) -> Self {
        Self {
            candidate_id: candidate.id,
            base_cut: candidate.base_cut,
            generation: candidate.generation,
            geometry_revision,
            serial,
        }
    }
}

/// One phase builds this product from stable borrowed physical inputs. Arrays
/// retain source order; provider arrival order never chooses occurrence order.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GeometryQueries {
    pub binding: GeometryBinding,
    pub sight: Vec<SightRay>,
    pub walking: Vec<WalkingSegment>,
    pub support: Vec<SupportQuery>,
    pub standing: Vec<StandingQuery>,
    pub surface_lines: Vec<SurfaceLineQuery>,
    pub sight_sweeps: Vec<SightSweepQuery>,
    pub sound: Vec<SightRay>,
    pub navigation: Vec<NavigationRequest>,
    pub routes: Vec<RouteQuery>,
    pub features: Vec<PhysicalFeatureQuery>,
    pub feature_ids: Vec<String>,
    pub convex_views: Vec<ConvexViewQuery>,
    pub body_sweeps: Vec<BodySweepGroup>,
    pub standing_columns: Vec<StandingColumnsQuery>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct GeometryAnswers {
    pub binding: GeometryBinding,
    pub sight: Vec<bool>,
    pub walking: Vec<bool>,
    pub support: Vec<Option<SurfacePoint>>,
    pub standing: Vec<bool>,
    pub surface_lines: Vec<Option<SurfaceLineAnswer>>,
    pub sight_sweeps: Vec<SightSweep>,
    pub sound: Vec<f64>,
    pub navigation: Vec<NavigationAnswer>,
    pub routes: Vec<RoutePlan>,
    pub features: Vec<PhysicalFeatureAnswer>,
    pub feature_ids: Vec<Option<PhysicalFeature>>,
    pub convex_views: Vec<ConvexViewAnswer>,
    pub body_sweeps: Vec<BodySweepAnswer>,
    pub standing_columns: Vec<Option<StandingSelection>>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SurfaceLineAnswer {
    pub path: Vec<SurfacePoint>,
}

/// Recast's answer is checked by the existing physical route validator against
/// this request and immutable map before native gameplay considers admission.
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct NavigationAnswer {
    pub result: NavigationResult,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    pub problem: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SightSweep {
    pub fractions: Vec<f64>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(tag = "status", rename_all = "kebab-case", deny_unknown_fields)]
pub enum NavigationResult {
    Reached {
        path: Vec<SurfacePoint>,
        length: f64,
    },
    #[serde(rename = "no-route")]
    NoRoute {
        path: [SurfacePoint; 0],
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        reason: Option<String>,
    },
    InvalidEndpoint {
        path: [SurfacePoint; 0],
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        reason: Option<String>,
    },
    BudgetExceeded {
        path: [SurfacePoint; 0],
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        reason: Option<String>,
    },
    UnsafeRoute {
        path: [SurfacePoint; 0],
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        reason: Option<String>,
    },
    Unavailable {
        path: [SurfacePoint; 0],
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        reason: Option<String>,
    },
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum GeometryAnswerError {
    Stale,
    Incomplete,
    Invalid,
}

impl GeometryQueries {
    pub fn is_empty(&self) -> bool {
        self.sight.is_empty()
            && self.walking.is_empty()
            && self.support.is_empty()
            && self.standing.is_empty()
            && self.surface_lines.is_empty()
            && self.sight_sweeps.is_empty()
            && self.sound.is_empty()
            && self.navigation.is_empty()
            && self.routes.is_empty()
            && self.features.is_empty()
            && self.feature_ids.is_empty()
            && self.convex_views.is_empty()
            && self.body_sweeps.is_empty()
            && self.standing_columns.is_empty()
    }
    pub fn new(binding: GeometryBinding) -> Self {
        Self {
            binding,
            sight: Vec::new(),
            walking: Vec::new(),
            support: Vec::new(),
            standing: Vec::new(),
            surface_lines: Vec::new(),
            sight_sweeps: Vec::new(),
            sound: Vec::new(),
            navigation: Vec::new(),
            routes: Vec::new(),
            features: Vec::new(),
            feature_ids: Vec::new(),
            convex_views: Vec::new(),
            body_sweeps: Vec::new(),
            standing_columns: Vec::new(),
        }
    }

    /// Shape checks protect native indexing and NaN/range propagation at the
    /// asynchronous provider boundary. Semantic route/body admission remains
    /// with the actual movement owner after this exact answer has returned.
    pub fn validate_answers(&self, answer: &GeometryAnswers) -> Result<(), GeometryAnswerError> {
        if self.binding != answer.binding {
            return Err(GeometryAnswerError::Stale);
        }
        if self.sight.len() != answer.sight.len()
            || self.walking.len() != answer.walking.len()
            || self.support.len() != answer.support.len()
            || self.standing.len() != answer.standing.len()
            || self.surface_lines.len() != answer.surface_lines.len()
            || self.sight_sweeps.len() != answer.sight_sweeps.len()
            || self.sound.len() != answer.sound.len()
            || self.navigation.len() != answer.navigation.len()
            || self.routes.len() != answer.routes.len()
            || self.features.len() != answer.features.len()
            || self.feature_ids.len() != answer.feature_ids.len()
            || self.convex_views.len() != answer.convex_views.len()
            || self.body_sweeps.len() != answer.body_sweeps.len()
            || self.standing_columns.len() != answer.standing_columns.len()
        {
            return Err(GeometryAnswerError::Incomplete);
        }
        let point = |point: &SurfacePoint| {
            point.x.is_finite()
                && point.y.is_finite()
                && point.z.is_finite()
                && !point.surface_id.is_empty()
        };
        if answer.support.iter().flatten().any(|value| !point(value))
            || answer
                .surface_lines
                .iter()
                .flatten()
                .flat_map(|line| &line.path)
                .any(|value| !point(value))
            || answer.sight_sweeps.iter().any(|sweep| {
                sweep
                    .fractions
                    .iter()
                    .any(|value| !value.is_finite() || *value < 0.0 || *value > 1.0)
            })
            || answer
                .sound
                .iter()
                .any(|value| !value.is_finite() || *value < 0.0 || *value > 1.0)
            || answer.navigation.iter().any(|answer| match &answer.result {
                NavigationResult::Reached { path, length } => {
                    !length.is_finite() || *length < 0.0 || path.iter().any(|value| !point(value))
                }
                _ => false,
            })
            || answer.routes.iter().any(|result| match result {
                RoutePlan::Reached { path, length, .. } => {
                    !length.is_finite() || *length < 0.0 || path.iter().any(|value| !point(value))
                }
                _ => false,
            })
            || self
                .body_sweeps
                .iter()
                .zip(&answer.body_sweeps)
                .any(|(query, result)| {
                    result.tested > query.bounds.len() as u64
                        || result.fraction.is_some_and(|fraction| {
                            !fraction.is_finite() || !(0.0..=1.0).contains(&fraction)
                        })
                        || match query.mode {
                            BodySweepMode::NearestHit => result.tested != query.bounds.len() as u64,
                            BodySweepMode::FirstHit => {
                                if result.fraction.is_some() {
                                    result.tested == 0
                                } else {
                                    result.tested != query.bounds.len() as u64
                                }
                            }
                        }
                })
            || self
                .standing_columns
                .iter()
                .zip(&answer.standing_columns)
                .any(|(query, result)| {
                    result.as_ref().is_some_and(|result| {
                        match usize::try_from(result.index)
                            .ok()
                            .and_then(|index| query.columns.get(index))
                        {
                            Some(column) => {
                                result.point.x != column.x
                                    || result.point.z != column.z
                                    || !point(&result.point)
                            }
                            None => true,
                        }
                    })
                })
        {
            return Err(GeometryAnswerError::Invalid);
        }
        Ok(())
    }
}
