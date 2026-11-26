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
    let now = physical.header.sim_time;
    let target = target(physical, observer);
    let is_direct_anchor = |annotation: &AttentionAnnotation| {
        Some(annotation.source_id.as_str()) == target
            || annotation.direct && annotation.direct_through.unwrap_or(f64::INFINITY) > now
    };
    // This is only a minimum over dates. Unlike the relation update, it
    // needs neither canonical ordering nor a unique, owned set of keys.
    let anchors = || {
        std::iter::once(SELF_RELATION_KEY)
            .chain(state.entries.iter().map(|entry| entry.key.as_str()))
            .chain(state.annotations.iter().filter_map(|(key, annotation)| {
                is_direct_anchor(annotation).then_some(key.as_str())
            }))
    };
    let mut next = f64::INFINITY;
    let mut longest_anchor = 0;
    for anchor in anchors() {
        longest_anchor = longest_anchor.max(anchor.len());
        if let Some(annotation) = state.annotations.get(anchor) {
            if annotation.urgency > 0.0 {
                next = next.min(annotation.urgency_through.unwrap_or(f64::INFINITY));
            }
            if annotation.direct {
                next = next.min(annotation.direct_through.unwrap_or(f64::INFINITY));
            }
        }
    }

    // The validated latch already carries the anchor identity. Only active
    // latches with a pending clear time can contribute another boundary.
    for latch in state.latches.values().filter(|latch| latch.active) {
        let Some(since) = latch.clear_since else {
            continue;
        };
        let anchor = latch.anchor_key.as_str();
        if anchor == SELF_RELATION_KEY
            || state.entries.iter().any(|entry| entry.key == anchor)
            || state.annotations.get(anchor).is_some_and(is_direct_anchor)
        {
            next = next.min(state.next_relation_at.max(relations::elapsed_deadline(
                since,
                installed.attention.value().relation.clear_seconds,
            )));
        }
    }

    if !state.relation_dirty.is_empty() && state.next_relation_at < next {
        // Only the dirty map needs its serialized key. Reuse a single
        // admitted buffer and stop at the first eligible dirty relation.
        // JSON can escape each input byte as at most six bytes; the two
        // finite relation names and tuple punctuation fit in the overhead.
        let bytes = longest_anchor
            .checked_mul(6)
            .and_then(|bytes| bytes.checked_add(32))
            .ok_or_else(capacity)?;
        let _guard = budget.reserve(bytes).map_err(|_| capacity())?;
        let mut key = Vec::new();
        key.try_reserve_exact(bytes).map_err(|_| capacity())?;
        'dirty: for anchor in anchors() {
            for family in [
                AttentionRelationFamily::ClosingBody,
                AttentionRelationFamily::ClosingDrop,
            ] {
                key.clear();
                crate::encoding::write_json_record(&(anchor, family), &mut key)
                    .map_err(|_| invalid())?;
                let key =
                    std::str::from_utf8(&key).expect("JSON serializer emitted non-UTF-8 data");
                if state.relation_dirty.contains_key(key) {
                    next = state.next_relation_at;
                    break 'dirty;
                }
            }
        }
    }

    Ok(next.is_finite().then_some(next))
}
