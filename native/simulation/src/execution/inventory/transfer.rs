//! Arrange a permitted exact lot between accessible storage endpoints.
//! Prove both ancestry paths and their net packing changes before editing.
use super::drop::inventory_work_bound;
use super::packing::PackingChange;
use super::pickup::{DirectRelocation, compatible_lots};
use super::*;
use crate::text::JsText;
use crate::work::WorkUnit;

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum OwnedArrangement {
    Move,
    Split,
    Merge,
}

impl OwnedArrangement {
    pub fn command_type(self) -> &'static str {
        match self {
            Self::Move => "transfer-item",
            Self::Split => "split-item",
            Self::Merge => "merge-item",
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OwnedMove<I> {
    #[serde(skip)]
    pub arrangement: OwnedArrangement,
    pub item_id: I,
    pub target_id: I,
    pub quantity: u64,
    pub expected_revision: u64,
    pub placement_revision: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expected_contents_revision: Option<u64>,
    pub target_revision: u64,
    // A signed world transfer binds exactly one already observed storage
    // container. Its current inspection and the physical root's reach are checked again.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub world_storage: Option<I>,
}

impl<I> OwnedMove<I> {
    pub(crate) fn map_ids<'a, N>(&'a self, mut convert: impl FnMut(&'a I) -> N) -> OwnedMove<N> {
        OwnedMove {
            arrangement: self.arrangement,
            item_id: convert(&self.item_id),
            target_id: convert(&self.target_id),
            quantity: self.quantity,
            expected_revision: self.expected_revision,
            placement_revision: self.placement_revision,
            expected_contents_revision: self.expected_contents_revision,
            target_revision: self.target_revision,
            world_storage: self.world_storage.as_ref().map(convert),
        }
    }
}

#[derive(Clone, Debug, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct OwnedStockLot {
    pub item_id: String,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    pub quantity: u64,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    pub revision: u64,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    pub placement_revision: u64,
}

#[derive(Clone, Debug, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OwnedStockSelection {
    pub container_id: String,
    pub revision: u64,
    pub quantity: u64,
    pub members: Vec<OwnedStockLot>,
}

impl crate::host::retained_size::HeapBytes for OwnedStockLot {
    fn heap_bytes(&self) -> Option<usize> {
        self.item_id.heap_bytes()
    }
}

impl crate::host::retained_size::HeapBytes for OwnedStockSelection {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([self.container_id.heap_bytes()?, self.members.heap_bytes()?])
    }
}

pub(crate) enum OwnedMoveError {
    Unavailable,
    Busy,
    Stale,
    NotPortable,
    Quantity,
    Packing,
    Depth,
    NoPackingLoad,
    StockIncomplete,
    InsufficientStock,
    PersonalMinimum,
    Material {
        message: JsText,
        _custody: ByteReservation,
    },
    FilledOpenBag,
    SplitParent,
    MergeQuantity,
    MergeMismatch,
}

pub(crate) fn can_split_stock(item: &Entity, definition: &crate::install::ItemDefinitionRead) -> bool {
    partitionable_stock(item, definition)
        && item.item.as_ref().is_some_and(|lot| lot.material_contribution_ids.is_none())
}

/// Merge discovery and execution share this comparison. The caller has
/// already checked that the source can split and that both lots are available.
pub(crate) fn same_container_merge(
    source: &Entity,
    target: &Entity,
    definition: &crate::install::ItemDefinitionRead,
) -> bool {
    source.id != target.id
        && matches!(source.placement, Some(Placement::Contained { .. }))
        && crate::install::inventory_parent(source) == crate::install::inventory_parent(target)
        && compatible_lots(source, target, definition)
        && source.item.as_ref().zip(target.item.as_ref()).is_some_and(|(source, target)| {
            source.quantity <= MAX_SAFE_INTEGER - target.quantity
        })
}

impl CoreMutation<'_> {
    /// Arrange an exact lot after any world endpoint's sight and reach reply.
    /// Shared ancestors change once with the net load. The ordinary inventory
    /// journal owns both sides and the caller's private result.
    pub(crate) fn arrange_lot(
        &mut self,
        actor: &str,
        cause: &str,
        request: OwnedMove<&str>,
    ) -> Result<Result<String, OwnedMoveError>, ExecutionError> {
        self.arrange_selected_lot(actor,cause,request,None)
    }

    pub(super) fn arrange_selected_lot(
        &mut self, actor:&str, cause:&str, request:OwnedMove<&str>, batch:Option<&super::stock::AdmittedStock<'_>>,
    )->Result<Result<String, OwnedMoveError>,ExecutionError>{
        use OwnedMoveError as Refuse;
        let state = &self.state;
        let physical = &state.physical;
        let entities = &physical.entities;
        let body = entities.get(actor).ok_or(ExecutionError::MissingActor)?;
        let definitions = &state.installed.retained;
        let limit = crate::install::inventory_ancestor_limit();
        let _workspace = self.journal.budget.reserve(
            2 * limit * size_of::<EntityHandle>()
                + request.item_id.len()
                + size_of::<EntityHandle>(),
        )?;
        let mut source_path = Vec::with_capacity(limit);
        let mut destination_path = Vec::with_capacity(limit);

        if !definitions
            .item_handling_read
            .can_handle(&body.spatial.body.id)
        {
            return Ok(Err(Refuse::Unavailable));
        }
        let (world_source, world_destination) = if let Some(id) = request.world_storage {
            let Some(storage) =
                crate::ground_items::inspection::WorldStorage::selected(state, actor, id)
            else {
                return Ok(Err(Refuse::Unavailable));
            };
            if request.arrangement != OwnedArrangement::Move {
                return Ok(Err(Refuse::Unavailable));
            }
            // A synchronous stock batch pins the inspected page before its first
            // mutation. Its own earlier moves legitimately change that page.
            let selected = if let Some(batch) = batch {
                batch.permits(id,request.item_id,request.target_id)
            } else {
                storage.inspection(&self.journal.budget)?.is_some_and(|page|
                    request.target_id==id || page.item_ids.iter().any(|known|known==request.item_id))
            };
            if !selected {return Ok(Err(Refuse::Unavailable));}
            if request.target_id == id {
                (None, Some(storage))
            } else {
                (Some(storage), None)
            }
        } else {
            (None, None)
        };
        let actor_handle = entities.handle(actor).ok_or(ExecutionError::Invariant)?;
        let item = if let Some(storage) = &world_source {
            let Some(item) = entities.get(request.item_id).filter(|item| {
                item.item.is_some() && state.inventory.has_direct_item(entities, &storage.container.id, item)
            }) else {
                return Ok(Err(Refuse::Unavailable));
            };
            for parent in storage.ancestry() {
                source_path.push(entities.handle(&parent.id).ok_or(ExecutionError::Invariant)?);
            }
            item
        } else {
            let Some(item) =
                crate::install::owned_item_ancestry(physical, actor, request.item_id, |parent| {
                    source_path.extend(entities.handle(&parent.id));
                })?
            else {
                return Ok(Err(Refuse::Unavailable));
            };
            source_path.push(actor_handle);
            item
        };
        let source = crate::install::inventory_parent(item).ok_or(ExecutionError::Invariant)?;
        let merge_target = if request.arrangement == OwnedArrangement::Merge {
            let Some(target) = crate::install::owned_item_ancestry(
                physical, actor, request.target_id, |_| {},
            )? else {
                return Ok(Err(Refuse::Unavailable));
            };
            if crate::install::inventory_parent(target) != Some(source) {
                return Ok(Err(Refuse::MergeMismatch));
            }
            Some(target)
        } else {
            None
        };
        let destination_id = if merge_target.is_some() { source } else { request.target_id };
        let destination = if let Some(storage) = &world_destination {
            for parent in storage.ancestry() {
                destination_path.push(entities.handle(&parent.id).ok_or(ExecutionError::Invariant)?);
            }
            storage.container
        } else {
            let destination = if destination_id == actor {
                body
            } else {
                let Some(destination) = crate::install::owned_item_ancestry(
                    physical,
                    actor,
                    destination_id,
                    |parent| destination_path.extend(entities.handle(&parent.id)),
                )?
                .filter(|bag| crate::install::inventory_bag_access(bag, actor)) else {
                    return Ok(Err(Refuse::Unavailable));
                };
                destination_path.insert(
                    0,
                    entities.handle(&destination.id).ok_or(ExecutionError::Invariant)?,
                );
                destination
            };
            destination_path.push(actor_handle);
            destination
        };
        let action = body.actor.as_ref().and_then(|body| body.action.as_ref());
        if action.is_some() || !physical.holds.is_empty() {
            let mut visit = || {
                self.journal.meters.charge(&[(WorkUnit::Candidates, 1)])?;
                Ok(())
            };
            if inventory_work_bound(state, action, item, &mut visit)?
                || merge_target.map(|target| inventory_work_bound(state, action, target, &mut visit))
                    .transpose()?.unwrap_or(false)
            {
                return Ok(Err(Refuse::Busy));
            }
        }
        let lot = item.item.as_ref().ok_or(ExecutionError::Invariant)?;
        let placement = item.placement.as_ref().ok_or(ExecutionError::Invariant)?;
        let placement_revision = match placement {
            Placement::Contained { revision, .. } | Placement::Attached { revision, .. } => {
                *revision
            }
            Placement::World { .. } => return Err(ExecutionError::Invariant),
        };
        let target_revision = merge_target.map_or_else(
            || Ok(destination.inventory_revision.unwrap_or_default()),
            |target| target.item.as_ref().map(|lot| lot.revision).ok_or(ExecutionError::Invariant),
        )?;
        if lot.revision != request.expected_revision
            || placement_revision != request.placement_revision
            || request
                .expected_contents_revision
                .is_some_and(|rev| item.inventory_revision.unwrap_or_default() != rev)
            || target_revision != request.target_revision
        {
            return Ok(Err(Refuse::Stale));
        }
        let definition = definitions
            .items
            .get(&lot.definition_pin.id)
            .ok_or(ExecutionError::Invariant)?;
        if !definition.portable || lot.assembly_claim.is_some() {
            return Ok(Err(Refuse::NotPortable));
        }
        let quantity = request.quantity;
        if quantity == 0
            || quantity > lot.quantity
            || (quantity < lot.quantity && !can_split_stock(item, definition))
        {
            return Ok(Err(Refuse::Quantity));
        }
        match request.arrangement {
            OwnedArrangement::Move => {}
            OwnedArrangement::Split if source != destination.id => return Ok(Err(Refuse::SplitParent)),
            OwnedArrangement::Split if quantity == lot.quantity => return Ok(Err(Refuse::Quantity)),
            OwnedArrangement::Merge if quantity != lot.quantity => return Ok(Err(Refuse::MergeQuantity)),
            OwnedArrangement::Merge
                if !can_split_stock(item, definition)
                    || !same_container_merge(item, merge_target.ok_or(ExecutionError::Invariant)?, definition) =>
            {
                return Ok(Err(Refuse::MergeMismatch));
            }
            OwnedArrangement::Split | OwnedArrangement::Merge => {}
        }
        if source == destination.id {
            if request.arrangement == OwnedArrangement::Move {
                return Ok(Ok(item.id.clone()));
            }
            // The total packed load stays the same. The direct lot edit owns
            // its contents revision; refresh ancestors and packing summaries.
            let _source = self.journal.budget.reserve(source.len())?;
            let source = source.to_owned();
            let before = lot.quantity;
            let installed = state.installed.clone();
            let edited = if request.arrangement == OwnedArrangement::Split {
                let definition = installed.retained.items.get(&lot.definition_pin.id)
                    .ok_or(ExecutionError::Invariant)?;
                self.split_direct_lot(&source, Some(actor), request.item_id, before, quantity, definition, cause)?
            } else {
                self.merge_direct_lots(&source, Some(actor), request.item_id, request.target_id, quantity, cause)?;
                request.target_id.to_owned()
            };
            for (index, handle) in source_path.into_iter().enumerate() {
                self.publish_packing(handle, PackingChange::Add(0), index == 0 && request.arrangement == OwnedArrangement::Split)?;
            }
            return Ok(Ok(edited));
        }
        let destination_bag = destination
            .item
            .as_ref()
            .and_then(|lot| definitions.items.get(&lot.definition_pin.id));
        let destination_is_open = destination_bag.is_some_and(|bag| bag.has_open_contents())
            && crate::install::inventory_parent(destination) == Some(actor)
            && body.world_support().is_some()
            && positive_body(destination);
        if let Some(refusal) = definition
            .material
            .as_ref()
            .and_then(|rule| rule.bag_refusal.as_ref())
        {
            if destination.container.is_some()
                && !(definition.exposure.is_some() && destination_is_open)
            {
                let _copy = self.journal.budget.reserve(refusal.storage_bytes())?;
                return Ok(Err(Refuse::Material {
                    message: refusal.clone(),
                    _custody: _copy,
                }));
            }
        }
        if definition.has_open_contents()
            && (destination.id != actor || body.world_support().is_none() || !positive_body(item))
        {
            for child in state.inventory.children(entities, &item.id, false) {
                self.journal.meters.charge(&[(WorkUnit::Candidates, 1)])?;
                if child
                    .item
                    .as_ref()
                    .and_then(|lot| definitions.items.get(&lot.definition_pin.id))
                    .is_some_and(|definition| definition.exposure.is_some())
                {
                    return Ok(Err(Refuse::FilledOpenBag));
                }
            }
        }
        let item_handle = entities.handle(&item.id).ok_or(ExecutionError::Invariant)?;
        let height = item.container.as_ref().map_or(0, |bag| bag.height);
        if destination_path.contains(&item_handle)
            || destination_path.len() as u64 + height >= limit as u64
        {
            return Ok(Err(Refuse::Depth));
        }
        for (offset, handle) in destination_path.iter().enumerate() {
            let ancestor = entities.resolve(*handle).ok_or(ExecutionError::Invariant)?;
            if let Some(bag) = &ancestor.container {
                let maximum = definitions
                    .items
                    .get(&bag.definition_pin.id)
                    .and_then(|definition| definition.container_maximum_depth())
                    .ok_or(ExecutionError::Invariant)?;
                if offset as u64 + 1 + height > maximum {
                    return Ok(Err(Refuse::Depth));
                }
            }
        }
        let load = definitions
            .packing_load_for(&lot.definition_pin)
            .and_then(|own| own.checked_mul(quantity))
            .and_then(|own| own.checked_add(item.container.as_ref().map_or(0, |bag| bag.load)))
            .filter(|load| *load <= MAX_SAFE_INTEGER);
        let common = source_path
            .iter()
            .rev()
            .zip(destination_path.iter().rev())
            .take_while(|(old, new)| old == new)
            .count();
        let (source_only, shared) = source_path.split_at(source_path.len() - common);
        let (destination_only, _) = destination_path.split_at(destination_path.len() - common);
        let packing = [
            (source_only, PackingChange::Remove(load.unwrap_or(0))),
            (destination_only, PackingChange::Add(load.unwrap_or(0))),
            (shared, PackingChange::Add(0)),
        ];
        if let Err(reason) = super::packing::check_packing(state, &packing, load)? {
            return Ok(Err(reason));
        }
        let attached = matches!(placement, Placement::Attached { .. });
        let world_custodian = world_source
            .or(world_destination)
            .filter(|storage| storage.root.actor.is_some())
            .map(|storage| storage.root.id.as_str());
        let _source = self
            .journal
            .budget
            .reserve(source.len() + world_custodian.map_or(0, str::len))?;
        let source = source.to_owned();
        let world_custodian = world_custodian.map(str::to_owned);
        let Some(moved) = self.relocate_stock(DirectRelocation {
            source: &source,
            destination: request.target_id,
            actor,
            source_owner: if world_source.is_some() {
                world_custodian.as_deref()
            } else {
                Some(actor)
            },
            destination_owner: if world_destination.is_some() {
                world_custodian.as_deref()
            } else {
                Some(actor)
            },
            item: request.item_id,
            quantity,
            cause,
            merge_receiving_lot: batch.is_none(),
            publish_contents: true,
        })?
        else {
            return Ok(Err(Refuse::Quantity));
        };
        for (path, change) in packing {
            for handle in path {
                self.publish_packing(
                    *handle,
                    change,
                    source_path.first() == Some(handle) || destination_path.first() == Some(handle),
                )?;
            }
        }
        if attached {
            self.journal
                .physical
                .change(PhysicalChange::ObservationParameters {
                    entity_id: actor.into(),
                    request_detail: true,
                })?;
        }
        Ok(Ok(moved))
    }
}

pub(super) fn positive_body(item: &Entity) -> bool {
    if let Some(form) = &item.spatial.soft_footprint {
        form.width.max(form.length) > 0.0 && form.height > 0.0
    } else {
        item.spatial.body.radius > 0.0 && item.spatial.body.height > 0.0
    }
}
