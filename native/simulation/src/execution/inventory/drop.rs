//! Move carried lots into a nearby supported pile under the existing physical
//! journal. Bags move with their contents and keep their private inner records.
use super::packing::PackingChange;
use super::*;
use crate::simulation::SimulationState;
use crate::state::{Action, EntitySpatial, SurfacePoint};
use crate::work::WorkUnit;

/// Check the selected lot and its current ancestor access. The caller owns
/// actor eligibility and the standing query; no inventory children are copied.
pub(crate) fn drop_item_problem<'a>(
    state: &'a SimulationState,
    actor: &Entity,
    item: &str,
    quantity: u64,
    mut visit: impl FnMut() -> Result<(), ExecutionError>,
) -> Result<Option<&'a str>, ExecutionError> {
    let physical = &state.physical;
    let definitions = &state.installed.retained;
    let handling = &definitions.item_handling_read;
    let copy = &handling.drop;
    if !handling.can_handle(&actor.spatial.body.id) {
        return Ok(Some(&copy.unavailable));
    }
    let Some(owned) = crate::install::owned_by(physical, definitions, &actor.id, item)? else {
        return Ok(Some(&copy.unavailable));
    };
    let entity = physical
        .entities
        .get(item)
        .ok_or(ExecutionError::Invariant)?;
    let lot = entity.item.as_ref().ok_or(ExecutionError::Invariant)?;
    let definition = definitions
        .items
        .get(owned.definition_id)
        .ok_or(ExecutionError::Invariant)?;
    if !definition.portable || lot.assembly_claim.is_some() {
        return Ok(Some(&copy.unavailable));
    }
    if quantity == 0
        || quantity > lot.quantity
        || (quantity != lot.quantity
            && (!partitionable_stock(entity, definition)
                || lot.material_contribution_ids.is_some()))
    {
        return Ok(Some(&copy.quantity));
    }
    if actor.world_support().is_none() {
        return Ok(Some(&copy.support));
    }
    let action = actor.actor.as_ref().and_then(|body| body.action.as_ref());
    // Without a current action or a held lot, no descendant can prevent
    // dropping this bag. Keep the same exact check for active work.
    if (action.is_some() || !physical.holds.is_empty())
        && inventory_work_bound(state, action, entity, &mut visit)?
    {
        return Ok(Some(&copy.needed));
    }
    Ok(None)
}

pub(crate) fn inventory_work_bound(
    state: &SimulationState,
    action: Option<&Action>,
    item: &Entity,
    visit: &mut impl FnMut() -> Result<(), ExecutionError>,
) -> Result<bool, ExecutionError> {
    visit()?;
    let id = item.id.as_str();
    if state.physical.holds.quantity(id) > 0
        || action.is_some_and(|action| {
            action.item_id.as_deref() == Some(id)
                || action.target_id.as_deref() == Some(id)
                || action.heat_id.as_deref() == Some(id)
                || action
                    .food_preparation
                    .as_ref()
                    .is_some_and(|meal| meal.inputs.values().any(|item| item == id))
        })
    {
        return Ok(true);
    }
    for child in state
        .inventory
        .children(&state.physical.entities, id, false)
    {
        if inventory_work_bound(state, action, child, visit)? {
            return Ok(true);
        }
    }
    Ok(false)
}

impl CoreMutation<'_> {
    pub(crate) fn check_drop_item(
        &mut self,
        actor: &str,
        item: &str,
        quantity: u64,
    ) -> Result<Option<&str>, ExecutionError> {
        let body = self
            .state
            .physical
            .entities
            .get(actor)
            .ok_or(ExecutionError::MissingActor)?;
        let meters = &mut self.journal.meters;
        drop_item_problem(self.state, body, item, quantity, || {
            meters.charge(&[(WorkUnit::Candidates, 1)])?;
            Ok(())
        })
    }

    /// Find the first matching root in canonical order using the physical
    /// neighbour index. A different support is a different pile.
    pub(crate) fn prepare_drop_pile(
        &mut self,
        site: &SurfacePoint,
    ) -> Result<String, ExecutionError> {
        let policy = &self.state.installed.retained.item_handling_read;
        let kind = &self.state.installed.observation_rules.value().pile_kind;
        let physical = &self.state.physical;
        let position = Point {
            x: site.x,
            y: site.y,
            z: site.z,
        };
        let distance = policy.drop.same_pile_distance;
        let (count, _) = physical.bodies.candidate_capacity(position, distance);
        let _search = self.journal.budget.reserve(
            count
                .checked_mul(4 * size_of::<(&str, EntityHandle)>())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        for (id, handle) in physical.bodies.candidates(position, distance) {
            let entity = physical
                .entities
                .resolve(handle)
                .ok_or(ExecutionError::Invariant)?;
            if crate::ground_items::is_item_pile(kind, entity)
                && entity.world_support().is_some_and(|(point, support)| {
                    support == site.surface_id
                        && (point.x - site.x)
                            .hypot(point.y - site.y)
                            .hypot(point.z - site.z)
                            < distance
                })
            {
                return Ok(id.to_owned());
            }
        }
        let _prepared = self.journal.budget.reserve(
            heap_sum([
                size_of::<Entity>(),
                policy.object_body.id.len(),
                policy.drop.pile_name.storage_bytes(),
                kind.len(),
                site.surface_id.len(),
                128,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let state = &mut self.state.physical;
        let id = state
            .identity
            .allocate_entity("pile", |id| state.entities.get(id).is_some())?
            .id;
        let entity = Entity {
            id: id.clone(),
            name: policy.drop.pile_name.clone(),
            description: None,
            name_form: Some("plural".into()),
            indefinite_article: None,
            kind: kind.clone(),
            spatial: EntitySpatial {
                body: policy.object_body.clone(),
                heading: 0.0,
                inactive_body: None,
                soft_footprint: None,
                local_pose: None,
                local_avoidance_ready_at: None,
                flight: None,
                fall_velocity: None,
            },
            placement: Some(Placement::World {
                position,
                support_surface_id: Some(site.surface_id.clone()),
                revision: 0,
                motion_continuity_revision: None,
            }),
            actor: None,
            item: None,
            container: None,
            animal: None,
            remains: None,
            resource: None,
            replenisher: None,
            attributes: None,
            heat: None,
            inventory_revision: None,
            declared_owner: None,
            retirement: None,
            sensory_progress: None,
            icon: None,
            status_effects: None,
            mechanism_fields: None,
            appearance: None,
            threat: None,
            assembly: None,
            hearth: None,
            practice_target: None,
        };
        self.physical().insert_entity(entity, true)?;
        Ok(id)
    }

    pub(crate) fn drop_checked_lot(
        &mut self,
        actor: &str,
        item: &str,
        quantity: u64,
        pile: &str,
    ) -> Result<(), ExecutionError> {
        let installed = self.state.installed.clone();
        let entities = &self.state.physical.entities;
        let entity = entities.get(item).ok_or(ExecutionError::Invariant)?;
        let lot = entity.item.as_ref().ok_or(ExecutionError::Invariant)?;
        let definition = installed
            .retained
            .items
            .get(&lot.definition_pin.id)
            .ok_or(ExecutionError::Invariant)?;
        let source = crate::install::inventory_parent(entity).ok_or(ExecutionError::Invariant)?;
        let before = lot.quantity;
        let packed = if source == actor {
            0
        } else {
            installed
                .retained
                .packing_load_for(&lot.definition_pin)
                .and_then(|load| load.checked_mul(quantity))
                .and_then(|load| {
                    load.checked_add(entity.container.as_ref().map_or(0, |bag| bag.load))
                })
                .ok_or(ExecutionError::Invariant)?
        };
        let merge = partitionable_stock(entity, definition)
            .then(|| {
                self.state
                    .inventory
                    .children(entities, pile, false)
                    .find(|target| {
                        compatible_lots(entity, target, definition)
                            && self.state.physical.holds.quantity(&target.id) == 0
                    })
            })
            .flatten();
        if merge
            .and_then(|target| target.item.as_ref())
            .is_some_and(|target| target.quantity > MAX_SAFE_INTEGER - quantity)
        {
            return Err(ExecutionError::Identity);
        }
        let _work = self
            .journal
            .budget
            .reserve(source.len() + item.len() + merge.map_or(0, |target| target.id.len()) + 64)?;
        let source = source.to_owned();
        let merge = merge.map(|target| target.id.clone());
        let moved = if quantity < before {
            let moved = self.create_direct_stock(pile, definition, quantity, Some(item))?;
            self.transfer_activity_sources(item, &moved, before, quantity)?;
            self.debit_inventory_lot(
                &source,
                item,
                quantity,
                LotDebit {
                    cause: "drop",
                    custodian: None,
                    target: Some((LineageKind::Split, &moved)),
                },
            )?;
            moved
        } else {
            self.move_contained_lot(&source, pile, item)?;
            item.to_owned()
        };
        if source != actor {
            self.remove_from_packing_chain(&source, packed)?;
        }
        if let Some(kept) = merge {
            self.transfer_activity_sources(&moved, &kept, quantity, quantity)?;
            self.grow_direct_lot(pile, &kept, quantity, false)?;
            self.debit_inventory_lot(
                pile,
                &moved,
                quantity,
                LotDebit {
                    cause: "drop",
                    custodian: None,
                    target: Some((LineageKind::Merge, &kept)),
                },
            )?;
        }
        self.journal
            .physical
            .change(PhysicalChange::ObservationParameters {
                entity_id: pile.into(),
                request_detail: true,
            })
    }

    fn remove_from_packing_chain(&mut self, start: &str, load: u64) -> Result<(), ExecutionError> {
        let mut parent = self.state.physical.entities.handle(start);
        let mut first = true;
        while let Some(handle) = parent {
            let entities = &self.state.physical.entities;
            let entity = entities.resolve(handle).ok_or(ExecutionError::Invariant)?;
            parent = crate::install::inventory_parent(entity).and_then(|id| entities.handle(id));
            self.publish_packing(
                handle, PackingChange::Remove(load), first,
            )?;
            first = false;
        }
        Ok(())
    }
}
