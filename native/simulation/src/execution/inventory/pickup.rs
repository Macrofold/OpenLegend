//! Whole-lot pickup keeps both the item identity and any nested contents.
//! Reach, visibility and the work timer are owned by the ordinary action.
use super::*;
use crate::ground_items::{pickup_lot, pickup_pile};
use indexmap::IndexMap;

/// Current homogeneous lot split and merge share the same physical-state
/// boundary. Recognized material attributes use the installed equivalence law.
pub(crate) fn partitionable_stock(
    entity: &Entity,
    definition: &crate::install::ItemDefinitionRead,
) -> bool {
    entity.item.as_ref().is_some_and(|lot| {
        lot.individuality == crate::state::Individuality::Homogeneous
            && lot.assembly_claim.is_none()
    }) && entity.container.is_none()
        && entity.retirement.is_none()
        && entity
            .mechanism_fields
            .as_ref()
            .is_none_or(IndexMap::is_empty)
        && entity
            .status_effects
            .as_ref()
            .is_none_or(IndexMap::is_empty)
        && entity.attributes.as_ref().is_none_or(|attributes| {
            attributes.is_empty()
                || definition.material.as_ref().is_some_and(|rule| {
                    rule.homogeneous
                        && attributes
                            .keys()
                            .all(|key| rule.state_attributes.contains(key))
                })
        })
}

fn compatible_lots(
    source: &Entity,
    target: &Entity,
    definition: &crate::install::ItemDefinitionRead,
) -> bool {
    let Some((first, second)) = source.item.as_ref().zip(target.item.as_ref()) else {
        return false;
    };
    first.definition_pin == second.definition_pin
        && first.unit_pin == second.unit_pin
        && first.material_origin_ids == second.material_origin_ids
        && first.material_contribution_ids == second.material_contribution_ids
        && source.declared_owner == target.declared_owner
        && matches!(target.placement, Some(Placement::Contained { .. }))
        && partitionable_stock(target, definition)
        && definition.material.as_ref().is_none_or(|rule| {
            rule.state_attributes.iter().all(|key| {
                let first = source
                    .attributes
                    .as_ref()
                    .and_then(|attributes| attributes.get(key));
                let second = target
                    .attributes
                    .as_ref()
                    .and_then(|attributes| attributes.get(key));
                first.map(|state| &state.value) == second.map(|state| &state.value)
            })
        })
}

/// A pickup owns its current ground and receiving lots in one candidate.
/// Split creates a real identity first, then both portions use the same move.
impl CoreMutation<'_> {
    pub(crate) fn take_ground_lot(
        &mut self,
        actor: &str,
        pile: &str,
        item: &str,
        requested: Option<u64>,
    ) -> Result<Option<String>, ExecutionError> {
        let installed = self.state.installed.clone();
        let entities = &self.state.physical.entities;
        let body = entities.get(actor).ok_or(ExecutionError::MissingActor)?;
        let Some(ground) = pickup_pile(self.state, body, pile) else {
            return Ok(None);
        };
        let Some(selected) = pickup_lot(self.state, ground, item) else {
            return Ok(None);
        };
        if !selected.admits_quantity(requested) {
            return Ok(None);
        }
        let before = selected.lot.quantity;
        let quantity = requested.unwrap_or(before);
        let definition = installed
            .retained
            .items
            .get(&selected.lot.definition_pin.id)
            .ok_or(ExecutionError::Invariant)?;
        let merge = if partitionable_stock(selected.entity, definition) {
            let bound = body.actor.as_ref().and_then(|body| body.action.as_ref());
            self.state
                .inventory
                .children(entities, actor, false)
                .find(|target| {
                    compatible_lots(selected.entity, target, definition)
                        && bound.is_none_or(|action| {
                            action.item_id.as_deref() != Some(&target.id)
                                && action.food_preparation.as_ref().is_none_or(|meal| {
                                    !meal.inputs.values().any(|item| item == &target.id)
                                })
                        })
                })
        } else {
            None
        };
        if merge
            .and_then(|target| target.item.as_ref())
            .is_some_and(|lot| lot.quantity > MAX_SAFE_INTEGER - quantity)
        {
            return Ok(None);
        }
        let _transfer = self
            .journal
            .budget
            .reserve(item.len() + merge.map_or(0, |target| target.id.len()) + 32)?;
        let receiver = merge.map(|target| target.id.clone());
        let moving = if quantity < before {
            let split = self.create_direct_stock(pile, definition, quantity, Some(item))?;
            self.transfer_activity_sources(item, &split, before, quantity)?;
            self.debit_inventory_lot(
                pile,
                item,
                quantity,
                LotDebit {
                    cause: "pickup",
                    custodian: None,
                    target: Some((LineageKind::Split, &split)),
                },
            )?;
            split
        } else {
            item.to_owned()
        };
        self.relocate_ground_lot(actor, pile, &moving)?;
        if self.state.inventory.has_children(pile) {
            self.journal
                .physical
                .change(PhysicalChange::ObservationParameters {
                    entity_id: pile.into(),
                    request_detail: true,
                })?;
        }
        if let Some(receiver) = receiver {
            self.transfer_activity_sources(&moving, &receiver, quantity, quantity)?;
            self.grow_direct_lot(actor, &receiver, quantity, false)?;
            self.debit_inventory_lot(
                actor,
                &moving,
                quantity,
                LotDebit {
                    cause: "pickup",
                    custodian: Some(actor),
                    target: Some((LineageKind::Merge, &receiver)),
                },
            )?;
            Ok(Some(receiver))
        } else {
            Ok(Some(moving))
        }
    }

    fn transfer_activity_sources(
        &mut self,
        source: &str,
        target: &str,
        before: u64,
        quantity: u64,
    ) -> Result<(), ExecutionError> {
        self.journal
            .activity
            .transfer_item_sources(&mut self.state.activity, source, target, before, quantity)
            .map_err(ExecutionError::Activity)
    }

    fn relocate_ground_lot(
        &mut self,
        actor: &str,
        pile: &str,
        item: &str,
    ) -> Result<(), ExecutionError> {
        let entities = &self.state.physical.entities;
        let (Some(source), Some(destination), Some(child)) = (
            entities.handle(pile),
            entities.handle(actor),
            entities.handle(item),
        ) else {
            return Err(ExecutionError::Invariant);
        };
        let body = entities
            .resolve(destination)
            .ok_or(ExecutionError::Invariant)?;
        let Some(pile_body) = pickup_pile(self.state, body, pile) else {
            return Err(ExecutionError::Invariant);
        };
        let Some(selected) = pickup_lot(self.state, pile_body, item) else {
            return Err(ExecutionError::Invariant);
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
        Ok(())
    }

    pub(crate) fn retire_empty_pickup_pile(&mut self, pile: &str) -> Result<(), ExecutionError> {
        if self.state.inventory.has_children(pile) {
            return Ok(());
        }
        self.physical().remove_physical_root(pile)
    }
}
