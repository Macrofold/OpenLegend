//! Persist the actual pending detector work, selected from this owner's sparse
//! journal. Both keyed children are unordered in the current Source schema.
//! Those partial dictionaries use ordinary upserts; complete native placement
//! custody does not change the Source writer's insert-only policy.
use super::*;
use crate::records::{
    OwnerCoverage, RecordEncodingError, RecordLedger, RowEffects, RowEncoder, SelectedPlacement,
};

fn error() -> RecordEncodingError {
    RecordEncodingError("Pending sensory rows have no complete owner or allowance.")
}

impl SensoryJournal {
    pub(crate) fn encode_changes(
        &self,
        state: &ReceptionState,
        before: SensoryCheckpoint,
        ledger: &RecordLedger,
        output: &mut RowEncoder<'_>,
        budget: &ByteBudget,
    ) -> Result<(), RecordEncodingError> {
        let current = state.sensory.as_ref();
        let header = current.map(SensoryHeader::capture);
        let changed = self.undo.get(before.operations..).ok_or_else(error)?;
        if header != before.header {
            let address = SelectedPlacement::new(
                ledger,
                "sim_sensory_continuation",
                &["world", "sensory"],
                &["world"],
                "sensory",
                0,
                before.header.is_none(),
                budget,
            )?;
            if let Some(current) = current {
                output.write(
                    "sim_sensory_continuation",
                    address.value(),
                    current,
                    &[],
                    false,
                    RowEffects::default(),
                )?;
            } else {
                output.delete("sim_sensory_continuation", &address.value().id, false)?;
            }
            observe(
                output,
                "sim_sensory_continuation",
                &["world"],
                header.is_some(),
                u64::from(header.is_some()),
                budget,
            )?;
        }
        if changed.is_empty() {
            return Ok(());
        }
        let current = current.ok_or_else(error)?;
        let entries = changed
            .iter()
            .try_fold(0usize, |count, change| {
                count.checked_add(match change {
                    SensoryUndo::Scopes(prior) => prior.len().checked_add(current.scopes.len())?,
                    _ => 1,
                })
            })
            .ok_or_else(error)?;
        let _guard = budget
            .reserve(
                map_storage::<&str, Option<PendingSightScope>>(entries)
                    .and_then(|bytes| {
                        bytes.checked_add(map_storage::<&str, Option<SightProgress>>(entries)?)
                    })
                    .ok_or_else(error)?,
            )
            .map_err(|_| error())?;
        let mut scopes = IndexMap::with_capacity(entries);
        let mut processed = IndexMap::with_capacity(entries);
        for change in changed {
            match change {
                SensoryUndo::Scope { key, prior } => {
                    scopes
                        .entry(key.as_str())
                        .or_insert(prior.map(|(_, value)| value));
                }
                SensoryUndo::Scopes(prior) => {
                    for (key, value) in prior {
                        scopes.entry(key.as_str()).or_insert(Some(*value));
                    }
                    // New scopes after widening did not exist in that before-image.
                    for key in current.scopes.keys() {
                        scopes.entry(key.as_str()).or_insert(None);
                    }
                }
                SensoryUndo::Processed { key, prior } => {
                    processed
                        .entry(key.as_str())
                        .or_insert(prior.map(|(_, value)| value));
                }
            }
        }
        for (key, prior) in &scopes {
            write_member(
                output,
                ledger,
                "sim_sensory_scopes",
                key,
                prior.as_ref(),
                current.scopes.get(*key),
                budget,
            )?;
        }
        for (key, prior) in &processed {
            write_member(
                output,
                ledger,
                "sim_sensory_policy_progress",
                key,
                prior.as_ref(),
                current.processed.get(*key),
                budget,
            )?;
        }
        for (table, length) in [
            ("sim_sensory_scopes", current.scopes.len()),
            ("sim_sensory_policy_progress", current.processed.len()),
        ] {
            observe(
                output,
                table,
                &["world", "sensory"],
                true,
                u64::from(length > 0),
                budget,
            )?;
        }
        Ok(())
    }
}
fn write_member<T: Serialize + PartialEq>(
    output: &mut RowEncoder<'_>,
    ledger: &RecordLedger,
    table: &str,
    key: &str,
    before: Option<&T>,
    after: Option<&T>,
    budget: &ByteBudget,
) -> Result<(), RecordEncodingError> {
    if before == after {
        return Ok(());
    }
    let field = if table == "sim_sensory_scopes" {
        "scopes"
    } else {
        "processed"
    };
    let address = SelectedPlacement::new(
        ledger,
        table,
        &["world", "sensory", field, key],
        &["world", "sensory"],
        key,
        0,
        before.is_none(),
        budget,
    )?;
    if let Some(value) = after {
        // A member may disappear and return in one unsaved suffix; use the
        // ordinary upsert unless accepted placement proves a new durable row.
        output.write(
            table,
            address.value(),
            value,
            &[],
            false,
            RowEffects::default(),
        )?;
    } else {
        output.delete(table, &address.value().id, false)?;
    }
    Ok(())
}
fn observe(
    output: &mut RowEncoder<'_>,
    table: &str,
    parent: &[&str],
    present: bool,
    next: u64,
    budget: &ByteBudget,
) -> Result<(), RecordEncodingError> {
    let bytes = crate::encoding::json_record_len(parent).map_err(|_| error())?;
    let _guard = budget
        .reserve(bytes * 2 + table.len() + size_of::<OwnerCoverage>())
        .map_err(|_| error())?;
    output.observe_owner(&OwnerCoverage {
        table: table.into(),
        owner: crate::encoding::json_record(parent).map_err(|_| error())?,
        complete: true,
        next_ordinal: next,
        parent_present: present,
    })
}
