//! Navigation can finish after unrelated actors advance. Its authority is the
//! exact saved proposal/body/geometry and runtime generation, never a whole-world
//! cut. A provider answer remains preparation until current route scoring.
use crate::encoding::{json_record, json_record_len};
use crate::execution::{CoreMutation, ExecutionError};
use crate::geometry::{
    GeometryAnswers, GeometryBinding, GeometryQueries, NavigationAnswer, NavigationResult,
};
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation, CandidateKey};
use crate::native_response::NavigationWait;
use crate::state::NavigationRequest;
use std::mem::size_of;

struct ProposalBinding {
    key: String,
    _reservation: ByteReservation,
}
fn binding(
    core: &CoreMutation<'_>,
    actor: &str,
    generation: u64,
    budget: &ByteBudget,
) -> Result<ProposalBinding, ExecutionError> {
    let entity = core
        .state
        .physical
        .entities
        .get(actor)
        .ok_or(ExecutionError::MissingActor)?;
    let animal = entity
        .animal
        .as_ref()
        .ok_or(ExecutionError::UnsupportedFamily)?;
    let episode = animal.episode.as_ref().ok_or(ExecutionError::Invariant)?;
    let proposal = episode.proposal.as_ref().ok_or(ExecutionError::Invariant)?;
    let _body = budget.reserve(
        size_of::<crate::state::BodyProfile>() + entity.ordinary_body_profile().id.len(),
    )?;
    let body = entity.body_profile();
    let scope = (
        generation,
        &core.state.physical.header.id,
        &entity.id,
        animal.physical_life,
        &episode.id,
        &episode.profile_pin,
        &episode.locomotion,
        body.as_ref(),
        proposal,
    );
    let bytes = json_record_len(&scope).map_err(|_| ExecutionError::Invariant)?;
    let reservation = budget.reserve(
        bytes
            .checked_mul(2)
            .and_then(|bytes| bytes.checked_add(size_of::<ProposalBinding>()))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let key = json_record(&scope).map_err(|_| ExecutionError::Invariant)?;
    Ok(ProposalBinding {
        key,
        _reservation: reservation,
    })
}
pub(crate) struct PendingRefugeNavigation {
    binding: ProposalBinding,
    queries: GeometryQueries,
    _reservation: ByteReservation,
}
pub(crate) struct PreparedRefugeNavigation {
    binding: ProposalBinding,
    request: NavigationRequest,
    answer: NavigationAnswer,
    _request_reservation: ByteReservation,
    _reservation: ByteReservation,
}
impl PendingRefugeNavigation {
    pub(crate) fn prepare(
        core: &mut CoreMutation<'_>,
        actor: &str,
        mut request: NavigationRequest,
        candidate: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let scope = binding(core, actor, candidate.generation, budget)?;
        let proposal = core
            .state
            .physical
            .entities
            .get(actor)
            .and_then(|entity| entity.animal.as_ref())
            .and_then(|animal| animal.episode.as_ref())
            .and_then(|episode| episode.proposal.as_ref())
            .ok_or(ExecutionError::Invariant)?;
        let wait = match proposal.wait.ok_or(ExecutionError::Invariant)? {
            NavigationWait::Entity => "entity",
            NavigationWait::World => "world",
        };
        let bytes = heap_sum([
            size_of::<Self>(),
            size_of::<NavigationRequest>(),
            request.from.heap_bytes().ok_or(ExecutionError::Capacity)?,
            request
                .destinations
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?,
            request.body.id.capacity(),
            wait.len(),
        ])
        .ok_or(ExecutionError::Capacity)?;
        let reservation = budget.reserve(bytes)?;
        request.wait = Some(wait.into());
        let binding = GeometryBinding::new(
            candidate,
            core.state.installed.geometry.spatial.revision,
            core.journal.next_provider_serial()?,
        );
        let mut queries = GeometryQueries::new(binding);
        queries.navigation = vec![request];
        Ok(Self {
            binding: scope,
            queries,
            _reservation: reservation,
        })
    }
    pub(crate) fn queries(&self) -> &GeometryQueries {
        &self.queries
    }
    /// The host keeps this exact finite request across admission/dispatch. Only
    /// its actual bound provider product can become a prepared answer.
    pub(crate) fn finish(
        mut self,
        mut answers: GeometryAnswers,
        budget: &ByteBudget,
    ) -> Result<PreparedRefugeNavigation, ExecutionError> {
        self.queries
            .validate_answers(&answers)
            .map_err(|_| ExecutionError::Invariant)?;
        let answer = answers.navigation.pop().ok_or(ExecutionError::Invariant)?;
        let request = self
            .queries
            .navigation
            .pop()
            .ok_or(ExecutionError::Invariant)?;
        self._reservation.resize(
            heap_sum([
                size_of::<NavigationRequest>(),
                request.from.heap_bytes().ok_or(ExecutionError::Capacity)?,
                request
                    .destinations
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?,
                request.body.id.capacity(),
                request.wait.heap_bytes().ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let bytes = match &answer.result {
            NavigationResult::Reached { path, .. } => path.heap_bytes(),
            NavigationResult::NoRoute { reason, .. }
            | NavigationResult::InvalidEndpoint { reason, .. }
            | NavigationResult::BudgetExceeded { reason, .. }
            | NavigationResult::UnsafeRoute { reason, .. }
            | NavigationResult::Unavailable { reason, .. } => reason.heap_bytes(),
        }
        .ok_or(ExecutionError::Capacity)?;
        let reservation = budget.reserve(
            heap_sum([
                size_of::<PreparedRefugeNavigation>(),
                bytes,
                answer
                    .problem
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(PreparedRefugeNavigation {
            binding: self.binding,
            request,
            answer,
            _request_reservation: self._reservation,
            _reservation: reservation,
        })
    }
}
impl PreparedRefugeNavigation {
    pub(crate) fn matches(
        &self,
        core: &CoreMutation<'_>,
        actor: &str,
        generation: u64,
        request: &NavigationRequest,
        budget: &ByteBudget,
    ) -> Result<bool, ExecutionError> {
        if !crate::native_controller::proposal_current(
            &core.state.physical,
            &core.state.installed,
            actor,
        )? {
            return Ok(false);
        }
        let current = binding(core, actor, generation, budget)?;
        // Source overlays the saved wait mode on the direct route request.
        // The proposal binding already checks that mode; compare every other
        // request field so equal proposals cannot bless a different corridor.
        Ok(current.key == self.binding.key
            && request.from == self.request.from
            && request.destinations == self.request.destinations
            && request.outside_bounds == self.request.outside_bounds
            && request.body == self.request.body
            && request.geometry_revision == self.request.geometry_revision)
    }
    pub(crate) fn into_current_answer(
        self,
        core: &CoreMutation<'_>,
        actor: &str,
        generation: u64,
        request: &NavigationRequest,
        budget: &ByteBudget,
    ) -> Result<Option<(NavigationAnswer, ByteReservation)>, ExecutionError> {
        if !self.matches(core, actor, generation, request, budget)? {
            return Ok(None);
        }
        // The returned answer's allocation custody must survive its prepared
        // owner. Move the guard with it rather than returning an unfunded path.
        Ok(Some((self.answer, self._reservation)))
    }
}
