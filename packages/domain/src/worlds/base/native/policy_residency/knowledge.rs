//! Actual allocations owned by the immutable selected policy fields.
use super::*;
use crate::host::retained_size::heap_record;
heap_record!(PersonalNameRules {
    id,
    version,
    human_species,
    person_noun,
    unidentified,
    unidentified_voice,
    unidentified_individual,
    given_name_characters,
    nickname_characters
});

crate::install::definition_layout!(PersonalNameRules; arrays []; maps []);
