//! Select a narration only from the actor’s acquired evidence and the
//! captured authored policy. SQL schedules the resulting immutable source.

use super::super::{Store, StoreError, StoreResult};
use super::perspective::{AwarenessEvidence, TemporalEvidence};
use indexmap::IndexMap;
use openlegend_simulation::encoding::{json_record, sha256_hex};
use openlegend_simulation::host::ByteReservation;
use openlegend_simulation::{
    events::{EventScope, WorldEvent},
    narration::{NativeText, native_text},
    reception::{EncounterExposure, EventScalar},
    runtime::{HistoryAccount, RuntimeHistory},
};
use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;

#[derive(Clone, Copy, PartialEq, Deserialize)]
#[serde(rename_all = "lowercase")]
enum Class {
    Actor,
    Object,
    Place,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct Policy {
    id: String,
    version: u64,
    delivery: Delivery,
    enabled: bool,
    evaluator: String,
    fields: IndexMap<String, Field>,
    introductions: Introductions,
    event_rules: Vec<Rule>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Delivery {
    maximum_sources: usize,
    minimum_interval: f64,
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
    significance: f64,
}

pub(super) struct StoryPolicy {
    policy: Policy,
    stamp: PolicyStamp,
    _memory: ByteReservation,
}

impl Store {
    pub(super) fn story_policy(
        &self,
        history: &RuntimeHistory,
    ) -> StoreResult<Option<StoryPolicy>> {
        let (revision, payload) = history.policy();
        let definition = payload
            .filter(|payload| *payload != "null")
            .unwrap_or(self.schema.default_story.get());
        let memory = self
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
            return Ok(None);
        }
        if policy.evaluator != "story_importance_v1" {
            return Err(StoreError::InvalidRecord);
        }
        let stamp = PolicyStamp {
            mechanism: policy.id.clone(),
            version: policy.version,
            policy_revision: revision,
            policy_digest: sha256_hex(definition.as_bytes()),
        };
        Ok(Some(StoryPolicy {
            policy,
            stamp,
            _memory: memory,
        }))
    }
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct PolicyStamp {
    mechanism: String,
    version: u64,
    pub(super) policy_revision: u64,
    policy_digest: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct Impact {
    #[serde(skip_serializing_if = "Option::is_none")]
    entity_id: Option<String>,
    field: String,
    delta: f64,
    source_id: String,
}

pub(super) struct StoryCandidate<'a> {
    pub actor: &'a str,
    pub owner: &'a str,
    pub grouping: String,
    pub milestone: Option<String>,
    pub importance: f64,
    pub maximum_sources: usize,
    pub minimum_interval: f64,
    pub stamp: PolicyStamp,
    pub source: StorySource,
    pub impacts: Vec<Impact>,
    pub _custody: ByteReservation,
}

#[derive(Serialize, Deserialize)]
pub(super) struct StorySource {
    pub id: String,
    pub text: NativeText,
    evidence: Box<RawValue>,
    revision: String,
    pub time: f64,
    pub order: i64,
    #[serde(rename = "type")]
    event_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    content: Option<Box<RawValue>>,
}

struct Selection {
    significance: f64,
    milestone: Option<String>,
    group: String,
    impacts: Vec<Impact>,
}

impl StoryPolicy {
    pub(super) fn candidate<'a>(
        &self,
        store: &Store,
        history: &RuntimeHistory,
        owner: &'a str,
        original: &WorldEvent,
        account: HistoryAccount<'a>,
        perspective: &super::perspective::Perspective<'_>,
    ) -> StoreResult<Option<StoryCandidate<'a>>> {
        if original.scope == Some(EventScope::System) {
            return Ok(None);
        }
        let input_bytes = match (account.awareness_payload, account.temporal) {
            (Some(body), None) => body.len(),
            (None, Some(temporal)) => {
                usize::try_from(temporal.bytes).map_err(|_| StoreError::Capacity)?
            }
            _ => return Err(StoreError::InvalidRecord),
        };
        let custody = store
            .budget
            .reserve(
                input_bytes
                    .checked_mul(32)
                    .and_then(|n| n.checked_add(4096))
                    .ok_or(StoreError::Capacity)?,
            )
            .map_err(|_| StoreError::Capacity)?;
        let Some((selection, source)) =
            self.policy
                .select(history, original, account, perspective)?
        else {
            return Ok(None);
        };
        Ok(Some(StoryCandidate {
            actor: account.actor_id,
            owner,
            grouping: selection.group,
            milestone: selection.milestone,
            importance: selection.significance,
            maximum_sources: self.policy.delivery.maximum_sources,
            minimum_interval: self.policy.delivery.minimum_interval,
            stamp: self.stamp.clone(),
            source,
            impacts: selection.impacts,
            _custody: custody,
        }))
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
    fn select(
        &self,
        history: &RuntimeHistory,
        original: &WorldEvent,
        account: HistoryAccount<'_>,
        perspective: &super::perspective::Perspective<'_>,
    ) -> StoreResult<Option<(Selection, StorySource)>> {
        #[derive(Deserialize)]
        struct Revision {
            revision: String,
        }
        let build = |selection,
                     text: NativeText,
                     evidence: String,
                     event_type: String,
                     content: Option<Box<RawValue>>| {
            if native_text(&text).borrowed().trimmed().is_empty() {
                return Ok(None);
            }
            let revision: Revision = serde_json::from_str(&perspective.payload)
                .map_err(|_| StoreError::InvalidRecord)?;
            let source = StorySource {
                id: account.event_id.to_owned(),
                text,
                evidence: RawValue::from_string(evidence).map_err(|_| StoreError::InvalidRecord)?,
                revision: revision.revision,
                time: original.at,
                order: perspective.position,
                event_type,
                content,
            };
            Ok(Some((selection, source)))
        };
        match (account.awareness_payload, account.temporal) {
            (Some(raw), None) => {
                let evidence: AwarenessEvidence<'_> =
                    serde_json::from_str(raw).map_err(|_| StoreError::InvalidRecord)?;
                if evidence.retention_class.get() == "\"sensory\""
                    || (evidence.sound.is_some() && evidence.speech.is_none())
                    || !self.considers(&evidence.event_type)
                {
                    return Ok(None);
                }
                let data = evidence
                    .event_data
                    .map(|raw| serde_json::from_str(raw.get()))
                    .transpose()
                    .map_err(|_| StoreError::InvalidRecord)?;
                let exposure = evidence
                    .exposure
                    .map(|raw| serde_json::from_str(raw.get()))
                    .transpose()
                    .map_err(|_| StoreError::InvalidRecord)?;
                let input = Evidence {
                    event_type: &evidence.event_type,
                    source: evidence.source_id.as_deref(),
                    target: evidence.target_id.as_deref(),
                    data: data.as_ref(),
                    exposure: exposure.as_ref(),
                };
                let Some(selection) = self.rule(history, original, account.actor_id, input)? else {
                    return Ok(None);
                };
                let text = serde_json::from_str(evidence.text.get())
                    .map_err(|_| StoreError::InvalidRecord)?;
                build(
                    selection,
                    text,
                    json_record(&evidence).map_err(|_| StoreError::InvalidRecord)?,
                    evidence.event_type.into_owned(),
                    evidence.content.map(ToOwned::to_owned),
                )
            }
            (None, Some(account_body)) => {
                let evidence = TemporalEvidence::acquire(account.actor_id, account_body.values)?;
                if evidence.sound.is_some() || !self.considers(evidence.event_type) {
                    return Ok(None);
                }
                let input = Evidence {
                    event_type: evidence.event_type,
                    source: evidence.source_id,
                    target: evidence.target_id,
                    data: Some(evidence.event_data),
                    exposure: None,
                };
                let Some(selection) = self.rule(history, original, account.actor_id, input)? else {
                    return Ok(None);
                };
                let content = evidence
                    .content
                    .map(|text| json_record(text).and_then(RawValue::from_string))
                    .transpose()
                    .map_err(|_| StoreError::InvalidRecord)?;
                build(
                    selection,
                    NativeText::Literal(evidence.text.clone()),
                    json_record(&evidence).map_err(|_| StoreError::InvalidRecord)?,
                    evidence.event_type.to_owned(),
                    content,
                )
            }
            _ => Err(StoreError::InvalidRecord),
        }
    }

    fn considers(&self, event_type: &str) -> bool {
        (self.introductions.enabled && event_type == "encounter")
            || self
                .event_rules
                .iter()
                .any(|rule| rule.event_type == event_type)
    }

    fn rule(
        &self,
        history: &RuntimeHistory,
        original: &WorldEvent,
        actor: &str,
        evidence: Evidence<'_>,
    ) -> StoreResult<Option<Selection>> {
        let value = |key| evidence.data.and_then(|data| data.get(key));
        let own = evidence.event_type == "encounter"
            && evidence.source == Some(actor)
            && matches!(value("acquisition"), Some(EventScalar::Boolean(true)))
            && !matches!(value("change"), Some(EventScalar::Text(change)) if change == "end");
        if original.scope == Some(EventScope::Private) && !own {
            return Ok(None);
        }
        let selection = |significance, milestone| {
            let group = match (value("responseId"), value("effectId")) {
                (Some(EventScalar::Text(id)), _) => format!(
                    "response:{}",
                    id.as_unicode().ok_or(StoreError::InvalidRecord)?
                ),
                (_, Some(EventScalar::Text(id))) if evidence.event_type == "body-effect" => {
                    format!(
                        "effect:{}",
                        id.as_unicode().ok_or(StoreError::InvalidRecord)?
                    )
                }
                _ => format!("event:{}", original.id),
            };
            let impacts = if evidence.event_type == "body-effect" {
                [
                    ("healthDelta", "health"),
                    ("wetnessDelta", "wetness"),
                    ("burningDelta", "burning"),
                ]
                .into_iter()
                .filter_map(|(key, field)| match value(key) {
                    Some(EventScalar::Number(delta)) if *delta != 0.0 => Some(Impact {
                        entity_id: evidence.target.or(evidence.source).map(str::to_owned),
                        field: field.to_owned(),
                        delta: *delta,
                        source_id: original.id.clone(),
                    }),
                    _ => None,
                })
                .collect()
            } else {
                Vec::new()
            };
            Ok(Some(Selection {
                significance,
                milestone,
                group,
                impacts,
            }))
        };
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
                let (class, fields, milestone) = match exposure {
                    EncounterExposure::Place {
                        id,
                        mechanism_fields,
                        ..
                    } => (Class::Place, mechanism_fields, format!("place:{id}")),
                    EncounterExposure::InventoryItem {
                        introduction_key,
                        mechanism_fields,
                        ..
                    } => (Class::Object, mechanism_fields, introduction_key.clone()),
                };
                let declared = self
                    .fields
                    .get(&intro.field)
                    .ok_or(StoreError::InvalidRecord)?;
                let importance = fields
                    .as_ref()
                    .and_then(|items| items.get(&self.id))
                    .and_then(|fields| fields.get(&intro.field))
                    .copied()
                    .unwrap_or(declared.default);
                return if declared.applies_to.contains(&class) && importance >= intro.threshold {
                    selection(importance, Some(milestone))
                } else {
                    Ok(None)
                };
            }
            if let Some(importance) =
                subject(evidence.target, &intro.field).filter(|value| *value >= intro.threshold)
            {
                let target = evidence.target.expect("selected introduction has a target");
                return selection(importance, Some(format!("encounter:{target}")));
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
            return selection(rule.significance, None);
        }
        Ok(None)
    }
}
