//! Only successfully appended receipts become durable command rows.
use super::*;
use crate::records::{
    OrderedMapRows, RecordEncodingError, RecordLedger, RowEffects, RowEncoder, SelectedPlacement,
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
        let ordered = OrderedMapRows::new(&state.records, budget)?;
        for (position, id, record) in ordered.iter() {
            let placement = SelectedPlacement::new(
                ledger,
                "world_command_receipts",
                &["world", "commandReceipts", id],
                &["world"],
                &record.slot,
                position,
                self.undo.iter().any(|written| written == id),
                budget,
            )?;
            // Numeric command IDs follow actual Object.entries order; a new
            // earlier index also rewrites any genuinely shifted predecessor.
            if self.undo.iter().any(|written| written == id)
                || ledger
                    .placement("world_command_receipts", &placement.value().id)
                    .is_none_or(|old| old.position != position)
            {
                output.write(
                    "world_command_receipts",
                    placement.value(),
                    &record.receipt,
                    &[],
                    placement.create(),
                    RowEffects::default(),
                )?;
            }
        }
        Ok(())
    }
}
