//! Canonical receiver-owned roots, kept separate from physical state. Absence
//! remains distinct from a present empty SQL owner; installation supplies each
//! root explicitly and cannot replace unconverted knowledge with empty maps.

use super::*;
use crate::attention::AttentionState;
use crate::received::{ReceivedValueReference, ReceivedValues, TemporalCurrentGroupCheckpoint};
use crate::values::{
    deserialize_nullable_safe_integer, deserialize_present_option, deserialize_safe_integer,
};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct VisualConfirmation {
    pub channel: DefinitionPin,
    pub through: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub complete: Option<CurrentSightStamp>,
    pub frame_ref: ReceivedValueReference,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub frame_revision: u64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct MotionOriginal {
    pub id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub ordinal: u64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct MotionConfirmation {
    pub id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EarlierMotion {
    pub value: ReceivedFacetValue,
    pub times: [f64; 5],
    pub original: MotionOriginal,
    pub confirmation: MotionConfirmation,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub aliases: Option<Vec<String>>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CurrentMotionSample {
    pub earlier: EarlierMotion,
    pub through: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub continuity_revision: u64,
    pub expires_at: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReceptionGap {
    pub episode_id: String,
    pub lost_at: f64,
    pub through: f64,
    #[serde(deserialize_with = "deserialize_nullable_safe_integer")]
    pub physical_life: Option<u64>,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PerceptionEvidenceOwner {
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub visual_confirmation: Option<VisualConfirmation>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none",
        serialize_with = "crate::encoding::serialize_optional_js_map"
    )]
    pub motion_samples: Option<IndexMap<String, CurrentMotionSample>>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub motion_expires_at: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub geometry: Option<ReceivedGeometryState>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub attention: Option<AttentionState>,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub life: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub received_at_sequence: u64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub observer: Option<ObserverLife>,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub next_contact: u64,
    pub received: Vec<Arc<ReceivedObservation>>,
    #[serde(
        deserialize_with = "crate::values::deserialize_safe_integer_map",
        serialize_with = "crate::encoding::serialize_js_map"
    )]
    pub receipts: IndexMap<String, u64>,
    // Kept in JavaScript exact-key order, matching the Source balanced tree.
    // SQL's unordered row positions do not establish this runtime iteration.
    #[serde(serialize_with = "crate::encoding::serialize_js_map")]
    pub current: IndexMap<String, CurrentContact>,
    #[serde(serialize_with = "crate::encoding::serialize_js_map")]
    pub gaps: IndexMap<String, ReceptionGap>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub support: Option<DetectionSupportState>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum KnowledgeSubject {
    Entity { entity_id: String },
    Individual { individual_id: String },
    Place { place_id: String },
    MapMarker { marker_id: String },
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum KnowledgeOrigin {
    AuthoredStarting,
    ActorEdit,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct KnowledgeDocument {
    pub origin: KnowledgeOrigin,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub subject_id: Option<KnowledgeSubject>,
    pub text: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
    pub evidence_ids: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct MapMarker {
    pub id: String,
    pub x: f64,
    pub z: f64,
    pub label: String,
    pub icon: String,
}

/// Assembly of actual current-format receiver roots. This aggregate is never a
/// public capture or a generic mutable bridge input; the installer supplies its
/// validated typed owners and the current cold-coverage metadata separately.
pub struct ReceptionState {
    /// Derived cold/warm exposure preparation. Current records and evidence
    /// remain authoritative; a cold installation always rebuilds preparation.
    pub(crate) exposure_prepared: bool,
    pub(crate) exposure_objects: Option<std::sync::Arc<super::exposure::ExposureObjects>>,
    pub sensory: Option<SensoryContinuation>,
    pub perception_evidence: Option<IndexMap<String, PerceptionEvidenceOwner>>,
    pub received_values: Option<ReceivedValues>,
    pub observer_identities:
        Option<IndexMap<String, IndexMap<String, crate::worlds::InstalledObserverIdentity>>>,
    pub perception_episodes: Option<IndexMap<String, IndexMap<String, String>>>,
    pub actor_knowledge: Option<IndexMap<String, IndexMap<String, KnowledgeDocument>>>,
    pub knowledge_revisions: Option<IndexMap<String, u64>>,
    pub visible_objects: Option<IndexMap<String, Vec<String>>>,
    pub visible_people: Option<IndexMap<String, Vec<String>>>,
    pub visible_places: Option<IndexMap<String, IndexMap<String, u64>>>,
    pub map_markers: Option<IndexMap<String, IndexMap<String, MapMarker>>>,
}

impl ReceptionState {
    /// Existing unfinished current-body and terrain recordings share the same
    /// temporal terminal reservation owner. Borrow them without a shadow list.
    pub(crate) fn recordings(
        &self,
        actor_id: &str,
    ) -> impl Iterator<Item = &TemporalCurrentGroupCheckpoint> {
        let owner = self
            .perception_evidence
            .as_ref()
            .and_then(|owners| owners.get(actor_id));
        owner
            .into_iter()
            .flat_map(|owner| owner.current.values())
            .flat_map(|contact| contact.content.groups.iter())
            .flat_map(|group| group.recordings.iter().flatten())
            .chain(
                owner
                    .into_iter()
                    .flat_map(|owner| owner.geometry.iter())
                    .flat_map(|geometry| geometry.fragments.iter())
                    .filter_map(|fragment| fragment.recording.as_ref()),
            )
            .chain(
                owner
                    .into_iter()
                    .flat_map(|owner| owner.geometry.iter())
                    .flat_map(|geometry| geometry.boundaries.iter())
                    .filter_map(|boundary| boundary.recording.as_ref()),
            )
    }
}
