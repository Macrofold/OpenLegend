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
pub mod cognition;
pub mod commands;
pub mod conditions;
pub mod encoding;
pub mod events;
pub mod execution;
pub mod experience;
pub mod geometry;
pub mod host;
pub mod identity;
pub mod install;
pub mod language;
pub(crate) mod knowledge;
pub mod movement;
pub mod narration;
pub mod native_controller;
pub mod native_danger;
pub mod native_refuge;
pub mod native_response;
pub(crate) mod plans;
pub mod received;
pub mod reception;
pub mod records;
pub mod runtime;
pub(crate) mod response;
pub mod simulation;
pub mod spatial;
pub mod speech;
pub mod state;
pub mod status;
pub mod text;
pub(crate) mod time;
pub mod values;
pub mod work;
pub mod worlds;
