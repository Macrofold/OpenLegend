//! Sparse canonical mind rows. Privacy reset compacts only this person's actual
//! remaining documents/records and deletes the exact removed prior rows.
use super::*;
use crate::host::retained_size::{heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::records::{RecordEncodingError, RecordLedger, RecordPlacement, RowEffects, RowEncoder};
use indexmap::IndexSet;
use std::mem::size_of;

fn error() -> RecordEncodingError {
    RecordEncodingError("Mind save requires its actual current source placement.")
}
struct Address {
    placement: RecordPlacement,
    create: bool,
    _reservation: ByteReservation,
}
fn address(
    ledger: &RecordLedger,
    table: &str,
    path: &[&str],
    parent: &[&str],
    slot: &str,
    position: Option<u64>,
    new_owner: bool,
    budget: &ByteBudget,
) -> Result<Address, RecordEncodingError> {
    let bytes = heap_sum([
        crate::encoding::json_record_len(path)
            .map_err(|_| error())?
            .checked_mul(2)
            .ok_or_else(error)?,
        crate::encoding::json_record_len(parent)
            .map_err(|_| error())?
            .checked_mul(2)
            .ok_or_else(error)?,
        slot.len(),
    ])
    .ok_or_else(error)?;
    let reservation = budget.reserve(bytes).map_err(|_| error())?;
    let id = crate::encoding::json_record(path).map_err(|_| error())?;
    let parent = crate::encoding::json_record(parent).map_err(|_| error())?;
    let before = ledger.placement(table, &id);
    if before.is_some_and(|row| row.parent != parent) {
        return Err(error());
    }
    let create = match ledger.presence(table, &id, &parent) {
        Some(present) => !present,
        None if new_owner && position.is_some() && before.is_none() => true,
        None => return Err(error()),
    };
    let position = position
        .or_else(|| before.map(|row| row.position))
        .ok_or_else(error)?;
    Ok(Address {
        placement: RecordPlacement {
            id,
            parent,
            slot: slot.to_owned(),
            position,
        },
        create,
        _reservation: reservation,
    })
}
fn write<T: Serialize + ?Sized>(
    ledger: &RecordLedger,
    output: &mut RowEncoder<'_>,
    table: &str,
    path: &[&str],
    parent: &[&str],
    slot: &str,
    position: Option<u64>,
    new_owner: bool,
    value: &T,
    budget: &ByteBudget,
) -> Result<(), RecordEncodingError> {
    let address = address(
        ledger, table, path, parent, slot, position, new_owner, budget,
    )?;
    output.write(
        table,
        &address.placement,
        value,
        &[],
        address.create,
        RowEffects::default(),
    )
}
pub(crate) fn encode_cognition_changes(
    state: &MindState,
    journal: &CognitionJournal,
    ledger: &RecordLedger,
    output: &mut RowEncoder<'_>,
    budget: &ByteBudget,
) -> Result<(), RecordEncodingError> {
    let count = journal.changes().count();
    let bytes =
        map_storage::<&str, ()>(count.checked_mul(3).ok_or_else(error)?).ok_or_else(error)?;
    let _selection = budget.reserve(bytes).map_err(|_| error())?;
    let mut minds = IndexSet::new();
    let mut inner = IndexSet::new();
    let mut full = IndexSet::new();
    let mut new_people = IndexSet::new();
    let mut new_storage = budget.reserve(0).map_err(|_| error())?;
    for change in journal.changes() {
        match change {
            CognitionChange::NewPerson(actor) => {
                new_storage
                    .resize(map_storage::<&str, ()>(new_people.len() + 1).ok_or_else(error)?)
                    .map_err(|_| error())?;
                new_people.insert(actor);
                minds.insert(actor);
                full.insert(actor);
                inner.insert(actor);
            }
            CognitionChange::Publication(actor) => {
                minds.insert(actor);
                full.insert(actor);
                inner.insert(actor);
            }
            CognitionChange::InnerWorld(actor) => {
                inner.insert(actor);
            }
            CognitionChange::MindContents(actor) => {
                minds.insert(actor);
                full.insert(actor);
            }
            CognitionChange::MindRevision(actor)
            | CognitionChange::MindRecord { actor, .. }
            | CognitionChange::MindDocument { actor, .. } => {
                minds.insert(actor);
            }
        }
    }
    let mut next_mind = (!new_people.is_empty())
        .then(|| {
            ledger
                .coverage("mind_state", "[\"world\"]")
                .map(|r| r.next_ordinal)
        })
        .flatten();
    let mut next_inner = (!new_people.is_empty())
        .then(|| {
            ledger
                .coverage("mind_inner_worlds", "[\"world\"]")
                .map(|r| r.next_ordinal)
        })
        .flatten();
    let mut added = false;
    let mut new_root =
        |actor: &str, next: &mut Option<u64>| -> Result<Option<u64>, RecordEncodingError> {
            if !new_people.contains(actor) {
                return Ok(None);
            }
            let place = next.as_mut().ok_or_else(error)?;
            let ordinal = *place;
            *place = ordinal.checked_add(1).ok_or_else(error)?;
            added = true;
            Ok(Some(ordinal))
        };
    for actor in &minds {
        let mind = state
            .minds
            .as_ref()
            .and_then(|minds| minds.get(*actor))
            .ok_or_else(error)?;
        write(
            ledger,
            output,
            "mind_state",
            &["world", "minds", actor],
            &["world"],
            actor,
            new_root(actor, &mut next_mind)?,
            false,
            mind,
            budget,
        )?;
    }
    for actor in inner {
        let value = state
            .inner_worlds
            .as_ref()
            .and_then(|worlds| worlds.get(actor))
            .ok_or_else(error)?;
        write(
            ledger,
            output,
            "mind_inner_worlds",
            &["world", "innerWorlds", actor],
            &["world"],
            actor,
            new_root(actor, &mut next_inner)?,
            false,
            value,
            budget,
        )?;
    }
    if added {
        for (table, next_ordinal) in [("mind_state", next_mind), ("mind_inner_worlds", next_inner)]
        {
            output.observe_owner(&crate::records::OwnerCoverage {
                table: table.into(),
                owner: "[\"world\"]".into(),
                parent_present: true,
                complete: true,
                next_ordinal: next_ordinal.ok_or_else(error)?,
            })?;
        }
    }
    for actor in &full {
        let mind = state
            .minds
            .as_ref()
            .and_then(|minds| minds.get(*actor))
            .ok_or_else(error)?;
        let parent_bytes =
            crate::encoding::json_record_len(&["world", "minds", actor]).map_err(|_| error())?;
        let _parent = budget
            .reserve(
                parent_bytes
                    .checked_mul(3)
                    .and_then(|n| n.checked_add(64))
                    .ok_or_else(error)?,
            )
            .map_err(|_| error())?;
        let parent =
            crate::encoding::json_record(&["world", "minds", actor]).map_err(|_| error())?;
        for (table, length) in [
            ("mind_documents", mind.documents.len()),
            ("mind_facets", mind.records.len()),
            ("mind_thoughts", mind.thoughts.len()),
        ] {
            output.observe_owner(&crate::records::OwnerCoverage {
                table: table.to_owned(),
                owner: parent.clone(),
                parent_present: true,
                complete: true,
                next_ordinal: length as u64,
            })?;
        }
        for (at, document) in mind.documents.iter().enumerate() {
            write(
                ledger,
                output,
                "mind_documents",
                &["world", "minds", actor, "documents", &document.id],
                &["world", "minds", actor],
                &at.to_string(),
                Some(at as u64),
                new_people.contains(actor),
                document,
                budget,
            )?;
        }
        for (at, record) in mind.records.iter().enumerate() {
            write(
                ledger,
                output,
                "mind_facets",
                &["world", "minds", actor, "records", &record.id],
                &["world", "minds", actor],
                &at.to_string(),
                Some(at as u64),
                new_people.contains(actor),
                record,
                budget,
            )?;
        }
        for (at, thought) in mind.thoughts.iter().enumerate() {
            write(
                ledger,
                output,
                "mind_thoughts",
                &["world", "minds", actor, "thoughts", &at.to_string()],
                &["world", "minds", actor],
                &at.to_string(),
                Some(at as u64),
                new_people.contains(actor),
                thought,
                budget,
            )?;
        }
    }
    // One authoring mutation can update one protected document. No unrelated
    // thoughts, facets or document bodies are re-encoded for this change.
    for change in journal.changes() {
        if let CognitionChange::MindDocument { actor, index } = change {
            if full.contains(actor) {
                continue;
            }
            let document = state
                .minds
                .as_ref()
                .and_then(|m| m.get(actor))
                .and_then(|m| m.documents.get(index))
                .ok_or_else(error)?;
            write(
                ledger,
                output,
                "mind_documents",
                &["world", "minds", actor, "documents", &document.id],
                &["world", "minds", actor],
                &index.to_string(),
                Some(index as u64),
                false,
                document,
                budget,
            )?;
        }
    }
    let record_count = journal
        .changes()
        .filter(|change| matches!(change, CognitionChange::MindRecord { .. }))
        .count();
    let _records = budget
        .reserve(map_storage::<(&str, usize), ()>(record_count).ok_or_else(error)?)
        .map_err(|_| error())?;
    let mut seen = IndexSet::new();
    for change in journal.changes() {
        if let CognitionChange::MindRecord { actor, index } = change {
            if full.contains(actor) || !seen.insert((actor, index)) {
                continue;
            }
            let record = state
                .minds
                .as_ref()
                .and_then(|minds| minds.get(actor))
                .and_then(|mind| mind.records.get(index))
                .ok_or_else(error)?;
            write(
                ledger,
                output,
                "mind_facets",
                &["world", "minds", actor, "records", &record.id],
                &["world", "minds", actor],
                &index.to_string(),
                Some(index as u64),
                false,
                record,
                budget,
            )?;
        }
    }
    for (actor, documents, records, thoughts) in journal.resets() {
        let mind = state
            .minds
            .as_ref()
            .and_then(|minds| minds.get(actor))
            .ok_or_else(error)?;
        for document in documents
            .iter()
            .filter(|before| !mind.documents.iter().any(|after| after.id == before.id))
        {
            let address = address(
                ledger,
                "mind_documents",
                &["world", "minds", actor, "documents", &document.id],
                &["world", "minds", actor],
                "",
                Some(0),
                false,
                budget,
            )?;
            output.delete("mind_documents", &address.placement.id, false)?;
        }
        for record in records
            .iter()
            .filter(|before| !mind.records.iter().any(|after| after.id == before.id))
        {
            let address = address(
                ledger,
                "mind_facets",
                &["world", "minds", actor, "records", &record.id],
                &["world", "minds", actor],
                "",
                Some(0),
                false,
                budget,
            )?;
            output.delete("mind_facets", &address.placement.id, false)?;
        }
        for at in mind.thoughts.len()..thoughts.len() {
            let address = address(
                ledger,
                "mind_thoughts",
                &["world", "minds", actor, "thoughts", &at.to_string()],
                &["world", "minds", actor],
                "",
                Some(0),
                false,
                budget,
            )?;
            output.delete("mind_thoughts", &address.placement.id, false)?;
        }
    }
    Ok(())
}
