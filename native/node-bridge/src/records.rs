//! Real NAPI output conversion for the canonical row transport. The PostgreSQL
//! schema still owns table/column meanings; the bridge adds no row write API.

use napi::{Error, Result, Status};
use napi_derive::napi;
use openlegend_simulation::identity::MAX_SAFE_INTEGER;
use openlegend_simulation::records::{ChangedRow, ChangedRows, SaveRows};
use serde_json::Value;
use std::collections::BTreeMap;

#[napi(object, object_from_js = false)]
pub struct NativeChangedRow {
    pub id: String,
    pub parent: String,
    pub slot: String,
    pub position: f64,
    pub payload: String,
    // serde_json's actual ToNapiValue conversion supplies JSON values. The
    // conservative declaration matches SQL's unknown column inputs; this is not
    // a declaration pretending to validate arbitrary incoming JavaScript.
    #[napi(ts_type = "unknown[]")]
    pub extra: Vec<Value>,
    pub create: bool,
    pub received_uses_changed: Option<bool>,
    pub write_columns: Option<Vec<String>>,
    pub logical_removal: Option<bool>,
    pub received_value_additions: Option<Vec<String>>,
    pub received_value_removals: Option<Vec<String>>,
}

#[napi(object, object_from_js = false)]
pub struct NativeChangedRows {
    pub writes: BTreeMap<String, Vec<NativeChangedRow>>,
    pub deletes: BTreeMap<String, Vec<String>>,
    pub rows: f64,
    pub expired: Option<BTreeMap<String, Vec<String>>>,
}

#[napi(object, object_from_js = false)]
pub struct NativeSaveRows {
    pub world_id: String,
    pub generation: String,
    pub prefix: f64,
    pub base_revision: f64,
    pub through_cut: f64,
    pub identity_through: f64,
    pub changes: NativeChangedRows,
}

impl TryFrom<ChangedRow> for NativeChangedRow {
    type Error = Error;

    fn try_from(row: ChangedRow) -> Result<Self> {
        Ok(Self {
            id: row.id,
            parent: row.parent,
            slot: row.slot,
            position: safe_number(row.position)?,
            payload: row.payload,
            extra: row.extra,
            create: row.create,
            received_uses_changed: row.received_uses_changed,
            write_columns: row.write_columns,
            logical_removal: row.logical_removal,
            received_value_additions: row.received_value_additions,
            received_value_removals: row.received_value_removals,
        })
    }
}

impl TryFrom<ChangedRows> for NativeChangedRows {
    type Error = Error;

    fn try_from(changes: ChangedRows) -> Result<Self> {
        Ok(Self {
            writes: changes
                .writes
                .into_iter()
                .map(|(table, rows)| {
                    rows.into_iter()
                        .map(NativeChangedRow::try_from)
                        .collect::<Result<Vec<_>>>()
                        .map(|rows| (table, rows))
                })
                .collect::<Result<_>>()?,
            deletes: changes.deletes,
            rows: safe_number(u64::try_from(changes.rows).map_err(|_| range_error())?)?,
            expired: if changes.expired.is_empty() {
                None
            } else {
                Some(changes.expired)
            },
        })
    }
}

impl TryFrom<SaveRows> for NativeSaveRows {
    type Error = Error;

    fn try_from(save: SaveRows) -> Result<Self> {
        Ok(Self {
            world_id: save.world_id,
            generation: save.generation,
            prefix: safe_number(save.prefix)?,
            base_revision: safe_number(save.base_revision)?,
            through_cut: safe_number(save.through_cut)?,
            identity_through: safe_number(save.identity_through)?,
            changes: save.changes.try_into()?,
        })
    }
}

fn safe_number(value: u64) -> Result<f64> {
    // Node's existing writer uses safe integer ordinals and revisions. Reject
    // lossy conversion before transport rather than alias two SQL row positions.
    if value > MAX_SAFE_INTEGER {
        Err(range_error())
    } else {
        Ok(value as f64)
    }
}

fn range_error() -> Error {
    Error::new(
        Status::InvalidArg,
        "native record ordinal or revision exceeds the SQL bridge integer range",
    )
}
