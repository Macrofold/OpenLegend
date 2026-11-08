//! The action-history writer. A result remains an unfinished continuation until
//! the personal-history owner proves its real receipt/account acquisition.

use super::*;
use crate::commands::{NativeCommand, Outcome};
use crate::experience::AcquiredActivityResult;
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::state::EntityStore;
use std::collections::{BTreeMap, BTreeSet};
use std::mem::size_of;

#[derive(Clone, Copy)]
pub(crate) struct ActivityCheckpoint {
    at: usize,
}
pub(crate) struct PendingActivityResult {
    actor_id: String,
    occurrence_id: String,
}
impl PendingActivityResult {
    pub(crate) fn occurrence<'a>(
        &self,
        state: &'a ActivityState,
    ) -> Result<&'a ActivityOccurrence, ActivityError> {
        state
            .collections
            .get(&self.actor_id)
            .ok_or(ActivityError::InvalidStructure)?
            .get(&self.occurrence_id)?
            .map(|r| &r.occurrence)
            .ok_or(ActivityError::InvalidStructure)
    }
    pub(crate) fn actor_id(&self) -> &str {
        &self.actor_id
    }
    pub(crate) fn occurrence_id(&self) -> &str {
        &self.occurrence_id
    }
}

// These are the bounded fields changed by action lifecycle operations. Identity,
// command, object bindings and the rest of actor/history are never copied.
struct MutableRecord {
    action_id: String,
    status: ActivityStatus,
    ended_at: Option<f64>,
    view: ActivityView,
    outputs: Vec<crate::commands::ActivityOutput>,
    connections: Vec<ActivityConnection>,
    outcome: Option<Outcome>,
    evidence_ids: Vec<String>,
    result_evidence: Option<ResultEvidence>,
    effects: Option<Vec<ActivityEffect>>,
    revoked: Option<bool>,
    incomplete: Option<bool>,
}
impl MutableRecord {
    fn heap_bound(entry: &ActivityOccurrence) -> Option<usize> {
        heap_sum([
            entry.action_id.heap_bytes()?,
            entry.view.heap_bytes()?,
            entry.outputs.heap_bytes()?,
            entry.connections.heap_bytes()?,
            entry.outcome.heap_bytes()?,
            entry.evidence_ids.heap_bytes()?,
            entry.result_evidence.heap_bytes()?,
            entry.effects.heap_bytes()?,
        ])
    }
    fn capture(entry: &ActivityOccurrence) -> Self {
        Self {
            action_id: entry.action_id.clone(),
            status: entry.status,
            ended_at: entry.ended_at,
            view: entry.view.clone(),
            outputs: entry.outputs.clone(),
            connections: entry.connections.clone(),
            outcome: entry.outcome.clone(),
            evidence_ids: entry.evidence_ids.clone(),
            result_evidence: entry.result_evidence.clone(),
            effects: entry.effects.clone(),
            revoked: entry.revoked,
            incomplete: entry.incomplete,
        }
    }
    fn restore(self, entry: &mut ActivityOccurrence) {
        entry.action_id = self.action_id;
        entry.status = self.status;
        entry.ended_at = self.ended_at;
        entry.view = self.view;
        entry.outputs = self.outputs;
        entry.connections = self.connections;
        entry.outcome = self.outcome;
        entry.evidence_ids = self.evidence_ids;
        entry.result_evidence = self.result_evidence;
        entry.effects = self.effects;
        entry.revoked = self.revoked;
        entry.incomplete = self.incomplete;
    }
}
enum ActivityUndo {
    Record {
        actor: String,
        id: String,
        before: MutableRecord,
    },
    Insert {
        actor: String,
        id: String,
        position: u64,
        next_ordinal: u64,
        parent_present: bool,
        new_owner: bool,
    },
    Admitted(u64),
    Current {
        key: String,
        before: Option<(usize, String)>,
    },
    Active {
        key: String,
        before: Option<(usize, ActivityReference)>,
    },
    Learning {
        key: String,
        before: Option<(usize, LearningCursor)>,
    },
    Pending {
        actor: String,
        id: String,
        before: bool,
    },
}
pub(crate) struct ActivityJournal {
    reservation: ByteReservation,
    undo: Vec<ActivityUndo>,
    pending: BTreeSet<(String, String)>,
}
impl ActivityJournal {
    /// The committing family supplies actual clamped values and its current
    /// personally permitted label; this owner never resolves a canonical name.
    pub(crate) fn record_effect(
        &mut self,
        state: &mut ActivityState,
        cause: &str,
        subject_id: &str,
        property: &str,
        unit: Option<&str>,
        before: ActivityScalar,
        after: ActivityScalar,
        label: &str,
    ) -> Result<(), ActivityError> {
        let Some(reference) = state.active.get(cause) else {
            return Ok(());
        };
        self.reserve(reference.actor_id.len() + reference.occurrence_id.len())?;
        let actor = reference.actor_id.clone();
        let id = reference.occurrence_id.clone();
        self.record_before(state, &actor, &id)?;
        let entry = &state
            .collections
            .get(&actor)
            .ok_or(ActivityError::InvalidStructure)?
            .get(&id)?
            .ok_or(ActivityError::InvalidStructure)?
            .occurrence;
        let old = entry.effects.as_deref().unwrap_or(&[]);
        let found = old
            .iter()
            .position(|effect| effect.subject_id == subject_id && effect.property == property);
        if found.is_none() && old.len() as u64 >= state.limits.outputs {
            return Err(ActivityError::Capacity);
        }
        let labels = old
            .iter()
            .map(|effect| {
                effect.label.len()
                    + effect.property.len()
                    + effect.unit.as_ref().map_or(0, String::len)
                    + effect.before.heap_bytes().unwrap_or(0)
                    + effect.after.heap_bytes().unwrap_or(0)
            })
            .sum::<usize>()
            + label.len()
            + property.len()
            + unit.map_or(0, str::len)
            + before.heap_bytes().ok_or(ActivityError::Capacity)?
            + after.heap_bytes().ok_or(ActivityError::Capacity)?;
        let count = old.len() + usize::from(found.is_none());
        let fields = map_storage::<String, ActivityDetail>(5).ok_or(ActivityError::Capacity)?;
        self.reserve(
            labels
                .checked_mul(4)
                .and_then(|n| {
                    n.checked_add(
                        count
                            * (size_of::<ActivityEffect>() * 2
                                + size_of::<ActivityDetail>()
                                + fields
                                + 128),
                    )
                })
                .and_then(|n| n.checked_add(subject_id.len() + id.len() + 96))
                .ok_or(ActivityError::Capacity)?,
        )?;
        let entry = &mut state
            .collections
            .get_mut(&actor)
            .ok_or(ActivityError::InvalidStructure)?
            .records
            .get_mut(&id)
            .ok_or(ActivityError::InvalidStructure)?
            .occurrence;
        let effects = entry.effects.get_or_insert_with(Vec::new);
        if let Some(index) = found {
            effects[index].after = after;
        } else {
            effects.push(ActivityEffect {
                id: format!("{}:effect:{}", entry.id, effects.len()),
                subject_id: subject_id.to_owned(),
                label: label.to_owned(),
                property: property.to_owned(),
                unit: unit.map(str::to_owned),
                before,
                after,
            });
        }
        let mut values = Vec::with_capacity(effects.len());
        let mut sentences = Vec::with_capacity(effects.len());
        for effect in effects {
            let mut fields = IndexMap::new();
            fields.insert(
                "target".to_owned(),
                ActivityDetail::Scalar(ActivityScalar::String(effect.label.clone())),
            );
            fields.insert(
                "property".to_owned(),
                ActivityDetail::Scalar(ActivityScalar::String(effect.property.clone())),
            );
            if let Some(unit) = effect.unit.as_ref().filter(|unit| !unit.is_empty()) {
                fields.insert(
                    "unit".to_owned(),
                    ActivityDetail::Scalar(ActivityScalar::String(unit.clone())),
                );
            }
            fields.insert(
                "before".to_owned(),
                ActivityDetail::Scalar(effect.before.clone()),
            );
            fields.insert(
                "after".to_owned(),
                ActivityDetail::Scalar(effect.after.clone()),
            );
            values.push(ActivityDetail::Fields(fields));
            let sentence = match (&effect.before, &effect.after) {
                (ActivityScalar::Boolean(before), ActivityScalar::Boolean(after)) => format!(
                    "{}: {} {}",
                    effect.label,
                    effect.property,
                    if before == after {
                        if *after {
                            "remained active"
                        } else {
                            "remained inactive"
                        }
                    } else if *after {
                        "began"
                    } else {
                        "ended"
                    }
                ),
                (before, after) => {
                    let text = |v: &ActivityScalar| match v {
                        ActivityScalar::String(value) => Ok(value.clone()),
                        v => crate::encoding::json_record(v)
                            .map_err(|_| ActivityError::InvalidStructure),
                    };
                    let change =
                        if let (ActivityScalar::Number(before), ActivityScalar::Number(after)) =
                            (before, after)
                        {
                            let n = after - before;
                            format!(
                                " ({}{})",
                                if n >= 0.0 { "+" } else { "" },
                                crate::encoding::json_record(&n)
                                    .map_err(|_| ActivityError::InvalidStructure)?
                            )
                        } else {
                            String::new()
                        };
                    format!(
                        "{}: {} {} to {}{change}",
                        effect.label,
                        effect.property,
                        text(before)?,
                        text(after)?
                    )
                }
            };
            sentences.push(sentence);
        }
        let fact = ActivityFact {
            name: "observed changes".to_owned(),
            critical: true,
            value: ActivityDetail::List(values),
            sentence: Some(sentences.join("; ")),
        };
        if let Some(index) = entry.view.facts.iter().position(|f| f.name == fact.name) {
            entry.view.facts[index] = fact;
        } else {
            entry.view.facts.push(fact);
        }
        Ok(())
    }
    pub(crate) fn new(budget: &ByteBudget) -> Result<Self, ActivityError> {
        Ok(Self {
            reservation: budget
                .reserve(size_of::<Self>())
                .map_err(|_| ActivityError::Capacity)?,
            undo: Vec::new(),
            pending: BTreeSet::new(),
        })
    }
    fn reserve(&mut self, bytes: usize) -> Result<(), ActivityError> {
        let next = self
            .reservation
            .bytes()
            .checked_add(bytes)
            .ok_or(ActivityError::Capacity)?;
        self.reservation
            .resize(next)
            .map_err(|_| ActivityError::Capacity)
    }
    fn push(&mut self, undo: ActivityUndo) -> Result<(), ActivityError> {
        self.reserve(
            size_of::<ActivityUndo>()
                .checked_mul(2)
                .ok_or(ActivityError::Capacity)?,
        )?;
        self.undo
            .try_reserve(1)
            .map_err(|_| ActivityError::Capacity)?;
        self.undo.push(undo);
        Ok(())
    }
    pub(crate) fn checkpoint(&self) -> ActivityCheckpoint {
        ActivityCheckpoint {
            at: self.undo.len(),
        }
    }
    pub(crate) fn is_complete(&self) -> bool {
        self.pending.is_empty()
    }
    fn is_pending(&self, actor: &str, id: &str) -> bool {
        self.pending.iter().any(|(a, i)| a == actor && i == id)
    }
    pub(crate) fn discard_undo(&mut self) -> Result<(), ActivityError> {
        if !self.is_complete() {
            return Err(ActivityError::InvalidStructure);
        }
        self.undo.clear();
        Ok(())
    }
    fn record_before(
        &mut self,
        state: &ActivityState,
        actor: &str,
        id: &str,
    ) -> Result<(), ActivityError> {
        let entry = &state
            .collections
            .get(actor)
            .ok_or(ActivityError::InvalidStructure)?
            .get(id)?
            .ok_or(ActivityError::InvalidStructure)?
            .occurrence;
        let bytes = heap_sum([
            MutableRecord::heap_bound(entry).ok_or(ActivityError::Capacity)?,
            actor.len(),
            id.len(),
        ])
        .ok_or(ActivityError::Capacity)?;
        self.reserve(bytes)?;
        self.push(ActivityUndo::Record {
            actor: actor.to_owned(),
            id: id.to_owned(),
            before: MutableRecord::capture(entry),
        })
    }
    fn current_before(&mut self, state: &ActivityState, key: &str) -> Result<(), ActivityError> {
        self.reserve(key.len() + state.current.get(key).map_or(0, String::len))?;
        let before = state
            .current
            .get_full(key)
            .map(|(at, _, v)| (at, v.clone()));
        self.push(ActivityUndo::Current {
            key: key.to_owned(),
            before,
        })
    }
    fn active_before(&mut self, state: &ActivityState, key: &str) -> Result<(), ActivityError> {
        self.reserve(
            key.len()
                + state
                    .active
                    .get(key)
                    .map_or(Some(0), HeapBytes::heap_bytes)
                    .ok_or(ActivityError::Capacity)?,
        )?;
        let before = state.active.get_full(key).map(|(at, _, v)| (at, v.clone()));
        self.push(ActivityUndo::Active {
            key: key.to_owned(),
            before,
        })
    }
    fn learning_before(&mut self, state: &ActivityState, key: &str) -> Result<(), ActivityError> {
        self.reserve(
            key.len()
                + state
                    .learning
                    .get(key)
                    .map_or(Some(0), HeapBytes::heap_bytes)
                    .ok_or(ActivityError::Capacity)?,
        )?;
        let before = state
            .learning
            .get_full(key)
            .map(|(at, _, v)| (at, v.clone()));
        self.push(ActivityUndo::Learning {
            key: key.to_owned(),
            before,
        })
    }
    fn pending_before(&mut self, actor: &str, id: &str) -> Result<(), ActivityError> {
        self.reserve(actor.len() * 2 + id.len() * 2 + size_of::<(String, String)>() * 4)?;
        let key = (actor.to_owned(), id.to_owned());
        let before = self.is_pending(actor, id);
        self.push(ActivityUndo::Pending {
            actor: key.0,
            id: key.1,
            before,
        })
    }
    pub(crate) fn rollback_to(
        &mut self,
        state: &mut ActivityState,
        checkpoint: ActivityCheckpoint,
    ) -> Result<(), ActivityError> {
        if checkpoint.at > self.undo.len() {
            return Err(ActivityError::InvalidStructure);
        }
        while self.undo.len() > checkpoint.at {
            match self.undo.pop().ok_or(ActivityError::InvalidStructure)? {
                ActivityUndo::Record { actor, id, before } => {
                    let owner = state
                        .collections
                        .get_mut(&actor)
                        .ok_or(ActivityError::InvalidStructure)?;
                    let record = owner
                        .records
                        .get_mut(&id)
                        .ok_or(ActivityError::InvalidStructure)?;
                    let current = record.occurrence.action_id.clone();
                    let old = before.action_id.clone();
                    let position = record.position;
                    before.restore(&mut record.occurrence);
                    owner.index_action(&id, position, Some(&current), Some(&old));
                }
                ActivityUndo::Insert {
                    actor,
                    id,
                    position,
                    next_ordinal,
                    parent_present,
                    new_owner,
                } => {
                    let owner = state
                        .collections
                        .get_mut(&actor)
                        .ok_or(ActivityError::InvalidStructure)?;
                    let record = owner
                        .records
                        .shift_remove(&id)
                        .ok_or(ActivityError::InvalidStructure)?;
                    owner.order.remove(&position);
                    owner.index_action(&id, position, Some(&record.occurrence.action_id), None);
                    owner.next_ordinal = next_ordinal;
                    owner.parent_present = parent_present;
                    if new_owner {
                        if !owner.records.is_empty() {
                            return Err(ActivityError::InvalidStructure);
                        }
                        state.collections.shift_remove(&actor);
                    }
                }
                ActivityUndo::Admitted(before) => state.header.admitted = before,
                ActivityUndo::Current { key, before } => {
                    state.current.shift_remove(&key);
                    if let Some((at, value)) = before {
                        state.current.shift_insert(at, key, value);
                    }
                }
                ActivityUndo::Active { key, before } => {
                    state.active.shift_remove(&key);
                    if let Some((at, value)) = before {
                        state.active.shift_insert(at, key, value);
                    }
                }
                ActivityUndo::Learning { key, before } => {
                    state.learning.shift_remove(&key);
                    if let Some((at, value)) = before {
                        state.learning.shift_insert(at, key, value);
                    }
                }
                ActivityUndo::Pending { actor, id, before } => {
                    let key = (actor, id);
                    if before {
                        self.pending.insert(key);
                    } else {
                        self.pending.remove(&key);
                    }
                }
            }
        }
        Ok(())
    }

    /// Runs after command permission/preconditions and prior-plan completion.
    /// It preserves the source command's personal snapshot and exact bindings.
    pub(crate) fn begin(
        &mut self,
        state: &mut ActivityState,
        entities: &EntityStore,
        command: &NativeCommand,
        action_id: &str,
        view: ActivityView,
        at: f64,
        parent_id: Option<&str>,
    ) -> Result<String, ActivityError> {
        let envelope = command.envelope();
        let actor_id = &envelope.actor_id;
        let id = &envelope.id;
        if parent_id.is_some() || envelope.cooperation.is_some() {
            return Err(ActivityError::UnsupportedFamily);
        }
        if !is_safe_record_id(action_id)
            || !at.is_finite()
            || at < 0.0
            || entities
                .get(actor_id)
                .and_then(|e| e.actor.as_ref())
                .is_none()
        {
            return Err(ActivityError::InvalidStructure);
        }
        if let Some(owner) = state.collections.get(actor_id) {
            if let Some(record) = owner.get(id)? {
                return Ok(record.occurrence.id.clone());
            }
        }
        let fields: [Option<&str>; 2] = match command {
            NativeCommand::Say { target_id, .. } => [target_id.as_deref(), None],
            NativeCommand::StatusEffect {
                target_id,
                resting_place_id,
                ..
            } => [Some(target_id.as_str()), resting_place_id.as_deref()],
            _ => [None, None],
        };
        let object_bytes = fields
            .iter()
            .flatten()
            .try_fold(0_usize, |n, id| {
                let Some(entity) = entities.get(id) else {
                    return Some(n);
                };
                n.checked_add(id.len())?.checked_add(entity.kind.len())
            })
            .ok_or(ActivityError::Capacity)?;
        // Reserve before cloning borrowed command/facts and object labels.
        // Existing source capacities bound their cloned allocation capacities.
        self.reserve(
            heap_sum([
                size_of::<ActivityRecord>(),
                command.heap_bytes().ok_or(ActivityError::Capacity)?,
                view.heap_bytes().ok_or(ActivityError::Capacity)?,
                object_bytes,
                map_storage::<String, ActivityObject>(2).ok_or(ActivityError::Capacity)?,
                map_storage::<String, ActivityRecord>(1).ok_or(ActivityError::Capacity)?,
                actor_id.len() * 4,
                id.len() * 6,
                action_id.len() * 4,
                state.display.display_bytes * 2,
            ])
            .ok_or(ActivityError::Capacity)?,
        )?;
        let mut objects = IndexMap::new();
        for id in fields.into_iter().flatten() {
            if let Some(entity) = entities.get(id) {
                if entity.item.is_some() {
                    return Err(ActivityError::UnsupportedFamily);
                }
                objects.insert(
                    id.to_owned(),
                    ActivityObject {
                        kind: entity.kind.clone(),
                        definition_id: None,
                        definition_version: None,
                        definition_digest: None,
                    },
                );
            }
        }
        let entry = ActivityOccurrence {
            attack_execution: None,
            cooperation: None,
            release: None,
            id: id.clone(),
            actor_id: actor_id.clone(),
            command_id: id.clone(),
            action_id: action_id.to_owned(),
            parent_id: None,
            parent_name: None,
            method_id: None,
            at,
            ended_at: None,
            command: command.recorded(),
            objects,
            view,
            status: ActivityStatus::Running,
            outputs: Vec::new(),
            connections: Vec::new(),
            outcome: None,
            evidence_ids: Vec::new(),
            result_evidence: None,
            effects: None,
            revoked: None,
            incomplete: None,
            stock_resolution: None,
            no_learning_control: None,
        };
        entry.validate(actor_id, &state.limits, &state.display)?;
        let admitted = state
            .header
            .admitted
            .checked_add(1)
            .filter(|n| *n <= state.limits.retained_records)
            .ok_or(ActivityError::Capacity)?;
        let new_owner = !state.collections.contains_key(actor_id);
        let (position, parent_present) =
            state.collections.get(actor_id).map_or((0, false), |owner| {
                (owner.next_ordinal, owner.parent_present)
            });
        let next = position
            .checked_add(1)
            .filter(|n| *n <= MAX_SAFE_INTEGER)
            .ok_or(ActivityError::Capacity)?;
        self.push(ActivityUndo::Insert {
            actor: actor_id.clone(),
            id: id.clone(),
            position,
            next_ordinal: position,
            parent_present,
            new_owner,
        })?;
        self.push(ActivityUndo::Admitted(state.header.admitted))?;
        self.current_before(state, actor_id)?;
        self.active_before(state, action_id)?;
        if !state.learning.contains_key(actor_id) {
            self.learning_before(state, actor_id)?;
        }
        let owner = state
            .collections
            .entry(actor_id.clone())
            .or_insert_with(|| ActivityCollection {
                actor_id: actor_id.clone(),
                complete: true,
                next_ordinal: 0,
                parent_present: false,
                records: IndexMap::new(),
                order: BTreeMap::new(),
                actions: BTreeMap::new(),
            });
        owner.parent_present = true;
        owner.next_ordinal = next;
        owner.order.insert(position, id.clone());
        owner.index_action(id, position, None, Some(action_id));
        owner.records.insert(
            id.clone(),
            ActivityRecord {
                occurrence: entry,
                position,
                slot: position.to_string(),
            },
        );
        state.header.admitted = admitted;
        state.current.insert(actor_id.clone(), action_id.to_owned());
        state.active.insert(
            action_id.to_owned(),
            ActivityReference {
                actor_id: actor_id.clone(),
                occurrence_id: id.clone(),
            },
        );
        state
            .learning
            .entry(actor_id.clone())
            .or_insert_with(|| LearningCursor {
                inspection: None,
                after: None,
                position: None,
                examined: None,
                pending: Vec::new(),
                assessed: Vec::new(),
            });
        Ok(id.clone())
    }
    pub(crate) fn bind_action(
        &mut self,
        state: &mut ActivityState,
        actor: &str,
        id: &str,
        action_id: &str,
    ) -> Result<(), ActivityError> {
        if !is_safe_record_id(action_id) {
            return Err(ActivityError::InvalidStructure);
        }
        let entry = &state
            .collections
            .get(actor)
            .ok_or(ActivityError::InvalidStructure)?
            .get(id)?
            .ok_or(ActivityError::InvalidStructure)?
            .occurrence;
        if entry.status != ActivityStatus::Running {
            return Err(ActivityError::InvalidStructure);
        }
        let old = entry.action_id.clone();
        self.record_before(state, actor, id)?;
        self.active_before(state, &old)?;
        self.active_before(state, action_id)?;
        self.current_before(state, actor)?;
        let owner = state
            .collections
            .get_mut(actor)
            .ok_or(ActivityError::InvalidStructure)?;
        let record = owner
            .records
            .get_mut(id)
            .ok_or(ActivityError::InvalidStructure)?;
        record.occurrence.action_id = action_id.to_owned();
        let position = record.position;
        owner.index_action(id, position, Some(&old), Some(action_id));
        state.active.shift_remove(&old);
        state.active.insert(
            action_id.to_owned(),
            ActivityReference {
                actor_id: actor.to_owned(),
                occurrence_id: id.to_owned(),
            },
        );
        state.current.insert(actor.to_owned(), action_id.to_owned());
        Ok(())
    }
    /// Complete the physical result before personal recording, in source order.
    /// Output-producing families and cooperation are not in this command closure.
    pub(crate) fn prepare_end(
        &mut self,
        state: &mut ActivityState,
        actor: &str,
        action_id: &str,
        result: Outcome,
        at: f64,
    ) -> Result<Option<PendingActivityResult>, ActivityError> {
        let Some(owner) = state.collections.get(actor) else {
            return Ok(None);
        };
        let Some(record) = owner.action_record(action_id)? else {
            return Ok(None);
        };
        if record.occurrence.status != ActivityStatus::Running {
            return Ok(None);
        }
        let entry = &record.occurrence;
        let id = entry.id.clone();
        if entry.cooperation.is_some()
            || result.outputs.as_ref().is_some_and(|o| !o.is_empty())
            || !entry.outputs.is_empty()
        {
            return Err(ActivityError::UnsupportedFamily);
        }
        if !at.is_finite() || at < entry.at {
            return Err(ActivityError::InvalidStructure);
        }
        self.reserve(
            result.heap_bytes().ok_or(ActivityError::Capacity)?
                + result.message.len() * 2
                + actor.len() * 3
                + id.len() * 3,
        )?;
        self.record_before(state, actor, &id)?;
        self.active_before(state, action_id)?;
        if state.current.get(actor).is_some_and(|v| v == action_id) {
            self.current_before(state, actor)?;
        }
        self.pending_before(actor, &id)?;
        let entry = &mut state
            .collections
            .get_mut(actor)
            .ok_or(ActivityError::InvalidStructure)?
            .records
            .get_mut(&id)
            .ok_or(ActivityError::InvalidStructure)?
            .occurrence;
        entry.status = if result.ok {
            ActivityStatus::Completed
        } else if result.code == "cancelled" {
            ActivityStatus::Cancelled
        } else {
            ActivityStatus::Blocked
        };
        entry.ended_at = Some(at);
        entry.view.result = Some(result.message.clone());
        if let Some(last) = entry.view.children.as_mut().and_then(|v| v.last_mut()) {
            if last.result.as_ref().is_none_or(String::is_empty) {
                last.result = Some(result.message.clone());
            }
        }
        for fact in &mut entry.view.facts {
            if fact.name == "health" {
                fact.name = "health before the attempt".to_owned();
            }
            if fact.name == "distance" {
                fact.name = "distance before the attempt".to_owned();
            }
        }
        if let Some(outputs) = &result.outputs {
            entry.outputs = outputs.clone();
        }
        entry.outcome = Some(result);
        entry.validate(actor, &state.limits, &state.display)?;
        state.active.shift_remove(action_id);
        if state.current.get(actor).is_some_and(|v| v == action_id) {
            state.current.shift_remove(actor);
        }
        self.pending.insert((actor.to_owned(), id.clone()));
        Ok(Some(PendingActivityResult {
            actor_id: actor.to_owned(),
            occurrence_id: id,
        }))
    }
    /// Only the actual personal acquisition owner can create this proof. A
    /// guessed account ID or a result-shaped execution-history row cannot pass.
    pub(crate) fn complete_result(
        &mut self,
        state: &mut ActivityState,
        pending: PendingActivityResult,
        acquired: &AcquiredActivityResult,
    ) -> Result<Option<ResultEvidence>, ActivityError> {
        let actor = pending.actor_id;
        let id = pending.occurrence_id;
        if acquired.actor_id() != actor
            || acquired.occurrence_id() != id
            || !self.is_pending(&actor, &id)
        {
            return Err(ActivityError::InvalidEvidence);
        }
        if let Some(evidence) = acquired.evidence() {
            evidence.validate(&actor)?;
        }
        let cursor = state
            .learning
            .get(&actor)
            .ok_or(ActivityError::InvalidStructure)?;
        self.reserve(
            heap_sum([
                acquired
                    .evidence()
                    .map_or(Some(0), HeapBytes::heap_bytes)
                    .ok_or(ActivityError::Capacity)?
                    .checked_mul(3)
                    .ok_or(ActivityError::Capacity)?,
                id.len(),
                cursor
                    .pending
                    .len()
                    .checked_add(1)
                    .and_then(|n| n.checked_mul(size_of::<String>() * 2))
                    .ok_or(ActivityError::Capacity)?,
            ])
            .ok_or(ActivityError::Capacity)?,
        )?;
        self.record_before(state, &actor, &id)?;
        self.learning_before(state, &actor)?;
        self.pending_before(&actor, &id)?;
        let entry = &mut state
            .collections
            .get_mut(&actor)
            .ok_or(ActivityError::InvalidStructure)?
            .records
            .get_mut(&id)
            .ok_or(ActivityError::InvalidStructure)?
            .occurrence;
        entry.result_evidence = acquired.evidence().cloned();
        let evidence = entry.result_evidence.clone();
        let cursor = state
            .learning
            .get_mut(&actor)
            .ok_or(ActivityError::InvalidStructure)?;
        if !cursor.pending.contains(&id) {
            cursor.pending.push(id.clone());
        }
        if cursor.pending.len() as u64 > state.limits.page {
            cursor.pending.remove(0);
        }
        self.pending.remove(&(actor, id));
        Ok(evidence)
    }
}
