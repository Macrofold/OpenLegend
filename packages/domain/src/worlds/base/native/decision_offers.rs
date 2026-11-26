//! The selected world's finite discovery parameters. The generic preparation
//! cursor asks actual command/geometry owners; these data grant no effects.
use crate::host::retained_size::{HeapBytes, heap_record};
use serde::{Deserialize, Serialize};

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DecisionOfferRules {
    pub inspection_command: String,
    pub follow_command: String,
    pub strike_command: String,
    pub interaction_radius: f64,
    pub follow: FollowOfferRules,
    pub follow_outcomes: FollowOutcomes,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    pub follow_suggestions: u64,
    pub manual_work_body_plans: Vec<String>,
    pub natural_strike_body_plans: Vec<String>,
    pub hunting_purpose: String,
    pub hunting: HuntingOfferRules,
    pub slot_requirements: SlotRequirements,
    pub typed_nouns: TypedNouns,
    pub activity_choices: Vec<ActivityChoiceHost>,
    pub installed_requests: Vec<InstalledRequest>,
    pub availability: DiscoveryMessages,
    pub probes: Vec<ProbeOffer>,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TypedNouns {
    pub heat_sources: Vec<String>,
    pub beings: Vec<String>,
}
/// These are the same authored family facts used by installed action meanings.
/// They describe an already offered command; they never install a family.
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SlotRequirements {
    pub tool_fields: indexmap::IndexMap<String, Vec<String>>,
    pub unit_per_command: Vec<String>,
}
/// The reviewed world declares its exact request family, trusted host and fields.
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all="camelCase",deny_unknown_fields)]
pub struct InstalledRequest {
    pub host: crate::values::DefinitionPin,
    pub id: String,
    pub commands: Vec<String>,
    pub fields: indexmap::IndexMap<String,RequestField>,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all="camelCase",deny_unknown_fields)]
pub struct RequestField {
    #[serde(rename="type")] pub kind: FieldKind,
    pub label: String,
    pub required: bool,
    pub minimum: Option<f64>, pub maximum: Option<f64>,
    pub minimum_duration: Option<f64>, pub maximum_duration: Option<f64>,
    pub definition_kind: Option<String>,
    pub choices: Option<Vec<NamedChoice>>,
    pub mode_labels: Option<indexmap::IndexMap<String,String>>,
    pub dependencies: Option<Vec<String>>,
    pub discovery: Option<Discovery>,
}
#[derive(Debug,Clone,Copy,PartialEq,Serialize,Deserialize)]
#[serde(rename_all="lowercase")]
pub enum FieldKind {Entity, Definition, Integer, Time, Mode, Choice}
#[derive(Debug,PartialEq,Serialize,Deserialize)]
#[serde(deny_unknown_fields)]
pub struct NamedChoice {pub value:String,pub label:String}
#[derive(Debug,PartialEq,Serialize,Deserialize)]
#[serde(rename_all="camelCase",deny_unknown_fields)]
pub struct Discovery {pub source:String,pub source_field:Option<String>}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ActivityChoiceHost {
    pub pin: crate::values::DefinitionPin,
    pub kind: ActivityChoiceKind,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub own_supply_request: Option<String>,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub travel_request: Option<String>,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub combat_request: Option<String>,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub hands: Option<ActivityHandsChoice>,
    pub maximum_visible: usize,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub visible_warning: Option<crate::text::JsText>,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub own_label: Option<crate::text::JsText>,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ActivityChoiceKind {
    Installed,
    Camp,
    Outings,
    Work,
    Reservoir,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ActivityHandsChoice {
    pub request_id: String,
    pub label: crate::text::JsText,
}

/// The base activity formatter receives these facts about rows already
/// selected by the reader. Wording remains with activity-choice-format.ts.
#[derive(Clone, Serialize)]
#[serde(tag = "kind", rename_all = "kebab-case")]
pub enum ActivityChoiceLabel {
    CampOwn,
    Hands { label: crate::text::JsText },
    Person { name: crate::state::Named },
}

pub(crate) struct ActivityChoicePolicy;

impl ActivityChoicePolicy {
    pub(crate) fn own_supply_label(&self) -> ActivityChoiceLabel {
        ActivityChoiceLabel::CampOwn
    }

    pub(crate) fn manual_instrument_label(
        &self,
        label: &crate::text::JsText,
    ) -> ActivityChoiceLabel {
        ActivityChoiceLabel::Hands {
            label: label.clone(),
        }
    }

    pub(crate) fn person_label(&self, name: &crate::state::Named) -> ActivityChoiceLabel {
        ActivityChoiceLabel::Person { name: name.clone() }
    }

    pub(crate) fn recipient_eligible(
        &self,
        installed: &crate::simulation::InstalledWorld,
        other: &crate::state::Entity,
    ) -> Result<bool, crate::execution::ExecutionError> {
        activity_recipient_eligible(installed, other)
    }

    pub(crate) fn opponent_permitted(
        &self,
        installed: &crate::simulation::InstalledWorld,
        observer: &crate::state::Entity,
        other: &crate::state::Entity,
    ) -> bool {
        activity_opponent_permitted(installed, observer, other)
    }
}

pub(crate) fn activity_recipient_eligible(
    installed: &crate::simulation::InstalledWorld,
    other: &crate::state::Entity,
) -> Result<bool, crate::execution::ExecutionError> {
    let Some(body) = other.actor.as_ref() else {
        return Ok(false);
    };
    Ok(body.alive
        && other.has_memory()
        && !body.incapacitated
        && other.actively_participates()
        && !body
            .participation
            .as_ref()
            .is_some_and(|state| state.phase == "exiting")
        && !installed
            .capabilities
            .capability_blocked(Some(other), "actions")?
        && !installed
            .capabilities
            .capability_blocked(Some(other), "locomotion")?)
}
pub(crate) fn activity_opponent_permitted(
    installed: &crate::simulation::InstalledWorld,
    observer: &crate::state::Entity,
    other: &crate::state::Entity,
) -> bool {
    let Some(source) = observer
        .actor
        .as_ref()
        .filter(|actor| actor.alive && !actor.incapacitated && observer.actively_participates())
    else {
        return false;
    };
    let Some(target) = other
        .actor
        .as_ref()
        .filter(|actor| actor.alive && other.actively_participates() && other.id != observer.id)
    else {
        return false;
    };
    installed
        .body_policy
        .as_ref()
        .and_then(|policy| policy.value().combat.as_ref())
        .is_some_and(|policy| {
            let targets = match source.controller.as_str() {
                "player" => Some(&policy.targets.player),
                "npc" => Some(&policy.targets.npc),
                "native" => Some(&policy.targets.native),
                _ => None,
            };
            targets.is_some_and(|targets| targets.contains(&target.controller))
                && (source.controller != "player"
                    || policy.human_issued_targets.contains(&target.controller))
        })
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct HuntingOfferRules {
    pub label: String,
    pub purpose: String,
    pub scope: String,
    pub known_prey: Vec<String>,
    pub methods: HuntingMethods,
    pub unarmed_tool: String,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct HuntingMethods {
    pub melee: bool,
    pub ranged_weapon: bool,
    pub unarmed: bool,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DiscoveryMessages {
    pub invalid_follow: super::base_ordinary_actions::ActionMessage,
    pub unknown_strike: super::base_ordinary_actions::ActionMessage,
    pub unsupported_strike: super::base_ordinary_actions::ActionMessage,
    pub manual_work: super::base_ordinary_actions::ActionMessage,
    pub combat_recovery: super::base_ordinary_actions::ActionMessage,
    pub strike_range: super::base_ordinary_actions::ActionMessage,
    pub unperceived: super::base_ordinary_actions::ActionMessage,
    pub attack_source: super::base_ordinary_actions::ActionMessage,
    pub attack_target: super::base_ordinary_actions::ActionMessage,
    pub attack_permission: super::base_ordinary_actions::ActionMessage,
    pub follow_unavailable_code: String,
    pub follow_unperceived: String,
    pub follow_restricted: String,
    pub follow_unsupported: String,
    pub follow_dead: String,
    pub follow_changed: String,
    pub follow_budget: String,
    pub follow_no_route: String,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct FollowOfferRules {
    pub default_distance: f64,
    pub minimum_distance: f64,
    pub maximum_distance: f64,
    pub resume_margin: f64,
    pub repath_seconds: f64,
    pub target_displacement: f64,
    pub heading_evidence: f64,
    pub slot_tolerance: f64,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct FollowOutcomes {
    pub started: String,
    pub expired: super::base_ordinary_actions::ActionMessage,
    pub finite_required: super::base_ordinary_actions::ActionMessage,
    pub limit: super::base_ordinary_actions::ActionMessage,
    pub arrived: super::base_ordinary_actions::ActionMessage,
    pub restricted: String,
    pub blocked: String,
    pub last_seen_reached: String,
    pub last_seen_no_route: String,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ProbeOffer {
    pub direction: String,
    pub dx: f64,
    pub dz: f64,
}

/// Typed installed strike data shared by availability and native contact.
/// Its raw immutable row remains the sole authored definition.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeStrikeRead {
    pub id: String,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    pub version: u64,
    pub label: crate::text::JsText,
    pub past_tense: crate::text::JsText,
    pub range: f64,
    pub auto_move_to_range: bool,
    pub work_seconds: f64,
    pub damage: f64,
    pub animation: String,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub required_body_plan: Option<String>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub weapon_item_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub approach_range: Option<f64>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub recovery_seconds: Option<f64>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub accuracy: Option<f64>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub preparation_motion: Option<StrikePreparationRead>,
}
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StrikePreparationRead {
    pub kind: String,
    pub start_range: f64,
    pub stand_off_range: f64,
    pub locomotion_profile_id: String,
}
impl NativeStrikeRead {
    pub(crate) fn valid(&self, key: &str) -> bool {
        self.id == key
            && self.version > 0
            && self.version <= crate::identity::MAX_SAFE_INTEGER
            && [self.range, self.work_seconds]
                .into_iter()
                .all(|n| n.is_finite() && n > 0.)
            && self.damage.is_finite()
            && self.damage >= 0.
            && self
                .approach_range
                .is_none_or(|n| n.is_finite() && n > 0. && n <= self.range)
            && self
                .recovery_seconds
                .is_none_or(|n| n.is_finite() && n > 0.)
            && self
                .accuracy
                .is_none_or(|n| n.is_finite() && (0. ..=1.).contains(&n))
            && self
                .required_body_plan
                .as_deref()
                .is_none_or(|plan| matches!(plan, "biped" | "quadruped" | "avian"))
            && matches!(self.animation.as_str(), "punch" | "melee")
            && [&self.label, &self.past_tense]
                .into_iter()
                .all(|text| (1..=256).contains(&text.units_len()))
            && self.preparation_motion.as_ref().is_none_or(|motion| {
                motion.kind == "pursue-observed-target"
                    && self.recovery_seconds.is_some()
                    && [motion.start_range, motion.stand_off_range]
                        .into_iter()
                        .all(|n| n.is_finite() && n > 0.)
                    && motion.start_range >= self.range
                    && motion.stand_off_range < self.range
            })
    }
}
heap_record!(NativeStrikeRead {
    id,
    label,
    past_tense,
    animation,
    required_body_plan,
    weapon_item_id,
    preparation_motion
});
heap_record!(StrikePreparationRead {
    kind,
    locomotion_profile_id
});

pub(crate) fn validate_strike_reads(
    strikes: &indexmap::IndexMap<String, NativeStrikeRead>,
    profiles: &indexmap::IndexMap<
        String,
        crate::install::VerifiedDefinition<crate::native_response::NativeResponseProfile>,
    >,
    entities: &crate::state::EntityStore,
    budget: &crate::host::ByteBudget,
) -> Result<(), crate::install::InstallError> {
    use crate::install::InstallError;
    for strike in strikes.values() {
        if let Some(motion) = &strike.preparation_motion {
            let mut speeds = profiles
                .values()
                .filter_map(|profile| {
                    profile
                        .value()
                        .locomotion
                        .get(&motion.locomotion_profile_id)
                })
                .map(|rates| rates.travel);
            let first = speeds.next().ok_or(InstallError::CurrentFormat)?;
            if speeds.any(|speed| speed != first) {
                return Err(InstallError::CurrentFormat);
            }
        }
    }
    for id in entities.ordered_ids() {
        if let Some(ids) = entities
            .get(id)
            .and_then(|entity| entity.actor.as_ref())
            .and_then(|actor| actor.natural_strike_ids.as_ref())
        {
            let _guard = budget
                .reserve(
                    crate::host::retained_size::map_storage::<&str, ()>(ids.len())
                        .ok_or(InstallError::Capacity)?,
                )
                .map_err(|_| InstallError::Capacity)?;
            let mut seen = std::collections::HashSet::with_capacity(ids.len());
            if ids
                .iter()
                .any(|id| !seen.insert(id.as_str()) || !strikes.contains_key(id))
            {
                return Err(InstallError::CurrentFormat);
            }
        }
    }
    Ok(())
}

#[path = "policy_residency/decision_offers.rs"]
mod policy_residency;
