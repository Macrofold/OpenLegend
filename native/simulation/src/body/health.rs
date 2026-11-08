//! Passive health changes retain real lifecycle and private condition effects;
//! combat interruption and waking belong to the separate combat owner.
use super::{BodyAnswer, BodyReconcileCursor, BodyStep};
use crate::conditions::can_notice_internal_change;
use crate::events::{AudienceSelection, EmissionText, EventEmissionIntent, EventScope};
use crate::execution::{CoreMutation, ExecutionError, StagedOccurrence};
use crate::host::retained_size::{heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::narration::{Narration, NarrationPart, PersonRole, display_number};
use crate::reception::EventScalar;
use crate::status::{AttributeSchema, attribute_range, read_attribute};
use crate::values::AttributeValue;
use indexmap::IndexMap;
use std::mem::size_of;

pub(crate) struct HealthChangeCursor {
    actor: String,
    cause: String,
    cause_label: Option<String>,
    cause_meaning: Option<String>,
    before: f64,
    reconcile: Option<BodyReconcileCursor>,
    event: Option<String>,
    done: bool,
    reservation: ByteReservation,
}
impl HealthChangeCursor {
    pub(crate) fn new(
        core: &mut CoreMutation<'_>,
        actor: &str,
        delta: f64,
        cause: &str,
        cause_label: Option<&str>,
        cause_meaning: Option<&str>,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let reservation = budget.reserve(
            heap_sum([
                size_of::<Self>(),
                actor.len(),
                cause.len(),
                cause_label.map_or(0, str::len),
                cause_meaning.map_or(0, str::len),
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let before = core
            .state
            .physical
            .entities
            .get(actor)
            .and_then(|e| e.actor.as_ref())
            .ok_or(ExecutionError::MissingActor)?
            .health;
        let installed = core.state.installed.clone();
        let definition = installed
            .attributes
            .values()
            .find(|d| d.value().implementation == "native-health-v1")
            .map(|d| d.value());
        let reconcile = BodyReconcileCursor::new(actor, cause, budget)?;
        core.physical()
            .set_health(actor, before + delta, definition)?;
        Ok(Self {
            actor: actor.into(),
            cause: cause.into(),
            cause_label: cause_label.map(str::to_owned),
            cause_meaning: cause_meaning.map(str::to_owned),
            before,
            reconcile: Some(reconcile),
            event: None,
            done: false,
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
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<BodyAnswer>,
    ) -> Result<BodyStep<'a>, ExecutionError> {
        if self.reconcile.is_some() {
            // Keep borrowing of personal continuations in this helper, rather
            // than retaining a second copy of the active activity/history.
            return self.reconcile_step(core, answer);
        }
        if let Some(BodyAnswer::Occurrence(event)) = answer {
            if self.event.as_deref() != Some(event.event_id()) {
                return Err(ExecutionError::UnfinishedOccurrence);
            }
            self.event = None;
            self.done = true;
        } else if answer.is_some() || self.event.is_some() {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        if self.done {
            return Ok(BodyStep::Complete);
        }
        if let Some(event) = self.record(core)? {
            return Ok(BodyStep::Occurrence(event));
        }
        self.done = true;
        Ok(BodyStep::Complete)
    }
    fn reconcile_step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<BodyAnswer>,
    ) -> Result<BodyStep<'a>, ExecutionError> {
        // The body cursor's continuation must remain owned until the caller
        // supplies its sealed completion. Rust's separate progress dispatch
        // avoids any cloning of that borrowed personal product.
        let progress = self
            .reconcile
            .as_mut()
            .ok_or(ExecutionError::Invariant)?
            .progress(core, answer)?;
        match progress {
            super::reconcile::Progress::Occurrence(event) => Ok(BodyStep::Occurrence(event)),
            super::reconcile::Progress::Personal => Ok(BodyStep::Personal(
                self.reconcile
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?
                    .personal()?,
            )),
            super::reconcile::Progress::Complete => {
                self.reconcile = None;
                if let Some(event) = self.record(core)? {
                    Ok(BodyStep::Occurrence(event))
                } else {
                    self.done = true;
                    Ok(BodyStep::Complete)
                }
            }
        }
    }
    fn record(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<Option<StagedOccurrence>, ExecutionError> {
        let installed = core.state.installed.clone();
        let Some(definition) = installed
            .attributes
            .values()
            .find(|d| d.value().implementation == "native-health-v1")
            .map(|d| d.value())
        else {
            return Ok(None);
        };
        let entity = core
            .state
            .physical
            .entities
            .get(&self.actor)
            .ok_or(ExecutionError::MissingEntity)?;
        let actor = entity.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
        if actor.health == self.before
            || (definition.disclosure == "owner"
                && !can_notice_internal_change(&installed, entity)?)
        {
            return Ok(None);
        }
        let body = actor.body.as_ref().ok_or(ExecutionError::MissingBody)?;
        let (min, max) =
            attribute_range(Some(entity), definition).ok_or(ExecutionError::Invariant)?;
        let before = if definition
            .native_health
            .as_ref()
            .is_some_and(|h| h.units == "points")
        {
            self.before
        } else {
            min + (self.before / body.max_health) * (max - min)
        };
        let Some(AttributeValue::Number(after)) = read_attribute(
            entity,
            definition,
            core.state.physical.pending_values.as_ref(),
        )?
        else {
            return Ok(None);
        };
        let rules = &installed.observation_rules.value().body;
        let damage = after < before;
        let verb = if damage {
            &rules.damaged_verb
        } else {
            &rules.recovered_verb
        };
        let amount = (after - before).abs();
        let integer = definition
            .native_health
            .as_ref()
            .is_some_and(|h| h.precision == "whole-points");
        let unit = match &definition.schema {
            AttributeSchema::Number { unit, .. } => unit.as_str(),
            _ => "",
        };
        self.reserve(
            heap_sum([
                map_storage::<String, EventScalar>(14).ok_or(ExecutionError::Capacity)?,
                3 * size_of::<NarrationPart>(),
                self.actor.len() * 2,
                self.cause.len(),
                self.cause_label.as_ref().map_or(0, String::len),
                self.cause_meaning.as_ref().map_or(0, String::len),
                definition.name.len() * 4,
                definition.meaning.as_ref().map_or(0, String::len),
                definition.id.len(),
                unit.len(),
                verb.len(),
                rules.damage_name.len(),
                2048,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let amount = display_number(amount, integer).map_err(|_| ExecutionError::Invariant)?;
        let health_name = if damage {
            rules.damage_name.clone()
        } else {
            definition.name.to_lowercase()
        };
        let text = EmissionText::Narration(Narration {
            parts: vec![
                NarrationPart::Participant {
                    entity_id: self.actor.clone(),
                    role: PersonRole::Subject,
                    article: None,
                },
                NarrationPart::Literal(format!(" {verb} {amount} {health_name}.").into()),
            ],
        });
        let mut data = IndexMap::with_capacity(14);
        data.insert("changeKind".into(), EventScalar::Text("health".into()));
        data.insert(
            "attributeId".into(),
            EventScalar::Text((definition.id.clone()).into()),
        );
        data.insert(
            "definitionVersion".into(),
            EventScalar::Number(definition.version as f64),
        );
        data.insert(
            "attributeRevision".into(),
            EventScalar::Number(body.revision as f64),
        );
        data.insert("before".into(), EventScalar::Number(before));
        data.insert("after".into(), EventScalar::Number(after));
        data.insert("unit".into(), EventScalar::Text(unit.into()));
        data.insert(
            "cause".into(),
            EventScalar::Text((self.cause.clone()).into()),
        );
        if let Some(label) = self.cause_label.as_ref().filter(|v| !v.is_empty()) {
            data.insert(
                "causeLabel".into(),
                EventScalar::Text((label.clone()).into()),
            );
        }
        if let Some(meaning) = self.cause_meaning.as_ref().filter(|v| !v.is_empty()) {
            data.insert(
                "causeMeaning".into(),
                EventScalar::Text((meaning.clone()).into()),
            );
        }
        data.insert(
            "attributeName".into(),
            EventScalar::Text((definition.name.clone()).into()),
        );
        if let Some(meaning) = definition.meaning.as_ref().filter(|v| !v.is_empty()) {
            data.insert(
                "attributeMeaning".into(),
                EventScalar::Text((meaning.clone()).into()),
            );
        }
        let event = core.stage_event(EventEmissionIntent {
            event_type: rules.health_event.clone(),
            text,
            audience: AudienceSelection::Physical,
            source_id: Some(self.actor.clone()),
            target_id: None,
            data: Some(data),
            scope: if definition.disclosure == "public" {
                EventScope::External
            } else {
                EventScope::Private
            },
            origin: None,
            exposure: None,
        })?;
        self.reserve(event.id.len())?;
        self.event = Some(event.id.clone());
        Ok(Some(event))
    }
}
