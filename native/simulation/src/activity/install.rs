//! Current action-history rows, consumed once with their original list ordinals.
use super::*;
use crate::install::rows::{take_collection, take_one, validate_map_row, validate_marker};
use crate::install::{InstallError, RowImport};
use crate::records::ChildShape;
use serde::de::DeserializeOwned;
use std::sync::Arc;

fn map<T: DeserializeOwned>(
    import: &mut RowImport,
    table: &str,
    field: &str,
) -> Result<IndexMap<String, T>, InstallError> {
    let rows = take_collection(
        import,
        table,
        "[\"world\",\"actionExperience\"]",
        true,
        true,
    )?;
    let mut result = IndexMap::with_capacity(rows.rows.len());
    for row in rows.rows {
        validate_map_row(
            &row,
            "[\"world\",\"actionExperience\"]",
            field,
            &row.slot,
            rows.coverage.next_ordinal,
        )?;
        if !row.extra.is_empty() {
            return Err(InstallError::CurrentFormat);
        }
        let value = serde_json::from_str(&row.payload).map_err(|_| InstallError::CurrentFormat)?;
        if result.insert(row.slot, value).is_some() {
            return Err(InstallError::DuplicateRow);
        }
    }
    Ok(result)
}
pub(crate) fn install_activity(
    import: &mut RowImport,
    present: bool,
    limits: Arc<ActivityLimits>,
    display: Arc<ActivityDisplayLimits>,
) -> Result<ActivityState, InstallError> {
    let (row, header) = take_one::<ActivityHeader>(
        import,
        "activity_state",
        "[\"world\"]",
        "actionExperience",
        present,
    )?
    .ok_or(InstallError::ParentPresence)?;
    if !row.extra.is_empty() {
        return Err(InstallError::CurrentFormat);
    }
    let owners = take_collection(
        import,
        "activity_occurrences_owners",
        "[\"world\",\"actionExperience\"]",
        true,
        true,
    )?;
    let mut collections = IndexMap::with_capacity(owners.rows.len());
    for row in owners.rows {
        validate_map_row(
            &row,
            "[\"world\",\"actionExperience\"]",
            "occurrences",
            &row.slot,
            owners.coverage.next_ordinal,
        )?;
        validate_marker(&row, ChildShape::Array)?;
        let rows = take_collection(import, "activity_occurrences", &row.id, true, false)?;
        let collection = ActivityCollection::install(
            row.slot.clone(),
            rows.rows,
            rows.coverage,
            &limits,
            &display,
        )
        .map_err(|_| InstallError::CurrentFormat)?;
        if collections.insert(row.slot, collection).is_some() {
            return Err(InstallError::DuplicateRow);
        }
    }
    // These are genuine unsupported installed owners, not empty replacements.
    // Their empty root maps are consumed; any actual member refuses closure.
    if !take_collection(
        import,
        "activity_methods",
        "[\"world\",\"actionExperience\"]",
        true,
        true,
    )?
    .rows
    .is_empty()
        || !take_collection(
            import,
            "activity_acquisitions_owners",
            "[\"world\",\"actionExperience\"]",
            true,
            true,
        )?
        .rows
        .is_empty()
    {
        return Err(InstallError::CurrentFormat);
    }
    let learning = map(import, "activity_learning", "learning")?;
    let current = map(import, "activity_current", "current")?;
    let active = map(import, "activity_active", "active")?;
    let items = map(import, "activity_item_sources", "items")?;
    let changes = map(import, "activity_state_sources", "changes")?;
    ActivityState::install(
        header,
        collections,
        learning,
        current,
        active,
        items,
        changes,
        limits,
        display,
    )
    .map_err(|_| InstallError::CurrentFormat)
}
