//! A duck occurrence proves the posture change. Only leaving its ordinary
//! envelope without contact can produce a miss seen by the actual witnesses.
use super::*;
use crate::events::{AudienceSelection, EmissionText, EventEmissionIntent, EventScope};
use crate::execution::{CrossingChange, StagedOccurrence};
use crate::projectile::ProjectileCrossing;
use crate::reception::{EventScalar, SenseDefinition, SightBatch};
use crate::text::JsText;

pub(super) struct ClearedCrossing {
    shot: String,
    key: String,
    entry: ProjectileCrossing,
    point: Point,
    observers: std::vec::IntoIter<EntityHandle>,
    witnessed: Vec<String>,
    sight: Option<SightBatch>,
    _reservation: ByteReservation,
}

pub(super) enum CloseStep {
    Geometry,
    Event(StagedOccurrence),
}

impl ClearedCrossing {
    pub(super) fn next(
        core: &mut CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, ExecutionError> {
        loop {
            let state = &core.state.physical;
            let at = state.header.sim_time;
            let mut tested = 0;
            let cleared = state.projectiles.flights.iter().find_map(|(shot, row)| {
                row.flight
                    .encounters
                    .as_ref()?
                    .iter()
                    .find_map(|(key, entry)| {
                        if !entry.still_bound(&state.entities) {
                            return Some((shot.as_str(), key.as_str(), entry, None));
                        }
                        if entry.entered_at == at {
                            return None;
                        }
                        let body = state.entities.get(&entry.body_id)?;
                        let foot = body.world_position()?;
                        let point = row.flight.position;
                        tested += 1;
                        moving_point_contact(
                            point,
                            point,
                            foot,
                            foot,
                            body.ordinary_body_profile().into(),
                        )
                        .is_none()
                        .then_some((
                            shot.as_str(),
                            key.as_str(),
                            entry,
                            Some(point),
                        ))
                    })
            });
            core.journal.meters.charge(&[(WorkUnit::Tests, tested)])?;
            let Some((shot, key, entry, point)) = cleared else {
                return Ok(None);
            };
            let room = size_of::<Self>()
                + shot.len()
                + key.len()
                + entry.body_id.len()
                + entry.pose_occurrence_id.len();
            let mut reservation = budget.reserve(room)?;
            let shot = shot.to_owned();
            let key = key.to_owned();
            let Some(point) = point else {
                core.physical()
                    .projectile_crossing(&shot, CrossingChange::Close(&key))?;
                continue;
            };
            let entry = entry.clone();
            let radius = core
                .state
                .installed
                .senses
                .values()
                .filter_map(|sense| match sense.value() {
                    SenseDefinition::VisionGeometry { radius, .. } => Some(*radius),
                    _ => None,
                })
                .fold(0.0_f64, f64::max);
            let (count, names) = state.bodies.candidate_capacity(point, radius);
            let bytes = count
                .checked_mul(
                    2 * size_of::<(&str, EntityHandle)>()
                        + size_of::<EntityHandle>()
                        + size_of::<String>(),
                )
                .and_then(|bytes| bytes.checked_add(names))
                .and_then(|bytes| bytes.checked_add(room))
                .ok_or(ExecutionError::Capacity)?;
            reservation.resize(bytes)?;
            let observers = state
                .bodies
                .candidates_metered(point, radius, &mut core.journal.meters)?
                .into_iter()
                .filter_map(|(_, handle)| {
                    state
                        .entities
                        .resolve(handle)
                        .filter(|entity| entity.actor.as_ref().is_some_and(|actor| actor.alive))
                        .map(|_| handle)
                })
                .collect::<Vec<_>>()
                .into_iter();
            return Ok(Some(Self {
                shot,
                key,
                entry,
                point,
                observers,
                witnessed: Vec::with_capacity(count),
                sight: None,
                _reservation: reservation,
            }));
        }
    }

    pub(super) fn question(&self) -> Option<&GeometryQueries> {
        self.sight.as_ref().map(SightBatch::queries)
    }

    pub(super) fn step(
        &mut self,
        core: &mut CoreMutation<'_>,
        mut binding: GeometryBinding,
        answer: Option<GeometryAnswers>,
        budget: &ByteBudget,
    ) -> Result<CloseStep, ExecutionError> {
        if let Some(sight) = self.sight.take() {
            let proof = sight
                .finish(answer.ok_or(ExecutionError::UnfinishedOccurrence)?)
                .map_err(crate::native_controller::sensor_error)?;
            if proof.point_seen() == Some(true)
                && (proof.observer().actor_id == self.entry.body_id
                    || proof.seen(&self.entry.body_id) == Some(true))
            {
                self.witnessed.push(proof.observer().actor_id.clone());
            }
        } else if answer.is_some() {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        if let Some(handle) = self.observers.next() {
            let state = &core.state.physical;
            let receiver = state
                .entities
                .resolve(handle)
                .ok_or(ExecutionError::MissingEntity)?;
            binding.serial = core.journal.next_provider_serial()?;
            self.sight = Some(
                SightBatch::prepare_with_point(
                    state,
                    &core.state.installed,
                    &receiver.id,
                    &[&self.entry.body_id],
                    Some(self.point),
                    binding,
                    budget,
                )
                .map_err(crate::native_controller::sensor_error)?,
            );
            return Ok(CloseStep::Geometry);
        }
        let installed = core.state.installed.clone();
        let wording = installed
            .manifest
            .ranged_policy
            .as_ref()
            .and_then(|policy| policy.local_avoidance.as_ref())
            .ok_or(ExecutionError::Invariant)?;
        let _room = budget.reserve(
            3072 + 8
                * (self.shot.len()
                    + self.entry.body_id.len()
                    + self.entry.pose_occurrence_id.len()
                    + wording.cleared_text.len()),
        )?;
        core.physical()
            .projectile_crossing(&self.shot, CrossingChange::Close(&self.key))?;
        core.stage_event(EventEmissionIntent {
            event_type: "projectile-crossing-cleared".into(),
            text: EmissionText::Narration(super::settle::subject(
                &self.entry.body_id,
                &JsText::from(wording.cleared_text.as_str()),
            )),
            audience: AudienceSelection::Explicit(std::mem::take(&mut self.witnessed)),
            source_id: Some(self.entry.body_id.clone()),
            target_id: Some(self.entry.body_id.clone()),
            data: Some(
                [
                    (
                        "projectileId".into(),
                        EventScalar::Text(self.shot.as_str().into()),
                    ),
                    (
                        "bodyLife".into(),
                        EventScalar::Number(self.entry.body_life as f64),
                    ),
                    (
                        "poseOccurrenceId".into(),
                        EventScalar::Text(self.entry.pose_occurrence_id.as_str().into()),
                    ),
                ]
                .into_iter()
                .collect(),
            ),
            scope: EventScope::External,
            origin: Some(self.point),
            exposure: None,
        })
        .map(CloseStep::Event)
    }
}
