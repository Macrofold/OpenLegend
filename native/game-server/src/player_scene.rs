//! Stand-alone projection of one already permitted player and the acquired
//! bodies around them. This layer cannot read another actor's live state.

use openlegend_simulation::host::CapacityError;
use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;
use std::sync::Arc;
use std::{error::Error, fmt};

pub(crate) mod delta;
mod observed;
mod self_view;
mod inventory_page;
pub(crate) use inventory_page::{InventoryPageError, InventoryPageRequest};
pub(crate) use observed::EntityFields;
pub use observed::{ObservedEntity, ObservedPolicy, PreparedContacts, prepare_contacts};
pub use self_view::{Marker, OwnPolicy, PlayerBodyView, PreparedSelf, prepare_self};

#[derive(Clone, Deserialize, Serialize)]
#[serde(transparent)]
struct PublicArt(Arc<RawValue>);

impl PartialEq for PublicArt {
    fn eq(&self, other: &Self) -> bool {
        Arc::ptr_eq(&self.0, &other.0) || self.0.get() == other.0.get()
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PlayerScenePolicy {
    pub self_view: OwnPolicy,
    pub observed: ObservedPolicy,
}

impl PlayerScenePolicy {
    pub(crate) fn encode_inventory_bindings(
        &self,
        items: &[openlegend_simulation::install::OwnedItem<'_>],
        budget: &openlegend_simulation::host::ByteBudget,
    ) -> Result<axum::body::Bytes, crate::wire::WireError> {
        #[derive(Serialize)]
        struct Binding<'a> {
            #[serde(flatten)]
            item: openlegend_simulation::install::OwnedItem<'a>,
            #[serde(skip_serializing_if = "Option::is_none")]
            art: Option<&'a PublicArt>,
        }
        #[derive(Serialize)]
        struct View<'a> {
            ok: bool,
            items: &'a [Binding<'a>],
        }
        let _custody = budget
            .reserve(items.len() * std::mem::size_of::<Binding<'_>>())
            .map_err(|_| crate::wire::WireError::Capacity)?;
        let values: Vec<_> = items
            .iter()
            .map(|item| Binding {
                item: *item,
                art: self.observed.item_art.get(item.definition_id),
            })
            .collect();
        crate::wire::encode(
            &View {
                ok: true,
                items: &values,
            },
            b"",
            b"",
            budget,
        )
    }
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
