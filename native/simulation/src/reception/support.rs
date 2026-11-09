//! Exact finite sensory support continuation. Roots deduplicate actual delivery;
//! they are not evidence that two hidden producers are the same individual.

use super::*;
use crate::values::{deserialize_present_option, deserialize_safe_integer};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "kebab-case", deny_unknown_fields)]
pub enum DetectionFraction {
    Rate { fraction: f64 },
    Impulse { fraction: f64 },
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DetectionLocation {
    pub value: ObservedLocation,
    pub frame: ObservationFrame,
    pub measured_at: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DetectionSupportInput {
    pub source: EvidenceSource,
    pub channel: DefinitionPin,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub sample: u64,
    pub modality: Modality,
    pub detector: DetectorIdentity,
    pub from: f64,
    pub through: f64,
    pub support: DetectionFraction,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub location: Option<DetectionLocation>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub continuity: Option<ObservationExposure>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub ambiguous: Option<bool>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub contradictory: Option<bool>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SupportReceipt {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub sample: u64,
    pub body: String,
    pub through: f64,
    pub pattern_id: String,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub observation: Option<ObservationContribution>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ActiveSupport {
    pub key: String,
    pub input: DetectionSupportInput,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SupportPattern {
    pub id: String,
    pub channel: DefinitionPin,
    pub detector: DetectorIdentity,
    pub modality: Modality,
    pub began_at: f64,
    pub through: f64,
    pub last_supported_at: f64,
    pub progress: f64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub continuity: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub envelope: Option<ObservedLocation>,
    pub ambiguous: bool,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub active: Option<ActiveSupport>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub observation: Option<ObservationContribution>,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DetectionSupportState {
    pub policy: VersionedFamily,
    #[serde(serialize_with = "crate::encoding::serialize_js_map")]
    pub sources: IndexMap<String, SupportReceipt>,
    #[serde(serialize_with = "crate::encoding::serialize_js_map")]
    pub patterns: IndexMap<String, SupportPattern>,
}

/// The selected world's exact detector law, including its source-derived game
/// time rates. Installation supplies this body; the engine chooses no defaults.
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DetectionSupportPolicy {
    pub id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub version: u64,
    pub threshold: f64,
    pub maximum: f64,
    pub full_strength_seconds: f64,
    pub decay_seconds: f64,
    pub full_rate_per_game_second: f64,
    pub decay_per_game_second: f64,
    pub grace_seconds: f64,
}
impl crate::install::DefinitionIdentity for DetectionSupportPolicy {
    fn definition_id(&self) -> &str {
        &self.id
    }
    fn definition_version(&self) -> u64 {
        self.version
    }
}

fn invalid() -> crate::received::ReceivedError {
    crate::received::ReceivedError("Invalid native detection support continuation.")
}
/// These closed source DTOs have ASCII field names and no dictionaries. This
/// private canonicalizer therefore has exactly the source key order; it must
/// never be reused for arbitrary authored-definition keys (localeCompare).
fn support_canonical<T: Serialize>(value: &T) -> Result<String, crate::received::ReceivedError> {
    fn ordered(value: serde_json::Value) -> serde_json::Value {
        match value {
            serde_json::Value::Array(values) => {
                serde_json::Value::Array(values.into_iter().map(ordered).collect())
            }
            serde_json::Value::Object(values) => {
                let mut entries: Vec<_> = values.into_iter().collect();
                entries.sort_by(|a, b| a.0.cmp(&b.0));
                serde_json::Value::Object(
                    entries
                        .into_iter()
                        .map(|(key, value)| (key, ordered(value)))
                        .collect(),
                )
            }
            other => other,
        }
    }
    crate::encoding::json_value(&ordered(
        serde_json::to_value(value).map_err(|_| invalid())?,
    ))
    .map_err(|_| invalid())
}
fn validate_input(
    input: &DetectionSupportInput,
    observer: &ObserverLife,
    now: f64,
) -> Result<(), crate::received::ReceivedError> {
    let fraction = match input.support {
        DetectionFraction::Rate { fraction } | DetectionFraction::Impulse { fraction } => fraction,
    };
    if input.source.validate().is_err()
        || !input.channel.is_valid()
        || input.source.observer != *observer
        || !matches!(
            input.source.family,
            EvidenceFamily::NativeExposure | EvidenceFamily::NativeResponse
        )
        || input.detector.id.is_empty()
        || input.detector.version < 1
        || ![input.from, input.through, fraction]
            .into_iter()
            .all(f64::is_finite)
        || input.from > now
        || input.through < input.from
        || !(0.0..=1.0).contains(&fraction)
        || matches!(input.support, DetectionFraction::Impulse { .. }) && input.from != input.through
        || input.continuity.as_ref().is_some_and(|continuity| {
            continuity.validate().is_err() || continuity.observer != *observer
        })
    {
        return Err(invalid());
    }
    if let Some(location) = &input.location {
        if location.value.validate().is_err()
            || !location.frame.validate()
            || !location.measured_at.is_finite()
            || location.measured_at > input.from
        {
            return Err(invalid());
        }
    }
    Ok(())
}
impl DetectionSupportState {
    pub(crate) fn validate(
        &self,
        entities: &crate::state::EntityStore,
        observer_id: &str,
        now: f64,
        policy: &DetectionSupportPolicy,
        originals: &mut super::OriginalRevisionRegistry,
    ) -> Result<(), crate::received::ReceivedError> {
        let entity = entities
            .get(observer_id)
            .filter(|entity| entity.actor.is_some())
            .ok_or_else(invalid)?;
        let observer = ObserverLife {
            actor_id: observer_id.to_owned(),
            physical_life: entity.physical_life().ok_or_else(invalid)?,
        };
        if self.policy.id != policy.id || self.policy.version != policy.version {
            return Err(invalid());
        }
        for (key, receipt) in &self.sources {
            let pattern = self.patterns.get(&receipt.pattern_id).ok_or_else(invalid)?;
            if !receipt.through.is_finite() || receipt.through > now {
                return Err(invalid());
            }
            let input: DetectionSupportInput =
                serde_json::from_str(&receipt.body).map_err(|_| invalid())?;
            validate_input(&input, &observer, now)?;
            let continuity = input
                .continuity
                .as_ref()
                .map(support_canonical)
                .transpose()?;
            if continuity != pattern.continuity
                || support_canonical(&(&input.source, &input.channel))? != *key
                || input.sample != receipt.sample
                || pattern.channel != input.channel
                || pattern.detector != input.detector
                || pattern.modality != input.modality
            {
                return Err(invalid());
            }
            if let Some(observation) = &receipt.observation {
                originals.validate(observation)?;
                if observation.observer != observer {
                    return Err(invalid());
                }
            }
        }
        for (id, pattern) in &self.patterns {
            if !pattern.channel.is_valid()
                || pattern.id != *id
                || !id.starts_with("perception-pattern-")
                || ![
                    pattern.began_at,
                    pattern.through,
                    pattern.last_supported_at,
                    pattern.progress,
                ]
                .into_iter()
                .all(f64::is_finite)
                || pattern.through > now
                || pattern.progress < 0.0
                || pattern.progress > policy.maximum
                || pattern.began_at > pattern.through
                || pattern.last_supported_at > pattern.through
                || !self.sources.values().any(|source| source.pattern_id == *id)
            {
                return Err(invalid());
            }
            if pattern
                .envelope
                .as_ref()
                .is_some_and(|envelope| envelope.validate().is_err())
            {
                return Err(invalid());
            }
            if let Some(observation) = &pattern.observation {
                originals.validate(observation)?;
                if observation.observer != observer {
                    return Err(invalid());
                }
            }
            if let Some(active) = &pattern.active {
                validate_input(&active.input, &observer, now)?;
                if !matches!(active.input.support, DetectionFraction::Rate { .. })
                    || self.sources.get(&active.key).is_none_or(|source| {
                        support_canonical(&active.input).map_or(true, |body| body != source.body)
                    })
                {
                    return Err(invalid());
                }
            }
        }
        Ok(())
    }
}

#[path = "support/policy_residency.rs"]
mod policy_residency;
