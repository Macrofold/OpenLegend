//! Actual allocations owned by the immutable selected policy fields.
use super::*;
use crate::host::retained_size::heap_record;
heap_record!(SpeechOutcome { code, message });
heap_record!(PublicAppeal {
    id,
    label,
    invitation,
    between,
    contribution,
    closing,
    item_definition
});
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
    invalid_public_appeal,
    public_appeals,
    overheard_reference_experiment,
    success
});

crate::install::definition_layout!(SpeechAction; arrays [PublicAppeal]; maps []);
