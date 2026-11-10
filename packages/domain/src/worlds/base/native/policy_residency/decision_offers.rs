//! Actual allocations owned by the immutable selected policy fields.
use super::*;
use crate::host::retained_size::heap_record;
heap_record!(DecisionOfferRules {
    inspection_command,
    follow_command,
    strike_command,
    interaction_radius,
    follow,
    follow_suggestions,
    manual_work_body_plans,
    natural_strike_body_plans,
    hunting_purpose,
    hunting,
    slot_requirements,
    typed_nouns,
    activity_choices,
    availability,
    probes
});
heap_record!(TypedNouns {
    heat_sources,
    beings
});
heap_record!(SlotRequirements {
    tool_fields,
    unit_per_command
});
heap_record!(ActivityChoiceHost {
    pin,
    own_supply_request,
    travel_request,
    combat_request,
    hands,
    visible_warning,
    own_label
});
heap_record!(ActivityHandsChoice { request_id, label });
heap_record!(DiscoveryMessages {
    invalid_follow,
    unknown_strike,
    unsupported_strike,
    manual_work,
    combat_recovery,
    strike_range,
    unperceived,
    attack_source,
    attack_target,
    attack_permission,
    follow_unavailable_code,
    follow_unperceived,
    follow_restricted,
    follow_unsupported,
    follow_dead,
    follow_changed,
    follow_budget,
    follow_no_route
});
heap_record!(FollowOfferRules {
    default_distance,
    minimum_distance,
    maximum_distance,
    resume_margin,
    repath_seconds,
    target_displacement,
    heading_evidence,
    slot_tolerance
});
heap_record!(ProbeOffer { direction, dx, dz });
heap_record!(HuntingOfferRules {
    label,
    purpose,
    scope,
    known_prey,
    methods,
    unarmed_tool
});
heap_record!(HuntingMethods {
    melee,
    ranged_weapon,
    unarmed
});
