//! Complete current body-policy record. No world vocabulary, threshold or
//! narration is supplied by this engine type; the installed definition owns it.

use super::ReincarnationPolicy;
use crate::status::StatusCondition;
use crate::values::{deserialize_nullable, deserialize_present_option, deserialize_safe_integer};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct BodyPolicy {
    pub id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub version: u64,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub reincarnation: Option<ReincarnationPolicy>,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub lethal_attack_review: Option<LethalReviewPolicy>,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub evasion: Option<EvasionPolicy>,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub combat: Option<CombatPolicy>,
    pub zero_health: ZeroHealthPolicy,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub recovery: Option<RecoveryPolicy>,
    pub revival: RevivalPolicy,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub remains: Option<RemainsPolicy>,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub consumption: Option<ConsumptionPolicy>,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub carrying_concern: Option<CarryingConcern>,
    pub background_thinking: BackgroundThinking,
}

impl crate::install::DefinitionIdentity for BodyPolicy {
    fn definition_id(&self) -> &str {
        &self.id
    }
    fn definition_version(&self) -> u64 {
        self.version
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct LethalReviewPolicy {
    pub title: String,
    pub description: String,
    pub ranged_description: String,
    pub confirm_label: String,
    pub prepare_label: String,
    pub cancel_label: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct EvasionPolicy {
    pub body_plans: Vec<String>,
    pub maximum_distance: f64,
    pub seconds: f64,
    pub repeat_seconds: f64,
    pub label: String,
    pub description: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct CombatPolicy {
    pub targets: ControllerTargets,
    pub human_issued_targets: Vec<String>,
    pub projectile_contact: ProjectileContact,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub encounters: Option<EncounterPolicy>,
    pub impact_attention: ImpactAttention,
    pub unavailable_text: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct ControllerTargets {
    pub player: Vec<String>,
    pub npc: Vec<String>,
    pub native: Vec<String>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub(crate) enum ProjectileContact {
    InjureVulnerableBody,
    StopOnly,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct EncounterPolicy {
    pub recent_seconds: f64,
    pub visible_preparation: bool,
    pub preparing_strike: String,
    pub aiming: String,
    pub ended: String,
    pub closing: String,
    pub withdrawing: String,
    pub controls: EncounterControls,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct EncounterControls {
    pub speak: EncounterControl,
    pub stop: EncounterControl,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct EncounterControl {
    pub label: String,
    pub description: String,
    pub success: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct ImpactAttention {
    pub importance: f64,
    pub urgency: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ZeroHealthPolicy {
    pub player: ZeroHealthOutcome,
    pub npc: ZeroHealthOutcome,
    pub native: ZeroHealthOutcome,
    pub incapacitate_narration: String,
    pub death_narration: String,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum ZeroHealthOutcome {
    Incapacitate,
    Die,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct RecoveryPolicy {
    pub controllers: Vec<String>,
    pub when: StatusCondition,
    pub anchor: RecoveryAnchor,
    pub floors: Vec<RecoveryFloor>,
    pub label: String,
    pub narration: String,
    pub success_text: String,
    pub refusal_text: String,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) enum RecoveryAnchor {
    SafeReturnAnchor,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct RecoveryFloor {
    pub attribute_id: String,
    pub value: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct RevivalPolicy {
    pub fill_to_maximum: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct RemainsPolicy {
    pub rot_after_seconds: f64,
    pub remove_after_seconds: f64,
    pub fresh_label: String,
    pub rotting_label: String,
    pub rot_narration: String,
    pub removal_narration: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct MealPolicy {
    pub condition_id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub maximum_units: u64,
    pub one_label: String,
    pub meal_label: String,
    pub count_label: String,
    pub start_label: String,
    pub help: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ConsumptionPolicy {
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub meal: Option<MealPolicy>,
    pub attribute_id: String,
    pub quantity_property: String,
    pub refusals: Vec<ConsumptionRefusal>,
    pub label: String,
    pub narration: String,
    pub success_text: String,
    pub unavailable_text: String,
    pub suggest_when: StatusCondition,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ConsumptionRefusal {
    pub item_type: String,
    pub reason: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct CarryingConcern {
    pub attribute_id: String,
    pub item_property: String,
    pub text: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct BackgroundThinking {
    #[serde(deserialize_with = "deserialize_nullable")]
    pub maintenance_blocked_when: Option<StatusCondition>,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub commit_blocked_when: Option<StatusCondition>,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub reflection_blocked_when: Option<StatusCondition>,
    pub reconsideration_inputs: Vec<ReconsiderationInput>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct ReconsiderationInput {
    pub key: String,
    pub when: StatusCondition,
    pub director: bool,
}

#[path = "policy/residency.rs"]
mod policy_residency;
