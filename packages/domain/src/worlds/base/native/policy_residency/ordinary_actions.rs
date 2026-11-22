//! Actual allocations owned by the immutable selected policy fields.
use super::plan_rules::*;
use super::*;
use crate::host::retained_size::heap_record;
use crate::records::SqlCell;
use crate::worlds::base_outings::{
    TravelActivityRules, TravelCompanyLabels, TravelMessages, TravelOperation,
    TravelParticipantCapability, TravelRules, TravelTemplates,
};
heap_record!(ActionMessage { code, message });
heap_record!(ParticipationRules {
    changed_refresh,
    invalid_attempt,
    stale_attempt,
    changed,
    already_pending,
    already_participating,
    unsafe_return,
    active,
    exiting,
    inactive,
    departed_event,
    departed_clause,
    returned_event,
    returned_clause
});
heap_record!(AudienceMilestone { id, event_type });
heap_record!(OrdinaryActionRules {
    id,
    version,
    plan,
    travel,
    participation,
    audience_milestone,
    natural_contact,
    invalid_command,
    unknown_actor,
    inactive,
    actions_restricted,
    speech_restricted,
    movement_restricted,
    paused,
    not_alive,
    unsupported_airborne,
    unsupported_controller,
    experience_capacity,
    idempotency_conflict,
    unsupported_navigation,
    blocked,
    unreachable,
    no_route,
    budget_exceeded,
    stale_action,
    cannot_interrupt,
    cannot_cancel,
    stale_native_movement,
    accepted,
    cancelled_by_choice,
    cancelled_replaced,
    stopped,
    invalid_effect,
    invalid_facing,
    invalid_resting_place,
    out_of_reach,
    not_active,
    not_applicable,
    movement_departure,
    action_started_event,
    status_outcome_code,
    activated,
    deactivated,
    approach_name,
    approach_facts,
    before_attempt_facts,
    status_interruption_suffix,
    movement_arrival,
    movement_completed,
    movement_missing_destination,
    movement_destination_not_reached,
    movement_changing_route,
    movement_blocked_route,
    action_stopped_prefix,
    action_stopped_event,
    movement_arrival_event
});
heap_record!(NaturalContactText {
    missed,
    connected,
    out_of_range,
    unavailable,
    interrupted,
    body_changed
});
heap_record!(PlanRules {
    requested_movement_family,
    invalid_identity,
    stale_plan,
    invalid_goal,
    step_limit,
    unsupported_capability,
    invalid_command,
    chosen_activity_active,
    invalid_outputs,
    plan_blocked,
    frontier_full,
    queued,
    actor_unavailable,
    not_chosen_plan,
    already_paused,
    pause_too_often,
    pause_state,
    pause_attack,
    pause_materials,
    paused_step,
    paused_restart,
    inactive_goal_reason,
    changed_target_reason,
    missing_object_reason,
    stale_paused,
    resume_refused_prefix,
    returned_from_intervention,
    paused_work_name,
    resume_blocked,
    resumed,
    stopped_summary,
    discarded_paused,
    cancelled_step,
    interrupted_step,
    stale_encounter,
    missing_output,
    fallback_result_summary,
    completed_result,
    refused_result,
    result_importance,
    control_importance
});

impl crate::host::retained_size::HeapBytes for TravelOperation {
    fn heap_bytes(&self) -> Option<usize> {
        Some(0)
    }
}
impl crate::host::retained_size::HeapBytes for TravelParticipantCapability {
    fn heap_bytes(&self) -> Option<usize> {
        Some(0)
    }
}
heap_record!(TravelCompanyLabels { visible, hidden });
heap_record!(TravelActivityRules {
    root,
    destination_role,
    proposer_suffix,
    recipient_suffix,
    preview_id
});
heap_record!(TravelTemplates {
    purpose,
    accept_idle,
    accept_replace,
    decline,
    withdraw,
    context,
    travel_name,
    point_name,
    invited_proposer,
    invited_proposer_purpose,
    invited_recipient,
    invited_recipient_purpose,
    accepted,
    arrived,
    ended
});
heap_record!(TravelMessages {
    person,
    nearby,
    terms,
    limit,
    pending,
    destination,
    busy,
    changed,
    route,
    unavailable,
    invited,
    accepted,
    declined,
    left,
    expired,
    interrupted,
    finished,
    company,
    separated,
    unobserved_work_end,
    remembered_ending_event,
    remembered_ended,
    accepted_physical_slot
});
heap_record!(TravelRules {
    family,
    kind,
    event_type,
    agreement_family,
    participant_capability,
    operations,
    max_purpose_characters,
    activity,
    label,
    leave_label,
    companion_prefix,
    agreement_description,
    description,
    company_labels,
    templates,
    messages
});

crate::install::definition_layout!(OrdinaryActionRules; arrays [String, SqlCell]; maps [String, SqlCell]);
