//! Explicit inspection describes committed personal evidence and finite
//! acquisitions. It never retries an action or turns old bindings into offers.

use super::*;
use crate::execution::ExecutionError;
use crate::host::{ByteBudget, ByteReservation};
use crate::records::{InstalledRow, SqlCell};
use crate::simulation::SimulationState;
use std::{mem::size_of, sync::LazyLock};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct InspectionCopy<'a> {
    pub event: &'a str,
    pub chosen: &'a str,
    pub details: &'a str,
    pub bad_page: &'a str,
    pub accepted: &'a str,
    pub next_history: &'a str,
    pub next_methods: &'a str,
}

pub(crate) static COPY: LazyLock<InspectionCopy<'static>> = LazyLock::new(|| {
    #[derive(Deserialize)]
    struct Copy<'a> {
        #[serde(borrow)]
        inspection: InspectionCopy<'a>,
    }
    serde_json::from_str::<Copy>(include_str!(
        "../../../../packages/domain/src/activity-learning-copy.json"
    ))
    .expect("repository-owned activity inspection wording")
    .inspection
});

pub(crate) const INSPECTION_ROWS: usize = 16;
const INSPECTION_BYTES: usize = 16_384;
const METHODS_PER_PAGE: usize = 4;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeActivityPage<'a> {
    pub world_id: &'a str,
    pub generation: &'a str,
    learning_status: &'static str,
    entries: Vec<InspectionEntry>,
    next: Option<i64>,
    methods: Vec<InspectionMethod>,
    method_next: Option<usize>,
    #[serde(skip)]
    recent_entries: u32,
    #[serde(skip)]
    _storage: ByteReservation,
}

#[derive(Serialize)]
struct InspectionEntry {
    at: f64,
    status: ActivityStatus,
    text: JsText,
}

#[derive(Serialize)]
struct InspectionMethod {
    name: JsText,
    status: &'static str,
    text: JsText,
}

/// Compact text for a resident's exact selected inspection trigger. The
/// player endpoint uses the same rows, result receipts and method formatter.
pub struct RuntimeActivityDecisionPage {
    entries: Vec<InspectionEntry>,
    methods: Vec<InspectionMethod>,
    navigation: ActivityInspectionNavigation,
    pub(crate) recent_entries: u32,
    storage: ByteReservation,
}

#[derive(Clone, Copy)]
pub struct ActivityInspectionNavigation {
    pub(crate) after: i64,
    pub(crate) method_after: u64,
    pub(crate) next: Option<i64>,
    pub(crate) method_next: Option<usize>,
}

impl RuntimeActivityDecisionPage {
    pub fn navigation(&self) -> ActivityInspectionNavigation {
        self.navigation
    }
    pub fn action_texts(&self) -> impl Iterator<Item = &JsText> {
        self.entries.iter().map(|entry| &entry.text)
    }
    pub fn method_texts(&self) -> impl Iterator<Item = (&JsText, &'static str)> {
        self.methods
            .iter()
            .map(|method| (&method.text, method.status))
    }
    pub fn admitted_bytes(&self) -> usize {
        self.storage.bytes()
    }
}

impl RuntimeActivityPage<'_> {
    pub(crate) fn into_decision(
        self,
        after: i64,
        method_after: u64,
    ) -> RuntimeActivityDecisionPage {
        RuntimeActivityDecisionPage {
            entries: self.entries,
            methods: self.methods,
            navigation: ActivityInspectionNavigation {
                after,
                method_after,
                next: self.next,
                method_next: self.method_next,
            },
            recent_entries: self.recent_entries,
            storage: self._storage,
        }
    }
}

pub(crate) struct ActivityInspection {
    entries: Vec<(i64, ActivityOccurrence)>,
    after: i64,
    next_ordinal: u64,
    _storage: ByteReservation,
}

pub(crate) fn ordinal(state: &SimulationState, actor: &str) -> u64 {
    state
        .activity
        .collections
        .get(actor)
        .map_or(0, |owner| owner.next_ordinal)
}

/// Acquisitions append and retain revoked supports in place. A new row can
/// shift a method page; edits to existing support are fenced by actor privacy.
pub(crate) fn acquisition_count(state: &SimulationState, actor: &str) -> usize {
    state
        .activity
        .library
        .acquisitions
        .get(actor)
        .map_or(0, indexmap::IndexMap::len)
}

fn projection(error: ActivityError) -> ExecutionError {
    ExecutionError::Activity(error)
}

impl ActivityInspection {
    pub(crate) fn recent_still_eligible(
        &self,
        state: &SimulationState,
        actor: &str,
        selected: u32,
        budget: &ByteBudget,
    ) -> Result<bool, ExecutionError> {
        for (index, (_, entry)) in self.entries.iter().enumerate() {
            if (selected & (1 << index)) != 0
                && !entry
                    .result_evidence
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?
                    .recent_eligible(state, actor, budget)?
            {
                return Ok(false);
            }
        }
        Ok(true)
    }

    pub(crate) fn prepare(
        state: &SimulationState,
        actor: &str,
        after: i64,
        next_ordinal: u64,
        rows: Vec<InstalledRow>,
        _rows_storage: ByteReservation,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        if rows.len() > INSPECTION_ROWS {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        let mut storage = budget.reserve(
            crate::encoding::json_record_len(&["world", "actionExperience", "occurrences", actor])
                .map_err(|_| ExecutionError::Invariant)?
                + size_of::<(i64, ActivityOccurrence)>() * rows.len(),
        )?;
        let parent =
            crate::encoding::json_record(&["world", "actionExperience", "occurrences", actor])
                .map_err(|_| ExecutionError::Invariant)?;
        let mut entries = Vec::with_capacity(rows.len());
        let mut previous = after;
        for row in rows {
            let position =
                i64::try_from(row.position).map_err(|_| ExecutionError::InvalidCheckpoint)?;
            if position <= previous {
                return Err(ExecutionError::InvalidCheckpoint);
            }
            previous = position;
            grow(
                &mut storage,
                crate::experience::encoded_body_bound(&row.payload)
                    .map_err(|_| ExecutionError::Capacity)?,
            )?;
            let entry: ActivityOccurrence = serde_json::from_str(&row.payload)
                .map_err(|_| ExecutionError::InvalidCheckpoint)?;
            state::validate_activity_row(
                &row,
                &entry,
                actor,
                &parent,
                next_ordinal,
                &state.activity.limits,
                &state.activity.display,
                budget,
            )
            .map_err(projection)?;
            entries.push((position, entry));
        }
        Ok(Self {
            entries,
            after,
            next_ordinal,
            _storage: storage,
        })
    }

    pub(crate) fn recent_receipts(
        &self,
        state: &SimulationState,
        actor: &str,
        budget: &ByteBudget,
    ) -> Result<(Vec<crate::capture::NpcReceiptSelection>, ByteReservation), ExecutionError> {
        let mut storage = budget
            .reserve(self.entries.len() * size_of::<crate::capture::NpcReceiptSelection>())?;
        let mut receipts =
            Vec::<crate::capture::NpcReceiptSelection>::with_capacity(self.entries.len());
        for (_, entry) in &self.entries {
            let Some(source @ ResultEvidence::Recent { receipt, .. }) = &entry.result_evidence
            else {
                continue;
            };
            if !denied(state, actor, entry)
                && source.recent_eligible(state, actor, budget)?
                && !receipts.iter().any(|item| item.locator == *receipt)
            {
                grow(&mut storage, receipt.actor_id.len() + receipt.epoch.len())?;
                receipts.push(crate::capture::NpcReceiptSelection {
                    locator: receipt.clone(),
                    member_indices: None,
                });
            }
        }
        Ok((receipts, storage))
    }

    pub(crate) fn page<'a>(
        &self,
        state: &'a SimulationState,
        actor: &str,
        method_after: usize,
        recent: impl Fn(&ResultEvidence) -> Result<Option<JsText>, ExecutionError>,
        budget: &ByteBudget,
    ) -> Result<RuntimeActivityPage<'a>, ExecutionError> {
        let mut storage = budget.reserve(
            // Exact JS text can retain an additional escaped JSON backing
            // when it contains isolated UTF-16, NUL or escaped text.
            2 * INSPECTION_BYTES * 16
                + self.entries.len() * size_of::<InspectionEntry>()
                + METHODS_PER_PAGE * size_of::<InspectionMethod>(),
        )?;
        let mut entries = Vec::with_capacity(self.entries.len());
        let mut bytes = 0;
        let mut through = self.after;
        let mut remaining = false;
        let mut recent_entries = 0;
        for (index, (position, entry)) in self.entries.iter().enumerate() {
            if denied(state, actor, entry) {
                through = *position;
                continue;
            }
            let text = match &entry.result_evidence {
                Some(source @ ResultEvidence::Recent { .. }) => {
                    let value = source
                        .recent_eligible(state, actor, budget)?
                        .then(|| recent(source))
                        .transpose()?
                        .flatten();
                    let Some(value) = value else {
                        through = *position;
                        continue;
                    };
                    value
                }
                _ => render_entry(entry, &state.activity.display, budget)?,
            };
            if bytes + text.utf8_len() > INSPECTION_BYTES {
                if entries.is_empty() {
                    return Err(ExecutionError::Capacity);
                }
                remaining = true;
                break;
            }
            if matches!(entry.result_evidence, Some(ResultEvidence::Recent { .. })) {
                recent_entries |= 1 << index;
            }
            bytes += text.utf8_len();
            entries.push(InspectionEntry {
                at: entry.at,
                status: entry.status,
                text,
            });
            through = *position;
        }
        remaining |= self.entries.len() == INSPECTION_ROWS
            && (through as i128 + 1) < i128::from(self.next_ordinal);
        let mut methods = Vec::with_capacity(METHODS_PER_PAGE);
        let mut method_bytes = 0;
        let mut method_next = None;
        let mut index = 0;
        learning::visit_current(state, actor, budget, |method, acquisition| {
            let at = index;
            index += 1;
            if at < method_after || method_next.is_some() {
                return Ok(());
            }
            if methods.len() == METHODS_PER_PAGE {
                method_next = Some(at);
                return Ok(());
            }
            let body = method.body();
            let name = field_text(body, "name")?;
            let bindings = acquisition
                .body()
                .get("bindings")
                .ok_or(ExecutionError::Invariant)?;
            let text = render_method(
                body,
                bindings,
                state,
                super::LEARNED_ACTIVITY_COPY.label,
                budget,
            )?;
            if method_bytes + text.utf8_len() > INSPECTION_BYTES {
                method_next = Some(at);
                return Ok(());
            }
            method_bytes += text.utf8_len();
            grow(&mut storage, name.storage_bytes())?;
            methods.push(InspectionMethod {
                name: name.clone(),
                status: if body.get("executable").and_then(SqlCell::as_bool) == Some(true) {
                    "Tentative, learned from my own attempts; current bindings may need revision"
                } else {
                    "Incomplete idea; cannot execute"
                },
                text,
            });
            Ok(())
        })?;
        let retained = entries.capacity() * size_of::<InspectionEntry>()
            + methods.capacity() * size_of::<InspectionMethod>()
            + entries
                .iter()
                .map(|entry| entry.text.storage_bytes())
                .sum::<usize>()
            + methods
                .iter()
                .map(|entry| entry.text.storage_bytes() + entry.name.storage_bytes())
                .sum::<usize>();
        storage.resize(retained)?;
        Ok(RuntimeActivityPage {
            world_id: &state.physical.header.id,
            generation: &state.generation,
            learning_status: if state
                .activity
                .learning
                .get(actor)
                .is_some_and(|cursor| !cursor.pending.is_empty())
            {
                "Learning from completed actions is pending. It requires safe idle time, available storage, and an authorized model budget."
            } else {
                "No completed actions are waiting for learning."
            },
            entries,
            next: remaining.then_some(through),
            methods,
            method_next,
            recent_entries,
            _storage: storage,
        })
    }
}

fn denied(state: &SimulationState, actor: &str, entry: &ActivityOccurrence) -> bool {
    entry.revoked == Some(true)
        || state.experience.actor(actor).is_some_and(|history| {
            history.privacy.is_forgotten(&entry.id)
                || entry
                    .evidence_ids
                    .iter()
                    .any(|id| history.privacy.is_forgotten(id))
        })
}

fn render_entry(
    entry: &ActivityOccurrence,
    limits: &ActivityDisplayLimits,
    budget: &ByteBudget,
) -> Result<JsText, ExecutionError> {
    use crate::host::retained_size::HeapBytes;
    let _workspace = budget.reserve(
        entry
            .view
            .heap_bytes()
            .and_then(|n| {
                n.checked_add(entry.parent_name.as_ref().map_or(0, JsText::storage_bytes))
            })
            .and_then(|n| n.checked_mul(12))
            .and_then(|n| n.checked_add(4096))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let parent = entry
        .parent_name
        .as_ref()
        .filter(|name| **name != entry.view.name);
    let wrapped = parent.map(|name| ActivityView {
        name: name.clone(),
        facts: vec![fact("recorded part", "This is one performed part of the chosen activity, not a claim that all of it finished".into())],
        actor: None, target: None, tool: None, children: Some(vec![entry.view.clone()]), result: None,
    });
    project_activity(
        wrapped.as_ref().unwrap_or(&entry.view),
        Some("What happened"),
        limits,
        limits.display_bytes,
        limits.depth,
    )
    .map(|value| value.text)
    .map_err(projection)
}

fn field_text<'a>(owner: &'a SqlCell, name: &str) -> Result<&'a JsText, ExecutionError> {
    owner
        .get(name)
        .and_then(SqlCell::as_text)
        .ok_or(ExecutionError::Invariant)
}

fn field<'a>(owner: &'a SqlCell, name: &str) -> Result<&'a str, ExecutionError> {
    owner
        .get(name)
        .and_then(SqlCell::as_str)
        .ok_or(ExecutionError::Invariant)
}

fn fact(name: &str, value: JsText) -> ActivityFact {
    ActivityFact {
        name: name.into(),
        value: ActivityDetail::Scalar(ActivityScalar::String(value)),
        critical: true,
        sentence: None,
    }
}

fn item_name(
    state: &SimulationState,
    id: &str,
    fallback: &'static str,
    budget: &ByteBudget,
) -> Result<JsText, ExecutionError> {
    let Some(raw) = state.installed.retained.item_definitions.get(id) else {
        return Ok(fallback.into());
    };
    let _storage = budget.reserve(
        crate::experience::encoded_body_bound(raw).map_err(|_| ExecutionError::Capacity)?,
    )?;
    let definition: SqlCell = serde_json::from_str(raw).map_err(|_| ExecutionError::Invariant)?;
    Ok(field_text(&definition, "name")?.clone())
}

/// The installed learned format admits a sequence of named native steps.
/// Display past output and future dependencies without granting live roles.
pub(in crate::activity) fn render_method(
    body: &SqlCell,
    bindings: &SqlCell,
    state: &SimulationState,
    title: &str,
    budget: &ByteBudget,
) -> Result<JsText, ExecutionError> {
    use crate::host::retained_size::HeapBytes;
    let _workspace = budget.reserve(
        body.heap_bytes()
            .and_then(|n| n.checked_add(bindings.heap_bytes()?))
            .and_then(|n| n.checked_mul(12))
            .and_then(|n| n.checked_add(4096))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let steps = body
        .get("root")
        .and_then(|root| root.get("children"))
        .and_then(SqlCell::as_array)
        .ok_or(ExecutionError::Invariant)?;
    let mut children = Vec::with_capacity(steps.len());
    let mut products = IndexMap::new();
    for step in steps {
        let args = step
            .get("args")
            .and_then(SqlCell::as_object)
            .ok_or(ExecutionError::Invariant)?;
        let mut view = method_step(state, step, args.get("text"), bindings)?;
        let facts = &mut view.facts;
        for arg in args.values() {
            if let Some(output) = arg.get("output").and_then(SqlCell::as_str) {
                let port = field(arg, "port")?;
                let id = products
                    .get(&(output, port))
                    .copied()
                    .ok_or(ExecutionError::Invariant)?;
                let count = arg
                    .get("quantity")
                    .and_then(SqlCell::as_u64)
                    .ok_or(ExecutionError::Invariant)?;
                let mut value = JsText::from(format!("Requires {count} "));
                value.push_text(&item_name(state, id, "of an earlier result", budget)?);
                value.push_str(" actually produced by earlier work; it is not owned yet");
                facts.push(fact("later requirement", value));
            }
        }
        let step_key = field(step, "key")?;
        for output in step
            .get("outputs")
            .and_then(SqlCell::as_array)
            .into_iter()
            .flatten()
        {
            let id = field(output, "definitionId")?;
            products.insert((step_key, field(output, "port")?), id);
            let count = output
                .get("quantity")
                .and_then(SqlCell::as_u64)
                .ok_or(ExecutionError::Invariant)?;
            let mut value = JsText::from(format!("My earlier attempt produced {count} "));
            value.push_text(&item_name(state, id, "items", budget)?);
            value.push_str("; this attempt may fail or produce less");
            facts.push(fact("previous result", value));
        }
        children.push(view);
    }
    let root = ActivityView {
        name: field_text(body, "name")?.clone(),
        facts: Vec::new(),
        actor: None,
        target: None,
        tool: None,
        children: Some(children),
        result: None,
    };
    let limits = &state.activity.display;
    project_activity(
        &root,
        Some(title),
        limits,
        limits.display_bytes,
        limits.depth,
    )
    .map(|value| value.text)
    .map_err(projection)
}

fn method_step(
    state: &SimulationState,
    step: &SqlCell,
    text: Option<&SqlCell>,
    bindings: &SqlCell,
) -> Result<ActivityView, ExecutionError> {
    let name = field_text(step, "name")?.clone();
    if field(step, "command")? == "say" {
        let role = text
            .and_then(|arg| arg.get("role"))
            .and_then(SqlCell::as_str)
            .ok_or(ExecutionError::Invariant)?;
        let words = bindings
            .get(role)
            .and_then(SqlCell::as_text)
            .ok_or(ExecutionError::Invariant)?;
        return learned_speech_view(state, &name, words);
    }
    Ok(ActivityView {
        name,
        facts: Vec::new(),
        actor: None,
        target: None,
        tool: None,
        children: None,
        result: None,
    })
}

/// Use the installed ordinary speech description for a learned leaf. The
/// caller owns current source permissions and has already funded its size.
pub(crate) fn learned_speech_view(
    state: &SimulationState,
    name: &JsText,
    words: &JsText,
) -> Result<ActivityView, ExecutionError> {
    use crate::worlds::activity_display::{OrdinaryAction, format};
    let profile = &state.installed.content.profile;
    let mut view = format(
        (&profile.id, profile.version),
        OrdinaryAction::Say(words.clone()),
        None,
        None,
        None,
        None,
    )
    .ok_or(ExecutionError::UnsupportedFamily)?;
    view.name = name.clone();
    Ok(view)
}

fn grow(owner: &mut ByteReservation, bytes: usize) -> Result<(), ExecutionError> {
    owner.resize(
        owner
            .bytes()
            .checked_add(bytes)
            .ok_or(ExecutionError::Capacity)?,
    )?;
    Ok(())
}
