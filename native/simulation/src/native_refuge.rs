//! Local-refuge comparison over the animal's actually received danger records.
//! Physical clearance and personally certified terrain are separate prerequisites;
//! none of these numerical comparisons grants either or draws randomness.

use crate::native_response::{NativeDanger, NativeResponseProfile, RefugeCandidate};
use crate::reception::AcousticDirection;
use crate::spatial::{BodyPiece, Extent, body_surface_distance, moving_bodies_minimum_separation};
use crate::state::{Point, SurfacePoint};

pub struct RefugeScore {
    pub candidate: RefugeCandidate,
    pub worsening: f64,
    pub arrival_margin: f64,
}

pub struct RefugeRoute {
    pub score: RefugeScore,
    pub path: Vec<SurfacePoint>,
    pub length: f64,
}

pub struct AcousticPreference<'a> {
    pub origin: Point,
    pub direction: Option<&'a AcousticDirection>,
    pub retain: bool,
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

pub struct RouteSeparation {
    pub minimum: f64,
    pub tests: u64,
}

pub fn route_danger_separation(
    from: Point,
    path: &[Point],
    body: Extent,
    danger: &NativeDanger,
    profile: &NativeResponseProfile,
    at: f64,
    epsilon: f64,
) -> RouteSeparation {
    if path.is_empty() {
        return RouteSeparation {
            minimum: danger_separation(from, body, danger, profile, at),
            tests: 0,
        };
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
        minimum = minimum.min(
            moving_bodies_minimum_separation(
                BodyPiece {
                    from: previous,
                    through: *point,
                    extent: body,
                },
                other,
                epsilon,
            ) - uncertainty,
        );
        previous = *point;
    }
    RouteSeparation {
        minimum,
        tests: path.len() as u64,
    }
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

/// Returns indices into the supplied stable route order. Retained continuation,
/// safety class and acoustic preference are evaluated before the one later draw.
pub fn refuge_choices(
    routes: &[&RefugeScore],
    profile: &NativeResponseProfile,
    acoustic: Option<&AcousticPreference<'_>>,
    epsilon: f64,
) -> Vec<usize> {
    if routes.is_empty() {
        return Vec::new();
    }
    let compare = |a: usize, b: usize| {
        let a = routes[a];
        let b = routes[b];
        if (a.worsening - b.worsening).abs() > epsilon {
            return a.worsening - b.worsening;
        }
        if (a.arrival_margin >= -epsilon) != (b.arrival_margin >= -epsilon) {
            return if a.arrival_margin >= -epsilon {
                -1.0
            } else {
                1.0
            };
        }
        b.arrival_margin - a.arrival_margin
    };
    let mut order: Vec<usize> = (0..routes.len()).collect();
    // Keep source ties in input order. Explicit insertion also avoids relying on
    // a total-order comparator: the source's tolerance comparison is not one.
    let mut run = 1;
    if order.len() > 1 {
        let descending = compare(order[1], order[0]) < 0.0;
        run = 2;
        while run < order.len()
            && if descending {
                compare(order[run], order[run - 1]) < 0.0
            } else {
                compare(order[run], order[run - 1]) >= 0.0
            }
        {
            run += 1;
        }
        if descending {
            order[..run].reverse();
        }
    }
    for index in run..order.len() {
        let item = order[index];
        let mut low = 0;
        let mut high = index;
        while low < high {
            let middle = (low + high) / 2;
            if compare(item, order[middle]) < 0.0 {
                high = middle;
            } else {
                low = middle + 1;
            }
        }
        order[low..=index].rotate_right(1);
    }
    let best = order[0];
    if let Some(retained) = routes
        .iter()
        .position(|route| route.candidate.retained == Some(true))
        && acoustic.is_none_or(|preference| preference.retain)
    {
        if best == retained {
            return vec![retained];
        }
        let best_score = routes[best];
        let retained_score = routes[retained];
        let improves_class = best_score.worsening < retained_score.worsening - epsilon
            || ((best_score.worsening - retained_score.worsening).abs() <= epsilon
                && best_score.arrival_margin >= -epsilon
                && retained_score.arrival_margin < -epsilon);
        if !improves_class
            && best_score.arrival_margin
                < retained_score.arrival_margin + profile.candidates.continuity_improvement
                    - epsilon
        {
            return vec![retained];
        }
    }
    let best_score = routes[best];
    let mut interchangeable: Vec<usize> = routes
        .iter()
        .enumerate()
        .filter_map(|(index, route)| {
            ((route.candidate.retained != Some(true)
                || acoustic.is_some_and(|preference| !preference.retain))
                && (route.worsening - best_score.worsening).abs() <= epsilon
                && (route.arrival_margin >= -epsilon) == (best_score.arrival_margin >= -epsilon)
                && route.arrival_margin
                    >= best_score.arrival_margin - profile.candidates.tie_margin - epsilon)
                .then_some(index)
        })
        .collect();
    if let Some(AcousticPreference {
        origin,
        direction: Some(direction),
        ..
    }) = acoustic
        && !interchangeable.is_empty()
    {
        let angle = direction.sector as f64 * std::f64::consts::PI / 4.0;
        let progress = |index: usize| {
            -(routes[index].candidate.point.x - origin.x) * angle.cos()
                - (routes[index].candidate.point.z - origin.z) * angle.sin()
        };
        let away = interchangeable
            .iter()
            .map(|index| progress(*index))
            .fold(f64::NEG_INFINITY, f64::max);
        interchangeable.retain(|index| progress(*index) >= away - epsilon);
    }
    if let Some(preferred) = interchangeable.iter().copied().find(|index| {
        routes[*index].candidate.preferred == Some(true)
            && routes[*index].arrival_margin >= -epsilon
    }) {
        vec![preferred]
    } else {
        interchangeable
    }
}
