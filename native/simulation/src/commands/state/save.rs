//! Only successfully appended receipts become durable command rows.
use super::*;
use crate::records::{
    RecordEncodingError, RecordLedger, RowEffects, RowEncoder, SelectedPlacement,
};
impl CommandJournal {
    pub(crate) fn encode_changes(
        &self,
        state: &CommandState,
        ledger: &RecordLedger,
        output: &mut RowEncoder<'_>,
        budget: &ByteBudget,
    ) -> Result<(), RecordEncodingError> {
        if self.undo.is_empty() {
            return Ok(());
        }
        // Replay receipts are an unordered exact-key index in the Source schema.
        // Insertion cannot renumber earlier receipts or require a full scan.
        for id in &self.undo {
            let record = state.records.get(id).ok_or(RecordEncodingError(
                "A saved command receipt must still belong to its command owner.",
            ))?;
            let placement = SelectedPlacement::new(
                ledger,
                "world_command_receipts",
                &["world", "commandReceipts", id],
                &["world"],
                &record.slot,
                0,
                true,
                budget,
            )?;
            output.write(
                "world_command_receipts",
                placement.value(),
                &record.receipt,
                &[],
                placement.create(),
                RowEffects::default(),
            )?;
        }
        Ok(())
    }
}
