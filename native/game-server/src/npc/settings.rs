//! Trusted operator settings select provider credentials and spending routes.
//! The authored world provides decision wording and allowed effects separately.

use super::decide::{MacrofoldCatalog, Model, Models};
use crate::provider_transport::{ProviderDestination, ProviderRoute, macrofold::BillingMode};

type Error = Box<dyn std::error::Error + Send + Sync>;

pub(super) struct ConfiguredModels {
    pub(super) routes: Models,
    interactive: u64,
    jev_only: bool,
}

impl ConfiguredModels {
    pub(super) fn interactive_allowance(&self) -> Option<(u64, u64)> {
        (!self.jev_only && self.routes.fast.is_some() && self.routes.ceiling_micro_usd > 0)
            .then_some((self.interactive, self.routes.ceiling_micro_usd))
    }
}

pub(super) fn from_env(budget_usd: f64) -> Result<(usize, Option<ConfiguredModels>), Error> {
    let limit = setting("OPEN_LEGEND_NPC_AI_CONCURRENCY", "1000")?.parse::<usize>()?;
    if limit == 0 || limit > tokio::sync::Semaphore::MAX_PERMITS {
        return Err("OPEN_LEGEND_NPC_AI_CONCURRENCY is outside the host capacity range".into());
    }
    let macrofold = optional("MACROFOLD_API_KEY")?;
    let jev = optional("TYPESAFE_API_KEY")?.or(optional("JEV_API_KEY")?);
    let language = optional("OPENAI_API_KEY")?;
    if macrofold.is_none() && jev.is_none() {
        return Ok((limit, None));
    }
    let ceiling_micro_usd = micro_usd(budget_usd)?;
    let jev_only = setting("AI_JEV_ONLY", "false")? == "true";
    let jev_price = number("JEV_INPUT_USD_PER_MILLION", 0.042, 0.0, 1000.0)?;
    let jev_minimum = number("JEV_CALL_RESERVE_USD", 0.005, 0.000001, 1.0)?;
    let judgment_amount = micro_usd(jev_minimum.max(
        (500_000.0 + if macrofold.is_some() { 1024.0 } else { 0.0 }) * jev_price / 1_000_000.0,
    ))?;
    let embedding = micro_usd(number("EMBEDDING_CALL_RESERVE_USD", 0.01, 0.000001, 1.0)?)?;
    let (judgment, fast, complex, generation) = if let Some(token) = macrofold {
        let base = setting("MACROFOLD_BASE_URL", "http://localhost:3210")?;
        let billing = match setting("MACROFOLD_BILLING_MODE", "byok")?.as_str() {
            "byok" => BillingMode::Byok,
            "managed" => BillingMode::Managed,
            _ => return Err("MACROFOLD_BILLING_MODE must be byok or managed".into()),
        };
        if optional("OPENLEGEND_MODEL_TARGETS_JSON")?.is_some() {
            return Err(
                "This server build requires supported Macrofold deployment bindings".into(),
            );
        }
        let general_connection = optional("MACROFOLD_PROVIDER_CONNECTION_ID")?;
        let wrap = |requested,
                    amount_micro_usd,
                    output_tokens,
                    effort,
                    connection|
         -> Result<Model, Error> {
            Ok(Model {
                destination: ProviderDestination::new(
                    ProviderRoute::Macrofold,
                    Some(&base),
                    &token,
                )?,
                requested,
                amount_micro_usd,
                output_tokens,
                effort,
                macrofold: Some(MacrofoldCatalog {
                    billing,
                    connection,
                }),
            })
        };
        let generation = micro_usd(number("MACROFOLD_RUN_MAX_USD", 0.25, 0.000001, 10.0)?)?;
        (
            wrap(
                setting("MACROFOLD_JEV_MODEL", "typesafe/jev-1.13")?,
                judgment_amount,
                16_384,
                None,
                optional("MACROFOLD_JEV_CONNECTION_ID")?.or(general_connection.clone()),
            )?,
            if jev_only {
                None
            } else {
                Some(wrap(
                    setting("MACROFOLD_MINI_MODEL", "openai/gpt-5-mini")?,
                    generation,
                    1024,
                    Some("low"),
                    general_connection.clone(),
                )?)
            },
            if jev_only {
                None
            } else {
                Some(wrap(
                    setting("MACROFOLD_COMPLEX_MODEL", "openai/gpt-5")?,
                    generation,
                    4096,
                    Some("low"),
                    general_connection,
                )?)
            },
            generation,
        )
    } else {
        let model = setting("JEV_MODEL", "jev-1.13.0")?;
        if model != "jev-1.13.0" && std::env::var_os("JEV_INPUT_USD_PER_MILLION").is_none() {
            return Err("A custom JEV_MODEL requires an explicit JEV_INPUT_USD_PER_MILLION".into());
        }
        let judgment = Model {
            destination: ProviderDestination::new(
                ProviderRoute::Jev,
                None,
                &jev.expect("configured judgment"),
            )?,
            requested: model,
            macrofold: None,
            amount_micro_usd: judgment_amount,
            output_tokens: 16_384,
            effort: None,
        };
        let (fast, complex, generation) = match language.filter(|_| !jev_only) {
            Some(token) => direct_language(&token)?,
            None => (None, None, 0),
        };
        (judgment, fast, complex, generation)
    };
    let interactive = 3 * judgment_amount + 2 * generation + embedding;
    Ok((
        limit,
        Some(ConfiguredModels {
            routes: Models {
                judgment,
                fast,
                complex,
                ceiling_micro_usd,
            },
            interactive,
            jev_only,
        }),
    ))
}

fn direct_language(token: &str) -> Result<(Option<Model>, Option<Model>, u64), Error> {
    let default = setting("OPENAI_MODEL", "gpt-5.6-luna")?;
    let names = [
        "LLM_INPUT_USD_PER_MILLION",
        "LLM_OUTPUT_USD_PER_MILLION",
        "LLM_CACHED_INPUT_USD_PER_MILLION",
        "LLM_CACHE_WRITE_USD_PER_MILLION",
    ];
    if default != "gpt-5.6-luna" && names.iter().any(|name| std::env::var_os(name).is_none()) {
        return Err("A custom OPENAI_MODEL requires explicit prices".into());
    }
    let floor = number("LLM_CALL_RESERVE_USD", 0.08, 0.000001, 10.0)?.max(0.25);
    let input = number(names[0], 0.2, 0.0, 1000.0)?
        .max(number(names[2], 0.02, 0.0, 1000.0)?)
        .max(number(names[3], 0.25, 0.0, 1000.0)?);
    let output = number(names[1], 1.2, 0.0, 1000.0)?;
    let reserve =
        |input_tokens| micro_usd(floor.max((input_tokens * input + 8192.0 * output) / 1_000_000.0));
    let model = |requested, output_tokens| -> Result<Model, Error> {
        Ok(Model {
            destination: ProviderDestination::new(ProviderRoute::OpenAi, None, token)?,
            requested,
            macrofold: None,
            amount_micro_usd: reserve(500_000.0)?,
            output_tokens,
            effort: Some("low"),
        })
    };
    Ok((
        Some(model(setting("COGNITION_MINI_MODEL", "gpt-5-mini")?, 1024)?),
        Some(model(setting("COGNITION_COMPLEX_MODEL", "gpt-5")?, 4096)?),
        reserve(120_000.0)?,
    ))
}

fn optional(name: &str) -> Result<Option<String>, std::env::VarError> {
    match std::env::var(name) {
        Ok(value) => Ok((!value.is_empty()).then_some(value)),
        Err(std::env::VarError::NotPresent) => Ok(None),
        Err(other) => Err(other),
    }
}

fn setting(name: &str, default: &str) -> Result<String, std::env::VarError> {
    Ok(optional(name)?.unwrap_or_else(|| default.to_owned()))
}

fn number(name: &str, default: f64, minimum: f64, maximum: f64) -> Result<f64, Error> {
    let value = optional(name)?
        .map(|value| value.parse::<f64>())
        .transpose()?
        .unwrap_or(default);
    if (minimum..=maximum).contains(&value) {
        Ok(value)
    } else {
        Err(format!("{name} is outside its configured range").into())
    }
}

fn micro_usd(value: f64) -> Result<u64, Error> {
    let amount = (value * 1_000_000.0).ceil();
    (0.0..=(openlegend_simulation::identity::MAX_SAFE_INTEGER as f64))
        .contains(&amount)
        .then_some(amount as u64)
        .ok_or_else(|| "Spending allowance cannot be represented".into())
}
