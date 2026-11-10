//! One read-only preparation owns bounded history, Source text questions and
//! actual native discovery. Its capacity trial is always rolled back.
use super::candidate::{LearningCandidate, LearningMatch};
use super::discovery::{CandidateSlices, LearningSlice};
use super::format::{
    DescriptionEntry, DescriptionRead, LearningFormatAnswer, LearningFormatRequest, LearningTexts,
};
use super::history::{
    LearningHistory, LearningHistoryAnswer, LearningHistoryCursor, LearningHistoryRequest,
};
use super::normalize::{NormalizationRead, NormalizedActivity};
use super::*;
use crate::execution::{CoreMutation, ExecutionError};
use crate::geometry::GeometryBinding;
use crate::host::retained_size::{HeapBytes, map_storage};
use crate::host::{ByteBudget, ByteReservation, CandidateKey};
use crate::language::{CanonicalJsonAnswer, CanonicalJsonRequest};
use crate::records::SqlCell;
use crate::text::JsText;
use indexmap::IndexSet;
use serde_json::value::RawValue;
use std::{mem::size_of, sync::Arc};

pub(crate) enum LearningPreparationAnswer {
    History(LearningHistoryAnswer),
    Format(LearningFormatAnswer),
    Canonical(CanonicalJsonAnswer),
}
pub(crate) enum LearningPreparationStep<'a> {
    History(&'a LearningHistoryRequest),
    Format(&'a LearningFormatRequest),
    Canonical(&'a CanonicalJsonRequest),
    Complete(Arc<PreparedActivityLearning>),
    Context(LearningReadContext),
}
enum Phase {
    History,
    Names,
    Keys,
    Discover,
    Signature,
    Matches,
    MatchSignature,
    Descriptions,
    Complete,
    Context,
}
pub(crate) struct LearningReadContext {
    pub(super) history: LearningHistory,
    pub(super) names: LearningTexts,
    pub(super) manifest: String,
    pub(super) places: Vec<Option<String>>,
    pub(super) storage: ByteReservation,
}
pub(crate) struct PreparedActivityLearning {
    pub(super) history: LearningHistory,
    pub(super) candidates: Vec<LearningCandidate>,
    pub(super) manifest: String,
    pub(super) names: LearningTexts,
    pub(super) places: Vec<Option<String>>,
    pub(super) visited: usize,
    pub(super) incomplete: bool,
    pub(super) examined: Vec<String>,
    pub(super) more: bool,
    pub(super) match_work: usize,
    pub(super) capacity_blocked: bool,
    _storage: ByteReservation,
}
impl Serialize for PreparedActivityLearning {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeStruct;
        let mut o = s.serialize_struct("LearningBatch", 12)?;
        o.serialize_field("candidates", &self.candidates)?;
        o.serialize_field("visited", &self.visited)?;
        o.serialize_field("incomplete", &self.incomplete)?;
        o.serialize_field("examined", &self.examined)?;
        o.serialize_field("more", &self.more)?;
        o.serialize_field("matchWork", &self.match_work)?;
        o.serialize_field("rows", &self.history.rows)?;
        o.serialize_field("through", &self.history.through)?;
        o.serialize_field("generation", &self.history.generation)?;
        o.serialize_field("actorId", &self.history.actor)?;
        o.serialize_field("capacityBlocked", &self.capacity_blocked)?;
        o.serialize_field("physicalLife", &self.history.life)?;
        o.end()
    }
}
pub(crate) struct LearningPreparationCursor {
    phase: Phase,
    context_only: bool,
    history_cursor: Option<LearningHistoryCursor>,
    history: Option<LearningHistory>,
    format: Option<LearningFormatRequest>,
    canonical: Option<CanonicalJsonRequest>,
    names: Option<LearningTexts>,
    manifest: String,
    places: Vec<Option<String>>,
    slices: Option<CandidateSlices>,
    pending_slice: Option<LearningSlice>,
    normalized: Option<NormalizedActivity>,
    candidates: Vec<LearningCandidate>,
    lengths: Vec<usize>,
    match_candidate: usize,
    match_length: usize,
    match_start: usize,
    match_work: usize,
    key: CandidateKey,
    budget: ByteBudget,
    storage: Option<ByteReservation>,
}
impl LearningPreparationCursor {
    pub(crate) fn new(
        core: &mut CoreMutation<'_>,
        actor: &str,
        key: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let storage = budget.reserve(
            size_of::<Self>()
                .checked_add(
                    usize::try_from(core.state.activity.limits.candidates)
                        .map_err(|_| ExecutionError::Capacity)?
                        .checked_mul(size_of::<LearningCandidate>())
                        .ok_or(ExecutionError::Capacity)?,
                )
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(Self {
            phase: Phase::History,
            context_only: false,
            history_cursor: Some(LearningHistoryCursor::new(core, actor, key, budget)?),
            history: None,
            format: None,
            canonical: None,
            names: None,
            manifest: String::new(),
            places: Vec::new(),
            slices: None,
            pending_slice: None,
            normalized: None,
            candidates: Vec::new(),
            lengths: Vec::new(),
            match_candidate: 0,
            match_length: 0,
            match_start: 0,
            match_work: 0,
            key,
            budget: budget.clone(),
            storage: Some(storage),
        })
    }
    pub(super) fn from_history(
        core: &mut CoreMutation<'_>,
        history: LearningHistory,
        key: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let mut value = Self::new(core, &history.actor, key, budget)?;
        value.history_cursor = None;
        value.history = Some(history);
        value.context_only = true;
        value.phase = Phase::Names;
        Ok(value)
    }
    fn binding(&self, core: &mut CoreMutation<'_>) -> Result<GeometryBinding, ExecutionError> {
        Ok(GeometryBinding::new(
            self.key,
            core.state.installed.geometry.spatial.revision,
            core.journal.next_provider_serial()?,
        ))
    }
    fn history(&self) -> Result<&LearningHistory, ExecutionError> {
        self.history.as_ref().ok_or(ExecutionError::Invariant)
    }
    fn normalized(
        &self,
        state: &crate::simulation::SimulationState,
        indices: &[usize],
        incomplete: bool,
    ) -> Result<Option<NormalizedActivity>, ExecutionError> {
        NormalizationRead {
            history: self.history()?,
            language: &state.activity.language,
            limits: &state.activity.limits,
            names: &self.names.as_ref().ok_or(ExecutionError::Invariant)?.texts,
            places: &self.places,
            manifest: &self.manifest,
        }
        .normalize(indices, incomplete, &self.budget)
    }
    fn reserve(&mut self, bytes: usize) -> Result<(), ExecutionError> {
        let held = self.storage.as_mut().ok_or(ExecutionError::Invariant)?;
        held.resize(
            held.bytes()
                .checked_add(bytes)
                .ok_or(ExecutionError::Capacity)?,
        )
        .map_err(Into::into)
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<LearningPreparationAnswer>,
    ) -> Result<LearningPreparationStep<'a>, ExecutionError> {
        if let Some(answer) = answer {
            match (answer, &self.phase) {
                (LearningPreparationAnswer::History(answer), Phase::History) => self
                    .history_cursor
                    .as_mut()
                    .ok_or(ExecutionError::Invariant)?
                    .answer(core.state, answer, &self.budget)?,
                (LearningPreparationAnswer::Format(answer), Phase::Names | Phase::Descriptions) => {
                    let q = self.format.as_ref().ok_or(ExecutionError::Invariant)?;
                    q.validate(&answer)?;
                    let output = self
                        .format
                        .take()
                        .ok_or(ExecutionError::Invariant)?
                        .finish(answer)?;
                    if matches!(self.phase, Phase::Names) {
                        self.names = Some(output);
                        self.phase = Phase::Keys;
                    } else {
                        for (candidate, text) in self.candidates.iter_mut().zip(output.texts) {
                            candidate.description = text.ok_or(ExecutionError::Invariant)?;
                        }
                        self.storage
                            .as_mut()
                            .ok_or(ExecutionError::Invariant)?
                            .merge(output.storage)?;
                        self.phase = Phase::Complete;
                    }
                }
                (
                    LearningPreparationAnswer::Canonical(answer),
                    Phase::Keys | Phase::Signature | Phase::MatchSignature,
                ) => {
                    self.canonical
                        .as_mut()
                        .ok_or(ExecutionError::Invariant)?
                        .validate(&answer)?;
                    let (body, storage) = self
                        .canonical
                        .take()
                        .ok_or(ExecutionError::Invariant)?
                        .finish(answer)?
                        .into_parts();
                    match self.phase {
                        Phase::Keys => {
                            let _decode = self.budget.reserve(
                                body.len()
                                    .checked_add(
                                        self.history()?
                                            .rows
                                            .len()
                                            .checked_add(1)
                                            .and_then(|n| n.checked_mul(size_of::<&RawValue>()))
                                            .ok_or(ExecutionError::Capacity)?,
                                    )
                                    .ok_or(ExecutionError::Capacity)?,
                            )?;
                            let values: Vec<&RawValue> = serde_json::from_str(&body)
                                .map_err(|_| ExecutionError::Invariant)?;
                            if values.len() != self.history()?.rows.len() + 1 {
                                return Err(ExecutionError::Invariant);
                            }
                            self.reserve(
                                body.len()
                                    .checked_add(values.len() * size_of::<Option<String>>())
                                    .ok_or(ExecutionError::Capacity)?,
                            )?;
                            self.manifest = values[0].get().to_owned();
                            self.places = values[1..]
                                .iter()
                                .map(|v| {
                                    if v.get() == "null" {
                                        None
                                    } else {
                                        Some(v.get().to_owned())
                                    }
                                })
                                .collect();
                            drop(storage);
                            if self.context_only {
                                self.phase = Phase::Context;
                            } else {
                                self.slices = Some(CandidateSlices::new(
                                    self.history()?,
                                    &core.state.activity,
                                    &self.budget,
                                )?);
                                self.phase = Phase::Discover;
                            }
                        }
                        Phase::Signature => {
                            let normalized =
                                self.normalized.take().ok_or(ExecutionError::Invariant)?;
                            let slice =
                                self.pending_slice.take().ok_or(ExecutionError::Invariant)?;
                            if let Some(mut candidate) = LearningCandidate::new(
                                normalized,
                                body,
                                storage,
                                slice.indices,
                                slice.incomplete,
                                &core.state.activity,
                                &self.budget,
                            )? {
                                if !candidate
                                    .already_known(&core.state.activity, &self.history()?.actor)
                                    && !self
                                        .candidates
                                        .iter()
                                        .any(|c| c.signature() == candidate.signature())
                                {
                                    self.failures(&mut candidate, core.state)?;
                                    self.candidates.push(candidate);
                                }
                            }
                            self.phase = Phase::Discover;
                        }
                        Phase::MatchSignature => {
                            let normalized =
                                self.normalized.take().ok_or(ExecutionError::Invariant)?;
                            if let Some(method) = core
                                .state
                                .activity
                                .library
                                .methods
                                .values()
                                .find(|m| m.signature() == body)
                            {
                                let candidate = self
                                    .candidates
                                    .get_mut(self.match_candidate)
                                    .ok_or(ExecutionError::Invariant)?;
                                candidate.reserve(
                                    method
                                        .id()
                                        .len()
                                        .checked_add(
                                            normalized
                                                .occurrence_ids
                                                .heap_bytes()
                                                .ok_or(ExecutionError::Capacity)?,
                                        )
                                        .and_then(|n| {
                                            n.checked_add(
                                                size_of::<LearningMatch>()
                                                    * (candidate.matches.capacity() + 2),
                                            )
                                        })
                                        .ok_or(ExecutionError::Capacity)?,
                                )?;
                                candidate.matches.push(LearningMatch {
                                    method_id: method.id().to_owned(),
                                    occurrence_ids: normalized.occurrence_ids,
                                });
                            }
                            self.match_start += 1;
                            self.phase = Phase::Matches;
                        }
                        _ => return Err(ExecutionError::Invariant),
                    }
                }
                _ => return Err(ExecutionError::InvalidCheckpoint),
            }
        }
        loop {
            match self.phase {
                Phase::History => {
                    let ready = self
                        .history_cursor
                        .as_mut()
                        .ok_or(ExecutionError::Invariant)?
                        .request(core, &self.budget)?
                        .is_none();
                    if !ready {
                        return Ok(LearningPreparationStep::History(
                            self.history_cursor
                                .as_mut()
                                .ok_or(ExecutionError::Invariant)?
                                .request(core, &self.budget)?
                                .ok_or(ExecutionError::Invariant)?,
                        ));
                    }
                    self.history = Some(
                        self.history_cursor
                            .take()
                            .ok_or(ExecutionError::Invariant)?
                            .finish()?,
                    );
                    self.phase = Phase::Names;
                }
                Phase::Names => {
                    if self.format.is_none() {
                        let binding = self.binding(core)?;
                        let history = self.history()?;
                        let _slots = self.budget.reserve(
                            history
                                .rows
                                .len()
                                .checked_mul(size_of::<Option<super::format::NameRead<'_>>>())
                                .ok_or(ExecutionError::Capacity)?,
                        )?;
                        #[derive(Serialize)]
                        struct Input<'a> {
                            kind: &'static str,
                            entries: Vec<Option<super::format::NameRead<'a>>>,
                        }
                        let input = Input {
                            kind: "names",
                            entries: history
                                .rows
                                .iter()
                                .map(|r| super::format::name_read(&r.entry, core.state))
                                .collect(),
                        };
                        self.format = Some(LearningFormatRequest::new(
                            binding,
                            (
                                &core.state.installed.content.profile.id,
                                core.state.installed.content.profile.version,
                            ),
                            &input,
                            history.rows.len(),
                            &self.budget,
                        )?);
                    }
                    return Ok(LearningPreparationStep::Format(
                        self.format.as_ref().ok_or(ExecutionError::Invariant)?,
                    ));
                }
                Phase::Keys => {
                    let (manifest, _manifest) =
                        super::format::manifest_shape(core.state, &self.budget)?;
                    let history = self.history()?;
                    let bytes = history.rows.iter().try_fold(
                        history
                            .rows
                            .len()
                            .checked_add(1)
                            .and_then(|n| n.checked_mul(size_of::<SqlCell>()))
                            .ok_or(ExecutionError::Capacity)?,
                        |n, r| {
                            crate::experience::encoded_body_bound(r.entry.command.source_encoding())
                                .ok()
                                .and_then(|b| n.checked_add(b.checked_mul(2)?))
                                .ok_or(ExecutionError::Capacity)
                        },
                    )?;
                    let _projection = self.budget.reserve(bytes)?;
                    let mut values = Vec::with_capacity(history.rows.len() + 1);
                    values.push(manifest);
                    for row in &history.rows {
                        let value: SqlCell =
                            serde_json::from_str(row.entry.command.source_encoding())
                                .map_err(|_| ExecutionError::Invariant)?;
                        values.push(value.get("destination").cloned().unwrap_or(SqlCell::Null));
                    }
                    let binding = self.binding(core)?;
                    self.canonical = Some(CanonicalJsonRequest::prepare(
                        binding,
                        &values,
                        &self.budget,
                    )?);
                    return Ok(LearningPreparationStep::Canonical(
                        self.canonical.as_ref().ok_or(ExecutionError::Invariant)?,
                    ));
                }
                Phase::Discover => {
                    let slice = self.slices.as_mut().ok_or(ExecutionError::Invariant)?.next(
                        self.history.as_ref().ok_or(ExecutionError::Invariant)?,
                        self.candidates.len(),
                    );
                    let Some(slice) = slice else {
                        self.prepare_lengths(core.state)?;
                        self.phase = Phase::Matches;
                        continue;
                    };
                    let Some(normalized) =
                        self.normalized(core.state, &slice.indices, slice.incomplete)?
                    else {
                        continue;
                    };
                    let binding = self.binding(core)?;
                    self.canonical = Some(CanonicalJsonRequest::prepare(
                        binding,
                        &normalized.shape,
                        &self.budget,
                    )?);
                    self.normalized = Some(normalized);
                    self.pending_slice = Some(slice);
                    self.phase = Phase::Signature;
                }
                Phase::Signature | Phase::MatchSignature => {
                    return Ok(LearningPreparationStep::Canonical(
                        self.canonical.as_ref().ok_or(ExecutionError::Invariant)?,
                    ));
                }
                Phase::Matches => {
                    if self.match_candidate >= self.candidates.len() {
                        self.phase = Phase::Descriptions;
                        continue;
                    }
                    let Some(&length) = self.lengths.get(self.match_length) else {
                        self.match_candidate += 1;
                        self.match_length = 0;
                        self.match_start = 0;
                        continue;
                    };
                    if self.match_start + length
                        > self.candidates[self.match_candidate].occurrence_ids.len()
                    {
                        self.match_length += 1;
                        self.match_start = 0;
                        continue;
                    }
                    if self
                        .match_work
                        .checked_add(length)
                        .ok_or(ExecutionError::Capacity)? as u64
                        > core.state.activity.limits.visits
                    {
                        self.candidates[self.match_candidate].matching_deferred = true;
                        self.match_length += 1;
                        self.match_start = 0;
                        continue;
                    }
                    self.match_work += length;
                    let ids = &self.candidates[self.match_candidate].occurrence_ids
                        [self.match_start..self.match_start + length];
                    let _slots = self.budget.reserve(
                        ids.len()
                            .checked_mul(size_of::<usize>())
                            .ok_or(ExecutionError::Capacity)?,
                    )?;
                    let indices = ids
                        .iter()
                        .map(|id| {
                            self.history()?
                                .rows
                                .iter()
                                .position(|r| r.entry.id == *id)
                                .ok_or(ExecutionError::Invariant)
                        })
                        .collect::<Result<Vec<_>, _>>()?;
                    let Some(normalized) = self.normalized(core.state, &indices, false)? else {
                        self.match_start += 1;
                        continue;
                    };
                    let binding = self.binding(core)?;
                    self.canonical = Some(CanonicalJsonRequest::prepare(
                        binding,
                        &normalized.shape,
                        &self.budget,
                    )?);
                    self.normalized = Some(normalized);
                    self.phase = Phase::MatchSignature;
                }
                Phase::Descriptions => {
                    if self.format.is_none() {
                        let _slots = self.budget.reserve(
                            self.candidates
                                .iter()
                                .map(|c| {
                                    c.indices.len() * size_of::<DescriptionEntry<'_>>()
                                        + c.other_evidence.len() * size_of::<&ActivityView>()
                                        + size_of::<DescriptionRead<'_>>()
                                })
                                .sum(),
                        )?;
                        let history = self.history()?;
                        let entries = self
                            .candidates
                            .iter()
                            .map(|c| DescriptionRead {
                                name: c
                                    .method
                                    .get("name")
                                    .and_then(SqlCell::as_text)
                                    .expect("constructed method name"),
                                entries: c
                                    .indices
                                    .iter()
                                    .map(|&at| {
                                        let e = &history.rows[at].entry;
                                        DescriptionEntry {
                                            parent_id: e.parent_id.as_deref(),
                                            parent_name: e.parent_name.as_ref(),
                                            view: &e.view,
                                        }
                                    })
                                    .collect(),
                                incomplete: c.incomplete,
                                failures: c
                                    .other_evidence
                                    .iter()
                                    .filter_map(|id| history.entry(id).map(|r| &r.entry.view))
                                    .collect(),
                            })
                            .collect::<Vec<_>>();
                        #[derive(Serialize)]
                        struct Input<'a> {
                            kind: &'static str,
                            entries: Vec<DescriptionRead<'a>>,
                        }
                        let input = Input {
                            kind: "descriptions",
                            entries,
                        };
                        let binding = GeometryBinding::new(
                            self.key,
                            core.state.installed.geometry.spatial.revision,
                            core.journal.next_provider_serial()?,
                        );
                        self.format = Some(LearningFormatRequest::new(
                            binding,
                            (
                                &core.state.installed.content.profile.id,
                                core.state.installed.content.profile.version,
                            ),
                            &input,
                            self.candidates.len(),
                            &self.budget,
                        )?);
                    }
                    return Ok(LearningPreparationStep::Format(
                        self.format.as_ref().ok_or(ExecutionError::Invariant)?,
                    ));
                }
                Phase::Context => {
                    return Ok(LearningPreparationStep::Context(LearningReadContext {
                        history: self.history.take().ok_or(ExecutionError::Invariant)?,
                        names: self.names.take().ok_or(ExecutionError::Invariant)?,
                        manifest: std::mem::take(&mut self.manifest),
                        places: std::mem::take(&mut self.places),
                        storage: self.storage.take().ok_or(ExecutionError::Invariant)?,
                    }));
                }
                Phase::Complete => {
                    let checkpoint = core.journal.checkpoint(core.state)?;
                    let retained = (|| {
                        let mut blocked = false;
                        for candidate in &self.candidates {
                            if !super::retention::retain(
                                core,
                                self.history()?,
                                candidate,
                                &self.budget,
                            )? {
                                blocked = true;
                            }
                        }
                        Ok::<_, ExecutionError>(blocked)
                    })();
                    core.journal.rollback_to(core.state, checkpoint)?;
                    let blocked = retained?;
                    let history = self.history.take().ok_or(ExecutionError::Invariant)?;
                    let slices = self.slices.take().ok_or(ExecutionError::Invariant)?;
                    let _set = self.budget.reserve(
                        map_storage::<&str, ()>(
                            core.state
                                .activity
                                .learning
                                .get(&history.actor)
                                .map_or(0, |c| c.assessed.len())
                                + self.candidates.len(),
                        )
                        .ok_or(ExecutionError::Capacity)?,
                    )?;
                    let mut assessed: IndexSet<&str> = core
                        .state
                        .activity
                        .learning
                        .get(&history.actor)
                        .into_iter()
                        .flat_map(|c| c.assessed.iter().map(String::as_str))
                        .collect();
                    for candidate in &self.candidates {
                        assessed.insert(candidate.signature());
                    }
                    let capacity_blocked = blocked
                        || assessed.len() as u64 > core.state.activity.limits.assessed
                        || crate::encoding::json_record_len(&assessed)
                            .map_err(|_| ExecutionError::Invariant)?
                            as u64
                            > core.state.activity.limits.assessment_bytes;
                    drop(assessed);
                    let mut storage = self.storage.take().ok_or(ExecutionError::Invariant)?;
                    storage.merge(slices.storage)?;
                    storage.resize(
                        storage
                            .bytes()
                            .checked_add(
                                size_of::<PreparedActivityLearning>() + 2 * size_of::<usize>(),
                            )
                            .ok_or(ExecutionError::Capacity)?,
                    )?;
                    return Ok(LearningPreparationStep::Complete(Arc::new(
                        PreparedActivityLearning {
                            history,
                            candidates: std::mem::take(&mut self.candidates),
                            manifest: std::mem::take(&mut self.manifest),
                            names: self.names.take().ok_or(ExecutionError::Invariant)?,
                            places: std::mem::take(&mut self.places),
                            visited: slices.visited,
                            incomplete: slices.incomplete,
                            examined: slices.examined,
                            more: slices.more,
                            match_work: self.match_work,
                            capacity_blocked,
                            _storage: storage,
                        },
                    )));
                }
            }
        }
    }
    fn failures(
        &self,
        candidate: &mut LearningCandidate,
        state: &crate::simulation::SimulationState,
    ) -> Result<(), ExecutionError> {
        fn target(command: &crate::commands::NativeCommand) -> Option<&str> {
            use crate::commands::NativeCommand::*;
            match command {
                Say { target_id, .. } => target_id.as_deref(),
                StatusEffect { target_id, .. }
                | Follow { target_id, .. }
                | Strike { target_id, .. } => Some(target_id),
                _ => None,
            }
        }
        let history = self.history()?;
        let start = history.rows.len().saturating_sub(
            usize::try_from(state.activity.limits.visits).map_err(|_| ExecutionError::Capacity)?,
        );
        let mut failures = Vec::new();
        let _slots = self
            .budget
            .reserve(history.rows.len() * size_of::<usize>())?;
        for (at, row) in history.rows.iter().enumerate().skip(start) {
            if row.denied
                || row.entry.revoked == Some(true)
                || candidate.indices.contains(&at)
                || row.entry.actor_id != history.actor
            {
                continue;
            }
            if row
                .entry
                .outcome
                .as_ref()
                .is_some_and(|o| !o.ok || state.activity.language.failure_codes.contains(&o.code))
                && target(&row.entry.command).is_some_and(|id| {
                    candidate
                        .indices
                        .iter()
                        .any(|&at| target(&history.rows[at].entry.command) == Some(id))
                })
            {
                failures.push(at);
            }
        }
        let failures = &failures[failures.len().saturating_sub(8)..];
        candidate.reserve(
            failures
                .iter()
                .map(|&at| history.rows[at].entry.id.len() + size_of::<String>())
                .sum(),
        )?;
        candidate.other_evidence = failures
            .iter()
            .map(|&at| history.rows[at].entry.id.clone())
            .collect();
        Ok(())
    }
    fn prepare_lengths(
        &mut self,
        state: &crate::simulation::SimulationState,
    ) -> Result<(), ExecutionError> {
        self.reserve(state.activity.library.methods.len() * size_of::<usize>())?;
        for method in state.activity.library.methods.values() {
            if let Some(children) = method
                .body()
                .get("root")
                .filter(|r| r.get("kind").and_then(SqlCell::as_str) == Some("sequence"))
                .and_then(|r| r.get("children"))
                .and_then(SqlCell::as_array)
            {
                if children.len() >= 2
                    && children
                        .iter()
                        .all(|c| c.get("kind").and_then(SqlCell::as_str) == Some("invoke"))
                    && !self.lengths.contains(&children.len())
                {
                    self.lengths.push(children.len());
                }
            }
        }
        Ok(())
    }
}
