//! Actual allocations owned by the immutable selected policy fields.
use super::*;
use crate::host::retained_size::heap_record;
heap_record!(RecognitionPolicy {
    id,
    version,
    credit_seconds,
    seed_seconds,
    warning_seconds,
    warning,
    retained_credits,
    matching_exemplars,
    familiarity_roots,
    familiarity_mature_seconds,
    voice_feature_family
});
heap_record!(WarningRules {
    prefixes,
    join,
    suffix,
    delimiters
});

crate::install::definition_layout!(RecognitionPolicy; arrays [String]; maps []);
