//! Query the actual support disk and upright clearance volume. This is pure
//! geometry. The installed object definition owns the dimensions it supplies.
use super::walking::SUPPORT;
use super::*;
use openlegend_simulation::geometry::{
    PlacementClearance, PlacementStance, PlacementStances, PlacementVolume,
};

impl SpatialProvider {
    pub(super) fn solid_space(&self, query: &openlegend_simulation::geometry::SolidSpace) -> bool {
        self.scene.named(&query.support).is_some() && query.pieces.iter().all(|piece| {
            volume(piece) && self.scene.shape_index.as_ref().is_none_or(|index| {
                !index.visit(&|bounds| overlaps(bounds, piece, EPS), &mut |id| {
                    let shape = &self.scene.shapes[id];
                    shape.id != query.support
                        && !query.moving.contains(&shape.id)
                        && shape.solid.as_ref().is_some_and(|solid| solid.intersects_box(piece))
                })
            })
        })
    }

    pub(super) fn placement_clearance(&self, query: &PlacementVolume) -> PlacementClearance {
        use PlacementClearance::*;
        let point = query.site.point();
        let Some(support) = self.scene.named(&query.site.surface_id) else {
            return Unsupported;
        };
        let reach = query.radius;
        let bounds = Bounds {
            min: Point {
                x: point.x - reach,
                y: point.y,
                z: point.z - reach,
            },
            max: Point {
                x: point.x + reach,
                y: point.y + query.clearance,
                z: point.z + reach,
            },
        };
        if !finite(point)
            || !reach.is_finite()
            || reach <= 0.0
            || !query.clearance.is_finite()
            || query.clearance <= 0.0
            || !query.maximum_height_difference.is_finite()
            || query.maximum_height_difference < 0.0
            || (query.terrain_only && !support.terrain)
            || bounds.min.x < support.min_x - EPS
            || bounds.max.x > support.max_x + EPS
            || bounds.min.z < support.min_z - EPS
            || bounds.max.z > support.max_z + EPS
            || (support.y_at(point.x, point.z) - point.y).abs() > SUPPORT
            || 2.0 * reach * support.slope_x.hypot(support.slope_z)
                > query.maximum_height_difference + EPS
            || support.terrain && !self.terrain_supports_disk(point, &bounds, reach)
        {
            return Unsupported;
        }
        if self.scene.shape_index.as_ref().is_some_and(|index| {
            index.visit(&|piece| overlaps(piece, &bounds, EPS), &mut |at| {
                let shape = &self.scene.shapes[at];
                shape.id != query.site.surface_id
                    && shape.solid.as_ref().is_some_and(|solid| {
                        solid.intersects_upright(point, reach, query.clearance)
                    })
            })
        }) {
            return Blocked;
        }
        if query.bodies.iter().any(|body| {
            overlaps(body, &bounds, EPS)
                && collision::box_intersects_upright(body, point, reach, query.clearance)
        }) {
            return Occupied;
        }
        Clear
    }

    fn terrain_supports_disk(&self, point: Point, bounds: &Bounds, radius: f64) -> bool {
        if bounds.min.x < 0.0
            || bounds.min.z < 0.0
            || bounds.max.x > (self.width - 1) as f64
            || bounds.max.z > (self.height - 1) as f64
        {
            return false;
        }
        let low_x = (bounds.min.x + 0.5).floor() as i64;
        let high_x = (bounds.max.x + 0.5).ceil() as i64;
        let low_z = (bounds.min.z + 0.5).floor() as i64;
        let high_z = (bounds.max.z + 0.5).ceil() as i64;
        for z in low_z..high_z {
            for x in low_x..high_x {
                let dx = ((point.x - x as f64).abs() - 0.5).max(0.0);
                let dz = ((point.z - z as f64).abs() - 0.5).max(0.0);
                if dx * dx + dz * dz < radius * radius && !self.terrain_at(x, z) {
                    return false;
                }
            }
        }
        true
    }
}

impl SpatialProvider {
    pub(super) fn placement_stances(&self, query: &PlacementStances) -> Vec<PlacementStance> {
        let Some(support) = self.scene.named(&query.site.surface_id) else {
            return Vec::new();
        };
        if let Some(candidate) = &query.exact {
            return if self.work_stance_clear(query, candidate, &query.from) {
                vec![candidate.clone()]
            } else {
                Vec::new()
            };
        }
        let site = query.site.point();
        let angle = (query.from.z - site.z).atan2(query.from.x - site.x);
        let distance = query.radius + std::f64::consts::SQRT_2 * query.body.radius + 2.0 * SKIN;
        let mut result = Vec::with_capacity(8);
        for index in 0..8 {
            let heading = angle + (f64::from(index) * std::f64::consts::PI) / 4.0;
            let (z, x) = heading.sin_cos();
            let candidate = PlacementStance {
                stance: support.point(site.x + x * distance, site.z + z * distance),
                point: Point {
                    x: site.x + x * query.radius,
                    y: site.y + query.height,
                    z: site.z + z * query.radius,
                },
            };
            if self.work_stance_clear(query, &candidate, &candidate.stance) {
                result.push(candidate);
            }
        }
        // Stable ordering keeps angle order for equal distances, as in the
        // source physical-work search. No path or authority is granted here.
        result.sort_by(|a, b| {
            super::distance(query.from.point(), a.stance.point())
                .total_cmp(&super::distance(query.from.point(), b.stance.point()))
        });
        result
    }

    fn work_stance_clear(
        &self,
        query: &PlacementStances,
        candidate: &PlacementStance,
        actual: &SurfacePoint,
    ) -> bool {
        let point = actual.point();
        let anchor = Point {
            y: point.y + query.interaction_height,
            ..point
        };
        let body = &query.body;
        let max_radius = body.radius + SKIN;
        let footprint = Bounds {
            min: Point {
                x: query.site.x - query.radius,
                y: query.site.y,
                z: query.site.z - query.radius,
            },
            max: Point {
                x: query.site.x + query.radius,
                y: query.site.y + query.height,
                z: query.site.z + query.radius,
            },
        };
        let occupancy = Bounds {
            min: Point {
                x: point.x - max_radius,
                y: point.y - SKIN,
                z: point.z - max_radius,
            },
            max: Point {
                x: point.x + max_radius,
                y: point.y + body.height + SKIN,
                z: point.z + max_radius,
            },
        };
        actual.surface_id == query.site.surface_id
            && self.can_stand(&candidate.stance, body)
            && self.can_stand(actual, body)
            && collision::sweep_box(&footprint, point, point, body).is_none()
            && super::distance(anchor, candidate.point) <= query.reach
            && !self
                .scene
                .visit_segment(anchor, candidate.point, None, &mut |shape, (a, b)| {
                    shape.solid.is_some() && a < b
                })
            && !query.bodies.iter().any(|bounds| {
                occupancy.min.x < bounds.max.x
                    && occupancy.max.x > bounds.min.x
                    && occupancy.min.y < bounds.max.y
                    && occupancy.max.y > bounds.min.y
                    && occupancy.min.z < bounds.max.z
                    && occupancy.max.z > bounds.min.z
            })
    }
}
