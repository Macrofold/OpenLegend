//! A saved movement request can use the detached physical worker without
//! holding the world writer. Only the current action may consume the result.
//! See docs/architecture.md#navigation-preparation.

use super::current_action_navigation;
use crate::execution::{ActionRouteWrite, CoreMutation, ExecutionError};
use crate::geometry::{
    GeometryAnswers, GeometryBinding, GeometryQueries, NavigationAnswer, NavigationResult,
};
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation};
use crate::simulation::PhysicalState;
use crate::state::{Action, FundedActionRoute, NavigationPending, NavigationRequest};
use std::mem::size_of;

struct ActionNavSource {
    world: String,
    action: String,
    life: u64,
    binding: GeometryBinding,
}

impl ActionNavSource {
    fn current<'a>(
        &self,
        physical: &'a PhysicalState,
        actor: &str,
        binding_generation: u64,
        revision: u64,
        request: &NavigationRequest,
        budget: &ByteBudget,
    ) -> Result<Option<&'a Action>, ExecutionError> {
        if self.world != physical.header.id || self.binding.generation != binding_generation {
            return Ok(None);
        }
        let Some(entity) = physical.entities.get(actor) else {
            return Ok(None);
        };
        if entity.physical_life() != Some(self.life) {
            return Ok(None);
        }
        Ok(
            current_action_navigation(entity, physical.header.sim_time, revision, budget)?
                .filter(|(action, current)| action.id == self.action && *current == request)
                .map(|(action, _)| action),
        )
    }
}

pub(crate) struct PendingActionNavigation {
    source: ActionNavSource,
    pub(crate) queries: GeometryQueries,
    custody: ByteReservation,
}

impl PendingActionNavigation {
    pub(crate) fn capture(
        physical: &PhysicalState,
        actor: &str,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, ExecutionError> {
        let Some(entity) = physical.entities.get(actor) else {
            return Ok(None);
        };
        let Some((action, request)) = current_action_navigation(
            entity,
            physical.header.sim_time,
            binding.geometry_revision,
            budget,
        )?
        else {
            return Ok(None);
        };
        let life = entity.physical_life().ok_or(ExecutionError::MissingActor)?;
        let custody = budget.reserve(
            heap_sum([
                size_of::<Self>() + size_of::<NavigationRequest>(),
                physical.header.id.len(),
                action.id.len(),
                request.heap_bytes().ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut queries = GeometryQueries::new(binding);
        queries.navigation = vec![request.clone()];
        Ok(Some(Self {
            source: ActionNavSource {
                world: physical.header.id.clone(),
                action: action.id.clone(),
                life,
                binding,
            },
            queries,
            custody,
        }))
    }

    pub(crate) fn is_current(
        &self,
        physical: &PhysicalState,
        actor: &str,
        generation: u64,
        revision: u64,
        budget: &ByteBudget,
    ) -> Result<bool, ExecutionError> {
        let request = self
            .queries
            .navigation
            .first()
            .ok_or(ExecutionError::Invariant)?;
        Ok(self
            .source
            .current(physical, actor, generation, revision, request, budget)?
            .is_some())
    }

    /// The caller still owns the provider's returned buffers. Admit the kept
    /// route or failure before moving it out of that answer.
    pub(crate) fn finish(
        mut self,
        answer: NavigationAnswer,
        budget: &ByteBudget,
    ) -> Result<PreparedActionNavigation, ExecutionError> {
        let result = match (answer.problem, answer.result) {
            (Some(failure), _) if !failure.is_empty() => ActionNavResult::Blocked(failure),
            (None, NavigationResult::Reached { path, .. }) => ActionNavResult::Ready(path),
            _ => return Err(ExecutionError::Invariant),
        };
        let request = self
            .queries
            .navigation
            .pop()
            .ok_or(ExecutionError::Invariant)?;
        drop(self.queries);
        let body = match &result {
            ActionNavResult::Ready(path) => path.heap_bytes(),
            ActionNavResult::Blocked(failure) => failure.heap_bytes(),
        }
        .ok_or(ExecutionError::Capacity)?;
        let _answer_custody = budget.reserve(body)?;
        self.custody.resize(
            heap_sum([
                size_of::<PreparedActionNavigation>(),
                self.source.world.capacity(),
                self.source.action.capacity(),
                request.heap_bytes().ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(PreparedActionNavigation {
            source: self.source,
            request,
            result,
            _request_custody: self.custody,
            _answer_custody,
        })
    }
}

enum ActionNavResult {
    Ready(Vec<crate::state::SurfacePoint>),
    Blocked(String),
}

pub(crate) struct PreparedActionNavigation {
    source: ActionNavSource,
    request: NavigationRequest,
    result: ActionNavResult,
    _request_custody: ByteReservation,
    _answer_custody: ByteReservation,
}

impl PreparedActionNavigation {
    /// A completed, replaced or moved action no longer owns this detached result.
    pub(crate) fn still_pending(
        &self,
        physical: &PhysicalState,
        actor: &str,
        generation: u64,
    ) -> bool {
        self.source.world == physical.header.id
            && self.source.binding.generation == generation
            && physical.entities.get(actor).is_some_and(|entity| {
                entity.physical_life() == Some(self.source.life)
                    && entity
                        .actor
                        .as_ref()
                        .and_then(|actor| actor.action.as_ref())
                        .is_some_and(|action| {
                            action.id == self.source.action
                                && action.navigation.as_ref().is_some_and(|pending| {
                                    pending.failure.is_none() && pending.request == self.request
                                })
                        })
            })
    }

    /// The detached answer stays independently funded for exact retry if the
    /// temporal candidate later rolls back. Its canonical path owns a copy.
    pub(crate) fn apply(
        &self,
        core: &mut CoreMutation<'_>,
        actor: &str,
        generation: u64,
        budget: &ByteBudget,
    ) -> Result<bool, ExecutionError> {
        let Some(action) = self.source.current(
            &core.state.physical,
            actor,
            generation,
            core.state.geometry_revision(),
            &self.request,
            budget,
        )?
        else {
            return Ok(false);
        };
        let (path, failure) = match &self.result {
            ActionNavResult::Ready(path) => (path, None),
            ActionNavResult::Blocked(failure) => (&action.path, Some(failure)),
        };
        let custody = budget.reserve(
            heap_sum([
                action.stage.len(),
                path.heap_bytes().ok_or(ExecutionError::Capacity)?,
                match failure {
                    Some(failure) => heap_sum([
                        failure.len(),
                        self.request.heap_bytes().ok_or(ExecutionError::Capacity)?,
                    ])
                    .ok_or(ExecutionError::Capacity)?,
                    None => 0,
                },
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let route = FundedActionRoute::from_storage(
            ActionRouteWrite {
                path: path.clone(),
                navigation: failure.map(|failure| NavigationPending {
                    request: self.request.clone(),
                    failure: Some(failure.clone()),
                }),
                stage: action.stage.clone(),
                replans: action.replans,
            },
            custody,
            budget,
        )?;
        core.physical()
            .replace_action_route(actor, &self.source.action, route)?;
        Ok(true)
    }
}
