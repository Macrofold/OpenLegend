//! An observer's bounded physical-feature acquisition. Provider answers prepare
//! exact candidate work; only this owner acquires originals and installs the
//! resulting personal geometry after its real temporal duties have finished.
use super::math::*;
use super::*;
use crate::attention::{AttentionRelationFamily, GeometryAttentionPolicy};
use crate::encoding::{json_record, json_record_len};
use crate::execution::{CoreMutation, ExecutionError, ReceivedLease};
use crate::geometry::{
    ConvexViewAnswer, ConvexViewQuery, GeometryAnswers, GeometryBinding, GeometryQueries,
    PhysicalFeature, PhysicalFeatureKind, PhysicalFeatureQuery, PhysicalQueryStatus,
};
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation, CandidateKey};
use crate::language::{CollationAnswer, CollationRanks, CollationRequest};
use crate::state::Bounds;
use indexmap::{IndexMap, IndexSet};
use serde_json::value::RawValue;
use std::{collections::VecDeque, mem::size_of};

mod admission;
mod input;
mod selection;
pub(crate) use input::{CurrentReceivedGeometry, current_received_geometry};
use input::{anchor_bytes, anchors, certificate};

fn invalid() -> ExecutionError {
    crate::received::ReceivedError(
        "Received geometry lost its actual candidate or observer binding.",
    )
    .into()
}
fn encoded<T: Serialize + ?Sized>(value: &T) -> Result<String, ExecutionError> {
    json_record(value).map_err(|_| invalid())
}
fn owner<'a>(core: &'a CoreMutation<'_>, id: &str) -> Option<&'a PerceptionEvidenceOwner> {
    core.state
        .reception
        .perception_evidence
        .as_ref()
        .and_then(|v| v.get(id))
}
struct Receptor {
    observer: ObserverLife,
    detector: DetectorIdentity,
    channel: DefinitionPin,
    radius: f64,
    angle: f64,
    eye: Point,
    frame: ObservationFrame,
    source_basis: String,
    basis: String,
}
pub(crate) struct CompletedGeometryReception {
    pub acquired: Vec<ObservationContribution>,
    pub changed: bool,
    _reservation: ByteReservation,
}
pub(crate) enum GeometryReceptionAnswer {
    Geometry(GeometryAnswers),
    Language(CollationAnswer),
}
pub(crate) enum GeometryReceptionStep<'a> {
    Geometry(&'a GeometryQueries),
    Language(&'a CollationRequest),
    Complete(CompletedGeometryReception),
}
#[derive(Clone)]
struct Candidate {
    extent: Extent,
    feature: PhysicalFeature,
    old: Option<GeometryFragment>,
    priority: f64,
}
struct Certified {
    candidate: Candidate,
    patch: ObservedSurfacePatch,
}
enum Phase {
    Features,
    Language,
    Certificates,
    Complete,
    Done,
}
pub(crate) struct GeometryReceptionCursor {
    observer: String,
    candidate: CandidateKey,
    lease: Option<ReceivedLease>,
    input: Option<Receptor>,
    previous: Option<ReceivedGeometryState>,
    state: Option<ReceivedGeometryState>,
    policy: GeometryAttentionPolicy,
    anchors: Vec<Point>,
    radius: f64,
    features: IndexMap<String, PhysicalFeature>,
    pending: VecDeque<Candidate>,
    keys: IndexSet<String>,
    certified: Vec<Certified>,
    certificate_limit: u64,
    waiting: Option<Candidate>,
    request: Option<GeometryQueries>,
    language: Option<CollationRequest>,
    ranks: Option<CollationRanks>,
    phase: Phase,
    acquired: Vec<ObservationContribution>,
    changed: bool,
    reservation: Option<ByteReservation>,
}
impl GeometryReceptionCursor {
    pub(crate) fn prepare(
        core: &mut CoreMutation<'_>,
        observer: &str,
        candidate: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let policy = &core.state.installed.attention.value().geometry;
        let prior = owner(core, observer).and_then(|o| o.geometry.as_ref());
        let source_bytes = core
            .state
            .installed
            .attention
            .source()
            .len()
            .checked_add(
                core.state
                    .installed
                    .senses
                    .values()
                    .try_fold(0usize, |n, s| n.checked_add(s.source().len()))
                    .ok_or(ExecutionError::Capacity)?,
            )
            .ok_or(ExecutionError::Capacity)?;
        // Selection, subdivision and certification all consume the same finite
        // visit allowance. Fund bounded old geometry and those scratch entries
        // before copying either; no entity/receiver catalogue is duplicated.
        let bytes = heap_sum([
            size_of::<Self>(),
            observer.len(),
            anchor_bytes(core, observer)?,
            source_bytes
                .checked_mul(12)
                .ok_or(ExecutionError::Capacity)?,
            prior
                .map_or(Some(0), HeapBytes::heap_bytes)
                .ok_or(ExecutionError::Capacity)?
                .checked_mul(5)
                .ok_or(ExecutionError::Capacity)?,
            (policy.max_bytes as usize)
                .checked_mul(6)
                .ok_or(ExecutionError::Capacity)?,
            (policy.visits as usize)
                .checked_mul(
                    8 * (size_of::<Candidate>()
                        + size_of::<PhysicalFeature>()
                        + size_of::<Point>()),
                )
                .ok_or(ExecutionError::Capacity)?,
        ])
        .ok_or(ExecutionError::Capacity)?;
        let reservation = budget.reserve(bytes)?;
        let previous = prior.cloned();
        let policy = policy.clone();
        let input = Receptor::prepare(core, observer)?;
        let life = core
            .state
            .physical
            .entities
            .get(observer)
            .and_then(|e| e.physical_life())
            .ok_or(ExecutionError::MissingActor)?;
        let lease = Some(
            core.journal
                .acquisitions
                .begin_received(observer, life, None)?,
        );
        let mut cursor = Self {
            observer: observer.into(),
            candidate,
            lease,
            input,
            previous,
            state: None,
            policy,
            anchors: Vec::new(),
            radius: 0.0,
            features: IndexMap::new(),
            pending: VecDeque::new(),
            keys: IndexSet::new(),
            certified: Vec::new(),
            certificate_limit: 0,
            waiting: None,
            request: None,
            language: None,
            ranks: None,
            phase: Phase::Complete,
            acquired: Vec::new(),
            changed: false,
            reservation: Some(reservation),
        };
        cursor.initialize(core, budget)?;
        Ok(cursor)
    }
    fn binding(&self, core: &mut CoreMutation<'_>) -> Result<GeometryBinding, ExecutionError> {
        Ok(GeometryBinding::new(
            self.candidate,
            core.state.installed.geometry.spatial.revision,
            core.journal.next_provider_serial()?,
        ))
    }
    fn initialize(
        &mut self,
        core: &mut CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let Some(input) = self
            .input
            .as_ref()
            .filter(|_| owner(core, &self.observer).is_some())
        else {
            if self.previous.is_some() {
                super::recording::end_geometry(core, &self.observer, budget)?;
                self.changed = true;
            }
            return Ok(());
        };
        let now = core.state.physical.header.sim_time;
        let mut expired = false;
        if let Some(previous) = &self.previous {
            if previous.prior_frame.is_some()
                && now >= previous.frame_at + self.policy.interval_seconds
            {
                let mut next = previous.clone();
                next.prior_frame = None;
                core.journal.current.replace_geometry(
                    &mut core.state.reception,
                    &self.observer,
                    next,
                )?;
                expired = true;
                attention_control::dirty_attention_self_relations(
                    &core.state.physical,
                    &mut core.state.reception,
                    &mut core.journal.current,
                    &self.observer,
                    &[
                        AttentionRelationFamily::ClosingBody,
                        AttentionRelationFamily::ClosingDrop,
                    ],
                )?;
            }
            if previous.frame.position_at_observation != input.frame.position_at_observation {
                attention_control::dirty_attention_self_relations(
                    &core.state.physical,
                    &mut core.state.reception,
                    &mut core.journal.current,
                    &self.observer,
                    &[
                        AttentionRelationFamily::ClosingBody,
                        AttentionRelationFamily::ClosingDrop,
                    ],
                )?;
            }
            if certificate(core, &self.observer, input, previous) && now < previous.next_at {
                if previous.basis == input.basis && previous.supported_through != now {
                    let mut next = owner(core, &self.observer)
                        .and_then(|o| o.geometry.clone())
                        .ok_or_else(invalid)?;
                    next.supported_through = now;
                    next.input_revision = core
                        .state
                        .reception
                        .sensory
                        .as_ref()
                        .map_or(0, |s| s.revision);
                    super::recording::record_geometry(core, &self.observer, &mut next, budget)?;
                    core.journal.current.replace_geometry(
                        &mut core.state.reception,
                        &self.observer,
                        next,
                    )?;
                    self.changed = true;
                }
                return Ok(());
            }
        }
        let (anchors, visited, partial, cursor) = anchors(
            core,
            input,
            self.previous.as_ref().map_or(0, |p| p.anchor_cursor),
            &self.policy,
        )?;
        self.anchors = anchors;
        self.radius = input
            .radius
            .min(core.state.installed.attention.value().relation.drop.clear);
        let around = bounds(&self.anchors);
        let r = self.radius;
        let query_bounds = Bounds {
            min: Point {
                x: around.min.x - r,
                y: around.min.y - r,
                z: around.min.z - r,
            },
            max: Point {
                x: around.max.x + r,
                y: around.max.y + r,
                z: around.max.z + r,
            },
        };
        let query_key = encoded(&(&input.basis, &query_bounds, &self.anchors))?;
        if let Some(previous) = &self.previous {
            if previous.basis == input.basis
                && previous.query_key == query_key
                && previous.finished
                && certificate(core, &self.observer, input, previous)
            {
                if previous.supported_through != now {
                    let mut next = owner(core, &self.observer)
                        .and_then(|o| o.geometry.clone())
                        .ok_or_else(invalid)?;
                    next.supported_through = now;
                    next.input_revision = core
                        .state
                        .reception
                        .sensory
                        .as_ref()
                        .map_or(0, |s| s.revision);
                    super::recording::record_geometry(core, &self.observer, &mut next, budget)?;
                    core.journal.current.replace_geometry(
                        &mut core.state.reception,
                        &self.observer,
                        next,
                    )?;
                    self.changed = true;
                }
                return Ok(());
            }
        }
        let same = self
            .previous
            .as_ref()
            .filter(|p| p.source_basis == input.source_basis);
        let episode_id = match same {
            Some(p) => p.episode_id.clone(),
            None => {
                core.state
                    .physical
                    .identity
                    .allocate("geometry-exposure")?
                    .id
            }
        };
        let prior_frame = same.and_then(|p| {
            if p.basis == input.basis {
                (!expired).then(|| p.prior_frame.clone()).flatten()
            } else {
                Some(PriorGeometryFrame {
                    at: p.frame_at,
                    frame: p.frame.clone(),
                })
            }
        });
        let unknown = partial
            || self.previous.as_ref().is_some_and(|p| {
                p.basis == input.basis
                    && p.query_key == query_key
                    && p.feature_cursor.is_some()
                    && p.unknown
            });
        let generation = self.previous.as_ref().map_or(Ok(0), |p| {
            p.generation
                .checked_add(1)
                .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
                .ok_or_else(invalid)
        })?;
        self.state = Some(ReceivedGeometryState {
            basis: input.basis.clone(),
            input_revision: core
                .state
                .reception
                .sensory
                .as_ref()
                .map_or(0, |s| s.revision),
            source_basis: input.source_basis.clone(),
            episode_id,
            frame: input.frame.clone(),
            frame_at: now,
            prior_frame,
            eye: input.eye,
            radius: input.radius,
            geometry_revision: core.state.installed.geometry.spatial.revision,
            supported_through: now,
            generation,
            next_at: now + self.policy.interval_seconds,
            query_key: query_key.clone(),
            feature_cursor: None,
            anchor_cursor: cursor,
            fragments: Vec::new(),
            boundaries: Vec::new(),
            boundary_keys: Vec::new(),
            finished: true,
            unknown,
            complete: true,
            visited,
            bytes: 0,
        });
        let mut request = GeometryQueries::new(self.binding(core)?);
        request.features.push(PhysicalFeatureQuery {
            bounds: query_bounds,
            allowance: (self.policy.visits.saturating_sub(visited) / 3).max(1),
            cursor: self
                .previous
                .as_ref()
                .filter(|p| p.query_key == query_key)
                .and_then(|p| p.feature_cursor.clone()),
            radial_origin: input.eye,
            radial_radius: input.radius,
            priority_anchors: self.anchors.clone(),
        });
        if let Some(previous) = same {
            for f in &previous.fragments {
                if !request.feature_ids.contains(&f.feature_id) {
                    request.feature_ids.push(f.feature_id.clone());
                }
            }
        }
        self.request = Some(request);
        self.phase = Phase::Features;
        Ok(())
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<GeometryReceptionAnswer>,
        budget: &ByteBudget,
    ) -> Result<GeometryReceptionStep<'a>, ExecutionError> {
        match (&self.phase, answer) {
            (Phase::Features, Some(GeometryReceptionAnswer::Geometry(answer))) => {
                let request = self.request.take().ok_or_else(invalid)?;
                request.validate_answers(&answer).map_err(|_| invalid())?;
                self.accept_features(core, answer, budget)?;
            }
            (Phase::Language, Some(GeometryReceptionAnswer::Language(answer))) => {
                let request = self.language.take().ok_or_else(invalid)?;
                self.ranks = Some(request.finish(&answer).map_err(|_| invalid())?);
                self.select(core)?;
                self.phase = Phase::Certificates;
            }
            (Phase::Certificates, Some(GeometryReceptionAnswer::Geometry(mut answer)))
                if self.waiting.is_some() =>
            {
                let request = self.request.take().ok_or_else(invalid)?;
                request.validate_answers(&answer).map_err(|_| invalid())?;
                let visible = answer.convex_views.pop().ok_or_else(invalid)?;
                let entry = self.waiting.take().ok_or_else(invalid)?;
                self.certificate_result(entry, Some(visible))?;
            }
            (_, Some(_)) => return Err(invalid()),
            (_, None) => {}
        }
        loop {
            match self.phase {
                Phase::Features => {
                    return Ok(GeometryReceptionStep::Geometry(
                        self.request.as_ref().ok_or_else(invalid)?,
                    ));
                }
                Phase::Language => {
                    return Ok(GeometryReceptionStep::Language(
                        self.language.as_ref().ok_or_else(invalid)?,
                    ));
                }
                Phase::Certificates => {
                    if self.waiting.is_some() {
                        return Ok(GeometryReceptionStep::Geometry(
                            self.request.as_ref().ok_or_else(invalid)?,
                        ));
                    }
                    let state = self.state.as_mut().ok_or_else(invalid)?;
                    if self.pending.is_empty() || state.visited >= self.certificate_limit {
                        if !self.pending.is_empty() {
                            state.unknown = true;
                        }
                        self.finish_geometry(core, budget)?;
                        self.phase = Phase::Complete;
                        continue;
                    }
                    let entry = self.pending.pop_front().ok_or_else(invalid)?;
                    state.visited += 1;
                    let input = self.input.as_ref().ok_or_else(invalid)?;
                    if self.previous.as_ref().is_some_and(|p| {
                        p.basis == input.basis && certificate(core, &self.observer, input, p)
                    }) {
                        if let Some(old) = &entry.old {
                            if let SensoryFacet::SurfacePatch { patch } =
                                &old.observation.facets[0].value
                            {
                                if entry.extent.partial() {
                                    state.unknown = true;
                                }
                                self.certified.push(Certified {
                                    candidate: entry.clone(),
                                    patch: patch.clone(),
                                });
                                continue;
                            }
                        }
                    }
                    let vertices = points(&entry.feature, &entry.extent);
                    if dot(difference(input.eye, vertices[0]), entry.feature.normal) <= EPSILON {
                        continue;
                    }
                    if vertices.iter().all(|p| input.contains(*p)) {
                        let mut request = GeometryQueries::new(self.binding(core)?);
                        request.convex_views.push(ConvexViewQuery {
                            from: self.input.as_ref().ok_or_else(invalid)?.eye,
                            target: vertices.to_vec(),
                            allowance: self.certificate_limit
                                - self.state.as_ref().ok_or_else(invalid)?.visited,
                        });
                        self.request = Some(request);
                        self.waiting = Some(entry);
                    } else {
                        self.certificate_result(entry, None)?;
                    }
                }
                Phase::Complete => {
                    if let Some(lease) = self.lease.take() {
                        retirement::finish_received(core, lease)?;
                    }
                    let output_bytes =
                        self.acquired.heap_bytes().ok_or(ExecutionError::Capacity)?;
                    let output_reservation = self
                        .reservation
                        .as_mut()
                        .ok_or_else(invalid)?
                        .split_off(output_bytes)?;
                    self.phase = Phase::Done;
                    let result = CompletedGeometryReception {
                        acquired: std::mem::take(&mut self.acquired),
                        changed: self.changed,
                        _reservation: output_reservation,
                    };
                    return Ok(GeometryReceptionStep::Complete(result));
                }
                Phase::Done => return Err(invalid()),
            }
        }
    }
}
