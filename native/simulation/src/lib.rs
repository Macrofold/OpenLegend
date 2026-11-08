//! Native simulation ownership primitives.
//!
//! Gameplay installation is deliberately not exported until the selected family
//! closure and actual consumers are converted. A host handle is not a second
//! implementation of a world or permission to run an unsupported family.

pub mod activity;
pub mod attention;
pub mod commands;
pub mod encoding;
pub mod events;
pub mod execution;
pub mod experience;
pub mod geometry;
pub mod host;
pub mod identity;
pub mod install;
pub mod movement;
pub mod narration;
pub mod native_controller;
pub mod native_danger;
pub mod native_refuge;
pub mod native_response;
pub mod received;
pub mod reception;
pub mod records;
pub mod simulation;
pub mod spatial;
pub mod state;
pub mod status;
pub mod values;
pub mod work;
pub mod worlds;
