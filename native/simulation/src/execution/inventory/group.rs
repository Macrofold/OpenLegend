//! An admitted display group moves the selected physical origins unchanged.
//! Plan one aggregate load change per ancestor before relocating any member.
use super::packing::PackingChange;
use super::pickup::DirectRelocation;
use super::*;
use crate::identity::MAX_SAFE_INTEGER;
use crate::work::WorkUnit;

impl CoreMutation<'_> {
    pub(crate) fn check_stock_group(
        &mut self,
        actor_id: &str,
        group: &OwnedStockSelection,
    ) -> Result<Result<(), OwnedMoveError>, ExecutionError> {
        use OwnedMoveError as Refuse;
        let state = &self.state;
        let entities = &state.physical.entities;
        let actor = entities.get(actor_id).ok_or(ExecutionError::MissingActor)?;
        let definitions = &state.installed.retained;
        if !definitions
            .item_handling_read
            .can_handle(&actor.spatial.body.id)
            || group.members.is_empty()
            || group.members.len() > crate::stock_transfer::limits().moved_lots
        {
            return Ok(Err(Refuse::Unavailable));
        }
        let Some(source) = group_container(state, actor, &group.container_id, |_| {})? else {
            return Ok(Err(Refuse::Unavailable));
        };
        if source.inventory_revision.unwrap_or_default() != group.revision {
            return Ok(Err(Refuse::Stale));
        }
        let action = actor.actor.as_ref().and_then(|body| body.action.as_ref());
        let mut sum = 0_u64;
        for (index, member) in group.members.iter().enumerate() {
            if group.members[..index]
                .iter()
                .any(|other| other.item_id == member.item_id)
            {
                return Ok(Err(Refuse::Unavailable));
            }
            let Some(entity) = entities
                .get(&member.item_id)
                .filter(|item| state.inventory.has_direct_item(entities, &source.id, item))
            else {
                return Ok(Err(Refuse::Stale));
            };
            let lot = entity.item.as_ref().ok_or(ExecutionError::Invariant)?;
            if !matches!(&entity.placement, Some(Placement::Contained { revision, .. }) if *revision == member.placement_revision)
                || lot.revision != member.revision
            {
                return Ok(Err(Refuse::Stale));
            }
            let definition = definitions
                .items
                .get(&lot.definition_pin.id)
                .ok_or(ExecutionError::Invariant)?;
            if !definition.portable || lot.assembly_claim.is_some() || entity.container.is_some() {
                return Ok(Err(Refuse::NotPortable));
            }
            if member.quantity == 0
                || member.quantity > lot.quantity
                || (member.quantity < lot.quantity && !can_split_stock(entity, definition))
            {
                return Ok(Err(Refuse::Quantity));
            }
            if (action.is_some() || !state.physical.holds.is_empty())
                && inventory_work_bound(state, action, entity, &mut || {
                    self.journal.meters.charge(&[(WorkUnit::Candidates, 1)])?;
                    Ok(())
                })?
            {
                return Ok(Err(Refuse::Busy));
            }
            let Some(next) = sum
                .checked_add(member.quantity)
                .filter(|value| *value <= MAX_SAFE_INTEGER)
            else {
                return Ok(Err(Refuse::Quantity));
            };
            sum = next;
        }
        if sum != group.quantity {
            return Ok(Err(Refuse::Quantity));
        }
        Ok(Ok(()))
    }

    pub(crate) fn move_stock_group(
        &mut self,
        actor: &str,
        group: &OwnedStockSelection,
        target: &str,
        revision: u64,
        cause: &str,
    ) -> Result<Result<String, OwnedMoveError>, ExecutionError> {
        if let Err(reason) = self.check_stock_group(actor, group)? {
            return Ok(Err(reason));
        }
        self.relocate_stock_group(actor, group, target, Some(revision), cause)
    }

    pub(crate) fn drop_stock_group(
        &mut self,
        actor: &str,
        group: &OwnedStockSelection,
        pile: &str,
    ) -> Result<(), ExecutionError> {
        if let [member] = group.members.as_slice() {
            // A one-source choice uses the ordinary drop's pile merge rule.
            return self.drop_checked_lot(actor, &member.item_id, member.quantity, pile);
        }
        self.relocate_stock_group(actor, group, pile, None, "drop")?
            .map(|_| ())
            .map_err(|_| ExecutionError::Invariant)
    }

    /// All branches keep the existing relocation journal. A move targets
    /// another owned container. A drop supplies its already selected pile.
    fn relocate_stock_group(
        &mut self,
        actor_id: &str,
        group: &OwnedStockSelection,
        target: &str,
        target_revision: Option<u64>,
        cause: &str,
    ) -> Result<Result<String, OwnedMoveError>, ExecutionError> {
        use OwnedMoveError as Refuse;
        let state = &self.state;
        let entities = &state.physical.entities;
        let actor = entities.get(actor_id).ok_or(ExecutionError::MissingActor)?;
        let definitions = &state.installed.retained;
        let limit = crate::install::inventory_ancestor_limit();
        let _workspace = self.journal.budget.reserve(
            2 * (limit + 1) * size_of::<EntityHandle>()
                + group
                    .members
                    .first()
                    .map_or(0, |member| 2 * member.item_id.len()),
        )?;
        let mut source_path = Vec::with_capacity(limit + 1);
        let mut destination_path = Vec::with_capacity(limit + 1);
        if group_container(state, actor, &group.container_id, |handle| {
            source_path.push(handle)
        })?
        .is_none()
        {
            return Ok(Err(Refuse::Unavailable));
        }
        if group.container_id == target {
            return Ok(Err(Refuse::Unavailable));
        }
        if let Some(revision) = target_revision {
            let Some(destination) =
                group_container(state, actor, target, |handle| destination_path.push(handle))?
            else {
                return Ok(Err(Refuse::Unavailable));
            };
            if destination.inventory_revision.unwrap_or_default() != revision {
                return Ok(Err(Refuse::Stale));
            }
            if destination_path.len() >= limit {
                return Ok(Err(Refuse::Depth));
            }
            let destination_bag = destination
                .item
                .as_ref()
                .and_then(|lot| definitions.items.get(&lot.definition_pin.id));
            let destination_is_open = destination_bag.is_some_and(|bag| bag.has_open_contents())
                && crate::install::inventory_parent(destination) == Some(actor_id)
                && actor.world_support().is_some()
                && super::transfer::positive_body(destination);
            if destination.container.is_some() {
                for member in &group.members {
                    let Some(definition) = entities
                        .get(&member.item_id)
                        .and_then(|entity| entity.item.as_ref())
                        .and_then(|lot| definitions.items.get(&lot.definition_pin.id))
                    else {
                        return Err(ExecutionError::Invariant);
                    };
                    if let Some(refusal) = definition
                        .material
                        .as_ref()
                        .and_then(|rule| rule.bag_refusal.as_ref())
                        && !(definition.exposed_material && destination_is_open)
                    {
                        let custody = self.journal.budget.reserve(refusal.storage_bytes())?;
                        return Ok(Err(Refuse::Material {
                            message: refusal.clone(),
                            _custody: custody,
                        }));
                    }
                }
            }
            for (index, handle) in destination_path.iter().enumerate() {
                let parent = entities.resolve(*handle).ok_or(ExecutionError::Invariant)?;
                if let Some(bag) = &parent.container {
                    let depth = definitions
                        .items
                        .get(&bag.definition_pin.id)
                        .and_then(|definition| definition.container_maximum_depth())
                        .ok_or(ExecutionError::Invariant)?;
                    if index as u64 + 1 > depth {
                        return Ok(Err(Refuse::Depth));
                    }
                }
            }
        } else {
            destination_path.push(entities.handle(target).ok_or(ExecutionError::Invariant)?);
        }

        let common = source_path
            .iter()
            .rev()
            .zip(destination_path.iter().rev())
            .take_while(|(source, destination)| source == destination)
            .count();
        let (source_only, shared) = source_path.split_at(source_path.len() - common);
        let (target_only, _) = destination_path.split_at(destination_path.len() - common);
        let load = group.members.iter().try_fold(0_u64, |total, member| {
            let lot = entities.get(&member.item_id)?.item.as_ref()?;
            let load = definitions
                .packing_load_for(&lot.definition_pin)?
                .checked_mul(member.quantity)?;
            total
                .checked_add(load)
                .filter(|amount| *amount <= MAX_SAFE_INTEGER)
        });
        let chains = [
            (source_only, PackingChange::Remove(load.unwrap_or(0))),
            (target_only, PackingChange::Add(load.unwrap_or(0))),
            (shared, PackingChange::Add(0)),
        ];
        if let Err(reason) = super::packing::check_packing(state, &chains, load)? {
            return Ok(Err(reason));
        }
        let mut first = None;
        for member in &group.members {
            let moved = self
                .relocate_stock(DirectRelocation {
                    source: &group.container_id,
                    destination: target,
                    actor: actor_id,
                    source_owner: Some(actor_id),
                    destination_owner: Some(actor_id),
                    item: &member.item_id,
                    quantity: member.quantity,
                    cause,
                    merge_receiving_lot: false,
                    publish_contents: false,
                })?
                .ok_or(ExecutionError::Invariant)?;
            if first.is_none() {
                first = Some(moved);
            }
        }
        for (path, change) in chains {
            for handle in path {
                self.publish_packing(*handle, change, false)?;
            }
        }
        if target_revision.is_none() {
            self.journal
                .physical
                .change(PhysicalChange::ObservationParameters {
                    entity_id: target.into(),
                    request_detail: true,
                })?;
        }
        Ok(Ok(first.ok_or(ExecutionError::Invariant)?))
    }
}

/// A current owned source/destination and its inner-to-outer chain. No child
/// scan is needed for access and the actor's inventory is the common root.
fn group_container<'a>(
    state: &'a crate::simulation::SimulationState,
    actor: &'a Entity,
    id: &str,
    mut visit: impl FnMut(EntityHandle),
) -> Result<Option<&'a Entity>, ExecutionError> {
    let physical = &state.physical;
    if id == actor.id {
        visit(
            physical
                .entities
                .handle(id)
                .ok_or(ExecutionError::Invariant)?,
        );
        return Ok(Some(actor));
    }
    let Some(bag_handle) = physical.entities.handle(id) else {
        return Ok(None);
    };
    visit(bag_handle);
    let selected = crate::install::owned_item_ancestry(physical, &actor.id, id, |parent| {
        if let Some(handle) = physical.entities.handle(&parent.id) {
            visit(handle);
        }
    })?
    .filter(|bag| crate::install::inventory_bag_access(bag, &actor.id));
    if selected.is_some() {
        visit(
            physical
                .entities
                .handle(&actor.id)
                .ok_or(ExecutionError::Invariant)?,
        );
    }
    Ok(selected)
}
