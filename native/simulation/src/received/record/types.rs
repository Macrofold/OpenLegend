//! Canonical compact received changes and selected public proof expansion.
//! Source/frame tables save repeated metadata; their indices grant no knowledge.
//! The owner and original member ordinals survive packing and selection.

use serde::{Deserialize, Serialize};

use crate::reception::{
    EvidenceFamily, EvidenceSource, ObservationFactKey, ObservationFrame, ObservationOrigin,
    ObservedBodyPose, ObserverLife, ObserverSubject, ReceivedFacetProof, SourceRevision,
};
use crate::values::{
    deserialize_present_option, deserialize_present_safe_integer, deserialize_safe_integer,
};

use crate::received::{ReceivedValueReference, TemporalReceiptLocator};
use crate::reception::CurrentReceivedPart;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ReceivedRole {
    Direct,
    Inference,
    Testimony,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReceivedFieldClock {
    pub role: ReceivedRole,
    pub as_of: f64,
    pub measured_from: f64,
    pub measured_through: f64,
    pub acquired_at: f64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub confirmed_through: Option<f64>,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReceivedClockDifference {
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub role: Option<ReceivedRole>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub as_of: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub measured_from: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub measured_through: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub acquired_at: Option<f64>,
    /// Explicit null removes a block default; omission inherits it.
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub confirmed_through: Option<Option<f64>>,
}

impl ReceivedClockDifference {
    pub(super) fn between(value: &ReceivedFieldClock, base: &ReceivedFieldClock) -> Option<Self> {
        let difference = Self {
            role: (value.role != base.role).then_some(value.role),
            as_of: (value.as_of != base.as_of).then_some(value.as_of),
            measured_from: (value.measured_from != base.measured_from)
                .then_some(value.measured_from),
            measured_through: (value.measured_through != base.measured_through)
                .then_some(value.measured_through),
            acquired_at: (value.acquired_at != base.acquired_at).then_some(value.acquired_at),
            confirmed_through: (value.confirmed_through != base.confirmed_through)
                .then_some(value.confirmed_through),
        };
        (difference != Self::default()).then_some(difference)
    }

    pub(super) fn apply(&self, base: &ReceivedFieldClock) -> ReceivedFieldClock {
        ReceivedFieldClock {
            role: self.role.unwrap_or(base.role),
            as_of: self.as_of.unwrap_or(base.as_of),
            measured_from: self.measured_from.unwrap_or(base.measured_from),
            measured_through: self.measured_through.unwrap_or(base.measured_through),
            acquired_at: self.acquired_at.unwrap_or(base.acquired_at),
            confirmed_through: self.confirmed_through.unwrap_or(base.confirmed_through),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase"
)]
pub enum TemporalReception {
    Body {
        #[serde(flatten)]
        pose: BodyReception,
    },
    Location {
        frame: ObservationFrame,
    },
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(untagged, deny_unknown_fields)]
pub enum BodyReception {
    Pose {
        pose: ObservedBodyPose,
    },
    Reference {
        #[serde(rename = "poseRef")]
        pose_ref: ReceivedValueReference,
    },
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TemporalDetailSupport {
    pub proof: ReceivedFacetProof,
    pub role: ReceivedRole,
    pub from: f64,
    pub through: f64,
    pub acquired_at: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TemporalFacetReference {
    #[serde(flatten)]
    pub clock: ReceivedFieldClock,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub member_index: u64,
    pub value_ref: ReceivedValueReference,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub track: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub original: Option<ObservationFactKey>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub received_from: Option<EvidenceSource>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub support: Option<ReceivedFacetProof>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub detail_support: Option<TemporalDetailSupport>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub pose_frame: Option<ObservationFrame>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub reception: Option<TemporalReception>,
}

impl TemporalFacetReference {
    pub fn value_references(&self) -> impl Iterator<Item = &str> {
        let primary = match &self.value_ref {
            ReceivedValueReference::Shared(id) => Some(id.as_str()),
            _ => None,
        };
        let pose = match &self.reception {
            Some(TemporalReception::Body {
                pose:
                    BodyReception::Reference {
                        pose_ref: ReceivedValueReference::Shared(id),
                    },
            }) => Some(id.as_str()),
            _ => None,
        };
        primary.into_iter().chain(pose)
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum TemporalChange {
    Baseline,
    Change,
    Loss,
    Unchecked,
    Occurrence,
    AttentionExit,
    RecordingGap,
    ReceiverFrame,
    RetainedState,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum AvailabilityReason {
    Unavailable,
    Unchecked,
    Released,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TemporalAvailability {
    pub reason: AvailabilityReason,
    pub at: f64,
    pub fields: Vec<u64>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CoverageGap {
    pub from: f64,
    pub through: f64,
}

/// Fields inherited unchanged from the original public receipt. Ordering matches
/// appendTemporalReceipt followed by the existing compactReceivedReceipt codec.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReceivedReceiptHeader {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub acquisition: u64,
    pub subject: String,
    pub change: TemporalChange,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub spatial_context: Option<bool>,
    pub source_ids: Vec<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub subject_identity: Option<ObserverSubject>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub context_subjects: Option<Vec<String>>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub availability: Option<Vec<TemporalAvailability>>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub availability_at: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub coverage_gap: Option<CoverageGap>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub ended_fields: Option<Vec<(String, CurrentReceivedPart)>>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TemporalReceipt {
    #[serde(flatten)]
    pub header: ReceivedReceiptHeader,
    #[serde(flatten)]
    pub locator: TemporalReceiptLocator,
    pub id: String,
    pub at: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub order: u64,
    pub required: bool,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub receiver_frame: Option<ObservationFrame>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub origin: Option<ObservationOrigin>,
    pub facets: Vec<TemporalFacetReference>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReceivedSource {
    pub family: EvidenceFamily,
    pub id: String,
    pub revision: SourceRevision,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub observer: Option<ObserverLife>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct ReceivedFact(
    #[serde(deserialize_with = "deserialize_safe_integer")] pub u64,
    #[serde(deserialize_with = "deserialize_safe_integer")] pub u64,
);

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ReceivedProof {
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub original: Option<ReceivedFact>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    pub confirmation: Option<u64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub from: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub through: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub aliases: Option<Vec<String>>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReceivedDetail {
    pub proof: ReceivedProof,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub role: Option<ReceivedRole>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub from: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub through: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub acquired_at: Option<f64>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase"
)]
pub enum ReceivedReception {
    Body {
        #[serde(flatten)]
        pose: BodyReception,
    },
    Location {
        #[serde(deserialize_with = "deserialize_safe_integer")]
        frame: u64,
    },
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReceivedField {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub member_index: u64,
    pub value_ref: ReceivedValueReference,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub track: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub clock: Option<ReceivedClockDifference>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub original: Option<ReceivedFact>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    pub received_from: Option<u64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub support: Option<ReceivedProof>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub detail: Option<ReceivedDetail>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    pub pose_frame: Option<u64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub reception: Option<ReceivedReception>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum ReceivedOrigin {
    Occurrence {
        event_id: String,
        at: f64,
        #[serde(deserialize_with = "deserialize_safe_integer")]
        order: u64,
    },
    Exposure {
        episode_id: String,
        detector_id: String,
        measured_from: f64,
        measured_through: f64,
        #[serde(
            default,
            deserialize_with = "deserialize_present_safe_integer",
            skip_serializing_if = "Option::is_none"
        )]
        source: Option<u64>,
    },
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReceivedReceipt {
    #[serde(flatten)]
    pub header: ReceivedReceiptHeader,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub clock: Option<ReceivedFieldClock>,
    pub sources: Vec<ReceivedSource>,
    pub frames: Vec<ObservationFrame>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    pub frame: Option<u64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub origin: Option<ReceivedOrigin>,
    pub facets: Vec<ReceivedField>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ReceivedEntryKind {
    Baseline,
    Sample,
    Boundary,
    Occurrence,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ReceivedCharge {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub bytes: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub count: u64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReceivedEntry {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub entry_index: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub order: u64,
    pub received_at: f64,
    pub kind: ReceivedEntryKind,
    pub required: bool,
    pub charge: ReceivedCharge,
    pub receipt: ReceivedReceipt,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReceivedBatch {
    pub actor_id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub physical_life: u64,
    pub epoch: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub batch_order: u64,
    pub entries: Vec<ReceivedEntry>,
}

impl ReceivedBatch {
    pub fn observer(&self) -> ObserverLife {
        ObserverLife {
            actor_id: self.actor_id.clone(),
            physical_life: self.physical_life,
        }
    }

    pub fn locator(&self, entry_index: u64) -> TemporalReceiptLocator {
        TemporalReceiptLocator {
            actor_id: self.actor_id.clone(),
            physical_life: self.physical_life,
            epoch: self.epoch.clone(),
            batch_order: self.batch_order,
            entry_index,
        }
    }
}
