//! A bounded accepted-world read for the signed live inspection panel.
//! No cognition, account identity, path, or arbitrary entity serialization
//! crosses the callback. See docs/world-agent-inspection-and-edits.md.

use super::*;
use crate::{
    geometry::WalkableSurface,
    host::ByteReservation,
    install::{inventory_ancestor_limit, inventory_parent},
    state::{Entity, EntitySpatial, Heat, Placement, Remains, Resource},
    status::read_attribute,
    text::JsText,
    values::AttributeValue,
};
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
    pub progress: RuntimeProgress<'a>,
    pub entity: RuntimeLiveEntity<'a>,
    pub support: Option<RuntimeLiveSupport<'a>>,
    pub definitions: RuntimeDefinitionCatalogue,
}

impl NativeWorldSession {
    /// Read the selected live body at the same accepted cut as its support and
    /// installed bindings. The application must hold current Play and Inspect
    /// through publication. Native independently binds the saved owner and
    /// refuses another human's actor or objects in their custody.
    pub fn inspect_live_entity<T>(
        &self,
        account: &str,
        owning_actor: &str,
        subject: &str,
        consume: impl FnOnce(RuntimeLiveInspection<'_>) -> T,
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
        let state = &simulation.state;
        let physical = &state.physical;
        let entities = &physical.entities;
        let Some(entity) = entities.get(subject) else {
            return Ok(None);
        };
        let mut current: &Entity = entity;
        for depth in 0..=inventory_ancestor_limit() {
            if current.retirement.is_some()
                || current
                    .actor
                    .as_ref()
                    .is_some_and(|actor| actor.controller == "player" && current.id != owning_actor)
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
        let workspace = self.budget.reserve(bytes).map_err(failure)?;
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
            let _temporary = self.budget.reserve(temporary).map_err(failure)?;
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
        let senses = entity.actor.as_ref().map_or(&[][..], |actor| {
            actor
                .senses
                .as_deref()
                .unwrap_or(&definitions.default_senses)
        });
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
        let mut equipped_ids = Vec::with_capacity(equipped);
        equipped_ids.extend(equipment.map(|item| item.id.as_str()));
        Ok(Some(consume(RuntimeLiveInspection {
            progress,
            support,
            definitions: RuntimeDefinitionCatalogue(Arc::clone(definitions)),
            entity: RuntimeLiveEntity {
                id: &entity.id,
                name: &entity.name,
                kind: &entity.kind,
                placement: entity.placement.as_ref(),
                spatial: &entity.spatial,
                resource: entity.resource.as_ref(),
                heat: entity.heat.as_ref(),
                remains: entity.remains.as_ref(),
                attribute_ids: attributes,
                sense_ids: senses,
                action_id: entity
                    .actor
                    .as_ref()
                    .and_then(|actor| actor.action.as_ref())
                    .map(|action| action.id.as_str()),
                equipment: equipped_ids,
                _workspace: workspace,
            },
        })))
    }
}
