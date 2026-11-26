//! Shared original-revision integrity across receiver, geometry and personal
//! sources. A repeated address never grants a different remembered body.

use super::retained_size::{HeapBytes, heap_sum, map_storage};
use super::*;
use crate::host::{ByteBudget, ByteReservation};
use crate::received::ReceivedError;
use std::mem::size_of;

fn invalid() -> ReceivedError {
    ReceivedError("Invalid acquired perception evidence or conflicting original revision.")
}
fn capacity() -> ReceivedError {
    ReceivedError("Native original validation exceeds byte allowance.")
}

/// One import/validation scope, shared by all actual source owners. It retains
/// only validated originals and releases them when validation finishes.
pub(crate) struct OriginalRevisionRegistry {
    originals: IndexMap<String, ObservationContribution>,
    reservation: ByteReservation,
    budget: ByteBudget,
}
impl OriginalRevisionRegistry {
    pub(crate) fn new(budget: &ByteBudget) -> Result<Self, ReceivedError> {
        Ok(Self {
            originals: IndexMap::new(),
            reservation: budget.reserve(size_of::<Self>()).map_err(|_| capacity())?,
            budget: budget.clone(),
        })
    }
    pub(crate) fn validate(
        &mut self,
        value: &ObservationContribution,
    ) -> Result<(), ReceivedError> {
        let bound = observation_validation_bound(value)?;
        let _temporary = self.budget.reserve(bound).map_err(|_| capacity())?;
        validate_observation_contribution(value)?;
        let key = crate::encoding::json_record(&(&value.observer, &value.id, value.revision))
            .map_err(|_| invalid())?;
        if let Some(prior) = self.originals.get(&key) {
            return if prior == value {
                Ok(())
            } else {
                Err(invalid())
            };
        }
        let growth = if self.originals.len() == self.originals.capacity() {
            map_storage::<String, ObservationContribution>(2 * (self.originals.len() + 1))
                .ok_or_else(capacity)?
        } else {
            0
        };
        self.reservation
            .resize(
                heap_sum([self.reservation.bytes(), bound, key.capacity(), growth])
                    .ok_or_else(capacity)?,
            )
            .map_err(|_| capacity())?;
        self.originals.try_reserve(1).map_err(|_| capacity())?;
        self.originals.insert(key, value.clone());
        Ok(())
    }
    pub(crate) fn validate_received(
        &mut self,
        values: &impl ReceivedValueLookup,
        source: &ReceivedObservation,
    ) -> Result<(), ReceivedError> {
        let bound = materialized_observation_bound(values, source)?;
        let _temporary = self.budget.reserve(bound).map_err(|_| capacity())?;
        for (index, facet) in source.facets.iter().enumerate() {
            if facet.ordinal.is_some_and(|ordinal| ordinal != index as u64)
                || [
                    facet.as_of,
                    facet.measured_from,
                    facet.measured_through,
                    facet.acquired_at,
                ]
                .into_iter()
                .flatten()
                .any(|time| !time.is_finite())
            {
                return Err(invalid());
            }
            validate_received_facet(values, &facet.value)?;
        }
        let full = materialize_observation(values, source)?;
        self.validate(&full)
    }
}

fn observation_validation_bound(value: &ObservationContribution) -> Result<usize, ReceivedError> {
    heap_sum([
        size_of::<ObservationContribution>(),
        value
            .heap_bytes()
            .ok_or_else(capacity)?
            .checked_mul(3)
            .ok_or_else(capacity)?,
        value
            .facets
            .len()
            .checked_mul(size_of::<ObservationFacet>() + size_of::<usize>() * 8)
            .ok_or_else(capacity)?,
    ])
    .ok_or_else(capacity)
}
pub(crate) fn materialized_observation_bound(
    values: &impl ReceivedValueLookup,
    source: &ReceivedObservation,
) -> Result<usize, ReceivedError> {
    let header = received_observation_header(values, source)?;
    let mut heap = heap_sum([
        source.heap_bytes().ok_or_else(capacity)?,
        header.heap_bytes().ok_or_else(capacity)?,
    ])
    .ok_or_else(capacity)?;
    for facet in &source.facets {
        let mut references =
            std::iter::once(&facet.value.reference).chain(match &facet.value.reception {
                Some(FacetReception::Body { pose_ref }) => Some(pose_ref),
                Some(FacetReception::Location { frame_ref }) => Some(frame_ref),
                None => None,
            });
        for reference in &mut references {
            heap = heap
                .checked_add(
                    values
                        .value_at(reference)
                        .ok_or_else(invalid)?
                        .heap_bytes()
                        .ok_or_else(capacity)?,
                )
                .ok_or_else(capacity)?;
        }
    }
    heap_sum([
        size_of::<ObservationContribution>(),
        source
            .facets
            .len()
            .checked_mul(size_of::<ObservationFacet>())
            .ok_or_else(capacity)?,
        heap.checked_mul(3).ok_or_else(capacity)?,
    ])
    .ok_or_else(capacity)
}

pub(crate) fn validate_observation_contribution(
    observation: &ObservationContribution,
) -> Result<(), ReceivedError> {
    if !observation.id.starts_with("perception-observation-")
        || observation.revision < 1
        || !observation.acquired_at.is_finite()
        || observation.detector.version < 1
        || observation
            .channel
            .as_ref()
            .is_some_and(|pin| !pin.is_valid())
        || matches!(observation.origin, ObservationOrigin::Exposure { .. })
            && observation.channel.is_none()
            && observation
                .facets
                .iter()
                .any(|facet| facet.role == FacetRole::Direct)
    {
        return Err(invalid());
    }
    if let Some(context) = &observation.context {
        let mut tracks = std::collections::BTreeSet::new();
        if context.subjects.is_empty()
            || context.subjects.iter().any(|subject| {
                subject.validate().is_err()
                    || subject.observer != observation.observer
                    || !tracks.insert(subject.track.as_str())
            })
        {
            return Err(invalid());
        }
    }
    observation
        .origin
        .validate(&observation.observer, observation.acquired_at)
        .map_err(|_| invalid())?;
    for (index, facet) in observation.facets.iter().enumerate() {
        if facet.ordinal != index as u64
            || ![
                facet.as_of,
                facet.measured_from,
                facet.measured_through,
                facet.acquired_at,
            ]
            .into_iter()
            .all(f64::is_finite)
            || facet.measured_through < facet.measured_from
            || facet.measured_through > facet.acquired_at
            || facet.acquired_at > observation.acquired_at
        {
            return Err(invalid());
        }
        if let Some(support) = &facet.support {
            support
                .validate(&observation.observer, observation.acquired_at)
                .map_err(|_| invalid())?;
        }
        facet.value.validate().map_err(|_| invalid())?;
        facet
            .value
            .validate_participant_observers(&observation.observer)
            .map_err(|_| invalid())?;
        if let SensoryFacet::ObservedMotion { earlier, later, .. } = &facet.value {
            if [earlier, later].into_iter().any(|sample| {
                sample.acquired_at > observation.acquired_at
                    || sample.confirmed_through > observation.acquired_at
            }) {
                return Err(invalid());
            }
        }
    }
    Ok(())
}
pub(crate) fn validate_received_facet(
    values: &impl ReceivedValueLookup,
    input: &ReceivedFacetValue,
) -> Result<SensoryFacet, ReceivedError> {
    if !input.validate_kind()
        || match &input.reception {
            Some(FacetReception::Body { .. }) => input.kind != "body",
            Some(FacetReception::Location { .. }) => input.kind != "location",
            None => matches!(input.kind.as_str(), "body" | "location"),
        }
    {
        return Err(invalid());
    }
    let value = received_facet_value(values, input)?
        .filter(|value| value.kind() == input.kind)
        .ok_or_else(invalid)?;
    value.validate().map_err(|_| invalid())?;
    Ok(value)
}
