//! Selected ordinary-action vocabulary. These are the exact shared Source
//! descriptor fields, not engine defaults or a registry of action handlers.

use crate::commands::Outcome;
use crate::install::DefinitionIdentity;
use crate::values::deserialize_safe_integer;
use serde::{Deserialize, Serialize};

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct ActionMessage {
    pub code: String,
    pub message: String,
}
impl ActionMessage {
    pub(crate) fn outcome(&self, ok: bool) -> Outcome {
        Outcome {
            spent: None,
            outputs: None,
            ok,
            code: self.code.clone(),
            message: self.message.clone(),
            recipe_id: None,
            item_id: None,
            entity_id: None,
            goal_id: None,
            plan_id: None,
            action_id: None,
        }
    }
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct OrdinaryActionRules {
    pub id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub version: u64,
    pub invalid_command: ActionMessage,
    pub unknown_actor: ActionMessage,
    pub inactive: ActionMessage,
    pub actions_restricted: ActionMessage,
    pub speech_restricted: ActionMessage,
    pub movement_restricted: ActionMessage,
    pub paused: ActionMessage,
    pub not_alive: ActionMessage,
    pub unsupported_airborne: ActionMessage,
    pub unsupported_controller: ActionMessage,
    pub experience_capacity: ActionMessage,
    pub idempotency_conflict: ActionMessage,
    pub unsupported_navigation: ActionMessage,
    pub blocked: ActionMessage,
    pub unreachable: ActionMessage,
    pub no_route: ActionMessage,
    pub budget_exceeded: ActionMessage,
    pub stale_action: ActionMessage,
    pub cannot_interrupt: ActionMessage,
    pub cannot_cancel: ActionMessage,
    pub stale_native_movement: ActionMessage,
    pub accepted: ActionMessage,
    pub cancelled_by_choice: ActionMessage,
    pub cancelled_replaced: ActionMessage,
    pub stopped: ActionMessage,
    pub invalid_effect: ActionMessage,
    pub invalid_facing: ActionMessage,
    pub invalid_resting_place: ActionMessage,
    pub out_of_reach: ActionMessage,
    pub not_active: ActionMessage,
    pub not_applicable: ActionMessage,
    pub movement_departure: String,
    pub action_started_event: String,
    pub status_outcome_code: String,
    pub activated: String,
    pub deactivated: String,
    pub approach_name: String,
    pub approach_facts: Vec<String>,
    pub before_attempt_facts: indexmap::IndexMap<String, String>,
    pub status_interruption_suffix: String,
    pub movement_arrival: String,
    pub movement_completed: ActionMessage,
    pub movement_missing_destination: String,
    pub movement_destination_not_reached: String,
    pub movement_changing_route: String,
    pub movement_blocked_route: String,
    pub action_stopped_prefix: String,
    pub action_stopped_event: String,
    pub movement_arrival_event: String,
}
impl DefinitionIdentity for OrdinaryActionRules {
    fn definition_id(&self) -> &str {
        &self.id
    }
    fn definition_version(&self) -> u64 {
        self.version
    }
}
impl OrdinaryActionRules {
    pub(crate) fn maximum_message_bytes(&self) -> Option<usize> {
        [
            &self.invalid_command,
            &self.unknown_actor,
            &self.inactive,
            &self.actions_restricted,
            &self.speech_restricted,
            &self.movement_restricted,
            &self.paused,
            &self.not_alive,
            &self.unsupported_airborne,
            &self.unsupported_controller,
            &self.experience_capacity,
            &self.idempotency_conflict,
            &self.unsupported_navigation,
            &self.blocked,
            &self.unreachable,
            &self.no_route,
            &self.budget_exceeded,
            &self.stale_action,
            &self.cannot_interrupt,
            &self.cannot_cancel,
            &self.stale_native_movement,
            &self.accepted,
            &self.cancelled_by_choice,
            &self.cancelled_replaced,
            &self.stopped,
            &self.invalid_effect,
            &self.invalid_facing,
            &self.invalid_resting_place,
            &self.out_of_reach,
            &self.not_active,
            &self.not_applicable,
            &self.movement_completed,
        ]
        .into_iter()
        .try_fold(0, |maximum, message| {
            message
                .code
                .len()
                .checked_add(message.message.len())
                .map(|bytes| maximum.max(bytes))
        })
    }
    fn positioned_heap_bound(template: &str, point: crate::state::Point) -> Option<usize> {
        let x = crate::encoding::json_record_len(&point.x).ok()?;
        let z = crate::encoding::json_record_len(&point.z).ok()?;
        template
            .len()
            .checked_mul(2)?
            .checked_add(x.checked_add(z)?.checked_mul(3)?)
    }
    fn positioned(template: &str, point: crate::state::Point) -> Result<String, serde_json::Error> {
        let x = crate::encoding::json_record(&point.x)?;
        let z = crate::encoding::json_record(&point.z)?;
        Ok(template.replacen("{x}", &x, 1).replacen("{z}", &z, 1))
    }
    pub(crate) fn departure_heap_bound(&self, point: crate::state::Point) -> Option<usize> {
        Self::positioned_heap_bound(&self.movement_departure, point)
    }
    pub(crate) fn departure(
        &self,
        point: crate::state::Point,
    ) -> Result<String, serde_json::Error> {
        Self::positioned(&self.movement_departure, point)
    }
    pub(crate) fn arrival_heap_bound(&self, point: crate::state::Point) -> Option<usize> {
        Self::positioned_heap_bound(&self.movement_arrival, point)
    }
    pub(crate) fn arrival(&self, point: crate::state::Point) -> Result<String, serde_json::Error> {
        Self::positioned(&self.movement_arrival, point)
    }
    pub(crate) fn status_message(&self, label: &str, active: bool) -> String {
        format!(
            "{label}: {}.",
            if active {
                &self.activated
            } else {
                &self.deactivated
            }
        )
    }
}
