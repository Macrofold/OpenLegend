//! Preparing a shot binds current sight, loadout and one ammunition hold.
//! The clock later confirms the same live shot before moving any stock.
use super::*;
use crate::commands::RangedIntent;
use crate::commands::ranged_input::{LaunchApproval, check_launch_review};
use crate::contact::review::{ChosenContact, Review};
use crate::host::retained_size::heap_sum;
use crate::projectile::point_review::{PointReview, PointReviewStep};
use crate::projectile::{AimedLife, RangedAim, RangedTarget, RuntimeRangedMode, hold_id, loadout};
use crate::reception::SightBatch;

impl CommandCursor {
    pub(super) fn is_npc_ranged_choice(&self) -> bool {
        matches!(&self.command, NativeCommand::Ranged { envelope, intent }
            if envelope.human_initiated.is_none() && intent.npc_subject().is_some())
    }

    pub(super) fn prepare_ranged_start(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<bool, ExecutionError> {
        let NativeCommand::Ranged {
            envelope,
            intent:
                RangedIntent::Start {
                    mode,
                    target,
                    weapon,
                    ammunition,
                    auto_equip,
                },
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let state = &core.state;
        let installed = &state.installed;
        let ordinary = installed.ordinary_actions.value();
        let source = state
            .physical
            .entities
            .get(&envelope.actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let body = source.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
        let permission = match (&self.chosen_contact, body.controller.as_str()) {
            (Some(ChosenContact::Player(permission)), "player")
                if envelope.human_initiated == Some(true) => permission.as_deref(),
            (Some(ChosenContact::Npc), "npc") if self.is_npc_ranged_choice() => None,
            _ => return Err(ExecutionError::UnsupportedFamily),
        };
        let Some(policy) = installed.manifest.ranged_policy.as_ref() else {
            self.refuse(&ordinary.not_applicable);
            return Ok(false);
        };
        let pin = installed
            .manifest
            .ranged_policy_pin
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        if !installed
            .retained
            .item_handling_read
            .can_handle(&source.spatial.body.id)
            || body
                .combat_ready_at
                .is_some_and(|ready| ready > state.physical.header.sim_time)
        {
            self.refuse(&ordinary.not_applicable);
            return Ok(false);
        }
        let mut point = None;
        let seen_body = match target {
            RangedTarget::Subject { id, life } => {
                let subject = crate::projectile::selected_body(state, source, (id, *life))
                    .filter(|subject| {
                        *mode != RuntimeRangedMode::Hunt
                            || crate::projectile::may_hunt(installed, subject)
                    });
                let Some(subject) = subject else {
                    self.discovery_result(false, "invalid-target", &policy.invalid_target_text)?;
                    return Ok(false);
                };
                Some(subject)
            }
            RangedTarget::Point {
                point: selected,
                subject,
            } => {
                if !policy.point_fire || *mode == RuntimeRangedMode::Hunt {
                    self.discovery_result(false, "invalid-target", &policy.invalid_target_text)?;
                    return Ok(false);
                }
                point = Some(*selected);
                if let Some(subject) = subject {
                    let Some(body) = state.physical.entities.get(&subject.id).filter(|body| {
                        body.actively_participates()
                            && body.physical_life().unwrap_or(0) == subject.life
                    }) else {
                        self.refuse(&ordinary.not_applicable);
                        return Ok(false);
                    };
                    Some(body)
                } else {
                    None
                }
            }
        };
        let Some((tool, tool_type)) =
            loadout::weapon(state, source, weapon.as_deref(), *auto_equip, |_| true)?
        else {
            self.refuse(&ordinary.not_applicable);
            return Ok(false);
        };
        if !tool.equipped {
            let entity = state.physical.entities.get(tool.id).ok_or(ExecutionError::Invariant)?;
            if !crate::execution::equipment_can_equip(state, source, entity, true, &self.budget)? {
                self.refuse(&ordinary.not_applicable);
                return Ok(false);
            }
        }
        let weapon = tool_type
            .ranged_weapon
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        let Some((stock, stock_type)) = loadout::ammunition(
            state,
            source,
            ammunition.as_deref(),
            &weapon.ammunition_kind,
            loadout::StockAdmission::Replace(&self.budget),
        )?
        else {
            let profile = &installed.content.profile;
            let message = crate::worlds::activity_display::ranged_ammunition_unavailable((
                &profile.id,
                profile.version,
            ))
            .unwrap_or(&ordinary.not_applicable.message);
            self.discovery_result(false, &ordinary.not_applicable.code, message)?;
            return Ok(false);
        };
        let permission_size = permission
            .as_ref()
            .map_or(Some(0), |value| value.heap_bytes())
            .ok_or(ExecutionError::Capacity)?;
        let working_copy = heap_sum([
            envelope.id.len() * 2 + 96,
            target
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?
                .checked_mul(2)
                .ok_or(ExecutionError::Capacity)?,
            tool.id.len(),
            stock.id.len(),
            tool_type.pin.heap_bytes().ok_or(ExecutionError::Capacity)?,
            stock_type
                .pin
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?,
            pin.heap_bytes().ok_or(ExecutionError::Capacity)?,
            permission_size,
        ])
        .ok_or(ExecutionError::Capacity)?;
        self.action_storage = Some(self.budget.reserve(working_copy)?);
        let mut aim = RangedAim {
            source_life: source.physical_life().ok_or(ExecutionError::MissingActor)?,
            tool: tool_type.pin.clone(),
            ammunition: stock_type.pin.clone(),
            reservation_id: hold_id(&envelope.id),
            manual: *mode == RuntimeRangedMode::Aim,
            ready: false,
            aim_target: None,
            aim_point: None,
            aim_point_subject: None,
            observed_motion: None,
        };
        match target {
            RangedTarget::Subject { id, life } => {
                aim.aim_target = Some(AimedLife {
                    id: id.clone(),
                    life: *life,
                })
            }
            RangedTarget::Point { point, subject } => {
                aim.aim_point = Some(*point);
                aim.aim_point_subject = subject.clone();
            }
        }
        let mut action = Action::ranged_attack(
            envelope.id.clone(),
            *mode,
            aim,
            tool.id.into(),
            stock.id.into(),
            pin.clone(),
            policy.windup_seconds,
        );
        if self.timed_begin() {
            let Some(timing) = tool_type.execution.as_deref().filter(|_| *mode == RuntimeRangedMode::Aim) else {
                self.refuse(&ordinary.not_applicable);
                return Ok(false);
            };
            let (execution, storage) = crate::attack_execution::AttackExecutionState::prepare(
                timing, &tool_type.pin, &self.budget,
            )?;
            action.attack_execution = Some(execution);
            self.action_storage.as_mut().ok_or(ExecutionError::Invariant)?.merge(storage)?;
        }
        self.action = Some(action);
        let ids = [seen_body.map_or("", |body| body.id.as_str())];
        self.binding.serial = core.journal.next_provider_serial()?;
        self.sight = Some(
            SightBatch::prepare_with_point(
                &state.physical,
                installed,
                &source.id,
                &ids[..usize::from(seen_body.is_some())],
                point,
                self.binding,
                &self.budget,
            )
            .map_err(ExecutionError::Sensor)?,
        );
        self.phase = Phase::RangedSight;
        Ok(true)
    }

    pub(super) fn prepare_ranged_view(
        &mut self,
        core: &CoreMutation<'_>,
    ) -> Result<(), ExecutionError> {
        let state = &core.state;
        let action = self
            .action
            .as_ref()
            .or_else(|| {
                let NativeCommand::Ranged {
                    intent: RangedIntent::Release { action, .. },
                    ..
                } = &self.command
                else {
                    return None;
                };
                state
                    .physical
                    .entities
                    .get(self.actor_id())?
                    .actor
                    .as_ref()?
                    .action
                    .as_ref()
                    .filter(|current| current.id == *action)
            })
            .ok_or(ExecutionError::Invariant)?;
        let (view, storage) = crate::contact::review::ranged_activity_view(
            state,
            self.actor_id(),
            action,
            self.strike_confirmation.as_ref().map(|review| review.0.target_id()),
            &self.budget,
        )?;
        self.view = Some(view);
        self.view_reservation = Some(storage);
        Ok(())
    }
}

impl CommandCursor {
    pub(super) fn finish_ranged_sight(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: GeometryAnswers,
    ) -> Result<(), ExecutionError> {
        let NativeCommand::Ranged {
            intent: RangedIntent::Start { mode, target, .. },
            ..
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let observed = self
            .sight
            .take()
            .ok_or(ExecutionError::Invariant)?
            .finish(answer)
            .map_err(ExecutionError::Sensor)?;
        let state = &core.state;
        let installed = &state.installed;
        let ordinary = installed.ordinary_actions.value();
        let selected = match target {
            RangedTarget::Subject { id, .. } => Some(id.as_str()),
            RangedTarget::Point { subject, .. } => {
                subject.as_ref().map(|subject| subject.id.as_str())
            }
        };
        let permitted = match target {
            RangedTarget::Subject { id, .. } => observed.seen(id) == Some(true),
            RangedTarget::Point { point, subject } => {
                observed.point_seen() == Some(true)
                    || match subject
                        .as_ref()
                        .filter(|body| observed.seen(&body.id) == Some(true))
                        .and_then(|body| state.physical.entities.get(&body.id))
                    {
                        Some(body) => {
                            crate::projectile::inside_current_body(body, *point, &self.budget)?
                        }
                        None => false,
                    }
            }
        };
        if !permitted {
            if matches!(target, RangedTarget::Subject { .. }) {
                return self.discovery_refuse(
                    &installed.occurrence_rules.value().response.offers.availability.unperceived,
                );
            }
            self.refuse(&ordinary.not_applicable);
            return Ok(());
        }
        let source = state
            .physical
            .entities
            .get(self.actor_id())
            .ok_or(ExecutionError::MissingActor)?;
        let action = self.action.as_ref().ok_or(ExecutionError::Invariant)?;
        let aim = action.ranged.as_ref().ok_or(ExecutionError::Invariant)?;
        let (weapon, ammunition) = crate::projectile::loadout::installed_loadout(installed, aim)?;
        let policy = installed
            .manifest
            .ranged_policy
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        let looked_at = selected.and_then(|id| state.physical.entities.get(id));
        let mut origin = source
            .world_position()
            .ok_or(ExecutionError::InvalidPosition)?;
        origin.y += source.ordinary_body_profile().interaction_height;
        let destination = if let Some(point) = aim.aim_point {
            point
        } else {
            crate::projectile::firing_line(source, looked_at.ok_or(ExecutionError::Invariant)?)
                .ok_or(ExecutionError::InvalidPosition)?
                .to
        };
        let distance = crate::spatial::distance(origin, destination);
        if !distance.is_finite()
            || distance <= f64::EPSILON
            || aim.aim_point.is_some() && distance > weapon.range
        {
            self.refuse(&ordinary.out_of_reach);
            return Ok(());
        }
        let next = if !self.timed_begin() && aim.aim_target.is_some() && distance > policy.approach_range(weapon.range) {
            Phase::FeedApproach
        } else {
            Phase::Prepared
        };
        let aim_point = aim.aim_point;
        if let Some((subject, target)) = looked_at.zip(aim.aim_target.as_ref()) {
            if (*mode != RuntimeRangedMode::Aim || self.timed_begin())
                && let Some(ChosenContact::Player(value)) = &self.chosen_contact
            {
                let chosen = value.as_deref();
                let injury = crate::contact::ContactInjury::read(installed, source, subject)?;
                let factor = if self.timed_begin() {
                    installed.retained.items.get(&aim.tool.id)
                        .and_then(|tool| tool.execution.as_deref())
                        .ok_or(ExecutionError::Invariant)?.maximum_injury_factor()
                } else {
                    1.0
                };
                let maximum = injury.maximum((weapon.damage + ammunition.damage_bonus).max(0.0) * factor);
                let digest = || {
                    super::super::ranged_input::review_digest(
                        action,
                        aim,
                        target,
                        injury,
                        maximum,
                        None,
                        &self.budget,
                    )
                };
                match crate::contact::review::check_damage(
                    installed, source, subject, maximum, chosen, digest,
                )? {
                    Review::Allowed => {}
                    Review::Required => {
                        let (digest, _workspace) = digest()?;
                        let (permit, mut custody) = crate::contact::review::prepare_digest(
                            source,
                            subject,
                            &digest,
                            &self.budget,
                        )?;
                        custody.resize(
                            custody
                                .bytes()
                                .checked_add(size_of::<ByteReservation>())
                                .ok_or(ExecutionError::Capacity)?,
                        )?;
                        self.strike_confirmation = Some(Box::new((permit, custody)));
                        self.phase = Phase::Choice;
                        return Ok(());
                    }
                    Review::Changed => {
                        let rule = installed
                            .body_policy
                            .as_ref()
                            .and_then(|body| body.value().lethal_attack_review.as_ref())
                            .ok_or(ExecutionError::InvalidCheckpoint)?;
                        return self.discovery_result(
                            false,
                            "lethal-review-stale",
                            &rule.description,
                        );
                    }
                }
                let action = self.action.as_mut().ok_or(ExecutionError::Invariant)?;
                action.requires_lethal_review = Some(true);
                action.lethal_permission = chosen.map(|permit| Box::new(permit.clone()));
            }
        }
        if *mode == RuntimeRangedMode::ShootOnce || self.timed_begin() {
            if let Some(point) = aim_point {
                let mut binding = self.binding;
                binding.serial = core.journal.next_provider_serial()?;
                if let Some(review) = PointReview::prepare(
                    core,
                    self.actor_id(),
                    point,
                    weapon.range,
                    binding,
                    &self.budget,
                )? {
                    let custody = self
                        .budget
                        .reserve(size_of::<(PointReview, ByteReservation)>())?;
                    self.ranged_point_review = Some(Box::new((review, custody)));
                    self.phase = Phase::RangedPointReview;
                    return Ok(());
                }
                self.check_initial_point(core, None)?;
                return Ok(());
            }
        }
        self.phase = next;
        Ok(())
    }

    pub(super) fn finish_ranged_point_review(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: GeometryAnswers,
    ) -> Result<Progress, ExecutionError> {
        let (review, custody) = *self
            .ranged_point_review
            .take()
            .ok_or(ExecutionError::Invariant)?;
        match review.finish(core, answer, &self.budget)? {
            PointReviewStep::Geometry(next) => {
                self.ranged_point_review = Some(Box::new((next, custody)));
                Ok(Progress::Geometry)
            }
            PointReviewStep::Complete(indicated) => {
                self.check_initial_point(core, indicated.as_ref().map(|(body, _)| body))?;
                self.drive(core, None)
            }
        }
    }

    fn check_initial_point(
        &mut self,
        core: &CoreMutation<'_>,
        indicated: Option<&AimedLife>,
    ) -> Result<(), ExecutionError> {
        let state = &core.state;
        let source = state
            .physical
            .entities
            .get(self.actor_id())
            .ok_or(ExecutionError::MissingActor)?;
        let installed = state.installed.clone();
        let action = self.action.as_ref().ok_or(ExecutionError::Invariant)?;
        let aim = action.ranged.as_ref().ok_or(ExecutionError::Invariant)?;
        let selection = aim.selected().ok_or(ExecutionError::Invariant)?;
        let subject = match indicated {
            Some(indicated) => {
                let Some(body) = crate::projectile::selected_body(
                    state,
                    source,
                    (&indicated.id, indicated.life),
                ) else {
                    self.refuse(&installed.ordinary_actions.value().not_applicable);
                    return Ok(());
                };
                Some(body)
            }
            None => None,
        };
        let (weapon, ammunition) = loadout::installed_loadout(&installed, aim)?;
        let Some(ChosenContact::Player(permission)) = self.chosen_contact.as_ref() else {
            return Err(ExecutionError::UnsupportedFamily);
        };
        let factor = if self.timed_begin() {
            installed.retained.items.get(&aim.tool.id)
                .and_then(|tool| tool.execution.as_deref())
                .ok_or(ExecutionError::Invariant)?.maximum_injury_factor()
        } else {
            1.0
        };
        match check_launch_review(
            &installed,
            source,
            action,
            None,
            selection,
            [None, subject],
            (weapon.damage + ammunition.damage_bonus).max(0.0) * factor,
            None,
            permission.as_deref(),
            &self.budget,
        )? {
            LaunchApproval::Allowed(_) => {
                let action = self.action.as_mut().ok_or(ExecutionError::Invariant)?;
                action.requires_lethal_review = Some(true);
                action.lethal_permission = permission
                    .as_ref()
                    .map(|permit| Box::new((**permit).clone()));
                self.phase = Phase::Prepared;
            }
            LaunchApproval::Required(permit, custody) => {
                self.strike_confirmation = Some(Box::new((permit, custody)));
                self.phase = Phase::Choice;
            }
            LaunchApproval::Changed => {
                let rules = installed
                    .body_policy
                    .as_ref()
                    .and_then(|body| body.value().lethal_attack_review.as_ref())
                    .ok_or(ExecutionError::InvalidCheckpoint)?;
                self.discovery_result(false, "lethal-review-stale", &rules.ranged_description)?;
            }
        }
        Ok(())
    }
}

impl CommandCursor {
    pub(super) fn begin_ranged_release(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<Progress, ExecutionError> {
        let NativeCommand::Ranged {
            intent: RangedIntent::Release { action: id, target },
            ..
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let installed = core.state.installed.clone();
        let ordinary = installed.ordinary_actions.value();
        let Some(ChosenContact::Player(permission)) = self.chosen_contact.as_ref() else {
            return Err(ExecutionError::UnsupportedFamily);
        };
        let actor = core
            .state
            .physical
            .entities
            .get(self.actor_id())
            .ok_or(ExecutionError::MissingActor)?;
        let (input, may_wait) = self.release_sample();
        let Some(action) = actor
            .actor
            .as_ref()
            .filter(|body| body.controller == "player")
            .and_then(|body| body.action.as_ref())
            .filter(|action| action.id == *id
                && (action.holds_ready_aim() || may_wait
                    && action.stage=="working"
                    && action.ranged.as_ref().is_some_and(|aim| aim.manual)
                    && action.attack_execution.as_ref().is_some_and(|execution| execution.pending_release.is_none()))
                && (input == crate::attack_execution::TimedReleaseInput::Ordinary
                    || action.attack_execution.is_some()))
        else {
            self.refuse(&ordinary.not_applicable);
            return self.drive(core, None);
        };
        let release = crate::movement::MoveAdvanceCursor::release_request(
            &actor.id,
            action,
            self.binding,
            permission.as_deref(),
            target.as_ref().map(RangedTarget::selected),
            input,
            may_wait,
            &self.budget,
        )?;
        self.ranged_release = Some(Box::new(release));
        self.phase = Phase::RangedRelease;
        self.drive_ranged_release(core, None)
    }

    pub(super) fn drive_ranged_release(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<CommandAnswer>,
    ) -> Result<Progress, ExecutionError> {
        use crate::movement::{MoveAdvanceAnswer, MoveAdvanceStep};
        let child = self
            .ranged_release
            .as_mut()
            .ok_or(ExecutionError::Invariant)?;
        let mut step = match answer {
            None => child.begin_requested_release(core)?,
            Some(CommandAnswer::Geometry(answer)) => {
                child.step(core, Some(MoveAdvanceAnswer::Geometry(answer)))?
            }
            Some(CommandAnswer::Occurrence(answer)) => {
                child.step(core, Some(MoveAdvanceAnswer::Occurrence(answer)))?
            }
            _ => return Err(ExecutionError::UnfinishedOccurrence),
        };
        loop {
            match step {
                MoveAdvanceStep::Geometry(_) => return Ok(Progress::Geometry),
                MoveAdvanceStep::Occurrence(event) => return Ok(Progress::Occurrence(event)),
                MoveAdvanceStep::Personal(pending) => {
                    let prepared =
                        crate::experience::prepare_activity_result(core, pending, &self.budget)
                            .map_err(|_| ExecutionError::UnfinishedOccurrence)?;
                    let schema = core.state.installed.schema.clone();
                    let result =
                        crate::experience::acquire_activity_result(core, prepared, &schema)
                            .map_err(|_| ExecutionError::UnfinishedOccurrence)?;
                    step = child.step(core, Some(MoveAdvanceAnswer::Personal(result)))?;
                }
                MoveAdvanceStep::Complete => break,
            }
        }
        let (failure, review, pending) = child.requested_release_result()?;
        self.ranged_release = None;
        if let Some(review) = review {
            self.strike_confirmation = Some(review);
            self.phase = Phase::Choice;
        } else if let Some(message) = failure {
            self.reserve(message.storage_bytes() + "aim-unavailable".len())?;
            let mut result = outcome(false, "aim-unavailable", "");
            result.message = message;
            self.outcome = Some(result);
            self.phase = Phase::Done;
        } else if pending {
            let NativeCommand::Ranged { intent: RangedIntent::Release { action, .. }, .. } =
                &self.command else { return Err(ExecutionError::Invariant); };
            let words = core.state.installed.ordinary_actions.value();
            let mut result = words.accepted.outcome(true);
            self._reservation.resize(heap_sum([
                self._reservation.bytes(), "release-requested".len(), result.message.storage_bytes(), action.len(),
            ]).ok_or(ExecutionError::Capacity)?)?;
            result.code = "release-requested".into();
            result.action_id = Some(action.clone());
            self.outcome = Some(result);
            self.phase = Phase::Tail;
        } else {
            let released = &core
                .state
                .installed
                .occurrence_rules
                .value()
                .ranged
                .as_ref()
                .ok_or(ExecutionError::Invariant)?
                .released;
            self.reserve(released.storage_bytes() + "released".len())?;
            let mut result = outcome(true, "released", "");
            result.message = released.clone();
            result.spent = Some(1);
            self.outcome = Some(result);
            self.phase = Phase::Tail;
        }
        self.drive(core, None)
    }
}

impl CommandCursor {
    pub(super) fn equip_ranged(&self, core: &mut CoreMutation<'_>) -> Result<(), ExecutionError> {
        let NativeCommand::Ranged {
            intent: RangedIntent::Start { auto_equip: true, weapon: Some(item), .. },
            ..
        } = &self.command
        else {
            return Ok(());
        };
        let actor = self.actor_id();
        let attached = core.state.physical.entities.get(item).is_some_and(|lot| {
            matches!(&lot.placement, Some(crate::state::Placement::Attached { parent_entity_id, .. })
                if parent_entity_id == actor)
        });
        if !attached && !matches!(
            core.equip_for_action(actor, item)?,
            crate::execution::EquipmentDecision::Applied { .. }
        ) {
            // Readiness already checked this exact item and its conflicts.
            // An unexpected failed write must roll back the entire replacement.
            return Err(ExecutionError::Invariant);
        }
        Ok(())
    }
}

impl CommandCursor {
    pub(super) fn ranged_started(
        &mut self,
        core: &mut CoreMutation<'_>,
        source: &str,
    ) -> Result<Progress, ExecutionError> {
        let installed = core.state.installed.clone();
        let events = installed.ordinary_actions.value();
        let action = core
            .state
            .physical
            .entities
            .get(source)
            .and_then(|entity| entity.actor.as_ref())
            .and_then(|actor| actor.action.as_ref())
            .filter(|action| action.is_ranged_attack())
            .ok_or(ExecutionError::Invariant)?;
        let Some((target, words)) = action.target_id.as_deref().zip(
            installed
                .body_policy
                .as_ref()
                .and_then(|body| body.value().combat.as_ref())
                .and_then(|combat| combat.encounters.as_ref())
                .map(|policy| policy.aiming.as_str()),
        ) else {
            self.phase = Phase::AfterDeparture;
            return self.drive(core, None);
        };
        let _workspace = self.budget.reserve(
            1024 + 3 * (source.len() + target.len() + action.id.len() + words.len())
                + events.action_started_event.len(),
        )?;
        let staged = core.stage_event(EventEmissionIntent {
            event_type: events.action_started_event.clone(),
            text: EmissionText::Narration(
                crate::reception::combat_observation::preparation_narration(source, target, words),
            ),
            audience: AudienceSelection::Physical,
            source_id: Some(source.into()),
            target_id: Some(target.into()),
            data: Some(IndexMap::from([
                (
                    "actionType".into(),
                    crate::reception::EventScalar::Text(action.kind.clone().into()),
                ),
                (
                    "actionId".into(),
                    crate::reception::EventScalar::Text(action.id.clone().into()),
                ),
            ])),
            scope: EventScope::External,
            origin: None,
            exposure: None,
        })?;
        self.reserve(staged.id.len())?;
        self.event = Some(staged.id.clone());
        self.after_event = Phase::AfterDeparture;
        Ok(Progress::Occurrence(staged))
    }
}
