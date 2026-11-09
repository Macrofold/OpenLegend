//! Personally received selection/continuation records. These refer to acquired
//! exposures and exact facts; private entity identity does not grant familiarity.

use crate::reception::{ObservationExposure, ObservationFactKey, ObservedPoint, ObserverSubject};
use crate::values::{deserialize_present_option, deserialize_safe_integer};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};

mod policy;
pub use policy::*;
mod storage;
pub use storage::*;
mod validation;
pub use validation::attention_subject_key;
mod recording;
pub(crate) use recording::*;
mod retained_size;

pub const SELF_RELATION_KEY: &str = "@self";

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum AttentionBasis {
    Direct,
    Work,
    Explicit,
    Cue,
    Discovery,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AttentionPoint {
    pub point: ObservedPoint,
    pub error_radius: f64,
    pub at: f64,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct AttentionPresentation {
    pub key: String,
    pub description_revision: String,
    pub change_revision: String,
    #[serde(default, deserialize_with = "deserialize_present_option", skip_serializing_if = "Option::is_none")]
    pub point: Option<AttentionPoint>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AttentionAnnotation {
    pub source_id: String,
    pub lease_id: String,
    pub exposure: ObservationExposure,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub presented_description: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub presented_change: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub anchor: Option<AttentionPoint>,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub order: u64,
    pub acquired_at: f64,
    pub urgency: f64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub urgency_through: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub urgency_source: Option<ObservationFactKey>,
    pub direct: bool,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub direct_through: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub direct_source: Option<ObservationFactKey>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AttentionEntry {
    pub key: String,
    pub source_id: String,
    pub lease_id: String,
    pub exposure: ObservationExposure,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub subject: Option<ObserverSubject>,
    pub description_revision: String,
    pub change_revision: String,
    pub basis: AttentionBasis,
    pub started_at: f64,
    pub stable_until: f64,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum AttentionRelationFamily {
    ClosingBody,
    ClosingDrop,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AttentionRelationWitness {
    pub id: String,
    pub distance_lower: f64,
    pub distance_upper: f64,
    pub decrease_lower: f64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub drop_lower: Option<f64>,
    pub proof: Vec<ObservationFactKey>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AttentionRelationEvaluation {
    pub anchor_key: String,
    pub family: AttentionRelationFamily,
    pub revision: String,
    pub exhausted: bool,
    pub complete: bool,
    pub clear_supported: bool,
    pub witnesses: Vec<AttentionRelationWitness>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AttentionRelationLatch {
    pub anchor_key: String,
    pub family: AttentionRelationFamily,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub generation: u64,
    pub active: bool,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub clear_since: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub entry_proof: Option<Vec<ObservationFactKey>>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub newest_proof: Option<Vec<ObservationFactKey>>,
    pub revision: String,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub entered_at: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub witness_id: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AttentionRelationScan {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub cursor: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub remaining: u64,
    pub revision: String,
    pub clear_supported: bool,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AttentionState {
    pub policy: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub next_order: u64,
    #[serde(serialize_with = "crate::encoding::serialize_js_map")]
    pub annotations: IndexMap<String, AttentionAnnotation>,
    pub entries: Vec<AttentionEntry>,
    pub explicit: Vec<String>,
    #[serde(serialize_with = "crate::encoding::serialize_js_map")]
    pub latches: IndexMap<String, AttentionRelationLatch>,
    pub next_relation_at: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub relation_cursor: u64,
    #[serde(deserialize_with = "discovery_cursor")]
    pub discovery_cursor: i64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub relation_revision: u64,
    #[serde(
        deserialize_with = "crate::values::deserialize_safe_integer_map",
        serialize_with = "crate::encoding::serialize_js_map"
    )]
    pub relation_dirty: IndexMap<String, u64>,
    #[serde(serialize_with = "crate::encoding::serialize_js_map")]
    pub relation_scans: IndexMap<String, AttentionRelationScan>,
}

fn discovery_cursor<'de, D: serde::Deserializer<'de>>(deserializer: D) -> Result<i64, D::Error> {
    let value = f64::deserialize(deserializer)?;
    if value.is_finite()
        && value.fract() == 0.0
        && value >= -1.0
        && value <= crate::identity::MAX_SAFE_INTEGER as f64
    {
        Ok(value as i64)
    } else {
        Err(serde::de::Error::custom(
            "Invalid attention discovery cursor.",
        ))
    }
}
