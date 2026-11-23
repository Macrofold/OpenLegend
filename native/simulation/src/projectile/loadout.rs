//! Select an accessible tool and one compatible projectile from the holder's
//! current stock. An existing aim may reuse its own exact held unit.
use crate::execution::ExecutionError;
use crate::install::{ItemDefinitionRead, OwnedItem, owned_by, project_owned};
use crate::simulation::SimulationState;
use crate::state::{Action, Entity};

pub(crate) type Choice<'a> = (OwnedItem<'a>, &'a ItemDefinitionRead);

pub(crate) fn weapon<'a>(
    state: &'a SimulationState,
    holder: &'a Entity,
    selected: Option<&str>,
    equip: bool,
    accepts: impl Fn(&ItemDefinitionRead) -> bool,
) -> Result<Option<Choice<'a>>, ExecutionError> {
    let physical = &state.physical;
    let retained = &state.installed.retained;
    let candidate = |lot: OwnedItem<'a>| {
        let definition = retained.items.get(lot.definition_id)?;
        (definition.ranged_weapon.is_some()
            && accepts(definition)
            && (lot.equipped || equip && lot.quantity == 1 && lot.available_quantity == 1))
            .then_some((lot, definition))
    };
    if let Some(item) = selected {
        return Ok(owned_by(physical, retained, &holder.id, item)?.and_then(candidate));
    }
    for body in state
        .inventory
        .children(&physical.entities, &holder.id, true)
    {
        let lot = project_owned(
            retained,
            &holder.id,
            body,
            false,
            physical.holds.quantity(&body.id),
        )?;
        if let Some(choice) = candidate(lot).filter(|(lot, _)| lot.equipped) {
            return Ok(Some(choice));
        }
    }
    Ok(None)
}

pub(crate) fn ammunition<'a>(
    state: &'a SimulationState,
    holder: &'a Entity,
    selected: Option<&str>,
    kind: &str,
    held: Option<&Action>,
) -> Result<Option<Choice<'a>>, ExecutionError> {
    let physical = &state.physical;
    let retained = &state.installed.retained;
    let candidate = |lot: OwnedItem<'a>| {
        let definition = retained.items.get(lot.definition_id)?;
        (definition
            .ammunition
            .as_ref()
            .is_some_and(|ammo| ammo.kind == kind)
            && (lot.available_quantity > 0
                || held
                    .and_then(|action| action.ranged.as_ref().map(|aim| (action, aim)))
                    .is_some_and(|(action, aim)| {
                        physical.holds.matches_item(
                            &holder.id,
                            &action.id,
                            &aim.reservation_id,
                            lot.id,
                            1,
                            &definition.pin,
                        )
                    })))
        .then_some((lot, definition))
    };
    if let Some(item) = selected {
        return Ok(owned_by(physical, retained, &holder.id, item)?.and_then(candidate));
    }
    let mut selected = None;
    state.inventory.visit_owned_until(
        &physical.entities,
        &holder.id,
        &holder.id,
        &mut |body, accessible| {
            let lot = project_owned(
                retained,
                &holder.id,
                body,
                accessible,
                physical.holds.quantity(&body.id),
            )?;
            selected = candidate(lot);
            Ok(selected.is_some())
        },
    )?;
    Ok(selected)
}

pub(crate) fn valid_saved(
    state: &crate::simulation::PhysicalState,
    installed: &crate::simulation::InstalledWorld,
    actor: &Entity,
    action: &Action,
) -> bool {
    let Some(aim) = action.ranged.as_ref() else {
        return false;
    };
    let Some((policy, pin)) = installed
        .manifest
        .ranged_policy
        .as_ref()
        .zip(installed.manifest.ranged_policy_pin.as_ref())
    else {
        return false;
    };
    let Some((tool, ammo)) = action
        .weapon_item_id
        .as_deref()
        .zip(action.ammo_item_id.as_deref())
    else {
        return false;
    };
    let owned = |id| {
        owned_by(state, &installed.retained, &actor.id, id)
            .ok()
            .flatten()
    };
    let Some((tool, ammo)) = owned(tool).zip(owned(ammo)) else {
        return false;
    };
    let target = aim.aim_target.as_ref();
    let valid_body = |target: &crate::projectile::AimedLife| {
        target.id != actor.id
            && target.life <= crate::identity::MAX_SAFE_INTEGER
            && crate::values::is_safe_record_id(&target.id)
    };
    let chosen = match (target, aim.aim_point) {
        (Some(body), None) => {
            valid_body(body)
                && action.target_id.as_deref() == Some(body.id.as_str())
                && action.target_life == Some(body.life)
                && aim.aim_point_subject.is_none()
        }
        (None, Some(point)) => {
            policy.point_fire
                && action.kind != "hunt"
                && action.stage == "working"
                && action.target_id.is_none()
                && action.target_life.is_none()
                && [point.x, point.y, point.z].into_iter().all(f64::is_finite)
                && aim.aim_point_subject.as_ref().is_none_or(valid_body)
        }
        _ => false,
    };
    chosen && action.ranged_policy_pin.as_ref() == Some(pin)
        && action.competence_pin.is_none()
        && aim.observed_motion.is_none()
        && aim.manual == (action.kind == "aim")
        && aim.ready == (aim.manual && action.remaining_seconds == 0.0)
        && (!aim.ready || action.stage == "working")
        && matches!(action.stage.as_str(), "approaching" | "working")
        && action.destination.is_none()
        && (action.stage == "approaching"
            || (action.path.is_empty() && action.navigation.is_none()))
        && action.total_seconds == policy.windup_seconds
        && (0.0..=action.total_seconds).contains(&action.remaining_seconds)
        && (aim.ready || action.remaining_seconds > 0.0)
        && actor.physical_life() == Some(aim.source_life)
        && aim.reservation_id == crate::projectile::hold_id(&action.id)
        && tool.equipped
        && tool.definition_id == aim.tool.id
        && ammo.definition_id == aim.ammunition.id
        && installed_loadout(installed, aim).is_ok()
        && action.lethal_permission.as_ref().is_none_or(|permission| {
            action.requires_lethal_review == Some(true)
                && target.map_or_else(
                    || permission.valid_for_source(actor),
                    |target| permission.valid_for_action(actor, &target.id, target.life),
                )
        })
        && state.holds.matches_item(
            &actor.id,
            &action.id,
            &aim.reservation_id,
            ammo.id,
            1,
            &aim.ammunition,
        )
}

pub(crate) fn installed_loadout<'a>(
    installed: &'a crate::simulation::InstalledWorld,
    aim: &crate::projectile::RangedAim,
) -> Result<
    (
        &'a crate::projectile::RangedWeapon,
        &'a crate::projectile::Ammunition,
    ),
    crate::execution::ExecutionError,
> {
    let items = &installed.retained.items;
    let weapon = items
        .get(&aim.tool.id)
        .filter(|tool| tool.pin == aim.tool)
        .and_then(|tool| tool.ranged_weapon.as_ref())
        .ok_or(crate::execution::ExecutionError::InvalidCheckpoint)?;
    let ammunition = items
        .get(&aim.ammunition.id)
        .filter(|stock| stock.pin == aim.ammunition)
        .and_then(|stock| stock.ammunition.as_ref())
        .filter(|stock| stock.kind == weapon.ammunition_kind)
        .ok_or(crate::execution::ExecutionError::InvalidCheckpoint)?;
    Ok((weapon, ammunition))
}
