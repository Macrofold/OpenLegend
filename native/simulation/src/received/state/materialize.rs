//! A purpose-bound history edit imports only selected physical rows. Loading a
//! row neither grants historical absence nor changes the actor's logical charge
//! directory. The owning preparation cursor validates the SQL selection witness.
use super::*;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::ByteBudget;
use crate::host::retained_size::{heap_sum, map_storage, tree_node_bound};
use std::{collections::BTreeSet, mem::size_of};
fn invalid() -> ExecutionError {
    ReceivedError("Selected temporal rows differ from their accepted physical contents.").into()
}
fn capacity() -> ExecutionError {
    ExecutionError::Capacity
}

/// Insert only genuinely missing pages. Sparse inverses retain actual removed
/// pending owners; repeated SQL closure rounds never clone the growing history.
pub(crate) fn hydrate_selected_temporal_pages(
    core: &mut CoreMutation<'_>,
    rows: Vec<InstalledRow>,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let mut decode = 0;
    for row in &rows {
        decode = decode.max(crate::experience::encoded_body_bound(&row.payload)?);
    }
    let _decode = budget.reserve(decode)?;
    let _groups = budget.reserve(
        map_storage::<String, Vec<InstalledRow>>(
            rows.len()
                .checked_mul(2)
                .and_then(|n| n.checked_add(4))
                .ok_or_else(capacity)?,
        )
        .ok_or_else(capacity)?
        .checked_add(
            rows.len()
                .checked_mul(4 * size_of::<InstalledRow>())
                .ok_or_else(capacity)?,
        )
        .and_then(|n| {
            n.checked_add(
                rows.iter()
                    .try_fold(0usize, |n, row| n.checked_add(row.id.len()))?,
            )
        })
        .ok_or_else(capacity)?,
    )?;
    let mut grouped = IndexMap::<String, Vec<InstalledRow>>::new();
    for row in rows {
        let actor = row
            .extra
            .first()
            .and_then(crate::records::SqlCell::as_str)
            .ok_or_else(invalid)?;
        if !core.state.temporal.actors.contains_key(actor) {
            return Err(invalid());
        }
        grouped.entry(actor.to_owned()).or_default().push(row);
    }
    for (actor_id, rows) in grouped {
        let actor = core
            .state
            .temporal
            .actors
            .get(&actor_id)
            .ok_or_else(invalid)?;
        let count = rows.len();
        let mut temporary = 0usize;
        for batch in actor.pages.values().flat_map(|page| page.batches()) {
            temporary = heap_sum([
                temporary,
                tree_node_bound::<(u64, String, u64), ()>().ok_or_else(capacity)?,
                batch.epoch.len(),
            ])
            .ok_or_else(capacity)?;
        }
        temporary = temporary
            .checked_add(
                actor
                    .pending_pages
                    .iter()
                    .map(|page| page.batch().epoch.len())
                    .max()
                    .unwrap_or(0)
                    .checked_mul(2)
                    .ok_or_else(capacity)?,
            )
            .ok_or_else(capacity)?;
        let mut scratch = budget.reserve(temporary)?;
        let names = rows
            .iter()
            .try_fold(0usize, |n, row| n.checked_add(row.id.len()))
            .ok_or_else(capacity)?;
        let mut bookkeeping = budget.reserve(
            heap_sum([
                actor_id.len(),
                names,
                count
                    .checked_mul(size_of::<u64>() + size_of::<String>())
                    .ok_or_else(capacity)?,
            ])
            .ok_or_else(capacity)?,
        )?;
        let _staging = budget.reserve(
            count
                .checked_mul(size_of::<Arc<TemporalPageRecord>>())
                .ok_or_else(capacity)?,
        )?;
        let mut known = actor
            .pages
            .values()
            .flat_map(|page| page.batches())
            .map(|batch| (batch.physical_life, batch.epoch.clone(), batch.batch_order))
            .collect::<BTreeSet<_>>();
        let mut introduced = BTreeSet::new();
        let mut pages = Vec::new();
        pages.try_reserve_exact(count).map_err(|_| capacity())?;
        let mut positions = Vec::new();
        positions.try_reserve_exact(count).map_err(|_| capacity())?;
        let mut projected = Vec::new();
        projected.try_reserve_exact(count).map_err(|_| capacity())?;
        for row in rows {
            if let Some(previous) = actor.pages.values().find(|page| page.row_id() == row.id) {
                if previous.position() != row.position
                    || previous.payload() != row.payload
                    || previous.columns() != row.extra
                {
                    return Err(invalid());
                }
                continue;
            }
            let mut page = TemporalPageRecord::install(
                row,
                &actor_id,
                core.state.physical.header.sim_time,
                &core.state.reception.received_values.as_ref(),
                Some(&core.state.installed.account_law()),
                &core.state.activity.display,
                budget,
            )?;
            if page.position() >= core.state.physical.identity.next_id()
                || actor.pages.contains_key(&page.position())
                || positions.contains(&page.position())
            {
                return Err(invalid());
            }
            let extra = page
                .batches()
                .try_fold(0usize, |n, batch| {
                    heap_sum([
                        n,
                        tree_node_bound::<(u64, String, u64), ()>()?.checked_mul(2)?,
                        batch.epoch.len().checked_mul(2)?,
                    ])
                })
                .ok_or_else(capacity)?;
            scratch.resize(scratch.bytes().checked_add(extra).ok_or_else(capacity)?)?;
            let mut pending_projection = false;
            for batch in page.batches() {
                let key = (batch.physical_life, batch.epoch.clone(), batch.batch_order);
                if !known.insert(key.clone()) {
                    return Err(invalid());
                }
                introduced.insert(key);
                if let Some(pending) = actor.pending_pages.iter().find(|pending| {
                    let known = pending.batch();
                    known.physical_life == batch.physical_life
                        && known.epoch == batch.epoch
                        && known.batch_order == batch.batch_order
                }) {
                    if pending.batch().value() != batch.value() {
                        return Err(invalid());
                    }
                    pending.retain_for_candidate(budget)?;
                    pending_projection = true;
                }
            }
            if pending_projection {
                // This is only a readAtCut projection of an unsaved append. Its
                // actual final row/tombstone must be emitted before acceptance.
                page.protect_unsaved()?;
                projected.push(page.row_id().to_owned());
            }
            positions.push(page.position());
            pages.push(Arc::new(page));
        }
        if pages.is_empty() {
            continue;
        }
        let removed_count = actor
            .pending_pages
            .iter()
            .filter(|page| {
                let batch = page.batch();
                introduced.contains(&(batch.physical_life, batch.epoch.clone(), batch.batch_order))
            })
            .count();
        bookkeeping.resize(
            bookkeeping
                .bytes()
                .checked_add(
                    removed_count
                        .checked_mul(size_of::<(usize, Arc<PendingTemporalPage>)>())
                        .ok_or_else(capacity)?,
                )
                .ok_or_else(capacity)?,
        )?;
        let mut pending = Vec::new();
        pending
            .try_reserve_exact(removed_count)
            .map_err(|_| capacity())?;
        for (position, page) in actor.pending_pages.iter().enumerate() {
            let batch = page.batch();
            if introduced.contains(&(batch.physical_life, batch.epoch.clone(), batch.batch_order)) {
                pending.push((position, Arc::clone(page)));
            }
        }
        let temporal = &mut core.state.temporal;
        temporal.reserve_undo_slots(2, budget)?;
        temporal.undo.push(TemporalUndo::Reservation(bookkeeping));
        let actor = temporal.actors.get_mut(&actor_id).ok_or_else(invalid)?;
        actor.reserve_page_entries(
            actor
                .pages
                .len()
                .checked_add(pages.len())
                .ok_or_else(capacity)?,
            budget,
        )?;
        temporal.undo.push(TemporalUndo::HydratedPages {
            actor_id,
            positions,
            pending,
            next_ordinal: actor.page_order_upper_bound,
            projected,
        });
        for page in pages {
            actor.pages.insert(page.position(), page);
        }
        actor.pending_pages.retain(|page| {
            let batch = page.batch();
            !introduced.contains(&(batch.physical_life, batch.epoch.clone(), batch.batch_order))
        });
        actor.page_order_upper_bound = actor
            .page_order_upper_bound
            .max(core.state.physical.identity.next_id());
        // Existing recent/frontier/charge metadata describes all relevant SQL
        // directories already. Generic partial coverage remains partial.
    }
    Ok(())
}
