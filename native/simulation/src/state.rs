//! Canonical physical records for the scoped native conversion.
//!
//! Installation is separate from deserialization: named unconverted fields are
//! retained only while inspecting an input and must be explicitly refused when
//! the selected installed closure would require their owner. No accepted world
//! can silently replace such a field with an empty value.

mod action_storage;
mod goal_storage;
mod intent_storage;
use crate::identity::MAX_SAFE_INTEGER;
use crate::values::{
    AttributeState, DefinitionPin, StatusInstance, WorkInvocation, deserialize_present_option,
    deserialize_safe_integer,
};
pub(crate) use action_storage::{
    FundedAction, FundedActionNavigation, FundedActionPath, FundedActionRoute,
};
pub(crate) use goal_storage::FundedGoals;
use indexmap::IndexMap;
pub(crate) use intent_storage::FundedIntents;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::borrow::Cow;
use std::collections::BTreeMap;

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Point {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}
/// Matches the current domain's Position = WorldPoint contract.
pub type Position = Point;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SurfacePoint {
    pub x: f64,
    pub y: f64,
    pub z: f64,
    pub surface_id: String,
}
impl SurfacePoint {
    pub fn point(&self) -> Point {
        Point {
            x: self.x,
            y: self.y,
            z: self.z,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BodyProfile {
    pub id: String,
    pub radius: f64,
    pub height: f64,
    pub eye_height: f64,
    pub ear_height: f64,
    pub interaction_height: f64,
    pub max_slope: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Bounds {
    pub min: Point,
    pub max: Point,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Named {
    pub name: crate::text::JsText,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub name_form: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub indefinite_article: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(tag = "mode", rename_all = "lowercase", deny_unknown_fields)]
pub enum Placement {
    World {
        position: Point,
        #[serde(
            rename = "supportSurfaceId",
            deserialize_with = "crate::values::deserialize_nullable"
        )]
        support_surface_id: Option<String>,
        #[serde(deserialize_with = "deserialize_safe_integer")]
        revision: u64,
        #[serde(
            rename = "motionContinuityRevision",
            default,
            deserialize_with = "crate::values::deserialize_present_safe_integer",
            skip_serializing_if = "Option::is_none"
        )]
        motion_continuity_revision: Option<u64>,
    },
    Contained {
        #[serde(rename = "parentEntityId")]
        parent_entity_id: String,
        #[serde(deserialize_with = "deserialize_safe_integer")]
        revision: u64,
    },
    Attached {
        #[serde(rename = "parentEntityId")]
        parent_entity_id: String,
        #[serde(rename = "portId")]
        port_id: String,
        #[serde(deserialize_with = "deserialize_safe_integer")]
        revision: u64,
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        slot: Option<String>,
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        local: Option<Point>,
    },
}

/// Unconverted input has no live execution/formatting API. Its presence is an
/// installation obligation, not permission to keep opaque writable gameplay.
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct UnconvertedField(pub(crate) Value);
impl UnconvertedField {
    pub fn is_null(&self) -> bool {
        self.0.is_null()
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NativeInterval {
    pub remaining_seconds: f64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub ends_at: Option<f64>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct WorldHeader {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub schema_version: u64,
    pub id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub seed: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub sequence: u64,
    pub sim_time: f64,
    pub paused: bool,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub native_interval: Option<NativeInterval>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SoftFootprint {
    pub width: f64,
    pub length: f64,
    pub height: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct LocalPose {
    pub kind: String,
    pub profile: DefinitionPin,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub physical_life: u64,
    pub started_at: f64,
    pub restore_at: f64,
    pub phase: String,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EntitySpatial {
    pub body: BodyProfile,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub inactive_body: Option<BodyProfile>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub soft_footprint: Option<SoftFootprint>,
    pub heading: f64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub local_pose: Option<LocalPose>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub local_avoidance_ready_at: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub flight: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub fall_velocity: Option<f64>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EquipmentPort {
    pub id: String,
    pub label: String,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub icon: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BodyConditions {
    pub wetness: f64,
    pub burning: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Susceptibility {
    pub injury: f64,
    pub wetness: f64,
    pub burning: f64,
    pub healing: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Yield {
    pub definition_id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub quantity: u64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct LivingBody {
    pub equipment_ports: Vec<EquipmentPort>,
    pub plan: String,
    pub max_health: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
    pub conditions: BodyConditions,
    pub susceptibility: Susceptibility,
    pub harvest_yield: Vec<Yield>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Capabilities {
    pub cognition: bool,
    pub memory: bool,
    pub inner_world: bool,
    pub speech: bool,
    pub language: bool,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CharacterTrait {
    pub id: String,
    pub name: crate::text::JsText,
    pub description: crate::text::JsText,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct IndividualRecognition {
    pub attribute_id: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ConditionEpisode {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub version: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub severity: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub notified: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
    pub pending: bool,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub next_review_at: Option<f64>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Participation {
    pub phase: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub exit_attempt_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub return_anchor: Option<SurfacePoint>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Goal {
    pub id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
    pub objective: crate::text::JsText,
    pub status: String,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub parent_id: Option<String>,
    pub author: String,
    pub source_id: String,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub completion: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ResolvedSemanticCause {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub interval: u64,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub purpose: Option<String>,
    pub qualitative_revision: String,
    pub severity: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SemanticContinuation {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub interval: u64,
    pub discovery: String,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub reservation: Option<String>,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub occupied_purpose: Option<String>,
    pub resolved: IndexMap<String, ResolvedSemanticCause>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RememberedPlace {
    pub subject_id: String,
    pub label: crate::text::JsText,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub episode: Option<String>,
    pub point: SurfacePoint,
    pub at: f64,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ActorAgency {
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub semantic: Option<SemanticContinuation>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub last_result_evidence: Option<crate::activity::ResultEvidence>,
    pub attempts: Vec<crate::plans::PendingIntent>,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
    pub goals: Vec<Goal>,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub(crate) plan: Option<crate::plans::ActorPlan>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub(crate) suspended: Option<Option<crate::plans::ActorPlan>>,
    pub(crate) history: Vec<crate::plans::PlanStep>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub places: Option<Vec<RememberedPlace>>,
}
impl ActorAgency {
    /// An explicit saved null clears paused work but retains its field presence.
    pub(crate) fn suspended_plan(&self) -> Option<&crate::plans::ActorPlan> {
        self.suspended.as_ref().and_then(Option::as_ref)
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NavigationRequest {
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub wait: Option<String>,
    pub from: SurfacePoint,
    pub destinations: Vec<SurfacePoint>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub outside_bounds: Option<Bounds>,
    pub body: BodyProfile,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub geometry_revision: u64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NavigationPending {
    pub request: NavigationRequest,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub failure: Option<String>,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Action {
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub feeding: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub gathering: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub attack_observers: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub cooperation: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub combat_help_id: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub evasion: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub ranged: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub attack_execution: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub competence_pin: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub ranged_policy_pin: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub coaching_episode_id: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub assembly_phase: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub assembly_exit_pending: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub gate_work: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub boundary_impact: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub hearth_work: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub assembly_corner: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub construction_grant: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub material_permission: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub material_origin_ids: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub material_contribution_ids: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub requires_lethal_review: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub lethal_permission: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub scar_id: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub recipe_pin: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub manufacture_tools: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub food_preparation: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub fishing: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub strike_phase: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub strike_motion: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub strike_outcome: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub guard: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub follow: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub transferred: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub quantity: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub recipe_id: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub item_id: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub weapon_item_id: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub ammo_item_id: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub heat_id: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub fire_operation: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub fire_guard: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub native_locomotion: Option<crate::native_response::NativeLocomotion>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    pub target_life: Option<u64>,
    pub id: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub stage: String,
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
    pub destination: Option<SurfacePoint>,
    pub path: Vec<SurfacePoint>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub motion_sample_remaining_metres: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub navigation: Option<NavigationPending>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    pub replans: Option<u64>,
    pub remaining_seconds: f64,
    pub total_seconds: f64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub attribute_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub definition_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    pub definition_version: Option<u64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub resource_definition: Option<DefinitionPin>,
    pub consumed: Vec<Yield>,
}

impl Action {
    pub(crate) fn has_unconverted_fields(&self) -> bool {
        self.feeding.is_some()
            || self.gathering.is_some()
            || self.attack_observers.is_some()
            || self.cooperation.is_some()
            || self.combat_help_id.is_some()
            || self.evasion.is_some()
            || self.ranged.is_some()
            || self.attack_execution.is_some()
            || self.competence_pin.is_some()
            || self.ranged_policy_pin.is_some()
            || self.coaching_episode_id.is_some()
            || self.assembly_phase.is_some()
            || self.assembly_exit_pending.is_some()
            || self.gate_work.is_some()
            || self.boundary_impact.is_some()
            || self.hearth_work.is_some()
            || self.assembly_corner.is_some()
            || self.construction_grant.is_some()
            || self.material_permission.is_some()
            || self.material_origin_ids.is_some()
            || self.material_contribution_ids.is_some()
            || self.requires_lethal_review.is_some()
            || self.lethal_permission.is_some()
            || self.scar_id.is_some()
            || self.recipe_pin.is_some()
            || self.manufacture_tools.is_some()
            || self.food_preparation.is_some()
            || self.fishing.is_some()
            || self.strike_phase.is_some()
            || self.strike_motion.is_some()
            || self.strike_outcome.is_some()
            || self.guard.is_some()
            || self.follow.is_some()
            || self.transferred.is_some()
            || self.quantity.is_some()
            || self.recipe_id.is_some()
            || self.item_id.is_some()
            || self.weapon_item_id.is_some()
            || self.ammo_item_id.is_some()
            || self.heat_id.is_some()
            || self.fire_operation.is_some()
            || self.fire_guard.is_some()
    }
    // Same minimal owned record as kernel.ts's temporary action. Installation
    // never calls this constructor to fill missing fields in an imported action.
    fn native_action(id: String, kind: &str, stage: &str) -> Self {
        Self {
            feeding: None,
            gathering: None,
            attack_observers: None,
            cooperation: None,
            combat_help_id: None,
            evasion: None,
            ranged: None,
            attack_execution: None,
            competence_pin: None,
            ranged_policy_pin: None,
            coaching_episode_id: None,
            assembly_phase: None,
            assembly_exit_pending: None,
            gate_work: None,
            boundary_impact: None,
            hearth_work: None,
            assembly_corner: None,
            construction_grant: None,
            material_permission: None,
            material_origin_ids: None,
            material_contribution_ids: None,
            requires_lethal_review: None,
            lethal_permission: None,
            scar_id: None,
            recipe_pin: None,
            manufacture_tools: None,
            food_preparation: None,
            fishing: None,
            strike_phase: None,
            strike_motion: None,
            strike_outcome: None,
            guard: None,
            follow: None,
            transferred: None,
            quantity: None,
            recipe_id: None,
            item_id: None,
            weapon_item_id: None,
            ammo_item_id: None,
            heat_id: None,
            fire_operation: None,
            fire_guard: None,
            native_locomotion: None,
            target_life: None,
            id: id,
            kind: kind.to_owned(),
            stage: stage.to_owned(),
            target_id: None,
            destination: None,
            path: Vec::new(),
            motion_sample_remaining_metres: None,
            navigation: None,
            replans: None,
            remaining_seconds: 0.0,
            total_seconds: 0.0,
            attribute_id: None,
            definition_id: None,
            definition_version: None,
            resource_definition: None,
            consumed: Vec::new(),
        }
    }
    pub(crate) fn status_effect(episode: String, definition_id: String) -> Self {
        let mut action = Self::native_action(episode, "status-effect", "working");
        action.definition_id = Some(definition_id);
        action
    }
    pub(crate) fn movement(
        id: String,
        destination: SurfacePoint,
        path: Vec<SurfacePoint>,
        approaching: bool,
        navigation: Option<NavigationPending>,
        native_locomotion: Option<crate::native_response::NativeLocomotion>,
    ) -> Self {
        let mut action = Self::native_action(
            id,
            "move",
            if approaching {
                "approaching"
            } else {
                "working"
            },
        );
        action.destination = Some(destination);
        action.path = path;
        action.navigation = navigation;
        action.native_locomotion = native_locomotion;
        action
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReleaseSupport {
    pub occurrence_id: String,
    pub event_id: String,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CoachingSupport {
    pub event_id: String,
    pub observed: ReleaseSupport,
    pub coach_id: String,
    pub coach_evidence_id: String,
    pub learner_evidence_id: String,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PracticeProgress {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub starting: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
    pub releases: Vec<ReleaseSupport>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub coaching: Option<CoachingSupport>,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ActorState {
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub attack_mode_notice: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub encounters: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub practice: Option<IndexMap<String, PracticeProgress>>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub coaching_episode_id: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub natural_strike_ids: Option<Vec<String>>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub(crate) pending_death: Option<crate::body::PendingDeath>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub inventory_inspection: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    pub attention_capacity: Option<u64>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    pub physical_life: Option<u64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub scars: Option<IndexMap<String, f64>>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub conditions: Option<IndexMap<String, ConditionEpisode>>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub combat_ready_at: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub evasion_ready_at: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub participation: Option<Participation>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub senses: Option<Vec<String>>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub contacts: Option<IndexMap<String, crate::reception::ContactEpisode>>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub attributes: Option<IndexMap<String, AttributeState>>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub traits: Option<Vec<CharacterTrait>>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub voice_profile: Option<crate::reception::VoiceFeatures>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub individual_recognition: Option<IndividualRecognition>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub description: Option<crate::text::JsText>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub personality: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub backstory: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub initial_goals: Option<Vec<String>>,
    pub agency: ActorAgency,
    pub controller: String,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub species: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub body: Option<LivingBody>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub capabilities: Option<Capabilities>,
    pub health: f64,
    pub alive: bool,
    pub incapacitated: bool,
    pub born_at: f64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub birth_time_known: Option<bool>,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub action: Option<Action>,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub plan_generation: u64,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Resource {
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub cast: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    pub revision: Option<u64>,
    pub definition_id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub quantity: u64,
    pub work_seconds: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Remains {
    pub died_at: f64,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub rot_at: Option<f64>,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub remove_at: Option<f64>,
    pub phase: String,
    pub source_id: String,
    pub yields: Vec<Yield>,
    pub harvested: bool,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Heat {
    pub fuel_seconds: f64,
    pub lit: bool,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Replenisher {
    pub attribute_id: String,
    pub remaining: f64,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    pub revision: Option<u64>,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Entity {
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub hearth: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub practice_target: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub threat: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub assembly: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub inventory_revision: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub item: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub container: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub declared_owner: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub retirement: Option<UnconvertedField>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub sensory_progress: Option<crate::reception::SensoryProgress>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub icon: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub description: Option<crate::text::JsText>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub status_effects: Option<IndexMap<String, StatusInstance>>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub attributes: Option<IndexMap<String, AttributeState>>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub mechanism_fields: Option<IndexMap<String, IndexMap<String, f64>>>,
    pub id: String,
    pub name: crate::text::JsText,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub name_form: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub indefinite_article: Option<String>,
    pub kind: String,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub placement: Option<Placement>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub appearance: Option<crate::text::JsText>,
    pub spatial: EntitySpatial,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub actor: Option<ActorState>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub animal: Option<crate::native_response::NativeResponseState>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub replenisher: Option<Replenisher>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub resource: Option<Resource>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub remains: Option<Remains>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub heat: Option<Heat>,
}

impl Entity {
    pub fn has_memory(&self) -> bool {
        self.actor.as_ref().is_some_and(|actor| {
            actor
                .capabilities
                .as_ref()
                .map_or(actor.controller != "native", |capabilities| {
                    capabilities.memory
                })
        })
    }
    pub fn physical_root(&self) -> bool {
        self.retirement.is_none()
            && self
                .actor
                .as_ref()
                .is_none_or(|actor| actor.pending_death.is_none())
            && self
                .remains
                .as_ref()
                .is_none_or(|remains| remains.phase != "removed")
            && matches!(self.placement, Some(Placement::World { .. }))
    }
    pub fn world_position(&self) -> Option<Point> {
        match &self.placement {
            Some(Placement::World { position, .. }) => Some(*position),
            _ => None,
        }
    }
    pub fn supported_position(&self) -> Option<SurfacePoint> {
        match &self.placement {
            Some(Placement::World {
                position,
                support_surface_id: Some(surface),
                ..
            }) => Some(SurfacePoint {
                x: position.x,
                y: position.y,
                z: position.z,
                surface_id: surface.clone(),
            }),
            _ => None,
        }
    }
    pub fn physical_life(&self) -> Option<u64> {
        self.actor
            .as_ref()
            .map(|actor| actor.physical_life.unwrap_or(0))
    }
    pub fn stored_attributes(&self) -> Option<&IndexMap<String, AttributeState>> {
        match &self.actor {
            Some(actor) => actor.attributes.as_ref(),
            None => self.attributes.as_ref(),
        }
    }
    pub fn stored_attributes_mut(&mut self) -> Option<&mut IndexMap<String, AttributeState>> {
        match &mut self.actor {
            Some(actor) => actor.attributes.as_mut(),
            None => self.attributes.as_mut(),
        }
    }
    pub(crate) fn ordinary_body_profile(&self) -> &BodyProfile {
        match &self.actor {
            Some(actor) if !actor.alive => self
                .spatial
                .inactive_body
                .as_ref()
                .unwrap_or(&self.spatial.body),
            _ => &self.spatial.body,
        }
    }
    pub fn body_profile(&self) -> Cow<'_, BodyProfile> {
        let ordinary = self.ordinary_body_profile();
        match &self.spatial.soft_footprint {
            Some(form) => Cow::Owned(BodyProfile {
                radius: form.width.max(form.length) / 2.0,
                height: form.height,
                eye_height: form.height,
                ear_height: form.height,
                interaction_height: form.height,
                ..ordinary.clone()
            }),
            None => Cow::Borrowed(ordinary),
        }
    }
    pub fn actively_participates(&self) -> bool {
        self.retirement.is_none()
            && self.actor.as_ref().is_none_or(|actor| {
                actor.pending_death.is_none()
                    && actor
                        .participation
                        .as_ref()
                        .is_none_or(|p| p.phase != "inactive")
            })
            && self
                .remains
                .as_ref()
                .is_none_or(|remains| remains.phase != "removed")
            && matches!(self.placement, Some(Placement::World { .. }))
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub struct EntityHandle {
    pub slot: usize,
    pub generation: u64,
}
struct EntitySlot {
    generation: u64,
    entity: Option<Entity>,
    order: String,
    action_storage: Option<crate::host::ByteReservation>,
    goal_storage: Option<crate::host::ByteReservation>,
    intent_storage: Option<crate::host::ResidentReservation>,
}
/// Ordering labels are the source collection's actual labels. They are not
/// identities and never change merely because jobs move between workers.
pub struct EntityStore {
    slots: Vec<EntitySlot>,
    by_id: BTreeMap<String, EntityHandle>,
    by_order: BTreeMap<String, String>,
    pub next_insertion: u64,
}
/// A membership inverse owns only collection metadata. The newly constructed
/// entity itself is moved into the canonical store, never copied into an undo.
pub(crate) struct EntityInsertion {
    pub handle: EntityHandle,
    next_insertion: u64,
    renumbered: Option<(BTreeMap<String, String>, Vec<(usize, String)>)>,
}
impl EntityInsertion {
    pub(crate) fn renumbered(&self) -> bool {
        self.renumbered.is_some()
    }
}
impl EntityStore {
    pub(crate) fn insertion_bound(&self, id: &str) -> Option<usize> {
        use crate::host::retained_size::tree_node_bound;
        let mut bytes = std::mem::size_of::<EntitySlot>()
            .checked_mul(self.slots.capacity().checked_mul(2)?.max(4))?
            .checked_add(id.len().checked_mul(3)?)?
            .checked_add(18 * 2)?
            .checked_add(tree_node_bound::<String, EntityHandle>()?)?
            .checked_add(tree_node_bound::<String, String>()?)?;
        if self.next_insertion == MAX_SAFE_INTEGER {
            bytes = bytes.checked_add(self.len().checked_mul(
                std::mem::size_of::<(usize, String)>() + tree_node_bound::<String, String>()? + 36,
            )?)?;
            for id in self.ordered_ids() {
                bytes = bytes.checked_add(id.len())?;
            }
        }
        Some(bytes)
    }
    pub(crate) fn insert_new(&mut self, entity: Entity) -> Result<EntityInsertion, &'static str> {
        // The scoped installation's actor-only proof remains true across every
        // selected creation. A new actorless family needs its actual owners and
        // a changed installation closure before this store may admit it.
        if entity.actor.is_none() {
            return Err("The installed physical family requires an actor.");
        }
        if entity
            .actor
            .as_ref()
            .is_some_and(|actor| actor.action.is_some())
        {
            return Err("A newly created action must enter its funded semantic owner.");
        }
        if self.by_id.contains_key(&entity.id) {
            return Err("Existing entity membership.");
        }
        self.slots.try_reserve(1).map_err(|_| "Entity capacity.")?;
        let previous = self.next_insertion;
        let renumbered = if self.next_insertion == MAX_SAFE_INTEGER {
            // Source relabels current string keys at precision exhaustion. This
            // exceptional operation rebuilds ordering metadata, never entities.
            let mut labels = Vec::new();
            labels
                .try_reserve_exact(self.len())
                .map_err(|_| "Entity capacity.")?;
            let mut next = 0u64;
            let mut order = BTreeMap::new();
            for id in self.by_order.values() {
                let handle = *self.by_id.get(id).ok_or("Entity membership.")?;
                let old = &self.slots[handle.slot].order;
                let label = if old.starts_with("0/") {
                    old.clone()
                } else {
                    let label = format!("1/{next:016}");
                    next += 1;
                    label
                };
                order.insert(label.clone(), id.clone());
                labels.push((handle.slot, label));
            }
            let old_order = std::mem::replace(&mut self.by_order, order);
            for (slot, label) in &mut labels {
                std::mem::swap(&mut self.slots[*slot].order, label);
            }
            self.next_insertion = next;
            Some((old_order, labels))
        } else {
            None
        };
        let order = format!("1/{:016}", self.next_insertion);
        self.next_insertion += 1;
        let handle = EntityHandle {
            slot: self.slots.len(),
            generation: 0,
        };
        self.by_id.insert(entity.id.clone(), handle);
        self.by_order.insert(order.clone(), entity.id.clone());
        self.slots.push(EntitySlot {
            generation: 0,
            entity: Some(entity),
            order,
            action_storage: None,
            goal_storage: None,
            intent_storage: None,
        });
        Ok(EntityInsertion {
            handle,
            next_insertion: previous,
            renumbered,
        })
    }
    pub(crate) fn undo_insertion(
        &mut self,
        before: EntityInsertion,
    ) -> Result<(String, bool), &'static str> {
        if before.handle.slot + 1 != self.slots.len() {
            return Err("Entity insertion order.");
        }
        let slot = self.slots.pop().ok_or("Entity membership.")?;
        let entity = slot.entity.ok_or("Entity membership.")?;
        self.by_id.remove(&entity.id);
        self.by_order.remove(&slot.order);
        let renumbered = before.renumbered.is_some();
        if let Some((order, labels)) = before.renumbered {
            self.by_order = order;
            for (slot, label) in labels {
                self.slots[slot].order = label;
            }
        }
        self.next_insertion = before.next_insertion;
        Ok((entity.id, renumbered))
    }
    pub fn install(
        entries: Vec<(String, Entity)>,
        next_insertion: u64,
    ) -> Result<Self, &'static str> {
        if next_insertion > MAX_SAFE_INTEGER {
            return Err("Invalid entity insertion counter.");
        }
        let mut value = Self {
            slots: Vec::with_capacity(entries.len()),
            by_id: BTreeMap::new(),
            by_order: BTreeMap::new(),
            next_insertion,
        };
        for (order, entity) in entries {
            if !crate::values::is_safe_record_id(&entity.id)
                || value.by_id.contains_key(&entity.id)
                || value.by_order.contains_key(&order)
            {
                return Err("Invalid entity membership or ordering.");
            }
            let handle = EntityHandle {
                slot: value.slots.len(),
                generation: 0,
            };
            value.by_id.insert(entity.id.clone(), handle);
            value.by_order.insert(order.clone(), entity.id.clone());
            value.slots.push(EntitySlot {
                generation: 0,
                entity: Some(entity),
                order,
                action_storage: None,
                goal_storage: None,
                intent_storage: None,
            });
        }
        Ok(value)
    }
    pub fn get(&self, id: &str) -> Option<&Entity> {
        self.resolve(*self.by_id.get(id)?)
    }
    pub fn get_mut(&mut self, id: &str) -> Option<&mut Entity> {
        let handle = *self.by_id.get(id)?;
        self.resolve_mut(handle)
    }
    pub fn handle(&self, id: &str) -> Option<EntityHandle> {
        self.by_id.get(id).copied()
    }
    pub fn resolve(&self, handle: EntityHandle) -> Option<&Entity> {
        let slot = self.slots.get(handle.slot)?;
        if slot.generation != handle.generation {
            return None;
        };
        slot.entity.as_ref()
    }
    pub fn resolve_mut(&mut self, handle: EntityHandle) -> Option<&mut Entity> {
        let slot = self.slots.get_mut(handle.slot)?;
        if slot.generation != handle.generation {
            return None;
        };
        slot.entity.as_mut()
    }
    pub fn ordered_ids(&self) -> impl Iterator<Item = &str> {
        self.by_order.values().map(String::as_str)
    }
    pub fn ordering(&self, id: &str) -> Option<&str> {
        let handle = self.handle(id)?;
        Some(self.slots.get(handle.slot)?.order.as_str())
    }
    pub fn len(&self) -> usize {
        self.by_id.len()
    }
    pub fn is_empty(&self) -> bool {
        self.by_id.is_empty()
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct WorkState {
    pub policy_version: String,
    pub invocations: IndexMap<String, WorkInvocation>,
}
