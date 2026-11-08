//! Shared consuming current-row checks. Parent presence comes from the actual
//! decoded parent body, never from a missing resident row or collection length.

use super::{ImportedCollection, InstallError, RowImport};
use crate::encoding::json_record;
use crate::records::{ChildShape, InstalledRow};
use serde::de::DeserializeOwned;

pub(crate) fn take_collection(
    import: &mut RowImport,
    table: &str,
    parent: &str,
    expected_present: bool,
    require_complete: bool,
) -> Result<ImportedCollection, InstallError> {
    let collection = import.take_collection(table, parent)?;
    if collection.coverage.parent_present != expected_present
        || (require_complete && !collection.coverage.complete)
        || (!expected_present && !collection.rows.is_empty())
    {
        return Err(InstallError::ParentPresence);
    }
    Ok(collection)
}

pub(crate) fn validate_row(
    row: &InstalledRow,
    path: &[&str],
    parent: &str,
    slot: &str,
    next_ordinal: u64,
) -> Result<(), InstallError> {
    if row.id != json_record(path).map_err(|_| InstallError::RowIdentity)?
        || row.parent != parent
        || row.slot != slot
        || row.position >= next_ordinal
    {
        return Err(InstallError::RowPlacement);
    }
    Ok(())
}

pub(crate) fn validate_map_row(
    row: &InstalledRow,
    parent: &str,
    field: &str,
    key: &str,
    next_ordinal: u64,
) -> Result<(), InstallError> {
    let mut path: Vec<String> =
        serde_json::from_str(parent).map_err(|_| InstallError::RowIdentity)?;
    // `$` map/list nodes add only their semantic member, without a property.
    if !field.is_empty() {
        path.push(field.to_owned());
    }
    path.push(key.to_owned());
    let borrowed: Vec<&str> = path.iter().map(String::as_str).collect();
    validate_row(row, &borrowed, parent, key, next_ordinal)
}

pub(crate) fn take_one<T: DeserializeOwned>(
    import: &mut RowImport,
    table: &str,
    parent: &str,
    field: &str,
    expected_present: bool,
) -> Result<Option<(InstalledRow, T)>, InstallError> {
    let mut collection = take_collection(import, table, parent, expected_present, true)?;
    if !expected_present {
        return Ok(None);
    }
    if collection.rows.len() != 1 {
        return Err(InstallError::RowIdentity);
    }
    let row = collection.rows.pop().expect("one current owner row");
    let mut path: Vec<String> =
        serde_json::from_str(parent).map_err(|_| InstallError::RowIdentity)?;
    path.push(field.to_owned());
    let borrowed: Vec<&str> = path.iter().map(String::as_str).collect();
    validate_row(
        &row,
        &borrowed,
        parent,
        field,
        collection.coverage.next_ordinal,
    )?;
    let value = serde_json::from_str(&row.payload).map_err(|_| InstallError::CurrentFormat)?;
    Ok(Some((row, value)))
}

pub(crate) fn validate_marker(row: &InstalledRow, shape: ChildShape) -> Result<(), InstallError> {
    let empty = match shape {
        ChildShape::Array => serde_json::from_str::<[(); 0]>(&row.payload).is_ok(),
        ChildShape::Object => {
            serde_json::from_str::<crate::experience::EmptyChildOwner>(&row.payload).is_ok()
        }
    };
    if !empty || !row.extra.is_empty() {
        return Err(InstallError::CurrentFormat);
    }
    Ok(())
}
