//! Exact immediate-inference receipt interpretation. The application owns the
//! durable reservation and correlation. Wire completion and usable billing
//! are independent facts, and neither authorizes gameplay effects.

use super::{MAX_SAFE_INTEGER, valid_reference};
use openlegend_simulation::encoding::json_record;
use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum BillingMode {
    Managed,
    Byok,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub(crate) enum RunStatus {
    Succeeded,
    Failed,
    Cancelled,
    TimedOut,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub(crate) enum InferenceOutcome {
    Value,
    Unknown,
    Refused,
    InvalidOutput,
    Failed,
    Uncertain,
    StaleInput,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub(crate) enum ProviderOutcome {
    NotInvoked,
    Responded,
    Uncertain,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "snake_case")]
enum ExecutionOutcome {
    Success,
    Failure,
    Cancelled,
    TimedOut,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum InvalidReceipt {
    Envelope,
    RunIdentity,
    DeploymentIdentity,
}

impl std::fmt::Display for InvalidReceipt {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(match self {
            Self::Envelope => "macrofold_inference_outcome_invalid",
            Self::RunIdentity => "macrofold_terminal_identity_invalid",
            Self::DeploymentIdentity => "macrofold_deployment_identity_invalid",
        })
    }
}

impl std::error::Error for InvalidReceipt {}

#[derive(Clone, Copy)]
pub(crate) struct BillingBinding {
    pub mode: BillingMode,
    pub deployment: Option<DeploymentPin>,
}

#[derive(Clone, Copy)]
pub(crate) struct DeploymentPin {
    pub id: uuid::Uuid,
    pub revision: Option<uuid::Uuid>,
}

#[derive(Deserialize)]
pub(crate) struct ObservationUrls<'a> {
    pub status: &'a str,
    pub result: &'a str,
}

/// Borrow a single response body as either an acknowledged Run needing
/// observation, or an immediate result. Pending callers retain the original
/// identity and only use these URLs with the destination's same-origin gate.
#[derive(Deserialize)]
pub(crate) struct MacrofoldAdmission<'a> {
    pub run_id: &'a str,
    kind: Option<&'a str>,
    status: Option<&'a str>,
    #[serde(borrow)]
    result: Option<&'a RawValue>,
    #[serde(borrow)]
    pub urls: Option<ObservationUrls<'a>>,
}

impl<'a> MacrofoldAdmission<'a> {
    pub(crate) fn read(bytes: &'a [u8]) -> Result<Self, InvalidReceipt> {
        let value: Self = serde_json::from_slice(bytes).map_err(|_| InvalidReceipt::Envelope)?;
        if !valid_reference(value.run_id, 256) {
            return Err(InvalidReceipt::RunIdentity);
        }
        Ok(value)
    }

    pub(crate) fn terminal(
        &self,
        binding: BillingBinding,
    ) -> Result<Option<TerminalInference<'a>>, InvalidReceipt> {
        let Some((status, raw)) = self.status.and_then(run_status).zip(self.result) else {
            return Ok(None);
        };
        // The immediate gateway projection holds no separate Run charge.
        let result: TerminalResult<'_> =
            serde_json::from_str(raw.get()).map_err(|_| InvalidReceipt::Envelope)?;
        terminal(self.run_id, self.kind, status, None, result, binding).map(Some)
    }
}

/// Read the finalized result of an already recorded Run. `None` is the
/// provider's explicit pending result and allows only observation of this ID.
pub(crate) fn observed_terminal<'a>(
    expected: &str,
    status: &'a [u8],
    result: &'a [u8],
    binding: BillingBinding,
) -> Result<Option<TerminalInference<'a>>, InvalidReceipt> {
    #[derive(Deserialize)]
    struct Run<'a> {
        id: &'a str,
        kind: &'a str,
        status: &'a str,
        #[serde(borrow)]
        cost_micro_usd: Option<&'a RawValue>,
    }
    let run: Run<'_> = serde_json::from_slice(status).map_err(|_| InvalidReceipt::Envelope)?;
    let observed: TerminalResult<'_> =
        serde_json::from_slice(result).map_err(|_| InvalidReceipt::Envelope)?;
    if run.id != expected || observed.run_id != expected || run.kind != "inference" {
        return Err(InvalidReceipt::RunIdentity);
    }
    let Some(status) = run_status(run.status).filter(|_| observed.final_result) else {
        return Ok(None);
    };
    terminal(
        expected,
        Some(run.kind),
        status,
        run.cost_micro_usd.and_then(micro_charge),
        observed,
        binding,
    )
    .map(Some)
}

fn run_status(value: &str) -> Option<RunStatus> {
    match value {
        "succeeded" => Some(RunStatus::Succeeded),
        "failed" => Some(RunStatus::Failed),
        "cancelled" => Some(RunStatus::Cancelled),
        "timed_out" => Some(RunStatus::TimedOut),
        _ => None,
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TokenUsage {
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub cached_input_tokens: Option<u64>,
    pub cache_write_input_tokens: Option<u64>,
    pub reasoning_output_tokens: Option<u64>,
}

pub(crate) struct TerminalInference<'a> {
    pub status: RunStatus,
    pub outcome: InferenceOutcome,
    pub provider_outcome: ProviderOutcome,
    pub completion_uncertain: bool,
    pub output: Option<&'a RawValue>,
    pub usage: Option<TokenUsage>,
    pub estimated_micro_usd: Option<u64>,
    pub provider_reported_micro_usd: Option<u64>,
    pub model_revision: Option<&'a str>,
    pub reason: Option<&'a str>,
    pub deployment: Option<(uuid::Uuid, uuid::Uuid)>,
    pub fixed_fee_attribution: bool,
}

#[derive(Deserialize)]
struct TerminalResult<'a> {
    run_id: &'a str,
    #[serde(rename = "final")]
    final_result: bool,
    #[serde(borrow)]
    execution_outcome: Option<&'a RawValue>,
    #[serde(borrow)]
    inference: Option<&'a RawValue>,
}

#[derive(Deserialize)]
struct Inference<'a> {
    outcome: InferenceOutcome,
    provider_outcome: ProviderOutcome,
    #[serde(borrow)]
    value: Option<&'a RawValue>,
    #[serde(borrow)]
    billing: Option<&'a RawValue>,
    #[serde(borrow)]
    usage: Option<&'a RawValue>,
    #[serde(borrow, default, deserialize_with = "present_raw")]
    deployment: Option<&'a RawValue>,
    #[serde(borrow)]
    cost_attribution: Option<&'a RawValue>,
    #[serde(borrow)]
    model_revision: Option<&'a RawValue>,
    #[serde(borrow)]
    reason_code: Option<&'a RawValue>,
}

fn terminal<'a>(
    expected: &str,
    kind: Option<&str>,
    status: RunStatus,
    run_charge: Option<u64>,
    result: TerminalResult<'a>,
    binding: BillingBinding,
) -> Result<TerminalInference<'a>, InvalidReceipt> {
    if kind != Some("inference") || result.run_id != expected || !result.final_result {
        return Err(InvalidReceipt::RunIdentity);
    }
    let inference: Inference<'_> = result
        .inference
        .and_then(|raw| serde_json::from_str(raw.get()).ok())
        .ok_or(InvalidReceipt::Envelope)?;
    let outcome = inference.outcome;
    let provider_outcome = inference.provider_outcome;
    let expected_status = if matches!(
        outcome,
        InferenceOutcome::Value
            | InferenceOutcome::Unknown
            | InferenceOutcome::Refused
            | InferenceOutcome::StaleInput
    ) {
        RunStatus::Succeeded
    } else {
        RunStatus::Failed
    };
    let expected_execution = match status {
        RunStatus::Succeeded => ExecutionOutcome::Success,
        RunStatus::Failed => ExecutionOutcome::Failure,
        RunStatus::Cancelled => ExecutionOutcome::Cancelled,
        RunStatus::TimedOut => ExecutionOutcome::TimedOut,
    };
    let uncertain = outcome == InferenceOutcome::Uncertain
        || provider_outcome == ProviderOutcome::Uncertain
        || (outcome == InferenceOutcome::Value && provider_outcome == ProviderOutcome::NotInvoked)
        || result
            .execution_outcome
            .and_then(|raw| serde_json::from_str(raw.get()).ok())
            != Some(expected_execution)
        || (!matches!(status, RunStatus::Cancelled | RunStatus::TimedOut)
            && status != expected_status);
    let deployment = deployment(&inference, binding.deployment)?;
    let attributed =
        deployment.is_some_and(|(id, _)| exact_attribution(inference.cost_attribution, id));
    let usage = inference.usage.and_then(|raw| usage(raw, inference.value));
    let (estimate, reported) = billing(
        &inference,
        binding,
        attributed && !uncertain,
        usage.is_some(),
        run_charge,
    );
    Ok(TerminalInference {
        status,
        outcome,
        provider_outcome,
        completion_uncertain: uncertain,
        output: if !uncertain
            && outcome == InferenceOutcome::Value
            && status == RunStatus::Succeeded
        {
            inference.value
        } else {
            None
        },
        usage,
        estimated_micro_usd: estimate,
        provider_reported_micro_usd: reported,
        model_revision: inference.model_revision.and_then(wire_str).filter(|value| {
            value.len() <= 128
                && !value.is_empty()
                && value.bytes().all(|c| {
                    c.is_ascii_alphanumeric() || matches!(c, b'.' | b'_' | b':' | b'/' | b'-')
                })
        }),
        reason: inference
            .reason_code
            .and_then(wire_str)
            .filter(|value| valid_reference(value, 128)),
        deployment,
        fixed_fee_attribution: attributed,
    })
}

fn deployment(
    inference: &Inference<'_>,
    expected: Option<DeploymentPin>,
) -> Result<Option<(uuid::Uuid, uuid::Uuid)>, InvalidReceipt> {
    #[derive(Deserialize)]
    struct Report<'a> {
        deployment_id: &'a str,
        deployment_revision_id: &'a str,
    }
    if inference.deployment.is_none()
        && (expected.is_none()
            || (inference.provider_outcome == ProviderOutcome::NotInvoked
                && inference.outcome != InferenceOutcome::Value))
    {
        return Ok(None);
    }
    let report: Report<'_> = inference
        .deployment
        .and_then(|raw| serde_json::from_str(raw.get()).ok())
        .ok_or(InvalidReceipt::DeploymentIdentity)?;
    let id = checked_uuid(report.deployment_id).ok_or(InvalidReceipt::DeploymentIdentity)?;
    let revision =
        checked_uuid(report.deployment_revision_id).ok_or(InvalidReceipt::DeploymentIdentity)?;
    if expected.is_some_and(|expected| {
        expected.id != id || expected.revision.is_some_and(|pin| pin != revision)
    }) {
        return Err(InvalidReceipt::DeploymentIdentity);
    }
    Ok(Some((id, revision)))
}

fn checked_uuid(value: &str) -> Option<uuid::Uuid> {
    let parsed = uuid::Uuid::parse_str(value).ok()?;
    let mut utf8 = uuid::Uuid::encode_buffer();
    parsed
        .as_hyphenated()
        .encode_lower(&mut utf8)
        .eq_ignore_ascii_case(value)
        .then_some(parsed)
}

fn exact_attribution(raw: Option<&RawValue>, expected: uuid::Uuid) -> bool {
    #[derive(Deserialize)]
    struct Attribution<'a> {
        basis: &'a str,
        deployment_id: &'a str,
        infrastructure_cost_included: bool,
    }
    raw.and_then(|raw| serde_json::from_str::<Attribution<'_>>(raw.get()).ok())
        .is_some_and(|value| {
            value.basis == "deployment"
                && checked_uuid(value.deployment_id) == Some(expected)
                && !value.infrastructure_cost_included
        })
}

fn billing(
    inference: &Inference<'_>,
    binding: BillingBinding,
    exact_fee: bool,
    complete_usage: bool,
    run: Option<u64>,
) -> (Option<u64>, Option<u64>) {
    #[derive(Deserialize)]
    struct Report<'a> {
        #[serde(borrow, default, deserialize_with = "present_raw")]
        billing_mode: Option<&'a RawValue>,
        #[serde(borrow)]
        charged_micro_usd: Option<&'a RawValue>,
        #[serde(borrow)]
        reported_micro_usd: Option<&'a RawValue>,
        #[serde(borrow)]
        budget_cost_micro_usd: Option<&'a RawValue>,
        #[serde(borrow)]
        provisional: Option<&'a RawValue>,
        #[serde(borrow)]
        provider_reported_cost_usd: Option<&'a RawValue>,
        #[serde(borrow)]
        provider_reported_cost_status: Option<&'a RawValue>,
    }
    let admission = match binding.mode {
        BillingMode::Managed => "managed",
        BillingMode::Byok => "byok",
    };
    let report = inference
        .billing
        .and_then(|raw| serde_json::from_str::<Report<'_>>(raw.get()).ok());
    if report
        .as_ref()
        .and_then(|row| row.billing_mode)
        .is_some_and(|reported| wire_str(reported) != Some(admission))
    {
        return (None, None);
    }
    let report = report.filter(|row| row.billing_mode.and_then(wire_str) == Some(admission));
    let platform = (binding.mode == BillingMode::Managed)
        .then_some(run)
        .flatten();
    let estimate = match (binding.mode, report.as_ref()) {
        (BillingMode::Managed, _) => platform.max(
            report
                .as_ref()
                .and_then(|row| row.charged_micro_usd)
                .and_then(micro_charge),
        ),
        (BillingMode::Byok, Some(row))
            if exact_fee
                && binding.deployment.is_some()
                && [
                    row.charged_micro_usd,
                    row.reported_micro_usd,
                    row.budget_cost_micro_usd,
                ]
                .into_iter()
                .all(|amount| amount.and_then(micro_charge) == Some(0)) =>
        {
            Some(0)
        }
        (BillingMode::Byok, Some(row))
            if complete_usage && row.provisional.is_some_and(|flag| flag.get() == "false") =>
        {
            row.reported_micro_usd.and_then(micro_charge)
        }
        _ => None,
    };
    let reported = report
        .filter(|row| row.provider_reported_cost_status.and_then(wire_str) == Some("reported"))
        .and_then(|row| row.provider_reported_cost_usd)
        .and_then(|raw| serde_json::from_str::<f64>(raw.get()).ok())
        .and_then(usd_micro);
    (estimate, reported)
}

fn present_raw<'de, D: serde::Deserializer<'de>>(
    data: D,
) -> Result<Option<&'de RawValue>, D::Error> {
    <&RawValue>::deserialize(data).map(Some)
}

fn wire_str(value: &RawValue) -> Option<&str> {
    serde_json::from_str(value.get()).ok()
}

fn usage(raw: &RawValue, native: Option<&RawValue>) -> Option<TokenUsage> {
    #[derive(Deserialize)]
    struct Report<'a> {
        completeness: &'a str,
        input_tokens: &'a str,
        output_tokens: &'a str,
        #[serde(borrow)]
        cached_input_tokens: &'a RawValue,
        #[serde(borrow)]
        cache_write_input_tokens: &'a RawValue,
    }
    let data: Report<'_> = serde_json::from_str(raw.get()).ok()?;
    if data.completeness != "complete" {
        return None;
    }
    let input_tokens = decimal_count(data.input_tokens)?;
    let output_tokens = decimal_count(data.output_tokens)?;
    let detail = |raw: &RawValue| {
        if raw.get() == "null" {
            Some(None)
        } else {
            decimal_count(serde_json::from_str::<&str>(raw.get()).ok()?).map(Some)
        }
    };
    let cached_input_tokens = detail(data.cached_input_tokens)?;
    let cache_write_input_tokens = detail(data.cache_write_input_tokens)?;
    if cached_input_tokens.unwrap_or(0) + cache_write_input_tokens.unwrap_or(0) > input_tokens {
        return None;
    }
    let reasoning_output_tokens = native.and_then(|value| reasoning(value, output_tokens));
    Some(TokenUsage {
        input_tokens,
        output_tokens,
        cached_input_tokens,
        cache_write_input_tokens,
        reasoning_output_tokens,
    })
}

fn reasoning(value: &RawValue, output: u64) -> Option<u64> {
    #[derive(Deserialize)]
    struct Value<'a> {
        #[serde(borrow)]
        usage: &'a RawValue,
    }
    #[derive(Deserialize)]
    struct Usage<'a> {
        prompt_tokens: Option<u64>,
        completion_tokens: Option<u64>,
        output_tokens: Option<u64>,
        #[serde(borrow)]
        completion_tokens_details: Option<&'a RawValue>,
        #[serde(borrow)]
        output_tokens_details: Option<&'a RawValue>,
    }
    #[derive(Deserialize)]
    struct Detail {
        reasoning_tokens: u64,
    }
    let value: Value<'_> = serde_json::from_str(value.get()).ok()?;
    let usage: Usage<'_> = serde_json::from_str(value.usage.get()).ok()?;
    let (count, details) = if usage.prompt_tokens.is_some() {
        (usage.completion_tokens, usage.completion_tokens_details)
    } else {
        (usage.output_tokens, usage.output_tokens_details)
    };
    if count != Some(output) {
        return None;
    }
    let detail: Detail = serde_json::from_str(details?.get()).ok()?;
    (detail.reasoning_tokens <= output).then_some(detail.reasoning_tokens)
}

fn decimal_count(value: &str) -> Option<u64> {
    if value.is_empty() || !value.bytes().all(|c| c.is_ascii_digit()) {
        return None;
    }
    let digits = value.trim_start_matches('0');
    let amount = if digits.is_empty() {
        0
    } else {
        digits.parse::<u64>().ok()?
    };
    (amount <= MAX_SAFE_INTEGER).then_some(amount)
}

fn micro_charge(raw: &RawValue) -> Option<u64> {
    let amount = decimal_count(serde_json::from_str::<&str>(raw.get()).ok()?)?;
    (usd_micro(amount as f64 / 1_000_000.0) == Some(amount)).then_some(amount)
}

// Use the stable JS numeric spelling for the existing decimal ceiling. Doing
// this with f64 multiplication can add a microdollar to an exact decimal amount.
fn usd_micro(value: f64) -> Option<u64> {
    if !value.is_finite() || value < 0.0 {
        return None;
    }
    if value == 0.0 {
        return Some(0);
    }
    let text = json_record(&value).ok()?;
    let (mantissa, exponent) = text.split_once('e').unwrap_or((&text, "0"));
    let (whole, fraction) = mantissa.split_once('.').unwrap_or((mantissa, ""));
    let digits = whole
        .bytes()
        .chain(fraction.bytes())
        .try_fold(0_u128, |number, digit| {
            number
                .checked_mul(10)?
                .checked_add(u128::from(digit.checked_sub(b'0')?))
        })?;
    let power = 6 + exponent.parse::<i32>().ok()? - fraction.len() as i32;
    let amount = if power >= 0 {
        digits.checked_mul(10_u128.checked_pow(power as u32)?)?
    } else if let Some(divisor) = 10_u128.checked_pow(power.unsigned_abs()) {
        digits.div_ceil(divisor)
    } else {
        1
    };
    (amount <= MAX_SAFE_INTEGER as u128).then_some(amount as u64)
}
