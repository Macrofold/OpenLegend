//! Exact affected-history preparation alternates indexed SQL dependencies and
//! resident account aliases. It never labels an actor's partial history complete.
use super::*;
use crate::execution::{CandidateCheckpoint, CoreMutation, ExecutionError};
use crate::host::retained_size::{heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation, CandidateKey};
use crate::received::hydrate_selected_temporal_pages;
use crate::records::RecordPlacement;
use std::mem::size_of;

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct HistoryEditLimits {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub page_bytes: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub page_rows: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub source_bytes: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub receipt_count: u64,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct HistoryBinding {
    world_id: String,
    generation: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    accepted_cut: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    identity_through: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    candidate_id: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    candidate_generation: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    request_serial: u64,
}
#[derive(Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
enum HistoryPhase {
    Closure,
    Records,
    Verify,
}
#[derive(Clone, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct HistorySource {
    actor_id: String,
    source_id: String,
}
#[derive(Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct HistoryTotals {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pages: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    page_bytes: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    source_bytes: u64,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct HistoryEditReadRequest {
    actor_id: String,
    binding: HistoryBinding,
    phase: HistoryPhase,
    sources: Vec<HistorySource>,
    resident_pages: Vec<String>,
    resident_values: Vec<String>,
    at: f64,
    max_age_seconds: f64,
    totals: HistoryTotals,
    maximum_transfer_bytes: usize,
    predecessors: Vec<HistoryPredecessor>,
}
pub(crate) struct HistoryEditQuestion {
    request: HistoryEditReadRequest,
    _storage: ByteReservation,
}
impl HistoryEditQuestion {
    pub(crate) fn request(&self) -> &HistoryEditReadRequest {
        &self.request
    }
}
#[derive(Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct HistoryPredecessor {
    id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    revision: u64,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct HistoryEditReadResponse {
    binding: HistoryBinding,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    durable_revision: u64,
    selection: Vec<HistorySource>,
    tables: BTreeMap<String, Vec<InstalledRow>>,
    owners: Vec<OwnerCoverage>,
    predecessors: Vec<HistoryPredecessor>,
    totals: HistoryTotals,
}
pub(crate) struct HistoryEditAnswer {
    value: HistoryEditReadResponse,
    _storage: ByteReservation,
}
#[derive(Debug)]
pub(crate) enum HistoryPreparationError {
    StaleResponse,
    MalformedResponse,
    Capacity,
    Owner(ExecutionError),
}
impl From<ExecutionError> for HistoryPreparationError {
    fn from(error: ExecutionError) -> Self {
        Self::Owner(error)
    }
}
impl HistoryEditAnswer {
    /// The caller retains its input buffer. Finite carriers and JSON structure
    /// are counted before typed allocation, including nested exact-text cells.
    pub(crate) fn decode(text: &str, budget: &ByteBudget) -> Result<Self, HistoryPreparationError> {
        let shape = crate::encoding::JsonAllocationShape::read(text)
            .map_err(|_| HistoryPreparationError::MalformedResponse)?;
        let carrier = [
            size_of::<InstalledRow>(),
            size_of::<OwnerCoverage>(),
            size_of::<crate::records::SqlCell>(),
            size_of::<HistorySource>(),
            size_of::<HistoryPredecessor>(),
        ]
        .into_iter()
        .max()
        .unwrap_or(0);
        let member = map_storage::<String, crate::records::SqlCell>(1)
            .and_then(|n| Some(n.max(map_storage::<String, Vec<InstalledRow>>(1)?)))
            .ok_or(HistoryPreparationError::Capacity)?;
        // Vec growth is <4x; decoded text, raw scalar buffers and ExactObject's
        // six-byte escaped-key cache together are bounded by twelve wire bytes.
        let bytes = shape
            .array_items
            .checked_mul(4)
            .and_then(|n| n.checked_mul(carrier))
            .and_then(|n| n.checked_add(shape.members.checked_mul(member)?))
            .and_then(|n| n.checked_add(text.len().checked_mul(12)?))
            .and_then(|n| {
                n.checked_add(
                    shape
                        .strings
                        .checked_mul(8 * size_of::<u16>() + 2 * size_of::<usize>())?,
                )
            })
            .ok_or(HistoryPreparationError::Capacity)?;
        let storage = budget
            .reserve(bytes)
            .map_err(|_| HistoryPreparationError::Capacity)?;
        let value =
            serde_json::from_str(text).map_err(|_| HistoryPreparationError::MalformedResponse)?;
        Ok(Self {
            value,
            _storage: storage,
        })
    }
}

/// This purpose witness certifies only the selected affected rows at one cut.
/// It grants no global historical negative or permission to another observer.
pub(crate) struct ClosedPrivacyScope {
    actor_id: String,
    generation: String,
    cut: u64,
    identity: u64,
    at: f64,
    selected: IndexSet<String>,
    _storage: ByteReservation,
}
impl ClosedPrivacyScope {
    pub(crate) fn permits_actor(&self, actor: &str) -> bool {
        self.actor_id == actor
    }
    pub(super) fn matches(&self, state: &crate::simulation::SimulationState, actor: &str) -> bool {
        self.actor_id == actor
            && self.generation == state.generation
            && self.cut == state.accepted_cut
            && self.identity == state.physical.identity.next_id()
            && self.at == state.physical.header.sim_time
    }
}
pub(crate) struct PreparedPrivacyEdit {
    pub(crate) selection: super::PrivacySelection,
    predecessors: Vec<HistoryPredecessor>,
    _storage: ByteReservation,
}
impl PreparedPrivacyEdit {
    pub(super) fn into_verified_parts(
        self,
        core: &CoreMutation<'_>,
        candidate: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<(super::PrivacySelection, HistoryPageVerification), ExecutionError> {
        let mut storage = self._storage;
        storage.merge(
            budget.reserve(
                heap_sum([
                    size_of::<HistoryPageVerification>(),
                    self.selection.actor_id.len(),
                    core.state.physical.header.id.len(),
                    self.selection.generation.len(),
                ])
                .ok_or(ExecutionError::Capacity)?,
            )?,
        )?;
        let verification = HistoryPageVerification {
            actor: self.selection.actor_id.clone(),
            binding: HistoryBinding {
                world_id: core.state.physical.header.id.clone(),
                generation: self.selection.generation.clone(),
                accepted_cut: self.selection.accepted_cut,
                identity_through: self.selection.scope.identity,
                candidate_id: candidate.id,
                candidate_generation: candidate.generation,
                request_serial: 0,
            },
            at: self.selection.scope.at,
            predecessors: self.predecessors,
            pending: None,
            done: false,
            _storage: storage,
        };
        Ok((self.selection, verification))
    }
}
/// Source rechecks immutable SQL predecessors after awaited preparation. The
/// same accepted-cut projection is verified after any native language wait;
/// none of its private mutations is published when this read refuses.
pub(super) struct HistoryPageVerification {
    actor: String,
    binding: HistoryBinding,
    at: f64,
    predecessors: Vec<HistoryPredecessor>,
    pending: Option<Arc<HistoryEditQuestion>>,
    done: bool,
    _storage: ByteReservation,
}
impl HistoryPageVerification {
    pub(super) fn step(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<HistoryEditAnswer>,
        budget: &ByteBudget,
    ) -> Result<Option<Arc<HistoryEditQuestion>>, HistoryPreparationError> {
        if self.done
            || core.state.generation != self.binding.generation
            || core.state.accepted_cut != self.binding.accepted_cut
        {
            return Err(HistoryPreparationError::StaleResponse);
        }
        if let Some(answer) = answer {
            if !core.journal.byte_budget().owns(&answer._storage) {
                return Err(HistoryPreparationError::StaleResponse);
            }
            let question = self
                .pending
                .as_ref()
                .ok_or(HistoryPreparationError::StaleResponse)?;
            let response = answer.value;
            if response.binding != question.request.binding {
                return Err(HistoryPreparationError::StaleResponse);
            }
            if response.durable_revision > core.state.durable_revision
                || !response.selection.is_empty()
                || !response.tables.is_empty()
                || !response.owners.is_empty()
                || response.predecessors != self.predecessors
                || response.totals != HistoryTotals::default()
            {
                return Err(HistoryPreparationError::Owner(invalid()));
            }
            self.pending = None;
            self.done = true;
            return Ok(None);
        }
        if self.predecessors.is_empty() {
            self.done = true;
            return Ok(None);
        }
        if let Some(question) = &self.pending {
            return Ok(Some(Arc::clone(question)));
        }
        let names = self
            .predecessors
            .iter()
            .try_fold(0usize, |n, p| n.checked_add(p.id.len()))
            .ok_or(ExecutionError::Capacity)?;
        let storage = budget
            .reserve(
                heap_sum([
                    size_of::<HistoryEditQuestion>() + 2 * size_of::<usize>(),
                    self.actor.len(),
                    self.binding.world_id.len(),
                    self.binding.generation.len(),
                    names,
                    self.predecessors
                        .len()
                        .checked_mul(size_of::<HistoryPredecessor>())
                        .ok_or(ExecutionError::Capacity)?,
                ])
                .ok_or(ExecutionError::Capacity)?,
            )
            .map_err(|_| ExecutionError::Capacity)?;
        let mut binding = self.binding.clone();
        binding.request_serial = core.journal.next_provider_serial()?;
        let maximum_transfer_bytes = budget.limit().saturating_sub(budget.used());
        if maximum_transfer_bytes == 0 {
            return Err(ExecutionError::Capacity.into());
        }
        let request = HistoryEditReadRequest {
            actor_id: self.actor.clone(),
            binding,
            phase: HistoryPhase::Verify,
            sources: Vec::new(),
            resident_pages: Vec::new(),
            resident_values: Vec::new(),
            at: self.at,
            max_age_seconds: 0.,
            totals: HistoryTotals::default(),
            maximum_transfer_bytes,
            predecessors: self.predecessors.clone(),
        };
        let question = Arc::new(HistoryEditQuestion {
            request,
            _storage: storage,
        });
        self.pending = Some(Arc::clone(&question));
        Ok(Some(question))
    }
}
pub(crate) enum PrivacyPreparationStep {
    Read(Arc<HistoryEditQuestion>),
    Complete(PreparedPrivacyEdit),
}
pub(crate) struct PrivacyPreparationCursor {
    actor: String,
    roots: Vec<String>,
    sources: IndexSet<String>,
    candidate: CandidateKey,
    limits: HistoryEditLimits,
    at: f64,
    generation: String,
    cut: u64,
    identity: u64,
    privacy_revision: u64,
    phase: HistoryPhase,
    totals: HistoryTotals,
    predecessors: Vec<HistoryPredecessor>,
    checkpoint: Option<CandidateCheckpoint>,
    pending: Option<Arc<HistoryEditQuestion>>,
    storage: ByteReservation,
    done: bool,
}
fn invalid() -> ExecutionError {
    ExecutionError::Experience(ExperienceError::StaleHydration)
}
impl PrivacyPreparationCursor {
    pub(crate) fn new(
        core: &mut CoreMutation<'_>,
        actor: &str,
        roots: &[String],
        candidate: CandidateKey,
        limits: HistoryEditLimits,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let history = core.state.experience.actor(actor).ok_or_else(invalid)?;
        if candidate.base_cut != core.state.accepted_cut
            || [
                limits.page_bytes,
                limits.page_rows,
                limits.source_bytes,
                limits.receipt_count,
            ]
            .contains(&0)
        {
            return Err(invalid());
        }
        let bytes = heap_sum([
            size_of::<Self>(),
            actor.len(),
            core.state.generation.len(),
            roots
                .len()
                .checked_mul(size_of::<String>() * 2)
                .ok_or(ExecutionError::Capacity)?,
            roots
                .iter()
                .try_fold(0usize, |n, id| n.checked_add(id.len().checked_mul(2)?))
                .ok_or(ExecutionError::Capacity)?,
            map_storage::<String, ()>(roots.len()).ok_or(ExecutionError::Capacity)?,
        ])
        .ok_or(ExecutionError::Capacity)?;
        let storage = budget.reserve(bytes)?;
        let privacy_revision = history.privacy.revision();
        let checkpoint = core.journal.checkpoint(core.state)?;
        Ok(Self {
            actor: actor.to_owned(),
            roots: roots.to_vec(),
            sources: roots.iter().cloned().collect(),
            candidate,
            limits,
            at: core.state.physical.header.sim_time,
            generation: core.state.generation.clone(),
            cut: core.state.accepted_cut,
            identity: core.state.physical.identity.next_id(),
            privacy_revision,
            phase: HistoryPhase::Closure,
            totals: HistoryTotals::default(),
            predecessors: Vec::new(),
            checkpoint: Some(checkpoint),
            pending: None,
            storage,
            done: false,
        })
    }
    pub(crate) fn abort(&mut self, core: &mut CoreMutation<'_>) -> Result<(), ExecutionError> {
        self.pending = None;
        self.done = true;
        if let Some(checkpoint) = self.checkpoint.take() {
            core.journal.rollback_to(core.state, checkpoint)?;
        }
        Ok(())
    }
    fn matches(&self, core: &CoreMutation<'_>) -> bool {
        self.generation == core.state.generation
            && self.cut == core.state.accepted_cut
            && self.identity == core.state.physical.identity.next_id()
            && self.at == core.state.physical.header.sim_time
            && core
                .state
                .experience
                .actor(&self.actor)
                .is_some_and(|history| history.privacy.revision() == self.privacy_revision)
    }
    fn question(
        &mut self,
        core: &mut CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<Arc<HistoryEditQuestion>, ExecutionError> {
        if let Some(question) = &self.pending {
            return Ok(Arc::clone(question));
        }
        let history = core.state.temporal.actor(&self.actor);
        let values = core.state.reception.received_values.as_ref();
        let count = self
            .sources
            .len()
            .checked_add(history.map_or(0, |history| history.pages().len()))
            .and_then(|n| n.checked_add(values.map_or(0, |values| values.resident_ids().len())))
            .ok_or(ExecutionError::Capacity)?;
        let names = self
            .sources
            .iter()
            .try_fold(0usize, |n, id| {
                n.checked_add(id.len())
                    .and_then(|n| n.checked_add(self.actor.len()))
            })
            .and_then(|n| {
                history
                    .into_iter()
                    .flat_map(|history| history.pages())
                    .try_fold(n, |n, page| n.checked_add(page.id().len()))
            })
            .and_then(|n| {
                values.map_or(Some(n), |values| {
                    values
                        .resident_ids()
                        .try_fold(n, |n, id| n.checked_add(id.len()))
                })
            })
            .ok_or(ExecutionError::Capacity)?;
        let storage = budget.reserve(
            heap_sum([
                size_of::<HistoryEditQuestion>() + 2 * size_of::<usize>(),
                count
                    .checked_mul(size_of::<HistorySource>().max(size_of::<String>()))
                    .ok_or(ExecutionError::Capacity)?,
                names,
                self.actor.len(),
                core.state.physical.header.id.len(),
                self.generation.len(),
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let request = HistoryEditReadRequest {
            actor_id: self.actor.clone(),
            binding: HistoryBinding {
                world_id: core.state.physical.header.id.clone(),
                generation: self.generation.clone(),
                accepted_cut: self.cut,
                identity_through: self.identity,
                candidate_id: self.candidate.id,
                candidate_generation: self.candidate.generation,
                request_serial: core.journal.next_provider_serial()?,
            },
            phase: self.phase,
            sources: self
                .sources
                .iter()
                .map(|id| HistorySource {
                    actor_id: self.actor.clone(),
                    source_id: id.clone(),
                })
                .collect(),
            resident_pages: history
                .into_iter()
                .flat_map(|history| history.pages())
                .map(|page| page.id().to_owned())
                .collect(),
            resident_values: values
                .into_iter()
                .flat_map(|values| values.resident_ids())
                .map(str::to_owned)
                .collect(),
            at: self.at,
            max_age_seconds: core
                .state
                .installed
                .attention
                .value()
                .retention
                .recent
                .max_age_seconds,
            totals: self.totals,
            maximum_transfer_bytes: budget.limit().saturating_sub(budget.used()),
            predecessors: Vec::new(),
        };
        if request.maximum_transfer_bytes == 0 {
            return Err(ExecutionError::Capacity);
        }
        let question = Arc::new(HistoryEditQuestion {
            request,
            _storage: storage,
        });
        self.pending = Some(Arc::clone(&question));
        Ok(question)
    }
    pub(crate) fn step(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<HistoryEditAnswer>,
        budget: &ByteBudget,
    ) -> Result<PrivacyPreparationStep, HistoryPreparationError> {
        if self.done || !self.matches(core) {
            return Err(HistoryPreparationError::StaleResponse);
        }
        if let Some(answer) = answer {
            if !core.journal.byte_budget().owns(&answer._storage) {
                return Err(HistoryPreparationError::StaleResponse);
            }
            let pending = self
                .pending
                .as_ref()
                .ok_or(HistoryPreparationError::StaleResponse)?;
            if answer.value.binding != pending.request.binding
                || answer.value.durable_revision > core.state.durable_revision
            {
                return Err(HistoryPreparationError::StaleResponse);
            }
            // Keep the typed response funded until its actual owners consume it.
            self.pending = None;
            match self.consume(core, answer.value, budget) {
                Ok(Some(completed)) => return Ok(PrivacyPreparationStep::Complete(completed)),
                Ok(None) => {}
                Err(error) => {
                    self.abort(core)?;
                    return Err(error.into());
                }
            }
        }
        match self.question(core, budget) {
            Ok(question) => Ok(PrivacyPreparationStep::Read(question)),
            Err(error) => {
                self.abort(core)?;
                Err(error.into())
            }
        }
    }
    fn add_sources(
        &mut self,
        incoming: impl IntoIterator<Item = String>,
        _budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let incoming = incoming.into_iter();
        for id in incoming {
            if self.sources.contains(&id) {
                continue;
            }
            let capacity = self.sources.capacity();
            let growth = if self.sources.len() == capacity {
                map_storage::<String, ()>(
                    capacity
                        .checked_mul(2)
                        .and_then(|n| n.checked_add(4))
                        .ok_or(ExecutionError::Capacity)?,
                )
                .and_then(|n| n.checked_sub(map_storage::<String, ()>(capacity)?))
                .ok_or(ExecutionError::Capacity)?
            } else {
                0
            };
            self.storage.resize(
                self.storage
                    .bytes()
                    .checked_add(growth)
                    .and_then(|n| n.checked_add(id.capacity()))
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            self.sources
                .try_reserve(1)
                .map_err(|_| ExecutionError::Capacity)?;
            self.sources.insert(id);
        }
        Ok(())
    }
    fn consume(
        &mut self,
        core: &mut CoreMutation<'_>,
        mut response: HistoryEditReadResponse,
        budget: &ByteBudget,
    ) -> Result<Option<PreparedPrivacyEdit>, ExecutionError> {
        let allowed = match self.phase {
            HistoryPhase::Closure => &["mind_temporal_pages", "mind_perception_values"][..],
            HistoryPhase::Records => &[
                "mind_awareness",
                "mind_memories",
                "mind_summaries",
                "activity_occurrences",
                "mind_appraisals",
            ][..],
            HistoryPhase::Verify => return Err(invalid()),
        };
        if response
            .tables
            .keys()
            .any(|table| !allowed.contains(&table.as_str()))
            || response
                .selection
                .iter()
                .any(|source| source.actor_id != self.actor || source.source_id.is_empty())
            || self.sources.iter().any(|id| {
                !response
                    .selection
                    .iter()
                    .any(|source| source.source_id == *id)
            })
        {
            return Err(invalid());
        }
        let _selection = budget.reserve(
            map_storage::<String, ()>(response.selection.len()).ok_or(ExecutionError::Capacity)?,
        )?;
        let mut selected = response
            .selection
            .into_iter()
            .map(|source| source.source_id)
            .collect::<IndexSet<_>>();
        let row_count = response
            .tables
            .values()
            .try_fold(0usize, |n, rows| n.checked_add(rows.len()))
            .ok_or(ExecutionError::Capacity)?;
        let row_names = response
            .tables
            .values()
            .flatten()
            .try_fold(0usize, |n, row| {
                heap_sum([n, row.id.len(), row.parent.len(), row.slot.len()])
            })
            .ok_or(ExecutionError::Capacity)?;
        let _metadata = budget.reserve(
            heap_sum([
                map_storage::<String, Vec<RecordPlacement>>(response.tables.len())
                    .ok_or(ExecutionError::Capacity)?,
                row_count
                    .checked_mul(size_of::<RecordPlacement>())
                    .ok_or(ExecutionError::Capacity)?,
                row_names,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let placements = response
            .tables
            .iter()
            .map(|(table, rows)| {
                (
                    table.clone(),
                    rows.iter()
                        .map(|row| RecordPlacement {
                            id: row.id.clone(),
                            parent: row.parent.clone(),
                            slot: row.slot.clone(),
                            position: row.position,
                        })
                        .collect(),
                )
            })
            .collect::<BTreeMap<_, Vec<_>>>();
        match self.phase {
            HistoryPhase::Verify => return Err(invalid()),
            HistoryPhase::Closure => {
                if !response.owners.is_empty() {
                    return Err(invalid());
                }
                let rows = response
                    .tables
                    .remove("mind_temporal_pages")
                    .unwrap_or_default();
                let values = response
                    .tables
                    .remove("mind_perception_values")
                    .unwrap_or_default();
                let expected = HistoryTotals {
                    pages: self
                        .totals
                        .pages
                        .checked_add(rows.len() as u64)
                        .ok_or(ExecutionError::Capacity)?,
                    page_bytes: rows
                        .iter()
                        .try_fold(self.totals.page_bytes, |n, row| {
                            n.checked_add(row.payload.len() as u64)
                        })
                        .ok_or(ExecutionError::Capacity)?,
                    source_bytes: values
                        .iter()
                        .try_fold(self.totals.source_bytes, |n, row| {
                            n.checked_add(row.payload.len() as u64)
                        })
                        .ok_or(ExecutionError::Capacity)?,
                };
                if response.totals != expected
                    || expected.pages > self.limits.page_rows
                    || expected.page_bytes > self.limits.page_bytes
                    || expected.source_bytes > self.limits.source_bytes
                    || response.predecessors.len() != rows.len()
                {
                    return Err(invalid());
                }
                for (index, predecessor) in response.predecessors.iter().enumerate() {
                    if !rows.iter().any(|row| row.id == predecessor.id)
                        || response.predecessors[..index]
                            .iter()
                            .any(|prior| prior.id == predecessor.id)
                        || self
                            .predecessors
                            .iter()
                            .any(|prior| prior.id == predecessor.id)
                    {
                        return Err(invalid());
                    }
                }
                let layout = core
                    .state
                    .installed
                    .schema
                    .layout("mind_temporal_pages")
                    .map_err(|_| invalid())?;
                let column = layout
                    .columns
                    .iter()
                    .position(|name| name == "value_refs")
                    .ok_or_else(invalid)?;
                let count = rows
                    .iter()
                    .try_fold(0usize, |n, row| {
                        n.checked_add(row.extra.get(column)?.as_array()?.len())
                    })
                    .ok_or_else(invalid)?;
                let _references = budget.reserve(
                    count
                        .checked_add(values.len())
                        .and_then(|n| {
                            n.checked_mul(crate::host::retained_size::tree_node_bound::<
                                    &str,
                                    (),
                                >()?)
                        })
                        .ok_or(ExecutionError::Capacity)?,
                )?;
                {
                    let pool = core.state.reception.received_values.as_ref();
                    let mut required = BTreeSet::new();
                    for row in &rows {
                        if row.extra.first().and_then(crate::records::SqlCell::as_str)
                            != Some(self.actor.as_str())
                            || core
                                .state
                                .temporal
                                .actor(&self.actor)
                                .ok_or_else(invalid)?
                                .pages()
                                .any(|page| page.id() == row.slot)
                        {
                            return Err(invalid());
                        }
                        for reference in row
                            .extra
                            .get(column)
                            .and_then(crate::records::SqlCell::as_array)
                            .ok_or_else(invalid)?
                        {
                            let id = reference.as_str().ok_or_else(invalid)?;
                            if pool.is_none_or(|pool| pool.shared_record(id).is_none()) {
                                required.insert(id);
                            }
                        }
                    }
                    let supplied = values
                        .iter()
                        .map(|row| row.slot.as_str())
                        .collect::<BTreeSet<_>>();
                    if supplied.len() != values.len() || supplied != required {
                        return Err(invalid());
                    }
                }
                if !values.is_empty() {
                    core.state
                        .reception
                        .received_values
                        .as_mut()
                        .ok_or_else(invalid)?
                        .load_rows(values, self.at, core.state.physical.header.sequence)?;
                }
                let _loaded = hydrate_selected_temporal_pages(core, rows, budget)?;
                self.totals = expected;
                let incoming = response.predecessors;
                let needed = self
                    .predecessors
                    .len()
                    .checked_add(incoming.len())
                    .ok_or(ExecutionError::Capacity)?;
                let target = needed.max(self.predecessors.capacity().saturating_mul(2));
                let growth = target
                    .saturating_sub(self.predecessors.capacity())
                    .checked_mul(size_of::<HistoryPredecessor>())
                    .ok_or(ExecutionError::Capacity)?;
                let names = incoming
                    .iter()
                    .try_fold(0usize, |n, value| n.checked_add(value.id.capacity()))
                    .ok_or(ExecutionError::Capacity)?;
                self.storage.resize(
                    self.storage
                        .bytes()
                        .checked_add(growth)
                        .and_then(|n| n.checked_add(names))
                        .ok_or(ExecutionError::Capacity)?,
                )?;
                self.predecessors
                    .try_reserve_exact(target.saturating_sub(self.predecessors.len()))
                    .map_err(|_| ExecutionError::Capacity)?;
                self.predecessors.extend(incoming);
                let values = &core.state.reception.received_values.as_ref();
                let mut aliases = core.state.temporal.resident_account_alias_index(
                    &self.actor,
                    values,
                    &core.state.installed.account_law(),
                    budget,
                )?;
                let before = selected.len();
                aliases.expand(&mut selected)?;
                self.phase = if selected.len() == before {
                    HistoryPhase::Records
                } else {
                    HistoryPhase::Closure
                };
                self.add_sources(selected, budget)?;
            }
            HistoryPhase::Records => {
                if response.totals != self.totals || !response.predecessors.is_empty() {
                    return Err(invalid());
                }
                let installed = Arc::clone(&core.state.installed);
                let meaning = installed.account_law();
                for kind in [
                    PersonalSourceKind::Awareness,
                    PersonalSourceKind::Memory,
                    PersonalSourceKind::Summary,
                ] {
                    let rows = response.tables.remove(kind.table()).unwrap_or_default();
                    if rows.iter().any(|row| {
                        row.extra.first().and_then(crate::records::SqlCell::as_str)
                            != Some(self.actor.as_str())
                    }) {
                        return Err(invalid());
                    }
                    core.journal.experience.load_selected_sources(
                        &mut core.state.experience,
                        kind,
                        rows,
                        &meaning,
                        budget,
                    )?;
                }
                let rows = response
                    .tables
                    .remove("activity_occurrences")
                    .unwrap_or_default();
                core.journal
                    .activity
                    .load_selected_occurrences(&mut core.state.activity, rows, budget)
                    .map_err(ExecutionError::Activity)?;
                let rows = response
                    .tables
                    .remove("mind_appraisals")
                    .unwrap_or_default();
                let coverage = response
                    .owners
                    .iter()
                    .find(|owner| owner.table == "mind_appraisals");
                if let Some(coverage) = coverage {
                    core.state.appraisals.load_historical_owner(
                        &self.actor,
                        rows,
                        coverage,
                        budget,
                    )?;
                } else if !rows.is_empty() || core.state.appraisals.owners.contains_key(&self.actor)
                {
                    return Err(invalid());
                }
                for owner in &mut response.owners {
                    let known = core
                        .state
                        .records
                        .coverage(&owner.table, &owner.owner)
                        .ok_or_else(invalid)?;
                    let expected = match owner.table.as_str() {
                        "mind_awareness" => {
                            collection_owner(PersonalSourceKind::Awareness, &self.actor)?
                        }
                        "mind_memories" => {
                            collection_owner(PersonalSourceKind::Memory, &self.actor)?
                        }
                        "mind_summaries" => {
                            collection_owner(PersonalSourceKind::Summary, &self.actor)?
                        }
                        "activity_occurrences" => {
                            json_record(&["world", "actionExperience", "occurrences", &self.actor])
                                .map_err(|_| invalid())?
                        }
                        "mind_appraisals" => json_record(&["world", "appraisals", &self.actor])
                            .map_err(|_| invalid())?,
                        _ => return Err(invalid()),
                    };
                    if owner.owner != expected || !owner.parent_present {
                        return Err(invalid());
                    }
                    owner.complete |= known.complete;
                    owner.next_ordinal = owner.next_ordinal.max(known.next_ordinal);
                }
                self.add_sources(selected, budget)?;
                let names = self
                    .sources
                    .iter()
                    .try_fold(0usize, |n, id| n.checked_add(id.len()))
                    .ok_or(ExecutionError::Capacity)?;
                let storage = budget.reserve(
                    heap_sum([
                        size_of::<ClosedPrivacyScope>(),
                        self.actor.len(),
                        self.generation.len(),
                        names,
                        map_storage::<String, ()>(self.sources.len())
                            .ok_or(ExecutionError::Capacity)?,
                    ])
                    .ok_or(ExecutionError::Capacity)?,
                )?;
                let scope = ClosedPrivacyScope {
                    actor_id: self.actor.clone(),
                    generation: self.generation.clone(),
                    cut: self.cut,
                    identity: self.identity,
                    at: self.at,
                    selected: self.sources.clone(),
                    _storage: storage,
                };
                let selection = super::prepare_privacy_selection(
                    core.state,
                    &self.actor,
                    &self.roots,
                    scope,
                    budget,
                )?;
                let additions = selection
                    .affected
                    .iter()
                    .filter(|id| !self.sources.contains(*id))
                    .cloned()
                    .collect::<Vec<_>>();
                if !additions.is_empty() {
                    self.add_sources(additions, budget)?;
                    self.phase = HistoryPhase::Closure;
                } else {
                    let metadata = core
                        .state
                        .records
                        .prepare_verified_hydration(self.cut, &placements, &response.owners)
                        .map_err(|_| invalid())?;
                    core.state
                        .records
                        .apply_verified_hydration(metadata)
                        .map_err(|_| invalid())?;
                    let bytes = self
                        .predecessors
                        .iter()
                        .try_fold(
                            self.predecessors
                                .capacity()
                                .checked_mul(size_of::<HistoryPredecessor>())
                                .and_then(|n| n.checked_add(size_of::<PreparedPrivacyEdit>()))
                                .ok_or(ExecutionError::Capacity)?,
                            |n, prior| n.checked_add(prior.id.capacity()),
                        )
                        .ok_or(ExecutionError::Capacity)?;
                    let storage = self.storage.split_off(bytes)?;
                    let checkpoint = self.checkpoint.take().ok_or_else(invalid)?;
                    core.journal.keep(core.state, checkpoint)?;
                    self.done = true;
                    return Ok(Some(PreparedPrivacyEdit {
                        selection,
                        predecessors: std::mem::take(&mut self.predecessors),
                        _storage: storage,
                    }));
                }
            }
        }
        let metadata = core
            .state
            .records
            .prepare_verified_hydration(self.cut, &placements, &response.owners)
            .map_err(|_| invalid())?;
        core.state
            .records
            .apply_verified_hydration(metadata)
            .map_err(|_| invalid())?;
        Ok(None)
    }
}
