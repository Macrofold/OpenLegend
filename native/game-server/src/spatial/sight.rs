//! Exact half-space sight and ordered acoustic transfer on the installed solids.

use super::scene::Shape;
use super::{
    Bounds, EPS, Point, SpatialError, SpatialProvider, cross, dot, extent, finite, overlaps, sub,
};
use openlegend_simulation::geometry::{
    ConvexViewAnswer, ConvexViewQuery, SightSweep, SightSweepQuery,
};

impl SpatialProvider {
    pub(super) fn clear_sight(&self, from: Point, to: Point) -> bool {
        !self
            .scene
            .visit_segment(from, to, None, &mut |s, (a, b)| s.sight && a < b)
    }

    pub(super) fn sound(&self, from: Point, to: Point) -> f64 {
        let mut hits = Vec::new();
        let blocked = self
            .scene
            .visit_segment(from, to, None, &mut |shape, (at, _)| {
                if shape.transmission == 0.0 {
                    return true;
                }
                if shape.transmission != 1.0 {
                    hits.push((at, shape.id.as_str(), shape.transmission));
                }
                false
            });
        if blocked {
            return 0.0;
        }
        hits.sort_by(|a, b| a.0.total_cmp(&b.0).then_with(|| super::id_cmp(a.1, b.1)));
        hits.into_iter()
            .fold(1.0, |value, (_, _, transmission)| value * transmission)
    }

    pub(super) fn convex(&self, q: &ConvexViewQuery) -> Result<ConvexViewAnswer, SpatialError> {
        let points = convex_points(q)?;
        let bounds = extent(points.iter().copied());
        let test = |candidate: &Bounds| overlaps(candidate, &bounds, EPS);
        let mut remaining = q.allowance;
        let mut hull = None;
        let mut blocked_by = None;
        let complete = self.scene.shape_index.as_ref().is_none_or(|index| {
            index.query(&test, &mut remaining, &mut |id| {
                let shape = &self.scene.shapes[id];
                if blocked_by.is_none() && shape.sight && !separated(shape, &points, &mut hull) {
                    blocked_by = Some(shape.vertices.to_vec());
                }
            })
        });
        Ok(ConvexViewAnswer {
            visited: q.allowance - remaining,
            complete,
            clear: complete && blocked_by.is_none(),
            blocking_vertices: blocked_by,
        })
    }

    pub(super) fn sight_sweep(&self, q: &SightSweepQuery) -> Result<SightSweep, SpatialError> {
        let points = [q.eye_from, q.eye_to, q.point_from, q.point_to];
        if !points.iter().copied().all(finite) {
            return Err(SpatialError::InvalidQuery);
        }
        let bounds = extent(points);
        let mut hull = None;
        let mut roots = Vec::new();
        if let Some(index) = &self.scene.shape_index {
            index.visit(&|b| overlaps(b, &bounds, EPS), &mut |id| {
                let shape = &self.scene.shapes[id];
                if shape.sight && !separated(shape, &points, &mut hull) {
                    crossing_fractions(shape, points, &mut roots);
                }
                false
            });
        }
        roots.retain(|x| *x > 0.0 && *x < 1.0);
        roots.sort_by(f64::total_cmp);
        Ok(SightSweep { fractions: roots })
    }
}

fn convex_points(q: &ConvexViewQuery) -> Result<Vec<Point>, SpatialError> {
    if !(1..=4).contains(&q.target.len())
        || !finite(q.from)
        || !q.target.iter().copied().all(finite)
    {
        return Err(SpatialError::InvalidQuery);
    }
    Ok(std::iter::once(q.from)
        .chain(q.target.iter().copied())
        .collect())
}

struct Hull {
    edges: Vec<Point>,
    axes: Vec<Point>,
}
impl Hull {
    fn new(points: &[Point]) -> Self {
        let edges: Vec<_> = points
            .iter()
            .enumerate()
            .flat_map(|(i, &p)| points[i + 1..].iter().map(move |&q| sub(q, p)))
            .collect();
        let axes = edges
            .iter()
            .enumerate()
            .flat_map(|(i, &p)| edges[i + 1..].iter().map(move |&q| cross(p, q)))
            .collect();
        Self { edges, axes }
    }
}

fn separated(shape: &Shape, points: &[Point], hull: &mut Option<Hull>) -> bool {
    if shape.planes.iter().any(|plane| {
        points
            .iter()
            .all(|&p| dot(plane.normal, p) > plane.bound - EPS)
    }) {
        return true;
    }
    let hull = hull.get_or_insert_with(|| Hull::new(points));
    let apart = |axis: Point| {
        if axis.x.abs() + axis.y.abs() + axis.z.abs() < 1e-12 {
            return false;
        }
        let bounds = |points: &[Point]| {
            points
                .iter()
                .map(|&p| dot(axis, p))
                .fold((f64::INFINITY, f64::NEG_INFINITY), |(lo, hi), v| {
                    (v.min(lo), v.max(hi))
                })
        };
        let (low, high) = bounds(points);
        let (shape_low, shape_high) = bounds(&shape.vertices);
        high < shape_low || shape_high < low
    };
    hull.axes.iter().copied().any(apart)
        || hull.edges.iter().any(|&edge| {
            shape
                .edges
                .iter()
                .any(|&direction| apart(cross(edge, direction)))
        })
}

fn crossing_fractions(shape: &Shape, points: [Point; 4], roots: &mut Vec<f64>) {
    let [a, b, c, e] = points;
    let planes = shape.planes.each_ref().map(|plane| {
        let n = plane.normal;
        let o = dot(n, a);
        let slope = dot(n, b) - o;
        let d = dot(n, c) - o;
        (plane.bound - EPS - o, -slope, d, dot(n, e) - o - slope - d)
    });
    for (p, q, d, ds) in planes {
        for (value, slope) in [(d - EPS, ds), (d + EPS, ds), (-p, -q), (d - p, ds - q)] {
            if slope != 0.0 {
                roots.push(-value / slope);
            }
        }
    }
    for (i, &(p, q, d, ds)) in planes.iter().enumerate() {
        for &(pp, qq, dd, dds) in &planes[i + 1..] {
            let terms = (
                q * dds - qq * ds,
                p * dds + q * dd - pp * ds - qq * d,
                p * dd - pp * d,
            );
            for t in quadratic(terms).into_iter().flatten() {
                let du = d + ds * t;
                let dv = dd + dds * t;
                if du.abs() < EPS || dv.abs() < EPS || du * dv > 0.0 {
                    continue;
                }
                let at = (p + q * t) / du;
                if (-1e-9..=1.0 + 1e-9).contains(&at) {
                    roots.push(t);
                }
            }
        }
    }
}

fn quadratic((a, b, c): (f64, f64, f64)) -> [Option<f64>; 2] {
    if a.abs() <= 1e-12 * (b.abs() + c.abs()) {
        return [(b != 0.0).then(|| -c / b), None];
    }
    let d = b * b - 4.0 * a * c;
    if d < 0.0 {
        return [None, None];
    }
    let q = -0.5 * (b + if b < 0.0 { -d.sqrt() } else { d.sqrt() });
    [Some(q / a), (q != 0.0).then(|| c / q)]
}
