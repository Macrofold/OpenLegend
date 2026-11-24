//! Current direct ground stock for ordinary physical pickup. The caller owns
//! the viewing/contact witness. These reads grant neither sight nor custody.
pub(crate) mod inspection;

use crate::install::ItemDefinitionRead;
use crate::simulation::SimulationState;
use crate::state::{Entity, ItemLot, Placement};

pub(crate) struct GroundLot<'a> {
    pub entity: &'a Entity,
    pub lot: &'a ItemLot,
    pub definition: &'a ItemDefinitionRead,
}

pub(crate) fn pickup_pile<'a>(
    state: &'a SimulationState,
    actor: &Entity,
    target: &str,
) -> Option<&'a Entity> {
    let pile = state.physical.entities.get(target)?;
    (state
        .installed
        .retained
        .item_handling_read
        .can_handle(&actor.spatial.body.id)
        && (is_item_pile(&state.installed.observation_rules.value().pile_kind, pile)
            || is_remains_root(pile)))
    .then_some(pile)
}

/// A dead body's ground stock can be reached through an observed contact.
/// The body itself stays with the remains and is never retired by pickup.
pub(crate) fn is_remains_root(entity: &Entity) -> bool {
    entity.remains.is_some()
        && entity.actor.as_ref().is_some_and(|body| !body.alive)
        && entity.physical_root()
}

/// The finite root shared by pickup, placement and the current row writer.
pub(crate) fn is_item_pile(kind: &str, pile: &Entity) -> bool {
    pile.kind == kind
        && pile.actor.is_none()
        && pile.container.is_none()
        // This selected owner can retire a bare pile. Other physical members
        // keep their own histories and require their respective removal owners.
        && pile.item.is_none()
        && pile.remains.is_none()
        && pile.declared_owner.is_none()
        && pile.heat.is_none()
        && pile.resource.is_none()
        && pile.practice_target.is_none()
        && pile.threat.is_none()
        && pile.assembly.is_none()
        && pile.attributes.is_none()
        && pile.status_effects.is_none()
        && pile.mechanism_fields.is_none()
        && pile.world_position().is_some()
}

fn portable_lot<'a>(
    state: &'a SimulationState,
    pile: &Entity,
    entity: &'a Entity,
) -> Option<GroundLot<'a>> {
    let lot = entity.item.as_ref()?;
    let definition = state.installed.retained.items.get(&lot.definition_pin.id)?;
    let direct = match &entity.placement {
        Some(Placement::Contained {
            parent_entity_id, ..
        }) => parent_entity_id == &pile.id,
        Some(Placement::Attached {
            parent_entity_id, ..
        }) => parent_entity_id == &pile.id && is_remains_root(pile),
        _ => false,
    };
    (definition.portable && lot.quantity > 0 && entity.retirement.is_none() && direct)
    .then_some(GroundLot {
        entity,
        lot,
        definition,
    })
}

impl GroundLot<'_> {
    pub(crate) fn admits_quantity(&self, amount: Option<u64>) -> bool {
        self.lot.assembly_claim.is_none()
            && amount.is_none_or(|amount| {
                amount == self.lot.quantity
                    || (amount > 0
                        && amount < self.lot.quantity
                        && crate::execution::partitionable_stock(self.entity, self.definition))
            })
    }

    pub(crate) fn partial_limit(&self) -> Option<u64> {
        (self.lot.quantity > 1
            && crate::execution::partitionable_stock(self.entity, self.definition))
        .then_some(self.lot.quantity)
    }
}

/// Execution binds the selected item's exact identity without enumerating
/// the pile. The relationship is rechecked against the current placement.
pub(crate) fn pickup_lot<'a>(
    state: &'a SimulationState,
    pile: &Entity,
    item: &str,
) -> Option<GroundLot<'a>> {
    let entity = state.physical.entities.get(item)?;
    portable_lot(state, pile, entity).filter(|item| item.lot.assembly_claim.is_none())
}

/// Read direct portable members in custody order. Holds and assembly claims
/// can block the whole transfer; they may not hide a member from selection.
pub(crate) fn pickup_contents<'a>(
    state: &'a SimulationState,
    pile: &'a Entity,
) -> impl Iterator<Item = GroundLot<'a>> {
    state
        .inventory
        .children(&state.physical.entities, &pile.id, false)
        .filter_map(|entity| portable_lot(state, pile, entity))
}

pub(crate) fn can_pick_up(
    state: &SimulationState,
    pile: &Entity,
    item: Option<&str>,
    quantity: Option<u64>,
) -> bool {
    match item {
        Some(item) => {
            pickup_lot(state, pile, item).is_some_and(|lot| lot.admits_quantity(quantity))
        }
        None => quantity.is_none() && pickup_contents(state, pile).next().is_some(),
    }
}
