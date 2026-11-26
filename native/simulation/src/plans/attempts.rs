//! Private unlisted intentions are bounded actor state, never executable work
//! or permission to dispatch a paid interpreter.
use super::*;
mod mutation;
mod signature;
pub(crate) use signature::resolution_signature;
mod types;
pub(crate) use mutation::{
    CompletedIntentEdit, DeferredIntent, defer_attempt, resolve_attempt, withdraw_attempt,
};
pub(super) use types::validate_installed;
pub use types::{ActionResolution, IntentSlots, PendingIntent};
