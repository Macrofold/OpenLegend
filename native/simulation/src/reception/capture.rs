//! Owned closure of the actual observer's current originals. This cut keeps no
//! entity store, world pointer, name resolver or later live-value lookup.

use super::retained_size::{HeapBytes, heap_sum, map_storage};
use super::*;
use crate::host::{ByteBudget, ByteReservation};
use crate::received::{ReceivedError, ReceivedValueFragment, ReceivedValueRecord};
use crate::state::Entity;
use indexmap::IndexMap;
use std::mem::{align_of, size_of};
use std::sync::Arc;

fn unavailable() -> ReceivedError {
    ReceivedError("Selected personal received closure is unavailable or incompatible.")
}
fn capacity() -> ReceivedError {
    ReceivedError("Selected personal received capture exceeds native byte allowance.")
}

fn arc_bytes<T: HeapBytes>(value: &T) -> Option<usize> {
    // Arc's two reference counters and possible alignment padding remain with
    // the retained allocation. Allocator book-keeping is measured by NSC RSS.
    heap_sum([
        size_of::<T>(),
        value.heap_bytes()?,
        2 * size_of::<usize>(),
        align_of::<T>() - 1,
    ])
}

pub struct CapturedReceivedOriginals {
    observer: ObserverLife,
    originals: Vec<Arc<ReceivedObservation>>,
    values: IndexMap<String, Arc<ReceivedValueRecord>>,
    _reservation: ByteReservation,
}

impl ReceivedValueLookup for CapturedReceivedOriginals {
    fn shared_value(&self, id: &str) -> Option<&ReceivedValueFragment> {
        self.values.get(id).map(|record| &record.value)
    }
}

/// The materialized value and its capacity move together into the final scoped
/// consumer product. A caller cannot release the reservation while the output
/// it transfers still retains this observation allocation.
pub struct OwnedObservation {
    value: Arc<ObservationContribution>,
    reservation: ByteReservation,
}

impl OwnedObservation {
    pub fn observation(&self) -> &ObservationContribution {
        &self.value
    }
    pub(crate) fn into_parts(self) -> (Arc<ObservationContribution>, ByteReservation) {
        (self.value, self.reservation)
    }
}

/// A validated stored geometry feature already retains its complete original.
/// A detached permitted product funds that exact selected observation before
/// copying it; it never reacquires or renews a sensory measurement.
pub(crate) fn capture_stored_observation(
    observation: &ObservationContribution,
    budget: &ByteBudget,
) -> Result<OwnedObservation, ReceivedError> {
    let reservation = budget
        .reserve(arc_bytes(observation).ok_or_else(capacity)?)
        .map_err(|_| capacity())?;
    Ok(OwnedObservation {
        value: Arc::new(observation.clone()),
        reservation,
    })
}

impl CapturedReceivedOriginals {
    pub fn observer(&self) -> &ObserverLife {
        &self.observer
    }
    pub fn originals(&self) -> impl Iterator<Item = &ReceivedObservation> {
        self.originals.iter().map(Arc::as_ref)
    }
    pub fn len(&self) -> usize {
        self.originals.len()
    }
    pub fn is_empty(&self) -> bool {
        self.originals.is_empty()
    }

    /// Admission walks the same selected fields before allocating the expanded
    /// output. Neutral body detail and its independently received pose are each
    /// copied only into this requested original's actual result.
    pub fn materialize(
        &self,
        index: usize,
        budget: &ByteBudget,
    ) -> Result<OwnedObservation, ReceivedError> {
        let source = self.originals.get(index).ok_or_else(unavailable)?;
        materialize_owned_observation(self, source, budget)
    }
}

/// The producing acquisition owner already proved this exact source. Reuse the
/// same bounded materializer without retaining every other phase original.
pub(crate) fn materialize_owned_observation(
    values: &impl ReceivedValueLookup,
    source: &ReceivedObservation,
    budget: &ByteBudget,
) -> Result<OwnedObservation, ReceivedError> {
    let header = received_observation_header(values, source)?;
    let mut heap = heap_sum([
        source.id.capacity(),
        source.origin.heap_bytes().ok_or_else(capacity)?,
        source.context.heap_bytes().ok_or_else(capacity)?,
        header.heap_bytes().ok_or_else(capacity)?,
        if header.channel.is_none() {
            source.channel.heap_bytes().ok_or_else(capacity)?
        } else {
            0
        },
        source
            .facets
            .len()
            .checked_mul(size_of::<ObservationFacet>())
            .ok_or_else(capacity)?,
    ])
    .ok_or_else(capacity)?;
    for facet in &source.facets {
        heap = heap
            .checked_add(facet.support.heap_bytes().ok_or_else(capacity)?)
            .ok_or_else(capacity)?;
        let descriptor = &facet.value;
        let value = if descriptor.kind == "body" {
            let (details, pose) =
                received_body_parts(values, descriptor).ok_or_else(unavailable)?;
            heap_sum([
                details.heap_bytes().ok_or_else(capacity)?,
                pose.heap_bytes().ok_or_else(capacity)?,
            ])
            .ok_or_else(capacity)?
        } else if descriptor.kind == "location" {
            let Some(FacetReception::Location { frame_ref }) = &descriptor.reception else {
                return Err(unavailable());
            };
            let frame = received_observation_frame(values, frame_ref)?;
            let location = match values.value_at(&descriptor.reference) {
                Some(ReceivedValueFragment::Location(value)) => {
                    value.location.heap_bytes().ok_or_else(capacity)?
                }
                Some(ReceivedValueFragment::BodyPose(_)) => 0,
                _ => return Err(unavailable()),
            };
            heap_sum([location, frame.heap_bytes().ok_or_else(capacity)?]).ok_or_else(capacity)?
        } else {
            let Some(ReceivedValueFragment::Sensory(value)) =
                values.value_at(&descriptor.reference)
            else {
                return Err(unavailable());
            };
            if value.kind() != descriptor.kind || descriptor.reception.is_some() {
                return Err(unavailable());
            }
            value.heap_bytes().ok_or_else(capacity)?
        };
        heap = heap.checked_add(value).ok_or_else(capacity)?;
    }
    let bytes = heap_sum([
        size_of::<OwnedObservation>(),
        size_of::<ObservationContribution>(),
        heap,
        2 * size_of::<usize>(),
        align_of::<ObservationContribution>() - 1,
    ])
    .ok_or_else(capacity)?;
    let mut reservation = budget.reserve(bytes).map_err(|_| capacity())?;
    let value = materialize_observation(values, source)?;
    let actual = size_of::<OwnedObservation>()
        .checked_add(arc_bytes(&value).ok_or_else(capacity)?)
        .ok_or_else(capacity)?;
    reservation.resize(actual).map_err(|_| capacity())?;
    Ok(OwnedObservation {
        value: Arc::new(value),
        reservation,
    })
}

impl ReceptionState {
    pub fn capture_current_received_originals(
        &self,
        observer: &Entity,
        budget: &ByteBudget,
    ) -> Result<CapturedReceivedOriginals, ReceivedError> {
        let actor = observer.actor.as_ref().ok_or_else(unavailable)?;
        let life = actor.physical_life.unwrap_or(0);
        let sources = self
            .perception_evidence
            .as_ref()
            .and_then(|owners| owners.get(&observer.id))
            .filter(|owner| owner.life == life)
            .map(|owner| owner.received.as_slice())
            .unwrap_or(&[]);
        let live_values = self.received_values.as_ref();
        let mut references = 0_usize;
        let mut preflight = size_of::<CapturedReceivedOriginals>()
            .checked_add(observer.id.len())
            .ok_or_else(capacity)?;
        preflight = preflight
            .checked_add(
                sources
                    .len()
                    .checked_mul(size_of::<Arc<ReceivedObservation>>())
                    .ok_or_else(capacity)?,
            )
            .ok_or_else(capacity)?;
        for source in sources {
            let header = received_observation_header(&live_values, source)?;
            if header.observer.actor_id != observer.id || header.observer.physical_life != life {
                return Err(unavailable());
            }
            preflight = preflight
                .checked_add(arc_bytes(source.as_ref()).ok_or_else(capacity)?)
                .ok_or_else(capacity)?;
            for id in received_observation_value_references(source) {
                references = references.checked_add(1).ok_or_else(capacity)?;
                let record = live_values
                    .and_then(|values| values.shared_record(id))
                    .ok_or_else(unavailable)?;
                preflight = heap_sum([
                    preflight,
                    id.len(),
                    arc_bytes(record.as_ref()).ok_or_else(capacity)?,
                ])
                .ok_or_else(capacity)?;
            }
        }
        let map_capacity_bound = references.checked_mul(2).ok_or_else(capacity)?;
        preflight = preflight
            .checked_add(
                map_storage::<String, Arc<ReceivedValueRecord>>(map_capacity_bound)
                    .ok_or_else(capacity)?,
            )
            .ok_or_else(capacity)?;
        let mut reservation = budget.reserve(preflight).map_err(|_| capacity())?;
        let mut originals = Vec::new();
        originals
            .try_reserve_exact(sources.len())
            .map_err(|_| capacity())?;
        let mut values = IndexMap::new();
        values.try_reserve(references).map_err(|_| capacity())?;
        for source in sources {
            originals.push(Arc::clone(source));
            for id in received_observation_value_references(source) {
                if !values.contains_key(id) {
                    let record = live_values
                        .and_then(|values| values.shared_record(id))
                        .ok_or_else(unavailable)?;
                    values.insert(id.to_owned(), Arc::clone(record));
                }
            }
        }
        let observer = ObserverLife {
            actor_id: observer.id.clone(),
            physical_life: life,
        };
        let mut retained = heap_sum([
            size_of::<CapturedReceivedOriginals>(),
            observer.actor_id.capacity(),
            originals
                .capacity()
                .checked_mul(size_of::<Arc<ReceivedObservation>>())
                .ok_or_else(capacity)?,
            map_storage::<String, Arc<ReceivedValueRecord>>(values.capacity())
                .ok_or_else(capacity)?,
        ])
        .ok_or_else(capacity)?;
        for (index, original) in originals.iter().enumerate() {
            if originals[..index]
                .iter()
                .any(|prior| Arc::ptr_eq(prior, original))
            {
                continue;
            }
            retained = retained
                .checked_add(arc_bytes(original.as_ref()).ok_or_else(capacity)?)
                .ok_or_else(capacity)?;
        }
        for (id, record) in &values {
            retained = heap_sum([
                retained,
                id.capacity(),
                arc_bytes(record.as_ref()).ok_or_else(capacity)?,
            ])
            .ok_or_else(capacity)?;
        }
        reservation.resize(retained).map_err(|_| capacity())?;
        Ok(CapturedReceivedOriginals {
            observer,
            originals,
            values,
            _reservation: reservation,
        })
    }
}
