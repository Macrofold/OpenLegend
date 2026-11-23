//! The Source body-before-work endpoint order over one captured interval.
//! Motion and the later zero-time arrival remain separate phase owners.
//! See docs/simulation-time.md#native-interval-contract.
use super::gifts::{GiftAnswer, GiftStep};
use super::input::AdmittedWorldInput;
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
mod heat;
use heat::HeatCursor;

pub(crate) enum EndpointAnswer {
    Occurrence(CompletedOccurrence),
    Personal(AcquiredActivityResult),
    Geometry(GeometryAnswers),
}
pub(crate) enum EndpointStep<'a> {
    Participation(&'a str),
    Occurrence(StagedOccurrence),
    Personal(&'a PendingActivityResult),
    Geometry(&'a GeometryQueries),
    Complete,
}
enum Progress {
    Participation,
    Occurrence(StagedOccurrence),
    Personal,
    Geometry,
    Complete,
}
#[derive(Clone, Copy, PartialEq, Eq)]
enum Phase {
    Exits,
    Rates,
    Actor,
    Body,
    Conditions,
    Work,
    TimedRelease,
    Next,
    Heat,
    Gifts,
    Done,
}
pub(crate) struct EndpointCursor {
    exits: Option<crate::participation::DueExits>,
    work_after_exits: bool,
    actors: Vec<EntityHandle>,
    actions: Option<(SliceActions, f64)>,
    rates: Option<StatusIntegrationCursor>,
    body: Option<BodyRateCursor>,
    conditions: Option<ConditionReconcileCursor>,
    work: Option<MoveAdvanceCursor>,
    check_pending_release: bool,
    heat: Option<HeatCursor>,
    gifts: super::gifts::DueGifts,
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
    pub(crate) fn complete_participation(
        &mut self,
        completed: &crate::participation::CompletedParticipation,
    ) -> Result<(), ExecutionError> {
        if self.phase != Phase::Exits {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        self.exits
            .as_mut()
            .ok_or(ExecutionError::Invariant)?
            .complete(completed)
    }
    pub(crate) fn geometry_request(&self) -> Option<&GeometryQueries> {
        if self.phase == Phase::Gifts {
            self.gifts.geometry()
        } else {
            self.work.as_ref().and_then(|cursor| cursor.queries().ok())
        }
    }
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
        let heat = HeatCursor::capture(core, participants.heat_sources(), rate_seconds, budget)?;
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
        let exits = if actions.is_some() {
            let due = crate::participation::DueExits::prepare(
                &core.state.physical,
                core.state.installed.time_epsilon,
                budget,
            )?;
            due.current().is_some().then_some(due)
        } else {
            None
        };
        Ok(Self {
            exits,
            work_after_exits: false,
            actors,
            actions,
            rates,
            body: None,
            conditions: None,
            work: None,
            check_pending_release: false,
            heat,
            gifts: super::gifts::DueGifts::default(),
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
        inputs: &[AdmittedWorldInput],
    ) -> Result<EndpointStep<'a>, ExecutionError> {
        Ok(match self.progress(core, answer, inputs)? {
            Progress::Participation => EndpointStep::Participation(
                self.exits
                    .as_ref()
                    .and_then(|exits| exits.current())
                    .ok_or(ExecutionError::Invariant)?,
            ),
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
            Progress::Geometry => {
                EndpointStep::Geometry(self.geometry_request().ok_or(ExecutionError::Invariant)?)
            }
            Progress::Complete => EndpointStep::Complete,
        })
    }
    fn progress(
        &mut self,
        core: &mut CoreMutation<'_>,
        mut answer: Option<EndpointAnswer>,
        inputs: &[AdmittedWorldInput],
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
                        self.phase = if self.exits.is_some() {
                            Phase::Exits
                        } else {
                            self.after_work()
                        };
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
                Phase::Work | Phase::TimedRelease => {
                    let timed = self.phase == Phase::TimedRelease;
                    if self.exits.is_some() && !self.work_after_exits {
                        self.phase = Phase::Next;
                        continue;
                    }
                    if self.work.is_none() {
                        if answer.is_some() {
                            return Err(ExecutionError::UnfinishedOccurrence);
                        }
                        let handle = self.actors[self.next];
                        let entity = core.state.physical.entities.resolve(handle);
                        let work = self.actions.as_ref().and_then(|(actions, seconds)| {
                            actions.working.get(&handle).map(|id| (id, *seconds))
                        });
                        let Some((entity, action, elapsed)) = entity.zip(work)
                            .and_then(|(entity, (id, elapsed))| {
                                let actor = entity.actor.as_ref()?;
                                let action = actor.action.as_ref()?;
                                (entity.actively_participates() && actor.alive
                                    && !actor.incapacitated && id == &action.id)
                                    .then_some((entity, action, elapsed))
                            }) else {
                            self.phase = Phase::Next;
                            continue;
                        };
                        self.binding.serial = core.journal.next_provider_serial()?;
                        if timed {
                            let at = core.state.physical.header.sim_time;
                            let window = inputs.iter().find_map(|input| {
                                (input.actor_id == entity.id).then_some(input.release.as_ref()).flatten()
                                    .filter(|release| release.action_id == action.id && release.ends_at > release.starts_at)
                            });
                            if window.is_none_or(|release| release.ends_at < at) {
                                self.disarm_pending_release(core, handle)?;
                            } else if window.is_some_and(|release| release.starts_at <= at) {
                                self.work = MoveAdvanceCursor::pending_timed_release(
                                    &entity.id, action, self.binding, &self.budget,
                                )?;
                            }
                            if self.work.is_none() {
                                self.phase = Phase::Next;
                                continue;
                            }
                        } else {
                            self.check_pending_release = action.attack_execution.as_ref()
                                .is_some_and(|timing| timing.pending_release.is_some());
                            self.work = Some(MoveAdvanceCursor::new(
                                &entity.id, elapsed, self.binding, &self.budget,
                            )?);
                        }
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
                            if timed {
                                self.disarm_pending_release(core, self.actors[self.next])?;
                            }
                            self.phase = if std::mem::take(&mut self.check_pending_release) {
                                Phase::TimedRelease
                            } else {
                                Phase::Next
                            };
                        }
                    }
                }
                Phase::Next => {
                    self.next += 1;
                    self.phase = if self.work_after_exits {
                        if self.next == self.actors.len() {
                            self.after_work()
                        } else {
                            Phase::Work
                        }
                    } else {
                        Phase::Actor
                    };
                }
                Phase::Exits => {
                    if self
                        .exits
                        .as_ref()
                        .and_then(|exits| exits.current())
                        .is_some()
                    {
                        return Ok(Progress::Participation);
                    }
                    self.work_after_exits = true;
                    self.next = 0;
                    self.phase = if self.actors.is_empty() {
                        self.after_work()
                    } else {
                        Phase::Work
                    };
                }
                Phase::Heat => {
                    let heat = self.heat.as_mut().ok_or(ExecutionError::Invariant)?;
                    if let Some(event) =
                        heat.step(core, occurrence(answer.take())?, &self.budget)?
                    {
                        return Ok(Progress::Occurrence(event));
                    }
                    self.heat = None;
                    self.phase = Phase::Gifts;
                }
                Phase::Gifts => {
                    let answer = match answer.take() {
                        Some(EndpointAnswer::Occurrence(answer)) => {
                            Some(GiftAnswer::Occurrence(answer))
                        }
                        Some(EndpointAnswer::Geometry(answer)) => {
                            Some(GiftAnswer::Geometry(answer))
                        }
                        Some(_) => return Err(ExecutionError::UnfinishedOccurrence),
                        None => None,
                    };
                    match self.gifts.step(core, answer, self.binding, &self.budget)? {
                        GiftStep::Occurrence(event) => return Ok(Progress::Occurrence(event)),
                        GiftStep::Geometry => return Ok(Progress::Geometry),
                        GiftStep::Complete => self.phase = Phase::Done,
                    }
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

    fn disarm_pending_release(
        &self,
        core: &mut CoreMutation<'_>,
        handle: EntityHandle,
    ) -> Result<(), ExecutionError> {
        let expected = self.actions.as_ref().and_then(|(actions, _)| actions.working.get(&handle));
        let Some((entity, action)) = core.state.physical.entities.resolve(handle).and_then(|entity| {
            let action = entity.actor.as_ref()?.action.as_ref()?;
            (expected == Some(&action.id)
                && action.attack_execution.as_ref().is_some_and(|timing| timing.pending_release.is_some()))
                .then_some((entity, action))
        }) else { return Ok(()); };
        let _names = self.budget.reserve(entity.id.len() + action.id.len())?;
        let (actor, action) = (entity.id.clone(), action.id.clone());
        core.physical().disarm_attack_release(&actor, &action)
    }
    fn after_work(&self) -> Phase {
        if self.heat.is_some() {
            Phase::Heat
        } else {
            Phase::Gifts
        }
    }
}
