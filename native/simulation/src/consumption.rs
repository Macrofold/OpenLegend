//! Read-only admission for one carried unit. Installed definitions own the
//! meter, the amount and the permitted wording. The command owns the debit.
use crate::body::ConsumptionPolicy;
use crate::execution::ExecutionError;
use crate::install::ItemDefinitionRead;
use crate::simulation::{InstalledWorld, PhysicalState};
use crate::state::Entity;
use crate::status::{AttributeDefinition, AttributeSchema};
use crate::values::AttributeValue;
use crate::{
    events::{AudienceSelection, EmissionText, EventEmissionIntent, EventScope},
    narration::{Narration, NarrationPart, PersonRole, display_number},
    reception::EventScalar,
};
use indexmap::IndexMap;

pub(crate) struct Eater<'a> {
    pub policy: &'a ConsumptionPolicy,
    pub meter: &'a AttributeDefinition,
    pub before: f64,
    pub maximum: f64,
}

impl<'a> Eater<'a> {
    pub(crate) fn current(
        installed: &'a InstalledWorld,
        state: &PhysicalState,
        actor: &Entity,
    ) -> Result<Option<Self>, ExecutionError> {
        let Some(policy) = installed
            .body_policy
            .as_ref()
            .and_then(|body| body.value().consumption.as_ref())
        else {
            return Ok(None);
        };
        let Some(meter) = installed.attributes.get(&policy.attribute_id) else {
            return Ok(None);
        };
        let meter = meter.value();
        let AttributeSchema::Number { max, .. } = meter.schema else {
            return Ok(None);
        };
        let Some(AttributeValue::Number(before)) =
            installed.status_read(state).value(&actor.id, &meter.id)?
        else {
            return Ok(None);
        };
        if policy.quantity_property != "nutrition"
            || meter.implementation != "number-v1"
            || meter.reservoir.is_some()
        {
            return Ok(None);
        }
        Ok(Some(Self {
            policy,
            meter,
            before,
            maximum: max,
        }))
    }

    pub(crate) fn portion(&self, item: &ItemDefinitionRead) -> Result<f64, &'a str> {
        if let Some(refusal) = self
            .policy
            .refusals
            .iter()
            .find(|entry| entry.item_type == item.pin.id)
        {
            return Err(&refusal.reason);
        }
        item.nutrition
            .filter(|amount| *amount > 0.0)
            .ok_or(&self.policy.unavailable_text)
    }
}

/// Build the same one-off numeric witness as the Source state owner. The
/// caller funds this intent and stages it after the authoritative write.
pub(crate) fn notice(
    installed: &InstalledWorld,
    actor: &Entity,
    meter: &AttributeDefinition,
    before: f64,
    after: f64,
) -> Result<Option<EventEmissionIntent>, ExecutionError> {
    let private = meter.disclosure == "owner";
    if before == after
        || (private && !crate::conditions::can_notice_internal_change(installed, actor)?)
    {
        return Ok(None);
    }
    let AttributeSchema::Number { unit, .. } = &meter.schema else {
        return Err(ExecutionError::Invariant);
    };
    let revision = actor
        .stored_attributes()
        .and_then(|values| values.get(&meter.id))
        .ok_or(ExecutionError::Invariant)?
        .revision;
    let number = |value| display_number(value, false).map_err(|_| ExecutionError::Invariant);
    let mut data = IndexMap::from([
        (
            "attributeId".into(),
            EventScalar::Text(meter.id.as_str().into()),
        ),
        (
            "definitionVersion".into(),
            EventScalar::Number(meter.version as f64),
        ),
        (
            "attributeName".into(),
            EventScalar::Text(meter.name.as_str().into()),
        ),
        (
            "attributeRevision".into(),
            EventScalar::Number(revision as f64),
        ),
        ("before".into(), EventScalar::Number(before)),
        ("after".into(), EventScalar::Number(after)),
        ("unit".into(), EventScalar::Text(unit.as_str().into())),
        ("cause".into(), EventScalar::Text("consumption".into())),
    ]);
    if let Some(meaning) = &meter.meaning {
        data.insert(
            "attributeMeaning".into(),
            EventScalar::Text(meaning.as_str().into()),
        );
    }
    Ok(Some(EventEmissionIntent {
        event_type: "attribute-changed".into(),
        text: EmissionText::Narration(Narration {
            parts: vec![
                NarrationPart::Participant {
                    entity_id: actor.id.clone(),
                    role: PersonRole::Subject,
                    article: None,
                },
                NarrationPart::Literal(
                    format!(
                        " {} changed from {}{unit} to {}{unit}.",
                        meter.name,
                        number(before)?,
                        number(after)?
                    )
                    .into(),
                ),
            ],
        }),
        audience: AudienceSelection::Physical,
        source_id: Some(actor.id.clone()),
        target_id: None,
        data: Some(data),
        scope: if private {
            EventScope::Private
        } else {
            EventScope::External
        },
        origin: None,
        exposure: None,
    }))
}

pub struct EatingOffer<'a> {
    pub label: &'a str,
    pub reason: Option<&'a str>,
}

pub(crate) fn action_problem<'a>(
    installed: &'a InstalledWorld,
    actor: &Entity,
    paused: bool,
) -> Result<Option<&'a crate::worlds::InstalledActionMessage>, ExecutionError> {
    let body = actor.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
    let ordinary = installed.ordinary_actions.value();
    Ok(if !actor.actively_participates() {
        Some(&ordinary.inactive)
    } else if installed
        .capabilities
        .capability_blocked(Some(actor), "actions")?
    {
        Some(&ordinary.actions_restricted)
    } else if paused {
        Some(&ordinary.paused)
    } else if !body.alive || body.incapacitated {
        Some(&ordinary.not_alive)
    } else if actor.supported_position().is_none() {
        Some(&ordinary.unsupported_airborne)
    } else {
        None
    })
}

impl<'a> Eater<'a> {
    pub(crate) fn offer(
        &self,
        food: &ItemDefinitionRead,
        blocked: Option<&'a crate::worlds::InstalledActionMessage>,
    ) -> Option<EatingOffer<'a>> {
        food.nutrition.filter(|value| *value != 0.0)?;
        Some(EatingOffer {
            label: &self.policy.label,
            reason: blocked
                .map(|value| value.message.as_str())
                .or_else(|| self.portion(food).err()),
        })
    }
}
