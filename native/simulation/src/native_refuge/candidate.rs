//! Ordered support-column preparation for the currently committed search leg.
//! Physical providers choose the first usable standing surface; this owner alone
//! chooses the animal's bearing and how far to shorten along it.

use crate::execution::{ExecutionError, PhysicalMutation};
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries, StandingColumnsQuery};
use crate::host::{ByteBudget, ByteReservation};
use crate::native_response::{RefugeCandidate, profile_key};
use crate::simulation::{InstalledWorld, PhysicalState};
use crate::state::{EntityHandle, SurfacePoint};
use std::mem::size_of;

pub(crate) struct RefugeCandidateBatch {
    actor: EntityHandle,
    actor_id: String,
    episode_id: String,
    generation: u64,
    attempted: u64,
    origin: SurfacePoint,
    at: f64,
    queries: GeometryQueries,
    _reservation: ByteReservation,
}

impl RefugeCandidateBatch {
    pub(crate) fn prepare(
        physical: &PhysicalState,
        installed: &InstalledWorld,
        actor_id: &str,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let animal = physical
            .entities
            .get(actor_id)
            .ok_or(ExecutionError::MissingEntity)?;
        let episode = animal
            .animal
            .as_ref()
            .and_then(|state| state.episode.as_ref())
            .ok_or(ExecutionError::Invariant)?;
        let proposal = episode.proposal.as_ref().ok_or(ExecutionError::Invariant)?;
        let search = proposal.search.as_ref().ok_or(ExecutionError::Invariant)?;
        let key = profile_key(&episode.profile_pin).map_err(|_| ExecutionError::Invariant)?;
        let profile = installed
            .response_profiles
            .get(&key)
            .ok_or(ExecutionError::UnsupportedFamily)?
            .value();
        let offset = profile
            .candidates
            .angles
            .get(search.attempted as usize)
            .ok_or(ExecutionError::Invariant)?;
        let angle = search.bearing + search.side * offset * std::f64::consts::PI / 180.0;
        let advance = profile.candidates.minimum_advance;
        let bound = (search.distance / advance).ceil() + 1.0;
        if !bound.is_finite() || bound < 1.0 || bound > usize::MAX as f64 {
            return Err(ExecutionError::Capacity);
        }
        let capacity = bound as usize;
        let bytes = capacity
            .checked_mul(size_of::<f64>())
            .and_then(|bytes| {
                bytes.checked_add(
                    size_of::<Self>()
                        + size_of::<StandingColumnsQuery>()
                        + actor_id.len()
                        + episode.id.len()
                        + proposal.origin.surface_id.len()
                        + animal.body_profile().id.len(),
                )
            })
            .ok_or(ExecutionError::Capacity)?;
        let reservation = budget
            .reserve(bytes)
            .map_err(|_| ExecutionError::Capacity)?;
        let mut distances = Vec::new();
        distances
            .try_reserve_exact(capacity)
            .map_err(|_| ExecutionError::Capacity)?;
        let mut distance = search.distance;
        while distance >= advance {
            if distances.len() == capacity {
                return Err(ExecutionError::Capacity);
            }
            distances.push(distance);
            let next = distance - advance;
            if next == distance {
                return Err(ExecutionError::Invariant);
            }
            distance = next;
        }
        let mut queries = GeometryQueries::new(binding);
        queries
            .standing_columns
            .try_reserve_exact(1)
            .map_err(|_| ExecutionError::Capacity)?;
        queries.standing_columns.push(StandingColumnsQuery {
            origin: proposal.origin.point(),
            angle,
            distances,
            body: animal.body_profile().into_owned(),
        });
        Ok(Self {
            actor: physical
                .entities
                .handle(actor_id)
                .ok_or(ExecutionError::MissingEntity)?,
            actor_id: actor_id.to_owned(),
            episode_id: episode.id.clone(),
            generation: proposal.generation,
            attempted: search.attempted,
            origin: proposal.origin.clone(),
            at: physical.header.sim_time,
            queries,
            _reservation: reservation,
        })
    }

    pub(crate) fn queries(&self) -> &GeometryQueries {
        &self.queries
    }

    pub(crate) fn finish(
        self,
        mutation: &mut PhysicalMutation<'_>,
        mut answers: GeometryAnswers,
    ) -> Result<(), ExecutionError> {
        self.queries
            .validate_answers(&answers)
            .map_err(|_| ExecutionError::Invariant)?;
        let animal = mutation
            .state
            .entities
            .resolve(self.actor)
            .ok_or(ExecutionError::MissingEntity)?;
        let episode = animal
            .animal
            .as_ref()
            .and_then(|state| state.episode.as_ref())
            .ok_or(ExecutionError::Invariant)?;
        let proposal = episode.proposal.as_ref().ok_or(ExecutionError::Invariant)?;
        if animal.id != self.actor_id
            || self.at != mutation.state.header.sim_time
            || episode.id != self.episode_id
            || proposal.generation != self.generation
            || proposal.origin != self.origin
            || proposal
                .search
                .as_ref()
                .is_none_or(|search| search.attempted != self.attempted)
            || animal.body_profile().as_ref() != &self.queries.standing_columns[0].body
        {
            return Err(ExecutionError::Invariant);
        }
        let candidate = answers
            .standing_columns
            .pop()
            .ok_or(ExecutionError::Invariant)?
            .map(|selected| RefugeCandidate {
                id: self.attempted.to_string(),
                point: selected.point,
                retained: None,
                preferred: None,
            });
        mutation.reserve_response_growth(candidate.as_ref().map_or(0, |candidate| {
            size_of::<RefugeCandidate>()
                + candidate.id.capacity()
                + candidate.point.surface_id.capacity()
        }))?;
        let proposal = mutation
            .snapshot_episode(&self.actor_id)?
            .as_mut()
            .and_then(|episode| episode.proposal.as_mut())
            .ok_or(ExecutionError::Invariant)?;
        proposal.candidates = candidate.into_iter().collect();
        Ok(())
    }
}
