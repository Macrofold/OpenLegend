//! A committed shot's personal evidence. Intended aim stays distinct from
//! actual flight and contact. Reading this record cannot grant a new action.

use crate::host::retained_size::{HeapBytes, heap_record, heap_sum};
use crate::projectile::AimedLife;
use crate::status::{AttributeDefinition, PracticeProfile};
use crate::values::{
    DefinitionPin, deserialize_present_option, deserialize_safe_integer, is_safe_record_id,
};
use serde::{Deserialize, Serialize};

/// The live release supplies the exact equipped weapon, ammunition lot and
/// installed rule used by the committed shot. No browser input reaches this owner.
pub(crate) struct PracticeReleaseFacts<'a> {
    pub aim: &'a AimedLife,
    pub definition: &'a AttributeDefinition,
    pub tool: &'a DefinitionPin,
    pub ammunition: &'a str,
    pub ammunition_definition: &'a str,
    pub competence: u64,
    pub accuracy: f64,
}

#[derive(Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ActivityRelease {
    event_id: String,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    aim_target: Option<AimedLife>,
    tool: DefinitionPin,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    family: Option<DefinitionPin>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    competence: Option<f64>,
    accuracy: f64,
    ammunition_item_id: String,
    ammunition_definition_id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    quantity: u64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub(super) hit: Option<bool>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    damage: Option<f64>,
}

impl ActivityRelease {
    pub(super) fn practice_bytes(
        event: &str,
        facts: &PracticeReleaseFacts<'_>,
        profile: &PracticeProfile,
    ) -> Option<usize> {
        heap_sum([
            event.len(),
            facts.aim.heap_bytes()?,
            facts.tool.heap_bytes()?,
            profile.family.heap_bytes()?,
            facts.ammunition.len(),
            facts.ammunition_definition.len(),
        ])
    }

    pub(super) fn practice(
        event: &str,
        facts: &PracticeReleaseFacts<'_>,
        profile: &PracticeProfile,
    ) -> Self {
        Self {
            event_id: event.to_owned(),
            aim_target: Some(facts.aim.clone()),
            tool: facts.tool.clone(),
            family: Some(profile.family.clone()),
            competence: Some(facts.competence as f64),
            accuracy: facts.accuracy,
            ammunition_item_id: facts.ammunition.to_owned(),
            ammunition_definition_id: facts.ammunition_definition.to_owned(),
            quantity: 1,
            hit: None,
            damage: None,
        }
    }

    pub(crate) fn supports(&self, event: &str, family: &DefinitionPin) -> bool {
        self.event_id == event && self.family.as_ref() == Some(family)
    }

    pub(super) fn valid_for(&self, command: &crate::commands::NativeCommand) -> bool {
        matches!(
            command.kind(),
            "hunt" | "practice-shot" | "aim" | "shoot-once"
        ) && [
            &self.event_id,
            &self.ammunition_item_id,
            &self.ammunition_definition_id,
        ]
        .into_iter()
        .all(|id| is_safe_record_id(id))
            && self
                .aim_target
                .as_ref()
                .is_none_or(|target| is_safe_record_id(&target.id))
            && self.tool.is_valid()
            && self.family.as_ref().is_none_or(DefinitionPin::is_valid)
            && self
                .competence
                .is_none_or(|rank| rank == 0.0 || rank == 1.0)
            && (0.0..=1.0).contains(&self.accuracy)
            && self.quantity == 1
            && self.damage.is_none_or(|damage| {
                damage.is_finite()
                    && damage >= 0.0
                    && (damage == 0.0
                        || (self.hit != Some(false) && command.kind() != "practice-shot"))
            })
    }
}

heap_record!(ActivityRelease {
    event_id,
    aim_target,
    tool,
    family,
    ammunition_item_id,
    ammunition_definition_id
});
