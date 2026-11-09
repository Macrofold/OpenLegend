//! The local-refuge controller consumes actual receiver products. Private alarm
//! and clock changes do not manufacture outward occurrences or received facts.

use crate::execution::{ExecutionError, PhysicalMutation};
use crate::experience::Awareness;
use crate::native_danger::DangerAssessment;
use crate::native_response::*;
use crate::reception::SoundAcquisition;
use crate::simulation::InstalledWorld;
use crate::state::EntityHandle;
use crate::work::{WorkMeters, WorkUnit};
use indexmap::IndexMap;

mod event;
pub(crate) use event::{acquire_event, event_reception_needed, require_supported_event};
mod ground;
pub(crate) use ground::{GroundTurn, ground_turn, proposal_current};
mod movement;
pub(crate) use movement::complete_movement;
mod response;
mod search;
mod wander;
pub(crate) use response::{
    CompletedGroundResponse, GroundResponseCursor, GroundResponseDecision, GroundResponseStep,
};
pub(crate) use wander::{CompletedWander, WanderCursor, WanderStep};

/// The ordinary animal turn alone creates this saved search. Geometry resumes
/// may fill its current candidate but never redraw its bearing, distance or side.
pub(crate) fn begin_ground_proposal(
    mutation: &mut PhysicalMutation<'_>,
    installed: &InstalledWorld,
    actor_id: &str,
    frame: &DangerAssessment,
    epsilon: f64,
) -> Result<(), ExecutionError> {
    frame.require_current(mutation.state, actor_id)?;
    if !frame.complete {
        return Err(ExecutionError::Invariant);
    }
    let animal = mutation
        .state
        .entities
        .get(actor_id)
        .ok_or(ExecutionError::MissingEntity)?;
    let support_bytes = match animal.placement.as_ref() {
        Some(crate::state::Placement::World {
            support_surface_id, ..
        }) => support_surface_id.as_ref().map_or(0, String::capacity),
        _ => 0,
    };
    let action_bytes = animal
        .actor
        .as_ref()
        .and_then(|actor| actor.action.as_ref())
        .map_or(0, |action| action.id.capacity());
    mutation.reserve_response_growth(
        frame
            .records
            .len()
            .saturating_mul(64)
            .saturating_add(512)
            .saturating_add(support_bytes)
            .saturating_add(action_bytes),
    )?;
    let draw = mutation.draw();
    let animal = mutation
        .state
        .entities
        .get(actor_id)
        .ok_or(ExecutionError::MissingEntity)?;
    let state = animal.animal.as_ref().ok_or(ExecutionError::Invariant)?;
    let episode = state.episode.as_ref().ok_or(ExecutionError::Invariant)?;
    if episode.proposal.is_some() || animal.spatial.flight.is_some() || state.foraging.is_some() {
        return Err(ExecutionError::UnsupportedFamily);
    }
    let profile = selected_profile(installed, state)?;
    let dangers: Vec<&NativeDanger> = frame
        .records
        .iter()
        .map(|key| episode.dangers.get(key).ok_or(ExecutionError::Invariant))
        .collect::<Result<_, _>>()?;
    let origin = animal
        .supported_position()
        .ok_or(ExecutionError::InvalidPosition)?;
    let bearing = crate::native_refuge::escape_bearing(origin.point(), &dangers, draw, epsilon);
    let generation = episode
        .proposal_generation
        .checked_add(1)
        .filter(|value| *value <= crate::identity::MAX_SAFE_INTEGER)
        .ok_or(ExecutionError::Identity)?;
    let body = animal.body_profile();
    let navigation_body = NavigationBody {
        radius: body.radius,
        height: body.height,
        max_slope: body.max_slope,
    };
    let movement_id = animal
        .actor
        .as_ref()
        .and_then(|actor| actor.action.as_ref())
        .map(|action| action.id.clone());
    let minimum = profile.candidates.distance.minimum;
    let span = profile.candidates.distance.maximum - minimum;
    let wait = profile.candidates.navigation_wait;
    let distance = minimum + mutation.draw() * span;
    let side = if mutation.draw() < 0.5 { -1.0 } else { 1.0 };
    let proposal = NativeRefugeProposal {
        generation,
        geometry_revision: installed.geometry.spatial.revision,
        at: mutation.state.header.sim_time,
        origin,
        movement_id,
        wait: Some(wait),
        search: Some(RefugeSearch {
            distance,
            bearing,
            side,
            attempted: 0,
            best: None,
        }),
        body: navigation_body,
        candidates: Vec::new(),
    };
    let episode = mutation
        .snapshot_episode(actor_id)?
        .as_mut()
        .ok_or(ExecutionError::Invariant)?;
    episode.proposal_generation = generation;
    episode.proposal = Some(proposal);
    Ok(())
}

/// Apply only the response consequences of the completed exposure read. New
/// estimates already belong to the episode; this step changes its review clock
/// only when the observed danger or actual movement makes that meaningful.
pub(crate) fn reconcile_exposure(
    mutation: &mut PhysicalMutation<'_>,
    installed: &InstalledWorld,
    meters: &mut WorkMeters,
    actor_id: &str,
    frame: &DangerAssessment,
    epsilon: f64,
) -> Result<(), ExecutionError> {
    frame.require_current(mutation.state, actor_id)?;
    mutation.reserve_response_growth(frame.records.len() * std::mem::size_of::<(&str, bool)>())?;
    let animal = mutation
        .state
        .entities
        .get(actor_id)
        .ok_or(ExecutionError::MissingEntity)?;
    let actor = animal.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
    if !actor.alive || actor.controller != "native" {
        return Ok(());
    }
    let state = animal.animal.as_ref().ok_or(ExecutionError::Invariant)?;
    let profile = selected_profile(installed, state)?;
    let episode = state.episode.as_ref().ok_or(ExecutionError::Invariant)?;
    let at = mutation.state.header.sim_time;
    let position = animal
        .world_position()
        .ok_or(ExecutionError::InvalidPosition)?;
    let body = animal.body_profile();
    let extent = crate::spatial::Extent {
        radius: body.radius,
        height: body.height,
    };
    let mut reconsider = false;
    let mut meaningful = false;
    let mut clear_since_removed = false;
    let mut bands = Vec::with_capacity(frame.records.len());
    if !frame.complete {
        meaningful = episode.clear_since.is_some();
        clear_since_removed = true;
        reconsider = episode.mode != ResponseMode::Blocked;
    } else {
        let clear = profile.avoidance_distance + profile.clearance_margin;
        let mut nearest = f64::INFINITY;
        for key in &frame.records {
            let danger = episode.dangers.get(key).ok_or(ExecutionError::Invariant)?;
            let separation =
                crate::native_refuge::danger_separation(position, extent, danger, profile, at);
            nearest = nearest.min(separation);
            let inside = separation < profile.avoidance_distance - epsilon;
            let prior = match danger {
                NativeDanger::Body {
                    inside_avoidance, ..
                }
                | NativeDanger::Region {
                    inside_avoidance, ..
                } => *inside_avoidance,
            };
            if prior == Some(false) && inside {
                reconsider = true;
            }
            if prior != Some(inside) {
                bands.push((key.as_str(), inside));
            }
        }
        if nearest < clear - epsilon && episode.clear_since.is_some() {
            clear_since_removed = true;
            meaningful = true;
            reconsider = true;
        }
        if nearest < profile.avoidance_distance && episode.mode == ResponseMode::Settling {
            reconsider = true;
        }
        if !frame.newly_visible.is_empty() {
            for key in &frame.records {
                if !frame.newly_visible.contains(key) {
                    continue;
                }
                let danger = episode.dangers.get(key).ok_or(ExecutionError::Invariant)?;
                if crate::native_refuge::danger_separation(position, extent, danger, profile, at)
                    < clear
                {
                    reconsider = true;
                    break;
                }
                if let Some(action) = actor
                    .action
                    .as_ref()
                    .filter(|action| !action.path.is_empty())
                {
                    if let Some(from) = animal.supported_position() {
                        let separation = crate::native_refuge::route_danger_separation(
                            from.point(),
                            &action.path,
                            extent,
                            danger,
                            profile,
                            at,
                            epsilon,
                            meters,
                        )?;
                        if separation < profile.avoidance_distance {
                            reconsider = true;
                            break;
                        }
                    }
                }
            }
        }
        if episode.movement.as_ref().is_some_and(|movement| {
            movement.kind == MovementKind::Action
                && actor
                    .action
                    .as_ref()
                    .is_none_or(|action| action.id != movement.id)
        }) {
            reconsider = true;
        }
        if actor.action.is_none()
            && episode.mode == ResponseMode::Blocked
            && nearest >= clear
            && !installed
                .capabilities
                .capability_blocked(Some(animal), "actions")?
            && !installed
                .capabilities
                .capability_blocked(Some(animal), "locomotion")?
        {
            reconsider = true;
        }
    }
    let review = reconsider && episode.review_at > at;
    meaningful |= review;
    if !bands.is_empty() || clear_since_removed || review {
        let episode = mutation
            .snapshot_episode(actor_id)?
            .as_mut()
            .ok_or(ExecutionError::Invariant)?;
        for (key, inside) in bands {
            match episode
                .dangers
                .get_mut(key)
                .ok_or(ExecutionError::Invariant)?
            {
                NativeDanger::Body {
                    inside_avoidance, ..
                }
                | NativeDanger::Region {
                    inside_avoidance, ..
                } => *inside_avoidance = Some(inside),
            }
        }
        if clear_since_removed {
            episode.clear_since = None;
        }
        if review {
            episode.review_at = at;
            episode.mode = ResponseMode::Blocked;
            episode.proposal = None;
        }
    }
    if meaningful {
        mutation.behavior_changed(actor_id, false)?;
    }
    Ok(())
}

pub(crate) fn selected_profile<'a>(
    installed: &'a InstalledWorld,
    state: &NativeResponseState,
) -> Result<&'a NativeResponseProfile, ExecutionError> {
    let pin = state
        .episode
        .as_ref()
        .map_or(&state.profile, |episode| &episode.profile_pin);
    let key = profile_key(pin).map_err(|_| ExecutionError::Invariant)?;
    installed
        .response_profiles
        .get(&key)
        .map(|definition| definition.value())
        .ok_or(ExecutionError::UnsupportedFamily)
}

pub(crate) fn expire_acoustic_patterns(
    mutation: &mut PhysicalMutation<'_>,
    actor_id: &str,
) -> Result<(), ExecutionError> {
    let at = mutation.state.header.sim_time;
    let Some(state) = mutation
        .state
        .entities
        .get(actor_id)
        .and_then(|entity| entity.animal.as_ref())
    else {
        return Ok(());
    };
    let expired: Vec<String> = state
        .acoustic_patterns
        .iter()
        .filter_map(|(key, pattern)| (pattern.idle_expires_at <= at).then(|| key.clone()))
        .collect();
    if expired.is_empty() {
        return Ok(());
    }
    for key in expired {
        mutation.set_acoustic_pattern(actor_id, &key, None)?;
    }
    mutation.animal_clock_changed(actor_id)
}

struct SoundCompletion {
    animal: EntityHandle,
    actor_id: String,
    cue: NativeAcousticCue,
    blocked: Option<BlockedResponse>,
    moving: bool,
}

fn complete_sound(
    mutation: &mut PhysicalMutation<'_>,
    completion: SoundCompletion,
) -> Result<(), ExecutionError> {
    if mutation.state.entities.resolve(completion.animal).is_none() {
        return Err(ExecutionError::MissingEntity);
    }
    let episode = mutation
        .snapshot_episode(&completion.actor_id)?
        .as_mut()
        .ok_or(ExecutionError::Invariant)?;
    if let Some(blocked) = completion.blocked {
        episode.mode = ResponseMode::Blocked;
        episode.blocked = Some(blocked);
    }
    episode.acoustic_cue = Some(completion.cue);
    episode.acoustic_leg_required = Some(true);
    if !completion.moving {
        episode.refuge = None;
    }
    mutation.behavior_changed(&completion.actor_id, false)
}

/// Consume one newly acquired sound in the actual event reaction phase. Alarm
/// preparation remains private; physical movement has its own outward owner.
pub(crate) fn acquire_sound(
    mutation: &mut PhysicalMutation<'_>,
    installed: &InstalledWorld,
    meters: &mut WorkMeters,
    awareness: &Awareness,
) -> Result<(), ExecutionError> {
    let Some(sound) = awareness.sound.as_ref() else {
        return Ok(());
    };
    let Some(animal) = mutation.state.entities.get(&awareness.actor_id) else {
        return Ok(());
    };
    let (Some(actor), Some(state)) = (&animal.actor, &animal.animal) else {
        return Ok(());
    };
    if !actor.alive
        || actor.controller != "native"
        || !animal.actively_participates()
        || installed
            .capabilities
            .capability_blocked(Some(animal), "perception")?
        || state.physical_life != sound.physical_life
        || animal.physical_life() != Some(sound.physical_life)
        || sound.acquisition == SoundAcquisition::SelfBody
    {
        return Ok(());
    }
    if state.foraging.is_some() || animal.spatial.flight.is_some() {
        return Err(ExecutionError::UnsupportedFamily);
    }
    let profile = selected_profile(installed, state)?;
    let Some(minimum) = profile.sound_alarm_minimum_band else {
        return Ok(());
    };
    let band = ((sound.clarity_margin_db - sound.detect_threshold_db)
        / profile.acoustic_change_band_db)
        .floor();
    if band < minimum {
        return Ok(());
    }
    let handle = mutation
        .state
        .entities
        .handle(&awareness.actor_id)
        .ok_or(ExecutionError::MissingEntity)?;
    let capacity = new_cue_clone_bytes(&awareness.event_id, sound)
        .saturating_mul(3)
        .saturating_add(episode_clone_bytes(&state.episode))
        .saturating_add(state.profile.id.capacity())
        .saturating_add(state.profile.digest.capacity())
        .saturating_add(state.locomotion.capacity())
        .saturating_add(state.aerial_route_id.as_ref().map_or(0, String::capacity));
    mutation.reserve_response_growth(capacity)?;
    expire_acoustic_patterns(mutation, &awareness.actor_id)?;
    let cue = NativeAcousticCue {
        event_id: awareness.event_id.clone(),
        sequence: awareness.sequence,
        at: awareness.at,
        physical_life: sound.physical_life,
        sound: sound.clone(),
    };
    let key = acoustic_pattern_key(&cue, profile).map_err(|_| ExecutionError::Invariant)?;
    let state = mutation
        .state
        .entities
        .get(&awareness.actor_id)
        .and_then(|entity| entity.animal.as_ref())
        .ok_or(ExecutionError::Invariant)?;
    let prior = state.acoustic_patterns.contains_key(&key);
    let bytes = crate::encoding::json_record_len(&cue).map_err(|_| ExecutionError::Invariant)?;
    meters.charge(&[
        (WorkUnit::Effects, 1),
        (WorkUnit::OutputBytes, bytes as u64),
    ])?;
    mutation.set_acoustic_pattern(
        &awareness.actor_id,
        &key,
        Some(AcousticPattern {
            idle_expires_at: cue.at + profile.acoustic_pattern_idle_seconds,
            cue: cue.clone(),
        }),
    )?;
    mutation.animal_clock_changed(&awareness.actor_id)?;
    if prior {
        return Ok(());
    }
    let animal = mutation
        .state
        .entities
        .resolve(handle)
        .ok_or(ExecutionError::Invariant)?;
    let state = animal.animal.as_ref().ok_or(ExecutionError::Invariant)?;
    let blocked = state
        .episode
        .as_ref()
        .filter(|episode| episode.mode == ResponseMode::Blocked)
        .and_then(|episode| episode.blocked.clone());
    let moving = state
        .episode
        .as_ref()
        .and_then(|episode| episode.movement.as_ref())
        .is_some_and(|movement| {
            animal
                .actor
                .as_ref()
                .and_then(|actor| actor.action.as_ref())
                .is_some_and(|action| action.id == movement.id)
        });
    let fresh = state.episode.is_none();
    let repeated = state.episode.as_ref().is_some_and(|episode| {
        episode.latest_cause.kind == CauseKind::Event && episode.latest_cause.id == cue.event_id
    });
    let profile_pin = state.profile.clone();
    let locomotion = state.locomotion.clone();
    let aerial_route_id = state.aerial_route_id.clone();
    let at = mutation.state.header.sim_time;
    let completion = SoundCompletion {
        animal: handle,
        actor_id: awareness.actor_id.clone(),
        cue,
        blocked,
        moving,
    };
    if !repeated {
        mutation.reserve_response_growth(
            std::mem::size_of::<NativeResponseEpisode>()
                .saturating_add(profile_pin.id.len())
                .saturating_add(profile_pin.digest.len())
                .saturating_add(locomotion.len())
                .saturating_add(completion.cue.event_id.len().saturating_mul(3))
                .saturating_add(512),
        )?;
        let slot = mutation.snapshot_episode(&awareness.actor_id)?;
        if fresh {
            *slot = Some(NativeResponseEpisode {
                acoustic_cue: None,
                acoustic_leg_required: None,
                id: completion.cue.event_id.clone(),
                started_at: completion.cue.at,
                latest_cause: ResponseCause {
                    kind: CauseKind::Event,
                    id: completion.cue.event_id.clone(),
                    at: completion.cue.at,
                },
                preparations: None,
                preferred_refuge: None,
                aerial_route_id,
                profile_pin,
                locomotion,
                mode: ResponseMode::Escaping,
                dangers: IndexMap::new(),
                review_at: at,
                clear_since: None,
                proposal_generation: 0,
                proposal: None,
                refuge: None,
                movement: None,
                blocked: None,
            });
        }
        let episode = slot.as_mut().ok_or(ExecutionError::Invariant)?;
        episode.latest_cause = ResponseCause {
            kind: CauseKind::Event,
            id: completion.cue.event_id.clone(),
            at: completion.cue.at,
        };
        episode.mode = if episode.movement.is_some() {
            ResponseMode::Blocked
        } else {
            ResponseMode::Escaping
        };
        episode.review_at = at;
        episode.clear_since = None;
        episode.proposal = None;
        episode.blocked = None;
    }
    if !repeated {
        mutation.behavior_changed(&awareness.actor_id, false)?;
    }
    complete_sound(mutation, completion)?;
    Ok(())
}

pub(crate) fn wander_remaining(clock: &WanderClock, at: f64) -> f64 {
    match clock {
        WanderClock::Due { due_at } => due_at - at,
        WanderClock::Remaining {
            remaining_seconds, ..
        } => *remaining_seconds,
    }
}

pub(crate) fn reconcile_wander(
    mutation: &mut PhysicalMutation<'_>,
    installed: &InstalledWorld,
    actor_id: &str,
    time_epsilon: f64,
) -> Result<(), ExecutionError> {
    let Some(entity) = mutation.state.entities.get(actor_id) else {
        return Ok(());
    };
    let Some(animal) = &entity.animal else {
        return Ok(());
    };
    let eligible = entity.threat.is_none()
        && entity.actor.as_ref().is_some_and(|actor| {
            actor.alive
                && actor.controller == "native"
                && !actor.incapacitated
                && actor.action.is_none()
        })
        && entity.spatial.flight.is_none()
        && entity.spatial.fall_velocity.is_none()
        && animal.episode.is_none()
        && animal.foraging.is_none()
        && !installed
            .capabilities
            .capability_blocked(Some(entity), "locomotion")?;
    let at = mutation.state.header.sim_time;
    let countdown = at.abs() * f64::EPSILON > time_epsilon / 4.0;
    let next = match (&animal.wander, eligible, countdown) {
        (WanderClock::Due { due_at }, true, true) => Some(WanderClock::Remaining {
            remaining_seconds: due_at - at,
            running: Some(true),
        }),
        (
            WanderClock::Remaining {
                remaining_seconds,
                running,
            },
            true,
            true,
        ) if *running != Some(true) => Some(WanderClock::Remaining {
            remaining_seconds: *remaining_seconds,
            running: Some(true),
        }),
        (
            WanderClock::Remaining {
                remaining_seconds, ..
            },
            true,
            false,
        ) => Some(WanderClock::Due {
            due_at: at + remaining_seconds,
        }),
        (WanderClock::Due { due_at }, false, _) => Some(WanderClock::Remaining {
            remaining_seconds: due_at - at,
            running: None,
        }),
        (
            WanderClock::Remaining {
                remaining_seconds,
                running: Some(true),
            },
            false,
            _,
        ) => Some(WanderClock::Remaining {
            remaining_seconds: *remaining_seconds,
            running: None,
        }),
        _ => None,
    };
    if let Some(next) = next {
        *mutation.snapshot_wander(actor_id)? = next;
        mutation.animal_clock_changed(actor_id)?;
    }
    Ok(())
}

pub(crate) fn advance_wander_clock(
    mutation: &mut PhysicalMutation<'_>,
    actor_id: &str,
    seconds: f64,
) -> Result<(), ExecutionError> {
    let Some(WanderClock::Remaining {
        running: Some(true),
        ..
    }) = mutation
        .state
        .entities
        .get(actor_id)
        .and_then(|entity| entity.animal.as_ref())
        .map(|animal| &animal.wander)
    else {
        return Ok(());
    };
    let WanderClock::Remaining {
        remaining_seconds, ..
    } = mutation.snapshot_wander(actor_id)?
    else {
        return Err(ExecutionError::Invariant);
    };
    *remaining_seconds -= seconds;
    mutation.animal_clock_changed(actor_id)
}
