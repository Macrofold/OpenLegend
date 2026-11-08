//! Runtime NAPI conversion of detached physical-provider preparation products.
//! These objects carry no world setter and cannot grant movement or perception.

use napi::{Error, Result, Status};
use napi_derive::napi;
use openlegend_simulation::reception::BoundsQueryCursor;
use openlegend_simulation::{geometry as core, identity::MAX_SAFE_INTEGER, state};

#[napi(object)]
pub struct NativePoint {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

#[napi(object)]
pub struct NativeSurfacePoint {
    pub x: f64,
    pub y: f64,
    pub z: f64,
    pub surface_id: String,
}

#[napi(object)]
pub struct NativeBounds {
    pub min: NativePoint,
    pub max: NativePoint,
}

#[napi(object)]
pub struct NativeBodyProfile {
    pub id: String,
    pub radius: f64,
    pub height: f64,
    pub eye_height: f64,
    pub ear_height: f64,
    pub interaction_height: f64,
    pub max_slope: f64,
}

#[napi(object, object_from_js = false)]
pub struct NativeSightRay {
    pub from: NativePoint,
    pub to: NativePoint,
}

#[napi(object, object_from_js = false)]
pub struct NativeWalkingSegment {
    pub from: NativeSurfacePoint,
    pub to: NativeSurfacePoint,
    pub body: NativeBodyProfile,
}

#[napi(object, object_from_js = false)]
pub struct NativeSupportQuery {
    pub point: NativePoint,
    pub surface_id: Option<String>,
}

#[napi(object, object_from_js = false)]
pub struct NativeStandingQuery {
    pub point: NativeSurfacePoint,
    pub body: NativeBodyProfile,
}

#[napi(object, object_from_js = false)]
pub struct NativeSurfaceLineQuery {
    pub from: NativeSurfacePoint,
    pub x: f64,
    pub z: f64,
    pub body: NativeBodyProfile,
}

#[napi(object, object_from_js = false)]
pub struct NativeSightSweepQuery {
    pub eye_from: NativePoint,
    pub eye_to: NativePoint,
    pub point_from: NativePoint,
    pub point_to: NativePoint,
}

#[napi(object)]
pub struct NativeNavigationRequest {
    pub wait: Option<String>,
    pub from: NativeSurfacePoint,
    pub destinations: Vec<NativeSurfacePoint>,
    pub outside_bounds: Option<NativeBounds>,
    pub body: NativeBodyProfile,
    pub geometry_revision: f64,
}

#[napi(object, object_from_js = false)]
pub struct NativeRouteQuery {
    pub kind: String,
    pub from: NativeSurfacePoint,
    pub to: Option<NativeSurfacePoint>,
    pub bounds: Option<NativeBounds>,
    pub body: NativeBodyProfile,
}

#[napi(object)]
pub struct NativeRoutePlan {
    pub status: String,
    pub path: Vec<NativeSurfacePoint>,
    pub length: Option<f64>,
    pub request: Option<NativeNavigationRequest>,
    pub expanded: f64,
}

#[napi(object)]
pub struct NativeBoundsQueryCursor {
    pub pending: Vec<Vec<f64>>,
    pub offset: f64,
    pub leaf: Option<bool>,
    pub truncated: Option<bool>,
}

#[napi(object)]
pub struct NativePhysicalFeature {
    pub id: String,
    pub source_id: String,
    pub kind: String,
    pub vertices: Vec<NativePoint>,
    pub normal: NativePoint,
    pub bounds: NativeBounds,
}

#[napi(object, object_from_js = false)]
pub struct NativePhysicalFeatureQuery {
    pub bounds: NativeBounds,
    pub allowance: f64,
    pub cursor: Option<NativeBoundsQueryCursor>,
    pub radial_origin: NativePoint,
    pub radial_radius: f64,
    pub priority_anchors: Vec<NativePoint>,
}

#[napi(object)]
pub struct NativePhysicalFeatureAnswer {
    pub values: Vec<NativePhysicalFeature>,
    pub visited: f64,
    pub status: String,
    pub cursor: Option<NativeBoundsQueryCursor>,
}

#[napi(object, object_from_js = false)]
pub struct NativeConvexViewQuery {
    pub from: NativePoint,
    pub target: Vec<NativePoint>,
    pub allowance: f64,
}

#[napi(object)]
pub struct NativeConvexViewAnswer {
    pub visited: f64,
    pub complete: bool,
    pub clear: bool,
    pub blocking_vertices: Option<Vec<NativePoint>>,
}

#[napi(object, object_from_js = false)]
pub struct NativeBodySweepGroup {
    pub bounds: Vec<NativeBounds>,
    pub from: NativePoint,
    pub to: NativePoint,
    pub body: NativeBodyProfile,
    pub mode: String,
}

#[napi(object)]
pub struct NativeBodySweepAnswer {
    pub fraction: Option<f64>,
    pub tested: f64,
}

#[napi(object, object_from_js = false)]
pub struct NativeStandingColumn {
    pub x: f64,
    pub z: f64,
}

#[napi(object, object_from_js = false)]
pub struct NativeStandingColumnsQuery {
    pub columns: Vec<NativeStandingColumn>,
    pub reference_y: f64,
    pub body: NativeBodyProfile,
}

#[napi(object)]
pub struct NativeStandingSelection {
    pub index: f64,
    pub point: NativeSurfacePoint,
}

#[napi(object)]
pub struct NativeGeometryBinding {
    pub candidate_id: f64,
    pub base_cut: f64,
    pub generation: f64,
    pub geometry_revision: f64,
    pub serial: f64,
}

#[napi(object, object_from_js = false)]
pub struct NativeGeometryQueries {
    pub binding: NativeGeometryBinding,
    pub sight: Vec<NativeSightRay>,
    pub walking: Vec<NativeWalkingSegment>,
    pub support: Vec<NativeSupportQuery>,
    pub standing: Vec<NativeStandingQuery>,
    pub surface_lines: Vec<NativeSurfaceLineQuery>,
    pub sight_sweeps: Vec<NativeSightSweepQuery>,
    pub sound: Vec<NativeSightRay>,
    pub navigation: Vec<NativeNavigationRequest>,
    pub routes: Vec<NativeRouteQuery>,
    pub features: Vec<NativePhysicalFeatureQuery>,
    pub feature_ids: Vec<String>,
    pub convex_views: Vec<NativeConvexViewQuery>,
    pub body_sweeps: Vec<NativeBodySweepGroup>,
    pub standing_columns: Vec<NativeStandingColumnsQuery>,
}

#[napi(object)]
pub struct NativeSightSweep {
    pub fractions: Vec<f64>,
}

#[napi(object)]
pub struct NativeSurfaceLine {
    pub path: Vec<NativeSurfacePoint>,
}

#[napi(object)]
pub struct NativeNavigationResult {
    pub status: String,
    pub path: Vec<NativeSurfacePoint>,
    pub length: Option<f64>,
    pub reason: Option<String>,
}

#[napi(object)]
pub struct NativeNavigationAnswer {
    pub result: NativeNavigationResult,
    pub problem: Option<String>,
}

#[napi(object)]
pub struct NativeGeometryAnswers {
    pub binding: NativeGeometryBinding,
    pub sight: Vec<bool>,
    pub walking: Vec<bool>,
    pub support: Vec<Option<NativeSurfacePoint>>,
    pub standing: Vec<bool>,
    // A small object distinguishes a missing line from a present empty path
    // without depending on NAPI's nested nullable-array representation.
    pub surface_lines: Vec<Option<NativeSurfaceLine>>,
    pub sight_sweeps: Vec<NativeSightSweep>,
    pub sound: Vec<f64>,
    pub navigation: Vec<NativeNavigationAnswer>,
    pub routes: Vec<NativeRoutePlan>,
    pub features: Vec<NativePhysicalFeatureAnswer>,
    pub feature_ids: Vec<Option<NativePhysicalFeature>>,
    pub convex_views: Vec<NativeConvexViewAnswer>,
    pub body_sweeps: Vec<NativeBodySweepAnswer>,
    pub standing_columns: Vec<Option<NativeStandingSelection>>,
}

impl From<state::Point> for NativePoint {
    fn from(value: state::Point) -> Self {
        Self {
            x: value.x,
            y: value.y,
            z: value.z,
        }
    }
}
impl From<NativePoint> for state::Point {
    fn from(value: NativePoint) -> Self {
        Self {
            x: value.x,
            y: value.y,
            z: value.z,
        }
    }
}
impl From<state::SurfacePoint> for NativeSurfacePoint {
    fn from(value: state::SurfacePoint) -> Self {
        Self {
            x: value.x,
            y: value.y,
            z: value.z,
            surface_id: value.surface_id,
        }
    }
}
impl From<NativeSurfacePoint> for state::SurfacePoint {
    fn from(value: NativeSurfacePoint) -> Self {
        Self {
            x: value.x,
            y: value.y,
            z: value.z,
            surface_id: value.surface_id,
        }
    }
}
impl From<state::Bounds> for NativeBounds {
    fn from(value: state::Bounds) -> Self {
        Self {
            min: value.min.into(),
            max: value.max.into(),
        }
    }
}
impl From<NativeBounds> for state::Bounds {
    fn from(value: NativeBounds) -> Self {
        Self {
            min: value.min.into(),
            max: value.max.into(),
        }
    }
}
impl From<state::BodyProfile> for NativeBodyProfile {
    fn from(value: state::BodyProfile) -> Self {
        Self {
            id: value.id,
            radius: value.radius,
            height: value.height,
            eye_height: value.eye_height,
            ear_height: value.ear_height,
            interaction_height: value.interaction_height,
            max_slope: value.max_slope,
        }
    }
}
impl From<NativeBodyProfile> for state::BodyProfile {
    fn from(value: NativeBodyProfile) -> Self {
        Self {
            id: value.id,
            radius: value.radius,
            height: value.height,
            eye_height: value.eye_height,
            ear_height: value.ear_height,
            interaction_height: value.interaction_height,
            max_slope: value.max_slope,
        }
    }
}
impl From<core::SightRay> for NativeSightRay {
    fn from(value: core::SightRay) -> Self {
        Self {
            from: value.from.into(),
            to: value.to.into(),
        }
    }
}
impl TryFrom<state::NavigationRequest> for NativeNavigationRequest {
    type Error = Error;
    fn try_from(value: state::NavigationRequest) -> Result<Self> {
        Ok(Self {
            wait: value.wait,
            from: value.from.into(),
            destinations: value.destinations.into_iter().map(Into::into).collect(),
            outside_bounds: value.outside_bounds.map(Into::into),
            body: value.body.into(),
            geometry_revision: safe_number(value.geometry_revision)?,
        })
    }
}
impl TryFrom<NativeNavigationRequest> for state::NavigationRequest {
    type Error = Error;
    fn try_from(value: NativeNavigationRequest) -> Result<Self> {
        if value
            .wait
            .as_deref()
            .is_some_and(|wait| !matches!(wait, "world" | "entity"))
        {
            return Err(invalid("Invalid native navigation wait mode."));
        }
        Ok(Self {
            wait: value.wait,
            from: value.from.into(),
            destinations: value.destinations.into_iter().map(Into::into).collect(),
            outside_bounds: value.outside_bounds.map(Into::into),
            body: value.body.into(),
            geometry_revision: safe_integer(value.geometry_revision)?,
        })
    }
}
impl TryFrom<core::GeometryBinding> for NativeGeometryBinding {
    type Error = Error;
    fn try_from(value: core::GeometryBinding) -> Result<Self> {
        Ok(Self {
            candidate_id: safe_number(value.candidate_id)?,
            base_cut: safe_number(value.base_cut)?,
            generation: safe_number(value.generation)?,
            geometry_revision: safe_number(value.geometry_revision)?,
            serial: safe_number(value.serial)?,
        })
    }
}
impl TryFrom<NativeGeometryBinding> for core::GeometryBinding {
    type Error = Error;
    fn try_from(value: NativeGeometryBinding) -> Result<Self> {
        Ok(Self {
            candidate_id: safe_integer(value.candidate_id)?,
            base_cut: safe_integer(value.base_cut)?,
            generation: safe_integer(value.generation)?,
            geometry_revision: safe_integer(value.geometry_revision)?,
            serial: safe_integer(value.serial)?,
        })
    }
}

impl TryFrom<core::GeometryQueries> for NativeGeometryQueries {
    type Error = Error;
    fn try_from(value: core::GeometryQueries) -> Result<Self> {
        Ok(Self {
            binding: value.binding.try_into()?,
            sight: value.sight.into_iter().map(Into::into).collect(),
            walking: value
                .walking
                .into_iter()
                .map(|value| NativeWalkingSegment {
                    from: value.from.into(),
                    to: value.to.into(),
                    body: value.body.into(),
                })
                .collect(),
            support: value
                .support
                .into_iter()
                .map(|value| NativeSupportQuery {
                    point: value.point.into(),
                    surface_id: value.surface_id,
                })
                .collect(),
            standing: value
                .standing
                .into_iter()
                .map(|value| NativeStandingQuery {
                    point: value.point.into(),
                    body: value.body.into(),
                })
                .collect(),
            surface_lines: value
                .surface_lines
                .into_iter()
                .map(|value| NativeSurfaceLineQuery {
                    from: value.from.into(),
                    x: value.x,
                    z: value.z,
                    body: value.body.into(),
                })
                .collect(),
            sight_sweeps: value
                .sight_sweeps
                .into_iter()
                .map(|value| NativeSightSweepQuery {
                    eye_from: value.eye_from.into(),
                    eye_to: value.eye_to.into(),
                    point_from: value.point_from.into(),
                    point_to: value.point_to.into(),
                })
                .collect(),
            sound: value.sound.into_iter().map(Into::into).collect(),
            navigation: value
                .navigation
                .into_iter()
                .map(TryInto::try_into)
                .collect::<Result<_>>()?,
            routes: value
                .routes
                .into_iter()
                .map(|value| match value {
                    core::RouteQuery::Surface { from, to, body } => NativeRouteQuery {
                        kind: "surface".to_owned(),
                        from: from.into(),
                        to: Some(to.into()),
                        bounds: None,
                        body: body.into(),
                    },
                    core::RouteQuery::Outside { from, bounds, body } => NativeRouteQuery {
                        kind: "outside".to_owned(),
                        from: from.into(),
                        to: None,
                        bounds: Some(bounds.into()),
                        body: body.into(),
                    },
                })
                .collect(),
            features: value
                .features
                .into_iter()
                .map(|value| {
                    Ok(NativePhysicalFeatureQuery {
                        bounds: value.bounds.into(),
                        allowance: safe_number(value.allowance)?,
                        cursor: value.cursor.map(TryInto::try_into).transpose()?,
                        radial_origin: value.radial_origin.into(),
                        radial_radius: value.radial_radius,
                        priority_anchors: value
                            .priority_anchors
                            .into_iter()
                            .map(Into::into)
                            .collect(),
                    })
                })
                .collect::<Result<_>>()?,
            feature_ids: value.feature_ids,
            body_sweeps: value
                .body_sweeps
                .into_iter()
                .map(|value| NativeBodySweepGroup {
                    bounds: value.bounds.into_iter().map(Into::into).collect(),
                    from: value.from.into(),
                    to: value.to.into(),
                    body: value.body.into(),
                    mode: match value.mode {
                        core::BodySweepMode::FirstHit => "first-hit",
                        core::BodySweepMode::NearestHit => "nearest-hit",
                    }
                    .to_owned(),
                })
                .collect(),
            standing_columns: value
                .standing_columns
                .into_iter()
                .map(|value| NativeStandingColumnsQuery {
                    columns: value
                        .columns
                        .into_iter()
                        .map(|value| NativeStandingColumn {
                            x: value.x,
                            z: value.z,
                        })
                        .collect(),
                    reference_y: value.reference_y,
                    body: value.body.into(),
                })
                .collect(),
            convex_views: value
                .convex_views
                .into_iter()
                .map(|value| {
                    Ok(NativeConvexViewQuery {
                        from: value.from.into(),
                        target: value.target.into_iter().map(Into::into).collect(),
                        allowance: safe_number(value.allowance)?,
                    })
                })
                .collect::<Result<_>>()?,
        })
    }
}

impl TryFrom<NativeGeometryAnswers> for core::GeometryAnswers {
    type Error = Error;
    fn try_from(value: NativeGeometryAnswers) -> Result<Self> {
        Ok(Self {
            binding: value.binding.try_into()?,
            sight: value.sight,
            walking: value.walking,
            support: value
                .support
                .into_iter()
                .map(|value| value.map(Into::into))
                .collect(),
            standing: value.standing,
            surface_lines: value
                .surface_lines
                .into_iter()
                .map(|value| {
                    value.map(|value| core::SurfaceLineAnswer {
                        path: value.path.into_iter().map(Into::into).collect(),
                    })
                })
                .collect(),
            sight_sweeps: value
                .sight_sweeps
                .into_iter()
                .map(|value| core::SightSweep {
                    fractions: value.fractions,
                })
                .collect(),
            sound: value.sound,
            navigation: value
                .navigation
                .into_iter()
                .map(|value| {
                    Ok(core::NavigationAnswer {
                        result: value.result.try_into()?,
                        problem: value.problem,
                    })
                })
                .collect::<Result<_>>()?,
            routes: value
                .routes
                .into_iter()
                .map(TryInto::try_into)
                .collect::<Result<_>>()?,
            features: value
                .features
                .into_iter()
                .map(TryInto::try_into)
                .collect::<Result<_>>()?,
            feature_ids: value
                .feature_ids
                .into_iter()
                .map(|value| value.map(TryInto::try_into).transpose())
                .collect::<Result<_>>()?,
            body_sweeps: value
                .body_sweeps
                .into_iter()
                .map(|value| {
                    Ok(core::BodySweepAnswer {
                        fraction: value.fraction,
                        tested: safe_integer(value.tested)?,
                    })
                })
                .collect::<Result<_>>()?,
            standing_columns: value
                .standing_columns
                .into_iter()
                .map(|value| {
                    value
                        .map(|value| {
                            Ok(core::StandingSelection {
                                index: safe_integer(value.index)?,
                                point: value.point.into(),
                            })
                        })
                        .transpose()
                })
                .collect::<Result<_>>()?,
            convex_views: value
                .convex_views
                .into_iter()
                .map(|value| {
                    Ok(core::ConvexViewAnswer {
                        visited: safe_integer(value.visited)?,
                        complete: value.complete,
                        clear: value.clear,
                        blocking_vertices: value
                            .blocking_vertices
                            .map(|values| values.into_iter().map(Into::into).collect()),
                    })
                })
                .collect::<Result<_>>()?,
        })
    }
}

impl TryFrom<BoundsQueryCursor> for NativeBoundsQueryCursor {
    type Error = Error;
    fn try_from(value: BoundsQueryCursor) -> Result<Self> {
        Ok(Self {
            pending: value
                .pending
                .into_iter()
                .map(|path| {
                    path.into_iter()
                        .map(safe_cursor_number)
                        .collect::<Result<_>>()
                })
                .collect::<Result<_>>()?,
            offset: safe_number(value.offset)?,
            leaf: value.leaf,
            truncated: value.truncated,
        })
    }
}

impl TryFrom<NativeBoundsQueryCursor> for BoundsQueryCursor {
    type Error = Error;
    fn try_from(value: NativeBoundsQueryCursor) -> Result<Self> {
        if value.truncated == Some(false) {
            return Err(invalid("Invalid native physical cursor coverage flag."));
        }
        let cursor = Self {
            pending: value
                .pending
                .into_iter()
                .map(|path| {
                    path.into_iter()
                        .map(safe_cursor_integer)
                        .collect::<Result<_>>()
                })
                .collect::<Result<_>>()?,
            offset: safe_integer(value.offset)?,
            leaf: value.leaf,
            truncated: value.truncated,
        };
        if !cursor.validate() {
            return Err(invalid("Invalid native physical cursor."));
        }
        Ok(cursor)
    }
}

impl TryFrom<NativePhysicalFeature> for core::PhysicalFeature {
    type Error = Error;
    fn try_from(value: NativePhysicalFeature) -> Result<Self> {
        let kind = match value.kind.as_str() {
            "support" => core::PhysicalFeatureKind::Support,
            "solid-face" => core::PhysicalFeatureKind::SolidFace,
            _ => return Err(invalid("Unknown native physical feature kind.")),
        };
        Ok(Self {
            id: value.id,
            source_id: value.source_id,
            kind,
            vertices: value
                .vertices
                .into_iter()
                .map(Into::into)
                .collect::<Vec<_>>()
                .try_into()
                .map_err(|_| invalid("A native physical feature needs four vertices."))?,
            normal: value.normal.into(),
            bounds: value.bounds.into(),
        })
    }
}

impl TryFrom<NativePhysicalFeatureAnswer> for core::PhysicalFeatureAnswer {
    type Error = Error;
    fn try_from(value: NativePhysicalFeatureAnswer) -> Result<Self> {
        let status = match value.status.as_str() {
            "complete" => core::PhysicalQueryStatus::Complete,
            "partial" => core::PhysicalQueryStatus::Partial,
            _ => return Err(invalid("Unknown native physical coverage status.")),
        };
        Ok(Self {
            values: value
                .values
                .into_iter()
                .map(TryInto::try_into)
                .collect::<Result<_>>()?,
            visited: safe_integer(value.visited)?,
            status,
            cursor: value.cursor.map(TryInto::try_into).transpose()?,
        })
    }
}

impl TryFrom<NativeNavigationResult> for core::NavigationResult {
    type Error = Error;
    fn try_from(value: NativeNavigationResult) -> Result<Self> {
        if value.status == "reached" {
            if value.reason.is_some() {
                return Err(invalid("A reached route cannot contain a refusal reason."));
            }
            return Ok(Self::Reached {
                path: value.path.into_iter().map(Into::into).collect(),
                length: value
                    .length
                    .ok_or_else(|| invalid("A reached route has no length."))?,
            });
        }
        if !value.path.is_empty() || value.length.is_some() {
            return Err(invalid("A refused route cannot contain a path or length."));
        }
        Ok(match value.status.as_str() {
            "no-route" => Self::NoRoute {
                path: [],
                reason: value.reason,
            },
            "invalid-endpoint" => Self::InvalidEndpoint {
                path: [],
                reason: value.reason,
            },
            "budget-exceeded" => Self::BudgetExceeded {
                path: [],
                reason: value.reason,
            },
            "unsafe-route" => Self::UnsafeRoute {
                path: [],
                reason: value.reason,
            },
            "unavailable" => Self::Unavailable {
                path: [],
                reason: value.reason,
            },
            _ => return Err(invalid("Unknown physical route result.")),
        })
    }
}

impl TryFrom<NativeRoutePlan> for core::RoutePlan {
    type Error = Error;
    fn try_from(value: NativeRoutePlan) -> Result<Self> {
        let expanded = safe_integer(value.expanded)?;
        if value.status == "reached" {
            if value.request.is_some() {
                return Err(invalid(
                    "A completed route cannot contain a pending request.",
                ));
            }
            return Ok(Self::Reached {
                path: value.path.into_iter().map(Into::into).collect(),
                length: value
                    .length
                    .ok_or_else(|| invalid("A completed route has no length."))?,
                expanded,
            });
        }
        if !value.path.is_empty() || value.length.is_some() {
            return Err(invalid(
                "An unfinished route cannot contain a completed path or length.",
            ));
        }
        if value.status == "pending" {
            return Ok(Self::Pending {
                path: [],
                request: value
                    .request
                    .ok_or_else(|| invalid("A pending route has no request."))?
                    .try_into()?,
                expanded,
            });
        }
        if value.request.is_some() {
            return Err(invalid("A refused route cannot contain a pending request."));
        }
        Ok(match value.status.as_str() {
            "invalid-endpoint" => Self::InvalidEndpoint { path: [], expanded },
            "no-route" => Self::NoRoute { path: [], expanded },
            "budget-exceeded" => Self::BudgetExceeded { path: [], expanded },
            _ => return Err(invalid("Unknown direct route result.")),
        })
    }
}

fn safe_number(value: u64) -> Result<f64> {
    if value > MAX_SAFE_INTEGER {
        Err(invalid(
            "Native geometry binding exceeds the bridge integer range.",
        ))
    } else {
        Ok(value as f64)
    }
}
fn safe_integer(value: f64) -> Result<u64> {
    if !value.is_finite() || value < 0.0 || value > MAX_SAFE_INTEGER as f64 || value.fract() != 0.0
    {
        Err(invalid("Invalid native geometry binding."))
    } else {
        Ok(value as u64)
    }
}
fn safe_cursor_number(value: i64) -> Result<f64> {
    if value.unsigned_abs() > MAX_SAFE_INTEGER {
        Err(invalid(
            "Native physical cursor exceeds the bridge integer range.",
        ))
    } else {
        Ok(value as f64)
    }
}
fn safe_cursor_integer(value: f64) -> Result<i64> {
    if !value.is_finite() || value.abs() > MAX_SAFE_INTEGER as f64 || value.fract() != 0.0 {
        Err(invalid("Invalid native physical cursor path."))
    } else {
        Ok(value as i64)
    }
}
fn invalid(message: &str) -> Error {
    Error::new(Status::InvalidArg, message)
}
