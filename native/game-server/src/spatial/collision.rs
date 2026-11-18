//! Shape queries from the same Parry implementation used by Rapier JS 0.20.0.
//! Positions and velocities are computed in f64 then handed to the f32 solver
//! at the same boundary as the pinned JavaScript adapter.

use parry3d::{
    math::{Pose, Vector},
    query::{self, ShapeCastOptions},
    shape::{Capsule, Cuboid, Cylinder, Shape, SharedShape},
};

use super::{Bounds, Point, SKIN, SpatialError, add, scale, sub};
use openlegend_simulation::state::BodyProfile;

fn vector(p: Point) -> Vector {
    Vector::new(p.x as f32, p.y as f32, p.z as f32)
}

pub(super) struct Solid {
    pose: Pose,
    shape: SharedShape,
}

impl Solid {
    pub(super) fn new(bounds: &Bounds, convex: Option<&[Point]>) -> Result<Self, SpatialError> {
        let centre = scale(add(bounds.min, bounds.max), 0.5);
        let shape = match convex {
            Some(points) => SharedShape::convex_hull(
                &points
                    .iter()
                    .map(|p| vector(sub(*p, centre)))
                    .collect::<Vec<_>>(),
            )
            .ok_or(SpatialError::InvalidMap)?,
            None => {
                let half = scale(sub(bounds.max, bounds.min), 0.5);
                SharedShape::cuboid(half.x as f32, half.y as f32, half.z as f32)
            }
        };
        Ok(Self {
            pose: Pose::from_translation(vector(centre)),
            shape,
        })
    }

    pub(super) fn sweep(&self, from: Point, to: Point, body: &BodyProfile) -> Option<f64> {
        sweep(&self.pose, self.shape.as_ref(), from, to, body)
    }
}

pub(super) fn sweep_box(
    bounds: &Bounds,
    from: Point,
    to: Point,
    body: &BodyProfile,
) -> Option<f64> {
    if disjoint_box(bounds, from, to, body) {
        return None;
    }
    let centre = scale(add(bounds.min, bounds.max), 0.5);
    let shape = Cuboid::new(vector(scale(sub(bounds.max, bounds.min), 0.5)));
    sweep(
        &Pose::from_translation(vector(centre)),
        &shape,
        from,
        to,
        body,
    )
}

fn sweep(
    other_pos: &Pose,
    other: &dyn Shape,
    from: Point,
    to: Point,
    body: &BodyProfile,
) -> Option<f64> {
    let centre = Point {
        y: from.y + body.height / 2.0,
        ..from
    };
    let pos = Pose::from_translation(vector(centre));
    let velocity = sub(to, from);
    let radius = (body.radius + SKIN) as f32;
    let capsule;
    let cylinder;
    let shape: &dyn Shape = if body.height >= 2.0 * body.radius {
        capsule = Capsule::new_y((body.height / 2.0 - body.radius) as f32, radius);
        &capsule
    } else {
        cylinder = Cylinder::new((body.height / 2.0 + SKIN) as f32, radius);
        &cylinder
    };
    // The finite shapes here implement both queries through Parry's support maps.
    if velocity.x.abs() + velocity.y.abs() + velocity.z.abs() < 1e-9 {
        let contact =
            query::contact(&pos, shape, other_pos, other, 0.0).expect("supported shape contact")?;
        (f64::from(contact.dist) < -1e-5).then_some(0.0)
    } else {
        let hit = query::cast_shapes(
            &pos,
            vector(velocity),
            shape,
            other_pos,
            Vector::ZERO,
            other,
            ShapeCastOptions {
                max_time_of_impact: 1.0,
                target_distance: 0.0,
                stop_at_penetration: true,
                compute_impact_geometry_on_penetration: true,
            },
        )
        .expect("supported shape cast")?;
        Some(f64::from(hit.time_of_impact))
    }
}

// The Source box preflight accounts for rounding before the f32 solver.
fn disjoint_box(bounds: &Bounds, a: Point, b: Point, body: &BodyProfile) -> bool {
    use super::coordinates;
    let maximum = [a, b, bounds.min, bounds.max]
        .into_iter()
        .flat_map(coordinates)
        .fold(body.radius.max(body.height), |largest, value| {
            largest.max(value.abs())
        });
    let rounding = 1e-3_f64.max(maximum * (1.0 / (1 << 20) as f64));
    let radius = body.radius + SKIN + rounding;
    a.x.max(b.x) + radius < bounds.min.x
        || a.x.min(b.x) - radius > bounds.max.x
        || a.z.max(b.z) + radius < bounds.min.z
        || a.z.min(b.z) - radius > bounds.max.z
        || a.y.max(b.y) + body.height + SKIN + rounding < bounds.min.y
        || a.y.min(b.y) - SKIN - rounding > bounds.max.y
}
