//! Application wording for a control operation whose world transition already
//! owns its own protected candidate. This formatter cannot set time or speed.

use crate::world::WorldError;
use openlegend_simulation::{
    encoding::json_record,
    geometry::GeometryBinding,
    host::ByteBudget,
    runtime::{LocalFormat, RuntimeProviderInput},
    text::JsText,
};
use openlegend_world_host::pool::HostError;
use serde::Deserialize;
use std::sync::OnceLock;

const WORDS_JSON: &str = include_str!("../../../apps/server/src/world-control-display.json");

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Words<'a> {
    paused: &'a str,
    running_prefix: &'a str,
    running_suffix: &'a str,
}

pub(crate) fn answer(
    binding: GeometryBinding,
    paused: bool,
    speed: f64,
    budget: &ByteBudget,
) -> Result<RuntimeProviderInput, WorldError> {
    static WORDS: OnceLock<Option<Words<'static>>> = OnceLock::new();
    let words = WORDS
        .get_or_init(|| serde_json::from_str(WORDS_JSON).ok())
        .as_ref()
        .ok_or(WorldError::ProviderKind)?;
    // Cover the word storage, temporary numeric rendering and answer wrapper
    // before constructing any of them. The answer retains only its own bytes.
    let workspace = budget
        .reserve(3 * WORDS_JSON.len() + 256 + size_of::<LocalFormat>())
        .map_err(HostError::from)?;
    let text = if paused {
        JsText::from(words.paused)
    } else {
        let speed = json_record(&speed).map_err(|_| WorldError::ProviderKind)?;
        format!("{}{speed}{}", words.running_prefix, words.running_suffix).into()
    };
    Ok(RuntimeProviderInput::local_format(
        binding,
        LocalFormat::Control(text),
        workspace,
    )?)
}
