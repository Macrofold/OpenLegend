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
