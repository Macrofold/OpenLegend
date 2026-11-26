//! Receipt bodies change only on completed responses. Encode that sparse
//! suffix, including eviction, and keep stable placement high-water metadata.
use super::state::ResponseUndo;
use super::*;
use crate::records::{
    OwnerCoverage, RecordEncodingError, RecordLedger, RowEffects, RowEncoder, SelectedPlacement,
};
use indexmap::IndexSet;

impl ResponseJournal {
    pub(crate) fn encode_changes(
        &self,
        state: &ResponseState,
        ledger: &RecordLedger,
        output: &mut RowEncoder<'_>,
        budget: &ByteBudget,
    ) -> Result<(), RecordEncodingError> {
        if self.undo.is_empty() {
            return Ok(());
        }
        let error = || RecordEncodingError("Response replay metadata or capacity is unavailable.");
        let _selection = budget
            .reserve(map_storage::<&str, ()>(self.undo.len()).ok_or_else(error)?)
            .map_err(|_| error())?;
        let mut changed = IndexSet::with_capacity(self.undo.len());
        for undo in &self.undo {
            changed.insert(match undo {
                ResponseUndo::Append { id, .. } | ResponseUndo::Evict { id, .. } => id.as_str(),
            });
        }
        for id in changed {
            if let Some(record) = state.records.get(id) {
                let placement = SelectedPlacement::new(
                    ledger,
                    "response_receipts",
                    &["world", "responseReceipts", id],
                    &["world"],
                    id,
                    record.position,
                    true,
                    budget,
                )?;
                output.write_encoded(
                    "response_receipts",
                    placement.value(),
                    &record.payload,
                    &[],
                    placement.create(),
                    RowEffects::default(),
                )?;
            } else {
                let id = crate::encoding::json_record(&["world", "responseReceipts", id])
                    .map_err(|_| error())?;
                if ledger.presence("response_receipts", &id, "[\"world\"]") == Some(true) {
                    output.delete("response_receipts", &id, true)?;
                }
            }
        }
        output.observe_owner(&OwnerCoverage {
            table: "response_receipts".into(),
            owner: "[\"world\"]".into(),
            complete: true,
            parent_present: state.present,
            next_ordinal: state.next_ordinal,
        })
    }
}
