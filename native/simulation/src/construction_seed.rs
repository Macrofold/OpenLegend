//! Fresh-world construction permissions use exact installed facts. This does
//! not issue operational grants or authorize a later construction action.
use crate::host::retained_size::{heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::install::InstallError;
use crate::simulation::SimulationState;
use crate::values::{
    DefinitionPin, deserialize_present_option, deserialize_safe_integer, is_safe_record_id,
};
use indexmap::{IndexMap, IndexSet};
use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;
use std::borrow::Cow;

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct InitialConstructionGrant {
    id: String,
    world_id: String,
    actor_id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    revision: u64,
    revoked: bool,
    site: ConstructionSite,
    operations: Vec<ConstructionOperation>,
    material_ids: Vec<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    material_contributions: Option<bool>,
    acquisition: InitialAcquisition,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    public_gate_use: Option<PublicGateUse>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    structural_exposure: Option<StructuralExposure>,
}

impl InitialConstructionGrant {
    pub fn id(&self) -> &str {
        &self.id
    }
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ConstructionSite {
    surface_id: String,
    min_x: f64,
    max_x: f64,
    min_z: f64,
    max_z: f64,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
enum ConstructionOperation {
    Post,
    Cover,
    Lower,
    ReclaimPost,
    ReclaimLowered,
    PlaceHearth,
    BoundaryPanel,
    BoundaryGate,
    RemoveBoundaryPanel,
    RemoveBoundaryGate,
    RepairBoundary,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct InitialAcquisition {
    sources: Vec<InitialMaterialSource>,
    assembly_ids: Vec<String>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct InitialMaterialSource {
    entity_id: String,
    definition: DefinitionPin,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct PublicGateUse {
    family: DefinitionPin,
    operations: Vec<GateOperation>,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
enum GateOperation {
    Open,
    Close,
    Bar,
    Unbar,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct StructuralExposure {
    family: DefinitionPin,
    operations: [StructuralOperation; 1],
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
enum StructuralOperation {
    HeldToolImpact,
}

/// Record only the pins of installed families which can anchor an authored
/// boundary grant. The installer supplied and verified Source's canonical
/// bytes, including its property ordering and exact definition contents.
pub(crate) fn prepare_families(
    canonical: &IndexMap<String, &RawValue>,
    budget: &ByteBudget,
) -> Result<(IndexMap<String, DefinitionPin>, ByteReservation), InstallError> {
    #[derive(Deserialize)]
    struct Family<'a> {
        #[serde(borrow)]
        id: Cow<'a, str>,
        #[serde(deserialize_with = "deserialize_safe_integer")]
        version: u64,
        #[serde(borrow)]
        implementation: Cow<'a, str>,
    }
    let map_bytes = map_storage::<String, DefinitionPin>(
        canonical
            .len()
            .checked_mul(2)
            .ok_or(InstallError::Capacity)?,
    )
    .ok_or(InstallError::Capacity)?;
    let mut workspace = budget
        .reserve(map_bytes)
        .map_err(|_| InstallError::Capacity)?;
    let mut families = IndexMap::new();
    families
        .try_reserve(canonical.len())
        .map_err(|_| InstallError::Capacity)?;
    for (key, value) in canonical {
        let exact = value.get();
        // The two borrowed strings may allocate only when their JSON is escaped.
        let _read = budget
            .reserve(exact.len())
            .map_err(|_| InstallError::Capacity)?;
        let family: Family<'_> =
            serde_json::from_str(exact).map_err(|_| InstallError::DefinitionBody)?;
        if family.implementation != "grounded-panel-boundary" {
            continue;
        }
        workspace
            .resize(
                heap_sum([workspace.bytes(), key.len(), family.id.len(), 7])
                    .ok_or(InstallError::Capacity)?,
            )
            .map_err(|_| InstallError::Capacity)?;
        let pin = DefinitionPin {
            id: family.id.into_owned(),
            version: family.version,
            digest: crate::encoding::content_label(exact),
        };
        if pin.id != *key || !pin.is_valid() {
            return Err(InstallError::DefinitionPin);
        }
        families.insert(key.clone(), pin);
    }
    Ok((families, workspace))
}

fn unique_id_space<'a>(
    length: usize,
    budget: &ByteBudget,
) -> Result<(IndexSet<&'a str>, ByteReservation), InstallError> {
    let capacity = length.checked_mul(2).ok_or(InstallError::Capacity)?;
    let bytes = map_storage::<&str, ()>(capacity).ok_or(InstallError::Capacity)?;
    let reservation = budget.reserve(bytes).map_err(|_| InstallError::Capacity)?;
    let mut ids = IndexSet::new();
    ids.try_reserve(length)
        .map_err(|_| InstallError::Capacity)?;
    Ok((ids, reservation))
}

/// Check the complete immutable grant list against this initial world. The
/// application still owns the destination account binding and atomic write.
pub(crate) fn check(
    state: &SimulationState,
    actor: &str,
    grants: &[InitialConstructionGrant],
    budget: &ByteBudget,
) -> Result<(), InstallError> {
    let (mut grant_ids, _grant_ids_storage) = unique_id_space(grants.len(), budget)?;
    let physical = &state.physical;
    let installed = &state.installed;
    let family_current = |pin: &DefinitionPin| {
        installed.retained.construction_seed_families.get(&pin.id) == Some(pin)
    };
    for grant in grants {
        let site = &grant.site;
        if grant.world_id != physical.header.id
            || grant.actor_id != actor
            || grant.revoked
            || grant.revision != 1
            || !is_safe_record_id(grant.id())
            || !grant_ids.insert(grant.id())
            || grant.operations.len() > 11
            || grant.material_contributions == Some(false)
            || !grant.material_ids.is_empty()
            || !grant.acquisition.assembly_ids.is_empty()
            || grant.acquisition.sources.is_empty()
            || ![site.min_x, site.max_x, site.min_z, site.max_z]
                .into_iter()
                .all(f64::is_finite)
            || site.min_x >= site.max_x
            || site.min_z >= site.max_z
            || !installed
                .geometry
                .spatial
                .surfaces
                .iter()
                .any(|surface| surface.id == site.surface_id)
        {
            return Err(InstallError::CurrentFormat);
        }
        if grant.public_gate_use.as_ref().is_some_and(|gate| {
            !family_current(&gate.family)
                || gate.operations.is_empty()
                || gate.operations.len() > 4
                || gate
                    .operations
                    .iter()
                    .enumerate()
                    .any(|(index, op)| gate.operations[..index].contains(op))
        }) || grant
            .structural_exposure
            .as_ref()
            .is_some_and(|exposure| !family_current(&exposure.family))
        {
            return Err(InstallError::DefinitionPin);
        }
        let (mut sources, _source_ids_storage) =
            unique_id_space(grant.acquisition.sources.len(), budget)?;
        for source in &grant.acquisition.sources {
            if !sources.insert(&source.entity_id)
                || !physical
                    .entities
                    .get(&source.entity_id)
                    .and_then(|entity| entity.resource.as_ref())
                    .is_some_and(|resource| resource.definition_id == source.definition.id)
                || !installed
                    .retained
                    .items
                    .get(&source.definition.id)
                    .is_some_and(|item| {
                        item.tracks_material_origins && item.pin == source.definition
                    })
            {
                return Err(InstallError::DefinitionPin);
            }
        }
    }
    Ok(())
}
