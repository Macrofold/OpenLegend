//! Fresh-world construction permissions use exact installed facts. This does
//! not issue operational grants or authorize a later construction action.
use crate::host::retained_size::map_storage;
use crate::host::{ByteBudget, ByteReservation};
use crate::install::InstallError;
use crate::simulation::SimulationState;
use crate::values::{
    DefinitionPin, deserialize_present_option, deserialize_safe_integer, is_safe_record_id,
};
use indexmap::IndexSet;
use serde::{Deserialize, Serialize};

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

use crate::assembly::gate::GateOperation;

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
        installed.retained.structures.get(&pin.id).is_some_and(|family|
            family.pin == *pin && matches!(family.rules, crate::assembly::family::FamilyRules::Boundary(_)))
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
