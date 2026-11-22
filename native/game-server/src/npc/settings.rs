//! Trusted operator settings select provider credentials and spending routes.
//! The authored world provides decision wording and allowed effects separately.

use super::decide::{MacrofoldCatalog, Model, Models};
use crate::narrator::{NarratorMacrofold, NarratorModel};
use crate::provider_transport::{ProviderDestination, ProviderRoute, macrofold::BillingMode};
use std::time::Duration;

type Error = Box<dyn std::error::Error + Send + Sync>;

pub(super) struct ConfiguredModels {
    pub(super) routes: Models,
    interactive: u64,
    jev_only: bool,
}

pub(super) fn embedding_model(
    models: Option<&ConfiguredModels>,
    budget_usd: f64,
) -> Result<Option<super::semantic_index::EmbeddingModel>, Error> {
    if budget_usd == 0.0 || setting("AI_JEV_ONLY", "false")? == "true" {
        return Ok(None);
    }
    let Some(key) = optional("OPENAI_EMBEDDING_API_KEY")?.or(optional("OPENAI_API_KEY")?) else {
        return Ok(None);
    };
    let endpoint = optional("OPENAI_EMBEDDING_ENDPOINT")?;
    let model = setting("EMBEDDING_MODEL", "text-embedding-3-small")?;
    let dimensions = number("EMBEDDING_DIMENSIONS", 512.0, 64.0, 3072.0)?;
    if dimensions.fract() != 0. || model.is_empty() || model.len() > 128 {
        return Err("Invalid personal-memory embedding model configuration".into());
    }
    let amount = micro_usd(number("EMBEDDING_CALL_RESERVE_USD", 0.01, 0.000001, 1.0)?)?;
    let ceiling = micro_usd(budget_usd)?;
    let (input_usd_per_million, reported_aliases) = embedding_price(&model)?;
    let interactive = models.map_or_else(
        || interactive_allowance(judgment_allowance(false)?, micro_usd(0.25)?),
        |models| Ok(models.interactive),
    )?;
    Ok(Some(super::semantic_index::EmbeddingModel {
        destination: ProviderDestination::new(ProviderRoute::Embedding, endpoint.as_deref(), &key)?,
        input_usd_per_million,
        reported_aliases,
        model,
        dimensions: dimensions as usize,
        amount,
        ceiling,
        background_ceiling: ceiling.saturating_sub(interactive),
        timeout: Duration::from_secs_f64(number("AI_TIMEOUT_SECONDS", 15.0, 5.0, 120.0)?),
    }))
}

fn embedding_price(model: &str) -> Result<(Option<f64>, std::sync::Arc<[String]>), Error> {
    #[derive(serde::Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct CatalogueEntry {
        model: String,
        prices: Prices,
        #[serde(default)]
        reported_aliases: Vec<String>,
    }
    #[derive(serde::Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct Prices {
        input_usd_per_million: f64,
    }
    let catalogue: Vec<CatalogueEntry> = optional("OPENAI_MODEL_PRICES_JSON")?
        .map(|raw| serde_json::from_str(&raw))
        .transpose()?
        .unwrap_or_default();
    let mut entries = catalogue.into_iter().filter(|entry| entry.model == model);
    if let Some(entry) = entries.next() {
        if entries.next().is_some() || !(0.0..=1000.0).contains(&entry.prices.input_usd_per_million) {
            return Err("OPENAI_MODEL_PRICES_JSON must give one valid input rate for the embedding model".into());
        }
        return Ok((
            Some(entry.prices.input_usd_per_million),
            entry.reported_aliases.into(),
        ));
    }
    // The existing default catalogue has a separate embedding entry.
    let price = if setting("OPENAI_MODEL", "gpt-5.6-luna")? == model {
        Some(number("LLM_INPUT_USD_PER_MILLION", 0.2, 0.0, 1000.0)?)
    } else {
        (model == "text-embedding-3-small").then_some(0.02)
    };
    Ok((price, Vec::<String>::new().into()))
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
    let judgment_amount = judgment_allowance(macrofold.is_some())?;
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
    let interactive = interactive_allowance(judgment_amount, generation)?;
    Ok((
        limit,
        Some(ConfiguredModels {
            routes: Models {
                judgment,
                fast,
                complex,
                ceiling_micro_usd,
                embedding: None,
            },
            interactive,
            jev_only,
        }),
    ))
}

pub(super) struct SummaryModel {
    pub model: Model,
    pub ceiling: u64,
    pub timeout: Duration,
}

pub(super) fn summary_model(
    models: Option<&ConfiguredModels>,
    budget_usd: f64,
    output_tokens: usize,
) -> Result<Option<SummaryModel>, Error> {
    if budget_usd == 0.0 || setting("AI_JEV_ONLY", "false")? == "true" {
        return Ok(None);
    }
    let assigned = models.and_then(|models| models.routes.fast.as_ref());
    let (model, interactive) = if let Some(fast) = assigned
        && let Some(route) = &fast.macrofold
    {
        (
            Model {
                destination: fast.destination.clone(),
                requested: setting("MACROFOLD_SUMMARY_MODEL", "openai/gpt-5-nano")?,
                amount_micro_usd: fast.amount_micro_usd,
                output_tokens,
                effort: Some("low"),
                macrofold: Some(MacrofoldCatalog {
                    billing: route.billing,
                    connection: route.connection.clone(),
                }),
            },
            models.expect("configured Macrofold").interactive,
        )
    } else {
        let Some(token) = optional("OPENAI_API_KEY")? else {
            return Ok(None);
        };
        let (floor, input, output) = direct_prices()?;
        let reserve = |input_tokens| {
            micro_usd(
                floor
                    .max(0.25)
                    .max((input_tokens * input + output_tokens as f64 * output) / 1_000_000.0),
            )
        };
        (
            Model {
                destination: ProviderDestination::new(ProviderRoute::OpenAi, None, &token)?,
                requested: setting("COGNITION_SUMMARY_MODEL", "gpt-5-nano")?,
                amount_micro_usd: reserve(500_000.0)?,
                output_tokens,
                effort: Some("low"),
                macrofold: None,
            },
            interactive_allowance(judgment_allowance(false)?, reserve(120_000.0)?)?,
        )
    };
    let ceiling = micro_usd(budget_usd)?.saturating_sub(interactive);
    if ceiling < model.amount_micro_usd {
        return Ok(None);
    }
    let timeout = Duration::from_secs_f64(number("AI_TIMEOUT_SECONDS", 35.0, 5.0, 120.0)?);
    Ok(Some(SummaryModel {
        model,
        ceiling,
        timeout,
    }))
}

/// Report effective creation-target model settings through the same parsed
/// route and spending owners the live director uses. No transport starts.
pub(crate) fn creation_model_settings(
    budget_usd: f64,
    summary_tokens: usize,
) -> Result<std::collections::BTreeMap<String, serde_json::Value>, Error> {
    use serde_json::json;
    let (capacity, models) = from_env(budget_usd)?;
    let summary = summary_model(models.as_ref(), budget_usd, summary_tokens)?;
    let narrator = narrator_model(models.as_ref(), budget_usd)?;
    let embedding = embedding_model(models.as_ref(), budget_usd)?;
    let mut values = std::collections::BTreeMap::from([
        ("npcAiCapacity".to_owned(), json!(capacity)),
        (
            "jevOnly".to_owned(),
            json!(setting("AI_JEV_ONLY", "false")? == "true"),
        ),
        (
            "liveAiConfigured".to_owned(),
            json!(models.is_some() || summary.is_some() || narrator.is_some() || embedding.is_some()),
        ),
    ]);
    if let Some(models) = &models {
        let model_names = [
            (
                "jevModel",
                "macrofoldJevModel",
                Some(&models.routes.judgment),
            ),
            (
                "miniModel",
                "macrofoldMiniModel",
                models.routes.fast.as_ref(),
            ),
            (
                "complexModel",
                "macrofoldComplexModel",
                models.routes.complex.as_ref(),
            ),
        ];
        for (direct, managed, model) in model_names {
            if let Some(model) = model {
                let name = if model.macrofold.is_some() {
                    managed
                } else {
                    direct
                };
                values.insert(name.to_owned(), json!(model.requested));
            }
        }
        values.insert(
            "interactiveReserveUsd".to_owned(),
            json!(models.interactive as f64 / 1_000_000.0),
        );
    }
    if let Some(summary) = summary {
        let name = if summary.model.macrofold.is_some() {
            "macrofoldSummaryModel"
        } else {
            "summaryModel"
        };
        values.insert(name.to_owned(), json!(summary.model.requested));
        values.insert(
            "summaryTimeoutSeconds".to_owned(),
            json!(summary.timeout.as_secs_f64()),
        );
    }
    if let Some(narrator) = narrator {
        values.insert("journalModel".to_owned(), json!(narrator.requested));
        values.insert(
            "journalCallReserveUsd".to_owned(),
            json!(narrator.amount as f64 / 1_000_000.0),
        );
    }
    if let Some(embedding) = embedding {
        values.insert("embeddingModel".to_owned(), json!(embedding.model));
        values.insert("embeddingDimensions".to_owned(), json!(embedding.dimensions));
        values.insert("embeddingCallReserveUsd".to_owned(), json!(embedding.amount as f64 / 1_000_000.0));
    }
    Ok(values)
}

fn judgment_allowance(macrofold: bool) -> Result<u64, Error> {
    let price = number("JEV_INPUT_USD_PER_MILLION", 0.042, 0.0, 1000.0)?;
    let minimum = number("JEV_CALL_RESERVE_USD", 0.005, 0.000001, 1.0)?;
    micro_usd(minimum.max((500_000.0 + if macrofold { 1024.0 } else { 0.0 }) * price / 1_000_000.0))
}

fn interactive_allowance(judgment: u64, generation: u64) -> Result<u64, Error> {
    let embedding = micro_usd(number("EMBEDDING_CALL_RESERVE_USD", 0.01, 0.000001, 1.0)?)?;
    Ok(3 * judgment + 2 * generation + embedding)
}

pub(super) fn narrator_model(
    models: Option<&ConfiguredModels>,
    budget_usd: f64,
) -> Result<Option<NarratorModel>, Error> {
    if budget_usd == 0.0 || setting("AI_JEV_ONLY", "false")? == "true" {
        return Ok(None);
    }
    let ceiling = micro_usd(budget_usd)?;
    let timeout = Duration::from_secs_f64(number("AI_TIMEOUT_SECONDS", 35.0, 5.0, 120.0)?);
    if let Some(fast) = models.and_then(|models| models.routes.fast.as_ref())
        && let Some(route) = fast.macrofold.as_ref()
    {
        return Ok(Some(NarratorModel {
            destination: fast.destination.clone(),
            requested: fast.requested.clone(),
            ceiling,
            amount: fast.amount_micro_usd,
            macrofold: Some(NarratorMacrofold {
                billing: route.billing,
                connection: route.connection.clone(),
            }),
            timeout,
        }));
    }
    let Some(token) = optional("OPENAI_API_KEY")? else {
        return Ok(None);
    };
    let (floor, input, output) = direct_prices()?;
    Ok(Some(NarratorModel {
        destination: ProviderDestination::new(ProviderRoute::OpenAi, None, &token)?,
        requested: setting("COGNITION_MINI_MODEL", "gpt-5-mini")?,
        ceiling,
        amount: micro_usd(floor.max((26_000.0 * input + 1800.0 * output) / 1_000_000.0))?,
        macrofold: None,
        timeout,
    }))
}

fn direct_prices() -> Result<(f64, f64, f64), Error> {
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
    let floor = number("LLM_CALL_RESERVE_USD", 0.08, 0.000001, 10.0)?;
    let input = number(names[0], 0.2, 0.0, 1000.0)?
        .max(number(names[2], 0.02, 0.0, 1000.0)?)
        .max(number(names[3], 0.25, 0.0, 1000.0)?);
    let output = number(names[1], 1.2, 0.0, 1000.0)?;
    Ok((floor, input, output))
}

fn direct_language(token: &str) -> Result<(Option<Model>, Option<Model>, u64), Error> {
    let (floor, input, output) = direct_prices()?;
    let floor = floor.max(0.25);
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
