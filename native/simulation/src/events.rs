//! Original event and event-time grammar transport. Literal text stays literal;
//! captured names belong to the original permitted acquisition, never a lookup
//! of a participant's later identity. The actual emitter must finish receiving,
//! history and world reactions before a candidate may publish these events.

use indexmap::IndexMap;
use serde::{Deserialize, Serialize};

use crate::narration::{CapturedNarration, Narration, NativeText};
use crate::reception::{EncounterExposure, EventScalar};
use crate::state::Point;
use crate::values::{
    deserialize_present_option, deserialize_present_safe_integer, deserialize_safe_integer,
};

mod history;
pub use history::*;
mod emission;
mod save;
pub(crate) use emission::{BegunOccurrence, EmissionError, begin_staged_occurrence};
pub(crate) use save::encode_occurrence_changes;

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(untagged)]
pub enum EmissionText {
    Literal(crate::text::JsText),
    Captured(CapturedNarration),
    Narration(Narration),
}
impl<'de> Deserialize<'de> for EmissionText {
    fn deserialize<D: serde::Deserializer<'de>>(de: D) -> Result<Self, D::Error> {
        let raw = Box::<serde_json::value::RawValue>::deserialize(de)?;
        if raw.get().starts_with('"') {
            serde_json::from_str(raw.get())
                .map(Self::Literal)
                .map_err(serde::de::Error::custom)
        } else {
            let fields =
                crate::encoding::RawFields::parse(raw.get()).map_err(serde::de::Error::custom)?;
            if fields.contains("kind") {
                serde_json::from_str(raw.get())
                    .map(Self::Captured)
                    .map_err(serde::de::Error::custom)
            } else {
                serde_json::from_str(raw.get())
                    .map(Self::Narration)
                    .map_err(serde::de::Error::custom)
            }
        }
    }
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
        serialize_with = "crate::encoding::serialize_optional_js_map",
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
    pub audience: AudienceSelection,
    pub source_id: Option<String>,
    pub target_id: Option<String>,
    pub data: Option<IndexMap<String, EventScalar>>,
    pub scope: EventScope,
    pub origin: Option<Point>,
    pub exposure: Option<EncounterExposure>,
}

/// Physical occurrences prove their actual recipients through the receiver
/// owner. A private or already witnessed producer can name its exact recipients;
/// an empty explicit list never stands in for unfinished physical reception.
#[derive(Clone, Debug)]
pub enum AudienceSelection {
    Physical,
    Explicit(Vec<String>),
}

/// Only the actual event emitter may construct completion after its original
/// receiving/history/reaction duties. Identity equality alone is insufficient.
#[derive(Debug)]
pub struct CompletedOccurrence {
    event_id: String,
    order: u64,
    sequence: u64,
}

/// The original event and each receiver's admitted source are placed before a
/// reaction may emit a nested occurrence. The actual acquisition owner creates
/// this token; the public transport cannot synthesize completion from IDs.
#[derive(Debug)]
pub struct AcquiredOccurrence {
    event_id: String,
    order: u64,
    sequence: u64,
}

impl AcquiredOccurrence {
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

mod cursor;
mod receiver;
pub(crate) use cursor::{CompletedEvent, EventAnswer, EventCursor, EventError, EventStep};
