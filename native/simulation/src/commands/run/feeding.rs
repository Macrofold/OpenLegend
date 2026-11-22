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
        let Some(meal) = feeding::meal(installed, animal, target) else {
            self.refuse(&ordinary.not_applicable);
            return Ok(false);
        };
        let (binding, mut storage) = feeding::binding(meal, target, &self.budget)?;
        storage.resize(
            storage
                .bytes()
                .checked_add(envelope.id.len() + 2 * target_id.len() + 32)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        self.action = Some(Action::resource_feed(
            envelope.id.clone(),
            target_id.clone(),
            meal.2.work_seconds,
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

    pub(super) fn prepare_feeding_route(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<(), ExecutionError> {
        let NativeCommand::Feed {
            envelope,
            target_id,
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let installed = &core.state.installed;
        let physical = &core.state.physical;
        let actor = physical
            .entities
            .get(&envelope.actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let target = physical
            .entities
            .get(target_id)
            .ok_or(ExecutionError::MissingEntity)?;
        let (route, storage) = feeding::approach(
            actor,
            target,
            installed.retained.item_handling_read.reach,
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
