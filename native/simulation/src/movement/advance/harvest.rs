use super::*;
use crate::host::retained_size::HeapBytes;
use crate::{commands::ActivityOutput, worlds::base_harvest as harvest};

impl MoveAdvanceCursor {
    pub(super) fn advance_harvest(
        &mut self,
        core: &mut CoreMutation<'_>,
        visible: bool,
    ) -> Result<Progress, ExecutionError> {
        let action_id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
        let (_, action) = bound(core, &self.actor_id, action_id, self.physical_life)?;
        let target = action
            .target_id
            .as_deref()
            .ok_or(ExecutionError::Invariant)?;
        let target = core
            .state
            .physical
            .entities
            .get(target)
            .filter(|target| visible && harvest::fresh(target));
        let Some(remains) = target.and_then(|target| target.remains.as_ref()) else {
            self.fail(harvest::FAILED)?;
            return self.drive(core, None);
        };
        if action.stage == "approaching" {
            self.start_target_work(core, action.replans)?;
            self.phase = Phase::Done;
            return Ok(Progress::Complete);
        }
        let epsilon = core.state.installed.time_epsilon;
        if action.remaining_seconds > self.seconds + epsilon {
            core.physical()
                .advance_timed_work(&self.actor_id, action_id, self.seconds, epsilon)?;
            self.phase = Phase::Done;
            return Ok(Progress::Complete);
        }
        let target = action.target_id.as_ref().ok_or(ExecutionError::Invariant)?;
        let bytes = remains.heap_bytes().ok_or(ExecutionError::Capacity)?;
        let _workspace = self.budget.reserve(
            bytes
                .checked_mul(4)
                .and_then(|b| b.checked_add(target.len() + action_id.len() + 512))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let target = target.clone();
        let mut after = remains.clone();
        if !harvest::can_cut(core, &self.actor_id)? {
            self.fail(harvest::FAILED)?;
            return self.drive(core, None);
        }
        let mut outputs = Vec::with_capacity(after.yields.len());
        for yield_item in &after.yields {
            let item_id = core.produce_carried_stock(
                &self.actor_id,
                &yield_item.definition_id,
                yield_item.quantity,
            )?;
            outputs.push(ActivityOutput {
                port: yield_item.definition_id.clone(),
                definition_id: yield_item.definition_id.clone(),
                item_id,
                quantity: yield_item.quantity,
            });
        }
        after.harvested = true;
        core.physical().set_remains(&target, Some(after))?;
        core.physical()
            .advance_timed_work(&self.actor_id, action_id, self.seconds, epsilon)?;
        let mut completed = core
            .state
            .installed
            .ordinary_actions
            .value()
            .movement_completed
            .outcome(true);
        completed.outputs = Some(outputs);
        self.reserve(completed.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        self.production_result = Some(completed);
        let event = crate::native_controller::feeding::stage(
            core,
            &self.actor_id,
            &target,
            "harvested",
            harvest::COMPLETED.into(),
            indexmap::IndexMap::new(),
        )?;
        self.reserve(event.id.len())?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::Finish;
        Ok(Progress::Occurrence(event))
    }
}
