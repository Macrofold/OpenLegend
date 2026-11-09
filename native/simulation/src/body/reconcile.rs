//! Body lifecycle runs inside the caller's one candidate. Original occurrences,
//! activity results and old-life terminal receiving finish at their actual
//! Source boundaries before the cursor permits its next consequence.
use super::*;
use crate::commands::Outcome;
use crate::conditions::{ConditionReconcileCursor, ConditionReconcileStep};
use crate::events::{
    AudienceSelection, CompletedOccurrence, EmissionText, EventEmissionIntent, EventScope,
};
use crate::execution::{
    ActionFinish, ActionWrite, CoreMutation, ExecutionError, PendingActionFinish, PendingStatusEnd,
    PlanGenerationWrite, StagedOccurrence, StatusEnd,
};
use crate::experience::AcquiredActivityResult;
use crate::host::retained_size::{heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::reception::EventScalar;
use crate::state::Remains;
use indexmap::IndexMap;
use std::mem::size_of;

pub(crate) enum BodyAnswer {
    Occurrence(CompletedOccurrence),
    Personal(AcquiredActivityResult),
}
pub(crate) enum BodyStep<'a> {
    Occurrence(StagedOccurrence),
    Personal(&'a crate::activity::PendingActivityResult),
    Complete,
}
pub(super) enum Progress {
    Occurrence(StagedOccurrence),
    Personal,
    Complete,
}
#[derive(Clone, Copy, PartialEq, Eq)]
enum Phase {
    Start,
    Finish,
    Unavailable,
    Separate,
    Retire,
    Interrupt,
    Lifecycle,
    Native,
    Conditions,
    Done,
}
pub(crate) struct BodyReconcileCursor {
    actor: String,
    cause: String,
    life: Option<u64>,
    phase: Phase,
    unavailable: bool,
    pending: Option<PendingActionFinish>,
    ending: Option<PendingStatusEnd>,
    interrupt: Option<Vec<String>>,
    next_status: usize,
    conditions: Option<ConditionReconcileCursor>,
    event: Option<String>,
    budget: ByteBudget,
    reservation: ByteReservation,
}
impl BodyReconcileCursor {
    pub(crate) fn new(
        actor: &str,
        cause: &str,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let reservation = budget.reserve(
            heap_sum([size_of::<Self>(), actor.len(), cause.len()])
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(Self {
            actor: actor.into(),
            cause: cause.into(),
            life: None,
            phase: Phase::Start,
            unavailable: false,
            pending: None,
            ending: None,
            interrupt: None,
            next_status: 0,
            conditions: None,
            event: None,
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
    fn emitted(&mut self, event: StagedOccurrence) -> Result<Progress, ExecutionError> {
        self.reserve(event.id.len())?;
        self.event = Some(event.id.clone());
        Ok(Progress::Occurrence(event))
    }
    fn end(&mut self, end: StatusEnd) -> Result<Option<StagedOccurrence>, ExecutionError> {
        match end {
            StatusEnd::Unchanged | StatusEnd::Complete => Ok(None),
            StatusEnd::Personal(pending) => {
                self.ending = Some(pending);
                Ok(None)
            }
            StatusEnd::Occurrence(event) => Ok(Some(event)),
        }
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<BodyAnswer>,
    ) -> Result<BodyStep<'a>, ExecutionError> {
        Ok(match self.progress(core, answer)? {
            Progress::Occurrence(event) => BodyStep::Occurrence(event),
            Progress::Complete => BodyStep::Complete,
            Progress::Personal => BodyStep::Personal(if let Some(pending) = &self.pending {
                pending.personal()
            } else {
                self.ending
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?
                    .personal()
            }),
        })
    }
    pub(super) fn personal(
        &self,
    ) -> Result<&crate::activity::PendingActivityResult, ExecutionError> {
        Ok(if let Some(pending) = &self.pending {
            pending.personal()
        } else {
            self.ending
                .as_ref()
                .ok_or(ExecutionError::Invariant)?
                .personal()
        })
    }
    pub(super) fn progress(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<BodyAnswer>,
    ) -> Result<Progress, ExecutionError> {
        let mut completed = None;
        match answer {
            Some(BodyAnswer::Occurrence(event)) => {
                if self.conditions.is_some() {
                    completed = Some(event);
                } else {
                    if self.event.as_deref() != Some(event.event_id()) {
                        return Err(ExecutionError::UnfinishedOccurrence);
                    }
                    self.event = None;
                }
            }
            Some(BodyAnswer::Personal(acquired)) => {
                if let Some(pending) = self.pending.take() {
                    core.complete_finish_action(pending, &acquired)?;
                } else if let Some(ending) = self.ending.take() {
                    let end = ending.resume(core, &acquired)?;
                    if let Some(event) = self.end(end)? {
                        return self.emitted(event);
                    }
                } else {
                    return Err(ExecutionError::Invariant);
                }
            }
            None => {
                if self.event.is_some() {
                    return Err(ExecutionError::UnfinishedOccurrence);
                }
            }
        }
        if self.pending.is_some() {
            return Ok(Progress::Personal);
        }
        if self.ending.is_some() {
            return Ok(Progress::Personal);
        }
        let installed = core.state.installed.clone();
        loop {
            if self.phase == Phase::Done {
                return Ok(Progress::Complete);
            }
            let entity = core
                .state
                .physical
                .entities
                .get(&self.actor)
                .ok_or(ExecutionError::MissingEntity)?;
            let actor = entity.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
            if self
                .life
                .is_some_and(|life| life != actor.physical_life.unwrap_or(0))
            {
                return Err(ExecutionError::Invariant);
            }
            match self.phase {
                Phase::Start => {
                    self.life = Some(actor.physical_life.unwrap_or(0));
                    core.physical().advance_body_revision(&self.actor)?;
                    let health = core
                        .state
                        .physical
                        .entities
                        .get(&self.actor)
                        .and_then(|e| e.actor.as_ref())
                        .ok_or(ExecutionError::Invariant)?
                        .health;
                    let definition = installed
                        .attributes
                        .values()
                        .find(|d| d.value().implementation == "native-health-v1")
                        .map(|d| d.value());
                    core.physical()
                        .set_health(&self.actor, health, definition)?;
                    let actor = core
                        .state
                        .physical
                        .entities
                        .get(&self.actor)
                        .and_then(|e| e.actor.as_ref())
                        .ok_or(ExecutionError::Invariant)?;
                    self.unavailable = actor.health == 0.0 && actor.alive && !actor.incapacitated;
                    self.phase = if self.unavailable {
                        Phase::Finish
                    } else {
                        Phase::Native
                    };
                }
                Phase::Finish => {
                    self.phase = Phase::Unavailable;
                    if let Some(action) = &actor.action {
                        self.reserve(action.id.len())?;
                        let id = action.id.clone();
                        core.physical().release_work(&id)?;
                        let rules = &installed.observation_rules.value().body;
                        let result = Outcome {
                            ok: false,
                            code: rules.unavailable_code.clone(),
                            message: rules.unavailable_text.clone().into(),
                            spent: None,
                            outputs: None,
                            recipe_id: None,
                            item_id: None,
                            entity_id: None,
                            goal_id: None,
                            plan_id: None,
                            action_id: None,
                        };
                        if let ActionFinish::Personal(pending) =
                            core.begin_finish_action(&self.actor, &id, result)?
                        {
                            self.pending = Some(pending);
                            return Ok(Progress::Personal);
                        }
                    }
                }
                Phase::Unavailable => {
                    let policy = installed
                        .body_policy
                        .as_ref()
                        .ok_or(ExecutionError::Invariant)?
                        .value();
                    let outcome = match actor.controller.as_str() {
                        "player" => policy.zero_health.player,
                        "npc" => policy.zero_health.npc,
                        "native" => policy.zero_health.native,
                        _ => return Err(ExecutionError::Invariant),
                    };
                    core.physical().replace_action(
                        &self.actor,
                        None,
                        ActionWrite {
                            generation: PlanGenerationWrite::Advance,
                            behavior: None,
                        },
                    )?;
                    core.physical().make_body_unavailable(
                        &self.actor,
                        outcome == ZeroHealthOutcome::Incapacitate,
                    )?;
                    if outcome == ZeroHealthOutcome::Die {
                        let entity = core
                            .state
                            .physical
                            .entities
                            .get(&self.actor)
                            .ok_or(ExecutionError::Invariant)?;
                        if entity.animal.as_ref().is_some_and(|a| a.foraging.is_some()) {
                            return Err(ExecutionError::UnsupportedFamily);
                        }
                        let body = entity
                            .actor
                            .as_ref()
                            .and_then(|a| a.body.as_ref())
                            .ok_or(ExecutionError::MissingBody)?;
                        let growth = body.harvest_yield.len() * size_of::<crate::state::Yield>()
                            + body
                                .harvest_yield
                                .iter()
                                .map(|y| y.definition_id.len())
                                .sum::<usize>()
                            + self.actor.len()
                            + 32;
                        let animal = entity.animal.is_some();
                        core.physical().reserve_response_growth(growth)?;
                        let body = core
                            .state
                            .physical
                            .entities
                            .get(&self.actor)
                            .and_then(|e| e.actor.as_ref())
                            .and_then(|a| a.body.as_ref())
                            .ok_or(ExecutionError::MissingBody)?;
                        let now = core.state.physical.header.sim_time;
                        let remains = Remains {
                            died_at: now,
                            rot_at: policy.remains.as_ref().map(|p| now + p.rot_after_seconds),
                            remove_at: policy
                                .remains
                                .as_ref()
                                .map(|p| now + p.remove_after_seconds),
                            phase: "fresh".into(),
                            source_id: self.actor.clone(),
                            harvested: false,
                            yields: body.harvest_yield.clone(),
                        };
                        if animal {
                            *core.physical().snapshot_episode(&self.actor)? = None;
                        }
                        core.physical().set_remains(&self.actor, Some(remains))?;
                        self.phase = Phase::Separate;
                    } else {
                        self.phase = Phase::Interrupt;
                    }
                }
                Phase::Separate => {
                    self.phase = Phase::Retire;
                    let policy = installed
                        .body_policy
                        .as_ref()
                        .and_then(|p| p.value().reincarnation.as_ref());
                    let Some(policy) = policy.filter(|policy| {
                        actor.controller == policy.qualifying_controller
                            && actor.pending_death.is_none()
                    }) else {
                        continue;
                    };
                    // Physical installation and selected command writers close
                    // the genuinely empty custody branch; no item lot can be
                    // invented or silently abandoned by this constructor.
                    if actor.agency.plan.is_some() || actor.agency.suspended_plan().is_some() {
                        return Err(ExecutionError::UnsupportedFamily);
                    }
                    let growth = super::corpse::allocation_bound(entity)
                        .ok_or(ExecutionError::Capacity)?
                        + policy.corpse_kind.len()
                        + 256;
                    core.physical().reserve_response_growth(growth)?;
                    let id = {
                        let state = &mut core.state.physical;
                        state
                            .identity
                            .allocate_entity("body", |id| state.entities.get(id).is_some())?
                            .id
                    };
                    let entity = core
                        .state
                        .physical
                        .entities
                        .get(&self.actor)
                        .ok_or(ExecutionError::Invariant)?;
                    let position = entity
                        .world_position()
                        .ok_or(ExecutionError::InvalidPosition)?;
                    let corpse = super::corpse::construct(entity, id.clone(), &policy.corpse_kind)?;
                    core.physical().insert_corpse(corpse)?;
                    let scar = if policy.scars.is_empty() {
                        None
                    } else {
                        let choice =
                            (core.physical().draw() * policy.scars.len() as f64).floor() as usize;
                        Some(&policy.scars[choice])
                    };
                    if let Some(scar) = scar {
                        core.physical().add_death_scar(&self.actor, &scar.id)?;
                    }
                    let now = core.state.physical.header.sim_time;
                    core.physical().separate_dead_body(
                        &self.actor,
                        PendingDeath {
                            at: now,
                            position,
                            corpse_id: id.clone(),
                            retained: Vec::new(),
                            left: Vec::new(),
                        },
                    )?;
                    core.physical().set_remains(&self.actor, None)?;
                    core.physical().membership_changed(&self.actor)?;
                    self.reserve(
                        map_storage::<String, EventScalar>(4).ok_or(ExecutionError::Capacity)?
                            + id.len()
                            + policy.death_text.len()
                            + 128,
                    )?;
                    let mut data = IndexMap::new();
                    data.insert("corpseId".into(), EventScalar::Text((id).into()));
                    if let Some(scar) = scar {
                        data.insert("scarId".into(), EventScalar::Text((scar.id.clone()).into()));
                    }
                    data.insert("retainedTypes".into(), EventScalar::Number(0.0));
                    data.insert("lostTypes".into(), EventScalar::Number(0.0));
                    let event = core.stage_event(EventEmissionIntent {
                        event_type: installed
                            .observation_rules
                            .value()
                            .body
                            .player_death_event
                            .clone(),
                        text: EmissionText::Literal((policy.death_text.clone()).into()),
                        audience: AudienceSelection::Physical,
                        source_id: Some(self.actor.clone()),
                        target_id: None,
                        data: Some(data),
                        scope: EventScope::Private,
                        origin: None,
                        exposure: None,
                    })?;
                    return self.emitted(event);
                }
                Phase::Retire => {
                    let proof = crate::reception::retire_perception_life(
                        core,
                        &self.actor,
                        self.life.ok_or(ExecutionError::Invariant)?,
                        &self.budget,
                    )?;
                    if proof.observer_id() != self.actor
                        || proof.physical_life() != self.life.ok_or(ExecutionError::Invariant)?
                        || proof.at() != core.state.physical.header.sim_time
                    {
                        return Err(ExecutionError::Invariant);
                    }
                    core.physical().clear_contacts(&self.actor)?;
                    core.journal
                        .current
                        .clear_visibility(&mut core.state.reception, &self.actor)?;
                    core.journal
                        .episodes
                        .clear_observer(&mut core.state.reception, &self.actor)?;
                    self.phase = Phase::Interrupt;
                }
                Phase::Interrupt => {
                    if self.interrupt.is_none() {
                        self.interrupt =
                            Some(core.interrupt_status_ids(&self.actor, "body-unavailable")?);
                    }
                    let ids = self.interrupt.as_ref().ok_or(ExecutionError::Invariant)?;
                    if self.next_status == ids.len() {
                        self.phase = Phase::Lifecycle;
                        continue;
                    }
                    let index = self.next_status;
                    self.next_status += 1;
                    let end =
                        core.deactivate_status(&self.actor, &ids[index], "body-unavailable")?;
                    if let Some(event) = self.end(end)? {
                        return self.emitted(event);
                    }
                    if self.ending.is_some() {
                        return Ok(Progress::Personal);
                    }
                }
                Phase::Lifecycle => {
                    self.phase = Phase::Native;
                    let policy = &installed
                        .body_policy
                        .as_ref()
                        .ok_or(ExecutionError::Invariant)?
                        .value()
                        .zero_health;
                    let notices = &installed.observation_rules.value().body;
                    let template = if actor.incapacitated {
                        &policy.incapacitate_narration
                    } else {
                        &policy.death_narration
                    };
                    let event_type = if actor.incapacitated {
                        &notices.incapacitated_event
                    } else {
                        &notices.death_event
                    };
                    self.reserve(
                        super::narration_bound(template, entity).ok_or(ExecutionError::Capacity)?
                            + map_storage::<String, EventScalar>(2)
                                .ok_or(ExecutionError::Capacity)?
                            + 256,
                    )?;
                    let text = EmissionText::Narration(super::narration(template, entity));
                    let data = IndexMap::from([
                        ("significant".into(), EventScalar::Boolean(true)),
                        (
                            "cause".into(),
                            EventScalar::Text((self.cause.clone()).into()),
                        ),
                    ]);
                    let event = core.stage_event(EventEmissionIntent {
                        event_type: event_type.clone(),
                        text,
                        audience: AudienceSelection::Physical,
                        source_id: Some(self.actor.clone()),
                        target_id: None,
                        data: Some(data),
                        scope: EventScope::External,
                        origin: None,
                        exposure: None,
                    })?;
                    return self.emitted(event);
                }
                Phase::Native => {
                    reconcile_native_control(core, &self.actor)?;
                    self.conditions =
                        Some(ConditionReconcileCursor::new(&self.actor, &self.budget)?);
                    self.phase = Phase::Conditions;
                }
                Phase::Conditions => {
                    match self
                        .conditions
                        .as_mut()
                        .ok_or(ExecutionError::Invariant)?
                        .step(core, completed.take())?
                    {
                        ConditionReconcileStep::Occurrence(event) => {
                            return Ok(Progress::Occurrence(event));
                        }
                        ConditionReconcileStep::Complete => {
                            self.conditions = None;
                            core.journal
                                .cognition
                                .require_reconsideration(&mut core.state.minds, &self.actor)?;
                            self.phase = Phase::Done;
                        }
                    }
                }
                Phase::Done => return Ok(Progress::Complete),
            }
        }
    }
}

pub(crate) fn reconcile_native_control(
    core: &mut CoreMutation<'_>,
    id: &str,
) -> Result<(), ExecutionError> {
    let installed = core.state.installed.clone();
    let entity = core
        .state
        .physical
        .entities
        .get(id)
        .ok_or(ExecutionError::MissingEntity)?;
    let Some(animal) = &entity.animal else {
        return Ok(());
    };
    let actor = entity.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
    if actor.controller == "native"
        && actor.alive
        && animal.physical_life == actor.physical_life.unwrap_or(0)
    {
        return Ok(());
    }
    if animal.foraging.is_some() || entity.spatial.flight.is_some() || entity.threat.is_some() {
        return Err(ExecutionError::UnsupportedFamily);
    }
    let owned = actor
        .action
        .as_ref()
        .is_some_and(|a| a.native_locomotion.is_some());
    let outward = owned
        && actor.action.as_ref().is_some_and(|action| {
            installed
                .observation_rules
                .value()
                .outward_activity
                .actions
                .contains(&action.kind)
        });
    if animal.episode.is_none()
        && !owned
        && animal.acoustic_patterns.is_empty()
        && animal.physical_life == actor.physical_life.unwrap_or(0)
    {
        return Ok(());
    }
    let life = actor.physical_life.unwrap_or(0);
    let count = animal.acoustic_patterns.len();
    let bytes = count * size_of::<String>()
        + animal
            .acoustic_patterns
            .keys()
            .map(String::len)
            .sum::<usize>();
    core.physical().reserve_response_growth(bytes)?;
    let keys: Vec<String> = core
        .state
        .physical
        .entities
        .get(id)
        .and_then(|e| e.animal.as_ref())
        .ok_or(ExecutionError::Invariant)?
        .acoustic_patterns
        .keys()
        .cloned()
        .collect();
    *core.physical().snapshot_episode(id)? = None;
    for key in keys {
        core.physical().set_acoustic_pattern(id, &key, None)?;
    }
    core.remove_observer_episodes(id)?;
    core.physical().set_animal_physical_life(id, life)?;
    if owned {
        let action = core
            .state
            .physical
            .entities
            .get(id)
            .and_then(|e| e.actor.as_ref())
            .and_then(|a| a.action.as_ref())
            .ok_or(ExecutionError::Invariant)?
            .id
            .clone();
        core.physical().release_work(&action)?;
        core.physical().replace_action(
            id,
            None,
            ActionWrite {
                generation: PlanGenerationWrite::Advance,
                behavior: None,
            },
        )?;
    }
    crate::native_controller::reconcile_wander(
        &mut core.physical(),
        &installed,
        id,
        installed.time_epsilon,
    )?;
    core.physical().animal_clock_changed(id)?;
    core.physical().behavior_changed(id, outward)?;
    Ok(())
}
