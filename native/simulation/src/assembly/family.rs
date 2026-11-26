//! A single immutable read of each selected material family's canonical rules.
//! Different releases can install different shapes, parts, times and text.
use super::{BoundaryRole, geometry::BoundaryGeometry};
use crate::host::retained_size::{HeapBytes, heap_record, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::install::InstallError;
use crate::values::{DefinitionPin, deserialize_safe_integer};
use indexmap::IndexMap;
use serde::Deserialize;
use serde_json::value::RawValue;
use std::mem::size_of;

pub(crate) struct InstalledFamily {
    pub pin: DefinitionPin,
    pub rules: FamilyRules,
}
heap_record!(InstalledFamily { pin, rules });

pub(crate) enum FamilyRules {
    Boundary(Box<BoundaryRules>),
    Shelter(Box<ShelterRules>),
}
impl HeapBytes for FamilyRules {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Boundary(rules) => rules.heap_bytes(),
            Self::Shelter(rules) => rules.heap_bytes(),
        }
    }
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct BoundaryRules {
    pub geometry: BoundaryGeometry,
    pub materials: BoundarySurfaces,
    pub roles: BoundaryMaterials,
    pub integrity: IndexMap<String, DefinitionPin>,
    pub salvage: Salvage,
    pub limits: BoundaryLimits,
    pub joints: BoundaryJoints,
    pub presentation: Presentation,
    pub work_points: WorkPoints,
    pub labels: IndexMap<String, String>,
    pub seconds: IndexMap<String, f64>,
}
heap_record!(BoundaryRules {
    materials,
    roles,
    integrity,
    salvage,
    joints,
    presentation,
    labels,
    seconds
});
#[derive(Deserialize)]
pub(crate) struct BoundarySurfaces {
    pub post: String,
    pub binding: String,
    pub panel: String,
}
heap_record!(BoundarySurfaces {
    post,
    binding,
    panel
});
#[derive(Deserialize)]
pub(crate) struct Salvage {
    pub outputs: IndexMap<String, Vec<SalvageOutput>>,
}
heap_record!(Salvage { outputs });
#[derive(Deserialize)]
pub(crate) struct SalvageOutput {
    pub definition: DefinitionPin,
}
heap_record!(SalvageOutput { definition });

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct BoundaryMaterials {
    post: DefinitionPin,
    gate_post: DefinitionPin,
    panel: DefinitionPin,
    parking_panel: DefinitionPin,
    gate: DefinitionPin,
    rail: DefinitionPin,
    binding: DefinitionPin,
}
impl BoundaryMaterials {
    pub(crate) fn for_role(&self, role: BoundaryRole) -> &DefinitionPin {
        match role {
            BoundaryRole::Post => &self.post,
            BoundaryRole::GatePost => &self.gate_post,
            BoundaryRole::Panel => &self.panel,
            BoundaryRole::AccessPanel => &self.parking_panel,
            BoundaryRole::Gate => &self.gate,
            BoundaryRole::FirstRail | BoundaryRole::SecondRail => &self.rail,
            BoundaryRole::Binding => &self.binding,
        }
    }
}
heap_record!(BoundaryMaterials {
    post,
    gate_post,
    panel,
    parking_panel,
    gate,
    rail,
    binding
});
#[derive(Deserialize)]
pub(crate) struct BoundaryLimits {
    pub parts: usize,
    pub sections: usize,
    pub gates: usize,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct BoundaryJoints {
    pub panel_ties: Vec<PanelTie>,
}
heap_record!(BoundaryJoints { panel_ties });
#[derive(Deserialize)]
pub(crate) struct PanelTie {
    pub end: u8,
    pub height: f64,
}
heap_record!(PanelTie {});
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Presentation {
    pub binding_size: f64,
    pub post_color: String,
    pub cover_color: String,
}
heap_record!(Presentation { post_color, cover_color });
#[derive(Deserialize)]
pub(crate) struct WorkPoints {
    pub clearance: f64,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ShelterRules {
    pub condition_attribute: String,
    pub usable_condition: String,
    #[serde(deserialize_with = "cover_profiles")]
    pub cover_profiles: Vec<CoverProfile>,
    pub materials: ShelterSurfaces,
    pub presentation: Presentation,
    pub bay: Bay,
    pub arrangements: Vec<Arrangement>,
    pub limits: ShelterLimits,
}
heap_record!(ShelterRules {
    arrangements,
    condition_attribute,
    usable_condition,
    materials,
    cover_profiles,
    presentation
});
#[derive(Deserialize)]
pub(crate) struct ShelterSurfaces {
    pub post: String,
    pub cover: String,
}
heap_record!(ShelterSurfaces { post, cover });
#[derive(Deserialize)]
pub(crate) struct Sheet {
    pub width: f64,
    pub length: f64,
    pub thickness: f64,
    pub transmission: f64,
}
pub(crate) struct CoverProfile {
    pub pin: DefinitionPin,
    pub sheet: Sheet,
}
heap_record!(CoverProfile { pin });
fn cover_profiles<'de, D: serde::Deserializer<'de>>(
    deserializer: D,
) -> Result<Vec<CoverProfile>, D::Error> {
    #[derive(Deserialize)]
    struct Source {
        id: String,
        #[serde(deserialize_with = "deserialize_safe_integer")]
        version: u64,
        #[serde(flatten)]
        sheet: Sheet,
    }
    let entries = Vec::<&RawValue>::deserialize(deserializer)?;
    entries
        .into_iter()
        .map(|raw| {
            let source = raw.get();
            let value: Source = serde_json::from_str(source).map_err(serde::de::Error::custom)?;
            Ok(CoverProfile {
                pin: DefinitionPin {
                    id: value.id,
                    version: value.version,
                    digest: crate::encoding::content_label(source),
                },
                sheet: value.sheet,
            })
        })
        .collect()
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Bay {
    pub width: f64,
    pub length: f64,
    pub post_section: f64,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Arrangement {
    pub id: String,
    pub maximum_bays: usize,
    pub row_heights: [f64; 2],
}
heap_record!(Arrangement { id });
#[derive(Deserialize)]
pub(crate) struct ShelterLimits {
    pub sockets: usize,
    pub parts: usize,
}

/// Pin the exact source bytes during the same bounded decode that installs the
/// geometry and operation rules. A later edit never reparses an authored family.
pub(crate) fn prepare(
    canonical: &IndexMap<String, &RawValue>,
    budget: &ByteBudget,
) -> Result<(IndexMap<String, InstalledFamily>, ByteReservation), InstallError> {
    #[derive(Deserialize)]
    struct Identity<'a> {
        #[serde(borrow)]
        id: std::borrow::Cow<'a, str>,
        #[serde(borrow)]
        implementation: std::borrow::Cow<'a, str>,
        #[serde(deserialize_with = "deserialize_safe_integer")]
        version: u64,
    }
    let count = canonical
        .len()
        .checked_mul(2)
        .ok_or(InstallError::Capacity)?;
    let map_bytes = map_storage::<String, InstalledFamily>(count).ok_or(InstallError::Capacity)?;
    let mut storage = budget
        .reserve(map_bytes)
        .map_err(|_| InstallError::Capacity)?;
    let mut installed = IndexMap::new();
    installed
        .try_reserve(canonical.len())
        .map_err(|_| InstallError::Capacity)?;
    for (key, value) in canonical {
        let source = value.get();
        let _parse = crate::install::reserve_typed_parse::<InstalledFamily>(
            source,
            size_of::<Arrangement>(),
            Some(size_of::<(String, String)>()),
            budget,
        )?;
        let identity: Identity<'_> =
            serde_json::from_str(source).map_err(|_| InstallError::DefinitionBody)?;
        let pin = DefinitionPin {
            id: identity.id.into_owned(),
            version: identity.version,
            digest: crate::encoding::content_label(source),
        };
        if pin.id != *key || !pin.is_valid() {
            return Err(InstallError::DefinitionPin);
        }
        let rules = match identity.implementation.as_ref() {
            "grounded-panel-boundary" => FamilyRules::Boundary(
                serde_json::from_str(source).map_err(|_| InstallError::DefinitionBody)?,
            ),
            "four-corner-flexible-bays" => FamilyRules::Shelter(
                serde_json::from_str(source).map_err(|_| InstallError::DefinitionBody)?,
            ),
            _ => return Err(InstallError::UnsupportedFamily("construction structure")),
        };
        let family = InstalledFamily { pin, rules };
        storage
            .resize(
                heap_sum([
                    storage.bytes(),
                    key.len(),
                    family.heap_bytes().ok_or(InstallError::Capacity)?,
                ])
                .ok_or(InstallError::Capacity)?,
            )
            .map_err(|_| InstallError::Capacity)?;
        installed.insert(key.clone(), family);
    }
    Ok((installed, storage))
}
