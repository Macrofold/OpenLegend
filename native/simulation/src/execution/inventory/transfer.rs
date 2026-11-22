//! The player is arranging items in their own accessible inventory. Prove the
//! original source, destination and their net packing changes before editing.
use super::drop::inventory_work_bound;
use super::packing::PackingChange;
use super::pickup::DirectRelocation;
use super::*;
use crate::text::JsText;
use crate::work::WorkUnit;

#[derive(Clone, Copy, Debug, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OwnedMove<I> {
    pub item_id: I,
    pub target_id: I,
    pub quantity: u64,
    pub expected_revision: u64,
    pub placement_revision: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expected_contents_revision: Option<u64>,
    pub target_revision: u64,
}

impl<I> OwnedMove<I> {
    pub(crate) fn map_ids<'a, N>(&'a self, mut convert: impl FnMut(&'a I) -> N) -> OwnedMove<N> {
        OwnedMove {
            item_id: convert(&self.item_id),
            target_id: convert(&self.target_id),
            quantity: self.quantity,
            expected_revision: self.expected_revision,
            placement_revision: self.placement_revision,
            expected_contents_revision: self.expected_contents_revision,
            target_revision: self.target_revision,
        }
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
    Material {
        message: JsText,
        _custody: ByteReservation,
    },
    FilledOpenBag,
}

impl CoreMutation<'_> {
    /// Arrange an exact carried lot. Only its two ancestry chains are read.
    /// Shared ancestors change once with the net load. All changes use the
    /// existing physical journal and remain private to the caller.
    pub(crate) fn arrange_owned_lot(
        &mut self,
        actor: &str,
        cause: &str,
        request: OwnedMove<&str>,
    ) -> Result<Result<String, OwnedMoveError>, ExecutionError> {
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
        let Some(item) =
            crate::install::owned_item_ancestry(physical, actor, request.item_id, |parent| {
                source_path.extend(entities.handle(&parent.id));
            })?
        else {
            return Ok(Err(Refuse::Unavailable));
        };
        let actor_handle = entities.handle(actor).ok_or(ExecutionError::Invariant)?;
        source_path.push(actor_handle);
        let destination = if request.target_id == actor {
            body
        } else {
            let Some(destination) = crate::install::owned_item_ancestry(
                physical,
                actor,
                request.target_id,
                |parent| destination_path.extend(entities.handle(&parent.id)),
            )?
            .filter(|bag| crate::install::inventory_bag_access(bag, actor)) else {
                return Ok(Err(Refuse::Unavailable));
            };
            destination_path.insert(
                0,
                entities
                    .handle(&destination.id)
                    .ok_or(ExecutionError::Invariant)?,
            );
            destination
        };
        destination_path.push(actor_handle);
        let action = body.actor.as_ref().and_then(|body| body.action.as_ref());
        if (action.is_some() || !physical.holds.is_empty())
            && inventory_work_bound(state, action, item, &mut || {
                self.journal.meters.charge(&[(WorkUnit::Candidates, 1)])?;
                Ok(())
            })?
        {
            return Ok(Err(Refuse::Busy));
        }
        let lot = item.item.as_ref().ok_or(ExecutionError::Invariant)?;
        let placement = item.placement.as_ref().ok_or(ExecutionError::Invariant)?;
        let placement_revision = match placement {
            Placement::Contained { revision, .. } | Placement::Attached { revision, .. } => {
                *revision
            }
            Placement::World { .. } => return Err(ExecutionError::Invariant),
        };
        if lot.revision != request.expected_revision
            || placement_revision != request.placement_revision
            || request
                .expected_contents_revision
                .is_some_and(|rev| item.inventory_revision.unwrap_or_default() != rev)
            || destination.inventory_revision.unwrap_or_default() != request.target_revision
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
            || (quantity < lot.quantity
                && (!partitionable_stock(item, definition)
                    || lot.material_contribution_ids.is_some()))
        {
            return Ok(Err(Refuse::Quantity));
        }
        let source = crate::install::inventory_parent(item).ok_or(ExecutionError::Invariant)?;
        if source == destination.id {
            return Ok(Ok(item.id.clone()));
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
                && !(definition.exposed_material && destination_is_open)
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
                    .is_some_and(|definition| definition.exposed_material)
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
        for (path, change) in packing {
            for handle in path {
                let ancestor = entities.resolve(*handle).ok_or(ExecutionError::Invariant)?;
                let Some(bag) = &ancestor.container else {
                    continue;
                };
                if load.is_none() {
                    return Ok(Err(Refuse::NoPackingLoad));
                }
                let capacity = definitions
                    .items
                    .get(&bag.definition_pin.id)
                    .and_then(|definition| definition.container_capacity())
                    .ok_or(ExecutionError::Invariant)?;
                if bag.load_revision != bag.subtree_revision {
                    return Err(ExecutionError::Invariant);
                }
                if change.apply(bag.load).is_none_or(|next| next > capacity) {
                    return Ok(Err(Refuse::Packing));
                }
            }
        }
        let attached = matches!(placement, Placement::Attached { .. });
        let _source = self.journal.budget.reserve(source.len())?;
        let source = source.to_owned();
        let Some(moved) = self.relocate_stock(DirectRelocation {
            source: &source,
            destination: request.target_id,
            actor,
            source_owner: Some(actor),
            item: request.item_id,
            quantity,
            cause,
            merge_receiving_lot: true,
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

fn positive_body(item: &Entity) -> bool {
    if let Some(form) = &item.spatial.soft_footprint {
        form.width.max(form.length) > 0.0 && form.height > 0.0
    } else {
        item.spatial.body.radius > 0.0 && item.spatial.body.height > 0.0
    }
}
