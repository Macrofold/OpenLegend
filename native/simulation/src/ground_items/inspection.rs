//! An inspected world pile retains only the actor's bounded accepted page.
//! Contents still belong to the physical inventory index and the current
//! disclosure caller must supply the same observed contact.
use crate::encoding::{js_string_cmp, json_record, sha256_hex};
use crate::execution::ExecutionError;
use crate::host::{ByteBudget, ByteReservation, retained_size::HeapBytes};
use crate::simulation::SimulationState;
use crate::state::{Entity, EntityHandle, InventoryInspection, Named, Placement};
use crate::text::JsText;

pub(crate) mod owned;

pub(crate) const PAGE_ITEMS: usize = 16;
pub(crate) const PAGE_DESCRIPTION_BYTES: usize = 8_000;

pub(crate) struct WorldStorage<'a> {
    pub actor: &'a Entity,
    pub root: &'a Entity,
    actor_placement_revision: u64,
    pub placement_revision: u64,
    pub geometry_revision: u64,
    state: &'a SimulationState,
}

impl<'a> WorldStorage<'a> {
    /// This binds the actual physical root. The caller supplies the current
    /// observed contact and checks the interaction ray before inspecting.
    pub(crate) fn selected(state: &'a SimulationState, actor: &str, root: &str) -> Option<Self> {
        let actor = state.physical.entities.get(actor)?;
        let root = state.physical.entities.get(root)?;
        if actor.actor.is_none()
            || !actor.actively_participates()
            || actor.world_support().is_none()
            || root.retirement.is_some()
            || !super::is_item_pile(&state.installed.observation_rules.value().pile_kind, root)
        {
            return None;
        }
        let Some(Placement::World {
            revision: actor_revision,
            ..
        }) = actor.placement.as_ref()
        else {
            return None;
        };
        let Some(Placement::World { revision, .. }) = root.placement.as_ref() else {
            return None;
        };
        root.world_support()?;
        Some(Self {
            actor,
            root,
            actor_placement_revision: *actor_revision,
            placement_revision: *revision,
            geometry_revision: state.installed.geometry.spatial.revision,
            state,
        })
    }

    pub(crate) fn scope(
        &self,
        budget: &ByteBudget,
    ) -> Result<(JsText, ByteReservation), ExecutionError> {
        let actor_place = self
            .actor
            .world_support()
            .ok_or(ExecutionError::Invariant)?;
        let root_place = self.root.world_support().ok_or(ExecutionError::Invariant)?;
        let values = (
            self.state.generation.as_str(),
            self.actor.id.as_str(),
            self.actor.physical_life(),
            self.actor_placement_revision,
            actor_place,
            self.root.id.as_str(),
            root_place,
            self.placement_revision,
            self.geometry_revision,
            self.state
                .experience
                .actor(&self.actor.id)
                .map_or(0, |value| value.privacy.revision()),
        );
        let custody = budget.reserve(
            1_024
                + 6 * (self.state.generation.len()
                    + self.actor.id.len()
                    + self.root.id.len()
                    + actor_place.1.len()
                    + root_place.1.len()),
        )?;
        let value = json_record(&values).map_err(|_| ExecutionError::Invariant)?;
        Ok((sha256_hex(value.as_bytes()).into(), custody))
    }

    pub(crate) fn reach(
        &self,
        budget: &ByteBudget,
    ) -> Result<Option<crate::geometry::SightRay>, ExecutionError> {
        crate::geometry::interaction_reach(
            self.actor,
            self.root,
            self.state.installed.retained.item_handling_read.reach,
            budget,
        )
    }

    pub(crate) fn approach(
        &self,
        budget: &ByteBudget,
    ) -> Result<(crate::geometry::RouteQuery, ByteReservation), ExecutionError> {
        crate::native_controller::feeding::approach(
            self.actor,
            self.root,
            self.state.installed.retained.item_handling_read.reach,
            budget,
        )
    }

    pub(crate) fn revision(&self) -> u64 {
        self.root.inventory_revision.unwrap_or_default()
    }

    pub(crate) fn inspection(
        &self,
        budget: &ByteBudget,
    ) -> Result<Option<&'a InventoryInspection>, ExecutionError> {
        let Some(inspection) = self
            .actor
            .actor
            .as_ref()
            .and_then(|actor| actor.inventory_inspection.as_ref())
        else {
            return Ok(None);
        };
        if inspection.container_id.as_deref() != Some(self.root.id.as_str())
            || inspection.revision != self.revision()
        {
            return Ok(None);
        }
        let (scope, _custody) = self.scope(budget)?;
        Ok((inspection.scope == scope).then_some(inspection))
    }

    /// Seek an exact current child in the existing native order. A missing
    /// continuation is a refusal even when the requested name also exists.
    pub(crate) fn children_after(&self, after: Option<&str>) -> Option<&'a [EntityHandle]> {
        let entities = &self.state.physical.entities;
        let children = self.state.inventory.direct_items(&self.root.id);
        let start = match after {
            Some(id) => {
                children
                    .binary_search_by(|handle| {
                        js_string_cmp(entities.resolve(*handle).map_or("", |item| &item.id), id)
                    })
                    .ok()?
                    + 1
            }
            None => 0,
        };
        children.get(start..)
    }

    pub(crate) fn prepare(
        &self,
        name: &Named,
        budget: &ByteBudget,
    ) -> Result<(InventoryInspection, ByteReservation), ExecutionError> {
        let (scope, _workspace) = self.scope(budget)?;
        let size = name
            .heap_bytes()
            .and_then(|name| name.checked_add(scope.storage_bytes()))
            .and_then(|bytes| bytes.checked_add(4_096 + self.root.id.len()))
            .ok_or(ExecutionError::Capacity)?;
        let custody = budget.reserve(size)?;
        Ok((
            InventoryInspection {
                revision: self.revision(),
                scope,
                container_id: Some(self.root.id.clone()),
                container_name: name.clone(),
                after: String::new(),
                more: false,
                item_ids: Vec::with_capacity(PAGE_ITEMS),
                item_names: Vec::with_capacity(PAGE_ITEMS),
                evidence_ids: Vec::with_capacity(PAGE_ITEMS + 1),
            },
            custody,
        ))
    }
}
