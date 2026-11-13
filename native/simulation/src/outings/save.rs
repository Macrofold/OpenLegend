use super::*;
use crate::records::{RecordEncodingError, RowEncoder, encode_sparse_map_changes};
impl OutingJournal {
    pub(crate) fn encode_changes(
        &self,
        state: &OutingState,
        schema: &crate::records::RecordSchema,
        ledger: &crate::records::RecordLedger,
        output: &mut RowEncoder<'_>,
        budget: &ByteBudget,
    ) -> Result<(), RecordEncodingError> {
        if self.undo.is_empty() {
            return Ok(());
        }
        let error = || RecordEncodingError("Outing changes require funded current owner coverage.");
        let _guard = budget
            .reserve(map_storage::<&str, Option<&OutingRecord>>(self.undo.len()).ok_or_else(error)?)
            .map_err(|_| error())?;
        let mut before = IndexMap::new();
        for undo in &self.undo {
            before
                .entry(undo.id.as_str())
                .or_insert(undo.prior.as_ref().map(|(_, record)| record));
        }
        encode_sparse_map_changes(
            schema,
            ledger,
            "activity_outings",
            &["world"],
            Some("outings"),
            &before,
            state.records.as_ref(),
            false,
            |_| Ok((Vec::new(), budget.reserve(0).map_err(|_| error())?)),
            output,
            budget,
        )
    }
}
