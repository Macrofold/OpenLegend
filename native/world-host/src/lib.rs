//! Bounded process compute and per-world dispatch shared by both game hosts.
//! Real time and worker lifecycle stay outside the deterministic simulation.
mod dispatch;
pub use dispatch::{DispatchHost, DispatchWorld, SerialDispatch, submit_world, try_submit_world};
pub mod pool;

#[cfg(feature = "profile-campaign")]
pub use dispatch::{clear_profile_dispatch, prepare_profile_dispatch};
