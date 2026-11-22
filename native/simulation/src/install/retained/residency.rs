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
    actor_body_profiles,
    pickup_label,
    pickup_narration,
    object_body,
    packing_loads
});
heap_record!(ParticipationReadPolicy { safe_return_anchor });
heap_record!(SharedPhysicalSlots {});
heap_record!(SocialOfferReadMessages {
    incoming,
    outgoing,
    pair
});
heap_record!(SocialOfferReadPolicy {
    cooperation,
    messages
});
heap_record!(RetainedDefinitions {
    knowledge_policy,
    item_handling,
    item_handling_read,
    gathering_policy,
    work_batch_policy,
    social_offer_policy,
    social_offer_read,
    hearth_definitions,
    assembly_families,
    construction_seed_families,
    construction_profile,
    contents_exposure_profiles,
    daily_rain_definitions,
    participation_policy,
    participation_read,
    native_strikes,
    native_strike_read,
    native_foraging_profiles,
    foraging,
    supply_opportunities,
    food_preparations,
    preparations,
    cast_definitions,
    casts,
    invention_policy,
    story_policy,
    item_definitions,
    items,
    recipes,
    manufacture,
    flight_routes,
    flight_corridors,
    places,
    places_read
});
// knowledge_limits contains only closed enum/scalar fields and allocates none.
