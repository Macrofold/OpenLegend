//! Common provider terminal and independently accounted decoded body.

use super::{CallFailure, ModelUsage, ProviderObservation};
use crate::provider_transport::{
    FundedReply, HttpEvidence,
    deployment::{DeploymentAttribution, DeploymentRevision},
    macrofold::{self, BillingBinding, BillingMode},
};
use openlegend_simulation::{
    encoding::json_tree_allocation_bound,
    host::{ByteBudget, ByteReservation},
};
use serde_json::Value;

/// Decode the common provider envelope and retain charge evidence independently
/// of the consumer's prepared answer, including a rejected answer.
pub(crate) fn decode_provider<T, F>(
    billing: Option<BillingMode>,
    budget: ByteBudget,
    use_output: F,
) -> impl FnOnce(FundedReply, &HttpEvidence) -> ProviderObservation<T>
where
    F: FnOnce(&Value) -> Result<T, CallFailure>,
{
    decode_provider_bound(
        billing.map(|mode| BillingBinding {
            mode,
            deployment: None,
        }),
        false,
        budget,
        use_output,
    )
}

pub(crate) fn decode_provider_bound<T, F>(
    billing: Option<BillingBinding>,
    native: bool,
    budget: ByteBudget,
    use_output: F,
) -> impl FnOnce(FundedReply, &HttpEvidence) -> ProviderObservation<T>
where
    F: FnOnce(&Value) -> Result<T, CallFailure>,
{
    move |body, http| {
        let mut observation = ProviderObservation {
            value: Err(CallFailure::Invalid),
            provider_request_id: http.trace_id.clone(),
            macrofold_run: None,
            model: None,
            usage: None,
            charged_microusd: None,
            completion_uncertain: true,
            proof: Default::default(),
            unsupported_deployment: false,
        };
        if let Some(binding) = billing {
            let result = if let Some(observed) = &body.observed {
                observation.provider_request_id = Some(observed.run.id.clone());
                observation.macrofold_run = observed.run.inference_id;
                macrofold::observed_terminal(
                    &observed.run.id,
                    &observed.status,
                    &body.bytes,
                    binding,
                )
                .ok()
                .flatten()
            } else {
                macrofold::MacrofoldAdmission::read(&body.bytes)
                    .ok()
                    .and_then(|admission| {
                        observation.provider_request_id = Some(admission.run_id.to_owned());
                        observation.macrofold_run = admission.inference_id();
                        admission.terminal(binding).ok().flatten()
                    })
            };
            if let Some(result) = result {
                observation.model = result.model_revision.map(str::to_owned);
                observation.usage = result.usage.map(|usage| ModelUsage {
                    input_tokens: usage.input_tokens,
                    output_tokens: usage.output_tokens,
                });
                observation.charged_microusd = result.estimated_micro_usd;
                observation.completion_uncertain = result.completion_uncertain;
                observation.unsupported_deployment = result.reason
                    == Some("unsupported_model_capability")
                    && !result.completion_uncertain;
                if binding.deployment.is_some() {
                    observation.proof.macrofold_deployment =
                        result
                            .deployment
                            .map(
                                |(deployment_id, deployment_revision_id)| DeploymentRevision {
                                    deployment_id,
                                    deployment_revision_id,
                                },
                            );
                    observation.proof.macrofold_cost_attribution = result
                        .deployment
                        .filter(|_| result.fixed_fee_attribution)
                        .map(|(deployment_id, _)| DeploymentAttribution::new(deployment_id));
                }
                if let Some(parsed) = result
                    .output
                    .and_then(|output| FundedJson::read(output.get(), &budget).ok())
                {
                    capture_native_facts(&mut observation, &parsed.value, native);
                    if observation.proof.native_truncated != Some(true) {
                        observation.value = use_output(&parsed.value);
                    }
                }
            }
        } else if let Ok(text) = std::str::from_utf8(&body.bytes)
            && let Ok(parsed) = FundedJson::read(text, &budget)
        {
            observation.model = parsed.value["model"].as_str().map(str::to_owned);
            observation.provider_request_id = parsed.value["id"]
                .as_str()
                .map(str::to_owned)
                .or(observation.provider_request_id);
            observation.usage = parsed.value["usage"]["input_tokens"]
                .as_u64()
                .zip(parsed.value["usage"]["output_tokens"].as_u64())
                .map(|(input_tokens, output_tokens)| ModelUsage {
                    input_tokens,
                    output_tokens,
                });
            observation.completion_uncertain = false;
            capture_native_facts(&mut observation, &parsed.value, native);
            if observation.proof.native_truncated != Some(true) {
                observation.value = use_output(&parsed.value);
            }
        }
        observation
    }
}

fn capture_native_facts<T>(observation: &mut ProviderObservation<T>, output: &Value, native: bool) {
    if native {
        observation.proof.native_latency_ms = output["latency_ms"]
            .as_f64()
            .filter(|latency| latency.is_finite() && *latency >= 0.);
        observation.proof.native_truncated = output["truncated"].as_bool();
    }
}

struct FundedJson {
    value: Value,
    _custody: ByteReservation,
}

pub(crate) fn decode_embeddings(
    body: FundedReply,
    http: &HttpEvidence,
    count: usize,
    dimensions: usize,
    input_price: Option<(&str, &[String], f64)>,
    budget: &ByteBudget,
) -> ProviderObservation<crate::store::recall::semantic::Embeddings> {
    use crate::store::recall::semantic::Embeddings;
    use std::mem::size_of;

    let mut observed = ProviderObservation {
        value: Err(CallFailure::Invalid),
        provider_request_id: http.trace_id.clone(),
        macrofold_run: None,
        model: None,
        usage: None,
        charged_microusd: None,
        completion_uncertain: true,
        proof: Default::default(),
        unsupported_deployment: false,
    };
    let Some(parsed) = std::str::from_utf8(&body.bytes)
        .ok()
        .and_then(|body| FundedJson::read(body, budget).ok())
    else {
        return observed;
    };
    let value = &parsed.value;
    observed.model = value["model"]
        .as_str()
        .filter(|model| {
            model.len() <= 128
                && model
                    .bytes()
                    .all(|byte| byte.is_ascii_alphanumeric() || b"-._/:".contains(&byte))
        })
        .map(str::to_owned);
    let tokens = value["usage"]["prompt_tokens"].as_u64();
    if let Some(input_tokens) =
        tokens.filter(|tokens| *tokens <= openlegend_simulation::identity::MAX_SAFE_INTEGER)
    {
        observed.usage = Some(ModelUsage {
            input_tokens,
            output_tokens: 0,
        });
        observed.charged_microusd = input_price
            .filter(|(priced, aliases, _)| {
                value["model"].as_str().is_none_or(|reported| {
                    reported == *priced || aliases.iter().any(|alias| alias == reported)
                })
            })
            .map(|(_, _, price)| (price * input_tokens as f64).ceil())
            .filter(|amount| *amount <= openlegend_simulation::identity::MAX_SAFE_INTEGER as f64)
            .map(|amount| amount as u64);
    }
    observed.completion_uncertain = observed.charged_microusd.is_none();
    observed.value = (|| {
        let rows = value["data"]
            .as_array()
            .filter(|rows| rows.len() == count)
            .ok_or(CallFailure::Invalid)?;
        let bytes = count
            .checked_mul(size_of::<Vec<f64>>() + dimensions * size_of::<f64>())
            .ok_or(CallFailure::Invalid)?;
        let custody = budget.reserve(bytes).map_err(|_| CallFailure::Invalid)?;
        let mut vectors = vec![Vec::new(); count];
        for row in rows {
            let index = row["index"]
                .as_u64()
                .and_then(|at| usize::try_from(at).ok())
                .filter(|at| *at < count)
                .ok_or(CallFailure::Invalid)?;
            if !vectors[index].is_empty() {
                return Err(CallFailure::Invalid);
            }
            let values = row["embedding"]
                .as_array()
                .filter(|values| values.len() == dimensions)
                .ok_or(CallFailure::Invalid)?;
            let mut vector = Vec::with_capacity(values.len());
            let mut nonzero = false;
            for value in values {
                let value = value
                    .as_f64()
                    .filter(|value| (*value as f32).is_finite())
                    .ok_or(CallFailure::Invalid)?;
                nonzero |= value as f32 != 0.;
                vector.push(value);
            }
            if !nonzero {
                return Err(CallFailure::Invalid);
            }
            vectors[index] = vector;
        }
        Ok(Embeddings {
            values: vectors,
            _custody: custody,
        })
    })();
    observed
}

impl FundedJson {
    fn read(text: &str, budget: &ByteBudget) -> Result<Self, CallFailure> {
        let bound = json_tree_allocation_bound(text).ok_or(CallFailure::Invalid)?;
        let custody = budget.reserve(bound).map_err(|_| CallFailure::Invalid)?;
        Ok(Self {
            value: serde_json::from_str(text).map_err(|_| CallFailure::Invalid)?,
            _custody: custody,
        })
    }
}
