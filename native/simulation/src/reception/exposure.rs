//! The physical index and pending old/new scopes select actual observer work.
//! Preparation contains IDs only; it is neither an observation nor authority to
//! refresh another subject's detail. See docs/performance/spatial.md.
use super::*;
use crate::execution::ExecutionError;
use crate::host::retained_size::{heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::simulation::SimulationState;
use crate::state::{EntityHandle, Point};
use indexmap::{IndexMap, IndexSet};
use std::mem::size_of;

pub(crate) struct ExposureObserver {
    pub handle: EntityHandle,
    pub affected: bool,
    /// None widens to every selected detail. An empty set proves that no
    /// subject changed; a source-only write contains only that subject.
    pub changed_detail: Option<IndexSet<String>>,
}
pub(crate) struct ExposureSelection {
    pub observers: Vec<ExposureObserver>,
    reservation: ByteReservation,
}
fn capacity() -> ExecutionError {
    ExecutionError::Capacity
}
fn within(a: Point, b: Point, radius: f64) -> bool {
    crate::spatial::distance(a, b) <= radius
}
impl ExposureSelection {
    pub(crate) fn prepare(
        state: &SimulationState,
        selected: &[EntityHandle],
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let reservation = budget.reserve(
            heap_sum([
                size_of::<Self>(),
                selected
                    .len()
                    .checked_mul(size_of::<ExposureObserver>())
                    .ok_or_else(capacity)?,
            ])
            .ok_or_else(capacity)?,
        )?;
        let mut result = Self {
            observers: Vec::with_capacity(selected.len()),
            reservation,
        };
        let all = !state.reception.exposure_prepared
            || state
                .reception
                .sensory
                .as_ref()
                .is_some_and(|pending| pending.all == Some(true));
        for handle in selected {
            let entity = state
                .physical
                .entities
                .resolve(*handle)
                .ok_or(ExecutionError::MissingEntity)?;
            if !entity.actively_participates()
                || !entity.actor.as_ref().is_some_and(|actor| actor.alive)
                || !(entity.has_memory()
                    || (entity.animal.is_some()
                        && entity
                            .actor
                            .as_ref()
                            .is_some_and(|actor| actor.controller == "native")
                        && routine_observation_relevant(&state.reception, entity)))
            {
                continue;
            }
            // Continuous contact needs its own exact body/line-of-effect owner.
            // Do not silently treat an installed detector as absent.
            if sensors::selected_senses(&state.installed, entity)
                .any(|sense| matches!(sense, SenseDefinition::BodyContact { .. }))
            {
                return Err(ExecutionError::UnsupportedFamily);
            }
            result.observers.push(ExposureObserver {
                handle: *handle,
                affected: all,
                changed_detail: (!all).then(IndexSet::new),
            });
        }
        result.observers.sort_by(|a, b| {
            let a = state
                .physical
                .entities
                .resolve(a.handle)
                .expect("Selected exposure observer");
            let b = state
                .physical
                .entities
                .resolve(b.handle)
                .expect("Selected exposure observer");
            state
                .physical
                .entities
                .ordering(&a.id)
                .cmp(&state.physical.entities.ordering(&b.id))
        });
        if all {
            return Ok(result);
        }
        let _index = budget.reserve(
            map_storage::<EntityHandle, usize>(result.observers.len()).ok_or_else(capacity)?,
        )?;
        let by_handle: IndexMap<_, _> = result
            .observers
            .iter()
            .enumerate()
            .map(|(at, entry)| (entry.handle, at))
            .collect();
        let Some(pending) = state.reception.sensory.as_ref() else {
            return Ok(result);
        };
        // The admitted vision family already bounds its radius. One shared
        // broad envelope selects observer candidates; each uses its exact range.
        let range = state
            .installed
            .senses
            .values()
            .filter_map(|sense| match sense.value() {
                SenseDefinition::VisionGeometry { radius, .. } => Some(*radius + 2.0),
                _ => None,
            })
            .fold(0.0, f64::max);
        for (source_id, scope) in &pending.scopes {
            if scope.observer {
                if let Some(at) = state
                    .physical
                    .entities
                    .handle(source_id)
                    .and_then(|handle| by_handle.get(&handle))
                {
                    result.observers[*at].affected = true;
                    result.observers[*at].changed_detail = None;
                }
            }
            let current = state
                .physical
                .entities
                .get(source_id)
                .and_then(|entity| entity.world_position());
            for position in [scope.before, scope.after.or(current)]
                .into_iter()
                .flatten()
            {
                let (count, _) = state.physical.bodies.candidate_capacity(position, range);
                let _candidates = budget.reserve(
                    count
                        .checked_mul(4 * size_of::<(&str, EntityHandle)>())
                        .ok_or_else(capacity)?,
                )?;
                for (_, handle) in state.physical.bodies.candidates(position, range) {
                    let Some(at) = by_handle.get(&handle).copied() else {
                        continue;
                    };
                    let observer = state
                        .physical
                        .entities
                        .resolve(handle)
                        .ok_or(ExecutionError::MissingEntity)?;
                    let radius = if state
                        .installed
                        .capabilities
                        .capability_blocked(Some(observer), "perception")?
                    {
                        0.0
                    } else {
                        sensors::vision_parameters(&state.installed, observer).radius
                    } + 2.0;
                    if !within(
                        position,
                        observer
                            .world_position()
                            .ok_or(ExecutionError::InvalidPosition)?,
                        radius,
                    ) {
                        continue;
                    }
                    result.observers[at].affected = true;
                    let Some(changed) = result.observers[at].changed_detail.as_ref() else {
                        continue;
                    };
                    if changed.contains(source_id) {
                        continue;
                    }
                    let growth = if changed.len() == changed.capacity() {
                        let next = changed
                            .len()
                            .checked_add(1)
                            .and_then(|n| n.checked_mul(2))
                            .ok_or_else(capacity)?;
                        map_storage::<String, ()>(next)
                            .and_then(|bytes| {
                                bytes.checked_sub(map_storage::<String, ()>(changed.capacity())?)
                            })
                            .ok_or_else(capacity)?
                    } else {
                        0
                    };
                    result.reservation.resize(
                        heap_sum([result.reservation.bytes(), growth, source_id.len()])
                            .ok_or_else(capacity)?,
                    )?;
                    let changed = result.observers[at]
                        .changed_detail
                        .as_mut()
                        .ok_or(ExecutionError::Invariant)?;
                    changed.try_reserve(1).map_err(|_| capacity())?;
                    changed.insert(source_id.clone());
                }
            }
        }
        Ok(result)
    }
}
