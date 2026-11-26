//! A cooking menu chooses exact roles once per permitted inventory, then
//! binds its prepared choices to the currently received heat sources.
use super::*;
use crate::work::{WorkDemand, WorkMeters, WorkUnit};

#[derive(Clone, Copy)]
struct Lot<'a> {
    id: &'a str,
    remaining: u64,
}

pub(crate) struct Choice<'a> {
    pub recipe: &'a InstalledPreparation,
    pub inputs: Option<IndexMap<String, String>>,
}

pub(crate) struct Choices<'a> {
    _storage: ByteReservation,
    pub rows: Vec<Choice<'a>>,
}

pub(crate) fn choices<'a>(
    state: &'a SimulationState,
    actor: &str,
    selected: Option<&str>,
    budget: &ByteBudget,
) -> Result<Choices<'a>, ExecutionError> {
    let retained = &state.installed.retained;
    let group = state.installed.work_policy.policy().group;
    let mut storage = budget.reserve(
        WorkMeters::heap_bound(group)? + retained.preparations.len() * size_of::<Choice<'_>>(),
    )?;
    let mut meter = WorkMeters::new(group)?;
    let token = meter.begin(WorkDemand {
        depth: Some(1),
        ..group
    })?;
    let mut materials: IndexMap<&str, Vec<Lot<'_>>> = IndexMap::new();
    let mut selected_definition = None;
    state.inventory.visit_owned(
        &state.physical,
        retained,
        actor,
        actor,
        &mut |item| {
            meter.charge(&[(WorkUnit::Tests, 1)])?;
            storage.resize(
                storage
                    .bytes()
                    .checked_add(4 * (size_of::<Lot<'_>>() + 64))
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let bucket = materials.entry(item.definition_id).or_default();
            let lot = Lot {
                id: item.id,
                remaining: item.available_quantity,
            };
            if selected == Some(item.id) {
                selected_definition = Some(item.definition_id);
                bucket.insert(0, lot);
            } else {
                bucket.push(lot);
            }
            Ok(())
        },
    )?;
    let mut rows = Vec::with_capacity(retained.preparations.len());
    for recipe in retained.preparations.values() {
        let inputs = &recipe.definition.inputs;
        meter.charge(&[(WorkUnit::Tests, inputs.len() as u64)])?;
        if selected.is_some()
            && !inputs
                .iter()
                .any(|input| Some(input.definition_id.as_str()) == selected_definition)
        {
            continue;
        }
        let assignment = assign(
            &mut materials,
            inputs,
            selected,
            selected_definition,
            &mut meter,
            budget,
        )?;
        let assigned = if let Some(assignment) = assignment {
            let bytes = assignment.iter().try_fold(
                map_storage::<String, String>(inputs.len()).ok_or(ExecutionError::Capacity)?,
                |bytes, (role, lot)| {
                    bytes
                        .checked_add(role.len() + lot.len())
                        .ok_or(ExecutionError::Capacity)
                },
            )?;
            storage.resize(
                storage
                    .bytes()
                    .checked_add(bytes)
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            Some(
                assignment
                    .into_iter()
                    .map(|(role, lot)| (role.into(), lot.into()))
                    .collect(),
            )
        } else {
            None
        };
        rows.push(Choice {
            recipe,
            inputs: assigned,
        });
    }
    meter.finish(token)?;
    Ok(Choices {
        _storage: storage,
        rows,
    })
}

fn assign<'a>(
    materials: &mut IndexMap<&'a str, Vec<Lot<'a>>>,
    inputs: &'a [Ingredient],
    selected: Option<&str>,
    selected_definition: Option<&str>,
    meter: &mut WorkMeters,
    budget: &ByteBudget,
) -> Result<Option<Vec<(&'a str, &'a str)>>, ExecutionError> {
    let _workspace = budget.reserve(inputs.len() * 512)?;
    let mut groups: IndexMap<&str, Vec<&Ingredient>> = IndexMap::new();
    for input in inputs {
        groups.entry(&input.definition_id).or_default().push(input);
    }
    let mut selected_lots = Vec::with_capacity(inputs.len());
    for (material, roles) in &mut groups {
        let Some(lots) = materials.get_mut(material) else {
            return Ok(None);
        };
        roles.sort_by_key(|role| std::cmp::Reverse(role.quantity));
        let smallest = roles.last().ok_or(ExecutionError::Invariant)?.quantity;
        let needed: u128 = roles.iter().map(|role| role.quantity as u128).sum();
        let enough = lots.iter().fold((0_u128, 0_usize), |(total, slots), lot| {
            (
                total + lot.remaining as u128,
                roles
                    .len()
                    .min(slots.saturating_add((lot.remaining / smallest) as usize)),
            )
        });
        if enough.0 < needed || enough.1 < roles.len() {
            return Ok(None);
        }
        let selected_used = selected.is_none() || selected_definition != Some(*material);
        if !choose(
            roles,
            lots,
            selected,
            selected_used,
            &mut selected_lots,
            meter,
            budget,
        )? {
            return Ok(None);
        }
    }
    Ok(Some(selected_lots))
}

fn choose<'a>(
    roles: &[&'a Ingredient],
    lots: &mut [Lot<'a>],
    selected: Option<&str>,
    selected_used: bool,
    output: &mut Vec<(&'a str, &'a str)>,
    meter: &mut WorkMeters,
    budget: &ByteBudget,
) -> Result<bool, ExecutionError> {
    let Some((role, rest)) = roles.split_first() else {
        return Ok(selected_used);
    };
    let _workspace = budget.reserve(
        lots.len()
            .checked_mul(size_of::<(u64, bool)>() * 4)
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let mut equivalent = HashSet::new();
    for index in 0..lots.len() {
        meter.charge(&[(WorkUnit::Tests, 1)])?;
        let lot = lots[index];
        let is_selected = Some(lot.id) == selected;
        if lot.remaining < role.quantity || !equivalent.insert((lot.remaining, is_selected)) {
            continue;
        }
        lots[index].remaining -= role.quantity;
        output.push((&role.role, lot.id));
        let assigned = choose(
            rest,
            lots,
            selected,
            selected_used || is_selected,
            output,
            meter,
            budget,
        );
        lots[index].remaining = lot.remaining;
        if assigned? {
            return Ok(true);
        }
        output.pop();
    }
    Ok(false)
}
