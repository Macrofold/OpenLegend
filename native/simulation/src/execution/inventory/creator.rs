//! A creator changes a single definition's direct carried quantity. Tracked
//! objects and their custody keep using the normal possession operations.
use super::*;
use crate::{install::ItemDefinitionRead, simulation::SimulationState, text::JsText};
use serde::Serialize;

#[derive(Serialize)]
pub struct CreatorStock<'a> {
    id: &'a str,
    name: &'a JsText,
    quantity: Option<u64>,
    restriction: Option<&'static str>,
    #[serde(skip)]
    lot: Option<&'a str>,
}

#[derive(Serialize)]
pub struct CreatorInventory<'a> {
    pub revision: u64,
    rows: Vec<CreatorStock<'a>>,
    next: Option<usize>,
    #[serde(skip)]
    _custody: ByteReservation,
}

const DISTINCT: &str =
    "Use possession controls for separate, equipped, owned or individually tracked objects.";
const RESERVED: &str = "Finish or cancel the work holding this inventory before editing it.";
const BUSY: &str = "Stop the character's current work before editing inventory.";

fn ordinary_definition(definition: &ItemDefinitionRead) -> bool {
    definition.portable
        && !definition.is_container()
        && !definition.tracks_material_origins
        && definition
            .material
            .as_ref()
            .is_none_or(|rule| rule.homogeneous)
}

/// Page directly into the installed catalogue and visit this character's
/// immediate contents once. The caller owns the returned page reservation.
pub(crate) fn creator_inventory<'a>(
    state: &'a SimulationState,
    person: &'a Entity,
    start: usize,
    limit: usize,
    budget: &ByteBudget,
) -> Result<CreatorInventory<'a>, ExecutionError> {
    let definitions = &state.installed.retained.items;
    let end = start.saturating_add(limit).min(definitions.len());
    let count = end.saturating_sub(start);
    let custody = budget.reserve(count * size_of::<CreatorStock>())?;
    let mut rows = Vec::with_capacity(count);
    for index in start..end {
        let (id, definition) = definitions
            .get_index(index)
            .ok_or(ExecutionError::Invariant)?;
        rows.push(CreatorStock {
            id,
            name: &definition.named.name,
            quantity: Some(0),
            lot: None,
            restriction: (!ordinary_definition(definition)).then_some(DISTINCT),
        });
    }
    let mut restriction = person
        .actor
        .as_ref()
        .and_then(|a| a.action.as_ref())
        .map(|_| BUSY);
    for entity in state
        .inventory
        .children(&state.physical.entities, &person.id, false)
    {
        if state.physical.holds.quantity(&entity.id) > 0 {
            restriction.get_or_insert(RESERVED);
        }
        let Some(lot) = &entity.item else { continue };
        let Some((index, _, definition)) = definitions.get_full(&lot.definition_pin.id) else {
            continue;
        };
        let Some(row) = index.checked_sub(start).and_then(|i| rows.get_mut(i)) else {
            continue;
        };
        row.quantity = row
            .quantity
            .and_then(|n| n.checked_add(lot.quantity))
            .filter(|n| *n <= MAX_SAFE_INTEGER);
        if row.lot.replace(&entity.id).is_some()
            || lot.definition_pin != definition.pin
            || lot.unit_pin != *crate::install::item_count_pin()
            || lot.material_origin_ids.is_some()
            || lot.material_contribution_ids.is_some()
            || entity.declared_owner.is_some()
            || !matches!(&entity.placement, Some(Placement::Contained { .. }))
            || !partitionable_stock(entity, definition)
        {
            row.restriction = Some(DISTINCT);
        }
    }
    if let Some(reason) = restriction {
        for row in &mut rows {
            row.restriction = Some(reason);
        }
    }
    Ok(CreatorInventory {
        revision: person.inventory_revision.unwrap_or_default(),
        rows,
        next: (end < definitions.len()).then_some(end),
        _custody: custody,
    })
}

impl CoreMutation<'_> {
    pub(crate) fn edit_creator_stock(
        &mut self,
        actor: &str,
        edit: &crate::runtime::PersonInventoryEdit,
    ) -> Result<Result<(), &'static str>, ExecutionError> {
        let Some(index) = self
            .state
            .installed
            .retained
            .items
            .get_index_of(&edit.definition_id)
        else {
            return Ok(Err("This item type is unavailable."));
        };
        let person = self
            .state
            .physical
            .entities
            .get(actor)
            .ok_or(ExecutionError::MissingActor)?;
        let budget = self.journal.physical.budget.clone();
        let page = creator_inventory(self.state, person, index, 1, &budget)?;
        let row = page.rows.first().ok_or(ExecutionError::Invariant)?;
        if page.revision != edit.expected_revision {
            return Ok(Err("The inventory changed. Reload it before editing."));
        }
        if let Some(reason) = row.restriction {
            return Ok(Err(reason));
        }
        let current = row.quantity.ok_or(ExecutionError::Capacity)?;
        if current == edit.quantity {
            return Ok(Ok(()));
        }
        if let Some(id) = row.lot {
            let _draft = budget.reserve(id.len() + 128)?;
            let id = id.to_owned();
            if edit.quantity > current {
                self.grow_direct_lot(actor, &id, edit.quantity - current, true)?;
            } else {
                let amounts = IndexMap::from([(id, current - edit.quantity)]);
                let Some(plan) = self.plan_owned_debits(actor, &amounts)? else {
                    return Ok(Err(DISTINCT));
                };
                self.use_owned_lots(actor, "creator-inventory-edit", plan)?;
            }
        } else {
            self.produce_carried_stock(actor, &edit.definition_id, edit.quantity)?;
        }
        Ok(Ok(()))
    }
}
