//! The selected sampled channels use their real absolute deadlines. Exact
//! continuous-contact/watch channels need their crossing owner before admission;
//! a small fixed time step is not a replacement for that proof.
use super::NativeParticipants;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::ByteBudget;
use crate::reception::{
    ContactTiming, RoutinePolicyCache, SightTiming, next_perception_work_at, next_routine_sight_at,
    routine_observation_relevant, vision_parameters,
};

pub(super) struct SensoryBound {
    pub seconds: f64,
    pub ends_at: Option<f64>,
}
pub(super) fn sensory_bound(
    core: &CoreMutation<'_>,
    participants: &NativeParticipants,
    policies: &mut RoutinePolicyCache,
    requested: f64,
    budget: &ByteBudget,
) -> Result<SensoryBound, ExecutionError> {
    let now = core.state.physical.header.sim_time;
    let mut bound = requested;
    let mut absolute = f64::INFINITY;
    let mut sample = |at: f64, overdue: bool| {
        if at > now {
            absolute = absolute.min(at);
            bound = bound.min(at - now);
        } else if overdue {
            bound = bound.min(core.state.installed.time_epsilon);
        }
    };
    let moving = participants.ambient().iter().any(|handle| {
        core.state
            .physical
            .entities
            .resolve(*handle)
            .is_some_and(|entity| {
                entity.spatial.flight.is_some()
                    || entity
                        .animal
                        .as_ref()
                        .is_some_and(|animal| animal.episode.is_some())
                    || entity
                        .actor
                        .as_ref()
                        .and_then(|actor| actor.action.as_ref())
                        .is_some_and(|action| action.kind == "move" && !action.path.is_empty())
            })
    });
    for handle in participants.actors() {
        let entity = core
            .state
            .physical
            .entities
            .resolve(*handle)
            .ok_or(ExecutionError::Invariant)?;
        if let Some(at) = next_perception_work_at(core.state, &entity.id, budget)? {
            sample(at, false);
        }
        if !entity.actor.as_ref().is_some_and(|actor| actor.alive)
            || !entity.actively_participates()
            || core
                .state
                .installed
                .capabilities
                .capability_blocked(Some(entity), "perception")?
        {
            continue;
        }
        let policy = policies.policy(entity)?;
        let observing = routine_observation_relevant(&core.state.reception, entity);
        if let Some(contact) = &policy.contact {
            if contact.mode != ContactTiming::Sampled {
                return Err(ExecutionError::UnsupportedFamily);
            }
            if let Some(seconds) = contact.seconds.filter(|_| observing) {
                let stored = entity
                    .sensory_progress
                    .as_ref()
                    .and_then(|progress| progress.incidental_contact.as_ref());
                if moving || stored.is_some() {
                    sample(stored.map_or(now + seconds, |stored| stored.next_at), true);
                }
            }
        }
        if let Some(sight) = &policy.sight {
            if sight.mode != SightTiming::Cadence
                && vision_parameters(&core.state.installed, entity).radius > 0.0
            {
                return Err(ExecutionError::UnsupportedFamily);
            }
            if let Some(at) =
                next_routine_sight_at(&core.state.reception, &core.state.installed, entity)?
            {
                sample(at, true);
            }
        }
    }
    let seconds = requested
        .min(bound.max(core.state.installed.time_epsilon))
        .min(absolute - now);
    Ok(SensoryBound {
        seconds,
        ends_at: (seconds == absolute - now).then_some(absolute),
    })
}
