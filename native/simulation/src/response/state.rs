//! The bounded, insertion-ordered replay window has one canonical owner. Each
//! immutable receipt keeps its payload/typed-read custody after acceptance;
//! removed receipts move into undo until rollback or acceptance releases them.
use super::*;
use crate::install::rows::{take_collection, validate_map_row};
use crate::install::{InstallError, RowImport};

pub(super) struct ReceiptRecord {
    pub receipt: ResponseReceipt,
    pub position: u64,
    pub payload: String,
    _reservation: ByteReservation,
}
pub(crate) struct ResponseState {
    pub(super) records: IndexMap<String, ReceiptRecord>,
    pub(super) present: bool,
    pub(super) next_ordinal: u64,
    metadata: ByteReservation,
}
impl ResponseState {
    pub(crate) fn install(
        import: &mut RowImport,
        present: bool,
        limits: &ResponseLimits,
        budget: &ByteBudget,
    ) -> Result<Self, InstallError> {
        if !limits.valid() {
            return Err(InstallError::CurrentFormat);
        }
        let mut rows = take_collection(import, "response_receipts", "[\"world\"]", present, true)?;
        if rows.rows.len() as u64 > limits.receipts {
            return Err(InstallError::CurrentFormat);
        }
        let keys = rows
            .rows
            .iter()
            .try_fold(0usize, |n, row| n.checked_add(row.slot.len()))
            .ok_or(InstallError::CurrentFormat)?;
        let bytes = map_storage::<String, ReceiptRecord>(rows.rows.len())
            .and_then(|n| n.checked_add(keys))
            .ok_or(InstallError::CurrentFormat)?;
        let metadata = budget
            .reserve(bytes)
            .map_err(|_| InstallError::CurrentFormat)?;
        rows.rows.sort_unstable_by_key(|row| row.position);
        let mut records = IndexMap::with_capacity(rows.rows.len());
        let mut prior_position = None;
        for row in rows.rows {
            validate_map_row(
                &row,
                "[\"world\"]",
                "responseReceipts",
                &row.slot,
                rows.coverage.next_ordinal,
            )?;
            if !row.extra.is_empty()
                || !is_safe_record_id(&row.slot)
                || prior_position == Some(row.position)
            {
                return Err(InstallError::CurrentFormat);
            }
            prior_position = Some(row.position);
            // A raw-backed JsText decoder preserves isolated UTF16 units in
            // component messages; serde_json::Value is not a save intermediary.
            let mut reservation = budget
                .reserve(
                    crate::experience::encoded_body_bound(&row.payload)
                        .map_err(|_| InstallError::CurrentFormat)?,
                )
                .map_err(|_| InstallError::CurrentFormat)?;
            let receipt: ResponseReceipt =
                serde_json::from_str(&row.payload).map_err(|_| InstallError::CurrentFormat)?;
            if receipt.digest.is_empty()
                || receipt.components.keys().any(|id| !is_safe_record_id(id))
            {
                return Err(InstallError::CurrentFormat);
            }
            let bytes = receipt
                .heap_bytes()
                .and_then(|n| n.checked_add(row.payload.capacity()))
                .ok_or(InstallError::CurrentFormat)?;
            reservation
                .resize(bytes)
                .map_err(|_| InstallError::CurrentFormat)?;
            if records
                .insert(
                    row.slot,
                    ReceiptRecord {
                        receipt,
                        position: row.position,
                        payload: row.payload,
                        _reservation: reservation,
                    },
                )
                .is_some()
            {
                return Err(InstallError::CurrentFormat);
            }
        }
        Ok(Self {
            records,
            present,
            next_ordinal: rows.coverage.next_ordinal,
            metadata,
        })
    }
    pub(crate) fn present(&self) -> bool {
        self.present
    }
    pub(crate) fn get(&self, id: &str) -> Option<&ResponseReceipt> {
        self.records.get(id).map(|record| &record.receipt)
    }
    fn metadata_bytes(&self) -> Option<usize> {
        self.records.keys().try_fold(
            map_storage::<String, ReceiptRecord>(self.records.capacity())?,
            |n, key| n.checked_add(key.capacity()),
        )
    }
}

#[derive(Clone, Copy)]
pub(crate) struct ResponseCheckpoint {
    at: usize,
}
pub(super) enum ResponseUndo {
    Append {
        id: String,
        present: bool,
        next_ordinal: u64,
    },
    Evict {
        id: String,
        index: usize,
        record: ReceiptRecord,
    },
}
pub(crate) struct ResponseJournal {
    pub(super) undo: Vec<ResponseUndo>,
    reservation: ByteReservation,
}
impl ResponseJournal {
    pub(crate) fn new(budget: &ByteBudget) -> Result<Self, ExecutionError> {
        Ok(Self {
            undo: Vec::new(),
            reservation: budget.reserve(size_of::<Self>())?,
        })
    }
    pub(crate) fn checkpoint(&self) -> ResponseCheckpoint {
        ResponseCheckpoint {
            at: self.undo.len(),
        }
    }
    pub(crate) fn rollback_to(
        &mut self,
        state: &mut ResponseState,
        checkpoint: ResponseCheckpoint,
    ) -> Result<(), ExecutionError> {
        if checkpoint.at > self.undo.len() {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        while self.undo.len() > checkpoint.at {
            match self.undo.pop().ok_or(ExecutionError::Invariant)? {
                ResponseUndo::Append {
                    id,
                    present,
                    next_ordinal,
                } => {
                    if state.records.shift_remove(&id).is_none() {
                        return Err(ExecutionError::Invariant);
                    }
                    state.present = present;
                    state.next_ordinal = next_ordinal;
                }
                ResponseUndo::Evict { id, index, record } => {
                    if state.records.contains_key(&id) || index > state.records.len() {
                        return Err(ExecutionError::Invariant);
                    }
                    state.records.shift_insert(index, id, record);
                }
            }
        }
        let bytes = state.metadata_bytes().ok_or(ExecutionError::Capacity)?;
        if bytes > state.metadata.bytes() {
            state
                .metadata
                .merge(self.reservation.split_off(bytes - state.metadata.bytes())?)?;
        }
        state.metadata.resize(bytes)?;
        Ok(())
    }

    // Deliberately private to the response module: a completed response cursor
    // supplies the actual component results after all causal finalizers close.
    pub(super) fn append_completed(
        &mut self,
        state: &mut ResponseState,
        id: &str,
        receipt: ResponseReceipt,
        limits: &ResponseLimits,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        if !is_safe_record_id(id)
            || receipt.digest.is_empty()
            || state.records.contains_key(id)
            || !limits.valid()
        {
            return Err(ExecutionError::Invariant);
        }
        let next = state
            .next_ordinal
            .checked_add(1)
            .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
            .ok_or(ExecutionError::Capacity)?;
        let payload_bytes =
            crate::encoding::json_record_len(&receipt).map_err(|_| ExecutionError::Invariant)?;
        let record_bytes = receipt
            .heap_bytes()
            .and_then(|n| n.checked_add(payload_bytes.checked_mul(2)?))
            .ok_or(ExecutionError::Capacity)?;
        let mut record_reservation = budget.reserve(record_bytes)?;
        let payload =
            crate::encoding::json_record(&receipt).map_err(|_| ExecutionError::Invariant)?;
        record_reservation.resize(
            receipt
                .heap_bytes()
                .and_then(|n| n.checked_add(payload.capacity()))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        // Reserve the complete map growth and undo suffix before publishing the
        // receipt. The source cap bounds the pruning walk, not world population.
        let target = state
            .records
            .len()
            .checked_add(1)
            .ok_or(ExecutionError::Capacity)?;
        let map_bound = map_storage::<String, ReceiptRecord>(
            target.checked_mul(2).ok_or(ExecutionError::Capacity)?,
        )
        .and_then(|n| n.checked_add(state.records.keys().map(String::capacity).sum::<usize>()))
        .and_then(|n| n.checked_add(id.len()))
        .ok_or(ExecutionError::Capacity)?;
        state
            .metadata
            .resize(state.metadata.bytes().max(map_bound))?;
        let evictions = target.saturating_sub(
            usize::try_from(limits.receipts).map_err(|_| ExecutionError::Capacity)?,
        );
        let undo_count = self
            .undo
            .len()
            .checked_add(1 + evictions)
            .ok_or(ExecutionError::Capacity)?;
        let undo_bytes = undo_count
            .checked_mul(2 * size_of::<ResponseUndo>())
            .and_then(|n| n.checked_add(id.len().checked_mul(2)?))
            .and_then(|n| n.checked_add(state.records.keys().map(String::capacity).sum::<usize>()))
            .ok_or(ExecutionError::Capacity)?;
        self.reservation.resize(
            self.reservation
                .bytes()
                .checked_add(undo_bytes)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        self.undo
            .try_reserve(1 + evictions)
            .map_err(|_| ExecutionError::Capacity)?;
        state
            .records
            .try_reserve(1)
            .map_err(|_| ExecutionError::Capacity)?;
        self.undo.push(ResponseUndo::Append {
            id: id.to_owned(),
            present: state.present,
            next_ordinal: state.next_ordinal,
        });
        state.records.insert(
            id.to_owned(),
            ReceiptRecord {
                receipt,
                position: state.next_ordinal,
                payload,
                _reservation: record_reservation,
            },
        );
        state.present = true;
        state.next_ordinal = next;
        for _ in 0..evictions {
            // Object.keys puts canonical array-index IDs before insertion-ordered
            // other IDs. A newly inserted numeric ID may itself be the oldest.
            let index = state
                .records
                .keys()
                .enumerate()
                .min_by(|(_, a), (_, b)| crate::encoding::js_property_cmp(a, b))
                .map(|(index, _)| index)
                .ok_or(ExecutionError::Invariant)?;
            let (id, record) = state
                .records
                .shift_remove_index(index)
                .ok_or(ExecutionError::Invariant)?;
            self.undo.push(ResponseUndo::Evict { id, index, record });
        }
        state
            .metadata
            .resize(state.metadata_bytes().ok_or(ExecutionError::Capacity)?)?;
        Ok(())
    }
}
