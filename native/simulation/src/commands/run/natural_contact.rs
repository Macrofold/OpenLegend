use super::*;
use crate::contact::{StrikeMotion, StrikeRoute, StrikeRouteStep, may_target, profile, reach};

impl CommandCursor {
    pub(super) fn prepare_contact_route(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<bool, ExecutionError> {
        let action = self.action.as_ref().ok_or(ExecutionError::Invariant)?;
        if action.strike_motion.is_none() {
            return Ok(false);
        }
        let installed = &core.state.installed;
        let entities = &core.state.physical.entities;
        let actor = entities
            .get(&self.command.envelope().actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let target = entities
            .get(
                action
                    .target_id
                    .as_deref()
                    .ok_or(ExecutionError::Invariant)?,
            )
            .ok_or(ExecutionError::MissingEntity)?;
        let definition = installed
            .retained
            .native_strike_read
            .get(
                action
                    .definition_id
                    .as_deref()
                    .ok_or(ExecutionError::Invariant)?,
            )
            .and_then(|strike| strike.preparation_motion.as_ref())
            .ok_or(ExecutionError::Invariant)?;
        self.binding.serial = core.journal.next_provider_serial()?;
        self.contact_route = Some(StrikeRoute::prepare(
            installed,
            definition,
            actor,
            target,
            &[],
            self.binding,
            &self.budget,
        )?);
        self.phase = Phase::ContactRoute;
        Ok(true)
    }

    pub(super) fn finish_contact_route(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: GeometryAnswers,
    ) -> Result<bool, ExecutionError> {
        let route = self
            .contact_route
            .as_mut()
            .ok_or(ExecutionError::Invariant)?;
        let result = route.step(answer, || core.journal.next_provider_serial(), &self.budget)?;
        if matches!(&result, StrikeRouteStep::Geometry) {
            return Ok(true);
        }
        self.contact_route = None;
        let action = self.action.as_mut().ok_or(ExecutionError::Invariant)?;
        match result {
            StrikeRouteStep::AtStance => {}
            StrikeRouteStep::Route(crate::geometry::GuardedRoutePlan(route, mut custody)) => {
                match route {
                    RoutePlan::Reached { path, .. } => action.path = path,
                    RoutePlan::Pending { mut request, .. } => {
                        custody.resize(
                            custody
                                .bytes()
                                .checked_add("entityapproaching".len())
                                .ok_or(ExecutionError::Capacity)?,
                        )?;
                        request.wait = Some("entity".into());
                        action.stage = "approaching".into();
                        action.strike_motion = None;
                        action.navigation = Some(NavigationPending {
                            request,
                            failure: None,
                        });
                    }
                    _ => {
                        self.refuse(&core.state.installed.ordinary_actions.value().no_route);
                        return Ok(false);
                    }
                }
                self.action_storage
                    .as_mut()
                    .ok_or(ExecutionError::Invariant)?
                    .merge(custody)?;
            }
            StrikeRouteStep::Unavailable => {
                self.refuse(&core.state.installed.ordinary_actions.value().no_route);
                return Ok(false);
            }
            _ => return Err(ExecutionError::Invariant),
        }
        self.phase = Phase::Prepared;
        Ok(false)
    }

    pub(super) fn prepare_natural_contact(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<bool, ExecutionError> {
        let NativeCommand::Strike {
            envelope,
            definition_id,
            target_id,
            weapon_item_id,
            auto_equip,
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        if !self.options.native_controller
            || weapon_item_id.is_some()
            || auto_equip.is_some()
            || envelope.human_initiated.is_some()
        {
            return Err(ExecutionError::UnsupportedFamily);
        }
        let installed = &core.state.installed;
        let ordinary = installed.ordinary_actions.value();
        let physical = &core.state.physical;
        let source = physical
            .entities
            .get(&envelope.actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let definition =
            profile(installed, source, definition_id).ok_or(ExecutionError::UnsupportedFamily)?;
        let Some(target) = physical.entities.get(target_id) else {
            self.refuse(&ordinary.not_applicable);
            return Ok(false);
        };
        let Some(life) = target
            .physical_life()
            .filter(|life| may_target(installed, source, target, *life))
        else {
            self.refuse(&ordinary.not_applicable);
            return Ok(false);
        };
        let current = source.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
        if current
            .combat_ready_at
            .is_some_and(|at| at > physical.header.sim_time)
        {
            self.refuse(&ordinary.not_applicable);
            return Ok(false);
        }
        let motion = definition.preparation_motion.as_ref();
        let range = motion.map_or(definition.range, |motion| motion.start_range);
        if motion.is_some() && target.supported_position().is_none() {
            self.refuse(&ordinary.out_of_reach);
            return Ok(false);
        }
        let Some(ray) = reach(installed, definition, source, target, range, &self.budget)? else {
            self.refuse(&ordinary.out_of_reach);
            return Ok(false);
        };
        let mut storage = self.budget.reserve(
            envelope.id.len() + definition_id.len() + target_id.len() + "strikeworking".len(),
        )?;
        let mut action =
            Action::natural_contact(envelope.id.clone(), target_id.clone(), life, definition);
        if motion.is_some() {
            let (motion, custody) = StrikeMotion::prepare(
                installed,
                definition,
                target,
                physical.header.sim_time,
                &self.budget,
            )?;
            action.strike_motion = Some(motion);
            storage.merge(custody)?;
        }
        self.action_storage = Some(storage);
        self.action = Some(action);
        self.reserve(std::mem::size_of::<crate::geometry::SightRay>())?;
        self.question(core, Phase::ContactReach)?.sight = vec![ray];
        Ok(true)
    }

    pub(super) fn natural_contact_started(
        &mut self,
        core: &mut CoreMutation<'_>,
        source: &str,
    ) -> Result<Progress, ExecutionError> {
        if core
            .state
            .physical
            .entities
            .get(source)
            .and_then(|entity| entity.actor.as_ref())
            .and_then(|actor| actor.action.as_ref())
            .is_some_and(|action| action.stage == "approaching")
        {
            self.phase = Phase::Tail;
            return self.drive(core, None);
        }
        let (event, custody) = crate::contact::stage_preparation(core, source, &self.budget)?;
        self._reservation.merge(custody)?;
        self.reserve(event.id.len())?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::Tail;
        Ok(Progress::Occurrence(event))
    }
}
