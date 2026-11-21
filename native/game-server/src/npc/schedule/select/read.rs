//! Select only the scheduler's facts from the accepted native intake packet.
//! Prose uses exact JavaScript text. Identities and revisions stay typed.

use openlegend_simulation::{
    activity::ResultEvidence, experience::PersonalSourceKind, reception::EventScalar, text::JsText,
    values::deserialize_present_safe_integer,
};
use serde::{Deserialize, Deserializer, Serialize, de::Error as _};
use serde_json::{Value, value::RawValue};
use std::collections::HashMap;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct Facts {
    pub(super) actor_id: String,
    pub(super) world_id: String,
    pub(super) generation: String,
    pub(super) accepted_cut: u64,
    pub(super) at: f64,
    pub(super) enrolled: bool,
    pub(super) eligible: bool,
    pub(super) values: Vec<String>,
    pub(super) dependency_token: String,
    pub(super) unseen: Unseen,
    pub(super) own: Own,
    pub(super) attention: Attention,
    pub(super) actions_blocked: bool,
    pub(super) protection_labels: Vec<String>,
    pub(super) opportunity: Opportunity,
    pub(super) semantic: Option<Semantic>,
    pub(super) stimuli: Vec<Stimulus>,
    pub(super) events: Vec<Event>,
    pub(super) conditions: Option<HashMap<String, Condition>>,
    pub(super) prepared_result: PreparedResult,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct Unseen {
    pub(super) records: Vec<Evidence>,
    pub(super) interruptions: Vec<Evidence>,
    pub(super) max_sequence: u64,
}

#[derive(Deserialize)]
pub(super) struct Evidence {
    pub(super) kind: PersonalSourceKind,
    value: EvidenceValue,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct EvidenceValue {
    id: Option<String>,
    event_id: Option<String>,
    event_type: Option<String>,
    #[serde(default, deserialize_with = "deserialize_present_safe_integer")]
    sequence: Option<u64>,
    importance: Option<f64>,
    source_id: Option<String>,
    speaker_id: Option<String>,
    #[serde(default, deserialize_with = "literal_text")]
    text: Option<JsText>,
    #[serde(default, deserialize_with = "literal_text")]
    summary: Option<JsText>,
}

impl Evidence {
    pub(super) fn id(&self) -> &str {
        if self.kind == PersonalSourceKind::Awareness {
            self.value.event_id.as_deref().unwrap_or_default()
        } else {
            self.value.id.as_deref().unwrap_or_default()
        }
    }

    pub(super) fn event(&self) -> &str {
        self.value.event_id.as_deref().unwrap_or_else(|| self.id())
    }

    pub(super) fn summary(&self) -> Option<&JsText> {
        if self.kind == PersonalSourceKind::Memory {
            self.value.summary.as_ref()
        } else {
            self.value.text.as_ref()
        }
    }

    pub(super) fn sequence(&self) -> u64 {
        self.value.sequence.unwrap_or_default()
    }

    pub(super) fn importance(&self) -> f64 {
        self.value.importance.unwrap_or_default()
    }

    pub(super) fn speaker(&self) -> &str {
        if self.kind == PersonalSourceKind::Awareness {
            self.value.source_id.as_deref().unwrap_or_default()
        } else {
            self.value.speaker_id.as_deref().unwrap_or_default()
        }
    }

    pub(super) fn event_type(&self) -> &str {
        self.value.event_type.as_deref().unwrap_or_default()
    }
}

#[derive(Deserialize)]
pub(super) struct Own {
    pub(super) agency: Agency,
}

#[derive(Deserialize)]
pub(super) struct Agency {
    pub(super) goals: Vec<Goal>,
    pub(super) plan: Option<Plan>,
}

#[derive(Deserialize)]
pub(super) struct Goal {
    pub(super) id: String,
    pub(super) revision: u64,
    pub(super) objective: JsText,
    pub(super) status: String,
    pub(super) author: String,
}

#[derive(Deserialize)]
pub(super) struct Plan {
    pub(super) id: String,
    pub(super) status: String,
    pub(super) steps: Vec<Step>,
}

#[derive(Deserialize)]
pub(super) struct Step {
    pub(super) id: String,
    pub(super) status: String,
    pub(super) outcome: Option<Outcome>,
}

#[derive(Deserialize)]
pub(super) struct Outcome {
    pub(super) code: String,
}

#[derive(Deserialize)]
pub(super) struct Attention {
    pub(super) candidates: HashMap<String, AttentionCandidate>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct AttentionCandidate {
    pub(super) presented_description: Option<String>,
    pub(super) description_revision: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct Opportunity {
    pub(super) body_inputs: Vec<BodyInput>,
    pub(super) concerns: Vec<(String, JsText)>,
    pub(super) knowledge: Vec<String>,
    pub(super) knowledge_revision: u64,
    pub(super) mind_revision: Option<u64>,
}

#[derive(Deserialize, Serialize)]
pub(super) struct BodyInput {
    key: String,
    value: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct Semantic {
    pub(super) interval: u64,
    pub(super) discovery: String,
    pub(super) occupied_purpose: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct Stimulus {
    pub(super) source_id: String,
    pub(super) states: Vec<String>,
    pub(super) since: f64,
    #[serde(default, deserialize_with = "literal_text")]
    pub(super) label: Option<JsText>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct Event {
    pub(super) id: String,
    #[serde(rename = "type")]
    pub(super) kind: String,
    pub(super) actor_id: Option<String>,
    pub(super) data: EventData,
    pub(super) response_recorded: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct EventData {
    pub(super) attribute_id: Option<EventScalar>,
    pub(super) severity: Option<EventScalar>,
    pub(super) definition_version: Option<EventScalar>,
    pub(super) appraisal_pipeline: Option<EventScalar>,
    pub(super) response_id: Option<EventScalar>,
    pub(super) appraisal_input_sequence: Option<EventScalar>,
    pub(super) appraisal_cause_ids: Option<EventScalar>,
}

#[derive(Deserialize)]
pub(super) struct Condition {
    pub(super) severity: u64,
    pub(super) version: u64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct PreparedResult {
    pub(super) reference: Option<ResultEvidence>,
    pub(super) forgotten: bool,
    pub(super) plan_reference: Option<ResultEvidence>,
    pub(super) plan_purpose: Option<Value>,
    pub(super) internal_memory: bool,
    pub(super) occurrence: Option<Occurrence>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct Occurrence {
    pub(super) command_type: String,
    pub(super) status: String,
    pub(super) revoked: bool,
    pub(super) forgotten: bool,
    pub(super) purpose: Option<Value>,
}

/// Use a literal cue when the producer has supplied one. Structured captured
/// descriptions stay with their evidence owner and need no scheduler decode.
fn literal_text<'de, D: Deserializer<'de>>(de: D) -> Result<Option<JsText>, D::Error> {
    let raw = <&RawValue>::deserialize(de)?;
    if raw.get().starts_with('"') {
        return serde_json::from_str(raw.get())
            .map(Some)
            .map_err(D::Error::custom);
    }
    Ok(None)
}
