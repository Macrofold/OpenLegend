//! Internal resource feeding joins the ordinary command's replacement and
//! occurrence phases. Only the native forage controller can admit this input.
use super::*;
use crate::native_controller::feeding;
use crate::worlds::base_foraging::feeding_terms;

impl CommandCursor {
    pub(super) fn prepare_feeding(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<bool, ExecutionError> {
        let NativeCommand::Feed {
            envelope,
            target_id,
            item_id,
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let installed = &core.state.installed;
        let physical = &core.state.physical;
        let ordinary = installed.ordinary_actions.value();
        let animal = physical
            .entities
            .get(&envelope.actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let Some(target) = physical.entities.get(target_id) else {
            self.refuse(&ordinary.not_applicable);
            return Ok(false);
        };
        let Some(meal) = feeding::meal(core.state, animal, target, item_id.as_deref()) else {
            self.refuse(&ordinary.not_applicable);
            return Ok(false);
        };
        let (binding, mut storage) = meal.binding(&self.budget)?;
        storage.resize(
            storage
                .bytes()
                .checked_add(envelope.id.len() + 2 * target_id.len() + 32)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        self.action = Some(Action::resource_feed(
            envelope.id.clone(),
            target_id.clone(),
            meal.diet.work_seconds,
            binding,
        ));
        self.action_storage = Some(storage);
        let reach = installed.retained.item_handling_read.reach;
        if let Some(ray) = crate::geometry::interaction_reach(animal, target, reach, &self.budget)?
        {
            self.reserve(size_of::<crate::geometry::SightRay>())?;
            self.question(core, Phase::FeedReach)?.sight.push(ray);
            Ok(true)
        } else {
            self.phase = Phase::FeedApproach;
            Ok(false)
        }
    }

    pub(super) fn prepare_interaction_route(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<(), ExecutionError> {
        let installed = &core.state.installed;
        let (target_id, reach) = match &self.command {
            NativeCommand::Feed { target_id, .. } | NativeCommand::Pickup { target_id, .. } =>
                (target_id, installed.retained.item_handling_read.reach),
            NativeCommand::Gather { target_id, .. } | NativeCommand::TendFire { target_id, .. } => (target_id, installed.movement.interaction_radius()),
            NativeCommand::PracticeShot { target_id, .. } => {
                let aim = self.action.as_ref().and_then(|action| action.ranged.as_ref()).ok_or(ExecutionError::Invariant)?;
                let tool = installed.retained.items.get(&aim.tool.id).and_then(|item| item.ranged_weapon.as_ref())
                    .ok_or(ExecutionError::Invariant)?;
                (target_id, crate::projectile::practice::approach_range(installed, tool.range)?)
            }
            _ => return Err(ExecutionError::Invariant),
        };
        let physical = &core.state.physical;
        let actor = physical
            .entities
            .get(&self.command.envelope().actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let target = physical
            .entities
            .get(target_id)
            .ok_or(ExecutionError::MissingEntity)?;
        if matches!(self.command, NativeCommand::Pickup { .. } | NativeCommand::TendFire { .. } | NativeCommand::PracticeShot { .. })
            && installed.capabilities.capability_blocked(Some(actor), "locomotion")?
        {
            self.refuse(&installed.ordinary_actions.value().actions_restricted);
            return Ok(());
        }
        let (route, storage) = feeding::approach(
            actor,
            target,
            reach,
            &self.budget,
        )?;
        self._reservation.merge(storage)?;
        self.question(core, Phase::Route)?.routes.push(route);
        Ok(())
    }

    pub(super) fn feeding_started(
        &mut self,
        core: &mut CoreMutation<'_>,
        actor: &str,
    ) -> Result<Progress, ExecutionError> {
        let NativeCommand::Feed { target_id, .. } = &self.command else {
            return Err(ExecutionError::Invariant);
        };
        let event_type = &core
            .state
            .installed
            .ordinary_actions
            .value()
            .action_started_event;
        let terms = feeding_terms();
        self._reservation.resize(
            self._reservation
                .bytes()
                .checked_add(
                    actor.len() * 3
                        + target_id.len()
                        + 2 * terms.started.len()
                        + event_type.len()
                        + 512,
                )
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let event_type = event_type.clone();
        let data = IndexMap::from([(
            "actionType".into(),
            crate::reception::EventScalar::Text("feed".into()),
        )]);
        let event = feeding::stage(
            core,
            actor,
            target_id,
            &event_type,
            terms.started.as_str().into(),
            data,
        )?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::AfterDeparture;
        Ok(Progress::Occurrence(event))
    }
}
