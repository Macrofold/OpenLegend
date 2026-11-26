//! Shared finite panel geometry for collision, sight and vertical rain.
use super::FinitePanel;
use crate::state::Point;

pub struct PanelPlane {
    pub normal: Point,
    pub bound: f64,
}

impl PanelPlane {
    pub fn at(normal: Point, point: Point) -> Self {
        Self {
            normal,
            bound: normal.x * point.x + normal.y * point.y + normal.z * point.z,
        }
    }
}

pub struct PanelPrism {
    pub vertices: [Point; 8],
    pub planes: [PanelPlane; 6],
    pub edges: [Point; 3],
}

impl FinitePanel {
    /// Derive the top, underside and four finite rims without allocation.
    /// The face winding defines the direction of the normal-thickness rim.
    pub fn prism(&self) -> Option<PanelPrism> {
        let [a, b, _, d] = self.corners;
        let difference = |p: Point, q: Point| Point {
            x: p.x - q.x,
            y: p.y - q.y,
            z: p.z - q.z,
        };
        let cross_unit = |p: Point, q: Point| {
            let x = p.y * q.z - p.z * q.y;
            let y = p.z * q.x - p.x * q.z;
            let z = p.x * q.y - p.y * q.x;
            let length = crate::spatial::distance(
                Point { x, y, z },
                Point {
                    x: 0.0,
                    y: 0.0,
                    z: 0.0,
                },
            );
            (length > 0.0 && length.is_finite()).then(|| Point {
                x: x / length,
                y: y / length,
                z: z / length,
            })
        };
        let u = difference(b, a);
        let v = difference(d, a);
        let normal = cross_unit(u, v)?;
        let down = Point {
            x: -normal.x,
            y: -normal.y,
            z: -normal.z,
        };
        let vertices = std::array::from_fn(|i| {
            let p = self.corners[i % 4];
            if i < 4 {
                p
            } else {
                Point {
                    x: p.x + down.x * self.thickness,
                    y: p.y + down.y * self.thickness,
                    z: p.z + down.z * self.thickness,
                }
            }
        });
        let rim = |i: usize| {
            let at = self.corners[i];
            let edge = difference(self.corners[(i + 1) % 4], at);
            Some(PanelPlane::at(cross_unit(edge, normal)?, at))
        };
        Some(PanelPrism {
            vertices,
            planes: [
                PanelPlane::at(normal, a),
                PanelPlane::at(down, vertices[4]),
                rim(0)?,
                rim(1)?,
                rim(2)?,
                rim(3)?,
            ],
            edges: [u, v, down],
        })
    }
}
