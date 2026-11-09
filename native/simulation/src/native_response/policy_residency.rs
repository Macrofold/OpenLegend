//! Actual allocations owned by the immutable selected policy fields.
use super::*;
use crate::host::retained_size::{HeapBytes, heap_record};
impl HeapBytes for NavigationWait {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::World => Some(0),
            Self::Entity => Some(0),
        }
    }
}
heap_record!(NativeResponseProfile {
    id,
    version,
    implementation,
    dangers,
    retention_seconds,
    uncertainty_per_second,
    maximum_uncertainty,
    avoidance_distance,
    clearance_margin,
    settling_seconds,
    review_seconds,
    blocked_review_seconds,
    passage_distance,
    sound_alarm_minimum_band,
    acoustic_change_band_db,
    acoustic_pattern_idle_seconds,
    candidates,
    locomotion,
    movement_factors,
    wander,
    wake,
    presentation
});
impl HeapBytes for ResponseImplementation {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::LocalRefuge => Some(0),
        }
    }
}
heap_record!(DangerPolicy {
    species,
    body_plans,
    current_natural_attack,
    attack_preparation
});
heap_record!(RefugePolicy {
    distance,
    angles,
    preferred_progress,
    minimum_progress,
    minimum_attempts,
    maximum_detour_factor,
    navigation_wait,
    maximum_route_length,
    minimum_advance,
    worsening_slack,
    arrival_margin_cap,
    continuity_improvement,
    tie_margin,
    distance_weight_scale
});
heap_record!(CandidateDistance { minimum, maximum });
heap_record!(LocomotionRates {
    travel,
    escape,
    flight_escape
});
heap_record!(MovementFactors { scars });
heap_record!(WanderPolicy {
    distance,
    minimum_wait_seconds,
    wait_choices
});
heap_record!(WakePolicy {
    attribute_id,
    above,
    reason
});
impl HeapBytes for WakeReason {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::PerceivedDanger => Some(0),
        }
    }
}
heap_record!(ResponsePresentation { projectile_passage });

crate::install::definition_layout!(NativeResponseProfile; arrays [String, f64]; maps [LocomotionRates]);
