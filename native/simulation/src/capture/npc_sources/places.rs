//! A Known places page admits only its selected canonical personal/support
//! sources. SQL witnesses never turn a current place definition into a visit.
use super::*;
use crate::experience::KnownPlaceCapsule;
use crate::host::retained_size::heap_record;
use crate::received::{ReceivedValueFragment, TemporalSupportCollection};
use crate::reception::{EncounterExposure, ObservationOrigin, SensoryFacet};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RuntimeKnownPlaceWitness {
    pub capsule: KnownPlaceCapsule,
    pub exposure: EncounterExposure,
}
heap_record!(RuntimeKnownPlaceWitness { capsule, exposure });

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct PlaceSourcesRequest {
    places: Vec<RuntimeKnownPlaceWitness>,
    personal_rows: NpcSourceRows,
    supports: Vec<InstalledRow>,
}

/// These actual immutable bodies and their pins survive until the originating
/// private reader releases them. No full known-place cache is installed.
pub(crate) struct PreparedKnownPlaceSources {
    _personal: PreparedNpcSources,
    _supports: Option<TemporalSupportCollection>,
    _support_pins: Vec<(Arc<SharedMemoryPin>, Arc<SharedMemoryPin>)>,
    _storage: ByteReservation,
}

impl PreparedKnownPlaceSources {
    pub(crate) fn prepare(
        state: &SimulationState,
        scope: Arc<NpcHistoricalScope>,
        input: &[u8],
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let text = std::str::from_utf8(input).map_err(|_| ExecutionError::InvalidCheckpoint)?;
        let element = [
            size_of::<RuntimeKnownPlaceWitness>(),
            size_of::<NpcPersonalSourceRow>(),
            size_of::<InstalledRow>(),
            size_of::<crate::records::SqlCell>(),
            size_of::<serde::__private229::de::Content<'static>>(),
        ]
        .into_iter()
        .max()
        .unwrap_or(0);
        let _decode = crate::install::reserve_typed_parse::<PlaceSourcesRequest>(
            text,
            element,
            Some(size_of::<(
                usize,
                String,
                serde::__private229::de::Content<'static>,
            )>()),
            budget,
        )
        .map_err(|error| match error {
            crate::install::InstallError::Capacity => ExecutionError::Capacity,
            _ => ExecutionError::InvalidCheckpoint,
        })?;
        let request: PlaceSourcesRequest =
            serde_json::from_str(text).map_err(|_| ExecutionError::InvalidCheckpoint)?;
        Self::validate_sources(
            state,
            scope,
            &request.places,
            request.personal_rows,
            request.supports,
            budget,
        )
    }

    /// The direct server already owns the exact SQL witnesses. Share their
    /// validation with the encoded addon path without another JSON product.
    pub(crate) fn prepare_direct(
        state: &SimulationState,
        scope: Arc<NpcHistoricalScope>,
        places: &[RuntimeKnownPlaceWitness],
        personal: Vec<(PersonalSourceKind, InstalledRow)>,
        supports: Vec<InstalledRow>,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let _headers = budget.reserve(
            personal
                .len()
                .checked_mul(size_of::<NpcPersonalSourceRow>())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Self::validate_sources(
            state,
            scope,
            places,
            NpcSourceRows {
                pages: Vec::new(),
                values: Vec::new(),
                personal: personal
                    .into_iter()
                    .map(|(kind, row)| NpcPersonalSourceRow::Current { kind, row })
                    .collect(),
                parents: Vec::new(),
                duplicate_summary: None,
            },
            supports,
            budget,
        )
    }

    fn validate_sources(
        state: &SimulationState,
        scope: Arc<NpcHistoricalScope>,
        places: &[RuntimeKnownPlaceWitness],
        personal_rows: NpcSourceRows,
        support_rows: Vec<InstalledRow>,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        if !personal_rows.pages.is_empty()
            || !personal_rows.values.is_empty()
            || !personal_rows.parents.is_empty()
            || personal_rows.duplicate_summary.is_some()
        {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        let actor = scope.actor_id.as_str();
        let mut scratch_bytes = places
            .len()
            .checked_mul(size_of::<NpcPersonalSelection>() + size_of::<bool>())
            .ok_or(ExecutionError::Capacity)?;
        for selected in places {
            scratch_bytes = scratch_bytes
                .checked_add(
                    selected
                        .capsule
                        .personal_source
                        .heap_bytes()
                        .ok_or(ExecutionError::Capacity)?,
                )
                .ok_or(ExecutionError::Capacity)?;
        }
        let coverage = if support_rows.is_empty() {
            None
        } else {
            Some(
                state
                    .temporal
                    .actor(actor)
                    .and_then(|history| history.supports())
                    .ok_or(ExecutionError::InvalidCheckpoint)?
                    .coverage(),
            )
        };
        if let Some(coverage) = coverage {
            scratch_bytes = scratch_bytes
                .checked_add(coverage.table.len())
                .and_then(|n| n.checked_add(coverage.owner.len()))
                .ok_or(ExecutionError::Capacity)?;
        }
        let _scratch = budget.reserve(scratch_bytes)?;
        let mut personal = Vec::new();
        personal
            .try_reserve_exact(places.len())
            .map_err(|_| ExecutionError::Capacity)?;
        for selected in places {
            if selected.capsule.source.observer.actor_id != actor
                || !selected.exposure.validate()
                || !matches!(&selected.exposure, EncounterExposure::Place { id, .. } if *id == selected.capsule.place_id)
            {
                return Err(ExecutionError::InvalidCheckpoint);
            }
            if let Some(reference) = &selected.capsule.personal_source {
                if !personal
                    .iter()
                    .any(|prior: &NpcPersonalSelection| prior.reference == *reference)
                {
                    personal.push(NpcPersonalSelection {
                        reference: reference.clone(),
                        through: None,
                    });
                }
            }
        }
        let selection = NpcSourceSelection {
            receipts: Vec::new(),
            personal,
            consolidation_job: None,
        };
        let personal = PreparedNpcSources::prepare(
            state,
            Arc::clone(&scope),
            cursor::NpcPersonalScope::capture(state, actor)?,
            &selection,
            personal_rows,
            budget,
        )?;
        if !personal.unavailable_personal.is_empty()
            || personal.personal.len() != selection.personal.len()
        {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        let mut matched = Vec::new();
        matched
            .try_reserve_exact(places.len())
            .map_err(|_| ExecutionError::Capacity)?;
        matched.resize(places.len(), false);
        for source in &personal.personal {
            // An awareness account has its own exact exposure field. Retained
            // memory/summary originals instead carry encounter-exposure facets.
            #[derive(Deserialize)]
            struct AwarenessExposure {
                exposure: Option<EncounterExposure>,
            }
            let _awareness_decode;
            let direct = if source.record.header().reference.kind == PersonalSourceKind::Awareness {
                _awareness_decode = Some(budget.reserve(crate::experience::encoded_body_bound(
                    source.record.payload(),
                )?)?);
                Some(
                    serde_json::from_str::<AwarenessExposure>(source.record.payload())
                        .map_err(|_| ExecutionError::InvalidCheckpoint)?
                        .exposure,
                )
            } else {
                _awareness_decode = None;
                None
            };
            for (index, selected) in places.iter().enumerate() {
                if selected.capsule.personal_source.as_ref()
                    != Some(&source.record.header().reference)
                {
                    continue;
                }
                for original in source.originals.observations() {
                    let ObservationOrigin::Occurrence { event_id, .. } = &original.origin else {
                        continue;
                    };
                    // Awareness binds its own occurrence, as known_place_capsule
                    // does; a retained memory/summary names the original's event.
                    let event_id = if direct.is_some() {
                        let Some(event_id) = source.record.header().event_id.as_ref() else {
                            continue;
                        };
                        event_id
                    } else {
                        event_id
                    };
                    let exposed = match &direct {
                        Some(value) => value.as_ref() == Some(&selected.exposure),
                        None => original.facets.iter().any(|facet| matches!(&facet.value,
                            SensoryFacet::EncounterExposure { exposure } if exposure == &selected.exposure)),
                    };
                    if !exposed {
                        continue;
                    }
                    let _derived = budget.reserve(
                        size_of::<KnownPlaceCapsule>()
                            .checked_add(original.heap_bytes().ok_or(ExecutionError::Capacity)?)
                            .and_then(|n| n.checked_add(selected.heap_bytes()?))
                            .ok_or(ExecutionError::Capacity)?,
                    )?;
                    matched[index] |= crate::experience::places::place_capsule(
                        original,
                        &selected.exposure,
                        event_id,
                        Some(source.record.header().reference.clone()),
                    )?
                    .as_ref()
                        == Some(&selected.capsule);
                }
            }
        }
        let mut storage = budget.reserve(
            size_of::<Self>()
                .checked_add(
                    support_rows
                        .len()
                        .checked_mul(size_of::<(Arc<SharedMemoryPin>, Arc<SharedMemoryPin>)>())
                        .ok_or(ExecutionError::Capacity)?,
                )
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut pins = Vec::new();
        pins.try_reserve_exact(support_rows.len())
            .map_err(|_| ExecutionError::Capacity)?;
        let supports = coverage
            .map(|coverage| {
                let decode_bytes = support_rows.iter().try_fold(
                    map_storage::<String, Arc<crate::received::TemporalSupportRecord>>(
                        support_rows
                            .len()
                            .checked_mul(2)
                            .ok_or(ExecutionError::Capacity)?,
                    )
                    .ok_or(ExecutionError::Capacity)?,
                    |bytes, row| -> Result<usize, ExecutionError> {
                        bytes
                            .checked_add(crate::experience::encoded_body_bound(&row.payload)?)
                            .and_then(|n| n.checked_add(row.slot.len()))
                            .ok_or(ExecutionError::Capacity)
                    },
                )?;
                let _decode = budget.reserve(decode_bytes)?;
                let mut selected_coverage = coverage.clone();
                // This detached collection contains the supplied exact rows, not
                // a complete replacement of the live canonical support collection.
                selected_coverage.complete = false;
                Ok::<_, ExecutionError>(TemporalSupportCollection::install(
                    actor,
                    support_rows,
                    selected_coverage,
                    state.physical.header.sim_time,
                    state.reception.received_values.as_ref(),
                    budget,
                    &state.activity.display,
                )?)
            })
            .transpose()?;
        if let Some(supports) = &supports {
            for record in supports.records() {
                let support = record.capsule();
                let capsules = crate::experience::places::temporal_known_place_capsules(
                    actor, support, budget,
                )?;
                let mut used = false;
                for (index, selected) in places.iter().enumerate() {
                    if selected.capsule.personal_source.is_none()
                        && capsules.capsules().iter().any(|capsule| capsule == &selected.capsule)
                        && support.values.iter().zip(&support.receipt.facets).any(|(value, field)| {
                            field.original.as_ref().is_some_and(|original| original.source == selected.capsule.source)
                                && matches!(value,
                                    ReceivedValueFragment::Sensory(SensoryFacet::EncounterExposure { exposure })
                                        if exposure == &selected.exposure)
                        })
                    {
                        matched[index] = true;
                        used = true;
                    }
                }
                if !used {
                    return Err(ExecutionError::InvalidCheckpoint);
                }
                pins.push(record.capture_pins(budget)?);
            }
        }
        if matched.iter().any(|matched| !matched) {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        // MemoryRepository.retainedPlaces(false) deliberately keeps corrected
        // historical capsules for their correction notice. It excludes these
        // exact forgotten IDs instead; corrections cannot enable a Move. The
        // read's captured privacy revision still fences changes during waits.
        // docs/memory-architecture.md#private-retrieval-fencing
        if let Some(privacy) = state.experience.actor(actor).map(|owner| &owner.privacy) {
            for selected in places {
                let capsule = &selected.capsule;
                let length = crate::encoding::json_record_len(&(
                    "perception-fact",
                    &capsule.source.id,
                    capsule.facet_ordinal,
                ))
                .map_err(|_| ExecutionError::InvalidCheckpoint)?;
                let _alias =
                    budget.reserve(length.checked_mul(2).ok_or(ExecutionError::Capacity)?)?;
                let alias = crate::experience::personal_fact_alias(
                    &capsule.source.id,
                    capsule.facet_ordinal,
                )?;
                if privacy.is_forgotten(&capsule.source.id)
                    || capsule
                        .source_event_id
                        .as_ref()
                        .is_some_and(|id| privacy.is_forgotten(id))
                    || privacy.is_forgotten(&alias)
                {
                    return Err(ExecutionError::InvalidCheckpoint);
                }
            }
        }
        storage.resize(
            size_of::<Self>()
                .checked_add(
                    pins.capacity()
                        .checked_mul(size_of::<(Arc<SharedMemoryPin>, Arc<SharedMemoryPin>)>())
                        .ok_or(ExecutionError::Capacity)?,
                )
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(Self {
            _personal: personal,
            _supports: supports,
            _support_pins: pins,
            _storage: storage,
        })
    }
}
