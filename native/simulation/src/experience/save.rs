//! Encode only actual source placements changed by this candidate. Complete
//! immutable payloads/derived columns already belong to the semantic writer.

use super::*;
use crate::host::ByteBudget;
use crate::host::retained_size::map_storage;
use crate::records::{
    OwnerCoverage, RecordEncodingError, RecordLedger, RecordPlacement, RowEffects, RowEncoder,
};
use serde::ser::{SerializeStruct, Serializer};
use std::mem::size_of;
mod privacy;

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

/// Exact selected before bodies survive a private immutable replacement. They
/// are preparation inputs for source-version retention, not a second catalogue.
pub(crate) struct PersonalPredecessors {
    records: Vec<Arc<PersonalSourceRecord>>,
    _reservation: crate::host::ByteReservation,
}
impl PersonalPredecessors {
    pub(crate) fn value(&self) -> impl serde::Serialize + '_ {
        PredecessorRows(&self.records)
    }
}
struct PredecessorRows<'a>(&'a [Arc<PersonalSourceRecord>]);
impl serde::Serialize for PredecessorRows<'_> {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeSeq;
        let mut values = s.serialize_seq(Some(self.0.len()))?;
        for record in self.0 {
            values.serialize_element(&Predecessor(record))?;
        }
        values.end()
    }
}
struct Predecessor<'a>(&'a PersonalSourceRecord);
impl serde::Serialize for Predecessor<'_> {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        let record = self.0;
        let mut row = s.serialize_struct("PersonalPredecessor", 9)?;
        row.serialize_field("table", record.header.reference.kind.table())?;
        row.serialize_field("id", record.row_id())?;
        row.serialize_field("parent", record.parent())?;
        row.serialize_field("slot", record.slot())?;
        row.serialize_field("position", &record.position())?;
        row.serialize_field("actorId", &record.header.actor_id)?;
        row.serialize_field("payload", record.payload())?;
        row.serialize_field("extra", record.columns())?;
        row.serialize_field("encodedBytes", &record.payload().len())?;
        row.end()
    }
}
pub(crate) fn capture_personal_predecessors(
    journal: &ExperienceJournal,
    budget: &ByteBudget,
) -> Result<PersonalPredecessors, RecordEncodingError> {
    let count = journal.undo.len();
    let bytes = map_storage::<(&str, PersonalSourceKind, &str), ()>(count)
        .and_then(|bytes| bytes.checked_mul(2))
        .and_then(|bytes| {
            bytes.checked_add(count.checked_mul(size_of::<Arc<PersonalSourceRecord>>())?)
        })
        .ok_or_else(encoding)?;
    let reservation = budget.reserve(bytes).map_err(|_| encoding())?;
    let mut new = IndexSet::new();
    let mut seen = IndexSet::new();
    new.try_reserve(count).map_err(|_| encoding())?;
    seen.try_reserve(count).map_err(|_| encoding())?;
    for operation in &journal.undo {
        if let super::mutation::ExperienceUndo::Append(append) = operation {
            new.insert(append.source_key());
        }
    }
    let mut records = Vec::new();
    records.try_reserve_exact(count).map_err(|_| encoding())?;
    for operation in &journal.undo {
        let before = match operation {
            super::mutation::ExperienceUndo::Replace { before, .. }
            | super::mutation::ExperienceUndo::Remove { before, .. } => before,
            _ => continue,
        };
        let key = (
            before.header.actor_id.as_str(),
            before.header.reference.kind,
            before.header.reference.id.as_str(),
        );
        if !new.contains(&key) && seen.insert(key) {
            records.push(Arc::clone(before));
        }
    }
    Ok(PersonalPredecessors {
        records,
        _reservation: reservation,
    })
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
    privacy::encode_privacy_changes(state, journal, ledger, output, budget)?;
    if journal.header_changed() {
        let placement = ledger
            .placement("experience_state", "[\"world\",\"experience\"]")
            .ok_or_else(encoding)?;
        output.write_encoded(
            "experience_state",
            placement,
            state.header_payload(),
            &[],
            false,
            RowEffects::default(),
        )?;
    }
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
    // The existing preparation groups a table by its actual actor collection,
    // then source ordinal. Preserve that order for pending source consumers as
    // well as SQL; chronological journal interleaving is not owner enumeration.
    let mut ranks = [usize::MAX; 3];
    let mut next_rank = 0;
    for (record, _) in &records {
        let rank = &mut ranks[record.header.reference.kind as usize];
        if *rank == usize::MAX {
            *rank = next_rank;
            next_rank += 1;
        }
    }
    records.sort_unstable_by(|(a, _), (b, _)| {
        let kind = a.header.reference.kind;
        let other = b.header.reference.kind;
        ranks[kind as usize]
            .cmp(&ranks[other as usize])
            .then_with(|| {
                crate::encoding::js_property_cmp(&a.header.actor_id, &b.header.actor_id)
                    .then_with(|| {
                        state.owner_maps[&kind].placements[&a.header.actor_id]
                            .cmp(&state.owner_maps[&other].placements[&b.header.actor_id])
                    })
                    .then(a.position.cmp(&b.position))
            })
    });
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
    for record in journal.removed() {
        let appended=journal.undo.iter().any(|operation|matches!(operation,super::mutation::ExperienceUndo::Append(append) if append.source_key()==(record.header.actor_id.as_str(),record.header.reference.kind,record.header.reference.id.as_str())));
        if appended {
            continue;
        }
        output.delete(record.header.reference.kind.table(), record.row_id(), false)?;
        let coverage = &state
            .actors
            .get(&record.header.actor_id)
            .and_then(|actor| actor.sources.get(&record.header.reference.kind))
            .ok_or_else(encoding)?
            .coverage;
        output.observe_owner(&OwnerCoverage {
            table: record.header.reference.kind.table().to_owned(),
            owner: record.parent.clone(),
            complete: coverage.complete,
            next_ordinal: coverage.next_ordinal,
            parent_present: coverage.parent_present,
        })?;
    }
    Ok(())
}
