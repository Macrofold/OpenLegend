//! One serialized native writer. Provider work and host settlement leave this
//! owner parked without retaining a compute worker. No TypeScript world is
//! constructed or used as an incremental predecessor.
use super::{
    CompletedOperation, DriveError, DriveStep, OperationDriver, PreparedPublication,
    ProviderQuestion, ProviderResponse, PublicationError, Simulation, SimulationState,
};
use crate::administration::InstalledHostSettings;
use crate::execution::{CandidateJournal, CoreMutation, ExecutionError};
use crate::experience::{CapturedHistoryInput, HistorySettings, capture_history_input};
use crate::host::{
    ByteBudget, CandidateFence, CandidateKey, CandidatePhase, FenceError, ResidentReservation,
};
use crate::install::SelectedInstallation;
use crate::received::TemporalSaveLimits;
use crate::records::save::{
    SaveAcknowledgement, SaveError, SaveJournal, SavePrefix, TemporalSaveCut,
};
use crate::time::{AcceptedAdvanceContinuation, AdmittedWorldInput, AdvanceCursor};
use crate::values::WorkVector;
use std::sync::Arc;
mod restore;
pub(crate) use restore::PreparedRestoreFacts;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CurrentInstallation<'a> {
    world_id: &'a str,
    generation: &'a str,
    revision: u64,
    accepted_cut: u64,
    history_event_count: u64,
    memory_allowance: MemoryAllowance<'a>,
    work_allocation: WorkVector,
}
/// Finite progress beside one prepared delta. The application publishes these
/// facts only after the same candidate is accepted; they are never a world.
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PreparedReadProgress<'a> {
    world_id: &'a str,
    generation: &'a str,
    base_cut: u64,
    through_cut: u64,
    identity_through: u64,
    at: f64,
    sequence: u64,
    paused: bool,
}

pub(crate) struct CapturedActorReadCut<'a> {
    state: &'a SimulationState,
    actor: &'a str,
    save: crate::records::save::SaveReadMetadata,
    temporal: crate::records::EncodedRows,
    history: crate::experience::CapturedHistoryCuts,
}
impl serde::Serialize for CapturedActorReadCut<'_> {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeStruct;
        let mut out = serializer.serialize_struct("ActorReadCut", 11)?;
        out.serialize_field("worldId", &self.state.physical.header.id)?;
        out.serialize_field("generation", &self.state.generation)?;
        out.serialize_field("actorId", self.actor)?;
        out.serialize_field("acceptedCut", &self.state.accepted_cut)?;
        out.serialize_field("identityThrough", &self.state.physical.identity.next_id())?;
        out.serialize_field("at", &self.state.physical.header.sim_time)?;
        out.serialize_field("sequence", &self.state.physical.header.sequence)?;
        out.serialize_field("paused", &self.state.physical.header.paused)?;
        out.serialize_field("save", &self.save)?;
        out.serialize_field("temporal", self.temporal.changes())?;
        out.serialize_field("history", &self.history.value())?;
        out.end()
    }
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

impl<'a> CurrentInstallation<'a> {
    /// Capture only actual validated installation metadata. The public session
    /// reader additionally requires its accepted Idle boundary.
    pub(crate) fn capture(state: &'a SimulationState) -> Result<Self, SessionError> {
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
            work_allocation: state.work_allocation().map_err(ExecutionError::Work)?,
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
    NpcCandidates(crate::capture::PreparedNpcCandidates),
    NpcSources(crate::capture::PreparedNpcSources),
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
    predecessors: crate::experience::PersonalPredecessors,
    notices: crate::cognition::PreparedSemanticNotices,
    key: CandidateKey,
}
enum Candidate {
    Preparing(Preparing),
    Prepared(Prepared),
}

struct HostControlSnapshot {
    speed: f64,
    manually_paused: bool,
}

pub(crate) struct Session {
    simulation: Simulation,
    host: InstalledHostSettings,
    host_before: Option<HostControlSnapshot>,
    save: SaveJournal,
    pending_residency: Option<Arc<crate::received::SavedTemporalResidency>>,
    restore_adoption: Option<restore::RestoreAdoption>,
    candidate: Option<Candidate>,
    continuation: Option<AcceptedAdvanceContinuation>,
    generation: u64,
    budget: ByteBudget,
    temporal_save_limits: TemporalSaveLimits,
    _reservation: ResidentReservation,
}
impl Session {
    /// Consumes the fully checked current selected closure. Installation and
    /// writer adoption remain private until their server transaction succeeds.
    pub(crate) fn new(
        installed: SelectedInstallation,
        generation: u64,
        budget: ByteBudget,
        pending_save_budget: ByteBudget,
        temporal_save_limits: TemporalSaveLimits,
    ) -> Result<Self, SessionError> {
        if generation == 0 || generation > crate::identity::MAX_SAFE_INTEGER {
            return Err(FenceError::Stale.into());
        }
        if temporal_save_limits.target_bytes == 0 || temporal_save_limits.row_bytes == 0 {
            return Err(SaveError::Binding.into());
        }
        let reservation = budget
            .reserve_record(std::mem::size_of::<Self>())
            .map_err(|_| ExecutionError::Capacity)?;
        let state = installed.state;
        let save = SaveJournal::new(
            state.physical.header.id.clone(),
            state.generation.clone(),
            state.durable_revision,
            state.accepted_cut,
            state.physical.identity.next_id(),
            pending_save_budget,
        )?;
        Ok(Self {
            simulation: Simulation {
                fence: Arc::new(CandidateFence::new()),
                state,
            },
            host: installed.host_settings,
            host_before: None,
            save,
            pending_residency: None,
            restore_adoption: None,
            candidate: None,
            continuation: None,
            generation,
            budget,
            temporal_save_limits,
            _reservation: reservation,
        })
    }
    pub(crate) fn fence(&self) -> Arc<CandidateFence> {
        self.simulation.fence.clone()
    }
    pub(crate) fn operational_generation(&self) -> u64 {
        self.generation
    }
    /// Actual validated install facts used by the existing SQL writer's cold
    /// adoption. This finite summary conveys no actor facts or write permission.
    pub(crate) fn current_installation(&self) -> Result<CurrentInstallation<'_>, SessionError> {
        CurrentInstallation::capture(&self.accepted()?.state)
    }
    /// Capture the actor's real unsaved page representation before any private
    /// writes. Pending non-temporal deltas/history already belong to the
    /// application's pre-Ready immutable publication owner and are not copied
    /// again for this read. Metadata binds that owner to this exact accepted cut.
    pub(crate) fn read_cut<'a>(
        &'a self,
        actor: &'a str,
        limits: TemporalSaveLimits,
        budget: &ByteBudget,
    ) -> Result<CapturedActorReadCut<'a>, SessionError> {
        let state = &self.accepted()?.state;
        if !state
            .physical
            .entities
            .get(actor)
            .is_some_and(|entity| entity.has_memory())
            && state.temporal.actor(actor).is_none()
            && state.experience.actor(actor).is_none()
        {
            return Err(ExecutionError::MissingActor.into());
        }
        let save = self.save.read_metadata()?;
        if save.through_cut != state.accepted_cut {
            return Err(ExecutionError::Invariant.into());
        }
        let temporal = crate::received::preview_temporal_rows(
            &TemporalSaveCut {
                world_id: &state.physical.header.id,
                generation: &state.generation,
                through_cut: state.accepted_cut,
                identity_through: state.physical.identity.next_id(),
                temporal: &state.temporal,
            },
            actor,
            save.represented_before,
            limits,
            &state.installed.schema,
            budget,
        )
        .map_err(SaveError::from)?;
        let history =
            crate::experience::capture_history_cuts(state, std::iter::once(actor), budget)
                .map_err(ExecutionError::from)?;
        Ok(CapturedActorReadCut {
            state,
            actor,
            save,
            temporal,
            history,
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
    /// Bindings are the native context producer's opaque, guard-owning ticket;
    /// no caller supplied permission map enters the writer.
    pub(crate) fn begin_response(
        &mut self,
        id: &str,
        response: crate::response::ActorResponse,
        bindings: Arc<crate::response::ResponseBindings>,
    ) -> Result<CandidateKey, SessionError> {
        let (key, mut journal) = self.begin()?;
        let driver = (|| {
            let mut core = CoreMutation {
                state: &mut self.simulation.state,
                journal: &mut journal,
            };
            let cursor = crate::response::ResponseCursor::new(
                &mut core,
                id,
                response,
                bindings,
                key,
                &self.budget,
            )
            .map_err(DriveError::from)?;
            OperationDriver::response(&mut core, cursor, &self.budget)
        })();
        self.install_driver(key, journal, driver, false)
    }
    pub(crate) fn begin_npc_candidates(
        &mut self,
        read: &super::AcceptedActorRead,
        expanded: &[usize],
        coverage: crate::capture::NpcOfferCoverage,
    ) -> Result<CandidateKey, SessionError> {
        let (key, mut journal) = self.begin()?;
        let driver = (|| {
            let mut core = CoreMutation {
                state: &mut self.simulation.state,
                journal: &mut journal,
            };
            let cursor = crate::capture::NpcCandidateCursor::prepare(
                &core,
                read,
                expanded,
                coverage,
                key,
                &self.budget,
            )?;
            OperationDriver::npc_candidates(&mut core, cursor, &self.budget)
        })();
        self.install_driver(key, journal, driver, false)
    }
    pub(crate) fn is_npc_candidates(&self, key: CandidateKey) -> bool {
        matches!(&self.candidate, Some(Candidate::Preparing(preparing)) if preparing.key == key && preparing.driver.is_npc_candidates())
    }
    pub(crate) fn begin_npc_sources(
        &mut self,
        scope: Arc<crate::capture::NpcHistoricalScope>,
        selection: crate::capture::NpcSourceSelection,
    ) -> Result<CandidateKey, SessionError> {
        let (key, mut journal) = self.begin()?;
        let driver = (|| {
            let mut core = CoreMutation {
                state: &mut self.simulation.state,
                journal: &mut journal,
            };
            let cursor = crate::capture::NpcSourcesCursor::new(
                &mut core,
                scope,
                selection,
                key,
                &self.budget,
            )?;
            OperationDriver::npc_sources(&mut core, cursor, &self.budget)
        })();
        self.install_driver(key, journal, driver, false)
    }
    pub(crate) fn is_npc_sources(&self, key: CandidateKey) -> bool {
        matches!(&self.candidate, Some(Candidate::Preparing(preparing)) if preparing.key == key && preparing.driver.is_npc_sources())
    }
    pub(crate) fn begin_forget(
        &mut self,
        actor: &str,
        source: &str,
        limits: crate::experience::HistoryEditLimits,
    ) -> Result<CandidateKey, SessionError> {
        // This protected edit commits its proposed prefix before acceptance.
        // An ordinary accepted suffix must finish its genuine SQL barrier first.
        if !self.save_barrier_complete() {
            return Err(FenceError::Busy.into());
        }
        let (key, mut journal) = self.begin()?;
        let driver = (|| {
            let mut core = CoreMutation {
                state: &mut self.simulation.state,
                journal: &mut journal,
            };
            let cursor = crate::experience::ForgetExperienceCursor::new(
                &mut core,
                actor,
                source,
                key,
                limits,
                &self.budget,
            )?;
            OperationDriver::forget(&mut core, cursor, &self.budget)
        })();
        self.install_driver(key, journal, driver, false)
    }
    /// Host controls commit SQL before acceptance, just like protected privacy
    /// edits. The caller owns authorization, presence and admitted clock debt.
    pub(crate) fn begin_control(
        &mut self,
        paused: bool,
        speed: f64,
        manually_paused: bool,
    ) -> Result<CandidateKey, SessionError> {
        if !self.save_barrier_complete() {
            return Err(FenceError::Busy.into());
        }
        let (key, mut journal) = self.begin()?;
        let driver = (|| {
            let binding = crate::geometry::GeometryBinding::new(
                key,
                self.simulation.state.installed.geometry.spatial.revision,
                journal.next_provider_serial()?,
            );
            let cursor =
                super::host_control::HostControlCursor::new(binding, paused, speed, &self.budget)?;
            let mut core = CoreMutation {
                state: &mut self.simulation.state,
                journal: &mut journal,
            };
            OperationDriver::host_control(&mut core, cursor, &self.budget)
        })();
        let key = self.install_driver(key, journal, driver, false)?;
        self.host.speed = speed;
        self.host.manually_paused = manually_paused;
        Ok(key)
    }
    pub(crate) fn begin_recent_retention(
        &mut self,
        actors: Vec<String>,
    ) -> Result<CandidateKey, SessionError> {
        let (key, mut journal) = self.begin()?;
        let driver = (|| {
            let mut core = CoreMutation {
                state: &mut self.simulation.state,
                journal: &mut journal,
            };
            let cursor = crate::received::RecentRetentionCursor::new(actors, &self.budget)?;
            OperationDriver::recent_retention(&mut core, cursor, &self.budget)
        })();
        self.install_driver(key, journal, driver, false)
    }
    /// Operational control and the exact domain participation effects commit
    /// together. No prior accepted suffix may be omitted from that SQL barrier.
    pub(crate) fn begin_participation(&mut self, request: crate::participation::ParticipationRequest) -> Result<CandidateKey, SessionError> {
        if !self.save_barrier_complete() { return Err(FenceError::Busy.into()); }
        let (key, mut journal) = self.begin()?;
        let driver = (|| {
            let cursor = crate::participation::ParticipationCursor::new(request, key, &self.budget)?;
            let mut core = CoreMutation {state: &mut self.simulation.state, journal: &mut journal};
            OperationDriver::participation(&mut core, cursor, &self.budget)
        })();
        self.install_driver(key, journal, driver, false)
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
        self.host_before = Some(HostControlSnapshot {
            speed: self.host.speed,
            manually_paused: self.host.manually_paused,
        });
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
            DriveStep::NpcCandidates(done) => {
                let closed = preparing.journal.require_closed_operations();
                let Some(Candidate::Preparing(mut preparing)) = self.candidate.take() else {
                    unreachable!()
                };
                self.simulation.fence.rollback_preparation(key)?;
                self.rollback(&mut preparing.journal, key)?;
                closed?;
                Ok(SessionStep::NpcCandidates(done))
            }
            DriveStep::NpcSources(done) => {
                let closed = preparing.journal.require_closed_operations();
                let Some(Candidate::Preparing(mut preparing)) = self.candidate.take() else {
                    unreachable!()
                };
                self.simulation.fence.rollback_preparation(key)?;
                self.rollback(&mut preparing.journal, key)?;
                closed?;
                Ok(SessionStep::NpcSources(done))
            }
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
                    let predecessors = crate::experience::capture_personal_predecessors(
                        &preparing.journal.experience,
                        &self.budget,
                    )
                    .map_err(PublicationError::from)?;
                    let protected = matches!(&result, CompletedOperation::Forget(done)
                        if done.privacy_change().is_some())
                        || matches!(&result, CompletedOperation::Restore(_) | CompletedOperation::HostControl(_) | CompletedOperation::Participation(_));
                    let publication = PreparedPublication::prepare(
                        &mut self.simulation.state,
                        &preparing.journal,
                        &mut self.save,
                        &self.simulation.fence,
                        key,
                        &self.host,
                        matches!(&result, CompletedOperation::Restore(_) | CompletedOperation::HostControl(_)),
                        protected.then_some(self.temporal_save_limits),
                        &self.budget,
                    )?;
                    Ok::<_, SessionError>((captured, predecessors, notices, publication))
                })();
                let Some(Candidate::Preparing(mut preparing)) = self.candidate.take() else {
                    unreachable!()
                };
                match products {
                    Ok((history, predecessors, notices, publication)) => {
                        let allocation = publication.allocation();
                        self.candidate = Some(Candidate::Prepared(Prepared {
                            journal: preparing.journal,
                            publication,
                            result,
                            history,
                            predecessors,
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
        self.host_before = None;
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
            &crate::records::ChangedRows,
            &crate::experience::PersonalPredecessors,
            Option<&crate::records::SaveRows>,
            PreparedReadProgress<'_>,
        ),
        SessionError,
    > {
        let Some(Candidate::Prepared(prepared)) = self.candidate.as_ref() else {
            return Err(FenceError::NotReady.into());
        };
        if prepared.key != key {
            return Err(FenceError::Stale.into());
        }
        let state = &self.simulation.state;
        Ok((
            &prepared.result,
            &prepared.history,
            &prepared.notices,
            prepared.publication.read_changes(&self.save)?,
            &prepared.predecessors,
            prepared.publication.read_protected_prefix(&self.save)?,
            PreparedReadProgress {
                world_id: &state.physical.header.id,
                generation: &state.generation,
                base_cut: key.base_cut,
                through_cut: key.base_cut + 1,
                identity_through: state.physical.identity.next_id(),
                at: state.physical.header.sim_time,
                sequence: state.physical.header.sequence,
                paused: state.physical.header.paused,
            },
        ))
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
        self.restore_adoption = None;
        if let Err(error) = journal.rollback_all(&mut self.simulation.state) {
            self.simulation.fence.poison();
            return Err(error.into());
        }
        if let Some(before) = self.host_before.take() {
            self.host.speed = before.speed;
            self.host.manually_paused = before.manually_paused;
        }
        self.simulation.fence.rollback_complete(key)?;
        self.apply_pending_residency()?;
        Ok(())
    }
    pub(crate) fn capture_save(&mut self) -> Result<Arc<SavePrefix>, SessionError> {
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
            self.temporal_save_limits,
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
    pub(crate) fn resolve_receipt_tail(
        &mut self,
        world_id: &str,
        generation: &str,
        accepted_cut: u64,
        identity_through: u64,
        request: &crate::received::TemporalReceiptTailRequest<'_>,
        tail: Option<crate::received::TemporalReceiptTail>,
    ) -> Result<(), SessionError> {
        let state = &self.accepted()?.state;
        if state.physical.header.id != world_id
            || state.generation != generation
            || state.accepted_cut != accepted_cut
            || state.physical.identity.next_id() != identity_through
        {
            return Err(ExecutionError::InvalidCheckpoint.into());
        }
        self.simulation
            .state
            .temporal
            .resolve_receipt_tail(request, tail, identity_through)
            .map_err(ExecutionError::Received)?;
        Ok(())
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
