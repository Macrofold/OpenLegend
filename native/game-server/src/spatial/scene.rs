//! Map-bound support and collision data shared by all physical queries.

use super::{
    Bounds, EPS, Point, SKIN, SpatialError, add, coordinates, cross, dot, extent, length, point,
    scale, sub,
};
use super::{
    collision::Solid,
    index::{Entry, Node},
};
use openlegend_simulation::{
    geometry::{FinitePanel, GeometryMap, WalkableSurface},
    state::BodyProfile,
};

pub(super) struct Plane {
    pub normal: Point,
    pub bound: f64,
}

impl Plane {
    fn new(x: f64, y: f64, z: f64, bound: f64) -> Self {
        Self {
            normal: Point { x, y, z },
            bound,
        }
    }

    fn at(normal: Point, point: Point) -> Self {
        Self {
            normal,
            bound: dot(normal, point),
        }
    }
}

pub(super) struct Shape {
    pub id: String,
    pub bounds: Bounds,
    pub planes: [Plane; 6],
    pub vertices: [Point; 8],
    pub edges: Vec<Point>,
    pub surface: Option<usize>,
    pub sight: bool,
    pub transmission: f64,
    pub solid: Option<Solid>,
}

pub(super) struct StandardSupport {
    pub id: String,
    pub min_x: f64,
    pub max_x: f64,
    pub min_z: f64,
    pub max_z: f64,
    pub y: f64,
    pub slope_x: f64,
    pub slope_z: f64,
    pub terrain: bool,
}

impl From<&WalkableSurface> for StandardSupport {
    fn from(value: &WalkableSurface) -> Self {
        Self {
            id: value.id.clone(),
            min_x: value.min_x,
            max_x: value.max_x,
            min_z: value.min_z,
            max_z: value.max_z,
            y: value.y,
            slope_x: value.slope_x,
            slope_z: value.slope_z,
            terrain: value.terrain == Some(true),
        }
    }
}

impl StandardSupport {
    pub(super) fn y_at(&self, x: f64, z: f64) -> f64 {
        self.y + (x - self.min_x) * self.slope_x + (z - self.min_z) * self.slope_z
    }

    pub(super) fn contains(&self, p: Point) -> bool {
        self.min_x - EPS <= p.x
            && p.x <= self.max_x + EPS
            && self.min_z - EPS <= p.z
            && p.z <= self.max_z + EPS
    }

    pub(super) fn point(&self, x: f64, z: f64) -> super::SurfacePoint {
        super::SurfacePoint {
            x,
            y: self.y_at(x, z),
            z,
            surface_id: self.id.clone(),
        }
    }

    fn corners(&self) -> [Point; 4] {
        [
            (self.min_x, self.min_z),
            (self.min_x, self.max_z),
            (self.max_x, self.min_z),
            (self.max_x, self.max_z),
        ]
        .map(|(x, z)| Point {
            x,
            y: self.y_at(x, z),
            z,
        })
    }
}

pub(super) struct Scene {
    pub supports: Vec<StandardSupport>,
    pub shapes: Vec<Shape>,
    pub shape_index: Option<Node>,
    supports_index: Option<Node>,
    support_by_id: std::collections::HashMap<String, usize>,
}

const AXES: [Point; 3] = [
    Point {
        x: 1.0,
        y: 0.0,
        z: 0.0,
    },
    Point {
        x: 0.0,
        y: 1.0,
        z: 0.0,
    },
    Point {
        x: 0.0,
        y: 0.0,
        z: 1.0,
    },
];

impl Scene {
    pub(super) fn new<'a>(map: &GeometryMap, blockers: impl Iterator<Item=&'a openlegend_simulation::geometry::SpatialBlocker>) -> Result<Self, SpatialError> {
        let mut supports: Vec<StandardSupport> =
            map.spatial.surfaces.iter().map(Into::into).collect();
        let mut shapes =
            Vec::with_capacity(map.spatial.surfaces.len() + map.spatial.blockers.len());
        for (index, (surface, s)) in map.spatial.surfaces.iter().zip(&supports).enumerate() {
            let tops = s.corners();
            let vertices = std::array::from_fn(|i| {
                let mut p = tops[i / 2];
                if i % 2 != 0 {
                    p.y = surface.solid_base.unwrap_or(p.y - surface.thickness);
                }
                p
            });
            let bounds = extent(vertices);
            let intercept = s.y - s.min_x * s.slope_x - s.min_z * s.slope_z;
            let solid = Solid::new(
                &bounds,
                (s.slope_x != 0.0 || s.slope_z != 0.0).then_some(vertices.as_slice()),
            )?;
            shapes.push(Shape {
                id: s.id.clone(),
                bounds,
                vertices,
                surface: Some(index),
                sight: true,
                transmission: surface.acoustic_transmission,
                solid: Some(solid),
                planes: [
                    Plane::new(1.0, 0.0, 0.0, s.max_x),
                    Plane::new(-1.0, 0.0, 0.0, -s.min_x),
                    Plane::new(0.0, 0.0, 1.0, s.max_z),
                    Plane::new(0.0, 0.0, -1.0, -s.min_z),
                    Plane::new(-s.slope_x, 1.0, -s.slope_z, intercept),
                    match surface.solid_base {
                        Some(y) => Plane::new(0.0, -1.0, 0.0, -y),
                        None => {
                            Plane::new(s.slope_x, -1.0, s.slope_z, surface.thickness - intercept)
                        }
                    },
                ],
                edges: vec![
                    Point {
                        y: s.slope_x,
                        ..AXES[0]
                    },
                    Point {
                        y: s.slope_z,
                        ..AXES[2]
                    },
                    AXES[1],
                    AXES[0],
                    AXES[2],
                ],
            });
        }
        for blocker in blockers {
            let boxes = blocker
                .boxes
                .as_deref()
                .unwrap_or(std::slice::from_ref(&blocker.bounds));
            for bounds in boxes {
                shapes.push(Shape::blocker(
                    blocker.id.clone(),
                    bounds.clone(),
                    blocker.panel.as_ref(),
                    blocker.movement,
                    blocker.sight,
                    blocker.acoustic_transmission,
                )?);
            }
        }
        let authored_supports = supports.len();
        for (z, row) in map.tiles.iter().enumerate() {
            for (x, tile) in row.iter().enumerate() {
                let Some(solid) = map
                    .terrain
                    .get(tile)
                    .and_then(|terrain| terrain.solid.as_ref())
                else {
                    continue;
                };
                let (x, z) = (x as f64, z as f64);
                let heights = [-0.5, 0.5]
                    .into_iter()
                    .flat_map(|dx| [-0.5, 0.5].map(move |dz| (dx, dz)))
                    .map(|(dx, dz)| {
                        let p = Point {
                            x: (x + dx).clamp(0.0, (map.width - 1) as f64),
                            y: 0.0,
                            z: (z + dz).clamp(0.0, (map.height - 1) as f64),
                        };
                        supports[..authored_supports]
                            .iter()
                            .find(|s| s.terrain && s.contains(p))
                            .map_or(0.0, |s| s.y_at(p.x, p.z))
                    });
                let (min_y, max_y) = heights
                    .fold((f64::INFINITY, f64::NEG_INFINITY), |(min, max), y| {
                        (min.min(y), max.max(y))
                    });
                let id = format!("terrain-solid:{x}:{z}");
                let bounds = Bounds {
                    min: Point {
                        x: x - 0.5,
                        y: min_y,
                        z: z - 0.5,
                    },
                    max: Point {
                        x: x + 0.5,
                        y: max_y + solid.height,
                        z: z + 0.5,
                    },
                };
                if solid.movement {
                    supports.push(StandardSupport {
                        id: id.clone(),
                        min_x: bounds.min.x,
                        max_x: bounds.max.x,
                        min_z: bounds.min.z,
                        max_z: bounds.max.z,
                        y: bounds.max.y,
                        slope_x: 0.0,
                        slope_z: 0.0,
                        terrain: false,
                    });
                }
                shapes.push(Shape::blocker(
                    id,
                    bounds,
                    None,
                    solid.movement,
                    solid.sight,
                    solid.acoustic_transmission,
                )?);
            }
        }
        if shapes.len() > authored_supports + 256 {
            return Err(SpatialError::InvalidMap);
        }
        let shape_index = Node::build(
            shapes
                .iter()
                .enumerate()
                .map(|(id, shape)| Entry {
                    id,
                    bounds: shape.bounds.clone(),
                })
                .collect(),
        );
        let supports_index = Node::build(
            supports
                .iter()
                .enumerate()
                .map(|(id, s)| Entry {
                    id,
                    bounds: extent(s.corners()),
                })
                .collect(),
        );
        let support_by_id = supports
            .iter()
            .enumerate()
            .map(|(id, s)| (s.id.clone(), id))
            .collect();
        Ok(Self {
            supports,
            shapes,
            shape_index,
            supports_index,
            support_by_id,
        })
    }

    pub(super) fn named(&self, id: &str) -> Option<&StandardSupport> {
        self.support_by_id.get(id).map(|i| &self.supports[*i])
    }

    pub(super) fn shape_contains_point(&self, point: Point, id: &str) -> bool {
        let bounds = Bounds {
            min: point,
            max: point,
        };
        self.shape_index.as_ref().is_some_and(|index| {
            index.visit(&|b| super::overlaps(b, &bounds, EPS), &mut |candidate| {
                let shape = &self.shapes[candidate];
                // A clicked exterior face belongs to the shape.
                shape.id == id
                    && shape.sight
                    && shape
                        .planes
                        .iter()
                        .all(|plane| dot(plane.normal, point) <= plane.bound + EPS)
            })
        })
    }

    pub(super) fn supports_in(&self, bounds: &Bounds) -> Vec<&StandardSupport> {
        let mut indices = Vec::new();
        if let Some(index) = &self.supports_index {
            index.visit(&|b| super::overlaps(b, bounds, EPS), &mut |id| {
                indices.push(id);
                false
            });
        }
        indices.sort_unstable();
        indices.into_iter().map(|i| &self.supports[i]).collect()
    }

    pub(super) fn visit_segment<'a>(
        &'a self,
        from: Point,
        to: Point,
        body: Option<&BodyProfile>,
        hit: &mut impl FnMut(&'a Shape, (f64, f64)) -> bool,
    ) -> bool {
        let from_xyz = coordinates(from);
        let delta = coordinates(sub(to, from));
        let radius = body.map_or(0.0, |b| b.radius);
        let height = body.map_or(0.0, |b| b.height);
        let skin = if body.is_some() { SKIN } else { 0.0 };
        let intersects = |bounds: &Bounds| {
            let low = coordinates(bounds.min);
            let high = coordinates(bounds.max);
            let mut enter: f64 = 0.0;
            let mut exit: f64 = 1.0;
            for i in 0..3 {
                let min = low[i] - if i == 1 { height } else { radius } - skin - EPS;
                let max = high[i] + if i == 1 { 0.0 } else { radius } + skin + EPS;
                if delta[i].abs() < EPS {
                    if from_xyz[i] < min || from_xyz[i] > max {
                        return false;
                    }
                } else {
                    let a = (min - from_xyz[i]) / delta[i];
                    let b = (max - from_xyz[i]) / delta[i];
                    enter = enter.max(a.min(b));
                    exit = exit.min(a.max(b));
                    if enter > exit {
                        return false;
                    }
                }
            }
            true
        };
        self.shape_index.as_ref().is_some_and(|index| {
            index.visit(&intersects, &mut |id| {
                let shape = &self.shapes[id];
                clip(from, to, &shape.planes, body).is_some_and(|range| hit(shape, range))
            })
        })
    }
}

impl Shape {
    fn blocker(
        id: String,
        bounds: Bounds,
        panel: Option<&FinitePanel>,
        movement: bool,
        sight: bool,
        transmission: f64,
    ) -> Result<Self, SpatialError> {
        let (vertices, planes, edges) = if let Some(panel) = panel {
            let [a, b, _, d] = panel.corners;
            let u = sub(b, a);
            let v = sub(d, a);
            let normal = unit(cross(u, v))?;
            let down = scale(normal, -1.0);
            let vertices = std::array::from_fn(|i| {
                if i < 4 {
                    panel.corners[i]
                } else {
                    add(panel.corners[i - 4], scale(down, panel.thickness))
                }
            });
            let mut planes = [
                Plane::at(normal, a),
                Plane::at(down, vertices[4]),
                Plane::at(normal, a),
                Plane::at(normal, a),
                Plane::at(normal, a),
                Plane::at(normal, a),
            ];
            for i in 0..4 {
                let edge = sub(panel.corners[(i + 1) % 4], panel.corners[i]);
                planes[i + 2] = Plane::at(unit(cross(edge, normal))?, panel.corners[i]);
            }
            (vertices, planes, vec![u, v, down])
        } else {
            let low = coordinates(bounds.min);
            let high = coordinates(bounds.max);
            let vertices = std::array::from_fn(|i| {
                point(std::array::from_fn(|axis| {
                    if i & (1 << axis) == 0 {
                        low[axis]
                    } else {
                        high[axis]
                    }
                }))
            });
            let planes = std::array::from_fn(|i| {
                if i % 2 == 0 {
                    Plane::at(AXES[i / 2], bounds.max)
                } else {
                    Plane::at(scale(AXES[i / 2], -1.0), bounds.min)
                }
            });
            (vertices, planes, AXES.to_vec())
        };
        let solid = if movement {
            Some(Solid::new(
                &bounds,
                panel.is_some().then_some(vertices.as_slice()),
            )?)
        } else {
            None
        };
        Ok(Self {
            id,
            bounds,
            planes,
            edges,
            vertices,
            surface: None,
            sight,
            transmission,
            solid,
        })
    }
}

fn unit(p: Point) -> Result<Point, SpatialError> {
    let len = length(p);
    if len <= 0.0 || !len.is_finite() {
        return Err(SpatialError::InvalidMap);
    }
    Ok(Point {
        x: p.x / len,
        y: p.y / len,
        z: p.z / len,
    })
}

pub(super) fn clip(
    from: Point,
    to: Point,
    planes: &[Plane],
    body: Option<&BodyProfile>,
) -> Option<(f64, f64)> {
    let (mut enter, mut exit): (f64, f64) = (0.0, 1.0);
    let delta = sub(to, from);
    for plane in planes {
        let n = plane.normal;
        let expansion = body.map_or(0.0, |b| {
            (b.radius + SKIN) * (n.x.abs() + n.z.abs())
                + (-n.y * b.height).max(0.0)
                + n.y.abs() * SKIN
        });
        let origin = dot(n, from);
        let slope = dot(n, delta);
        let limit = plane.bound + expansion - EPS;
        if slope.abs() < EPS {
            if origin > limit {
                return None;
            }
        } else {
            let t = (limit - origin) / slope;
            if slope < 0.0 {
                enter = enter.max(t);
            } else {
                exit = exit.min(t);
            }
            if enter > exit {
                return None;
            }
        }
    }
    (enter <= 1.0 && exit >= 0.0).then_some((enter.max(0.0), exit.min(1.0)))
}
