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
    begin_restore_metadata, finish_restore_metadata,
};
use crate::text::JsText;
use serde::Deserialize;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct RestoreInput {
    pub privacy: RestorePrivacyInput,
    pub metadata: RestoreMetadataInput,
}
pub(crate) struct CompletedRestore {
    pub outcome: Outcome,
    pub metadata: RestoreMetadataResult,
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
        let metadata = finish_restore_metadata(core, metadata, budget)?;
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
            _storage: storage,
        }))
    }
}
