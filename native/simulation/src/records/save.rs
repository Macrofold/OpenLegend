//! One immutable PostgreSQL prefix and an independent accepted suffix. This is
//! output ownership only: semantic mutation and current-record encoding happen
//! before admission here, and SQL still runs through the existing transaction.

use super::merge::merge_changes;
use super::{ChangedRows, RecordEncodingError, RecordSchema, SaveRows};
use crate::host::{ByteBudget, ByteReservation};
use crate::identity::MAX_SAFE_INTEGER;
use serde_json::Value;
use std::{collections::BTreeMap, mem::size_of, sync::Arc};

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) enum SaveError {
    Binding,
    Revision,
    NoChanges,
    Capacity,
    Encoding(RecordEncodingError),
}
impl From<RecordEncodingError> for SaveError {
    fn from(error: RecordEncodingError) -> Self {
        Self::Encoding(error)
    }
}

pub(crate) struct SavePrefix {
    rows: SaveRows,
    presence: BTreeMap<String, BTreeMap<String, bool>>,
    _reservation: ByteReservation,
}
impl SavePrefix {
    pub(crate) fn rows(&self) -> &SaveRows {
        &self.rows
    }
    fn presence(&self, table: &str, id: &str) -> Option<bool> {
        self.presence
            .get(table)
            .and_then(|ids| ids.get(id))
            .copied()
    }
}

pub(crate) struct SaveAcknowledgement<'a> {
    pub world_id: &'a str,
    pub generation: &'a str,
    pub prefix: u64,
    pub base_revision: u64,
    pub revision: u64,
    pub through_cut: u64,
    pub identity_through: u64,
}

pub(crate) struct SaveJournal {
    world_id: String,
    generation: String,
    durable_revision: u64,
    next_prefix: u64,
    through_cut: u64,
    identity_through: u64,
    suffix: ChangedRows,
    suffix_reservation: ByteReservation,
    in_flight: Option<Arc<SavePrefix>>,
    last_acknowledged: Option<AcknowledgedPrefix>,
    budget: ByteBudget,
}

#[derive(Clone, Copy, PartialEq, Eq)]
struct AcknowledgedPrefix {
    prefix: u64,
    base_revision: u64,
    revision: u64,
    through_cut: u64,
    identity_through: u64,
}

impl SaveJournal {
    pub(crate) fn new(
        world_id: String,
        generation: String,
        durable_revision: u64,
        through_cut: u64,
        identity_through: u64,
        budget: ByteBudget,
    ) -> Result<Self, SaveError> {
        if world_id.is_empty()
            || generation.is_empty()
            || [durable_revision, through_cut, identity_through]
                .into_iter()
                .any(|v| v > MAX_SAFE_INTEGER)
        {
            return Err(SaveError::Binding);
        }
        let suffix_reservation = budget.reserve(0).map_err(|_| SaveError::Capacity)?;
        Ok(Self {
            world_id,
            generation,
            durable_revision,
            next_prefix: 1,
            through_cut,
            identity_through,
            suffix: ChangedRows::default(),
            suffix_reservation,
            in_flight: None,
            last_acknowledged: None,
            budget,
        })
    }

    /// Called only after actual native acceptance. The candidate already owns
    /// its temporary encoded products; this reserves retained/merge capacities
    /// before taking them into the asynchronous save owner.
    pub(crate) fn append(
        &mut self,
        through_cut: u64,
        identity_through: u64,
        mut changes: ChangedRows,
        schema: &RecordSchema,
    ) -> Result<(), SaveError> {
        if through_cut <= self.through_cut
            || through_cut > MAX_SAFE_INTEGER
            || identity_through < self.identity_through
            || identity_through > MAX_SAFE_INTEGER
        {
            return Err(SaveError::Binding);
        }
        schema.validate_changes(&changes)?;
        if changes.writes.is_empty() && changes.deletes.is_empty() {
            return Err(SaveError::NoChanges);
        }
        // Rebuild hidden JSON object allocations once at the output boundary.
        // Their fresh known-length maps can then be conservatively accounted;
        // an arbitrary previously-cleared Value map cannot use this bound.
        for rows in changes.writes.values_mut() {
            for row in rows {
                for cell in &mut row.extra {
                    normalize_cell(cell);
                }
            }
        }
        if let Some(prefix) = &self.in_flight {
            // A certified insert already in flight will be present before this
            // suffix can be saved. A preceding deletion establishes absence.
            for (table, rows) in &mut changes.writes {
                for row in rows {
                    if prefix.presence(table, &row.id) == Some(true) {
                        row.create = false;
                    } else if prefix.presence(table, &row.id) == Some(false) {
                        row.create = true;
                        if row.write_columns.is_some() {
                            return Err(SaveError::Encoding(RecordEncodingError(
                                "A row recreated after an in-flight deletion requires its complete body.",
                            )));
                        }
                    }
                }
            }
        }
        let old = changes_heap(&self.suffix).ok_or(SaveError::Capacity)?;
        let new = changes_heap(&changes).ok_or(SaveError::Capacity)?;
        // Fold creates temporary ordered key indexes and vectors. Keep a
        // conservative six-copy allowance until those temporaries are freed.
        let peak = old
            .checked_add(new)
            .and_then(|n| n.checked_mul(6))
            .ok_or(SaveError::Capacity)?;
        self.suffix_reservation
            .resize(peak)
            .map_err(|_| SaveError::Capacity)?;
        let previous = std::mem::take(&mut self.suffix);
        // Both inputs have just passed the same immutable schema. No fallible
        // semantic work remains after moving the previous accepted output.
        self.suffix = merge_changes(previous, changes, schema)
            .expect("validated immutable canonical row merge");
        let actual = changes_heap(&self.suffix).expect("merged output bounded by admitted inputs");
        assert!(
            actual <= peak,
            "merged output capacity exceeds its preflight bound"
        );
        self.suffix_reservation
            .resize(actual)
            .expect("shrinking an admitted reservation");
        self.through_cut = through_cut;
        self.identity_through = identity_through;
        Ok(())
    }

    /// A failed SQL attempt retries this same Arc and prefix. It never drains
    /// newer accepted output into an already advertised database transaction.
    pub(crate) fn capture(&mut self) -> Result<Arc<SavePrefix>, SaveError> {
        if let Some(prefix) = &self.in_flight {
            return Ok(Arc::clone(prefix));
        }
        if self.suffix.writes.is_empty() && self.suffix.deletes.is_empty() {
            return Err(SaveError::NoChanges);
        }
        if self.next_prefix > MAX_SAFE_INTEGER {
            return Err(SaveError::Binding);
        }
        let fixed = size_of::<SavePrefix>()
            .checked_add(2 * size_of::<usize>())
            .and_then(|n| n.checked_add(self.world_id.len()))
            .and_then(|n| n.checked_add(self.generation.len()))
            .ok_or(SaveError::Capacity)?;
        let index_bytes = prefix_index_bound(&self.suffix).ok_or(SaveError::Capacity)?;
        let actual = self
            .suffix_reservation
            .bytes()
            .checked_add(fixed)
            .and_then(|n| n.checked_add(index_bytes))
            .ok_or(SaveError::Capacity)?;
        self.suffix_reservation
            .resize(actual)
            .map_err(|_| SaveError::Capacity)?;
        let replacement = self.budget.reserve(0).map_err(|_| SaveError::Capacity)?;
        let reservation = std::mem::replace(&mut self.suffix_reservation, replacement);
        let presence = prefix_index(&self.suffix);
        let prefix = Arc::new(SavePrefix {
            rows: SaveRows {
                world_id: self.world_id.clone(),
                generation: self.generation.clone(),
                prefix: self.next_prefix,
                base_revision: self.durable_revision,
                through_cut: self.through_cut,
                identity_through: self.identity_through,
                changes: std::mem::take(&mut self.suffix),
            },
            presence,
            _reservation: reservation,
        });
        self.next_prefix += 1;
        self.in_flight = Some(Arc::clone(&prefix));
        Ok(prefix)
    }

    pub(crate) fn acknowledge(&mut self, ack: SaveAcknowledgement<'_>) -> Result<(), SaveError> {
        if ack.world_id != self.world_id || ack.generation != self.generation {
            return Err(SaveError::Binding);
        }
        let completed = AcknowledgedPrefix {
            prefix: ack.prefix,
            base_revision: ack.base_revision,
            revision: ack.revision,
            through_cut: ack.through_cut,
            identity_through: ack.identity_through,
        };
        if self.last_acknowledged == Some(completed) {
            return Ok(());
        }
        let prefix = self.in_flight.as_ref().ok_or(SaveError::Binding)?;
        let rows = &prefix.rows;
        if ack.world_id != rows.world_id
            || ack.generation != rows.generation
            || ack.prefix != rows.prefix
            || ack.base_revision != rows.base_revision
            || ack.through_cut != rows.through_cut
            || ack.identity_through != rows.identity_through
        {
            return Err(SaveError::Binding);
        }
        if ack.revision > MAX_SAFE_INTEGER
            || ack.base_revision.checked_add(1) != Some(ack.revision)
            || self.durable_revision != ack.base_revision
        {
            return Err(SaveError::Revision);
        }
        self.durable_revision = ack.revision;
        self.in_flight = None;
        self.last_acknowledged = Some(completed);
        Ok(())
    }

    pub(crate) fn durable_revision(&self) -> u64 {
        self.durable_revision
    }
}

fn prefix_index(changes: &ChangedRows) -> BTreeMap<String, BTreeMap<String, bool>> {
    let mut index = BTreeMap::new();
    for (table, rows) in &changes.writes {
        let ids = index.entry(table.clone()).or_insert_with(BTreeMap::new);
        for row in rows {
            ids.insert(row.id.clone(), true);
        }
    }
    for (table, rows) in &changes.deletes {
        let ids = index.entry(table.clone()).or_insert_with(BTreeMap::new);
        for id in rows {
            ids.insert(id.clone(), false);
        }
    }
    index
}
fn prefix_index_bound(changes: &ChangedRows) -> Option<usize> {
    let inner_node = tree_node_bound::<String, bool>()?;
    let outer_node = tree_node_bound::<String, BTreeMap<String, bool>>()?;
    let mut bytes = 0_usize;
    for (table, rows) in &changes.writes {
        bytes = bytes
            .checked_add(outer_node)?
            .checked_add(table.capacity())?;
        for row in rows {
            bytes = bytes
                .checked_add(inner_node)?
                .checked_add(row.id.capacity())?;
        }
    }
    for (table, rows) in &changes.deletes {
        bytes = bytes
            .checked_add(outer_node)?
            .checked_add(table.capacity())?;
        for id in rows {
            bytes = bytes.checked_add(inner_node)?.checked_add(id.capacity())?;
        }
    }
    Some(bytes)
}

fn normalize_cell(value: &mut Value) {
    match value {
        Value::Array(values) => {
            for value in values {
                normalize_cell(value);
            }
        }
        Value::Object(values) => {
            let old = std::mem::take(values);
            let mut fresh = serde_json::Map::with_capacity(old.len());
            for (key, mut value) in old {
                normalize_cell(&mut value);
                fresh.insert(key, value);
            }
            *values = fresh;
        }
        _ => {}
    }
}
fn cell_heap(value: &Value) -> Option<usize> {
    use crate::host::retained_size::map_storage;
    match value {
        Value::String(text) => Some(text.capacity()),
        Value::Array(values) => values.iter().try_fold(
            values.capacity().checked_mul(size_of::<Value>())?,
            |sum, value| sum.checked_add(cell_heap(value)?),
        ),
        Value::Object(values) => values.iter().try_fold(
            map_storage::<String, Value>(values.len())?,
            |sum, (key, value)| {
                sum.checked_add(key.capacity())?
                    .checked_add(cell_heap(value)?)
            },
        ),
        _ => Some(0),
    }
}
fn tree_heap<K, V>(
    map: &BTreeMap<K, V>,
    mut entry: impl FnMut(&K, &V) -> Option<usize>,
) -> Option<usize> {
    // Supported pinned Rust's B-tree nodes contain at most eleven key/value
    // slots and twelve edges. One full node per live entry is deliberately an
    // upper bound, including parent/alignment fields, even after removals.
    let node = tree_node_bound::<K, V>()?;
    map.iter()
        .try_fold(map.len().checked_mul(node)?, |sum, (key, value)| {
            sum.checked_add(entry(key, value)?)
        })
}
fn tree_node_bound<K, V>() -> Option<usize> {
    11_usize
        .checked_mul(size_of::<K>().checked_add(size_of::<V>())?)?
        .checked_add(16 * size_of::<usize>())
}
fn strings_heap(values: &Vec<String>) -> Option<usize> {
    values.iter().try_fold(
        values.capacity().checked_mul(size_of::<String>())?,
        |sum, value| sum.checked_add(value.capacity()),
    )
}
fn changes_heap(changes: &ChangedRows) -> Option<usize> {
    let writes = tree_heap(&changes.writes, |table, rows| {
        rows.iter().try_fold(
            table.capacity().checked_add(
                rows.capacity()
                    .checked_mul(size_of::<super::ChangedRow>())?,
            )?,
            |sum, row| {
                let mut bytes = sum;
                for text in [&row.id, &row.parent, &row.slot, &row.payload] {
                    bytes = bytes.checked_add(text.capacity())?;
                }
                bytes = bytes.checked_add(row.extra.capacity().checked_mul(size_of::<Value>())?)?;
                for cell in &row.extra {
                    bytes = bytes.checked_add(cell_heap(cell)?)?;
                }
                for strings in [
                    &row.write_columns,
                    &row.received_value_additions,
                    &row.received_value_removals,
                ]
                .into_iter()
                .flatten()
                {
                    bytes = bytes.checked_add(strings_heap(strings)?)?;
                }
                Some(bytes)
            },
        )
    })?;
    let deletes = tree_heap(&changes.deletes, |table, ids| {
        table.capacity().checked_add(strings_heap(ids)?)
    })?;
    let expired = tree_heap(&changes.expired, |table, ids| {
        table.capacity().checked_add(strings_heap(ids)?)
    })?;
    writes.checked_add(deletes)?.checked_add(expired)
}
