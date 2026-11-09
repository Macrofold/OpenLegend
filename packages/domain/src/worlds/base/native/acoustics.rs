//! The installed wilderness air-acoustics family. Decibel reference, speech
//! levels and propagation law stay selected world behavior, not engine defaults.

use crate::values::{deserialize_nullable, deserialize_safe_integer};
use crate::worlds::base_observed::SpeechVolume;
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub enum AcousticReference {
    #[serde(rename = "air-spl-20uPa")]
    AirSpl20MicroPa,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SourceLevels {
    whisper: f64,
    normal: f64,
    shout: f64,
}

impl SourceLevels {
    pub fn at(&self, volume: SpeechVolume) -> f64 {
        match volume {
            SpeechVolume::Whisper => self.whisper,
            SpeechVolume::Normal => self.normal,
            SpeechVolume::Shout => self.shout,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct AcousticThresholds {
    pub detect: f64,
    pub partial: f64,
    pub clear: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AcousticPolicy {
    pub id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub version: u64,
    reference: AcousticReference,
    source_level_db_spl_at1m: SourceLevels,
    background_level_db_spl: f64,
    pub thresholds_db: AcousticThresholds,
    pub sensory_lifetime_seconds: f64,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum HearingDetail {
    Undetected,
    None,
    Partial,
    Clear,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AcousticExposure {
    pub detail: HearingDetail,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub received_level_db_spl: Option<f64>,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub clarity_margin_db: Option<f64>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct InvalidAcousticGeometry;

impl AcousticPolicy {
    /// The installed family's enum owns the same spellings as its complete
    /// source-level record; callers do not restate world volume vocabulary.
    pub fn volume(&self, name: &str) -> Option<SpeechVolume> {
        SpeechVolume::deserialize(serde::de::value::BorrowedStrDeserializer::<
            serde::de::value::Error,
        >::new(name))
        .ok()
    }
    pub fn validate(&self) -> bool {
        let namespace = |value: &str| {
            let mut chars = value.bytes();
            chars.next().is_some_and(|first| first.is_ascii_lowercase())
                && chars
                    .all(|part| part.is_ascii_lowercase() || part.is_ascii_digit() || part == b'-')
        };
        let valid_id = self
            .id
            .split_once(':')
            .is_some_and(|(prefix, name)| namespace(prefix) && namespace(name));
        let level = |value: f64| value.is_finite() && (-120.0..=200.0).contains(&value);
        valid_id
            && self.version == 1
            && self.sensory_lifetime_seconds.is_finite()
            && self.sensory_lifetime_seconds > 0.0
            && level(self.background_level_db_spl)
            && [
                SpeechVolume::Whisper,
                SpeechVolume::Normal,
                SpeechVolume::Shout,
            ]
            .into_iter()
            .all(|volume| level(self.source_level_db_spl_at1m.at(volume)))
            && [
                self.thresholds_db.detect,
                self.thresholds_db.partial,
                self.thresholds_db.clear,
            ]
            .into_iter()
            .all(level)
            && self.thresholds_db.detect < self.thresholds_db.partial
            && self.thresholds_db.partial < self.thresholds_db.clear
    }

    pub fn source_level(&self, volume: SpeechVolume) -> f64 {
        self.source_level_db_spl_at1m.at(volume)
    }

    pub fn reach_at_level(
        &self,
        hearing_floor_db_spl: f64,
        source_level_db_spl_at1m: f64,
        threshold: Option<f64>,
    ) -> f64 {
        10.0_f64.powf(
            (source_level_db_spl_at1m
                - self.background_level_db_spl.max(hearing_floor_db_spl)
                - threshold.unwrap_or(self.thresholds_db.detect))
                / 20.0,
        )
    }

    pub fn reach(
        &self,
        hearing_floor_db_spl: f64,
        volume: SpeechVolume,
        threshold: Option<f64>,
    ) -> f64 {
        self.reach_at_level(hearing_floor_db_spl, self.source_level(volume), threshold)
    }

    pub fn exposure_at_level(
        &self,
        hearing_floor_db_spl: f64,
        source_level_db_spl_at1m: f64,
        separation: f64,
        transmission: f64,
    ) -> Result<AcousticExposure, InvalidAcousticGeometry> {
        if !separation.is_finite()
            || separation < 0.0
            || !transmission.is_finite()
            || !(0.0..=1.0).contains(&transmission)
            || !hearing_floor_db_spl.is_finite()
            || !source_level_db_spl_at1m.is_finite()
        {
            return Err(InvalidAcousticGeometry);
        }
        if transmission == 0.0 {
            return Ok(AcousticExposure {
                detail: HearingDetail::Undetected,
                received_level_db_spl: None,
                clarity_margin_db: None,
            });
        }
        let received = source_level_db_spl_at1m - 20.0 * separation.max(0.25).log10()
            + 10.0 * transmission.log10();
        let margin = received - self.background_level_db_spl.max(hearing_floor_db_spl);
        let detail = if margin >= self.thresholds_db.clear {
            HearingDetail::Clear
        } else if margin >= self.thresholds_db.partial {
            HearingDetail::Partial
        } else if margin >= self.thresholds_db.detect {
            HearingDetail::None
        } else {
            HearingDetail::Undetected
        };
        Ok(AcousticExposure {
            detail,
            received_level_db_spl: Some(received),
            clarity_margin_db: Some(margin),
        })
    }

    pub fn exposure(
        &self,
        hearing_floor_db_spl: f64,
        volume: SpeechVolume,
        separation: f64,
        transmission: f64,
    ) -> Result<AcousticExposure, InvalidAcousticGeometry> {
        self.exposure_at_level(
            hearing_floor_db_spl,
            self.source_level(volume),
            separation,
            transmission,
        )
    }

    pub fn loudest_speech_volume(&self) -> SpeechVolume {
        [SpeechVolume::Normal, SpeechVolume::Shout]
            .into_iter()
            .fold(SpeechVolume::Whisper, |best, volume| {
                if self.source_level(volume) > self.source_level(best) {
                    volume
                } else {
                    best
                }
            })
    }
}

#[path = "policy_residency/acoustics.rs"]
mod policy_residency;
