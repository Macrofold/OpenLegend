//! Actual allocations owned by the immutable selected policy fields.
use super::*;
use crate::host::retained_size::heap_record;
heap_record!(DetectionSupportPolicy {
    id,
    version,
    threshold,
    maximum,
    full_strength_seconds,
    decay_seconds,
    full_rate_per_game_second,
    decay_per_game_second,
    grace_seconds
});

crate::install::definition_layout!(DetectionSupportPolicy; arrays []; maps []);
