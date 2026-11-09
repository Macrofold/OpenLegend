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
    pub manual_work_body_plans: Vec<String>,
    pub natural_strike_body_plans: Vec<String>,
    pub hunting_purpose: String,
    pub availability: DiscoveryMessages,
    pub probes: Vec<ProbeOffer>,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DiscoveryMessages {
    pub invalid_follow: super::base_ordinary_actions::ActionMessage,
    pub unknown_strike: super::base_ordinary_actions::ActionMessage,
    pub unsupported_strike: super::base_ordinary_actions::ActionMessage,
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
#[serde(deny_unknown_fields)]
pub struct ProbeOffer {
    pub direction: String,
    pub dx: f64,
    pub dz: f64,
}

/// Read-only discovery/availability projection of the actual installed strike
/// definition. Its raw immutable row remains the sole authored definition.
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
