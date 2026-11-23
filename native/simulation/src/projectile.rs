//! A projectile is physical after release, even if its source turns away or
//! leaves. Its measured travel and terminal event belong to the world clock.

mod aim;
mod definition;
pub(crate) mod practice;
mod state;
pub(crate) use aim::{AimedLife, RangedAim};
pub(crate) use definition::{Ammunition, RangedWeapon};
pub(crate) use state::{ContactPolicy, FlightPosition, FundedProjectile, ProjectileFlight, ProjectileState, SourceController};

/// The hold uses the exact canonical action identity in both hosts.
pub(crate) fn hold_id(action_id: &str) -> String {
    format!("{action_id}:projectile")
}
