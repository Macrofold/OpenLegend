//! Stand-alone projection of one already permitted player and the acquired
//! bodies around them. This layer cannot read another actor's live state.

use openlegend_simulation::host::CapacityError;
use serde::Deserialize;
use std::{error::Error, fmt};

mod observed;
mod self_view;
pub use observed::{ObservedPolicy, PreparedContacts, prepare_contacts};
pub use self_view::{OwnPolicy, PreparedSelf, prepare_self};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PlayerScenePolicy {
    pub self_view: OwnPolicy,
    pub observed: ObservedPolicy,
}

#[derive(Debug)]
pub enum SceneError {
    Capture,
    Capacity,
    Unsupported(&'static str),
    Encoding(serde_json::Error),
}

impl fmt::Display for SceneError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Capture => f.write_str("The player scene differs from its permitted read"),
            Self::Capacity => f.write_str("The player scene exceeded its byte allowance"),
            Self::Unsupported(family) => write!(f, "The installed player scene requires {family}"),
            Self::Encoding(error) => error.fmt(f),
        }
    }
}

impl Error for SceneError {}
impl From<CapacityError> for SceneError {
    fn from(_: CapacityError) -> Self {
        Self::Capacity
    }
}
impl From<serde_json::Error> for SceneError {
    fn from(value: serde_json::Error) -> Self {
        Self::Encoding(value)
    }
}
