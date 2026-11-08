//! Remembered place preparation over immutable received facts. A missing or
//! invalidated index remains unavailable; acquiring one fact cannot establish
//! that every other label is unknown. This cache grants no current geometry.

use super::*;
use crate::encoding::json_record_len;
use crate::host::retained_size::{HeapBytes, heap_record, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::install::PersonalEvidencePreparationSettings;
use crate::reception::{
    EncounterExposure, EvidenceFamily, EvidenceSource, ObservationContribution, ObservationOrigin,
    ObservedLocation, SensoryFacet, SourceRevision,
};
use crate::text::JsText;
use std::mem::size_of;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PlaceProvenance {
    Observed,
    Testimony,
    Authored,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct KnownPlaceCapsule {
    pub place_id: String,
    pub label: JsText,
    pub location: ObservedLocation,
    pub source: EvidenceSource,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub facet_ordinal: u64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub source_event_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub personal_source: Option<PersonalSourceRef>,
    pub observed_at: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub observed_order: u64,
    pub acquired_at: f64,
    pub provenance: PlaceProvenance,
}
heap_record!(PersonalSourceRef { id, revision });
heap_record!(KnownPlaceCapsule {
    place_id,
    label,
    location,
    source,
    source_event_id,
    personal_source
});
struct PlaceCapsuleOwner {
    value: KnownPlaceCapsule,
    _reservation: ByteReservation,
}
pub struct PreparedKnownPlaceEvidence {
    capsules: Vec<Arc<PlaceCapsuleOwner>>,
    labels: IndexMap<JsText, Vec<usize>>,
    bytes: u64,
    _reservation: ByteReservation,
}
impl std::fmt::Debug for PreparedKnownPlaceEvidence {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("PreparedKnownPlaceEvidence")
            .field("capsules", &self.capsules.len())
            .field("bytes", &self.bytes)
            .finish()
    }
}
#[derive(Clone, Debug)]
pub(super) struct KnownPlacePreparation {
    value: Option<Arc<PreparedKnownPlaceEvidence>>,
    revision: u64,
}

impl KnownPlaceCapsule {
    fn validate(&self) -> Result<(), ExperienceError> {
        if self.place_id.is_empty()
            || self.label.trim_is_empty()
            || self.facet_ordinal > MAX_SAFE_INTEGER
            || !self.observed_at.is_finite()
            || !self.acquired_at.is_finite()
            || self.observed_at > self.acquired_at
            || self.observed_order > MAX_SAFE_INTEGER
            || self
                .personal_source
                .as_ref()
                .is_some_and(|source| !source.validate())
            || (self.provenance != PlaceProvenance::Authored
                && self.source_event_id.as_ref().is_none_or(String::is_empty))
            || self.source.validate().is_err()
            || self.location.validate().is_err()
        {
            return Err(ExperienceError::InvalidBody("remembered place capsule"));
        }
        Ok(())
    }
}
impl PreparedKnownPlaceEvidence {
    pub fn capsules(&self) -> impl Iterator<Item = &KnownPlaceCapsule> {
        self.capsules.iter().map(|owner| &owner.value)
    }
    pub fn matching(&self, label: &JsText) -> impl Iterator<Item = &KnownPlaceCapsule> {
        self.labels
            .get(label)
            .into_iter()
            .flatten()
            .map(|index| &self.capsules[*index].value)
    }
    pub fn bytes(&self) -> u64 {
        self.bytes
    }
    fn from_shared(
        capsules: Vec<Arc<PlaceCapsuleOwner>>,
        bytes: u64,
        budget: &ByteBudget,
    ) -> Result<Self, ExperienceError> {
        let key_bytes = capsules
            .iter()
            .try_fold(0usize, |bytes, capsule| {
                bytes.checked_add(capsule.value.label.storage_bytes())
            })
            .ok_or(ExperienceError::Capacity)?;
        let upper = heap_sum([
            size_of::<Self>() + 2 * size_of::<usize>(),
            capsules
                .capacity()
                .checked_mul(size_of::<Arc<PlaceCapsuleOwner>>())
                .ok_or(ExperienceError::Capacity)?,
            map_storage::<JsText, Vec<usize>>(
                capsules
                    .len()
                    .checked_mul(2)
                    .ok_or(ExperienceError::Capacity)?,
            )
            .ok_or(ExperienceError::Capacity)?,
            key_bytes,
            capsules
                .len()
                .checked_mul(2 * size_of::<usize>())
                .ok_or(ExperienceError::Capacity)?,
        ])
        .ok_or(ExperienceError::Capacity)?;
        let mut reservation = budget
            .reserve(upper)
            .map_err(|_| ExperienceError::Capacity)?;
        let mut labels = IndexMap::<JsText, Vec<usize>>::new();
        labels
            .try_reserve(capsules.len())
            .map_err(|_| ExperienceError::Capacity)?;
        for (index, capsule) in capsules.iter().enumerate() {
            labels
                .entry(capsule.value.label.clone())
                .or_default()
                .push(index);
        }
        let actual = heap_sum([
            size_of::<Self>() + 2 * size_of::<usize>(),
            capsules
                .capacity()
                .checked_mul(size_of::<Arc<PlaceCapsuleOwner>>())
                .ok_or(ExperienceError::Capacity)?,
            labels.heap_bytes().ok_or(ExperienceError::Capacity)?,
        ])
        .ok_or(ExperienceError::Capacity)?;
        reservation
            .resize(actual)
            .map_err(|_| ExperienceError::Capacity)?;
        Ok(Self {
            capsules,
            labels,
            bytes,
            _reservation: reservation,
        })
    }
    pub(crate) fn prepare(
        input: &[KnownPlaceCapsule],
        limits: &PersonalEvidencePreparationSettings,
        budget: &ByteBudget,
    ) -> Result<Self, ExperienceError> {
        if input.len() as u64 > limits.rows {
            return Err(ExperienceError::Unavailable);
        }
        let mut bytes = 0u64;
        for capsule in input {
            capsule.validate()?;
            bytes = bytes
                .checked_add(
                    json_record_len(capsule)
                        .map_err(|_| ExperienceError::InvalidBody("place encoding"))?
                        as u64,
                )
                .ok_or(ExperienceError::Capacity)?;
            if bytes > limits.bytes {
                return Err(ExperienceError::Unavailable);
            }
        }
        // Source preparation groups the final list by first label insertion,
        // preserving every duplicate place/label and each original row order.
        let metadata = heap_sum([
            map_storage::<&JsText, Vec<&KnownPlaceCapsule>>(
                input
                    .len()
                    .checked_mul(2)
                    .ok_or(ExperienceError::Capacity)?,
            )
            .ok_or(ExperienceError::Capacity)?,
            input
                .len()
                .checked_mul(
                    2 * size_of::<&KnownPlaceCapsule>() + size_of::<Arc<PlaceCapsuleOwner>>(),
                )
                .ok_or(ExperienceError::Capacity)?,
        ])
        .ok_or(ExperienceError::Capacity)?;
        let _scratch = budget
            .reserve(metadata)
            .map_err(|_| ExperienceError::Capacity)?;
        let mut grouped = IndexMap::<&JsText, Vec<&KnownPlaceCapsule>>::new();
        grouped
            .try_reserve(input.len())
            .map_err(|_| ExperienceError::Capacity)?;
        for capsule in input {
            grouped.entry(&capsule.label).or_default().push(capsule);
        }
        let mut capsules = Vec::new();
        capsules
            .try_reserve_exact(input.len())
            .map_err(|_| ExperienceError::Capacity)?;
        for capsule in grouped.values().flatten() {
            let bytes = heap_sum([
                size_of::<PlaceCapsuleOwner>(),
                2 * size_of::<usize>(),
                capsule.heap_bytes().ok_or(ExperienceError::Capacity)?,
            ])
            .ok_or(ExperienceError::Capacity)?;
            let reservation = budget
                .reserve(bytes)
                .map_err(|_| ExperienceError::Capacity)?;
            capsules.push(Arc::new(PlaceCapsuleOwner {
                value: (*capsule).clone(),
                _reservation: reservation,
            }));
        }
        Self::from_shared(capsules, bytes, budget)
    }
}

pub(crate) fn known_place_capsule(
    awareness: &Awareness,
    personal_source: Option<PersonalSourceRef>,
) -> Result<Option<KnownPlaceCapsule>, ExperienceError> {
    let Some(exposure @ EncounterExposure::Place { .. }) = awareness.exposure.as_ref() else {
        return Ok(None);
    };
    let Some(original) = awareness.observation.as_deref() else {
        return Ok(None);
    };
    place_capsule(original, exposure, &awareness.event_id, personal_source)
}
pub(super) fn place_capsule(
    observation: &ObservationContribution,
    exposure: &EncounterExposure,
    event_id: &str,
    personal_source: Option<PersonalSourceRef>,
) -> Result<Option<KnownPlaceCapsule>, ExperienceError> {
    let ObservationOrigin::Occurrence {
        event_id: original,
        order,
        ..
    } = &observation.origin
    else {
        return Ok(None);
    };
    if original != event_id {
        return Ok(None);
    }
    let EncounterExposure::Place {
        id,
        label,
        point,
        reported_by,
        ..
    } = exposure
    else {
        return Ok(None);
    };
    let point = json_record(point).map_err(|_| ExperienceError::InvalidBody("place point"))?;
    let location = observation.facets.iter().find(|facet| match &facet.value {
        SensoryFacet::Location {
            location: ObservedLocation::Point {
                point: location, ..
            },
            ..
        } => json_record(location).is_ok_and(|location| location == point),
        _ => false,
    });
    let Some(location) = location else {
        return Ok(None);
    };
    let SensoryFacet::Location {
        location: position, ..
    } = &location.value
    else {
        unreachable!()
    };
    Ok(Some(KnownPlaceCapsule {
        place_id: id.clone(),
        label: label.clone().into(),
        location: position.clone(),
        source: EvidenceSource {
            family: EvidenceFamily::NativeExposure,
            observer: observation.observer.clone(),
            id: observation.id.clone(),
            revision: SourceRevision::Number(observation.revision),
        },
        facet_ordinal: location.ordinal,
        source_event_id: Some(event_id.to_owned()),
        personal_source,
        observed_at: location.as_of,
        observed_order: *order,
        acquired_at: location.acquired_at,
        provenance: if reported_by.as_ref().is_some_and(|id| !id.is_empty()) {
            PlaceProvenance::Testimony
        } else {
            PlaceProvenance::Observed
        },
    }))
}

impl ExperienceState {
    pub(crate) fn known_place_revision(&self, actor_id: &str) -> u64 {
        self.known_places
            .get(actor_id)
            .map_or(0, |preparation| preparation.revision)
    }
    pub(crate) fn known_places(
        &self,
        actor_id: &str,
    ) -> Result<&PreparedKnownPlaceEvidence, ExperienceError> {
        self.known_places
            .get(actor_id)
            .and_then(|preparation| preparation.value.as_deref())
            .ok_or(ExperienceError::Unavailable)
    }
}
impl ExperienceJournal {
    fn replace_known_places(
        &mut self,
        state: &mut ExperienceState,
        actor_id: &str,
        value: Option<Arc<PreparedKnownPlaceEvidence>>,
        advance: bool,
    ) -> Result<(), ExperienceError> {
        let prior = state.known_places.get(actor_id);
        let revision = prior.map_or(0, |prior| prior.revision);
        let revision = if advance {
            revision
                .checked_add(1)
                .ok_or(ExperienceError::InvalidOrdinal)?
        } else {
            revision
        };
        let growth = map_storage::<String, KnownPlacePreparation>(
            state
                .known_places
                .capacity()
                .checked_mul(2)
                .and_then(|n| n.checked_add(2))
                .ok_or(ExperienceError::Capacity)?,
        )
        .ok_or(ExperienceError::Capacity)?;
        self.reservation
            .resize(
                heap_sum([
                    self.reservation.bytes(),
                    growth,
                    2 * size_of::<super::mutation::ExperienceUndo>(),
                    actor_id
                        .len()
                        .checked_mul(2)
                        .ok_or(ExperienceError::Capacity)?,
                ])
                .ok_or(ExperienceError::Capacity)?,
            )
            .map_err(|_| ExperienceError::Capacity)?;
        self.undo
            .try_reserve(1)
            .map_err(|_| ExperienceError::Capacity)?;
        state
            .known_places
            .try_reserve(1)
            .map_err(|_| ExperienceError::Capacity)?;
        let actor = actor_id.to_owned();
        let before = state.known_places.insert(
            actor_id.to_owned(),
            KnownPlacePreparation { value, revision },
        );
        self.undo
            .push(super::mutation::ExperienceUndo::KnownPlaces {
                actor_id: actor,
                before,
            });
        Ok(())
    }
    pub(crate) fn invalidate_known_places(
        &mut self,
        state: &mut ExperienceState,
        actor_id: &str,
    ) -> Result<(), ExperienceError> {
        self.replace_known_places(state, actor_id, None, true)
    }
    pub(crate) fn install_known_places(
        &mut self,
        state: &mut ExperienceState,
        actor_id: &str,
        expected_revision: u64,
        value: PreparedKnownPlaceEvidence,
    ) -> Result<(), ExperienceError> {
        if state.known_place_revision(actor_id) != expected_revision {
            return Err(ExperienceError::StaleHydration);
        }
        if value
            .capsules()
            .any(|capsule| capsule.source.observer.actor_id != actor_id)
        {
            return Err(ExperienceError::ForeignOwner);
        }
        self.replace_known_places(state, actor_id, Some(Arc::new(value)), false)
    }
    pub(crate) fn acquire_known_place_capsules(
        &mut self,
        state: &mut ExperienceState,
        actor_id: &str,
        incoming: &[KnownPlaceCapsule],
        limits: &PersonalEvidencePreparationSettings,
        budget: &ByteBudget,
    ) -> Result<(), ExperienceError> {
        if incoming.is_empty() {
            return Ok(());
        }
        let Some(current) = state
            .known_places
            .get(actor_id)
            .and_then(|preparation| preparation.value.as_ref())
        else {
            return self.invalidate_known_places(state, actor_id);
        };
        let capacity = current
            .capsules
            .len()
            .checked_add(incoming.len())
            .ok_or(ExperienceError::Capacity)?;
        let _scratch = budget
            .reserve(
                capacity
                    .checked_mul(size_of::<Arc<PlaceCapsuleOwner>>())
                    .ok_or(ExperienceError::Capacity)?,
            )
            .map_err(|_| ExperienceError::Capacity)?;
        let mut capsules = Vec::new();
        capsules
            .try_reserve_exact(capacity)
            .map_err(|_| ExperienceError::Capacity)?;
        capsules.extend(current.capsules.iter().cloned());
        let mut bytes = current.bytes;
        let mut changed = false;
        for capsule in incoming {
            if capsule.source.observer.actor_id != actor_id {
                return Err(ExperienceError::ForeignOwner);
            }
            let prior = capsules
                .iter()
                .find(|prior| prior.value.place_id == capsule.place_id);
            if prior.is_some_and(|prior| {
                prior.value.observed_at > capsule.observed_at
                    || (prior.value.observed_at == capsule.observed_at
                        && prior.value.observed_order > capsule.observed_order)
            }) {
                continue;
            }
            let encoded_len = json_record_len(capsule)
                .map_err(|_| ExperienceError::InvalidBody("place encoding"))?;
            let old_len = prior
                .map(|prior| json_record_len(&prior.value))
                .transpose()
                .map_err(|_| ExperienceError::InvalidBody("place encoding"))?
                .unwrap_or(0);
            let _encoded = budget
                .reserve(
                    encoded_len
                        .checked_add(old_len)
                        .and_then(|n| n.checked_mul(2))
                        .ok_or(ExperienceError::Capacity)?,
                )
                .map_err(|_| ExperienceError::Capacity)?;
            let encoded =
                json_record(capsule).map_err(|_| ExperienceError::InvalidBody("place encoding"))?;
            let old = prior
                .map(|prior| json_record(&prior.value))
                .transpose()
                .map_err(|_| ExperienceError::InvalidBody("place encoding"))?;
            if old.as_deref() == Some(encoded.as_str()) {
                continue;
            }
            bytes = bytes
                .checked_sub(old.as_ref().map_or(0, |old| old.len() as u64))
                .and_then(|bytes| bytes.checked_add(encoded.len() as u64))
                .ok_or(ExperienceError::InvalidOrdinal)?;
            let allocation = heap_sum([
                size_of::<PlaceCapsuleOwner>(),
                2 * size_of::<usize>(),
                capsule.heap_bytes().ok_or(ExperienceError::Capacity)?,
            ])
            .ok_or(ExperienceError::Capacity)?;
            let reservation = budget
                .reserve(allocation)
                .map_err(|_| ExperienceError::Capacity)?;
            capsules.retain(|prior| prior.value.place_id != capsule.place_id);
            capsules.push(Arc::new(PlaceCapsuleOwner {
                value: capsule.clone(),
                _reservation: reservation,
            }));
            changed = true;
        }
        if !changed {
            return Ok(());
        }
        if capsules.len() as u64 > limits.rows || bytes > limits.bytes {
            return self.invalidate_known_places(state, actor_id);
        }
        let prepared = PreparedKnownPlaceEvidence::from_shared(capsules, bytes, budget)?;
        self.replace_known_places(state, actor_id, Some(Arc::new(prepared)), true)
    }
    pub(crate) fn acquire_known_place_awareness(
        &mut self,
        state: &mut ExperienceState,
        awareness: &Awareness,
        limits: &PersonalEvidencePreparationSettings,
        budget: &ByteBudget,
    ) -> Result<(), ExperienceError> {
        if !matches!(awareness.exposure, Some(EncounterExposure::Place { .. }))
            || awareness.observation.is_none()
        {
            return Ok(());
        }
        let _scratch = budget
            .reserve(
                size_of::<KnownPlaceCapsule>()
                    .checked_add(awareness.heap_bytes().ok_or(ExperienceError::Capacity)?)
                    .and_then(|n| n.checked_mul(2))
                    .ok_or(ExperienceError::Capacity)?,
            )
            .map_err(|_| ExperienceError::Capacity)?;
        let capsule = known_place_capsule(awareness, None)?
            .ok_or(ExperienceError::InvalidBody("acquired place original"))?;
        self.acquire_known_place_capsules(
            state,
            &awareness.actor_id,
            std::slice::from_ref(&capsule),
            limits,
            budget,
        )
    }
}

/// The exact selected sparse support remains the source; projection never
/// invents a visit from a live definition or a retired prose account.
pub(crate) struct OwnedPlaceCapsules {
    values: Vec<KnownPlaceCapsule>,
    _reservation: ByteReservation,
}
impl OwnedPlaceCapsules {
    pub(crate) fn capsules(&self) -> &[KnownPlaceCapsule] {
        &self.values
    }
}
pub(crate) fn temporal_known_place_capsules(
    actor_id: &str,
    support: &crate::received::TemporalSupportCapsule,
    budget: &ByteBudget,
) -> Result<OwnedPlaceCapsules, ExperienceError> {
    use crate::received::ReceivedValueFragment;
    let receipt = &support.receipt;
    if receipt.locator.actor_id != actor_id || receipt.facets.len() != support.values.len() {
        return Err(ExperienceError::ForeignOwner);
    }
    let Some(ObservationOrigin::Occurrence {
        event_id, order, ..
    }) = receipt.origin.as_ref()
    else {
        return Ok(OwnedPlaceCapsules {
            values: Vec::new(),
            _reservation: budget
                .reserve(size_of::<OwnedPlaceCapsules>())
                .map_err(|_| ExperienceError::Capacity)?,
        });
    };
    let mut heap = receipt.heap_bytes().ok_or(ExperienceError::Capacity)?;
    for value in support.values.iter() {
        heap = heap
            .checked_add(size_of::<KnownPlaceCapsule>())
            .and_then(|n| n.checked_add(value.heap_bytes()?))
            .ok_or(ExperienceError::Capacity)?;
    }
    let reservation = budget
        .reserve(
            heap.checked_mul(2)
                .and_then(|n| n.checked_add(size_of::<OwnedPlaceCapsules>()))
                .ok_or(ExperienceError::Capacity)?,
        )
        .map_err(|_| ExperienceError::Capacity)?;
    let mut values = Vec::new();
    values
        .try_reserve_exact(support.values.len())
        .map_err(|_| ExperienceError::Capacity)?;
    for (index, value) in support.values.iter().enumerate() {
        let ReceivedValueFragment::Sensory(SensoryFacet::EncounterExposure {
            exposure:
                EncounterExposure::Place {
                    id,
                    label,
                    point,
                    reported_by,
                    ..
                },
        }) = value
        else {
            continue;
        };
        let source = receipt
            .facets
            .get(index)
            .and_then(|field| field.original.as_ref())
            .map(|fact| &fact.source);
        let point = json_record(point).map_err(|_| ExperienceError::InvalidBody("place point"))?;
        let source = json_record(&source)
            .map_err(|_| ExperienceError::InvalidBody("place original source"))?;
        let location_index = support
            .values
            .iter()
            .enumerate()
            .find_map(|(ordinal, value)| {
                let ReceivedValueFragment::Location(location) = value else {
                    return None;
                };
                let ObservedLocation::Point {
                    point: location_point,
                    ..
                } = &location.location
                else {
                    return None;
                };
                if json_record(location_point).ok().as_deref() != Some(point.as_str()) {
                    return None;
                }
                let candidate_source = receipt
                    .facets
                    .get(ordinal)
                    .and_then(|field| field.original.as_ref())
                    .map(|fact| &fact.source);
                (json_record(&candidate_source).ok().as_deref() == Some(source.as_str()))
                    .then_some(ordinal)
            })
            .ok_or(ExperienceError::InvalidBody("sparse place location"))?;
        let ReceivedValueFragment::Location(location) = &support.values[location_index] else {
            unreachable!()
        };
        let fact = &receipt.facets[location_index];
        let original = fact
            .original
            .as_ref()
            .ok_or(ExperienceError::InvalidBody("sparse place original"))?;
        if original.source.observer.actor_id != actor_id
            || original.source.observer.physical_life != receipt.locator.physical_life
        {
            return Err(ExperienceError::ForeignOwner);
        }
        values.push(KnownPlaceCapsule {
            place_id: id.clone(),
            label: label.clone().into(),
            location: location.location.clone(),
            source: original.source.clone(),
            facet_ordinal: original.ordinal,
            source_event_id: Some(event_id.clone()),
            personal_source: None,
            observed_at: fact.clock.as_of,
            observed_order: *order,
            acquired_at: fact.clock.acquired_at,
            provenance: if reported_by.as_ref().is_some_and(|id| !id.is_empty()) {
                PlaceProvenance::Testimony
            } else {
                PlaceProvenance::Observed
            },
        });
    }
    Ok(OwnedPlaceCapsules {
        values,
        _reservation: reservation,
    })
}

/// Borrow the same candidate's generic place preparation owner when a sparse
/// support changes. The semantic support writer supplies the actual before/after
/// bodies; this context cannot install canonical history or invent a visit.
pub(crate) struct KnownPlaceMutation<'a> {
    pub state: &'a mut ExperienceState,
    pub journal: &'a mut ExperienceJournal,
    pub limits: &'a PersonalEvidencePreparationSettings,
    pub budget: &'a ByteBudget,
}
impl KnownPlaceMutation<'_> {
    pub(crate) fn support_changed(
        &mut self,
        actor_id: &str,
        before: Option<&crate::received::TemporalSupportCapsule>,
        after: Option<&crate::received::TemporalSupportCapsule>,
    ) -> Result<(), ExperienceError> {
        let before = before
            .map(|capsule| temporal_known_place_capsules(actor_id, capsule, self.budget))
            .transpose()?;
        let after = after
            .map(|capsule| temporal_known_place_capsules(actor_id, capsule, self.budget))
            .transpose()?;
        let previous = before
            .as_ref()
            .map_or(&[][..], OwnedPlaceCapsules::capsules);
        let next = after.as_ref().map_or(&[][..], OwnedPlaceCapsules::capsules);
        if previous == next {
            return Ok(());
        }
        if !previous.is_empty() {
            self.journal.invalidate_known_places(self.state, actor_id)?;
        }
        self.journal.acquire_known_place_capsules(
            self.state,
            actor_id,
            next,
            self.limits,
            self.budget,
        )
    }
}
