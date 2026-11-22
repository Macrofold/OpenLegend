//! One selected exposed meal. The physical owners prepare reach,
//! stock and attribute writes. The installed world supplies diet and wording.
use crate::execution::{CoreMutation, ExecutionError, StagedOccurrence};
use crate::geometry::RouteQuery;
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation};
use crate::native_response::{FoodSourceKind, FoodStock, ResourceFeeding};
use crate::simulation::SimulationState;
use crate::state::{Entity, ItemLot, Placement, Remains, Resource};
use crate::worlds::base_foraging::{InstalledFood, InstalledForagingProfile, ResourceDiet};

#[derive(Clone, Copy)]
pub(crate) enum MealSource<'a> {
    Resource(&'a Resource),
    Item(&'a str, &'a ItemLot),
    Remains(&'a Remains),
}

impl<'a> MealSource<'a> {
    pub(crate) fn item_id(self) -> Option<&'a str> {
        match self {
            Self::Item(id, _) => Some(id),
            _ => None,
        }
    }
}

pub(crate) struct Meal<'a> {
    pub profile: &'a InstalledForagingProfile,
    pub food: &'a InstalledFood,
    pub diet: &'a ResourceDiet,
    pub source: MealSource<'a>,
}

pub(crate) fn source_candidate(state: &SimulationState, target: &Entity) -> bool {
    target.resource.is_some()
        || target.kind == state.installed.observation_rules.value().pile_kind
        || target
            .remains
            .as_ref()
            .is_some_and(|value| value.phase == "fresh")
}

pub(crate) fn meal<'a>(
    state: &'a SimulationState,
    animal: &Entity,
    target: &'a Entity,
    item_id: Option<&str>,
) -> Option<Meal<'a>> {
    let foraging = animal.animal.as_ref()?.foraging.as_ref()?;
    let rules = &state.installed.retained.foraging;
    let profile = rules.profiles.get(&foraging.profile.id)?;
    if profile.pin != foraging.profile
        || target.retirement.is_some()
        || !target.actively_participates()
        || target.world_position().is_none()
    {
        return None;
    }
    let container_access = || {
        target
            .container
            .as_ref()
            .and_then(|bag| bag.access.as_ref())
            .is_none_or(|access| access.actors.contains(&animal.id))
    };
    let (source, diet) = if let Some(item_id) = item_id {
        if target.kind != state.installed.observation_rules.value().pile_kind || !container_access()
        {
            return None;
        }
        let item = state.physical.entities.get(item_id)?;
        let lot = item.item.as_ref()?;
        if !matches!(&item.placement, Some(Placement::Contained { parent_entity_id, .. }) if parent_entity_id == &target.id)
            || lot.quantity == 0
            || item.retirement.is_some()
            || !state
                .inventory
                .has_direct_item(&state.physical.entities, &target.id, item)
        {
            return None;
        }
        (
            MealSource::Item(&item.id, lot),
            profile
                .profile
                .diet_for(&lot.definition_pin.id, FoodSourceKind::Item)?,
        )
    } else if let Some(stock) = target.resource.as_ref().filter(|stock| stock.quantity > 0) {
        (
            MealSource::Resource(stock),
            profile
                .profile
                .diet_for(&stock.definition_id, FoodSourceKind::Resource)?,
        )
    } else if let Some(remains) = target
        .remains
        .as_ref()
        .filter(|value| value.phase == "fresh" && !value.harvested && container_access())
    {
        let diet = profile.profile.diet.iter().find(|diet| {
            diet.sources.contains(&FoodSourceKind::Remains)
                && remains
                    .yields
                    .iter()
                    .any(|row| row.definition_id == diet.definition_id && row.quantity > 0)
        })?;
        (MealSource::Remains(remains), diet)
    } else {
        return None;
    };
    let food = rules.food.get(&diet.definition_id)?;
    if matches!(source, MealSource::Item(_, item) if item.definition_pin != food.pin) {
        return None;
    }
    Some(Meal {
        profile,
        food,
        diet,
        source,
    })
}

/// The saved binding uses Source's exact canonical yield JSON. Encode only a
/// selected remains meal. Sight/choice among visible sources uses typed fields.
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct YieldDigest<'a> {
    died_at: f64,
    harvested: bool,
    phase: &'a str,
    remove_at: Option<f64>,
    rot_at: Option<f64>,
    source_id: &'a str,
    yields: &'a [crate::state::Yield],
}

impl<'a> From<&'a Remains> for YieldDigest<'a> {
    fn from(value: &'a Remains) -> Self {
        Self {
            died_at: value.died_at,
            harvested: value.harvested,
            phase: &value.phase,
            remove_at: value.remove_at,
            rot_at: value.rot_at,
            source_id: &value.source_id,
            yields: &value.yields,
        }
    }
}

impl Meal<'_> {
    pub(crate) fn binding(
        &self,
        budget: &ByteBudget,
    ) -> Result<(ResourceFeeding, ByteReservation), ExecutionError> {
        let digest = match self.source {
            MealSource::Remains(value) => Some(YieldDigest::from(value)),
            _ => None,
        };
        let digest_bytes = digest
            .as_ref()
            .map(crate::encoding::json_record_len)
            .transpose()
            .map_err(|_| ExecutionError::Invariant)?
            .unwrap_or_default();
        let storage = budget.reserve(
            heap_sum([
                std::mem::size_of::<ResourceFeeding>(),
                self.profile
                    .pin
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?,
                self.food.pin.heap_bytes().ok_or(ExecutionError::Capacity)?,
                self.source.item_id().map_or(0, str::len),
                digest_bytes
                    .checked_mul(2)
                    .ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let source = match self.source {
            MealSource::Resource(stock) => FoodStock::Resource {
                revision: stock.revision.unwrap_or(0),
            },
            MealSource::Item(item_id, lot) => FoodStock::Item {
                item_id: item_id.into(),
                revision: lot.revision,
            },
            MealSource::Remains(_) => FoodStock::Remains {
                digest: crate::encoding::json_record(&digest.ok_or(ExecutionError::Invariant)?)
                    .map_err(|_| ExecutionError::Invariant)?,
            },
        };
        Ok((
            ResourceFeeding {
                profile: self.profile.pin.clone(),
                food: self.food.pin.clone(),
                source,
            },
            storage,
        ))
    }

    pub(crate) fn matches(
        &self,
        binding: &ResourceFeeding,
        budget: &ByteBudget,
    ) -> Result<bool, ExecutionError> {
        if self.profile.pin != binding.profile || self.food.pin != binding.food {
            return Ok(false);
        }
        Ok(match (self.source, &binding.source) {
            (MealSource::Resource(stock), FoodStock::Resource { revision }) => {
                stock.revision.unwrap_or(0) == *revision
            }
            (MealSource::Item(id, item), FoodStock::Item { item_id, revision }) => {
                id == item_id && item.revision == *revision
            }
            (MealSource::Remains(value), FoodStock::Remains { digest }) => {
                let current = YieldDigest::from(value);
                let bytes = crate::encoding::json_record_len(&current)
                    .map_err(|_| ExecutionError::Invariant)?;
                if bytes != digest.len() {
                    return Ok(false);
                }
                let _storage =
                    budget.reserve(bytes.checked_mul(2).ok_or(ExecutionError::Capacity)?)?;
                crate::encoding::json_record(&current).map_err(|_| ExecutionError::Invariant)?
                    == *digest
            }
            _ => false,
        })
    }
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
    stage_subject(core, actor, Some(target), event_type, text, data)
}

pub(crate) fn stage_subject(
    core: &mut CoreMutation<'_>,
    actor: &str,
    target: Option<&str>,
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
        target_id: target.map(str::to_owned),
        data: Some(data),
        scope: EventScope::External,
        origin: None,
        exposure: None,
    })
}
