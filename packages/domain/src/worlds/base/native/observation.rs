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
    /// Physical animation uses the present body's public heading. It exposes
    /// the active phase, progress and currently held weapon name without an
    /// item identity, a target or its position. The caller owns the returned
    /// reservation with the animation until it encodes or retains it.
    pub(crate) fn observed_action_animation(
        &self,
        entity: &Entity,
        state: &crate::simulation::SimulationState,
        budget: &crate::host::ByteBudget,
    ) -> Result<
        Option<(crate::worlds::base_observed::ObservedActionAnimation, crate::host::ByteReservation)>,
        crate::status::ProjectionError,
    > {
        use crate::contact::{ContactKind, ContactRead, StrikePhase};
        use crate::status::ProjectionError;
        use crate::worlds::base_observed::{
            AnimationKind, AnimationPhase, HorizontalDirection, ObservedActionAnimation,
        };
        let Some(action) = entity
            .actor
            .as_ref()
            .and_then(|actor| actor.action.as_ref())
            .filter(|action| action.kind == "strike" && action.stage == "working")
        else {
            return Ok(None);
        };
        let (kind, tool) = if action.weapon_item_id.is_some() {
            let Some(ContactKind::Equipped { definition, .. }) = ContactRead::action(
                &state.installed, &state.physical.entities, entity, action,
            ).map(|read| read.kind) else {
                // While interruption settles, an unavailable weapon cannot
                // be disclosed from a stale action alone.
                return Ok(None);
            };
            (AnimationKind::Melee, Some(&definition.named.name))
        } else {
            let definition = action.definition_id.as_ref()
                .and_then(|id| state.installed.retained.native_strike_read.get(id))
                .filter(|definition| Some(definition.version) == action.definition_version)
                .ok_or(ProjectionError::UnsupportedFamily)?;
            let kind = match definition.animation.as_str() {
                "punch" => AnimationKind::Punch,
                "melee" => AnimationKind::Melee,
                _ => return Err(ProjectionError::UnsupportedFamily),
            };
            (kind, None)
        };
        let phase = match action.strike_phase {
            Some(StrikePhase::Windup) => AnimationPhase::Windup,
            Some(StrikePhase::Recovery) => AnimationPhase::Recovery,
            None => return Err(ProjectionError::UnsupportedFamily),
        };
        let bytes = action.id.len().checked_add(tool.map_or(0, crate::text::JsText::storage_bytes))
            .ok_or(ProjectionError::Capacity)?;
        let storage = budget.reserve(bytes).map_err(|_| ProjectionError::Capacity)?;
        Ok(Some((ObservedActionAnimation {
            id: action.id.clone(),
            kind,
            phase,
            tool: tool.cloned(),
            progress: (1.0 - action.remaining_seconds / action.total_seconds).clamp(0.0, 1.0),
            direction: HorizontalDirection {
                x: entity.spatial.heading.sin(),
                z: entity.spatial.heading.cos(),
            },
        }, storage)))
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
        let phase = match action.strike_phase {
            Some(crate::contact::StrikePhase::Windup) => "windup",
            Some(crate::contact::StrikePhase::Recovery) => "recovery",
            None => self.outward_activity.preparing_phase.as_str(),
        };
        crate::encoding::json_record(&[
            action.id.as_str(),
            action.kind.as_str(),
            action.stage.as_str(),
            phase,
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

#[path = "policy_residency/observation.rs"]
mod policy_residency;
