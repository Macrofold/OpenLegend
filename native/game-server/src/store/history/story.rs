//! Decide whether this occurrence needs the existing narration owner. A
//! currently unsupported positive selection must refuse before acceptance.

use super::super::{Store, StoreError, StoreResult};
use super::perspective::{AwarenessEvidence, TemporalEvidence};
use indexmap::IndexMap;
use openlegend_simulation::{
    events::{EventScope, WorldEvent},
    narration::{NativeText, native_text},
    reception::{EncounterExposure, EventScalar},
    runtime::{HistoryAccount, RuntimeHistory},
};
use serde::Deserialize;

#[derive(Clone, Copy, PartialEq, Deserialize)]
#[serde(rename_all = "lowercase")]
enum Class {
    Actor,
    Object,
    Place,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Policy {
    id: String,
    enabled: bool,
    evaluator: String,
    fields: IndexMap<String, Field>,
    introductions: Introductions,
    event_rules: Vec<Rule>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Field {
    default: f64,
    applies_to: Vec<Class>,
}
#[derive(Deserialize)]
struct Introductions {
    enabled: bool,
    field: String,
    threshold: f64,
}
#[derive(Deserialize)]
#[serde(rename_all = "kebab-case")]
enum Role {
    Source,
    Target,
}
#[derive(Deserialize)]
struct Rule {
    #[serde(rename = "type")]
    event_type: String,
    role: Role,
    field: Option<String>,
    minimum: Option<f64>,
    fact: Option<String>,
    maximum: Option<f64>,
}

impl Store {
    pub(super) fn requires_story(&self, history: &RuntimeHistory) -> StoreResult<bool> {
        let mut audience = history
            .accounts()
            .filter(|account| history.has_story_principal(account.actor_id))
            .peekable();
        if audience.peek().is_none() {
            return Ok(false);
        }
        let definition = history
            .policy()
            .1
            .filter(|payload| *payload != "null")
            .unwrap_or(self.schema.default_story.get());
        let mut custody = self
            .budget
            .reserve(
                definition
                    .len()
                    .checked_mul(32)
                    .and_then(|n| n.checked_add(4096))
                    .ok_or(StoreError::Capacity)?,
            )
            .map_err(|_| StoreError::Capacity)?;
        let policy: Policy =
            serde_json::from_str(definition).map_err(|_| StoreError::InvalidRecord)?;
        if !policy.enabled || policy.evaluator == "silent_v1" {
            return Ok(false);
        }
        if policy.evaluator != "story_importance_v1" {
            return Err(StoreError::DerivedProjectionRequired);
        }
        for account in audience {
            let original = history
                .originals()
                .find(|row| row.event().id == account.event_id)
                .ok_or(StoreError::InvalidRecord)?
                .event();
            if original.scope == Some(EventScope::System) {
                continue;
            }
            if let Some(body) = account.awareness_payload {
                let bytes = body
                    .len()
                    .checked_mul(32)
                    .and_then(|n| n.checked_add(definition.len() * 32 + 4096))
                    .ok_or(StoreError::Capacity)?;
                custody.resize(bytes).map_err(|_| StoreError::Capacity)?;
            }
            if policy.selected(history, original, account)? {
                return Ok(true);
            }
        }
        Ok(false)
    }
}

struct Evidence<'a> {
    event_type: &'a str,
    source: Option<&'a str>,
    target: Option<&'a str>,
    data: Option<&'a IndexMap<String, EventScalar>>,
    exposure: Option<&'a EncounterExposure>,
}
impl Policy {
    fn selected(
        &self,
        history: &RuntimeHistory,
        original: &WorldEvent,
        account: HistoryAccount<'_>,
    ) -> StoreResult<bool> {
        match (account.awareness_payload, account.temporal) {
            (Some(raw), None) => {
                let evidence: AwarenessEvidence<'_> =
                    serde_json::from_str(raw).map_err(|_| StoreError::InvalidRecord)?;
                if evidence.retention_class.get() == "\"sensory\""
                    || (evidence.sound.is_some() && evidence.speech.is_none())
                {
                    return Ok(false);
                }
                let data = if evidence.speech.is_none() {
                    evidence
                        .event_data
                        .map(|raw| serde_json::from_str(raw.get()))
                        .transpose()
                        .map_err(|_| StoreError::InvalidRecord)?
                } else {
                    None
                };
                let exposure = evidence
                    .exposure
                    .map(|raw| serde_json::from_str(raw.get()))
                    .transpose()
                    .map_err(|_| StoreError::InvalidRecord)?;
                let evidence_input = Evidence {
                    event_type: &evidence.event_type,
                    source: evidence.source_id.as_deref(),
                    target: evidence.target_id.as_deref(),
                    data: data.as_ref(),
                    exposure: exposure.as_ref(),
                };
                if !self.rule(history, original, account.actor_id, evidence_input)? {
                    return Ok(false);
                }
                let text: NativeText = serde_json::from_str(evidence.text.get())
                    .map_err(|_| StoreError::InvalidRecord)?;
                Ok(!native_text(&text).borrowed().trimmed().is_empty())
            }
            (None, Some(account_body)) => {
                let evidence = TemporalEvidence::acquire(account.actor_id, account_body.values)?;
                if evidence.sound.is_some() {
                    return Ok(false);
                }
                let input = Evidence {
                    event_type: evidence.event_type,
                    source: evidence.source_id,
                    target: evidence.target_id,
                    data: Some(evidence.event_data),
                    exposure: None,
                };
                Ok(!evidence.text.borrowed().trimmed().is_empty()
                    && self.rule(history, original, account.actor_id, input)?)
            }
            _ => Err(StoreError::InvalidRecord),
        }
    }

    fn rule(
        &self,
        history: &RuntimeHistory,
        original: &WorldEvent,
        actor: &str,
        evidence: Evidence<'_>,
    ) -> StoreResult<bool> {
        let value = |key| evidence.data.and_then(|data| data.get(key));
        let own = evidence.event_type == "encounter"
            && evidence.source == Some(actor)
            && matches!(value("acquisition"), Some(EventScalar::Boolean(true)))
            && !matches!(value("change"), Some(EventScalar::Text(change)) if change == "end");
        if original.scope == Some(EventScope::Private) && !own {
            return Ok(false);
        }
        let subject = |id: Option<&str>, field: &str| {
            let (actor, value) = history.story_subject(id?, field, &self.id)?;
            let declaration = self.fields.get(field)?;
            declaration
                .applies_to
                .contains(&(if actor { Class::Actor } else { Class::Object }))
                .then_some(value.unwrap_or(declaration.default))
        };
        let intro = &self.introductions;
        if intro.enabled
            && evidence.event_type == "encounter"
            && evidence.source == Some(actor)
            && evidence
                .target
                .is_some_and(|id| history.story_subject(id, &intro.field, &self.id).is_some())
        {
            if let Some(exposure) = evidence.exposure {
                let (class, fields) = match exposure {
                    EncounterExposure::Place {
                        mechanism_fields, ..
                    } => (Class::Place, mechanism_fields),
                    EncounterExposure::InventoryItem {
                        mechanism_fields, ..
                    } => (Class::Object, mechanism_fields),
                };
                let declared = self
                    .fields
                    .get(&intro.field)
                    .ok_or(StoreError::InvalidRecord)?;
                return Ok(declared.applies_to.contains(&class)
                    && fields
                        .as_ref()
                        .and_then(|items| items.get(&self.id))
                        .and_then(|fields| fields.get(&intro.field))
                        .copied()
                        .unwrap_or(declared.default)
                        >= intro.threshold);
            }
            if subject(evidence.target, &intro.field).is_some_and(|value| value >= intro.threshold)
            {
                return Ok(true);
            }
        }
        for rule in self
            .event_rules
            .iter()
            .filter(|rule| rule.event_type == evidence.event_type)
        {
            if let Some(field) = &rule.field {
                let target = match rule.role {
                    Role::Source => evidence.source,
                    Role::Target => evidence.target,
                };
                let minimum = rule.minimum.ok_or(StoreError::InvalidRecord)?;
                if subject(target, field).is_none_or(|value| value < minimum) {
                    continue;
                }
            }
            if let Some(fact) = &rule.fact {
                let maximum = rule.maximum.ok_or(StoreError::InvalidRecord)?;
                if !matches!(value(fact.as_str()), Some(EventScalar::Number(number)) if *number <= maximum)
                {
                    continue;
                }
            }
            return Ok(true);
        }
        Ok(false)
    }
}
