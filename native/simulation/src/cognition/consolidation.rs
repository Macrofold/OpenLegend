//! Source admission, grouping, attribution and account retirement share one
//! candidate checkpoint. Rejected groups leave every original in place.
use crate::capture::maintenance::{MaintenanceAdmission, MaintenanceCapture};
use crate::capture::{
    NpcHistoricalScope, NpcSourceSelection, NpcSourcesAnswer, NpcSourcesCursor, NpcSourcesRequest,
};
use crate::commands::Outcome;
use crate::execution::{CandidateCheckpoint, CoreMutation, ExecutionError};
use crate::experience::consolidation::{
    ConsolidationFormatAnswer, ConsolidationFormatRequest, ConsolidationGroup, ConsolidationLimits,
    PreparedConsolidation,
};
use crate::geometry::GeometryBinding;
use crate::host::{ByteBudget, ByteReservation, CandidateKey};
use crate::language::{CollationAnswer, CollationRequest};
use crate::simulation::DriveError;
use std::{mem::size_of, sync::Arc};

pub(crate) struct ConsolidationInput {
    pub job: String,
    pub body: Arc<MaintenanceCapture>,
    pub admission: MaintenanceAdmission,
    pub scope: Arc<NpcHistoricalScope>,
    pub selection: NpcSourceSelection,
    pub groups: Vec<ConsolidationGroup>,
    pub limits: ConsolidationLimits,
    pub storage: ByteReservation,
}
pub(crate) enum ConsolidationAnswer {
    Sources(NpcSourcesAnswer),
    Format(ConsolidationFormatAnswer),
    Collation(CollationAnswer),
}
pub(crate) enum ConsolidationStep<'a> {
    Sources(&'a NpcSourcesRequest),
    Format(&'a ConsolidationFormatRequest),
    Collation(&'a CollationRequest),
    Complete(CompletedConsolidation),
}
enum Progress {
    Sources,
    Format,
    Collation,
    Complete(CompletedConsolidation),
}
pub(crate) struct CompletedConsolidation {
    pub outcome: Outcome,
    pub actor: String,
    pub retired: Vec<String>,
    _storage: ByteReservation,
}
pub(crate) struct ConsolidationCursor {
    job: String,
    body: Arc<MaintenanceCapture>,
    admission: MaintenanceAdmission,
    checkpoint: Option<CandidateCheckpoint>,
    candidate: CandidateKey,
    source: Option<NpcSourcesCursor>,
    format: Option<ConsolidationFormatRequest>,
    prepared: Option<PreparedConsolidation>,
    collation: Option<CollationRequest>,
    groups: Option<Vec<ConsolidationGroup>>,
    limits: ConsolidationLimits,
    budget: ByteBudget,
    storage: Option<ByteReservation>,
}
impl ConsolidationCursor {
    pub(crate) fn new(
        core: &mut CoreMutation<'_>,
        input: ConsolidationInput,
        candidate: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Self, DriveError> {
        if input.selection.consolidation_job.as_deref() != Some(input.job.as_str())
            || !input.body.current(core.state, &input.admission)?
        {
            return Err(ExecutionError::InvalidCheckpoint.into());
        }
        let mut storage = input.storage;
        storage
            .merge(
                budget
                    .reserve(size_of::<Self>())
                    .map_err(|_| DriveError::Capacity)?,
            )
            .map_err(|_| DriveError::Capacity)?;
        let checkpoint = core.journal.checkpoint(core.state)?;
        let source =
            match NpcSourcesCursor::new(core, input.scope, input.selection, candidate, budget) {
                Ok(c) => c,
                Err(e) => {
                    core.journal.rollback_to(core.state, checkpoint)?;
                    return Err(e.into());
                }
            };
        Ok(Self {
            job: input.job,
            body: input.body,
            admission: input.admission,
            checkpoint: Some(checkpoint),
            candidate,
            source: Some(source),
            format: None,
            prepared: None,
            collation: None,
            groups: Some(input.groups),
            limits: input.limits,
            budget: budget.clone(),
            storage: Some(storage),
        })
    }
    fn binding(&self, core: &mut CoreMutation<'_>) -> Result<GeometryBinding, ExecutionError> {
        Ok(GeometryBinding::new(
            self.candidate,
            core.state.installed.geometry.spatial.revision,
            core.journal.next_provider_serial()?,
        ))
    }
    pub(crate) fn abort(&mut self, core: &mut CoreMutation<'_>) -> Result<(), ExecutionError> {
        if let Some(checkpoint) = self.checkpoint.take() {
            core.journal.rollback_to(core.state, checkpoint)?;
        }
        self.source = None;
        self.format = None;
        self.prepared = None;
        self.collation = None;
        Ok(())
    }
    fn complete(
        &mut self,
        core: &mut CoreMutation<'_>,
        ok: bool,
        code: &str,
        message: &str,
        retired: Vec<String>,
        keep: bool,
    ) -> Result<Progress, DriveError> {
        let bytes = code
            .len()
            .checked_add(message.len())
            .and_then(|n| n.checked_add(self.body.request.actor_id.len()))
            .ok_or(ExecutionError::Capacity)?;
        let mut storage = self
            .storage
            .take()
            .ok_or(ExecutionError::InvalidCheckpoint)?;
        storage
            .merge(
                self.budget
                    .reserve(bytes)
                    .map_err(|_| DriveError::Capacity)?,
            )
            .map_err(|_| DriveError::Capacity)?;
        let checkpoint = self
            .checkpoint
            .take()
            .ok_or(ExecutionError::InvalidCheckpoint)?;
        if keep {
            core.journal.keep(core.state, checkpoint)?;
        } else {
            core.journal.rollback_to(core.state, checkpoint)?;
        }
        Ok(Progress::Complete(CompletedConsolidation {
            outcome: Outcome {
                ok,
                code: code.into(),
                message: message.into(),
                spent: None,
                outputs: None,
                recipe_id: None,
                item_id: None,
                entity_id: None,
                goal_id: None,
                plan_id: None,
                action_id: None,
            },
            actor: self.body.request.actor_id.clone(),
            retired,
            _storage: storage,
        }))
    }
    fn reject(
        &mut self,
        core: &mut CoreMutation<'_>,
        message: &str,
    ) -> Result<Progress, DriveError> {
        self.complete(
            core,
            false,
            "consolidation-rejected",
            message,
            Vec::new(),
            false,
        )
    }
    fn drive(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<ConsolidationAnswer>,
    ) -> Result<Progress, DriveError> {
        if self.checkpoint.is_none() {
            return Err(ExecutionError::InvalidCheckpoint.into());
        }
        if let Some(source) = self.source.as_mut() {
            let answer = match answer {
                None => return Ok(Progress::Sources),
                Some(ConsolidationAnswer::Sources(a)) => a,
                _ => return Err(DriveError::StaleResponse),
            };
            let sources = source.complete(core, answer, &self.budget)?;
            self.source = None;
            if sources.duplicate_summary == Some(true) {
                return self.complete(
                    core,
                    true,
                    "duplicate",
                    "Memory groups already accepted.",
                    Vec::new(),
                    false,
                );
            }
            if !sources.unavailable_personal.is_empty() || !sources.unavailable_receipts.is_empty()
            {
                return self.reject(core, "Source coverage changed.");
            }
            let binding = self.binding(core)?;
            self.format = Some(ConsolidationFormatRequest::prepare(
                binding,
                &self.body.request.actor_id,
                &sources,
                &self.budget,
            )?);
            return Ok(Progress::Format);
        }
        if let Some(format) = self.format.as_ref() {
            let answer = match answer {
                None => return Ok(Progress::Format),
                Some(ConsolidationAnswer::Format(a)) => a,
                _ => return Err(DriveError::StaleResponse),
            };
            format.validate(&answer)?;
            let format = self.format.take().ok_or(ExecutionError::Invariant)?;
            let prepared = match PreparedConsolidation::prepare(
                core.state,
                format,
                answer,
                &self.job,
                self.groups.take().ok_or(ExecutionError::Invariant)?,
                self.limits,
                &self.budget,
            ) {
                Ok(p) => p,
                Err(crate::experience::HistoryPreparationError::Owner(
                    ExecutionError::InvalidCheckpoint,
                )) => return self.reject(core, "Invalid memory groups or source coverage."),
                Err(e) => return Err(e.into()),
            };
            let binding = self.binding(core)?;
            let existing = core
                .state
                .experience
                .optional_collection(
                    prepared.actor_id(),
                    crate::experience::PersonalSourceKind::Summary,
                )
                .map_err(ExecutionError::from)?;
            let keys = prepared.collation_keys().chain(
                existing
                    .filter(|c| c.coverage().complete)
                    .into_iter()
                    .flat_map(|c| c.records())
                    .map(|r| r.header().reference.id.as_str()),
            );
            let collation = CollationRequest::prepare(binding, keys, &self.budget)
                .map_err(|_| DriveError::Capacity)?;
            self.prepared = Some(prepared);
            self.collation = Some(collation);
            return Ok(Progress::Collation);
        }
        if let Some(question) = self.collation.as_mut() {
            let answer = match answer {
                None => return Ok(Progress::Collation),
                Some(ConsolidationAnswer::Collation(a)) => a,
                _ => return Err(DriveError::StaleResponse),
            };
            if answer.binding != question.binding() {
                return Err(DriveError::StaleResponse);
            }
            question
                .validate(&answer)
                .map_err(|_| DriveError::MalformedResponse)?;
            let ranks = self
                .collation
                .take()
                .ok_or(ExecutionError::Invariant)?
                .finish(&answer)
                .map_err(|_| DriveError::MalformedResponse)?;
            if !self.body.current(core.state, &self.admission)? || core.state.physical.header.paused
            {
                return self.reject(core, "Consolidation canceled before publication.");
            }
            let applied = self
                .prepared
                .take()
                .ok_or(ExecutionError::Invariant)?
                .apply(core, &ranks, &self.budget);
            let retired = match applied {
                Ok(ids) => ids,
                Err(ExecutionError::InvalidCheckpoint) => {
                    return self.reject(core, "Protected or forgotten sources changed.");
                }
                Err(e) => return Err(e.into()),
            };
            return self.complete(
                core,
                true,
                "consolidated",
                "Explicit memory groups accepted; covered routine sources retired.",
                retired,
                true,
            );
        }
        Err(ExecutionError::Invariant.into())
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<ConsolidationAnswer>,
    ) -> Result<ConsolidationStep<'a>, DriveError> {
        let progress = match self.drive(core, answer) {
            Ok(p) => p,
            Err(
                e @ (DriveError::StaleResponse
                | DriveError::MalformedResponse
                | DriveError::Capacity),
            ) => return Err(e),
            Err(e) => {
                self.abort(core)?;
                return Err(e);
            }
        };
        Ok(match progress {
            Progress::Sources => ConsolidationStep::Sources(
                self.source
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?
                    .request(),
            ),
            Progress::Format => {
                ConsolidationStep::Format(self.format.as_ref().ok_or(ExecutionError::Invariant)?)
            }
            Progress::Collation => ConsolidationStep::Collation(
                self.collation.as_ref().ok_or(ExecutionError::Invariant)?,
            ),
            Progress::Complete(done) => ConsolidationStep::Complete(done),
        })
    }
}
