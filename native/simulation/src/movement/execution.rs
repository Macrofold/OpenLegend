//! A real supported-path operation over the existing geometry providers. Only
//! its successful prefix reaches the sole placement/path writer on completion.
use super::*;
use crate::execution::{CoreMutation, ExecutionError};
use crate::geometry::{
    BodySweepGroup, BodySweepMode, GeometryAnswers, GeometryBinding, GeometryQueries,
    WalkingSegment,
};
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation};
use crate::work::WorkUnit;
use std::mem::size_of;

pub(crate) enum MotionStep<'a> {
    Geometry(&'a GeometryQueries),
    Complete(bool),
}
struct SweepProgress {
    kind: MotionQuestion,
    from: SurfacePoint,
    to: SurfacePoint,
    next: usize,
    first: Option<f64>,
}
pub(crate) struct MotionOperation {
    cursor: Option<MotionCursor>,
    sweep: Option<OccupiedSweep>,
    progress: Option<SweepProgress>,
    query: Option<(GeometryQueries, ByteReservation)>,
    binding: GeometryBinding,
    budget: ByteBudget,
    complete: Option<bool>,
    _reservation: ByteReservation,
}
fn error(error: MovementError) -> ExecutionError {
    match error {
        MovementError::Work(error) => ExecutionError::Work(error),
        MovementError::Capacity => ExecutionError::Capacity,
        MovementError::UnsupportedFamily => ExecutionError::UnsupportedFamily,
        MovementError::MissingEntity => ExecutionError::MissingEntity,
        MovementError::MissingAction => ExecutionError::MissingActor,
        _ => ExecutionError::Invariant,
    }
}
impl MotionOperation {
    pub(crate) fn start(
        core: &CoreMutation<'_>,
        actor_id: &str,
        distance_budget: f64,
        occupied: bool,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let entity = core
            .state
            .physical
            .entities
            .get(actor_id)
            .ok_or(ExecutionError::MissingEntity)?;
        let action = entity
            .actor
            .as_ref()
            .and_then(|actor| actor.action.as_ref())
            .ok_or(ExecutionError::MissingActor)?;
        Self::with_path(
            core,
            actor_id,
            &action.path,
            Some(&action.id),
            distance_budget,
            occupied,
            binding,
            budget,
        )
    }
    /// A transient steering route uses the same physical prefix writer without
    /// allocating an Action or changing the character's physical work slot.
    pub(crate) fn start_steering(
        core: &CoreMutation<'_>,
        actor_id: &str,
        path: &[SurfacePoint],
        distance_budget: f64,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        Self::with_path(
            core,
            actor_id,
            path,
            None,
            distance_budget,
            true,
            binding,
            budget,
        )
    }
    fn with_path(
        core: &CoreMutation<'_>,
        actor_id: &str,
        path: &[SurfacePoint],
        action_id: Option<&str>,
        distance_budget: f64,
        occupied: bool,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        if !distance_budget.is_finite()
            || distance_budget < 0.0
            || binding.geometry_revision != core.state.installed.geometry.spatial.revision
        {
            return Err(ExecutionError::Invariant);
        }
        let entity = core
            .state
            .physical
            .entities
            .get(actor_id)
            .ok_or(ExecutionError::MissingEntity)?;
        if entity.spatial.local_pose.is_some() {
            return Err(ExecutionError::UnsupportedFamily);
        }
        let handle = core
            .state
            .physical
            .entities
            .handle(actor_id)
            .ok_or(ExecutionError::MissingEntity)?;
        let support = match &entity.placement {
            Some(crate::state::Placement::World {
                support_surface_id: Some(support),
                ..
            }) => support,
            _ => return Err(ExecutionError::InvalidPosition),
        };
        let maximum = path
            .iter()
            .map(|point| point.surface_id.len())
            .chain(std::iter::once(support.len()))
            .max()
            .unwrap_or(0);
        let bytes = heap_sum([
            size_of::<Self>(),
            size_of::<MotionCursor>(),
            path.len()
                .checked_mul(size_of::<SurfacePoint>())
                .ok_or(ExecutionError::Capacity)?,
            path.iter()
                .try_fold(0usize, |bytes, point| {
                    bytes.checked_add(point.surface_id.len())
                })
                .ok_or(ExecutionError::Capacity)?,
            maximum.checked_mul(12).ok_or(ExecutionError::Capacity)?,
            action_id.map_or(0, str::len),
            entity.ordinary_body_profile().id.len(),
        ])
        .ok_or(ExecutionError::Capacity)?;
        let reservation = budget.reserve(bytes)?;
        let cursor = MotionCursor::start(
            handle,
            entity,
            path.to_vec(),
            action_id,
            distance_budget,
            occupied,
            core.state.installed.spatial.epsilon,
        )
        .map_err(error)?;
        Ok(Self {
            cursor: Some(cursor),
            sweep: None,
            progress: None,
            query: None,
            binding,
            budget: budget.clone(),
            complete: None,
            _reservation: reservation,
        })
    }
    pub(crate) fn queries(&self) -> Option<&GeometryQueries> {
        self.query.as_ref().map(|(query, _)| query)
    }
    pub(crate) fn binding(&self) -> GeometryBinding {
        self.binding
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<GeometryAnswers>,
    ) -> Result<MotionStep<'a>, ExecutionError> {
        if let Some(mut answer) = answer {
            let (query, _reservation) = self
                .query
                .take()
                .ok_or(ExecutionError::UnfinishedOccurrence)?;
            query
                .validate_answers(&answer)
                .map_err(|_| ExecutionError::Invariant)?;
            let progress = self.progress.as_mut().ok_or(ExecutionError::Invariant)?;
            let cursor = self.cursor.as_mut().ok_or(ExecutionError::Invariant)?;
            match progress.kind {
                MotionQuestion::Walk => {
                    cursor
                        .answer_clear(answer.walking.pop().ok_or(ExecutionError::Invariant)?)
                        .map_err(error)?;
                    self.progress = None;
                }
                MotionQuestion::OccupiedClear | MotionQuestion::OccupiedFirstContact => {
                    let answer = answer.body_sweeps.pop().ok_or(ExecutionError::Invariant)?;
                    // This whole requested prefix fit every actual meter before
                    // dispatch. No callback advances this private candidate
                    // while it waits, so charge its actual tested prefix once.
                    core.journal
                        .meters
                        .charge(&[(WorkUnit::Tests, answer.tested)])?;
                    progress.next = progress
                        .next
                        .checked_add(
                            usize::try_from(answer.tested)
                                .map_err(|_| ExecutionError::Invariant)?,
                        )
                        .ok_or(ExecutionError::Capacity)?;
                    if let Some(fraction) = answer.fraction {
                        progress.first =
                            Some(progress.first.map_or(fraction, |prior| prior.min(fraction)));
                    }
                    let finished = progress.next
                        == self
                            .sweep
                            .as_ref()
                            .ok_or(ExecutionError::Invariant)?
                            .bounds
                            .len();
                    if matches!(progress.kind, MotionQuestion::OccupiedClear)
                        && answer.fraction.is_some()
                    {
                        cursor.answer_clear(false).map_err(error)?;
                        self.progress = None;
                    } else if finished {
                        match progress.kind {
                            MotionQuestion::OccupiedClear => {
                                cursor.answer_clear(true).map_err(error)?
                            }
                            MotionQuestion::OccupiedFirstContact => {
                                cursor.answer_contact(progress.first).map_err(error)?
                            }
                            _ => return Err(ExecutionError::Invariant),
                        };
                        self.progress = None;
                    }
                }
            }
        } else if self.query.is_some() {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        loop {
            if let Some(complete) = self.complete {
                return Ok(MotionStep::Complete(complete));
            }
            if self.progress.is_none() {
                let cursor = self.cursor.as_mut().ok_or(ExecutionError::Invariant)?;
                let Some((kind, from, to)) = cursor.question() else {
                    let cursor = self.cursor.take().ok_or(ExecutionError::Invariant)?;
                    let complete = core.physical().finish_motion(cursor)?;
                    self.complete = Some(complete);
                    continue;
                };
                if !matches!(kind, MotionQuestion::Walk) {
                    let furthest = cursor.next.point();
                    if self.sweep.as_ref().is_none_or(|sweep| {
                        sweep.from != from.point() || sweep.furthest != furthest
                    }) {
                        self.sweep = None;
                        let entity = core
                            .state
                            .physical
                            .entities
                            .resolve(cursor.actor)
                            .ok_or(ExecutionError::MissingEntity)?;
                        self.sweep = Some(
                            OccupiedSweep::prepare(
                                &core.state.physical.bodies,
                                &core.state.physical.entities,
                                &core.state.installed.status_policy,
                                entity,
                                from.point(),
                                furthest,
                                &self.budget,
                                &mut core.journal.meters,
                            )
                            .map_err(error)?,
                        );
                    }
                }
                self.progress = Some(SweepProgress {
                    kind,
                    from,
                    to,
                    next: 0,
                    first: None,
                });
            }
            let progress = self.progress.as_ref().ok_or(ExecutionError::Invariant)?;
            let cursor = self.cursor.as_ref().ok_or(ExecutionError::Invariant)?;
            self.binding.serial = core.journal.next_provider_serial()?;
            if core.state.installed.geometry.spatial.revision != self.binding.geometry_revision {
                return Err(ExecutionError::Invariant);
            }
            let mut query;
            let reservation;
            if matches!(progress.kind, MotionQuestion::Walk) {
                reservation = self.budget.reserve(
                    size_of::<GeometryQueries>()
                        + size_of::<WalkingSegment>()
                        + progress.from.surface_id.len()
                        + progress.to.surface_id.len()
                        + cursor.body().id.len(),
                )?;
                query = GeometryQueries::new(self.binding);
                query.walking = Vec::with_capacity(1);
                query.walking.push(WalkingSegment {
                    from: progress.from.clone(),
                    to: progress.to.clone(),
                    body: cursor.body().clone(),
                });
            } else {
                let sweep = self.sweep.as_ref().ok_or(ExecutionError::Invariant)?;
                let remaining = sweep
                    .bounds
                    .len()
                    .checked_sub(progress.next)
                    .ok_or(ExecutionError::Invariant)?;
                if remaining == 0 {
                    let cursor = self.cursor.as_mut().ok_or(ExecutionError::Invariant)?;
                    match progress.kind {
                        MotionQuestion::OccupiedClear => {
                            cursor.answer_clear(true).map_err(error)?
                        }
                        MotionQuestion::OccupiedFirstContact => {
                            cursor.answer_contact(progress.first).map_err(error)?
                        }
                        _ => return Err(ExecutionError::Invariant),
                    };
                    self.progress = None;
                    continue;
                }
                let count = remaining.min(
                    usize::try_from(core.journal.meters.remaining(WorkUnit::Tests)?)
                        .unwrap_or(usize::MAX),
                );
                if count == 0 {
                    core.journal.meters.charge(&[(WorkUnit::Tests, 1)])?;
                    return Err(ExecutionError::Invariant);
                }
                reservation = self.budget.reserve(
                    size_of::<GeometryQueries>()
                        + size_of::<BodySweepGroup>()
                        + count
                            .checked_mul(size_of::<Bounds>())
                            .ok_or(ExecutionError::Capacity)?
                        + sweep.body.id.len(),
                )?;
                query = GeometryQueries::new(self.binding);
                query.body_sweeps = Vec::with_capacity(1);
                query.body_sweeps.push(BodySweepGroup {
                    bounds: sweep.bounds[progress.next..progress.next + count].to_vec(),
                    from: progress.from.point(),
                    to: progress.to.point(),
                    body: sweep.body.clone(),
                    mode: if matches!(progress.kind, MotionQuestion::OccupiedClear) {
                        BodySweepMode::FirstHit
                    } else {
                        BodySweepMode::NearestHit
                    },
                });
            }
            self.query = Some((query, reservation));
            return Ok(MotionStep::Geometry(
                &self.query.as_ref().ok_or(ExecutionError::Invariant)?.0,
            ));
        }
    }
}
