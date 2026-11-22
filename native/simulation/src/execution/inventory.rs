//! Live direct-contents edits join the physical journal. The accepted world
//! owns the entity and child index, while the save owner writes their rows.
use super::*;
use crate::administration::ObjectMembership;
use crate::install::{Inventory, RemovedInventoryChild};
use crate::state::{Entity, ItemLot, ItemRetirement, LineageKind, ObjectLineage};
use crate::values::DefinitionPin;

enum ItemEdit {
    Inserted,
    Quantity {
        before: u64,
        revision: u64,
    },
    Retired {
        before: ItemLot,
        placement: Placement,
        detached: RemovedInventoryChild,
    },
}

pub(super) struct InventoryUndo {
    pub(super) parent: EntityHandle,
    previous_contents: Option<u64>,
    previous_membership: u64,
    pub(super) child: EntityHandle,
    edit: ItemEdit,
    pub(super) lineage: Option<(u64, ObjectLineage)>,
    prior_lineage_presence: bool,
}

impl InventoryUndo {
    pub(super) fn edited_item(&self) -> bool {
        !matches!(self.edit, ItemEdit::Inserted)
    }

    pub(super) fn changed_membership(&self) -> bool {
        !matches!(self.edit, ItemEdit::Quantity { .. })
    }

    pub(super) fn retired(&self) -> bool {
        matches!(self.edit, ItemEdit::Retired { .. })
    }

    pub(super) fn restore(
        self,
        state: &mut PhysicalState,
        inventory: &mut Inventory,
        membership: &mut ObjectMembership,
        funding: &mut ByteReservation,
    ) -> Result<(), ExecutionError> {
        state
            .entities
            .resolve_mut(self.parent)
            .ok_or(ExecutionError::Invariant)?
            .inventory_revision = self.previous_contents;
        membership.revision = self.previous_membership;
        if let Some((position, _)) = self.lineage {
            inventory.lineage.next_ordinal = position;
            inventory.lineage.parent_present = self.prior_lineage_presence;
        }
        match self.edit {
            ItemEdit::Inserted => {
                let parent = state
                    .entities
                    .resolve(self.parent)
                    .ok_or(ExecutionError::Invariant)?;
                inventory.undo_add_item(&parent.id, self.child)?;
            }
            ItemEdit::Quantity { before, revision } => {
                let lot = state
                    .entities
                    .resolve_mut(self.child)
                    .and_then(|entity| entity.item.as_mut())
                    .ok_or(ExecutionError::Invariant)?;
                lot.quantity = before;
                lot.revision = revision;
            }
            ItemEdit::Retired {
                before,
                placement,
                detached,
            } => {
                let parent = state
                    .entities
                    .resolve(self.parent)
                    .ok_or(ExecutionError::Invariant)?;
                inventory.restore_loose_item(&parent.id, self.child, detached)?;
                let child = state
                    .entities
                    .resolve_mut(self.child)
                    .ok_or(ExecutionError::Invariant)?;
                child.item = Some(before);
                child.placement = Some(placement);
                child.retirement = None;
                state
                    .entities
                    .settle_operational_memory(self.child, funding, true)?;
            }
        }
        Ok(())
    }
}

fn next_revision(before: u64) -> Result<u64, ExecutionError> {
    before
        .checked_add(1)
        .filter(|next| *next <= MAX_SAFE_INTEGER)
        .ok_or(ExecutionError::Identity)
}

impl CoreMutation<'_> {
    /// A trusted gameplay producer transfers one new lot and its construction
    /// reservation. The item owner checks direct actor custody and settles the
    /// membership, revision, index and new stored rows in this candidate.
    pub(crate) fn insert_actor_lot(
        &mut self,
        actor_id: &str,
        item: Entity,
        prepared: ByteReservation,
    ) -> Result<(), ExecutionError> {
        let parent = self
            .state
            .physical
            .entities
            .handle(actor_id)
            .ok_or(ExecutionError::MissingEntity)?;
        let actor = self
            .state
            .physical
            .entities
            .resolve(parent)
            .ok_or(ExecutionError::Invariant)?;
        let budget = self.journal.physical.budget.clone();
        if actor.actor.is_none()
            || actor.container.is_some()
            || actor.world_position().is_none()
            || !matches!(&item.placement, Some(Placement::Contained { parent_entity_id, revision: 0 }) if parent_entity_id == actor_id)
            || item.actor.is_some()
            || item.item.is_none()
            || item.retirement.is_some()
            || item.container.is_some()
            || item.declared_owner.is_some()
            || !budget.owns(&prepared)
        {
            return Err(ExecutionError::Invariant);
        }
        // Installation and live insertion use the same definition, quantity
        // and material-origin checks rather than admitting a second shape.
        crate::install::validate_native_item(
            &self.state.physical.entities,
            &self.state.installed.retained,
            &item,
        )
        .map_err(|_| ExecutionError::Invariant)?;
        let previous_contents = actor.inventory_revision;
        let previous_membership = self.state.administration.object_membership.revision;
        let contents = next_revision(previous_contents.unwrap_or_default())?;
        let membership = next_revision(previous_membership)?;
        let child = self.physical().insert_entity(item, false)?;
        self.journal.physical.reserve(size_of::<InventoryUndo>())?;
        self.state
            .inventory
            .add_item(&self.state.physical.entities, actor_id, child, &budget)?;
        self.journal
            .physical
            .undo
            .push(Undo::Inventory(Box::new(InventoryUndo {
                parent,
                previous_contents,
                previous_membership,
                child,
                edit: ItemEdit::Inserted,
                lineage: None,
                prior_lineage_presence: false,
            })));
        self.state
            .physical
            .entities
            .resolve_mut(parent)
            .ok_or(ExecutionError::Invariant)?
            .inventory_revision = Some(contents);
        self.state.administration.object_membership.revision = membership;
        drop(prepared);
        Ok(())
    }

    /// Ordinary stock production first reuses an eligible direct stack. A
    /// source with independent provenance receives its own counted lot.
    pub(crate) fn produce_carried_stock(&mut self, actor: &str, definition_id: &str, quantity: u64) -> Result<String, ExecutionError> {
        let installed = self.state.installed.clone();
        let definition = installed.retained.items.get(definition_id).ok_or(ExecutionError::Invariant)?;
        let budget = self.journal.physical.budget.clone();
        if quantity == 0 || quantity > MAX_SAFE_INTEGER || !definition.portable || definition.is_container() {
            return Err(ExecutionError::UnsupportedFamily);
        }
        if !definition.tracks_material_origins {
            let store = &self.state.physical.entities;
            let bound = store.get(actor).and_then(|entity| entity.actor.as_ref())
                .and_then(|actor| actor.action.as_ref()).and_then(|action| action.item_id.as_deref());
            let target = self.state.inventory.children(store, actor, false).find(|entity| {
                entity.item.as_ref().is_some_and(|lot| {
                    lot.definition_pin == definition.pin && lot.unit_pin == *crate::install::item_count_pin() &&
                    lot.individuality == crate::state::Individuality::Homogeneous
                    && lot.quantity <= MAX_SAFE_INTEGER - quantity
                    && lot.material_origin_ids.is_none() && lot.material_contribution_ids.is_none() && lot.assembly_claim.is_none()
                }) && bound != Some(entity.id.as_str()) && entity.container.is_none() && entity.declared_owner.is_none()
                    && entity.mechanism_fields.is_none() && entity.attributes.as_ref().is_none_or(IndexMap::is_empty)
                    && entity.status_effects.as_ref().is_none_or(IndexMap::is_empty)
                    && matches!(&entity.placement, Some(Placement::Contained { .. }))
            });
            if let Some(target) = target {
                let _workspace = budget.reserve(target.id.len())?;
                let id = target.id.clone();
                self.grow_direct_lot(actor, &id, quantity)?;
                return Ok(id);
            }
        }
        let body = &installed.retained.item_handling_read.object_body;
        let material = definition.material.as_ref();
        let mut bytes = heap_sum([
            size_of::<Entity>(), 1024, actor.len(), body.id.len(),
            definition.named.heap_bytes().ok_or(ExecutionError::Capacity)?,
            definition.pin.heap_bytes().ok_or(ExecutionError::Capacity)?,
            crate::install::item_count_pin().heap_bytes().ok_or(ExecutionError::Capacity)?,
        ]).ok_or(ExecutionError::Capacity)?;
        if let Some(material) = material {
            let size = crate::host::retained_size::map_storage::<String, AttributeState>(material.initial_attributes.len()).ok_or(ExecutionError::Capacity)?;
            bytes = bytes.checked_add(size).ok_or(ExecutionError::Capacity)?;
            for id in &material.initial_attributes {
                let schema = &installed.attributes.get(id).ok_or(ExecutionError::Invariant)?.value().schema;
                bytes = bytes.checked_add(id.len() + match schema {
                    crate::status::AttributeSchema::Category { initial, .. } => initial.len(),
                    crate::status::AttributeSchema::Number { .. } => 0,
                }).ok_or(ExecutionError::Capacity)?;
            }
        }
        let prepared = budget.reserve(bytes)?;
        let physical = &mut self.state.physical;
        let issued = physical.identity.allocate_entity("item", |id| physical.entities.get(id).is_some())?;
        let result = issued.id.clone();
        let attributes = material.map(|material| -> Result<IndexMap<String, AttributeState>, ExecutionError> {
            material.initial_attributes.iter().map(|id| {
                let definition = installed.attributes.get(id).ok_or(ExecutionError::Invariant)?.value();
                let value = match &definition.schema {
                    crate::status::AttributeSchema::Number { initial, .. } => crate::values::AttributeValue::Number(*initial),
                    crate::status::AttributeSchema::Category { initial, .. } => crate::values::AttributeValue::Category(initial.clone()),
                };
                Ok((id.clone(), AttributeState { value, revision: 0, concern_active: None }))
            }).collect()
        }).transpose()?;
        let entity = Entity {
            id: issued.id, kind: "item".into(), name: definition.named.name.clone(),
            name_form: definition.named.name_form.clone(), indefinite_article: definition.named.indefinite_article.clone(),
            item: Some(crate::state::ItemLot {
                definition_pin: definition.pin.clone(), unit_pin: crate::install::item_count_pin().clone(),
                quantity, revision: 0, material_origin_ids: definition.tracks_material_origins.then(|| vec![result.clone()]),
                material_contribution_ids: None, assembly_claim: None,
                individuality: if material.is_some_and(|rule| !rule.homogeneous) { crate::state::Individuality::Individual }
                else { crate::state::Individuality::Homogeneous },
            }),
            attributes,
            placement: Some(Placement::Contained { parent_entity_id: actor.into(), revision: 0 }),
            spatial: crate::state::EntitySpatial {
                body: body.clone(), heading: 0.0, inactive_body: None, soft_footprint: None, local_pose: None,
                local_avoidance_ready_at: None, flight: None, fall_velocity: None,
            },
            hearth: None, practice_target: None, threat: None, assembly: None, inventory_revision: None,
            container: None, declared_owner: None, retirement: None, sensory_progress: None, icon: None,
            description: None, status_effects: None, mechanism_fields: None, appearance: None, actor: None,
            animal: None, replenisher: None, resource: None, remains: None, heat: None,
        };
        self.insert_actor_lot(actor, entity, prepared)?;
        Ok(result)
    }

    fn grow_direct_lot(&mut self, actor: &str, id: &str, quantity: u64) -> Result<(), ExecutionError> {
        let entities = &mut self.state.physical.entities;
        let parent = entities.handle(actor).ok_or(ExecutionError::MissingActor)?;
        let child = entities.handle(id).ok_or(ExecutionError::MissingEntity)?;
        let previous_contents = entities.resolve(parent).ok_or(ExecutionError::Invariant)?.inventory_revision;
        let contents = next_revision(previous_contents.unwrap_or_default())?;
        let lot = entities.resolve_mut(child).and_then(|entity| entity.item.as_mut()).ok_or(ExecutionError::Invariant)?;
        let before = lot.quantity;
        let revision = lot.revision;
        let next_quantity = before.checked_add(quantity).filter(|value| *value <= MAX_SAFE_INTEGER).ok_or(ExecutionError::Capacity)?;
        let next_revision = next_revision(revision)?;
        self.journal.physical.reserve(size_of::<InventoryUndo>())?;
        self.journal.physical.undo.push(Undo::Inventory(Box::new(InventoryUndo {
            parent, child, previous_contents, previous_membership: self.state.administration.object_membership.revision,
            edit: ItemEdit::Quantity { before, revision }, lineage: None, prior_lineage_presence: false,
        })));
        lot.quantity = next_quantity;
        lot.revision = next_revision;
        entities.resolve_mut(parent).ok_or(ExecutionError::Invariant)?.inventory_revision = Some(contents);
        Ok(())
    }

    /// Consume one currently bound loose unit from an exposed ground pile.
    /// The feeding owner supplies the sight, reach and access witness. This
    /// owner validates direct custody, exact lot revision and definition, then
    /// stages the item, pile, lineage and any retirement together.
    pub(crate) fn debit_ground_lot(
        &mut self,
        pile_id: &str,
        item_id: &str,
        expected: &DefinitionPin,
        revision: u64,
        cause: &str,
    ) -> Result<bool, ExecutionError> {
        let physical = &self.state.physical;
        let (Some(parent), Some(child)) = (
            physical.entities.handle(pile_id),
            physical.entities.handle(item_id),
        ) else {
            return Ok(false);
        };
        let (Some(pile), Some(entity)) = (
            physical.entities.resolve(parent),
            physical.entities.resolve(child),
        ) else {
            return Ok(false);
        };
        let Some(lot) = &entity.item else {
            return Ok(false);
        };
        if pile.kind != self.state.installed.observation_rules.value().pile_kind
            || pile.world_position().is_none()
            || pile.actor.is_some()
            || pile.container.is_some()
            || entity.retirement.is_some()
            || entity.container.is_some()
            || lot.definition_pin != *expected
            || lot.revision != revision
            || lot.quantity == 0
            || lot.assembly_claim.is_some()
            || lot.material_contribution_ids.is_some()
            || !matches!(&entity.placement, Some(Placement::Contained { parent_entity_id, .. }) if parent_entity_id == pile_id)
            || !self
                .state
                .inventory
                .has_direct_item(&physical.entities, pile_id, entity)
        {
            return Ok(false);
        }
        // The installed resource-hold family must still be empty. There is no
        // independent reservation map for feeding that could miss a live hold.
        let retire = lot.quantity == 1;
        if retire
            && (self.state.inventory.has_children(item_id)
                || entity
                    .attributes
                    .as_ref()
                    .is_some_and(|rows| !rows.is_empty())
                || entity
                    .status_effects
                    .as_ref()
                    .is_some_and(|rows| !rows.is_empty())
                || entity.mechanism_fields.is_some())
        {
            return Ok(false);
        }
        let before_quantity = lot.quantity;
        let next_quantity_revision = next_revision(revision)?;
        let previous_contents = pile.inventory_revision;
        let contents = next_revision(previous_contents.unwrap_or_default())?;
        let previous_membership = self.state.administration.object_membership.revision;
        let membership = if retire {
            next_revision(previous_membership)?
        } else {
            previous_membership
        };
        let ordinal = self.state.inventory.lineage.next_ordinal;
        let prior_lineage_presence = self.state.inventory.lineage.parent_present;
        let next_ordinal = next_revision(ordinal)?;
        let definition_bytes = lot
            .definition_pin
            .heap_bytes()
            .ok_or(ExecutionError::Capacity)?;
        let unit_bytes = lot.unit_pin.heap_bytes().ok_or(ExecutionError::Capacity)?;
        let lot_bytes = lot.heap_bytes().ok_or(ExecutionError::Capacity)?;
        let retained_index = self.state.inventory.detached_item_bytes(pile_id);
        self.journal.physical.reserve(
            heap_sum([
                size_of::<InventoryUndo>(),
                32,
                item_id.len(),
                pile_id.len(),
                cause.len(),
                unit_bytes,
                if retire {
                    lot_bytes + definition_bytes + pile_id.len() + cause.len() + retained_index
                } else {
                    0
                },
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let at = physical.header.sim_time;
        let retirement = retire.then(|| ItemRetirement {
            custodian_id: None,
            at,
            cause: cause.into(),
            definition_pin: lot.definition_pin.clone(),
            quantity: before_quantity,
        });
        let unit_pin = lot.unit_pin.clone();
        let issued = self.state.physical.identity.allocate("object-history")?;
        let lineage = ObjectLineage {
            id: issued.id,
            kind: LineageKind::Consume,
            source_id: item_id.into(),
            target_id: None,
            quantity: 1,
            cause: cause.into(),
            at,
            unit_pin,
            custodian_id: None,
        };
        let entity = self
            .state
            .physical
            .entities
            .resolve_mut(child)
            .ok_or(ExecutionError::Invariant)?;
        let edit = if let Some(retirement) = retirement {
            let detached = self.state.inventory.detach_loose_item(pile_id, child)?;
            let before = entity.item.take().ok_or(ExecutionError::Invariant)?;
            let placement = entity.placement.take().ok_or(ExecutionError::Invariant)?;
            entity.retirement = Some(retirement);
            ItemEdit::Retired {
                before,
                placement,
                detached,
            }
        } else {
            let item = entity.item.as_mut().ok_or(ExecutionError::Invariant)?;
            item.quantity -= 1;
            item.revision = next_quantity_revision;
            ItemEdit::Quantity {
                before: before_quantity,
                revision,
            }
        };
        self.journal
            .physical
            .undo
            .push(Undo::Inventory(Box::new(InventoryUndo {
                parent,
                previous_contents,
                previous_membership,
                child,
                edit,
                lineage: Some((ordinal, lineage)),
                prior_lineage_presence,
            })));
        self.state
            .physical
            .entities
            .resolve_mut(parent)
            .ok_or(ExecutionError::Invariant)?
            .inventory_revision = Some(contents);
        self.state.administration.object_membership.revision = membership;
        self.state.inventory.lineage.next_ordinal = next_ordinal;
        self.state.inventory.lineage.parent_present = true;
        if retire {
            self.state.physical.entities.settle_operational_memory(
                child,
                &mut self.journal.physical.reservation,
                false,
            )?;
        }
        self.journal
            .physical
            .change(PhysicalChange::ObservationParameters {
                entity_id: pile_id.into(),
                request_detail: true,
            })?;
        Ok(true)
    }
}
