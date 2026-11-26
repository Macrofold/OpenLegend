//! A lost physical life partitions actual indexed custody using installed
//! body rules. The distinct-type draw precedes the body's scar choice.
use super::packing::PackingChange;
use super::*;
use crate::body::DeathPossessions;
use crate::encoding::js_string_cmp;
use crate::host::retained_size::map_storage;
use crate::work::WorkUnit;

struct DeathLot {
    handle: EntityHandle,
    parent: Option<usize>,
    type_index: usize,
    promote: bool,
    packing_removed: Option<u64>,
}

impl CoreMutation<'_> {
    /// Read just this actor's custody tree, assign each type one fate and
    /// move mixed-fate descendants to their new roots through the existing
    /// reversible inventory owner. The returned reservation owns the exact
    /// summary backing until the caller installs its pending-death record.
    pub(crate) fn partition_replacement_custody(
        &mut self,
        actor: &str,
        corpse: &str,
        retained_type_fraction: f64,
    ) -> Result<
        (
            Vec<DeathPossessions>,
            Vec<DeathPossessions>,
            ByteReservation,
        ),
        ExecutionError,
    > {
        let budget = self.journal.budget.clone();
        let mut workspace = budget.reserve(0)?;
        if !self.state.inventory.has_children(actor) {
            return Ok((Vec::new(), Vec::new(), workspace));
        }
        let installed = self.state.installed.clone();
        let definitions = &installed.retained;
        let entities = &self.state.physical.entities;
        let actor_handle = entities.handle(actor).ok_or(ExecutionError::MissingActor)?;
        let corpse_handle = entities
            .handle(corpse)
            .ok_or(ExecutionError::MissingEntity)?;
        let mut lots = Vec::new();
        let mut totals: IndexMap<&str, (u64, bool)> = IndexMap::new();
        workspace.resize(size_of::<(EntityHandle, Option<usize>)>())?;
        let mut pending = vec![(actor_handle, None)];
        let mut capacity = 0_usize;
        while let Some((parent, parent_index)) = pending.pop() {
            let parent = entities.resolve(parent).ok_or(ExecutionError::Invariant)?;
            for &handle in self.state.inventory.direct_items(&parent.id) {
                self.journal.meters.charge(&[(WorkUnit::Candidates, 1)])?;
                if lots.len() == capacity {
                    capacity = capacity
                        .max(4)
                        .checked_mul(2)
                        .ok_or(ExecutionError::Capacity)?;
                    let maps = map_storage::<&str, (u64, bool)>(capacity)
                        .ok_or(ExecutionError::Capacity)?;
                    let per_lot = size_of::<DeathLot>()
                        + size_of::<(EntityHandle, Option<usize>)>()
                        + size_of::<usize>();
                    let bytes = capacity
                        .checked_mul(per_lot)
                        .and_then(|lists| lists.checked_add(maps))
                        .and_then(|total| total.checked_mul(2))
                        .ok_or(ExecutionError::Capacity)?;
                    workspace.resize(bytes)?;
                    lots.reserve_exact(capacity - lots.len());
                }
                let entity = entities.resolve(handle).ok_or(ExecutionError::Invariant)?;
                let lot = entity.item.as_ref().ok_or(ExecutionError::Invariant)?;
                let definition = definitions
                    .items
                    .get(&lot.definition_pin.id)
                    .ok_or(ExecutionError::Invariant)?;
                let entry = totals.entry(definition.pin.id.as_str());
                let type_index = entry.index();
                let (quantity, _) = entry.or_default();
                *quantity = quantity
                    .checked_add(lot.quantity)
                    .filter(|&value| value <= MAX_SAFE_INTEGER)
                    .ok_or(ExecutionError::Capacity)?;
                if entity.container.is_some() {
                    pending.push((handle, Some(lots.len())));
                }
                lots.push(DeathLot {
                    handle,
                    parent: parent_index,
                    type_index,
                    promote: false,
                    packing_removed: None,
                });
            }
        }
        let key = |index| totals.get_index(index).expect("known item type").0;
        let mut order: Vec<_> = (0..totals.len()).collect();
        order.sort_unstable_by(|&left, &right| js_string_cmp(key(left), key(right)));
        let retained_count = (order.len() as f64 * retained_type_fraction).floor() as usize;
        for index in 0..retained_count {
            let choice = index + (self.physical().draw() * (order.len() - index) as f64) as usize;
            order.swap(index, choice);
            totals[order[index]].1 = true;
        }

        let entities = &self.state.physical.entities;
        let mut roots_changed = false;
        for index in (0..lots.len()).rev() {
            let lot = &lots[index];
            let keep = totals[lot.type_index].1;
            let promote = lot
                .parent
                .map_or(!keep, |parent| totals[lots[parent].type_index].1 != keep);
            let delta = match (lot.parent, promote) {
                (Some(_), true) => {
                    let entity = entities
                        .resolve(lot.handle)
                        .ok_or(ExecutionError::Invariant)?;
                    let item = entity.item.as_ref().ok_or(ExecutionError::Invariant)?;
                    // When a whole child leaves, its old load includes all of
                    // its earlier descendants, including any separately promoted.
                    Some(
                        definitions
                            .packing_load_for(&item.definition_pin)
                            .and_then(|load| load.checked_mul(item.quantity))
                            .and_then(|load| {
                                load.checked_add(
                                    entity.container.as_ref().map_or(0, |bag| bag.load),
                                )
                            })
                            .ok_or(ExecutionError::Invariant)?,
                    )
                }
                (Some(_), false) => lot.packing_removed,
                (None, _) => None,
            };
            if let (Some(parent), Some(delta)) = (lot.parent, delta) {
                let removed = lots[parent].packing_removed.get_or_insert(0);
                *removed = removed
                    .checked_add(delta)
                    .ok_or(ExecutionError::Invariant)?;
            }
            lots[index].promote = promote;
            roots_changed |= promote;
        }

        let summary_bytes = totals
            .keys()
            .try_fold(0_usize, |bytes, id| {
                let name = &definitions.items.get(*id)?.named.name;
                bytes.checked_add(size_of::<DeathPossessions>() + name.storage_bytes())
            })
            .ok_or(ExecutionError::Capacity)?;
        let summary = budget.reserve(summary_bytes)?;
        let mut retained = Vec::with_capacity(retained_count);
        let mut left = Vec::with_capacity(totals.len() - retained_count);
        for (&id, &(quantity, keep)) in &totals {
            let name = definitions
                .items
                .get(id)
                .ok_or(ExecutionError::Invariant)?
                .named
                .name
                .clone();
            let target = if keep { &mut retained } else { &mut left };
            target.push(DeathPossessions { name, quantity });
        }

        let mut corpse_changed = false;
        for lot in lots.iter().rev() {
            if let Some(removed) = lot.packing_removed {
                self.publish_packing(lot.handle, PackingChange::Remove(removed), false)?;
            }
            let entities = &self.state.physical.entities;
            let entity = entities
                .resolve(lot.handle)
                .ok_or(ExecutionError::Invariant)?;
            let equipment = match entity.placement.as_ref() {
                Some(Placement::Attached { revision, .. }) => Some(EquipmentRequest::Unequip {
                    item_revision: entity
                        .item
                        .as_ref()
                        .ok_or(ExecutionError::Invariant)?
                        .revision,
                    placement_revision: *revision,
                }),
                _ => None,
            };
            if equipment.is_none() && !lot.promote {
                continue;
            }
            let parent = match lot.parent {
                Some(index) => entities
                    .resolve(lots[index].handle)
                    .ok_or(ExecutionError::Invariant)?
                    .id
                    .as_str(),
                None => actor,
            };
            let _move_workspace = budget.reserve(entity.id.len() + parent.len())?;
            let (item, parent) = (entity.id.clone(), parent.to_owned());
            if let Some(request) = equipment
                && !matches!(
                    self.change_equipment(actor, &item, request)?,
                    EquipmentDecision::Applied { .. }
                )
            {
                return Err(ExecutionError::Invariant);
            }
            if lot.promote {
                let keep = totals[lot.type_index].1;
                let destination = if keep { actor } else { corpse };
                self.relocate_contained_lot(&parent, destination, &item, false)?;
                corpse_changed |= !keep;
            }
        }
        if roots_changed {
            self.publish_packing(actor_handle, PackingChange::Add(0), false)?;
        }
        if corpse_changed {
            self.publish_packing(corpse_handle, PackingChange::Add(0), false)?;
        }
        Ok((retained, left, summary))
    }
}
