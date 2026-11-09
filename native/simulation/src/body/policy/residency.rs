//! Actual allocations owned by the immutable selected policy fields.
use super::*;
use crate::body::reincarnation::*;
use crate::host::retained_size::{HeapBytes, heap_record};
heap_record!(BodyPolicy {
    id,
    version,
    reincarnation,
    lethal_attack_review,
    evasion,
    combat,
    zero_health,
    recovery,
    revival,
    remains,
    consumption,
    carrying_concern,
    background_thinking
});
heap_record!(LethalReviewPolicy {
    title,
    description,
    ranged_description,
    confirm_label,
    prepare_label,
    cancel_label
});
heap_record!(EvasionPolicy {
    body_plans,
    maximum_distance,
    seconds,
    repeat_seconds,
    label,
    description
});
heap_record!(CombatPolicy {
    targets,
    human_issued_targets,
    projectile_contact,
    encounters,
    impact_attention,
    unavailable_text
});
heap_record!(ControllerTargets {
    player,
    npc,
    native
});
impl HeapBytes for ProjectileContact {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::InjureVulnerableBody => Some(0),
            Self::StopOnly => Some(0),
        }
    }
}
heap_record!(EncounterPolicy {
    recent_seconds,
    visible_preparation,
    preparing_strike,
    aiming,
    ended,
    closing,
    withdrawing,
    controls
});
heap_record!(EncounterControls { speak, stop });
heap_record!(EncounterControl {
    label,
    description,
    success
});
heap_record!(ImpactAttention {
    importance,
    urgency
});
heap_record!(ZeroHealthPolicy {
    player,
    npc,
    native,
    incapacitate_narration,
    death_narration
});
impl HeapBytes for ZeroHealthOutcome {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Incapacitate => Some(0),
            Self::Die => Some(0),
        }
    }
}
heap_record!(RecoveryPolicy {
    controllers,
    when,
    anchor,
    floors,
    label,
    narration,
    success_text,
    refusal_text
});
impl HeapBytes for RecoveryAnchor {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::SafeReturnAnchor => Some(0),
        }
    }
}
heap_record!(RecoveryFloor {
    attribute_id,
    value
});
heap_record!(RevivalPolicy { fill_to_maximum });
heap_record!(RemainsPolicy {
    rot_after_seconds,
    remove_after_seconds,
    fresh_label,
    rotting_label,
    rot_narration,
    removal_narration
});
heap_record!(MealPolicy {
    condition_id,
    maximum_units,
    one_label,
    meal_label,
    count_label,
    start_label,
    help
});
heap_record!(ConsumptionPolicy {
    meal,
    attribute_id,
    quantity_property,
    refusals,
    label,
    narration,
    success_text,
    unavailable_text,
    suggest_when
});
heap_record!(ConsumptionRefusal { item_type, reason });
heap_record!(CarryingConcern {
    attribute_id,
    item_property,
    text
});
heap_record!(BackgroundThinking {
    maintenance_blocked_when,
    commit_blocked_when,
    reflection_blocked_when,
    reconsideration_inputs
});
heap_record!(ReconsiderationInput {
    key,
    when,
    director
});
heap_record!(DeathScar {
    id,
    name,
    description,
    movement_factor,
    outgoing_injury_factor,
    incoming_injury_factor
});
heap_record!(ReincarnationPolicy {
    implementation,
    qualifying_controller,
    corpse_kind,
    rest_kind,
    radius,
    retained_type_fraction,
    spawn_offset,
    placement,
    fill_attributes,
    scars,
    treatment,
    arrival_text,
    arrival_narration,
    continue_label,
    death_text,
    retained_label,
    lost_label,
    treatment_label,
    treatment_text
});
heap_record!(ReplacementPlacement {
    samples,
    neighbor_margin,
    occupant_clearance,
    threat_reach_margin
});
heap_record!(ScarTreatment {
    material_id,
    quantity,
    work_seconds,
    reach
});

crate::install::definition_layout!(BodyPolicy; arrays [String, RecoveryFloor, DeathScar, StatusCondition, ConsumptionRefusal, ReconsiderationInput]; maps []);
