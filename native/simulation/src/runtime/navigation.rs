//! Saved entity-local routes use the real immutable physical provider outside
//! the mutation lane. Only exact proposal/body/life/geometry matches reach the
//! existing controller; preparing an answer never advances time or randomness.
use super::*;
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries, RoutePlan, RouteQuery};
use crate::native_refuge::navigation::{ProposalBinding, binding};
use crate::native_refuge::{PendingRefugeNavigation, PreparedRefugeNavigation};
use crate::time::{PendingActionNavigation, PreparedActionNavigation};
use std::mem::size_of;

const MAXIMUM_PREPARED: usize = 64;
struct PreparedEntry {
    actor: String,
    answer: PreparedNavigation,
    _custody: ByteReservation,
}
enum PreparedNavigation {
    Action(PreparedActionNavigation),
    Refuge(PreparedRefugeNavigation),
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
        let mut refuge = self
            .entries
            .iter()
            .filter(|entry| matches!(entry.answer, PreparedNavigation::Refuge(_)));
        let count = refuge.clone().count();
        let bytes = count * size_of::<(String, PreparedRefugeNavigation)>();
        // AdvanceCursor admits its own transferred collection before this
        // preparation owner is dropped. Keep actor strings funded across it.
        let actors = refuge
            .try_fold(bytes, |n, entry| n.checked_add(entry.actor.capacity()))
            .ok_or_else(|| failure("capacity"))?;
        let custody = budget.reserve(actors).map_err(failure)?;
        let mut answers = Vec::with_capacity(count);
        for entry in self.entries.extract_if(.., |entry| {
            matches!(entry.answer, PreparedNavigation::Refuge(_))
        }) {
            if let PreparedNavigation::Refuge(answer) = entry.answer {
                answers.push((entry.actor, answer));
            }
        }
        Ok((answers, custody))
    }

    pub(super) fn action_answers(&self) -> impl Iterator<Item = (&str, &PreparedActionNavigation)> {
        self.entries.iter().filter_map(|entry| match &entry.answer {
            PreparedNavigation::Action(answer) => Some((entry.actor.as_str(), answer)),
            PreparedNavigation::Refuge(_) => None,
        })
    }

    /// Admit only the borrowed input slots. Answer bodies remain with the
    /// independent preparation until the candidate has accepted the routes.
    pub(super) fn prepare_actions(
        &self,
        budget: &ByteBudget,
    ) -> Result<(Vec<(&str, &PreparedActionNavigation)>, ByteReservation), RuntimeError> {
        let count = self.action_answers().count();
        let custody = budget
            .reserve(count * size_of::<(&str, &PreparedActionNavigation)>())
            .map_err(failure)?;
        let mut answers = Vec::with_capacity(count);
        answers.extend(self.action_answers());
        // Independent route replies cannot choose the writer's change order.
        answers.sort_unstable_by(|(left, _), (right, _)| left.cmp(right));
        Ok((answers, custody))
    }

    pub(super) fn prune_actions(
        &mut self,
        physical: &crate::simulation::PhysicalState,
        generation: u64,
    ) {
        self.entries.retain(|entry| match &entry.answer {
            PreparedNavigation::Action(answer) => {
                answer.still_pending(physical, &entry.actor, generation)
            }
            PreparedNavigation::Refuge(_) => true,
        });
    }

    fn store(
        &mut self,
        actor: &str,
        answer: PreparedNavigation,
        budget: &ByteBudget,
    ) -> Result<(), RuntimeError> {
        let existing = self.entries.iter().position(|entry| {
            entry.actor == actor
                && std::mem::discriminant(&entry.answer) == std::mem::discriminant(&answer)
        });
        let custody = budget
            .reserve(size_of::<PreparedEntry>() + actor.len())
            .map_err(failure)?;
        let entry = PreparedEntry {
            actor: actor.into(),
            answer,
            _custody: custody,
        };
        if let Some(at) = existing {
            self.entries[at] = entry;
        } else {
            // Eviction discards derived work, never a saved request or authority.
            if self.entries.len() == MAXIMUM_PREPARED {
                self.entries.remove(0);
            }
            self.entries.push(entry);
        }
        Ok(())
    }
}
enum NavigationPhase {
    Action(PendingActionNavigation),
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
        RuntimeJson::encode(self.queries()?, budget)
    }

    /// The read keeps the exact route request and current-source binding alive.
    pub fn queries(&self) -> Result<&GeometryQueries, RuntimeError> {
        match &self.phase {
            NavigationPhase::Action(value) => Ok(&value.queries),
            NavigationPhase::Direct { queries, .. } => Ok(queries),
            NavigationPhase::Pending(value) => Ok(value.queries()),
            NavigationPhase::Done => Err(failure("navigation preparation was consumed")),
        }
    }
}
impl NativeWorldSession {
    /// Read a real deferred route without transferring the body's other
    /// state. Ordinary advances already carry new entity-local offers. Walk
    /// the accepted action membership only when a held world route blocked
    /// elapsed time.
    pub fn read_deferred_navigation(
        &mut self,
        include_world: bool,
    ) -> Result<Option<RuntimeNavigationRead>, RuntimeError> {
        self.require_active()?;
        let (actors, _custody) = {
            let state = &self.session.accepted().map_err(failure)?.state;
            let mut custody = self.budget.reserve(0)?;
            let mut actors = Vec::new();
            let mut add = |id: &str| -> Result<(), RuntimeError> {
                let bytes = size_of::<String>()
                    .checked_mul(4)
                    .and_then(|bytes| bytes.checked_add(id.len()))
                    .and_then(|bytes| bytes.checked_add(custody.bytes()))
                    .ok_or_else(|| failure("capacity"))?;
                custody.resize(bytes)?;
                actors.push(id.to_owned());
                Ok(())
            };
            if include_world {
                let revision = state.installed.geometry.spatial.revision;
                let now = state.physical.header.sim_time;
                for id in state.physical.entities.ordered_ids() {
                    let entity = state
                        .physical
                        .entities
                        .get(id)
                        .ok_or_else(|| failure("missing navigation body"))?;
                    if crate::time::action_navigation_pending(entity, now, revision, &self.budget)
                        .map_err(failure)?
                    {
                        add(id)?;
                    }
                }
            }
            if let Some((pending, _)) = &self.pending_navigation {
                for (handle, _) in pending {
                    if let Some(entity) = state.physical.entities.resolve(*handle) {
                        add(&entity.id)?;
                    }
                }
            }
            (actors, custody)
        };
        for actor in actors {
            if let Some(read) = self.read_navigation(&actor)? {
                return Ok(Some(read));
            }
        }
        Ok(None)
    }

    pub fn read_navigation(
        &mut self,
        actor: &str,
    ) -> Result<Option<RuntimeNavigationRead>, RuntimeError> {
        self.require_active()?;
        let state = &self.session.accepted().map_err(failure)?.state;
        let generation = self.session.operational_generation();
        let revision = state.installed.geometry.spatial.revision;
        self.navigation.prune_actions(&state.physical, generation);
        let serial = self
            .next_read_serial
            .checked_add(1)
            .filter(|s| *s <= crate::identity::MAX_SAFE_INTEGER)
            .ok_or_else(|| failure("read identity exhausted"))?;
        let key = CandidateKey {
            id: serial,
            base_cut: state.accepted_cut,
            generation,
        };
        let request = GeometryBinding::new(key, revision, serial);
        if !self
            .navigation
            .action_answers()
            .any(|(candidate, _)| candidate == actor)
            && let Some(pending) =
                PendingActionNavigation::capture(&state.physical, actor, request, &self.budget)
                    .map_err(failure)?
        {
            let custody = self
                .budget
                .reserve(size_of::<RuntimeNavigationRead>() + actor.len())
                .map_err(failure)?;
            self.next_read_serial = serial;
            return Ok(Some(RuntimeNavigationRead {
                actor: actor.into(),
                phase: NavigationPhase::Action(pending),
                _custody: custody,
            }));
        }
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
        if let Some(prepared) =
            self.navigation
                .entries
                .iter()
                .find_map(|entry| match &entry.answer {
                    PreparedNavigation::Refuge(answer) if entry.actor == actor => Some(answer),
                    _ => None,
                })
        {
            if prepared
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
        let mut queries = GeometryQueries::new(request);
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
        self.apply_navigation(read, answer)
    }

    /// Consume the independent physical provider's owned answer under its
    /// original query and accepted-state fence.
    pub fn resolve_navigation_direct(
        &mut self,
        read: &mut RuntimeNavigationRead,
        answer: GeometryAnswers,
        custody: ByteReservation,
    ) -> Result<bool, RuntimeError> {
        self.require_active()?;
        if !self.budget.owns(&custody) {
            return Err(failure(
                "navigation answer belongs to another native budget",
            ));
        }
        let result = self.apply_navigation(read, answer);
        drop(custody);
        result
    }

    fn apply_navigation(
        &mut self,
        read: &mut RuntimeNavigationRead,
        answer: GeometryAnswers,
    ) -> Result<bool, RuntimeError> {
        let state = &self.session.accepted().map_err(failure)?.state;
        if let NavigationPhase::Action(pending) = &read.phase {
            pending.queries.validate_answers(&answer).map_err(failure)?;
            let current = pending
                .is_current(
                    &state.physical,
                    &read.actor,
                    self.session.operational_generation(),
                    state.installed.geometry.spatial.revision,
                    &self.budget,
                )
                .map_err(failure)?;
            let NavigationPhase::Action(pending) =
                std::mem::replace(&mut read.phase, NavigationPhase::Done)
            else {
                unreachable!()
            };
            if current {
                let result = answer
                    .navigation
                    .into_iter()
                    .next()
                    .ok_or_else(|| failure("missing action route answer"))?;
                let prepared = pending.finish(result, &self.budget).map_err(failure)?;
                self.navigation.store(
                    &read.actor,
                    PreparedNavigation::Action(prepared),
                    &self.budget,
                )?;
            }
            return Ok(false);
        }
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
            NavigationPhase::Action(_) => unreachable!(),
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
                self.navigation.store(
                    &read.actor,
                    PreparedNavigation::Refuge(prepared),
                    &self.budget,
                )?;
                Ok(false)
            }
            NavigationPhase::Action(_) | NavigationPhase::Done => unreachable!(),
        }
    }
}
