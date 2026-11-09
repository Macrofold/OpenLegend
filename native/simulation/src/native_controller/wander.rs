//! An ordinary wander turn draws its bearing only when due and its next wait
//! only after the actual surface-line answer. Movement remains a separate
//! command intention, including when the physical path is unavailable.
use super::{reconcile_wander, selected_profile, wander_remaining};
use crate::execution::{CoreMutation, ExecutionError};
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries, SurfaceLineQuery};
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation, CandidateKey};
use crate::native_refuge::RefugeRoute;
use crate::native_response::{RefugeCandidate, WanderClock};
use crate::state::{EntityHandle, Placement, SurfacePoint};
use std::mem::size_of;

struct Turn {
    actor: EntityHandle,
    at: f64,
    origin: SurfacePoint,
    clock: WanderClock,
    queries: GeometryQueries,
}
pub(crate) struct CompletedWander {
    route: Option<(RefugeRoute, ByteReservation)>,
}
impl CompletedWander {
    pub(crate) fn into_route(self) -> Option<(RefugeRoute, ByteReservation)> {
        self.route
    }
}
pub(crate) enum WanderStep<'a> {
    Geometry(&'a GeometryQueries),
    Complete(CompletedWander),
}
pub(crate) struct WanderCursor {
    actor: String,
    turn: Option<Turn>,
    done: bool,
    _reservation: ByteReservation,
}
impl WanderCursor {
    pub(crate) fn prepare(
        core: &mut CoreMutation<'_>,
        actor: &str,
        candidate: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let entity = core
            .state
            .physical
            .entities
            .get(actor)
            .ok_or(ExecutionError::MissingEntity)?;
        let support_bytes = match &entity.placement {
            Some(Placement::World {
                support_surface_id, ..
            }) => support_surface_id.as_ref().map_or(0, String::len),
            _ => 0,
        };
        let reservation = budget.reserve(
            heap_sum([
                size_of::<Self>(),
                actor.len(),
                size_of::<SurfaceLineQuery>(),
                support_bytes
                    .checked_mul(2)
                    .ok_or(ExecutionError::Capacity)?,
                entity.ordinary_body_profile().id.len(),
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let installed = core.state.installed.clone();
        reconcile_wander(
            &mut core.physical(),
            &installed,
            actor,
            installed.time_epsilon,
        )?;
        let mut cursor = Self {
            actor: actor.into(),
            turn: None,
            done: false,
            _reservation: reservation,
        };
        let entity = core
            .state
            .physical
            .entities
            .get(actor)
            .ok_or(ExecutionError::MissingEntity)?;
        let (Some(state), Some(body_actor)) = (&entity.animal, &entity.actor) else {
            return Ok(cursor);
        };
        let Some(from) = entity.supported_position() else {
            return Ok(cursor);
        };
        if !body_actor.alive
            || body_actor.controller != "native"
            || body_actor.incapacitated
            || !entity.actively_participates()
            || installed
                .capabilities
                .capability_blocked(Some(entity), "actions")?
            || state.episode.is_some()
            || entity.threat.is_some()
            || body_actor.action.is_some()
            || entity.spatial.flight.is_some()
            || entity.spatial.fall_velocity.is_some()
            || installed
                .capabilities
                .capability_blocked(Some(entity), "locomotion")?
            || wander_remaining(&state.wander, core.state.physical.header.sim_time)
                > installed.time_epsilon
        {
            return Ok(cursor);
        }
        if state.foraging.is_some() {
            return Err(ExecutionError::UnsupportedFamily);
        }
        let profile = selected_profile(&installed, state)?;
        let handle = core
            .state
            .physical
            .entities
            .handle(actor)
            .ok_or(ExecutionError::MissingEntity)?;
        let body = entity.body_profile().into_owned();
        let clock = state.wander.clone();
        let at = core.state.physical.header.sim_time;
        let angle = core.physical().draw() * std::f64::consts::PI * 2.0;
        let query = SurfaceLineQuery {
            from: from.clone(),
            x: from.x + angle.cos() * profile.wander.distance,
            z: from.z + angle.sin() * profile.wander.distance,
            body,
        };
        let binding = GeometryBinding::new(
            candidate,
            installed.geometry.spatial.revision,
            core.journal.next_provider_serial()?,
        );
        let mut queries = GeometryQueries::new(binding);
        queries.surface_lines = vec![query];
        cursor.turn = Some(Turn {
            actor: handle,
            at,
            origin: from,
            clock,
            queries,
        });
        Ok(cursor)
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        mut answer: Option<GeometryAnswers>,
        budget: &ByteBudget,
    ) -> Result<WanderStep<'a>, ExecutionError> {
        if self.done {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        if self.turn.is_none() {
            if answer.is_some() {
                return Err(ExecutionError::UnfinishedOccurrence);
            }
            self.done = true;
            return Ok(WanderStep::Complete(CompletedWander { route: None }));
        }
        if answer.is_none() {
            return Ok(WanderStep::Geometry(
                &self.turn.as_ref().ok_or(ExecutionError::Invariant)?.queries,
            ));
        }
        let answer = answer.as_mut().ok_or(ExecutionError::Invariant)?;
        let turn = self.turn.as_ref().ok_or(ExecutionError::Invariant)?;
        turn.queries
            .validate_answers(answer)
            .map_err(|_| ExecutionError::Invariant)?;
        let entity = core
            .state
            .physical
            .entities
            .resolve(turn.actor)
            .ok_or(ExecutionError::MissingEntity)?;
        let state = entity
            .animal
            .as_ref()
            .ok_or(ExecutionError::UnsupportedFamily)?;
        if core.state.physical.header.sim_time != turn.at
            || state.wander != turn.clock
            || entity.supported_position().as_ref() != Some(&turn.origin)
        {
            return Err(ExecutionError::Invariant);
        }
        let profile = selected_profile(&core.state.installed, state)?;
        let minimum_wait = profile.wander.minimum_wait_seconds;
        let choices = profile.wander.wait_choices;
        // The answer owns the actual path allocation. Fund it before moving it
        // out, and move that guard with the eventual movement intention.
        let path_bytes = answer
            .surface_lines
            .first()
            .ok_or(ExecutionError::Invariant)?
            .as_ref()
            .map_or(Some(0), |line| line.path.heap_bytes())
            .ok_or(ExecutionError::Capacity)?;
        let point_bytes = answer.surface_lines[0]
            .as_ref()
            .and_then(|line| line.path.last())
            .map_or(0, |point| point.surface_id.len());
        let reservation = budget.reserve(
            heap_sum([
                size_of::<RefugeRoute>(),
                path_bytes,
                point_bytes,
                "routine".len(),
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let path = answer
            .surface_lines
            .pop()
            .ok_or(ExecutionError::Invariant)?;
        let wait = minimum_wait + (core.physical().draw() * choices as f64).floor();
        let mut mutation = core.physical();
        match mutation.snapshot_wander(&self.actor)? {
            WanderClock::Due { due_at } => *due_at += wait,
            WanderClock::Remaining {
                remaining_seconds, ..
            } => *remaining_seconds += wait,
        }
        mutation.animal_clock_changed(&self.actor)?;
        let turn = self.turn.take().ok_or(ExecutionError::Invariant)?;
        self.done = true;
        let Some(line) = path else {
            return Ok(WanderStep::Complete(CompletedWander { route: None }));
        };
        let Some(point) = line.path.last() else {
            return Ok(WanderStep::Complete(CompletedWander { route: None }));
        };
        let point = point.clone();
        let mut previous = turn.origin.point();
        let mut length = 0.0;
        for next in &line.path {
            length += crate::spatial::distance(previous, next.point());
            previous = next.point();
        }
        Ok(WanderStep::Complete(CompletedWander {
            route: Some((
                RefugeRoute {
                    candidate: RefugeCandidate {
                        id: "routine".into(),
                        point,
                        retained: None,
                        preferred: None,
                    },
                    path: line.path,
                    length,
                    worsening: 0.0,
                    arrival_margin: 0.0,
                },
                reservation,
            )),
        }))
    }
}
