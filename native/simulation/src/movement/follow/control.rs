//! One authoritative follow decision. Initial admission and active follow
//! share sight, reach, supported stance and route checks. Only actual sight
//! can replace the saved position used by the optional last-seen policy.
use super::{FollowParameters, FollowStance, FollowState};
use crate::execution::{ActionRouteWrite, CoreMutation, ExecutionError};
use crate::geometry::{
    GeometryAnswers, GeometryBinding, GeometryQueries, RoutePlan, RouteQuery, StandingQuery,
    SupportQuery, interaction_reach,
};
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation};
use crate::reception::SightBatch;
use crate::state::{Action, Entity, NavigationPending, Point, SurfacePoint};
use crate::worlds::base_decision_offers::DecisionOfferRules;
use std::mem::size_of;

#[derive(Clone, Copy)]
pub(crate) enum FollowStop {
    Restricted,
    Unsupported,
    Lost,
    Dead,
    Changed,
    LastSeenReached,
    LastSeenNoRoute,
    Budget,
    NoRoute,
    Reached,
    Deadline,
}

impl FollowStop {
    pub(crate) fn message(self, rules: &DecisionOfferRules) -> &str {
        match self {
            Self::Restricted => &rules.follow_outcomes.restricted,
            Self::Unsupported => &rules.availability.follow_unsupported,
            Self::Lost => &rules.availability.follow_unperceived,
            Self::Dead => &rules.availability.follow_dead,
            Self::Changed => &rules.availability.follow_changed,
            Self::LastSeenReached => &rules.follow_outcomes.last_seen_reached,
            Self::LastSeenNoRoute => &rules.follow_outcomes.last_seen_no_route,
            Self::Budget => &rules.availability.follow_budget,
            Self::NoRoute => &rules.availability.follow_no_route,
            Self::Reached => &rules.follow_outcomes.arrived.message,
            Self::Deadline => &rules.follow_outcomes.limit.message,
        }
    }
}

#[derive(Clone, Copy)]
pub(crate) enum FollowMode<'a> {
    Start(FollowParameters, f64, Option<u64>),
    Active(&'a Action),
}

enum Phase {
    Sight(SightBatch),
    Support,
    Standing,
    Reach,
    Route,
    Done,
}

pub(crate) struct FollowUpdate {
    pub parent_id: Option<String>,
    pub target_life: u64,
    pub state: FollowState,
    pub route: Option<ActionRouteWrite>,
    pub sighting: bool,
    pub storage: ByteReservation,
}

pub(crate) enum FollowDecision {
    Update(FollowUpdate),
    Stop(FollowStop),
    NavigationFailed(String, ByteReservation),
}

pub(crate) enum FollowStep<'a> {
    Geometry(&'a GeometryQueries),
    Complete(FollowDecision),
}

pub(crate) struct FollowCursor {
    source: String,
    target: String,
    parent_id: Option<String>,
    first: Option<(FollowParameters, f64)>,
    target_life: Option<u64>,
    prior_working: bool,
    prior_route_empty: bool,
    phase: Phase,
    binding: GeometryBinding,
    query: Option<(GeometryQueries, ByteReservation)>,
    state: Option<FollowState>,
    slot: Option<SurfacePoint>,
    reacquired: bool,
    saw: bool,
    budget: ByteBudget,
    storage: Option<ByteReservation>,
}

impl FollowCursor {
    pub(crate) fn prepare(
        core: &CoreMutation<'_>,
        source: &str,
        target: &str,
        mode: FollowMode<'_>,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let (parent, prior, target_life, prior_working, prior_route_empty, first) = match mode {
            FollowMode::Start(parameters, distance, target_life) => {
                (None, None, target_life, false, false, Some((parameters, distance)))
            }
            FollowMode::Active(action) => (
                Some(action.id.as_str()),
                action.follow.as_ref(),
                Some(action.target_life.ok_or(ExecutionError::Invariant)?),
                action.stage == "working",
                action.path.is_empty() && action.navigation.is_none(),
                None,
            ),
        };
        let storage = budget.reserve(
            heap_sum([
                size_of::<Self>(),
                source.len(),
                target.len(),
                parent.map_or(0, str::len),
                prior
                    .map_or(Some(0), HeapBytes::heap_bytes)
                    .ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let sight = SightBatch::prepare(
            &core.state.physical,
            &core.state.installed,
            source,
            &[target],
            binding,
            budget,
        )
        .map_err(ExecutionError::Sensor)?;
        Ok(Self {
            source: source.to_owned(),
            target: target.to_owned(),
            parent_id: parent.map(str::to_owned),
            first,
            target_life,
            prior_working,
            prior_route_empty,
            phase: Phase::Sight(sight),
            binding,
            query: None,
            state: prior.cloned(),
            slot: None,
            reacquired: false,
            saw: false,
            budget: budget.clone(),
            storage: Some(storage),
        })
    }

    pub(crate) fn queries(&self) -> Option<&GeometryQueries> {
        match &self.phase {
            Phase::Sight(sight) => Some(sight.queries()),
            _ => self.query.as_ref().map(|(query, _)| query),
        }
    }

    fn reserve(&mut self, bytes: usize) -> Result<(), ExecutionError> {
        let storage = self.storage.as_mut().ok_or(ExecutionError::Invariant)?;
        storage.resize(
            storage
                .bytes()
                .checked_add(bytes)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(())
    }

    fn question(
        &mut self,
        core: &mut CoreMutation<'_>,
        phase: Phase,
        payload: usize,
    ) -> Result<&mut GeometryQueries, ExecutionError> {
        self.binding.serial = core.journal.next_provider_serial()?;
        let storage = self.budget.reserve(
            size_of::<GeometryQueries>()
                .checked_add(payload)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        self.phase = phase;
        self.query = Some((GeometryQueries::new(self.binding), storage));
        self.query
            .as_mut()
            .map(|(query, _)| query)
            .ok_or(ExecutionError::Invariant)
    }

    fn state(&self) -> Result<&FollowState, ExecutionError> {
        self.state.as_ref().ok_or(ExecutionError::Invariant)
    }

    fn done(&mut self, route: Option<ActionRouteWrite>) -> Result<FollowDecision, ExecutionError> {
        self.phase = Phase::Done;
        Ok(FollowDecision::Update(FollowUpdate {
            parent_id: self.parent_id.take(),
            target_life: self.target_life.ok_or(ExecutionError::Invariant)?,
            state: self.state.take().ok_or(ExecutionError::Invariant)?,
            route,
            sighting: self.saw,
            storage: self.storage.take().ok_or(ExecutionError::Invariant)?,
        }))
    }

    fn stop(&mut self, reason: FollowStop) -> Result<Option<FollowDecision>, ExecutionError> {
        self.phase = Phase::Done;
        self.query = None;
        Ok(Some(FollowDecision::Stop(reason)))
    }

    fn resources<'a>(
        &self,
        core: &'a CoreMutation<'_>,
    ) -> Result<(&'a Entity, Option<&'a Action>), ExecutionError> {
        let source = core
            .state
            .physical
            .entities
            .get(&self.source)
            .ok_or(ExecutionError::MissingActor)?;
        let action = self
            .parent_id
            .as_ref()
            .map(|parent| {
                source
                    .actor
                    .as_ref()
                    .and_then(|actor| actor.action.as_ref())
                    .filter(|value| &value.id == parent)
                    .ok_or(ExecutionError::Invariant)
            })
            .transpose()?;
        Ok((source, action))
    }
}

impl FollowCursor {
    pub(crate) fn step(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<GeometryAnswers>,
    ) -> Result<FollowStep<'_>, ExecutionError> {
        let mut decision = None;
        if let Some(mut answer) = answer {
            let phase = std::mem::replace(&mut self.phase, Phase::Done);
            if let Phase::Sight(sight) = phase {
                let sight = sight.finish(answer).map_err(ExecutionError::Sensor)?;
                decision = self.after_sight(core, sight.seen(&self.target) == Some(true))?;
            } else {
                let (query, _custody) = self.query.take().ok_or(ExecutionError::Invariant)?;
                query
                    .validate_answers(&answer)
                    .map_err(|_| ExecutionError::Invariant)?;
                match phase {
                    Phase::Support => {
                        let slot = answer.support.pop().ok_or(ExecutionError::Invariant)?;
                        decision = self.slot_support(core, slot)?;
                    }
                    Phase::Standing => {
                        if !answer.standing.pop().ok_or(ExecutionError::Invariant)? {
                            self.slot = None;
                        }
                        decision = self.check_reach(core)?;
                    }
                    Phase::Reach => {
                        decision = if answer.sight.pop().ok_or(ExecutionError::Invariant)? {
                            self.hold()?
                        } else {
                            self.check_route(core)?
                        };
                    }
                    Phase::Route => {
                        let route = answer.routes.pop().ok_or(ExecutionError::Invariant)?;
                        decision = self.route_result(route)?;
                    }
                    _ => return Err(ExecutionError::Invariant),
                }
            }
        }
        if let Some(decision) = decision {
            return Ok(FollowStep::Complete(decision));
        }
        if matches!(self.phase, Phase::Sight(_)) {
            let (source, _) = self.resources(core)?;
            if self
                .state
                .as_ref()
                .and_then(|state| state.until)
                .is_some_and(|until| core.state.physical.header.sim_time >= until)
            {
                return Ok(FollowStep::Complete(FollowDecision::Stop(
                    FollowStop::Deadline,
                )));
            }
            let installed = &core.state.installed;
            if installed
                .capabilities
                .capability_blocked(Some(source), "actions")?
                || installed
                    .capabilities
                    .capability_blocked(Some(source), "locomotion")?
            {
                return Ok(FollowStep::Complete(FollowDecision::Stop(
                    FollowStop::Restricted,
                )));
            }
            if source.world_support().is_none() {
                return Ok(FollowStep::Complete(FollowDecision::Stop(
                    FollowStop::Unsupported,
                )));
            }
        }
        Ok(FollowStep::Geometry(
            self.queries().ok_or(ExecutionError::Invariant)?,
        ))
    }

    fn after_sight(
        &mut self,
        core: &mut CoreMutation<'_>,
        seen: bool,
    ) -> Result<Option<FollowDecision>, ExecutionError> {
        let continuity = self.state.as_ref().is_none_or(|state| {
            if state.episode.is_some() || state.pursuing == Some(true) {
                crate::worlds::base_knowledge::subject_reference_current(
                    &core.state.reception,
                    &self.source,
                    &self.target,
                    state.episode.as_ref().map(|_| &state.episode),
                )
            } else {
                true
            }
        });
        if !seen || !continuity {
            return self.follow_last_seen(core);
        }
        let (source, _) = self.resources(core)?;
        let target = core
            .state
            .physical
            .entities
            .get(&self.target)
            .ok_or(ExecutionError::MissingEntity)?;
        let Some(target_life) = target
            .physical_life()
            .filter(|_| target.actor.as_ref().is_some_and(|actor| actor.alive))
        else {
            return self.stop(FollowStop::Dead);
        };
        // A restarted Follow knows its original physical life. Compare it
        // only after sight, as for a continuous Follow.
        if self.target_life.is_some_and(|expected| target_life != expected) {
            return self.stop(FollowStop::Changed);
        }
        self.target_life = Some(target_life);
        if let Some((parameters, distance)) = self.first.take() {
            self.state = Some(
                parameters.start(
                    distance,
                    source
                        .world_position()
                        .ok_or(ExecutionError::InvalidPosition)?,
                    target
                        .world_position()
                        .ok_or(ExecutionError::InvalidPosition)?,
                    target.spatial.heading,
                ),
            );
        }
        if let Some((position, surface)) = target.world_support() {
            let episode = core
                .state
                .reception
                .perception_episodes
                .as_ref()
                .and_then(|owners| owners.get(&self.source))
                .and_then(|episodes| episodes.get(&self.target));
            let bytes = surface
                .len()
                .checked_add(episode.map_or(0, String::len))
                .ok_or(ExecutionError::Capacity)?;
            self.reserve(bytes)?;
            let at = core.state.physical.header.sim_time;
            let policy = &core
                .state
                .installed
                .occurrence_rules
                .value()
                .response
                .offers
                .follow;
            let state = self.state.as_mut().ok_or(ExecutionError::Invariant)?;
            state.observe(
                surface_point(position, surface),
                at,
                policy.heading_evidence,
            );
            if state.episode.is_none() {
                state.episode = episode.cloned();
            }
            self.saw = true;
        }
        let state = self.state.as_mut().ok_or(ExecutionError::Invariant)?;
        self.reacquired = state.pursuing.take() == Some(true);
        if let (Some(stance), Some(heading), Some((base, surface))) =
            (state.relation, state.travel_heading, target.world_support())
        {
            let (x, z) = match stance {
                FollowStance::Behind => (-heading.sin(), -heading.cos()),
                FollowStance::Beside => {
                    let side = f64::from(state.side.ok_or(ExecutionError::Invariant)?);
                    (-heading.cos() * side, heading.sin() * side)
                }
            };
            let point = Point {
                x: base.x + x * state.distance,
                y: base.y,
                z: base.z + z * state.distance,
            };
            let payload = size_of::<SupportQuery>()
                .checked_add(surface.len())
                .ok_or(ExecutionError::Capacity)?;
            let _staging = self.budget.reserve(surface.len())?;
            let surface = surface.to_owned();
            self.question(core, Phase::Support, payload)?
                .support
                .push(SupportQuery {
                    point,
                    surface_id: Some(surface),
                    relative: None,
                });
            return Ok(None);
        }
        self.check_reach(core)
    }

    fn slot_support(
        &mut self,
        core: &mut CoreMutation<'_>,
        slot: Option<SurfacePoint>,
    ) -> Result<Option<FollowDecision>, ExecutionError> {
        let Some(slot) = slot else {
            return self.check_reach(core);
        };
        let (source, _) = self.resources(core)?;
        let body = crate::status::effective_body_profile(source, &self.budget)?;
        let payload = heap_sum([
            size_of::<StandingQuery>(),
            body.id.len(),
            slot.surface_id.len(),
        ])
        .ok_or(ExecutionError::Capacity)?;
        self.reserve(slot.surface_id.len())?;
        let _body_copy = self.budget.reserve(body.id.len())?;
        let body = (*body).clone();
        self.question(core, Phase::Standing, payload)?
            .standing
            .push(StandingQuery {
                point: slot.clone(),
                body,
            });
        self.slot = Some(slot);
        Ok(None)
    }

    fn check_reach(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<Option<FollowDecision>, ExecutionError> {
        let (source, _) = self.resources(core)?;
        let target = core
            .state
            .physical
            .entities
            .get(&self.target)
            .ok_or(ExecutionError::MissingEntity)?;
        let rules = &core
            .state
            .installed
            .occurrence_rules
            .value()
            .response
            .offers
            .follow;
        let state = self.state()?;
        let margin = if self.prior_working {
            rules.resume_margin
        } else {
            0.0
        };
        let range = if state.complete == Some(true) {
            state.distance
        } else if let Some(slot) = &self.slot {
            if crate::spatial::distance(
                source
                    .world_position()
                    .ok_or(ExecutionError::InvalidPosition)?,
                slot.point(),
            ) > rules.slot_tolerance + margin
            {
                return self.check_route(core);
            }
            state.distance + rules.slot_tolerance
        } else {
            state.distance + margin
        };
        if let Some(ray) = interaction_reach(source, target, range, &self.budget)? {
            self.question(core, Phase::Reach, size_of::<crate::geometry::SightRay>())?
                .sight
                .push(ray);
            Ok(None)
        } else {
            self.check_route(core)
        }
    }

    fn hold(&mut self) -> Result<Option<FollowDecision>, ExecutionError> {
        if self.parent_id.is_some() && self.state()?.complete == Some(true) {
            return self.stop(FollowStop::Reached);
        }
        if self.prior_working && self.prior_route_empty {
            return self.done(None).map(Some);
        }
        self.reserve("working".len())?;
        self.done(Some(ActionRouteWrite {
            path: Vec::new(),
            navigation: None,
            stage: "working".into(),
            replans: None,
        }))
        .map(Some)
    }
}

impl FollowCursor {
    fn pending<'a>(
        &self,
        source: &Entity,
        action: Option<&'a Action>,
    ) -> Result<Option<Option<&'a str>>, ExecutionError> {
        let Some(navigation) = action.and_then(|action| action.navigation.as_ref()) else {
            return Ok(None);
        };
        let current = !self.reacquired
            && crate::time::action_route_request_current(
                source,
                &navigation.request,
                self.binding.geometry_revision,
                &self.budget,
            )?;
        Ok(current.then(|| navigation.failure.as_deref()))
    }

    fn follow_last_seen(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<Option<FollowDecision>, ExecutionError> {
        let Some(saved) = self.state.as_ref().filter(|state| state.on_lost.is_some()) else {
            return self.stop(FollowStop::Lost);
        };
        let Some(seen) = &saved.last_seen else {
            return self.stop(FollowStop::Lost);
        };
        let (source, action) = self.resources(core)?;
        let near = core
            .state
            .installed
            .occurrence_rules
            .value()
            .response
            .offers
            .follow
            .resume_margin;
        if crate::spatial::distance(
            source
                .world_position()
                .ok_or(ExecutionError::InvalidPosition)?,
            seen.point.point(),
        ) <= near
        {
            return self.stop(FollowStop::LastSeenReached);
        }
        if let Some(pending) = self.pending(source, action)? {
            return self.pending_result(pending);
        }
        if saved.pursuing == Some(true)
            && action.is_some_and(|action| !action.path.is_empty() && action.navigation.is_none())
        {
            return self.done(None).map(Some);
        }
        // This branch never reads the lost target's live position or support.
        let budget = self.budget.clone();
        let body = crate::status::effective_body_profile(source, &budget)?;
        let (from, support) = source
            .world_support()
            .ok_or(ExecutionError::InvalidPosition)?;
        let bytes = heap_sum([
            size_of::<RouteQuery>(),
            body.id.len(),
            support.len(),
            seen.point.surface_id.len(),
        ])
        .ok_or(ExecutionError::Capacity)?;
        let _parts = budget.reserve(bytes)?;
        let from = surface_point(from, support);
        let to = seen.point.clone();
        let body = (*body).clone();
        self.state
            .as_mut()
            .ok_or(ExecutionError::Invariant)?
            .pursuing = Some(true);
        self.question(core, Phase::Route, bytes)?
            .routes
            .push(RouteQuery::Surface { from, to, body });
        Ok(None)
    }

    fn pending_result(
        &mut self,
        failure: Option<&str>,
    ) -> Result<Option<FollowDecision>, ExecutionError> {
        match failure {
            Some(failure) => {
                let custody = self.budget.reserve(failure.len())?;
                self.phase = Phase::Done;
                Ok(Some(FollowDecision::NavigationFailed(
                    failure.to_owned(),
                    custody,
                )))
            }
            None => self.done(None).map(Some),
        }
    }

    fn check_route(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<Option<FollowDecision>, ExecutionError> {
        let (source, action) = self.resources(core)?;
        if let Some(pending) = self.pending(source, action)? {
            return self.pending_result(pending);
        }
        let target = core
            .state
            .physical
            .entities
            .get(&self.target)
            .ok_or(ExecutionError::MissingEntity)?;
        let position = target
            .world_position()
            .ok_or(ExecutionError::InvalidPosition)?;
        let state = self.state()?;
        let at = core.state.physical.header.sim_time;
        let policy = &core
            .state
            .installed
            .occurrence_rules
            .value()
            .response
            .offers
            .follow;
        let moved = state.last_observed_position.is_none_or(|old| {
            crate::spatial::distance(old, position) >= policy.target_displacement
        });
        if !self.reacquired
            && action.is_some_and(|action| !action.path.is_empty())
            && !(moved && at >= state.next_repath_at)
        {
            return self.done(None).map(Some);
        }

        let budget = self.budget.clone();
        let body = crate::status::effective_body_profile(source, &budget)?;
        let (from, source_support) = source
            .world_support()
            .ok_or(ExecutionError::InvalidPosition)?;
        let reach = state.distance;
        let support = target.world_support();
        let bytes = heap_sum([
            size_of::<RouteQuery>(),
            body.id.len(),
            source_support.len(),
            self.slot
                .as_ref()
                .map(|point| point.surface_id.as_str())
                .or(support.map(|(_, surface)| surface))
                .map_or(0, str::len),
        ])
        .ok_or(ExecutionError::Capacity)?;
        let _parts = budget.reserve(bytes)?;
        let from = surface_point(from, source_support);
        let route = if let Some(slot) = self.slot.take() {
            RouteQuery::Surface {
                from,
                to: slot,
                body: (*body).clone(),
            }
        } else {
            let target_profile = crate::status::effective_body_profile(target, &budget)?;
            let mut goal = position;
            goal.y += target_profile.interaction_height;
            RouteQuery::Approach {
                from,
                body: (*body).clone(),
                target_position: position,
                target_support: support.map(|(point, surface)| surface_point(point, surface)),
                reach,
                goal,
            }
        };
        let state = self.state.as_mut().ok_or(ExecutionError::Invariant)?;
        state.next_repath_at = at + policy.repath_seconds;
        state.last_observed_position = Some(position);
        self.question(core, Phase::Route, bytes)?.routes.push(route);
        Ok(None)
    }

    fn route_result(&mut self, route: RoutePlan) -> Result<Option<FollowDecision>, ExecutionError> {
        let (path, navigation) = match route {
            RoutePlan::Reached { path, .. } => (path, None),
            RoutePlan::Pending { mut request, .. } => {
                self.reserve("entity".len())?;
                request.wait = Some("entity".into());
                (
                    Vec::new(),
                    Some(NavigationPending {
                        request,
                        failure: None,
                    }),
                )
            }
            _ if self.state()?.pursuing == Some(true) => {
                return self.stop(FollowStop::LastSeenNoRoute);
            }
            RoutePlan::BudgetExceeded { .. } => return self.stop(FollowStop::Budget),
            _ => return self.stop(FollowStop::NoRoute),
        };
        self.reserve(
            heap_sum([
                path.heap_bytes().ok_or(ExecutionError::Capacity)?,
                navigation.heap_bytes().ok_or(ExecutionError::Capacity)?,
                "approaching".len(),
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        self.done(Some(ActionRouteWrite {
            path,
            navigation,
            stage: "approaching".into(),
            replans: None,
        }))
        .map(Some)
    }
}

fn surface_point(point: Point, support: &str) -> SurfacePoint {
    SurfacePoint {
        x: point.x,
        y: point.y,
        z: point.z,
        surface_id: support.to_owned(),
    }
}
