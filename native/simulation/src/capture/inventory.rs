//! Accepted item reads. NPC context counts private possessions without
//! constructing the browser's list or retaining item names.

use super::{PlayerMeleeSource, PlayerRangedSource};
use crate::{
    execution::ExecutionError,
    host::{ByteBudget, ByteReservation},
    install::{OwnedItem, inventory_display_limit},
    projectile::loadout,
    simulation::SimulationState,
    state::Entity,
};
use indexmap::IndexMap;
use std::mem::size_of;

pub(super) struct OwnInventory<'a> {
    pub(super) count: usize,
    pub(super) items: Vec<OwnedItem<'a>>,
    pub(super) held: Vec<(&'a str, f64)>,
    pub(super) craft_stock: IndexMap<&'a str, u64>,
    pub(super) equipped: Vec<OwnedItem<'a>>,
    pub(super) ranged_source: Option<PlayerRangedSource<'a>>,
    pub(super) melee_source: Option<PlayerMeleeSource<'a>>,
    custody: ByteReservation,
}

pub(super) fn capture<'a>(
    state: &'a SimulationState,
    actor: &'a Entity,
    npc: bool,
    budget: &ByteBudget,
) -> Result<OwnInventory<'a>, ExecutionError> {
    let installed = &state.installed;
    let policy = installed.manifest.ranged_policy.as_ref().filter(|_| {
        !npc && installed.occurrence_rules.value().ranged.is_some()
            && installed
                .retained
                .item_handling_read
                .can_handle(&actor.spatial.body.id)
    });
    let weapon = if policy.is_some() {
        loadout::weapon(state, actor, None, false, |_| true)?
    } else {
        None
    };
    let (ranged_source, ammunition_kind) = policy
        .zip(weapon)
        .and_then(|(policy, (item, definition))| {
            let weapon = definition.ranged_weapon.as_ref()?;
            Some((
                PlayerRangedSource {
                    weapon: item.id,
                    ammunition: None,
                    label: &definition.named.name,
                    point_fire: policy.point_fire,
                    target_rule: policy.target_rule(),
                    profile: definition.execution.as_ref().map(|timing| &timing.profile),
                },
                weapon.ammunition_kind.as_str(),
            ))
        })
        .map_or((None, None), |(source, kind)| (Some(source), Some(kind)));
    let mut read = OwnInventory {
        count: 0,
        items: Vec::new(),
        held: Vec::new(),
        craft_stock: IndexMap::new(),
        equipped: Vec::new(),
        ranged_source,
        melee_source: None,
        custody: budget.reserve(0)?,
    };
    let reads_recipes = !npc
        && !state
            .learned_capabilities
            .known_recipes(&actor.id)
            .is_empty();
    state.inventory.visit_owned(
        &state.physical,
        &state.installed.retained,
        &actor.id,
        &actor.id,
        &mut |item| {
            read.count += 1;
            if !npc {
                // Select from the same full, accessible inventory pass that
                // funds the own view. The display page can omit this lot.
                if let Some(source) = read.ranged_source.as_mut()
                    && source.ammunition.is_none()
                    && item.available_quantity > 0
                    && installed
                        .retained
                        .items
                        .get(item.definition_id)
                        .and_then(|definition| definition.ammunition.as_ref())
                        .is_some_and(|ammo| Some(ammo.kind.as_str()) == ammunition_kind)
                {
                    source.ammunition = Some(item.id);
                }
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
                    if read.ranged_source.is_none() && read.melee_source.is_none()
                        && let Some(strike) = crate::contact::ContactRead::equipped(
                            installed, &state.physical.entities, actor, item.id,
                        )
                        && let crate::contact::ContactKind::Equipped { definition, .. } = strike.kind
                    {
                        read.melee_source = Some(PlayerMeleeSource {
                            item: item.id,
                            definition: strike.id,
                            label: &definition.named.name,
                            profile: definition.execution.as_ref().map(|timing| &timing.profile),
                        });
                    }
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
