//! A projectile is physical after release, even if its source turns away or
//! leaves. Its measured travel and terminal event belong to the world clock.

mod aim;
mod definition;
pub(crate) mod loadout;
pub(crate) mod point_review;
pub(crate) mod observed_motion;
pub(crate) mod leading;
mod policy;
pub(crate) mod practice;
mod state;
pub(crate) use aim::{AimedLife, ObservedMotion, RangedAim, RangedTarget};
pub use aim::{RuntimeRangedMode, RuntimeRangedTarget};
pub(crate) use definition::{Ammunition, RangedWeapon};
pub(crate) use policy::RangedPolicy;
pub(crate) use state::{
    ContactPolicy, FlightPosition, FundedProjectile, ProjectileFlight, ProjectileState,
    SourceController,
};

/// The hold uses the exact canonical action identity in both hosts.
pub(crate) fn hold_id(action_id: &str) -> String {
    format!("{action_id}:projectile")
}

/// The route and the release select the same physical point on the subject.
pub(crate) fn target_point(target: &crate::state::Entity) -> Option<crate::state::Point> {
    let mut point = target.world_position()?;
    point.y += target.ordinary_body_profile().height / 2.0;
    Some(point)
}

pub(crate) fn firing_line(
    actor: &crate::state::Entity,
    target: &crate::state::Entity,
) -> Option<crate::geometry::SightRay> {
    let mut from = actor.world_position()?;
    from.y += actor.ordinary_body_profile().interaction_height;
    Some(crate::geometry::SightRay {
        from,
        to: target_point(target)?,
    })
}

pub(crate) fn approach_to_shot(
    actor: &crate::state::Entity,
    target: &crate::state::Entity,
    reach: f64,
    budget: &crate::host::ByteBudget,
) -> Result<
    (crate::geometry::RouteQuery, crate::host::ByteReservation),
    crate::execution::ExecutionError,
> {
    let goal = target_point(target).ok_or(crate::execution::ExecutionError::InvalidPosition)?;
    crate::native_controller::feeding::approach_to(actor, target, reach, goal, budget)
}

/// A covered point can use only the exact current body already checked by
/// vision. This test never supplies visibility or changes projectile collision.
pub(crate) fn inside_current_body(
    body: &crate::state::Entity,
    point: crate::state::Point,
    budget: &crate::host::ByteBudget,
) -> Result<bool, crate::execution::ExecutionError> {
    let Some(ground) = body.world_position() else {
        return Ok(false);
    };
    let profile = crate::status::effective_body_profile(body, budget)?;
    Ok(crate::spatial::moving_point_contact(
        point,
        point,
        ground,
        ground,
        crate::spatial::Extent::from(&*profile),
    )
    .is_some())
}

/// Hunt is a world-authored purpose for this exact kind of quarry. The
/// ordinary shot remains available for other eligible bodies.
pub(crate) fn may_hunt(
    installed: &crate::simulation::InstalledWorld,
    body: &crate::state::Entity,
) -> bool {
    let occurrences = installed.occurrence_rules.value();
    occurrences.response.offers.hunting.methods.ranged_weapon
        && occurrences.ranged.as_ref().is_some_and(|rules| {
            rules.menu.permits_hunt(body.actor.as_ref().and_then(|actor| actor.species.as_deref()))
        })
}

pub(crate) fn selected_body<'a>(
    state: &'a crate::simulation::SimulationState,
    source: &crate::state::Entity,
    identity: (&str, u64),
) -> Option<&'a crate::state::Entity> {
    let (target, life) = identity;
    let policy = state.installed.manifest.ranged_policy.as_ref()?;
    let effect = state
        .installed
        .body_policy
        .as_ref()?
        .value()
        .combat
        .as_ref()?;
    let source_actor = source.actor.as_ref()?;
    state.physical.entities.get(target).filter(|body| {
        body.id != source.id
            && body.physical_life() == Some(life)
            && policy.permits(body)
            && body.actor.as_ref().is_some_and(|target| {
                effect.permits_target(
                    &source_actor.controller,
                    &target.controller,
                    source_actor.controller == "player",
                )
            })
    })
}
