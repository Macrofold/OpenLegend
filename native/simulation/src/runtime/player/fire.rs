//! Fire offers use the selected current heat reference and only the actor's
//! accessible inventory. They are rendered while its disclosure lease is held.
use super::*;
use crate::fire_care::{self, FireCare, FireMenuWords, FireOperation, VisibleFuel};
use crate::simulation::SimulationState;
use crate::state::Entity;
use crate::text::JsText;

pub struct RuntimeFireChoice<'a> {
    pub operation: FireOperation,
    pub item: Option<(&'a str, &'a JsText)>,
    pub label: &'a str,
    pub description: &'a str,
    pub work_seconds: f64,
    pub reason: Option<&'a str>,
}

pub struct RuntimeFireMenu<'a> {
    pub category: &'a str,
    pub copy: &'a FireMenuWords,
    pub fuel: VisibleFuel,
    pub additions: (f64, f64),
    pub choices: Vec<RuntimeFireChoice<'a>>,
    pub(crate) _storage: crate::host::ByteReservation,
}

pub(super) fn choices<'a>(
    state: &'a SimulationState,
    rule: &'a FireCare,
    actor: &str,
    fire: &'a Entity,
    budget: &ByteBudget,
) -> Result<RuntimeFireMenu<'a>, RuntimeError> {
    let body = state
        .physical
        .entities
        .get(actor)
        .ok_or_else(|| failure("missing fire actor"))?;
    let blocked =
        crate::consumption::action_problem(&state.installed, body, state.physical.header.paused)
            .map_err(failure)?
            .map(|message| message.message.as_str());
    let mut workspace = budget.reserve(0)?;
    let mut fuels = Vec::new();
    let owned = fire_care::owned_materials(state, rule, actor, |lot| {
        workspace.resize(
            workspace
                .bytes()
                .checked_add(4 * std::mem::size_of_val(&lot))
                .ok_or(crate::host::CapacityError)?,
        )?;
        fuels.push(lot);
        Ok(())
    })
    .map_err(failure)?;
    let heat = fire.heat.ok_or_else(|| failure("missing current heat"))?;
    let maximum = 1 + fuels.len().max(1);
    let mut storage = budget.reserve(maximum * std::mem::size_of::<RuntimeFireChoice<'_>>())?;
    let mut choices = Vec::with_capacity(maximum);
    let first = if heat.lit {
        FireOperation::Extinguish
    } else {
        FireOperation::Light
    };
    let mut push = |operation, selected: Option<crate::install::OwnedItem<'a>>| {
        let words = rule.words(operation);
        let reason = blocked.or_else(|| {
            rule.evaluate(state, actor, fire, operation, owned, selected)
                .err()
                .map(|value| value.message.as_str())
        });
        choices.push(RuntimeFireChoice {
            operation,
            item: selected.map(|lot| (lot.id, &lot.named.name)),
            label: &words.label,
            description: &words.description,
            work_seconds: rule.work_seconds(operation),
            reason,
        });
    };
    push(first, None);
    if fuels.is_empty() {
        push(FireOperation::Fuel, None);
    } else {
        for fuel in fuels {
            push(FireOperation::Fuel, Some(fuel));
        }
    }
    storage.resize(choices.capacity() * std::mem::size_of::<RuntimeFireChoice<'_>>())?;
    Ok(RuntimeFireMenu {
        category: &rule.category,
        copy: &rule.menu,
        fuel: rule.visible_fuel(heat),
        additions: (rule.addition_hours(), rule.capacity_hours()),
        choices,
        _storage: storage,
    })
}
