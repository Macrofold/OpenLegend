//! The selected contact menu prepares installed ranged choices during the
//! existing disclosure lease. The caller borrows the allowed item identities.
use crate::execution::ExecutionError;
use crate::host::retained_size::{heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::install::{ItemDefinitionRead, OwnedItem, project_owned};
use crate::narration::{NameArticle, name_phrase};
use crate::projectile::RuntimeRangedMode;
use crate::simulation::SimulationState;
use crate::state::{Entity, Named};
use crate::text::{JsText, TextRef, substitute_fields, substituted_fields_bound};
use indexmap::IndexMap;

pub struct RuntimeRangedChoice<'a> {
    pub mode: RuntimeRangedMode,
    pub weapon: &'a str,
    pub ammunition: &'a str,
    pub label: JsText,
    pub description: JsText,
    pub reason: Option<&'a str>,
    pub auto_equip: bool,
}

pub(super) fn choices<'a>(
    state: &'a SimulationState,
    source: &'a Entity,
    target: &'a Entity,
    name: &Named,
    budget: &ByteBudget,
) -> Result<(Vec<RuntimeRangedChoice<'a>>, ByteReservation), ExecutionError> {
    let installed = &state.installed;
    let mut custody = budget.reserve(0)?;
    let Some((policy, text)) = installed
        .manifest
        .ranged_policy
        .as_ref()
        .zip(installed.occurrence_rules.value().ranged.as_ref())
    else {
        return Ok((Vec::new(), custody));
    };
    if !policy.permits(target)
        || !installed
            .retained
            .item_handling_read
            .can_handle(&source.spatial.body.id)
    {
        return Ok((Vec::new(), custody));
    }
    let mut stock = IndexMap::<&str, &str>::new();
    let mut tools = Vec::<(OwnedItem<'_>, &ItemDefinitionRead)>::new();
    let state_items = &state.physical.entities;
    state.inventory.visit_owned_until(
        state_items,
        &source.id,
        &source.id,
        &mut |item, accessible| {
            let owned = project_owned(
                &installed.retained,
                &source.id,
                item,
                accessible,
                state.physical.holds.quantity(&item.id),
            )?;
            let Some(definition) = installed.retained.items.get(owned.definition_id) else {
                return Err(ExecutionError::Invariant);
            };
            if let Some(ammo) = definition
                .ammunition
                .as_ref()
                .filter(|_| owned.available_quantity > 0)
            {
                if !stock.contains_key(ammo.kind.as_str()) {
                    custody.resize(
                        custody
                            .bytes()
                            .checked_add(
                                map_storage::<&str, &str>(4).ok_or(ExecutionError::Capacity)?,
                            )
                            .ok_or(ExecutionError::Capacity)?,
                    )?;
                    stock.try_reserve(1).map_err(|_| ExecutionError::Capacity)?;
                    stock.insert(ammo.kind.as_str(), owned.id);
                }
            }
            if definition.ranged_weapon.is_some()
                && (owned.equipped
                    || (owned.quantity == 1
                        && owned.available_quantity == 1
                        && source
                            .actor
                            .as_ref()
                            .is_some_and(|actor| actor.action.is_none())))
            {
                custody.resize(
                    custody
                        .bytes()
                        .checked_add(4 * size_of::<(OwnedItem<'_>, &ItemDefinitionRead)>())
                        .ok_or(ExecutionError::Capacity)?,
                )?;
                tools.try_reserve(1).map_err(|_| ExecutionError::Capacity)?;
                tools.push((owned, definition));
            }
            Ok(false)
        },
    )?;
    if tools.is_empty() || stock.is_empty() {
        return Ok((Vec::new(), custody));
    }
    let hunt = crate::projectile::may_hunt(installed, target);
    let modes = [
        (
            RuntimeRangedMode::Aim,
            &text.menu.aim_label,
            &text.menu.aim_description,
        ),
        (
            RuntimeRangedMode::ShootOnce,
            &text.menu.shoot_label,
            &text.menu.shoot_description,
        ),
        (
            RuntimeRangedMode::Hunt,
            &text.menu.hunt_label,
            &text.menu.shoot_description,
        ),
    ];
    let modes = &modes[..2 + usize::from(hunt)];
    let mut choices = Vec::new();
    let label_bound = 128 + name.name.storage_bytes() * 4;
    custody.resize(
        custody
            .bytes()
            .checked_add(label_bound)
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let name = name_phrase(name, NameArticle::Definite, false);
    let reason = source
        .actor
        .as_ref()
        .is_some_and(|actor| {
            actor
                .combat_ready_at
                .is_some_and(|at| at > state.physical.header.sim_time)
        })
        .then_some(&installed.ordinary_actions.value().not_applicable.message)
        .map(String::as_str);
    for (tool, definition) in tools {
        let weapon = definition
            .ranged_weapon
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        let Some(ammo) = stock.get(weapon.ammunition_kind.as_str()).copied() else {
            continue;
        };
        for (mode, label, description) in modes {
            let fields = [
                ("label", TextRef::from(label.as_str())),
                ("target", TextRef::from(&name)),
                ("tool", TextRef::from(&definition.named.name)),
            ];
            let bytes = heap_sum([
                4 * size_of::<RuntimeRangedChoice<'_>>(),
                substituted_fields_bound(&text.menu.title, &fields)
                    .ok_or(ExecutionError::Capacity)?,
                description.storage_bytes(),
            ])
            .ok_or(ExecutionError::Capacity)?;
            custody.resize(
                custody
                    .bytes()
                    .checked_add(bytes)
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            choices
                .try_reserve(1)
                .map_err(|_| ExecutionError::Capacity)?;
            choices.push(RuntimeRangedChoice {
                mode: *mode,
                weapon: tool.id,
                ammunition: ammo,
                label: substitute_fields(&text.menu.title, &fields),
                description: (*description).clone(),
                reason,
                auto_equip: !tool.equipped,
            });
        }
    }
    Ok((choices, custody))
}
