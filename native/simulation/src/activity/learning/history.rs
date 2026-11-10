//! Bounded dependency reads retain original SQL rows and positions. They do
//! not create a second resident action history or advance the learning cursor.
use super::*;
use crate::execution::{CoreMutation, ExecutionError};
use crate::geometry::GeometryBinding;
use crate::host::retained_size::{HeapBytes, map_storage};
use crate::host::{ByteBudget, ByteReservation, CandidateKey};
use crate::records::InstalledRow;
use crate::simulation::SimulationState;
use std::mem::size_of;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct LearningHistoryRequest {
    pub binding: GeometryBinding,
    world_id: String,
    generation: String,
    accepted_cut: u64,
    actor_id: String,
    after: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    ids: Option<Vec<String>>,
    maximum_rows: usize,
    maximum_bytes: usize,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct LearningHistoryAnswer {
    pub binding: GeometryBinding,
    pub rows: Vec<InstalledRow>,
    #[serde(skip)]
    storage: Option<ByteReservation>,
}
impl LearningHistoryAnswer {
    pub(crate) fn decode(
        text: &str,
        budget: &ByteBudget,
    ) -> Result<Self, crate::simulation::DriveError> {
        use crate::simulation::DriveError;
        let storage = crate::install::reserve_typed_parse::<Self>(
            text,
            size_of::<InstalledRow>().max(size_of::<crate::records::SqlCell>()),
            None,
            budget,
        )
        .map_err(|e| match e {
            crate::install::InstallError::Capacity => DriveError::Capacity,
            _ => DriveError::MalformedResponse,
        })?;
        let mut value: Self =
            serde_json::from_str(text).map_err(|_| DriveError::MalformedResponse)?;
        value.storage = Some(storage);
        Ok(value)
    }
}
pub(super) struct LearningRow {
    pub row: InstalledRow,
    pub entry: ActivityOccurrence,
    pub denied: bool,
    pub result_eligible: bool,
    _storage: ByteReservation,
}
impl Serialize for LearningRow {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeStruct;
        let mut out = s.serialize_struct("LearningRow", 2)?;
        // Source rows contain the original occurrence, including its original
        // property order. The denied overlay is used only during discovery.
        let raw: &serde_json::value::RawValue =
            serde_json::from_str(&self.row.payload).map_err(serde::ser::Error::custom)?;
        out.serialize_field("entry", raw)?;
        out.serialize_field("position", &self.row.position)?;
        out.end()
    }
}
impl LearningRow {
    pub(super) fn into_sql(self) -> (InstalledRow, ByteReservation) {
        (self.row, self._storage)
    }
}
pub(super) struct LearningHistory {
    pub rows: Vec<LearningRow>,
    pub through: i64,
    pub actor: String,
    pub world: String,
    pub generation: String,
    pub life: u64,
    pub accepted_cut: u64,
    pub at: f64,
    pub(super) storage: ByteReservation,
}
impl LearningHistory {
    pub fn entry(&self, id: &str) -> Option<&LearningRow> {
        self.rows.iter().find(|row| row.entry.id == id)
    }
}
pub(super) struct LearningHistoryCursor {
    history: Option<LearningHistory>,
    request: Option<LearningHistoryRequest>,
    seen: IndexMap<String, usize>,
    parent: String,
    next: u64,
    pass: usize,
    primary: bool,
    selection_only: bool,
    selected: Option<Vec<String>>,
    candidate: CandidateKey,
    _storage: ByteReservation,
}
impl LearningHistoryCursor {
    pub fn new(
        core: &mut CoreMutation<'_>,
        actor: &str,
        candidate: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let state = &*core.state;
        let life = state
            .physical
            .entities
            .get(actor)
            .and_then(|e| e.actor.as_ref())
            .ok_or(ExecutionError::MissingActor)?
            .physical_life
            .unwrap_or(0);
        let limits = &state.activity.language.preparation;
        let n = limits.rows;
        let bytes = size_of::<Self>()
            .checked_add(
                n.checked_mul(size_of::<LearningRow>())
                    .ok_or(ExecutionError::Capacity)?,
            )
            .and_then(|n| n.checked_add(map_storage::<String, usize>(limits.rows)?))
            .and_then(|n| {
                n.checked_add(
                    (actor.len() + state.physical.header.id.len() + state.generation.len())
                        .checked_mul(3)?,
                )
            })
            .and_then(|n| n.checked_add(256))
            .ok_or(ExecutionError::Capacity)?;
        let storage = budget.reserve(bytes)?;
        let owner = state.activity.collections.get(actor);
        let next = owner.map_or(0, |owner| owner.next_ordinal);
        let parent =
            crate::encoding::json_record(&["world", "actionExperience", "occurrences", actor])
                .map_err(|_| ExecutionError::Invariant)?;
        let history = LearningHistory {
            rows: Vec::with_capacity(n),
            through: state
                .activity
                .learning
                .get(actor)
                .and_then(|c| c.position)
                .unwrap_or(-1),
            actor: actor.to_owned(),
            world: state.physical.header.id.clone(),
            generation: state.generation.clone(),
            life,
            accepted_cut: state.accepted_cut,
            at: state.physical.header.sim_time,
            storage: budget.reserve(0)?,
        };
        Ok(Self {
            history: Some(history),
            request: None,
            seen: IndexMap::with_capacity(n),
            parent,
            next,
            pass: 0,
            primary: true,
            selection_only: false,
            selected: None,
            candidate,
            _storage: storage,
        })
    }
    pub fn selected(
        core: &mut CoreMutation<'_>,
        actor: &str,
        ids: impl Iterator<Item = String>,
        candidate: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let mut cursor = Self::new(core, actor, candidate, budget)?;
        let ids: Vec<String> = ids.collect();
        cursor._storage.resize(
            cursor
                ._storage
                .bytes()
                .checked_add(ids.heap_bytes().ok_or(ExecutionError::Capacity)?)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        cursor.selected = Some(ids);
        cursor.selection_only = true;
        Ok(cursor)
    }
    pub fn request(
        &mut self,
        core: &mut CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<Option<&LearningHistoryRequest>, ExecutionError> {
        if self.request.is_some() {
            return Ok(self.request.as_ref());
        }
        let history = self.history.as_ref().ok_or(ExecutionError::Invariant)?;
        let limits = &core.state.activity.language.preparation;
        let (ids, after, maximum_rows, maximum_bytes) = if self.primary {
            if self.selection_only {
                let ids = self.selected.take().ok_or(ExecutionError::Invariant)?;
                let count = ids.len();
                (Some(ids), -1, count, limits.bytes)
            } else {
                (None, history.through, limits.page, limits.bytes)
            }
        } else {
            if self.selection_only {
                return Ok(None);
            }
            if self.pass >= limits.link_passes || history.rows.len() >= limits.rows {
                return Ok(None);
            }
            let size = crate::encoding::json_record_len(&history.rows)
                .map_err(|_| ExecutionError::Invariant)?;
            let remaining = limits.bytes.saturating_sub(size);
            if remaining == 0 {
                return Ok(None);
            }
            let capacity = limits.rows - history.rows.len();
            let bytes = capacity
                .checked_mul(size_of::<String>())
                .and_then(|n| {
                    n.checked_add(
                        history
                            .rows
                            .iter()
                            .flat_map(|r| &r.entry.connections)
                            .map(|c| c.from.len())
                            .sum::<usize>(),
                    )
                })
                .ok_or(ExecutionError::Capacity)?;
            self._storage.resize(
                self._storage
                    .bytes()
                    .checked_add(bytes)
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let mut ids = Vec::with_capacity(capacity);
            for connection in history.rows.iter().flat_map(|row| &row.entry.connections) {
                if !self.seen.contains_key(&connection.from) && !ids.contains(&connection.from) {
                    ids.push(connection.from.clone());
                    if ids.len() == capacity {
                        break;
                    }
                }
            }
            if ids.is_empty() {
                return Ok(None);
            }
            let rows = ids.len();
            (Some(ids), -1, rows, remaining)
        };
        let binding = GeometryBinding::new(
            self.candidate,
            core.state.installed.geometry.spatial.revision,
            core.journal.next_provider_serial()?,
        );
        let bytes = history.world.len() + history.generation.len() + history.actor.len();
        self._storage.resize(
            self._storage
                .bytes()
                .checked_add(bytes)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        self.request = Some(LearningHistoryRequest {
            binding,
            world_id: history.world.clone(),
            generation: history.generation.clone(),
            accepted_cut: history.accepted_cut,
            actor_id: history.actor.clone(),
            after,
            ids,
            maximum_rows,
            maximum_bytes,
        });
        let _ = budget;
        Ok(self.request.as_ref())
    }
    pub fn answer(
        &mut self,
        state: &SimulationState,
        answer: LearningHistoryAnswer,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let request = self
            .request
            .as_ref()
            .ok_or(ExecutionError::InvalidCheckpoint)?;
        if request.binding != answer.binding || answer.rows.len() > request.maximum_rows {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        let history = self.history.as_mut().ok_or(ExecutionError::Invariant)?;
        let mut added = Vec::with_capacity(answer.rows.len());
        let _slots = budget.reserve(
            answer
                .rows
                .len()
                .checked_mul(size_of::<LearningRow>())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut payload_bytes = 0usize;
        let mut previous = None;
        for row in answer.rows {
            payload_bytes = payload_bytes
                .checked_add(row.payload.len())
                .ok_or(ExecutionError::Capacity)?;
            if payload_bytes > request.maximum_bytes
                || previous.is_some_and(|n| n >= row.position)
                || row.position as i64 <= request.after
            {
                return Err(ExecutionError::InvalidCheckpoint);
            }
            previous = Some(row.position);
            let storage = budget.reserve(
                crate::experience::encoded_body_bound(&row.payload)
                    .map_err(|_| ExecutionError::Capacity)?
                    .checked_add(row.heap_bytes().ok_or(ExecutionError::Capacity)?)
                    .and_then(|n| n.checked_add(row.slot.len()))
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let entry: ActivityOccurrence = serde_json::from_str(&row.payload)
                .map_err(|_| ExecutionError::UnsupportedFamily)?;
            super::super::state::validate_activity_row(
                &row,
                &entry,
                &history.actor,
                &self.parent,
                self.next,
                &state.activity.limits,
                &state.activity.display,
                budget,
            )
            .map_err(ExecutionError::Activity)?;
            if request
                .ids
                .as_ref()
                .is_some_and(|ids| !ids.contains(&entry.id))
                || self.seen.contains_key(&entry.id)
                || added.iter().any(|r: &LearningRow| r.entry.id == entry.id)
            {
                return Err(ExecutionError::InvalidCheckpoint);
            }
            let denied = state.experience.actor(&history.actor).is_some_and(|actor| {
                actor.privacy.is_forgotten(&entry.id)
                    || entry
                        .evidence_ids
                        .iter()
                        .any(|id| actor.privacy.is_forgotten(id))
            });
            let result_eligible = entry.result_evidence.as_ref().map_or(Ok(true), |e| {
                e.recent_eligible(state, &history.actor, budget)
            })?;
            added.push(LearningRow {
                row,
                entry,
                denied,
                result_eligible,
                _storage: storage,
            });
        }
        if self.primary {
            history.through = added
                .last()
                .map_or(history.through, |row| row.row.position as i64);
        } else {
            self.pass += 1;
            if added.is_empty() {
                self.pass = state.activity.language.preparation.link_passes;
            }
            struct Combined<'a>(&'a [LearningRow], &'a [LearningRow]);
            impl Serialize for Combined<'_> {
                fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
                    use serde::ser::SerializeSeq;
                    let mut a = s.serialize_seq(Some(self.0.len() + self.1.len()))?;
                    for row in self.0.iter().chain(self.1) {
                        a.serialize_element(row)?;
                    }
                    a.end()
                }
            }
            if crate::encoding::json_record_len(&Combined(&history.rows, &added))
                .map_err(|_| ExecutionError::Invariant)?
                > state.activity.language.preparation.bytes
            {
                self.pass = state.activity.language.preparation.link_passes;
                added.clear();
            }
        }
        for row in added {
            self.seen.insert(row.entry.id.clone(), history.rows.len());
            history.rows.push(row);
        }
        self.primary = false;
        self.request = None;
        Ok(())
    }
    pub fn finish(mut self) -> Result<LearningHistory, ExecutionError> {
        if self.request.is_some() {
            return Err(ExecutionError::Invariant);
        }
        let mut history = self.history.take().ok_or(ExecutionError::Invariant)?;
        history.rows.sort_by_key(|row| row.row.position);
        history.storage.merge(self._storage)?;
        Ok(history)
    }
}
