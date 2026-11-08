//! Resolve the next ordinary frontier through actual resumption, interrupted
//! action completion and sight. Remembered places use the observer's own words.
use super::*;
use crate::execution::{ActionFinish, CoreMutation, ExecutionError, PendingActionFinish};
use crate::experience::AcquiredActivityResult;
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries};
use crate::host::retained_size::HeapBytes;
use crate::host::{ByteBudget, ByteReservation};
use crate::reception::SightBatch;
use crate::state::{Placement, SurfacePoint};
use std::mem::size_of;

pub(crate) struct ReadyPlanStep {
    actor: String,
    plan: String,
    revision: u64,
    step: String,
    life: u64,
}
impl ReadyPlanStep {
    pub(crate) fn actor_id(&self) -> &str {
        &self.actor
    }
    pub(crate) fn step_id(&self) -> &str {
        &self.step
    }
    pub(super) fn targets_current(&self, core: &CoreMutation<'_>) -> Result<bool, ExecutionError> {
        self.command(core)?;
        let step = core
            .state
            .physical
            .entities
            .get(&self.actor)
            .and_then(|entity| entity.actor.as_ref())
            .and_then(|actor| actor.agency.plan.as_ref())
            .and_then(|plan| plan.steps.iter().find(|step| step.id == self.step))
            .ok_or(ExecutionError::Invariant)?;
        Ok(super::targets_current(core, &self.actor, step))
    }
    /// Dispatch marks the frontier only after the common command owner has
    /// completed or a current encounter check has refused before execution.
    pub(super) fn complete(
        self,
        core: &mut CoreMutation<'_>,
        result: &Outcome,
    ) -> Result<(), ExecutionError> {
        self.command(core)?;
        let actor = core
            .state
            .physical
            .entities
            .get(&self.actor)
            .and_then(|entity| entity.actor.as_ref())
            .ok_or(ExecutionError::MissingActor)?;
        let action_id = actor
            .action
            .as_ref()
            .map_or(self.step.as_str(), |action| action.id.as_str());
        let growth = action_id.len() * 2 + result.heap_bytes().ok_or(ExecutionError::Capacity)?;
        core.physical().reserve_plan_growth(growth)?;
        let action_id = core
            .state
            .physical
            .entities
            .get(&self.actor)
            .and_then(|entity| entity.actor.as_ref())
            .and_then(|actor| actor.action.as_ref())
            .map_or(self.step.as_str(), |action| action.id.as_str())
            .to_owned();
        let immediate = !result.ok
            || core
                .state
                .physical
                .entities
                .get(&self.actor)
                .and_then(|entity| entity.actor.as_ref())
                .is_some_and(|actor| actor.action.is_none());
        {
            let mut physical = core.physical();
            let plan = physical
                .plan_mut(&self.actor)?
                .as_mut()
                .ok_or(ExecutionError::Invariant)?;
            let step = plan
                .steps
                .iter_mut()
                .find(|step| step.id == self.step)
                .ok_or(ExecutionError::Invariant)?;
            step.status = StepStatus::Running;
            step.action_id = Some(action_id.clone());
            step.outcome = Some(result.clone());
            plan.revision = plan
                .revision
                .checked_add(1)
                .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
                .ok_or(ExecutionError::Invariant)?;
        }
        core.physical().advance_agency_revision(&self.actor)?;
        if immediate {
            match core.begin_finish_action(&self.actor, &action_id, result.clone())? {
                ActionFinish::Complete(_) => {}
                // An immediate ordinary command already completed its real
                // personal result. A second result would duplicate history.
                ActionFinish::Personal(_) => return Err(ExecutionError::UnfinishedOccurrence),
            }
        }
        Ok(())
    }
    pub(crate) fn command<'a>(
        &self,
        core: &'a CoreMutation<'_>,
    ) -> Result<&'a NativeCommand, ExecutionError> {
        let entity = core
            .state
            .physical
            .entities
            .get(&self.actor)
            .filter(|e| e.physical_life() == Some(self.life))
            .ok_or(ExecutionError::Invariant)?;
        let plan = entity
            .actor
            .as_ref()
            .and_then(|a| a.agency.plan.as_ref())
            .filter(|p| {
                p.id == self.plan && p.revision == self.revision && p.status == PlanStatus::Active
            })
            .ok_or(ExecutionError::Invariant)?;
        Ok(&plan
            .steps
            .iter()
            .find(|s| s.id == self.step && s.status == StepStatus::Queued)
            .ok_or(ExecutionError::Invariant)?
            .command)
    }
}
pub(crate) enum PlanReadyAnswer {
    Geometry(GeometryAnswers),
    Personal(AcquiredActivityResult),
}
pub(crate) enum PlanReadyStep<'a> {
    Geometry(&'a GeometryQueries),
    Personal(&'a crate::activity::PendingActivityResult),
    Complete(Option<ReadyPlanStep>),
}
#[derive(Clone, Copy, PartialEq, Eq)]
enum Phase {
    Resume,
    Interrupted,
    Select,
    Sight,
    Complete,
    Done,
}
pub(crate) struct PlanReadyCursor {
    actor: String,
    phase: Phase,
    resume: Option<PlanResumeCursor>,
    pending: Option<PendingActionFinish>,
    ready: Option<ReadyPlanStep>,
    target: Option<(String, SurfacePoint)>,
    sight: Option<SightBatch>,
    binding: GeometryBinding,
    budget: ByteBudget,
    reservation: ByteReservation,
}
impl PlanReadyCursor {
    pub(super) fn geometry_request(&self) -> Result<&GeometryQueries, ExecutionError> {
        self.sight
            .as_ref()
            .map(SightBatch::queries)
            .ok_or(ExecutionError::Invariant)
    }
    pub(crate) fn new(
        actor: &str,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let reservation = budget.reserve(size_of::<Self>() + actor.len())?;
        Ok(Self {
            actor: actor.into(),
            phase: Phase::Resume,
            resume: None,
            pending: None,
            ready: None,
            target: None,
            sight: None,
            binding,
            budget: budget.clone(),
            reservation,
        })
    }
    fn reserve(&mut self, bytes: usize) -> Result<(), ExecutionError> {
        self.reservation.resize(
            self.reservation
                .bytes()
                .checked_add(bytes)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(())
    }
    fn actor<'a>(
        &self,
        core: &'a CoreMutation<'_>,
    ) -> Result<&'a crate::state::ActorState, ExecutionError> {
        core.state
            .physical
            .entities
            .get(&self.actor)
            .and_then(|e| e.actor.as_ref())
            .ok_or(ExecutionError::MissingActor)
    }
    fn seen(&mut self, core: &mut CoreMutation<'_>, seen: bool) -> Result<(), ExecutionError> {
        if seen {
            self.ready
                .as_ref()
                .ok_or(ExecutionError::Invariant)?
                .command(core)?;
            let (target, point) = self.target.take().ok_or(ExecutionError::Invariant)?;
            let names = crate::worlds::InstalledPersonalNameReader::prepare(
                &core.state.physical,
                &core.state.reception,
                &core.state.installed,
                &core.state.experience,
                &self.actor,
            )
            .map_err(ExecutionError::Received)?;
            let name = names
                .observer_name(&target)
                .map_err(ExecutionError::Received)?
                .name;
            let episode = core
                .state
                .reception
                .perception_episodes
                .as_ref()
                .and_then(|o| o.get(&self.actor))
                .and_then(|o| o.get(&target));
            let _guard = self.budget.reserve(
                name.storage_bytes()
                    .checked_mul(2)
                    .and_then(|n| n.checked_add(120 * 16 + episode.map_or(0, String::len)))
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let name = name.to_owned();
            let label = name.slice(0..name.units_len().min(120));
            let episode = episode.cloned();
            let limit = core.state.installed.agency_limits.places;
            core.physical().remember_sighting(
                &self.actor,
                &target,
                point,
                label,
                episode,
                limit,
            )?;
        }
        self.phase = Phase::Complete;
        Ok(())
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        mut answer: Option<PlanReadyAnswer>,
    ) -> Result<PlanReadyStep<'a>, ExecutionError> {
        if self.pending.is_some() {
            let Some(PlanReadyAnswer::Personal(acquired)) = answer.take() else {
                return Err(ExecutionError::UnfinishedOccurrence);
            };
            core.complete_finish_action(
                self.pending.take().ok_or(ExecutionError::Invariant)?,
                &acquired,
            )?;
            self.phase = Phase::Select;
        }
        if self.phase == Phase::Sight {
            let Some(PlanReadyAnswer::Geometry(answers)) = answer.take() else {
                return Err(ExecutionError::UnfinishedOccurrence);
            };
            self.ready
                .as_ref()
                .ok_or(ExecutionError::Invariant)?
                .command(core)?;
            let seen = self
                .sight
                .take()
                .ok_or(ExecutionError::Invariant)?
                .finish(answers)
                .map_err(|_| ExecutionError::Invariant)?
                .seen(&self.target.as_ref().ok_or(ExecutionError::Invariant)?.0)
                .ok_or(ExecutionError::Invariant)?;
            self.seen(core, seen)?;
        }
        loop {
            match self.phase {
                Phase::Resume => {
                    if self.resume.is_none() {
                        self.resume = Some(PlanResumeCursor::new(
                            &self.actor,
                            ResumeMode::Automatic,
                            &self.budget,
                        )?);
                    }
                    let supplied = answer
                        .take()
                        .map(|a| match a {
                            PlanReadyAnswer::Personal(p) => Ok(p),
                            _ => Err(ExecutionError::UnfinishedOccurrence),
                        })
                        .transpose()?;
                    match self
                        .resume
                        .as_mut()
                        .ok_or(ExecutionError::Invariant)?
                        .progress(core, supplied)?
                    {
                        super::resume::ResumeProgress::Personal => {
                            return Ok(PlanReadyStep::Personal(
                                self.resume
                                    .as_ref()
                                    .ok_or(ExecutionError::Invariant)?
                                    .personal()?,
                            ));
                        }
                        super::resume::ResumeProgress::Complete => {
                            self.resume = None;
                            self.phase = Phase::Interrupted;
                        }
                    }
                }
                Phase::Interrupted => {
                    if answer.is_some() {
                        return Err(ExecutionError::UnfinishedOccurrence);
                    }
                    let actor = self.actor(core)?;
                    let Some(plan) = actor
                        .agency
                        .plan
                        .as_ref()
                        .filter(|p| p.status == PlanStatus::Active)
                    else {
                        self.phase = Phase::Complete;
                        continue;
                    };
                    if plan.activity.is_some()
                        || plan.steps.iter().any(|s| s.activity_key.is_some())
                    {
                        return Err(ExecutionError::UnsupportedFamily);
                    }
                    let orphan = plan
                        .steps
                        .iter()
                        .find(|s| {
                            s.status == StepStatus::Running
                                && s.action_id.as_deref()
                                    != actor.action.as_ref().map(|a| a.id.as_str())
                        })
                        .and_then(|s| s.action_id.as_ref());
                    if let Some(action) = orphan {
                        self.reserve(action.len())?;
                        let action = action.clone();
                        let installed = core.state.installed.clone();
                        let rule = &installed.ordinary_actions.value().plan.interrupted_step;
                        self.reserve(rule.code.len() + rule.message.len() + size_of::<Outcome>())?;
                        match core.begin_finish_action(&self.actor, &action, rule.outcome(false))? {
                            ActionFinish::Complete(_) => {}
                            ActionFinish::Personal(p) => {
                                self.pending = Some(p);
                                return Ok(PlanReadyStep::Personal(
                                    self.pending
                                        .as_ref()
                                        .ok_or(ExecutionError::Invariant)?
                                        .personal(),
                                ));
                            }
                        }
                    }
                    self.phase = Phase::Select;
                }
                Phase::Select => {
                    let entity = core
                        .state
                        .physical
                        .entities
                        .get(&self.actor)
                        .ok_or(ExecutionError::MissingEntity)?;
                    let actor = entity.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
                    let Some(plan) = actor
                        .agency
                        .plan
                        .as_ref()
                        .filter(|p| p.status == PlanStatus::Active)
                    else {
                        self.phase = Phase::Complete;
                        continue;
                    };
                    if actor.action.is_some()
                        || !actor.alive
                        || actor.incapacitated
                        || core
                            .state
                            .installed
                            .capabilities
                            .capability_blocked(Some(entity), "actions")
                            .map_err(|_| ExecutionError::Invariant)?
                        || plan
                            .goal_id
                            .as_ref()
                            .filter(|id| !id.is_empty())
                            .is_some_and(|id| {
                                !actor
                                    .agency
                                    .goals
                                    .iter()
                                    .any(|g| g.id == *id && g.status == "active")
                            })
                    {
                        self.phase = Phase::Complete;
                        continue;
                    }
                    let Some(next) = plan.steps.iter().find(|s| s.status == StepStatus::Queued)
                    else {
                        self.phase = Phase::Complete;
                        continue;
                    };
                    let target = match &next.command {
                        NativeCommand::Say { target_id, .. } => target_id.as_deref(),
                        NativeCommand::StatusEffect { target_id, .. } => Some(target_id.as_str()),
                        _ => None,
                    };
                    let target = target.and_then(|id| {
                        core.state
                            .physical
                            .entities
                            .get(id)
                            .and_then(|e| match &e.placement {
                                Some(Placement::World {
                                    position,
                                    support_surface_id: Some(surface),
                                    ..
                                }) => Some((id, *position, surface.as_str())),
                                _ => None,
                            })
                    });
                    let bytes = self.actor.len()
                        + plan.id.len()
                        + next.id.len()
                        + target
                            .as_ref()
                            .map_or(0, |(id, _, surface)| id.len() + surface.len())
                        + size_of::<ReadyPlanStep>();
                    self.reserve(bytes)?;
                    self.ready = Some(ReadyPlanStep {
                        actor: self.actor.clone(),
                        plan: plan.id.clone(),
                        revision: plan.revision,
                        step: next.id.clone(),
                        life: entity.physical_life().ok_or(ExecutionError::Invariant)?,
                    });
                    if let Some((target, point, surface)) = target {
                        let point = SurfacePoint {
                            x: point.x,
                            y: point.y,
                            z: point.z,
                            surface_id: surface.into(),
                        };
                        self.binding.serial = core.journal.next_provider_serial()?;
                        let sight = SightBatch::prepare(
                            &core.state.physical,
                            &core.state.installed,
                            &self.actor,
                            &[target],
                            self.binding,
                            &self.budget,
                        )
                        .map_err(|_| ExecutionError::Invariant)?;
                        self.target = Some((target.into(), point));
                        if sight.queries().sight.is_empty() {
                            let seen = sight
                                .finish_sight(self.binding, &[])
                                .map_err(|_| ExecutionError::Invariant)?
                                .seen(target)
                                .ok_or(ExecutionError::Invariant)?;
                            self.seen(core, seen)?;
                        } else {
                            self.sight = Some(sight);
                            self.phase = Phase::Sight;
                            return Ok(PlanReadyStep::Geometry(
                                self.sight
                                    .as_ref()
                                    .ok_or(ExecutionError::Invariant)?
                                    .queries(),
                            ));
                        }
                    } else {
                        self.phase = Phase::Complete;
                    }
                }
                Phase::Sight => return Err(ExecutionError::UnfinishedOccurrence),
                Phase::Complete => {
                    if answer.is_some() {
                        return Err(ExecutionError::UnfinishedOccurrence);
                    }
                    self.phase = Phase::Done;
                    return Ok(PlanReadyStep::Complete(self.ready.take()));
                }
                Phase::Done => return Err(ExecutionError::Invariant),
            }
        }
    }
}
