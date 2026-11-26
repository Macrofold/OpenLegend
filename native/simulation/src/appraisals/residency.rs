//! A canonical appraisal owns both its rich current-format body and the keys
//! needed to restore its active indexes while rollback or a read holds it.
use super::*;
use crate::host::retained_size::{heap_record, tree_node_bound};
use std::mem::align_of;

heap_record!(PerceivedCause {
    kind,
    actor_id,
    source_id,
    source_kind,
    occurrence_id,
    source_version,
    coverage,
    subject_ids,
    recall_episode_id,
});
heap_record!(super::response::AppraisalPublication {
    response_id,
    pipeline,
    cause_ids
});
heap_record!(super::response::AppraisalBindings {
    sources,
    subjects,
    complete_creates,
    prior_outcomes,
    publication
});
heap_record!(AppraisalOperation { id, body });
heap_record!(Appraisal {
    id,
    actor_id,
    definition_pin,
    target_id,
    stack_key,
    state,
    cause,
    interpretation_source,
    last_operation,
    creation_operation,
    predecessor_id,
});
heap_record!(Definition {
    id,
    implementation,
    label,
    causes,
    stacking,
    lifetime
});
impl HeapBytes for LifetimeLaw {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Decays { bands, .. } => bands.heap_bytes(),
            _ => Some(0),
        }
    }
}

pub(super) struct RootAllocation {
    fixed: usize,
    keys: usize,
    storage: crate::host::ResidentReservation,
}
pub(super) struct OwnerAllocation {
    fixed: usize,
    storage: crate::host::ResidentReservation,
}
pub(super) fn fund_owner(
    owner: &mut AppraisalOwner,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    if owner.allocation.is_some() {
        return Err(ExecutionError::Invariant);
    }
    let fixed = heap_sum([
        owner.row.heap_bytes().ok_or(ExecutionError::Capacity)?,
        owner.coverage.table.capacity(),
        owner.coverage.owner.capacity(),
    ])
    .ok_or(ExecutionError::Capacity)?;
    let bytes = fixed
        .checked_add(
            map_storage::<String, Arc<AppraisalRecord>>(owner.records.capacity())
                .ok_or(ExecutionError::Capacity)?,
        )
        .ok_or(ExecutionError::Capacity)?;
    owner.header_storage = Some(budget.reserve_record(fixed)?);
    owner.allocation = Some(OwnerAllocation {
        fixed: 0,
        storage: budget.reserve_backing(bytes - fixed)?,
    });
    Ok(())
}
pub(super) fn prepare_owner_map_transfer(
    capacity: usize,
    workspace: &mut ByteReservation,
    budget: &ByteBudget,
) -> Result<OwnerAllocation, ExecutionError> {
    let bytes =
        map_storage::<String, Arc<AppraisalRecord>>(capacity).ok_or(ExecutionError::Capacity)?;
    Ok(OwnerAllocation {
        fixed: 0,
        storage: budget.adopt_backing(workspace.split_off(bytes)?)?,
    })
}
pub(super) fn fund_initial(
    state: &mut AppraisalState,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    if state.allocation.is_some() {
        return Err(ExecutionError::Invariant);
    }
    let mut fixed = heap_sum([
        map_storage::<String, Arc<InstalledAppraisalDefinition>>(state.definitions.capacity())
            .ok_or(ExecutionError::Capacity)?,
        state.owner_coverage.table.capacity(),
        state.owner_coverage.owner.capacity(),
    ])
    .ok_or(ExecutionError::Capacity)?;
    for (key, definition) in &mut state.definitions {
        let definition = Arc::get_mut(definition).ok_or(ExecutionError::Invariant)?;
        let bytes = heap_sum([
            size_of::<InstalledAppraisalDefinition>() + 2 * size_of::<usize>(),
            definition
                .value
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?,
            definition
                .pin
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?,
        ])
        .ok_or(ExecutionError::Capacity)?;
        definition._storage = Some(budget.reserve_record(bytes)?);
        fixed = fixed
            .checked_add(key.capacity())
            .ok_or(ExecutionError::Capacity)?;
    }
    let mut keys = 0_usize;
    for (key, owner) in &mut state.owners {
        keys = keys
            .checked_add(key.capacity())
            .ok_or(ExecutionError::Capacity)?;
        fund_owner(owner, budget)?;
    }
    let bytes = heap_sum([
        fixed,
        keys,
        map_storage::<String, AppraisalOwner>(state.owners.capacity())
            .ok_or(ExecutionError::Capacity)?,
    ])
    .ok_or(ExecutionError::Capacity)?;
    state.allocation = Some(RootAllocation {
        fixed,
        keys,
        storage: budget.reserve_backing(bytes)?,
    });
    state.undo_storage = Some(budget.reserve(0)?);
    Ok(())
}
impl AppraisalRecord {
    pub(super) fn retain_for_candidate(&self, budget: &ByteBudget) -> Result<(), ExecutionError> {
        budget.retain_record(
            self._reservation
                .as_ref()
                .ok_or(ExecutionError::Invariant)?,
        )?;
        Ok(())
    }
}
impl AppraisalState {
    pub(super) fn reserve_undo_slots(
        &mut self,
        count: usize,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let needed = self
            .undo
            .len()
            .checked_add(count)
            .ok_or(ExecutionError::Capacity)?;
        if needed <= self.undo.capacity() {
            return Ok(());
        }
        let target = self
            .undo
            .capacity()
            .checked_mul(2)
            .ok_or(ExecutionError::Capacity)?
            .max(needed)
            .max(4);
        let storage = self
            .undo_storage
            .as_mut()
            .ok_or(ExecutionError::Invariant)?;
        if !budget.owns(storage) {
            return Err(ExecutionError::Invariant);
        }
        storage.resize(
            target
                .checked_mul(size_of::<AppraisalUndo>())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        self.undo
            .try_reserve_exact(target - self.undo.len())
            .map_err(|_| ExecutionError::Capacity)
    }
    pub(super) fn reserve_owner_member(
        &mut self,
        actor: &str,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let allocation = self.allocation.as_mut().ok_or(ExecutionError::Invariant)?;
        let keys = allocation
            .keys
            .checked_add(actor.len())
            .ok_or(ExecutionError::Capacity)?;
        if self.owners.len() == self.owners.capacity() {
            let target = self
                .owners
                .capacity()
                .checked_add(1)
                .and_then(|n| n.checked_mul(2))
                .ok_or(ExecutionError::Capacity)?;
            let bytes = heap_sum([
                allocation.fixed,
                keys,
                map_storage::<String, AppraisalOwner>(target).ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?;
            budget.resize_backing(&mut allocation.storage, bytes)?;
            // Exact dense capacity keeps the pinned IndexMap rounding within
            // map_storage(target), already funding its separate hash buckets.
            self.owners
                .try_reserve_exact(target - self.owners.len())
                .map_err(|_| ExecutionError::Capacity)?;
            let actual = heap_sum([
                allocation.fixed,
                keys,
                map_storage::<String, AppraisalOwner>(self.owners.capacity())
                    .ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?;
            if actual > allocation.storage.bytes() {
                return Err(ExecutionError::Invariant);
            }
            allocation.storage.resize(actual)?;
        } else {
            budget.fund_backing(&mut allocation.storage, budget.reserve(actor.len())?)?;
        }
        allocation.keys = keys;
        Ok(())
    }
    pub(super) fn remove_owner_allocation(
        &mut self,
        actor_bytes: usize,
    ) -> Result<(), ExecutionError> {
        let allocation = self.allocation.as_mut().ok_or(ExecutionError::Invariant)?;
        allocation.keys = allocation
            .keys
            .checked_sub(actor_bytes)
            .ok_or(ExecutionError::Invariant)?;
        allocation.storage.resize(
            heap_sum([
                allocation.fixed,
                allocation.keys,
                map_storage::<String, AppraisalOwner>(self.owners.capacity())
                    .ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(())
    }
}
impl AppraisalOwner {
    pub(super) fn reserve_record_member(
        &mut self,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        if self.records.len() < self.records.capacity() {
            return Ok(());
        }
        let target = self
            .records
            .capacity()
            .checked_add(1)
            .and_then(|n| n.checked_mul(2))
            .ok_or(ExecutionError::Capacity)?;
        let allocation = self.allocation.as_mut().ok_or(ExecutionError::Invariant)?;
        budget.resize_backing(
            &mut allocation.storage,
            allocation
                .fixed
                .checked_add(
                    map_storage::<String, Arc<AppraisalRecord>>(target)
                        .ok_or(ExecutionError::Capacity)?,
                )
                .ok_or(ExecutionError::Capacity)?,
        )?;
        // IndexMap::try_reserve otherwise rounds the dense Vec up to its hash
        // capacity after allocation; that larger buffer must not appear unfunded.
        self.records
            .try_reserve_exact(target - self.records.len())
            .map_err(|_| ExecutionError::Capacity)?;
        let actual = allocation
            .fixed
            .checked_add(
                map_storage::<String, Arc<AppraisalRecord>>(self.records.capacity())
                    .ok_or(ExecutionError::Capacity)?,
            )
            .ok_or(ExecutionError::Capacity)?;
        if actual > allocation.storage.bytes() {
            return Err(ExecutionError::Invariant);
        }
        allocation.storage.resize(actual)?;
        Ok(())
    }
}

pub(super) fn record_bytes(value: &Appraisal, row: &InstalledRow) -> Result<usize, ExecutionError> {
    let capacity = || ExecutionError::Capacity;
    // One full pinned B-tree node per live entry bounds sparse deadline keys.
    // This is conservative capacity escrow, not a measured allocator total.
    let deadline = if value.state == "active" && value.next_at.is_some() {
        heap_sum([
            tree_node_bound::<(u64, String), (String, String)>().ok_or_else(capacity)?,
            value.id.capacity().checked_mul(2).ok_or_else(capacity)?,
            value.actor_id.capacity(),
        ])
        .ok_or_else(capacity)?
    } else {
        0
    };
    heap_sum([
        size_of::<AppraisalRecord>(),
        2 * size_of::<usize>() + align_of::<AppraisalRecord>() - 1,
        value.heap_bytes().ok_or_else(capacity)?,
        row.id.capacity(),
        row.parent.capacity(),
        row.slot.capacity(),
        row.payload.capacity(),
        row.extra.heap_bytes().ok_or_else(capacity)?,
        AppraisalIndex::entry_bound(value)?,
        deadline,
        // The actual member string stays with this record's custody, including
        // an old record moved to undo. Dense backing stays with its owner map.
        value.id.capacity(),
    ])
    .ok_or_else(capacity)
}
