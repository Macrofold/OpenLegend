//! Read the current practice choice through the installed method and stock.
//! The same selection serves the permitted menu and the candidate that owns
//! preparation. Geometry and the final release still bind the current cut.

use crate::execution::ExecutionError;
use crate::install::{ItemDefinitionRead, OwnedItem, VerifiedDefinition, owned_by};
use crate::simulation::{InstalledWorld, SimulationState};
use crate::state::{Action, Entity, PracticeProgress};
use crate::status::{AttributeDefinition, PracticeProfile};
use crate::values::DefinitionPin;

#[derive(Clone, Copy)]
pub(crate) struct PracticeHandling {
    pub rank: u64,
    pub accuracy: f64,
}

pub(crate) struct PracticeChoice<'a> {
    pub profile: &'a PracticeProfile,
    pub definition: &'a VerifiedDefinition<AttributeDefinition>,
    pub weapon: Option<(OwnedItem<'a>, &'a ItemDefinitionRead)>,
    pub ammunition: Option<(OwnedItem<'a>, &'a ItemDefinitionRead)>,
    pub handling: Option<PracticeHandling>,
    pub reason: Option<&'a str>,
}

fn tool_family<'a>(
    world: &'a InstalledWorld,
    tool: &ItemDefinitionRead,
) -> Option<&'a DefinitionPin> {
    world
        .retained
        .manufacture
        .get(tool.recipe_id.as_deref()?)?
        .family
        .as_ref()
}

fn handling(
    progress: &PracticeProgress,
    profile: &PracticeProfile,
    base_accuracy: f64,
) -> PracticeHandling {
    let rank = progress.rank(profile);
    PracticeHandling {
        rank,
        accuracy: if rank == 1 {
            base_accuracy + profile.miss_reduction * (1.0 - base_accuracy)
        } else {
            base_accuracy
        },
    }
}

/// At ordinary launch, resolve the exact tool family against installed
/// practice definitions and read the actor's current rank once. A world with
/// no matching skill or an inapplicable actor keeps the weapon's own handling.
pub(crate) fn release_handling<'a>(
    state: &'a SimulationState,
    actor: &Entity,
    tool: &DefinitionPin,
    base_accuracy: f64,
) -> Option<(&'a VerifiedDefinition<AttributeDefinition>, PracticeHandling)> {
    let progress = actor.actor.as_ref()?.practice.as_ref()?;
    let item = state.installed.retained.items.get(&tool.id)?;
    let family = tool_family(&state.installed, item)?;
    let (definition, profile) = state.installed.attributes.values().find_map(|definition| {
        let profile = definition.value().practice.as_ref()?;
        (&profile.family == family).then_some((definition, profile))
    })?;
    let progress = progress.get(&definition.value().id)?;
    Some((definition, handling(progress, profile, base_accuracy)))
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
    let weapon = super::loadout::weapon(state, actor, weapon_id, false, |tool| {
        tool_family(installed, tool) == Some(&practice.family)
    })?;
    let ranged = weapon.and_then(|(_, tool)| tool.ranged_weapon.as_ref());
    let handling = ranged.and_then(|weapon| {
        let progress = actor.actor.as_ref()?.practice.as_ref()?.get(&definition.value().id)?;
        Some(handling(progress, practice, weapon.accuracy))
    });
    let ammunition = match ranged {
        Some(weapon) => super::loadout::ammunition(
            state,
            actor,
            ammunition_id,
            &weapon.ammunition_kind,
            existing.map_or(
                super::loadout::StockAdmission::Free,
                super::loadout::StockAdmission::CurrentHold,
            ),
        )?,
        None => None,
    };
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
        || handling.is_none()
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
        handling,
        reason,
    }))
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
    Ok(installed
        .manifest
        .ranged_policy
        .as_ref()
        .map_or(range, |policy| policy.approach_range(range)))
}

/// Practice checks all actual living bodies in the firing segment plus the
/// authored margin. Collision after release has its own physical meaning.
pub(crate) fn body_in_firing_line(
    state: &SimulationState,
    actor: &Entity,
    target: &Entity,
    profile: &PracticeProfile,
) -> Result<bool, ExecutionError> {
    let ray = super::firing_line(actor, target).ok_or(ExecutionError::InvalidPosition)?;
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
            && tool_family(installed, tool) == Some(&profile.family)
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
