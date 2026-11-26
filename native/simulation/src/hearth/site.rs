//! The finite site queries use the accepted physical index. Only nearby
//! bodies enter the prepared volume, including the builder when they occupy it.
use super::Definition;
use crate::construction_gather::ConstructionSite;
use crate::execution::{CoreMutation, ExecutionError};
use crate::geometry::{PlacementStance, PlacementStances, PlacementVolume, SightRay};
use crate::host::{ByteBudget, ByteReservation};
use crate::reception::{horizontal_cone, vision_parameters};
use crate::simulation::InstalledWorld;
use crate::state::{Bounds, Entity, SurfacePoint};
use std::mem::size_of;

pub(crate) fn grant_bounds(site: &SurfacePoint, definition: &Definition) -> ConstructionSite {
    let radius = definition.radius_metres;
    ConstructionSite {
        surface_id: site.surface_id.clone(),
        min_x: site.x - radius,
        max_x: site.x + radius,
        min_z: site.z - radius,
        max_z: site.z + radius,
    }
}

pub(crate) fn sight_to_site(
    world: &InstalledWorld,
    actor: &Entity,
    site: &SurfacePoint,
    budget: &ByteBudget,
) -> Result<Option<SightRay>, ExecutionError> {
    if !actor.actively_participates()
        || world
            .capabilities
            .capability_blocked(Some(actor), "perception")?
    {
        return Ok(None);
    }
    let from = actor
        .world_position()
        .ok_or(ExecutionError::InvalidPosition)?;
    let to = site.point();
    let sense = vision_parameters(world, actor);
    if sense.radius <= 0.0
        || crate::spatial::distance(from, to) > sense.radius
        || !horizontal_cone(from, actor.spatial.heading, sense.field_of_view, to)
    {
        return Ok(None);
    }
    let mut eye = from;
    eye.y += crate::status::effective_body_profile(actor, budget)?.eye_height;
    Ok(Some(SightRay { from: eye, to }))
}

/// Fund only the nearby input bodies. The placement volume includes the builder;
/// the stance clearance compares the builder's candidate body with other bodies.
pub(crate) fn placement_geometry(
    core: &mut CoreMutation<'_>,
    actor_id: &str,
    definition: &Definition,
    site: &SurfacePoint,
    exact: Option<PlacementStance>,
    budget: &ByteBudget,
) -> Result<(PlacementVolume, PlacementStances, ByteReservation), ExecutionError> {
    let physical = &core.state.physical;
    let actor = physical
        .entities
        .get(actor_id)
        .ok_or(ExecutionError::MissingActor)?;
    let point = site.point();
    let index = &physical.bodies;
    let body = actor.body_profile();
    let clearance = definition.clearance_height_metres;
    let footprint = definition.radius_metres;
    let stance_reach = footprint
        + (std::f64::consts::SQRT_2 + 1.0) * body.radius
        + 3.0 * core.state.installed.movement_settings.skin;
    let envelope = stance_reach.max(body.height).max(clearance) + index.maximum_extent();
    let (count, _) = index.candidate_capacity(point, envelope);
    let per_candidate =
        6 * size_of::<(&str, crate::state::EntityHandle)>() + 2 * size_of::<Bounds>();
    let body_id = actor.ordinary_body_profile().id.len();
    let from = actor
        .supported_position()
        .ok_or(ExecutionError::InvalidPosition)?;
    let fixed = 3 * site.surface_id.len()
        + from.surface_id.len()
        + body_id
        + size_of::<PlacementVolume>()
        + size_of::<PlacementStances>()
        + size_of::<SightRay>();
    let mut custody = budget.reserve(
        count
            .checked_mul(per_candidate)
            .and_then(|bytes| bytes.checked_add(fixed))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let candidates = index.candidates_metered(point, envelope, &mut core.journal.meters)?;
    let mut site_bodies = Vec::new();
    let mut stance_bodies = Vec::new();
    site_bodies
        .try_reserve_exact(count)
        .map_err(|_| ExecutionError::Capacity)?;
    stance_bodies
        .try_reserve_exact(count)
        .map_err(|_| ExecutionError::Capacity)?;
    for (_, handle) in candidates {
        let entity = physical
            .entities
            .resolve(handle)
            .ok_or(ExecutionError::Invariant)?;
        if entity.assembly.is_some() {
            continue;
        }
        let bounds = crate::movement::body_space(entity, &core.state.installed.status_policy)
            .map_err(|_| ExecutionError::UnsupportedFamily)?;
        let overlaps = |radius: f64| {
            bounds.max.x >= point.x - radius
                && bounds.min.x <= point.x + radius
                && bounds.max.z >= point.z - radius
                && bounds.min.z <= point.z + radius
        };
        if overlaps(stance_reach) && entity.id != actor_id {
            stance_bodies.push(bounds.clone());
        }
        if overlaps(footprint) && bounds.max.y >= point.y && bounds.min.y <= point.y + clearance {
            site_bodies.push(bounds);
        }
    }
    custody.resize(
        fixed + (site_bodies.capacity() + stance_bodies.capacity()) * size_of::<Bounds>(),
    )?;
    let site_query = PlacementVolume {
        site: site.clone(),
        radius: footprint,
        clearance,
        maximum_height_difference: definition.maximum_height_difference_metres,
        terrain_only: definition.terrain_only,
        bodies: site_bodies,
    };
    let stand_query = PlacementStances {
        site: site.clone(),
        from,
        body: body.into_owned(),
        radius: footprint,
        height: definition.height_metres,
        interaction_height: crate::status::effective_body_profile(actor, budget)?
            .interaction_height,
        reach: core.state.installed.retained.item_handling_read.reach,
        bodies: stance_bodies,
        exact,
    };
    Ok((site_query, stand_query, custody))
}
