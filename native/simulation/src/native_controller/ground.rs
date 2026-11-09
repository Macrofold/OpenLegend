//! Ground response turn boundaries. A route request is an intention; the actual
//! movement owner still admits its full path and rechecks changed occupied bodies.

use super::{begin_ground_proposal, selected_profile};
use crate::execution::{ActionWrite, ExecutionError, PhysicalMutation, PlanGenerationWrite};
use crate::native_danger::DangerAssessment;
use crate::native_refuge::danger_separation;
use crate::native_response::{BlockedResponse, LocomotionMode, ResponseMode};
use crate::simulation::{InstalledWorld, PhysicalState};
use crate::spatial::{Extent, distance};

pub(crate) enum GroundTurn {
    None,
    /// The private turn seeded a proposal and must resolve its actual ordered
    /// support probes before it can ask for a route or become ready.
    Candidate {
        stop_on_failure: bool,
    },
    /// An existing saved proposal is current. A native host may prepare it
    /// asynchronously under its entity-local source binding, not a world-cut veto.
    Route {
        stop_on_failure: bool,
    },
}

pub(crate) fn proposal_current(
    physical: &PhysicalState,
    installed: &InstalledWorld,
    actor_id: &str,
) -> Result<bool, ExecutionError> {
    let Some(animal) = physical.entities.get(actor_id) else {
        return Ok(false);
    };
    let (Some(actor), Some(state)) = (&animal.actor, &animal.animal) else {
        return Ok(false);
    };
    let Some(episode) = &state.episode else {
        return Ok(false);
    };
    let Some(proposal) = &episode.proposal else {
        return Ok(false);
    };
    if actor.controller != "native"
        || !actor.alive
        || actor.incapacitated
        || !animal.actively_participates()
        || state.physical_life != actor.physical_life.unwrap_or(0)
        || installed
            .capabilities
            .capability_blocked(Some(animal), "locomotion")?
        || proposal.geometry_revision != installed.geometry.spatial.revision
        || selected_profile(installed, state).is_err()
    {
        return Ok(false);
    }
    let Some(position) = animal.supported_position() else {
        return Ok(false);
    };
    let body = animal.body_profile();
    Ok(position.surface_id == proposal.origin.surface_id
        && distance(position.point(), proposal.origin.point()) <= 1e-7
        && proposal.movement_id.as_deref()
            == actor.action.as_ref().map(|action| action.id.as_str())
        && body.radius == proposal.body.radius
        && body.height == proposal.body.height
        && body.max_slope == proposal.body.max_slope)
}

pub(super) fn physical_unavailable(
    physical: &PhysicalState,
    installed: &InstalledWorld,
    actor_id: &str,
) -> Result<bool, ExecutionError> {
    let animal = physical
        .entities
        .get(actor_id)
        .ok_or(ExecutionError::MissingEntity)?;
    let actor = animal.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
    Ok(actor.incapacitated
        || !animal.actively_participates()
        || installed
            .capabilities
            .capability_blocked(Some(animal), "locomotion")?
        || installed
            .capabilities
            .capability_blocked(Some(animal), "actions")?
        || animal.spatial.fall_velocity.is_some()
        || animal.supported_position().is_none())
}

pub(super) fn block_response(
    mutation: &mut PhysicalMutation<'_>,
    installed: &InstalledWorld,
    actor_id: &str,
    physical_unavailable: bool,
) -> Result<(), ExecutionError> {
    let animal = mutation
        .state
        .entities
        .get(actor_id)
        .and_then(|entity| entity.animal.as_ref())
        .ok_or(ExecutionError::Invariant)?;
    let review = mutation.state.header.sim_time
        + selected_profile(installed, animal)?.blocked_review_seconds;
    let blocked = if physical_unavailable {
        BlockedResponse {
            reason: "capability-unavailable".into(),
            basis: "physical-capability".into(),
        }
    } else {
        BlockedResponse {
            reason: "perception-unavailable".into(),
            basis: "perception".into(),
        }
    };
    mutation.reserve_response_growth(blocked.reason.capacity() + blocked.basis.capacity())?;
    let episode = mutation
        .snapshot_episode(actor_id)?
        .as_mut()
        .ok_or(ExecutionError::Invariant)?;
    episode.mode = ResponseMode::Blocked;
    episode.review_at = review;
    episode.blocked = Some(blocked);
    episode.clear_since = None;
    episode.proposal = None;
    mutation.behavior_changed(actor_id, false)
}

pub(crate) fn ground_turn(
    mutation: &mut PhysicalMutation<'_>,
    installed: &InstalledWorld,
    actor_id: &str,
    frame: &DangerAssessment,
    epsilon: f64,
) -> Result<GroundTurn, ExecutionError> {
    frame.require_current(mutation.state, actor_id)?;
    let at = mutation.state.header.sim_time;
    let animal = mutation
        .state
        .entities
        .get(actor_id)
        .ok_or(ExecutionError::MissingEntity)?;
    let actor = animal.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
    let state = animal.animal.as_ref().ok_or(ExecutionError::Invariant)?;
    if actor.controller != "native"
        || !actor.alive
        || state.physical_life != actor.physical_life.unwrap_or(0)
    {
        return Err(ExecutionError::Invariant);
    }
    if animal.spatial.flight.is_some() || state.foraging.is_some() {
        return Err(ExecutionError::UnsupportedFamily);
    }
    let episode = state.episode.as_ref().ok_or(ExecutionError::Invariant)?;
    let profile = selected_profile(installed, state)?;
    if episode.review_at > at && episode.proposal.is_none() {
        return Ok(GroundTurn::None);
    }
    let physical_unavailable = physical_unavailable(mutation.state, installed, actor_id)?;
    if physical_unavailable || !frame.complete {
        block_response(mutation, installed, actor_id, physical_unavailable)?;
        return Ok(GroundTurn::None);
    }
    let action = actor.action.as_ref();
    let owned = action.is_some_and(|action| {
        episode.movement.as_ref().is_some_and(|movement| {
            action.id == movement.id
                && action
                    .native_locomotion
                    .as_ref()
                    .and_then(|native| native.episode_id.as_deref())
                    == Some(episode.id.as_str())
        })
    });
    let point = animal
        .world_position()
        .ok_or(ExecutionError::InvalidPosition)?;
    let body = animal.body_profile();
    let extent = Extent {
        radius: body.radius,
        height: body.height,
    };
    let clear = frame.records.iter().all(|key| {
        episode.dangers.get(key).is_some_and(|danger| {
            danger_separation(point, extent, danger, profile, at)
                >= profile.avoidance_distance + profile.clearance_margin
        })
    });
    let leg_finished = episode.acoustic_leg_required == Some(true)
        && episode
            .refuge
            .as_ref()
            .is_some_and(|refuge| distance(point, refuge.point.point()) <= epsilon);
    let acoustic_required = episode.acoustic_leg_required == Some(true) && !leg_finished;
    let settling = !owned && action.is_none() && clear && !acoustic_required;
    let start_settling = settling && episode.clear_since.is_none();
    let next_review = |mode: ResponseMode, clear_since: Option<f64>| {
        let mut next = at
            + if mode == ResponseMode::Blocked {
                profile.blocked_review_seconds
            } else {
                profile.review_seconds
            };
        if let Some(since) = clear_since {
            next = next.min(since + profile.settling_seconds);
        }
        for key in &frame.records {
            if let Some(danger) = episode.dangers.get(key) {
                next = next.min(danger.expires_at(profile));
            }
        }
        next
    };
    let clear_since = episode.clear_since.or(settling.then_some(at));
    let settling_done =
        settling && at >= clear_since.ok_or(ExecutionError::Invariant)? + profile.settling_seconds;
    let wait_for_action = action.is_some_and(|action| {
        !owned
            && action
                .native_locomotion
                .as_ref()
                .is_none_or(|native| native.mode != LocomotionMode::Travel)
    });
    let keep_owned = owned
        && episode.proposal.is_none()
        && episode.mode == ResponseMode::Escaping
        && episode.review_at <= at
        && episode
            .refuge
            .as_ref()
            .is_some_and(|refuge| distance(point, refuge.point.point()) > epsilon);
    let next = next_review(
        if start_settling {
            ResponseMode::Settling
        } else {
            episode.mode
        },
        if clear { clear_since } else { None },
    );
    let stale_proposal = !settling
        && !wait_for_action
        && !keep_owned
        && episode.proposal.is_some()
        && !proposal_current(mutation.state, installed, actor_id)?;
    let seed = (episode.proposal.is_none() || stale_proposal)
        && !settling
        && !wait_for_action
        && !keep_owned;
    let stop_action = seed && owned;
    let action_id = if stop_action {
        action.map(|action| action.id.clone())
    } else {
        None
    };
    let retire_movement = episode.movement.is_some() && !owned;
    if settling_done {
        *mutation.snapshot_episode(actor_id)? = None;
        mutation.behavior_changed(actor_id, false)?;
        return Ok(GroundTurn::None);
    }
    if leg_finished
        || retire_movement
        || settling
        || !clear
        || stale_proposal
        || wait_for_action
        || keep_owned
    {
        let episode = mutation
            .snapshot_episode(actor_id)?
            .as_mut()
            .ok_or(ExecutionError::Invariant)?;
        if leg_finished {
            episode.acoustic_leg_required = None;
        }
        if retire_movement {
            episode.movement = None;
        }
        if !clear {
            episode.clear_since = None;
        }
        if stale_proposal {
            episode.proposal = None;
        }
        if settling {
            episode.clear_since = clear_since;
            if start_settling {
                episode.mode = ResponseMode::Settling;
            }
            episode.proposal = None;
            episode.blocked = None;
        }
        if settling || wait_for_action || keep_owned {
            episode.review_at = next;
        }
    }
    if settling || wait_for_action {
        mutation.behavior_changed(actor_id, false)?;
        return Ok(GroundTurn::None);
    }
    if keep_owned {
        mutation.animal_clock_changed(actor_id)?;
        return Ok(GroundTurn::None);
    }
    if let Some(id) = action_id {
        mutation.release_work(&id)?;
        mutation.replace_action(
            actor_id,
            None,
            ActionWrite {
                generation: PlanGenerationWrite::Preserve,
                behavior: None,
            },
        )?;
        mutation
            .snapshot_episode(actor_id)?
            .as_mut()
            .ok_or(ExecutionError::Invariant)?
            .movement = None;
    }
    if seed {
        begin_ground_proposal(mutation, installed, actor_id, frame, epsilon)?;
        Ok(GroundTurn::Candidate {
            stop_on_failure: owned,
        })
    } else {
        Ok(GroundTurn::Route {
            stop_on_failure: owned,
        })
    }
}
