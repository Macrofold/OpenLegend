//! Recognize actual supports, then check clearance and continuous support along a leg.

use super::scene::StandardSupport;
use super::{Bounds, EPS, Point, SpatialProvider, SurfacePoint, distance, finite, lerp};
use openlegend_simulation::{
    geometry::{FlightSegment, RoutePlan, RouteQuery},
    state::{BodyProfile, NavigationRequest},
};

pub(super) const SUPPORT: f64 = 0.015;
const MAX_PATH_POINTS: usize = 2048;

/// Clamping a sloped patch at its edges makes its height piecewise linear.
/// Test both ends and every crossed edge of the actual contact interval.
fn above_support(
    surface: &StandardSupport,
    from: Point,
    to: Point,
    (enter, exit): (f64, f64),
    allowance: f64,
) -> bool {
    let above = |t| {
        let point = lerp(from, to, t);
        point.y + allowance + SUPPORT
            >= surface.y_at(
                point.x.clamp(surface.min_x, surface.max_x),
                point.z.clamp(surface.min_z, surface.max_z),
            )
    };
    above(enter)
        && above(exit)
        && [
            (from.x, to.x, surface.min_x, surface.max_x),
            (from.z, to.z, surface.min_z, surface.max_z),
        ]
        .into_iter()
        .all(|(a, b, min, max)| {
            let delta = b - a;
            delta.abs() < EPS
                || [min, max].into_iter().all(|edge| {
                    let t = (edge - a) / delta;
                    t <= enter || t >= exit || above(t)
                })
        })
}

impl SpatialProvider {
    fn is_on_support(&self, point: Point, surface: &StandardSupport) -> bool {
        surface.contains(point)
            && (surface.y_at(point.x, point.z) - point.y).abs() <= SUPPORT
            && (!surface.terrain || self.terrain_walkable(point))
    }

    pub(super) fn matches_named_support(&self, point: Point, id: &str) -> bool {
        self.scene
            .named(id)
            .is_some_and(|surface| self.is_on_support(point, surface))
    }

    pub(super) fn support(&self, point: Point, surface: Option<&str>) -> Option<SurfacePoint> {
        if !finite(point) {
            return None;
        }
        let on = |s: &StandardSupport| {
            self.is_on_support(point, s)
                .then(|| s.point(point.x, point.z))
        };
        if let Some(surface) = surface {
            return on(self.scene.named(surface)?);
        }
        let bounds = Bounds {
            min: Point {
                y: point.y - SUPPORT,
                ..point
            },
            max: Point {
                y: point.y + SUPPORT,
                ..point
            },
        };
        self.scene.supports_in(&bounds).into_iter().find_map(on)
    }

    pub(super) fn relative(
        &self,
        from: Point,
        surface: &str,
        heading: f64,
        x: f64,
        z: f64,
    ) -> Option<SurfacePoint> {
        let s = self.scene.named(surface)?;
        let dx = from.x + -heading.cos() * x + heading.sin() * z;
        let dz = from.z + heading.sin() * x + heading.cos() * z;
        let point = Point {
            x: dx,
            y: from.y,
            z: dz,
        };
        s.contains(point).then(|| s.point(dx, dz))
    }

    pub(super) fn standing_column(
        &self,
        x: f64,
        z: f64,
        y: f64,
        body: &BodyProfile,
    ) -> Option<SurfacePoint> {
        let bounds = Bounds {
            min: Point {
                x,
                y: f64::NEG_INFINITY,
                z,
            },
            max: Point {
                x,
                y: f64::INFINITY,
                z,
            },
        };
        let mut choices = self.scene.supports_in(&bounds);
        choices.sort_by(|a, b| {
            (a.y_at(x, z) - y)
                .abs()
                .total_cmp(&(b.y_at(x, z) - y).abs())
                .then_with(|| super::id_cmp(&a.id, &b.id))
        });
        choices
            .into_iter()
            .map(|s| s.point(x, z))
            .find(|p| self.can_stand(p, body))
    }

    pub(super) fn can_stand(&self, point: &SurfacePoint, body: &BodyProfile) -> bool {
        let Some(s) = self.scene.named(&point.surface_id) else {
            return false;
        };
        let p = point.point();
        if !finite(p)
            || !s.contains(p)
            || (s.y_at(p.x, p.z) - p.y).abs() > SUPPORT
            || (s.terrain && !self.terrain_walkable(p))
            || s.slope_x.hypot(s.slope_z) > body.max_slope
        {
            return false;
        }
        self.walk_clear_with_support(point, point, s, body)
    }

    fn walk_clear_with_support(
        &self,
        from: &SurfacePoint,
        to: &SurfacePoint,
        support: &StandardSupport,
        body: &BodyProfile,
    ) -> bool {
        let a = from.point();
        let b = to.point();
        let mut blocks = |shape: &super::scene::Shape, (enter, exit)| {
            let Some(solid) = &shape.solid else {
                return false;
            };
            if shape.id == from.surface_id || shape.id == to.surface_id {
                return false;
            }
            if let Some(index) = shape.surface {
                if shape.bounds.max.y <= a.y.min(b.y) + SUPPORT {
                    return false;
                }
                let s = &self.scene.supports[index];
                let allowance = body.radius * support.slope_x.hypot(support.slope_z);
                if above_support(s, a, b, (enter, exit), allowance) {
                    return false;
                }
            }
            solid.sweep(a, b, body).is_some()
        };
        !self.scene.visit_segment(a, b, Some(body), &mut blocks)
    }

    pub(super) fn can_fly(&self, leg: &FlightSegment) -> bool {
        let departure = self.support(leg.from, None);
        let mut blocks = |shape: &super::scene::Shape, contact| {
            let Some(solid) = &shape.solid else {
                return false;
            };
            if let Some(surface) = shape.surface
                && (leg.supports.contains(&shape.id)
                    || departure
                        .as_ref()
                        .is_some_and(|support| support.surface_id == shape.id))
                && above_support(
                    &self.scene.supports[surface],
                    leg.from,
                    leg.to,
                    contact,
                    0.0,
                )
            {
                return false;
            }
            solid.sweep(leg.from, leg.to, &leg.body).is_some()
        };
        !self
            .scene
            .visit_segment(leg.from, leg.to, Some(&leg.body), &mut blocks)
    }

    pub(super) fn can_walk(&self, a: &SurfacePoint, b: &SurfacePoint, body: &BodyProfile) -> bool {
        if a.surface_id != b.surface_id
            && ((b.x - a.x).hypot(b.z - a.z) > EPS || (b.y - a.y).abs() > SUPPORT)
        {
            return false;
        }
        if !self.can_stand(a, body) || !self.can_stand(b, body) {
            return false;
        }
        let support = self
            .scene
            .named(&a.surface_id)
            .expect("checked stance support");
        self.walk_clear_with_support(a, b, support, body)
            && (!support.terrain || self.terrain_segment(a.point(), b.point()))
    }

    pub(super) fn terrain_at(&self, x: i64, z: i64) -> bool {
        (x as usize) < self.width
            && (z as usize) < self.height
            && self.walkable[(z as usize) * self.width + (x as usize)]
    }

    fn terrain_walkable(&self, p: Point) -> bool {
        p.x >= 0.0
            && p.z >= 0.0
            && p.x <= (self.width - 1) as f64
            && p.z <= (self.height - 1) as f64
            && self.terrain_at(p.x.round() as i64, p.z.round() as i64)
    }

    fn terrain_segment(&self, a: Point, b: Point) -> bool {
        let (mut x, mut z) = (a.x.round() as i64, a.z.round() as i64);
        let (dx, dz) = (b.x - a.x, b.z - a.z);
        let (sx, sz) = (dx.signum() as i64, dz.signum() as i64);
        let (step_x, step_z) = (1.0 / dx.abs(), 1.0 / dz.abs());
        let (mut tx, mut tz) = (
            if dx == 0.0 {
                f64::INFINITY
            } else {
                (x as f64 + sx as f64 * 0.5 - a.x) / dx
            },
            if dz == 0.0 {
                f64::INFINITY
            } else {
                (z as f64 + sz as f64 * 0.5 - a.z) / dz
            },
        );
        loop {
            if !self.terrain_at(x, z) {
                return false;
            }
            let next = tx.min(tz);
            if next >= 1.0 {
                return self.terrain_walkable(b);
            }
            if tx == tz && (!self.terrain_at(x + sx, z) || !self.terrain_at(x, z + sz)) {
                return false;
            }
            if tx == next {
                x += sx;
                tx += step_x;
            }
            if tz == next {
                z += sz;
                tz += step_z;
            }
        }
    }

    pub(super) fn surface_line(
        &self,
        from: &SurfacePoint,
        x: f64,
        z: f64,
        body: Option<&BodyProfile>,
    ) -> Option<Vec<SurfacePoint>> {
        let mut s = self.scene.named(&from.surface_id)?;
        let (dx, dz) = (x - from.x, z - from.z);
        let exit_at = |s: &StandardSupport| {
            let x = if dx > 0.0 {
                (s.max_x - from.x) / dx
            } else if dx < 0.0 {
                (s.min_x - from.x) / dx
            } else {
                f64::INFINITY
            };
            let z = if dz > 0.0 {
                (s.max_z - from.z) / dz
            } else if dz < 0.0 {
                (s.min_z - from.z) / dz
            } else {
                f64::INFINITY
            };
            1.0_f64.min(x).min(z)
        };
        let mut path = Vec::new();
        let mut fraction: f64 = 0.0;
        for _ in 0..self.authored_supports {
            let exit = fraction.max(exit_at(s));
            let end = s.point(from.x + dx * exit, from.z + dz * exit);
            if body.is_some_and(|body| !self.can_walk(path.last().unwrap_or(from), &end, body)) {
                return None;
            }
            path.push(end);
            if exit == 1.0 {
                return Some(path);
            }
            let end = path.last().expect("one appended point");
            let bounds = Bounds {
                min: Point {
                    y: end.y - SUPPORT,
                    ..end.point()
                },
                max: Point {
                    y: end.y + SUPPORT,
                    ..end.point()
                },
            };
            let next = self
                .scene
                .supports_in(&bounds)
                .into_iter()
                .find(|candidate| {
                    if candidate.id == s.id
                        || !candidate.contains(end.point())
                        || exit_at(candidate) <= exit
                    {
                        return false;
                    }
                    let entry = candidate.point(end.x, end.z);
                    body.map_or_else(
                        || (entry.y - end.y).abs() <= SUPPORT,
                        |body| self.can_walk(end, &entry, body),
                    )
                });
            let Some(next) = next else {
                return body.is_none().then_some(path);
            };
            path.push(next.point(end.x, end.z));
            fraction = exit;
            s = next;
        }
        None
    }

    pub(super) fn route(&self, query: &RouteQuery) -> RoutePlan {
        match query {
            RouteQuery::Surface { from, to, body } => self.surface_route(from, to, body),
            RouteQuery::Outside { from, bounds, body } => self.outside_route(from, bounds, body),
            RouteQuery::Approach {
                from,
                body,
                target_position,
                target_support,
                reach,
                goal,
            } => self.approach_route(
                from,
                body,
                *target_position,
                target_support.as_ref(),
                *reach,
                *goal,
            ),
        }
    }

    fn pending_route(
        &self,
        from: &SurfacePoint,
        destinations: Vec<SurfacePoint>,
        body: &BodyProfile,
        outside_bounds: Option<Bounds>,
    ) -> RoutePlan {
        RoutePlan::Pending {
            path: [],
            expanded: 0,
            request: NavigationRequest {
                wait: None,
                from: from.clone(),
                destinations,
                outside_bounds,
                body: body.clone(),
                geometry_revision: self.revision,
            },
        }
    }

    fn surface_route(
        &self,
        from: &SurfacePoint,
        to: &SurfacePoint,
        body: &BodyProfile,
    ) -> RoutePlan {
        if !self.can_stand(from, body) || !self.can_stand(to, body) {
            return RoutePlan::InvalidEndpoint {
                path: [],
                expanded: 0,
            };
        }
        if from.surface_id == to.surface_id {
            if self.can_walk(from, to, body) {
                let length = distance(from.point(), to.point());
                return RoutePlan::Reached {
                    path: if length < 1e-7 {
                        vec![]
                    } else {
                        vec![to.clone()]
                    },
                    length,
                    expanded: 0,
                };
            }
        } else {
            for seam in [
                SurfacePoint {
                    surface_id: to.surface_id.clone(),
                    ..from.clone()
                },
                SurfacePoint {
                    surface_id: from.surface_id.clone(),
                    ..to.clone()
                },
            ] {
                if self.can_walk(from, &seam, body) && self.can_walk(&seam, to, body) {
                    let length =
                        distance(from.point(), seam.point()) + distance(seam.point(), to.point());
                    return RoutePlan::Reached {
                        path: vec![seam, to.clone()],
                        length,
                        expanded: 0,
                    };
                }
            }
            if let Some(mut path) = self.surface_line(from, to.x, to.z, Some(body)) {
                if path.last().is_some_and(|p| p.surface_id == to.surface_id) {
                    path.pop();
                }
                let end = path.last().unwrap_or(from);
                if path.len() < MAX_PATH_POINTS && self.can_walk(end, to, body) {
                    path.push(to.clone());
                    let length = std::iter::once(from)
                        .chain(path.iter())
                        .zip(path.iter())
                        .map(|(a, b)| distance(a.point(), b.point()))
                        .sum();
                    return RoutePlan::Reached {
                        path,
                        length,
                        expanded: 0,
                    };
                }
            }
        }
        self.pending_route(from, vec![to.clone()], body, None)
    }

    fn outside_route(&self, from: &SurfacePoint, bounds: &Bounds, body: &BodyProfile) -> RoutePlan {
        if !super::valid_bounds(bounds) || !self.can_stand(from, body) {
            return RoutePlan::InvalidEndpoint {
                path: [],
                expanded: 0,
            };
        }
        if outside(from.point(), bounds) {
            return RoutePlan::Reached {
                path: vec![],
                length: 0.0,
                expanded: 0,
            };
        }
        if let Some(s) = self.scene.named(&from.surface_id) {
            for (x, z) in [
                (bounds.min.x - EPS, from.z),
                (bounds.max.x + EPS, from.z),
                (from.x, bounds.min.z - EPS),
                (from.x, bounds.max.z + EPS),
            ] {
                let to = s.point(x, z);
                if outside(to.point(), bounds) {
                    let direct = self.surface_route(from, &to, body);
                    if matches!(direct, RoutePlan::Reached { .. }) {
                        return direct;
                    }
                }
            }
        }
        self.pending_route(from, vec![], body, Some(bounds.clone()))
    }

    fn approach_route(
        &self,
        from: &SurfacePoint,
        body: &BodyProfile,
        target: Point,
        support: Option<&SurfacePoint>,
        reach: f64,
        goal: Point,
    ) -> RoutePlan {
        let anchor = |p: Point| Point {
            y: p.y + body.interaction_height,
            ..p
        };
        let reaches = |p: Point| {
            let a = anchor(p);
            distance(a, goal) <= reach && self.clear_sight(a, goal)
        };
        let mut candidates = Vec::new();
        if let Some(p) = support.filter(|p| self.can_stand(p, body) && reaches(p.point())) {
            candidates.push(p.clone());
        }
        let radius = reach.clamp(1.0, 12.0);
        let y = goal.y - body.interaction_height;
        let bounds = Bounds {
            min: Point {
                x: target.x - radius,
                y: y - reach,
                z: target.z - radius,
            },
            max: Point {
                x: target.x + radius,
                y: y + reach,
                z: target.z + radius,
            },
        };
        for s in self.scene.supports_in(&bounds) {
            let min_x = s.min_x.max(bounds.min.x).ceil() as i64;
            let max_x = s.max_x.min(bounds.max.x).floor() as i64;
            let min_z = s.min_z.max(bounds.min.z).ceil() as i64;
            let max_z = s.max_z.min(bounds.max.z).floor() as i64;
            for z in min_z..=max_z {
                for x in min_x..=max_x {
                    let (x, z) = (x as f64, z as f64);
                    let p = Point {
                        x,
                        y: s.y_at(x, z),
                        z,
                    };
                    if distance(anchor(p), goal) <= reach {
                        candidates.push(s.point(x, z));
                    }
                }
            }
        }
        candidates.sort_by(|a, b| {
            distance(from.point(), a.point())
                .total_cmp(&distance(from.point(), b.point()))
                .then_with(|| super::id_cmp(&a.surface_id, &b.surface_id))
                .then_with(|| a.z.total_cmp(&b.z))
                .then_with(|| a.x.total_cmp(&b.x))
        });
        let mut destinations = Vec::new();
        for candidate in candidates
            .into_iter()
            .filter(|p| self.can_stand(p, body) && reaches(p.point()))
            .take(NavigationRequest::MAX_DESTINATIONS)
        {
            let route = self.surface_route(from, &candidate, body);
            if matches!(route, RoutePlan::Reached { .. }) {
                return route;
            }
            destinations.push(candidate);
        }
        if destinations.is_empty() {
            RoutePlan::NoRoute {
                path: [],
                expanded: 0,
            }
        } else {
            self.pending_route(from, destinations, body, None)
        }
    }
}

pub(super) fn outside(p: Point, b: &Bounds) -> bool {
    p.x < b.min.x
        || p.x > b.max.x
        || p.y < b.min.y
        || p.y > b.max.y
        || p.z < b.min.z
        || p.z > b.max.z
}
