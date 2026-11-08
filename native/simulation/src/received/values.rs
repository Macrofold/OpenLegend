//! Immutable shared values. Sharing never grants an observer a receipt.
//!
//! Retention and inline thresholds match domain/received-values.ts. A phase-local
//! identity index is derived from still-owned values and is not saved history.

use std::collections::BTreeMap;
use std::sync::Arc;

use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::encoding::json_record;
use crate::identity::IdentityState;
use crate::reception::{
    ObservationFrame, ObservedBodyDetails, ObservedBodyPose, ObservedLocation,
    ReceivedObservationHeader, SensoryFacet,
};
use crate::values::{deserialize_present_option, deserialize_safe_integer, is_safe_record_id};

use super::ReceivedError;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ReceivedValueReference {
    Shared(String),
    Inline(Box<ReceivedValueFragment>),
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum BodyKind {
    #[serde(rename = "body")]
    Body,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum LocationKind {
    #[serde(rename = "location")]
    Location,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum BodyPoseKind {
    #[serde(rename = "body-pose")]
    BodyPose,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum HeaderKind {
    #[serde(rename = "observation-header")]
    Header,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum FrameKind {
    #[serde(rename = "observation-frame")]
    Frame,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum PersonalAccountKind {
    #[serde(rename = "personal-account")]
    PersonalAccount,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PersonalAccountSource {
    Awareness,
    Memory,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BodyFragment {
    pub kind: BodyKind,
    pub body: ObservedBodyDetails,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct LocationFragment {
    pub kind: LocationKind,
    pub location: ObservedLocation,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BodyPoseFragment {
    pub kind: BodyPoseKind,
    pub pose: ObservedBodyPose,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct HeaderFragment {
    pub kind: HeaderKind,
    pub header: ReceivedObservationHeader,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct FrameFragment {
    pub kind: FrameKind,
    pub frame: ObservationFrame,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PersonalAccountFragment {
    pub kind: PersonalAccountKind,
    pub source: PersonalAccountSource,
    pub id: String,
    pub text: String,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub event_type: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub content: Option<String>,
    /// Current event data is an immutable open data payload, never executable
    /// code or a mutable world/component store.
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        serialize_with = "crate::encoding::serialize_optional_js_object",
        skip_serializing_if = "Option::is_none"
    )]
    pub data: Option<serde_json::Map<String, Value>>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ReceivedValueFragment {
    Sensory(SensoryFacet),
    Body(BodyFragment),
    Location(LocationFragment),
    BodyPose(BodyPoseFragment),
    PersonalAccount(PersonalAccountFragment),
    Header(HeaderFragment),
    Frame(FrameFragment),
}

impl ReceivedValueFragment {
    pub fn kind(&self) -> &'static str {
        match self {
            Self::Sensory(value) => value.kind(),
            Self::Body(_) => "body",
            Self::Location(_) => "location",
            Self::BodyPose(_) => "body-pose",
            Self::PersonalAccount(_) => "personal-account",
            Self::Header(_) => "observation-header",
            Self::Frame(_) => "observation-frame",
        }
    }

    pub fn validate(&self, through: f64) -> Result<(), ReceivedError> {
        // These three sensory shapes are split by the actual receiving owner
        // before storage. Accepting them here would lose independent pose/detail
        // clocks or permit an observation-frame shortcut during restoration.
        if matches!(self, Self::Sensory(value) if matches!(value.kind(), "body" | "location" | "observed-motion"))
        {
            return Err(ReceivedError(
                "Received value has an unsplit sensory representation.",
            ));
        }
        let valid = match self {
            Self::Sensory(value) => value.validate().is_ok(),
            Self::Body(value) => value.body.validate(),
            Self::Location(value) => value.location.validate().is_ok(),
            Self::BodyPose(value) => value.pose.validate(),
            Self::Frame(value) => value.frame.validate(),
            Self::PersonalAccount(value) => !value.id.is_empty(),
            Self::Header(value) => {
                let header = &value.header;
                is_safe_record_id(&header.observer.actor_id)
                    && header.acquired_at.is_finite()
                    && header.acquired_at >= 0.0
                    && header.acquired_at <= through
                    && header.detector.version > 0
                    && header.channel.as_ref().is_none_or(|channel| {
                        channel.is_valid()
                            && channel.id == header.detector.id
                            && channel.version == header.detector.version
                    })
            }
        };
        if valid {
            Ok(())
        } else {
            Err(ReceivedError("Invalid received value fragment."))
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReceivedValueRecord {
    pub id: String,
    pub at: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub sequence: u64,
    pub value: ReceivedValueFragment,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub bytes: u64,
}

pub struct RetainedValue {
    pub reference: ReceivedValueReference,
    pub added_bytes: u64,
    pub value_bytes: u64,
}

#[derive(Debug, Default)]
pub struct ReceivedValues {
    sources: IndexMap<String, Arc<ReceivedValueRecord>>,
    phase_at: Option<f64>,
    phase_values: BTreeMap<String, String>,
}

impl ReceivedValues {
    pub fn install(
        records: Vec<ReceivedValueRecord>,
        through: f64,
        sequence: u64,
    ) -> Result<Self, ReceivedError> {
        let mut sources = IndexMap::new();
        for record in records {
            record.value.validate(through)?;
            if !is_safe_record_id(&record.id)
                || !record.at.is_finite()
                || record.at < 0.0
                || record.at > through
                || record.sequence > sequence
                || sources.contains_key(&record.id)
            {
                return Err(ReceivedError(
                    "Invalid or duplicate received value identity.",
                ));
            }
            let encoded = json_record(&record)
                .map_err(|_| ReceivedError("Received value encoding failed."))?;
            if encoded.len() as u64 != record.bytes {
                return Err(ReceivedError(
                    "Received value bytes disagree with its current body.",
                ));
            }
            sources.insert(record.id.clone(), Arc::new(record));
        }
        Ok(Self {
            sources,
            phase_at: None,
            phase_values: BTreeMap::new(),
        })
    }

    pub fn value_at<'a>(
        &'a self,
        reference: &'a ReceivedValueReference,
    ) -> Option<&'a ReceivedValueFragment> {
        match reference {
            ReceivedValueReference::Shared(id) => self.sources.get(id).map(|record| &record.value),
            ReceivedValueReference::Inline(value) => Some(value),
        }
    }

    pub fn shared_value(&self, id: &str) -> Option<&ReceivedValueFragment> {
        self.sources.get(id).map(|record| &record.value)
    }

    pub fn capture(&self, ids: &[String]) -> Result<Vec<Arc<ReceivedValueRecord>>, ReceivedError> {
        ids.iter()
            .map(|id| {
                self.sources
                    .get(id)
                    .cloned()
                    .ok_or(ReceivedError("Selected received value is unavailable."))
            })
            .collect()
    }

    pub fn retain(
        &mut self,
        value: ReceivedValueFragment,
        preferred: Option<&ReceivedValueReference>,
        at: f64,
        sequence: u64,
        identity: &mut IdentityState,
    ) -> Result<RetainedValue, ReceivedError> {
        value.validate(at)?;
        let encoded =
            json_record(&value).map_err(|_| ReceivedError("Received value encoding failed."))?;
        let value_bytes = encoded.len() as u64;
        if let Some(preferred) = preferred
            && let Some(held) = self.value_at(preferred)
            && json_record(held).map_err(|_| ReceivedError("Received value encoding failed."))?
                == encoded
        {
            return Ok(RetainedValue {
                reference: preferred.clone(),
                added_bytes: 0,
                value_bytes,
            });
        }
        if matches!(
            value.kind(),
            "body-pose" | "location" | "observation-frame" | "observation-header"
        ) || (value.kind() != "body" && value_bytes <= 192)
        {
            return Ok(RetainedValue {
                reference: ReceivedValueReference::Inline(Box::new(value)),
                added_bytes: 0,
                value_bytes,
            });
        }
        if self.phase_at != Some(at) {
            self.phase_at = Some(at);
            self.phase_values.clear();
        }
        if let Some(id) = self.phase_values.get(&encoded)
            && self.sources.contains_key(id)
        {
            return Ok(RetainedValue {
                reference: ReceivedValueReference::Shared(id.clone()),
                added_bytes: 0,
                value_bytes,
            });
        }
        let issued = identity
            .allocate("received-value")
            .map_err(|_| ReceivedError("Received value identity is exhausted."))?;
        let mut record = ReceivedValueRecord {
            id: issued.id,
            at,
            sequence,
            value,
            bytes: 0,
        };
        for _ in 0..4 {
            let bytes = json_record(&record)
                .map_err(|_| ReceivedError("Received value encoding failed."))?
                .len() as u64;
            if bytes == record.bytes {
                break;
            }
            record.bytes = bytes;
        }
        let id = record.id.clone();
        let added_bytes = record.bytes;
        self.sources.insert(id.clone(), Arc::new(record));
        self.phase_values.insert(encoded, id.clone());
        Ok(RetainedValue {
            reference: ReceivedValueReference::Shared(id),
            added_bytes,
            value_bytes,
        })
    }

    /// Called by the shared received-value release owner after its exact current
    /// contact/history/support/pending-capture reference check.
    pub(crate) fn release_unreferenced(
        &mut self,
        ids: &[String],
        referenced: &BTreeMap<String, u64>,
    ) {
        for id in ids {
            if referenced.get(id).copied().unwrap_or(0) == 0 {
                self.sources.shift_remove(id);
            }
        }
    }
}
