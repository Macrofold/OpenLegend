//! Pure availability for offered syntax whose physical executor is outside the
//! selected installation. It shares the real command/record/display boundary;
//! no action, identity, receipt, status or SQL row is installed here.
use super::*;
use crate::geometry::SightRay;
use crate::state::Point;

impl CommandCursor {
    fn discovery_result(
        &mut self,
        ok: bool,
        code: &str,
        message: &str,
    ) -> Result<(), ExecutionError> {
        self.reserve(
            code.len()
                .checked_add(message.len())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        self.outcome = Some(outcome(ok, code, message));
        self.phase = Phase::Done;
        Ok(())
    }
    fn discovery_refuse(
        &mut self,
        rule: &crate::worlds::InstalledActionMessage,
    ) -> Result<(), ExecutionError> {
        self.discovery_result(false, &rule.code, &rule.message)
    }
    pub(super) fn start_discovery(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<bool, ExecutionError> {
        let installed = core.state.installed.clone();
        let rules = &installed.occurrence_rules.value().response.offers;
        let actor_id = &self.command.envelope().actor_id;
        let entity = core
            .state
            .physical
            .entities
            .get(actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let actor = entity.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
        match &self.command {
            NativeCommand::InspectInventory { .. } => {
                // This capability was minted from consumed complete item and
                // resource-claim owners, and reads their actual revision.
                let _projection = core
                    .state
                    .inventory
                    .project(&core.state.administration.object_membership);
                self.discovery_result(
                    true,
                    "available",
                    "Current prerequisites are available; execution rechecks them.",
                )?;
                return Ok(false);
            }
            NativeCommand::InspectActivities { history_after, .. } => {
                if *history_after != -1 {
                    return Err(ExecutionError::UnsupportedFamily);
                }
                self.discovery_result(
                    true,
                    "available",
                    "Current prerequisites are available; execution rechecks them.",
                )?;
                return Ok(false);
            }
            NativeCommand::Follow {
                target_id,
                distance,
                ..
            } => {
                let separation = distance.unwrap_or(rules.follow.default_distance);
                if target_id == actor_id
                    || !separation.is_finite()
                    || separation <= 0.
                    || separation < rules.follow.minimum_distance
                    || separation > rules.follow.maximum_distance
                {
                    self.discovery_refuse(&rules.availability.invalid_follow)?;
                    return Ok(false);
                }
                if installed
                    .capabilities
                    .capability_blocked(Some(entity), "locomotion")?
                {
                    self.discovery_result(
                        false,
                        &rules.availability.follow_unavailable_code,
                        &rules.availability.follow_restricted,
                    )?;
                    return Ok(false);
                }
            }
            NativeCommand::Strike {
                definition_id,
                weapon_item_id,
                ..
            } => {
                if weapon_item_id.is_some() {
                    return Err(ExecutionError::UnsupportedFamily);
                }
                let Some(strike) = installed.retained.native_strike_read.get(definition_id) else {
                    self.discovery_refuse(&rules.availability.unknown_strike)?;
                    return Ok(false);
                };
                let body = actor.body.as_ref().map(|body| body.plan.as_str());
                if body.is_none()
                    || strike
                        .required_body_plan
                        .as_deref()
                        .is_some_and(|required| Some(required) != body)
                    || !(rules
                        .natural_strike_body_plans
                        .iter()
                        .any(|plan| Some(plan.as_str()) == body)
                        || actor
                            .natural_strike_ids
                            .as_ref()
                            .is_some_and(|ids| ids.contains(definition_id)))
                {
                    self.discovery_refuse(&rules.availability.unsupported_strike)?;
                    return Ok(false);
                }
                if strike.preparation_motion.is_some() {
                    return Err(ExecutionError::UnsupportedFamily);
                }
                if actor
                    .combat_ready_at
                    .is_some_and(|at| at > core.state.physical.header.sim_time)
                {
                    self.discovery_refuse(&rules.availability.combat_recovery)?;
                    return Ok(false);
                }
            }
            _ => return Err(ExecutionError::Invariant),
        }
        let target = match &self.command {
            NativeCommand::Follow { target_id, .. } | NativeCommand::Strike { target_id, .. } => {
                target_id
            }
            _ => return Err(ExecutionError::Invariant),
        };
        self.binding.serial = core.journal.next_provider_serial()?;
        self.sight = Some(
            crate::reception::SightBatch::prepare(
                &core.state.physical,
                &installed,
                actor_id,
                &[target],
                self.binding,
                &self.budget,
            )
            .map_err(ExecutionError::Sensor)?,
        );
        self.phase = Phase::DiscoverySight;
        Ok(true)
    }
    pub(super) fn finish_discovery_geometry(
        &mut self,
        core: &mut CoreMutation<'_>,
        mut answer: GeometryAnswers,
    ) -> Result<(), ExecutionError> {
        let installed = core.state.installed.clone();
        let rules = &installed.occurrence_rules.value().response.offers;
        match self.phase {
            Phase::DiscoverySight => {
                let seen = self
                    .sight
                    .take()
                    .ok_or(ExecutionError::Invariant)?
                    .finish(answer)
                    .map_err(ExecutionError::Sensor)?;
                let actor_id = &self.command.envelope().actor_id;
                let target_id = match &self.command {
                    NativeCommand::Follow { target_id, .. }
                    | NativeCommand::Strike { target_id, .. } => target_id,
                    _ => return Err(ExecutionError::Invariant),
                };
                if seen.seen(target_id) != Some(true) {
                    return self.discovery_refuse(&rules.availability.unperceived);
                }
                let actor = core
                    .state
                    .physical
                    .entities
                    .get(actor_id)
                    .ok_or(ExecutionError::MissingActor)?;
                let target = core
                    .state
                    .physical
                    .entities
                    .get(target_id)
                    .ok_or(ExecutionError::MissingEntity)?;
                if matches!(self.command, NativeCommand::Follow { .. }) {
                    if !target.actor.as_ref().is_some_and(|actor| actor.alive) {
                        return self.discovery_result(
                            false,
                            &rules.availability.follow_unavailable_code,
                            &rules.availability.follow_dead,
                        );
                    }
                } else {
                    let Some(source) = actor.actor.as_ref().filter(|a| a.alive && !a.incapacitated)
                    else {
                        return self.discovery_refuse(&rules.availability.attack_source);
                    };
                    let Some(destination) = target.actor.as_ref().filter(|a| {
                        a.alive && target.id != actor.id && target.actively_participates()
                    }) else {
                        return self.discovery_refuse(&rules.availability.attack_target);
                    };
                    let policy = installed
                        .body_policy
                        .as_ref()
                        .and_then(|p| p.value().combat.as_ref());
                    let permitted = policy.is_some_and(|p| {
                        let controllers = match source.controller.as_str() {
                            "player" => Some(&p.targets.player),
                            "npc" => Some(&p.targets.npc),
                            "native" => Some(&p.targets.native),
                            _ => None,
                        };
                        controllers.is_some_and(|targets| targets.contains(&destination.controller))
                            && (source.controller != "player"
                                && self.command.envelope().human_initiated != Some(true)
                                || p.human_issued_targets.contains(&destination.controller))
                    });
                    if !permitted {
                        return self.discovery_result(
                            false,
                            &rules.availability.attack_permission.code,
                            policy.map_or(&rules.availability.attack_permission.message, |p| {
                                &p.unavailable_text
                            }),
                        );
                    }
                    // Human lethality review is a separate required authority.
                    // Native NPC offers never synthesize that permission.
                    if source.controller == "player"
                        || self.command.envelope().human_initiated == Some(true)
                    {
                        return Err(ExecutionError::UnsupportedFamily);
                    }
                }
                let actor_profile = crate::status::effective_body_profile(actor, &self.budget)?;
                let target_profile = crate::status::effective_body_profile(target, &self.budget)?;
                let mut from = actor
                    .world_position()
                    .ok_or(ExecutionError::InvalidPosition)?;
                from.y += actor_profile.interaction_height;
                let mut to = target
                    .world_position()
                    .ok_or(ExecutionError::InvalidPosition)?;
                to.y += target_profile.interaction_height;
                self.reserve(std::mem::size_of::<SightRay>())?;
                self.question(core, Phase::DiscoveryReach)?
                    .sight
                    .push(SightRay { from, to });
            }
            Phase::DiscoveryReach => {
                self.queries
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?
                    .validate_answers(&answer)
                    .map_err(|_| ExecutionError::Invariant)?;
                let clear = answer.sight.pop().ok_or(ExecutionError::Invariant)?;
                self.queries = None;
                let actor = core
                    .state
                    .physical
                    .entities
                    .get(&self.command.envelope().actor_id)
                    .ok_or(ExecutionError::MissingActor)?;
                let (target_id, reach) = match &self.command {
                    NativeCommand::Follow {
                        target_id,
                        distance,
                        ..
                    } => (target_id, distance.unwrap_or(rules.follow.default_distance)),
                    NativeCommand::Strike {
                        target_id,
                        definition_id,
                        ..
                    } => {
                        let d = installed
                            .retained
                            .native_strike_read
                            .get(definition_id)
                            .ok_or(ExecutionError::Invariant)?;
                        (target_id, d.approach_range.unwrap_or(d.range))
                    }
                    _ => return Err(ExecutionError::Invariant),
                };
                let target = core
                    .state
                    .physical
                    .entities
                    .get(target_id)
                    .ok_or(ExecutionError::MissingEntity)?;
                let actor_profile = crate::status::effective_body_profile(actor, &self.budget)?;
                let target_profile = crate::status::effective_body_profile(target, &self.budget)?;
                let position = target
                    .world_position()
                    .ok_or(ExecutionError::InvalidPosition)?;
                let mut from = actor
                    .world_position()
                    .ok_or(ExecutionError::InvalidPosition)?;
                from.y += actor_profile.interaction_height;
                let mut goal = position;
                goal.y += target_profile.interaction_height;
                let reached = clear && crate::spatial::distance(from, goal) <= reach;
                if let NativeCommand::Strike { definition_id, .. } = &self.command {
                    let d = installed
                        .retained
                        .native_strike_read
                        .get(definition_id)
                        .ok_or(ExecutionError::Invariant)?;
                    if !d.auto_move_to_range
                        && !(clear && crate::spatial::distance(from, goal) <= d.range)
                    {
                        return self.discovery_refuse(&rules.availability.strike_range);
                    }
                }
                if reached {
                    return self.discovery_ready(core);
                }
                self.reserve(
                    crate::host::retained_size::heap_sum([
                        std::mem::size_of::<RouteQuery>(),
                        support_bytes(actor),
                        support_bytes(target),
                        actor_profile.id.len(),
                    ])
                    .ok_or(ExecutionError::Capacity)?,
                )?;
                let route = RouteQuery::Approach {
                    from: actor
                        .supported_position()
                        .ok_or(ExecutionError::InvalidPosition)?,
                    body: (*actor_profile).clone(),
                    target_position: position,
                    target_support: target.supported_position(),
                    reach,
                    goal,
                };
                self.question(core, Phase::DiscoveryRoute)?
                    .routes
                    .push(route);
            }
            Phase::DiscoveryRoute => {
                self.queries
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?
                    .validate_answers(&answer)
                    .map_err(|_| ExecutionError::Invariant)?;
                let route = answer.routes.pop().ok_or(ExecutionError::Invariant)?;
                self.queries = None;
                match route {
                    RoutePlan::Reached { .. } | RoutePlan::Pending { .. } => {
                        self.discovery_approaching = true;
                        self.discovery_ready(core)?;
                    }
                    other => {
                        if matches!(self.command, NativeCommand::Follow { .. }) {
                            self.discovery_result(
                                false,
                                &rules.availability.follow_unavailable_code,
                                if matches!(other, RoutePlan::BudgetExceeded { .. }) {
                                    &rules.availability.follow_budget
                                } else {
                                    &rules.availability.follow_no_route
                                },
                            )?;
                        } else {
                            let code = match other {
                                RoutePlan::BudgetExceeded { .. } => "budget-exceeded",
                                RoutePlan::InvalidEndpoint { .. } => "invalid-endpoint",
                                _ => "no-route",
                            };
                            self.discovery_result(
                                false,
                                code,
                                &installed.ordinary_actions.value().no_route.message,
                            )?;
                        }
                    }
                }
            }
            _ => return Err(ExecutionError::InvalidCheckpoint),
        }
        Ok(())
    }
    fn discovery_ready(&mut self, core: &CoreMutation<'_>) -> Result<(), ExecutionError> {
        let installed = core.state.installed.clone();
        if let Some(definition) = core
            .state
            .physical
            .entities
            .get(&self.command.envelope().actor_id)
            .and_then(|e| e.actor.as_ref())
            .and_then(|a| a.action.as_ref())
            .filter(|a| a.kind == "status-effect")
            .and_then(|a| a.definition_id.as_ref())
            .and_then(|id| {
                installed
                    .status_policy
                    .definitions
                    .iter()
                    .find(|d| &d.id == id)
            })
        {
            if !definition
                .interrupt_on
                .iter()
                .any(|reason| reason == "new-action")
            {
                return self.discovery_refuse(&installed.ordinary_actions.value().cannot_interrupt);
            }
        }
        self.discovery_starts_work = true;
        self.phase = Phase::Choice;
        Ok(())
    }
}

fn support_bytes(entity: &crate::state::Entity) -> usize {
    match &entity.placement {
        Some(crate::state::Placement::World {
            support_surface_id: Some(id),
            ..
        }) => id.len(),
        _ => 0,
    }
}
