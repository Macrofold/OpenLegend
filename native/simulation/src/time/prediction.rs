//! Earliest mechanical deadline over the installed finite family closure. The
//! private animal review and motion/sensing slices remain separate; a shorter
//! private slice never grants elapsed time to a newly started action.
use super::{MotionTravelBounds, NativeParticipants};
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::retained_size::{heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::native_response::{NativeDanger, WanderClock};
use crate::state::EntityHandle;
use crate::status::{AttributeRates, AttributeSchema, StatusRateInterval};
use crate::values::AttributeValue;
use indexmap::IndexSet;
use std::{mem::size_of, sync::Arc};

struct Bound {
    now: f64,
    seconds: f64,
    absolute: f64,
}
impl Bound {
    fn limit(&mut self, seconds: f64) {
        self.seconds = self.seconds.min(seconds);
    }
    fn at(&mut self, at: f64) {
        if at > self.now {
            self.absolute = self.absolute.min(at);
            self.limit(at - self.now);
        }
    }
}
pub(crate) struct MechanicalForecast {
    pub seconds: f64,
    pub ends_at: Option<f64>,
    pub requires_immediate_integration: bool,
    pub rates: Vec<Arc<StatusRateInterval>>,
    pub private_walkers: IndexSet<EntityHandle>,
    pub referenced: IndexSet<String>,
    travel: MotionTravelBounds,
    _reservation: ByteReservation,
}
impl MechanicalForecast {
    pub(crate) fn travel_for(&self, entity: EntityHandle) -> f64 {
        self.travel.get(entity)
    }
    pub(crate) fn prepare(
        core: &mut CoreMutation<'_>,
        participants: &NativeParticipants,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let installed = core.state.installed.clone();
        let physical = &core.state.physical;
        let read = installed.status_read(physical);
        let now = physical.header.sim_time;
        let epsilon = installed.time_epsilon;
        let requested = installed.time_rules.idle_horizon_seconds();
        let travel =
            MotionTravelBounds::prepare(physical, &installed, participants, requested, budget)?;
        let mut reservation = budget.reserve(
            heap_sum([
                size_of::<Self>(),
                map_storage::<EntityHandle, ()>(participants.actors().len())
                    .ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut rates = Vec::new();
        for handle in participants.statuses() {
            let entity = physical
                .entities
                .resolve(*handle)
                .ok_or(ExecutionError::Invariant)?;
            let capture = crate::status::prepare_status_rates(
                &read,
                &entity.id,
                None,
                budget,
                &mut core.journal.meters,
            )?;
            let required = rates
                .len()
                .checked_add(capture.intervals.len())
                .ok_or(ExecutionError::Capacity)?;
            if required > rates.capacity() {
                let capacity = required.max(
                    rates
                        .capacity()
                        .checked_mul(2)
                        .ok_or(ExecutionError::Capacity)?,
                );
                reservation.resize(
                    reservation
                        .bytes()
                        .checked_add(
                            (capacity - rates.capacity())
                                .checked_mul(size_of::<Arc<StatusRateInterval>>())
                                .ok_or(ExecutionError::Capacity)?,
                        )
                        .ok_or(ExecutionError::Capacity)?,
                )?;
                rates
                    .try_reserve_exact(capacity - rates.len())
                    .map_err(|_| ExecutionError::Capacity)?;
            }
            rates.extend(capture.intervals);
        }
        let sums = AttributeRates::capture(&rates, budget)?;
        let mut bound = Bound {
            now,
            seconds: requested,
            absolute: f64::INFINITY,
        };
        bound.at(crate::body::next_remains_deadline(
            physical,
            participants.remains().iter().map(|handle| {
                physical
                    .entities
                    .resolve(*handle)
                    .expect("prepared remains handle")
                    .id
                    .as_str()
            }),
        ));
        bound.at(crate::experience::next_sensory_expiry(
            &core.state.experience,
        )?);
        bound.at(crate::experience::next_commitment_deadline(
            core.state, budget,
        )?);
        bound.at(core.state.appraisals.next_deadline());
        let mut immediate = false;
        let mut reference_count = 0usize;
        let mut reference_bytes = 0usize;
        for handle in participants.statuses() {
            let entity = physical
                .entities
                .resolve(*handle)
                .ok_or(ExecutionError::Invariant)?;
            for state in entity
                .status_effects
                .iter()
                .flat_map(|states| states.values())
                .filter(|state| state.active)
            {
                for id in [&state.source_id, &state.action_target_id] {
                    if id != &entity.id {
                        reference_count += 1;
                        reference_bytes = reference_bytes
                            .checked_add(id.len())
                            .ok_or(ExecutionError::Capacity)?;
                    }
                }
            }
        }
        for interval in &rates {
            immediate |= !interval.periodic.is_empty();
            for rate in &interval.rates {
                immediate |= installed
                    .attributes
                    .get(&rate.attribute)
                    .is_some_and(|definition| {
                        definition.value().implementation == "native-health-v1"
                    });
            }
            for target in interval
                .rates
                .iter()
                .map(|rate| &rate.target_id)
                .chain(interval.periodic.iter().map(|change| &change.target_id))
            {
                if target != &interval.entity_id {
                    reference_count += 1;
                    reference_bytes = reference_bytes
                        .checked_add(target.len())
                        .ok_or(ExecutionError::Capacity)?;
                }
            }
        }
        reservation.resize(
            heap_sum([
                reservation.bytes(),
                reference_bytes,
                map_storage::<String, ()>(reference_count).ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut referenced = IndexSet::with_capacity(reference_count);
        for handle in participants.statuses() {
            let entity = physical
                .entities
                .resolve(*handle)
                .ok_or(ExecutionError::Invariant)?;
            for state in entity
                .status_effects
                .iter()
                .flat_map(|states| states.values())
                .filter(|state| state.active)
            {
                for id in [&state.source_id, &state.action_target_id] {
                    if id != &entity.id {
                        referenced.insert(id.clone());
                    }
                }
            }
        }
        for interval in &rates {
            for target in interval
                .rates
                .iter()
                .map(|rate| &rate.target_id)
                .chain(interval.periodic.iter().map(|change| &change.target_id))
            {
                if target != &interval.entity_id {
                    referenced.insert(target.clone());
                }
            }
        }
        for handle in participants.ambient() {
            let entity = physical
                .entities
                .resolve(*handle)
                .ok_or(ExecutionError::Invariant)?;
            if entity.threat.is_some() {
                return Err(ExecutionError::UnsupportedFamily);
            }
            if let Some(heat) = &entity.heat {
                if heat.lit && heat.fuel_seconds > 0.0 {
                    bound.limit(heat.fuel_seconds);
                }
            }
            let Some(animal) = &entity.animal else {
                continue;
            };
            if animal.foraging.is_some() {
                return Err(ExecutionError::UnsupportedFamily);
            }
            for pattern in animal.acoustic_patterns.values() {
                bound.at(pattern.idle_expires_at);
            }
            if let Some(episode) = &animal.episode {
                let profile = crate::native_controller::selected_profile(&installed, animal)?;
                for danger in episode.dangers.values() {
                    bound.at(danger.expires_at(profile));
                    if profile.uncertainty_per_second > 0.0
                        && !matches!(danger, NativeDanger::Body { visible: true, .. })
                    {
                        bound.at(danger.uncertainty_from()
                            + profile.maximum_uncertainty / profile.uncertainty_per_second);
                    }
                }
                if let Some(clear) = episode.clear_since {
                    bound.at(clear + profile.settling_seconds);
                }
            }
            if let WanderClock::Due { due_at } = animal.wander {
                bound.at(due_at);
            }
        }
        let mut private_walkers = IndexSet::with_capacity(participants.actors().len());
        for handle in participants.actors() {
            let entity = physical
                .entities
                .resolve(*handle)
                .ok_or(ExecutionError::Invariant)?;
            let actor = entity.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
            if !actor.alive || actor.incapacitated {
                continue;
            }
            if entity.has_memory() {
                bound.at(crate::conditions::next_condition_review(entity));
            }
            for definition in installed
                .attributes
                .values()
                .map(|definition| definition.value())
                .filter(|definition| {
                    definition.condition.is_some() || definition.reservoir.is_some()
                })
            {
                let Some(AttributeValue::Number(value)) = read.value(&entity.id, &definition.id)?
                else {
                    continue;
                };
                if definition.reservoir.is_some() {
                    return Err(ExecutionError::UnsupportedFamily);
                }
                let AttributeSchema::Number { min, max, .. } = definition.schema else {
                    continue;
                };
                if let Some(condition) = &definition.condition {
                    let rate = sums.get(&entity.id, &definition.id);
                    for band in &condition.bands {
                        for threshold in
                            [band.below, max.min(band.below + condition.recovery_margin)]
                        {
                            if !(value == threshold
                                && ((value == min && rate < 0.0) || (value == max && rate > 0.0)))
                            {
                                bound.limit(crate::status::until_threshold(
                                    value, rate, threshold, epsilon,
                                ));
                            }
                        }
                    }
                }
            }
            let Some(action) = &actor.action else {
                continue;
            };
            if action.kind == "status-effect" {
                continue;
            }
            if action.kind != "move"
                || action.has_unconverted_fields()
                || actor
                    .agency
                    .plan
                    .as_ref()
                    .is_some_and(|plan| plan.activity.is_some())
            {
                return Err(ExecutionError::UnsupportedFamily);
            }
            if installed
                .capabilities
                .capability_blocked(Some(entity), "locomotion")?
            {
                continue;
            }
            if action.stage == "working" && action.remaining_seconds > 0.0 {
                bound.limit(action.remaining_seconds);
            }
            if action.stage != "approaching" || action.path.is_empty() {
                continue;
            }
            let speed = installed.movement_speed(entity)?;
            if action.navigation.is_none() && !referenced.contains(&entity.id) {
                private_walkers.insert(*handle);
                let mut from = entity
                    .world_position()
                    .ok_or(ExecutionError::InvalidPosition)?;
                let mut support = match &entity.placement {
                    Some(crate::state::Placement::World {
                        support_surface_id, ..
                    }) => support_surface_id.as_deref(),
                    _ => return Err(ExecutionError::InvalidPosition),
                };
                let mut length = 0.0;
                for point in &action.path {
                    length += crate::spatial::distance(from, point.point());
                    from = point.point();
                    if Some(point.surface_id.as_str()) != support {
                        break;
                    }
                    support = Some(&point.surface_id);
                }
                bound.limit(epsilon.max(length / speed));
            } else {
                let start = entity
                    .world_position()
                    .ok_or(ExecutionError::InvalidPosition)?;
                bound.limit(travel.get(*handle) / speed);
                bound.limit(
                    epsilon.max(crate::spatial::distance(start, action.path[0].point()) / speed),
                );
            }
        }
        bound.limit(crate::status::attribute_boundary(&read, &sums, epsilon)?);
        for handle in participants.statuses() {
            let entity = physical
                .entities
                .resolve(*handle)
                .ok_or(ExecutionError::Invariant)?;
            bound.at(crate::status::current_status_deadline(
                &read,
                &entity.id,
                &sums,
                epsilon,
                &mut core.journal.meters,
            )?);
        }
        let seconds = requested.min(epsilon.max(bound.seconds));
        let ends_at = (bound.absolute - now <= seconds).then_some(bound.absolute);
        drop(sums);
        Ok(Self {
            seconds,
            ends_at,
            requires_immediate_integration: immediate,
            rates,
            private_walkers,
            referenced,
            travel,
            _reservation: reservation,
        })
    }
}
