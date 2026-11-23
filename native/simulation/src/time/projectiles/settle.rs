//! The interval prediction admits a clock boundary. Resolve its actual
//! contact after motion, with current physical participation and sight.
use super::*;
use super::passage::{PassageHit, PassageHits};
use crate::body::{
    BodyAnswer, BodyStep, HealthChangeCursor, ProjectileContact, ScarEffect, scar_factor,
};
use crate::events::{
    AudienceSelection, CompletedOccurrence, EmissionText, EventEmissionIntent, EventScope,
};
use crate::execution::StagedOccurrence;
use crate::geometry::MovementRayHit;
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
    order: Option<Vec<(String, usize)>>,
    next: usize,
    started: bool,
    tracks: Option<PassageTracks>,
    scan: Option<PassageScan>,
    passages: Option<PassageHits>,
    next_passage: usize,
    expected_passage: Option<String>,
    terminal: Option<Terminal>,
    _reservation: ByteReservation,
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum Phase {
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
        Self {
            horizon,
            seconds,
            solids,
            order: None,
            next: 0,
            started: false,
            tracks,
            scan: None,
            passages: None,
            next_passage: 0,
            expected_passage: None,
            terminal: None,
            _reservation: reservation,
        }
    }

    pub(in super::super) fn question(&self) -> Option<&GeometryQueries> {
        self.scan.as_ref().and_then(PassageScan::request).or_else(|| {
            self.terminal.as_ref()?.sight.as_ref().map(SightBatch::queries)
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
        binding: GeometryBinding,
        mut geometry: Option<GeometryAnswers>,
        mut event: Option<CompletedOccurrence>,
        budget: &ByteBudget,
    ) -> Result<ProjectileSettleStep, ExecutionError> {
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
                if geometry.is_some() || event.is_some() {
                    return Err(ExecutionError::UnfinishedOccurrence);
                }
                return Ok(ProjectileSettleStep::Done);
            };
            if !self.started {
                let solid = self.solids.get(*ordinal).and_then(Option::as_ref);
                self.terminal = self.advance_flight(core, id, solid, budget)?;
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
        let (point, travel) = flight.travel(self.seconds);
        let solid = solid.and_then(|hit| {
            let hit_at = hit.fraction * self.horizon.min(flight.remaining_range / flight.speed);
            (hit_at <= self.seconds + time_epsilon)
                .then(|| hit.collider_ids.iter().min())
                .flatten()
        });
        let after = flight.remaining_range - travel;
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
                let extent: Extent = candidate.ordinary_body_profile().into();
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
                    && solid.is_none_or(|other| candidate.id.as_str() < other.as_str())
                    && body.is_none_or(|prior: &Entity| candidate.id < prior.id)
                {
                    body = Some(candidate);
                }
                // Stable ties require the whole admitted local candidate set.
                false
            });
        core.journal.meters.charge(&[(WorkUnit::Tests, tested)])?;
        let origin_overlap = state
            .entities
            .get(&flight.source_id)
            .and_then(|source| {
                Some((
                    source,
                    source.world_position()?,
                    Extent::from(source.ordinary_body_profile()),
                ))
            })
            .is_some_and(|(source, origin, extent)| {
                source.physical_life() == Some(flight.source_life)
                    && moving_point_contact(point, point, origin, origin, extent).is_some()
            });
        let source_exited = flight.source_exited || !origin_overlap;
        let terminal = if body.is_some() || solid.is_some() || after <= space_epsilon {
            let _storage = budget.reserve(
                size_of::<Terminal>()
                    + 2 * id.len()
                    + body.map_or(0, |entry| entry.id.len())
                    + solid.map_or(0, |entry| entry.len()),
            )?;
            Some(Terminal {
                shot: id.into(),
                body: body.map(|entry| entry.id.clone()),
                solid: solid.filter(|_| body.is_none()).cloned(),
                body_life: body.and_then(Entity::physical_life),
                hit: false,
                seen: false,
                saw_selected: false,
                saw_point: false,
                known_source: false,
                phase: Phase::Sight,
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
        if self.seconds == 0.0 && terminal.is_none() {
            // This path was selected only for an exact zero-time hit. Non-hit
            // flights remain pending at that same cut.
            return Ok(None);
        }
        core.physical().set_projectile_progress(
            id,
            crate::projectile::FlightPosition {
                position: point,
                advanced_at: at,
                remaining_range: after,
                source_exited,
            },
        )?;
        Ok(terminal)
    }
}

impl Terminal {
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
                    let injury = flight.injury
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

fn subject(id: &str, clause: &JsText) -> Narration {
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
