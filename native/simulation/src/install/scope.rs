//! Explicit inactive families outside the proof's supported command closure.
//! Their complete absence/empty map is checked at the current-format boundary;
//! an unknown, partial or live family never disappears during installation.
use super::rows::take_collection;
use super::{CoreInstallation, InstallError, RowImport, WorldChildren};

pub(crate) struct SelectedInstallation {
    pub state: crate::simulation::SimulationState,
    pub host_settings: crate::administration::InstalledHostSettings,
}
/// Consume every actual selected current-format owner. This constructor proves
/// row/family admission; the host still owes the complete executable lifecycle
/// before exposing a simulation handle or minting an operation's Ready token.
pub(crate) fn finish_selected_installation(
    mut installation: CoreInstallation,
) -> Result<SelectedInstallation, InstallError> {
    for (field, table, empty_map) in [
        ("finiteRain", "sim_finite_rain", false),
        ("exitExposures", "sim_exit_exposures", true),
        ("objectLineage", "sim_object_lineage", true),
        ("projectiles", "sim_projectiles", true),
        ("outings", "activity_outings", true),
        ("socialCompacts", "social_compacts", true),
        ("familyTree", "sim_family_tree", false),
        ("declarationReceipts", "declaration_receipts", true),
    ] {
        inactive(
            &mut installation.remaining_rows,
            &mut installation.remaining_children,
            field,
            table,
            empty_map,
        )?;
    }
    let CoreInstallation {
        state,
        host_settings,
        remaining_rows,
        remaining_children,
        archived_event_count,
        assembly_geometry_revision: _,
        story_policy_revision: _,
    } = installation;
    remaining_children.finish()?;
    let cut = remaining_rows.finish()?;
    if cut.world_id != state.physical.header.id
        || cut.generation != state.generation
        || cut.durable_revision != state.durable_revision
        || state.occurrences.archived_count() != archived_event_count
    {
        return Err(InstallError::CurrentFormat);
    }
    Ok(SelectedInstallation {
        state,
        host_settings,
    })
}

fn inactive(
    import: &mut RowImport,
    children: &mut WorldChildren,
    field: &'static str,
    table: &str,
    empty_map: bool,
) -> Result<(), InstallError> {
    let present = match children.take(field)? {
        Some(true) if empty_map => true,
        Some(true) => return Err(InstallError::UnsupportedFamily(field)),
        None => false,
        _ => return Err(InstallError::ParentPresence),
    };
    let current = take_collection(import, table, "[\"world\"]", present, true)?;
    if !current.rows.is_empty() {
        return Err(InstallError::UnsupportedFamily(field));
    }
    Ok(())
}
