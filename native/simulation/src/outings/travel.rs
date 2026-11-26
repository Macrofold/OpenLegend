//! The selected paired travel offer owns consent, never an actor's movement.
//! Ordinary Move admission and exact private evidence remain separate owners.
use super::*;
use crate::execution::CoreMutation;
use crate::plans::PlanMode;
use crate::text::JsText;
use crate::worlds::base_outings::travel_able;

pub(crate) const REVISION: &str = "revision";

pub(crate) fn text<'a>(value: &'a SqlCell, key: &str) -> Result<&'a str, ExecutionError> {
    value
        .get(key)
        .and_then(SqlCell::as_str)
        .ok_or(ExecutionError::Invariant)
}

pub(crate) fn mode_label(mode: PlanMode) -> &'static str {
    match mode {
        PlanMode::Enqueue => "enqueue",
        PlanMode::Replace => "replace",
        PlanMode::Interrupt => "interrupt",
    }
}

pub(crate) struct Refusal<'a> {
    pub code: &'static str,
    pub message: &'a JsText,
}

/// True for the exact due and unchanged pair. The caller still checks actual
/// destination coordinates, physical reach, receipt revision and visibility.
pub(crate) fn pending_current(
    core: &CoreMutation<'_>,
    trip: &OutingRecord,
    budget: &ByteBudget,
) -> Result<bool, ExecutionError> {
    let value = trip.body();
    let expiry = value
        .get("expiresAt")
        .and_then(SqlCell::as_f64)
        .ok_or(ExecutionError::Invariant)?;
    if trip.kind() != OutingKind::Travel
        || trip.status() != OutingStatus::Pending
        || expiry <= core.state.physical.header.sim_time
        || !core.state.installed.travel
    {
        return Ok(false);
    }
    let work = value.get("work").ok_or(ExecutionError::Invariant)?;
    for actor in trip.participants() {
        let expected = work
            .get(actor)
            .and_then(SqlCell::as_u64)
            .ok_or(ExecutionError::Invariant)?;
        let unchanged = core
            .state
            .physical
            .entities
            .get(actor)
            .and_then(|entity| entity.actor.as_ref())
            .is_some_and(|actor| actor.plan_generation == expected);
        if !unchanged
            || !travel_able(core, actor)?
            || core
                .state
                .outings
                .accepted_id(actor, OutingKind::Travel, budget)?
                .is_some()
        {
            return Ok(false);
        }
    }
    Ok(true)
}

fn pending_for(
    state: &OutingState,
    actor: &str,
    field: &str,
    now: f64,
    limit: u64,
    budget: &ByteBudget,
) -> Result<bool, ExecutionError> {
    let mut found = 0;
    for id in state.actor_ids(actor, budget)? {
        let offer = state.get(id).ok_or(ExecutionError::Invariant)?;
        let body = offer.body();
        if offer.status() == OutingStatus::Pending
            && body
                .get("expiresAt")
                .and_then(SqlCell::as_f64)
                .is_some_and(|expiry| expiry > now)
            && text(body, field)? == actor
        {
            found += 1;
            if found >= limit {
                return Ok(true);
            }
        }
    }
    Ok(false)
}

/// Select ordinary pending capacity through the related-participant index.
/// No travel proposal authorizes action or increments capacity by itself.
pub(crate) fn pending_slots<'a>(
    core: &'a CoreMutation<'_>,
    proposer: &str,
    recipient: &str,
    budget: &ByteBudget,
) -> Result<Option<Refusal<'a>>, ExecutionError> {
    let installed = &core.state.installed;
    let policy = installed
        .retained
        .social_offer_read
        .as_ref()
        .ok_or(ExecutionError::UnsupportedFamily)?;
    let state = &core.state.outings;
    let now = core.state.physical.header.sim_time;
    if pending_for(state, proposer, "proposerId", now, policy.outgoing, budget)? {
        return Ok(Some(Refusal {
            code: "social-offer-limit",
            message: &policy.messages.outgoing,
        }));
    }
    if pending_for(
        state,
        recipient,
        "recipientId",
        now,
        policy.incoming,
        budget,
    )? {
        return Ok(Some(Refusal {
            code: "social-offer-limit",
            message: &policy.messages.incoming,
        }));
    }
    // The compiled travel messages are UTF-8 authored constants. The caller
    // uses its existing budgeted installed-word outcome helper for these.
    Ok(None)
}

pub(crate) fn live_pair(
    state: &OutingState,
    proposer: &str,
    recipient: &str,
    budget: &ByteBudget,
) -> Result<bool, ExecutionError> {
    for id in state.pair_ids(proposer, recipient, budget)? {
        if state
            .get(id)
            .is_some_and(|record| record.kind() == OutingKind::Travel)
        {
            return Ok(true);
        }
    }
    Ok(false)
}

/// The caller has already admitted the exact point/label, own work, pair
/// policy and private recipients. Keep the accepted destination cells typed
/// and ordered. No physical activity is created by this offer.
pub(crate) fn prepare_pending(
    core: &CoreMutation<'_>,
    id: &str,
    proposer: &str,
    recipient: &str,
    destination: SqlCell,
    purpose: Option<&JsText>,
    mode: PlanMode,
    budget: &ByteBudget,
) -> Result<(SqlCell, ByteReservation), ExecutionError> {
    let installed = &core.state.installed;
    let rules = &installed.ordinary_actions.value().travel;
    let policy = installed
        .retained
        .social_offer_read
        .as_ref()
        .ok_or(ExecutionError::UnsupportedFamily)?;
    let now = core.state.physical.header.sim_time;
    let expires = now + policy.pending_seconds;
    if !expires.is_finite() || expires <= now {
        return Err(ExecutionError::Invariant);
    }
    let capacity = heap_sum([
        destination.heap_bytes().ok_or(ExecutionError::Capacity)?,
        1024,
        id.len(),
        2 * proposer.len(),
        2 * recipient.len(),
        map_storage::<String, SqlCell>(16).ok_or(ExecutionError::Capacity)?,
        map_storage::<String, SqlCell>(2).ok_or(ExecutionError::Capacity)?,
        purpose.map_or(0, |text| text.storage_bytes().saturating_mul(3)),
    ])
    .ok_or(ExecutionError::Capacity)?;
    let mut custody = budget.reserve(capacity)?;
    let mut work = IndexMap::with_capacity(2);
    for id in [proposer, recipient] {
        let generation = core
            .state
            .physical
            .entities
            .get(id)
            .and_then(|entity| entity.actor.as_ref())
            .ok_or(ExecutionError::MissingActor)?
            .plan_generation;
        work.insert(id.to_owned(), SqlCell::Number(generation.into()));
    }
    let string = |value: &str| SqlCell::Text(value.into());
    let number = |value: f64| {
        serde_json::Number::from_f64(value)
            .map(SqlCell::Number)
            .ok_or(ExecutionError::Invariant)
    };
    let mut fields = IndexMap::with_capacity(13);
    fields.insert("kind".into(), string(&rules.kind));
    fields.insert("id".into(), string(id));
    fields.insert(REVISION.into(), SqlCell::Number(1.into()));
    fields.insert("proposerId".into(), string(proposer));
    fields.insert("recipientId".into(), string(recipient));
    fields.insert("destination".into(), destination);
    if let Some(purpose) = purpose.filter(|value| !value.trim_is_empty()) {
        fields.insert("purpose".into(), SqlCell::Text(purpose.trimmed()));
    }
    fields.insert("status".into(), string("pending"));
    fields.insert("createdAt".into(), number(now)?);
    fields.insert("expiresAt".into(), number(expires)?);
    fields.insert("proposerMode".into(), string(mode_label(mode)));
    fields.insert("work".into(), SqlCell::Object(work));
    fields.insert("arrived".into(), SqlCell::Array(Vec::new()));
    fields.insert("company".into(), SqlCell::Object(IndexMap::new()));
    let value = SqlCell::Object(fields);
    custody.resize(value.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
    Ok((value, custody))
}

/// The finite stationary destination uses a known four-field world placement.
/// Match Source's canonical field order without reconstructing other records.
pub(crate) fn stationary_placement(
    target: &crate::state::Entity,
) -> Result<Option<String>, ExecutionError> {
    use crate::state::Placement;
    let Some(Placement::World {
        position,
        support_surface_id,
        revision,
        motion_continuity_revision,
    }) = target.placement.as_ref()
    else {
        return Ok(None);
    };
    if target.actor.is_some() || target.retirement.is_some() || support_surface_id.is_none() {
        return Ok(None);
    }
    #[derive(serde::Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Binding<'a> {
        mode: &'static str,
        #[serde(skip_serializing_if = "Option::is_none")]
        motion_continuity_revision: Option<u64>,
        position: &'a crate::state::Point,
        revision: u64,
        support_surface_id: &'a Option<String>,
    }
    let binding = Binding {
        mode: "world",
        motion_continuity_revision: *motion_continuity_revision,
        position,
        revision: *revision,
        support_surface_id,
    };
    crate::encoding::json_record(&binding)
        .map(Some)
        .map_err(|_| ExecutionError::Invariant)
}

pub(crate) fn destination_current(
    core: &CoreMutation<'_>,
    trip: &OutingRecord,
    budget: &ByteBudget,
) -> Result<bool, ExecutionError> {
    let destination = trip
        .body()
        .get("destination")
        .ok_or(ExecutionError::Invariant)?;
    let Some(id) = destination.get("entityId").and_then(SqlCell::as_str) else {
        return Ok(true);
    };
    let expected = text(destination, "placement")?;
    let Some(target) = core.state.physical.entities.get(id) else {
        return Ok(false);
    };
    let _format = budget.reserve(expected.len() * 2 + 256)?;
    Ok(stationary_placement(target)?.as_deref() == Some(expected))
}

/// Build only the exact physical four-field point already admitted by the
/// normal approach owner. Existing explicit point extras stay in their body.
pub(crate) fn point_cell(point: crate::state::SurfacePoint) -> Result<SqlCell, ExecutionError> {
    let finite = |n| {
        serde_json::Number::from_f64(n)
            .map(SqlCell::Number)
            .ok_or(ExecutionError::Invariant)
    };
    Ok(SqlCell::Object(IndexMap::from([
        ("x".into(), finite(point.x)?),
        ("y".into(), finite(point.y)?),
        ("z".into(), finite(point.z)?),
        ("surfaceId".into(), SqlCell::Text(point.surface_id.into())),
    ])))
}

/// Stop only the exact plans created by this consent. Removing its live row
/// first keeps action-ending hooks from ever reconsidering obsolete consent.
pub(crate) fn stop_owned_travel(
    core: &mut CoreMutation<'_>,
    trip: &SqlCell,
    cause: crate::worlds::base_outings::TravelNoticeCause,
    received: [bool; 2],
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    use crate::plans::{PlanControlCursor, PlanControlKind, PlanControlStep};
    let Some(plans) = trip.get("plans") else {
        return Ok(());
    };
    let installed = core.state.installed.clone();
    let messages = &installed.ordinary_actions.value().travel.messages;
    for (field, received) in ["proposerId", "recipientId"].into_iter().zip(received) {
        let actor = text(trip, field)?;
        let exact = text(plans, actor)?;
        let Some(entity) = core
            .state
            .physical
            .entities
            .get(actor)
            .and_then(|e| e.actor.as_ref())
        else {
            continue;
        };
        let kind = if entity
            .agency
            .plan
            .as_ref()
            .is_some_and(|plan| plan.id == exact)
        {
            PlanControlKind::Cancel { summarize: false }
        } else if entity
            .agency
            .suspended_plan()
            .is_some_and(|plan| plan.id == exact)
        {
            PlanControlKind::DiscardSuspended
        } else {
            continue;
        };
        let mut control = PlanControlCursor::new(actor, kind, budget)?;
        let schema = core.state.installed.schema.clone();
        let mut acquired = None;
        loop {
            match control.step(core, acquired.take())? {
                PlanControlStep::Personal(result) => {
                    let read = crate::experience::prepare_activity_result(core, result, budget)
                        .map_err(ExecutionError::from)?;
                    acquired = Some(
                        crate::experience::acquire_activity_result(core, read, &schema)
                            .map_err(ExecutionError::from)?,
                    );
                }
                PlanControlStep::Complete => break,
            }
        }
        if matches!(kind, PlanControlKind::Cancel { .. }) {
            let reason = if received {
                cause.reason(messages)
            } else {
                &messages.unobserved_work_end
            };
            let mut physical = core.physical();
            physical.reserve_plan_growth(reason.len())?;
            let execution = physical
                .plan_mut(actor)?
                .as_mut()
                .filter(|plan| plan.id == exact)
                .and_then(|plan| plan.activity.as_mut())
                .ok_or(ExecutionError::Invariant)?;
            execution.reason = Some(reason.into());
        }
    }
    Ok(())
}

/// Link the already acquired private notice to the exact plan that owns
/// this actor's walk. A movement history account is not synthesized here.
pub(crate) fn link_plan_notice(
    core: &mut CoreMutation<'_>,
    trip: &SqlCell,
    actor: &str,
    receipt: &crate::events::CompletedOccurrence,
) -> Result<(), ExecutionError> {
    use crate::activity::{ResultAccountSource, ResultEvidence};
    use crate::experience::PersonalSourceKind;
    let Some(plan_id) = trip
        .get("plans")
        .and_then(|plans| plans.get(actor))
        .and_then(SqlCell::as_str)
    else {
        return Ok(());
    };
    let matching = core
        .state
        .physical
        .entities
        .get(actor)
        .and_then(|entity| entity.actor.as_ref())
        .and_then(|body| body.agency.plan.as_ref())
        .is_some_and(|plan| plan.id == plan_id);
    let id = receipt.event_id();
    let acquired = core
        .state
        .experience
        .actor(actor)
        .and_then(|history| history.collection(PersonalSourceKind::Awareness).ok())
        .and_then(|awareness| awareness.resident_record(id))
        .is_some_and(|row| row.header().personal_agreement);
    if !matching || !acquired {
        return Ok(());
    }
    let mut physical = core.physical();
    physical.reserve_plan_growth(id.len().checked_mul(2).ok_or(ExecutionError::Capacity)?)?;
    let evidence = ResultEvidence::Account {
        source: ResultAccountSource::Awareness,
        id: id.into(),
    };
    physical
        .plan_mut(actor)?
        .as_mut()
        .ok_or(ExecutionError::Invariant)?
        .result_evidence = Some(evidence.clone());
    physical.set_result_evidence(actor, Some(evidence))
}
