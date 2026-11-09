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
        // This owner retains tombstones rather than deleting map entries; one
        // dense-map allocation bound per record also covers key/index backing.
        map_storage::<String, Arc<AppraisalRecord>>(1).ok_or_else(capacity)?,
        value.id.capacity(),
    ])
    .ok_or_else(capacity)
}
