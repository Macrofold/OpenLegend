//! Accepted item reads. NPC context counts private possessions without
//! constructing the browser's list or retaining item names.

use crate::{
    execution::ExecutionError,
    host::{ByteBudget, ByteReservation},
    install::{OwnedItem, inventory_display_limit},
    simulation::SimulationState,
};
use std::mem::size_of;

pub(super) struct OwnInventory<'a> {
    pub(super) count: usize,
    pub(super) items: Vec<OwnedItem<'a>>,
    pub(super) held: Vec<(&'a str, f64)>,
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
        equipped: Vec::new(),
        custody: budget.reserve(0)?,
    };
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
