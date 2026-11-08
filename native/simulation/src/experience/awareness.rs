//! A newly acquired personal account before the existing admission owner places
//! it. Every field comes from original permitted acquisition, never a later
//! reconstruction from the canonical event or another receiver's knowledge.

use super::ExperienceRetention;
use crate::narration::NativeText;
use crate::received::TemporalReceiptLocator;
use crate::reception::{
    EncounterExposure, EventScalar, ExperienceModality, FeatureModality, ObservationContribution,
    ObserverSubject, PerceivedSound, PerceivedSpeech, ReceivedReference, TriggerKind,
};
use crate::values::{deserialize_nullable, deserialize_present_option, deserialize_safe_integer};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AwarenessRetentionClass {
    Memory,
    Sensory,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum OutwardChange {
    Onset,
    Detail,
    End,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AwarenessSourceBody {
    pub entity_id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub physical_life: u64,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub lease_id: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct FeatureFamily {
    pub id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub version: u64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct AwarenessReceivedFeatures {
    pub modality: FeatureModality,
    pub family: FeatureFamily,
    pub features: crate::worlds::InstalledRecognitionFeatures,
    pub quality: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Awareness {
    pub retention_class: AwarenessRetentionClass,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub exposure: Option<EncounterExposure>,
    pub event_id: String,
    pub actor_id: String,
    pub text: NativeText,
    pub at: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub sequence: u64,
    pub modality: ExperienceModality,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        serialize_with = "crate::encoding::serialize_optional_js_map",
        skip_serializing_if = "Option::is_none"
    )]
    pub entity_episodes: Option<IndexMap<String, String>>,
    pub recognized: bool,
    pub intelligible: bool,
    pub entity_ids: Vec<String>,
    pub importance: f64,
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
    pub event_type: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        serialize_with = "crate::encoding::serialize_optional_js_map",
        skip_serializing_if = "Option::is_none"
    )]
    pub event_data: Option<IndexMap<String, EventScalar>>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub references: Option<Vec<ReceivedReference>>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub source_id: Option<String>,
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
    pub trigger_kind: Option<TriggerKind>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub retention: Option<ExperienceRetention>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub content: Option<NativeText>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub change: Option<OutwardChange>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub observation: Option<Arc<ObservationContribution>>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub observations: Option<Vec<Arc<ObservationContribution>>>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub source_subject: Option<ObserverSubject>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub source_body: Option<AwarenessSourceBody>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub recognition: Option<crate::worlds::InstalledIndividualRecognition>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub received_features: Option<AwarenessReceivedFeatures>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub speech: Option<PerceivedSpeech>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub sound: Option<PerceivedSound>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub expires_at: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub source_receipt: Option<TemporalReceiptLocator>,
}
