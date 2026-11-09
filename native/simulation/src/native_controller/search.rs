//! Resume one saved ground search. Support, route planning and occupied-body
//! clearance retain their existing physical owners; this cursor only applies
//! the selected response profile's ordered search and progress rules.
use super::selected_profile;
use crate::execution::{CoreMutation, ExecutionError};
use crate::geometry::{
    GeometryAnswers, GeometryBinding, GeometryQueries, NavigationResult, RoutePlan, RouteQuery,
    SurfaceLineQuery,
};
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation, CandidateKey};
use crate::movement::{PathClearanceCursor, PathClearanceStep};
use crate::native_refuge::{
    PendingRefugeNavigation, PreparedRefugeNavigation, RefugeCandidateBatch, RefugeRoute,
};
use crate::native_response::{
    BlockedResponse, RefugeCandidate, RefugeRoute as SavedRoute, ResponseMode,
};
use crate::spatial::distance;
use crate::state::SurfacePoint;
use std::mem::size_of;

pub(super) struct GuardedRoutePlan(pub RoutePlan, pub ByteReservation);

pub(super) struct PlannedRoute {
    pub route: RefugeRoute,
    pub reservation: ByteReservation,
}
pub(super) enum SearchDecision {
    None,
    Stop,
    Route(PlannedRoute),
    Pending(PendingRefugeNavigation),
}
pub(super) enum SearchStep<'a> {
    Geometry(&'a GeometryQueries),
    Complete(SearchDecision),
}
#[derive(Clone, Copy)]
enum Phase {
    Candidate,
    Direct,
    DirectScore,
    Prefix,
    PrefixScore,
    Consider,
    Advance,
    Best,
    CheckEnd,
    Done,
}
const PREFIXES: [f64; 6] = [0.875, 0.75, 0.5, 0.25, 0.125, 0.0625];

pub(super) struct GroundSearchCursor {
    actor: String,
    candidate: CandidateKey,
    stop_on_failure: bool,
    phase: Phase,
    support: Option<RefugeCandidateBatch>,
    question: Option<(GeometryQueries, ByteReservation)>,
    direct: Option<GuardedRoutePlan>,
    prepared: Option<PreparedRefugeNavigation>,
    route: Option<PlannedRoute>,
    clearance: Option<PathClearanceCursor>,
    prefix: usize,
    _reservation: ByteReservation,
}

pub(super) fn route_plan(
    plan: RoutePlan,
    budget: &ByteBudget,
) -> Result<GuardedRoutePlan, ExecutionError> {
    let bytes = match &plan {
        RoutePlan::Reached { path, .. } => path.heap_bytes(),
        RoutePlan::Pending { request, .. } => heap_sum([
            request.from.heap_bytes().ok_or(ExecutionError::Capacity)?,
            request
                .destinations
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?,
            request.body.id.capacity(),
            request.wait.heap_bytes().ok_or(ExecutionError::Capacity)?,
        ]),
        _ => Some(0),
    }
    .ok_or(ExecutionError::Capacity)?;
    let guard = budget.reserve(
        size_of::<RoutePlan>()
            .checked_add(bytes)
            .ok_or(ExecutionError::Capacity)?,
    )?;
    Ok(GuardedRoutePlan(plan, guard))
}
fn path_length(from: &SurfacePoint, path: &[SurfacePoint]) -> f64 {
    let mut previous = from.point();
    let mut length = 0.0;
    for point in path {
        length += distance(previous, point.point());
        previous = point.point();
    }
    length
}
// Math.hypot(dx,dz) uses the same compensated sum as distance, with no
// artificial vertical term between the two nonzero terms.
fn progress(from: &SurfacePoint, to: &SurfacePoint) -> f64 {
    let dx = (to.x - from.x).abs();
    let dz = (to.z - from.z).abs();
    let maximum = dx.max(dz);
    if maximum == 0.0 {
        return 0.0;
    }
    let x = dx / maximum;
    let z = dz / maximum;
    maximum * (x * x + z * z).sqrt()
}

impl GroundSearchCursor {
    pub(super) fn prepare(
        actor: &str,
        candidate: CandidateKey,
        needs_candidate: bool,
        stop_on_failure: bool,
        direct: Option<GuardedRoutePlan>,
        prepared: Option<PreparedRefugeNavigation>,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let reservation = budget.reserve(size_of::<Self>() + actor.len())?;
        Ok(Self {
            actor: actor.into(),
            candidate,
            stop_on_failure,
            phase: if needs_candidate {
                Phase::Candidate
            } else {
                Phase::Direct
            },
            support: None,
            question: None,
            direct,
            prepared,
            route: None,
            clearance: None,
            prefix: 0,
            _reservation: reservation,
        })
    }
    fn binding(&self, core: &mut CoreMutation<'_>) -> Result<GeometryBinding, ExecutionError> {
        Ok(GeometryBinding::new(
            self.candidate,
            core.state.installed.geometry.spatial.revision,
            core.journal.next_provider_serial()?,
        ))
    }
    fn proposal<'a>(
        &self,
        core: &'a CoreMutation<'_>,
    ) -> Result<&'a crate::native_response::NativeRefugeProposal, ExecutionError> {
        core.state
            .physical
            .entities
            .get(&self.actor)
            .and_then(|entity| entity.animal.as_ref())
            .and_then(|animal| animal.episode.as_ref())
            .and_then(|episode| episode.proposal.as_ref())
            .ok_or(ExecutionError::Invariant)
    }
    fn profile<'a>(
        &self,
        core: &'a CoreMutation<'_>,
    ) -> Result<&'a crate::native_response::NativeResponseProfile, ExecutionError> {
        selected_profile(
            &core.state.installed,
            core.state
                .physical
                .entities
                .get(&self.actor)
                .and_then(|entity| entity.animal.as_ref())
                .ok_or(ExecutionError::Invariant)?,
        )
    }
    fn planned(
        &self,
        core: &CoreMutation<'_>,
        path: Vec<SurfacePoint>,
        length: f64,
        mut guard: ByteReservation,
        prefix: bool,
        budget: &ByteBudget,
    ) -> Result<PlannedRoute, ExecutionError> {
        let source = self
            .proposal(core)?
            .candidates
            .first()
            .ok_or(ExecutionError::Invariant)?;
        let point = if prefix {
            path.last().ok_or(ExecutionError::Invariant)?
        } else {
            &source.point
        };
        guard.merge(
            budget.reserve(size_of::<RefugeRoute>() + source.id.len() + point.surface_id.len())?,
        )?;
        let candidate = RefugeCandidate {
            id: source.id.clone(),
            point: point.clone(),
            retained: if prefix { None } else { source.retained },
            preferred: if prefix { None } else { source.preferred },
        };
        Ok(PlannedRoute {
            route: RefugeRoute {
                candidate,
                path,
                length,
                worsening: 0.0,
                arrival_margin: 0.0,
            },
            reservation: guard,
        })
    }
    fn take_answer(&mut self, answer: GeometryAnswers) -> Result<GeometryAnswers, ExecutionError> {
        let (question, _guard) = self
            .question
            .take()
            .ok_or(ExecutionError::UnfinishedOccurrence)?;
        question
            .validate_answers(&answer)
            .map_err(|_| ExecutionError::Invariant)?;
        Ok(answer)
    }
    pub(super) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        mut answer: Option<GeometryAnswers>,
        budget: &ByteBudget,
    ) -> Result<SearchStep<'a>, ExecutionError> {
        loop {
            match self.phase {
                Phase::Candidate => {
                    if self.support.is_none() {
                        if answer.is_some() {
                            return Err(ExecutionError::UnfinishedOccurrence);
                        }
                        let binding = self.binding(core)?;
                        self.support = Some(RefugeCandidateBatch::prepare(
                            &core.state.physical,
                            &core.state.installed,
                            &self.actor,
                            binding,
                            budget,
                        )?);
                    }
                    let Some(response) = answer.take() else {
                        return Ok(SearchStep::Geometry(
                            self.support
                                .as_ref()
                                .ok_or(ExecutionError::Invariant)?
                                .queries(),
                        ));
                    };
                    self.support
                        .take()
                        .ok_or(ExecutionError::Invariant)?
                        .finish(&mut core.physical(), response)?;
                    self.phase = Phase::Direct;
                }
                Phase::Direct => {
                    if self
                        .proposal(core)?
                        .search
                        .as_ref()
                        .ok_or(ExecutionError::Invariant)?
                        .attempted
                        >= self.profile(core)?.candidates.angles.len() as u64
                    {
                        self.phase = Phase::CheckEnd;
                        continue;
                    }
                    if self.proposal(core)?.candidates.is_empty() {
                        self.phase = Phase::Advance;
                        continue;
                    }
                    if let Some(response) = answer.take() {
                        let mut response = self.take_answer(response)?;
                        self.direct = Some(route_plan(
                            response.routes.pop().ok_or(ExecutionError::Invariant)?,
                            budget,
                        )?);
                    }
                    if self.direct.is_none() {
                        if self.question.is_none() {
                            let entity = core
                                .state
                                .physical
                                .entities
                                .get(&self.actor)
                                .ok_or(ExecutionError::MissingActor)?;
                            let proposal = self.proposal(core)?;
                            let to = &proposal.candidates[0].point;
                            let guard = budget.reserve(
                                size_of::<GeometryQueries>()
                                    + size_of::<RouteQuery>()
                                    + proposal.origin.surface_id.len()
                                    + to.surface_id.len()
                                    + entity.ordinary_body_profile().id.len(),
                            )?;
                            let query = RouteQuery::Surface {
                                from: proposal.origin.clone(),
                                to: to.clone(),
                                body: entity.body_profile().into_owned(),
                            };
                            let mut question = GeometryQueries::new(self.binding(core)?);
                            question.routes = vec![query];
                            self.question = Some((question, guard));
                        }
                        return Ok(SearchStep::Geometry(
                            &self.question.as_ref().ok_or(ExecutionError::Invariant)?.0,
                        ));
                    }
                    let GuardedRoutePlan(plan, guard) =
                        self.direct.take().ok_or(ExecutionError::Invariant)?;
                    match plan {
                        RoutePlan::Reached { path, length, .. } => {
                            self.route =
                                Some(self.planned(core, path, length, guard, false, budget)?)
                        }
                        RoutePlan::Pending { request, .. } => {
                            let prepared = match self.prepared.take() {
                                Some(prepared) => prepared.into_current_answer(
                                    core,
                                    &self.actor,
                                    self.candidate.generation,
                                    &request,
                                    budget,
                                )?,
                                None => None,
                            };
                            if let Some((response, guard)) = prepared {
                                if response.problem.is_none() {
                                    if let NavigationResult::Reached { path, .. } = response.result
                                    {
                                        let length =
                                            path_length(&self.proposal(core)?.origin, &path);
                                        self.route = Some(
                                            self.planned(core, path, length, guard, false, budget)?,
                                        );
                                    }
                                }
                            } else {
                                let pending = PendingRefugeNavigation::prepare(
                                    core,
                                    &self.actor,
                                    request,
                                    self.candidate,
                                    budget,
                                )?;
                                let at = core.state.physical.header.sim_time;
                                let review = at + self.profile(core)?.review_seconds;
                                core.physical()
                                    .snapshot_episode(&self.actor)?
                                    .as_mut()
                                    .ok_or(ExecutionError::Invariant)?
                                    .review_at = review;
                                core.physical().behavior_changed(&self.actor, false)?;
                                self.phase = Phase::Done;
                                return Ok(SearchStep::Complete(SearchDecision::Pending(pending)));
                            }
                        }
                        _ => {}
                    }
                    self.phase = Phase::DirectScore;
                }
                Phase::DirectScore | Phase::PrefixScore | Phase::Best => {
                    let maximum = self.profile(core)?.candidates.maximum_route_length
                        + core.state.installed.spatial.epsilon;
                    if self
                        .route
                        .as_ref()
                        .is_some_and(|route| route.route.length > maximum)
                    {
                        self.route = None;
                    }
                    if let Some(route) = &self.route {
                        if self.clearance.is_none() {
                            self.clearance = Some(PathClearanceCursor::prepare(
                                &self.actor,
                                self.proposal(core)?.origin.point(),
                                route.route.path.len(),
                                self.candidate,
                                budget,
                            )?);
                        }
                        match self
                            .clearance
                            .as_mut()
                            .ok_or(ExecutionError::Invariant)?
                            .step(core, &route.route.path, answer.take(), budget)?
                        {
                            PathClearanceStep::Geometry(_) => {
                                return Ok(SearchStep::Geometry(
                                    self.clearance
                                        .as_ref()
                                        .ok_or(ExecutionError::Invariant)?
                                        .geometry_request()
                                        .ok_or(ExecutionError::Invariant)?,
                                ));
                            }
                            PathClearanceStep::Complete(product) => {
                                if !product.clear() {
                                    self.route = None;
                                }
                                self.clearance = None;
                            }
                        }
                    } else if answer.is_some() {
                        return Err(ExecutionError::UnfinishedOccurrence);
                    }
                    match self.phase {
                        Phase::Best => {
                            if let Some(route) = self.route.take() {
                                self.phase = Phase::Done;
                                return Ok(SearchStep::Complete(SearchDecision::Route(route)));
                            }
                            core.physical()
                                .snapshot_episode(&self.actor)?
                                .as_mut()
                                .and_then(|episode| episode.proposal.as_mut())
                                .and_then(|proposal| proposal.search.as_mut())
                                .ok_or(ExecutionError::Invariant)?
                                .best = None;
                            self.phase = Phase::CheckEnd;
                        }
                        Phase::PrefixScore => {
                            let from = &self.proposal(core)?.origin;
                            let minimum = self.profile(core)?.candidates.minimum_advance;
                            if self.route.as_ref().is_some_and(|route| {
                                progress(from, &route.route.candidate.point) >= minimum
                            }) {
                                self.phase = Phase::Consider;
                            } else {
                                self.route = None;
                                self.prefix += 1;
                                self.phase = Phase::Prefix;
                            }
                        }
                        _ => {
                            let proposal = self.proposal(core)?;
                            let search =
                                proposal.search.as_ref().ok_or(ExecutionError::Invariant)?;
                            let maximum = search.distance
                                * self.profile(core)?.candidates.maximum_detour_factor;
                            let too_long = self
                                .route
                                .as_ref()
                                .is_none_or(|route| route.route.length > maximum);
                            if too_long && !proposal.candidates.is_empty() {
                                self.route = None;
                                self.prefix = 0;
                                self.phase = Phase::Prefix;
                            } else {
                                self.phase = Phase::Consider;
                            }
                        }
                    }
                }
                Phase::Prefix => {
                    if self.prefix == PREFIXES.len() {
                        self.phase = Phase::Advance;
                        continue;
                    }
                    if let Some(response) = answer.take() {
                        let mut response = self.take_answer(response)?;
                        if let Some(line) = response
                            .surface_lines
                            .pop()
                            .ok_or(ExecutionError::Invariant)?
                        {
                            if !line.path.is_empty() {
                                let length = path_length(&self.proposal(core)?.origin, &line.path);
                                let guard = budget.reserve(
                                    line.path.heap_bytes().ok_or(ExecutionError::Capacity)?,
                                )?;
                                self.route = Some(
                                    self.planned(core, line.path, length, guard, true, budget)?,
                                );
                            }
                        }
                        self.phase = Phase::PrefixScore;
                        continue;
                    }
                    if self.question.is_none() {
                        let proposal = self.proposal(core)?;
                        let from = &proposal.origin;
                        let to = &proposal
                            .candidates
                            .first()
                            .ok_or(ExecutionError::Invariant)?
                            .point;
                        let entity = core
                            .state
                            .physical
                            .entities
                            .get(&self.actor)
                            .ok_or(ExecutionError::MissingActor)?;
                        let guard = budget.reserve(
                            size_of::<GeometryQueries>()
                                + size_of::<SurfaceLineQuery>()
                                + from.surface_id.len()
                                + entity.ordinary_body_profile().id.len(),
                        )?;
                        let fraction = PREFIXES[self.prefix];
                        let query = SurfaceLineQuery {
                            from: from.clone(),
                            x: from.x + (to.x - from.x) * fraction,
                            z: from.z + (to.z - from.z) * fraction,
                            body: entity.body_profile().into_owned(),
                        };
                        let mut question = GeometryQueries::new(self.binding(core)?);
                        question.surface_lines = vec![query];
                        self.question = Some((question, guard));
                    }
                    return Ok(SearchStep::Geometry(
                        &self.question.as_ref().ok_or(ExecutionError::Invariant)?.0,
                    ));
                }
                Phase::Consider => {
                    if let Some(route) = self.route.take() {
                        let search = self
                            .proposal(core)?
                            .search
                            .as_ref()
                            .ok_or(ExecutionError::Invariant)?;
                        let rule = &self.profile(core)?.candidates;
                        if route.route.length
                            <= search.distance * rule.maximum_detour_factor
                                + core.state.installed.spatial.epsilon
                        {
                            let progress = progress(
                                &self.proposal(core)?.origin,
                                &route.route.candidate.point,
                            );
                            let preferred = progress
                                >= search.distance * rule.preferred_progress
                                    - core.state.installed.spatial.epsilon;
                            if progress > search.best.as_ref().map_or(0.0, |best| best.progress) {
                                let bytes = heap_sum([
                                    size_of::<SavedRoute>(),
                                    route.route.candidate.point.surface_id.len(),
                                    route
                                        .route
                                        .path
                                        .heap_bytes()
                                        .ok_or(ExecutionError::Capacity)?,
                                ])
                                .ok_or(ExecutionError::Capacity)?;
                                core.physical().reserve_response_growth(bytes)?;
                                let best = SavedRoute {
                                    point: route.route.candidate.point.clone(),
                                    path: route.route.path.clone(),
                                    length: route.route.length,
                                    progress,
                                };
                                core.physical()
                                    .snapshot_episode(&self.actor)?
                                    .as_mut()
                                    .and_then(|episode| episode.proposal.as_mut())
                                    .and_then(|proposal| proposal.search.as_mut())
                                    .ok_or(ExecutionError::Invariant)?
                                    .best = Some(best);
                            }
                            if preferred {
                                self.phase = Phase::Done;
                                return Ok(SearchStep::Complete(SearchDecision::Route(route)));
                            }
                        }
                    }
                    self.phase = Phase::Advance;
                }
                Phase::Advance => {
                    self.prepared = None;
                    core.physical()
                        .snapshot_episode(&self.actor)?
                        .as_mut()
                        .and_then(|episode| episode.proposal.as_mut())
                        .and_then(|proposal| proposal.search.as_mut())
                        .ok_or(ExecutionError::Invariant)?
                        .attempted += 1;
                    let search = self
                        .proposal(core)?
                        .search
                        .as_ref()
                        .ok_or(ExecutionError::Invariant)?;
                    let rule = &self.profile(core)?.candidates;
                    if let Some(best) = &search.best {
                        if search.attempted >= rule.angles.len() as u64
                            || (search.attempted >= rule.minimum_attempts
                                && best.progress
                                    >= search.distance * rule.minimum_progress
                                        - core.state.installed.spatial.epsilon)
                        {
                            let guard = budget.reserve(
                                heap_sum([
                                    size_of::<RefugeRoute>(),
                                    4,
                                    best.point.surface_id.len(),
                                    best.path.heap_bytes().ok_or(ExecutionError::Capacity)?,
                                ])
                                .ok_or(ExecutionError::Capacity)?,
                            )?;
                            self.route = Some(PlannedRoute {
                                route: RefugeRoute {
                                    candidate: RefugeCandidate {
                                        id: "best".into(),
                                        point: best.point.clone(),
                                        retained: None,
                                        preferred: None,
                                    },
                                    path: best.path.clone(),
                                    length: best.length,
                                    worsening: 0.0,
                                    arrival_margin: 0.0,
                                },
                                reservation: guard,
                            });
                            self.phase = Phase::Best;
                            continue;
                        }
                    }
                    self.phase = Phase::CheckEnd;
                }
                Phase::CheckEnd => {
                    let proposal = self.proposal(core)?;
                    if proposal
                        .search
                        .as_ref()
                        .ok_or(ExecutionError::Invariant)?
                        .attempted
                        < self.profile(core)?.candidates.angles.len() as u64
                    {
                        self.phase = Phase::Candidate;
                        continue;
                    }
                    let basis = proposal.generation.to_string();
                    let at = core.state.physical.header.sim_time;
                    let review = at + self.profile(core)?.blocked_review_seconds;
                    core.physical()
                        .reserve_response_growth("no-usable-route".len() + basis.len())?;
                    let mut mutation = core.physical();
                    let episode = mutation
                        .snapshot_episode(&self.actor)?
                        .as_mut()
                        .ok_or(ExecutionError::Invariant)?;
                    episode.mode = ResponseMode::Blocked;
                    episode.blocked = Some(BlockedResponse {
                        reason: "no-usable-route".into(),
                        basis,
                    });
                    episode.proposal = None;
                    episode.review_at = review;
                    mutation.behavior_changed(&self.actor, false)?;
                    self.phase = Phase::Done;
                    return Ok(SearchStep::Complete(if self.stop_on_failure {
                        SearchDecision::Stop
                    } else {
                        SearchDecision::None
                    }));
                }
                Phase::Done => return Err(ExecutionError::UnfinishedOccurrence),
            }
        }
    }
}
