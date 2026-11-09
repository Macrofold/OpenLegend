//! Strict semantic import has already validated these current SQL bodies. Only
//! their finite placements enter the ledger; no body is copied or retained.
use super::*;
use crate::host::retained_size::tree_node_bound;
use crate::records::ChangedRow;
use std::collections::BTreeMap;

pub(crate) struct PreparedHydrationLedger(PreparedSameCutLedger);
fn supported(table: &str) -> bool {
    matches!(
        table,
        "mind_temporal_pages"
            | "mind_perception_values"
            | "mind_awareness"
            | "mind_memories"
            | "mind_summaries"
            | "activity_occurrences"
            | "mind_appraisals"
    )
}
impl RecordLedger {
    /// Called only after the purpose-bound current-format import has validated
    /// every body and its real owner. This reveals no private body to a reader,
    /// changes no gameplay cut, and remains true if its private edit is refused.
    pub(crate) fn prepare_verified_hydration(
        &mut self,
        through_cut: u64,
        rows: &BTreeMap<String, Vec<RecordPlacement>>,
        observed: &[OwnerCoverage],
    ) -> Result<PreparedHydrationLedger, RecordEncodingError> {
        if through_cut != self.accepted_cut
            || rows.keys().any(|table| !supported(table))
            || observed.iter().any(|owner| !supported(&owner.table))
        {
            return Err(error());
        }
        if observed.is_empty() && rows.values().all(Vec::is_empty) {
            return Ok(PreparedHydrationLedger(
                self.prepare_same_cut(through_cut, None)?,
            ));
        }
        for owner in observed {
            let before = self
                .coverage(&owner.table, &owner.owner)
                .ok_or_else(error)?;
            if owner.parent_present != before.parent_present
                || owner.next_ordinal < before.next_ordinal
                || (owner.complete != before.complete
                    && !(owner.table == "mind_appraisals" && owner.complete))
            {
                return Err(error());
            }
        }
        let mut count = 0usize;
        let mut bytes = size_of::<ChangedRows>();
        for (table, values) in rows {
            count = count.checked_add(values.len()).ok_or_else(error)?;
            bytes = heap_sum([
                bytes,
                tree_node_bound::<String, Vec<ChangedRow>>().ok_or_else(error)?,
                table.len(),
                values
                    .len()
                    .checked_mul(size_of::<ChangedRow>())
                    .ok_or_else(error)?,
            ])
            .ok_or_else(error)?;
            for row in values {
                if !self
                    .coverage(table, &row.parent)
                    .is_some_and(|owner| owner.parent_present)
                    || self.placement(table, &row.id).is_some_and(|known| {
                        known.parent != row.parent
                            || known.slot != row.slot
                            || known.position != row.position
                    })
                {
                    return Err(error());
                }
                bytes = heap_sum([bytes, row.id.len(), row.parent.len(), row.slot.len()])
                    .ok_or_else(error)?;
            }
        }
        let _temporary = self.budget.reserve(bytes).map_err(|_| error())?;
        // Reuse the accepted/save metadata builder. Empty payloads/cells are
        // deliberate local placeholders: these private rows never reach SQL.
        // Root templates are disallowed, so the builder reads placements only.
        let mut changes = ChangedRows::default();
        changes.rows = count;
        for (table, values) in rows {
            if values.is_empty() {
                continue;
            }
            let mut staged = Vec::new();
            staged
                .try_reserve_exact(values.len())
                .map_err(|_| error())?;
            for row in values {
                staged.push(ChangedRow {
                    id: row.id.clone(),
                    parent: row.parent.clone(),
                    slot: row.slot.clone(),
                    position: row.position,
                    payload: String::new(),
                    extra: Vec::new(),
                    create: false,
                    received_uses_changed: None,
                    write_columns: None,
                    logical_removal: None,
                    received_value_additions: None,
                    received_value_removals: None,
                });
            }
            changes.writes.insert(table.clone(), staged);
        }
        let metadata = if count == 0 && observed.is_empty() {
            None
        } else {
            Some(self.prepare_metadata(&changes, observed)?)
        };
        Ok(PreparedHydrationLedger(
            self.prepare_same_cut(through_cut, metadata)?,
        ))
    }
    pub(crate) fn apply_verified_hydration(
        &mut self,
        prepared: PreparedHydrationLedger,
    ) -> Result<(), RecordEncodingError> {
        self.apply_same_cut(prepared.0)
    }
}
