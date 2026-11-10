//! One immutable PostgreSQL prefix and an independent accepted suffix. This is
//! output ownership only: semantic mutation and current-record encoding happen
//! before admission here, and SQL still runs through the existing transaction.

use super::SqlCell;
use super::merge::{merge_changes, merge_workspace_bound};
use super::{ChangedRows, RecordEncodingError, RecordSchema, SaveRows};
use crate::host::retained_size::tree_node_bound;
use crate::host::{AcceptedCandidate, ByteBudget, ByteReservation, CandidateKey};
use crate::identity::MAX_SAFE_INTEGER;
use std::{collections::BTreeMap, mem::size_of, sync::Arc};
mod protected;

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
    temporal_residency: Arc<crate::received::SavedTemporalResidency>,
    _reservation: ByteReservation,
}
impl SavePrefix {
    pub(crate) fn rows(&self) -> &SaveRows {
        &self.rows
    }
    pub(crate) fn temporal_residency(&self) -> &Arc<crate::received::SavedTemporalResidency> {
        &self.temporal_residency
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
    _workspace: ByteReservation,
    protected: Option<Arc<SavePrefix>>,
}
pub(crate) struct SaveJournal {
    owner: Arc<()>,
    next_admission: u64,
    pending_append: Option<PendingAppend>,
    world_id: String,
    generation: String,
    durable_revision: u64,
    initial_cut: u64,
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

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SaveReadMetadata {
    pub durable_revision: u64,
    pub durable_cut: u64,
    pub through_cut: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub in_flight_through: Option<u64>,
    /// Earlier logical batches are already represented by the closed prefix.
    pub represented_before: u64,
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
            initial_cut: through_cut,
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

    pub(crate) fn read_metadata(&self) -> Result<SaveReadMetadata, SaveError> {
        if self.pending_append.is_some() {
            return Err(SaveError::Preparing);
        }
        Ok(SaveReadMetadata {
            durable_revision: self.durable_revision,
            durable_cut: self.durable_cut(),
            through_cut: self.through_cut,
            in_flight_through: self
                .in_flight
                .as_ref()
                .map(|prefix| prefix.rows.through_cut),
            represented_before: self
                .in_flight
                .as_ref()
                .map_or(self.durable_identity_through, |prefix| {
                    prefix.rows.identity_through
                }),
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
        scratch: &ByteBudget,
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
        // Payload ownership moves into the pending owner. Only the temporary
        // key/vector fold belongs to the shared candidate scratch allowance.
        // A coherent accepted call may leave every saved record unchanged.
        // Advance its publication binding without copying the existing suffix
        // or manufacturing a SQL write solely to carry that operational cut.
        let unchanged =
            changes.writes.is_empty() && changes.deletes.is_empty() && changes.expired.is_empty();
        let workspace_bytes = if unchanged {
            0
        } else {
            merge_workspace_bound(&self.suffix, &changes).ok_or(SaveError::Capacity)?
        };
        let workspace = scratch
            .reserve(workspace_bytes)
            .map_err(|_| SaveError::Capacity)?;
        let additional = if unchanged {
            0
        } else {
            changes_heap(&changes)
                .and_then(|n| n.checked_add(workspace_bytes))
                .ok_or(SaveError::Capacity)?
        };
        self.suffix_reservation
            .bytes()
            .checked_add(additional)
            .ok_or(SaveError::Capacity)?;
        let reservation = self
            .budget
            .reserve(additional)
            .map_err(|_| SaveError::Capacity)?;
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
            _workspace: workspace,
            protected: None,
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
    /// Borrow the real funded incoming delta for an immutable application read
    /// overlay. This grants no append or acceptance authority.
    pub(crate) fn prepared_changes(
        &self,
        prepared: &PreparedSaveAppend,
    ) -> Result<&ChangedRows, SaveError> {
        self.validate_prepared(prepared)?;
        let pending = self.pending_append.as_ref().ok_or(SaveError::Binding)?;
        Ok(pending
            .protected
            .as_ref()
            .map_or(&pending.changes, |prefix| &prefix.rows.changes))
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
        if let Some(prefix) = pending.protected {
            // SQL has already committed these exact private rows, either as an
            // ordinary protected prefix or a complete restored installation.
            // Its bodies,
            // presence index and residency were funded before Ready; acceptance
            // only installs that same owner so the exact ACK can follow.
            self.through_cut = pending.through_cut;
            self.identity_through = pending.identity_through;
            self.next_prefix += 1;
            self.in_flight = Some(prefix);
            return Ok(());
        }
        if pending.changes.writes.is_empty()
            && pending.changes.deletes.is_empty()
            && pending.changes.expired.is_empty()
        {
            self.through_cut = pending.through_cut;
            self.identity_through = pending.identity_through;
            return Ok(());
        }
        let previous_guard = std::mem::replace(&mut self.suffix_reservation, pending.reservation);
        self.suffix_reservation
            .merge(previous_guard)
            .expect("same pending-save owner, preflighted complete capacity");
        let peak = self.suffix_reservation.bytes();
        let previous = std::mem::take(&mut self.suffix);
        self.suffix = merge_changes(previous, pending.changes, &pending.schema)
            .expect("validated immutable canonical row merge");
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
        ledger: &mut super::RecordLedger,
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
            &cut,
            &self.suffix,
            Some(self.durable_identity_through),
            limits,
            schema,
            scratch,
        )?;
        // A real accepted cut can have no gameplay rows while the application
        // still owes its command receipt or control outcome. Give that cut the
        // same immutable SQL prefix/ACK path; never invent host writes here.
        if self.suffix.writes.is_empty()
            && self.suffix.deletes.is_empty()
            && self.suffix.expired.is_empty()
            && pages.changes().rows == 0
            && self.durable_cut() == self.through_cut
        {
            return Err(SaveError::NoChanges);
        }
        if self.next_prefix > MAX_SAFE_INTEGER {
            return Err(SaveError::Binding);
        }
        schema.validate_changes(&self.suffix)?;
        let fixed = size_of::<SavePrefix>()
            .checked_add(2 * size_of::<usize>())
            .and_then(|n| n.checked_add(self.world_id.len()))
            .and_then(|n| n.checked_add(self.generation.len()))
            .ok_or(SaveError::Capacity)?;
        let old = changes_heap(&self.suffix).ok_or(SaveError::Capacity)?;
        let new = changes_heap(pages.changes()).ok_or(SaveError::Capacity)?;
        let index = prefix_index_bound(&self.suffix)
            .and_then(|n| n.checked_add(prefix_index_bound(pages.changes())?))
            .ok_or(SaveError::Capacity)?;
        // Fund the complete merge, fixed prefix and its presence index before
        // moving any accepted suffix. A refused capture must not leave packed
        // pages behind to be repacked with later gameplay into overlapping rows.
        let workspace_bytes =
            merge_workspace_bound(&self.suffix, pages.changes()).ok_or(SaveError::Capacity)?;
        let _workspace = scratch
            .reserve(workspace_bytes)
            .map_err(|_| SaveError::Capacity)?;
        let additional = new
            .checked_add(workspace_bytes)
            .and_then(|n| n.checked_add(index))
            .and_then(|n| n.checked_add(fixed))
            .ok_or(SaveError::Capacity)?;
        let peak = old.checked_add(additional).ok_or(SaveError::Capacity)?;
        let projection =
            ledger.prepare_temporal_pages(cut.through_cut, pages.changes(), pages.owners())?;
        let additional = self
            .budget
            .reserve(additional)
            .map_err(|_| SaveError::Capacity)?;
        let replacement = self.budget.reserve(0).map_err(|_| SaveError::Capacity)?;
        let (pages, owners, pages_guard, temporal_residency) = pages.into_parts();
        self.suffix_reservation
            .merge(additional)
            .expect("same pending-save owner, preflighted prefix capacity");
        let previous = std::mem::take(&mut self.suffix);
        let changes = merge_changes(previous, pages, schema)
            .expect("validated immutable save inputs with complete capacity admission");
        drop(owners);
        drop(pages_guard);
        let reservation = std::mem::replace(&mut self.suffix_reservation, replacement);
        debug_assert!(reservation.bytes() >= peak);
        let prefix = self.finish_prefix(&cut, changes, temporal_residency, reservation);
        ledger
            .apply_temporal_pages(projection)
            .expect("validated same-cut temporal save placement metadata");
        self.next_prefix += 1;
        self.in_flight = Some(Arc::clone(&prefix));
        Ok(prefix)
    }

    pub(crate) fn acknowledge(
        &mut self,
        ack: SaveAcknowledgement<'_>,
    ) -> Result<Option<Arc<crate::received::SavedTemporalResidency>>, SaveError> {
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
            return Ok(None);
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
        let residency = Arc::clone(prefix.temporal_residency());
        self.durable_revision = ack.revision;
        self.durable_identity_through = ack.identity_through;
        self.in_flight = None;
        self.last_acknowledged = Some(completed);
        Ok(Some(residency))
    }

    pub(crate) fn durable_revision(&self) -> u64 {
        self.durable_revision
    }
    pub(crate) fn barrier_complete(&self) -> bool {
        self.pending_append.is_none()
            && self.in_flight.is_none()
            && self.durable_identity_through == self.identity_through
            && self.suffix.rows == 0
            && self.suffix.expired.is_empty()
            && self.durable_cut() == self.through_cut
    }
    fn durable_cut(&self) -> u64 {
        self.last_acknowledged
            .as_ref()
            .map_or(self.initial_cut, |ack| ack.through_cut)
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
