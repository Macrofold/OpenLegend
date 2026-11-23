//! Process-owned physical preparation against one immutable installed map.
//! Results certify a query binding for the simulation's existing candidate owner.

use openlegend_simulation::{
    geometry::{
        BodySweepAnswer, BodySweepMode, GeometryAnswers, GeometryMap, GeometryQueries,
        HorizontalDirection, MovementRayHit, RoutePlan, RouteQuery, SightRay, StandingSelection,
        SurfaceLineAnswer,
    },
    host::{ByteBudget, ByteReservation, CapacityError, ResidentReservation},
    state::{Bounds, Point, SurfacePoint},
};
use std::{
    fmt,
    mem::size_of,
    sync::{Mutex, TryLockError},
};

mod collision;
mod features;
pub(crate) mod index;
mod navigation;
mod recast;
mod release;
mod scene;
mod sight;
mod walking;
mod placement;

use features::Features;
use recast::{NavigationMesh, Recast};
pub use release::NavigationReleaseError;
use scene::Scene;

const EPS: f64 = 1e-5;
const SKIN: f64 = 0.01;
const MAX_EXTENT: f64 = 512.0;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SpatialError {
    Capacity,
    StaleGeometry,
    InvalidMap,
    InvalidQuery,
    NavigationUnavailable,
    NavigationBusy,
}
impl fmt::Display for SpatialError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            Self::Capacity => "physical preparation exceeded the host byte allowance",
            Self::StaleGeometry => "physical preparation names an obsolete map revision",
            Self::InvalidMap => "physical preparation requires a validated current map",
            Self::InvalidQuery => "physical preparation received an invalid bound request",
            Self::NavigationUnavailable => "the installed map has no usable navigation artifact",
            Self::NavigationBusy => {
                "the installed navigation provider is already answering another request"
            }
        })
    }
}
impl std::error::Error for SpatialError {}
impl From<CapacityError> for SpatialError {
    fn from(_: CapacityError) -> Self {
        Self::Capacity
    }
}

pub struct FundedAnswers {
    answers: GeometryAnswers,
    allocation: ByteReservation,
}
impl FundedAnswers {
    /// Keep the reservation through the operation that actually consumes answers.
    pub fn into_parts(self) -> (GeometryAnswers, ByteReservation) {
        (self.answers, self.allocation)
    }
}

pub struct SpatialProvider {
    revision: u64,
    width: usize,
    height: usize,
    walkable: Vec<bool>,
    authored_supports: usize,
    scene: Scene,
    features: Features,
    navigation: Option<Mutex<Recast>>,
    surface_units: usize,
    _resident: ResidentReservation,
}

impl SpatialProvider {
    pub(crate) fn clear_interaction_line(
        &self,
        ray: &openlegend_simulation::geometry::SightRay,
    ) -> bool {
        self.clear_sight(ray.from, ray.to)
    }

    /// Prepare the selected installation's physical extents once. The caller's
    /// admitted immutable map remains shared. Derived shapes and indexes have
    /// separate resident ownership until this provider is dropped.
    pub fn new(map: &GeometryMap, budget: &ByteBudget) -> Result<Self, SpatialError> {
        let layout = &map.spatial;
        if !(2..=128).contains(&map.width)
            || !(2..=128).contains(&map.height)
            || layout.version != 1
            || !(1..=32).contains(&layout.surfaces.len())
            || map.tiles.len() != map.height as usize
            || map.tiles.iter().any(|row| {
                row.len() != map.width as usize
                    || row.iter().any(|tile| !map.terrain.contains_key(tile))
            })
            || layout.surfaces.iter().any(|s| {
                ![
                    s.min_x,
                    s.max_x,
                    s.min_z,
                    s.max_z,
                    s.y,
                    s.slope_x,
                    s.slope_z,
                    s.thickness,
                ]
                .into_iter()
                .all(f64::is_finite)
                    || s.min_x >= s.max_x
                    || s.min_z >= s.max_z
                    || s.thickness <= 0.0
                    || !attenuation(s.acoustic_transmission)
            })
            || layout.blockers.iter().any(|b| {
                !volume(&b.bounds)
                    || !attenuation(b.acoustic_transmission)
                    || b.boxes.as_ref().is_some_and(|bs| {
                        bs.is_empty() || b.panel.is_some() || bs.iter().any(|b| !volume(b))
                    })
            })
        {
            return Err(SpatialError::InvalidMap);
        }
        let terrain_solids = map
            .tiles
            .iter()
            .flatten()
            .filter(|tile| map.terrain[*tile].solid.is_some())
            .count();
        let pieces = layout
            .blockers
            .iter()
            .map(|b| b.boxes.as_ref().map_or(1, Vec::len))
            .sum::<usize>()
            + terrain_solids;
        if pieces > 256 {
            return Err(SpatialError::InvalidMap);
        }
        let source_units = layout
            .surfaces
            .iter()
            .map(|s| s.id.len())
            .chain(layout.blockers.iter().map(|b| b.id.len()))
            .max()
            .unwrap_or(0)
            .max(24);
        let shape_count = layout.surfaces.len() + pieces;
        // At most eight hull vertices, six planes, and fixed finite per-shape
        // solver/index storage. Shallow source/level identifiers stay separate.
        let shape_bytes =
            shape_count * (4_096 + 4 * source_units) + (map.width * map.height) as usize;
        let scratch = budget.reserve(2 * shape_bytes)?;
        let scene = Scene::new(map)?;
        let features = Features::new(map, &scene, source_units, budget)?;
        let surface_units = scene.supports.iter().map(|s| s.id.len()).max().unwrap_or(0);
        let walkable = map
            .tiles
            .iter()
            .flatten()
            .map(|tile| map.terrain[tile].walkable)
            .collect();
        let resident = budget.resident().reserve(shape_bytes)?;
        drop(scratch);
        Ok(Self {
            revision: layout.revision,
            width: map.width as usize,
            height: map.height as usize,
            walkable,
            authored_supports: layout.surfaces.len(),
            scene,
            features,
            navigation: None,
            surface_units,
            _resident: resident,
        })
    }

    /// Answer the existing geometry product in input order. Work stays inside
    /// the host's admitted compute job. Output allocation accompanies each
    /// answer independently, including across a rejected candidate.
    pub fn compute(
        &self,
        q: &GeometryQueries,
        budget: &ByteBudget,
    ) -> Result<FundedAnswers, SpatialError> {
        if q.binding.geometry_revision != self.revision {
            return Err(SpatialError::StaleGeometry);
        }
        if q.sight
            .iter()
            .chain(&q.sound)
            .chain(&q.movement_rays)
            .any(|r| !finite(r.from) || !finite(r.to))
        {
            return Err(SpatialError::InvalidQuery);
        }
        if q.flight.iter().any(|leg| {
            !finite(leg.from)
                || !finite(leg.to)
                || leg.supports.len() > 2
                || leg
                    .supports
                    .iter()
                    .any(|surface| self.scene.named(surface).is_none())
        }) {
            return Err(SpatialError::InvalidQuery);
        }
        let (mut allocation, _scratch) = self.reserve_answers(q, budget)?;
        let sight = {
            // Support, movement and routes can arrive without any sight rays.
            #[cfg(feature = "profile-campaign")]
            let _profile = (!q.sight.is_empty()).then(|| {
                let scope = openlegend_simulation::profile_scope!(SIGHT);
                openlegend_simulation::profile_count!(SIGHT_QUERIES, q.sight.len() as u64);
                scope
            });
            q.sight
                .iter()
                .map(|r| self.clear_sight(r.from, r.to))
                .collect()
        };
        let walking = q
            .walking
            .iter()
            .map(|r| self.can_walk(&r.from, &r.to, &r.body))
            .collect();
        let flight = q.flight.iter().map(|leg| self.can_fly(leg)).collect();
        let movement_rays = collect_funded_answers(&q.movement_rays, |ray| {
            self.movement_ray(ray, &mut allocation)
        })?;
        let support = q
            .support
            .iter()
            .map(|q| match &q.relative {
                Some(r) => self.relative(q.point, q.surface_id.as_deref()?, r.heading, r.x, r.z),
                None => self.support(q.point, q.surface_id.as_deref()),
            })
            .collect();
        let standing = q
            .standing
            .iter()
            .map(|q| self.can_stand(&q.point, &q.body))
            .collect();
        let surface_lines = q
            .surface_lines
            .iter()
            .map(|q| {
                self.surface_line(&q.from, q.x, q.z, q.body.as_ref())
                    .map(|path| SurfaceLineAnswer { path })
            })
            .collect();
        let sight_sweeps = collect_funded_answers(&q.sight_sweeps, |q| self.sight_sweep(q))?;
        let sound = q.sound.iter().map(|r| self.sound(r.from, r.to)).collect();
        let routes = q.routes.iter().map(|q| self.route(q)).collect();
        let features = collect_funded_answers(&q.features, |q| self.features.query(q))?;
        let feature_ids = q
            .feature_ids
            .iter()
            .map(|id| self.features.get(id).cloned())
            .collect();
        let convex_views = collect_funded_answers(&q.convex_views, |q| self.convex(q))?;
        let body_sweeps = q
            .body_sweeps
            .iter()
            .map(|q| {
                let mut tested = 0;
                let mut fraction: Option<f64> = None;
                for bounds in &q.bounds {
                    tested += 1;
                    if let Some(hit) = collision::sweep_box(bounds, q.from, q.to, &q.body) {
                        fraction = Some(fraction.map_or(hit, |f| f.min(hit)));
                        if q.mode == BodySweepMode::FirstHit {
                            break;
                        }
                    }
                }
                BodySweepAnswer { tested, fraction }
            })
            .collect();
        let standing_columns = q
            .standing_columns
            .iter()
            .map(|q| {
                let direction = HorizontalDirection {
                    x: q.angle.cos(),
                    z: q.angle.sin(),
                };
                q.distances.iter().enumerate().find_map(|(index, &d)| {
                    let point = self.standing_column(
                        q.origin.x + direction.x * d,
                        q.origin.z + direction.z * d,
                        q.origin.y,
                        &q.body,
                    )?;
                    Some(StandingSelection {
                        index: index as u64,
                        point,
                        direction,
                    })
                })
            })
            .collect();
        let navigation = if q.navigation.is_empty() {
            Vec::new()
        } else {
            let mut recast = self
                .navigation
                .as_ref()
                .ok_or(SpatialError::NavigationUnavailable)?
                .try_lock()
                .map_err(|err| match err {
                    TryLockError::WouldBlock => SpatialError::NavigationBusy,
                    TryLockError::Poisoned(_) => SpatialError::NavigationUnavailable,
                })?;
            collect_funded_answers(&q.navigation, |q| self.navigation_answer(&mut recast, q))?
        };
        let answers = GeometryAnswers {
            binding: q.binding,
            sight,
            walking,
            flight,
            movement_rays,
            support,
            standing,
            surface_lines,
            sight_sweeps,
            sound,
            navigation,
            routes,
            features,
            feature_ids,
            convex_views,
            body_sweeps,
            standing_columns,
            placement_volumes: q.placement_volumes.iter().map(|volume| self.placement_clearance(volume)).collect(),
            placement_stances: q.placement_stances.iter().map(|query| self.placement_stances(query)).collect(),
        };
        Ok(FundedAnswers {
            answers,
            allocation,
        })
    }

    /// Keep only the nearest tied collider IDs. The index's visit order does
    /// not settle ties between physical geometry and living/target bodies.
    fn movement_ray(
        &self,
        ray: &SightRay,
        allocation: &mut ByteReservation,
    ) -> Result<Option<MovementRayHit>, SpatialError> {
        let mut fraction = f64::INFINITY;
        let mut ids = Vec::new();
        let failed = self.scene.visit_segment(ray.from, ray.to, None, &mut |shape, (at, _)| {
            if shape.solid.is_none() || at > fraction {
                return false;
            }
            if at < fraction {
                fraction = at;
                ids.clear();
            }
            let id = shape.id.as_str();
            if !ids.contains(&id) {
                // Borrowed tie keys fit the existing per-shape scratch. Only
                // the saved result extends the independent answer allowance.
                if ids.try_reserve(1).is_err() {
                    return true;
                }
                ids.push(id);
            }
            false
        });
        if failed {
            return Err(SpatialError::Capacity);
        }
        if ids.is_empty() {
            return Ok(None);
        }
        let bytes = ids.iter().try_fold(allocation.bytes(), |bytes, id| {
            bytes.checked_add(size_of::<String>() + id.len())
        }).ok_or(SpatialError::Capacity)?;
        allocation.resize(bytes)?;
        let mut collider_ids = Vec::new();
        collider_ids.try_reserve_exact(ids.len()).map_err(|_| SpatialError::Capacity)?;
        collider_ids.extend(ids.into_iter().map(str::to_owned));
        Ok(Some(MovementRayHit { fraction, collider_ids }))
    }

    fn reserve_answers(
        &self,
        q: &GeometryQueries,
        budget: &ByteBudget,
    ) -> Result<(ByteReservation, ByteReservation), SpatialError> {
        let line_points = 2 * self.authored_supports;
        let point = size_of::<SurfacePoint>() + self.surface_units;
        let roots = 54 * self.scene.shapes.len();
        let features = &self.features;
        let mut bytes = size_of::<GeometryAnswers>()
            + q.sight.len()
            + q.walking.len()
            + q.flight.len()
            + size_of::<Option<MovementRayHit>>() * q.movement_rays.len()
            + q.standing.len()
            + 8 * q.sound.len()
            + size_of::<BodySweepAnswer>() * q.body_sweeps.len()
            + (size_of::<StandingSelection>() + self.surface_units) * q.standing_columns.len()
            + q.placement_volumes.len() * size_of::<openlegend_simulation::geometry::PlacementClearance>()
            + q.placement_stances.iter().map(|query| {
                use openlegend_simulation::geometry::PlacementStance;
                size_of::<Vec<PlacementStance>>() + 8 * (size_of::<PlacementStance>() + query.site.surface_id.len())
            }).sum::<usize>()
            + size_of::<Option<SurfacePoint>>() * q.support.len()
            + self.surface_units * q.support.len()
            + (size_of::<Option<SurfaceLineAnswer>>() + 2 * line_points * point)
                * q.surface_lines.len()
            + (size_of::<openlegend_simulation::geometry::SightSweep>()
                + 2 * roots * size_of::<f64>())
                * q.sight_sweeps.len()
            + (size_of::<openlegend_simulation::geometry::ConvexViewAnswer>()
                + 8 * size_of::<Point>())
                * q.convex_views.len()
            + features.element_bytes() * q.feature_ids.len();
        let mut scratch = 4_096 + self.scene.supports.len() * 48 + self.scene.shapes.len() * 64;
        for query in &q.routes {
            let body = match query {
                RouteQuery::Approach { body, .. }
                | RouteQuery::Outside { body, .. }
                | RouteQuery::Surface { body, .. } => body,
            };
            bytes += size_of::<RoutePlan>() + 2 * (line_points + 13) * point + body.id.len();
            if let RouteQuery::Approach { reach, .. } = query {
                // Existing finite square at this reach, once per indexed surface.
                let cells = (2.0 * reach.clamp(1.0, 12.0) + 1.0).ceil() as usize;
                scratch = scratch.max(3 * point * cells * cells * self.scene.supports.len());
            }
        }
        if !q.navigation.is_empty() {
            bytes += q.navigation.len()
                * (2 * recast::MAX_PATH * point
                    + size_of::<openlegend_simulation::geometry::NavigationAnswer>()
                    + 128);
            scratch += 2 * recast::MAX_PATH * (point + 2 * size_of::<Point>())
                + recast::SEARCH_NODES * size_of::<i32>()
                + 256 * self.scene.supports.len();
        }
        for query in &q.features {
            let visits = (query.allowance as usize).min(features.len() * 3);
            bytes += size_of::<openlegend_simulation::geometry::PhysicalFeatureAnswer>()
                + 2 * features.element_bytes() * visits
                + features.cursor_bytes();
            scratch = scratch.max(features.working_bytes(visits));
        }
        Ok((budget.reserve(bytes)?, budget.reserve(scratch)?))
    }
}

/// Allocate the outer answer vector against the caller's existing per-query reservation.
/// Fallible iterator collection can grow past that allocation even when each query returns one answer.
fn collect_funded_answers<Q, A>(
    queries: &[Q],
    mut answer: impl FnMut(&Q) -> Result<A, SpatialError>,
) -> Result<Vec<A>, SpatialError> {
    let mut answers = Vec::new();
    answers
        .try_reserve_exact(queries.len())
        .map_err(|_| SpatialError::Capacity)?;
    for query in queries {
        answers.push(answer(query)?);
    }
    Ok(answers)
}

fn attenuation(value: f64) -> bool {
    (0.0..=1.0).contains(&value)
}
fn volume(b: &Bounds) -> bool {
    valid_bounds(b)
        && coordinates(b.min)
            .iter()
            .zip(coordinates(b.max))
            .all(|(a, b)| *a < b)
}
fn valid_bounds(b: &Bounds) -> bool {
    finite(b.min)
        && finite(b.max)
        && coordinates(b.min)
            .iter()
            .zip(coordinates(b.max))
            .all(|(a, b)| *a <= b)
}
fn finite(p: Point) -> bool {
    coordinates(p)
        .into_iter()
        .all(|v| (-MAX_EXTENT..=MAX_EXTENT).contains(&v))
}
fn coordinates(p: Point) -> [f64; 3] {
    [p.x, p.y, p.z]
}
fn point([x, y, z]: [f64; 3]) -> Point {
    Point { x, y, z }
}
fn add(a: Point, b: Point) -> Point {
    Point {
        x: a.x + b.x,
        y: a.y + b.y,
        z: a.z + b.z,
    }
}
fn sub(a: Point, b: Point) -> Point {
    Point {
        x: a.x - b.x,
        y: a.y - b.y,
        z: a.z - b.z,
    }
}
fn dot(a: Point, b: Point) -> f64 {
    a.x * b.x + a.y * b.y + a.z * b.z
}
fn scale(p: Point, s: f64) -> Point {
    Point {
        x: p.x * s,
        y: p.y * s,
        z: p.z * s,
    }
}
fn cross(a: Point, b: Point) -> Point {
    Point {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x,
    }
}
fn lerp(a: Point, b: Point, t: f64) -> Point {
    openlegend_simulation::spatial::interpolate(a, b, t)
}
fn length(a: Point) -> f64 {
    distance(a, point([0.0; 3]))
}
fn distance(a: Point, b: Point) -> f64 {
    openlegend_simulation::spatial::distance(a, b)
}
fn extent(points: impl IntoIterator<Item = Point>) -> Bounds {
    let mut lo = [f64::INFINITY; 3];
    let mut hi = [f64::NEG_INFINITY; 3];
    for p in points {
        for (i, q) in coordinates(p).into_iter().enumerate() {
            lo[i] = lo[i].min(q);
            hi[i] = hi[i].max(q);
        }
    }
    Bounds {
        min: point(lo),
        max: point(hi),
    }
}
fn overlaps(a: &Bounds, b: &Bounds, padding: f64) -> bool {
    let [al, ah, bl, bh] = [a.min, a.max, b.min, b.max].map(coordinates);
    (0..3).all(|i| al[i] <= bh[i] + padding && ah[i] >= bl[i] - padding)
}

/// The validated map ID alphabet is ASCII alphanumeric plus `_`, `-` and `:`.
/// Its en-US ordering puts that punctuation first, compares letters without
/// case, then breaks a spelling tie lower-case first. This is the current
/// Source `localeCompare` order used for support/attenuation ties.
fn id_cmp(a: &str, b: &str) -> std::cmp::Ordering {
    let key = |b: u8| match b {
        b'_' => 0,
        b'-' => 1,
        b':' => 2,
        _ => b.to_ascii_lowercase(),
    };
    a.bytes().map(key).cmp(b.bytes().map(key)).then_with(|| {
        a.bytes()
            .map(|b| b.is_ascii_uppercase())
            .cmp(b.bytes().map(|b| b.is_ascii_uppercase()))
    })
}
