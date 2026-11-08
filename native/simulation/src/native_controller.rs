//! The local-refuge controller consumes actual receiver products. Private alarm
//! and clock changes do not manufacture outward occurrences or received facts.

use crate::execution::{ExecutionError, PhysicalMutation};
use crate::experience::Awareness;
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries, SurfaceLineQuery};
use crate::native_refuge::{RefugeRoute, RefugeScore};
use crate::native_response::*;
use crate::reception::SoundAcquisition;
use crate::simulation::InstalledWorld;
use crate::state::EntityHandle;
use crate::work::{WorkDemand, WorkMeters};
use indexmap::IndexMap;

fn selected_profile<'a>(
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
    mutation.behavior_changed(&completion.actor_id)
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
    meters.charge(WorkDemand {
        effects: Some(1),
        output_bytes: Some(bytes as u64),
        ..WorkDemand::default()
    })?;
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
        mutation.behavior_changed(&awareness.actor_id)?;
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

/// Only a real finite physical question may create this continuation. The
/// second random draw and wait-clock write occur after its exact answer.
pub(crate) struct WanderContinuation {
    actor: EntityHandle,
    actor_id: String,
    at: f64,
    origin: crate::state::SurfacePoint,
    clock: WanderClock,
    binding: GeometryBinding,
    index: usize,
}

pub(crate) fn prepare_wander(
    mutation: &mut PhysicalMutation<'_>,
    installed: &InstalledWorld,
    actor_id: &str,
    time_epsilon: f64,
    queries: &mut GeometryQueries,
) -> Result<Option<WanderContinuation>, ExecutionError> {
    reconcile_wander(mutation, installed, actor_id, time_epsilon)?;
    let entity = mutation
        .state
        .entities
        .get(actor_id)
        .ok_or(ExecutionError::MissingEntity)?;
    let (Some(state), Some(actor), Some(from)) =
        (&entity.animal, &entity.actor, entity.supported_position())
    else {
        return Ok(None);
    };
    if !actor.alive
        || actor.controller != "native"
        || actor.incapacitated
        || !entity.actively_participates()
        || installed
            .capabilities
            .capability_blocked(Some(entity), "actions")?
        || state.episode.is_some()
        || entity.threat.is_some()
        || actor.action.is_some()
        || entity.spatial.flight.is_some()
        || entity.spatial.fall_velocity.is_some()
        || installed
            .capabilities
            .capability_blocked(Some(entity), "locomotion")?
        || wander_remaining(&state.wander, mutation.state.header.sim_time) > time_epsilon
    {
        return Ok(None);
    }
    if state.foraging.is_some() {
        return Err(ExecutionError::UnsupportedFamily);
    }
    let profile = selected_profile(installed, state)?;
    let handle = mutation
        .state
        .entities
        .handle(actor_id)
        .ok_or(ExecutionError::MissingEntity)?;
    let body = entity.body_profile().into_owned();
    let clock = state.wander.clone();
    let at = mutation.state.header.sim_time;
    mutation.reserve_response_growth(
        std::mem::size_of::<WanderContinuation>()
            .saturating_add(std::mem::size_of::<SurfaceLineQuery>())
            .saturating_add(actor_id.len())
            .saturating_add(from.surface_id.capacity().saturating_mul(2))
            .saturating_add(body.id.capacity())
            .saturating_add(256),
    )?;
    queries
        .surface_lines
        .try_reserve(1)
        .map_err(|_| ExecutionError::Capacity)?;
    let angle = mutation.draw() * std::f64::consts::PI * 2.0;
    let index = queries.surface_lines.len();
    queries.surface_lines.push(SurfaceLineQuery {
        from: from.clone(),
        x: from.x + angle.cos() * profile.wander.distance,
        z: from.z + angle.sin() * profile.wander.distance,
        body,
    });
    Ok(Some(WanderContinuation {
        actor: handle,
        actor_id: actor_id.to_owned(),
        at,
        origin: from,
        clock,
        binding: queries.binding,
        index,
    }))
}

impl WanderContinuation {
    pub(crate) fn resume(
        self,
        mutation: &mut PhysicalMutation<'_>,
        installed: &InstalledWorld,
        answers: &mut GeometryAnswers,
    ) -> Result<Option<RefugeRoute>, ExecutionError> {
        if answers.binding != self.binding || mutation.state.header.sim_time != self.at {
            return Err(ExecutionError::Invariant);
        }
        let animal = mutation
            .state
            .entities
            .resolve(self.actor)
            .ok_or(ExecutionError::MissingEntity)?;
        let state = animal
            .animal
            .as_ref()
            .ok_or(ExecutionError::UnsupportedFamily)?;
        if state.wander != self.clock || animal.supported_position().as_ref() != Some(&self.origin)
        {
            return Err(ExecutionError::Invariant);
        }
        let profile = selected_profile(installed, state)?;
        let path = answers
            .surface_lines
            .get_mut(self.index)
            .ok_or(ExecutionError::Invariant)?
            .take();
        let wait = profile.wander.minimum_wait_seconds
            + (mutation.draw() * profile.wander.wait_choices as f64).floor();
        let clock = mutation.snapshot_wander(&self.actor_id)?;
        match clock {
            WanderClock::Due { due_at } => *due_at += wait,
            WanderClock::Remaining {
                remaining_seconds, ..
            } => *remaining_seconds += wait,
        }
        mutation.animal_clock_changed(&self.actor_id)?;
        let Some(path) = path else {
            return Ok(None);
        };
        let Some(point) = path.last() else {
            return Ok(None);
        };
        let point = point.clone();
        let mut previous = self.origin.point();
        let mut length = 0.0;
        for next in &path {
            length += crate::spatial::distance(previous, next.point());
            previous = next.point();
        }
        Ok(Some(RefugeRoute {
            score: RefugeScore {
                candidate: RefugeCandidate {
                    id: "routine".to_owned(),
                    point,
                    retained: None,
                    preferred: None,
                },
                worsening: 0.0,
                arrival_margin: 0.0,
            },
            path,
            length,
        }))
    }
}
