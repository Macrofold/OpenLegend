//! Typed installed attribute/status allocations. These walks count actual owned
//! fields; gameplay retained-byte quotas remain with their existing work owner.
use super::*;
use crate::host::retained_size::{HeapBytes, heap_record, heap_sum};

heap_record!(AttributePresentation { icon, color });
heap_record!(NativeHealth { units, precision });
impl HeapBytes for AttributeSchema {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Number { unit, .. } => unit.heap_bytes(),
            Self::Category { choices, initial } => {
                heap_sum([choices.heap_bytes()?, initial.heap_bytes()?])
            }
        }
    }
}
heap_record!(ConditionBand { text });
heap_record!(ConditionPolicy { bands, clear_text });
heap_record!(AttributeConcern { unit, text, mode });
heap_record!(Reservoir { action_label });
heap_record!(AttributeCriticalComparison {
    operator,
    unit,
    rounding
});
impl HeapBytes for AttributeCriticalPredicate {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Compare { compare } => compare.heap_bytes(),
            Self::Concern { .. } => Some(0),
        }
    }
}
heap_record!(CoachingEligibility { communication });
heap_record!(PracticePresentation {
    ranks,
    unavailable_rank,
    effect,
    progress,
    authored_starting,
    evidence_heading,
    evidence_item,
    evidence_fallback,
    lane_out_of_reach,
    lane_blocked,
    lane_unsafe,
    practice_description,
    practice_activity_label,
    coaching_activity_label,
    selected_tool,
    missing_tool,
    target_chance,
    request_label,
    request_description,
    accept_label,
    accept_description,
    decline_label,
    decline_description,
    feedback_description,
    withdraw_label,
    withdraw_description,
    unavailable,
    observation_required,
    request_result,
    request_event_suffix,
    accept_result,
    accept_event_suffix,
    end_result,
    observed_event,
    complete_result,
    cancel_result,
    ended_event
});
heap_record!(PracticeProfile {
    coaching_eligibility,
    presentation,
    family,
    practice_label,
    coaching_label,
    scope,
    guidance,
    improved_text
});
heap_record!(AttributeDefinition {
    native_health,
    practice,
    meaning,
    condition,
    id,
    implementation,
    name,
    disclosure,
    presentation,
    schema,
    concern,
    critical,
    editor_critical,
    reservoir
});
impl HeapBytes for StatusValue {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Text(value) => value.heap_bytes(),
            Self::Number(_) | Self::Boolean(_) => Some(0),
        }
    }
}
heap_record!(AttributeComparison { attribute, unit });
heap_record!(FieldComparison { name, value });
heap_record!(DailyWindow { target, clock });
heap_record!(HasAttribute { attribute });
heap_record!(StatusActive { definition_id });
impl HeapBytes for StatusCondition {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::All { all } => all.heap_bytes(),
            Self::Any { any } => any.heap_bytes(),
            Self::Compare { compare } => compare.heap_bytes(),
            Self::Field { field } => field.heap_bytes(),
            Self::Daily { daily_window } => daily_window.heap_bytes(),
            Self::Has { has_attribute } => has_attribute.heap_bytes(),
            Self::Active { status_active } => status_active.heap_bytes(),
        }
    }
}
heap_record!(ChangeRate { attribute, per });
heap_record!(ChangeEvery { attribute, unit });
heap_record!(RestrictCapabilities {
    target,
    capabilities
});
impl HeapBytes for StatusOperation {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Rate { change_rate, when } => {
                heap_sum([change_rate.heap_bytes()?, when.heap_bytes()?])
            }
            Self::Every { change_every, when } => {
                heap_sum([change_every.heap_bytes()?, when.heap_bytes()?])
            }
            Self::Restrict {
                restrict_capabilities,
            } => restrict_capabilities.heap_bytes(),
        }
    }
}
heap_record!(StatusParticle {
    text,
    anchor,
    motion
});
heap_record!(StatusPresentation { pose, particle });
heap_record!(StatusEmit { kind, narration });
heap_record!(StatusLifecycleEvent { emit });
heap_record!(StatusActions {
    activate,
    deactivate,
    activate_icon,
    deactivate_icon
});
heap_record!(StatusDefinition {
    id,
    kind,
    label,
    meaning,
    lifecycle_cause,
    requires,
    activation_condition,
    automatic_activation,
    automatic_deactivation,
    interrupt_on,
    while_active,
    presentation,
    on_activate,
    on_deactivate,
    actions,
    contribution
});
heap_record!(StatusEffectPolicy {
    named_times,
    definitions
});
heap_record!(CompiledStatusWork { pin });
