//! Current-format restore is one private candidate. Metadata and actual
//! accepted privacy share its root rollback and one whole-install SQL seal.
use super::driver::source_versions::{Finalizer, SourceVersionsAnswer};
use super::driver::{DriveError, ProviderQuestion};
use crate::commands::Outcome;
use crate::execution::{CoreMutation, ExecutionError};
use crate::experience::{
    HistoryEditLimits, PrivacyEditAnswer, RestorePrivacyCursor, RestorePrivacyInput,
    RestorePrivacyStep,
};
use crate::host::{ByteBudget, ByteReservation, CandidateKey};
use crate::restore::{
    PreparedRestoreArchives, RestoreArchiveBaseline, RestoreArchivesAnswer, RestoreArchivesCursor,
    RestoreArchivesQuestion, RestoreArchivesStep, RestoreMetadataInput, RestoreMetadataPreparation,
    RestoreMetadataResult, apply_restore_archive_baseline, begin_restore_metadata,
    finish_restore_metadata,
};
use crate::text::JsText;
use serde::Deserialize;
use std::sync::Arc;
mod retention;
use retention::{
    RestoreRetentionCursor, RestoreRetentionPreparation, RetentionAnswer, RetentionStep,
};

/// This is the actual packed private SQL view held through restore's bounded
/// rounds. Row bodies and merge backing remain funded with the detached view.
pub(super) struct RestoreReadProjection {
    pub(super) changes: crate::records::ChangedRows,
    _owners: Vec<crate::records::OwnerCoverage>,
    _page_owners: Vec<crate::records::OwnerCoverage>,
    _residency: std::sync::Arc<crate::received::SavedTemporalResidency>,
    _rows: ByteReservation,
    _pages: ByteReservation,
    _merge: ByteReservation,
    _storage: ByteReservation,
}
impl RestoreReadProjection {
    pub(super) fn capture(
        core: &CoreMutation<'_>,
        key: CandidateKey,
        limits: crate::received::TemporalSaveLimits,
        floor: u64,
        budget: &ByteBudget,
    ) -> Result<Self, super::driver::DriveError> {
        use super::driver::DriveError;
        let storage = budget
            .reserve(std::mem::size_of::<Self>())
            .map_err(|_| DriveError::Capacity)?;
        let rows =
            crate::simulation::encode_candidate_changes(core.state, core.journal, None, budget)
                .map_err(|_| DriveError::Encoding)?;
        let packed = crate::received::pack_temporal_save(
            &crate::records::save::TemporalSaveCut {
                world_id: &core.state.physical.header.id,
                generation: &core.state.generation,
                through_cut: key.base_cut.checked_add(1).ok_or(DriveError::Capacity)?,
                identity_through: core.state.physical.identity.next_id(),
                temporal: &core.state.temporal,
            },
            rows.changes(),
            Some(floor),
            limits,
            &core.state.installed.schema,
            budget,
        )
        .map_err(|_| DriveError::Encoding)?;
        let merge = budget
            .reserve(
                crate::records::merge_workspace_bound(rows.changes(), packed.changes())
                    .ok_or(DriveError::Capacity)?,
            )
            .map_err(|_| DriveError::Capacity)?;
        let (changes, owners, rows_guard) = rows.into_parts();
        let (pages, page_owners, pages_guard, residency) = packed.into_parts();
        let changes = crate::records::merge_changes(changes, pages, &core.state.installed.schema)
            .map_err(|_| DriveError::Encoding)?;
        Ok(Self {
            changes,
            _owners: owners,
            _page_owners: page_owners,
            _residency: residency,
            _rows: rows_guard,
            _pages: pages_guard,
            _merge: merge,
            _storage: storage,
        })
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct RestoreInput {
    pub privacy: RestorePrivacyInput,
    pub metadata: RestoreMetadataInput,
    pub retention_preparation: RestoreRetentionPreparation,
}
pub(crate) struct CompletedRestore {
    pub outcome: Outcome,
    pub metadata: RestoreMetadataResult,
    pub source_versions: Option<SourceVersionsAnswer>,
    _storage: ByteReservation,
}
enum Phase {
    Privacy,
    Archives,
    Plan,
    Retention,
    Finish,
    Done,
}
pub(crate) struct RestoreReconcileCursor {
    privacy: RestorePrivacyCursor,
    metadata: Option<RestoreMetadataPreparation>,
    archives: Option<RestoreArchivesCursor>,
    baseline: Option<RestoreArchiveBaseline>,
    entry: Option<(
        crate::experience::ExperienceCheckpoint,
        RestoreReadProjection,
    )>,
    finalizer: Option<Finalizer>,
    source_versions: Option<SourceVersionsAnswer>,
    prepared_archives: Option<PreparedRestoreArchives>,
    retention: Option<RestoreRetentionCursor>,
    preparation: RestoreRetentionPreparation,
    round: usize,
    phase: Phase,
    privacy_edit_materialized: bool,
    key: CandidateKey,
    temporal_save_limits: crate::received::TemporalSaveLimits,
    durable_identity_through: u64,
    _storage: ByteReservation,
}
pub(crate) enum RestoreStep<'a> {
    Continue,
    History(Arc<crate::experience::HistoryEditQuestion>),
    Collation(&'a crate::language::CollationRequest),
    Archives(Arc<RestoreArchivesQuestion>),
    Retention(Arc<crate::experience::retention::RestoreRetentionQuestion>),
    Support(&'a crate::received::SupportMembershipRequest),
    RetentionCollation(&'a crate::language::CollationRequest),
    SourceVersions(Arc<ProviderQuestion>),
    Complete(CompletedRestore),
}
pub(crate) enum RestoreAnswer {
    Privacy(PrivacyEditAnswer),
    Archives(RestoreArchivesAnswer),
    Retention(crate::experience::retention::RestoreRetentionAnswer),
    Support(crate::received::SupportMembershipAnswer),
    RetentionCollation(crate::language::CollationAnswer),
    SourceVersions(SourceVersionsAnswer),
}
impl RestoreReconcileCursor {
    pub(crate) fn new(
        core: &mut CoreMutation<'_>,
        input: RestoreInput,
        key: CandidateKey,
        limits: HistoryEditLimits,
        temporal_save_limits: crate::received::TemporalSaveLimits,
        durable_identity_through: u64,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        if input.retention_preparation.rounds == 0 {
            return Err(ExecutionError::Invariant);
        }
        let storage = budget.reserve(std::mem::size_of::<Self>())?;
        core.state.occurrences.materialize_empty_archive_count();
        let metadata = begin_restore_metadata(core, input.metadata, budget)?;
        let privacy = RestorePrivacyCursor::new(core, input.privacy, key, limits, budget)?;
        Ok(Self {
            privacy,
            metadata: Some(metadata),
            archives: None,
            baseline: None,
            entry: None,
            finalizer: None,
            source_versions: None,
            prepared_archives: None,
            retention: None,
            preparation: input.retention_preparation,
            round: 0,
            phase: Phase::Privacy,
            privacy_edit_materialized: false,
            key,
            temporal_save_limits,
            durable_identity_through,
            _storage: storage,
        })
    }
    pub(crate) fn read_projection_settings(&self) -> (crate::received::TemporalSaveLimits, u64) {
        (self.temporal_save_limits, self.durable_identity_through)
    }
    pub(crate) fn abort(&mut self, core: &mut CoreMutation<'_>) -> Result<(), ExecutionError> {
        self.privacy.abort(core)?;
        self.metadata = None;
        self.archives = None;
        self.baseline = None;
        self.entry = None;
        self.finalizer = None;
        self.source_versions = None;
        self.prepared_archives = None;
        self.retention = None;
        self.phase = Phase::Done;
        Ok(())
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<RestoreAnswer>,
        budget: &ByteBudget,
    ) -> Result<RestoreStep<'a>, DriveError> {
        match self.phase {
            Phase::Privacy => {
                if !self.privacy_edit_materialized {
                    // Source opens a default world draft for the first actual
                    // correction group or newly replayed forget operation.
                    if self.privacy.has_pending_edits(core) {
                        core.materialize_world_edit()?;
                    }
                    self.privacy_edit_materialized = true;
                }
                let supplied = match answer {
                    Some(RestoreAnswer::Privacy(answer)) => Some(answer),
                    None => None,
                    _ => return Err(DriveError::StaleResponse),
                };
                match self.privacy.step(core, supplied, budget)? {
                    RestorePrivacyStep::History(question) => {
                        return Ok(RestoreStep::History(question));
                    }
                    RestorePrivacyStep::Collation(question) => {
                        return Ok(RestoreStep::Collation(question));
                    }
                    RestorePrivacyStep::Complete => {}
                }
                self.archives = Some(RestoreArchivesCursor::new(
                    core,
                    self.metadata.take().ok_or(ExecutionError::Invariant)?,
                    self.key,
                    budget,
                )?);
                self.phase = Phase::Archives;
            }
            Phase::Archives => {
                let supplied = match answer {
                    Some(RestoreAnswer::Archives(answer)) => Some(answer),
                    None => None,
                    _ => return Err(DriveError::StaleResponse),
                };
                let metadata = match self
                    .archives
                    .as_mut()
                    .ok_or(ExecutionError::Invariant)?
                    .step(core, supplied, budget)?
                {
                    RestoreArchivesStep::Question(question) => {
                        return Ok(RestoreStep::Archives(question));
                    }
                    RestoreArchivesStep::Complete(metadata) => metadata,
                };
                self.archives = None;
                self.baseline = Some(apply_restore_archive_baseline(core, metadata, budget)?);
                self.phase = Phase::Plan;
            }
            Phase::Plan => {
                self.retention = None;
                if let Some(finalizer) = &self.finalizer {
                    let supplied = match answer {
                        Some(RestoreAnswer::SourceVersions(answer)) => answer,
                        None => {
                            return Ok(RestoreStep::SourceVersions(Arc::clone(
                                &finalizer.question,
                            )));
                        }
                        _ => return Err(DriveError::StaleResponse),
                    };
                    let (answer, archives) = finalizer.finish_restore(
                        core,
                        supplied,
                        self.baseline.as_ref().ok_or(ExecutionError::Invariant)?,
                        budget,
                    )?;
                    self.source_versions = Some(answer);
                    self.prepared_archives = Some(archives);
                    self.finalizer = None;
                    self.retention = Some(RestoreRetentionCursor::new(
                        core,
                        self.key,
                        self.preparation,
                        budget,
                    )?);
                    self.round += 1;
                    self.phase = Phase::Retention;
                    return Ok(RestoreStep::Continue);
                }
                if answer.is_some() {
                    return Err(DriveError::StaleResponse);
                }
                if self.entry.is_none() {
                    let projection = RestoreReadProjection::capture(
                        core,
                        self.key,
                        self.temporal_save_limits,
                        self.durable_identity_through,
                        budget,
                    )?;
                    self.entry = Some((core.journal.experience.checkpoint(), projection));
                }
                // Source resets only the prior prepared archive/account deltas;
                // all actual personal retirements remain in the same journal.
                if let Some(mut prior) = self.source_versions.take() {
                    Finalizer::reset_restore(core, &mut prior, budget)?;
                }
                self.prepared_archives = None;
                let (checkpoint, projection) =
                    self.entry.as_ref().ok_or(ExecutionError::Invariant)?;
                let serial = core.journal.next_provider_serial()?;
                self.finalizer = Finalizer::prepare_restore(
                    core,
                    self.key,
                    *checkpoint,
                    &projection.changes,
                    self.baseline.as_ref().ok_or(ExecutionError::Invariant)?,
                    serial,
                    budget,
                )?;
                if let Some(finalizer) = &self.finalizer {
                    return Ok(RestoreStep::SourceVersions(Arc::clone(&finalizer.question)));
                }
                self.prepared_archives = Some(
                    self.baseline
                        .as_ref()
                        .ok_or(ExecutionError::Invariant)?
                        .prepare_versions(&crate::received::SourceVersionPlan::empty(), budget)?,
                );
                self.retention = Some(RestoreRetentionCursor::new(
                    core,
                    self.key,
                    self.preparation,
                    budget,
                )?);
                self.round += 1;
                self.phase = Phase::Retention;
            }
            Phase::Retention => {
                let supplied = match answer {
                    Some(RestoreAnswer::Retention(answer)) => {
                        Some(RetentionAnswer::Account(answer))
                    }
                    Some(RestoreAnswer::Support(answer)) => Some(RetentionAnswer::Support(answer)),
                    Some(RestoreAnswer::RetentionCollation(answer)) => {
                        Some(RetentionAnswer::Collation(answer))
                    }
                    None => None,
                    _ => return Err(DriveError::StaleResponse),
                };
                match self
                    .retention
                    .as_mut()
                    .ok_or(ExecutionError::Invariant)?
                    .step(core, supplied, budget)?
                {
                    RetentionStep::Continue => return Ok(RestoreStep::Continue),
                    RetentionStep::Accounts(question) => {
                        return Ok(RestoreStep::Retention(question));
                    }
                    RetentionStep::Support(question) => return Ok(RestoreStep::Support(question)),
                    RetentionStep::Collation(question) => {
                        return Ok(RestoreStep::RetentionCollation(question));
                    }
                    RetentionStep::Complete { source_changed } => {
                        if !source_changed {
                            self.phase = Phase::Finish;
                        } else if self.round == self.preparation.rounds {
                            return Err(ExecutionError::Received(crate::received::ReceivedError(
                                "Exact source closure cannot fit its complete retained account allowance."
                            )).into());
                        } else {
                            self.phase = Phase::Plan;
                        }
                    }
                }
            }
            Phase::Finish => {
                self.retention = None;
                if answer.is_some() {
                    return Err(DriveError::StaleResponse);
                }
                let storage = budget
                    .reserve(std::mem::size_of::<CompletedRestore>() + 128)
                    .map_err(|_| DriveError::Capacity)?;
                let metadata = finish_restore_metadata(
                    core,
                    self.baseline.take().ok_or(ExecutionError::Invariant)?,
                    self.prepared_archives
                        .take()
                        .ok_or(ExecutionError::Invariant)?,
                    budget,
                )?;
                self.retention = None;
                self.entry = None;
                self.phase = Phase::Done;
                return Ok(RestoreStep::Complete(CompletedRestore {
                    outcome: Outcome {
                        ok: true,
                        code: "restore-prepared".to_owned(),
                        message: JsText::from("Accepted privacy constraints restored."),
                        spent: None,
                        outputs: None,
                        recipe_id: None,
                        item_id: None,
                        entity_id: None,
                        goal_id: None,
                        plan_id: None,
                        action_id: None,
                    },
                    metadata,
                    source_versions: self.source_versions.take(),
                    _storage: storage,
                }));
            }
            Phase::Done => return Err(DriveError::StaleResponse),
        }
        Ok(RestoreStep::Continue)
    }
}
