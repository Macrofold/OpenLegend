//! Move the captured approaching actors before the endpoint's body effects.
//! The same action must survive before its private sampling remainder changes.
//! See docs/simulation-time.md#native-interval-contract.
use super::{MechanicalForecast, SliceActions};
use crate::execution::{CoreMutation, ExecutionError, StagedOccurrence};
use crate::geometry::GeometryBinding;
use crate::host::{ByteBudget, ByteReservation};
use crate::movement::{MoveAdvanceAnswer, MoveAdvanceCursor, MoveAdvanceStep};
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
    next: usize,
    current: Option<MoveAdvanceCursor>,
    from: Option<Point>,
    seconds: f64,
    binding: GeometryBinding,
    budget: ByteBudget,
    _reservation: ByteReservation,
}
impl MotionSliceCursor {
    pub(crate) fn new(
        actions: SliceActions,
        seconds: f64,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        if !seconds.is_finite() || seconds <= 0.0 {
            return Err(ExecutionError::Invariant);
        }
        Ok(Self {
            actions,
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
        if self.current.is_some() || self.next != self.actions.approaching.len() {
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
            Progress::Geometry => MoveAdvanceStep::Geometry(
                self.current
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?
                    .queries()?,
            ),
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
