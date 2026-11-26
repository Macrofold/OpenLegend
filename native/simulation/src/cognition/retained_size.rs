//! Actual private interpretation allocations used by sparse edit admission.

use super::*;
use crate::host::retained_size::{HeapBytes, heap_record, heap_sum, map_storage};

heap_record!(EvidenceLink { id });
heap_record!(MindDocument {
    id,
    title,
    text,
    evidence
});
heap_record!(InnerRecord {
    id,
    document_id,
    subject_id,
    evidence
});
heap_record!(PrivateThought { decision_id, text });
heap_record!(ActorMind {
    documents,
    records,
    thoughts,
    last_dream_episode
});
heap_record!(InnerWorld {
    source_snapshot,
    publication_job_id,
    publication_body,
    evidence_ids
});

pub(super) fn mind_contents_bytes(mind: &ActorMind) -> Option<usize> {
    heap_sum([
        mind.documents.heap_bytes()?,
        mind.records.heap_bytes()?,
        mind.thoughts.heap_bytes()?,
    ])
}
pub(super) fn inner_contents_bytes(inner: &InnerWorld) -> Option<usize> {
    heap_sum([
        inner.evidence_ids.heap_bytes()?,
        inner.publication_body.heap_bytes()?,
    ])
}
pub(super) fn mind_parent_bytes(
    minds: &IndexMap<String, ActorMind>,
    inner: &IndexMap<String, InnerWorld>,
) -> Option<usize> {
    let minds = minds.iter().try_fold(
        map_storage::<String, ActorMind>(minds.capacity())?,
        |sum, (key, _mind)| heap_sum([sum, key.capacity()]),
    )?;
    inner.iter().try_fold(
        minds.checked_add(map_storage::<String, InnerWorld>(inner.capacity())?)?,
        |sum, (key, _value)| heap_sum([sum, key.capacity()]),
    )
}
