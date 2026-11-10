//! Issuance consumes the genuine originating reads. Node supplies only the
//! displayed aliases and ordinals, never commands or permission-bearing maps.
use super::*;
use crate::capture::{
    NpcActionOrdinal, NpcBindingMaps, NpcBindingPurpose, NpcBindingRead, NpcBindingSelection,
    NpcCatalogueSource,
};
use crate::host::retained_size::{HeapBytes, heap_sum};
use std::sync::atomic::AtomicU8;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct BindingRequest {
    decision_id: String,
    selection: NpcBindingSelection,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RebindRequest {
    decision_id: String,
    actions: Vec<NpcActionOrdinal>,
    prototype_source: NpcCatalogueSource,
}

const FRESH: u8 = 0;
const APPLYING: u8 = 1;
const SETTLED: u8 = 2;
const CANCELED: u8 = 3;

pub(in crate::runtime) struct ActiveNpcResponse {
    key: CandidateKey,
    phase: Arc<AtomicU8>,
    _custody: Arc<ByteReservation>,
}

pub struct RuntimeNpcResponseTicket {
    pub(in crate::runtime) original: RuntimeNpcRead,
    pub(in crate::runtime) current: RuntimeNpcRead,
    pub(in crate::runtime) decision_id: String,
    pub(in crate::runtime) bindings: NpcBindingMaps,
    attempt_candidates: Arc<Vec<crate::response::ResponseAttemptCandidate>>,
    phase: Arc<AtomicU8>,
    _custody: Arc<ByteReservation>,
}

impl RuntimeNpcResponseTicket {
    pub(super) fn publication_available(&self) -> bool {
        matches!(self.phase.load(Ordering::Acquire), FRESH | SETTLED)
    }
    pub(super) fn require_prepared(&self) -> Result<(), RuntimeError> {
        if self.phase.load(Ordering::Acquire) != FRESH {
            return Err(failure("NPC response is applying, settled, or canceled"));
        }
        Ok(())
    }
}
impl NativeWorldSession {
    pub(in crate::runtime) fn finish_response_continuation(
        &mut self,
        key: CandidateKey,
        accepted: bool,
    ) {
        if self
            .active_response
            .as_ref()
            .is_some_and(|active| active.key == key)
        {
            if let Some(active) = self.active_response.take() {
                active
                    .phase
                    .store(if accepted { SETTLED } else { CANCELED }, Ordering::Release);
            }
        }
    }
    pub fn rebind_npc_response(
        &mut self,
        ticket: &mut RuntimeNpcResponseTicket,
        request: &[u8],
    ) -> Result<(), RuntimeError> {
        self.require_active()?;
        if ticket.bindings.purpose != NpcBindingPurpose::Decision {
            return Err(failure(
                "private reflection cannot become a decision response",
            ));
        }
        let phase = ticket.phase.load(Ordering::Acquire);
        if phase != FRESH && phase != SETTLED {
            return Err(failure("NPC response continuation is not available"));
        }
        let _decode = decode_preparation(request, &self.budget)?;
        let request: RebindRequest = serde_json::from_slice(request).map_err(failure)?;
        if !crate::values::is_safe_record_id(&request.decision_id)
            || request.decision_id.encode_utf16().count() > 100
            || request.decision_id == ticket.decision_id
        {
            return Err(failure("invalid new response identity"));
        }
        // Prior cursors must release their immutable allocations before this
        // trusted metadata rebind. Settlement alone cannot force uniqueness.
        if Arc::strong_count(&ticket._custody) != 1
            || ticket
                .bindings
                .appraisals
                .as_ref()
                .is_some_and(|owner| Arc::strong_count(owner) != 1)
        {
            return Err(failure("NPC response continuation is still retained"));
        }
        let original = ticket
            .original
            .candidates
            .as_ref()
            .ok_or_else(|| failure("original NPC choices unavailable"))?;
        let current = ticket
            .current
            .candidates
            .as_ref()
            .ok_or_else(|| failure("current NPC choices unavailable"))?;
        let controls = ticket
            .bindings
            .actions
            .keys()
            .filter(|alias| !ticket.bindings.ordinary_aliases.contains(alias))
            .count();
        let (mut actions, ordinary_aliases, mut action_storage) =
            crate::capture::prepare_ordinary_actions(
                original,
                current,
                &request.actions,
                &ticket.current.read.perception.actor_id,
                &request.decision_id,
                controls,
                &self.budget,
            )
            .map_err(failure)?;
        let control_bytes = ticket
            .bindings
            .actions
            .iter()
            .filter(|(alias, _)| !ticket.bindings.ordinary_aliases.contains(alias))
            .try_fold(0usize, |n, (alias, value)| {
                n.checked_add(alias.heap_bytes()?)?
                    .checked_add(value.heap_bytes()?)
            })
            .ok_or_else(|| failure("capacity"))?;
        action_storage
            .resize(
                action_storage
                    .bytes()
                    .checked_add(control_bytes)
                    .ok_or_else(|| failure("capacity"))?,
            )
            .map_err(failure)?;
        for (alias, value) in &ticket.bindings.actions {
            if !ticket.bindings.ordinary_aliases.contains(alias) {
                if actions.contains_key(alias) {
                    return Err(failure("ordinary action conflicts with explicit control"));
                }
                actions.insert(alias.clone(), value.clone());
            }
        }
        let catalogue = match request.prototype_source {
            NpcCatalogueSource::Original => original,
            NpcCatalogueSource::Current => current,
        };
        let (attempt_candidates, attempt_storage) = crate::response::capture_attempt_candidates(
            catalogue,
            &ticket.current.read.perception.actor_id,
            &request.decision_id,
            &self.budget,
        )
        .map_err(failure)?;
        let mut custody = self
            .budget
            .reserve(
                ticket_overhead()?
                    .checked_add(request.decision_id.capacity())
                    .ok_or_else(|| failure("capacity"))?,
            )
            .map_err(failure)?;
        custody.merge(attempt_storage).map_err(failure)?;
        let old_actions = heap_sum([
            ticket
                .bindings
                .actions
                .heap_bytes()
                .ok_or_else(|| failure("capacity"))?,
            ticket
                .bindings
                .ordinary_aliases
                .heap_bytes()
                .ok_or_else(|| failure("capacity"))?,
        ])
        .ok_or_else(|| failure("capacity"))?;
        let final_map_bytes = ticket
            .bindings
            .storage
            .bytes()
            .checked_sub(old_actions)
            .and_then(|n| n.checked_add(action_storage.bytes()))
            .ok_or_else(|| failure("capacity"))?;
        // All potentially failing allocations finish before replacing aliases.
        if let Some(appraisals) = ticket.bindings.appraisals.as_mut() {
            Arc::get_mut(appraisals)
                .ok_or_else(|| failure("NPC appraisals are still retained"))?
                .rebind_decision(&request.decision_id)
                .map_err(failure)?;
        }
        ticket
            .bindings
            .storage
            .merge(action_storage)
            .map_err(failure)?;
        ticket.bindings.actions = actions;
        ticket.bindings.ordinary_aliases = ordinary_aliases;
        ticket
            .bindings
            .storage
            .resize(final_map_bytes)
            .map_err(failure)?;
        ticket.decision_id = request.decision_id;
        ticket.attempt_candidates = Arc::new(attempt_candidates);
        ticket._custody = Arc::new(custody);
        ticket.original.query_expanded = false;
        ticket.phase.store(FRESH, Ordering::Release);
        Ok(())
    }
    /// Each execution copies only its bounded issued maps. Original captures
    /// and their exact funding survive as a nonexecuting continuation.
    pub fn begin_npc_response(
        &mut self,
        owner: &mut Option<RuntimeNpcResponseTicket>,
        response: &str,
        protected: bool,
    ) -> Result<CandidateKey, RuntimeError> {
        use crate::response::{
            ActorResponse, ResponseAliases, ResponseBindingInput, ResponseBindings,
            ResponseNativeGuard, ResponseReads,
        };
        self.require_active()?;
        if protected && !self.session.save_barrier_complete() {
            return Err(failure("protected response awaits the actual save barrier"));
        }
        let ticket = owner
            .as_ref()
            .ok_or_else(|| failure("NPC response ticket was released"))?;
        ticket.require_prepared()?;
        if ticket.bindings.purpose != NpcBindingPurpose::Decision {
            return Err(failure("private reflection requires its publication owner"));
        }
        let simulation = self.session.accepted().map_err(failure)?;
        if !ticket
            .original
            .read
            .native_validity
            .as_ref()
            .ok_or_else(|| failure("NPC initial outcome witness unavailable"))?
            .required_outcomes_current(
                &simulation.state,
                &ticket.current.read.perception.actor_id,
                &self.budget,
            )
            .map_err(failure)?
        {
            return Err(failure("NPC initial outcome context changed"));
        }
        if !super::npc_consumer_current(
            &simulation.state,
            &ticket.current.read.perception.actor_id,
            ticket.bindings.consumer.as_str(),
            Some(&ticket.decision_id),
        )
        .map_err(failure)?
        {
            return Err(failure("NPC response consumer is no longer available"));
        }
        let mut response = ActorResponse::decode(
            response,
            &simulation.state.installed.actor_response_limits,
            &self.budget,
        )
        .map_err(failure)?;
        response
            .resolve_appraisals(
                &simulation.state,
                ticket.bindings.appraisals.as_deref(),
                &ticket.bindings.entity_references,
                &self.budget,
            )
            .map_err(failure)?;
        response
            .resolve_entities(
                &ResponseAliases {
                    entities: &ticket.bindings.entity_references,
                    physical: &ticket.bindings.physical_references,
                    intentions: &ticket.bindings.intention_references,
                    knowledge: &ticket.bindings.knowledge_references,
                    identities: &ticket.bindings.identity_references,
                },
                &self.budget,
            )
            .map_err(failure)?;
        let bindings = self.npc_response_bindings(ticket)?;
        let key = self
            .session
            .begin_response(&ticket.decision_id, response, bindings, protected)
            .map_err(failure)?;
        ticket.phase.store(APPLYING, Ordering::Release);
        self.active_response = Some(ActiveNpcResponse {
            key,
            phase: Arc::clone(&ticket.phase),
            _custody: Arc::clone(&ticket._custody),
        });
        Ok(key)
    }
    pub(crate) fn npc_response_bindings(
        &self,
        ticket: &RuntimeNpcResponseTicket,
    ) -> Result<Arc<crate::response::ResponseBindings>, RuntimeError> {
        use crate::response::{
            ResponseBindingInput, ResponseBindings, ResponseNativeGuard, ResponseReads,
        };
        ticket.require_prepared()?;
        let expected_plan = ticket.current.work_generation;
        let (appraisal_bindings, appraisal_storage) =
            if let Some(appraisals) = &ticket.bindings.appraisals {
                let (bindings, storage) = appraisals
                    .bindings(
                        ticket
                            .bindings
                            .entity_references
                            .values()
                            .map(String::as_str),
                        &self.budget,
                    )
                    .map_err(failure)?;
                (Some(bindings), Some(storage))
            } else {
                (None, None)
            };
        let maps = &ticket.bindings;
        let bytes = heap_sum([
            size_of::<ResponseBindings>()
                + 2 * size_of::<usize>()
                + std::mem::align_of::<ResponseBindings>()
                - 1,
            maps.actions
                .heap_bytes()
                .ok_or_else(|| failure("capacity"))?,
            maps.entity_ids
                .heap_bytes()
                .ok_or_else(|| failure("capacity"))?,
            maps.evidence_ids
                .heap_bytes()
                .ok_or_else(|| failure("capacity"))?,
            maps.selected_personal
                .capacity()
                .checked_mul(size_of::<(usize, usize)>())
                .ok_or_else(|| failure("capacity"))?,
            maps.knowledge_references
                .heap_bytes()
                .ok_or_else(|| failure("capacity"))?,
            maps.identity_references
                .heap_bytes()
                .ok_or_else(|| failure("capacity"))?,
            maps.entity_leases
                .heap_bytes()
                .ok_or_else(|| failure("capacity"))?,
            maps.expected_encounters
                .heap_bytes()
                .ok_or_else(|| failure("capacity"))?,
            maps.situation
                .heap_bytes()
                .ok_or_else(|| failure("capacity"))?,
        ])
        .ok_or_else(|| failure("capacity"))?;
        let mut storage = self.budget.reserve(bytes).map_err(failure)?;
        if let Some(guard) = appraisal_storage {
            storage.merge(guard).map_err(failure)?;
        }
        let native_bytes = maps
            .selected_personal
            .capacity()
            .checked_mul(size_of::<(usize, usize)>())
            .and_then(|n| {
                n.checked_add(
                    maps.perspectives
                        .len()
                        .checked_mul(size_of::<crate::capture::NpcPerspectiveOrdinal>())?,
                )
            })
            .ok_or_else(|| failure("capacity"))?;
        let native_storage = self.budget.reserve(native_bytes).map_err(failure)?;
        let input = ResponseBindingInput {
            native: Some(ResponseNativeGuard {
                consumer: maps.consumer,
                route: maps.validity,
                scope: Arc::clone(&ticket.original.historical_scope),
                sources: Arc::clone(&ticket.original.sources),
                selected_personal: maps.selected_personal.clone(),
                perspectives: maps.perspectives.clone(),
                perspective_snapshots: Arc::clone(&ticket.original.perspectives),
                appraisals: maps.appraisals.clone(),
                attempt_candidates: Arc::clone(&ticket.attempt_candidates),
                _original_custody: Arc::clone(&ticket.original._custody),
                _current_custody: Arc::clone(&ticket.current._custody),
                _ticket_custody: Arc::clone(&ticket._custody),
                _custody: native_storage,
            }),
            reads: ResponseReads {
                original: Arc::clone(&ticket.original.read),
                current: Arc::clone(&ticket.current.read),
            },
            actions: maps.actions.clone(),
            entity_ids: maps.entity_ids.clone(),
            expected_plan,
            attempt_bindings: Vec::new(),
            expected_encounters: Some(maps.expected_encounters.clone()),
            evidence_ids: maps.evidence_ids.clone(),
            knowledge_references: maps.knowledge_references.clone(),
            identity_references: maps.identity_references.clone(),
            entity_leases: maps.entity_leases.clone(),
            situation: Some(maps.situation.clone()),
            appraisal_bindings,
        };
        Ok(Arc::new(
            ResponseBindings::new(input, storage).map_err(failure)?,
        ))
    }
    /// An unsuccessful selection leaves both handles available. Captures move
    /// only after the whole finite binding has been checked and funded.
    pub fn bind_npc_response(
        &mut self,
        original: &mut Option<RuntimeNpcRead>,
        current: &mut Option<RuntimeNpcRead>,
        request: &[u8],
        trigger: Option<&RuntimeNpcTrigger>,
    ) -> Result<RuntimeNpcResponseTicket, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(request, &self.budget)?;
        let request: BindingRequest = serde_json::from_slice(request).map_err(failure)?;
        if !crate::values::is_safe_record_id(&request.decision_id)
            || request.decision_id.encode_utf16().count() > 100
        {
            return Err(failure("invalid response identity"));
        }
        let first = original
            .as_ref()
            .ok_or_else(|| failure("original NPC read was released"))?;
        let fresh = current
            .as_ref()
            .ok_or_else(|| failure("current NPC read was released"))?;
        if first.serial == fresh.serial
            || first.candidate_key.is_some()
            || fresh.candidate_key.is_some()
        {
            return Err(failure("NPC response capture is unavailable"));
        }
        let simulation = self.session.accepted().map_err(failure)?;
        if !first.historical_scope.still_permitted(&simulation.state)
            || !fresh.historical_scope.still_permitted(&simulation.state)
        {
            return Err(failure("NPC response capture was revoked"));
        }
        let candidates = fresh.candidates.as_ref();
        let mut bindings = NpcBindingMaps::prepare(
            &simulation.state,
            NpcBindingRead {
                original: &first.read,
                current: &fresh.read,
                references: &fresh.reference_facts,
                original_references: &first.reference_facts,
                sources: &first.sources,
                perspectives: &first.perspectives,
                candidates,
                original_candidates: first.candidates.as_ref(),
                intent_ids: &fresh.intent_ids,
                invocation_id: &request.decision_id,
            },
            &request.decision_id,
            &request.selection,
            &self.budget,
        )
        .map_err(failure)?;
        if !request.selection.semantic_causes.is_empty() {
            let trigger = trigger
                .ok_or_else(|| failure("NPC semantic causes require their originating intake"))?;
            let (causes, _causes_custody) = trigger.copy_semantic_causes_for(
                &fresh.read.perception.world_id,
                fresh.read.perception.evidence.generation(),
                &fresh.read.perception.actor_id,
                fresh.read.perception.evidence.cut().observer.physical_life,
                &self.budget,
            )?;
            let bytes = request
                .selection
                .semantic_causes
                .iter()
                .try_fold(
                    request
                        .selection
                        .semantic_causes
                        .len()
                        .checked_mul(size_of::<crate::response::ResponseSemanticCause>())
                        .ok_or_else(|| failure("capacity"))?,
                    |n, ordinal| n.checked_add(causes.get(*ordinal)?.heap_bytes()?),
                )
                .ok_or_else(|| failure("invalid native semantic cause selection"))?;
            let storage = self.budget.reserve(bytes).map_err(failure)?;
            let selected = request
                .selection
                .semantic_causes
                .iter()
                .map(|ordinal| causes[*ordinal].clone())
                .collect();
            bindings.storage.merge(storage).map_err(failure)?;
            bindings.situation.semantic_causes = Some(selected);
        }
        let catalogue = match request.selection.prototype_source {
            NpcCatalogueSource::Original => first.candidates.as_ref(),
            NpcCatalogueSource::Current => candidates,
        };
        let (attempt_candidates, attempt_storage) = if let Some(catalogue) = catalogue {
            crate::response::capture_attempt_candidates(
                catalogue,
                &fresh.read.perception.actor_id,
                &request.decision_id,
                &self.budget,
            )
            .map_err(failure)?
        } else {
            (Vec::new(), self.budget.reserve(0).map_err(failure)?)
        };
        let mut custody = self
            .budget
            .reserve(
                ticket_overhead()?
                    .checked_add(request.decision_id.capacity())
                    .ok_or_else(|| failure("capacity"))?,
            )
            .map_err(failure)?;
        custody.merge(attempt_storage).map_err(failure)?;
        Ok(RuntimeNpcResponseTicket {
            // The checked Some owners cannot change while the caller holds
            // these two exclusive slots in the same serialized writer job.
            original: original
                .take()
                .ok_or_else(|| failure("original NPC read was released"))?,
            current: current
                .take()
                .ok_or_else(|| failure("current NPC read was released"))?,
            decision_id: request.decision_id,
            bindings,
            attempt_candidates: Arc::new(attempt_candidates),
            phase: Arc::new(AtomicU8::new(FRESH)),
            _custody: Arc::new(custody),
        })
    }
}

fn ticket_overhead() -> Result<usize, RuntimeError> {
    // The ticket owns shared prototype backing, custody, and the execution gate.
    size_of::<RuntimeNpcResponseTicket>()
        .checked_add(size_of::<Vec<crate::response::ResponseAttemptCandidate>>())
        .and_then(|n| n.checked_add(size_of::<ByteReservation>() + size_of::<AtomicU8>()))
        .and_then(|n| n.checked_add(6 * size_of::<usize>() + 3 * std::mem::align_of::<usize>()))
        .ok_or_else(|| failure("capacity"))
}
