//! Current-format ground continuation integrity. Physical staleness may cancel a
//! prepared route at use; restoration still requires usable identities, clocks,
//! captured laws and exact episode/action bindings.

use super::*;
use crate::identity::MAX_SAFE_INTEGER;
use crate::install::VerifiedDefinition;
use crate::reception::SoundAcquisition;
use crate::state::Entity;
use crate::values::is_safe_record_id;
use std::collections::BTreeSet;

fn finite(point: Point) -> bool {
    [point.x, point.y, point.z].into_iter().all(f64::is_finite)
}
fn surface(point: &SurfacePoint) -> bool {
    finite(point.point()) && is_safe_record_id(&point.surface_id)
}
fn time(at: f64) -> bool {
    at.is_finite() && at >= 0.0
}
fn past(at: f64, now: f64) -> bool {
    time(at) && at <= now
}
fn positive(value: f64) -> bool {
    value.is_finite() && value > 0.0
}

fn selected<'a>(
    profiles: &'a IndexMap<String, VerifiedDefinition<NativeResponseProfile>>,
    pin: &DefinitionPin,
) -> Result<&'a NativeResponseProfile, ResponseValidationError> {
    let key = profile_key(pin).map_err(|_| ResponseValidationError::Profile)?;
    profiles
        .get(&key)
        .filter(|profile| profile.pin() == pin)
        .map(VerifiedDefinition::value)
        .ok_or(ResponseValidationError::Profile)
}

fn cue_valid(cue: &NativeAcousticCue, life: u64, now: f64) -> bool {
    is_safe_record_id(&cue.event_id)
        && cue.sequence <= MAX_SAFE_INTEGER
        && past(cue.at, now)
        && cue.physical_life == life
        && cue.sound.validate().is_ok()
        && cue.sound.acquisition == SoundAcquisition::External
        && cue.sound.physical_life == life
        && cue.sound.acquired_at == cue.at
}

pub(crate) fn validate_native_response(
    entity: &Entity,
    profiles: &IndexMap<String, VerifiedDefinition<NativeResponseProfile>>,
    now: f64,
    maximum_candidates: usize,
    maximum_path_points: usize,
    epsilon: f64,
) -> Result<(), ResponseValidationError> {
    use ResponseValidationError::{Continuation, UnconvertedFamily};
    if entity.spatial.flight.is_some() {
        return Err(UnconvertedFamily);
    }
    let Some(state) = &entity.animal else {
        return if entity
            .actor
            .as_ref()
            .and_then(|actor| actor.action.as_ref())
            .is_some_and(|action| action.native_locomotion.is_some())
        {
            Err(Continuation)
        } else {
            Ok(())
        };
    };
    if state.foraging.is_some() || state.aerial_route_id.is_some() {
        return Err(UnconvertedFamily);
    }
    let actor = entity.actor.as_ref().ok_or(Continuation)?;
    let profile = selected(profiles, &state.profile)?;
    if !profile.locomotion.contains_key(&state.locomotion)
        || state.physical_life > MAX_SAFE_INTEGER
        || state.physical_life != actor.physical_life.unwrap_or(0)
        || match &state.wander {
            WanderClock::Due { due_at } => !due_at.is_finite(),
            WanderClock::Remaining {
                remaining_seconds,
                running,
            } => !remaining_seconds.is_finite() || *running == Some(false),
        }
    {
        return Err(Continuation);
    }
    for (key, pattern) in &state.acoustic_patterns {
        let Some(minimum) = profile.sound_alarm_minimum_band else {
            return Err(Continuation);
        };
        if !cue_valid(&pattern.cue, state.physical_life, now)
            || !time(pattern.idle_expires_at)
            || pattern.idle_expires_at != pattern.cue.at + profile.acoustic_pattern_idle_seconds
            || ((pattern.cue.sound.clarity_margin_db - pattern.cue.sound.detect_threshold_db)
                / profile.acoustic_change_band_db)
                .floor()
                < minimum
            || acoustic_pattern_key(&pattern.cue, profile).map_err(|_| Continuation)? != *key
        {
            return Err(Continuation);
        }
    }
    if let Some(episode) = &state.episode {
        let active = selected(profiles, &episode.profile_pin)?;
        if episode.aerial_route_id.is_some() {
            return Err(UnconvertedFamily);
        }
        if !actor.alive
            || actor.controller != "native"
            || !is_safe_record_id(&episode.id)
            || episode
                .preferred_refuge
                .as_ref()
                .is_some_and(|point| !surface(point))
            || !past(episode.started_at, now)
            || !time(episode.review_at)
            || !is_safe_record_id(&episode.latest_cause.id)
            || !past(episode.latest_cause.at, now)
            || !active.locomotion.contains_key(&episode.locomotion)
            || episode.proposal_generation > MAX_SAFE_INTEGER
            || episode.clear_since.is_some_and(|at| !past(at, now))
            || episode
                .acoustic_cue
                .as_ref()
                .is_some_and(|cue| !cue_valid(cue, state.physical_life, now))
            || episode
                .acoustic_leg_required
                .is_some_and(|required| !required || episode.acoustic_cue.is_none())
        {
            return Err(Continuation);
        }
        for (key, id) in episode.preparations.iter().flat_map(|values| values.iter()) {
            let (source, life): (String, f64) =
                serde_json::from_str(key).map_err(|_| Continuation)?;
            if !is_safe_record_id(id)
                || !is_safe_record_id(&source)
                || !life.is_finite()
                || life < 0.0
                || life.fract() != 0.0
                || life > MAX_SAFE_INTEGER as f64
            {
                return Err(Continuation);
            }
        }
        for (key, danger) in &episode.dangers {
            if !finite(danger.point()) || !past(danger.observed_at(), now) {
                return Err(Continuation);
            }
            let expected = match danger {
                NativeDanger::Body {
                    source_id,
                    physical_life,
                    extent,
                    visible,
                    lost_at,
                    ..
                } => {
                    if !is_safe_record_id(source_id)
                        || *physical_life > MAX_SAFE_INTEGER
                        || !positive(extent.radius)
                        || !positive(extent.height)
                        || if *visible {
                            lost_at.is_some()
                        } else {
                            lost_at.is_none_or(|at| !past(at, now))
                        }
                    {
                        return Err(Continuation);
                    }
                    body_danger_key(source_id, *physical_life).map_err(|_| Continuation)?
                }
                NativeDanger::Region {
                    source, incoming, ..
                } => {
                    if !is_safe_record_id(&source.id)
                        || incoming.is_some_and(|point| !finite(point))
                    {
                        return Err(Continuation);
                    }
                    region_danger_key(source).map_err(|_| Continuation)?
                }
            };
            if expected != *key {
                return Err(Continuation);
            }
        }
        if let Some(proposal) = &episode.proposal {
            let search = proposal.search.as_ref().ok_or(Continuation)?;
            let mut ids = BTreeSet::new();
            let candidates = &proposal.candidates;
            if proposal.wait.is_none()
                || proposal.generation != episode.proposal_generation
                || proposal.geometry_revision > MAX_SAFE_INTEGER
                || !past(proposal.at, now)
                || !surface(&proposal.origin)
                || proposal
                    .movement_id
                    .as_ref()
                    .is_some_and(|id| !is_safe_record_id(id))
                || !positive(proposal.body.radius)
                || !positive(proposal.body.height)
                || !proposal.body.max_slope.is_finite()
                || proposal.body.max_slope < 0.0
                || candidates.len() > maximum_candidates
                || candidates
                    .iter()
                    .any(|candidate| !ids.insert(&candidate.id))
                || candidates
                    .iter()
                    .filter(|candidate| candidate.preferred == Some(true))
                    .count()
                    > 1
                || candidates
                    .iter()
                    .filter(|candidate| candidate.retained == Some(true))
                    .count()
                    > 1
                || candidates.iter().any(|candidate| {
                    candidate.id.is_empty()
                        || !surface(&candidate.point)
                        || candidate.retained == Some(false)
                        || candidate.preferred == Some(false)
                        || (candidate.preferred == Some(true)
                            && episode.preferred_refuge.as_ref() != Some(&candidate.point))
                        || (candidate.preferred == Some(true) && candidate.retained == Some(true))
                })
            {
                return Err(Continuation);
            }
            let rule = &active.candidates;
            if !search.distance.is_finite()
                || search.distance < rule.distance.minimum
                || search.distance > rule.distance.maximum
                || !search.bearing.is_finite()
                || (search.side != -1.0 && search.side != 1.0)
                || search.attempted > rule.angles.len() as u64
                || proposal.wait != Some(rule.navigation_wait)
                || candidates.len() > 1
            {
                return Err(Continuation);
            }
            // The selected ground producer only creates ordinary search legs.
            // Retained paths need their current-action corridor validator
            // before they can enter this installed closure.
            if candidates
                .iter()
                .any(|candidate| candidate.retained == Some(true))
            {
                return Err(UnconvertedFamily);
            }
            if let Some(best) = &search.best {
                if !surface(&best.point)
                    || best.path.is_empty()
                    || best.path.len() > maximum_path_points
                    || best.path.iter().any(|point| !surface(point))
                    || !best.length.is_finite()
                    || best.length < 0.0
                    || !positive(best.progress)
                    || best.progress > search.distance + epsilon
                {
                    return Err(Continuation);
                }
            }
        }
        if let Some(refuge) = &episode.refuge {
            if refuge.flight_route_id.is_some() {
                return Err(UnconvertedFamily);
            }
            if !surface(&refuge.point)
                || !past(refuge.selected_at, now)
                || refuge.generation > MAX_SAFE_INTEGER
                || refuge
                    .acoustic_direction
                    .as_ref()
                    .and_then(Option::as_ref)
                    .is_some_and(|direction| direction.sector > 7)
                || refuge
                    .draw
                    .is_some_and(|draw| !draw.is_finite() || !(0.0..1.0).contains(&draw))
            {
                return Err(Continuation);
            }
        }
        if let Some(movement) = &episode.movement {
            if movement.kind == MovementKind::Flight || !is_safe_record_id(&movement.id) {
                return Err(Continuation);
            }
        }
    }
    if let Some(action) = &actor.action {
        if let Some(binding) = &action.native_locomotion {
            let profile = selected(profiles, &binding.profile)?;
            if action.kind != "move" || !profile.locomotion.contains_key(&binding.locomotion) {
                return Err(Continuation);
            }
            if binding.mode == LocomotionMode::Escape {
                let episode = state.episode.as_ref().ok_or(Continuation)?;
                let refuge = episode.refuge.as_ref().ok_or(Continuation)?;
                if binding.episode_id.as_deref() != Some(episode.id.as_str())
                    || binding.generation.is_none_or(|generation| {
                        generation > MAX_SAFE_INTEGER || generation != refuge.generation
                    })
                    || episode.movement.as_ref().is_none_or(|movement| {
                        movement.kind != MovementKind::Action || movement.id != action.id
                    })
                    || action.destination.as_ref() != Some(&refuge.point)
                    || binding.profile != episode.profile_pin
                    || binding.locomotion != episode.locomotion
                {
                    return Err(Continuation);
                }
            }
        }
    }
    Ok(())
}
