//! Time-only retirement changes held availability; it never samples a body or
//! moves its measurement dates. The outer receiving phase owns its ordering.
use super::*;
use crate::attention::AttentionRelationFamily;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::ByteBudget;
use std::mem::size_of;
/// Source's time-only phase precedes due-sense decisions, including observers
/// that do not take a new physical sample at this cut.
pub(crate) fn begin_perception_phase(
    core: &mut CoreMutation<'_>,
    observer: &str,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    expire_received_geometry_motion(core, observer, budget)?;
    retire_expired_motion(core, observer, budget)?;
    core.journal.originals.begin_phase(
        &mut core.state.reception,
        observer,
        core.state.physical.header.sim_time,
        core.state.physical.header.sequence,
    )?;
    Ok(())
}
pub(super) fn retire_motion_subjects<'a>(
    core: &mut CoreMutation<'_>,
    observer: &str,
    ids: impl IntoIterator<Item = &'a str>,
) -> Result<bool, ExecutionError> {
    let mut changed = false;
    for id in ids {
        if core
            .state
            .reception
            .perception_evidence
            .as_ref()
            .and_then(|r| r.get(observer))
            .and_then(|r| r.motion_samples.as_ref())
            .is_some_and(|r| r.contains_key(id))
        {
            core.journal
                .current
                .set_motion(&mut core.state.reception, observer, id, None)?;
            changed = true;
        }
    }
    if changed {
        core.journal
            .current
            .refresh_motion_expiry(&mut core.state.reception, observer)?;
        attention_control::dirty_attention_relations(
            &core.state.physical,
            &mut core.state.reception,
            &mut core.journal.current,
            observer,
            &[
                AttentionRelationFamily::ClosingBody,
                AttentionRelationFamily::ClosingDrop,
            ],
        )?;
    }
    Ok(changed)
}
pub(super) fn retire_expired_motion(
    core: &mut CoreMutation<'_>,
    observer: &str,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let now = core.state.physical.header.sim_time;
    let Some(current) = core
        .state
        .reception
        .perception_evidence
        .as_ref()
        .and_then(|r| r.get(observer))
    else {
        return Ok(());
    };
    if current.motion_expires_at.is_none_or(|at| at > now) {
        return Ok(());
    }
    let Some(samples) = current.motion_samples.as_ref() else {
        return Ok(());
    };
    let bytes = samples
        .iter()
        .filter(|(_, s)| s.expires_at <= now)
        .try_fold(0usize, |sum, (id, _)| {
            sum.checked_add(size_of::<String>())?.checked_add(id.len())
        })
        .ok_or(ExecutionError::Capacity)?;
    let _reservation = budget.reserve(bytes)?;
    let count = samples.values().filter(|s| s.expires_at <= now).count();
    let mut expired = Vec::new();
    expired
        .try_reserve_exact(count)
        .map_err(|_| ExecutionError::Capacity)?;
    expired.extend(
        samples
            .iter()
            .filter(|(_, s)| s.expires_at <= now)
            .map(|(id, _)| id.clone()),
    );
    if expired.is_empty() {
        return Ok(());
    }
    retire_motion_subjects(core, observer, expired.iter().map(String::as_str))?;
    Ok(())
}
