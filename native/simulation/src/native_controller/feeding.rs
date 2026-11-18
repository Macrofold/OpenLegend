//! One selected ground resource action. The physical owners prepare reach,
//! stock and attribute writes. The installed world supplies diet and wording.
use crate::execution::{CoreMutation, ExecutionError, StagedOccurrence};
use crate::geometry::{RouteQuery, SightRay};
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation};
use crate::native_response::{FoodStock, ResourceFeeding};
use crate::simulation::InstalledWorld;
use crate::state::Entity;
use crate::worlds::base_foraging::{InstalledFood, InstalledForagingProfile, ResourceDiet};

pub(crate) type Meal<'a> = (
    &'a InstalledForagingProfile,
    &'a InstalledFood,
    &'a ResourceDiet,
);

pub(crate) fn meal<'a>(
    installed: &'a InstalledWorld,
    animal: &Entity,
    target: &Entity,
) -> Option<Meal<'a>> {
    let state = animal.animal.as_ref()?.foraging.as_ref()?;
    let rules = &installed.retained.foraging;
    let profile = rules.profiles.get(&state.profile.id)?;
    let stock = target.resource.as_ref()?;
    if profile.pin != state.profile || stock.quantity == 0 || !target.actively_participates() {
        return None;
    }
    let diet = profile
        .profile
        .diet
        .iter()
        .find(|meal| meal.definition_id == stock.definition_id)?;
    let food = rules.food.get(&diet.definition_id)?;
    Some((profile, food, diet))
}

pub(crate) fn binding(
    choice: Meal<'_>,
    target: &Entity,
    budget: &ByteBudget,
) -> Result<(ResourceFeeding, ByteReservation), ExecutionError> {
    let (profile, food, _) = choice;
    let bytes = heap_sum([
        std::mem::size_of::<ResourceFeeding>(),
        profile.pin.heap_bytes().ok_or(ExecutionError::Capacity)?,
        food.pin.heap_bytes().ok_or(ExecutionError::Capacity)?,
    ])
    .ok_or(ExecutionError::Capacity)?;
    let storage = budget.reserve(bytes)?;
    let revision = target
        .resource
        .as_ref()
        .ok_or(ExecutionError::Invariant)?
        .revision
        .unwrap_or(0);
    Ok((
        ResourceFeeding {
            profile: profile.pin.clone(),
            food: food.pin.clone(),
            source: FoodStock::Resource { revision },
        },
        storage,
    ))
}

pub(crate) fn reach_ray(
    actor: &Entity,
    target: &Entity,
    reach: f64,
    budget: &ByteBudget,
) -> Result<Option<SightRay>, ExecutionError> {
    let mut from = actor
        .world_position()
        .ok_or(ExecutionError::InvalidPosition)?;
    from.y += crate::status::effective_body_profile(actor, budget)?.interaction_height;
    let mut to = target
        .world_position()
        .ok_or(ExecutionError::InvalidPosition)?;
    to.y += crate::status::effective_body_profile(target, budget)?.interaction_height;
    Ok((crate::spatial::distance(from, to) <= reach).then_some(SightRay { from, to }))
}

pub(crate) fn approach(
    actor: &Entity,
    target: &Entity,
    reach: f64,
    budget: &ByteBudget,
) -> Result<(RouteQuery, ByteReservation), ExecutionError> {
    let profile = crate::status::effective_body_profile(actor, budget)?;
    let support_bytes = |entity: &Entity| match entity.placement.as_ref() {
        Some(crate::state::Placement::World {
            support_surface_id, ..
        }) => support_surface_id.as_ref().map_or(0, String::len),
        _ => 0,
    };
    let reservation = budget.reserve(
        heap_sum([
            std::mem::size_of::<RouteQuery>(),
            support_bytes(actor),
            support_bytes(target),
            profile.id.len(),
        ])
        .ok_or(ExecutionError::Capacity)?,
    )?;
    let target_position = target
        .world_position()
        .ok_or(ExecutionError::InvalidPosition)?;
    let mut goal = target_position;
    goal.y += crate::status::effective_body_profile(target, budget)?.interaction_height;
    Ok((
        RouteQuery::Approach {
            from: actor
                .supported_position()
                .ok_or(ExecutionError::InvalidPosition)?,
            body: (*profile).clone(),
            target_position,
            target_support: target.supported_position(),
            reach,
            goal,
        },
        reservation,
    ))
}

pub(crate) fn stage(
    core: &mut CoreMutation<'_>,
    actor: &str,
    target: &str,
    event_type: &str,
    text: crate::text::JsText,
    data: indexmap::IndexMap<String, crate::reception::EventScalar>,
) -> Result<StagedOccurrence, ExecutionError> {
    use crate::events::{AudienceSelection, EmissionText, EventEmissionIntent, EventScope};
    use crate::narration::{Narration, NarrationPart, PersonRole};
    core.stage_event(EventEmissionIntent {
        event_type: event_type.into(),
        text: EmissionText::Narration(Narration {
            parts: vec![
                NarrationPart::Participant {
                    entity_id: actor.into(),
                    role: PersonRole::Subject,
                    article: None,
                },
                NarrationPart::Literal(" ".into()),
                NarrationPart::Literal(text),
            ],
        }),
        audience: AudienceSelection::Physical,
        source_id: Some(actor.into()),
        target_id: Some(target.into()),
        data: Some(data),
        scope: EventScope::External,
        origin: None,
        exposure: None,
    })
}
