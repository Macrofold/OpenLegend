//! Admission is read-only; applying the prepared placement moves/frees already
//! funded owners. The session invokes it only after genuine ACK and while idle.
use super::*;
use crate::execution::ExecutionError;
use crate::host::retained_size::tree_node_bound;
use crate::received::values::PreparedValueResidency;
use crate::simulation::SimulationState;
use std::collections::{BTreeMap, BTreeSet};

struct ActorProjection {
    pages: BTreeMap<u64, Arc<TemporalPageRecord>>,
    pending: Vec<Arc<PendingTemporalPage>>,
    pending_storage: crate::host::ResidentReservation,
    complete: bool,
    upper_bound: u64,
    tail: ReceiptTailState,
    page_storage: ByteReservation,
}
pub(crate) struct PreparedTemporalResidency {
    world: String,
    generation: String,
    cut: u64,
    identity: u64,
    actors: IndexMap<String, ActorProjection>,
    values: Option<PreparedValueResidency>,
    acknowledged_edits: Vec<Arc<TemporalPageEditIdentity>>,
    _storage: ByteReservation,
}
fn invalid() -> ExecutionError {
    ExecutionError::Invariant
}
fn capacity() -> ExecutionError {
    ExecutionError::Capacity
}
fn acknowledged_edit(page: &TemporalPageRecord, tail: Option<&SavedActorTail>) -> bool {
    page.edit_identity().is_some_and(|identity| {
        tail.is_some_and(|tail| tail.edits.iter().any(|saved| Arc::ptr_eq(identity, saved)))
    })
}
fn protected_edit(page: &TemporalPageRecord, tail: Option<&SavedActorTail>) -> bool {
    page.edit_identity()
        .is_some_and(|identity| !identity.acknowledged())
        && !acknowledged_edit(page, tail)
}
fn same_pages(
    a: &BTreeMap<u64, Arc<TemporalPageRecord>>,
    b: &BTreeMap<u64, Arc<TemporalPageRecord>>,
) -> bool {
    a.len() == b.len()
        && a.iter()
            .all(|(key, page)| b.get(key).is_some_and(|next| Arc::ptr_eq(page, next)))
}
impl SavedTemporalResidency {
    pub(crate) fn prepare_apply(
        &self,
        state: &SimulationState,
        budget: &ByteBudget,
    ) -> Result<PreparedTemporalResidency, ExecutionError> {
        if self.world_id != state.physical.header.id
            || self.generation != state.generation
            || self.through_cut > state.accepted_cut
            || self.identity_through > state.physical.identity.next_id()
        {
            return Err(invalid());
        }
        let count = state
            .temporal
            .actors
            .values()
            .try_fold(0usize, |n, a| {
                n.checked_add(a.pages.len())?
                    .checked_add(a.pending_pages.len())
            })
            .ok_or_else(capacity)?;
        let saved = self
            .actors
            .values()
            .try_fold(0usize, |n, a| n.checked_add(a.pages.len()))
            .ok_or_else(capacity)?;
        let names = state
            .temporal
            .actors
            .keys()
            .try_fold(0usize, |n, id| n.checked_add(id.len()))
            .ok_or_else(capacity)?;
        let edit_count = self
            .actors
            .values()
            .try_fold(0usize, |n, tail| n.checked_add(tail.edits.len()))
            .ok_or_else(capacity)?;
        let bytes = heap_sum([
            size_of::<PreparedTemporalResidency>(),
            state.physical.header.id.len(),
            state.generation.len(),
            names,
            edit_count
                .checked_mul(size_of::<Arc<TemporalPageEditIdentity>>())
                .ok_or_else(capacity)?,
            map_storage::<String, ActorProjection>(
                state
                    .temporal
                    .actors
                    .len()
                    .checked_mul(2)
                    .and_then(|n| n.checked_add(1))
                    .ok_or_else(capacity)?,
            )
            .ok_or_else(capacity)?,
            count
                .checked_add(saved)
                .and_then(|n| {
                    n.checked_mul(
                        tree_node_bound::<u64, Arc<TemporalPageRecord>>()?.checked_mul(2)?,
                    )
                })
                .ok_or_else(capacity)?,
            count
                .checked_mul(tree_node_bound::<(u64, &str, u64), ()>().ok_or_else(capacity)?)
                .ok_or_else(capacity)?,
        ])
        .ok_or_else(capacity)?;
        let mut storage = budget.reserve(bytes)?;
        let mut acknowledged_edits = Vec::new();
        acknowledged_edits
            .try_reserve_exact(edit_count)
            .map_err(|_| capacity())?;
        for tail in self.actors.values() {
            acknowledged_edits.extend(tail.edits.iter().cloned());
        }
        let mut actors = IndexMap::new();
        actors
            .try_reserve(state.temporal.actors.len())
            .map_err(|_| capacity())?;
        for (id, actor) in &state.temporal.actors {
            let affected = self.affected.contains(id);
            let tail = self.actors.get(id);
            let mut page_storage = storage.split_off(fresh_page_map_bytes(
                actor.pages.len().checked_add(tail.map_or(0, |tail| tail.pages.len())).ok_or_else(capacity)?
            )?)?;
            let mut pages = BTreeMap::new();
            let mut represented = BTreeSet::new();
            for page in &actor.pending_pages {
                let batch = page.batch();
                if batch.batch_order < self.identity_through {
                    represented.insert((
                        batch.physical_life,
                        batch.epoch.as_str(),
                        batch.batch_order,
                    ));
                }
            }
            if affected {
                if let Some(tail) = tail {
                    for page in &tail.pages {
                        let present = actor
                            .pages
                            .values()
                            .any(|current| current.row_id() == page.row_id());
                        if present
                            || page.batches().all(|batch| {
                                represented.contains(&(
                                    batch.physical_life,
                                    batch.epoch.as_str(),
                                    batch.batch_order,
                                ))
                            })
                        {
                            pages.insert(page.position(), Arc::clone(page));
                        }
                    }
                }
                for page in actor.pages.values() {
                    let mut earlier = false;
                    let mut later = false;
                    for batch in page.batches() {
                        if batch.batch_order < self.identity_through {
                            earlier = true
                        } else {
                            later = true
                        }
                    }
                    // Every trusted pack closes whole immutable logical batches
                    // within one protected save cohort. Crossing that cohort
                    // would overwrite an older immutable PostgreSQL prefix.
                    if earlier && later {
                        return Err(invalid());
                    }
                    if protected_edit(page, tail) || later {
                        pages.insert(page.position(), Arc::clone(page));
                    }
                }
            } else {
                for page in actor.pages.values() {
                    pages.insert(page.position(), Arc::clone(page));
                }
            }
            // Source's global compact pass bounds durable bodies independently
            // of newer edited pages, which always remain protected.
            let mut durable = 0usize;
            let mut remove = Vec::new();
            remove
                .try_reserve_exact(pages.len())
                .map_err(|_| capacity())?;
            for (position, page) in pages.iter().rev() {
                if protected_edit(page, tail)
                    || page
                        .batches()
                        .any(|batch| batch.batch_order >= self.identity_through)
                {
                    continue;
                }
                let bytes = page.payload().len();
                if durable == 0
                    || durable.checked_add(bytes).ok_or_else(capacity)? <= self.resident_bytes
                {
                    durable = durable.checked_add(bytes).ok_or_else(capacity)?;
                } else {
                    remove.push(*position);
                }
            }
            for position in remove {
                pages.remove(&position);
            }
            let keep = actor
                .pending_pages
                .iter()
                .filter(|page| !affected || page.batch().batch_order >= self.identity_through)
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
                    .filter(|page| !affected || page.batch().batch_order >= self.identity_through)
                    .cloned(),
            );
            let upper_bound = if affected {
                actor.page_order_upper_bound.max(self.identity_through)
            } else {
                actor.page_order_upper_bound
            };
            let acknowledged_empty = actor
                .tail
                .empty_edit()
                .is_some_and(|marker| tail.is_some_and(|tail| tail.empty_tail == Some(marker)));
            let projected_tail = if acknowledged_empty {
                actor.tail.projected(&pages, &pending, true)?
            } else {
                actor.tail
            };
            let changed = !same_pages(&pages, &actor.pages)
                || pending.len() != actor.pending_pages.len()
                || upper_bound != actor.page_order_upper_bound
                || projected_tail != actor.tail;
            if !changed {
                continue;
            }
            page_storage.resize(fresh_page_map_bytes(pages.len())?)?;
            let before = actor
                .pages
                .values()
                .map(|p| p.batches().count())
                .sum::<usize>()
                .checked_add(actor.pending_pages.len())
                .ok_or_else(capacity)?;
            let after = pages
                .values()
                .map(|p| p.batches().count())
                .sum::<usize>()
                .checked_add(pending.len())
                .ok_or_else(capacity)?;
            actors.insert(
                id.clone(),
                ActorProjection {
                    pages,
                    pending,
                    pending_storage,
                    complete: actor.complete_pages && after >= before,
                    upper_bound,
                    tail: projected_tail,
                    page_storage,
                },
            );
        }
        let mut count = 0usize;
        let mut strings = 0usize;
        visit_references(state, &actors, &mut |id| {
            count = count.saturating_add(1);
            strings = strings.saturating_add(id.len());
        });
        let _references = budget.reserve(
            count
                .checked_mul(tree_node_bound::<String, ()>().ok_or_else(capacity)?)
                .and_then(|n| n.checked_add(strings))
                .ok_or_else(capacity)?,
        )?;
        let mut references = BTreeSet::new();
        visit_references(state, &actors, &mut |id| {
            references.insert(id.to_owned());
        });
        let values = match &state.reception.received_values {
            Some(values) => Some(values.prepare_residency(&references, budget)?),
            None if references.is_empty() => None,
            None => return Err(invalid()),
        };
        Ok(PreparedTemporalResidency {
            world: state.physical.header.id.clone(),
            generation: state.generation.clone(),
            cut: state.accepted_cut,
            identity: state.physical.identity.next_id(),
            actors,
            values,
            acknowledged_edits,
            _storage: storage,
        })
    }
}
fn visit_references<'a>(
    state: &'a SimulationState,
    updates: &'a IndexMap<String, ActorProjection>,
    visit: &mut impl FnMut(&'a str),
) {
    crate::reception::visit_resident_value_references(&state.reception, visit);
    for (id, actor) in &state.temporal.actors {
        if let Some(update) = updates.get(id) {
            for page in update.pages.values() {
                for reference in &page.metadata().references {
                    visit(reference)
                }
            }
            for page in &update.pending {
                for reference in &page.metadata().references {
                    visit(reference)
                }
            }
        } else {
            for page in actor.pages.values() {
                for reference in &page.metadata().references {
                    visit(reference)
                }
            }
            for page in &actor.pending_pages {
                for reference in &page.metadata().references {
                    visit(reference)
                }
            }
        }
    }
}
impl PreparedTemporalResidency {
    pub(crate) fn apply(self, state: &mut SimulationState) -> Result<(), (ExecutionError, Self)> {
        if self.world != state.physical.header.id
            || self.generation != state.generation
            || self.cut != state.accepted_cut
            || self.identity != state.physical.identity.next_id()
            || self
                .actors
                .keys()
                .any(|id| !state.temporal.actors.contains_key(id))
            || self.values.is_some() != state.reception.received_values.is_some()
        {
            return Err((invalid(), self));
        }
        // Admission above is read-only. Only the exact successful ACK may mark
        // these captured objects saved; an older prefix cannot mark a newer edit.
        for identity in &self.acknowledged_edits {
            identity.acknowledge();
        }
        for (id, projection) in self.actors {
            let actor = state
                .temporal
                .actors
                .get_mut(&id)
                .expect("prepared temporal actor exists");
            let page_storage = state.temporal.budget.adopt_backing(projection.page_storage)
                .expect("prepared page-index custody transfers without new workspace");
            actor.pages = projection.pages;
            actor.page_storage = page_storage;
            actor.pending_pages = projection.pending;
            actor.pending_storage = projection.pending_storage;
            actor.complete_pages = projection.complete;
            actor.page_order_upper_bound = projection.upper_bound;
            actor.tail = projection.tail;
            // Logical recent directories, charge totals, epochs/frontiers and
            // original SQL ordinal highwaters remain exactly the accepted cut.
        }
        if let (Some(values), Some(prepared)) = (&mut state.reception.received_values, self.values)
        {
            values.apply_residency(prepared);
        }
        Ok(())
    }
}
