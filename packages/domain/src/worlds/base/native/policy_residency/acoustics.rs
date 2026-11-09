//! Actual allocations owned by the immutable selected policy fields.
use super::*;
use crate::host::retained_size::{HeapBytes, heap_record};
impl HeapBytes for AcousticReference {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::AirSpl20MicroPa => Some(0),
        }
    }
}
heap_record!(SourceLevels {
    whisper,
    normal,
    shout
});
heap_record!(AcousticThresholds {
    detect,
    partial,
    clear
});
heap_record!(AcousticPolicy {
    id,
    version,
    reference,
    source_level_db_spl_at1m,
    background_level_db_spl,
    thresholds_db,
    sensory_lifetime_seconds
});

crate::install::definition_layout!(AcousticPolicy; arrays []; maps []);
