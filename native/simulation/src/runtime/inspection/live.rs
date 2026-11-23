//! A bounded accepted-world read for the signed live inspection panel.
//! No cognition, account identity, path, or arbitrary entity serialization
//! crosses the callback. See docs/world-agent-inspection-and-edits.md.

use super::*;

mod activity;
use crate::{
    geometry::WalkableSurface,
    host::{ByteBudget, ByteReservation},
    install::{inventory_ancestor_limit, inventory_parent},
    simulation::SimulationState,
    state::{Entity, EntitySpatial, Heat, Placement, Remains, Resource},
    status::read_attribute,
    text::JsText,
    values::AttributeValue,
};
pub use activity::RuntimeLiveActivity;
use serde::Serialize;
use std::mem::size_of;

/// The existing inspectableEntity fields in their browser property order.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeLiveEntity<'a> {
    pub id: &'a str,
    pub name: &'a JsText,
    pub kind: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub placement: Option<&'a Placement>,
    pub spatial: &'a EntitySpatial,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resource: Option<&'a Resource>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub heat: Option<&'a Heat>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub remains: Option<&'a Remains>,
    pub attribute_ids: Vec<&'a str>,
    pub sense_ids: &'a [String],
    #[serde(skip_serializing_if = "Option::is_none")]
    pub action_id: Option<&'a str>,
    pub equipment: Vec<&'a str>,
    #[serde(skip)]
    _workspace: ByteReservation,
}

pub enum RuntimeLiveSupport<'a> {
    Surface(&'a WalkableSurface),
    Terrain(u64),
}

pub struct RuntimeLiveInspection<'a> {
    pub entity: RuntimeLiveEntity<'a>,
    pub support: Option<RuntimeLiveSupport<'a>>,
    pub definitions: RuntimeDefinitionCatalogue,
}

/// One accepted live read. Keep native custody and the application's current
/// disclosure grant for every directory row and selected fact used.
pub struct RuntimeLiveRead<'a> {
    pub progress: RuntimeProgress<'a>,
    state: &'a SimulationState,
    budget: &'a ByteBudget,
    actor: &'a str,
}

/// A subject already admitted for this accepted read. Its exact projection
/// is shared by directory versions and direct selection.
pub struct RuntimeLiveSelection<'a> {
    state: &'a SimulationState,
    budget: &'a ByteBudget,
    entity: &'a Entity,
}

impl NativeWorldSession {
    /// Lend a narrow accepted inspection scope, with a native publication
    /// lease spanning the callback. The signed application owns current
    /// Play and Inspect grants. This owner checks the exact saved binding.
    pub fn with_live_inspection<T>(
        &self,
        account: &str,
        owning_actor: &str,
        consume: impl FnOnce(RuntimeLiveRead<'_>) -> Result<T, RuntimeError>,
    ) -> Result<Option<T>, RuntimeError> {
        self.require_active()?;
        let progress = self.accepted_progress()?;
        let simulation = self.session.accepted().map_err(failure)?;
        if simulation
            .require_player_owner(account, owning_actor)
            .is_err()
        {
            return Ok(None);
        }
        let _lease = self.session.fence().begin_publication().map_err(failure)?;
        consume(RuntimeLiveRead {
            progress,
            state: &simulation.state,
            budget: &self.budget,
            actor: owning_actor,
        })
        .map(Some)
    }
}

impl<'a> RuntimeLiveRead<'a> {
    /// Upper bound for an on-demand directory's borrowed rows.
    pub fn entity_count(&self) -> usize {
        self.state.physical.entities.len()
    }

    /// Visit one row per permitted entity. A row holds only borrowed data.
    /// Do not format every body or keep this list beyond the accepted callback.
    pub fn directory(
        &self,
    ) -> impl Iterator<Item = Result<RuntimeLiveSelection<'a>, RuntimeError>> + '_ {
        self.state
            .physical
            .entities
            .ordered_ids()
            .filter_map(|id| self.select(id).transpose())
    }

    /// Use the same subject/custody boundary for bare selection and discovery.
    pub fn select(&self, subject: &str) -> Result<Option<RuntimeLiveSelection<'a>>, RuntimeError> {
        let entities = &self.state.physical.entities;
        let Some(entity) = entities.get(subject) else {
            return Ok(None);
        };
        let mut current: &Entity = entity;
        for depth in 0..=inventory_ancestor_limit() {
            if current.retirement.is_some()
                || current
                    .actor
                    .as_ref()
                    .is_some_and(|actor| actor.controller == "player" && current.id != self.actor)
            {
                return Ok(None);
            }
            let Some(parent) = inventory_parent(current) else {
                break;
            };
            if depth == inventory_ancestor_limit() {
                return Err(failure("invalid inspected subject custody"));
            }
            current = entities
                .get(parent)
                .ok_or_else(|| failure("invalid inspected subject parent"))?;
        }
        Ok(Some(RuntimeLiveSelection {
            state: self.state,
            budget: self.budget,
            entity,
        }))
    }
}

impl<'a> RuntimeLiveSelection<'a> {
    pub fn roster_key(&self) -> (&'a str, &'a JsText, &'a str, Option<&'a str>) {
        let entity = self.entity;
        (
            &entity.id,
            &entity.name,
            &entity.kind,
            entity.actor.as_ref().map(|actor| actor.controller.as_str()),
        )
    }

    /// Prepare only the selected display facts. The borrowed values and
    /// separately funded ID arrays are reused for exact version checks.
    pub fn facts(&self) -> Result<RuntimeLiveEntity<'a>, RuntimeError> {
        let entity = self.entity;
        let subject = entity.id.as_str();
        let state = self.state;
        let physical = &state.physical;
        let entities = &physical.entities;
        let definitions = &state.installed;
        let equipment = state.inventory.children(entities, subject, true);
        let equipped = state.inventory.direct_items(subject).len();
        let fields = if entity.actor.is_some() {
            definitions.attributes.len()
        } else {
            0
        };
        let bytes = fields
            .checked_add(equipped)
            .and_then(|count| count.checked_mul(size_of::<&str>()))
            .ok_or_else(|| failure("live inspection capacity"))?;
        let workspace = self.budget.reserve(bytes)?;
        let mut attributes = Vec::with_capacity(fields);
        if let Some(body) = &entity.actor {
            // read_attribute may clone one categorical value. Finite value
            // windows project numbers only. Fund that temporary separately
            // from the IDs which remain in the disclosed product.
            let temporary = body
                .attributes
                .as_ref()
                .into_iter()
                .flat_map(|attributes| attributes.values())
                .filter_map(|value| match &value.value {
                    AttributeValue::Category(category) => Some(category.len()),
                    AttributeValue::Number(_) => None,
                })
                .max()
                .unwrap_or(0);
            let _temporary = self.budget.reserve(temporary)?;
            for (id, definition) in &definitions.attributes {
                if read_attribute(entity, definition.value(), physical.pending_values.as_ref())
                    .map_err(failure)?
                    .is_some()
                {
                    attributes.push(id.as_str());
                }
            }
            attributes.sort_unstable_by(|left, right| crate::encoding::js_string_cmp(left, right));
        }
        let mut equipped_ids = Vec::with_capacity(equipped);
        equipped_ids.extend(equipment.map(|item| item.id.as_str()));
        Ok(RuntimeLiveEntity {
            id: &entity.id,
            name: &entity.name,
            kind: &entity.kind,
            placement: entity.placement.as_ref(),
            spatial: &entity.spatial,
            resource: entity.resource.as_ref(),
            heat: entity.heat.as_ref(),
            remains: entity.remains.as_ref(),
            attribute_ids: attributes,
            sense_ids: self.senses(),
            action_id: entity
                .actor
                .as_ref()
                .and_then(|actor| actor.action.as_ref())
                .map(|action| action.id.as_str()),
            equipment: equipped_ids,
            _workspace: workspace,
        })
    }

    fn senses(&self) -> &'a [String] {
        self.entity.actor.as_ref().map_or(&[][..], |actor| {
            actor
                .senses
                .as_deref()
                .unwrap_or(&self.state.installed.default_senses)
        })
    }

    /// Attach support and installed bindings only when opening a selected
    /// body. Directory rows do not scan geometry or build relationships.
    pub fn inspection(&self) -> Result<RuntimeLiveInspection<'a>, RuntimeError> {
        let entity = self.entity;
        let definitions = &self.state.installed;
        let support = entity.world_support().and_then(|(_, id)| {
            let layout = &definitions.geometry.spatial;
            layout
                .surfaces
                .iter()
                .find(|surface| surface.id == id)
                .map(RuntimeLiveSupport::Surface)
                .or_else(|| {
                    (id == "terrain").then_some(RuntimeLiveSupport::Terrain(layout.revision))
                })
        });
        Ok(RuntimeLiveInspection {
            support,
            definitions: RuntimeDefinitionCatalogue(Arc::clone(definitions)),
            entity: self.facts()?,
        })
    }
}
