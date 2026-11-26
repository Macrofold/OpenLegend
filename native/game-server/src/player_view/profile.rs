//! Funded display data and defaults for current account preferences.

use crate::store::StoreError;
use openlegend_simulation::host::ByteReservation;
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerProfile {
    id: String,
    revision: u64,
    preferences: Preferences,
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

#[derive(Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Reveal {
    #[serde(skip_serializing_if = "Option::is_none")]
    reveal_mode: Option<RevealMode>,
    #[serde(skip_serializing_if = "Option::is_none")]
    reveal_radius: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    reveal_strength: Option<f64>,
}

/// Settings controls served by the stand-alone browser. Presence remains
/// with the existing clock/presence owner, outside this display mutation.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct DisplayPreferencesPatch {
    reveal_mode: Option<RevealMode>,
    reveal_radius: Option<f64>,
    reveal_strength: Option<f64>,
    narrator_voice: Option<Voice>,
}

impl DisplayPreferencesPatch {
    pub(crate) fn parts(self) -> Option<(Option<Reveal>, Option<Voice>)> {
        if self
            .reveal_radius
            .is_some_and(|value| !(2.0..=12.0).contains(&value))
            || self
                .reveal_strength
                .is_some_and(|value| !(0.2..=0.95).contains(&value))
        {
            return None;
        }
        let reveal = (self.reveal_mode.is_some()
            || self.reveal_radius.is_some()
            || self.reveal_strength.is_some())
        .then_some(Reveal {
            reveal_mode: self.reveal_mode,
            reveal_radius: self.reveal_radius,
            reveal_strength: self.reveal_strength,
        });
        (reveal.is_some() || self.narrator_voice.is_some()).then_some((reveal, self.narrator_voice))
    }
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
        custody: ByteReservation,
    ) -> Self {
        Self {
            id,
            revision,
            preferences,
            _custody: custody,
        }
    }

}
