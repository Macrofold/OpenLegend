//! Actual compact original acquisition. The enclosing candidate checkpoints
//! this journal together with values, identity, temporal and physical owners.
//! This leaf does not install current grants or finalize attention/history.

use super::retained_size::{HeapBytes, heap_sum, map_storage};
use super::*;
use crate::activity::ActivityDisplayLimits;
use crate::encoding::json_record;
use crate::host::{ByteBudget, ByteReservation};
use crate::identity::IdentityState;
use crate::received::values::{
    BodyFragment, BodyKind, BodyPoseFragment, BodyPoseKind, FrameFragment, FrameKind,
    HeaderFragment, HeaderKind, LocationFragment, LocationKind,
};
use crate::received::{ReceivedError, ReceivedValueFragment, retain_received_value};
use crate::state::Entity;
use crate::work::{WorkMeters, WorkUnit};
use indexmap::IndexMap;
use std::mem::size_of;
use std::sync::Arc;

#[derive(Debug)]
pub(crate) struct ObservationFacetInput {
    pub support: Option<ReceivedFacetProof>,
    pub role: FacetRole,
    pub as_of: f64,
    pub measured_from: f64,
    pub measured_through: f64,
    pub acquired_at: Option<f64>,
    pub prepared_pose: Option<ObservedBodyPose>,
    pub value: SensoryFacet,
}

#[derive(Debug)]
pub(crate) struct ReceivedObservationInput {
    pub origin: ObservationOrigin,
    pub modality: Modality,
    pub channel: Option<DefinitionPin>,
    pub detector: DetectorIdentity,
    pub context: Option<ObservationContext>,
    pub facets: Vec<ObservationFacetInput>,
}

#[derive(Clone, Copy)]
pub(crate) struct OriginalCheckpoint {
    operations: usize,
}

enum OriginalUndo {
    Complete {
        observer: String,
        position: usize,
        prior: Arc<ReceivedObservation>,
    },
    OwnerInsert {
        observer: String,
        root_was_absent: bool,
    },
    PhaseReset {
        observer: String,
        sequence: u64,
        received: Vec<Arc<ReceivedObservation>>,
        receipts: IndexMap<String, u64>,
    },
    Append {
        observer: String,
        key: String,
        position: usize,
        original_id: String,
    },
}

pub(crate) struct OriginalJournal {
    undo: Vec<OriginalUndo>,
    reservation: ByteReservation,
}

fn invalid() -> ReceivedError {
    ReceivedError("Invalid native receiving ownership or rollback.")
}
fn capacity() -> ReceivedError {
    ReceivedError("Native original acquisition exceeds byte allowance.")
}
fn add(left: u64, right: u64) -> Result<u64, ReceivedError> {
    left.checked_add(right)
        .filter(|sum| *sum <= crate::identity::MAX_SAFE_INTEGER)
        .ok_or_else(capacity)
}

impl OriginalJournal {
    pub(crate) fn new(budget: &ByteBudget) -> Result<Self, ReceivedError> {
        Ok(Self {
            undo: Vec::new(),
            reservation: budget.reserve(size_of::<Self>()).map_err(|_| capacity())?,
        })
    }
    pub(crate) fn checkpoint(&self) -> OriginalCheckpoint {
        OriginalCheckpoint {
            operations: self.undo.len(),
        }
    }
    fn reserve(&mut self, bytes: usize) -> Result<(), ReceivedError> {
        self.reservation
            .resize(
                self.reservation
                    .bytes()
                    .checked_add(bytes)
                    .ok_or_else(capacity)?,
            )
            .map_err(|_| capacity())
    }
    fn slot(&mut self, heap: usize) -> Result<(), ReceivedError> {
        self.reserve(
            heap.checked_add(2 * size_of::<OriginalUndo>())
                .ok_or_else(capacity)?,
        )?;
        self.undo.try_reserve(1).map_err(|_| capacity())
    }
    pub(crate) fn rollback_to(
        &mut self,
        state: &mut ReceptionState,
        checkpoint: OriginalCheckpoint,
    ) -> Result<(), ReceivedError> {
        if checkpoint.operations > self.undo.len() {
            return Err(invalid());
        }
        while self.undo.len() > checkpoint.operations {
            match self.undo.pop().ok_or_else(invalid)? {
                OriginalUndo::Complete {
                    observer,
                    position,
                    prior,
                } => {
                    let received = &mut state
                        .perception_evidence
                        .as_mut()
                        .and_then(|owners| owners.get_mut(&observer))
                        .ok_or_else(invalid)?
                        .received;
                    let current = received.get_mut(position).ok_or_else(invalid)?;
                    if current.id != prior.id || current.revision != prior.revision {
                        return Err(invalid());
                    }
                    *current = prior;
                }
                OriginalUndo::Append {
                    observer,
                    key,
                    position,
                    original_id,
                } => {
                    let owner = state
                        .perception_evidence
                        .as_mut()
                        .and_then(|owners| owners.get_mut(&observer))
                        .ok_or_else(invalid)?;
                    if owner.received.len() != position + 1
                        || owner
                            .received
                            .last()
                            .is_none_or(|original| original.id != original_id)
                        || owner.receipts.get(&key) != Some(&(position as u64))
                    {
                        return Err(invalid());
                    }
                    owner.received.pop();
                    owner.receipts.shift_remove(&key);
                }
                OriginalUndo::PhaseReset {
                    observer,
                    sequence,
                    received,
                    receipts,
                } => {
                    let owner = state
                        .perception_evidence
                        .as_mut()
                        .and_then(|owners| owners.get_mut(&observer))
                        .ok_or_else(invalid)?;
                    owner.received = received;
                    owner.receipts = receipts;
                    owner.received_at_sequence = sequence;
                }
                OriginalUndo::OwnerInsert {
                    observer,
                    root_was_absent,
                } => {
                    let owners = state.perception_evidence.as_mut().ok_or_else(invalid)?;
                    owners.shift_remove(&observer).ok_or_else(invalid)?;
                    if root_was_absent {
                        if !owners.is_empty() {
                            return Err(invalid());
                        }
                        state.perception_evidence = None;
                    }
                }
            }
        }
        Ok(())
    }
    pub(crate) fn discard_undo(&mut self) -> Result<(), ReceivedError> {
        self.undo.clear();
        self.reservation
            .resize(size_of::<Self>() + self.undo.capacity() * size_of::<OriginalUndo>())
            .map_err(|_| capacity())
    }

    pub(crate) fn ensure_owner(
        &mut self,
        state: &mut ReceptionState,
        observer: &Entity,
        sequence: u64,
    ) -> Result<(), ReceivedError> {
        let life = observer
            .actor
            .as_ref()
            .ok_or_else(invalid)?
            .physical_life
            .unwrap_or(0);
        let prior = state
            .perception_evidence
            .as_ref()
            .and_then(|owners| owners.get(&observer.id));
        if prior.is_some_and(|owner| owner.life != life) {
            // Replacement must first finish the old owner's terminal recording.
            // Silently swapping this record would destroy chronology/support.
            return Err(ReceivedError(
                "Receiving life replacement requires native retirement.",
            ));
        }
        if prior.is_none() {
            self.slot(
                2 * observer.id.len()
                    + size_of::<PerceptionEvidenceOwner>()
                    + map_storage::<String, PerceptionEvidenceOwner>(
                        state
                            .perception_evidence
                            .as_ref()
                            .map_or(1, |owners| owners.len() + 1),
                    )
                    .ok_or_else(capacity)?,
            )?;
            let root_was_absent = state.perception_evidence.is_none();
            self.undo.push(OriginalUndo::OwnerInsert {
                observer: observer.id.clone(),
                root_was_absent,
            });
            state
                .perception_evidence
                .get_or_insert_with(IndexMap::new)
                .insert(
                    observer.id.clone(),
                    PerceptionEvidenceOwner {
                        visual_confirmation: None,
                        motion_samples: None,
                        motion_expires_at: None,
                        geometry: None,
                        attention: None,
                        life,
                        received_at_sequence: sequence,
                        observer: Some(ObserverLife {
                            actor_id: observer.id.clone(),
                            physical_life: life,
                        }),
                        next_contact: 0,
                        received: Vec::new(),
                        receipts: IndexMap::new(),
                        current: IndexMap::new(),
                        gaps: IndexMap::new(),
                        support: None,
                    },
                );
        }
        let owner = state
            .perception_evidence
            .as_mut()
            .and_then(|owners| owners.get_mut(&observer.id))
            .ok_or_else(invalid)?;
        if owner.received_at_sequence != sequence {
            let mut held = heap_sum([
                observer.id.len(),
                owner.received.capacity() * size_of::<Arc<ReceivedObservation>>(),
                owner.receipts.heap_bytes().ok_or_else(capacity)?,
            ])
            .ok_or_else(capacity)?;
            for original in &owner.received {
                held = held
                    .checked_add(
                        size_of::<ReceivedObservation>()
                            + 2 * size_of::<usize>()
                            + original.heap_bytes().ok_or_else(capacity)?,
                    )
                    .ok_or_else(capacity)?;
            }
            self.slot(held)?;
            self.undo.push(OriginalUndo::PhaseReset {
                observer: observer.id.clone(),
                sequence: owner.received_at_sequence,
                received: std::mem::take(&mut owner.received),
                receipts: std::mem::take(&mut owner.receipts),
            });
            owner.received_at_sequence = sequence;
        }
        Ok(())
    }

    pub(crate) fn acquire(
        &mut self,
        state: &mut ReceptionState,
        observer: &Entity,
        input: ReceivedObservationInput,
        now: f64,
        sequence: u64,
        sample_token: Option<u64>,
        identity: &mut IdentityState,
        limits: &Arc<ActivityDisplayLimits>,
        meters: &mut WorkMeters,
    ) -> Result<Arc<ReceivedObservation>, ReceivedError> {
        self.ensure_owner(state, observer, sequence)?;
        let key = observation_acquisition_key(
            input.modality,
            &input.detector,
            input.channel.as_ref(),
            &input.origin,
        )?;
        let owner = state
            .perception_evidence
            .as_ref()
            .and_then(|owners| owners.get(&observer.id))
            .ok_or_else(invalid)?;
        if let Some(position) = owner.receipts.get(&key) {
            return owner
                .received
                .get(*position as usize)
                .cloned()
                .ok_or_else(invalid);
        }
        let mut input = endpoint_input(input);
        let order = match sample_token {
            Some(order) => order,
            None => {
                identity
                    .allocate("received-sample")
                    .map_err(|_| invalid())?
                    .sequence
            }
        };
        let header = retain_received_value(
            &mut state.received_values,
            ReceivedValueFragment::Header(HeaderFragment {
                kind: HeaderKind::Header,
                header: ReceivedObservationHeader {
                    observer: ObserverLife {
                        actor_id: observer.id.clone(),
                        physical_life: observer
                            .actor
                            .as_ref()
                            .ok_or_else(invalid)?
                            .physical_life
                            .unwrap_or(0),
                    },
                    acquired_at: now,
                    received_order: order,
                    modality: input.modality,
                    detector: input.detector,
                    channel: input.channel.take(),
                },
            }),
            None,
            now,
            sequence,
            identity,
            limits,
        )?;
        let mut added_bytes = header.added_bytes;
        let original_id = identity
            .allocate("perception-observation")
            .map_err(|_| invalid())?
            .id;
        let (from, through) = match input.origin {
            ObservationOrigin::Occurrence { at, .. } => (at, at),
            ObservationOrigin::Exposure {
                measured_from,
                measured_through,
                ..
            } => (measured_from, measured_through),
        };
        self.reserve(
            input
                .facets
                .len()
                .checked_mul(size_of::<ReceivedObservationFacet>())
                .ok_or_else(capacity)?,
        )?;
        let facets = input
            .facets
            .into_iter()
            .map(|facet| {
                let retained = retain_facet(
                    &mut state.received_values,
                    facet.value,
                    facet.prepared_pose,
                    now,
                    sequence,
                    identity,
                    limits,
                )?;
                added_bytes = add(added_bytes, retained.1)?;
                Ok(ReceivedObservationFacet {
                    support: facet.support,
                    ordinal: None,
                    role: (facet.role != FacetRole::Direct).then_some(facet.role),
                    as_of: (facet.as_of != facet.measured_through).then_some(facet.as_of),
                    measured_from: (facet.measured_from != from).then_some(facet.measured_from),
                    measured_through: (facet.measured_through != through)
                        .then_some(facet.measured_through),
                    acquired_at: facet.acquired_at.filter(|at| *at != now),
                    value: retained.0,
                })
            })
            .collect::<Result<Vec<_>, ReceivedError>>()?;
        let original = ReceivedObservation {
            id: original_id,
            revision: 1,
            origin: input.origin,
            channel: None,
            context: input.context,
            header_ref: header.reference,
            facets,
        };
        let encoded = json_record(&original).map_err(|_| invalid())?;
        meters
            .charge(&[
                (WorkUnit::Effects, 1),
                (
                    WorkUnit::OutputBytes,
                    add(encoded.len() as u64, added_bytes)?,
                ),
            ])
            .map_err(|_| {
                ReceivedError("Native original acquisition exceeded executable work admission.")
            })?;
        self.slot(
            2 * observer.id.len()
                + 2 * key.len()
                + original.id.len()
                + size_of::<ReceivedObservation>()
                + original.heap_bytes().ok_or_else(capacity)?,
        )?;
        let owner = state
            .perception_evidence
            .as_mut()
            .and_then(|owners| owners.get_mut(&observer.id))
            .ok_or_else(invalid)?;
        owner.received.try_reserve(1).map_err(|_| capacity())?;
        owner.receipts.try_reserve(1).map_err(|_| capacity())?;
        let position = owner.received.len();
        self.undo.push(OriginalUndo::Append {
            observer: observer.id.clone(),
            key: key.clone(),
            position,
            original_id: original.id.clone(),
        });
        let source = Arc::new(original);
        owner.receipts.insert(key, position as u64);
        owner.received.push(Arc::clone(&source));
        Ok(source)
    }
    /// Final routing context is sealed before personal/history consumers see
    /// the original. Its measured facts, causal coordinates and revision stay
    /// identical; current original references update through CurrentJournal.
    pub(super) fn complete_attendance(
        &mut self,
        state: &mut ReceptionState,
        observer: &str,
        source: &Arc<ReceivedObservation>,
    ) -> Result<Arc<ReceivedObservation>, ReceivedError> {
        let owner = state
            .perception_evidence
            .as_ref()
            .and_then(|owners| owners.get(observer))
            .ok_or_else(invalid)?;
        let Some(context) = source.context.as_ref().filter(|context| !context.attended) else {
            return Ok(Arc::clone(source));
        };
        if !owner.attention.as_ref().is_some_and(|attention| {
            attention.entries.iter().any(|entry| {
                context
                    .subjects
                    .iter()
                    .any(|subject| subject.track == entry.exposure.track)
            })
        }) {
            return Ok(Arc::clone(source));
        }
        let position = owner
            .received
            .iter()
            .position(|held| held.id == source.id && held.revision == source.revision)
            .ok_or_else(invalid)?;
        self.slot(
            heap_sum([
                observer.len(),
                size_of::<ReceivedObservation>(),
                2 * size_of::<usize>(),
                source.heap_bytes().ok_or_else(capacity)?,
            ])
            .ok_or_else(capacity)?,
        )?;
        let mut after = source.as_ref().clone();
        after.context.as_mut().ok_or_else(invalid)?.attended = true;
        let after = Arc::new(after);
        let received = &mut state
            .perception_evidence
            .as_mut()
            .and_then(|owners| owners.get_mut(observer))
            .ok_or_else(invalid)?
            .received;
        let prior = std::mem::replace(
            received.get_mut(position).ok_or_else(invalid)?,
            Arc::clone(&after),
        );
        self.undo.push(OriginalUndo::Complete {
            observer: observer.to_owned(),
            position,
            prior,
        });
        Ok(after)
    }
}

fn endpoint_input(mut input: ReceivedObservationInput) -> ReceivedObservationInput {
    if !input
        .facets
        .iter()
        .any(|facet| matches!(facet.value, SensoryFacet::ObservedMotion { .. }))
    {
        return input;
    }
    input.facets = input
        .facets
        .into_iter()
        .flat_map(|facet| match facet.value {
            SensoryFacet::ObservedMotion { earlier, later, .. } => [earlier, later]
                .into_iter()
                .map(|sample| ObservationFacetInput {
                    role: facet.role,
                    as_of: sample.measured_through,
                    measured_from: sample.measured_from,
                    measured_through: sample.measured_through,
                    acquired_at: Some(sample.acquired_at),
                    prepared_pose: None,
                    support: Some(ReceivedFacetProof {
                        original: sample.original,
                        confirmation: sample.confirmation,
                        confirmed_from: sample.confirmed_from,
                        confirmed_through: sample.confirmed_through,
                        aliases: sample.aliases,
                    }),
                    value: SensoryFacet::Location {
                        location: sample.location,
                        frame: sample.frame,
                    },
                })
                .collect::<Vec<_>>(),
            value => vec![ObservationFacetInput { value, ..facet }],
        })
        .collect();
    input
}

fn retain_facet(
    values: &mut Option<crate::received::ReceivedValues>,
    value: SensoryFacet,
    pose: Option<ObservedBodyPose>,
    at: f64,
    sequence: u64,
    identity: &mut IdentityState,
    limits: &Arc<ActivityDisplayLimits>,
) -> Result<(ReceivedFacetValue, u64), ReceivedError> {
    let kind = value.kind().to_owned();
    let mut added = 0;
    let mut reception = None;
    let fragment = match value {
        SensoryFacet::ObservedMotion { .. } => {
            return Err(ReceivedError(
                "Received motion must store actual endpoints.",
            ));
        }
        SensoryFacet::Body { body } => {
            let (details, pose) = split_observed_body(body);
            let retained = retain_received_value(
                values,
                ReceivedValueFragment::BodyPose(BodyPoseFragment {
                    kind: BodyPoseKind::BodyPose,
                    pose,
                }),
                None,
                at,
                sequence,
                identity,
                limits,
            )?;
            added = add(added, retained.added_bytes)?;
            reception = Some(FacetReception::Body {
                pose_ref: retained.reference,
            });
            ReceivedValueFragment::Body(BodyFragment {
                kind: BodyKind::Body,
                body: details,
            })
        }
        SensoryFacet::Location { location, frame } => {
            let retained = retain_received_value(
                values,
                ReceivedValueFragment::Frame(FrameFragment {
                    kind: FrameKind::Frame,
                    frame,
                }),
                None,
                at,
                sequence,
                identity,
                limits,
            )?;
            added = add(added, retained.added_bytes)?;
            reception = Some(FacetReception::Location {
                frame_ref: retained.reference,
            });
            if let Some(pose) = pose {
                ReceivedValueFragment::BodyPose(BodyPoseFragment {
                    kind: BodyPoseKind::BodyPose,
                    pose,
                })
            } else {
                ReceivedValueFragment::Location(LocationFragment {
                    kind: LocationKind::Location,
                    location,
                })
            }
        }
        value => ReceivedValueFragment::Sensory(value),
    };
    let retained = retain_received_value(values, fragment, None, at, sequence, identity, limits)?;
    Ok((
        ReceivedFacetValue {
            kind,
            reference: retained.reference,
            reception,
        },
        add(added, retained.added_bytes)?,
    ))
}
