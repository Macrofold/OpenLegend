//! One final source-dependency query precedes row sealing. SQL selects exact
//! old versions; only the existing temporal journal may change their counters.
use super::*;
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::received::SourceVersionPlan;
use crate::records::{ChangedRows, RowEncoder};

const TABLES: [&str; 3] = ["mind_awareness", "mind_memories", "mind_summaries"];
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(in crate::simulation) struct SourceVersionsAnswer {
    pub(super) binding: GeometryBinding,
    plan: SourceVersionPlan,
    #[serde(skip)]
    storage: Option<ByteReservation>,
    #[serde(skip)]
    wire_bytes: usize,
    #[serde(skip)]
    applied: bool,
}
impl SourceVersionsAnswer {
    pub(super) fn decode(text: &str, budget: &ByteBudget) -> Result<Self, DriveError> {
        let storage = crate::install::reserve_typed_parse::<Self>(
            text,
            SourceVersionPlan::array_element_bytes(),
            None,
            budget,
        )
        .map_err(|error| match error {
            crate::install::InstallError::Capacity => DriveError::Capacity,
            _ => DriveError::MalformedResponse,
        })?;
        let mut answer: Self =
            serde_json::from_str(text).map_err(|_| DriveError::MalformedResponse)?;
        answer.storage = Some(storage);
        answer.wire_bytes = text.len();
        Ok(answer)
    }
    pub(crate) fn into_parts(mut self) -> (SourceVersionPlan, ByteReservation) {
        (
            self.plan,
            self.storage.take().expect("funded source-version answer"),
        )
    }
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PrivacyCut<'a> {
    actor_id: &'a str,
    forgotten: &'a [String],
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Request<'a, P: Serialize, A: Serialize> {
    binding: GeometryBinding,
    world_id: &'a str,
    generation: &'a str,
    base_cut: u64,
    cuts: Vec<PrivacyCut<'a>>,
    records: &'a ChangedRows,
    personal_predecessors: P,
    maximum_transfer_bytes: usize,
    #[serde(flatten)]
    restore: Option<RestoreContext<'a, A>>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestoreContext<'a, A: Serialize> {
    restore_projection: &'a ChangedRows,
    archive_baseline: A,
}
pub(in crate::simulation) struct Finalizer {
    pub(in crate::simulation) question: Arc<ProviderQuestion>,
    actors: indexmap::IndexSet<String>,
    maximum_transfer_bytes: usize,
    _storage: ByteReservation,
}
impl Finalizer {
    pub(super) fn prepare(
        core: &CoreMutation<'_>,
        key: crate::host::CandidateKey,
        since: Option<crate::experience::ExperienceCheckpoint>,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, DriveError> {
        Self::prepare_with::<()>(core, key, since, None, 1, budget)
    }
    /// Restoration plans only edits after its genuine post-privacy baseline.
    /// SQL replays that immutable before-view, including its first selected
    /// archives, rather than the candidate's later retention effects.
    pub(in crate::simulation) fn prepare_restore(
        core: &CoreMutation<'_>,
        key: crate::host::CandidateKey,
        since: crate::experience::ExperienceCheckpoint,
        projection: &ChangedRows,
        baseline: &crate::restore::RestoreArchiveBaseline,
        serial: u64,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, DriveError> {
        Self::prepare_with(
            core,
            key,
            Some(since),
            Some(RestoreContext {
                restore_projection: projection,
                archive_baseline: baseline.archives(),
            }),
            serial,
            budget,
        )
    }
    fn prepare_with<A: Serialize>(
        core: &CoreMutation<'_>,
        key: crate::host::CandidateKey,
        since: Option<crate::experience::ExperienceCheckpoint>,
        restore: Option<RestoreContext<'_, A>>,
        serial: u64,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, DriveError> {
        let mut output = RowEncoder::new(&core.state.installed.schema, budget)
            .map_err(|_| DriveError::Encoding)?;
        crate::experience::encode_personal_source_changes(
            &core.state.experience,
            &core.journal.experience,
            since,
            &core.state.records,
            &mut output,
            budget,
        )
        .map_err(|_| DriveError::Encoding)?;
        let (mut records, _owners, _rows_storage) = output
            .finish()
            .map_err(|_| DriveError::Encoding)?
            .into_parts();
        records
            .writes
            .retain(|table, _| TABLES.contains(&table.as_str()));
        records
            .deletes
            .retain(|table, _| TABLES.contains(&table.as_str()));
        records
            .expired
            .retain(|table, _| TABLES.contains(&table.as_str()));
        let count = records
            .writes
            .values()
            .map(Vec::len)
            .sum::<usize>()
            .checked_add(records.deletes.values().map(Vec::len).sum::<usize>())
            .ok_or(DriveError::Capacity)?;
        if count == 0 {
            return Ok(None);
        }
        records.rows = records.writes.values().map(Vec::len).sum();
        let ids = records
            .writes
            .values()
            .flat_map(|rows| rows.iter().map(|row| row.id.as_str()))
            .chain(records.deletes.values().flatten().map(String::as_str));
        let bytes = ids
            .clone()
            .try_fold(0usize, |n, id| n.checked_add(id.len()))
            .and_then(|n| n.checked_mul(4))
            .and_then(|n| {
                heap_sum([
                    n,
                    map_storage::<String, ()>(count)?,
                    count.checked_mul(6 * size_of::<String>() + size_of::<PrivacyCut>())?,
                ])
            })
            .ok_or(DriveError::Capacity)?;
        let mut storage = budget.reserve(bytes).map_err(|_| DriveError::Capacity)?;
        let mut actors = indexmap::IndexSet::new();
        actors
            .try_reserve(count)
            .map_err(|_| DriveError::Capacity)?;
        for table in TABLES {
            for id in records
                .writes
                .get(table)
                .into_iter()
                .flatten()
                .map(|r| r.id.as_str())
                .chain(
                    records
                        .deletes
                        .get(table)
                        .into_iter()
                        .flatten()
                        .map(String::as_str),
                )
            {
                let path: Vec<String> =
                    serde_json::from_str(id).map_err(|_| DriveError::Encoding)?;
                let actor = path
                    .get(if table == "mind_memories" { 2 } else { 3 })
                    .ok_or(DriveError::Encoding)?;
                actors.insert(actor.clone());
            }
        }
        let mut cuts = Vec::new();
        cuts.try_reserve_exact(actors.len())
            .map_err(|_| DriveError::Capacity)?;
        for actor in &actors {
            let history = core
                .state
                .experience
                .actor(actor)
                .ok_or(ExecutionError::Invariant)?;
            cuts.push(PrivacyCut {
                actor_id: actor,
                forgotten: history.privacy.forgotten_ids(),
            });
        }
        let predecessors = crate::experience::capture_personal_predecessors(
            &core.journal.experience,
            since,
            budget,
        )
        .map_err(|_| DriveError::Encoding)?;
        let binding =
            GeometryBinding::new(key, core.state.installed.geometry.spatial.revision, serial);
        let maximum_transfer_bytes = budget.limit();
        let question = ProviderQuestion::prepare(
            ProviderKind::SourceVersions,
            binding,
            &Request {
                binding,
                world_id: &core.state.physical.header.id,
                generation: &core.state.generation,
                base_cut: key.base_cut,
                cuts,
                records: &records,
                personal_predecessors: predecessors.value(),
                maximum_transfer_bytes,
                restore,
            },
            budget,
        )?;
        storage
            .resize(
                actors
                    .heap_bytes()
                    .and_then(|n| n.checked_add(size_of::<Self>()))
                    .ok_or(DriveError::Capacity)?,
            )
            .map_err(|_| DriveError::Capacity)?;
        Ok(Some(Self {
            question,
            actors,
            maximum_transfer_bytes,
            _storage: storage,
        }))
    }
    pub(super) fn finish(
        &self,
        core: &mut CoreMutation<'_>,
        mut answer: SourceVersionsAnswer,
        budget: &ByteBudget,
    ) -> Result<SourceVersionsAnswer, DriveError> {
        self.validate(&answer, budget)?;
        Self::apply(core, &answer, budget)?;
        answer.applied = true;
        Ok(answer)
    }
    /// Validate the same actual plan before accounting changes. Invalid archive
    /// before-images therefore leave the outstanding provider reply retryable.
    pub(in crate::simulation) fn finish_restore(
        &self,
        core: &mut CoreMutation<'_>,
        mut answer: SourceVersionsAnswer,
        baseline: &crate::restore::RestoreArchiveBaseline,
        budget: &ByteBudget,
    ) -> Result<
        (
            SourceVersionsAnswer,
            crate::restore::PreparedRestoreArchives,
        ),
        crate::experience::HistoryPreparationError,
    > {
        self.validate(&answer, budget)?;
        let archives = baseline.prepare_versions(&answer.plan, budget)?;
        Self::apply(core, &answer, budget)?;
        answer.applied = true;
        Ok((answer, archives))
    }
    pub(in crate::simulation) fn reset_restore(
        core: &mut CoreMutation<'_>,
        answer: &mut SourceVersionsAnswer,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        if !answer.applied {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        crate::received::reset_source_version_plan(
            &mut core.state.temporal,
            &answer.plan,
            core.state.physical.header.sim_time,
            &core.state.installed.attention.value().retention,
            budget,
        )?;
        answer.applied = false;
        Ok(())
    }
    fn validate(
        &self,
        answer: &SourceVersionsAnswer,
        budget: &ByteBudget,
    ) -> Result<(), crate::experience::HistoryPreparationError> {
        if answer.applied {
            return Err(crate::experience::HistoryPreparationError::StaleResponse);
        }
        if answer.wire_bytes > self.maximum_transfer_bytes {
            return Err(crate::experience::HistoryPreparationError::MalformedResponse);
        }
        answer.plan.validate_actors(&self.actors, budget)
    }
    fn apply(
        core: &mut CoreMutation<'_>,
        answer: &SourceVersionsAnswer,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        crate::received::apply_source_version_plan(
            &mut core.state.temporal,
            &answer.plan,
            core.state.physical.header.sim_time,
            &core.state.installed.attention.value().retention,
            budget,
        )
        .map_err(ExecutionError::from)
    }
}
