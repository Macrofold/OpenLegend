//! A changed semantic owner supplies complete before/after maps. This encoder
//! preserves the current schema's map order, including stable sparse positions;
//! it never selects world changes or retains another writable owner.
use super::*;
use crate::host::ByteBudget;
use crate::host::retained_size::map_storage;
use indexmap::IndexMap;
use serde::Serialize;
use std::mem::size_of;

#[derive(Clone, Copy)]
pub(crate) enum MapPositions {
    Ordered,
    Stable,
}
fn error() -> RecordEncodingError {
    RecordEncodingError("Map save requires complete current placement and allowance.")
}
pub(crate) fn encode_map_changes<T: Serialize>(
    schema: &RecordSchema,
    ledger: &RecordLedger,
    table: &str,
    parent: &[&str],
    field: Option<&str>,
    before: Option<&IndexMap<String, T>>,
    after: Option<&IndexMap<String, T>>,
    positions: MapPositions,
    output: &mut RowEncoder<'_>,
    budget: &ByteBudget,
) -> Result<(), RecordEncodingError> {
    let old_count = before.map_or(0, IndexMap::len);
    let count = after.map_or(0, IndexMap::len);
    let bytes = map_storage::<&str, u64>(old_count)
        .and_then(|bytes| bytes.checked_add(map_storage::<&str, u64>(count)?))
        .and_then(|bytes| bytes.checked_add((parent.len() + 2) * size_of::<&str>()))
        .ok_or_else(error)?;
    let _selection = budget.reserve(bytes).map_err(|_| error())?;
    let parent_bytes = crate::encoding::json_record_len(parent).map_err(|_| error())?;
    let _parent_guard = budget
        .reserve(parent_bytes * 2 + table.len() + size_of::<OwnerCoverage>())
        .map_err(|_| error())?;
    let owner_id = crate::encoding::json_record(parent).map_err(|_| error())?;
    let mut path = Vec::with_capacity(parent.len() + 2);
    path.extend_from_slice(parent);
    path.extend(field);
    let mut old_positions = IndexMap::with_capacity(old_count);
    if let Some(before) = before {
        for (index, key, _) in OrderedMapRows::new(before, budget)?.iter() {
            path.push(key);
            let id_bytes = crate::encoding::json_record_len(&path).map_err(|_| error())?;
            let _id_guard = budget.reserve(id_bytes * 2).map_err(|_| error())?;
            let id = crate::encoding::json_record(&path).map_err(|_| error())?;
            let position = match positions {
                MapPositions::Stable => ledger
                    .placement(table, &id)
                    .map_or(index, |row| row.position),
                MapPositions::Ordered => index,
            };
            old_positions.insert(key, position);
            path.pop();
        }
    }
    let mut next = ledger
        .coverage(table, &owner_id)
        .map_or(old_count as u64, |owner| owner.next_ordinal)
        .max(old_count as u64);
    let mut after_positions = IndexMap::with_capacity(count);
    if let Some(after) = after {
        let ordered = OrderedMapRows::new(after, budget)?;
        let mut last = None;
        let mut renumber = false;
        for (index, key, _) in ordered.iter() {
            let position = match positions {
                MapPositions::Ordered => index,
                MapPositions::Stable => match old_positions.get(key) {
                    Some(position) => *position,
                    None => {
                        if next >= crate::identity::MAX_SAFE_INTEGER {
                            renumber = true;
                        }
                        let position = next;
                        next = next.saturating_add(1);
                        position
                    }
                },
            };
            if matches!(positions, MapPositions::Stable)
                && last.is_some_and(|last| position <= last)
            {
                renumber = true;
            }
            after_positions.insert(key, position);
            last = Some(position);
        }
        if renumber {
            for (position, key, _) in ordered.iter() {
                *after_positions.get_mut(key).ok_or_else(error)? = position;
            }
            next = count as u64;
        }
        for (_, key, value) in ordered.iter() {
            let position = after_positions[key];
            let prior = before.and_then(|before| before.get(key));
            let layout = schema.layout(table)?;
            let old_bytes = prior
                .map(|prior| layout.project_len(prior))
                .transpose()
                .map_err(|_| error())?
                .unwrap_or(0);
            let new_bytes = layout.project_len(value).map_err(|_| error())?;
            let _encoding = budget
                .reserve(
                    old_bytes
                        .checked_add(new_bytes)
                        .and_then(|bytes| bytes.checked_mul(2))
                        .ok_or_else(error)?,
                )
                .map_err(|_| error())?;
            let payload = layout.project(value).map_err(|_| error())?;
            let old_payload = prior
                .map(|prior| layout.project(prior))
                .transpose()
                .map_err(|_| error())?;
            if old_payload.as_deref() == Some(payload.as_str())
                && old_positions.get(key) == Some(&position)
            {
                continue;
            }
            path.push(key);
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
            output.write_encoded(
                table,
                address.value(),
                &payload,
                &[],
                // Match the Source storage codec's ordinary upsert. Sparse
                // position custody does not certify an insert-only SQL write.
                false,
                RowEffects::default(),
            )?;
        }
    }
    if let Some(before) = before {
        for (_, key, _) in OrderedMapRows::new(before, budget)?.iter() {
            if after.is_some_and(|after| after.contains_key(key)) {
                continue;
            }
            path.push(key);
            let address = SelectedPlacement::new(
                ledger,
                table,
                &path,
                parent,
                key,
                old_positions[key],
                false,
                budget,
            )?;
            path.pop();
            if !address.create() {
                output.delete(table, &address.value().id, false)?;
            }
        }
    }
    output.observe_owner(&OwnerCoverage {
        table: table.into(),
        owner: owner_id,
        complete: true,
        next_ordinal: match positions {
            MapPositions::Stable => next,
            MapPositions::Ordered => count as u64,
        },
        parent_present: after.is_some(),
    })
}
