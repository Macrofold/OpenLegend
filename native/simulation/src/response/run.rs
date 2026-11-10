//! One supplied decision owns component chronology, child transactions and its
//! final receipt. Provider replies are finite preparation, never completion of
//! a command, occurrence, personal account or private knowledge mutation.
use super::actions::{self, ActionIntent};
use super::digest::ResponseDigest;
use super::*;
use crate::appraisals::{AppraisalChangeCursor, AppraisalChangeStep, AppraisalPublication};
use crate::commands::{
    CommandChoiceAnswer, CommandChoiceCursor, CommandChoiceStep, CommandCursor, CommandOperation,
    CommandOperationError, CommandOptions, CompletedActivityDisplay, CompletedCommandOperation,
    InvocationCursor, InvocationStep, NativeCommand,
};
use crate::events::{
    CompletedEvent, CompletedOccurrence, EventAccountPlacement, EventCursor, WorldEvent,
    begin_staged_occurrence,
};
use crate::execution::{CandidateCheckpoint, CoreMutation, StagedOccurrence};
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries};
use crate::host::CandidateKey;
use crate::language::{
    AttemptNormalizationAnswer, AttemptNormalizationRequest, NormalizedAttemptFacts,
};
use crate::plans::{
    PlanControlCursor, PlanControlKind, PlanControlStep, PlanEditCursor, PlanEditInput,
    PlanEditStep,
};
use crate::records::SqlCell;
use crate::text::JsText;
use std::sync::Arc;

pub(crate) enum ResponseAnswer {
    AppraisalCreates(AppraisalCreatesAnswer),
    Sources(crate::capture::NpcSourcesAnswer),
    Digest(ResponseDigestAnswer),
    Normalization(AttemptNormalizationAnswer),
    Geometry(GeometryAnswers),
    Display(CompletedActivityDisplay),
    Command(CompletedCommandOperation),
    Event(CompletedEvent),
}
pub(crate) enum ResponseStep<'a> {
    AppraisalCreates(&'a AppraisalCreatesRequest),
    Sources(&'a crate::capture::NpcSourcesRequest),
    Digest(&'a ResponseDigestRequest),
    Normalization(&'a AttemptNormalizationRequest),
    Geometry(&'a GeometryQueries),
    Display(&'a mut crate::commands::ActivityDisplayCursor),
    Command(&'a mut CommandOperation),
    Event(&'a mut EventCursor),
    Complete(CompletedResponse),
}
pub(crate) struct CompletedResponse {
    pub outcome: Outcome,
    pub components: IndexMap<String, Outcome>,
    pub events: Vec<WorldEvent>,
    pub replayed: bool,
    reservation: ByteReservation,
}
impl CompletedResponse {
    pub(crate) fn into_parts(
        self,
    ) -> (
        Outcome,
        IndexMap<String, Outcome>,
        Vec<WorldEvent>,
        bool,
        ByteReservation,
    ) {
        (
            self.outcome,
            self.components,
            self.events,
            self.replayed,
            self.reservation,
        )
    }
}
#[derive(Clone, Copy)]
enum CanonicalPurpose {
    Response,
    Command,
    Appraisal,
}
enum Active {
    Choice {
        cursor: CommandChoiceCursor,
        input: PlanEditInput,
    },
    Plan(PlanEditCursor),
    Control {
        cursor: PlanControlCursor,
        discard: bool,
    },
    Invocation(InvocationCursor),
    Expression(ExpressionCursor),
    Appraisal(AppraisalChangeCursor),
    Command(CommandOperation),
}
enum Progress {
    AppraisalCreates,
    Sources,
    Digest,
    Normalization,
    Geometry,
    Display,
    Command,
    Event,
    Complete(CompletedResponse),
}
pub(crate) struct ResponseCursor {
    id: String,
    response: ActorResponse,
    bindings: Arc<ResponseBindings>,
    candidate: CandidateKey,
    checkpoint: Option<CandidateCheckpoint>,
    canonical: Option<ResponseDigestRequest>,
    source_check: Option<crate::capture::NpcSourcesCursor>,
    appraisal_creates: Option<AppraisalCreatesRequest>,
    appraisal_bindings: Option<crate::appraisals::AppraisalBindings>,
    canonical_purpose: CanonicalPurpose,
    digest: Option<ResponseDigest>,
    normalization: Option<AttemptNormalizationRequest>,
    normalized: Option<NormalizedAttemptFacts>,
    active: Option<Active>,
    command: Option<NativeCommand>,
    event: Option<EventCursor>,
    event_answer: Option<CompletedOccurrence>,
    index: usize,
    initial_generation: Option<u64>,
    components: IndexMap<String, Outcome>,
    events: Vec<WorldEvent>,
    evidence: Option<Vec<String>>,
    resolve_attempt: bool,
    budget: ByteBudget,
    reservation: Option<ByteReservation>,
    working: Option<ByteReservation>,
}
impl ResponseCursor {
    pub(crate) fn new(
        core: &mut CoreMutation<'_>,
        id: &str,
        response: ActorResponse,
        bindings: Arc<ResponseBindings>,
        candidate: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Self, CommandOperationError> {
        if !is_safe_record_id(id)
            || id.len() > 100
            || bindings.world_id() != core.state.physical.header.id
        {
            return Err(ExecutionError::InvalidCheckpoint.into());
        }
        let reservation = budget.reserve(
            size_of::<Self>()
                + id.len()
                + map_storage::<String, Outcome>(response.len()).ok_or(ExecutionError::Capacity)?
                + response.len() * 24
                + bindings
                    .input
                    .appraisal_bindings
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?,
        )?;
        let binding = Self::binding(core, candidate)?;
        let appraisal_bindings = bindings.input.appraisal_bindings.clone();
        let appraisal_creates = if bindings.input.native.is_some() && appraisal_bindings.is_some() {
            AppraisalCreatesRequest::prepare(
                core.state,
                bindings.actor_id(),
                &response,
                binding,
                budget,
            )?
        } else {
            None
        };
        let canonical = if appraisal_creates.is_none() {
            Some(ResponseDigestRequest::prepare(
                binding,
                &bindings.digest_view(&response, appraisal_bindings.as_ref()),
                budget,
            )?)
        } else {
            None
        };
        let source_check = bindings
            .input
            .native
            .as_ref()
            .map(|guard| guard.source_cursor(core, candidate, budget))
            .transpose()?
            .flatten();
        let checkpoint = core.journal.checkpoint(core.state)?;
        Ok(Self {
            id: id.into(),
            response,
            bindings,
            candidate,
            checkpoint: Some(checkpoint),
            canonical,
            source_check,
            appraisal_creates,
            appraisal_bindings,
            canonical_purpose: CanonicalPurpose::Response,
            digest: None,
            normalization: None,
            normalized: None,
            active: None,
            command: None,
            event: None,
            event_answer: None,
            index: 0,
            initial_generation: None,
            components: IndexMap::new(),
            events: Vec::new(),
            evidence: None,
            resolve_attempt: false,
            budget: budget.clone(),
            reservation: Some(reservation),
            working: None,
        })
    }
    fn binding(
        core: &mut CoreMutation<'_>,
        candidate: CandidateKey,
    ) -> Result<GeometryBinding, ExecutionError> {
        Ok(GeometryBinding::new(
            candidate,
            core.state.installed.geometry.spatial.revision,
            core.journal.next_provider_serial()?,
        ))
    }
    fn reserve(&mut self, bytes: usize) -> Result<(), ExecutionError> {
        let storage = self
            .reservation
            .as_mut()
            .ok_or(ExecutionError::InvalidCheckpoint)?;
        storage.resize(
            storage
                .bytes()
                .checked_add(bytes)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(())
    }
    fn merge(&mut self, storage: ByteReservation) -> Result<(), ExecutionError> {
        self.reservation
            .as_mut()
            .ok_or(ExecutionError::Invariant)?
            .merge(storage)?;
        Ok(())
    }
    pub(crate) fn abort(&mut self, core: &mut CoreMutation<'_>) -> Result<(), ExecutionError> {
        if let Some(active) = self.active.as_mut() {
            match active {
                Active::Command(cursor) => cursor.abort(core)?,
                Active::Choice { cursor, .. } => cursor.abort(core)?,
                _ => {}
            }
        }
        if let Some(checkpoint) = self.checkpoint.take() {
            core.journal.rollback_to(core.state, checkpoint)?;
        }
        self.active = None;
        self.event = None;
        self.canonical = None;
        self.source_check = None;
        self.appraisal_creates = None;
        self.normalization = None;
        self.command = None;
        Ok(())
    }
    pub(crate) fn is_complete(&self) -> bool {
        self.checkpoint.is_none() && self.reservation.is_none()
    }
    fn result(
        &self,
        ok: bool,
        code: &str,
        message: &str,
    ) -> Result<ComponentResult, ExecutionError> {
        ComponentResult::prepare(ok, code, message.into(), &self.budget)
    }
    fn store(
        &mut self,
        core: &mut CoreMutation<'_>,
        result: ComponentResult,
    ) -> Result<(), ExecutionError> {
        if self.resolve_attempt && result.outcome.ok {
            let op = self
                .response
                .operation(self.index)
                .ok_or(ExecutionError::Invariant)?;
            let description = op.text("description").ok_or(ExecutionError::Invariant)?;
            let normalization_index = (0..self.index)
                .filter(|index| {
                    self.response.operation(*index).is_some_and(|op| {
                        op.kind == ResponseKind::Act
                            && op.data.get("kind").and_then(SqlCell::as_str) == Some("proposal")
                            && op.text("description").is_some()
                    })
                })
                .count();
            let language = self
                .normalized
                .as_ref()
                .and_then(|facts| facts.get(normalization_index))
                .filter(|facts| facts.description() == description)
                .ok_or(ExecutionError::Invariant)?;
            let slots = op
                .data
                .get("slots")
                .filter(|v| !v.is_null())
                .map(actions::decode::<crate::plans::IntentSlots>)
                .transpose()?;
            crate::plans::resolve_attempt(
                core,
                self.bindings.actor_id(),
                language,
                op.text("targetEntityId")
                    .and_then(JsText::as_unicode)
                    .filter(|s| !s.is_empty()),
                actions::mode(op.data)?,
                slots.as_ref(),
                &self.budget,
            )?;
        }
        let local = self
            .response
            .operation(self.index)
            .ok_or(ExecutionError::Invariant)?
            .local_id;
        self.reserve(local.len())?;
        let local = self
            .response
            .operation(self.index)
            .ok_or(ExecutionError::Invariant)?
            .local_id
            .to_owned();
        self.merge(result.storage)?;
        self.components.insert(local, result.outcome);
        self.working = None;
        self.index += 1;
        self.resolve_attempt = false;
        self.active = None;
        self.command = None;
        Ok(())
    }
    fn complete(
        &mut self,
        core: &mut CoreMutation<'_>,
        outcome: Outcome,
        replayed: bool,
        changed: bool,
    ) -> Result<Progress, CommandOperationError> {
        if changed {
            core.physical().reconcile_closed_coaching()?;
            crate::experience::advance_commitments(core, &self.events, &self.budget)?;
            core.state.physical.header.native_interval = None;
            core.state.physical.header.sequence = core
                .state
                .physical
                .header
                .sequence
                .checked_add(1)
                .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
                .ok_or(ExecutionError::Identity)?;
            core.reconcile_command_semantics(
                self.checkpoint
                    .as_ref()
                    .ok_or(ExecutionError::InvalidCheckpoint)?,
                self.bindings.actor_id(),
            )?;
            core.sync_sensory_changes()?;
        }
        let checkpoint = self
            .checkpoint
            .take()
            .ok_or(ExecutionError::InvalidCheckpoint)?;
        core.journal.keep(core.state, checkpoint)?;
        Ok(Progress::Complete(CompletedResponse {
            outcome,
            components: std::mem::take(&mut self.components),
            events: std::mem::take(&mut self.events),
            replayed,
            reservation: self.reservation.take().ok_or(ExecutionError::Invariant)?,
        }))
    }
    fn initial(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<Option<Progress>, CommandOperationError> {
        let digest = &self.digest.as_ref().ok_or(ExecutionError::Invariant)?.body;
        if let Some(prior) = core.state.responses.get(&self.id) {
            let same = prior.digest == *digest;
            let result = if same {
                self.reserve(
                    prior.outcome.heap_bytes().ok_or(ExecutionError::Capacity)? + "duplicate".len(),
                )?;
                let mut result = prior.outcome.clone();
                result.code = "duplicate".into();
                result
            } else {
                let result = self.result(
                    false,
                    "response-rejected",
                    "Response identity was reused with different content.",
                )?;
                self.merge(result.storage)?;
                result.outcome
            };
            return self.complete(core, result, same, false).map(Some);
        }
        let actor_id = self.bindings.actor_id();
        let entity = core.state.physical.entities.get(actor_id);
        let actor = entity.and_then(|e| e.actor.as_ref());
        let refusal = if core.state.physical.header.paused {
            Some(("paused", "The response is waiting for the world to resume."))
        } else if actor.is_none() {
            Some(("actor-unavailable", "The person is no longer available."))
        } else if !entity.is_some_and(|e| e.actively_participates()) {
            Some(("actor-unavailable", "The person is not participating."))
        } else {
            None
        };
        if let Some((code, message)) = refusal {
            let result = self.result(false, code, message)?;
            self.merge(result.storage)?;
            return self.complete(core, result.outcome, false, false).map(Some);
        }
        let actor = actor.ok_or(ExecutionError::MissingActor)?;
        let entity = entity.ok_or(ExecutionError::MissingActor)?;
        let current_read = &self.bindings.input.reads.current;
        let native_scope_changed = current_read.perception.evidence.generation()
            != core.state.generation
            || current_read
                .perception
                .evidence
                .cut()
                .observer
                .physical_life
                != actor.physical_life.unwrap_or(0);
        let semantic_changed = if let Some(native) = &self.bindings.input.native {
            let witness = current_read
                .native_validity
                .as_ref()
                .ok_or(ExecutionError::InvalidCheckpoint)?;
            !match native.route {
                ResponseValidityRoute::Decision => {
                    witness.current(core.state, actor_id, &self.budget)?
                }
                ResponseValidityRoute::PreparedResponse => {
                    witness.prepared_current(core.state, actor_id, &self.budget)?
                }
            }
        } else {
            false
        };
        if native_scope_changed || semantic_changed {
            let result = self.result(
                false,
                "response-rejected",
                "The character's situation changed before this response.",
            )?;
            self.merge(result.storage)?;
            return self.complete(core, result.outcome, false, false).map(Some);
        }
        let tail = if !actor.alive {
            Some(" is dead and cannot respond.")
        } else if actor.incapacitated {
            Some(" is incapacitated and cannot respond.")
        } else if core
            .state
            .installed
            .capabilities
            .capability_blocked(Some(entity), "speech")
            .map_err(ExecutionError::Values)?
            && core
                .state
                .installed
                .capabilities
                .capability_blocked(Some(entity), "actions")
                .map_err(ExecutionError::Values)?
        {
            Some(" cannot respond in their current state.")
        } else {
            None
        };
        if let Some(tail) = tail {
            self.reserve(
                entity
                    .name
                    .heap_bytes()
                    .and_then(|n| n.checked_mul(8))
                    .and_then(|n| {
                        n.checked_add(
                            entity.name_form.heap_bytes()?
                                + entity.indefinite_article.heap_bytes()?
                                + tail.len()
                                + 128,
                        )
                    })
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let mut message = crate::narration::name_phrase(
                &crate::state::Named {
                    name: entity.name.clone(),
                    name_form: entity.name_form.clone(),
                    indefinite_article: entity.indefinite_article.clone(),
                },
                crate::narration::NameArticle::Definite,
                true,
            );
            message.push_str(tail);
            let result = ComponentResult::prepare(
                false,
                "actor-unavailable",
                (&message).into(),
                &self.budget,
            )?;
            self.merge(result.storage)?;
            return self.complete(core, result.outcome, false, false).map(Some);
        }
        if self
            .bindings
            .input
            .situation
            .as_ref()
            .is_some_and(|s| s.privacy_revision != sources::privacy_revision(core, actor_id))
            || !sources::receipt_details_current(core, &self.bindings)?
            || self
                .bindings
                .input
                .native
                .as_ref()
                .map(|guard| {
                    guard.current(
                        core.state,
                        &self.bindings.input.reads.current,
                        actor_id,
                        &self.budget,
                    )
                })
                .transpose()?
                .is_some_and(|current| !current)
        {
            let result = self.result(
                false,
                "response-rejected",
                "The supplied observations changed or expired before this response.",
            )?;
            self.merge(result.storage)?;
            return self.complete(core, result.outcome, false, false).map(Some);
        }
        self.initial_generation = Some(actor.plan_generation);
        let descriptions = || {
            (0..self.response.len())
                .filter_map(|index| self.response.operation(index))
                .filter(|op| {
                    op.kind == ResponseKind::Act
                        && op.data.get("kind").and_then(SqlCell::as_str) == Some("proposal")
                })
                .filter_map(|op| op.text("description"))
        };
        if descriptions().next().is_some() {
            self.normalization = Some(AttemptNormalizationRequest::prepare(
                Self::binding(core, self.candidate)?,
                descriptions(),
                &self.budget,
            )?);
            return Ok(Some(Progress::Normalization));
        }
        Ok(None)
    }
    fn canonical_command(
        &mut self,
        core: &mut CoreMutation<'_>,
        command: NativeCommand,
    ) -> Result<(), ExecutionError> {
        self.canonical = Some(ResponseDigestRequest::prepare(
            Self::binding(core, self.candidate)?,
            &command,
            &self.budget,
        )?);
        self.canonical_purpose = CanonicalPurpose::Command;
        self.command = Some(command);
        Ok(())
    }
    fn begin_intent(
        &mut self,
        core: &mut CoreMutation<'_>,
        intent: ActionIntent,
    ) -> Result<(), CommandOperationError> {
        match intent {
            ActionIntent::Complete(result) => self.store(core, result)?,
            ActionIntent::Command(command) => self.canonical_command(core, command)?,
            ActionIntent::Plan(input) => {
                if let Some(first) = input.commands.first() {
                    let storage = self
                        .budget
                        .reserve(first.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
                    let command = first.clone();
                    self.merge(storage)?;
                    let binding = Self::binding(core, self.candidate)?;
                    let cursor = CommandChoiceCursor::new(
                        command,
                        actions::transition(input.mode),
                        binding,
                        &self.budget,
                    )?;
                    self.active = Some(Active::Choice { cursor, input });
                } else {
                    self.active = Some(Active::Plan(PlanEditCursor::new(input, &self.budget)?));
                }
            }
            ActionIntent::CancelPlan => {
                self.active = Some(Active::Control {
                    cursor: PlanControlCursor::new(
                        self.bindings.actor_id(),
                        PlanControlKind::Cancel,
                        &self.budget,
                    )?,
                    discard: false,
                })
            }
            ActionIntent::Invoke => {
                let op = self
                    .response
                    .operation(self.index)
                    .ok_or(ExecutionError::Invariant)?;
                self.active = Some(Active::Invocation(InvocationCursor::new(
                    core,
                    self.bindings.actor_id(),
                    &format!("{}:{}", self.id, op.local_id),
                    op.data.get("invocation").ok_or(ExecutionError::Invariant)?,
                    self.candidate,
                    &self.budget,
                )?));
            }
            ActionIntent::Expression => {
                let op = self
                    .response
                    .operation(self.index)
                    .ok_or(ExecutionError::Invariant)?;
                let Some(verb) = op.text("verb").and_then(JsText::as_unicode) else {
                    let rule = &core
                        .state
                        .installed
                        .occurrence_rules
                        .value()
                        .response
                        .expression;
                    let result = ComponentResult::prepare(
                        false,
                        "invalid-expression",
                        rule.unavailable.as_str().into(),
                        &self.budget,
                    )?;
                    self.store(core, result)?;
                    return Ok(());
                };
                self.active = Some(Active::Expression(ExpressionCursor::new(
                    core,
                    self.bindings.actor_id(),
                    &self.id,
                    verb,
                    op.text("targetEntityId")
                        .and_then(JsText::as_unicode)
                        .filter(|t| !t.is_empty()),
                    &self.bindings.input.entity_ids,
                    self.candidate,
                    &self.budget,
                )?));
            }
        }
        Ok(())
    }
    fn begin_event(
        &mut self,
        core: &mut CoreMutation<'_>,
        staged: StagedOccurrence,
    ) -> Result<(), CommandOperationError> {
        let begun = begin_staged_occurrence(core, staged, &self.budget)?;
        let binding = Self::binding(core, self.candidate)?;
        self.event = Some(EventCursor::prepare(
            core,
            begun,
            binding,
            EventAccountPlacement::Immediate,
            &self.budget,
        )?);
        Ok(())
    }
    fn keep_event(&mut self, value: CompletedEvent) -> Result<(), ExecutionError> {
        self.reserve(
            size_of::<WorldEvent>()
                .checked_mul(self.events.len() + 1)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let CompletedEvent {
            event,
            completed,
            awareness,
            reservation,
        } = value;
        drop(awareness);
        self.merge(reservation)?;
        self.events.push(event);
        self.event_answer = Some(completed);
        self.event = None;
        Ok(())
    }
    fn command_complete(
        &mut self,
        core: &mut CoreMutation<'_>,
        value: CompletedCommandOperation,
    ) -> Result<(), CommandOperationError> {
        let Some(Active::Command(operation)) = self.active.as_ref() else {
            return Err(ExecutionError::InvalidCheckpoint.into());
        };
        if !operation.is_complete() {
            return Err(ExecutionError::InvalidCheckpoint.into());
        }
        let (completed, mut events, storage) = value.into_parts();
        if completed.actor_id() != self.bindings.actor_id()
            || completed.command_id()
                != format!(
                    "{}:{}",
                    self.id,
                    self.response
                        .operation(self.index)
                        .ok_or(ExecutionError::Invariant)?
                        .local_id
                )
        {
            return Err(ExecutionError::InvalidCheckpoint.into());
        }
        self.reserve(
            completed
                .outcome()
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?
                + events.len() * size_of::<WorldEvent>(),
        )?;
        let result = completed.outcome().clone();
        self.merge(storage)?;
        for event in &mut events {
            let original =
                core.state
                    .occurrences
                    .annotate_new_response(&event.id, &self.id, &self.budget)?;
            self.reserve(
                original
                    .event()
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            *event = original.event().clone();
        }
        self.events.append(&mut events);
        let result = ComponentResult::from_parts((result, self.budget.reserve(0)?));
        self.store(core, result)?;
        Ok(())
    }
    fn operation_bound(&self) -> Result<usize, ExecutionError> {
        let op = self
            .response
            .operation(self.index)
            .ok_or(ExecutionError::Invariant)?;
        let mut bytes = op.data.heap_bytes().ok_or(ExecutionError::Capacity)?;
        let mut add = |raw: &SqlCell| -> Result<(), ExecutionError> {
            bytes = bytes
                .checked_add(raw.heap_bytes().ok_or(ExecutionError::Capacity)?)
                .ok_or(ExecutionError::Capacity)?;
            Ok(())
        };
        match op.kind {
            ResponseKind::Act => {
                if let Some(choice) = op
                    .text("actionId")
                    .and_then(JsText::as_unicode)
                    .and_then(|id| self.bindings.input.actions.get(id))
                    .and_then(|c| c.invocation.as_ref())
                {
                    add(choice)?
                }
                for binding in self.bindings.input.attempt_bindings.iter().filter(|b| {
                    b.operation_id.as_deref() == Some(op.local_id)
                        && op.text("description") == Some(&b.description)
                }) {
                    for raw in &binding.commands {
                        add(raw)?
                    }
                    if let Some(raw) = &binding.fulfillment {
                        add(raw)?
                    }
                }
            }
            ResponseKind::Plan => {
                for step in op
                    .data
                    .get("steps")
                    .and_then(SqlCell::as_array)
                    .ok_or(ExecutionError::Invariant)?
                {
                    if let Some(raw) = step
                        .get("actionId")
                        .and_then(SqlCell::as_str)
                        .and_then(|id| self.bindings.input.actions.get(id))
                        .and_then(|c| c.invocation.as_ref())
                    {
                        add(raw)?
                    }
                }
            }
            _ => {}
        }
        // Local typed/raw construction and serialization coexist. The admitted
        // JSON shape supplies the allocation bound; this selects one operation,
        // never a historical or population-wide catalogue.
        bytes
            .checked_mul(12)
            .and_then(|n| {
                n.checked_add(
                    (self.id.len() + self.bindings.actor_id().len() + 64)
                        * (self.response.len() + 1)
                        * 8,
                )
            })
            .ok_or(ExecutionError::Capacity)
    }
    fn finish(&mut self, core: &mut CoreMutation<'_>) -> Result<Progress, CommandOperationError> {
        let accepted = self.components.values().filter(|o| o.ok).count();
        let rejected = self.components.len() - accepted;
        let result = if self.components.is_empty() {
            self.result(true, "response-empty", "No new response was chosen.")?
        } else if rejected == 0 {
            self.result(true, "responded", "Response completed.")?
        } else if accepted > 0 {
            self.result(
                true,
                "response-partial",
                "Response completed with rejected components.",
            )?
        } else {
            let bytes = self
                .components
                .iter()
                .try_fold(64usize, |n, (id, o)| {
                    n.checked_add(id.len() + o.message.storage_bytes() + 3)
                })
                .ok_or(ExecutionError::Capacity)?;
            let temporary = self.budget.reserve(bytes)?;
            let mut message: JsText = "No response component was accepted. ".into();
            for (at, (id, result)) in self.components.iter().enumerate() {
                if at != 0 {
                    message.push_str(" ");
                }
                message.push_str(id);
                message.push_str(": ");
                message.push_text(&result.message);
            }
            let result = ComponentResult::prepare(
                false,
                "response-rejected",
                (&message).into(),
                &self.budget,
            )?;
            drop(temporary);
            result
        };
        if result.outcome.ok
            && self.bindings.input.situation.as_ref().is_some_and(|s| {
                s.privacy_revision == sources::privacy_revision(core, self.bindings.actor_id())
            })
        {
            let situation = self
                .bindings
                .input
                .situation
                .as_ref()
                .ok_or(ExecutionError::Invariant)?;
            crate::reception::acknowledge_attention(
                core,
                self.bindings.actor_id(),
                &situation.presented,
                &self.budget,
            )?;
            for cause in situation.semantic_causes.as_deref().unwrap_or(&[]) {
                crate::reception::acknowledge_semantic_cause(
                    core,
                    self.bindings.actor_id(),
                    &cause.key,
                    cause.generation,
                    &cause.qualitative_revision,
                    cause.severity,
                )?;
            }
            crate::experience::reinforce_experience(
                core,
                self.bindings.actor_id(),
                self.evidence
                    .as_deref()
                    .unwrap_or(&self.bindings.input.evidence_ids),
                &self.budget,
            )?;
        }
        self.merge(result.storage)?;
        let receipt_bound = self
            .components
            .heap_bytes()
            .and_then(|n| n.checked_add(result.outcome.heap_bytes()?))
            .and_then(|n| n.checked_add(self.digest.as_ref()?.body.len()))
            .ok_or(ExecutionError::Capacity)?;
        let _copy = self.budget.reserve(receipt_bound)?;
        let receipt = ResponseReceipt {
            digest: self
                .digest
                .as_ref()
                .ok_or(ExecutionError::Invariant)?
                .body
                .clone(),
            components: self.components.clone(),
            outcome: result.outcome.clone(),
        };
        core.journal.responses.append_completed(
            &mut core.state.responses,
            &self.id,
            receipt,
            &core.state.installed.actor_response_limits,
            &self.budget,
        )?;
        self.complete(core, result.outcome, false, true)
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<ResponseAnswer>,
    ) -> Result<ResponseStep<'a>, CommandOperationError> {
        let progress = match self.drive(core, answer) {
            Ok(value) => value,
            Err(error) => {
                self.abort(core)?;
                return Err(error);
            }
        };
        Ok(match progress {
            Progress::AppraisalCreates => ResponseStep::AppraisalCreates(
                self.appraisal_creates
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?,
            ),
            Progress::Sources => ResponseStep::Sources(
                self.source_check
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?
                    .request(),
            ),
            Progress::Digest => {
                ResponseStep::Digest(self.canonical.as_ref().ok_or(ExecutionError::Invariant)?)
            }
            Progress::Normalization => ResponseStep::Normalization(
                self.normalization
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?,
            ),
            Progress::Geometry => ResponseStep::Geometry(
                match self.active.as_ref().ok_or(ExecutionError::Invariant)? {
                    Active::Choice { cursor, .. } => cursor.geometry_request(),
                    Active::Invocation(cursor) => cursor.geometry_request(),
                    Active::Expression(cursor) => cursor.geometry_request(),
                    _ => None,
                }
                .ok_or(ExecutionError::Invariant)?,
            ),
            Progress::Display => ResponseStep::Display(match self.active.as_mut() {
                Some(Active::Choice { cursor, .. }) => {
                    cursor.display_cursor().ok_or(ExecutionError::Invariant)?
                }
                _ => return Err(ExecutionError::Invariant.into()),
            }),
            Progress::Command => ResponseStep::Command(match self.active.as_mut() {
                Some(Active::Command(cursor)) => cursor,
                _ => return Err(ExecutionError::Invariant.into()),
            }),
            Progress::Event => {
                ResponseStep::Event(self.event.as_mut().ok_or(ExecutionError::Invariant)?)
            }
            Progress::Complete(value) => ResponseStep::Complete(value),
        })
    }
    fn drive(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<ResponseAnswer>,
    ) -> Result<Progress, CommandOperationError> {
        if self.reservation.is_none() {
            return Err(ExecutionError::InvalidCheckpoint.into());
        }
        let mut answer = answer;
        if let Some(cursor) = self.source_check.as_mut() {
            let supplied = match answer.take() {
                Some(ResponseAnswer::Sources(supplied)) => supplied,
                Some(_) => return Err(ExecutionError::InvalidCheckpoint.into()),
                None => return Ok(Progress::Sources),
            };
            let checked = cursor.complete(core, supplied, &self.budget)?;
            let current = checked.unavailable_personal.is_empty();
            self.source_check = None;
            if !current {
                let result = self.result(
                    false,
                    "response-rejected",
                    "The supplied sources changed before this response.",
                )?;
                self.merge(result.storage)?;
                return self.complete(core, result.outcome, false, false);
            }
        }
        if self.appraisal_creates.is_some() {
            let supplied = match answer.take() {
                Some(ResponseAnswer::AppraisalCreates(supplied)) => supplied,
                Some(_) => return Err(ExecutionError::InvalidCheckpoint.into()),
                None => return Ok(Progress::AppraisalCreates),
            };
            let custody = self
                .appraisal_creates
                .take()
                .ok_or(ExecutionError::Invariant)?
                .finish(
                    core.state,
                    supplied,
                    self.appraisal_bindings
                        .as_mut()
                        .ok_or(ExecutionError::Invariant)?,
                    &self.budget,
                )?;
            self.merge(custody)?;
            self.canonical = Some(ResponseDigestRequest::prepare(
                Self::binding(core, self.candidate)?,
                &self
                    .bindings
                    .digest_view(&self.response, self.appraisal_bindings.as_ref()),
                &self.budget,
            )?);
        }
        if self.event.is_some() {
            match answer.take() {
                Some(ResponseAnswer::Event(value)) => self.keep_event(value)?,
                Some(_) => return Err(ExecutionError::InvalidCheckpoint.into()),
                None => return Ok(Progress::Event),
            }
        }
        if self.canonical.is_some() {
            let value = match answer.take() {
                Some(ResponseAnswer::Digest(value)) => value,
                Some(_) => return Err(ExecutionError::InvalidCheckpoint.into()),
                None => return Ok(Progress::Digest),
            };
            let canonical = self
                .canonical
                .take()
                .ok_or(ExecutionError::Invariant)?
                .finish(value)?;
            match self.canonical_purpose {
                CanonicalPurpose::Response => {
                    self.digest = Some(canonical);
                    if let Some(progress) = self.initial(core)? {
                        return Ok(progress);
                    }
                }
                CanonicalPurpose::Command => {
                    let (body, storage) = canonical.into_parts();
                    self.merge(storage)?;
                    let command = self.command.take().ok_or(ExecutionError::Invariant)?;
                    let cursor = CommandCursor::new(
                        command,
                        body,
                        CommandOptions {
                            preview: false,
                            native_controller: false,
                            native_movement: None,
                        },
                        Self::binding(core, self.candidate)?,
                        &self.budget,
                    )?;
                    self.active = Some(Active::Command(CommandOperation::from_cursor(
                        core,
                        cursor,
                        self.candidate,
                        &self.budget,
                    )?));
                }
                CanonicalPurpose::Appraisal => {
                    let (body, storage) = canonical.into_parts();
                    self.merge(storage)?;
                    let op = self
                        .response
                        .operation(self.index)
                        .ok_or(ExecutionError::Invariant)?;
                    let bindings = self
                        .appraisal_bindings
                        .as_ref()
                        .ok_or(ExecutionError::Invariant)?;
                    let _copy = self.budget.reserve(
                        bindings.heap_bytes().ok_or(ExecutionError::Capacity)?
                            + self.id.len()
                            + size_of::<AppraisalPublication>(),
                    )?;
                    let mut bindings = bindings.clone();
                    let publication = bindings.publication.get_or_insert(AppraisalPublication {
                        response_id: None,
                        pipeline: None,
                        input_sequence: None,
                        cause_ids: None,
                    });
                    publication.response_id = Some(self.id.clone());
                    let key = crate::encoding::json_record(&[self.id.as_str(), op.local_id])
                        .map_err(|_| ExecutionError::Invariant)?;
                    self.active = Some(Active::Appraisal(AppraisalChangeCursor::new(
                        core,
                        self.bindings.actor_id(),
                        op.data,
                        body,
                        &format!(
                            "appraisal-response-{}",
                            crate::encoding::content_label(&key)
                        ),
                        &bindings,
                        &self.budget,
                    )?));
                }
            }
        }
        if self.normalization.is_some() {
            match answer.take() {
                Some(ResponseAnswer::Normalization(value)) => {
                    self.normalized = Some(
                        self.normalization
                            .take()
                            .ok_or(ExecutionError::Invariant)?
                            .finish(value)?,
                    );
                }
                Some(_) => return Err(ExecutionError::InvalidCheckpoint.into()),
                None => return Ok(Progress::Normalization),
            }
        }
        loop {
            if let Some(mut active) = self.active.take() {
                match &mut active {
                    Active::Command(_) => match answer.take() {
                        Some(ResponseAnswer::Command(value)) => {
                            self.active = Some(active);
                            self.command_complete(core, value)?;
                            continue;
                        }
                        Some(_) => return Err(ExecutionError::InvalidCheckpoint.into()),
                        None => {
                            self.active = Some(active);
                            return Ok(Progress::Command);
                        }
                    },
                    Active::Choice { cursor, input } => {
                        let reply = match answer.take() {
                            Some(ResponseAnswer::Geometry(v)) => {
                                Some(CommandChoiceAnswer::Geometry(v))
                            }
                            Some(ResponseAnswer::Display(v)) => {
                                Some(CommandChoiceAnswer::Display(v))
                            }
                            Some(_) => return Err(ExecutionError::InvalidCheckpoint.into()),
                            None => None,
                        };
                        let progress = match cursor.step(core, reply)? {
                            CommandChoiceStep::Geometry(_) => 0,
                            CommandChoiceStep::Display(_) => 1,
                            CommandChoiceStep::Complete(prepared) => {
                                let (outcome, storage) = prepared.into_parts();
                                self.merge(storage)?;
                                if !outcome.ok {
                                    self.store(
                                        core,
                                        ComponentResult {
                                            outcome,
                                            storage: self.budget.reserve(0)?,
                                        },
                                    )?;
                                } else {
                                    let placeholder = PlanEditInput {
                                        id: String::new(),
                                        actor_id: String::new(),
                                        commands: Vec::new(),
                                        mode: crate::plans::PlanMode::Enqueue,
                                        expected_revision: 0,
                                        goal_id: None,
                                    };
                                    let input = std::mem::replace(input, placeholder);
                                    self.active = Some(Active::Plan(PlanEditCursor::new(
                                        input,
                                        &self.budget,
                                    )?));
                                }
                                2
                            }
                        };
                        if progress < 2 {
                            self.active = Some(active);
                            return Ok(if progress == 0 {
                                Progress::Geometry
                            } else {
                                Progress::Display
                            });
                        }
                    }
                    Active::Plan(cursor) => {
                        if answer.is_some() {
                            return Err(ExecutionError::InvalidCheckpoint.into());
                        }
                        let mut reply = None;
                        loop {
                            match cursor.step(core, reply.take())? {
                                PlanEditStep::Personal(pending) => {
                                    let prepared = crate::experience::prepare_activity_result(
                                        core,
                                        pending,
                                        &self.budget,
                                    )?;
                                    let schema = core.state.installed.schema.clone();
                                    reply = Some(crate::experience::acquire_activity_result(
                                        core, prepared, &schema,
                                    )?);
                                }
                                PlanEditStep::Complete(outcome) => {
                                    let storage = self.budget.reserve(
                                        outcome.heap_bytes().ok_or(ExecutionError::Capacity)?,
                                    )?;
                                    self.store(
                                        core,
                                        ComponentResult {
                                            outcome: outcome.clone(),
                                            storage,
                                        },
                                    )?;
                                    break;
                                }
                            }
                        }
                    }
                    Active::Control { cursor, discard } => {
                        if answer.is_some() {
                            return Err(ExecutionError::InvalidCheckpoint.into());
                        }
                        let mut reply = None;
                        loop {
                            match cursor.step(core, reply.take())? {
                                PlanControlStep::Personal(pending) => {
                                    let prepared = crate::experience::prepare_activity_result(
                                        core,
                                        pending,
                                        &self.budget,
                                    )?;
                                    let schema = core.state.installed.schema.clone();
                                    reply = Some(crate::experience::acquire_activity_result(
                                        core, prepared, &schema,
                                    )?);
                                }
                                PlanControlStep::Complete => {
                                    if let Some(outcome) = cursor.refusal() {
                                        let storage = self.budget.reserve(
                                            outcome.heap_bytes().ok_or(ExecutionError::Capacity)?,
                                        )?;
                                        self.store(
                                            core,
                                            ComponentResult {
                                                outcome: outcome.clone(),
                                                storage,
                                            },
                                        )?;
                                    } else if !*discard {
                                        self.active = Some(Active::Control {
                                            cursor: PlanControlCursor::new(
                                                self.bindings.actor_id(),
                                                PlanControlKind::DiscardSuspended,
                                                &self.budget,
                                            )?,
                                            discard: true,
                                        });
                                    } else {
                                        let result=self.result(true,"cancelled","Future dispatch cancelled; goals and spent resources retained.")?;
                                        self.store(core, result)?;
                                    }
                                    break;
                                }
                            }
                        }
                    }
                    Active::Invocation(cursor) => {
                        let reply = match answer.take() {
                            Some(ResponseAnswer::Geometry(v)) => Some(v),
                            Some(_) => return Err(ExecutionError::InvalidCheckpoint.into()),
                            None => None,
                        };
                        match cursor.step(core, reply)? {
                            InvocationStep::Geometry(_) => {
                                self.active = Some(active);
                                return Ok(Progress::Geometry);
                            }
                            InvocationStep::Complete(bound) => {
                                let (value, storage) = bound.into_parts();
                                self.merge(storage)?;
                                match value {
                                    Err(outcome) => self.store(
                                        core,
                                        ComponentResult {
                                            outcome,
                                            storage: self.budget.reserve(0)?,
                                        },
                                    )?,
                                    Ok(command) => {
                                        let op = self
                                            .response
                                            .operation(self.index)
                                            .ok_or(ExecutionError::Invariant)?;
                                        let mode = actions::mode(op.data)?;
                                        if !matches!(mode, crate::plans::PlanMode::Enqueue)
                                            && self.initial_generation
                                                != Some(self.bindings.input.expected_plan)
                                        {
                                            let result = self.result(
                                                false,
                                                "stale-plan",
                                                "The current task changed.",
                                            )?;
                                            self.store(core, result)?;
                                        } else {
                                            let actor = self.bindings.actor_id();
                                            let revision = core
                                                .state
                                                .physical
                                                .entities
                                                .get(actor)
                                                .and_then(|e| e.actor.as_ref())
                                                .and_then(|a| a.agency.plan.as_ref())
                                                .map_or(0, |p| p.revision);
                                            self.begin_intent(
                                                core,
                                                ActionIntent::Plan(PlanEditInput {
                                                    id: format!("{}:{}", self.id, op.local_id),
                                                    actor_id: actor.into(),
                                                    commands: vec![command],
                                                    mode,
                                                    expected_revision: revision,
                                                    goal_id: None,
                                                }),
                                            )?;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    Active::Expression(cursor) => {
                        let reply = if let Some(completed) = self.event_answer.take() {
                            Some(ExpressionAnswer::Occurrence(completed))
                        } else {
                            match answer.take() {
                                Some(ResponseAnswer::Geometry(v)) => {
                                    Some(ExpressionAnswer::Geometry(v))
                                }
                                Some(_) => return Err(ExecutionError::InvalidCheckpoint.into()),
                                None => None,
                            }
                        };
                        match cursor.step(core, reply)? {
                            ExpressionStep::Geometry(_) => {
                                self.active = Some(active);
                                return Ok(Progress::Geometry);
                            }
                            ExpressionStep::Occurrence(staged) => {
                                self.active = Some(active);
                                self.begin_event(core, staged)?;
                                return Ok(Progress::Event);
                            }
                            ExpressionStep::Complete(value) => {
                                self.store(core, ComponentResult::from_parts(value.into_parts()))?
                            }
                        }
                    }
                    Active::Appraisal(cursor) => {
                        if answer.is_some() {
                            return Err(ExecutionError::InvalidCheckpoint.into());
                        }
                        match cursor.step(core, self.event_answer.take(), &self.budget)? {
                            AppraisalChangeStep::Occurrence(staged) => {
                                self.active = Some(active);
                                self.begin_event(core, staged)?;
                                return Ok(Progress::Event);
                            }
                            AppraisalChangeStep::Complete(value) => {
                                self.store(core, ComponentResult::from_parts(value.into_parts()))?
                            }
                        }
                    }
                }
                continue;
            }
            if answer.is_some() {
                return Err(ExecutionError::InvalidCheckpoint.into());
            }
            if self.index == self.response.len() {
                return self.finish(core);
            }
            self.working = Some(self.budget.reserve(self.operation_bound()?)?);
            let op = self
                .response
                .operation(self.index)
                .ok_or(ExecutionError::Invariant)?;
            if op.requires_accepted.iter().any(|v| {
                v.as_str()
                    .and_then(|id| self.components.get(id))
                    .is_none_or(|o| !o.ok)
            }) {
                let result = self.result(
                    false,
                    "dependency-rejected",
                    "An admission dependency was rejected.",
                )?;
                self.store(core, result)?;
                continue;
            }
            if op.kind != ResponseKind::Observe
                && op.kind != ResponseKind::Remember
                && op.kind != ResponseKind::Appraise
            {
                if let Some(result) = actions::target_gate(core, &self.bindings, &op, &self.budget)?
                {
                    self.store(core, result)?;
                    continue;
                }
            }
            match op.kind {
                ResponseKind::Observe => {
                    let result = sources::observe(core, &self.bindings, &op, &self.budget)?;
                    self.store(core, result)?;
                }
                ResponseKind::Remember => {
                    let result =
                        sources::remember(core, &self.bindings, &self.id, &op, &self.budget)?;
                    self.store(core, result)?;
                }
                ResponseKind::Note | ResponseKind::Name => {
                    let result = sources::knowledge(
                        core,
                        &self.bindings,
                        &op,
                        self.evidence
                            .as_deref()
                            .unwrap_or(&self.bindings.input.evidence_ids),
                        &self.budget,
                    )?;
                    if let Some((evidence, storage)) = result.evidence {
                        self.merge(storage)?;
                        self.evidence = Some(evidence)
                    }
                    if let Some(result) = result.result {
                        self.store(core, result)?;
                    } else {
                        self.working = None;
                        self.index += 1;
                    }
                }
                ResponseKind::Think => {
                    let thought = actions::decode::<Thought>(op.data)?;
                    let result = remember_thought(
                        core,
                        self.bindings.actor_id(),
                        &self.id,
                        &thought,
                        &self.bindings.input.entity_ids,
                        &self.budget,
                    )?;
                    self.store(core, ComponentResult::from_parts(result.into_parts()))?;
                }
                ResponseKind::Goal => {
                    let actor = core
                        .state
                        .physical
                        .entities
                        .get(self.bindings.actor_id())
                        .and_then(|e| e.actor.as_ref())
                        .ok_or(ExecutionError::MissingActor)?;
                    let result = if actor.controller == "player" {
                        self.result(
                            false,
                            "player-intention",
                            "Player intentions require explicit player input.",
                        )?
                    } else {
                        let goal = actions::goal_ref(
                            op.data.get("goalId").ok_or(ExecutionError::Invariant)?,
                            op.requires_accepted,
                            &self.components,
                        );
                        let parent = actions::goal_ref(
                            op.data.get("parentId").ok_or(ExecutionError::Invariant)?,
                            op.requires_accepted,
                            &self.components,
                        );
                        if let Some((goal, parent)) = goal.zip(parent) {
                            let mut change: crate::plans::GoalChange = actions::decode(op.data)?;
                            change.goal_id = goal;
                            change.parent_id = parent;
                            ComponentResult::from_parts(
                                crate::plans::change_goal(
                                    core,
                                    self.bindings.actor_id(),
                                    &change,
                                    &format!("{}:{}", self.id, op.local_id),
                                    "actor",
                                    &self.budget,
                                )?
                                .into_parts(),
                            )
                        } else {
                            self.result(
                                false,
                                "invalid-goal-reference",
                                "Local goal references require an accepted goal dependency.",
                            )?
                        }
                    };
                    self.store(core, result)?;
                }
                ResponseKind::Appraise => {
                    if self
                        .bindings
                        .input
                        .appraisal_bindings
                        .as_ref()
                        .is_none_or(|b| b.decision != Some(true))
                    {
                        let result = self.result(
                            false,
                            "appraisal-rejected",
                            "Decision appraisal changes are unavailable.",
                        )?;
                        self.store(core, result)?;
                    } else {
                        self.canonical = Some(ResponseDigestRequest::prepare(
                            Self::binding(core, self.candidate)?,
                            op.data,
                            &self.budget,
                        )?);
                        self.canonical_purpose = CanonicalPurpose::Appraisal;
                        return Ok(Progress::Digest);
                    }
                }
                ResponseKind::Talk | ResponseKind::Act | ResponseKind::Plan => {
                    let intent = if op.kind == ResponseKind::Plan {
                        actions::prepare_plan(
                            core,
                            &self.bindings,
                            &self.id,
                            &op,
                            &self.components,
                            &self.budget,
                        )?
                    } else {
                        let normalization_index = (0..self.index)
                            .filter(|index| {
                                self.response.operation(*index).is_some_and(|op| {
                                    op.kind == ResponseKind::Act
                                        && op.data.get("kind").and_then(SqlCell::as_str)
                                            == Some("proposal")
                                        && op.text("description").is_some()
                                })
                            })
                            .count();
                        let language = self
                            .normalized
                            .as_ref()
                            .and_then(|facts| facts.get(normalization_index));
                        actions::prepare(
                            core,
                            &self.bindings,
                            &self.id,
                            &op,
                            self.initial_generation.ok_or(ExecutionError::Invariant)?,
                            language,
                            &self.budget,
                        )?
                    };
                    self.resolve_attempt = op.kind == ResponseKind::Act
                        && op.data.get("kind").and_then(SqlCell::as_str) == Some("proposal")
                        && matches!(&intent, ActionIntent::Command(_) | ActionIntent::Plan(_));
                    self.begin_intent(core, intent)?;
                    if self.canonical.is_some() {
                        return Ok(Progress::Digest);
                    }
                }
            }
        }
    }
}
