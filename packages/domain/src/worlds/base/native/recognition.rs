//! Wilderness voice descriptors. These are authored fictional features, not
//! engine identity or values derived from renderer assets.

use crate::values::deserialize_safe_integer;
use indexmap::IndexMap;
use indexmap::IndexSet;
use serde::{Deserialize, Serialize};
#[path = "recognition/journal.rs"]
mod journal;
pub(crate) use journal::{RecognitionCheckpoint, RecognitionJournal};
#[path = "recognition/familiarity.rs"]
mod familiarity;
#[path = "recognition/voice.rs"]
mod voice;
pub(crate) use familiarity::BodyFamiliarityPreparation;
#[path = "recognition/contact.rs"]
mod contact;
pub(crate) use contact::AttentionContactPreparation;
#[path = "recognition/retention.rs"]
mod retention;
pub(crate) use retention::{
    commit_observer_identity, member_indices, original_support, retain_recognition_evidence,
    retire_observer_identity, source_json,
};
pub(crate) use voice::{
    VoiceReception, VoiceReceptionParts, VoiceReceptionPreparation, individual_familiarity,
};
#[path = "recognition/warning.rs"]
mod warning;
pub(crate) use warning::ordinary_warning;
#[path = "recognition/prune.rs"]
mod prune;
pub(crate) use prune::{IndividualPruneMode, prune_observer_individuals};
#[path = "recognition/validation.rs"]
mod validation;
#[path = "recognition/privacy.rs"]
mod privacy;
pub(crate) use privacy::RecognitionPrivacyPreparation;
pub(crate) use validation::validate_selected_identities;

/// The actual selected world's descriptor is installed with its source pin.
/// Its clocks are policy fields; the engine supplies the world's time scale.
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RecognitionPolicy {
    pub id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub version: u64,
    pub credit_seconds: f64,
    pub seed_seconds: f64,
    pub warning_seconds: f64,
    pub warning: WarningRules,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub retained_credits: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub matching_exemplars: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub familiarity_roots: u64,
    pub familiarity_mature_seconds: f64,
    pub voice_feature_family: crate::experience::FeatureFamily,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct WarningRules {
    pub prefixes: Vec<String>,
    pub join: String,
    pub suffix: String,
    pub delimiters: String,
}
impl crate::install::DefinitionIdentity for RecognitionPolicy {
    fn definition_id(&self) -> &str {
        &self.id
    }
    fn definition_version(&self) -> u64 {
        self.version
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct VoiceFeatures {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pitch_range: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    resonance: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    texture: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    rhythm: u64,
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct RecognitionInterval {
    pub min: f64,
    pub max: f64,
}

pub fn valid_received_features(features: &IndexMap<String, RecognitionInterval>) -> bool {
    features.iter().all(|(dimension, interval)| {
        let mut chars = dimension.bytes();
        dimension.len() <= 64
            && chars
                .next()
                .is_some_and(|first| first.is_ascii_alphabetic())
            && chars.all(|value| value.is_ascii_alphanumeric() || value == b'_' || value == b'-')
            && interval.min.is_finite()
            && interval.max.is_finite()
            && interval.min >= 0.0
            && interval.max <= 1000.0
            && interval.min <= interval.max
    })
}
fn usable(
    features: &IndexMap<String, RecognitionInterval>,
) -> impl Iterator<Item = (&String, &RecognitionInterval)> {
    features
        .iter()
        .filter(|(_, interval)| interval.max - interval.min <= 400.0)
}
fn resolution(features: &IndexMap<String, RecognitionInterval>) -> f64 {
    let (sum, count) = usable(features).fold((0.0, 0usize), |(sum, count), (_, interval)| {
        (
            sum + 1.0 - (interval.max - interval.min) / 1000.0,
            count + 1,
        )
    });
    if count == 0 { 0.0 } else { sum / count as f64 }
}

/// Exact source-key grammar from the selected recognition family. Arbitrary
/// strings cannot hide a familiarity/association root from source revocation.
pub fn valid_support_key(key: &str) -> bool {
    use crate::reception::{EvidenceFamily, EvidenceSource};
    use serde_json::Value;
    if key.is_empty() {
        return false;
    }
    if let Some((family, id)) = key.split_once(':')
        && matches!(family, "awareness" | "memory" | "summary")
    {
        return crate::values::is_safe_record_id(id);
    }
    let Ok(value) = serde_json::from_str::<Value>(key) else {
        return false;
    };
    if let Some(values) = value.as_array() {
        return values.len() == 4
            && values[0].as_str() == Some("authored-acquaintance")
            && values[1]
                .as_str()
                .is_some_and(crate::values::is_safe_record_id)
            && values[2].as_str() == Some("wilderness:individual-recognition")
            && values[3].as_f64() == Some(1.0);
    }
    let Some(object) = value.as_object() else {
        return false;
    };
    let fact = object.contains_key("source");
    let source_value = if fact { &object["source"] } else { &value };
    let Ok(source) = serde_json::from_value::<EvidenceSource>(source_value.clone()) else {
        return false;
    };
    if source.validate().is_err() {
        return false;
    }
    if fact {
        let field = if crate::received::is_temporal_receipt_source(&source) {
            "memberIndex"
        } else {
            "ordinal"
        };
        let Some(ordinal) = object.get(field).and_then(Value::as_f64) else {
            return false;
        };
        if object.len() != 2
            || !ordinal.is_finite()
            || ordinal < 0.0
            || ordinal.fract() != 0.0
            || ordinal > crate::identity::MAX_SAFE_INTEGER as f64
        {
            return false;
        }
    }
    matches!(
        source.family,
        EvidenceFamily::NativeExposure | EvidenceFamily::NativeResponse
    )
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum PersonalSupportFamily {
    Awareness,
    Memory,
    Summary,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum RecognitionSupportSource {
    Personal {
        kind: PersonalSupportFamily,
        id: String,
    },
    Evidence(crate::reception::EvidenceSource),
}

/// Installed only by composition after this family's exact pins are accepted.
pub struct WildernessEvidenceMeaning;

impl crate::experience::PersonalEvidenceMeaning for WildernessEvidenceMeaning {
    fn recognition_source_ids(&self, keys: &[String]) -> Vec<String> {
        recognition_support_sources(keys)
            .iter()
            .map(|source| source.id().to_owned())
            .collect()
    }
}

impl crate::received::TemporalValueMeaning for WildernessEvidenceMeaning {
    fn recognition_support_allocation_bound(
        &self,
        keys: &[String],
    ) -> Option<crate::received::DependencyAliasAllocation> {
        recognition_support_allocation_bound(keys)
    }
    fn recognition_support_source_ids(
        &self,
        keys: &[String],
    ) -> Result<Vec<String>, crate::received::ReceivedError> {
        recognition_support_source_ids(keys).map_err(|_| {
            crate::received::ReceivedError("Invalid selected recognition source alias.")
        })
    }
}

pub(crate) fn recognition_support_allocation_bound(
    keys: &[String],
) -> Option<crate::received::DependencyAliasAllocation> {
    use crate::host::retained_size::{heap_sum, map_storage};
    // This authored grammar emits at most one source ID and one fact alias
    // per key. JSON decoding visits only the key, never a retained world body.
    if keys.is_empty() {
        return Some(crate::received::DependencyAliasAllocation::empty());
    }
    let items = keys.len().checked_mul(2)?;
    let (strings, decoding) =
        keys.iter()
            .try_fold((0usize, 0usize), |(strings, decoding), key| {
                let personal = key.split_once(':').is_some_and(|(family, id)| {
                    !id.is_empty() && matches!(family, "awareness" | "memory" | "summary")
                });
                Some((
                    strings.checked_add(key.len().checked_mul(14)?.checked_add(128)?)?,
                    decoding.checked_add(if personal {
                        key.len()
                    } else {
                        crate::experience::encoded_body_bound(key)
                            .ok()?
                            .checked_mul(4)?
                    })?,
                ))
            })?;
    Some(crate::received::DependencyAliasAllocation {
        items,
        strings,
        temporary: heap_sum([
            decoding,
            map_storage::<String, ()>(items.checked_mul(2)?.max(3))?,
            keys.len()
                .checked_mul(std::mem::size_of::<RecognitionSupportSource>())?,
            items.checked_mul(std::mem::size_of::<String>())?,
        ])?,
    })
}

impl RecognitionSupportSource {
    pub fn id(&self) -> &str {
        match self {
            Self::Personal { id, .. } => id,
            Self::Evidence(source) => &source.id,
        }
    }
}

pub fn recognition_support_sources(keys: &[String]) -> Vec<RecognitionSupportSource> {
    use serde_json::Value;
    keys.iter()
        .filter_map(|key| {
            if let Some((family, id)) = key.split_once(':')
                && !id.is_empty()
            {
                let kind = match family {
                    "awareness" => Some(PersonalSupportFamily::Awareness),
                    "memory" => Some(PersonalSupportFamily::Memory),
                    "summary" => Some(PersonalSupportFamily::Summary),
                    _ => None,
                };
                if let Some(kind) = kind {
                    return Some(RecognitionSupportSource::Personal {
                        kind,
                        id: id.to_owned(),
                    });
                }
            }
            let value = serde_json::from_str::<Value>(key).ok()?;
            let object = value.as_object()?;
            let source_value = object.get("source").unwrap_or(&value);
            let source =
                serde_json::from_value::<crate::reception::EvidenceSource>(source_value.clone())
                    .ok()?;
            source.validate().ok()?;
            Some(RecognitionSupportSource::Evidence(source))
        })
        .collect()
}

pub fn recognition_support_source_ids(
    keys: &[String],
) -> Result<Vec<String>, crate::experience::ExperienceError> {
    use serde_json::Value;
    let mut ids: IndexSet<String> = recognition_support_sources(keys)
        .iter()
        .map(|source| source.id().to_owned())
        .collect();
    for key in keys {
        if !key.starts_with('{') {
            continue;
        }
        let Ok(value) = serde_json::from_str::<Value>(key) else {
            continue;
        };
        let Some(source_value) = value.get("source") else {
            continue;
        };
        let Ok(source) =
            serde_json::from_value::<crate::reception::EvidenceSource>(source_value.clone())
        else {
            continue;
        };
        let field = if crate::received::is_temporal_receipt_source(&source) {
            "memberIndex"
        } else {
            "ordinal"
        };
        let Some(ordinal) = value.get(field).and_then(Value::as_f64) else {
            continue;
        };
        if ordinal.is_finite()
            && ordinal >= 0.0
            && ordinal.fract() == 0.0
            && ordinal <= crate::identity::MAX_SAFE_INTEGER as f64
        {
            ids.insert(crate::experience::personal_fact_alias(
                &source.id,
                ordinal as u64,
            )?);
        }
    }
    Ok(ids.into_iter().collect())
}

impl VoiceFeatures {
    pub fn validate(&self) -> bool {
        [self.pitch_range, self.resonance, self.texture, self.rhythm]
            .into_iter()
            .all(|value| value <= 1000)
    }

    /// Current direct-path speech preserves supported timbre. A transformed
    /// physical sound must supply its surviving intervals through its own owner.
    pub fn received_features(&self) -> IndexMap<String, RecognitionInterval> {
        [
            ("pitchRange", self.pitch_range),
            ("resonance", self.resonance),
            ("texture", self.texture),
            ("rhythm", self.rhythm),
        ]
        .into_iter()
        .map(|(dimension, value)| {
            let value = value as f64;
            (
                dimension.to_owned(),
                RecognitionInterval {
                    min: value,
                    max: value,
                },
            )
        })
        .collect()
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum RecognitionBaseline {
    Learned,
    Familiar,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct FamiliarityRoot {
    pub key: String,
    pub source_key: String,
    pub at: f64,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    pub order: u64,
    pub support: Vec<String>,
    pub required: bool,
    pub credited: bool,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AuthoredFamiliarity {
    pub source: String,
    pub value: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct FamiliarityState {
    pub roots: Vec<FamiliarityRoot>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub authored: Option<AuthoredFamiliarity>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub last_credit_at: Option<f64>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub next_credit_at: Option<f64>,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    pub fast_credits: u64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RecognitionSample {
    pub key: String,
    pub source_key: String,
    pub at: f64,
    pub order: f64,
    pub encounter: String,
    #[serde(serialize_with = "crate::encoding::serialize_js_map")]
    pub features: IndexMap<String, RecognitionInterval>,
    pub quality: f64,
    pub perception: f64,
    pub policy: String,
    pub support: Vec<String>,
    pub contact_eligible: bool,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AuthoredExemplar {
    #[serde(serialize_with = "crate::encoding::serialize_js_map")]
    pub features: IndexMap<String, RecognitionInterval>,
    pub quality: f64,
    pub ordinal: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AuthoredRecognition {
    pub source: String,
    pub installed_at: f64,
    pub perception: f64,
    pub order: f64,
    pub baseline: RecognitionBaseline,
    pub exemplars: Vec<AuthoredExemplar>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RecognitionKnowledge {
    pub samples: Vec<RecognitionSample>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub authored: Option<AuthoredRecognition>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub last_credit_at: Option<f64>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub next_credit_at: Option<f64>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RecognitionCandidate {
    pub individual_id: String,
    pub distance: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SeedCorrelation {
    pub sample_key: String,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub individual_id: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct IndividualRecognition {
    pub recognized: bool,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub subject: Option<crate::reception::ObserverSubject>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub learned_subject: Option<crate::reception::ObserverSubject>,
    pub candidates: Vec<RecognitionCandidate>,
    pub more_candidates: bool,
    pub quality: f64,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub perception: Option<f64>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub policy: Option<String>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub prior_exemplar_key: Option<String>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub learning_support: Option<Vec<String>>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub seed_correlation: Option<SeedCorrelation>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub familiarity: Option<f64>,
    // This is an actual producer fact, not saved state: Source inserts its
    // initial body proof before matching and later overwrites it in place.
    // Immutable imported account bytes retain their own canonical identity.
    #[serde(skip)]
    body_support_before_matching: bool,
}

impl Serialize for IndividualRecognition {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeMap;
        let mut fields = serializer.serialize_map(None)?;
        fields.serialize_entry("recognized", &self.recognized)?;
        fields.serialize_entry("candidates", &self.candidates)?;
        fields.serialize_entry("moreCandidates", &self.more_candidates)?;
        fields.serialize_entry("quality", &self.quality)?;
        if let Some(value) = self.perception {
            fields.serialize_entry("perception", &value)?;
        }
        if let Some(value) = &self.policy {
            fields.serialize_entry("policy", value)?;
        }
        if self.body_support_before_matching {
            if let Some(value) = &self.learning_support {
                fields.serialize_entry("learningSupport", value)?;
            }
        }
        if let Some(value) = &self.subject {
            fields.serialize_entry("subject", value)?;
        }
        if let Some(value) = &self.prior_exemplar_key {
            fields.serialize_entry("priorExemplarKey", value)?;
        }
        if let Some(value) = self.familiarity {
            fields.serialize_entry("familiarity", &value)?;
        }
        if !self.body_support_before_matching && self.subject.is_some() {
            if let Some(value) = &self.learning_support {
                fields.serialize_entry("learningSupport", value)?;
            }
        }
        if let Some(value) = &self.seed_correlation {
            fields.serialize_entry("seedCorrelation", value)?;
        }
        if !self.body_support_before_matching && self.subject.is_none() {
            if let Some(value) = &self.learning_support {
                fields.serialize_entry("learningSupport", value)?;
            }
        }
        if let Some(value) = &self.learned_subject {
            fields.serialize_entry("learnedSubject", value)?;
        }
        fields.end()
    }
}
