//! Exact relative point contact, as in packages/spatial/src/projectile-contact.ts.
//! The ordinary body shape supplies the same short cylinder or upright capsule.
use super::{DistanceInterval, Extent, Point};

fn within(a: f64, b: f64, c: f64) -> Option<DistanceInterval> {
    if a < 1e-20 {
        return (c <= 0.0).then_some(DistanceInterval {
            enter: 0.0,
            exit: 1.0,
        });
    }
    let discriminant = b * b - 4.0 * a * c;
    if discriminant < 0.0 {
        return None;
    }
    let root = discriminant.sqrt();
    let enter = ((-b - root) / (2.0 * a)).max(0.0);
    let exit = ((-b + root) / (2.0 * a)).min(1.0);
    (enter <= exit).then_some(DistanceInterval { enter, exit })
}

fn slab(start: f64, travel: f64, low: f64, high: f64) -> Option<DistanceInterval> {
    if travel.abs() < 1e-12 {
        return (low..=high).contains(&start).then_some(DistanceInterval {
            enter: 0.0,
            exit: 1.0,
        });
    }
    let first = (low - start) / travel;
    let second = (high - start) / travel;
    let enter = first.min(second).max(0.0);
    let exit = first.max(second).min(1.0);
    (enter <= exit).then_some(DistanceInterval { enter, exit })
}

/// Intersect a point with a moving upright body throughout the same piece.
/// This catches a crossing even when the point overlaps neither endpoint.
pub(crate) fn moving_point_contact(
    from: Point,
    to: Point,
    body_from: Point,
    body_to: Point,
    body: Extent,
) -> Option<DistanceInterval> {
    let px = from.x - body_from.x;
    let py = from.y - body_from.y;
    let pz = from.z - body_from.z;
    let dx = to.x - body_to.x - px;
    let dy = to.y - body_to.y - py;
    let dz = to.z - body_to.z - pz;
    let radius = body.radius;
    let height = body.height;
    let capsule = height >= 2.0 * radius;
    let horizontal = within(
        dx * dx + dz * dz,
        2.0 * (px * dx + pz * dz),
        px * px + pz * pz - radius * radius,
    );
    let cap = if capsule { radius } else { 0.0 };
    let mut result = horizontal
        .zip(slab(py, dy, cap, height - cap))
        .and_then(|(a, b)| {
            let enter = a.enter.max(b.enter);
            let exit = a.exit.min(b.exit);
            (enter <= exit).then_some(DistanceInterval { enter, exit })
        });
    if capsule {
        for center in [radius, height - radius] {
            let y = py - center;
            if let Some(sphere) = within(
                dx * dx + dy * dy + dz * dz,
                2.0 * (px * dx + y * dy + pz * dz),
                px * px + y * y + pz * pz - radius * radius,
            ) {
                result = Some(result.map_or(sphere, |cylinder| DistanceInterval {
                    enter: cylinder.enter.min(sphere.enter),
                    exit: cylinder.exit.max(sphere.exit),
                }));
            }
        }
    }
    result
}
