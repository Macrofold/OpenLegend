//! Stored object facts. Placement remains the sole custody relationship.

use crate::{
    host::retained_size::heap_record,
    values::{
        DefinitionPin, deserialize_nullable, deserialize_present_option, deserialize_safe_integer,
    },
};
use serde::Deserialize;

#[derive(Clone, Copy, Debug, PartialEq, Eq, serde::Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum Individuality {
    Homogeneous,
    Individual,
}

#[derive(Debug, PartialEq, serde::Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ItemLot {
    pub definition_pin: DefinitionPin,
    pub unit_pin: DefinitionPin,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub quantity: u64,
    pub individuality: Individuality,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub material_origin_ids: Option<Vec<String>>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub material_contribution_ids: Option<Vec<String>>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub assembly_claim: Option<super::UnconvertedField>,
}

#[derive(Debug, PartialEq, serde::Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct ContainerAccess {
    pub actors: Vec<String>,
}

#[derive(Debug, PartialEq, serde::Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ContainerState {
    pub definition_pin: DefinitionPin,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub subtree_revision: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub load: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub load_revision: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub height: u64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub access: Option<ContainerAccess>,
}

#[derive(Debug, PartialEq, serde::Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum OwnershipDisclosure {
    Custodian,
    Public,
}

#[derive(Debug, PartialEq, serde::Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct DeclaredOwner {
    #[serde(deserialize_with = "deserialize_nullable")]
    pub holder_id: Option<String>,
    pub disclosure: OwnershipDisclosure,
    pub source_id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
}

heap_record!(ItemLot {
    definition_pin,
    unit_pin,
    material_origin_ids,
    material_contribution_ids
});
heap_record!(ContainerAccess { actors });
heap_record!(ContainerState {
    definition_pin,
    access
});
heap_record!(DeclaredOwner {
    holder_id,
    source_id
});
