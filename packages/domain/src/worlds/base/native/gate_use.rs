//! Bundled-world wording for the exact physical gate operations.
use crate::worlds::InstalledActionMessage as Message;
use serde::Deserialize;
use std::sync::LazyLock;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct GateCopy {
    pub unavailable: Message,
    pub changed: Message,
    pub permission: Message,
    pub not_visible: Message,
    pub competing: Message,
    pub open: Message,
    pub barred: Message,
    pub blocked: Message,
    pub access: Message,
    pub unchanged: Message,
    pub operated_event: String,
    pub checked_event: String,
    pub checked_clause: String,
    pub completed_prefix: String,
}

pub(crate) fn copy() -> &'static GateCopy {
    static COPY: LazyLock<GateCopy> = LazyLock::new(|| {
        serde_json::from_str(include_str!("../gate-use-copy.json")).expect("authored gate wording")
    });
    &COPY
}
