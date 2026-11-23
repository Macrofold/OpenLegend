//! Launch is one ordinary world mutation: settle the selected held lot and
//! release a funded independent flight at the current clock boundary.
use super::*;
use crate::item_holds::ClaimState;
use crate::attack_execution::TimedReleaseInput;
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
use crate::commands::ranged_input::{LaunchApproval, check_launch_review, review_digest};
use crate::contact::review::{self, Review};
use crate::geometry::SightRay;
use crate::host::retained_size::HeapBytes;
use crate::projectile::loadout::installed_loadout;
use crate::projectile::point_review::{PointReview, PointReviewStep};
use crate::projectile::{
    ContactPolicy, RangedAim, RangedTarget, RuntimeRangedTarget, loadout, selected_body,
};
use crate::reception::{EventScalar, SightBatch};

pub(super) struct PointWork {
    phase: PointReview,
    original_seen: bool,
    custody: ByteReservation,
}

impl PointWork {
    pub(super) fn queries(&self) -> &GeometryQueries {
        self.phase.queries()
    }
}

pub(super) struct ReleaseRequest {
    permit: Option<Box<crate::contact::StrikePermission>>,
    target: Option<RangedTarget>,
    input: TimedReleaseInput,
    may_wait: bool,
    pending: bool,
    review: Option<Box<(crate::contact::StrikePermission, ByteReservation)>>,
    _custody: ByteReservation,
}

impl MoveAdvanceCursor {
    pub(crate) fn release_request(
        actor: &str,
        action: &Action,
        binding: GeometryBinding,
        permit: Option<&crate::contact::StrikePermission>,
        target: Option<RuntimeRangedTarget<'_>>,
        input: TimedReleaseInput,
        may_wait: bool,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let mut cursor = Self::new(actor, 0.0, binding, budget)?;
        let aim = action.ranged.as_ref().ok_or(ExecutionError::Invariant)?;
        let custody = budget.reserve(
            heap_sum([
                size_of::<ReleaseRequest>(),
                action.id.len(),
                target.map_or(0, RuntimeRangedTarget::selected_text_bytes),
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
            target: target.map(RangedTarget::bound),
            input,
            may_wait,
            pending: false,
            review: None,
            _custody: custody,
        }));
        Ok(cursor)
    }

    pub(super) fn requested_timing(&self) -> Option<TimedReleaseInput> {
        self.requested_ranged_release.as_ref().map(|request| request.input)
    }

    /// The launch owner has completed the current target/review checks. If
    /// the timed preparation is still winding up, save only this one choice.
    pub(super) fn prepare_early_ranged_release(
        &self,
        selection: RuntimeRangedTarget<'_>,
    ) -> Result<(Box<crate::attack_execution::PendingRelease>, ByteReservation), ExecutionError> {
        let request = self.requested_ranged_release.as_ref()
            .filter(|request| request.may_wait).ok_or(ExecutionError::Invariant)?;
        crate::attack_execution::PendingRelease::prepare(
            request.input, Some(selection), request.permit.as_deref(), &self.budget,
        )
    }

    pub(super) fn retain_early_ranged_release(
        &mut self,
        core: &mut CoreMutation<'_>,
        pending: Box<crate::attack_execution::PendingRelease>,
        storage: ByteReservation,
    ) -> Result<Progress, ExecutionError> {
        let action = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
        core.physical().hold_attack_release(&self.actor_id, action, pending, storage)?;
        self.requested_ranged_release.as_mut().ok_or(ExecutionError::Invariant)?.pending = true;
        self.phase = Phase::Done;
        Ok(Progress::Complete)
    }

    fn selected_shot<'a>(
        &'a self,
        aim: &'a RangedAim,
    ) -> Result<RuntimeRangedTarget<'a>, ExecutionError> {
        self.requested_ranged_release
            .as_ref()
            .and_then(|request| request.target.as_ref().map(RangedTarget::selected))
            .or_else(|| aim.selected())
            .ok_or(ExecutionError::Invariant)
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
            bool,
        ),
        ExecutionError,
    > {
        let requested = self
            .requested_ranged_release
            .take()
            .ok_or(ExecutionError::Invariant)?;
        Ok((self.failure.take(), requested.review, requested.pending))
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

fn origin(entity: &Entity) -> Result<Point, ExecutionError> {
    let mut point = entity
        .world_position()
        .ok_or(ExecutionError::InvalidPosition)?;
    point.y += entity.ordinary_body_profile().interaction_height;
    Ok(point)
}

fn aim_line(from: Point, to: Point, range: f64) -> Option<SightRay> {
    let length = crate::spatial::distance(from, to);
    (length > f64::EPSILON && length <= range).then_some(SightRay { from, to })
}

fn geometry_target<'a>(
    core: &'a CoreMutation<'_>,
    source: &Entity,
    selection: RuntimeRangedTarget<'_>,
) -> Result<Option<(Option<&'a Entity>, Point)>, ExecutionError> {
    match selection {
        RuntimeRangedTarget::Subject { id, life } => {
            let Some(body) = selected_body(core.state, source, (id, life)) else {
                return Ok(None);
            };
            let point =
                crate::projectile::target_point(body).ok_or(ExecutionError::InvalidPosition)?;
            Ok(Some((Some(body), point)))
        }
        RuntimeRangedTarget::Point { point, subject } => {
            if !core
                .state
                .installed
                .manifest
                .ranged_policy
                .as_ref()
                .is_some_and(|policy| policy.point_fire)
            {
                return Ok(None);
            }
            let body = subject.and_then(|(id, life)| {
                core.state.physical.entities.get(id).filter(|body| {
                    body.actively_participates() && body.physical_life() == Some(life)
                })
            });
            Ok(Some((body, point)))
        }
    }
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
        let target = aim.aim_target.as_ref().ok_or(ExecutionError::Invariant)?;
        let subject = selected_body(core.state, actor, (&target.id, target.life))
            .ok_or(ExecutionError::Invariant)?;
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
        if self.requested_ranged_release.as_ref().is_some_and(|request| !aim.ready
            && (!request.may_wait || action.attack_execution.as_ref().is_none_or(|execution| {
                execution.pending_release.is_some()
            })))
        {
            return self.ranged_fail(&rules.not_applicable.message, core);
        }
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
                loadout::StockAdmission::CurrentHold(action),
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
        if aim.manual
            && aim.aim_target.is_some()
            && action.stage == "working"
            && self.requested_ranged_release.is_none()
        {
            // A held aim owns its tool and stone. Sight of the original
            // subject is needed for release toward them, or for approach,
            // and cannot cancel the player's option to redirect.
            return self.finish_manual_aim(core);
        }
        let selection = self.selected_shot(aim)?;
        let Some((subject, point)) = geometry_target(core, actor, selection)? else {
            return self.ranged_fail(&rules.not_applicable.message, core);
        };
        if action.stage != "approaching" && aim_line(origin(actor)?, point, weapon.range).is_none()
        {
            return self.ranged_fail(&rules.out_of_reach.message, core);
        }
        let original = aim
            .aim_target
            .as_ref()
            .and_then(|target| selected_body(core.state, actor, (&target.id, target.life)))
            .filter(|old| subject.is_none_or(|new| new.id != old.id));
        let subjects = [
            subject.map(|body| body.id.as_str()),
            original.map(|body| body.id.as_str()),
        ];
        let mut ids = [""; 2];
        let mut count = 0;
        for id in subjects.into_iter().flatten() {
            ids[count] = id;
            count += 1;
        }
        let point_check = matches!(selection, RuntimeRangedTarget::Point { .. }).then_some(point);
        self.binding.serial = serial;
        self.meal_sight = Some(
            SightBatch::prepare_with_point(
                &state.physical,
                &installed,
                &actor.id,
                &ids[..count],
                point_check,
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
        let selection = self.selected_shot(aim)?;
        let Some((subject, point)) = geometry_target(core, actor, selection)? else {
            return self.ranged_fail(&rules.not_applicable.message, core);
        };
        let visible = match selection {
            RuntimeRangedTarget::Subject { id, .. } => sight.seen(id) == Some(true),
            RuntimeRangedTarget::Point { .. } => {
                sight.point_seen() == Some(true)
                    || match subject.filter(|body| sight.seen(&body.id) == Some(true)) {
                        Some(body) => {
                            crate::projectile::inside_current_body(body, point, &self.budget)?
                        }
                        None => false,
                    }
            }
        };
        if !visible {
            let message = match selection {
                RuntimeRangedTarget::Subject { .. } => {
                    &installed.occurrence_rules.value().response.offers.availability.unperceived.message
                }
                RuntimeRangedTarget::Point { .. } => &rules.not_applicable.message,
            };
            return self.ranged_fail(message, core);
        }
        if action.stage == "approaching" {
            // Approaches belong to a selected subject. A point never chooses
            // movement or gives credit for the preceding travel interval.
            let (weapon, _) = installed_loadout(&installed, aim)?;
            let reach = crate::projectile::practice::approach_range(&installed, weapon.range)?;
            if aim_line(origin(actor)?, point, reach).is_none() {
                return self.replan_ranged_approach(core, reach);
            }
            self.start_target_work(core, action.replans)?;
            self.phase = Phase::Done;
            return Ok(Progress::Complete);
        }
        if aim.manual && self.requested_ranged_release.is_none() {
            return self.finish_manual_aim(core);
        }
        let original_seen = aim
            .aim_target
            .as_ref()
            .is_some_and(|target| sight.seen(&target.id) == Some(true));
        if let RuntimeRangedTarget::Point { point, .. } = selection {
            let (weapon, _) = installed_loadout(&installed, aim)?;
            let mut binding = self.binding;
            binding.serial = core.journal.next_provider_serial()?;
            if let Some(phase) = PointReview::prepare(
                core,
                &self.actor_id,
                point,
                weapon.range,
                binding,
                &self.budget,
            )? {
                let custody = self.budget.reserve(size_of::<PointWork>())?;
                self.ranged_point_review = Some(Box::new(PointWork {
                    phase,
                    original_seen,
                    custody,
                }));
                self.phase = Phase::RangedPointReview;
                return Ok(Progress::Geometry);
            }
        }
        self.release_aimed_projectile(core, original_seen, None)
    }

    fn finish_manual_aim(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<Progress, ExecutionError> {
        let id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
        let (actor, action) = bound(core, &self.actor_id, id, self.physical_life)?;
        let aim = action.ranged.as_ref().ok_or(ExecutionError::Invariant)?;
        let installed = core.state.installed.clone();
        let words = installed
            .occurrence_rules
            .value()
            .ranged
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        if aim.ready {
            // Readiness was announced when the preparation timer finished.
            self.phase = Phase::Done;
            return Ok(Progress::Complete);
        }
        let _event = self
            .budget
            .reserve(768 + 3 * actor.id.len() + id.len() + words.prepared.storage_bytes())?;
        let timing = action.attack_execution.is_some();
        if !core.physical().advance_timed_work(
            &self.actor_id,
            id,
            self.seconds,
            installed.time_epsilon,
        )? {
            self.phase = Phase::Done;
            return Ok(Progress::Complete);
        }
        if timing {
            core.physical().mark_attack_ready(&self.actor_id, id)?;
        }
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
        Ok(Progress::Occurrence(staged))
    }

    pub(super) fn finish_point_review(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: GeometryAnswers,
    ) -> Result<Progress, ExecutionError> {
        let work = self
            .ranged_point_review
            .take()
            .ok_or(ExecutionError::Invariant)?;
        let PointWork {
            phase,
            original_seen,
            custody,
        } = *work;
        match phase.finish(core, answer, &self.budget)? {
            PointReviewStep::Geometry(phase) => {
                self.ranged_point_review = Some(Box::new(PointWork {
                    phase,
                    original_seen,
                    custody,
                }));
                Ok(Progress::Geometry)
            }
            PointReviewStep::Complete(indicated) => self.release_aimed_projectile(
                core,
                original_seen,
                indicated.as_ref().map(|(body, _)| body),
            ),
        }
    }

    fn release_aimed_projectile(
        &mut self,
        core: &mut CoreMutation<'_>,
        original_seen: bool,
        indicated: Option<&crate::projectile::AimedLife>,
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
        let selection = self.selected_shot(aim)?;
        let (subject, point) =
            geometry_target(core, actor, selection)?.ok_or(ExecutionError::Invariant)?;
        let directed = match selection {
            RuntimeRangedTarget::Subject { id, life } => Some((id, life)),
            RuntimeRangedTarget::Point { .. } => None,
        };
        let indicated = match (directed, indicated) {
            (Some(_), _) => subject,
            (None, Some(selected)) => {
                let Some(body) = selected_body(core.state, actor, (&selected.id, selected.life))
                else {
                    return self.ranged_fail(
                        &installed.ordinary_actions.value().not_applicable.message,
                        core,
                    );
                };
                Some(body)
            }
            _ => None,
        };
        let nominal = (weapon.damage + ammunition.damage_bonus).max(0.0);
        let timing = action.attack_execution.as_deref().zip(self.requested_timing());
        let assessment = timing.map(|(timing, input)| timing.assess(input)).transpose()?;
        let reviewed_injury = nominal * assessment.as_ref().map_or(1.0, |release| release.injury_factor);
        let sample = timing.map(|(_, input)| input);
        let outgoing = scar_factor(
            combat.map(crate::install::VerifiedDefinition::value),
            actor,
            ScarEffect::OutgoingInjury,
        );
        let requested = self.requested_ranged_release.as_ref();
        let reviewed = requested.and_then(|request| request.permit.as_deref());
        let compound = requested.is_some_and(|request| request.target.is_some())
            || matches!(selection, RuntimeRangedTarget::Point { .. });
        let (digest, _review_storage) = if compound {
            let original = aim
                .aim_target
                .as_ref()
                .filter(|_| original_seen)
                .and_then(|old| selected_body(core.state, actor, (&old.id, old.life)));
            let final_subject =
                indicated.filter(|seen| original.is_none_or(|old| old.id != seen.id));
            let permission = requested.map_or(action.lethal_permission.as_deref(), |_| reviewed);
            match check_launch_review(
                &installed,
                actor,
                action,
                aim.manual.then_some(action.id.as_str()),
                selection,
                [original, final_subject],
                reviewed_injury,
                sample,
                permission,
                &self.budget,
            )? {
                LaunchApproval::Allowed(review) => (review.digest, review._workspace),
                LaunchApproval::Required(permission, custody) if requested.is_some() => {
                    self.requested_ranged_release
                        .as_mut()
                        .ok_or(ExecutionError::Invariant)?
                        .review = Some(Box::new((permission, custody)));
                    self.phase = Phase::Done;
                    return Ok(Progress::Complete);
                }
                LaunchApproval::Required(..) | LaunchApproval::Changed => {
                    let rule = combat
                        .and_then(|body| body.value().lethal_attack_review.as_ref())
                        .ok_or(ExecutionError::Invariant)?;
                    return self.ranged_fail(&rule.ranged_description, core);
                }
            }
        } else if let Some((target, identity)) = subject.zip(aim.aim_target.as_ref()) {
            let injury = crate::contact::ContactInjury::read(&installed, actor, target)?;
            let maximum = injury.maximum(reviewed_injury);
            let current_digest =
                || review_digest(action, aim, identity, injury, maximum, sample, &self.budget);
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
            (digest, storage)
        } else {
            return self.ranged_fail(
                &installed.ordinary_actions.value().not_applicable.message,
                core,
            );
        };
        if !aim.ready && let Some((timing, _)) = timing {
            if timing.pending_release.is_some()
                || requested.is_none_or(|request| !request.may_wait)
            {
                return self.ranged_fail(&installed.ordinary_actions.value().not_applicable.message, core);
            }
            let (pending, storage) = self.prepare_early_ranged_release(selection)?;
            return self.retain_early_ranged_release(core, pending, storage);
        }
        let now = state.physical.header.sim_time;
        let committed = timing.zip(assessment).map(|((timing, _), assessment)| {
            timing.commit(assessment, now, &self.budget)
        }).transpose()?;
        let from = origin(actor)?;
        let observed = directed.and_then(|(id, life)| {
            aim.aim_target.as_ref().filter(|target| target.id == id && target.life == life)
                .and(aim.observed_motion.as_ref())
        });
        let aimed = crate::projectile::leading::intercept_point(
            from, point, observed, now, weapon.flight_speed, weapon.range, installed.spatial.epsilon,
        );
        let line = aim_line(from, aimed, weapon.range).or_else(|| aim_line(from, point, weapon.range))
            .ok_or(ExecutionError::Invariant)?;
        let recovery = now + weapon.recovery_seconds;
        let mut shot_storage = self.budget.reserve(
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
        let target_id = directed.map(|(id, _)| id.to_owned());
        let ammo = action
            .ammo_item_id
            .clone()
            .ok_or(ExecutionError::Invariant)?;
        let hold = aim.reservation_id.clone();
        let kind = weapon.ammunition_kind.clone();
        let mut flight = ProjectileFlight::from_action(
            actor,
            action,
            reviewed,
            directed,
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
        if let Some((evidence, mut storage)) = committed {
            let point_only = directed.is_none() && indicated.is_none();
            core.journal.activity.install_attack_execution(
                &mut core.state.activity, &self.actor_id, id, &evidence, point_only,
            ).map_err(ExecutionError::Activity)?;
            storage.resize(storage.bytes().checked_add(size_of_val(&evidence))
                .ok_or(ExecutionError::Capacity)?)?;
            shot_storage.merge(storage)?;
            flight.execution = Some(Box::new(evidence));
        }
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
