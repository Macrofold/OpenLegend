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
    pub changed_people: Option<IndexSet<String>>,
    pub objects_changed: bool,
}
/// Only the prior physical index category is retained, never received facts.
/// A detail pass updates this category before a later broad roster refresh.
pub(crate) struct ExposureObjects {
    ids: IndexSet<EntityHandle>,
    _reservation: ByteReservation,
}
impl ExposureObjects {
    pub(crate) fn same_categories(&self, other: &Self) -> bool {
        self.ids == other.ids
    }
}
pub(crate) struct ExposureSelection {
    pub observers: Vec<ExposureObserver>,
    pub objects: Option<ExposureObjects>,
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
            objects: None,
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
                changed_people: (!all).then(IndexSet::new),
                objects_changed: all,
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
        let prior = state.reception.exposure_objects.as_ref();
        let pending = state.reception.sensory.as_ref();
        let count = if all {
            0
        } else {
            prior.map_or(0, |objects| objects.ids.len())
        };
        let mut object_reservation = budget.reserve(
            heap_sum([
                size_of::<ExposureObjects>(),
                2 * size_of::<usize>(),
                map_storage::<EntityHandle, ()>(count).ok_or_else(capacity)?,
            ])
            .ok_or_else(capacity)?,
        )?;
        let mut objects = IndexSet::with_capacity(count);
        if !all {
            if let Some(prior) = prior {
                objects.extend(prior.ids.iter().copied());
            }
        }
        let mut update = |id: &str| -> Result<(), ExecutionError> {
            let Some(handle) = state.physical.entities.handle(id) else {
                return Ok(());
            };
            let entity = state
                .physical
                .entities
                .resolve(handle)
                .ok_or(ExecutionError::Invariant)?;
            if entity.physical_root() && entity.actively_participates() && entity.remains.is_some()
            {
                if !objects.contains(&handle) {
                    if objects.len() == objects.capacity() {
                        let next = objects
                            .len()
                            .checked_add(1)
                            .and_then(|n| n.checked_mul(2))
                            .ok_or_else(capacity)?;
                        let growth = map_storage::<EntityHandle, ()>(next)
                            .and_then(|n| {
                                n.checked_sub(map_storage::<EntityHandle, ()>(objects.capacity())?)
                            })
                            .ok_or_else(capacity)?;
                        object_reservation.resize(
                            object_reservation
                                .bytes()
                                .checked_add(growth)
                                .ok_or_else(capacity)?,
                        )?;
                    }
                    objects.try_reserve(1).map_err(|_| capacity())?;
                    objects.insert(handle);
                }
            } else {
                objects.shift_remove(&handle);
            }
            Ok(())
        };
        if all {
            for id in state.physical.entities.ordered_ids() {
                update(id)?;
            }
        } else {
            // Clone only this small derived object category, then consume the
            // real pending source scope; do not scan every actor per sample.
            if let Some(pending) = pending {
                for id in pending.scopes.keys() {
                    update(id)?;
                }
            }
        }
        result.objects = Some(ExposureObjects {
            ids: objects,
            _reservation: object_reservation,
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
                    result.observers[*at].changed_people = None;
                    result.observers[*at].objects_changed = true;
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
                    let handle = state.physical.entities.handle(source_id);
                    let was_object = handle.is_none_or(|handle| {
                        state
                            .reception
                            .exposure_objects
                            .as_ref()
                            .is_some_and(|objects| objects.ids.contains(&handle))
                    });
                    let is_object = handle.is_none_or(|handle| {
                        result
                            .objects
                            .as_ref()
                            .is_some_and(|objects| objects.ids.contains(&handle))
                    });
                    result.observers[at].objects_changed |= was_object || is_object;
                    if !was_object || !is_object {
                        mark_source(
                            &mut result.observers[at].changed_people,
                            source_id,
                            &mut result.reservation,
                        )?;
                    }
                    mark_source(
                        &mut result.observers[at].changed_detail,
                        source_id,
                        &mut result.reservation,
                    )?;
                }
            }
        }
        Ok(result)
    }
}

fn mark_source(
    changed: &mut Option<IndexSet<String>>,
    source: &str,
    reservation: &mut ByteReservation,
) -> Result<(), ExecutionError> {
    let Some(changed) = changed else {
        return Ok(());
    };
    if changed.contains(source) {
        return Ok(());
    }
    let growth = if changed.len() == changed.capacity() {
        let next = changed
            .len()
            .checked_add(1)
            .and_then(|n| n.checked_mul(2))
            .ok_or_else(capacity)?;
        map_storage::<String, ()>(next)
            .and_then(|bytes| bytes.checked_sub(map_storage::<String, ()>(changed.capacity())?))
            .ok_or_else(capacity)?
    } else {
        0
    };
    reservation
        .resize(heap_sum([reservation.bytes(), growth, source.len()]).ok_or_else(capacity)?)?;
    changed.try_reserve(1).map_err(|_| capacity())?;
    changed.insert(source.to_owned());
    Ok(())
}
