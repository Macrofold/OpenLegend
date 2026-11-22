//! The selected alarm controller can prepare a finite existing air corridor.
//! Nothing here grants movement: the ordinary flight cursor owns each sweep,
//! landing, elapsed interval and occurrence.
use super::selected_profile;
use crate::execution::{CoreMutation, ExecutionError};
use crate::flight::{FlightConnection, FlightConnectionKind, FlightContinuation};
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries};
use crate::host::{ByteBudget, ByteReservation, CandidateKey};
use crate::movement::{PathClearanceCursor, PathClearanceStep};
use crate::native_danger::DangerAssessment;
use crate::native_refuge::{danger_separation, route_danger_separation_points};
use crate::spatial::{Extent, distance};
use crate::state::Point;
use crate::work::WorkUnit;
use std::mem::size_of;
mod geometry;
mod reaction;
use geometry::AirGeometry;
pub(crate) use reaction::separation_is_clear;
use reaction::{commit, defer, next_review, no_usable_flight, settle_or_wait};

#[derive(Clone, Copy)]
struct Edge<'a> {
    connection: &'a FlightConnection,
    retained: bool,
}

#[derive(Clone)]
struct Choice {
    connection: FlightConnection,
    retained: bool,
    destination: Point,
    label: String,
    length: f64,
    worsening: f64,
    margin: f64,
}

pub(super) enum AerialStep {
    Geometry,
    Ground,
    Handled,
}
pub(super) enum AerialPreparation {
    Ground,
    Handled,
    Ready(AerialTurn),
}

pub(super) struct AerialTurn {
    candidate: CandidateKey,
    root: String,
    edge: usize,
    retained: Option<FlightConnection>,
    geometry: Option<AirGeometry>,
    sweep: Option<PathClearanceCursor>,
    choices: Vec<Choice>,
    _storage: ByteReservation,
}
impl AerialTurn {
    pub(super) fn prepare(
        core: &mut CoreMutation<'_>,
        id: &str,
        frame: &DangerAssessment,
        candidate: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<AerialPreparation, ExecutionError> {
        let entity = core
            .state
            .physical
            .entities
            .get(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let state = entity.animal.as_ref().ok_or(ExecutionError::Invariant)?;
        let episode = state.episode.as_ref().ok_or(ExecutionError::Invariant)?;
        let flight = entity.spatial.flight.as_ref();
        if flight.is_none() && episode.aerial_route_id.is_none() {
            return Ok(AerialPreparation::Ground);
        }
        frame.require_current(&core.state.physical, id)?;
        let installed = core.state.installed.clone();
        let profile = selected_profile(&installed, state)?;
        if profile
            .locomotion
            .get(&episode.locomotion)
            .and_then(|rate| rate.flight_escape)
            .is_none()
        {
            // Without an installed escape-flight rate, finish any released routine
            // air leg. Once supported, the ordinary ground response owns escape.
            if flight.is_some() {
                if entity.supported_position().is_none() {
                    defer(core, id, profile.review_seconds)?;
                    return Ok(AerialPreparation::Handled);
                }
                let handle = core
                    .state
                    .physical
                    .entities
                    .handle(id)
                    .ok_or(ExecutionError::MissingEntity)?;
                let mut mutation = core.physical();
                mutation.replace_flight(handle, None, None)?;
                mutation.behavior_changed(id, false)?;
            }
            return Ok(AerialPreparation::Ground);
        }
        if settle_or_wait(core, id, frame)? {
            return Ok(AerialPreparation::Handled);
        }
        let entity = core
            .state
            .physical
            .entities
            .get(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let flight = entity.spatial.flight.as_ref();
        let state = entity.animal.as_ref().ok_or(ExecutionError::Invariant)?;
        let episode = state.episode.as_ref().ok_or(ExecutionError::Invariant)?;
        let root = flight
            .map(|f| &f.route_id)
            .or(episode.aerial_route_id.as_ref())
            .ok_or(ExecutionError::Invariant)?;
        let routes = &installed.retained.flight_corridors;
        let authored = routes
            .get(root)
            .and_then(|corridor| corridor.response_connections.as_ref());
        let prior = flight.filter(|f| f.at_rest.is_none() && f.awaiting_choice.is_none());
        let bytes = root.len() + prior.map_or(0, |prior| prior.route_id.len());
        // Own the exact Source's ordered JSON connection label per candidate.
        let edge_bytes = |route: &str| route.len().checked_mul(8)?.checked_add(96);
        let count = authored
            .map_or(0, Vec::len)
            .checked_add(usize::from(prior.is_some()))
            .ok_or(ExecutionError::Capacity)?;
        let bytes = authored
            .into_iter()
            .flatten()
            .try_fold(bytes, |bytes, edge| {
                bytes.checked_add(edge_bytes(&edge.route_id)?)
            })
            .and_then(|bytes| {
                bytes.checked_add(prior.map_or(Some(0), |prior| edge_bytes(&prior.route_id))?)
            })
            .and_then(|bytes| bytes.checked_add(count.checked_mul(size_of::<Choice>())?))
            .ok_or(ExecutionError::Capacity)?;
        let storage = budget.reserve(bytes)?;
        let retained = prior.map(|f| FlightConnection {
            kind: if f
                .native_locomotion
                .as_ref()
                .and_then(|binding| binding.stop_at)
                .is_none()
                && routes.get(&f.route_id).is_some_and(|route| {
                    matches!(route.continuation, FlightContinuation::Land { .. })
                }) {
                FlightConnectionKind::Landing
            } else {
                FlightConnectionKind::Transit
            },
            route_id: f.route_id.clone(),
            next: f.next,
        });
        Ok(AerialPreparation::Ready(Self {
            candidate,
            root: root.clone(),
            edge: 0,
            retained,
            geometry: None,
            sweep: None,
            choices: Vec::with_capacity(count),
            _storage: storage,
        }))
    }

    pub(super) fn geometry_request(&self) -> Option<&GeometryQueries> {
        self.sweep
            .as_ref()
            .and_then(PathClearanceCursor::geometry_request)
            .or_else(|| self.geometry.as_ref().and_then(AirGeometry::request))
    }

    pub(super) fn step(
        &mut self,
        core: &mut CoreMutation<'_>,
        id: &str,
        frame: &DangerAssessment,
        mut answer: Option<GeometryAnswers>,
        budget: &ByteBudget,
    ) -> Result<AerialStep, ExecutionError> {
        frame.require_current(&core.state.physical, id)?;
        let installed = core.state.installed.clone();
        let authored = installed
            .retained
            .flight_corridors
            .get(&self.root)
            .and_then(|route| route.response_connections.as_deref())
            .unwrap_or_default();
        loop {
            let edge = if let Some(retained) = &self.retained
                && self.edge == 0
            {
                Some(Edge {
                    connection: retained,
                    retained: true,
                })
            } else {
                authored
                    .get(self.edge - usize::from(self.retained.is_some()))
                    .map(|edge| Edge {
                        connection: edge,
                        retained: false,
                    })
            };
            let Some(edge) = edge else {
                break;
            };
            if self.geometry.is_none() {
                let binding = GeometryBinding::new(
                    self.candidate,
                    installed.geometry.spatial.revision,
                    core.journal.next_provider_serial()?,
                );
                self.geometry = AirGeometry::prepare(
                    core,
                    id,
                    frame,
                    edge.connection,
                    edge.retained,
                    binding,
                    budget,
                )?;
                if self.geometry.is_none() {
                    self.edge += 1;
                    continue;
                }
            }
            let geometry = self.geometry.as_mut().ok_or(ExecutionError::Invariant)?;
            if !geometry.finished() {
                match geometry.step(core, self.candidate, answer.take(), budget)? {
                    None => return Ok(AerialStep::Geometry),
                    Some(false) => {
                        self.geometry = None;
                        self.edge += 1;
                        continue;
                    }
                    Some(true) => {}
                }
            }
            if self.sweep.is_none() {
                self.sweep = Some(PathClearanceCursor::prepare(
                    id,
                    geometry.origin,
                    geometry.points.len(),
                    self.candidate,
                    budget,
                )?);
            }
            let sweep = self.sweep.as_mut().ok_or(ExecutionError::Invariant)?;
            match sweep.step_air(core, &geometry.points, answer.take(), budget)? {
                PathClearanceStep::Geometry(_) => return Ok(AerialStep::Geometry),
                PathClearanceStep::Complete(result) if result.clear() => {
                    if let Some(choice) = score(core, id, frame, edge, geometry)? {
                        self.choices.push(choice);
                    }
                }
                PathClearanceStep::Complete(_) => {}
            }
            self.sweep = None;
            self.geometry = None;
            self.edge += 1;
        }
        self.finish(core, id, frame, budget)
    }

    fn finish(
        &mut self,
        core: &mut CoreMutation<'_>,
        id: &str,
        frame: &DangerAssessment,
        budget: &ByteBudget,
    ) -> Result<AerialStep, ExecutionError> {
        let installed = core.state.installed.clone();
        let entity = core
            .state
            .physical
            .entities
            .get(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let state = entity.animal.as_ref().ok_or(ExecutionError::Invariant)?;
        let episode = state.episode.as_ref().ok_or(ExecutionError::Invariant)?;
        let profile = selected_profile(&installed, state)?;
        let epsilon = installed.spatial.epsilon;
        let origin = entity
            .world_position()
            .ok_or(ExecutionError::InvalidPosition)?;
        let direction = episode
            .acoustic_cue
            .as_ref()
            .map(|cue| &cue.sound.direction);
        let retain = direction.is_none_or(|direction| {
            episode
                .refuge
                .as_ref()
                .and_then(|refuge| refuge.acoustic_direction.as_ref())
                .unwrap_or(&None)
                == direction
        });
        // The Source comparator considers supported safe landings before transit
        // and canonicalizes physically identical destinations.
        if self
            .choices
            .iter()
            .any(|c| c.connection.kind == FlightConnectionKind::Landing)
        {
            self.choices
                .retain(|c| c.connection.kind == FlightConnectionKind::Landing);
        }
        let mut n = 0;
        while n < self.choices.len() {
            let chosen = &self.choices[n];
            if let Some(prior) = self.choices[..n].iter().position(|other| {
                other.destination == chosen.destination
                    && landing_surface(&installed, other) == landing_surface(&installed, chosen)
            }) {
                let previous = &self.choices[prior];
                if chosen.retained
                    || (!previous.retained
                        && (chosen.worsening < previous.worsening - epsilon
                            || ((chosen.worsening - previous.worsening).abs() <= epsilon
                                && chosen.length < previous.length)))
                {
                    self.choices.swap(prior, n);
                }
                self.choices.remove(n);
            } else {
                n += 1;
            }
        }
        self.choices
            .sort_by(|left, right| crate::encoding::js_string_cmp(&left.label, &right.label));
        let Some(best) = self.choices.iter().reduce(|best, c| {
            if (c.worsening - best.worsening).abs() > epsilon {
                if c.worsening < best.worsening {
                    c
                } else {
                    best
                }
            } else if c.margin > best.margin {
                c
            } else {
                best
            }
        }) else {
            return no_usable_flight(core, id, &self.root);
        };
        let (worsening, margin) = (best.worsening, best.margin);
        let held = retain
            .then(|| self.choices.iter().position(|c| c.retained))
            .flatten()
            .filter(|index| {
                let c = &self.choices[*index];
                std::ptr::eq(c, best)
                    || !(worsening < c.worsening - epsilon
                        || ((worsening - c.worsening).abs() <= epsilon
                            && margin >= -epsilon
                            && c.margin < -epsilon))
                        && margin < c.margin + profile.candidates.continuity_improvement - epsilon
            });
        if let Some(index) = held {
            if entity
                .spatial
                .flight
                .as_ref()
                .and_then(|f| f.native_locomotion.as_ref())
                .is_some()
            {
                let next =
                    next_review(episode, profile, frame, core.state.physical.header.sim_time);
                let mut mutation = core.physical();
                mutation
                    .snapshot_episode(id)?
                    .as_mut()
                    .ok_or(ExecutionError::Invariant)?
                    .review_at = next;
                mutation.animal_clock_changed(id)?;
                return Ok(AerialStep::Handled);
            }
            self.choices.swap(0, index);
            self.choices.truncate(1);
        } else {
            self.choices.retain(|c| {
                (!c.retained || !retain)
                    && (c.worsening - worsening).abs() <= epsilon
                    && (c.margin >= -epsilon) == (margin >= -epsilon)
                    && c.margin >= margin - profile.candidates.tie_margin - epsilon
            });
            if let Some(Some(direction)) = direction {
                let angle = direction.sector as f64 * std::f64::consts::FRAC_PI_4;
                let away = |c: &Choice| {
                    -(c.destination.x - origin.x) * angle.cos()
                        - (c.destination.z - origin.z) * angle.sin()
                };
                let best = self
                    .choices
                    .iter()
                    .map(away)
                    .fold(f64::NEG_INFINITY, f64::max);
                self.choices.retain(|c| away(c) >= best - epsilon);
            }
        }
        if self.choices.is_empty() {
            return no_usable_flight(core, id, &self.root);
        }
        let draw = (self.choices.len() > 1).then(|| core.physical().draw());
        let weight = |c: &Choice| 1.0 / (1.0 + c.length / profile.candidates.distance_weight_scale);
        let mut remainder = draw.unwrap_or(0.0) * self.choices.iter().map(weight).sum::<f64>();
        let choice = self
            .choices
            .iter()
            .find(|c| {
                remainder -= weight(c);
                remainder < 0.0
            })
            .or_else(|| self.choices.last())
            .ok_or(ExecutionError::Invariant)?;
        commit(core, id, choice, draw, budget)?;
        Ok(AerialStep::Handled)
    }
}

fn landing_surface<'a>(
    installed: &'a crate::simulation::InstalledWorld,
    choice: &Choice,
) -> Option<&'a str> {
    if choice.connection.kind != FlightConnectionKind::Landing {
        return None;
    }
    installed
        .retained
        .flight_corridors
        .get(&choice.connection.route_id)?
        .points
        .last()?
        .landing_surface_id
        .as_deref()
}

fn score(
    core: &mut CoreMutation<'_>,
    id: &str,
    frame: &DangerAssessment,
    edge: Edge<'_>,
    geometry: &AirGeometry,
) -> Result<Option<Choice>, ExecutionError> {
    let installed = &core.state.installed;
    let entity = core
        .state
        .physical
        .entities
        .get(id)
        .ok_or(ExecutionError::MissingEntity)?;
    let state = entity.animal.as_ref().ok_or(ExecutionError::Invariant)?;
    let episode = state.episode.as_ref().ok_or(ExecutionError::Invariant)?;
    let profile = selected_profile(installed, state)?;
    let body = entity.body_profile();
    let extent = Extent {
        radius: body.radius,
        height: body.height,
    };
    let at = core.state.physical.header.sim_time;
    let clear = profile.avoidance_distance + profile.clearance_margin;
    let epsilon = installed.spatial.epsilon;
    let destination = *geometry.points.last().ok_or(ExecutionError::Invariant)?;
    let mut worsening: f64 = 0.0;
    let mut margin = profile.candidates.arrival_margin_cap;
    for key in &frame.records {
        let danger = episode.dangers.get(key).ok_or(ExecutionError::Invariant)?;
        core.journal.meters.charge(&[(WorkUnit::Tests, 1)])?;
        let start = danger_separation(geometry.origin, extent, danger, profile, at);
        let minimum = route_danger_separation_points(
            geometry.origin,
            geometry.points.iter().copied(),
            extent,
            danger,
            profile,
            at,
            epsilon,
            &mut core.journal.meters,
        )?;
        worsening = worsening.max(start.min(clear) - minimum - profile.candidates.worsening_slack);
        margin = margin.min(danger_separation(destination, extent, danger, profile, at) - clear);
    }
    if edge.connection.kind == FlightConnectionKind::Landing && margin < -epsilon {
        return Ok(None);
    }
    Ok(Some(Choice {
        connection: edge.connection.clone(),
        retained: edge.retained,
        destination,
        label: crate::encoding::json_record(&(
            match edge.connection.kind {
                FlightConnectionKind::Landing => "landing",
                FlightConnectionKind::Transit => "transit",
            },
            edge.connection.route_id.as_str(),
            edge.connection.next,
            edge.retained,
        ))
        .map_err(|_| ExecutionError::Invariant)?,
        length: geometry.length,
        worsening,
        margin,
    }))
}
