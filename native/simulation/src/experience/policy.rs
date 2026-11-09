//! Actual installed cognition policy and its selected supplied-response data.
//! Authored prose informs an already permitted choice; it grants no execution.

use crate::encoding::js_trim;
use crate::install::{DefinitionIdentity, InstallError, RowImport, VerifiedDefinition};
use crate::status::StatusEffectPolicy;
use crate::values::{DefinitionPin, deserialize_nullable, deserialize_safe_integer};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
mod custody;
pub(crate) use custody::InstalledCognitionPolicy;

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct GuidanceCriteria {
    #[serde(rename = "true")]
    pub yes: String,
    #[serde(rename = "false")]
    pub no: String,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ActionGuidance {
    pub reasons: String,
    pub consideration: String,
    pub selection: String,
    pub criteria: GuidanceCriteria,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CognitionRecording {
    pub action_result_importance: f64,
    pub exposure_importance: f64,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DreamPolicy {
    pub status_effect_id: String,
    pub after_seconds: f64,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CognitionPolicy {
    #[serde(deserialize_with = "deserialize_nullable")]
    pub prepared_responses: Option<DefinitionPin>,
    pub action_guidance: ActionGuidance,
    pub recording: CognitionRecording,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub dream: Option<DreamPolicy>,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub version: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub max_immediate_level: u64,
    pub significant_event_types: Vec<String>,
    pub reflection: bool,
}
impl CognitionPolicy {
    pub fn validate(
        &self,
        selected_prepared: Option<&VerifiedDefinition<PreparedResponseProfile>>,
        statuses: &StatusEffectPolicy,
    ) -> Result<(), InstallError> {
        let text = |value: &str| !js_trim(value).is_empty() && value.encode_utf16().count() <= 2000;
        let score = |value: f64| value.is_finite() && (0.0..=10.0).contains(&value);
        if self.version != 1
            || self.revision == 0
            || ![2, 3, 4].contains(&self.max_immediate_level)
            || [
                &self.action_guidance.reasons,
                &self.action_guidance.consideration,
                &self.action_guidance.selection,
                &self.action_guidance.criteria.yes,
                &self.action_guidance.criteria.no,
            ]
            .into_iter()
            .any(|value| !text(value))
            || !score(self.recording.action_result_importance)
            || !score(self.recording.exposure_importance)
            || self.significant_event_types.iter().any(|value| {
                value.is_empty()
                    || value.len() > 64
                    || !value
                        .bytes()
                        .all(|byte| byte.is_ascii_lowercase() || byte == b'-')
            })
            || self.prepared_responses.as_ref().is_some_and(|pin| {
                !pin.is_valid() || selected_prepared.is_none_or(|selected| selected.pin() != pin)
            })
            || self.dream.as_ref().is_some_and(|dream| {
                !dream.after_seconds.is_finite()
                    || dream.after_seconds <= 0.0
                    || !statuses
                        .definitions
                        .iter()
                        .any(|definition| definition.id == dream.status_effect_id)
            })
        {
            return Err(InstallError::CurrentFormat);
        }
        Ok(())
    }
}

pub(crate) fn install_cognition(
    import: &mut RowImport,
    present: bool,
    selected_prepared: Option<&VerifiedDefinition<PreparedResponseProfile>>,
    statuses: &StatusEffectPolicy,
    budget: &crate::host::ByteBudget,
) -> Result<Arc<InstalledCognitionPolicy>, InstallError> {
    let row = crate::install::rows::take_one_row(
        import,
        "config_cognition",
        "[\"world\"]",
        "cognitionPolicy",
        present,
    )?
    .ok_or(InstallError::CurrentFormat)?;
    if !row.extra.is_empty() {
        return Err(InstallError::CurrentFormat);
    }
    InstalledCognitionPolicy::parse(&row.payload, selected_prepared, statuses, budget)
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PreparedResponseRelevance {
    pub question: String,
    pub uncertain: String,
    pub relevant: String,
    pub irrelevant: String,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PreparedResponsePurposeData {
    pub id: String,
    pub label: String,
    pub meaning: String,
    pub requires: Vec<String>,
    pub means: Vec<String>,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum PreparedSpeechAudience {
    Person,
    PossibleHearer,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PreparedSpeechAddressee {
    Involved,
    Beneficiary,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PreparedSpeechData {
    pub id: String,
    pub text: String,
    pub purposes: Vec<String>,
    pub requires: Vec<String>,
    pub audience: PreparedSpeechAudience,
    pub addressee: PreparedSpeechAddressee,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PreparedAppraisalData {
    pub definition_id: String,
    pub meaning: String,
    pub amounts: Vec<f64>,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PreparedObservationImportance {
    pub importance: f64,
    pub urgency: f64,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PreparedObservationData {
    pub range_role: String,
    pub ordinary: PreparedObservationImportance,
    pub entered_reach: PreparedObservationImportance,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PreparedResponseLimits {
    pub pursuit_seconds: f64,
    pub pursuit_radius: f64,
    pub hold_seconds: f64,
    pub assessment_seconds: f64,
    pub range_margin: f64,
    pub stable_seconds: f64,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PreparedResponseProfile {
    pub id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub version: u64,
    pub instructions: String,
    pub relevance: PreparedResponseRelevance,
    pub purposes: Vec<PreparedResponsePurposeData>,
    pub speech: Vec<PreparedSpeechData>,
    pub appraisals: Vec<PreparedAppraisalData>,
    pub observations: PreparedObservationData,
    pub limits: PreparedResponseLimits,
}
impl DefinitionIdentity for PreparedResponseProfile {
    fn definition_id(&self) -> &str {
        &self.id
    }
    fn definition_version(&self) -> u64 {
        self.version
    }
}

#[path = "policy/prepared_residency.rs"]
mod policy_residency;
