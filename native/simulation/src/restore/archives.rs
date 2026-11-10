//! Exact final-reference reads use the staged SQL dependency/retention indexes.
//! No cold personal body is imported or parsed by this owner.
use super::*;
use crate::experience::HistoryPreparationError;
use crate::host::CandidateKey;
use std::sync::Arc;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Binding {
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
impl Binding {
    fn provider_binding(&self, revision: u64) -> crate::geometry::GeometryBinding {
        crate::geometry::GeometryBinding::new(
            CandidateKey {
                id: self.candidate_id,
                base_cut: self.accepted_cut,
                generation: self.candidate_generation,
            },
            revision,
            self.request_serial,
        )
    }
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RestoreArchivesRequest {
    binding: Binding,
    offset: usize,
    archives: Vec<RestoreArchive>,
    maximum_transfer_bytes: usize,
}
pub(crate) struct RestoreArchivesQuestion {
    request: RestoreArchivesRequest,
    _storage: ByteReservation,
}
impl RestoreArchivesQuestion {
    pub(crate) fn value(&self) -> &RestoreArchivesRequest {
        &self.request
    }
    pub(crate) fn provider_binding(&self, revision: u64) -> crate::geometry::GeometryBinding {
        self.request.binding.provider_binding(revision)
    }
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Selected {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    index: u64,
    category: ArchiveCategory,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct RestoreArchivesAnswer {
    binding: Binding,
    selected: Vec<Selected>,
    #[serde(skip)]
    _storage: Option<ByteReservation>,
    #[serde(skip)]
    wire_bytes: usize,
}
impl RestoreArchivesAnswer {
    pub(crate) fn decode(text: &str, budget: &ByteBudget) -> Result<Self, HistoryPreparationError> {
        let storage =
            crate::install::reserve_typed_parse::<Self>(text, size_of::<Selected>(), None, budget)
                .map_err(|error| match error {
                    crate::install::InstallError::Capacity => HistoryPreparationError::Capacity,
                    _ => HistoryPreparationError::MalformedResponse,
                })?;
        let mut answer: Self =
            serde_json::from_str(text).map_err(|_| HistoryPreparationError::MalformedResponse)?;
        answer._storage = Some(storage);
        answer.wire_bytes = text.len();
        Ok(answer)
    }
    pub(crate) fn provider_binding(&self, revision: u64) -> crate::geometry::GeometryBinding {
        self.binding.provider_binding(revision)
    }
}
pub(super) struct Selection {
    pub(super) kept: Vec<Option<ArchiveCategory>>,
}
pub(crate) enum RestoreArchivesStep {
    Question(Arc<RestoreArchivesQuestion>),
    Complete(RestoreMetadataPreparation),
}
pub(crate) struct RestoreArchivesCursor {
    prepared: Option<RestoreMetadataPreparation>,
    key: CandidateKey,
    kept: Vec<Option<ArchiveCategory>>,
    offset: usize,
    pending: Option<Arc<RestoreArchivesQuestion>>,
    storage: Option<ByteReservation>,
}
impl RestoreArchivesCursor {
    pub(crate) fn new(
        core: &CoreMutation<'_>,
        prepared: RestoreMetadataPreparation,
        key: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        if key.base_cut != core.state.accepted_cut {
            return Err(invalid());
        }
        let count = prepared.input.archives.len();
        let bytes = count
            .checked_mul(size_of::<Option<ArchiveCategory>>())
            .and_then(|n| n.checked_add(size_of::<Self>()))
            .ok_or(ExecutionError::Capacity)?;
        let storage = budget.reserve(bytes)?;
        let _unique = budget.reserve(
            map_storage::<(&str, &str, &str, &str), ()>(
                count
                    .checked_mul(2)
                    .and_then(|n| n.checked_add(3))
                    .ok_or(ExecutionError::Capacity)?,
            )
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut seen = indexmap::IndexSet::with_capacity(count);
        let mut kept = vec![None; count];
        for (i, row) in prepared.input.archives.iter().enumerate() {
            if !is_safe_record_id(&row.actor_id)
                || row.id.is_empty()
                || row.revision.is_empty()
                || !matches!(
                    row.kind.as_str(),
                    "awareness" | "memory" | "summary" | "perspective"
                )
                || !seen.insert((
                    row.actor_id.as_str(),
                    row.kind.as_str(),
                    row.id.as_str(),
                    row.revision.as_str(),
                ))
            {
                return Err(invalid());
            }
            if row.kind == "perspective"
                && !core
                    .state
                    .experience
                    .actor(&row.actor_id)
                    .is_some_and(|owner| owner.privacy.is_forgotten(&row.id))
            {
                kept[i] = Some(row.category)
            }
        }
        Ok(Self {
            prepared: Some(prepared),
            key,
            kept,
            offset: 0,
            pending: None,
            storage: Some(storage),
        })
    }
    pub(crate) fn step(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<RestoreArchivesAnswer>,
        budget: &ByteBudget,
    ) -> Result<RestoreArchivesStep, HistoryPreparationError> {
        let prepared = self
            .prepared
            .as_ref()
            .ok_or(HistoryPreparationError::StaleResponse)?;
        if let Some(answer) = answer {
            let question = self
                .pending
                .as_ref()
                .ok_or(HistoryPreparationError::StaleResponse)?;
            let request = &question.request;
            if answer.binding != request.binding
                || core.state.physical.identity.next_id() != request.binding.identity_through
                || core.state.accepted_cut != request.binding.accepted_cut
                || core.state.generation != request.binding.generation
                || core.state.physical.header.id != request.binding.world_id
            {
                return Err(HistoryPreparationError::StaleResponse);
            }
            if answer.wire_bytes > request.maximum_transfer_bytes
                || answer.selected.len() > request.archives.len()
            {
                return Err(HistoryPreparationError::MalformedResponse);
            }
            // Check the complete reply before consuming its pending witness or
            // changing any selected slot, so a malformed reply can be retried.
            for (i, selected) in answer.selected.iter().enumerate() {
                let index = usize::try_from(selected.index)
                    .map_err(|_| HistoryPreparationError::MalformedResponse)?;
                if index < self.offset
                    || index >= self.offset + request.archives.len()
                    || prepared.input.archives[index].kind == "perspective"
                    || answer.selected[..i]
                        .iter()
                        .any(|prior| prior.index == selected.index)
                {
                    return Err(HistoryPreparationError::MalformedResponse);
                }
            }
            for selected in answer.selected {
                self.kept[selected.index as usize] = Some(selected.category)
            }
            self.offset += request.archives.len();
            self.pending = None;
        } else if let Some(question) = &self.pending {
            return Ok(RestoreArchivesStep::Question(Arc::clone(question)));
        }
        loop {
            let prepared = self
                .prepared
                .as_ref()
                .ok_or(HistoryPreparationError::StaleResponse)?;
            if self.offset == prepared.input.archives.len() {
                let mut prepared = self.prepared.take().ok_or(ExecutionError::Invariant)?;
                prepared
                    .storage
                    .merge(self.storage.take().ok_or(ExecutionError::Invariant)?)
                    .map_err(|_| HistoryPreparationError::Capacity)?;
                prepared.selection = Some(Selection {
                    kept: std::mem::take(&mut self.kept),
                });
                return Ok(RestoreArchivesStep::Complete(prepared));
            }
            // This is the same existing source-version SQL query batch, not a
            // history/population policy. Work continues until every key closes.
            let end = prepared
                .input
                .archives
                .len()
                .min(self.offset.saturating_add(256));
            let rows = &prepared.input.archives[self.offset..end];
            if rows.iter().all(|row| row.kind == "perspective") {
                self.offset = end;
                continue;
            }
            let bytes = rows
                .iter()
                .try_fold(
                    size_of::<RestoreArchivesQuestion>()
                        + 2 * size_of::<usize>()
                        + rows.len() * size_of::<RestoreArchive>()
                        + core.state.physical.header.id.len()
                        + core.state.generation.len(),
                    |n, row| n.checked_add(row.heap_bytes()?),
                )
                .ok_or(ExecutionError::Capacity)?;
            let guard = budget
                .reserve(bytes)
                .map_err(|_| HistoryPreparationError::Capacity)?;
            let maximum_transfer_bytes = budget.limit().saturating_sub(budget.used());
            if maximum_transfer_bytes == 0 {
                return Err(HistoryPreparationError::Capacity);
            }
            let request = RestoreArchivesRequest {
                binding: Binding {
                    world_id: core.state.physical.header.id.clone(),
                    generation: core.state.generation.clone(),
                    accepted_cut: core.state.accepted_cut,
                    identity_through: core.state.physical.identity.next_id(),
                    candidate_id: self.key.id,
                    candidate_generation: self.key.generation,
                    request_serial: core.journal.next_provider_serial()?,
                },
                offset: self.offset,
                archives: rows.to_vec(),
                maximum_transfer_bytes,
            };
            let question = Arc::new(RestoreArchivesQuestion {
                request,
                _storage: guard,
            });
            self.pending = Some(Arc::clone(&question));
            return Ok(RestoreArchivesStep::Question(question));
        }
    }
}
