//! Move the captured approaching actors before the endpoint's body effects.
//! The same action must survive before its private sampling remainder changes.
//! See docs/simulation-time.md#native-interval-contract.
use super::input::{PreparedSteering, can_steer};
use super::{MechanicalForecast, SliceActions};
use crate::execution::{CoreMutation, ExecutionError, StagedOccurrence};
use crate::geometry::{GeometryBinding, GeometryQueries};
use crate::host::{ByteBudget, ByteReservation};
use crate::movement::{
    MotionOperation, MotionStep, MoveAdvanceAnswer, MoveAdvanceCursor, MoveAdvanceStep,
};
use crate::state::Point;
use std::mem::size_of;

enum Progress {
    Geometry,
    Occurrence(StagedOccurrence),
    Personal,
    Complete,
}
pub(crate) struct MotionSliceCursor {
    actions: SliceActions,
    steering: PreparedSteering,
    steering_next: usize,
    steering_current: Option<MotionOperation>,
    input_seconds: f64,
    next: usize,
    current: Option<MoveAdvanceCursor>,
    from: Option<Point>,
    seconds: f64,
    binding: GeometryBinding,
    budget: ByteBudget,
    _reservation: ByteReservation,
}
impl MotionSliceCursor {
    pub(crate) fn geometry_request(&self) -> Option<&GeometryQueries> {
        self.steering_current
            .as_ref()
            .and_then(MotionOperation::queries)
            .or_else(|| {
                self.current
                    .as_ref()
                    .and_then(|cursor| cursor.queries().ok())
            })
    }
    pub(crate) fn new(
        actions: SliceActions,
        steering: PreparedSteering,
        input_seconds: f64,
        seconds: f64,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        if !seconds.is_finite()
            || seconds <= 0.0
            || !input_seconds.is_finite()
            || input_seconds <= 0.0
        {
            return Err(ExecutionError::Invariant);
        }
        Ok(Self {
            actions,
            steering,
            steering_next: 0,
            steering_current: None,
            input_seconds,
            next: 0,
            current: None,
            from: None,
            seconds,
            binding,
            budget: budget.clone(),
            _reservation: budget.reserve(size_of::<Self>())?,
        })
    }
    pub(crate) fn into_actions(self) -> Result<SliceActions, ExecutionError> {
        if self.current.is_some()
            || self.next != self.actions.approaching.len()
            || self.steering_current.is_some()
            || self.steering_next != self.steering.routes.len()
        {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        Ok(self.actions)
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        mechanics: &MechanicalForecast,
        answer: Option<MoveAdvanceAnswer>,
    ) -> Result<MoveAdvanceStep<'a>, ExecutionError> {
        let progress = self.progress(core, mechanics, answer)?;
        // Source's semantic writers enqueue this work before another occurrence
        // can read the changed scene. Keep that boundary through provider yields.
        core.sync_sensory_changes()?;
        Ok(match progress {
            Progress::Geometry => {
                MoveAdvanceStep::Geometry(self.geometry_request().ok_or(ExecutionError::Invariant)?)
            }
            Progress::Occurrence(event) => MoveAdvanceStep::Occurrence(event),
            Progress::Personal => MoveAdvanceStep::Personal(
                self.current
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?
                    .personal()?,
            ),
            Progress::Complete => MoveAdvanceStep::Complete,
        })
    }
    fn progress(
        &mut self,
        core: &mut CoreMutation<'_>,
        mechanics: &MechanicalForecast,
        mut answer: Option<MoveAdvanceAnswer>,
    ) -> Result<Progress, ExecutionError> {
        // All steering prefixes commit in admitted input order before action
        // movement. Later movers therefore see each earlier occupied placement.
        while let Some((handle, route)) = self.steering.routes.get_index(self.steering_next) {
            if self.steering_current.is_none() {
                if answer.is_some() {
                    return Err(ExecutionError::UnfinishedOccurrence);
                }
                let entity = core.state.physical.entities.resolve(*handle);
                if let Some(entity) = entity {
                    if can_steer(core, entity)? {
                        self.binding.serial = core.journal.next_provider_serial()?;
                        self.steering_current = Some(MotionOperation::start_steering(
                            core,
                            &entity.id,
                            &route.path,
                            route.distance * (self.seconds / self.input_seconds),
                            self.binding,
                            &self.budget,
                        )?);
                    }
                }
                if self.steering_current.is_none() {
                    self.steering_next += 1;
                    continue;
                }
            }
            let input = match answer.take() {
                None => None,
                Some(MoveAdvanceAnswer::Geometry(value)) => Some(value),
                _ => return Err(ExecutionError::UnfinishedOccurrence),
            };
            match self
                .steering_current
                .as_mut()
                .ok_or(ExecutionError::Invariant)?
                .step(core, input)?
            {
                MotionStep::Geometry(_) => return Ok(Progress::Geometry),
                MotionStep::Complete(_) => {
                    self.steering_current = None;
                    self.steering_next += 1;
                }
            }
        }
        loop {
            let Some(handle) = self.actions.approaching.get(self.next).copied() else {
                if answer.is_some() {
                    return Err(ExecutionError::UnfinishedOccurrence);
                }
                return Ok(Progress::Complete);
            };
            if self.current.is_none() {
                if answer.is_some() {
                    return Err(ExecutionError::UnfinishedOccurrence);
                }
                let entity = core.state.physical.entities.resolve(handle);
                let eligible =
                    entity
                        .and_then(|entity| entity.actor.as_ref())
                        .is_some_and(|actor| {
                            actor.alive
                                && !actor.incapacitated
                                && actor.action.as_ref().is_some_and(|action| {
                                    action.kind == "move" && action.stage == "approaching"
                                })
                        });
                if !eligible {
                    self.next += 1;
                    continue;
                }
                let entity = entity.ok_or(ExecutionError::Invariant)?;
                self.from = if mechanics.private_walkers.contains(&handle) {
                    Some(
                        entity
                            .world_position()
                            .ok_or(ExecutionError::InvalidPosition)?,
                    )
                } else {
                    None
                };
                self.binding.serial = core.journal.next_provider_serial()?;
                self.current = Some(MoveAdvanceCursor::new(
                    &entity.id,
                    self.seconds,
                    self.binding,
                    &self.budget,
                )?);
            }
            match self
                .current
                .as_mut()
                .ok_or(ExecutionError::Invariant)?
                .step(core, answer.take())?
            {
                MoveAdvanceStep::Geometry(_) => return Ok(Progress::Geometry),
                MoveAdvanceStep::Occurrence(event) => return Ok(Progress::Occurrence(event)),
                MoveAdvanceStep::Personal(_) => return Ok(Progress::Personal),
                MoveAdvanceStep::Complete => {}
            }
            if let Some(from) = self.from.take() {
                let entity = core.state.physical.entities.resolve(handle);
                let action = entity
                    .and_then(|entity| entity.actor.as_ref())
                    .and_then(|actor| actor.action.as_ref());
                let captured = self.current.as_ref().and_then(MoveAdvanceCursor::action_id);
                if let Some(action) = action.filter(|action| Some(action.id.as_str()) == captured) {
                    let entity = entity.ok_or(ExecutionError::Invariant)?;
                    let limit = mechanics.travel_for(handle);
                    let left = action
                        .motion_sample_remaining_metres
                        .unwrap_or(limit)
                        .min(limit)
                        - crate::spatial::distance(
                            from,
                            entity
                                .world_position()
                                .ok_or(ExecutionError::InvalidPosition)?,
                        );
                    let remaining = if left > 8.0 * f64::EPSILON * 1.0_f64.max(limit) {
                        left
                    } else {
                        limit
                    };
                    core.physical().set_motion_sample_remaining(
                        handle,
                        captured.ok_or(ExecutionError::Invariant)?,
                        remaining,
                    )?;
                }
            }
            self.current = None;
            self.next += 1;
        }
    }
}
