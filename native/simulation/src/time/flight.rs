//! Air movement keeps its own finite leg and shares the normal clock,
//! physical placement writer, collision provider and occurrence journal.

use crate::events::{AudienceSelection, EmissionText, EventEmissionIntent, EventScope};
use crate::execution::{CoreMutation, ExecutionError, StagedOccurrence};
use crate::flight::{Corridor, FlightContinuation, FlightProgress, FlightWaypoint};
use crate::geometry::{
    FlightSegment, GeometryAnswers, GeometryBinding, GeometryQueries, StandingQuery,
};
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation};
use crate::simulation::{InstalledWorld, PhysicalState};
use crate::spatial::{distance, interpolate};
use crate::state::{Entity, EntityHandle, Named, Placement, Point, SurfacePoint};
use crate::worlds::base_cognition::FlightRules;
use std::mem::size_of;

fn rules(installed: &InstalledWorld) -> Result<&FlightRules, ExecutionError> {
    installed
        .occurrence_rules
        .value()
        .flight
        .as_ref()
        .ok_or(ExecutionError::UnsupportedFamily)
}

pub(super) fn motion_reach(
    installed: &InstalledWorld,
    entity: &Entity,
    seconds: f64,
) -> Result<Option<f64>, ExecutionError> {
    if entity.spatial.fall_velocity.is_some() {
        return Ok(Some(rules(installed)?.terminal_fall_speed * seconds));
    }
    let Some(flight) = entity.spatial.flight.as_ref() else {
        return Ok(None);
    };
    if !can_advance(entity, installed)?
        || flight.at_rest.is_some()
        || flight.awaiting_choice.is_some()
    {
        return Ok(Some(0.0));
    }
    // Correlated corridors retain the same body. A joined corridor may have
    // a faster authored rate before the end of this same broad read window.
    let routes = &installed.retained.flight_corridors;
    let mut route = corridor(installed, flight)?;
    let mut speed: f64 = 0.0;
    for _ in 0..routes.len() {
        speed = speed.max(route.speed);
        let FlightContinuation::Join { route_id, .. } = &route.continuation else {
            break;
        };
        route = routes.get(route_id).ok_or(ExecutionError::Invariant)?;
    }
    Ok(Some(speed * seconds))
}

fn corridor<'a>(
    installed: &'a InstalledWorld,
    flight: &FlightProgress,
) -> Result<&'a Corridor, ExecutionError> {
    installed
        .retained
        .flight_corridors
        .get(&flight.route_id)
        .ok_or(ExecutionError::Invariant)
}

fn support(entity: &Entity) -> Option<&str> {
    match &entity.placement {
        Some(Placement::World {
            support_surface_id, ..
        }) => support_surface_id.as_deref(),
        _ => None,
    }
}

fn can_advance(entity: &Entity, installed: &InstalledWorld) -> Result<bool, ExecutionError> {
    Ok(entity
        .actor
        .as_ref()
        .is_some_and(|actor| actor.alive && !actor.incapacitated && actor.action.is_none())
        && entity.actively_participates()
        && !installed
            .capabilities
            .capability_blocked(Some(entity), "locomotion")?
        && !(support(entity).is_some()
            && entity
                .animal
                .as_ref()
                .is_some_and(|animal| animal.episode.is_some())))
}

fn travel(route: &Corridor, from: Point, target: Point) -> f64 {
    let horizontal_and_vertical = distance(from, target) / route.speed;
    horizontal_and_vertical.max((target.y - from.y).abs() / route.climb_speed)
}

fn below(installed: &InstalledWorld, point: Point) -> Option<(f64, &str)> {
    let epsilon = installed.spatial.epsilon;
    // Authored supports are finite and retained in canonical order. A tying
    // patch keeps the same first owner as Source's support column selection.
    let mut selected = None;
    for surface in &installed.geometry.spatial.surfaces {
        if point.x >= surface.min_x - epsilon
            && point.x <= surface.max_x + epsilon
            && point.z >= surface.min_z - epsilon
            && point.z <= surface.max_z + epsilon
        {
            let y = surface.y
                + (point.x - surface.min_x) * surface.slope_x
                + (point.z - surface.min_z) * surface.slope_z;
            if y <= point.y + epsilon && selected.is_none_or(|(previous, _)| y > previous) {
                selected = Some((y, surface.id.as_str()));
            }
        }
    }
    selected
}

fn falling(rules: &FlightRules, velocity: f64, seconds: f64) -> f64 {
    let speed = (-velocity).clamp(0.0, rules.terminal_fall_speed);
    let accelerating = seconds.min((rules.terminal_fall_speed - speed) / rules.fall_acceleration);
    speed * accelerating
        + rules.fall_acceleration * accelerating * accelerating / 2.0
        + rules.terminal_fall_speed * (seconds - accelerating)
}

fn fall_time(rules: &FlightRules, velocity: f64, distance: f64) -> f64 {
    let speed = (-velocity).clamp(0.0, rules.terminal_fall_speed);
    let accelerating = (rules.terminal_fall_speed - speed) / rules.fall_acceleration;
    let accelerated = (speed + rules.terminal_fall_speed) * accelerating / 2.0;
    if distance <= accelerated {
        ((speed * speed + 2.0 * rules.fall_acceleration * distance).sqrt() - speed)
            / rules.fall_acceleration
    } else {
        accelerating + (distance - accelerated) / rules.terminal_fall_speed
    }
}

pub(super) fn boundary(
    physical: &PhysicalState,
    installed: &InstalledWorld,
    flyers: &[EntityHandle],
    forecast: &super::MechanicalForecast,
    requested: f64,
) -> Result<f64, ExecutionError> {
    let mut bound = requested;
    for handle in flyers {
        let entity = physical
            .entities
            .resolve(*handle)
            .ok_or(ExecutionError::Invariant)?;
        let point = entity
            .world_position()
            .ok_or(ExecutionError::InvalidPosition)?;
        let travel_limit = forecast.travel_for(*handle);
        if let Some(velocity) = entity.spatial.fall_velocity {
            let distance = below(installed, point).map_or(travel_limit, |(y, _)| {
                travel_limit.min((point.y - y).max(0.0))
            });
            bound = bound.min(fall_time(rules(installed)?, velocity, distance));
            continue;
        }
        if let Some(flight) = &entity.spatial.flight
            && can_advance(entity, installed)?
            && flight.at_rest.is_none()
            && flight.awaiting_choice.is_none()
        {
            if flight.wait_seconds > 0.0 {
                bound = bound.min(flight.wait_seconds);
            } else if support(entity).is_none() {
                let route = corridor(installed, flight)?;
                let target = route
                    .points
                    .get(flight.next)
                    .ok_or(ExecutionError::Invariant)?;
                let separation = distance(point, target.position);
                let duration = travel(route, point, target.position);
                bound = bound.min(duration * (travel_limit / separation).min(1.0));
            }
        }
    }
    Ok(bound.max(installed.time_epsilon).min(requested))
}

pub(super) struct FlightCursor {
    next: usize,
    seconds: f64,
    pending: Option<FlightLeg>,
}

struct FlightLeg {
    questions: GeometryQueries,
    destination: Point,
    arrived: bool,
    _storage: ByteReservation,
}

pub(super) enum FlightStep {
    Geometry,
    Event(StagedOccurrence),
    Done,
}

impl FlightCursor {
    pub(super) fn new(seconds: f64) -> Self {
        Self {
            next: 0,
            seconds,
            pending: None,
        }
    }

    pub(super) fn questions(&self) -> Option<&GeometryQueries> {
        self.pending.as_ref().map(|flight| &flight.questions)
    }

    pub(super) fn step(
        &mut self,
        core: &mut CoreMutation<'_>,
        flyers: &[EntityHandle],
        binding: GeometryBinding,
        mut answers: Option<GeometryAnswers>,
        budget: &ByteBudget,
    ) -> Result<FlightStep, ExecutionError> {
        while let Some(&handle) = flyers.get(self.next) {
            let entity = core
                .state
                .physical
                .entities
                .resolve(handle)
                .ok_or(ExecutionError::Invariant)?;
            let Some(position) = entity.world_position() else {
                return Err(ExecutionError::InvalidPosition);
            };
            if let Some(plan) = self.pending.take() {
                let answer = answers.take().ok_or(ExecutionError::Invariant)?;
                plan.questions
                    .validate_answers(&answer)
                    .map_err(|_| ExecutionError::InvalidPosition)?;
                self.next += 1;
                if !answer.flight[0] || answer.standing.first() == Some(&false) {
                    continue;
                }
                let flight = entity
                    .spatial
                    .flight
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?;
                let route = corridor(&core.state.installed, flight)?;
                let target = route
                    .points
                    .get(flight.next)
                    .ok_or(ExecutionError::Invariant)?;
                if target.landing_surface_id.is_some()
                    && blocked_landing(core, handle, target.position, entity)
                {
                    continue;
                }
                let _id = budget.reserve(entity.id.len())?;
                let id = entity.id.clone();
                if self.seconds == 0.0 {
                    core.physical().set_flight_position(&id, position, None)?;
                    return Ok(FlightStep::Event(occurrence(
                        core,
                        handle,
                        FlightEvent::Takeoff,
                        budget,
                    )?));
                }
                let next = plan
                    .arrived
                    .then(|| after_waypoint(flight, route, budget))
                    .transpose()?;
                let guarded_landing = plan
                    .arrived
                    .then_some(target.landing_surface_id.as_deref())
                    .flatten();
                let _surface = budget.reserve(guarded_landing.map_or(0, str::len))?;
                let surface = guarded_landing.map(str::to_owned);
                let landed = surface.is_some();
                core.physical()
                    .set_flight_position(&id, plan.destination, surface)?;
                if let Some((next, _held)) = next {
                    core.physical().replace_flight(handle, Some(next), None)?;
                }
                if landed {
                    return Ok(FlightStep::Event(occurrence(
                        core,
                        handle,
                        FlightEvent::Landing,
                        budget,
                    )?));
                }
                continue;
            }
            if answers.is_some() {
                return Err(ExecutionError::Invariant);
            }
            if let Some(velocity) = entity.spatial.fall_velocity {
                self.next += 1;
                if self.seconds > 0.0 {
                    if let Some(event) = advance_fall(core, handle, velocity, self.seconds, budget)?
                    {
                        return Ok(FlightStep::Event(event));
                    }
                }
                continue;
            }
            let Some(flight) = &entity.spatial.flight else {
                self.next += 1;
                continue;
            };
            if support(entity).is_none()
                && !entity
                    .actor
                    .as_ref()
                    .is_some_and(|actor| actor.alive && !actor.incapacitated)
            {
                core.physical().replace_flight(handle, None, Some(0.0))?;
                self.next += 1;
                continue;
            }
            if !can_advance(entity, &core.state.installed)? || flight.awaiting_choice.is_some() {
                self.next += 1;
                continue;
            }
            if flight.native_locomotion.is_some() {
                return Err(ExecutionError::UnsupportedFamily);
            }
            let route = corridor(&core.state.installed, flight)?;
            if flight.at_rest.is_some() {
                if self.seconds == 0.0
                    && flight.stop_at_landing.is_none()
                    && let FlightContinuation::Land {
                        resume_route_id: Some(resume),
                    } = &route.continuation
                {
                    let (mut next, _held) = copy_progress(flight, resume.len(), budget)?;
                    next.route_id = resume.clone();
                    next.at_rest = None;
                    next.next = 1;
                    core.physical().replace_flight(handle, Some(next), None)?;
                    continue;
                }
                self.next += 1;
                continue;
            }
            if flight.wait_seconds > 0.0 {
                if self.seconds > 0.0 {
                    let (mut next, _held) = copy_progress(flight, 0, budget)?;
                    let remaining = next.wait_seconds - self.seconds;
                    next.wait_seconds = if remaining > core.state.installed.time_epsilon {
                        remaining
                    } else {
                        0.0
                    };
                    core.physical().replace_flight(handle, Some(next), None)?;
                }
                self.next += 1;
                continue;
            }
            let grounded = support(entity).is_some();
            if grounded != (self.seconds == 0.0) {
                self.next += 1;
                continue;
            }
            let target = route
                .points
                .get(flight.next)
                .ok_or(ExecutionError::Invariant)?;
            let duration = travel(route, position, target.position);
            let arrived = self.seconds > 0.0 && duration <= self.seconds;
            let fraction = if grounded {
                (0.001 / distance(position, target.position)).min(1.0)
            } else if arrived {
                1.0
            } else {
                self.seconds / duration
            };
            let destination = interpolate(position, target.position, fraction);
            self.pending = Some(prepare_leg(
                entity,
                target,
                position,
                destination,
                arrived,
                binding,
                budget,
            )?);
            return Ok(FlightStep::Geometry);
        }
        if answers.is_some() {
            return Err(ExecutionError::Invariant);
        }
        Ok(FlightStep::Done)
    }
}

fn prepare_leg(
    entity: &Entity,
    target: &FlightWaypoint,
    from: Point,
    destination: Point,
    arrived: bool,
    binding: GeometryBinding,
    budget: &ByteBudget,
) -> Result<FlightLeg, ExecutionError> {
    let body = entity.body_profile();
    let departure = support(entity);
    let landing = target.landing_surface_id.as_deref();
    let bytes = heap_sum([
        size_of::<FlightLeg>(),
        size_of::<FlightSegment>(),
        size_of::<StandingQuery>(),
        2 * size_of::<String>(),
        2 * body.id.len(),
        departure.map_or(0, str::len),
        2 * landing.map_or(0, str::len),
    ])
    .ok_or(ExecutionError::Capacity)?;
    let storage = budget.reserve(bytes)?;
    let mut questions = GeometryQueries::new(binding);
    questions.flight.push(FlightSegment {
        from,
        to: destination,
        body: body.as_ref().clone(),
        supports: departure
            .into_iter()
            .chain(landing)
            .map(str::to_owned)
            .collect(),
    });
    if let Some(surface_id) = landing {
        questions.standing.push(StandingQuery {
            point: SurfacePoint {
                x: target.position.x,
                y: target.position.y,
                z: target.position.z,
                surface_id: surface_id.to_owned(),
            },
            body: body.as_ref().clone(),
        });
    }
    Ok(FlightLeg {
        questions,
        destination,
        arrived,
        _storage: storage,
    })
}

fn copy_progress(
    flight: &FlightProgress,
    growth: usize,
    budget: &ByteBudget,
) -> Result<(FlightProgress, ByteReservation), ExecutionError> {
    let held = budget.reserve(
        flight
            .heap_bytes()
            .and_then(|bytes| bytes.checked_add(growth))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    Ok((flight.clone(), held))
}

fn after_waypoint(
    flight: &FlightProgress,
    route: &Corridor,
    budget: &ByteBudget,
) -> Result<(FlightProgress, ByteReservation), ExecutionError> {
    let growth = match &route.continuation {
        FlightContinuation::Join { route_id, .. } => route_id.len(),
        _ => 0,
    };
    let (mut next, held) = copy_progress(flight, growth, budget)?;
    let waypoint = route
        .points
        .get(flight.next)
        .ok_or(ExecutionError::Invariant)?;
    next.wait_seconds = waypoint.wait_seconds;
    if flight.stop_at_landing.is_some() && waypoint.landing_surface_id.is_some() {
        next.at_rest = Some(true);
        next.wait_seconds = 0.0;
    } else if flight.next + 1 < route.points.len() {
        next.next += 1;
    } else {
        match &route.continuation {
            FlightContinuation::Loop => {
                next.next = 0;
            }
            FlightContinuation::Land { .. } => next.at_rest = Some(true),
            FlightContinuation::Join {
                route_id,
                next: waypoint,
            } => {
                next.route_id = route_id.clone();
                next.next = *waypoint;
            }
        }
    }
    Ok((next, held))
}

fn blocked_landing(
    core: &CoreMutation<'_>,
    own: EntityHandle,
    point: Point,
    entity: &Entity,
) -> bool {
    let body = entity.body_profile();
    let epsilon = core.state.installed.spatial.epsilon;
    let physical = &core.state.physical;
    physical.bodies.any_body(
        point,
        body.height.max(body.radius) + physical.bodies.maximum_extent(),
        |handle| {
            if handle == own {
                return false;
            }
            let Some(other) = physical.entities.resolve(handle) else {
                return false;
            };
            if !other.actor.as_ref().is_some_and(|actor| actor.alive)
                || !other.actively_participates()
            {
                return false;
            }
            let Some(position) = other.world_position() else {
                return false;
            };
            let other_body = other.body_profile();
            position.y < point.y + body.height - epsilon
                && position.y + other_body.height > point.y + epsilon
                && (position.x - point.x).hypot(position.z - point.z)
                    < body.radius + other_body.radius
        },
    )
}

fn advance_fall(
    core: &mut CoreMutation<'_>,
    handle: EntityHandle,
    velocity: f64,
    seconds: f64,
    budget: &ByteBudget,
) -> Result<Option<StagedOccurrence>, ExecutionError> {
    let entity = core
        .state
        .physical
        .entities
        .resolve(handle)
        .ok_or(ExecutionError::Invariant)?;
    let point = entity
        .world_position()
        .ok_or(ExecutionError::InvalidPosition)?;
    let rules = rules(&core.state.installed)?;
    let y = point.y - falling(rules, velocity, seconds);
    let lower = below(&core.state.installed, point)
        .filter(|(height, _)| y <= *height + core.state.installed.spatial.epsilon);
    if lower.is_none() && y < rules.minimum_fall_height {
        return Err(ExecutionError::InvalidPosition);
    }
    let _storage =
        budget.reserve(entity.id.len() + lower.map_or(0, |(_, surface)| surface.len()))?;
    let id = entity.id.clone();
    let (next, surface, fall) = match lower {
        Some((height, surface)) => (Point { y: height, ..point }, Some(surface.to_owned()), None),
        None => (
            Point { y, ..point },
            None,
            Some((velocity - rules.fall_acceleration * seconds).max(-rules.terminal_fall_speed)),
        ),
    };
    core.physical().set_flight_position(&id, next, surface)?;
    core.physical().replace_flight(handle, None, fall)?;
    fall.is_none()
        .then(|| occurrence(core, handle, FlightEvent::Fall, budget))
        .transpose()
}

enum FlightEvent {
    Takeoff,
    Landing,
    Fall,
}

fn occurrence(
    core: &mut CoreMutation<'_>,
    handle: EntityHandle,
    event: FlightEvent,
    budget: &ByteBudget,
) -> Result<StagedOccurrence, ExecutionError> {
    use crate::narration::{NameArticle, name_phrase};
    let entity = core
        .state
        .physical
        .entities
        .resolve(handle)
        .ok_or(ExecutionError::Invariant)?;
    let rules = rules(&core.state.installed)?;
    let (event_type, suffix) = match event {
        FlightEvent::Takeoff => (&rules.takeoff_event, &rules.takeoff_suffix),
        FlightEvent::Landing => (&rules.landing_event, &rules.landing_before_surface),
        FlightEvent::Fall => (&rules.landing_event, &rules.fall_suffix),
    };
    let surface = if matches!(event, FlightEvent::Landing) {
        let id = support(entity).ok_or(ExecutionError::InvalidPosition)?;
        Some(
            core.state
                .installed
                .geometry
                .spatial
                .surfaces
                .iter()
                .find(|surface| surface.id == id)
                .ok_or(ExecutionError::InvalidPosition)?,
        )
    } else {
        None
    };
    let bytes = heap_sum([
        entity.name.storage_bytes(),
        entity.id.len(),
        event_type.len(),
        suffix.storage_bytes(),
        surface.map_or(0, |surface| surface.name.len()),
        128,
    ])
    .ok_or(ExecutionError::Capacity)?;
    let _storage = budget.reserve(bytes.checked_mul(4).ok_or(ExecutionError::Capacity)?)?;
    let name = Named {
        name: entity.name.clone(),
        name_form: entity.name_form.clone(),
        indefinite_article: entity.indefinite_article.clone(),
    };
    let mut text = name_phrase(&name, NameArticle::Definite, true);
    text.push_text(suffix);
    if let Some(surface) = surface {
        let name = Named {
            name: surface.name.as_str().into(),
            name_form: None,
            indefinite_article: None,
        };
        let label = name_phrase(&name, NameArticle::Definite, false);
        text.push_text(&label);
        text.push_str(".");
    }
    core.stage_event(EventEmissionIntent {
        event_type: event_type.clone(),
        text: EmissionText::Literal(text),
        audience: AudienceSelection::Physical,
        source_id: Some(entity.id.clone()),
        target_id: None,
        data: None,
        scope: EventScope::External,
        origin: None,
        exposure: None,
    })
}
