//! Finite operational boundary for the native writer. The application schedules
//! these calls on its shared pool; provider waits and settlement retain no job.
//! Opaque products retain their actual custody rather than exposing a world.
use crate::encoding::{json_record, json_record_len};
use crate::host::{
    ByteBudget, ByteReservation, CandidateFence, CandidateKey, FenceError, ResidentReservation,
};
use crate::simulation::{
    CompletedOperation, ProviderQuestion, ProviderResponse, Session, SessionStep,
};
use serde::ser::{SerializeMap, SerializeSeq};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};

static NEXT_GENERATION: AtomicU64 = AtomicU64::new(1);
mod control;
mod handoff;
mod input;
mod maintenance;
mod npc;
mod npc_labels;
mod participation;
mod player;
mod privacy;
mod read_cut;
mod restore;
mod retained_values;
pub use handoff::RuntimeOutputHandoff;
mod consumer;
pub use consumer::RuntimeConsumer;
pub use npc::{RuntimeNpcPreparationStep, RuntimeNpcRead, RuntimeNpcResponseTicket};
pub use player::{RuntimePlayerPublication, RuntimePlayerRead};

#[derive(Debug)]
pub struct RuntimeError(String);
impl std::fmt::Display for RuntimeError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0)
    }
}
impl std::error::Error for RuntimeError {}
fn failure(error: impl std::fmt::Debug) -> RuntimeError {
    RuntimeError(format!("Native writer refused operation: {error:?}"))
}
fn decode_preparation(bytes: &[u8], budget: &ByteBudget) -> Result<ByteReservation, RuntimeError> {
    use crate::host::retained_size::map_storage;
    use std::mem::size_of;
    let text = std::str::from_utf8(bytes).map_err(failure)?;
    let shape = crate::encoding::JsonAllocationShape::read(text).map_err(failure)?;
    // These are the finite input arrays' inline carriers. Definitions are
    // canonical/source strings; installed rows never decode into a second world.
    let element = [
        size_of::<crate::records::InstalledRow>(),
        size_of::<crate::records::OwnerCoverage>(),
        size_of::<crate::records::RecordLayout>(),
        size_of::<crate::records::SqlCell>(),
        size_of::<crate::received::ReceivedChargeDirectory>(),
        size_of::<crate::commands::NativeCommand>(),
        size_of::<crate::time::AdmittedWorldInput>(),
    ]
    .into_iter()
    .max()
    .unwrap_or(0);
    let member = map_storage::<String, Vec<crate::records::InstalledRow>>(1)
        .and_then(|a| map_storage::<String, crate::records::SqlCell>(1).map(|b| a.max(b)))
        .ok_or_else(|| failure("capacity"))?;
    let bound = shape
        .array_items
        .checked_mul(4)
        .and_then(|n| n.checked_mul(element))
        .and_then(|n| n.checked_add(shape.members.checked_mul(member)?))
        .and_then(|n| n.checked_add(bytes.len().checked_mul(12)?))
        .and_then(|n| {
            n.checked_add(
                shape
                    .strings
                    .checked_mul(8 * size_of::<u16>() + 2 * size_of::<usize>())?,
            )
        })
        .ok_or_else(|| failure("capacity"))?;
    budget.reserve(bound).map_err(failure)
}
fn provider_response(
    answer: Option<(&RuntimeProvider, String)>,
    budget: &ByteBudget,
) -> Result<Option<ProviderResponse>, RuntimeError> {
    answer
        .map(|(ticket, json)| {
            let custody = budget.reserve(json.capacity()).map_err(failure)?;
            ProviderResponse::new(
                ticket.question.kind(),
                ticket.question.binding(),
                json,
                custody,
            )
            .map_err(failure)
        })
        .transpose()
}

/// A detached immutable JSON encoding, never a writable canonical record.
/// The Node bridge must transfer both parts to the actual buffer finalizer.
pub struct RuntimeJson {
    bytes: Vec<u8>,
    custody: ByteReservation,
    handoff: Option<RuntimeOutputHandoff>,
}
impl RuntimeJson {
    /// Join already encoded semantic-owner products without constructing a
    /// second mutable graph. The final allocation is admitted before copying.
    fn join(parts: &[&[u8]], budget: &ByteBudget) -> Result<Self, RuntimeError> {
        let length = parts
            .iter()
            .try_fold(0usize, |n, part| n.checked_add(part.len()))
            .ok_or_else(|| failure("capacity"))?;
        let mut custody = budget.reserve(length).map_err(failure)?;
        let mut bytes = Vec::new();
        bytes.try_reserve_exact(length).map_err(failure)?;
        for part in parts {
            bytes.extend_from_slice(part);
        }
        custody.resize(bytes.capacity()).map_err(failure)?;
        Ok(Self {
            bytes,
            custody,
            handoff: None,
        })
    }
    /// Reserve decoded consumer custody before Node copies/parses these exact
    /// selected bytes. Buffer finalization has a separate ownership lifetime.
    pub fn consumer(&self, budget: &ByteBudget) -> Result<RuntimeConsumer, RuntimeError> {
        consumer::prepare(&self.bytes, budget)
    }
    fn encode(
        value: &(impl Serialize + ?Sized),
        budget: &ByteBudget,
    ) -> Result<Self, RuntimeError> {
        let length = json_record_len(value).map_err(failure)?;
        let mut custody = budget
            .reserve(
                length
                    .checked_mul(2)
                    .map(|n| n.max(8))
                    .ok_or_else(|| failure("capacity"))?,
            )
            .map_err(failure)?;
        let bytes = json_record(value).map_err(failure)?.into_bytes();
        custody.resize(bytes.capacity()).map_err(failure)?;
        Ok(Self {
            bytes,
            custody,
            handoff: None,
        })
    }
    pub fn bytes(&self) -> &[u8] {
        &self.bytes
    }
    pub fn into_parts(self) -> (Vec<u8>, ByteReservation, Option<RuntimeOutputHandoff>) {
        (self.bytes, self.custody, self.handoff)
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Installation {
    records: crate::records::CurrentRecords,
    originals: Vec<crate::events::OriginalOccurrenceInput>,
    definitions: crate::install::NativeDefinitionInputs,
    settings: crate::install::NativeSetupSettings,
    storage: RuntimeStorageSettings,
    layouts: Vec<crate::records::RecordLayout>,
    cold_directories:
        Option<indexmap::IndexMap<String, Vec<crate::received::ReceivedChargeDirectory>>>,
    working_set: Option<crate::install::WorkingSetSelection>,
    accepted_cut: u64,
}

pub struct RuntimeProvider {
    question: Arc<ProviderQuestion>,
}
impl RuntimeProvider {
    pub fn json(&self, budget: &ByteBudget) -> Result<RuntimeJson, RuntimeError> {
        // The question is already encoded by its semantic owner. Copy only this
        // selected output; JavaScript buffers can never alias canonical bytes.
        let mut custody = budget
            .reserve(self.question.json().len())
            .map_err(failure)?;
        let bytes = self.question.json().as_bytes().to_vec();
        custody.resize(bytes.capacity()).map_err(failure)?;
        Ok(RuntimeJson {
            bytes,
            custody,
            handoff: None,
        })
    }
}

pub struct RuntimePrepared {
    prepared: crate::simulation::session::PreparedCandidate,
    output: Option<RuntimeJson>,
    handoff: RuntimeOutputHandoff,
}
impl RuntimePrepared {
    pub fn key(&self) -> CandidateKey {
        self.prepared.key
    }
    pub fn allocation(&self) -> crate::values::WorkVector {
        self.prepared.allocation
    }
    /// The server reserves this complete allocation first. Its current input
    /// and authority check then runs immediately before fence.settle().
    pub fn ready(&self) -> Result<(), RuntimeError> {
        if self.output.is_some() || !self.handoff.is_complete() {
            return Err(failure(
                "prepared output has not transferred to the application",
            ));
        }
        self.prepared.ready().map_err(failure)
    }
    pub fn take_output(&mut self) -> Option<RuntimeJson> {
        self.output.take()
    }
}

pub enum RuntimeStep {
    Continue,
    Provider(RuntimeProvider),
    Prepared(RuntimePrepared),
    Preview(RuntimeJson),
}

/// One resident writer, parked between finite compute calls. The private
/// session owns every canonical mutation, rollback and accepted save suffix.
pub struct NativeWorldSession {
    session: Session,
    budget: ByteBudget,
    prepared_output: Option<CandidateKey>,
    history_policy_id: String,
    history_policy_revision: u64,
    _history_policy_custody: ResidentReservation,
    next_read_serial: u64,
    active: bool,
    restore_installation: bool,
    restoring: Option<CandidateKey>,
    temporal_save_limits: crate::received::TemporalSaveLimits,
    history_edit_limits: crate::experience::HistoryEditLimits,
}
impl NativeWorldSession {
    pub fn install(
        bytes: &[u8],
        database_schema: &str,
        budget: ByteBudget,
    ) -> Result<Self, RuntimeError> {
        Self::install_purpose(
            bytes,
            database_schema,
            budget,
            crate::install::InstallPurpose::Current,
        )
    }
    pub fn install_restore(
        bytes: &[u8],
        database_schema: &str,
        budget: ByteBudget,
    ) -> Result<Self, RuntimeError> {
        Self::install_purpose(
            bytes,
            database_schema,
            budget,
            crate::install::InstallPurpose::Restore,
        )
    }
    fn install_purpose(
        bytes: &[u8],
        database_schema: &str,
        budget: ByteBudget,
        purpose: crate::install::InstallPurpose,
    ) -> Result<Self, RuntimeError> {
        let restore_installation = matches!(&purpose, crate::install::InstallPurpose::Restore);
        let budget = budget.for_world();
        // Parsed rows coexist with the caller's input and consuming installers.
        // This is transient preparation, not a canonical-world size policy.
        let _decode = input::prepare_installation(bytes, &budget)?;
        let input: Installation = serde_json::from_slice(bytes).map_err(failure)?;
        let pending_save_budget = budget.pending_save(input.storage.pending_save_bytes);
        let temporal_save_limits = crate::received::TemporalSaveLimits {
            target_bytes: input.storage.temporal_save.target_bytes,
            row_bytes: input.storage.temporal_save.row_bytes,
            resident_bytes: input.storage.temporal_resident_bytes,
        };
        let history_edit_limits = input.storage.history_edit;
        let core = crate::install::CoreInstallInput {
            purpose,
            records: input.records,
            originals: input.originals,
            definitions: input.definitions,
            settings: input.settings,
            layouts: input.layouts,
            cold_directories: input.cold_directories,
            accepted_cut: input.accepted_cut,
        };
        let installed = match input.working_set {
            Some(selection) => {
                crate::install::assemble_working_core(core, selection, database_schema, &budget)
            }
            None => crate::install::assemble_core(core, database_schema, &budget),
        }
        .map_err(failure)?;
        let history_policy_revision = installed.story_policy_revision.unwrap_or(0);
        #[derive(Deserialize)]
        struct StoryIdentity {
            id: String,
        }
        let policy = installed
            .state
            .installed
            .retained
            .story_policy
            .as_ref()
            .ok_or_else(|| failure("installed story policy is required by this proof"))?;
        let history_policy_custody = budget
            .reserve_record(policy.payload().len())
            .map_err(failure)?;
        let history_policy_id = serde_json::from_str::<StoryIdentity>(policy.payload())
            .map_err(failure)?
            .id;
        let installed = crate::install::finish_selected_installation(installed).map_err(failure)?;
        let generation = NEXT_GENERATION
            .fetch_update(Ordering::AcqRel, Ordering::Acquire, |value| {
                value
                    .checked_add(1)
                    .filter(|next| *next <= crate::identity::MAX_SAFE_INTEGER)
            })
            .map_err(failure)?;
        Ok(Self {
            session: Session::new(
                installed,
                generation,
                budget.clone(),
                pending_save_budget,
                temporal_save_limits,
            )
            .map_err(failure)?,
            budget,
            prepared_output: None,
            history_policy_id,
            history_policy_revision,
            _history_policy_custody: history_policy_custody,
            next_read_serial: 0,
            active: false,
            restore_installation,
            restoring: None,
            temporal_save_limits,
            history_edit_limits,
        })
    }
    pub fn fence(&self) -> Arc<CandidateFence> {
        self.session.fence()
    }
    pub fn installation(&self) -> Result<RuntimeJson, RuntimeError> {
        RuntimeJson::encode(
            &self.session.current_installation().map_err(failure)?,
            &self.budget,
        )
    }
    /// Immutable authored setup can be prepared before SQL adoption. It never
    /// supplies an actor, current clock, private account or write capability.
    pub fn definitions(&self) -> Result<RuntimeJson, RuntimeError> {
        let simulation = self.session.accepted().map_err(failure)?;
        let (json, custody) =
            crate::capture::write_installed_definitions(&simulation.state.installed, &self.budget)
                .map_err(failure)?;
        Ok(RuntimeJson {
            bytes: json.into_bytes(),
            custody,
            handoff: None,
        })
    }
    pub fn world_id(&self) -> Result<&str, RuntimeError> {
        Ok(&self
            .session
            .accepted()
            .map_err(failure)?
            .state
            .physical
            .header
            .id)
    }
    /// The existing SQL writer returns these facts only after adopting its
    /// actual current head. Installation alone never admits gameplay work.
    pub fn activate(&mut self, receipt: RuntimeActivation) -> Result<(), RuntimeError> {
        let state = &self.session.accepted().map_err(failure)?.state;
        if self.active
            || self.restore_installation
            || self.restoring.is_some()
            || receipt.world_id != state.physical.header.id
            || receipt.generation != state.generation
            || receipt.revision != state.durable_revision
            || receipt.accepted_cut != state.accepted_cut
        {
            return Err(failure(
                "native activation does not match its adopted SQL writer",
            ));
        }
        self.active = true;
        Ok(())
    }
    fn require_active(&self) -> Result<(), RuntimeError> {
        if self.active {
            Ok(())
        } else {
            Err(failure("native installation has no adopted writer"))
        }
    }
    pub fn begin_advance(
        &mut self,
        seconds: f64,
        maximum_intervals: usize,
        input: &[u8],
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let inputs = serde_json::from_slice(input).map_err(failure)?;
        self.session
            .begin_advance(seconds, maximum_intervals, Vec::new(), inputs)
            .map_err(failure)
    }
    pub fn begin_command(
        &mut self,
        input: &[u8],
        canonical: String,
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let command = serde_json::from_slice(input).map_err(failure)?;
        self.session
            .begin_command(
                command,
                canonical,
                crate::commands::CommandOptions {
                    preview: false,
                    native_controller: false,
                    native_movement: None,
                },
            )
            .map_err(failure)
    }
    pub fn begin_cancel_preview(
        &mut self,
        input: &[u8],
        canonical: String,
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let command = serde_json::from_slice(input).map_err(failure)?;
        self.session
            .begin_cancel_preview(command, canonical)
            .map_err(failure)
    }
    pub fn step(
        &mut self,
        key: CandidateKey,
        answer: Option<(&RuntimeProvider, String)>,
    ) -> Result<RuntimeStep, RuntimeError> {
        if self.session.is_npc_candidates(key) || self.session.is_npc_sources(key) {
            return Err(failure("NPC discovery requires its originating read"));
        }
        let answer = provider_response(answer, &self.budget)?;
        // This is the installed story policy, not a bridge-selected world law.
        let step = self
            .session
            .step(
                key,
                answer,
                crate::experience::HistorySettings {
                    policy_id: &self.history_policy_id,
                    policy_revision: self.history_policy_revision,
                },
            )
            .map_err(failure)?;
        Ok(match step {
            SessionStep::Continue => RuntimeStep::Continue,
            SessionStep::Question(question) => RuntimeStep::Provider(RuntimeProvider { question }),
            SessionStep::Preview(preview) => {
                RuntimeStep::Preview(RuntimeJson::encode(preview.outcome(), &self.budget)?)
            }
            SessionStep::NpcCandidates(_) | SessionStep::NpcSources(_) => {
                return Err(failure(
                    "NPC read preparation requires its originating read",
                ));
            }
            SessionStep::Prepared(prepared) => {
                if self.restoring == Some(key) {
                    if let Err(error) = self.session.prepare_restore_adoption(key) {
                        self.session.cancel(key).map_err(failure)?;
                        return Err(failure(error));
                    }
                }
                let (
                    operation,
                    history,
                    notices,
                    records,
                    personal_predecessors,
                    protected_save,
                    progress,
                ) = self.session.prepared_products(key).map_err(failure)?;
                let restore = self.session.prepared_restore_facts(key).map_err(failure)?;
                let output = (|| {
                    let handoff = RuntimeOutputHandoff::new(&self.budget)?;
                    let mut output = RuntimeJson::encode(
                        &Products {
                            operation,
                            history,
                            notices,
                            records,
                            personal_predecessors,
                            protected_save,
                            progress,
                            restore,
                        },
                        &self.budget,
                    )?;
                    output.handoff = Some(handoff.clone());
                    Ok::<_, RuntimeError>((output, handoff))
                })();
                let (output, handoff) = match output {
                    Ok(output) => output,
                    Err(error) => {
                        self.session.cancel(key).map_err(failure)?;
                        return Err(error);
                    }
                };
                self.prepared_output = Some(key);
                RuntimeStep::Prepared(RuntimePrepared {
                    prepared,
                    output: Some(output),
                    handoff,
                })
            }
        })
    }
    /// Requires the genuine fence result, never an acceptance boolean supplied
    /// to the mutable world. All output bytes were admitted before Ready.
    pub fn finish_settlement(&mut self, key: CandidateKey) -> Result<bool, RuntimeError> {
        if self.restoring == Some(key)
            && self.session.fence().phase() != crate::host::CandidatePhase::Rejected
        {
            return Err(failure("whole-install commit requires restored activation"));
        }
        if self
            .prepared_output
            .as_ref()
            .is_none_or(|prepared| *prepared != key)
        {
            return Err(failure(FenceError::NotReady));
        }
        let accepted = self.session.finish_settlement(key).map_err(failure)?;
        self.prepared_output = None;
        if self.restoring == Some(key) {
            self.restoring = None;
        }
        Ok(accepted.is_some())
    }
    pub fn cancel(&mut self, key: CandidateKey) -> Result<(), RuntimeError> {
        // Terminal cursor errors already roll back through Session. Repeated
        // cleanup may observe that exact completed binding; it must neither
        // mask the original failure nor roll back an accepted operation.
        if self
            .session
            .fence()
            .validate_phase(key, crate::host::CandidatePhase::Idle)
            .is_ok()
        {
            self.prepared_output = None;
            if self.restoring == Some(key) {
                self.restoring = None;
            }
            return Ok(());
        }
        self.session.cancel(key).map_err(failure)?;
        self.prepared_output = None;
        if self.restoring == Some(key) {
            self.restoring = None;
        }
        Ok(())
    }
    pub fn save_barrier_complete(&self) -> bool {
        self.session.save_barrier_complete()
    }
    pub fn capture_save(&mut self) -> Result<RuntimeSave, RuntimeError> {
        self.session
            .capture_save()
            .map(|prefix| RuntimeSave { prefix })
            .map_err(failure)
    }
    pub fn acknowledge(&mut self, ack: RuntimeSaveAcknowledgement) -> Result<(), RuntimeError> {
        self.session
            .acknowledge(crate::records::save::SaveAcknowledgement {
                world_id: &ack.world_id,
                generation: &ack.generation,
                prefix: ack.prefix,
                base_revision: ack.base_revision,
                revision: ack.revision,
                through_cut: ack.through_cut,
                identity_through: ack.identity_through,
            })
            .map_err(failure)
    }
    pub fn finish_stop(&self) -> Result<(), RuntimeError> {
        self.session.finish_stop().map_err(failure)
    }
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RuntimeActivation {
    pub world_id: String,
    pub generation: String,
    pub revision: u64,
    pub accepted_cut: u64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RuntimeStorageSettings {
    temporal_resident_bytes: usize,
    temporal_save: RuntimeTemporalSaveSettings,
    pending_save_bytes: usize,
    history_edit: crate::experience::HistoryEditLimits,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RuntimeTemporalSaveSettings {
    target_bytes: usize,
    row_bytes: usize,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RuntimeSaveAcknowledgement {
    pub world_id: String,
    pub generation: String,
    pub prefix: u64,
    pub base_revision: u64,
    pub revision: u64,
    pub through_cut: u64,
    pub identity_through: u64,
}
pub struct RuntimeSave {
    prefix: Arc<crate::records::save::SavePrefix>,
}
impl RuntimeSave {
    pub fn json(&self, budget: &ByteBudget) -> Result<RuntimeJson, RuntimeError> {
        RuntimeJson::encode(self.prefix.rows(), budget)
    }
}

struct Products<'a> {
    operation: &'a CompletedOperation,
    history: &'a crate::experience::CapturedHistoryInput,
    notices: &'a crate::cognition::PreparedSemanticNotices,
    records: &'a crate::records::ChangedRows,
    personal_predecessors: &'a crate::experience::PersonalPredecessors,
    protected_save: Option<&'a crate::records::SaveRows>,
    progress: crate::simulation::session::PreparedReadProgress<'a>,
    restore: Option<crate::simulation::session::PreparedRestoreFacts<'a>>,
}
impl Serialize for Products<'_> {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut map = serializer.serialize_map(None)?;
        map.serialize_entry("outcome", self.operation.outcome())?;
        map.serialize_entry("events", &Events(self.operation))?;
        map.serialize_entry("history", &self.history.value())?;
        map.serialize_entry("notices", self.notices)?;
        if let Some(restore) = &self.restore {
            map.serialize_entry("restore", restore)?;
            if let CompletedOperation::Restore(operation) = self.operation {
                map.serialize_entry("restoreMetadata", &operation.metadata)?;
            }
        } else {
            map.serialize_entry("records", self.records)?;
        }
        map.serialize_entry("personalPredecessors", &self.personal_predecessors.value())?;
        if let Some(prefix) = self.protected_save.filter(|_| self.restore.is_none()) {
            map.serialize_entry("protectedSave", prefix)?;
        }
        map.serialize_entry("progress", &self.progress)?;
        privacy::serialize(self.operation, &mut map)?;
        map.end()
    }
}
struct Events<'a>(&'a CompletedOperation);
impl Serialize for Events<'_> {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut sequence = serializer.serialize_seq(None)?;
        for event in self.0.events() {
            sequence.serialize_element(event)?;
        }
        sequence.end()
    }
}
