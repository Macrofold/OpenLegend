//! Read the current practice choice through the installed method and stock.
//! The same selection serves the permitted menu and the candidate that owns
//! preparation. Geometry and the final release still bind the current cut.

use crate::execution::ExecutionError;
use crate::geometry::SightRay;
use crate::install::{ItemDefinitionRead, OwnedItem, VerifiedDefinition, owned_by, project_owned};
use crate::simulation::SimulationState;
use crate::state::{Action, Entity};
use crate::status::{AttributeDefinition, PracticeProfile};
use crate::values::AttributeValue;

pub(crate) struct PracticeChoice<'a> {
    pub profile: &'a PracticeProfile,
    pub definition: &'a VerifiedDefinition<AttributeDefinition>,
    pub weapon: Option<(OwnedItem<'a>, &'a ItemDefinitionRead)>,
    pub ammunition: Option<(OwnedItem<'a>, &'a ItemDefinitionRead)>,
    pub accuracy: Option<f64>,
    pub reason: Option<&'a str>,
}

fn profile<'a>(
    state: &'a SimulationState,
    target: &Entity,
) -> Option<(
    &'a VerifiedDefinition<AttributeDefinition>,
    &'a PracticeProfile,
)> {
    let definition = state
        .installed
        .attributes
        .get(&target.practice_target.as_ref()?.attribute_id)?;
    Some((definition, definition.value().practice.as_ref()?))
}

pub(crate) fn practice_choice<'a>(
    state: &'a SimulationState,
    actor: &'a Entity,
    target: &'a Entity,
    weapon_id: Option<&str>,
    ammunition_id: Option<&str>,
    existing: Option<&Action>,
) -> Result<Option<PracticeChoice<'a>>, ExecutionError> {
    let Some((definition, practice)) = profile(state, target) else {
        return Ok(None);
    };
    let physical = &state.physical;
    let installed = &state.installed;
    let retained = &installed.retained;
    let available = |lot: OwnedItem<'a>| -> Option<(OwnedItem<'a>, &'a ItemDefinitionRead)> {
        Some((lot, retained.items.get(lot.definition_id)?))
    };
    let matches_weapon = |(lot, tool): &(OwnedItem<'a>, &'a ItemDefinitionRead)| {
        lot.equipped
            && tool.ranged_weapon.is_some()
            && tool
                .recipe_id
                .as_ref()
                .and_then(|recipe| retained.manufacture.get(recipe))
                .and_then(|method| method.family.as_ref())
                == Some(&practice.family)
    };
    let weapon = if let Some(id) = weapon_id {
        owned_by(physical, retained, &actor.id, id)?
            .and_then(available)
            .filter(matches_weapon)
    } else {
        let mut selected = None;
        for body in state
            .inventory
            .children(&physical.entities, &actor.id, true)
        {
            let lot = project_owned(
                retained,
                &actor.id,
                body,
                false,
                physical.holds.quantity(&body.id),
            )?;
            if let Some(weapon) = available(lot).filter(matches_weapon) {
                selected = Some(weapon);
                break;
            }
        }
        selected
    };
    let accuracy = weapon
        .and_then(|(_, tool)| tool.ranged_weapon.as_ref())
        .map(|weapon| {
            match crate::status::read_attribute(
                actor,
                definition.value(),
                physical.pending_values.as_ref(),
            )? {
                Some(AttributeValue::Number(0.0)) => Ok(Some(weapon.accuracy)),
                Some(AttributeValue::Number(1.0)) => Ok(Some(
                    weapon.accuracy + practice.miss_reduction * (1.0 - weapon.accuracy),
                )),
                _ => Ok::<_, ExecutionError>(None),
            }
        })
        .transpose()?
        .flatten();
    let mut ammunition = None;
    if let Some((_, weapon)) =
        weapon.and_then(|(lot, tool)| Some((lot, tool.ranged_weapon.as_ref()?)))
    {
        let compatible = |(lot, source): &(OwnedItem<'a>, &'a ItemDefinitionRead)| {
            source
                .ammunition
                .as_ref()
                .is_some_and(|ammo| ammo.kind == weapon.ammunition_kind)
                && (lot.available_quantity > 0
                    || existing
                        .and_then(|action| action.ranged.as_ref().map(|aim| (action, aim)))
                        .is_some_and(|(action, aim)| {
                            physical.holds.matches_item(
                                &actor.id,
                                &action.id,
                                &aim.reservation_id,
                                lot.id,
                                1,
                                &source.pin,
                            )
                        }))
        };
        if let Some(id) = ammunition_id {
            ammunition = owned_by(physical, retained, &actor.id, id)?
                .and_then(available)
                .filter(compatible);
        } else {
            state.inventory.visit_owned_until(
                &physical.entities,
                &actor.id,
                &actor.id,
                &mut |body, accessible| {
                    let lot = project_owned(
                        retained,
                        &actor.id,
                        body,
                        accessible,
                        physical.holds.quantity(&body.id),
                    )?;
                    ammunition = available(lot).filter(compatible);
                    Ok(ammunition.is_some())
                },
            )?;
        }
    }
    let another = || {
        physical
            .entities
            .ordered_ids()
            .filter(|id| *id != actor.id.as_str())
            .any(|id| {
                physical
                    .entities
                    .get(id)
                    .and_then(|body| body.actor.as_ref())
                    .and_then(|body| body.action.as_ref())
                    .is_some_and(|action| {
                        action.is_practice_shot()
                            && action.target_id.as_deref() == Some(target.id.as_str())
                    })
            })
    };
    let reason = if weapon.is_none() {
        Some(practice.presentation.missing_tool.as_str())
    } else if ammunition.is_none()
        || accuracy.is_none()
        || target.world_support().is_none()
        || !actor.actively_participates()
        || actor.actor.as_ref().is_none_or(|body| {
            !body.alive
                || body.incapacitated
                || body
                    .combat_ready_at
                    .is_some_and(|ready| ready > physical.header.sim_time)
        })
        || installed
            .capabilities
            .capability_blocked(Some(actor), "actions")?
        || another()
    {
        Some(
            installed
                .ordinary_actions
                .value()
                .not_applicable
                .message
                .as_str(),
        )
    } else {
        None
    };
    Ok(Some(PracticeChoice {
        profile: practice,
        definition,
        weapon,
        ammunition,
        accuracy,
        reason,
    }))
}

pub(crate) fn firing_line(actor: &Entity, target: &Entity) -> Option<SightRay> {
    let mut from = actor.world_position()?;
    let mut to = target.world_position()?;
    from.y += actor.ordinary_body_profile().interaction_height;
    to.y += target.ordinary_body_profile().height / 2.0;
    Some(SightRay { from, to })
}

pub(crate) fn installed_profile<'a>(
    state: &'a SimulationState,
    target: &Entity,
) -> Option<&'a PracticeProfile> {
    profile(state, target).map(|(_, profile)| profile)
}

pub(crate) fn approach_range(
    installed: &crate::simulation::InstalledWorld,
    range: f64,
) -> Result<f64, ExecutionError> {
    let Some(policy) = installed.manifest.ranged_policy.as_ref() else {
        return Ok(range);
    };
    let buffer = policy
        .get("approachBuffer")
        .and_then(serde_json::Value::as_f64)
        .filter(|value| value.is_finite() && *value >= 0.0)
        .ok_or(ExecutionError::Invariant)?;
    let minimum = policy
        .get("minimumApproachRange")
        .and_then(serde_json::Value::as_f64)
        .filter(|value| value.is_finite() && *value > 0.0)
        .ok_or(ExecutionError::Invariant)?;
    Ok(range.min(minimum.max(range - buffer)))
}

/// Practice checks all actual living bodies in the firing segment plus the
/// authored margin. Collision after release has its own physical meaning.
pub(crate) fn body_in_firing_line(
    state: &SimulationState,
    actor: &Entity,
    target: &Entity,
    profile: &PracticeProfile,
) -> Result<bool, ExecutionError> {
    let ray = firing_line(actor, target).ok_or(ExecutionError::InvalidPosition)?;
    let physical = &state.physical;
    let margin = profile.lane_margin;
    let midpoint = crate::spatial::interpolate(ray.from, ray.to, 0.5);
    let radius = crate::spatial::distance(ray.from, ray.to) / 2.0
        + physical.bodies.maximum_extent()
        + margin;
    Ok(physical.bodies.any_body(midpoint, radius, |handle| {
        let Some(body) = physical.entities.resolve(handle).filter(|body| {
            body.id != actor.id
                && body.actively_participates()
                && body.actor.as_ref().is_some_and(|body| body.alive)
        }) else {
            return false;
        };
        let Some(point) = body.world_position() else {
            return false;
        };
        let shape = body.ordinary_body_profile();
        crosses_cylinder(ray.from, ray.to, point, shape.radius + margin, shape.height)
    }))
}

fn crosses_cylinder(
    from: crate::state::Point,
    to: crate::state::Point,
    base: crate::state::Point,
    radius: f64,
    height: f64,
) -> bool {
    let (dx, dy, dz) = (to.x - from.x, to.y - from.y, to.z - from.z);
    let (x, y, z) = (from.x - base.x, from.y - base.y, from.z - base.z);
    let a = dx * dx + dz * dz;
    let b = x * dx + z * dz;
    let c = x * x + z * z - radius * radius;
    let (mut enter, mut exit) = (0.0_f64, 1.0_f64);
    if a == 0.0 {
        if c > 0.0 {
            return false;
        }
    } else {
        let discriminant = b * b - a * c;
        if discriminant < 0.0 {
            return false;
        }
        let span = discriminant.sqrt();
        enter = enter.max((-b - span) / a);
        exit = exit.min((-b + span) / a);
    }
    if dy == 0.0 {
        if y < 0.0 || y > height {
            return false;
        }
    } else {
        let (low, high) = (-y / dy, (height - y) / dy);
        enter = enter.max(low.min(high));
        exit = exit.min(low.max(high));
    }
    enter <= exit
}

/// Admit only the exact installed capability, physical life, owned tool and
/// one matching held lot. A route may wait and reload before it reaches range.
pub(crate) fn valid_saved(
    physical: &crate::simulation::PhysicalState,
    installed: &crate::simulation::InstalledWorld,
    entity: &Entity,
    action: &Action,
) -> bool {
    let Some((aim, pin, target, tool, ammunition)) = action
        .ranged
        .as_ref()
        .zip(action.competence_pin.as_ref())
        .zip(action.target_id.as_deref())
        .zip(action.weapon_item_id.as_deref())
        .zip(action.ammo_item_id.as_deref())
        .map(|((((aim, pin), target), tool), ammunition)| (aim, pin, target, tool, ammunition))
    else {
        return false;
    };
    let Some(target) = physical.entities.get(target) else {
        return false;
    };
    let Some(definition) = target
        .practice_target
        .as_ref()
        .and_then(|target| installed.attributes.get(&target.attribute_id))
    else {
        return false;
    };
    let Some(profile) = definition.value().practice.as_ref() else {
        return false;
    };
    let tool = owned_by(physical, &installed.retained, &entity.id, tool)
        .ok()
        .flatten();
    let ammo = owned_by(physical, &installed.retained, &entity.id, ammunition)
        .ok()
        .flatten();
    let tool_type = tool.and_then(|item| installed.retained.items.get(item.definition_id));
    let ammo_type = ammo.and_then(|item| installed.retained.items.get(item.definition_id));
    let compatible = tool_type.zip(ammo_type).is_some_and(|(tool, ammo)| {
        tool.pin == aim.tool
            && ammo.pin == aim.ammunition
            && tool
                .ranged_weapon
                .as_ref()
                .zip(ammo.ammunition.as_ref())
                .is_some_and(|(weapon, ammo)| weapon.ammunition_kind == ammo.kind)
            && tool
                .recipe_id
                .as_ref()
                .and_then(|recipe| installed.retained.manufacture.get(recipe))
                .and_then(|method| method.family.as_ref())
                == Some(&profile.family)
    });
    definition.pin() == pin
        && tool.is_some_and(|tool| tool.equipped)
        && compatible
        && action.total_seconds == profile.windup_seconds
        && action.remaining_seconds > 0.0
        && action.remaining_seconds <= action.total_seconds
        && matches!(action.stage.as_str(), "approaching" | "working")
        && entity.physical_life() == Some(aim.source_life)
        && !aim.manual
        && !aim.ready
        && aim.aim_point.is_none()
        && aim.aim_point_subject.is_none()
        && aim.observed_motion.is_none()
        && aim
            .aim_target
            .as_ref()
            .is_some_and(|aimed| aimed.life == 0 && aimed.id == target.id)
        && aim.reservation_id == super::hold_id(&action.id)
        && physical.holds.matches_item(
            &entity.id,
            &action.id,
            &aim.reservation_id,
            ammunition,
            1,
            &aim.ammunition,
        )
}
