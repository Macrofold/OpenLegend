//! The existing physical plan journal owns the complete before-image charge.
use super::{ActivityExecution, ActivityFrame, ActivityQuantity, RequestedActivity};

fn request(value: &RequestedActivity) -> RequestedActivity {
    RequestedActivity {
        name: value.name.clone(),
        root: value.root.clone_within_heap_bound(),
        chosen_purpose: value.chosen_purpose.clone(),
        quantity: value.quantity.as_ref().map(|quantity| ActivityQuantity {
            command: quantity.command.clone(),
            requested: quantity.requested,
            unit_label: quantity.unit_label.clone(),
        }),
    }
}

impl ActivityExecution {
    /// `PhysicalMutation::{plan_mut,suspended_plan_mut}` reserve the complete
    /// plan heap before copying. Keep every optional field and raw AST child;
    /// an inverse must restore even an execution shape not yet executable.
    pub(crate) fn clone_for_undo(&self) -> Self {
        Self {
            cooperation: self.cooperation.clone(),
            combat_help_id: self.combat_help_id.clone(),
            human_initiated: self.human_initiated,
            method_id: self.method_id.clone(),
            request: self.request.as_ref().map(request),
            completed_units: self.completed_units,
            bindings: self.bindings.clone_within_heap_bound(),
            target_episodes: self.target_episodes.clone_within_heap_bound(),
            pending: self
                .pending
                .iter()
                .map(|frame| ActivityFrame {
                    node: frame.node.clone_within_heap_bound(),
                    iteration: frame.iteration,
                    started_at: frame.started_at,
                })
                .collect(),
            outputs: self.outputs.clone_within_heap_bound(),
            serial: self.serial,
            processed: self.processed,
            archived_steps: self.archived_steps,
            active_key: self.active_key.clone(),
            cancelled_keys: self.cancelled_keys.clone(),
            reason: self.reason.clone(),
            control: self
                .control
                .as_ref()
                .map(|value| value.clone_within_heap_bound()),
            attempts: self.attempts,
            last_attempt_id: self.last_attempt_id.clone(),
            spent: self.spent,
            interrupted: self.interrupted,
            terminal: self.terminal,
        }
    }
}
