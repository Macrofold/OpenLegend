//! Explicit preferences and late successful presentation use the same received
//! competition/cohort owner. Neither operation acquires sight, renews a body
//! receipt or acknowledges an event heard after the captured presentation.
use super::*;
use crate::attention::AttentionPresentation;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::ByteBudget;

fn select(
    core: &mut CoreMutation<'_>,
    observer: &str,
    changed: &[String],
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    if !core
        .state
        .physical
        .entities
        .get(observer)
        .is_some_and(|entity| entity.has_memory())
    {
        return Ok(());
    }
    let entity = core
        .state
        .physical
        .entities
        .get(observer)
        .ok_or(ExecutionError::MissingActor)?;
    let _observer_copy = budget.reserve(observer.len())?;
    let life = ObserverLife {
        actor_id: observer.to_owned(),
        physical_life: entity.physical_life().ok_or(ExecutionError::MissingActor)?,
    };
    // selectVisualAttention enters the same current reception owner even for
    // an empty presentation. This advances the original phase, and one actual
    // actor acquisition groups its terminal/admission writes before sealing.
    let mut lifetime = super::super::current_lifetime::CurrentReceptionLifetime::begin(
        core, &life, None, None, budget,
    )?;
    lifetime.ensure_prefix(core, budget)?;
    core.sync_attention_changes()?;
    update_attention(
        &core.state.physical,
        &mut core.state.reception,
        &core.state.installed,
        &core.state.experience,
        &mut core.journal.current,
        observer,
        AttentionUpdate {
            changed_source_ids: Some(changed),
            ..AttentionUpdate::default()
        },
    )?;
    if let Some(before) = lifetime.before.as_ref().map(std::sync::Arc::clone) {
        reconcile_current_cohort(core, before, None, budget)?;
    }
    lifetime.reconciled = true;
    lifetime.finish(core, budget)
}
pub(crate) fn set_attention_focus(
    core: &mut CoreMutation<'_>,
    observer: &str,
    keys: &[String],
    budget: &ByteBudget,
) -> Result<bool, ExecutionError> {
    let Some(current) = owner(&core.state.reception, observer) else {
        return Ok(false);
    };
    if current.attention.is_none() {
        // stateFor creates an empty attention owner before checking an invalid
        // preference; that actual creation survives an ordinary component refusal.
        let bound = crate::encoding::json_record_len(core.state.installed.attention.value())
            .map_err(|_| invalid())?
            .checked_mul(2)
            .and_then(|n| n.checked_add(size_of::<AttentionState>()))
            .ok_or_else(capacity)?;
        core.journal.current.reserve_growth(bound)?;
        let attention = initial_state(core.state.installed.attention.value())?;
        core.journal
            .current
            .replace_attention(&mut core.state.reception, observer, attention)?;
    }
    let current = owner(&core.state.reception, observer)
        .and_then(|owner| owner.attention.as_ref())
        .ok_or_else(invalid)?;
    if keys.len() > core.state.installed.attention.value().maximum_capacity as usize
        || keys
            .iter()
            .any(|key| !current.annotations.contains_key(key))
    {
        return Ok(false);
    }
    let unique = || {
        keys.iter()
            .enumerate()
            .filter(|(index, key)| !keys[..*index].contains(key))
            .map(|(_, key)| key)
    };
    if unique().eq(current.explicit.iter()) {
        return Ok(true);
    }
    let count = unique().count();
    let bytes = unique().try_fold(
        count
            .checked_mul(size_of::<String>())
            .ok_or_else(capacity)?,
        |n, key| n.checked_add(key.len()).ok_or_else(capacity),
    )?;
    core.journal.current.reserve_growth(bytes)?;
    let mut next = Vec::with_capacity(count);
    next.extend(unique().cloned());
    core.journal
        .current
        .attention_mut(&mut core.state.reception, observer)?
        .as_mut()
        .ok_or_else(invalid)?
        .explicit = next;
    core.journal
        .current
        .settle_attention(&mut core.state.reception, observer)?;
    select(core, observer, &[], budget)?;
    Ok(true)
}
pub(crate) fn acknowledge_attention(
    core: &mut CoreMutation<'_>,
    observer: &str,
    presented: &[AttentionPresentation],
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let Some(current) =
        owner(&core.state.reception, observer).and_then(|owner| owner.attention.as_ref())
    else {
        return Ok(());
    };
    let bound = presented.iter().try_fold(
        presented
            .len()
            .checked_mul(size_of::<String>())
            .ok_or_else(capacity)?,
        |n, value| {
            let Some(candidate) = current.annotations.get(&value.key) else {
                return Ok(n);
            };
            heap_sum([
                n,
                candidate.source_id.len(),
                value.description_revision.len(),
                value.change_revision.len(),
                value.point.heap_bytes().ok_or_else(capacity)?,
            ])
            .ok_or_else(capacity)
        },
    )?;
    core.journal.current.reserve_growth(bound)?;
    let mut changed = Vec::with_capacity(presented.len());
    {
        let current = core
            .journal
            .current
            .attention_mut(&mut core.state.reception, observer)?;
        let current = current.as_mut().ok_or_else(invalid)?;
        for value in presented {
            let Some(candidate) = current.annotations.get_mut(&value.key) else {
                continue;
            };
            candidate.presented_description = Some(value.description_revision.clone());
            candidate.presented_change = Some(value.change_revision.clone());
            if let Some(point) = &value.point {
                candidate.anchor = Some(point.clone());
            }
            changed.push(candidate.source_id.clone());
        }
    }
    core.journal
        .current
        .settle_attention(&mut core.state.reception, observer)?;
    for source in &changed {
        core.journal
            .current
            .note_attention_source(observer, source)?;
    }
    select(core, observer, &changed, budget)
}

/// A completed response resolves only the exact still-active presented cause.
/// Other motion, later descriptions and a new latch generation remain pending.
pub(crate) fn acknowledge_semantic_cause(
    core: &mut CoreMutation<'_>,
    observer: &str,
    key: &str,
    generation: u64,
    qualitative_revision: &str,
    severity: f64,
) -> Result<(), ExecutionError> {
    let Some(state) =
        owner(&core.state.reception, observer).and_then(|owner| owner.attention.as_ref())
    else {
        return Ok(());
    };
    let Some(latch) = state
        .latches
        .get(key)
        .filter(|latch| latch.active && latch.generation == generation)
    else {
        return Ok(());
    };
    let candidates = build_candidates(
        &core.state.physical,
        &core.state.reception,
        &core.state.installed,
        &core.state.experience,
        observer,
        state,
        Some(&[&latch.anchor_key]),
        &mut core.journal.current,
    )?;
    if candidates
        .get(&latch.anchor_key)
        .is_none_or(|candidate| candidate.description_revision != qualitative_revision)
    {
        return Ok(());
    }
    crate::execution::PhysicalMutation {
        state: &mut core.state.physical,
        journal: &mut core.journal.physical,
    }
    .resolve_semantic_cause(
        observer,
        key,
        qualitative_revision,
        severity,
        Some(&state.annotations),
    )
}
