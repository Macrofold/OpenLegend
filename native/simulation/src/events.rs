//! Original event and event-time grammar transport. Literal text stays literal;
//! captured names belong to the original permitted acquisition, never a lookup
//! of a participant's later identity. The actual emitter must finish receiving,
//! history and world reactions before a candidate may publish these events.

use indexmap::IndexMap;
use serde::{Deserialize, Serialize};

use crate::narration::{Narration, NativeText};
use crate::reception::{EncounterExposure, EventScalar};
use crate::state::Point;
use crate::values::{
    deserialize_present_option, deserialize_present_safe_integer, deserialize_safe_integer,
};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum EmissionText {
    Literal(String),
    Narration(Narration),
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EventScope {
    External,
    Private,
    System,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct WorldEvent {
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub exposure: Option<EncounterExposure>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub origin: Option<Point>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub scope: Option<EventScope>,
    pub id: String,
    #[serde(
        default,
        deserialize_with = "deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    pub order: Option<u64>,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub sequence: u64,
    pub at: f64,
    #[serde(rename = "type")]
    pub event_type: String,
    pub text: NativeText,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub narration: Option<Narration>,
    pub audience: Vec<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub importance: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub urgency: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub actor_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub target_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub data: Option<IndexMap<String, EventScalar>>,
}

/// A semantic transition may stage an original occurrence without publishing an
/// unfinished personal acquisition. This is input to the single event owner,
/// not a WorldEvent, a receipt, or evidence that anyone received the occurrence.
#[derive(Clone, Debug)]
pub struct EventEmissionIntent {
    pub event_type: String,
    pub text: EmissionText,
    pub audience: Vec<String>,
    pub source_id: Option<String>,
    pub target_id: Option<String>,
    pub data: Option<IndexMap<String, EventScalar>>,
    pub scope: EventScope,
    pub importance: Option<f64>,
    pub urgency: Option<f64>,
    pub origin: Option<Point>,
    pub exposure: Option<EncounterExposure>,
}

/// Only the actual event emitter may construct completion after its original
/// receiving/history/reaction duties. Identity equality alone is insufficient.
#[derive(Debug)]
pub struct CompletedOccurrence {
    event_id: String,
    order: u64,
    sequence: u64,
}

impl CompletedOccurrence {
    pub fn event_id(&self) -> &str {
        &self.event_id
    }
    pub fn order(&self) -> u64 {
        self.order
    }
    pub fn sequence(&self) -> u64 {
        self.sequence
    }
}
