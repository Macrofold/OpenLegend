//! Actual allocations owned by the immutable selected policy fields.
use super::*;
use crate::host::retained_size::heap_record;
heap_record!(ConditionNoticeRules {
    event_type,
    recovery_importance,
    importance,
    critical_urgency,
    urgency
});
heap_record!(BodyNoticeRules {
    unavailable_code,
    unavailable_text,
    incapacitated_event,
    death_event,
    player_death_event,
    rotting_event,
    removed_event,
    health_event,
    damaged_verb,
    recovered_verb,
    damage_name
});
heap_record!(OutwardActivityRules {
    actions,
    preparing_phase
});
heap_record!(SightingNotice {
    importance,
    urgency,
    semantic_trigger
});
heap_record!(SightingRules {
    event_type,
    wording,
    routine,
    changed_being,
    episode_grace_seconds
});
heap_record!(SightingWording {
    departed,
    detail,
    routine,
    detail_prefix,
    ending
});
heap_record!(OutwardMarkers {
    incapacitated,
    alive,
    dead,
    burning,
    unlit,
    material_present,
    depleted,
    harvested,
    unharvested
});
heap_record!(ObservationRules {
    id,
    version,
    pile_kind,
    outward_activity,
    sighting,
    outward,
    conditions,
    body
});

crate::install::definition_layout!(ObservationRules; arrays [String]; maps []);
