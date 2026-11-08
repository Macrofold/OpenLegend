//! Installed attention parameters. The engine owns selection mechanics; the
//! selected world supplies every allowance, threshold and fictional meaning.

use crate::received::TemporalRetentionPolicy;
use crate::values::deserialize_safe_integer;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AttentionRetentionPolicy {
    pub maintenance_headroom: f64,
    pub required_pressure_start: f64,
    pub speech_maintenance_headroom: f64,
    pub derived_low_water: f64,
    pub recent: TemporalRetentionPolicy,
    pub optional: AccountRetentionLimits,
    pub required: AccountRetentionLimits,
    pub speech: AccountRetentionLimits,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub derived_max_bytes: u64,
    pub impression: ImpressionRetentionLimits,
    pub aftermath_seconds: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AccountRetentionLimits {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub max_bytes: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub max_records: u64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ImpressionRetentionLimits {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub max_bytes: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub max_claims: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub max_spans: u64,
    pub weaken_after_seconds: f64,
    pub expire_after_seconds: f64,
    pub reinforce_interval_seconds: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AttentionPolicy {
    pub geometry: GeometryAttentionPolicy,
    pub semantic: SemanticAttentionPolicy,
    pub scene: SceneAttentionPolicy,
    pub id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub version: u64,
    pub default_capacity: f64,
    pub maximum_capacity: f64,
    pub maximum_score: f64,
    pub ongoing_share: f64,
    pub stability_seconds: f64,
    pub switch_margin: f64,
    pub familiarity_bonus: f64,
    pub displacement_metres_per_point: f64,
    pub maximum_motion_cue: f64,
    pub new_description_cue: f64,
    pub urgent_cue: f64,
    pub relation: RelationAttentionPolicy,
    pub retention: AttentionRetentionPolicy,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct GeometryAttentionPolicy {
    pub interval_seconds: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub visits: u64,
    pub extent_metres: f64,
    pub error_metres: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub max_views: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub max_bytes: u64,
    pub feature_priority: FeaturePriority,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct FeaturePriority {
    pub support: f64,
    #[serde(rename = "solid-face")]
    pub solid_face: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SemanticAttentionPolicy {
    pub discovery: bool,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SceneAttentionPolicy {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub max_bytes: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub max_rows: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub node_visits: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub static_bytes: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub static_rows: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub discovery_bytes: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub discovery_rows: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub history_bytes: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub history_receipts: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub candidate_visits: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub initial_visits: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub query_visits: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub per_anchor_visits: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub maximum_queries: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub expansion_bytes: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub expansion_receipts: u64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RelationAttentionPolicy {
    pub interval_seconds: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub candidates: u64,
    pub clear_seconds: f64,
    pub minimum_decrease: f64,
    pub body: BodyRelationDistances,
    pub drop: DropRelationDistances,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct BodyRelationDistances {
    pub enter: f64,
    pub clear: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DropRelationDistances {
    pub enter: f64,
    pub clear: f64,
    pub minimum_drop: f64,
}

impl crate::install::DefinitionIdentity for AttentionPolicy {
    fn definition_id(&self) -> &str {
        &self.id
    }
    fn definition_version(&self) -> u64 {
        self.version
    }
}
