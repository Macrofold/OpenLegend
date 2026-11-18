//! Complete provider requests and validation of their bounded typed answers.
//! The dispatch owner reserves and settles against the real transport receipt.

use super::{BoundSchema, RenderError};
use crate::{
    network::NetworkError,
    provider_transport::{PreparedProviderRequest, ProviderDestination},
};
use openlegend_simulation::host::{ByteBudget, ByteReservation};
use serde::Serialize;
use serde_json::Value;
use std::collections::BTreeMap;

#[derive(Serialize)]
#[serde(untagged)]
pub(crate) enum JudgmentState<'a> {
    Prompt(&'a str),
    Structured(&'a Value),
}

#[derive(Serialize)]
pub(crate) struct Judgment<'a> {
    pub state: JudgmentState<'a>,
    pub questions: &'a Value,
}

#[derive(Clone, Copy, Serialize)]
#[serde(untagged)]
pub(crate) enum MacrofoldBinding<'a> {
    Catalog {
        provider: &'static str,
        model: &'a str,
        billing_mode: &'static str,
        #[serde(skip_serializing_if = "Option::is_none")]
        provider_connection_id: Option<&'a str>,
    },
    Deployment {
        deployment_id: uuid::Uuid,
        #[serde(skip_serializing_if = "Option::is_none")]
        deployment_revision_id: Option<uuid::Uuid>,
    },
}

#[derive(Clone, Copy)]
pub(crate) struct MacrofoldRoute<'a> {
    pub workspace_id: Option<uuid::Uuid>,
    pub binding: MacrofoldBinding<'a>,
    pub max_cost_micro_usd: &'a str,
    pub timeout_seconds: u64,
}

#[derive(Serialize)]
struct MacrofoldBody<'a, T> {
    #[serde(skip_serializing_if = "Option::is_none")]
    stream: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    workspace_id: Option<uuid::Uuid>,
    model_binding: MacrofoldBinding<'a>,
    input: T,
    limits: MacrofoldLimits<'a>,
}

#[derive(Serialize)]
struct MacrofoldLimits<'a> {
    max_cost_micro_usd: &'a str,
    max_output_tokens: usize,
    timeout_seconds: u64,
}

impl<'a> MacrofoldRoute<'a> {
    fn body<T>(&self, input: T, output_tokens: usize, stream: bool) -> MacrofoldBody<'a, T> {
        MacrofoldBody {
            stream: stream.then_some(true),
            workspace_id: self.workspace_id,
            model_binding: self.binding,
            input,
            limits: MacrofoldLimits {
                max_cost_micro_usd: self.max_cost_micro_usd,
                max_output_tokens: output_tokens,
                timeout_seconds: self.timeout_seconds,
            },
        }
    }
}

pub(crate) fn judgment_request(
    destination: &ProviderDestination,
    model: &str,
    macrofold: Option<MacrofoldRoute<'_>>,
    judgment: Judgment<'_>,
    max_output_tokens: usize,
    request_id: &str,
    budget: &ByteBudget,
) -> Result<PreparedProviderRequest, NetworkError> {
    let questions = judgment
        .questions
        .as_object()
        .ok_or(NetworkError::Transfer)?;
    if questions.is_empty() {
        return Err(NetworkError::Transfer);
    }
    if let Some(route) = macrofold {
        let output = max_output_tokens.min(1024.max(questions.len().saturating_mul(64)));
        destination.inference(
            &route.body(judgment, output, false),
            Some(request_id),
            budget,
        )
    } else {
        #[derive(Serialize)]
        struct Direct<'a> {
            model: &'a str,
            #[serde(flatten)]
            input: Judgment<'a>,
        }
        destination.inference(
            &Direct {
                model,
                input: judgment,
            },
            None,
            budget,
        )
    }
}

pub(crate) struct Generation<'a> {
    pub schema_name: &'a str,
    pub schema: &'a BoundSchema,
    pub instructions: &'a str,
    pub prompt: &'a str,
    pub effort: Option<&'a str>,
    pub max_output_tokens: usize,
    pub stream: bool,
}

#[derive(Serialize)]
struct Reasoning<'a> {
    effort: &'a str,
}

#[derive(Serialize)]
struct JsonSchema<'a> {
    name: &'a str,
    strict: bool,
    schema: &'a Value,
}

pub(crate) fn generation_request(
    destination: &ProviderDestination,
    model: &str,
    macrofold: Option<MacrofoldRoute<'_>>,
    generation: Generation<'_>,
    request_id: &str,
    budget: &ByteBudget,
) -> Result<PreparedProviderRequest, NetworkError> {
    let schema = JsonSchema {
        name: generation.schema_name,
        strict: true,
        schema: generation.schema.value(),
    };
    let reasoning = generation.effort.map(|effort| Reasoning { effort });
    if let Some(route) = macrofold {
        #[derive(Serialize)]
        struct Message<'a> {
            role: &'static str,
            content: &'a str,
        }
        #[derive(Serialize)]
        struct ResponseFormat<'a> {
            #[serde(rename = "type")]
            kind: &'static str,
            json_schema: JsonSchema<'a>,
        }
        #[derive(Serialize)]
        struct Provider {
            require_parameters: bool,
        }
        #[derive(Serialize)]
        struct Input<'a> {
            messages: [Message<'a>; 2],
            max_tokens: usize,
            response_format: ResponseFormat<'a>,
            #[serde(skip_serializing_if = "Option::is_none")]
            provider: Option<Provider>,
            #[serde(skip_serializing_if = "Option::is_none")]
            reasoning: Option<Reasoning<'a>>,
        }
        // This shape is the installed structured-output route. A deployment
        // that selects another output mode must supply its own prepared shape.
        let input = Input {
            messages: [
                Message {
                    role: "system",
                    content: generation.instructions,
                },
                Message {
                    role: "user",
                    content: generation.prompt,
                },
            ],
            max_tokens: generation.max_output_tokens,
            response_format: ResponseFormat {
                kind: "json_schema",
                json_schema: schema,
            },
            provider: matches!(route.binding, MacrofoldBinding::Catalog { .. }).then_some(
                Provider {
                    require_parameters: true,
                },
            ),
            reasoning,
        };
        destination.inference(
            &route.body(input, generation.max_output_tokens, generation.stream),
            Some(request_id),
            budget,
        )
    } else {
        #[derive(Serialize)]
        struct Format<'a> {
            #[serde(rename = "type")]
            kind: &'static str,
            #[serde(flatten)]
            schema: JsonSchema<'a>,
        }
        #[derive(Serialize)]
        struct Text<'a> {
            format: Format<'a>,
        }
        #[derive(Serialize)]
        struct Direct<'a> {
            model: &'a str,
            instructions: &'a str,
            input: &'a str,
            store: bool,
            service_tier: &'static str,
            max_output_tokens: usize,
            text: Text<'a>,
            #[serde(skip_serializing_if = "Option::is_none")]
            reasoning: Option<Reasoning<'a>>,
        }
        destination.inference(
            &Direct {
                model,
                instructions: generation.instructions,
                input: generation.prompt,
                store: false,
                service_tier: "default",
                max_output_tokens: generation.max_output_tokens,
                text: Text {
                    format: Format {
                        kind: "json_schema",
                        schema,
                    },
                },
                reasoning,
            },
            None,
            budget,
        )
    }
}

pub(crate) struct JudgmentAnswer {
    values: BTreeMap<String, Answer>,
    _custody: ByteReservation,
}

enum Answer {
    Choice {
        selected: String,
        probabilities: BTreeMap<String, f64>,
    },
    Predicate(f64),
    Score(f64),
}

impl JudgmentAnswer {
    pub(crate) fn choice(&self, id: &str) -> Option<&str> {
        match self.values.get(id)? {
            Answer::Choice { selected, .. } => Some(selected),
            _ => None,
        }
    }
    pub(crate) fn probability(&self, id: &str, choice: &str) -> Option<f64> {
        match self.values.get(id)? {
            Answer::Choice { probabilities, .. } => probabilities.get(choice).copied(),
            _ => None,
        }
    }
    pub(crate) fn predicate(&self, id: &str) -> Option<f64> {
        match self.values.get(id)? {
            Answer::Predicate(value) => Some(*value),
            _ => None,
        }
    }
    pub(crate) fn score(&self, id: &str) -> Option<f64> {
        match self.values.get(id)? {
            Answer::Score(value) => Some(*value),
            _ => None,
        }
    }
}

/// Select the highest offered finite score, with the first offered choice
/// winning ties. Provider arithmetic does not have to sum to one.
pub(crate) fn decode_judgment(
    data: &Value,
    questions: &Value,
    budget: &ByteBudget,
) -> Result<JudgmentAnswer, RenderError> {
    let invalid = RenderError::InvalidResponse;
    let questions = questions.as_object().ok_or(RenderError::Contract)?;
    let answers = data["answers"].as_object().ok_or(invalid)?;
    if data["truncated"].as_bool() == Some(true) {
        return Err(RenderError::InvalidResponse);
    }
    let bytes = questions
        .iter()
        .try_fold(256usize, |total, (id, question)| {
            let keys = question["criteria"]
                .as_object()
                .map_or(Some(0), |criteria| {
                    criteria.keys().try_fold(0usize, |total, key| {
                        total
                            .checked_add(128)?
                            .checked_add(key.len().checked_mul(2)?)
                    })
                })?;
            total
                .checked_add(256)?
                .checked_add(id.len())?
                .checked_add(keys)
        })
        .ok_or(RenderError::Capacity)?;
    let custody = budget.reserve(bytes).map_err(|_| RenderError::Capacity)?;
    let mut values = BTreeMap::new();
    for (id, question) in questions {
        let answer = answers
            .get(id)
            .filter(|row| row["type"] == question["type"])
            .ok_or(RenderError::InvalidResponse)?;
        if answer
            .get("confidence")
            .is_some_and(|value| finite(value).is_none())
        {
            return Err(RenderError::InvalidResponse);
        }
        let value = match question["type"].as_str() {
            Some("noul") => {
                Answer::Predicate(finite(&answer["noul"]).ok_or(RenderError::InvalidResponse)?)
            }
            Some("score") => {
                let labels = question["criteria"]
                    .as_array()
                    .ok_or(RenderError::Contract)?;
                for index in 0..labels.len() {
                    finite(&answer["probabilities"][index.to_string()])
                        .ok_or(RenderError::InvalidResponse)?;
                }
                Answer::Score(finite(&answer["score"]).ok_or(RenderError::InvalidResponse)?)
            }
            Some("choice") => {
                let offered = question["criteria"]
                    .as_object()
                    .ok_or(RenderError::Contract)?;
                let mut best = None;
                let mut probabilities = BTreeMap::new();
                for key in offered.keys() {
                    let probability = finite(&answer["probabilities"][key])
                        .ok_or(RenderError::InvalidResponse)?;
                    if best.is_none_or(|(_, prior)| probability > prior) {
                        best = Some((key, probability));
                    }
                    probabilities.insert(key.clone(), probability);
                }
                Answer::Choice {
                    selected: best.ok_or(RenderError::Contract)?.0.clone(),
                    probabilities,
                }
            }
            _ => return Err(RenderError::Contract),
        };
        values.insert(id.clone(), value);
    }
    Ok(JudgmentAnswer {
        values,
        _custody: custody,
    })
}

fn finite(value: &Value) -> Option<f64> {
    value.as_f64().filter(|value| value.is_finite())
}

pub(crate) struct GenerationOutput {
    pub(crate) value: Value,
    _custody: ByteReservation,
}

pub(crate) enum TextResult<'a> {
    Refused,
    Complete(&'a str),
}

pub(crate) fn macrofold_text(value: &Value) -> Result<TextResult<'_>, RenderError> {
    let Some([choice]) = value["choices"].as_array().map(Vec::as_slice) else {
        return Err(RenderError::InvalidResponse);
    };
    let message = choice["message"]
        .as_object()
        .ok_or(RenderError::InvalidResponse)?;
    if choice["finish_reason"] == "content_filter"
        || message
            .get("refusal")
            .is_some_and(|value| !value.is_null() && value.as_str() != Some(""))
    {
        return Ok(TextResult::Refused);
    }
    if choice["finish_reason"] != "stop" {
        return Err(RenderError::InvalidResponse);
    }
    message
        .get("content")
        .and_then(Value::as_str)
        .map(TextResult::Complete)
        .ok_or(RenderError::InvalidResponse)
}

/// Decode one complete provider result. Raw provider bytes, shape workspace
/// and the returned graph each have independent admission.
pub(crate) fn generation_output(
    text: &str,
    schema: &BoundSchema,
    budget: &ByteBudget,
) -> Result<GenerationOutput, RenderError> {
    // Native response admission applies the same envelope cap before effects.
    if text.len() > 40_000 {
        return Err(RenderError::InvalidResponse);
    }
    let size = openlegend_simulation::encoding::json_tree_allocation_bound(text)
        .ok_or(RenderError::InvalidResponse)?;
    let custody = budget.reserve(size).map_err(|_| RenderError::Capacity)?;
    let value = serde_json::from_str(text).map_err(|_| RenderError::InvalidResponse)?;
    schema.validate(&value)?;
    Ok(GenerationOutput {
        value,
        _custody: custody,
    })
}
