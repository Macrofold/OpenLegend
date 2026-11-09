//! Actual allocations owned by the immutable selected policy fields.
use super::*;
use crate::host::retained_size::heap_record;
heap_record!(EventDisclosure {
    id,
    version,
    fields,
    activity,
    physical_references,
    shared,
    contact_metrics,
    felt_events,
    contact_field,
    offer_field,
    gate_events,
    gate_checked_event,
    operation_field,
    close_operation,
    bar_fields,
    private_body_event,
    private_body_metrics,
    attribute_event,
    cause_field,
    partial_type,
    text
});
heap_record!(DisclosureText {
    unseen_impact,
    default_activity,
    target_activity,
    unknown_activity,
    cause_prefix
});

crate::install::definition_layout!(EventDisclosure; arrays [String]; maps [Vec<String>, String]);
