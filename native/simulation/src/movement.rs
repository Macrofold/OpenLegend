//! Native supported-path execution and its derived occupied-body candidates.
//! Rapier remains the physical intersection owner; these records select ordered
//! bodies and preserve the existing movement/stop-search continuation.

use crate::host::{ByteBudget, ByteReservation, CapacityError};
use crate::state::{BodyProfile, Bounds, Entity, EntityHandle, EntityStore, Point, SurfacePoint};
use crate::status::StatusEffectPolicy;
use std::collections::{BTreeMap, BTreeSet};
use std::mem::size_of;
mod advance;
mod residency;
pub(crate) use advance::{MoveAdvanceAnswer, MoveAdvanceCursor, MoveAdvanceStep};
mod execution;
pub(crate) mod evasion;
pub(crate) mod follow;
pub(crate) use execution::{MotionOperation, MotionStep};
pub(crate) use execution::error as execution_error;
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
    local_poses: BTreeMap<String, bool>,
    strings: usize,
    storage: crate::host::ResidentReservation,
    budget: crate::host::ByteBudget,
}
fn cell(point: Point) -> (i64, i64, i64) {
    (
        (point.x / BODY_CELL_SIZE).floor() as i64,
        (point.y / BODY_CELL_SIZE).floor() as i64,
        (point.z / BODY_CELL_SIZE).floor() as i64,
    )
}

struct CellBounds {
    low: (i64, i64, i64),
    high: (i64, i64, i64),
}
impl CellBounds {
    fn around(origin: Point, radius: f64) -> Self {
        Self {
            low: cell(Point {
                x: origin.x - radius,
                y: origin.y - radius,
                z: origin.z - radius,
            }),
            high: cell(Point {
                x: origin.x + radius,
                y: origin.y + radius,
                z: origin.z + radius,
            }),
        }
    }
    fn contains(&self, key: (i64, i64, i64)) -> bool {
        let Self { low, high } = self;
        key.0 >= low.0
            && key.0 <= high.0
            && key.1 >= low.1
            && key.1 <= high.1
            && key.2 >= low.2
            && key.2 <= high.2
    }
    fn volume(&self) -> f64 {
        let Self { low, high } = self;
        (high.0 as f64 - low.0 as f64 + 1.0)
            * (high.1 as f64 - low.1 as f64 + 1.0)
            * (high.2 as f64 - low.2 as f64 + 1.0)
    }
}

impl BodyIndex {
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
        visit: impl FnMut(&'a str, &'a BodyPoint),
    ) {
        Self::visit_cells(&self.cells, &self.points, origin, radius, visit);
    }
    fn visit_cells<'a>(
        cells: &'a BTreeMap<(i64, i64, i64), BTreeSet<String>>,
        points: &'a BTreeMap<String, BodyPoint>,
        origin: Point,
        radius: f64,
        mut visit: impl FnMut(&'a str, &'a BodyPoint),
    ) {
        let bounds = CellBounds::around(origin, radius);
        let mut include = |ids: &BTreeSet<String>| {
            for id in ids {
                if let Some((key, point)) = points.get_key_value(id) {
                    visit(key.as_str(), point);
                }
            }
        };
        if bounds.volume() > cells.len() as f64 {
            for (key, ids) in cells {
                if bounds.contains(*key) {
                    include(ids);
                }
            }
        } else {
            let CellBounds { low, high } = bounds;
            for x in low.0..=high.0 {
                for y in low.1..=high.1 {
                    for z in low.2..=high.2 {
                        if let Some(ids) = cells.get(&(x, y, z)) {
                            include(ids);
                        }
                    }
                }
            }
        }
    }
    pub(crate) fn local_pose_ids(&self) -> impl Iterator<Item = (&str, bool)> {
        self.local_poses.iter().map(|(id, dirty)| (id.as_str(), *dirty))
    }
    pub(crate) fn has_local_poses(&self) -> bool {
        !self.local_poses.is_empty()
    }
    pub(crate) fn clean_local_pose(&mut self, id: &str) {
        if let Some(dirty) = self.local_poses.get_mut(id) {
            *dirty = false;
        }
    }
    /// A displaced blocker can enable expansion from its old neighborhood as
    /// well as change clearance in its new one. Keep the standing envelope
    /// for indexing so a contracted body never shrinks this wakeup bound.
    fn wake_local_poses(&mut self, center: Point, extent: f64, excluded: Option<&str>) {
        let radius = extent + self.maximum_extent();
        let poses = &mut self.local_poses;
        Self::visit_cells(&self.cells, &self.points, center, radius, |id, _| {
            if Some(id) != excluded && let Some(dirty) = poses.get_mut(id) {
                *dirty = true;
            }
        });
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
    /// Test the resident broad phase without sorting or cloning a candidate
    /// list. The caller checks the exact physical overlap of each candidate.
    pub(crate) fn any_body(
        &self,
        origin: Point,
        radius: f64,
        mut test: impl FnMut(EntityHandle) -> bool,
    ) -> bool {
        let mut found = false;
        self.visit_candidates(origin, radius, |_, entry| {
            if !found {
                found = test(entry.handle);
            }
        });
        found
    }
    /// Look up a unique set of requested IDs twice: first to fund the exact
    /// admitted subset, then to order that subset without walking other bodies
    /// in the envelope. The caller holds the returned charge while it uses the
    /// borrowed IDs to prepare the actual detector request.
    pub(crate) fn requested_candidates<'a, 'ids>(
        &'a self,
        origin: Point,
        radius: f64,
        ids: impl Iterator<Item = &'ids str> + Clone,
        budget: &ByteBudget,
    ) -> Result<(ByteReservation, Vec<&'a str>), CapacityError> {
        let bounds = CellBounds::around(origin, radius);
        let selected = ids.filter_map(|id| {
            let (id, point) = self.points.get_key_value(id)?;
            // Refresh stores the point and its cell entry together, including
            // on rollback. This is the broad query's cell test, not a new range rule.
            bounds
                .contains(cell(point.position))
                .then_some((id.as_str(), point.order.as_str()))
        });
        let count = selected.clone().count();
        let reservation = budget.reserve(
            count
                .checked_mul(size_of::<(&str, &str)>() + size_of::<&str>())
                .ok_or(CapacityError)?,
        )?;
        let mut ordered = Vec::new();
        ordered
            .try_reserve_exact(count)
            .map_err(|_| CapacityError)?;
        ordered.extend(selected);
        // The entity store rejects duplicate ordering labels on installation.
        // Ordered insertion and relabeling preserve their uniqueness.
        ordered.sort_unstable_by_key(|&(_, order)| order);
        let mut targets = Vec::new();
        targets
            .try_reserve_exact(count)
            .map_err(|_| CapacityError)?;
        targets.extend(ordered.into_iter().map(|(id, _)| id));
        Ok((reservation, targets))
    }
    pub(crate) fn candidates_metered(
        &self,
        origin: Point,
        radius: f64,
        meters: &mut crate::work::WorkMeters,
    ) -> Result<Vec<(&str, EntityHandle)>, crate::work::WorkError> {
        use crate::work::WorkUnit;
        let bounds = CellBounds::around(origin, radius);
        if bounds.volume() > self.cells.len() as f64 {
            for (key, ids) in &self.cells {
                meters.charge(&[(WorkUnit::Tests, 1)])?;
                if bounds.contains(*key) {
                    meters.charge(&[(WorkUnit::Candidates, ids.len() as u64)])?;
                }
            }
        } else {
            let CellBounds { low, high } = bounds;
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

/// The occupied box uses the current shape, including an admitted local pose.
pub(crate) fn body_space(
    entity: &Entity,
    policy: &StatusEffectPolicy,
) -> Result<Bounds, MovementError> {
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
    pub(crate) fn into_shape(self) -> (BodyProfile, Vec<Bounds>, ByteReservation) {
        (self.body, self.bounds, self._reservation)
    }
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
        let _profile = actor.spatial.soft_footprint.is_some()
            .then(|| budget.reserve(actor.ordinary_body_profile().id.len()))
            .transpose()
            .map_err(|_| MovementError::Capacity)?;
        let body = actor.travel_body_profile();
        Self::prepare_profile(index, entities, policy, actor, &body, from, furthest, budget, meters)
    }

    /// Body candidates use their actual shapes. The proposed moving or
    /// stationary envelope belongs to the caller's admitted transition.
    pub(crate) fn prepare_profile(
        index: &BodyIndex,
        entities: &EntityStore,
        policy: &StatusEffectPolicy,
        actor: &Entity,
        profile: &BodyProfile,
        from: Point,
        furthest: Point,
        budget: &crate::host::ByteBudget,
        meters: &mut crate::work::WorkMeters,
    ) -> Result<Self, MovementError> {
        let mut reservation = budget
            .reserve(std::mem::size_of::<Self>() + profile.id.len())
            .map_err(|_| MovementError::Capacity)?;
        let body = profile.clone();
        let radius =
            distance(from, furthest) + body.radius.max(body.height) + index.maximum_extent();
        let (count, _) = index.candidate_capacity(from, radius);
        let mut scratch = 0usize;
        index.visit_candidates(from, radius, |_, point| {
            if let Some(entity) = entities
                .resolve(point.handle)
                .filter(|entity| entity.spatial.soft_footprint.is_some() || entity.spatial.local_pose.is_some())
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
    territory: Option<(Point, f64)>,
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
    pub pose: Vec<Point>,
}
struct MotionPreview {
    forecast: bool,
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
        if entity.spatial.flight.is_some() {
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
            body: entity.travel_body_profile().into_owned(),
            remaining: entity
                .threat
                .as_ref()
                .and_then(|threat| threat.remaining_pursuit_distance())
                .map_or(distance_budget, |limit| limit.min(distance_budget)),
            occupied,
            territory: entity
                .threat
                .as_ref()
                .filter(|threat| threat.progress.mode.chases())
                .map(|threat| (threat.policy.home.point(), threat.policy.territory_radius)),
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
        let bytes = count
            .checked_mul(std::mem::size_of::<Point>() + std::mem::size_of::<f64>())
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
        pose.push(point.point());
        cursor.preview = Some(MotionPreview {
            forecast: true,
            seconds,
            distance_budget,
            track: MotionTrack { at, pose },
            reservation,
        });
        Ok(cursor)
    }
    /// Track the genuinely committed ground path for a currently aimed
    /// subject. The existing path writer still owns every position change.
    pub(crate) fn record_execution(
        &mut self,
        seconds: f64,
        distance_budget: f64,
        budget: &crate::host::ByteBudget,
    ) -> Result<(), MovementError> {
        if !seconds.is_finite() || seconds <= 0.0 || !distance_budget.is_finite()
            || distance_budget < 0.0 || self.preview.is_some() || self.steps != 0
        {
            return Err(MovementError::InvalidPath);
        }
        let count = self.path.len().checked_add(2).ok_or(MovementError::Capacity)?;
        let bytes = count
            .checked_mul(std::mem::size_of::<Point>() + std::mem::size_of::<f64>())
            .and_then(|bytes| bytes.checked_add(std::mem::size_of::<MotionPreview>()))
            .ok_or(MovementError::Capacity)?;
        let reservation = budget.reserve(bytes).map_err(|_| MovementError::Capacity)?;
        let mut at = Vec::with_capacity(count);
        let mut pose = Vec::with_capacity(count);
        at.push(0.0);
        pose.push(self.position.point());
        self.preview = Some(MotionPreview {
            forecast: false, seconds, distance_budget,
            track: MotionTrack { at, pose }, reservation,
        });
        Ok(())
    }

    pub(crate) fn is_forecast(&self) -> bool {
        self.preview.as_ref().is_some_and(|track| track.forecast)
    }

    pub(crate) fn take_motion_track(&mut self) -> Result<Option<MotionForecast>, MovementError> {
        let Some(mut preview) = self.preview.take() else {
            return Ok(None);
        };
        let complete = self.result().ok_or(MovementError::InvalidAnswer)?;
        if preview
            .track
            .at
            .last()
            .is_some_and(|at| *at < preview.seconds)
            || preview.track.at.len() == 1
        {
            preview.track.at.push(preview.seconds);
            let last = *preview.track.pose.last().ok_or(MovementError::InvalidAnswer)?;
            preview.track.pose.push(last);
        }
        Ok(Some(MotionForecast {
            track: preview.track,
            complete,
            reservation: preview.reservation,
        }))
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
                    if self.territory.is_some_and(|(home, radius)| {
                        (home.x - self.pending_to.x).hypot(home.z - self.pending_to.z) > radius
                    }) {
                        if self.answer_clear(false).is_err() {
                            self.phase = Phase::Done(false);
                        }
                        continue;
                    }
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
                if at > *preview.track.at.last().expect("initial motion sample") {
                    preview.track.at.push(at);
                    preview.track.pose.push(self.position.point());
                } else {
                    *preview
                        .track
                        .pose
                        .last_mut()
                        .expect("initial motion pose") = self.position.point();
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
