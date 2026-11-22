//! Whole-lot pickup keeps both the item identity and any nested contents.
//! Reach, visibility and the work timer are owned by the ordinary action.
use super::*;
use crate::ground_items::{pickup_lot, pickup_pile};

impl CoreMutation<'_> {
    pub(crate) fn take_ground_lot(
        &mut self,
        actor: &str,
        pile: &str,
        item: &str,
    ) -> Result<bool, ExecutionError> {
        let entities = &self.state.physical.entities;
        let (Some(source), Some(destination), Some(child)) = (
            entities.handle(pile),
            entities.handle(actor),
            entities.handle(item),
        ) else {
            return Ok(false);
        };
        let body = entities
            .resolve(destination)
            .ok_or(ExecutionError::Invariant)?;
        let Some(pile_body) = pickup_pile(self.state, body, pile) else {
            return Ok(false);
        };
        let Some(selected) = pickup_lot(self.state, pile_body, item) else {
            return Ok(false);
        };
        if !self
            .state
            .inventory
            .has_direct_item(entities, pile, selected.entity)
        {
            return Err(ExecutionError::Invariant);
        }
        let Some(Placement::Contained { revision, .. }) = &selected.entity.placement else {
            return Err(ExecutionError::Invariant);
        };
        let next_placement = next_revision(*revision)?;
        let item_before = selected.lot.revision;
        let next_item = next_revision(item_before)?;
        let source_before = pile_body.inventory_revision;
        let source_after = next_revision(source_before.unwrap_or_default())?;
        let destination_before = body.inventory_revision;
        let destination_after = next_revision(destination_before.unwrap_or_default())?;
        let prior_membership = self.state.administration.object_membership.revision;
        let next_membership = next_revision(prior_membership)?;
        self.journal.physical.reserve(
            heap_sum([
                size_of::<Undo>(),
                size_of::<InventoryUndo>(),
                size_of::<ContentsBefore>(),
                actor.len(),
                pile.len(),
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let detached = self.state.inventory.detach_loose_item(pile, child)?;
        self.journal
            .physical
            .undo
            .push(Undo::Inventory(Box::new(InventoryUndo {
                parent: source,
                previous_contents: source_before,
                previous_membership: prior_membership,
                child,
                edit: ItemEdit::Move {
                    destination,
                    detached,
                    old_placement: None,
                    item_before,
                },
                lineage: None,
                prior_lineage_presence: false,
                extra_contents: vec![ContentsBefore {
                    handle: destination,
                    revision: destination_before,
                    bag: None,
                }],
            })));
        self.state
            .inventory
            .add_item(entities, actor, child, &self.journal.budget)?;
        let entities = &mut self.state.physical.entities;
        let lot = entities
            .resolve_mut(child)
            .ok_or(ExecutionError::Invariant)?;
        let replaced = lot
            .placement
            .replace(Placement::Contained {
                parent_entity_id: actor.into(),
                revision: next_placement,
            })
            .ok_or(ExecutionError::Invariant)?;
        let Some(Undo::Inventory(moved)) = self.journal.physical.undo.last_mut() else {
            return Err(ExecutionError::Invariant);
        };
        let ItemEdit::Move { old_placement, .. } = &mut moved.edit else {
            return Err(ExecutionError::Invariant);
        };
        *old_placement = Some(replaced);
        lot.item.as_mut().ok_or(ExecutionError::Invariant)?.revision = next_item;
        entities
            .resolve_mut(source)
            .ok_or(ExecutionError::Invariant)?
            .inventory_revision = Some(source_after);
        entities
            .resolve_mut(destination)
            .ok_or(ExecutionError::Invariant)?
            .inventory_revision = Some(destination_after);
        self.state.administration.object_membership.revision = next_membership;
        entities.settle_operational_memory(child, &mut self.journal.physical.reservation, false)?;
        Ok(true)
    }

    pub(crate) fn retire_empty_pickup_pile(&mut self, pile: &str) -> Result<(), ExecutionError> {
        if self.state.inventory.has_children(pile) {
            return Ok(());
        }
        self.physical().remove_physical_root(pile)
    }
}
