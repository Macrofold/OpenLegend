//! Stand-alone game-server application owners. They link the same simulation
//! and worker admission as the addon and never depend on the Node bridge.
pub mod access_http;
mod activity_format;
pub mod authority;
pub mod boot;
pub mod command_epoch;
mod control_format;
mod embodiment;
pub mod game_clock;
pub mod language;
pub mod launch;
pub mod live_save;
mod network;
pub mod oidc;
mod operation_format;
mod player_command;
mod player_http;
pub mod player_events;
pub mod player_references;
pub mod player_scene;
mod presence;
mod provider_transport;
pub mod spatial;
pub mod store;
mod wire;
pub mod world;
mod world_input;
