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
    #[serde(deserialize_with = "cursor_paths")]
    pub pending: Vec<Vec<i64>>,
    #[serde(deserialize_with = "cursor_offset")]
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

fn cursor_paths<'de, D: serde::Deserializer<'de>>(
    deserializer: D,
) -> Result<Vec<Vec<i64>>, D::Error> {
    // JS stores ordinary branches as 0/1 and a prioritized leaf's last entry as
    // -at-1. Floating JSON1.0 is still the integer1 in the current JS format.
    let input = Vec::<Vec<f64>>::deserialize(deserializer)?;
    if input.len() > 64
        || input.iter().any(|path| {
            path.len() > 64
                || path.iter().enumerate().any(|(index, part)| {
                    *part != 0.0
                        && *part != 1.0
                        && !(index + 1 == path.len()
                            && part.is_finite()
                            && part.fract() == 0.0
                            && (-4.0..=-1.0).contains(part))
                })
        })
    {
        return Err(serde::de::Error::custom(
            "Invalid received feature continuation.",
        ));
    }
    Ok(input
        .into_iter()
        .map(|path| path.into_iter().map(|part| part as i64).collect())
        .collect())
}

fn cursor_offset<'de, D: serde::Deserializer<'de>>(deserializer: D) -> Result<u64, D::Error> {
    let offset = deserialize_safe_integer(deserializer)?;
    if offset <= 4 {
        Ok(offset)
    } else {
        Err(serde::de::Error::custom(
            "Invalid received feature continuation offset.",
        ))
    }
}

impl BoundsQueryCursor {
    pub fn validate(&self) -> bool {
        self.pending.len() <= 64
            && self.pending.iter().all(|path| {
                path.len() <= 64
                    && path.iter().enumerate().all(|(index, part)| {
                        *part == 0
                            || *part == 1
                            || (index + 1 == path.len() && (-4..=-1).contains(part))
                    })
            })
            && self.offset <= 4
            && self.truncated != Some(false)
    }
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
