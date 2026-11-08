//! Explicit inactive families outside the proof's supported command closure.
//! Their complete absence/empty map is checked at the current-format boundary;
//! an unknown, partial or live family never disappears during installation.
use super::rows::take_collection;
use super::{CoreInstallation, InstallError, RowImport, WorldChildren};

pub(crate) fn finish_record_ownership(
    mut installation: CoreInstallation,
) -> Result<CoreInstallation, InstallError> {
    for (field, table, empty_map) in [
        ("finiteRain", "sim_finite_rain", false),
        ("exitExposures", "sim_exit_exposures", true),
        ("coachingEpisodes", "sim_coaching_episodes", true),
        ("objectLineage", "sim_object_lineage", true),
        ("projectiles", "sim_projectiles", true),
        ("outings", "activity_outings", true),
        ("socialCompacts", "social_compacts", true),
        ("familyTree", "sim_family_tree", false),
        ("responseReceipts", "response_receipts", true),
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
    // Consumption alone is deliberately not a runtime acceptance token. The
    // caller still owns definition/caller closure and real operation/capture,
    // save and lifecycle integration before it can expose this state.
    if installation
        .remaining_children
        .remaining_fields()
        .next()
        .is_some()
    {
        return Err(InstallError::UnclaimedCoverage);
    }
    Ok(installation)
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
