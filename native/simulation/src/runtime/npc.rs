//! Detached NPC first-person facts retain their actual native evidence owner.
//! Reading these facts grants neither an executable response nor a current
//! source lease; the context producer must bind those independently.
mod trade;

use super::*;
use crate::appraisals::AppraisalScope;
use crate::capture::{
    NpcOfferCoverage, PreparedNpcCandidates, PreparedNpcRead,
    npc_self::{RuntimeNpcSelf, RuntimeNpcSelfSelection},
};
use crate::host::PublicationLease;
use crate::simulation::{AcceptedActorRead, ActorReadError};
use std::mem::size_of;
use std::sync::atomic::AtomicBool;

mod bindings;
mod held_sources;
mod history;
pub use history::RuntimeNpcHistoryWindow;
mod knowledge;
pub use knowledge::RuntimeNpcSubjectNote;
mod appraisal_read;
mod identity_read;
pub use identity_read::RuntimeNpcIdentity;
mod origin;
mod personal;
mod perspectives;
mod stage_history;
pub use stage_history::RuntimeNpcStageWitness;
mod presentation;
mod queries;
pub use crate::appraisals::{RuntimeNpcFeeling, RuntimeNpcFeelingTarget, RuntimeNpcFeelings};
pub use crate::response::{AppraisalSelection, AppraisalSourceAlias, PersonalOrdinal};
pub use appraisal_read::RuntimeNpcAppraisalRecord;
pub(super) use bindings::ActiveNpcResponse;
pub use bindings::{
    RuntimeNpcBindingInput, RuntimeNpcBindingRequest, RuntimeNpcConsumer, RuntimeNpcOperations,
    RuntimeNpcResponseTicket,
};
pub(super) use held_sources::HeldReceiptRegistry;
pub(crate) use held_sources::HeldSourceProof;
pub use origin::{RuntimeNpcDecisionFrame, RuntimeNpcDecisionOrigin};
pub use personal::{RuntimeNpcGuardThreat, RuntimeNpcPersonalSource, RuntimeNpcPersonalSources};
pub use presentation::{RuntimeNpcObservedBody, RuntimeNpcPresentedBody};
pub use queries::{
    RuntimeNpcBoundaryFact, RuntimeNpcHistoricalPose, RuntimeNpcSeparation,
    RuntimeNpcSeparationEvidence,
};

/// A brief dispatch gate, never retained while SQL or a provider is awaited.
/// Historical disclosure and current response semantics are separate routes.
pub struct RuntimeNpcPublication {
    _lease: PublicationLease,
}

pub struct RuntimeNpcOffer<'a> {
    pub native_id: &'a str,
    pub description: Option<&'a crate::text::JsText>,
    pub no_intervention: bool,
    pub transition: &'static str,
}

pub struct NpcChoiceRecovery {
    pub original: RuntimeNpcRead,
    pub request: RuntimeNpcBindingRequest,
    pub remaining: Vec<String>,
    pub _custody: ByteReservation,
}

pub struct RuntimeNpcRead {
    pub(super) read: Arc<AcceptedActorRead>,
    own: Option<RuntimeNpcSelf>,
    pub(super) serial: u64,
    history: crate::experience::CapturedHistoryCuts,
    pub(super) historical_scope: Arc<crate::capture::NpcHistoricalScope>,
    stage_cut: Option<stage_history::StageCut>,
    reference_facts: crate::capture::NpcReferenceFacts,
    required_notes: Option<Box<knowledge::RequiredNotes>>,
    preparation: Option<PreparedNpcRead>,
    action_catalogue: Option<RuntimeNpcActionCatalogue>,
    intent_ids: Vec<String>,
    pub(super) work_generation: u64,
    pub(super) host_generation: u64,
    sources: Arc<Vec<crate::capture::PreparedNpcSources>>,
    perspectives: Arc<Vec<crate::capture::NpcPerspectiveSnapshot>>,
    activity_inspection: Option<Box<super::RuntimeActivityInspection>>,
    candidate_key: Option<CandidateKey>,
    query_expanded: bool,
    receipt_payload: Arc<AtomicBool>,
    _custody: Arc<ByteReservation>,
}

/// A later physical catalogue can survive the one situation-query reopen
/// without replacing the context's original body, source or reference cut.
struct RuntimeNpcActionCatalogue {
    read: Arc<AcceptedActorRead>,
    candidates: PreparedNpcCandidates,
    work_generation: u64,
    _custody: Arc<ByteReservation>,
}
impl Drop for RuntimeNpcRead {
    fn drop(&mut self) {
        self.receipt_payload.store(false, Ordering::Release);
    }
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
    pub(super) fn npc_host_current(&self, read: &RuntimeNpcRead) -> bool {
        self.work_is_current(read.host_generation)
    }

    /// One query continuation moves the actual read owners back to preparation.
    /// Serialized context can neither recreate a read nor replace its old cut.
    pub fn open_npc_response(
        &self,
        ticket: &mut Option<RuntimeNpcResponseTicket>,
    ) -> Result<(RuntimeNpcRead, RuntimeNpcRead), RuntimeError> {
        let owned = self.take_npc_response_for_query(ticket)?;
        Ok((owned.original, owned.current))
    }

    /// Recover the funded selection alongside the exact captured reads.
    /// A second binding must recheck the permissions of this same evidence.
    pub fn open_npc_response_direct(
        &self,
        ticket: RuntimeNpcResponseTicket,
    ) -> Result<
        (
            RuntimeNpcRead,
            RuntimeNpcRead,
            RuntimeNpcBindingRequest,
            crate::attention::SceneAttentionPolicy,
        ),
        RuntimeError,
    > {
        self.npc_response_publication(&ticket)?.map_err(stale)?;
        let policy = self
            .session
            .accepted()
            .map_err(failure)?
            .state
            .installed
            .attention
            .value()
            .scene
            .clone();
        let (first, current, request) = self
            .take_npc_response_for_query(&mut Some(ticket))?
            .into_query()?;
        Ok((first, current, request, policy))
    }

    /// A settled sole native refusal carries its original read and selected
    /// source ordinals into one re-preparation. Do not disclose the old action
    /// set: its physical feasibility is the very thing that changed.
    pub fn reopen_refused_npc_choice(
        &self,
        ticket: RuntimeNpcResponseTicket,
        alias: &str,
        code: &str,
    ) -> Result<Box<NpcChoiceRecovery>, RuntimeError> {
        self.npc_response_application(&ticket)?.map_err(stale)?;
        let state = &self.session.accepted().map_err(failure)?.state;
        let concrete = state
            .responses
            .get(&ticket.decision_id)
            .is_some_and(|receipt| {
                !receipt.outcome.ok
                    && receipt.outcome.code == "response-rejected"
                    && receipt.components.len() == 1
                    && receipt
                        .components
                        .get("action")
                        .is_some_and(|action| !action.ok && action.code == code)
            });
        if !concrete {
            return Err(stale("native-choice-recovery-receipt"));
        }
        let (remaining, mut custody) = ticket.remaining_choices(alias, &self.budget)?;
        custody.merge(self.budget.reserve(size_of::<NpcChoiceRecovery>())?)?;
        let (original, _previous, request) = ticket.into_query()?;
        Ok(Box::new(NpcChoiceRecovery {
            original,
            request,
            remaining,
            _custody: custody,
        }))
    }

    fn take_npc_response_for_query(
        &self,
        ticket: &mut Option<RuntimeNpcResponseTicket>,
    ) -> Result<RuntimeNpcResponseTicket, RuntimeError> {
        self.require_active()?;
        let checked = ticket
            .as_ref()
            .ok_or_else(|| failure("NPC response was released"))?;
        checked.require_prepared()?;
        if checked.bindings.purpose == crate::capture::NpcBindingPurpose::Recall
            || checked.original.query_expanded
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
        Ok(owned)
    }

    pub fn npc_history_publication(
        &self,
        read: &RuntimeNpcRead,
        input: &[u8],
    ) -> Result<Result<RuntimeNpcPublication, &'static str>, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let request: NpcPublicationRequest = serde_json::from_slice(input).map_err(failure)?;
        match self.npc_history_permitted(read, &request.consumer, &request.perspectives)? {
            Ok(()) => Ok(Ok(RuntimeNpcPublication {
                _lease: self.session.fence().begin_publication().map_err(failure)?,
            })),
            Err(reason) => Ok(Err(reason)),
        }
    }

    /// The paid retrieval query contains only the admitted historical trigger
    /// and this actor's own context. It does not transfer any physical catalogue.
    pub fn npc_memory_query_publication(
        &self,
        read: &RuntimeNpcRead,
        consumer: RuntimeNpcConsumer,
    ) -> Result<Option<super::RuntimeMaintenancePublication>, RuntimeError> {
        self.require_active()?;
        if self
            .npc_history_permitted(read, consumer.as_str(), &[])?
            .is_err()
        {
            return Ok(None);
        }
        let state = &self.session.accepted().map_err(failure)?.state;
        let actor = &read.read.perception.actor_id;
        if read
            .sources
            .iter()
            .any(|source| !source.scope.still_permitted(state))
            || !read
                .current_self()?
                .prompt()
                .is_some_and(|own| own.memory_query_current(state, actor))
        {
            return Ok(None);
        }
        let storage = self
            .budget
            .reserve(std::mem::size_of::<super::RuntimeMaintenancePublication>())?;
        super::RuntimeMaintenancePublication::admit(self.session.fence(), storage).map(Some)
    }

    fn npc_history_permitted(
        &self,
        read: &RuntimeNpcRead,
        consumer: &str,
        perspectives: &[crate::capture::NpcPerspectiveOrdinal],
    ) -> Result<Result<(), &'static str>, RuntimeError> {
        let simulation = self.session.accepted().map_err(failure)?;
        if !self.npc_host_current(read) {
            return Ok(Err("native-response-maintenance-boundary"));
        }
        if read.candidate_key.is_some() {
            return Ok(Err("native-history-uses-candidate"));
        }
        if !read.historical_scope.still_permitted(&simulation.state) {
            return Ok(Err("native-history-scope"));
        }
        if !crate::capture::npc_perspectives_current(
            &simulation.state,
            &read.read.perception.actor_id,
            &read.perspectives,
            perspectives,
            &self.budget,
        )
        .map_err(failure)?
        {
            return Ok(Err("native-history-perspectives"));
        }
        if !npc_consumer_current(
            &simulation.state,
            &read.read.perception.actor_id,
            consumer,
            None,
        )
        .map_err(failure)?
        {
            return Ok(Err("native-history-consumer"));
        }
        Ok(Ok(()))
    }

    pub fn npc_response_publication(
        &self,
        ticket: &RuntimeNpcResponseTicket,
    ) -> Result<Result<RuntimeNpcPublication, &'static str>, RuntimeError> {
        self.npc_response_authority(ticket, true)
    }

    /// Applying an answer checks the selected gift at the consent writer.
    /// An unused choice's deadline cannot discard independent effects.
    pub fn npc_response_application(
        &self,
        ticket: &RuntimeNpcResponseTicket,
    ) -> Result<Result<RuntimeNpcPublication, &'static str>, RuntimeError> {
        self.npc_response_authority(ticket, false)
    }

    fn npc_response_authority(
        &self,
        ticket: &RuntimeNpcResponseTicket,
        disclosure: bool,
    ) -> Result<Result<RuntimeNpcPublication, &'static str>, RuntimeError> {
        use crate::response::ResponseValidityRoute;
        self.require_active()?;
        if !self.npc_host_current(&ticket.original) || !self.npc_host_current(&ticket.current) {
            return Ok(Err("native-response-maintenance-boundary"));
        }
        if !ticket.publication_available() {
            return Ok(Err("native-response-ticket"));
        }
        let state = &self.session.accepted().map_err(failure)?.state;
        let actor_id = &ticket.current.read.perception.actor_id;
        // Paid source disclosure follows the admitted consumer's Source gate.
        // Paused/participating/response-body checks belong to the actual
        // response effect owner; source-only reflection has its own native
        // maintenance admission and must not inherit a chat/action gate here.
        if !ticket.original.historical_scope.still_permitted(state) {
            return Ok(Err("native-response-original-history"));
        }
        if !ticket.current.historical_scope.still_permitted(state) {
            return Ok(Err("native-response-current-history"));
        }
        if !ticket
            .current
            .required_notes_current(state, &self.budget)
            .map_err(failure)?
        {
            return Ok(Err("native-response-private-note"));
        }
        if let Some(inspection) = &ticket.original.activity_inspection
            && !inspection.decision_current(state, actor_id, &self.budget)?
        {
            return Ok(Err("native-response-activity-inspection"));
        }
        if ticket
            .original
            .sources
            .iter()
            .any(|source| !source.scope.still_permitted(state))
        {
            return Ok(Err("native-response-additional-history"));
        }
        if disclosure {
            for choice in ticket
                .original
                .learned_activity_sources()
                .chain(ticket.current.learned_activity_sources())
            {
                if choice
                    .current(state, actor_id, &self.budget)
                    .map_err(failure)?
                    .is_none()
                {
                    return Ok(Err("native-response-learned-activity"));
                }
            }
        }
        if disclosure
            && !crate::handover::GiftSource::choices_current(
                state,
                actor_id,
                ticket.bindings.actions.values().filter_map(|choice| {
                    choice
                        .handover
                        .as_ref()
                        .and_then(crate::handover::NpcHandover::source)
                }),
                &self.budget,
            )
            .map_err(failure)?
        {
            return Ok(Err("native-response-gift-terms"));
        }
        if disclosure
            && ticket
                .bindings
                .actions
                .values()
                .filter_map(|choice| choice.handover.as_ref())
                .any(|choice| {
                    choice
                        .trade_evidence()
                        .is_some_and(|evidence| !evidence.current(state, actor_id, choice.target()))
                })
        {
            return Ok(Err("native-response-trade-disclosure"));
        }
        if ticket.checks_query_evidence {
            let cut = &ticket.original.read.perception.evidence;
            let law = state.installed.account_law();
            use crate::experience::EvidenceCutMember;
            let situation = &ticket.bindings.situation;
            if !crate::response::receipt_sources_current(state, actor_id, situation)
                .map_err(failure)?
            {
                return Ok(Err("native-response-query-receipts"));
            }
            let current = situation
                .current_references
                .values()
                .copied()
                .map(EvidenceCutMember::Current);
            let acquired = situation
                .observation_references
                .values()
                .filter_map(|observation| match observation {
                    crate::response::ResponseObservation::Acquired(ordinal) => {
                        Some(EvidenceCutMember::Acquired(*ordinal))
                    }
                    crate::response::ResponseObservation::Personal(_) => None,
                });
            if current.chain(acquired).any(|member| {
                !crate::experience::evidence_cut_member_eligible(
                    &state.experience,
                    &state.physical.entities,
                    cut,
                    member,
                    &law,
                )
            }) {
                return Ok(Err("native-response-query-evidence"));
            }
        }
        if !npc_consumer_current(
            state,
            actor_id,
            ticket.bindings.consumer.as_str(),
            Some(&ticket.decision_id),
        )
        .map_err(failure)?
        {
            return Ok(Err("native-response-consumer"));
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
            return Ok(Err("native-response-original-outcomes"));
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
        if !current {
            return Ok(Err(match ticket.bindings.validity {
                ResponseValidityRoute::Decision => "native-response-decision-witness",
                ResponseValidityRoute::PreparedResponse => "native-response-prepared-witness",
                ResponseValidityRoute::Source => "native-response-source-witness",
            }));
        }
        if !crate::capture::npc_perspectives_current(
            state,
            actor_id,
            &ticket.original.perspectives,
            &ticket.bindings.perspectives,
            &self.budget,
        )
        .map_err(failure)?
        {
            return Ok(Err("native-response-perspectives"));
        }
        if !ticket
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
            return Ok(Err("native-response-appraisals"));
        }
        Ok(Ok(RuntimeNpcPublication {
            _lease: self.session.fence().begin_publication().map_err(failure)?,
        }))
    }

    pub fn read_npc(&mut self, request: &[u8]) -> Result<RuntimeNpcRead, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(request, &self.budget)?;
        let request: NpcReadRequest = serde_json::from_slice(request).map_err(failure)?;
        self.read_npc_with_presentation(
            &request.actor_id,
            &request.consumer,
            &request.required_appraisals,
            None,
            false,
        )
    }

    /// The Rust formatter borrows received presentation from the detached
    /// native read and needs no bridge scene bytes.
    pub fn read_npc_direct(
        &mut self,
        actor: &str,
        consumer: &str,
        stage_capture: bool,
    ) -> Result<RuntimeNpcRead, RuntimeError> {
        self.read_npc_with_presentation(
            actor, consumer, &[], Some(RuntimeNpcSelfSelection::Prompt), stage_capture,
        )
    }

    /// Retain the original pose and source bindings before recall and model
    /// preparation. This origin will not render a current prompt's self fields.
    pub fn read_npc_origin(
        &mut self,
        actor: &str,
        consumer: &str,
        stage_capture: bool,
    ) -> Result<RuntimeNpcRead, RuntimeError> {
        self.read_npc_with_presentation(
            actor, consumer, &[], Some(RuntimeNpcSelfSelection::Frame), stage_capture,
        )
    }

    fn read_npc_with_presentation(
        &mut self,
        actor_id: &str,
        consumer: &str,
        required_appraisals: &[AppraisalScope],
        selection: Option<RuntimeNpcSelfSelection>,
        stage_capture: bool,
    ) -> Result<RuntimeNpcRead, RuntimeError> {
        self.require_active()?;
        let serial = self
            .next_read_serial
            .checked_add(1)
            .filter(|serial| *serial <= crate::identity::MAX_SAFE_INTEGER)
            .ok_or_else(|| failure("read identity exhausted"))?;
        let simulation = self.session.accepted().map_err(failure)?;
        if !npc_consumer_current(&simulation.state, actor_id, consumer, None).map_err(failure)? {
            return Err(failure("NPC consumer is no longer eligible"));
        }
        let mut read = simulation
            .read_npc(actor_id, required_appraisals, selection, &self.budget)
            .map_err(|error| match (selection, error) {
                (Some(_), ActorReadError::Capture(error)) => session_failure(error.into()),
                (Some(_), ActorReadError::Busy) => fence_failure(FenceError::Busy),
                (_, error) => failure(error),
            })?;
        let history = crate::experience::capture_history_cuts(
            &simulation.state,
            std::iter::once(actor_id),
            &self.budget,
        )
        .map_err(failure)?;
        let mut historical_scope = crate::capture::NpcHistoricalScope::capture(
            &simulation.state, &read, serial, &self.budget,
        ).map_err(failure)?;
        historical_scope.stage_capture = stage_capture && consumer == "chat";
        let stage_cut = if historical_scope.stage_capture
            && matches!(selection, Some(RuntimeNpcSelfSelection::Prompt))
        {
            stage_history::StageCut::capture(&simulation.state, actor_id)
        } else {
            None
        };
        let historical_scope = Arc::new(historical_scope);
        let reference_facts =
            crate::capture::NpcReferenceFacts::capture(&simulation.state, &read, &self.budget)
                .map_err(failure)?;
        let attempts = &simulation
            .state
            .physical
            .entities
            .get(actor_id)
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
            .get(actor_id)
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
                        n.checked_add(8 * size_of::<usize>() + 4 * std::mem::align_of::<usize>())?
                            .checked_add(held_sources::marker_backing_bytes())
                    })
                    .ok_or_else(|| failure("capacity"))?,
            )
            .map_err(failure)?;
        let intent_ids = attempts.iter().map(|attempt| attempt.id.clone()).collect();
        self.next_read_serial = serial;
        Ok(RuntimeNpcRead {
            own: read.take_npc_self(),
            read: Arc::new(read),
            serial,
            history,
            historical_scope,
            stage_cut,
            reference_facts,
            required_notes: None,
            preparation: None,
            action_catalogue: None,
            intent_ids,
            work_generation,
            host_generation: self.session.operational_generation(),
            sources: Arc::new(Vec::new()),
            perspectives: Arc::new(Vec::new()),
            activity_inspection: None,
            candidate_key: None,
            query_expanded: false,
            receipt_payload: Arc::new(AtomicBool::new(true)),
            _custody: Arc::new(custody),
        })
    }
    pub fn begin_npc_candidates(
        &mut self,
        read: &mut RuntimeNpcRead,
        request: &[u8],
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        read.require_unprepared()?;
        let _decode = decode_preparation(request, &self.budget)?;
        let request: CandidateRequest = serde_json::from_slice(request).map_err(failure)?;
        self.begin_npc_context(
            read,
            &request.expanded_body_ordinals,
            Some(request.coverage),
            None,
            None,
        )
    }

    /// Prepare the current suggested physical choices from the original cut.
    pub fn begin_npc_suggestions(
        &mut self,
        read: &mut RuntimeNpcRead,
        inspection: Option<crate::activity::ActivityInspectionNavigation>,
        guard_threat: Option<RuntimeNpcGuardThreat>,
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        read.require_unprepared()?;
        self.begin_npc_context(
            read,
            &[],
            Some(NpcOfferCoverage::Suggestions),
            inspection,
            guard_threat,
        )
    }

    /// Prepare remaining work and bind current presented bodies for recall.
    /// The prepared read owns its work display and leases until review ends.
    pub fn begin_npc_recall(
        &mut self,
        read: &mut RuntimeNpcRead,
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        read.require_unprepared()?;
        self.begin_npc_context(read, &[], None, None, None)
    }

    fn begin_npc_context(
        &mut self,
        read: &mut RuntimeNpcRead,
        expanded: &[usize],
        coverage: Option<NpcOfferCoverage>,
        inspection: Option<crate::activity::ActivityInspectionNavigation>,
        guard_threat: Option<RuntimeNpcGuardThreat>,
    ) -> Result<CandidateKey, RuntimeError> {
        let key = self
            .session
            .begin_npc_candidates(&read.read, expanded, coverage, inspection, guard_threat)
            .map_err(failure)?;
        read.candidate_key = Some(key);
        Ok(key)
    }
    pub fn step_npc_preparation(
        &mut self,
        read: &mut RuntimeNpcRead,
        key: CandidateKey,
        answer: Option<(&RuntimeProvider, RuntimeProviderInput)>,
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
            SessionStep::Question(question) => match self.prepare_provider(key, question) {
                Ok(provider) => RuntimeNpcPreparationStep::Provider(provider),
                Err(error) => {
                    read.candidate_key = None;
                    return Err(error);
                }
            },
            SessionStep::NpcCandidates(prepared) => {
                read.preparation = Some(prepared);
                read.candidate_key = None;
                RuntimeNpcPreparationStep::Complete
            }
            SessionStep::NpcSources(sources) => {
                read.candidate_key = None;
                self.retain_npc_sources(read, sources)?;
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
        let _decode = decode_preparation(request, &self.budget)?;
        let request = serde_json::from_slice(request).map_err(failure)?;
        self.begin_npc_sources_direct(read, request)
    }

    /// Move the exact ordinal selection into the read's owning candidate.
    /// The candidate admits its actual selection backing before retaining it.
    pub fn begin_npc_sources_direct(
        &mut self,
        read: &mut RuntimeNpcRead,
        request: crate::capture::NpcSourceSelection,
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        if read.candidate_key.is_some() {
            return Err(failure("NPC read preparation is active"));
        }
        self.reserve_npc_inventory(read)?;
        let key = self
            .session
            .begin_npc_sources(Arc::clone(&read.historical_scope), request)
            .map_err(failure)?;
        read.candidate_key = Some(key);
        Ok(key)
    }

    fn reserve_npc_inventory(&self, read: &mut RuntimeNpcRead) -> Result<(), RuntimeError> {
        if Arc::strong_count(&read.sources) != 1 || Arc::strong_count(&read._custody) != 1 {
            return Err(failure(
                "NPC source preparation is still retained by an execution",
            ));
        }
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
        Ok(())
    }

    fn retain_npc_sources(
        &mut self,
        read: &mut RuntimeNpcRead,
        sources: crate::capture::PreparedNpcSources,
    ) -> Result<usize, RuntimeError> {
        sources
            .validate_origin(&read.read, &self.budget)
            .map_err(failure)?;
        self.held_receipts
            .register(&sources, &read.receipt_payload, &self.budget)
            .map_err(failure)?;
        let inventories = Arc::get_mut(&mut read.sources)
            .ok_or_else(|| failure("NPC sources are already issued"))?;
        let ordinal = inventories.len();
        inventories.push(sources);
        Ok(ordinal)
    }

    /// Only the live session can bind a withdrawal proof to the actor's actual
    /// current physical life. Node cannot construct this retained-source grant.
    pub(super) fn held_source_proof(
        &mut self,
        actor_id: &str,
        source_id: &str,
    ) -> Result<Option<HeldSourceProof>, RuntimeError> {
        self.require_active()?;
        let generation = self.session.operational_generation();
        let simulation = self.session.accepted().map_err(failure)?;
        let Some(actor) = simulation
            .state
            .physical
            .entities
            .get(actor_id)
            .and_then(|entity| entity.actor.as_ref())
        else {
            return Ok(None);
        };
        self.held_receipts
            .prove(
                generation,
                actor_id,
                actor.physical_life.unwrap_or(0),
                source_id,
                &simulation.state.installed.account_law(),
                &self.budget,
            )
            .map_err(failure)
    }
}

impl RuntimeNpcRead {
    /// Retain the exact approved page's sources through decision dispatch,
    /// the optional query continuation and final effects.
    pub fn retain_activity_inspection(&mut self, read: super::RuntimeActivityInspection) {
        self.activity_inspection = Some(Box::new(read));
    }

    fn require_unprepared(&self) -> Result<(), RuntimeError> {
        if self.candidate_key.is_some() || self.preparation.is_some() {
            return Err(failure(
                "NPC choices were already prepared or preparation is active",
            ));
        }
        Ok(())
    }

    /// Historical prompt capture is optional. A selected personal method's
    /// source and binding need their own historical witness before this kind
    /// of prompt can be retained.
    pub(super) fn has_learned_activity_offer(&self) -> bool {
        self.learned_activity_sources().next().is_some()
    }

    fn learned_activity_sources(
        &self,
    ) -> impl Iterator<Item = &crate::activity::LearnedSpeechSource> {
        let direct = self
            .preparation
            .as_ref()
            .into_iter()
            .flat_map(|read| match read {
                PreparedNpcRead::Offers(_) => None,
                PreparedNpcRead::Recall(_) => Some(read.work_context()),
            })
            .flat_map(|work| work.learned_sources());
        self.candidates()
            .into_iter()
            .chain(self.action_catalogue.as_ref().map(|held| &held.candidates))
            .flat_map(PreparedNpcCandidates::learned_sources)
            .chain(direct)
    }

    fn candidates(&self) -> Option<&PreparedNpcCandidates> {
        match &self.preparation {
            Some(PreparedNpcRead::Offers(candidates)) => Some(candidates),
            _ => None,
        }
    }

    pub fn receipt_liveness_backing_bytes() -> usize {
        held_sources::marker_backing_bytes()
    }
    /// A wrapper may revoke its actual data payload while native cleanup is
    /// queued. Moving that payload into a ticket does not revoke this marker.
    pub fn receipt_liveness(&self) -> Weak<AtomicBool> {
        Arc::downgrade(&self.receipt_payload)
    }
    pub fn candidate_key(&self) -> Option<CandidateKey> {
        self.candidate_key
    }

    pub fn current_self(&self) -> Result<&RuntimeNpcSelf, RuntimeError> {
        self.own
            .as_ref()
            .ok_or_else(|| failure("Typed NPC self is unavailable"))
    }

    /// Take the originating pose with its custody. Its other evidence remains
    /// available to the ticket through the original immutable read.
    pub fn take_origin_frame(&mut self) -> Result<RuntimeNpcDecisionFrame, RuntimeError> {
        Ok(self
            .own
            .take()
            .ok_or_else(|| failure("The original NPC pose is unavailable"))?
            .into_frame())
    }

    /// A completed recall projection no longer needs this independent input.
    /// Retained bindings and bridge data still use their own accepted read.
    pub fn release_current_self(&mut self) {
        self.own = None;
    }

    pub fn accepted_cut(&self) -> u64 {
        self.read.accepted_cut
    }

    /// Describe executable choices in their native ordinal order. The
    /// read still owns the commands and the actual bindings.
    pub fn decision_offers(
        &self,
    ) -> Result<impl ExactSizeIterator<Item = RuntimeNpcOffer<'_>>, RuntimeError> {
        use crate::commands::WorkTransitionMode;
        Ok(self
            .candidates()
            .ok_or_else(|| failure("NPC choices are unavailable"))?
            .offers()
            .iter()
            .map(|offer| RuntimeNpcOffer {
                native_id: &offer.id,
                description: offer.description.as_ref(),
                no_intervention: !offer.command.has_command(),
                transition: match offer.transition {
                    WorkTransitionMode::Continue => "continue",
                    WorkTransitionMode::Enqueue => "enqueue",
                    WorkTransitionMode::Replace => "replace",
                    WorkTransitionMode::Interrupt => "interrupt",
                },
            }))
    }
    /// Preparation adds a finite product to the same read. Re-encoding its
    /// immutable base would make every retained formatter pin another copy.
    pub fn candidates_packet(&self, budget: &ByteBudget) -> Result<RuntimeJson, RuntimeError> {
        let candidates = self
            .candidates()
            .ok_or_else(|| failure("NPC choices are unavailable"))?;
        let (encoded, custody) = candidates
            .write_json(budget)
            .map_err(|error| session_failure(error.into()))?;
        // This standalone packet already owns the complete wire encoding.
        // Moving the backing keeps its existing reservation through export.
        Ok(RuntimeJson {
            bytes: encoded.into_bytes(),
            custody,
            handoff: None,
        })
    }
    pub fn latest_sources_packet(&self, budget: &ByteBudget) -> Result<RuntimeJson, RuntimeError> {
        #[derive(serde::Serialize)]
        struct Selection<'a> {
            ordinal: usize,
            inventory: &'a crate::capture::PreparedNpcSources,
        }
        let ordinal = self
            .sources
            .len()
            .checked_sub(1)
            .ok_or_else(|| failure("NPC sources are unavailable"))?;
        RuntimeJson::encode(
            &Selection {
                ordinal,
                inventory: &self.sources[ordinal],
            },
            budget,
        )
    }

    /// Detached activity titles already selected by the accepted work read.
    /// Missing plans and existing plans with no remaining steps stay distinct.
    pub fn remaining_plan(
        &self,
        paused: bool,
    ) -> Result<Option<&[crate::activity::ActivityView]>, RuntimeError> {
        Ok(self
            .preparation
            .as_ref()
            .ok_or_else(|| failure("NPC work context is unavailable"))?
            .work_context()
            .remaining_views(paused))
    }

    /// Borrow the installed interpretation for this captured cut. The
    /// appraisal records and currentness checks remain with the native read.
    pub fn feelings(&self) -> Result<&RuntimeNpcFeelings, RuntimeError> {
        self.read
            .appraisal_read()
            .and_then(|read| read.direct())
            .ok_or_else(|| failure("NPC appraisal capture is unavailable"))
    }

    /// Choices already selected and funded by the finite catalogue. The host
    /// still maps entity choices to the exact references disclosed in its prompt.
    pub fn activity_facts(&self) -> Result<crate::capture::NpcActivityFacts<'_>, RuntimeError> {
        Ok(self
            .candidates()
            .ok_or_else(|| failure("NPC choices are unavailable"))?
            .activity_facts())
    }

    pub fn packet(&self, budget: &ByteBudget) -> Result<RuntimeJson, RuntimeError> {
        let (perception, _perception_custody) = self
            .read
            .perception
            .write_json(budget)
            .map_err(|error| session_failure(error.into()))?;
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
            .candidates()
            .map(|candidates| candidates.write_json(budget))
            .transpose()
            .map_err(|error| session_failure(error.into()))?;
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
