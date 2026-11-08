//! The Source body-before-work endpoint order over one captured interval.
//! Motion and the later zero-time arrival remain separate phase owners.
//! See docs/simulation-time.md#native-interval-contract.
use super::{NativeParticipants, SliceActions};
use crate::activity::PendingActivityResult;
use crate::body::{BodyAnswer, BodyRateCursor, BodyStep};
use crate::conditions::{ConditionReconcileCursor, ConditionReconcileStep};
use crate::events::CompletedOccurrence;
use crate::execution::{CoreMutation, ExecutionError, StagedOccurrence};
use crate::experience::AcquiredActivityResult;
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries};
use crate::host::{ByteBudget, ByteReservation};
use crate::movement::{MoveAdvanceAnswer, MoveAdvanceCursor, MoveAdvanceStep};
use crate::state::EntityHandle;
use crate::status::{StatusIntegrationCursor, StatusIntegrationStep, StatusRateInterval};
use std::{mem::size_of, sync::Arc};

pub(crate) enum EndpointAnswer {
    Occurrence(CompletedOccurrence),
    Personal(AcquiredActivityResult),
    Geometry(GeometryAnswers),
}
pub(crate) enum EndpointStep<'a> {
    Occurrence(StagedOccurrence),
    Personal(&'a PendingActivityResult),
    Geometry(&'a GeometryQueries),
    Complete,
}
enum Progress {
    Occurrence(StagedOccurrence),
    Personal,
    Geometry,
    Complete,
}
#[derive(Clone, Copy, PartialEq, Eq)]
enum Phase {
    Rates,
    Actor,
    Body,
    Conditions,
    Work,
    Next,
    Done,
}
pub(crate) struct EndpointCursor {
    actors: Vec<EntityHandle>,
    actions: Option<(SliceActions, f64)>,
    rates: Option<StatusIntegrationCursor>,
    body: Option<BodyRateCursor>,
    conditions: Option<ConditionReconcileCursor>,
    work: Option<MoveAdvanceCursor>,
    phase: Phase,
    next: usize,
    binding: GeometryBinding,
    budget: ByteBudget,
    _reservation: ByteReservation,
}
fn occurrence(
    answer: Option<EndpointAnswer>,
) -> Result<Option<CompletedOccurrence>, ExecutionError> {
    match answer {
        None => Ok(None),
        Some(EndpointAnswer::Occurrence(done)) => Ok(Some(done)),
        _ => Err(ExecutionError::UnfinishedOccurrence),
    }
}
impl EndpointCursor {
    pub(crate) fn new(
        core: &mut CoreMutation<'_>,
        participants: &NativeParticipants,
        active: &[Arc<StatusRateInterval>],
        rate_seconds: f64,
        actions: Option<(SliceActions, f64)>,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        if !rate_seconds.is_finite()
            || rate_seconds < 0.0
            || actions
                .as_ref()
                .is_some_and(|(_, seconds)| !seconds.is_finite() || *seconds < 0.0)
        {
            return Err(ExecutionError::Invariant);
        }
        // These families have no converted endpoint owner yet. Installation
        // and forecast also refuse them; never silently omit their elapsed work.
        if !participants.heat_sources().is_empty() {
            return Err(ExecutionError::UnsupportedFamily);
        }
        if rate_seconds > 0.0 {
            for handle in participants.actors() {
                let Some(entity) = core.state.physical.entities.resolve(*handle) else {
                    continue;
                };
                for attribute in entity
                    .actor
                    .as_ref()
                    .and_then(|actor| actor.attributes.as_ref())
                    .into_iter()
                    .flat_map(|attributes| attributes.keys())
                {
                    if core
                        .state
                        .installed
                        .attributes
                        .get(attribute)
                        .is_some_and(|d| d.value().reservoir.is_some())
                    {
                        return Err(ExecutionError::UnsupportedFamily);
                    }
                }
            }
        }
        let count = if rate_seconds > 0.0 {
            participants.actors().len()
        } else {
            actions
                .as_ref()
                .map_or(0, |(actions, _)| actions.working.len())
        };
        let reservation = budget.reserve(
            size_of::<Self>()
                .checked_add(
                    count
                        .checked_mul(size_of::<EntityHandle>())
                        .ok_or(ExecutionError::Capacity)?,
                )
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let actors = if rate_seconds > 0.0 {
            participants.actors().to_vec()
        } else {
            actions.as_ref().map_or_else(Vec::new, |(actions, _)| {
                actions.working.keys().copied().collect()
            })
        };
        let rates = if rate_seconds > 0.0 {
            Some(StatusIntegrationCursor::new(
                core,
                active,
                rate_seconds,
                true,
                budget,
            )?)
        } else {
            None
        };
        Ok(Self {
            actors,
            actions,
            rates,
            body: None,
            conditions: None,
            work: None,
            phase: if rate_seconds > 0.0 {
                Phase::Rates
            } else {
                Phase::Actor
            },
            next: 0,
            binding,
            budget: budget.clone(),
            _reservation: reservation,
        })
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<EndpointAnswer>,
    ) -> Result<EndpointStep<'a>, ExecutionError> {
        Ok(match self.progress(core, answer)? {
            Progress::Occurrence(event) => EndpointStep::Occurrence(event),
            Progress::Personal => EndpointStep::Personal(if self.phase == Phase::Body {
                self.body
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?
                    .personal()?
            } else {
                self.work
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?
                    .personal()?
            }),
            Progress::Geometry => EndpointStep::Geometry(
                self.work
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?
                    .queries()?,
            ),
            Progress::Complete => EndpointStep::Complete,
        })
    }
    fn progress(
        &mut self,
        core: &mut CoreMutation<'_>,
        mut answer: Option<EndpointAnswer>,
    ) -> Result<Progress, ExecutionError> {
        loop {
            match self.phase {
                Phase::Rates => match self
                    .rates
                    .as_mut()
                    .ok_or(ExecutionError::Invariant)?
                    .step(core, occurrence(answer.take())?)?
                {
                    StatusIntegrationStep::Occurrence(event) => {
                        return Ok(Progress::Occurrence(event));
                    }
                    StatusIntegrationStep::Complete(rates) => {
                        self.rates = None;
                        self.body = Some(BodyRateCursor::new(rates, &self.budget)?);
                        self.phase = Phase::Actor;
                    }
                },
                Phase::Actor => {
                    if answer.is_some() {
                        return Err(ExecutionError::UnfinishedOccurrence);
                    }
                    let Some(handle) = self.actors.get(self.next) else {
                        self.phase = Phase::Done;
                        continue;
                    };
                    let entity = core.state.physical.entities.resolve(*handle);
                    let eligible = entity.is_some_and(|entity| {
                        entity.actively_participates()
                            && entity
                                .actor
                                .as_ref()
                                .is_some_and(|actor| actor.alive && !actor.incapacitated)
                    });
                    if !eligible {
                        self.phase = Phase::Next;
                        continue;
                    }
                    let id = &entity.ok_or(ExecutionError::Invariant)?.id;
                    if let Some(body) = &mut self.body {
                        body.select(id)?;
                        self.phase = Phase::Body;
                    } else {
                        self.phase = Phase::Work;
                    }
                }
                Phase::Body => {
                    let answer = match answer.take() {
                        None => None,
                        Some(EndpointAnswer::Occurrence(done)) => {
                            Some(BodyAnswer::Occurrence(done))
                        }
                        Some(EndpointAnswer::Personal(done)) => Some(BodyAnswer::Personal(done)),
                        _ => return Err(ExecutionError::UnfinishedOccurrence),
                    };
                    match self
                        .body
                        .as_mut()
                        .ok_or(ExecutionError::Invariant)?
                        .step(core, answer)?
                    {
                        BodyStep::Occurrence(event) => return Ok(Progress::Occurrence(event)),
                        BodyStep::Personal(_) => return Ok(Progress::Personal),
                        BodyStep::Complete => {
                            let entity = core
                                .state
                                .physical
                                .entities
                                .resolve(self.actors[self.next])
                                .ok_or(ExecutionError::MissingEntity)?;
                            self.conditions =
                                Some(ConditionReconcileCursor::new(&entity.id, &self.budget)?);
                            self.phase = Phase::Conditions;
                        }
                    }
                }
                Phase::Conditions => match self
                    .conditions
                    .as_mut()
                    .ok_or(ExecutionError::Invariant)?
                    .step(core, occurrence(answer.take())?)?
                {
                    ConditionReconcileStep::Occurrence(event) => {
                        return Ok(Progress::Occurrence(event));
                    }
                    ConditionReconcileStep::Complete => {
                        self.conditions = None;
                        self.phase = Phase::Work;
                    }
                },
                Phase::Work => {
                    if self.work.is_none() {
                        if answer.is_some() {
                            return Err(ExecutionError::UnfinishedOccurrence);
                        }
                        let handle = self.actors[self.next];
                        let entity = core.state.physical.entities.resolve(handle);
                        let work = self.actions.as_ref().and_then(|(actions, seconds)| {
                            actions.working.get(&handle).map(|id| (id, *seconds))
                        });
                        let eligible = entity.is_some_and(|entity| {
                            entity.actively_participates()
                                && entity.actor.as_ref().is_some_and(|actor| {
                                    actor.alive
                                        && !actor.incapacitated
                                        && actor.action.as_ref().is_some_and(|action| {
                                            work.is_some_and(|(id, _)| id == &action.id)
                                        })
                                })
                        });
                        if !eligible {
                            self.phase = Phase::Next;
                            continue;
                        }
                        self.binding.serial = core.journal.next_provider_serial()?;
                        self.work = Some(MoveAdvanceCursor::new(
                            &entity.ok_or(ExecutionError::Invariant)?.id,
                            work.ok_or(ExecutionError::Invariant)?.1,
                            self.binding,
                            &self.budget,
                        )?);
                    }
                    let answer = answer.take().map(|answer| match answer {
                        EndpointAnswer::Occurrence(done) => MoveAdvanceAnswer::Occurrence(done),
                        EndpointAnswer::Personal(done) => MoveAdvanceAnswer::Personal(done),
                        EndpointAnswer::Geometry(done) => MoveAdvanceAnswer::Geometry(done),
                    });
                    match self
                        .work
                        .as_mut()
                        .ok_or(ExecutionError::Invariant)?
                        .step(core, answer)?
                    {
                        MoveAdvanceStep::Occurrence(event) => {
                            return Ok(Progress::Occurrence(event));
                        }
                        MoveAdvanceStep::Personal(_) => return Ok(Progress::Personal),
                        MoveAdvanceStep::Geometry(_) => return Ok(Progress::Geometry),
                        MoveAdvanceStep::Complete => {
                            self.work = None;
                            self.phase = Phase::Next;
                        }
                    }
                }
                Phase::Next => {
                    self.next += 1;
                    self.phase = Phase::Actor;
                }
                Phase::Done => {
                    if answer.is_some() {
                        return Err(ExecutionError::UnfinishedOccurrence);
                    }
                    return Ok(Progress::Complete);
                }
            }
        }
    }
}
