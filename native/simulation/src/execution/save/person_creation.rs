//! Exact initial child placements for the selected world's freshly constructed person.
use super::*;
use crate::state::{ActorState, Entity};

pub(super) fn write(
    entity: &Entity,
    actor: &ActorState,
    output: &mut RowEncoder<'_>,
    budget: &ByteBudget,
) -> Result<(), RecordEncodingError> {
    let parent = ["world", "entities", entity.id.as_str()];
    let actor_owner = ["world", "entities", entity.id.as_str(), "actor"];
    let agency = ["world", "entities", entity.id.as_str(), "actor", "agency"];
    fn map<T: Serialize>(
        table: &str,
        field: &str,
        parent: &[&str],
        entries: Option<&IndexMap<String, T>>,
        output: &mut RowEncoder<'_>,
        budget: &ByteBudget,
    ) -> Result<(), RecordEncodingError> {
        let _paths = budget
            .reserve((parent.len() + 2) * size_of::<&str>())
            .map_err(|_| error())?;
        if let Some(values) = entries {
            for (ordinal, key, value) in OrderedMapRows::new(values, budget)?.iter() {
                let path: Vec<_> = parent.iter().copied().chain([field, key]).collect();
                created(
                    output,
                    table,
                    &path,
                    parent,
                    key,
                    ordinal,
                    value,
                    &[],
                    budget,
                )?;
            }
        }
        observe(
            output,
            table,
            parent,
            entries.is_some(),
            entries.map_or(0, |e| e.len() as u64),
            budget,
        )
    }
    fn list<T: Serialize>(
        table: &str,
        field: &str,
        parent: &[&str],
        entries: Option<&[T]>,
        key: impl Fn(&T) -> &str,
        output: &mut RowEncoder<'_>,
        budget: &ByteBudget,
    ) -> Result<(), RecordEncodingError> {
        let _paths = budget
            .reserve((parent.len() + 2) * size_of::<&str>() + 24)
            .map_err(|_| error())?;
        if let Some(values) = entries {
            for (i, value) in values.iter().enumerate() {
                let path: Vec<_> = parent.iter().copied().chain([field, key(value)]).collect();
                created(
                    output,
                    table,
                    &path,
                    parent,
                    &i.to_string(),
                    i as u64,
                    value,
                    &[],
                    budget,
                )?;
            }
        }
        observe(
            output,
            table,
            parent,
            entries.is_some(),
            entries.map_or(0, |e| e.len() as u64),
            budget,
        )
    }
    observe_entity_children(entity, &parent, output, budget)?;
    map(
        "sim_attributes",
        "attributes",
        &parent,
        entity.attributes.as_ref(),
        output,
        budget,
    )?;
    map(
        "sim_actor_attributes",
        "attributes",
        &actor_owner,
        actor.attributes.as_ref(),
        output,
        budget,
    )?;
    map(
        "sim_actor_practice",
        "practice",
        &actor_owner,
        actor.practice.as_ref(),
        output,
        budget,
    )?;
    map(
        "sim_actor_conditions",
        "conditions",
        &actor_owner,
        actor.conditions.as_ref(),
        output,
        budget,
    )?;
    list(
        "sim_actor_traits",
        "traits",
        &actor_owner,
        actor.traits.as_deref(),
        |t| t.id.as_str(),
        output,
        budget,
    )?;
    list(
        "sim_goals",
        "goals",
        &agency,
        Some(&actor.agency.goals),
        |g| g.id.as_str(),
        output,
        budget,
    )?;
    for (table, owner, present, count) in [
        ("sim_agency", actor_owner.as_slice(), true, 1),
        ("sim_processes", actor_owner.as_slice(), false, 0),
        ("sim_personal_encounters", actor_owner.as_slice(), false, 0),
        ("sim_plans", agency.as_slice(), false, 0),
        ("sim_plan_history", agency.as_slice(), true, 0),
        ("sim_intentions", agency.as_slice(), true, 0),
    ] {
        observe(output, table, owner, present, count, budget)?;
    }
    Ok(())
}
