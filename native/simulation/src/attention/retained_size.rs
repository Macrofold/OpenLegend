//! Current selection is one bounded mutable subrecord. Undo counts its actual
//! owned vectors/strings; this is separate from serialized gameplay byte quotas.
use super::*;
use crate::host::retained_size::{HeapBytes, heap_record};
macro_rules! fixed{($($ty:ty),*)=>{$(impl HeapBytes for $ty{fn heap_bytes(&self)->Option<usize>{Some(0)}})*};}
fixed!(AttentionBasis, AttentionRelationFamily);
heap_record!(AttentionPoint { point });
heap_record!(AttentionAnnotation {
    source_id,
    lease_id,
    exposure,
    presented_description,
    presented_change,
    anchor,
    urgency_source,
    direct_source
});
heap_record!(AttentionEntry {
    key,
    source_id,
    lease_id,
    exposure,
    subject,
    description_revision,
    change_revision
});
heap_record!(AttentionRelationWitness { id, proof });
heap_record!(AttentionRelationEvaluation {
    anchor_key,
    family,
    revision,
    witnesses
});
heap_record!(AttentionRelationLatch {
    anchor_key,
    family,
    entry_proof,
    newest_proof,
    revision,
    witness_id
});
heap_record!(AttentionRelationScan { revision });
heap_record!(AttentionState {
    policy,
    annotations,
    entries,
    explicit,
    latches,
    relation_dirty,
    relation_scans
});
