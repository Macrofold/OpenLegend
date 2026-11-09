//! These authored rows and their few read-only projections are retained once.
//! Counting their actual owned fields never parses arbitrary policy prose or
//! grants its unavailable action family execution authority.
use super::*;

impl HeapBytes for RetainedOne {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Null => Some(0),
            Self::Record(row) => row.heap_bytes(),
        }
    }
}
heap_record!(RetainedMap { rows });
heap_record!(ItemHandlingReadPolicy {
    actor_body_profiles
});
heap_record!(ParticipationReadPolicy { safe_return_anchor });
heap_record!(RetainedDefinitions {
    knowledge_policy,
    item_handling,
    item_handling_read,
    gathering_policy,
    work_batch_policy,
    social_offer_policy,
    hearth_definitions,
    assembly_families,
    construction_profile,
    contents_exposure_profiles,
    daily_rain_definitions,
    participation_policy,
    participation_read,
    native_strikes,
    native_strike_read,
    native_foraging_profiles,
    supply_opportunities,
    food_preparations,
    cast_definitions,
    invention_policy,
    story_policy,
    item_definitions,
    recipes,
    flight_routes,
    places
});
// knowledge_limits contains only closed enum/scalar fields and allocates none.
