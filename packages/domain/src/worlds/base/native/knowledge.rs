//! Wilderness observer identity. Canonical routing remains private and separate
//! from an independently supported individual, familiarity and chosen names.

use crate::values::{deserialize_nullable, deserialize_present_option, deserialize_safe_integer};
use crate::worlds::base_recognition::{FamiliarityState, RecognitionKnowledge};
use serde::{Deserialize, Serialize};

fn retained_flag<'de, D: serde::Deserializer<'de>>(
    deserializer: D,
) -> Result<Option<bool>, D::Error> {
    if bool::deserialize(deserializer)? {
        Ok(Some(true))
    } else {
        Err(serde::de::Error::custom("Invalid retained identity flag."))
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ObserverIdentity {
    #[serde(
        default,
        deserialize_with = "retained_flag",
        skip_serializing_if = "Option::is_none"
    )]
    pub retained: Option<bool>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub familiarity: Option<FamiliarityState>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub individual_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub canonical_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub seed_only: Option<bool>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub voice: Option<RecognitionKnowledge>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub sight: Option<RecognitionKnowledge>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub name_evidence_ids: Option<Vec<String>>,
    pub given_name: String,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub nickname: Option<String>,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub encounter_id: Option<String>,
    pub authored: bool,
}
