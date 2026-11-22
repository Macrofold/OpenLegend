//! Installed weather facts used by both the advance clock and scoped views.
//! Rain needs only the current game time and the saved optional finite cue.
use crate::encoding::content_label;
use crate::host::retained_size::HeapBytes;
use crate::host::{ByteBudget, ResidentReservation};
use crate::install::{InstallError, reserve_typed_parse};
use crate::simulation::SimulationState;
use crate::state::Point;
use crate::text::JsText;
use crate::time::local_clock::{daily_boundary, in_daily_window, local_hour};
use crate::values::{DefinitionPin, deserialize_safe_integer, is_safe_record_id};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;
use std::mem::size_of;
use std::sync::Arc;

#[derive(Clone, Copy)]
pub(crate) struct IncidentRain {
    pub(crate) min_x: f64,
    pub(crate) max_x: f64,
    pub(crate) min_z: f64,
    pub(crate) max_z: f64,
    pub(crate) intensity: f64,
}

impl IncidentRain {
    fn valid(self) -> bool {
        [self.min_x, self.max_x, self.min_z, self.max_z]
            .into_iter()
            .all(f64::is_finite)
            && self.min_x < self.max_x
            && self.min_z < self.max_z
            && (0.0..=1.0).contains(&self.intensity)
    }

    fn reaches(self, point: Point) -> bool {
        (self.min_x..=self.max_x).contains(&point.x) && (self.min_z..=self.max_z).contains(&point.z)
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct FiniteRainInput {
    pub(crate) family: DefinitionPin,
    min_x: f64,
    max_x: f64,
    min_z: f64,
    max_z: f64,
    intensity: f64,
    starts_at: f64,
    ends_at: f64,
}

pub(crate) struct FiniteRain {
    rain: IncidentRain,
    starts_at: f64,
    ends_at: f64,
}

impl FiniteRainInput {
    pub(crate) fn verify(
        &self,
        families: &IndexMap<String, &RawValue>,
        budget: &ByteBudget,
    ) -> Result<FiniteRain, InstallError> {
        let rain = IncidentRain {
            min_x: self.min_x,
            max_x: self.max_x,
            min_z: self.min_z,
            max_z: self.max_z,
            intensity: self.intensity,
        };
        if !self.family.is_valid()
            || !rain.valid()
            || !self.starts_at.is_finite()
            || !self.ends_at.is_finite()
            || self.starts_at < 0.0
            || self.starts_at >= self.ends_at
        {
            return Err(InstallError::CurrentFormat);
        }
        let family = families
            .get(&self.family.id)
            .ok_or(InstallError::DefinitionBody)?
            .get();
        let _parse = reserve_typed_parse::<DefinitionIdentity>(family, 0, None, budget)?;
        let identity: DefinitionIdentity =
            serde_json::from_str(family).map_err(|_| InstallError::DefinitionBody)?;
        if identity.id != self.family.id
            || identity.version != self.family.version
            || content_label(family) != self.family.digest
        {
            return Err(InstallError::DefinitionBody);
        }
        Ok(FiniteRain {
            rain,
            starts_at: self.starts_at,
            ends_at: self.ends_at,
        })
    }
}

#[derive(Deserialize)]
struct DefinitionIdentity {
    id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    version: u64,
}

#[derive(Deserialize)]
struct Clock {
    clock: String,
    #[serde(rename = "offsetHours")]
    offset_hours: f64,
}

#[derive(Deserialize)]
struct Window {
    start: f64,
    end: f64,
}

#[derive(Deserialize)]
struct Region<'a> {
    opening: DefinitionPin,
    #[serde(borrow)]
    bounds: &'a RawValue,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Bounds {
    id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    version: u64,
    min_x: f64,
    max_x: f64,
    min_z: f64,
    max_z: f64,
}

#[derive(Deserialize)]
struct Labels {
    raining: JsText,
    dry: JsText,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct DailyDefinition<'a> {
    id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    version: u64,
    implementation: String,
    clock: Clock,
    window_local_hours: Window,
    #[serde(borrow)]
    region: Region<'a>,
    intensity: f64,
    overlap: String,
    labels: Labels,
}

#[derive(Deserialize)]
struct Selection {
    #[serde(rename = "dailyRain")]
    pin: Option<DefinitionPin>,
}

#[derive(Serialize)]
#[serde(transparent)]
struct WeatherLabel {
    text: JsText,
    #[serde(skip)]
    _storage: ResidentReservation,
}

impl WeatherLabel {
    fn retain(text: JsText, budget: &ByteBudget) -> Result<Arc<Self>, InstallError> {
        let bytes = text
            .heap_bytes()
            .and_then(|bytes| bytes.checked_add(size_of::<Self>() + 2 * size_of::<usize>()))
            .ok_or(InstallError::Capacity)?;
        let storage = budget
            .reserve_record(bytes)
            .map_err(|_| InstallError::Capacity)?;
        Ok(Arc::new(Self {
            text,
            _storage: storage,
        }))
    }
}

impl PartialEq for WeatherLabel {
    fn eq(&self, other: &Self) -> bool {
        self.text == other.text
    }
}

#[derive(Clone, PartialEq, Serialize)]
pub struct LocalWeather {
    label: Arc<WeatherLabel>,
    intensity: f64,
}

pub(crate) struct DailyRain {
    rain: IncidentRain,
    window: Window,
    raining: Arc<WeatherLabel>,
    dry: Arc<WeatherLabel>,
}

/// Validates the canonical installed rows. Only the selected definition keeps
/// a read projection and label storage for subsequent captures.
pub(crate) fn install_daily(
    profile: Option<&str>,
    definitions: Option<&IndexMap<String, &RawValue>>,
    offset: f64,
    budget: &ByteBudget,
) -> Result<Option<DailyRain>, InstallError> {
    let _profile = profile
        .map(|body| reserve_typed_parse::<Option<Selection>>(body, 0, None, budget))
        .transpose()?;
    let pin = profile
        .map(serde_json::from_str::<Option<Selection>>)
        .transpose()
        .map_err(|_| InstallError::DefinitionBody)?
        .flatten()
        .and_then(|selection| selection.pin);
    let mut selected = None;
    for (id, body) in definitions.into_iter().flatten() {
        let _parse = reserve_typed_parse::<DailyDefinition<'_>>(body.get(), 0, None, budget)?;
        let definition: DailyDefinition<'_> =
            serde_json::from_str(body.get()).map_err(|_| InstallError::DefinitionBody)?;
        let bounds: Bounds = serde_json::from_str(definition.region.bounds.get())
            .map_err(|_| InstallError::DefinitionBody)?;
        let rain = IncidentRain {
            min_x: bounds.min_x,
            max_x: bounds.max_x,
            min_z: bounds.min_z,
            max_z: bounds.max_z,
            intensity: definition.intensity,
        };
        if definition.id != *id
            || !is_safe_record_id(id)
            || definition.version == 0
            || definition.implementation != "daily-vertical-rain"
            || definition.overlap != "maximum"
            || definition.clock.clock != "localTime"
            || definition.clock.offset_hours != offset
            || !(0.0..24.0).contains(&definition.window_local_hours.start)
            || !(definition.window_local_hours.start..24.0)
                .contains(&definition.window_local_hours.end)
            || definition.window_local_hours.start == definition.window_local_hours.end
            || !rain.valid()
            || !is_safe_record_id(&bounds.id)
            || bounds.version == 0
            || !definition.region.opening.is_valid()
            || definition.region.opening.id != bounds.id
            || definition.region.opening.version != bounds.version
            || definition.region.opening.digest != content_label(definition.region.bounds.get())
            || [&definition.labels.raining, &definition.labels.dry]
                .into_iter()
                .any(|label| label.trim_is_empty() || label.units_len() > 500)
        {
            return Err(InstallError::DefinitionBody);
        }
        if let Some(pin) = pin.as_ref().filter(|pin| pin.id == *id) {
            if !pin.is_valid()
                || pin.version != definition.version
                || pin.digest != content_label(body.get())
            {
                return Err(InstallError::DefinitionBody);
            }
            selected = Some(DailyRain {
                rain,
                window: definition.window_local_hours,
                raining: WeatherLabel::retain(definition.labels.raining, budget)?,
                dry: WeatherLabel::retain(definition.labels.dry, budget)?,
            });
        }
    }
    if pin.is_some() && selected.is_none() {
        return Err(InstallError::DefinitionBody);
    }
    Ok(selected)
}

pub(crate) struct WeatherInterval {
    pub(crate) incident: [Option<IncidentRain>; 2],
    pub(crate) seconds_to_edge: f64,
}

impl SimulationState {
    pub(crate) fn weather_at(&self, at: f64) -> WeatherInterval {
        let mut seconds_to_edge = f64::INFINITY;
        let daily = self
            .installed
            .retained
            .daily_rain
            .as_ref()
            .and_then(|daily| {
                let hour = local_hour(at, self.installed.status_policy.clock_offset_hours);
                seconds_to_edge = daily_boundary(
                    hour,
                    daily.window.start,
                    daily.window.end,
                    self.installed.time_epsilon,
                );
                (daily.rain.intensity > 0.0
                    && in_daily_window(hour, daily.window.start, daily.window.end))
                .then_some(daily.rain)
            });
        let finite = self.finite_rain.as_ref().and_then(|cue| {
            for edge in [cue.starts_at, cue.ends_at] {
                if edge > at {
                    seconds_to_edge = seconds_to_edge.min(edge - at);
                }
            }
            (cue.rain.intensity > 0.0 && (cue.starts_at..cue.ends_at).contains(&at))
                .then_some(cue.rain)
        });
        WeatherInterval {
            incident: [daily, finite],
            seconds_to_edge,
        }
    }

    pub(crate) fn local_weather(&self, position: Point) -> Option<LocalWeather> {
        // Labels belong to the selected world rule. A finite cue alone has no
        // standalone label in the authored player presentation.
        let daily = self.installed.retained.daily_rain.as_ref()?;
        let intensity = self
            .weather_at(self.physical.header.sim_time)
            .incident
            .into_iter()
            .flatten()
            .filter(|rain| rain.reaches(position))
            .map(|rain| rain.intensity)
            .fold(0.0, f64::max);
        let label = if intensity > 0.0 {
            &daily.raining
        } else {
            &daily.dry
        };
        Some(LocalWeather {
            label: Arc::clone(label),
            intensity,
        })
    }
}
