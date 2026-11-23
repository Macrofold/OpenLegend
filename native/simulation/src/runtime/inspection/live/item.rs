//! Selected inventory lot and its immediate parent in one accepted read.

use super::*;
use crate::state::{ContainerState, Individuality};

/// Exact Source `itemFor` fields in their existing serialization order. The
/// lot and placement own these facts. Declared title and stock claims are not
/// part of this inspection view.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeLiveItem<'a> {
    pub id: &'a str,
    pub definition_id: &'a str,
    quantity: u64,
    revision: u64,
    pub owner_id: &'a str,
    individuality: Individuality,
    placement_revision: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    container: Option<&'a ContainerState>,
}

pub struct RuntimeLiveItemInspection<'a> {
    pub item: RuntimeLiveItem<'a>,
    pub name: &'a JsText,
    pub owner: RuntimeLiveSelection<'a>,
    pub definitions: RuntimeDefinitionCatalogue,
}

impl<'a> RuntimeLiveRead<'a> {
    /// Resolve only one live contained or attached lot and its actual parent.
    /// This borrows item and label fields. The caller can prepare the exact
    /// parent reference from `owner.facts()` under the same disclosure lease.
    pub fn inspect_item(
        &self,
        subject: &str,
    ) -> Result<Option<RuntimeLiveItemInspection<'a>>, RuntimeError> {
        let Some(selection) = self.select(subject)? else {
            return Ok(None);
        };
        let entity = selection.entity;
        let Some(lot) = &entity.item else {
            return Ok(None);
        };
        let Some(
            Placement::Contained {
                parent_entity_id,
                revision,
            }
            | Placement::Attached {
                parent_entity_id,
                revision,
                ..
            },
        ) = &entity.placement
        else {
            return Ok(None);
        };
        let definitions = &self.state.installed;
        let definition = definitions
            .retained
            .items
            .get(&lot.definition_pin.id)
            .filter(|definition| definition.pin == lot.definition_pin)
            .ok_or_else(|| failure("live item definition unavailable"))?;
        // `select` has already admitted this exact parent's entire custody
        // chain in the same accepted state. Reuse it for the graph endpoint.
        let parent = self
            .state
            .physical
            .entities
            .get(parent_entity_id)
            .ok_or_else(|| failure("live item parent unavailable"))?;
        Ok(Some(RuntimeLiveItemInspection {
            item: RuntimeLiveItem {
                id: &entity.id,
                definition_id: &lot.definition_pin.id,
                quantity: lot.quantity,
                revision: lot.revision,
                owner_id: parent_entity_id,
                individuality: lot.individuality,
                placement_revision: *revision,
                container: entity.container.as_ref(),
            },
            name: &definition.named.name,
            owner: RuntimeLiveSelection {
                entity: parent,
                ..selection
            },
            definitions: RuntimeDefinitionCatalogue(Arc::clone(definitions)),
        }))
    }
}
