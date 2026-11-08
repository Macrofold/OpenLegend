//! Encode only actual source placements changed by this candidate. Complete
//! immutable payloads/derived columns already belong to the semantic writer.

use super::*;
use crate::host::ByteBudget;
use crate::host::retained_size::map_storage;
use crate::records::{
    OwnerCoverage, RecordEncodingError, RecordLedger, RecordPlacement, RowEffects, RowEncoder,
};
use std::mem::size_of;

fn encoding() -> RecordEncodingError {
    RecordEncodingError("Personal source save has no exact current placement or byte allowance.")
}
fn create(
    ledger: &RecordLedger,
    table: &str,
    placement: &RecordPlacement,
    new: bool,
) -> Result<bool, RecordEncodingError> {
    match ledger.presence(table, &placement.id, &placement.parent) {
        Some(present) => Ok(!present),
        None if new => Ok(true),
        None if ledger
            .coverage(table, &placement.parent)
            .is_some_and(|coverage| placement.position >= coverage.next_ordinal) =>
        {
            Ok(true)
        }
        None => Err(encoding()),
    }
}
/// Existing cold edits require their authoritative placement to join the ledger
/// at hydration. Missing resident metadata never certifies an insert.
pub(crate) fn encode_personal_changes(
    state: &ExperienceState,
    journal: &ExperienceJournal,
    ledger: &RecordLedger,
    output: &mut RowEncoder<'_>,
    budget: &ByteBudget,
) -> Result<(), RecordEncodingError> {
    let maximum = journal.undo.len();
    let bytes = map_storage::<&str, ()>(maximum)
        .and_then(|bytes| {
            bytes.checked_add(maximum.checked_mul(size_of::<(&Arc<PersonalSourceRecord>, bool)>())?)
        })
        .ok_or_else(encoding)?;
    let _selection = budget.reserve(bytes).map_err(|_| encoding())?;
    let mut seen = IndexSet::new();
    seen.try_reserve(maximum).map_err(|_| encoding())?;
    let mut records = Vec::new();
    records.try_reserve_exact(maximum).map_err(|_| encoding())?;
    for record in journal.appended(state) {
        if seen.insert(record.row_id()) {
            records.push((record, true));
        }
    }
    for record in journal.replaced(state) {
        if seen.insert(record.row_id()) {
            records.push((record, false));
        }
    }
    for (kind, actor, position) in journal.created_collections() {
        let _placement = budget
            .reserve(
                actor
                    .len()
                    .checked_mul(8)
                    .and_then(|bytes| bytes.checked_add(256))
                    .ok_or_else(encoding)?,
            )
            .map_err(|_| encoding())?;
        let id = collection_owner(kind, actor).map_err(|_| encoding())?;
        let parent = if kind == PersonalSourceKind::Memory {
            "[\"world\"]"
        } else {
            "[\"world\",\"experience\"]"
        };
        let table = kind.owner_table();
        let placement = RecordPlacement {
            id,
            parent: parent.to_owned(),
            slot: actor.to_owned(),
            position,
        };
        output.write_encoded(
            &table,
            &placement,
            "[]",
            &[],
            create(ledger, &table, &placement, true)?,
            RowEffects::default(),
        )?;
        output.observe_owner(&state.owner_maps.get(&kind).ok_or_else(encoding)?.coverage)?;
    }
    for (record, new) in records {
        let _placement = budget
            .reserve(
                record
                    .row_id
                    .len()
                    .checked_add(record.parent.len())
                    .and_then(|bytes| bytes.checked_add(record.slot.len()))
                    .ok_or_else(encoding)?,
            )
            .map_err(|_| encoding())?;
        let placement = RecordPlacement {
            id: record.row_id.clone(),
            parent: record.parent.clone(),
            slot: record.slot.clone(),
            position: record.position,
        };
        let table = record.header.reference.kind.table();
        output.write_encoded(
            table,
            &placement,
            record.payload(),
            record.columns(),
            create(ledger, table, &placement, new)?,
            RowEffects::default(),
        )?;
        let coverage = &state
            .actors
            .get(&record.header.actor_id)
            .and_then(|actor| actor.sources.get(&record.header.reference.kind))
            .ok_or_else(encoding)?
            .coverage;
        let _owner = budget
            .reserve(
                table
                    .len()
                    .checked_add(record.parent.len())
                    .ok_or_else(encoding)?,
            )
            .map_err(|_| encoding())?;
        output.observe_owner(&OwnerCoverage {
            table: table.to_owned(),
            owner: record.parent.clone(),
            complete: coverage.complete,
            next_ordinal: coverage.next_ordinal,
            parent_present: coverage.parent_present,
        })?;
    }
    Ok(())
}
