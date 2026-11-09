//! Exact accepted-delta folding from world-records.ts. Rows are immutable save
//! products, not live semantic records. The existing writer still owns SQL order.

use super::{ChangedRow, ChangedRows, RecordEncodingError, RecordSchema};
use crate::host::retained_size::{map_storage, tree_node_bound};
use indexmap::{IndexMap, IndexSet};
use std::collections::BTreeMap;
use std::mem::size_of;

/// Folding moves immutable payloads and SQL cells; it does not copy their rich
/// bodies. Fund the actual temporary key indexes, row vectors and mask/reference
/// sets separately from the persistent pending-save bytes.
pub(crate) fn merge_workspace_bound(previous: &ChangedRows, next: &ChangedRows) -> Option<usize> {
    let mut bytes = size_of::<ChangedRows>();
    for (table, _) in previous.writes.iter().chain(
        next.writes
            .iter()
            .filter(|(table, _)| !previous.writes.contains_key(*table)),
    ) {
        let incoming = next.writes.get(table).map_or(0, Vec::len);
        let old = previous.writes.get(table).map_or(0, Vec::len);
        let count = old.checked_add(incoming)?;
        bytes = bytes
            .checked_add(tree_node_bound::<String, IndexMap<String, ChangedRow>>()?)?
            .checked_add(table.capacity().checked_mul(2)?)?
            .checked_add(map_storage::<String, ChangedRow>(
                count.checked_mul(2)?.checked_add(1)?,
            )?)?
            .checked_add(count.checked_mul(4)?.checked_mul(size_of::<ChangedRow>())?)?
            .checked_add(count.checked_mul(tree_node_bound::<&String, ()>()?)?)?;
        for row in previous
            .writes
            .get(table)
            .into_iter()
            .flatten()
            .chain(next.writes.get(table).into_iter().flatten())
        {
            bytes = bytes.checked_add(row.id.capacity().checked_mul(2)?)?;
            for values in [
                &row.write_columns,
                &row.received_value_additions,
                &row.received_value_removals,
            ]
            .into_iter()
            .flatten()
            {
                bytes = bytes
                    .checked_add(map_storage::<String, ()>(
                        values.len().checked_mul(2)?.checked_add(1)?,
                    )?)?
                    .checked_add(
                        values
                            .len()
                            .checked_mul(4)?
                            .checked_mul(size_of::<String>())?,
                    )?;
            }
        }
    }
    for (before, after) in [
        (&previous.deletes, &next.deletes),
        (&previous.expired, &next.expired),
    ] {
        for (table, _) in before.iter().chain(
            after
                .iter()
                .filter(|(table, _)| !before.contains_key(*table)),
        ) {
            let count = before
                .get(table)
                .map_or(0, Vec::len)
                .checked_add(after.get(table).map_or(0, Vec::len))?;
            bytes = bytes
                .checked_add(tree_node_bound::<String, IndexSet<String>>()?)?
                .checked_add(table.capacity().checked_mul(2)?)?
                .checked_add(map_storage::<String, ()>(
                    count.checked_mul(2)?.checked_add(1)?,
                )?)?
                .checked_add(count.checked_mul(4)?.checked_mul(size_of::<String>())?)?
                .checked_add(count.checked_mul(tree_node_bound::<&String, ()>()?)?)?;
        }
    }
    Some(bytes)
}

fn fold_row(previous: &mut ChangedRow, mut next: ChangedRow, columns: &[String]) {
    let known_previous = previous.received_uses_changed == Some(false)
        || previous.received_value_additions.is_some();
    let known_next =
        next.received_uses_changed == Some(false) || next.received_value_additions.is_some();
    let mut added: IndexSet<String> = previous
        .received_value_additions
        .take()
        .unwrap_or_default()
        .into_iter()
        .collect();
    let mut removed: IndexSet<String> = previous
        .received_value_removals
        .take()
        .unwrap_or_default()
        .into_iter()
        .collect();
    for id in next.received_value_removals.take().unwrap_or_default() {
        if !added.shift_remove(&id) {
            removed.insert(id);
        }
    }
    for id in next.received_value_additions.take().unwrap_or_default() {
        if !removed.shift_remove(&id) {
            added.insert(id);
        }
    }
    if let Some(mask) = &next.write_columns {
        next.extra = std::mem::take(&mut previous.extra)
            .into_iter()
            .zip(next.extra)
            .enumerate()
            .map(|(at, (old, new))| {
                if mask.contains(&columns[at]) {
                    new
                } else {
                    old
                }
            })
            .collect();
    }
    next.create |= previous.create;
    next.write_columns = match (previous.write_columns.take(), next.write_columns) {
        (Some(old), Some(new)) => Some(
            old.into_iter()
                .chain(new)
                .collect::<IndexSet<_>>()
                .into_iter()
                .collect(),
        ),
        _ => None,
    };
    next.received_uses_changed = Some(
        previous.received_uses_changed != Some(false) || next.received_uses_changed != Some(false),
    );
    if previous.logical_removal == Some(true) {
        next.logical_removal = Some(true);
    }
    next.received_value_additions =
        (known_previous && known_next).then(|| added.into_iter().collect());
    next.received_value_removals =
        (known_previous && known_next).then(|| removed.into_iter().collect());
    *previous = next;
}

pub(crate) fn merge_changes(
    previous: ChangedRows,
    next: ChangedRows,
    schema: &RecordSchema,
) -> Result<ChangedRows, RecordEncodingError> {
    // Validation happens before moving the previous owner, so a refused output
    // cannot silently become an accepted partial save.
    schema.validate_changes(&previous)?;
    schema.validate_changes(&next)?;
    let mut writes: BTreeMap<String, IndexMap<String, ChangedRow>> = previous
        .writes
        .into_iter()
        .map(|(table, rows)| {
            (
                table,
                rows.into_iter().map(|row| (row.id.clone(), row)).collect(),
            )
        })
        .collect();
    let mut deletes: BTreeMap<String, IndexSet<String>> = previous
        .deletes
        .into_iter()
        .map(|(table, ids)| (table, ids.into_iter().collect()))
        .collect();
    for (table, ids) in next.deletes {
        let removed = deletes.entry(table.clone()).or_default();
        for id in ids {
            if let Some(rows) = writes.get_mut(&table) {
                rows.shift_remove(&id);
            }
            removed.insert(id);
        }
    }
    for (table, rows) in next.writes {
        let columns = &schema.layout(&table)?.columns;
        let target = writes.entry(table.clone()).or_default();
        for mut row in rows {
            if deletes
                .get_mut(&table)
                .is_some_and(|deleted| deleted.shift_remove(&row.id))
            {
                // This logical owner disappeared and returned before the same
                // SQL prefix was written. Its durable predecessor may still
                // exist; retain explicit child removals, upsert the replacement
                // and replace its complete reference closure.
                row.create = false;
                row.write_columns = None;
                if schema
                    .layout(&table)?
                    .columns
                    .iter()
                    .any(|column| column == "value_refs")
                {
                    if row.received_uses_changed == Some(false) {
                        row.received_uses_changed = Some(true);
                    }
                    row.received_value_additions = None;
                    row.received_value_removals = None;
                }
                if table == "mind_temporal_pages" {
                    row.logical_removal = Some(true);
                }
            }
            // Map.set preserves an existing key's first insertion position.
            // Mutating its slot also avoids shifting every later row.
            if let Some(previous) = target.get_mut(&row.id) {
                fold_row(previous, row, columns);
            } else {
                target.insert(row.id.clone(), row);
            }
        }
    }
    let mut expired: BTreeMap<String, IndexSet<String>> = previous
        .expired
        .into_iter()
        .map(|(table, ids)| (table, ids.into_iter().collect()))
        .collect();
    for (table, ids) in next.expired {
        expired.entry(table).or_default().extend(ids);
    }
    let writes: BTreeMap<_, Vec<_>> = writes
        .into_iter()
        .filter(|(_, rows)| !rows.is_empty())
        .map(|(table, rows)| (table, rows.into_values().collect()))
        .collect();
    let rows = writes.values().map(Vec::len).sum();
    Ok(ChangedRows {
        writes,
        rows,
        deletes: deletes
            .into_iter()
            .filter(|(_, ids)| !ids.is_empty())
            .map(|(table, ids)| (table, ids.into_iter().collect()))
            .collect(),
        expired: expired
            .into_iter()
            .map(|(table, ids)| (table, ids.into_iter().collect()))
            .collect(),
    })
}
