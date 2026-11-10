//! Changed action-history rows selected by this writer's real inverse journal.
use super::*;
use crate::records::SqlCell;
use crate::records::{
    OrderedMapRows, RecordEncodingError, RecordLedger, RowEffects, RowEncoder, SelectedPlacement,
};
use indexmap::IndexSet;
use serde::Serialize;

fn error() -> RecordEncodingError {
    RecordEncodingError("Action history save requires its actual current record placement.")
}
fn encode_map<T: Serialize>(
    map: &IndexMap<String, T>,
    field: &str,
    table: &str,
    changed: &IndexMap<&str, bool>,
    ledger: &RecordLedger,
    output: &mut RowEncoder<'_>,
    budget: &ByteBudget,
) -> Result<(), RecordEncodingError> {
    if changed.is_empty() {
        return Ok(());
    }
    let ordered = OrderedMapRows::new(map, budget)?;
    for (position, key, value) in ordered.iter() {
        let placement = SelectedPlacement::new(
            ledger,
            table,
            &["world", "actionExperience", field, key],
            &["world", "actionExperience"],
            key,
            position,
            false,
            budget,
        )?;
        if changed.contains_key(key)
            || ledger
                .placement(table, &placement.value().id)
                .is_none_or(|old| old.position != position)
        {
            output.write(
                table,
                placement.value(),
                value,
                &[],
                placement.create(),
                RowEffects::default(),
            )?;
        }
    }
    for (key, was_present) in changed {
        if *was_present && !map.contains_key(*key) {
            let _guard = budget
                .reserve(
                    key.len()
                        .checked_mul(8)
                        .and_then(|bytes| bytes.checked_add(128))
                        .ok_or_else(error)?,
                )
                .map_err(|_| error())?;
            let id = crate::encoding::json_record(&["world", "actionExperience", field, *key])
                .map_err(|_| error())?;
            output.delete(table, &id, false)?;
        }
    }
    Ok(())
}
impl ActivityJournal {
    pub(crate) fn encode_changes(
        &self,
        state: &ActivityState,
        ledger: &RecordLedger,
        output: &mut RowEncoder<'_>,
        budget: &ByteBudget,
    ) -> Result<(), RecordEncodingError> {
        if self.undo.is_empty() {
            return Ok(());
        }
        let maximum = self.undo.len();
        let bytes = map_storage::<(&str, &str), bool>(maximum)
            .and_then(|bytes| bytes.checked_add(4 * map_storage::<&str, bool>(maximum)?))
            .ok_or_else(error)?;
        let _selection = budget.reserve(bytes).map_err(|_| error())?;
        let mut records = IndexMap::with_capacity(maximum);
        let mut new_owners = IndexSet::with_capacity(maximum);
        let mut current = IndexMap::with_capacity(maximum);
        let mut active = IndexMap::with_capacity(maximum);
        let mut learning = IndexMap::with_capacity(maximum);
        let mut header = false;
        for change in &self.undo {
            match change {
                ActivityUndo::Record { actor, id, .. } => {
                    records
                        .entry((actor.as_str(), id.as_str()))
                        .or_insert(false);
                }
                ActivityUndo::Insert {
                    actor,
                    id,
                    parent_present,
                    ..
                } => {
                    records.insert((actor.as_str(), id.as_str()), true);
                    if !parent_present {
                        new_owners.insert(actor.as_str());
                    }
                }
                ActivityUndo::Admitted(_) => header = true,
                ActivityUndo::Current { key, before } => {
                    current.entry(key.as_str()).or_insert(before.is_some());
                }
                ActivityUndo::Active { key, before } => {
                    active.entry(key.as_str()).or_insert(before.is_some());
                }
                ActivityUndo::Learning { key, before } => {
                    learning.entry(key.as_str()).or_insert(before.is_some());
                }
                ActivityUndo::Pending { .. }
                | ActivityUndo::Loaded { .. }
                | ActivityUndo::MethodInsert { .. }
                | ActivityUndo::Acquisition { .. } => {}
            }
        }
        if header {
            let placement = ledger
                .placement("activity_state", "[\"world\",\"actionExperience\"]")
                .ok_or_else(error)?;
            output.write(
                "activity_state",
                placement,
                &state.header,
                &[],
                false,
                RowEffects::default(),
            )?;
        }
        // Owner rows use real source map order. Lists retain their native
        // source ordinals, including gaps and partial cold-prefix metadata.
        if !new_owners.is_empty() {
            let owners = OrderedMapRows::new(&state.collections, budget)?;
            for (position, actor, _) in owners
                .iter()
                .filter(|(_, actor, _)| new_owners.contains(actor))
            {
                let placement = SelectedPlacement::new(
                    ledger,
                    "activity_occurrences_owners",
                    &["world", "actionExperience", "occurrences", actor],
                    &["world", "actionExperience"],
                    actor,
                    position,
                    true,
                    budget,
                )?;
                output.write_encoded(
                    "activity_occurrences_owners",
                    placement.value(),
                    "[]",
                    &[],
                    placement.create(),
                    RowEffects::default(),
                )?;
            }
        }
        for ((actor, id), proven_new) in records {
            let record = state
                .collections
                .get(actor)
                .ok_or_else(error)?
                .get(id)
                .map_err(|_| error())?
                .ok_or_else(error)?;
            let owner = state.collections.get(actor).ok_or_else(error)?;
            let _owner_guard = budget
                .reserve(
                    actor
                        .len()
                        .checked_mul(8)
                        .and_then(|bytes| bytes.checked_add(256))
                        .ok_or_else(error)?,
                )
                .map_err(|_| error())?;
            output.observe_owner(&crate::records::OwnerCoverage {
                table: "activity_occurrences".into(),
                owner: crate::encoding::json_record(&[
                    "world",
                    "actionExperience",
                    "occurrences",
                    actor,
                ])
                .map_err(|_| error())?,
                complete: owner.complete,
                next_ordinal: owner.next_ordinal,
                parent_present: owner.parent_present,
            })?;
            let entry = &record.occurrence;
            let bytes = actor
                .len()
                .checked_add(id.len())
                .and_then(|bytes| {
                    bytes.checked_add(entry.parent_id.as_ref().map_or(0, String::len))
                })
                .and_then(|bytes| {
                    bytes.checked_add(
                        entry
                            .result_evidence
                            .as_ref()
                            .map_or(Some(0), ResultEvidence::id_len)?
                            .checked_mul(2)?,
                    )
                })
                .and_then(|bytes| bytes.checked_add(6 * size_of::<SqlCell>() + 16))
                .ok_or_else(error)?;
            let _cells = budget.reserve(bytes).map_err(|_| error())?;
            let placement = SelectedPlacement::new(
                ledger,
                "activity_occurrences",
                &["world", "actionExperience", "occurrences", actor, id],
                &["world", "actionExperience", "occurrences", actor],
                &record.slot,
                record.position,
                proven_new,
                budget,
            )?;
            let status = match entry.status {
                ActivityStatus::Running => "running",
                ActivityStatus::Completed => "completed",
                ActivityStatus::Blocked => "blocked",
                ActivityStatus::Cancelled => "cancelled",
            };
            let extra = [
                crate::records::SqlCell::from(actor),
                crate::records::SqlCell::from(id),
                crate::records::SqlCell::from(entry.at),
                crate::records::SqlCell::from(status),
                entry
                    .parent_id
                    .as_deref()
                    .map_or(crate::records::SqlCell::Null, crate::records::SqlCell::from),
                entry
                    .result_evidence
                    .as_ref()
                    .map_or(crate::records::SqlCell::Null, |evidence| {
                        crate::records::SqlCell::from(evidence.id())
                    }),
            ];
            output.write(
                "activity_occurrences",
                placement.value(),
                entry,
                &extra,
                placement.create(),
                RowEffects::default(),
            )?;
        }
        encode_map(
            &state.current,
            "current",
            "activity_current",
            &current,
            ledger,
            output,
            budget,
        )?;
        encode_map(
            &state.active,
            "active",
            "activity_active",
            &active,
            ledger,
            output,
            budget,
        )?;
        self.encode_learning_changes(state, ledger, output, budget)?;
        encode_map(
            &state.learning,
            "learning",
            "activity_learning",
            &learning,
            ledger,
            output,
            budget,
        )
    }
}
