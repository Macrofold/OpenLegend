//! Actual allocations owned by the immutable selected policy fields.
use super::*;
use crate::host::retained_size::heap_record;
heap_record!(SpeechOutcome { code, message });
heap_record!(SpeechAction {
    id,
    version,
    maximum_characters,
    event_type,
    no_speech,
    invalid_speech,
    invalid_volume,
    invalid_role,
    missing_recipient,
    non_person_recipient,
    success
});

crate::install::definition_layout!(SpeechAction; arrays []; maps []);
