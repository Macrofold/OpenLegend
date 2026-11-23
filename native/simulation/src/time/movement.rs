//! Move the captured approaching actors before the endpoint's body effects.
//! The same action must survive before its private sampling remainder changes.
//! See docs/simulation-time.md#native-interval-contract.
use super::input::{PreparedSteering, can_steer};
use super::{MechanicalForecast, SliceActions, projectiles::PassageTracks};
use crate::execution::{CoreMutation, ExecutionError, StagedOccurrence};
use crate::geometry::{GeometryBinding, GeometryQueries};
use crate::host::{ByteBudget, ByteReservation};
use crate::movement::{
    MotionForecast, MotionOperation, MotionStep, MoveAdvanceAnswer, MoveAdvanceCursor, MoveAdvanceStep,
};
use crate::state::Point;
use std::{mem::size_of, sync::Arc};

mod aim;
pub(super) use aim::AimTracks;

enum Progress {
    Geometry,
    Occurrence(StagedOccurrence),
    Personal,
    Complete,
}
/// The motion owner funds one body track. Aim and passage can both keep
/// that exact executed path through their separate sight checks.
pub(super) struct ExecutedMotion {
    pub(super) forecast: MotionForecast,
    _header: ByteReservation,
}

impl ExecutedMotion {
    pub(super) fn share(forecast: MotionForecast, budget: &ByteBudget) -> Result<Arc<Self>, ExecutionError> {
        let _header = budget.reserve(size_of::<Self>() + 2 * size_of::<usize>())?;
        Ok(Arc::new(Self { forecast, _header }))
    }
}

pub(crate) struct MotionSliceCursor {
    actions: SliceActions,
    passages: Option<PassageTracks>,
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
        if let Some(request) = self.actions.aims.as_ref().and_then(|aims| aims.question()) {
            return Some(request);
        }
        self.steering_current
            .as_ref()
            .and_then(MotionOperation::queries)
            .or_else(|| {
                self.current
                    .as_ref()
                    .and_then(|cursor| cursor.queries().ok())
            })
    }
    pub(super) fn new(
        actions: SliceActions,
        steering: PreparedSteering,
        passages: Option<PassageTracks>,
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
            passages,
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
    pub(super) fn into_actions(self) -> Result<(SliceActions, Option<PassageTracks>), ExecutionError> {
        if self.current.is_some()
            || self.next != self.actions.approaching.len()
            || self.steering_current.is_some()
            || self.steering_next != self.steering.routes.len()
        {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        Ok((self.actions, self.passages))
    }

    fn recording(&self, handle: crate::state::EntityHandle) -> bool {
        self.actions.aims.as_ref().is_some_and(|aims| aims.recording(handle))
            || self.passages.as_ref().is_some_and(|passages| passages.recording(handle))
    }

    fn record(&mut self, handle: crate::state::EntityHandle, forecast: MotionForecast) -> Result<(), ExecutionError> {
        let track = ExecutedMotion::share(forecast, &self.budget)?;
        if let Some(aims) = self.actions.aims.as_mut() {
            aims.record(handle, Arc::clone(&track));
        }
        if let Some(passages) = self.passages.as_mut() {
            passages.record(handle, track)?;
        }
        Ok(())
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
        if self
            .actions
            .aims
            .as_ref()
            .is_some_and(|aims| !aims.before_finished())
        {
            if self.aim_sight(core, answer.take())? {
                return Ok(Progress::Geometry);
            }
        }
        // All steering prefixes commit in admitted input order before action
        // movement. Later movers therefore see each earlier occupied placement.
        while let Some((handle, route)) = self.steering.routes.get_index(self.steering_next) {
            let handle = *handle;
            if self.steering_current.is_none() {
                if answer.is_some() {
                    return Err(ExecutionError::UnfinishedOccurrence);
                }
                let entity = core.state.physical.entities.resolve(handle);
                if let Some(entity) = entity {
                    if can_steer(core.state, entity)? {
                        self.binding.serial = core.journal.next_provider_serial()?;
                        let distance = route.distance * (self.seconds / self.input_seconds);
                        let mut motion = MotionOperation::start_steering(
                            core,
                            &entity.id,
                            &route.path,
                            distance,
                            self.binding,
                            &self.budget,
                        )?;
                        if distance > 0.0 && self.recording(handle) {
                            motion.record_execution(self.seconds, distance)?;
                        }
                        self.steering_current = Some(motion);
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
                    if let Some(track) = self
                        .steering_current
                        .as_mut()
                        .and_then(MotionOperation::take_executed_track)
                    {
                        self.record(handle, track)?;
                    }
                    self.steering_current = None;
                    self.steering_next += 1;
                }
            }
        }
        loop {
            let Some(handle) = self.actions.approaching.get(self.next).copied() else {
                if self
                    .actions
                    .aims
                    .as_ref()
                    .is_some_and(|aims| !aims.finished())
                {
                    if self.aim_sight(core, answer.take())? {
                        return Ok(Progress::Geometry);
                    }
                    self.actions.aims = None;
                }
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
                                && actor
                                    .action
                                    .as_ref()
                                    .is_some_and(super::actions::advances_ground)
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
                let moving_contact = entity
                    .actor
                    .as_ref()
                    .and_then(|actor| actor.action.as_ref())
                    .is_some_and(|action| {
                        (action.strike_motion.is_some() || action.has_contact_approach())
                    });
                let start = if moving_contact {
                    MoveAdvanceCursor::moving_contact
                } else {
                    MoveAdvanceCursor::new
                };
                let mut mover = start(&entity.id, self.seconds, self.binding, &self.budget)?;
                if self.recording(handle) {
                    mover.record_movement();
                }
                self.current = Some(mover);
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
                if let Some(action) = action.filter(|action| {
                    action.keeps_motion_sample() && Some(action.id.as_str()) == captured
                }) {
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
            if let Some(track) = self
                .current
                .as_mut()
                .and_then(MoveAdvanceCursor::take_executed_track)
            {
                self.record(handle, track)?;
            }
            self.current = None;
            self.next += 1;
        }
    }

    fn aim_sight(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<MoveAdvanceAnswer>,
    ) -> Result<bool, ExecutionError> {
        let answer = match answer {
            None => None,
            Some(MoveAdvanceAnswer::Geometry(answer)) => Some(answer),
            _ => return Err(ExecutionError::UnfinishedOccurrence),
        };
        self.actions
            .aims
            .as_mut()
            .ok_or(ExecutionError::Invariant)?
            .run(core, answer, self.seconds, self.binding, &self.budget)
    }
}
