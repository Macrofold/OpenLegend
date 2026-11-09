//! Scheduling consumes held selection and continuation dates, without acquiring
//! another body or advancing the relation owner. See
//! docs/simulation-time.md#extensible-boundary-ownership.
use super::*;
use crate::host::ByteBudget;

pub(crate) fn next_attention_work_at(
    physical: &PhysicalState,
    reception: &ReceptionState,
    installed: &InstalledWorld,
    observer: &str,
    budget: &ByteBudget,
) -> Result<Option<f64>, ReceivedError> {
    let Some(state) = owner(reception, observer).and_then(|owner| owner.attention.as_ref()) else {
        return Ok(None);
    };
    let count = state
        .entries
        .len()
        .checked_add(state.annotations.len())
        .and_then(|n| n.checked_add(1))
        .ok_or_else(capacity)?;
    let text = state
        .entries
        .iter()
        .map(|entry| entry.key.len())
        .chain(state.annotations.keys().map(String::len))
        .try_fold(0usize, |sum, bytes| sum.checked_add(bytes))
        .ok_or_else(capacity)?;
    let _guard = budget
        .reserve(
            heap_sum([
                map_storage::<String, ()>(count).ok_or_else(capacity)?,
                state
                    .annotations
                    .len()
                    .checked_mul(size_of::<(&String, &AttentionAnnotation)>())
                    .ok_or_else(capacity)?,
                text.checked_mul(8).ok_or_else(capacity)?,
                count.checked_mul(96).ok_or_else(capacity)?,
            ])
            .ok_or_else(capacity)?,
        )
        .map_err(|_| capacity())?;
    let mut next = f64::INFINITY;
    for anchor in relation_keys(state, target(physical, observer), physical.header.sim_time) {
        if let Some(candidate) = state.annotations.get(&anchor) {
            if candidate.urgency > 0.0 {
                next = next.min(candidate.urgency_through.unwrap_or(f64::INFINITY));
            }
            if candidate.direct {
                next = next.min(candidate.direct_through.unwrap_or(f64::INFINITY));
            }
        }
        for family in [
            AttentionRelationFamily::ClosingBody,
            AttentionRelationFamily::ClosingDrop,
        ] {
            let key = relation_key(&anchor, family)?;
            if state.relation_dirty.contains_key(&key) {
                next = next.min(state.next_relation_at);
            }
            if let Some(since) = state
                .latches
                .get(&key)
                .filter(|latch| latch.active)
                .and_then(|latch| latch.clear_since)
            {
                next = next.min(state.next_relation_at.max(relations::elapsed_deadline(
                    since,
                    installed.attention.value().relation.clear_seconds,
                )));
            }
        }
    }
    Ok(next.is_finite().then_some(next))
}
