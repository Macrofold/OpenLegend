//! Funded display data and defaults for current account preferences.

use crate::store::{NarrationBanner, StoreError};
use openlegend_simulation::host::ByteReservation;
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerProfile {
    id: String,
    revision: u64,
    preferences: Preferences,
    #[serde(skip)]
    pub(super) narrator: Option<NarrationBanner>,
    #[serde(skip)]
    _custody: ByteReservation,
}

#[derive(PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Preferences {
    reveal_mode: RevealMode,
    reveal_radius: f64,
    reveal_strength: f64,
    show_unavailable_actions: bool,
    pause_when_hidden: bool,
    narrator_voice: Voice,
}

#[derive(Clone, Copy, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
enum RevealMode {
    Off,
    Player,
    Nearby,
}

#[derive(Clone, Copy, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
pub(crate) enum Voice {
    Restrained,
    Lyrical,
    Wry,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Reveal {
    reveal_mode: Option<RevealMode>,
    reveal_radius: Option<f64>,
    reveal_strength: Option<f64>,
}

impl Preferences {
    pub(crate) fn new(
        reveal: Reveal,
        show_unavailable_actions: bool,
        pause_when_hidden: bool,
        narrator_voice: Voice,
    ) -> Self {
        Self {
            reveal_mode: reveal.reveal_mode.unwrap_or(RevealMode::Nearby),
            reveal_radius: reveal.reveal_radius.unwrap_or(6.0),
            reveal_strength: reveal.reveal_strength.unwrap_or(0.7),
            show_unavailable_actions,
            pause_when_hidden,
            narrator_voice,
        }
    }
}

pub(crate) fn narrator_voice(stored: Option<&str>) -> Result<Voice, StoreError> {
    Ok(stored
        .map(serde_json::from_str::<Option<Voice>>)
        .transpose()
        .map_err(|_| StoreError::InvalidRecord)?
        .flatten()
        .unwrap_or(Voice::Restrained))
}

impl PlayerProfile {
    pub(crate) fn new(
        id: String,
        revision: u64,
        preferences: Preferences,
        narrator: Option<NarrationBanner>,
        custody: ByteReservation,
    ) -> Self {
        Self {
            id,
            revision,
            preferences,
            narrator,
            _custody: custody,
        }
    }

    pub(crate) fn matches(&self, other: &Self) -> bool {
        self.id == other.id
            && self.revision == other.revision
            && self.preferences == other.preferences
    }
}
