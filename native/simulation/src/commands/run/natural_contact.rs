use super::*;
use crate::contact::{ContactKind, ContactRead, StrikeMotion, StrikeRoute, StrikeRouteStep, may_target, profile, reach};

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
            ..
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
        let definition = ContactRead::from(
            profile(installed, source, definition_id).ok_or(ExecutionError::UnsupportedFamily)?,
        );
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
        let motion = definition.preparation_motion;
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
        let mut action = Action::contact(envelope.id.clone(), target_id.clone(), life, definition);
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

    /// Discovery just checked current sight, reach and an optional route in
    /// this candidate. Retain its exact target life and turn it into work only
    /// for the accepted NPC plan.
    pub(super) fn install_chosen_contact(
        &mut self,
        core: &CoreMutation<'_>,
        route: Option<RoutePlan>,
    ) -> Result<(), ExecutionError> {
        let NativeCommand::Strike {
            envelope,
            target_id,
            ..
        } = &self.command
        else {
            return Err(ExecutionError::UnsupportedFamily);
        };
        let source = core
            .state
            .physical
            .entities
            .get(&envelope.actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let source_actor = source.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
        use crate::contact::review::ChosenContact;
        let (player, permission) = match (&self.chosen_contact, source_actor.controller.as_str()) {
            (Some(ChosenContact::Npc), "npc") if envelope.human_initiated != Some(true) => {
                (false, None)
            }
            (Some(ChosenContact::Player(permission)), "player")
                if envelope.human_initiated == Some(true) =>
            {
                (true, permission.as_deref())
            }
            _ => return Err(ExecutionError::UnsupportedFamily),
        };
        let installed = &core.state.installed;
        let definition = ContactRead::command(
            &core.state, source, &self.command, &self.budget,
        )?.ok_or(ExecutionError::InvalidCheckpoint)?;
        let target = core
            .state
            .physical
            .entities
            .get(target_id)
            .ok_or(ExecutionError::MissingEntity)?;
        let life = target
            .physical_life()
            .filter(|life| may_target(installed, source, target, *life))
            .ok_or(ExecutionError::InvalidCheckpoint)?;
        if player {
            use crate::contact::review::{self, Review};
            let injury = crate::contact::ContactInjury::read(installed, source, target)?;
            match review::check(
                installed,
                source,
                target,
                definition,
                injury,
                permission,
                &self.budget,
            )? {
                Review::Allowed => {}
                Review::Required => {
                    let (permission, mut custody) =
                        review::prepare(source, target, definition, injury, &self.budget)?;
                    custody.resize(
                        custody
                            .bytes()
                            .checked_add(std::mem::size_of::<crate::host::ByteReservation>())
                            .ok_or(ExecutionError::Capacity)?,
                    )?;
                    self.strike_confirmation = Some(Box::new((permission, custody)));
                    self.phase = Phase::Choice;
                    return Ok(());
                }
                Review::Changed => {
                    let rule = installed
                        .body_policy
                        .as_ref()
                        .and_then(|body| body.value().lethal_attack_review.as_ref())
                        .ok_or(ExecutionError::InvalidCheckpoint)?;
                    return self.discovery_result(false, "lethal-review-stale", &rule.description);
                }
            }
        }
        let permission_bytes = permission
            .map_or(Some(0), |permit| {
                permit
                    .heap_bytes()?
                    .checked_add(std::mem::size_of_val(permit))
            })
            .ok_or(ExecutionError::Capacity)?;
        let weapon_bytes = match definition.kind {
            ContactKind::Natural(_) => 0,
            ContactKind::Equipped { item_id, definition } => item_id.len().checked_add(
                definition.pin.digest.len()
            ).ok_or(ExecutionError::Capacity)?,
        };
        let mut storage = self.budget.reserve(
            envelope.id.len()
                + target_id.len()
                + definition.id.len()
                + "strikeapproachingentity".len()
                + permission_bytes
                + weapon_bytes,
        )?;
        let mut action = Action::contact(envelope.id.clone(), target_id.clone(), life, definition);
        action.requires_lethal_review = player.then_some(true);
        action.lethal_permission = permission.map(|permit| Box::new(permit.clone()));
        if let Some(route) = route {
            let crate::geometry::GuardedRoutePlan(plan, guard) =
                crate::geometry::route_plan(route, &self.budget)?;
            storage.merge(guard)?;
            action.stage = "approaching".into();
            action.replans = Some(0);
            match plan {
                RoutePlan::Reached { path, .. } => action.path = path,
                RoutePlan::Pending { mut request, .. } => {
                    request.wait = Some("entity".into());
                    action.navigation = Some(NavigationPending {
                        request,
                        failure: None,
                    });
                }
                _ => return Err(ExecutionError::Invariant),
            }
        }
        self.action = Some(action);
        self.action_storage = Some(storage);
        self.phase = Phase::Prepared;
        Ok(())
    }

    pub(super) fn natural_contact_started(
        &mut self,
        core: &mut CoreMutation<'_>,
        source: &str,
    ) -> Result<Progress, ExecutionError> {
        let after = if self.chosen_contact.is_some() {
            Phase::AfterDeparture
        } else {
            Phase::Tail
        };
        let approaching = core
            .state
            .physical
            .entities
            .get(source)
            .and_then(|entity| entity.actor.as_ref())
            .and_then(|actor| actor.action.as_ref())
            .is_some_and(|action| action.stage == "approaching");
        let occurrence = if approaching {
            None
        } else {
            crate::contact::stage_preparation(core, source, &self.budget)?
        };
        let Some((event, custody)) = occurrence else {
            self.phase = after;
            return self.drive(core, None);
        };
        self._reservation.merge(custody)?;
        self.reserve(event.id.len())?;
        self.event = Some(event.id.clone());
        self.after_event = after;
        Ok(Progress::Occurrence(event))
    }
}
