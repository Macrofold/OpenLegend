use super::*;
use crate::{reception::SightBatch, worlds::base_harvest as harvest};

impl CommandCursor {
    pub(super) fn prepare_harvest_view(&mut self) -> Result<(), ExecutionError> {
        let mut store = self.budget.reserve(280)?;
        let view = ActivityView {
            name: harvest::LABEL.into(),
            actor: None,
            tool: None,
            target: None,
            facts: vec![],
            children: None,
            result: None,
        };
        store.resize(view.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        self.view = Some(view);
        self.view_reservation = Some(store);
        Ok(())
    }
    pub(super) fn prepare_harvest(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<bool, ExecutionError> {
        let NativeCommand::Harvest {
            envelope,
            target_id,
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        if !core
            .state
            .physical
            .entities
            .get(target_id)
            .is_some_and(harvest::fresh)
        {
            self.outcome = Some(outcome(false, "not-harvestable", harvest::UNAVAILABLE));
            self.phase = Phase::Done;
            return Ok(false);
        }
        if !harvest::can_cut(core, &envelope.actor_id)? {
            self.outcome = Some(outcome(false, "missing-tool", harvest::MISSING_TOOL));
            self.phase = Phase::Done;
            return Ok(false);
        }
        let seconds = core
            .state
            .installed
            .ordinary_actions
            .value()
            .harvest_seconds;
        self.action_storage = Some(
            self.budget
                .reserve(envelope.id.len() + target_id.len() + 32)?,
        );
        self.action = Some(Action::harvest(
            envelope.id.clone(),
            target_id.clone(),
            seconds,
        ));
        self.binding.serial = core.journal.next_provider_serial()?;
        self.sight = Some(
            SightBatch::prepare(
                &core.state.physical,
                &core.state.installed,
                &envelope.actor_id,
                &[target_id],
                self.binding,
                &self.budget,
            )
            .map_err(|_| ExecutionError::Invariant)?,
        );
        self.phase = Phase::GatherSight;
        Ok(true)
    }
}
