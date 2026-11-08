//! Operation-owned output for the existing writer. Semantic owners supply the
//! actual rows; this buffer neither traverses a world nor decides mutations.

use super::SqlCell;
use super::{
    ChangedRow, ChangedRows, OwnerCoverage, RecordEncodingError, RecordPlacement, RecordSchema,
};
use crate::host::retained_size::heap_sum;
use crate::host::{ByteBudget, ByteReservation};
use serde::Serialize;
use std::mem::size_of;

#[derive(Default)]
pub(crate) struct RowEffects<'a> {
    pub received_uses_changed: Option<bool>,
    pub write_columns: Option<&'a [String]>,
    pub logical_removal: Option<bool>,
    pub received_value_additions: Option<&'a [String]>,
    pub received_value_removals: Option<&'a [String]>,
}
/// Detached immutable encoding remains funded until its actual consumer takes
/// custody. Moving rows out must also move this reservation.
pub(crate) struct EncodedRows {
    changes: ChangedRows,
    owners: Vec<OwnerCoverage>,
    reservation: ByteReservation,
}
impl EncodedRows {
    pub(crate) fn changes(&self) -> &ChangedRows {
        &self.changes
    }
    pub(crate) fn owners(&self) -> &[OwnerCoverage] {
        &self.owners
    }
    pub(crate) fn into_parts(self) -> (ChangedRows, Vec<OwnerCoverage>, ByteReservation) {
        (self.changes, self.owners, self.reservation)
    }
}
pub(crate) struct RowEncoder<'a> {
    schema: &'a RecordSchema,
    changes: ChangedRows,
    owners: Vec<OwnerCoverage>,
    reservation: ByteReservation,
}
fn error() -> RecordEncodingError {
    RecordEncodingError("Native changed-row output exceeds its byte allowance.")
}
fn strings_bytes(values: Option<&[String]>) -> Option<usize> {
    values.into_iter().flatten().try_fold(
        values.map_or(0, |values| values.len() * size_of::<String>()),
        |bytes, value| bytes.checked_add(value.len()),
    )
}
impl<'a> RowEncoder<'a> {
    pub(crate) fn new(
        schema: &'a RecordSchema,
        budget: &ByteBudget,
    ) -> Result<Self, RecordEncodingError> {
        Ok(Self {
            schema,
            changes: ChangedRows::default(),
            owners: Vec::new(),
            reservation: budget.reserve(size_of::<Self>()).map_err(|_| error())?,
        })
    }
    fn reserve(&mut self, bytes: usize) -> Result<(), RecordEncodingError> {
        self.reservation
            .resize(
                self.reservation
                    .bytes()
                    .checked_add(bytes)
                    .ok_or_else(error)?,
            )
            .map_err(|_| error())
    }
    fn row_bound(
        &self,
        table: &str,
        placement: &RecordPlacement,
        payload_bytes: usize,
        extra: &[SqlCell],
        effects: &RowEffects<'_>,
    ) -> Result<usize, RecordEncodingError> {
        self.schema.layout(table)?;
        let cells = extra.iter().try_fold(
            extra
                .len()
                .checked_mul(size_of::<SqlCell>())
                .ok_or_else(error)?,
            |bytes, cell| {
                bytes
                    .checked_add(super::save::cell_heap(cell).ok_or_else(error)?)
                    .ok_or_else(error)
            },
        )?;
        // One full pinned B-tree node per table entry and twice each vector
        // slot covers growth before insertion. Indexed cells use their actual
        // allocated map/list capacities; encoding never rebuilds those maps.
        let node =
            11 * (size_of::<String>() + size_of::<Vec<ChangedRow>>()) + 16 * size_of::<usize>();
        heap_sum([
            payload_bytes,
            cells,
            4 * size_of::<ChangedRow>(),
            2 * node,
            table.len(),
            placement.id.len(),
            placement.parent.len(),
            placement.slot.len(),
            strings_bytes(effects.write_columns).ok_or_else(error)?,
            strings_bytes(effects.received_value_additions).ok_or_else(error)?,
            strings_bytes(effects.received_value_removals).ok_or_else(error)?,
        ])
        .ok_or_else(error)
    }
    fn insert(
        &mut self,
        table: &str,
        placement: &RecordPlacement,
        payload: String,
        extra: &[SqlCell],
        create: bool,
        effects: RowEffects<'_>,
    ) -> Result<(), RecordEncodingError> {
        let cells = extra.to_vec();
        let mut row = self
            .schema
            .encoded(table, placement, payload, cells, create)?;
        row.received_uses_changed = effects.received_uses_changed;
        row.write_columns = effects.write_columns.map(<[String]>::to_vec);
        row.logical_removal = effects.logical_removal;
        row.received_value_additions = effects.received_value_additions.map(<[String]>::to_vec);
        row.received_value_removals = effects.received_value_removals.map(<[String]>::to_vec);
        self.changes
            .writes
            .entry(table.to_owned())
            .or_default()
            .push(row);
        self.changes.rows = self.changes.rows.checked_add(1).ok_or_else(error)?;
        Ok(())
    }
    pub(crate) fn write_encoded(
        &mut self,
        table: &str,
        placement: &RecordPlacement,
        payload: &str,
        extra: &[SqlCell],
        create: bool,
        effects: RowEffects<'_>,
    ) -> Result<(), RecordEncodingError> {
        self.reserve(self.row_bound(table, placement, payload.len(), extra, &effects)?)?;
        self.insert(table, placement, payload.to_owned(), extra, create, effects)
    }
    pub(crate) fn write<T: Serialize + ?Sized>(
        &mut self,
        table: &str,
        placement: &RecordPlacement,
        value: &T,
        extra: &[SqlCell],
        create: bool,
        effects: RowEffects<'_>,
    ) -> Result<(), RecordEncodingError> {
        let layout = self.schema.layout(table)?;
        let bytes = layout
            .project_len(value)
            .map_err(|_| RecordEncodingError("Canonical row requires its actual storage codec."))?;
        let encoded = bytes
            .checked_mul(2)
            .map(|bytes| bytes.max(8))
            .ok_or_else(error)?;
        self.reserve(self.row_bound(table, placement, encoded, extra, &effects)?)?;
        let payload =
            self.schema.layout(table)?.project(value).map_err(|_| {
                RecordEncodingError("Canonical row requires its actual storage codec.")
            })?;
        self.insert(table, placement, payload, extra, create, effects)
    }
    pub(crate) fn delete(
        &mut self,
        table: &str,
        id: &str,
        expired: bool,
    ) -> Result<(), RecordEncodingError> {
        self.schema.layout(table)?;
        let bytes = heap_sum([
            id.len().checked_mul(2).ok_or_else(error)?,
            table.len().checked_mul(2).ok_or_else(error)?,
            8 * size_of::<String>(),
            2 * (11 * (size_of::<String>() + size_of::<Vec<String>>()) + 16 * size_of::<usize>()),
        ])
        .ok_or_else(error)?;
        self.reserve(bytes)?;
        self.changes
            .deletes
            .entry(table.to_owned())
            .or_default()
            .push(id.to_owned());
        if expired {
            self.changes
                .expired
                .entry(table.to_owned())
                .or_default()
                .push(id.to_owned());
        }
        Ok(())
    }
    pub(crate) fn observe_owner(
        &mut self,
        owner: &OwnerCoverage,
    ) -> Result<(), RecordEncodingError> {
        self.schema.layout(&owner.table)?;
        if owner.next_ordinal > crate::identity::MAX_SAFE_INTEGER {
            return Err(error());
        }
        self.reserve(
            owner
                .table
                .len()
                .checked_add(owner.owner.len())
                .and_then(|bytes| {
                    bytes.checked_add((self.owners.len() + 1) * 2 * size_of::<OwnerCoverage>())
                })
                .ok_or_else(error)?,
        )?;
        if let Some(prior) = self
            .owners
            .iter_mut()
            .find(|prior| prior.table == owner.table && prior.owner == owner.owner)
        {
            *prior = owner.clone();
        } else {
            self.owners.try_reserve_exact(1).map_err(|_| error())?;
            self.owners.push(owner.clone());
        }
        Ok(())
    }
    pub(crate) fn finish(self) -> Result<EncodedRows, RecordEncodingError> {
        self.schema.validate_changes(&self.changes)?;
        Ok(EncodedRows {
            changes: self.changes,
            owners: self.owners,
            reservation: self.reservation,
        })
    }
}
