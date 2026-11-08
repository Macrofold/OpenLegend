//! Compact currently received content, independent clocks and exact original
//! source bindings. Metadata checks do not rewrite stationary appearance.

use super::*;
use crate::received::{ReceivedValueReference, TemporalCurrentGroupCheckpoint};
use crate::values::{deserialize_present_option, deserialize_safe_integer};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum CurrentReceivedPart {
    Value,
    Detail,
    Pose,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum FacetRole {
    Direct,
    Testimony,
    Inference,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ObservationContext {
    pub subjects: Vec<ObservationExposure>,
    pub attended: bool,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ObservationFacet {
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub support: Option<ReceivedFacetProof>,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub ordinal: u64,
    pub role: FacetRole,
    pub as_of: f64,
    pub measured_from: f64,
    pub measured_through: f64,
    pub acquired_at: f64,
    pub value: SensoryFacet,
}

#[derive(Clone, Debug, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ObservationContribution {
    pub id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
    pub observer: ObserverLife,
    pub origin: ObservationOrigin,
    pub acquired_at: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub received_order: u64,
    pub modality: Modality,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub channel: Option<DefinitionPin>,
    pub detector: DetectorIdentity,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub context: Option<ObservationContext>,
    pub facets: Vec<ObservationFacet>,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum FacetReception {
    Body { pose_ref: ReceivedValueReference },
    Location { frame_ref: ReceivedValueReference },
}
impl<'de> Deserialize<'de> for FacetReception {
    fn deserialize<D: serde::Deserializer<'de>>(de: D) -> Result<Self, D::Error> {
        let raw = Box::<serde_json::value::RawValue>::deserialize(de)?;
        let parse = || -> Result<Self, String> {
            let mut fields = crate::encoding::RawFields::parse(raw.get())?;
            let kind: String = fields.take("kind")?;
            let result = match kind.as_str() {
                "body" => Self::Body {
                    pose_ref: fields.take("poseRef")?,
                },
                "location" => Self::Location {
                    frame_ref: fields.take("frameRef")?,
                },
                _ => return Err("Unknown current facet reception kind.".into()),
            };
            fields.finish()?;
            Ok(result)
        };
        parse().map_err(serde::de::Error::custom)
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReceivedFacetValue {
    pub kind: String,
    pub reference: ReceivedValueReference,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub reception: Option<FacetReception>,
}

impl ReceivedFacetValue {
    pub fn validate_kind(&self) -> bool {
        matches!(
            self.kind.as_str(),
            "surface-patch"
                | "physical-boundary"
                | "detected"
                | "location"
                | "body"
                | "description"
                | "carried"
                | "pile-contents"
                | "public-attributes"
                | "contact"
                | "speech"
                | "perceived-feature"
                | "sound"
                | "encounter-exposure"
                | "event"
                | "association"
                | "claim"
        ) && match &self.reception {
            Some(FacetReception::Body { .. }) => self.kind == "body",
            Some(FacetReception::Location { .. }) => self.kind == "location",
            None => true,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReceivedObservationFacet {
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub support: Option<ReceivedFacetProof>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    pub ordinal: Option<u64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub role: Option<FacetRole>,
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
    pub value: ReceivedFacetValue,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReceivedObservation {
    pub id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
    pub origin: ObservationOrigin,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub channel: Option<DefinitionPin>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub context: Option<ObservationContext>,
    pub header_ref: ReceivedValueReference,
    pub facets: Vec<ReceivedObservationFacet>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CurrentFacetGrant {
    pub subject_id: String,
    #[serde(deserialize_with = "crate::values::deserialize_nullable_safe_integer")]
    pub subject_physical_life: Option<u64>,
    pub original: String,
    pub exposure: String,
    pub modality: Modality,
    pub channel: DefinitionPin,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum CurrentAvailabilityState {
    Unchecked,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CurrentAvailability {
    pub state: CurrentAvailabilityState,
    pub at: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CurrentDescriptionSupport {
    pub original: ObservationFactKey,
    pub confirmation: EvidenceSource,
    pub confirmed_from: f64,
    pub confirmed_through: f64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub aliases: Option<Vec<String>>,
    pub role: FacetRole,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub availability: Option<CurrentAvailability>,
    pub description_measured_from: f64,
    pub description_measured_through: f64,
    pub description_acquired_at: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CurrentBodyPoseSupport {
    pub original: ObservationFactKey,
    pub confirmation: EvidenceSource,
    pub confirmed_from: f64,
    pub confirmed_through: f64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub aliases: Option<Vec<String>>,
    pub role: FacetRole,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub availability: Option<CurrentAvailability>,
    pub frame: ObservationFrame,
    pub pose_measured_from: f64,
    pub pose_measured_through: f64,
    pub pose_acquired_at: f64,
}

/// Immutable evidence-consumer value selected from a personal current grant.
/// Routing identity and physical continuity counters are intentionally absent;
/// they cannot become a participant identity or a permitted trajectory.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CapturedCurrentFacet {
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub availability: Option<CurrentAvailability>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub pose_support: Option<CurrentBodyPoseSupport>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub description_support: Option<CurrentDescriptionSupport>,
    pub id: String,
    pub observer: ObserverLife,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub body_lease_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub local_subject: Option<ObserverSubject>,
    pub exposure: ObservationExposure,
    pub original: ObservationFactKey,
    pub role: FacetRole,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub original_aliases: Option<Vec<String>>,
    pub modality: Modality,
    pub value: SensoryFacet,
    pub confirmation: EvidenceSource,
    pub value_measured_from: f64,
    pub value_measured_through: f64,
    pub value_acquired_at: f64,
    pub confirmed_from: f64,
    pub confirmed_through: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CurrentStoredField {
    pub id: String,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub body_lease_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub local_subject: Option<ObserverSubject>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    pub motion_continuity_revision: Option<u64>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    pub source_placement_revision: Option<u64>,
    pub value: ReceivedFacetValue,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub original_ordinal: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub semantic_revision: u64,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum CurrentCheck {
    Broad,
    Detail,
    None,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CurrentPartPartition {
    pub members: Vec<(String, CurrentReceivedPart)>,
    pub times: CurrentGroupTimes,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
    pub check: CurrentCheck,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub availability: Option<CurrentAvailability>,
    pub received_at: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub received_order: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub confirmed_revision: u64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub frame_ref: Option<ReceivedValueReference>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CurrentReceivedContent {
    pub grant: CurrentFacetGrant,
    #[serde(serialize_with = "crate::encoding::serialize_js_map")]
    pub fields: IndexMap<String, CurrentStoredField>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CurrentReceivedGroup {
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub recordings: Option<Vec<TemporalCurrentGroupCheckpoint>>,
    pub received: Arc<CurrentReceivedContent>,
    pub metadata: Vec<CurrentPartPartition>,
    // Source recording proposals identify the fields object, not its bytes. A
    // mutable receiving prefix keeps that identity across payload COW writes;
    // its actual immutable snapshot ends that lifetime. Neither token is saved.
    #[serde(skip)]
    pub(super) field_identity: Arc<()>,
    #[serde(skip)]
    pub(super) content_batch: Option<Arc<()>>,
    /// Source metadataGroup mutates an already prepared group in place within
    /// its actual contact prefix. Later sibling checks see that body's writes.
    #[serde(skip)]
    pub(super) metadata_batch: Option<Arc<()>>,
}
impl CurrentReceivedGroup {
    pub(super) fn installed(
        received: Arc<CurrentReceivedContent>,
        metadata: Vec<CurrentPartPartition>,
        recordings: Option<Vec<TemporalCurrentGroupCheckpoint>>,
    ) -> Self {
        Self {
            received,
            metadata,
            recordings,
            field_identity: Arc::new(()),
            content_batch: None,
            metadata_batch: None,
        }
    }
}
impl PartialEq for CurrentReceivedGroup {
    fn eq(&self, other: &Self) -> bool {
        self.received == other.received
            && self.metadata == other.metadata
            && self.recordings == other.recordings
    }
}
impl<'de> Deserialize<'de> for CurrentReceivedGroup {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        #[derive(Deserialize)]
        #[serde(rename_all = "camelCase", deny_unknown_fields)]
        struct Stored {
            received: Arc<CurrentReceivedContent>,
            metadata: Vec<CurrentPartPartition>,
            #[serde(default, deserialize_with = "deserialize_present_option")]
            recordings: Option<Vec<TemporalCurrentGroupCheckpoint>>,
        }
        let stored = Stored::deserialize(deserializer)?;
        Ok(Self::installed(
            stored.received,
            stored.metadata,
            stored.recordings,
        ))
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CurrentSightStamp {
    pub through: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub input_revision: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub received_order: u64,
    pub frame_ref: ReceivedValueReference,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CurrentSightCheck {
    pub through: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub input_revision: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub received_order: u64,
    pub frame_ref: ReceivedValueReference,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub detail: Option<CurrentSightStamp>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CurrentContactContent {
    pub field_order: Vec<String>,
    #[serde(serialize_with = "crate::encoding::serialize_js_map")]
    pub originals: IndexMap<String, Arc<ReceivedObservation>>,
    pub groups: Vec<CurrentReceivedGroup>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CurrentContact {
    #[serde(skip)]
    pub(crate) encoded_payload: Option<Arc<str>>,
    /// The Source measuredSources WeakMap is an ephemeral complete-input
    /// preparation, bound to this actual body original and lease. Cold restore
    /// must check again; this never supplies a fact, ID or saved revision.
    #[serde(skip)]
    pub(crate) visual_measurement: Option<VisualMeasurement>,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub order: u64,
    pub content: CurrentContactContent,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub sight: Option<CurrentSightCheck>,
}

#[derive(Clone, Debug)]
pub(crate) struct VisualMeasurement {
    pub original: usize,
    pub lease_id: String,
    pub token: String,
    pub detailed: bool,
}

impl PartialEq for CurrentContact {
    fn eq(&self, other: &Self) -> bool {
        self.order == other.order && self.content == other.content && self.sight == other.sight
    }
}
impl CurrentContact {
    /// The acquired-content writer calls this before changing order/content.
    /// Check clocks and recording continuations keep their original body bytes.
    pub(crate) fn invalidate_encoded_content(&mut self) {
        self.encoded_payload = None;
    }
}
