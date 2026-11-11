//! Select the earliest real deadline, move before endpoint effects, and keep
//! elapsed rates separate from the action identities captured at slice start.
use super::*;
use crate::native_controller::wander_remaining;
use crate::native_response::WanderClock;

impl AdvanceCursor {
    pub(super) fn prepare_slice(
        &mut self,
        core: &mut CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<(), AdvanceError> {
        if self.navigation_blocked {
            self.phase = Phase::Publish;
            return Ok(());
        }
        let installed = core.state.installed.clone();
        let participants = self.roster.as_ref().ok_or_else(invalid)?;
        let mut sample_preparation = None;
        if let Some(changes) = self.local_changes.take() {
            self.mechanics = if changes.same_roster(participants) {
                match self.mechanics.as_ref() {
                    Some(forecast) => {
                        forecast.refine(core, participants, &changes.handles, budget)?
                    }
                    None => None,
                }
            } else {
                None
            };
            if self.mechanics.is_some() {
                sample_preparation = Some(true)
            }
        }
        if self.mechanics.is_none() {
            let mut mechanics = MechanicalForecast::prepare(core, participants, budget)?;
            let saved = self.saved_interval.take();
            if let Some(saved) = &saved {
                if saved.remaining_seconds < mechanics.seconds {
                    mechanics.seconds = saved.remaining_seconds;
                    mechanics.ends_at = saved.ends_at;
                }
            }
            sample_preparation = Some(saved.is_some());
            self.mechanics = Some(mechanics);
        }
        if let Some(retain_sample) = sample_preparation {
            let mechanics = self.mechanics.as_ref().ok_or_else(invalid)?;
            for handle in &mechanics.private_walkers {
                let entity = core
                    .state
                    .physical
                    .entities
                    .resolve(*handle)
                    .ok_or(ExecutionError::Invariant)?;
                let action = entity
                    .actor
                    .as_ref()
                    .and_then(|actor| actor.action.as_ref())
                    .ok_or(ExecutionError::Invariant)?;
                let limit = mechanics.travel_for(*handle);
                let remaining = if retain_sample {
                    action
                        .motion_sample_remaining_metres
                        .unwrap_or(limit)
                        .min(limit)
                } else {
                    limit
                };
                let _name = budget.reserve(action.id.len())?;
                let id = action.id.clone();
                core.physical()
                    .set_motion_sample_remaining(*handle, &id, remaining)?;
            }
        }
        let now = core.state.physical.header.sim_time;
        let mechanics = self.mechanics.as_ref().ok_or_else(invalid)?;
        let review = next_animal_review(&core.state.physical, participants)?;
        let input = private_motion_seconds(
            &core.state.physical,
            &installed,
            participants,
            mechanics,
            (self.end_at - now).min(mechanics.seconds).min(review - now),
        )?;
        self.input_seconds = input_boundary(core, &self.inputs, mechanics, input)?;
        let binding = self.binding(core)?;
        self.steering_preparation = Some(SteeringPreparation::prepare(
            core,
            &self.inputs,
            self.input_seconds,
            binding,
            budget,
        )?);
        self.phase = Phase::Steering;
        Ok(())
    }
    pub(super) fn steer_slice(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<AdvanceAnswer>,
        budget: &ByteBudget,
    ) -> Result<Progress, AdvanceError> {
        let preparation = self.steering_preparation.as_ref().ok_or_else(invalid)?;
        if answer.is_none() && preparation.question().is_some() {
            return Ok(Progress::Geometry);
        }
        let answer = match answer {
            None => None,
            Some(AdvanceAnswer::Geometry(value)) => Some(value),
            _ => return Err(invalid().into()),
        };
        let steering = self
            .steering_preparation
            .take()
            .ok_or_else(invalid)?
            .finish(core, answer, budget)?;
        self.finish_slice(core, steering, budget)?;
        Ok(Progress::Continue)
    }
    fn finish_slice(
        &mut self,
        core: &mut CoreMutation<'_>,
        steering: PreparedSteering,
        budget: &ByteBudget,
    ) -> Result<(), AdvanceError> {
        let installed = core.state.installed.clone();
        let participants = self.roster.as_ref().ok_or_else(invalid)?;
        let mechanics = self.mechanics.as_ref().ok_or_else(invalid)?;
        let now = core.state.physical.header.sim_time;
        let review = next_animal_review(&core.state.physical, participants)?;
        let sensed = sensory_bound(
            core,
            participants,
            self.policies.as_mut().ok_or_else(invalid)?,
            self.input_seconds,
            !steering.routes.is_empty(),
            budget,
        )?;
        let mut seconds = sensed.seconds;
        // Only a stored absolute deadline owns an exact landing. A relative
        // duration keeps Source's subtraction residue; zeroing it early changes
        // shared-boundary work and later sampling chronology.
        let landing = mechanics.ends_at.is_some() && seconds >= mechanics.seconds;
        let mut endpoint = if landing && mechanics.ends_at.is_some() {
            mechanics.ends_at
        } else if seconds >= review - now {
            Some(review)
        } else {
            sensed.ends_at.filter(|at| seconds == *at - now)
        };
        if seconds >= self.end_at - now && endpoint.is_none_or(|at| at >= self.end_at) {
            endpoint = Some(self.end_at);
        }
        if let Some(at) = endpoint {
            seconds = at - now;
        }
        if !(seconds > 0.0) || !seconds.is_finite() {
            return Err(ExecutionError::Invariant.into());
        }
        self.working = Some(SliceActions::capture(core, participants, budget)?);
        // Eligibility is reconciled after any command/status work and before
        // the saved countdown receives time. No new decision receives a draw.
        for handle in participants.animals() {
            let entity = core
                .state
                .physical
                .entities
                .resolve(*handle)
                .ok_or(ExecutionError::Invariant)?;
            let _name = budget.reserve(entity.id.len())?;
            let id = entity.id.clone();
            reconcile_wander(
                &mut core.physical(),
                &installed,
                &id,
                installed.time_epsilon,
            )?;
            advance_wander_clock(&mut core.physical(), &id, seconds)?;
        }
        core.state.physical.header.sim_time = endpoint.unwrap_or(now + seconds);
        expire_sensory_awareness(core)?;
        for handle in participants.animals() {
            let entity = core
                .state
                .physical
                .entities
                .resolve(*handle)
                .ok_or(ExecutionError::Invariant)?;
            if entity.animal.as_ref().is_some_and(|animal| {
                animal
                    .acoustic_patterns
                    .values()
                    .any(|pattern| pattern.idle_expires_at <= core.state.physical.header.sim_time)
            }) {
                let _name = budget.reserve(entity.id.len())?;
                let id = entity.id.clone();
                expire_acoustic_patterns(&mut core.physical(), &id)?;
            }
        }
        let mechanics = self.mechanics.as_mut().ok_or_else(invalid)?;
        mechanics.seconds = if landing {
            0.0
        } else {
            (mechanics.seconds - seconds).max(0.0)
        };
        self.seconds = seconds;
        self.motion_slices += 1;
        self.slices_since_boundary += 1;
        self.slice_cursor = core.journal.physical.change_cursor();
        self.slice_events = self.event_count();
        self.slice_invalidated = false;
        self.boundary_recorded = false;
        self.motion = Some(MotionSliceCursor::new(
            self.working.take().ok_or_else(invalid)?,
            steering,
            self.input_seconds,
            seconds,
            self.binding(core)?,
            budget,
        )?);
        self.phase = Phase::Move;
        Ok(())
    }
    pub(super) fn move_slice(
        &mut self,
        core: &mut CoreMutation<'_>,
        mut answer: Option<AdvanceAnswer>,
        budget: &ByteBudget,
    ) -> Result<Progress, AdvanceError> {
        loop {
            let input = match answer.take() {
                None => self.motion_answer.take(),
                Some(AdvanceAnswer::Geometry(value)) => Some(MoveAdvanceAnswer::Geometry(value)),
                _ => return Err(invalid().into()),
            };
            match self.motion.as_mut().ok_or_else(invalid)?.step(
                core,
                self.mechanics.as_ref().ok_or_else(invalid)?,
                input,
            )? {
                MoveAdvanceStep::Geometry(_) => return Ok(Progress::Geometry),
                MoveAdvanceStep::Occurrence(value) => {
                    self.stage_event(core, value, EventDestination::Motion, budget)?;
                    return Ok(Progress::Event);
                }
                MoveAdvanceStep::Personal(pending) => {
                    let prepared = prepare_activity_result(core, pending, budget)?;
                    self.motion_answer =
                        Some(MoveAdvanceAnswer::Personal(acquire_activity_result(
                            core,
                            prepared,
                            &core.state.installed.schema.clone(),
                        )?));
                }
                MoveAdvanceStep::Complete => {
                    self.working = Some(self.motion.take().ok_or_else(invalid)?.into_actions()?);
                    self.select_wanderers(core)?;
                    self.phase = Phase::Wander;
                    return Ok(Progress::Continue);
                }
            }
        }
    }
    fn select_wanderers(&mut self, core: &CoreMutation<'_>) -> Result<(), AdvanceError> {
        self.choices.clear();
        let count = self.roster.as_ref().ok_or_else(invalid)?.animals().len();
        let needed = count.saturating_sub(self.choices.capacity());
        self.reserve(
            needed
                .checked_mul(size_of::<EntityHandle>())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        self.choices
            .try_reserve_exact(count)
            .map_err(|_| ExecutionError::Capacity)?;
        for handle in self.roster.as_ref().ok_or_else(invalid)?.animals() {
            let entity = core
                .state
                .physical
                .entities
                .resolve(*handle)
                .ok_or(ExecutionError::Invariant)?;
            let animal = entity.animal.as_ref().ok_or(ExecutionError::Invariant)?;
            if animal.episode.is_none()
                && wander_remaining(&animal.wander, core.state.physical.header.sim_time)
                    <= core.state.installed.time_epsilon
            {
                self.choices.push(*handle);
            }
        }
        // The cohort already has the actual ICU identity order. Stable sort
        // preserves it for equal deadlines at Source's epsilon resolution.
        self.choices.sort_by(|a, b| {
            let due = |handle| {
                let animal = core
                    .state
                    .physical
                    .entities
                    .resolve(handle)
                    .and_then(|entity| entity.animal.as_ref())
                    .expect("selected wander actor");
                let at = match animal.wander {
                    WanderClock::Due { due_at } => due_at,
                    _ => {
                        core.state.physical.header.sim_time
                            + wander_remaining(&animal.wander, core.state.physical.header.sim_time)
                    }
                };
                (at / core.state.installed.time_epsilon).round()
            };
            due(*a).total_cmp(&due(*b))
        });
        self.next = 0;
        Ok(())
    }
    pub(super) fn wander_slice(
        &mut self,
        core: &mut CoreMutation<'_>,
        mut answer: Option<AdvanceAnswer>,
        budget: &ByteBudget,
    ) -> Result<Progress, AdvanceError> {
        let Some(handle) = self.choices.get(self.next).copied() else {
            self.phase = Phase::Endpoint;
            return Ok(Progress::Continue);
        };
        if self.wander.is_none() {
            let actor = self.actor(core, handle)?;
            let _name = budget.reserve(actor.len())?;
            let actor = actor.to_owned();
            self.wander = Some(WanderCursor::prepare(core, &actor, self.candidate, budget)?);
        }
        let input = match answer.take() {
            None => None,
            Some(AdvanceAnswer::Geometry(value)) => Some(value),
            _ => return Err(invalid().into()),
        };
        let done = match self
            .wander
            .as_mut()
            .ok_or_else(invalid)?
            .step(core, input, budget)?
        {
            WanderStep::Geometry(_) => return Ok(Progress::Geometry),
            WanderStep::Complete(value) => value,
        };
        self.wander = None;
        self.next += 1;
        if let Some((route, reservation)) = done.into_route() {
            self.queued_movement = Some((
                handle,
                NativeIntention::Route(route, LocomotionMode::Travel, reservation),
                Phase::Wander,
            ));
            self.phase = Phase::NativeCommand;
        }
        Ok(Progress::Continue)
    }
    pub(super) fn begin_endpoint(
        &mut self,
        core: &mut CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<(), AdvanceError> {
        let epsilon = core.state.installed.time_epsilon;
        let work_ends = self
            .working
            .as_ref()
            .ok_or_else(invalid)?
            .working
            .iter()
            .any(|(handle, id)| {
                core.state
                    .physical
                    .entities
                    .resolve(*handle)
                    .and_then(|entity| entity.actor.as_ref())
                    .and_then(|actor| actor.action.as_ref())
                    .is_some_and(|action| {
                        action.id == *id
                            && action.kind != "status-effect"
                            && action.remaining_seconds <= self.seconds + epsilon
                    })
            });
        let mechanics = self.mechanics.as_ref().ok_or_else(invalid)?;
        let deferred = !mechanics.requires_immediate_integration
            && mechanics.seconds > epsilon
            && !work_ends
            && self.event_count() == self.slice_events
            && !self.mechanical_change(core, true)?;
        if !deferred && self.pending_flush(core, Phase::Endpoint, budget)? {
            return Ok(());
        }
        self.rates_deferred = deferred;
        if deferred {
            if self.pending_rates.is_none() {
                let rates = &self.mechanics.as_ref().ok_or_else(invalid)?.rates;
                let reservation = budget.reserve(
                    rates
                        .len()
                        .checked_mul(size_of::<std::sync::Arc<crate::status::StatusRateInterval>>())
                        .ok_or(ExecutionError::Capacity)?,
                )?;
                self.pending_rates = Some((rates.clone(), reservation));
            }
            self.pending_seconds += self.seconds;
        }
        let binding = self.binding(core)?;
        self.endpoint = Some(EndpointCursor::new(
            core,
            self.roster.as_ref().ok_or_else(invalid)?,
            &self.mechanics.as_ref().ok_or_else(invalid)?.rates,
            if deferred { 0.0 } else { self.seconds },
            Some((self.working.take().ok_or_else(invalid)?, self.seconds)),
            binding,
            budget,
        )?);
        Ok(())
    }
    pub(super) fn prepare_publication(
        &mut self,
        core: &mut CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<(), AdvanceError> {
        let publication = core.journal.physical.change_cursor();
        let events = self.event_count();
        core.state.physical.header.native_interval = self
            .mechanics
            .as_ref()
            .filter(|mechanics| mechanics.seconds > core.state.installed.time_epsilon)
            .map(|mechanics| NativeInterval {
                remaining_seconds: mechanics.seconds,
                ends_at: mechanics.ends_at,
            });
        core.physical().reconcile_closed_coaching()?;
        advance_commitments(core, self.events(), budget)?;
        core.sync_sensory_changes()?;
        if events != self.event_count()
            || core
                .journal
                .physical
                .changes_since(publication)?
                .iter()
                .any(|change| {
                    matches!(
                        change,
                        crate::execution::PhysicalChange::Body { .. }
                            | crate::execution::PhysicalChange::Participation { .. }
                            | crate::execution::PhysicalChange::Behavior { .. }
                            | crate::execution::PhysicalChange::Contribution { .. }
                            | crate::execution::PhysicalChange::Attribute { .. }
                            | crate::execution::PhysicalChange::Membership { .. }
                    )
                })
        {
            self.discard_mechanics()?;
            core.state.physical.header.native_interval = None;
        }
        core.state.physical.header.sequence = core
            .state
            .physical
            .header
            .sequence
            .checked_add(1)
            .filter(|sequence| *sequence <= MAX_SAFE_INTEGER)
            .ok_or(ExecutionError::Identity)?;
        core.journal.current.end_attention_preparation()?;
        Ok(())
    }
    pub(super) fn complete_publication(
        &mut self,
        core: &mut CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<(), AdvanceError> {
        for batch in &self.events {
            if let EventBatch::Participation(exit) = batch {
                core.physical()
                    .reconcile_semantic_interval(exit.actor_id())?;
            }
        }
        let code = if self.navigation_blocked {
            "navigation-pending"
        } else if core.state.physical.header.sim_time < self.end_at {
            "advance-budget"
        } else {
            "advanced"
        };
        let mut number = ryu_js::Buffer::new();
        let elapsed = number.format(core.state.physical.header.sim_time - self.start_at);
        let result = outcome(
            true,
            code,
            format!(
                "Advanced {elapsed} simulation seconds in {} intervals ({} motion slices).",
                self.intervals + usize::from(self.slices_since_boundary > 0),
                self.motion_slices
            ),
        );
        self.continuation = if let (Some(mechanics), Some(roster)) = (&self.mechanics, &self.roster)
        {
            // A navigation wait can publish after an isolated command but before
            // prediction. Keep that finite refinement proof with this exact cut.
            let local_changes = self
                .local_changes
                .take()
                .map(|mut changes| {
                    changes._reservation.resize(
                        changes
                            ._reservation
                            .bytes()
                            .checked_add(size_of::<LocalForecastChanges>() + 2 * size_of::<usize>())
                            .ok_or(ExecutionError::Capacity)?,
                    )?;
                    Ok::<_, ExecutionError>(Arc::new(changes))
                })
                .transpose()?;
            Some(AdvanceContinuation(Arc::new(AdvanceSnapshot {
                candidate: self.candidate,
                installed: core.state.installed.clone(),
                sequence: core.state.physical.header.sequence,
                at: core.state.physical.header.sim_time,
                physical: core.journal.physical.change_cursor(),
                mechanics: mechanics.clone(),
                roster: roster.clone(),
                local_changes,
                _reservation: budget
                    .reserve(size_of::<AdvanceSnapshot>() + 2 * size_of::<usize>())?,
            })))
        } else {
            None
        };
        let child = self.child.take().ok_or(ExecutionError::InvalidCheckpoint)?;
        core.journal.keep(core.state, child)?;
        self.outcome = Some(result);
        self.phase = Phase::Done;
        Ok(())
    }
}
