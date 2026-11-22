//! Choose exact accessible origins under one current grant. The caller uses
//! the same admissible lot predicate as consumption and never combines rights.
use super::{Definition, Stone};
use crate::construction_gather::{ConstructionGather, MaterialGrant, MaterialGrantFence};
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation};
use crate::simulation::SimulationState;
use crate::state::{Entity, SurfacePoint};
use crate::work::WorkUnit;
use serde::Deserialize;
use std::{mem::size_of, sync::LazyLock};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct StockTransferLimits {
    examined: usize,
    pub(super) moved_lots: usize,
}
pub(super) fn limits() -> &'static StockTransferLimits {
    static LIMITS: LazyLock<StockTransferLimits> = LazyLock::new(|| {
        serde_json::from_str(include_str!(
            "../../../../packages/domain/src/stock-transfer-limits.json"
        ))
        .expect("shared stock transfer limits")
    });
    &LIMITS
}

pub(crate) enum MaterialSelection {
    Ready {
        grant: MaterialGrantFence,
        stones: Vec<Stone>,
        custody: ByteReservation,
    },
    Incomplete,
    Insufficient,
}

pub(crate) fn select_materials(
    core: &mut CoreMutation<'_>,
    actor_id: &str,
    definition: &Definition,
    site: &SurfacePoint,
    budget: &ByteBudget,
) -> Result<MaterialSelection, ExecutionError> {
    let mut custody = budget.reserve(
        site.surface_id.len() + size_of::<crate::construction_gather::ConstructionSite>(),
    )?;
    let bounds = super::site::grant_bounds(site, definition);
    let world = &*core.state;
    let actor = world
        .physical
        .entities
        .get(actor_id)
        .ok_or(ExecutionError::MissingActor)?;
    let authority = &core.journal.material_gather;
    let mut incomplete = false;
    let transfer = limits();
    for grant in authority.hearth_grants() {
        core.journal.meters.charge(&[(WorkUnit::Candidates, 1)])?;
        if !grant.permits_hearth(&actor.id, world.physical.header.sim_time, &bounds) {
            continue;
        }
        custody.resize(
            size_of::<crate::construction_gather::ConstructionSite>()
                + site.surface_id.len()
                + transfer.moved_lots * size_of::<Stone>(),
        )?;
        let mut stones = Vec::with_capacity(transfer.moved_lots);
        let mut open = definition.input.quantity;
        let mut examined = 0;
        world.inventory.visit_owned_until(
            &world.physical.entities,
            &actor.id,
            &actor.id,
            &mut |entity, _| {
                core.journal.meters.charge(&[(WorkUnit::Candidates, 1)])?;
                examined += 1;
                if examined > transfer.examined {
                    incomplete = true;
                    return Ok(true);
                }
                let Some(lot) = entity
                    .item
                    .as_ref()
                    .filter(|lot| lot.definition_pin == definition.input.definition)
                else {
                    return Ok(false);
                };
                let Some(origins) = lot.material_origin_ids.as_ref().filter(|origins| {
                    grant.permits_origins(
                        origins,
                        lot.material_contribution_ids.as_deref().unwrap_or_default(),
                    )
                }) else {
                    return Ok(false);
                };
                let previous = actor.actor.as_ref().and_then(|actor| actor.action.as_ref());
                let released = previous
                    .and_then(|action| action.hearth_work.as_ref())
                    .and_then(|work| work.stones.iter().find(|stone| stone.item_id == entity.id))
                    .map_or(0, |stone| stone.quantity);
                let still_held = world
                    .physical
                    .holds
                    .quantity(&entity.id)
                    .saturating_sub(released);
                let quantity = open.min(lot.quantity.saturating_sub(still_held));
                if quantity == 0 {
                    return Ok(false);
                }
                if !crate::execution::can_debit_lot_after_hold(world, entity, quantity, still_held)
                {
                    return Ok(false);
                }
                let bytes = heap_sum([
                    origins.heap_bytes().ok_or(ExecutionError::Capacity)?,
                    origins.len() * size_of::<String>(),
                    entity.id.len(),
                ])
                .ok_or(ExecutionError::Capacity)?;
                core.journal.meters.charge(&[
                    (WorkUnit::Candidates, origins.len() as u64),
                    (WorkUnit::OutputBytes, bytes as u64),
                ])?;
                custody.resize(
                    custody
                        .bytes()
                        .checked_add(bytes)
                        .ok_or(ExecutionError::Capacity)?,
                )?;
                stones.push(Stone {
                    item_id: entity.id.clone(),
                    quantity,
                    origin_ids: origins.clone(),
                });
                open -= quantity;
                let at_limit = open != 0 && stones.len() == transfer.moved_lots;
                incomplete |= at_limit;
                Ok(open == 0 || at_limit)
            },
        )?;
        if open == 0 {
            custody.resize(
                custody
                    .bytes()
                    .checked_add(grant.id.len())
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            return Ok(MaterialSelection::Ready {
                grant: authority.hearth_fence(grant)?,
                stones,
                custody,
            });
        }
    }
    Ok(if incomplete {
        MaterialSelection::Incomplete
    } else {
        MaterialSelection::Insufficient
    })
}

/// Checks exact grant, actor life and own claim identities without a stock
/// scan. The one selected physical candidate may then prepare its debit.
pub(crate) fn current_problem(
    world: &SimulationState,
    authority: &ConstructionGather,
    actor: &Entity,
    action: &crate::state::Action,
    definition: &Definition,
    at: f64,
    budget: &ByteBudget,
) -> Result<Option<&'static crate::worlds::InstalledActionMessage>, ExecutionError> {
    let Some(work) = &action.hearth_work else {
        return Err(ExecutionError::Invariant);
    };
    let Some(fence) = &action.construction_grant else {
        return Err(ExecutionError::Invariant);
    };
    if actor.physical_life().unwrap_or_default() != work.physical_life {
        return Ok(Some(&super::messages().changed));
    }
    let _bounds = budget.reserve(
        work.site.surface_id.len() + size_of::<crate::construction_gather::ConstructionSite>(),
    )?;
    let bounds = super::site::grant_bounds(&work.site, definition);
    let Some(grant) = authority.current_hearth_grant(fence, &actor.id, at, &bounds)? else {
        return Ok(Some(&super::messages().changed));
    };
    for (index, stone) in work.stones.iter().enumerate() {
        if !stone_current(world, actor, action, definition, grant, index, stone)? {
            return Ok(Some(&super::messages().changed_material));
        }
    }
    Ok(None)
}

fn stone_current(
    world: &SimulationState,
    actor: &Entity,
    action: &crate::state::Action,
    definition: &Definition,
    grant: &MaterialGrant,
    index: usize,
    stone: &Stone,
) -> Result<bool, ExecutionError> {
    let Some(entity) = world.physical.entities.get(&stone.item_id) else {
        return Ok(false);
    };
    let Some(lot) = entity.item.as_ref() else {
        return Ok(false);
    };
    let own = crate::install::owned_by(
        &world.physical,
        &world.installed.retained,
        &actor.id,
        &entity.id,
    )?;
    let held = world.physical.holds.quantity(&entity.id);
    Ok(own.is_some()
        && lot.definition_pin == definition.input.definition
        && lot.material_origin_ids.as_ref() == Some(&stone.origin_ids)
        && grant.permits_origins(
            &stone.origin_ids,
            lot.material_contribution_ids.as_deref().unwrap_or_default(),
        )
        && world.physical.holds.matches(
            &actor.id,
            &action.id,
            index,
            stone,
            &definition.input.definition,
        )
        && crate::execution::can_debit_lot_after_hold(
            world,
            entity,
            stone.quantity,
            held.saturating_sub(stone.quantity),
        ))
}
