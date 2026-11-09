//! One serialized native writer. Provider work and host settlement leave this
//! owner parked without retaining a compute worker. No TypeScript world is
//! constructed or used as an incremental predecessor.
use super::{
    CompletedOperation, DriveError, DriveStep, OperationDriver, PreparedPublication,
    ProviderQuestion, ProviderResponse, PublicationError, Simulation,
};
use crate::administration::InstalledHostSettings;
use crate::execution::{CandidateJournal, CoreMutation, ExecutionError};
use crate::experience::{CapturedHistoryInput, HistorySettings, capture_history_input};
use crate::host::{
    ByteBudget, ByteReservation, CandidateFence, CandidateKey, CandidatePhase, FenceError,
};
use crate::install::SelectedInstallation;
use crate::received::TemporalSaveLimits;
use crate::records::save::{
    SaveAcknowledgement, SaveError, SaveJournal, SavePrefix, TemporalSaveCut,
};
use crate::time::{AcceptedAdvanceContinuation, AdmittedWorldInput, AdvanceCursor};
use crate::values::WorkVector;
use std::sync::Arc;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CurrentInstallation<'a> {
    world_id: &'a str,
    generation: &'a str,
    revision: u64,
    accepted_cut: u64,
    history_event_count: u64,
    memory_allowance: MemoryAllowance<'a>,
}
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct MemoryAllowance<'a> {
    world_id: &'a str,
    policy_id: &'a str,
    policy_version: u64,
    max_bytes: u64,
    hard_bytes: f64,
    low_bytes: f64,
}

#[derive(Debug)]
pub(crate) enum SessionError {
    Cancelled,
    Fence(FenceError),
    Execution(ExecutionError),
    Drive(DriveError),
    Publication(PublicationError),
    Save(SaveError),
    History(crate::experience::ExperienceError),
}
impl From<FenceError> for SessionError {
    fn from(e: FenceError) -> Self {
        Self::Fence(e)
    }
}
impl From<ExecutionError> for SessionError {
    fn from(e: ExecutionError) -> Self {
        Self::Execution(e)
    }
}
impl From<DriveError> for SessionError {
    fn from(e: DriveError) -> Self {
        Self::Drive(e)
    }
}
impl From<PublicationError> for SessionError {
    fn from(e: PublicationError) -> Self {
        Self::Publication(e)
    }
}
impl From<SaveError> for SessionError {
    fn from(e: SaveError) -> Self {
        Self::Save(e)
    }
}
impl From<crate::experience::ExperienceError> for SessionError {
    fn from(e: crate::experience::ExperienceError) -> Self {
        Self::History(e)
    }
}

/// Minted only after every native publication owner is funded. The operational
/// host first reserves this actual allocation, then marks Ready and checks its
/// current authority/input immediately before settlement, without a world lock.
pub(crate) struct PreparedCandidate {
    pub key: CandidateKey,
    pub allocation: WorkVector,
    fence: Arc<CandidateFence>,
}
impl PreparedCandidate {
    pub(crate) fn ready(&self) -> Result<(), FenceError> {
        self.fence.ready(self.key)
    }
}
pub(crate) enum SessionStep {
    Continue,
    Question(Arc<ProviderQuestion>),
    Prepared(PreparedCandidate),
    Preview(PreviewOutcome),
}
pub(crate) struct PreviewOutcome {
    command: crate::commands::CompletedCommand,
}
impl PreviewOutcome {
    pub(crate) fn outcome(&self) -> &crate::commands::Outcome {
        self.command.outcome()
    }
}
/// Only accepted effects leave the writer. Their existing guards stay with
/// these actual products until the server's history/output owners consume them.
pub(crate) struct AcceptedOperation {
    pub key: CandidateKey,
    pub result: CompletedOperation,
    pub history: CapturedHistoryInput,
    pub notices: crate::cognition::PreparedSemanticNotices,
}
struct Preparing {
    journal: CandidateJournal,
    driver: OperationDriver,
    key: CandidateKey,
    preview: bool,
}
struct Prepared {
    journal: CandidateJournal,
    publication: PreparedPublication,
    result: CompletedOperation,
    history: CapturedHistoryInput,
    notices: crate::cognition::PreparedSemanticNotices,
    key: CandidateKey,
}
enum Candidate {
    Preparing(Preparing),
    Prepared(Prepared),
}

pub(crate) struct Session {
    simulation: Simulation,
    host: InstalledHostSettings,
    save: SaveJournal,
    pending_residency: Option<Arc<crate::received::SavedTemporalResidency>>,
    candidate: Option<Candidate>,
    continuation: Option<AcceptedAdvanceContinuation>,
    generation: u64,
    budget: ByteBudget,
    _reservation: ByteReservation,
}
impl Session {
    /// Consumes the fully checked current selected closure. Installation and
    /// writer adoption remain private until their server transaction succeeds.
    pub(crate) fn new(
        installed: SelectedInstallation,
        generation: u64,
        budget: ByteBudget,
    ) -> Result<Self, SessionError> {
        if generation == 0 || generation > crate::identity::MAX_SAFE_INTEGER {
            return Err(FenceError::Stale.into());
        }
        let reservation = budget
            .reserve(std::mem::size_of::<Self>())
            .map_err(|_| ExecutionError::Capacity)?;
        let state = installed.state;
        let save = SaveJournal::new(
            state.physical.header.id.clone(),
            state.generation.clone(),
            state.durable_revision,
            state.accepted_cut,
            state.physical.identity.next_id(),
            budget.clone(),
        )?;
        Ok(Self {
            simulation: Simulation {
                fence: Arc::new(CandidateFence::new()),
                state,
            },
            host: installed.host_settings,
            save,
            pending_residency: None,
            candidate: None,
            continuation: None,
            generation,
            budget,
            _reservation: reservation,
        })
    }
    pub(crate) fn fence(&self) -> Arc<CandidateFence> {
        self.simulation.fence.clone()
    }
    /// Actual validated install facts used by the existing SQL writer's cold
    /// adoption. This finite summary conveys no actor facts or write permission.
    pub(crate) fn current_installation(&self) -> Result<CurrentInstallation<'_>, SessionError> {
        let state = &self.accepted()?.state;
        let policy = state.installed.attention.value();
        let retention = &policy.retention;
        let history_event_count = state
            .occurrences
            .archived_count()
            .unwrap_or(0)
            .checked_add(
                u64::try_from(state.occurrences.hot().count())
                    .map_err(|_| ExecutionError::Invariant)?,
            )
            .filter(|count| *count <= crate::identity::MAX_SAFE_INTEGER)
            .ok_or(ExecutionError::Invariant)?;
        Ok(CurrentInstallation {
            world_id: &state.physical.header.id,
            generation: &state.generation,
            revision: state.durable_revision,
            accepted_cut: state.accepted_cut,
            history_event_count,
            memory_allowance: MemoryAllowance {
                world_id: &state.physical.header.id,
                policy_id: &policy.id,
                policy_version: policy.version,
                max_bytes: retention.derived_max_bytes,
                hard_bytes: (retention.derived_max_bytes as f64
                    * (1.0 + retention.maintenance_headroom))
                    .floor(),
                low_bytes: (retention.derived_max_bytes as f64 * retention.derived_low_water)
                    .floor(),
            },
        })
    }
    pub(crate) fn begin_advance(
        &mut self,
        seconds: f64,
        max_intervals: usize,
        prepared: Vec<(String, crate::native_refuge::PreparedRefugeNavigation)>,
        inputs: Vec<AdmittedWorldInput>,
    ) -> Result<CandidateKey, SessionError> {
        let (key, mut journal) = self.begin()?;
        let driver = (|| {
            let mut core = CoreMutation {
                state: &mut self.simulation.state,
                journal: &mut journal,
            };
            let continuation = self
                .continuation
                .as_ref()
                .map(|prior| prior.prepare(&core, key, &self.budget))
                .transpose()?
                .flatten();
            let cursor = AdvanceCursor::new(
                &mut core,
                seconds,
                max_intervals,
                key,
                prepared,
                inputs,
                continuation.as_ref(),
                &self.budget,
            )
            .map_err(DriveError::from)?;
            OperationDriver::advance(&mut core, cursor, &self.budget)
        })();
        self.install_driver(key, journal, driver, false)
    }
    pub(crate) fn begin_command(
        &mut self,
        command: crate::commands::NativeCommand,
        canonical: String,
        options: crate::commands::CommandOptions,
    ) -> Result<CandidateKey, SessionError> {
        let preview = options.preview;
        if preview && !matches!(&command, crate::commands::NativeCommand::Cancel { .. }) {
            return Err(ExecutionError::UnsupportedFamily.into());
        }
        let (key, mut journal) = self.begin()?;
        let driver = (|| {
            let binding = crate::geometry::GeometryBinding::new(
                key,
                self.simulation.state.installed.geometry.spatial.revision,
                journal.next_provider_serial()?,
            );
            let cursor = crate::commands::CommandCursor::new(
                command,
                canonical,
                options,
                binding,
                &self.budget,
            )?;
            let mut core = CoreMutation {
                state: &mut self.simulation.state,
                journal: &mut journal,
            };
            let command = crate::commands::CommandOperation::from_cursor(
                &mut core,
                cursor,
                key,
                &self.budget,
            )?;
            OperationDriver::command(&mut core, command, &self.budget)
        })();
        self.install_driver(key, journal, driver, preview)
    }
    pub(crate) fn begin_cancel_preview(
        &mut self,
        command: crate::commands::NativeCommand,
        canonical: String,
    ) -> Result<CandidateKey, SessionError> {
        if !matches!(&command, crate::commands::NativeCommand::Cancel { .. }) {
            return Err(ExecutionError::UnsupportedFamily.into());
        }
        self.begin_command(
            command,
            canonical,
            crate::commands::CommandOptions {
                preview: true,
                native_controller: false,
                native_movement: None,
            },
        )
    }
    fn begin(&mut self) -> Result<(CandidateKey, CandidateJournal), SessionError> {
        if self.candidate.is_some() {
            return Err(FenceError::Busy.into());
        }
        self.apply_pending_residency()?;
        let key = self
            .simulation
            .fence
            .begin(self.simulation.state.accepted_cut, self.generation)?;
        let journal = match CandidateJournal::begin(&self.simulation.state, &self.budget) {
            Ok(journal) => journal,
            Err(error) => {
                self.simulation.fence.rollback_preparation(key)?;
                self.simulation.fence.rollback_complete(key)?;
                return Err(error.into());
            }
        };
        Ok((key, journal))
    }
    fn install_driver(
        &mut self,
        key: CandidateKey,
        mut journal: CandidateJournal,
        driver: Result<OperationDriver, DriveError>,
        preview: bool,
    ) -> Result<CandidateKey, SessionError> {
        match driver {
            Ok(driver) => {
                self.candidate = Some(Candidate::Preparing(Preparing {
                    journal,
                    driver,
                    key,
                    preview,
                }));
                Ok(key)
            }
            Err(error) => {
                self.simulation.fence.rollback_preparation(key)?;
                self.rollback(&mut journal, key)?;
                Err(error.into())
            }
        }
    }
    pub(crate) fn step(
        &mut self,
        key: CandidateKey,
        answer: Option<ProviderResponse>,
        history: HistorySettings<'_>,
    ) -> Result<SessionStep, SessionError> {
        self.simulation
            .fence
            .validate_phase(key, CandidatePhase::Preparing)?;
        if self.simulation.fence.stop_requested() {
            self.cancel(key)?;
            return Err(SessionError::Cancelled);
        }
        let Some(Candidate::Preparing(preparing)) = self.candidate.as_mut() else {
            return Err(FenceError::NotReady.into());
        };
        if preparing.key != key {
            return Err(FenceError::Stale.into());
        }
        let step = {
            let mut core = CoreMutation {
                state: &mut self.simulation.state,
                journal: &mut preparing.journal,
            };
            preparing.driver.step(&mut core, answer, &self.budget)
        };
        let step = match step {
            Ok(step) => step,
            Err(error) => {
                // Invalid incoming replies leave the same question retryable.
                // A failed real continuation has already aborted its child;
                // finish the root rollback before admitting another operation.
                if preparing.driver.finished() {
                    let Some(Candidate::Preparing(mut preparing)) = self.candidate.take() else {
                        unreachable!()
                    };
                    self.simulation.fence.rollback_preparation(key)?;
                    self.rollback(&mut preparing.journal, key)?;
                }
                return Err(error.into());
            }
        };
        match step {
            DriveStep::Continue => Ok(SessionStep::Continue),
            DriveStep::Question(question) => Ok(SessionStep::Question(question)),
            DriveStep::Complete(result) => {
                if preparing.preview {
                    let Some(Candidate::Preparing(mut preparing)) = self.candidate.take() else {
                        unreachable!()
                    };
                    self.simulation.fence.rollback_preparation(key)?;
                    self.rollback(&mut preparing.journal, key)?;
                    let CompletedOperation::Command(completed) = result else {
                        return Err(ExecutionError::Invariant.into());
                    };
                    return Ok(SessionStep::Preview(PreviewOutcome {
                        command: completed.command,
                    }));
                }
                // No candidate is exposed Ready if recording or accumulating
                // save admission fails after semantic execution has completed.
                let products = (|| {
                    let notices = preparing.journal.cognition.prepare_semantic_notices(
                        self.simulation.state.installed.maximum_change_scopes,
                        &self.budget,
                    )?;
                    let captured = capture_history_input(
                        &self.simulation.state,
                        &self.simulation.state.occurrences,
                        &preparing.journal.experience,
                        history,
                        &self.budget,
                    )?;
                    let publication = PreparedPublication::prepare(
                        &mut self.simulation.state,
                        &preparing.journal,
                        &mut self.save,
                        &self.simulation.fence,
                        key,
                        &self.host,
                        false,
                        &self.budget,
                    )?;
                    Ok::<_, SessionError>((captured, notices, publication))
                })();
                let Some(Candidate::Preparing(mut preparing)) = self.candidate.take() else {
                    unreachable!()
                };
                match products {
                    Ok((history, notices, publication)) => {
                        let allocation = publication.allocation();
                        self.candidate = Some(Candidate::Prepared(Prepared {
                            journal: preparing.journal,
                            publication,
                            result,
                            history,
                            notices,
                            key,
                        }));
                        Ok(SessionStep::Prepared(PreparedCandidate {
                            key,
                            allocation,
                            fence: self.fence(),
                        }))
                    }
                    Err(error) => {
                        self.simulation.fence.rollback_preparation(key)?;
                        self.rollback(&mut preparing.journal, key)?;
                        Err(error)
                    }
                }
            }
        }
    }
    /// Settlement itself uses the separate fence. This continuation installs
    /// the stored outcome; no permission recheck can undo accepted gameplay.
    pub(crate) fn finish_settlement(
        &mut self,
        key: CandidateKey,
    ) -> Result<Option<AcceptedOperation>, SessionError> {
        let Some(Candidate::Prepared(prepared)) = self.candidate.as_ref() else {
            return Err(FenceError::NotReady.into());
        };
        if prepared.key != key {
            return Err(FenceError::Stale.into());
        }
        let phase = self.simulation.fence.phase();
        if !matches!(phase, CandidatePhase::Accepted | CandidatePhase::Rejected) {
            return Err(FenceError::NotReady.into());
        }
        self.simulation.fence.validate_phase(key, phase)?;
        let Some(Candidate::Prepared(mut prepared)) = self.candidate.take() else {
            unreachable!()
        };
        if phase == CandidatePhase::Rejected {
            // Keep every owner if an invariant fails; poisoning is required,
            // rather than silently losing the only rollback/save token.
            if let Err((error, publication)) = prepared.publication.reject(&mut self.save) {
                prepared.publication = publication;
                self.candidate = Some(Candidate::Prepared(prepared));
                self.simulation.fence.poison();
                return Err(error.into());
            }
            self.simulation.fence.start_rollback(key)?;
            self.rollback(&mut prepared.journal, key)?;
            return Ok(None);
        }
        let (release, accepted) = match prepared.publication.apply_accepted(
            &mut self.simulation.state,
            &prepared.journal,
            &mut self.save,
        ) {
            Ok(value) => value,
            Err((error, publication)) => {
                prepared.publication = publication;
                self.candidate = Some(Candidate::Prepared(prepared));
                self.simulation.fence.poison();
                return Err(error.into());
            }
        };
        self.continuation = {
            let core = CoreMutation {
                state: &mut self.simulation.state,
                journal: &mut prepared.journal,
            };
            prepared
                .result
                .take_continuation()
                .map(|continuation| continuation.accepted(&core, accepted))
                .transpose()
                .map_err(|error| {
                    self.simulation.fence.poison();
                    SessionError::Execution(error)
                })?
        };
        // A missing forecast does not remove the genuine receipt needed to
        // destroy undo: retrieve it from this exact accepted fence again.
        let accepted = self.simulation.fence.accepted_candidate(key)?;
        if let Err((error, journal)) =
            prepared
                .journal
                .finish_accepted(&mut self.simulation.state, release, &accepted)
        {
            drop(journal);
            self.simulation.fence.poison();
            return Err(error.into());
        }
        self.simulation.fence.accepted_complete(key)?;
        self.apply_pending_residency()?;
        Ok(Some(AcceptedOperation {
            key,
            result: prepared.result,
            history: prepared.history,
            notices: prepared.notices,
        }))
    }
    /// The bridge funds and encodes accepted outputs before Ready. Returning
    /// borrowed products cannot publish them or consume their rollback owner.
    pub(crate) fn prepared_products(
        &self,
        key: CandidateKey,
    ) -> Result<
        (
            &CompletedOperation,
            &CapturedHistoryInput,
            &crate::cognition::PreparedSemanticNotices,
        ),
        SessionError,
    > {
        let Some(Candidate::Prepared(prepared)) = self.candidate.as_ref() else {
            return Err(FenceError::NotReady.into());
        };
        if prepared.key != key {
            return Err(FenceError::Stale.into());
        }
        Ok((&prepared.result, &prepared.history, &prepared.notices))
    }
    pub(crate) fn cancel(&mut self, key: CandidateKey) -> Result<(), SessionError> {
        if self.simulation.fence.phase() != CandidatePhase::Preparing {
            return Err(FenceError::NotReady.into());
        }
        self.simulation
            .fence
            .validate_phase(key, CandidatePhase::Preparing)?;
        let Some(candidate) = self.candidate.take() else {
            return Err(FenceError::NotReady.into());
        };
        self.simulation.fence.rollback_preparation(key)?;
        match candidate {
            Candidate::Preparing(mut preparing) => {
                let mut core = CoreMutation {
                    state: &mut self.simulation.state,
                    journal: &mut preparing.journal,
                };
                if let Err(error) = preparing.driver.abort(&mut core) {
                    self.simulation.fence.poison();
                    return Err(error.into());
                }
                self.rollback(&mut preparing.journal, key)
            }
            Candidate::Prepared(mut prepared) => {
                if let Err((error, _publication)) = prepared.publication.reject(&mut self.save) {
                    self.simulation.fence.poison();
                    return Err(error.into());
                }
                self.rollback(&mut prepared.journal, key)
            }
        }
    }
    fn rollback(
        &mut self,
        journal: &mut CandidateJournal,
        key: CandidateKey,
    ) -> Result<(), SessionError> {
        if let Err(error) = journal.rollback_all(&mut self.simulation.state) {
            self.simulation.fence.poison();
            return Err(error.into());
        }
        self.simulation.fence.rollback_complete(key)?;
        self.apply_pending_residency()?;
        Ok(())
    }
    pub(crate) fn capture_save(
        &mut self,
        limits: TemporalSaveLimits,
    ) -> Result<Arc<SavePrefix>, SessionError> {
        if self.simulation.fence.phase() != CandidatePhase::Idle {
            return Err(FenceError::Busy.into());
        }
        // The next immutable prefix must see the physical tail selected by the
        // previous ACK. Capacity pressure can defer maintenance, never SQL ACK.
        if !self.apply_pending_residency()? {
            return Err(ExecutionError::Capacity.into());
        }
        let state = &mut self.simulation.state;
        Ok(self.save.capture(
            TemporalSaveCut {
                world_id: &state.physical.header.id,
                generation: &state.generation,
                through_cut: state.accepted_cut,
                identity_through: state.physical.identity.next_id(),
                temporal: &state.temporal,
            },
            limits,
            &state.installed.schema,
            &mut state.records,
            &self.budget,
        )?)
    }
    /// ACK touches the independent save owner and durable metadata only; an old
    /// exact prefix may finish while a newer candidate is privately preparing.
    pub(crate) fn acknowledge(&mut self, ack: SaveAcknowledgement<'_>) -> Result<(), SessionError> {
        if let Some(residency) = self.save.acknowledge(ack)? {
            // capture_save cannot create another prefix while this token is
            // pending. Exact duplicate ACKs return no second token.
            debug_assert!(self.pending_residency.is_none());
            self.pending_residency = Some(residency);
        }
        self.simulation.state.durable_revision = self.save.durable_revision();
        if self.simulation.fence.phase() == CandidatePhase::Idle {
            self.apply_pending_residency()?;
        }
        Ok(())
    }
    fn apply_pending_residency(&mut self) -> Result<bool, SessionError> {
        let Some(saved) = self.pending_residency.as_ref() else {
            return Ok(true);
        };
        let prepared = match saved.prepare_apply(&self.simulation.state, &self.budget) {
            Ok(prepared) => prepared,
            Err(ExecutionError::Capacity) => return Ok(false),
            Err(error) => {
                self.simulation.fence.poison();
                return Err(error.into());
            }
        };
        if let Err((error, _prepared)) = prepared.apply(&mut self.simulation.state) {
            self.simulation.fence.poison();
            return Err(error.into());
        }
        self.pending_residency = None;
        Ok(true)
    }
    pub(crate) fn accepted(&self) -> Result<&Simulation, SessionError> {
        if self.simulation.fence.phase() != CandidatePhase::Idle {
            return Err(FenceError::Busy.into());
        }
        Ok(&self.simulation)
    }
    /// Closing admission is a separate fence operation. Final shutdown waits
    /// for the actual accepted save prefix acknowledgement, not merely for the
    /// calculation to stop or for a SQL request to have been dispatched.
    pub(crate) fn finish_stop(&self) -> Result<(), SessionError> {
        if self.candidate.is_some() || !self.save.barrier_complete() {
            return Err(FenceError::Busy.into());
        }
        Ok(self.simulation.fence.finish_stop()?)
    }
    pub(crate) fn save_barrier_complete(&self) -> bool {
        self.candidate.is_none() && self.save.barrier_complete()
    }
}
