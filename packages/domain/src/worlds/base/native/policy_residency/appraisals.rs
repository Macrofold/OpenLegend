//! Actual allocations owned by the immutable selected policy fields.
use super::*;
use crate::host::retained_size::heap_record;
heap_record!(EventAppraisalRules {
    id,
    version,
    event_type,
    damage_field,
    definition_id,
    fallback_max_health,
    appearance
});
heap_record!(AppearanceReaction {
    definition_id,
    coverage,
    expression_verb
});

crate::install::definition_layout!(EventAppraisalRules; arrays []; maps []);
