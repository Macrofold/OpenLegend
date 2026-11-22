//! Admit exact ground work through the same command, route and receipt owner
//! as the other short actions that approach a physical target.
use super::*;
use crate::ground_items::{pickup_lot, pickup_pile};
use crate::host::retained_size::heap_sum;

impl CommandCursor {
    pub(super) fn pickup_started(
        &mut self,
        core: &mut CoreMutation<'_>,
        actor: &str,
    ) -> Result<Progress, ExecutionError> {
        let NativeCommand::Pickup { target_id, .. } = &self.command else {
            return Err(ExecutionError::Invariant);
        };
        let installed = &core.state.installed;
        let event_type = &installed.ordinary_actions.value().action_started_event;
        let label = &installed.retained.item_handling_read.pickup_label;
        let temporary = self.budget.reserve(
            512 + 3 * actor.len() + target_id.len() + event_type.len() + 4 * label.len(),
        )?;
        let event_type = event_type.clone();
        let description = label.as_str().into();
        let data = IndexMap::from([(
            "actionType".into(),
            crate::reception::EventScalar::Text("pickup".into()),
        )]);
        let event = crate::native_controller::feeding::stage(
            core,
            actor,
            target_id,
            &event_type,
            description,
            data,
        )?;
        self.reserve(event.id.len())?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::AfterDeparture;
        drop(temporary);
        Ok(Progress::Occurrence(event))
    }

    pub(super) fn prepare_pickup(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<bool, ExecutionError> {
        let NativeCommand::Pickup {
            envelope,
            target_id,
            item_id,
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let state = &core.state;
        let ordinary = state.installed.ordinary_actions.value();
        let actor = state
            .physical
            .entities
            .get(&envelope.actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let Some(pile) = pickup_pile(state, actor, target_id) else {
            self.refuse(&ordinary.not_applicable);
            return Ok(false);
        };
        if pickup_lot(state, pile, item_id).is_none() {
            self.refuse(&ordinary.not_applicable);
            return Ok(false);
        }
        let policy = &state.installed.retained.item_handling_read;
        let funded = self
            .budget
            .reserve(envelope.id.len() + target_id.len() + item_id.len() + 32)?;
        self.action = Some(Action::pickup(
            envelope.id.clone(),
            target_id.clone(),
            item_id.clone(),
            policy.pickup_seconds,
        ));
        self.action_storage = Some(funded);
        if let Some(ray) =
            crate::geometry::interaction_reach(actor, pile, policy.reach, &self.budget)?
        {
            self.reserve(size_of::<crate::geometry::SightRay>())?;
            self.question(core, Phase::FeedReach)?.sight.push(ray);
            return Ok(true);
        }
        self.phase = Phase::FeedApproach;
        Ok(false)
    }

    pub(super) fn prepare_pickup_view(
        &mut self,
        core: &CoreMutation<'_>,
    ) -> Result<(), ExecutionError> {
        let NativeCommand::Pickup {
            envelope,
            target_id,
            item_id,
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let state = &core.state;
        let actor = state
            .physical
            .entities
            .get(&envelope.actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let pile = pickup_pile(state, actor, target_id).ok_or(ExecutionError::Invariant)?;
        let item = pickup_lot(state, pile, item_id).ok_or(ExecutionError::Invariant)?;
        let label = &state.installed.retained.item_handling_read.pickup_label;
        let bytes = heap_sum([
            label.len(),
            pile.name.storage_bytes(),
            item.definition.named.name.storage_bytes(),
        ])
        .ok_or(ExecutionError::Capacity)?;
        let (view, mut allowance) = {
            let allowance = self.budget.reserve(bytes)?;
            (
                ActivityView {
                    name: label.as_str().into(),
                    actor: None,
                    tool: Some(item.definition.named.name.clone()),
                    target: Some(pile.name.clone()),
                    facts: Vec::new(),
                    children: None,
                    result: None,
                },
                allowance,
            )
        };
        allowance.resize(view.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        self.view = Some(view);
        self.view_reservation = Some(allowance);
        Ok(())
    }
}
