//! The bundled world's immutable occurrence rules. Event words and salience
//! are imported from the one authored TypeScript descriptor, never restated.

use crate::events::EventEmissionIntent;
use crate::reception::EventScalar;
use crate::values::deserialize_safe_integer;
use serde::{Deserialize, Serialize};

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct OccurrenceRules {
    pub id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub version: u64,
    pub important_events: Vec<String>,
    pub important_value: f64,
    pub speech_event: String,
    pub sound_event: String,
    pub encounter_event: String,
    pub contact_event: String,
    pub speech_importance: f64,
    pub sound_importance: f64,
    pub received_urgency: f64,
    pub unintelligible_speech_importance: f64,
    pub semantic_events: Vec<String>,
    pub semantic_importance: f64,
    pub ordinary_importance: f64,
    pub urgent_events: Vec<String>,
    pub urgent_value: f64,
    pub speech_urgency: f64,
    pub ordinary_urgency: f64,
    pub activity_events: Vec<String>,
    pub native_target_events: Vec<String>,
    pub projectile_contact_event: String,
    pub projectile_passage_event: String,
    pub importance_policy: String,
    pub significant_reason: String,
    pub response: ResponseRules,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ResponseRules {
    pub offers: super::base_decision_offers::DecisionOfferRules,
    pub thought: ThoughtRule,
    pub interpretation: InterpretationRule,
    pub expression: ExpressionRules,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct InterpretationRule {
    pub importance: f64,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ThoughtRule {
    pub source: String,
    pub summary_prefix: String,
    pub importance: f64,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ExpressionRules {
    pub event_type: String,
    pub body_plans: Vec<String>,
    pub unsupported_body: String,
    pub unavailable: String,
    pub accepted: String,
    pub verbs: indexmap::IndexMap<String, ExpressionRule>,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ExpressionRule {
    pub verb: String,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub head_suffix: Option<String>,
    pub target_prefix: String,
    pub requires_reach: bool,
}
impl crate::install::DefinitionIdentity for OccurrenceRules {
    fn definition_id(&self) -> &str {
        &self.id
    }
    fn definition_version(&self) -> u64 {
        self.version
    }
}
impl OccurrenceRules {
    pub fn salience(&self, event: &EventEmissionIntent) -> (f64, f64) {
        let data = event.data.as_ref();
        let yes = |key: &str| {
            matches!(
                data.and_then(|data| data.get(key)),
                Some(EventScalar::Boolean(true))
            )
        };
        let importance = if yes("significant") || self.important_events.contains(&event.event_type)
        {
            self.important_value
        } else if event.event_type == self.speech_event {
            self.speech_importance
        } else if yes("semanticTrigger") || self.semantic_events.contains(&event.event_type) {
            self.semantic_importance
        } else {
            self.ordinary_importance
        };
        let urgency = if self.urgent_events.contains(&event.event_type) {
            self.urgent_value
        } else if event.event_type == self.speech_event {
            self.speech_urgency
        } else {
            self.ordinary_urgency
        };
        (importance, urgency)
    }
}
