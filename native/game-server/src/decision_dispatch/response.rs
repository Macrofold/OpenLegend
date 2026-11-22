//! Common provider terminal and independently accounted decoded body.

use super::{CallFailure, ModelUsage, ProviderObservation};
use crate::provider_transport::{
    FundedReply, HttpEvidence,
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
    move |body, http| {
        let mut observation = ProviderObservation {
            value: Err(CallFailure::Invalid),
            provider_request_id: http.trace_id.clone(),
            model: None,
            usage: None,
            charged_microusd: None,
            completion_uncertain: true,
        };
        if let Some(billing) = billing {
            let binding = BillingBinding {
                mode: billing,
                deployment: None,
            };
            let result = if let Some(observed) = &body.observed {
                observation.provider_request_id = Some(observed.run.id.clone());
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
                if let Some(parsed) = result
                    .output
                    .and_then(|output| FundedJson::read(output.get(), &budget).ok())
                {
                    observation.value = use_output(&parsed.value);
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
            observation.value = use_output(&parsed.value);
        }
        observation
    }
}

struct FundedJson {
    value: Value,
    _custody: ByteReservation,
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
