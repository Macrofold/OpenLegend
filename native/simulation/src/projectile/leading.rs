//! Pure straight-flight intercept from a personally observed executed piece.
//! The caller proves current sight, exact target life and continuity. No body
//! velocity, predicted input or future route enters this calculation.

use super::aim::ObservedMotion;
use crate::spatial::{distance, quadratic_roots};
use crate::state::Point;

/// Apply the constant-velocity law to a current observed segment. Keep the
/// exact current aim point when the observation is absent, stale or outside
/// the time the projectile's installed range can cover.
pub(crate) fn intercept_point(
    origin: Point,
    point: Point,
    observed: Option<&ObservedMotion>,
    now: f64,
    flight_speed: f64,
    range: f64,
    spatial_epsilon: f64,
) -> Point {
    let Some(motion) = observed.filter(|motion| motion.at == now && motion.at > motion.from_at)
    else {
        return point;
    };
    if distance(point, motion.to) > spatial_epsilon {
        return point;
    }

    let elapsed = motion.at - motion.from_at;
    let velocity = Point {
        x: (motion.to.x - motion.from.x) / elapsed,
        y: (motion.to.y - motion.from.y) / elapsed,
        z: (motion.to.z - motion.from.z) / elapsed,
    };
    let delta = Point {
        x: point.x - origin.x,
        y: point.y - origin.y,
        z: point.z - origin.z,
    };
    let a = dot(velocity, velocity) - flight_speed * flight_speed;
    let b = 2.0 * dot(delta, velocity);
    let c = dot(delta, delta);
    let Some(time) = earliest_root(a, b, c, range / flight_speed) else {
        return point;
    };
    Point {
        x: point.x + velocity.x * time,
        y: point.y + velocity.y * time,
        z: point.z + velocity.z * time,
    }
}

fn dot(first: Point, second: Point) -> f64 {
    first.x * second.x + first.y * second.y + first.z * second.z
}

fn earliest_root(a: f64, b: f64, c: f64, limit: f64) -> Option<f64> {
    quadratic_roots(a, b, c)
        .into_iter()
        .flatten()
        .filter(|time| *time > 0.0 && *time <= limit)
        .min_by(f64::total_cmp)
}
