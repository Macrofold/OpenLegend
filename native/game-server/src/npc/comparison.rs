//! Prepare a comparison from the original signed wire bytes. Server settings
//! own the active destination, provider binding and budget at every submission.
use super::{Director, USEFUL_LIFETIME, decide::Model};
use crate::{
    decision_dispatch::{CallFailure, PreparedCall},
    decision_render::provider::MacrofoldBinding,
    provider_transport::{PromptEdit, ProviderRoute, editable_prompt, macrofold::BillingBinding},
    store::{
        AttemptRequest, InferenceClass,
        diagnostics::{Attempt, SavedStageCapture},
    },
};
use openlegend_simulation::encoding::{hex_bytes, json_tree_allocation_bound};
use serde_json::{Value, value::RawValue};
use tokio::time::Instant;

pub(crate) struct Comparison {
    pub call: PreparedCall,
    pub billing: Option<BillingBinding>,
    pub judgment: bool,
    pub streaming: bool,
    pub shared: bool,
}

impl Director {
    pub(crate) fn prepare_comparison(
        &self,
        attempt: &Attempt,
        capture: &SavedStageCapture,
        id: String,
        replacement: Option<String>,
        cut: u64,
    ) -> Result<Comparison, CallFailure> {
        let models = &self.models.as_ref().ok_or(CallFailure::Admission)?.routes;
        let receipt = attempt.receipt.as_ref().ok_or(CallFailure::Invalid)?;
        let judgment = match attempt.stage.as_str() {
            "route" => true,
            "generate" => false,
            _ => return Err(CallFailure::Invalid),
        };
        let model = if judgment {
            &models.judgment
        } else {
            models
                .responses(attempt.level.ok_or(CallFailure::Invalid)?)
                .find(|model| model.requested == receipt.requested_model)
                .ok_or(CallFailure::Stale("model-configuration-changed"))?
        };
        if model.requested != receipt.requested_model || !model.destination.same_worker_grant(receipt.shared_execution.as_ref()) {
            return Err(CallFailure::Stale("model-configuration-changed"));
        }
        let budget = self.game.host.budget();
        let _tree = budget
            .reserve(json_tree_allocation_bound(&capture.input).ok_or(CallFailure::Invalid)?)
            .map_err(|_| CallFailure::DecodeBusy)?;
        let mut body: Value = serde_json::from_str(&capture.input).map_err(|_| CallFailure::Invalid)?;
        let deadline = Instant::now() + USEFUL_LIFETIME;
        let route = model.destination.route();
        if !configuration_matches(model, &body, deadline, judgment) {
            return Err(CallFailure::Stale("model-configuration-changed"));
        }
        let raw: &RawValue =
            serde_json::from_str(&capture.input).map_err(|_| CallFailure::Invalid)?;
        let attempt_id = format!("{id}:attempt:0:comparison");
        let shared = matches!(route,ProviderRoute::WorkerJudge | ProviderRoute::WorkerGenerate);
        let mut request = if shared { model.destination.worker_comparison(&mut body,&attempt_id,budget)? } else { model.destination.inference(
            &raw,
            (route == ProviderRoute::Macrofold).then_some(attempt_id.as_str()),
            budget,
        )? };
        // The original's SQL reader already verified its receipt digest. A different
        // serialization cannot stand in for that exact historical request.
        if !shared && request.buffered_body() != Some(capture.input.as_bytes()) {
            return Err(CallFailure::Invalid);
        }
        if let Some(target) = &model.deployment {
            request = request.for_deployment(&target.owner);
        }
        if let Some(text) = replacement {
            let path = editable_prompt(&attempt.stage, route).ok_or(CallFailure::Invalid)?;
            request.apply_lab_edit(PromptEdit::prepare(std::str::from_utf8(request.buffered_body().ok_or(CallFailure::Invalid)?).map_err(|_|CallFailure::Invalid)?, path, text, budget)?);
        }
        let context_digest = hex_bytes(&request.digest);
        let billing = model.billing();
        Ok(Comparison {
            shared,
            judgment,
            streaming: body["stream"] == true,
            billing,
            call: PreparedCall {
                request,
                allowance: AttemptRequest {
                    id: attempt_id,
                    job: id,
                    actor: capture.proof.witness.actor_id().to_owned(),
                    provider: if judgment {
                        InferenceClass::Jev
                    } else {
                        InferenceClass::OpenAi
                    },
                    category: "comparison",
                    stage: "request-comparison",
                    level: attempt.level,
                    background: false,
                    amount: model.amount_micro_usd,
                    ceiling: models.ceiling_micro_usd,
                },
                requested_model: model.requested.clone(),
                context_digest,
                macrofold_billing_mode: receipt.macrofold_billing_mode.as_deref().and_then(|s| {
                    match s {
                        "byok" => Some("byok"),
                        "managed" => Some("managed"),
                        _ => None,
                    }
                }),
                deadline,
                evidence_cut: cut,
                preview: None,
            },
        })
    }
}

fn configuration_matches(model: &Model, body: &Value, deadline: Instant, judgment: bool) -> bool {
    if matches!(model.destination.route(),ProviderRoute::WorkerJudge|ProviderRoute::WorkerGenerate){
        return judgment || (body.pointer("/request/model").and_then(Value::as_str)==Some(model.requested.as_str()) && body.pointer("/request/maxOutputTokens").and_then(Value::as_u64).is_some_and(|n|n<=super::LAB_GENERATION_TOKENS as u64));
    }
    if model.destination.route() != ProviderRoute::Macrofold {
        return body["model"].as_str() == Some(&model.requested)
            && body.get("model_binding").is_none()
            && (judgment
                || body["max_output_tokens"]
                    .as_u64()
                    .is_some_and(|n| n <= super::LAB_GENERATION_TOKENS as u64));
    }
    let amount = model.amount_micro_usd.to_string();
    let (workspace, binding) = if let Some(deployment) = &model.deployment {
        let selected = deployment.owner.selection;
        (
            Some(selected.workspace_id),
            MacrofoldBinding::Deployment {
                deployment_id: selected.model_binding.deployment_id,
                deployment_revision_id: selected.model_binding.deployment_revision_id,
            },
        )
    } else if let Some(route) = model.route(&amount, deadline) {
        (route.workspace_id, route.binding)
    } else {
        return false;
    };
    serde_json::to_value(workspace).ok().as_ref() == Some(&body["workspace_id"])
        && serde_json::to_value(binding).ok().as_ref() == Some(&body["model_binding"])
        && body
            .pointer("/limits/max_cost_micro_usd")
            .and_then(Value::as_str)
            .and_then(|v| v.parse::<u64>().ok())
            .is_some_and(|n| n <= model.amount_micro_usd)
        && body
            .pointer("/limits/max_output_tokens")
            .and_then(Value::as_u64)
            .is_some_and(|n| {
                n <= if model.deployment.is_some() {
                    model.output_tokens
                } else {
                    super::LAB_GENERATION_TOKENS
                } as u64
            })
}
