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
use crate::encoding::{json_record, json_record_len};
use crate::host::retained_size::HeapBytes;
use crate::host::{ByteBudget, ByteReservation};
mod residency;
mod rows;
use crate::identity::IdentityState;
use crate::reception::{
    ObservationFrame, ObservedBodyDetails, ObservedBodyPose, ObservedLocation,
    ReceivedObservationHeader, SensoryFacet,
};
use crate::values::{deserialize_present_option, deserialize_safe_integer, is_safe_record_id};
pub(crate) use residency::PreparedValueResidency;
pub(crate) use rows::decode_received_value_row;

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

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReceivedValueRecord {
    pub id: String,
    pub at: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub sequence: u64,
    pub value: ReceivedValueFragment,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub bytes: u64,
    #[serde(skip)]
    storage: Option<crate::host::ResidentReservation>,
}
impl PartialEq for ReceivedValueRecord {
    fn eq(&self, other: &Self) -> bool {
        self.id == other.id
            && self.at == other.at
            && self.sequence == other.sequence
            && self.value == other.value
            && self.bytes == other.bytes
    }
}
impl ReceivedValueRecord {
    pub(crate) fn capture_pin(
        &self,
        budget: &ByteBudget,
    ) -> Result<Arc<crate::host::SharedMemoryPin>, ReceivedError> {
        self.storage
            .as_ref()
            .ok_or(ReceivedError("Received value has no canonical custody."))?
            .capture_pin(budget)
            .map_err(|_| ReceivedError("Received capture exceeds native allowance."))
    }
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
    SourceLoaded(String),
    PhaseReplace {
        at: Option<f64>,
        values: BTreeMap<ValueEncoding, String>,
    },
    PhaseInsert {
        key: ValueEncoding,
        previous: Option<String>,
    },
}

pub struct ReceivedValues {
    sources: IndexMap<String, SharedReceivedValue>,
    phase_at: Option<f64>,
    phase_values: BTreeMap<ValueEncoding, String>,
    undo: Vec<ReceivedValuesUndo>,
    activity_limits: Arc<ActivityDisplayLimits>,
    budget: ByteBudget,
    backing: crate::host::ResidentReservation,
    undo_storage: ByteReservation,
}
impl std::fmt::Debug for ReceivedValues {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("ReceivedValues")
            .field("sources", &self.sources)
            .field("phase_at", &self.phase_at)
            .finish_non_exhaustive()
    }
}
#[derive(Clone, Debug)]
struct SharedReceivedValue {
    // Encoding and its own allowance travel together, including phase keys.
    encoding: ValueEncoding,
    record: Arc<ReceivedValueRecord>,
}
#[derive(Clone, Debug)]
struct ValueEncoding(Arc<EncodingStorage>);
#[derive(Debug)]
struct EncodingStorage {
    text: Arc<str>,
    _storage: crate::host::ResidentReservation,
}
impl std::borrow::Borrow<str> for ValueEncoding {
    fn borrow(&self) -> &str {
        &self.0.text
    }
}
impl AsRef<str> for ValueEncoding {
    fn as_ref(&self) -> &str {
        &self.0.text
    }
}
impl std::ops::Deref for ValueEncoding {
    type Target = str;
    fn deref(&self) -> &str {
        &self.0.text
    }
}
impl PartialEq for ValueEncoding {
    fn eq(&self, other: &Self) -> bool {
        self.0.text == other.0.text
    }
}
impl Eq for ValueEncoding {}
impl PartialOrd for ValueEncoding {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}
impl Ord for ValueEncoding {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        self.0.text.cmp(&other.0.text)
    }
}
impl ValueEncoding {
    fn install(
        encoded: String,
        mut storage: ByteReservation,
        id_capacity: usize,
        budget: &ByteBudget,
    ) -> Result<Self, ReceivedError> {
        // Arc conversion briefly owns both UTF-8 allocations. Its allowance
        // follows the resulting encoding through source and old phase maps.
        let retained = residency::encoding_bytes(encoded.len(), id_capacity)
            .ok_or(ReceivedError("Received encoding exceeds native allowance."))?;
        storage
            .resize(
                retained
                    .checked_add(encoded.capacity())
                    .ok_or(ReceivedError("Received encoding exceeds native allowance."))?,
            )
            .map_err(|_| ReceivedError("Received encoding exceeds native allowance."))?;
        let text: Arc<str> = Arc::from(encoded);
        storage
            .resize(retained)
            .map_err(|_| ReceivedError("Received encoding exceeds native allowance."))?;
        Ok(Self(Arc::new(EncodingStorage {
            text,
            _storage: budget
                .adopt_record(storage)
                .map_err(|_| ReceivedError("Received encoding exceeds native allowance."))?,
        })))
    }
}

enum RetentionPlan {
    Resolved(RetainedValue),
    Shared {
        value: ReceivedValueFragment,
        encoded: String,
        encoded_storage: ByteReservation,
    },
}

fn retention_plan(
    values: Option<&ReceivedValues>,
    value: ReceivedValueFragment,
    preferred: Option<&ReceivedValueReference>,
    at: f64,
    limits: &ActivityDisplayLimits,
    budget: &ByteBudget,
) -> Result<RetentionPlan, ReceivedError> {
    value.validate(at, limits)?;
    let encoded_len =
        json_record_len(&value).map_err(|_| ReceivedError("Received value encoding failed."))?;
    let encoded_storage = budget
        .reserve(
            residency::encoding_scratch(encoded_len)
                .ok_or(ReceivedError("Received value exceeds native allowance."))?,
        )
        .map_err(|_| ReceivedError("Received value exceeds native allowance."))?;
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
    Ok(RetentionPlan::Shared {
        value,
        encoded,
        encoded_storage,
    })
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
    budget: &ByteBudget,
) -> Result<RetainedValue, ReceivedError> {
    if let Some(values) = values {
        return values.retain(value, preferred, at, sequence, identity);
    }
    match retention_plan(None, value, preferred, at, limits, budget)? {
        RetentionPlan::Resolved(retained) => Ok(retained),
        RetentionPlan::Shared {
            value,
            encoded,
            encoded_storage,
        } => {
            let mut owner = ReceivedValues {
                sources: IndexMap::new(),
                phase_at: None,
                phase_values: BTreeMap::new(),
                undo: Vec::new(),
                activity_limits: Arc::clone(limits),
                budget: budget.clone(),
                backing: budget
                    .reserve_backing(0)
                    .map_err(|_| ReceivedError("Received values exceed native allowance."))?,
                undo_storage: budget
                    .reserve(0)
                    .map_err(|_| ReceivedError("Received values exceed native allowance."))?,
            };
            let retained =
                owner.retain_shared(value, encoded, encoded_storage, at, sequence, identity)?;
            *values = Some(owner);
            Ok(retained)
        }
    }
}

impl ReceivedValues {
    fn prepare_backing(
        &mut self,
        additional_sources: usize,
        additional_undo: usize,
    ) -> Result<(), ReceivedError> {
        let capacity = || ReceivedError("Received-value backing exceeds native allowance.");
        let sources = self
            .sources
            .len()
            .checked_add(additional_sources)
            .ok_or_else(capacity)?;
        let source_capacity = if sources > self.sources.capacity() {
            self.sources
                .capacity()
                .checked_mul(2)
                .and_then(|n| n.checked_add(sources))
                .ok_or_else(capacity)?
        } else {
            self.sources.capacity()
        };
        let undo_capacity = self
            .undo
            .len()
            .checked_add(additional_undo)
            .ok_or_else(capacity)?
            .max(self.undo.capacity());
        let bytes = residency::backing(source_capacity, 0).ok_or_else(capacity)?;
        if bytes > self.backing.bytes() {
            self.budget
                .resize_backing(&mut self.backing, bytes)
                .map_err(|_| capacity())?;
        }
        self.undo_storage
            .resize(
                undo_capacity
                    .checked_mul(std::mem::size_of::<ReceivedValuesUndo>())
                    .ok_or_else(capacity)?,
            )
            .map_err(|_| capacity())?;
        self.sources
            .try_reserve(additional_sources)
            .map_err(|_| capacity())?;
        self.undo
            .try_reserve_exact(additional_undo)
            .map_err(|_| capacity())?;
        Ok(())
    }
    /// Source's sharing index belongs to a particular working world object as
    /// well as its simulation time. A command's isolated draft cannot reuse an
    /// earlier caller's index merely because both ran at the same instant.
    pub(crate) fn new_preparation_scope_bound(&self) -> Option<usize> {
        if self.phase_at.is_none() && self.phase_values.is_empty() {
            return Some(0);
        }
        let slots = if self.undo.len() < self.undo.capacity() {
            1
        } else {
            self.undo.capacity().checked_add(1)?.checked_mul(2)?
        };
        slots.checked_mul(std::mem::size_of::<ReceivedValuesUndo>())
    }
    pub(crate) fn begin_preparation_scope(&mut self) -> Result<(), ReceivedError> {
        if self.phase_at.is_none() && self.phase_values.is_empty() {
            return Ok(());
        }
        self.prepare_backing(0, 1)?;
        self.undo.push(ReceivedValuesUndo::PhaseReplace {
            at: self.phase_at.take(),
            values: std::mem::take(&mut self.phase_values),
        });
        Ok(())
    }
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
        budget: &ByteBudget,
    ) -> Result<Self, ReceivedError> {
        let mut sources = IndexMap::new();
        let mut backing = budget
            .reserve_backing(
                residency::backing(
                    records
                        .len()
                        .checked_mul(2)
                        .and_then(|n| n.checked_add(1))
                        .ok_or(ReceivedError("Received values exceed native allowance."))?,
                    0,
                )
                .ok_or(ReceivedError("Received values exceed native allowance."))?,
            )
            .map_err(|_| ReceivedError("Received values exceed native allowance."))?;
        sources
            .try_reserve(records.len())
            .map_err(|_| ReceivedError("Received values exceed native allowance."))?;
        for record in records {
            if sources.contains_key(&record.id) {
                return Err(ReceivedError(
                    "Invalid or duplicate received value identity.",
                ));
            }
            let owned = restore_record(record, through, sequence, &activity_limits, budget)?;
            sources.insert(owned.record.id.clone(), owned);
        }
        backing
            .resize(
                residency::backing(sources.capacity(), 0)
                    .ok_or(ReceivedError("Received values exceed native allowance."))?,
            )
            .map_err(|_| ReceivedError("Received values exceed native allowance."))?;
        Ok(Self {
            sources,
            phase_at: None,
            phase_values: BTreeMap::new(),
            undo: Vec::new(),
            activity_limits,
            budget: budget.clone(),
            backing,
            undo_storage: budget
                .reserve(0)
                .map_err(|_| ReceivedError("Received values exceed native allowance."))?,
        })
    }

    pub(crate) fn load_rows(
        &mut self,
        rows: Vec<crate::records::InstalledRow>,
        through: f64,
        sequence: u64,
    ) -> Result<(), ReceivedError> {
        for row in rows {
            let record = decode_received_value_row(&row)?;
            if let Some(known) = self.sources.get(&record.id) {
                if known.record.as_ref() != &record {
                    return Err(ReceivedError(
                        "Received-value identity has a different current body.",
                    ));
                }
                continue;
            }
            let value = restore_record(
                record,
                through,
                sequence,
                &self.activity_limits,
                &self.budget,
            )?;
            self.prepare_backing(1, 1)?;
            let id = value.record.id.clone();
            self.undo.push(ReceivedValuesUndo::SourceLoaded(id.clone()));
            self.sources.insert(id, value);
        }
        Ok(())
    }
    /// Residency/protection metadata only. An ID is not an observer receipt.
    pub(crate) fn resident_ids(&self) -> impl ExactSizeIterator<Item = &str> {
        self.sources.keys().map(String::as_str)
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
        match retention_plan(
            Some(self),
            value,
            preferred,
            at,
            &self.activity_limits,
            &self.budget,
        )? {
            RetentionPlan::Resolved(retained) => Ok(retained),
            RetentionPlan::Shared {
                value,
                encoded,
                encoded_storage,
            } => self.retain_shared(value, encoded, encoded_storage, at, sequence, identity),
        }
    }

    fn retain_shared(
        &mut self,
        value: ReceivedValueFragment,
        encoded: String,
        encoded_storage: ByteReservation,
        at: f64,
        sequence: u64,
        identity: &mut IdentityState,
    ) -> Result<RetainedValue, ReceivedError> {
        let value_bytes = encoded.len() as u64;
        if self.phase_at != Some(at) {
            self.prepare_backing(0, 1)?;
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
        self.prepare_backing(1, 2)?;
        // The pinned formatter's growable ASCII ID needs at most twice its
        // complete prefix+safe-integer length. Final custody uses its capacity.
        let id_capacity =
            ("received-value-".len() + crate::identity::MAX_SAFE_INTEGER.ilog10() as usize + 1) * 2;
        let body = residency::body_parts_bytes(
            id_capacity,
            value
                .heap_bytes()
                .ok_or(ReceivedError("Received value exceeds native allowance."))?,
        )
        .ok_or(ReceivedError("Received value exceeds native allowance."))?;
        let mut body_storage = self
            .budget
            .reserve(body)
            .map_err(|_| ReceivedError("Received value exceeds native allowance."))?;
        let issued = identity
            .allocate("received-value")
            .map_err(|_| ReceivedError("Received value identity is exhausted."))?;
        let mut record = ReceivedValueRecord {
            id: issued.id,
            at,
            sequence,
            value,
            bytes: 0,
            storage: None,
        };
        for _ in 0..4 {
            let _encoding = self
                .budget
                .reserve(
                    residency::encoding_scratch(
                        json_record_len(&record)
                            .map_err(|_| ReceivedError("Received value encoding failed."))?,
                    )
                    .ok_or(ReceivedError("Received value exceeds native allowance."))?,
                )
                .map_err(|_| ReceivedError("Received value exceeds native allowance."))?;
            let bytes = json_record(&record)
                .map_err(|_| ReceivedError("Received value encoding failed."))?
                .len() as u64;
            if bytes == record.bytes {
                break;
            }
            record.bytes = bytes;
        }
        body_storage
            .resize(
                residency::record_bytes(&record)
                    .ok_or(ReceivedError("Received value exceeds native allowance."))?,
            )
            .map_err(|_| ReceivedError("Received value exceeds native allowance."))?;
        record.storage = Some(
            self.budget
                .adopt_record(body_storage)
                .map_err(|_| ReceivedError("Received value exceeds native allowance."))?,
        );
        let key =
            ValueEncoding::install(encoded, encoded_storage, record.id.capacity(), &self.budget)?;
        let id = record.id.clone();
        let added_bytes = record.bytes;
        self.undo.push(ReceivedValuesUndo::SourceInsert(id.clone()));
        self.sources.insert(
            id.clone(),
            SharedReceivedValue {
                record: Arc::new(record),
                encoding: key.clone(),
            },
        );
        let previous = self.phase_values.insert(key.clone(), id.clone());
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
                ReceivedValuesUndo::SourceInsert(id) | ReceivedValuesUndo::SourceLoaded(id) => {
                    let removed = self
                        .sources
                        .shift_remove(&id)
                        .ok_or(ReceivedError("Received-value rollback source is absent."))?;
                    drop(id);
                    drop(removed);
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
        // Reuse its actual funded backing; clearing releases old phase maps
        // and their shared source guards, while capacity stays honestly owned.
        self.undo.clear();
    }
}

fn restore_record(
    mut record: ReceivedValueRecord,
    through: f64,
    sequence: u64,
    activity_limits: &ActivityDisplayLimits,
    budget: &ByteBudget,
) -> Result<SharedReceivedValue, ReceivedError> {
    record.value.validate(through, &activity_limits)?;
    if !is_safe_record_id(&record.id)
        || !record.at.is_finite()
        || record.at < 0.0
        || record.at > through
        || record.sequence > sequence
    {
        return Err(ReceivedError(
            "Invalid or duplicate received value identity.",
        ));
    }
    let _record_encoding = budget
        .reserve(
            residency::encoding_scratch(
                json_record_len(&record)
                    .map_err(|_| ReceivedError("Received value encoding failed."))?,
            )
            .ok_or(ReceivedError("Received encoding exceeds native allowance."))?,
        )
        .map_err(|_| ReceivedError("Received encoding exceeds native allowance."))?;
    let encoded =
        json_record(&record).map_err(|_| ReceivedError("Received value encoding failed."))?;
    if encoded.len() as u64 != record.bytes {
        return Err(ReceivedError(
            "Received value bytes disagree with its current body.",
        ));
    }
    let encoded_len = json_record_len(&record.value)
        .map_err(|_| ReceivedError("Received value encoding failed."))?;
    let storage = budget
        .reserve_record(
            residency::record_bytes(&record)
                .ok_or(ReceivedError("Received values exceed native allowance."))?,
        )
        .map_err(|_| ReceivedError("Received values exceed native allowance."))?;
    let encoded_storage = budget
        .reserve(
            residency::encoding_scratch(encoded_len)
                .ok_or(ReceivedError("Received encoding exceeds native allowance."))?,
        )
        .map_err(|_| ReceivedError("Received encoding exceeds native allowance."))?;
    let encoding = ValueEncoding::install(
        json_record(&record.value).map_err(|_| ReceivedError("Received value encoding failed."))?,
        encoded_storage,
        record.id.capacity(),
        budget,
    )?;
    record.storage = Some(storage);
    Ok(SharedReceivedValue {
        encoding,
        record: Arc::new(record),
    })
}
