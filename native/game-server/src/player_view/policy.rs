//! Public installed presentation. Larger media and terrain definitions are
//! retained once by the checked release artifact.

use crate::{player_events::PlayerEventPolicy, player_scene::PlayerScenePolicy};
use openlegend_simulation::{host::ResidentReservation, text::JsText};
use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;
use std::sync::Arc;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PlayerViewPolicy {
    pub(crate) scene: PlayerScenePolicy,
    pub(crate) events: PlayerEventPolicy,
    pub(crate) world: PublicWorld,
    pub(crate) controls: ControlPolicy,
    #[serde(skip)]
    _storage: Option<ResidentReservation>,
}

impl PlayerViewPolicy {
    pub(crate) fn with_storage(mut self, storage: ResidentReservation) -> Self {
        self._storage = Some(storage);
        self
    }

    pub fn base_ratio(&self) -> f64 {
        self.world.base_ratio
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct PublicWorld {
    pub name: JsText,
    pub time_label: String,
    pub introduction: Option<String>,
    pub crafting: Option<Arc<RawValue>>,
    pub day_label: Option<String>,
    pub history_template: Option<String>,
    pub named_times: Vec<String>,
    pub offset_hours: f64,
    pub base_ratio: f64,
    pub daylight: Option<Daylight>,
    pub map: MapPolicy,
    pub cartography: Option<CartographyPolicy>,
    pub invention_policy: Arc<RawValue>,
    pub construction_revision: Option<String>,
    pub milestones: Vec<MilestoneLabel>,
    pub daily_rain: Option<DailyRain>,
}

#[derive(Deserialize)]
pub(crate) struct MilestoneLabel {
    pub id: String,
    pub label: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct DailyRain {
    min_x: f64,
    max_x: f64,
    min_z: f64,
    max_z: f64,
    start: f64,
    end: f64,
    raining: Arc<str>,
    dry: Arc<str>,
    intensity: f64,
}

#[derive(PartialEq, Serialize)]
pub(crate) struct WeatherView {
    label: Arc<str>,
    intensity: f64,
}

impl PublicWorld {
    pub(crate) fn weather_at(
        &self,
        at: f64,
        point: openlegend_simulation::state::Point,
    ) -> Option<WeatherView> {
        let rain = self.daily_rain.as_ref()?;
        let hour = (at / 3600.0 + self.offset_hours) % 24.0;
        let hour = if hour < 0.0 { hour + 24.0 } else { hour };
        // The installed daily vertical-rain family uses its actual local
        // window and bounds. A finite cue is refused by the accepted capture.
        let wet = rain.intensity > 0.0
            && (rain.start..rain.end).contains(&hour)
            && (rain.min_x..=rain.max_x).contains(&point.x)
            && (rain.min_z..=rain.max_z).contains(&point.z);
        Some(WeatherView {
            label: if wet {
                rain.raining.clone()
            } else {
                rain.dry.clone()
            },
            intensity: if wet { rain.intensity } else { 0.0 },
        })
    }
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Daylight {
    pub start_hour: f64,
    pub end_hour: f64,
    pub noon_elevation_degrees: f64,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct MapPolicy {
    pub width: f64,
    pub height: f64,
    pub spatial: Arc<RawValue>,
    pub tiles: Arc<RawValue>,
    pub terrain: Arc<RawValue>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct CartographyPolicy {
    pub art: Arc<RawValue>,
    pub max_markers: u64,
    pub label_characters: u64,
    pub note_characters: Option<u64>,
    pub marker_icons: Arc<RawValue>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ControlPolicy {
    pub move_description: String,
    pub stop_label: String,
    pub stop_icon: Option<String>,
    pub stop_inactive: bool,
    pub no_work: String,
    pub paused_action: String,
    pub unavailable_action: String,
    pub recover_label: Option<String>,
    pub recover_reason: String,
    pub respawn_label: Option<String>,
    pub respawn_reason: String,
}
