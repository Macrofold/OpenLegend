//! The native obligation scheduler consumes the same immutable personal source
//! and original owner/array order as completion admission. It creates no events.
use super::*;
use crate::events::WorldEvent;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::{ByteBudget, ByteReservation};
use std::mem::size_of;

#[derive(Deserialize)]
struct ObligationFields {
    obligation: Option<Map<String, Value>>,
}
struct Pending {
    source: Arc<PersonalSourceRecord>,
}
fn possible(header: &PersonalSourceHeader, events: &[WorldEvent], now: f64) -> bool {
    header.unresolved_obligation
        && (header.obligation_due_at.is_some_and(|at| at <= now)
            || header.completion_event_type.as_deref().is_some_and(|kind| {
                events.iter().any(|event| {
                    event.actor_id.as_deref() == Some(header.actor_id.as_str())
                        && event.event_type == kind
                })
            }))
}
/// Unavailable residency remains a hydration request. Missing retained history
/// never becomes proof that no obligation can be fulfilled or turn overdue.
pub(crate) fn advance_commitments(
    core: &mut CoreMutation<'_>,
    events: &[WorldEvent],
    budget: &ByteBudget,
) -> Result<(), MemoryAcquisitionError> {
    let owners = core.state.experience.memory_owners(budget)?;
    let now = core.state.physical.header.sim_time;
    let count = owners.iter().try_fold(0usize, |count, owner| {
        if !owner.collection.coverage().complete {
            return Err(ExperienceError::Unavailable);
        }
        count
            .checked_add(
                owner
                    .collection
                    .records()
                    .filter(|record| possible(record.header(), events, now))
                    .count(),
            )
            .ok_or(ExperienceError::Capacity)
    })?;
    let _reservation = budget
        .reserve(
            count
                .checked_mul(size_of::<Pending>())
                .ok_or(ExperienceError::Capacity)?,
        )
        .map_err(|_| ExperienceError::Capacity)?;
    let mut pending = Vec::new();
    pending
        .try_reserve_exact(count)
        .map_err(|_| ExperienceError::Capacity)?;
    for owner in owners.iter() {
        for record in owner
            .collection
            .records()
            .filter(|record| possible(record.header(), events, now))
        {
            pending.push(Pending {
                source: Arc::clone(record),
            });
        }
    }
    drop(owners);
    for pending in pending {
        let record = pending.source;
        let _decoded = budget
            .reserve(encoded_body_bound(record.payload())?)
            .map_err(|_| ExperienceError::Capacity)?;
        let fields: ObligationFields = serde_json::from_str(record.payload())
            .map_err(|_| ExperienceError::InvalidBody("commitment obligation"))?;
        let Some(mut obligation) = fields.obligation else {
            continue;
        };
        let revision = number(&obligation, "revision")?;
        let evidence_id = text(&obligation, "evidenceId")?;
        let completion = obligation.get("completion").map(object).transpose()?;
        let evidence = if let Some(completion) = completion {
            let kind = text(completion, "eventType")?;
            events.iter().find(|event|event.actor_id.as_deref()==Some(record.header.actor_id.as_str())&&event.id!=evidence_id&&event.event_type==kind
                &&completion.get("targetId").and_then(Value::as_str).filter(|target|!target.is_empty()).is_none_or(|target|event.target_id.as_deref()==Some(target))
                &&completion.get("definitionId").and_then(Value::as_str).filter(|id|!id.is_empty()).is_none_or(|id|
                    matches!(event.data.as_ref().and_then(|data|data.get("definitionId")),Some(crate::reception::EventScalar::Text(value)) if value==id)))
        } else {
            None
        };
        if let Some(event) = evidence {
            obligation.insert("fulfilledBy".to_owned(), Value::String(event.id.clone()));
            obligation.insert("fulfilledAt".to_owned(), Value::from(event.at));
            obligation.insert("status".to_owned(), Value::String("fulfilled".to_owned()));
        } else if text(&obligation, "status")? == "active"
            && obligation
                .get("dueAt")
                .and_then(Value::as_f64)
                .is_some_and(|at| now >= at)
        {
            obligation.insert("status".to_owned(), Value::String("overdue".to_owned()));
        } else {
            continue;
        }
        obligation.insert("revision".to_owned(), Value::from(revision + 1.0));
        let proposed = crate::encoding::json_record(&obligation)
            .map_err(|_| ExperienceError::InvalidBody("commitment replacement"))?;
        if let Some(plan) = prepare_obligation_replacement(
            core.state,
            &record.header.actor_id,
            &record.header.reference.id,
            revision,
            proposed,
            budget,
        )? {
            apply_obligation_replacement(core, plan)?;
        }
    }
    Ok(())
}
pub(crate) fn next_commitment_deadline(
    state: &crate::simulation::SimulationState,
    budget: &ByteBudget,
) -> Result<f64, ExperienceError> {
    let owners = state.experience.memory_owners(budget)?;
    let mut next = f64::INFINITY;
    for owner in owners.iter() {
        if !owner.collection.coverage().complete {
            return Err(ExperienceError::Unavailable);
        }
        for source in owner.collection.records() {
            if let Some(at) = source.header().obligation_due_at {
                if at > state.physical.header.sim_time {
                    next = next.min(at)
                }
            }
        }
    }
    Ok(next)
}
