//! Installed structures and the claims tying individual materials to them.
//! Placement owns each attachment's position. The structure records its use.
mod boundary;
pub(crate) mod family;
pub mod gate;
pub(crate) mod geometry;
mod membership;
pub(crate) mod observed;
pub mod scene;
mod solids;

use crate::host::retained_size::{HeapBytes, heap_record, heap_sum};
use crate::values::{DefinitionPin, deserialize_present_option, deserialize_safe_integer};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct MaterialClaim {
    pub root_id: String,
    pub family: DefinitionPin,
}
heap_record!(MaterialClaim { root_id, family });

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Edit {
    pub actor_id: String,
    pub invocation_id: String,
}
heap_record!(Edit {
    actor_id,
    invocation_id
});

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Retirement {
    pub at: f64,
    pub cause: String,
}
heap_record!(Retirement { cause });

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(
    tag = "implementation",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum Assembly {
    #[serde(rename = "four-corner-flexible-bays")]
    Shelter {
        arrangement_id: String,
        family: DefinitionPin,
        request_id: String,
        #[serde(deserialize_with = "deserialize_safe_integer")]
        revision: u64,
        parts: IndexMap<String, ShelterPart>,
        joints: IndexMap<String, ShelterJoint>,
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        active_edit: Option<Edit>,
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        retired: Option<Retirement>,
    },
    #[serde(rename = "grounded-panel-boundary")]
    Boundary {
        family: DefinitionPin,
        request_id: String,
        #[serde(deserialize_with = "deserialize_safe_integer")]
        revision: u64,
        #[serde(deserialize_with = "deserialize_safe_integer")]
        next_section: u64,
        parts: IndexMap<String, BoundaryPart>,
        joints: IndexMap<String, BoundaryJoint>,
        sections: IndexMap<String, Section>,
        gates: IndexMap<String, Gate>,
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        active_edit: Option<Edit>,
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        retired: Option<Retirement>,
    },
}

impl HeapBytes for Assembly {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Shelter {
                arrangement_id,
                family,
                request_id,
                parts,
                joints,
                active_edit,
                retired,
                ..
            } => heap_sum([
                arrangement_id.heap_bytes()?,
                family.heap_bytes()?,
                request_id.heap_bytes()?,
                parts.heap_bytes()?,
                joints.heap_bytes()?,
                active_edit.heap_bytes()?,
                retired.heap_bytes()?,
            ]),
            Self::Boundary {
                family,
                request_id,
                parts,
                joints,
                sections,
                gates,
                active_edit,
                retired,
                ..
            } => heap_sum([
                family.heap_bytes()?,
                request_id.heap_bytes()?,
                parts.heap_bytes()?,
                joints.heap_bytes()?,
                sections.heap_bytes()?,
                gates.heap_bytes()?,
                active_edit.heap_bytes()?,
                retired.heap_bytes()?,
            ]),
        }
    }
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ShelterPart {
    pub item_id: String,
    pub role: ShelterRole,
    pub slot: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub bay: u64,
}
heap_record!(ShelterPart { item_id, slot });
#[derive(Copy, Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ShelterRole {
    Post,
    Cover,
    Binding,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ShelterJoint {
    pub id: String,
    pub cover_id: String,
    pub post_id: String,
    pub binding_id: String,
    pub corner: u8,
}
heap_record!(ShelterJoint {
    id,
    cover_id,
    post_id,
    binding_id
});

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BoundaryPart {
    pub item_id: String,
    pub role: BoundaryRole,
    pub slot: String,
}
heap_record!(BoundaryPart { item_id, slot });
#[derive(Copy, Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum BoundaryRole {
    Post,
    GatePost,
    Panel,
    AccessPanel,
    Gate,
    FirstRail,
    SecondRail,
    Binding,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BoundaryJoint {
    pub id: String,
    pub kind: JointKind,
    pub part_id: String,
    pub support_id: String,
    pub binding_id: String,
    pub index: u8,
}
heap_record!(BoundaryJoint {
    id,
    part_id,
    support_id,
    binding_id
});
#[derive(Copy, Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum JointKind {
    PanelEnd,
    RunnerPost,
    LeafHanger,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "kebab-case", deny_unknown_fields)]
pub enum Section {
    Panel(Panel),
    AccessPanel(Panel),
    Gate(GateSection),
}
impl HeapBytes for Section {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Panel(panel) | Self::AccessPanel(panel) => panel.heap_bytes(),
            Self::Gate(gate) => gate.heap_bytes(),
        }
    }
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Panel {
    pub id: String,
    pub from_post_id: String,
    pub to_post_id: String,
    pub panel_id: String,
    pub binding_ids: Vec<String>,
}
heap_record!(Panel {
    id,
    from_post_id,
    to_post_id,
    panel_id,
    binding_ids
});
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct GateSection {
    pub id: String,
    pub from_post_id: String,
    pub to_post_id: String,
    pub gate_id: String,
}
heap_record!(GateSection {
    id,
    from_post_id,
    to_post_id,
    gate_id
});
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Gate {
    pub section_id: String,
    pub post_ids: [String; 3],
    pub rail_ids: [String; 2],
    pub parking_section_id: String,
    pub binding_ids: [String; 6],
    pub position: GatePosition,
    pub barred: bool,
    pub slide: DefinitionPin,
}
heap_record!(Gate {
    section_id,
    post_ids,
    rail_ids,
    parking_section_id,
    binding_ids,
    slide
});
#[derive(Copy, Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum GatePosition {
    Open,
    Closed,
}
