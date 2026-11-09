//! A purpose-bound history edit imports only selected physical rows. Loading a
//! row neither grants historical absence nor changes the actor's logical charge
//! directory. The owning preparation cursor validates the SQL selection witness.
use super::*;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::retained_size::{heap_sum, map_storage, tree_node_bound};
use crate::host::{ByteBudget, ByteReservation};
use crate::records::RecordPlacement;
use std::mem::size_of;
use std::collections::BTreeSet;

pub(crate) struct HydratedTemporalRows {
    pub(crate) placements: Vec<RecordPlacement>,
    _storage: ByteReservation,
}
fn invalid() -> ExecutionError {
    ReceivedError("Selected temporal rows differ from their accepted physical contents.").into()
}
fn capacity() -> ExecutionError {
    ExecutionError::Capacity
}

/// Called only after exact cut/selection validation and missing-value import.
/// Existing pages remain shared, and generic partial coverage remains partial.
pub(crate) fn hydrate_selected_temporal_pages(
    core: &mut CoreMutation<'_>,
    rows: Vec<InstalledRow>,
    budget: &ByteBudget,
) -> Result<HydratedTemporalRows, ExecutionError> {
    let mut bytes = rows
        .len()
        .checked_mul(size_of::<RecordPlacement>())
        .ok_or_else(capacity)?;
    let mut decode = 0;
    for row in &rows {
        bytes = heap_sum([bytes, row.id.len(), row.parent.len(), row.slot.len()])
            .ok_or_else(capacity)?;
        decode = decode.max(crate::experience::encoded_body_bound(&row.payload)?);
    }
    let storage = budget.reserve(bytes)?;
    let _decode = budget.reserve(decode)?;
    let mut placements = Vec::new();
    placements
        .try_reserve_exact(rows.len())
        .map_err(|_| capacity())?;
    let _groups = budget.reserve(
        map_storage::<String, Vec<InstalledRow>>(rows.len())
            .ok_or_else(capacity)?
            .checked_add(
                rows.len()
                    .checked_mul(size_of::<InstalledRow>())
                    .ok_or_else(capacity)?,
            )
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
        placements.push(RecordPlacement {
            id: row.id.clone(),
            parent: row.parent.clone(),
            slot: row.slot.clone(),
            position: row.position,
        });
        grouped.entry(actor.to_owned()).or_default().push(row);
    }
    for (actor_id, rows) in grouped {
        let actor = core
            .state
            .temporal
            .actors
            .get(&actor_id)
            .ok_or_else(invalid)?;
        let count = actor
            .pages
            .len()
            .checked_add(rows.len())
            .ok_or_else(capacity)?;
        let names = rows
            .iter()
            .try_fold(0usize, |n, row| n.checked_add(row.id.len()))
            .ok_or_else(capacity)?;
        let mut bookkeeping = budget.reserve(
            heap_sum([
                count
                    .checked_mul(
                        tree_node_bound::<u64, Arc<TemporalPageRecord>>().ok_or_else(capacity)?,
                    )
                    .ok_or_else(capacity)?,
                rows.len()
                    .checked_mul(size_of::<String>())
                    .ok_or_else(capacity)?,
                names,
            ])
            .ok_or_else(capacity)?,
        )?;
        for page in actor.pages.values() { page.retain_for_candidate(budget)?; }
        for page in &actor.pending_pages { page.retain_for_candidate(budget)?; }
        let mut pages = actor.pages.clone();
        let mut projected = Vec::new();
        projected
            .try_reserve_exact(rows.len())
            .map_err(|_| capacity())?;
        let mut represented = BTreeSet::<u64>::new();
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
            let values = core.state.reception.received_values.as_ref();
            let mut page = TemporalPageRecord::install(
                row,
                &actor_id,
                core.state.physical.header.sim_time,
                &values,
                Some(&core.state.installed.account_law()),
                &core.state.activity.display,
                budget,
            )?;
            if page.position() >= actor.page_order_upper_bound
                || pages.contains_key(&page.position())
            {
                return Err(invalid());
            }
            bookkeeping.resize(
                bookkeeping
                    .bytes()
                    .checked_add(
                        page.batches()
                            .count()
                            .checked_mul(tree_node_bound::<u64, ()>().ok_or_else(capacity)?)
                            .ok_or_else(capacity)?,
                    )
                    .ok_or_else(capacity)?,
            )?;
            let mut pending_projection = false;
            for batch in page.batches() {
                if pages.values().flat_map(|page| page.batches()).any(|known| {
                    known.physical_life == batch.physical_life
                        && known.epoch == batch.epoch
                        && known.batch_order == batch.batch_order
                }) || !represented.insert(batch.batch_order)
                {
                    return Err(invalid());
                }
                if let Some(pending) = actor.pending_pages.iter().find(|pending| {
                    let known = pending.batch();
                    known.physical_life == batch.physical_life
                        && known.epoch == batch.epoch
                        && known.batch_order == batch.batch_order
                }) {
                    if pending.batch().value() != batch.value() {
                        return Err(invalid());
                    }
                    pending_projection = true;
                }
            }
            if pending_projection {
                // The readAtCut overlay has only projected these unsaved bodies.
                // Their actual row (or later tombstone) must be emitted at accept;
                // older ACKs must not substitute an earlier captured version.
                page.protect_unsaved()?;
                projected.push(page.row_id().to_owned());
            }
            pages.insert(page.position(), Arc::new(page));
        }
        if pages.len() == actor.pages.len() {
            continue;
        }
        let keep = actor
            .pending_pages
            .iter()
            .filter(|pending| {
                let batch = pending.batch();
                !represented.contains(&batch.batch_order)
            })
            .count();
        let pending_storage = budget.reserve_backing(
            keep.checked_mul(size_of::<Arc<PendingTemporalPage>>())
                .ok_or_else(capacity)?,
        )?;
        let mut pending = Vec::new();
        pending.try_reserve_exact(keep).map_err(|_| capacity())?;
        pending.extend(
            actor
                .pending_pages
                .iter()
                .filter(|pending| {
                    let batch = pending.batch();
                    !represented.contains(&batch.batch_order)
                })
                .cloned(),
        );
        let temporal = &mut core.state.temporal;
        temporal.reserve_undo_slots(2, budget)?;
        temporal.undo.push(TemporalUndo::Reservation(bookkeeping));
        let actor = temporal.actors.get_mut(&actor_id).ok_or_else(invalid)?;
        temporal.undo.push(TemporalUndo::HydratedPages {
            actor_id,
            before: std::mem::replace(&mut actor.pages, pages),
            pending: std::mem::replace(&mut actor.pending_pages, pending),
            pending_storage: std::mem::replace(&mut actor.pending_storage, pending_storage),
            complete: actor.complete_pages,
            next_ordinal: actor.page_order_upper_bound,
            projected,
        });
        // The existing recent/frontier/charge metadata describes all relevant
        // SQL directories already; hydration must not rebuild it from a subset.
    }
    Ok(HydratedTemporalRows {
        placements,
        _storage: storage,
    })
}
