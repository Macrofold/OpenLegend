//! Immutable shared values. Sharing never grants an observer a receipt.
//!
//! Retention and inline thresholds match domain/received-values.ts. A phase-local
//! identity index is derived from still-owned values and is not saved history.

use std::collections::BTreeMap;
use std::sync::Arc;

use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::activity::ActivityDisplayLimits;
use crate::encoding::json_record;
use crate::identity::IdentityState;
use crate::reception::{
    ObservationFrame, ObservedBodyDetails, ObservedBodyPose, ObservedLocation,
    ReceivedObservationHeader, SensoryFacet,
};
use crate::values::{deserialize_present_option, deserialize_safe_integer, is_safe_record_id};

use super::{ActionResultValue, ReceivedError};

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(untagged)]
pub enum ReceivedValueReference {
    Shared(String),
    Inline(Box<ReceivedValueFragment>),
}
impl<'de> Deserialize<'de> for ReceivedValueReference {
    fn deserialize<D: serde::Deserializer<'de>>(de: D) -> Result<Self, D::Error> {
        let raw = Box::<serde_json::value::RawValue>::deserialize(de)?;
        if raw.get().trim_start().starts_with('"') {
            serde_json::from_str(raw.get())
                .map(Self::Shared)
                .map_err(serde::de::Error::custom)
        } else {
            serde_json::from_str(raw.get())
                .map(Self::Inline)
                .map_err(serde::de::Error::custom)
        }
    }
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
    pub text: crate::text::JsText,
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
    pub content: Option<crate::text::JsText>,
    /// Current event data is an immutable open data payload, never executable
    /// code or a mutable world/component store.
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub data: Option<PersonalAccountData>,
}

/// Immutable event data already encoded by its actual permitted producer. Raw
/// JSON retains quoted UTF-16 units; this object grants no executable behavior.
#[derive(Clone, Debug, Serialize)]
#[serde(transparent)]
pub struct PersonalAccountData(Box<serde_json::value::RawValue>);
impl PartialEq for PersonalAccountData {
    fn eq(&self, other: &Self) -> bool {
        self.0.get() == other.0.get()
    }
}
impl<'de> Deserialize<'de> for PersonalAccountData {
    fn deserialize<D: serde::Deserializer<'de>>(de: D) -> Result<Self, D::Error> {
        let raw = Box::<serde_json::value::RawValue>::deserialize(de)?;
        if !raw.get().trim_start().starts_with('{') {
            return Err(serde::de::Error::custom(
                "Personal event data must be an object.",
            ));
        }
        Ok(Self(raw))
    }
}
impl PersonalAccountData {
    pub(crate) fn from_encoded(encoded: String) -> Result<Self, ReceivedError> {
        let raw = serde_json::value::RawValue::from_string(encoded)
            .map_err(|_| ReceivedError("Personal event data encoding failed."))?;
        if !raw.get().trim_start().starts_with('{') {
            return Err(ReceivedError("Personal event data must be an object."));
        }
        Ok(Self(raw))
    }
}
impl crate::host::retained_size::HeapBytes for PersonalAccountData {
    fn heap_bytes(&self) -> Option<usize> {
        Some(self.0.get().len())
    }
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(untagged)]
pub enum ReceivedValueFragment {
    Sensory(SensoryFacet),
    Body(BodyFragment),
    Location(LocationFragment),
    BodyPose(BodyPoseFragment),
    PersonalAccount(PersonalAccountFragment),
    ActionResult(ActionResultValue),
    Header(HeaderFragment),
    Frame(FrameFragment),
}
impl<'de> Deserialize<'de> for ReceivedValueFragment {
    fn deserialize<D: serde::Deserializer<'de>>(de: D) -> Result<Self, D::Error> {
        let raw = Box::<serde_json::value::RawValue>::deserialize(de)?;
        #[derive(Deserialize)]
        struct Kind {
            kind: String,
        }
        let kind: Kind = serde_json::from_str(raw.get()).map_err(serde::de::Error::custom)?;
        macro_rules! value {
            ($kind:ident) => {
                serde_json::from_str(raw.get())
                    .map(Self::$kind)
                    .map_err(serde::de::Error::custom)
            };
        }
        match kind.kind.as_str() {
            "body" => value!(Body),
            "location" => value!(Location),
            "body-pose" => value!(BodyPose),
            "personal-account" => value!(PersonalAccount),
            "action-result" => value!(ActionResult),
            "observation-header" => value!(Header),
            "observation-frame" => value!(Frame),
            _ => value!(Sensory),
        }
    }
}

impl ReceivedValueFragment {
    pub fn kind(&self) -> &'static str {
        match self {
            Self::Sensory(value) => value.kind(),
            Self::Body(_) => "body",
            Self::Location(_) => "location",
            Self::BodyPose(_) => "body-pose",
            Self::PersonalAccount(_) => "personal-account",
            Self::ActionResult(_) => "action-result",
            Self::Header(_) => "observation-header",
            Self::Frame(_) => "observation-frame",
        }
    }

    pub fn validate(
        &self,
        through: f64,
        activity_limits: &ActivityDisplayLimits,
    ) -> Result<(), ReceivedError> {
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
            Self::ActionResult(value) => value.validate(activity_limits),
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

/// Candidate-local cursor. The single mutation owner binds it to its world and
/// generation; accepting an outer candidate discards the inverse journal.
#[derive(Clone, Copy, Debug)]
pub struct ReceivedValuesCheckpoint {
    operations: usize,
}

#[derive(Debug)]
enum ReceivedValuesUndo {
    SourceInsert(String),
    PhaseReplace {
        at: Option<f64>,
        values: BTreeMap<Arc<str>, String>,
    },
    PhaseInsert {
        key: Arc<str>,
        previous: Option<String>,
    },
}

#[derive(Debug)]
pub struct ReceivedValues {
    sources: IndexMap<String, SharedReceivedValue>,
    phase_at: Option<f64>,
    phase_values: BTreeMap<Arc<str>, String>,
    undo: Vec<ReceivedValuesUndo>,
    activity_limits: Arc<ActivityDisplayLimits>,
}

#[derive(Debug)]
struct SharedReceivedValue {
    record: Arc<ReceivedValueRecord>,
    /// Immutable fragment encoding is charged by every owning logical block.
    /// Derive once with the source; repeated metadata reads do not serialize it.
    encoding: Arc<str>,
}

enum RetentionPlan {
    Resolved(RetainedValue),
    Shared {
        value: ReceivedValueFragment,
        encoded: String,
    },
}

fn retention_plan(
    values: Option<&ReceivedValues>,
    value: ReceivedValueFragment,
    preferred: Option<&ReceivedValueReference>,
    at: f64,
    limits: &ActivityDisplayLimits,
) -> Result<RetentionPlan, ReceivedError> {
    value.validate(at, limits)?;
    let encoded =
        json_record(&value).map_err(|_| ReceivedError("Received value encoding failed."))?;
    let value_bytes = encoded.len() as u64;
    if let Some(preferred) = preferred {
        let equal = match preferred {
            ReceivedValueReference::Shared(id) => values
                .and_then(|values| values.sources.get(id))
                .is_some_and(|owned| owned.encoding.as_ref() == encoded),
            ReceivedValueReference::Inline(held) => {
                json_record(held).map_err(|_| ReceivedError("Received value encoding failed."))?
                    == encoded
            }
        };
        if equal {
            return Ok(RetentionPlan::Resolved(RetainedValue {
                reference: preferred.clone(),
                added_bytes: 0,
                value_bytes,
            }));
        }
    }
    if matches!(
        value.kind(),
        "body-pose" | "location" | "observation-frame" | "observation-header"
    ) || (value.kind() != "body" && value_bytes <= 192)
    {
        return Ok(RetentionPlan::Resolved(RetainedValue {
            reference: ReceivedValueReference::Inline(Box::new(value)),
            added_bytes: 0,
            value_bytes,
        }));
    }
    Ok(RetentionPlan::Shared { value, encoded })
}

/// Root presence follows actual retention: an inline value cannot create an
/// empty received-value store. The existing owner still makes every sharing and
/// identity decision, including exact preferred content and phase deduplication.
pub fn retain_received_value(
    values: &mut Option<ReceivedValues>,
    value: ReceivedValueFragment,
    preferred: Option<&ReceivedValueReference>,
    at: f64,
    sequence: u64,
    identity: &mut IdentityState,
    limits: &Arc<ActivityDisplayLimits>,
) -> Result<RetainedValue, ReceivedError> {
    if let Some(values) = values {
        return values.retain(value, preferred, at, sequence, identity);
    }
    match retention_plan(None, value, preferred, at, limits)? {
        RetentionPlan::Resolved(retained) => Ok(retained),
        RetentionPlan::Shared { value, encoded } => {
            let mut owner = ReceivedValues {
                sources: IndexMap::new(),
                phase_at: None,
                phase_values: BTreeMap::new(),
                undo: Vec::new(),
                activity_limits: Arc::clone(limits),
            };
            let retained = owner.retain_shared(value, encoded, at, sequence, identity)?;
            *values = Some(owner);
            Ok(retained)
        }
    }
}

impl ReceivedValues {
    pub(crate) fn inserted_records(&self) -> impl Iterator<Item = &Arc<ReceivedValueRecord>> {
        self.undo.iter().filter_map(|operation| match operation {
            ReceivedValuesUndo::SourceInsert(id) => self.sources.get(id).map(|value| &value.record),
            _ => None,
        })
    }
    pub fn install(
        records: Vec<ReceivedValueRecord>,
        through: f64,
        sequence: u64,
        activity_limits: Arc<ActivityDisplayLimits>,
    ) -> Result<Self, ReceivedError> {
        let mut sources = IndexMap::new();
        for record in records {
            record.value.validate(through, &activity_limits)?;
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
            let encoding: Arc<str> = Arc::from(
                json_record(&record.value)
                    .map_err(|_| ReceivedError("Received value encoding failed."))?,
            );
            sources.insert(
                record.id.clone(),
                SharedReceivedValue {
                    record: Arc::new(record),
                    encoding,
                },
            );
        }
        Ok(Self {
            sources,
            phase_at: None,
            phase_values: BTreeMap::new(),
            undo: Vec::new(),
            activity_limits,
        })
    }

    pub fn activity_limits(&self) -> &ActivityDisplayLimits {
        &self.activity_limits
    }

    pub fn value_at<'a>(
        &'a self,
        reference: &'a ReceivedValueReference,
    ) -> Option<&'a ReceivedValueFragment> {
        match reference {
            ReceivedValueReference::Shared(id) => {
                self.sources.get(id).map(|owned| &owned.record.value)
            }
            ReceivedValueReference::Inline(value) => Some(value),
        }
    }

    pub fn shared_value(&self, id: &str) -> Option<&ReceivedValueFragment> {
        self.sources.get(id).map(|owned| &owned.record.value)
    }

    pub fn shared_value_bytes(&self, id: &str) -> Option<u64> {
        self.sources
            .get(id)
            .map(|owned| owned.encoding.len() as u64)
    }

    pub fn shared_record(&self, id: &str) -> Option<&Arc<ReceivedValueRecord>> {
        self.sources.get(id).map(|owned| &owned.record)
    }

    pub fn capture(&self, ids: &[String]) -> Result<Vec<Arc<ReceivedValueRecord>>, ReceivedError> {
        ids.iter()
            .map(|id| {
                self.sources
                    .get(id)
                    .map(|owned| Arc::clone(&owned.record))
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
        match retention_plan(Some(self), value, preferred, at, &self.activity_limits)? {
            RetentionPlan::Resolved(retained) => Ok(retained),
            RetentionPlan::Shared { value, encoded } => {
                self.retain_shared(value, encoded, at, sequence, identity)
            }
        }
    }

    fn retain_shared(
        &mut self,
        value: ReceivedValueFragment,
        encoded: String,
        at: f64,
        sequence: u64,
        identity: &mut IdentityState,
    ) -> Result<RetainedValue, ReceivedError> {
        let value_bytes = encoded.len() as u64;
        if self.phase_at != Some(at) {
            self.undo.push(ReceivedValuesUndo::PhaseReplace {
                at: self.phase_at,
                values: std::mem::take(&mut self.phase_values),
            });
            self.phase_at = Some(at);
        }
        if let Some(id) = self.phase_values.get(encoded.as_str())
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
        self.undo.push(ReceivedValuesUndo::SourceInsert(id.clone()));
        let key: Arc<str> = Arc::from(encoded);
        self.sources.insert(
            id.clone(),
            SharedReceivedValue {
                record: Arc::new(record),
                encoding: Arc::clone(&key),
            },
        );
        let previous = self.phase_values.insert(Arc::clone(&key), id.clone());
        self.undo
            .push(ReceivedValuesUndo::PhaseInsert { key, previous });
        Ok(RetainedValue {
            reference: ReceivedValueReference::Shared(id),
            added_bytes,
            value_bytes,
        })
    }

    pub fn checkpoint(&self) -> ReceivedValuesCheckpoint {
        ReceivedValuesCheckpoint {
            operations: self.undo.len(),
        }
    }

    /// Inverses restore phase sharing as well as source residency: clearing the
    /// dedup cache would issue different IDs on the next attempt at the same time.
    /// The enclosing owner separately rolls back the shared identity sequence.
    pub fn rollback_to(
        &mut self,
        checkpoint: ReceivedValuesCheckpoint,
    ) -> Result<(), ReceivedError> {
        if checkpoint.operations > self.undo.len() {
            return Err(ReceivedError("Stale received-value rollback cursor."));
        }
        while self.undo.len() > checkpoint.operations {
            match self.undo.pop().expect("Journal length checked") {
                ReceivedValuesUndo::SourceInsert(id) => {
                    if self.sources.shift_remove(&id).is_none() {
                        return Err(ReceivedError("Received-value rollback source is absent."));
                    }
                }
                ReceivedValuesUndo::PhaseReplace { at, values } => {
                    self.phase_at = at;
                    self.phase_values = values;
                }
                ReceivedValuesUndo::PhaseInsert { key, previous } => match previous {
                    Some(id) => {
                        self.phase_values.insert(key, id);
                    }
                    None => {
                        self.phase_values.remove(&key);
                    }
                },
            }
        }
        Ok(())
    }

    /// Called once the outer candidate is accepted, after all nested event
    /// checkpoints have finished. No durable-save acknowledgement is implied.
    pub fn discard_undo(&mut self) {
        self.undo.clear();
    }
}
