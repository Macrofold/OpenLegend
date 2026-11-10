//! One preflight for the accepted record ledger, accumulating save and undo
//! release. Host input/permission and live-work reservations remain independent
//! gates: preparing this private product alone never exposes a Ready candidate.
use super::{SimulationState, encode_candidate_changes};
use crate::execution::{CandidateJournal, ExecutionError, PreparedJournalRelease};
use crate::host::{
    AcceptedCandidate, ByteBudget, ByteReservation, CandidateFence, CandidateKey, CandidatePhase,
    FenceError,
};
use crate::records::save::{PreparedSaveAppend, SaveError, SaveJournal};
use crate::records::{PreparedRecordLedger, RecordEncodingError};
use crate::values::WorkVector;
use std::sync::Arc;

#[derive(Debug)]
pub(crate) enum PublicationError {
    Execution(ExecutionError),
    Records(RecordEncodingError),
    Save(SaveError),
    Fence(FenceError),
}
impl From<ExecutionError> for PublicationError {
    fn from(error: ExecutionError) -> Self {
        Self::Execution(error)
    }
}
impl From<RecordEncodingError> for PublicationError {
    fn from(error: RecordEncodingError) -> Self {
        Self::Records(error)
    }
}
impl From<SaveError> for PublicationError {
    fn from(error: SaveError) -> Self {
        Self::Save(error)
    }
}
impl From<FenceError> for PublicationError {
    fn from(error: FenceError) -> Self {
        Self::Fence(error)
    }
}

pub(crate) struct PreparedPublication {
    key: CandidateKey,
    fence: Arc<CandidateFence>,
    release: PreparedJournalRelease,
    ledger: PreparedRecordLedger,
    append: PreparedSaveAppend,
    allocation: WorkVector,
    _reservation: ByteReservation,
}
impl PreparedPublication {
    pub(crate) fn prepare(
        state: &mut SimulationState,
        journal: &CandidateJournal,
        save: &mut SaveJournal,
        fence: &Arc<CandidateFence>,
        key: CandidateKey,
        host: Option<super::save::HostSave<'_>>,
        protected: Option<crate::received::TemporalSaveLimits>,
        source_versions: crate::received::SourceVersionPlan,
        budget: &ByteBudget,
    ) -> Result<Self, PublicationError> {
        let reservation = budget
            .reserve(std::mem::size_of::<Self>())
            .map_err(|_| ExecutionError::Capacity)?;
        fence.validate_phase(key, CandidatePhase::Preparing)?;
        let release = journal.prepare_release(state, key)?;
        let allocation = state.work_allocation().map_err(ExecutionError::from)?;
        let source_versions = save.fund_source_versions(source_versions)?;
        let rows = encode_candidate_changes(state, journal, host, budget)?;
        let (changes, owners, rows_guard) = rows.into_parts();
        // The encoded rows keep their original custody until the accumulating
        // save has funded and taken the actual bodies. This is the last
        // fallible preparation, so refusal leaves no pending save admission.
        let (append, ledger) = if let Some(limits) = protected {
            save.prepare_protected_append(
                key,
                crate::records::save::TemporalSaveCut {
                    world_id: &state.physical.header.id,
                    generation: &state.generation,
                    through_cut: key.base_cut + 1,
                    identity_through: state.physical.identity.next_id(),
                    temporal: &state.temporal,
                },
                changes,
                source_versions,
                &owners,
                limits,
                &state.installed.schema,
                &mut state.records,
                budget,
            )?
        } else {
            let ledger = state.records.prepare_accepted(key, &changes, &owners)?;
            let append = save.prepare_append(
                key,
                state.physical.identity.next_id(),
                changes,
                source_versions,
                &state.installed.schema,
                budget,
            )?;
            (append, ledger)
        };
        drop(owners);
        drop(rows_guard);
        Ok(Self {
            key,
            fence: Arc::clone(fence),
            release,
            ledger,
            append,
            allocation,
            _reservation: reservation,
        })
    }
    /// The server reserves this actual native allocation summary through its
    /// existing HostWork owner, without rebuilding a TypeScript world.
    pub(crate) fn allocation(&self) -> WorkVector {
        self.allocation
    }
    pub(crate) fn read_changes<'a>(
        &self,
        save: &'a SaveJournal,
    ) -> Result<&'a crate::records::ChangedRows, PublicationError> {
        save.prepared_changes(&self.append).map_err(Into::into)
    }
    pub(crate) fn source_versions<'a>(
        &self,
        save: &'a SaveJournal,
    ) -> Result<&'a crate::received::SourceVersionPlan, PublicationError> {
        Ok(save.prepared_source_versions(&self.append)?)
    }
    pub(crate) fn read_protected_prefix<'a>(
        &self,
        save: &'a SaveJournal,
    ) -> Result<Option<&'a crate::records::SaveRows>, PublicationError> {
        save.prepared_prefix(&self.append).map_err(Into::into)
    }
    pub(crate) fn restore_residency<'a>(
        &self,
        save: &'a SaveJournal,
    ) -> Result<&'a Arc<crate::received::SavedTemporalResidency>, PublicationError> {
        Ok(save
            .prepared_prefix_owner(&self.append)?
            .ok_or(SaveError::Binding)?
            .temporal_residency())
    }
    /// Check exact owners immediately before the separate host fence flips.
    /// There is no serialization, world traversal or capacity admission here.
    pub(crate) fn validate(
        &self,
        state: &SimulationState,
        journal: &CandidateJournal,
        save: &SaveJournal,
        key: CandidateKey,
    ) -> Result<(), PublicationError> {
        if key != self.key {
            return Err(ExecutionError::InvalidCheckpoint.into());
        }
        self.fence.validate_phase(key, CandidatePhase::Preparing)?;
        self.validate_owners(state, journal, save)
    }
    fn validate_owners(
        &self,
        state: &SimulationState,
        journal: &CandidateJournal,
        save: &SaveJournal,
    ) -> Result<(), PublicationError> {
        let key = self.key;
        journal.validate_release(state, &self.release, key)?;
        state.records.validate_prepared(&self.ledger, key)?;
        save.validate_prepared(&self.append)?;
        Ok(())
    }
    /// Rejecting publication only releases its provisional record/save work.
    /// The writer still owns the journal and must roll the candidate back.
    pub(crate) fn reject(self, save: &mut SaveJournal) -> Result<(), (PublicationError, Self)> {
        let phase = self.fence.phase();
        if !matches!(
            phase,
            CandidatePhase::Preparing | CandidatePhase::Rejected | CandidatePhase::RollingBack
        ) {
            return Err((FenceError::NotReady.into(), self));
        }
        if let Err(error) = self.fence.validate_phase(self.key, phase) {
            return Err((error.into(), self));
        }
        if let Err(error) = save.validate_prepared(&self.append) {
            return Err((error.into(), self));
        }
        save.reject_append(self.append)
            .expect("validated rejected save admission");
        Ok(())
    }
    /// Only a genuine acceptance receipt advances canonical record metadata and
    /// the save suffix. The caller seals derived continuation and destroys undo
    /// before completing the fence; no readers may enter during this phase.
    pub(crate) fn apply_accepted(
        self,
        state: &mut SimulationState,
        journal: &CandidateJournal,
        save: &mut SaveJournal,
    ) -> Result<(PreparedJournalRelease, AcceptedCandidate), (PublicationError, Self)> {
        // The receipt comes from the same fence retained at preparation, never
        // from another world's coincidentally equal numeric candidate key.
        let accepted = match self.fence.accepted_candidate(self.key) {
            Ok(accepted) => accepted,
            Err(error) => return Err((error.into(), self)),
        };
        if let Err(error) = self.validate_owners(state, journal, save) {
            return Err((error, self));
        }
        // All owner/binding/capacity checks have passed without an intervening
        // callback. Failure now is an invariant/panic requiring runtime poison,
        // never rollback of already accepted play or a second admission attempt.
        save.accept_append(self.append, &accepted)
            .expect("validated accepted save admission");
        state
            .records
            .apply_accepted(self.ledger, &accepted)
            .expect("validated accepted record ledger");
        state.accepted_cut = self.key.base_cut + 1;
        Ok((self.release, accepted))
    }
}
