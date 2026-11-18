//! The checkpoint supplies restored bodies. The current database supplies the
//! abandoned chronology, preserving already-issued owner positions.

use crate::store::read::admitted_query;
use crate::store::{
    CurrentOpening, DurableHead, Store, StoreError, StoreResult, durable_head, ordinal,
};
use std::collections::BTreeMap;
use tokio_postgres::Transaction;

/// Restore the same list allocations as Source before replacing any rows. The
/// release supplies the selected tables. The writer holds this exact target
/// through subsequent replacement and never loads unrelated abandoned bodies.
pub(crate) async fn reconcile_history_positions(
    store: &Store,
    tx: &Transaction<'_>,
    expected: &DurableHead,
    selected_tables: &[String],
    batch_rows: usize,
    opening: &mut CurrentOpening,
) -> StoreResult<()> {
    if batch_rows == 0 || opening.records.world_id != expected.world_id {
        return Err(StoreError::InvalidRecord);
    }
    if durable_head(tx).await?.as_ref() != Some(expected) {
        return Err(StoreError::StaleCut);
    }
    for name in selected_tables {
        // Obtain immutable identifiers from the validated release descriptors;
        // no checkpoint contents can become SQL syntax.
        let parent = store
            .schema
            .tables
            .iter()
            .find(|table| table.children.iter().any(|child| child.table == *name))
            .ok_or(StoreError::Schema)?;
        let table = parent
            .children
            .iter()
            .find(|child| child.table == *name)
            .ok_or(StoreError::Schema)?;
        let world = &expected.world_id;
        let workspace = opening
            .records
            .coverage
            .iter()
            .filter(|scope| scope.table == *name)
            .count()
            .checked_mul(192)
            .and_then(|bytes| bytes.checked_add(1024))
            .ok_or(StoreError::Capacity)?;
        let _scope = store
            .budget
            .reserve(workspace)
            .map_err(|_| StoreError::Capacity)?;
        let mut owners: BTreeMap<_, _> = opening
            .records
            .coverage
            .iter_mut()
            .filter(|scope| scope.table == *name)
            .map(|scope| {
                (
                    scope.owner.as_str(),
                    (scope.parent_present, &mut scope.next_ordinal),
                )
            })
            .collect();
        if owners.is_empty() {
            continue;
        }
        let highwater = format!(
            "SELECT o.id,t.position FROM {} o CROSS JOIN LATERAL \
             (SELECT position FROM {} WHERE world_id=o.world_id AND parent_id=o.id \
              ORDER BY position DESC LIMIT 1) t WHERE o.world_id=$1",
            parent.name, table.table,
        );
        let (_transfer, rows) = admitted_query(tx, &highwater, &[world], &store.budget).await?;
        for (_, next) in owners.values_mut() {
            **next = 0;
        }
        for row in &rows {
            let owner: &str = row.try_get(0)?;
            if let Some((_, next)) = owners.get_mut(owner) {
                **next = successor(ordinal(row.try_get(1)?)?)?;
            }
        }
        drop(rows);
        drop(_transfer);
        let select = format!(
            "SELECT id,parent_id,position FROM {} WHERE world_id=$1 AND id=ANY($2)",
            table.table,
        );
        for batch in opening
            .records
            .tables
            .get_mut(name)
            .ok_or(StoreError::Schema)?
            .chunks_mut(batch_rows)
        {
            let request_bytes = batch
                .iter()
                .try_fold(256usize, |bytes, row| {
                    bytes
                        .checked_add(64)?
                        .checked_add(row.id.len().checked_mul(2)?)
                })
                .ok_or(StoreError::Capacity)?;
            let _request = store
                .budget
                .reserve(request_bytes)
                .map_err(|_| StoreError::Capacity)?;
            let ids: Vec<_> = batch.iter().map(|row| row.id.as_str()).collect();
            let (_transfer, old) =
                admitted_query(tx, &select, &[world, &ids], &store.budget).await?;
            drop(ids);
            let mut matched = BTreeMap::new();
            for row in &old {
                let id: &str = row.try_get(0)?;
                let owner: &str = row.try_get(1)?;
                let position = ordinal(row.try_get(2)?)?;
                if matched.insert(id, (owner, position)).is_some() {
                    return Err(StoreError::InvalidRecord);
                }
            }
            for row in batch {
                let Some((true, next)) = owners.get_mut(row.parent.as_str()) else {
                    return Err(StoreError::InvalidRecord);
                };
                if row.slot != row.position.to_string() {
                    return Err(StoreError::InvalidRecord);
                }
                let position = match matched.get(row.id.as_str()) {
                    Some(&(owner, position)) if owner == row.parent => position,
                    Some(_) => return Err(StoreError::InvalidRecord),
                    None => {
                        let position = **next;
                        **next = successor(position)?;
                        position
                    }
                };
                if position != row.position {
                    row.position = position;
                    // Recovery can extend a decimal slot to 16 bytes. Admit it
                    // before replacing the backing retained by the installer.
                    let prior = row.slot.capacity();
                    let bound = opening
                        .custody
                        .bytes()
                        .checked_add(16)
                        .ok_or(StoreError::Capacity)?;
                    opening
                        .custody
                        .resize(bound)
                        .map_err(|_| StoreError::Capacity)?;
                    row.slot = position.to_string();
                    let retained = bound
                        .checked_sub(prior + 16)
                        .and_then(|bytes| bytes.checked_add(row.slot.capacity()))
                        .ok_or(StoreError::Capacity)?;
                    opening
                        .custody
                        .resize(retained)
                        .map_err(|_| StoreError::Capacity)?;
                }
            }
        }
    }
    Ok(())
}

fn successor(position: u64) -> StoreResult<u64> {
    position
        .checked_add(1)
        .filter(|next| *next <= crate::store::MAX_SAFE_INTEGER)
        .ok_or(StoreError::InvalidRecord)
}
