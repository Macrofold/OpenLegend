//! The clock owns windup and recovery. This cursor owns the one checked
//! impact and drives the existing body and occurrence continuations.
use super::motion::support_parts;
use super::{
    StrikeMotion, StrikeOutcome, StrikePhase, StrikeRoute, StrikeRouteStep, may_target, profile,
    reach,
};
use crate::activity::PendingActivityResult;
use crate::body::{BodyAnswer, BodyStep, HealthChangeCursor};
use crate::events::{
    AudienceSelection, CompletedOccurrence, EmissionText, EventEmissionIntent, EventScope,
};
use crate::execution::{
    ActionFinish, ActionRouteWrite, ActionWrite, CoreMutation, ExecutionError, PendingActionFinish,
    PendingStatusEnd, PlanGenerationWrite, StagedOccurrence, StatusEnd,
};
use crate::experience::AcquiredActivityResult;
use crate::geometry::{
    GeometryAnswers, GeometryBinding, GeometryQueries, GuardedRoutePlan, RoutePlan, RouteQuery,
    SightRay,
};
use crate::host::retained_size::HeapBytes;
use crate::host::{ByteBudget, ByteReservation};
use crate::narration::{Narration, NarrationPart, PersonRole};
use crate::reception::{EventScalar, SightBatch};
use crate::state::{Action, Entity, FundedActionRoute, FundedStrikeMotion, NavigationPending};
use indexmap::IndexMap;
use std::mem::size_of;

pub(crate) enum ContactAnswer {
    Geometry(GeometryAnswers),
    Occurrence(CompletedOccurrence),
    Personal(AcquiredActivityResult),
}

pub(crate) enum ContactStep {
    Geometry,
    Occurrence(StagedOccurrence),
    Personal,
    AdvanceComplete,
    ActionComplete,
    SightLost,
    Invalidated,
}

pub(crate) struct ImpactCursor {
    source: String,
    action: String,
    target: String,
    seconds: f64,
    binding: GeometryBinding,
    phase: Phase,
    sight: Option<SightBatch>,
    impact: Option<GeometryQueries>,
    route: Option<StrikeRoute>,
    body: Option<HealthChangeCursor>,
    health_before: f64,
    raw_injury: f64,
    hit_reason: Option<&'static str>,
    status_ids: Vec<String>,
    status_index: usize,
    pending_status: Option<PendingStatusEnd>,
    pending_contact: Option<PendingActionFinish>,
    event: Option<String>,
    budget: ByteBudget,
    storage: ByteReservation,
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum Phase {
    Start,
    Sight,
    StartRange,
    MotionRoute,
    ApproachEndpoint,
    ApproachRoute,
    Reach,
    ReviewRefused,
    Body,
    Interrupt,
    BodyEvent,
    Result,
    Done,
}

impl ImpactCursor {
    pub(crate) fn new(
        source: &str,
        action: &Action,
        seconds: f64,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let target = action
            .target_id
            .as_deref()
            .ok_or(ExecutionError::Invariant)?;
        let storage =
            budget.reserve(size_of::<Self>() + source.len() + action.id.len() + target.len())?;
        Ok(Self {
            source: source.into(),
            action: action.id.clone(),
            target: target.into(),
            seconds,
            binding,
            phase: Phase::Start,
            sight: None,
            impact: None,
            route: None,
            body: None,
            health_before: 0.0,
            raw_injury: 0.0,
            hit_reason: None,
            status_ids: Vec::new(),
            status_index: 0,
            pending_status: None,
            pending_contact: None,
            event: None,
            budget: budget.clone(),
            storage,
        })
    }

    pub(crate) fn queries(&self) -> Result<&GeometryQueries, ExecutionError> {
        self.sight
            .as_ref()
            .map(SightBatch::queries)
            .or_else(|| self.route.as_ref().map(StrikeRoute::queries))
            .or(self.impact.as_ref())
            .ok_or(ExecutionError::Invariant)
    }

    pub(crate) fn personal(&self) -> Result<&PendingActivityResult, ExecutionError> {
        if let Some(status) = &self.pending_status {
            return Ok(status.personal());
        }
        if let Some(contact) = &self.pending_contact {
            return Ok(contact.personal());
        }
        self.body
            .as_ref()
            .ok_or(ExecutionError::Invariant)?
            .personal()
    }

    fn source<'a>(
        &self,
        entities: &'a crate::state::EntityStore,
    ) -> Result<(&'a Entity, &'a Action), ExecutionError> {
        let entity = entities
            .get(&self.source)
            .ok_or(ExecutionError::MissingActor)?;
        let action = entity
            .actor
            .as_ref()
            .and_then(|actor| actor.action.as_ref())
            .filter(|action| action.id == self.action && action.is_natural_contact())
            .ok_or(ExecutionError::Invariant)?;
        Ok((entity, action))
    }

    fn reserve(&mut self, bytes: usize) -> Result<(), ExecutionError> {
        self.storage.resize(
            self.storage
                .bytes()
                .checked_add(bytes)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(())
    }

    fn check_start_range(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<ContactStep, ExecutionError> {
        let (source, action) = self.source(&core.state.physical.entities)?;
        let installed = &core.state.installed;
        let definition = action
            .definition_id
            .as_deref()
            .and_then(|id| profile(installed, source, id))
            .ok_or(ExecutionError::Invariant)?;
        let start_range = definition.preparation_motion.as_ref().map_or_else(
            || definition.approach_range.unwrap_or(definition.range),
            |motion| motion.start_range,
        );
        let target = core
            .state
            .physical
            .entities
            .get(&self.target)
            .ok_or(ExecutionError::Invariant)?;
        let Some(ray) = reach(
            installed,
            definition,
            source,
            target,
            start_range,
            &self.budget,
        )?
        else {
            return if action.has_contact_approach() {
                self.continue_contact_approach(core)
            } else {
                Ok(ContactStep::Invalidated)
            };
        };
        self.reserve(size_of::<GeometryQueries>() + size_of::<SightRay>())?;
        self.binding.serial = core.journal.next_provider_serial()?;
        let mut queries = GeometryQueries::new(self.binding);
        queries.sight = vec![ray];
        self.impact = Some(queries);
        self.phase = Phase::StartRange;
        Ok(ContactStep::Geometry)
    }

    fn continue_contact_approach(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<ContactStep, ExecutionError> {
        let (source, action) = self.source(&core.state.physical.entities)?;
        if let Some(endpoint) = action.path.last() {
            let target = core
                .state
                .physical
                .entities
                .get(&self.target)
                .ok_or(ExecutionError::MissingEntity)?;
            let definition = action
                .definition_id
                .as_deref()
                .and_then(|id| profile(&core.state.installed, source, id))
                .ok_or(ExecutionError::Invariant)?;
            if let Some(ray) = crate::geometry::interaction_reach_from(
                source,
                target,
                endpoint.point(),
                definition.approach_range.unwrap_or(definition.range),
                &self.budget,
            )? {
                self.reserve(size_of::<GeometryQueries>() + size_of::<SightRay>())?;
                self.binding.serial = core.journal.next_provider_serial()?;
                let mut query = GeometryQueries::new(self.binding);
                query.sight.push(ray);
                self.impact = Some(query);
                self.phase = Phase::ApproachEndpoint;
                return Ok(ContactStep::Geometry);
            }
        }
        self.replan_contact_approach(core)
    }

    fn replan_contact_approach(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<ContactStep, ExecutionError> {
        let (source, action) = self.source(&core.state.physical.entities)?;
        let installed = &core.state.installed;
        if action.replans.unwrap_or(0) >= installed.movement_settings.max_replans {
            return Ok(ContactStep::Invalidated);
        }
        let target = core
            .state
            .physical
            .entities
            .get(&self.target)
            .ok_or(ExecutionError::MissingEntity)?;
        let definition = action
            .definition_id
            .as_deref()
            .and_then(|id| profile(installed, source, id))
            .ok_or(ExecutionError::Invariant)?;
        let Some((from, surface)) = support_parts(source) else {
            return Ok(ContactStep::Invalidated);
        };
        let body = crate::status::effective_body_profile(source, &self.budget)?;
        let target_body = crate::status::effective_body_profile(target, &self.budget)?;
        let position = target
            .world_position()
            .ok_or(ExecutionError::InvalidPosition)?;
        let support = support_parts(target);
        self.reserve(
            size_of::<GeometryQueries>()
                + size_of::<RouteQuery>()
                + surface.len()
                + support.map_or(0, |(_, surface)| surface.len())
                + body.id.len(),
        )?;
        let supported = |point: crate::state::Point, surface: &str| crate::state::SurfacePoint {
            x: point.x,
            y: point.y,
            z: point.z,
            surface_id: surface.into(),
        };
        let mut goal = position;
        goal.y += target_body.interaction_height;
        self.binding.serial = core.journal.next_provider_serial()?;
        let mut query = GeometryQueries::new(self.binding);
        query.routes.push(RouteQuery::Approach {
            from: supported(from, surface),
            body: (*body).clone(),
            target_position: position,
            target_support: support.map(|(at, surface)| supported(at, surface)),
            reach: definition.approach_range.unwrap_or(definition.range),
            goal,
        });
        self.impact = Some(query);
        self.phase = Phase::ApproachRoute;
        Ok(ContactStep::Geometry)
    }

    fn finish_contact_approach_route(
        &mut self,
        core: &mut CoreMutation<'_>,
        mut answer: GeometryAnswers,
    ) -> Result<ContactStep, ExecutionError> {
        self.impact
            .take()
            .ok_or(ExecutionError::Invariant)?
            .validate_answers(&answer)
            .map_err(|_| ExecutionError::Invariant)?;
        let answer = answer.routes.pop().ok_or(ExecutionError::Invariant)?;
        let GuardedRoutePlan(plan, mut custody) =
            crate::geometry::route_plan(answer, &self.budget)?;
        let (path, navigation) = match plan {
            RoutePlan::Reached { path, .. } => (path, None),
            RoutePlan::Pending { mut request, .. } => {
                custody.resize(
                    custody
                        .bytes()
                        .checked_add("entity".len())
                        .ok_or(ExecutionError::Capacity)?,
                )?;
                request.wait = Some("entity".into());
                (
                    Vec::new(),
                    Some(NavigationPending {
                        request,
                        failure: None,
                    }),
                )
            }
            _ => return Ok(ContactStep::Invalidated),
        };
        let replans = self
            .source(&core.state.physical.entities)?
            .1
            .replans
            .unwrap_or(0)
            .checked_add(1)
            .ok_or(ExecutionError::Invariant)?;
        custody.resize(
            custody
                .bytes()
                .checked_add("approaching".len())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let route = FundedActionRoute::from_storage(
            ActionRouteWrite {
                path,
                navigation,
                stage: "approaching".into(),
                replans: Some(replans),
            },
            custody,
            &self.budget,
        )?;
        core.physical()
            .replace_action_route(&self.source, &self.action, route)?;
        Ok(ContactStep::AdvanceComplete)
    }

    fn start_chosen_windup(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<ContactStep, ExecutionError> {
        let custody = self.budget.reserve("working".len())?;
        let route = FundedActionRoute::from_storage(
            ActionRouteWrite {
                path: Vec::new(),
                navigation: None,
                stage: "working".into(),
                replans: None,
            },
            custody,
            &self.budget,
        )?;
        core.physical()
            .replace_action_route(&self.source, &self.action, route)?;
        core.physical().behavior_changed(&self.source, true)?;
        self.stage_preparation(core)
    }

    fn prepare_motion_route(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<ContactStep, ExecutionError> {
        let (source, action) = self.source(&core.state.physical.entities)?;
        let now = core.state.physical.header.sim_time;
        let installed = &core.state.installed;
        let target = core
            .state
            .physical
            .entities
            .get(&self.target)
            .ok_or(ExecutionError::Invariant)?;
        let (observed, surface) = support_parts(target).ok_or(ExecutionError::InvalidPosition)?;
        let same_point = action.strike_motion.as_ref().is_some_and(|motion| {
            motion.observed.point.point() == observed && motion.observed.point.surface_id == surface
        });
        // An identical request, including a recorded rejection, keeps its
        // result while this observation, body and map remain current.
        let same_route = match &action.navigation {
            Some(navigation) if same_point => crate::time::action_route_request_current(
                source,
                &navigation.request,
                self.binding.geometry_revision,
                &self.budget,
            )?,
            _ => false,
        };
        let new_motion = action
            .strike_motion
            .as_ref()
            .map(|motion| motion.reobserve(target, now, &self.budget))
            .transpose()?
            .flatten();
        if !same_route {
            let definition = action
                .definition_id
                .as_deref()
                .and_then(|id| profile(installed, source, id))
                .and_then(|definition| definition.preparation_motion.as_ref())
                .ok_or(ExecutionError::Invariant)?;
            self.binding.serial = core.journal.next_provider_serial()?;
            self.route = Some(StrikeRoute::prepare(
                installed,
                definition,
                source,
                target,
                &action.path,
                self.binding,
                &self.budget,
            )?);
        }
        if let Some((motion, storage)) = new_motion {
            let motion = FundedStrikeMotion::from_storage(motion, storage, &self.budget)?;
            core.physical()
                .replace_strike_motion(&self.source, &self.action, Some(motion))?;
        }
        if same_route {
            return Ok(ContactStep::AdvanceComplete);
        }
        self.phase = Phase::MotionRoute;
        Ok(ContactStep::Geometry)
    }

    fn finish_motion_route(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: GeometryAnswers,
    ) -> Result<ContactStep, ExecutionError> {
        let result = self.route.as_mut().ok_or(ExecutionError::Invariant)?.step(
            answer,
            || core.journal.next_provider_serial(),
            &self.budget,
        )?;
        if matches!(&result, StrikeRouteStep::Geometry) {
            return Ok(ContactStep::Geometry);
        }
        self.route = None;
        let (source, action) = self.source(&core.state.physical.entities)?;
        let awaiting = action.awaiting_moving_contact();
        let has_route = !action.path.is_empty() || action.navigation.is_some();
        let (path, navigation, mut custody) = match result {
            StrikeRouteStep::Route(GuardedRoutePlan(RoutePlan::Reached { path, .. }, custody)) => {
                (path, None, custody)
            }
            StrikeRouteStep::Route(GuardedRoutePlan(
                RoutePlan::Pending { mut request, .. },
                mut custody,
            )) => {
                custody.resize(
                    custody
                        .bytes()
                        .checked_add("entity".len())
                        .ok_or(ExecutionError::Capacity)?,
                )?;
                request.wait = Some("entity".into());
                (
                    Vec::new(),
                    Some(NavigationPending {
                        request,
                        failure: None,
                    }),
                    custody,
                )
            }
            StrikeRouteStep::KeepRoute => {
                if !awaiting {
                    return Ok(ContactStep::AdvanceComplete);
                }
                let bytes = action.path.heap_bytes().ok_or(ExecutionError::Capacity)?;
                let custody = self.budget.reserve(bytes)?;
                (action.path.clone(), None, custody)
            }
            StrikeRouteStep::AtStance => (Vec::new(), None, self.budget.reserve(0)?),
            StrikeRouteStep::Unavailable | StrikeRouteStep::Route(_) => {
                if awaiting {
                    return Ok(ContactStep::Invalidated);
                }
                (Vec::new(), None, self.budget.reserve(0)?)
            }
            StrikeRouteStep::Geometry => return Err(ExecutionError::Invariant),
        };
        let starting = awaiting && navigation.is_none();
        let motion = if starting {
            let installed = &core.state.installed;
            let definition = action
                .definition_id
                .as_deref()
                .and_then(|id| profile(installed, source, id))
                .ok_or(ExecutionError::Invariant)?;
            let target = core
                .state
                .physical
                .entities
                .get(&self.target)
                .ok_or(ExecutionError::Invariant)?;
            let (motion, storage) = StrikeMotion::prepare(
                installed,
                definition,
                target,
                core.state.physical.header.sim_time,
                &self.budget,
            )?;
            Some(FundedStrikeMotion::from_storage(
                motion,
                storage,
                &self.budget,
            )?)
        } else {
            None
        };
        if starting || has_route || navigation.is_some() || !path.is_empty() {
            let stage = if awaiting && !starting {
                "approaching"
            } else {
                "working"
            };
            custody.resize(
                custody
                    .bytes()
                    .checked_add(stage.len())
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let route = FundedActionRoute::from_storage(
                ActionRouteWrite {
                    path,
                    navigation,
                    stage: stage.into(),
                    replans: None,
                },
                custody,
                &self.budget,
            )?;
            core.physical()
                .replace_action_route(&self.source, &self.action, route)?;
        }
        if let Some(motion) = motion {
            core.physical()
                .replace_strike_motion(&self.source, &self.action, Some(motion))?;
            core.physical().behavior_changed(&self.source, true)?;
            return self.stage_preparation(core);
        }
        Ok(ContactStep::AdvanceComplete)
    }

    fn stage_preparation(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<ContactStep, ExecutionError> {
        let Some((event, custody)) = super::stage_preparation(core, &self.source, &self.budget)?
        else {
            return Ok(ContactStep::AdvanceComplete);
        };
        self.storage.merge(custody)?;
        self.phase = Phase::Done;
        self.wait_for(event)
    }

    pub(crate) fn step(
        &mut self,
        core: &mut CoreMutation<'_>,
        mut answer: Option<ContactAnswer>,
    ) -> Result<ContactStep, ExecutionError> {
        if let Some(event) = self.event.take() {
            if !matches!(answer.take(), Some(ContactAnswer::Occurrence(done)) if done.event_id() == event)
            {
                return Err(ExecutionError::UnfinishedOccurrence);
            }
        }
        loop {
            match self.phase {
                Phase::Start => {
                    let (source, action) = self.source(&core.state.physical.entities)?;
                    if action.awaiting_moving_contact()
                        && let Some(navigation) = &action.navigation
                        && crate::time::action_route_request_current(
                            source,
                            &navigation.request,
                            self.binding.geometry_revision,
                            &self.budget,
                        )?
                    {
                        return Ok(if navigation.failure.is_some() {
                            ContactStep::Invalidated
                        } else {
                            ContactStep::AdvanceComplete
                        });
                    }
                    if action.strike_phase == Some(StrikePhase::Recovery) {
                        let epsilon = core.state.installed.time_epsilon;
                        return Ok(
                            if core.physical().advance_timed_work(
                                &self.source,
                                &self.action,
                                self.seconds,
                                epsilon,
                            )? {
                                ContactStep::ActionComplete
                            } else {
                                ContactStep::AdvanceComplete
                            },
                        );
                    }
                    let Some(target) = core.state.physical.entities.get(&self.target) else {
                        return Ok(ContactStep::Invalidated);
                    };
                    let installed = &core.state.installed;
                    let valid = action
                        .target_life
                        .is_some_and(|life| may_target(installed, source, target, life))
                        && action
                            .definition_id
                            .as_deref()
                            .and_then(|id| profile(installed, source, id))
                            .is_some_and(|definition| {
                                Some(definition.version) == action.definition_version
                            })
                        && !installed
                            .capabilities
                            .capability_blocked(Some(source), "actions")?
                        && (!(action.strike_motion.is_some() || action.awaiting_moving_contact())
                            || (support_parts(source).is_some()
                                && support_parts(target).is_some()
                                && !installed
                                    .capabilities
                                    .capability_blocked(Some(source), "locomotion")?));
                    if !valid {
                        return Ok(ContactStep::Invalidated);
                    }
                    self.binding.serial = core.journal.next_provider_serial()?;
                    self.sight = Some(
                        SightBatch::prepare(
                            &core.state.physical,
                            installed,
                            &self.source,
                            &[&self.target],
                            self.binding,
                            &self.budget,
                        )
                        .map_err(crate::native_controller::sensor_error)?,
                    );
                    self.phase = Phase::Sight;
                    return Ok(ContactStep::Geometry);
                }
                Phase::Sight => {
                    let Some(ContactAnswer::Geometry(visible)) = answer.take() else {
                        return Err(ExecutionError::UnfinishedOccurrence);
                    };
                    let visible = self
                        .sight
                        .take()
                        .ok_or(ExecutionError::Invariant)?
                        .finish(visible)
                        .map_err(crate::native_controller::sensor_error)?;
                    if visible.seen(&self.target) != Some(true) {
                        return Ok(ContactStep::SightLost);
                    }
                    if self
                        .source(&core.state.physical.entities)?
                        .1
                        .awaiting_moving_contact()
                    {
                        return self.check_start_range(core);
                    }
                    let epsilon = core.state.installed.time_epsilon;
                    if !core.physical().advance_timed_work(
                        &self.source,
                        &self.action,
                        self.seconds,
                        epsilon,
                    )? {
                        if self
                            .source(&core.state.physical.entities)?
                            .1
                            .strike_motion
                            .is_some()
                        {
                            return self.prepare_motion_route(core);
                        }
                        return Ok(ContactStep::AdvanceComplete);
                    }
                    let (source, action) = self.source(&core.state.physical.entities)?;
                    let definition = profile(
                        &core.state.installed,
                        source,
                        action
                            .definition_id
                            .as_deref()
                            .ok_or(ExecutionError::Invariant)?,
                    )
                    .ok_or(ExecutionError::Invariant)?;
                    let target = core
                        .state
                        .physical
                        .entities
                        .get(&self.target)
                        .ok_or(ExecutionError::Invariant)?;
                    if let Some(ray) = reach(
                        &core.state.installed,
                        definition,
                        source,
                        target,
                        definition.range,
                        &self.budget,
                    )? {
                        self.reserve(size_of::<GeometryQueries>() + size_of::<SightRay>())?;
                        self.binding.serial = core.journal.next_provider_serial()?;
                        let mut queries = GeometryQueries::new(self.binding);
                        queries.sight = vec![ray];
                        self.impact = Some(queries);
                        self.phase = Phase::Reach;
                        return Ok(ContactStep::Geometry);
                    }
                    if !self.automatic(core)? {
                        return Ok(ContactStep::Invalidated);
                    }
                    self.hit_reason = Some("out-of-range");
                    self.phase = Phase::Result;
                }
                Phase::StartRange => {
                    let Some(ContactAnswer::Geometry(mut range)) = answer.take() else {
                        return Err(ExecutionError::UnfinishedOccurrence);
                    };
                    self.impact
                        .take()
                        .ok_or(ExecutionError::Invariant)?
                        .validate_answers(&range)
                        .map_err(|_| ExecutionError::Invariant)?;
                    let clear = range.sight.pop() == Some(true);
                    if self
                        .source(&core.state.physical.entities)?
                        .1
                        .has_contact_approach()
                    {
                        return if clear {
                            self.start_chosen_windup(core)
                        } else {
                            self.continue_contact_approach(core)
                        };
                    }
                    if !clear {
                        return Ok(ContactStep::Invalidated);
                    }
                    return self.prepare_motion_route(core);
                }
                Phase::MotionRoute => {
                    let Some(ContactAnswer::Geometry(route)) = answer.take() else {
                        return Err(ExecutionError::UnfinishedOccurrence);
                    };
                    return self.finish_motion_route(core, route);
                }
                Phase::ApproachEndpoint => {
                    let Some(ContactAnswer::Geometry(mut clearance)) = answer.take() else {
                        return Err(ExecutionError::UnfinishedOccurrence);
                    };
                    self.impact
                        .take()
                        .ok_or(ExecutionError::Invariant)?
                        .validate_answers(&clearance)
                        .map_err(|_| ExecutionError::Invariant)?;
                    return if clearance.sight.pop() == Some(true) {
                        Ok(ContactStep::AdvanceComplete)
                    } else {
                        self.replan_contact_approach(core)
                    };
                }
                Phase::ApproachRoute => {
                    let Some(ContactAnswer::Geometry(route)) = answer.take() else {
                        return Err(ExecutionError::UnfinishedOccurrence);
                    };
                    return self.finish_contact_approach_route(core, route);
                }
                Phase::Reach => {
                    let Some(ContactAnswer::Geometry(mut reach)) = answer.take() else {
                        return Err(ExecutionError::UnfinishedOccurrence);
                    };
                    self.impact
                        .take()
                        .ok_or(ExecutionError::Invariant)?
                        .validate_answers(&reach)
                        .map_err(|_| ExecutionError::Invariant)?;
                    self.hit_reason = Some("out-of-range");
                    self.phase = Phase::Result;
                    if reach.sight.pop() == Some(true) {
                        self.begin_impact(core)?;
                    } else if !self.automatic(core)? {
                        return Ok(ContactStep::Invalidated);
                    }
                }
                Phase::ReviewRefused => return Ok(ContactStep::Invalidated),
                Phase::Body => {
                    let answer = match answer.take() {
                        None => None,
                        Some(ContactAnswer::Occurrence(done)) => Some(BodyAnswer::Occurrence(done)),
                        Some(ContactAnswer::Personal(done)) => Some(BodyAnswer::Personal(done)),
                        Some(ContactAnswer::Geometry(_)) => {
                            return Err(ExecutionError::UnfinishedOccurrence);
                        }
                    };
                    match self
                        .body
                        .as_mut()
                        .ok_or(ExecutionError::Invariant)?
                        .step(core, answer)?
                    {
                        BodyStep::Occurrence(event) => return Ok(ContactStep::Occurrence(event)),
                        BodyStep::Personal(_) => return Ok(ContactStep::Personal),
                        BodyStep::Complete => {
                            self.body = None;
                            if self.health_after(core)? < self.health_before {
                                self.status_ids =
                                    core.interrupt_status_ids(&self.target, "injury")?;
                                self.phase = Phase::Interrupt;
                            } else {
                                self.phase = Phase::BodyEvent;
                            }
                        }
                    }
                }
                Phase::Interrupt => {
                    if let Some(pending) = self.pending_status.take() {
                        let Some(ContactAnswer::Personal(done)) = answer.take() else {
                            return Err(ExecutionError::UnfinishedOccurrence);
                        };
                        if let Some(step) = self.status_result(pending.resume(core, &done)?)? {
                            return Ok(step);
                        }
                        continue;
                    }
                    if let Some(id) = self.status_ids.get(self.status_index) {
                        self.status_index += 1;
                        let status = core.deactivate_status(&self.target, id, "injury")?;
                        if let Some(step) = self.status_result(status)? {
                            return Ok(step);
                        }
                        continue;
                    }
                    if let Some(pending) = self.pending_contact.take() {
                        let Some(ContactAnswer::Personal(done)) = answer.take() else {
                            return Err(ExecutionError::UnfinishedOccurrence);
                        };
                        core.complete_finish_action(pending, &done)?;
                        self.clear_interrupted_contact(core)?;
                    } else if self.interrupt_contact(core)? {
                        return Ok(ContactStep::Personal);
                    }
                    self.phase = Phase::BodyEvent;
                }
                Phase::BodyEvent => {
                    self.phase = Phase::Result;
                    let event = self.body_event(core)?;
                    return self.wait_for(event);
                }
                Phase::Result => {
                    self.phase = Phase::Done;
                    let event = self.result_event(core)?;
                    return self.wait_for(event);
                }
                Phase::Done => return Ok(ContactStep::AdvanceComplete),
            }
        }
    }

    fn wait_for(&mut self, event: StagedOccurrence) -> Result<ContactStep, ExecutionError> {
        self.reserve(event.id.len())?;
        self.event = Some(event.id.clone());
        Ok(ContactStep::Occurrence(event))
    }

    fn status_result(&mut self, status: StatusEnd) -> Result<Option<ContactStep>, ExecutionError> {
        match status {
            StatusEnd::Unchanged | StatusEnd::Complete => Ok(None),
            StatusEnd::Occurrence(event) => self.wait_for(event).map(Some),
            StatusEnd::Personal(pending) => {
                self.pending_status = Some(pending);
                Ok(Some(ContactStep::Personal))
            }
        }
    }

    fn automatic(&self, core: &CoreMutation<'_>) -> Result<bool, ExecutionError> {
        Ok(self
            .source(&core.state.physical.entities)?
            .0
            .actor
            .as_ref()
            .is_some_and(|actor| actor.controller == "native"))
    }

    fn health_after(&self, core: &CoreMutation<'_>) -> Result<f64, ExecutionError> {
        Ok(core
            .state
            .physical
            .entities
            .get(&self.target)
            .and_then(|target| target.actor.as_ref())
            .ok_or(ExecutionError::Invariant)?
            .health)
    }

    fn begin_impact(&mut self, core: &mut CoreMutation<'_>) -> Result<(), ExecutionError> {
        let (source, action) = self.source(&core.state.physical.entities)?;
        let installed = &core.state.installed;
        let definition = profile(
            installed,
            source,
            action
                .definition_id
                .as_deref()
                .ok_or(ExecutionError::Invariant)?,
        )
        .ok_or(ExecutionError::Invariant)?;
        let target = core
            .state
            .physical
            .entities
            .get(&self.target)
            .ok_or(ExecutionError::Invariant)?;
        let actor = target.actor.as_ref().ok_or(ExecutionError::Invariant)?;
        let accuracy = definition.accuracy.unwrap_or(1.0);
        let injury = super::ContactInjury::read(installed, source, target)?;
        if action.requires_lethal_review == Some(true)
            && !matches!(
                super::review::check(
                    installed,
                    source,
                    target,
                    definition,
                    injury,
                    action.lethal_permission.as_deref(),
                    &self.budget,
                )?,
                super::review::Review::Allowed
            )
        {
            self.phase = Phase::ReviewRefused;
            return Ok(());
        }
        let raw_injury = injury.maximum(definition.damage);
        let health_before = actor.health;
        // Match the selected Source guaranteed-contact path. Ineligible sight
        // or reach never spends a draw. See AC09.6 for the shared RNG follow-up.
        if accuracy != 1.0 && self.automatic(core)? && core.physical().draw() >= accuracy {
            self.hit_reason = Some("accuracy");
            return Ok(());
        }
        self.hit_reason = Some("hit");
        self.health_before = health_before;
        self.raw_injury = raw_injury;
        self.body = Some(HealthChangeCursor::new(
            core,
            &self.target,
            -raw_injury,
            &self.action,
            None,
            None,
            &self.budget,
        )?);
        self.phase = Phase::Body;
        Ok(())
    }

    fn interrupt_contact(&mut self, core: &mut CoreMutation<'_>) -> Result<bool, ExecutionError> {
        let Some(target) = core.state.physical.entities.get(&self.target) else {
            return Err(ExecutionError::Invariant);
        };
        let Some(action) = target
            .actor
            .as_ref()
            .and_then(|actor| actor.action.as_ref())
            .filter(|action| {
                action.stage == "working" && action.strike_phase == Some(StrikePhase::Windup)
            })
        else {
            return Ok(false);
        };
        let seconds = action
            .definition_id
            .as_deref()
            .and_then(|id| profile(&core.state.installed, target, id))
            .ok_or(ExecutionError::Invariant)?
            .recovery_seconds
            .unwrap_or(0.0);
        let deadline = core.state.physical.header.sim_time + seconds;
        let message = &core
            .state
            .installed
            .ordinary_actions
            .value()
            .natural_contact
            .interrupted;
        self.reserve(action.id.len() + message.len())?;
        let id = action.id.clone();
        let result = crate::commands::Outcome {
            ok: false,
            code: "interrupted".into(),
            message: message.clone().into(),
            spent: None,
            outputs: None,
            entity_id: None,
            recipe_id: None,
            item_id: None,
            goal_id: None,
            plan_id: None,
            action_id: None,
        };
        core.physical()
            .retain_combat_recovery(&self.target, deadline)?;
        if let ActionFinish::Personal(pending) =
            core.begin_finish_action(&self.target, &id, result)?
        {
            self.pending_contact = Some(pending);
            return Ok(true);
        }
        self.clear_interrupted_contact(core)?;
        Ok(false)
    }

    fn clear_interrupted_contact(&self, core: &mut CoreMutation<'_>) -> Result<(), ExecutionError> {
        core.physical().replace_action(
            &self.target,
            None,
            ActionWrite {
                generation: PlanGenerationWrite::Preserve,
                behavior: None,
            },
        )?;
        Ok(())
    }

    fn body_event(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<StagedOccurrence, ExecutionError> {
        let changed = &core
            .state
            .installed
            .ordinary_actions
            .value()
            .natural_contact
            .body_changed;
        self.reserve(512 + 3 * self.target.len() + changed.len() + self.action.len())?;
        let data = IndexMap::from([
            (
                "effectId".into(),
                EventScalar::Text(self.action.clone().into()),
            ),
            (
                "healthDelta".into(),
                EventScalar::Number(self.health_after(core)? - self.health_before),
            ),
            ("wetnessDelta".into(), EventScalar::Number(0.0)),
            ("burningDelta".into(), EventScalar::Number(0.0)),
        ]);
        core.stage_event(EventEmissionIntent {
            event_type: "body-effect".into(),
            text: EmissionText::Narration(Narration {
                parts: vec![
                    NarrationPart::Participant {
                        entity_id: self.target.clone(),
                        role: PersonRole::Possessive,
                        article: None,
                    },
                    NarrationPart::Literal(changed.clone().into()),
                ],
            }),
            audience: AudienceSelection::Physical,
            source_id: Some(self.target.clone()),
            target_id: Some(self.target.clone()),
            data: Some(data),
            scope: EventScope::External,
            origin: None,
            exposure: None,
        })
    }

    fn result_event(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<StagedOccurrence, ExecutionError> {
        let (source, action) = self.source(&core.state.physical.entities)?;
        let installed = std::sync::Arc::clone(&core.state.installed);
        let definition = profile(
            &installed,
            source,
            action
                .definition_id
                .as_deref()
                .ok_or(ExecutionError::Invariant)?,
        )
        .ok_or(ExecutionError::Invariant)?;
        let recovery = definition.recovery_seconds.unwrap_or(0.0);
        let reason = self.hit_reason.ok_or(ExecutionError::Invariant)?;
        let hit = reason == "hit";
        let rules = &installed.ordinary_actions.value().natural_contact;
        let suffix = if hit {
            &rules.connected
        } else if reason == "out-of-range" {
            &rules.out_of_range
        } else {
            ""
        };
        self.reserve(
            2048 + 3 * (self.source.len() + self.target.len())
                + self.action.len()
                + definition.id.len()
                + definition.past_tense.storage_bytes()
                + rules.missed.len()
                + suffix.len(),
        )?;
        let mut data = IndexMap::from([
            (
                "definitionId".into(),
                EventScalar::Text(definition.id.clone().into()),
            ),
            (
                "actionId".into(),
                EventScalar::Text(self.action.clone().into()),
            ),
            ("hit".into(), EventScalar::Boolean(hit)),
            (
                "damage".into(),
                EventScalar::Number(if hit {
                    self.health_before - self.health_after(core)?
                } else {
                    0.0
                }),
            ),
            ("reason".into(), EventScalar::Text(reason.into())),
            ("targetReference".into(), EventScalar::Boolean(true)),
            ("semanticTrigger".into(), EventScalar::Boolean(true)),
        ]);
        if hit {
            if let Some(policy) = installed
                .body_policy
                .as_ref()
                .and_then(|body| body.value().combat.as_ref())
            {
                data.insert(
                    "importance".into(),
                    EventScalar::Number(policy.impact_attention.importance),
                );
                data.insert(
                    "urgency".into(),
                    EventScalar::Number(policy.impact_attention.urgency),
                );
            }
            data.insert("contactInjury".into(), EventScalar::Boolean(true));
            data.insert("preventedInjury".into(), EventScalar::Number(0.0));
            data.insert("rawInjury".into(), EventScalar::Number(self.raw_injury));
            data.insert(
                "healthBefore".into(),
                EventScalar::Number(self.health_before),
            );
            data.insert(
                "healthAfter".into(),
                EventScalar::Number(self.health_after(core)?),
            );
        }
        core.physical().start_contact_recovery(
            &self.source,
            &self.action,
            if hit {
                StrikeOutcome::Hit
            } else {
                StrikeOutcome::Miss
            },
            recovery,
        )?;
        let mut prefix = crate::text::JsText::from(" ");
        let verb = if hit {
            definition.past_tense.clone()
        } else {
            rules.missed.clone().into()
        };
        crate::text::TextRef::from(&verb).append_to(&mut prefix);
        crate::text::TextRef::from(" ").append_to(&mut prefix);
        core.stage_event(EventEmissionIntent {
            event_type: "struck".into(),
            text: EmissionText::Narration(Narration {
                parts: vec![
                    NarrationPart::Participant {
                        entity_id: self.source.clone(),
                        role: PersonRole::Subject,
                        article: None,
                    },
                    NarrationPart::Literal(prefix),
                    NarrationPart::Participant {
                        entity_id: self.target.clone(),
                        role: PersonRole::Object,
                        article: None,
                    },
                    NarrationPart::Literal(if suffix.is_empty() {
                        ".".into()
                    } else {
                        format!(". {suffix}").into()
                    }),
                ],
            }),
            audience: AudienceSelection::Physical,
            source_id: Some(self.source.clone()),
            target_id: Some(self.target.clone()),
            data: Some(data),
            scope: EventScope::External,
            origin: None,
            exposure: None,
        })
    }
}
