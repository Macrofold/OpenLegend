//! The same selected ordinary-plan words consumed by Source agency. Generic
//! frontier transitions stay in the engine; authored reports stay in this law.
use super::ActionMessage;
use crate::text::{JsText, TextRef};
use serde::{Deserialize, Serialize};
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct PlanRules {
    pub invalid_identity: ActionMessage,
    pub stale_plan: ActionMessage,
    pub invalid_goal: ActionMessage,
    pub step_limit: ActionMessage,
    pub unsupported_capability: ActionMessage,
    pub invalid_command: ActionMessage,
    pub chosen_activity_active: ActionMessage,
    pub invalid_outputs: ActionMessage,
    pub plan_blocked: ActionMessage,
    pub frontier_full: ActionMessage,
    pub queued: ActionMessage,
    pub actor_unavailable: ActionMessage,
    pub not_chosen_plan: ActionMessage,
    pub already_paused: ActionMessage,
    pub pause_too_often: ActionMessage,
    pub pause_state: String,
    pub pause_attack: String,
    pub pause_materials: String,
    pub paused_step: ActionMessage,
    pub paused_restart: ActionMessage,
    pub inactive_goal_reason: String,
    pub changed_target_reason: String,
    pub missing_object_reason: String,
    pub stale_paused: ActionMessage,
    pub resume_refused_prefix: String,
    pub returned_from_intervention: ActionMessage,
    pub paused_work_name: String,
    pub resume_blocked: String,
    pub resumed: String,
    pub stopped_summary: String,
    pub discarded_paused: ActionMessage,
    pub cancelled_step: ActionMessage,
    pub interrupted_step: ActionMessage,
    pub stale_encounter: ActionMessage,
    pub missing_output: ActionMessage,
    pub fallback_result_summary: String,
    pub completed_result: String,
    pub refused_result: String,
    pub result_importance: f64,
    pub control_importance: f64,
}
impl PlanRules {
    /// One pass substitutes only authored marker locations; words inserted by
    /// a person are never interpreted as another marker.
    pub(crate) fn text(&self, template: &str, fields: &[(&str, TextRef<'_>)]) -> JsText {
        let mut result = JsText::from("");
        let mut rest = template;
        while let Some(start) = rest.find('{') {
            result.push_str(&rest[..start]);
            rest = &rest[start..];
            let Some(end) = rest.find('}') else {
                break;
            };
            if let Some((_, value)) = fields.iter().find(|(key, _)| *key == &rest[1..end]) {
                value.append_to(&mut result);
            } else {
                result.push_str(&rest[..=end]);
            }
            rest = &rest[end + 1..];
        }
        result.push_str(rest);
        result
    }
    pub(crate) fn text_bound(
        &self,
        template: &str,
        fields: &[(&str, TextRef<'_>)],
    ) -> Option<usize> {
        let occurrences = template.bytes().filter(|b| *b == b'{').count();
        let fields = fields.iter().try_fold(0usize, |sum, (_, value)| {
            sum.checked_add(value.storage_bytes())
        })?;
        // UTF16 promotion and its exact escaped JSON coexist while appending.
        template
            .len()
            .checked_add(occurrences.checked_mul(fields)?)?
            .checked_mul(20)?
            .checked_add(std::mem::size_of::<JsText>())
    }
}
