//! Accepted item reads. NPC context counts private possessions without
//! constructing the browser's list or retaining item names.

use crate::{
    execution::ExecutionError,
    host::{ByteBudget, ByteReservation},
    install::{OwnedItem, inventory_display_limit},
    simulation::SimulationState,
};
use indexmap::IndexMap;
use std::mem::size_of;

pub(super) struct OwnInventory<'a> {
    pub(super) count: usize,
    pub(super) items: Vec<OwnedItem<'a>>,
    pub(super) held: Vec<(&'a str, f64)>,
    pub(super) craft_stock: IndexMap<&'a str, u64>,
    pub(super) equipped: Vec<OwnedItem<'a>>,
    custody: ByteReservation,
}

pub(super) fn capture<'a>(
    state: &'a SimulationState,
    actor: &str,
    npc: bool,
    budget: &ByteBudget,
) -> Result<OwnInventory<'a>, ExecutionError> {
    let mut read = OwnInventory {
        count: 0,
        items: Vec::new(),
        held: Vec::new(),
        craft_stock: IndexMap::new(),
        equipped: Vec::new(),
        custody: budget.reserve(0)?,
    };
    let reads_recipes = !npc && !state.learned_capabilities.known_recipes(actor).is_empty();
    state.inventory.visit_owned(
        &state.physical.entities,
        &state.installed.retained,
        actor,
        actor,
        &mut |item| {
            read.count += 1;
            if !npc {
                push(
                    &mut read.held,
                    (item.id, item.available_quantity as f64),
                    &mut read.custody,
                )?;
                if reads_recipes {
                    let quantity = item.available_quantity;
                    if let Some(total) = read.craft_stock.get_mut(item.definition_id) {
                        *total = total
                            .saturating_add(quantity)
                            .min(crate::identity::MAX_SAFE_INTEGER);
                    } else {
                        let old = read.craft_stock.capacity();
                        if read.craft_stock.len() == old {
                            let next = old.checked_mul(2).ok_or(ExecutionError::Capacity)?.max(4);
                            let storage = crate::host::retained_size::map_storage::<&str, u64>;
                            let bytes = storage(next)
                                .and_then(|bytes| bytes.checked_sub(storage(old)?))
                                .and_then(|bytes| bytes.checked_add(read.custody.bytes()))
                                .ok_or(ExecutionError::Capacity)?;
                            read.custody.resize(bytes)?;
                            read.craft_stock
                                .try_reserve_exact(next - old)
                                .map_err(|_| ExecutionError::Capacity)?;
                        }
                        read.craft_stock.insert(item.definition_id, quantity);
                    }
                }
                if read.items.len() < inventory_display_limit() {
                    push(&mut read.items, item, &mut read.custody)?;
                }
                if item.equipped {
                    push(&mut read.equipped, item, &mut read.custody)?;
                }
            }
            Ok(())
        },
    )?;
    Ok(read)
}

fn push<T>(
    values: &mut Vec<T>,
    value: T,
    custody: &mut ByteReservation,
) -> Result<(), ExecutionError> {
    if values.len() == values.capacity() {
        let more = values.capacity().max(4);
        let bytes = more
            .checked_mul(size_of::<T>())
            .and_then(|bytes| custody.bytes().checked_add(bytes))
            .ok_or(ExecutionError::Capacity)?;
        custody.resize(bytes)?;
        values
            .try_reserve_exact(more)
            .map_err(|_| ExecutionError::Capacity)?;
    }
    values.push(value);
    Ok(())
}
