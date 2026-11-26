//! Live direct-contents edits join the physical journal. The accepted world
//! owns the entity and child index, while the save owner writes their rows.
use super::*;
use crate::administration::ObjectMembership;
use crate::install::{Inventory, RemovedInventoryChild};
use crate::state::{Entity, ItemLot, ItemRetirement, LineageKind, ObjectLineage};
use crate::values::DefinitionPin;
mod creator;
pub use creator::CreatorInventory;
pub(crate) use creator::creator_inventory;
mod equipment;
mod debit;
mod pickup;
mod drop;
mod relocate;
mod packing;
mod transfer;
mod stock;
mod group;
mod handover;
mod replacement;
use pickup::compatible_lots;
pub(crate) use handover::can_receive_trade_container;
pub use transfer::{OwnedArrangement, OwnedMove, OwnedStockLot, OwnedStockSelection};
pub(crate) use transfer::{OwnedMoveError, can_split_stock, same_container_merge};
pub(crate) use drop::inventory_work_bound;
pub(crate) use drop::drop_item_problem;
pub(crate) use pickup::partitionable_stock;
pub(crate) use debit::{OwnedDebits, can_debit_lot, can_debit_lot_after_hold};
pub(crate) use equipment::{EquipmentDecision, EquipmentRequest, equipment_can_equip, equipment_conflicts, equipment_fits};

struct LotDebit<'a> {
    cause: &'a str,
    custodian: Option<&'a str>,
    target: Option<(LineageKind, &'a str)>,
}

impl<'a> LotDebit<'a> {
    fn consume(cause: &'a str, custodian: Option<&'a str>) -> Self {
        Self { cause, custodian, target: None }
    }
}

enum ItemEdit {
    Inserted,
    Quantity {
        before: u64,
        revision: u64,
    },
    Equipment {
        placement: Placement,
        item: Option<(u64, crate::state::Individuality)>,
        toggled: bool,
    },
    Move {
        destination: EntityHandle,
        detached: RemovedInventoryChild,
        old_placement: Option<Placement>,
        item_before: u64,
    },
    Retired {
        before: ItemLot,
        placement: Placement,
        detached: RemovedInventoryChild,
        container: Option<crate::state::ContainerState>,
    },
}

#[derive(Clone, Copy)]
pub(super) struct ContentsBefore {
    pub(super) handle: EntityHandle,
    revision: Option<u64>,
    bag: Option<(u64, u64, u64, u64)>,
}

pub(super) struct InventoryUndo {
    pub(super) parent: EntityHandle,
    previous_contents: Option<u64>,
    previous_membership: u64,
    pub(super) child: EntityHandle,
    edit: ItemEdit,
    pub(super) lineage: Option<(u64, ObjectLineage)>,
    prior_lineage_presence: bool,
    extra_contents: Vec<ContentsBefore>,
}

impl InventoryUndo {
    pub(super) fn edited_item(&self) -> bool {
        !matches!(self.edit, ItemEdit::Inserted | ItemEdit::Equipment { item: None, .. })
    }

    pub(super) fn changed_membership(&self) -> bool {
        !matches!(self.edit, ItemEdit::Quantity { .. })
    }

    pub(super) fn retired(&self) -> bool {
        matches!(self.edit, ItemEdit::Retired { .. })
    }

    pub(super) fn changed_placement(&self) -> bool {
        matches!(self.edit, ItemEdit::Retired { .. } | ItemEdit::Equipment { .. } | ItemEdit::Move { .. })
    }

    pub(super) fn changed_contents(&self) -> impl Iterator<Item = (EntityHandle, bool)> + '_ {
        self.extra_contents.iter().map(|contents| (contents.handle, contents.bag.is_some()))
    }

    pub(super) fn retired_container(&self) -> bool {
        matches!(&self.edit, ItemEdit::Retired { container: Some(_), .. })
    }

    pub(super) fn restore(
        self,
        state: &mut PhysicalState,
        inventory: &mut Inventory,
        membership: &mut ObjectMembership,
        funding: &mut ByteReservation,
    ) -> Result<(), ExecutionError> {
        for before in self.extra_contents {
            let entity = state.entities.resolve_mut(before.handle).ok_or(ExecutionError::Invariant)?;
            entity.inventory_revision = before.revision;
            if let Some((load, load_revision, subtree_revision, height)) = before.bag {
                let bag = entity.container.as_mut().ok_or(ExecutionError::Invariant)?;
                bag.load = load;
                bag.load_revision = load_revision;
                bag.subtree_revision = subtree_revision;
                bag.height = height;
            }
        }
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
            ItemEdit::Equipment { placement, item, toggled } => {
                let parent = state
                    .entities
                    .resolve(self.parent)
                    .ok_or(ExecutionError::Invariant)?;
                if toggled {
                    inventory.set_attachment(
                        &state.entities,
                        &parent.id,
                        self.child,
                        matches!(placement, Placement::Attached { .. }),
                    )?;
                }
                let entity = state
                    .entities
                    .resolve_mut(self.child)
                    .ok_or(ExecutionError::Invariant)?;
                entity.placement = Some(placement);
                if let Some((revision, individuality)) = item {
                    let lot = entity.item.as_mut().ok_or(ExecutionError::Invariant)?;
                    lot.revision = revision;
                    lot.individuality = individuality;
                }
                state.entities.settle_operational_memory(self.child, funding, true)?;
            }
            ItemEdit::Move { destination, detached, old_placement, item_before } => {
                if let Some(placement) = old_placement {
                    let destination = state.entities.resolve(destination).ok_or(ExecutionError::Invariant)?;
                    inventory.undo_add_item(&destination.id, self.child)?;
                    let child = state.entities.resolve_mut(self.child).ok_or(ExecutionError::Invariant)?;
                    child.placement = Some(placement);
                    child.item.as_mut().ok_or(ExecutionError::Invariant)?.revision = item_before;
                    state.entities.settle_operational_memory(self.child, funding, true)?;
                }
                let source = state.entities.resolve(self.parent).ok_or(ExecutionError::Invariant)?;
                inventory.restore_loose_item(&source.id, self.child, detached)?;
            }
            ItemEdit::Retired {
                before,
                placement,
                detached,
                container,
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
                child.container = container;
                let equipped = matches!(placement, Placement::Attached { .. });
                child.placement = Some(placement);
                child.retirement = None;
                if equipped {
                    let parent = state.entities.resolve(self.parent).ok_or(ExecutionError::Invariant)?;
                    inventory.set_attachment(&state.entities, &parent.id, self.child, true)?;
                }
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
    /// reservation. The item owner checks the exact direct parent and settles the
    /// membership, revision, index and new stored rows in this candidate.
    fn insert_direct_lot(
        &mut self,
        parent_id: &str,
        item: Entity,
        prepared: ByteReservation,
        split_source: Option<&str>,
    ) -> Result<(), ExecutionError> {
        let parent = self
            .state
            .physical
            .entities
            .handle(parent_id)
            .ok_or(ExecutionError::MissingEntity)?;
        let destination = self
            .state
            .physical
            .entities
            .resolve(parent)
            .ok_or(ExecutionError::Invariant)?;
        let budget = self.journal.physical.budget.clone();
        let root = destination.container.is_none() && destination.world_position().is_some()
            && (destination.actor.is_some()
                || destination.kind == self.state.installed.observation_rules.value().pile_kind);
        // Non-root insertion is only an already-admitted split of a direct
        // child. Production continues to require a supported root.
        let split_in_bag = destination.container.is_some() && split_source
            .and_then(|id| self.state.physical.entities.get(id))
            .is_some_and(|source| self.state.inventory.has_direct_item(
                &self.state.physical.entities, parent_id, source,
            ));
        if !(root || split_in_bag)
            || !matches!(&item.placement, Some(Placement::Contained { parent_entity_id, revision: 0 }) if parent_entity_id == parent_id)
            || item.actor.is_some()
            || item.item.is_none()
            || item.retirement.is_some()
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
        let definition = item.item.as_ref().and_then(|lot| self.state.installed.retained.items.get(&lot.definition_pin.id))
            .ok_or(ExecutionError::Invariant)?;
        let material = crate::material_exposure::MaterialPresence::of(&item, definition.exposure.as_ref())?;
        let previous_contents = destination.inventory_revision;
        let previous_membership = self.state.administration.object_membership.revision;
        let contents = next_revision(previous_contents.unwrap_or_default())?;
        let membership = next_revision(previous_membership)?;
        let child = self.physical().insert_entity(item, false)?;
        self.journal.physical.reserve(size_of::<InventoryUndo>())?;
        self.state
            .inventory
            .add_item(&self.state.physical.entities, parent_id, child, material, &budget)?;
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
                extra_contents: Vec::new(),
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
    pub(crate) fn produce_carried_stock(
        &mut self, actor: &str, definition_id: &str, quantity: u64,
    ) -> Result<String, ExecutionError> {
        self.produce_carried_item(actor, definition_id, quantity, true)
    }

    pub(crate) fn produce_carried_item(
        &mut self, actor: &str, definition_id: &str, quantity: u64, portable_stock: bool,
    ) -> Result<String, ExecutionError> {
        let installed = self.state.installed.clone();
        let definition = installed.retained.items.get(definition_id).ok_or(ExecutionError::Invariant)?;
        let budget = self.journal.physical.budget.clone();
        let material = definition.material.as_ref();
        let container = definition.is_container();
        let individual = container || material.is_some_and(|rule| !rule.homogeneous);
        if quantity == 0 || quantity > MAX_SAFE_INTEGER || individual && quantity != 1
            || portable_stock && (!definition.portable || container)
        {
            return Err(ExecutionError::UnsupportedFamily);
        }
        if let Some(target) = self.carried_stock_target_for(actor, definition, quantity) {
            let _workspace = budget.reserve(target.len())?;
            let id = target.to_owned();
            self.grow_direct_lot(actor, &id, quantity, true)?;
            return Ok(id);
        }
        self.create_direct_stock(actor, definition, quantity, None)
    }

    /// A split creates a new identity through the same direct item constructor
    /// as production. It retains the actual source's state and provenance.
    fn create_direct_stock(
        &mut self,
        parent: &str,
        definition: &crate::install::ItemDefinitionRead,
        quantity: u64,
        split: Option<&str>,
    ) -> Result<String, ExecutionError> {
        let installed = self.state.installed.clone();
        let material = definition.material.as_ref();
        let container = definition.is_container();
        let individual = container || material.is_some_and(|rule| !rule.homogeneous);
        let budget = self.journal.physical.budget.clone();
        let body = &installed.retained.item_handling_read.object_body;
        let mut bytes = heap_sum([
            size_of::<Entity>(), 1024, parent.len(), body.id.len(),
            definition.named.heap_bytes().ok_or(ExecutionError::Capacity)?,
            definition.pin.heap_bytes().ok_or(ExecutionError::Capacity)?,
            if container { definition.pin.heap_bytes().ok_or(ExecutionError::Capacity)? } else { 0 },
            crate::install::item_count_pin().heap_bytes().ok_or(ExecutionError::Capacity)?,
        ]).ok_or(ExecutionError::Capacity)?;
        let split_source = split.map(|id| self.state.physical.entities.get(id)
            .ok_or(ExecutionError::Invariant)).transpose()?;
        if let Some(source) = split_source {
            let lot = source.item.as_ref().ok_or(ExecutionError::Invariant)?;
            bytes = heap_sum([bytes, lot.heap_bytes().ok_or(ExecutionError::Capacity)?,
                source.attributes.heap_bytes().ok_or(ExecutionError::Capacity)?,
                source.declared_owner.heap_bytes().ok_or(ExecutionError::Capacity)?,
            ]).ok_or(ExecutionError::Capacity)?;
        } else if let Some(material) = material {
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
        let attributes = if let Some(source) = split_source {
            source.attributes.clone()
        } else { material.map(|material| -> Result<IndexMap<String, AttributeState>, ExecutionError> {
            material.initial_attributes.iter().map(|id| {
                let definition = installed.attributes.get(id).ok_or(ExecutionError::Invariant)?.value();
                let value = match &definition.schema {
                    crate::status::AttributeSchema::Number { initial, .. } => crate::values::AttributeValue::Number(*initial),
                    crate::status::AttributeSchema::Category { initial, .. } => crate::values::AttributeValue::Category(initial.clone()),
                };
                Ok((id.clone(), AttributeState { value, revision: 0, concern_active: None }))
            }).collect()
        }).transpose()? };
        let split_lot = split_source.and_then(|source| source.item.as_ref());
        let split_origins = split_lot.map(|lot| lot.material_origin_ids.clone());
        let contributions = split_lot.and_then(|lot| lot.material_contribution_ids.clone());
        let declared_owner = split_source.and_then(|source| source.declared_owner.clone());
        let physical = &mut self.state.physical;
        let issued = physical.identity.allocate_entity("item", |id| physical.entities.get(id).is_some())?;
        let result = issued.id.clone();
        let origins = split_origins.unwrap_or_else(|| definition.tracks_material_origins.then(|| vec![result.clone()]));
        let entity = Entity {
            id: issued.id, kind: "item".into(), name: definition.named.name.clone(),
            name_form: definition.named.name_form.clone(), indefinite_article: definition.named.indefinite_article.clone(),
            item: Some(crate::state::ItemLot {
                definition_pin: definition.pin.clone(), unit_pin: crate::install::item_count_pin().clone(),
                quantity, revision: 0, material_origin_ids: origins,
                material_contribution_ids: contributions, assembly_claim: None,
                individuality: if individual { crate::state::Individuality::Individual }
                else { crate::state::Individuality::Homogeneous },
            }),
            attributes,
            placement: Some(Placement::Contained { parent_entity_id: parent.into(), revision: 0 }),
            spatial: crate::state::EntitySpatial {
                body: body.clone(), heading: 0.0, inactive_body: None, soft_footprint: None, local_pose: None,
                local_avoidance_ready_at: None, flight: None, fall_velocity: None,
            },
            hearth: None, practice_target: None, threat: None, assembly: None, inventory_revision: None,
            container: container.then(|| crate::state::ContainerState {
                definition_pin: definition.pin.clone(),
                subtree_revision: 0, load: 0, load_revision: 0, height: 0, access: None,
            }),
            declared_owner, retirement: None, sensory_progress: None, icon: None,
            description: None, status_effects: None, mechanism_fields: None, appearance: None, actor: None,
            animal: None, replenisher: None, resource: None, remains: None, heat: None,
        };
        self.insert_direct_lot(parent, entity, prepared, split)?;
        Ok(result)
    }

    /// Read the same direct stack the item owner can credit. Used to admit
    /// a finished production receipt before any world item is allocated.
    pub(crate) fn carried_stock_target(&self, actor: &str, definition_id: &str, quantity: u64) -> Option<&str> {
        let definition = self.state.installed.retained.items.get(definition_id)?;
        self.carried_stock_target_for(actor, definition, quantity)
    }

    fn carried_stock_target_for(&self, actor: &str, definition: &crate::install::ItemDefinitionRead, quantity: u64) -> Option<&str> {
        if definition.tracks_material_origins || definition.is_container()
            || definition.material.as_ref().is_some_and(|rule| !rule.homogeneous) || quantity > MAX_SAFE_INTEGER
        {
            return None;
        }
        let store = &self.state.physical.entities;
        let bound = store.get(actor).and_then(|entity| entity.actor.as_ref())
            .and_then(|actor| actor.action.as_ref()).and_then(|action| action.item_id.as_deref());
        self.state.inventory.children(store, actor, false).find(|entity| {
            entity.item.as_ref().is_some_and(|lot| {
                lot.definition_pin == definition.pin && lot.unit_pin == *crate::install::item_count_pin() &&
                lot.individuality == crate::state::Individuality::Homogeneous
                && lot.quantity <= MAX_SAFE_INTEGER - quantity
                && lot.material_origin_ids.is_none() && lot.material_contribution_ids.is_none() && lot.assembly_claim.is_none()
            }) && bound != Some(entity.id.as_str()) && entity.container.is_none() && entity.declared_owner.is_none()
                && entity.mechanism_fields.is_none() && entity.attributes.as_ref().is_none_or(IndexMap::is_empty)
                && entity.status_effects.as_ref().is_none_or(IndexMap::is_empty)
                && matches!(&entity.placement, Some(Placement::Contained { .. }))
        }).map(|entity| entity.id.as_str())
    }

    fn grow_direct_lot(&mut self, actor: &str, id: &str, quantity: u64, publish_contents: bool) -> Result<(), ExecutionError> {
        let entities = &mut self.state.physical.entities;
        let parent = entities.handle(actor).ok_or(ExecutionError::MissingActor)?;
        let child = entities.handle(id).ok_or(ExecutionError::MissingEntity)?;
        let previous_contents = entities.resolve(parent).ok_or(ExecutionError::Invariant)?.inventory_revision;
        let contents = if publish_contents {
            Some(next_revision(previous_contents.unwrap_or_default())?)
        } else {
            previous_contents
        };
        let lot = entities.resolve_mut(child).and_then(|entity| entity.item.as_mut()).ok_or(ExecutionError::Invariant)?;
        let before = lot.quantity;
        let revision = lot.revision;
        let next_quantity = before.checked_add(quantity).filter(|value| *value <= MAX_SAFE_INTEGER).ok_or(ExecutionError::Capacity)?;
        let next_revision = next_revision(revision)?;
        self.journal.physical.reserve(size_of::<InventoryUndo>())?;
        self.journal.physical.undo.push(Undo::Inventory(Box::new(InventoryUndo {
            parent, child, previous_contents, previous_membership: self.state.administration.object_membership.revision,
            edit: ItemEdit::Quantity { before, revision }, lineage: None, prior_lineage_presence: false,
            extra_contents: Vec::new(),
        })));
        lot.quantity = next_quantity;
        lot.revision = next_revision;
        entities.resolve_mut(parent).ok_or(ExecutionError::Invariant)?.inventory_revision = contents;
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
        if !can_debit_lot(self.state, entity, 1) {
            return Ok(false);
        }
        self.debit_inventory_lot(pile_id, item_id, 1, LotDebit::consume(cause, None))?;
        Ok(true)
    }

    /// Only the exact quantity owner enters this method after planning custody
    /// and aggregate stock. The same inverse serves feeding and work.
    fn debit_inventory_lot(
        &mut self,
        parent_id: &str,
        item_id: &str,
        quantity: u64,
        debit: LotDebit<'_>,
    ) -> Result<(), ExecutionError> {
        let LotDebit { cause, custodian, target } = debit;
        let physical = &self.state.physical;
        let parent = physical.entities.handle(parent_id).ok_or(ExecutionError::Invariant)?;
        let child = physical.entities.handle(item_id).ok_or(ExecutionError::Invariant)?;
        let parent_entity = physical.entities.resolve(parent).ok_or(ExecutionError::Invariant)?;
        let entity = physical.entities.resolve(child).ok_or(ExecutionError::Invariant)?;
        let lot = entity.item.as_ref().ok_or(ExecutionError::Invariant)?;
        // The planner already admitted this exact owned amount against the
        // live reservation total. Keep the low-level debit behind that check.
        let before_quantity = lot.quantity;
        let revision = lot.revision;
        let retire = quantity == before_quantity;
        let equipped = matches!(entity.placement, Some(Placement::Attached { .. }));
        let next_quantity_revision = next_revision(revision)?;
        let previous_contents = parent_entity.inventory_revision;
        let contents = if custodian.is_none() {
            Some(next_revision(previous_contents.unwrap_or_default())?)
        } else {
            // The whole owned group updates each ancestor exactly once below.
            previous_contents
        };
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
        let retained_index = self.state.inventory.detached_item_bytes(parent_id);
        self.journal.physical.reserve(
            heap_sum([
                size_of::<InventoryUndo>(),
                32,
                item_id.len(),
                parent_id.len(),
                cause.len(),
                custodian.map_or(0, |id| 2 * id.len()),
                target.map_or(0, |(_, id)| id.len()),
                unit_bytes,
                if retire {
                    lot_bytes + definition_bytes + parent_id.len() + cause.len() + retained_index
                } else {
                    0
                },
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let at = physical.header.sim_time;
        let retirement = retire.then(|| ItemRetirement {
            custodian_id: custodian.map(str::to_owned),
            at,
            cause: cause.into(),
            definition_pin: lot.definition_pin.clone(),
            quantity: before_quantity,
        });
        let unit_pin = lot.unit_pin.clone();
        let issued = self.state.physical.identity.allocate("object-history")?;
        let lineage = ObjectLineage {
            id: issued.id,
            kind: target.map_or(LineageKind::Consume, |(kind, _)| kind),
            source_id: item_id.into(),
            target_id: target.map(|(_, id)| id.to_owned()),
            quantity,
            cause: cause.into(),
            at,
            unit_pin,
            custodian_id: custodian.map(str::to_owned),
        };
        if retire && equipped {
            self.state.inventory.set_attachment(&self.state.physical.entities, parent_id, child, false)?;
        }
        let entity = self
            .state
            .physical
            .entities
            .resolve_mut(child)
            .ok_or(ExecutionError::Invariant)?;
        let edit = if let Some(retirement) = retirement {
            let detached = self.state.inventory.detach_loose_item(parent_id, child)?;
            let before = entity.item.take().ok_or(ExecutionError::Invariant)?;
            let placement = entity.placement.take().ok_or(ExecutionError::Invariant)?;
            let container = entity.container.take();
            entity.retirement = Some(retirement);
            ItemEdit::Retired {
                before,
                placement,
                detached,
                container,
            }
        } else {
            let item = entity.item.as_mut().ok_or(ExecutionError::Invariant)?;
            item.quantity -= quantity;
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
                extra_contents: Vec::new(),
            })));
        self.state
            .physical
            .entities
            .resolve_mut(parent)
            .ok_or(ExecutionError::Invariant)?
            .inventory_revision = contents;
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
        if custodian.is_none() {
            self.journal.physical.change(PhysicalChange::ObservationParameters {
                entity_id: parent_id.into(),
                request_detail: true,
            })?;
        }
        Ok(())
    }
}

impl ContentsBefore {
    pub(super) fn selection(&self) -> (EntityHandle, bool) { (self.handle, self.bag.is_some()) }

    pub(super) fn restore(&self, state: &mut PhysicalState) -> Result<(), ExecutionError> {
        let entity = state.entities.resolve_mut(self.handle).ok_or(ExecutionError::Invariant)?;
        entity.inventory_revision = self.revision;
        if let Some((load, load_revision, subtree_revision, height)) = self.bag {
            let bag = entity.container.as_mut().ok_or(ExecutionError::Invariant)?;
            (bag.load, bag.load_revision, bag.subtree_revision, bag.height) = (load, load_revision, subtree_revision, height);
        }
        Ok(())
    }
}

impl PhysicalMutation<'_> {
    /// A hold changes what the actual contents read offers without changing
    /// placement or load. Revise only the current path to the owning actor.
    pub(super) fn hold_availability(&mut self, item: &str) -> Result<(), ExecutionError> {
        let mut child = self.state.entities.handle(item).ok_or(ExecutionError::MissingEntity)?;
        while let Some(parent) = self.state.entities.resolve(child).and_then(crate::install::inventory_parent) {
            let handle = self.state.entities.handle(parent).ok_or(ExecutionError::Invariant)?;
            let original = self.state.entities.resolve(handle).ok_or(ExecutionError::Invariant)?;
            let revision = next_revision(original.inventory_revision.unwrap_or_default())?;
            let bag_revision = original.container.as_ref().map(|bag| next_revision(bag.subtree_revision)).transpose()?;
            let before = ContentsBefore {
                handle, revision: original.inventory_revision,
                bag: original.container.as_ref().map(|bag| (bag.load, bag.load_revision, bag.subtree_revision, bag.height)),
            };
            self.journal.reserve(size_of::<Undo>())?;
            self.journal.undo.push(Undo::InventoryAvailability(before));
            let entity = self.state.entities.resolve_mut(handle).ok_or(ExecutionError::Invariant)?;
            entity.inventory_revision = Some(revision);
            if let (Some(bag), Some(revision)) = (&mut entity.container, bag_revision) {
                bag.subtree_revision = revision;
                bag.load_revision = revision;
            }
            child = handle;
        }
        Ok(())
    }
}
