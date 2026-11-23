//! Current owned inventory. The physical index remains the only custody
//! authority, and an HTTP read holds one publication lease throughout.
use super::*;
use crate::install::{
    InventoryDetail, ItemDefinitionRead, OwnedItem, accessible_bag, inventory_ancestor_limit,
    owned_item_ancestry, project_owned,
};
use crate::simulation::SimulationState;
use crate::state::{Entity, EntityHandle, EquipmentPort, Placement};
use crate::text::JsText;
use serde::Serialize;
mod groups;
pub use groups::{InventoryGroup, ResolvedInventoryGroup, StockGroupRefusal, StockGroupRequest, stock_group_limit_message};

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InventoryCrumb<'a> {
    pub id: &'a str,
    pub name: &'a JsText,
    #[serde(skip_serializing_if = "Option::is_none")]
    name_form: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    indefinite_article: Option<&'a str>,
    pub revision: u64,
    #[serde(skip)]
    pub placement_revision: u64,
    #[serde(skip)]
    pub subtree_revision: u64,
}

impl<'a> InventoryCrumb<'a> {
    fn new(entity: &'a Entity, named: Option<&'a crate::state::Named>) -> Self {
        Self {
            id: &entity.id,
            name: named.map_or(&entity.name, |name| &name.name),
            name_form: named.map_or(entity.name_form.as_deref(), |name| {
                name.name_form.as_deref()
            }),
            indefinite_article: named.map_or(entity.indefinite_article.as_deref(), |name| {
                name.indefinite_article.as_deref()
            }),
            revision: entity.inventory_revision.unwrap_or_default(),
            subtree_revision: entity
                .container
                .as_ref()
                .map_or(0, |bag| bag.subtree_revision),
            placement_revision: entity
                .placement
                .as_ref()
                .map_or(0, |placement| match placement {
                    Placement::Contained { revision, .. }
                    | Placement::Attached { revision, .. }
                    | Placement::World { revision, .. } => *revision,
                }),
        }
    }
}

#[derive(Clone, Copy, Serialize)]
pub struct InventoryContainer {
    capacity: u64,
    load: u64,
    restricted: bool,
}

impl InventoryContainer {
    pub(super) fn new(capacity: u64, state: &crate::state::ContainerState) -> Self {
        Self {
            capacity,
            load: state.load,
            restricted: state.access.is_some(),
        }
    }
}

/// A borrowed exact inventory cut. Default pages seek directly into the
/// selected container's ordered children. Only emitted rows need action offers.
pub struct DirectInventory<'a> {
    pub breadcrumbs: &'a [InventoryCrumb<'a>],
    pub container: Option<InventoryContainer>,
    pub can_act: bool,
    pub body_ports: &'a [EquipmentPort],
    state: &'a SimulationState,
    actor: &'a Entity,
    children: &'a [EntityHandle],
    eater: Option<crate::consumption::Eater<'a>>,
    action_problem: Option<&'a crate::worlds::InstalledActionMessage>,
}

pub struct InventorySlot<'a> {
    pub item: OwnedItem<'a>,
    entity: &'a Entity,
    definition: &'a ItemDefinitionRead,
}

pub struct MergeInventory<'a> {
    item: &'a Entity,
    definition: &'a ItemDefinitionRead,
    free: bool,
}

pub struct SplitOffer<'a> {
    pub parent: InventoryCrumb<'a>,
    pub reason: Option<&'a str>,
    pub in_use: bool,
}

impl<'a> DirectInventory<'a> {
    fn can_handle(&self) -> bool {
        self.state.installed.retained.item_handling_read.can_handle(&self.actor.spatial.body.id)
    }

    fn lot_in_use(&self, lot: &Entity) -> Result<bool, RuntimeError> {
        let action = self.actor.actor.as_ref().and_then(|actor| actor.action.as_ref());
        if action.is_none() && self.state.physical.holds.is_empty() {
            return Ok(false);
        }
        crate::execution::inventory_work_bound(self.state, action, lot, &mut || Ok(())).map_err(failure)
    }

    /// Select the source once from this permitted container, without reading
    /// its display or scanning its siblings. An unavailable ID discloses no facts.
    pub fn merge_source(&self, id: &str) -> Result<Option<MergeInventory<'a>>, RuntimeError> {
        let parent = self.breadcrumbs.last().ok_or_else(|| failure("inventory root unavailable"))?;
        let entities = &self.state.physical.entities;
        let Some(item) = entities.get(id).filter(|item| self.state.inventory.has_direct_item(entities, parent.id, item)) else {
            return Ok(None);
        };
        let definition = self.definition(item)?;
        let free = self.can_handle() && definition.portable
            && crate::execution::can_split_stock(item, definition) && !self.lot_in_use(item)?;
        Ok(Some(MergeInventory { item, definition, free }))
    }

    /// Test one row in the requested inventory window, before preparing its
    /// name or action offers. This uses the same compatibility law as execution.
    pub fn merge_matches(&self, source: &MergeInventory<'_>, index: usize) -> Result<bool, RuntimeError> {
        if !source.free {
            return Ok(false);
        }
        let target = self.child(index)?;
        Ok(crate::execution::same_container_merge(source.item, target, source.definition)
            && !self.lot_in_use(target)?)
    }

    /// Offer a split only on a displayed exact lot. The command will check
    /// its quantity, custody and work bindings again on the next candidate.
    pub fn split_offer(&self, slot: &InventorySlot<'a>) -> Result<Option<SplitOffer<'a>>, RuntimeError> {
        if slot.item.quantity <= 1 || !slot.definition.portable || !self.can_handle()
            || !crate::execution::can_split_stock(slot.entity, slot.definition)
        {
            return Ok(None);
        }
        let parent = *self.breadcrumbs.last().ok_or_else(|| failure("inventory root unavailable"))?;
        let reason = self.action_problem.map(|problem| problem.message.as_str());
        let in_use = reason.is_none() && self.lot_in_use(slot.entity)?;
        Ok(Some(SplitOffer { parent, reason, in_use }))
    }

    /// Recheck the one retained deliberate read against live custody. The
    /// borrowed record is usable only inside the current disclosure callback.
    pub fn inspected_recipe(
        &self,
        budget: &ByteBudget,
    ) -> Result<Option<(&'a str, InspectedRecipeRecord<'a>)>, RuntimeError> {
        let parent = self
            .breadcrumbs
            .last()
            .ok_or_else(|| failure("inventory root unavailable"))?;
        let Some(page) = crate::ground_items::inspection::owned::current(
            self.state,
            &self.actor.id,
            parent.id,
            budget,
        )
        .map_err(failure)?
        else {
            return Ok(None);
        };
        let id = &page.item_ids[0];
        let Some(item) = self.state.physical.entities.get(id).filter(|item| {
            item.retirement.is_none() && crate::install::inventory_parent(item) == Some(parent.id)
        }) else {
            return Ok(None);
        };
        Ok(InspectedRecipeRecord::from_definition(
            self.state,
            &self.actor.id,
            self.definition(item)?,
        )
        .map(|record| (id.as_str(), record)))
    }

    pub fn paused(&self) -> bool {
        self.state.physical.header.paused
    }

    pub fn can_learn(&self) -> Result<bool, RuntimeError> {
        super::world_storage::can_learn(self.state, self.actor)
    }

    /// Count only requested ingredients in current accessible possessions.
    pub fn tally_recipe_stock(
        &self,
        quantities: &mut IndexMap<&str, u64>,
    ) -> Result<(), RuntimeError> {
        super::world_storage::tally_recipe_stock(self.state, &self.actor.id, quantities)
    }

    pub fn count(&self) -> usize {
        self.children.len()
    }

    fn definition(&self, entity: &'a Entity) -> Result<&'a ItemDefinitionRead, RuntimeError> {
        entity
            .item
            .as_ref()
            .and_then(|lot| {
                self.state
                    .installed
                    .retained
                    .items
                    .get(&lot.definition_pin.id)
            })
            .ok_or_else(|| failure("inventory definition unavailable"))
    }

    fn child(&self, index: usize) -> Result<&'a Entity, RuntimeError> {
        self.children
            .get(index)
            .and_then(|handle| self.state.physical.entities.resolve(*handle))
            .ok_or_else(|| failure("inventory index unavailable"))
    }

    pub fn name(&self, index: usize) -> Result<&'a JsText, RuntimeError> {
        Ok(&self.definition(self.child(index)?)?.named.name)
    }

    pub fn quantity(&self, index: usize) -> Result<u64, RuntimeError> {
        self.child(index)?
            .item
            .as_ref()
            .map(|lot| lot.quantity)
            .ok_or_else(|| failure("inventory item unavailable"))
    }

    pub fn slot(&self, index: usize) -> Result<InventorySlot<'a>, RuntimeError> {
        let entity = self.child(index)?;
        let definition = self.definition(entity)?;
        Ok(InventorySlot {
            item: self.project(entity)?,
            entity,
            definition,
        })
    }

    fn project(&self, entity: &'a Entity) -> Result<OwnedItem<'a>, RuntimeError> {
        project_owned(
            &self.state.installed.retained,
            &self.actor.id,
            entity,
            accessible_bag(entity, &self.actor.id),
            self.state.physical.holds.quantity(&entity.id),
        )
        .map_err(failure)
    }

    pub fn equipped_count(&self) -> usize {
        self.state.inventory.attachment_count(&self.actor.id)
    }

    pub fn equipped(&self) -> impl Iterator<Item = Result<OwnedItem<'a>, RuntimeError>> + '_ {
        self.state
            .inventory
            .children(&self.state.physical.entities, &self.actor.id, true)
            .map(|entity| self.project(entity))
    }

    pub fn describe(&self, slot: InventorySlot<'a>) -> Result<InventoryDetail<'a>, RuntimeError> {
        let definitions = &self.state.installed.retained;
        let policy = &definitions.item_handling_read;
        let drop = if slot.definition.portable && policy.can_handle(&self.actor.spatial.body.id) {
            let reason = if let Some(problem) = self.action_problem {
                Some(problem.message.as_str())
            } else {
                crate::execution::drop_item_problem(
                    self.state,
                    self.actor,
                    slot.item.id,
                    slot.item.quantity,
                    || Ok(()),
                )
                .map_err(failure)?
            };
            Some(crate::install::DropOffer {
                label: &policy.drop.label,
                reason,
            })
        } else {
            None
        };
        Ok(InventoryDetail {
            item: slot.item,
            category: slot.definition.category,
            description: slot.definition.description.as_ref(),
            properties: &slot.definition.properties,
            material_condition: crate::material_exposure::material_condition(
                self.state, slot.entity, slot.definition.exposure.as_ref(),
            ).map_err(failure)?,
            equipment_ports: slot.definition.equipment_ports(),
            equipment_fits: crate::execution::equipment_fits(self.state, self.actor, slot.entity),
            eating: self
                .eater
                .as_ref()
                .and_then(|eater| eater.offer(slot.definition, self.action_problem)),
            drop,
        })
    }
}

impl NativeWorldSession {
    /// Look up the exact requested owned lots without constructing a player
    /// view. The callback must finish encoding/handoff within this lease.
    pub fn with_player_inventory<T>(
        &self,
        account: &str,
        actor: &str,
        ids: &[String],
        consume: impl FnOnce(&[crate::install::OwnedItem<'_>], &ByteBudget) -> T,
    ) -> Result<T, RuntimeError> {
        self.require_active()?;
        if ids.len() > crate::install::shortcut_limit()
            || ids.iter().any(|id| !crate::values::is_safe_record_id(id))
        {
            return Err(failure("invalid owned shortcut selection"));
        }
        let simulation = self.session.accepted().map_err(failure)?;
        simulation
            .require_player_read(account, actor)
            .map_err(failure)?;
        let _lease = self.session.fence().begin_publication().map_err(failure)?;
        let bytes = ids
            .len()
            .checked_mul(std::mem::size_of::<crate::install::OwnedItem<'_>>())
            .ok_or(crate::host::CapacityError)?;
        let _custody = self.budget.reserve(bytes)?;
        let mut items = Vec::with_capacity(ids.len());
        let state = &simulation.state;
        for (index, id) in ids.iter().enumerate() {
            if !ids[..index].contains(id)
                && let Some(item) =
                    crate::install::owned_by(&state.physical, &state.installed.retained, actor, id)
                        .map_err(failure)?
            {
                items.push(item);
            }
        }
        Ok(consume(&items, &self.budget))
    }

    /// Read an exact carried container (or the actor's own direct possession)
    /// and only that collection's current index. No child facts leave the
    /// callback after the native and application disclosure leases end.
    pub fn with_player_direct_inventory<T>(
        &self,
        account: &str,
        actor: &str,
        container: Option<&str>,
        consume: impl FnOnce(Option<DirectInventory<'_>>, &ByteBudget) -> T,
    ) -> Result<T, RuntimeError> {
        self.require_active()?;
        let simulation = self.session.accepted().map_err(failure)?;
        simulation
            .require_player_read(account, actor)
            .map_err(failure)?;
        let _lease = self.session.fence().begin_publication().map_err(failure)?;
        let state = &simulation.state;
        let definitions = &state.installed.retained;
        let actor = state
            .physical
            .entities
            .get(actor)
            .ok_or_else(|| failure("inventory owner unavailable"))?;
        let body = actor
            .actor
            .as_ref()
            .ok_or_else(|| failure("inventory owner unavailable"))?;
        let container = container.filter(|id| *id != actor.id);
        let depth = if container.is_some() {
            inventory_ancestor_limit() + 1
        } else {
            1
        };
        let _path = self
            .budget
            .reserve(depth * size_of::<InventoryCrumb<'_>>())?;
        let mut path = Vec::with_capacity(depth);
        let (parent, named, metadata) = if let Some(container) = container {
            let selected = owned_item_ancestry(&state.physical, &actor.id, container, |entity| {
                let named = entity
                    .item
                    .as_ref()
                    .and_then(|lot| definitions.items.get(&lot.definition_pin.id))
                    .map(|definition| &definition.named);
                path.push(InventoryCrumb::new(entity, named));
            })
            .map_err(failure)?;
            let Some(bag) = selected.filter(|bag| accessible_bag(bag, &actor.id)) else {
                return Ok(consume(None, &self.budget));
            };
            let definition = bag
                .item
                .as_ref()
                .and_then(|lot| definitions.items.get(&lot.definition_pin.id))
                .ok_or_else(|| failure("inventory definition unavailable"))?;
            let capacity = definition
                .container_capacity()
                .ok_or_else(|| failure("inventory container unavailable"))?;
            let contents = bag
                .container
                .as_ref()
                .ok_or_else(|| failure("inventory container unavailable"))?;
            (
                bag,
                Some(&definition.named),
                Some(InventoryContainer::new(capacity, contents)),
            )
        } else {
            (actor, None, None)
        };
        path.push(InventoryCrumb::new(actor, None));
        path.reverse();
        if named.is_some() {
            path.push(InventoryCrumb::new(parent, named));
        }
        let action_problem = crate::consumption::action_problem(
            &state.installed,
            actor,
            state.physical.header.paused,
        )
        .map_err(failure)?;
        let eater = crate::consumption::Eater::current(&state.installed, &state.physical, actor)
            .map_err(failure)?;
        Ok(consume(
            Some(DirectInventory {
                breadcrumbs: &path,
                container: metadata,
                can_act: action_problem.is_none() && body.action.is_none(),
                body_ports: body
                    .body
                    .as_ref()
                    .map_or(&[], |body| body.equipment_ports.as_slice()),
                state,
                actor,
                children: state.inventory.direct_items(&parent.id),
                eater,
                action_problem,
            }),
            &self.budget,
        ))
    }
}
