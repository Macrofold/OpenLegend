//! Saved simulation-time decay retires physical presence, never the body's
//! historical identity or aliases. Removal's occurrence precedes phase change.
use super::{BodyAnswer, BodyReconcileCursor};
use crate::events::{AudienceSelection, EmissionText, EventEmissionIntent, EventScope};
use crate::execution::{CoreMutation, ExecutionError, StagedOccurrence};
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries, StandingQuery};
use crate::host::{ByteBudget, ByteReservation, CandidateKey, retained_size::HeapBytes};
use crate::simulation::PhysicalState;
use crate::state::SurfacePoint;
use std::mem::size_of;

pub(crate) fn next_remains_deadline<I: AsRef<str>>(
    state: &PhysicalState,
    ids: impl IntoIterator<Item = I>,
) -> f64 {
    let mut deadline = f64::INFINITY;
    for id in ids {
        let Some(remains) = state
            .entities
            .get(id.as_ref())
            .and_then(|entity| entity.remains.as_ref())
            .filter(|r| r.phase != "removed")
        else {
            continue;
        };
        if remains.phase == "fresh" {
            if let Some(at) = remains.rot_at {
                deadline = deadline.min(at);
            }
        }
        if let Some(at) = remains.remove_at.filter(|at| *at > state.header.sim_time) {
            deadline = deadline.min(at);
        }
    }
    deadline
}
pub(crate) enum RemainsStep<'a> {
    Occurrence(StagedOccurrence),
    Personal(&'a crate::activity::PendingActivityResult),
    Geometry(&'a GeometryQueries),
    Complete { removed: bool },
}
pub(crate) enum RemainsAnswer {
    Body(BodyAnswer),
    Geometry(GeometryAnswers),
}
enum Progress {
    Occurrence(StagedOccurrence),
    Personal,
    Geometry,
    Complete,
}
#[derive(Clone, Copy, PartialEq, Eq)]
enum Phase {
    Check,
    Rot,
    RotEvent,
    Remove,
    RemoveEvent,
    RemoveWrite,
    Next,
    Done,
}
pub(crate) struct RemainsCursor {
    candidate: CandidateKey,
    ids: Vec<String>,
    index: usize,
    phase: Phase,
    body: Option<BodyReconcileCursor>,
    event: Option<String>,
    release: Option<Box<(GeometryQueries, ByteReservation)>>,
    removed: bool,
    membership_pending: bool,
    budget: ByteBudget,
    reservation: ByteReservation,
}
impl RemainsCursor {
    pub(crate) fn new(
        ids: &[String],
        candidate: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let reservation = budget.reserve(
            size_of::<Self>()
                + ids.len() * size_of::<String>()
                + ids.iter().map(String::len).sum::<usize>() * 2,
        )?;
        Ok(Self {
            candidate,
            ids: ids.to_vec(),
            index: 0,
            phase: Phase::Check,
            body: None,
            event: None,
            release: None,
            removed: false,
            membership_pending: false,
            budget: budget.clone(),
            reservation,
        })
    }
    fn reserve(&mut self, bytes: usize) -> Result<(), ExecutionError> {
        self.reservation.resize(
            self.reservation
                .bytes()
                .checked_add(bytes)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(())
    }
    pub(crate) fn geometry_request(&self) -> Option<&GeometryQueries> {
        self.release.as_deref().map(|(query, _)| query)
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<RemainsAnswer>,
    ) -> Result<RemainsStep<'a>, ExecutionError> {
        Ok(match self.drive(core, answer)? {
            Progress::Occurrence(event) => RemainsStep::Occurrence(event),
            Progress::Personal => RemainsStep::Personal(
                self.body
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?
                    .personal()?,
            ),
            Progress::Geometry => {
                RemainsStep::Geometry(self.geometry_request().ok_or(ExecutionError::Invariant)?)
            }
            Progress::Complete => RemainsStep::Complete {
                removed: self.removed,
            },
        })
    }
    fn drive(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<RemainsAnswer>,
    ) -> Result<Progress, ExecutionError> {
        let mut answer = if self.release.is_some() {
            match answer {
                Some(RemainsAnswer::Geometry(value)) => {
                    let (request, _custody) =
                        *self.release.take().ok_or(ExecutionError::Invariant)?;
                    request
                        .validate_answers(&value)
                        .map_err(|_| ExecutionError::Invariant)?;
                    let id = self.ids.get(self.index).ok_or(ExecutionError::Invariant)?;
                    self.phase = if value.standing.as_slice() == [true]
                        && core.release_remains_stock(id, &request.standing[0].point)?
                    {
                        Phase::RemoveEvent
                    } else {
                        Phase::Next
                    };
                    None
                }
                None => return Ok(Progress::Geometry),
                Some(_) => return Err(ExecutionError::Invariant),
            }
        } else {
            match answer {
                Some(RemainsAnswer::Body(value)) => Some(value),
                None => None,
                Some(_) => return Err(ExecutionError::Invariant),
            }
        };
        if self.body.is_none() {
            match answer.take() {
                Some(BodyAnswer::Occurrence(event)) => {
                    if self.event.as_deref() != Some(event.event_id()) {
                        return Err(ExecutionError::UnfinishedOccurrence);
                    }
                    self.event = None;
                }
                Some(_) => return Err(ExecutionError::Invariant),
                None if self.event.is_some() => return Err(ExecutionError::UnfinishedOccurrence),
                None => {}
            }
        }
        let installed = core.state.installed.clone();
        let Some(policy) = installed
            .body_policy
            .as_ref()
            .and_then(|p| p.value().remains.as_ref())
        else {
            self.phase = Phase::Done;
            return Ok(Progress::Complete);
        };
        loop {
            if let Some(body) = self.body.as_mut() {
                match body.progress(core, answer.take())? {
                    super::reconcile::Progress::Occurrence(event) => {
                        return Ok(Progress::Occurrence(event));
                    }
                    super::reconcile::Progress::Personal => return Ok(Progress::Personal),
                    super::reconcile::Progress::Complete => self.body = None,
                }
            }
            if self.phase == Phase::Done {
                return Ok(Progress::Complete);
            }
            let Some(id) = self.ids.get(self.index).cloned() else {
                self.phase = Phase::Done;
                continue;
            };
            let id = id.as_str();
            let Some(entity) = core.state.physical.entities.get(id) else {
                self.index += 1;
                self.phase = Phase::Check;
                continue;
            };
            let Some(remains) = entity.remains.as_ref() else {
                self.index += 1;
                self.phase = Phase::Check;
                continue;
            };
            match self.phase {
                Phase::Check => {
                    if remains.phase == "removed" {
                        self.phase = Phase::Next;
                    } else if remains.phase == "fresh"
                        && remains
                            .rot_at
                            .is_some_and(|at| core.state.physical.header.sim_time >= at)
                    {
                        self.phase = Phase::Rot;
                    } else {
                        self.phase = Phase::Remove;
                    }
                }
                Phase::Rot => {
                    self.reserve(remains.source_id.len() + remains.phase.len() + 64)?;
                    let changed = crate::state::Remains {
                        died_at: remains.died_at,
                        rot_at: remains.rot_at,
                        remove_at: remains.remove_at,
                        phase: "rotting".into(),
                        source_id: remains.source_id.clone(),
                        harvested: remains.harvested,
                        yields: Vec::new(),
                    };
                    let body = BodyReconcileCursor::new(id, "body-decay", &self.budget)?;
                    core.physical().set_remains(id, Some(changed))?;
                    self.body = Some(body);
                    self.phase = Phase::RotEvent;
                }
                Phase::RotEvent => {
                    self.phase = Phase::Remove;
                    let event = self.emit(
                        core,
                        &id,
                        &policy.rot_narration,
                        &installed.observation_rules.value().body.rotting_event,
                    )?;
                    return Ok(Progress::Occurrence(event));
                }
                Phase::Remove => {
                    if !remains
                        .remove_at
                        .is_some_and(|at| core.state.physical.header.sim_time >= at)
                    {
                        self.phase = Phase::Next;
                    } else if !core.state.inventory.has_children(id) {
                        self.phase = Phase::RemoveEvent;
                    } else if let Some((point, support)) = entity.world_support() {
                        // Use the same installed pile footprint as a player's Drop.
                        // Until placement is known safe, the body retains its stock.
                        let body = &installed.retained.item_handling_read.object_body;
                        let custody = self.budget.reserve(
                            size_of::<(GeometryQueries, ByteReservation)>()
                                + size_of::<StandingQuery>()
                                + support.len()
                                + body.heap_bytes().ok_or(ExecutionError::Capacity)?,
                        )?;
                        let mut query = GeometryQueries::new(GeometryBinding::new(
                            self.candidate,
                            core.state.geometry_revision(),
                            core.journal.next_provider_serial()?,
                        ));
                        query.standing = vec![StandingQuery {
                            point: SurfacePoint {
                                x: point.x,
                                y: point.y,
                                z: point.z,
                                surface_id: support.to_owned(),
                            },
                            body: body.clone(),
                        }];
                        self.release = Some(Box::new((query, custody)));
                        return Ok(Progress::Geometry);
                    } else {
                        self.phase = Phase::Next;
                    }
                }
                Phase::RemoveEvent => {
                    self.phase = Phase::RemoveWrite;
                    let event = self.emit(
                        core,
                        &id,
                        &policy.removal_narration,
                        &installed.observation_rules.value().body.removed_event,
                    )?;
                    return Ok(Progress::Occurrence(event));
                }
                Phase::RemoveWrite => {
                    self.reserve(remains.source_id.len() + 64)?;
                    let after = crate::state::Remains {
                        died_at: remains.died_at,
                        rot_at: remains.rot_at,
                        remove_at: remains.remove_at,
                        phase: "removed".into(),
                        source_id: remains.source_id.clone(),
                        harvested: remains.harvested,
                        yields: Vec::new(),
                    };
                    let body = BodyReconcileCursor::new(id, "body-decay", &self.budget)?;
                    core.physical().set_remains(id, Some(after))?;
                    self.body = Some(body);
                    self.removed = true;
                    self.membership_pending = true;
                    self.phase = Phase::Next;
                }
                Phase::Next => {
                    if self.membership_pending {
                        core.physical().membership_changed(id)?;
                        self.membership_pending = false;
                    }
                    self.index += 1;
                    self.phase = Phase::Check;
                }
                Phase::Done => return Ok(Progress::Complete),
            }
        }
    }
    fn emit(
        &mut self,
        core: &mut CoreMutation<'_>,
        id: &str,
        template: &str,
        kind: &str,
    ) -> Result<StagedOccurrence, ExecutionError> {
        let entity = core
            .state
            .physical
            .entities
            .get(id)
            .ok_or(ExecutionError::MissingEntity)?;
        self.reserve(
            super::narration_bound(template, entity).ok_or(ExecutionError::Capacity)?
                + kind.len()
                + id.len() * 2,
        )?;
        let text = EmissionText::Narration(super::narration(template, entity));
        let event = core.stage_event(EventEmissionIntent {
            event_type: kind.into(),
            text,
            audience: AudienceSelection::Physical,
            source_id: Some(id.into()),
            target_id: None,
            data: None,
            scope: EventScope::External,
            origin: None,
            exposure: None,
        })?;
        self.reserve(event.id.len())?;
        self.event = Some(event.id.clone());
        Ok(event)
    }
}
