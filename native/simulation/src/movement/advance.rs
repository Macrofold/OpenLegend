//! One selected movement action's Source advance, inside its caller's candidate.
//! Positive motion returns at its actual slice boundary; arrival is finalized by
//! the later zero-time advance, after the caller has completed intervening work.
use super::{MotionOperation, MotionStep};
use crate::activity::{ActivityStatus, PendingActivityResult};
use crate::attention::ActivityRecordingContext;
use crate::commands::Outcome;
use crate::events::{
    AudienceSelection, CompletedOccurrence, EmissionText, EventEmissionIntent, EventScope,
};
use crate::execution::{
    ActionFinish, ActionRouteWrite, ActionWrite, CoreMutation, ExecutionError, PendingActionFinish,
    PlanGenerationWrite, StagedOccurrence,
};
use crate::experience::AcquiredActivityResult;
use crate::geometry::{
    GeometryAnswers, GeometryBinding, GeometryQueries, RoutePlan, RouteQuery, WalkingSegment,
};
use crate::host::retained_size::heap_sum;
use crate::host::{ByteBudget, ByteReservation};
use crate::narration::{Narration, NarrationPart, PersonRole};
use crate::native_response::{NavigationWait, profile_key};
use crate::state::{Action, Entity, NavigationPending, Placement, Point, SurfacePoint};
use std::mem::size_of;

pub(crate) enum MoveAdvanceAnswer {
    Geometry(GeometryAnswers),
    Occurrence(CompletedOccurrence),
    Personal(AcquiredActivityResult),
}
pub(crate) enum MoveAdvanceStep<'a> {
    Geometry(&'a GeometryQueries),
    Occurrence(StagedOccurrence),
    Personal(&'a PendingActivityResult),
    Complete,
}
enum Progress {
    Geometry,
    Occurrence(StagedOccurrence),
    Personal,
    Complete,
}
#[derive(Clone, Copy, PartialEq, Eq)]
enum Phase {
    Start,
    ZeroMotion,
    Check,
    Route,
    Probe,
    PositiveMotion,
    Arrival,
    Finish,
    Clear,
    Stopped,
    Done,
}
pub(crate) struct MoveAdvanceCursor {
    actor_id: String,
    action_id: Option<String>,
    physical_life: u64,
    seconds: f64,
    phase: Phase,
    motion: Option<MotionOperation>,
    queries: Option<(GeometryQueries, ByteReservation)>,
    binding: GeometryBinding,
    failure: Option<String>,
    pending: Option<PendingActionFinish>,
    event: Option<String>,
    after_event: Phase,
    budget: ByteBudget,
    _reservation: ByteReservation,
}
fn bound<'a>(
    core: &'a CoreMutation<'_>,
    actor: &str,
    action: &str,
    life: u64,
) -> Result<(&'a Entity, &'a Action), ExecutionError> {
    let entity = core
        .state
        .physical
        .entities
        .get(actor)
        .filter(|entity| entity.physical_life() == Some(life))
        .ok_or(ExecutionError::Invariant)?;
    let action = entity
        .actor
        .as_ref()
        .and_then(|actor| actor.action.as_ref())
        .filter(|value| value.id == action && value.kind == "move")
        .ok_or(ExecutionError::Invariant)?;
    Ok((entity, action))
}
fn supported(entity: &Entity) -> Option<(Point, &str)> {
    match &entity.placement {
        Some(Placement::World {
            position,
            support_surface_id: Some(surface),
            ..
        }) => Some((*position, surface)),
        _ => None,
    }
}
fn in_reach(entity: &Entity, action: &Action, tolerance: f64) -> bool {
    let Some(destination) = &action.destination else {
        return false;
    };
    action.path.is_empty()
        && supported(entity).is_some_and(|(point, surface)| {
            surface == destination.surface_id
                && crate::spatial::distance(point, destination.point()) <= tolerance
        })
}
impl MoveAdvanceCursor {
    pub(crate) fn new(
        actor_id: &str,
        seconds: f64,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        if !seconds.is_finite() || seconds < 0.0 {
            return Err(ExecutionError::Invariant);
        }
        let reservation = budget.reserve(
            size_of::<Self>()
                .checked_add(actor_id.len())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(Self {
            actor_id: actor_id.into(),
            action_id: None,
            physical_life: 0,
            seconds,
            phase: Phase::Start,
            motion: None,
            queries: None,
            binding,
            failure: None,
            pending: None,
            event: None,
            after_event: Phase::Done,
            budget: budget.clone(),
            _reservation: reservation,
        })
    }
    fn reserve(&mut self, bytes: usize) -> Result<(), ExecutionError> {
        self._reservation.resize(
            self._reservation
                .bytes()
                .checked_add(bytes)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(())
    }
    fn fail(&mut self, reason: &str) -> Result<(), ExecutionError> {
        self.reserve(reason.len())?;
        self.failure = Some(reason.into());
        self.phase = Phase::Finish;
        Ok(())
    }
    fn start_motion(
        &mut self,
        core: &CoreMutation<'_>,
        distance: f64,
        phase: Phase,
    ) -> Result<(), ExecutionError> {
        let (entity, action) = bound(
            core,
            &self.actor_id,
            self.action_id.as_deref().ok_or(ExecutionError::Invariant)?,
            self.physical_life,
        )?;
        // Source's zero-time path repair uses ordinary static geometry only;
        // occupied-body avoidance belongs to the later actual native motion.
        let occupied = phase == Phase::PositiveMotion
            && (action.native_locomotion.is_some()
                || entity
                    .actor
                    .as_ref()
                    .is_some_and(|actor| actor.controller == "native")
                    && entity.animal.is_some());
        self.motion = Some(MotionOperation::start(
            core,
            &self.actor_id,
            distance,
            occupied,
            self.binding,
            &self.budget,
        )?);
        self.phase = phase;
        Ok(())
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<MoveAdvanceAnswer>,
    ) -> Result<MoveAdvanceStep<'a>, ExecutionError> {
        let progress = self.drive(core, answer)?;
        Ok(match progress {
            Progress::Geometry => MoveAdvanceStep::Geometry(if let Some(motion) = &self.motion {
                motion.queries().ok_or(ExecutionError::Invariant)?
            } else {
                &self.queries.as_ref().ok_or(ExecutionError::Invariant)?.0
            }),
            Progress::Occurrence(event) => MoveAdvanceStep::Occurrence(event),
            Progress::Personal => MoveAdvanceStep::Personal(
                self.pending
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?
                    .personal(),
            ),
            Progress::Complete => MoveAdvanceStep::Complete,
        })
    }
    fn drive(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<MoveAdvanceAnswer>,
    ) -> Result<Progress, ExecutionError> {
        let installed = core.state.installed.clone();
        let rules = installed.ordinary_actions.value();
        if installed.geometry.spatial.revision != self.binding.geometry_revision {
            return Err(ExecutionError::Invariant);
        }
        let mut geometry = None;
        if let Some(answer) = answer {
            match answer {
                MoveAdvanceAnswer::Occurrence(completed) => {
                    if self.event.as_deref() != Some(completed.event_id()) {
                        return Err(ExecutionError::UnfinishedOccurrence);
                    }
                    self.event = None;
                    self.phase = self.after_event;
                }
                MoveAdvanceAnswer::Personal(acquired) => {
                    let pending = self
                        .pending
                        .take()
                        .ok_or(ExecutionError::UnfinishedOccurrence)?;
                    let done = core.complete_finish_action(pending, &acquired)?;
                    if done.actor_id() != self.actor_id
                        || Some(done.action_id()) != self.action_id.as_deref()
                    {
                        return Err(ExecutionError::Invariant);
                    }
                    self.phase = Phase::Clear;
                }
                MoveAdvanceAnswer::Geometry(answer) => geometry = Some(answer),
            }
        } else if self.event.is_some() || self.pending.is_some() {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        if self.motion.is_none() {
            if let Some(mut answer) = geometry.take() {
                let (query, _guard) = self
                    .queries
                    .take()
                    .ok_or(ExecutionError::UnfinishedOccurrence)?;
                query
                    .validate_answers(&answer)
                    .map_err(|_| ExecutionError::Invariant)?;
                let action_id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
                let (_, action) = bound(core, &self.actor_id, action_id, self.physical_life)?;
                let replans = action.replans;
                let route = match self.phase {
                    Phase::Route => answer.routes.pop().ok_or(ExecutionError::Invariant)?,
                    Phase::Probe => {
                        if answer.walking.pop() != Some(true) {
                            self.fail(&rules.unreachable.message)?;
                            return self.drive(core, None);
                        }
                        let destination = action
                            .destination
                            .as_ref()
                            .ok_or(ExecutionError::Invariant)?;
                        self._reservation.resize(
                            self._reservation
                                .bytes()
                                .checked_add(
                                    size_of::<SurfacePoint>() + destination.surface_id.len(),
                                )
                                .ok_or(ExecutionError::Capacity)?,
                        )?;
                        let mut path = Vec::with_capacity(1);
                        path.push(destination.clone());
                        RoutePlan::Reached {
                            path,
                            length: 0.0,
                            expanded: 0,
                        }
                    }
                    _ => return Err(ExecutionError::Invariant),
                };
                match route {
                    RoutePlan::Reached { path, .. } => {
                        core.physical().replace_action_route(
                            &self.actor_id,
                            action_id,
                            ActionRouteWrite {
                                path,
                                navigation: None,
                                stage: "approaching".into(),
                                replans,
                            },
                        )?;
                        self.start_motion(
                            core,
                            installed.movement_speed(
                                core.state
                                    .physical
                                    .entities
                                    .get(&self.actor_id)
                                    .ok_or(ExecutionError::MissingEntity)?,
                            )? * self.seconds,
                            Phase::PositiveMotion,
                        )?;
                    }
                    RoutePlan::Pending { mut request, .. } => {
                        let (entity, _) =
                            bound(core, &self.actor_id, action_id, self.physical_life)?;
                        // Territorial pursuit is not an admitted live family;
                        // the actual selected ground-refuge request uses its
                        // verified episode/profile navigation wait unchanged.
                        if entity.threat.is_some() {
                            return Err(ExecutionError::UnsupportedFamily);
                        }
                        if entity
                            .actor
                            .as_ref()
                            .is_some_and(|actor| actor.controller == "native")
                        {
                            if let Some(animal) = &entity.animal {
                                let pin = animal
                                    .episode
                                    .as_ref()
                                    .map_or(&animal.profile, |episode| &episode.profile_pin);
                                self._reservation.resize(
                                    self._reservation
                                        .bytes()
                                        .checked_add(pin.id.len() + pin.digest.len() + 64)
                                        .ok_or(ExecutionError::Capacity)?,
                                )?;
                                let key =
                                    profile_key(pin).map_err(|_| ExecutionError::Invariant)?;
                                let profile = installed
                                    .response_profiles
                                    .get(&key)
                                    .filter(|profile| profile.pin() == pin)
                                    .ok_or(ExecutionError::Invariant)?
                                    .value();
                                self._reservation.resize(
                                    self._reservation
                                        .bytes()
                                        .checked_add(6)
                                        .ok_or(ExecutionError::Capacity)?,
                                )?;
                                request.wait = Some(
                                    match profile.candidates.navigation_wait {
                                        NavigationWait::World => "world",
                                        NavigationWait::Entity => "entity",
                                    }
                                    .into(),
                                );
                            }
                        }
                        core.physical().replace_action_route(
                            &self.actor_id,
                            action_id,
                            ActionRouteWrite {
                                path: Vec::new(),
                                navigation: Some(NavigationPending {
                                    request,
                                    failure: None,
                                }),
                                stage: "approaching".into(),
                                replans,
                            },
                        )?;
                        self.phase = Phase::Done;
                    }
                    RoutePlan::InvalidEndpoint { .. }
                    | RoutePlan::NoRoute { .. }
                    | RoutePlan::BudgetExceeded { .. } => self.fail(&rules.no_route.message)?,
                }
            } else if self.queries.is_some() {
                return Err(ExecutionError::UnfinishedOccurrence);
            }
        }
        loop {
            if let Some(motion) = &mut self.motion {
                let complete = match motion.step(core, geometry.take())? {
                    MotionStep::Geometry(_) => return Ok(Progress::Geometry),
                    MotionStep::Complete(complete) => complete,
                };
                self.binding = motion.binding();
                self.motion = None;
                let action_id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
                if !complete {
                    core.physical()
                        .clear_movement_path(&self.actor_id, action_id)?;
                }
                self.phase = if self.phase == Phase::ZeroMotion {
                    Phase::Check
                } else if !complete
                    && bound(core, &self.actor_id, action_id, self.physical_life)?
                        .1
                        .replans
                        .unwrap_or(0)
                        >= installed.movement_settings.max_replans
                {
                    self.fail(&rules.movement_blocked_route)?;
                    Phase::Finish
                } else {
                    Phase::Done
                };
                continue;
            }
            match self.phase {
                Phase::Start => {
                    let entity = core
                        .state
                        .physical
                        .entities
                        .get(&self.actor_id)
                        .ok_or(ExecutionError::MissingEntity)?;
                    let Some(action) = entity
                        .actor
                        .as_ref()
                        .and_then(|actor| actor.action.as_ref())
                    else {
                        self.phase = Phase::Done;
                        continue;
                    };
                    // The status-effect's real condition/rate owner determines
                    // its completion; this action clock never counts it down.
                    if action.kind == "status-effect" {
                        self.phase = Phase::Done;
                        continue;
                    }
                    if action.kind != "move" || entity.spatial.local_pose.is_some() {
                        return Err(ExecutionError::UnsupportedFamily);
                    }
                    self.reserve(action.id.len())?;
                    self.action_id = Some(action.id.clone());
                    self.physical_life =
                        entity.physical_life().ok_or(ExecutionError::MissingActor)?;
                    if action.stage == "working" {
                        if core.physical().advance_movement_work(
                            &self.actor_id,
                            self.action_id.as_deref().ok_or(ExecutionError::Invariant)?,
                            self.seconds,
                            installed.time_epsilon,
                        )? {
                            self.phase = Phase::Arrival
                        } else {
                            self.phase = Phase::Done
                        }
                        continue;
                    }
                    if action.stage != "approaching" {
                        return Err(ExecutionError::UnsupportedFamily);
                    }
                    if let Some(navigation) = &action.navigation {
                        if let Some(failure) = &navigation.failure {
                            self.fail(failure)?;
                            continue;
                        }
                        let profile = crate::status::effective_body_profile(entity, &self.budget)?;
                        let request = &navigation.request;
                        if request.geometry_revision == installed.geometry.spatial.revision
                            && request.body.radius == profile.radius
                            && request.body.height == profile.height
                            && request.body.max_slope == profile.max_slope
                            && supported(entity).is_some_and(|(position, surface)| {
                                request.from.surface_id == surface
                                    && crate::spatial::distance(request.from.point(), position)
                                        < 1e-7
                            })
                        {
                            self.phase = Phase::Done;
                            continue;
                        }
                        core.physical().clear_action_navigation(
                            &self.actor_id,
                            self.action_id.as_deref().ok_or(ExecutionError::Invariant)?,
                        )?;
                    }
                    let (_, action) = bound(
                        core,
                        &self.actor_id,
                        self.action_id.as_deref().ok_or(ExecutionError::Invariant)?,
                        self.physical_life,
                    )?;
                    if action.destination.is_none() {
                        self.fail(&rules.movement_missing_destination)?;
                        continue;
                    }
                    if self.seconds == 0.0 {
                        self.start_motion(core, 0.0, Phase::ZeroMotion)?
                    } else {
                        self.phase = Phase::Check
                    }
                }
                Phase::Check => {
                    let action_id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
                    let (entity, action) =
                        bound(core, &self.actor_id, action_id, self.physical_life)?;
                    if in_reach(
                        entity,
                        action,
                        installed.movement_settings.arrival_tolerance,
                    ) {
                        self.phase = Phase::Arrival;
                        continue;
                    }
                    let destination = action
                        .destination
                        .as_ref()
                        .ok_or(ExecutionError::Invariant)?;
                    let useful = action.path.last().is_some_and(|point| {
                        point.surface_id == destination.surface_id
                            && crate::spatial::distance(point.point(), destination.point())
                                <= installed.movement_settings.arrival_tolerance
                    });
                    if useful {
                        self.start_motion(
                            core,
                            installed.movement_speed(entity)? * self.seconds,
                            Phase::PositiveMotion,
                        )?;
                        continue;
                    }
                    if action.replans.unwrap_or(0) >= installed.movement_settings.max_replans {
                        self.fail(&rules.movement_changing_route)?;
                        continue;
                    }
                    core.physical()
                        .increment_action_replans(&self.actor_id, action_id)?;
                    let (entity, action) =
                        bound(core, &self.actor_id, action_id, self.physical_life)?;
                    let Some((position, surface)) = supported(entity) else {
                        self.fail(&rules.unreachable.message)?;
                        continue;
                    };
                    let to = action
                        .destination
                        .as_ref()
                        .ok_or(ExecutionError::Invariant)?;
                    let blind =
                        crate::reception::vision_parameters(&installed, entity).radius == 0.0;
                    if blind
                        && crate::spatial::distance(position, to.point())
                            > installed.movement.direct_probe_max_distance()
                    {
                        self.fail(&rules.unreachable.message)?;
                        continue;
                    }
                    let guard = self.budget.reserve(
                        heap_sum([
                            size_of::<GeometryQueries>(),
                            size_of::<RouteQuery>().max(size_of::<WalkingSegment>()),
                            surface.len(),
                            to.surface_id.len(),
                            entity.ordinary_body_profile().id.len(),
                        ])
                        .ok_or(ExecutionError::Capacity)?,
                    )?;
                    let from = SurfacePoint {
                        x: position.x,
                        y: position.y,
                        z: position.z,
                        surface_id: surface.into(),
                    };
                    let body = entity.body_profile().into_owned();
                    let to = to.clone();
                    self.binding.serial = core.journal.next_provider_serial()?;
                    let mut queries = GeometryQueries::new(self.binding);
                    if blind {
                        queries.walking = Vec::with_capacity(1);
                        queries.walking.push(WalkingSegment { from, to, body });
                        self.phase = Phase::Probe
                    } else {
                        queries.routes = Vec::with_capacity(1);
                        queries.routes.push(RouteQuery::Surface { from, to, body });
                        self.phase = Phase::Route
                    }
                    self.queries = Some((queries, guard));
                    return Ok(Progress::Geometry);
                }
                Phase::Arrival => {
                    let action_id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
                    let (entity, action) =
                        bound(core, &self.actor_id, action_id, self.physical_life)?;
                    if !in_reach(
                        entity,
                        action,
                        installed.movement_settings.arrival_tolerance,
                    ) {
                        self.fail(&rules.movement_destination_not_reached)?;
                        continue;
                    }
                    let native = action.native_locomotion.is_some();
                    let routine = if let Some(record) = core
                        .state
                        .activity
                        .active(action_id)
                        .map_err(ExecutionError::Activity)?
                    {
                        let mut context = ActivityRecordingContext::from_occurrence(record);
                        context.status = ActivityStatus::Completed;
                        context.outcome = Some((true, "completed"));
                        // install/physical.rs refuses actual Actor.encounters,
                        // and the selected writers do not create that family.
                        // The admitted world's reciprocal audience is therefore
                        // genuinely absent, never guessed from sight geometry.
                        installed
                            .account_law()
                            .routine_movement(
                                &core.state.physical,
                                &core.state.experience,
                                &self.actor_id,
                                context,
                                crate::worlds::MovementRecordingPhase::Arrival,
                                Some(false),
                            )
                            .map_err(ExecutionError::Received)?
                    } else {
                        false
                    };
                    self.phase = Phase::Finish;
                    if !native && !routine {
                        let point = entity
                            .world_position()
                            .ok_or(ExecutionError::InvalidPosition)?;
                        let bytes = rules
                            .arrival_heap_bound(point)
                            .ok_or(ExecutionError::Capacity)?;
                        self.reserve(
                            bytes
                                + 3 * size_of::<NarrationPart>()
                                + self.actor_id.len() * 3
                                + rules.movement_arrival_event.len()
                                + 128,
                        )?;
                        let text = rules
                            .arrival(point)
                            .map_err(|_| ExecutionError::Invariant)?;
                        return Ok(Progress::Occurrence(self.emit(
                            core,
                            text,
                            &rules.movement_arrival_event,
                            Phase::Finish,
                        )?));
                    }
                }
                Phase::Finish => {
                    self.reserve(
                        rules
                            .maximum_message_bytes()
                            .ok_or(ExecutionError::Capacity)?
                            + self.failure.as_ref().map_or(0, String::len),
                    )?;
                    let result = if let Some(reason) = &self.failure {
                        Outcome {
                            spent: None,
                            outputs: None,
                            ok: false,
                            code: "action-failed".into(),
                            message: reason.clone(),
                            recipe_id: None,
                            item_id: None,
                            entity_id: None,
                            goal_id: None,
                            plan_id: None,
                            action_id: None,
                        }
                    } else {
                        rules.movement_completed.outcome(true)
                    };
                    match core.begin_finish_action(
                        &self.actor_id,
                        self.action_id.as_deref().ok_or(ExecutionError::Invariant)?,
                        result,
                    )? {
                        ActionFinish::Complete(done) => {
                            if done.actor_id() != self.actor_id
                                || Some(done.action_id()) != self.action_id.as_deref()
                            {
                                return Err(ExecutionError::Invariant);
                            }
                            self.phase = Phase::Clear;
                        }
                        ActionFinish::Personal(pending) => {
                            self.pending = Some(pending);
                            return Ok(Progress::Personal);
                        }
                    }
                }
                Phase::Clear => {
                    core.physical().replace_action(
                        &self.actor_id,
                        None,
                        ActionWrite {
                            generation: PlanGenerationWrite::Preserve,
                            behavior: None,
                        },
                    )?;
                    self.phase = if self.failure.is_some() {
                        Phase::Stopped
                    } else {
                        Phase::Done
                    };
                }
                Phase::Stopped => {
                    let reason = self.failure.as_ref().ok_or(ExecutionError::Invariant)?;
                    self.reserve(
                        rules.action_stopped_prefix.len()
                            + reason.len()
                            + 3 * size_of::<NarrationPart>()
                            + self.actor_id.len() * 3
                            + rules.action_stopped_event.len()
                            + 128,
                    )?;
                    let text = format!(
                        "{}{}",
                        rules.action_stopped_prefix,
                        self.failure.as_deref().ok_or(ExecutionError::Invariant)?
                    );
                    return Ok(Progress::Occurrence(self.emit(
                        core,
                        text,
                        &rules.action_stopped_event,
                        Phase::Done,
                    )?));
                }
                Phase::Done => return Ok(Progress::Complete),
                Phase::Route | Phase::Probe | Phase::ZeroMotion | Phase::PositiveMotion => {
                    return Err(ExecutionError::Invariant);
                }
            }
        }
    }
    fn emit(
        &mut self,
        core: &mut CoreMutation<'_>,
        text: String,
        event_type: &str,
        next: Phase,
    ) -> Result<StagedOccurrence, ExecutionError> {
        let mut parts = Vec::with_capacity(3);
        parts.push(NarrationPart::Participant {
            entity_id: self.actor_id.clone(),
            role: PersonRole::Subject,
            article: None,
        });
        parts.push(NarrationPart::Literal(" ".into()));
        parts.push(NarrationPart::Literal(text));
        let event = core.stage_event(EventEmissionIntent {
            event_type: event_type.into(),
            text: EmissionText::Narration(Narration { parts }),
            audience: AudienceSelection::Physical,
            source_id: Some(self.actor_id.clone()),
            target_id: None,
            data: None,
            scope: EventScope::External,
            origin: None,
            exposure: None,
        })?;
        self.event = Some(event.id.clone());
        self.after_event = next;
        Ok(event)
    }
}
