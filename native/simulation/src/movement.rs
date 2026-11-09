//! Native supported-path execution and its derived occupied-body candidates.
//! Rapier remains the physical intersection owner; these records select ordered
//! bodies and preserve the existing movement/stop-search continuation.

use crate::state::{BodyProfile, Bounds, Entity, EntityHandle, EntityStore, Point, SurfacePoint};
use crate::status::StatusEffectPolicy;
use std::collections::{BTreeMap, BTreeSet};
mod advance;
pub(crate) use advance::{MoveAdvanceAnswer, MoveAdvanceCursor, MoveAdvanceStep};
mod execution;
pub(crate) use execution::{MotionOperation, MotionStep};
mod clearance;
pub(crate) use clearance::{CompletedPathClearance, PathClearanceCursor, PathClearanceStep};

const BODY_CELL_SIZE: f64 = 8.0;

#[derive(Debug)]
pub(crate) enum MovementError {
    Work(crate::work::WorkError),
    Capacity,
    UnsupportedFamily,
    MissingEntity,
    MissingAction,
    InvalidAnswer,
    InvalidPath,
    Stale,
}

struct BodyPoint {
    handle: EntityHandle,
    position: Point,
    extent: f64,
    order: String,
}

/// Disposable foot bins derived from canonical membership/placement/body. The
/// physical writer refreshes only changed IDs, including after private rollback.
pub(crate) struct BodyIndex {
    // Physical root membership also includes inactive participants. It is a
    // separate count from collidable/observable bodies for host work admission.
    roots: BTreeSet<String>,
    points: BTreeMap<String, BodyPoint>,
    cells: BTreeMap<(i64, i64, i64), BTreeSet<String>>,
    extents: BTreeMap<u64, usize>,
}
fn cell(point: Point) -> (i64, i64, i64) {
    (
        (point.x / BODY_CELL_SIZE).floor() as i64,
        (point.y / BODY_CELL_SIZE).floor() as i64,
        (point.z / BODY_CELL_SIZE).floor() as i64,
    )
}
impl BodyIndex {
    pub(crate) fn refresh_ordering(&mut self, entities: &EntityStore) {
        for (id, point) in &mut self.points {
            if let Some(order) = entities.ordering(id) {
                point.order.clear();
                point.order.push_str(order);
            }
        }
    }
    pub(crate) fn install(entities: &EntityStore) -> Self {
        let mut value = Self {
            roots: BTreeSet::new(),
            points: BTreeMap::new(),
            cells: BTreeMap::new(),
            extents: BTreeMap::new(),
        };
        for id in entities.ordered_ids() {
            value.refresh(entities, id);
        }
        value
    }
    pub(crate) fn refresh(&mut self, entities: &EntityStore, id: &str) {
        if entities.get(id).is_some_and(Entity::physical_root) {
            if !self.roots.contains(id) {
                self.roots.insert(id.to_owned());
            }
        } else {
            self.roots.remove(id);
        }
        if let (Some(old), Some(entity)) = (self.points.get(id), entities.get(id)) {
            let body = entity.body_profile();
            let extent = (body.height + body.radius).max(2.0 * body.radius);
            if entity.actor.is_some()
                && entity.actively_participates()
                && entity.world_position() == Some(old.position)
                && extent == old.extent
                && entities.handle(id) == Some(old.handle)
                && entities.ordering(id) == Some(old.order.as_str())
            {
                return;
            }
        }
        if let Some(old) = self.points.remove(id) {
            let key = cell(old.position);
            if let Some(ids) = self.cells.get_mut(&key) {
                ids.remove(id);
                if ids.is_empty() {
                    self.cells.remove(&key);
                }
            }
            if let Some(count) = self.extents.get_mut(&old.extent.to_bits()) {
                *count -= 1;
                if *count == 0 {
                    self.extents.remove(&old.extent.to_bits());
                }
            }
        }
        let Some(entity) = entities.get(id) else {
            return;
        };
        if entity.actor.is_none() || !entity.actively_participates() {
            return;
        }
        let Some(position) = entity.world_position() else {
            return;
        };
        let body = entity.body_profile();
        let extent = (body.height + body.radius).max(2.0 * body.radius);
        let Some(handle) = entities.handle(id) else {
            return;
        };
        let Some(order) = entities.ordering(id) else {
            return;
        };
        self.cells
            .entry(cell(position))
            .or_default()
            .insert(id.to_owned());
        *self.extents.entry(extent.to_bits()).or_default() += 1;
        self.points.insert(
            id.to_owned(),
            BodyPoint {
                handle,
                position,
                extent,
                order: order.to_owned(),
            },
        );
    }
    pub(crate) fn root_count(&self) -> u64 {
        self.roots.len() as u64
    }
    pub(crate) fn maximum_extent(&self) -> f64 {
        self.extents
            .last_key_value()
            .map_or(0.0, |(bits, _)| f64::from_bits(*bits))
    }
    fn visit_candidates<'a>(
        &'a self,
        origin: Point,
        radius: f64,
        mut visit: impl FnMut(&'a str, &'a BodyPoint),
    ) {
        let low = cell(Point {
            x: origin.x - radius,
            y: origin.y - radius,
            z: origin.z - radius,
        });
        let high = cell(Point {
            x: origin.x + radius,
            y: origin.y + radius,
            z: origin.z + radius,
        });
        let volume = (high.0 as f64 - low.0 as f64 + 1.0)
            * (high.1 as f64 - low.1 as f64 + 1.0)
            * (high.2 as f64 - low.2 as f64 + 1.0);
        let mut include = |ids: &BTreeSet<String>| {
            for id in ids {
                if let Some((key, point)) = self.points.get_key_value(id) {
                    visit(key.as_str(), point);
                }
            }
        };
        if volume > self.cells.len() as f64 {
            for (key, ids) in &self.cells {
                if key.0 >= low.0
                    && key.0 <= high.0
                    && key.1 >= low.1
                    && key.1 <= high.1
                    && key.2 >= low.2
                    && key.2 <= high.2
                {
                    include(ids);
                }
            }
        } else {
            for x in low.0..=high.0 {
                for y in low.1..=high.1 {
                    for z in low.2..=high.2 {
                        if let Some(ids) = self.cells.get(&(x, y, z)) {
                            include(ids);
                        }
                    }
                }
            }
        }
    }
    /// Exact selected envelope size and bytes needed to copy its IDs, without
    /// allocating a candidate vector or visiting unrelated bodies.
    pub(crate) fn candidate_capacity(&self, origin: Point, radius: f64) -> (usize, usize) {
        let mut count = 0;
        let mut bytes = 0;
        self.visit_candidates(origin, radius, |id, _| {
            count += 1;
            bytes += id.len();
        });
        (count, bytes)
    }
    pub(crate) fn candidates(&self, origin: Point, radius: f64) -> Vec<(&str, EntityHandle)> {
        let mut found = Vec::new();
        self.visit_candidates(origin, radius, |id, point| found.push((id, point)));
        found.sort_by(|(_, a), (_, b)| a.order.cmp(&b.order));
        found
            .into_iter()
            .map(|(id, point)| (id, point.handle))
            .collect()
    }
    pub(crate) fn candidates_metered(
        &self,
        origin: Point,
        radius: f64,
        meters: &mut crate::work::WorkMeters,
    ) -> Result<Vec<(&str, EntityHandle)>, crate::work::WorkError> {
        use crate::work::WorkUnit;
        let low = cell(Point {
            x: origin.x - radius,
            y: origin.y - radius,
            z: origin.z - radius,
        });
        let high = cell(Point {
            x: origin.x + radius,
            y: origin.y + radius,
            z: origin.z + radius,
        });
        let volume = (high.0 as f64 - low.0 as f64 + 1.0)
            * (high.1 as f64 - low.1 as f64 + 1.0)
            * (high.2 as f64 - low.2 as f64 + 1.0);
        if volume > self.cells.len() as f64 {
            for (key, ids) in &self.cells {
                meters.charge(&[(WorkUnit::Tests, 1)])?;
                if key.0 >= low.0
                    && key.0 <= high.0
                    && key.1 >= low.1
                    && key.1 <= high.1
                    && key.2 >= low.2
                    && key.2 <= high.2
                {
                    meters.charge(&[(WorkUnit::Candidates, ids.len() as u64)])?;
                }
            }
        } else {
            for x in low.0..=high.0 {
                for y in low.1..=high.1 {
                    for z in low.2..=high.2 {
                        let count = self.cells.get(&(x, y, z)).map_or(0, BTreeSet::len);
                        meters.charge(&[
                            (WorkUnit::Tests, 1),
                            (WorkUnit::Candidates, count as u64),
                        ])?;
                    }
                }
            }
        }
        Ok(self.candidates(origin, radius))
    }
}

/// Exact source bodySpace AABB. A local contracted pose requires its installed
/// ranged policy and is refused until that owner joins the selected closure.
pub(crate) fn body_space(
    entity: &Entity,
    policy: &StatusEffectPolicy,
) -> Result<Bounds, MovementError> {
    if entity.spatial.local_pose.is_some() {
        return Err(MovementError::UnsupportedFamily);
    }
    let point = entity
        .world_position()
        .ok_or(MovementError::MissingEntity)?;
    let profile = entity.body_profile();
    let states = entity.status_effects.as_ref();
    if states.is_some_and(|s| s.values().any(|state| state.contribution.is_some())) {
        return Err(MovementError::UnsupportedFamily);
    }
    let horizontal = policy.definitions.iter().any(|definition| {
        definition
            .presentation
            .as_ref()
            .is_some_and(|p| p.pose.as_deref() == Some("horizontal"))
            && states
                .and_then(|s| s.get(&definition.id))
                .is_some_and(|s| s.active)
    });
    let width = profile.radius * 2.0;
    let length = if horizontal {
        profile.height
    } else {
        profile.radius * 2.0
    };
    let x = if horizontal {
        (entity.spatial.heading.cos().abs() * width + entity.spatial.heading.sin().abs() * length)
            / 2.0
    } else {
        width / 2.0
    };
    let z = if horizontal {
        (entity.spatial.heading.sin().abs() * width + entity.spatial.heading.cos().abs() * length)
            / 2.0
    } else {
        width / 2.0
    };
    Ok(Bounds {
        min: Point {
            x: point.x - x,
            y: point.y,
            z: point.z - z,
        },
        max: Point {
            x: point.x + x,
            y: point.y
                + if horizontal {
                    profile.radius * 2.0
                } else {
                    profile.height
                },
            z: point.z + z,
        },
    })
}

pub(crate) struct OccupiedSweep {
    pub from: Point,
    pub furthest: Point,
    pub body: BodyProfile,
    pub bounds: Vec<Bounds>,
    _reservation: crate::host::ByteReservation,
}
impl OccupiedSweep {
    pub(crate) fn prepare(
        index: &BodyIndex,
        entities: &EntityStore,
        policy: &StatusEffectPolicy,
        actor: &Entity,
        from: Point,
        furthest: Point,
        budget: &crate::host::ByteBudget,
        meters: &mut crate::work::WorkMeters,
    ) -> Result<Self, MovementError> {
        let mut reservation = budget
            .reserve(std::mem::size_of::<Self>() + actor.ordinary_body_profile().id.len())
            .map_err(|_| MovementError::Capacity)?;
        let body = actor.body_profile().into_owned();
        let radius =
            distance(from, furthest) + body.radius.max(body.height) + index.maximum_extent();
        let (count, _) = index.candidate_capacity(from, radius);
        let mut scratch = 0usize;
        index.visit_candidates(from, radius, |_, point| {
            if let Some(entity) = entities
                .resolve(point.handle)
                .filter(|entity| entity.spatial.soft_footprint.is_some())
            {
                scratch = scratch.max(entity.ordinary_body_profile().id.len());
            }
        });
        let buffers = count
            .max(4)
            .checked_mul(
                2 * (std::mem::size_of::<(&str, &BodyPoint)>()
                    + std::mem::size_of::<(&str, EntityHandle)>()),
            )
            .and_then(|n| n.checked_add(count.checked_mul(std::mem::size_of::<Bounds>())?))
            .and_then(|n| n.checked_add(scratch))
            .ok_or(MovementError::Capacity)?;
        reservation
            .resize(
                reservation
                    .bytes()
                    .checked_add(buffers)
                    .ok_or(MovementError::Capacity)?,
            )
            .map_err(|_| MovementError::Capacity)?;
        let mut bounds = Vec::with_capacity(count);
        for (id, handle) in index
            .candidates_metered(from, radius, meters)
            .map_err(MovementError::Work)?
        {
            if id == actor.id {
                continue;
            }
            let other = entities.resolve(handle).ok_or(MovementError::Stale)?;
            if other.actor.is_some() && other.actively_participates() {
                bounds.push(body_space(other, policy)?);
            }
        }
        reservation
            .resize(
                std::mem::size_of::<Self>()
                    + body.id.capacity()
                    + bounds.capacity() * std::mem::size_of::<Bounds>(),
            )
            .map_err(|_| MovementError::Capacity)?;
        Ok(Self {
            from,
            furthest,
            body,
            bounds,
            _reservation: reservation,
        })
    }
}

use crate::spatial::{distance, interpolate};

#[derive(Clone, Copy, Debug)]
pub(crate) enum MotionQuestion {
    Walk,
    OccupiedClear,
    OccupiedFirstContact,
}
#[derive(Clone, Copy, Debug)]
enum Probe {
    Full,
    BracketLow { candidate: i64, attempt: u8 },
    BracketHigh { candidate: i64, attempt: u8 },
    Binary { remaining: u8, fraction: f64 },
}
#[derive(Clone, Copy, Debug)]
enum Phase {
    Next,
    Walk(Probe),
    Bodies(Probe),
    Contact,
    Done(bool),
}

/// A private path operation may wait on the physical provider, but its consumed
/// prefix is applied only once through the canonical placement/action owners.
/// The cursor owns just this route, never a shadow actor or writable world.
pub(crate) struct MotionCursor {
    pub actor: EntityHandle,
    pub action_id: Option<String>,
    pub path: Vec<SurfacePoint>,
    pub position: SurfacePoint,
    pub heading: f64,
    pub steps: u64,
    pub consumed_points: usize,
    pub travelled: f64,
    body: BodyProfile,
    remaining: f64,
    occupied: bool,
    epsilon: f64,
    phase: Phase,
    start: SurfacePoint,
    next: SurfacePoint,
    full_waypoint: bool,
    delta: f64,
    low: f64,
    high: f64,
    pending_to: SurfacePoint,
    preview: Option<MotionPreview>,
}
#[derive(Debug, serde::Serialize)]
pub(crate) struct MotionTrack {
    pub at: Vec<f64>,
    pub pose: Vec<SurfacePoint>,
}
struct MotionPreview {
    seconds: f64,
    distance_budget: f64,
    track: MotionTrack,
    reservation: crate::host::ByteReservation,
}
pub(crate) struct MotionForecast {
    pub track: MotionTrack,
    pub complete: bool,
    pub reservation: crate::host::ByteReservation,
}

impl MotionCursor {
    pub(crate) fn start(
        actor: EntityHandle,
        entity: &Entity,
        path: Vec<SurfacePoint>,
        action_id: Option<&str>,
        distance_budget: f64,
        occupied: bool,
        epsilon: f64,
    ) -> Result<Self, MovementError> {
        // These active families alter pursuit/route limits in source followPath;
        // absence is established by the selected installation, never inferred.
        if entity.threat.is_some()
            || entity.animal.as_ref().is_some_and(|a| a.foraging.is_some())
            || entity.spatial.flight.is_some()
        {
            return Err(MovementError::UnsupportedFamily);
        }
        let position = entity
            .supported_position()
            .ok_or(MovementError::InvalidPath)?;
        if action_id.is_some_and(|id| {
            entity
                .actor
                .as_ref()
                .and_then(|actor| actor.action.as_ref())
                .map(|action| action.id.as_str())
                != Some(id)
        }) {
            return Err(MovementError::MissingAction);
        }
        Ok(Self {
            actor,
            action_id: action_id.map(str::to_owned),
            path,
            position: position.clone(),
            heading: entity.spatial.heading,
            steps: 0,
            consumed_points: 0,
            travelled: 0.0,
            body: entity.body_profile().into_owned(),
            remaining: distance_budget,
            occupied,
            epsilon,
            phase: Phase::Next,
            start: position.clone(),
            next: position.clone(),
            full_waypoint: false,
            delta: 0.0,
            low: 0.0,
            high: 1.0,
            pending_to: position,
            preview: None,
        })
    }
    /// Same path reader, with source event-time samples and no canonical write.
    /// Capacity remains attached to the forecast while another mover uses it.
    pub(crate) fn start_forecast(
        actor: EntityHandle,
        entity: &Entity,
        path: Vec<SurfacePoint>,
        distance_budget: f64,
        seconds: f64,
        occupied: bool,
        epsilon: f64,
        budget: &crate::host::ByteBudget,
    ) -> Result<Self, MovementError> {
        if !seconds.is_finite() || seconds < 0.0 {
            return Err(MovementError::InvalidPath);
        }
        let point = entity
            .supported_position()
            .ok_or(MovementError::InvalidPath)?;
        let count = path
            .len()
            .checked_add(2)
            .ok_or(MovementError::InvalidPath)?;
        let max_id = path
            .iter()
            .map(|p| p.surface_id.len())
            .chain(std::iter::once(point.surface_id.len()))
            .max()
            .unwrap_or(0);
        let bytes = count
            .checked_mul(std::mem::size_of::<SurfacePoint>() + std::mem::size_of::<f64>() + max_id)
            .and_then(|n| n.checked_add(path.capacity() * std::mem::size_of::<SurfacePoint>()))
            .and_then(|n| {
                n.checked_add(path.iter().map(|p| p.surface_id.capacity()).sum::<usize>())
            })
            .and_then(|n| {
                n.checked_add(
                    std::mem::size_of::<Self>()
                        + point.surface_id.len() * 5
                        + entity.spatial.body.id.len()
                        + entity
                            .actor
                            .as_ref()
                            .and_then(|a| a.action.as_ref())
                            .map_or(0, |a| a.id.len()),
                )
            })
            .ok_or(MovementError::InvalidPath)?;
        let reservation = budget.reserve(bytes).map_err(|_| MovementError::Capacity)?;
        let mut cursor = Self::start(
            actor,
            entity,
            path,
            None,
            distance_budget,
            occupied,
            epsilon,
        )?;
        let mut at = Vec::with_capacity(count);
        let mut pose = Vec::with_capacity(count);
        at.push(0.0);
        pose.push(point);
        cursor.preview = Some(MotionPreview {
            seconds,
            distance_budget,
            track: MotionTrack { at, pose },
            reservation,
        });
        Ok(cursor)
    }
    pub(crate) fn is_forecast(&self) -> bool {
        self.preview.is_some()
    }
    pub(crate) fn into_forecast(mut self) -> Result<MotionForecast, MovementError> {
        let complete = self.result().ok_or(MovementError::InvalidAnswer)?;
        let mut preview = self.preview.take().ok_or(MovementError::InvalidAnswer)?;
        if preview
            .track
            .at
            .last()
            .is_some_and(|at| *at < preview.seconds)
            || preview.track.at.len() == 1
        {
            preview.track.at.push(preview.seconds);
            preview.track.pose.push(
                preview
                    .track
                    .pose
                    .last()
                    .ok_or(MovementError::InvalidAnswer)?
                    .clone(),
            );
        }
        Ok(MotionForecast {
            track: preview.track,
            complete,
            reservation: preview.reservation,
        })
    }
    pub(crate) fn body(&self) -> &BodyProfile {
        &self.body
    }
    pub(crate) fn question(&mut self) -> Option<(MotionQuestion, SurfacePoint, SurfacePoint)> {
        loop {
            match self.phase {
                Phase::Next => {
                    let Some(point) = self.path.get(self.consumed_points) else {
                        self.phase = Phase::Done(true);
                        continue;
                    };
                    self.start = self.position.clone();
                    self.delta = distance(self.start.point(), point.point());
                    if self.delta > self.epsilon && self.remaining <= 0.0 {
                        self.phase = Phase::Done(true);
                        continue;
                    }
                    self.full_waypoint = self.delta <= self.epsilon || self.delta <= self.remaining;
                    self.next = if self.full_waypoint {
                        point.clone()
                    } else {
                        let p = interpolate(
                            self.start.point(),
                            point.point(),
                            self.remaining / self.delta,
                        );
                        SurfacePoint {
                            x: p.x,
                            y: p.y,
                            z: p.z,
                            surface_id: self.start.surface_id.clone(),
                        }
                    };
                    self.pending_to = self.next.clone();
                    self.phase = Phase::Walk(Probe::Full);
                }
                Phase::Walk(_) => {
                    return Some((
                        MotionQuestion::Walk,
                        self.start.clone(),
                        self.pending_to.clone(),
                    ));
                }
                Phase::Bodies(_) => {
                    return Some((
                        MotionQuestion::OccupiedClear,
                        self.start.clone(),
                        self.pending_to.clone(),
                    ));
                }
                Phase::Contact => {
                    return Some((
                        MotionQuestion::OccupiedFirstContact,
                        self.start.clone(),
                        self.next.clone(),
                    ));
                }
                Phase::Done(_) => return None,
            }
        }
    }
    pub(crate) fn answer_clear(&mut self, clear: bool) -> Result<(), MovementError> {
        match self.phase {
            Phase::Walk(probe) if clear && self.occupied && self.delta > self.epsilon => {
                self.phase = Phase::Bodies(probe);
                Ok(())
            }
            // Source's `canWalkSegment && bodies.clear` never prepares body
            // contact when the static query already rejected the full segment.
            Phase::Walk(Probe::Full) if !clear && self.occupied && self.delta > self.epsilon => {
                self.low = 0.0;
                self.high = 1.0;
                self.binary(16)
            }
            Phase::Walk(probe) | Phase::Bodies(probe) => self.probe_answer(probe, clear),
            _ => Err(MovementError::InvalidAnswer),
        }
    }
    pub(crate) fn answer_contact(&mut self, contact: Option<f64>) -> Result<(), MovementError> {
        if !matches!(self.phase, Phase::Contact)
            || contact.is_some_and(|f| !f.is_finite() || !(0.0..=1.0).contains(&f))
        {
            return Err(MovementError::InvalidAnswer);
        }
        if let Some(contact) = contact.filter(|_| self.start.surface_id == self.next.surface_id) {
            let candidate = (contact * 65536.0).floor().min(65535.0) as i64;
            self.bracket(candidate, 0)
        } else {
            self.binary(16)
        }
    }
    fn set_probe(&mut self, fraction: f64, probe: Probe) {
        let point = interpolate(self.start.point(), self.next.point(), fraction);
        self.pending_to = SurfacePoint {
            x: point.x,
            y: point.y,
            z: point.z,
            surface_id: self.start.surface_id.clone(),
        };
        self.phase = Phase::Walk(probe);
    }
    fn bracket(&mut self, candidate: i64, attempt: u8) -> Result<(), MovementError> {
        if candidate < 0 || attempt >= 2 {
            return self.binary(16);
        }
        if candidate == 0 {
            self.set_probe(1.0 / 65536.0, Probe::BracketHigh { candidate, attempt });
        } else {
            self.set_probe(
                candidate as f64 / 65536.0,
                Probe::BracketLow { candidate, attempt },
            );
        }
        Ok(())
    }
    fn binary(&mut self, remaining: u8) -> Result<(), MovementError> {
        if remaining == 0 {
            if self.low > 0.0 {
                let point = interpolate(self.start.point(), self.next.point(), self.low);
                let support = self.start.surface_id.clone();
                self.move_to(point, support);
            }
            self.phase = Phase::Done(false);
        } else {
            let fraction = (self.low + self.high) / 2.0;
            self.set_probe(
                fraction,
                Probe::Binary {
                    remaining,
                    fraction,
                },
            );
        }
        Ok(())
    }
    fn probe_answer(&mut self, probe: Probe, clear: bool) -> Result<(), MovementError> {
        match probe {
            Probe::Full if clear => {
                let point = self.next.point();
                let support = self.next.surface_id.clone();
                self.move_to(point, support);
                if self.full_waypoint {
                    self.consumed_points += 1;
                    if self.delta > self.epsilon {
                        self.remaining -= self.delta;
                    }
                } else {
                    self.remaining = 0.0;
                }
                self.phase = Phase::Next;
                Ok(())
            }
            Probe::Full if self.delta <= self.epsilon => {
                self.phase = Phase::Done(false);
                Ok(())
            }
            Probe::Full if self.occupied => {
                self.low = 0.0;
                self.high = 1.0;
                self.phase = Phase::Contact;
                Ok(())
            }
            Probe::Full => {
                self.phase = Phase::Done(false);
                Ok(())
            }
            Probe::BracketLow { candidate, attempt } if clear => {
                let upper = (candidate + 1) as f64 / 65536.0;
                if upper == 1.0 {
                    self.low = candidate as f64 / 65536.0;
                    self.binary(0)
                } else {
                    self.set_probe(upper, Probe::BracketHigh { candidate, attempt });
                    Ok(())
                }
            }
            Probe::BracketHigh { candidate, .. } if !clear => {
                self.low = candidate as f64 / 65536.0;
                self.binary(0)
            }
            Probe::BracketLow { candidate, attempt }
            | Probe::BracketHigh { candidate, attempt } => self.bracket(candidate - 1, attempt + 1),
            Probe::Binary {
                remaining,
                fraction,
            } => {
                if clear {
                    self.low = fraction
                } else {
                    self.high = fraction
                }
                self.binary(remaining - 1)
            }
        }
    }
    fn move_to(&mut self, point: Point, support: String) {
        let from = self.position.point();
        let dx = point.x - from.x;
        let dz = point.z - from.z;
        if dx.hypot(dz) > 1e-8 {
            self.heading = crate::spatial::atan2(dx, dz);
        }
        if point != from || support != self.position.surface_id {
            self.travelled += distance(from, point);
            self.steps += 1;
        }
        self.position = SurfacePoint {
            x: point.x,
            y: point.y,
            z: point.z,
            surface_id: support,
        };
        if let Some(preview) = &mut self.preview {
            if preview.distance_budget > 0.0 {
                let at = (self.travelled / preview.distance_budget * preview.seconds)
                    .min(preview.seconds);
                if at > *preview.track.at.last().expect("initial forecast sample") {
                    preview.track.at.push(at);
                    preview.track.pose.push(self.position.clone());
                } else {
                    *preview
                        .track
                        .pose
                        .last_mut()
                        .expect("initial forecast pose") = self.position.clone();
                }
            }
        }
    }
    pub(crate) fn result(&self) -> Option<bool> {
        if let Phase::Done(result) = self.phase {
            Some(result)
        } else {
            None
        }
    }
}
