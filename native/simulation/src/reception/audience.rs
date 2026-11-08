//! Actual occurrence audience. Existing physical candidate ownership supplies
//! current nearby bodies; every recipient still proves fresh exact sight.

use super::{SenseDefinition, SensorError, SightBatch, SightResults, vision_parameters};
use crate::events::EventScope;
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries, SightRay};
use crate::host::{ByteBudget, ByteReservation};
use crate::simulation::{InstalledWorld, PhysicalState};
use crate::state::Entity;
use std::mem::size_of;

struct Receiver {
    batch: SightBatch,
    first: usize,
    count: usize,
}
pub(crate) struct EventAudienceBatch {
    binding: GeometryBinding,
    queries: GeometryQueries,
    receivers: Vec<Receiver>,
    source: Option<String>,
    visible_target: Option<String>,
    own: Option<String>,
    reservation: ByteReservation,
}
pub(crate) struct EventAudience {
    ids: Vec<String>,
    sight: Vec<SightResults>,
    binding: GeometryBinding,
    _reservation: ByteReservation,
}
impl EventAudience {
    pub(crate) fn ids(&self) -> &[String] {
        &self.ids
    }
    pub(crate) fn binding(&self) -> GeometryBinding {
        self.binding
    }
    pub(crate) fn sight(&self, observer: &str) -> Option<&SightResults> {
        self.sight
            .iter()
            .find(|sight| sight.observer().actor_id == observer)
    }
}
impl EventAudienceBatch {
    pub(crate) fn prepare(
        physical: &PhysicalState,
        installed: &InstalledWorld,
        source_id: Option<&str>,
        scope: EventScope,
        visible_target: Option<&str>,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Self, SensorError> {
        let source = source_id.and_then(|id| physical.entities.get(id));
        let external =
            scope == EventScope::External && source.is_some_and(Entity::actively_participates);
        let radius = installed
            .senses
            .values()
            .filter_map(|sense| match sense.value() {
                SenseDefinition::VisionGeometry { radius, .. } => Some(*radius),
                _ => None,
            })
            .fold(0.0, f64::max);
        let origin = if external {
            source.and_then(Entity::world_position)
        } else {
            None
        };
        if external && origin.is_none() {
            return Err(SensorError::PhysicalPosition);
        }
        let (count, id_bytes) = origin.map_or((0, 0), |origin| {
            physical.bodies.candidate_capacity(origin, radius)
        });
        let bytes = crate::host::retained_size::heap_sum([
            size_of::<Self>(),
            size_of::<EventAudience>(),
            size_of::<String>(),
            count
                .checked_mul(
                    size_of::<Receiver>()
                        + size_of::<SightResults>()
                        + size_of::<String>()
                        + 4 * size_of::<(&str, crate::state::EntityHandle)>()
                        + 6 * size_of::<SightRay>(),
                )
                .ok_or(SensorError::Capacity)?,
            id_bytes,
            source_id
                .map_or(Some(0), |id| id.len().checked_mul(3))
                .ok_or(SensorError::Capacity)?,
            visible_target.map_or(0, str::len),
        ])
        .ok_or(SensorError::Capacity)?;
        let reservation = budget.reserve(bytes).map_err(|_| SensorError::Capacity)?;
        let mut queries = GeometryQueries::new(binding);
        queries
            .sight
            .try_reserve_exact(
                count
                    .checked_mul(if visible_target.is_some() { 6 } else { 3 })
                    .ok_or(SensorError::Capacity)?,
            )
            .map_err(|_| SensorError::Capacity)?;
        let mut receivers = Vec::new();
        receivers
            .try_reserve_exact(count)
            .map_err(|_| SensorError::Capacity)?;
        if let (Some(origin), Some(source)) = (origin, source) {
            let mut candidates = physical.bodies.candidates(origin, radius);
            candidates.sort_by(|(a, _), (b, _)| {
                crate::encoding::js_string_cmp(
                    physical
                        .entities
                        .ordering(a)
                        .expect("Body index preserves installed ordering"),
                    physical
                        .entities
                        .ordering(b)
                        .expect("Body index preserves installed ordering"),
                )
            });
            for (id, handle) in candidates {
                let observer = physical
                    .entities
                    .resolve(handle)
                    .ok_or(SensorError::MissingObserver)?;
                let range = vision_parameters(installed, observer).radius;
                if !observer.has_memory()
                    || !observer.actor.as_ref().is_some_and(|actor| actor.alive)
                    || !observer.actively_participates()
                    || installed
                        .capabilities
                        .capability_blocked(Some(observer), "perception")
                        .map_err(|_| SensorError::Capability)?
                    || range <= 0.0
                {
                    continue;
                }
                let position = observer
                    .world_position()
                    .ok_or(SensorError::PhysicalPosition)?;
                if crate::spatial::distance(position, origin) > range {
                    continue;
                }
                let targets = [Some(source.id.as_str()), visible_target];
                let targets: Vec<_> = targets.into_iter().flatten().collect();
                let batch =
                    SightBatch::prepare(physical, installed, id, &targets, binding, budget)?;
                let first = queries.sight.len();
                let count = batch.queries().sight.len();
                queries.sight.extend_from_slice(&batch.queries().sight);
                receivers.push(Receiver {
                    batch,
                    first,
                    count,
                });
            }
        }
        Ok(Self {
            binding,
            queries,
            receivers,
            source: source.map(|source| source.id.clone()),
            visible_target: visible_target.map(str::to_owned),
            own: (scope != EventScope::System)
                .then_some(source)
                .flatten()
                .filter(|source| source.has_memory())
                .map(|source| source.id.clone()),
            reservation,
        })
    }
    pub(crate) fn queries(&self) -> &GeometryQueries {
        &self.queries
    }
    pub(crate) fn finish(self, answers: GeometryAnswers) -> Result<EventAudience, SensorError> {
        self.queries
            .validate_answers(&answers)
            .map_err(|_| SensorError::Geometry)?;
        let mut ids = Vec::new();
        ids.try_reserve_exact(self.receivers.len() + usize::from(self.own.is_some()))
            .map_err(|_| SensorError::Capacity)?;
        let mut sight = Vec::new();
        sight
            .try_reserve_exact(self.receivers.len())
            .map_err(|_| SensorError::Capacity)?;
        for receiver in self.receivers {
            let result = receiver.batch.finish_sight(
                self.binding,
                &answers.sight[receiver.first..receiver.first + receiver.count],
            )?;
            if self
                .source
                .as_ref()
                .is_some_and(|source| result.seen(source) == Some(true))
                && self
                    .visible_target
                    .as_ref()
                    .is_none_or(|target| result.seen(target) == Some(true))
            {
                ids.push(result.observer().actor_id.clone());
            }
            sight.push(result);
        }
        if let Some(own) = self.own {
            if !ids.contains(&own) {
                ids.push(own);
            }
        }
        Ok(EventAudience {
            ids,
            sight,
            binding: self.binding,
            _reservation: self.reservation,
        })
    }
}
