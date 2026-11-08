//! Encoded canonical row transport for the existing PostgreSQL writer.
//!
//! Table/schema/column meaning remains owned by the current server record schema.
//! Semantic native owners construct these products; this module exposes no live
//! record setter and does not infer a new row from an unloaded predecessor.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;

mod layout;
pub use layout::{ChildShape, RecordChild, RecordCodec, RecordLayout};
mod encode;
mod merge;
mod output;
pub(crate) use encode::{EncodedRows, RowEffects, RowEncoder};
mod selection;
pub(crate) use selection::{OrderedMapRows, SelectedPlacement};
mod ledger;
pub(crate) use ledger::{PreparedRecordLedger, RecordLedger};
pub(crate) mod save;
pub use output::{RecordEncodingError, RecordPlacement, RecordSchema};

/// A complete SQL row at an imported fixed cut. `payload` is already encoded by
/// its owning codec and must not be decoded/re-encoded by the Node writer.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct InstalledRow {
    pub id: String,
    pub parent: String,
    pub slot: String,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    pub position: u64,
    pub payload: String,
    pub extra: Vec<Value>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChangedRow {
    pub id: String,
    pub parent: String,
    pub slot: String,
    pub position: u64,
    pub payload: String,
    pub extra: Vec<Value>,
    pub create: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub received_uses_changed: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub write_columns: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub logical_removal: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub received_value_additions: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub received_value_removals: Option<Vec<String>>,
}

/// Each vector keeps canonical row order. PostgreSQL's existing schema owner
/// chooses inter-table dependency order; map order never chooses effect order.
#[derive(Debug, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ChangedRows {
    pub writes: BTreeMap<String, Vec<ChangedRow>>,
    pub deletes: BTreeMap<String, Vec<String>>,
    pub rows: usize,
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    pub expired: BTreeMap<String, Vec<String>>,
}

/// Installation identifies unloaded owners explicitly. An omitted collection is
/// not an empty collection, and hydration carries its original native ordinals.
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct OwnerCoverage {
    pub table: String,
    /// Exact canonical collection record ID (the child row's SQL parent), not
    /// an actor ID that could relabel an otherwise valid personal source.
    pub owner: String,
    pub complete: bool,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    pub next_ordinal: u64,
    pub parent_present: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CurrentRecords {
    pub world_id: String,
    pub database_schema: String,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    pub durable_revision: u64,
    pub generation: String,
    pub entity_ordering: EntityOrdering,
    pub tables: BTreeMap<String, Vec<InstalledRow>>,
    pub coverage: Vec<OwnerCoverage>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EntityOrdering {
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    pub next_insertion: u64,
    pub entries: Vec<EntityOrderingEntry>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct EntityOrderingEntry {
    pub id: String,
    pub key: String,
}

/// The native acknowledgement releases exactly this immutable save prefix;
/// newer changes are owned independently while these bytes are in flight.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveRows {
    pub world_id: String,
    pub generation: String,
    pub prefix: u64,
    pub base_revision: u64,
    pub through_cut: u64,
    /// Exclusive issued-identity high-water copied from IdentityState.next_id at
    /// this exact cut. This is not an independently incremented save allocator.
    pub identity_through: u64,
    pub changes: ChangedRows,
}
