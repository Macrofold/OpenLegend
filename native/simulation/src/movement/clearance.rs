//! Planning checks the same ordered occupied bodies as actual locomotion. A
//! successful check grants no movement, sensing or route ownership by itself.
use super::*;
use crate::execution::{CoreMutation, ExecutionError};
use crate::geometry::{
    BodySweepGroup, BodySweepMode, GeometryAnswers, GeometryBinding, GeometryQueries,
};
use crate::host::retained_size::heap_sum;
use crate::host::{ByteBudget, ByteReservation, CandidateKey};
use crate::work::WorkUnit;
use std::mem::size_of;

pub(crate) struct CompletedPathClearance {
    clear: bool,
}
impl CompletedPathClearance {
    pub(crate) fn clear(&self) -> bool {
        self.clear
    }
}
pub(crate) enum PathClearanceStep<'a> {
    Geometry(&'a GeometryQueries),
    Complete(CompletedPathClearance),
}
pub(crate) struct PathClearanceCursor {
    actor: String,
    from: Point,
    index: usize,
    count: usize,
    candidate: CandidateKey,
    sweep: Option<OccupiedSweep>,
    next: usize,
    question: Option<(GeometryQueries, ByteReservation)>,
    complete: Option<bool>,
    _reservation: ByteReservation,
}
fn error(error: MovementError) -> ExecutionError {
    match error {
        MovementError::Work(error) => ExecutionError::Work(error),
        MovementError::Capacity => ExecutionError::Capacity,
        MovementError::UnsupportedFamily => ExecutionError::UnsupportedFamily,
        MovementError::MissingEntity => ExecutionError::MissingEntity,
        _ => ExecutionError::Invariant,
    }
}
impl PathClearanceCursor {
    pub(crate) fn prepare(
        actor: &str,
        from: Point,
        points: usize,
        candidate: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let reservation = budget.reserve(size_of::<Self>() + actor.len())?;
        Ok(Self {
            actor: actor.into(),
            from,
            index: 0,
            count: points,
            candidate,
            sweep: None,
            next: 0,
            question: None,
            complete: None,
            _reservation: reservation,
        })
    }
    pub(crate) fn geometry_request(&self) -> Option<&GeometryQueries> {
        self.question.as_ref().map(|(question, _)| question)
    }
    /// The parent owns this immutable route across yields. There is no copied
    /// path or actor here, and a failed segment stops before testing its suffix.
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        path: &[SurfacePoint],
        answer: Option<GeometryAnswers>,
        budget: &ByteBudget,
    ) -> Result<PathClearanceStep<'a>, ExecutionError> {
        if path.len() != self.count {
            return Err(ExecutionError::Invariant);
        }
        if let Some(mut answer) = answer {
            let (question, _guard) = self
                .question
                .take()
                .ok_or(ExecutionError::UnfinishedOccurrence)?;
            question
                .validate_answers(&answer)
                .map_err(|_| ExecutionError::Invariant)?;
            let result = answer.body_sweeps.pop().ok_or(ExecutionError::Invariant)?;
            core.journal
                .meters
                .charge(&[(WorkUnit::Tests, result.tested)])?;
            self.next = self
                .next
                .checked_add(usize::try_from(result.tested).map_err(|_| ExecutionError::Capacity)?)
                .ok_or(ExecutionError::Capacity)?;
            if result.fraction.is_some() {
                self.sweep = None;
                self.complete = Some(false);
            }
        } else if self.question.is_some() {
            return Ok(PathClearanceStep::Geometry(
                self.geometry_request().ok_or(ExecutionError::Invariant)?,
            ));
        }
        loop {
            if let Some(clear) = self.complete {
                return Ok(PathClearanceStep::Complete(CompletedPathClearance {
                    clear,
                }));
            }
            if self.index == self.count {
                self.complete = Some(true);
                continue;
            }
            if self.sweep.is_none() {
                let actor = core
                    .state
                    .physical
                    .entities
                    .get(&self.actor)
                    .ok_or(ExecutionError::MissingActor)?;
                self.sweep = Some(
                    OccupiedSweep::prepare(
                        &core.state.physical.bodies,
                        &core.state.physical.entities,
                        &core.state.installed.status_policy,
                        actor,
                        self.from,
                        path[self.index].point(),
                        budget,
                        &mut core.journal.meters,
                    )
                    .map_err(error)?,
                );
                self.next = 0;
            }
            let sweep = self.sweep.as_ref().ok_or(ExecutionError::Invariant)?;
            if self.next == sweep.bounds.len() {
                self.from = path[self.index].point();
                self.index += 1;
                self.sweep = None;
                continue;
            }
            let remaining = sweep
                .bounds
                .len()
                .checked_sub(self.next)
                .ok_or(ExecutionError::Invariant)?;
            let count = remaining.min(
                usize::try_from(core.journal.meters.remaining(WorkUnit::Tests)?)
                    .unwrap_or(usize::MAX),
            );
            if count == 0 {
                core.journal.meters.charge(&[(WorkUnit::Tests, 1)])?;
                return Err(ExecutionError::Invariant);
            }
            let reservation = budget.reserve(
                heap_sum([
                    size_of::<GeometryQueries>(),
                    size_of::<BodySweepGroup>(),
                    count
                        .checked_mul(size_of::<Bounds>())
                        .ok_or(ExecutionError::Capacity)?,
                    sweep.body.id.len(),
                ])
                .ok_or(ExecutionError::Capacity)?,
            )?;
            let binding = GeometryBinding::new(
                self.candidate,
                core.state.installed.geometry.spatial.revision,
                core.journal.next_provider_serial()?,
            );
            let mut question = GeometryQueries::new(binding);
            question.body_sweeps = vec![BodySweepGroup {
                bounds: sweep.bounds[self.next..self.next + count].to_vec(),
                from: self.from,
                to: path[self.index].point(),
                body: sweep.body.clone(),
                mode: BodySweepMode::FirstHit,
            }];
            self.question = Some((question, reservation));
            return Ok(PathClearanceStep::Geometry(
                self.geometry_request().ok_or(ExecutionError::Invariant)?,
            ));
        }
    }
}
