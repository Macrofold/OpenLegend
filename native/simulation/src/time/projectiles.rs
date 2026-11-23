//! A flight shortens the existing elapsed interval before bodies move. Current
//! contact resolves later, after those bodies and the endpoint owners settle.

use super::input::{PreparedSteering, can_steer};
use super::{NativeParticipants, flight, travel};
use crate::execution::{CoreMutation, ExecutionError};
use crate::geometry::{
    GeometryAnswers, GeometryBinding, GeometryQueries, MovementRayHit, SightRay,
};
use crate::host::retained_size::heap_sum;
use crate::host::{ByteBudget, ByteReservation};
use crate::movement::{MotionForecast, MotionOperation, MotionStep};
use crate::projectile::ProjectileFlight;
use crate::spatial::{Extent, distance, interpolate, moving_point_contact};
use crate::state::{Entity, EntityHandle, Point};
use crate::work::WorkUnit;
use std::mem::size_of;

mod passage;
mod settle;
pub(super) use passage::PassageTracks;
use passage::{PassageKey, PassageObserver, PassagePath, PassageScan, PassageSight};
pub(super) use settle::{ProjectileSettle, ProjectileSettleStep};

struct Candidate {
    handle: EntityHandle,
    point: Point,
    extent: Extent,
    motion: Option<MotionForecast>,
    air: Option<flight::ProjectileAirMotion>,
    passage: Option<PassageObserver>,
}

pub(super) struct ProjectilePrediction {
    horizon: f64,
    bound: f64,
    query: Option<GeometryQueries>,
    solid_hits: Vec<Option<MovementRayHit>>,
    solid_bytes: usize,
    candidates: Vec<Candidate>,
    current: Option<MotionOperation>,
    passage_scan: Option<PassageScan>,
    next: usize,
    _reservation: ByteReservation,
}

pub(super) enum PredictionStep {
    Geometry,
    Done(f64),
}

pub(super) fn launch_overlap(
    flight: &ProjectileFlight,
    entity: &Entity,
    position: Point,
    extent: Extent,
) -> bool {
    !flight.source_exited
        && flight.source_id == entity.id
        && entity.physical_life().unwrap_or(0) == flight.source_life
        && moving_point_contact(flight.position, flight.position, position, position, extent)
            .is_some()
}

fn intersects_a_flight<'a>(
    mut flights: impl Iterator<Item = &'a ProjectileFlight>,
    horizon: f64,
    point: Point,
    envelope: f64,
) -> bool {
    flights.any(|flight| {
        let (end, length) = flight.travel(horizon);
        distance(point, interpolate(flight.position, end, 0.5)) <= length / 2.0 + envelope
    })
}

impl ProjectilePrediction {
    pub(super) fn prepare(
        core: &mut CoreMutation<'_>,
        roster: &NativeParticipants,
        steering: &PreparedSteering,
        input_seconds: f64,
        horizon: f64,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let physical = &core.state.physical;
        let installed = &core.state.installed;
        let mut query = GeometryQueries::new(binding);
        let flights = &physical.projectiles.flights;
        let mut reservation = budget.reserve(
            heap_sum([
                size_of::<Self>(),
                flights
                    .len()
                    .checked_mul(size_of::<SightRay>())
                    .ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        query
            .movement_rays
            .try_reserve_exact(flights.len())
            .map_err(|_| ExecutionError::Capacity)?;
        let mut bound = horizon;
        for row in flights.values() {
            let flight = &row.flight;
            bound = bound.min(flight.remaining_range / flight.speed);
            query.movement_rays.push(SightRay {
                from: flight.position,
                to: flight.travel(horizon).0,
            });
        }
        let mut candidates = Vec::new();
        for &handle in roster.projectile_bodies() {
            let entity = physical
                .entities
                .resolve(handle)
                .ok_or(ExecutionError::Invariant)?;
            let point = entity
                .world_position()
                .ok_or(ExecutionError::InvalidPosition)?;
            let extent: Extent = entity.body_profile().as_ref().into();
            // A fall is physical even if the body cannot choose locomotion.
            let travel = if entity.spatial.fall_velocity.is_some() {
                flight::motion_reach(installed, entity, horizon)?
                    .ok_or(ExecutionError::Invariant)?
            } else {
                travel::reach(installed, entity, horizon)?
            };
            let travel = steering.routes.get(&handle).map_or(travel, |route| {
                travel.max(route.distance * horizon / input_seconds)
            });
            core.journal.meters.charge(&[(WorkUnit::Candidates, 1)])?;
            let envelope = extent.height + extent.radius + travel + installed.time_epsilon;
            let passage = PassageObserver::prepare(installed, entity, budget)?.filter(|observer| {
                intersects_a_flight(
                    flights.values()
                        .filter(|row| !row.passages.contains(&entity.id, observer.life))
                        .map(|row| &row.flight),
                    horizon,
                    point,
                    observer.extent.height + observer.extent.radius + travel
                        + observer.separation + installed.time_epsilon,
                )
            });
            if passage.is_none() && !intersects_a_flight(
                flights.values().map(|row| &row.flight), horizon, point, envelope,
            ) {
                continue;
            }
            let air = if travel > 0.0
                && (entity.spatial.flight.is_some() || entity.spatial.fall_velocity.is_some())
            {
                flight::projectile_motion(installed, entity, horizon)?
            } else {
                None
            };
            if candidates.len() == candidates.capacity() {
                let capacity = candidates
                    .capacity()
                    .checked_mul(2)
                    .ok_or(ExecutionError::Capacity)?
                    .max(4);
                let bytes = (capacity - candidates.capacity())
                    .checked_mul(size_of::<Candidate>())
                    .ok_or(ExecutionError::Capacity)?;
                reservation.resize(
                    reservation
                        .bytes()
                        .checked_add(bytes)
                        .ok_or(ExecutionError::Capacity)?,
                )?;
                candidates
                    .try_reserve_exact(capacity - candidates.len())
                    .map_err(|_| ExecutionError::Capacity)?;
            }
            candidates.push(Candidate {
                handle,
                point,
                extent,
                motion: None,
                air,
                passage,
            });
        }
        Ok(Self {
            horizon,
            bound,
            query: Some(query),
            solid_hits: Vec::new(),
            solid_bytes: 0,
            candidates,
            current: None,
            passage_scan: None,
            next: 0,
            _reservation: reservation,
        })
    }

    pub(super) fn question(&self) -> Option<&GeometryQueries> {
        self.query
            .as_ref()
            .or_else(|| self.current.as_ref().and_then(MotionOperation::queries))
            .or_else(|| self.passage_scan.as_ref().and_then(PassageScan::request))
    }

    pub(super) fn step(
        &mut self,
        core: &mut CoreMutation<'_>,
        steering: &PreparedSteering,
        input_seconds: f64,
        mut answer: Option<GeometryAnswers>,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<PredictionStep, ExecutionError> {
        if let Some(query) = &self.query {
            let Some(answer) = answer.take() else {
                return Ok(PredictionStep::Geometry);
            };
            query
                .validate_answers(&answer)
                .map_err(|_| ExecutionError::Invariant)?;
            for (idx, hit) in answer.movement_rays.iter().enumerate() {
                if let Some(hit) = hit {
                    // The corresponding ray was limited to this flight's
                    // remaining range, even when the full world step is longer.
                    let flight = &core
                        .state
                        .physical
                        .projectiles
                        .flights
                        .get_index(idx)
                        .ok_or(ExecutionError::Invariant)?
                        .1
                        .flight;
                    self.bound = self.bound.min(
                        self.horizon.min(flight.remaining_range / flight.speed) * hit.fraction,
                    );
                }
            }
            let returned_bytes = answer.movement_rays.iter().flatten().try_fold(
                answer
                    .movement_rays
                    .capacity()
                    .checked_mul(size_of::<Option<MovementRayHit>>())
                    .ok_or(ExecutionError::Capacity)?,
                |total, hit| {
                    let keys = hit
                        .collider_ids
                        .capacity()
                        .checked_mul(size_of::<String>())
                        .ok_or(ExecutionError::Capacity)?;
                    hit.collider_ids.iter().try_fold(
                        total.checked_add(keys).ok_or(ExecutionError::Capacity)?,
                        |sum, key| {
                            sum.checked_add(key.capacity())
                                .ok_or(ExecutionError::Capacity)
                        },
                    )
                },
            )?;
            self._reservation.resize(
                self._reservation
                    .bytes()
                    .checked_add(returned_bytes)
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            self.solid_hits = answer.movement_rays;
            self.solid_bytes = returned_bytes;
            self.query = None;
        }
        if let Some(scan) = &mut self.passage_scan {
            if scan.step(answer.take(), binding, core.state.installed.time_epsilon,
                budget, &mut core.journal.meters)? {
                return Ok(PredictionStep::Geometry);
            }
            if let Some(hits) = self.passage_scan.take().and_then(PassageScan::into_hits) {
                for hit in hits.iter() {
                    self.bound = self.bound.min(hit.at);
                }
            }
            return Ok(PredictionStep::Done(self.bound));
        }
        while let Some(candidate) = self.candidates.get_mut(self.next) {
            let state = &core.state;
            if self.current.is_none() {
                let entity = state
                    .physical
                    .entities
                    .resolve(candidate.handle)
                    .ok_or(ExecutionError::Invariant)?;
                let route = match steering.routes.get(&candidate.handle) {
                    Some(route) if can_steer(state, entity)? => Some(route),
                    _ => None,
                };
                if let Some(route) = route {
                    self.current = Some(MotionOperation::forecast(
                        core,
                        entity,
                        &route.path,
                        None,
                        route.distance * (self.horizon / input_seconds),
                        true,
                        self.horizon,
                        binding,
                        budget,
                    )?);
                } else if let Some(action) = entity
                    .actor
                    .as_ref()
                    .filter(|a| a.alive && !a.incapacitated)
                    .and_then(|a| a.action.as_ref())
                {
                    if (action.stage == "approaching" && action.has_ground_motion())
                        || action.strike_motion.is_some()
                    {
                        if !state
                            .installed
                            .capabilities
                            .capability_blocked(Some(entity), "locomotion")?
                        {
                            let occupied = action.is_evading()
                                || action.strike_motion.is_some()
                                || action.native_locomotion.is_some()
                                || entity.animal.is_some();
                            self.current = Some(MotionOperation::forecast(
                                core,
                                entity,
                                &action.path,
                                Some(&action.id),
                                state.installed.movement_speed(entity)? * self.horizon,
                                occupied,
                                self.horizon,
                                binding,
                                budget,
                            )?);
                        }
                    }
                }
            }
            if let Some(current) = &mut self.current {
                match current.step(core, answer.take())? {
                    MotionStep::Geometry(_) => return Ok(PredictionStep::Geometry),
                    MotionStep::Complete(_) => {
                        candidate.motion = Some(
                            self.current
                                .take()
                                .ok_or(ExecutionError::Invariant)?
                                .into_forecast()?,
                        );
                    }
                }
            } else if answer.is_some() {
                return Err(ExecutionError::Invariant);
            }
            self.next += 1;
        }
        self.bound = self.body_boundary(core)?;
        if self.bound > 0.0 && self.candidates.iter().any(|body| body.passage.is_some()) {
            let mut sweep = PassageSight::new(binding, budget)?;
            let installed = &core.state.installed;
            let bodies = &core.state.physical.entities;
            // Only the still-traversable part of each flight can start an
            // animal reaction. Earlier solid/body impacts already cut bound.
            for (flight_index, row) in core.state.physical.projectiles.flights.values().enumerate() {
                let flight = &row.flight;
                let path = PassagePath {
                    from: flight.position, to: flight.travel(self.bound).0, seconds: self.bound,
                };
                for candidate in &self.candidates {
                    let Some(observer) = candidate.passage else { continue };
                    let entity = bodies.resolve(candidate.handle).ok_or(ExecutionError::Invariant)?;
                    if row.passages.contains(&entity.id, observer.life)
                        || launch_overlap(flight, entity, candidate.point, candidate.extent)
                    {
                        continue;
                    }
                    let key = PassageKey { flight: flight_index, animal: candidate.handle, life: observer.life };
                    if let Some(air) = &candidate.air {
                        if air.until > 0.0 {
                            let to = interpolate(observer.feet, air.to, (self.bound / air.until).min(1.0));
                            sweep.add_air_leg(key, observer, path, to,
                                installed.spatial.epsilon, &mut core.journal.meters)?;
                        }
                        if !air.can_stay && air.until > 0.0 {
                            continue;
                        }
                    }
                    sweep.add_path(
                        key, observer, path, candidate.motion.as_ref().map(|motion| &motion.track),
                        installed.spatial.epsilon, &mut core.journal.meters,
                    )?;
                }
            }
            if sweep.request().is_some() {
                self.passage_scan = Some(PassageScan::Sweep(sweep));
                return Ok(PredictionStep::Geometry);
            }
        }
        Ok(PredictionStep::Done(self.bound))
    }

    pub(super) fn into_settlement(mut self, seconds: f64, budget: &ByteBudget) -> Result<ProjectileSettle, ExecutionError> {
        let observers = self.candidates.iter().filter_map(|candidate| {
            candidate.passage.map(|observer| (candidate.handle, observer))
        });
        let tracks = if seconds > 0.0 {
            PassageTracks::capture(observers.clone(), observers.count(), budget)?
        } else {
            None
        };
        drop(self.candidates);
        let bytes = self.solid_bytes.checked_add(size_of::<ProjectileSettle>())
            .ok_or(ExecutionError::Capacity)?;
        self._reservation.resize(bytes)?;
        Ok(ProjectileSettle::new(self.horizon, seconds, self.solid_hits, tracks, self._reservation))
    }

    fn body_boundary(&self, core: &mut CoreMutation<'_>) -> Result<f64, ExecutionError> {
        let physical = &core.state.physical;
        let mut bound = self.bound;
        for row in physical.projectiles.flights.values() {
            let flight = &row.flight;
            for candidate in &self.candidates {
                let entity = physical
                    .entities
                    .resolve(candidate.handle)
                    .ok_or(ExecutionError::Invariant)?;
                if launch_overlap(flight, entity, candidate.point, candidate.extent) {
                    continue;
                }
                let first_motion = candidate
                    .air
                    .as_ref()
                    .filter(|motion| motion.until > 0.0)
                    .map(|motion| (motion.until, motion.to))
                    .or_else(|| {
                        let motion = candidate.motion.as_ref()?;
                        Some((*motion.track.at.get(1)?, *motion.track.pose.get(1)?))
                    });
                let first_turn = first_motion.map_or(self.horizon, |(at, _)| at);
                let until = bound.min(first_turn);
                let to = flight.travel(until).0;
                let at = first_motion
                    .filter(|(at, _)| *at > 0.0)
                    .map_or(candidate.point, |(_, pose)| {
                        interpolate(candidate.point, pose, until / first_turn)
                    });
                core.journal.meters.charge(&[(WorkUnit::Tests, 1)])?;
                if let Some(contact) =
                    moving_point_contact(flight.position, to, candidate.point, at, candidate.extent)
                {
                    bound = bound.min(until * contact.enter);
                }
                // The actual flight owner can decline a blocked or unsafe
                // leg. Bound either possibility, then test the actual body.
                if candidate.air.as_ref().is_some_and(|motion| motion.can_stay) {
                    core.journal.meters.charge(&[(WorkUnit::Tests, 1)])?;
                    if let Some(contact) = moving_point_contact(
                        flight.position,
                        to,
                        candidate.point,
                        candidate.point,
                        candidate.extent,
                    ) {
                        bound = bound.min(until * contact.enter);
                    }
                }
                bound = bound.min(first_turn);
            }
        }
        Ok(bound)
    }
}
