//! Current-format restore is one private candidate. Metadata and actual
//! accepted privacy share its root rollback and one whole-install SQL seal.
use crate::commands::Outcome;
use crate::execution::{CoreMutation, ExecutionError};
use crate::experience::{
    HistoryEditLimits, HistoryPreparationError, PrivacyEditAnswer, RestorePrivacyCursor,
    RestorePrivacyInput, RestorePrivacyStep,
};
use crate::host::{ByteBudget, ByteReservation, CandidateKey};
use crate::restore::{
    RestoreArchivesAnswer, RestoreArchivesCursor, RestoreArchivesQuestion, RestoreArchivesStep,
    RestoreMetadataInput, RestoreMetadataPreparation, RestoreMetadataResult,
    apply_restore_archive_baseline, begin_restore_metadata, finish_restore_metadata,
};
use crate::text::JsText;
use serde::Deserialize;

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
        let storage = budget.reserve(std::mem::size_of::<Self>())
            .map_err(|_| DriveError::Capacity)?;
        let rows = crate::simulation::encode_candidate_changes(core.state, core.journal, None, budget)
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
        ).map_err(|_| DriveError::Encoding)?;
        let merge = budget.reserve(
            crate::records::merge_workspace_bound(rows.changes(), packed.changes())
                .ok_or(DriveError::Capacity)?,
        ).map_err(|_| DriveError::Capacity)?;
        let (changes, owners, rows_guard) = rows.into_parts();
        let (pages, page_owners, pages_guard, residency) = packed.into_parts();
        let changes = crate::records::merge_changes(changes, pages, &core.state.installed.schema)
            .map_err(|_| DriveError::Encoding)?;
        Ok(Self { changes, _owners: owners, _page_owners: page_owners,
            _residency: residency, _rows: rows_guard, _pages: pages_guard,
            _merge: merge, _storage: storage })
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct RestoreInput {
    pub privacy: RestorePrivacyInput,
    pub metadata: RestoreMetadataInput,
}
pub(crate) struct CompletedRestore {
    pub outcome: Outcome,
    pub metadata: RestoreMetadataResult,
    pub source_versions: Option<super::driver::source_versions::SourceVersionsAnswer>,
    _storage: ByteReservation,
}
pub(crate) struct RestoreReconcileCursor {
    privacy: RestorePrivacyCursor,
    metadata: Option<RestoreMetadataPreparation>,
    archives: Option<RestoreArchivesCursor>,
    privacy_done: bool,
    key: CandidateKey,
    done: bool,
    temporal_save_limits: crate::received::TemporalSaveLimits,
    durable_identity_through: u64,
    _storage: ByteReservation,
}
pub(crate) enum RestoreStep<'a> {
    History(std::sync::Arc<crate::experience::HistoryEditQuestion>),
    Collation(&'a crate::language::CollationRequest),
    Archives(std::sync::Arc<RestoreArchivesQuestion>),
    Complete(CompletedRestore),
}
pub(crate) enum RestoreAnswer {
    Privacy(PrivacyEditAnswer),
    Archives(RestoreArchivesAnswer),
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
        let storage = budget.reserve(std::mem::size_of::<Self>())?;
        let metadata = begin_restore_metadata(core, input.metadata, budget)?;
        let privacy = RestorePrivacyCursor::new(core, input.privacy, key, limits, budget)?;
        Ok(Self {
            privacy,
            metadata: Some(metadata),
            archives: None,
            privacy_done: false,
            key,
            done: false,
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
        self.done = true;
        Ok(())
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        mut answer: Option<RestoreAnswer>,
        budget: &ByteBudget,
    ) -> Result<RestoreStep<'a>, HistoryPreparationError> {
        if self.done {
            return Err(HistoryPreparationError::StaleResponse);
        }
        if !self.privacy_done {
            let answer = match answer.take() {
                Some(RestoreAnswer::Privacy(answer)) => Some(answer),
                None => None,
                _ => return Err(HistoryPreparationError::StaleResponse),
            };
            match self.privacy.step(core, answer, budget)? {
                RestorePrivacyStep::History(question) => return Ok(RestoreStep::History(question)),
                RestorePrivacyStep::Collation(question) => {
                    return Ok(RestoreStep::Collation(question));
                }
                RestorePrivacyStep::Complete => {}
            }
            self.privacy_done = true;
            self.archives = Some(RestoreArchivesCursor::new(
                core,
                self.metadata.take().ok_or(ExecutionError::Invariant)?,
                self.key,
                budget,
            )?);
        }
        let answer = match answer {
            Some(RestoreAnswer::Archives(answer)) => Some(answer),
            None => None,
            _ => return Err(HistoryPreparationError::StaleResponse),
        };
        let metadata = match self
            .archives
            .as_mut()
            .ok_or(ExecutionError::Invariant)?
            .step(core, answer, budget)?
        {
            RestoreArchivesStep::Question(question) => return Ok(RestoreStep::Archives(question)),
            RestoreArchivesStep::Complete(metadata) => metadata,
        };
        self.archives = None;
        let storage = budget
            .reserve(std::mem::size_of::<CompletedRestore>() + 128)
            .map_err(ExecutionError::from)?;
        let baseline = apply_restore_archive_baseline(core, metadata, budget)?;
        let archives =
            baseline.prepare_versions(&crate::received::SourceVersionPlan::empty(), budget)?;
        let metadata = finish_restore_metadata(core, baseline, archives, budget)?;
        self.done = true;
        Ok(RestoreStep::Complete(CompletedRestore {
            // Internal preparation status; only the existing application save
            // owner publishes the actual load receipt to its requester.
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
            source_versions: None,
            _storage: storage,
        }))
    }
}
