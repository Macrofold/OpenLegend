//! One finite physical sound-exposure batch. Hearing thresholds and propagation
//! are invoked through the installed world law; sight attribution is separate
//! and must use the same physical candidate's exact sight result.

use super::AcousticPolicy;
use super::sensors::{SensorError, hearing_floor};
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries, SightRay};
use crate::host::{ByteBudget, ByteReservation};
use crate::simulation::{InstalledWorld, PhysicalState};
use crate::state::{Entity, Point};
use crate::values::DefinitionPin;
use crate::worlds::{
    InstalledAcousticExposure as AcousticExposure, InstalledHearingDetail as HearingDetail,
};
use serde::{Deserialize, Serialize};
use std::mem::size_of;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AcousticEmission {
    pub origin: Point,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub emitter_id: Option<String>,
    pub source_level_db_spl_at1m: f64,
}

pub fn sound_origin(entity: &Entity) -> Option<Point> {
    entity.world_position().map(|position| Point {
        y: position.y + entity.body_profile().ear_height,
        ..position
    })
}

struct SoundCheck {
    observer_id: String,
    floor: Option<f64>,
    separation: f64,
    transmission_index: Option<usize>,
    exposure: AcousticExposure,
}

pub(crate) struct SoundBatch {
    queries: GeometryQueries,
    checks: Vec<SoundCheck>,
    acoustic_pin: DefinitionPin,
    source_level: f64,
    reservation: ByteReservation,
}

pub(crate) struct SoundResults {
    checks: Vec<SoundCheck>,
    binding: GeometryBinding,
    _reservation: ByteReservation,
}

fn silent() -> AcousticExposure {
    AcousticExposure {
        detail: HearingDetail::Undetected,
        received_level_db_spl: None,
        clarity_margin_db: None,
    }
}

impl SoundBatch {
    pub(crate) fn prepare(
        physical: &PhysicalState,
        installed: &InstalledWorld,
        emission: &AcousticEmission,
        observers: &[&str],
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Self, SensorError> {
        let pin = installed.acoustics.pin();
        let string_bytes = observers.iter().try_fold(
            pin.id
                .len()
                .checked_add(pin.digest.len())
                .ok_or(SensorError::Capacity)?,
            |bytes, id| bytes.checked_add(id.len()).ok_or(SensorError::Capacity),
        )?;
        let bytes = size_of::<SoundBatch>()
            .checked_add(
                observers
                    .len()
                    .checked_mul(size_of::<SoundCheck>() + size_of::<SightRay>())
                    .ok_or(SensorError::Capacity)?,
            )
            .and_then(|bytes| bytes.checked_add(string_bytes))
            .ok_or(SensorError::Capacity)?;
        let mut reservation = budget.reserve(bytes).map_err(|_| SensorError::Capacity)?;
        let mut queries = GeometryQueries::new(binding);
        queries
            .sound
            .try_reserve_exact(observers.len())
            .map_err(|_| SensorError::Capacity)?;
        let mut checks = Vec::new();
        checks
            .try_reserve_exact(observers.len())
            .map_err(|_| SensorError::Capacity)?;
        for id in observers {
            let observer = physical
                .entities
                .get(id)
                .ok_or(SensorError::MissingObserver)?;
            let floor = hearing_floor(installed, observer);
            let enabled = observer.actor.as_ref().is_some_and(|actor| actor.alive)
                && observer.actively_participates()
                && !installed
                    .capabilities
                    .capability_blocked(Some(observer), "perception")
                    .map_err(|_| SensorError::Capability)?;
            let mut check = SoundCheck {
                observer_id: (*id).to_owned(),
                floor,
                separation: 0.0,
                transmission_index: None,
                exposure: silent(),
            };
            if enabled && let Some(floor) = floor {
                let listener = sound_origin(observer).ok_or(SensorError::PhysicalPosition)?;
                check.separation = crate::spatial::distance(listener, emission.origin);
                let reach = installed.acoustics.value().reach_at_level(
                    floor,
                    emission.source_level_db_spl_at1m,
                    None,
                );
                if check.separation <= 0.25_f64.max(reach) {
                    check.transmission_index = Some(queries.sound.len());
                    queries.sound.push(SightRay {
                        from: listener,
                        to: emission.origin,
                    });
                }
            }
            checks.push(check);
        }
        let acoustic_pin = pin.clone();
        reservation
            .resize(
                size_of::<SoundBatch>()
                    + checks.capacity() * size_of::<SoundCheck>()
                    + checks
                        .iter()
                        .map(|check| check.observer_id.capacity())
                        .sum::<usize>()
                    + queries.sound.capacity() * size_of::<SightRay>()
                    + acoustic_pin.id.capacity()
                    + acoustic_pin.digest.capacity(),
            )
            .map_err(|_| SensorError::Capacity)?;
        Ok(Self {
            queries,
            checks,
            acoustic_pin,
            source_level: emission.source_level_db_spl_at1m,
            reservation,
        })
    }

    pub(crate) fn queries(&self) -> &GeometryQueries {
        &self.queries
    }

    pub(crate) fn finish(
        mut self,
        answers: GeometryAnswers,
        policy: &crate::install::VerifiedDefinition<AcousticPolicy>,
    ) -> Result<SoundResults, SensorError> {
        self.queries
            .validate_answers(&answers)
            .map_err(|_| SensorError::Geometry)?;
        if policy.pin() != &self.acoustic_pin {
            return Err(SensorError::Geometry);
        }
        for check in &mut self.checks {
            if let Some(index) = check.transmission_index {
                check.exposure = policy
                    .value()
                    .exposure_at_level(
                        check
                            .floor
                            .expect("An admitted acoustic ray has a hearing floor"),
                        self.source_level,
                        check.separation,
                        answers.sound[index],
                    )
                    .map_err(|_| SensorError::PhysicalPosition)?;
            }
        }
        let binding = self.queries.binding;
        drop(self.queries);
        drop(self.acoustic_pin);
        self.reservation
            .resize(
                size_of::<SoundResults>()
                    + self.checks.capacity() * size_of::<SoundCheck>()
                    + self
                        .checks
                        .iter()
                        .map(|check| check.observer_id.capacity())
                        .sum::<usize>(),
            )
            .map_err(|_| SensorError::Capacity)?;
        Ok(SoundResults {
            checks: self.checks,
            binding,
            _reservation: self.reservation,
        })
    }
}

impl SoundResults {
    pub(crate) fn binding(&self) -> GeometryBinding {
        self.binding
    }
    pub(crate) fn exposure(&self, observer_id: &str) -> Option<&AcousticExposure> {
        self.checks
            .iter()
            .find(|check| check.observer_id == observer_id)
            .map(|check| &check.exposure)
    }
    pub(crate) fn iter(&self) -> impl Iterator<Item = (&str, &AcousticExposure)> {
        self.checks
            .iter()
            .map(|check| (check.observer_id.as_str(), &check.exposure))
    }
}
