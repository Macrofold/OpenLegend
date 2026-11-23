//! One selected movement action's Source advance, inside its caller's candidate.
//! Positive motion returns at its actual slice boundary; arrival is finalized by
//! the later zero-time advance, after the caller has completed intervening work.
use super::{MotionOperation, MotionStep};
use crate::activity::{ActivityStatus, PendingActivityResult};
use crate::attention::ActivityRecordingContext;
use crate::commands::Outcome;
use crate::contact::{ContactAnswer, ContactStep, ImpactCursor};
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
mod casting;
mod preparing_food;
mod fire;
mod scar_treatment;
mod practice;
mod ranged;
mod follow;
mod hearth;
mod manufacture;
mod feeding;
mod pickup;
mod gathering;

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
    PendingRangedRelease,
    Follow,
    ContactMotionStart,
    ContactMotion,
    EvadeMotion,
    EvadeArrival,
    ZeroMotion,
    Check,
    Route,
    Probe,
    PositiveMotion,
    Arrival,
    FeedReach,
    FeedSight,
    PickupRetire,
    CastLine,
    CookReach,
    HearthWork,
    ScarReach,
    PracticeLine,
    RangedLine,
    RangedPointReview,
    Finish,
    Clear,
    Stopped,
    Done,
}
pub(crate) struct MoveAdvanceCursor {
    actor_id: String,
    action_id: Option<String>,
    physical_life: u64,
    practice_release: Option<practice::PendingPracticeRelease>,
    requested_ranged_release: Option<Box<ranged::ReleaseRequest>>,
    ranged_point_review: Option<Box<ranged::PointWork>>,
    seconds: f64,
    phase: Phase,
    motion: Option<MotionOperation>,
    record_motion: bool,
    observed_track: Option<super::MotionForecast>,
    contact: Option<Box<ImpactCursor>>,
    follow: Option<Box<super::follow::FollowCursor>>,
    meal_sight: Option<crate::reception::SightBatch>,
    queries: Option<(GeometryQueries, ByteReservation)>,
    binding: GeometryBinding,
    failure: Option<crate::text::JsText>,
    hunt_lost_sight: bool,
    pending: Option<PendingActionFinish>,
    gathered_item: Option<crate::commands::ActivityOutput>,
    cast_result: Option<Outcome>,
    production_result: Option<Outcome>,
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
        .filter(|value| value.id == action && (value.owns_ground_route() || value.is_manufacturing()))
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
fn at_destination(entity: &Entity, action: &Action, tolerance: f64) -> bool {
    let Some(destination) = &action.destination else {
        return false;
    };
    supported(entity).is_some_and(|(point, surface)| {
        surface == destination.surface_id
            && crate::spatial::distance(point, destination.point()) <= tolerance
    })
}

fn in_reach(entity: &Entity, action: &Action, tolerance: f64) -> bool {
    action.path.is_empty() && at_destination(entity, action, tolerance)
}
impl MoveAdvanceCursor {
    pub(crate) fn action_id(&self) -> Option<&str> {
        self.action_id.as_deref()
    }
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
            practice_release: None,
            requested_ranged_release: None,
            ranged_point_review: None,
            seconds,
            phase: Phase::Start,
            motion: None,
            record_motion: false,
            observed_track: None,
            contact: None,
            follow: None,
            meal_sight: None,
            queries: None,
            binding,
            failure: None,
            hunt_lost_sight: false,
            pending: None,
            gathered_item: None,
            cast_result: None,
            production_result: None,
            event: None,
            after_event: Phase::Done,
            budget: budget.clone(),
            _reservation: reservation,
        })
    }
    /// Borrow the still-current native preparation after ordinary endpoint
    /// work. The caller has already checked this action's live input window.
    pub(crate) fn pending_timed_release(
        source: &str,
        action: &Action,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, ExecutionError> {
        let Some(pending) = action.attack_execution.as_deref()
            .filter(|execution| execution.ready)
            .and_then(|execution| execution.pending_release.as_deref())
        else { return Ok(None); };
        if action.ranged.is_some() {
            let mut cursor = Self::release_request(
                source, action, binding, pending.lethal_permission.as_ref(),
                pending.selection(), pending.input, false, budget,
            )?;
            cursor.phase = Phase::PendingRangedRelease;
            return Ok(Some(cursor));
        }
        let mut cursor = Self::new(source, 0.0, binding, budget)?;
        cursor.reserve(action.id.len().checked_add(size_of::<ImpactCursor>())
            .ok_or(ExecutionError::Capacity)?)?;
        cursor.action_id = Some(action.id.clone());
        cursor.contact = Some(Box::new(ImpactCursor::request_release(
            source, action, pending.input, false, pending.lethal_permission.as_ref(), binding, budget,
        )?));
        Ok(Some(cursor))
    }
    pub(crate) fn moving_contact(
        actor_id: &str,
        seconds: f64,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let mut cursor = Self::new(actor_id, seconds, binding, budget)?;
        cursor.phase = Phase::ContactMotionStart;
        Ok(cursor)
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
        let occupied = phase == Phase::EvadeMotion
            || (phase == Phase::ContactMotion && action.strike_motion.is_some())
            || (phase == Phase::PositiveMotion
                && (action.native_locomotion.is_some()
                    || entity
                        .actor
                        .as_ref()
                        .is_some_and(|actor| actor.controller == "native")
                        && entity.animal.is_some()));
        let mut motion = MotionOperation::start(
            core,
            &self.actor_id,
            distance,
            occupied,
            self.binding,
            &self.budget,
        )?;
        if self.record_motion && self.seconds > 0.0 && distance > 0.0 {
            motion.record_execution(self.seconds, distance)?;
        }
        self.motion = Some(motion);
        self.phase = phase;
        Ok(())
    }
    pub(crate) fn record_movement(&mut self) {
        self.record_motion = true;
    }

    pub(crate) fn take_executed_track(&mut self) -> Option<super::MotionForecast> {
        self.observed_track.take()
    }

    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<MoveAdvanceAnswer>,
    ) -> Result<MoveAdvanceStep<'a>, ExecutionError> {
        let progress = self.drive(core, answer)?;
        Ok(match progress {
            Progress::Geometry => MoveAdvanceStep::Geometry(self.queries()?),
            Progress::Occurrence(event) => MoveAdvanceStep::Occurrence(event),
            Progress::Personal => MoveAdvanceStep::Personal(self.personal()?),
            Progress::Complete => MoveAdvanceStep::Complete,
        })
    }
    pub(crate) fn queries(&self) -> Result<&GeometryQueries, ExecutionError> {
        if let Some(contact) = &self.contact {
            contact.queries()
        } else if let Some(follow) = &self.follow {
            follow.queries().ok_or(ExecutionError::Invariant)
        } else if let Some(motion) = &self.motion {
            motion.queries().ok_or(ExecutionError::Invariant)
        } else if let Some(sight) = &self.meal_sight {
            Ok(sight.queries())
        } else if let Some(review) = &self.ranged_point_review {
            Ok(review.queries())
        } else {
            Ok(&self.queries.as_ref().ok_or(ExecutionError::Invariant)?.0)
        }
    }
    pub(crate) fn personal(&self) -> Result<&PendingActivityResult, ExecutionError> {
        if let Some(contact) = &self.contact {
            return contact.personal();
        }
        Ok(self
            .pending
            .as_ref()
            .ok_or(ExecutionError::Invariant)?
            .personal())
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
        if let Some(work) = &mut self.contact {
            let answer = answer.map(|answer| match answer {
                MoveAdvanceAnswer::Geometry(answer) => ContactAnswer::Geometry(answer),
                MoveAdvanceAnswer::Occurrence(answer) => ContactAnswer::Occurrence(answer),
                MoveAdvanceAnswer::Personal(answer) => ContactAnswer::Personal(answer),
            });
            match work.step(core, answer)? {
                ContactStep::Geometry => return Ok(Progress::Geometry),
                ContactStep::Occurrence(event) => return Ok(Progress::Occurrence(event)),
                ContactStep::Personal => return Ok(Progress::Personal),
                ContactStep::AdvanceComplete => self.phase = Phase::Done,
                ContactStep::ActionComplete => self.phase = Phase::Finish,
                ContactStep::SightLost => {
                    self.hunt_lost_sight = crate::native_controller::foraging::lost_sight(
                        core,
                        &self.actor_id,
                        self.action_id.as_deref().ok_or(ExecutionError::Invariant)?,
                    )?;
                    self.fail(&rules.natural_contact.unavailable)?;
                }
                ContactStep::Invalidated => self.fail(&rules.natural_contact.unavailable)?,
            }
            self.contact = None;
            return self.drive(core, None);
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
                    if let Some(event) = self.complete_practice_release(core, &completed)? {
                        return Ok(Progress::Occurrence(event));
                    }
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
        if self.follow.is_some() {
            if self.follow_step(core, geometry.take())? {
                return Ok(Progress::Geometry);
            }
        }
        if self.motion.is_none() {
            if let Some(mut answer) = geometry.take() {
                if self.phase == Phase::FeedSight {
                    return self.feed_sight_answer(core, answer);
                }
                if self.phase == Phase::RangedLine {
                    return self.finish_ranged_line(core, answer);
                }
                if self.phase == Phase::RangedPointReview {
                    return self.finish_point_review(core, answer);
                }
                let (query, _guard) = self
                    .queries
                    .take()
                    .ok_or(ExecutionError::UnfinishedOccurrence)?;
                query
                    .validate_answers(&answer)
                    .map_err(|_| ExecutionError::Invariant)?;
                let action_id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
                let (_, action) = bound(core, &self.actor_id, action_id, self.physical_life)?;
                if self.phase == Phase::FeedReach {
                    return self.feed_reach_answer(core, answer.sight.pop() == Some(true));
                }
                if self.phase == Phase::CookReach {
                    return self.cook_reach_answer(core, answer.sight.pop() == Some(true));
                }
                if self.phase == Phase::HearthWork { return self.finish_hearth_geometry(core, answer); }
                if self.phase == Phase::ScarReach {
                    return self.finish_scar_treatment(core, answer.sight.pop() == Some(true));
                }
                if self.phase == Phase::PracticeLine {
                    return self.finish_practice_line(core, answer.sight.pop() == Some(true));
                }
                if self.phase == Phase::CastLine {
                    return self.finish_cast_line(core, answer);
                }
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
                        path.push(destination.physical().clone());
                        RoutePlan::Reached {
                            path,
                            length: 0.0,
                            expanded: 0,
                        }
                    }
                    _ => return Err(ExecutionError::Invariant),
                };
                let crate::geometry::GuardedRoutePlan(route, storage) =
                    crate::geometry::route_plan(route, &self.budget)?;
                if !core
                    .physical()
                    .admit_territorial_detour(&self.actor_id, &route)?
                {
                    self.fail(&rules.no_route.message)?;
                    return self.drive(core, None);
                }
                match route {
                    RoutePlan::Reached { path, .. } => {
                        core.physical().replace_action_route(
                            &self.actor_id,
                            action_id,
                            crate::state::FundedActionRoute::from_storage(
                                ActionRouteWrite {
                                    path,
                                    navigation: None,
                                    stage: "approaching".into(),
                                    replans,
                                },
                                storage,
                                &self.budget,
                            )?,
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
                            crate::state::FundedActionRoute::from_storage(
                                ActionRouteWrite {
                                    path: Vec::new(),
                                    navigation: Some(NavigationPending {
                                        request,
                                        failure: None,
                                    }),
                                    stage: "approaching".into(),
                                    replans,
                                },
                                storage,
                                &self.budget,
                            )?,
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
                if let Some(track) = motion.take_executed_track() {
                    self.observed_track = Some(track);
                }
                self.motion = None;
                let action_id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
                if self.phase == Phase::EvadeMotion {
                    let rule = installed.occurrence_rules.value().evasion.as_ref().ok_or(ExecutionError::Invariant)?;
                    if !complete {
                        self.fail(&rule.obstructed)?;
                    } else if core.physical().advance_timed_work(
                        &self.actor_id, action_id, self.seconds, installed.time_epsilon,
                    )? {
                        self.phase = Phase::EvadeArrival;
                    } else {
                        self.phase = Phase::Done;
                    }
                    continue;
                }
                if !complete {
                    core.physical()
                        .clear_movement_path(&self.actor_id, action_id)?;
                }
                self.phase = if !complete
                    && bound(core, &self.actor_id, action_id, self.physical_life)?.1.follow.is_some()
                {
                    self.fail(&installed.occurrence_rules.value().response.offers.follow_outcomes.blocked)?;
                    Phase::Finish
                } else if self.phase == Phase::ContactMotion {
                    Phase::Done
                } else if self.phase == Phase::ZeroMotion {
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
                Phase::ContactMotionStart => {
                    let entity = core
                        .state
                        .physical
                        .entities
                        .get(&self.actor_id)
                        .ok_or(ExecutionError::MissingEntity)?;
                    let action = entity
                        .actor
                        .as_ref()
                        .and_then(|actor| actor.action.as_ref())
                        .ok_or(ExecutionError::MissingActor)?;
                    let motion = action.strike_motion.as_ref();
                    if motion.is_none() && !action.has_contact_approach() {
                        return Err(ExecutionError::Invariant);
                    }
                    if action.path.is_empty()
                        || action.navigation.is_some()
                        || installed
                            .capabilities
                            .capability_blocked(Some(entity), "locomotion")?
                    {
                        self.phase = Phase::Done;
                        continue;
                    }
                    self.reserve(action.id.len())?;
                    self.action_id = Some(action.id.clone());
                    self.physical_life =
                        entity.physical_life().ok_or(ExecutionError::MissingActor)?;
                    // The slice has already installed its closing time. The
                    // windup can move during the interval ending at release.
                    let opened_at = core.state.physical.header.sim_time - self.seconds;
                    let elapsed = motion.map_or(self.seconds, |motion| {
                        self.seconds.min((motion.release_at - opened_at).max(0.0))
                    });
                    self.start_motion(
                        core,
                        installed.movement_speed(entity)? * elapsed,
                        Phase::ContactMotion,
                    )?;
                }
                Phase::PendingRangedRelease => return self.check_ranged(core),
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
                    if !action.supported_native_action() {
                        return Err(ExecutionError::UnsupportedFamily);
                    }
                    self.reserve(action.id.len())?;
                    self.action_id = Some(action.id.clone());
                    self.physical_life =
                        entity.physical_life().ok_or(ExecutionError::MissingActor)?;
                    if let Some(evasion) = &action.evasion {
                        let rule = installed.occurrence_rules.value().evasion.as_ref().ok_or(ExecutionError::Invariant)?;
                        let now = core.state.physical.header.sim_time;
                        if evasion.source_life != self.physical_life
                            || !entity.actively_participates()
                            || installed.capabilities.capability_blocked(Some(entity), "locomotion")?
                            || installed.capabilities.capability_blocked(Some(entity), "actions")?
                        {
                            self.fail(&rule.interrupted)?;
                        } else if self.seconds > 0.0 {
                            let elapsed = self.seconds.min((evasion.ends_at - (now - self.seconds)).max(0.0));
                            self.start_motion(core, evasion.speed * elapsed, Phase::EvadeMotion)?;
                        } else {
                            self.phase = Phase::Done;
                        }
                        continue;
                    }
                    if action.follow.is_some() {
                        if self.seconds > 0.0 {
                            if action.stage == "approaching" && action.navigation.is_none() && !action.path.is_empty() {
                                self.start_motion(core, installed.movement_speed(entity)? * self.seconds, Phase::PositiveMotion)?;
                            } else {
                                self.phase = Phase::Done;
                            }
                        } else if self.prepare_follow(core)? {
                            return Ok(Progress::Geometry);
                        }
                        continue;
                    }
                    if action.is_natural_contact() {
                        self.contact = Some(Box::new(ImpactCursor::new(
                            &self.actor_id,
                            action,
                            self.seconds,
                            self.binding,
                            &self.budget,
                        )?));
                        return self.drive(core, None);
                    }
                    if action.is_picking_up() && !installed.retained.item_handling_read
                        .can_handle(&entity.spatial.body.id)
                    {
                        self.fail(&rules.not_applicable.message)?;
                        continue;
                    }
                    if action.is_placing_hearth() && action.stage == "working" {
                        if action.remaining_seconds > self.seconds + installed.time_epsilon {
                            core.physical().advance_timed_work(&self.actor_id,
                                self.action_id.as_deref().ok_or(ExecutionError::Invariant)?,
                                self.seconds, installed.time_epsilon)?;
                            self.phase = Phase::Done;
                            continue;
                        }
                        return self.check_hearth(core);
                    }
                    if action.is_guard() {
                        match crate::contact::guard::advance(core, &self.actor_id)? {
                            Some(true) => self.phase = Phase::Finish,
                            Some(false) => self.phase = Phase::Done,
                            None => self.fail(&rules.not_applicable.message)?,
                        }
                        continue;
                    }
                    if action.is_ranged_attack() && action.stage == "working" {
                        if action.holds_ready_aim() {
                            return self.check_ranged(core);
                        }
                        if action.remaining_seconds > self.seconds + installed.time_epsilon {
                            core.physical().advance_timed_work(&self.actor_id,
                                self.action_id.as_deref().ok_or(ExecutionError::Invariant)?,
                                self.seconds, installed.time_epsilon)?;
                            self.phase = Phase::Done;
                            continue;
                        }
                        return self.check_ranged(core);
                    }
                    if action.is_practice_shot() && action.stage == "working" {
                        if action.remaining_seconds > self.seconds + installed.time_epsilon {
                            core.physical().advance_timed_work(&self.actor_id,
                                self.action_id.as_deref().ok_or(ExecutionError::Invariant)?,
                                self.seconds, installed.time_epsilon)?;
                            self.phase = Phase::Done;
                            continue;
                        }
                        return self.check_practice(core);
                    }
                    if action.is_treating_scar() {
                        if action.remaining_seconds > self.seconds + installed.time_epsilon {
                            core.physical().advance_timed_work(
                                &self.actor_id,
                                self.action_id.as_deref().ok_or(ExecutionError::Invariant)?,
                                self.seconds,
                                installed.time_epsilon,
                            )?;
                            self.phase = Phase::Done;
                            continue;
                        }
                        return self.check_scar_treatment(core);
                    }
                    if (action.is_picking_up() || action.is_tending_fire()) && action.stage == "working" {
                        if action.remaining_seconds > self.seconds + installed.time_epsilon {
                            core.physical().advance_timed_work(
                                &self.actor_id,
                                self.action_id.as_deref().ok_or(ExecutionError::Invariant)?,
                                self.seconds,
                                installed.time_epsilon,
                            )?;
                            self.phase = Phase::Done;
                            continue;
                        }
                        return self.begin_feed_check(core);
                    }
                    if (action.feeding.is_some() || action.is_gathering()) && action.stage == "working" {
                        return self.begin_feed_check(core);
                    }
                    if action.is_manufacturing() {
                        return self.advance_craft(core);
                    }
                    if action.is_cooking() && action.stage == "working" {
                        return self.check_cook(core);
                    }
                    if action.is_casting() && action.stage == "working" {
                        return self.advance_cast(core);
                    }
                    if action.stage == "working" {
                        if core.physical().advance_timed_work(
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
                        let profile = entity.travel_body_profile();
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
                    if action.feeding.is_none() && !action.is_gathering() && !action.is_picking_up() && !action.is_cooking() && !action.is_tending_fire() && !action.is_projectile_action() && action.destination.is_none() {
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
                    if action.feeding.is_some() || action.is_gathering() || action.is_picking_up() || action.is_tending_fire() {
                        return self.begin_feed_check(core);
                    }
                    if action.is_cooking() {
                        return self.check_cook(core);
                    }
                    if action.is_projectile_action() {
                        return self.advance_shot_approach(core);
                    }
                    let tolerance = if action.is_casting() {
                        let Some(source) = action.target_id.as_deref().and_then(|id| crate::casts::source(core.state, id)) else {
                            self.fail(crate::casts::messages().missing_source)?;
                            continue;
                        };
                        source.rules.definition.stance_tolerance
                    } else {
                        installed.movement_settings.arrival_tolerance
                    };
                    if in_reach(
                        entity,
                        action,
                        tolerance,
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
                    let body = entity.travel_body_profile().into_owned();
                    let to = to.physical().clone();
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
                Phase::EvadeArrival => {
                    let action_id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
                    let (entity, action) = bound(core, &self.actor_id, action_id, self.physical_life)?;
                    let rule = installed.occurrence_rules.value().evasion.as_ref().ok_or(ExecutionError::Invariant)?;
                    // Evasion keeps its sole committed waypoint through the deadline.
                    if !at_destination(entity, action, crate::movement::evasion::COORDINATE_EPSILON) {
                        self.fail(&rule.obstructed)?;
                        continue;
                    }
                    self.reserve(
                        rule.finished.storage_bytes() + 3 * size_of::<NarrationPart>()
                            + self.actor_id.len() * 3 + rule.ended_event.len() + 128,
                    )?;
                    return Ok(Progress::Occurrence(self.emit(
                        core, rule.finished.clone(), &rule.ended_event, Phase::Finish,
                    )?));
                }
                Phase::Arrival => {
                    let action_id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
                    let (entity, action) =
                        bound(core, &self.actor_id, action_id, self.physical_life)?;
                    if action.is_placing_hearth() { return self.check_hearth(core); }
                    if action.is_practice_shot() { return self.check_practice(core); }
                    if action.is_ranged_attack() { return self.check_ranged(core); }
                    if action.is_casting() {
                        self.start_target_work(core, action.replans)?;
                        self.phase = Phase::Done;
                        continue;
                    }
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
                            text.into(),
                            &rules.movement_arrival_event,
                            Phase::Finish,
                        )?));
                    }
                }
                Phase::PickupRetire => self.retire_pickup_source(core)?,
                Phase::Finish => {
                    self.reserve(
                        rules
                            .maximum_message_bytes()
                            .ok_or(ExecutionError::Capacity)?
                            + self.failure.as_ref().map_or(0, crate::text::JsText::storage_bytes),
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
                    } else if let Some(rule) = core.state.physical.entities.get(&self.actor_id)
                        .and_then(|entity| entity.actor.as_ref()).and_then(|actor| actor.action.as_ref())
                        .filter(|action| action.is_evading())
                        .and_then(|_| installed.occurrence_rules.value().evasion.as_ref())
                    {
                        self.reserve(rule.completed.storage_bytes())?;
                        let mut completed = rules.movement_completed.outcome(true);
                        completed.message = rule.completed.clone();
                        completed
                    } else if let Some(result) = self.production_result.take() {
                        result
                    } else if let Some(result) = self.cast_result.take() {
                        result
                    } else if let Some(output) = self.gathered_item.take() {
                        let mut completed = rules.movement_completed.outcome(true);
                        completed.message = crate::worlds::base_gathering::copy().completed.as_str().into();
                        self.reserve(output.item_id.len() + size_of::<crate::commands::ActivityOutput>())?;
                        completed.item_id = Some(output.item_id.clone());
                        completed.outputs = Some(vec![output]);
                        completed
                    } else if core
                        .state
                        .physical
                        .entities
                        .get(&self.actor_id)
                        .and_then(|entity| entity.actor.as_ref())
                        .and_then(|actor| actor.action.as_ref())
                        .is_some_and(|action| action.feeding.is_some())
                    {
                        let mut completed = rules.movement_completed.outcome(true);
                        completed.message = crate::worlds::base_foraging::feeding_terms()
                            .completed
                            .as_str()
                            .into();
                        completed
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
                    if self.failure.is_some() && !self.hunt_lost_sight {
                        crate::native_controller::foraging::work_failed(
                            core,
                            &self.actor_id,
                            self.action_id.as_deref().ok_or(ExecutionError::Invariant)?,
                        )?;
                    }
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
                    let reason_bytes = self.failure.as_ref().ok_or(ExecutionError::Invariant)?.storage_bytes();
                    self.reserve(
                        rules.action_stopped_prefix.len()
                            + reason_bytes
                            + 3 * size_of::<NarrationPart>()
                            + self.actor_id.len() * 3
                            + rules.action_stopped_event.len()
                            + 128,
                    )?;
                    let reason = self.failure.as_ref().ok_or(ExecutionError::Invariant)?;
                    let text = crate::text::JsText::concat(&[&rules.action_stopped_prefix.as_str().into(), reason]);
                    return Ok(Progress::Occurrence(self.emit(
                        core,
                        text,
                        &rules.action_stopped_event,
                        Phase::Done,
                    )?));
                }
                Phase::Done => return Ok(Progress::Complete),
                Phase::Follow
                | Phase::Route
                | Phase::Probe
                | Phase::ZeroMotion
                | Phase::PositiveMotion
                | Phase::ContactMotion
                | Phase::EvadeMotion
                | Phase::FeedReach
                | Phase::FeedSight
                | Phase::HearthWork
                | Phase::ScarReach
                | Phase::PracticeLine | Phase::RangedLine | Phase::RangedPointReview
                | Phase::CastLine
                | Phase::CookReach => {
                    return Err(ExecutionError::Invariant);
                }
            }
        }
    }
    fn emit(
        &mut self,
        core: &mut CoreMutation<'_>,
        text: crate::text::JsText,
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
        let activity = (self.phase == Phase::EvadeArrival).then(|| {
            self.action_id.as_deref().ok_or(ExecutionError::Invariant)
        }).transpose()?;
        if let Some(action) = activity {
            self.reserve(crate::host::retained_size::map_storage::<String, crate::reception::EventScalar>(2)
                .ok_or(ExecutionError::Capacity)? + action.len() * 2 + "actionIdsemanticTrigger".len())?;
        }
        let data = if self.phase == Phase::EvadeArrival {
            let action = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
            Some(indexmap::IndexMap::from([
                ("actionId".into(), crate::reception::EventScalar::Text(action.into())),
                ("semanticTrigger".into(), crate::reception::EventScalar::Boolean(true)),
            ]))
        } else {
            None
        };
        let event = core.stage_event(EventEmissionIntent {
            event_type: event_type.into(),
            text: EmissionText::Narration(Narration { parts }),
            audience: AudienceSelection::Physical,
            source_id: Some(self.actor_id.clone()),
            target_id: None,
            data,
            scope: EventScope::External,
            origin: None,
            exposure: None,
        })?;
        self.event = Some(event.id.clone());
        self.after_event = next;
        Ok(event)
    }
}
