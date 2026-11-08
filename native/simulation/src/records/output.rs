//! Canonical identities and finite compiled row layouts. Encoders borrow the
//! actual semantic owner; this index retains neither a second body nor children.

use super::{ChangedRow, ChangedRows, InstalledRow, RecordLayout};
use crate::identity::MAX_SAFE_INTEGER;
use serde::Serialize;
use serde_json::Value;
use std::collections::{BTreeMap, BTreeSet};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RecordEncodingError(pub &'static str);
impl std::fmt::Display for RecordEncodingError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.0)
    }
}
impl std::error::Error for RecordEncodingError {}

#[derive(Debug)]
pub struct RecordPlacement {
    pub id: String,
    pub parent: String,
    pub slot: String,
    pub position: u64,
}
impl RecordPlacement {
    pub fn from_row(row: &InstalledRow) -> Self {
        Self {
            id: row.id.clone(),
            parent: row.parent.clone(),
            slot: row.slot.clone(),
            position: row.position,
        }
    }
}

/// One schema per installation, supplied by the unchanged PostgreSQL schema
/// owner. Only its already compiled codecs are accepted; there is no DSL or
/// function transport. A named column always has its existing schema ordinal.
#[derive(Debug)]
pub struct RecordSchema {
    layouts: BTreeMap<String, RecordLayout>,
}
impl RecordSchema {
    pub fn install(layouts: Vec<RecordLayout>) -> Result<Self, RecordEncodingError> {
        let mut indexed = BTreeMap::new();
        for layout in layouts {
            let columns: BTreeSet<_> = layout.columns.iter().collect();
            let children: BTreeSet<_> = layout.children.iter().map(|child| &child.field).collect();
            if layout.table.is_empty()
                || columns.len() != layout.columns.len()
                || children.len() != layout.children.len()
                || columns.contains(&String::new())
                || children.contains(&String::new())
                || indexed.insert(layout.table.clone(), layout).is_some()
            {
                return Err(RecordEncodingError("Invalid current record layout."));
            }
        }
        Ok(Self { layouts: indexed })
    }

    pub fn layout(&self, table: &str) -> Result<&RecordLayout, RecordEncodingError> {
        self.layouts
            .get(table)
            .ok_or(RecordEncodingError("Record table has no installed layout."))
    }

    /// Child projection stops before any child collection traversal. Extra SQL
    /// cells come from that semantic owner's complete current projection, never
    /// supplied JavaScript column functions or a guessed JSON-path extractor.
    pub fn encode<T: Serialize + ?Sized>(
        &self,
        table: &str,
        placement: &RecordPlacement,
        value: &T,
        extra: Vec<Value>,
        create: bool,
    ) -> Result<ChangedRow, RecordEncodingError> {
        let payload = self.layout(table)?.project(value).map_err(|_| {
            RecordEncodingError("Canonical row encoding requires its actual codec.")
        })?;
        self.encoded(table, placement, payload, extra, create)
    }

    /// Owned compact codecs use this entry after producing their actual bytes;
    /// it never parses a rich body only to pack it again.
    pub fn encoded(
        &self,
        table: &str,
        placement: &RecordPlacement,
        payload: String,
        extra: Vec<Value>,
        create: bool,
    ) -> Result<ChangedRow, RecordEncodingError> {
        if placement.position > MAX_SAFE_INTEGER || extra.len() != self.layout(table)?.columns.len()
        {
            return Err(RecordEncodingError(
                "Canonical row column count or ordinal disagrees.",
            ));
        }
        Ok(ChangedRow {
            id: placement.id.clone(),
            parent: placement.parent.clone(),
            slot: placement.slot.clone(),
            position: placement.position,
            payload,
            extra,
            create,
            received_uses_changed: None,
            write_columns: None,
            logical_removal: None,
            received_value_additions: None,
            received_value_removals: None,
        })
    }

    pub(crate) fn validate_changes(
        &self,
        changes: &ChangedRows,
    ) -> Result<(), RecordEncodingError> {
        let mut count = 0_usize;
        for (table, rows) in &changes.writes {
            let layout = self.layout(table)?;
            let mut identities = BTreeSet::new();
            for row in rows {
                if row.position > MAX_SAFE_INTEGER
                    || row.extra.len() != layout.columns.len()
                    || !identities.insert(&row.id)
                    || row.write_columns.as_ref().is_some_and(|mask| {
                        row.create || mask.iter().any(|column| !layout.columns.contains(column))
                    })
                    || changes
                        .deletes
                        .get(table)
                        .is_some_and(|ids| ids.contains(&row.id))
                {
                    return Err(RecordEncodingError(
                        "Changed canonical row has invalid ownership or columns.",
                    ));
                }
                count = count
                    .checked_add(1)
                    .ok_or(RecordEncodingError("Changed row count overflow."))?;
            }
        }
        for (table, ids) in &changes.deletes {
            self.layout(table)?;
            if ids.iter().collect::<BTreeSet<_>>().len() != ids.len() {
                return Err(RecordEncodingError("Duplicate canonical row deletion."));
            }
        }
        for table in changes.expired.keys() {
            self.layout(table)?;
        }
        if count != changes.rows {
            return Err(RecordEncodingError("Changed row count disagrees."));
        }
        Ok(())
    }
}
