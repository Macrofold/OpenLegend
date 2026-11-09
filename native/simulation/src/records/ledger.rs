//! Accepted durable placements and completeness without retained row bodies.
//! SQL acknowledgement advances its own prefix; this metadata advances with
//! actual accepted candidates so an unsaved suffix never reuses retired slots.
use super::{ChangedRows, CurrentRecords, OwnerCoverage, RecordEncodingError, RecordPlacement};
use crate::host::retained_size::{heap_sum, map_storage};
use crate::host::{AcceptedCandidate, ByteBudget, ByteReservation, CandidateKey};
use indexmap::IndexMap;
mod hydration;
pub(crate) use hydration::PreparedHydrationLedger;
use std::{mem::size_of, sync::Arc};

pub(crate) struct RecordLedger {
    rows: IndexMap<String, IndexMap<String, RecordPlacement>>,
    owners: IndexMap<String, IndexMap<String, OwnerCoverage>>,
    world_settings_template: String,
    host_settings_template: String,
    accepted_cut: u64,
    identity: Arc<()>,
    payload_bytes: usize,
    budget: ByteBudget,
    reservation: ByteReservation,
}
struct RowEdit {
    table: String,
    id: String,
    after: Option<RecordPlacement>,
}
struct OwnerEdit {
    table: String,
    id: String,
    after: OwnerCoverage,
}
struct PreparedMetadata {
    world_template: Option<String>,
    host_template: Option<String>,
    identity: Arc<()>,
    after_payload: usize,
    after_bytes: usize,
    rows: Vec<RowEdit>,
    owners: Vec<OwnerEdit>,
    reservation: ByteReservation,
}
pub(crate) struct PreparedRecordLedger {
    key: CandidateKey,
    after_cut: u64,
    metadata: PreparedMetadata,
}
/// Physical page placement is save-layout metadata at the same gameplay cut.
/// It is intentionally not an accepted-candidate capability or a row body.
pub(crate) struct PreparedTemporalPageLedger(PreparedSameCutLedger);
struct PreparedSameCutLedger {
    identity: Arc<()>,
    accepted_cut: u64,
    metadata: Option<PreparedMetadata>,
    next_identity: Option<Arc<()>>,
    identity_reservation: Option<ByteReservation>,
}
fn error() -> RecordEncodingError {
    RecordEncodingError("Accepted record metadata has unavailable binding, placement or capacity.")
}
fn row_bytes(key: &str, row: &RecordPlacement) -> Option<usize> {
    heap_sum([
        key.len(),
        row.id.capacity(),
        row.parent.capacity(),
        row.slot.capacity(),
    ])
}
fn owner_bytes(key: &str, owner: &OwnerCoverage) -> Option<usize> {
    heap_sum([key.len(), owner.table.capacity(), owner.owner.capacity()])
}
impl RecordLedger {
    pub(crate) fn accepted_cut(&self) -> u64 {
        self.accepted_cut
    }
    pub(crate) fn from_records(
        records: &CurrentRecords,
        accepted_cut: u64,
        budget: &ByteBudget,
    ) -> Result<Self, RecordEncodingError> {
        if accepted_cut > crate::identity::MAX_SAFE_INTEGER {
            return Err(error());
        }
        let mut bound = heap_sum([
            size_of::<Self>(),
            map_storage::<String, IndexMap<String, RecordPlacement>>(records.tables.len())
                .ok_or_else(error)?,
            map_storage::<String, IndexMap<String, OwnerCoverage>>(records.coverage.len())
                .ok_or_else(error)?,
        ])
        .ok_or_else(error)?;
        for (table, values) in &records.tables {
            bound = heap_sum([
                bound,
                table.len(),
                map_storage::<String, RecordPlacement>(values.len()).ok_or_else(error)?,
            ])
            .ok_or_else(error)?;
            for row in values {
                bound = heap_sum([
                    bound,
                    row.id.len().checked_mul(2).ok_or_else(error)?,
                    row.parent.len(),
                    row.slot.len(),
                ])
                .ok_or_else(error)?;
            }
        }
        for coverage in &records.coverage {
            bound = heap_sum([
                bound,
                coverage.table.len().checked_mul(2).ok_or_else(error)?,
                coverage.owner.len().checked_mul(2).ok_or_else(error)?,
                map_storage::<String, OwnerCoverage>(1).ok_or_else(error)?,
            ])
            .ok_or_else(error)?;
        }
        let template = |table: &str, id: &str| -> Result<&str, RecordEncodingError> {
            records
                .tables
                .get(table)
                .and_then(|rows| rows.iter().find(|row| row.id == id))
                .map(|row| row.payload.as_str())
                .ok_or_else(error)
        };
        let world = template("world_settings", "[\"world\"]")?;
        let host = template("data_world", "[]")?;
        bound = heap_sum([bound, world.len(), host.len()]).ok_or_else(error)?;
        let reservation = budget.reserve(bound).map_err(|_| error())?;
        let mut rows = IndexMap::with_capacity(records.tables.len());
        for (table, values) in &records.tables {
            let mut table_rows = IndexMap::with_capacity(values.len());
            for row in values {
                if table_rows
                    .insert(row.id.clone(), RecordPlacement::from_row(row))
                    .is_some()
                {
                    return Err(error());
                }
            }
            rows.insert(table.clone(), table_rows);
        }
        let mut owners: IndexMap<String, IndexMap<String, OwnerCoverage>> =
            IndexMap::with_capacity(records.coverage.len());
        for coverage in &records.coverage {
            if owners
                .entry(coverage.table.clone())
                .or_default()
                .insert(coverage.owner.clone(), coverage.clone())
                .is_some()
            {
                return Err(error());
            }
        }
        let mut value = Self {
            rows,
            owners,
            world_settings_template: world.into(),
            host_settings_template: host.into(),
            accepted_cut,
            identity: Arc::new(()),
            payload_bytes: 0,
            budget: budget.clone(),
            reservation,
        };
        value.payload_bytes = value
            .rows
            .values()
            .flat_map(|rows| rows.iter())
            .try_fold(0usize, |bytes, (id, row)| {
                bytes.checked_add(row_bytes(id, row)?)
            })
            .and_then(|bytes| {
                value
                    .owners
                    .values()
                    .flat_map(|owners| owners.iter())
                    .try_fold(bytes, |bytes, (id, owner)| {
                        bytes.checked_add(owner_bytes(id, owner)?)
                    })
            })
            .ok_or_else(error)?;
        value
            .reservation
            .resize(value.resident_bytes()?)
            .map_err(|_| error())?;
        Ok(value)
    }
    fn map_bytes(&self) -> Result<usize, RecordEncodingError> {
        let mut bytes = heap_sum([
            map_storage::<String, IndexMap<String, RecordPlacement>>(self.rows.capacity())
                .ok_or_else(error)?,
            map_storage::<String, IndexMap<String, OwnerCoverage>>(self.owners.capacity())
                .ok_or_else(error)?,
        ])
        .ok_or_else(error)?;
        for (table, rows) in &self.rows {
            bytes = heap_sum([
                bytes,
                table.capacity(),
                map_storage::<String, RecordPlacement>(rows.capacity()).ok_or_else(error)?,
            ])
            .ok_or_else(error)?;
        }
        for (table, owners) in &self.owners {
            bytes = heap_sum([
                bytes,
                table.capacity(),
                map_storage::<String, OwnerCoverage>(owners.capacity()).ok_or_else(error)?,
            ])
            .ok_or_else(error)?;
        }
        Ok(bytes)
    }
    fn resident_bytes(&self) -> Result<usize, RecordEncodingError> {
        heap_sum([
            size_of::<Self>() + 2 * size_of::<usize>(),
            self.map_bytes()?,
            self.payload_bytes,
            self.world_settings_template.capacity(),
            self.host_settings_template.capacity(),
        ])
        .ok_or_else(error)
    }
    pub(crate) fn placement(&self, table: &str, id: &str) -> Option<&RecordPlacement> {
        self.rows.get(table).and_then(|rows| rows.get(id))
    }
    /// Actual metadata under this canonical collection owner. Completeness is
    /// separately established by coverage; missing residency never means empty.
    pub(crate) fn placements<'a>(
        &'a self,
        table: &str,
        parent: &'a str,
    ) -> impl Iterator<Item = &'a RecordPlacement> {
        self.rows
            .get(table)
            .into_iter()
            .flat_map(|rows| rows.values())
            .filter(move |row| row.parent == parent)
    }
    pub(crate) fn coverage(&self, table: &str, owner: &str) -> Option<&OwnerCoverage> {
        self.owners.get(table).and_then(|owners| owners.get(owner))
    }
    pub(crate) fn presence(&self, table: &str, id: &str, owner: &str) -> Option<bool> {
        if self.placement(table, id).is_some() {
            return Some(true);
        }
        self.coverage(table, owner)
            .and_then(|coverage| (!coverage.parent_present || coverage.complete).then_some(false))
    }
    pub(crate) fn world_settings_template(&self) -> &str {
        &self.world_settings_template
    }
    pub(crate) fn host_settings_template(&self) -> &str {
        &self.host_settings_template
    }
    /// Only backing capacity may change here. A refused proposal changes no
    /// accepted row, completeness, ordinal or cut. All future insertion slots
    /// and transferred strings are funded before the host may expose Ready.
    pub(crate) fn prepare_accepted(
        &mut self,
        key: CandidateKey,
        changes: &ChangedRows,
        observed: &[OwnerCoverage],
    ) -> Result<PreparedRecordLedger, RecordEncodingError> {
        if key.base_cut != self.accepted_cut {
            return Err(error());
        }
        let after_cut = key
            .base_cut
            .checked_add(1)
            .filter(|cut| *cut <= crate::identity::MAX_SAFE_INTEGER)
            .ok_or_else(error)?;
        let metadata = self.prepare_metadata(changes, observed)?;
        Ok(PreparedRecordLedger {
            key,
            after_cut,
            metadata,
        })
    }
    /// Both genuine gameplay acceptance and fixed-cut physical page packing
    /// stage the same placement/coverage buffers. Capability validation remains
    /// with their distinct public methods, not a generic mutation interface.
    fn prepare_metadata(
        &mut self,
        changes: &ChangedRows,
        observed: &[OwnerCoverage],
    ) -> Result<PreparedMetadata, RecordEncodingError> {
        let count = changes
            .rows
            .checked_add(changes.deletes.values().map(Vec::len).sum::<usize>())
            .ok_or_else(error)?;
        let owner_maximum = observed.len().checked_add(changes.rows).ok_or_else(error)?;
        let mut bound = heap_sum([
            count.checked_mul(size_of::<RowEdit>()).ok_or_else(error)?,
            owner_maximum
                .checked_mul(size_of::<OwnerEdit>())
                .ok_or_else(error)?,
            map_storage::<(String, String), OwnerCoverage>(owner_maximum).ok_or_else(error)?,
            map_storage::<&str, usize>(owner_maximum).ok_or_else(error)?,
        ])
        .ok_or_else(error)?;
        for (table, rows) in &changes.writes {
            for row in rows {
                bound = heap_sum([
                    bound,
                    table.len().checked_mul(8).ok_or_else(error)?,
                    row.id.len().checked_mul(2).ok_or_else(error)?,
                    row.parent.len().checked_mul(8).ok_or_else(error)?,
                    row.slot.len(),
                    if matches!(table.as_str(), "world_settings" | "data_world") {
                        row.payload.len()
                    } else {
                        0
                    },
                ])
                .ok_or_else(error)?;
            }
        }
        for (table, ids) in &changes.deletes {
            for id in ids {
                bound = heap_sum([bound, table.len(), id.len()]).ok_or_else(error)?;
            }
        }
        for owner in observed {
            bound = heap_sum([
                bound,
                owner.table.len().checked_mul(8).ok_or_else(error)?,
                owner.owner.len().checked_mul(8).ok_or_else(error)?,
            ])
            .ok_or_else(error)?;
        }
        let mut reservation = self.budget.reserve(bound).map_err(|_| error())?;
        let mut owner_updates = IndexMap::with_capacity(owner_maximum);
        for owner in observed {
            if owner.next_ordinal > crate::identity::MAX_SAFE_INTEGER {
                return Err(error());
            }
            let after = owner.clone();
            if owner_updates
                .insert((owner.table.clone(), owner.owner.clone()), after)
                .is_some()
            {
                return Err(error());
            }
        }
        for (table, writes) in &changes.writes {
            for row in writes {
                let key = (table.clone(), row.parent.clone());
                if !owner_updates.contains_key(&key) {
                    let coverage = self.coverage(table, &row.parent).ok_or_else(error)?.clone();
                    owner_updates.insert(key.clone(), coverage);
                }
                let owner = owner_updates.get_mut(&key).ok_or_else(error)?;
                owner.parent_present = true;
                owner.next_ordinal = owner.next_ordinal.max(
                    row.position
                        .checked_add(1)
                        .filter(|value| *value <= crate::identity::MAX_SAFE_INTEGER)
                        .ok_or_else(error)?,
                );
            }
        }
        let mut rows = Vec::with_capacity(count);
        let mut owners = Vec::with_capacity(owner_updates.len());
        let mut after_payload = self.payload_bytes;
        let mut world_template = None;
        let mut host_template = None;
        // Reserve full destination backing arrays before their possible move.
        let growth = heap_sum([
            map_storage::<String, IndexMap<String, RecordPlacement>>(
                self.rows
                    .len()
                    .checked_add(changes.writes.len())
                    .ok_or_else(error)?,
            )
            .ok_or_else(error)?,
            map_storage::<String, IndexMap<String, OwnerCoverage>>(
                self.owners
                    .len()
                    .checked_add(owner_updates.len())
                    .ok_or_else(error)?,
            )
            .ok_or_else(error)?,
        ])
        .ok_or_else(error)?;
        self.reservation
            .resize(
                self.reservation
                    .bytes()
                    .checked_add(growth)
                    .ok_or_else(error)?,
            )
            .map_err(|_| error())?;
        self.rows
            .try_reserve(changes.writes.len())
            .map_err(|_| error())?;
        self.owners
            .try_reserve(owner_updates.len())
            .map_err(|_| error())?;
        for (table, writes) in &changes.writes {
            let current = self.rows.get(table);
            let capacity = current
                .map_or(0, IndexMap::len)
                .checked_add(writes.len())
                .ok_or_else(error)?;
            let growth = map_storage::<String, RecordPlacement>(
                capacity
                    .checked_mul(2)
                    .and_then(|n| n.checked_add(8))
                    .ok_or_else(error)?,
            )
            .ok_or_else(error)?;
            self.reservation
                .resize(
                    self.reservation
                        .bytes()
                        .checked_add(growth)
                        .and_then(|bytes| bytes.checked_add(table.len()))
                        .ok_or_else(error)?,
                )
                .map_err(|_| error())?;
            let destination = self.rows.entry(table.clone()).or_default();
            destination.try_reserve(writes.len()).map_err(|_| error())?;
            for row in writes {
                if table == "world_settings" {
                    if row.id != "[\"world\"]" {
                        return Err(error());
                    }
                    world_template = Some(row.payload.clone());
                }
                if table == "data_world" {
                    if row.id != "[]" {
                        return Err(error());
                    }
                    host_template = Some(row.payload.clone());
                }
                let after = RecordPlacement {
                    id: row.id.clone(),
                    parent: row.parent.clone(),
                    slot: row.slot.clone(),
                    position: row.position,
                };
                if let Some(before) = destination.get(&row.id) {
                    after_payload = after_payload
                        .checked_sub(row_bytes(&row.id, before).ok_or_else(error)?)
                        .ok_or_else(error)?;
                }
                after_payload = after_payload
                    .checked_add(row_bytes(&row.id, &after).ok_or_else(error)?)
                    .ok_or_else(error)?;
                rows.push(RowEdit {
                    table: table.clone(),
                    id: row.id.clone(),
                    after: Some(after),
                });
            }
        }
        for (table, ids) in &changes.deletes {
            for id in ids {
                if let Some(before) = self.placement(table, id) {
                    after_payload = after_payload
                        .checked_sub(row_bytes(id, before).ok_or_else(error)?)
                        .ok_or_else(error)?;
                }
                rows.push(RowEdit {
                    table: table.clone(),
                    id: id.clone(),
                    after: None,
                });
            }
        }
        // Reserve each affected owner's whole destination capacity once;
        // repeated observations of a table cannot underfund later insertions.
        let mut owner_counts = IndexMap::with_capacity(owner_updates.len());
        for ((table, _), _) in &owner_updates {
            *owner_counts.entry(table.as_str()).or_insert(0usize) += 1;
        }
        for (table, count) in owner_counts {
            let needed = self
                .owners
                .get(table)
                .map_or(0, IndexMap::len)
                .checked_add(count)
                .ok_or_else(error)?;
            let growth = map_storage::<String, OwnerCoverage>(
                needed
                    .checked_mul(2)
                    .and_then(|n| n.checked_add(8))
                    .ok_or_else(error)?,
            )
            .ok_or_else(error)?;
            self.reservation
                .resize(
                    self.reservation
                        .bytes()
                        .checked_add(growth)
                        .and_then(|bytes| bytes.checked_add(table.len()))
                        .ok_or_else(error)?,
                )
                .map_err(|_| error())?;
            self.owners
                .entry(table.into())
                .or_default()
                .try_reserve(count)
                .map_err(|_| error())?;
        }
        for ((table, id), after) in owner_updates {
            if let Some(before) = self.coverage(&table, &id) {
                after_payload = after_payload
                    .checked_sub(owner_bytes(&id, before).ok_or_else(error)?)
                    .ok_or_else(error)?;
            }
            after_payload = after_payload
                .checked_add(owner_bytes(&id, &after).ok_or_else(error)?)
                .ok_or_else(error)?;
            owners.push(OwnerEdit { table, id, after });
        }
        self.reservation
            .resize(self.resident_bytes()?)
            .map_err(|_| error())?;
        let after_bytes = heap_sum([
            size_of::<Self>() + 2 * size_of::<usize>(),
            self.map_bytes()?,
            after_payload,
            world_template
                .as_ref()
                .map_or(self.world_settings_template.capacity(), String::capacity),
            host_template
                .as_ref()
                .map_or(self.host_settings_template.capacity(), String::capacity),
        ])
        .ok_or_else(error)?;
        let available = self
            .reservation
            .bytes()
            .checked_add(reservation.bytes())
            .ok_or_else(error)?;
        if after_bytes > available {
            reservation
                .resize(
                    reservation
                        .bytes()
                        .checked_add(after_bytes - available)
                        .ok_or_else(error)?,
                )
                .map_err(|_| error())?;
        }
        Ok(PreparedMetadata {
            world_template,
            host_template,
            identity: self.identity.clone(),
            after_payload,
            after_bytes,
            rows,
            owners,
            reservation,
        })
    }
    pub(crate) fn validate_prepared(
        &self,
        prepared: &PreparedRecordLedger,
        key: CandidateKey,
    ) -> Result<(), RecordEncodingError> {
        if !Arc::ptr_eq(&self.identity, &prepared.metadata.identity)
            || prepared.key != key
            || self.accepted_cut != key.base_cut
        {
            return Err(error());
        }
        Ok(())
    }
    /// No allocation or capacity admission occurs after the actual fence
    /// receipt. Its sealed key cannot be manufactured from an intended accept.
    pub(crate) fn apply_accepted(
        &mut self,
        prepared: PreparedRecordLedger,
        accepted: &AcceptedCandidate,
    ) -> Result<(), RecordEncodingError> {
        self.validate_prepared(&prepared, accepted.key())?;
        let after_cut = prepared.after_cut;
        self.apply_metadata(prepared.metadata)?;
        self.accepted_cut = after_cut;
        Ok(())
    }
    fn apply_metadata(&mut self, prepared: PreparedMetadata) -> Result<(), RecordEncodingError> {
        self.reservation
            .merge(prepared.reservation)
            .map_err(|_| error())?;
        for edit in prepared.rows {
            match edit.after {
                Some(after) => {
                    self.rows
                        .get_mut(&edit.table)
                        .ok_or_else(error)?
                        .insert(edit.id, after);
                }
                None => {
                    if let Some(rows) = self.rows.get_mut(&edit.table) {
                        rows.swap_remove(&edit.id);
                    }
                }
            }
        }
        for edit in prepared.owners {
            self.owners
                .get_mut(&edit.table)
                .ok_or_else(error)?
                .insert(edit.id, edit.after);
        }
        if let Some(template) = prepared.world_template {
            self.world_settings_template = template;
        }
        if let Some(template) = prepared.host_template {
            self.host_settings_template = template;
        }
        self.payload_bytes = prepared.after_payload;
        self.reservation
            .resize(prepared.after_bytes)
            .map_err(|_| error())?;
        Ok(())
    }
}

impl RecordLedger {
    pub(crate) fn prepare_temporal_pages(
        &mut self,
        through_cut: u64,
        changes: &ChangedRows,
        observed: &[OwnerCoverage],
    ) -> Result<PreparedTemporalPageLedger, RecordEncodingError> {
        const TABLE: &str = "mind_temporal_pages";
        if through_cut != self.accepted_cut
            || !changes.deletes.is_empty()
            || !changes.expired.is_empty()
            || changes.writes.keys().any(|table| table != TABLE)
            || observed.iter().any(|owner| owner.table != TABLE)
        {
            return Err(error());
        }
        let writes = changes.writes.get(TABLE).map(Vec::as_slice).unwrap_or(&[]);
        // The trusted packer already constructs/validates complete page rows.
        // This boundary protects only existing ownership and same-cut metadata;
        // it never re-parses payloads or derives another canonical page layout.
        for row in writes {
            if !self
                .coverage(TABLE, &row.parent)
                .is_some_and(|owner| owner.parent_present)
            {
                return Err(error());
            }
        }
        for owner in observed {
            let before = self.coverage(TABLE, &owner.owner).ok_or_else(error)?;
            if owner.complete != before.complete
                || owner.parent_present != before.parent_present
                || owner.next_ordinal < before.next_ordinal
            {
                return Err(error());
            }
        }
        let metadata = if writes.is_empty() && observed.is_empty() {
            None
        } else {
            Some(self.prepare_metadata(changes, observed)?)
        };
        Ok(PreparedTemporalPageLedger(
            self.prepare_same_cut(through_cut, metadata)?,
        ))
    }
    fn prepare_same_cut(
        &self,
        through_cut: u64,
        metadata: Option<PreparedMetadata>,
    ) -> Result<PreparedSameCutLedger, RecordEncodingError> {
        let identity_reservation = if metadata.is_some() {
            Some(
                self.budget
                    .reserve(2 * size_of::<usize>())
                    .map_err(|_| error())?,
            )
        } else {
            None
        };
        let next_identity = metadata.as_ref().map(|_| Arc::new(()));
        Ok(PreparedSameCutLedger {
            identity: self.identity.clone(),
            accepted_cut: through_cut,
            metadata,
            next_identity,
            identity_reservation,
        })
    }
    pub(crate) fn validate_temporal_pages(
        &self,
        prepared: &PreparedTemporalPageLedger,
    ) -> Result<(), RecordEncodingError> {
        self.validate_same_cut(&prepared.0)
    }
    fn validate_same_cut(
        &self,
        prepared: &PreparedSameCutLedger,
    ) -> Result<(), RecordEncodingError> {
        if !Arc::ptr_eq(&self.identity, &prepared.identity)
            || self.accepted_cut != prepared.accepted_cut
        {
            return Err(error());
        }
        Ok(())
    }
    /// The caller applies only after every prefix allocation succeeds. Rotating
    /// the existing private owner identity rejects a stale same-cut projection;
    /// no gameplay identity, sequence, randomness, time or accepted cut changes.
    pub(crate) fn apply_temporal_pages(
        &mut self,
        prepared: PreparedTemporalPageLedger,
    ) -> Result<(), RecordEncodingError> {
        self.apply_same_cut(prepared.0)
    }
    fn apply_same_cut(
        &mut self,
        prepared: PreparedSameCutLedger,
    ) -> Result<(), RecordEncodingError> {
        self.validate_same_cut(&prepared)?;
        let PreparedSameCutLedger {
            identity,
            metadata,
            next_identity,
            identity_reservation,
            ..
        } = prepared;
        if let Some(metadata) = metadata {
            self.apply_metadata(metadata)?;
            self.identity =
                next_identity.expect("nonempty prepared projection owns its replacement identity");
        }
        // The canonical ledger's existing identity allowance now owns the new
        // Arc. Keep the transition guard until its old reference is destroyed.
        drop(identity);
        drop(identity_reservation);
        Ok(())
    }
}
