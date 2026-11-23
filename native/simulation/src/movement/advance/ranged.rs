//! Launch is one ordinary world mutation: settle the selected held lot and
//! release a funded independent flight at the current clock boundary.
use super::*;
use crate::item_holds::ClaimState;
use crate::projectile::ProjectileFlight;
use indexmap::IndexMap;

impl MoveAdvanceCursor {
    pub(super) fn commit_projectile(
        &self,
        core: &mut CoreMutation<'_>,
        hold: &str,
        ammo_id: String,
        recovery: f64,
        mut flight: ProjectileFlight,
        flight_storage: ByteReservation,
    ) -> Result<String, ExecutionError> {
        let action_id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
        if !core.state.physical.holds.matches_item(
            &self.actor_id,
            action_id,
            hold,
            &ammo_id,
            1,
            &flight.ammunition,
        ) {
            return Err(ExecutionError::Invariant);
        }
        core.physical().end_item_hold(hold, ClaimState::Consumed)?;
        let debit = core
            .plan_owned_debits(&self.actor_id, &IndexMap::from([(ammo_id, 1)]))?
            .ok_or(ExecutionError::Invariant)?;
        core.record_owned_debit_sources(&self.actor_id, action_id, &debit)?;
        core.use_owned_lots(&self.actor_id, action_id, debit)?;
        core.physical()
            .retain_combat_recovery(&self.actor_id, recovery)?;
        let epsilon = core.state.installed.time_epsilon;
        if !core
            .physical()
            .advance_timed_work(&self.actor_id, action_id, self.seconds, epsilon)?
        {
            return Err(ExecutionError::Invariant);
        }
        let projectile = core.physical().allocate("projectile")?.id;
        flight.id = projectile.clone();
        core.physical().launch_projectile(flight, flight_storage)?;
        Ok(projectile)
    }
}

use crate::body::{ProjectileContact, ScarEffect, scar_factor};
use crate::commands::ranged_input::review_digest;
use crate::contact::review::{self, Review};
use crate::geometry::SightRay;
use crate::host::retained_size::HeapBytes;
use crate::projectile::loadout::installed_loadout;
use crate::projectile::{ContactPolicy, RangedAim, loadout};
use crate::reception::{EventScalar, SightBatch};

pub(super) struct ReleaseRequest {
    permit: Option<Box<crate::contact::StrikePermission>>,
    review: Option<Box<(crate::contact::StrikePermission, ByteReservation)>>,
    _custody: ByteReservation,
}

impl MoveAdvanceCursor {
    pub(crate) fn release_request(
        actor: &str,
        action: &Action,
        binding: GeometryBinding,
        permit: Option<&crate::contact::StrikePermission>,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let mut cursor = Self::new(actor, 0.0, binding, budget)?;
        let aim = action.ranged.as_ref().ok_or(ExecutionError::Invariant)?;
        let custody = budget.reserve(
            heap_sum([
                size_of::<ReleaseRequest>(),
                action.id.len(),
                permit
                    .map_or(Some(0), |permit| {
                        permit.heap_bytes()?.checked_add(size_of_val(permit))
                    })
                    .ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        cursor.action_id = Some(action.id.clone());
        cursor.physical_life = aim.source_life;
        cursor.requested_ranged_release = Some(Box::new(ReleaseRequest {
            permit: permit.map(|value| Box::new(value.clone())),
            review: None,
            _custody: custody,
        }));
        Ok(cursor)
    }

    pub(crate) fn begin_requested_release(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<MoveAdvanceStep<'_>, ExecutionError> {
        match self.check_ranged(core)? {
            Progress::Geometry => Ok(MoveAdvanceStep::Geometry(self.queries()?)),
            Progress::Complete => Ok(MoveAdvanceStep::Complete),
            _ => Err(ExecutionError::Invariant),
        }
    }

    pub(crate) fn requested_release_result(
        &mut self,
    ) -> Result<
        (
            Option<crate::text::JsText>,
            Option<Box<(crate::contact::StrikePermission, ByteReservation)>>,
        ),
        ExecutionError,
    > {
        let requested = self
            .requested_ranged_release
            .take()
            .ok_or(ExecutionError::Invariant)?;
        Ok((self.failure.take(), requested.review))
    }

    fn ranged_fail(
        &mut self,
        reason: &str,
        core: &mut CoreMutation<'_>,
    ) -> Result<Progress, ExecutionError> {
        self.fail(reason)?;
        if self.requested_ranged_release.is_some() {
            self.phase = Phase::Done;
            return Ok(Progress::Complete);
        }
        self.drive(core, None)
    }
}

pub(super) fn selected_body<'a>(
    core: &'a CoreMutation<'_>,
    source: &Entity,
    aim: &RangedAim,
) -> Option<&'a Entity> {
    let target = aim.aim_target.as_ref()?;
    let state = &core.state;
    let policy = state.installed.manifest.ranged_policy.as_ref()?;
    let effect = state
        .installed
        .body_policy
        .as_ref()?
        .value()
        .combat
        .as_ref()?;
    let source_actor = source.actor.as_ref()?;
    state.physical.entities.get(&target.id).filter(|body| {
        body.physical_life() == Some(target.life)
            && policy.permits(body)
            && body.actor.as_ref().is_some_and(|target| {
                effect.permits_target(
                    &source_actor.controller,
                    &target.controller,
                    source_actor.controller == "player",
                )
            })
    })
}

fn origin(entity: &Entity) -> Result<Point, ExecutionError> {
    let mut point = entity
        .world_position()
        .ok_or(ExecutionError::InvalidPosition)?;
    point.y += entity.ordinary_body_profile().interaction_height;
    Ok(point)
}

fn aim_line(from: Point, target: Option<&Entity>, aim: &RangedAim, range: f64) -> Option<SightRay> {
    let to = match (target, aim.aim_point) {
        (Some(target), None) => crate::projectile::target_point(target)?,
        (None, Some(point)) => point,
        _ => return None,
    };
    let length = crate::spatial::distance(from, to);
    (length > f64::EPSILON && length <= range).then_some(SightRay { from, to })
}

impl MoveAdvanceCursor {
    /// A subject route owns its path, including deferred navigation results.
    /// Once it is exhausted, recheck current range before starting the timer.
    pub(super) fn advance_shot_approach(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<Progress, ExecutionError> {
        let id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
        let (actor, action) = bound(core, &self.actor_id, id, self.physical_life)?;
        let installed = core.state.installed.clone();
        if !action.path.is_empty() {
            if self.seconds == 0.0 {
                self.phase = Phase::Done;
                return Ok(Progress::Complete);
            }
            self.start_motion(
                core,
                installed.movement_speed(actor)? * self.seconds,
                Phase::PositiveMotion,
            )?;
            return self.drive(core, None);
        }
        if action.is_practice_shot() {
            self.check_practice(core)
        } else {
            self.check_ranged(core)
        }
    }

    fn replan_ranged_approach(
        &mut self,
        core: &mut CoreMutation<'_>,
        reach: f64,
    ) -> Result<Progress, ExecutionError> {
        let id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
        let (actor, action) = bound(core, &self.actor_id, id, self.physical_life)?;
        let installed = core.state.installed.clone();
        let rules = installed.ordinary_actions.value();
        if action.replans.unwrap_or(0) >= installed.movement_settings.max_replans {
            return self.ranged_fail(&rules.movement_changing_route, core);
        }
        let aim = action.ranged.as_ref().ok_or(ExecutionError::Invariant)?;
        let subject = selected_body(core, actor, aim).ok_or(ExecutionError::Invariant)?;
        let (route, mut storage) =
            crate::projectile::approach_to_shot(actor, subject, reach, &self.budget)?;
        storage.merge(self.budget.reserve(size_of::<GeometryQueries>())?)?;
        core.physical()
            .increment_action_replans(&self.actor_id, id)?;
        self.binding.serial = core.journal.next_provider_serial()?;
        let mut query = GeometryQueries::new(self.binding);
        query.routes = vec![route];
        self.queries = Some((query, storage));
        self.phase = Phase::Route;
        Ok(Progress::Geometry)
    }

    pub(super) fn check_ranged(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<Progress, ExecutionError> {
        let serial = core.journal.next_provider_serial()?;
        let id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
        let (actor, action) = bound(core, &self.actor_id, id, self.physical_life)?;
        let state = &core.state;
        let installed = state.installed.clone();
        let rules = installed.ordinary_actions.value();
        let Some(aim) = action.ranged.as_ref().filter(|aim| {
            aim.source_life == self.physical_life
                && action.ranged_policy_pin == installed.manifest.ranged_policy_pin
        }) else {
            return self.ranged_fail(&rules.not_applicable.message, core);
        };
        let (weapon, _) = installed_loadout(&installed, aim)?;
        let tool_id = action
            .weapon_item_id
            .as_deref()
            .ok_or(ExecutionError::Invariant)?;
        let ammo_id = action
            .ammo_item_id
            .as_deref()
            .ok_or(ExecutionError::Invariant)?;
        if !loadout::weapon(state, actor, Some(tool_id), false, |tool| {
            tool.pin == aim.tool
        })?
        .is_some()
            || !loadout::ammunition(
                state,
                actor,
                Some(ammo_id),
                &weapon.ammunition_kind,
                Some(action),
            )?
            .is_some()
            || !state.physical.holds.matches_item(
                &actor.id,
                id,
                &aim.reservation_id,
                ammo_id,
                1,
                &aim.ammunition,
            )
            || actor.actor.as_ref().is_some_and(|body| {
                body.combat_ready_at
                    .is_some_and(|at| at > state.physical.header.sim_time)
            })
        {
            return self.ranged_fail(&rules.not_applicable.message, core);
        }
        let subject = selected_body(core, actor, aim);
        if aim.aim_target.is_some() && subject.is_none() {
            return self.ranged_fail(&rules.not_applicable.message, core);
        }
        if action.stage != "approaching"
            && aim_line(origin(actor)?, subject, aim, weapon.range).is_none()
        {
            return self.ranged_fail(&rules.out_of_reach.message, core);
        }
        let ids = [subject.map_or("", |body| body.id.as_str())];
        self.binding.serial = serial;
        self.meal_sight = Some(
            SightBatch::prepare_with_point(
                &state.physical,
                &installed,
                &actor.id,
                &ids[..usize::from(subject.is_some())],
                aim.aim_point,
                self.binding,
                &self.budget,
            )
            .map_err(ExecutionError::Sensor)?,
        );
        self.phase = Phase::RangedLine;
        Ok(Progress::Geometry)
    }

    pub(super) fn finish_ranged_line(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: GeometryAnswers,
    ) -> Result<Progress, ExecutionError> {
        let sight = self
            .meal_sight
            .take()
            .ok_or(ExecutionError::Invariant)?
            .finish(answer)
            .map_err(ExecutionError::Sensor)?;
        let id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
        let (actor, action) = bound(core, &self.actor_id, id, self.physical_life)?;
        let aim = action.ranged.as_ref().ok_or(ExecutionError::Invariant)?;
        let installed = core.state.installed.clone();
        let rules = installed.ordinary_actions.value();
        let visible = match (aim.aim_target.as_ref(), aim.aim_point) {
            (Some(target), None) => sight.seen(&target.id) == Some(true),
            (None, Some(_)) => sight.point_seen() == Some(true),
            _ => false,
        };
        if !visible {
            return self.ranged_fail(&rules.not_applicable.message, core);
        }
        if action.stage == "approaching" {
            let (weapon, _) = installed_loadout(&installed, aim)?;
            let reach = crate::projectile::practice::approach_range(&installed, weapon.range)?;
            let subject = selected_body(core, actor, aim).ok_or(ExecutionError::Invariant)?;
            if aim_line(origin(actor)?, Some(subject), aim, reach).is_none() {
                return self.replan_ranged_approach(core, reach);
            }
            self.start_target_work(core, action.replans)?;
            self.phase = Phase::Done;
            return Ok(Progress::Complete);
        }
        let words = installed
            .occurrence_rules
            .value()
            .ranged
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        if aim.manual && self.requested_ranged_release.is_none() {
            if aim.ready {
                // The ordinary action boundary rechecks only this aimed
                // subject. Readiness was announced when its timer finished.
                self.phase = Phase::Done;
                return Ok(Progress::Complete);
            }
            let _event = self
                .budget
                .reserve(768 + 3 * actor.id.len() + id.len() + words.prepared.storage_bytes())?;
            core.physical().advance_timed_work(
                &self.actor_id,
                id,
                self.seconds,
                installed.time_epsilon,
            )?;
            let staged = core.stage_event(EventEmissionIntent {
                event_type: words.aim_ready.clone(),
                text: EmissionText::Narration(Narration {
                    parts: vec![
                        NarrationPart::Participant {
                            entity_id: self.actor_id.clone(),
                            role: PersonRole::Subject,
                            article: None,
                        },
                        NarrationPart::Literal(crate::text::JsText::concat(&[
                            &" ".into(),
                            &words.prepared,
                        ])),
                    ],
                }),
                audience: AudienceSelection::Explicit(vec![self.actor_id.clone()]),
                source_id: Some(self.actor_id.clone()),
                target_id: None,
                data: Some(IndexMap::from([(
                    "actionId".into(),
                    EventScalar::Text(id.into()),
                )])),
                scope: EventScope::Private,
                origin: None,
                exposure: None,
            })?;
            self.reserve(staged.id.len())?;
            self.event = Some(staged.id.clone());
            self.after_event = Phase::Done;
            return Ok(Progress::Occurrence(staged));
        }
        self.release_aimed_projectile(core)
    }

    fn release_aimed_projectile(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<Progress, ExecutionError> {
        let id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
        let (actor, action) = bound(core, &self.actor_id, id, self.physical_life)?;
        let aim = action.ranged.as_ref().ok_or(ExecutionError::Invariant)?;
        let state = &core.state;
        let installed = state.installed.clone();
        let (weapon, ammunition) = installed_loadout(&installed, aim)?;
        let words = installed
            .occurrence_rules
            .value()
            .ranged
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        let combat = installed.body_policy.as_ref();
        let target = selected_body(core, actor, aim);
        let nominal = (weapon.damage + ammunition.damage_bonus).max(0.0);
        let outgoing = scar_factor(
            combat.map(crate::install::VerifiedDefinition::value),
            actor,
            ScarEffect::OutgoingInjury,
        );
        let _review_storage;
        let reviewed = self
            .requested_ranged_release
            .as_ref()
            .and_then(|released| released.permit.as_deref());
        let digest = if let Some((target, identity)) = target.zip(aim.aim_target.as_ref()) {
            let injury = crate::contact::ContactInjury::read(&installed, actor, target)?;
            let maximum = injury.maximum(nominal);
            let current_digest =
                || review_digest(action, aim, identity, injury, maximum, &self.budget);
            if self.requested_ranged_release.is_some()
                || action.requires_lethal_review == Some(true)
            {
                let permission = if self.requested_ranged_release.is_some() {
                    reviewed
                } else {
                    action.lethal_permission.as_deref()
                };
                match review::check_damage(
                    &installed,
                    actor,
                    target,
                    maximum,
                    permission,
                    current_digest,
                )? {
                    Review::Allowed => {}
                    Review::Required if self.requested_ranged_release.is_some() => {
                        let (digest, _workspace) = current_digest()?;
                        let (permit, mut custody) =
                            review::prepare_digest(actor, target, &digest, &self.budget)?;
                        custody.resize(
                            custody
                                .bytes()
                                .checked_add(size_of::<ByteReservation>())
                                .ok_or(ExecutionError::Capacity)?,
                        )?;
                        self.requested_ranged_release
                            .as_mut()
                            .ok_or(ExecutionError::Invariant)?
                            .review = Some(Box::new((permit, custody)));
                        self.phase = Phase::Done;
                        return Ok(Progress::Complete);
                    }
                    Review::Required | Review::Changed => {
                        let rule = combat
                            .and_then(|body| body.value().lethal_attack_review.as_ref())
                            .ok_or(ExecutionError::Invariant)?;
                        return self.ranged_fail(&rule.description, core);
                    }
                }
            }
            let (digest, storage) = current_digest()?;
            _review_storage = storage;
            digest
        } else {
            return self.ranged_fail(
                &installed.ordinary_actions.value().not_applicable.message,
                core,
            );
        };
        let line =
            aim_line(origin(actor)?, target, aim, weapon.range).ok_or(ExecutionError::Invariant)?;
        let now = state.physical.header.sim_time;
        let recovery = now + weapon.recovery_seconds;
        let shot_storage = self.budget.reserve(
            4096 + 8
                * (id.len()
                    + actor.id.len()
                    + aim.heap_bytes().ok_or(ExecutionError::Capacity)?
                    + action
                        .lethal_permission
                        .heap_bytes()
                        .ok_or(ExecutionError::Capacity)?),
        )?;
        let _event = self.budget.reserve(
            2048 + 4
                * (id.len()
                    + actor.id.len()
                    + aim.heap_bytes().ok_or(ExecutionError::Capacity)?
                    + words.released.storage_bytes()),
        )?;
        let target_id = action.target_id.clone();
        let ammo = action
            .ammo_item_id
            .clone()
            .ok_or(ExecutionError::Invariant)?;
        let hold = aim.reservation_id.clone();
        let kind = weapon.ammunition_kind.clone();
        let flight = ProjectileFlight::from_action(
            actor,
            action,
            reviewed,
            ContactPolicy {
                pin: combat.map(|body| body.pin().clone()),
                response: combat
                    .and_then(|body| body.value().combat.as_ref())
                    .map_or(ProjectileContact::StopOnly, |policy| {
                        policy.projectile_contact
                    }),
            },
            digest.into(),
            line,
            now,
            weapon,
            nominal * outgoing,
            weapon.accuracy,
        )?;
        let projectile =
            self.commit_projectile(core, &hold, ammo, recovery, flight, shot_storage)?;
        let staged = crate::native_controller::feeding::stage_subject(
            core,
            &self.actor_id,
            target_id.as_deref(),
            &words.shot_released,
            words.released.clone(),
            IndexMap::from([
                ("actionId".into(), EventScalar::Text(id.into())),
                ("projectileId".into(), EventScalar::Text(projectile.into())),
                ("ammunitionKind".into(), EventScalar::Text(kind.into())),
                ("quantity".into(), EventScalar::Number(1.0)),
                (
                    "targetReference".into(),
                    EventScalar::Boolean(target_id.is_some()),
                ),
                ("semanticTrigger".into(), EventScalar::Boolean(true)),
            ]),
        )?;
        let mut result = installed
            .ordinary_actions
            .value()
            .movement_completed
            .outcome(true);
        result.code = "released".into();
        result.message = words.released.clone();
        result.spent = Some(1);
        self.production_result = Some(result);
        self.reserve(staged.id.len())?;
        self.event = Some(staged.id.clone());
        self.after_event = Phase::Finish;
        Ok(Progress::Occurrence(staged))
    }
}
