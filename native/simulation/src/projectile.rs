//! A projectile is physical after release, even if its source turns away or
//! leaves. Its measured travel and terminal event belong to the world clock.

mod aim;
mod definition;
pub(crate) mod loadout;
mod policy;
pub(crate) mod practice;
mod state;
pub use aim::{RuntimeRangedMode, RuntimeRangedTarget};
pub(crate) use aim::{AimedLife, RangedAim, RangedTarget};
pub(crate) use definition::{Ammunition, RangedWeapon};
pub(crate) use policy::RangedPolicy;
pub(crate) use state::{ContactPolicy, FlightPosition, FundedProjectile, ProjectileFlight, ProjectileState, SourceController};

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
        from, to: target_point(target)?,
    })
}

pub(crate) fn approach_to_shot(
    actor: &crate::state::Entity,
    target: &crate::state::Entity,
    reach: f64,
    budget: &crate::host::ByteBudget,
) -> Result<(crate::geometry::RouteQuery, crate::host::ByteReservation), crate::execution::ExecutionError> {
    let goal = target_point(target).ok_or(crate::execution::ExecutionError::InvalidPosition)?;
    crate::native_controller::feeding::approach_to(actor, target, reach, goal, budget)
}
