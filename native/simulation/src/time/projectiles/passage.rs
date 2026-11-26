//! Sight of actually passing flight, selected by the installed animal profile.
//! Preview uses this same calculation only to shorten the next interval.
use crate::execution::ExecutionError;
use crate::geometry::{
    GeometryAnswers, GeometryBinding, GeometryQueries, SightRay, SightSweepQuery,
};
use crate::host::{ByteBudget, ByteReservation};
use crate::reception::{VisionParameters, horizontal_cone, moving_point_sight_cuts};
use crate::spatial::{
    BodyPiece, DistanceBand, Extent, distance, interpolate, moving_bodies_distance_interval,
};
use crate::state::{EntityHandle, Point};
use crate::work::{WorkMeters, WorkUnit};
use std::mem::size_of;

pub(super) struct PassageSegment {
    pub key: PassageKey,
    pub feet: [Point; 2],
    pub shot: [Point; 2],
    pub extent: Extent,
    pub separation: f64,
    pub observer_heading: f64,
    pub eye_height: f64,
    pub vision: VisionParameters,
    pub starts: f64,
    pub seconds: f64,
}

struct ClosePiece {
    key: PassageKey,
    feet: [Point; 2],
    heading: f64,
    vision: VisionParameters,
    starts: f64,
    seconds: f64,
}

pub(super) struct PassageSight {
    queries: GeometryQueries,
    pieces: Vec<ClosePiece>,
    _storage: ByteReservation,
}

pub(super) struct PassageRays {
    queries: GeometryQueries,
    samples: Vec<PassageHit>,
    _storage: ByteReservation,
}

#[derive(Clone, Copy)]
pub(super) struct PassageHit {
    pub key: PassageKey,
    pub at: f64,
    pub origin: Point,
}

pub(super) struct PassageHits {
    hits: Vec<PassageHit>,
    _storage: ByteReservation,
}

impl PassageHits {
    pub fn iter(&self) -> impl Iterator<Item = &PassageHit> {
        self.hits.iter()
    }
    pub fn for_flight(&self, flight: usize) -> &[PassageHit] {
        let from = self.hits.partition_point(|hit| hit.key.flight < flight);
        let count = self.hits[from..].partition_point(|hit| hit.key.flight == flight);
        &self.hits[from..from + count]
    }
}

impl PassageSight {
    pub fn new(binding: GeometryBinding, budget: &ByteBudget) -> Result<Self, ExecutionError> {
        Ok(Self {
            queries: GeometryQueries::new(binding),
            pieces: Vec::new(),
            _storage: budget.reserve(size_of::<Self>())?,
        })
    }

    pub fn add(
        &mut self,
        segment: PassageSegment,
        epsilon: f64,
        meters: &mut WorkMeters,
    ) -> Result<(), ExecutionError> {
        if segment.vision.radius <= 0.0 || segment.separation <= 0.0 || segment.seconds <= 0.0 {
            return Ok(());
        }
        meters.charge(&[(WorkUnit::Tests, 1)])?;
        let Some(near) = moving_bodies_distance_interval(
            BodyPiece {
                from: segment.shot[0],
                through: segment.shot[1],
                extent: Extent {
                    radius: 0.0,
                    height: 0.0,
                },
            },
            BodyPiece {
                from: segment.feet[0],
                through: segment.feet[1],
                extent: segment.extent,
            },
            DistanceBand {
                from: segment.separation,
                through: segment.separation,
            },
            epsilon,
        ) else {
            return Ok(());
        };
        if near.exit <= near.enter {
            return Ok(());
        }
        let feet =
            [near.enter, near.exit].map(|at| interpolate(segment.feet[0], segment.feet[1], at));
        let shot =
            [near.enter, near.exit].map(|at| interpolate(segment.shot[0], segment.shot[1], at));
        if self.pieces.len() == self.pieces.capacity()
            || self.queries.sight_sweeps.len() == self.queries.sight_sweeps.capacity()
        {
            let used = self.pieces.len();
            let slots = used.checked_mul(2).ok_or(ExecutionError::Capacity)?.max(4);
            let old = self._storage.bytes();
            let new = storage::<ClosePiece, SightSweepQuery, Self>(slots)?;
            // Growth keeps the old allocation funded until both reserves finish.
            self._storage
                .resize(old.checked_add(new).ok_or(ExecutionError::Capacity)?)?;
            self.pieces
                .try_reserve_exact(slots - used)
                .map_err(|_| ExecutionError::Capacity)?;
            self.queries
                .sight_sweeps
                .try_reserve_exact(slots - used)
                .map_err(|_| ExecutionError::Capacity)?;
            self._storage.resize(new)?;
        }
        let at_eye = |point: Point| Point {
            y: point.y + segment.eye_height,
            ..point
        };
        self.queries.sight_sweeps.push(SightSweepQuery {
            eye_from: at_eye(feet[0]),
            eye_to: at_eye(feet[1]),
            point_from: shot[0],
            point_to: shot[1],
        });
        self.pieces.push(ClosePiece {
            key: segment.key,
            feet,
            heading: segment.observer_heading,
            vision: segment.vision,
            starts: segment.starts + near.enter * segment.seconds,
            seconds: (near.exit - near.enter) * segment.seconds,
        });
        Ok(())
    }

    pub fn request(&self) -> Option<&GeometryQueries> {
        (!self.pieces.is_empty()).then_some(&self.queries)
    }

    pub fn rays(
        self,
        answer: GeometryAnswers,
        binding: GeometryBinding,
        time_epsilon: f64,
        budget: &ByteBudget,
        meters: &mut WorkMeters,
    ) -> Result<PassageRays, ExecutionError> {
        self.queries
            .validate_answers(&answer)
            .map_err(|_| ExecutionError::Invariant)?;
        let count = answer
            .sight_sweeps
            .iter()
            .try_fold(0usize, |count, sweep| {
                count.checked_add(sweep.fractions.len().checked_add(7)?)
            })
            .ok_or(ExecutionError::Capacity)?;
        let _storage = budget.reserve(storage::<SightRay, PassageHit, PassageRays>(count)?)?;
        let mut queries = GeometryQueries::new(binding);
        queries
            .sight
            .try_reserve_exact(count)
            .map_err(|_| ExecutionError::Capacity)?;
        let mut samples = Vec::new();
        samples
            .try_reserve_exact(count)
            .map_err(|_| ExecutionError::Capacity)?;
        for ((piece, query), sweep) in self
            .pieces
            .into_iter()
            .zip(self.queries.sight_sweeps)
            .zip(answer.sight_sweeps)
        {
            let mut cuts = sweep.fractions;
            let _cuts = budget.reserve(
                cuts.len()
                    .checked_add(7)
                    .and_then(|n| n.checked_mul(size_of::<f64>()))
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            cuts.try_reserve_exact(7)
                .map_err(|_| ExecutionError::Capacity)?;
            moving_point_sight_cuts(piece.feet, piece.heading, &query, piece.vision, &mut cuts);
            cuts.sort_unstable_by(f64::total_cmp);
            for pair in cuts.windows(2) {
                if pair[1] <= pair[0] {
                    continue;
                }
                let middle = (pair[0] + pair[1]) / 2.0;
                let feet = interpolate(piece.feet[0], piece.feet[1], middle);
                let target = interpolate(query.point_from, query.point_to, middle);
                if distance(feet, target) > piece.vision.radius
                    || !horizontal_cone(feet, piece.heading, piece.vision.field_of_view, target)
                {
                    continue;
                }
                let seen = pair[0] + (time_epsilon / piece.seconds).min(middle - pair[0]);
                samples.push(PassageHit {
                    key: piece.key,
                    at: piece.starts + seen * piece.seconds,
                    origin: interpolate(query.point_from, query.point_to, seen),
                });
                queries.sight.push(SightRay {
                    from: interpolate(query.eye_from, query.eye_to, middle),
                    to: target,
                });
            }
        }
        meters.charge(&[(WorkUnit::Tests, queries.sight.len() as u64)])?;
        Ok(PassageRays {
            queries,
            samples,
            _storage,
        })
    }
}

impl PassageRays {
    pub fn request(&self) -> Option<&GeometryQueries> {
        (!self.samples.is_empty()).then_some(&self.queries)
    }

    pub fn finish(mut self, answer: GeometryAnswers) -> Result<PassageHits, ExecutionError> {
        self.queries
            .validate_answers(&answer)
            .map_err(|_| ExecutionError::Invariant)?;
        // A predicted air leg and its possible blocked/stationary outcome
        // are adjacent samples of the same pair. Keep their earliest time.
        let mut retained = 0;
        for (index, seen) in answer.sight.into_iter().enumerate() {
            if !seen {
                continue;
            }
            let sample = self.samples[index];
            if retained > 0 && self.samples[retained - 1].key == sample.key {
                if sample.at < self.samples[retained - 1].at {
                    self.samples[retained - 1] = sample;
                }
            } else {
                self.samples[retained] = sample;
                retained += 1;
            }
        }
        self.samples.truncate(retained);
        drop(self.queries);
        self._storage
            .resize(storage::<PassageHit, (), PassageHits>(
                self.samples.capacity(),
            )?)?;
        Ok(PassageHits {
            hits: self.samples,
            _storage: self._storage,
        })
    }
}

fn storage<A, B, Owner>(count: usize) -> Result<usize, ExecutionError> {
    count
        .checked_mul(size_of::<A>() + size_of::<B>())
        .and_then(|n| n.checked_add(size_of::<Owner>()))
        .ok_or(ExecutionError::Capacity)
}

#[derive(Clone, Copy)]
pub(super) struct PassageObserver {
    pub life: u64,
    pub feet: Point,
    pub heading: f64,
    pub extent: Extent,
    pub separation: f64,
    pub eye_height: f64,
    pub vision: VisionParameters,
}

impl PassageObserver {
    pub fn prepare(
        installed: &crate::simulation::InstalledWorld,
        entity: &crate::state::Entity,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, ExecutionError> {
        let Some(animal) = entity.animal.as_ref() else {
            return Ok(None);
        };
        let Some(life) = entity.physical_life() else {
            return Ok(None);
        };
        if !entity.actively_participates()
            || !entity
                .actor
                .as_ref()
                .is_some_and(|actor| actor.alive && actor.controller == "native")
            || installed
                .capabilities
                .capability_blocked(Some(entity), "perception")?
        {
            return Ok(None);
        }
        let profile = crate::native_controller::selected_profile(installed, animal)?;
        let vision = crate::reception::vision_parameters(installed, entity);
        if profile.passage_distance <= 0.0 || vision.radius <= 0.0 {
            return Ok(None);
        }
        let body = crate::status::effective_body_profile(entity, budget)?;
        Ok(Some(Self {
            life,
            feet: entity
                .world_position()
                .ok_or(ExecutionError::InvalidPosition)?,
            heading: entity.spatial.heading,
            extent: Extent::from(&*body),
            separation: profile.passage_distance,
            eye_height: body.eye_height,
            vision,
        }))
    }
}

#[derive(Clone, Copy)]
pub(super) struct PassagePath {
    pub from: Point,
    pub to: Point,
    pub seconds: f64,
}

#[derive(Clone, Copy, Eq, PartialEq)]
pub(super) struct PassageKey {
    pub flight: usize,
    pub animal: EntityHandle,
    pub life: u64,
}

pub(super) enum PassageScan {
    Sweep(PassageSight),
    Rays(PassageRays),
    Complete(Option<PassageHits>),
}

impl PassageScan {
    pub fn request(&self) -> Option<&GeometryQueries> {
        match self {
            Self::Sweep(value) => value.request(),
            Self::Rays(value) => value.request(),
            Self::Complete(_) => None,
        }
    }

    pub fn step(
        &mut self,
        answer: Option<GeometryAnswers>,
        binding: GeometryBinding,
        epsilon: f64,
        budget: &ByteBudget,
        meters: &mut WorkMeters,
    ) -> Result<bool, ExecutionError> {
        if self.request().is_none() {
            if answer.is_some() {
                return Err(ExecutionError::UnfinishedOccurrence);
            }
            return Ok(false);
        }
        let Some(answer) = answer else {
            return Ok(true);
        };
        *self = match std::mem::replace(self, Self::Complete(None)) {
            Self::Sweep(value) => Self::Rays(value.rays(answer, binding, epsilon, budget, meters)?),
            Self::Rays(value) => Self::Complete(Some(value.finish(answer)?)),
            Self::Complete(_) => return Err(ExecutionError::UnfinishedOccurrence),
        };
        Ok(self.request().is_some())
    }

    pub fn into_hits(self) -> Option<PassageHits> {
        match self {
            Self::Complete(hits) => hits,
            // An empty first or second query needs no geometry.
            Self::Sweep(_) | Self::Rays(_) => None,
        }
    }
}

impl PassageSight {
    pub fn add_air_leg(
        &mut self,
        key: PassageKey,
        observer: PassageObserver,
        shot: PassagePath,
        to: Point,
        epsilon: f64,
        meters: &mut WorkMeters,
    ) -> Result<(), ExecutionError> {
        let dx = to.x - observer.feet.x;
        let dz = to.z - observer.feet.z;
        let heading = if dx.hypot(dz) > 1e-8 {
            crate::spatial::atan2(dx, dz)
        } else {
            observer.heading
        };
        self.add(
            PassageSegment {
                key,
                feet: [observer.feet, to],
                shot: [shot.from, shot.to],
                extent: observer.extent,
                separation: observer.separation,
                observer_heading: heading,
                eye_height: observer.eye_height,
                vision: observer.vision,
                starts: 0.0,
                seconds: shot.seconds,
            },
            epsilon,
            meters,
        )
    }

    /// Reuse the movement owner's admitted samples. An absent track is a
    /// stationary observer proved by the caller, never an endpoint chord.
    pub fn add_path(
        &mut self,
        key: PassageKey,
        observer: PassageObserver,
        shot: PassagePath,
        motion: Option<&crate::movement::MotionTrack>,
        epsilon: f64,
        meters: &mut WorkMeters,
    ) -> Result<(), ExecutionError> {
        let mut heading = observer.heading;
        let mut piece = |from: Point, to: Point, starts: f64, ends: f64| {
            let dx = to.x - from.x;
            let dz = to.z - from.z;
            if dx.hypot(dz) > 1e-8 {
                heading = crate::spatial::atan2(dx, dz);
            }
            self.add(
                PassageSegment {
                    key,
                    feet: [from, to],
                    shot: [starts, ends]
                        .map(|at| interpolate(shot.from, shot.to, at / shot.seconds)),
                    extent: observer.extent,
                    separation: observer.separation,
                    observer_heading: heading,
                    eye_height: observer.eye_height,
                    vision: observer.vision,
                    starts,
                    seconds: ends - starts,
                },
                epsilon,
                meters,
            )
        };
        if shot.seconds <= 0.0 {
            return Ok(());
        }
        let Some(track) = motion else {
            return piece(observer.feet, observer.feet, 0.0, shot.seconds);
        };
        if track.at.len() != track.pose.len()
            || track.at.first() != Some(&0.0)
            || track.pose.first() != Some(&observer.feet)
            || track.at.last().is_none_or(|at| *at < shot.seconds)
        {
            return Err(ExecutionError::Invariant);
        }
        for (at, pose) in track.at.windows(2).zip(track.pose.windows(2)) {
            if at[1] <= at[0] {
                return Err(ExecutionError::Invariant);
            }
            let ends = at[1].min(shot.seconds);
            let endpoint = if ends == at[1] {
                pose[1]
            } else {
                interpolate(pose[0], pose[1], (ends - at[0]) / (at[1] - at[0]))
            };
            piece(pose[0], endpoint, at[0], ends)?;
            if ends == shot.seconds {
                break;
            }
        }
        Ok(())
    }
}

struct ObservedBody {
    observer: PassageObserver,
    actual: Option<std::sync::Arc<crate::time::movement::ExecutedMotion>>,
}

/// An elapsed slice holds just the animals that could see a live flight.
/// Ground movement funds each actual track once, even when aiming needs it too.
pub(in crate::time) struct PassageTracks {
    watched: indexmap::IndexMap<EntityHandle, ObservedBody>,
    _storage: ByteReservation,
}

impl PassageTracks {
    pub(super) fn capture(
        observers: impl Iterator<Item = (EntityHandle, PassageObserver)>,
        count: usize,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, ExecutionError> {
        if count == 0 {
            return Ok(None);
        }
        let bytes = crate::host::retained_size::map_storage::<EntityHandle, ObservedBody>(count)
            .and_then(|bytes| bytes.checked_add(size_of::<Self>()))
            .ok_or(ExecutionError::Capacity)?;
        let mut watched = indexmap::IndexMap::new();
        let _storage = budget.reserve(bytes)?;
        watched
            .try_reserve_exact(count)
            .map_err(|_| ExecutionError::Capacity)?;
        for (handle, observer) in observers {
            watched.insert(
                handle,
                ObservedBody {
                    observer,
                    actual: None,
                },
            );
        }
        if watched.len() != count {
            return Err(ExecutionError::Invariant);
        }
        Ok(Some(Self { watched, _storage }))
    }

    pub(in crate::time) fn recording(&self, handle: EntityHandle) -> bool {
        self.watched.contains_key(&handle)
    }

    pub(in crate::time) fn record(
        &mut self,
        handle: EntityHandle,
        track: std::sync::Arc<crate::time::movement::ExecutedMotion>,
    ) -> Result<(), ExecutionError> {
        if let Some(observer) = self.watched.get_mut(&handle) {
            if observer.actual.is_some()
                || track.forecast.track.pose.first() != Some(&observer.observer.feet)
            {
                return Err(ExecutionError::Invariant);
            }
            observer.actual = Some(track);
        }
        Ok(())
    }

    /// The flight owner supplies the actually placed leg. It calls this
    /// after its geometry check and only for a positive elapsed slice.
    pub(super) fn prepare_actual(
        &self,
        core: &mut crate::execution::CoreMutation<'_>,
        seconds: f64,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<PassageScan, ExecutionError> {
        let installed = &core.state.installed;
        let physical = &core.state.physical;
        let mut sweep = PassageSight::new(binding, budget)?;
        for (index, row) in physical.projectiles.flights.values().enumerate() {
            let flight = &row.flight;
            let shot = PassagePath {
                from: flight.position,
                to: flight.travel(seconds).0,
                seconds,
            };
            for (handle, entry) in &self.watched {
                let Some(animal) = physical.entities.resolve(*handle).filter(|animal| {
                    animal.physical_life() == Some(entry.observer.life)
                        && animal.actively_participates()
                        && animal.actor.as_ref().is_some_and(|actor| actor.alive)
                }) else {
                    continue;
                };
                if row.passages.contains(&animal.id, entry.observer.life)
                    || super::launch_overlap(
                        flight,
                        animal,
                        entry.observer.feet,
                        entry.observer.extent,
                    )
                    || installed
                        .capabilities
                        .capability_blocked(Some(animal), "perception")?
                {
                    continue;
                }
                let motion = entry.actual.as_ref().map(|actual| &actual.forecast.track);
                let current = animal
                    .world_position()
                    .ok_or(ExecutionError::InvalidPosition)?;
                let earned = motion
                    .and_then(|track| track.pose.last())
                    .unwrap_or(&entry.observer.feet);
                if current != *earned {
                    // A position difference cannot be reconstructed from its
                    // two endpoints. Wait for the real movement producer to
                    // retain the required path instead of inventing sight.
                    return Err(ExecutionError::Invariant);
                }
                sweep.add_path(
                    PassageKey {
                        flight: index,
                        animal: *handle,
                        life: entry.observer.life,
                    },
                    entry.observer,
                    shot,
                    motion,
                    installed.spatial.epsilon,
                    &mut core.journal.meters,
                )?;
            }
        }
        Ok(PassageScan::Sweep(sweep))
    }
}
