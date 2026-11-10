//! Saved entity-local routes use the real immutable physical provider outside
//! the mutation lane. Only exact proposal/body/life/geometry matches reach the
//! existing controller; preparing an answer never advances time or randomness.
use super::*;
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries, RoutePlan, RouteQuery};
use crate::native_refuge::navigation::{ProposalBinding, binding};
use crate::native_refuge::{PendingRefugeNavigation, PreparedRefugeNavigation};
use std::mem::size_of;

const MAXIMUM_PREPARED: usize = 64;
struct PreparedEntry {
    actor: String,
    answer: PreparedRefugeNavigation,
    _custody: ByteReservation,
}
pub(super) struct PreparedNavigationCache {
    entries: Vec<PreparedEntry>,
    _custody: ByteReservation,
}
impl PreparedNavigationCache {
    pub(super) fn new(budget: &ByteBudget) -> Result<Self, RuntimeError> {
        let custody = budget
            .reserve(MAXIMUM_PREPARED * size_of::<PreparedEntry>())
            .map_err(failure)?;
        Ok(Self {
            entries: Vec::with_capacity(MAXIMUM_PREPARED),
            _custody: custody,
        })
    }
    pub(super) fn take(
        &mut self,
        budget: &ByteBudget,
    ) -> Result<(Vec<(String, PreparedRefugeNavigation)>, ByteReservation), RuntimeError> {
        let bytes = self.entries.len() * size_of::<(String, PreparedRefugeNavigation)>();
        // AdvanceCursor admits its own transferred collection before this
        // preparation owner is dropped. Keep actor strings funded across it.
        let actors = self
            .entries
            .iter()
            .try_fold(bytes, |n, entry| n.checked_add(entry.actor.capacity()))
            .ok_or_else(|| failure("capacity"))?;
        let custody = budget.reserve(actors).map_err(failure)?;
        let mut answers = Vec::with_capacity(self.entries.len());
        for entry in self.entries.drain(..) {
            answers.push((entry.actor, entry.answer));
        }
        Ok((answers, custody))
    }
}
enum NavigationPhase {
    Direct {
        scope: ProposalBinding,
        queries: GeometryQueries,
        _custody: ByteReservation,
    },
    Pending(PendingRefugeNavigation),
    Done,
}
pub struct RuntimeNavigationRead {
    actor: String,
    phase: NavigationPhase,
    _custody: ByteReservation,
}
impl RuntimeNavigationRead {
    pub fn packet(&self, budget: &ByteBudget) -> Result<RuntimeJson, RuntimeError> {
        let queries = match &self.phase {
            NavigationPhase::Direct { queries, .. } => queries,
            NavigationPhase::Pending(value) => value.queries(),
            NavigationPhase::Done => return Err(failure("navigation preparation was consumed")),
        };
        RuntimeJson::encode(queries, budget)
    }
}
impl NativeWorldSession {
    pub fn read_navigation(
        &mut self,
        actor: &str,
    ) -> Result<Option<RuntimeNavigationRead>, RuntimeError> {
        self.require_active()?;
        let state = &self.session.accepted().map_err(failure)?.state;
        if !crate::native_controller::proposal_current(&state.physical, &state.installed, actor)
            .map_err(failure)?
        {
            return Ok(None);
        }
        let entity = state
            .physical
            .entities
            .get(actor)
            .ok_or_else(|| failure("missing navigation actor"))?;
        let proposal = entity
            .animal
            .as_ref()
            .and_then(|a| a.episode.as_ref())
            .and_then(|e| e.proposal.as_ref())
            .ok_or_else(|| failure("missing proposal"))?;
        if proposal.wait != Some(crate::native_response::NavigationWait::Entity) {
            return Ok(None);
        }
        let generation = self.session.operational_generation();
        if let Some(prepared) = self
            .navigation
            .entries
            .iter()
            .find(|entry| entry.actor == actor)
        {
            if prepared
                .answer
                .is_current(&state.physical, actor, generation, &self.budget)
                .map_err(failure)?
            {
                return Ok(None);
            }
        }
        let Some(candidate) = proposal.candidates.first() else {
            return Ok(None);
        };
        let custody = self
            .budget
            .reserve(size_of::<RuntimeNavigationRead>() + actor.len())
            .map_err(failure)?;
        if let Some((pending, _)) = self.pending_navigation.as_mut() {
            if let Some(at) = pending.iter().rposition(|(handle, value)| {
                state
                    .physical
                    .entities
                    .resolve(*handle)
                    .is_some_and(|entity| entity.id == actor)
                    && value
                        .queries()
                        .navigation
                        .first()
                        .is_some_and(|request| request.wait.as_deref() == Some("entity"))
            }) {
                if pending[at]
                    .1
                    .is_current(&state.physical, actor, generation, &self.budget)
                    .map_err(failure)?
                {
                    let (_, pending) = pending.swap_remove(at);
                    return Ok(Some(RuntimeNavigationRead {
                        actor: actor.into(),
                        phase: NavigationPhase::Pending(pending),
                        _custody: custody,
                    }));
                }
            }
        }
        let query_custody = self
            .budget
            .reserve(
                size_of::<GeometryQueries>()
                    + size_of::<RouteQuery>()
                    + proposal.origin.surface_id.len()
                    + candidate.point.surface_id.len()
                    + entity.ordinary_body_profile().id.len(),
            )
            .map_err(failure)?;
        let serial = self
            .next_read_serial
            .checked_add(1)
            .filter(|s| *s <= crate::identity::MAX_SAFE_INTEGER)
            .ok_or_else(|| failure("read identity exhausted"))?;
        let key = CandidateKey {
            id: serial,
            base_cut: state.accepted_cut,
            generation: self.session.operational_generation(),
        };
        let mut queries = GeometryQueries::new(GeometryBinding::new(
            key,
            state.installed.geometry.spatial.revision,
            serial,
        ));
        queries.routes = vec![RouteQuery::Surface {
            from: proposal.origin.clone(),
            to: candidate.point.clone(),
            body: entity.body_profile().into_owned(),
        }];
        let scope =
            binding(&state.physical, actor, key.generation, &self.budget).map_err(failure)?;
        self.next_read_serial = serial;
        Ok(Some(RuntimeNavigationRead {
            actor: actor.into(),
            phase: NavigationPhase::Direct {
                scope,
                queries,
                _custody: query_custody,
            },
            _custody: custody,
        }))
    }
    /// True requests a second finite physical phase; false consumes the read.
    pub fn resolve_navigation(
        &mut self,
        read: &mut RuntimeNavigationRead,
        input: &[u8],
    ) -> Result<bool, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let answer: GeometryAnswers = serde_json::from_slice(input).map_err(failure)?;
        let state = &self.session.accepted().map_err(failure)?.state;
        let current = crate::native_controller::proposal_current(
            &state.physical,
            &state.installed,
            &read.actor,
        )
        .map_err(failure)?;
        match &read.phase {
            NavigationPhase::Direct { scope, queries, .. } => {
                queries.validate_answers(&answer).map_err(failure)?;
                if !current
                    || binding(
                        &state.physical,
                        &read.actor,
                        self.session.operational_generation(),
                        &self.budget,
                    )
                    .map_err(failure)?
                    .key != scope.key
                {
                    read.phase = NavigationPhase::Done;
                    return Ok(false);
                }
            }
            NavigationPhase::Pending(value) => {
                value.queries().validate_answers(&answer).map_err(failure)?;
                if !current
                    || !value
                        .is_current(
                            &state.physical,
                            &read.actor,
                            self.session.operational_generation(),
                            &self.budget,
                        )
                        .map_err(failure)?
                {
                    read.phase = NavigationPhase::Done;
                    return Ok(false);
                }
            }
            NavigationPhase::Done => return Err(failure("navigation preparation was consumed")),
        }
        match std::mem::replace(&mut read.phase, NavigationPhase::Done) {
            NavigationPhase::Direct { scope, queries, .. } => {
                let mut routes = answer.routes;
                if let Some(RoutePlan::Pending { request, .. }) = routes.pop() {
                    read.phase = NavigationPhase::Pending(
                        PendingRefugeNavigation::from_request(
                            scope,
                            request,
                            "entity",
                            queries.binding,
                            &self.budget,
                        )
                        .map_err(failure)?,
                    );
                    Ok(true)
                } else {
                    Ok(false)
                }
            }
            NavigationPhase::Pending(pending) => {
                let prepared = pending.finish(answer, &self.budget).map_err(failure)?;
                if !current {
                    return Ok(false);
                }
                let existing = self
                    .navigation
                    .entries
                    .iter()
                    .position(|entry| entry.actor == read.actor);
                let custody = self
                    .budget
                    .reserve(size_of::<PreparedEntry>() + read.actor.len())
                    .map_err(failure)?;
                let entry = PreparedEntry {
                    actor: read.actor.clone(),
                    answer: prepared,
                    _custody: custody,
                };
                if let Some(at) = existing {
                    self.navigation.entries[at] = entry;
                } else {
                    // Source retains at most 64 prepared animal replies. An
                    // evicted reply is derived work, never saved authority.
                    if self.navigation.entries.len() == MAXIMUM_PREPARED {
                        self.navigation.entries.remove(0);
                    }
                    self.navigation.entries.push(entry);
                }
                Ok(false)
            }
            NavigationPhase::Done => unreachable!(),
        }
    }
}
