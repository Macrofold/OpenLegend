//! One timing decision for acquisition and captured-rate materialization. The
//! prepared result advances progress only when consumed by the physical owner.
use super::*;
use crate::execution::{ExecutionError, PhysicalMutation};
use crate::host::retained_size::heap_sum;
use crate::host::{ByteBudget, ByteReservation};
use crate::received::ReceivedError;
use crate::simulation::SimulationState;
use crate::state::EntityHandle;
use std::mem::size_of;

pub(crate) struct RoutineObservation {
    pub sight: bool,
    pub contact: bool,
    pub sampled_sight: bool,
    pub sampled_contact: bool,
    pub detail: bool,
    pub immediate: bool,
    pub measurement: MeasurementWork,
    observer: EntityHandle,
    progress: Option<Option<SensoryProgress>>,
    _reservation: ByteReservation,
}
fn capacity() -> ReceivedError {
    ReceivedError("Routine observation preparation exceeds native byte allowance.")
}
fn due(
    next: &mut Option<SampleProgress>,
    sample: bool,
    seconds: Option<f64>,
    definitions: Option<&str>,
    blocked: bool,
    life: u64,
    now: f64,
    changed: &mut bool,
) -> bool {
    if !sample || seconds.is_none() || definitions.is_none() {
        *changed |= next.take().is_some();
        return definitions.is_some();
    }
    if blocked {
        if let Some(prior) = next.as_mut().filter(|prior| !prior.suspended) {
            prior.suspended = true;
            *changed = true;
        }
        return false;
    }
    let definitions = definitions.expect("Selected sampling definition");
    let fresh = next.as_ref().is_none_or(|prior| {
        prior.definitions != definitions || prior.life != life || prior.suspended
    });
    if !fresh && next.as_ref().is_some_and(|prior| prior.next_at > now) {
        return false;
    }
    let epoch_at = if fresh {
        now
    } else {
        next.as_ref().expect("Existing sample").epoch_at
    };
    *next = Some(SampleProgress {
        definitions: definitions.into(),
        life,
        suspended: false,
        epoch_at,
        next_at: next_sample_at(epoch_at, seconds.expect("Selected sampling period"), now),
    });
    *changed = true;
    true
}
impl RoutineObservation {
    pub(crate) fn prepare(
        state: &SimulationState,
        observer: EntityHandle,
        policy: &RoutinePolicy,
        measurement: MeasurementWork,
        budget: &ByteBudget,
    ) -> Result<Self, ReceivedError> {
        let entity = state
            .physical
            .entities
            .resolve(observer)
            .ok_or(ReceivedError("Routine observer is unavailable."))?;
        let stored = entity.sensory_progress.as_ref();
        let text = [
            stored
                .and_then(|p| p.routine_sight.as_ref())
                .map(|p| p.definitions.len()),
            stored
                .and_then(|p| p.incidental_contact.as_ref())
                .map(|p| p.definitions.len()),
            policy.sight.as_ref().map(|p| p.key.len()),
            policy.contact.as_ref().map(|p| p.key.len()),
        ];
        let reservation = budget
            .reserve(
                heap_sum([size_of::<Self>(), text.into_iter().flatten().sum()])
                    .ok_or_else(capacity)?,
            )
            .map_err(|_| capacity())?;
        let mut result = Self {
            sight: false,
            contact: false,
            sampled_sight: false,
            sampled_contact: false,
            detail: false,
            immediate: false,
            measurement,
            observer,
            progress: None,
            _reservation: reservation,
        };
        if !routine_observation_relevant(&state.reception, entity) {
            result.progress = stored.map(|_| None);
            result.measurement.geometry = false;
            result.measurement.subjects.clear();
            return Ok(result);
        }
        let blocked = state
            .installed
            .capabilities
            .capability_blocked(Some(entity), "perception")
            .map_err(|_| ReceivedError("Perception capability is unavailable."))?;
        let actor = entity
            .actor
            .as_ref()
            .ok_or(ReceivedError("Routine observer has no body."))?;
        // Encounter control is not converted yet; never interpret an opaque
        // encounter as an absence of deliberate watching.
        if actor.encounters.is_some() {
            return Err(ReceivedError("Routine encounter control is not converted."));
        }
        let life = actor.physical_life.unwrap_or(0);
        let mut next = SensoryProgress {
            routine_sight: stored.and_then(|p| p.routine_sight.clone()),
            incidental_contact: stored.and_then(|p| p.incidental_contact.clone()),
        };
        let mut changed = false;
        result.sampled_sight = policy
            .sight
            .as_ref()
            .is_some_and(|p| p.mode == SightTiming::Cadence);
        result.sampled_contact = policy
            .contact
            .as_ref()
            .is_some_and(|p| p.mode == ContactTiming::Sampled);
        let selected = super::sensory::sight_scope_due_prepared(
            &state.reception,
            &state.physical,
            entity,
            policy.sight.as_ref(),
        );
        result.immediate = result.sampled_sight
            && stored
                .and_then(|p| p.routine_sight.as_ref())
                .is_none_or(|prior| {
                    policy
                        .sight
                        .as_ref()
                        .is_none_or(|p| prior.definitions != p.key)
                        || prior.life != life
                        || prior.suspended
                });
        result.sight = if result.sampled_sight {
            result.immediate || selected.is_some() || !result.measurement.subjects.is_empty()
        } else {
            due(
                &mut next.routine_sight,
                false,
                None,
                policy.sight.as_ref().map(|p| p.key.as_str()),
                blocked,
                life,
                state.physical.header.sim_time,
                &mut changed,
            )
        };
        result.contact = due(
            &mut next.incidental_contact,
            result.sampled_contact,
            policy.contact.as_ref().and_then(|p| p.seconds),
            policy.contact.as_ref().map(|p| p.key.as_str()),
            blocked,
            life,
            state.physical.header.sim_time,
            &mut changed,
        );
        if result.sampled_sight && result.sight {
            let p = policy.sight.as_ref().expect("Cadence sight policy");
            let epoch_at = state
                .reception
                .sensory
                .as_ref()
                .map_or(state.physical.header.sim_time, |sensory| sensory.epoch_at);
            next.routine_sight = Some(SampleProgress {
                definitions: p.key.clone(),
                life,
                suspended: blocked,
                epoch_at,
                next_at: next_sample_at(
                    epoch_at,
                    p.seconds
                        .ok_or(ReceivedError("Cadence sight has no period."))?,
                    state.physical.header.sim_time,
                ),
            });
            changed = true;
        }
        if blocked && result.sampled_sight {
            result.sight = false;
            if let Some(prior) = next.routine_sight.as_mut().filter(|prior| !prior.suspended) {
                prior.suspended = true;
                changed = true;
            }
        }
        if changed {
            result.progress = Some(
                (next.routine_sight.is_some() || next.incidental_contact.is_some()).then_some(next),
            );
        }
        let visible = state
            .reception
            .visible_people
            .as_ref()
            .and_then(|rows| rows.get(&entity.id))
            .is_some_and(|rows| !rows.is_empty())
            || state
                .reception
                .visible_objects
                .as_ref()
                .and_then(|rows| rows.get(&entity.id))
                .is_some_and(|rows| !rows.is_empty());
        let contacts = actor.contacts.as_ref().is_some_and(|rows| !rows.is_empty());
        if policy.sight.is_none() && visible {
            result.sight = true;
        }
        if policy.contact.is_none() && contacts {
            result.contact = true;
        }
        if blocked
            && (visible
                || contacts
                || state
                    .reception
                    .perception_episodes
                    .as_ref()
                    .and_then(|rows| rows.get(&entity.id))
                    .is_some_and(|rows| !rows.is_empty()))
        {
            result.sight = true;
            result.contact = true;
        }
        result.detail = !result.immediate
            && (selected == Some(CurrentCheck::Detail)
                || (selected.is_none() && !result.measurement.subjects.is_empty()));
        Ok(result)
    }
    pub(crate) fn due(&self) -> bool {
        self.sight || self.contact || self.measurement.geometry
    }
    pub(crate) fn record_progress(
        &mut self,
        physical: &mut PhysicalMutation<'_>,
    ) -> Result<(), ExecutionError> {
        if let Some(next) = self.progress.take() {
            physical.set_sensory_progress(self.observer, next)?;
        }
        Ok(())
    }
}
