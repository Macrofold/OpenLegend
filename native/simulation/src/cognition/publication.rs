//! One reflection publication owns validation, ordinary leaf edits and the
//! final private workspace swap under a single actual candidate checkpoint.
use super::{format::*, reflection::*, reflection_edits as edits};
use crate::appraisals::{AppraisalBindings, AppraisalChangeCursor, AppraisalChangeStep};
use crate::commands::{CommandOperationError, Outcome};
use crate::events::{
    CompletedEvent, CompletedOccurrence, EventAccountPlacement, EventCursor, WorldEvent,
    begin_staged_occurrence,
};
use crate::execution::{CandidateCheckpoint, CoreMutation, ExecutionError};
use crate::geometry::GeometryBinding;
use crate::host::retained_size::{HeapBytes, map_storage};
use crate::host::{ByteBudget, ByteReservation, CandidateKey};
use crate::records::SqlCell;
use crate::response::{AppraisalCreatesAnswer, AppraisalCreatesRequest, ResponseBindings};
use crate::simulation::DriveError;
use crate::text::JsText;
use serde::Deserialize;
use std::{mem::size_of, sync::Arc};

pub(crate) struct ReflectionInput {
    pub job_id: String,
    pub body: Arc<crate::capture::maintenance::MaintenanceCapture>,
    pub workspace: Arc<crate::capture::maintenance::MaintenanceCapture>,
    pub admission: crate::capture::maintenance::MaintenanceAdmission,
    pub bindings: Arc<ResponseBindings>,
    pub permitted_subjects: Vec<crate::reception::ObserverSubject>,
    pub publication: SqlCell,
    pub storage: ByteReservation,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Publication {
    actor_id: String,
    expected_revision: u64,
    snapshot: String,
    files: Vec<MindFile>,
    thoughts: Vec<JsText>,
    evidence_ids: Vec<String>,
    dream_episode: Option<String>,
    goal_changes: Vec<crate::plans::GoalChange>,
    knowledge_changes: Vec<edits::NoteEdit>,
    name_changes: Vec<edits::NameEdit>,
    appraisal_changes: Vec<SqlCell>,
    record_changes: Vec<InnerRecordChange>,
}
pub(crate) enum ReflectionAnswer {
    Format(MaintenanceFormatAnswer),
    Sources(crate::capture::NpcSourcesAnswer),
    Creates(AppraisalCreatesAnswer),
    Event(CompletedEvent),
}
pub(crate) enum ReflectionStep<'a> {
    Format(&'a MaintenanceFormatRequest),
    Sources(&'a crate::capture::NpcSourcesRequest),
    Creates(&'a AppraisalCreatesRequest),
    Event(&'a mut EventCursor),
    Complete(CompletedReflection),
}
enum Progress {
    Format,
    Sources,
    Creates,
    Event,
    Complete(CompletedReflection),
}
pub(crate) struct CompletedReflection {
    pub outcome: Outcome,
    pub events: Vec<WorldEvent>,
    _storage: ByteReservation,
}
pub(crate) struct ReflectionCursor {
    input: ReflectionInput,
    candidate: CandidateKey,
    checkpoint: Option<CandidateCheckpoint>,
    source_check: Option<crate::capture::NpcSourcesCursor>,
    question: Option<MaintenanceFormatRequest>,
    format: Option<VerifiedMaintenanceFormat>,
    publication: Option<Publication>,
    creates: Option<AppraisalCreatesRequest>,
    appraisal_bindings: Option<AppraisalBindings>,
    appraisal: Option<AppraisalChangeCursor>,
    appraisal_index: usize,
    event: Option<EventCursor>,
    event_answer: Option<CompletedOccurrence>,
    events: Vec<WorldEvent>,
    validated: bool,
    budget: ByteBudget,
    storage: Option<ByteReservation>,
}
impl ReflectionCursor {
    fn binding(&self, core: &mut CoreMutation<'_>) -> Result<GeometryBinding, ExecutionError> {
        Ok(GeometryBinding::new(
            self.candidate,
            core.state.installed.geometry.spatial.revision,
            core.journal.next_provider_serial()?,
        ))
    }
    pub(crate) fn new(
        core: &mut CoreMutation<'_>,
        input: ReflectionInput,
        key: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Self, DriveError> {
        let storage = budget
            .reserve(size_of::<Self>())
            .map_err(|_| DriveError::Capacity)?;
        let source_check = input
            .bindings
            .native_guard()
            .ok_or(ExecutionError::InvalidCheckpoint)?
            .source_cursor(core, key, budget)?;
        let binding = GeometryBinding::new(
            key,
            core.state.installed.geometry.spatial.revision,
            core.journal.next_provider_serial()?,
        );
        let question = MaintenanceFormatRequest::prepare(binding, &input.publication, budget)?;
        let checkpoint = core.journal.checkpoint(core.state)?;
        Ok(Self {
            input,
            candidate: key,
            checkpoint: Some(checkpoint),
            source_check,
            question: Some(question),
            format: None,
            publication: None,
            creates: None,
            appraisal_bindings: None,
            appraisal: None,
            appraisal_index: 0,
            event: None,
            event_answer: None,
            events: Vec::new(),
            validated: false,
            budget: budget.clone(),
            storage: Some(storage),
        })
    }
    pub(crate) fn abort(&mut self, core: &mut CoreMutation<'_>) -> Result<(), ExecutionError> {
        if let Some(checkpoint) = self.checkpoint.take() {
            core.journal.rollback_to(core.state, checkpoint)?;
        }
        self.event = None;
        self.appraisal = None;
        self.source_check = None;
        self.question = None;
        self.creates = None;
        Ok(())
    }
    fn merge(&mut self, storage: ByteReservation) -> Result<(), ExecutionError> {
        self.storage
            .as_mut()
            .ok_or(ExecutionError::InvalidCheckpoint)?
            .merge(storage)?;
        Ok(())
    }
    fn outcome(
        &mut self,
        core: &mut CoreMutation<'_>,
        ok: bool,
        code: &str,
        message: JsText,
        keep: bool,
    ) -> Result<Progress, DriveError> {
        let output = self
            .budget
            .reserve(
                code.len()
                    .checked_add(message.heap_bytes().ok_or(ExecutionError::Capacity)?)
                    .ok_or(ExecutionError::Capacity)?,
            )
            .map_err(|_| DriveError::Capacity)?;
        let outcome = Outcome {
            ok,
            code: code.into(),
            message,
            spent: None,
            outputs: None,
            recipe_id: None,
            item_id: None,
            entity_id: None,
            goal_id: None,
            plan_id: None,
            action_id: None,
        };
        self.merge(output)?;
        let checkpoint = self
            .checkpoint
            .take()
            .ok_or(ExecutionError::InvalidCheckpoint)?;
        if keep {
            core.journal.keep(core.state, checkpoint)?;
        } else {
            core.journal.rollback_to(core.state, checkpoint)?;
            self.events.clear();
        }
        let storage = self
            .storage
            .take()
            .ok_or(ExecutionError::InvalidCheckpoint)?;
        Ok(Progress::Complete(CompletedReflection {
            outcome,
            events: std::mem::take(&mut self.events),
            _storage: storage,
        }))
    }
    fn reject(
        &mut self,
        core: &mut CoreMutation<'_>,
        message: &str,
    ) -> Result<Progress, DriveError> {
        let _copy = self
            .budget
            .reserve(message.len())
            .map_err(|_| DriveError::Capacity)?;
        self.outcome(core, false, "publication-rejected", message.into(), false)
    }
    fn body<'a>(&'a self) -> Result<MindPublicationInput<'a>, ExecutionError> {
        let publication = self.publication.as_ref().ok_or(ExecutionError::Invariant)?;
        let format = self.format.as_ref().ok_or(ExecutionError::Invariant)?;
        Ok(MindPublicationInput {
            actor: &publication.actor_id,
            expected_revision: publication.expected_revision,
            job_id: &self.input.job_id,
            snapshot: &publication.snapshot,
            files: &publication.files,
            thoughts: &publication.thoughts,
            evidence_ids: &publication.evidence_ids,
            dream_episode: publication.dream_episode.as_deref(),
            record_changes: &publication.record_changes,
            permitted_subjects: &self.input.permitted_subjects,
            canonical_body: &format.canonical,
            valid_paths: &format.valid_paths,
            file_words: &format.file_words,
            thought_words: &format.thought_words,
        })
    }
    fn drive(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<ReflectionAnswer>,
    ) -> Result<Progress, DriveError> {
        if self.storage.is_none() {
            return Err(ExecutionError::InvalidCheckpoint.into());
        }
        let mut answer = answer;
        if let Some(cursor) = self.source_check.as_mut() {
            let reply = match answer.take() {
                Some(ReflectionAnswer::Sources(a)) => a,
                None => return Ok(Progress::Sources),
                _ => return Err(DriveError::StaleResponse),
            };
            let checked = cursor.complete(core, reply, &self.budget)?;
            self.source_check = None;
            if !checked.unavailable_personal.is_empty() {
                return self.reject(
                    core,
                    "Selected personal evidence changed before reflection publication.",
                );
            }
        }
        if let Some(question) = self.question.as_mut() {
            let reply = match answer.take() {
                Some(ReflectionAnswer::Format(a)) => a,
                None => return Ok(Progress::Format),
                _ => return Err(DriveError::StaleResponse),
            };
            let format = question.finish(reply, &self.budget)?;
            let decode = crate::install::reserve_typed_parse::<Publication>(
                &format.canonical,
                size_of::<InnerRecordChange>()
                    .max(size_of::<SqlCell>())
                    .max(size_of::<crate::plans::GoalChange>()),
                Some(
                    crate::host::retained_size::map_storage::<String, SqlCell>(1)
                        .ok_or(ExecutionError::Capacity)?,
                ),
                &self.budget,
            )
            .map_err(|e| match e {
                crate::install::InstallError::Capacity => DriveError::Capacity,
                _ => DriveError::MalformedResponse,
            })?;
            let publication = serde_json::from_str(&format.canonical)
                .map_err(|_| DriveError::MalformedResponse)?;
            self.merge(decode)?;
            self.publication = Some(publication);
            self.format = Some(format);
            self.question = None;
        }
        if !self.validated {
            let publication = self.publication.as_ref().ok_or(ExecutionError::Invariant)?;
            if publication.actor_id != self.input.bindings.actor_id()
                || Some(publication.expected_revision) != self.input.workspace.inner_revision
                || publication.evidence_ids != self.input.bindings.evidence_ids()
                || publication.dream_episode != self.input.admission.dream_episode
            {
                return Err(ExecutionError::InvalidCheckpoint.into());
            }
            let job = self.body()?.job_id;
            if let Some(prior) = core
                .state
                .minds
                .inner_worlds
                .as_ref()
                .and_then(|m| m.get(&publication.actor_id))
                .filter(|prior| prior.publication_job_id == job)
            {
                if prior.publication_body.as_deref()
                    == self.format.as_ref().map(|f| f.canonical.as_str())
                {
                    let _message = self
                        .budget
                        .reserve("Snapshot already published.".len())
                        .map_err(|_| DriveError::Capacity)?;
                    return self.outcome(
                        core,
                        true,
                        "duplicate",
                        "Snapshot already published.".into(),
                        false,
                    );
                }
                return self.reject(
                    core,
                    "The publication identity was already used or its source was erased.",
                );
            }
            if !self.input.admission.requires_body
                || !self
                    .input
                    .body
                    .current(core.state, &self.input.admission)?
                || !self.input.workspace.workspace_current(core.state)?
                || !self
                    .input
                    .bindings
                    .reflection_sources_current(core.state, &self.budget)?
            {
                return self.reject(
                    core,
                    "Selected personal evidence changed before reflection publication.",
                );
            }
            if let Err(error) = super::reflection::validate_front(core.state, &self.body()?) {
                return match error {
                    MindPublicationError::Refused(message) => self.reject(core, message),
                    MindPublicationError::Execution(e) => Err(e.into()),
                };
            }
            let publication = self.publication.as_ref().ok_or(ExecutionError::Invariant)?;
            if publication.appraisal_changes.len() > 8 {
                return self.reject(core, "Too many appraisal changes.");
            }
            let (bindings, storage) = match self.input.bindings.appraisal_bindings() {
                Some(bindings) => {
                    let storage = self
                        .budget
                        .reserve(bindings.heap_bytes().ok_or(ExecutionError::Capacity)?)
                        .map_err(|_| DriveError::Capacity)?;
                    (Some(bindings.clone()), Some(storage))
                }
                None => (None, None),
            };
            if let Some(storage) = storage {
                self.merge(storage)?;
            }
            self.appraisal_bindings = bindings;
            let binding = self.binding(core)?;
            self.creates = AppraisalCreatesRequest::prepare_changes(
                core.state,
                self.input.bindings.actor_id(),
                self.publication
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?
                    .appraisal_changes
                    .iter(),
                binding,
                &self.budget,
            )?;
            self.validated = true;
        }
        if self.creates.is_some() {
            let reply = match answer.take() {
                Some(ReflectionAnswer::Creates(a)) => a,
                None => return Ok(Progress::Creates),
                _ => return Err(DriveError::StaleResponse),
            };
            let creates = self.creates.take().ok_or(ExecutionError::Invariant)?;
            let storage = creates.finish(
                core.state,
                reply,
                self.appraisal_bindings
                    .as_mut()
                    .ok_or(ExecutionError::Invariant)?,
                &self.budget,
            )?;
            self.merge(storage)?;
        }
        if self.event.is_some() {
            let completed = match answer.take() {
                Some(ReflectionAnswer::Event(a)) => a,
                None => return Ok(Progress::Event),
                _ => return Err(DriveError::StaleResponse),
            };
            let CompletedEvent {
                event,
                completed,
                awareness,
                reservation,
            } = completed;
            drop(awareness);
            let needed = self
                .events
                .len()
                .checked_add(1)
                .ok_or(ExecutionError::Capacity)?;
            let bytes = self
                .storage
                .as_ref()
                .ok_or(ExecutionError::Invariant)?
                .bytes()
                .checked_add(
                    size_of::<WorldEvent>()
                        .checked_mul(needed.saturating_sub(self.events.capacity()))
                        .ok_or(ExecutionError::Capacity)?,
                )
                .ok_or(ExecutionError::Capacity)?;
            self.storage
                .as_mut()
                .ok_or(ExecutionError::Invariant)?
                .resize(bytes)
                .map_err(|_| DriveError::Capacity)?;
            self.events
                .try_reserve_exact(needed.saturating_sub(self.events.len()))
                .map_err(|_| DriveError::Capacity)?;
            self.merge(reservation)?;
            self.events.push(event);
            self.event_answer = Some(completed);
            self.event = None;
        }
        if answer.is_some() {
            return Err(DriveError::StaleResponse);
        }
        loop {
            if let Some(mut cursor) = self.appraisal.take() {
                match cursor.step(core, self.event_answer.take(), &self.budget)? {
                    AppraisalChangeStep::Occurrence(staged) => {
                        let begun = begin_staged_occurrence(core, staged, &self.budget)
                            .map_err(CommandOperationError::from)?;
                        let binding = self.binding(core)?;
                        self.event = Some(
                            EventCursor::prepare(
                                core,
                                begun,
                                binding,
                                EventAccountPlacement::Immediate,
                                &self.budget,
                            )
                            .map_err(CommandOperationError::from)?,
                        );
                        self.appraisal = Some(cursor);
                        return Ok(Progress::Event);
                    }
                    AppraisalChangeStep::Complete(value) => {
                        let (outcome, storage) = value.into_parts();
                        self.merge(storage)?;
                        if !outcome.ok {
                            return self.outcome(
                                core,
                                false,
                                "publication-rejected",
                                outcome.message,
                                false,
                            );
                        }
                        self.appraisal_index += 1;
                    }
                }
            }
            let publication = self.publication.as_ref().ok_or(ExecutionError::Invariant)?;
            if let Some(change) = publication.appraisal_changes.get(self.appraisal_index) {
                let (canonical, _guard) = canonical_change(
                    self.format.as_ref().ok_or(ExecutionError::Invariant)?,
                    self.appraisal_index,
                    &self.budget,
                )?;
                let _id = self
                    .budget
                    .reserve(
                        self.input
                            .job_id
                            .len()
                            .checked_mul(2)
                            .and_then(|n| n.checked_add(64))
                            .ok_or(ExecutionError::Capacity)?,
                    )
                    .map_err(|_| DriveError::Capacity)?;
                let id = format!("{}:appraisal:{}", self.body()?.job_id, self.appraisal_index);
                self.appraisal = Some(AppraisalChangeCursor::new(
                    core,
                    &publication.actor_id,
                    change,
                    canonical,
                    &id,
                    self.appraisal_bindings
                        .as_ref()
                        .ok_or(ExecutionError::InvalidCheckpoint)?,
                    &self.budget,
                )?);
                continue;
            }
            break;
        }
        let publication = self.publication.as_ref().ok_or(ExecutionError::Invariant)?;
        if publication.knowledge_changes.len() > 16 || publication.name_changes.len() > 16 {
            return self.reject(core, "Too many knowledge changes.");
        }
        if publication.name_changes.iter().any(|e| {
            !self
                .input
                .bindings
                .reflection_encounter_current(core.state, &e.subject_id, false)
        }) || publication.knowledge_changes.iter().any(|e| {
            e.subject_id.as_ref().is_some_and(|s| {
                !self
                    .input
                    .bindings
                    .reflection_encounter_current(core.state, s, true)
            })
        }) {
            return self.reject(
                core,
                "A knowledge subject encounter changed during reflection.",
            );
        }
        for i in 0..publication.name_changes.len() {
            let p = self.publication.as_ref().ok_or(ExecutionError::Invariant)?;
            let (outcome, storage) = edits::name(
                core,
                &p.actor_id,
                &p.name_changes[i],
                &self.input.permitted_subjects,
                &p.evidence_ids,
                &self.budget,
            )?;
            self.merge(storage)?;
            if !outcome.ok {
                return self.outcome(core, false, "publication-rejected", outcome.message, false);
            }
        }
        let count = self
            .publication
            .as_ref()
            .ok_or(ExecutionError::Invariant)?
            .knowledge_changes
            .len();
        for i in 0..count {
            let p = self.publication.as_ref().ok_or(ExecutionError::Invariant)?;
            let Some((outcome, storage)) = edits::note(
                core,
                &self.input.bindings,
                &p.knowledge_changes[i],
                &self.input.permitted_subjects,
                &p.evidence_ids,
                &self.budget,
            )?
            else {
                return self.reject(core, "Knowledge subject is not recognized.");
            };
            self.merge(storage)?;
            if !outcome.ok {
                return self.outcome(core, false, "publication-rejected", outcome.message, false);
            }
        }
        let p = self.publication.as_ref().ok_or(ExecutionError::Invariant)?;
        if p.goal_changes.len() > 8
            || (core
                .state
                .physical
                .entities
                .get(&p.actor_id)
                .and_then(|e| e.actor.as_ref())
                .is_some_and(|a| a.controller == "player")
                && !p.goal_changes.is_empty())
        {
            return self.reject(
                core,
                "Reflection cannot replace player intentions or exceed eight goal changes.",
            );
        }
        for i in 0..p.goal_changes.len() {
            let p = self.publication.as_ref().ok_or(ExecutionError::Invariant)?;
            let _id = self
                .budget
                .reserve(
                    self.input
                        .job_id
                        .len()
                        .checked_mul(2)
                        .and_then(|n| n.checked_add(64))
                        .ok_or(ExecutionError::Capacity)?,
                )
                .map_err(|_| DriveError::Capacity)?;
            let id = format!("{}:goal:{}", self.body()?.job_id, i);
            let (outcome, storage) = crate::plans::change_goal(
                core,
                &p.actor_id,
                &p.goal_changes[i],
                &id,
                "actor",
                &self.budget,
            )?
            .into_parts();
            self.merge(storage)?;
            if !outcome.ok {
                return self.outcome(core, false, "publication-rejected", outcome.message, false);
            }
        }
        let prepared = match super::reflection::prepare(core.state, self.body()?, &self.budget) {
            Ok(prepared) => prepared,
            Err(MindPublicationError::Refused(message)) => return self.reject(core, message),
            Err(MindPublicationError::Execution(e)) => return Err(e.into()),
        };
        let actor = self.input.bindings.actor_id();
        super::reflection::publish(core, actor, prepared, &self.budget)?;
        let _message = self
            .budget
            .reserve("Inner world published atomically.".len())
            .map_err(|_| DriveError::Capacity)?;
        self.outcome(
            core,
            true,
            "snapshot-published",
            "Inner world published atomically.".into(),
            true,
        )
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<ReflectionAnswer>,
    ) -> Result<ReflectionStep<'a>, DriveError> {
        let progress = match self.drive(core, answer) {
            Ok(p) => p,
            Err(e @ DriveError::MalformedResponse) | Err(e @ DriveError::StaleResponse) => {
                return Err(e);
            }
            Err(e) => {
                self.abort(core)?;
                return Err(e);
            }
        };
        Ok(match progress {
            Progress::Format => {
                ReflectionStep::Format(self.question.as_ref().ok_or(ExecutionError::Invariant)?)
            }
            Progress::Sources => ReflectionStep::Sources(
                self.source_check
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?
                    .request(),
            ),
            Progress::Creates => {
                ReflectionStep::Creates(self.creates.as_ref().ok_or(ExecutionError::Invariant)?)
            }
            Progress::Event => {
                ReflectionStep::Event(self.event.as_mut().ok_or(ExecutionError::Invariant)?)
            }
            Progress::Complete(c) => ReflectionStep::Complete(c),
        })
    }
}
fn canonical_change(
    format: &VerifiedMaintenanceFormat,
    index: usize,
    budget: &ByteBudget,
) -> Result<(String, ByteReservation), ExecutionError> {
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct Parts<'a> {
        #[serde(borrow)]
        appraisal_changes: Vec<&'a serde_json::value::RawValue>,
    }
    let _parts = budget.reserve(crate::experience::encoded_body_bound(&format.canonical)?)?;
    let parts: Parts<'_> =
        serde_json::from_str(&format.canonical).map_err(|_| ExecutionError::Invariant)?;
    let raw = parts
        .appraisal_changes
        .get(index)
        .ok_or(ExecutionError::Invariant)?
        .get();
    let storage = budget.reserve(raw.len())?;
    Ok((raw.into(), storage))
}
