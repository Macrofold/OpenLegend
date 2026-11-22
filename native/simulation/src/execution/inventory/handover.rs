//! Trade moves stock between the participants' owned roots. The consent
//! writer owns the enclosing checkpoint and both parties' private receipts.
use super::packing::{PackingChange, check_packing};
use super::pickup::DirectRelocation;
use super::*;

/// The recipient needs a supported, exposed place for a bag already holding
/// loose material. Use the same physical shape rule as ordinary inventory moves.
pub(crate) fn can_receive_trade_container(
    state: &crate::simulation::SimulationState,
    recipient: &str,
    id: &str,
) -> bool {
    let entities = &state.physical.entities;
    let Some(item) = entities.get(id) else {
        return false;
    };
    let Some(receiver) = entities.get(recipient) else {
        return false;
    };
    let definitions = &state.installed.retained.items;
    let Some(definition) = item
        .item
        .as_ref()
        .and_then(|lot| definitions.get(&lot.definition_pin.id))
    else {
        return false;
    };
    !definition.has_open_contents()
        || (receiver.world_support().is_some() && super::transfer::positive_body(item))
        || !state.inventory.children(entities, id, false).any(|child| {
            child
                .item
                .as_ref()
                .and_then(|lot| definitions.get(&lot.definition_pin.id))
                .is_some_and(|definition| definition.exposure.is_some())
        })
}

impl CoreMutation<'_> {
    /// Resolve the exact carried source, admit its ancestor load changes,
    /// and transfer this lot through the common split and placement owner.
    pub(crate) fn transfer_trade_lot(
        &mut self,
        giver: &str,
        receiver: &str,
        id: &str,
        quantity: u64,
        merge: bool,
    ) -> Result<Option<String>, ExecutionError> {
        use crate::install::{inventory_ancestor_limit, inventory_parent, owned_item_ancestry};
        let state = &self.state;
        let entities = &state.physical.entities;
        let item = entities.get(id).ok_or(ExecutionError::Invariant)?;
        let source = inventory_parent(item).ok_or(ExecutionError::Invariant)?;
        let lot = item.item.as_ref().ok_or(ExecutionError::Invariant)?;
        let definitions = &state.installed.retained;
        let attached = matches!(item.placement, Some(Placement::Attached { .. }));
        if source == giver && !attached {
            return self
                .transfer_direct_loose_lot(giver, receiver, id, quantity, "handover", merge);
        }

        let limit = inventory_ancestor_limit();
        let _workspace = self
            .journal
            .budget
            .reserve(limit * size_of::<EntityHandle>() + source.len())?;
        let mut bags = Vec::with_capacity(limit);
        if owned_item_ancestry(&state.physical, giver, id, |bag| {
            bags.extend(entities.handle(&bag.id))
        })?
        .is_none()
        {
            return Ok(None);
        }
        let load = definitions
            .packing_load_for(&lot.definition_pin)
            .and_then(|unit| unit.checked_mul(quantity))
            .and_then(|mass| mass.checked_add(item.container.as_ref().map_or(0, |bag| bag.load)))
            .filter(|load| *load <= MAX_SAFE_INTEGER);
        let remove = PackingChange::Remove(load.unwrap_or_default());
        if check_packing(state, &[(&bags, remove)], load)?.is_err() {
            return Ok(None);
        }
        let source = source.to_owned();
        let moved = self.relocate_stock(DirectRelocation {
            source: &source,
            destination: receiver,
            actor: receiver,
            source_owner: Some(giver),
            destination_owner: Some(receiver),
            item: id,
            quantity,
            cause: "handover",
            merge_receiving_lot: merge,
            publish_contents: true,
        })?;
        if moved.is_some() {
            for (index, bag) in bags.into_iter().enumerate() {
                self.publish_packing(bag, remove, index == 0)?;
            }
            if attached {
                self.journal
                    .physical
                    .change(PhysicalChange::ObservationParameters {
                        entity_id: giver.into(),
                        request_detail: true,
                    })?;
            }
        }
        Ok(moved)
    }
}
