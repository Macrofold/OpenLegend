//! Journal-selected keyed records. Ordinary maps inspect sibling positions only
//! after membership changes; unordered maps never renumber siblings. These
//! Source dictionaries have partial collection contracts and use ordinary SQL
//! upserts; native placement custody remains independently complete.
use super::*;
use crate::host::{ByteBudget, retained_size::map_storage};
use indexmap::IndexMap;
use serde::Serialize;
use std::mem::size_of;
fn error() -> RecordEncodingError {
    RecordEncodingError("Sparse map save requires complete current placement and allowance.")
}
pub(crate) fn encode_sparse_map_changes<T: Serialize>(
    schema: &RecordSchema,
    ledger: &RecordLedger,
    table: &str,
    parent: &[&str],
    field: Option<&str>,
    before: &IndexMap<&str, Option<&T>>,
    after: Option<&IndexMap<String, T>>,
    unordered: bool,
    output: &mut RowEncoder<'_>,
    budget: &ByteBudget,
) -> Result<(), RecordEncodingError> {
    let membership = before
        .iter()
        .any(|(key, prior)| prior.is_some() != after.is_some_and(|after| after.contains_key(*key)));
    let count = if membership && !unordered {
        after.map_or(0, IndexMap::len)
    } else {
        before.len()
    };
    let _selection = budget
        .reserve(
            map_storage::<&str, Option<u64>>(count)
                .and_then(|bytes| bytes.checked_add((parent.len() + 2) * size_of::<&str>()))
                .ok_or_else(error)?,
        )
        .map_err(|_| error())?;
    let mut selected = IndexMap::with_capacity(count);
    if membership && !unordered {
        if let Some(after) = after {
            for (position, key, _) in OrderedMapRows::new(after, budget)?.iter() {
                selected.insert(key, Some(position));
            }
        }
    }
    for key in before.keys() {
        selected.entry(*key).or_insert(unordered.then_some(0));
    }
    let mut path = Vec::with_capacity(parent.len() + 2);
    path.extend_from_slice(parent);
    path.extend(field);
    for (key, position) in selected {
        let current = after.and_then(|after| after.get(key));
        let prior = before.get(key).copied().unwrap_or(current);
        path.push(key);
        let id_bytes = crate::encoding::json_record_len(&path).map_err(|_| error())?;
        let _id_guard = budget.reserve(id_bytes * 2).map_err(|_| error())?;
        let id = crate::encoding::json_record(&path).map_err(|_| error())?;
        let previous = ledger.placement(table, &id);
        let old_position = if unordered {
            Some(0)
        } else {
            previous.map(|row| row.position)
        };
        let position = position.or(old_position).unwrap_or(0);
        let address = SelectedPlacement::new(
            ledger,
            table,
            &path,
            parent,
            key,
            position,
            prior.is_none(),
            budget,
        )?;
        path.pop();
        if let Some(current) = current {
            if !unordered && !membership && old_position.is_none() {
                return Err(error());
            }
            let layout = schema.layout(table)?;
            let bytes = prior
                .map(|prior| layout.project_len(prior))
                .transpose()
                .map_err(|_| error())?
                .unwrap_or(0)
                .checked_add(layout.project_len(current).map_err(|_| error())?)
                .and_then(|bytes| bytes.checked_mul(2))
                .ok_or_else(error)?;
            let _encoding = budget.reserve(bytes).map_err(|_| error())?;
            let prior_payload = prior
                .map(|prior| layout.project(prior))
                .transpose()
                .map_err(|_| error())?;
            let payload = layout.project(current).map_err(|_| error())?;
            if prior_payload.as_deref() == Some(payload.as_str()) && old_position == Some(position)
            {
                continue;
            }
            output.write_encoded(
                table,
                address.value(),
                &payload,
                &[],
                false,
                RowEffects::default(),
            )?;
        } else if prior.is_some() && !address.create() {
            output.delete(table, &address.value().id, false)?;
        }
    }
    let bytes = crate::encoding::json_record_len(parent).map_err(|_| error())?;
    let _coverage = budget
        .reserve(bytes * 2 + table.len() + size_of::<OwnerCoverage>())
        .map_err(|_| error())?;
    output.observe_owner(&OwnerCoverage {
        table: table.into(),
        owner: crate::encoding::json_record(parent).map_err(|_| error())?,
        complete: true,
        next_ordinal: if unordered {
            u64::from(after.is_some_and(|after| !after.is_empty()))
        } else {
            after.map_or(0, IndexMap::len) as u64
        },
        parent_present: after.is_some(),
    })
}
/// Parent markers disclose no child body. Membership changes alone can change
/// other observers' ordinals in an ordered root.
pub(crate) fn encode_marked_owners<T>(
    ledger: &RecordLedger,
    table: &str,
    field: &str,
    before: &IndexMap<&str, bool>,
    after: Option<&IndexMap<String, T>>,
    unordered: bool,
    array: bool,
    output: &mut RowEncoder<'_>,
    budget: &ByteBudget,
) -> Result<(), RecordEncodingError> {
    let membership = before
        .iter()
        .any(|(key, prior)| *prior != after.is_some_and(|after| after.contains_key(*key)));
    let count = if membership && !unordered {
        after.map_or(0, IndexMap::len)
    } else {
        before.len()
    };
    let _selection = budget
        .reserve(map_storage::<&str, Option<u64>>(count).ok_or_else(error)?)
        .map_err(|_| error())?;
    let mut selected = IndexMap::with_capacity(count);
    if membership && !unordered {
        if let Some(after) = after {
            for (position, key, _) in OrderedMapRows::new(after, budget)?.iter() {
                selected.insert(key, Some(position));
            }
        }
    }
    for key in before.keys() {
        selected.entry(*key).or_insert(unordered.then_some(0));
    }
    for (key, position) in selected {
        let present = after.is_some_and(|after| after.contains_key(key));
        let path = ["world", field, key];
        let bytes = crate::encoding::json_record_len(&path).map_err(|_| error())?;
        let _guard = budget.reserve(bytes * 2).map_err(|_| error())?;
        let id = crate::encoding::json_record(&path).map_err(|_| error())?;
        let prior = ledger.placement(table, &id);
        let old_position = if unordered {
            Some(0)
        } else {
            prior.map(|prior| prior.position)
        };
        let position = position.or(old_position).unwrap_or(0);
        let was_present = before.get(key).copied().unwrap_or(present);
        if present && was_present && old_position == Some(position) {
            continue;
        }
        let address = SelectedPlacement::new(
            ledger,
            table,
            &path,
            &["world"],
            key,
            position,
            !was_present,
            budget,
        )?;
        if present {
            output.write_encoded(
                table,
                address.value(),
                if array { "[]" } else { "{}" },
                &[],
                false,
                RowEffects::default(),
            )?;
        } else if !address.create() {
            output.delete(table, &address.value().id, false)?;
        }
    }
    let _guard = budget
        .reserve(table.len() + 64 + size_of::<OwnerCoverage>())
        .map_err(|_| error())?;
    output.observe_owner(&OwnerCoverage {
        table: table.into(),
        owner: "[\"world\"]".into(),
        complete: true,
        next_ordinal: if unordered {
            u64::from(after.is_some_and(|after| !after.is_empty()))
        } else {
            after.map_or(0, IndexMap::len) as u64
        },
        parent_present: after.is_some(),
    })
}
