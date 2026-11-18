//! Application wording for a control operation whose world transition already
//! owns its own protected candidate. This formatter cannot set time or speed.

use crate::world::WorldError;
use openlegend_simulation::{encoding::json_record, text::JsText};
use serde::Deserialize;
use serde_json::value::RawValue;
use std::sync::OnceLock;

#[derive(Deserialize)]
struct Request {
    paused: bool,
    speed: f64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Words<'a> {
    paused: &'a str,
    running_prefix: &'a str,
    running_suffix: &'a str,
}

pub(crate) fn format(request: &RawValue) -> Result<JsText, WorldError> {
    static WORDS: OnceLock<Option<Words<'static>>> = OnceLock::new();
    let words = WORDS
        .get_or_init(|| {
            serde_json::from_str(include_str!(
                "../../../apps/server/src/world-control-display.json"
            ))
            .ok()
        })
        .as_ref()
        .ok_or(WorldError::ProviderKind)?;
    let request: Request =
        serde_json::from_str(request.get()).map_err(|_| WorldError::ProviderKind)?;
    if request.paused {
        return Ok(words.paused.into());
    }
    let speed = json_record(&request.speed).map_err(|_| WorldError::ProviderKind)?;
    Ok(format!("{}{speed}{}", words.running_prefix, words.running_suffix).into())
}
