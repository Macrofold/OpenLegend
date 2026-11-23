//! A private motion/review cut is not a shared rate interval. Due decisions run
//! before this calculation; paused animal clocks do not wake an unrelated body.
use super::{MechanicalForecast, NativeParticipants};
use crate::execution::ExecutionError;
use crate::native_controller::wander_remaining;
use crate::native_response::WanderClock;
use crate::simulation::{InstalledWorld, PhysicalState};

pub(crate) fn next_animal_review(
    physical: &PhysicalState,
    installed: &InstalledWorld,
    participants: &NativeParticipants,
) -> Result<f64, ExecutionError> {
    let mut next = f64::INFINITY;
    for handle in participants.animals() {
        let entity = physical
            .entities
            .resolve(*handle)
            .ok_or(ExecutionError::Invariant)?;
        let Some(animal) = &entity.animal else {
            return Err(ExecutionError::Invariant);
        };
        // Source's private choice clock includes acoustic expiry even while
        // the earned mechanical forecast is retained. Land on its absolute
        // endpoint rather than reconstructing it by duration addition.
        let choice = animal.acoustic_patterns.values().fold(
            animal
                .episode
                .as_ref()
                .map_or(f64::INFINITY, |episode| episode.review_at),
            |at, pattern| at.min(pattern.idle_expires_at),
        );
        if choice > physical.header.sim_time {
            next = next.min(choice);
        }
        if let Some(at) = crate::native_controller::foraging::review_at(
            entity,
            installed,
            physical.header.sim_time,
        )? && at > physical.header.sim_time
        {
            next = next.min(at);
        }
    }
    Ok(next)
}
pub(crate) fn private_motion_seconds(
    physical: &PhysicalState,
    installed: &InstalledWorld,
    participants: &NativeParticipants,
    forecast: &MechanicalForecast,
    requested: f64,
) -> Result<f64, ExecutionError> {
    let mut bound = super::flight::boundary(
        physical,
        installed,
        participants.flyers(),
        forecast,
        requested,
    )?;
    let epsilon = installed.time_epsilon;
    for handle in participants.ambient() {
        let entity = physical
            .entities
            .resolve(*handle)
            .ok_or(ExecutionError::Invariant)?;
        if installed
            .capabilities
            .capability_blocked(Some(entity), "locomotion")?
        {
            continue;
        }
        let action = entity
            .actor
            .as_ref()
            .and_then(|actor| actor.action.as_ref());
        if forecast.private_walkers.contains(handle) {
            if let Some(action) = action.filter(|action| {
                action.keeps_motion_sample() && !action.path.is_empty()
            }) {
                let speed = installed.movement_speed(entity)?;
                bound = bound.min(
                    forecast.travel_for(*handle).min(
                        action
                            .motion_sample_remaining_metres
                            .unwrap_or(f64::INFINITY),
                    ) / speed,
                );
                let position = entity
                    .world_position()
                    .ok_or(ExecutionError::InvalidPosition)?;
                bound = bound.min(
                    epsilon.max(crate::spatial::distance(position, action.path[0].point()) / speed),
                );
            }
        }
        if entity.spatial.fall_velocity.is_some() || entity.spatial.flight.is_some() {
            continue;
        }
        if !entity
            .actor
            .as_ref()
            .is_some_and(|actor| actor.alive && !actor.incapacitated && actor.action.is_none())
        {
            continue;
        }
        let Some(animal) = &entity.animal else {
            continue;
        };
        if entity.threat.is_some() {
            continue;
        }
        let running = matches!(
            animal.wander,
            WanderClock::Due { .. }
                | WanderClock::Remaining {
                    running: Some(true),
                    ..
                }
        );
        let remaining = wander_remaining(&animal.wander, physical.header.sim_time);
        if running && remaining > epsilon {
            bound = bound.min(remaining);
        }
    }
    Ok(requested.min(epsilon.max(bound)))
}
