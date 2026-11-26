//! Conservative local speech candidates followed by the actual hearing and
//! sight detectors. No receiver, name or grant is inferred from proximity.

use crate::events::EventScope;
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries, SightRay};
use crate::host::{ByteBudget, ByteReservation};
use crate::reception::{
    AcousticEmission, ObserverLife, SenseDefinition, SensorError, SightBatch, SightResults,
    SoundBatch, SoundResults, hearing_floor, sound_origin, vision_parameters,
};
use crate::simulation::{InstalledWorld, PhysicalState};
use crate::state::{EntityHandle, Point};
use crate::worlds::base_observed::SpeechVolume;
use std::mem::size_of;

struct Receiver {
    batch: SightBatch,
    first: usize,
    count: usize,
}
pub(crate) struct SpeechContactBatch {
    source: EntityHandle,
    source_id: String,
    source_life: u64,
    source_position: Point,
    queries: GeometryQueries,
    receivers: Vec<Receiver>,
    sound: SoundBatch,
    reservation: ByteReservation,
}
pub(crate) struct SpeechContacts {
    source: EntityHandle,
    source_id: String,
    source_life: u64,
    source_position: Point,
    binding: GeometryBinding,
    sight: Vec<SightResults>,
    sound: SoundResults,
    _reservation: ByteReservation,
}

impl SpeechContactBatch {
    pub(crate) fn prepare(
        physical: &PhysicalState,
        installed: &InstalledWorld,
        source_id: &str,
        target_id: Option<&str>,
        volume: SpeechVolume,
        scope: EventScope,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Self, SensorError> {
        let source = physical
            .entities
            .get(source_id)
            .ok_or(SensorError::MissingObserver)?;
        let handle = physical
            .entities
            .handle(source_id)
            .ok_or(SensorError::MissingObserver)?;
        let position = source
            .world_position()
            .ok_or(SensorError::PhysicalPosition)?;
        let origin = sound_origin(source).ok_or(SensorError::PhysicalPosition)?;
        let external = scope == EventScope::External && source.actively_participates();
        let acoustic = installed.acoustics.value();
        let reach = installed
            .senses
            .values()
            .map(|sense| match sense.value() {
                SenseDefinition::VisionGeometry { radius, .. } => *radius,
                SenseDefinition::HearingDb {
                    hearing_floor_db_spl,
                    ..
                } => acoustic.reach(*hearing_floor_db_spl, volume, None),
                _ => 0.0,
            })
            .fold(0.25, f64::max);
        // Both foot and ear are queried by the source broad phase. Include all
        // installed listener ear heights before applying its exact AABB test.
        let radius = reach + physical.bodies.maximum_extent() + source.body_profile().ear_height;
        let (count, id_bytes) = if external {
            physical.bodies.candidate_capacity(position, radius)
        } else {
            (usize::from(scope == EventScope::Private), source_id.len())
        };
        let per_receiver = size_of::<Receiver>()
            + size_of::<SightResults>()
            + 2 * size_of::<(&str, EntityHandle)>()
            + size_of::<&str>()
            + 7 * size_of::<SightRay>();
        let bytes = count
            .checked_mul(per_receiver)
            .and_then(|bytes| bytes.checked_add(id_bytes))
            .and_then(|bytes| bytes.checked_add(source_id.len()))
            .and_then(|bytes| bytes.checked_add(size_of::<Self>() + size_of::<SpeechContacts>()))
            .ok_or(SensorError::Capacity)?;
        let reservation = budget.reserve(bytes).map_err(|_| SensorError::Capacity)?;
        let candidates = if external {
            physical.bodies.candidates(position, radius)
        } else if scope == EventScope::Private {
            vec![(source_id, handle)]
        } else {
            Vec::new()
        };
        let mut ids = Vec::new();
        ids.try_reserve_exact(count)
            .map_err(|_| SensorError::Capacity)?;
        for (id, handle) in candidates {
            let observer = physical
                .entities
                .resolve(handle)
                .ok_or(SensorError::MissingObserver)?;
            // Private speech uses the source directly, matching the internal
            // event path; the emitter still applies actual receiver admission.
            if !external {
                ids.push(id);
                continue;
            }
            if !observer.actor.as_ref().is_some_and(|actor| actor.alive)
                || !observer.actively_participates()
            {
                continue;
            }
            let foot = observer
                .world_position()
                .ok_or(SensorError::PhysicalPosition)?;
            let ear_y = foot.y + observer.body_profile().ear_height;
            let sight = vision_parameters(installed, observer).radius;
            let hearing = hearing_floor(installed, observer)
                .map_or(0.0, |floor| acoustic.reach(floor, volume, None))
                .max(0.25);
            let reach = sight.max(hearing);
            if [position, origin].iter().any(|p| {
                p.x >= foot.x - reach
                    && p.x <= foot.x + reach
                    && p.z >= foot.z - reach
                    && p.z <= foot.z + reach
                    && p.y >= (foot.y - sight).min(ear_y - hearing)
                    && p.y <= (foot.y + sight).max(ear_y + hearing)
            }) {
                ids.push(id);
            }
        }
        let sound = SoundBatch::prepare(
            physical,
            installed,
            &AcousticEmission {
                origin,
                emitter_id: Some(source_id.to_owned()),
                source_level_db_spl_at1m: acoustic.source_level(volume),
            },
            &ids,
            binding,
            budget,
        )?;
        let mut queries = GeometryQueries::new(binding);
        queries
            .sound
            .try_reserve_exact(sound.queries().sound.len())
            .map_err(|_| SensorError::Capacity)?;
        queries.sound.extend_from_slice(&sound.queries().sound);
        queries
            .sight
            .try_reserve_exact(ids.len().checked_mul(6).ok_or(SensorError::Capacity)?)
            .map_err(|_| SensorError::Capacity)?;
        let mut receivers = Vec::new();
        receivers
            .try_reserve_exact(ids.len())
            .map_err(|_| SensorError::Capacity)?;
        for id in ids {
            let understands = physical
                .entities
                .get(id)
                .and_then(|observer| observer.actor.as_ref())
                .and_then(|actor| actor.capabilities.as_ref())
                .is_some_and(|capabilities| capabilities.language);
            let targets = [
                (id != source_id).then_some(source_id),
                (id != source_id && understands)
                    .then_some(target_id)
                    .flatten()
                    .filter(|target| *target != id),
            ];
            let targets: Vec<_> = targets.into_iter().flatten().collect();
            let batch = SightBatch::prepare(physical, installed, id, &targets, binding, budget)?;
            let first = queries.sight.len();
            let count = batch.queries().sight.len();
            queries.sight.extend_from_slice(&batch.queries().sight);
            receivers.push(Receiver {
                batch,
                first,
                count,
            });
        }
        Ok(Self {
            source: handle,
            source_id: source_id.to_owned(),
            source_life: source.physical_life().unwrap_or(0),
            source_position: position,
            queries,
            receivers,
            sound,
            reservation,
        })
    }
    pub(crate) fn queries(&self) -> &GeometryQueries {
        &self.queries
    }

    pub(crate) fn finish(
        self,
        answers: GeometryAnswers,
        installed: &InstalledWorld,
    ) -> Result<SpeechContacts, SensorError> {
        self.queries
            .validate_answers(&answers)
            .map_err(|_| SensorError::Geometry)?;
        let mut sight = Vec::new();
        sight
            .try_reserve_exact(self.receivers.len())
            .map_err(|_| SensorError::Capacity)?;
        for receiver in self.receivers {
            sight.push(receiver.batch.finish_sight(
                self.queries.binding,
                &answers.sight[receiver.first..receiver.first + receiver.count],
            )?);
        }
        let sound = self.sound.finish_exposure(
            self.queries.binding,
            &answers.sound,
            &installed.acoustics,
        )?;
        Ok(SpeechContacts {
            source: self.source,
            source_id: self.source_id,
            source_life: self.source_life,
            source_position: self.source_position,
            binding: self.queries.binding,
            sight,
            sound,
            _reservation: self.reservation,
        })
    }
}

impl SpeechContacts {
    pub(crate) fn require_current(&self, physical: &PhysicalState) -> Result<(), SensorError> {
        let source = physical
            .entities
            .resolve(self.source)
            .ok_or(SensorError::Geometry)?;
        if source.id != self.source_id
            || source.physical_life().unwrap_or(0) != self.source_life
            || source.world_position() != Some(self.source_position)
        {
            return Err(SensorError::Geometry);
        }
        for sight in &self.sight {
            let observer = physical
                .entities
                .get(&sight.observer().actor_id)
                .ok_or(SensorError::Geometry)?;
            if observer.physical_life().unwrap_or(0) != sight.observer().physical_life {
                return Err(SensorError::Geometry);
            }
        }
        Ok(())
    }
    pub(crate) fn binding(&self) -> GeometryBinding {
        self.binding
    }
    pub(crate) fn source_id(&self) -> &str {
        &self.source_id
    }
    pub(crate) fn observers(&self) -> impl Iterator<Item = &ObserverLife> {
        self.sight.iter().map(SightResults::observer)
    }
    pub(crate) fn sight(&self, id: &str) -> Option<&SightResults> {
        self.sight
            .iter()
            .find(|sight| sight.observer().actor_id == id)
    }
    pub(crate) fn exposure(&self, id: &str) -> Option<&crate::worlds::InstalledAcousticExposure> {
        self.sound.exposure(id)
    }
}
