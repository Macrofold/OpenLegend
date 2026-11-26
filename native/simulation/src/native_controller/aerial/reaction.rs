//! The single response episode owns redirection, fallback and settling. Moving
//! the body after a choice still belongs to the ordinary flight cursor.
use super::{AerialStep, Choice, selected_profile};
use crate::execution::{ActionWrite, CoreMutation, ExecutionError, PlanGenerationWrite};
use crate::flight::{FlightConnectionKind, FlightLocomotion, FlightProgress};
use crate::host::ByteBudget;
use crate::native_danger::DangerAssessment;
use crate::native_refuge::danger_separation;
use crate::native_response::{
    BlockedResponse, LocomotionMode, MovementKind, NativeRefuge, ResponseMode, ResponseMovement,
};
use crate::spatial::{Extent, distance};
use crate::state::{Entity, Point, SurfacePoint};

pub(super) fn no_usable_flight(
    core: &mut CoreMutation<'_>,
    id: &str,
    root: &str,
) -> Result<AerialStep, ExecutionError> {
    let installed = core.state.installed.clone();
    let handle = core
        .state
        .physical
        .entities
        .handle(id)
        .ok_or(ExecutionError::MissingEntity)?;
    let entity = core
        .state
        .physical
        .entities
        .resolve(handle)
        .ok_or(ExecutionError::Invariant)?;
    if entity.supported_position().is_some() {
        let mut mutation = core.physical();
        mutation.replace_flight(handle, None, None)?;
        mutation.behavior_changed(id, false)?;
        return Ok(AerialStep::Ground);
    }
    let state = entity.animal.as_ref().ok_or(ExecutionError::Invariant)?;
    let profile = selected_profile(&installed, state)?;
    let next_review = core.state.physical.header.sim_time + profile.blocked_review_seconds;
    let mut mutation = core.physical();
    let reason = "no-usable-flight";
    mutation.reserve_response_growth(reason.len() + root.len())?;
    mutation.replace_flight(handle, None, Some(0.0))?;
    let episode = mutation
        .snapshot_episode(id)?
        .as_mut()
        .ok_or(ExecutionError::Invariant)?;
    episode.mode = ResponseMode::Blocked;
    episode.blocked = Some(BlockedResponse {
        reason: reason.into(),
        basis: root.into(),
    });
    episode.movement = None;
    episode.proposal = None;
    episode.clear_since = None;
    episode.review_at = next_review;
    mutation.behavior_changed(id, false)?;
    Ok(AerialStep::Handled)
}

pub(crate) fn separation_is_clear(
    entity: &Entity,
    point: Point,
    frame: &DangerAssessment,
    profile: &crate::native_response::NativeResponseProfile,
    at: f64,
) -> Result<bool, ExecutionError> {
    let episode = entity
        .animal
        .as_ref()
        .and_then(|state| state.episode.as_ref())
        .ok_or(ExecutionError::Invariant)?;
    let extent = entity.body_profile();
    let extent = Extent {
        radius: extent.radius,
        height: extent.height,
    };
    Ok(frame.records.iter().all(|key| {
        episode.dangers.get(key).is_some_and(|danger| {
            danger_separation(point, extent, danger, profile, at)
                >= profile.avoidance_distance + profile.clearance_margin
        })
    }))
}

pub(super) fn next_review(
    episode: &crate::native_response::NativeResponseEpisode,
    profile: &crate::native_response::NativeResponseProfile,
    frame: &DangerAssessment,
    at: f64,
) -> f64 {
    let wait = if episode.mode == ResponseMode::Blocked {
        profile.blocked_review_seconds
    } else {
        profile.review_seconds
    };
    let mut next = at + wait;
    if let Some(clear) = episode.clear_since {
        next = next.min(clear + profile.settling_seconds);
    }
    for key in &frame.records {
        if let Some(danger) = episode.dangers.get(key) {
            next = next.min(danger.expires_at(profile));
        }
    }
    next
}

pub(super) fn defer(
    core: &mut CoreMutation<'_>,
    id: &str,
    seconds: f64,
) -> Result<(), ExecutionError> {
    let next = core.state.physical.header.sim_time + seconds;
    let mut mutation = core.physical();
    mutation
        .snapshot_episode(id)?
        .as_mut()
        .ok_or(ExecutionError::Invariant)?
        .review_at = next;
    mutation.animal_clock_changed(id)
}

pub(super) fn settle_or_wait(
    core: &mut CoreMutation<'_>,
    id: &str,
    frame: &DangerAssessment,
) -> Result<bool, ExecutionError> {
    let installed = core.state.installed.clone();
    let entity = core
        .state
        .physical
        .entities
        .get(id)
        .ok_or(ExecutionError::MissingEntity)?;
    let actor = entity.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
    let state = entity.animal.as_ref().ok_or(ExecutionError::Invariant)?;
    let episode = state.episode.as_ref().ok_or(ExecutionError::Invariant)?;
    let profile = selected_profile(&installed, state)?;
    let position = entity
        .world_position()
        .ok_or(ExecutionError::InvalidPosition)?;
    let flight = entity.spatial.flight.as_ref();
    let action = actor.action.as_ref();
    let at = core.state.physical.header.sim_time;
    let clear = separation_is_clear(entity, position, frame, profile, at)?;
    let finished = episode.acoustic_leg_required.is_some()
        && episode.refuge.as_ref().is_some_and(|refuge| {
            distance(position, refuge.point.point()) <= installed.spatial.epsilon
        });
    let can_settle = action.is_none()
        && clear
        && (episode.acoustic_leg_required.is_none() || finished)
        && entity.supported_position().is_some()
        && flight.is_none_or(|f| f.at_rest.is_some() || f.wait_seconds > 0.0);
    let wait_for_work = action.is_some_and(|action| {
        action.native_locomotion.as_ref().is_none_or(|binding| {
            binding.mode != LocomotionMode::Travel
                && binding.episode_id.as_deref() != Some(episode.id.as_str())
        })
    });
    if can_settle {
        let handle = core
            .state
            .physical
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingEntity)?;
        if let Some(flight) = flight {
            crate::flight::hold_response_perch(
                core,
                handle,
                installed.spatial.epsilon,
                at >= episode.clear_since.unwrap_or(at) + profile.settling_seconds,
            )?;
        }
        let still = core
            .state
            .physical
            .entities
            .get(id)
            .and_then(|entity| entity.animal.as_ref())
            .and_then(|state| state.episode.as_ref())
            .ok_or(ExecutionError::Invariant)?;
        let clear_since = still.clear_since.unwrap_or(at);
        let next =
            next_review(still, profile, frame, at).min(clear_since + profile.settling_seconds);
        let mut mutation = core.physical();
        let slot = mutation.snapshot_episode(id)?;
        if at >= clear_since + profile.settling_seconds {
            *slot = None;
        } else {
            let episode = slot.as_mut().ok_or(ExecutionError::Invariant)?;
            episode.mode = ResponseMode::Settling;
            episode.clear_since = Some(clear_since);
            episode.review_at = next;
            episode.proposal = None;
            episode.blocked = None;
            episode.acoustic_leg_required = None;
        }
        mutation.behavior_changed(id, false)?;
        return Ok(true);
    }
    let next = next_review(episode, profile, frame, at);
    if finished || (!clear && episode.clear_since.is_some()) || wait_for_work {
        let mut mutation = core.physical();
        let episode = mutation
            .snapshot_episode(id)?
            .as_mut()
            .ok_or(ExecutionError::Invariant)?;
        if finished {
            episode.acoustic_leg_required = None;
        }
        if !clear {
            episode.clear_since = None;
        }
        if wait_for_work {
            episode.review_at = next;
        }
        mutation.behavior_changed(id, false)?;
    }
    Ok(wait_for_work)
}

pub(super) fn commit(
    core: &mut CoreMutation<'_>,
    id: &str,
    choice: &Choice,
    draw: Option<f64>,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let installed = core.state.installed.clone();
    let handle = core
        .state
        .physical
        .entities
        .handle(id)
        .ok_or(ExecutionError::MissingEntity)?;
    let entity = core
        .state
        .physical
        .entities
        .resolve(handle)
        .ok_or(ExecutionError::MissingEntity)?;
    let actor = entity.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
    let state = entity.animal.as_ref().ok_or(ExecutionError::Invariant)?;
    let episode = state.episode.as_ref().ok_or(ExecutionError::Invariant)?;
    let profile = selected_profile(&installed, state)?;
    let route_id = &choice.connection.route_id;
    let route = installed
        .retained
        .flight_corridors
        .get(route_id)
        .ok_or(ExecutionError::Invariant)?;
    let at = core.state.physical.header.sim_time;
    let generation = episode
        .proposal_generation
        .checked_add(1)
        .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
        .ok_or(ExecutionError::Capacity)?;
    let landing = (choice.connection.kind == FlightConnectionKind::Landing)
        .then(|| route.points.last())
        .flatten()
        .and_then(|point| point.landing_surface_id.as_deref());
    let bytes = 2 * route_id.len()
        + episode.profile_pin.id.len()
        + episode.profile_pin.digest.len()
        + episode.id.len()
        + episode.locomotion.len()
        + landing.map_or(0, str::len)
        + 64
        + actor.action.as_ref().map_or(0, |action| action.id.len());
    let _held = budget.reserve(bytes)?;
    let action = actor.action.as_ref().map(|action| action.id.clone());
    let pin = episode.profile_pin.clone();
    let locomotion = episode.locomotion.clone();
    let episode_id = episode.id.clone();
    let life = state.physical_life;
    let acoustic = episode
        .acoustic_cue
        .as_ref()
        .map(|cue| cue.sound.direction.clone());
    let geometry_revision = core.state.geometry_revision();
    let mut mutation = core.physical();
    mutation.reserve_response_growth(bytes)?;
    let id_issued = mutation.allocate("native-flight")?.id;
    if let Some(action) = action {
        mutation.release_work(&action)?;
        mutation.replace_action(
            id,
            None,
            ActionWrite {
                generation: PlanGenerationWrite::Advance,
                behavior: None,
            },
        )?;
    }
    mutation.replace_flight(
        handle,
        Some(FlightProgress {
            route_id: route_id.clone(),
            next: choice.connection.next,
            wait_seconds: 0.0,
            at_rest: None,
            native_locomotion: Some(FlightLocomotion {
                profile: pin,
                locomotion,
                mode: LocomotionMode::Escape,
                episode_id,
                physical_life: life,
                generation,
                id: id_issued.clone(),
                route_digest: route.digest.clone(),
                selected_at: at,
                geometry_revision,
                draw,
                stop_at: (choice.connection.kind == FlightConnectionKind::Transit)
                    .then_some(choice.connection.next),
            }),
            awaiting_choice: None,
            stop_at_landing: None,
        }),
        None,
    )?;
    let episode = mutation
        .snapshot_episode(id)?
        .as_mut()
        .ok_or(ExecutionError::Invariant)?;
    episode.refuge = landing.map(|surface_id| NativeRefuge {
        acoustic_direction: acoustic,
        point: SurfacePoint {
            x: choice.destination.x,
            y: choice.destination.y,
            z: choice.destination.z,
            surface_id: surface_id.to_owned(),
        },
        selected_at: at,
        generation,
        draw,
        flight_route_id: Some(route_id.clone()),
    });
    episode.movement = Some(ResponseMovement {
        kind: MovementKind::Flight,
        id: id_issued,
    });
    episode.proposal_generation = generation;
    episode.mode = ResponseMode::Escaping;
    episode.review_at = at + profile.review_seconds;
    episode.proposal = None;
    episode.clear_since = None;
    episode.blocked = None;
    mutation.behavior_changed(id, false)
}
