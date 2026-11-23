//! The interval prediction admits a clock boundary. Resolve its actual
//! contact after motion, with current physical participation and sight.
use super::*;
use super::local_pose::{Avoidance, AvoidanceStep};
use super::crossing::{ClearedCrossing, CloseStep};
use crate::execution::CrossingChange;
use super::passage::{PassageHit, PassageHits};
use crate::body::{
    BodyAnswer, BodyStep, HealthChangeCursor, ProjectileContact, ScarEffect, scar_factor,
};
use crate::events::{
    AudienceSelection, CompletedOccurrence, EmissionText, EventEmissionIntent, EventScope,
};
use crate::execution::StagedOccurrence;
use crate::geometry::MovementRayHit;
use crate::host::retained_size::HeapBytes;
use crate::narration::{Narration, NarrationPart, PersonRole};
use crate::reception::{EventScalar, SightBatch};
use crate::text::JsText;
use indexmap::IndexMap;

pub(in super::super) enum ProjectileSettleStep {
    Geometry,
    Event(StagedOccurrence),
    Done,
}

pub(in super::super) struct ProjectileSettle {
    horizon: f64,
    seconds: f64,
    solids: Vec<Option<MovementRayHit>>,
    preexisting: usize,
    launched_solids: Option<GeometryQueries>,
    order: Option<Vec<(String, usize)>>,
    next: usize,
    started: bool,
    tracks: Option<PassageTracks>,
    scan: Option<PassageScan>,
    passages: Option<PassageHits>,
    next_passage: usize,
    expected_passage: Option<String>,
    exit: Option<ClearedCrossing>,
    terminal: Option<Terminal>,
    _reservation: ByteReservation,
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum Phase {
    Avoidance,
    DuckSettled,
    Sight,
    KnownSource,
    Injury,
    Physical,
    System,
    Personal,
    Retire,
}

struct Terminal {
    shot: String,
    body: Option<String>,
    solid: Option<String>,
    body_life: Option<u64>,
    hit: bool,
    seen: bool,
    saw_selected: bool,
    saw_point: bool,
    known_source: bool,
    phase: Phase,
    avoidance: Option<Avoidance>,
    sight: Option<SightBatch>,
    injury: Option<HealthChangeCursor>,
    before: Option<f64>,
    loss: f64,
    raw_injury: f64,
    prevented_injury: f64,
    expected: Option<String>,
    _storage: ByteReservation,
}

impl ProjectileSettle {
    pub(super) fn new(
        horizon: f64,
        seconds: f64,
        solids: Vec<Option<MovementRayHit>>,
        tracks: Option<PassageTracks>,
        reservation: ByteReservation,
    ) -> Self {
        let preexisting = solids.len();
        Self {
            horizon,
            seconds,
            solids,
            preexisting,
            launched_solids: None,
            order: None,
            next: 0,
            started: false,
            tracks,
            scan: None,
            passages: None,
            next_passage: 0,
            expected_passage: None,
            exit: None,
            terminal: None,
            _reservation: reservation,
        }
    }

    pub(in crate::time) fn current(budget: &ByteBudget) -> Result<Self, ExecutionError> {
        Ok(Self::new(0.0, 0.0, Vec::new(), None, budget.reserve(size_of::<Self>())?))
    }

    pub(in super::super) fn question(&self) -> Option<&GeometryQueries> {
        self.launched_solids.as_ref().or_else(|| self.scan.as_ref().and_then(PassageScan::request))
            .or_else(|| self.exit.as_ref().and_then(ClearedCrossing::question)).or_else(|| {
            let terminal = self.terminal.as_ref()?;
            terminal.avoidance.as_ref().and_then(Avoidance::question)
                .or_else(|| terminal.sight.as_ref().map(SightBatch::queries))
        })
    }

    pub(in super::super) fn take_passage_tracks(&mut self) -> Option<PassageTracks> {
        self.tracks.take()
    }

    pub(in super::super) fn passage_tracks_mut(&mut self) -> Option<&mut PassageTracks> {
        self.tracks.as_mut()
    }

    pub(in super::super) fn receive_passage_tracks(&mut self, tracks: PassageTracks) -> Result<(), ExecutionError> {
        if self.tracks.replace(tracks).is_some() || self.order.is_some() {
            return Err(ExecutionError::Invariant);
        }
        Ok(())
    }

    pub(in super::super) fn step(
        &mut self,
        core: &mut CoreMutation<'_>,
        mut binding: GeometryBinding,
        mut geometry: Option<GeometryAnswers>,
        mut event: Option<CompletedOccurrence>,
        budget: &ByteBudget,
    ) -> Result<ProjectileSettleStep, ExecutionError> {
        // Work at the endpoint may commit a new shot. It receives an actual
        // solid check at launch and no part of the preceding elapsed interval.
        if self.order.is_none() {
            let flights = &core.state.physical.projectiles.flights;
            if let Some(query) = self.launched_solids.take() {
                let answer = geometry.take().ok_or(ExecutionError::UnfinishedOccurrence)?;
                query.validate_answers(&answer).map_err(|_| ExecutionError::InvalidCheckpoint)?;
                let bytes = answer.movement_rays.heap_bytes().ok_or(ExecutionError::Capacity)?;
                self._reservation.resize(self._reservation.bytes().checked_add(bytes)
                    .ok_or(ExecutionError::Capacity)?)?;
                self.solids.try_reserve_exact(answer.movement_rays.len()).map_err(|_| ExecutionError::Capacity)?;
                self.solids.extend(answer.movement_rays);
            } else if flights.len() > self.solids.len() {
                let count = flights.len() - self.solids.len();
                self._reservation.resize(self._reservation.bytes().checked_add(
                    count.checked_mul(size_of::<crate::geometry::SightRay>())
                        .ok_or(ExecutionError::Capacity)?,
                ).ok_or(ExecutionError::Capacity)?)?;
                binding.serial = core.journal.next_provider_serial()?;
                let mut query = GeometryQueries::new(binding);
                query.movement_rays.try_reserve_exact(count).map_err(|_| ExecutionError::Capacity)?;
                for row in flights.values().skip(self.solids.len()) {
                    let position = row.flight.position;
                    query.movement_rays.push(crate::geometry::SightRay { from: position, to: position });
                }
                self.launched_solids = Some(query);
                return Ok(ProjectileSettleStep::Geometry);
            }
        }
        if let Some(tracks) = self.tracks.take() {
            self.scan = Some(tracks.prepare_actual(core, self.seconds, binding, budget)?);
        }
        if let Some(scan) = &mut self.scan {
            if scan.step(geometry.take(), binding, core.state.installed.time_epsilon,
                budget, &mut core.journal.meters)? {
                return Ok(ProjectileSettleStep::Geometry);
            }
            self.passages = self.scan.take().and_then(PassageScan::into_hits);
        }
        if self.order.is_none() {
            let flights = &core.state.physical.projectiles.flights;
            if flights.len() != self.solids.len() {
                return Err(ExecutionError::Invariant);
            }
            let bytes = flights.keys().try_fold(
                flights
                    .len()
                    .checked_mul(size_of::<(String, usize)>())
                    .ok_or(ExecutionError::Capacity)?,
                |bytes, id| bytes.checked_add(id.len()).ok_or(ExecutionError::Capacity),
            )?;
            self._reservation.resize(
                self._reservation
                    .bytes()
                    .checked_add(bytes)
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let mut order: Vec<_> = flights
                .keys()
                .enumerate()
                .map(|(i, id)| (id.clone(), i))
                .collect();
            order.sort_unstable_by(|left, right| left.0.cmp(&right.0));
            self.order = Some(order);
        }
        if let Some(expected) = self.expected_passage.take() {
            if event.take().is_none_or(|receipt| receipt.event_id() != expected) {
                return Err(ExecutionError::UnfinishedOccurrence);
            }
        }
        loop {
            let Some((id, ordinal)) = self.order.as_ref().and_then(|order| order.get(self.next))
            else {
                if self.exit.is_none() {
                    self.exit = ClearedCrossing::next(core, budget)?;
                }
                if let Some(exit) = &mut self.exit {
                    match exit.step(core, binding, geometry.take(), budget)? {
                        CloseStep::Geometry => return Ok(ProjectileSettleStep::Geometry),
                        CloseStep::Event(staged) => {
                            self.exit = None;
                            self._reservation.resize(self._reservation.bytes().checked_add(staged.id.len())
                                .ok_or(ExecutionError::Capacity)?)?;
                            self.expected_passage = Some(staged.id.clone());
                            return Ok(ProjectileSettleStep::Event(staged));
                        }
                    }
                }
                if geometry.is_some() || event.is_some() {
                    return Err(ExecutionError::UnfinishedOccurrence);
                }
                return Ok(ProjectileSettleStep::Done);
            };
            if !self.started {
                let solid = self.solids.get(*ordinal).and_then(Option::as_ref);
                let (elapsed, horizon) = if *ordinal < self.preexisting {
                    (self.seconds, self.horizon)
                } else {
                    (0.0, 0.0)
                };
                self.terminal = self.advance_flight(core, id, solid, elapsed, horizon, budget)?;
                self.started = true;
                self.next_passage = 0;
            }
            if let Some(hits) = &self.passages {
                let hits = hits.for_flight(*ordinal);
                while let Some(&witness) = hits.get(self.next_passage) {
                    self.next_passage += 1;
                    if let Some(staged) = stage_passage(core, id, witness, budget)? {
                        self._reservation.resize(
                            self._reservation.bytes().checked_add(staged.id.len())
                                .ok_or(ExecutionError::Capacity)?,
                        )?;
                        self.expected_passage = Some(staged.id.clone());
                        return Ok(ProjectileSettleStep::Event(staged));
                    }
                }
            }
            if let Some(terminal) = &mut self.terminal {
                if let Some(next) =
                    terminal.step(core, binding, geometry.take(), event.take(), budget)?
                {
                    return Ok(next);
                }
                if terminal.phase == Phase::DuckSettled {
                    let prior = self.terminal.take().ok_or(ExecutionError::Invariant)?;
                    // The projectile has already travelled to this boundary. Reuse
                    // its reached solid candidate and test the actual new bodies.
                    self.terminal = Terminal::prepare_at(core, id, prior.solid.as_deref(), budget)?;
                    continue;
                }
                self.terminal = None;
            }
            if geometry.is_some() || event.is_some() {
                return Err(ExecutionError::UnfinishedOccurrence);
            }
            self.started = false;
            self.next += 1;
        }
    }

    fn advance_flight(
        &self,
        core: &mut CoreMutation<'_>,
        id: &str,
        solid: Option<&MovementRayHit>,
        elapsed: f64,
        horizon: f64,
        budget: &ByteBudget,
    ) -> Result<Option<Terminal>, ExecutionError> {
        let state = &core.state.physical;
        let flight = &state
            .projectiles
            .flights
            .get(id)
            .ok_or(ExecutionError::Invariant)?
            .flight;
        let at = state.header.sim_time;
        let time_epsilon = core.state.installed.time_epsilon;
        let space_epsilon = core.state.installed.spatial.epsilon;
        let (point, travel) = flight.travel(elapsed);
        let solid = solid.and_then(|hit| {
            let hit_at = hit.fraction * horizon.min(flight.remaining_range / flight.speed);
            (hit_at <= elapsed + time_epsilon)
                .then(|| hit.collider_ids.iter().min())
                .flatten()
        });
        let _solid_storage = budget.reserve(solid.map_or(0, String::len))?;
        let solid = solid.cloned();
        let after = flight.remaining_range - travel;
        let source_exited = flight.source_exited || !state.entities.get(&flight.source_id)
            .and_then(|source| Some((source, source.world_position()?)))
            .is_some_and(|(source, origin)| {
                source.physical_life() == Some(flight.source_life)
                    && moving_point_contact(point, point, origin, origin, source.actual_extent()).is_some()
            });
        core.physical().set_projectile_progress(
            id,
            crate::projectile::FlightPosition {
                position: point,
                advanced_at: at,
                remaining_range: after,
                source_exited,
            },
        )?;
        Terminal::prepare_at(core, id, solid.as_deref(), budget)
    }
}

impl Terminal {
    fn prepare_at(
        core: &mut CoreMutation<'_>,
        id: &str,
        solid: Option<&str>,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, ExecutionError> {
        let state = &core.state.physical;
        let flight = &state.projectiles.flights.get(id).ok_or(ExecutionError::Invariant)?.flight;
        let point = flight.position;
        let space_epsilon = core.state.installed.spatial.epsilon;
        let mut body = None;
        let mut tested = 0;
        state
            .bodies
            .any_body(point, state.bodies.maximum_extent() + space_epsilon, |handle| {
                let Some(candidate) = state.entities.resolve(handle).filter(|entry| {
                    entry.actively_participates()
                        && (entry.actor.is_some() || entry.practice_target.is_some())
                }) else {
                    return false;
                };
                let Some(origin) = candidate.world_position() else {
                    return false;
                };
                let extent = candidate.actual_extent();
                if launch_overlap(flight, candidate, origin, extent) {
                    return false;
                }
                let low = Point {
                    y: origin.y - space_epsilon,
                    ..origin
                };
                let expanded = Extent {
                    radius: extent.radius + space_epsilon,
                    height: extent.height + space_epsilon * 2.0,
                };
                tested += 1;
                if moving_point_contact(point, point, low, low, expanded).is_some()
                    && solid.is_none_or(|other| candidate.id.as_str() < other)
                    && body.is_none_or(|prior: &Entity| candidate.id < prior.id)
                {
                    body = Some(candidate);
                }
                // Stable ties require the whole admitted local candidate set.
                false
            });
        core.journal.meters.charge(&[(WorkUnit::Tests, tested)])?;
        let terminal = if body.is_some() || solid.is_some() || flight.remaining_range <= space_epsilon {
            let _storage = budget.reserve(
                size_of::<Terminal>()
                    + 2 * id.len()
                    + body.map_or(0, |entry| entry.id.len())
                    + solid.map_or(0, |entry| entry.len()),
            )?;
            Some(Self {
                shot: id.into(),
                body: body.map(|entry| entry.id.clone()),
                solid: solid.map(str::to_owned),
                body_life: body.and_then(Entity::physical_life),
                hit: false,
                seen: false,
                saw_selected: false,
                saw_point: false,
                known_source: false,
                phase: Phase::Avoidance,
                avoidance: None,
                sight: None,
                injury: None,
                before: None,
                loss: 0.0,
                raw_injury: 0.0,
                prevented_injury: 0.0,
                expected: None,
                _storage,
            })
        } else {
            None
        };
        Ok(terminal)
    }

    fn step(
        &mut self,
        core: &mut CoreMutation<'_>,
        mut binding: GeometryBinding,
        mut geometry: Option<GeometryAnswers>,
        mut event: Option<CompletedOccurrence>,
        budget: &ByteBudget,
    ) -> Result<Option<ProjectileSettleStep>, ExecutionError> {
        if let Some(expected) = self.expected.take() {
            if event
                .take()
                .is_none_or(|receipt| receipt.event_id() != expected)
            {
                return Err(ExecutionError::UnfinishedOccurrence);
            }
            if self.phase == Phase::DuckSettled {
                let body = self.body.as_deref().ok_or(ExecutionError::Invariant)?;
                let _entry = budget.reserve(body.len() + expected.len())?;
                let entered_at = core.state.physical.header.sim_time;
                core.physical().projectile_crossing(&self.shot, CrossingChange::Open(
                    crate::projectile::ProjectileCrossing {
                        body_id: body.into(),
                        body_life: self.body_life.ok_or(ExecutionError::Invariant)?,
                        pose_occurrence_id: expected,
                        entered_at,
                    },
                ))?;
            }
        }
        if self.phase == Phase::DuckSettled {
            return Ok(None);
        }
        if self.phase == Phase::Avoidance {
            if let Some(body) = &self.body {
                if let Some(avoidance) = &mut self.avoidance {
                    let answer = geometry.take().ok_or(ExecutionError::UnfinishedOccurrence)?;
                    match avoidance.step(core, body, &self.shot, binding, answer, budget)? {
                        AvoidanceStep::Geometry => return Ok(Some(ProjectileSettleStep::Geometry)),
                        AvoidanceStep::Contact => {}
                        AvoidanceStep::Duck(staged) => {
                            self.avoidance = None;
                            self.phase = Phase::DuckSettled;
                            self._storage.resize(self._storage.bytes().checked_add(staged.id.len())
                                .ok_or(ExecutionError::Capacity)?)?;
                            self.expected = Some(staged.id.clone());
                            return Ok(Some(ProjectileSettleStep::Event(staged)));
                        }
                    }
                } else {
                    let point = core.state.physical.projectiles.flights.get(&self.shot)
                        .ok_or(ExecutionError::Invariant)?.flight.position;
                    self.avoidance = Avoidance::prepare(core, body, point, binding, budget)?;
                    if self.avoidance.is_some() {
                        return Ok(Some(ProjectileSettleStep::Geometry));
                    }
                }
            }
            self.avoidance = None;
            self.phase = Phase::Sight;
        }
        loop {
            let physical = &core.state.physical;
            let flight = &physical
                .projectiles
                .flights
                .get(&self.shot)
                .ok_or(ExecutionError::Invariant)?
                .flight;
            let source = physical.entities.get(&flight.source_id).filter(|entity| {
                entity.actively_participates()
                    && entity.physical_life() == Some(flight.source_life)
                    && entity.actor.as_ref().is_some_and(|actor| actor.alive)
            });
            let target = self
                .body
                .as_deref()
                .and_then(|id| physical.entities.get(id));
            let selected = flight
                .target_id
                .as_deref()
                .and_then(|id| physical.entities.get(id))
                .filter(|entity| {
                    entity.physical_life().unwrap_or(0) == flight.target_life.unwrap_or(0)
                })
                .map(|entity| entity.id.as_str());
            if matches!(self.phase, Phase::Sight | Phase::KnownSource) {
                let reverse = self.phase == Phase::KnownSource;
                if let Some(sight) = self.sight.take() {
                    let geometry = geometry
                        .take()
                        .ok_or(ExecutionError::UnfinishedOccurrence)?;
                    let observed = sight
                        .finish(geometry)
                        .map_err(crate::native_controller::sensor_error)?;
                    if reverse {
                        self.known_source = observed.seen(&flight.source_id) == Some(true);
                    } else {
                        self.seen = self
                            .body
                            .as_deref()
                            .is_some_and(|id| observed.seen(id) == Some(true));
                        self.saw_selected =
                            selected.is_some_and(|id| observed.seen(id) == Some(true));
                        self.saw_point = observed.point_seen() == Some(true);
                    }
                } else if let Some(source) = source {
                    let mut ids = [""; 2];
                    let (observer, count, point) = if reverse {
                        if let Some(target) =
                            target.filter(|target| target.actor.is_some() && target.id != source.id)
                        {
                            ids[0] = &source.id;
                            (Some(target), 1, None)
                        } else {
                            (None, 0, None)
                        }
                    } else {
                        let mut count = 0;
                        if let Some(body) = self.body.as_deref() {
                            ids[count] = body;
                            count += 1;
                        }
                        if let Some(selected) =
                            selected.filter(|id| self.body.as_deref() != Some(*id))
                        {
                            ids[count] = selected;
                            count += 1;
                        }
                        (Some(source), count, Some(flight.position))
                    };
                    if let Some(observer) = observer {
                        binding.serial = core.journal.next_provider_serial()?;
                        self.sight = Some(
                            SightBatch::prepare_with_point(
                                physical,
                                &core.state.installed,
                                &observer.id,
                                &ids[..count],
                                point,
                                binding,
                                budget,
                            )
                            .map_err(crate::native_controller::sensor_error)?,
                        );
                        return Ok(Some(ProjectileSettleStep::Geometry));
                    }
                }
                self.phase = if reverse {
                    Phase::Injury
                } else {
                    Phase::KnownSource
                };
                continue;
            }
            if geometry.is_some() {
                return Err(ExecutionError::UnfinishedOccurrence);
            }
            if self.phase == Phase::Injury {
                if let Some(injury) = &mut self.injury {
                    let mut answer = event.take().map(BodyAnswer::Occurrence);
                    loop {
                        match injury.step(core, answer.take())? {
                            BodyStep::Occurrence(staged) => {
                                return Ok(Some(ProjectileSettleStep::Event(staged)));
                            }
                            BodyStep::Personal(pending) => {
                                let prepared = crate::experience::prepare_activity_result(
                                    core, pending, budget,
                                )
                                .map_err(|_| ExecutionError::UnfinishedOccurrence)?;
                                let schema = core.state.installed.schema.clone();
                                let acquired = crate::experience::acquire_activity_result(
                                    core, prepared, &schema,
                                )
                                .map_err(|_| ExecutionError::UnfinishedOccurrence)?;
                                answer = Some(BodyAnswer::Personal(acquired));
                            }
                            BodyStep::Complete => break,
                        }
                    }
                    let current = self
                        .body
                        .as_deref()
                        .and_then(|id| core.state.physical.entities.get(id))
                        .and_then(|entry| entry.actor.as_ref())
                        .map_or(0.0, |actor| actor.health);
                    self.loss =
                        (self.before.take().ok_or(ExecutionError::Invariant)? - current).max(0.0);
                    self.injury = None;
                    self.phase = Phase::Physical;
                    continue;
                }
                if event.is_some() {
                    return Err(ExecutionError::UnfinishedOccurrence);
                }
                let body = target
                    .and_then(|entry| entry.actor.as_ref().zip(Some(entry)))
                    .filter(|(actor, _)| actor.alive);
                if let Some((body, entry)) = body.filter(|_| {
                    flight.contact_policy.response == ProjectileContact::InjureVulnerableBody
                }) {
                    let before = body.health;
                    let resistance = body
                        .body
                        .as_ref()
                        .ok_or(ExecutionError::MissingBody)?
                        .susceptibility
                        .injury;
                    let policy = core
                        .state
                        .installed
                        .body_policy
                        .as_ref()
                        .map(|body| body.value());
                    let injury = flight.injury * flight.injury_factor()
                        * resistance
                        * scar_factor(policy, entry, ScarEffect::IncomingInjury);
                    let storage = budget.reserve(entry.id.len() + self.shot.len())?;
                    let id = entry.id.clone();
                    let direction = Point { x: -flight.direction.x, y: -flight.direction.y, z: -flight.direction.z };
                    let defense = crate::contact::guard::apply_contact(core, &id, direction, injury)?;
                    self.raw_injury = injury;
                    self.prevented_injury = defense.prevented;
                    self.injury = Some(HealthChangeCursor::new(
                        core, &id, -defense.injury, &self.shot, None, None, budget,
                    )?);
                    drop(storage);
                    self.before = Some(before);
                    self.hit = true;
                    continue;
                }
                self.hit = flight.practice
                    && target.is_some_and(|entry| {
                        entry.practice_target.is_some()
                            && flight.target_id.as_deref() == Some(entry.id.as_str())
                    });
                self.phase = Phase::Physical;
                continue;
            }
            if event.is_some() {
                return Err(ExecutionError::UnfinishedOccurrence);
            }
            let installed = core.state.installed.clone();
            let occurrence = installed.occurrence_rules.value();
            let words = occurrence
                .ranged
                .as_ref()
                .ok_or(ExecutionError::Invariant)?;
            let pos = flight.position;
            let direction = flight.direction;
            let result = if self.hit {
                "hit"
            } else if self.body.is_some() || self.solid.is_some() {
                "stopped"
            } else {
                "missed"
            };
            let _work = budget.reserve(
                4096 + 6
                    * (self.shot.len()
                        + flight.action_id.len()
                        + flight.source_id.len()
                        + self.body.as_ref().map_or(0, String::len)
                        + self.solid.as_ref().map_or(0, String::len)),
            )?;
            let data = |fields: &[(&str, EventScalar)]| -> IndexMap<String, EventScalar> {
                fields
                    .iter()
                    .map(|(key, value)| ((*key).into(), value.clone()))
                    .collect()
            };
            let number = EventScalar::Number;
            let string = |value: &str| EventScalar::Text(value.into());
            let mut fields = data(&[("projectileId", string(&self.shot))]);
            let staged = match self.phase {
                Phase::Physical => {
                    self.phase = Phase::System;
                    let Some(body) = self.body.as_deref() else {
                        continue;
                    };
                    fields.extend(data(&[
                        (
                            "contactLife",
                            number(self.body_life.map_or(-1.0, |n| n as f64)),
                        ),
                        ("incomingX", number(-direction.x)),
                        ("incomingY", number(-direction.y)),
                        ("incomingZ", number(-direction.z)),
                        ("contactInjury", EventScalar::Boolean(true)),
                        ("damage", number(self.loss)),
                        ("semanticTrigger", EventScalar::Boolean(true)),
                    ]));
                    let clause = if self.hit {
                        &words.contact_hit
                    } else {
                        &words.contact_stopped
                    };
                    let mut narration = subject(body, clause);
                    if self.known_source {
                        fields.insert("contactSourceId".into(), string(&flight.source_id));
                        fields.insert(
                            "contactSourceLife".into(),
                            number(flight.source_life as f64),
                        );
                        narration
                            .parts
                            .push(NarrationPart::Literal(words.contact_source.clone()));
                        narration.parts.push(NarrationPart::Participant {
                            entity_id: flight.source_id.clone(),
                            role: PersonRole::Object,
                            article: None,
                        });
                        narration.parts.push(NarrationPart::Literal(".".into()));
                    }
                    EventEmissionIntent {
                        event_type: occurrence.projectile_contact_event.clone(),
                        text: EmissionText::Narration(narration),
                        audience: AudienceSelection::Physical,
                        source_id: Some(body.into()),
                        target_id: Some(body.into()),
                        data: Some(fields),
                        scope: EventScope::External,
                        origin: Some(pos),
                        exposure: None,
                    }
                }
                Phase::System => {
                    self.phase = Phase::Personal;
                    fields.extend(data(&[
                        ("actionId", string(&flight.action_id)),
                        ("sourceLife", number(flight.source_life as f64)),
                        ("sourceId", string(&flight.source_id)),
                        ("sourceController", string(flight.source_controller.as_str())),
                        ("result", string(result)),
                        ("damage", number(self.loss)),
                        ("rawInjury", number(self.raw_injury)),
                        ("preventedInjury", number(self.prevented_injury)),
                        ("incomingX", number(-direction.x)),
                        ("incomingY", number(-direction.y)),
                        ("incomingZ", number(-direction.z)),
                        ("positionX", number(pos.x)),
                        ("positionY", number(pos.y)),
                        ("positionZ", number(pos.z)),
                        (
                            "targetLife",
                            number(flight.target_life.map_or(-1.0, |n| n as f64)),
                        ),
                        ("importance", number(8.0)),
                    ]));
                    if let Some(id) = flight.target_id.as_deref() {
                        fields.insert("intendedTargetId".into(), string(id));
                    }
                    if let Some(id) = self.body.as_deref().or(self.solid.as_deref()) {
                        fields.insert("interceptionId".into(), string(id));
                    }
                    if let Some(life) = self.body_life {
                        fields.insert("contactLife".into(), number(life as f64));
                    }
                    EventEmissionIntent {
                        event_type: words.projectile_ended.clone(),
                        text: EmissionText::Literal(words.terminated.clone()),
                        audience: AudienceSelection::Explicit(Vec::new()),
                        source_id: source.map(|source| source.id.clone()),
                        target_id: flight.target_id.clone(),
                        data: Some(fields),
                        scope: EventScope::System,
                        origin: Some(pos),
                        exposure: None,
                    }
                }
                Phase::Personal => {
                    self.phase = Phase::Retire;
                    let Some(source) = source else {
                        continue;
                    };
                    let mut narration;
                    let target_id = self
                        .body
                        .as_deref()
                        .filter(|_| self.seen)
                        .or(selected.filter(|_| self.saw_selected && self.saw_point));
                    fields.insert("actionId".into(), string(&flight.action_id));
                    fields.insert("semanticTrigger".into(), EventScalar::Boolean(true));
                    fields.insert(
                        "result".into(),
                        string(if self.seen {
                            result
                        } else if self.saw_point {
                            if self.body.is_some() || self.solid.is_some() {
                                "stopped"
                            } else {
                                "missed"
                            }
                        } else {
                            "unobserved"
                        }),
                    );
                    if let Some(body) = target_id {
                        let clause = if self.hit && self.seen {
                            &words.observed_hit
                        } else {
                            &words.observed_no_injury
                        };
                        narration = subject(&source.id, clause);
                        narration.parts.push(NarrationPart::Participant {
                            entity_id: body.into(),
                            role: PersonRole::Object,
                            article: None,
                        });
                        narration.parts.push(NarrationPart::Literal(".".into()));
                        if self.seen {
                            fields.insert("damage".into(), number(self.loss));
                            fields.insert("targetReference".into(), EventScalar::Boolean(true));
                        }
                    } else {
                        let clause = if self.saw_point {
                            if self.body.is_some() || self.solid.is_some() {
                                &words.observed_cover
                            } else {
                                &words.observed_range_end
                            }
                        } else {
                            &words.stopped
                        };
                        narration = subject(&source.id, clause);
                    }
                    EventEmissionIntent {
                        event_type: words.shot_ended.clone(),
                        text: EmissionText::Narration(narration),
                        audience: AudienceSelection::Explicit(vec![source.id.clone()]),
                        source_id: Some(source.id.clone()),
                        target_id: target_id.map(str::to_owned),
                        data: Some(fields),
                        scope: EventScope::Private,
                        origin: Some(pos),
                        exposure: None,
                    }
                }
                Phase::Retire => {
                    if (self.seen || self.saw_point && self.saw_selected)
                        && flight.practice
                        && source.is_some()
                    {
                        let exact = &flight.source_id;
                        let action = &flight.action_id;
                        let _names = budget.reserve(exact.len() + action.len())?;
                        let (source, action, life) =
                            (exact.clone(), action.clone(), flight.source_life);
                        let hit = self.seen && self.hit && self.body == flight.target_id;
                        core.record_observed_practice_contact(&source, life, &action, hit)?;
                    }
                    core.physical().retire_projectile(&self.shot)?;
                    return Ok(None);
                }
                _ => return Err(ExecutionError::Invariant),
            };
            let staged = core.stage_event(staged)?;
            self._storage.resize(
                self._storage
                    .bytes()
                    .checked_add(staged.id.len())
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            self.expected = Some(staged.id.clone());
            return Ok(Some(ProjectileSettleStep::Event(staged)));
        }
    }
}

fn stage_passage(
    core: &mut CoreMutation<'_>,
    id: &str,
    witness: PassageHit,
    budget: &ByteBudget,
) -> Result<Option<StagedOccurrence>, ExecutionError> {
    let Some(animal) = core.state.physical.entities.resolve(witness.key.animal).filter(|animal| {
        animal.actively_participates()
            && animal.physical_life() == Some(witness.key.life)
            && animal.actor.as_ref().is_some_and(|actor| actor.alive && actor.controller == "native")
    }) else {
        return Ok(None);
    };
    if core.state.installed.capabilities.capability_blocked(Some(animal), "perception")? {
        return Ok(None);
    }
    let life = animal.physical_life().ok_or(ExecutionError::Invariant)?;
    let native = animal.animal.as_ref().ok_or(ExecutionError::Invariant)?;
    let row = core.state.physical.projectiles.flights.get(id).ok_or(ExecutionError::Invariant)?;
    let direction = row.flight.direction;
    let installed = &core.state.installed;
    let words = &crate::native_controller::selected_profile(installed, native)?.presentation.projectile_passage;
    let event_type = &installed.occurrence_rules.value().projectile_passage_event;
    let bytes = animal.id.len().checked_mul(5).and_then(|bytes| {
        words.len().checked_mul(4)?.checked_add(bytes)?.checked_add(id.len())
                ?.checked_add(event_type.len())?.checked_add(1024)
    }).ok_or(ExecutionError::Capacity)?;
    let _stage = budget.reserve(bytes)?;
    let receiver = animal.id.clone();
    let narration = subject(&receiver, &JsText::from(words.as_str()));
    let event_type = event_type.clone();
    if !core.physical().record_projectile_passage(id, &receiver, life)? {
        return Ok(None);
    }
    // Only this exact animal saw the projectile. The shot's source is
    // deliberately absent from the event and the resulting danger region.
    core.stage_event(EventEmissionIntent {
        event_type,
        text: EmissionText::Narration(narration),
        audience: AudienceSelection::Explicit(vec![receiver.clone()]),
        source_id: Some(receiver.clone()),
        target_id: Some(receiver),
        data: Some([
            ("projectileId".into(), EventScalar::Text(id.into())),
            ("incomingX".into(), EventScalar::Number(-direction.x)),
            ("incomingY".into(), EventScalar::Number(-direction.y)),
            ("incomingZ".into(), EventScalar::Number(-direction.z)),
        ].into_iter().collect()),
        scope: EventScope::External,
        origin: Some(witness.origin),
        exposure: None,
    }).map(Some)
}

pub(super) fn subject(id: &str, clause: &JsText) -> Narration {
    Narration {
        parts: vec![
            NarrationPart::Participant {
                entity_id: id.into(),
                role: PersonRole::Subject,
                article: None,
            },
            NarrationPart::Literal(JsText::concat(&[&" ".into(), clause])),
        ],
    }
}
