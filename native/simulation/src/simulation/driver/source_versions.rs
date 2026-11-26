//! One final source-dependency query precedes row sealing. SQL selects exact
//! old versions; only the existing temporal journal may change their counters.
use super::*;
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::received::SourceVersionPlan;
use crate::records::{ChangedRows, RowEncoder};
use crate::experience::{PersonalPredecessors, PersonalSourceRecord};

const TABLES: [&str; 3] = ["mind_awareness", "mind_memories", "mind_summaries"];
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct SourceVersionsAnswer {
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
    pub(crate) fn adopt(
        binding: GeometryBinding,
        plan: SourceVersionPlan,
        maximum: usize,
        mut storage: ByteReservation,
    ) -> Result<Self, DriveError> {
        #[derive(Serialize)]
        struct Reply<'a> {
            binding: GeometryBinding,
            plan: &'a SourceVersionPlan,
        }
        // Count the same finite reply envelope for its existing transfer limit.
        // The stand-alone path never creates the corresponding JSON string.
        let wire_bytes = crate::encoding::json_record_len(&Reply { binding, plan: &plan })
            .map_err(|_| DriveError::Encoding)?;
        if wire_bytes > maximum {
            return Err(DriveError::Capacity);
        }
        storage.resize(plan.heap_bytes().and_then(|n| n.checked_add(size_of::<Self>()))
            .ok_or(DriveError::Capacity)?).map_err(|_| DriveError::Capacity)?;
        Ok(Self { binding, plan, storage: Some(storage), wire_bytes, applied: false })
    }

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
struct PrivacyCut {
    actor_id: String,
    forgotten: Vec<String>,
}

/// Immutable inputs to the exact version lookup. Canonical row payloads remain
/// in their funded record owners. Recovery shares its already packed SQL view.
pub struct SourceVersionsRequest {
    pub binding: GeometryBinding,
    pub world_id: String,
    pub generation: String,
    cuts: Vec<PrivacyCut>,
    pub records: ChangedRows,
    predecessors: PersonalPredecessors,
    pub maximum_transfer_bytes: usize,
    restore: Option<RestoreContext>,
    _storage: ByteReservation,
    _rows: ByteReservation,
}

struct RestoreContext {
    projection: Arc<crate::simulation::restore::RestoreReadProjection>,
    baseline: Arc<crate::restore::RestoreArchiveBaseline>,
}

impl SourceVersionsRequest {
    pub fn forgotten(&self) -> impl ExactSizeIterator<Item = (&str, &[String])> {
        self.cuts.iter().map(|cut| (cut.actor_id.as_str(), cut.forgotten.as_slice()))
    }

    pub fn predecessors(&self) -> &[Arc<PersonalSourceRecord>] {
        self.predecessors.records()
    }

    pub fn restore(&self) -> Option<(&ChangedRows, crate::restore::RestoreArchiveSelection<'_>)> {
        self.restore.as_ref().map(|restore| (&restore.projection.changes, restore.baseline.archives()))
    }
}

impl Serialize for SourceVersionsRequest {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeStruct;
        let mut row = serializer.serialize_struct("SourceVersionsRequest", if self.restore.is_some() { 10 } else { 8 })?;
        row.serialize_field("binding", &self.binding)?;
        row.serialize_field("worldId", &self.world_id)?;
        row.serialize_field("generation", &self.generation)?;
        row.serialize_field("baseCut", &self.binding.base_cut)?;
        row.serialize_field("cuts", &self.cuts)?;
        row.serialize_field("records", &self.records)?;
        row.serialize_field("personalPredecessors", &self.predecessors.value())?;
        row.serialize_field("maximumTransferBytes", &self.maximum_transfer_bytes)?;
        if let Some((projection, archive_baseline)) = self.restore() {
            row.serialize_field("restoreProjection", projection)?;
            row.serialize_field("archiveBaseline", &archive_baseline)?;
        }
        row.end()
    }
}
fn needs_no_source_versions(records: &ChangedRows, schema: &crate::records::RecordSchema) -> bool {
    records.deletes.is_empty()
        && records.expired.is_empty()
        && records.writes.iter().all(|(name, rows)| {
            let metadata = schema.layout(name).ok().and_then(|layout| {
                layout
                    .columns
                    .iter()
                    .position(|column| column == "retention_metadata")
            });
            metadata.is_some_and(|metadata| {
                rows.iter().all(|row| {
                    row.create
                        && row.extra.get(metadata).is_some_and(|value| {
                            ["versions", "learning"].into_iter().all(|field| {
                                value
                                    .get(field)
                                    .and_then(|value| value.as_array())
                                    .is_some_and(<[_]>::is_empty)
                            })
                        })
                })
            })
        })
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
        Self::prepare_with(core, key, since, None, 1, budget)
    }
    /// Restoration plans only edits after its genuine post-privacy baseline.
    /// SQL replays that immutable before-view, including its first selected
    /// archives, rather than the candidate's later retention effects.
    pub(in crate::simulation) fn prepare_restore(
        core: &CoreMutation<'_>,
        key: crate::host::CandidateKey,
        since: crate::experience::ExperienceCheckpoint,
        projection: &Arc<crate::simulation::restore::RestoreReadProjection>,
        baseline: &Arc<crate::restore::RestoreArchiveBaseline>,
        serial: u64,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, DriveError> {
        Self::prepare_with(
            core,
            key,
            Some(since),
            Some(RestoreContext {
                projection: Arc::clone(projection),
                baseline: Arc::clone(baseline),
            }),
            serial,
            budget,
        )
    }
    fn prepare_with(
        core: &CoreMutation<'_>,
        key: crate::host::CandidateKey,
        since: Option<crate::experience::ExperienceCheckpoint>,
        restore: Option<RestoreContext>,
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
        let (mut records, _owners, rows_storage) = output
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
        let predecessors = crate::experience::capture_personal_predecessors(
            &core.journal.experience,
            since,
            budget,
        )
        .map_err(|_| DriveError::Encoding)?;
        // The shared Source planner selects versions only from old bodies,
        // prior/next version references, and personal learning aliases. An
        // exact append with none of those inputs has no affected key to query.
        // docs/save-and-load.md#current-personal-evidence-continuation
        if restore.is_none()
            && predecessors.records().is_empty()
            && needs_no_source_versions(&records, &core.state.installed.schema)
        {
            return Ok(None);
        }

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
        let scope = &core.state.physical.header.id;
        let generation = &core.state.generation;
        let request_bytes = actors.iter().try_fold(
            size_of::<SourceVersionsRequest>() + 2 * size_of::<usize>() + scope.len() + generation.len(),
            |bytes, actor| {
                let ids = core.state.experience.actor(actor)?.privacy.forgotten_ids();
                let names = ids.iter().try_fold(actor.len(), |n, id| n.checked_add(id.len()))?;
                bytes.checked_add(size_of::<PrivacyCut>())?
                    .checked_add(names)?
                    .checked_add(ids.len().checked_mul(size_of::<String>())?)
            },
        ).ok_or(DriveError::Capacity)?;
        let request_storage = budget.reserve(request_bytes).map_err(|_| DriveError::Capacity)?;
        let mut cuts = Vec::new();
        cuts.try_reserve_exact(actors.len()).map_err(|_| DriveError::Capacity)?;
        for actor in &actors {
            let history = core.state.experience.actor(actor).ok_or(ExecutionError::Invariant)?;
            let ids = history.privacy.forgotten_ids();
            let mut forgotten = Vec::new();
            forgotten.try_reserve_exact(ids.len()).map_err(|_| DriveError::Capacity)?;
            forgotten.extend(ids.iter().cloned());
            cuts.push(PrivacyCut { actor_id: actor.clone(), forgotten });
        }
        let binding = GeometryBinding::new(key, core.state.geometry_revision(), serial);
        let maximum_transfer_bytes = budget.limit();
        let question = ProviderQuestion::prepare_bound(
            ProviderKind::SourceVersions,
            binding,
            QuestionBody::SourceVersions(Arc::new(SourceVersionsRequest {
                binding,
                world_id: scope.clone(),
                generation: generation.clone(),
                cuts,
                records,
                predecessors,
                maximum_transfer_bytes,
                restore,
                _storage: request_storage,
                _rows: rows_storage,
            })),
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
