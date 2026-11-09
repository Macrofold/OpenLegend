//! One ordinary activity record is prepared by the same constructor for
//! read-only availability and actual admission. Preparation never publishes it.
use super::*;
use crate::commands::NativeCommand;
use crate::host::ByteReservation;
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::state::EntityStore;
use std::mem::size_of;

pub(super) fn start_record(
    state: &ActivityState,
    entities: &EntityStore,
    command: &NativeCommand,
    action_id: &str,
    view: ActivityView,
    at: f64,
    parent_id: Option<&str>,
    reserve: impl FnOnce(usize) -> Result<(), ActivityError>,
) -> Result<ActivityOccurrence, ActivityError> {
    let actor_id = &command.envelope().actor_id;
    let id = &command.envelope().id;
    let plan = entities
        .get(actor_id)
        .and_then(|entity| entity.actor.as_ref())
        .and_then(|actor| actor.agency.plan.as_ref())
        .filter(|plan| Some(plan.id.as_str()) == parent_id);
    if plan.is_some_and(|plan| plan.activity.is_some()) {
        return Err(ActivityError::UnsupportedFamily);
    }
    let parent_name = plan.and_then(|plan| {
        plan.steps
            .iter()
            .find_map(|step| step.command.envelope().purpose.as_ref())
    });
    let fields: [Option<&str>; 2] = match command {
        NativeCommand::Say { target_id, .. } => [target_id.as_deref(), None],
        NativeCommand::StatusEffect {
            target_id,
            resting_place_id,
            ..
        } => [Some(target_id.as_str()), resting_place_id.as_deref()],
        NativeCommand::Follow { target_id, .. } | NativeCommand::Strike { target_id, .. } => {
            [Some(target_id.as_str()), None]
        }
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
    reserve(
        heap_sum([
            size_of::<ActivityRecord>(),
            command.heap_bytes().ok_or(ActivityError::Capacity)?,
            command
                .source_edit_heap_bound(0)
                .ok_or(ActivityError::Capacity)?,
            view.heap_bytes().ok_or(ActivityError::Capacity)?,
            object_bytes,
            map_storage::<String, ActivityObject>(2).ok_or(ActivityError::Capacity)?,
            map_storage::<String, ActivityRecord>(1).ok_or(ActivityError::Capacity)?,
            actor_id.len() * 4,
            id.len() * 6,
            action_id.len() * 4,
            parent_id.map_or(0, str::len),
            parent_name
                .map_or(Some(0), HeapBytes::heap_bytes)
                .ok_or(ActivityError::Capacity)?,
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
        parent_id: parent_id.map(str::to_owned),
        parent_name: parent_name.cloned(),
        method_id: None,
        at,
        ended_at: None,
        command: command
            .recorded()
            .map_err(|_| ActivityError::InvalidStructure)?,
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
    Ok(entry)
}

pub(crate) enum ActivityStartProblem {
    StoredRecord,
    Display,
}
impl ActivityStartProblem {
    pub(crate) fn message(&self) -> &'static str {
        match self {
            Self::StoredRecord => "Required action history exceeds the stored-record allowance.",
            Self::Display => "Required action facts exceed the display allowance.",
        }
    }
}

pub(crate) fn check_activity_start(
    state: &ActivityState,
    entities: &EntityStore,
    command: &NativeCommand,
    view: ActivityView,
    mut storage: ByteReservation,
    at: f64,
) -> Result<Option<ActivityStartProblem>, ActivityError> {
    if state
        .collections
        .get(&command.envelope().actor_id)
        .is_some_and(|owner| owner.records.contains_key(&command.envelope().id))
    {
        return Ok(None);
    }
    let view_bytes = view.heap_bytes().ok_or(ActivityError::Capacity)?;
    if storage.bytes() < view_bytes {
        return Err(ActivityError::Capacity);
    }
    storage
        .resize(view_bytes)
        .map_err(|_| ActivityError::Capacity)?;
    let record = start_record(
        state,
        entities,
        command,
        &command.envelope().id,
        view,
        at,
        None,
        |bytes| {
            storage
                .resize(
                    storage
                        .bytes()
                        .checked_add(
                            bytes
                                .checked_sub(view_bytes)
                                .ok_or(ActivityError::Capacity)?,
                        )
                        .ok_or(ActivityError::Capacity)?,
                )
                .map_err(|_| ActivityError::Capacity)
        },
    )?;
    match record.validate(&command.envelope().actor_id, &state.limits, &state.display) {
        Ok(()) => Ok(None),
        Err(ActivityError::Capacity) => {
            let bytes = crate::encoding::json_record_len(&record)
                .map_err(|_| ActivityError::InvalidStructure)?;
            Ok(Some(if bytes as u64 > state.limits.record_bytes {
                ActivityStartProblem::StoredRecord
            } else {
                ActivityStartProblem::Display
            }))
        }
        Err(error) => Err(error),
    }
}
