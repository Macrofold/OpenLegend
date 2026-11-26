//! Stored object facts. Placement remains the sole custody relationship.

use crate::values::is_safe_record_id;
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
    pub assembly_claim: Option<Box<crate::assembly::MaterialClaim>>,
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

#[derive(Clone, Debug, PartialEq, serde::Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum OwnershipDisclosure {
    Custodian,
    Public,
}

#[derive(Clone, Debug, PartialEq, serde::Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct DeclaredOwner {
    #[serde(deserialize_with = "deserialize_nullable")]
    pub holder_id: Option<String>,
    pub disclosure: OwnershipDisclosure,
    pub source_id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
}

#[derive(Debug, PartialEq, serde::Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ItemRetirement {
    #[serde(deserialize_with = "deserialize_nullable")]
    pub custodian_id: Option<String>,
    pub at: f64,
    pub cause: String,
    pub definition_pin: DefinitionPin,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub quantity: u64,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, serde::Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum LineageKind {
    Split,
    Merge,
    Consume,
}

#[derive(Debug, serde::Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ObjectLineage {
    pub id: String,
    #[serde(rename = "type")]
    pub kind: LineageKind,
    pub source_id: String,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub target_id: Option<String>,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub quantity: u64,
    pub cause: String,
    pub at: f64,
    pub unit_pin: DefinitionPin,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub custodian_id: Option<String>,
}

impl ItemRetirement {
    pub(crate) fn valid(&self, through: f64) -> bool {
        self.at.is_finite()
            && self.at >= 0.0
            && self.at <= through
            && self.quantity > 0
            && self.definition_pin.is_valid()
            && is_safe_record_id(&self.cause)
            && self.custodian_id.as_deref().is_none_or(is_safe_record_id)
    }
}

impl ObjectLineage {
    pub(crate) fn valid(&self, through: f64) -> bool {
        self.at.is_finite()
            && self.at >= 0.0
            && self.at <= through
            && self.quantity > 0
            && self.unit_pin.is_valid()
            && is_safe_record_id(&self.id)
            && is_safe_record_id(&self.source_id)
            && is_safe_record_id(&self.cause)
            && self.target_id.as_deref().is_none_or(is_safe_record_id)
            && (self.kind == LineageKind::Consume) == self.target_id.is_none()
            && self.custodian_id.as_deref().is_none_or(is_safe_record_id)
    }
}

heap_record!(ItemLot {
    definition_pin,
    unit_pin,
    material_origin_ids,
    material_contribution_ids,
    assembly_claim
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
heap_record!(ItemRetirement {
    custodian_id,
    cause,
    definition_pin
});
heap_record!(ObjectLineage {
    id,
    source_id,
    target_id,
    cause,
    unit_pin,
    custodian_id
});
