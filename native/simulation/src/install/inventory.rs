//! Exact closed inventory branch of the selected proof. Full physical import
//! has consumed every entity/item row; supported writers can create ordinary
//! remains, but cannot create held items, containers or resource claims.
use super::rows::take_collection;
use super::{InstallError, RowImport};
use crate::administration::ObjectMembership;
use crate::reception::{CarriedItem, ObservedPileItem};
use crate::records::OwnerCoverage;
use crate::state::{EntityStore, Placement};

pub(crate) struct ClosedInventory {
    resource_reservations: OwnerCoverage,
}
/// The empty slices are the result of a fully consumed closed family, rather
/// than substitutes for unknown item ownership. Revision always comes from the
/// actual object-membership owner; this capability keeps no second counter.
pub(crate) struct InventoryProjection<'a> {
    pub revision: u64,
    pub equipped: &'a [CarriedItem],
    pub pile: &'a [ObservedPileItem],
}
impl ClosedInventory {
    /// Complete installation consumed and rejected every positive reservation.
    /// Selected physical/command writers have no resource-claim creation path.
    pub(crate) fn work_allocation(&self) -> crate::values::WorkVector {
        crate::values::WorkVector::default()
    }
    pub(crate) fn project<'a>(&'a self, membership: &ObjectMembership) -> InventoryProjection<'a> {
        InventoryProjection {
            revision: membership.revision,
            equipped: &[],
            pile: &[],
        }
    }
    pub(crate) fn resource_reservations(&self) -> &OwnerCoverage {
        &self.resource_reservations
    }
}
pub(super) fn install_closed_inventory(
    import: &mut RowImport,
    present: bool,
    entities: &EntityStore,
) -> Result<ClosedInventory, InstallError> {
    // Keep this proof local to the inventory owner: widening physical support
    // later cannot accidentally turn a missing item implementation into empty.
    for id in entities.ordered_ids() {
        let entity = entities.get(id).ok_or(InstallError::CurrentFormat)?;
        if entity.item.is_some()
            || entity.container.is_some()
            || entity.declared_owner.is_some()
            || entity.inventory_revision.is_some()
            || !matches!(entity.placement, Some(Placement::World { .. }))
        {
            return Err(InstallError::UnsupportedFamily("live inventory"));
        }
    }
    let reservations = take_collection(
        import,
        "sim_resource_reservations",
        "[\"world\"]",
        present,
        true,
    )?;
    if !reservations.rows.is_empty() {
        return Err(InstallError::UnsupportedFamily("resourceReservations"));
    }
    Ok(ClosedInventory {
        resource_reservations: reservations.coverage,
    })
}
