//! Consume the current map's actual split SQL records once. The assembled
//! immutable physical map is validated by the existing provider before install
//! acceptance, and shared by all native geometry phases thereafter.

use super::{InstallError, RowImport, rows};
use crate::geometry::GeometryMap;
use serde_json::{Map, Value};

fn object(value: Value) -> Result<Map<String, Value>, InstallError> {
    match value {
        Value::Object(fields) => Ok(fields),
        _ => Err(InstallError::CurrentFormat),
    }
}
fn array_marker(
    parent: &mut Map<String, Value>,
    field: &str,
    optional: bool,
) -> Result<bool, InstallError> {
    match parent.remove(field) {
        Some(Value::Array(values)) if values.is_empty() => Ok(true),
        None if optional => Ok(false),
        _ => Err(InstallError::CurrentFormat),
    }
}
fn list(
    import: &mut RowImport,
    table: &str,
    parent: &str,
    field: &str,
    present: bool,
    member_id: Option<&str>,
) -> Result<Vec<Value>, InstallError> {
    let rows = rows::take_collection(import, table, parent, present, true)?;
    let mut values = Vec::with_capacity(rows.rows.len());
    for (at, row) in rows.rows.into_iter().enumerate() {
        if row.position != at as u64 || row.slot != at.to_string() || !row.extra.is_empty() {
            return Err(InstallError::RowPlacement);
        }
        let value: Value =
            serde_json::from_str(&row.payload).map_err(|_| InstallError::CurrentFormat)?;
        let key = match member_id {
            Some(field) => value
                .get(field)
                .and_then(Value::as_str)
                .ok_or(InstallError::RowIdentity)?
                .to_owned(),
            None => at.to_string(),
        };
        let mut path: Vec<String> =
            serde_json::from_str(parent).map_err(|_| InstallError::RowIdentity)?;
        path.push(field.to_owned());
        path.push(key);
        rows::validate_row(
            &row,
            &path.iter().map(String::as_str).collect::<Vec<_>>(),
            parent,
            &row.slot,
            rows.coverage.next_ordinal,
        )?;
        values.push(value);
    }
    Ok(values)
}

pub(crate) fn install_geometry(
    import: &mut RowImport,
    present: bool,
) -> Result<GeometryMap, InstallError> {
    let (map_row, map) = rows::take_one::<Value>(import, "sim_map", "[\"world\"]", "map", present)?
        .ok_or(InstallError::ParentPresence)?;
    if !map_row.extra.is_empty() {
        return Err(InstallError::CurrentFormat);
    }
    let mut map = object(map)?;
    array_marker(&mut map, "tiles", false)?;
    match map.remove("spatial") {
        Some(Value::Object(fields)) if fields.is_empty() => {}
        _ => return Err(InstallError::CurrentFormat),
    }
    map.insert(
        "tiles".to_owned(),
        Value::Array(list(
            import,
            "sim_terrain_rows",
            &map_row.id,
            "tiles",
            true,
            None,
        )?),
    );
    let (spatial_row, spatial) =
        rows::take_one::<Value>(import, "sim_geometry", &map_row.id, "spatial", true)?
            .ok_or(InstallError::ParentPresence)?;
    if !spatial_row.extra.is_empty() {
        return Err(InstallError::CurrentFormat);
    }
    let mut spatial = object(spatial)?;
    for (field, table, optional) in [
        ("surfaces", "sim_surfaces", false),
        ("blockers", "sim_blockers", false),
        ("levels", "sim_levels", false),
        ("scenery", "sim_scenery", true),
    ] {
        let present = array_marker(&mut spatial, field, optional)?;
        let values = list(import, table, &spatial_row.id, field, present, Some("id"))?;
        if present {
            spatial.insert(field.to_owned(), Value::Array(values));
        }
    }
    map.insert("spatial".to_owned(), Value::Object(spatial));
    serde_json::from_value(Value::Object(map)).map_err(|_| InstallError::CurrentFormat)
}
