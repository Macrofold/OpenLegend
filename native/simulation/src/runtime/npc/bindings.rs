//! Issuance consumes the genuine originating reads. Node supplies only the
//! displayed aliases and ordinals, never commands or permission-bearing maps.
use super::*;
use crate::capture::{NpcBindingMaps, NpcBindingRead, NpcBindingSelection};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct BindingRequest {
    decision_id: String,
    selection: NpcBindingSelection,
}

pub struct RuntimeNpcResponseTicket {
    pub(super) original: RuntimeNpcRead,
    pub(super) current: RuntimeNpcRead,
    pub(super) decision_id: String,
    pub(super) bindings: NpcBindingMaps,
    _custody: ByteReservation,
}

impl NativeWorldSession {
    /// This internal conversion is mounted before the public apply endpoint.
    /// All alias meaning and command custody comes from the consumed native
    /// captures; the response bytes carry proposals only.
    pub(crate) fn begin_npc_response(
        &mut self,
        ticket: RuntimeNpcResponseTicket,
        response: &str,
    ) -> Result<CandidateKey, RuntimeError> {
        use crate::host::retained_size::HeapBytes;
        use crate::response::{
            ActorResponse, ResponseAliases, ResponseBindingInput, ResponseBindings,
            ResponseNativeGuard, ResponseReads,
        };
        self.require_active()?;
        let simulation = self.session.accepted().map_err(failure)?;
        let mut response = ActorResponse::decode(
            response,
            &simulation.state.installed.actor_response_limits,
            &self.budget,
        )
        .map_err(failure)?;
        response
            .resolve_appraisals(
                &simulation.state,
                ticket.bindings.appraisals.as_ref(),
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
        let expected_plan = ticket
            .current
            .candidates
            .as_ref()
            .ok_or_else(|| failure("NPC choices unavailable"))?
            .work
            .generation;
        let (attempt_candidates, attempt_storage) = crate::response::capture_attempt_candidates(
            ticket
                .current
                .candidates
                .as_ref()
                .ok_or_else(|| failure("NPC choices unavailable"))?,
            &ticket.current.read.perception.actor_id,
            &ticket.decision_id,
            &self.budget,
        )
        .map_err(failure)?;
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
        let RuntimeNpcResponseTicket {
            original,
            current,
            decision_id,
            bindings,
            _custody,
        } = ticket;
        let NpcBindingMaps {
            validity,
            actions,
            entity_ids,
            evidence_ids,
            selected_personal,
            knowledge_references,
            identity_references,
            entity_leases,
            expected_encounters,
            situation,
            appraisals,
            mut storage,
            ..
        } = bindings;
        storage.merge(_custody).map_err(failure)?;
        drop(current.intent_ids);
        drop(current.candidates);
        drop(current.reference_facts);
        drop(current.history);
        drop(current.sources);
        drop(current.historical_scope);
        storage.merge(current._custody).map_err(failure)?;
        if let Some(appraisal_storage) = appraisal_storage {
            storage.merge(appraisal_storage).map_err(failure)?;
        }
        storage
            .resize(
                storage
                    .bytes()
                    .checked_add(size_of::<ResponseBindingInput>() + 2 * size_of::<usize>())
                    .ok_or_else(|| failure("capacity"))?,
            )
            .map_err(failure)?;
        drop(original.intent_ids);
        drop(original.candidates);
        drop(original.reference_facts);
        drop(original.history);
        let mut original_storage = original._custody;
        original_storage
            .resize(
                size_of::<ResponseNativeGuard>()
                    .checked_add(
                        original
                            .sources
                            .capacity()
                            .checked_mul(size_of::<crate::capture::PreparedNpcSources>())
                            .ok_or_else(|| failure("capacity"))?,
                    )
                    .ok_or_else(|| failure("capacity"))?,
            )
            .map_err(failure)?;
        original_storage.merge(attempt_storage).map_err(failure)?;
        let input = ResponseBindingInput {
            native: Some(ResponseNativeGuard {
                route: validity,
                scope: original.historical_scope,
                sources: original.sources,
                selected_personal,
                appraisals,
                attempt_candidates,
                _custody: original_storage,
            }),
            reads: ResponseReads {
                original: original.read,
                current: current.read,
            },
            actions,
            entity_ids,
            expected_plan,
            attempt_bindings: Vec::new(),
            expected_encounters: Some(expected_encounters),
            evidence_ids,
            knowledge_references,
            identity_references,
            entity_leases,
            situation: Some(situation),
            appraisal_bindings,
        };
        storage
            .resize(
                storage
                    .bytes()
                    .max(input.heap_bytes().ok_or_else(|| failure("capacity"))?),
            )
            .map_err(failure)?;
        let bindings = Arc::new(ResponseBindings::new(input, storage).map_err(failure)?);
        self.session
            .begin_response(&decision_id, response, bindings)
            .map_err(failure)
    }
    /// An unsuccessful selection leaves both handles available. Captures move
    /// only after the whole finite binding has been checked and funded.
    pub fn bind_npc_response(
        &mut self,
        original: &mut Option<RuntimeNpcRead>,
        current: &mut Option<RuntimeNpcRead>,
        request: &[u8],
    ) -> Result<RuntimeNpcResponseTicket, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(request, &self.budget)?;
        let request: BindingRequest = serde_json::from_slice(request).map_err(failure)?;
        if !crate::values::is_safe_record_id(&request.decision_id)
            || request.decision_id.len() > 100
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
        let candidates = fresh
            .candidates
            .as_ref()
            .ok_or_else(|| failure("current NPC choices are not prepared"))?;
        let bindings = NpcBindingMaps::prepare(
            &simulation.state,
            NpcBindingRead {
                original: &first.read,
                current: &fresh.read,
                references: &fresh.reference_facts,
                original_references: &first.reference_facts,
                sources: &first.sources,
                candidates,
                intent_ids: &fresh.intent_ids,
            },
            &request.decision_id,
            &request.selection,
            &self.budget,
        )
        .map_err(failure)?;
        let custody = self
            .budget
            .reserve(
                size_of::<RuntimeNpcResponseTicket>()
                    .checked_add(request.decision_id.capacity())
                    .ok_or_else(|| failure("capacity"))?,
            )
            .map_err(failure)?;
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
            _custody: custody,
        })
    }
}
