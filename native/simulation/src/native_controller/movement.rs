//! Successful native movement owns the episode/wander consequence before the
//! controller's transition advances sequence or publishes sensory changes.
use super::*;
use crate::commands::NativeMovementInput;
use crate::execution::CoreMutation;

pub(crate) fn movement_refused(
    core: &mut CoreMutation<'_>,
    actor: &str,
    outcome: &crate::commands::Outcome,
) -> Result<(), ExecutionError> {
    let Some(state) = core
        .state
        .physical
        .entities
        .get(actor)
        .and_then(|entity| entity.animal.as_ref())
        .filter(|state| state.episode.is_some())
    else {
        return Ok(());
    };
    let Ok(profile) = selected_profile(&core.state.installed, state) else {
        return Ok(());
    };
    let review_at = core.state.physical.header.sim_time + profile.blocked_review_seconds;
    let mut mutation = core.physical();
    mutation.reserve_response_growth(outcome.code.len() + "movement-admission".len())?;
    let episode = mutation
        .snapshot_episode(actor)?
        .as_mut()
        .ok_or(ExecutionError::Invariant)?;
    episode.mode = ResponseMode::Blocked;
    episode.review_at = review_at;
    episode.blocked = Some(BlockedResponse {
        reason: outcome.code.clone(),
        basis: "movement-admission".into(),
    });
    episode.proposal = None;
    mutation.animal_clock_changed(actor)
}

pub(crate) fn complete_movement(
    core: &mut CoreMutation<'_>,
    actor_id: &str,
    action_id: &str,
    movement: NativeMovementInput,
) -> Result<(), ExecutionError> {
    let installed = core.state.installed.clone();
    let entity = core
        .state
        .physical
        .entities
        .get(actor_id)
        .ok_or(ExecutionError::MissingActor)?;
    let animal = entity
        .animal
        .as_ref()
        .ok_or(ExecutionError::UnsupportedFamily)?;
    let action = entity
        .actor
        .as_ref()
        .and_then(|actor| actor.action.as_ref())
        .ok_or(ExecutionError::Invariant)?;
    if action.id != action_id || action.native_locomotion.as_ref() != Some(&movement.binding) {
        return Err(ExecutionError::Invariant);
    }
    let at = core.state.physical.header.sim_time;
    if matches!(movement.binding.mode, LocomotionMode::Escape) {
        let episode = animal.episode.as_ref().ok_or(ExecutionError::Invariant)?;
        let profile = installed
            .response_profiles
            .get(&profile_key(&episode.profile_pin).map_err(|_| ExecutionError::Invariant)?)
            .ok_or(ExecutionError::UnsupportedFamily)?
            .value();
        let next_review = at + profile.review_seconds;
        let mut mutation = core.physical();
        mutation.reserve_response_growth(
            action_id.len()
                + movement.route.candidate.point.surface_id.len()
                + std::mem::size_of::<NativeRefuge>(),
        )?;
        let episode = mutation
            .snapshot_episode(actor_id)?
            .as_mut()
            .ok_or(ExecutionError::Invariant)?;
        episode.refuge = Some(NativeRefuge {
            acoustic_direction: episode.acoustic_cue.as_ref().map(|cue| cue.sound.direction),
            point: movement.route.candidate.point,
            selected_at: at,
            generation: episode.proposal_generation,
            draw: None,
            flight_route_id: None,
        });
        episode.movement = Some(ResponseMovement {
            kind: MovementKind::Action,
            id: action_id.into(),
        });
        episode.mode = ResponseMode::Escaping;
        episode.review_at = next_review;
        episode.proposal = None;
        episode.blocked = None;
        episode.clear_since = None;
    }
    reconcile_wander(
        &mut core.physical(),
        &installed,
        actor_id,
        installed.time_epsilon,
    )?;
    core.physical().animal_clock_changed(actor_id)?;
    // This is the actual locomotion admission writer. Source queues its sight
    // work here; private alarm/proposal updates continue to remain non-outward.
    core.physical().behavior_changed(actor_id, true)?;
    Ok(())
}
