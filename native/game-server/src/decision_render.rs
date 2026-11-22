//! Render the installed decision contract from one actor's already-permitted
//! preparation. The caller retains its native evidence and response ticket.
//! This code neither discovers facts nor confers permission to use a handle.

use openlegend_simulation::{host::ByteBudget, values::DefinitionPin};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::collections::HashMap;

mod attention;
mod choices;
mod prompt;
pub(crate) mod provider;
mod scheduling;
mod schema;

pub(crate) use attention::BoundAttention;
pub(crate) use prompt::PreparedPrompt;
pub(crate) use scheduling::SchedulingPolicy;
pub(crate) use schema::{BoundSchema, ResponseReferences, tree_bytes};

#[derive(Debug)]
pub(crate) enum RenderError {
    Capacity,
    ContextLimit,
    Field(&'static str),
    Contract,
    InvalidResponse,
}

impl std::fmt::Display for RenderError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Capacity => formatter.write_str("Decision preparation capacity is occupied"),
            Self::ContextLimit => {
                formatter.write_str("The complete decision context exceeds its limit")
            }
            Self::Field(field) => {
                write!(formatter, "The permitted decision context has no {field}")
            }
            Self::Contract => formatter.write_str("The installed decision contract is unavailable"),
            Self::InvalidResponse => {
                formatter.write_str("The response does not match its offered contract")
            }
        }
    }
}

impl std::error::Error for RenderError {}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct DecisionPolicy {
    pub(crate) instructions_version: String,
    pub(crate) response_instructions: String,
    pub(crate) appraisal_policies: Vec<AppraisalPolicy>,
    pub(crate) appraisal_source_limit: usize,
    pub(crate) reflection: ReflectionPolicy,
    pub(crate) query_instructions: String,
    context_bytes: usize,
    text: HashMap<String, String>,
    named_times: Vec<String>,
    output_families: Vec<String>,
    pub(crate) navigation: String,
    pub(crate) activity_coverage: String,
    pub(crate) requests: Value,
    pub(crate) knowledge_instructions: String,
    pub(crate) expression_guidance: [String; 2],
    questions: Vec<QuestionSet>,
    action_attention: [AttentionTemplate; 2],
    recall_attention: AttentionTemplate,
    recall_threshold: f64,
    pub(crate) recent_recall: usize,
    pub(crate) choice_threshold: f64,
    judgment_characters: [usize; 2],
    references: HashMap<String, String>,
    schemas: Vec<SchemaVariant>,
    choices: Value,
    pub(crate) scheduling: SchedulingPolicy,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct AppraisalPolicy {
    pub(crate) ordinal: usize,
    pub(crate) pin: DefinitionPin,
    pub(crate) label: String,
    pub(crate) value: AppraisalScale,
    pub(crate) lifetime: String,
}

#[derive(Clone, Copy, Deserialize, Serialize)]
#[serde(tag = "kind", rename_all = "kebab-case", deny_unknown_fields)]
pub(crate) enum AppraisalScale {
    Qualitative,
    Scaled { min: f64, max: f64 },
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ReflectionPolicy {
    pub(crate) instructions: String,
    pub(crate) workspace_guidance: String,
    pub(crate) default_model: String,
    pub(crate) model_parameters: Value,
    pub(crate) day_seconds: f64,
    pub(crate) minimum_interval_seconds: f64,
    pub(crate) stimulus: String,
    pub(crate) permissions: Value,
    schema: Value,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct QuestionSet {
    addressed: bool,
    speech: bool,
    generation: bool,
    questions: Value,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct SchemaVariant {
    speech: bool,
    expressions: bool,
    schema: Value,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct AttentionTemplate {
    policy: String,
    question: Value,
}

pub(crate) struct OfferedAction<'a> {
    pub(crate) id: &'a str,
    pub(crate) description: &'a str,
}

impl DecisionPolicy {
    /// Borrow the authorized routing questions from the selected release.
    /// Dynamic activity offers still come from the actor's prepared choices.
    pub(crate) fn route_questions(
        &self,
        addressed: bool,
        speech: bool,
        generation: bool,
    ) -> Result<&Value, RenderError> {
        self.questions
            .iter()
            .find(|set| {
                set.addressed == addressed && set.speech == speech && set.generation == generation
            })
            .map(|set| &set.questions)
            .ok_or(RenderError::Contract)
    }

    /// Borrow the same release schema used by ordinary reply validation.
    pub(crate) fn appraisal_template(&self) -> Option<&Value> {
        self.schemas
            .first()?
            .schema
            .pointer("/properties/operations/items/anyOf")?
            .as_array()?
            .iter()
            .filter_map(|operation| operation.pointer("/properties/appraise"))
            .find(|field| field.get("anyOf").is_some())
    }

    pub(crate) fn prompt(
        &self,
        fields: &Map<String, Value>,
        actions: &[OfferedAction<'_>],
        include_actions: bool,
        budget: &ByteBudget,
    ) -> Result<PreparedPrompt, RenderError> {
        prompt::render(self, fields, actions, include_actions, budget)
    }

    fn text(&self, fragment: &str) -> Result<&str, RenderError> {
        self.text
            .get(fragment)
            .map(String::as_str)
            .ok_or(RenderError::Contract)
    }
}
