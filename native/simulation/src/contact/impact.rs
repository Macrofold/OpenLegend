//! The clock owns windup and recovery. This cursor owns the one checked
//! impact and drives the existing body and occurrence continuations.
use super::{StrikeOutcome, StrikePhase, may_target, profile};
use crate::activity::PendingActivityResult;
use crate::body::{BodyAnswer, BodyStep, HealthChangeCursor, ScarEffect, scar_factor};
use crate::events::{
    AudienceSelection, CompletedOccurrence, EmissionText, EventEmissionIntent, EventScope,
};
use crate::execution::{
    ActionFinish, ActionWrite, CoreMutation, ExecutionError, PendingStatusEnd, PlanGenerationWrite,
    StagedOccurrence, StatusEnd,
};
use crate::experience::AcquiredActivityResult;
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries, SightRay};
use crate::host::{ByteBudget, ByteReservation};
use crate::narration::{Narration, NarrationPart, PersonRole};
use crate::reception::{EventScalar, SightBatch};
use crate::state::{Action, Entity};
use indexmap::IndexMap;
use std::mem::size_of;

pub(crate) enum ContactAnswer {
    Geometry(GeometryAnswers),
    Occurrence(CompletedOccurrence),
    Personal(AcquiredActivityResult),
}

pub(crate) enum ContactStep {
    Geometry,
    Occurrence(StagedOccurrence),
    Personal,
    AdvanceComplete,
    ActionComplete,
    Invalidated,
}

pub(crate) struct ImpactCursor {
    source: String,
    action: String,
    target: String,
    seconds: f64,
    binding: GeometryBinding,
    phase: Phase,
    sight: Option<SightBatch>,
    impact: Option<GeometryQueries>,
    body: Option<HealthChangeCursor>,
    health_before: f64,
    raw_injury: f64,
    hit_reason: Option<&'static str>,
    status_ids: Vec<String>,
    status_index: usize,
    pending_status: Option<PendingStatusEnd>,
    event: Option<String>,
    budget: ByteBudget,
    storage: ByteReservation,
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum Phase {
    Start,
    Sight,
    Reach,
    Body,
    Interrupt,
    BodyEvent,
    Result,
    Done,
}

impl ImpactCursor {
    pub(crate) fn new(
        source: &str,
        action: &Action,
        seconds: f64,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let target = action
            .target_id
            .as_deref()
            .ok_or(ExecutionError::Invariant)?;
        let storage =
            budget.reserve(size_of::<Self>() + source.len() + action.id.len() + target.len())?;
        Ok(Self {
            source: source.into(),
            action: action.id.clone(),
            target: target.into(),
            seconds,
            binding,
            phase: Phase::Start,
            sight: None,
            impact: None,
            body: None,
            health_before: 0.0,
            raw_injury: 0.0,
            hit_reason: None,
            status_ids: Vec::new(),
            status_index: 0,
            pending_status: None,
            event: None,
            budget: budget.clone(),
            storage,
        })
    }

    pub(crate) fn queries(&self) -> Result<&GeometryQueries, ExecutionError> {
        self.sight
            .as_ref()
            .map(SightBatch::queries)
            .or(self.impact.as_ref())
            .ok_or(ExecutionError::Invariant)
    }

    pub(crate) fn personal(&self) -> Result<&PendingActivityResult, ExecutionError> {
        if let Some(status) = &self.pending_status {
            return Ok(status.personal());
        }
        self.body
            .as_ref()
            .ok_or(ExecutionError::Invariant)?
            .personal()
    }

    fn source<'a>(
        &self,
        core: &'a CoreMutation<'_>,
    ) -> Result<(&'a Entity, &'a Action), ExecutionError> {
        let entity = core
            .state
            .physical
            .entities
            .get(&self.source)
            .ok_or(ExecutionError::MissingActor)?;
        let action = entity
            .actor
            .as_ref()
            .and_then(|actor| actor.action.as_ref())
            .filter(|action| action.id == self.action && action.is_natural_contact())
            .ok_or(ExecutionError::Invariant)?;
        Ok((entity, action))
    }

    fn reserve(&mut self, bytes: usize) -> Result<(), ExecutionError> {
        self.storage.resize(
            self.storage
                .bytes()
                .checked_add(bytes)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(())
    }

    pub(crate) fn step(
        &mut self,
        core: &mut CoreMutation<'_>,
        mut answer: Option<ContactAnswer>,
    ) -> Result<ContactStep, ExecutionError> {
        if let Some(event) = self.event.take() {
            if !matches!(answer.take(), Some(ContactAnswer::Occurrence(done)) if done.event_id() == event)
            {
                return Err(ExecutionError::UnfinishedOccurrence);
            }
        }
        loop {
            match self.phase {
                Phase::Start => {
                    let (source, action) = self.source(core)?;
                    if action.strike_phase == Some(StrikePhase::Recovery) {
                        let epsilon = core.state.installed.time_epsilon;
                        return Ok(
                            if core.physical().advance_timed_work(
                                &self.source,
                                &self.action,
                                self.seconds,
                                epsilon,
                            )? {
                                ContactStep::ActionComplete
                            } else {
                                ContactStep::AdvanceComplete
                            },
                        );
                    }
                    let Some(target) = core.state.physical.entities.get(&self.target) else {
                        return Ok(ContactStep::Invalidated);
                    };
                    let installed = &core.state.installed;
                    let valid = action
                        .target_life
                        .is_some_and(|life| may_target(installed, source, target, life))
                        && action
                            .definition_id
                            .as_deref()
                            .and_then(|id| profile(installed, source, id))
                            .is_some_and(|definition| {
                                Some(definition.version) == action.definition_version
                            })
                        && !installed
                            .capabilities
                            .capability_blocked(Some(source), "actions")?;
                    if !valid {
                        return Ok(ContactStep::Invalidated);
                    }
                    self.binding.serial = core.journal.next_provider_serial()?;
                    self.sight = Some(
                        SightBatch::prepare(
                            &core.state.physical,
                            installed,
                            &self.source,
                            &[&self.target],
                            self.binding,
                            &self.budget,
                        )
                        .map_err(crate::native_controller::sensor_error)?,
                    );
                    self.phase = Phase::Sight;
                    return Ok(ContactStep::Geometry);
                }
                Phase::Sight => {
                    let Some(ContactAnswer::Geometry(visible)) = answer.take() else {
                        return Err(ExecutionError::UnfinishedOccurrence);
                    };
                    let visible = self
                        .sight
                        .take()
                        .ok_or(ExecutionError::Invariant)?
                        .finish(visible)
                        .map_err(crate::native_controller::sensor_error)?;
                    if visible.seen(&self.target) != Some(true) {
                        return Ok(ContactStep::Invalidated);
                    }
                    let epsilon = core.state.installed.time_epsilon;
                    if !core.physical().advance_timed_work(
                        &self.source,
                        &self.action,
                        self.seconds,
                        epsilon,
                    )? {
                        return Ok(ContactStep::AdvanceComplete);
                    }
                    let (source, action) = self.source(core)?;
                    let definition = profile(
                        &core.state.installed,
                        source,
                        action
                            .definition_id
                            .as_deref()
                            .ok_or(ExecutionError::Invariant)?,
                    )
                    .ok_or(ExecutionError::Invariant)?;
                    let target = core
                        .state
                        .physical
                        .entities
                        .get(&self.target)
                        .ok_or(ExecutionError::Invariant)?;
                    if let Some(ray) = crate::geometry::interaction_reach(
                        source,
                        target,
                        definition.range,
                        &self.budget,
                    )? {
                        self.reserve(size_of::<GeometryQueries>() + size_of::<SightRay>())?;
                        self.binding.serial = core.journal.next_provider_serial()?;
                        let mut queries = GeometryQueries::new(self.binding);
                        queries.sight = vec![ray];
                        self.impact = Some(queries);
                        self.phase = Phase::Reach;
                        return Ok(ContactStep::Geometry);
                    }
                    self.hit_reason = Some("out-of-range");
                    self.phase = Phase::Result;
                }
                Phase::Reach => {
                    let Some(ContactAnswer::Geometry(mut reach)) = answer.take() else {
                        return Err(ExecutionError::UnfinishedOccurrence);
                    };
                    self.impact
                        .take()
                        .ok_or(ExecutionError::Invariant)?
                        .validate_answers(&reach)
                        .map_err(|_| ExecutionError::Invariant)?;
                    self.hit_reason = Some("out-of-range");
                    self.phase = Phase::Result;
                    if reach.sight.pop() == Some(true) {
                        self.begin_impact(core)?;
                    }
                }
                Phase::Body => {
                    let answer = match answer.take() {
                        None => None,
                        Some(ContactAnswer::Occurrence(done)) => Some(BodyAnswer::Occurrence(done)),
                        Some(ContactAnswer::Personal(done)) => Some(BodyAnswer::Personal(done)),
                        Some(ContactAnswer::Geometry(_)) => {
                            return Err(ExecutionError::UnfinishedOccurrence);
                        }
                    };
                    match self
                        .body
                        .as_mut()
                        .ok_or(ExecutionError::Invariant)?
                        .step(core, answer)?
                    {
                        BodyStep::Occurrence(event) => return Ok(ContactStep::Occurrence(event)),
                        BodyStep::Personal(_) => return Ok(ContactStep::Personal),
                        BodyStep::Complete => {
                            self.body = None;
                            if self.health_after(core)? < self.health_before {
                                self.status_ids =
                                    core.interrupt_status_ids(&self.target, "injury")?;
                                self.phase = Phase::Interrupt;
                            } else {
                                self.phase = Phase::BodyEvent;
                            }
                        }
                    }
                }
                Phase::Interrupt => {
                    if let Some(pending) = self.pending_status.take() {
                        let Some(ContactAnswer::Personal(done)) = answer.take() else {
                            return Err(ExecutionError::UnfinishedOccurrence);
                        };
                        if let Some(step) = self.status_result(pending.resume(core, &done)?)? {
                            return Ok(step);
                        }
                        continue;
                    }
                    if let Some(id) = self.status_ids.get(self.status_index) {
                        self.status_index += 1;
                        let status = core.deactivate_status(&self.target, id, "injury")?;
                        if let Some(step) = self.status_result(status)? {
                            return Ok(step);
                        }
                        continue;
                    }
                    self.interrupt_contact(core)?;
                    self.phase = Phase::BodyEvent;
                }
                Phase::BodyEvent => {
                    self.phase = Phase::Result;
                    let event = self.body_event(core)?;
                    return self.wait_for(event);
                }
                Phase::Result => {
                    self.phase = Phase::Done;
                    let event = self.result_event(core)?;
                    return self.wait_for(event);
                }
                Phase::Done => return Ok(ContactStep::AdvanceComplete),
            }
        }
    }

    fn wait_for(&mut self, event: StagedOccurrence) -> Result<ContactStep, ExecutionError> {
        self.reserve(event.id.len())?;
        self.event = Some(event.id.clone());
        Ok(ContactStep::Occurrence(event))
    }

    fn status_result(&mut self, status: StatusEnd) -> Result<Option<ContactStep>, ExecutionError> {
        match status {
            StatusEnd::Unchanged | StatusEnd::Complete => Ok(None),
            StatusEnd::Occurrence(event) => self.wait_for(event).map(Some),
            StatusEnd::Personal(pending) => {
                self.pending_status = Some(pending);
                Ok(Some(ContactStep::Personal))
            }
        }
    }

    fn health_after(&self, core: &CoreMutation<'_>) -> Result<f64, ExecutionError> {
        Ok(core
            .state
            .physical
            .entities
            .get(&self.target)
            .and_then(|target| target.actor.as_ref())
            .ok_or(ExecutionError::Invariant)?
            .health)
    }

    fn begin_impact(&mut self, core: &mut CoreMutation<'_>) -> Result<(), ExecutionError> {
        let (source, action) = self.source(core)?;
        let installed = &core.state.installed;
        let definition = profile(
            installed,
            source,
            action
                .definition_id
                .as_deref()
                .ok_or(ExecutionError::Invariant)?,
        )
        .ok_or(ExecutionError::Invariant)?;
        let target = core
            .state
            .physical
            .entities
            .get(&self.target)
            .ok_or(ExecutionError::Invariant)?;
        let actor = target.actor.as_ref().ok_or(ExecutionError::Invariant)?;
        let body = actor.body.as_ref().ok_or(ExecutionError::MissingBody)?;
        let policy = installed.body_policy.as_ref().map(|policy| policy.value());
        let accuracy = definition.accuracy.unwrap_or(1.0);
        let raw_injury = definition.damage
            * scar_factor(policy, source, ScarEffect::OutgoingInjury)
            * body.susceptibility.injury
            * scar_factor(policy, target, ScarEffect::IncomingInjury);
        let health_before = actor.health;
        // Match the selected Source guaranteed-contact path. Ineligible sight
        // or reach never spends a draw. See AC09.6 for the shared RNG follow-up.
        if accuracy != 1.0 && core.physical().draw() >= accuracy {
            self.hit_reason = Some("accuracy");
            return Ok(());
        }
        self.hit_reason = Some("hit");
        self.health_before = health_before;
        self.raw_injury = raw_injury;
        self.body = Some(HealthChangeCursor::new(
            core,
            &self.target,
            -raw_injury,
            &self.action,
            None,
            None,
            &self.budget,
        )?);
        self.phase = Phase::Body;
        Ok(())
    }

    fn interrupt_contact(&mut self, core: &mut CoreMutation<'_>) -> Result<(), ExecutionError> {
        let Some(target) = core.state.physical.entities.get(&self.target) else {
            return Err(ExecutionError::Invariant);
        };
        let Some(action) = target
            .actor
            .as_ref()
            .and_then(|actor| actor.action.as_ref())
            .filter(|action| action.strike_phase == Some(StrikePhase::Windup))
        else {
            return Ok(());
        };
        let seconds = action
            .definition_id
            .as_deref()
            .and_then(|id| profile(&core.state.installed, target, id))
            .and_then(|definition| definition.recovery_seconds)
            .ok_or(ExecutionError::Invariant)?;
        let deadline = core.state.physical.header.sim_time + seconds;
        let message = &core
            .state
            .installed
            .ordinary_actions
            .value()
            .natural_contact
            .interrupted;
        self.reserve(action.id.len() + message.len())?;
        let id = action.id.clone();
        let result = crate::commands::Outcome {
            ok: false,
            code: "interrupted".into(),
            message: message.clone().into(),
            spent: None,
            outputs: None,
            entity_id: None,
            recipe_id: None,
            item_id: None,
            goal_id: None,
            plan_id: None,
            action_id: None,
        };
        core.physical()
            .retain_combat_recovery(&self.target, deadline)?;
        if !matches!(
            core.begin_finish_action(&self.target, &id, result)?,
            ActionFinish::Complete(_)
        ) {
            // This currently admits only autonomous contact, which creates no personal activity result.
            return Err(ExecutionError::Invariant);
        }
        core.physical().replace_action(
            &self.target,
            None,
            ActionWrite {
                generation: PlanGenerationWrite::Preserve,
                behavior: None,
            },
        )?;
        Ok(())
    }

    fn body_event(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<StagedOccurrence, ExecutionError> {
        let changed = &core
            .state
            .installed
            .ordinary_actions
            .value()
            .natural_contact
            .body_changed;
        self.reserve(512 + 3 * self.target.len() + changed.len() + self.action.len())?;
        let data = IndexMap::from([
            (
                "effectId".into(),
                EventScalar::Text(self.action.clone().into()),
            ),
            (
                "healthDelta".into(),
                EventScalar::Number(self.health_after(core)? - self.health_before),
            ),
            ("wetnessDelta".into(), EventScalar::Number(0.0)),
            ("burningDelta".into(), EventScalar::Number(0.0)),
        ]);
        core.stage_event(EventEmissionIntent {
            event_type: "body-effect".into(),
            text: EmissionText::Narration(Narration {
                parts: vec![
                    NarrationPart::Participant {
                        entity_id: self.target.clone(),
                        role: PersonRole::Possessive,
                        article: None,
                    },
                    NarrationPart::Literal(changed.clone().into()),
                ],
            }),
            audience: AudienceSelection::Physical,
            source_id: Some(self.target.clone()),
            target_id: Some(self.target.clone()),
            data: Some(data),
            scope: EventScope::External,
            origin: None,
            exposure: None,
        })
    }

    fn result_event(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<StagedOccurrence, ExecutionError> {
        let (source, action) = self.source(core)?;
        let installed = std::sync::Arc::clone(&core.state.installed);
        let definition = profile(
            &installed,
            source,
            action
                .definition_id
                .as_deref()
                .ok_or(ExecutionError::Invariant)?,
        )
        .ok_or(ExecutionError::Invariant)?;
        let recovery = definition
            .recovery_seconds
            .ok_or(ExecutionError::Invariant)?;
        let reason = self.hit_reason.ok_or(ExecutionError::Invariant)?;
        let hit = reason == "hit";
        let rules = &installed.ordinary_actions.value().natural_contact;
        let suffix = if hit {
            &rules.connected
        } else if reason == "out-of-range" {
            &rules.out_of_range
        } else {
            ""
        };
        self.reserve(
            2048 + 3 * (self.source.len() + self.target.len())
                + self.action.len()
                + definition.id.len()
                + definition.past_tense.storage_bytes()
                + rules.missed.len()
                + suffix.len(),
        )?;
        let mut data = IndexMap::from([
            (
                "definitionId".into(),
                EventScalar::Text(definition.id.clone().into()),
            ),
            (
                "actionId".into(),
                EventScalar::Text(self.action.clone().into()),
            ),
            ("hit".into(), EventScalar::Boolean(hit)),
            (
                "damage".into(),
                EventScalar::Number(if hit {
                    self.health_before - self.health_after(core)?
                } else {
                    0.0
                }),
            ),
            ("reason".into(), EventScalar::Text(reason.into())),
            ("targetReference".into(), EventScalar::Boolean(true)),
            ("semanticTrigger".into(), EventScalar::Boolean(true)),
        ]);
        if hit {
            if let Some(policy) = installed
                .body_policy
                .as_ref()
                .and_then(|body| body.value().combat.as_ref())
            {
                data.insert(
                    "importance".into(),
                    EventScalar::Number(policy.impact_attention.importance),
                );
                data.insert(
                    "urgency".into(),
                    EventScalar::Number(policy.impact_attention.urgency),
                );
            }
            data.insert("contactInjury".into(), EventScalar::Boolean(true));
            data.insert("preventedInjury".into(), EventScalar::Number(0.0));
            data.insert("rawInjury".into(), EventScalar::Number(self.raw_injury));
            data.insert(
                "healthBefore".into(),
                EventScalar::Number(self.health_before),
            );
            data.insert(
                "healthAfter".into(),
                EventScalar::Number(self.health_after(core)?),
            );
        }
        core.physical().start_contact_recovery(
            &self.source,
            &self.action,
            if hit {
                StrikeOutcome::Hit
            } else {
                StrikeOutcome::Miss
            },
            recovery,
        )?;
        let mut prefix = crate::text::JsText::from(" ");
        let verb = if hit {
            definition.past_tense.clone()
        } else {
            rules.missed.clone().into()
        };
        crate::text::TextRef::from(&verb).append_to(&mut prefix);
        crate::text::TextRef::from(" ").append_to(&mut prefix);
        core.stage_event(EventEmissionIntent {
            event_type: "struck".into(),
            text: EmissionText::Narration(Narration {
                parts: vec![
                    NarrationPart::Participant {
                        entity_id: self.source.clone(),
                        role: PersonRole::Subject,
                        article: None,
                    },
                    NarrationPart::Literal(prefix),
                    NarrationPart::Participant {
                        entity_id: self.target.clone(),
                        role: PersonRole::Object,
                        article: None,
                    },
                    NarrationPart::Literal(if suffix.is_empty() {
                        ".".into()
                    } else {
                        format!(". {suffix}").into()
                    }),
                ],
            }),
            audience: AudienceSelection::Physical,
            source_id: Some(self.source.clone()),
            target_id: Some(self.target.clone()),
            data: Some(data),
            scope: EventScope::External,
            origin: None,
            exposure: None,
        })
    }
}
