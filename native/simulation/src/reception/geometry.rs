//! Personally received physical geometry and its unfinished bounded query.
//! Rebuilding an index never creates terrain knowledge or a new observation.

use super::*;
use crate::received::TemporalCurrentGroupCheckpoint;
use crate::values::{deserialize_present_option, deserialize_safe_integer};
use serde::{Deserialize, Serialize};

// The runtime uses a bool for this literal while decoding checks it below.
fn true_flag<'de, D: serde::Deserializer<'de>>(deserializer: D) -> Result<Option<bool>, D::Error> {
    let flag = bool::deserialize(deserializer)?;
    if flag {
        Ok(Some(true))
    } else {
        Err(serde::de::Error::custom("Invalid truncated coverage flag."))
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct BoundsQueryCursor {
    pub pending: Vec<Vec<u64>>,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub offset: u64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub leaf: Option<bool>,
    #[serde(
        default,
        deserialize_with = "true_flag",
        skip_serializing_if = "Option::is_none"
    )]
    pub truncated: Option<bool>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReceivedGeometryFeature {
    pub observation: ObservationContribution,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub recording: Option<TemporalCurrentGroupCheckpoint>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct GeometryFragment {
    pub feature_id: String,
    pub u0: f64,
    pub u1: f64,
    pub v0: f64,
    pub v1: f64,
    pub observation: ObservationContribution,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub recording: Option<TemporalCurrentGroupCheckpoint>,
    pub key: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PriorGeometryFrame {
    pub at: f64,
    pub frame: ObservationFrame,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReceivedGeometryState {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub input_revision: u64,
    pub basis: String,
    pub source_basis: String,
    pub episode_id: String,
    pub frame: ObservationFrame,
    pub frame_at: f64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub prior_frame: Option<PriorGeometryFrame>,
    pub eye: Point,
    pub radius: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub geometry_revision: u64,
    pub supported_through: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub generation: u64,
    pub next_at: f64,
    pub query_key: String,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub feature_cursor: Option<BoundsQueryCursor>,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub anchor_cursor: u64,
    pub fragments: Vec<GeometryFragment>,
    pub boundaries: Vec<ReceivedGeometryFeature>,
    pub boundary_keys: Vec<String>,
    pub finished: bool,
    pub unknown: bool,
    pub complete: bool,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub visited: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub bytes: u64,
}
