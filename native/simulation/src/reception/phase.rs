//! Time-only retirement changes held availability; it never samples a body or
//! moves its measurement dates. The outer receiving phase owns its ordering.
use super::*;
use crate::attention::AttentionRelationFamily;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::ByteBudget;
use std::mem::size_of;
/// The complete recording phase retires participation before asking whether a
/// new observation is due. Quiet native bodies retain acoustic-source bindings.
pub(super) fn prepare_observer_phase(
    core: &mut CoreMutation<'_>,
    observer: &str,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    begin_perception_phase(core, observer, budget)?;
    let Some(entity) = core.state.physical.entities.get(observer) else {
        return Ok(());
    };
    let Some(actor) = entity.actor.as_ref() else {
        return Ok(());
    };
    let alive = actor.alive;
    let active = entity.actively_participates();
    let memory = entity.has_memory();
    let native = actor.controller == "native" && entity.animal.is_some();
    let episode = entity
        .animal
        .as_ref()
        .is_some_and(|animal| animal.episode.is_some());
    let sight = super::sensors::vision_parameters(&core.state.installed, entity).radius > 0.0
        && !core
            .state
            .installed
            .capabilities
            .capability_blocked(Some(entity), "perception")?;
    if alive && active && !sight {
        // The selected restrictive-status owner has already ended perception.
        // Live sight-only revocation requires its own modality/grace owner;
        // an opaque family must never erase unrelated hearing to imitate it.
        let unconverted = core
            .state
            .reception
            .perception_evidence
            .as_ref()
            .and_then(|owners| owners.get(observer))
            .is_some_and(|owner| {
                owner.geometry.is_some()
                    || owner.current.values().any(|contact| {
                        contact
                            .content
                            .groups
                            .iter()
                            .any(|group| group.received.grant.modality == Modality::Sight)
                    })
            });
        if unconverted {
            return Err(ExecutionError::UnsupportedFamily);
        }
        core.journal
            .episodes
            .clear_observer(&mut core.state.reception, observer)?;
    }
    if alive && active && memory {
        return Ok(());
    }
    if !alive || !active || !(native && episode) {
        end_current_evidence(core, observer, budget)?;
    }
    core.journal
        .current
        .clear_visibility(&mut core.state.reception, observer)?;
    core.journal
        .current
        .clear_visible_places(&mut core.state.reception, observer)?;
    if !alive || !active || !native {
        core.journal
            .episodes
            .clear_observer(&mut core.state.reception, observer)?;
    }
    core.physical().clear_contacts(observer)?;
    Ok(())
}
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
