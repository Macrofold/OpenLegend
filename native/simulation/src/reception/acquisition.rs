//! Actual Awareness-to-original acquisition. Permitted facts are assembled
//! before personal/history admission; current correspondence duties remain
//! explicit and must finish before this boundary can publish a result.

use super::*;
use crate::attention::{RecordingInput, RecordingReason, RecordingSource};
use crate::events::WorldEvent;
use crate::execution::{AcquisitionLease, CoreMutation, ExecutionError};
use crate::experience::{Awareness, ExperienceState};
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation};
use crate::narration::{native_text, native_text_bound};
use crate::received::{
    ObservationCaptureOptions, ReceivedError, TemporalAppendError, TemporalReceiptLocator,
};
use crate::simulation::{InstalledWorld, PhysicalState};
use crate::state::{Entity, Point};
use std::mem::size_of;
use std::sync::Arc;

mod context;
pub(super) use context::event_body as received_event_body;
use context::{awareness_body_context, event_body};

fn invalid() -> ReceivedError {
    ReceivedError("Actual Awareness original has changed or is unavailable.")
}
fn capacity() -> ReceivedError {
    ReceivedError("Actual Awareness acquisition exceeds native byte allowance.")
}

enum OriginalPreparation {
    Existing,
    Reused(Arc<ReceivedObservation>),
    Acquire(ReceivedObservationInput),
}
struct PreparedAwarenessObservation {
    source: OriginalPreparation,
    ordinary: bool,
    _reservation: ByteReservation,
    _context_reservation: Option<ByteReservation>,
}

/// Work captured from the same original and current body grant. The receiver
/// owns these operations; callers may not acknowledge them as mere callbacks.
#[derive(Clone)]
pub(crate) enum AwarenessCurrentWork {
    Association {
        subject_id: String,
        physical_life: u64,
        body_lease_id: String,
        ordinal: u64,
    },
    Attention {
        subject_id: String,
        direct: bool,
        urgency: f64,
        ordinal: u64,
    },
}
pub(crate) struct PendingAwarenessObservation {
    pub(super) observer: ObserverLife,
    pub(super) source: Option<Arc<ReceivedObservation>>,
    pub(super) acquisition: Option<AcquisitionLease>,
    fresh: bool,
    ordinary: bool,
    pub(super) current: Vec<AwarenessCurrentWork>,
    pub(super) reservation: ByteReservation,
}
pub(crate) enum AwarenessReceiptPlacement {
    Unchanged,
    Set(Option<TemporalReceiptLocator>),
}
pub(crate) struct CompletedAwarenessObservation {
    pub observation: Option<OwnedObservation>,
    pub receipt: AwarenessReceiptPlacement,
    pub reservation: ByteReservation,
}
impl PendingAwarenessObservation {
    pub(crate) fn current_work(&self) -> &[AwarenessCurrentWork] {
        &self.current
    }
    pub(crate) fn source(&self) -> Option<&ReceivedObservation> {
        self.source.as_deref()
    }

    /// Available immediately only when the actual source created no current
    /// work. A body/association path must first pass its real current finalizer.
    pub(crate) fn finish(
        mut self,
        core: &mut CoreMutation<'_>,
        awareness: &Awareness,
        budget: &ByteBudget,
    ) -> Result<CompletedAwarenessObservation, ExecutionError> {
        if !self.current.is_empty() {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        let Some(mut source) = self.source.take() else {
            return Ok(CompletedAwarenessObservation {
                observation: None,
                receipt: AwarenessReceiptPlacement::Unchanged,
                reservation: self.reservation,
            });
        };
        if self.ordinary {
            let completed = core
                .journal
                .originals
                .complete_attendance(&mut core.state.reception, &self.observer.actor_id, &source)
                .map_err(ExecutionError::Received)?;
            if !Arc::ptr_eq(&source, &completed) {
                if let Some(binding) = &awareness.source_body {
                    core.journal
                        .current
                        .complete_original(
                            &mut core.state.reception,
                            &self.observer.actor_id,
                            &binding.entity_id,
                            Arc::clone(&completed),
                        )
                        .map_err(ExecutionError::Received)?;
                }
                source = completed;
            }
        }
        let values = core.state.reception.received_values.as_ref();
        let header =
            received_observation_header(&values, &source).map_err(ExecutionError::Received)?;
        if header.observer != self.observer || awareness.actor_id != self.observer.actor_id {
            return Err(ExecutionError::Invariant);
        }
        let observation = materialize_owned_observation(
            &core.state.reception.received_values.as_ref(),
            &source,
            budget,
        )
        .map_err(ExecutionError::Received)?;
        let observer = core
            .state
            .physical
            .entities
            .get(&self.observer.actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let recording = core
            .state
            .installed
            .account_law()
            .recording_reason(RecordingInput {
                source: RecordingSource::Awareness,
                event_type: awareness.event_type.as_deref(),
                modality: Some(awareness.modality.as_str()),
                trigger_kind: awareness.trigger_kind.map(TriggerKind::as_str),
                own: awareness.source_id.as_deref() == Some(&self.observer.actor_id)
                    || awareness.trigger_kind == Some(TriggerKind::SelfEvent),
                has_exposure: awareness.exposure.is_some(),
                exposure_kind: awareness.exposure.as_ref().map(|exposure| match exposure {
                    EncounterExposure::Place { .. } => "place",
                    EncounterExposure::InventoryItem { .. } => "inventory-item",
                }),
                consequence: matches!(
                    awareness.trigger_kind,
                    Some(TriggerKind::SelfEvent | TriggerKind::DirectedAction)
                ),
            });
        let mut receipt = AwarenessReceiptPlacement::Unchanged;
        if self.fresh
            && observer.has_memory()
            && (recording == RecordingReason::Required
                || observation
                    .observation()
                    .context
                    .as_ref()
                    .is_some_and(|context| context.attended))
        {
            let context_bytes = observation
                .observation()
                .context
                .as_ref()
                .map_or(Some(0), |context| {
                    context.subjects.iter().try_fold(0usize, |bytes, subject| {
                        heap_sum([bytes, size_of::<String>(), subject.track.len()])
                    })
                })
                .ok_or(ExecutionError::Capacity)?;
            self.reservation.resize(
                self.reservation
                    .bytes()
                    .checked_add(context_bytes)
                    .and_then(|bytes| bytes.checked_add(awareness.event_id.len() + source.id.len()))
                    .and_then(|bytes| {
                        bytes.checked_add(
                            core.state
                                .temporal
                                .actor(&self.observer.actor_id)
                                .map_or(0, |actor| actor.header().epoch.len())
                                + size_of::<TemporalReceiptLocator>(),
                        )
                    })
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let context_subjects: Option<Vec<String>> =
                observation.observation().context.as_ref().map(|context| {
                    context
                        .subjects
                        .iter()
                        .map(|subject| subject.track.clone())
                        .collect()
                });
            let lease = core.journal.acquisitions.begin_received(
                &self.observer.actor_id,
                self.observer.physical_life,
                None,
            )?;
            let policy = &core.state.installed.attention.value().retention;
            let mut loan = core.journal.acquisitions.loan(
                lease,
                &core.state.temporal,
                &policy.recent,
                policy.maintenance_headroom,
            )?;
            let (prepared, order) = loan.parts().ok_or(ExecutionError::Invariant)?;
            let inputs = [awareness.event_id.clone(), source.id.clone()];
            let result = prepared.capture_observation(
                &mut core.state.temporal,
                core.state
                    .reception
                    .received_values
                    .as_mut()
                    .ok_or(ExecutionError::Invariant)?,
                &mut core.state.physical.identity,
                order,
                &crate::worlds::InstalledEvidenceMeaning,
                &mut core.journal.meters,
                core.state.physical.header.sim_time,
                core.state.physical.header.sequence,
                observation.observation(),
                &inputs,
                recording == RecordingReason::Required,
                ObservationCaptureOptions {
                    context_subjects: context_subjects.as_deref(),
                    ..Default::default()
                },
            );
            core.journal.acquisitions.return_loan(loan)?;
            let result = result.map_err(temporal_error)?;
            if let Some(values) = core.state.reception.received_values.as_ref() {
                core.journal.acquisitions.finish_received(
                    lease,
                    &mut core.state.temporal,
                    values,
                    &mut core.state.physical.identity,
                    &crate::worlds::InstalledEvidenceMeaning,
                    &mut core.journal.meters,
                )?;
            } else {
                core.journal.acquisitions.finish_empty_received(lease)?;
            }
            receipt = AwarenessReceiptPlacement::Set(result);
        }
        if let Some(acquisition) = self.acquisition.take() {
            if let Some(values) = core.state.reception.received_values.as_ref() {
                core.journal.acquisitions.finish_acquisition(
                    acquisition,
                    &mut core.state.temporal,
                    values,
                    &mut core.state.physical.identity,
                    &crate::worlds::InstalledEvidenceMeaning,
                    &mut core.journal.meters,
                )?;
            } else {
                core.journal
                    .acquisitions
                    .finish_empty_acquisition(acquisition)?;
            }
        }
        // The detached materialized observation's own guard survives this
        // operation-local source and input storage.
        drop(source);
        Ok(CompletedAwarenessObservation {
            observation: Some(observation),
            receipt,
            reservation: self.reservation,
        })
    }
}
fn temporal_error(error: TemporalAppendError) -> ExecutionError {
    match error {
        TemporalAppendError::Received(error) => ExecutionError::Received(error),
        TemporalAppendError::Work(error) => ExecutionError::Work(error),
    }
}

pub(crate) fn acquire_awareness_observation(
    core: &mut CoreMutation<'_>,
    event: &WorldEvent,
    awareness: &Awareness,
    received_point: Option<Point>,
    sample_token: Option<u64>,
    budget: &ByteBudget,
) -> Result<Option<PendingAwarenessObservation>, ExecutionError> {
    if awareness.modality == ExperienceModality::Internal {
        return Ok(None);
    }
    let Some(observer) = core
        .state
        .physical
        .entities
        .get(&awareness.actor_id)
        .filter(|observer| observer.actor.is_some())
    else {
        return Ok(None);
    };
    core.journal
        .originals
        .ensure_owner(
            &mut core.state.reception,
            observer,
            core.state.physical.header.sequence,
        )
        .map_err(ExecutionError::Received)?;
    let before = core
        .state
        .reception
        .perception_evidence
        .as_ref()
        .and_then(|owners| owners.get(&awareness.actor_id))
        .ok_or(ExecutionError::Invariant)?
        .received
        .len();
    let Some(prepared) = prepare_awareness_observation(
        &core.state.physical,
        &core.state.reception,
        &core.state.installed,
        &core.state.experience,
        event,
        awareness,
        received_point,
        budget,
    )
    .map_err(ExecutionError::Received)?
    else {
        return Ok(None);
    };
    let life = observer.physical_life().ok_or(ExecutionError::Invariant)?;
    let mut reservation =
        budget.reserve(size_of::<PendingAwarenessObservation>() + awareness.actor_id.len())?;
    let mut acquisition = None;
    let source = match prepared.source {
        OriginalPreparation::Existing => None,
        OriginalPreparation::Reused(source) => Some(source),
        OriginalPreparation::Acquire(input) => {
            if let Some(pin) = &input.channel {
                if !current_channel_eligible(
                    &core.state.reception,
                    &core.state.installed,
                    observer,
                    pin,
                )
                .map_err(ExecutionError::Received)?
                    || matches!(input.origin, ObservationOrigin::Exposure { .. })
                        && (input.detector.id != pin.id || input.detector.version != pin.version)
                {
                    return Err(ExecutionError::Received(invalid()));
                }
            }
            let token = if matches!(input.origin, ObservationOrigin::Exposure { .. }) {
                Some(match sample_token {
                    Some(token) => token,
                    None => {
                        core.state
                            .physical
                            .identity
                            .allocate("received-sample")?
                            .sequence
                    }
                })
            } else {
                sample_token
            };
            // The real receiving lifetime owns the viewpoint even when its
            // first history entry is an occurrence rather than a body sample.
            acquisition = Some(
                core.journal.acquisitions.begin_acquisition(
                    &awareness.actor_id,
                    life,
                    Some(ObservationFrame {
                        position_at_observation: observer
                            .world_position()
                            .ok_or(ExecutionError::UnsupportedFamily)?,
                        forward_at_observation: Some(observer.spatial.heading),
                    }),
                )?,
            );
            let lease =
                core.journal
                    .acquisitions
                    .begin_received(&awareness.actor_id, life, token)?;
            let original = core
                .journal
                .originals
                .acquire(
                    &mut core.state.reception,
                    observer,
                    input,
                    core.state.physical.header.sim_time,
                    core.state.physical.header.sequence,
                    token,
                    &mut core.state.physical.identity,
                    &core.state.activity.display,
                    &mut core.journal.meters,
                )
                .map_err(ExecutionError::Received)?;
            // Original acquisition has not appended history. Its transition
            // ends here, before later current changes and occurrence recording.
            core.journal.acquisitions.finish_empty_received(lease)?;
            Some(original)
        }
    };
    let fresh = source.as_ref().is_some_and(|source| {
        core.state
            .reception
            .perception_evidence
            .as_ref()
            .and_then(|owners| owners.get(&awareness.actor_id))
            .is_some_and(|owner| {
                owner
                    .received
                    .iter()
                    .skip(before)
                    .any(|received| Arc::ptr_eq(received, source))
            })
    });
    let current = if prepared.ordinary {
        match &source {
            Some(source) => current_awareness_work(
                &core.state.physical,
                &core.state.reception,
                &core.state.installed,
                &core.state.experience,
                awareness,
                source,
                &mut reservation,
            )
            .map_err(ExecutionError::Received)?,
            None => Vec::new(),
        }
    } else {
        Vec::new()
    };
    Ok(Some(PendingAwarenessObservation {
        observer: ObserverLife {
            actor_id: awareness.actor_id.clone(),
            physical_life: life,
        },
        source,
        acquisition,
        fresh,
        ordinary: prepared.ordinary,
        current,
        reservation,
    }))
}

fn prepare_awareness_observation(
    physical: &PhysicalState,
    reception: &ReceptionState,
    installed: &InstalledWorld,
    experience: &ExperienceState,
    event: &WorldEvent,
    awareness: &Awareness,
    received_point: Option<Point>,
    budget: &ByteBudget,
) -> Result<Option<PreparedAwarenessObservation>, ReceivedError> {
    let observer = physical
        .entities
        .get(&awareness.actor_id)
        .ok_or_else(invalid)?;
    let bound = native_text_bound(&awareness.text)
        .ok_or_else(capacity)?
        .checked_add(match &awareness.content {
            Some(content) => native_text_bound(content).ok_or_else(capacity)?,
            None => 0,
        })
        .ok_or_else(capacity)?;
    let bytes = heap_sum([
        size_of::<PreparedAwarenessObservation>(),
        awareness.heap_bytes().ok_or_else(capacity)?,
        bound,
        event.exposure.heap_bytes().ok_or_else(capacity)?,
        event.id.len(),
        event.event_type.len(),
        awareness
            .recognition
            .as_ref()
            .and_then(|recognition| recognition.learning_support.as_ref())
            .map_or(Some(0), HeapBytes::heap_bytes)
            .and_then(|bytes| bytes.checked_mul(4))
            .ok_or_else(capacity)?,
        awareness.recognition.heap_bytes().ok_or_else(capacity)?,
        awareness.source_subject.heap_bytes().ok_or_else(capacity)?,
        crate::host::retained_size::map_storage::<String, ()>(4).ok_or_else(capacity)?,
        16 * size_of::<SensoryFacet>() + 16 * size_of::<ObservationFacetInput>(),
    ])
    .ok_or_else(capacity)?;
    let reservation = budget.reserve(bytes).map_err(|_| capacity())?;
    if awareness.event_id == event.id
        && awareness
            .observation
            .as_ref()
            .is_some_and(|observation| observation.observer.actor_id == awareness.actor_id)
    {
        return Ok(Some(PreparedAwarenessObservation {
            source: OriginalPreparation::Existing,
            ordinary: false,
            _reservation: reservation,
            _context_reservation: None,
        }));
    }
    let rules = installed.occurrence_rules.value();
    if event.event_type == rules.encounter_event
        && event.data.as_ref().and_then(|data| data.get("acquisition"))
            == Some(&EventScalar::Boolean(true))
        && event.exposure.is_none()
    {
        if let Some(id) = &awareness.target_id {
            if let Some(scope) = CurrentBodyReadScope::prepare(
                reception,
                &physical.entities,
                installed,
                experience,
                &crate::worlds::InstalledEvidenceMeaning,
                &awareness.actor_id,
            )? {
                if let Some(body) = scope.native_body(id)? {
                    let source = scope
                        .state()
                        .current
                        .get(id)
                        .and_then(|contact| contact.content.originals.get(&body.grant.original))
                        .ok_or_else(invalid)?;
                    return Ok(Some(PreparedAwarenessObservation {
                        source: OriginalPreparation::Reused(Arc::clone(source)),
                        ordinary: false,
                        _reservation: reservation,
                        _context_reservation: None,
                    }));
                }
            }
        }
    }
    let context = awareness_body_context(
        physical, reception, installed, experience, awareness, budget,
    )?;
    if event.event_type == rules.contact_event {
        let text = |field: &str| match awareness
            .event_data
            .as_ref()
            .and_then(|data| data.get(field))
        {
            Some(EventScalar::Text(text)) => Some(text.as_str()),
            _ => None,
        };
        let (Some(contact), Some(sense), Some(detail)) =
            (text("contactId"), text("senseId"), text("detail"))
        else {
            return Ok(None);
        };
        let detail = match detail {
            "present" => ContactDetail::Present,
            "moving" => ContactDetail::Moving,
            _ => return Ok(None),
        };
        let channel =
            received_channel_pin(installed, observer, Modality::Touch, Some(sense))?.clone();
        let exposure = ObservationExposure {
            observer: ObserverLife {
                actor_id: observer.id.clone(),
                physical_life: observer.physical_life().ok_or_else(invalid)?,
            },
            episode_id: contact.to_owned(),
            track: received_track_key(contact, &channel)?,
        };
        let value = SensoryFacet::Contact { exposure, detail };
        return Ok(Some(PreparedAwarenessObservation {
            source: OriginalPreparation::Acquire(ReceivedObservationInput {
                origin: ObservationOrigin::Exposure {
                    episode_id: contact.to_owned(),
                    detector_id: sense.to_owned(),
                    measured_from: event.at,
                    measured_through: event.at,
                    source: None,
                },
                modality: Modality::Touch,
                channel: Some(channel),
                detector: DetectorIdentity {
                    id: sense.to_owned(),
                    version: 1,
                },
                context: None,
                facets: vec![facet(value, event.at, FacetRole::Direct)],
            }),
            ordinary: false,
            _reservation: reservation,
            _context_reservation: context.map(|context| context.reservation),
        }));
    }
    let modality = match awareness.modality {
        ExperienceModality::Heard => Modality::Hearing,
        ExperienceModality::Felt => Modality::Touch,
        _ => Modality::Sight,
    };
    let mut values = Vec::with_capacity(16);
    values.push(SensoryFacet::Detected {
        detected: match modality {
            Modality::Hearing => DetectedKind::Signal,
            Modality::Touch => DetectedKind::Impact,
            Modality::Sight => DetectedKind::Surface,
        },
        limits: Vec::new(),
    });
    let position = observer.world_position().ok_or_else(invalid)?;
    let frame = |heading: bool| ObservationFrame {
        position_at_observation: position,
        forward_at_observation: heading.then_some(observer.spatial.heading),
    };
    if let Some(EncounterExposure::Place { point, .. }) = &event.exposure {
        values.push(SensoryFacet::Location {
            location: ObservedLocation::Point {
                point: ObservedPoint::Surface(point.clone()),
                error_radius: 0.0,
            },
            frame: frame(false),
        });
    }
    if let Some(exposure) = &awareness.exposure {
        values.push(SensoryFacet::EncounterExposure {
            exposure: exposure.clone(),
        });
    }
    let visual = if awareness.source_id.as_deref() == Some(&observer.id) {
        awareness.target_id.as_deref()
    } else {
        awareness.source_id.as_deref()
    };
    let subject = if modality == Modality::Sight {
        visual.and_then(|id| physical.entities.get(id))
    } else {
        None
    };
    if let Some(point) = received_point {
        values.push(SensoryFacet::Location {
            location: ObservedLocation::Point {
                point: ObservedPoint::World(point),
                error_radius: 0.0,
            },
            frame: frame(true),
        });
    }
    if let Some(subject) = subject.filter(|subject| {
        matches!(
            subject.placement,
            Some(crate::state::Placement::World { .. })
        ) && event.exposure.is_none()
            && received_point.is_none()
    }) {
        values.push(SensoryFacet::Location {
            location: ObservedLocation::Point {
                point: ObservedPoint::World(subject.world_position().ok_or_else(invalid)?),
                error_radius: 0.0,
            },
            frame: frame(true),
        });
    } else if modality == Modality::Touch && received_point.is_none() {
        values.push(SensoryFacet::Location {
            location: ObservedLocation::Point {
                point: ObservedPoint::World(position),
                error_radius: observer.body_profile().radius,
            },
            frame: frame(false),
        });
    }
    if let Some(sample) = &awareness.received_features {
        values.push(SensoryFacet::PerceivedFeature {
            sample: ReceivedFeatures {
                modality: sample.modality,
                family: VersionedFamily {
                    id: sample.family.id.clone(),
                    version: sample.family.version,
                },
                features: sample.features.clone(),
                quality: sample.quality,
            },
        });
    }
    let (observation_context, participants, speech_participants, sound_source, context_reservation) =
        match context {
            Some(context) => (
                Some(context.context),
                Some(context.participants),
                Some(context.speech),
                context.sound,
                Some(context.reservation),
            ),
            None => (None, None, None, None, None),
        };
    if let Some(sound) = &awareness.sound {
        if let Some(direction) = &sound.direction {
            values.push(bearing(sound.listener_position, direction));
        }
        values.push(SensoryFacet::Sound {
            sound: sound.clone(),
            source: sound_source,
        });
    } else if let Some(speech) = &awareness.speech {
        if let Some(direction) = &speech.direction {
            values.push(bearing(speech.listener_position, direction));
        }
        values.push(SensoryFacet::Speech {
            speech: speech.clone(),
            participants: speech_participants.filter(|participants| {
                participants.speaker.is_some() || participants.addressee.is_some()
            }),
        });
    }
    if awareness.speech.is_none() {
        values.push(SensoryFacet::Event {
            event_type: awareness
                .event_type
                .clone()
                .unwrap_or_else(|| event.event_type.clone()),
            text: native_text(&awareness.text),
            modality: awareness.modality,
            importance: awareness.importance,
            sequence: awareness.sequence,
            recognized: awareness.recognized,
            intelligible: awareness.intelligible,
            entity_episodes: awareness.entity_episodes.clone(),
            trigger_kind: awareness.trigger_kind,
            source_subject: awareness.source_subject.clone(),
            urgency: awareness.urgency,
            content: awareness.content.as_ref().map(native_text),
            data: awareness.event_data.clone().unwrap_or_default(),
            references: awareness.references.clone().unwrap_or_default(),
            participants: participants.filter(|participants| !participants.is_empty()),
        });
    }
    add_associations(&mut values, awareness);
    let sense = receiving_sense(installed, observer, modality, None)?;
    let (channel, detector) = match sense {
        Some(sense) => (
            Some(sense.pin().clone()),
            DetectorIdentity {
                id: sense.value().id().to_owned(),
                version: sense.pin().version,
            },
        ),
        None => (
            None,
            DetectorIdentity {
                id: format!(
                    "native:{}",
                    match modality {
                        Modality::Sight => "sight",
                        Modality::Hearing => "hearing",
                        Modality::Touch => "touch",
                    }
                ),
                version: 1,
            },
        ),
    };
    let testimony = matches!(&awareness.exposure,Some(EncounterExposure::Place{reported_by:Some(reporter),..}) if !reporter.is_empty());
    let facets = values
        .into_iter()
        .map(|value| {
            let role = if matches!(value, SensoryFacet::Association { .. }) {
                FacetRole::Inference
            } else if testimony
                && matches!(
                    value,
                    SensoryFacet::Location { .. } | SensoryFacet::EncounterExposure { .. }
                )
            {
                FacetRole::Testimony
            } else {
                FacetRole::Direct
            };
            facet(value, event.at, role)
        })
        .collect();
    Ok(Some(PreparedAwarenessObservation {
        source: OriginalPreparation::Acquire(ReceivedObservationInput {
            origin: ObservationOrigin::Occurrence {
                event_id: event.id.clone(),
                at: event.at,
                order: event.order.unwrap_or(event.sequence),
            },
            modality,
            channel,
            detector,
            context: observation_context,
            facets,
        }),
        ordinary: true,
        _reservation: reservation,
        _context_reservation: context_reservation,
    }))
}
fn facet(value: SensoryFacet, at: f64, role: FacetRole) -> ObservationFacetInput {
    ObservationFacetInput {
        support: None,
        role,
        as_of: at,
        measured_from: at,
        measured_through: at,
        acquired_at: None,
        prepared_pose: None,
        value,
    }
}
fn bearing(point: Point, direction: &AcousticDirection) -> SensoryFacet {
    SensoryFacet::Location {
        location: ObservedLocation::Bearing {
            from: ObservedPoint::World(point),
            sector: direction.sector,
            elevation: direction.elevation,
            spread: std::f64::consts::FRAC_PI_4,
        },
        frame: ObservationFrame {
            position_at_observation: point,
            forward_at_observation: None,
        },
    }
}
fn add_associations(values: &mut Vec<SensoryFacet>, awareness: &Awareness) {
    let mut associated = indexmap::IndexSet::new();
    let support = awareness
        .recognition
        .as_ref()
        .and_then(|recognition| recognition.learning_support.as_ref())
        .filter(|keys| !keys.is_empty());
    if let Some(recognition) = &awareness.recognition {
        if let Some(subject) = &recognition.subject {
            push_association(
                values,
                &mut associated,
                subject.clone(),
                if recognition.recognized {
                    AssociationStrength::Supported
                } else {
                    AssociationStrength::Possible
                },
                support,
            );
        }
        for candidate in &recognition.candidates {
            if associated.contains(&candidate.individual_id) {
                continue;
            }
            push_association(
                values,
                &mut associated,
                ObserverSubject::Individual {
                    individual_id: candidate.individual_id.clone(),
                },
                if recognition.candidates.len() > 1 || recognition.more_candidates {
                    AssociationStrength::Ambiguous
                } else {
                    AssociationStrength::Possible
                },
                support,
            );
        }
        if let Some(subject) = &recognition.learned_subject {
            push_association(
                values,
                &mut associated,
                subject.clone(),
                AssociationStrength::Supported,
                support,
            );
        }
    }
    if let Some(subject) = &awareness.source_subject {
        if !matches!(subject,ObserverSubject::Individual{individual_id} if associated.contains(individual_id))
        {
            push_association(
                values,
                &mut associated,
                subject.clone(),
                if awareness.recognized {
                    AssociationStrength::Supported
                } else {
                    AssociationStrength::Possible
                },
                None,
            );
        }
    }
}
fn push_association(
    values: &mut Vec<SensoryFacet>,
    associated: &mut indexmap::IndexSet<String>,
    subject: ObserverSubject,
    strength: AssociationStrength,
    learning_support: Option<&Vec<String>>,
) {
    if let ObserverSubject::Individual { individual_id } = &subject {
        associated.insert(individual_id.clone());
    }
    values.push(SensoryFacet::Association {
        subject,
        strength,
        learning_support: learning_support.cloned(),
    });
}
fn current_awareness_work(
    physical: &PhysicalState,
    reception: &ReceptionState,
    installed: &InstalledWorld,
    experience: &ExperienceState,
    awareness: &Awareness,
    source: &ReceivedObservation,
    reservation: &mut ByteReservation,
) -> Result<Vec<AwarenessCurrentWork>, ReceivedError> {
    let Some(scope) = CurrentBodyReadScope::prepare(
        reception,
        &physical.entities,
        installed,
        experience,
        &crate::worlds::InstalledEvidenceMeaning,
        &awareness.actor_id,
    )?
    else {
        return Ok(Vec::new());
    };
    let binding = awareness.source_body.as_ref();
    let bound = match binding.filter(|binding| binding.lease_id.is_some()) {
        Some(binding) => scope.native_body(&binding.entity_id)?.filter(|body| {
            Some(body.field.id.as_str()) == binding.lease_id.as_deref()
                && body.grant.subject_physical_life == Some(binding.physical_life)
        }),
        None => None,
    };
    reservation
        .resize(
            reservation
                .bytes()
                .checked_add(2 * size_of::<AwarenessCurrentWork>())
                .ok_or_else(capacity)?,
        )
        .map_err(|_| capacity())?;
    let mut work = Vec::with_capacity(2);
    if let (Some(body), Some(recognition)) = (bound, &awareness.recognition) {
        if recognition.recognized {
            if let Some(subject) = &recognition.subject {
                let values = &reception.received_values.as_ref();
                if let Some((ordinal,_))=source.facets.iter().enumerate().find(|(_,facet)|matches!(received_facet_value(values,&facet.value),Ok(Some(SensoryFacet::Association{subject:ref value,strength:AssociationStrength::Supported,..})) if value==subject)){
            reservation.resize(reservation.bytes().checked_add(body.grant.subject_id.len()+body.field.id.len()).ok_or_else(capacity)?).map_err(|_|capacity())?;
            work.push(AwarenessCurrentWork::Association{subject_id:body.grant.subject_id.clone(),physical_life:binding.ok_or_else(invalid)?.physical_life,body_lease_id:body.field.id.clone(),ordinal:ordinal as u64});
        }
            }
        }
    }
    let visual = if awareness.source_id.as_deref() == Some(&awareness.actor_id) {
        awareness.target_id.as_deref()
    } else {
        awareness.source_id.as_deref()
    };
    let body = if bound.is_some() {
        bound
    } else if awareness.speech.is_none() && awareness.modality == ExperienceModality::Observed {
        match visual {
            Some(id) => scope.native_body(id)?,
            None => None,
        }
    } else {
        None
    };
    if let Some(body) = body {
        reservation
            .resize(
                reservation
                    .bytes()
                    .checked_add(body.grant.subject_id.len())
                    .ok_or_else(capacity)?,
            )
            .map_err(|_| capacity())?;
        let ordinal = source
            .facets
            .iter()
            .position(|facet| matches!(facet.value.kind.as_str(), "event" | "speech"))
            .unwrap_or(0);
        work.push(AwarenessCurrentWork::Attention {
            subject_id: body.grant.subject_id.clone(),
            direct: awareness.target_id.as_deref() == Some(&awareness.actor_id),
            urgency: awareness.urgency.unwrap_or(0.0),
            ordinal: ordinal as u64,
        });
    }
    Ok(work)
}

fn receiving_sense<'a>(
    installed: &'a InstalledWorld,
    observer: &Entity,
    modality: Modality,
    detector: Option<&str>,
) -> Result<Option<&'a crate::install::VerifiedDefinition<SenseDefinition>>, ReceivedError> {
    if installed
        .capabilities
        .capability_blocked(Some(observer), "perception")
        .map_err(|_| invalid())?
    {
        return Ok(None);
    }
    let bindings = observer
        .actor
        .as_ref()
        .and_then(|actor| actor.senses.as_deref())
        .unwrap_or(&installed.default_senses);
    let selected = || {
        installed
            .senses
            .values()
            .filter(|sense| bindings.iter().any(|id| id == sense.value().id()))
    };
    let implementation = match modality {
        Modality::Sight => "vision-geometry-v1",
        Modality::Hearing => "hearing-db-v1",
        Modality::Touch => "body-contact-v1",
    };
    Ok(detector
        .and_then(|detector| selected().find(|sense| sense.value().id() == detector))
        .or_else(|| selected().find(|sense| sense.value().implementation() == implementation)))
}
fn received_channel_pin<'a>(
    installed: &'a InstalledWorld,
    observer: &Entity,
    modality: Modality,
    detector: Option<&str>,
) -> Result<&'a DefinitionPin, ReceivedError> {
    receiving_sense(installed, observer, modality, detector)?
        .map(|sense| sense.pin())
        .ok_or_else(invalid)
}
fn current_channel_eligible(
    reception: &ReceptionState,
    installed: &InstalledWorld,
    observer: &Entity,
    pin: &DefinitionPin,
) -> Result<bool, ReceivedError> {
    let Some(actor) = &observer.actor else {
        return Ok(false);
    };
    if !actor.alive
        || !observer.actively_participates()
        || reception
            .perception_evidence
            .as_ref()
            .and_then(|owners| owners.get(&observer.id))
            .is_some_and(|owner| owner.life != actor.physical_life.unwrap_or(0))
        || installed
            .capabilities
            .capability_blocked(Some(observer), "perception")
            .map_err(|_| invalid())?
    {
        return Ok(false);
    }
    let bindings = actor.senses.as_deref().unwrap_or(&installed.default_senses);
    Ok(bindings.iter().any(|id| id == &pin.id)
        && installed
            .senses
            .get(&pin.id)
            .is_some_and(|sense| sense.pin() == pin))
}
