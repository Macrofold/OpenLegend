//! Phase originals are embedded in the perception parent, not another SQL
//! collection. Undo reconstitutes only that finite parent's actual predecessor.
use super::super::save::{Headers, error, select_header};
use super::*;
use crate::records::{RecordEncodingError, RecordSchema};
fn subject(change: &OriginalUndo) -> &str {
    match change {
        OriginalUndo::Complete { observer, .. }
        | OriginalUndo::OwnerInsert { observer, .. }
        | OriginalUndo::PhaseReset { observer, .. }
        | OriginalUndo::Append { observer, .. } => observer,
    }
}
impl OriginalJournal {
    pub(in super::super) fn header_change_count(
        &self,
        before: OriginalCheckpoint,
    ) -> Result<usize, RecordEncodingError> {
        Ok(self.undo.get(before.operations..).ok_or_else(error)?.len())
    }
    pub(in super::super) fn select_headers<'a>(
        &'a self,
        state: &'a ReceptionState,
        before: OriginalCheckpoint,
        selected: &mut Headers<'a>,
        schema: &RecordSchema,
        budget: &ByteBudget,
    ) -> Result<(), RecordEncodingError> {
        for change in self.undo.get(before.operations..).ok_or_else(error)? {
            select_header(selected, state, subject(change), schema, budget)?;
        }
        Ok(())
    }
    pub(in super::super) fn restore_headers(
        &self,
        before: OriginalCheckpoint,
        selected: &mut Headers<'_>,
    ) -> Result<(), RecordEncodingError> {
        for change in self
            .undo
            .get(before.operations..)
            .ok_or_else(error)?
            .iter()
            .rev()
        {
            let entry = selected.get_mut(subject(change)).ok_or_else(error)?;
            if let OriginalUndo::PhaseReset {
                received, receipts, ..
            } = change
            {
                entry.reserve(&(received, receipts))?;
            }
            if matches!(change, OriginalUndo::OwnerInsert { .. }) {
                entry.value = None;
                continue;
            }
            let header = entry.value.as_mut().ok_or_else(error)?;
            match change {
                OriginalUndo::Complete {
                    position, prior, ..
                } => *header.received.get_mut(*position).ok_or_else(error)? = prior.clone(),
                OriginalUndo::PhaseReset {
                    sequence,
                    received,
                    receipts,
                    ..
                } => {
                    header.received_at_sequence = *sequence;
                    header.received = received.clone();
                    header.receipts = receipts.clone();
                }
                OriginalUndo::Append {
                    key,
                    position,
                    original_id,
                    ..
                } => {
                    if header.received.len() != position + 1
                        || header
                            .received
                            .last()
                            .is_none_or(|original| original.id != *original_id)
                        || header.receipts.get(key) != Some(&(*position as u64))
                    {
                        return Err(error());
                    }
                    header.received.pop();
                    header.receipts.shift_remove(key);
                }
                OriginalUndo::OwnerInsert { .. } => unreachable!(),
            }
        }
        Ok(())
    }
}
