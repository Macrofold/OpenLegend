//! Consume the current map's actual split SQL records once. The assembled
//! immutable physical map is validated by the existing provider before install
//! acceptance, and shared by all native geometry phases thereafter.

use super::typed_parse::finish_json_parse;
use super::{InstallError, RowImport, reserve_typed_parse, rows};
use crate::geometry::{
    GeometryMap, OwnedGeometry, SceneryInstance, SpatialBlocker, SpatialLevel, TerrainDefinition,
    WalkableSurface,
};
use crate::host::{ByteBudget, ByteReservation};
use crate::state::Bounds;
use serde_json::{Map, Value};
use std::{mem::size_of, sync::Arc};

fn fund_body(
    source: &str,
    construction: &mut ByteReservation,
    budget: &ByteBudget,
) -> Result<(), InstallError> {
    // The split rows first become JSON values, then move through the existing
    // typed map decoder. Cover both carrier layouts during that conversion.
    let carrier = [
        size_of::<GeometryMap>(),
        size_of::<TerrainDefinition>(),
        size_of::<WalkableSurface>(),
        size_of::<SpatialBlocker>(),
        size_of::<SpatialLevel>(),
        size_of::<SceneryInstance>(),
        size_of::<Vec<String>>(),
        size_of::<Value>(),
    ]
    .into_iter()
    .max()
    .expect("finite geometry carriers");
    let buckets =
        size_of::<(usize, String, Value)>().max(size_of::<(usize, String, TerrainDefinition)>());
    construction
        .merge(reserve_typed_parse::<GeometryMap>(
            source,
            carrier,
            Some(buckets),
            budget,
        )?)
        .map_err(|_| InstallError::Capacity)
}

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
    typed_item_bytes: usize,
    nested_item_bytes: usize,
    construction: &mut ByteReservation,
    budget: &ByteBudget,
) -> Result<Vec<Value>, InstallError> {
    let rows = rows::take_collection(import, table, parent, present, true)?;
    construction
        .merge(
            budget
                .reserve(
                    rows.rows
                        .len()
                        // The JSON vector survives as an IntoIter while the
                        // actual typed vector grows during final conversion.
                        .checked_mul(
                            typed_item_bytes
                                .checked_mul(4)
                                .and_then(|n| n.checked_add(size_of::<Value>()))
                                .ok_or(InstallError::Capacity)?,
                        )
                        .ok_or(InstallError::Capacity)?,
                )
                .map_err(|_| InstallError::Capacity)?,
        )
        .map_err(|_| InstallError::Capacity)?;
    let mut values = Vec::with_capacity(rows.rows.len());
    for (at, row) in rows.rows.into_iter().enumerate() {
        let _path = budget
            .reserve(
                row.id
                    .len()
                    .checked_add(parent.len())
                    .and_then(|n| n.checked_add(field.len()))
                    .and_then(|n| n.checked_add(row.slot.len()))
                    .and_then(|n| n.checked_mul(8))
                    .and_then(|n| n.checked_add(256))
                    .ok_or(InstallError::Capacity)?,
            )
            .map_err(|_| InstallError::Capacity)?;
        if row.position != at as u64 || row.slot != at.to_string() || !row.extra.is_empty() {
            return Err(InstallError::RowPlacement);
        }
        // Split rows contain fixed DTOs, not another terrain dictionary or
        // whole map. Their intermediate JSON still owns real object buckets;
        // nested typed arrays (blocker boxes, tile strings) use their own layout.
        let shape = crate::encoding::JsonAllocationShape::read(&row.payload)
            .map_err(|_| InstallError::DefinitionBody)?;
        let typed_arrays = shape
            .array_items
            .checked_mul(4)
            .and_then(|bytes| bytes.checked_mul(nested_item_bytes))
            .ok_or(InstallError::Capacity)?;
        construction
            .merge(
                budget
                    .reserve(typed_arrays)
                    .map_err(|_| InstallError::Capacity)?,
            )
            .map_err(|_| InstallError::Capacity)?;
        let body_storage = reserve_typed_parse::<Value>(
            &row.payload,
            size_of::<Value>(),
            Some(size_of::<(usize, String, Value)>()),
            budget,
        )?;
        let value: Value =
            serde_json::from_str(&row.payload).map_err(|_| InstallError::CurrentFormat)?;
        // Both assembled JSON and typed nested arrays remain funded while
        // from_value consumes the complete map below. Only this row's finished
        // decoder scratch can be released before the next row is parsed.
        construction
            .merge(finish_json_parse(body_storage, &row.payload, &value)?)
            .map_err(|_| InstallError::Capacity)?;
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
    budget: &ByteBudget,
) -> Result<Arc<OwnedGeometry>, InstallError> {
    let mut construction = budget.reserve(0).map_err(|_| InstallError::Capacity)?;
    let map_row = rows::take_one_row(import, "sim_map", "[\"world\"]", "map", present)?
        .ok_or(InstallError::ParentPresence)?;
    if !map_row.extra.is_empty() {
        return Err(InstallError::CurrentFormat);
    }
    fund_body(&map_row.payload, &mut construction, budget)?;
    let mut map =
        object(serde_json::from_str(&map_row.payload).map_err(|_| InstallError::CurrentFormat)?)?;
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
            size_of::<Vec<String>>(),
            size_of::<String>(),
            &mut construction,
            budget,
        )?),
    );
    let spatial_row = rows::take_one_row(import, "sim_geometry", &map_row.id, "spatial", true)?
        .ok_or(InstallError::ParentPresence)?;
    if !spatial_row.extra.is_empty() {
        return Err(InstallError::CurrentFormat);
    }
    fund_body(&spatial_row.payload, &mut construction, budget)?;
    let mut spatial = object(
        serde_json::from_str(&spatial_row.payload).map_err(|_| InstallError::CurrentFormat)?,
    )?;
    for (field, table, optional, item_bytes, nested_bytes) in [
        (
            "surfaces",
            "sim_surfaces",
            false,
            size_of::<WalkableSurface>(),
            0,
        ),
        (
            "blockers",
            "sim_blockers",
            false,
            size_of::<SpatialBlocker>(),
            size_of::<Bounds>(),
        ),
        ("levels", "sim_levels", false, size_of::<SpatialLevel>(), 0),
        (
            "scenery",
            "sim_scenery",
            true,
            size_of::<SceneryInstance>(),
            0,
        ),
    ] {
        let present = array_marker(&mut spatial, field, optional)?;
        let values = list(
            import,
            table,
            &spatial_row.id,
            field,
            present,
            Some("id"),
            item_bytes,
            nested_bytes,
            &mut construction,
            budget,
        )?;
        if present {
            spatial.insert(field.to_owned(), Value::Array(values));
        }
    }
    map.insert("spatial".to_owned(), Value::Object(spatial));
    let value =
        serde_json::from_value(Value::Object(map)).map_err(|_| InstallError::CurrentFormat)?;
    OwnedGeometry::from_storage(value, construction, budget).map_err(|_| InstallError::Capacity)
}
