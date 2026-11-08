//! Actual private interpretation allocations used by sparse edit admission.

use super::*;
use crate::host::retained_size::{HeapBytes, heap_record};

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
