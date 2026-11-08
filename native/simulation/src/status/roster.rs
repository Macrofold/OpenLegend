//! The existing immutable controller/kind roster. It caches only static rule
//! membership; active flags, meters, numeric values and clocks remain live.
use super::*;
use crate::execution::ExecutionError;
use crate::host::retained_size::{heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::work::WorkMeters;
use std::{
    mem::size_of,
    sync::{Arc, Mutex},
};

pub(crate) struct StatusRoster {
    selected: Vec<bool>,
    _reservation: ByteReservation,
}
impl StatusRoster {
    pub(crate) fn selected(&self, index: usize) -> bool {
        self.selected.get(index) == Some(&true)
    }
}
pub(crate) struct StatusRosters {
    controllers: Mutex<IndexMap<String, IndexMap<String, Arc<StatusRoster>>>>,
}
fn growth<K, V>(len: usize, capacity: usize) -> Result<usize, ExecutionError> {
    if len < capacity {
        Ok(0)
    } else {
        map_storage::<K, V>(
            len.checked_add(1)
                .and_then(|n| n.checked_mul(2))
                .ok_or(ExecutionError::Capacity)?,
        )
        .ok_or(ExecutionError::Capacity)
    }
}
fn static_fields(
    read: &StatusRead<'_>,
    bindings: EffectBindings<'_>,
    condition: &StatusCondition,
    under_any: bool,
    possible: &mut bool,
    meters: &mut WorkMeters,
) -> Result<(), ExecutionError> {
    if !*possible {
        return Ok(());
    }
    match condition {
        StatusCondition::All { all } => {
            for child in all {
                static_fields(read, bindings, child, under_any, possible, meters)?
            }
        }
        StatusCondition::Any { any } => {
            for child in any {
                static_fields(read, bindings, child, true, possible, meters)?
            }
        }
        StatusCondition::Field { field }
            if !under_any && matches!(field.name.as_str(), "controller" | "kind") =>
        {
            *possible = read.evaluate_metered(bindings, condition, meters)?.matches;
        }
        _ => {}
    }
    Ok(())
}
impl StatusRosters {
    pub(crate) fn new() -> Self {
        Self {
            controllers: Mutex::new(IndexMap::new()),
        }
    }
    pub(crate) fn get(
        &self,
        read: &StatusRead<'_>,
        entity: &Entity,
        meters: &mut WorkMeters,
        budget: &ByteBudget,
    ) -> Result<Arc<StatusRoster>, ExecutionError> {
        // Current-format controllers are nonempty player/npc/native tags. The
        // empty key denotes the Source undefined controller of an inert object.
        let controller = entity
            .actor
            .as_ref()
            .map_or("", |actor| actor.controller.as_str());
        let kind = entity.kind.as_str();
        let mut controllers = self
            .controllers
            .lock()
            .map_err(|_| ExecutionError::Invariant)?;
        if let Some(known) = controllers
            .get(controller)
            .and_then(|kinds| kinds.get(kind))
        {
            return Ok(known.clone());
        }
        let outer = if controllers.contains_key(controller) {
            0
        } else {
            growth::<String, IndexMap<String, Arc<StatusRoster>>>(
                controllers.len(),
                controllers.capacity(),
            )?
        };
        let inner = controllers.get(controller).map_or_else(
            || growth::<String, Arc<StatusRoster>>(0, 0),
            |kinds| growth::<String, Arc<StatusRoster>>(kinds.len(), kinds.capacity()),
        )?;
        let bytes = heap_sum([
            size_of::<StatusRoster>(),
            2 * size_of::<usize>(),
            read.policy.definitions.len() * size_of::<bool>(),
            outer,
            inner,
            if controllers.contains_key(controller) {
                0
            } else {
                controller.len()
            },
            kind.len(),
            controller.len().max(kind.len()),
        ])
        .ok_or(ExecutionError::Capacity)?;
        let reservation = budget.reserve(bytes)?;
        let mut selected = Vec::with_capacity(read.policy.definitions.len());
        let bindings = EffectBindings::for_status(&entity.id, None);
        for definition in &read.policy.definitions {
            let mut possible = definition.enabled
                && definition.automatic_activation.is_some()
                && (!definition.occupies_action || entity.actor.is_some());
            static_fields(
                read,
                bindings,
                &definition.requires,
                false,
                &mut possible,
                meters,
            )?;
            if let Some(condition) = &definition.activation_condition {
                static_fields(read, bindings, condition, false, &mut possible, meters)?;
            }
            if let Some(condition) = &definition.automatic_activation {
                static_fields(read, bindings, condition, false, &mut possible, meters)?;
            }
            selected.push(possible);
        }
        let roster = Arc::new(StatusRoster {
            selected,
            _reservation: reservation,
        });
        if !controllers.contains_key(controller) {
            controllers
                .try_reserve(1)
                .map_err(|_| ExecutionError::Capacity)?;
            controllers.insert(controller.to_owned(), IndexMap::new());
        }
        let kinds = controllers
            .get_mut(controller)
            .ok_or(ExecutionError::Invariant)?;
        kinds.try_reserve(1).map_err(|_| ExecutionError::Capacity)?;
        kinds.insert(kind.to_owned(), roster.clone());
        Ok(roster)
    }
}
