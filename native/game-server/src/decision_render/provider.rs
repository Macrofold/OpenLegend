//! Complete provider requests and validation of their bounded typed answers.
//! The dispatch owner reserves and settles against the real transport receipt.

use super::{BoundSchema, RenderError};
use crate::{
    network::NetworkError,
    provider_transport::{
        PreparedProviderRequest, ProviderDestination,
        deployment::{Deployment, OutputMode},
    },
};
use openlegend_simulation::{
    host::{ByteBudget, ByteReservation},
    records::SqlCell,
    text::JsText,
};
use serde::Serialize;
use serde_json::Value;
use std::{collections::BTreeMap, sync::Arc};
use tokio::time::Instant;

#[derive(Serialize)]
#[serde(untagged)]
pub(crate) enum JudgmentState<'a> {
    Prompt(&'a str),
    ExactPrompt(&'a JsText),
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
            stream: if matches!(self.binding, MacrofoldBinding::Deployment { .. }) {
                Some(stream)
            } else {
                stream.then_some(true)
            },
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

fn deployment_route<'a>(
    owner: &Deployment,
    allowance: &'a str,
    deadline: Instant,
) -> MacrofoldRoute<'a> {
    let target = owner.selection;
    let remaining = deadline.saturating_duration_since(Instant::now());
    MacrofoldRoute {
        workspace_id: Some(target.workspace_id),
        binding: MacrofoldBinding::Deployment {
            deployment_id: target.model_binding.deployment_id,
            deployment_revision_id: target.model_binding.deployment_revision_id,
        },
        max_cost_micro_usd: allowance,
        timeout_seconds: (remaining.as_secs() + u64::from(remaining.subsec_nanos() != 0)).min(240),
    }
}

pub(crate) fn deployment_judgment_request(
    destination: &ProviderDestination,
    owner: &Arc<Deployment>,
    deadline: Instant,
    input: Judgment<'_>,
    output_tokens: usize,
    request_id: &str,
    budget: &ByteBudget,
) -> Result<PreparedProviderRequest, NetworkError> {
    // The deployed native inference fee is zero. The caller still reserves
    // its full configured positive judgment allowance before any POST.
    judgment_request(
        destination,
        "",
        Some(deployment_route(owner, "0", deadline)),
        input,
        output_tokens,
        request_id,
        budget,
    )
    .map(|request| request.for_deployment(owner))
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
    pub schema: &'a Value,
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
    render_generation(
        destination,
        model,
        macrofold,
        None,
        generation,
        request_id,
        budget,
    )
}

pub(crate) fn deployment_generation_request(
    destination: &ProviderDestination,
    owner: &Arc<Deployment>,
    allowance: &str,
    deadline: Instant,
    mode: OutputMode,
    generation: Generation<'_>,
    request_id: &str,
    budget: &ByteBudget,
) -> Result<PreparedProviderRequest, NetworkError> {
    render_generation(
        destination,
        "",
        Some(deployment_route(owner, allowance, deadline)),
        Some(mode),
        generation,
        request_id,
        budget,
    )
    .map(|request| request.for_deployment(owner))
}

fn render_generation(
    destination: &ProviderDestination,
    model: &str,
    macrofold: Option<MacrofoldRoute<'_>>,
    mode: Option<OutputMode>,
    generation: Generation<'_>,
    request_id: &str,
    budget: &ByteBudget,
) -> Result<PreparedProviderRequest, NetworkError> {
    let schema = JsonSchema {
        name: generation.schema_name,
        strict: true,
        schema: generation.schema,
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
            #[serde(skip_serializing_if = "Option::is_none")]
            json_schema: Option<JsonSchema<'a>>,
        }
        #[derive(Serialize)]
        struct Provider {
            require_parameters: bool,
        }
        #[derive(Serialize)]
        struct Input<'a> {
            messages: [Message<'a>; 2],
            max_tokens: usize,
            #[serde(skip_serializing_if = "Option::is_none")]
            response_format: Option<ResponseFormat<'a>>,
            #[serde(skip_serializing_if = "Option::is_none")]
            provider: Option<Provider>,
            #[serde(skip_serializing_if = "Option::is_none")]
            reasoning: Option<Reasoning<'a>>,
        }
        let guided = matches!(
            mode,
            Some(OutputMode::JsonObject | OutputMode::PromptedJson)
        );
        const GUIDANCE: &str =
            "\n\nReturn only JSON matching this schema. Do not use Markdown fences or tools.\n";
        let instructions = if guided {
            use openlegend_simulation::encoding::{json_record_len, write_json_record};
            let length = json_record_len(generation.schema).map_err(|_| NetworkError::Transfer)?;
            let total = generation
                .instructions
                .len()
                .saturating_add(GUIDANCE.len())
                .saturating_add(length);
            if total > 500_000 {
                return Err(NetworkError::Capacity);
            }
            let custody = budget.reserve(total).map_err(|_| NetworkError::Capacity)?;
            let mut message = Vec::new();
            message
                .try_reserve_exact(total)
                .map_err(|_| NetworkError::Capacity)?;
            message.extend_from_slice(generation.instructions.as_bytes());
            message.extend_from_slice(GUIDANCE.as_bytes());
            write_json_record(generation.schema, &mut message)
                .map_err(|_| NetworkError::Transfer)?;
            Some((
                String::from_utf8(message).map_err(|_| NetworkError::Transfer)?,
                custody,
            ))
        } else {
            None
        };
        let response_format = match mode {
            Some(OutputMode::PromptedJson) => None,
            Some(OutputMode::JsonObject) => Some(ResponseFormat {
                kind: "json_object",
                json_schema: None,
            }),
            None | Some(OutputMode::JsonSchema) => Some(ResponseFormat {
                kind: "json_schema",
                json_schema: Some(schema),
            }),
        };
        let catalog = matches!(route.binding, MacrofoldBinding::Catalog { .. });
        let input = Input {
            messages: [
                Message {
                    role: "system",
                    content: instructions
                        .as_ref()
                        .map_or(generation.instructions, |(message, _)| message.as_str()),
                },
                Message {
                    role: "user",
                    content: generation.prompt,
                },
            ],
            max_tokens: generation.max_output_tokens,
            response_format,
            provider: catalog.then_some(Provider {
                require_parameters: true,
            }),
            reasoning: catalog.then_some(reasoning).flatten(),
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
    decode_answers(data, questions, budget, false)
}

/// An unanswered optional relevance question supplies no selected evidence.
/// Responses still must match the offered rubric for every answer provided.
pub(crate) fn decode_optional_attention(
    data: &Value,
    questions: &Value,
    budget: &ByteBudget,
) -> Result<JudgmentAnswer, RenderError> {
    decode_answers(data, questions, budget, true)
}

fn decode_answers(
    data: &Value,
    questions: &Value,
    budget: &ByteBudget,
    allow_missing: bool,
) -> Result<JudgmentAnswer, RenderError> {
    let invalid = RenderError::InvalidResponse;
    let questions = questions.as_object().ok_or(RenderError::Contract)?;
    let answers = data["answers"]
        .as_object()
        .ok_or(RenderError::InvalidResponse)?;
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
        let Some(answer) = answers.get(id) else {
            if allow_missing {
                continue;
            }
            return Err(invalid);
        };
        if answer["type"] != question["type"] {
            return Err(invalid);
        }
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
    value: SqlCell,
    custody: ByteReservation,
}

impl GenerationOutput {
    pub(crate) fn into_parts(self) -> (SqlCell, ByteReservation) {
        (self.value, self.custody)
    }
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
    let size = SqlCell::json_decode_bound(text).ok_or(RenderError::InvalidResponse)?;
    let custody = budget.reserve(size).map_err(|_| RenderError::Capacity)?;
    let mut value = serde_json::from_str(text).map_err(|_| RenderError::InvalidResponse)?;
    schema.validate_generation(&mut value)?;
    Ok(GenerationOutput { value, custody })
}

/// Assemble the bounded text from one direct OpenAI Responses output.
pub(crate) fn direct_text(value: &Value, budget: &ByteBudget) -> Result<DirectText, RenderError> {
    let parts = value["output"]
        .as_array()
        .ok_or(RenderError::InvalidResponse)?;
    let pieces = || {
        parts
            .iter()
            .filter(|item| item["type"] == "message")
            .filter_map(|item| item["content"].as_array())
            .flatten()
    };
    if pieces().any(|part| part["type"] == "refusal") {
        return Err(RenderError::InvalidResponse);
    }
    let texts = || {
        pieces()
            .filter(|part| part["type"] == "output_text")
            .filter_map(|part| part["text"].as_str())
    };
    let bytes = texts()
        .try_fold(0usize, |length, text| length.checked_add(text.len()))
        .filter(|bytes| *bytes <= 40_000)
        .ok_or(RenderError::InvalidResponse)?;
    let custody = budget.reserve(bytes).map_err(|_| RenderError::Capacity)?;
    let mut joined = String::with_capacity(bytes);
    for text in texts() {
        joined.push_str(text);
    }
    Ok(DirectText {
        text: joined,
        _custody: custody,
    })
}

pub(crate) struct DirectText {
    pub(crate) text: String,
    _custody: ByteReservation,
}
