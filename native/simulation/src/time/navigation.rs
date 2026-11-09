//! A saved request blocks time only while its actual scope still needs a
//! provider answer. Preparation is neither movement permission nor an effect.
//! See docs/spatial-world.md#movement and the installed native-response family.
use crate::execution::{CoreMutation, ExecutionError, PhysicalChangeCursor};
use crate::geometry::{
    GeometryAnswers, GeometryBinding, GeometryQueries, GuardedRoutePlan, RoutePlan, RouteQuery,
    route_plan,
};
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation, CandidateKey};
use crate::native_refuge::PreparedRefugeNavigation;
use crate::native_response::{LocomotionMode, NavigationWait};
use crate::state::{Entity, EntityHandle, Placement};
use std::mem::size_of;

pub(crate) fn action_navigation_pending(
    entity: &Entity,
    now: f64,
    revision: u64,
    budget: &ByteBudget,
) -> Result<bool, ExecutionError> {
    let Some(actor) = &entity.actor else {
        return Ok(false);
    };
    let Some(action) = &actor.action else {
        return Ok(false);
    };
    let Some(pending) = &action.navigation else {
        return Ok(false);
    };
    if !actor.alive
        || actor.incapacitated
        || !entity.actively_participates()
        || pending.request.wait.as_deref() == Some("entity")
        || pending
            .failure
            .as_ref()
            .is_some_and(|failure| !failure.is_empty())
    {
        return Ok(false);
    }
    if action
        .native_locomotion
        .as_ref()
        .is_some_and(|movement| movement.mode == LocomotionMode::Escape)
        && entity
            .animal
            .as_ref()
            .and_then(|animal| animal.episode.as_ref())
            .is_some_and(|episode| episode.review_at <= now && episode.proposal.is_none())
    {
        return Ok(false);
    }
    let Some(Placement::World {
        position,
        support_surface_id: Some(surface),
        ..
    }) = &entity.placement
    else {
        return Ok(false);
    };
    let _body = entity
        .spatial
        .soft_footprint
        .as_ref()
        .map(|_| budget.reserve(entity.ordinary_body_profile().id.len()))
        .transpose()?;
    let body = entity.body_profile();
    let request = &pending.request;
    Ok(request.geometry_revision == revision
        && *surface == request.from.surface_id
        && crate::spatial::distance(*position, request.from.point()) < 1e-7
        && body.radius == request.body.radius
        && body.height == request.body.height
        && body.max_slope == request.body.max_slope)
}

pub(super) enum NavigationGateStep<'a> {
    Geometry(&'a GeometryQueries),
    Complete(bool),
}
pub(super) struct NavigationGate {
    candidate: CandidateKey,
    at: f64,
    changes: PhysicalChangeCursor,
    proposals: Vec<EntityHandle>,
    next: usize,
    blocked: bool,
    done: bool,
    question: Option<(GeometryQueries, ByteReservation)>,
    reservation: ByteReservation,
}
impl NavigationGate {
    pub(super) fn prepare(
        core: &CoreMutation<'_>,
        candidate: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let mut result = Self {
            candidate,
            at: core.state.physical.header.sim_time,
            changes: core.journal.physical.change_cursor(),
            proposals: Vec::new(),
            next: 0,
            blocked: false,
            done: false,
            question: None,
            reservation: budget.reserve(size_of::<Self>())?,
        };
        for id in core.state.physical.entities.ordered_ids() {
            let entity = core
                .state
                .physical
                .entities
                .get(id)
                .ok_or(ExecutionError::Invariant)?;
            if action_navigation_pending(
                entity,
                result.at,
                core.state.installed.geometry.spatial.revision,
                budget,
            )? {
                result.blocked = true;
                break;
            }
            let Some(proposal) = entity
                .animal
                .as_ref()
                .and_then(|animal| animal.episode.as_ref())
                .and_then(|episode| episode.proposal.as_ref())
            else {
                continue;
            };
            if proposal.wait == Some(NavigationWait::Entity)
                || proposal.candidates.is_empty()
                || !crate::native_controller::proposal_current(
                    &core.state.physical,
                    &core.state.installed,
                    id,
                )?
            {
                continue;
            }
            if result.proposals.len() == result.proposals.capacity() {
                result.reservation.resize(
                    result
                        .reservation
                        .bytes()
                        .checked_add(size_of::<EntityHandle>())
                        .ok_or(ExecutionError::Capacity)?,
                )?;
                result
                    .proposals
                    .try_reserve_exact(1)
                    .map_err(|_| ExecutionError::Capacity)?;
            }
            result.proposals.push(
                core.state
                    .physical
                    .entities
                    .handle(id)
                    .ok_or(ExecutionError::Invariant)?,
            );
        }
        Ok(result)
    }
    pub(super) fn question(&self) -> Option<&GeometryQueries> {
        self.question.as_ref().map(|(question, _)| question)
    }
    pub(super) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        mut answer: Option<GeometryAnswers>,
        prepared: &[(String, PreparedRefugeNavigation)],
        budget: &ByteBudget,
    ) -> Result<NavigationGateStep<'a>, ExecutionError> {
        if self.done
            || core.state.physical.header.sim_time != self.at
            || !core
                .journal
                .physical
                .changes_since(self.changes)?
                .is_empty()
        {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        if let Some(mut answer) = answer.take() {
            let (question, _guard) = self
                .question
                .take()
                .ok_or(ExecutionError::UnfinishedOccurrence)?;
            question
                .validate_answers(&answer)
                .map_err(|_| ExecutionError::Invariant)?;
            let GuardedRoutePlan(plan, _guard) = route_plan(
                answer.routes.pop().ok_or(ExecutionError::Invariant)?,
                budget,
            )?;
            if let RoutePlan::Pending { request, .. } = plan {
                let entity = core
                    .state
                    .physical
                    .entities
                    .resolve(self.proposals[self.next])
                    .ok_or(ExecutionError::Invariant)?;
                let ready = match prepared.iter().find(|(actor, _)| actor == &entity.id) {
                    Some((_, prepared)) => prepared.matches(
                        core,
                        &entity.id,
                        self.candidate.generation,
                        &request,
                        budget,
                    )?,
                    None => false,
                };
                self.blocked = !ready;
            }
            self.next += 1;
        } else if self.question.is_some() {
            return Ok(NavigationGateStep::Geometry(
                self.question().ok_or(ExecutionError::Invariant)?,
            ));
        }
        if self.blocked || self.next == self.proposals.len() {
            self.done = true;
            return Ok(NavigationGateStep::Complete(self.blocked));
        }
        let entity = core
            .state
            .physical
            .entities
            .resolve(self.proposals[self.next])
            .ok_or(ExecutionError::Invariant)?;
        let proposal = entity
            .animal
            .as_ref()
            .and_then(|animal| animal.episode.as_ref())
            .and_then(|episode| episode.proposal.as_ref())
            .ok_or(ExecutionError::Invariant)?;
        let destination = &proposal.candidates[0].point;
        let reservation = budget.reserve(
            heap_sum([
                size_of::<GeometryQueries>() + size_of::<RouteQuery>(),
                proposal
                    .origin
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?,
                destination.heap_bytes().ok_or(ExecutionError::Capacity)?,
                entity.ordinary_body_profile().id.len(),
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let route = RouteQuery::Surface {
            from: proposal.origin.clone(),
            to: destination.clone(),
            body: entity.body_profile().into_owned(),
        };
        let mut question = GeometryQueries::new(GeometryBinding::new(
            self.candidate,
            core.state.installed.geometry.spatial.revision,
            core.journal.next_provider_serial()?,
        ));
        question.routes = vec![route];
        self.question = Some((question, reservation));
        Ok(NavigationGateStep::Geometry(
            self.question().ok_or(ExecutionError::Invariant)?,
        ))
    }
}
