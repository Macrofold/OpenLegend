//! Project Detour's corridor onto exact supports and sweep every physical leg.
//! A polygon or a partial search cannot authorize a movement endpoint.

use super::{
    Bounds, EPS, Point, SpatialError, SpatialProvider, SurfacePoint, coordinates, distance, id_cmp,
    lerp, valid_bounds,
};
use super::{
    recast::{Location, MAX_PATH, Mesh, Recast, Search},
    walking::outside,
};
use openlegend_simulation::{
    geometry::{NavigationAnswer, NavigationResult},
    state::{BodyProfile, NavigationRequest},
};
use std::collections::HashSet;

const PROJECTION: f64 = 0.2;

impl SpatialProvider {
    pub(super) fn navigation_answer(
        &self,
        host: &mut Recast,
        request: &NavigationRequest,
    ) -> Result<NavigationAnswer, SpatialError> {
        let result = self.navigate(host, request)?;
        let problem = match &result {
            NavigationResult::Reached { path, .. } => self.route_problem(request, path),
            NavigationResult::NoRoute { .. } => {
                Some("no supported route reaches that destination.")
            }
            NavigationResult::Unavailable { .. } => {
                Some("navigation preparation is unavailable; retry the action later.")
            }
            NavigationResult::BudgetExceeded { .. } => {
                Some("the route exceeds the current navigation budget.")
            }
            NavigationResult::InvalidEndpoint { .. } | NavigationResult::UnsafeRoute { .. } => {
                Some("the proposed route does not fit this body or its supporting surfaces.")
            }
        }
        .map(str::to_owned);
        Ok(NavigationAnswer { result, problem })
    }
    fn navigate(
        &self,
        host: &mut Recast,
        request: &NavigationRequest,
    ) -> Result<NavigationResult, SpatialError> {
        let here = &request.from;
        let body = &request.body;
        let exterior = request.outside_bounds.as_ref();
        if request.geometry_revision != self.revision
            || exterior.map_or(
                request.destinations.is_empty()
                    || request.destinations.len() > NavigationRequest::MAX_DESTINATIONS,
                |b| !request.destinations.is_empty() || !valid_bounds(b),
            )
            || !self.can_stand(here, body)
        {
            return Ok(NavigationResult::InvalidEndpoint {
                path: [],
                reason: None,
            });
        }
        if exterior.is_some_and(|b| outside(here.point(), b)) {
            return Ok(NavigationResult::Reached {
                path: vec![],
                length: 0.0,
            });
        }
        let mesh = host.mesh(body)?;
        let Some(start) = host.nearest(mesh, here.point())? else {
            return Ok(if exterior.is_some() {
                unsafe_route()
            } else {
                no_route()
            });
        };
        let external = if let Some(bounds) = exterior {
            match self.exits(host, mesh, start, body, bounds)? {
                ExitSearch::Complete(exits) => Some(exits),
                ExitSearch::Failed(result) => return Ok(result),
            }
        } else {
            None
        };
        let choices = external
            .as_ref()
            .map_or(request.destinations.as_slice(), |found| {
                found.destinations.as_slice()
            });
        let mut last = no_route();
        for to in choices {
            if !self.can_stand(to, body) {
                continue;
            }
            let Some(end) = host.nearest(mesh, to.point())? else {
                continue;
            };
            let raw = match host.path(mesh, start, end)? {
                Search::Found(points) => points,
                Search::Budget => {
                    last = budget_exceeded();
                    continue;
                }
                Search::Missing => continue,
            };
            let points = std::iter::once(here.point())
                .chain(raw)
                .chain(std::iter::once(to.point()))
                .collect::<Vec<_>>();
            let Some(path) = self.project_corridor(&points, here, to, body) else {
                last = unsafe_route();
                continue;
            };
            let length = std::iter::once(here)
                .chain(path.iter())
                .zip(path.iter())
                .map(|(a, b)| distance(a.point(), b.point()))
                .sum();
            return Ok(NavigationResult::Reached { path, length });
        }
        if external.as_ref().is_some_and(|f| f.overflow) {
            return Ok(budget_exceeded());
        }
        if external.as_ref().is_some_and(|f| f.exterior_polygon)
            && matches!(last, NavigationResult::NoRoute { .. })
        {
            return Ok(unsafe_route());
        }
        Ok(last)
    }
    fn exits(
        &self,
        host: &mut Recast,
        mesh: Mesh,
        start: Location,
        body: &BodyProfile,
        bounds: &Bounds,
    ) -> Result<ExitSearch, SpatialError> {
        let radius = (bounds.min.x - start.point.x)
            .abs()
            .max((bounds.max.x - start.point.x).abs())
            .hypot(
                (bounds.min.z - start.point.z)
                    .abs()
                    .max((bounds.max.z - start.point.z).abs()),
            )
            + 0.16;
        let refs = match host.around(mesh, start, radius)? {
            Search::Found(refs) => refs,
            Search::Budget => return Ok(ExitSearch::Failed(budget_exceeded())),
            Search::Missing => {
                return Ok(ExitSearch::Failed(NavigationResult::Unavailable {
                    path: [],
                    reason: None,
                }));
            }
        };
        let mut found = Exits {
            destinations: vec![],
            overflow: false,
            exterior_polygon: false,
        };
        let mut seen = HashSet::new();
        for reference in refs {
            let points = host.vertices(mesh, reference)?;
            for axis in 0..3 {
                for greater in [false, true] {
                    let edge = if greater {
                        coordinates(bounds.max)[axis] + EPS
                    } else {
                        coordinates(bounds.min)[axis] - EPS
                    };
                    let region = clip_exterior(&points, axis, edge, greater);
                    if region.is_empty() {
                        continue;
                    }
                    found.exterior_polygon = true;
                    let centre = Point {
                        x: region.iter().map(|p| p.x / region.len() as f64).sum(),
                        y: region.iter().map(|p| p.y / region.len() as f64).sum(),
                        z: region.iter().map(|p| p.z / region.len() as f64).sum(),
                    };
                    for p in std::iter::once(centre).chain(region) {
                        let area = Bounds {
                            min: Point {
                                y: p.y - PROJECTION,
                                ..p
                            },
                            max: Point {
                                y: p.y + PROJECTION,
                                ..p
                            },
                        };
                        for s in self.scene.supports_in(&area) {
                            if !s.contains(p) {
                                continue;
                            }
                            let q = s.point(p.x, p.z);
                            if (q.y - p.y).abs() > PROJECTION
                                || !outside(q.point(), bounds)
                                || !self.can_stand(&q, body)
                            {
                                continue;
                            }
                            let key = (
                                s.id.as_str(),
                                coordinates(q.point())
                                    .map(|x| if x == 0.0 { 0 } else { x.to_bits() }),
                            );
                            if !seen.insert(key) {
                                continue;
                            }
                            if found.destinations.len() == NavigationRequest::MAX_DESTINATIONS {
                                found.overflow = true;
                                return Ok(ExitSearch::Complete(found));
                            }
                            found.destinations.push(q);
                        }
                    }
                }
            }
        }
        Ok(ExitSearch::Complete(found))
    }
    fn project_corridor(
        &self,
        points: &[Point],
        from: &SurfacePoint,
        to: &SurfacePoint,
        body: &BodyProfile,
    ) -> Option<Vec<SurfacePoint>> {
        let mut path = Vec::new();
        for piece in points.windows(2) {
            let [a, b] = [piece[0], piece[1]];
            if (b.x - a.x).hypot(b.z - a.z) < 1e-7 {
                continue;
            }
            let padding = PROJECTION + EPS;
            let bounds = Bounds {
                min: Point {
                    x: a.x.min(b.x) - padding,
                    y: a.y.min(b.y) - padding,
                    z: a.z.min(b.z) - padding,
                },
                max: Point {
                    x: a.x.max(b.x) + padding,
                    y: a.y.max(b.y) + padding,
                    z: a.z.max(b.z) + padding,
                },
            };
            let candidates = self.scene.supports_in(&bounds);
            let mut times = vec![0.0, 1.0];
            for s in &candidates {
                for (a, b, lo, hi) in [(a.x, b.x, s.min_x, s.max_x), (a.z, b.z, s.min_z, s.max_z)] {
                    let d = b - a;
                    if d.abs() < 1e-9 {
                        continue;
                    }
                    times.extend(
                        [lo, hi]
                            .into_iter()
                            .map(|edge| (edge - a) / d)
                            .filter(|&t| t > 1e-7 && t < 1.0 - 1e-7),
                    );
                }
            }
            times.sort_by(f64::total_cmp);
            times.dedup();
            for t in times.windows(2) {
                if t[1] - t[0] < 1e-7 {
                    continue;
                }
                let first = lerp(a, b, t[0]);
                let last = lerp(a, b, t[1]);
                let mid = lerp(first, last, 0.5);
                let current = path.last().unwrap_or(from);
                let elevation =
                    |s: &super::scene::StandardSupport| (s.y_at(mid.x, mid.z) - mid.y).abs();
                let mut options = candidates
                    .iter()
                    .copied()
                    .filter(|s| s.contains(mid) && elevation(s) <= PROJECTION)
                    .collect::<Vec<_>>();
                options.sort_by(|s, t| {
                    (t.id == current.surface_id)
                        .cmp(&(s.id == current.surface_id))
                        .then_with(|| elevation(s).total_cmp(&elevation(t)))
                        .then_with(|| id_cmp(&s.id, &t.id))
                });
                let pair = options.into_iter().find_map(|s| {
                    let entry = s.point(first.x, first.z);
                    let exit = s.point(last.x, last.z);
                    (self.can_walk(current, &entry, body) && self.can_walk(&entry, &exit, body))
                        .then_some([entry, exit])
                })?;
                for p in pair {
                    self.append(&mut path, from, p, body)?;
                }
            }
        }
        self.append(&mut path, from, to.clone(), body)?;
        Some(self.simplify(from, path, body))
    }
    fn append(
        &self,
        path: &mut Vec<SurfacePoint>,
        from: &SurfacePoint,
        p: SurfacePoint,
        body: &BodyProfile,
    ) -> Option<()> {
        let last = path.last().unwrap_or(from);
        if last.surface_id == p.surface_id && distance(last.point(), p.point()) < 1e-7 {
            return Some(());
        }
        if path.len() >= MAX_PATH || !self.can_walk(last, &p, body) {
            return None;
        }
        path.push(p);
        Some(())
    }
    fn simplify(
        &self,
        from: &SurfacePoint,
        path: Vec<SurfacePoint>,
        body: &BodyProfile,
    ) -> Vec<SurfacePoint> {
        let mut output = Vec::with_capacity(path.len());
        let mut start = from;
        let mut i = 0;
        while i < path.len() {
            let mut furthest = i;
            for j in i + 1..(i + 24).min(path.len()) {
                if path[j].surface_id != start.surface_id
                    || path[j - 1].surface_id != start.surface_id
                {
                    break;
                }
                if self.can_walk(start, &path[j], body) {
                    furthest = j;
                }
            }
            let next = &path[furthest];
            if distance(start.point(), next.point()) > 1e-7 || start.surface_id != next.surface_id {
                output.push(next.clone());
            }
            start = next;
            i = furthest + 1;
        }
        output
    }
    fn route_problem(
        &self,
        request: &NavigationRequest,
        path: &[SurfacePoint],
    ) -> Option<&'static str> {
        if path.len() > MAX_PATH {
            return Some("navigation returned an invalid route.");
        }
        let mut last = &request.from;
        if !self.can_stand(last, &request.body) {
            return Some("the prepared route has no supported starting place.");
        }
        for p in path {
            if !self.can_walk(last, p, &request.body) {
                return Some("the prepared route became physically blocked.");
            }
            last = p;
        }
        let complete = request.outside_bounds.as_ref().map_or_else(
            || {
                request.destinations.iter().any(|p| {
                    p.surface_id == last.surface_id && distance(p.point(), last.point()) < 1e-6
                })
            },
            |b| outside(last.point(), b),
        );
        (!complete).then_some("navigation returned only a partial route.")
    }
}

fn clip_exterior(vertices: &[Point], axis: usize, edge: f64, greater: bool) -> Vec<Point> {
    let mut result = Vec::new();
    for (i, &a) in vertices.iter().enumerate() {
        let b = vertices[(i + 1) % vertices.len()];
        let (av, bv) = (coordinates(a)[axis], coordinates(b)[axis]);
        let test = |v| if greater { v >= edge } else { v <= edge };
        let (a_in, b_in) = (test(av), test(bv));
        if a_in {
            result.push(a);
        }
        if a_in != b_in {
            result.push(lerp(a, b, (edge - av) / (bv - av)));
        }
    }
    result
}
struct Exits {
    destinations: Vec<SurfacePoint>,
    overflow: bool,
    exterior_polygon: bool,
}
enum ExitSearch {
    Complete(Exits),
    Failed(NavigationResult),
}
fn no_route() -> NavigationResult {
    NavigationResult::NoRoute {
        path: [],
        reason: None,
    }
}
fn unsafe_route() -> NavigationResult {
    NavigationResult::UnsafeRoute {
        path: [],
        reason: None,
    }
}
fn budget_exceeded() -> NavigationResult {
    NavigationResult::BudgetExceeded {
        path: [],
        reason: None,
    }
}
