//! Render the installed decision contract from one actor's already-permitted
//! preparation. The caller retains its native evidence and response ticket.
//! This code neither discovers facts nor confers permission to use a handle.

use openlegend_simulation::host::ByteBudget;
use serde::Deserialize;
use serde_json::{Map, Value};
use std::collections::HashMap;

mod choices;
mod prompt;
pub(crate) mod provider;
mod schema;

pub(crate) use prompt::PreparedPrompt;
pub(crate) use schema::{BoundSchema, ResponseReferences};

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
    references: HashMap<String, String>,
    schemas: Vec<SchemaVariant>,
    choices: Value,
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
