//! Stand-alone game-server application owners. They link the same simulation
//! and worker admission as the addon and never depend on the Node bridge.
pub mod access_http;
mod activity_format;
pub mod authority;
pub mod boot;
mod control_format;
mod operation_format;
pub mod spatial;
pub mod store;
pub mod world;
