//! Actual allocations owned by the immutable selected policy fields.
use super::*;
use crate::host::retained_size::heap_record;
heap_record!(OccurrenceRules {
    id,
    version,
    important_events,
    important_value,
    speech_event,
    sound_event,
    encounter_event,
    contact_event,
    fire_out,
    flight,
    ranged,
    speech_importance,
    sound_importance,
    received_urgency,
    unintelligible_speech_importance,
    semantic_events,
    semantic_importance,
    ordinary_importance,
    urgent_events,
    urgent_value,
    speech_urgency,
    ordinary_urgency,
    activity_events,
    native_target_events,
    projectile_contact_event,
    projectile_passage_event,
    importance_policy,
    significant_reason,
    response
});
heap_record!(FireOutRule {
    event_type,
    message
});
heap_record!(FlightRules {
    takeoff_event,
    landing_event,
    takeoff_suffix,
    landing_before_surface,
    fall_suffix
});
heap_record!(RangedOccurrenceRules {
    shot_released,
    released,
    projectile_ended,
    shot_ended,
    aim_ready,
    prepared,
    menu,
    contact_hit,
    contact_stopped,
    contact_source,
    terminated,
    observed_hit,
    observed_no_injury,
    observed_cover,
    observed_range_end,
    stopped
});
heap_record!(super::RangedMenuWords {
    title,
    aim_label,
    aim_description,
    shoot_label,
    shoot_description,
    hunt_label,
    hunt_species
});
heap_record!(ResponseRules {
    offers,
    thought,
    interpretation,
    expression
});
heap_record!(InterpretationRule { importance });
heap_record!(ThoughtRule {
    source,
    summary_prefix,
    importance
});
heap_record!(ExpressionRules {
    guidance,
    unsupported_guidance,
    event_type,
    body_plans,
    unsupported_body,
    unavailable,
    accepted,
    verbs
});
heap_record!(ExpressionRule {
    verb,
    head_suffix,
    target_prefix,
    requires_reach
});

crate::install::definition_layout!(OccurrenceRules; arrays [String, super::super::base_decision_offers::ProbeOffer]; maps [ExpressionRule]);
