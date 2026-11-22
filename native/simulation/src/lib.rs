//! Native simulation ownership primitives.
//!
//! Gameplay installation is deliberately not exported until the selected family
//! closure and actual consumers are converted. A host handle is not a second
//! implementation of a world or permission to run an unsupported family.

pub mod activity;
pub mod administration;
pub mod appraisals;
pub mod attention;
pub mod body;
pub mod capture;
mod casts;
mod food_preparation;
mod fire_care;
mod hearth;
mod item_holds;
pub mod cognition;
pub mod commands;
pub mod conditions;
pub mod construction_gather;
mod construction_seed;
pub use construction_seed::InitialConstructionGrant;
mod contact;
pub mod encoding;
pub mod events;
pub mod execution;
pub mod experience;
mod flight;
pub mod gathering;
pub mod geometry;
pub mod handover;
mod stock_transfer;
pub mod host;
pub mod identity;
pub mod install;
pub(crate) mod knowledge;
pub mod language;
pub mod movement;
mod manufacturing;
mod consumption;
mod ground_items;
pub mod narration;
pub mod native_controller;
pub mod native_danger;
pub mod native_refuge;
pub mod native_response;
pub(crate) mod outings;
pub(crate) mod participation;
pub(crate) mod plans;
#[cfg(feature = "profile-campaign")]
pub mod profile;
mod profile_macros;
pub mod received;
pub mod reception;
pub mod records;
pub(crate) mod response;
pub mod runtime;
pub mod simulation;
pub mod spatial;
pub mod speech;
pub mod state;
pub mod status;
pub mod text;
pub(crate) mod time;
pub mod weather;
pub mod values;
pub mod work;
pub mod worlds;

pub(crate) mod restore;
