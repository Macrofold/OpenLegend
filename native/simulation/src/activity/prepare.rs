//! One ordinary activity record is prepared by the same constructor for
//! read-only availability and actual admission. Preparation never publishes it.
use super::*;
use crate::commands::NativeCommand;
use crate::host::retained_size::{heap_sum, map_storage, HeapBytes};
use crate::host::ByteReservation;
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
    let method = plan.and_then(|plan| plan.activity.as_ref()).and_then(|value| value.method_id.as_deref());
    let parent_name = match plan.and_then(|plan| plan.activity.as_ref()) {
        Some(_) if method.is_some() => {
            let id = method.ok_or(ActivityError::InvalidStructure)?;
            Some(state.library.methods.get(id).and_then(|value| value.body().get("name"))
                .and_then(crate::records::SqlCell::as_text).ok_or(ActivityError::InvalidStructure)?)
        }
        Some(activity) => {
            activity.single_invoke().map_err(|_| ActivityError::UnsupportedFamily)?;
            Some(&activity.request.as_ref().ok_or(ActivityError::InvalidStructure)?.name)
        }
        None => plan.and_then(|plan| {
            plan.steps.iter().find_map(|step| step.command.envelope().purpose.as_ref())
        }),
    };
    let fields: [Option<&str>; 2] = match command {
        NativeCommand::Say { target_id, .. } => [target_id.as_deref(), None],
        NativeCommand::StatusEffect {
            target_id,
            resting_place_id,
            ..
        } => [Some(target_id.as_str()), resting_place_id.as_deref()],
        NativeCommand::Follow { target_id, .. } => {
            [Some(target_id.as_str()), None]
        }
        NativeCommand::Strike { target_id, weapon_item_id, .. } => {
            [Some(target_id), weapon_item_id.as_deref()]
        }
        NativeCommand::Gather {
            target_id, tool, ..
        } => [Some(target_id), tool.item_id.as_deref()],
        NativeCommand::Guard { facing, item_id, .. } => [facing.subject_id(), Some(item_id)],
        NativeCommand::Ranged {
            intent: crate::commands::RangedIntent::Start { target, weapon, .. }, ..
        } => [target.subject_id(), weapon.as_deref()],
        NativeCommand::PracticeShot { target_id, weapon_item_id, .. } => {
            [Some(target_id), weapon_item_id.as_deref()]
        }
        NativeCommand::TransferStock {request,..} => [Some(&request.source),Some(&request.destination)],
        NativeCommand::Harvest {target_id,..} => [Some(target_id),None],
        NativeCommand::Fish { target_id, item_id, .. } => [Some(target_id), Some(item_id)],
        NativeCommand::Pickup { target_id, item_id, .. } => [Some(target_id), item_id.as_deref()],
        NativeCommand::Eat { item_id, .. } | NativeCommand::Equipment { item_id, .. } => [Some(item_id), None],
        _ => [None, None],
    };
    let cooking = match command {
        NativeCommand::Cook { heat_id, inputs, .. } => Some((heat_id, inputs)),
        _ => None,
    };
    let practice_ammunition = match command {
        NativeCommand::Ranged {
            intent: crate::commands::RangedIntent::Start { ammunition, .. }, ..
        } => ammunition.as_deref(),
        NativeCommand::PracticeShot { ammo_item_id, .. } => ammo_item_id.as_deref(),
        _ => None,
    };
    let objects_count = 2 + usize::from(practice_ammunition.is_some())
        + cooking.map_or(0, |(_, inputs)| inputs.len() + 1);
    let selected_objects = || fields.iter().flatten().copied()
        .chain(practice_ammunition)
        .chain(cooking.into_iter().map(|(heat, _)| heat.as_str()))
        .chain(cooking.into_iter().flat_map(|(_, inputs)| inputs.values().map(String::as_str)));
    let object_bytes = selected_objects()
        .try_fold(0_usize, |n, id| {
            let Some(entity) = entities.get(id) else {
                return Some(n);
            };
            n.checked_add(id.len())?
                .checked_add(entity.kind.len())?
                .checked_add(
                    entity
                        .item
                        .as_ref()
                        .map_or(Some(0), |item| item.definition_pin.heap_bytes())?,
                )
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
            map_storage::<String, ActivityObject>(objects_count).ok_or(ActivityError::Capacity)?,
            map_storage::<String, ActivityRecord>(1).ok_or(ActivityError::Capacity)?,
            actor_id.len() * 4,
            id.len() * 6,
            action_id.len() * 4,
            parent_id.map_or(0, str::len),
            method.map_or(0, str::len),
            parent_name
                .map_or(Some(0), HeapBytes::heap_bytes)
                .ok_or(ActivityError::Capacity)?,
            state.display.display_bytes * 2,
        ])
        .ok_or(ActivityError::Capacity)?,
    )?;
    let mut objects = IndexMap::new();
    for id in selected_objects() {
        if let Some(entity) = entities.get(id) {
            let pin = entity.item.as_ref().map(|item| &item.definition_pin);
            objects.insert(
                id.to_owned(),
                ActivityObject {
                    kind: entity.kind.clone(),
                    definition_id: pin.map(|pin| pin.id.clone()),
                    definition_version: pin.map(|pin| pin.version),
                    definition_digest: pin.map(|pin| pin.digest.clone()),
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
        method_id: method.map(str::to_owned),
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
        no_learning_control: matches!(command, NativeCommand::PracticeShot { .. }).then_some(true),
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
