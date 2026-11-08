//! Complete finite scene/visibility lists use their real key (or positional
//! identity) and contiguous ordinals. Retained personal-history lists use their
//! separate sparse history owner and do not enter this encoder.
use super::*;
use crate::host::{ByteBudget, retained_size::map_storage};
use indexmap::IndexMap;
use serde::Serialize;
use std::mem::size_of;
fn error() -> RecordEncodingError {
    RecordEncodingError("Finite list save requires complete current placement and allowance.")
}
pub(crate) fn encode_list_changes<T: Serialize>(
    schema: &RecordSchema,
    ledger: &RecordLedger,
    table: &str,
    parent: &[&str],
    field: Option<&str>,
    before: Option<&[T]>,
    after: Option<&[T]>,
    key: fn(&T) -> Option<&str>,
    complete: bool,
    output: &mut RowEncoder<'_>,
    budget: &ByteBudget,
) -> Result<(), RecordEncodingError> {
    let collection_existed = before.is_some();
    let count = before.map_or(0, |before| before.len());
    let keys = before
        .into_iter()
        .flatten()
        .try_fold(0usize, |bytes, value| {
            bytes.checked_add(key(value).map_or(20, str::len))
        })
        .ok_or_else(error)?;
    let bytes = map_storage::<String, (u64, Option<&T>)>(count)
        .and_then(|bytes| bytes.checked_add(keys))
        .and_then(|bytes| bytes.checked_add(2 * (parent.len() + 2) * size_of::<&str>()))
        .ok_or_else(error)?;
    let _selection = budget.reserve(bytes).map_err(|_| error())?;
    let mut prior = IndexMap::with_capacity(count);
    for (index, value) in before.into_iter().flatten().enumerate() {
        let id = key(value).map_or_else(|| index.to_string(), str::to_owned);
        if prior.insert(id, (index as u64, Some(value))).is_some() {
            return Err(error());
        }
    }
    let mut prefix = Vec::with_capacity(parent.len() + 2);
    prefix.extend_from_slice(parent);
    prefix.extend(field);
    for (index, value) in after.into_iter().flatten().enumerate() {
        let _identity = budget
            .reserve(key(value).map_or(20, str::len) + 20)
            .map_err(|_| error())?;
        let id = key(value).map_or_else(|| index.to_string(), str::to_owned);
        let slot = index.to_string();
        let before = prior
            .get_mut(&id)
            .and_then(|(position, value)| value.take().map(|value| (*position, value)));
        let layout = schema.layout(table)?;
        let old_bytes = before
            .map(|(_, before)| layout.project_len(before))
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
        let old_payload = before
            .map(|(_, before)| layout.project(before))
            .transpose()
            .map_err(|_| error())?;
        let payload = layout.project(value).map_err(|_| error())?;
        if before.is_some_and(|(position, _)| position == index as u64)
            && old_payload.as_deref() == Some(payload.as_str())
        {
            continue;
        }
        let path: Vec<_> = prefix.iter().copied().chain(Some(id.as_str())).collect();
        let address = SelectedPlacement::new(
            ledger,
            table,
            &path,
            parent,
            &slot,
            index as u64,
            before.is_none(),
            budget,
        )?;
        output.write_encoded(
            table,
            address.value(),
            &payload,
            &[],
            address.create() && complete && collection_existed,
            RowEffects::default(),
        )?;
    }
    for (id, (position, value)) in &prior {
        if value.is_none() {
            continue;
        }
        let path: Vec<_> = prefix.iter().copied().chain(Some(id.as_str())).collect();
        let _identity = budget.reserve(20).map_err(|_| error())?;
        let slot = position.to_string();
        let address = SelectedPlacement::new(
            ledger, table, &path, parent, &slot, *position, false, budget,
        )?;
        if !address.create() {
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
        next_ordinal: after.map_or(0, |after| after.len()) as u64,
        parent_present: after.is_some(),
    })
}
