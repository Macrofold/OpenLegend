//! The immutable physical geometry used as source evidence. The simulation
//! owns eligibility, acquisition and disclosure of these indexed pieces.

use super::{
    Bounds, EPS, Point, SpatialError, coordinates, cross, distance, dot, extent,
    index::{Entry, Members, Node},
    length, overlaps, point,
    scene::{Scene, StandardSupport},
    sub,
};
use indexmap::IndexMap;
use openlegend_simulation::{
    encoding::json_record,
    geometry::{
        GeometryMap, PhysicalFeature, PhysicalFeatureAnswer, PhysicalFeatureKind,
        PhysicalFeatureQuery, PhysicalQueryStatus,
    },
    host::{ByteBudget, ResidentReservation},
    reception::BoundsQueryCursor,
};
use std::{collections::HashMap, mem::size_of};

pub(super) struct Features {
    values: Vec<PhysicalFeature>,
    by_id: HashMap<String, usize>,
    root: Option<Node>,
    max_text: usize,
    depth: usize,
    _resident: ResidentReservation,
}

impl Features {
    pub(super) fn new(
        map: &GeometryMap,
        scene: &Scene,
        source_units: usize,
        budget: &ByteBudget,
    ) -> Result<Self, SpatialError> {
        // Each raster cell can produce at most one top; the connected runs may
        // combine them. An exact convex solid has no more than six faces.
        let count = scene
            .supports
            .iter()
            .map(|s| {
                if s.terrain {
                    ((s.max_x + 0.5).floor() - (s.min_x + 0.5).floor() + 1.0) as usize
                        * ((s.max_z + 0.5).floor() - (s.min_z + 0.5).floor() + 1.0) as usize
                } else {
                    1
                }
            })
            .sum::<usize>()
            + scene.shapes.len() * 6;
        let max_text = 7 * source_units + 256;
        let entry_bound = size_of::<PhysicalFeature>() + max_text + source_units;
        let scratch = budget.reserve(
            count
                * (2 * entry_bound
                    + max_text
                    + 2 * size_of::<Node>()
                    + 4 * size_of::<Entry>()
                    + 64),
        )?;
        let mut values = Vec::new();
        for s in &scene.supports {
            if s.terrain {
                terrain_features(map, s, &mut values)?;
            } else {
                support_feature(s, s.min_x, s.max_x, s.min_z, s.max_z, &mut values)?;
            }
        }
        for (id, shape) in scene.shapes.iter().enumerate() {
            for (ordinal, plane) in shape.planes.iter().enumerate() {
                if shape.surface.is_some() && ordinal == 4 {
                    continue;
                }
                let mut points: Vec<Point> = shape
                    .vertices
                    .iter()
                    .copied()
                    .enumerate()
                    .filter_map(|(i, p)| {
                        ((dot(plane.normal, p) - plane.bound).abs() <= EPS * 4.0
                            && !shape.vertices[..i]
                                .iter()
                                .any(|&other| distance(p, other) <= EPS))
                        .then_some(p)
                    })
                    .collect();
                if points.len() != 3 && points.len() != 4 {
                    continue;
                }
                let centre = point(std::array::from_fn(|i| {
                    points.iter().map(|&p| coordinates(p)[i]).sum::<f64>() / points.len() as f64
                }));
                let len = length(plane.normal);
                let normal = point(coordinates(plane.normal).map(|x| x / len));
                let u = sub(points[0], centre);
                let v = cross(normal, u);
                let angle = |p: Point| {
                    let a = sub(p, centre);
                    openlegend_simulation::spatial::atan2(dot(a, v), dot(a, u))
                };
                points.sort_by(|&a, &b| {
                    (angle(a) - angle(b))
                        .partial_cmp(&0.0)
                        .expect("finite face angle")
                });
                if points.len() == 3 {
                    points.push(points[2]);
                }
                let vertices = points.try_into().expect("four face vertices");
                let kind = if shape.surface.is_some() {
                    "surface"
                } else {
                    "blocker"
                };
                let id = json_record(&("face", kind, &shape.id, id, ordinal))
                    .map_err(|_| SpatialError::InvalidMap)?;
                values.push(PhysicalFeature {
                    id,
                    source_id: shape.id.clone(),
                    kind: PhysicalFeatureKind::SolidFace,
                    vertices,
                    normal,
                    bounds: extent(vertices),
                });
            }
        }
        let by_id: HashMap<_, _> = values
            .iter()
            .enumerate()
            .map(|(i, v)| (v.id.clone(), i))
            .collect();
        let root = Node::build(
            values
                .iter()
                .enumerate()
                .map(|(id, f)| Entry {
                    id,
                    bounds: f.bounds.clone(),
                })
                .collect(),
        );
        let depth = values.len().max(1).next_power_of_two().ilog2() as usize + 1;
        let max_text = values
            .iter()
            .map(|f| f.id.len() + f.source_id.len())
            .max()
            .unwrap_or(0);
        // Measure retained strings and container capacity. Nodes own boxed
        // pairs and four-entry leaves, never references back to build scratch.
        let strings = values
            .iter()
            .map(|f| f.id.capacity() * 2 + f.source_id.capacity())
            .sum::<usize>();
        let spatial_storage = root.as_ref().map_or(0, node_bytes);
        let resident = budget.resident().reserve(
            size_of::<Self>()
                + strings
                + values.capacity() * size_of::<PhysicalFeature>()
                + by_id.capacity() * (size_of::<(String, usize)>() + 2)
                + spatial_storage,
        )?;
        drop(scratch);
        Ok(Self {
            values,
            by_id,
            root,
            max_text,
            depth,
            _resident: resident,
        })
    }

    pub(super) fn get(&self, id: &str) -> Option<&PhysicalFeature> {
        self.by_id.get(id).map(|i| &self.values[*i])
    }
    pub(super) fn len(&self) -> usize {
        self.values.len()
    }
    pub(super) fn element_bytes(&self) -> usize {
        size_of::<PhysicalFeature>() + self.max_text
    }
    pub(super) fn cursor_bytes(&self) -> usize {
        64 * (size_of::<Vec<i64>>() + (self.depth + 1) * size_of::<i64>())
    }
    pub(super) fn working_bytes(&self, visits: usize) -> usize {
        (64 + 3 * visits) * 2 * (size_of::<Task>() + 2 * (self.depth + 1) * size_of::<i64>())
    }

    pub(super) fn query(
        &self,
        q: &PhysicalFeatureQuery,
    ) -> Result<PhysicalFeatureAnswer, SpatialError> {
        let intersects = |b: &Bounds| {
            overlaps(b, &q.bounds, 0.0) && distance_to_bounds(b, q.radial_origin) <= q.radial_radius
        };
        let priority = |b: &Bounds| {
            q.priority_anchors
                .iter()
                .fold(f64::INFINITY, |min, &p| min.min(distance_to_bounds(b, p)))
        };
        let mut queue = Vec::new();
        let mut values = Vec::new();
        let mut add = |raw: Vec<i64>| -> Result<(), SpatialError> {
            let mut path = raw.as_slice();
            let entry = path
                .last()
                .filter(|&&last| last < 0)
                .map(|&last| (-last - 1) as usize);
            if entry.is_some() {
                path = &path[..path.len() - 1];
            }
            let mut node = self.root.as_ref().ok_or(SpatialError::InvalidQuery)?;
            for &part in path {
                match &node.members {
                    Members::Branch(children) if part == 0 || part == 1 => {
                        node = &children[part as usize]
                    }
                    _ => return Err(SpatialError::InvalidQuery),
                }
            }
            let bounds = if let Some(entry) = entry {
                match &node.members {
                    Members::Leaf(items) => {
                        &items.get(entry).ok_or(SpatialError::InvalidQuery)?.bounds
                    }
                    _ => return Err(SpatialError::InvalidQuery),
                }
            } else {
                &node.bounds
            };
            push(
                &mut queue,
                Task {
                    path: raw,
                    entry,
                    node,
                    score: priority(bounds),
                },
            );
            Ok(())
        };
        if let Some(cursor) = &q.cursor {
            if cursor.offset != 0 || cursor.leaf.is_some() {
                return Err(SpatialError::InvalidQuery);
            }
            for path in &cursor.pending {
                add(path.clone())?;
            }
        } else if self.root.is_some() {
            add(vec![])?;
        }
        let mut visited = 0;
        let mut truncated = q.cursor.as_ref().and_then(|c| c.truncated).unwrap_or(false);
        while !queue.is_empty() && visited < q.allowance {
            let task = pop(&mut queue);
            visited += 1;
            match (&task.node.members, task.entry) {
                (Members::Leaf(entries), Some(i)) => {
                    let x = &entries[i];
                    if intersects(&x.bounds) {
                        values.push(self.values[x.id].clone());
                    }
                }
                (members, None) if intersects(&task.node.bounds) => match members {
                    Members::Branch(nodes) => {
                        for (part, node) in nodes.iter().enumerate() {
                            let mut path = task.path.clone();
                            path.push(part as i64);
                            push(
                                &mut queue,
                                Task {
                                    path,
                                    node,
                                    entry: None,
                                    score: priority(&node.bounds),
                                },
                            );
                        }
                    }
                    Members::Leaf(entries) => {
                        for (part, entry) in entries.iter().enumerate() {
                            let mut path = task.path.clone();
                            path.push(-(part as i64) - 1);
                            push(
                                &mut queue,
                                Task {
                                    path,
                                    node: task.node,
                                    entry: Some(part),
                                    score: priority(&entry.bounds),
                                },
                            );
                        }
                    }
                },
                _ => {}
            }
        }
        if queue.len() > 64 {
            queue.sort_by(compare);
            queue.truncate(64);
            truncated = true;
        }
        let cursor = (!queue.is_empty()).then(|| BoundsQueryCursor {
            pending: queue.into_iter().map(|t| t.path).collect(),
            offset: 0,
            leaf: None,
            truncated: truncated.then_some(true),
        });
        let status = if cursor.is_some() || truncated {
            PhysicalQueryStatus::Partial
        } else {
            PhysicalQueryStatus::Complete
        };
        Ok(PhysicalFeatureAnswer {
            values,
            visited,
            status,
            cursor,
        })
    }
}

struct Task<'a> {
    path: Vec<i64>,
    node: &'a Node,
    entry: Option<usize>,
    score: f64,
}
fn compare(a: &Task<'_>, b: &Task<'_>) -> std::cmp::Ordering {
    (a.score - b.score)
        .partial_cmp(&0.0)
        .filter(|d| !d.is_eq())
        .unwrap_or_else(|| a.path.cmp(&b.path))
}
fn push<'a>(queue: &mut Vec<Task<'a>>, task: Task<'a>) {
    let mut i = queue.len();
    queue.push(task);
    while i > 0 {
        let parent = (i - 1) / 2;
        if !compare(&queue[i], &queue[parent]).is_lt() {
            break;
        }
        queue.swap(i, parent);
        i = parent;
    }
}
fn pop<'a>(queue: &mut Vec<Task<'a>>) -> Task<'a> {
    let task = queue.swap_remove(0);
    let mut i = 0;
    while 2 * i + 1 < queue.len() {
        let mut child = 2 * i + 1;
        if child + 1 < queue.len() && compare(&queue[child + 1], &queue[child]).is_lt() {
            child += 1;
        }
        if !compare(&queue[child], &queue[i]).is_lt() {
            break;
        }
        queue.swap(i, child);
        i = child;
    }
    task
}
fn node_bytes(node: &Node) -> usize {
    match &node.members {
        Members::Leaf(entries) => entries.capacity() * size_of::<Entry>(),
        Members::Branch(children) => {
            2 * size_of::<Node>() + node_bytes(&children[0]) + node_bytes(&children[1])
        }
    }
}
fn distance_to_bounds(b: &Bounds, p: Point) -> f64 {
    let [lo, hi, p] = [b.min, b.max, p].map(coordinates);
    length(point(std::array::from_fn(|i| {
        (lo[i] - p[i]).max(p[i] - hi[i]).max(0.0)
    })))
}

fn support_feature(
    s: &StandardSupport,
    min_x: f64,
    max_x: f64,
    min_z: f64,
    max_z: f64,
    values: &mut Vec<PhysicalFeature>,
) -> Result<(), SpatialError> {
    if min_x >= max_x || min_z >= max_z {
        return Ok(());
    }
    let vertices = [
        (min_x, min_z),
        (max_x, min_z),
        (max_x, max_z),
        (min_x, max_z),
    ]
    .map(|(x, z)| Point {
        x,
        y: s.y_at(x, z),
        z,
    });
    let length = length(Point {
        x: s.slope_x,
        y: 1.0,
        z: s.slope_z,
    });
    let normal = Point {
        x: if s.slope_x == 0.0 {
            0.0
        } else {
            -s.slope_x / length
        },
        y: 1.0 / length,
        z: if s.slope_z == 0.0 {
            0.0
        } else {
            -s.slope_z / length
        },
    };
    let id = json_record(&("support", &s.id, min_x, max_x, min_z, max_z))
        .map_err(|_| SpatialError::InvalidMap)?;
    values.push(PhysicalFeature {
        id,
        source_id: s.id.clone(),
        kind: PhysicalFeatureKind::Support,
        vertices,
        normal,
        bounds: extent(vertices),
    });
    Ok(())
}
fn terrain_features(
    map: &GeometryMap,
    s: &StandardSupport,
    values: &mut Vec<PhysicalFeature>,
) -> Result<(), SpatialError> {
    // Preserve the exact row/run flush order: feature IDs and bounded tree
    // cursors belong to the same selected support evidence across hosts.
    let size_x = (map.width - 1) as f64;
    let size_z = (map.height - 1) as f64;
    let start_x = (s.min_x + 0.5).floor().max(0.0) as usize;
    let max_x = (s.max_x + 0.5).floor().min(size_x) as usize;
    let min_z = (s.min_z + 0.5).floor().max(0.0) as usize;
    let max_z = (s.max_z + 0.5).floor().min(size_z) as usize;
    let mut active: IndexMap<(&str, u64, u64), [f64; 4]> = IndexMap::new();
    for z in min_z..=max_z {
        let mut row = IndexMap::new();
        let mut x = start_x;
        while x <= max_x {
            let tile = map.tiles[z][x].as_str();
            if !map.terrain[tile].walkable {
                x += 1;
                continue;
            }
            let start = x;
            x += 1;
            while x <= max_x && map.tiles[z][x] == tile {
                x += 1;
            }
            let min_x = s.min_x.max((start as f64) - 0.5).max(0.0);
            let max_x = s.max_x.min((x as f64) - 0.5).min(size_x);
            let key = (tile, min_x.to_bits(), max_x.to_bits());
            let old = active.shift_remove(&key);
            let min_z = old.map_or_else(|| s.min_z.max(z as f64 - 0.5).max(0.0), |old| old[2]);
            let max_z = s.max_z.min(z as f64 + 0.5).min(size_z);
            row.insert(key, [min_x, max_x, min_z, max_z]);
        }
        for [a, b, c, d] in active.into_values() {
            support_feature(s, a, b, c, d, values)?;
        }
        active = row;
    }
    for [a, b, c, d] in active.into_values() {
        support_feature(s, a, b, c, d, values)?;
    }
    Ok(())
}
