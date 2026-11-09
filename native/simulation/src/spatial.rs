//! Upright capsule/short-cylinder separation from the existing spatial owner.
//! These pure queries use actual body extents and complete executed pieces.
//! They neither select a world policy nor grant visibility/movement permission.

use crate::state::{BodyProfile, Point};

mod angle;
pub(crate) use angle::atan2;

/// Current JavaScript Math.hypot(dx,dy,dz) evaluation order, including its
/// scaled compensated sum. Squared sums or nested hypot alter real route cuts.
pub(crate) fn distance(from: Point, to: Point) -> f64 {
    let dx = (from.x - to.x).abs();
    let dy = (from.y - to.y).abs();
    let dz = (from.z - to.z).abs();
    let maximum = dx.max(dy).max(dz);
    if maximum == 0.0 {
        return 0.0;
    }
    let mut sum = 0.0;
    let mut compensation = 0.0;
    for value in [dx, dy, dz] {
        let normalized = value / maximum;
        let term = normalized * normalized - compensation;
        let next = sum + term;
        compensation = (next - sum) - term;
        sum = next;
    }
    maximum * sum.sqrt()
}

pub(crate) fn interpolate(from: Point, to: Point, fraction: f64) -> Point {
    Point {
        x: from.x + (to.x - from.x) * fraction,
        y: from.y + (to.y - from.y) * fraction,
        z: from.z + (to.z - from.z) * fraction,
    }
}

#[derive(Clone, Copy, Debug)]
pub struct Extent {
    pub radius: f64,
    pub height: f64,
}

#[derive(Clone, Copy, Debug)]
pub struct BodyPiece {
    pub from: Point,
    pub through: Point,
    pub extent: Extent,
}

#[derive(Clone, Copy, Debug)]
pub struct DistanceBand {
    pub from: f64,
    pub through: f64,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct DistanceInterval {
    pub enter: f64,
    pub exit: f64,
}

impl From<&BodyProfile> for Extent {
    fn from(body: &BodyProfile) -> Self {
        Self {
            radius: body.radius,
            height: body.height,
        }
    }
}

struct Separation {
    x: f64,
    y: f64,
    z: f64,
    dx: f64,
    dy: f64,
    dz: f64,
    low: f64,
    high: f64,
    cylinder: f64,
    round: f64,
}

fn separation(
    first_from: Point,
    first_to: Point,
    first: Extent,
    second_from: Point,
    second_to: Point,
    second: Extent,
) -> Separation {
    let a = if first.height >= 2.0 * first.radius {
        first.radius
    } else {
        0.0
    };
    let b = if second.height >= 2.0 * second.radius {
        second.radius
    } else {
        0.0
    };
    Separation {
        x: first_from.x - second_from.x,
        y: first_from.y - second_from.y,
        z: first_from.z - second_from.z,
        dx: first_to.x - first_from.x - (second_to.x - second_from.x),
        dy: first_to.y - first_from.y - (second_to.y - second_from.y),
        dz: first_to.z - first_from.z - (second_to.z - second_from.z),
        low: b - (first.height - a),
        high: second.height - b - a,
        cylinder: (if a != 0.0 { 0.0 } else { first.radius })
            + (if b != 0.0 { 0.0 } else { second.radius }),
        round: a + b,
    }
}

fn distance_at(s: &Separation, at: f64) -> f64 {
    let x = s.x + s.dx * at;
    let y = s.y + s.dy * at;
    let z = s.z + s.dz * at;
    let vertical = if y < s.low {
        y - s.low
    } else if y > s.high {
        y - s.high
    } else {
        0.0
    };
    (x.hypot(z) - s.cylinder).max(0.0).hypot(vertical) - s.round
}

fn minimum(s: &Separation, expansion: f64, epsilon: f64) -> f64 {
    let travel = s.dx.hypot(s.dy).hypot(s.dz);
    if travel == 0.0 {
        return if expansion > 0.0 { 1.0 } else { 0.0 };
    }
    if s.dy == 0.0 && expansion == 0.0 {
        let horizontal = s.dx * s.dx + s.dz * s.dz;
        return if horizontal != 0.0 {
            (-(s.x * s.dx + s.z * s.dz) / horizontal).clamp(0.0, 1.0)
        } else {
            0.0
        };
    }
    if s.cylinder == 0.0 && expansion == 0.0 {
        let mut cuts = vec![0.0, 1.0];
        if s.dy != 0.0 {
            for height in [s.low, s.high] {
                let at = (height - s.y) / s.dy;
                if at > 0.0 && at < 1.0 {
                    cuts.push(at);
                }
            }
        }
        cuts.sort_by(f64::total_cmp);
        let mut best = 0.0;
        let mut value = distance_at(s, 0.0);
        for pair in cuts.windows(2) {
            let low = pair[0];
            let high = pair[1];
            let y = s.y + (s.dy * (low + high)) / 2.0;
            let boundary = if y < s.low {
                Some(s.low)
            } else if y > s.high {
                Some(s.high)
            } else {
                None
            };
            let a = s.dx * s.dx + s.dz * s.dz + if boundary.is_none() { 0.0 } else { s.dy * s.dy };
            let b =
                s.x * s.dx + s.z * s.dz + boundary.map_or(0.0, |boundary| (s.y - boundary) * s.dy);
            let at = if a != 0.0 {
                (-b / a).clamp(low, high)
            } else {
                low
            };
            let candidate = distance_at(s, at);
            if candidate < value {
                best = at;
                value = candidate;
            }
        }
        return best;
    }
    let derivative = |at: f64| {
        let x = s.x + s.dx * at;
        let y = s.y + s.dy * at;
        let z = s.z + s.dz * at;
        let horizontal = x.hypot(z);
        let radial = (horizontal - s.cylinder).max(0.0);
        let vertical = if y < s.low {
            y - s.low
        } else if y > s.high {
            y - s.high
        } else {
            0.0
        };
        let length = radial.hypot(vertical);
        (if length != 0.0 {
            (radial
                * (if horizontal != 0.0 {
                    (x * s.dx + z * s.dz) / horizontal
                } else {
                    0.0
                })
                + vertical * s.dy)
                / length
        } else {
            0.0
        }) - expansion
    };
    if derivative(0.0) >= 0.0 {
        return 0.0;
    }
    if derivative(1.0) <= 0.0 {
        return 1.0;
    }
    let mut low = 0.0;
    let mut high = 1.0;
    for _ in 0..64 {
        if (high - low) * travel <= epsilon / 128.0 {
            break;
        }
        let middle = (low + high) / 2.0;
        if derivative(middle) < 0.0 {
            low = middle;
        } else {
            high = middle;
        }
    }
    (low + high) / 2.0
}

pub fn body_surface_distance(
    first_point: Point,
    first: Extent,
    second_point: Point,
    second: Extent,
) -> f64 {
    distance_at(
        &separation(
            first_point,
            first_point,
            first,
            second_point,
            second_point,
            second,
        ),
        0.0,
    )
    .max(0.0)
}

pub fn moving_bodies_minimum_separation(first: BodyPiece, second: BodyPiece, epsilon: f64) -> f64 {
    let relative = separation(
        first.from,
        first.through,
        first.extent,
        second.from,
        second.through,
        second.extent,
    );
    distance_at(&relative, minimum(&relative, 0.0, epsilon)).max(0.0)
}

pub fn moving_bodies_distance_entry(
    first: BodyPiece,
    second: BodyPiece,
    band: DistanceBand,
    epsilon: f64,
) -> Option<f64> {
    let relative = separation(
        first.from,
        first.through,
        first.extent,
        second.from,
        second.through,
        second.extent,
    );
    let expansion = band.through - band.from;
    let gap = |at: f64| distance_at(&relative, at) - band.from - expansion * at;
    if gap(0.0) <= 0.0 {
        return Some(0.0);
    }
    let closest = minimum(&relative, expansion, epsilon);
    if gap(closest) > 0.0 {
        return None;
    }
    let mut low = 0.0;
    let mut high = closest;
    let travel = relative.dx.hypot(relative.dy).hypot(relative.dz) + expansion.abs();
    for _ in 0..64 {
        if (high - low) * travel <= epsilon / 128.0 {
            break;
        }
        let middle = (low + high) / 2.0;
        if gap(middle) > 0.0 {
            low = middle;
        } else {
            high = middle;
        }
    }
    Some(high)
}

pub fn moving_bodies_distance_interval(
    first: BodyPiece,
    second: BodyPiece,
    band: DistanceBand,
    epsilon: f64,
) -> Option<DistanceInterval> {
    let enter = moving_bodies_distance_entry(first, second, band, epsilon)?;
    let reverse = moving_bodies_distance_entry(
        BodyPiece {
            from: first.through,
            through: first.from,
            extent: first.extent,
        },
        BodyPiece {
            from: second.through,
            through: second.from,
            extent: second.extent,
        },
        DistanceBand {
            from: band.through,
            through: band.from,
        },
        epsilon,
    )?;
    Some(DistanceInterval {
        enter,
        exit: 1.0 - reverse,
    })
}
