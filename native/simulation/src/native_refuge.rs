//! Local-refuge comparison over the animal's actually received danger records.
//! Physical clearance and personally certified terrain are separate prerequisites;
//! none of these numerical comparisons grants either or draws randomness.

use crate::native_response::{NativeDanger, NativeResponseProfile, RefugeCandidate};
use crate::spatial::{BodyPiece, Extent, body_surface_distance, moving_bodies_minimum_separation};
use crate::state::{Point, SurfacePoint};
use crate::work::{WorkError, WorkMeters, WorkUnit};

mod candidate;
pub(crate) use candidate::RefugeCandidateBatch;
mod navigation;
pub(crate) use navigation::{PendingRefugeNavigation, PreparedRefugeNavigation};

pub struct RefugeRoute {
    pub candidate: RefugeCandidate,
    pub path: Vec<SurfacePoint>,
    pub length: f64,
    pub worsening: f64,
    pub arrival_margin: f64,
}

fn danger_extent(danger: &NativeDanger) -> Extent {
    match danger {
        NativeDanger::Body { extent, .. } => Extent {
            radius: extent.radius,
            height: extent.height,
        },
        NativeDanger::Region { .. } => Extent {
            radius: 0.0,
            height: 0.0,
        },
    }
}

pub fn danger_separation(
    point: Point,
    body: Extent,
    danger: &NativeDanger,
    profile: &NativeResponseProfile,
    at: f64,
) -> f64 {
    body_surface_distance(point, body, danger.point(), danger_extent(danger))
        - danger.uncertainty(profile, at)
}

pub(crate) fn route_danger_separation(
    from: Point,
    path: &[SurfacePoint],
    body: Extent,
    danger: &NativeDanger,
    profile: &NativeResponseProfile,
    at: f64,
    epsilon: f64,
    meters: &mut WorkMeters,
) -> Result<f64, WorkError> {
    if path.is_empty() {
        return Ok(danger_separation(from, body, danger, profile, at));
    }
    let mut minimum = f64::INFINITY;
    let mut previous = from;
    let other = BodyPiece {
        from: danger.point(),
        through: danger.point(),
        extent: danger_extent(danger),
    };
    let uncertainty = danger.uncertainty(profile, at);
    for point in path {
        meters.charge(&[(WorkUnit::Tests, 1)])?;
        let point = point.point();
        minimum = minimum.min(
            moving_bodies_minimum_separation(
                BodyPiece {
                    from: previous,
                    through: point,
                    extent: body,
                },
                other,
                epsilon,
            ) - uncertainty,
        );
        previous = point;
    }
    Ok(minimum)
}

/// The draw is supplied by the sole accepted-transition identity owner. Preparing
/// or comparing alternatives consumes no hidden draw, including tied bearings.
pub fn escape_bearing(from: Point, dangers: &[&NativeDanger], draw: f64, epsilon: f64) -> f64 {
    let tau = 2.0 * std::f64::consts::PI;
    let mut angles: Vec<f64> = dangers
        .iter()
        .filter_map(|danger| {
            let point = danger.point();
            let dx = point.x - from.x;
            let dz = point.z - from.z;
            if dx.hypot(dz) > epsilon {
                return Some((dz.atan2(dx) + tau) % tau);
            }
            match danger {
                NativeDanger::Region {
                    incoming: Some(incoming),
                    ..
                } => Some((incoming.z.atan2(incoming.x) + tau) % tau),
                _ => None,
            }
        })
        .collect();
    angles.sort_by(f64::total_cmp);
    if angles.is_empty() {
        return draw * tau;
    }
    let gaps: Vec<(f64, f64)> = angles
        .iter()
        .enumerate()
        .map(|(index, angle)| {
            let next = angles[(index + 1) % angles.len()]
                + if index == angles.len() - 1 { tau } else { 0.0 };
            (next - angle, (next + angle) / 2.0)
        })
        .collect();
    let widest = gaps
        .iter()
        .map(|gap| gap.0)
        .fold(f64::NEG_INFINITY, f64::max);
    let tied: Vec<_> = gaps
        .iter()
        .filter(|gap| gap.0 >= widest - epsilon)
        .collect();
    tied[((draw * tied.len() as f64).floor() as usize).min(tied.len() - 1)].1 % tau
}
