//! Actual allocations owned by the immutable selected policy fields.
use super::*;
use crate::host::retained_size::heap_record;
heap_record!(AccountRules {
    id,
    version,
    required_events,
    ignored_events,
    optional_events,
    routine_command_type,
    routine_running_events,
    routine_commitment_events,
    routine_arrival_event,
    completed_code,
    cancelled_code,
    result_events,
    agreement_events,
    priority,
    fallback_priority,
    focus_attribute,
    privacy_outcomes
});
heap_record!(PrivacyOutcomes {
    commitment,
    forgotten
});
heap_record!(AccountPriority {
    deliberate,
    consequence,
    learning,
    interpretation
});

crate::install::definition_layout!(AccountRules; arrays [String]; maps [String]);
