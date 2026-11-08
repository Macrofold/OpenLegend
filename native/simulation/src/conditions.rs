//! Actual owner-private condition episodes over projected current attributes.
//! The caller completes every real occurrence before the next definition runs.
use crate::events::{
    AudienceSelection, CompletedOccurrence, EmissionText, EventEmissionIntent, EventScope,
};
use crate::execution::{CoreMutation, ExecutionError, StagedOccurrence};
use crate::host::retained_size::{heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::reception::EventScalar;
use crate::state::{ConditionEpisode, Entity};
use crate::status::{AttributeSchema, ConditionPolicy, read_attribute};
use crate::values::AttributeValue;
use indexmap::IndexMap;
use std::mem::size_of;

pub(crate) fn condition_severity(policy: &ConditionPolicy, value: f64) -> u64 {
    policy
        .bands
        .iter()
        .filter(|band| {
            if band.inclusive == Some(true) {
                value <= band.below
            } else {
                value < band.below
            }
        })
        .count() as u64
}
pub(crate) fn can_notice_internal_change(
    installed: &crate::simulation::InstalledWorld,
    entity: &Entity,
) -> Result<bool, ExecutionError> {
    let Some(actor) = &entity.actor else {
        return Ok(false);
    };
    Ok(actor.alive
        && !actor.incapacitated
        && actor
            .capabilities
            .as_ref()
            .is_none_or(|capabilities| capabilities.cognition)
        && !installed
            .capabilities
            .capability_blocked(Some(entity), "actions")?)
}
pub(crate) fn next_condition_review(entity: &Entity) -> f64 {
    let Some(actor) = entity
        .actor
        .as_ref()
        .filter(|actor| actor.alive && !actor.incapacitated)
    else {
        return f64::INFINITY;
    };
    actor
        .conditions
        .iter()
        .flat_map(|conditions| conditions.values())
        .filter(|condition| !condition.pending)
        .filter_map(|condition| condition.next_review_at)
        .fold(f64::INFINITY, f64::min)
}
#[derive(Clone, Copy)]
struct Notice {
    definition: usize,
    value: f64,
    severity: u64,
    revision: u64,
    critical: bool,
    changed_policy: bool,
    due: bool,
    recovery: bool,
    notice: bool,
}
pub(crate) enum ConditionReconcileStep {
    Occurrence(StagedOccurrence),
    Complete,
}
pub(crate) struct ConditionReconcileCursor {
    actor: String,
    life: Option<u64>,
    definition: usize,
    cleanup: usize,
    pending: Option<Notice>,
    event: Option<String>,
    done: bool,
    _reservation: ByteReservation,
}
impl ConditionReconcileCursor {
    pub(crate) fn new(actor: &str, budget: &ByteBudget) -> Result<Self, ExecutionError> {
        let reservation = budget.reserve(
            size_of::<Self>()
                .checked_add(actor.len())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(Self {
            actor: actor.into(),
            life: None,
            definition: 0,
            cleanup: 0,
            pending: None,
            event: None,
            done: false,
            _reservation: reservation,
        })
    }
    fn reserve(&mut self, bytes: usize) -> Result<(), ExecutionError> {
        self._reservation.resize(
            self._reservation
                .bytes()
                .checked_add(bytes)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(())
    }
    pub(crate) fn step(
        &mut self,
        core: &mut CoreMutation<'_>,
        completed: Option<CompletedOccurrence>,
    ) -> Result<ConditionReconcileStep, ExecutionError> {
        if let Some(completed) = completed {
            if self.event.as_deref() != Some(completed.event_id()) {
                return Err(ExecutionError::UnfinishedOccurrence);
            }
            self.event = None;
        } else if self.event.is_some() {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        let installed = core.state.installed.clone();
        loop {
            if self.done {
                return Ok(ConditionReconcileStep::Complete);
            }
            let entity = core
                .state
                .physical
                .entities
                .get(&self.actor)
                .ok_or(ExecutionError::MissingEntity)?;
            let Some(actor) = entity.actor.as_ref() else {
                self.done = true;
                continue;
            };
            if let Some(life) = self.life {
                if entity.physical_life() != Some(life) {
                    return Err(ExecutionError::Invariant);
                }
            } else {
                self.life = entity.physical_life();
            }
            if !entity.has_memory() || !entity.actively_participates() {
                self.done = true;
                continue;
            }
            if let Some(mut pending) = self.pending {
                let recovery = pending.recovery;
                if recovery || pending.notice {
                    if recovery {
                        pending.recovery = false;
                    } else {
                        pending.notice = false;
                    }
                    self.pending = Some(pending);
                    let event = self.emit(core, pending, recovery)?;
                    self.event = Some(event.id.clone());
                    return Ok(ConditionReconcileStep::Occurrence(event));
                }
                self.pending = None;
                continue;
            }
            if self.definition < installed.attributes.len() {
                let index = self.definition;
                self.definition += 1;
                let definition = installed
                    .attributes
                    .get_index(index)
                    .ok_or(ExecutionError::Invariant)?
                    .1
                    .value();
                let Some(policy) = &definition.condition else {
                    continue;
                };
                let Some(AttributeValue::Number(value)) = read_attribute(
                    entity,
                    definition,
                    core.state.physical.pending_values.as_ref(),
                )?
                else {
                    continue;
                };
                let severity = condition_severity(policy, value);
                let prior = actor
                    .conditions
                    .as_ref()
                    .and_then(|conditions| conditions.get(&definition.id));
                let changed_policy = prior.is_none_or(|prior| prior.version != definition.version);
                let mut notified = if changed_policy {
                    0
                } else {
                    prior.ok_or(ExecutionError::Invariant)?.notified
                };
                while notified > severity
                    && value
                        >= policy
                            .bands
                            .get((notified - 1) as usize)
                            .ok_or(ExecutionError::Invariant)?
                            .below
                            + policy.recovery_margin
                {
                    notified -= 1;
                }
                let due = prior
                    .and_then(|prior| prior.next_review_at)
                    .is_some_and(|at| core.state.physical.header.sim_time >= at);
                let pending = severity > 0
                    && (changed_policy
                        || prior.is_some_and(|prior| prior.pending)
                        || severity > notified
                        || due);
                let can_notice = can_notice_internal_change(&installed, entity)?;
                let notice = pending && can_notice;
                let critical = severity >= policy.critical_severity;
                let next_review_at = if critical {
                    if notice
                        || changed_policy
                        || prior.is_none_or(|prior| prior.next_review_at.is_none())
                    {
                        Some(core.state.physical.header.sim_time + policy.review_seconds)
                    } else {
                        prior.and_then(|prior| prior.next_review_at)
                    }
                } else {
                    None
                };
                let next_notified = if notice { severity } else { notified };
                if prior.is_some_and(|prior| {
                    !changed_policy
                        && prior.severity == severity
                        && prior.notified == next_notified
                        && prior.pending == (pending && !notice)
                        && prior.next_review_at == next_review_at
                }) {
                    continue;
                }
                let revision = prior
                    .map_or(0, |prior| prior.revision)
                    .checked_add(1)
                    .filter(|revision| *revision <= crate::identity::MAX_SAFE_INTEGER)
                    .ok_or(ExecutionError::Invariant)?;
                let recovery = prior.is_some_and(|prior| severity < prior.severity) && can_notice;
                core.physical().put_condition(
                    &self.actor,
                    &definition.id,
                    Some(ConditionEpisode {
                        version: definition.version,
                        severity,
                        notified: next_notified,
                        revision,
                        pending: pending && !notice,
                        next_review_at,
                    }),
                )?;
                self.pending = Some(Notice {
                    definition: index,
                    value,
                    severity,
                    revision,
                    critical,
                    changed_policy,
                    due,
                    recovery,
                    notice,
                });
                continue;
            }
            let Some((id, _)) = actor
                .conditions
                .as_ref()
                .and_then(|conditions| conditions.get_index(self.cleanup))
            else {
                self.done = true;
                continue;
            };
            let keep = if let Some(definition) = installed
                .attributes
                .get(id)
                .filter(|definition| definition.value().condition.is_some())
            {
                matches!(
                    read_attribute(
                        entity,
                        definition.value(),
                        core.state.physical.pending_values.as_ref()
                    )?,
                    Some(AttributeValue::Number(_))
                )
            } else {
                false
            };
            if keep {
                self.cleanup += 1;
            } else {
                self.reserve(id.len())?;
                let id = id.clone();
                core.physical().put_condition(&self.actor, &id, None)?;
            }
        }
    }
    fn emit(
        &mut self,
        core: &mut CoreMutation<'_>,
        notice: Notice,
        recovery: bool,
    ) -> Result<StagedOccurrence, ExecutionError> {
        let installed = core.state.installed.clone();
        let rules = &installed.observation_rules.value().conditions;
        let definition = installed
            .attributes
            .get_index(notice.definition)
            .ok_or(ExecutionError::Invariant)?
            .1
            .value();
        let policy = definition
            .condition
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        let entity = core
            .state
            .physical
            .entities
            .get(&self.actor)
            .ok_or(ExecutionError::MissingEntity)?;
        let template = if notice.severity == 0 {
            &policy.clear_text
        } else {
            &policy
                .bands
                .get((notice.severity - 1) as usize)
                .ok_or(ExecutionError::Invariant)?
                .text
        };
        let unit = match &definition.schema {
            AttributeSchema::Number { unit, .. } => unit.as_str(),
            _ => "",
        };
        let numeric = crate::encoding::json_record_len(&notice.value)
            .map_err(|_| ExecutionError::Invariant)?;
        self.reserve(
            heap_sum([
                crate::status::own_template_bound(template, entity)
                    .map_err(ExecutionError::from)?,
                definition.name.len(),
                unit.len(),
                numeric.checked_mul(4).ok_or(ExecutionError::Capacity)?,
                self.actor
                    .len()
                    .checked_mul(3)
                    .ok_or(ExecutionError::Capacity)?,
                definition.id.len(),
                rules.event_type.len(),
                map_storage::<String, EventScalar>(9).ok_or(ExecutionError::Capacity)?,
                256,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let condition = crate::status::own_text(template, entity);
        let value =
            crate::encoding::json_record(&notice.value).map_err(|_| ExecutionError::Invariant)?;
        let suffix: crate::text::JsText = format!(" {}: {value}{unit}.", definition.name).into();
        let text = crate::text::JsText::concat(&[&condition, &suffix]);
        let mut data = IndexMap::with_capacity(if recovery { 5 } else { 9 });
        data.insert(
            "attributeId".into(),
            EventScalar::Text((definition.id.clone()).into()),
        );
        if !recovery {
            data.insert(
                "definitionVersion".into(),
                EventScalar::Number(definition.version as f64),
            );
            data.insert(
                "conditionRevision".into(),
                EventScalar::Number(notice.revision as f64),
            );
        }
        data.insert(
            "severity".into(),
            EventScalar::Number(notice.severity as f64),
        );
        data.insert("value".into(), EventScalar::Number(notice.value));
        if recovery {
            data.insert("change".into(), EventScalar::Text("recovery".into()));
            data.insert(
                "importance".into(),
                EventScalar::Number(rules.recovery_importance),
            );
        } else {
            data.insert("semanticTrigger".into(), EventScalar::Boolean(true));
            data.insert("importance".into(), EventScalar::Number(rules.importance));
            data.insert(
                "urgency".into(),
                EventScalar::Number(if notice.critical {
                    rules.critical_urgency
                } else {
                    rules.urgency
                }),
            );
            data.insert(
                "change".into(),
                EventScalar::Text(
                    (if notice.changed_policy {
                        "initial"
                    } else if notice.due {
                        "review"
                    } else {
                        "worsening"
                    })
                    .into(),
                ),
            );
        }
        core.stage_event(EventEmissionIntent {
            event_type: rules.event_type.clone(),
            text: EmissionText::Literal((text).into()),
            audience: AudienceSelection::Explicit(vec![self.actor.clone()]),
            source_id: Some(self.actor.clone()),
            target_id: None,
            data: Some(data),
            scope: EventScope::Private,
            origin: None,
            exposure: None,
        })
    }
}
