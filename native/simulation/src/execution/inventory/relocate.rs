//! Shared physical move of a validated direct child. Access, packing and
//! effects belong to the action that selected the source and destination.
use super::*;

impl CoreMutation<'_> {
    /// Install a direct move after the action has bound both containers and
    /// the selected physical lot. Its inverse owns both membership lists.
    pub(super) fn move_contained_lot(
        &mut self,
        source_id: &str,
        destination_id: &str,
        item_id: &str,
    ) -> Result<(), ExecutionError> {
        self.relocate_contained_lot(source_id, destination_id, item_id, true)
    }

    /// Group transfers own a single revision advance after all direct lot
    /// moves. The membership and lineage undo still belongs to this edit.
    pub(super) fn relocate_contained_lot(
        &mut self,
        source_id: &str,
        destination_id: &str,
        item_id: &str,
        publish_contents: bool,
    ) -> Result<(), ExecutionError> {
        let entities = &self.state.physical.entities;
        let (Some(source), Some(destination), Some(child)) = (
            entities.handle(source_id),
            entities.handle(destination_id),
            entities.handle(item_id),
        ) else {
            return Err(ExecutionError::Invariant);
        };
        let selected = entities.resolve(child).ok_or(ExecutionError::Invariant)?;
        let placement = selected
            .placement
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        if source == destination
            || !self
                .state
                .inventory
                .has_direct_item(entities, source_id, selected)
        {
            return Err(ExecutionError::Invariant);
        }
        let (revision, attached) = match placement {
            Placement::Contained { revision, .. } => (*revision, false),
            Placement::Attached { revision, .. } => (*revision, true),
            Placement::World { .. } => return Err(ExecutionError::Invariant),
        };
        let next_placement = next_revision(revision)?;
        let item_before = selected
            .item
            .as_ref()
            .ok_or(ExecutionError::Invariant)?
            .revision;
        let next_item = next_revision(item_before)?;
        let source_before = entities
            .resolve(source)
            .ok_or(ExecutionError::Invariant)?
            .inventory_revision;
        let source_after = publish_contents
            .then(|| next_revision(source_before.unwrap_or_default()))
            .transpose()?;
        let destination_before = entities
            .resolve(destination)
            .ok_or(ExecutionError::Invariant)?
            .inventory_revision;
        let destination_after = publish_contents
            .then(|| next_revision(destination_before.unwrap_or_default()))
            .transpose()?;
        let prior_membership = self.state.administration.object_membership.revision;
        let next_membership = next_revision(prior_membership)?;
        self.journal.physical.reserve(
            heap_sum([
                size_of::<Undo>(),
                size_of::<InventoryUndo>(),
                size_of::<ContentsBefore>(),
                destination_id.len(),
                source_id.len(),
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        if attached {
            // The existing equipment inverse can roll back a release even if
            // inserting at the destination later exceeds its allocation.
            self.journal.physical.reserve(
                size_of::<Undo>()
                    + size_of::<InventoryUndo>()
                    + source_id.len()
                    + placement.heap_bytes().ok_or(ExecutionError::Capacity)?,
            )?;
            self.state
                .inventory
                .set_attachment(entities, source_id, child, false)?;
            let released = self
                .state
                .physical
                .entities
                .resolve_mut(child)
                .ok_or(ExecutionError::Invariant)?
                .placement
                .replace(Placement::Contained {
                    parent_entity_id: source_id.into(),
                    revision,
                })
                .ok_or(ExecutionError::Invariant)?;
            self.journal
                .physical
                .undo
                .push(Undo::Inventory(Box::new(InventoryUndo {
                    parent: source,
                    previous_contents: source_before,
                    previous_membership: prior_membership,
                    child,
                    edit: ItemEdit::Equipment {
                        placement: released,
                        item: None,
                        toggled: true,
                    },
                    lineage: None,
                    prior_lineage_presence: false,
                    extra_contents: Vec::new(),
                })));
        }
        let detached = self.state.inventory.detach_loose_item(source_id, child)?;
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
        self.state.inventory.add_item(
            &self.state.physical.entities,
            destination_id,
            child,
            &self.journal.budget,
        )?;
        let entities = &mut self.state.physical.entities;
        let lot = entities
            .resolve_mut(child)
            .ok_or(ExecutionError::Invariant)?;
        let replaced = lot
            .placement
            .replace(Placement::Contained {
                parent_entity_id: destination_id.into(),
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
        if publish_contents {
            entities
                .resolve_mut(source)
                .ok_or(ExecutionError::Invariant)?
                .inventory_revision = source_after;
            entities
                .resolve_mut(destination)
                .ok_or(ExecutionError::Invariant)?
                .inventory_revision = destination_after;
        }
        self.state.administration.object_membership.revision = next_membership;
        entities.settle_operational_memory(child, &mut self.journal.physical.reservation, false)?;
        Ok(())
    }
}
