//! Whole-lot pickup keeps both the item identity and any nested contents.
//! Reach, visibility and the work timer are owned by the ordinary action.
use super::*;
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

pub(super) fn compatible_lots(
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

pub(super) struct DirectRelocation<'a> {
    pub source: &'a str,
    pub destination: &'a str,
    pub actor: &'a str,
    pub source_owner: Option<&'a str>,
    pub destination_owner: Option<&'a str>,
    pub item: &'a str,
    pub quantity: u64,
    pub cause: &'a str,
    pub merge_receiving_lot: bool,
    pub publish_contents: bool,
}

/// A pickup owns its current ground and receiving lots in one candidate.
/// Split creates a real identity first, then both portions use the same move.
impl CoreMutation<'_> {
    /// Transfer the selection just read by the completing action. A group can
    /// change merge destinations as it moves stock, so every member succeeds
    /// together. The last receiving identity is the result for a single lot.
    pub(crate) fn take_ground_items(
        &mut self,
        actor: &str,
        pile: &str,
        selected: &[(String, u64)],
    ) -> Result<Option<String>, ExecutionError> {
        let scope = (selected.len() > 1)
            .then(|| self.journal.checkpoint(self.state))
            .transpose()?;
        let result = self.move_ground_items(actor, pile, selected);
        if let Some(scope) = scope {
            if matches!(&result, Ok(Some(_))) {
                self.journal.keep(self.state, scope)?;
            } else {
                self.journal.rollback_to(self.state, scope)?;
            }
        }
        result
    }

    fn move_ground_items(
        &mut self,
        actor: &str,
        pile: &str,
        selected: &[(String, u64)],
    ) -> Result<Option<String>, ExecutionError> {
        let mut received = None;
        for (item, quantity) in selected {
            let Some(item) = self.transfer_direct_loose_lot(pile, actor, item, *quantity, "pickup", true)?
            else {
                return Ok(None);
            };
            received = Some(item);
        }
        if received.is_some() && self.state.inventory.has_children(pile) {
            self.journal.physical.change(PhysicalChange::ObservationParameters {
                entity_id: pile.into(), request_detail: true,
            })?;
        }
        Ok(received)
    }

    /// A caller must prove access, availability, allowed source/container and
    /// handling before it enters this single direct custody operation. Split,
    /// merge, exact lineage, revisions and inverse storage belong here.
    pub(crate) fn transfer_direct_loose_lot(
        &mut self, source: &str, actor: &str, item: &str, quantity: u64, cause: &'static str,
        merge_receiving_lot: bool,
    ) -> Result<Option<String>, ExecutionError> {
        let source_owner = self.state.physical.entities.get(source)
            .is_some_and(|entity| entity.actor.is_some()).then_some(source);
        self.relocate_stock(DirectRelocation {
            source, destination: actor, actor, source_owner, item, quantity, cause,
            destination_owner: Some(actor), merge_receiving_lot, publish_contents: true,
        })
    }

    /// A prechecked direct custody change. Inventory commands own access and
    /// packing admission. This owner keeps split, move, merge and lineage atomic.
    pub(super) fn relocate_stock(
        &mut self,
        request: DirectRelocation<'_>,
    ) -> Result<Option<String>, ExecutionError> {
        let DirectRelocation {
            source, destination, actor, source_owner, destination_owner, item, quantity, cause, merge_receiving_lot, publish_contents,
        } = request;
        let installed = self.state.installed.clone();
        let entities = &self.state.physical.entities;
        let body = entities.get(actor).ok_or(ExecutionError::MissingActor)?;
        let selected = entities.get(item).ok_or(ExecutionError::MissingEntity)?;
        let selected_lot = selected.item.as_ref().ok_or(ExecutionError::Invariant)?;
        let before = selected_lot.quantity;
        if quantity == 0 || quantity > before || source == destination || !self.state.inventory.has_direct_item(entities, source, selected) {
            return Err(ExecutionError::Invariant);
        }
        let definition = installed
            .retained
            .items
            .get(&selected_lot.definition_pin.id)
            .ok_or(ExecutionError::Invariant)?;
        let held = self.state.physical.holds.quantity(item);
        if quantity > before.saturating_sub(held) {
            return Ok(None);
        }
        let merge = if merge_receiving_lot && held == 0 && partitionable_stock(selected, definition) {
            let bound = body.actor.as_ref().and_then(|body| body.action.as_ref());
            self.state
                .inventory
                .children(entities, destination, false)
                .find(|target| {
                    compatible_lots(selected, target, definition)
                        && self.state.physical.holds.quantity(&target.id) == 0
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
            self.split_direct_lot(source, source_owner, item, before, quantity, definition, cause)?
        } else {
            item.to_owned()
        };
        self.relocate_contained_lot(source, destination, &moving, publish_contents)?;
        if let Some(receiver) = receiver {
            self.merge_direct_lots(destination, destination_owner, &moving, &receiver, quantity, cause)?;
            Ok(Some(receiver))
        } else {
            Ok(Some(moving))
        }
    }

    /// Split an admitted direct lot. The caller owns access, amount and any
    /// ancestor updates. The new lot gets its own identity and the same origin.
    pub(super) fn split_direct_lot(
        &mut self, parent: &str, custodian: Option<&str>, item: &str, before: u64,
        quantity: u64, definition: &crate::install::ItemDefinitionRead, cause: &str,
    ) -> Result<String, ExecutionError> {
        let split = self.create_direct_stock(parent, definition, quantity, Some(item))?;
        self.transfer_activity_sources(item, &split, before, quantity)?;
        self.debit_inventory_lot(parent, item, quantity, LotDebit {
            cause, custodian, target: Some((LineageKind::Split, &split)),
        })?;
        Ok(split)
    }

    /// Merge two admitted direct lots. Ancestor packing and revisions stay
    /// with the caller that owns the entire arrangement.
    pub(super) fn merge_direct_lots(
        &mut self, parent: &str, custodian: Option<&str>, source: &str, target: &str,
        quantity: u64, cause: &str,
    ) -> Result<(), ExecutionError> {
        self.transfer_activity_sources(source, target, quantity, quantity)?;
        self.grow_direct_lot(parent, target, quantity, false)?;
        self.debit_inventory_lot(parent, source, quantity, LotDebit {
            cause, custodian, target: Some((LineageKind::Merge, target)),
        })
    }

    pub(super) fn transfer_activity_sources(
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

    pub(crate) fn retire_empty_pickup_pile(&mut self, pile: &str) -> Result<(), ExecutionError> {
        if self.state.inventory.has_children(pile) {
            return Ok(());
        }
        self.physical().remove_physical_root(pile)
    }
}
