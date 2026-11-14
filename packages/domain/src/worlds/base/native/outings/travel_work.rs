//! Base travel keeps each person's ordinary work and route admission. These
//! reads issue no work, IDs, plan revisions, memories or participant authority.
//! Source: outings.ts able/workProblem/travelCommand; heldProblem remains with
//! the invitation owner, including expiry, destination and shared social slots.
use crate::commands::{CommandChoiceCursor, NativeCommand, WorkTransitionMode};
use crate::execution::{CoreMutation, ExecutionError};
use crate::geometry::GeometryBinding;
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::plans::{
    ActivityExecution, PlanMode, PlanStatus, RequestedActivityInitialError, RequestedActivityInput,
    StepStatus,
};
use crate::records::SqlCell;
use crate::text::TextRef;
use indexmap::IndexMap;
use serde::Serialize;
use std::mem::size_of;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum TravelWorkRefusal {
    Changed,
    Busy,
}

pub(crate) fn travel_able(core: &CoreMutation<'_>, actor_id: &str) -> Result<bool, ExecutionError> {
    let Some(entity) = core.state.physical.entities.get(actor_id) else {
        return Ok(false);
    };
    // This existing Base recipient read is exactly able(): memory, alive,
    // participation and current action/locomotion capability restrictions.
    crate::worlds::base_decision_offers::activity_recipient_eligible(&core.state.installed, entity)
}

pub(crate) fn travel_work_problem(
    core: &CoreMutation<'_>,
    trip: &SqlCell,
    actor_id: &str,
    mode: PlanMode,
) -> Result<Option<TravelWorkRefusal>, ExecutionError> {
    let actor = core
        .state
        .physical
        .entities
        .get(actor_id)
        .and_then(|entity| entity.actor.as_ref());
    let expected = trip
        .get("work")
        .and_then(|work| work.get(actor_id))
        .and_then(SqlCell::as_u64);
    if actor.is_none()
        || !travel_able(core, actor_id)?
        || actor.is_some_and(|actor| Some(actor.plan_generation) != expected)
    {
        return Ok(Some(TravelWorkRefusal::Changed));
    }
    let actor = actor.ok_or(ExecutionError::Invariant)?;
    let plan = actor.agency.plan.as_ref();
    // An explicit saved null is not a paused frontier in Source.
    let suspended = actor.agency.suspended_plan().is_some();
    if mode == PlanMode::Enqueue
        && (actor.action.is_some()
            || plan.is_some_and(|plan| {
                matches!(plan.status, PlanStatus::Active | PlanStatus::Blocked)
            })
            || suspended)
    {
        return Ok(Some(TravelWorkRefusal::Busy));
    }
    if mode == PlanMode::Interrupt
        && (suspended
            || crate::plans::action_pause_refusal(actor.action.as_ref())?.is_some()
            || actor.action.as_ref().is_some_and(|action| {
                !plan.is_some_and(|plan| {
                    plan.steps.iter().any(|step| {
                        step.status == StepStatus::Running
                            && step.action_id.as_ref() == Some(&action.id)
                    })
                })
            }))
    {
        return Ok(Some(TravelWorkRefusal::Busy));
    }
    Ok(None)
}

fn member<'a>(value: &'a SqlCell, field: &str) -> Result<&'a SqlCell, ExecutionError> {
    value.get(field).ok_or(ExecutionError::Invariant)
}
fn text<'a>(value: &'a SqlCell, field: &str) -> Result<&'a str, ExecutionError> {
    member(value, field)?
        .as_str()
        .ok_or(ExecutionError::UnsupportedFamily)
}
fn destination(trip: &SqlCell) -> Result<&SqlCell, ExecutionError> {
    member(trip, "destination")
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TravelPreview<'a> {
    id: &'a str,
    actor_id: &'a str,
    #[serde(rename = "type")]
    family: &'a str,
    destination: &'a SqlCell,
}

/// Source workProblem checks a plain Move, without the later activity's name
/// or origin. The caller forwards this actual cursor's geometry/display and
/// maps a negative outcome to Base's outing-route refusal before any work edit.
pub(crate) fn travel_work_preview(
    core: &CoreMutation<'_>,
    trip: &SqlCell,
    actor_id: &str,
    binding: GeometryBinding,
    budget: &ByteBudget,
) -> Result<CommandChoiceCursor, ExecutionError> {
    let ordinary = core.state.installed.ordinary_actions.value();
    let family = text(&ordinary.travel.activity.root, "command")?;
    if !ordinary.plan.supports_requested_movement(family) {
        return Err(ExecutionError::UnsupportedFamily);
    }
    let input = TravelPreview {
        id: &ordinary.travel.activity.preview_id,
        actor_id,
        family,
        destination: member(destination(trip)?, "point")?,
    };
    let bytes = crate::encoding::json_record_len(&input).map_err(|_| ExecutionError::Invariant)?;
    let mut storage = budget.reserve(
        bytes
            .checked_mul(2)
            .and_then(|n| n.checked_add(size_of::<NativeCommand>()))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let encoded = crate::encoding::json_record(&input).map_err(|_| ExecutionError::Invariant)?;
    let parsing = crate::experience::encoded_body_bound(&encoded)
        .map_err(|_| ExecutionError::Capacity)?
        .checked_add(
            encoded
                .len()
                .checked_mul(8)
                .ok_or(ExecutionError::Capacity)?,
        )
        .ok_or(ExecutionError::Capacity)?;
    storage.resize(
        storage
            .bytes()
            .checked_add(parsing)
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let command: NativeCommand =
        serde_json::from_str(&encoded).map_err(|_| ExecutionError::UnsupportedFamily)?;
    if !matches!(command, NativeCommand::Move { .. }) {
        return Err(ExecutionError::UnsupportedFamily);
    }
    // Enqueue selects ordinary feasibility without changing or cancelling the
    // actor's current work. Actual starting mode remains the requested owner.
    CommandChoiceCursor::new(command, WorkTransitionMode::Enqueue, binding, budget)
}

/// Build from the same Base recipe used by the real Source travel producer.
/// The returned allocation must remain live until RequestedActivityCursor owns
/// its input. There is no callback/parent body retained in this finite product.
pub(crate) fn travel_requested_input(
    core: &CoreMutation<'_>,
    trip: &SqlCell,
    actor_id: &str,
    mode: PlanMode,
    budget: &ByteBudget,
) -> Result<(RequestedActivityInput, ByteReservation), RequestedActivityInitialError> {
    let ordinary = core.state.installed.ordinary_actions.value();
    let recipe = &ordinary.travel.activity;
    let selected = destination(trip)?;
    let label = member(selected, "label")?
        .as_text()
        .ok_or(ExecutionError::Invariant)?;
    let point = member(selected, "point")?;
    let template = text(&recipe.root, "name")?;
    let fields = [("place", TextRef::from(label))];
    let name_bytes = ordinary
        .plan
        .text_bound(template, &fields)
        .ok_or(ExecutionError::Capacity)?;
    let trip_id = text(trip, "id")?;
    let suffix = if actor_id == text(trip, "proposerId")? {
        &recipe.proposer_suffix
    } else {
        &recipe.recipient_suffix
    };
    let id_bytes = trip_id
        .len()
        .checked_add(1)
        .and_then(|n| n.checked_add(suffix.len()))
        .ok_or(ExecutionError::Capacity)?;
    let metadata = heap_sum([
        size_of::<RequestedActivityInput>() - size_of::<ActivityExecution>(),
        id_bytes,
        actor_id.len(),
    ])
    .ok_or(ExecutionError::Capacity)?;
    let bytes = heap_sum([
        metadata,
        recipe.root.heap_bytes().ok_or(ExecutionError::Capacity)?,
        name_bytes.checked_mul(2).ok_or(ExecutionError::Capacity)?,
        point.heap_bytes().ok_or(ExecutionError::Capacity)?,
        recipe.destination_role.capacity(),
        map_storage::<String, SqlCell>(1).ok_or(ExecutionError::Capacity)?,
    ])
    .ok_or(ExecutionError::Capacity)?;
    let mut storage = budget
        .reserve(bytes)
        .map_err(|_| ExecutionError::Capacity)?;
    let name = ordinary.plan.text(template, &fields);
    let mut root = recipe.root.clone_within_heap_bound();
    let SqlCell::Object(root_fields) = &mut root else {
        return Err(ExecutionError::UnsupportedFamily.into());
    };
    *root_fields
        .get_mut("name")
        .ok_or(ExecutionError::Invariant)? = SqlCell::Text(name.clone());
    let mut bindings = IndexMap::with_capacity(1);
    bindings.insert(
        recipe.destination_role.clone(),
        point.clone_within_heap_bound(),
    );
    let bindings = SqlCell::Object(bindings);
    let (execution, mut owned) = ActivityExecution::initial_requested_single_invoke(
        &name,
        &root,
        &bindings,
        &core.state.activity.limits,
        &core.state.installed,
        budget,
    )?;
    let mut id = String::with_capacity(id_bytes);
    id.push_str(trip_id);
    id.push(':');
    id.push_str(suffix);
    let input = RequestedActivityInput {
        id,
        actor_id: actor_id.into(),
        mode,
        execution,
    };
    // End recipe/render copies before transferring only the actual input's
    // metadata charge. The execution already has its independent admission.
    drop(bindings);
    drop(root);
    drop(name);
    storage
        .resize(metadata)
        .map_err(|_| ExecutionError::Capacity)?;
    owned.merge(storage).map_err(|_| ExecutionError::Capacity)?;
    Ok((input, owned))
}
