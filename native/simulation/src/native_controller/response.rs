//! One ordinary ground response turn, including entity-local navigation waits.
//! Completing this decision admits no movement: the command owner still checks
//! and commits the chosen intention through its ordinary occurrence boundaries.
use super::ground::{block_response, physical_unavailable};
use super::search::{GroundSearchCursor, GuardedRoutePlan, SearchDecision, SearchStep, route_plan};
use super::{
    GroundTurn, expire_acoustic_patterns, ground_turn, proposal_current, selected_profile,
};
use crate::execution::{CoreMutation, ExecutionError, PhysicalMutation};
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries, RoutePlan, RouteQuery};
use crate::host::{ByteBudget, ByteReservation, CandidateKey};
use crate::native_danger::DangerBatch;
use crate::native_refuge::{PendingRefugeNavigation, PreparedRefugeNavigation, RefugeRoute};
use crate::native_response::NavigationWait;
use std::mem::size_of;

pub(crate) enum GroundResponseDecision {
    None,
    Stop,
    Route {
        route: RefugeRoute,
        reservation: ByteReservation,
    },
    Pending(PendingRefugeNavigation),
}
pub(crate) struct CompletedGroundResponse {
    decision: GroundResponseDecision,
}
impl CompletedGroundResponse {
    pub(crate) fn into_decision(self) -> GroundResponseDecision {
        self.decision
    }
}
pub(crate) enum GroundResponseStep<'a> {
    Geometry(&'a GeometryQueries),
    Complete(CompletedGroundResponse),
}
#[derive(Clone, Copy)]
enum Phase {
    Start,
    Readiness,
    Physical,
    Danger,
    Search,
    Done,
}
pub(crate) struct GroundResponseCursor {
    actor: String,
    candidate: CandidateKey,
    phase: Phase,
    prepared: Option<PreparedRefugeNavigation>,
    question: Option<(GeometryQueries, ByteReservation)>,
    direct: Option<GuardedRoutePlan>,
    danger: Option<DangerBatch>,
    search: Option<GroundSearchCursor>,
    _reservation: ByteReservation,
}
impl GroundResponseCursor {
    pub(crate) fn geometry_request(&self) -> Option<&GeometryQueries> {
        self.search
            .as_ref()
            .and_then(GroundSearchCursor::geometry_request)
            .or_else(|| self.question.as_ref().map(|(question, _)| question))
            .or_else(|| self.danger.as_ref().map(DangerBatch::queries))
    }
    pub(crate) fn prepare(
        actor: &str,
        candidate: CandidateKey,
        prepared: Option<PreparedRefugeNavigation>,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let reservation = budget.reserve(size_of::<Self>() + actor.len())?;
        Ok(Self {
            actor: actor.into(),
            candidate,
            phase: Phase::Start,
            prepared,
            question: None,
            direct: None,
            danger: None,
            search: None,
            _reservation: reservation,
        })
    }
    fn complete(&mut self, decision: GroundResponseDecision) -> GroundResponseStep<'static> {
        self.phase = Phase::Done;
        GroundResponseStep::Complete(CompletedGroundResponse { decision })
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        mut answer: Option<GeometryAnswers>,
        budget: &ByteBudget,
    ) -> Result<GroundResponseStep<'a>, ExecutionError> {
        loop {
            match self.phase {
                Phase::Start => {
                    if answer.is_some() {
                        return Err(ExecutionError::UnfinishedOccurrence);
                    }
                    let entity = core.state.physical.entities.get(&self.actor);
                    if entity.is_none_or(|entity| entity.animal.is_none() || entity.actor.is_none())
                    {
                        return Ok(self.complete(GroundResponseDecision::None));
                    }
                    expire_acoustic_patterns(&mut core.physical(), &self.actor)?;
                    let entity = core
                        .state
                        .physical
                        .entities
                        .get(&self.actor)
                        .ok_or(ExecutionError::MissingEntity)?;
                    let actor = entity.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
                    let state = entity.animal.as_ref().ok_or(ExecutionError::Invariant)?;
                    if actor.controller != "native" {
                        crate::body::reconcile_native_control(core, &self.actor)?;
                        return Ok(self.complete(GroundResponseDecision::None));
                    }
                    if !actor.alive || state.physical_life != actor.physical_life.unwrap_or(0) {
                        let life = actor.physical_life.unwrap_or(0);
                        let bytes = state.acoustic_patterns.keys().try_fold(
                            state
                                .acoustic_patterns
                                .len()
                                .checked_mul(size_of::<String>())
                                .ok_or(ExecutionError::Capacity)?,
                            |bytes, key| {
                                bytes.checked_add(key.len()).ok_or(ExecutionError::Capacity)
                            },
                        )?;
                        let _keys = budget.reserve(bytes)?;
                        let keys = state.acoustic_patterns.keys().cloned().collect::<Vec<_>>();
                        let mut mutation = core.physical();
                        *mutation.snapshot_episode(&self.actor)? = None;
                        for key in keys {
                            mutation.set_acoustic_pattern(&self.actor, &key, None)?;
                        }
                        mutation.set_animal_physical_life(&self.actor, life)?;
                        mutation.behavior_changed(&self.actor, false)?;
                        return Ok(self.complete(GroundResponseDecision::None));
                    }
                    let at = core.state.physical.header.sim_time;
                    let Some(episode) = &state.episode else {
                        return Ok(self.complete(GroundResponseDecision::None));
                    };
                    if episode.review_at > at && episode.proposal.is_none() {
                        return Ok(self.complete(GroundResponseDecision::None));
                    }
                    selected_profile(&core.state.installed, state)?;
                    if entity.spatial.flight.is_some() || state.foraging.is_some() {
                        return Err(ExecutionError::UnsupportedFamily);
                    }
                    self.phase = Phase::Readiness;
                }
                Phase::Readiness => {
                    let episode = core
                        .state
                        .physical
                        .entities
                        .get(&self.actor)
                        .and_then(|entity| entity.animal.as_ref())
                        .and_then(|animal| animal.episode.as_ref())
                        .ok_or(ExecutionError::Invariant)?;
                    let waiting = episode
                        .proposal
                        .as_ref()
                        .is_some_and(|proposal| proposal.wait == Some(NavigationWait::Entity));
                    if !waiting
                        || !proposal_current(
                            &core.state.physical,
                            &core.state.installed,
                            &self.actor,
                        )?
                    {
                        self.phase = Phase::Physical;
                        continue;
                    }
                    let proposal = episode.proposal.as_ref().ok_or(ExecutionError::Invariant)?;
                    if proposal.candidates.is_empty() {
                        self.phase = Phase::Physical;
                        continue;
                    }
                    if let Some(mut response) = answer.take() {
                        let (question, _guard) = self
                            .question
                            .take()
                            .ok_or(ExecutionError::UnfinishedOccurrence)?;
                        question
                            .validate_answers(&response)
                            .map_err(|_| ExecutionError::Invariant)?;
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
                                .ok_or(ExecutionError::MissingEntity)?;
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
                            let binding = GeometryBinding::new(
                                self.candidate,
                                core.state.installed.geometry.spatial.revision,
                                core.journal.next_provider_serial()?,
                            );
                            let mut question = GeometryQueries::new(binding);
                            question.routes = vec![query];
                            self.question = Some((question, guard));
                        }
                        return Ok(GroundResponseStep::Geometry(
                            &self.question.as_ref().ok_or(ExecutionError::Invariant)?.0,
                        ));
                    }
                    if let Some(GuardedRoutePlan(RoutePlan::Pending { request, .. }, _)) =
                        &self.direct
                    {
                        let ready = match &self.prepared {
                            Some(prepared) => prepared.matches(
                                core,
                                &self.actor,
                                self.candidate.generation,
                                request,
                                budget,
                            )?,
                            None => false,
                        };
                        if !ready {
                            let GuardedRoutePlan(RoutePlan::Pending { request, .. }, _guard) =
                                self.direct.take().ok_or(ExecutionError::Invariant)?
                            else {
                                return Err(ExecutionError::Invariant);
                            };
                            let pending = PendingRefugeNavigation::prepare(
                                core,
                                &self.actor,
                                request,
                                self.candidate,
                                budget,
                            )?;
                            let at = core.state.physical.header.sim_time;
                            let state = core
                                .state
                                .physical
                                .entities
                                .get(&self.actor)
                                .and_then(|entity| entity.animal.as_ref())
                                .ok_or(ExecutionError::Invariant)?;
                            let episode =
                                state.episode.as_ref().ok_or(ExecutionError::Invariant)?;
                            if episode.review_at <= at {
                                let review = at
                                    + selected_profile(&core.state.installed, state)?
                                        .review_seconds;
                                core.physical()
                                    .snapshot_episode(&self.actor)?
                                    .as_mut()
                                    .ok_or(ExecutionError::Invariant)?
                                    .review_at = review;
                                core.physical().animal_clock_changed(&self.actor)?;
                            }
                            return Ok(self.complete(GroundResponseDecision::Pending(pending)));
                        }
                    }
                    self.phase = Phase::Physical;
                }
                Phase::Physical => {
                    let installed = core.state.installed.clone();
                    if physical_unavailable(&core.state.physical, &installed, &self.actor)? {
                        block_response(&mut core.physical(), &installed, &self.actor, true)?;
                        return Ok(self.complete(GroundResponseDecision::None));
                    }
                    let binding = GeometryBinding::new(
                        self.candidate,
                        installed.geometry.spatial.revision,
                        core.journal.next_provider_serial()?,
                    );
                    self.danger = Some(DangerBatch::prepare(
                        &core.state.physical,
                        &installed,
                        &self.actor,
                        binding,
                        budget,
                    )?);
                    self.phase = Phase::Danger;
                }
                Phase::Danger => {
                    let needs_answer = answer.is_none()
                        && !self
                            .danger
                            .as_ref()
                            .ok_or(ExecutionError::Invariant)?
                            .queries()
                            .is_empty();
                    if needs_answer {
                        return Ok(GroundResponseStep::Geometry(
                            self.danger
                                .as_ref()
                                .ok_or(ExecutionError::Invariant)?
                                .queries(),
                        ));
                    }
                    let batch = self.danger.take().ok_or(ExecutionError::Invariant)?;
                    let (assessment, sight) = match answer.take() {
                        Some(answer) => batch.finish(answer)?,
                        None => {
                            let binding = batch.queries().binding;
                            batch.finish_sight(binding, &[])?
                        }
                    };
                    let installed = core.state.installed.clone();
                    let assessment = assessment.reconcile(
                        &mut PhysicalMutation {
                            state: &mut core.state.physical,
                            journal: &mut core.journal.physical,
                        },
                        &installed,
                        &mut core.journal.meters,
                        &sight,
                    )?;
                    // Decision acquisition only reconciles danger. Actual visual
                    // receiving and continuity belong to the perception phase.
                    let turn = ground_turn(
                        &mut core.physical(),
                        &installed,
                        &self.actor,
                        &assessment,
                        installed.spatial.epsilon,
                    )?;
                    let (needs_candidate, stop_on_failure) = match turn {
                        GroundTurn::None => return Ok(self.complete(GroundResponseDecision::None)),
                        GroundTurn::Candidate { stop_on_failure } => {
                            self.direct = None;
                            (true, stop_on_failure)
                        }
                        GroundTurn::Route { stop_on_failure } => (false, stop_on_failure),
                    };
                    self.search = Some(GroundSearchCursor::prepare(
                        &self.actor,
                        self.candidate,
                        needs_candidate,
                        stop_on_failure,
                        self.direct.take(),
                        self.prepared.take(),
                        budget,
                    )?);
                    self.phase = Phase::Search;
                }
                Phase::Search => {
                    match self
                        .search
                        .as_mut()
                        .ok_or(ExecutionError::Invariant)?
                        .step(core, answer.take(), budget)?
                    {
                        SearchStep::Geometry(question) => {
                            return Ok(GroundResponseStep::Geometry(question));
                        }
                        SearchStep::Complete(decision) => {
                            self.phase = Phase::Done;
                            let decision = match decision {
                                SearchDecision::None => GroundResponseDecision::None,
                                SearchDecision::Stop => GroundResponseDecision::Stop,
                                SearchDecision::Route(product) => GroundResponseDecision::Route {
                                    route: product.route,
                                    reservation: product.reservation,
                                },
                                SearchDecision::Pending(pending) => {
                                    GroundResponseDecision::Pending(pending)
                                }
                            };
                            return Ok(GroundResponseStep::Complete(CompletedGroundResponse {
                                decision,
                            }));
                        }
                    }
                }
                Phase::Done => return Err(ExecutionError::UnfinishedOccurrence),
            }
        }
    }
}
