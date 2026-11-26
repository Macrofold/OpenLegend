//! Actual allocations owned by the immutable selected policy fields.
use super::*;
use crate::host::retained_size::heap_record;
heap_record!(PromiseDefinition {
    id,
    normalized_id,
    normalized_name
});
heap_record!(PromiseRules {
    id,
    version,
    limit,
    speech_event,
    completion_event,
    admission_prefix,
    gather_prefix,
    ignored_terminal_punctuation,
    item_id_separator,
    item_id_separator_replacement,
    importance,
    summary_prefix,
    definitions
});

crate::install::definition_layout!(PromiseRules; arrays [PromiseDefinition]; maps []);
