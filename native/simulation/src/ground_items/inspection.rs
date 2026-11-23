//! Inspected world storage retains only the actor's bounded accepted page.
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

#[derive(Clone, Copy)]
pub(crate) struct WorldStorage<'a> {
    pub actor: &'a Entity,
    pub root: &'a Entity,
    pub container: &'a Entity,
    actor_placement_revision: u64,
    pub placement_revision: u64,
    pub geometry_revision: u64,
    state: &'a SimulationState,
}

impl<'a> WorldStorage<'a> {
    /// Select one container and its physical root, checking each bag's access.
    /// The caller separately supplies the received reference and checks reach.
    pub(crate) fn selected(state: &'a SimulationState, actor: &str, id: &str) -> Option<Self> {
        let actor = state.physical.entities.get(actor)?;
        let container = state.physical.entities.get(id)?;
        if actor.actor.is_none()
            || !actor.actively_participates()
            || actor.world_support().is_none()
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
        let mut root = container;
        for _ in 0..crate::install::inventory_ancestor_limit() {
            if root.retirement.is_some() {
                return None;
            }
            if let Some(Placement::World { revision, .. }) = root.placement.as_ref() {
                // Only actual remains open another actor's inventory here. The
                // observed contact and physical reach still bind that access.
                if root.actor.as_ref().is_some_and(|body| {
                    body.alive
                        || !root
                            .remains
                            .as_ref()
                            .is_some_and(|remains| remains.phase != "removed")
                }) {
                    return None;
                }
                let permitted = if root.container.is_some() {
                    crate::install::inventory_bag_access(root, &actor.id)
                } else {
                    root.actor.is_some()
                        || super::is_item_pile(
                            &state.installed.observation_rules.value().pile_kind,
                            root,
                        )
                };
                if !permitted {
                    return None;
                }
                root.world_support()?;
                return Some(Self {
                    actor,
                    root,
                    container,
                    actor_placement_revision: *actor_revision,
                    placement_revision: *revision,
                    geometry_revision: state.installed.geometry.spatial.revision,
                    state,
                });
            }
            if !crate::install::inventory_bag_access(root, &actor.id) {
                return None;
            }
            root = state
                .physical
                .entities
                .get(crate::install::inventory_parent(root)?)?;
        }
        None
    }

    pub(crate) fn ancestry(&self) -> impl Iterator<Item = &'a Entity> + '_ {
        std::iter::successors(Some(self.container), |current| {
            crate::install::inventory_parent(current)
                .and_then(|id| self.state.physical.entities.get(id))
        })
    }

    pub(crate) fn inspected_selection(state: &'a SimulationState, actor: &str) -> Option<Self> {
        state
            .physical
            .entities
            .get(actor)
            .and_then(|entity| entity.actor.as_ref())
            .and_then(|body| body.inventory_inspection.as_ref())
            .and_then(|page| page.container_id.as_deref())
            .and_then(|container| Self::selected(state, actor, container))
    }

    /// Raw item identities identify only the current page, its enclosing path,
    /// or a child disclosed on it. A guessed ID never opens a world bag.
    pub(crate) fn disclosed(
        state: &'a SimulationState,
        actor: &str,
        id: &str,
        require_page: bool,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, ExecutionError> {
        let Some(prior) = Self::inspected_selection(state, actor) else {
            return Ok(None);
        };
        // The physical root keeps its opaque current body reference.
        if id == prior.root.id || (require_page && id != prior.container.id) {
            return Ok(None);
        }
        let Some(page) = prior.inspection(budget)? else {
            return Ok(None);
        };
        if id == prior.container.id {
            return Ok(Some(prior));
        }
        if prior.ancestry().any(|container| container.id == id) {
            return Ok(Self::selected(state, actor, id));
        }
        if !page.item_ids.iter().any(|known| known == id) {
            return Ok(None);
        }
        Ok(Self::selected(state, actor, id).filter(|child| {
            crate::install::inventory_parent(child.container) == Some(prior.container.id.as_str())
        }))
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
        let (depth, name_bytes) = self
            .ancestry()
            .try_fold((0_usize, 0_usize), |(depth, bytes), container| {
                let bytes = bytes.checked_add(container.id.len())?.checked_add(
                    container.container.as_ref().map_or(0, |bag| {
                        bag.definition_pin.id.len() + bag.definition_pin.digest.len()
                    }),
                )?;
                Some((depth + 1, bytes))
            })
            .ok_or(ExecutionError::Capacity)?;
        let mut custody = budget.reserve(
            2_048
                + 6 * (self.state.generation.len()
                    + self.actor.id.len()
                    + actor_place.1.len()
                    + root_place.1.len()
                    + name_bytes)
                + 512 * depth,
        )?;
        let mut ancestry = Vec::with_capacity(depth);
        ancestry.extend(self.ancestry().map(|container| {
            let placement = container.placement.as_ref().map_or(0, |place| match place {
                Placement::World { revision, .. }
                | Placement::Contained { revision, .. }
                | Placement::Attached { revision, .. } => *revision,
            });
            (
                &container.id,
                container.inventory_revision.unwrap_or_default(),
                placement,
                container.item.as_ref().map(|item| item.revision),
                container.container.as_ref().map(|bag| {
                    (
                        &bag.definition_pin,
                        bag.subtree_revision,
                        bag.access.is_some(),
                    )
                }),
            )
        }));
        let values = (
            self.state.generation.as_str(),
            self.actor.id.as_str(),
            self.actor.physical_life(),
            self.actor_placement_revision,
            actor_place,
            self.root.physical_life(),
            root_place,
            self.placement_revision,
            self.geometry_revision,
            self.state
                .experience
                .actor(&self.actor.id)
                .map_or(0, |value| value.privacy.revision()),
            &ancestry,
        );
        let value = json_record(&values).map_err(|_| ExecutionError::Invariant)?;
        let scope: JsText = sha256_hex(value.as_bytes()).into();
        drop(value);
        drop(ancestry);
        custody.resize(scope.storage_bytes())?;
        Ok((scope, custody))
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
        self.container.inventory_revision.unwrap_or_default()
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
        if inspection.container_id.as_deref() != Some(self.container.id.as_str())
            || inspection.revision != self.revision()
        {
            return Ok(None);
        }
        let (scope, _custody) = self.scope(budget)?;
        Ok((inspection.scope == scope).then_some(inspection))
    }

    /// Preserve the name acquired when explicitly selecting this bag.
    /// Callers already hold its current page or the exact prior parent page.
    pub(crate) fn disclosed_name(&self) -> Option<&'a Named> {
        if self.container.id == self.root.id {
            return None;
        }
        let prior = self.actor.actor.as_ref()?.inventory_inspection.as_ref()?;
        if prior.container_id.as_deref() == Some(self.container.id.as_str()) {
            return Some(&prior.container_name);
        }
        let index = prior
            .item_ids
            .iter()
            .position(|id| id == &self.container.id)?;
        prior.item_names.get(index)
    }

    /// Seek an exact current child in the existing native order. A missing
    /// continuation is a refusal even when the requested name also exists.
    pub(crate) fn children_after(&self, after: Option<&str>) -> Option<&'a [EntityHandle]> {
        let entities = &self.state.physical.entities;
        let children = self.state.inventory.direct_items(&self.container.id);
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
            .and_then(|bytes| bytes.checked_add(4_096 + self.container.id.len()))
            .ok_or(ExecutionError::Capacity)?;
        let custody = budget.reserve(size)?;
        Ok((
            InventoryInspection {
                revision: self.revision(),
                scope,
                container_id: Some(self.container.id.clone()),
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
