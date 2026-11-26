use super::*;
use crate::host::{ByteBudget, ByteReservation};
use crate::worlds::base_foraging::{
    FoodDefinition, InstalledFood, InstalledForaging, InstalledForagingProfile, ResourceDiet,
    ResourceForagingProfile,
};

type CanonicalBodies<'a> = IndexMap<String, &'a RawValue>;

fn bodies<'a>(
    input: &'a CanonicalInput,
    budget: &ByteBudget,
) -> Result<(CanonicalBodies<'a>, ByteReservation), InstallError> {
    let storage = super::super::reserve_typed_parse::<CanonicalBodies<'_>>(
        &input.canonical,
        0,
        Some(size_of::<(usize, String, &RawValue)>()),
        budget,
    )?;
    let values = serde_json::from_str(&input.canonical).map_err(|_| InstallError::CurrentFormat)?;
    Ok((values, storage))
}

/// Original immutable rows have already matched their exact canonical world
/// maps. Retain only the selected executable resource branch. Borrowed child
/// bodies preserve Source's complete pin and ordering; never infer identity
/// from a partial typed projection or reorder a JSON object in Rust.
pub(super) fn prepare(
    profiles: Option<&CanonicalInput>,
    food: &CanonicalInput,
    budget: &ByteBudget,
) -> Result<(InstalledForaging, ByteReservation), InstallError> {
    let mut result = InstalledForaging::default();
    let Some(profiles) = profiles else {
        return Ok((
            result,
            budget.reserve(0).map_err(|_| InstallError::Capacity)?,
        ));
    };
    let (profiles, _profiles) = bodies(profiles, budget)?;
    let (food, _food) = bodies(food, budget)?;
    let mut workspace = budget
        .reserve(
            map_storage::<String, InstalledForagingProfile>(profiles.len())
                .and_then(|bytes| {
                    bytes.checked_add(map_storage::<String, InstalledFood>(food.len())?)
                })
                .ok_or(InstallError::Capacity)?,
        )
        .map_err(|_| InstallError::Capacity)?;
    for (id, raw) in profiles {
        let parse = super::super::reserve_typed_parse::<ResourceForagingProfile>(
            raw.get(),
            size_of::<ResourceDiet>(),
            None,
            budget,
        )?;
        // Other diet/behavior families can remain as authored definitions. A
        // live actor selecting any of them still fails current installation.
        let Ok(typed) = serde_json::from_str::<ResourceForagingProfile>(raw.get()) else {
            continue;
        };
        let profile = typed
            .pinned(&id, raw.get())
            .ok_or(InstallError::CurrentFormat)?;
        for diet in &profile.profile.diet {
            if result.food.contains_key(&diet.definition_id) {
                continue;
            }
            let raw = food
                .get(&diet.definition_id)
                .ok_or(InstallError::DefinitionBody)?;
            let parse =
                super::super::reserve_typed_parse::<FoodDefinition>(raw.get(), 0, None, budget)?;
            let definition: FoodDefinition =
                serde_json::from_str(raw.get()).map_err(|_| InstallError::DefinitionBody)?;
            let definition = definition
                .pinned(&diet.definition_id, raw.get())
                .ok_or(InstallError::DefinitionBody)?;
            workspace.merge(parse).map_err(|_| InstallError::Capacity)?;
            result.food.insert(diet.definition_id.clone(), definition);
        }
        workspace.merge(parse).map_err(|_| InstallError::Capacity)?;
        result.profiles.insert(id, profile);
    }
    workspace
        .resize(result.heap_bytes().ok_or(InstallError::Capacity)?)
        .map_err(|_| InstallError::Capacity)?;
    Ok((result, workspace))
}
