//! Ordered equipment edits within the existing custody journal.

use super::*;
use crate::state::Individuality;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum EquipmentRequest {
    Equip,
    Unequip {
        item_revision: u64,
        placement_revision: u64,
    },
}

pub(crate) enum EquipmentDecision {
    Busy,
    Unavailable,
    Changed,
    Applied {
        stowed: Vec<EntityHandle>,
        _custody: ByteReservation,
    },
}

struct Attachment<'a> {
    child: EntityHandle,
    lot: &'a ItemLot,
    revision: u64,
    attached: bool,
    placement: &'a Placement,
    ports: &'a [String],
}

impl Attachment<'_> {
    fn fits(&self, actor: &Entity) -> bool {
        actor
            .actor
            .as_ref()
            .and_then(|actor| actor.body.as_ref())
            .is_some_and(|body| {
                self.ports
                    .iter()
                    .all(|port| body.equipment_ports.iter().any(|p| p.id == *port))
            })
    }
}

pub(crate) fn equipment_fits(
    state: &crate::simulation::SimulationState,
    actor: &Entity,
    item: &Entity,
) -> bool {
    owned_attachment(state, &actor.id, item).is_some_and(|selected| selected.fits(actor))
}

fn owned_attachment<'a>(
    state: &'a crate::simulation::SimulationState,
    actor_id: &str,
    item: &'a Entity,
) -> Option<Attachment<'a>> {
    let lot = item.item.as_ref()?;
    let placement = item.placement.as_ref()?;
    let (owner, revision, attached) = match placement {
        Placement::Contained {
            parent_entity_id,
            revision,
        } => (parent_entity_id, *revision, false),
        Placement::Attached {
            parent_entity_id,
            revision,
            ..
        } => (parent_entity_id, *revision, true),
        Placement::World { .. } => return None,
    };
    let definition = state.installed.retained.items.get(&lot.definition_pin.id)?;
    if owner != actor_id || lot.quantity != 1 || lot.assembly_claim.is_some() {
        return None;
    }
    Some(Attachment {
        child: state.physical.entities.handle(&item.id)?,
        lot,
        revision,
        attached,
        placement,
        ports: definition.equipment_ports()?,
    })
}

impl CoreMutation<'_> {
    /// Admit one direct item and the exact currently attached conflicts. These
    /// handles never leave the command's physical cut. General lot splitting
    /// and nested custody moves require their item-transfer owners.
    pub(crate) fn change_equipment(
        &mut self,
        actor_id: &str,
        item_id: &str,
        request: EquipmentRequest,
    ) -> Result<EquipmentDecision, ExecutionError> {
        let state = &self.state;
        let entities = &state.physical.entities;
        let Some(parent) = entities.handle(actor_id) else {
            return Ok(EquipmentDecision::Unavailable);
        };
        let parent_entity = entities.resolve(parent).ok_or(ExecutionError::Invariant)?;
        let actor = parent_entity
            .actor
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        if actor.action.is_some() {
            return Ok(EquipmentDecision::Busy);
        }
        let selected = entities
            .get(item_id)
            .and_then(|item| owned_attachment(state, actor_id, item));
        let (Some(selected), prior_contents, prior_membership) = (
            selected,
            parent_entity.inventory_revision,
            state.administration.object_membership.revision,
        ) else {
            return Ok(EquipmentDecision::Unavailable);
        };
        let equipping = request == EquipmentRequest::Equip;
        if let EquipmentRequest::Unequip {
            item_revision,
            placement_revision,
        } = request
            && (!selected.attached
                || item_revision != selected.lot.revision
                || placement_revision != selected.revision)
        {
            return Ok(EquipmentDecision::Changed);
        }
        if !selected.fits(parent_entity) {
            return Ok(EquipmentDecision::Unavailable);
        }
        // The inventory installer admits no active resource holds. When a
        // family starts owning holds, it must update this shared admission too.
        let conflicts = state
            .inventory
            .children(entities, actor_id, true)
            .filter_map(|item| {
                let other = owned_attachment(state, actor_id, item)?;
                (equipping
                    && other.child != selected.child
                    && crate::install::equipment_ports_conflict(other.ports, selected.ports))
                .then_some(other)
            });
        let budget = self.journal.physical.budget.clone();
        let count = 1 + state.inventory.attachment_count(actor_id);
        let mut workspace = budget.reserve(
            count
                .checked_mul(
                    size_of::<EntityHandle>()
                        + size_of::<(EntityHandle, Placement, bool, Option<(u64, Individuality)>)>(
                        ),
                )
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let selected_handle = selected.child;
        let next_contents = next_revision(prior_contents.unwrap_or(0))?;
        let next_membership = next_revision(prior_membership)?;
        let port = selected.ports.first().ok_or(ExecutionError::Invariant)?;
        self.journal.physical.reserve(
            count
                .checked_mul(size_of::<InventoryUndo>() + actor_id.len())
                .and_then(|bytes| bytes.checked_add(port.len() + selected.placement.heap_bytes()?))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut changes = Vec::with_capacity(count);
        let mut stowed = Vec::with_capacity(count - 1);
        for conflict in conflicts {
            self.journal.physical.reserve(
                conflict
                    .placement
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            changes.push((
                conflict.child,
                Placement::Contained {
                    parent_entity_id: actor_id.into(),
                    revision: next_revision(conflict.revision)?,
                },
                true,
                None,
            ));
            stowed.push(conflict.child);
        }
        let revision = next_revision(selected.revision)?;
        let needs_slot = equipping && !selected.attached && stowed.is_empty();
        let (placement, item) = if equipping {
            (
                Placement::Attached {
                    parent_entity_id: actor_id.into(),
                    port_id: port.to_owned(),
                    revision,
                    slot: None,
                    local: None,
                },
                Some((
                    next_revision(selected.lot.revision)?,
                    selected.lot.individuality,
                )),
            )
        } else {
            (
                Placement::Contained {
                    parent_entity_id: actor_id.into(),
                    revision,
                },
                None,
            )
        };
        changes.push((
            selected_handle,
            placement,
            selected.attached != equipping,
            item,
        ));
        if needs_slot {
            self.state.inventory.reserve_attachment(actor_id, &budget)?;
        }
        for (child, placement, toggled, item) in changes {
            let entities = &mut self.state.physical.entities;
            if toggled {
                self.state.inventory.set_attachment(
                    entities,
                    actor_id,
                    child,
                    matches!(placement, Placement::Attached { .. }),
                )?;
            }
            let entity = entities
                .resolve_mut(child)
                .ok_or(ExecutionError::Invariant)?;
            let placement = entity
                .placement
                .replace(placement)
                .ok_or(ExecutionError::Invariant)?;
            let item = item.map(|(next_revision, before_kind)| {
                let lot = entity.item.as_mut().expect("binding holds the current lot");
                let prior_revision = std::mem::replace(&mut lot.revision, next_revision);
                lot.individuality = Individuality::Individual;
                (prior_revision, before_kind)
            });
            self.journal
                .physical
                .undo
                .push(Undo::Inventory(Box::new(InventoryUndo {
                    parent,
                    previous_contents: prior_contents,
                    previous_membership: prior_membership,
                    child,
                    edit: ItemEdit::Equipment {
                        placement,
                        item,
                        toggled,
                    },
                    lineage: None,
                    prior_lineage_presence: false,
                })));
            entities.settle_operational_memory(
                child,
                &mut self.journal.physical.reservation,
                false,
            )?;
        }
        self.state
            .physical
            .entities
            .resolve_mut(parent)
            .ok_or(ExecutionError::Invariant)?
            .inventory_revision = Some(next_contents);
        self.state.administration.object_membership.revision = next_membership;
        workspace.resize(stowed.capacity() * size_of::<EntityHandle>())?;
        Ok(EquipmentDecision::Applied {
            stowed,
            _custody: workspace,
        })
    }
}
