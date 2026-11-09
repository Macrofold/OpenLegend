//! Real control eligibility may need immutable physical preparation. Keep its
//! question and answer bound to the captured actor/cut rather than substituting
//! an unavailable control for an unanswered geometry check.

use super::*;
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries, StandingQuery};

pub(crate) struct PlayerControlPreparation {
    queries: GeometryQueries,
    facts: PlayerControlFacts,
    _reservation: ByteReservation,
    _navigation: ByteReservation,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PlayerControlFacts {
    world_id: String,
    generation: String,
    accepted_cut: u64,
    actor_id: String,
    physical_life: Option<u64>,
    at: f64,
    can_recover: bool,
    preparing_navigation: bool,
}
pub(crate) struct CapturedPlayerControls {
    facts: PlayerControlFacts,
    _reservation: ByteReservation,
}
impl PlayerControlPreparation {
    pub(crate) fn prepare(
        state: &SimulationState,
        actor_id: &str,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        if binding.base_cut != state.accepted_cut
            || binding.geometry_revision != state.installed.geometry.spatial.revision
        {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        let entity = state
            .physical
            .entities
            .get(actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let actor = entity.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
        let anchor = crate::body::recovery_anchor(state, actor_id)?;
        let bytes = state
            .physical
            .header
            .id
            .len()
            .checked_add(state.generation.len())
            .and_then(|n| n.checked_add(actor_id.len()))
            .and_then(|n| {
                n.checked_add(if let Some(anchor) = anchor {
                    size_of::<StandingQuery>()
                        .checked_add(anchor.heap_bytes()?)?
                        .checked_add(entity.ordinary_body_profile().id.len())?
                } else {
                    0
                })
            })
            .ok_or(ExecutionError::Capacity)?;
        let reservation = budget.reserve(bytes)?;
        let mut queries = GeometryQueries::new(binding);
        if let Some(anchor) = anchor {
            queries
                .standing
                .try_reserve_exact(1)
                .map_err(|_| ExecutionError::Capacity)?;
            queries.standing.push(StandingQuery {
                point: anchor.clone(),
                body: entity.body_profile().into_owned(),
            });
        }
        let (preparing_navigation, navigation) =
            super::navigation::prepare(state, &mut queries, budget)?;
        Ok(Self {
            queries,
            facts: PlayerControlFacts {
                world_id: state.physical.header.id.clone(),
                generation: state.generation.clone(),
                accepted_cut: state.accepted_cut,
                actor_id: actor_id.to_owned(),
                physical_life: actor.physical_life,
                at: state.physical.header.sim_time,
                can_recover: false,
                preparing_navigation,
            },
            _reservation: reservation,
            _navigation: navigation,
        })
    }
    pub(crate) fn queries(&self) -> &GeometryQueries {
        &self.queries
    }
    pub(crate) fn finish(
        mut self,
        answers: GeometryAnswers,
    ) -> Result<CapturedPlayerControls, ExecutionError> {
        self.queries
            .validate_answers(&answers)
            .map_err(|_| ExecutionError::InvalidCheckpoint)?;
        self.facts.can_recover = if self.queries.standing.is_empty() {
            false
        } else {
            answers.standing[0]
        };
        self.facts.preparing_navigation |= answers
            .routes
            .iter()
            .any(|route| matches!(route, crate::geometry::RoutePlan::Pending { .. }));
        self.complete()
    }
    pub(crate) fn finish_without_geometry(self) -> Result<CapturedPlayerControls, ExecutionError> {
        if !self.queries.is_empty() {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        self.complete()
    }
    fn complete(mut self) -> Result<CapturedPlayerControls, ExecutionError> {
        drop(self.queries);
        self._reservation.resize(
            self.facts
                .world_id
                .capacity()
                .checked_add(self.facts.generation.capacity())
                .and_then(|n| n.checked_add(self.facts.actor_id.capacity()))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(CapturedPlayerControls {
            facts: self.facts,
            _reservation: self._reservation,
        })
    }
}
impl CapturedPlayerControls {
    pub(crate) fn write_json(
        &self,
        budget: &ByteBudget,
    ) -> Result<(String, ByteReservation), ExecutionError> {
        let length =
            crate::encoding::json_record_len(&self.facts).map_err(|_| ExecutionError::Invariant)?;
        let mut reservation = budget.reserve(
            length
                .checked_mul(2)
                .map(|n| n.max(8))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let text =
            crate::encoding::json_record(&self.facts).map_err(|_| ExecutionError::Invariant)?;
        reservation.resize(text.capacity())?;
        Ok((text, reservation))
    }
}
