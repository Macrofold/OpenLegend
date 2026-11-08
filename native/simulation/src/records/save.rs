//! One immutable PostgreSQL prefix and an independent accepted suffix. This is
//! output ownership only: semantic mutation and current-record encoding happen
//! before admission here, and SQL still runs through the existing transaction.

use super::SqlCell;
use super::merge::merge_changes;
use super::{ChangedRows, RecordEncodingError, RecordSchema, SaveRows};
use crate::host::retained_size::tree_node_bound;
use crate::host::{AcceptedCandidate, ByteBudget, ByteReservation, CandidateKey};
use crate::identity::MAX_SAFE_INTEGER;
use std::{collections::BTreeMap, mem::size_of, sync::Arc};

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) enum SaveError {
    Binding,
    Revision,
    NoChanges,
    Preparing,
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

pub(crate) struct TemporalSaveCut<'a> {
    pub world_id: &'a str,
    pub generation: &'a str,
    pub through_cut: u64,
    pub identity_through: u64,
    pub temporal: &'a crate::received::TemporalState,
}

/// A fixed-size capability for the private incoming suffix. The real rows and
/// their complete merge allowance remain in their owning save journal.
pub(crate) struct PreparedSaveAppend {
    owner: Arc<()>,
    candidate: CandidateKey,
    serial: u64,
}
struct PendingAppend {
    candidate: CandidateKey,
    serial: u64,
    through_cut: u64,
    identity_through: u64,
    changes: ChangedRows,
    schema: Arc<RecordSchema>,
    reservation: ByteReservation,
}
pub(crate) struct SaveJournal {
    owner: Arc<()>,
    next_admission: u64,
    pending_append: Option<PendingAppend>,
    world_id: String,
    generation: String,
    durable_revision: u64,
    next_prefix: u64,
    through_cut: u64,
    identity_through: u64,
    durable_identity_through: u64,
    suffix: ChangedRows,
    suffix_reservation: ByteReservation,
    in_flight: Option<Arc<SavePrefix>>,
    last_acknowledged: Option<AcknowledgedPrefix>,
    budget: ByteBudget,
    _reservation: ByteReservation,
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
        let reservation = budget
            .reserve(
                size_of::<Self>()
                    .checked_add(world_id.capacity())
                    .and_then(|n| n.checked_add(generation.capacity()))
                    .and_then(|n| n.checked_add(2 * size_of::<usize>()))
                    .ok_or(SaveError::Capacity)?,
            )
            .map_err(|_| SaveError::Capacity)?;
        let suffix_reservation = budget.reserve(0).map_err(|_| SaveError::Capacity)?;
        Ok(Self {
            _reservation: reservation,
            owner: Arc::new(()),
            next_admission: 0,
            pending_append: None,
            world_id,
            generation,
            durable_revision,
            next_prefix: 1,
            through_cut,
            identity_through,
            durable_identity_through: identity_through,
            suffix: ChangedRows::default(),
            suffix_reservation,
            in_flight: None,
            last_acknowledged: None,
            budget,
        })
    }

    /// Fund and validate all accumulating-save work before Ready/accept. The
    /// accepted suffix stays unchanged on refusal; only this private incoming
    /// product is held until the exact candidate settles. SQL may acknowledge
    /// an older in-flight prefix while this admission is outstanding.
    pub(crate) fn prepare_append(
        &mut self,
        candidate: CandidateKey,
        identity_through: u64,
        mut changes: ChangedRows,
        schema: &Arc<RecordSchema>,
    ) -> Result<PreparedSaveAppend, SaveError> {
        let through_cut = candidate
            .base_cut
            .checked_add(1)
            .ok_or(SaveError::Binding)?;
        if self.pending_append.is_some() {
            return Err(SaveError::Preparing);
        }
        if candidate.base_cut != self.through_cut
            || through_cut > MAX_SAFE_INTEGER
            || identity_through < self.identity_through
            || identity_through > MAX_SAFE_INTEGER
        {
            return Err(SaveError::Binding);
        }
        schema.validate_changes(&changes)?;
        if changes.writes.is_empty() && changes.deletes.is_empty() && changes.expired.is_empty() {
            return Err(SaveError::NoChanges);
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
        let reservation = self.budget.reserve(peak).map_err(|_| SaveError::Capacity)?;
        let serial = self
            .next_admission
            .checked_add(1)
            .ok_or(SaveError::Binding)?;
        self.next_admission = serial;
        self.pending_append = Some(PendingAppend {
            candidate,
            serial,
            through_cut,
            identity_through,
            changes,
            schema: Arc::clone(schema),
            reservation,
        });
        Ok(PreparedSaveAppend {
            owner: Arc::clone(&self.owner),
            candidate,
            serial,
        })
    }
    pub(crate) fn validate_prepared(&self, prepared: &PreparedSaveAppend) -> Result<(), SaveError> {
        let pending = self.pending_append.as_ref().ok_or(SaveError::Binding)?;
        if !Arc::ptr_eq(&prepared.owner, &self.owner)
            || prepared.candidate != pending.candidate
            || prepared.serial != pending.serial
            || prepared.candidate.base_cut != self.through_cut
        {
            return Err(SaveError::Binding);
        }
        Ok(())
    }
    pub(crate) fn reject_append(&mut self, prepared: PreparedSaveAppend) -> Result<(), SaveError> {
        self.validate_prepared(&prepared)?;
        self.pending_append = None;
        Ok(())
    }
    /// The caller validates this fixed-size token immediately before the fence
    /// flips. All row validation and fallible capacity work is already done;
    /// the accepted merge has no new capacity admission or gameplay callback.
    pub(crate) fn accept_append(
        &mut self,
        prepared: PreparedSaveAppend,
        accepted: &AcceptedCandidate,
    ) -> Result<(), SaveError> {
        self.validate_prepared(&prepared)?;
        if accepted.key() != prepared.candidate {
            return Err(SaveError::Binding);
        }
        let pending = self
            .pending_append
            .take()
            .expect("validated pending append");
        let peak = pending.reservation.bytes();
        let previous_guard = std::mem::replace(&mut self.suffix_reservation, pending.reservation);
        let previous = std::mem::take(&mut self.suffix);
        self.suffix = merge_changes(previous, pending.changes, &pending.schema)
            .expect("validated immutable canonical row merge");
        drop(previous_guard);
        let actual = changes_heap(&self.suffix).expect("merged output bounded by admitted inputs");
        assert!(
            actual <= peak,
            "merged output capacity exceeds its preflight bound"
        );
        self.suffix_reservation
            .resize(actual)
            .expect("shrinking an admitted reservation");
        self.through_cut = pending.through_cut;
        self.identity_through = pending.identity_through;
        Ok(())
    }

    /// A failed SQL attempt retries this same Arc and prefix. It never drains
    /// newer accepted output into an already advertised database transaction.
    pub(crate) fn capture(
        &mut self,
        cut: TemporalSaveCut<'_>,
        limits: crate::received::TemporalSaveLimits,
        schema: &RecordSchema,
        scratch: &ByteBudget,
    ) -> Result<Arc<SavePrefix>, SaveError> {
        if cut.world_id != self.world_id || cut.generation != self.generation {
            return Err(SaveError::Binding);
        }
        if let Some(prefix) = &self.in_flight {
            return Ok(Arc::clone(prefix));
        }
        // An already detached prefix above remains retryable. A new capture
        // would move the suffix whose merge allowance is currently admitted.
        // Defer that capture until settlement, without a SQL durability barrier.
        if self.pending_append.is_some() {
            return Err(SaveError::Preparing);
        }
        if cut.through_cut != self.through_cut || cut.identity_through != self.identity_through {
            return Err(SaveError::Binding);
        }
        let pages = crate::received::pack_temporal_save(
            cut.temporal,
            cut.world_id,
            Some(self.durable_identity_through),
            limits,
            schema,
            scratch,
        )?;
        if pages.changes().rows > 0 {
            schema.validate_changes(&self.suffix)?;
            let (pages, _owners, _reservation) = pages.into_parts();
            let bytes = changes_heap(&self.suffix)
                .and_then(|bytes| bytes.checked_add(changes_heap(&pages)?))
                .and_then(|bytes| bytes.checked_mul(6))
                .ok_or(SaveError::Capacity)?;
            self.suffix_reservation
                .resize(bytes)
                .map_err(|_| SaveError::Capacity)?;
            let previous = std::mem::take(&mut self.suffix);
            // Both inputs just passed this same immutable schema. Folding
            // changes only owned output and cannot fail after this move.
            self.suffix = merge_changes(previous, pages, schema)
                .expect("checked current changed-row layouts");
            self.suffix_reservation
                .resize(changes_heap(&self.suffix).ok_or(SaveError::Capacity)?)
                .expect("shrinking an admitted save reservation");
        }
        if self.suffix.writes.is_empty()
            && self.suffix.deletes.is_empty()
            && self.suffix.expired.is_empty()
        {
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
        self.durable_identity_through = ack.identity_through;
        self.in_flight = None;
        self.last_acknowledged = Some(completed);
        Ok(())
    }

    pub(crate) fn durable_revision(&self) -> u64 {
        self.durable_revision
    }
    pub(crate) fn durable_identity_through(&self) -> u64 {
        self.durable_identity_through
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

pub(crate) fn cell_heap(value: &SqlCell) -> Option<usize> {
    crate::host::retained_size::HeapBytes::heap_bytes(value)
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
                bytes =
                    bytes.checked_add(row.extra.capacity().checked_mul(size_of::<SqlCell>())?)?;
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
