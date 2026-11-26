//! Finite surface extents and conservative occluder partitions. These are the
//! same physical computations used by the Source receiving owner; they confer
//! no observation or personal knowledge by themselves.
use super::*;
use crate::geometry::PhysicalFeature;
use crate::state::Bounds;

pub(in super::super) const EPSILON: f64 = 1e-8;
#[derive(Clone, Debug)]
pub(super) struct Extent {
    pub feature_id: String,
    pub u0: f64,
    pub u1: f64,
    pub v0: f64,
    pub v1: f64,
}
impl Extent {
    pub fn of(fragment: &GeometryFragment) -> Self {
        Self {
            feature_id: fragment.feature_id.clone(),
            u0: fragment.u0,
            u1: fragment.u1,
            v0: fragment.v0,
            v1: fragment.v1,
        }
    }
    pub fn key(&self) -> Result<String, serde_json::Error> {
        crate::encoding::json_record(&(&self.feature_id, self.u0, self.u1, self.v0, self.v1))
    }
    pub fn partial(&self) -> bool {
        self.u0 > 0.0 || self.u1 < 1.0 || self.v0 > 0.0 || self.v1 < 1.0
    }
}
pub(super) fn dot(a: Point, b: Point) -> f64 {
    a.x * b.x + a.y * b.y + a.z * b.z
}
pub(super) fn difference(a: Point, b: Point) -> Point {
    Point {
        x: a.x - b.x,
        y: a.y - b.y,
        z: a.z - b.z,
    }
}
pub(super) fn distance(a: Point, b: Point) -> f64 {
    crate::spatial::distance(a, b)
}
pub(super) fn distance_bounds(b: &Bounds, p: Point) -> f64 {
    let dx = (b.min.x - p.x).max(0.0).max(p.x - b.max.x);
    let dy = (b.min.y - p.y).max(0.0).max(p.y - b.max.y);
    let dz = (b.min.z - p.z).max(0.0).max(p.z - b.max.z);
    crate::spatial::distance(
        Point {
            x: dx,
            y: dy,
            z: dz,
        },
        Point {
            x: 0.0,
            y: 0.0,
            z: 0.0,
        },
    )
}
pub(super) fn bounds(points: &[Point]) -> Bounds {
    let mut b = Bounds {
        min: Point {
            x: f64::INFINITY,
            y: f64::INFINITY,
            z: f64::INFINITY,
        },
        max: Point {
            x: f64::NEG_INFINITY,
            y: f64::NEG_INFINITY,
            z: f64::NEG_INFINITY,
        },
    };
    for p in points {
        b.min.x = b.min.x.min(p.x);
        b.min.y = b.min.y.min(p.y);
        b.min.z = b.min.z.min(p.z);
        b.max.x = b.max.x.max(p.x);
        b.max.y = b.max.y.max(p.y);
        b.max.z = b.max.z.max(p.z);
    }
    b
}
fn point(feature: &PhysicalFeature, u: f64, v: f64) -> Point {
    let [a, b, c, d] = feature.vertices;
    let coordinate = |a: f64, b: f64, c: f64, d: f64| {
        a * (1.0 - u) * (1.0 - v) + b * u * (1.0 - v) + c * u * v + d * (1.0 - u) * v
    };
    Point {
        x: coordinate(a.x, b.x, c.x, d.x),
        y: coordinate(a.y, b.y, c.y, d.y),
        z: coordinate(a.z, b.z, c.z, d.z),
    }
}
pub(super) fn points(feature: &PhysicalFeature, e: &Extent) -> [Point; 4] {
    [
        point(feature, e.u0, e.v0),
        point(feature, e.u1, e.v0),
        point(feature, e.u1, e.v1),
        point(feature, e.u0, e.v1),
    ]
}
pub(super) fn front(feature: &PhysicalFeature, eye: Point) -> bool {
    dot(difference(eye, feature.vertices[0]), feature.normal) > EPSILON
}
pub(super) fn local(feature: &PhysicalFeature, anchor: Point, metres: f64) -> Extent {
    let a = feature.vertices[0];
    let u = difference(feature.vertices[1], a);
    let v = difference(feature.vertices[3], a);
    let delta = difference(anchor, a);
    let uu = dot(u, u);
    let vv = dot(v, v);
    let uv = dot(u, v);
    let det = uu * vv - uv * uv;
    let tile = |coordinate: f64, length: f64| {
        let size = (metres / length).min(1.0);
        let count = (1.0 / size).ceil();
        let at = (coordinate / size).floor().max(0.0).min(count - 1.0);
        (at * size, ((at + 1.0) * size).min(1.0))
    };
    let zero = Point {
        x: 0.0,
        y: 0.0,
        z: 0.0,
    };
    let (u0, u1) = tile(
        (dot(delta, u) * vv - dot(delta, v) * uv) / det,
        distance(u, zero),
    );
    let (v0, v1) = tile(
        (dot(delta, v) * uu - dot(delta, u) * uv) / det,
        distance(v, zero),
    );
    Extent {
        feature_id: feature.id.clone(),
        u0,
        u1,
        v0,
        v1,
    }
}
pub(super) fn split(value: &Extent, feature: &PhysicalFeature) -> [Extent; 2] {
    let p = points(feature, value);
    let mut a = value.clone();
    let mut b = value.clone();
    if distance(p[0], p[1]) >= distance(p[0], p[3]) {
        let m = (value.u0 + value.u1) / 2.0;
        a.u1 = m;
        b.u0 = m;
    } else {
        let m = (value.v0 + value.v1) / 2.0;
        a.v1 = m;
        b.v0 = m;
    }
    [a, b]
}
pub(super) fn shadow(
    feature: &PhysicalFeature,
    extent: &Extent,
    eye: Point,
    vertices: &[Point],
) -> Option<Vec<Extent>> {
    let a = feature.vertices[0];
    let u = difference(feature.vertices[1], a);
    let v = difference(feature.vertices[3], a);
    let uu = dot(u, u);
    let vv = dot(v, v);
    let uv = dot(u, v);
    let det = uu * vv - uv * uv;
    if det <= EPSILON {
        return None;
    }
    let numerator = dot(feature.normal, difference(a, eye));
    let (mut lu, mut hu, mut lv, mut hv) = (
        f64::INFINITY,
        f64::NEG_INFINITY,
        f64::INFINITY,
        f64::NEG_INFINITY,
    );
    for p in vertices {
        let delta = difference(*p, eye);
        let t = numerator / dot(feature.normal, delta);
        if !t.is_finite() || t < 1.0 - EPSILON {
            return None;
        }
        let projected = Point {
            x: eye.x + t * delta.x - a.x,
            y: eye.y + t * delta.y - a.y,
            z: eye.z + t * delta.z - a.z,
        };
        let du = dot(projected, u);
        let dv = dot(projected, v);
        let pu = (du * vv - dv * uv) / det;
        let pv = (dv * uu - du * uv) / det;
        lu = lu.min(pu);
        hu = hu.max(pu);
        lv = lv.min(pv);
        hv = hv.max(pv);
    }
    let left = lu.min(extent.u1).max(extent.u0);
    let right = hu.min(extent.u1).max(extent.u0);
    let bottom = lv.min(extent.v1).max(extent.v0);
    let top = hv.min(extent.v1).max(extent.v0);
    let mut result = Vec::with_capacity(5);
    let mut add = |u0: f64, u1: f64, v0: f64, v1: f64| {
        if u1 - u0 > EPSILON && v1 - v0 > EPSILON {
            result.push(Extent {
                feature_id: extent.feature_id.clone(),
                u0,
                u1,
                v0,
                v1,
            });
        }
    };
    let margin = EPSILON * 16.0;
    add(extent.u0, left - margin, extent.v0, extent.v1);
    add(right + margin, extent.u1, extent.v0, extent.v1);
    add(left, right, extent.v0, bottom - margin);
    add(left, right, top + margin, extent.v1);
    if result.is_empty() {
        return None;
    }
    if right - left > EPSILON && top - bottom > EPSILON {
        result.push(Extent {
            feature_id: extent.feature_id.clone(),
            u0: left,
            u1: right,
            v0: bottom,
            v1: top,
        });
    }
    Some(result)
}
pub(super) fn boundary_edge(near: &ObservedSurfacePatch, far: &Bounds) -> Option<[Point; 2]> {
    for i in 0..4 {
        if near.edges[i] != SurfaceEdge::PhysicalBoundary {
            continue;
        }
        let a = near.vertices[i];
        let b = near.vertices[(i + 1) % 4];
        let x = (a.x - b.x).abs() > EPSILON;
        let axis = |p: Point| if x { p.x } else { p.z };
        let other = |p: Point| if x { p.z } else { p.x };
        if (other(a) - other(far.min)).abs() > EPSILON
            && (other(a) - other(far.max)).abs() > EPSILON
        {
            continue;
        }
        let low = axis(a).min(axis(b)).max(axis(far.min));
        let high = axis(a).max(axis(b)).min(axis(far.max));
        if high - low <= EPSILON {
            continue;
        }
        let at = |n: f64| {
            let t = (n - axis(a)) / (axis(b) - axis(a));
            Point {
                x: a.x + (b.x - a.x) * t,
                y: a.y + (b.y - a.y) * t,
                z: a.z + (b.z - a.z) * t,
            }
        };
        return Some([at(low), at(high)]);
    }
    None
}
pub(super) fn height(patch: &ObservedSurfacePatch, point: Point) -> f64 {
    let p = patch.vertices[0];
    let n = patch.normal;
    p.y - (n.x * (point.x - p.x) + n.z * (point.z - p.z)) / n.y
}
