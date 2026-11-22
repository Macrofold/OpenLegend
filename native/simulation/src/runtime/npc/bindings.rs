//! Issuance consumes the genuine originating reads. Node supplies only the
//! displayed aliases and ordinals, never commands or permission-bearing maps.
use super::*;
use crate::capture::{NpcBindingMaps, NpcBindingRead, NpcBindingSelection};
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::response::ResponseEnvelopeError;
use std::sync::atomic::AtomicU8;
mod copies;

pub use crate::capture::{
    NpcActionOrdinal, NpcAliasOrdinal, NpcBindingPurpose, NpcCatalogueSource, NpcEntityAlias,
    NpcEntityOrdinal, NpcPersonalEvidence,
};
use crate::host::retained_size::heap_record;
pub use crate::response::ResponseConsumer as RuntimeNpcConsumer;

heap_record!(NpcAliasOrdinal { alias });
heap_record!(NpcActionOrdinal { alias });
heap_record!(NpcEntityAlias { alias });
heap_record!(NpcPersonalEvidence {});

/// The stand-alone director's choices and displayed aliases. Identity
/// authority stays in the original and current read, just as at the bridge.
pub struct RuntimeNpcBindingInput {
    pub decision_id: String,
    pub consumer: crate::response::ResponseConsumer,
    pub purpose: NpcBindingPurpose,
    pub actions: Vec<NpcActionOrdinal>,
    pub semantic_causes: Vec<usize>,
    pub evidence: Vec<NpcPersonalEvidence>,
    pub entities: Vec<NpcEntityAlias>,
    pub identities: Vec<crate::capture::NpcSubjectAlias>,
    pub knowledge: Vec<NpcAliasOrdinal>,
    pub attention: Vec<NpcAliasOrdinal>,
    pub presented: Vec<usize>,
    pub appraisals: Option<crate::response::AppraisalSelection>,
}

pub struct RuntimeNpcBindingRequest {
    request: BindingRequest,
    _custody: ByteReservation,
}

impl RuntimeNpcBindingRequest {
    /// Only a supplied physical reference can anchor an original-scene
    /// query. Match the life and lease before looking at the old coordinates.
    pub fn received_anchor(
        &self,
        original: &RuntimeNpcRead,
        current: &RuntimeNpcRead,
        alias: &str,
    ) -> Option<usize> {
        let selected = self.request.selection.entities.iter().find(|row| row.alias == alias)?;
        match selected.source {
            NpcEntityOrdinal::Body { ordinal } => {
                let anchor = current.read.perception.bodies.get(ordinal)?;
                original.read.perception.bodies.iter().position(|body| {
                    body.source_id == anchor.source_id
                        && body.physical_life == anchor.physical_life
                        && body.lease_id == anchor.lease_id
                })
            }
            NpcEntityOrdinal::ReceivedBody { ordinal } => Some(ordinal),
            _ => None,
        }
    }

    /// Historical subjects use the original received track, never a name or
    /// a current entity identity supplied by the model.
    pub fn received_history_track<'a>(
        &self,
        original: &'a RuntimeNpcRead,
        current: &RuntimeNpcRead,
        alias: &str,
    ) -> Option<&'a str> {
        let ordinal = self.received_anchor(original, current, alias)?;
        let read = &original.read.perception;
        let body = read.query_bodies.get(ordinal)?.as_ref()?;
        let facet = read.evidence.cut().current.get(body.facets[0]?)?;
        Some(&facet.exposure.track)
    }

    pub fn received_separation(
        &self,
        original: &RuntimeNpcRead,
        current: &RuntimeNpcRead,
        first: &str,
        second: &str,
    ) -> super::RuntimeNpcSeparationEvidence {
        match self.received_anchor(original, current, first)
            .zip(self.received_anchor(original, current, second)) {
            Some((first, second)) => original.query_separation(first, second),
            None => super::RuntimeNpcSeparationEvidence::UNAVAILABLE,
        }
    }

    pub fn received_body_alias(
        &self,
        original: &RuntimeNpcRead,
        current: &RuntimeNpcRead,
        ordinal: usize,
    ) -> Option<&str> {
        let subject = original.read.perception.bodies.get(ordinal)?;
        self.request.selection.entities.iter().find_map(|row| {
            let matched = match row.source {
                NpcEntityOrdinal::Body { ordinal } => current.read.perception.bodies.get(ordinal)
                    .is_some_and(|body| body.source_id == subject.source_id
                        && body.physical_life == subject.physical_life && body.lease_id == subject.lease_id),
                NpcEntityOrdinal::ReceivedBody { ordinal: index } => index == ordinal,
                _ => false,
            };
            matched.then_some(row.alias.as_str())
        })
    }

    /// Bind only a body that appears in the final sent query answer. The
    /// response owner resolves its lease and life from the original read.
    pub fn bind_query_body(&mut self, alias: &str, ordinal: usize) -> Result<(), RuntimeError> {
        let entities = &mut self.request.selection.entities;
        if entities.iter().any(|reference| reference.alias == alias) {
            return Ok(());
        }
        self._custody.resize(
            self._custody.bytes().checked_add(size_of::<NpcEntityAlias>() + alias.len())
                .ok_or(CapacityError)?,
        )?;
        entities.try_reserve_exact(1).map_err(|_| CapacityError)?;
        entities.push(NpcEntityAlias {
            alias: alias.into(),
            source: NpcEntityOrdinal::ReceivedBody { ordinal },
        });
        Ok(())
    }

    /// A boundary and the surface facts it names stay tied to the original
    /// acquired rows. Final disclosure rechecks these exact observations.
    pub fn bind_query_observation(
        &mut self,
        alias: &str,
        ordinal: usize,
    ) -> Result<(), RuntimeError> {
        use crate::capture::{NpcObservationAlias, NpcObservationOrdinal};
        let observations = &mut self.request.selection.observations;
        if observations
            .iter()
            .any(|reference| reference.alias == alias)
        {
            return Ok(());
        }
        self._custody.resize(
            self._custody
                .bytes()
                .checked_add(size_of::<NpcObservationAlias>() + alias.len())
                .ok_or(CapacityError)?,
        )?;
        observations
            .try_reserve_exact(1)
            .map_err(|_| CapacityError)?;
        observations.push(NpcObservationAlias {
            alias: alias.into(),
            source: NpcObservationOrdinal::Acquired { ordinal },
        });
        Ok(())
    }

    /// Bind a receipt that is present in the final answer. The original read
    /// retains the selected row and its independent source eligibility.
    pub fn bind_query_receipt(
        &mut self,
        alias: &str,
        inventory: usize,
        ordinal: usize,
    ) -> Result<(), RuntimeError> {
        use crate::capture::NpcReceiptAlias;
        let receipts = &mut self.request.selection.receipts;
        if receipts.iter().any(|previous| previous.alias == alias) {
            return Ok(());
        }
        self._custody.resize(
            self._custody
                .bytes()
                .checked_add(size_of::<NpcReceiptAlias>() + alias.len())
                .ok_or(CapacityError)?,
        )?;
        receipts.try_reserve_exact(1).map_err(|_| CapacityError)?;
        receipts.push(NpcReceiptAlias {
            alias: alias.into(),
            inventory,
            ordinal,
        });
        Ok(())
    }

    /// Attach a reference actually sent in the query answer to the original
    /// held facet. The final dispatch checks its availability again.
    pub fn bind_query_facet(&mut self, alias: &str, ordinal: usize) -> Result<(), RuntimeError> {
        let current = &mut self.request.selection.current;
        if current.iter().any(|reference| reference.ordinal == ordinal) {
            return Ok(());
        }
        let bytes = self
            ._custody
            .bytes()
            .checked_add(size_of::<NpcAliasOrdinal>() + alias.len())
            .ok_or(CapacityError)?;
        self._custody.resize(bytes)?;
        current.try_reserve_exact(1).map_err(|_| CapacityError)?;
        current.push(NpcAliasOrdinal {
            alias: alias.into(),
            ordinal,
        });
        Ok(())
    }
}

impl RuntimeNpcBindingInput {
    /// The producer funded these buffers before building them. Transfer
    /// their actual backing independently through queued/cancelled binding.
    pub fn fund(
        self,
        workspace: &mut ByteReservation,
    ) -> Result<RuntimeNpcBindingRequest, RuntimeError> {
        let bytes = heap_sum([
            self.decision_id.capacity(),
            self.actions.heap_bytes().ok_or(CapacityError)?,
            self.semantic_causes.heap_bytes().ok_or(CapacityError)?,
            self.evidence.heap_bytes().ok_or(CapacityError)?,
            self.entities.heap_bytes().ok_or(CapacityError)?,
            self.knowledge.heap_bytes().ok_or(CapacityError)?,
            self.identities.heap_bytes().ok_or(CapacityError)?,
            self.attention.heap_bytes().ok_or(CapacityError)?,
            self.presented.heap_bytes().ok_or(CapacityError)?,
            self.appraisals.heap_bytes().ok_or(CapacityError)?,
        ])
        .ok_or(CapacityError)?;
        let custody = workspace.split_off(bytes)?;
        use crate::response::ResponseValidityRoute;
        let validity = match self.purpose {
            NpcBindingPurpose::Recall => ResponseValidityRoute::PreparedResponse,
            NpcBindingPurpose::Reflection => ResponseValidityRoute::Source,
            NpcBindingPurpose::Decision => ResponseValidityRoute::Decision,
        };
        Ok(RuntimeNpcBindingRequest {
            request: BindingRequest {
                decision_id: self.decision_id,
                selection: NpcBindingSelection {
                    consumer: self.consumer,
                    purpose: self.purpose,
                    validity,
                    actions: self.actions,
                    prototype_source: NpcCatalogueSource::Current,
                    perspectives: Vec::new(),
                    semantic_causes: self.semantic_causes,
                    intents: Vec::new(),
                    evidence: self.evidence,
                    entities: self.entities,
                    identities: self.identities,
                    knowledge: self.knowledge,
                    observations: Vec::new(),
                    current: Vec::new(),
                    receipts: Vec::new(),
                    attention: self.attention,
                    presented: self.presented,
                    appraisals: self.appraisals,
                },
            },
            _custody: custody,
        })
    }

    /// Use the same captured interpretation subjects shown in the private
    /// reflection. Binding does not grant action or a new encounter reference.
    pub fn fund_reflection(
        mut self,
        subjects: Vec<crate::capture::NpcSubjectAlias>,
        workspace: &mut ByteReservation,
    ) -> Result<RuntimeNpcBindingRequest, RuntimeError> {
        if self.purpose != NpcBindingPurpose::Reflection {
            return Err(failure("interpretation subjects require a reflection read"));
        }
        self.identities = subjects;
        self.fund(workspace)
    }
}

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
    action_work_generation: u64,
    attempt_candidates: Arc<Vec<crate::response::ResponseAttemptCandidate>>,
    phase: Arc<AtomicU8>,
    _custody: Arc<ByteReservation>,
    // The stand-alone query continuation moves this selection out of the
    // first ticket. It keeps request aliases and original source ordinals
    // together without cloning the permitted reads or rebuilding them anew.
    query_selection: Option<(NpcBindingSelection, ByteReservation)>,
    pub(super) checks_query_evidence: bool,
}

/// An ordered response from the stand-alone host, with the memory that owns
/// it. The native writer still checks the installed envelope and all effects.
pub struct RuntimeNpcOperations {
    value: crate::records::SqlCell,
    custody: ByteReservation,
}

impl RuntimeNpcOperations {
    /// Fund the three fixed response records and their text before building
    /// a level-one choice. This owns the same response shape as generation;
    /// the native response still validates and applies the captured alias.
    pub fn known_action(
        alias: &str,
        mode: &str,
        budget: &ByteBudget,
    ) -> Result<Self, RuntimeError> {
        use crate::host::retained_size::map_storage;
        use crate::records::SqlCell;
        use std::mem::size_of;

        const ACTION: [&str; 6] = [
            "kind",
            "mode",
            "actionId",
            "verb",
            "targetEntityId",
            "description",
        ];
        const OPERATION: [&str; 7] = [
            "localId",
            "requiresAccepted",
            "talk",
            "think",
            "goal",
            "plan",
            "act",
        ];
        const RESPONSE: [&str; 1] = ["operations"];
        const KNOWN: &str = "known";
        const LOCAL_ID: &str = "action";

        fn backing(keys: &[&str]) -> Option<usize> {
            keys.iter()
                .try_fold(map_storage::<String, SqlCell>(keys.len())?, |bytes, key| {
                    bytes.checked_add(key.len())
                })
        }
        fn record<const N: usize>(keys: [&str; N], values: [SqlCell; N]) -> SqlCell {
            let mut cells = indexmap::IndexMap::with_capacity(N);
            cells.extend(keys.into_iter().map(str::to_owned).zip(values));
            SqlCell::Object(cells)
        }

        let bytes = heap_sum([
            backing(&ACTION).ok_or(CapacityError)?,
            backing(&OPERATION).ok_or(CapacityError)?,
            backing(&RESPONSE).ok_or(CapacityError)?,
            KNOWN.len(),
            LOCAL_ID.len(),
            alias.len(),
            mode.len(),
            size_of::<SqlCell>(),
            size_of::<crate::response::ActorResponse>(),
        ])
        .ok_or(CapacityError)?;
        let custody = budget.reserve(bytes)?;
        let action = record(
            ACTION,
            [
                KNOWN.into(),
                mode.into(),
                alias.into(),
                SqlCell::Null,
                SqlCell::Null,
                SqlCell::Null,
            ],
        );
        let op = record(
            OPERATION,
            [
                LOCAL_ID.into(),
                SqlCell::Array(Vec::new()),
                SqlCell::Null,
                SqlCell::Null,
                SqlCell::Null,
                SqlCell::Null,
                action,
            ],
        );
        Self::new(record(RESPONSE, [SqlCell::Array(vec![op])]), custody)
    }

    /// Move an already funded response into the mutation attempt. Keep the
    /// retained graph funded through waits and release decode workspace here.
    pub fn new(
        value: crate::records::SqlCell,
        mut custody: ByteReservation,
    ) -> Result<Self, RuntimeError> {
        let bytes = crate::response::ActorResponse::retained_bytes(&value).ok_or(CapacityError)?;
        if bytes > custody.bytes() {
            return Err(CapacityError.into());
        }
        custody.resize(bytes)?;
        Ok(Self { value, custody })
    }
}

fn response_failure(error: ResponseEnvelopeError) -> RuntimeError {
    if error.is_capacity() {
        CapacityError.into()
    } else {
        failure(error)
    }
}

impl RuntimeNpcResponseTicket {
    /// Exact original scene and installed limits for the first query offer.
    /// This borrows the owned evidence and performs no new acquisition.
    pub fn received_query_origin(
        &self,
    ) -> Option<(&RuntimeNpcRead, crate::attention::SceneRegionLimits)> {
        Some((
            &self.original,
            self.original.read.perception.query_regions?,
        ))
    }

    pub(super) fn into_query(
        self,
    ) -> Result<(RuntimeNpcRead, RuntimeNpcRead, RuntimeNpcBindingRequest), RuntimeError> {
        let (selection, custody) = self
            .query_selection
            .ok_or_else(|| failure("NPC query selection is unavailable"))?;
        Ok((
            self.original,
            self.current,
            RuntimeNpcBindingRequest {
                request: BindingRequest {
                    decision_id: self.decision_id,
                    selection,
                },
                _custody: custody,
            },
        ))
    }
    pub fn actor_id(&self) -> &str {
        &self.current.read.perception.actor_id
    }

    pub fn original_origin(&self) -> super::RuntimeNpcDecisionOrigin<'_> {
        self.original.decision_origin()
    }

    pub fn receipt_liveness(&self) -> [Weak<AtomicBool>; 2] {
        [
            self.original.receipt_liveness(),
            self.current.receipt_liveness(),
        ]
    }
    /// End an optional relevance disclosure and return the still-owned initial
    /// read. This ticket cannot apply a response or reopen a situation query.
    /// The final decision uses a fresh current read and binds its own evidence.
    pub fn into_recall_origin(self) -> Result<RuntimeNpcRead, RuntimeError> {
        self.require_prepared()?;
        if self.bindings.purpose != NpcBindingPurpose::Recall {
            return Err(failure("NPC recall disclosure has another purpose"));
        }
        Ok(self.original)
    }
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
            .candidates()
            .ok_or_else(|| failure("original NPC choices unavailable"))?;
        let current = ticket
            .current
            .action_catalogue
            .as_ref()
            .map(|catalogue| &catalogue.candidates)
            .or(ticket.current.candidates())
            .ok_or_else(|| failure("current NPC choices unavailable"))?;
        let controls = ticket
            .bindings
            .actions
            .keys()
            .filter(|alias| !ticket.bindings.ordinary_aliases.contains(alias))
            .count();
        let (mut actions, ordinary_aliases, mut action_storage) =
            crate::capture::prepare_ordinary_actions(
                Some(original),
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
        self.begin_npc_response_with(owner, protected, |limits, budget| {
            crate::response::ActorResponse::decode(response, limits, budget)
                .map_err(response_failure)
        })
    }

    /// The application transfers its external decoder's exact operation
    /// fields without another trip through JSON. This is the same candidate
    /// admission, including receipt hashing, as the bytes-based entry point.
    pub fn begin_npc_response_owned(
        &mut self,
        owner: &mut Option<RuntimeNpcResponseTicket>,
        response: RuntimeNpcOperations,
        protected: bool,
    ) -> Result<CandidateKey, RuntimeError> {
        self.begin_npc_response_with(owner, protected, move |limits, budget| {
            if !budget.owns(&response.custody) {
                return Err(failure("NPC response belongs to another native budget"));
            }
            crate::response::ActorResponse::admit(response.value, limits, response.custody)
                .map_err(response_failure)
        })
    }

    fn begin_npc_response_with(
        &mut self,
        owner: &mut Option<RuntimeNpcResponseTicket>,
        protected: bool,
        prepare: impl FnOnce(
            &crate::response::ResponseLimits,
            &ByteBudget,
        ) -> Result<crate::response::ActorResponse, RuntimeError>,
    ) -> Result<CandidateKey, RuntimeError> {
        use crate::response::{
            ResponseAliases, ResponseBindingInput, ResponseBindings, ResponseNativeGuard,
            ResponseReads,
        };
        self.require_active()?;
        if protected && !self.session.save_barrier_complete() {
            return Err(failure("protected response awaits the actual save barrier"));
        }
        let ticket = owner
            .as_ref()
            .ok_or_else(|| failure("NPC response ticket was released"))?;
        ticket.require_prepared()?;
        if !self.npc_host_current(&ticket.original) || !self.npc_host_current(&ticket.current) {
            return Err(stale("native-response-maintenance-boundary"));
        }
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
        let mut response = prepare(
            &simulation.state.installed.actor_response_limits,
            &self.budget,
        )?;
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
        let expected_plan = ticket.action_work_generation;
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
            actions: copies::map(&maps.actions, copies::action),
            entity_ids: maps.entity_ids.clone(),
            expected_plan,
            attempt_bindings: Vec::new(),
            expected_encounters: Some(copies::map(&maps.expected_encounters, Clone::clone)),
            evidence_ids: maps.evidence_ids.clone(),
            knowledge_references: copies::map(&maps.knowledge_references, Clone::clone),
            identity_references: copies::map(&maps.identity_references, Clone::clone),
            entity_leases: copies::map(&maps.entity_leases, Clone::clone),
            situation: Some(copies::situation(&maps.situation)),
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
        action_read: Option<&mut Option<RuntimeNpcRead>>,
    ) -> Result<RuntimeNpcResponseTicket, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(request, &self.budget)?;
        let request: BindingRequest = serde_json::from_slice(request).map_err(failure)?;
        self.bind_npc_response_selected(original, current, request, trigger, action_read, None)
    }

    pub fn bind_npc_response_direct(
        &mut self,
        original: &mut Option<RuntimeNpcRead>,
        current: &mut Option<RuntimeNpcRead>,
        request: RuntimeNpcBindingRequest,
        trigger: Option<&RuntimeNpcTrigger>,
    ) -> Result<RuntimeNpcResponseTicket, RuntimeError> {
        self.require_active()?;
        let RuntimeNpcBindingRequest { request, _custody } = request;
        self.bind_npc_response_selected(original, current, request, trigger, None, Some(_custody))
    }

    fn bind_npc_response_selected(
        &mut self,
        original: &mut Option<RuntimeNpcRead>,
        current: &mut Option<RuntimeNpcRead>,
        request: BindingRequest,
        trigger: Option<&RuntimeNpcTrigger>,
        mut action_read: Option<&mut Option<RuntimeNpcRead>>,
        selection_storage: Option<ByteReservation>,
    ) -> Result<RuntimeNpcResponseTicket, RuntimeError> {
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
        let action = action_read.as_deref().and_then(Option::as_ref);
        if !self.npc_host_current(first)
            || !self.npc_host_current(fresh)
            || action.is_some_and(|read| !self.npc_host_current(read))
        {
            return Err(stale("native-response-maintenance-boundary"));
        }
        if action.is_some_and(|action| {
            action.serial == first.serial
                || action.serial == fresh.serial
                || action.candidate_key.is_some()
                || action.candidates().is_none()
                || fresh.action_catalogue.is_some()
                || request.selection.purpose != NpcBindingPurpose::Decision
                || !crate::response::ResponseReads::compatible(&fresh.read, &action.read)
        }) {
            return Err(failure(
                "NPC action refresh is not an independent compatible read",
            ));
        }
        if first.serial == fresh.serial
            || first.candidate_key.is_some()
            || fresh.candidate_key.is_some()
            || matches!(&fresh.preparation, Some(PreparedNpcRead::Recall(_)))
                && !matches!(
                    request.selection.purpose,
                    NpcBindingPurpose::Recall | NpcBindingPurpose::Reflection
                )
        {
            return Err(failure("NPC response capture is unavailable"));
        }
        let simulation = self.session.accepted().map_err(failure)?;
        if let Some(reason) = first
            .historical_scope
            .refusal(&simulation.state)
            .or_else(|| fresh.historical_scope.refusal(&simulation.state))
            .or_else(|| action.and_then(|read| read.historical_scope.refusal(&simulation.state)))
        {
            return Err(stale(reason));
        }
        let candidates = fresh.candidates();
        let action_candidates = action.and_then(RuntimeNpcRead::candidates).or_else(|| {
            fresh
                .action_catalogue
                .as_ref()
                .map(|catalogue| &catalogue.candidates)
        });
        let action_perception = action.map(|read| read.read.as_ref()).or_else(|| {
            fresh
                .action_catalogue
                .as_ref()
                .map(|catalogue| catalogue.read.as_ref())
        });
        let mut bindings = NpcBindingMaps::prepare(
            &simulation.state,
            NpcBindingRead {
                original: &first.read,
                current: &fresh.read,
                references: &fresh.reference_facts,
                original_references: &first.reference_facts,
                sources: &first.sources,
                perspectives: &first.perspectives,
                current_selection: fresh.preparation.as_ref().map(PreparedNpcRead::selection),
                candidates,
                original_candidates: first.candidates(),
                action_read: action_perception,
                action_candidates,
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
            NpcCatalogueSource::Original => first.candidates(),
            NpcCatalogueSource::Current => action
                .and_then(RuntimeNpcRead::candidates)
                .or(action_candidates)
                .or(candidates),
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
        let action_work_generation = action.map_or_else(
            || {
                fresh
                    .action_catalogue
                    .as_ref()
                    .map_or(fresh.work_generation, |catalogue| catalogue.work_generation)
            },
            |read| read.work_generation,
        );
        // Preserve only the physical catalogue and its acquisition for the
        // one query continuation. Context aliases keep their originating read.
        let action_catalogue = action_read
            .as_deref_mut()
            .and_then(Option::take)
            .map(|mut read| {
                let Some(PreparedNpcRead::Offers(candidates)) = read.preparation.take() else {
                    return Err(failure("NPC action catalogue unavailable"));
                };
                Ok::<_, RuntimeError>(super::RuntimeNpcActionCatalogue {
                    read: Arc::clone(&read.read),
                    candidates,
                    work_generation: read.work_generation,
                    _custody: Arc::clone(&read._custody),
                })
            })
            .transpose()?;
        if let Some(catalogue) = action_catalogue {
            current
                .as_mut()
                .ok_or_else(|| failure("current NPC read was released"))?
                .action_catalogue = Some(catalogue);
        }
        let checks_query_evidence = first.query_expanded && selection_storage.is_some();
        let query_selection = selection_storage
            .filter(|_| {
                request.selection.purpose == NpcBindingPurpose::Decision && !first.query_expanded
            })
            .map(|storage| (request.selection, storage));
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
            action_work_generation,
            attempt_candidates: Arc::new(attempt_candidates),
            phase: Arc::new(AtomicU8::new(FRESH)),
            _custody: Arc::new(custody),
            query_selection,
            checks_query_evidence,
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
