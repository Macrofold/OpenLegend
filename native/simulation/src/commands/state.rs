//! Exact command replay receipts, owned once. An attempted command is not a
//! receipt; only the command's real successful completion may append one.
use super::*;
mod save;
use crate::host::retained_size::{HeapBytes, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::install::rows::{take_collection, validate_map_row};
use crate::install::{InstallError, RowImport};
use std::mem::size_of;

#[derive(Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct CommandReceipt {
    pub digest: String,
    pub outcome: Outcome,
}
pub(crate) struct CommandReceiptRecord {
    pub receipt: CommandReceipt,
    pub slot: String,
}
pub(crate) struct CommandState {
    records: IndexMap<String, CommandReceiptRecord>,
}
impl CommandState {
    pub(crate) fn install(import: &mut RowImport, present: bool) -> Result<Self, InstallError> {
        if !present {
            return Err(InstallError::ParentPresence);
        }
        let rows = take_collection(import, "world_command_receipts", "[\"world\"]", true, true)?;
        let mut records = IndexMap::with_capacity(rows.rows.len());
        for row in rows.rows {
            validate_map_row(
                &row,
                "[\"world\"]",
                "commandReceipts",
                &row.slot,
                rows.coverage.next_ordinal,
            )?;
            if !row.extra.is_empty() || row.position != 0 {
                return Err(InstallError::CurrentFormat);
            }
            let receipt: CommandReceipt =
                serde_json::from_str(&row.payload).map_err(|_| InstallError::CurrentFormat)?;
            if receipt.digest.is_empty()
                || !is_safe_record_id(&row.slot)
                || records
                    .insert(
                        row.slot.clone(),
                        CommandReceiptRecord {
                            receipt,
                            slot: row.slot,
                        },
                    )
                    .is_some()
            {
                return Err(InstallError::CurrentFormat);
            }
        }
        Ok(Self { records })
    }
    pub(crate) fn get(&self, id: &str) -> Option<&CommandReceiptRecord> {
        self.records.get(id)
    }
}
#[derive(Clone, Copy)]
pub(crate) struct CommandCheckpoint {
    at: usize,
}
pub(crate) struct CommandJournal {
    undo: Vec<String>,
    reservation: ByteReservation,
}
impl CommandJournal {
    pub(crate) fn new(budget: &ByteBudget) -> Result<Self, crate::execution::ExecutionError> {
        Ok(Self {
            undo: Vec::new(),
            reservation: budget.reserve(size_of::<Self>())?,
        })
    }
    pub(crate) fn checkpoint(&self) -> CommandCheckpoint {
        CommandCheckpoint {
            at: self.undo.len(),
        }
    }
    pub(crate) fn rollback_to(
        &mut self,
        state: &mut CommandState,
        checkpoint: CommandCheckpoint,
    ) -> Result<(), crate::execution::ExecutionError> {
        if checkpoint.at > self.undo.len() {
            return Err(crate::execution::ExecutionError::InvalidCheckpoint);
        }
        while self.undo.len() > checkpoint.at {
            let id = self
                .undo
                .pop()
                .ok_or(crate::execution::ExecutionError::Invariant)?;
            if state.records.shift_remove(&id).is_none() {
                return Err(crate::execution::ExecutionError::Invariant);
            }
        }
        Ok(())
    }
    pub(crate) fn discard_undo(&mut self) {
        self.undo.clear();
    }
    pub(crate) fn append(
        &mut self,
        state: &mut CommandState,
        id: &str,
        digest: &str,
        outcome: &Outcome,
    ) -> Result<(), crate::execution::ExecutionError> {
        use crate::execution::ExecutionError;
        if !is_safe_record_id(id) || digest.is_empty() || state.records.contains_key(id) {
            return Err(ExecutionError::Invariant);
        }
        let growth = if state.records.len() == state.records.capacity() {
            map_storage::<String, CommandReceiptRecord>(
                state
                    .records
                    .capacity()
                    .checked_add(1)
                    .and_then(|n| n.checked_mul(2))
                    .ok_or(ExecutionError::Capacity)?,
            )
            .ok_or(ExecutionError::Capacity)?
        } else {
            0
        };
        let bytes = size_of::<String>() * 2
            + id.len() * 3
            + digest.len()
            + outcome.heap_bytes().ok_or(ExecutionError::Capacity)?
            + growth;
        self.reservation.resize(
            self.reservation
                .bytes()
                .checked_add(bytes)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        self.undo
            .try_reserve(1)
            .map_err(|_| ExecutionError::Capacity)?;
        let record = CommandReceiptRecord {
            receipt: CommandReceipt {
                digest: digest.to_owned(),
                outcome: outcome.clone(),
            },
            slot: id.to_owned(),
        };
        self.undo.push(id.to_owned());
        state.records.insert(id.to_owned(), record);
        Ok(())
    }
}
