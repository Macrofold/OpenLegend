//! Canonical compact received changes and selected public proof expansion.
//! Source/frame tables save repeated metadata; their indices grant no knowledge.
//! The owner and original member ordinals survive packing and selection.

mod codec;
mod types;
pub use codec::*;
pub use types::*;
