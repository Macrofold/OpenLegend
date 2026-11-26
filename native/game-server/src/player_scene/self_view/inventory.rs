//! Compact owned inventory and equipment bindings for the browser's existing
//! view. Opened inventory details and item actions are separate operations.
use super::{PublicArt, SceneError};
use indexmap::IndexMap;
use openlegend_simulation::{
    capture::PlayerSelfFacts,
    host::ByteReservation,
    install::OwnedContainer,
    state::{EquipmentPort, Named},
    text::JsText,
};
use serde::Serialize;
use std::mem::size_of;

#[derive(Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(super) struct ItemBinding {
    id: String,
    definition_id: String,
    revision: u64,
    placement_revision: u64,
    quantity: u64,
    available_quantity: u64,
    equipped: bool,
    #[serde(flatten)]
    named: Named,
    #[serde(skip_serializing_if = "Option::is_none")]
    icon: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    art: Option<PublicArt>,
    #[serde(skip_serializing_if = "Option::is_none")]
    container: Option<OwnedContainer>,
}

#[derive(Serialize, PartialEq)]
pub(super) struct EquipmentBinding {
    #[serde(flatten)]
    port: EquipmentPort,
    #[serde(skip_serializing_if = "Option::is_none")]
    item: Option<WornItem>,
}

#[derive(Serialize, PartialEq)]
struct WornItem {
    id: String,
    name: JsText,
    #[serde(skip_serializing_if = "Option::is_none")]
    icon: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    art: Option<PublicArt>,
}

pub(super) fn prepare(
    facts: &PlayerSelfFacts<'_>,
    item_art: &IndexMap<String, PublicArt>,
    custody: &mut ByteReservation,
) -> Result<(Vec<ItemBinding>, Vec<EquipmentBinding>), SceneError> {
    let ports = facts
        .body
        .map_or(&[][..], |body| body.equipment_ports.as_slice());
    let mut bytes = custody.bytes();
    let checked_bytes = |iteration: &[usize]| {
        iteration
            .iter()
            .try_fold(0_usize, |sum, next| sum.checked_add(*next))
            .ok_or(SceneError::Capacity)
    };
    for value in facts.inventory {
        bytes = checked_bytes(&[
            bytes,
            size_of::<ItemBinding>(),
            value.id.len(),
            value.definition_id.len(),
            value.named.name.storage_bytes(),
            value.named.name_form.as_ref().map_or(0, String::len),
            value
                .named
                .indefinite_article
                .as_ref()
                .map_or(0, String::len),
            value.icon.map_or(0, str::len),
        ])?;
    }
    for port in ports {
        bytes = checked_bytes(&[
            bytes,
            size_of::<EquipmentBinding>(),
            port.id.len(),
            port.label.len(),
            port.icon.as_ref().map_or(0, String::len),
        ])?;
        if let Some(item) = facts
            .equipped
            .iter()
            .find(|item| item.equipment_ports.contains(&port.id))
        {
            bytes = checked_bytes(&[
                bytes,
                item.id.len(),
                item.named.name.storage_bytes(),
                item.icon.map_or(0, str::len),
            ])?;
        }
    }
    custody.resize(bytes)?;
    let items = facts
        .inventory
        .iter()
        .map(|item| ItemBinding {
            id: item.id.to_owned(),
            definition_id: item.definition_id.to_owned(),
            revision: item.revision,
            placement_revision: item.placement_revision,
            quantity: item.quantity,
            available_quantity: item.available_quantity,
            equipped: item.equipped,
            named: item.named.clone(),
            icon: item.icon.map(str::to_owned),
            art: item_art.get(item.definition_id).cloned(),
            container: item.container,
        })
        .collect();
    let equipment = ports
        .iter()
        .map(|port| EquipmentBinding {
            port: port.clone(),
            item: facts
                .equipped
                .iter()
                .find(|item| item.equipment_ports.contains(&port.id))
                .map(|item| WornItem {
                    id: item.id.to_owned(),
                    name: item.named.name.clone(),
                    icon: item.icon.map(str::to_owned),
                    art: item_art.get(item.definition_id).cloned(),
                }),
        })
        .collect();
    Ok((items, equipment))
}
