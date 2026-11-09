use super::*;
use crate::execution::PhysicalChange;

impl AdvanceCursor {
    fn perceives(core: &CoreMutation<'_>, handle: EntityHandle) -> Result<bool, ExecutionError> {
        let entity = core
            .state
            .physical
            .entities
            .resolve(handle)
            .ok_or(ExecutionError::Invariant)?;
        Ok(entity.actor.as_ref().is_some_and(|actor| actor.alive)
            && entity.has_memory()
            && entity.actively_participates()
            && !core
                .state
                .installed
                .capabilities
                .capability_blocked(Some(entity), "perception")?)
    }
    fn capture_perceivers(&mut self, core: &CoreMutation<'_>) -> Result<(), AdvanceError> {
        let count = self.roster.as_ref().ok_or_else(invalid)?.actors().len();
        self.reserve(
            count
                .saturating_sub(self.perceivers.capacity())
                .checked_mul(size_of::<EntityHandle>())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        self.perceivers.clear();
        self.perceivers
            .try_reserve_exact(count)
            .map_err(|_| ExecutionError::Capacity)?;
        for handle in self.roster.as_ref().ok_or_else(invalid)?.actors() {
            if Self::perceives(core, *handle)? {
                self.perceivers.push(*handle);
            }
        }
        self.perceivers_captured = true;
        Ok(())
    }
    fn perceivers_changed(&self, core: &CoreMutation<'_>) -> Result<bool, ExecutionError> {
        if !self.perceivers_captured {
            return Ok(false);
        }
        let mut at = 0;
        for handle in self.roster.as_ref().ok_or_else(invalid)?.actors() {
            if Self::perceives(core, *handle)? {
                if self.perceivers.get(at) != Some(handle) {
                    return Ok(true);
                }
                at += 1;
            }
        }
        Ok(at != self.perceivers.len())
    }
    fn perception_work_due(
        &self,
        core: &CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<bool, AdvanceError> {
        for handle in self.roster.as_ref().ok_or_else(invalid)?.actors() {
            if next_perception_work_at(core.state, self.actor(core, *handle)?, budget)?
                .is_some_and(|at| at <= core.state.physical.header.sim_time)
            {
                return Ok(true);
            }
        }
        Ok(false)
    }
    fn accept_event(&mut self, value: CompletedEvent) -> Result<(), AdvanceError> {
        let expected = self.expected.take().ok_or_else(invalid)?;
        if expected.id != value.event.id
            || expected.order != value.completed.order()
            || expected.sequence != value.completed.sequence()
            || expected.id != value.completed.event_id()
        {
            return Err(invalid().into());
        }
        let CompletedEvent {
            event,
            completed: receipt,
            awareness,
            reservation,
        } = value;
        drop(awareness);
        match self.event_destination.take().ok_or_else(invalid)? {
            EventDestination::Reconcile => {
                self.reconcile_answer = Some(ReconcileAnswer::Occurrence(receipt))
            }
            EventDestination::Motion => {
                self.motion_answer = Some(MoveAdvanceAnswer::Occurrence(receipt))
            }
            EventDestination::Endpoint => {
                self.endpoint_answer = Some(EndpointAnswer::Occurrence(receipt))
            }
            EventDestination::Appraisal => {}
        }
        self.retain(EventBatch::Event {
            event,
            _reservation: reservation,
        })?;
        self.event = None;
        Ok(())
    }
    fn mechanical_change(
        &self,
        core: &CoreMutation<'_>,
        attributes: bool,
    ) -> Result<bool, ExecutionError> {
        Ok(self.slice_invalidated
            || core
                .journal
                .physical
                .changes_since(self.slice_cursor)?
                .iter()
                .any(|change| match change {
                    PhysicalChange::Body { .. }
                    | PhysicalChange::Behavior { .. }
                    | PhysicalChange::Contribution { .. }
                    | PhysicalChange::Membership { .. } => true,
                    PhysicalChange::Attribute { .. } => attributes,
                    _ => false,
                }))
    }
    fn pending_flush(
        &mut self,
        core: &mut CoreMutation<'_>,
        destination: Phase,
        budget: &ByteBudget,
    ) -> Result<bool, AdvanceError> {
        if self.pending_seconds == 0.0 {
            return Ok(false);
        }
        if matches!(destination, Phase::SenseStart | Phase::SenseEnd) {
            self.slice_invalidated |= self.mechanical_change(core, true)?;
            self.slice_cursor = core.journal.physical.change_cursor();
        }
        let binding = self.binding(core)?;
        self.endpoint = Some(EndpointCursor::new(
            core,
            self.roster.as_ref().ok_or_else(invalid)?,
            &self.pending_rates.as_ref().ok_or_else(invalid)?.0,
            self.pending_seconds,
            None,
            binding,
            budget,
        )?);
        self.pending_seconds = 0.0;
        self.pending_rates = None;
        self.flush = Some(destination);
        self.phase = Phase::Flush;
        Ok(true)
    }
    fn discard_mechanics(&mut self) -> Result<(), AdvanceError> {
        self.mechanics = None;
        self.saved_interval = None;
        Ok(())
    }
    fn retain_navigation(
        &mut self,
        actor: EntityHandle,
        pending: PendingRefugeNavigation,
    ) -> Result<(), AdvanceError> {
        if self.navigation.len() == self.navigation.capacity() {
            self.reserve(size_of::<(EntityHandle, PendingRefugeNavigation)>())?;
            self.navigation
                .try_reserve_exact(1)
                .map_err(|_| ExecutionError::Capacity)?;
        }
        self.navigation.push((actor, pending));
        Ok(())
    }
    fn begin_reconcile_remains(
        &mut self,
        core: &mut CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<(), AdvanceError> {
        let handles = self.roster.as_ref().ok_or_else(invalid)?.remains();
        let bytes = handles.iter().try_fold(
            handles
                .len()
                .checked_mul(size_of::<String>())
                .ok_or(ExecutionError::Capacity)?,
            |bytes, handle| {
                bytes
                    .checked_add(self.actor(core, *handle)?.len())
                    .ok_or(ExecutionError::Capacity)
            },
        )?;
        let _scratch = budget.reserve(bytes)?;
        let ids = handles
            .iter()
            .map(|handle| self.actor(core, *handle).map(str::to_owned))
            .collect::<Result<Vec<_>, _>>()?;
        self.reconcile = Some(ReconcileCursor::Remains(crate::body::RemainsCursor::new(
            &ids, budget,
        )?));
        Ok(())
    }
    pub(super) fn drive(
        &mut self,
        core: &mut CoreMutation<'_>,
        mut answer: Option<AdvanceAnswer>,
        budget: &ByteBudget,
    ) -> Result<Progress, AdvanceError> {
        if let Some(AdvanceAnswer::Event(value)) = answer {
            self.accept_event(value)?;
            answer = None;
        }
        if self.event.is_some() {
            if answer.is_some() {
                return Err(invalid().into());
            }
            return Ok(Progress::Event);
        }
        if self.preparation.is_some() {
            let Some(AdvanceAnswer::Collation(value)) = answer.take() else {
                return Ok(Progress::Collation);
            };
            self.roster = Some(
                self.preparation
                    .take()
                    .ok_or_else(invalid)?
                    .finish(core, &value)?,
            );
        }
        if self.plan.is_some() {
            let Some(AdvanceAnswer::Plan(done)) = answer.take() else {
                return Ok(Progress::Plan);
            };
            if let Some(command) = done.command {
                self.retain(EventBatch::Command(command))?;
                self.discard_mechanics()?;
            }
            self.plan = None;
        }
        if self.command.is_some() {
            let Some(AdvanceAnswer::Command(done)) = answer.take() else {
                return Ok(Progress::Command);
            };
            let handle = self.command_actor.take().ok_or_else(invalid)?;
            if done.command.actor_id() != self.actor(core, handle)? {
                return Err(invalid().into());
            }
            if self.command_mode.take() == Some(LocomotionMode::Escape)
                && !done.command.outcome().ok
            {
                let actor = self.actor(core, handle)?;
                let _name = budget.reserve(actor.len())?;
                let actor = actor.to_owned();
                crate::native_controller::movement_refused(core, &actor, done.command.outcome())?;
            }
            self.retain(EventBatch::Command(done))?;
            self.command = None;
            if self.phase == Phase::Wander {
                self.slice_invalidated = true;
            } else {
                self.discard_mechanics()?;
            }
        }
        if self.perception.is_some() {
            let Some(AdvanceAnswer::Perception(done)) = answer.take() else {
                return Ok(Progress::Perception);
            };
            // Return the exact immutable policy preparation to its owning advance.
            let (events, policies, reservation) = done.into_events()?;
            self.policies = Some(policies);
            self.retain(EventBatch::Perception {
                events,
                _reservation: reservation,
            })?;
            if let Some((cursor, events)) = self.perception_before.take() {
                let changed = core
                    .journal
                    .physical
                    .changes_since(cursor)?
                    .iter()
                    .any(|change| {
                        matches!(
                            change,
                            PhysicalChange::Body { .. }
                                | PhysicalChange::Behavior { .. }
                                | PhysicalChange::Contribution { .. }
                                | PhysicalChange::Attribute { .. }
                                | PhysicalChange::Membership { .. }
                        )
                    });
                if changed || self.event_count() != events {
                    self.discard_mechanics()?;
                }
            }
            self.perception = None;
        }
        loop {
            if let Some(gate) = &mut self.navigation_gate {
                let response = match answer.take() {
                    None => None,
                    Some(AdvanceAnswer::Geometry(value)) => Some(value),
                    _ => return Err(invalid().into()),
                };
                let blocked = match gate.step(core, response, &self.prepared, budget)? {
                    NavigationGateStep::Geometry(_) => return Ok(Progress::Geometry),
                    NavigationGateStep::Complete(blocked) => blocked,
                };
                self.navigation_gate = None;
                match self.navigation_after.take().ok_or_else(invalid)? {
                    NavigationAfter::Start => {
                        // A zero-duration read still classifies a current world
                        // wait before opening receiving/attention scopes.
                        if blocked || self.zero_duration {
                            let child =
                                self.child.take().ok_or(ExecutionError::InvalidCheckpoint)?;
                            core.journal.rollback_to(core.state, child)?;
                            self.outcome = Some(outcome(
                                true,
                                if blocked {
                                    "navigation-pending"
                                } else {
                                    "unchanged"
                                },
                                "No game time advanced.",
                            ));
                            self.phase = Phase::Done;
                        } else {
                            self.begin_scope(core, budget)?;
                        }
                    }
                    NavigationAfter::Slice => {
                        self.navigation_blocked |= blocked;
                        self.prepare_slice(core, budget)?;
                    }
                    NavigationAfter::Publication => {
                        self.navigation_blocked = blocked;
                        self.complete_publication(core, budget)?;
                    }
                }
                continue;
            }
            if self.roster.is_some()
                && self.reconcile.is_none()
                && self.endpoint.is_none()
                && self.motion.is_none()
            {
                let refresh = core
                    .journal
                    .physical
                    .changes_since(self.roster_cursor)?
                    .iter()
                    .any(|change| {
                        matches!(
                            change,
                            PhysicalChange::Body { .. } | PhysicalChange::Membership { .. }
                        )
                    });
                self.roster_cursor = core.journal.physical.change_cursor();
                if refresh {
                    self.roster = None;
                }
            }
            if self.phase != Phase::Done && self.roster.is_none() {
                if self.preparation.is_none() {
                    let binding = self.binding(core)?;
                    self.preparation = Some(ParticipantPreparation::new(core, binding, budget)?);
                }
                return Ok(Progress::Collation);
            }
            if let Some(cursor) = &mut self.reconcile {
                let input = match answer.take() {
                    None => self.reconcile_answer.take(),
                    Some(AdvanceAnswer::Geometry(value)) => Some(ReconcileAnswer::Geometry(value)),
                    _ => return Err(invalid().into()),
                };
                match cursor.step(core, input)? {
                    ReconcileStep::Geometry(_) => return Ok(Progress::Geometry),
                    ReconcileStep::Occurrence(value) => {
                        core.sync_sensory_changes()?;
                        self.stage_event(core, value, EventDestination::Reconcile, budget)?;
                        return Ok(Progress::Event);
                    }
                    ReconcileStep::Personal(pending) => {
                        let prepared = prepare_activity_result(core, pending, budget)?;
                        self.reconcile_answer =
                            Some(ReconcileAnswer::Personal(acquire_activity_result(
                                core,
                                prepared,
                                &core.state.installed.schema.clone(),
                            )?));
                    }
                    ReconcileStep::EndEvidence { observer, life, at } => {
                        let proof = crate::reception::end_current_evidence(core, observer, budget)?;
                        if proof.physical_life() != life || proof.at() != at {
                            return Err(invalid().into());
                        }
                        self.reconcile_answer = Some(ReconcileAnswer::Ended(proof));
                    }
                    ReconcileStep::Complete => {
                        self.reconcile = None;
                        core.sync_sensory_changes()?;
                    }
                }
                continue;
            }
            if let Some(cursor) = &mut self.endpoint {
                let input = match answer.take() {
                    None => self.endpoint_answer.take(),
                    Some(AdvanceAnswer::Geometry(value)) => Some(EndpointAnswer::Geometry(value)),
                    _ => return Err(invalid().into()),
                };
                match cursor.step(core, input)? {
                    EndpointStep::Geometry(_) => return Ok(Progress::Geometry),
                    EndpointStep::Occurrence(value) => {
                        core.sync_sensory_changes()?;
                        self.stage_event(core, value, EventDestination::Endpoint, budget)?;
                        return Ok(Progress::Event);
                    }
                    EndpointStep::Personal(pending) => {
                        let prepared = prepare_activity_result(core, pending, budget)?;
                        self.endpoint_answer =
                            Some(EndpointAnswer::Personal(acquire_activity_result(
                                core,
                                prepared,
                                &core.state.installed.schema.clone(),
                            )?));
                    }
                    EndpointStep::Complete => {
                        self.endpoint = None;
                        core.sync_sensory_changes()?;
                        if let Some(destination) = self.flush.take() {
                            if matches!(destination, Phase::SenseStart | Phase::SenseEnd) {
                                self.slice_invalidated |= self.mechanical_change(core, false)?;
                                self.slice_cursor = core.journal.physical.change_cursor();
                            }
                            self.phase = destination;
                        } else {
                            self.phase = if self.rates_deferred {
                                Phase::Arrival
                            } else {
                                Phase::StatusEnd
                            };
                            self.next = 0;
                        }
                    }
                }
                continue;
            }
            match self.phase {
                Phase::Begin => {
                    if answer.is_some() {
                        return Err(invalid().into());
                    }
                    if self.mechanics.as_ref().is_some_and(|mechanics| {
                        mechanics.seconds <= core.state.installed.time_epsilon
                    }) {
                        self.discard_mechanics()?;
                    }
                    if self.mechanics.is_none() && self.pending_flush(core, Phase::Begin, budget)? {
                        continue;
                    }
                    expire_sensory_awareness(core)?;
                    self.perceivers_captured = false;
                    if self.mechanics.is_none() {
                        self.capture_perceivers(core)?;
                    }
                    self.phase = if self.mechanics.is_none() {
                        Phase::RemainsStart
                    } else {
                        Phase::ActorCondition
                    };
                    self.next = 0;
                }
                Phase::RemainsStart | Phase::RemainsEnd => {
                    let next = if self.phase == Phase::RemainsStart {
                        Phase::AppraisalsStart
                    } else {
                        Phase::SenseEnd
                    };
                    self.begin_reconcile_remains(core, budget)?;
                    self.phase = next;
                }
                Phase::AppraisalsStart | Phase::AppraisalsEnd => {
                    if let Some(value) = crate::appraisals::advance_next_appraisal(core, budget)? {
                        self.stage_event(core, value, EventDestination::Appraisal, budget)?;
                        return Ok(Progress::Event);
                    }
                    self.phase = if self.phase == Phase::AppraisalsStart {
                        Phase::StatusStart
                    } else {
                        Phase::RemainsEnd
                    };
                    self.next = 0;
                }
                Phase::StatusStart | Phase::StatusEnd => {
                    let group = self.roster.as_ref().ok_or_else(invalid)?.statuses();
                    if let Some(handle) = group.get(self.next).copied() {
                        self.next += 1;
                        self.reconcile = Some(ReconcileCursor::Status(StatusReconcileCursor::new(
                            self.actor(core, handle)?,
                            budget,
                        )?));
                    } else {
                        if self.phase == Phase::StatusStart {
                            advance_commitments(core, &[], budget)?;
                        }
                        self.phase = if self.phase == Phase::StatusStart {
                            Phase::ActorCondition
                        } else {
                            Phase::Arrival
                        };
                        self.next = 0;
                    }
                }
                Phase::ActorCondition => {
                    let group = self.roster.as_ref().ok_or_else(invalid)?.actors();
                    let Some(handle) = group.get(self.next).copied() else {
                        self.next = 0;
                        self.phase = Phase::AnimalClocks;
                        continue;
                    };
                    let entity = core
                        .state
                        .physical
                        .entities
                        .resolve(handle)
                        .ok_or(ExecutionError::Invariant)?;
                    let actor = entity.actor.as_ref().ok_or(ExecutionError::Invariant)?;
                    if !actor.alive
                        || actor.incapacitated
                        || (self.mechanics.is_some() && actor.agency.plan.is_none())
                    {
                        self.next += 1;
                        continue;
                    }
                    self.reconcile = Some(ReconcileCursor::Conditions(
                        crate::conditions::ConditionReconcileCursor::new(&entity.id, budget)?,
                    ));
                    self.phase = Phase::ActorPlan;
                }
                Phase::ActorPlan => {
                    let handle = self.roster.as_ref().ok_or_else(invalid)?.actors()[self.next];
                    let entity = core
                        .state
                        .physical
                        .entities
                        .resolve(handle)
                        .ok_or(ExecutionError::Invariant)?;
                    let actor = entity.actor.as_ref().ok_or(ExecutionError::Invariant)?;
                    if actor.agency.plan.is_some() || actor.agency.suspended_plan().is_some() {
                        let _name = budget.reserve(entity.id.len())?;
                        let actor = entity.id.clone();
                        if self.pending_flush(core, Phase::ActorPlan, budget)? {
                            continue;
                        }
                        if !self.perceivers_captured {
                            self.capture_perceivers(core)?;
                        }
                        self.plan = Some(PlanRunCursor::new(core, &actor, self.candidate, budget)?);
                        self.phase = Phase::ActorAction;
                        return Ok(Progress::Plan);
                    }
                    self.phase = Phase::ActorAction;
                }
                Phase::ActorAction | Phase::Arrival => {
                    let group = self.roster.as_ref().ok_or_else(invalid)?.actors();
                    if let Some(handle) = group.get(self.next).copied() {
                        let arrival = self.phase == Phase::Arrival;
                        self.next += 1;
                        let entity = core
                            .state
                            .physical
                            .entities
                            .resolve(handle)
                            .ok_or(ExecutionError::Invariant)?;
                        let actor = entity.actor.as_ref().ok_or(ExecutionError::Invariant)?;
                        let action = actor.action.as_ref();
                        let locomotion = !core
                            .state
                            .installed
                            .capabilities
                            .capability_blocked(Some(entity), "locomotion")?;
                        if actor.alive
                            && !actor.incapacitated
                            && action.is_some()
                            && (!arrival
                                || action.is_some_and(|action| action.stage == "approaching"))
                            && (locomotion
                                || action.is_some_and(|action| action.kind == "status-effect"))
                        {
                            self.reconcile = Some(ReconcileCursor::Action(MoveAdvanceCursor::new(
                                &entity.id.clone(),
                                0.0,
                                self.binding(core)?,
                                budget,
                            )?));
                        }
                        if !arrival {
                            self.phase = Phase::ActorCondition;
                        }
                    } else {
                        self.next = 0;
                        self.phase = if self.phase == Phase::Arrival {
                            Phase::WanderEndClocks
                        } else {
                            Phase::AnimalClocks
                        };
                    }
                }
                Phase::AnimalClocks | Phase::WanderEndClocks => {
                    let installed = core.state.installed.clone();
                    for handle in self.roster.as_ref().ok_or_else(invalid)?.animals() {
                        let _name = budget.reserve(self.actor(core, *handle)?.len())?;
                        let id = self.actor(core, *handle)?.to_owned();
                        reconcile_wander(
                            &mut core.physical(),
                            &installed,
                            &id,
                            installed.time_epsilon,
                        )?;
                    }
                    if self.phase == Phase::WanderEndClocks {
                        self.phase = Phase::AppraisalsEnd;
                        continue;
                    }
                    let count = self.roster.as_ref().ok_or_else(invalid)?.animals().len();
                    self.reserve(
                        count
                            .saturating_sub(self.choices.capacity())
                            .checked_mul(size_of::<EntityHandle>())
                            .ok_or(ExecutionError::Capacity)?,
                    )?;
                    self.choices.clear();
                    self.choices
                        .try_reserve_exact(count)
                        .map_err(|_| ExecutionError::Capacity)?;
                    self.choices.extend(
                        self.roster
                            .as_ref()
                            .ok_or_else(invalid)?
                            .animals()
                            .iter()
                            .filter(|handle| {
                                core.state
                                    .physical
                                    .entities
                                    .resolve(**handle)
                                    .and_then(|entity| entity.animal.as_ref())
                                    .and_then(|animal| animal.episode.as_ref())
                                    .is_some()
                            })
                            .copied(),
                    );
                    self.choices.sort_by(|a, b| {
                        let at = |h| {
                            core.state
                                .physical
                                .entities
                                .resolve(h)
                                .and_then(|entity| entity.animal.as_ref())
                                .and_then(|animal| animal.episode.as_ref())
                                .map_or(f64::INFINITY, |episode| episode.review_at)
                        };
                        at(*a).total_cmp(&at(*b))
                    });
                    self.next = 0;
                    self.phase = Phase::AnimalChoices;
                }
                Phase::AnimalChoices => {
                    let Some(handle) = self.choices.get(self.next).copied() else {
                        self.phase = Phase::SenseStart;
                        continue;
                    };
                    if self.response.is_none() {
                        let id = self.actor(core, handle)?;
                        let state = core
                            .state
                            .physical
                            .entities
                            .resolve(handle)
                            .and_then(|entity| entity.animal.as_ref())
                            .ok_or(ExecutionError::Invariant)?;
                        let episode = state.episode.as_ref().ok_or(ExecutionError::Invariant)?;
                        let prepared = self.prepared.iter().position(|(actor, _)| actor == id);
                        // A saved wait can become ready or stale before its
                        // review date. The controller owns that readiness read.
                        if episode.review_at > core.state.physical.header.sim_time
                            && prepared.is_none()
                            && episode.proposal.is_none()
                        {
                            self.next += 1;
                            continue;
                        }
                        // A private review may only renew its clock. Source
                        // retains earned rates through that read; an actual
                        // route/stop settles them at NativeCommand admission.
                        let id = self.actor(core, handle)?;
                        let supplied = prepared.map(|at| self.prepared.remove(at).1);
                        self.response = Some(GroundResponseCursor::prepare(
                            id,
                            self.candidate,
                            supplied,
                            budget,
                        )?);
                    }
                    let input = match answer.take() {
                        None => None,
                        Some(AdvanceAnswer::Geometry(value)) => Some(value),
                        _ => return Err(invalid().into()),
                    };
                    let decision = match self
                        .response
                        .as_mut()
                        .ok_or_else(invalid)?
                        .step(core, input, budget)?
                    {
                        GroundResponseStep::Geometry(_) => return Ok(Progress::Geometry),
                        GroundResponseStep::Complete(value) => value.into_decision(),
                    };
                    self.response = None;
                    self.next += 1;
                    match decision {
                        GroundResponseDecision::None => {}
                        GroundResponseDecision::Pending(pending) => {
                            self.navigation_blocked = core
                                .state
                                .physical
                                .entities
                                .resolve(handle)
                                .and_then(|entity| entity.animal.as_ref())
                                .and_then(|animal| animal.episode.as_ref())
                                .and_then(|episode| episode.proposal.as_ref())
                                .is_some_and(|proposal| {
                                    proposal.wait != Some(NavigationWait::Entity)
                                });
                            self.retain_navigation(handle, pending)?;
                            if self.navigation_blocked {
                                self.phase = Phase::Publish;
                            }
                        }
                        GroundResponseDecision::Stop => {
                            self.queued_movement =
                                Some((handle, NativeIntention::Stop, Phase::AnimalChoices));
                            self.phase = Phase::NativeCommand;
                        }
                        GroundResponseDecision::Route { route, reservation } => {
                            self.queued_movement = Some((
                                handle,
                                NativeIntention::Route(route, LocomotionMode::Escape, reservation),
                                Phase::AnimalChoices,
                            ));
                            self.phase = Phase::NativeCommand;
                        }
                    }
                    core.sync_sensory_changes()?;
                }
                Phase::SenseStart | Phase::SenseEnd => {
                    let destination = self.phase;
                    if destination == Phase::SenseEnd && !self.boundary_recorded {
                        let changed = self.mechanical_change(core, true)?
                            || self.event_count() != self.slice_events;
                        let shared = self
                            .mechanics
                            .as_ref()
                            .is_none_or(|mechanics| mechanics.seconds == 0.0)
                            || changed;
                        if shared || self.slices_since_boundary == 32 {
                            self.intervals += 1;
                            self.slices_since_boundary = 0;
                        }
                        if shared {
                            self.discard_mechanics()?;
                        }
                        self.boundary_recorded = true;
                        self.slice_invalidated = false;
                        self.slice_cursor = core.journal.physical.change_cursor();
                        self.slice_events = self.event_count();
                    }
                    if destination == Phase::SenseStart
                        && !self.perceivers_changed(core)?
                        && !self.perception_work_due(core, budget)?
                    {
                        self.phase = Phase::Predict;
                        continue;
                    }
                    let due = physical_sampling_due(
                        core,
                        self.roster.as_ref().ok_or_else(invalid)?.actors(),
                        self.policies.as_mut().ok_or_else(invalid)?,
                        budget,
                    )?;
                    if due && self.pending_flush(core, destination, budget)? {
                        continue;
                    }
                    if self.slice_invalidated {
                        self.discard_mechanics()?;
                        self.slice_invalidated = false;
                    }
                    self.phase = if destination == Phase::SenseStart {
                        Phase::Predict
                    } else {
                        Phase::Continue
                    };
                    self.perception = Some(PerceptionCursor::prepare(
                        core,
                        self.roster.as_ref().ok_or_else(invalid)?.actors(),
                        self.policies.take().ok_or_else(invalid)?,
                        self.candidate,
                        budget,
                    )?);
                    self.perception_before =
                        Some((core.journal.physical.change_cursor(), self.event_count()));
                    return Ok(Progress::Perception);
                }
                Phase::Predict => {
                    self.begin_navigation_gate(core, NavigationAfter::Slice, budget)?;
                }
                Phase::NativeCommand => {
                    if self.pending_flush(core, Phase::NativeCommand, budget)? {
                        continue;
                    }
                    let (handle, intention, resume) =
                        self.queued_movement.take().ok_or_else(invalid)?;
                    let actor = self.actor(core, handle)?;
                    let _name = budget.reserve(actor.len())?;
                    let actor = actor.to_owned();
                    let (command, mode) = match intention {
                        NativeIntention::Stop => (
                            begin_native_stop(core, &actor, self.candidate, budget)?,
                            LocomotionMode::Escape,
                        ),
                        NativeIntention::Route(route, mode, reservation) => {
                            let operation = begin_native_movement(
                                core,
                                &actor,
                                route,
                                mode,
                                self.candidate,
                                budget,
                            )?;
                            drop(reservation);
                            (operation, mode)
                        }
                    };
                    self.command = Some(command);
                    self.command_actor = Some(handle);
                    self.command_mode = Some(mode);
                    self.phase = resume;
                    return Ok(Progress::Command);
                }
                Phase::Move => {
                    return self.move_slice(core, answer.take(), budget);
                }
                Phase::Wander => {
                    return self.wander_slice(core, answer.take(), budget);
                }
                Phase::Endpoint => {
                    self.begin_endpoint(core, budget)?;
                }
                Phase::Continue => {
                    // Source settles the complete endpoint's commitments after
                    // its remains and receiving occurrences, before continuing.
                    advance_commitments(core, self.events(), budget)?;
                    let changed = self.mechanical_change(core, true)?
                        || self.event_count() != self.slice_events;
                    if changed
                        || self
                            .mechanics
                            .as_ref()
                            .is_some_and(|mechanics| mechanics.seconds == 0.0)
                    {
                        self.discard_mechanics()?;
                    }
                    self.phase = if core.state.physical.header.sim_time >= self.end_at
                        || self.intervals >= self.max_intervals
                        || self.motion_slices >= 4096
                        || self.navigation_blocked
                    {
                        Phase::Publish
                    } else {
                        Phase::Begin
                    };
                    if self.phase == Phase::Begin {
                        return Ok(Progress::Continue);
                    }
                }
                Phase::Publish => {
                    if self.pending_flush(core, Phase::Publish, budget)? {
                        continue;
                    }
                    self.prepare_publication(core, budget)?;
                    self.begin_navigation_gate(core, NavigationAfter::Publication, budget)?;
                }
                Phase::Done => {
                    if answer.is_some() {
                        return Err(invalid().into());
                    }
                    return Ok(Progress::Complete(CompletedAdvance {
                        outcome: self.outcome.take().ok_or_else(invalid)?,
                        navigation: std::mem::take(&mut self.navigation),
                        continuation: self.continuation.take(),
                        events: std::mem::take(&mut self.events),
                        _reservation: self.reservation.take().ok_or_else(invalid)?,
                    }));
                }
                Phase::Flush => return Err(invalid().into()),
            }
        }
    }
}
mod slice;
