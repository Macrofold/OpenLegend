//! The same bundled character catalogue used by creation and creator editing.
use crate::state::CharacterTrait;
use serde::Deserialize;
use std::sync::LazyLock;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct TraitCatalogue {
    pub max_selected: usize,
    pub choices: Vec<CharacterTrait>,
}
pub(crate) fn catalogue(profile: &crate::install::WorldProfile) -> Option<&'static TraitCatalogue> {
    static CATALOGUE: LazyLock<TraitCatalogue> = LazyLock::new(|| {
        serde_json::from_str(include_str!("../config/traits.json"))
            .expect("bundled trait catalogue")
    });
    match (profile.id.as_str(), profile.version) {
        ("grounded-wilderness", 1) => Some(&CATALOGUE),
        _ => None,
    }
}
