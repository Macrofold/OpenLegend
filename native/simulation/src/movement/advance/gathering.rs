//! An ordinary approach uses the existing route and timed-work phases. Only
//! the reached, current completion may debit stock and publish a carried lot.
use super::*;
use crate::{
    commands::ActivityOutput,
    gathering::{bound_yield, quantity, source},
    host::retained_size::HeapBytes,
    reception::EventScalar,
    worlds::base_gathering,
};
use indexmap::IndexMap;

impl MoveAdvanceCursor {
    pub(super) fn current_gathering_binding(
        &self,
        core: &CoreMutation<'_>,
        action: &Action,
    ) -> Result<bool, ExecutionError> {
        let Some((source, binding)) = action
            .target_id
            .as_deref()
            .and_then(|target| source(core.state, target))
            .zip(action.gathering.as_deref())
        else {
            return Ok(false);
        };
        Ok(bound_yield(
            core.state,
            &self.actor_id,
            &source,
            binding,
            action.item_id.as_deref(),
        )?
        .is_some())
    }

    pub(super) fn advance_gathering(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<Progress, ExecutionError> {
        let id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
        let (_, action) = bound(core, &self.actor_id, id, self.physical_life)?;
        if action.stage == "approaching" {
            let replans = action.replans;
            self.start_target_work(core, replans)?;
            self.phase = Phase::Done;
            return Ok(Progress::Complete);
        }
        let epsilon = core.state.installed.time_epsilon;
        if action.remaining_seconds > self.seconds + epsilon {
            core.physical()
                .advance_timed_work(&self.actor_id, id, self.seconds, epsilon)?;
            self.phase = Phase::Done;
            return Ok(Progress::Complete);
        }

        let target = action
            .target_id
            .as_deref()
            .ok_or(ExecutionError::Invariant)?;
        let selected = source(core.state, target).ok_or(ExecutionError::MissingEntity)?;
        let terms = base_gathering::copy();
        let amount = quantity(
            core.state,
            &self.actor_id,
            &selected,
            action
                .gathering
                .as_deref()
                .ok_or(ExecutionError::Invariant)?,
            action.item_id.as_deref(),
        )?;
        let Some(amount) = amount.filter(|amount| *amount > 0) else {
            self.fail(if selected.stock.quantity == 0 {
                &terms.depleted
            } else {
                &terms.unavailable
            })?;
            return self.drive(core, None);
        };
        self.reserve(
            8 * (target.len()
                + selected.definition.pin.id.len()
                + selected.definition.named.name.storage_bytes())
                + 1024,
        )?;
        let target = target.to_owned();
        let definition = selected.definition.pin.id.clone();
        let resource_revision = selected.stock.revision.unwrap_or(0);
        let text = base_gathering::gathered(amount, &selected.definition.named.name);
        let id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
        if !core
            .physical()
            .advance_timed_work(&self.actor_id, id, self.seconds, epsilon)?
        {
            return Err(ExecutionError::Invariant);
        }
        if !core
            .physical()
            .debit_resource(&target, resource_revision, amount)?
        {
            return Err(ExecutionError::Invariant);
        }
        let item_id = core.produce_carried_stock(&self.actor_id, &definition, amount)?;
        self.gathered_item = Some(ActivityOutput {
            port: definition.clone(),
            item_id,
            definition_id: definition.clone(),
            quantity: amount,
        });
        let event = crate::native_controller::feeding::stage(
            core,
            &self.actor_id,
            &target,
            &terms.gathered_event,
            text,
            IndexMap::from([
                ("definitionId".into(), EventScalar::Text(definition.into())),
                ("quantity".into(), EventScalar::Number(amount as f64)),
            ]),
        )?;
        self.reserve(event.id.len())?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::Finish;
        Ok(Progress::Occurrence(event))
    }

    /// Retain ordered activity custody while switching a reached work target
    /// from travel to its timer. Time spent reaching it earns no work.
    pub(super) fn start_target_work(
        &self,
        core: &mut CoreMutation<'_>,
        replans: Option<u64>,
    ) -> Result<(), ExecutionError> {
        let allowance = self.budget.reserve("working".len())?;
        core.physical().replace_action_route(
            &self.actor_id,
            self.action_id.as_deref().ok_or(ExecutionError::Invariant)?,
            crate::state::FundedActionRoute::from_storage(
                ActionRouteWrite {
                    path: Vec::new(),
                    navigation: None,
                    stage: "working".into(),
                    replans,
                },
                allowance,
                &self.budget,
            )?,
        )?;
        Ok(())
    }
}
