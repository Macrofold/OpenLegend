//! The selected world's outward vocabulary, supplied from its one authored
//! descriptor. Physical state selects a marker; no private plan is projected.
use crate::install::DefinitionIdentity;
use crate::state::Entity;
use crate::values::deserialize_safe_integer;
use serde::{Deserialize, Serialize};

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ConditionNoticeRules {
    pub event_type: String,
    pub recovery_importance: f64,
    pub importance: f64,
    pub critical_urgency: f64,
    pub urgency: f64,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct BodyNoticeRules {
    pub unavailable_code: String,
    pub unavailable_text: String,
    pub incapacitated_event: String,
    pub death_event: String,
    pub player_death_event: String,
    pub rotting_event: String,
    pub removed_event: String,
    pub health_event: String,
    pub damaged_verb: String,
    pub recovered_verb: String,
    pub damage_name: String,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct OutwardActivityRules {
    pub actions: Vec<String>,
    pub preparing_phase: String,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct SightingNotice {
    pub importance: f64,
    pub urgency: f64,
    pub semantic_trigger: bool,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct SightingRules {
    pub event_type: String,
    pub wording: SightingWording,
    pub routine: SightingNotice,
    pub changed_being: SightingNotice,
    pub episode_grace_seconds: f64,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct SightingWording {
    pub departed: String,
    pub detail: String,
    pub routine: String,
    pub detail_prefix: String,
    pub ending: String,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct OutwardMarkers {
    pub incapacitated: String,
    pub alive: String,
    pub dead: String,
    pub burning: String,
    pub unlit: String,
    pub material_present: String,
    pub depleted: String,
    pub harvested: String,
    pub unharvested: String,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ObservationRules {
    pub id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub version: u64,
    pub pile_kind: String,
    pub outward_activity: OutwardActivityRules,
    pub sighting: SightingRules,
    pub outward: OutwardMarkers,
    pub conditions: ConditionNoticeRules,
    pub body: BodyNoticeRules,
}
impl DefinitionIdentity for ObservationRules {
    fn definition_id(&self) -> &str {
        &self.id
    }
    fn definition_version(&self) -> u64 {
        self.version
    }
}
impl ObservationRules {
    pub(crate) fn outward_states<'a>(&'a self, entity: &Entity) -> [&'a str; 4] {
        let words = &self.outward;
        [
            entity.actor.as_ref().map_or("", |actor| {
                if !actor.alive {
                    &words.dead
                } else if actor.incapacitated {
                    &words.incapacitated
                } else {
                    &words.alive
                }
            }),
            entity.heat.as_ref().map_or("", |heat| {
                if heat.lit {
                    &words.burning
                } else {
                    &words.unlit
                }
            }),
            entity.resource.as_ref().map_or("", |resource| {
                if resource.quantity > 0 {
                    &words.material_present
                } else {
                    &words.depleted
                }
            }),
            entity.remains.as_ref().map_or("", |remains| {
                if remains.harvested {
                    &words.harvested
                } else {
                    &words.unharvested
                }
            }),
        ]
    }
}

impl ObservationRules {
    /// The selected Move/Status/Say closure has no working strike. A genuine
    /// strike needs its installed strike, item and permitted sight owners;
    /// installation/admission refuses that active family before effects.
    pub(crate) fn observed_action_animation(
        &self,
        entity: &Entity,
    ) -> Result<
        Option<crate::worlds::base_observed::ObservedActionAnimation>,
        crate::status::ProjectionError,
    > {
        if entity
            .actor
            .as_ref()
            .and_then(|actor| actor.action.as_ref())
            .is_some_and(|action| action.kind == "strike" && action.stage == "working")
        {
            return Err(crate::status::ProjectionError::UnsupportedFamily);
        }
        Ok(None)
    }
}

impl ObservationRules {
    pub(crate) fn outward_body_activity(
        &self,
        entity: &Entity,
    ) -> Result<Option<String>, crate::received::ReceivedError> {
        let Some(action) = entity
            .actor
            .as_ref()
            .and_then(|actor| actor.action.as_ref())
        else {
            return Ok(None);
        };
        if !self.outward_activity.actions.contains(&action.kind) {
            return Ok(None);
        }
        if action.strike_phase.is_some() {
            return Err(crate::received::ReceivedError(
                "Current outward action phase is unsupported.",
            ));
        }
        crate::encoding::json_record(&[
            action.id.as_str(),
            action.kind.as_str(),
            action.stage.as_str(),
            self.outward_activity.preparing_phase.as_str(),
        ])
        .map(Some)
        .map_err(|_| crate::received::ReceivedError("Current outward action cannot be encoded."))
    }
    pub(crate) fn changed_outward_notice(
        &self,
        before: &crate::reception::ObservedBody,
        after: &crate::reception::ObservedBody,
    ) -> Option<crate::text::JsText> {
        if before.kind == after.kind
            && before.appearance == after.appearance
            && before.activity == after.activity
            && before.outward == after.outward
            && (!after.outward[0].is_empty()
                || before.label.as_ref().map(|name| &name.name)
                    == after.label.as_ref().map(|name| &name.name))
        {
            return None;
        }
        let label = after.outward[0]
            .is_empty()
            .then(|| {
                after
                    .label
                    .as_ref()
                    .map(|name| crate::text::TextRef::Text(&name.name))
            })
            .flatten();
        let mut text = crate::text::JsText::default();
        for piece in label
            .into_iter()
            .chain([
                crate::text::TextRef::Unicode(&after.kind),
                crate::text::TextRef::Text(&after.appearance),
            ])
            .chain(
                after
                    .outward
                    .iter()
                    .map(|value| crate::text::TextRef::Unicode(value)),
            )
        {
            if piece.is_empty() {
                continue;
            }
            if !text.is_empty() {
                text.push_str(", ");
            }
            piece.append_to(&mut text);
        }
        Some(text)
    }
}
