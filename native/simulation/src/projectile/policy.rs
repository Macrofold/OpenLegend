//! Installed finite-shot rules shared by weapon discovery and release.
//! Numeric tuning and wording are supplied by the world's current manifest.
use crate::host::retained_size::heap_record;
use crate::state::Entity;
use crate::values::{DefinitionPin, deserialize_present_option, deserialize_safe_integer};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "kebab-case")]
enum Implementation {
    FiniteShot,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "kebab-case")]
enum TargetRule {
    LivingActor,
    LivingAnimal,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "kebab-case")]
enum ConditionAdjustment {
    None,
    DangerOrReturn,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct LocalAvoidance {
    pub body_profiles: Vec<String>,
    pub height_factor: f64,
    pub hold_seconds: f64,
    pub cooldown_seconds: f64,
    pub context_factor: f64,
    pub contracted_text: String,
    pub restored_text: String,
    pub cleared_text: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct RangedPolicy {
    id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    version: u64,
    #[serde(rename = "implementation")]
    _implementation: Implementation,
    target_rule: TargetRule,
    pub point_fire: bool,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    pub local_avoidance: Option<LocalAvoidance>,
    condition_adjustment: ConditionAdjustment,
    condition_accuracy_factor: f64,
    pub windup_seconds: f64,
    approach_buffer: f64,
    minimum_approach_range: f64,
    pub invalid_target_text: String,
    pub unavailable_text: String,
    pub target_label: String,
    pub action_label: String,
    pub activity_label: String,
    pub description: String,
    pub scope: String,
    pub accuracy_explanation: String,
}

impl RangedPolicy {
    pub(crate) fn valid(&self, pin: &DefinitionPin) -> bool {
        let text =
            |value: &str, max| !value.trim().is_empty() && value.encode_utf16().count() <= max;
        pin.is_valid()
            && self.id == pin.id
            && self.version == pin.version
            && (0.0..=1.0).contains(&self.condition_accuracy_factor)
            && self.approach_buffer.is_finite()
            && self.approach_buffer >= 0.0
            && [self.windup_seconds, self.minimum_approach_range]
                .into_iter()
                .all(|value| value.is_finite() && value > 0.0)
            && [
                &self.invalid_target_text,
                &self.unavailable_text,
                &self.target_label,
                &self.action_label,
                &self.activity_label,
                &self.description,
                &self.scope,
                &self.accuracy_explanation,
            ]
            .into_iter()
            .all(|value| text(value, 1600))
            && self.local_avoidance.as_ref().is_none_or(|avoidance| {
                !avoidance.body_profiles.is_empty()
                    && avoidance.body_profiles.iter().all(|id| !id.is_empty())
                    && (0.0..=1.0).contains(&avoidance.context_factor)
                    && avoidance.height_factor > 0.0
                    && avoidance.height_factor < 1.0
                    && [avoidance.hold_seconds, avoidance.cooldown_seconds]
                        .into_iter()
                        .all(|value| value.is_finite() && value > 0.0)
                    && [
                        &avoidance.contracted_text,
                        &avoidance.restored_text,
                        &avoidance.cleared_text,
                    ]
                    .into_iter()
                    .all(|value| !value.is_empty() && value.encode_utf16().count() <= 400)
            })
    }

    pub(crate) fn approach_range(&self, range: f64) -> f64 {
        range.min(
            self.minimum_approach_range
                .max(range - self.approach_buffer),
        )
    }

    pub(crate) fn permits(&self, target: &Entity) -> bool {
        target.actively_participates()
            && target.actor.as_ref().is_some_and(|actor| actor.alive)
            && (self.target_rule == TargetRule::LivingActor || target.animal.is_some())
    }
}

heap_record!(RangedPolicy {
    id,
    local_avoidance,
    invalid_target_text,
    unavailable_text,
    target_label,
    action_label,
    activity_label,
    description,
    scope,
    accuracy_explanation
});
heap_record!(LocalAvoidance {
    body_profiles,
    contracted_text,
    restored_text,
    cleared_text
});
