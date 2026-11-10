//! Detached NPC first-person facts retain their actual native evidence owner.
//! Reading these facts grants neither an executable response nor a current
//! source lease; the context producer must bind those independently.
use super::*;
use crate::appraisals::AppraisalScope;
use crate::host::PublicationLease;
use crate::simulation::AcceptedActorRead;
use std::mem::size_of;

mod bindings;
mod perspectives;
pub(super) use bindings::ActiveNpcResponse;
pub use bindings::RuntimeNpcResponseTicket;

/// A brief dispatch gate, never retained while SQL or a provider is awaited.
/// Historical disclosure and current response semantics are separate routes.
pub struct RuntimeNpcPublication {
    _lease: PublicationLease,
}

pub struct RuntimeNpcRead {
    pub(super) read: Arc<AcceptedActorRead>,
    pub(super) serial: u64,
    history: crate::experience::CapturedHistoryCuts,
    pub(super) historical_scope: Arc<crate::capture::NpcHistoricalScope>,
    reference_facts: crate::capture::NpcReferenceFacts,
    candidates: Option<crate::capture::PreparedNpcCandidates>,
    intent_ids: Vec<String>,
    pub(super) work_generation: u64,
    sources: Arc<Vec<crate::capture::PreparedNpcSources>>,
    perspectives: Arc<Vec<crate::capture::NpcPerspectiveSnapshot>>,
    candidate_key: Option<CandidateKey>,
    query_expanded: bool,
    _custody: Arc<ByteReservation>,
}
pub enum RuntimeNpcPreparationStep {
    Continue,
    Provider(RuntimeProvider),
    Complete,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CandidateRequest {
    expanded_body_ordinals: Vec<usize>,
    coverage: crate::capture::NpcOfferCoverage,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct NpcReadRequest {
    actor_id: String,
    consumer: String,
    required_appraisals: Vec<AppraisalScope>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct NpcPublicationRequest {
    consumer: String,
    perspectives: Vec<crate::capture::NpcPerspectiveOrdinal>,
}

/// The installed capability owner supplies the current body predicates. Job
/// purpose is trusted server admission, never a model-selected permission.
fn npc_consumer_current(
    state: &crate::simulation::SimulationState,
    actor_id: &str,
    consumer: &str,
    response_id: Option<&str>,
) -> Result<bool, crate::execution::ExecutionError> {
    use crate::execution::ExecutionError;
    let Some(entity) = state.physical.entities.get(actor_id) else {
        return Ok(false);
    };
    let Some(actor) = entity.actor.as_ref() else {
        return Ok(false);
    };
    if !entity.has_memory() || actor.controller != "npc" {
        return Ok(false);
    }
    match consumer {
        "inspection" | "reflection" => Ok(true),
        "chat" => {
            if !actor.alive {
                return Ok(false);
            }
            // Source's pending-reply watch stops incapacity or simultaneous
            // action/speech blocking. A reply may itself install that state;
            // its genuine committed receipt ends this pending-work check.
            if response_id.is_some_and(|id| state.responses.get(id).is_some()) {
                return Ok(true);
            }
            Ok(!actor.incapacitated
                && !(state
                    .installed
                    .capabilities
                    .capability_blocked(Some(entity), "speech")?
                    && state
                        .installed
                        .capabilities
                        .capability_blocked(Some(entity), "actions")?))
        }
        "thought" => {
            // nativeProtectionReason is present exactly when actions are
            // blocked (its empty-label branch still supplies a reason).
            Ok(actor.alive
                && !actor.incapacitated
                && actor
                    .capabilities
                    .as_ref()
                    .is_none_or(|capabilities| capabilities.cognition)
                && !state
                    .installed
                    .capabilities
                    .capability_blocked(Some(entity), "actions")?)
        }
        _ => Err(ExecutionError::InvalidCheckpoint),
    }
}

impl NativeWorldSession {
    /// One query continuation moves the actual read owners back to preparation.
    /// Serialized context can neither recreate a read nor replace its old cut.
    pub fn open_npc_response(
        &self,
        ticket: &mut Option<RuntimeNpcResponseTicket>,
    ) -> Result<(RuntimeNpcRead, RuntimeNpcRead), RuntimeError> {
        self.require_active()?;
        let checked = ticket
            .as_ref()
            .ok_or_else(|| failure("NPC response was released"))?;
        checked.require_prepared()?;
        if checked.original.query_expanded
            || checked.original.candidate_key.is_some()
            || checked.current.candidate_key.is_some()
        {
            return Err(failure(
                "NPC situation query was already expanded or is busy",
            ));
        }
        let mut owned = ticket
            .take()
            .ok_or_else(|| failure("NPC response was released"))?;
        owned.original.query_expanded = true;
        Ok((owned.original, owned.current))
    }

    pub fn npc_history_publication(
        &self,
        read: &RuntimeNpcRead,
        input: &[u8],
    ) -> Result<Option<RuntimeNpcPublication>, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let request: NpcPublicationRequest = serde_json::from_slice(input).map_err(failure)?;
        let simulation = self.session.accepted().map_err(failure)?;
        if read.candidate_key.is_some()
            || !read.historical_scope.still_permitted(&simulation.state)
            || !crate::capture::npc_perspectives_current(
                &simulation.state,
                &read.read.perception.actor_id,
                &read.perspectives,
                &request.perspectives,
                &self.budget,
            )
            .map_err(failure)?
            || !npc_consumer_current(
                &simulation.state,
                &read.read.perception.actor_id,
                &request.consumer,
                None,
            )
            .map_err(failure)?
        {
            return Ok(None);
        }
        Ok(Some(RuntimeNpcPublication {
            _lease: self.session.fence().begin_publication().map_err(failure)?,
        }))
    }

    pub fn npc_response_publication(
        &self,
        ticket: &RuntimeNpcResponseTicket,
    ) -> Result<Option<RuntimeNpcPublication>, RuntimeError> {
        use crate::response::ResponseValidityRoute;
        self.require_active()?;
        if !ticket.publication_available() {
            return Ok(None);
        }
        let state = &self.session.accepted().map_err(failure)?.state;
        let actor_id = &ticket.current.read.perception.actor_id;
        // Paid source disclosure follows the admitted consumer's Source gate.
        // Paused/participating/response-body checks belong to the actual
        // response effect owner; source-only reflection has its own native
        // maintenance admission and must not inherit a chat/action gate here.
        if !ticket.original.historical_scope.still_permitted(state)
            || !ticket.current.historical_scope.still_permitted(state)
            || ticket
                .original
                .sources
                .iter()
                .any(|source| !source.scope.still_permitted(state))
            || !npc_consumer_current(
                state,
                actor_id,
                ticket.bindings.consumer.as_str(),
                Some(&ticket.decision_id),
            )
            .map_err(failure)?
        {
            return Ok(None);
        }
        if !ticket
            .original
            .read
            .native_validity
            .as_ref()
            .ok_or_else(|| failure("NPC initial outcome witness unavailable"))?
            .required_outcomes_current(state, actor_id, &self.budget)
            .map_err(failure)?
        {
            return Ok(None);
        }
        let witness = ticket
            .current
            .read
            .native_validity
            .as_ref()
            .ok_or_else(|| failure("NPC semantic validity capture is unavailable"))?;
        let current = match ticket.bindings.validity {
            ResponseValidityRoute::Decision => witness.current(state, actor_id, &self.budget),
            ResponseValidityRoute::PreparedResponse => {
                witness.prepared_current(state, actor_id, &self.budget)
            }
            ResponseValidityRoute::Source => ticket
                .original
                .read
                .native_validity
                .as_ref()
                .ok_or_else(|| failure("NPC initial outcome witness unavailable"))?
                .required_outcomes_current(state, actor_id, &self.budget),
        }
        .map_err(failure)?;
        if !current
            || !crate::capture::npc_perspectives_current(
                state,
                actor_id,
                &ticket.original.perspectives,
                &ticket.bindings.perspectives,
                &self.budget,
            )
            .map_err(failure)?
            || !ticket
                .bindings
                .appraisals
                .as_ref()
                .map(|appraisals| {
                    appraisals.current(state, &ticket.current.read, actor_id, &self.budget)
                })
                .transpose()
                .map_err(failure)?
                .unwrap_or(true)
        {
            return Ok(None);
        }
        Ok(Some(RuntimeNpcPublication {
            _lease: self.session.fence().begin_publication().map_err(failure)?,
        }))
    }

    pub fn read_npc(&mut self, request: &[u8]) -> Result<RuntimeNpcRead, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(request, &self.budget)?;
        let request: NpcReadRequest = serde_json::from_slice(request).map_err(failure)?;
        let serial = self
            .next_read_serial
            .checked_add(1)
            .filter(|serial| *serial <= crate::identity::MAX_SAFE_INTEGER)
            .ok_or_else(|| failure("read identity exhausted"))?;
        let simulation = self.session.accepted().map_err(failure)?;
        if !npc_consumer_current(
            &simulation.state,
            &request.actor_id,
            &request.consumer,
            None,
        )
        .map_err(failure)?
        {
            return Err(failure("NPC consumer is no longer eligible"));
        }
        let read = simulation
            .read_npc(
                &request.actor_id,
                &request.required_appraisals,
                &self.budget,
            )
            .map_err(failure)?;
        let history = crate::experience::capture_history_cuts(
            &simulation.state,
            std::iter::once(request.actor_id.as_str()),
            &self.budget,
        )
        .map_err(failure)?;
        let historical_scope = Arc::new(
            crate::capture::NpcHistoricalScope::capture(
                &simulation.state,
                &read,
                serial,
                &self.budget,
            )
            .map_err(failure)?,
        );
        let reference_facts =
            crate::capture::NpcReferenceFacts::capture(&simulation.state, &read, &self.budget)
                .map_err(failure)?;
        let attempts = &simulation
            .state
            .physical
            .entities
            .get(&request.actor_id)
            .and_then(|entity| entity.actor.as_ref())
            .ok_or_else(|| failure("NPC actor disappeared"))?
            .agency
            .attempts;
        let intent_bytes = attempts.iter().try_fold(
            attempts
                .len()
                .checked_mul(size_of::<String>())
                .ok_or_else(|| failure("capacity"))?,
            |n, attempt| {
                n.checked_add(attempt.id.len())
                    .ok_or_else(|| failure("capacity"))
            },
        )?;
        let work_generation = simulation
            .state
            .physical
            .entities
            .get(&request.actor_id)
            .and_then(|entity| entity.actor.as_ref())
            .ok_or_else(|| failure("NPC actor disappeared"))?
            .plan_generation;
        let custody = self
            .budget
            .reserve(
                size_of::<RuntimeNpcRead>()
                    .checked_add(intent_bytes)
                    .and_then(|n| {
                        n.checked_add(
                            size_of::<AcceptedActorRead>()
                                + size_of::<Vec<crate::capture::PreparedNpcSources>>()
                                + size_of::<ByteReservation>()
                                + size_of::<Vec<crate::capture::NpcPerspectiveSnapshot>>(),
                        )
                    })
                    .and_then(|n| {
                        n.checked_add(8 * size_of::<usize>() + 4 * std::mem::align_of::<usize>())
                    })
                    .ok_or_else(|| failure("capacity"))?,
            )
            .map_err(failure)?;
        let intent_ids = attempts.iter().map(|attempt| attempt.id.clone()).collect();
        self.next_read_serial = serial;
        Ok(RuntimeNpcRead {
            read: Arc::new(read),
            serial,
            history,
            historical_scope,
            reference_facts,
            candidates: None,
            intent_ids,
            work_generation,
            sources: Arc::new(Vec::new()),
            perspectives: Arc::new(Vec::new()),
            candidate_key: None,
            query_expanded: false,
            _custody: Arc::new(custody),
        })
    }
    pub fn begin_npc_candidates(
        &mut self,
        read: &mut RuntimeNpcRead,
        request: &[u8],
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        if read.candidate_key.is_some() || read.candidates.is_some() {
            return Err(failure(
                "NPC choices were already prepared or preparation is active",
            ));
        }
        let _decode = decode_preparation(request, &self.budget)?;
        let request: CandidateRequest = serde_json::from_slice(request).map_err(failure)?;
        let key = self
            .session
            .begin_npc_candidates(
                &read.read,
                &request.expanded_body_ordinals,
                request.coverage,
            )
            .map_err(failure)?;
        read.candidate_key = Some(key);
        Ok(key)
    }
    pub fn step_npc_preparation(
        &mut self,
        read: &mut RuntimeNpcRead,
        key: CandidateKey,
        answer: Option<(&RuntimeProvider, String)>,
    ) -> Result<RuntimeNpcPreparationStep, RuntimeError> {
        if read.candidate_key != Some(key)
            || !(self.session.is_npc_candidates(key) || self.session.is_npc_sources(key))
        {
            return Err(failure("NPC read preparation is stale"));
        }
        let answer = provider_response(answer, &self.budget)?;
        let result = self.session.step(
            key,
            answer,
            crate::experience::HistorySettings {
                policy_id: &self.history_policy_id,
                policy_revision: self.history_policy_revision,
            },
        );
        let step = match result {
            Ok(step) => step,
            Err(error) => {
                if !(self.session.is_npc_candidates(key) || self.session.is_npc_sources(key)) {
                    read.candidate_key = None;
                }
                return Err(failure(error));
            }
        };
        Ok(match step {
            SessionStep::Continue => RuntimeNpcPreparationStep::Continue,
            SessionStep::Question(question) => {
                RuntimeNpcPreparationStep::Provider(RuntimeProvider { question })
            }
            SessionStep::NpcCandidates(candidates) => {
                read.candidates = Some(candidates);
                read.candidate_key = None;
                RuntimeNpcPreparationStep::Complete
            }
            SessionStep::NpcSources(sources) => {
                read.candidate_key = None;
                sources
                    .validate_origin(&read.read, &self.budget)
                    .map_err(failure)?;
                Arc::get_mut(&mut read.sources)
                    .ok_or_else(|| failure("NPC sources are already issued"))?
                    .push(sources);
                RuntimeNpcPreparationStep::Complete
            }
            _ => return Err(failure("NPC discovery produced an executable completion")),
        })
    }
    pub fn cancel_npc_preparation(&mut self, read: &RuntimeNpcRead) -> Result<(), RuntimeError> {
        if let Some(key) = read
            .candidate_key
            .filter(|key| self.session.is_npc_candidates(*key) || self.session.is_npc_sources(*key))
        {
            self.session.cancel(key).map_err(failure)?;
        }
        Ok(())
    }
    pub fn begin_npc_sources(
        &mut self,
        read: &mut RuntimeNpcRead,
        request: &[u8],
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        if read.candidate_key.is_some() {
            return Err(failure("NPC read preparation is active"));
        }
        if Arc::strong_count(&read.sources) != 1 || Arc::strong_count(&read._custody) != 1 {
            return Err(failure(
                "NPC source preparation is still retained by an execution",
            ));
        }
        let _decode = decode_preparation(request, &self.budget)?;
        let request: crate::capture::NpcSourceSelection =
            serde_json::from_slice(request).map_err(failure)?;
        if read.sources.len() == read.sources.capacity() {
            let capacity = read
                .sources
                .len()
                .checked_add(1)
                .and_then(|n| n.max(4).checked_next_power_of_two())
                .ok_or_else(|| failure("capacity"))?;
            let bytes = read._custody.bytes();
            Arc::get_mut(&mut read._custody)
                .ok_or_else(|| failure("NPC source custody is already issued"))?
                .resize(
                    bytes
                        .checked_add(
                            capacity
                                .checked_sub(read.sources.capacity())
                                .ok_or_else(|| failure("capacity"))?
                                .checked_mul(size_of::<crate::capture::PreparedNpcSources>())
                                .ok_or_else(|| failure("capacity"))?,
                        )
                        .ok_or_else(|| failure("capacity"))?,
                )
                .map_err(failure)?;
            let additional = capacity - read.sources.len();
            Arc::get_mut(&mut read.sources)
                .ok_or_else(|| failure("NPC sources are already issued"))?
                .try_reserve_exact(additional)
                .map_err(failure)?;
        }
        let key = self
            .session
            .begin_npc_sources(Arc::clone(&read.historical_scope), request)
            .map_err(failure)?;
        read.candidate_key = Some(key);
        Ok(key)
    }
}

impl RuntimeNpcRead {
    pub fn candidate_key(&self) -> Option<CandidateKey> {
        self.candidate_key
    }
    pub fn packet(&self, budget: &ByteBudget) -> Result<RuntimeJson, RuntimeError> {
        let (perception, _perception_custody) =
            self.read.perception.write_json(budget).map_err(failure)?;
        let appraisals = self
            .read
            .appraisals_json()
            .ok_or_else(|| failure("NPC appraisal capture is unavailable"))?;
        let history = RuntimeJson::encode(&self.history.value(), budget)?;
        let history_scope = RuntimeJson::encode(&self.historical_scope, budget)?;
        let reference_facts = RuntimeJson::encode(&self.reference_facts, budget)?;
        let sources = RuntimeJson::encode(&self.sources, budget)?;
        let validity = self
            .read
            .native_validity
            .as_ref()
            .ok_or_else(|| failure("NPC semantic validity capture is unavailable"))?;
        let candidates = self
            .candidates
            .as_ref()
            .map(|candidates| candidates.write_json(budget).map_err(failure))
            .transpose()?;
        let (candidate_key, candidate_value) = candidates
            .as_ref()
            .map_or((&b""[..], &b""[..]), |(json, _)| {
                (&b",\"candidates\":"[..], json.as_bytes())
            });
        RuntimeJson::join(
            &[
                b"{\"self\":",
                self.read.own_json().as_bytes(),
                b",\"perception\":",
                perception.as_bytes(),
                b",\"appraisals\":",
                appraisals.as_bytes(),
                b",\"history\":",
                history.bytes(),
                b",\"historyScope\":",
                history_scope.bytes(),
                b",\"referenceFacts\":",
                reference_facts.bytes(),
                b",\"sources\":",
                sources.bytes(),
                b",\"validity\":{\"decision\":",
                validity.decision_json().as_bytes(),
                b",\"prepared\":",
                validity.prepared_json().as_bytes(),
                b"}",
                candidate_key,
                candidate_value,
                b"}",
            ],
            budget,
        )
    }
}
