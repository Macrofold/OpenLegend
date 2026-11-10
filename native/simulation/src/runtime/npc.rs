//! Detached NPC first-person facts retain their actual native evidence owner.
//! Reading these facts grants neither an executable response nor a current
//! source lease; the context producer must bind those independently.
use super::*;
use crate::appraisals::AppraisalScope;
use crate::host::PublicationLease;
use crate::simulation::AcceptedActorRead;
use std::mem::size_of;

mod bindings;
pub use bindings::RuntimeNpcResponseTicket;

/// A brief dispatch gate, never retained while SQL or a provider is awaited.
/// Historical disclosure and current response semantics are separate routes.
pub struct RuntimeNpcPublication {
    _lease: PublicationLease,
}

pub struct RuntimeNpcRead {
    pub(super) read: AcceptedActorRead,
    pub(super) serial: u64,
    history: crate::experience::CapturedHistoryCuts,
    pub(super) historical_scope: Arc<crate::capture::NpcHistoricalScope>,
    reference_facts: crate::capture::NpcReferenceFacts,
    candidates: Option<crate::capture::PreparedNpcCandidates>,
    intent_ids: Vec<String>,
    sources: Vec<crate::capture::PreparedNpcSources>,
    candidate_key: Option<CandidateKey>,
    query_expanded: bool,
    _custody: ByteReservation,
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
    required_appraisals: Vec<AppraisalScope>,
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
    ) -> Result<Option<RuntimeNpcPublication>, RuntimeError> {
        self.require_active()?;
        let simulation = self.session.accepted().map_err(failure)?;
        if read.candidate_key.is_some()
            || !read.historical_scope.still_permitted(&simulation.state)
            || !simulation
                .state
                .physical
                .entities
                .get(&read.read.perception.actor_id)
                .is_some_and(|entity| {
                    entity.has_memory()
                        && entity
                            .actor
                            .as_ref()
                            .is_some_and(|actor| actor.controller == "npc")
                })
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
        let state = &self.session.accepted().map_err(failure)?.state;
        let actor_id = &ticket.current.read.perception.actor_id;
        let Some(entity) = state.physical.entities.get(actor_id) else {
            return Ok(None);
        };
        let Some(actor) = entity.actor.as_ref() else {
            return Ok(None);
        };
        if state.physical.header.paused
            || !entity.actively_participates()
            || !actor.alive
            || actor.incapacitated
            || !ticket.original.historical_scope.still_permitted(state)
            || !ticket.current.historical_scope.still_permitted(state)
            || ticket
                .original
                .sources
                .iter()
                .any(|source| !source.scope.still_permitted(state))
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
        }
        .map_err(failure)?;
        if !current
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
        let custody = self
            .budget
            .reserve(
                size_of::<RuntimeNpcRead>()
                    .checked_add(intent_bytes)
                    .ok_or_else(|| failure("capacity"))?,
            )
            .map_err(failure)?;
        let intent_ids = attempts.iter().map(|attempt| attempt.id.clone()).collect();
        self.next_read_serial = serial;
        Ok(RuntimeNpcRead {
            read,
            serial,
            history,
            historical_scope,
            reference_facts,
            candidates: None,
            intent_ids,
            sources: Vec::new(),
            candidate_key: None,
            query_expanded: false,
            _custody: custody,
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
                read.sources.push(sources);
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
            read._custody
                .resize(
                    read._custody
                        .bytes()
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
            read.sources
                .try_reserve_exact(capacity - read.sources.len())
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
