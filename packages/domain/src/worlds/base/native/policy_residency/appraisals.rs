//! Actual allocations owned by the immutable selected policy fields.
use super::*;
use crate::host::retained_size::heap_record;
heap_record!(EventAppraisalRules {
    id,
    version,
    event_type,
    damage_field,
    definition_id,
    fallback_max_health
});

crate::install::definition_layout!(EventAppraisalRules; arrays []; maps []);
