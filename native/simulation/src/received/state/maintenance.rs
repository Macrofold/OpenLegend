//! Recent expiry is the existing host maintenance operation, independent of
//! simulation ticks and SQL collection. Move selected short directories and
//! resident page references into sparse undo; never hydrate expired bodies.
use super::*;
use crate::execution::ExecutionError;
use crate::host::retained_size::{heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use indexmap::IndexSet;
use std::mem::size_of;

#[derive(Debug)]
pub(super) struct RecentRetirementUndo {
    blocks: Vec<super::super::RecentDirectoryBlock>,
    pages: Vec<(u64, Arc<TemporalPageRecord>)>,
    pending: Vec<(usize, Arc<PendingTemporalPage>)>,
    tail: ReceiptTailState,
    page_restore: ByteReservation,
    _storage: ByteReservation,
}
pub(crate) struct ReleasedRecentIndividuals {
    pub(crate) ids: IndexSet<String>,
    _storage: ByteReservation,
}
fn capacity() -> ExecutionError {
    ExecutionError::Capacity
}

fn keep_batch(
    recent: &ReceivedRecentDirectory,
    physical_life: u64,
    epoch: &str,
    order: u64,
    removed_through: Option<u64>,
) -> bool {
    removed_through.is_none_or(|removed| order > removed)
        && recent
            .blocks
            .contains_key(&super::super::block_key(physical_life, epoch, order))
}

impl TemporalState {
    pub(crate) fn advance_recent(
        &mut self,
        actor_id: &str,
        now: f64,
        policy: &super::super::TemporalRetentionPolicy,
        budget: &ByteBudget,
    ) -> Result<Option<ReleasedRecentIndividuals>, ExecutionError> {
        let Some(actor) = self.actors.get(actor_id) else {
            return Ok(None);
        };
        // Match retireRecentHistory's current owner check before inspecting any
        // directory. Supplied actor IDs propose work and confer no mutation.
        if !actor.header.maintenance_due
            && actor.header.bytes <= policy.max_bytes
            && actor.header.count <= policy.max_changes
            && actor.header.next_due.is_none_or(|due| due > now)
        {
            return Ok(None);
        }
        let cutoff = now - policy.max_age_seconds;
        let oldest = actor
            .recent
            .blocks
            .first_key_value()
            .and_then(|(_, directory)| directory.entries.first());
        // This is the domain owner's own no-work boundary, including a stale
        // host deadline whose actual first block has not expired.
        if !actor.header.maintenance_due
            && actor.recent.bytes <= policy.max_bytes
            && actor.recent.count <= policy.max_changes
            && oldest.is_none_or(|header| header.at > cutoff)
        {
            return Ok(None);
        }
        let header_bytes = actor.header.heap_bytes().ok_or_else(capacity)?;
        let _header_workspace = budget.reserve(
            header_bytes
                .checked_mul(4)
                .and_then(|n| n.checked_add(actor.payload.len().checked_mul(2)?))
                .and_then(|n| n.checked_add(size_of::<TemporalActorHeader>()))
                .ok_or_else(capacity)?,
        )?;
        let mut header = actor.header.clone();
        let frontier = header.frontier.get_or_insert(ReceivedFrontier {
            expired_through_time: None,
            pressure_through: None,
        });
        let mut bytes = actor.recent.bytes;
        let mut count = actor.recent.count;
        let mut removed = 0usize;
        let mut removed_through = None;
        let mut next_due = None;
        let mut individual_count = 0usize;
        let mut individual_bytes = 0usize;
        for directory in actor.recent.blocks.values() {
            let first = directory
                .entries
                .first()
                .expect("owned recent block has a header");
            if first.at > cutoff && bytes <= policy.max_bytes && count <= policy.max_changes {
                next_due = Some(first.at + policy.max_age_seconds);
                break;
            }
            let end = first.last_position();
            if frontier
                .pressure_through
                .as_ref()
                .is_none_or(|pressure| end > pressure.address)
            {
                frontier.pressure_through = Some(super::super::ReceivedPressureFrontier {
                    address: end,
                    received_at: first.through_at,
                    order: first.order,
                });
            }
            for entry in &directory.entries {
                bytes = bytes
                    .checked_sub(entry.bytes)
                    .ok_or(ExecutionError::Invariant)?;
                count = count
                    .checked_sub(entry.count)
                    .ok_or(ExecutionError::Invariant)?;
                individual_count = individual_count
                    .checked_add(entry.individual_ids.len())
                    .ok_or_else(capacity)?;
                individual_bytes = individual_bytes
                    .checked_add(
                        entry
                            .individual_ids
                            .iter()
                            .try_fold(0usize, |n, id| n.checked_add(id.len()))
                            .ok_or_else(capacity)?,
                    )
                    .ok_or_else(capacity)?;
            }
            removed += 1;
            removed_through = Some(first.batch_order);
        }
        if cutoff >= 0.0 {
            frontier.expired_through_time = Some(
                frontier
                    .expired_through_time
                    .map_or(cutoff, |prior| prior.max(cutoff)),
            );
        }
        header.bytes = bytes;
        header.count = count;
        header.next_due = next_due;
        header.maintenance_due = false;
        if header
            .recording_gap
            .as_ref()
            .is_some_and(|gap| gap.through <= cutoff)
        {
            header.recording_gap = None;
        }
        let directories = actor.recent.blocks.values().take(removed);
        // Pin the actual moved blocks before any canonical changes; their
        // existing resident guards follow them into the inverse journal.
        for directory in directories.clone() {
            budget.retain_record(&directory.storage)?;
        }
        let mut key_bytes = 0usize;
        let mut batches = 0usize;
        for batch in actor
            .pages
            .values()
            .flat_map(|page| page.batches())
            .chain(actor.pending_pages.iter().map(|page| page.batch()))
        {
            batches = batches.checked_add(1).ok_or_else(capacity)?;
            key_bytes = key_bytes
                .checked_add(batch.epoch.len().checked_mul(8).ok_or_else(capacity)?)
                .ok_or_else(capacity)?;
        }
        let storage = budget.reserve(
            heap_sum([
                actor_id.len(),
                key_bytes,
                batches.checked_mul(128).ok_or_else(capacity)?,
                removed
                    .checked_mul(size_of::<super::super::RecentDirectoryBlock>())
                    .ok_or_else(capacity)?,
                actor
                    .pages
                    .len()
                    .checked_mul(size_of::<(u64, Arc<TemporalPageRecord>)>() + size_of::<u64>())
                    .ok_or_else(capacity)?,
                actor
                    .pending_pages
                    .len()
                    .checked_mul(
                        size_of::<(usize, Arc<PendingTemporalPage>)>() + size_of::<usize>(),
                    )
                    .ok_or_else(capacity)?,
            ])
            .ok_or_else(capacity)?,
        )?;
        let individual_storage = budget.reserve(
            map_storage::<String, ()>(
                individual_count
                    .checked_mul(2)
                    .and_then(|n| n.checked_add(4))
                    .ok_or_else(capacity)?,
            )
            .and_then(|n| n.checked_add(individual_bytes))
            .ok_or_else(capacity)?,
        )?;
        let mut ids = IndexSet::with_capacity(individual_count);
        for directory in directories {
            for id in directory
                .entries
                .iter()
                .flat_map(|header| &header.individual_ids)
            {
                ids.insert(id.clone());
            }
        }
        let mut page_positions = Vec::with_capacity(actor.pages.len());
        for (position, page) in &actor.pages {
            if !page.batches().any(|batch| {
                keep_batch(
                    &actor.recent,
                    batch.physical_life,
                    &batch.epoch,
                    batch.batch_order,
                    removed_through,
                )
            }) {
                page.retain_for_candidate(budget)?;
                page_positions.push(*position);
            }
        }
        let mut pending_positions = Vec::with_capacity(actor.pending_pages.len());
        for (position, page) in actor.pending_pages.iter().enumerate() {
            let batch = page.batch();
            if !keep_batch(
                &actor.recent,
                batch.physical_life,
                &batch.epoch,
                batch.batch_order,
                removed_through,
            ) {
                page.retain_for_candidate(budget)?;
                pending_positions.push(position);
            }
        }
        let mut before = RecentRetirementUndo {
            blocks: Vec::with_capacity(removed),
            pages: Vec::with_capacity(page_positions.len()),
            pending: Vec::with_capacity(pending_positions.len()),
            tail: actor.tail,
            page_restore: budget.reserve(restored_page_bytes(page_positions.len())?)?,
            _storage: storage,
        };
        self.reserve_undo_slots(2, budget)?;
        self.replace_header(actor_id, header)?;
        let actor = self
            .actors
            .get_mut(actor_id)
            .expect("selected temporal actor");
        for _ in 0..removed {
            let (_, directory) = actor
                .recent
                .blocks
                .pop_first()
                .expect("planned oldest block");
            for entry in &directory.entries {
                actor.recent.bytes -= entry.bytes;
                actor.recent.count -= entry.count;
                for id in &entry.individual_ids {
                    let held = actor
                        .recent
                        .individuals
                        .get_mut(id)
                        .expect("owned recent membership");
                    *held -= 1;
                    if *held == 0 {
                        actor.recent.individuals.remove(id);
                    }
                }
            }
            before.blocks.push(directory);
        }
        for position in page_positions {
            before.pages.push((
                position,
                actor
                    .pages
                    .remove(&position)
                    .expect("planned resident page"),
            ));
        }
        actor.settle_page_entries()?;
        for position in pending_positions.into_iter().rev() {
            before
                .pending
                .push((position, actor.pending_pages.remove(position)));
        }
        self.undo.push(TemporalUndo::RecentRetirement {
            actor_id: actor_id.to_owned(),
            before,
        });
        actor.tail = actor
            .tail
            .projected(&actor.pages, &actor.pending_pages, false)?;
        Ok(Some(ReleasedRecentIndividuals {
            ids,
            _storage: individual_storage,
        }))
    }
}

impl RecentRetirementUndo {
    pub(super) fn restore(self, actor: &mut TemporalActorHistory) -> Result<(), ReceivedError> {
        if self.page_restore.bytes() != 0 {
            actor.recent.budget.restore_backing(&mut actor.page_storage, self.page_restore)
                .map_err(|_| ReceivedError("Temporal inverse page-index custody is unavailable."))?;
        }
        for block in self.blocks {
            actor.recent.restore_block(block)?;
        }
        for (position, page) in self.pages {
            actor.pages.insert(position, page);
        }
        for (position, page) in self.pending.into_iter().rev() {
            actor.pending_pages.insert(position, page);
        }
        actor.tail = self.tail;
        actor.settle_page_entries()?;
        Ok(())
    }
}
