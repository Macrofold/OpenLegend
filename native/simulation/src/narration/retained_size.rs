//! Owned grammar allocations, distinct from encoded text quotas.
use super::*;
use crate::host::retained_size::{HeapBytes, heap_record, heap_sum};

impl HeapBytes for NarrationPart {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Literal(text) => text.heap_bytes(),
            Self::Participant { entity_id, .. } => entity_id.heap_bytes(),
            Self::Verb { subject_id, verb } => {
                heap_sum([subject_id.heap_bytes()?, verb.heap_bytes()?])
            }
        }
    }
}
heap_record!(Narration { parts });
heap_record!(CapturedNarration {
    narration,
    names,
    self_id
});
impl HeapBytes for NativeText {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Literal(text) => text.heap_bytes(),
            Self::Captured(captured) => captured.heap_bytes(),
        }
    }
}
